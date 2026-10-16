import { Loader2 } from 'lucide-react';

export default function LoadingSpinner({ label = 'Loading...', size = 'md' }) {
  const s = size === 'lg' ? 'h-10 w-10' : size === 'sm' ? 'h-4 w-4' : 'h-6 w-6';
  return (
    <div className="flex items-center justify-center gap-3 py-6 text-slate-300" role="status">
      <Loader2 className={`${s} animate-spin text-brand-400`} />
      {label && <span className="text-sm">{label}</span>}
    </div>
  );
}
