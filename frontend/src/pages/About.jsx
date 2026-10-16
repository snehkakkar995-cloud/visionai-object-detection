import { Link } from 'react-router-dom';
import { Database, Layers, Server, ShieldCheck } from 'lucide-react';
import useModelStatus from '../hooks/useModelStatus.js';

const STACK = [
  ['React 18 + Vite', 'Single-page frontend with React Router'],
  ['Tailwind CSS', 'Responsive dark navy design system'],
  ['Axios', 'API client'],
  ['Recharts', 'Analytics charts'],
  ['FastAPI + Uvicorn', 'Python REST backend with Swagger docs'],
  ['Ultralytics YOLOv8', 'Pretrained COCO weights (yolov8n.pt)'],
  ['OpenCV + Pillow + NumPy', 'Image/video decoding, drawing, encoding'],
  ['SQLite + SQLAlchemy', 'History, analytics and settings'],
];

export default function About() {
  const { status } = useModelStatus();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="h-page">About Project</h1>
        <p className="muted mt-1">VisionAI - Intelligent Object Detection</p>
      </div>

      <section className="card-pad space-y-3">
        <h2 className="text-base font-semibold text-white">Overview</h2>
        <p className="text-sm leading-relaxed text-slate-300">
          VisionAI is a full-stack computer vision application. Images, videos and webcam frames are sent to a Python backend that runs a real
          YOLO (You Only Look Once) model. The backend returns class names, confidence scores and bounding boxes, draws the annotations, stores
          a summary of each session in SQLite, and the dashboard and analytics pages are built from those saved records.
        </p>
        <p className="text-sm text-slate-400">
          Current model: {status?.model_name ? `${status.model_name} (${status.num_classes} COCO classes, ${status.device.toUpperCase()})` : 'checking...'}
        </p>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card-pad">
          <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-white"><Layers className="h-5 w-5 text-brand-400" /> Technology stack</h2>
          <ul className="divide-y divide-navy-600/40">
            {STACK.map(([n, d]) => (
              <li key={n} className="flex flex-col gap-0.5 py-2.5 sm:flex-row sm:justify-between">
                <span className="text-sm font-medium text-white">{n}</span>
                <span className="text-sm text-slate-400">{d}</span>
              </li>
            ))}
          </ul>
        </section>

        <div className="space-y-6">
          <section className="card-pad space-y-2">
            <h2 className="flex items-center gap-2 text-base font-semibold text-white"><Server className="h-5 w-5 text-brand-400" /> How detection works</h2>
            <ol className="list-decimal space-y-1 pl-5 text-sm text-slate-300">
              <li>You upload an image/video or start the camera.</li>
              <li>The file is validated and sent to the FastAPI backend.</li>
              <li>The shared YOLO model runs inference (CPU, or GPU if available).</li>
              <li>Boxes and confidence scores are returned and drawn.</li>
              <li>The session is saved; you can download or delete the result.</li>
            </ol>
          </section>
          <section className="card-pad space-y-2">
            <h2 className="flex items-center gap-2 text-base font-semibold text-white"><Database className="h-5 w-5 text-brand-400" /> Data &amp; retention</h2>
            <p className="text-sm text-slate-300">
              Only metadata is stored in SQLite. Annotated outputs are files on the server, removed when you delete a history entry and
              automatically after the retention period (30 days by default). Live camera frames are never stored.
            </p>
          </section>
          <section className="card-pad space-y-2">
            <h2 className="flex items-center gap-2 text-base font-semibold text-white"><ShieldCheck className="h-5 w-5 text-brand-400" /> Limitations</h2>
            <ul className="list-disc space-y-1 pl-5 text-sm text-slate-300">
              <li>Only the 80 COCO classes of the pretrained model are detected.</li>
              <li>Accuracy depends on image quality, lighting and object size.</li>
              <li>CPU inference is slower; live FPS depends on your hardware.</li>
              <li>YOLOv8 / Ultralytics is licensed under AGPL-3.0 (see the README).</li>
            </ul>
          </section>
        </div>
      </div>

      <div className="text-center">
        <Link to="/image" className="btn-primary">Try object detection</Link>
      </div>
    </div>
  );
}
