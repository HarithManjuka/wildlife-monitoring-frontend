import React, { useState, useEffect, useCallback, useContext, useMemo } from 'react';
import {
  AlertTriangle,
  Send,
  RefreshCw,
  PhoneCall,
  Clock,
  Check,
  CheckCircle2,
  MapPin,
  UserPlus,
  ShieldCheck,
  Compass,
  Layers,
  Radio,
  X,
  Sparkles,
  Info,
  CheckSquare
} from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import api from '../utils/api';
import ConflictQueue from '../components/ConflictQueue';

// Sector coordinate anchor positions for the Map View (Sri Lanka wildlife corridors)
const MAP_SECTORS = {
  'Habarana North': { x: 52, y: 34, lat: 8.0338, lng: 80.7512, zone: 'Zone A - Buffer Corridor' },
  'Habarana South': { x: 50, y: 40, lat: 8.0125, lng: 80.742, zone: 'Zone A - Farmland Perimeter' },
  'Minneriya East': { x: 68, y: 32, lat: 8.0514, lng: 80.8931, zone: 'Zone B - Reservoir Border' },
  'Sigiriya West': { x: 46, y: 52, lat: 7.9542, lng: 80.7389, zone: 'Zone C - Forest Fringe' },
  'Dambulla Corridor': { x: 38, y: 64, lat: 7.8731, lng: 80.6517, zone: 'Zone D - Highway Transit' },
  'Polonnaruwa Border': { x: 78, y: 48, lat: 7.9403, lng: 81.0188, zone: 'Zone E - Ancient Irrigation' },
  'Wilpattu Buffer': { x: 24, y: 22, lat: 8.4521, lng: 80.0154, zone: 'Zone W - Western Sanctuary' },
};

export default function ConflictsDashboard() {
  const { user } = useContext(AuthContext);

  // Queue state
  const [reports, setReports] = useState([]);
  const [selectedReportId, setSelectedReportId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastRefreshed, setLastRefreshed] = useState(null);

  // Ranger Assignment form state
  const [rangerInput, setRangerInput] = useState('Ranger Unit Alpha');
  const [assignSubmitting, setAssignSubmitting] = useState(false);
  const [actionSuccess, setActionSuccess] = useState(null);

  // Manual Triage state
  const [triageSubmitting, setTriageSubmitting] = useState(false);
  const [editingNotes, setEditingNotes] = useState('');

  // SMS Simulator Drawer / Modal state
  const [showSmsModal, setShowSmsModal] = useState(false);
  const [smsSender, setSmsSender] = useState('+94775551234');
  const [smsVillage, setSmsVillage] = useState('Habarana North');
  const [smsMessage, setSmsMessage] = useState('Wild elephant herd moving towards primary school');
  const [smsSending, setSmsSending] = useState(false);
  const [smsFeedback, setSmsFeedback] = useState(null);

  // Map settings
  const [mapLayer, setMapLayer] = useState('satellite');

  const canAssign = user?.role === 'LIAISON_OFFICER';

  // Fetch reports queue from backend API
  const fetchQueue = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/conflicts/queue');
      const fetchedReports = res.data.reports || [];
      setReports(fetchedReports);
      setLastRefreshed(new Date().toLocaleTimeString());

      if (fetchedReports.length > 0) {
        setSelectedReportId((prev) => {
          if (prev && fetchedReports.some((r) => r.id === prev)) {
            return prev;
          }
          return fetchedReports[0].id;
        });
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch conflict triage queue.');
      setLastRefreshed(new Date().toLocaleTimeString());
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    let active = true;
    api.get('/conflicts/queue')
      .then((res) => {
        if (active) {
          const fetched = res.data.reports || [];
          setReports(fetched);
          setLastRefreshed(new Date().toLocaleTimeString());
          if (fetched.length > 0) {
            setSelectedReportId(fetched[0].id);
            setEditingNotes(fetched[0].triageNotes || '');
          }
        }
      })
      .catch((err) => {
        if (active) {
          setError(err.message || 'Failed to fetch conflict triage queue.');
          setLastRefreshed(new Date().toLocaleTimeString());
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  // Selected report computation
  const selectedReport = useMemo(() => {
    return reports.find((r) => r.id === selectedReportId) || reports[0] || null;
  }, [reports, selectedReportId]);

  const handleSelectReport = (report) => {
    setSelectedReportId(report.id);
    setEditingNotes(report.triageNotes || '');
  };



  // Key KPI metrics
  const stats = useMemo(() => {
    const total = reports.length;
    const highOrCritical = reports.filter(
      (r) => r.threatLevel === 'High' || r.threatLevel === 'Critical'
    ).length;
    const pendingDispatch = reports.filter(
      (r) => r.status === 'Pending Dispatch' || r.status === 'Pending Triage'
    ).length;
    const assigned = reports.filter((r) => Boolean(r.dispatchedRanger)).length;
    const duplicates = reports.filter((r) => r.isDuplicate).length;

    return { total, highOrCritical, pendingDispatch, assigned, duplicates };
  }, [reports]);

  // Handle Ranger Assignment
  const handleAssignRanger = async (e) => {
    e?.preventDefault();
    if (!selectedReport) return;

    setAssignSubmitting(true);
    setActionSuccess(null);
    setError(null);
    try {
      const res = await api.put(`/conflicts/${selectedReport.id}/assign`, {
        rangerName: rangerInput,
      });

      setActionSuccess(`Assigned ${rangerInput} to ${selectedReport.id}`);
      await fetchQueue();
      if (res.data.report) {
        setSelectedReportId(res.data.report.id);
      }
    } catch (err) {
      setError(err.message || 'Failed to dispatch ranger unit.');
    } finally {
      setAssignSubmitting(false);
    }
  };

  // Handle Manual Triage & Severity Adjustment
  const handleUpdateTriage = async (newThreat, newStatus = null) => {
    if (!selectedReport) return;

    setTriageSubmitting(true);
    setActionSuccess(null);
    setError(null);
    try {
      const payload = {
        threatLevel: newThreat || selectedReport.threatLevel,
        status: newStatus || selectedReport.status,
        triageNotes: editingNotes,
      };

      await api.put(`/conflicts/${selectedReport.id}/triage`, payload);
      setActionSuccess(`Updated triage classification for ${selectedReport.id}`);
      await fetchQueue();
    } catch (err) {
      setError(err.message || 'Failed to update report triage.');
    } finally {
      setTriageSubmitting(false);
    }
  };

  // Handle SMS Ingestion Simulator
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
        text: `SMS ingested: ${res.data.report?.id || 'queued'} (${res.data.report?.threatLevel || 'Triage'} threat)`,
      });

      setSmsMessage('');
      await fetchQueue();

      if (res.data.report?.id) {
        setSelectedReportId(res.data.report.id);
      }
    } catch (err) {
      setSmsFeedback({
        type: 'error',
        text: err.message || 'SMS transmission failed',
      });
    } finally {
      setSmsSending(false);
    }
  };

  // Preset scenarios for the simulator
  const applyPreset = (preset) => {
    setSmsSender(preset.sender);
    setSmsVillage(preset.village);
    setSmsMessage(preset.message);
  };

  return (
    <div className="flex flex-col gap-6 max-w-[1700px] mx-auto font-sans pb-12">
      {/* 1. TOP HEADER & KPI METRICS BAR */}
      <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-stone-200">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-rose-50 text-rose-700 border border-rose-100 shadow-xs">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-stone-900 tracking-tight">
                  Community Conflict Operations Portal
                </h1>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 font-mono font-semibold">
                  UC-03 Live Triage
                </span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-mono font-medium">
                  Group 001 Hi-Fi
                </span>
              </div>
              <p className="text-xs text-stone-500 mt-1">
                A.M.H.M. Abeykoon (IT23831254) • Multi-Panel Incident Queue, Triage Console & Geospatial Map
              </p>
            </div>
          </div>
        </div>

        {/* Global Actions Bar */}
        <div className="flex items-center flex-wrap gap-2.5">
          {lastRefreshed && (
            <span className="text-xs text-stone-500 hidden sm:inline-block">
              Updated: {lastRefreshed}
            </span>
          )}

          <button
            type="button"
            onClick={fetchQueue}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white hover:bg-stone-50 text-stone-700 border border-stone-300 shadow-xs transition cursor-pointer disabled:opacity-50"
            title="Refresh triage feed"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh Queue
          </button>

          <button
            type="button"
            onClick={() => setShowSmsModal(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-800 hover:bg-emerald-900 text-white shadow-xs transition cursor-pointer"
          >
            <Radio className="w-3.5 h-3.5" />
            SMS Simulator
          </button>
        </div>
      </header>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        <div className="p-3.5 rounded-xl bg-white border border-stone-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-medium text-stone-500 uppercase tracking-wider">Total Reports</p>
            <p className="text-xl font-bold text-stone-900 mt-0.5">{stats.total}</p>
          </div>
          <div className="p-2 rounded-lg bg-stone-100 text-stone-600">
            <Layers className="w-4 h-4" />
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-white border border-rose-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-medium text-rose-600 uppercase tracking-wider">High / Critical</p>
            <p className="text-xl font-bold text-rose-700 mt-0.5 flex items-center gap-1.5">
              {stats.highOrCritical}
              {stats.highOrCritical > 0 && (
                <span className="w-2 h-2 rounded-full bg-rose-600 animate-ping" />
              )}
            </p>
          </div>
          <div className="p-2 rounded-lg bg-rose-50 text-rose-600">
            <AlertTriangle className="w-4 h-4" />
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-white border border-amber-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-medium text-amber-600 uppercase tracking-wider">Pending Dispatch</p>
            <p className="text-xl font-bold text-amber-700 mt-0.5">{stats.pendingDispatch}</p>
          </div>
          <div className="p-2 rounded-lg bg-amber-50 text-amber-600">
            <Clock className="w-4 h-4" />
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-white border border-emerald-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-medium text-emerald-700 uppercase tracking-wider">Rangers Assigned</p>
            <p className="text-xl font-bold text-emerald-800 mt-0.5">{stats.assigned}</p>
          </div>
          <div className="p-2 rounded-lg bg-emerald-50 text-emerald-700">
            <ShieldCheck className="w-4 h-4" />
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-white border border-stone-200 shadow-xs flex items-center justify-between col-span-2 sm:col-span-1">
          <div>
            <p className="text-[11px] font-medium text-stone-500 uppercase tracking-wider">Duplicate Filtered</p>
            <p className="text-xl font-bold text-stone-700 mt-0.5">{stats.duplicates}</p>
          </div>
          <div className="p-2 rounded-lg bg-stone-100 text-stone-500">
            <CheckSquare className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Feedback Alerts */}
      {actionSuccess && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
            <span>{actionSuccess}</span>
          </div>
          <button type="button" onClick={() => setActionSuccess(null)} className="text-emerald-700 hover:text-emerald-900 cursor-pointer">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {error && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-700 shrink-0" />
            <span>{error}</span>
          </div>
          <button type="button" onClick={() => setError(null)} className="text-rose-700 hover:text-rose-900 cursor-pointer">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 2. GROUP 001 HIGH-FIDELITY THREE-PANEL ARCHITECTURE */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* ======================================================== */}
        {/* PANEL 1: ACTIVE QUEUE (LEFT: 4 COLS) - ConflictQueue.jsx */}
        {/* ======================================================== */}
        <section className="lg:col-span-4 bg-white p-4 rounded-2xl border border-stone-200 shadow-xs h-[820px] overflow-hidden">
          <ConflictQueue
            reports={reports}
            selectedReportId={selectedReport?.id}
            onSelectReport={handleSelectReport}
            loading={loading}
            onRefresh={fetchQueue}
          />
        </section>

        {/* ======================================================== */}
        {/* PANEL 2: REPORT DETAILS & TRIAGE (CENTER/RIGHT: 4 COLS) */}
        {/* ======================================================== */}
        <section className="lg:col-span-4 flex flex-col gap-4 bg-white p-5 rounded-2xl border border-stone-200 shadow-xs h-[820px] overflow-y-auto">
          {selectedReport ? (
            <>
              {/* Report Header */}
              <div className="pb-3 border-b border-stone-100 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    {selectedReport.id}
                  </span>
                  <span className="text-xs text-stone-400 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {selectedReport.reportedAt
                      ? new Date(selectedReport.reportedAt).toLocaleString()
                      : 'Recently Reported'}
                  </span>
                </div>

                <h2 className="text-base font-bold text-stone-900 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{selectedReport.village}</span>
                </h2>

                {/* Duplicate Notification Banner */}
                {selectedReport.isDuplicate && (
                  <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-[11px] flex items-center gap-2">
                    <Info className="w-4 h-4 shrink-0 text-amber-600" />
                    <span>
                      Identified as duplicate report of{' '}
                      <strong>{selectedReport.duplicateOf || 'prior incident'}</strong> within the 30-minute window.
                    </span>
                  </div>
                )}
              </div>

              {/* Ingestion & Caller Meta */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 rounded-xl bg-stone-50 border border-stone-100">
                  <span className="text-[10px] text-stone-400 font-medium block mb-0.5">Report Source</span>
                  <span className="font-semibold text-stone-800 flex items-center gap-1">
                    <Radio className="w-3 h-3 text-emerald-700" />
                    {selectedReport.source}
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-stone-50 border border-stone-100">
                  <span className="text-[10px] text-stone-400 font-medium block mb-0.5">Caller / Contact</span>
                  <span className="font-semibold text-stone-800 flex items-center gap-1">
                    <PhoneCall className="w-3 h-3 text-emerald-700" />
                    {selectedReport.contact || selectedReport.sender || 'Anonymous'}
                  </span>
                </div>
              </div>

              {/* Full Description */}
              <div>
                <label className="text-[11px] font-bold text-stone-700 uppercase tracking-wider block mb-1">
                  Transcribed Incident Payload
                </label>
                <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200 text-xs text-stone-800 leading-relaxed font-sans">
                  {selectedReport.description}
                </div>
              </div>

              {/* Triage & Threat Adjustment */}
              <div className="p-4 rounded-xl bg-stone-50/70 border border-stone-200 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                    Threat Classification & Severity
                  </span>
                  <span className="text-[11px] font-mono text-stone-500">
                    Current: <strong>{selectedReport.threatLevel}</strong>
                  </span>
                </div>

                <div className="grid grid-cols-4 gap-1.5">
                  {['Low', 'Medium', 'High', 'Critical'].map((level) => {
                    const isCurrent = selectedReport.threatLevel === level;
                    return (
                      <button
                        key={level}
                        type="button"
                        onClick={() => handleUpdateTriage(level)}
                        disabled={triageSubmitting}
                        className={`py-1.5 px-2 rounded-lg text-xs font-bold transition cursor-pointer border ${
                          isCurrent
                            ? level === 'Critical'
                              ? 'bg-rose-700 text-white border-rose-800'
                              : level === 'High'
                              ? 'bg-rose-600 text-white border-rose-700'
                              : level === 'Medium'
                              ? 'bg-amber-600 text-white border-amber-700'
                              : 'bg-emerald-700 text-white border-emerald-800'
                            : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-100'
                        }`}
                      >
                        {level}
                      </button>
                    );
                  })}
                </div>

                {/* Triage Notes */}
                <div>
                  <label className="text-[11px] text-stone-600 font-medium block mb-1">
                    Officer Triage Notes
                  </label>
                  <textarea
                    rows={2}
                    value={editingNotes}
                    onChange={(e) => setEditingNotes(e.target.value)}
                    placeholder="Enter assessment findings, dispatch directives..."
                    className="w-full p-2.5 rounded-xl bg-white border border-stone-200 text-xs text-stone-900 placeholder-stone-400 focus:outline-none focus:border-emerald-700 resize-none"
                  />
                  <div className="flex justify-end mt-1.5">
                    <button
                      type="button"
                      onClick={() => handleUpdateTriage(selectedReport.threatLevel)}
                      disabled={triageSubmitting}
                      className="px-3 py-1 rounded-lg bg-stone-900 hover:bg-stone-800 text-white text-xs font-medium transition cursor-pointer disabled:opacity-50"
                    >
                      {triageSubmitting ? 'Saving...' : 'Save Notes'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Ranger Dispatch Section */}
              <div className="p-4 rounded-xl bg-white border border-stone-200 shadow-xs flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                    <UserPlus className="w-3.5 h-3.5 text-emerald-800" />
                    Field Ranger Dispatch
                  </span>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                      selectedReport.dispatchedRanger
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-stone-100 text-stone-600'
                    }`}
                  >
                    {selectedReport.status}
                  </span>
                </div>

                {selectedReport.dispatchedRanger ? (
                  <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-100 flex flex-col gap-1 text-xs">
                    <div className="flex items-center gap-1.5 font-bold text-emerald-900">
                      <Check className="w-4 h-4 text-emerald-700" />
                      Assigned: {selectedReport.dispatchedRanger}
                    </div>
                    <span className="text-[11px] text-emerald-700">
                      Dispatched by {selectedReport.assignedBy || 'Liaison Officer'}{' '}
                      {selectedReport.assignedAt
                        ? `at ${new Date(selectedReport.assignedAt).toLocaleTimeString()}`
                        : ''}
                    </span>
                  </div>
                ) : (
                  canAssign && (
                    <form onSubmit={handleAssignRanger} className="flex flex-col gap-2.5">
                      <div>
                        <label className="text-[11px] text-stone-600 font-medium block mb-1">
                          Select Ranger Unit / Sector Patrol
                        </label>
                        <select
                          value={rangerInput}
                          onChange={(e) => setRangerInput(e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-xl bg-stone-50 border border-stone-200 text-xs text-stone-900 focus:outline-none focus:border-emerald-700 focus:bg-white"
                        >
                          <option value="Ranger Unit Alpha">Ranger Unit Alpha (Habarana Base)</option>
                          <option value="Ranger Unit Bravo">Ranger Unit Bravo (Minneriya Patrol)</option>
                          <option value="Ranger Unit Charlie">Ranger Unit Charlie (Sigiriya Quick Response)</option>
                          <option value="Rapid Response Unit 04">Rapid Response Unit 04</option>
                        </select>
                      </div>

                      <button
                        type="submit"
                        disabled={assignSubmitting}
                        className="w-full py-2 px-3 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white font-semibold text-xs shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        <UserPlus className="w-3.5 h-3.5" />
                        {assignSubmitting ? 'Dispatching...' : 'Dispatch Ranger Unit'}
                      </button>
                    </form>
                  )
                )}

                {/* Quick Status Action Buttons */}
                <div className="flex items-center gap-2 pt-2 border-t border-stone-100">
                  <button
                    type="button"
                    onClick={() => handleUpdateTriage(null, 'Triaged')}
                    disabled={triageSubmitting || selectedReport.status === 'Triaged'}
                    className="flex-1 py-1.5 px-2 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-800 text-[11px] font-medium transition cursor-pointer disabled:opacity-40"
                  >
                    Mark Triaged
                  </button>
                  <button
                    type="button"
                    onClick={() => handleUpdateTriage(null, 'Resolved')}
                    disabled={triageSubmitting || selectedReport.status === 'Resolved'}
                    className="flex-1 py-1.5 px-2 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-800 text-[11px] font-medium transition cursor-pointer disabled:opacity-40"
                  >
                    Mark Resolved
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-stone-400 text-xs text-center p-8">
              <Compass className="w-8 h-8 mb-2 text-stone-300" />
              <span>Select an incident report from the queue to view details and triage.</span>
            </div>
          )}
        </section>

        {/* ======================================================== */}
        {/* PANEL 3: INTERACTIVE GEOSPATIAL MAP VIEW (RIGHT: 4 COLS) */}
        {/* ======================================================== */}
        <section className="lg:col-span-4 flex flex-col gap-3.5 bg-white p-4 rounded-2xl border border-stone-200 shadow-xs h-[820px]">
          <div className="flex items-center justify-between pb-2 border-b border-stone-100">
            <div className="flex items-center gap-2">
              <Compass className="w-4 h-4 text-emerald-800" />
              <h2 className="text-sm font-bold text-stone-900 uppercase tracking-wider">
                Geospatial Incident Map
              </h2>
            </div>
            <div className="flex items-center gap-1 bg-stone-100 p-0.5 rounded-lg text-[10px]">
              <button
                type="button"
                onClick={() => setMapLayer('satellite')}
                className={`px-2 py-0.5 rounded font-medium transition cursor-pointer ${
                  mapLayer === 'satellite' ? 'bg-white shadow-xs text-stone-900' : 'text-stone-500'
                }`}
              >
                Corridor
              </button>
              <button
                type="button"
                onClick={() => setMapLayer('topographic')}
                className={`px-2 py-0.5 rounded font-medium transition cursor-pointer ${
                  mapLayer === 'topographic' ? 'bg-white shadow-xs text-stone-900' : 'text-stone-500'
                }`}
              >
                Terrain
              </button>
            </div>
          </div>

          {/* Map Visual Canvas */}
          <div className="relative flex-1 rounded-xl overflow-hidden border border-stone-800/80 bg-[#0f1713] p-4 flex flex-col justify-between select-none">
            {/* Topographic Background Graphic Simulation */}
            <div
              className={`absolute inset-0 pointer-events-none opacity-20 ${
                mapLayer === 'topographic' ? 'bg-amber-900/30' : 'bg-emerald-950/40'
              }`}
              style={{
                backgroundImage: `radial-gradient(circle at 50% 50%, rgba(16, 185, 129, 0.15) 0%, transparent 60%), linear-gradient(0deg, rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)`,
                backgroundSize: '100% 100%, 32px 32px, 32px 32px',
              }}
            />

            {/* Corridor Boundaries Contour Lines */}
            <svg
              className="absolute inset-0 w-full h-full pointer-events-none opacity-30"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
            >
              <path
                d="M 20 20 Q 50 35 80 25 T 90 70 Q 50 85 20 70 Z"
                fill="none"
                stroke="#10b981"
                strokeWidth="0.5"
                strokeDasharray="2,2"
              />
              <path
                d="M 35 30 Q 60 45 75 40 T 70 65 Q 45 70 35 55 Z"
                fill="rgba(16, 185, 129, 0.05)"
                stroke="#059669"
                strokeWidth="0.8"
              />
            </svg>

            {/* Map Header Overlay */}
            <div className="relative z-10 flex items-center justify-between text-[11px] text-emerald-400 font-mono bg-black/40 backdrop-blur-xs p-2 rounded-lg border border-emerald-900/50">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>SRI LANKA WILDLIFE CORRIDORS</span>
              </div>
              <span className="text-[10px] text-stone-400">8.03° N, 80.75° E</span>
            </div>

            {/* Interactive Pins for Sectors & Reports */}
            <div className="relative z-10 w-full h-full my-auto">
              {Object.entries(MAP_SECTORS).map(([villageName, meta]) => {
                const sectorReports = reports.filter((r) => r.village === villageName);
                const hasReports = sectorReports.length > 0;
                const isSelected = selectedReport?.village === villageName;
                const highestThreat = sectorReports.reduce((acc, curr) => {
                  if (curr.threatLevel === 'Critical') return 'Critical';
                  if (curr.threatLevel === 'High' && acc !== 'Critical') return 'High';
                  if (curr.threatLevel === 'Medium' && acc !== 'Critical' && acc !== 'High')
                    return 'Medium';
                  return acc;
                }, 'Low');

                return (
                  <div
                    key={villageName}
                    style={{ left: `${meta.x}%`, top: `${meta.y}%` }}
                    onClick={() => {
                      if (sectorReports.length > 0) {
                        handleSelectReport(sectorReports[0]);
                      }
                    }}
                    className={`absolute -translate-x-1/2 -translate-y-1/2 group cursor-pointer transition-transform hover:scale-125 z-20 ${
                      isSelected ? 'scale-125 z-30' : ''
                    }`}
                  >
                    {/* Pulsing indicator */}
                    {hasReports && (
                      <span
                        className={`absolute -inset-1 rounded-full animate-ping opacity-75 ${
                          highestThreat === 'Critical'
                            ? 'bg-rose-500'
                            : highestThreat === 'High'
                            ? 'bg-rose-400'
                            : 'bg-amber-400'
                        }`}
                      />
                    )}

                    {/* Marker badge */}
                    <div
                      className={`relative flex items-center justify-center rounded-full shadow-lg border text-white transition ${
                        hasReports
                          ? highestThreat === 'Critical'
                            ? 'w-7 h-7 bg-rose-600 border-white ring-2 ring-rose-500'
                            : highestThreat === 'High'
                            ? 'w-6 h-6 bg-rose-500 border-white'
                            : 'w-6 h-6 bg-amber-500 border-white'
                          : 'w-4 h-4 bg-emerald-950 border-emerald-700'
                      }`}
                    >
                      {hasReports ? (
                        <span className="text-[10px] font-bold font-mono">
                          {sectorReports.length}
                        </span>
                      ) : (
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      )}
                    </div>

                    {/* Tooltip on hover / active */}
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:flex flex-col items-center pointer-events-none z-50 whitespace-nowrap">
                      <div className="px-2.5 py-1 rounded-md bg-stone-900 text-white text-[10px] shadow-lg border border-stone-700 flex flex-col items-center">
                        <span className="font-bold">{villageName}</span>
                        <span className="text-stone-400 text-[9px]">{meta.zone}</span>
                        {hasReports && (
                          <span className="text-emerald-400 text-[9px] font-mono mt-0.5">
                            {sectorReports.length} active report(s)
                          </span>
                        )}
                      </div>
                      <div className="w-1.5 h-1.5 bg-stone-900 rotate-45 -mt-1" />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Map Legend Overlay */}
            <div className="relative z-10 bg-black/60 backdrop-blur-xs p-2.5 rounded-xl border border-stone-800 text-[10px] text-stone-300 flex flex-col gap-1.5">
              <span className="font-bold uppercase tracking-wider text-[9px] text-stone-400">
                Threat Legend & Hotspot Markers
              </span>
              <div className="grid grid-cols-2 gap-1 text-[10px]">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-600 border border-white" />
                  <span>Critical / Attack</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500 border border-white" />
                  <span>High / Bull</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 border border-white" />
                  <span>Medium / Crop Herd</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 border border-white" />
                  <span>Low / Safe Sighting</span>
                </div>
              </div>
            </div>
          </div>

          {/* Sector Details Card */}
          <div className="p-3 rounded-xl bg-stone-50 border border-stone-200 text-xs flex flex-col gap-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
              Active Coordinates Focus
            </span>
            <div className="flex items-center justify-between text-stone-800 font-mono text-[11px]">
              <span>{selectedReport?.village || 'Habarana Corridor'}</span>
              <span className="text-emerald-700 font-bold">
                {MAP_SECTORS[selectedReport?.village]
                  ? `${MAP_SECTORS[selectedReport.village].lat}° N, ${MAP_SECTORS[selectedReport.village].lng}° E`
                  : '8.0338° N, 80.7512° E'}
              </span>
            </div>
          </div>
        </section>
      </div>

      {/* ======================================================== */}
      {/* 3. SMS GATEWAY SIMULATOR MODAL / DRAWER                  */}
      {/* ======================================================== */}
      {showSmsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl border border-stone-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-4 bg-emerald-800 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Radio className="w-5 h-5 text-emerald-200" />
                <div>
                  <h3 className="font-bold text-sm">SMS Gateway Webhook Simulator</h3>
                  <p className="text-[10px] text-emerald-100">
                    Test unauthenticated public ingestion endpoint: POST /api/conflicts/sms
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowSmsModal(false)}
                className="text-white/80 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Presets Bar */}
            <div className="p-3 bg-stone-50 border-b border-stone-200 flex flex-col gap-1.5">
              <span className="text-[10px] font-bold uppercase text-stone-500 tracking-wider">
                Quick Test Scenarios:
              </span>
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={() =>
                    applyPreset({
                      sender: '+94771230001',
                      village: 'Habarana North',
                      message: 'Elephant attack reported in village, two villagers injured and house damaged',
                    })
                  }
                  className="px-2 py-1 rounded bg-white hover:bg-rose-50 text-rose-700 border border-stone-200 text-[10px] font-semibold cursor-pointer"
                >
                  Critical Attack
                </button>
                <button
                  type="button"
                  onClick={() =>
                    applyPreset({
                      sender: '+94771230002',
                      village: 'Minneriya East',
                      message: 'Aggressive lone bull elephant encroaching near village school compound',
                    })
                  }
                  className="px-2 py-1 rounded bg-white hover:bg-rose-50 text-rose-600 border border-stone-200 text-[10px] font-semibold cursor-pointer"
                >
                  High: Bull
                </button>
                <button
                  type="button"
                  onClick={() =>
                    applyPreset({
                      sender: '+94771230003',
                      village: 'Habarana North',
                      message: 'Second caller reporting elephant near cultivation fence',
                    })
                  }
                  className="px-2 py-1 rounded bg-white hover:bg-amber-50 text-amber-700 border border-stone-200 text-[10px] font-semibold cursor-pointer"
                >
                  Duplicate Test
                </button>
                <button
                  type="button"
                  onClick={() =>
                    applyPreset({
                      sender: '+94771230004',
                      village: 'Sigiriya West',
                      message: 'Distant sighting of elephant tracks and dung along forest edge',
                    })
                  }
                  className="px-2 py-1 rounded bg-white hover:bg-emerald-50 text-emerald-700 border border-stone-200 text-[10px] font-semibold cursor-pointer"
                >
                  Low: Tracks
                </button>
              </div>
            </div>

            {/* Simulator Form */}
            <form onSubmit={handleSendSms} className="p-5 flex flex-col gap-3.5">
              {smsFeedback && (
                <div
                  className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                    smsFeedback.type === 'success'
                      ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                      : 'bg-rose-50 border border-rose-200 text-rose-800'
                  }`}
                >
                  {smsFeedback.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-rose-700 shrink-0" />
                  )}
                  <span>{smsFeedback.text}</span>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-bold text-stone-700 mb-1" htmlFor="modal-sender">
                  Caller / Sender Phone Number
                </label>
                <input
                  id="modal-sender"
                  type="text"
                  value={smsSender}
                  onChange={(e) => setSmsSender(e.target.value)}
                  placeholder="+94 77 123 4567"
                  required
                  className="w-full px-3 py-2 rounded-xl bg-stone-50 border border-stone-200 text-xs text-stone-900 focus:outline-none focus:border-emerald-700 focus:bg-white transition"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-stone-700 mb-1" htmlFor="modal-village">
                  Community Sector / Village
                </label>
                <select
                  id="modal-village"
                  value={smsVillage}
                  onChange={(e) => setSmsVillage(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-stone-50 border border-stone-200 text-xs text-stone-900 focus:outline-none focus:border-emerald-700 focus:bg-white transition"
                >
                  {Object.keys(MAP_SECTORS).map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-stone-700 mb-1" htmlFor="modal-msg">
                  SMS Incident Text
                </label>
                <textarea
                  id="modal-msg"
                  rows={3}
                  value={smsMessage}
                  onChange={(e) => setSmsMessage(e.target.value)}
                  placeholder="Describe wildlife movement, threats, or damage..."
                  required
                  className="w-full px-3 py-2 rounded-xl bg-stone-50 border border-stone-200 text-xs text-stone-900 focus:outline-none focus:border-emerald-700 focus:bg-white transition resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowSmsModal(false)}
                  className="px-4 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={smsSending}
                  className="px-5 py-2 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-semibold shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  {smsSending ? 'Transmitting...' : 'Dispatch Webhook SMS'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
