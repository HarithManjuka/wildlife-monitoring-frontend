import { useState, useEffect } from 'react';
import { Filter, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { getFilterOptions, validateFilters } from '../../services/analyticsService';

export default function ReportFilterPanel({ onGenerate, loading }) {
  const [filterOptions, setFilterOptions] = useState({
    parks: ['ALL', 'Yala National Park', 'Wilpattu National Park', 'Udawalawe National Park', 'Horton Plains'],
    reportTypes: [
      { id: 'INCIDENT_ANALYSIS', name: 'Incident Analysis' },
      { id: 'PATROL_COVERAGE', name: 'Patrol Coverage' },
      { id: 'HUMAN_WILDLIFE_CONFLICT', name: 'Human-Wildlife Conflict' },
    ],
    incidentTypes: ['ALL', 'Poaching', 'Animal Carcass', 'Snare', 'Illegal Campsite', 'Wildlife Sighting', 'Other'],
    severities: ['ALL', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
    zones: ['ALL', 'Boundary Fence North', 'Zone B - River Crossing', 'Central Plains', 'Buffer Zone West', 'Southern Ridge Corridor'],
    species: ['ALL', 'Asian Elephant', 'Sri Lankan Leopard', 'Sloth Bear', 'Spotted Deer', 'Wild Boar'],
  });

  const today = new Date().toISOString().slice(0, 10);
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);

  const [criteria, setCriteria] = useState({
    park: 'ALL',
    dateFrom: thirtyDaysAgo,
    dateTo: today,
    reportType: 'INCIDENT_ANALYSIS',
    incidentType: 'ALL',
    severity: 'ALL',
    species: 'ALL',
    zone: 'ALL',
  });

  const [showAdditionalFilters, setShowAdditionalFilters] = useState(true);
  const [validationError, setValidationError] = useState(null);

  // Load filter options on mount
  useEffect(() => {
    let active = true;
    getFilterOptions().then((opts) => {
      if (active && opts) {
        setFilterOptions(opts);
      }
    });
    return () => { active = false; };
  }, []);

  // Validate filter criteria on change
  useEffect(() => {
    let active = true;
    validateFilters(criteria).then((res) => {
      if (active) {
        if (!res.valid) {
          setValidationError(res.error);
        } else {
          setValidationError(null);
        }
      }
    });
    return () => { active = false; };
  }, [criteria]);

  const set = (key) => (e) => setCriteria((prev) => ({ ...prev, [key]: e.target.value }));

  const handleSubmit = (e) => {
    e?.preventDefault();
    if (validationError) return;
    onGenerate(criteria);
  };

  const labelClass = 'block text-[11px] font-semibold text-stone-600 uppercase tracking-wider mb-1.5';
  const inputClass = 'w-full bg-stone-50 border border-stone-200 text-stone-800 text-xs rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-700 focus:bg-white focus:border-emerald-700 transition shadow-2xs';

  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-5 space-y-4 shadow-xs">
      <div className="flex items-center justify-between border-b border-stone-100 pb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-100">
            <Filter className="w-4 h-4" />
          </div>
          <h2 className="text-xs font-bold text-stone-900 uppercase tracking-wider">Report Parameters & Filters</h2>
        </div>
        <button
          type="button"
          onClick={() => setShowAdditionalFilters(!showAdditionalFilters)}
          className="flex items-center gap-1 text-xs text-stone-500 hover:text-emerald-800 transition cursor-pointer font-medium"
        >
          <span>Additional Filters</span>
          {showAdditionalFilters ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Validation Error Banner (Exception: Invalid Date Range) */}
      {validationError && (
        <div className="flex items-center gap-2 rounded-xl bg-rose-50 border border-rose-200 px-3.5 py-2 text-xs text-rose-800">
          <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
          <span className="font-medium">{validationError}</span>
        </div>
      )}

      {/* Primary Criteria */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        {/* Park */}
        <div>
          <label className={labelClass}>Conservation Park</label>
          <select id="filter-park" value={criteria.park} onChange={set('park')} className={inputClass}>
            {filterOptions.parks.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>

        {/* Date From */}
        <div>
          <label className={labelClass}>Start Date</label>
          <input
            id="filter-date-from"
            type="date"
            value={criteria.dateFrom}
            onChange={set('dateFrom')}
            className={inputClass}
          />
        </div>

        {/* Date To */}
        <div>
          <label className={labelClass}>End Date</label>
          <input
            id="filter-date-to"
            type="date"
            value={criteria.dateTo}
            onChange={set('dateTo')}
            className={inputClass}
          />
        </div>

        {/* Report Type -Strategy selector */}
        <div>
          <label className={labelClass}>Report Type</label>
          <select id="filter-report-type" value={criteria.reportType} onChange={set('reportType')} className={inputClass}>
            {filterOptions.reportTypes.map((r) => (
              <option key={r.id || r.value} value={r.id || r.value}>
                {r.name || r.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Additional Multi-Dimensional Filters */}
      {showAdditionalFilters && (
        <div className="pt-3 border-t border-stone-100 bg-stone-50/70 p-3.5 rounded-xl border border-stone-200/60 space-y-2">
          <p className="text-[10px] font-bold text-stone-500 uppercase tracking-wider">
            Additional Multi-Dimensional Filters
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
            {/* Incident Type Filter */}
            <div>
              <label className={labelClass}>Incident Type</label>
              <select id="filter-incident-type" value={criteria.incidentType} onChange={set('incidentType')} className={inputClass}>
                {filterOptions.incidentTypes.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            {/*  Location / Sector / Zone Filter */}
            <div>
              <label className={labelClass}>Location / Sector</label>
              <select id="filter-zone" value={criteria.zone} onChange={set('zone')} className={inputClass}>
                {filterOptions.zones.map((z) => (
                  <option key={z} value={z}>{z}</option>
                ))}
              </select>
            </div>

            {/* Target Species Filter */}
            <div>
              <label className={labelClass}>Target Species</label>
              <select id="filter-species" value={criteria.species} onChange={set('species')} className={inputClass}>
                {filterOptions.species.map((sp) => (
                  <option key={sp} value={sp}>{sp}</option>
                ))}
              </select>
            </div>

            {/* Severity Threshold Filter */}
            <div>
              <label className={labelClass}>Severity Threshold</label>
              <select id="filter-severity" value={criteria.severity} onChange={set('severity')} className={inputClass}>
                {filterOptions.severities.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Action footer */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
        <div className="text-[11px] text-stone-500">
          <span>Active Query: </span>
          <span className="text-stone-800 font-semibold">{criteria.park}</span>
          <span className="text-stone-400 mx-1.5">•</span>
          <span className="text-stone-800 font-semibold">{criteria.dateFrom} to {criteria.dateTo}</span>
          {criteria.incidentType !== 'ALL' && (
            <>
              <span className="text-stone-400 mx-1.5">•</span>
              <span className="text-emerald-800 font-semibold">Type: {criteria.incidentType}</span>
            </>
          )}
          {criteria.zone !== 'ALL' && (
            <>
              <span className="text-stone-400 mx-1.5">•</span>
              <span className="text-emerald-800 font-semibold">Zone: {criteria.zone}</span>
            </>
          )}
          {criteria.species !== 'ALL' && (
            <>
              <span className="text-stone-400 mx-1.5">•</span>
              <span className="text-emerald-800 font-semibold">Species: {criteria.species}</span>
            </>
          )}
        </div>

        <button
          id="btn-generate-report"
          onClick={handleSubmit}
          disabled={loading || Boolean(validationError)}
          className="px-6 py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white font-semibold text-xs transition disabled:opacity-40 disabled:cursor-not-allowed shadow-xs cursor-pointer whitespace-nowrap self-end sm:self-auto"
        >
          {loading ? 'Processing Query Pipeline…' : 'Generate Report'}
        </button>
      </div>
    </div>
  );
}
