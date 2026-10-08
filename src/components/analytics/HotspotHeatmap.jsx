/**
 * Color-coded by severity: LOW → MEDIUM → HIGH → CRITICAL.
 */
const SEVERITY_CONFIG = {
  LOW: { color: 'bg-emerald-500', text: 'text-emerald-400', bar: 'from-emerald-600 to-emerald-400', badge: 'bg-emerald-900/50 text-emerald-300 border-emerald-700/40' },
  MEDIUM: { color: 'bg-amber-500', text: 'text-amber-400', bar: 'from-amber-600 to-amber-400', badge: 'bg-amber-900/50 text-amber-300 border-amber-700/40' },
  HIGH: { color: 'bg-orange-500', text: 'text-orange-400', bar: 'from-orange-600 to-orange-400', badge: 'bg-orange-900/50 text-orange-300 border-orange-700/40' },
  CRITICAL: { color: 'bg-rose-500', text: 'text-rose-400', bar: 'from-rose-600 to-rose-400', badge: 'bg-rose-900/50 text-rose-300 border-rose-700/40' },
};

function HotspotBar({ hotspot }) {
  const cfg = SEVERITY_CONFIG[hotspot.severity] || SEVERITY_CONFIG.LOW;
  const pct = Math.min(Math.round(hotspot.density * 100), 100);

  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-stone-800/60 last:border-0">
      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: cfg.color.replace('bg-', '').replace('-500', '') }}>
        <div className={`w-2 h-2 rounded-full ${cfg.color}`} />
      </div>
      <span className="text-stone-300 text-xs font-medium truncate flex-1">{hotspot.location}</span>
      <div className="flex-1 max-w-[120px] h-2 rounded-full bg-stone-800 overflow-hidden">
        <div
          className={`h-full rounded-full bg-gradient-to-r ${cfg.bar} transition-all duration-700`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${cfg.badge}`}>
        {hotspot.severity}
      </span>
      <span className="text-stone-500 text-xs w-8 text-right">{hotspot.count}</span>
    </div>
  );
}

export default function HotspotHeatmap({ hotspots = [], loading }) {
  if (loading) return <div className="h-64 rounded-xl bg-stone-800/40 animate-pulse" />;
  if (!hotspots.length) {
    return <div className="h-40 flex items-center justify-center text-stone-500 text-sm">No hotspot data for this period.</div>;
  }

  return (
    <div>
      {/* Legend */}
      <div className="flex gap-4 mb-4 flex-wrap">
        {Object.entries(SEVERITY_CONFIG).map(([key, cfg]) => (
          <div key={key} className="flex items-center gap-1.5">
            <div className={`w-2.5 h-2.5 rounded-full ${cfg.color}`} />
            <span className="text-xs text-stone-400">{key.charAt(0) + key.slice(1).toLowerCase()}</span>
          </div>
        ))}
      </div>

      {/* Heatmap bars */}
      <div>
        {hotspots.map((h) => (
          <HotspotBar key={h.location} hotspot={h} />
        ))}
      </div>

      <p className="text-xs text-stone-600 mt-3">Bar width = incident density relative to peak zone. Count = total incidents in period.</p>
    </div>
  );
}
