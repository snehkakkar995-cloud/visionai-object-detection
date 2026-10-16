import { Cpu, Loader2, ServerOff, TriangleAlert } from 'lucide-react';

export default function ModelBadge({ status, offline }) {
  let cls = 'border-slate-600/50 text-slate-300 bg-navy-800';
  let Icon = Loader2;
  let text = 'Checking model...';
  let spin = true;
  if (offline) {
    cls = 'border-red-500/40 text-red-300 bg-red-500/10';
    Icon = ServerOff;
    text = 'Backend offline';
    spin = false;
  } else if (status?.state === 'ready') {
    cls = 'border-emerald-500/40 text-emerald-300 bg-emerald-500/10';
    Icon = Cpu;
    text = `${status.model_name} · ${status.device.toUpperCase()}`;
    spin = false;
  } else if (status?.state === 'loading' || status?.state === 'not_loaded') {
    cls = 'border-amber-500/40 text-amber-300 bg-amber-500/10';
    text = 'Loading model...';
  } else if (status?.state === 'error') {
    cls = 'border-red-500/40 text-red-300 bg-red-500/10';
    Icon = TriangleAlert;
    text = 'Model error';
    spin = false;
  }
  return (
    <span className={`badge ${cls}`} title={status?.error || undefined}>
      <Icon className={`h-3.5 w-3.5 ${spin ? 'animate-spin' : ''}`} />
      {text}
    </span>
  );
}
