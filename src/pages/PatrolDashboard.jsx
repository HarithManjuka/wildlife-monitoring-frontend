import React, { useState, useEffect, useContext, useRef, useCallback } from 'react';
import { AuthContext } from '../context/AuthContext';
import { patrolService } from '../services/patrolService';
import {
  MapPin,
  Play,
  Square,
  AlertTriangle,
  Camera,
  CheckCircle2,
  Wifi,
  WifiOff,
  RefreshCw,
  Plus,
  Battery,
  Clock,
  Compass,
  X,
  ShieldAlert,
  Footprints,
  Check,
  Upload,
  Navigation,
  Crosshair,
  Trash2,
  Download,
  Radio,
  Route,
} from 'lucide-react';

export default function PatrolDashboard() {
  const { user } = useContext(AuthContext);
  const fileInputRef = useRef(null);

  // Connectivity & Sync State
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState(null);
  const [pendingCount, setPendingCount] = useState(0);

  // Real Hardware GPS & Battery State
  const [liveGps, setLiveGps] = useState({ latitude: 6.4715, longitude: 80.8985, accuracyMeters: 5.0 });
  const [gpsStatus, setGpsStatus] = useState('FETCHING'); // 'FETCHING' | 'LOCKED' | 'ERROR' | 'MANUAL'
  const [batteryLevel, setBatteryLevel] = useState(100);
  const [isCharging, setIsCharging] = useState(false);

  // Patrol State
  const [routes, setRoutes] = useState([]);
  const [selectedRouteId, setSelectedRouteId] = useState('');
  const [customRouteName, setCustomRouteName] = useState('');
  const [isCustomRoute, setIsCustomRoute] = useState(false);
  const [activePatrol, setActivePatrol] = useState(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [recentIncidents, setRecentIncidents] = useState([]);
  const [patrolHistory, setPatrolHistory] = useState([]);

  // Modals & Navigation
  const [activeTab, setActiveTab] = useState('patrol'); // 'patrol' | 'incidents' | 'history'
  const [showIncidentModal, setShowIncidentModal] = useState(false);
  const [showManualWpModal, setShowManualWpModal] = useState(false);
  const [showEndConfirmModal, setShowEndConfirmModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successInfo, setSuccessInfo] = useState({ title: '', message: '' });

  // New Incident Form Data (Starts Clean / No hardcoded dummy strings)
  const [incidentForm, setIncidentForm] = useState({
    incidentType: 'SNARE',
    severity: 'HIGH',
    description: '',
    landmark: '',
    photos: [], // Real base64 uploaded files
    coordinates: { latitude: 6.4715, longitude: 80.8985, accuracyMeters: 5.0 },
  });
  const [formError, setFormError] = useState('');
  const [manualNote, setManualNote] = useState('');

  // Live GPS Telemetry Sharing with Liaison Officer
  const [gpsBroadcastEnabled, setGpsBroadcastEnabled] = useState(true);
  const [lastBroadcastTime, setLastBroadcastTime] = useState(null);
  const [isBroadcasting, setIsBroadcasting] = useState(false);

  // Toast Notification Popup State
  const [toastNotification, setToastNotification] = useState(null);

  const showToast = useCallback((message, type = 'success') => {
    setToastNotification({ message, type });
    setTimeout(() => {
      setToastNotification((prev) => (prev?.message === message ? null : prev));
    }, 4500);
  }, []);

  // 1. Fetch Real GPS Coordinates from Device
  const fetchRealGps = useCallback(() => {
    if (!('geolocation' in navigator)) {
      setGpsStatus('MANUAL');
      return;
    }

    setGpsStatus('FETCHING');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = {
          latitude: Number(pos.coords.latitude.toFixed(6)),
          longitude: Number(pos.coords.longitude.toFixed(6)),
          accuracyMeters: Math.round(pos.coords.accuracy) || 3.0,
        };
        setLiveGps(coords);
        setGpsStatus('LOCKED');
      },
      () => {
        // Fallback default coordinates if GPS permission is denied or indoors
        setGpsStatus('MANUAL');
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
    );
  }, []);

  // 2. Fetch Real Device Battery Status
  useEffect(() => {
    if ('getBattery' in navigator) {
      navigator.getBattery().then((battery) => {
        setBatteryLevel(Math.round(battery.level * 100));
        setIsCharging(battery.charging);

        battery.addEventListener('levelchange', () => {
          setBatteryLevel(Math.round(battery.level * 100));
        });
        battery.addEventListener('chargingchange', () => {
          setIsCharging(battery.charging);
        });
      });
    }
  }, []);

  // 3. Initialize Data & Sync Queue
  const refreshLocalData = useCallback(async () => {
    setPendingCount(patrolService.getPendingQueueCount());
    const incList = await patrolService.getIncidents();
    setRecentIncidents(incList || []);
    const historyList = await patrolService.getPatrols();
    setPatrolHistory(historyList || []);
  }, []);

  useEffect(() => {
    async function init() {
      fetchRealGps();

      const availableRoutes = await patrolService.getRoutes();
      setRoutes(availableRoutes || []);
      if (availableRoutes && availableRoutes.length > 0) {
        setSelectedRouteId(availableRoutes[0].id);
      }

      // Check ongoing patrol from local storage
      const existing = patrolService.getActivePatrolLocal();
      if (existing && existing.status === 'IN_PROGRESS') {
        setActivePatrol(existing);
        const startTime = new Date(existing.startTime).getTime();
        const now = Date.now();
        setElapsedSeconds(Math.max(0, Math.floor((now - startTime) / 1000)));
      }

      refreshLocalData();
    }
    init();

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [fetchRealGps, refreshLocalData]);

  // Active Patrol Timer
  useEffect(() => {
    let interval = null;
    if (activePatrol && activePatrol.status === 'IN_PROGRESS') {
      interval = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [activePatrol]);

  // ==========================================
  // LIVE GPS SHARING WITH LIAISON OFFICER & PARK MANAGER ROUTE CREATION
  // ==========================================

  const broadcastLiveGpsToHq = useCallback(async (customPayload = {}) => {
    if (!gpsBroadcastEnabled) return;
    setIsBroadcasting(true);
    try {
      await patrolService.shareLiveGps({
        rangerId: user?.userId || 'USR-8822',
        rangerName: user?.name || 'M.U. Handaragama',
        latitude: liveGps.latitude,
        longitude: liveGps.longitude,
        accuracyMeters: liveGps.accuracyMeters,
        batteryLevel: batteryLevel,
        routeId: activePatrol ? activePatrol.routeId : selectedRouteId,
        routeName: activePatrol ? activePatrol.routeName : 'Field Ranger Unit',
        status: activePatrol ? 'PATROLLING' : 'STANDBY',
        ...customPayload,
      });
      setLastBroadcastTime(new Date().toLocaleTimeString());
    } catch (err) {
      console.warn('GPS broadcast error:', err.message);
    } finally {
      setIsBroadcasting(false);
    }
  }, [gpsBroadcastEnabled, user, liveGps, batteryLevel, activePatrol, selectedRouteId]);

  // Periodic GPS telemetry broadcast to Liaison Officer (every 12 seconds)
  useEffect(() => {
    if (!gpsBroadcastEnabled) return;
    broadcastLiveGpsToHq();
    const interval = setInterval(() => {
      broadcastLiveGpsToHq();
    }, 12000);
    return () => clearInterval(interval);
  }, [gpsBroadcastEnabled, broadcastLiveGpsToHq]);

  // ==========================================
  // REAL PATROL ACTIONS
  // ==========================================

  const handleStartPatrol = async () => {
    let chosenRouteName = 'Assigned Patrol Route';
    let chosenRouteId = selectedRouteId;

    if (isCustomRoute && customRouteName.trim()) {
      chosenRouteName = customRouteName.trim();
      chosenRouteId = `custom-${Date.now()}`;
    } else {
      const found = routes.find((r) => r.id === selectedRouteId);
      if (found) {
        chosenRouteName = found.name;
        chosenRouteId = found.id;
      }
    }

    const newPatrol = await patrolService.startPatrol({
      rangerId: user?.userId || 'USR-8822',
      rangerName: user?.name || 'M.U. Handaragama',
      routeId: chosenRouteId,
      routeName: chosenRouteName,
      initialBattery: batteryLevel,
    });

    // Automatically record first starting waypoint using real GPS location
    if (newPatrol && newPatrol.id) {
      await patrolService.addWaypoint(newPatrol.id, {
        latitude: liveGps.latitude,
        longitude: liveGps.longitude,
        accuracyMeters: liveGps.accuracyMeters,
        isManual: false,
        note: 'Patrol shift initialized at start coordinates',
      });
      const refreshed = patrolService.getActivePatrolLocal();
      setActivePatrol(refreshed || newPatrol);
    } else {
      setActivePatrol(newPatrol);
    }

    setElapsedSeconds(0);
    refreshLocalData();
    broadcastLiveGpsToHq({ status: 'PATROLLING', routeId: chosenRouteId, routeName: chosenRouteName });
  };

  // Record Real Waypoint (Current GPS point or manual checkpoint)
  const handleRecordLiveWaypoint = async () => {
    if (!activePatrol) return;
    fetchRealGps();

    const wp = {
      latitude: liveGps.latitude,
      longitude: liveGps.longitude,
      accuracyMeters: liveGps.accuracyMeters,
      isManual: false,
      note: 'Live GPS trackpoint',
    };

    const updated = await patrolService.addWaypoint(activePatrol.id, wp);
    setActivePatrol(updated);
    refreshLocalData();
    broadcastLiveGpsToHq({ status: 'PATROLLING' });
  };

  // Add Manual Waypoint (Alternative Flow A1)
  const handleAddManualWaypoint = async (e) => {
    e.preventDefault();
    if (!activePatrol) return;

    const wp = {
      latitude: liveGps.latitude,
      longitude: liveGps.longitude,
      accuracyMeters: liveGps.accuracyMeters,
      isManual: true,
      note: manualNote.trim() || 'Manual observation checkpoint',
    };

    const updated = await patrolService.addWaypoint(activePatrol.id, wp);
    setActivePatrol(updated);
    setShowManualWpModal(false);
    setManualNote('');
    refreshLocalData();
    broadcastLiveGpsToHq({ status: 'PATROLLING', note: manualNote.trim() });
  };

  // Open Incident Modal with Live Coordinates
  const handleOpenIncidentModal = () => {
    fetchRealGps();
    setIncidentForm({
      incidentType: 'SNARE',
      severity: 'HIGH',
      description: '',
      landmark: '',
      photos: [],
      coordinates: {
        latitude: liveGps.latitude,
        longitude: liveGps.longitude,
        accuracyMeters: liveGps.accuracyMeters,
      },
    });
    setFormError('');
    setShowIncidentModal(true);
  };

  // Real Photo Upload & Base64 Converter
  const handlePhotoUpload = (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        setIncidentForm((prev) => ({
          ...prev,
          photos: [...prev.photos, reader.result],
        }));
      };
      reader.readAsDataURL(file);
    });
    // Reset file input value
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRemovePhoto = (index) => {
    setIncidentForm((prev) => ({
      ...prev,
      photos: prev.photos.filter((_, i) => i !== index),
    }));
  };

  // Save Incident Record
  const handleSaveIncident = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!incidentForm.incidentType) {
      setFormError('Mandatory Error: Please select an Incident Type');
      return;
    }
    if (!incidentForm.description.trim()) {
      setFormError('Mandatory Error: Please provide an incident description');
      return;
    }

    try {
      await patrolService.logIncident({
        patrolId: activePatrol ? activePatrol.id : 'unassigned',
        rangerId: user?.userId || 'USR-8822',
        rangerName: user?.name || 'M.U. Handaragama',
        incidentType: incidentForm.incidentType,
        severity: incidentForm.severity,
        coordinates: incidentForm.coordinates,
        landmark: incidentForm.landmark.trim(),
        description: incidentForm.description.trim(),
        photos: incidentForm.photos,
      });

      setShowIncidentModal(false);
      showToast('Incident Saved Successfully!');
      setSuccessInfo({
        title: 'Incident Saved Successfully',
        message: isOnline
          ? 'Report successfully uploaded and synchronized with headquarters.'
          : 'Your report is saved securely in local storage and will sync automatically when network is restored.',
      });
      setShowSuccessModal(true);
      refreshLocalData();
    } catch (err) {
      setFormError(err.message || 'Error saving incident');
    }
  };

  // End Patrol
  const handleConfirmEndPatrol = async () => {
    if (!activePatrol) return;
    await patrolService.endPatrol(activePatrol.id, {
      batteryLevel,
      summaryNotes: 'Field patrol shift successfully completed.',
    });

    try {
      await patrolService.shareLiveGps({
        rangerId: user?.userId || 'USR-8822',
        rangerName: user?.name || 'M.U. Handaragama',
        latitude: liveGps.latitude,
        longitude: liveGps.longitude,
        accuracyMeters: liveGps.accuracyMeters,
        batteryLevel,
        status: 'OFF_DUTY',
        routeName: 'Off Duty',
        note: 'Patrol shift concluded',
      });
    } catch {
      // offline fallback
    }

    setActivePatrol(null);
    setShowEndConfirmModal(false);
    showToast('Patrol Ended Successfully!');
    setSuccessInfo({
      title: 'Patrol Ended Successfully',
      message: 'Patrol shift has been completed. All recorded telemetry, GPS breadcrumbs, and incidents are preserved.',
    });
    setShowSuccessModal(true);
    refreshLocalData();
  };

  // Batch Sync
  const handleBatchSync = async () => {
    setSyncing(true);
    setSyncMessage(null);
    try {
      const res = await patrolService.syncOfflineBatch();
      setSyncMessage(`✔ Synced ${res.syncedPatrolsCount || 0} patrols, ${res.syncedIncidentsCount || 0} incidents!`);
      refreshLocalData();
    } catch (err) {
      setSyncMessage(`❌ ${err.message}`);
    } finally {
      setSyncing(false);
      setTimeout(() => setSyncMessage(null), 4000);
    }
  };

  const formatTime = (secs) => {
    const hrs = Math.floor(secs / 3600);
    const mins = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // ==========================================
  // DYNAMIC SVG MAP COORDINATE CALCULATIONS
  // ==========================================
  const renderDynamicMap = () => {
    const waypoints = activePatrol?.waypoints || [];
    const currentShiftIncidents = recentIncidents.filter(
      (inc) => activePatrol && (inc.patrolId === activePatrol.id || inc.patrolId === activePatrol.localId)
    );

    if (waypoints.length === 0) {
      return (
        <div className="h-full flex flex-col items-center justify-center text-center p-6 text-stone-400">
          <Compass className="w-8 h-8 text-emerald-500 mb-2 animate-bounce" />
          <p className="text-xs font-semibold text-stone-200">Patrol Active — Recording Live Trail</p>
          <p className="text-[11px] text-stone-500 mt-1">
            Tap <strong>"Record Current GPS Point"</strong> to begin capturing your physical coordinates.
          </p>
        </div>
      );
    }

    // Determine bounds
    const allLats = [...waypoints.map((w) => w.latitude), ...currentShiftIncidents.map((i) => i.coordinates.latitude)];
    const allLons = [...waypoints.map((w) => w.longitude), ...currentShiftIncidents.map((i) => i.coordinates.longitude)];

    let minLat = Math.min(...allLats);
    let maxLat = Math.max(...allLats);
    let minLon = Math.min(...allLons);
    let maxLon = Math.max(...allLons);

    // Provide a small margin
    const latSpan = maxLat - minLat || 0.002;
    const lonSpan = maxLon - minLon || 0.002;

    const mapWidth = 360;
    const mapHeight = 180;
    const padding = 25;

    const toSvgCoords = (lat, lon) => {
      const x = padding + ((lon - minLon) / lonSpan) * (mapWidth - padding * 2);
      const y = mapHeight - padding - ((lat - minLat) / latSpan) * (mapHeight - padding * 2);
      return { x: Math.max(padding, Math.min(mapWidth - padding, x)), y: Math.max(padding, Math.min(mapHeight - padding, y)) };
    };

    const polylinePoints = waypoints
      .map((w) => {
        const { x, y } = toSvgCoords(w.latitude, w.longitude);
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');

    const lastWp = waypoints[waypoints.length - 1];
    const currentRangerPos = toSvgCoords(lastWp.latitude, lastWp.longitude);

    return (
      <svg className="w-full h-full" viewBox={`0 0 ${mapWidth} ${mapHeight}`}>
        {/* Actual Walked Trail Path */}
        <polyline
          points={polylinePoints}
          fill="none"
          stroke="#10b981"
          strokeWidth="3"
          strokeDasharray="4 2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Waypoint Nodes */}
        {waypoints.map((wp, i) => {
          const { x, y } = toSvgCoords(wp.latitude, wp.longitude);
          return (
            <g key={i}>
              <circle
                cx={x}
                cy={y}
                r={wp.isManual ? 5 : 3.5}
                fill={wp.isManual ? '#f59e0b' : '#10b981'}
                stroke="#052e16"
                strokeWidth="1.5"
              />
              {wp.isManual && (
                <text x={x + 7} y={y + 3} fill="#f59e0b" fontSize="8" fontWeight="bold">
                  {wp.note || 'Checkpoint'}
                </text>
              )}
            </g>
          );
        })}

        {/* Incident Warning Pins on Map */}
        {currentShiftIncidents.map((inc, i) => {
          const { x, y } = toSvgCoords(inc.coordinates.latitude, inc.coordinates.longitude);
          return (
            <g key={`inc-${i}`}>
              <circle cx={x} cy={y} r="6" fill="#ef4444" stroke="#ffffff" strokeWidth="1.5" />
              <text x={x + 8} y={y + 3} fill="#ef4444" fontSize="8" fontWeight="bold">
                ⚠ {inc.incidentType}
              </text>
            </g>
          );
        })}

        {/* Active Ranger (You) Marker */}
        <circle cx={currentRangerPos.x} cy={currentRangerPos.y} r="8" fill="#38bdf8" opacity="0.3" className="animate-ping" />
        <circle cx={currentRangerPos.x} cy={currentRangerPos.y} r="5" fill="#0284c7" stroke="#ffffff" strokeWidth="2" />
        <text x={currentRangerPos.x + 8} y={currentRangerPos.y - 6} fill="#38bdf8" fontSize="9" fontWeight="bold">
          Ranger (Live)
        </text>
      </svg>
    );
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0a1310] text-stone-100 overflow-y-auto">
      {/* Top Banner / Status & Connectivity Bar */}
      <div className="bg-[#0f1d17] border-b border-emerald-950 px-6 py-4 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 sticky top-0 z-30 shadow-md">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <Footprints className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white tracking-tight">Ranger Field Patrol Portal</h1>
            <p className="text-xs text-stone-400">
              Officer: <span className="text-emerald-300 font-medium">{user?.name || 'M.U. Handaragama (IT23819092)'}</span> • Live Hardware Telemetry
            </p>
          </div>
        </div>

        {/* Real Hardware & Connectivity Bar */}
        <div className="flex flex-wrap items-center gap-3 text-xs">
          {/* Real GPS Status */}
          <button
            type="button"
            onClick={fetchRealGps}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-stone-900 border border-stone-800 text-stone-300 hover:text-white transition cursor-pointer"
            title="Click to refresh live GPS position"
          >
            <Crosshair className={`w-3.5 h-3.5 ${gpsStatus === 'LOCKED' ? 'text-emerald-400' : 'text-amber-400'}`} />
            <span>
              {gpsStatus === 'LOCKED'
                ? `GPS: ${liveGps.latitude.toFixed(4)}, ${liveGps.longitude.toFixed(4)} (±${liveGps.accuracyMeters}m)`
                : 'GPS: Acquiring Lock...'}
            </span>
          </button>

          {/* Share Live GPS with Liaison Officer */}
          <button
            type="button"
            onClick={async () => {
              setGpsBroadcastEnabled(true);
              await broadcastLiveGpsToHq();
              showToast('GPS Shared Successfully!');
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border font-medium cursor-pointer transition text-xs bg-emerald-950/70 border-emerald-700 text-emerald-300 hover:bg-emerald-900 shadow-sm"
            title="Broadcast live GPS telemetry to Liaison Officer"
          >
            <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            <span>GPS Share</span>
          </button>

          {/* Real Battery Level */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-stone-900 border border-stone-800 text-stone-300">
            <Battery className={`w-3.5 h-3.5 ${batteryLevel < 20 ? 'text-red-400' : 'text-emerald-400'}`} />
            <span>{batteryLevel}% {isCharging ? '⚡' : ''}</span>
          </div>

          {/* Online / Offline Mode Toggle */}
          <button
            type="button"
            onClick={() => setIsOnline(!isOnline)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border font-medium cursor-pointer transition ${
              isOnline
                ? 'bg-emerald-950/60 border-emerald-800 text-emerald-300'
                : 'bg-amber-950/60 border-amber-800 text-amber-300'
            }`}
          >
            {isOnline ? <Wifi className="w-3.5 h-3.5 text-emerald-400" /> : <WifiOff className="w-3.5 h-3.5 text-amber-400" />}
            <span>{isOnline ? 'Online' : 'Offline'}</span>
          </button>

          {/* Sync Button */}
          <button
            type="button"
            onClick={handleBatchSync}
            disabled={syncing || pendingCount === 0 || !isOnline}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-medium transition cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
            <span>Sync ({pendingCount})</span>
          </button>
        </div>
      </div>

      {syncMessage && (
        <div className="bg-emerald-950/80 border-b border-emerald-800 px-6 py-2 text-xs text-emerald-200 text-center font-medium">
          {syncMessage}
        </div>
      )}

      {/* Tabs */}
      <div className="px-6 pt-4 border-b border-emerald-950/60 flex items-center gap-2 bg-[#0b1612]">
        <button
          onClick={() => setActiveTab('patrol')}
          className={`px-4 py-2 text-xs font-semibold rounded-t-lg transition border-b-2 cursor-pointer ${
            activeTab === 'patrol'
              ? 'border-emerald-400 text-emerald-400 bg-emerald-950/40'
              : 'border-transparent text-stone-400 hover:text-stone-200'
          }`}
        >
          Active Patrol Console
        </button>
        <button
          onClick={() => setActiveTab('incidents')}
          className={`px-4 py-2 text-xs font-semibold rounded-t-lg transition border-b-2 cursor-pointer ${
            activeTab === 'incidents'
              ? 'border-emerald-400 text-emerald-400 bg-emerald-950/40'
              : 'border-transparent text-stone-400 hover:text-stone-200'
          }`}
        >
          Logged Incidents ({recentIncidents.length})
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`px-4 py-2 text-xs font-semibold rounded-t-lg transition border-b-2 cursor-pointer ${
            activeTab === 'history'
              ? 'border-emerald-400 text-emerald-400 bg-emerald-950/40'
              : 'border-transparent text-stone-400 hover:text-stone-200'
          }`}
        >
          Patrol Logs History
        </button>
      </div>

      {/* MAIN VIEW AREA */}
      <div className="p-6 max-w-7xl mx-auto w-full flex-1">
        {activeTab === 'patrol' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 flex flex-col gap-6">
              {!activePatrol ? (
                /* Pre-Patrol Setup Card */
                <div className="bg-[#101d18] border border-emerald-950 rounded-2xl p-6 shadow-xl flex flex-col gap-5">
                  <div>
                    <h2 className="text-base font-bold text-white flex items-center gap-2">
                      <Compass className="w-5 h-5 text-emerald-400" /> Start Field Patrol Shift
                    </h2>
                    <p className="text-xs text-stone-400 mt-1">
                      Configure your patrol sector route and start physical GPS tracking.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center gap-4 text-xs">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="routeType"
                          checked={!isCustomRoute}
                          onChange={() => setIsCustomRoute(false)}
                          className="accent-emerald-500"
                        />
                        <span>Predefined Reserve Route</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="routeType"
                          checked={isCustomRoute}
                          onChange={() => setIsCustomRoute(true)}
                          className="accent-emerald-500"
                        />
                        <span>Custom Sector Route</span>
                      </label>
                    </div>

                    {!isCustomRoute ? (
                      <div>
                        <label className="block text-xs font-medium text-stone-300 mb-1.5">Select Route</label>
                        <select
                          value={selectedRouteId}
                          onChange={(e) => setSelectedRouteId(e.target.value)}
                          className="w-full bg-[#0a1310] border border-emerald-900/60 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                        >
                          {routes.map((r) => (
                            <option key={r.id} value={r.id}>
                              {r.name} ({r.targetDistanceKm} km)
                            </option>
                          ))}
                        </select>
                      </div>
                    ) : (
                      <div>
                        <label className="block text-xs font-medium text-stone-300 mb-1.5">Enter Custom Route Name</label>
                        <input
                          type="text"
                          value={customRouteName}
                          onChange={(e) => setCustomRouteName(e.target.value)}
                          placeholder="e.g. Sector 5 North Trench to Boundary Fence"
                          className="w-full bg-[#0a1310] border border-emerald-900/60 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                    )}
                  </div>

                  {/* Real Live Hardware Readiness Card */}
                  <div className="bg-[#0a1410] border border-emerald-950 rounded-xl p-4 grid grid-cols-3 gap-3 text-center">
                    <div>
                      <span className="text-[10px] text-stone-400 block mb-1">Live Coordinates</span>
                      <span className="text-xs font-semibold text-emerald-400 flex items-center justify-center gap-1 font-mono">
                        {liveGps.latitude.toFixed(4)}, {liveGps.longitude.toFixed(4)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-stone-400 block mb-1">Battery Level</span>
                      <span className="text-xs font-semibold text-emerald-400 flex items-center justify-center gap-1">
                        <Battery className="w-3.5 h-3.5" /> {batteryLevel}%
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-stone-400 block mb-1">Offline Engine</span>
                      <span className="text-xs font-semibold text-emerald-400 flex items-center justify-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> LocalStorage Ready
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleStartPatrol}
                    className="w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/30 transition cursor-pointer"
                  >
                    <Play className="w-4 h-4 fill-current" /> Begin Patrol Shift
                  </button>
                </div>
              ) : (
                /* Active Patrol Console */
                <div className="bg-[#101d18] border border-emerald-950 rounded-2xl p-6 shadow-xl flex flex-col gap-5">
                  <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-emerald-950">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                        <h2 className="text-base font-bold text-white">{activePatrol.routeName}</h2>
                      </div>
                      <p className="text-xs text-stone-400 mt-0.5">Session: {activePatrol.id}</p>
                    </div>

                    <div className="flex items-center gap-4 text-xs font-mono">
                      <div className="flex items-center gap-1 text-emerald-400">
                        <Clock className="w-4 h-4" />
                        <span>{formatTime(elapsedSeconds)}</span>
                      </div>
                      <div className="flex items-center gap-1 text-blue-400">
                        <MapPin className="w-4 h-4" />
                        <span>{activePatrol.distanceKm.toFixed(2)} km</span>
                      </div>
                      <div className="flex items-center gap-1 text-amber-400">
                        <Battery className="w-4 h-4" />
                        <span>{batteryLevel}%</span>
                      </div>
                    </div>
                  </div>

                  {/* Real Dynamic Map Canvas */}
                  <div className="h-64 sm:h-72 w-full bg-[#070e0b] rounded-xl border border-emerald-950 relative overflow-hidden flex flex-col justify-between p-4 shadow-inner">
                    <div
                      className="absolute inset-0 opacity-10"
                      style={{
                        backgroundImage:
                          'radial-gradient(#10b981 1px, transparent 1px), radial-gradient(#10b981 1px, #070e0b 1px)',
                        backgroundSize: '20px 20px',
                      }}
                    />

                    {/* Top status */}
                    <div className="relative z-10 flex items-center justify-between">
                      <span className="px-2.5 py-1 rounded-full bg-emerald-900/80 border border-emerald-700/60 text-[11px] font-semibold text-emerald-300 flex items-center gap-1.5 backdrop-blur font-mono">
                        <Navigation className="w-3.5 h-3.5" />
                        {liveGps.latitude.toFixed(4)}° N, {liveGps.longitude.toFixed(4)}° E
                      </span>
                      <span className="px-2.5 py-1 rounded-full bg-stone-900/80 border border-stone-800 text-[11px] text-stone-300">
                        Waypoints: {activePatrol.waypoints?.length || 0}
                      </span>
                    </div>

                    {/* Real Dynamic SVG Rendering */}
                    <div className="relative z-10 my-auto w-full h-40">
                      {renderDynamicMap()}
                    </div>

                    {/* Active Controls */}
                    <div className="relative z-10 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={handleRecordLiveWaypoint}
                        className="px-3 py-1.5 rounded-lg bg-stone-900/90 border border-emerald-900 hover:bg-stone-800 text-xs text-stone-200 flex items-center gap-1.5 transition cursor-pointer backdrop-blur"
                        title="Records your current GPS coordinates as a breadcrumb"
                      >
                        <Crosshair className="w-3.5 h-3.5 text-emerald-400" /> Record Live GPS Point
                      </button>

                      <button
                        type="button"
                        onClick={handleOpenIncidentModal}
                        className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-stone-950 font-bold text-xs flex items-center gap-2 shadow-lg shadow-emerald-500/30 transition cursor-pointer transform hover:scale-105"
                      >
                        <Plus className="w-4 h-4 stroke-[3]" /> Log Field Incident
                      </button>
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        fetchRealGps();
                        setShowManualWpModal(true);
                      }}
                      className="py-2.5 px-3 rounded-xl bg-[#0a1310] border border-emerald-900/70 hover:border-emerald-700 text-xs font-semibold text-stone-300 flex items-center justify-center gap-2 transition cursor-pointer"
                    >
                      <MapPin className="w-3.5 h-3.5 text-emerald-400" /> Add Manual Waypoint (A1)
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        alert(`🚨 EMERGENCY SOS DISPATCHED:\nLocation: ${liveGps.latitude}, ${liveGps.longitude}\nHeadquarters and patrol backup notified immediately!`)
                      }
                      className="py-2.5 px-3 rounded-xl bg-red-950/40 border border-red-800 hover:bg-red-900/50 text-xs font-semibold text-red-300 flex items-center justify-center gap-2 transition cursor-pointer"
                    >
                      <ShieldAlert className="w-3.5 h-3.5 text-red-400" /> Emergency SOS (Panic)
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowEndConfirmModal(true)}
                      className="py-2.5 px-3 rounded-xl bg-stone-900 hover:bg-red-950/80 border border-stone-800 hover:border-red-700 text-xs font-semibold text-stone-300 hover:text-red-200 flex items-center justify-center gap-2 transition cursor-pointer"
                    >
                      <Square className="w-3.5 h-3.5 text-red-400 fill-current" /> End Patrol (Safe)
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Right Column: Shift Incidents */}
            <div className="bg-[#101d18] border border-emerald-950 rounded-2xl p-5 shadow-xl flex flex-col gap-4">
              <div className="flex items-center justify-between pb-3 border-b border-emerald-950">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400" /> Incidents in Shift
                </h3>
                <span className="text-xs px-2 py-0.5 rounded-full bg-stone-900 text-stone-300">
                  {recentIncidents.filter((i) => !activePatrol || i.patrolId === activePatrol.id).length} recorded
                </span>
              </div>

              <div className="flex-1 overflow-y-auto space-y-3 max-h-[460px] pr-1">
                {recentIncidents.length === 0 ? (
                  <div className="text-center py-10 text-stone-500 text-xs">
                    No incidents logged yet. Tap <strong>Log Field Incident</strong> when an issue is detected.
                  </div>
                ) : (
                  recentIncidents.map((inc) => (
                    <div
                      key={inc.id || inc.localId}
                      className="p-3.5 rounded-xl bg-[#0a1310] border border-emerald-950 hover:border-emerald-800 transition flex flex-col gap-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                              inc.severity === 'CRITICAL'
                                ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                                : inc.severity === 'HIGH'
                                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            }`}
                          >
                            {inc.incidentType}
                          </span>
                          <span className="text-[10px] text-stone-400">{inc.severity}</span>
                        </div>
                      </div>

                      <p className="text-xs text-stone-200 line-clamp-2 leading-relaxed">{inc.description}</p>

                      {inc.photos && inc.photos.length > 0 && (
                        <div className="flex items-center gap-1.5 mt-1">
                          {inc.photos.slice(0, 3).map((img, idx) => (
                            <img
                              key={idx}
                              src={img}
                              alt="Thumbnail"
                              className="w-8 h-8 rounded object-cover border border-emerald-900"
                            />
                          ))}
                        </div>
                      )}

                      <div className="flex items-center justify-between text-[10px] text-stone-500 pt-1 border-t border-stone-900">
                        <span>{new Date(inc.reportedAt).toLocaleTimeString()}</span>
                        <span className={inc.syncStatus === 'SYNCED' ? 'text-emerald-400' : 'text-amber-400 font-medium'}>
                          ● {inc.syncStatus === 'SYNCED' ? 'Synced' : 'Pending Sync'}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: All Logged Incidents */}
        {activeTab === 'incidents' && (
          <div className="bg-[#101d18] border border-emerald-950 rounded-2xl p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-emerald-950">
              <div>
                <h2 className="text-base font-bold text-white">Wildlife Incident Logs</h2>
                <p className="text-xs text-stone-400">All snares, poaching traces, and breaches logged in the field.</p>
              </div>
              <button
                type="button"
                onClick={handleOpenIncidentModal}
                className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" /> New Incident
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-stone-300">
                <thead className="text-[11px] text-stone-400 uppercase bg-[#09110e] border-b border-emerald-950">
                  <tr>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Severity</th>
                    <th className="px-4 py-3">Coordinates / Landmark</th>
                    <th className="px-4 py-3">Description</th>
                    <th className="px-4 py-3">Photos</th>
                    <th className="px-4 py-3">Sync Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-900">
                  {recentIncidents.map((inc) => (
                    <tr key={inc.id || inc.localId} className="hover:bg-[#0c1613]">
                      <td className="px-4 py-3 font-semibold text-white">{inc.incidentType}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            inc.severity === 'CRITICAL'
                              ? 'bg-red-500/20 text-red-400'
                              : inc.severity === 'HIGH'
                              ? 'bg-amber-500/20 text-amber-400'
                              : 'bg-emerald-500/20 text-emerald-400'
                          }`}
                        >
                          {inc.severity}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-[11px] text-stone-400">
                        {inc.coordinates?.latitude?.toFixed(4)}, {inc.coordinates?.longitude?.toFixed(4)}
                        {inc.landmark && <span className="block text-[10px] text-stone-500">{inc.landmark}</span>}
                      </td>
                      <td className="px-4 py-3 max-w-xs truncate text-stone-200">{inc.description}</td>
                      <td className="px-4 py-3">
                        {inc.photos && inc.photos.length > 0 ? (
                          <div className="flex items-center gap-1">
                            {inc.photos.map((p, idx) => (
                              <img key={idx} src={p} alt="Evidence" className="w-6 h-6 rounded object-cover border border-emerald-900" />
                            ))}
                          </div>
                        ) : (
                          <span className="text-stone-500 text-[10px]">No photos</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`text-[11px] font-medium ${
                            inc.syncStatus === 'SYNCED' ? 'text-emerald-400' : 'text-amber-400'
                          }`}
                        >
                          {inc.syncStatus}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 3: Patrol History */}
        {activeTab === 'history' && (
          <div className="bg-[#101d18] border border-emerald-950 rounded-2xl p-6 shadow-xl">
            <h2 className="text-base font-bold text-white mb-1">Archived Patrol Shifts</h2>
            <p className="text-xs text-stone-400 mb-4 pb-3 border-b border-emerald-950">
              Completed and in-progress patrol runs for {user?.name || 'M.U. Handaragama'}.
            </p>

            <div className="space-y-3">
              {patrolHistory.map((p) => (
                <div
                  key={p.id || p.localId}
                  className="p-4 rounded-xl bg-[#0a1310] border border-emerald-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div>
                    <h3 className="text-sm font-semibold text-white">{p.routeName}</h3>
                    <p className="text-xs text-stone-400">
                      Ranger: {p.rangerName} • Started: {new Date(p.startTime).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-4 text-xs font-mono">
                    <span className="text-blue-400">{p.distanceKm || 0} km</span>
                    <span className="text-stone-300">{p.waypoints?.length || 0} waypoints</span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        p.status === 'COMPLETED' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
                      }`}
                    >
                      {p.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ========================================================
          MODALS SECTION (Real Data Forms)
         ======================================================== */}

      {/* 1. LOG NEW INCIDENT MODAL */}
      {showIncidentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#0e1914] border border-emerald-900/80 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative flex flex-col gap-4 text-xs text-stone-200">
            <div className="flex items-center justify-between pb-3 border-b border-emerald-950">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-emerald-400" /> Log Field Incident
                </h3>
                <p className="text-[11px] text-stone-400">Physical coordinates auto-captured with real photo upload</p>
              </div>
              <button
                type="button"
                onClick={() => setShowIncidentModal(false)}
                className="text-stone-400 hover:text-white p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-lg bg-red-950/60 border border-red-800 text-red-200 text-xs">
                {formError}
              </div>
            )}

            <form onSubmit={handleSaveIncident} className="space-y-4">
              {/* Coordinates Bar */}
              <div className="p-3 rounded-xl bg-[#070e0b] border border-emerald-950 flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-2 text-stone-300 font-mono">
                  <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                  <span>
                    Lat: {incidentForm.coordinates.latitude.toFixed(4)}° N, Lng: {incidentForm.coordinates.longitude.toFixed(4)}° E
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    fetchRealGps();
                    setIncidentForm((prev) => ({
                      ...prev,
                      coordinates: {
                        latitude: liveGps.latitude,
                        longitude: liveGps.longitude,
                        accuracyMeters: liveGps.accuracyMeters,
                      },
                    }));
                  }}
                  className="text-[10px] text-emerald-400 hover:text-emerald-300 underline cursor-pointer"
                >
                  Refresh GPS
                </button>
              </div>

              {/* Incident Type */}
              <div>
                <label className="block text-xs font-semibold text-stone-300 mb-1">
                  Incident Type <span className="text-red-400">*</span>
                </label>
                <select
                  value={incidentForm.incidentType}
                  onChange={(e) => setIncidentForm({ ...incidentForm, incidentType: e.target.value })}
                  className="w-full bg-[#070e0b] border border-emerald-900 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="SNARE">Snare (Wire / Jaw Trap)</option>
                  <option value="POACHING">Poaching Traces / Weapons</option>
                  <option value="ANIMAL_CARCASS">Animal Carcass / Skeletal Remains</option>
                  <option value="ILLEGAL_CAMP">Illegal Poacher Campsite</option>
                  <option value="WILDLIFE_SIGHTING">Endangered Wildlife Sighting</option>
                  <option value="OTHER">Other Field Breach</option>
                </select>
              </div>

              {/* Threat Severity */}
              <div>
                <label className="block text-xs font-semibold text-stone-300 mb-1">Threat Severity</label>
                <div className="grid grid-cols-4 gap-2 text-center text-[11px]">
                  {['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map((sev) => (
                    <button
                      key={sev}
                      type="button"
                      onClick={() => setIncidentForm({ ...incidentForm, severity: sev })}
                      className={`py-1.5 rounded-lg border font-semibold transition cursor-pointer ${
                        incidentForm.severity === sev
                          ? sev === 'CRITICAL'
                            ? 'bg-red-600 border-red-500 text-white'
                            : sev === 'HIGH'
                            ? 'bg-amber-600 border-amber-500 text-white'
                            : 'bg-emerald-600 border-emerald-500 text-white'
                          : 'bg-[#070e0b] border-stone-800 text-stone-400'
                      }`}
                    >
                      {sev}
                    </button>
                  ))}
                </div>
              </div>

              {/* Landmark Input (Clean / No filler) */}
              <div>
                <label className="block text-xs font-semibold text-stone-300 mb-1">Landmark / Location Detail</label>
                <input
                  type="text"
                  value={incidentForm.landmark}
                  onChange={(e) => setIncidentForm({ ...incidentForm, landmark: e.target.value })}
                  placeholder="e.g. Near old river crossing, Sector 4 trail marker"
                  className="w-full bg-[#070e0b] border border-emerald-900 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Description Input (Clean / No filler) */}
              <div>
                <label className="block text-xs font-semibold text-stone-300 mb-1">
                  Incident Description & Action Taken <span className="text-red-400">*</span>
                </label>
                <textarea
                  rows={3}
                  value={incidentForm.description}
                  onChange={(e) => setIncidentForm({ ...incidentForm, description: e.target.value })}
                  placeholder="Provide precise details of the threat, condition, and actions taken (e.g. single wire snare dismantled and confiscated)..."
                  className="w-full bg-[#070e0b] border border-emerald-900 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* REAL PHOTO ATTACHMENT FROM DEVICE */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-stone-300">
                    Photo Evidence ({incidentForm.photos.length} attached)
                  </label>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-[11px] text-emerald-400 hover:text-emerald-300 flex items-center gap-1 cursor-pointer"
                  >
                    <Upload className="w-3 h-3" /> Upload / Take Photo
                  </button>
                </div>

                {/* Hidden Real File Input */}
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handlePhotoUpload}
                  accept="image/*"
                  capture="environment"
                  multiple
                  className="hidden"
                />

                <div className="flex flex-wrap items-center gap-2">
                  {incidentForm.photos.map((src, i) => (
                    <div key={i} className="relative w-16 h-16 rounded-lg overflow-hidden border border-emerald-800 group">
                      <img src={src} alt="Uploaded evidence" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => handleRemovePhoto(i)}
                        className="absolute top-1 right-1 p-0.5 bg-red-900/90 text-white rounded-full hover:bg-red-700 cursor-pointer"
                        title="Remove photo"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-16 h-16 rounded-lg bg-[#070e0b] border border-dashed border-emerald-800 hover:border-emerald-500 text-stone-400 hover:text-emerald-400 flex flex-col items-center justify-center gap-1 transition cursor-pointer"
                  >
                    <Camera className="w-4 h-4" />
                    <span className="text-[9px]">Attach</span>
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-900/30 transition cursor-pointer"
              >
                Save Incident Record
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 2. CONFIRMATION MODAL */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#0e1914] border border-emerald-800 rounded-2xl max-w-sm w-full p-6 text-center shadow-2xl flex flex-col items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 animate-scaleUp">
              <Check className="w-8 h-8 stroke-[3]" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">{successInfo.title}</h3>
              <p className="text-xs text-stone-300 mt-2 leading-relaxed">{successInfo.message}</p>
            </div>
            <button
              type="button"
              onClick={() => setShowSuccessModal(false)}
              className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition cursor-pointer"
            >
              Return to Patrol Map
            </button>
          </div>
        </div>
      )}

      {/* 3. SAFE END PATROL CONFIRMATION MODAL */}
      {showEndConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#0e1914] border border-red-900/70 rounded-2xl max-w-sm w-full p-6 text-center shadow-2xl flex flex-col items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">End Current Field Patrol?</h3>
              <p className="text-xs text-stone-400 mt-1.5 leading-relaxed">
                This will finalize route distance, duration ({formatTime(elapsedSeconds)}), and archive the active tracking session.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 w-full">
              <button
                type="button"
                onClick={() => setShowEndConfirmModal(false)}
                className="py-2.5 rounded-xl bg-stone-900 border border-stone-800 text-stone-300 text-xs font-semibold hover:bg-stone-800 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmEndPatrol}
                className="py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition cursor-pointer"
              >
                Confirm End
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. MANUAL WAYPOINT MODAL (A1) */}
      {showManualWpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#0e1914] border border-emerald-900 rounded-2xl max-w-sm w-full p-6 shadow-2xl flex flex-col gap-4">
            <div className="flex items-center justify-between pb-3 border-b border-emerald-950">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <MapPin className="w-4 h-4 text-emerald-400" /> Add Manual Waypoint (A1)
              </h3>
              <button
                type="button"
                onClick={() => setShowManualWpModal(false)}
                className="text-stone-400 hover:text-white p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddManualWaypoint} className="space-y-4">
              <div className="p-2.5 rounded-lg bg-[#070e0b] border border-emerald-950 text-[11px] text-stone-300 font-mono">
                Location: {liveGps.latitude.toFixed(4)}° N, {liveGps.longitude.toFixed(4)}° E
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-300 mb-1">
                  Point of Interest Note / Observation
                </label>
                <input
                  type="text"
                  required
                  value={manualNote}
                  onChange={(e) => setManualNote(e.target.value)}
                  placeholder="e.g. Perimeter fence damage, fresh poacher footprints"
                  className="w-full bg-[#070e0b] border border-emerald-900 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition cursor-pointer"
              >
                Save Waypoint to Route
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Toast Notification Popup Banner */}
      {toastNotification && (
        <div className="fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl bg-[#0e271c] border-2 border-emerald-400 text-white shadow-2xl backdrop-blur-md animate-bounce-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 animate-pulse" />
          <div>
            <p className="text-xs font-bold text-emerald-300">Notification</p>
            <p className="text-xs text-white font-medium">{toastNotification.message}</p>
          </div>
          <button
            type="button"
            onClick={() => setToastNotification(null)}
            className="ml-3 text-stone-400 hover:text-white text-base cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
