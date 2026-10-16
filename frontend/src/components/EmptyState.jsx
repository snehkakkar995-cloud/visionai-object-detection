import { Link } from 'react-router-dom';

export default function EmptyState({ icon: Icon, title, text, actionLabel, actionTo }) {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-10 text-center">
      {Icon && (
        <span className="mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-navy-700 text-brand-400">
          <Icon className="h-7 w-7" />
        </span>
      )}
      <h3 className="text-base font-semibold text-white">{title}</h3>
      {text && <p className="muted mt-1 max-w-sm">{text}</p>}
      {actionLabel && actionTo && (
        <Link to={actionTo} className="btn-primary mt-4">
          {actionLabel}
        </Link>
      )}
    </div>
  );
}
