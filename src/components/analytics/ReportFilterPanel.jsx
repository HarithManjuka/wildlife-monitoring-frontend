import { useState } from 'react';

const PARKS = ['ALL', 'Yala National Park', 'Wilpattu National Park', 'Udawalawe National Park', 'Horton Plains'];
const REPORT_TYPES = [
  { value: 'INCIDENT_ANALYSIS', label: 'Incident Analysis' },
  { value: 'PATROL_COVERAGE', label: 'Patrol Coverage' },
  { value: 'HUMAN_WILDLIFE_CONFLICT', label: 'Human-Wildlife Conflict' },
];
const INCIDENT_TYPES = ['ALL', 'Poaching', 'Animal Carcass', 'Snare', 'Illegal Campsite', 'Wildlife Sighting', 'Other'];
const SEVERITIES = ['ALL', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

const today = new Date();
const defaultTo = today.toISOString().slice(0, 10);
const defaultFrom = new Date(today.setDate(today.getDate() - 30)).toISOString().slice(0, 10);

export default function ReportFilterPanel({ onGenerate, loading }) {
  const [criteria, setCriteria] = useState({
    park: 'ALL',
    dateFrom: defaultFrom,
    dateTo: defaultTo,
    reportType: 'INCIDENT_ANALYSIS',
    incidentType: 'ALL',
    severity: 'ALL',
  });

  const set = (key) => (e) => setCriteria((prev) => ({ ...prev, [key]: e.target.value }));

  const labelClass = 'block text-xs font-semibold text-stone-400 uppercase tracking-wider mb-1';
  const inputClass = 'w-full bg-stone-800/60 border border-stone-700/50 text-stone-200 text-sm rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition';

  return (
    <div className="rounded-2xl border border-stone-700/40 bg-stone-900/60 backdrop-blur-sm p-6">
      <h2 className="text-sm font-bold text-stone-300 uppercase tracking-widest mb-4">Report Parameters</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {/* Park */}
        <div>
          <label className={labelClass}>Park</label>
          <select id="filter-park" value={criteria.park} onChange={set('park')} className={inputClass}>
            {PARKS.map((p) => <option key={p}>{p}</option>)}
          </select>
        </div>
        {/* Date From */}
        <div>
          <label className={labelClass}>From</label>
          <input id="filter-date-from" type="date" value={criteria.dateFrom} onChange={set('dateFrom')} className={inputClass} />
        </div>
        {/* Date To */}
        <div>
          <label className={labelClass}>To</label>
          <input id="filter-date-to" type="date" value={criteria.dateTo} onChange={set('dateTo')} className={inputClass} />
        </div>
        {/* Report Type — Strategy selector */}
        <div>
          <label className={labelClass}>Report Type</label>
          <select id="filter-report-type" value={criteria.reportType} onChange={set('reportType')} className={inputClass}>
            {REPORT_TYPES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
        </div>
        {/* Incident Type */}
        <div>
          <label className={labelClass}>Incident Type</label>
          <select id="filter-incident-type" value={criteria.incidentType} onChange={set('incidentType')} className={inputClass}>
            {INCIDENT_TYPES.map((t) => <option key={t}>{t}</option>)}
          </select>
        </div>
        {/* Severity */}
        <div>
          <label className={labelClass}>Severity</label>
          <select id="filter-severity" value={criteria.severity} onChange={set('severity')} className={inputClass}>
            {SEVERITIES.map((s) => <option key={s}>{s}</option>)}
          </select>
        </div>
      </div>
      <button
        id="btn-generate-report"
        onClick={() => onGenerate(criteria)}
        disabled={loading}
        className="mt-5 px-8 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm transition disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? 'Generating…' : 'Generate Report'}
      </button>
    </div>
  );
}
