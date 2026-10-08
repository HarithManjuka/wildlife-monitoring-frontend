import { RadialBarChart, RadialBar, ResponsiveContainer } from 'recharts';

export default function PatrolCoveragePanel({ coverage, loading }) {
  if (loading) return <div className="h-48 rounded-xl bg-stone-800/40 animate-pulse" />;
  if (!coverage) return <div className="h-24 flex items-center justify-center text-stone-500 text-sm">Run a report to view patrol coverage.</div>;

  const { coverageScore = 0, coverageGap = 0, zones = [] } = coverage;
  const gaugeData = [{ name: 'Coverage', value: coverageScore, fill: coverageScore >= 70 ? '#10b981' : coverageScore >= 40 ? '#f59e0b' : '#ef4444' }];

  return (
    <div className="flex flex-col gap-6">
      {/* Gauge + Score */}
      <div className="flex items-center gap-6">
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
              <RadialBar dataKey="value" cornerRadius={6} background={{ fill: '#292524' }} />
            </RadialBarChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold text-white">{coverageScore}%</span>
            <span className="text-[9px] text-stone-500 uppercase">Coverage</span>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <div>
            <p className="text-xs text-stone-400">Coverage Score</p>
            <p className="text-lg font-bold text-emerald-400">{coverageScore}%</p>
          </div>
          <div>
            <p className="text-xs text-stone-400">Coverage Gap</p>
            <p className="text-lg font-bold text-rose-400">{coverageGap}%</p>
          </div>
        </div>
      </div>

      {/* Zone breakdown */}
      {zones.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-2">Zone Breakdown</p>
          <div className="space-y-2">
            {zones.map((z) => (
              <div key={z.name} className="flex items-center gap-3">
                <span className="text-stone-300 text-xs truncate flex-1">{z.name}</span>
                <div className="flex-1 max-w-[80px] h-1.5 rounded-full bg-stone-800 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${z.patrols > 0 ? 'bg-emerald-500' : 'bg-stone-700'}`}
                    style={{ width: z.patrols > 0 ? `${Math.min(z.patrols * 15, 100)}%` : '100%' }}
                  />
                </div>
                <span className={`text-xs font-semibold ${z.patrols > 0 ? 'text-emerald-400' : 'text-stone-600'}`}>
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
