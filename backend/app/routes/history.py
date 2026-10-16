from fastapi import APIRouter, Depends, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import DetectionRecord
from ..schemas.detection import DetectionDetail, HistoryList
from ..services import records
from ..utils.file_utils import AppError

router = APIRouter(prefix="/api/history", tags=["history"])


@router.get("", response_model=HistoryList)
def list_history(
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    detection_type: str | None = Query(None, pattern="^(image|video)$"),
    db: Session = Depends(get_db),
):
    q = db.query(DetectionRecord)
    if detection_type:
        q = q.filter(DetectionRecord.detection_type == detection_type)
    total = q.with_entities(func.count(DetectionRecord.id)).scalar() or 0
    rows = q.order_by(DetectionRecord.created_at.desc()).offset(offset).limit(limit).all()
    return {"items": [records.serialize(r) for r in rows], "total": total}


@router.get("/{detection_id}", response_model=DetectionDetail)
def get_detection(detection_id: str, db: Session = Depends(get_db)):
    rec = db.get(DetectionRecord, detection_id)
    if not rec:
        raise AppError(404, "Detection not found.")
    return records.serialize(rec, detail=True)


@router.delete("/{detection_id}", status_code=204)
def delete_detection(detection_id: str, db: Session = Depends(get_db)):
    rec = db.get(DetectionRecord, detection_id)
    if not rec:
        raise AppError(404, "Detection not found.")
    records.delete_record(db, rec)


@router.delete("")
def clear_history(db: Session = Depends(get_db)):
    rows = db.query(DetectionRecord).all()
    for rec in rows:
        records.delete_record(db, rec)
    return {"deleted": len(rows)}
