import React, { useState, useEffect, useCallback, useContext } from 'react';
import { 
  AlertTriangle, 
  Send, 
  RefreshCw, 
  PhoneCall, 
  Radio, 
  CheckCircle2, 
  Clock, 
  Check, 
  MapPin, 
  UserPlus, 
  ShieldCheck
} from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import api from '../utils/api';

export default function ConflictQueue() {
  const { user } = useContext(AuthContext);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastRefreshed, setLastRefreshed] = useState(null);

  // SMS Simulator state
  const [smsSender, setSmsSender] = useState('+94775551234');
  const [smsVillage, setSmsVillage] = useState('Habarana South');
  const [smsMessage, setSmsMessage] = useState('Elephant herd crossing paddy fields near electric fence');
  const [smsSending, setSmsSending] = useState(false);
  const [smsFeedback, setSmsFeedback] = useState(null);

  // Assign ranger modal / state
  const [assigningId, setAssigningId] = useState(null);
  const [rangerInput, setRangerInput] = useState('Ranger Unit Alpha');
  const [assignSubmitting, setAssignSubmitting] = useState(false);
  const [actionSuccess, setActionSuccess] = useState(null);

  const canAssign = user?.role === 'LIAISON_OFFICER';

  const fetchQueue = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Axios request automatically carries Bearer token header
      const res = await api.get('/conflicts/queue');
      setReports(res.data.reports || []);
      setLastRefreshed(new Date().toLocaleTimeString());
    } catch (err) {
      setError(err.message || 'Failed to fetch conflict triage queue.');
      setLastRefreshed(new Date().toLocaleTimeString());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    api.get('/conflicts/queue')
      .then((res) => {
        if (active) {
          setReports(res.data.reports || []);
          setLastRefreshed(new Date().toLocaleTimeString());
        }
      })
      .catch((err) => {
        if (active) {
          setError(err.message || 'Failed to fetch conflict triage queue.');
          setLastRefreshed(new Date().toLocaleTimeString());
        }
      });
    return () => {
      active = false;
    };
  }, []);

  // Handle incoming SMS simulator
  const handleSendSms = async (e) => {
    e.preventDefault();
    setSmsSending(true);
    setSmsFeedback(null);
    try {
      // Public endpoint: POST /api/conflicts/sms
      const res = await api.post('/conflicts/sms', {
        sender: smsSender,
        village: smsVillage,
        message: smsMessage,
      });

      setSmsFeedback({
        type: 'success',
        text: `SMS ingested successfully! Assigned ID: ${res.data.report?.id || 'queued'}`,
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

  // Handle assign ranger (LIAISON_OFFICER only)
  const handleAssignRanger = async (reportId) => {
    setAssignSubmitting(true);
    setActionSuccess(null);
    try {
      // PUT /api/conflicts/:reportId/assign
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

  return (
    <div className="max-w-7xl mx-auto flex flex-col gap-6 font-sans">
      {/* Header & Subtitle */}
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
                A.M.H.M. Abeykoon (IT23831254) • Incident Triage, Community Alerts & Ranger Dispatch
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
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white hover:bg-stone-50 text-stone-700 border border-stone-200 shadow-sm transition cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh Queue
          </button>
        </div>
      </div>

      {/* RBAC State Banner */}
      <div className="p-4 rounded-xl bg-white border border-stone-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
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

      {/* Main Grid: Queue on Left, SMS Simulator on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Triage Queue List */}
        <div className="lg:col-span-8 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-stone-900">Incident Triage Stream</h2>
              {reports.length > 0 && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-stone-100 text-stone-600 font-mono font-medium">
                  {reports.length} Incidents
                </span>
              )}
            </div>
          </div>

          {error && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
              {error}
            </div>
          )}

          {actionSuccess && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-700" />
              <span>{actionSuccess}</span>
            </div>
          )}

          {loading && reports.length === 0 ? (
            <div className="p-12 rounded-2xl bg-white border border-stone-200 shadow-sm flex flex-col items-center justify-center gap-3 text-stone-500">
              <RefreshCw className="w-6 h-6 animate-spin text-emerald-700" />
              <span className="text-xs">Fetching conflict triage queue from backend...</span>
            </div>
          ) : reports.length === 0 ? (
            <div className="p-12 rounded-2xl bg-white border border-stone-200 text-center text-stone-500 text-xs shadow-sm">
              No conflict incidents currently in queue. Use the SMS gateway simulator on the right to dispatch an incident report.
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {reports.map((report) => {
                const isAssigned = Boolean(report.dispatchedRanger);
                return (
                  <div
                    key={report.id}
                    className="p-5 rounded-2xl bg-white border border-stone-200 shadow-sm hover:border-emerald-700/40 transition flex flex-col gap-3.5"
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

                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                          report.threatLevel === 'High' 
                            ? 'bg-rose-100 text-rose-800' 
                            : report.threatLevel === 'Medium'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-stone-100 text-stone-700'
                        }`}>
                          {report.threatLevel} Threat
                        </span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                          isAssigned 
                            ? 'bg-emerald-100 text-emerald-800' 
                            : 'bg-stone-100 text-stone-500'
                        }`}>
                          {report.status}
                        </span>
                      </div>
                    </div>

                    <p className="text-xs text-stone-700 leading-relaxed bg-stone-50 p-3 rounded-xl border border-stone-100">
                      {report.description}
                    </p>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-stone-100 text-[11px] text-stone-500">
                      <div className="flex items-center gap-4">
                        <span className="flex items-center gap-1">
                          <PhoneCall className="w-3 h-3 text-stone-400" />
                          {report.source} ({report.contact || report.sender || 'Anonymous'})
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-stone-400" />
                          {report.reportedAt ? new Date(report.reportedAt).toLocaleTimeString() : 'Recent'}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        {isAssigned ? (
                          <span className="flex items-center gap-1.5 text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-100 font-medium">
                            <Check className="w-3.5 h-3.5" />
                            Assigned: {report.dispatchedRanger}
                          </span>
                        ) : (
                          canAssign && (
                            assigningId === report.id ? (
                              <div className="flex items-center gap-2">
                                <input
                                  type="text"
                                  value={rangerInput}
                                  onChange={(e) => setRangerInput(e.target.value)}
                                  placeholder="Ranger Name / Unit"
                                  className="px-2 py-1 rounded-lg bg-white border border-stone-300 text-stone-900 text-xs w-36 focus:outline-none focus:border-emerald-700"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleAssignRanger(report.id)}
                                  disabled={assignSubmitting}
                                  className="px-2.5 py-1 rounded-lg bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-medium transition cursor-pointer"
                                >
                                  Confirm
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setAssigningId(null)}
                                  className="px-2 py-1 rounded-lg bg-stone-100 text-stone-600 text-xs hover:bg-stone-200 transition cursor-pointer"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  setAssigningId(report.id);
                                  setRangerInput('Ranger Unit Alpha');
                                }}
                                className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-medium transition shadow-sm cursor-pointer"
                              >
                                <UserPlus className="w-3.5 h-3.5" />
                                Assign Ranger
                              </button>
                            )
                          )
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: SMS Webhook Ingestion Simulator */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          <div className="p-6 rounded-2xl bg-white border border-stone-200 shadow-sm flex flex-col gap-5">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <div className="p-2 rounded-xl bg-emerald-50 text-emerald-800">
                  <Radio className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-semibold text-stone-900">SMS Gateway Webhook</h3>
              </div>
              <p className="text-xs text-stone-500 leading-relaxed">
                Test the public ingestion endpoint <code className="text-emerald-800 bg-stone-100 px-1 py-0.5 rounded font-mono">POST /api/conflicts/sms</code> (unauthenticated gateway).
              </p>
            </div>

            {smsFeedback && (
              <div className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                smsFeedback.type === 'success' 
                  ? 'bg-emerald-50 border border-emerald-200 text-emerald-800' 
                  : 'bg-rose-50 border border-rose-200 text-rose-800'
              }`}>
                {smsFeedback.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-rose-700 shrink-0" />
                )}
                <span>{smsFeedback.text}</span>
              </div>
            )}

            <form onSubmit={handleSendSms} className="flex flex-col gap-3.5">
              <div>
                <label className="block text-[11px] font-medium text-stone-600 mb-1" htmlFor="sms-sender">
                  Caller / Sender Contact
                </label>
                <input
                  id="sms-sender"
                  type="text"
                  value={smsSender}
                  onChange={(e) => setSmsSender(e.target.value)}
                  placeholder="+94 77 123 4567"
                  required
                  className="w-full px-3 py-2 rounded-xl bg-stone-50 border border-stone-200 text-stone-900 placeholder-stone-400 text-xs focus:outline-none focus:border-emerald-700 focus:bg-white transition"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-stone-600 mb-1" htmlFor="sms-village">
                  Community Village / Zone
                </label>
                <input
                  id="sms-village"
                  type="text"
                  value={smsVillage}
                  onChange={(e) => setSmsVillage(e.target.value)}
                  placeholder="e.g. Habarana South"
                  required
                  className="w-full px-3 py-2 rounded-xl bg-stone-50 border border-stone-200 text-stone-900 placeholder-stone-400 text-xs focus:outline-none focus:border-emerald-700 focus:bg-white transition"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-stone-600 mb-1" htmlFor="sms-msg">
                  SMS Incident Message
                </label>
                <textarea
                  id="sms-msg"
                  rows={3}
                  value={smsMessage}
                  onChange={(e) => setSmsMessage(e.target.value)}
                  placeholder="Describe wildlife movement or threat..."
                  required
                  className="w-full px-3 py-2 rounded-xl bg-stone-50 border border-stone-200 text-stone-900 placeholder-stone-400 text-xs focus:outline-none focus:border-emerald-700 focus:bg-white transition resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={smsSending}
                className="w-full py-2.5 px-4 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white font-medium text-xs shadow-sm transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                {smsSending ? 'Transmitting SMS...' : 'Dispatch SMS Report'}
              </button>
            </form>

            <div className="p-3 rounded-xl bg-stone-50 border border-stone-100 text-[11px] text-stone-500">
              <span className="font-semibold text-stone-700 block mb-1">Architecture Ingestion:</span>
              Emergency SMS dispatch executes without authentication. The triage queue view is restricted to Liaison Officers and Park Managers.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
