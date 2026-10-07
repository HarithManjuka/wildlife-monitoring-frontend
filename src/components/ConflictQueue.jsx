import React, { useState, useEffect, useCallback, useContext, useMemo } from 'react';
import {
  AlertTriangle,
  Send,
  RefreshCw,
  Clock,
  MapPin,
  UserPlus,
  ShieldCheck,
  Search,
  ChevronRight,
  Radio,
  CheckCircle2,
} from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import api from '../utils/api';

/**
 * ConflictQueue Component (UC-03)
 * Operates in two modes:
 * 1. Controlled mode (embedded in ConflictsDashboard): receives reports, selectedReportId, onSelectReport.
 * 2. Standalone mode: fetches reports independently with built-in SMS simulator.
 */
export default function ConflictQueue({
  reports: controlledReports = null,
  selectedReportId = null,
  onSelectReport = null,
  loading: controlledLoading = null,
  onRefresh = null,
}) {
  const { user } = useContext(AuthContext);

  // Internal state for standalone mode
  const [internalReports, setInternalReports] = useState([]);
  const [internalLoading, setInternalLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastRefreshed, setLastRefreshed] = useState(null);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [threatFilter, setThreatFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Standalone SMS Simulator state
  const [smsSender, setSmsSender] = useState('+94775551234');
  const [smsVillage, setSmsVillage] = useState('Habarana South');
  const [smsMessage, setSmsMessage] = useState('Elephant herd crossing paddy fields near electric fence');
  const [smsSending, setSmsSending] = useState(false);
  const [smsFeedback, setSmsFeedback] = useState(null);

  // Standalone Ranger assignment state
  const [assigningId, setAssigningId] = useState(null);
  const [rangerInput, setRangerInput] = useState('Ranger Unit Alpha');
  const [assignSubmitting, setAssignSubmitting] = useState(false);
  const [actionSuccess, setActionSuccess] = useState(null);

  const isControlled = controlledReports !== null;
  const reports = isControlled ? controlledReports : internalReports;
  const loading = isControlled ? controlledLoading : internalLoading;
  const canAssign = user?.role === 'LIAISON_OFFICER';

  const fetchQueue = useCallback(async () => {
    if (isControlled && onRefresh) {
      onRefresh();
      return;
    }
    setInternalLoading(true);
    setError(null);
    try {
      const res = await api.get('/conflicts/queue');
      setInternalReports(res.data.reports || []);
      setLastRefreshed(new Date().toLocaleTimeString());
    } catch (err) {
      setError(err.message || 'Failed to fetch conflict triage queue.');
    } finally {
      setInternalLoading(false);
    }
  }, [isControlled, onRefresh]);

  useEffect(() => {
    if (!isControlled) {
      let active = true;
      api.get('/conflicts/queue')
        .then((res) => {
          if (active) {
            setInternalReports(res.data.reports || []);
            setLastRefreshed(new Date().toLocaleTimeString());
          }
        })
        .catch((err) => {
          if (active) {
            setError(err.message || 'Failed to fetch conflict triage queue.');
          }
        });
      return () => {
        active = false;
      };
    }
  }, [isControlled]);

  // Filter logic
  const filteredReports = useMemo(() => {
    return reports.filter((r) => {
      if (threatFilter !== 'ALL' && r.threatLevel !== threatFilter) {
        return false;
      }
      if (statusFilter !== 'ALL' && r.status !== statusFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesId = r.id?.toLowerCase().includes(query);
        const matchesVillage = r.village?.toLowerCase().includes(query);
        const matchesDesc = r.description?.toLowerCase().includes(query);
        const matchesContact = (r.contact || r.sender)?.toLowerCase().includes(query);
        return matchesId || matchesVillage || matchesDesc || matchesContact;
      }
      return true;
    });
  }, [reports, threatFilter, statusFilter, searchQuery]);

  // Standalone SMS submission
  const handleSendSms = async (e) => {
    e.preventDefault();
    setSmsSending(true);
    setSmsFeedback(null);
    try {
      const res = await api.post('/conflicts/sms', {
        sender: smsSender,
        village: smsVillage,
        message: smsMessage,
      });

      setSmsFeedback({
        type: 'success',
        text: `SMS ingested: ID ${res.data.report?.id || 'queued'}`,
      });
      setSmsMessage('');
      fetchQueue();
    } catch (err) {
      setSmsFeedback({
        type: 'error',
        text: err.message || 'SMS transmission failed',
      });
    } finally {
      setSmsSending(false);
    }
  };

  // Standalone Assign Ranger
  const handleAssignRanger = async (reportId) => {
    setAssignSubmitting(true);
    setActionSuccess(null);
    try {
      await api.put(`/conflicts/${reportId}/assign`, {
        rangerName: rangerInput,
      });
      setActionSuccess(`Assigned ${rangerInput} to ${reportId}`);
      setAssigningId(null);
      fetchQueue();
    } catch (err) {
      setError(err.message || 'Failed to assign ranger.');
    } finally {
      setAssignSubmitting(false);
    }
  };

  // CONTROLLED MODE (Embedded in ConflictsDashboard Left Column)
  if (isControlled) {
    return (
      <div className="flex flex-col gap-3.5 h-full">
        {/* Panel Header */}
        <div className="flex items-center justify-between pb-2 border-b border-stone-100">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-stone-900 uppercase tracking-wider">
              Active Incident Queue
            </h2>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-stone-100 text-stone-700 font-mono font-medium">
              {filteredReports.length} of {reports.length}
            </span>
          </div>
          <div className="text-[11px] text-stone-500 font-mono">
            Auto-sync active
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search village, ID, phone..."
            className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-stone-50 border border-stone-200 text-stone-900 placeholder-stone-400 text-xs focus:outline-none focus:border-emerald-700 focus:bg-white transition"
          />
        </div>

        {/* Threat Filter */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px]">
          <span className="text-[10px] text-stone-400 uppercase font-semibold">Threat:</span>
          {['ALL', 'Critical', 'High', 'Medium', 'Low'].map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setThreatFilter(t)}
              className={`px-2.5 py-1 rounded-lg font-medium transition cursor-pointer whitespace-nowrap ${
                threatFilter === t
                  ? 'bg-stone-900 text-white'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px]">
          <span className="text-[10px] text-stone-400 uppercase font-semibold">Status:</span>
          {['ALL', 'Pending Dispatch', 'Ranger Assigned', 'Triaged', 'Dismissed'].map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatusFilter(s)}
              className={`px-2 py-0.5 rounded-lg text-[10px] font-medium transition cursor-pointer whitespace-nowrap ${
                statusFilter === s
                  ? 'bg-emerald-800 text-white'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              {s === 'Pending Dispatch' ? 'Pending' : s}
            </button>
          ))}
        </div>

        {/* Queue List Stream */}
        <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-2.5">
          {loading && reports.length === 0 ? (
            <div className="p-8 text-center text-xs text-stone-400 flex flex-col items-center justify-center gap-2">
              <RefreshCw className="w-5 h-5 animate-spin text-emerald-700" />
              <span>Loading incident stream...</span>
            </div>
          ) : filteredReports.length === 0 ? (
            <div className="p-8 text-center text-xs text-stone-400 bg-stone-50 rounded-xl border border-stone-100">
              No incidents matching current criteria.
            </div>
          ) : (
            filteredReports.map((report) => {
              const isSelected = selectedReportId === report.id;
              const isAssigned = Boolean(report.dispatchedRanger);
              const isCritical = report.threatLevel === 'Critical';
              const isHigh = report.threatLevel === 'High';
              const isMedium = report.threatLevel === 'Medium';

              return (
                <div
                  key={report.id}
                  onClick={() => onSelectReport && onSelectReport(report)}
                  className={`p-3.5 rounded-xl border transition cursor-pointer text-left flex flex-col gap-2 relative ${
                    isSelected
                      ? 'bg-emerald-50/50 border-emerald-600 shadow-xs ring-1 ring-emerald-600/30'
                      : 'bg-stone-50/70 hover:bg-white border-stone-200 hover:border-stone-300'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-[11px] font-bold text-stone-800 bg-white px-1.5 py-0.5 rounded border border-stone-200">
                        {report.id}
                      </span>
                      <span className="font-semibold text-xs text-stone-900 truncate max-w-[130px]">
                        {report.village}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                          isCritical
                            ? 'bg-rose-700 text-white animate-pulse'
                            : isHigh
                            ? 'bg-rose-100 text-rose-800 border border-rose-200'
                            : isMedium
                            ? 'bg-amber-100 text-amber-800 border border-amber-200'
                            : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        }`}
                      >
                        {report.threatLevel}
                      </span>
                    </div>
                  </div>

                  <p className="text-[11px] text-stone-600 line-clamp-2 leading-relaxed">
                    {report.description}
                  </p>

                  <div className="flex items-center justify-between text-[10px] text-stone-500 pt-1 border-t border-stone-200/60">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-stone-400" />
                      {report.reportedAt
                        ? new Date(report.reportedAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : 'Recent'}
                    </span>

                    <div className="flex items-center gap-1.5">
                      {report.isDuplicate && (
                        <span className="px-1.5 py-0.2 rounded bg-stone-200 text-stone-700 font-mono text-[9px]">
                          DUPLICATE
                        </span>
                      )}
                      <span
                        className={`px-1.5 py-0.5 rounded font-medium ${
                          isAssigned
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-stone-200 text-stone-600'
                        }`}
                      >
                        {isAssigned ? 'Assigned' : 'Pending'}
                      </span>
                    </div>
                  </div>

                  {isSelected && (
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 text-emerald-700 hidden sm:block">
                      <ChevronRight className="w-4 h-4" />
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  }

  // STANDALONE MODE (Fallback view when used on independent route)
  return (
    <div className="max-w-7xl mx-auto flex flex-col gap-6 font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-200">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-rose-50 text-rose-700 border border-rose-100">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-stone-900 flex items-center gap-2">
                Community Conflict Triage Queue
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 font-mono font-medium">
                  UC-03 Protected
                </span>
              </h1>
              <p className="text-xs text-stone-500 mt-0.5">
                A.M.H.M. Abeykoon (IT23831254) • Incident Triage & Ranger Dispatch
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {lastRefreshed && (
            <span className="text-xs text-stone-400">Updated: {lastRefreshed}</span>
          )}
          <button
            type="button"
            onClick={fetchQueue}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white hover:bg-stone-50 text-stone-700 border border-stone-200 shadow-xs transition cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh Queue
          </button>
        </div>
      </div>

      <div className="p-4 rounded-xl bg-white border border-stone-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 text-stone-700">
          <ShieldCheck className="w-4 h-4 text-emerald-700" />
          <span>Active Session: <strong>{user?.name}</strong></span>
          <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-mono font-medium">
            {user?.role}
          </span>
        </div>
        <div className="text-stone-500 font-mono text-[11px]">
          Authorization: Bearer Token Active (localStorage)
        </div>
      </div>

      {actionSuccess && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-700" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-8 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-stone-900">Incident Triage Stream</h2>
            <span className="text-xs px-2 py-0.5 rounded-full bg-stone-100 text-stone-600 font-mono font-medium">
              {filteredReports.length} Incidents
            </span>
          </div>

          <div className="flex flex-col gap-3">
            {filteredReports.map((report) => (
              <div
                key={report.id}
                className="p-5 rounded-2xl bg-white border border-stone-200 shadow-xs flex flex-col gap-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono text-xs font-bold text-emerald-800 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-100">
                      {report.id}
                    </span>
                    <div className="flex items-center gap-1.5 text-xs text-stone-800">
                      <MapPin className="w-3.5 h-3.5 text-rose-600" />
                      <span className="font-semibold">{report.village}</span>
                    </div>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-100 text-amber-800">
                    {report.threatLevel}
                  </span>
                </div>
                <p className="text-xs text-stone-700">{report.description}</p>
                {canAssign && !report.dispatchedRanger && (
                  <div className="pt-2 border-t border-stone-100 flex items-center gap-2">
                    {assigningId === report.id ? (
                      <div className="flex items-center gap-2 w-full">
                        <select
                          value={rangerInput}
                          onChange={(e) => setRangerInput(e.target.value)}
                          className="flex-1 px-2.5 py-1.5 rounded-lg border text-xs"
                        >
                          <option value="Ranger Unit Alpha">Ranger Unit Alpha</option>
                          <option value="Ranger Unit Bravo">Ranger Unit Bravo</option>
                        </select>
                        <button
                          type="button"
                          onClick={() => handleAssignRanger(report.id)}
                          disabled={assignSubmitting}
                          className="px-3 py-1.5 rounded-lg bg-emerald-800 text-white text-xs"
                        >
                          Confirm
                        </button>
                        <button
                          type="button"
                          onClick={() => setAssigningId(null)}
                          className="px-2 py-1.5 rounded-lg bg-stone-100 text-xs"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setAssigningId(report.id)}
                        className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-emerald-800 text-white text-xs"
                      >
                        <UserPlus className="w-3.5 h-3.5" />
                        Assign Ranger
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-4 p-6 rounded-2xl bg-white border border-stone-200 shadow-xs flex flex-col gap-4">
          <h3 className="text-sm font-semibold text-stone-900 flex items-center gap-2">
            <Radio className="w-4 h-4 text-emerald-800" />
            SMS Gateway Simulator
          </h3>
          {smsFeedback && (
            <div className={`p-2.5 rounded-lg text-xs ${smsFeedback.type === 'success' ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800'}`}>
              {smsFeedback.text}
            </div>
          )}
          <form onSubmit={handleSendSms} className="flex flex-col gap-3 text-xs">
            <input
              type="text"
              value={smsSender}
              onChange={(e) => setSmsSender(e.target.value)}
              placeholder="Sender Phone"
              className="p-2 border rounded-lg bg-stone-50"
            />
            <input
              type="text"
              value={smsVillage}
              onChange={(e) => setSmsVillage(e.target.value)}
              placeholder="Village Sector"
              className="p-2 border rounded-lg bg-stone-50"
            />
            <textarea
              rows={2}
              value={smsMessage}
              onChange={(e) => setSmsMessage(e.target.value)}
              placeholder="Incident Message"
              className="p-2 border rounded-lg bg-stone-50 resize-none"
            />
            <button
              type="submit"
              disabled={smsSending}
              className="py-2 bg-emerald-800 text-white rounded-lg flex items-center justify-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              {smsSending ? 'Sending...' : 'Send SMS'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
