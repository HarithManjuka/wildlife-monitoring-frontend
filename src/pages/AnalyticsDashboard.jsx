import { useState, useEffect, useCallback } from 'react';
import { AlertTriangle, Users, BarChart3, Shield } from 'lucide-react';

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
} from '../services/analyticsService';

// Section wrapper 
function Section({ title, children, action }) {
  return (
    <div className="rounded-2xl border border-stone-700/40 bg-stone-900/60 backdrop-blur-sm p-6">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-sm font-bold text-stone-200 uppercase tracking-widest">{title}</h2>
        {action}
      </div>
      {children}
    </div>
  );
}

// Main Page 
export default function AnalyticsDashboard() {
  const [summary, setSummary] = useState(null);
  const [report, setReport] = useState(null);
  const [queue, setQueue] = useState([]);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [reportLoading, setReportLoading] = useState(false);
  const [queueLoading, setQueueLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'queue'

  // Load summary KPIs on mount
  useEffect(() => {
    let cancelled = false;
    setSummaryLoading(true);
    fetchDashboardSummary('ALL')
      .then((s) => { if (!cancelled) setSummary(s); })
      .catch(() => { if (!cancelled) setError('Failed to load dashboard summary.'); })
      .finally(() => { if (!cancelled) setSummaryLoading(false); });
    return () => { cancelled = true; };
  }, []);

  // Load community queue on mount
  useEffect(() => {
    let cancelled = false;
    setQueueLoading(true);
    fetchCommunityQueue()
      .then((q) => { if (!cancelled) setQueue(q); })
      .catch(() => { if (!cancelled) setQueue([]); })
      .finally(() => { if (!cancelled) setQueueLoading(false); });
    return () => { cancelled = true; };
  }, []);

  // Generate report when the user clicks "Generate Report"
  const handleGenerateReport = useCallback(async (criteria) => {
    setReportLoading(true);
    setError(null);
    try {
      const r = await fetchReport(criteria);
      setReport(r);
    } catch {
      setError('Could not generate the report. Please try again.');
    } finally {
      setReportLoading(false);
    }
  }, []);

  // Auto-generate initial report on mount
  useEffect(() => {
    handleGenerateReport({
      park: 'ALL',
      dateFrom: new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10),
      dateTo: new Date().toISOString().slice(0, 10),
      reportType: 'INCIDENT_ANALYSIS',
      incidentType: 'ALL',
      severity: 'ALL',
    });
  }, [handleGenerateReport]);

  // Stat card definitions 
  const statCards = [
    { icon: AlertTriangle, label: 'Total Incidents', value: summary?.totalIncidents, color: 'rose', delta: undefined },
    { icon: Shield, label: 'Active GPS Alerts', value: summary?.activeAlerts, color: 'amber', delta: undefined },
    { icon: Users, label: 'Community Reports', value: summary?.communityReports, color: 'sky', delta: undefined },
    { icon: BarChart3, label: 'Active Hotspots', value: summary?.activeHotspots, color: 'emerald', delta: undefined },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Conservation Analytics</h1>
          <p className="text-stone-500 text-sm mt-0.5">UC-04 · Park Manager View · Data from all field modules</p>
        </div>
        {/* Tab switcher */}
        <div className="flex gap-1 rounded-xl bg-stone-800 p-1">
          {[
            { key: 'overview', label: 'Analytics' },
            { key: 'queue', label: `Queue${queue.length ? ` (${queue.length})` : ''}` },
          ].map((tab) => (
            <button
              key={tab.key}
              id={`tab-${tab.key}`}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition ${activeTab === tab.key
                ? 'bg-emerald-700 text-white'
                : 'text-stone-400 hover:text-stone-200'
                }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="rounded-xl bg-rose-900/30 border border-rose-700/40 px-4 py-3 text-sm text-rose-300">
          {error}
        </div>
      )}

      {/* ANALYTICS TAB */}
      {activeTab === 'overview' && (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {statCards.map((card) => (
              <StatCard
                key={card.label}
                icon={card.icon}
                label={card.label}
                value={card.value}
                delta={card.delta}
                color={card.color}
                loading={summaryLoading}
              />
            ))}
          </div>

          {/* Filter Panel */}
          <ReportFilterPanel onGenerate={handleGenerateReport} loading={reportLoading} />

          {/* Charts Row 1: Trend + Type */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Section title="Incident Trend">
              <IncidentTrendChart data={report?.trend} loading={reportLoading} />
            </Section>
            <Section title="Incidents by Type">
              <IncidentTypeChart byType={report?.byType} loading={reportLoading} />
            </Section>
          </div>

          {/* Charts Row 2: Hotspot + Patrol Coverage */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Section title="Hotspot Heatmap">
              <HotspotHeatmap hotspots={report?.hotspots} loading={reportLoading} />
            </Section>
            <Section title="Patrol Coverage Analysis">
              <PatrolCoveragePanel coverage={report?.patrolCoverage} loading={reportLoading} />
            </Section>
          </div>

          {/* Export Bar */}
          {report && (
            <Section title="Export Report" action={<ExportBar report={report} />}>
              <p className="text-xs text-stone-500">
                Report generated for <span className="text-stone-300 font-semibold">{report.reportType?.replace(/_/g, ' ')}</span>.
                Total incidents recorded: <span className="text-stone-300 font-semibold">{report.totalIncidents}</span>.
              </p>
            </Section>
          )}
        </>
      )}

      {/* QUEUE TAB*/}
      {activeTab === 'queue' && (
        <Section title="Community Conflict Queue" action={
          <span className="text-xs text-stone-500">{queue.length} reports · Source: UC-03 (A.M.H.M. Abeykoon)</span>
        }>
          <CommunityQueuePanel reports={queue} loading={queueLoading} />
        </Section>
      )}
    </div>
  );
}
