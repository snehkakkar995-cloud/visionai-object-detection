export const pct = (v, digits = 1) => `${((v || 0) * 100).toFixed(digits)}%`;

export const ms = (v) => {
  if (v == null) return '-';
  return v >= 1000 ? `${(v / 1000).toFixed(2)} s` : `${Math.round(v)} ms`;
};

export const bytes = (n) => {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
};

export const dateTime = (iso) =>
  new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });

export const extOf = (name) => (name.includes('.') ? name.split('.').pop().toLowerCase() : '');

export const CHART_COLORS = ['#3b82f6', '#22d3ee', '#a78bfa', '#34d399', '#fbbf24', '#f472b6', '#fb7185', '#60a5fa'];
