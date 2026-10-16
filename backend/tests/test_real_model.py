"""Runs only if ultralytics is installed AND the weights can be loaded (needs internet once)."""
import numpy as np
import pytest

pytest.importorskip("ultralytics")

from app.services.yolo_service import YoloService  # noqa: E402


def test_real_model_loads_and_returns_valid_structure():
    svc = YoloService()
    if not svc.load():
        pytest.skip(f"Model could not be loaded: {svc.error}")
    assert svc.status()["num_classes"] == 80
    img = (np.random.rand(480, 640, 3) * 255).astype("uint8")
    dets = svc.detect(img, conf=0.01)
    for d in dets:
        x1, y1, x2, y2 = d["bbox"]
        assert 0 <= x1 <= x2 <= 640 and 0 <= y1 <= y2 <= 480
        assert 0 < d["confidence"] <= 1
