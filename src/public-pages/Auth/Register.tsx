import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../app/providers/AuthProvider';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { X, ArrowRight, UserPlus, Eye, EyeOff, User, Smartphone, Lock, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export const Register: React.FC = () => {
  const { t, i18n } = useTranslation();
  const isMr = Boolean(i18n.language?.startsWith('mr'));
  const { register } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const roleParam = searchParams.get('role');
  const actionParam = searchParams.get('action');
  const propTitleParam = searchParams.get('propTitle');
  const propIdParam = searchParams.get('propId');
  const isBuyerContext = roleParam === 'buyer' || actionParam === 'buy' || Boolean(propIdParam);

  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [panelVisible, setPanelVisible] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Animate panel in on mount
  useEffect(() => {
    const timer = setTimeout(() => setPanelVisible(true), 40);
    return () => clearTimeout(timer);
  }, []);

  const handleClose = () => {
    setPanelVisible(false);
    setTimeout(() => {
      if (window.history.length > 1) {
        navigate(-1);
      } else {
        navigate('/');
      }
    }, 250);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !mobile || !password || !confirmPassword) {
      setError('All fields are required.');
      return;
    }

    if (mobile.length !== 10 || !/^\d+$/.test(mobile)) {
      setError('Please enter a valid 10-digit mobile number.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    const cleanMobile = mobile.replace(/[^0-9]/g, '').slice(-10);
    if (cleanMobile.length < 10) {
      setError(i18n.language?.startsWith('mr') ? 'कृपया वैध १० अंकी मोबाईल नंबर टाका.' : 'Please enter a valid 10-digit mobile number.');
      return;
    }

    setLoading(true);
    setError('');
    
    // Create consistent pseudo-email matching mobile app standard
    const pseudoEmail = `${cleanMobile}@propertyvishva.com`;

    try {
      const initialRole = isBuyerContext ? 'buyer' : 'user';
      await register(pseudoEmail, password, name, cleanMobile, initialRole);
      
      const redirectUrl = searchParams.get('redirect');
      const destination = redirectUrl || (isBuyerContext ? '/buyer/dashboard' : '/role-inquiry');

      // Smoothly animate panel out first
      setPanelVisible(false);
      setTimeout(() => {
        navigate(destination, { replace: true });
      }, 200);
    } catch (err: any) {
      if (err?.code === 'auth/email-already-in-use' || err?.message?.includes('आधीच नोंदणीकृत')) {
        setError(i18n.language?.startsWith('mr') ? 'हा मोबाईल नंबर आधीच नोंदणीकृत आहे. कृपया लॉगिन करा.' : 'This mobile number is already registered. Please log in.');
      } else {
        setError(err?.message || (i18n.language?.startsWith('mr') ? 'नोंदणी अयशस्वी झाली. कृपया पुन्हा प्रयत्न करा.' : 'Registration failed. Please try again.'));
      }
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

          {/* Title */}
          <div className="mb-6">
            <div className="flex items-center gap-2.5 mb-2">
              <div className="p-2 bg-primary/10 rounded-xl">
                <UserPlus className="w-5 h-5 text-primary" />
              </div>
              <h2 className="text-3xl font-bold text-slate-900 tracking-tight">
                {t('auth.registerAccount')}
              </h2>
            </div>
            <p className="text-sm text-slate-500 mt-1">
              {t('auth.joinPlatform')}
            </p>
          </div>

          {/* Buyer Recommendation Badge for Purchasing Users */}
          {isBuyerContext && (
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-4 mb-5 text-left shadow-sm">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-blue-600 text-white rounded-xl shrink-0 mt-0.5 shadow-sm">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-1.5 mb-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-blue-800 bg-blue-100 px-2.5 py-0.5 rounded-full">
                      {isMr ? 'शिफारस: खरेदीदार खाते' : 'Recommended: Buyer Account'}
                    </span>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-full">
                      {isMr ? 'त्वरित सक्रिय (No Admin Approval)' : 'Direct Instant Access'}
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-slate-900">
                    {propTitleParam 
                      ? (isMr ? `"${propTitleParam}" खरेदी करण्यासाठी नोंदणी` : `Registering to buy "${propTitleParam}"`)
                      : (isMr ? 'मालमत्ता खरेदीदारांसाठी विशेष खाते' : 'Special Account for Property Buyers')}
                  </h4>
                  <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                    {isMr
                      ? 'तुम्ही मालमत्ता खरेदी करत असल्यामुळे आपले खाते थेट "खरेदीदार (Buyer)" म्हणून सक्रिय केले जाईल. खरेदीदारांसाठी ॲडमिन मंजुरीची प्रतीक्षा करण्याची आवश्यकता नाही.'
                      : 'Because you are purchasing property, your account will be activated immediately as a verified Buyer without waiting for admin approval.'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Error message */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-2xl px-4 py-3 mb-5">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <Input
              icon={User}
              label={t('details.fullName')}
              placeholder={t('details.enterName')}
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
            <Input
              icon={Smartphone}
              type="tel"
              label="MOBILE NUMBER"
              placeholder="Enter 10-digit mobile number"
              value={mobile}
              maxLength={10}
              onChange={(e) => {
                let digits = e.target.value.replace(/\D/g, '');
                if (digits.length > 10 && (digits.startsWith('91') || digits.startsWith('0'))) {
                  digits = digits.startsWith('91') ? digits.slice(2, 12) : digits.slice(1, 11);
                } else {
                  digits = digits.slice(0, 10);
                }
                setMobile(digits);
              }}
              required
            />
            <Input
               icon={Lock}
               type={showPassword ? 'text' : 'password'}
               label="PASSWORD"
               placeholder="Create a password (min 6 chars)"
               value={password}
               onChange={(e) => setPassword(e.target.value)}
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
            <Input
               icon={Lock}
               type={showConfirmPassword ? 'text' : 'password'}
               label="CONFIRM PASSWORD"
               placeholder="Retype your password"
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
              className="w-full py-3.5 rounded-2xl mt-1 font-bold text-white flex items-center justify-center gap-2 bg-primary hover:bg-primary-dark shadow-lg shadow-primary/25 transition-all"
            >
              {t('auth.registerButton')}
              {!loading && <ArrowRight className="w-4 h-4" />}
            </Button>
          </form>

          {/* Footer */}
          <div className="mt-8 pt-6 border-t border-slate-100 text-center">
            <p className="text-sm text-slate-600">
              {t('auth.alreadyHaveAccount')}{' '}
              <Link
                to={`/login${window.location.search || ''}`}
                className="text-primary hover:underline font-semibold"
              >
                {t('auth.signIn')}
              </Link>
            </p>
          </div>
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
