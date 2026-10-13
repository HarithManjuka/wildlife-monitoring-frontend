import { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Shield, Leaf, Activity, Map } from 'lucide-react';
import loginLogo from '../assets/login_logo.png';

const mockAccounts = [
  { name: 'Abeykoon', role: 'Liaison Officer', email: 'harith@gmail.com', pass: 'Harith123', icon: Shield, color: 'bg-emerald-100 text-emerald-700' },
  { name: 'Handaragama', role: 'Ranger', email: 'malith@gmail.com', pass: 'Malith123', icon: Leaf, color: 'bg-green-100 text-green-700' },
  { name: 'Karunanayake', role: 'Dispatcher', email: 'sandeepa@gmail.com', pass: 'Sandeepa123', icon: Activity, color: 'bg-teal-100 text-teal-700' },
  { name: 'Jayakody', role: 'Park Manager', email: 'shaini@gmail.com', pass: 'Shaini123', icon: Map, color: 'bg-stone-100 text-stone-700' },
];

export default function Login() {
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e?.preventDefault();
    const success = await login(email, password);
    if (success) navigate('/dashboard');
    else setError('Invalid credentials or backend not running.');
  };

  const fastLogin = (account) => {
    setEmail(account.email);
    setPassword(account.pass);
    // Auto submit after state updates
    setTimeout(() => {
      const btn = document.getElementById('login-btn');
      if (btn) btn.click();
    }, 100);
  };

  return (
    <div className="min-h-screen bg-stone-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-lg text-center flex flex-col items-center justify-center px-4">
        <img
          src={loginLogo}
          alt="WildGuard Ops - Smart Wildlife Conservation Portal"
          className="mx-auto h-36 sm:h-44 md:h-48 w-auto max-w-full object-contain select-none"
        />
      </div>

      <div className="mt-4 sm:mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-xl sm:rounded-2xl sm:px-10 border border-stone-100">
          {error && <div className="mb-4 text-sm text-red-600 bg-red-50 p-3 rounded-lg border border-red-100">{error}</div>}
          
          <form className="space-y-6" onSubmit={handleLogin}>
            <div>
              <label className="block text-sm font-medium text-stone-700">Email address</label>
              <div className="mt-1">
                <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required className="appearance-none block w-full px-3 py-2 border border-stone-300 rounded-lg shadow-sm placeholder-stone-400 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-700">Password</label>
              <div className="mt-1">
                <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" required className="appearance-none block w-full px-3 py-2 border border-stone-300 rounded-lg shadow-sm placeholder-stone-400 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm" />
              </div>
            </div>

            <button id="login-btn" type="submit" className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-emerald-800 hover:bg-emerald-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition-colors">
              Sign In to Portal
            </button>
          </form>

          <div className="mt-8">
            <div className="relative">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-stone-200" /></div>
              <div className="relative flex justify-center text-sm"><span className="px-2 bg-white text-stone-500">Developer Quick Login</span></div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3">
              {mockAccounts.map((acc) => (
                <button key={acc.name} onClick={() => fastLogin(acc)} className="flex items-center justify-center px-4 py-2 border border-stone-200 shadow-sm text-xs font-medium rounded-lg text-stone-700 bg-white hover:bg-stone-50 transition-colors">
                  <acc.icon className={`h-4 w-4 mr-2 rounded-full p-0.5 ${acc.color}`} />
                  {acc.role}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
