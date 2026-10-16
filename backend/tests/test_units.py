import numpy as np
import pytest

from app.services.yolo_service import annotate, summarize
from app.utils.file_utils import AppError, read_limited, safe_output_path, sanitize_filename, validate_extension
import io


def test_sanitize_filename():
    assert sanitize_filename("../../etc/passwd") == "passwd"
    assert sanitize_filename("C:\\Users\\me\\cat photo.jpg") == "cat photo.jpg"
    assert sanitize_filename("") == "upload"
    assert sanitize_filename("a<b>|c.png") == "a_b__c.png"


def test_validate_extension():
    assert validate_extension("X.JPG", {".jpg"}) == ".jpg"
    with pytest.raises(AppError):
        validate_extension("x.exe", {".jpg"})


def test_read_limited():
    assert read_limited(io.BytesIO(b"abc"), 10) == b"abc"
    with pytest.raises(AppError):
        read_limited(io.BytesIO(b"x" * 11), 10)
    with pytest.raises(AppError):
        read_limited(io.BytesIO(b""), 10)


def test_safe_output_path():
    assert safe_output_path("a" * 32 + ".jpg") is not None
    for bad in ["../x.jpg", "a.jpg", "A" * 32 + ".jpg", ("a" * 32) + ".exe", "/etc/passwd"]:
        assert safe_output_path(bad) is None


def test_summarize():
    s = summarize([
        {"class_name": "dog", "confidence": 0.9, "class_id": 16, "bbox": [0, 0, 1, 1]},
        {"class_name": "dog", "confidence": 0.5, "class_id": 16, "bbox": [0, 0, 1, 1]},
        {"class_name": "cat", "confidence": 1.0, "class_id": 15, "bbox": [0, 0, 1, 1]},
    ])
    assert s["class_counts"] == {"dog": 2, "cat": 1}
    assert s["total_objects"] == 3 and s["avg_confidence"] == 0.8
    assert s["confidence_hist"][9] == 2 and s["confidence_hist"][5] == 1
    assert summarize([])["avg_confidence"] == 0.0


def test_annotate_draws_inside_image_and_keeps_shape():
    img = np.zeros((100, 200, 3), np.uint8)
    out = annotate(img, [{"class_id": 0, "class_name": "person", "confidence": 0.9, "bbox": [10, 5, 120, 90]}])
    assert out.shape == img.shape and out.sum() > 0 and img.sum() == 0
