from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..config import settings
from ..database import get_db
from ..schemas.detection import Limits, ModelStatus, UserSettings
from ..services import records
from ..services.yolo_service import yolo_service
from ..utils.file_utils import ALLOWED_IMAGE_EXT, ALLOWED_VIDEO_EXT

router = APIRouter(prefix="/api", tags=["system"])


@router.get("/health")
def health():
    return {
        "status": "ok",
        "model_state": yolo_service.status()["state"],
        "time": datetime.now(timezone.utc).isoformat(),
    }


@router.get("/model/status", response_model=ModelStatus)
def model_status():
    return yolo_service.status()


@router.post("/model/reload", response_model=ModelStatus)
def model_reload():
    yolo_service.reload()
    return yolo_service.status()


@router.get("/limits", response_model=Limits)
def limits():
    return {
        "max_image_mb": settings.max_image_mb,
        "max_video_mb": settings.max_video_mb,
        "allowed_image_types": sorted(e.lstrip(".") for e in ALLOWED_IMAGE_EXT),
        "allowed_video_types": sorted(e.lstrip(".") for e in ALLOWED_VIDEO_EXT),
    }


@router.get("/settings", response_model=UserSettings)
def read_settings(db: Session = Depends(get_db)):
    return records.get_user_settings(db)


@router.put("/settings", response_model=UserSettings)
def write_settings(body: UserSettings, db: Session = Depends(get_db)):
    return records.save_user_settings(db, body)
