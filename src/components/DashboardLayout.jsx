import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Shield, Map, AlertTriangle, Users, BarChart3, LogOut, FileText, MapPin } from 'lucide-react';
import dashboardLogo from '../assets/dashboard_logo.png';

export default function DashboardLayout() {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  // Define navigation based on role
  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: Shield, roles: ['LIAISON_OFFICER', 'PARK_MANAGER', 'SENSOR_DISPATCHER'] },
    { name: 'Field Patrol', path: '/patrol', icon: Map, roles: ['RANGER', 'PARK_MANAGER', 'LIAISON_OFFICER'] },
    { name: 'Sensor Alerts', path: '/alerts', icon: AlertTriangle, roles: ['RANGER', 'SENSOR_DISPATCHER'] },
    { name: 'Community Reports', path: '/conflicts', icon: Users, roles: ['LIAISON_OFFICER'] },
    { name: 'Analytics', path: '/analytics', icon: BarChart3, roles: ['PARK_MANAGER'] },
    { name: 'Patrol Coverage', path: '/patrol-coverage', icon: MapPin, roles: ['PARK_MANAGER'] },
    { name: 'Community Queue', path: '/community-queue', icon: Users, roles: ['PARK_MANAGER'] },
    { name: 'Audit Trail', path: '/audit-trail', icon: FileText, roles: ['PARK_MANAGER'] },
  ];

  // Filter items for the logged-in user
  const userNav = navItems.filter(item => item.roles.includes(user?.role));

  return (
    <div className="h-screen flex overflow-hidden bg-stone-50 font-sans">
      {/* Desktop Sidebar (Hidden on mobile) */}
      <div className="hidden md:flex md:flex-shrink-0">
        <div className="flex flex-col w-64 border-r border-stone-200 bg-white">
          <div className="h-24 flex items-center justify-center px-2 border-b border-emerald-900/60 bg-emerald-800">
            <img
              src={dashboardLogo}
              alt="WildGuard Ops"
              className="h-[74px] w-auto max-w-[246px] object-contain select-none"
            />
          </div>
          <div className="flex-1 flex flex-col overflow-y-auto pt-5 pb-4">
            <div className="px-6 mb-6">
              <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider">Logged in as</p>
              <p className="text-sm font-medium text-stone-900 truncate">{user?.name}</p>
              <p className="text-xs text-stone-500">{user?.role?.replace('_', ' ')}</p>
            </div>
            <nav className="flex-1 px-4 space-y-1">
              {userNav.map((item) => (
                <button key={item.name} onClick={() => navigate(item.path)} className={`w-full flex items-center px-2 py-2.5 text-sm font-medium rounded-lg transition-colors cursor-pointer ${location.pathname === item.path ? 'bg-emerald-50 text-emerald-700 font-semibold' : 'text-stone-600 hover:bg-stone-50 hover:text-stone-900'}`}>
                  <item.icon className={`mr-3 h-5 w-5 ${location.pathname === item.path ? 'text-emerald-700' : 'text-stone-400'}`} />
                  {item.name}
                </button>
              ))}
            </nav>
          </div>
          <div className="p-4 border-t border-stone-200">
            <button onClick={handleLogout} className="flex items-center w-full px-2 py-2 text-sm font-medium text-red-600 rounded-lg hover:bg-red-50 cursor-pointer">
              <LogOut className="mr-3 h-5 w-5" /> Logout
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex flex-col w-0 flex-1 overflow-hidden">
        {/* Mobile Topbar */}
        <div className="md:hidden flex items-center justify-between h-20 bg-emerald-800 px-4">
          <div className="flex items-center">
            <img
              src={dashboardLogo}
              alt="WildGuard Ops"
              className="h-14 w-auto max-w-[220px] object-contain select-none"
            />
          </div>
          <button onClick={handleLogout} className="text-white cursor-pointer"><LogOut className="h-5 w-5"/></button>
        </div>

        {/* Dynamic Page Content */}
        <main className="flex-1 relative z-0 overflow-y-auto focus:outline-none p-4 md:p-8">
          <Outlet />
        </main>

        {/* Mobile Bottom Navigation (Visible only on mobile) */}
        <div className="md:hidden border-t border-stone-200 bg-white flex justify-around pb-safe">
          {userNav.map((item) => (
            <button key={item.name} onClick={() => navigate(item.path)} className={`flex flex-col items-center py-3 px-2 cursor-pointer ${location.pathname === item.path ? 'text-emerald-700' : 'text-stone-500'}`}>
              <item.icon className="h-6 w-6" />
              <span className="text-[10px] mt-1 font-medium">{item.name}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
