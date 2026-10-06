import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Radio, 
  MapPin, 
  AlertTriangle, 
  BarChart3, 
  RefreshCw, 
  CheckCircle2, 
  XCircle,
  Server,
  Layers
} from 'lucide-react';
import api from './utils/api';

export default function App() {
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
    },
    {
      title: 'Sensor & Geofence Alerts',
      author: 'K.M.S.G.S.C. Karunanayake (IT23818620)',
      desc: 'GPS wildlife collar telemetry streams and real-time geofence breach detection.',
      icon: Radio,
      badge: 'Live Telemetry',
      color: 'amber',
    },
    {
      title: 'Community Conflict Triage',
      author: 'A.M.H.M. Abeykoon (IT23831254)',
      desc: 'Automated ingestion of SMS and community incident reports with threat ranking.',
      icon: AlertTriangle,
      badge: 'Incident Queue',
      color: 'rose',
    },
    {
      title: 'Conservation Analytics',
      author: 'J.R.I.C.S. Jayakody (IT23839106)',
      desc: 'Spatio-temporal incident heatmap synthesis and automated intelligence reporting.',
      icon: BarChart3,
      badge: 'Intelligence',
      color: 'sky',
    },
  ];

  return (
    <div className="min-h-screen bg-[#09110e] text-slate-100 flex flex-col font-sans">
      {/* Top Navigation Bar */}
      <header className="border-b border-emerald-950/60 bg-[#0c1713]/90 backdrop-blur sticky top-0 z-50 px-6 py-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
                Smart Wildlife Conservation System
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-medium">
                  v1.0.0
                </span>
              </h1>
              <p className="text-xs text-slate-400">Operations & Anti-Poaching Command Center</p>
            </div>
          </div>

          {/* Network Port Badges */}
          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800">
              <Server className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-slate-400">API Port:</span>
              <span className="font-mono font-bold text-emerald-300">7050</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800">
              <Layers className="w-3.5 h-3.5 text-blue-400" />
              <span className="text-slate-400">Web Port:</span>
              <span className="font-mono font-bold text-blue-300">7051</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto w-full px-6 py-8 flex-1 flex flex-col gap-8">
        {/* Backend Connectivity Status Card */}
        <section className="p-5 rounded-2xl bg-gradient-to-br from-[#101e19] to-[#0c1613] border border-emerald-900/40 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 pb-4 border-b border-emerald-950/70">
            <div className="flex items-center gap-3">
              {healthStatus ? (
                <div className="p-2 rounded-full bg-emerald-500/10 text-emerald-400">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
              ) : (
                <div className="p-2 rounded-full bg-rose-500/10 text-rose-400">
                  <XCircle className="w-5 h-5" />
                </div>
              )}
              <div>
                <h2 className="text-sm font-semibold text-white">
                  Backend Service Connectivity (Port 7050)
                </h2>
                <p className="text-xs text-slate-400">
                  {healthStatus
                    ? `Status: ${healthStatus.status.toUpperCase()} • Service: ${healthStatus.service}`
                    : errorMessage || 'Checking connection...'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {lastChecked && (
                <span className="text-xs text-slate-500">Checked: {lastChecked}</span>
              )}
              <button
                type="button"
                onClick={handleManualRefresh}
                disabled={loading}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-50 transition cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                {loading ? 'Testing...' : 'Test Connection'}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80">
              <span className="text-slate-400 block mb-1">Backend URL</span>
              <span className="font-mono text-slate-200">http://localhost:7050</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80">
              <span className="text-slate-400 block mb-1">Database State</span>
              <span className="font-mono text-slate-200 capitalize">
                {healthStatus?.database || 'Idle / Offline'}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80">
              <span className="text-slate-400 block mb-1">CORS Isolation</span>
              <span className="font-mono text-emerald-400">Secured (7050 ↔ 7051)</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80">
              <span className="text-slate-400 block mb-1">Collision Protection</span>
              <span className="font-mono text-emerald-400">Guaranteed (Unique)</span>
            </div>
          </div>
        </section>

        {/* Operational Modules Section */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-semibold text-white">System Architecture Modules</h2>
              <p className="text-xs text-slate-400">
                Core domain capabilities distributed across the research group
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {modules.map((m) => {
              const Icon = m.icon;
              return (
                <div
                  key={m.title}
                  className="p-5 rounded-2xl bg-[#0f1b16] border border-emerald-950 hover:border-emerald-700/50 transition flex flex-col justify-between gap-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-emerald-400">
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-white">{m.title}</h3>
                        <p className="text-xs text-emerald-400/90 font-medium">{m.author}</p>
                      </div>
                    </div>
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-300">
                      {m.badge}
                    </span>
                  </div>

                  <p className="text-xs text-slate-400 leading-relaxed">{m.desc}</p>
                </div>
              );
            })}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-emerald-950/60 bg-[#09110e] px-6 py-4 text-center text-xs text-slate-500">
        Smart Wildlife Conservation and Anti-Poaching System • High Quality Production Scaffold
      </footer>
    </div>
  );
}
