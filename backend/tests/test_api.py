import io
import time

import cv2
import numpy as np

from .conftest import make_image_bytes


def test_health(client):
    r = client.get("/api/health")
    assert r.status_code == 200 and r.json()["status"] == "ok"


def test_model_status_shape(client):
    r = client.get("/api/model/status")
    assert r.status_code == 200
    assert r.json()["state"] in {"ready", "loading", "error", "not_loaded"}


def test_empty_analytics_and_history(client):
    client.delete("/api/history")
    a = client.get("/api/analytics/summary").json()
    assert a["total_sessions"] == 0 and a["most_common_object"] is None
    h = client.get("/api/history").json()
    assert h == {"items": [], "total": 0}


def test_rejects_wrong_extension(client, stub_model):
    r = client.post("/api/detect/image", files={"file": ("a.txt", b"hello", "text/plain")})
    assert r.status_code == 415


def test_rejects_corrupt_image(client, stub_model):
    r = client.post("/api/detect/image", files={"file": ("a.png", b"not an image", "image/png")})
    assert r.status_code == 422


def test_rejects_oversized_image(client, stub_model):
    big = b"\x89PNG" + b"0" * (2 * 1024 * 1024)
    r = client.post("/api/detect/image", files={"file": ("a.png", big, "image/png")})
    assert r.status_code == 413


def test_image_detection_end_to_end(client, stub_model):
    client.delete("/api/history")
    r = client.post(
        "/api/detect/image",
        files={"file": ("../../evil name.png", make_image_bytes(), "image/png")},
        data={"confidence": "0.25", "iou": "0.45"},
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["total_objects"] == 2
    assert body["class_counts"] == {"person": 1, "car": 1}
    assert body["image_width"] == 320 and body["image_height"] == 240
    x1, y1, x2, y2 = body["detections"][0]["bbox"]
    assert 0 <= x1 < x2 <= 320 and 0 <= y1 < y2 <= 240
    assert "/" not in body["original_filename"] and ".." not in body["original_filename"]
    # annotated output is retrievable and is a real image
    img = client.get(body["output_url"])
    assert img.status_code == 200 and img.headers["content-type"] == "image/jpeg"
    assert cv2.imdecode(np.frombuffer(img.content, np.uint8), cv2.IMREAD_COLOR).shape[:2] == (240, 320)
    dl = client.get(body["output_url"] + "?download=1")
    assert "attachment" in dl.headers["content-disposition"]


def test_threshold_filters_detections(client, stub_model):
    r = client.post("/api/detect/image", files={"file": ("a.png", make_image_bytes(), "image/png")},
                    data={"confidence": "0.8"})
    assert r.json()["total_objects"] == 1


def test_no_detections_is_not_an_error(client, monkeypatch):
    from app.services.yolo_service import yolo_service
    monkeypatch.setattr(yolo_service, "detect", lambda *a, **k: [])
    r = client.post("/api/detect/image", files={"file": ("a.webp", make_image_bytes("WEBP"), "image/webp")})
    assert r.status_code == 200
    assert r.json()["total_objects"] == 0 and r.json()["avg_confidence"] == 0


def test_history_and_analytics_reflect_database(client, stub_model):
    client.delete("/api/history")
    for _ in range(2):
        client.post("/api/detect/image", files={"file": ("a.jpg", make_image_bytes("JPEG"), "image/jpeg")})
    h = client.get("/api/history").json()
    assert h["total"] == 2
    one = client.get(f"/api/history/{h['items'][0]['id']}")
    assert one.status_code == 200 and len(one.json()["detections"]) == 2
    a = client.get("/api/analytics/summary").json()
    assert a["total_sessions"] == 2 and a["total_objects"] == 4
    assert a["most_common_object"] == "person"
    assert a["type_distribution"][0] == {"name": "Image", "value": 2}
    assert sum(b["count"] for b in a["confidence_distribution"]) == 4


def test_delete_history_removes_output_file(client, stub_model):
    client.delete("/api/history")
    body = client.post("/api/detect/image", files={"file": ("a.png", make_image_bytes(), "image/png")}).json()
    assert client.delete(f"/api/history/{body['id']}").status_code == 204
    assert client.get(f"/api/history/{body['id']}").status_code == 404
    assert client.get(body["output_url"]).status_code == 404


def test_output_path_traversal_blocked(client):
    for name in ["..%2f..%2fetc%2fpasswd", "..%5c..%5cwindows", "abc.jpg", "x" * 32 + ".jpg"]:
        assert client.get(f"/api/outputs/{name}").status_code == 404


def test_frame_endpoint(client, stub_model):
    ok, buf = cv2.imencode(".jpg", np.zeros((120, 160, 3), np.uint8))
    r = client.post("/api/detect/frame", files={"file": ("f.jpg", buf.tobytes(), "image/jpeg")})
    assert r.status_code == 200
    j = r.json()
    assert j["frame_width"] == 160 and j["frame_height"] == 120 and j["total_objects"] == 2


def test_settings_roundtrip_and_validation(client):
    s = client.get("/api/settings").json()
    s["default_confidence"] = 0.4
    assert client.put("/api/settings", json=s).status_code == 200
    assert client.get("/api/settings").json()["default_confidence"] == 0.4
    s["default_confidence"] = 5
    assert client.put("/api/settings", json=s).status_code == 422


def _make_video(path, frames=12):
    w = cv2.VideoWriter(str(path), cv2.VideoWriter_fourcc(*"mp4v"), 10, (160, 120))
    for i in range(frames):
        w.write(np.full((120, 160, 3), i * 10, np.uint8))
    w.release()


def test_video_job_end_to_end(client, stub_model, tmp_path):
    client.delete("/api/history")
    p = tmp_path / "clip.mp4"
    _make_video(p)
    r = client.post("/api/detect/video", files={"file": ("clip.mp4", p.read_bytes(), "video/mp4")})
    assert r.status_code == 202, r.text
    job = r.json()["job_id"]
    for _ in range(120):
        s = client.get(f"/api/detect/video/{job}").json()
        if s["status"] in {"completed", "failed"}:
            break
        time.sleep(0.5)
    assert s["status"] == "completed", s
    res = s["result"]
    assert res["frames_processed"] == 12 and res["total_objects"] == 24
    out = client.get(res["output_url"])
    assert out.status_code == 200 and out.headers["content-type"] == "video/mp4"
    part = client.get(res["output_url"], headers={"Range": "bytes=0-99"})
    assert part.status_code == 206 and len(part.content) == 100


def test_corrupt_video_rejected(client, stub_model):
    r = client.post("/api/detect/video", files={"file": ("bad.mp4", b"this is not a video" * 100, "video/mp4")})
    assert r.status_code == 422
    r = client.post("/api/detect/video", files={"file": ("bad.exe", b"x", "application/octet-stream")})
    assert r.status_code == 415
