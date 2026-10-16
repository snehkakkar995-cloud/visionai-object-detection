from datetime import datetime, timezone
from typing import Any

from pydantic import BaseModel, Field, field_validator


class DetectedObject(BaseModel):
    class_id: int
    class_name: str
    confidence: float = Field(description="0..1")
    bbox: list[float] = Field(description="[x1, y1, x2, y2] in pixels of the original image")


class DetectionSummary(BaseModel):
    id: str
    detection_type: str
    original_filename: str
    class_counts: dict[str, int]
    total_objects: int
    avg_confidence: float
    inference_time_ms: float
    frames_processed: int | None = None
    output_url: str | None = None
    created_at: datetime

    @field_validator("created_at")
    @classmethod
    def _utc(cls, v: datetime) -> datetime:
        return v.replace(tzinfo=timezone.utc) if v.tzinfo is None else v


class DetectionDetail(DetectionSummary):
    detections: list[DetectedObject] = []
    confidence_hist: list[int] = []
    meta: dict[str, Any] = {}
    image_width: int | None = None
    image_height: int | None = None
    confidence_threshold: float
    iou_threshold: float


class FrameDetectionResponse(BaseModel):
    detections: list[DetectedObject]
    total_objects: int
    inference_time_ms: float
    frame_width: int
    frame_height: int


class VideoJobResponse(BaseModel):
    job_id: str
    status: str
    progress: float
    frames_done: int
    total_frames: int
    error: str | None = None
    result: DetectionDetail | None = None


class HistoryList(BaseModel):
    items: list[DetectionSummary]
    total: int


class UserSettings(BaseModel):
    default_confidence: float = Field(0.25, ge=0.01, le=1.0)
    default_iou: float = Field(0.45, ge=0.01, le=1.0)
    video_frame_stride: int = Field(1, ge=1, le=10)
    live_interval_ms: int = Field(200, ge=50, le=2000)
    live_max_width: int = Field(640, ge=160, le=1280)


class ModelStatus(BaseModel):
    state: str
    loaded: bool
    model_name: str
    device: str
    num_classes: int
    class_names: list[str]
    load_seconds: float | None = None
    error: str | None = None


class Limits(BaseModel):
    max_image_mb: int
    max_video_mb: int
    allowed_image_types: list[str]
    allowed_video_types: list[str]
