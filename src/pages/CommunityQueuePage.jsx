import { useState, useEffect } from 'react';
import { Users, RefreshCw, AlertTriangle, Clock, CheckCircle, ShieldAlert } from 'lucide-react';
import CommunityQueuePanel from '../components/analytics/CommunityQueuePanel';
import { fetchCommunityQueue } from '../services/analyticsService';

export default function CommunityQueuePage() {
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadQueue = async () => {
    setLoading(true);
    setError(null);
    try {
      const reports = await fetchCommunityQueue();
      setQueue(reports);
    } catch {
      setError('Failed to load community conflict queue.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQueue();
  }, []);

  // Summary counts for page top
  const pendingCount = queue.filter((q) => q.status === 'Pending').length;
  const highThreatCount = queue.filter((q) => q.threatLevel === 'HIGH' || q.threatLevel === 'CRITICAL').length;
  const resolvedCount = queue.filter((q) => q.status === 'Resolved' || q.status === 'Dispatched').length;

  return (
    <div className="space-y-6 max-w-[1700px] mx-auto font-sans pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-100 shadow-2xs">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-stone-900 tracking-tight">
                Community Conflict Queue
              </h1>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-stone-100 text-stone-700 font-medium border border-stone-200">
                Park Manager
              </span>
            </div>
            <p className="text-stone-500 text-xs mt-0.5">
              Integrated Human-Wildlife Conflict reports ingested from community liaison channels
            </p>
          </div>
        </div>

        {/* Top Header Queue Counter & Action */}
        <div className="flex items-center gap-3">
          <div className="px-3.5 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 font-semibold text-xs shadow-2xs">
            {queue.length} Active Queue Reports
          </div>
          <button
            onClick={loadQueue}
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

      {/* Top Stat Badges / Counter Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider">Total in Queue</p>
            <p className="text-2xl font-bold text-stone-900 mt-1">{queue.length}</p>
          </div>
          <div className="p-3 rounded-xl bg-stone-100 text-stone-700 border border-stone-200">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-amber-700 uppercase tracking-wider">Pending Triage</p>
            <p className="text-2xl font-bold text-amber-900 mt-1">{pendingCount}</p>
          </div>
          <div className="p-3 rounded-xl bg-amber-50 text-amber-800 border border-amber-200">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-rose-700 uppercase tracking-wider">High & Critical Threat</p>
            <p className="text-2xl font-bold text-rose-900 mt-1">{highThreatCount}</p>
          </div>
          <div className="p-3 rounded-xl bg-rose-50 text-rose-800 border border-rose-200">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>

        <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider">Resolved / Dispatched</p>
            <p className="text-2xl font-bold text-emerald-900 mt-1">{resolvedCount}</p>
          </div>
          <div className="p-3 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200">
            <CheckCircle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Main Queue Card */}
      <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-xs">
        <div className="mb-4 pb-3 border-b border-stone-100 flex items-center justify-between">
          <div>
            <h2 className="text-xs font-bold text-stone-900 uppercase tracking-wider">
              Triage Incident Feed
            </h2>
            <p className="text-[11px] text-stone-500 mt-0.5">
              Live human-wildlife conflict incidents submitted by field rangers & community dispatchers
            </p>
          </div>
        </div>
        <CommunityQueuePanel reports={queue} loading={loading} />
      </div>
    </div>
  );
}
