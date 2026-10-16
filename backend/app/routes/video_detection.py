import logging
import threading
import time
from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, UploadFile
from sqlalchemy.orm import Session

from ..config import settings
from ..database import SessionLocal, get_db
from ..models import DetectionRecord
from ..schemas.detection import VideoJobResponse
from ..services import records
from ..services.video_service import (
    VideoError, create_job, get_job, probe_video, process_video, video_slot,
)
from ..services.yolo_service import InferenceError, ModelUnavailableError, yolo_service
from ..utils.file_utils import (
    ALLOWED_VIDEO_EXT, AppError, new_id, remove_quietly, safe_output_path,
    sanitize_filename, save_limited, validate_extension,
)

log = logging.getLogger("visionai.video")
router = APIRouter(prefix="/api/detect", tags=["detection"])


def _run_job(job_id: str, tmp_path: Path, original_name: str, conf: float, iou: float, stride: int) -> None:
    job = get_job(job_id)
    out_name = f"{new_id()}.mp4"
    out_path = safe_output_path(out_name)
    try:
        with video_slot:  # one video at a time
            job.status = "processing"

            def progress(done: int, total: int) -> None:
                job.frames_done = done
                job.total_frames = total
                job.progress = min(0.99, done / total) if total else 0.0

            stats = process_video(tmp_path, out_path, yolo_service.detect, conf, iou, stride, progress)
        db = SessionLocal()
        try:
            rec = DetectionRecord(
                id=new_id(),
                detection_type="video",
                original_filename=original_name,
                class_counts=stats["class_counts"],
                detections=[],
                confidence_hist=stats["confidence_hist"],
                meta={
                    k: stats[k]
                    for k in (
                        "frames_read", "fps", "duration_seconds", "peak_objects_in_frame",
                        "frame_stride", "browser_playable", "processing_time_ms", "inference_time_ms",
                    )
                },
                total_objects=stats["total_objects"],
                avg_confidence=stats["avg_confidence"],
                inference_time_ms=stats["processing_time_ms"],
                frames_processed=stats["frames_processed"],
                image_width=stats["width"],
                image_height=stats["height"],
                confidence_threshold=conf,
                iou_threshold=iou,
                output_filename=out_name,
            )
            db.add(rec)
            db.commit()
            job.result_id = rec.id
        finally:
            db.close()
        job.progress = 1.0
        job.status = "completed"
    except (VideoError, ModelUnavailableError, InferenceError) as exc:
        job.status, job.error = "failed", str(exc)
        remove_quietly(out_path)
    except Exception:  # noqa: BLE001
        log.exception("Video job failed")
        job.status, job.error = "failed", "Unexpected server error while processing the video."
        remove_quietly(out_path)
    finally:
        remove_quietly(tmp_path)
        job.finished = time.time()


@router.post("/video", response_model=VideoJobResponse, status_code=202, summary="Start video detection")
def start_video(
    file: UploadFile = File(...),
    confidence: float = Form(0.25, ge=0.01, le=1.0),
    iou: float = Form(0.45, ge=0.01, le=1.0),
    frame_stride: int = Form(1, ge=1, le=10),
):
    """Validates the upload, then processes it in the background. Poll
    GET /api/detect/video/{job_id} until status is `completed` or `failed`."""
    ext = validate_extension(file.filename, ALLOWED_VIDEO_EXT)
    tmp = Path(settings.uploads_dir) / f"{new_id()}{ext}"
    try:
        save_limited(file.file, tmp, settings.max_video_mb * 1024 * 1024)
        info = probe_video(tmp)
    except VideoError as exc:
        remove_quietly(tmp)
        raise AppError(422, str(exc))
    except Exception:
        remove_quietly(tmp)
        raise
    job_id = new_id()
    job = create_job(job_id, sanitize_filename(file.filename), info["total_frames"])
    threading.Thread(
        target=_run_job,
        args=(job_id, tmp, job.filename, confidence, iou, frame_stride),
        name=f"video-{job_id[:6]}",
        daemon=True,
    ).start()
    return _job_response(job, None)


@router.get("/video/{job_id}", response_model=VideoJobResponse, summary="Video job status")
def video_status(job_id: str, db: Session = Depends(get_db)):
    job = get_job(job_id)
    if job is None:
        raise AppError(404, "Video job not found (it may have expired or the server was restarted).")
    result = None
    if job.status == "completed" and job.result_id:
        rec = db.get(DetectionRecord, job.result_id)
        result = records.serialize(rec, detail=True) if rec else None
    return _job_response(job, result)


def _job_response(job, result):
    return {
        "job_id": job.id,
        "status": job.status,
        "progress": round(job.progress, 3),
        "frames_done": job.frames_done,
        "total_frames": job.total_frames,
        "error": job.error,
        "result": result,
    }
