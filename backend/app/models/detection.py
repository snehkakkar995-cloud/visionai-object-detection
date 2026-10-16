from datetime import datetime, timezone

from sqlalchemy import JSON, DateTime, Float, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from ..database import Base


def _now() -> datetime:
    return datetime.now(timezone.utc)


class DetectionRecord(Base):
    """One saved detection session (image or video). No binary data is stored here,
    only metadata and a reference (file name) to the annotated output on disk."""

    __tablename__ = "detections"

    id: Mapped[str] = mapped_column(String(32), primary_key=True)
    detection_type: Mapped[str] = mapped_column(String(16), index=True)  # "image" | "video"
    original_filename: Mapped[str] = mapped_column(String(160))
    class_counts: Mapped[dict] = mapped_column(JSON, default=dict)
    detections: Mapped[list] = mapped_column(JSON, default=list)  # images only
    confidence_hist: Mapped[list] = mapped_column(JSON, default=list)  # 10 bins
    meta: Mapped[dict] = mapped_column(JSON, default=dict)
    total_objects: Mapped[int] = mapped_column(Integer, default=0)
    avg_confidence: Mapped[float] = mapped_column(Float, default=0.0)
    inference_time_ms: Mapped[float] = mapped_column(Float, default=0.0)
    frames_processed: Mapped[int | None] = mapped_column(Integer, nullable=True)
    image_width: Mapped[int | None] = mapped_column(Integer, nullable=True)
    image_height: Mapped[int | None] = mapped_column(Integer, nullable=True)
    confidence_threshold: Mapped[float] = mapped_column(Float, default=0.25)
    iou_threshold: Mapped[float] = mapped_column(Float, default=0.45)
    output_filename: Mapped[str | None] = mapped_column(String(64), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_now, index=True)


class AppSetting(Base):
    __tablename__ = "app_settings"

    key: Mapped[str] = mapped_column(String(64), primary_key=True)
    value: Mapped[dict] = mapped_column(JSON, default=dict)
