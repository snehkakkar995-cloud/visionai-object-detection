import io
import time

import cv2
import numpy as np
from fastapi import APIRouter, Depends, File, Form, UploadFile
from PIL import Image, ImageOps, UnidentifiedImageError
from sqlalchemy.orm import Session

from ..config import settings
from ..database import get_db
from ..models import DetectionRecord
from ..schemas.detection import DetectionDetail, FrameDetectionResponse
from ..services import records
from ..services.yolo_service import annotate, summarize, yolo_service
from ..utils.file_utils import (
    ALLOWED_IMAGE_EXT, AppError, new_id, read_limited, safe_output_path,
    sanitize_filename, validate_extension,
)

router = APIRouter(prefix="/api/detect", tags=["detection"])

Image.MAX_IMAGE_PIXELS = settings.max_image_pixels
MAX_STORED_DETECTIONS = 500


def decode_image(data: bytes) -> np.ndarray:
    """Validate and decode an uploaded image to a BGR array (EXIF rotation applied)."""
    try:
        probe = Image.open(io.BytesIO(data))
        if probe.format not in {"JPEG", "PNG", "WEBP"}:
            raise AppError(415, "Unsupported image format. Please upload a JPG, PNG or WEBP image.")
        probe.verify()
        img = ImageOps.exif_transpose(Image.open(io.BytesIO(data))).convert("RGB")
    except AppError:
        raise
    except (UnidentifiedImageError, Image.DecompressionBombError, OSError, ValueError, SyntaxError):
        raise AppError(422, "The file is not a valid image or is corrupted.")
    return np.ascontiguousarray(np.array(img)[:, :, ::-1])


@router.post("/image", response_model=DetectionDetail, summary="Detect objects in an image")
def detect_image(
    file: UploadFile = File(...),
    confidence: float | None = Form(None, ge=0.01, le=1.0),
    iou: float | None = Form(None, ge=0.01, le=1.0),
    db: Session = Depends(get_db),
):
    validate_extension(file.filename, ALLOWED_IMAGE_EXT)
    conf = confidence if confidence is not None else settings.default_confidence
    iou_t = iou if iou is not None else settings.default_iou
    image = decode_image(read_limited(file.file, settings.max_image_mb * 1024 * 1024))
    h, w = image.shape[:2]

    t0 = time.perf_counter()
    detections = yolo_service.detect(image, conf=conf, iou=iou_t)
    inference_ms = round((time.perf_counter() - t0) * 1000, 1)

    ok, buf = cv2.imencode(".jpg", annotate(image, detections), [cv2.IMWRITE_JPEG_QUALITY, 92])
    if not ok:
        raise AppError(500, "Could not create the annotated image.")
    record_id = new_id()
    out_name = f"{new_id()}.jpg"
    out_path = safe_output_path(out_name)
    out_path.write_bytes(buf.tobytes())

    summary = summarize(detections)
    rec = DetectionRecord(
        id=record_id,
        detection_type="image",
        original_filename=sanitize_filename(file.filename),
        class_counts=summary["class_counts"],
        detections=detections[:MAX_STORED_DETECTIONS],
        confidence_hist=summary["confidence_hist"],
        meta={},
        total_objects=summary["total_objects"],
        avg_confidence=summary["avg_confidence"],
        inference_time_ms=inference_ms,
        image_width=w,
        image_height=h,
        confidence_threshold=conf,
        iou_threshold=iou_t,
        output_filename=out_name,
    )
    try:
        db.add(rec)
        db.commit()
        db.refresh(rec)
    except Exception:
        db.rollback()
        out_path.unlink(missing_ok=True)
        raise
    data = records.serialize(rec, detail=True)
    data["detections"] = detections  # response carries every detection even if storage is capped
    return data


@router.post("/frame", response_model=FrameDetectionResponse, summary="Detect objects in one camera frame")
def detect_frame(
    file: UploadFile = File(...),
    confidence: float = Form(0.25, ge=0.01, le=1.0),
    iou: float = Form(0.45, ge=0.01, le=1.0),
):
    """Used by the live camera page. Frames are NOT saved and NOT written to history."""
    data = read_limited(file.file, settings.max_frame_kb * 1024)
    frame = cv2.imdecode(np.frombuffer(data, np.uint8), cv2.IMREAD_COLOR)
    if frame is None:
        raise AppError(422, "The frame is not a valid JPEG/PNG image.")
    h, w = frame.shape[:2]
    if max(h, w) > 4096:
        raise AppError(422, "Frame is too large.")
    t0 = time.perf_counter()
    detections = yolo_service.detect(frame, conf=confidence, iou=iou)
    return {
        "detections": detections,
        "total_objects": len(detections),
        "inference_time_ms": round((time.perf_counter() - t0) * 1000, 1),
        "frame_width": w,
        "frame_height": h,
    }
