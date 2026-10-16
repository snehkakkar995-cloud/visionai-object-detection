export default function StatCard({ icon: Icon, label, value, hint, loading }) {
  return (
    <div className="card-pad transition-colors hover:border-brand-500/50">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm text-slate-400">{label}</p>
        {Icon && (
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-brand-500/15 text-brand-400">
            <Icon className="h-[18px] w-[18px]" />
          </span>
        )}
      </div>
      {loading ? (
        <div className="h-8 w-24 animate-pulse rounded bg-navy-600" />
      ) : (
        <p className="truncate text-2xl font-bold capitalize text-white sm:text-3xl">{value}</p>
      )}
      {hint && <p className="mt-1 truncate text-xs text-slate-500">{hint}</p>}
    </div>
  );
}
