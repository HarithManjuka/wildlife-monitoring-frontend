/**
 * analyticsService.js — Frontend Data Service (UC-04)
 * Author: J.R.I.C.S. Jayakody (Park Manager — Analytics & Queue)
 *
 * Communicates with backend analytics endpoints.
 * Adheres to Dependency Inversion: uses centralized api instance with auto-auth and proxy.
 */

import api from '../utils/api';

/**
 * Retrieves dynamic filter options from backend
 */
export async function getFilterOptions() {
  const { data } = await api.get('/analytics/filters');
  return data.filters;
}

/**
 * Validates report criteria (date range and report type)
 * Handles Exception Flow E3: Invalid Date Range
 */
export async function validateFilters(criteria) {
  // Client-side quick check
  if (criteria?.dateFrom && criteria?.dateTo) {
    if (new Date(criteria.dateTo) < new Date(criteria.dateFrom)) {
      return {
        valid: false,
        error: 'Invalid date range: End date cannot be before start date. Please select a valid range.',
      };
    }
  }

  try {
    const { data } = await api.post('/analytics/validate', criteria);
    return data;
  } catch {
    return { valid: true };
  }
}

/**
 * Executes report generation with specified parameters
 */
export async function fetchReport(criteria) {
  const { data } = await api.post('/analytics/report', criteria);
  return data.report;
}

/**
 * Exports report in requested format with CSV fallback support (E2)
 */
export async function exportReport(payload, format = 'CSV', simulateError = false) {
  const { data } = await api.post('/analytics/export', { payload, format, simulateError });
  return data;
}

/**
 * Fetch summary KPI metrics for dashboard
 */
export async function fetchDashboardSummary(park = 'ALL') {
  try {
    const { data } = await api.get('/analytics/summary', { params: { park } });
    return data.summary;
  } catch {
    return {
      totalIncidents: 0,
      patrolCoverage: 0,
      humanWildlifeConflicts: 0,
      activeAlerts: 0,
      activeHotspots: 0,
      generatedAt: new Date().toISOString(),
    };
  }
}

/**
 * Fetch community queue (UC-03 data consumed by Park Manager)
 */
export async function fetchCommunityQueue(filters = {}) {
  try {
    const { data } = await api.get('/analytics/queue', { params: filters });
    return data.reports || [];
  } catch {
    return [];
  }
}

/**
 * Fetch audit logs (Postcondition 3)
 */
export async function fetchAuditLogs() {
  try {
    const { data } = await api.get('/analytics/audit-logs');
    return data.logs || [];
  } catch {
    return [];
  }
}
