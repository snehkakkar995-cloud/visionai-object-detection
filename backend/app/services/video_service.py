"""Frame-by-frame video detection with OpenCV, plus an in-memory job registry."""
import math
import shutil
import subprocess
import threading
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import Callable

import cv2

from ..config import settings
from ..utils.file_utils import remove_quietly
from .yolo_service import annotate, confidence_bin


class VideoError(Exception):
    """A video problem that is safe to show to the user."""


# ---------------------------------------------------------------------- probing
def probe_video(path: Path) -> dict:
    cap = cv2.VideoCapture(str(path))
    try:
        if not cap.isOpened():
            raise VideoError("Could not open this video. The file may be corrupted or use an unsupported codec.")
        ok, frame = cap.read()
        if not ok or frame is None:
            raise VideoError("Could not read any frames. The file may be corrupted or use an unsupported codec.")
        fps = cap.get(cv2.CAP_PROP_FPS)
        if not fps or math.isnan(fps) or fps <= 0 or fps > 240:
            fps = 25.0
        total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0)
        height, width = frame.shape[:2]
    finally:
        cap.release()
    if total > settings.max_video_frames:
        raise VideoError(
            f"Video is too long ({total} frames). The limit is {settings.max_video_frames} frames."
        )
    return {"fps": float(fps), "total_frames": max(total, 0), "width": int(width), "height": int(height)}


# ------------------------------------------------------------------- processing
def _transcode_h264(src: Path, dst: Path) -> bool:
    """Re-encode to H.264/MP4 so every browser can play it. Returns False on failure."""
    exe = None
    try:
        import imageio_ffmpeg

        exe = imageio_ffmpeg.get_ffmpeg_exe()
    except Exception:  # noqa: BLE001
        exe = shutil.which("ffmpeg")
    if not exe:
        return False
    cmd = [
        exe, "-y", "-loglevel", "error", "-i", str(src),
        "-vf", "scale=trunc(iw/2)*2:trunc(ih/2)*2",
        "-c:v", "libx264", "-preset", "veryfast", "-crf", "23",
        "-pix_fmt", "yuv420p", "-movflags", "+faststart", "-an", str(dst),
    ]
    try:
        proc = subprocess.run(cmd, capture_output=True, timeout=1800)
        return proc.returncode == 0 and dst.exists() and dst.stat().st_size > 0
    except (subprocess.SubprocessError, OSError):
        return False


def process_video(
    input_path: Path,
    output_path: Path,
    detect_fn: Callable,
    conf: float,
    iou: float,
    frame_stride: int = 1,
    progress_cb: Callable[[int, int], None] | None = None,
) -> dict:
    """Run detection on every `frame_stride`-th frame and write an annotated MP4.

    Frames that are skipped (stride > 1) are drawn with the boxes of the last analysed
    frame so the output plays smoothly; they are NOT counted as detections.
    Audio is not copied to the output.
    """
    info = probe_video(input_path)
    fps, width, height = info["fps"], info["width"], info["height"]
    total_hint = info["total_frames"]

    raw_path = output_path.with_suffix(".raw.mp4")
    cap = cv2.VideoCapture(str(input_path))
    writer = cv2.VideoWriter(str(raw_path), cv2.VideoWriter_fourcc(*"mp4v"), fps, (width, height))
    if not cap.isOpened() or not writer.isOpened():
        cap.release()
        writer.release()
        remove_quietly(raw_path)
        raise VideoError("Could not initialise video encoding on the server.")

    started = time.perf_counter()
    infer_ms = 0.0
    read = analysed = 0
    class_counts: dict[str, int] = {}
    hist = [0] * 10
    conf_sum = 0.0
    total_objects = 0
    peak = 0
    last: list[dict] = []
    try:
        while True:
            ok, frame = cap.read()
            if not ok or frame is None:
                break
            if frame.shape[1] != width or frame.shape[0] != height:
                frame = cv2.resize(frame, (width, height))
            if read % frame_stride == 0:
                t0 = time.perf_counter()
                last = detect_fn(frame, conf, iou)
                infer_ms += (time.perf_counter() - t0) * 1000
                analysed += 1
                peak = max(peak, len(last))
                for d in last:
                    total_objects += 1
                    conf_sum += d["confidence"]
                    hist[confidence_bin(d["confidence"])] += 1
                    class_counts[d["class_name"]] = class_counts.get(d["class_name"], 0) + 1
            writer.write(annotate(frame, last))
            read += 1
            if read > settings.max_video_frames:
                raise VideoError(f"Video is too long. The limit is {settings.max_video_frames} frames.")
            if progress_cb:
                progress_cb(read, max(total_hint, read))
    except BaseException:
        cap.release()
        writer.release()
        remove_quietly(raw_path)
        remove_quietly(output_path)
        raise
    cap.release()
    writer.release()

    if read == 0:
        remove_quietly(raw_path)
        raise VideoError("No frames could be decoded from this video.")

    h264 = _transcode_h264(raw_path, output_path)
    if h264:
        remove_quietly(raw_path)
    else:  # keep the OpenCV-encoded file (may not play in every browser)
        raw_path.replace(output_path)

    return {
        "frames_read": read,
        "frames_processed": analysed,
        "total_objects": total_objects,
        "class_counts": dict(sorted(class_counts.items(), key=lambda kv: -kv[1])),
        "avg_confidence": round(conf_sum / total_objects, 4) if total_objects else 0.0,
        "confidence_hist": hist,
        "peak_objects_in_frame": peak,
        "processing_time_ms": round((time.perf_counter() - started) * 1000, 1),
        "inference_time_ms": round(infer_ms, 1),
        "fps": round(fps, 2),
        "width": width,
        "height": height,
        "duration_seconds": round(read / fps, 2),
        "frame_stride": frame_stride,
        "browser_playable": h264,
    }


# --------------------------------------------------------------------- job store
@dataclass
class VideoJob:
    id: str
    filename: str
    status: str = "queued"  # queued | processing | completed | failed
    progress: float = 0.0
    frames_done: int = 0
    total_frames: int = 0
    error: str | None = None
    result_id: str | None = None
    created: float = field(default_factory=time.time)
    finished: float | None = None


_jobs: dict[str, VideoJob] = {}
_jobs_lock = threading.Lock()
# Only one video is processed at a time so a CPU-only machine is not overloaded.
video_slot = threading.Semaphore(1)


def create_job(job_id: str, filename: str, total_frames: int) -> VideoJob:
    with _jobs_lock:
        cutoff = time.time() - 3600
        for jid in [j for j, v in _jobs.items() if v.finished and v.finished < cutoff]:
            _jobs.pop(jid, None)
        job = VideoJob(id=job_id, filename=filename, total_frames=total_frames)
        _jobs[job_id] = job
        return job


def get_job(job_id: str) -> VideoJob | None:
    with _jobs_lock:
        return _jobs.get(job_id)
