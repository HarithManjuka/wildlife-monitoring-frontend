import React, { useState, useEffect } from 'react';
import { patrolService } from '../../services/patrolService';
import {
  Route,
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Compass,
  MapPin,
  RefreshCw,
  Shield,
  Layers,
} from 'lucide-react';

export default function PatrolRoutesManager() {
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    sector: 'Sector 5',
    targetDistanceKm: 8.0,
    riskLevel: 'MEDIUM',
    description: '',
  });

  const loadRoutes = async () => {
    setLoading(true);
    try {
      const data = await patrolService.getRoutes();
      setRoutes(data || []);
    } catch (err) {
      console.error('Failed to load routes:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRoutes();
  }, []);

  const handleCreateRoute = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setFeedback({ type: 'error', message: 'Route name is required' });
      return;
    }

    setSubmitting(true);
    setFeedback(null);
    try {
      const created = await patrolService.createRoute({
        ...formData,
        targetDistanceKm: Number(formData.targetDistanceKm) || 5.0,
      });
      setFeedback({
        type: 'success',
        message: `Route "${created.name}" created and published to Field Rangers!`,
      });
      setShowAddModal(false);
      setFormData({
        name: '',
        sector: 'Sector 5',
        targetDistanceKm: 8.0,
        riskLevel: 'MEDIUM',
        description: '',
      });
      await loadRoutes();
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err.response?.data?.error || err.message || 'Failed to create route',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteRoute = async (routeId, routeName) => {
    if (!window.confirm(`Are you sure you want to remove patrol route "${routeName}"?`)) {
      return;
    }
    try {
      await patrolService.deleteRoute(routeId);
      setFeedback({ type: 'success', message: `Route "${routeName}" removed successfully.` });
      await loadRoutes();
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err.response?.data?.error || err.message || 'Cannot remove predefined route',
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-5 rounded-2xl bg-stone-900/80 border border-stone-800">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Route className="w-5 h-5 text-emerald-400" />
            Patrol Route Management
          </h2>
          <p className="text-xs text-stone-400 mt-1">
            Park Managers can define new conservation sectors and patrol itineraries that dynamically synchronize with Field Rangers.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={loadRoutes}
            disabled={loading}
            className="p-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 transition cursor-pointer"
            title="Refresh routes"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="py-2.5 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white font-semibold text-xs flex items-center gap-2 shadow-lg shadow-emerald-950/40 transition cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            Add New Patrol Route
          </button>
        </div>
      </div>

      {/* Feedback Alert */}
      {feedback && (
        <div
          className={`p-4 rounded-xl text-xs flex items-center justify-between ${
            feedback.type === 'success'
              ? 'bg-emerald-950/50 border border-emerald-800 text-emerald-300'
              : 'bg-rose-950/50 border border-rose-800 text-rose-300'
          }`}
        >
          <span>{feedback.message}</span>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-stone-400 hover:text-white text-sm ml-2 cursor-pointer"
          >
            ×
          </button>
        </div>
      )}

      {/* Routes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {routes.map((r) => {
          const isCustom = r.isCustom || !r.id.startsWith('route-');
          return (
            <div
              key={r.id}
              className="bg-stone-900/60 border border-stone-800 hover:border-emerald-800/60 rounded-2xl p-5 flex flex-col justify-between transition shadow-sm"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-800/60 text-emerald-400">
                    {r.sector || 'General'}
                  </span>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                        r.riskLevel === 'HIGH'
                          ? 'bg-rose-950/60 text-rose-400 border border-rose-800/60'
                          : r.riskLevel === 'MEDIUM'
                          ? 'bg-amber-950/60 text-amber-400 border border-amber-800/60'
                          : 'bg-blue-950/60 text-blue-400 border border-blue-800/60'
                      }`}
                    >
                      {r.riskLevel || 'STANDARD'} RISK
                    </span>
                    {isCustom && (
                      <button
                        type="button"
                        onClick={() => handleDeleteRoute(r.id, r.name)}
                        className="text-stone-500 hover:text-rose-400 p-1 transition cursor-pointer"
                        title="Delete custom route"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                <h3 className="text-sm font-bold text-white mb-1.5">{r.name}</h3>
                <p className="text-xs text-stone-400 line-clamp-2 mb-3">
                  {r.description || 'Standard perimeter monitoring route.'}
                </p>
              </div>

              <div className="pt-3 border-t border-stone-800 flex items-center justify-between text-xs">
                <span className="text-stone-400 flex items-center gap-1">
                  <Compass className="w-3.5 h-3.5 text-emerald-400" />
                  Target: <strong className="text-white">{r.targetDistanceKm} km</strong>
                </span>
                <span className="text-[10px] text-stone-500">
                  {isCustom ? `By ${r.createdBy || 'Manager'}` : 'Predefined Route'}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal: Add New Patrol Route */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-[#121c17] border border-emerald-900 rounded-2xl p-6 w-full max-w-lg shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-emerald-950">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-emerald-400" />
                Create New Patrol Route
              </h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-stone-400 hover:text-white text-lg cursor-pointer"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleCreateRoute} className="space-y-4 text-xs">
              <div>
                <label className="block text-stone-300 font-semibold mb-1">
                  Route Name <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Yala Block 1 - Gona Lahaba Leopard Loop"
                  className="w-full bg-[#0a1410] border border-emerald-900/60 rounded-xl px-3 py-2.5 text-white placeholder-stone-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-stone-300 font-semibold mb-1">Yala Park Sector</label>
                  <select
                    value={formData.sector}
                    onChange={(e) => setFormData({ ...formData, sector: e.target.value })}
                    className="w-full bg-[#0a1410] border border-emerald-900/60 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="Block 1 (Ruhuna Plains)">Block 1 (Ruhuna Plains)</option>
                    <option value="Block 1 (Coastal & Buthawa)">Block 1 (Coastal & Buthawa)</option>
                    <option value="Block 2 (Kumbukkan Oya)">Block 2 (Kumbukkan Oya)</option>
                    <option value="Block 3 (Sithulpawwa Sanctuary)">Block 3 (Sithulpawwa Sanctuary)</option>
                    <option value="Block 4 (Katagamuwa Perimeter)">Block 4 (Katagamuwa Perimeter)</option>
                    <option value="Block 5 (Lunugamvehera Corridor)">Block 5 (Lunugamvehera Corridor)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-stone-300 font-semibold mb-1">
                    Target Distance (km)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="1"
                    max="50"
                    required
                    value={formData.targetDistanceKm}
                    onChange={(e) => setFormData({ ...formData, targetDistanceKm: e.target.value })}
                    className="w-full bg-[#0a1410] border border-emerald-900/60 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-stone-300 font-semibold mb-1">Risk Classification</label>
                <select
                  value={formData.riskLevel}
                  onChange={(e) => setFormData({ ...formData, riskLevel: e.target.value })}
                  className="w-full bg-[#0a1410] border border-emerald-900/60 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="LOW">LOW Risk (Internal Sanctuary)</option>
                  <option value="MEDIUM">MEDIUM Risk (Standard Buffer)</option>
                  <option value="HIGH">HIGH Risk (Human-Wildlife Conflict Boundary)</option>
                </select>
              </div>

              <div>
                <label className="block text-stone-300 font-semibold mb-1">Description & Key Points</label>
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Details on terrain, high-risk game trails, fence lines to check..."
                  className="w-full bg-[#0a1410] border border-emerald-900/60 rounded-xl px-3 py-2.5 text-white placeholder-stone-500 focus:outline-none focus:border-emerald-500 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-emerald-950">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {submitting ? 'Creating...' : 'Create & Publish Route'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
