import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Phone, Lock } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button, Input } from '../../components/common/UI';
import useAuthStore from '../../store/authStore';

export default function Login() {
  const [phone,    setPhone]    = useState('');
  const [password, setPassword] = useState('');
  const [loading,  setLoading]  = useState(false);
  const { login } = useAuthStore();
  const navigate  = useNavigate();

  const handle = async (e) => {
    e.preventDefault();
    if (!phone || !password) return toast.error('Fill in all fields');
    setLoading(true);
    try {
      const res = await login(phone, password);
      toast.success(`Welcome back, ${res.user.fullName.split(' ')[0]}! 👋`);
      navigate(res.user.roles.includes('admin') ? '/admin' : res.user.activeRole === 'carrier' ? '/carrier' : '/dashboard');
    } catch (e) { toast.error(e.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-campus-dark flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 flex-col items-center justify-center p-12 relative overflow-hidden">
        <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-brand/20" />
        <div className="absolute -bottom-20 -left-20 w-80 h-80 rounded-full bg-white/5" />
        <div className="relative z-10 text-center">
          <div className="w-20 h-20 bg-brand rounded-3xl flex items-center justify-center text-4xl mx-auto mb-8 shadow-2xl shadow-brand/30">📦</div>
          <h1 className="text-5xl font-black text-white mb-4 leading-tight">Campus<span className="text-brand">Relay</span></h1>
          <p className="text-white/50 text-lg max-w-sm leading-relaxed">The smarter way to get campus deliveries. Post it. Pick it. Earn it.</p>
          <div className="grid grid-cols-3 gap-4 mt-12">
            {[['📦','Zero effort','Deliveries to your room'],['💰','Earn daily','₹30+ per pickup'],['⚡','Lightning fast','FCFS matching']].map(([e,t,s])=>(
              <div key={t} className="bg-white/5 rounded-2xl p-4 text-center border border-white/10">
                <div className="text-2xl mb-2">{e}</div>
                <p className="text-white text-sm font-bold">{t}</p>
                <p className="text-white/40 text-xs mt-1">{s}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-6 lg:bg-[#F7F5F2]">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-3 justify-center mb-10">
            <div className="w-10 h-10 bg-brand rounded-xl flex items-center justify-center text-xl">📦</div>
            <span className="text-2xl font-black text-white lg:text-campus-dark">Campus<span className="text-brand">Relay</span></span>
          </div>

          <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
            <h2 className="text-2xl font-black text-campus-dark mb-1">Welcome back 👋</h2>
            <p className="text-muted text-sm mb-6">Sign in to your account</p>

            <form onSubmit={handle}>
              <Input label="Phone Number" placeholder="10-digit mobile" value={phone}
                onChange={e => setPhone(e.target.value)} icon={Phone} inputMode="numeric" autoComplete="tel" />
              <Input label="Password" placeholder="••••••••" value={password}
                onChange={e => setPassword(e.target.value)} icon={Lock} type="password" autoComplete="current-password" />
              <Button type="submit" loading={loading} className="w-full mt-2">Sign In</Button>
            </form>

            <div className="flex items-center gap-3 my-5">
              <div className="flex-1 h-px bg-gray-100" />
              <span className="text-xs text-muted font-medium">or</span>
              <div className="flex-1 h-px bg-gray-100" />
            </div>

            <p className="text-center text-sm text-muted">
              New to CampusRelay?{' '}
              <Link to="/register" className="text-brand font-bold hover:underline">Create Account</Link>
            </p>

            {import.meta.env.DEV && (
              <div className="mt-5 p-3 bg-gray-50 rounded-xl border border-gray-100">
                <p className="text-xs font-bold text-muted mb-2">🛠 Dev credentials</p>
                {[['Receiver','9111111111','Test@123'],['Carrier','9222222222','Test@123'],['Admin','9000000000','Admin@123']].map(([role,ph,pw])=>(
                  <button key={role} onClick={()=>{setPhone(ph);setPassword(pw);}}
                    className="block w-full text-left text-xs text-muted hover:text-campus-dark font-medium py-0.5">
                    {role}: {ph} / {pw}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
