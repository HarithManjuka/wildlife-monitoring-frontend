import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const COLORS = ['#047857', '#d97706', '#dc2626', '#4f46e5', '#db2777', '#0d9488'];

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-stone-200 rounded-xl px-4 py-2 shadow-lg text-xs">
      <p style={{ color: payload[0].payload.fill }} className="font-semibold">{payload[0].name}</p>
      <p className="text-stone-600">Count: <span className="font-bold text-stone-900">{payload[0].value}</span></p>
    </div>
  );
};

export default function IncidentTypeChart({ byType = {}, loading }) {
  if (loading) return <div className="h-64 rounded-xl bg-stone-100 animate-pulse" />;

  const data = Object.entries(byType)
    .filter(([, v]) => v > 0)
    .map(([name, value], i) => ({ name, value, fill: COLORS[i % COLORS.length] }));

  if (!data.length) {
    return (
      <div className="h-64 flex items-center justify-center text-stone-400 text-xs">
        No incident category logs for this window.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={240}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="45%"
          innerRadius={60}
          outerRadius={90}
          paddingAngle={3}
          dataKey="value"
        >
          {data.map((entry) => (
            <Cell key={entry.name} fill={entry.fill} stroke="transparent" />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
        <Legend
          layout="vertical"
          align="right"
          verticalAlign="middle"
          iconType="circle"
          iconSize={8}
          wrapperStyle={{ fontSize: '11px', color: '#57534e' }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
