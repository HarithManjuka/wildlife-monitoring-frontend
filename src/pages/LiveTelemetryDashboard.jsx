// [IT23818620 - K.M.S.G.S.C. Karunanayake] - UC-02A: Monitor Live Animal Telemetry
// SOLID Principle: SRP - This component is solely responsible for rendering the Live Telemetry view.
// Avoid Code Smell: "Long Method" - Kept the UI rendering concise, extracted logic where possible.

import { useState, useEffect } from 'react';
import telemetryService from '../services/telemetryService';
import { AlertTriangle, MapPin, Activity, CheckCircle, XCircle, Radio, Send, RefreshCw, ShieldCheck, ShieldAlert } from 'lucide-react';

export default function LiveTelemetryDashboard() {
  const [data, setData] = useState({ telemetry: [], collars: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [simulatorStatus, setSimulatorStatus] = useState(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [showSimulator, setShowSimulator] = useState(false);

  const fetchLiveData = async () => {
    try {
      const response = await telemetryService.getLiveTelemetry();
      if (response.success) {
        setData(response.data);
      } else {
        setError(response.error);
      }
    } catch (err) {
      setError('Failed to load telemetry data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLiveData();
    const interval = setInterval(fetchLiveData, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleSimulate = async (type) => {
    setIsSimulating(true);
    setSimulatorStatus(null);
    const activeCollarId = data.collars[0]?.collarId || 'COLLAR-TEST-001';
    const latestTimestamp = data.collars[0]?.latestLocation?.timestamp;

    let payload = {
      collarId: activeCollarId,
      latitude: 6.9271 + (Math.random() * 0.005),
      longitude: 79.8612 + (Math.random() * 0.005),
      timestamp: new Date().toISOString()
    };

    if (type === 'invalid') {
      // Out of bounds coordinates (Latitude > 90)
      payload.latitude = 999.0;
    } else if (type === 'duplicate') {
      // Same timestamp as latest recorded location to trigger duplicate check
      payload.timestamp = latestTimestamp || new Date().toISOString();
      if (data.collars[0]?.latestLocation) {
        payload.latitude = data.collars[0].latestLocation.latitude;
        payload.longitude = data.collars[0].latestLocation.longitude;
      }
    } else if (type === 'stale') {
      // Older than 24 hours to trigger freshness check
      payload.timestamp = new Date(Date.now() - (48 * 60 * 60 * 1000)).toISOString();
    }

    try {
      const res = await telemetryService.ingestTelemetry(payload);
      if (res.success) {
        setSimulatorStatus({
          type: 'success',
          title: 'HTTP 201 - Telemetry Accepted',
          message: `Valid ping ingested successfully for ${activeCollarId}. Coordinates: [${payload.latitude.toFixed(4)}, ${payload.longitude.toFixed(4)}]`
        });
        await fetchLiveData();
      } else {
        setSimulatorStatus({
          type: 'error',
          title: `HTTP 422 - Rejected by Server`,
          message: `Reason: "${res.error || 'Validation failed'}". Invalid or duplicate data was blocked and NOT saved into database.`
        });
        await fetchLiveData();
      }
    } catch (err) {
      setSimulatorStatus({
        type: 'error',
        title: 'Simulation Error',
        message: err.message || 'Failed to simulate telemetry'
      });
    } finally {
      setIsSimulating(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-stone-500">Loading live telemetry stream...</div>;
  }

  if (error) {
    return <div className="p-8 text-red-500 flex items-center gap-2"><AlertTriangle /> {error}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-stone-900 flex items-center gap-2">
            <Activity className="text-emerald-600" /> Live Animal Telemetry
          </h1>
          <p className="text-sm text-stone-500 mt-1">Real-time GPS tracking, sensor diagnostics, and data validation.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchLiveData()}
            className="px-3 py-2 text-xs font-medium text-stone-600 bg-white border border-stone-200 rounded-lg hover:bg-stone-50 flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Refresh stream"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
          <button
            onClick={() => setShowSimulator(!showSimulator)}
            className="px-4 py-2 text-xs font-semibold text-white bg-emerald-800 hover:bg-emerald-700 rounded-lg shadow-sm flex items-center gap-2 transition-colors cursor-pointer"
          >
            <Radio className="w-3.5 h-3.5" /> {showSimulator ? 'Hide Test Simulator' : 'Simulate Collar Stream'}
          </button>
        </div>
      </div>

      {/* Viva / Testing Interactive Simulator */}
      {showSimulator && (
        <div className="bg-stone-900 text-stone-100 rounded-2xl p-6 shadow-lg border border-stone-800 space-y-4">
          <div className="flex justify-between items-center border-b border-stone-800 pb-3">
            <div>
              <h3 className="text-sm font-bold text-emerald-400 flex items-center gap-2">
                <Radio className="w-4 h-4 animate-pulse text-emerald-400" />
                IoT Collar Telemetry Transmission Sandbox (UC-02A)
              </h3>
              <p className="text-xs text-stone-400 mt-0.5">
                Simulate collar signals to demonstrate real-time validation, duplicate filtering, and stale detection.
              </p>
            </div>
            <span className="text-[11px] font-mono bg-stone-800 text-stone-300 px-2 py-0.5 rounded border border-stone-700">
              Target: {data.collars[0]?.collarId || 'COLLAR-TEST-001'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* 1. Valid Ping */}
            <button
              onClick={() => handleSimulate('valid')}
              disabled={isSimulating}
              className="p-3 bg-stone-800 hover:bg-stone-750 border border-emerald-500/40 rounded-xl text-left transition hover:border-emerald-400 cursor-pointer disabled:opacity-50"
            >
              <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold mb-1">
                <CheckCircle className="w-4 h-4" /> 1. Valid GPS Ping
              </div>
              <p className="text-[11px] text-stone-400">Sends normal coordinate within bounds. Updates animal map location.</p>
            </button>

            {/* 2. Invalid Coordinate */}
            <button
              onClick={() => handleSimulate('invalid')}
              disabled={isSimulating}
              className="p-3 bg-stone-800 hover:bg-stone-750 border border-rose-500/40 rounded-xl text-left transition hover:border-rose-400 cursor-pointer disabled:opacity-50"
            >
              <div className="flex items-center gap-2 text-rose-400 text-xs font-bold mb-1">
                <ShieldAlert className="w-4 h-4" /> 2. Invalid GPS (Lat 999°)
              </div>
              <p className="text-[11px] text-stone-400">Triggers out-of-bounds rejection via ValidationService (HTTP 422).</p>
            </button>

            {/* 3. Duplicate Ping */}
            <button
              onClick={() => handleSimulate('duplicate')}
              disabled={isSimulating}
              className="p-3 bg-stone-800 hover:bg-stone-750 border border-amber-500/40 rounded-xl text-left transition hover:border-amber-400 cursor-pointer disabled:opacity-50"
            >
              <div className="flex items-center gap-2 text-amber-400 text-xs font-bold mb-1">
                <AlertTriangle className="w-4 h-4" /> 3. Duplicate Ping
              </div>
              <p className="text-[11px] text-stone-400">Replays latest timestamp. Triggers duplicate detection (HTTP 422).</p>
            </button>

            {/* 4. Stale Ping */}
            <button
              onClick={() => handleSimulate('stale')}
              disabled={isSimulating}
              className="p-3 bg-stone-800 hover:bg-stone-750 border border-yellow-500/40 rounded-xl text-left transition hover:border-yellow-400 cursor-pointer disabled:opacity-50"
            >
              <div className="flex items-center gap-2 text-yellow-400 text-xs font-bold mb-1">
                <Activity className="w-4 h-4" /> 4. Stale Ping (&gt;24h)
              </div>
              <p className="text-[11px] text-stone-400">Sends 48h old timestamp. Auto updates collar health badge to "Stale".</p>
            </button>
          </div>

          {/* Result Alert Banner */}
          {simulatorStatus && (
            <div
              className={`p-3 rounded-xl border flex items-start gap-3 text-xs ${
                simulatorStatus.type === 'success'
                  ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-200'
                  : 'bg-rose-950/60 border-rose-500/50 text-rose-200'
              }`}
            >
              {simulatorStatus.type === 'success' ? (
                <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              )}
              <div>
                <p className="font-bold">{simulatorStatus.title}</p>
                <p className="text-[11px] opacity-90 mt-0.5">{simulatorStatus.message}</p>
              </div>
            </div>
          )}
        </div>
      )}


      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {data.collars.map((collar) => (
          <div key={collar.collarId} className="bg-white rounded-xl shadow-sm border border-stone-200 p-5 hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-bold text-stone-800">Animal: {collar.animalId}</h3>
                <p className="text-xs text-stone-500">Collar ID: {collar.collarId}</p>
              </div>
              {collar.health === 'Online' ? (
                <span className="bg-emerald-100 text-emerald-800 text-xs font-semibold px-2.5 py-0.5 rounded flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" /> Online
                </span>
              ) : collar.health === 'Stale' ? (
                 <span className="bg-yellow-100 text-yellow-800 text-xs font-semibold px-2.5 py-0.5 rounded flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> Stale
                </span>
              ) : (
                <span className="bg-red-100 text-red-800 text-xs font-semibold px-2.5 py-0.5 rounded flex items-center gap-1">
                  <XCircle className="w-3 h-3" /> {collar.health || 'Offline'}
                </span>
              )}
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center text-sm text-stone-600 gap-2 bg-stone-50 p-2 rounded-lg">
                <MapPin className="w-4 h-4 text-stone-400" />
                <span className="font-mono text-xs">
                  {collar.latestLocation ? `${collar.latestLocation.latitude.toFixed(4)}, ${collar.latestLocation.longitude.toFixed(4)}` : 'No location data'}
                </span>
              </div>
              <div className="text-xs text-stone-500 text-right">
                Last updated: {collar.latestLocation?.timestamp ? new Date(collar.latestLocation.timestamp).toLocaleTimeString() : 'N/A'}
              </div>
            </div>
          </div>
        ))}
        {data.collars.length === 0 && (
          <div className="col-span-full text-center py-12 text-stone-500 bg-stone-50 rounded-xl border border-dashed border-stone-300">
            No active collars registered in the system.
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-stone-200 bg-stone-50">
          <h2 className="text-lg font-semibold text-stone-800">Recent Telemetry Ping Log</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-stone-200">
            <thead className="bg-stone-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">Timestamp</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">Collar ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">Latitude</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">Longitude</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-stone-200">
              {data.telemetry.slice(0, 10).map((ping, idx) => (
                <tr key={ping._id || idx} className="hover:bg-stone-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-stone-900 font-medium">
                    {new Date(ping.timestamp).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-stone-500 font-mono">
                    {ping.collarId}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-stone-500">
                    {ping.latitude.toFixed(6)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-stone-500">
                    {ping.longitude.toFixed(6)}
                  </td>
                </tr>
              ))}
              {data.telemetry.length === 0 && (
                <tr>
                  <td colSpan="4" className="px-6 py-8 text-center text-sm text-stone-500">
                    No telemetry data received yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
