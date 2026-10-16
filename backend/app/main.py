import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .config import settings
from .database import SessionLocal, init_db
from .routes import analytics, health, history, image_detection, outputs, video_detection
from .services.records import cleanup_expired_outputs, clear_uploads
from .services.yolo_service import InferenceError, ModelUnavailableError, yolo_service
from .utils.file_utils import AppError, ensure_dirs

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
log = logging.getLogger("visionai")


@asynccontextmanager
async def lifespan(app: FastAPI):
    ensure_dirs()
    clear_uploads()
    init_db()
    with SessionLocal() as db:
        removed = cleanup_expired_outputs(db)
        if removed:
            log.info("Retention cleanup removed %d expired output file(s)", removed)
    if settings.load_model_on_startup:
        yolo_service.load_async()  # loads in the background; /api/model/status shows progress
    yield


app = FastAPI(
    title="VisionAI - Intelligent Object Detection API",
    description="YOLO object detection for images, videos and live camera frames.",
    version="1.0.0",
    lifespan=lifespan,
)


@app.exception_handler(AppError)
async def app_error_handler(request: Request, exc: AppError):
    return JSONResponse({"detail": exc.detail}, status_code=exc.status_code)


@app.exception_handler(ModelUnavailableError)
async def model_error_handler(request: Request, exc: ModelUnavailableError):
    return JSONResponse(
        {"detail": f"The YOLO model is not available: {exc}. See Settings > Model status."}, status_code=503
    )


@app.exception_handler(InferenceError)
async def inference_error_handler(request: Request, exc: InferenceError):
    return JSONResponse({"detail": str(exc)}, status_code=500)


@app.middleware("http")
async def limit_body_size(request: Request, call_next):
    cl = request.headers.get("content-length")
    limit = (settings.max_video_mb + 5) * 1024 * 1024
    if cl and cl.isdigit() and int(cl) > limit:
        return JSONResponse({"detail": f"Upload too large (limit {settings.max_video_mb} MB)."}, status_code=413)
    return await call_next(request)


# Added last so it is the outermost middleware (CORS headers also on error responses).
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_methods=["*"],
    allow_headers=["*"],
)

for r in (health.router, image_detection.router, video_detection.router,
          history.router, analytics.router, outputs.router):
    app.include_router(r)


@app.get("/", include_in_schema=False)
def root():
    return {"name": "VisionAI API", "docs": "/docs", "health": "/api/health"}
