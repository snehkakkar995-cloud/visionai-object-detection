import { useCallback, useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Download, History as HistoryIcon, ImageIcon, Trash2, Video } from 'lucide-react';
import Modal from '../components/Modal.jsx';
import DetectionResults from '../components/DetectionResults.jsx';
import ErrorMessage from '../components/ErrorMessage.jsx';
import EmptyState from '../components/EmptyState.jsx';
import LoadingSpinner from '../components/LoadingSpinner.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { deleteDetection, errorMessage, fileUrl, getDetection, getHistory } from '../services/api.js';
import { dateTime, ms, pct } from '../utils/format.js';

const PAGE = 12;
const FILTERS = [
  { id: '', label: 'All' },
  { id: 'image', label: 'Images' },
  { id: 'video', label: 'Videos' },
];

export default function History() {
  const toast = useToast();
  const [filter, setFilter] = useState('');
  const [page, setPage] = useState(0);
  const [data, setData] = useState({ items: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getHistory({ limit: PAGE, offset: page * PAGE, detection_type: filter || undefined });
      if (res.items.length === 0 && res.total > 0 && page > 0) return setPage(page - 1);
      setData(res);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [page, filter]);

  useEffect(() => {
    load();
  }, [load]);

  const open = async (id) => {
    setDetailLoading(true);
    try {
      setDetail(await getDetection(id));
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setDetailLoading(false);
    }
  };

  const remove = async (id, e) => {
    e?.stopPropagation();
    if (!window.confirm('Delete this detection and its saved output? This cannot be undone.')) return;
    try {
      await deleteDetection(id);
      toast.success('Detection deleted.');
      setDetail(null);
      load();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  const pages = Math.max(1, Math.ceil(data.total / PAGE));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="h-page">Detection History</h1>
          <p className="muted mt-1">{data.total} saved detection{data.total === 1 ? '' : 's'}</p>
        </div>
        <div className="flex gap-1 rounded-xl border border-navy-600 bg-navy-800 p-1" role="tablist" aria-label="Filter by type">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              role="tab"
              aria-selected={filter === f.id}
              onClick={() => {
                setFilter(f.id);
                setPage(0);
              }}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                filter === f.id ? 'bg-brand-500 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <ErrorMessage message={error} onRetry={load} />
      {loading && data.items.length === 0 && <LoadingSpinner label="Loading history..." />}

      {!loading && !error && data.total === 0 && (
        <div className="card">
          <EmptyState
            icon={HistoryIcon}
            title="No detections saved yet"
            text="Every successful image or video detection is saved here automatically."
            actionLabel="Detect objects in an image"
            actionTo="/image"
          />
        </div>
      )}

      {data.items.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {data.items.map((r) => (
            <div
              key={r.id}
              role="button"
              tabIndex={0}
              onClick={() => open(r.id)}
              onKeyDown={(e) => e.key === 'Enter' && open(r.id)}
              className="card group cursor-pointer overflow-hidden transition-all hover:border-brand-500/60 hover:shadow-glow"
            >
              <div className="flex h-40 items-center justify-center bg-black/30">
                {r.detection_type === 'image' && r.output_url ? (
                  <img src={fileUrl(r.output_url)} alt={`Annotated ${r.original_filename}`} loading="lazy" className="h-full w-full object-cover" />
                ) : r.detection_type === 'video' ? (
                  <Video className="h-10 w-10 text-slate-600" />
                ) : (
                  <ImageIcon className="h-10 w-10 text-slate-600" />
                )}
              </div>
              <div className="space-y-2 p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-semibold text-white">{r.original_filename}</p>
                  <button onClick={(e) => remove(r.id, e)} className="btn-ghost !p-1.5 text-slate-400 hover:text-red-300" aria-label={`Delete ${r.original_filename}`}>
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <p className="text-xs text-slate-500">{dateTime(r.created_at)}</p>
                <div className="flex flex-wrap gap-1.5">
                  <span className="badge border-navy-600 bg-navy-700 capitalize">{r.detection_type}</span>
                  <span className="badge border-brand-500/40 bg-brand-500/10 text-blue-200">{r.total_objects} objects</span>
                  {Object.keys(r.class_counts).slice(0, 2).map((c) => (
                    <span key={c} className="badge border-navy-600 capitalize text-slate-300">{c}</span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {data.total > PAGE && (
        <div className="flex items-center justify-center gap-3">
          <button className="btn-secondary" disabled={page === 0} onClick={() => setPage(page - 1)}>
            <ChevronLeft className="h-4 w-4" /> Prev
          </button>
          <span className="text-sm text-slate-400">Page {page + 1} of {pages}</span>
          <button className="btn-secondary" disabled={page + 1 >= pages} onClick={() => setPage(page + 1)}>
            Next <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}

      {detailLoading && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/50">
          <LoadingSpinner label="Loading details..." />
        </div>
      )}

      {detail && (
        <Modal title={detail.original_filename} onClose={() => setDetail(null)}>
          <div className="space-y-5">
            {detail.output_url ? (
              detail.detection_type === 'video' ? (
                <video src={fileUrl(detail.output_url)} controls className="max-h-[26rem] w-full rounded-xl bg-black" />
              ) : (
                <img src={fileUrl(detail.output_url)} alt="Annotated result" className="max-h-[26rem] w-full rounded-xl bg-black object-contain" />
              )
            ) : (
              <p className="rounded-xl border border-navy-600 bg-navy-800 p-4 text-sm text-slate-400">
                The annotated output was removed by the retention policy. Statistics are still available below.
              </p>
            )}
            <DetectionResults result={detail} />
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-navy-600/60 pt-4 text-xs text-slate-500">
              <span>
                {dateTime(detail.created_at)} &middot; confidence {pct(detail.confidence_threshold, 0)} &middot; IoU {pct(detail.iou_threshold, 0)}
                {detail.detection_type === 'video' && ` · processed in ${ms(detail.inference_time_ms)}`}
              </span>
              <div className="flex gap-2">
                {detail.output_url && (
                  <a href={fileUrl(detail.output_url, true)} download className="btn-secondary">
                    <Download className="h-4 w-4" /> Download
                  </a>
                )}
                <button className="btn-danger" onClick={() => remove(detail.id)}>
                  <Trash2 className="h-4 w-4" /> Delete
                </button>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
