# VisionAI - Intelligent Object Detection

A full-stack object detection web application: **React + Vite + Tailwind** frontend, **FastAPI** backend,
real **Ultralytics YOLOv8** inference, **SQLite** history/analytics.

Image detection, video detection and live webcam detection all use the same backend detection function
(`backend/app/services/yolo_service.py`). Nothing in the UI is hard-coded or simulated: every box, label,
confidence score and statistic comes from real model output or from the database.

```
visionai/
  backend/                FastAPI + YOLO + SQLite
    app/
      main.py             app, CORS, error handling, startup (DB init, cleanup, model load)
      config.py           settings (.env)
      database.py         SQLAlchemy engine/session
      models/detection.py DetectionRecord + AppSetting tables
      schemas/detection.py Pydantic request/response schemas
      routes/             health, image_detection, video_detection, history, analytics, outputs
      services/           yolo_service.py (model), video_service.py (OpenCV pipeline), records.py
      utils/file_utils.py upload validation, safe filenames, path-traversal protection
    tests/                pytest suite
    check_setup.py        one-command real-model check
    requirements.txt  .env.example  uploads/  outputs/
  frontend/               React app (Vite)
    src/{components,pages,services,hooks,context,utils}
    package.json  .env.example
  start-backend.bat  start-frontend.bat
```

---------------------------------------------------------------------------------------------------

## 1. Requirements (Windows)

| Tool | Version |
|------|---------|
| Python | **3.10, 3.11 or 3.12** (64-bit). Python 3.13 is not supported by the pinned PyTorch. |
| Node.js | 18 or newer (20 LTS recommended) |
| Internet | needed **once** to install packages and to download `yolov8n.pt` (~6 MB) |

The pinned, mutually compatible versions are in `backend/requirements.txt`
(`ultralytics==8.3.40`, `torch==2.5.1`, `numpy==1.26.4`, `opencv-python==4.10.0.84`, ...).
The first `pip install` downloads PyTorch (~200 MB, CPU build on Windows) and takes a few minutes.

## 2. Run the backend

Open **Command Prompt** or PowerShell in the project folder:

```bat
cd backend
python -m venv venv
venv\Scripts\activate
python -m pip install --upgrade pip
pip install -r requirements.txt
copy .env.example .env
python check_setup.py
uvicorn app.main:app --reload
```

*PowerShell note:* if `venv\Scripts\activate` is blocked, run
`Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass` first, or use Command Prompt.

* `python check_setup.py` is optional but recommended: it loads the real model (downloading
  `yolov8n.pt` automatically the first time) and runs inference. Pass a photo to see real detections:
  `python check_setup.py C:\path\to\photo.jpg` (writes `check_output.jpg`).
* When the server starts, the model loads **in the background**. The top bar of the website shows
  "Loading model..." and then the model name once it is ready. If the weights are missing the backend
  downloads them automatically on that first start (internet required once). The `.pt` file is saved in the folder
  you started uvicorn from and is git-ignored.
* Shortcut: double-click `start-backend.bat` (creates the venv and installs on first run).

## 3. Run the frontend

In a second terminal:

```bat
cd frontend
npm install
npm run dev
```

Shortcut: double-click `start-frontend.bat`.

| What | Address |
|------|---------|
| Website | http://localhost:5173 |
| Backend API | http://localhost:8000 |
| Swagger docs | http://localhost:8000/docs |
| Health check | http://localhost:8000/api/health |

The frontend reads the API address from `frontend/.env` (`VITE_API_URL=http://localhost:8000`).
Production build: `npm run build` then `npm run preview` (all routes work after refresh).

## 4. Using the app

* **Image Detection** - drag & drop or browse (JPG/JPEG/PNG/WEBP, max 10 MB), set confidence / IoU, press
  *Detect Objects*. You get the original and annotated image side by side, class counts, a per-object table
  with bounding boxes, inference time and a download button.
* **Video Detection** - MP4/AVI/MOV/MKV/WEBM/M4V up to 100 MB. The upload is validated immediately, then processed in the
  background while a progress bar polls the server. The result appears only when the server has finished. Output
  is re-encoded to H.264 so it plays in every browser. Audio is not copied.
  "Analyse every Nth frame" speeds up CPU processing; skipped frames reuse the previous boxes for display only and are
  not counted as detections.
* **Live Camera** - *Start Camera* (browser asks permission; works on `http://localhost` or HTTPS), then
  *Start Detection*. The browser captures a frame, shrinks it (default 640 px wide), sends it to
  `POST /api/detect/frame` and **waits for the answer before sending the next**, with a minimum interval between
  frames (default 200 ms). Boxes are drawn on a canvas over the live video. The FPS shown is the measured rate
  of completed detections. The camera is released on *Stop Camera*, and when you leave the page.
* **History / Dashboard / Analytics** - built from the SQLite database. Empty database -> zero-state messages.
* **Settings** - default thresholds, live-camera interval/width, model status & reload, clear history.

## 5. API reference

Interactive docs: http://localhost:8000/docs. Bounding boxes are always `[x1, y1, x2, y2]` in **pixels of the original image**
(top-left origin). Confidence is `0..1`.

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Liveness + model state |
| GET | `/api/model/status` | Model state (`ready/loading/error`), device (cpu/cuda), classes, load error |
| POST | `/api/model/reload` | Retry loading the model |
| GET | `/api/limits` | Upload limits and allowed types |
| POST | `/api/detect/image` | multipart: `file`, `confidence`, `iou` -> detection id, detections, class counts, inference time, `output_url` |
| POST | `/api/detect/frame` | multipart JPEG frame for live camera -> detections (not saved) |
| POST | `/api/detect/video` | multipart: `file`, `confidence`, `iou`, `frame_stride` -> `202` + `job_id` |
| GET | `/api/detect/video/{job_id}` | `queued/processing/completed/failed`, progress, final result |
| GET | `/api/history?limit&offset&detection_type` | Saved detections (newest first) |
| GET | `/api/history/{id}` | One detection incl. per-object boxes (images) |
| DELETE | `/api/history/{id}` | Delete record and its output file |
| DELETE | `/api/history` | Delete everything |
| GET | `/api/analytics/summary` | Totals, class/type distribution, per-session, per-day, confidence histogram |
| GET | `/api/outputs/{filename}` | Annotated image/video (HTTP Range supported). `?download=1` forces download |
| GET/PUT | `/api/settings` | Persisted user defaults |

Example response of `POST /api/detect/image` (shortened):

```json
{
  "id": "9f1c...", "detection_type": "image", "original_filename": "street.jpg",
  "total_objects": 3, "class_counts": {"person": 2, "car": 1},
  "avg_confidence": 0.78, "inference_time_ms": 61.4,
  "image_width": 1280, "image_height": 720,
  "detections": [{"class_id": 0, "class_name": "person", "confidence": 0.91, "bbox": [102.3, 80.0, 340.5, 612.8]}],
  "output_url": "/api/outputs/3a6e...c1.jpg"
}
```

Errors use standard HTTP codes with `{"detail": "..."}`: 413 too large, 415 wrong type, 422 corrupt/invalid,
404 not found, 503 model unavailable.

## 6. Security & data handling

* File extension **and** content are validated (images decoded with Pillow, only JPEG/PNG/WEBP; videos opened with OpenCV).
* Size limits (image 10 MB, video 100 MB, camera frame 2 MB) enforced while reading; early `Content-Length` rejection.
* Original filenames are only sanitized for display; files on disk get random UUID names.
* `/api/outputs/{filename}` only accepts server-generated names (`^[a-f0-9]{32}\.(jpg|mp4)$`) and re-checks the resolved path -
  path traversal is rejected. No server paths appear in responses.
* Temporary uploads are deleted after processing (and swept at startup).
* CORS is restricted to `CORS_ORIGINS`. No secrets or API keys are used. Authentication is not implemented (optional in the brief).
* **Retention policy:** SQLite stores metadata only (no image/video bytes). Annotated outputs are files in `backend/outputs/`.
  They are deleted when you delete the history entry, and automatically at server start once older than
  `OUTPUT_RETENTION_DAYS` (default 30; 0 = keep forever). The history row remains with its statistics.
  Live camera frames are processed in memory and never stored.

## 7. Tests

```bat
cd backend
venv\Scripts\activate
pytest -v
```

* `tests/test_units.py` - filename sanitizing, size limits, path-traversal guard, summaries, drawing.
* `tests/test_api.py` - all endpoints through FastAPI's TestClient: validation errors, image flow, history, delete,
  analytics from DB, traversal attempts, settings, frame endpoint, full video job (create video -> process -> download, Range request).
  **These API tests replace the model with a deterministic stub** so they are fast and need no weights; they test the
  application logic, not YOLO accuracy.
* `tests/test_real_model.py` - loads the real model and checks output structure; skipped automatically if
  `ultralytics`/weights are unavailable.

## 8. Configuration (`backend/.env`)

| Variable | Default | Meaning |
|----------|---------|---------|
| `YOLO_MODEL_PATH` | `yolov8n.pt` | Any Ultralytics weights (e.g. `yolov8s.pt` for higher accuracy, slower) |
| `CORS_ORIGINS` | `http://localhost:5173,http://127.0.0.1:5173` | Comma separated |
| `MAX_IMAGE_MB` / `MAX_VIDEO_MB` | 10 / 100 | Upload limits (if you raise the image limit also raise `MAX_IMAGE_MB` in `ImageDetection.jsx`; video: `VideoDetection.jsx`) |
| `MAX_VIDEO_FRAMES` | 5400 | Longest video accepted |
| `OUTPUT_RETENTION_DAYS` | 30 | See retention policy |
| `LOAD_MODEL_ON_STARTUP` | true | Load model in background at start |

GPU: if a CUDA-enabled PyTorch is installed the model uses it automatically (status shows `CUDA`), otherwise CPU.
For NVIDIA GPUs install the CUDA build of torch from https://pytorch.org/get-started/locally/ after step 2. A GPU is not required.

## 9. Troubleshooting

| Problem | Fix |
|---------|-----|
| Top bar says **Backend offline** | Start uvicorn; check `VITE_API_URL` in `frontend/.env`; restart `npm run dev` after editing it. |
| **Model error** / 503 | Open Settings -> Model status for the message. Usually no internet on first run (weights download) - connect and press *Reload model*, or download `yolov8n.pt` manually into the `backend` folder. |
| `pip install` fails on torch | Use Python 3.10-3.12 (64-bit), upgrade pip, retry. |
| First detection is slow | The model warms up on start; wait for "yolov8n.pt - CPU" in the top bar. |
| Camera button says permission denied | Click the camera icon in the address bar and allow; use `http://localhost:5173` (not a LAN IP) or HTTPS. |
| Camera "in use" | Close other apps (Zoom, Teams, Camera app). |
| Video won't preview in the upload box | Browser can't decode AVI/MKV; it can still be processed. |
| Video processing is slow | Raise "Analyse every Nth frame" or use a shorter clip; CPU inference is ~20-80 ms/frame for yolov8n. |
| CORS error in browser console | Add your frontend URL to `CORS_ORIGINS` and restart the backend. |
| `Port 8000 already in use` | `uvicorn app.main:app --reload --port 8001` and set `VITE_API_URL` accordingly. |

## 10. Licensing note

Ultralytics YOLOv8 code and pretrained weights are released under **AGPL-3.0** (a commercial Enterprise license is available from
Ultralytics). That is fine for a university/learning project; if you deploy it as a public service or product, review the license.
This project's own code has no additional restrictions.
