import { useState } from 'react';

const THREAT_STYLE = {
  CRITICAL: 'bg-rose-900/50 text-rose-300 border border-rose-700/40',
  HIGH: 'bg-orange-900/50 text-orange-300 border border-orange-700/40',
  MEDIUM: 'bg-amber-900/50 text-amber-300 border border-amber-700/40',
  LOW: 'bg-emerald-900/50 text-emerald-300 border border-emerald-700/40',
};

const STATUS_STYLE = {
  PENDING: 'text-amber-400',
  IN_REVIEW: 'text-sky-400',
  RESOLVED: 'text-emerald-400',
};

function QueueRow({ report, onViewDetails }) {
  const threatStyle = THREAT_STYLE[report.threatLevel] || THREAT_STYLE.LOW;
  const statusStyle = STATUS_STYLE[report.status] || 'text-stone-400';

  return (
    <tr className="border-b border-stone-800/60 hover:bg-stone-800/30 transition-colors">
      <td className="py-3 px-4 text-stone-400 text-xs font-mono">{report.id}</td>
      <td className="py-3 px-4 text-stone-300 text-xs">
        {new Date(report.reportedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
      </td>
      <td className="py-3 px-4 text-stone-200 text-xs font-medium">{report.type}</td>
      <td className="py-3 px-4 text-stone-400 text-xs">{report.location}</td>
      <td className="py-3 px-4">
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${threatStyle}`}>{report.threatLevel}</span>
      </td>
      <td className="py-3 px-4">
        <span className={`text-xs font-semibold ${statusStyle}`}>{report.status?.replace('_', ' ')}</span>
      </td>
      <td className="py-3 px-4">
        <button
          onClick={() => onViewDetails(report)}
          className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold transition"
        >
          View
        </button>
      </td>
    </tr>
  );
}

function ReportDetailModal({ report, onClose }) {
  if (!report) return null;
  const threatStyle = THREAT_STYLE[report.threatLevel] || THREAT_STYLE.LOW;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-stone-900 border border-stone-700 rounded-2xl p-6 w-full max-w-md shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-white">Community Report — {report.id}</h3>
          <button onClick={onClose} className="text-stone-500 hover:text-stone-300 text-lg leading-none">×</button>
        </div>
        <dl className="space-y-3 text-xs">
          {[
            ['Type', report.type],
            ['Location', report.location],
            ['Source', report.source],
            ['Reported At', new Date(report.reportedAt).toLocaleString()],
            ['Status', report.status?.replace('_', ' ')],
            ['Description', report.description],
          ].map(([label, value]) => (
            <div key={label} className="flex gap-3">
              <dt className="text-stone-500 w-24 flex-shrink-0">{label}</dt>
              <dd className="text-stone-200">{value}</dd>
            </div>
          ))}
          <div className="flex gap-3">
            <dt className="text-stone-500 w-24 flex-shrink-0">Threat Level</dt>
            <dd><span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${threatStyle}`}>{report.threatLevel}</span></dd>
          </div>
        </dl>
      </div>
    </div>
  );
}

export default function CommunityQueuePanel({ reports = [], loading }) {
  const [selectedReport, setSelectedReport] = useState(null);
  const [statusFilter, setStatusFilter] = useState('ALL');

  const filtered = statusFilter === 'ALL'
    ? reports
    : reports.filter((r) => r.status === statusFilter);

  if (loading) return <div className="h-40 rounded-xl bg-stone-800/40 animate-pulse" />;

  return (
    <div>
      {/* Status filter tabs */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {['ALL', 'PENDING', 'IN_REVIEW', 'RESOLVED'].map((s) => (
          <button
            key={s}
            id={`queue-tab-${s.toLowerCase()}`}
            onClick={() => setStatusFilter(s)}
            className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition ${statusFilter === s
                ? 'bg-emerald-700 text-white'
                : 'bg-stone-800 text-stone-400 hover:bg-stone-700'
              }`}
          >
            {s.replace('_', ' ')} {s !== 'ALL' && `(${reports.filter((r) => r.status === s).length})`}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="py-8 text-center text-stone-500 text-sm">No reports in this category.</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-stone-800/60">
          <table className="w-full min-w-[600px]">
            <thead>
              <tr className="border-b border-stone-800 bg-stone-900/50">
                {['ID', 'Reported', 'Type', 'Location', 'Threat', 'Status', ''].map((h) => (
                  <th key={h} className="py-2.5 px-4 text-left text-xs font-semibold text-stone-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <QueueRow key={r.id} report={r} onViewDetails={setSelectedReport} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ReportDetailModal report={selectedReport} onClose={() => setSelectedReport(null)} />
    </div>
  );
}
