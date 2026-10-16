from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=BASE_DIR / ".env", extra="ignore")

    app_name: str = "VisionAI API"
    yolo_model_path: str = "yolov8n.pt"
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"
    database_url: str = f"sqlite:///{(BASE_DIR / 'visionai.db').as_posix()}"
    uploads_dir: Path = BASE_DIR / "uploads"
    outputs_dir: Path = BASE_DIR / "outputs"
    max_image_mb: int = 10
    max_video_mb: int = 100
    max_frame_kb: int = 2048
    max_video_frames: int = 5400
    max_image_pixels: int = 50_000_000
    output_retention_days: int = 30
    load_model_on_startup: bool = True
    default_confidence: float = 0.25
    default_iou: float = 0.45

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


settings = Settings()
