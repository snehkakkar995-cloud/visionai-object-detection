import { useEffect, useRef, useState } from 'react';
import { Download, Film, Loader2, RotateCcw, ScanSearch, Timer, Video } from 'lucide-react';
import ImageUploader from '../components/ImageUploader.jsx';
import SliderField from '../components/SliderField.jsx';
import DetectionResults from '../components/DetectionResults.jsx';
import ErrorMessage from '../components/ErrorMessage.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useSettings } from '../hooks/useSettings.jsx';
import { errorMessage, fileUrl, getVideoJob, startVideo } from '../services/api.js';
import { bytes, extOf, ms, pct } from '../utils/format.js';

const TYPES = ['mp4', 'avi', 'mov', 'mkv', 'webm', 'm4v'];
const MAX_MB = 100;

export default function VideoDetection() {
  const toast = useToast();
  const { settings, loaded } = useSettings();
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [conf, setConf] = useState(settings.default_confidence);
  const [iou, setIou] = useState(settings.default_iou);
  const [stride, setStride] = useState(settings.video_frame_stride);
  const [phase, setPhase] = useState('idle'); // idle | uploading | processing | done
  const [uploadPct, setUploadPct] = useState(0);
  const [job, setJob] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const touched = useRef(false);
  const alive = useRef(true);

  useEffect(() => {
    if (loaded && !touched.current) {
      setConf(settings.default_confidence);
      setIou(settings.default_iou);
      setStride(settings.video_frame_stride);
    }
  }, [loaded, settings]);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  useEffect(() => () => preview && URL.revokeObjectURL(preview), [preview]);

  const busy = phase === 'uploading' || phase === 'processing';

  const onFile = (f) => {
    setError(null);
    setResult(null);
    setPhase('idle');
    const ext = extOf(f.name);
    if (!TYPES.includes(ext)) {
      setFile(null);
      setPreview(null);
      return setError(`Unsupported file type ".${ext || '?'}". Allowed: ${TYPES.join(', ').toUpperCase()}.`);
    }
    if (f.size > MAX_MB * 1024 * 1024) {
      setFile(null);
      setPreview(null);
      return setError(`The file is ${bytes(f.size)}. The maximum allowed size is ${MAX_MB} MB.`);
    }
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const reset = () => {
    setFile(null);
    setPreview(null);
    setResult(null);
    setJob(null);
    setError(null);
    setPhase('idle');
  };

  const run = async () => {
    if (!file) return;
    setError(null);
    setResult(null);
    setJob(null);
    setPhase('uploading');
    setUploadPct(0);
    try {
      let status = await startVideo(file, { confidence: conf, iou, frame_stride: stride }, (e) =>
        e.total && setUploadPct(Math.round((e.loaded / e.total) * 100))
      );
      if (!alive.current) return;
      setJob(status);
      setPhase('processing');
      // poll until the backend has really finished
      while (alive.current && status.status !== 'completed' && status.status !== 'failed') {
        await new Promise((r) => setTimeout(r, 1000));
        if (!alive.current) return;
        status = await getVideoJob(status.job_id);
        setJob(status);
      }
      if (!alive.current) return;
      if (status.status === 'failed') throw new Error(status.error || 'Video processing failed.');
      setResult(status.result);
      setPhase('done');
      toast.success('Video processed successfully.');
    } catch (e) {
      if (!alive.current) return;
      const msg = e?.response || e?.request ? errorMessage(e) : e.message;
      setError(msg);
      setPhase('idle');
      toast.error(msg);
    }
  };

  const pctDone = job ? Math.round((job.progress || 0) * 100) : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="h-page">Video Detection</h1>
        <p className="muted mt-1">
          Every frame is analysed with YOLO on the server and re-encoded as an annotated MP4.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="card-pad space-y-4 lg:col-span-2">
          {!file ? (
            <ImageUploader
              icon={Film}
              accept={TYPES}
              acceptLabel="MP4, AVI, MOV, MKV, WEBM or M4V"
              hint={`Max ${MAX_MB} MB`}
              onFile={onFile}
              disabled={busy}
            />
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <p className="truncate text-sm text-slate-300">
                  <span className="font-medium text-white">{file.name}</span> &middot; {bytes(file.size)}
                </p>
                <button className="btn-ghost !py-1.5" onClick={reset} disabled={busy}>
                  <RotateCcw className="h-4 w-4" /> Change
                </button>
              </div>
              <video src={preview} controls className="max-h-[26rem] w-full rounded-xl border border-navy-600/60 bg-black" />
              <p className="text-xs text-slate-500">
                Preview of your upload. Some formats (AVI/MKV) may not preview in the browser but can still be processed.
              </p>
            </div>
          )}
          {error && <ErrorMessage message={error} />}
        </section>

        <aside className="card-pad space-y-5">
          <h2 className="text-base font-semibold text-white">Detection settings</h2>
          <SliderField
            label="Confidence threshold"
            value={conf}
            onChange={(v) => {
              touched.current = true;
              setConf(v);
            }}
            min={0.05}
            max={0.95}
            step={0.05}
            format={(v) => pct(v, 0)}
            disabled={busy}
          />
          <SliderField
            label="IoU threshold"
            value={iou}
            onChange={(v) => {
              touched.current = true;
              setIou(v);
            }}
            min={0.1}
            max={0.9}
            step={0.05}
            format={(v) => pct(v, 0)}
            disabled={busy}
          />
          <SliderField
            label="Analyse every Nth frame"
            value={stride}
            onChange={(v) => {
              touched.current = true;
              setStride(v);
            }}
            min={1}
            max={10}
            step={1}
            format={(v) => (v === 1 ? 'every frame' : `1 of ${v}`)}
            hint="Higher is faster on CPU. Skipped frames reuse the previous boxes for display only."
            disabled={busy}
          />
          <button className="btn-primary w-full" onClick={run} disabled={!file || busy}>
            {busy ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {phase === 'uploading' ? `Uploading ${uploadPct}%` : 'Processing...'}
              </>
            ) : (
              <>
                <ScanSearch className="h-4 w-4" /> Process Video
              </>
            )}
          </button>
        </aside>
      </div>

      {phase === 'processing' && job && (
        <section className="card-pad space-y-3" aria-live="polite">
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2 font-medium text-white">
              <Loader2 className="h-4 w-4 animate-spin text-brand-400" />
              {job.status === 'queued' ? 'Waiting for another video to finish...' : 'Detecting objects frame by frame...'}
            </span>
            <span className="tabular-nums text-slate-300">{pctDone}%</span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-navy-600">
            <div className="h-full rounded-full bg-gradient-to-r from-brand-600 to-brand-cyan transition-all duration-500" style={{ width: `${pctDone}%` }} />
          </div>
          <p className="text-xs text-slate-500">
            Frame {job.frames_done} of {job.total_frames || '?'} &middot; the result appears only after the server has finished.
          </p>
        </section>
      )}

      {result && phase === 'done' && (
        <section className="space-y-5">
          <div className="card-pad space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="flex items-center gap-2 text-base font-semibold text-white">
                <Video className="h-5 w-5 text-brand-400" /> Annotated video
              </h2>
              <a href={fileUrl(result.output_url, true)} download className="btn-primary">
                <Download className="h-4 w-4" /> Download video
              </a>
            </div>
            <video src={fileUrl(result.output_url)} controls className="max-h-[30rem] w-full rounded-xl border border-navy-600/60 bg-black" />
            {result.meta?.browser_playable === false && (
              <p className="text-xs text-amber-300">
                The server could not re-encode this video to H.264, so it may not play in your browser. Download it and open it with VLC.
              </p>
            )}
          </div>
          <div className="card-pad">
            <h2 className="mb-4 text-base font-semibold text-white">Results</h2>
            <DetectionResults
              result={result}
              showTable={false}
              extraChips={[
                { icon: Film, label: 'Frames analysed', value: `${result.frames_processed} / ${result.meta?.frames_read ?? '-'}` },
                { icon: Timer, label: 'Duration', value: `${result.meta?.duration_seconds ?? '-'} s` },
              ]}
            />
            <p className="mt-4 text-xs text-slate-500">
              Counts are total detections across analysed frames (the same person visible in 30 frames counts 30 times). Peak objects
              in a single frame: {result.meta?.peak_objects_in_frame ?? '-'}. Model time {ms(result.meta?.inference_time_ms)}. Audio is
              not included in the output.
            </p>
          </div>
        </section>
      )}
    </div>
  );
}
