import { useState, useEffect, useCallback } from 'react';
import { AlertTriangle, Users, BarChart3, Shield, Radio, FileText, CheckCircle, Clock } from 'lucide-react';

import StatCard from '../components/analytics/StatCard';
import ReportFilterPanel from '../components/analytics/ReportFilterPanel';
import IncidentTrendChart from '../components/analytics/IncidentTrendChart';
import IncidentTypeChart from '../components/analytics/IncidentTypeChart';
import HotspotHeatmap from '../components/analytics/HotspotHeatmap';
import PatrolCoveragePanel from '../components/analytics/PatrolCoveragePanel';
import CommunityQueuePanel from '../components/analytics/CommunityQueuePanel';
import ExportBar from '../components/analytics/ExportBar';

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
  const [summary, setSummary] = useState(null);
  const [report, setReport] = useState(null);
  const [queue, setQueue] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [reportLoading, setReportLoading] = useState(false);
  const [queueLoading, setQueueLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'coverage' | 'queue' | 'audit'
  const [selectedIncidentModal, setSelectedIncidentModal] = useState(null);

  // Generate report callback
  const handleGenerateReport = useCallback(async (criteria) => {
    setReportLoading(true);
    setError(null);
    try {
      const r = await fetchReport(criteria);
      setReport(r);
      // Refresh audit logs after generating report
      fetchAuditLogs().then((logs) => setAuditLogs(logs));
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

    // Fetch Community Conflict Queue 
    setQueueLoading(true);
    fetchCommunityQueue()
      .then((q) => { if (!cancelled) setQueue(q); })
      .catch(() => { })
      .finally(() => { if (!cancelled) setQueueLoading(false); });

    // Fetch Audit Trail logs
    fetchAuditLogs().then((logs) => { if (!cancelled) setAuditLogs(logs); });

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

  const recentIncidentsList = report?.recentIncidents || [];

  return (
    <div className="space-y-6 max-w-[1700px] mx-auto font-sans pb-12">
      {/* Top Header & Navigation Tabs */}
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
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-medium">
                  UC-04 Active
                </span>
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

        {/* Tab switcher */}
        <div className="flex items-center gap-1 rounded-xl bg-stone-100 border border-stone-200 p-1 flex-wrap shadow-2xs">
          {[
            { key: 'overview', label: 'Analytics Dashboard' },
            { key: 'coverage', label: 'Patrol Coverage' },
            { key: 'queue', label: `Community Queue (${queue.length})` },
            { key: 'audit', label: `Audit Trail (${auditLogs.length})` },
          ].map((tab) => (
            <button
              key={tab.key}
              id={`tab-${tab.key}`}
              onClick={() => setActiveTab(tab.key)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${activeTab === tab.key
                  ? 'bg-emerald-800 text-white shadow-2xs'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-white/60'
                }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Global Error Notice */}
      {error && (
        <div className="rounded-xl bg-rose-50 border border-rose-200 px-4 py-3 text-sm text-rose-800 font-medium">
          {error}
        </div>
      )}

      {/* TAB 1: OVERVIEW ANALYTICS */}
      {activeTab === 'overview' && (
        <>
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

          {/* 3. Middle Row: Incident Trend + Hotspot Heatmap */}
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

          {/* Bottom Row: Incidents by Type + Recent Incidents Table */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Section title="Incidents by Category & Threat">
              <IncidentTypeChart byType={report?.byType} loading={reportLoading} />
            </Section>

            <Section
              title="Recent Incident Log"
              action={
                <span className="text-[11px] text-stone-500 font-mono font-medium">
                  {recentIncidentsList.length} records retrieved
                </span>
              }
            >
              <div className="overflow-x-auto rounded-xl border border-stone-200 bg-white">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="border-b border-stone-200 bg-stone-50 text-stone-600 font-semibold uppercase tracking-wider text-[10px]">
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Type</th>
                      <th className="py-2.5 px-3">Location</th>
                      <th className="py-2.5 px-3">Severity</th>
                      <th className="py-2.5 px-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentIncidentsList.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="py-6 text-center text-stone-400">
                          No incidents logged for the selected period.
                        </td>
                      </tr>
                    ) : (
                      recentIncidentsList.map((inc) => (
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
            </Section>
          </div>

          {/*Export Action Bar  */}
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
      )}

      {/* TAB 2: PATROL COVERAGE ONLY*/}
      {activeTab === 'coverage' && (
        <Section
          title="Patrol Coverage Analysis"
          action={
            <span className="text-xs text-stone-500 font-medium">
              Evaluates ranger patrol distribution against protected sectors
            </span>
          }
        >
          <PatrolCoveragePanel coverage={report?.patrolCoverage} loading={reportLoading} />
        </Section>
      )}

      {/*TAB 3: COMMUNITY CONFLICT QUEUE*/}
      {activeTab === 'queue' && (
        <Section
          title="Community Conflict Queue"
          action={
            <span className="text-xs text-stone-500 font-medium">
              {queue.length} reports · Integrated from UC-03 (A.M.H.M. Abeykoon)
            </span>
          }
        >
          <CommunityQueuePanel reports={queue} loading={queueLoading} />
        </Section>
      )}

      {/*TAB 4: SYSTEM AUDIT TRAIL*/}
      {activeTab === 'audit' && (
        <Section
          title="System Audit Trail"
          action={
            <span className="text-xs text-stone-500 font-mono font-medium">
              {auditLogs.length} audit entries captured
            </span>
          }
        >
          <div className="space-y-3">
            <p className="text-xs text-stone-600">
              Every conservation analytics report generation and export activity is logged to the system audit trail for compliance and risk monitoring.
            </p>

            <div className="overflow-x-auto rounded-xl border border-stone-200 bg-white">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-stone-200 bg-stone-50 text-stone-600 font-semibold uppercase tracking-wider text-[10px]">
                    <th className="py-2.5 px-3">Report ID</th>
                    <th className="py-2.5 px-3">Timestamp</th>
                    <th className="py-2.5 px-3">Generated By</th>
                    <th className="py-2.5 px-3">Report Type</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3 text-right">Records</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLogs.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="py-6 text-center text-stone-400">
                        No audit events recorded yet. Generate a report to view audit logs.
                      </td>
                    </tr>
                  ) : (
                    auditLogs.map((log, idx) => (
                      <tr key={log.reportId + idx} className="border-b border-stone-100 hover:bg-stone-50/70">
                        <td className="py-2.5 px-3 font-mono text-emerald-800 font-semibold text-[11px]">{log.reportId}</td>
                        <td className="py-2.5 px-3 text-stone-600 font-mono text-[11px]">
                          {new Date(log.timestamp).toLocaleString()}
                        </td>
                        <td className="py-2.5 px-3 text-stone-800 font-medium">{log.userName || log.userId}</td>
                        <td className="py-2.5 px-3 text-stone-800 font-medium">{log.reportType}</td>
                        <td className="py-2.5 px-3">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${log.status === 'SUCCESS'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : 'bg-amber-50 text-amber-800 border-amber-200'
                            }`}>
                            {log.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right text-stone-700 font-mono font-medium">{log.recordCount ?? '—'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </Section>
      )}

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
                className="text-stone-400 hover:text-stone-700 text-lg font-bold cursor-pointer"
              >
                ×
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
    </div>
  );
}
