import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../app/providers/AuthProvider';
import { realDb } from '../../../services/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { Eye, EyeOff, ShieldCheck, AlertCircle } from 'lucide-react';

export const AdminLogin: React.FC = () => {
  const { t } = useTranslation();
  const { login, logout, user, isAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Auto-redirect if already logged in as admin
  useEffect(() => {
    if (!authLoading && user && (isAdmin || user.role === 'employee')) {
      navigate('/admin/dashboard', { replace: true });
    }
  }, [user, isAdmin, authLoading, navigate]);

  // Show loading spinner while auth state is being determined
  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
          <p className="text-slate-500 text-sm font-semibold">{t('admin.login.sessionChecking')}</p>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const rawInput = (email || '').trim();
    const rawPassword = (password || '').trim();
    if (!rawInput || !rawPassword) return;

    setLoading(true);
    setError('');
    try {
      let normalizedLogin = rawInput;
      const digitsOnly = rawInput.replace(/[^0-9]/g, '');
      const isMobile = digitsOnly.length >= 10 && !rawInput.includes('@');

      if (isMobile) {
        normalizedLogin = digitsOnly.slice(-10);
      } else if (rawInput.toLowerCase() === 'admin') {
        normalizedLogin = 'admin@gmail.com';
      } else {
        normalizedLogin = rawInput.toLowerCase();
      }

      const res = await login(normalizedLogin, rawPassword, true);
      const uid = res?.user?.uid;
      const role = res?.user?.role;
      let isUserAdmin = false;
      let isActive = true;

      const adminEmails = [
        'admin@gmail.com',
        'admin@astitvarealestate.com',
        'admin@propertyastitv.com',
        'admin@propertyvishva.com',
        'admin@sahyadri.com',
        'admin@sahayadrilanddev.com'
      ];

      const adminMobiles = [
        '8328712712',
        '918328712712',
        '7507700162',
        '9876543210'
      ];
      
      if (
        adminEmails.includes(normalizedLogin) ||
        adminMobiles.includes(normalizedLogin) ||
        role === 'admin' ||
        role === 'employee' ||
        uid === 'B47ojxIU3icqVzJSRTdHpouDN0A2' ||
        uid === 'A4TMfsDPivRJGcCXJhhKwyAkJzw2' ||
        uid === 'jIzLTB96RzOtiIqDZlypNr1K2cy1'
      ) {
        isUserAdmin = true;
        isActive = true;
      } else if (uid) {
        const adminDocRef = doc(realDb, 'admins', uid);
        const adminSnap = await getDoc(adminDocRef);
        if (adminSnap.exists()) {
          const data = adminSnap.data();
          isUserAdmin = data.role === 'admin' || data.role === 'employee' || !data.role;
          isActive = !data.status || data.status === 'active';
        } else {
          const empDocRef = doc(realDb, 'employee', uid);
          const empSnap = await getDoc(empDocRef);
          if (empSnap.exists()) {
            const data = empSnap.data();
            isUserAdmin = data.role === 'admin' || data.role === 'employee';
            isActive = !data.status || data.status === 'active';
          }
        }
      }

      if (!isUserAdmin || !isActive) {
        await logout();
        setError(t('admin.login.accessDenied'));
      } else {
        navigate('/admin/dashboard');
      }
    } catch (err: any) {
      setError(err?.message || t('admin.login.authFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 relative overflow-hidden font-sans">

      {/* Ambient background blurs */}
      <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-primary/[0.03] rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-15%] left-[-10%] w-[50%] h-[50%] bg-primary/[0.02] rounded-full blur-[140px] pointer-events-none" />

      {/* Login Card */}
      <div className="relative w-full max-w-md">

        {/* Glow ring behind card */}
        <div className="absolute inset-0 bg-primary/[0.02] rounded-3xl blur-2xl scale-105 pointer-events-none" />

        <div className="relative bg-white border border-slate-100 shadow-2xl rounded-3xl overflow-hidden">

          {/* Top accent bar */}
          <div className="h-1.5 w-full bg-primary" />

          <div className="p-8 md:p-10">

            {/* Header */}
            <div className="flex flex-col items-center text-center gap-3 mb-8">
              <img
                src="/sahyadri-logo.png"
                alt="Sahyadri Land Developer"
                className="h-20 w-auto object-contain mb-1"
              />
              <div>
                <h1 className="text-2xl font-serif font-bold text-slate-900 tracking-tight mt-1">
                  {t('admin.login.title')}
                </h1>
                <p className="text-xs text-slate-400 mt-1 uppercase tracking-widest font-extrabold">
                  {t('admin.login.subtitle')}
                </p>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-start gap-3 bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-2xl px-4 py-3.5 mb-6">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0 text-rose-650" />
                <span className="font-medium text-left">{error}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="flex flex-col gap-5 text-left">

              {/* Mobile / Email */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  {t('admin.login.emailLabel')}
                </label>
                <input
                  type="text"
                  placeholder="उदा. 8328712712 किंवा admin@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="username"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 focus:bg-white focus:border-primary rounded-xl text-sm outline-none transition-all duration-200"
                />
              </div>

              {/* Password */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  {t('admin.login.passwordLabel')}
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="new-password"
                    className="w-full px-4 py-3 pr-12 bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 focus:bg-white focus:border-primary rounded-xl text-sm outline-none transition-all duration-200"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-650 transition-colors cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Submit button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 mt-1 bg-primary hover:bg-primary/95 text-white font-bold rounded-xl text-sm tracking-wide uppercase transition-all duration-200 shadow-md shadow-primary/10 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    {t('admin.login.verifying')}
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    {t('admin.login.openDashboard')}
                  </>
                )}
              </button>
            </form>

            {/* Footer note */}
            <div className="mt-8 pt-6 border-t border-slate-100 text-center">
              <p className="text-[11px] text-slate-450 uppercase tracking-widest font-extrabold flex items-center justify-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-primary/80" />
                {t('admin.login.restricted')}
              </p>
            </div>

          </div>
        </div>

        {/* Bottom logo */}
        <div className="text-center mt-6">
          <p className="text-xs text-slate-600">
            © {new Date().getFullYear()} Sahyadri Land Developer Admin Panel
          </p>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
