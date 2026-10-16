import { Clock, Gauge, Layers, ScanSearch } from 'lucide-react';
import { ms, pct } from '../utils/format.js';

function Chip({ icon: Icon, label, value }) {
  return (
    <div className="rounded-xl border border-navy-600/60 bg-navy-900/60 p-3">
      <div className="mb-1 flex items-center gap-1.5 text-xs text-slate-400">
        <Icon className="h-3.5 w-3.5 text-brand-400" /> {label}
      </div>
      <p className="truncate text-lg font-bold text-white">{value}</p>
    </div>
  );
}

/** Summary + class counts (+ per-object table when `detections` is given). */
export default function DetectionResults({ result, showTable = true, extraChips = [] }) {
  const classes = Object.entries(result.class_counts || {});
  const dets = result.detections || [];
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Chip icon={ScanSearch} label="Objects detected" value={result.total_objects} />
        <Chip icon={Gauge} label="Avg. confidence" value={result.total_objects ? pct(result.avg_confidence) : '-'} />
        <Chip icon={Clock} label={result.detection_type === 'video' ? 'Processing time' : 'Inference time'} value={ms(result.inference_time_ms)} />
        <Chip icon={Layers} label="Classes found" value={classes.length} />
        {extraChips.map((c) => (
          <Chip key={c.label} icon={c.icon} label={c.label} value={c.value} />
        ))}
      </div>

      {result.total_objects === 0 ? (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-200">
          No objects were detected above a confidence of {pct(result.confidence_threshold, 0)}. Try lowering the
          confidence threshold or use a clearer input containing common objects (people, vehicles, animals, furniture...).
        </div>
      ) : (
        <>
          <div>
            <h3 className="mb-2 text-sm font-semibold text-white">Detected classes</h3>
            <div className="flex flex-wrap gap-2">
              {classes.map(([name, count]) => (
                <span key={name} className="badge border-brand-500/40 bg-brand-500/10 text-blue-200">
                  <span className="capitalize">{name}</span>
                  <span className="rounded bg-brand-500/30 px-1.5 text-white">{count}</span>
                </span>
              ))}
            </div>
          </div>

          {showTable && dets.length > 0 && (
            <div>
              <h3 className="mb-2 text-sm font-semibold text-white">
                Detections <span className="font-normal text-slate-500">(bbox = [x1, y1, x2, y2] in original image pixels)</span>
              </h3>
              <div className="max-h-72 overflow-auto rounded-xl border border-navy-600/60">
                <table className="w-full min-w-[480px] text-left text-sm">
                  <thead className="sticky top-0 bg-navy-800 text-xs uppercase text-slate-400">
                    <tr>
                      <th className="px-3 py-2">#</th>
                      <th className="px-3 py-2">Class</th>
                      <th className="px-3 py-2">Confidence</th>
                      <th className="px-3 py-2">Bounding box</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-navy-600/40">
                    {dets.map((d, i) => (
                      <tr key={i} className="hover:bg-navy-700/40">
                        <td className="px-3 py-2 text-slate-500">{i + 1}</td>
                        <td className="px-3 py-2 font-medium capitalize text-white">{d.class_name}</td>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 w-20 overflow-hidden rounded-full bg-navy-600">
                              <div className="h-full rounded-full bg-brand-500" style={{ width: `${d.confidence * 100}%` }} />
                            </div>
                            <span className="tabular-nums">{pct(d.confidence)}</span>
                          </div>
                        </td>
                        <td className="px-3 py-2 font-mono text-xs text-slate-400">[{d.bbox.map((v) => Math.round(v)).join(', ')}]</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
