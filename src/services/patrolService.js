import api from '../utils/api';

/**
 * Patrol & Incident Service for Frontend (UC-01)
 * Author: M.U. Handaragama (IT23819092)
 * Features:
 * - Direct REST API integration
 * - Local-First Offline Caching via LocalStorage
 * - Resilient Batch Sync Queue
 */

const STORAGE_KEYS = {
  ACTIVE_PATROL: 'wildlife_active_patrol_v1',
  OFFLINE_QUEUE: 'wildlife_offline_queue_v1',
  CACHED_INCIDENTS: 'wildlife_cached_incidents_v1',
};

export const patrolService = {
  // 1. Fetch available routes
  async getRoutes() {
    try {
      const res = await api.get('/patrols/routes');
      return res.data.routes || [];
    } catch (err) {
      console.warn('Using offline fallback routes:', err.message);
      return [
        { id: 'route-1a', name: 'Patrol Route 1A - Eastern River Basin', sector: 'Sector 4', targetDistanceKm: 8.5 },
        { id: 'route-2b', name: 'Patrol Route 2B - Boundary Electric Fence', sector: 'Sector 2', targetDistanceKm: 12.0 },
        { id: 'route-3c', name: 'Patrol Route 3C - Southern Scrub Corridor', sector: 'Sector 7', targetDistanceKm: 6.2 },
        { id: 'route-4d', name: 'Patrol Route 4D - Mountain Ridge Lookout', sector: 'Sector 1', targetDistanceKm: 9.8 },
      ];
    }
  },

  // 2. Fetch all patrols
  async getPatrols(params = {}) {
    try {
      const res = await api.get('/patrols/list', { params });
      return res.data.patrols || [];
    } catch {
      // Fallback to local offline cache
      const active = this.getActivePatrolLocal();
      return active ? [active] : [];
    }
  },

  // 3. Start a patrol session
  async startPatrol(patrolData) {
    const localId = `loc-pat-${Date.now()}`;
    const initialRecord = {
      id: localId,
      localId,
      ...patrolData,
      status: 'IN_PROGRESS',
      startTime: new Date().toISOString(),
      distanceKm: 0,
      waypoints: [],
      incidentsCount: 0,
      syncStatus: 'PENDING_SYNC',
    };

    // Always cache locally first (Local-First pattern)
    this.setActivePatrolLocal(initialRecord);

    try {
      const res = await api.post('/patrols/start', { ...patrolData, localId });
      if (res.data?.patrol) {
        this.setActivePatrolLocal(res.data.patrol);
        return { ...res.data.patrol, isOnline: true };
      }
    } catch (err) {
      console.log('[PatrolService] Offline: Patrol started in local storage mode:', err.message);
      this.enqueueOfflineItem('patrol', initialRecord);
    }

    return { ...initialRecord, isOnline: false };
  },

  // 4. Add GPS or Manual Waypoint
  async addWaypoint(patrolId, waypointData) {
    const active = this.getActivePatrolLocal();
    if (active && (active.id === patrolId || active.localId === patrolId)) {
      const wp = {
        ...waypointData,
        timestamp: new Date().toISOString(),
      };
      active.waypoints = active.waypoints || [];
      active.waypoints.push(wp);
      // Rough distance addition (approx 0.05km per breadcrumb)
      active.distanceKm = Math.round(((active.distanceKm || 0) + 0.05) * 100) / 100;
      this.setActivePatrolLocal(active);
    }

    try {
      const res = await api.post(`/patrols/${patrolId}/waypoint`, waypointData);
      return res.data.patrol;
    } catch {
      return active;
    }
  },

  // 5. End Patrol session
  async endPatrol(patrolId, data = {}) {
    const active = this.getActivePatrolLocal();
    const finalized = {
      ...(active || {}),
      status: 'COMPLETED',
      endTime: new Date().toISOString(),
      batteryLevel: data.batteryLevel || 80,
    };

    // Remove from active, enqueue for sync if pending
    this.clearActivePatrolLocal();

    try {
      const res = await api.post(`/patrols/${patrolId}/end`, data);
      return res.data.patrol;
    } catch {
      this.enqueueOfflineItem('patrol', finalized);
      return finalized;
    }
  },

  // 6. Log a field incident
  async logIncident(incidentData) {
    const localId = `loc-inc-${Date.now()}`;
    const incidentRecord = {
      id: localId,
      localId,
      ...incidentData,
      reportedAt: new Date().toISOString(),
      syncStatus: 'PENDING_SYNC',
    };

    // Save into local incident list
    this.saveCachedIncident(incidentRecord);

    // Update active patrol count
    const active = this.getActivePatrolLocal();
    if (active) {
      active.incidentsCount = (active.incidentsCount || 0) + 1;
      this.setActivePatrolLocal(active);
    }

    try {
      const res = await api.post('/incidents', { ...incidentData, localId });
      if (res.data?.incident) {
        this.saveCachedIncident(res.data.incident);
        return { ...res.data.incident, isOnline: true };
      }
    } catch (err) {
      console.log('[PatrolService] Offline: Incident queued locally:', err.message);
      this.enqueueOfflineItem('incident', incidentRecord);
    }

    return { ...incidentRecord, isOnline: false };
  },

  // 7. Update Incident (Alternative Flow A2)
  async updateIncident(incidentId, updateData) {
    const incidents = this.getCachedIncidents();
    const index = incidents.findIndex((i) => i.id === incidentId || i.localId === incidentId);
    let updatedRecord = null;

    if (index !== -1) {
      incidents[index] = { ...incidents[index], ...updateData };
      localStorage.setItem(STORAGE_KEYS.CACHED_INCIDENTS, JSON.stringify(incidents));
      updatedRecord = incidents[index];
    }

    try {
      const res = await api.put(`/incidents/${incidentId}`, updateData);
      return res.data.incident;
    } catch {
      if (updatedRecord) {
        this.enqueueOfflineItem('incident', updatedRecord);
      }
      return updatedRecord;
    }
  },

  // 8. Fetch all incidents
  async getIncidents(params = {}) {
    try {
      const res = await api.get('/incidents', { params });
      if (res.data?.incidents) {
        // Merge with local cached
        const serverList = res.data.incidents;
        serverList.forEach((inc) => this.saveCachedIncident(inc));
        return serverList;
      }
    } catch {
      // Offline fallback
    }
    return this.getCachedIncidents();
  },

  // ==========================================
  // OFFLINE QUEUE & LOCAL STORAGE HELPERS
  // ==========================================

  getActivePatrolLocal() {
    try {
      const val = localStorage.getItem(STORAGE_KEYS.ACTIVE_PATROL);
      return val ? JSON.parse(val) : null;
    } catch {
      return null;
    }
  },

  setActivePatrolLocal(patrol) {
    localStorage.setItem(STORAGE_KEYS.ACTIVE_PATROL, JSON.stringify(patrol));
  },

  clearActivePatrolLocal() {
    localStorage.removeItem(STORAGE_KEYS.ACTIVE_PATROL);
  },

  getCachedIncidents() {
    try {
      const val = localStorage.getItem(STORAGE_KEYS.CACHED_INCIDENTS);
      return val ? JSON.parse(val) : [];
    } catch {
      return [];
    }
  },

  saveCachedIncident(incident) {
    const list = this.getCachedIncidents();
    const idx = list.findIndex((i) => (incident.id && i.id === incident.id) || (incident.localId && i.localId === incident.localId));
    if (idx !== -1) {
      list[idx] = incident;
    } else {
      list.unshift(incident);
    }
    localStorage.setItem(STORAGE_KEYS.CACHED_INCIDENTS, JSON.stringify(list));
  },

  getOfflineQueue() {
    try {
      const val = localStorage.getItem(STORAGE_KEYS.OFFLINE_QUEUE);
      return val ? JSON.parse(val) : { patrols: [], incidents: [] };
    } catch {
      return { patrols: [], incidents: [] };
    }
  },

  enqueueOfflineItem(type, item) {
    const q = this.getOfflineQueue();
    if (type === 'patrol') {
      const idx = q.patrols.findIndex((p) => p.localId === item.localId);
      if (idx !== -1) q.patrols[idx] = item;
      else q.patrols.push(item);
    } else if (type === 'incident') {
      const idx = q.incidents.findIndex((i) => i.localId === item.localId);
      if (idx !== -1) q.incidents[idx] = item;
      else q.incidents.push(item);
    }
    localStorage.setItem(STORAGE_KEYS.OFFLINE_QUEUE, JSON.stringify(q));
  },

  clearOfflineQueue() {
    localStorage.setItem(STORAGE_KEYS.OFFLINE_QUEUE, JSON.stringify({ patrols: [], incidents: [] }));
  },

  getPendingQueueCount() {
    const q = this.getOfflineQueue();
    return (q.patrols?.length || 0) + (q.incidents?.length || 0);
  },

  // 9. Batch Sync to Backend
  async syncOfflineBatch() {
    const q = this.getOfflineQueue();
    if (q.patrols.length === 0 && q.incidents.length === 0) {
      return { success: true, message: 'Queue is empty. Everything is up to date.' };
    }

    try {
      const res = await api.post('/patrols/sync', {
        patrols: q.patrols,
        incidents: q.incidents,
      });

      if (res.data?.success) {
        this.clearOfflineQueue();
        return res.data;
      }
    } catch (err) {
      throw new Error(`Sync failed: ${err.message || 'Network unreachable'}`);
    }
  },
};
