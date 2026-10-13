/**
 * HotspotHeatmap.jsx
 * Color-coded by severity: LOW → MEDIUM → HIGH → CRITICAL.
 */
const SEVERITY_CONFIG = {
  LOW: {
    color: 'bg-emerald-600',
    bar: 'from-emerald-700 to-emerald-500',
    badge: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  },
  MEDIUM: {
    color: 'bg-amber-500',
    bar: 'from-amber-600 to-amber-400',
    badge: 'bg-amber-50 text-amber-800 border-amber-200',
  },
  HIGH: {
    color: 'bg-orange-500',
    bar: 'from-orange-600 to-orange-400',
    badge: 'bg-orange-50 text-orange-800 border-orange-200',
  },
  CRITICAL: {
    color: 'bg-rose-600',
    bar: 'from-rose-700 to-rose-500',
    badge: 'bg-rose-50 text-rose-800 border-rose-200',
  },
};

function HotspotBar({ hotspot }) {
  const cfg = SEVERITY_CONFIG[hotspot.severity] || SEVERITY_CONFIG.LOW;
  const pct = Math.min(Math.round(hotspot.density * 100), 100);

  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-stone-100 last:border-0 hover:bg-stone-50/60 px-2 rounded-lg transition-colors">
      <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${cfg.color}`} />
      <span className="text-stone-800 text-xs font-medium truncate flex-1">{hotspot.location}</span>
      <div className="flex-1 max-w-[120px] h-2 rounded-full bg-stone-100 overflow-hidden border border-stone-200/50">
        <div
          className={`h-full rounded-full bg-gradient-to-r ${cfg.bar} transition-all duration-700`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${cfg.badge}`}>
        {hotspot.severity}
      </span>
      <span className="text-stone-700 font-mono text-xs w-8 text-right font-medium">{hotspot.count}</span>
    </div>
  );
}

export default function HotspotHeatmap({ hotspots = [], loading }) {
  if (loading) return <div className="h-64 rounded-xl bg-stone-100 animate-pulse" />;
  if (!hotspots.length) {
    return (
      <div className="h-40 flex items-center justify-center text-stone-400 text-xs">
        No hotspot incidents recorded for the selected period.
      </div>
    );
  }

  return (
    <div>
      {/* Legend */}
      <div className="flex gap-4 mb-3 pb-2 border-b border-stone-100 flex-wrap">
        {Object.entries(SEVERITY_CONFIG).map(([key, cfg]) => (
          <div key={key} className="flex items-center gap-1.5">
            <div className={`w-2 h-2 rounded-full ${cfg.color}`} />
            <span className="text-xs text-stone-600 font-medium">
              {key.charAt(0) + key.slice(1).toLowerCase()}
            </span>
          </div>
        ))}
      </div>

      {/* Heatmap bars */}
      <div className="space-y-0.5">
        {hotspots.map((h) => (
          <HotspotBar key={h.location} hotspot={h} />
        ))}
      </div>

      <p className="text-[11px] text-stone-500 mt-3 pt-2 border-t border-stone-100">
        Bar width represents density relative to peak sector. Count indicates total incidents.
      </p>
    </div>
  );
}
