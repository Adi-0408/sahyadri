import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../app/providers/AuthProvider';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { ShieldCheck, Eye, EyeOff, X, ArrowRight, Smartphone, Lock, Mail } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { resetPassword } from '../../services/firebase';

export const Login: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { login } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<'login' | 'reset'>('login');
  const [loginType, setLoginType] = useState<'mobile' | 'admin'>('mobile');
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [panelVisible, setPanelVisible] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Quick switch helpers
  const handleSelectAdmin = () => {
    setLoginType('admin');
    setLoginId('');
    setPassword('');
    setError('');
  };

  const handleSelectMobile = () => {
    setLoginType('mobile');
    setLoginId('');
    setPassword('');
    setError('');
  };

  // Reset password states
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  // Animate panel in on mount
  useEffect(() => {
    const timer = setTimeout(() => setPanelVisible(true), 50);
    return () => clearTimeout(timer);
  }, []);

  const handleClose = () => {
    setPanelVisible(false);
    setTimeout(() => {
      navigate('/');
    }, 300);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedId = loginId.trim();
    const trimmedPass = password.trim();
    if (!trimmedId || !trimmedPass) return;

    setLoading(true);
    setError('');
    setSuccessMsg('');

    const cleanDigits = trimmedId.replace(/[^0-9]/g, '');
    const isEmail = trimmedId.includes('@');
    const isPotentialAdmin = trimmedId.toLowerCase() === 'admin' || trimmedId.toLowerCase().startsWith('admin@');

    // If user is entering a mobile number and it's less than 10 digits
    if (!isEmail && !isPotentialAdmin && cleanDigits.length > 0 && cleanDigits.length < 10) {
      setError(i18n.language?.startsWith('mr') ? 'कृपया वैध १० अंकी मोबाईल नंबर टाका.' : 'Please enter a valid 10-digit mobile number.');
      setLoading(false);
      return;
    }

    let loginIdentifier = trimmedId;
    if (trimmedId.toLowerCase() === 'admin') {
      loginIdentifier = 'admin@gmail.com';
    } else if (!isEmail && cleanDigits.length >= 10) {
      loginIdentifier = cleanDigits.slice(-10);
    }

    const isExplicitAdmin = loginType === 'admin';
    try {
      const cred = await login(loginIdentifier, trimmedPass, isExplicitAdmin);
      const searchParams = new URLSearchParams(window.location.search);
      const redirectUrl = searchParams.get('redirect');

      const userRole = cred?.user?.role || 'user';
      const isAdmin =
        isExplicitAdmin ||
        userRole === 'admin' ||
        cred?.user?.email === 'admin@gmail.com' ||
        loginIdentifier.toLowerCase() === 'admin@gmail.com';

      let dest = redirectUrl || '/role-inquiry';
      if (isAdmin) {
        dest = redirectUrl || '/admin/dashboard';
      } else if (userRole === 'representative') {
        dest = redirectUrl || '/admin/tasks';
      } else if (userRole === 'seller') {
        dest = redirectUrl || '/seller/dashboard';
      } else if (userRole === 'buyer') {
        dest = redirectUrl || '/buyer/dashboard';
      } else if (userRole === 'builder') {
        dest = redirectUrl || '/builder/dashboard';
      } else if (userRole === 'agent') {
        dest = redirectUrl || '/agent/dashboard';
      } else if (userRole === 'supplier') {
        dest = redirectUrl || '/supplier/dashboard';
      } else {
        dest = redirectUrl || '/role-inquiry';
      }

      setPanelVisible(false);
      setTimeout(() => {
        navigate(dest, { replace: true });
      }, 200);
    } catch (err: any) {
      if (err?.code === 'auth/invalid-credential' || err?.code === 'auth/user-not-found' || err?.code === 'auth/wrong-password') {
        setError(i18n.language?.startsWith('mr') ? 'मोबाईल नंबर किंवा पासवर्ड चुकीचा आहे. कृपया पुन्हा प्रयत्न करा.' : 'Incorrect mobile number or password. Please try again.');
      } else if (err?.code === 'auth/invalid-email') {
        setError(i18n.language?.startsWith('mr') ? 'कृपया वैध मोबाईल नंबर किंवा ईमेल प्रविष्ट करा.' : 'Please enter a valid mobile number or email address.');
      } else {
        setError(err?.message || t('auth.authFailed'));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (!newPassword || !confirmPassword) {
      setError('Both fields are mandatory.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      let firebaseEmail = loginId;
      if (loginId.length === 10 && /^\d+$/.test(loginId)) {
        firebaseEmail = `${loginId}@propertyvishva.com`;
      }
      try {
        await resetPassword(firebaseEmail, newPassword);
      } catch (err: any) {
        if (firebaseEmail.endsWith('@propertyvishva.com')) {
          try {
            await resetPassword(`${loginId}@sahayadrilanddev.com`, newPassword);
          } catch {
            await resetPassword(`${loginId}@astitvarealestate.com`, newPassword);
          }
        } else {
          throw err;
        }
      }
      setSuccessMsg('Password updated successfully.');
      setNewPassword('');
      setConfirmPassword('');
      setMode('login');
    } catch (err: any) {
      setError(err?.message || 'Failed to update password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950">
      {/* ── Background: Lightweight static backdrop (Zero lag, 60fps) ── */}
      <div className="absolute inset-0 pointer-events-none select-none overflow-hidden">
        <div
          className="w-full h-full bg-cover bg-center"
          style={{
            backgroundImage: 'url(/hero-background.jpg)'
          }}
        />
        <div className="absolute inset-0 bg-slate-950/65" />
      </div>

      {/* ── Overlay backdrop ── */}
      <div
        className="absolute inset-0 bg-black/40 z-10 transition-opacity duration-300"
        style={{ opacity: panelVisible ? 1 : 0 }}
        onClick={handleClose}
      />

      {/* ── Right-side sliding panel ── */}
      <div
        className="fixed top-0 right-0 h-full w-full max-w-md z-20 flex flex-col bg-white shadow-2xl transition-transform duration-300 ease-out overflow-y-auto"
        style={{ transform: panelVisible ? 'translateX(0)' : 'translateX(100%)' }}
      >
        {/* Panel Header */}
        <div className="flex items-center justify-between px-5 sm:px-8 pt-6 sm:pt-8 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <img
              src="/sahyadri-logo.png"
              alt="Sahyadri Lands"
              className="h-12 object-contain"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-all duration-200"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Panel Body */}
        <div className="flex flex-col flex-1 px-5 sm:px-8 py-6 sm:py-8">
          {mode === 'login' ? (
            <>
              {/* Title */}
              <div className="mb-6">
                <h2 className="text-3xl font-bold text-slate-900 tracking-tight">
                  {t('auth.signIn')}
                </h2>
                <p className="text-sm text-slate-500 mt-1.5">
                  {t('auth.signInDesc')}
                </p>
              </div>

              {/* Role Toggle Selector */}
              <div className="flex p-1 bg-slate-100 rounded-2xl mb-5 border border-slate-300">
                <button
                  type="button"
                  onClick={handleSelectMobile}
                  className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    loginType === 'mobile'
                      ? 'bg-white text-slate-900 shadow-xs border border-slate-300'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  {t('auth.userRepresentative', 'युजर / प्रतिनिधी')}
                </button>
                <button
                  type="button"
                  onClick={handleSelectAdmin}
                  className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    loginType === 'admin'
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  {i18n.language?.startsWith('mr') ? 'ॲडमिन लॉगिन (Admin)' : t('auth.adminLogin', 'Admin Login')}
                </button>
              </div>

              {/* Success message */}
              {successMsg && (
                <div className="bg-green-50 border border-green-200 text-green-700 text-sm rounded-2xl px-4 py-3 mb-5 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 flex-shrink-0" />
                  {successMsg}
                </div>
              )}

              {/* Error message */}
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-2xl px-4 py-3 mb-5">
                  {error}
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <Input
                  icon={loginId.includes('@') ? Mail : Smartphone}
                  type="text"
                  label={loginType === 'admin' ? (i18n.language?.startsWith('mr') ? 'प्रशासक मोबाईल नंबर किंवा ईमेल' : 'ADMIN MOBILE NUMBER OR EMAIL') : (i18n.language?.startsWith('mr') ? 'मोबाईल नंबर किंवा ईमेल' : 'MOBILE NUMBER OR EMAIL')}
                  placeholder={loginType === 'admin' ? (i18n.language?.startsWith('mr') ? 'उदा. 8328712712 किंवा admin@gmail.com' : 'e.g. 8328712712 or admin@gmail.com') : (i18n.language?.startsWith('mr') ? '१० अंकी मोबाईल नंबर किंवा ईमेल' : '10-digit mobile number or email')}
                  value={loginId}
                  maxLength={!loginId.includes('@') && !/[a-zA-Z]/.test(loginId) ? 10 : undefined}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (!val.includes('@') && !/[a-zA-Z]/.test(val)) {
                      let digits = val.replace(/\D/g, '');
                      if (digits.length > 10 && (digits.startsWith('91') || digits.startsWith('0'))) {
                        digits = digits.startsWith('91') ? digits.slice(2, 12) : digits.slice(1, 11);
                      } else {
                        digits = digits.slice(0, 10);
                      }
                      setLoginId(digits);
                    } else {
                      setLoginId(val);
                    }
                  }}
                  autoComplete="username"
                  required
                />
                <Input
                  icon={Lock}
                  type={showPassword ? 'text' : 'password'}
                  label="PASSWORD"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  required
                  suffix={
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-slate-400 hover:text-slate-600 transition-colors p-1"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  }
                />

                {/* Quick Admin Option Link when in mobile mode */}
                {loginType === 'mobile' && (
                  <div className="flex items-center justify-between text-xs pt-0.5">
                    <button
                      type="button"
                      onClick={handleSelectAdmin}
                      className="text-primary hover:text-primary-dark font-medium flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>{i18n.language?.startsWith('mr') ? 'ॲडमिन लॉगिन (Admin Login)' : 'Admin Login'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => { setMode('reset'); setError(''); setSuccessMsg(''); }}
                      className="text-slate-500 hover:text-primary transition-colors font-medium cursor-pointer"
                    >
                      Forgot Password?
                    </button>
                  </div>
                )}

                {loginType === 'admin' && (
                  <div className="flex justify-end -mt-1">
                    <button
                      type="button"
                      onClick={() => { setMode('reset'); setError(''); setSuccessMsg(''); }}
                      className="text-xs text-primary hover:underline font-semibold cursor-pointer"
                    >
                      Forgot Password?
                    </button>
                  </div>
                )}

                <Button
                  type="submit"
                  variant="primary"
                  isLoading={loading}
                  className="w-full py-3.5 rounded-2xl mt-1 font-bold text-white flex items-center justify-center gap-2 bg-primary hover:bg-primary-dark shadow-lg shadow-primary/25 transition-all"
                >
                  {loginType === 'admin' ? (i18n.language?.startsWith('mr') ? 'ॲडमिन म्हणून लॉगिन करा' : t('auth.loginAsAdmin', 'Login as Admin')) : t('auth.signIn')}
                  {!loading && <ArrowRight className="w-4 h-4" />}
                </Button>
              </form>

              {/* Footer links */}
              <div className="mt-8 pt-6 border-t border-slate-100 flex flex-col gap-4 text-center">
                <p className="text-sm text-slate-600">
                  {t('auth.dontHaveAccount')}{' '}
                  <Link to="/register" className="text-primary hover:underline font-semibold">
                    {t('auth.registerHere')}
                  </Link>
                </p>
              </div>
            </>
          ) : (
            <>
              {/* Reset Password Mode */}
              <div className="mb-8">
                <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Reset Password</h2>
                <p className="text-sm text-slate-500 mt-1.5">Enter a new secure password for your account</p>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-2xl px-4 py-3 mb-5">
                  {error}
                </div>
              )}

              <form onSubmit={handleResetSubmit} className="flex flex-col gap-5">
                <Input
                  type={showNewPassword ? 'text' : 'password'}
                  label="New Password"
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  suffix={
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="text-slate-400 hover:text-slate-600 transition-colors p-1"
                    >
                      {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  }
                />

                <Input
                  type={showConfirmPassword ? 'text' : 'password'}
                  label="Confirm Password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  suffix={
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="text-slate-400 hover:text-slate-600 transition-colors p-1"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  }
                />

                <Button
                  type="submit"
                  variant="primary"
                  isLoading={loading}
                  className="w-full py-3.5 rounded-2xl mt-1 font-bold text-white bg-primary hover:bg-primary-dark shadow-lg shadow-primary/25 transition-all"
                >
                  Update Password
                </Button>
              </form>

              <div className="mt-8 pt-6 border-t border-slate-100 text-center">
                <button
                  type="button"
                  onClick={() => { setMode('login'); setError(''); setSuccessMsg(''); }}
                  className="text-sm text-primary hover:underline font-semibold cursor-pointer"
                >
                  ← Back to Login
                </button>
              </div>
            </>
          )}
        </div>

        {/* Bottom branding strip */}
        <div className="px-5 sm:px-8 pb-6 sm:pb-8 pt-4 mt-auto">
          <p className="text-center text-xs text-slate-400">
            © {new Date().getFullYear()} Sahyadri Lands. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
};
