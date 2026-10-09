// [IT23818620 - K.M.S.G.S.C. Karunanayake] - UC-02A: Monitor Live Animal Telemetry
// SOLID Principle: SRP - This component is solely responsible for rendering the Live Telemetry view.
// Avoid Code Smell: "Long Method" - Kept the UI rendering concise, extracted logic where possible.

import { useState, useEffect } from 'react';
import telemetryService from '../services/telemetryService';
import { AlertTriangle, MapPin, Activity, CheckCircle, XCircle } from 'lucide-react';

export default function LiveTelemetryDashboard() {
  const [data, setData] = useState({ telemetry: [], collars: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
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

    fetchLiveData();
    // In a real application, we would use WebSockets or Server-Sent Events here.
    // For now, we simulate real-time updates with polling every 10 seconds.
    const interval = setInterval(fetchLiveData, 10000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return <div className="p-8 text-stone-500">Loading live telemetry stream...</div>;
  }

  if (error) {
    return <div className="p-8 text-red-500 flex items-center gap-2"><AlertTriangle /> {error}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-stone-900 flex items-center gap-2">
            <Activity className="text-emerald-600" /> Live Animal Telemetry
          </h1>
          <p className="text-sm text-stone-500 mt-1">Real-time GPS tracking and health monitoring of collared wildlife.</p>
        </div>
      </div>

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
