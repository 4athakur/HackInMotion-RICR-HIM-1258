import { useState } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { Navigate } from 'react-router-dom';
import { TrendingUp, Mail, Lock, User, Loader2 } from 'lucide-react';
import clsx from 'clsx';

export default function Login() {
  const { user, loginWithGoogle, loginWithEmail, registerWithEmail } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (user) {
    return <Navigate to="/" />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        if (!email || !password) throw new Error('Please enter both email and password.');
        await loginWithEmail(email, password);
      } else {
        if (!name || !email || !password) throw new Error('Please fill in all fields.');
        if (password !== confirmPassword) throw new Error('Passwords do not match.');
        if (password.length < 6) throw new Error('Password must be at least 6 characters.');
        await registerWithEmail(name, email, password);
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setError('');
      setLoading(true);
      await loginWithGoogle();
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Google sign-in failed. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f0f4f8] flex flex-col items-center justify-center p-6 text-[#0f172a] relative overflow-hidden">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl overflow-hidden border border-[#e1e8ed] relative z-10">
        
        {/* Header Section */}
        <div className="p-8 pb-6 text-center">
          <div className="flex justify-center mb-4">
            <div className="bg-[#003366] p-3.5 rounded-2xl text-white shadow-xs">
              <TrendingUp size={32} strokeWidth={2.5} />
            </div>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight mb-2 text-[#002b49]">SmartSpend</h1>
          <p className="text-slate-500 font-medium text-sm">Because you can't fix what you can't see.</p>
        </div>

        {/* Auth Toggle */}
        <div className="flex border-b border-[#e1e8ed] bg-slate-50/50">
          <button 
            onClick={() => { setIsLogin(true); setError(''); }}
            className={clsx(
              "flex-1 py-3.5 text-sm font-bold transition-colors border-b-2",
              isLogin ? "border-[#005b8e] text-[#005b8e]" : "border-transparent text-slate-500 hover:text-slate-700"
            )}
          >
            Sign In
          </button>
          <button 
            onClick={() => { setIsLogin(false); setError(''); }}
            className={clsx(
              "flex-1 py-3.5 text-sm font-bold transition-colors border-b-2",
              !isLogin ? "border-[#005b8e] text-[#005b8e]" : "border-transparent text-slate-500 hover:text-slate-700"
            )}
          >
            Create Account
          </button>
        </div>

        <div className="p-8 pt-6">
          {error && (
            <div className="mb-6 p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm font-medium text-center shadow-xs">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600 ml-1">Full Name</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="John Doe"
                    disabled={loading}
                    className="w-full bg-[#f8fafc] border border-[#e1e8ed] rounded-xl py-3 pl-11 pr-4 text-[#0f172a] focus:outline-none focus:ring-2 focus:ring-[#005b8e]/20 focus:border-[#005b8e]"
                  />
                </div>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-600 ml-1">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  disabled={loading}
                  className="w-full bg-[#f8fafc] border border-[#e1e8ed] rounded-xl py-3 pl-11 pr-4 text-[#0f172a] focus:outline-none focus:ring-2 focus:ring-[#005b8e]/20 focus:border-[#005b8e]"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-600 ml-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  disabled={loading}
                  className="w-full bg-[#f8fafc] border border-[#e1e8ed] rounded-xl py-3 pl-11 pr-4 text-[#0f172a] focus:outline-none focus:ring-2 focus:ring-[#005b8e]/20 focus:border-[#005b8e]"
                />
              </div>
            </div>

            {!isLogin && (
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600 ml-1">Confirm Password</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    disabled={loading}
                    className="w-full bg-[#f8fafc] border border-[#e1e8ed] rounded-xl py-3 pl-11 pr-4 text-[#0f172a] focus:outline-none focus:ring-2 focus:ring-[#005b8e]/20 focus:border-[#005b8e]"
                  />
                </div>
              </div>
            )}

            <button 
              type="submit"
              disabled={loading}
              className="w-full mt-2 flex items-center justify-center gap-2 bg-[#005b8e] hover:bg-[#004f7c] text-white py-3.5 px-6 rounded-xl font-bold transition-all shadow-xs disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : isLogin ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          <div className="my-6 flex items-center gap-3 text-slate-400 text-xs uppercase tracking-wider font-semibold">
            <div className="flex-1 h-px bg-[#e1e8ed]"></div>
            or
            <div className="flex-1 h-px bg-[#e1e8ed]"></div>
          </div>

          <button 
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="group relative w-full flex items-center justify-center gap-3 bg-white hover:bg-slate-50 border border-[#e1e8ed] text-slate-700 py-3 px-6 rounded-xl font-bold transition-all shadow-xs disabled:opacity-70 disabled:cursor-not-allowed"
          >
            <span className="relative z-10 flex items-center gap-3">
              <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
              Continue with Google
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}