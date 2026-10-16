"""Upload validation and safe file handling. Pure Python (no web framework imports)."""
import os
import re
import uuid
from pathlib import Path

from ..config import settings

ALLOWED_IMAGE_EXT = {".jpg", ".jpeg", ".png", ".webp"}
ALLOWED_VIDEO_EXT = {".mp4", ".avi", ".mov", ".mkv", ".webm", ".m4v"}
OUTPUT_NAME_RE = re.compile(r"^[a-f0-9]{32}\.(jpg|mp4)$")
CHUNK = 1024 * 1024


class AppError(Exception):
    """An error with an HTTP status that is safe to show to the user."""

    def __init__(self, status_code: int, detail: str):
        super().__init__(detail)
        self.status_code = status_code
        self.detail = detail


def ensure_dirs() -> None:
    Path(settings.uploads_dir).mkdir(parents=True, exist_ok=True)
    Path(settings.outputs_dir).mkdir(parents=True, exist_ok=True)


def sanitize_filename(name: str | None, default: str = "upload") -> str:
    """Return a display-safe filename (never used to build a filesystem path)."""
    base = os.path.basename((name or "").replace("\\", "/"))
    base = re.sub(r"[^A-Za-z0-9._ -]", "_", base).strip(" .")
    return base[:120] or default


def validate_extension(filename: str | None, allowed: set[str]) -> str:
    ext = Path(sanitize_filename(filename)).suffix.lower()
    if ext not in allowed:
        shown = ", ".join(sorted(e.lstrip(".").upper() for e in allowed))
        raise AppError(415, f"Unsupported file type '{ext or 'none'}'. Allowed types: {shown}.")
    return ext


def new_id() -> str:
    return uuid.uuid4().hex


def read_limited(fileobj, max_bytes: int) -> bytes:
    """Read a whole upload into memory, refusing anything larger than max_bytes."""
    chunks, total = [], 0
    while True:
        chunk = fileobj.read(CHUNK)
        if not chunk:
            break
        total += len(chunk)
        if total > max_bytes:
            raise AppError(413, f"File is too large. Maximum size is {max_bytes // (1024 * 1024)} MB.")
        chunks.append(chunk)
    if total == 0:
        raise AppError(422, "The uploaded file is empty.")
    return b"".join(chunks)


def save_limited(fileobj, dest: Path, max_bytes: int) -> int:
    """Stream an upload to disk, refusing anything larger than max_bytes."""
    total = 0
    try:
        with open(dest, "wb") as out:
            while True:
                chunk = fileobj.read(CHUNK)
                if not chunk:
                    break
                total += len(chunk)
                if total > max_bytes:
                    raise AppError(413, f"File is too large. Maximum size is {max_bytes // (1024 * 1024)} MB.")
                out.write(chunk)
        if total == 0:
            raise AppError(422, "The uploaded file is empty.")
    except Exception:
        remove_quietly(dest)
        raise
    return total


def safe_output_path(filename: str) -> Path | None:
    """Resolve an output file name. Only server-generated names are accepted."""
    if not OUTPUT_NAME_RE.match(filename or ""):
        return None
    base = Path(settings.outputs_dir).resolve()
    path = (base / filename).resolve()
    if path.parent != base:
        return None
    return path


def remove_quietly(path: Path | str | None) -> None:
    if not path:
        return
    try:
        Path(path).unlink(missing_ok=True)
    except OSError:
        pass


def delete_output(filename: str | None) -> None:
    if filename:
        remove_quietly(safe_output_path(filename))
