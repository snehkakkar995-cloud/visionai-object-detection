import { Link } from 'react-router-dom';
import { Home, Menu } from 'lucide-react';
import ModelBadge from './ModelBadge.jsx';
import useModelStatus from '../hooks/useModelStatus.js';

export default function Navbar({ onMenu }) {
  const { status, offline } = useModelStatus();
  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-navy-600/60 bg-navy-950/80 px-4 backdrop-blur sm:px-6">
      <button className="btn-ghost !p-2 lg:hidden" onClick={onMenu} aria-label="Open menu">
        <Menu className="h-5 w-5" />
      </button>
      <h1 className="hidden text-sm font-semibold text-slate-300 sm:block">VisionAI - Intelligent Object Detection</h1>
      <div className="ml-auto flex items-center gap-3">
        <ModelBadge status={status} offline={offline} />
        <Link to="/" className="btn-secondary !px-3 !py-1.5">
          <Home className="h-4 w-4" />
          <span className="hidden sm:inline">Home</span>
        </Link>
      </div>
    </header>
  );
}
