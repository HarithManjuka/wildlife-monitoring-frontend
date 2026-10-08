import { TrendingUp, TrendingDown } from 'lucide-react';

export default function StatCard({ icon: Icon, label, value, delta, color = 'emerald', loading }) {
  const colors = {
    emerald: { bg: 'bg-emerald-900/30', border: 'border-emerald-700/40', icon: 'text-emerald-400', badge: 'bg-emerald-900/50 text-emerald-300' },
    amber: { bg: 'bg-amber-900/30', border: 'border-amber-700/40', icon: 'text-amber-400', badge: 'bg-amber-900/50 text-amber-300' },
    rose: { bg: 'bg-rose-900/30', border: 'border-rose-700/40', icon: 'text-rose-400', badge: 'bg-rose-900/50 text-rose-300' },
    sky: { bg: 'bg-sky-900/30', border: 'border-sky-700/40', icon: 'text-sky-400', badge: 'bg-sky-900/50 text-sky-300' },
  };
  const c = colors[color] || colors.emerald;
  const isPositiveDelta = delta >= 0;

  return (
    <div className={`rounded-2xl border ${c.border} ${c.bg} p-5 flex flex-col gap-3 backdrop-blur-sm transition-all hover:scale-[1.02] hover:shadow-lg`}>
      <div className="flex items-center justify-between">
        <div className={`p-2.5 rounded-xl ${c.bg} border ${c.border}`}>
          <Icon className={`w-5 h-5 ${c.icon}`} />
        </div>
        {delta !== undefined && (
          <span className={`flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full ${c.badge}`}>
            {isPositiveDelta ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {Math.abs(delta)}%
          </span>
        )}
      </div>
      {loading ? (
        <div className="h-8 w-24 rounded-lg bg-stone-700/50 animate-pulse" />
      ) : (
        <p className="text-3xl font-bold text-white tracking-tight">{value ?? '—'}</p>
      )}
      <p className="text-xs font-medium text-stone-400 uppercase tracking-wider">{label}</p>
    </div>
  );
}
