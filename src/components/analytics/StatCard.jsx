import { TrendingUp, TrendingDown } from 'lucide-react';

export default function StatCard({ icon: Icon, label, value, delta, color = 'emerald', loading }) {
  const colors = {
    emerald: {
      iconBg: 'bg-emerald-50 text-emerald-800 border-emerald-100',
      badge: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    },
    amber: {
      iconBg: 'bg-amber-50 text-amber-800 border-amber-100',
      badge: 'bg-amber-50 text-amber-800 border-amber-200',
    },
    rose: {
      iconBg: 'bg-rose-50 text-rose-800 border-rose-100',
      badge: 'bg-rose-50 text-rose-800 border-rose-200',
    },
    sky: {
      iconBg: 'bg-sky-50 text-sky-800 border-sky-100',
      badge: 'bg-sky-50 text-sky-800 border-sky-200',
    },
  };
  const c = colors[color] || colors.emerald;
  const isPositiveDelta = delta >= 0;

  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-5 flex flex-col gap-3 shadow-xs transition-all hover:shadow-md hover:border-emerald-600/30">
      <div className="flex items-center justify-between">
        <div className={`p-2.5 rounded-xl border ${c.iconBg}`}>
          <Icon className="w-5 h-5" />
        </div>
        {delta !== undefined && (
          <span className={`flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border ${c.badge}`}>
            {isPositiveDelta ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {Math.abs(delta)}%
          </span>
        )}
      </div>
      {loading ? (
        <div className="h-8 w-24 rounded-lg bg-stone-100 animate-pulse" />
      ) : (
        <p className="text-3xl font-bold text-stone-900 tracking-tight">{value ?? '—'}</p>
      )}
      <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider">{label}</p>
    </div>
  );
}
