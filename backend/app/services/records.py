"""Database helpers shared by the routes."""
import time
from datetime import datetime, timedelta, timezone
from pathlib import Path

from sqlalchemy.orm import Session

from ..config import settings
from ..models import AppSetting, DetectionRecord
from ..schemas.detection import UserSettings
from ..utils.file_utils import OUTPUT_NAME_RE, delete_output, remove_quietly


def output_url(filename: str | None) -> str | None:
    return f"/api/outputs/{filename}" if filename else None


def serialize(rec: DetectionRecord, detail: bool = False) -> dict:
    data = {
        "id": rec.id,
        "detection_type": rec.detection_type,
        "original_filename": rec.original_filename,
        "class_counts": rec.class_counts or {},
        "total_objects": rec.total_objects,
        "avg_confidence": rec.avg_confidence,
        "inference_time_ms": rec.inference_time_ms,
        "frames_processed": rec.frames_processed,
        "output_url": output_url(rec.output_filename),
        "created_at": rec.created_at,
    }
    if detail:
        data.update(
            detections=rec.detections or [],
            confidence_hist=rec.confidence_hist or [],
            meta=rec.meta or {},
            image_width=rec.image_width,
            image_height=rec.image_height,
            confidence_threshold=rec.confidence_threshold,
            iou_threshold=rec.iou_threshold,
        )
    return data


def get_user_settings(db: Session) -> UserSettings:
    row = db.get(AppSetting, "user_settings")
    base = {"default_confidence": settings.default_confidence, "default_iou": settings.default_iou}
    if row and row.value:
        base.update(row.value)
    try:
        return UserSettings(**base)
    except Exception:  # noqa: BLE001  (corrupt stored values -> defaults)
        return UserSettings()


def save_user_settings(db: Session, value: UserSettings) -> UserSettings:
    row = db.get(AppSetting, "user_settings")
    if row is None:
        row = AppSetting(key="user_settings", value=value.model_dump())
        db.add(row)
    else:
        row.value = value.model_dump()
    db.commit()
    return value


def delete_record(db: Session, rec: DetectionRecord) -> None:
    delete_output(rec.output_filename)
    db.delete(rec)
    db.commit()


def clear_uploads() -> None:
    """Remove leftover temp uploads (e.g. after a crash). Runs at startup."""
    for p in Path(settings.uploads_dir).glob("*"):
        if p.is_file() and p.name != ".gitkeep":
            remove_quietly(p)


def cleanup_expired_outputs(db: Session) -> int:
    """Retention policy: output files older than OUTPUT_RETENTION_DAYS are deleted and the
    matching history rows keep their statistics but lose the output reference."""
    removed = 0
    if settings.output_retention_days > 0:
        cutoff = time.time() - settings.output_retention_days * 86400
        for p in Path(settings.outputs_dir).glob("*"):
            if p.is_file() and OUTPUT_NAME_RE.match(p.name) and p.stat().st_mtime < cutoff:
                remove_quietly(p)
                removed += 1
    base = Path(settings.outputs_dir)
    for rec in db.query(DetectionRecord).filter(DetectionRecord.output_filename.isnot(None)).all():
        if not (base / rec.output_filename).exists():
            rec.output_filename = None
    db.commit()
    return removed
