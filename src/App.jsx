import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, AuthContext } from './context/AuthContext';
import { useContext } from 'react';
import Login from './pages/Login';
import ConflictsDashboard from './pages/ConflictsDashboard';
import AnalyticsDashboard from './pages/AnalyticsDashboard';
import PatrolCoveragePage from './pages/PatrolCoveragePage';
import CommunityQueuePage from './pages/CommunityQueuePage';
import AuditTrailPage from './pages/AuditTrailPage';
import PatrolDashboard from './pages/PatrolDashboard';
import DashboardLayout from './components/DashboardLayout';
import SystemOverview from './components/SystemOverview';
import LiveTelemetryDashboard from './pages/LiveTelemetryDashboard'; // [IT23818620 - K.M.S.G.S.C. Karunanayake] - UC-02A

// Mock empty pages for the other team members to build out
const TempPage = ({ title }) => (
  <div className="p-6 bg-white rounded-2xl shadow-sm border border-stone-200">
    <h1 className="text-xl font-bold text-stone-900">{title}</h1>
    <p className="text-stone-500 text-xs mt-1.5">Module implementation and live data streams area.</p>
  </div>
);

// Protected Route Wrapper
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useContext(AuthContext);
  if (loading) return <div className="p-8 text-stone-500 text-sm">Loading session...</div>;
  if (!user) return <Navigate to="/" replace />;
  return children;
};

function AppRoutes() {
  const { user } = useContext(AuthContext);

  // Auto-redirect logic based on role
  const getIndexRoute = () => {
    if (!user) return '/';
    if (user.role === 'RANGER') return '/patrol';
    if (user.role === 'LIAISON_OFFICER') return '/dashboard';
    if (user.role === 'PARK_MANAGER') return '/analytics';
    return '/dashboard';
  };

  return (
    <Routes>
      <Route path="/" element={user ? <Navigate to={getIndexRoute()} replace /> : <Login />} />

      <Route element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
        {/* Operations Overview & Health Diagnostics (Original flow preserved) */}
        <Route path="/dashboard" element={<SystemOverview />} />

        {/* UC-01: Field Patrols & Incidents (M.U. Handaragama) */}
        <Route path="/patrol" element={<PatrolDashboard />} />

        {/* UC-02A: Monitor Live Animal Telemetry */}
        <Route path="/alerts" element={<LiveTelemetryDashboard />} />

        {/* UC-03 - Your Page */}
        <Route path="/conflicts" element={<ConflictsDashboard />} />

        {/* Conservation Analytics & Park Manager views */}
        <Route path="/analytics" element={<AnalyticsDashboard />} />
        <Route path="/patrol-coverage" element={<PatrolCoveragePage />} />
        <Route path="/community-queue" element={<CommunityQueuePage />} />
        <Route path="/audit-trail" element={<AuditTrailPage />} />
      </Route>

      {/* Fallback route */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <AppRoutes />
      </Router>
    </AuthProvider>
  );
}
