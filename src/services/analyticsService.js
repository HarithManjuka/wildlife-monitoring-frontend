import axios from 'axios';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// helpers

const INCIDENT_TYPES = ['Poaching', 'Animal Carcass', 'Snare', 'Illegal Campsite', 'Wildlife Sighting', 'Other'];
const ZONES = ['Zone A - River Basin', 'Zone B - Crop Crossing', 'Zone C - Central Plains', 'Zone D - Buffer Strip', 'Zone E - Southern Boundary'];
const SEVERITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

/** Deterministic pseudo-random seeded by a string (so filters produce stable output) */
function seededRandom(seed) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0;
  return () => {
    h = Math.imul(h ^ (h >>> 16), 0x45d9f3b);
    h = Math.imul(h ^ (h >>> 16), 0x45d9f3b);
    return ((h ^ (h >>> 16)) >>> 0) / 0xffffffff;
  };
}

/**
 * Generates structurally-identical simulated data from filter parameters.
 */
function generateSimulatedData(park, dateFrom, dateTo, reportType) {
  const seed = `${park}-${dateFrom}-${dateTo}-${reportType}`;
  const rand = seededRandom(seed);

  const days = Math.max(
    1,
    Math.round((new Date(dateTo) - new Date(dateFrom)) / 86400000) || 30
  );
  const baseCount = Math.floor(rand() * 60) + 20; // 20..79

  // Trend — weekly buckets
  const weeks = Math.ceil(days / 7);
  const trend = Array.from({ length: weeks }, (_, i) => {
    const d = new Date(dateFrom || Date.now());
    d.setDate(d.getDate() + i * 7);
    return {
      week: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      incidents: Math.floor(rand() * (baseCount / weeks) * 2),
      alerts: Math.floor(rand() * 5),
    };
  });

  // Incidents by type
  const byType = {};
  let remaining = baseCount;
  INCIDENT_TYPES.forEach((t, idx) => {
    const n = idx === INCIDENT_TYPES.length - 1 ? remaining : Math.floor(rand() * (remaining / 2));
    byType[t] = n;
    remaining -= n;
  });

  // Hotspots
  const hotspots = ZONES.map((zone) => {
    const count = Math.floor(rand() * 15);
    return {
      location: zone,
      count,
      severity: count >= 10 ? 'CRITICAL' : count >= 6 ? 'HIGH' : count >= 3 ? 'MEDIUM' : 'LOW',
      density: Math.min(count / 15, 1),
    };
  }).sort((a, b) => b.count - a.count);

  // Patrol coverage
  const patrolledZones = ZONES.filter(() => rand() > 0.3);
  const coverageScore = Math.round((patrolledZones.length / ZONES.length) * 100);
  const zoneBreakdown = ZONES.map((z) => ({
    name: z,
    patrols: patrolledZones.includes(z) ? Math.floor(rand() * 8) + 1 : 0,
  }));

  // Geofence alerts 
  const activeAlerts = Math.floor(rand() * 10) + 2;

  return {
    summary: {
      totalIncidents: baseCount,
      activeAlerts,
      communityReports: Math.floor(rand() * 20) + 5,
      activeHotspots: hotspots.filter((h) => h.severity === 'HIGH' || h.severity === 'CRITICAL').length,
      activeRangers: Math.floor(rand() * 8) + 3,
    },
    report: {
      reportType,
      totalIncidents: baseCount,
      byType,
      trend,
      hotspots,
      patrolCoverage: {
        coverageScore,
        coverageGap: 100 - coverageScore,
        zones: zoneBreakdown,
      },
    },
  };
}

//community queue simulation

function generateQueueItem(rand, index) {
  const types = ['Crop Raid', 'Elephant Incursion', 'Fence Damage', 'Predator Attack', 'Illegal Entry Sighting'];
  const statuses = ['PENDING', 'IN_REVIEW', 'PENDING', 'PENDING', 'IN_REVIEW', 'RESOLVED'];
  const threats = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
  const zones = ZONES;

  const daysAgo = Math.floor(rand() * 14);
  const reported = new Date();
  reported.setDate(reported.getDate() - daysAgo);

  return {
    id: `CR-${1000 + index}`,
    reportedAt: reported.toISOString(),
    type: types[Math.floor(rand() * types.length)],
    location: zones[Math.floor(rand() * zones.length)],
    threatLevel: threats[Math.floor(rand() * threats.length)],
    status: statuses[Math.floor(rand() * statuses.length)],
    source: 'SMS',
    description: 'Field report submitted via community SMS gateway.',
  };
}

// public API 

const token = () => localStorage.getItem('token');

/**
 * Fetch summary KPIs for the landing dashboard.
 * Falls back to simulation if the backend is unavailable.
 */
export async function fetchDashboardSummary(park = 'ALL') {
  try {
    const { data } = await axios.get(`${API}/analytics/summary`, {
      params: { park },
      headers: { Authorization: `Bearer ${token()}` },
      timeout: 4000,
    });
    return data.summary;
  } catch {
    const sim = generateSimulatedData(park, null, null, 'INCIDENT_ANALYSIS');
    return sim.summary;
  }
}

/**
 * Generate a conservation analytics report.
 * criteria: { park, dateFrom, dateTo, reportType, incidentType, severity }
 */
export async function fetchReport(criteria) {
  const { park, dateFrom, dateTo, reportType } = criteria;
  try {
    const { data } = await axios.post(`${API}/analytics/report`, criteria, {
      headers: { Authorization: `Bearer ${token()}` },
      timeout: 6000,
    });
    return data.report;
  } catch {
    const sim = generateSimulatedData(park, dateFrom, dateTo, reportType);
    return sim.report;
  }
}

/**
 * Fetch community conflict queue 
 */
export async function fetchCommunityQueue(filters = {}) {
  try {
    const { data } = await axios.get(`${API}/analytics/queue`, {
      params: filters,
      headers: { Authorization: `Bearer ${token()}` },
      timeout: 4000,
    });
    return data.reports;
  } catch {
    // Simulate queue using deterministic seed
    const rand = seededRandom(`queue-${JSON.stringify(filters)}-${new Date().toDateString()}`);
    const count = Math.floor(rand() * 12) + 4;
    return Array.from({ length: count }, (_, i) => generateQueueItem(rand, i));
  }
}
