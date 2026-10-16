# VisionAI backend (FastAPI + YOLO)

See the main `../README.md` for full setup, API reference and troubleshooting.

```bat
python -m venv venv
venv\Scripts\activate
python -m pip install --upgrade pip
pip install -r requirements.txt
copy .env.example .env
python check_setup.py        :: optional: verifies the real YOLO model
uvicorn app.main:app --reload
```

Swagger docs: http://localhost:8000/docs - Tests: `pytest -v`
