import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-stone-900 border border-stone-700 rounded-xl px-4 py-3 shadow-xl text-xs">
      <p className="text-stone-300 font-semibold mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} style={{ color: p.color }}>{p.name}: <span className="font-bold">{p.value}</span></p>
      ))}
    </div>
  );
};

export default function IncidentTrendChart({ data = [], loading }) {
  if (loading) {
    return <div className="h-64 rounded-xl bg-stone-800/40 animate-pulse" />;
  }
  if (!data.length) {
    return (
      <div className="h-64 flex items-center justify-center text-stone-500 text-sm">
        No trend data available for the selected period.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={240}>
      <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
        <defs>
          <linearGradient id="incGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="alertGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.25} />
            <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#292524" />
        <XAxis dataKey="week" tick={{ fill: '#78716c', fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fill: '#78716c', fontSize: 11 }} axisLine={false} tickLine={false} />
        <Tooltip content={<CustomTooltip />} />
        <Legend
          wrapperStyle={{ fontSize: '11px', color: '#a8a29e', paddingTop: '8px' }}
          formatter={(v) => v.charAt(0).toUpperCase() + v.slice(1)}
        />
        <Area type="monotone" dataKey="incidents" name="Incidents" stroke="#10b981" strokeWidth={2} fill="url(#incGradient)" dot={{ r: 3, fill: '#10b981' }} activeDot={{ r: 5 }} />
        <Area type="monotone" dataKey="alerts" name="GPS Alerts" stroke="#f59e0b" strokeWidth={2} fill="url(#alertGradient)" dot={{ r: 3, fill: '#f59e0b' }} activeDot={{ r: 5 }} />
      </AreaChart>
    </ResponsiveContainer>
  );
}
