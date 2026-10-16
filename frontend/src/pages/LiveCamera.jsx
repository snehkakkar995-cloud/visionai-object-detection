import { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, CameraOff, Play, Square } from 'lucide-react';
import SliderField from '../components/SliderField.jsx';
import ErrorMessage from '../components/ErrorMessage.jsx';
import { useSettings } from '../hooks/useSettings.jsx';
import { detectFrame, errorMessage } from '../services/api.js';
import { pct } from '../utils/format.js';

const COLORS = ['#3b82f6', '#22d3ee', '#a78bfa', '#34d399', '#fbbf24', '#f472b6', '#fb7185', '#60a5fa'];

function cameraError(e) {
  switch (e?.name) {
    case 'NotAllowedError':
    case 'SecurityError':
      return 'Camera permission was denied. Click the camera icon in your browser address bar, allow access, then press Start Camera again.';
    case 'NotFoundError':
    case 'OverconstrainedError':
      return 'No camera was found on this device.';
    case 'NotReadableError':
      return 'The camera is in use by another application. Close it and try again.';
    default:
      return `Could not start the camera: ${e?.message || e}`;
  }
}

export default function LiveCamera() {
  const { settings } = useSettings();
  const videoRef = useRef(null);
  const overlayRef = useRef(null);
  const captureRef = useRef(null);
  const streamRef = useRef(null);
  const loop = useRef({ active: false, timer: null, failures: 0, done: [] });

  const [cameraOn, setCameraOn] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const [error, setError] = useState(null);
  const [conf, setConf] = useState(0.4);
  const [live, setLive] = useState({ detections: [], fps: 0, ms: 0 });

  // always read the latest values inside the loop without restarting it
  const cfg = useRef({});
  cfg.current = {
    conf,
    iou: settings.default_iou,
    interval: settings.live_interval_ms,
    maxWidth: settings.live_max_width,
  };

  const clearOverlay = () => {
    const c = overlayRef.current;
    if (c) c.getContext('2d').clearRect(0, 0, c.width, c.height);
  };

  const draw = (res) => {
    const v = videoRef.current;
    const c = overlayRef.current;
    if (!v || !c) return;
    c.width = v.videoWidth;
    c.height = v.videoHeight;
    const ctx = c.getContext('2d');
    ctx.clearRect(0, 0, c.width, c.height);
    const sx = v.videoWidth / res.frame_width;
    const sy = v.videoHeight / res.frame_height;
    const lw = Math.max(2, v.videoWidth / 320);
    const fs = Math.max(12, Math.round(v.videoWidth / 48));
    ctx.font = `600 ${fs}px Inter, system-ui, sans-serif`;
    ctx.textBaseline = 'top';
    res.detections.forEach((d) => {
      const [x1, y1, x2, y2] = [d.bbox[0] * sx, d.bbox[1] * sy, d.bbox[2] * sx, d.bbox[3] * sy];
      const color = COLORS[d.class_id % COLORS.length];
      ctx.lineWidth = lw;
      ctx.strokeStyle = color;
      ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);
      const label = `${d.class_name} ${Math.round(d.confidence * 100)}%`;
      const tw = ctx.measureText(label).width + 10;
      const th = fs + 6;
      const ty = y1 - th >= 0 ? y1 - th : y1;
      ctx.fillStyle = color;
      ctx.fillRect(x1, ty, tw, th);
      ctx.fillStyle = '#0a1226';
      ctx.fillText(label, x1 + 5, ty + 3);
    });
  };

  const stopDetection = useCallback(() => {
    const st = loop.current;
    st.active = false;
    clearTimeout(st.timer);
    st.done = [];
    setDetecting(false);
    clearOverlay();
    setLive({ detections: [], fps: 0, ms: 0 });
  }, []);

  const stopCamera = useCallback(() => {
    stopDetection();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraOn(false);
  }, [stopDetection]);

  // release the camera when leaving the page
  useEffect(() => () => {
    loop.current.active = false;
    clearTimeout(loop.current.timer);
    streamRef.current?.getTracks().forEach((t) => t.stop());
  }, []);

  const startCamera = async () => {
    setError(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      return setError('Camera access is not available. Open this site on http://localhost or over HTTPS in a modern browser.');
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
        audio: false,
      });
      streamRef.current = stream;
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      setCameraOn(true);
    } catch (e) {
      setError(cameraError(e));
    }
  };

  const tick = async () => {
    const st = loop.current;
    if (!st.active) return;
    const started = performance.now();
    const v = videoRef.current;
    if (v && v.videoWidth > 0 && v.readyState >= 2) {
      try {
        const scale = Math.min(1, cfg.current.maxWidth / v.videoWidth);
        const w = Math.round(v.videoWidth * scale);
        const h = Math.round(v.videoHeight * scale);
        const cap = captureRef.current;
        cap.width = w;
        cap.height = h;
        cap.getContext('2d').drawImage(v, 0, 0, w, h);
        const blob = await new Promise((r) => cap.toBlob(r, 'image/jpeg', 0.7));
        const res = await detectFrame(blob, { confidence: cfg.current.conf, iou: cfg.current.iou });
        if (!st.active) return;
        st.failures = 0;
        draw(res);
        const now = performance.now();
        st.done = [...st.done.slice(-9), now];
        const span = st.done.length > 1 ? (st.done[st.done.length - 1] - st.done[0]) / 1000 : 0;
        setLive({
          detections: res.detections,
          fps: span > 0 ? (st.done.length - 1) / span : 0,
          ms: res.inference_time_ms,
        });
      } catch (e) {
        if (!st.active) return;
        st.failures += 1;
        if (st.failures >= 3) {
          setError(errorMessage(e));
          stopDetection();
          return;
        }
      }
    }
    if (st.active) {
      // only one frame is ever in flight; wait at least `interval` between frame starts
      st.timer = setTimeout(tick, Math.max(0, cfg.current.interval - (performance.now() - started)));
    }
  };

  const startDetection = () => {
    if (!cameraOn || loop.current.active) return;
    setError(null);
    loop.current = { active: true, timer: null, failures: 0, done: [] };
    setDetecting(true);
    tick();
  };

  const counts = live.detections.reduce((acc, d) => ({ ...acc, [d.class_name]: (acc[d.class_name] || 0) + 1 }), {});

  return (
    <div className="space-y-6">
      <div>
        <h1 className="h-page">Live Camera Detection</h1>
        <p className="muted mt-1">
          Frames from your webcam are sent to the YOLO backend one at a time (never more than one in flight) and the real predictions are drawn on top.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="card-pad space-y-4 lg:col-span-2">
          <div className="relative overflow-hidden rounded-xl border border-navy-600/60 bg-black">
            <video ref={videoRef} playsInline muted className={`h-auto w-full ${cameraOn ? 'block' : 'hidden'}`} />
            <canvas ref={overlayRef} className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true" />
            {!cameraOn && (
              <div className="flex aspect-video flex-col items-center justify-center gap-3 text-slate-500">
                <CameraOff className="h-12 w-12" />
                <p className="text-sm">Camera is off</p>
              </div>
            )}
            {detecting && (
              <span className="absolute left-3 top-3 flex items-center gap-2 rounded-full bg-black/60 px-3 py-1 text-xs font-semibold text-red-300">
                <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" /> LIVE
              </span>
            )}
          </div>
          <canvas ref={captureRef} className="hidden" aria-hidden="true" />
          <ErrorMessage message={error} />
          <div className="flex flex-wrap gap-3">
            {!cameraOn ? (
              <button className="btn-primary" onClick={startCamera}>
                <Camera className="h-4 w-4" /> Start Camera
              </button>
            ) : (
              <button className="btn-danger" onClick={stopCamera}>
                <CameraOff className="h-4 w-4" /> Stop Camera
              </button>
            )}
            {!detecting ? (
              <button className="btn-secondary" onClick={startDetection} disabled={!cameraOn}>
                <Play className="h-4 w-4" /> Start Detection
              </button>
            ) : (
              <button className="btn-secondary" onClick={stopDetection}>
                <Square className="h-4 w-4" /> Stop Detection
              </button>
            )}
          </div>
        </section>

        <aside className="space-y-6">
          <div className="card-pad space-y-4">
            <h2 className="text-base font-semibold text-white">Live stats</h2>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="rounded-xl bg-navy-900/60 p-3">
                <p className="text-2xl font-bold text-white">{live.detections.length}</p>
                <p className="text-xs text-slate-400">Objects</p>
              </div>
              <div className="rounded-xl bg-navy-900/60 p-3">
                <p className="text-2xl font-bold text-white">{live.fps.toFixed(1)}</p>
                <p className="text-xs text-slate-400">Detect FPS</p>
              </div>
              <div className="rounded-xl bg-navy-900/60 p-3">
                <p className="text-2xl font-bold text-white">{Math.round(live.ms)}</p>
                <p className="text-xs text-slate-400">ms / frame</p>
              </div>
            </div>
            <SliderField label="Confidence threshold" value={conf} onChange={setConf} min={0.1} max={0.9} step={0.05} format={(v) => pct(v, 0)} />
            <p className="text-xs text-slate-500">
              Capture interval and frame width are in Settings. FPS is the real rate of completed detections.
            </p>
          </div>

          <div className="card-pad">
            <h2 className="mb-3 text-base font-semibold text-white">Current detections</h2>
            {live.detections.length === 0 ? (
              <p className="muted">{detecting ? 'Nothing detected in the current frame.' : 'Start detection to see results.'}</p>
            ) : (
              <>
                <div className="mb-3 flex flex-wrap gap-2">
                  {Object.entries(counts).map(([name, n]) => (
                    <span key={name} className="badge border-brand-500/40 bg-brand-500/10 capitalize text-blue-200">
                      {name} <span className="rounded bg-brand-500/30 px-1.5 text-white">{n}</span>
                    </span>
                  ))}
                </div>
                <ul className="max-h-48 space-y-1 overflow-auto text-sm">
                  {live.detections.map((d, i) => (
                    <li key={i} className="flex justify-between rounded-lg bg-navy-900/60 px-3 py-1.5">
                      <span className="capitalize text-white">{d.class_name}</span>
                      <span className="tabular-nums text-slate-400">{pct(d.confidence)}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
