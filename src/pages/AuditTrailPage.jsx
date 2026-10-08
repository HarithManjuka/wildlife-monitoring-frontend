import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  RefreshCw,
  Search,
  CheckCircle2,
  FileSpreadsheet,
  ShieldAlert,
  ArrowUpRight,
  X,
  Download,
  CheckCircle,
} from 'lucide-react';
import { fetchAuditLogs } from '../services/analyticsService';
import {
  downloadAuditPdf,
  downloadAuditCsv,
} from '../utils/exporters/auditReportBuilder';

export default function AuditTrailPage() {
  const navigate = useNavigate();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [selectedReportModal, setSelectedReportModal] = useState(null);
  const [downloadNotice, setDownloadNotice] = useState(null);

  const loadAuditLogs = async () => {
    setLoading(true);
    setError(null);
    try {
      const records = await fetchAuditLogs(200);
      setLogs(records);
    } catch {
      setError('Failed to load system audit trail logs.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAuditLogs();
  }, []);

  // Filtered and searched logs
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      // Type filter
      if (typeFilter === 'EXPORT' && log.reportType !== 'EXPORT') return false;
      if (typeFilter === 'REPORTS' && log.reportType === 'EXPORT') return false;
      if (
        typeFilter === 'SUCCESS' &&
        !(log.status === 'SUCCESS' || log.status === 'LIMITED_DATA')
      ) {
        return false;
      }

      // Search query
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const matchId = log.reportId?.toLowerCase().includes(q);
      const matchUser = (log.userName || log.userId)?.toLowerCase().includes(q);
      const matchType = log.reportType?.toLowerCase().includes(q);
      const matchStatus = log.status?.toLowerCase().includes(q);
      const matchPark = log.criteria?.park?.toLowerCase().includes(q);

      return matchId || matchUser || matchType || matchStatus || matchPark;
    });
  }, [logs, searchQuery, typeFilter]);

  // Stat counts for page top
  const validQueriesCount = logs.filter(
    (l) => l.status === 'SUCCESS' || l.status === 'LIMITED_DATA'
  ).length;
  const exportCount = logs.filter((l) => l.reportType === 'EXPORT').length;
  const reportCount = logs.filter((l) => l.reportType !== 'EXPORT').length;
  const successRate =
    logs.length > 0 ? Math.round((validQueriesCount / logs.length) * 100) : 100;

  // Handle export action
  const handleDownload = (format, log) => {
    try {
      let filename = '';
      if (format === 'PDF') {
        filename = downloadAuditPdf(log);
      } else {
        filename = downloadAuditCsv(log);
      }
      setDownloadNotice(`Downloaded ${filename} (Summary & Filters)`);
      setTimeout(() => setDownloadNotice(null), 4000);
    } catch {
      setError('Failed to generate export file for logged report.');
    }
  };

  return (
    <div className="space-y-6 max-w-[1700px] mx-auto font-sans pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-100 shadow-2xs">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-stone-900 tracking-tight">
                System Audit Trail
              </h1>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-stone-100 text-stone-700 font-medium border border-stone-200">
                Park Manager
              </span>
            </div>
            <p className="text-stone-500 text-xs mt-0.5">
              Immutable historical log of all report generation, queries, and intelligence export activities
            </p>
          </div>
        </div>

        {/* Top Header Log Counter & Action */}
        <div className="flex items-center gap-3">
          <div className="px-3.5 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 font-semibold text-xs shadow-2xs">
            {logs.length} Total Audit Logs
          </div>
          <button
            onClick={loadAuditLogs}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white hover:bg-stone-50 border border-stone-200 text-stone-700 hover:text-stone-900 text-xs font-medium transition cursor-pointer shadow-2xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl bg-rose-50 border border-rose-200 px-4 py-3 text-sm text-rose-800 font-medium">
          {error}
        </div>
      )}

      {downloadNotice && (
        <div className="flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-xs text-emerald-900 font-medium animate-fadeIn">
          <CheckCircle className="w-4 h-4 text-emerald-700" />
          {downloadNotice}
        </div>
      )}

      {/* Top Stat Badges / Counter Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider">
              Total Logged Records
            </p>
            <p className="text-2xl font-bold text-stone-900 mt-1">{logs.length}</p>
          </div>
          <div className="p-3 rounded-xl bg-stone-100 text-stone-700 border border-stone-200">
            <FileText className="w-5 h-5" />
          </div>
        </div>

        <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider">
              Generated Reports
            </p>
            <p className="text-2xl font-bold text-emerald-900 mt-1">{reportCount}</p>
          </div>
          <div className="p-3 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-sky-700 uppercase tracking-wider">
              Exports Completed
            </p>
            <p className="text-2xl font-bold text-sky-900 mt-1">{exportCount}</p>
          </div>
          <div className="p-3 rounded-xl bg-sky-50 text-sky-700 border border-sky-200">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
        </div>

        <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider">
              Success Rate
            </p>
            <p className="text-2xl font-bold text-emerald-900 mt-1">{successRate}%</p>
          </div>
          <div className="p-3 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200">
            <ShieldAlert className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Main Audit Records Table Card */}
      <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-stone-100">
          <div>
            <h2 className="text-xs font-bold text-stone-900 uppercase tracking-wider">
              Report Generation & Security Access Records
            </h2>
            <p className="text-[11px] text-stone-500 mt-0.5">
              Showing {filteredLogs.length} of {logs.length} logged reports and events
            </p>
          </div>

          {/* Search bar and Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                placeholder="Search by ID, user, type..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 rounded-xl border border-stone-200 bg-stone-50 text-xs text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-1 focus:ring-emerald-700 focus:bg-white w-48 sm:w-60"
              />
            </div>

            <div className="flex items-center gap-1 rounded-xl bg-stone-100 p-1 border border-stone-200">
              {[
                { id: 'ALL', label: `All (${logs.length})` },
                { id: 'REPORTS', label: `Reports (${reportCount})` },
                { id: 'EXPORT', label: `Exports (${exportCount})` },
                { id: 'SUCCESS', label: `Successful (${validQueriesCount})` },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setTypeFilter(tab.id)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition cursor-pointer ${typeFilter === tab.id
                      ? 'bg-emerald-800 text-white shadow-2xs'
                      : 'text-stone-600 hover:text-stone-900 hover:bg-white/60'
                    }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>

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
                <th className="py-2.5 px-3 text-right">Action (View & Export)</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" className="py-8 text-center text-stone-400">
                    Loading audit trail records…
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-8 text-center text-stone-400">
                    {searchQuery
                      ? 'No logged records matched your search query.'
                      : 'No audit events recorded yet.'}
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log, idx) => (
                  <tr
                    key={log.reportId + idx}
                    className="border-b border-stone-100 hover:bg-stone-50/70 transition-colors"
                  >
                    <td className="py-2.5 px-3 font-mono text-emerald-800 font-semibold text-[11px]">
                      {log.reportId}
                    </td>
                    <td className="py-2.5 px-3 text-stone-600 font-mono text-[11px]">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 text-stone-800 font-medium">
                      {log.userName || log.userId}
                    </td>
                    <td className="py-2.5 px-3 text-stone-800 font-medium">
                      {log.reportType}
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${log.status === 'SUCCESS' || log.status === 'LIMITED_DATA'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : 'bg-amber-50 text-amber-800 border-amber-200'
                          }`}
                      >
                        {log.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right text-stone-700 font-mono font-medium">
                      {log.recordCount ?? '—'}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setSelectedReportModal(log)}
                          className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-semibold text-[11px] cursor-pointer inline-flex items-center gap-1 border border-emerald-200 transition"
                          title="View Report Details (Summary & Filters)"
                        >
                          View Report
                          <ArrowUpRight className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => handleDownload('PDF', log)}
                          className="px-2 py-1 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 hover:text-stone-900 font-semibold text-[10px] cursor-pointer inline-flex items-center gap-1 border border-stone-200 transition"
                          title="Download PDF (Summary & Filters)"
                        >
                          <FileText className="w-3 h-3 text-rose-700" />
                          PDF
                        </button>
                        <button
                          onClick={() => handleDownload('CSV', log)}
                          className="px-2 py-1 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 hover:text-stone-900 font-semibold text-[10px] cursor-pointer inline-flex items-center gap-1 border border-stone-200 transition"
                          title="Download CSV (Summary & Filters)"
                        >
                          <FileSpreadsheet className="w-3 h-3 text-emerald-700" />
                          CSV
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Logged Report Detail Modal with Summary & Filters & Export Buttons */}
      {selectedReportModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/40 backdrop-blur-xs p-4"
          onClick={() => setSelectedReportModal(null)}
        >
          <div
            className="bg-white border border-stone-200 rounded-2xl p-6 w-full max-w-xl shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-stone-900">
                    Report Details — {selectedReportModal.reportId}
                  </h3>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${selectedReportModal.status === 'SUCCESS' ||
                        selectedReportModal.status === 'LIMITED_DATA'
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        : 'bg-amber-50 text-amber-800 border-amber-200'
                      }`}
                  >
                    {selectedReportModal.status}
                  </span>
                </div>
                <p className="text-[11px] text-stone-500 mt-0.5">
                  Audit summary, query parameters, and multi-dimensional filters
                </p>
              </div>
              <button
                onClick={() => setSelectedReportModal(null)}
                className="text-stone-400 hover:text-stone-700 cursor-pointer p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Summary Telemetry */}
            <div>
              <p className="text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-2">
                Executive Report Summary
              </p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-3 rounded-xl bg-stone-50 border border-stone-200">
                  <span className="text-stone-500 text-[11px] block">Report Type</span>
                  <span className="font-semibold text-stone-900 mt-0.5 block">
                    {selectedReportModal.reportType}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-stone-50 border border-stone-200">
                  <span className="text-stone-500 text-[11px] block">Generated By</span>
                  <span className="font-semibold text-stone-900 mt-0.5 block">
                    {selectedReportModal.userName || selectedReportModal.userId}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-stone-50 border border-stone-200">
                  <span className="text-stone-500 text-[11px] block">Timestamp</span>
                  <span className="font-semibold text-stone-900 font-mono text-[11px] mt-0.5 block">
                    {new Date(selectedReportModal.timestamp).toLocaleString()}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-stone-50 border border-stone-200">
                  <span className="text-stone-500 text-[11px] block">Records Logged</span>
                  <span className="font-semibold text-stone-900 mt-0.5 block">
                    {selectedReportModal.recordCount ?? 0} records
                  </span>
                </div>
              </div>
            </div>

            {/* Applied Query Criteria & Filters */}
            <div>
              <p className="text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-2">
                Applied Query Criteria & Filters
              </p>
              <div className="rounded-xl border border-stone-200 bg-stone-50/70 overflow-hidden text-xs">
                <table className="w-full text-left">
                  <tbody>
                    <tr className="border-b border-stone-200">
                      <td className="py-2 px-3 text-stone-500 font-medium w-40">Conservation Park</td>
                      <td className="py-2 px-3 font-semibold text-stone-900">
                        {selectedReportModal.criteria?.park || 'ALL'}
                      </td>
                    </tr>
                    <tr className="border-b border-stone-200">
                      <td className="py-2 px-3 text-stone-500 font-medium">Date Range</td>
                      <td className="py-2 px-3 font-semibold text-stone-900 font-mono text-[11px]">
                        {selectedReportModal.criteria?.dateFrom || 'N/A'} →{' '}
                        {selectedReportModal.criteria?.dateTo || 'N/A'}
                      </td>
                    </tr>
                    <tr className="border-b border-stone-200">
                      <td className="py-2 px-3 text-stone-500 font-medium">Incident Type</td>
                      <td className="py-2 px-3 font-semibold text-stone-900">
                        {selectedReportModal.criteria?.incidentType || 'ALL'}
                      </td>
                    </tr>
                    <tr className="border-b border-stone-200">
                      <td className="py-2 px-3 text-stone-500 font-medium">Severity Threshold</td>
                      <td className="py-2 px-3 font-semibold text-stone-900">
                        {selectedReportModal.criteria?.severity || 'ALL'}
                      </td>
                    </tr>
                    <tr className="border-b border-stone-200">
                      <td className="py-2 px-3 text-stone-500 font-medium">Target Species</td>
                      <td className="py-2 px-3 font-semibold text-stone-900">
                        {selectedReportModal.criteria?.species || 'ALL'}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 text-stone-500 font-medium">Location / Sector</td>
                      <td className="py-2 px-3 font-semibold text-stone-900">
                        {selectedReportModal.criteria?.zone || 'ALL'}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Export and Action buttons */}
            <div className="pt-3 border-t border-stone-100 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => handleDownload('PDF', selectedReportModal)}
                  className="flex-1 py-2 px-3 rounded-xl bg-white hover:bg-stone-50 border border-stone-200 text-stone-800 text-xs font-semibold cursor-pointer transition shadow-2xs inline-flex items-center justify-center gap-1.5"
                >
                  <FileText className="w-3.5 h-3.5 text-rose-700" />
                  Download PDF (Summary & Filters)
                </button>
                <button
                  onClick={() => handleDownload('CSV', selectedReportModal)}
                  className="flex-1 py-2 px-3 rounded-xl bg-white hover:bg-stone-50 border border-stone-200 text-stone-800 text-xs font-semibold cursor-pointer transition shadow-2xs inline-flex items-center justify-center gap-1.5"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
                  Download CSV (Summary & Filters)
                </button>
              </div>

              <div className="flex items-center justify-between pt-1">
                <button
                  onClick={() => {
                    setSelectedReportModal(null);
                    navigate('/analytics');
                  }}
                  className="px-3.5 py-2 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-semibold cursor-pointer transition shadow-2xs inline-flex items-center gap-1.5"
                >
                  Re-run in Analytics
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setSelectedReportModal(null)}
                  className="px-4 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-semibold cursor-pointer transition"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
