"""YOLO model service.

One shared instance (`yolo_service`) loads the model once and is used by the image,
video and live-camera features so they all run the same detection logic.

Bounding boxes are returned as [x1, y1, x2, y2] in pixels of the ORIGINAL input image.
"""
import logging
import os
import threading
import time

import cv2
import numpy as np

from ..config import settings

log = logging.getLogger("visionai.yolo")

# BGR colours, dark enough for white label text
PALETTE = [
    (200, 90, 30), (60, 140, 40), (30, 90, 220), (150, 50, 160), (20, 130, 180),
    (190, 60, 90), (40, 110, 110), (110, 70, 200), (160, 110, 20), (70, 70, 70),
]
FONT = cv2.FONT_HERSHEY_SIMPLEX


class ModelUnavailableError(Exception):
    """The YOLO model could not be loaded."""


class InferenceError(Exception):
    """Inference failed for an already loaded model."""


class YoloService:
    def __init__(self, model_path: str | None = None):
        self.model_path = model_path or settings.yolo_model_path
        self._model = None
        self._lock = threading.RLock()
        self._loading = False
        self.error: str | None = None
        self.device: str | int = "cpu"
        self.load_seconds: float | None = None
        self.names: dict[int, str] = {}

    # ------------------------------------------------------------------ state
    @property
    def loaded(self) -> bool:
        return self._model is not None

    def status(self) -> dict:
        if self.loaded:
            state = "ready"
        elif self._loading:
            state = "loading"
        elif self.error:
            state = "error"
        else:
            state = "not_loaded"
        return {
            "state": state,
            "loaded": self.loaded,
            "model_name": os.path.basename(self.model_path),
            "device": "cuda" if self.device == 0 else "cpu",
            "num_classes": len(self.names),
            "class_names": [self.names[k] for k in sorted(self.names)],
            "load_seconds": self.load_seconds,
            "error": self.error,
        }

    # ---------------------------------------------------------------- loading
    def load(self) -> bool:
        """Load the model once. Weights are downloaded automatically by Ultralytics
        the first time if the file is missing (needs internet that one time)."""
        with self._lock:
            if self._model is not None:
                return True
            self._loading = True
            self.error = None
            try:
                from ultralytics import YOLO  # imported lazily so the API can start without it
                import torch

                started = time.perf_counter()
                model = YOLO(self.model_path)
                device: str | int = 0 if torch.cuda.is_available() else "cpu"
                dummy = np.zeros((64, 64, 3), dtype=np.uint8)
                try:
                    model.predict(dummy, device=device, verbose=False)  # warm-up / compatibility check
                except Exception as exc:
                    if device == 0:
                        log.warning("GPU inference failed (%s); falling back to CPU", exc)
                        device = "cpu"
                        model.predict(dummy, device=device, verbose=False)
                    else:
                        raise
                self.device = device
                self.names = {int(k): str(v) for k, v in model.names.items()}
                self._model = model
                self.load_seconds = round(time.perf_counter() - started, 2)
                log.info("YOLO model '%s' ready on %s in %.2fs", self.model_path, device, self.load_seconds)
                return True
            except Exception as exc:  # noqa: BLE001
                log.exception("Failed to load YOLO model")
                self.error = f"{type(exc).__name__}: {str(exc)[:250]}"
                return False
            finally:
                self._loading = False

    def load_async(self) -> None:
        if self.loaded or self._loading:
            return
        self._loading = True  # visible immediately to /api/model/status
        threading.Thread(target=self.load, name="yolo-loader", daemon=True).start()

    def reload(self) -> None:
        if self._loading:
            return
        self._model = None
        self.error = None
        self.load_async()

    # -------------------------------------------------------------- inference
    def detect(self, image_bgr: np.ndarray, conf: float = 0.25, iou: float = 0.45, imgsz: int = 640) -> list[dict]:
        """Run real YOLO inference on a BGR uint8 image. Returns a list of detections:
        {"class_id", "class_name", "confidence", "bbox": [x1, y1, x2, y2]}"""
        if not self.load():
            raise ModelUnavailableError(self.error or "Model is not available.")
        try:
            with self._lock:
                results = self._model.predict(
                    image_bgr, conf=conf, iou=iou, imgsz=imgsz, device=self.device, verbose=False
                )
            boxes = results[0].boxes
            if boxes is None or len(boxes) == 0:
                return []
            h, w = image_bgr.shape[:2]
            xyxy = boxes.xyxy.cpu().numpy()
            confs = boxes.conf.cpu().numpy()
            classes = boxes.cls.cpu().numpy().astype(int)
            out = []
            for (x1, y1, x2, y2), c, k in zip(xyxy, confs, classes):
                out.append(
                    {
                        "class_id": int(k),
                        "class_name": self.names.get(int(k), str(int(k))),
                        "confidence": round(float(c), 4),
                        "bbox": [
                            round(float(max(0.0, x1)), 1),
                            round(float(max(0.0, y1)), 1),
                            round(float(min(w, x2)), 1),
                            round(float(min(h, y2)), 1),
                        ],
                    }
                )
            return out
        except ModelUnavailableError:
            raise
        except Exception as exc:  # noqa: BLE001
            log.exception("Inference failed")
            raise InferenceError("Inference failed. Check the server logs for details.") from exc


# ----------------------------------------------------------------- helpers (no model needed)
def annotate(image_bgr: np.ndarray, detections: list[dict]) -> np.ndarray:
    """Draw boxes + 'label 87%' captions on a copy of the image."""
    out = image_bgr.copy()
    h, w = out.shape[:2]
    thickness = max(2, round(min(h, w) / 300))
    scale = max(0.5, min(h, w) / 900)
    for d in detections:
        x1, y1, x2, y2 = (int(round(v)) for v in d["bbox"])
        color = PALETTE[d["class_id"] % len(PALETTE)]
        cv2.rectangle(out, (x1, y1), (x2, y2), color, thickness)
        label = f'{d["class_name"]} {d["confidence"] * 100:.0f}%'
        (tw, th), baseline = cv2.getTextSize(label, FONT, scale, 1)
        box_h = th + baseline + 6
        top = y1 - box_h if y1 - box_h >= 0 else y1
        right = min(w - 1, x1 + tw + 8)
        cv2.rectangle(out, (x1, top), (right, top + box_h), color, -1)
        cv2.putText(out, label, (x1 + 4, top + box_h - baseline - 3), FONT, scale, (255, 255, 255), 1, cv2.LINE_AA)
    return out


def confidence_bin(conf: float) -> int:
    return min(int(conf * 10), 9)


def summarize(detections: list[dict]) -> dict:
    """Aggregate class counts, average confidence and a 10-bin confidence histogram."""
    counts: dict[str, int] = {}
    hist = [0] * 10
    total_conf = 0.0
    for d in detections:
        counts[d["class_name"]] = counts.get(d["class_name"], 0) + 1
        hist[confidence_bin(d["confidence"])] += 1
        total_conf += d["confidence"]
    n = len(detections)
    return {
        "class_counts": dict(sorted(counts.items(), key=lambda kv: -kv[1])),
        "total_objects": n,
        "avg_confidence": round(total_conf / n, 4) if n else 0.0,
        "confidence_hist": hist,
    }


yolo_service = YoloService()
