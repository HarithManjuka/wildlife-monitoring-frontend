import { useState, useEffect } from 'react';
import { Shield, RefreshCw } from 'lucide-react';
import PatrolCoveragePanel from '../components/analytics/PatrolCoveragePanel';
import { fetchReport } from '../services/analyticsService';

export default function PatrolCoveragePage() {
  const [coverage, setCoverage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadCoverage = async () => {
    setLoading(true);
    setError(null);
    try {
      const today = new Date().toISOString().slice(0, 10);
      const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
      const report = await fetchReport({
        park: 'ALL',
        dateFrom: thirtyDaysAgo,
        dateTo: today,
        reportType: 'PATROL_COVERAGE',
      });
      setCoverage(report?.patrolCoverage);
    } catch {
      setError('Failed to load patrol coverage data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCoverage();
  }, []);

  return (
    <div className="space-y-6 max-w-[1700px] mx-auto font-sans pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-100 shadow-2xs">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-stone-900 tracking-tight">
                Patrol Coverage Analysis
              </h1>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-stone-100 text-stone-700 font-medium border border-stone-200">
                Park Manager
              </span>
            </div>
            <p className="text-stone-500 text-xs mt-0.5">
              Evaluates ranger patrol distribution across protected conservation sectors
            </p>
          </div>
        </div>

        {/* Top Header Coverage Score & Action */}
        <div className="flex items-center gap-3">
          {coverage && (
            <div className="px-3.5 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 font-semibold text-xs shadow-2xs">
              {coverage.coverageScore}% Sector Coverage
            </div>
          )}
          <button
            onClick={loadCoverage}
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

      {/* Main Coverage Card */}
      <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-xs">
        <div className="mb-4 pb-3 border-b border-stone-100 flex items-center justify-between">
          <h2 className="text-xs font-bold text-stone-900 uppercase tracking-wider">
            Sector Surveillance & Range Distribution
          </h2>
        </div>
        <PatrolCoveragePanel coverage={coverage} loading={loading} />
      </div>
    </div>
  );
}
