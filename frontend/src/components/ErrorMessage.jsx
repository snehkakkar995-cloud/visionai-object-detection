import { AlertCircle, RotateCw } from 'lucide-react';

export default function ErrorMessage({ message, onRetry }) {
  if (!message) return null;
  return (
    <div role="alert" className="flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-200">
      <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
      <p className="flex-1 text-sm">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="btn-ghost !py-1 text-red-200">
          <RotateCw className="h-4 w-4" /> Retry
        </button>
      )}
    </div>
  );
}
