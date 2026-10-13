import { RadialBarChart, RadialBar, ResponsiveContainer } from 'recharts';

export default function PatrolCoveragePanel({ coverage, loading }) {
  if (loading) return <div className="h-48 rounded-xl bg-stone-100 animate-pulse" />;
  if (!coverage) {
    return (
      <div className="h-24 flex items-center justify-center text-stone-400 text-xs">
        Generate an intelligence report to view patrol coverage score.
      </div>
    );
  }

  const { coverageScore = 0, coverageGap = 0, zones = [] } = coverage;
  const gaugeData = [{
    name: 'Coverage',
    value: coverageScore,
    fill: coverageScore >= 70 ? '#047857' : coverageScore >= 40 ? '#d97706' : '#dc2626',
  }];

  return (
    <div className="flex flex-col gap-6">
      {/* Gauge + Score */}
      <div className="flex items-center gap-6 p-4 rounded-xl bg-stone-50 border border-stone-200/70">
        <div className="relative w-28 h-28 flex-shrink-0">
          <ResponsiveContainer width={112} height={112}>
            <RadialBarChart
              cx="50%" cy="50%"
              innerRadius="60%" outerRadius="100%"
              barSize={12}
              data={gaugeData}
              startAngle={90}
              endAngle={-270}
            >
              <RadialBar dataKey="value" cornerRadius={6} background={{ fill: '#e7e5e4' }} />
            </RadialBarChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold text-stone-900">{coverageScore}%</span>
            <span className="text-[9px] text-stone-500 font-semibold uppercase">Coverage</span>
          </div>
        </div>
        <div className="flex flex-col gap-3">
          <div>
            <p className="text-xs text-stone-500 font-medium">Patrol Sector Coverage</p>
            <p className="text-xl font-bold text-emerald-800">{coverageScore}%</p>
          </div>
          <div>
            <p className="text-xs text-stone-500 font-medium">Unpatrolled Buffer Gap</p>
            <p className="text-xl font-bold text-rose-700">{coverageGap}%</p>
          </div>
        </div>
      </div>

      {/* Zone breakdown */}
      {zones.length > 0 && (
        <div>
          <p className="text-xs font-bold text-stone-700 uppercase tracking-wider mb-2.5">
            Ranger Sector Patrol Distribution
          </p>
          <div className="space-y-2">
            {zones.map((z) => (
              <div key={z.name} className="flex items-center gap-3 p-2 rounded-lg hover:bg-stone-50 transition-colors">
                <span className="text-stone-800 text-xs font-medium truncate flex-1">{z.name}</span>
                <div className="flex-1 max-w-[80px] h-2 rounded-full bg-stone-100 overflow-hidden border border-stone-200/50">
                  <div
                    className={`h-full rounded-full ${z.patrols > 0 ? 'bg-emerald-700' : 'bg-stone-300'}`}
                    style={{ width: z.patrols > 0 ? `${Math.min(z.patrols * 25, 100)}%` : '100%' }}
                  />
                </div>
                <span className={`text-xs font-semibold ${z.patrols > 0 ? 'text-emerald-800' : 'text-stone-400'}`}>
                  {z.patrols > 0 ? `${z.patrols} patrols` : 'No coverage'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
