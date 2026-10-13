import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-stone-200 rounded-xl px-4 py-2.5 shadow-lg text-xs">
      <p className="text-stone-900 font-bold mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} style={{ color: p.color }} className="font-medium">
          {p.name}: <span className="font-bold text-stone-900">{p.value}</span>
        </p>
      ))}
    </div>
  );
};

export default function IncidentTrendChart({ data = [], loading }) {
  if (loading) {
    return <div className="h-64 rounded-xl bg-stone-100 animate-pulse" />;
  }
  if (!data.length) {
    return (
      <div className="h-64 flex items-center justify-center text-stone-400 text-xs">
        No temporal trend data recorded for the selected window.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={240}>
      <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
        <defs>
          <linearGradient id="incGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#047857" stopOpacity={0.25} />
            <stop offset="95%" stopColor="#047857" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="alertGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#d97706" stopOpacity={0.25} />
            <stop offset="95%" stopColor="#d97706" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0eeee" />
        <XAxis dataKey="week" tick={{ fill: '#78716c', fontSize: 11 }} axisLine={{ stroke: '#e7e5e4' }} tickLine={false} />
        <YAxis tick={{ fill: '#78716c', fontSize: 11 }} axisLine={{ stroke: '#e7e5e4' }} tickLine={false} />
        <Tooltip content={<CustomTooltip />} />
        <Legend
          wrapperStyle={{ fontSize: '11px', color: '#57534e', paddingTop: '8px' }}
          formatter={(v) => v.charAt(0).toUpperCase() + v.slice(1)}
        />
        <Area
          type="monotone"
          dataKey="incidents"
          name="Incidents"
          stroke="#047857"
          strokeWidth={2}
          fill="url(#incGradient)"
          dot={{ r: 3, fill: '#047857' }}
          activeDot={{ r: 5 }}
        />
        <Area
          type="monotone"
          dataKey="alerts"
          name="GPS Alerts"
          stroke="#d97706"
          strokeWidth={2}
          fill="url(#alertGradient)"
          dot={{ r: 3, fill: '#d97706' }}
          activeDot={{ r: 5 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
