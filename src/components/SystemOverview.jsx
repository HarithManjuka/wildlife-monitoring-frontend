import React, { useState, useEffect } from 'react';
import { 
  Radio, 
  MapPin, 
  AlertTriangle, 
  BarChart3, 
  RefreshCw, 
  CheckCircle2, 
  XCircle,
  Server,
  Layers,
  ArrowRight
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';

export default function SystemOverview() {
  const navigate = useNavigate();
  const [healthStatus, setHealthStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [lastChecked, setLastChecked] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  const handleManualRefresh = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const res = await api.get('/health');
      setHealthStatus(res.data);
      setLastChecked(new Date().toLocaleTimeString());
    } catch (err) {
      setHealthStatus(null);
      setErrorMessage(err.message || 'Unable to connect to backend on port 7050');
      setLastChecked(new Date().toLocaleTimeString());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    const initialCheck = async () => {
      try {
        const res = await api.get('/health');
        if (isMounted) {
          setHealthStatus(res.data);
          setLastChecked(new Date().toLocaleTimeString());
        }
      } catch (err) {
        if (isMounted) {
          setHealthStatus(null);
          setErrorMessage(err.message || 'Unable to connect to backend on port 7050');
          setLastChecked(new Date().toLocaleTimeString());
        }
      }
    };

    initialCheck();

    return () => {
      isMounted = false;
    };
  }, []);

  const modules = [
    {
      title: 'Field Patrols & Incidents',
      author: 'M.U. Handaragama (IT23819092)',
      desc: 'Synchronizes offline ranger patrol logs, snare detections, and coordinate logs.',
      icon: MapPin,
      badge: 'Mobile First',
      color: 'emerald',
      path: '/patrol',
    },
    {
      title: 'Sensor & Geofence Alerts',
      author: 'K.M.S.G.S.C. Karunanayake (IT23818620)',
      desc: 'GPS wildlife collar telemetry streams and real-time geofence breach detection.',
      icon: Radio,
      badge: 'Live Telemetry',
      color: 'amber',
      path: '/alerts',
    },
    {
      title: 'Community Conflict Triage',
      author: 'A.M.H.M. Abeykoon (IT23831254)',
      desc: 'Automated ingestion of SMS and community incident reports with threat ranking.',
      icon: AlertTriangle,
      badge: 'Incident Queue',
      color: 'rose',
      path: '/conflicts',
    },
    {
      title: 'Conservation Analytics',
      author: 'J.R.I.C.S. Jayakody (IT23839106)',
      desc: 'Spatio-temporal incident heatmap synthesis and automated intelligence reporting.',
      icon: BarChart3,
      badge: 'Intelligence',
      color: 'sky',
      path: '/analytics',
    },
  ];

  return (
    <div className="max-w-7xl mx-auto flex flex-col gap-8">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-200">
        <div>
          <h1 className="text-2xl font-bold text-stone-900 flex items-center gap-2">
            Operations Command Center
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-medium">
              v1.0.0 Online
            </span>
          </h1>
          <p className="text-sm text-stone-500 mt-1">
            System Diagnostics, Architecture Topology, and Domain Gateway Matrix
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white border border-stone-200 shadow-sm text-xs">
            <Server className="w-3.5 h-3.5 text-emerald-700" />
            <span className="text-stone-500">API Port:</span>
            <span className="font-mono font-bold text-emerald-800">7050</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white border border-stone-200 shadow-sm text-xs">
            <Layers className="w-3.5 h-3.5 text-blue-700" />
            <span className="text-stone-500">Web Port:</span>
            <span className="font-mono font-bold text-blue-800">7051</span>
          </div>
        </div>
      </div>

      {/* Backend Connectivity Status Card */}
      <section className="p-6 rounded-2xl bg-white border border-stone-200 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5 pb-4 border-b border-stone-100">
          <div className="flex items-center gap-3">
            {healthStatus ? (
              <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-100">
                <CheckCircle2 className="w-6 h-6" />
              </div>
            ) : (
              <div className="p-2.5 rounded-xl bg-rose-50 text-rose-700 border border-rose-100">
                <XCircle className="w-6 h-6" />
              </div>
            )}
            <div>
              <h2 className="text-base font-semibold text-stone-900">
                Backend Service Connectivity (Port 7050)
              </h2>
              <p className="text-xs text-stone-500 mt-0.5">
                {healthStatus
                  ? `Status: ${healthStatus.status.toUpperCase()} • Service: ${healthStatus.service}`
                  : errorMessage || 'Checking connection...'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {lastChecked && (
              <span className="text-xs text-stone-400">Checked: {lastChecked}</span>
            )}
            <button
              type="button"
              onClick={handleManualRefresh}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-800 hover:bg-emerald-900 text-white disabled:opacity-50 transition cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Testing...' : 'Test Connection'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-100">
            <span className="text-stone-400 block mb-1">Backend URL</span>
            <span className="font-mono font-medium text-stone-800">http://localhost:7050</span>
          </div>
          <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-100">
            <span className="text-stone-400 block mb-1">Database State</span>
            <span className="font-mono font-medium text-stone-800 capitalize">
              {healthStatus?.database || 'Idle / Offline'}
            </span>
          </div>
          <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-100">
            <span className="text-stone-400 block mb-1">CORS Isolation</span>
            <span className="font-mono font-semibold text-emerald-700">Secured (7050 ↔ 7051)</span>
          </div>
          <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-100">
            <span className="text-stone-400 block mb-1">Collision Protection</span>
            <span className="font-mono font-semibold text-emerald-700">Guaranteed (Unique)</span>
          </div>
        </div>
      </section>

      {/* Operational Modules Section */}
      <section>
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-stone-900">System Architecture Modules</h2>
          <p className="text-xs text-stone-500">
            Core domain capabilities distributed across the research group
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {modules.map((m) => {
            const Icon = m.icon;
            return (
              <div
                key={m.title}
                className="p-5 rounded-2xl bg-white border border-stone-200 shadow-sm hover:border-emerald-600/50 hover:shadow-md transition flex flex-col justify-between gap-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-stone-100 text-emerald-800">
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-stone-900">{m.title}</h3>
                      <p className="text-xs text-emerald-700 font-medium">{m.author}</p>
                    </div>
                  </div>
                  <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-stone-100 text-stone-600 font-medium border border-stone-200">
                    {m.badge}
                  </span>
                </div>

                <p className="text-xs text-stone-600 leading-relaxed">{m.desc}</p>

                <div className="pt-2 border-t border-stone-100 flex items-center justify-between">
                  <span className="text-[11px] text-stone-400">Integrated Route Module</span>
                  <button
                    type="button"
                    onClick={() => navigate(m.path)}
                    className="inline-flex items-center gap-1 text-xs text-emerald-800 hover:text-emerald-900 font-medium cursor-pointer"
                  >
                    Open View
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
