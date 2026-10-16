import { useEffect, useState } from 'react';
import { Cpu, RotateCw, Save, Trash2 } from 'lucide-react';
import SliderField from '../components/SliderField.jsx';
import ModelBadge from '../components/ModelBadge.jsx';
import ErrorMessage from '../components/ErrorMessage.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { DEFAULT_SETTINGS, useSettings } from '../hooks/useSettings.jsx';
import useModelStatus from '../hooks/useModelStatus.js';
import { clearHistory, errorMessage, getLimits, reloadModel } from '../services/api.js';
import useAsync from '../hooks/useAsync.js';
import { pct } from '../utils/format.js';

export default function Settings() {
  const toast = useToast();
  const { settings, save } = useSettings();
  const { status, offline, refresh } = useModelStatus();
  const { data: limits } = useAsync(() => getLimits().catch(() => null), []);
  const [form, setForm] = useState(settings);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => setForm(settings), [settings]);
  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));

  const onSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await save(form);
      toast.success('Settings saved.');
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const onReload = async () => {
    try {
      await reloadModel();
      await refresh();
      toast.info('Reloading the model...');
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  const onClear = async () => {
    if (!window.confirm('Delete ALL detection history and saved outputs? This cannot be undone.')) return;
    try {
      const r = await clearHistory();
      toast.success(`Deleted ${r.deleted} record${r.deleted === 1 ? '' : 's'}.`);
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="h-page">Settings</h1>
        <p className="muted mt-1">Saved in the backend database and used as defaults across the app.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card-pad space-y-5">
          <h2 className="text-base font-semibold text-white">Detection defaults</h2>
          <SliderField label="Default confidence threshold" value={form.default_confidence} onChange={set('default_confidence')} min={0.05} max={0.95} step={0.05} format={(v) => pct(v, 0)} />
          <SliderField label="Default IoU threshold" value={form.default_iou} onChange={set('default_iou')} min={0.1} max={0.9} step={0.05} format={(v) => pct(v, 0)} />
          <SliderField label="Video: analyse every Nth frame" value={form.video_frame_stride} onChange={set('video_frame_stride')} min={1} max={10} step={1} format={(v) => (v === 1 ? 'every frame' : `1 of ${v}`)} />
          <h2 className="pt-2 text-base font-semibold text-white">Live camera</h2>
          <SliderField label="Minimum time between frames" value={form.live_interval_ms} onChange={set('live_interval_ms')} min={50} max={1000} step={50} format={(v) => `${v} ms`} hint="Larger values reduce load on the server." />
          <SliderField label="Frame width sent to the server" value={form.live_max_width} onChange={set('live_max_width')} min={320} max={1280} step={160} format={(v) => `${v}px`} hint="Smaller frames are faster; boxes are scaled back automatically." />
          <ErrorMessage message={error} />
          <div className="flex flex-wrap gap-3">
            <button className="btn-primary" onClick={onSave} disabled={saving}>
              <Save className="h-4 w-4" /> {saving ? 'Saving...' : 'Save settings'}
            </button>
            <button className="btn-secondary" onClick={() => setForm(DEFAULT_SETTINGS)}>
              Reset to defaults
            </button>
          </div>
        </section>

        <div className="space-y-6">
          <section className="card-pad space-y-4">
            <h2 className="flex items-center gap-2 text-base font-semibold text-white">
              <Cpu className="h-5 w-5 text-brand-400" /> Model status
            </h2>
            <ModelBadge status={status} offline={offline} />
            {status?.state === 'ready' && (
              <dl className="grid grid-cols-2 gap-3 text-sm">
                <div><dt className="text-slate-500">Weights</dt><dd className="text-white">{status.model_name}</dd></div>
                <div><dt className="text-slate-500">Device</dt><dd className="text-white uppercase">{status.device}</dd></div>
                <div><dt className="text-slate-500">Classes</dt><dd className="text-white">{status.num_classes}</dd></div>
                <div><dt className="text-slate-500">Load time</dt><dd className="text-white">{status.load_seconds}s</dd></div>
              </dl>
            )}
            {status?.state === 'error' && <ErrorMessage message={status.error} />}
            {offline && <ErrorMessage message={status?.error} />}
            <button className="btn-secondary" onClick={onReload} disabled={status?.state === 'loading'}>
              <RotateCw className="h-4 w-4" /> Reload model
            </button>
          </section>

          {limits && (
            <section className="card-pad space-y-2 text-sm">
              <h2 className="text-base font-semibold text-white">Server limits</h2>
              <p className="text-slate-400">Images: up to {limits.max_image_mb} MB ({limits.allowed_image_types.join(', ')})</p>
              <p className="text-slate-400">Videos: up to {limits.max_video_mb} MB ({limits.allowed_video_types.join(', ')})</p>
              <p className="text-xs text-slate-500">Change these in backend/.env.</p>
            </section>
          )}

          <section className="card-pad space-y-3">
            <h2 className="text-base font-semibold text-white">Data</h2>
            <p className="muted">Remove every saved detection and its annotated image/video from the server.</p>
            <button className="btn-danger" onClick={onClear}>
              <Trash2 className="h-4 w-4" /> Clear all history
            </button>
          </section>
        </div>
      </div>
    </div>
  );
}
