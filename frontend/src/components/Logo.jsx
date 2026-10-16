import { Link } from 'react-router-dom';
import { ScanEye } from 'lucide-react';

export default function Logo({ to = '/', compact = false }) {
  return (
    <Link to={to} className="flex items-center gap-2.5 rounded-lg" aria-label="VisionAI home">
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-brand-cyan to-brand-600 shadow-glow">
        <ScanEye className="h-5 w-5 text-white" />
      </span>
      {!compact && (
        <span className="text-lg font-bold tracking-tight text-white">
          Vision<span className="text-brand-400">AI</span>
        </span>
      )}
    </Link>
  );
}
