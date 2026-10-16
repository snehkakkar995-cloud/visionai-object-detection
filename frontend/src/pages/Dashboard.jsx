import { Link } from 'react-router-dom';
import {
  Bar, BarChart, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { Activity, ArrowRight, BarChart3, Camera, Gauge, ImageIcon, Layers, ScanSearch, Trophy, Video } from 'lucide-react';
import StatCard from '../components/StatCard.jsx';
import ErrorMessage from '../components/ErrorMessage.jsx';
import EmptyState from '../components/EmptyState.jsx';
import useAsync from '../hooks/useAsync.js';
import { getAnalytics } from '../services/api.js';
import { CHART_COLORS, dateTime, pct } from '../utils/format.js';

const ACTIONS = [
  { to: '/image', label: 'Image Detection', icon: ImageIcon, text: 'Upload a photo and detect objects' },
  { to: '/video', label: 'Video Detection', icon: Video, text: 'Annotate every frame of a video' },
  { to: '/camera', label: 'Live Camera', icon: Camera, text: 'Real-time detection from your webcam' },
  { to: '/analytics', label: 'Analytics', icon: BarChart3, text: 'Explore your detection statistics' },
];

export const tooltipStyle = {
  contentStyle: { background: '#0a1226', border: '1px solid #1f3363', borderRadius: 12, color: '#e2e8f0' },
  itemStyle: { color: '#e2e8f0' },
  cursor: { fill: 'rgba(59,130,246,0.08)' },
};

export default function Dashboard() {
  const { data, loading, error, reload } = useAsync(getAnalytics, []);
  const empty = data && data.total_sessions === 0;
  const types = data?.type_distribution?.filter((t) => t.value > 0) || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="h-page">Object Detection Dashboard</h1>
        <p className="muted mt-1">Live statistics calculated from your saved detections.</p>
      </div>

      <ErrorMessage message={error} onRetry={reload} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Activity} label="Detection sessions" value={data?.total_sessions ?? 0} loading={loading} hint="Images + videos" />
        <StatCard icon={Layers} label="Objects detected" value={data?.total_objects ?? 0} loading={loading} hint="Across all sessions" />
        <StatCard
          icon={Trophy}
          label="Most detected object"
          value={data?.most_common_object ?? 'None yet'}
          loading={loading}
          hint={data?.most_common_object ? `${data.most_common_count} detections` : 'Run a detection first'}
        />
        <StatCard
          icon={Gauge}
          label="Average confidence"
          value={data?.total_objects ? pct(data.avg_confidence) : '-'}
          loading={loading}
          hint="Weighted by objects"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {ACTIONS.map(({ to, label, icon: Icon, text }) => (
          <Link key={to} to={to} className="card group flex items-center gap-3 p-4 transition-all hover:border-brand-500/60 hover:shadow-glow">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-500/15 text-brand-400">
              <Icon className="h-5 w-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-white">{label}</span>
              <span className="block truncate text-xs text-slate-400">{text}</span>
            </span>
            <ArrowRight className="h-4 w-4 text-slate-500 transition-transform group-hover:translate-x-1" />
          </Link>
        ))}
      </div>

      {empty ? (
        <div className="card">
          <EmptyState
            icon={ScanSearch}
            title="No detections yet"
            text="Run your first image, video or camera detection and your statistics will appear here."
            actionLabel="Try image detection"
            actionTo="/image"
          />
        </div>
      ) : (
        <>
          <div className="grid gap-6 lg:grid-cols-2">
            <section className="card-pad">
              <h2 className="mb-4 text-base font-semibold text-white">Object class distribution</h2>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={(data?.class_distribution || []).slice(0, 8)} layout="vertical" margin={{ left: 8, right: 16 }}>
                    <XAxis type="number" stroke="#64748b" allowDecimals={false} fontSize={12} />
                    <YAxis type="category" dataKey="name" stroke="#94a3b8" width={90} fontSize={12} />
                    <Tooltip {...tooltipStyle} />
                    <Bar dataKey="count" name="Detections" radius={[0, 6, 6, 0]}>
                      {(data?.class_distribution || []).slice(0, 8).map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>
            <section className="card-pad">
              <h2 className="mb-4 text-base font-semibold text-white">Detection type distribution</h2>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={types} dataKey="value" nameKey="name" innerRadius={60} outerRadius={95} paddingAngle={3}>
                      {types.map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} stroke="none" />
                      ))}
                    </Pie>
                    <Tooltip {...tooltipStyle} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </section>
          </div>

          <section className="card-pad">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold text-white">Recent detection activity</h2>
              <Link to="/history" className="text-sm text-brand-400 hover:underline">View all</Link>
            </div>
            <ul className="divide-y divide-navy-600/40">
              {(data?.recent || []).map((r) => (
                <li key={r.id} className="flex flex-wrap items-center gap-3 py-3">
                  <span className="grid h-9 w-9 place-items-center rounded-lg bg-navy-700 text-brand-400">
                    {r.detection_type === 'video' ? <Video className="h-4 w-4" /> : <ImageIcon className="h-4 w-4" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-white">{r.original_filename}</p>
                    <p className="text-xs text-slate-500">{dateTime(r.created_at)}</p>
                  </div>
                  <span className="badge border-brand-500/40 bg-brand-500/10 text-blue-200">{r.total_objects} objects</span>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </div>
  );
}
