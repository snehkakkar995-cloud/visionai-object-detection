import re

from fastapi import APIRouter, Request
from fastapi.responses import FileResponse, StreamingResponse

from ..utils.file_utils import AppError, safe_output_path

router = APIRouter(prefix="/api", tags=["outputs"])
RANGE_RE = re.compile(r"^bytes=(\d*)-(\d*)$")


@router.get("/outputs/{filename}", summary="Download or stream an annotated output")
def get_output(filename: str, request: Request, download: bool = False):
    """Only server-generated file names (32 hex chars + .jpg/.mp4) are accepted."""
    path = safe_output_path(filename)
    if path is None or not path.is_file():
        raise AppError(404, "File not found.")
    media = "video/mp4" if path.suffix == ".mp4" else "image/jpeg"
    headers = {"Accept-Ranges": "bytes", "Cache-Control": "private, max-age=3600"}
    if download:
        headers["Content-Disposition"] = f'attachment; filename="visionai_{path.name}"'
    rng = request.headers.get("range")
    m = RANGE_RE.match(rng.strip()) if rng else None
    if m and (m.group(1) or m.group(2)):
        size = path.stat().st_size
        s, e = m.groups()
        if s == "":
            start, end = max(size - int(e), 0), size - 1
        else:
            start, end = int(s), (int(e) if e else size - 1)
        end = min(end, size - 1)
        if start > end or start >= size:
            raise AppError(416, "Requested range not satisfiable.")
        length = end - start + 1

        def body():
            with open(path, "rb") as fh:
                fh.seek(start)
                left = length
                while left > 0:
                    chunk = fh.read(min(1024 * 1024, left))
                    if not chunk:
                        break
                    left -= len(chunk)
                    yield chunk

        headers.update({"Content-Range": f"bytes {start}-{end}/{size}", "Content-Length": str(length)})
        return StreamingResponse(body(), status_code=206, media_type=media, headers=headers)
    return FileResponse(path, media_type=media, headers=headers)
