from collections import Counter, defaultdict

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import DetectionRecord
from ..services import records

router = APIRouter(prefix="/api/analytics", tags=["analytics"])


@router.get("/summary")
def summary(db: Session = Depends(get_db)):
    """Every number is computed from the saved detection records."""
    rows = db.query(DetectionRecord).order_by(DetectionRecord.created_at.asc()).all()
    classes: Counter = Counter()
    hist = [0] * 10
    by_day: dict = defaultdict(lambda: {"sessions": 0, "objects": 0})
    conf_weighted = 0.0
    total_objects = 0
    type_counts: Counter = Counter()
    for r in rows:
        classes.update(r.class_counts or {})
        for i, n in enumerate((r.confidence_hist or [])[:10]):
            hist[i] += n
        day = r.created_at.strftime("%Y-%m-%d")
        by_day[day]["sessions"] += 1
        by_day[day]["objects"] += r.total_objects
        conf_weighted += r.avg_confidence * r.total_objects
        total_objects += r.total_objects
        type_counts[r.detection_type] += 1
    most = classes.most_common(1)
    recent = [records.serialize(r) for r in reversed(rows[-6:])]
    return {
        "total_sessions": len(rows),
        "total_objects": total_objects,
        "avg_confidence": round(conf_weighted / total_objects, 4) if total_objects else 0.0,
        "most_common_object": most[0][0] if most else None,
        "most_common_count": most[0][1] if most else 0,
        "class_distribution": [{"name": k, "count": v} for k, v in classes.most_common(15)],
        "type_distribution": [
            {"name": "Image", "value": type_counts.get("image", 0)},
            {"name": "Video", "value": type_counts.get("video", 0)},
        ],
        "objects_per_session": [
            {"label": f"#{i + 1}", "objects": r.total_objects, "type": r.detection_type,
             "name": r.original_filename}
            for i, r in enumerate(rows[-20:], start=max(0, len(rows) - 20))
        ],
        "activity_over_time": [{"date": d, **v} for d, v in sorted(by_day.items())][-30:],
        "confidence_distribution": [
            {"range": f"{i * 10}-{i * 10 + 10}%", "count": hist[i]} for i in range(10)
        ],
        "recent": recent,
    }
