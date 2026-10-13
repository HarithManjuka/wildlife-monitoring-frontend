import { useState } from 'react';

const THREAT_STYLE = {
  CRITICAL: 'bg-rose-50 text-rose-800 border border-rose-200',
  HIGH: 'bg-orange-50 text-orange-800 border border-orange-200',
  MEDIUM: 'bg-amber-50 text-amber-800 border border-amber-200',
  LOW: 'bg-emerald-50 text-emerald-800 border border-emerald-200',
};

const STATUS_STYLE = {
  PENDING: 'bg-amber-50 text-amber-800 border border-amber-200',
  IN_REVIEW: 'bg-sky-50 text-sky-800 border border-sky-200',
  RESOLVED: 'bg-emerald-50 text-emerald-800 border border-emerald-200',
};

function QueueRow({ report, onViewDetails }) {
  const threatStyle = THREAT_STYLE[report.threatLevel] || THREAT_STYLE.LOW;
  const statusStyle = STATUS_STYLE[report.status] || 'bg-stone-100 text-stone-700 border border-stone-200';

  return (
    <tr className="border-b border-stone-100 hover:bg-stone-50/70 transition-colors">
      <td className="py-3 px-4 text-emerald-800 text-xs font-mono font-semibold">{report.id}</td>
      <td className="py-3 px-4 text-stone-600 text-xs">
        {new Date(report.reportedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
      </td>
      <td className="py-3 px-4 text-stone-900 text-xs font-medium">{report.type}</td>
      <td className="py-3 px-4 text-stone-600 text-xs">{report.location}</td>
      <td className="py-3 px-4">
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${threatStyle}`}>{report.threatLevel}</span>
      </td>
      <td className="py-3 px-4">
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${statusStyle}`}>
          {report.status?.replace('_', ' ')}
        </span>
      </td>
      <td className="py-3 px-4 text-right">
        <button
          onClick={() => onViewDetails(report)}
          className="text-xs text-emerald-800 hover:text-emerald-950 font-semibold cursor-pointer transition"
        >
          View Details
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/40 backdrop-blur-xs p-4"
      onClick={onClose}
    >
      <div
        className="bg-white border border-stone-200 rounded-2xl p-6 w-full max-w-md shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3 border-b border-stone-100 mb-4">
          <h3 className="text-sm font-bold text-stone-900">Community Conflict Report — {report.id}</h3>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-700 text-lg leading-none cursor-pointer">×</button>
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
            <div key={label} className="flex gap-3 py-1 border-b border-stone-100/70">
              <dt className="text-stone-500 w-24 flex-shrink-0 font-medium">{label}</dt>
              <dd className="text-stone-900 font-medium flex-1">{value || '—'}</dd>
            </div>
          ))}
          <div className="flex gap-3 py-1 items-center">
            <dt className="text-stone-500 w-24 flex-shrink-0 font-medium">Threat Level</dt>
            <dd><span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${threatStyle}`}>{report.threatLevel}</span></dd>
          </div>
        </dl>
        <div className="mt-5 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-semibold cursor-pointer transition"
          >
            Close
          </button>
        </div>
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

  if (loading) return <div className="h-40 rounded-xl bg-stone-100 animate-pulse" />;

  return (
    <div>
      {/* Status filter tabs */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {['ALL', 'PENDING', 'IN_REVIEW', 'RESOLVED'].map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
              statusFilter === s
                ? 'bg-emerald-800 text-white shadow-2xs'
                : 'bg-stone-100 text-stone-600 hover:text-stone-900 border border-stone-200'
            }`}
          >
            {s.replace('_', ' ')}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto rounded-xl border border-stone-200 bg-white">
        <table className="w-full text-xs text-left">
          <thead>
            <tr className="border-b border-stone-200 bg-stone-50 text-stone-600 font-semibold text-[11px] uppercase tracking-wider">
              <th className="py-2.5 px-4">Report ID</th>
              <th className="py-2.5 px-4">Reported</th>
              <th className="py-2.5 px-4">Conflict Type</th>
              <th className="py-2.5 px-4">Village</th>
              <th className="py-2.5 px-4">Threat</th>
              <th className="py-2.5 px-4">Status</th>
              <th className="py-2.5 px-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan="7" className="py-8 text-center text-stone-400 text-xs">
                  No community conflict reports logged in this queue.
                </td>
              </tr>
            ) : (
              filtered.map((r) => (
                <QueueRow key={r.id} report={r} onViewDetails={setSelectedReport} />
              ))
            )}
          </tbody>
        </table>
      </div>

      <ReportDetailModal report={selectedReport} onClose={() => setSelectedReport(null)} />
    </div>
  );
}
