import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, RotateCcw, ScanSearch } from 'lucide-react';
import ImageUploader from '../components/ImageUploader.jsx';
import SliderField from '../components/SliderField.jsx';
import DetectionResults from '../components/DetectionResults.jsx';
import BoundingBoxImage from '../components/BoundingBoxImage.jsx';
import ErrorMessage from '../components/ErrorMessage.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useSettings } from '../hooks/useSettings.jsx';
import { detectImage, errorMessage, fileUrl } from '../services/api.js';
import { bytes, extOf, pct } from '../utils/format.js';

const TYPES = ['jpg', 'jpeg', 'png', 'webp'];
const MAX_MB = 10;

export default function ImageDetection() {
  const toast = useToast();
  const { settings, loaded } = useSettings();
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [conf, setConf] = useState(settings.default_confidence);
  const [iou, setIou] = useState(settings.default_iou);
  const [loading, setLoading] = useState(false);
  const [uploadPct, setUploadPct] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const touched = useRef(false);

  // use saved defaults once they arrive, unless the user already moved the sliders
  useEffect(() => {
    if (loaded && !touched.current) {
      setConf(settings.default_confidence);
      setIou(settings.default_iou);
    }
  }, [loaded, settings.default_confidence, settings.default_iou]);

  useEffect(() => () => preview && URL.revokeObjectURL(preview), [preview]);

  const onFile = (f) => {
    setError(null);
    setResult(null);
    const ext = extOf(f.name);
    if (!TYPES.includes(ext)) {
      setFile(null);
      setPreview(null);
      return setError(`Unsupported file type ".${ext || '?'}". Please upload a JPG, JPEG, PNG or WEBP image.`);
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
    setError(null);
  };

  const run = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    setUploadPct(0);
    try {
      const data = await detectImage(file, { confidence: conf, iou }, (e) =>
        e.total && setUploadPct(Math.round((e.loaded / e.total) * 100))
      );
      setResult(data);
      toast.success(
        data.total_objects
          ? `Detected ${data.total_objects} object${data.total_objects === 1 ? '' : 's'}.`
          : 'Detection finished - no objects found.'
      );
    } catch (e) {
      const msg = errorMessage(e);
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="h-page">Image Detection</h1>
        <p className="muted mt-1">Upload an image and run real YOLO inference on the server.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="card-pad space-y-4 lg:col-span-2">
          {!file ? (
            <ImageUploader
              accept={TYPES}
              acceptLabel="JPG, JPEG, PNG or WEBP"
              hint={`Max ${MAX_MB} MB`}
              onFile={onFile}
              disabled={loading}
            />
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <p className="truncate text-sm text-slate-300">
                  <span className="font-medium text-white">{file.name}</span> &middot; {bytes(file.size)}
                </p>
                <button className="btn-ghost !py-1.5" onClick={reset} disabled={loading}>
                  <RotateCcw className="h-4 w-4" /> Change
                </button>
              </div>
              <div className="flex max-h-[26rem] items-center justify-center overflow-hidden rounded-xl border border-navy-600/60 bg-black/30">
                <img src={preview} alt="Selected upload preview" className="max-h-[26rem] w-full object-contain" />
              </div>
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
            hint="Lower finds more objects (and more false positives)."
            disabled={loading}
          />
          <SliderField
            label="IoU threshold (optional)"
            value={iou}
            onChange={(v) => {
              touched.current = true;
              setIou(v);
            }}
            min={0.1}
            max={0.9}
            step={0.05}
            format={(v) => pct(v, 0)}
            hint="Overlap above which duplicate boxes are merged (NMS)."
            disabled={loading}
          />
          <button className="btn-primary w-full" onClick={run} disabled={!file || loading}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {uploadPct < 100 ? `Uploading ${uploadPct}%` : 'Running YOLO...'}
              </>
            ) : (
              <>
                <ScanSearch className="h-4 w-4" /> Detect Objects
              </>
            )}
          </button>
          {loading && (
            <div className="h-1.5 overflow-hidden rounded-full bg-navy-600">
              <div className="h-full animate-pulse rounded-full bg-brand-500 transition-all" style={{ width: `${Math.max(uploadPct, 15)}%` }} />
            </div>
          )}
        </aside>
      </div>

      {result && (
        <section className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
            <BoundingBoxImage src={preview} alt="Original image" label="Original" />
            <BoundingBoxImage
              src={fileUrl(result.output_url)}
              alt="Annotated image with bounding boxes"
              label="Annotated result"
              downloadHref={fileUrl(result.output_url, true)}
            />
          </div>
          <div className="card-pad">
            <h2 className="mb-4 text-base font-semibold text-white">Results</h2>
            <DetectionResults result={result} />
            <p className="mt-4 text-xs text-slate-500">
              Saved to <Link to="/history" className="text-brand-400 hover:underline">Detection History</Link> &middot; image{' '}
              {result.image_width}&times;{result.image_height}px
            </p>
          </div>
        </section>
      )}
    </div>
  );
}
