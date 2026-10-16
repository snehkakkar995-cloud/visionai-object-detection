import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight, BarChart3, Camera, Cpu, Database, Download, History, ImageIcon, Menu, ScanSearch, ShieldCheck, Upload, Video, X, Zap,
} from 'lucide-react';
import Logo from '../components/Logo.jsx';

const FEATURES = [
  { icon: ImageIcon, title: 'Image detection', text: 'Upload JPG, PNG or WEBP images and get labelled boxes with confidence scores.' },
  { icon: Video, title: 'Video detection', text: 'Every frame is analysed and re-encoded as an annotated MP4 you can play and download.' },
  { icon: Camera, title: 'Live camera', text: 'Point your webcam at the world and watch real model predictions in real time.' },
  { icon: History, title: 'Detection history', text: 'Every session is saved with its results so you can review or delete it later.' },
  { icon: BarChart3, title: 'Analytics', text: 'Charts for class frequency, confidence distribution and activity, from your own data.' },
  { icon: ShieldCheck, title: 'Safe & private', text: 'Strict upload validation, size limits and safe file handling on the backend.' },
];

const STEPS = [
  { icon: Upload, title: 'Upload or capture', text: 'Upload an image, a video, or use your camera.' },
  { icon: Cpu, title: 'Backend runs YOLO', text: 'The FastAPI backend processes the input with the YOLO model.' },
  { icon: ScanSearch, title: 'Objects detected', text: 'The model finds objects and classifies each one.' },
  { icon: Zap, title: 'Boxes & scores', text: 'Bounding boxes and confidence scores are drawn and shown.' },
  { icon: Download, title: 'Save or download', text: 'Keep the result in history or download the annotated file.' },
];

const TYPES = [
  ['People', 'person'],
  ['Vehicles', 'bicycle, car, motorcycle, bus, train, truck, boat, airplane'],
  ['Animals', 'cat, dog, horse, sheep, cow, elephant, bear, zebra, giraffe, bird'],
  ['Everyday objects', 'backpack, umbrella, handbag, bottle, cup, bowl, scissors, clock'],
  ['Furniture & home', 'chair, couch, bed, dining table, toilet, potted plant, vase'],
  ['Electronics', 'tv, laptop, mouse, keyboard, cell phone, remote, microwave'],
  ['Food', 'banana, apple, sandwich, orange, pizza, donut, cake'],
  ['Sports', 'frisbee, skis, snowboard, sports ball, kite, skateboard, tennis racket'],
];

const TECH = [
  ['Frontend', 'React, Vite, Tailwind CSS, React Router, Axios, Recharts, Lucide'],
  ['Backend', 'Python, FastAPI, Uvicorn, Pydantic'],
  ['AI / Vision', 'Ultralytics YOLOv8, PyTorch, OpenCV, Pillow, NumPy'],
  ['Database', 'SQLite with SQLAlchemy'],
];

const LINKS = [
  ['#features', 'Features'],
  ['#how', 'How it works'],
  ['#types', 'Detection types'],
  ['#tech', 'Technology'],
];

export default function Home() {
  const [open, setOpen] = useState(false);
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-navy-600/50 bg-navy-950/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <Logo />
          <nav className="hidden items-center gap-6 md:flex" aria-label="Primary">
            {LINKS.map(([h, l]) => (
              <a key={h} href={h} className="text-sm text-slate-300 transition-colors hover:text-white">{l}</a>
            ))}
            <Link to="/about" className="text-sm text-slate-300 transition-colors hover:text-white">About</Link>
          </nav>
          <div className="flex items-center gap-2">
            <Link to="/dashboard" className="btn-primary hidden sm:inline-flex">Open Dashboard</Link>
            <button className="btn-ghost !p-2 md:hidden" onClick={() => setOpen(!open)} aria-label="Toggle menu" aria-expanded={open}>
              {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
        {open && (
          <nav className="flex flex-col gap-1 border-t border-navy-600/50 px-4 py-3 md:hidden" aria-label="Mobile">
            {LINKS.map(([h, l]) => (
              <a key={h} href={h} onClick={() => setOpen(false)} className="rounded-lg px-3 py-2 text-sm text-slate-300 hover:bg-navy-700">{l}</a>
            ))}
            <Link to="/about" className="rounded-lg px-3 py-2 text-sm text-slate-300 hover:bg-navy-700">About</Link>
            <Link to="/dashboard" className="btn-primary mt-2">Open Dashboard</Link>
          </nav>
        )}
      </header>

      <main>
        <section className="relative overflow-hidden">
          <div className="mx-auto max-w-7xl px-4 pb-20 pt-16 text-center sm:px-6 sm:pt-24">
            <span className="badge mb-6 border-brand-500/40 bg-brand-500/10 text-blue-200">
              <Zap className="h-3.5 w-3.5" /> Powered by YOLO real-time object detection
            </span>
            <h1 className="mx-auto max-w-4xl text-4xl font-extrabold tracking-tight text-white sm:text-6xl">
              See the World Through <span className="bg-gradient-to-r from-brand-cyan to-brand-500 bg-clip-text text-transparent">AI</span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-slate-300 sm:text-lg">
              YOLO (You Only Look Once) looks at an image a single time and finds every object in it - what it is and exactly where it is.
              VisionAI runs a real YOLO model on images, videos and your live camera and shows the boxes, labels and confidence scores.
            </p>
            <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link to="/dashboard" className="btn-primary px-6 py-3 text-base">
                Get Started <ArrowRight className="h-4 w-4" />
              </Link>
              <Link to="/image" className="btn-secondary px-6 py-3 text-base">
                <ScanSearch className="h-4 w-4" /> Try Object Detection
              </Link>
            </div>
            <div className="mx-auto mt-14 grid max-w-3xl grid-cols-3 gap-3 text-center">
              {[['80', 'COCO classes'], ['3', 'Input modes'], ['100%', 'Real inference']].map(([v, l]) => (
                <div key={l} className="card p-4">
                  <p className="text-2xl font-bold text-white sm:text-3xl">{v}</p>
                  <p className="text-xs text-slate-400 sm:text-sm">{l}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="features" className="mx-auto max-w-7xl scroll-mt-20 px-4 py-16 sm:px-6">
          <h2 className="text-center text-3xl font-bold text-white">Features</h2>
          <p className="muted mx-auto mt-2 max-w-xl text-center">Everything you need to explore object detection in one place.</p>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(({ icon: Icon, title, text }) => (
              <div key={title} className="card-pad transition-all hover:-translate-y-1 hover:border-brand-500/60 hover:shadow-glow">
                <span className="mb-4 grid h-11 w-11 place-items-center rounded-xl bg-brand-500/15 text-brand-400"><Icon className="h-5 w-5" /></span>
                <h3 className="font-semibold text-white">{title}</h3>
                <p className="muted mt-1">{text}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="how" className="scroll-mt-20 border-y border-navy-600/40 bg-navy-900/40 py-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <h2 className="text-center text-3xl font-bold text-white">How it works</h2>
            <ol className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              {STEPS.map(({ icon: Icon, title, text }, i) => (
                <li key={title} className="card-pad relative">
                  <span className="absolute right-4 top-4 text-3xl font-black text-navy-600">{i + 1}</span>
                  <span className="mb-4 grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-brand-cyan/20 to-brand-600/30 text-brand-cyan"><Icon className="h-5 w-5" /></span>
                  <h3 className="text-sm font-semibold text-white">Step {i + 1}: {title}</h3>
                  <p className="muted mt-1">{text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section id="types" className="mx-auto max-w-7xl scroll-mt-20 px-4 py-16 sm:px-6">
          <h2 className="text-center text-3xl font-bold text-white">Supported detection types</h2>
          <p className="muted mx-auto mt-2 max-w-xl text-center">The pretrained model recognises the 80 classes of the COCO dataset. Examples:</p>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {TYPES.map(([t, ex]) => (
              <div key={t} className="card p-4">
                <h3 className="font-semibold text-white">{t}</h3>
                <p className="mt-1 text-xs capitalize leading-relaxed text-slate-400">{ex}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="tech" className="scroll-mt-20 border-y border-navy-600/40 bg-navy-900/40 py-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <h2 className="text-center text-3xl font-bold text-white">Technology stack</h2>
            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {TECH.map(([t, v]) => (
                <div key={t} className="card-pad">
                  <Database className="mb-3 h-5 w-5 text-brand-400" />
                  <h3 className="font-semibold text-white">{t}</h3>
                  <p className="muted mt-1">{v}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-4xl px-4 py-16 text-center sm:px-6">
          <div className="card-pad !p-8 sm:!p-12">
            <h2 className="text-2xl font-bold text-white sm:text-3xl">Ready to detect?</h2>
            <p className="muted mx-auto mt-2 max-w-md">Upload an image and see YOLO in action in seconds.</p>
            <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
              <Link to="/image" className="btn-primary">Try Object Detection</Link>
              <Link to="/about" className="btn-secondary">Project information</Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-navy-600/50 py-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 text-sm text-slate-500 sm:flex-row sm:px-6">
          <Logo />
          <p>VisionAI - Intelligent Object Detection &middot; YOLO + FastAPI + React</p>
          <div className="flex gap-4">
            <Link to="/dashboard" className="hover:text-white">Dashboard</Link>
            <Link to="/about" className="hover:text-white">About</Link>
            <Link to="/settings" className="hover:text-white">Settings</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
