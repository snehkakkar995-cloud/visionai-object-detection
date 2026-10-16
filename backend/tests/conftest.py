import os
import tempfile
from pathlib import Path

# Configure an isolated environment BEFORE the app is imported.
_tmp = Path(tempfile.mkdtemp(prefix="visionai_test_"))
os.environ["DATABASE_URL"] = f"sqlite:///{(_tmp / 'test.db').as_posix()}"
os.environ["UPLOADS_DIR"] = str(_tmp / "uploads")
os.environ["OUTPUTS_DIR"] = str(_tmp / "outputs")
os.environ["LOAD_MODEL_ON_STARTUP"] = "false"
os.environ["MAX_IMAGE_MB"] = "1"

import io  # noqa: E402

import numpy as np  # noqa: E402
import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402
from PIL import Image  # noqa: E402

from app.main import app  # noqa: E402
from app.services.yolo_service import yolo_service  # noqa: E402


def fake_detect(image_bgr, conf=0.25, iou=0.45, imgsz=640):
    """Deterministic stand-in for the model, used ONLY by the API tests."""
    h, w = image_bgr.shape[:2]
    dets = [
        {"class_id": 0, "class_name": "person", "confidence": 0.91, "bbox": [w * 0.1, h * 0.1, w * 0.5, h * 0.9]},
        {"class_id": 2, "class_name": "car", "confidence": 0.55, "bbox": [w * 0.55, h * 0.5, w * 0.95, h * 0.9]},
    ]
    return [d for d in dets if d["confidence"] >= conf]


@pytest.fixture(scope="session")
def client():
    with TestClient(app) as c:
        yield c


@pytest.fixture()
def stub_model(monkeypatch):
    monkeypatch.setattr(yolo_service, "detect", fake_detect)
    return fake_detect


def make_image_bytes(fmt="PNG", size=(320, 240)):
    arr = (np.random.rand(size[1], size[0], 3) * 255).astype("uint8")
    buf = io.BytesIO()
    Image.fromarray(arr).save(buf, format=fmt)
    return buf.getvalue()
