import { useState, useEffect, useCallback, useMemo, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import {
  AlertTriangle,
  Users,
  BarChart3,
  Shield,
  Radio,
  FileText,
  FileSpreadsheet,
  Search,
  X,
  ArrowUpRight,
  RefreshCw,
  SlidersHorizontal,
} from 'lucide-react';

import StatCard from '../components/analytics/StatCard';
import ReportFilterPanel from '../components/analytics/ReportFilterPanel';
import IncidentTrendChart from '../components/analytics/IncidentTrendChart';
import IncidentTypeChart from '../components/analytics/IncidentTypeChart';
import HotspotHeatmap from '../components/analytics/HotspotHeatmap';
import ExportBar from '../components/analytics/ExportBar';
import { downloadAuditPdf, downloadAuditCsv } from '../utils/exporters/auditReportBuilder';

import {
  fetchDashboardSummary,
  fetchReport,
  fetchCommunityQueue,
  fetchAuditLogs,
} from '../services/analyticsService';

function Section({ title, children, action, className = '' }) {
  return (
    <div className={`rounded-2xl border border-stone-200 bg-white p-6 shadow-xs ${className}`}>
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-stone-100">
        <h2 className="text-xs font-bold text-stone-900 uppercase tracking-wider">{title}</h2>
        {action}
      </div>
      {children}
    </div>
  );
}

const SEVERITY_BADGE = {
  CRITICAL: 'bg-rose-50 text-rose-800 border-rose-200',
  HIGH: 'bg-orange-50 text-orange-800 border-orange-200',
  MEDIUM: 'bg-amber-50 text-amber-800 border-amber-200',
  LOW: 'bg-emerald-50 text-emerald-800 border-emerald-200',
};

export default function AnalyticsDashboard() {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const [summary, setSummary] = useState(null);
  const [report, setReport] = useState(null);
  const [queue, setQueue] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [reportLoading, setReportLoading] = useState(false);
  const [error, setError] = useState(null);

  // Search & display states for incident records
  const [recordSearch, setRecordSearch] = useState('');
  const [showAllRecords, setShowAllRecords] = useState(true);
  const [selectedIncidentModal, setSelectedIncidentModal] = useState(null);

  // Logged reports modal
  const [showLoggedReportsModal, setShowLoggedReportsModal] = useState(false);
  const [loggedReportSearch, setLoggedReportSearch] = useState('');

  // Generate report callback
  const handleGenerateReport = useCallback(async (criteria) => {
    setReportLoading(true);
    setError(null);
    try {
      const r = await fetchReport(criteria);
      setReport({ ...r, criteria });
      // Refresh audit logs after generating report
      fetchAuditLogs(200).then((logs) => setAuditLogs(logs));
    } catch {
      setError('Could not generate the conservation report. Please check query filters.');
    } finally {
      setReportLoading(false);
    }
  }, []);

  // Initial mount initialization
  useEffect(() => {
    let cancelled = false;

    // Fetch KPI Summary telemetry
    setSummaryLoading(true);
    fetchDashboardSummary('ALL')
      .then((s) => { if (!cancelled) setSummary(s); })
      .catch(() => { })
      .finally(() => { if (!cancelled) setSummaryLoading(false); });

    // Fetch Community Conflict Queue count
    fetchCommunityQueue()
      .then((q) => { if (!cancelled) setQueue(q); })
      .catch(() => { });

    // Fetch Audit Trail logs
    fetchAuditLogs(200).then((logs) => { if (!cancelled) setAuditLogs(logs); });

    // Initial default report load using dynamic current window
    const today = new Date().toISOString().slice(0, 10);
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
    handleGenerateReport({
      park: 'ALL',
      dateFrom: thirtyDaysAgo,
      dateTo: today,
      reportType: 'INCIDENT_ANALYSIS',
      incidentType: 'ALL',
      severity: 'ALL',
      species: 'ALL',
      zone: 'ALL',
    });

    return () => { cancelled = true; };
  }, [handleGenerateReport]);

  // Stat card telemetry
  const statCards = [
    {
      icon: AlertTriangle,
      label: 'Total Incidents',
      value: summary?.totalIncidents ?? (report?.totalIncidents ?? 0),
      color: 'rose',
    },
    {
      icon: Shield,
      label: 'Patrol Coverage',
      value: `${summary?.patrolCoverage ?? (report?.patrolCoverage?.coverageScore ?? 0)}%`,
      color: 'emerald',
    },
    {
      icon: Users,
      label: 'Human-Wildlife Conflicts',
      value: summary?.humanWildlifeConflicts ?? (queue?.length ?? 0),
      color: 'sky',
    },
    {
      icon: Radio,
      label: 'High-Risk Alerts',
      value: summary?.activeAlerts ?? 0,
      color: 'amber',
    },
  ];

  // All retrieved incidents
  const allIncidents = report?.recentIncidents || [];

  // Filter incidents by search
  const filteredIncidents = useMemo(() => {
    if (!recordSearch.trim()) return allIncidents;
    const q = recordSearch.toLowerCase();
    return allIncidents.filter((inc) =>
      inc.id?.toLowerCase().includes(q) ||
      inc.type?.toLowerCase().includes(q) ||
      inc.location?.toLowerCase().includes(q) ||
      inc.severity?.toLowerCase().includes(q) ||
      inc.ranger?.toLowerCase().includes(q) ||
      inc.date?.includes(q)
    );
  }, [allIncidents, recordSearch]);

  // Displayed records depending on toggle
  const displayedIncidents = showAllRecords
    ? filteredIncidents
    : filteredIncidents.slice(0, 10);

  // Filtered logged reports in modal
  const filteredLoggedReports = useMemo(() => {
    if (!loggedReportSearch.trim()) return auditLogs;
    const q = loggedReportSearch.toLowerCase();
    return auditLogs.filter((log) =>
      log.reportId?.toLowerCase().includes(q) ||
      log.reportType?.toLowerCase().includes(q) ||
      (log.userName || log.userId)?.toLowerCase().includes(q) ||
      log.criteria?.park?.toLowerCase().includes(q) ||
      log.status?.toLowerCase().includes(q)
    );
  }, [auditLogs, loggedReportSearch]);

  return (
    <div className="space-y-6 max-w-[1700px] mx-auto font-sans pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 pb-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-100 shadow-2xs">
              <BarChart3 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-stone-900 tracking-tight">
                  Conservation Analytics Reports
                </h1>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-stone-100 text-stone-700 font-medium border border-stone-200">
                  Park Manager
                </span>
              </div>
              <p className="text-stone-500 text-xs mt-0.5">
                Evidence-Based Conservation Intelligence & Regulatory Audit Trail Matrix
              </p>
            </div>
          </div>
        </div>

        {/* Top Header Actions */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setShowLoggedReportsModal(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white hover:bg-stone-50 border border-stone-200 text-stone-700 hover:text-stone-900 text-xs font-semibold cursor-pointer transition shadow-2xs"
          >
            <FileText className="w-4 h-4 text-emerald-800" />
            View Logged Reports ({auditLogs.length})
          </button>
        </div>
      </div>

      {/* Global Error Notice */}
      {error && (
        <div className="rounded-xl bg-rose-50 border border-rose-200 px-4 py-3 text-sm text-rose-800 font-medium">
          {error}
        </div>
      )}

      {/* OVERVIEW ANALYTICS WORKSPACE */}
      <>
        {/* Stat Cards (Telemetry summary) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((card) => (
            <StatCard
              key={card.label}
              icon={card.icon}
              label={card.label}
              value={card.value}
              color={card.color}
              loading={summaryLoading}
            />
          ))}
        </div>

        {/* Filter Selection & Validation Screen */}
        <ReportFilterPanel onGenerate={handleGenerateReport} loading={reportLoading} />

        {/* Alternative Flow: No Incidents Found */}
        {report?.warning && (
          <div className="flex items-center gap-3 p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800">
            <AlertTriangle className="w-4 h-4 text-amber-700 flex-shrink-0" />
            <div>
              <span className="font-semibold">{report.warning}</span>
              <span className="block text-amber-700 text-[11px] mt-0.5">
                Try widening the date range, selecting "ALL" parks, or relaxing severity filters.
              </span>
            </div>
          </div>
        )}

        {/* Middle Row: Incident Trend + Hotspot Heatmap */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Section
            title="Incident Trend & Collar Alerts"
            action={
              <span className="text-[10px] text-stone-500 font-mono font-medium">
                Weekly Aggregate Series
              </span>
            }
          >
            <IncidentTrendChart data={report?.trend} loading={reportLoading} />
          </Section>

          <Section
            title="Hotspot Map & Incident Density"
            action={
              <span className="text-[10px] text-stone-500 font-mono font-medium">
                Geospatial Sectors
              </span>
            }
          >
            <HotspotHeatmap hotspots={report?.hotspots} loading={reportLoading} />
          </Section>
        </div>

        {/* Bottom Row: Incidents by Type + Searchable Incident Records */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Section title="Incidents by Category & Threat">
            <IncidentTypeChart byType={report?.byType} loading={reportLoading} />
          </Section>

          <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-stone-100">
                <div>
                  <h2 className="text-xs font-bold text-stone-900 uppercase tracking-wider">
                    Conservation Incident Records Log
                  </h2>
                  <p className="text-[11px] text-stone-500 mt-0.5">
                    Showing {displayedIncidents.length} of {allIncidents.length} retrieved incident records
                  </p>
                </div>

                {/* Search Bar & View Mode Toggle */}
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-2.5" />
                    <input
                      type="text"
                      placeholder="Search records..."
                      value={recordSearch}
                      onChange={(e) => setRecordSearch(e.target.value)}
                      className="pl-8 pr-3 py-1 rounded-xl border border-stone-200 bg-stone-50 text-xs text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-1 focus:ring-emerald-700 focus:bg-white w-36 sm:w-44"
                    />
                  </div>

                  <button
                    onClick={() => setShowAllRecords((prev) => !prev)}
                    className="px-2.5 py-1 rounded-lg border border-stone-200 bg-stone-50 hover:bg-stone-100 text-stone-700 text-[11px] font-semibold transition cursor-pointer"
                  >
                    {showAllRecords ? 'Show Top 10' : `Show All (${filteredIncidents.length})`}
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto rounded-xl border border-stone-200 bg-white max-h-[360px] overflow-y-auto">
                <table className="w-full text-xs text-left">
                  <thead className="sticky top-0 bg-stone-50 z-10">
                    <tr className="border-b border-stone-200 text-stone-600 font-semibold uppercase tracking-wider text-[10px]">
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Type</th>
                      <th className="py-2.5 px-3">Location</th>
                      <th className="py-2.5 px-3">Severity</th>
                      <th className="py-2.5 px-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayedIncidents.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="py-6 text-center text-stone-400">
                          {recordSearch ? 'No records match search term.' : 'No incidents logged for the selected period.'}
                        </td>
                      </tr>
                    ) : (
                      displayedIncidents.map((inc) => (
                        <tr key={inc.id} className="border-b border-stone-100 hover:bg-stone-50/70 transition-colors">
                          <td className="py-2.5 px-3 text-stone-600 font-mono text-[11px]">{inc.date}</td>
                          <td className="py-2.5 px-3 text-stone-900 font-medium">{inc.type}</td>
                          <td className="py-2.5 px-3 text-stone-600 truncate max-w-[130px]">{inc.location}</td>
                          <td className="py-2.5 px-3">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${SEVERITY_BADGE[inc.severity] || SEVERITY_BADGE.LOW}`}>
                              {inc.severity}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <button
                              onClick={() => setSelectedIncidentModal(inc)}
                              className="text-emerald-800 hover:text-emerald-950 font-semibold text-[11px] cursor-pointer"
                            >
                              View Details
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {allIncidents.length > 10 && !showAllRecords && (
              <div className="mt-3 pt-3 border-t border-stone-100 text-center">
                <button
                  onClick={() => setShowAllRecords(true)}
                  className="text-emerald-800 hover:text-emerald-950 text-xs font-semibold cursor-pointer"
                >
                  View all {allIncidents.length} incident records →
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Export Action Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl border border-stone-200 bg-white shadow-xs">
          <div>
            <p className="text-xs font-semibold text-stone-900">Export Analytics Report</p>
            <p className="text-[11px] text-stone-500 mt-0.5">
              Generate formatted reports for park warden meetings and conservation stakeholders.
            </p>
          </div>
          <ExportBar report={report} />
        </div>
      </>

      {/* Incident Detail Modal */}
      {selectedIncidentModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/40 backdrop-blur-xs p-4"
          onClick={() => setSelectedIncidentModal(null)}
        >
          <div
            className="bg-white border border-stone-200 rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <h3 className="text-sm font-bold text-stone-900">Incident Details — {selectedIncidentModal.id}</h3>
              <button
                onClick={() => setSelectedIncidentModal(null)}
                className="text-stone-400 hover:text-stone-700 cursor-pointer p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-2 text-xs text-stone-700">
              <div className="flex justify-between py-1.5 border-b border-stone-100">
                <span className="text-stone-500 font-medium">Incident Type</span>
                <span className="font-semibold text-stone-900">{selectedIncidentModal.type}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-stone-100">
                <span className="text-stone-500 font-medium">Location</span>
                <span className="font-semibold text-stone-900">{selectedIncidentModal.location}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-stone-100">
                <span className="text-stone-500 font-medium">Severity</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${SEVERITY_BADGE[selectedIncidentModal.severity] || SEVERITY_BADGE.LOW}`}>
                  {selectedIncidentModal.severity}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-stone-100">
                <span className="text-stone-500 font-medium">Field Ranger</span>
                <span className="font-semibold text-stone-900">{selectedIncidentModal.ranger || 'Field Ranger'}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-stone-100">
                <span className="text-stone-500 font-medium">Date Logged</span>
                <span className="font-semibold text-stone-900">{selectedIncidentModal.date}</span>
              </div>
            </div>
            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedIncidentModal(null)}
                className="px-4 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-semibold cursor-pointer transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Logged Reports Modal */}
      {showLoggedReportsModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/40 backdrop-blur-xs p-4"
          onClick={() => setShowLoggedReportsModal(false)}
        >
          <div
            className="bg-white border border-stone-200 rounded-2xl p-6 w-full max-w-2xl shadow-2xl space-y-4 max-h-[85vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-stone-900">
                  Logged Conservation Reports ({auditLogs.length})
                </h3>
                <p className="text-xs text-stone-500 mt-0.5">
                  Historical report generations and intelligence queries logged in audit trail
                </p>
              </div>
              <button
                onClick={() => setShowLoggedReportsModal(false)}
                className="text-stone-400 hover:text-stone-700 cursor-pointer p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Search Bar */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search logged reports by ID, type, user, or status..."
                  value={loggedReportSearch}
                  onChange={(e) => setLoggedReportSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-stone-200 bg-stone-50 text-xs text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-1 focus:ring-emerald-700 focus:bg-white"
                />
              </div>
            </div>

            {/* List of Logged Reports */}
            <div className="overflow-y-auto space-y-2.5 flex-1 pr-1">
              {filteredLoggedReports.length === 0 ? (
                <div className="py-12 text-center text-stone-400 text-xs">
                  {loggedReportSearch ? 'No logged reports match search criteria.' : 'No logged reports recorded yet.'}
                </div>
              ) : (
                filteredLoggedReports.map((log, idx) => (
                  <div
                    key={log.reportId + idx}
                    className="p-3.5 rounded-xl border border-stone-200 hover:border-emerald-200 hover:bg-emerald-50/20 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-emerald-800">{log.reportId}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          log.status === 'SUCCESS' || log.status === 'SUFFICIENT_DATA'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : log.status === 'LIMITED_DATA'
                            ? 'bg-amber-50 text-amber-800 border-amber-200'
                            : 'bg-rose-50 text-rose-800 border-rose-200'
                        }`}>
                          {log.status}
                        </span>
                        <span className="text-[11px] text-stone-500 font-medium">
                          {log.reportType}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-stone-500">
                        <span>Generated by: <strong className="text-stone-700">{log.userName || log.userId}</strong></span>
                        <span>Date: <strong className="text-stone-700">{new Date(log.timestamp).toLocaleDateString()}</strong></span>
                        <span>Records: <strong className="text-stone-700">{log.recordCount ?? 0}</strong></span>
                      </div>
                      {log.criteria && (
                        <div className="text-[10px] text-stone-500 font-mono">
                          Park: {log.criteria.park || 'ALL'} | Range: {log.criteria.dateFrom || 'N/A'} → {log.criteria.dateTo || 'N/A'}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 self-end sm:self-center">
                      <button
                        onClick={() => downloadAuditPdf(log, user)}
                        className="px-2 py-1 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 text-[10px] font-semibold cursor-pointer transition inline-flex items-center gap-1 border border-stone-200"
                        title="Download PDF Report (Summary & Filters)"
                      >
                        <FileText className="w-3 h-3 text-rose-700" />
                        PDF
                      </button>
                      <button
                        onClick={() => downloadAuditCsv(log, user)}
                        className="px-2 py-1 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 text-[10px] font-semibold cursor-pointer transition inline-flex items-center gap-1 border border-stone-200"
                        title="Download CSV Report (Summary & Filters)"
                      >
                        <FileSpreadsheet className="w-3 h-3 text-emerald-700" />
                        CSV
                      </button>
                      {log.criteria && log.reportType !== 'EXPORT' && (
                        <button
                          onClick={() => {
                            handleGenerateReport(log.criteria);
                            setShowLoggedReportsModal(false);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-emerald-800 hover:bg-emerald-900 text-white text-[11px] font-semibold cursor-pointer transition shadow-2xs inline-flex items-center gap-1"
                        >
                          Load Criteria
                          <ArrowUpRight className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="pt-3 border-t border-stone-100 flex items-center justify-between">
              <button
                onClick={() => {
                  setShowLoggedReportsModal(false);
                  navigate('/audit-trail');
                }}
                className="text-xs font-semibold text-emerald-800 hover:text-emerald-950 cursor-pointer inline-flex items-center gap-1"
              >
                Go to Full Audit Trail Page →
              </button>
              <button
                onClick={() => setShowLoggedReportsModal(false)}
                className="px-4 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-semibold cursor-pointer transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
