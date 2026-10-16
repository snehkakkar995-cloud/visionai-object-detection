import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { BarChart3 } from 'lucide-react';
import ErrorMessage from '../components/ErrorMessage.jsx';
import EmptyState from '../components/EmptyState.jsx';
import LoadingSpinner from '../components/LoadingSpinner.jsx';
import useAsync from '../hooks/useAsync.js';
import { getAnalytics } from '../services/api.js';
import { CHART_COLORS } from '../utils/format.js';
import { tooltipStyle } from './Dashboard.jsx';

function ChartCard({ title, subtitle, children, empty }) {
  return (
    <section className="card-pad">
      <h2 className="text-base font-semibold text-white">{title}</h2>
      {subtitle && <p className="muted mb-4 mt-0.5">{subtitle}</p>}
      <div className={`h-72 ${subtitle ? '' : 'mt-4'}`}>
        {empty ? (
          <div className="flex h-full items-center justify-center text-sm text-slate-500">Not enough data yet</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            {children}
          </ResponsiveContainer>
        )}
      </div>
    </section>
  );
}

const axis = { stroke: '#64748b', fontSize: 12 };

export default function Analytics() {
  const { data, loading, error, reload } = useAsync(getAnalytics, []);

  if (loading) return <LoadingSpinner label="Loading analytics..." />;
  if (error) return <ErrorMessage message={error} onRetry={reload} />;

  if (!data || data.total_sessions === 0) {
    return (
      <div className="space-y-6">
        <h1 className="h-page">Analytics</h1>
        <div className="card">
          <EmptyState
            icon={BarChart3}
            title="No analytics yet"
            text="Charts are calculated from your saved detections. Run an image or video detection to get started."
            actionLabel="Run a detection"
            actionTo="/image"
          />
        </div>
      </div>
    );
  }

  const types = data.type_distribution.filter((t) => t.value > 0);
  const hasConf = data.confidence_distribution.some((b) => b.count > 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="h-page">Analytics</h1>
        <p className="muted mt-1">
          {data.total_sessions} session{data.total_sessions === 1 ? '' : 's'} &middot; {data.total_objects} objects, calculated from the database.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard title="Most frequently detected classes" subtitle="Top classes by number of detections" empty={data.class_distribution.length === 0}>
          <BarChart data={data.class_distribution.slice(0, 10)} margin={{ left: -10, right: 8 }}>
            <CartesianGrid stroke="#1f3363" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="name" {...axis} interval={0} angle={-30} textAnchor="end" height={60} />
            <YAxis {...axis} allowDecimals={false} />
            <Tooltip {...tooltipStyle} />
            <Bar dataKey="count" name="Detections" radius={[6, 6, 0, 0]}>
              {data.class_distribution.slice(0, 10).map((_, i) => (
                <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ChartCard>

        <ChartCard title="Objects per session" subtitle="Last 20 sessions, oldest to newest">
          <BarChart data={data.objects_per_session} margin={{ left: -10, right: 8 }}>
            <CartesianGrid stroke="#1f3363" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="label" {...axis} />
            <YAxis {...axis} allowDecimals={false} />
            <Tooltip {...tooltipStyle} labelFormatter={(l, p) => p?.[0]?.payload?.name || l} />
            <Bar dataKey="objects" name="Objects" fill="#3b82f6" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ChartCard>

        <ChartCard title="Image vs video sessions" empty={types.length === 0}>
          <PieChart>
            <Pie data={types} dataKey="value" nameKey="name" innerRadius={60} outerRadius={95} paddingAngle={3} label>
              {types.map((_, i) => (
                <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} stroke="none" />
              ))}
            </Pie>
            <Tooltip {...tooltipStyle} />
            <Legend />
          </PieChart>
        </ChartCard>

        <ChartCard title="Detection activity over time" subtitle="Sessions and objects per day (UTC)">
          <AreaChart data={data.activity_over_time} margin={{ left: -10, right: 8 }}>
            <CartesianGrid stroke="#1f3363" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="date" {...axis} />
            <YAxis {...axis} allowDecimals={false} />
            <Tooltip {...tooltipStyle} />
            <Legend />
            <Area type="monotone" dataKey="objects" name="Objects" stroke="#22d3ee" fill="#22d3ee" fillOpacity={0.15} />
            <Area type="monotone" dataKey="sessions" name="Sessions" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.25} />
          </AreaChart>
        </ChartCard>

        <div className="lg:col-span-2">
          <ChartCard title="Confidence score distribution" subtitle="Number of detections in each confidence band" empty={!hasConf}>
            <BarChart data={data.confidence_distribution} margin={{ left: -10, right: 8 }}>
              <CartesianGrid stroke="#1f3363" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="range" {...axis} />
              <YAxis {...axis} allowDecimals={false} />
              <Tooltip {...tooltipStyle} />
              <Bar dataKey="count" name="Detections" fill="#a78bfa" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ChartCard>
        </div>
      </div>
    </div>
  );
}
