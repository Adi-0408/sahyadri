import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../app/providers/AuthProvider';
import { Heart, LogOut, User, LayoutDashboard } from 'lucide-react';
import { Button } from '../ui/Button';
import { LanguageSwitcher } from '../ui/LanguageSwitcher';
import { useTranslation } from 'react-i18next';

export const Navbar: React.FC = () => {
  const { t, i18n } = useTranslation();
  const isMarathi = Boolean(i18n.language?.startsWith('mr'));
  const { user, logout, isAdmin } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [savedCount, setSavedCount] = useState(0);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const [isDesktopDropdownOpen, setIsDesktopDropdownOpen] = useState(false);
  const [isMobileDropdownOpen, setIsMobileDropdownOpen] = useState(false);
  const desktopDropdownRef = useRef<HTMLDivElement>(null);
  const mobileDropdownRef = useRef<HTMLDivElement>(null);

  const [effectiveRole, setEffectiveRole] = useState<string>(() => user?.role || 'user');

  useEffect(() => {
    const resolveRole = () => {
      if (!user) {
        setEffectiveRole('');
        return;
      }
      if (user.role && user.role !== 'user') {
        setEffectiveRole(user.role);
        return;
      }
      const userCleanMobile = (
        user.mobile ||
        (user.email && /^\d{10}@/.test(user.email) ? user.email.split('@')[0] : '') ||
        ''
      ).replace(/[^0-9]/g, '').slice(-10);

      try {
        const uidToken = localStorage.getItem(`sahyadri_role_approved_${user.uid}`);
        if (uidToken) {
          const parsed = JSON.parse(uidToken);
          if (parsed?.role) {
            setEffectiveRole(parsed.role);
            return;
          }
        }
        if (userCleanMobile) {
          const mobToken = localStorage.getItem(`sahyadri_role_approved_${userCleanMobile}`);
          if (mobToken) {
            const parsed = JSON.parse(mobToken);
            if (parsed?.role) {
              setEffectiveRole(parsed.role);
              return;
            }
          }
        }
      } catch {}
      setEffectiveRole(user.role || 'user');
    };

    resolveRole();
    window.addEventListener('storage', resolveRole);
    window.addEventListener('role_inquiry_updated', resolveRole);
    return () => {
      window.removeEventListener('storage', resolveRole);
      window.removeEventListener('role_inquiry_updated', resolveRole);
    };
  }, [user]);

  const canAccessDashboard = Boolean(
    isAdmin ||
    user?.role === 'admin' ||
    user?.role === 'employee' ||
    user?.role === 'representative' ||
    effectiveRole === 'admin' ||
    (user?.email && ['admin@gmail.com', 'admin@astitvarealestate.com', 'admin@propertyastitv.com', 'admin@propertyvishva.com'].includes(user.email.toLowerCase())) ||
    (typeof window !== 'undefined' && (
      Boolean(localStorage.getItem('astitva_admin_session')) ||
      Boolean(localStorage.getItem('sahyadri_rep_session'))
    ))
  );

  // Scroll shadow
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const updateSavedCount = () => {
      const saved = localStorage.getItem('luminous_saved_properties');
      if (saved) {
        try { setSavedCount(JSON.parse(saved).length); }
        catch { setSavedCount(0); }
      } else { setSavedCount(0); }
    };
    updateSavedCount();
    window.addEventListener('storage', updateSavedCount);
    window.addEventListener('saved_properties_changed', updateSavedCount);
    return () => {
      window.removeEventListener('storage', updateSavedCount);
      window.removeEventListener('saved_properties_changed', updateSavedCount);
    };
  }, []);

  // Click outside to close dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        desktopDropdownRef.current &&
        !desktopDropdownRef.current.contains(event.target as Node)
      ) {
        setIsDesktopDropdownOpen(false);
      }
      if (
        mobileDropdownRef.current &&
        !mobileDropdownRef.current.contains(event.target as Node)
      ) {
        setIsMobileDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/');
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const navLinks = [
    { name: t('hero.buy'), path: '/properties?type=sale' },
    { name: t('hero.rent'), path: '/properties?type=rent' },
    { name: t('home.newProjects'), path: '/projects' },
    { name: t('nav.materials', isMarathi ? 'बांधकाम साहित्य' : 'Materials'), path: '/materials' },
    { name: t('nav.contact', 'Contact'), path: '/contact' },
  ];

  const isActive = (path: string) =>
    path.includes('?')
      ? location.pathname + location.search === path
      : location.pathname === path;

  return (
    <header
      className={`fixed top-0 w-full z-50 bg-white transition-all duration-300 ${scrolled ? 'shadow-md border-b border-slate-200' : 'border-b border-slate-100'
        }`}
      style={{ height: '64px' }}
    >
      <div className="h-full max-w-7xl mx-auto px-4 md:px-6 lg:px-10 flex items-center justify-between">

        {/* ── DESKTOP & TABLET VIEW LAYOUT (Visible on md 768px and above) ── */}
        <div className="hidden md:flex w-full items-center justify-between h-full gap-1.5 lg:gap-3">
          {/* LEFT: Logo + Brand */}
          <Link to="/" className="flex items-center gap-2 lg:gap-2.5 shrink-0 select-none">
            <img
              src="/sahyadri-emblem.png"
              alt="Sahyadri Land Developer"
              className="h-8 lg:h-10 xl:h-11 w-auto object-contain"
            />
            {isMarathi ? (
              <span className="flex items-baseline whitespace-nowrap">
                <span 
                  className="text-xl sm:text-2xl lg:text-[28px] font-bold tracking-tight text-[#b81414] hover:text-[#991b1b] transition-colors"
                  style={{ fontFamily: '"Rozha One", "Amita", "Yatra One", "Kalam", serif', lineHeight: 1 }}
                >
                  सह्याद्री
                </span>
                <span 
                  className="text-xs sm:text-sm lg:text-base font-bold text-slate-900 ml-1.5 sm:ml-2 tracking-wide"
                  style={{ fontFamily: '"Anek Marathi", sans-serif' }}
                >
                  लँड डेव्हलपर
                </span>
              </span>
            ) : (
              <span className="flex items-baseline whitespace-nowrap">
                <span 
                  className="text-base lg:text-lg xl:text-2xl font-bold tracking-[0.12em] text-slate-950"
                  style={{ fontFamily: '"Cinzel", serif' }}
                >
                  SAHYADRI
                </span>
                <span 
                  className="text-[10px] lg:text-xs xl:text-sm font-bold uppercase tracking-[0.22em] text-slate-600 ml-1 lg:ml-1.5 xl:ml-2"
                  style={{ fontFamily: '"Montserrat", sans-serif' }}
                >
                  LAND DEVELOPER
                </span>
              </span>
            )}
          </Link>

          {/* CENTER: Nav Links */}
          <nav className="flex items-center gap-0.5 lg:gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                to={link.path}
                className={`px-1.5 lg:px-2.5 xl:px-3.5 py-1.5 text-[13px] lg:text-[14px] xl:text-base font-bold transition-all duration-200 whitespace-nowrap ${isActive(link.path)
                  ? 'text-primary underline underline-offset-8 decoration-2'
                  : 'text-slate-900 hover:text-primary hover:underline underline-offset-8 decoration-2'
                  }`}
              >
                {link.name}
              </Link>
            ))}
          </nav>

          {/* RIGHT: Actions */}
          <div className="flex items-center gap-1 xl:gap-2 shrink-0">
            {/* Language Switcher */}
            <LanguageSwitcher />

            {/* Divider */}
            <div className="w-px h-5 bg-slate-200 mx-0.5 xl:mx-1" />

            {/* Saved / Wishlist */}
            <Link
              to="/properties?filter=saved"
              title="Saved Properties"
              className="relative p-1.5 xl:p-2 rounded-lg text-slate-500 hover:text-primary hover:bg-primary/10 transition-all duration-200"
            >
              <Heart className="w-5 h-5" />
              {savedCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-primary text-white text-[9px] font-bold min-w-[16px] h-4 px-1 rounded-full flex items-center justify-center leading-none">
                  {savedCount}
                </span>
              )}
            </Link>

            {/* Post Property CTA & Profile - Only visible when user is logged in */}
            {user ? (
              <>
                {/* Divider */}
                <div className="w-px h-5 bg-slate-200 mx-0.5 xl:mx-1" />

                {/* If role is seller, quick access to Seller Dashboard */}
                {effectiveRole === 'seller' && (
                  <>
                    <Link to="/seller/dashboard">
                      <Button
                        variant="outline"
                        className="py-1.5 xl:py-2 px-2 md:px-2.5 xl:px-4 rounded-xl text-[11px] lg:text-[12px] xl:text-xs font-bold text-slate-900 border-slate-300 hover:bg-slate-50 whitespace-nowrap"
                      >
                        🏠 {isMarathi ? 'विक्रेता डॅशबोर्ड' : 'Seller Hub'}
                      </Button>
                    </Link>
                    <div className="w-px h-5 bg-slate-200 mx-0.5 xl:mx-1" />
                  </>
                )}

                {/* If user is guest/user role, prompt to Become a Seller */}
                {effectiveRole === 'user' && (
                  <>
                    <Link to="/role-inquiry?role=seller">
                      <Button
                        variant="outline"
                        className="py-1.5 xl:py-2 px-2 md:px-2.5 xl:px-4 rounded-xl text-[11px] lg:text-[12px] xl:text-xs font-bold text-orange-600 border-orange-200 bg-orange-50/50 hover:bg-orange-50 whitespace-nowrap"
                      >
                        ✨ {isMarathi ? 'विक्रेता बना' : 'Become a Seller'}
                      </Button>
                    </Link>
                    <div className="w-px h-5 bg-slate-200 mx-0.5 xl:mx-1" />
                  </>
                )}

                {/* User Dropdown */}
                <div className="relative" ref={desktopDropdownRef}>
                  <button
                    onClick={() => setIsDesktopDropdownOpen(!isDesktopDropdownOpen)}
                    className="w-9 h-9 rounded-full bg-slate-900 border border-slate-200 text-white flex items-center justify-center font-bold text-sm hover:bg-slate-800 hover:scale-105 transition-all shadow-sm cursor-pointer select-none"
                    style={{ minWidth: '36px', minHeight: '36px' }}
                  >
                    {user.displayName ? user.displayName.charAt(0).toUpperCase() : (user.email ? user.email.charAt(0).toUpperCase() : 'U')}
                  </button>

                  {isDesktopDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 rounded-xl shadow-lg py-1.5 z-50 animate-fadeIn text-left">
                      {/* Role Specific Dashboards */}
                      {effectiveRole === 'seller' && (
                        <Link
                          to="/seller/dashboard"
                          onClick={() => setIsDesktopDropdownOpen(false)}
                          className="block px-4 py-2 text-sm text-orange-600 hover:bg-orange-50 font-bold transition-colors"
                        >
                          🏠 {isMarathi ? 'विक्रेता डॅशबोर्ड' : 'Seller Dashboard'}
                        </Link>
                      )}
                      {effectiveRole === 'buyer' && (
                        <Link
                          to="/buyer/dashboard"
                          onClick={() => setIsDesktopDropdownOpen(false)}
                          className="block px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 font-bold transition-colors"
                        >
                          🔍 {isMarathi ? 'खरेदीदार डॅशबोर्ड' : 'Buyer Dashboard'}
                        </Link>
                      )}
                      {effectiveRole === 'agent' && (
                        <Link
                          to="/agent/dashboard"
                          onClick={() => setIsDesktopDropdownOpen(false)}
                          className="block px-4 py-2 text-sm text-amber-600 hover:bg-amber-50 font-bold transition-colors"
                        >
                          💼 {isMarathi ? 'एजंट डॅशबोर्ड' : 'Agent Dashboard'}
                        </Link>
                      )}
                      {effectiveRole === 'builder' && (
                        <Link
                          to="/builder/dashboard"
                          onClick={() => setIsDesktopDropdownOpen(false)}
                          className="block px-4 py-2 text-sm text-purple-600 hover:bg-purple-50 font-bold transition-colors"
                        >
                          🏢 {isMarathi ? 'बिल्डर डॅशबोर्ड' : 'Builder Dashboard'}
                        </Link>
                      )}
                      {effectiveRole === 'supplier' && (
                        <Link
                          to="/supplier/dashboard"
                          onClick={() => setIsDesktopDropdownOpen(false)}
                          className="block px-4 py-2 text-sm text-orange-600 hover:bg-orange-50 font-bold transition-colors"
                        >
                          🛠️ {isMarathi ? 'सप्लायर डॅशबोर्ड' : 'Supplier Dashboard'}
                        </Link>
                      )}
                      {effectiveRole === 'user' && (
                        <Link
                          to="/role-inquiry"
                          onClick={() => setIsDesktopDropdownOpen(false)}
                          className="block px-4 py-2 text-sm text-primary hover:bg-primary/5 font-bold transition-colors"
                        >
                          ✨ {isMarathi ? 'भूमिका निवडा (विक्रेता / एजंट)' : 'Upgrade Role (Seller / Agent)'}
                        </Link>
                      )}

                      {effectiveRole === 'representative' && (
                        <Link
                          to="/admin/tasks"
                          onClick={() => setIsDesktopDropdownOpen(false)}
                          className="block px-4 py-2 text-sm text-slate-800 hover:bg-slate-50 hover:text-primary transition-colors font-semibold"
                        >
                          📋 {t('nav.representativeTasks', 'माझे कार्य / टास्क')}
                        </Link>
                      )}
                      <Link
                        to="/profile"
                        onClick={() => setIsDesktopDropdownOpen(false)}
                        className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 hover:text-primary transition-colors font-medium"
                      >
                        {t('nav.myProfile', 'My Profile')}
                      </Link>
                      {canAccessDashboard && (
                        <Link
                          to="/admin/dashboard"
                          onClick={() => setIsDesktopDropdownOpen(false)}
                          className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 hover:text-primary transition-colors font-medium flex items-center gap-2"
                        >
                          <LayoutDashboard className="w-4 h-4 text-slate-500" />
                          <span>{t('nav.adminDashboard', 'ॲडमिन डॅशबोर्ड')}</span>
                        </Link>
                      )}
                      <div className="border-t border-slate-100 my-1"></div>
                      <button
                        onClick={() => {
                          setIsDesktopDropdownOpen(false);
                          handleLogout();
                        }}
                        className="w-full text-left block px-4 py-2 text-sm text-red-655 hover:bg-red-50 transition-colors font-medium cursor-pointer"
                      >
                        {t('nav.signOut', 'Logout')}
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <div className="w-px h-5 bg-slate-200 mx-0.5 xl:mx-1" />
                <Link
                  to="/login"
                  className="flex items-center gap-1.5 px-3 py-1.5 xl:py-2 rounded-xl text-xs xl:text-sm font-bold text-slate-700 hover:text-primary hover:bg-primary/5 border border-slate-200 transition-all shadow-sm cursor-pointer select-none"
                >
                  <User className="w-4 h-4 text-slate-600" />
                  <span>{isMarathi ? 'लॉगिन' : 'Login'}</span>
                </Link>
              </>
            )}
          </div>
        </div>

        {/* ── MOBILE VIEW LAYOUT (Only on mobile screens < 768px) ── */}
        <div className="flex md:hidden w-full items-center justify-between h-full relative">
          
          {/* LEFT: Hamburger + Logo */}
          <div className="flex items-center gap-3">
            {/* Hamburger Menu Icon */}
            <button
              type="button"
              onClick={() => setIsOpen(!isOpen)}
              className="p-1 text-slate-800 hover:text-slate-900 cursor-pointer flex items-center justify-center transition-colors relative z-10 -ml-1"
              title="Toggle Menu"
            >
              {isOpen ? (
                <svg className="w-6 h-6 text-slate-800" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-6 h-6 text-slate-800" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>

            {/* Logo */}
            <Link to="/" className="flex items-center shrink-0 select-none gap-1.5">
              <img
                src="/sahyadri-emblem.png"
                alt="Sahyadri Land Developer"
                className="h-7 sm:h-8 w-auto object-contain"
              />
              {isMarathi ? (
                <span className="flex items-baseline whitespace-nowrap">
                  <span 
                    className="text-lg sm:text-xl font-bold tracking-tight text-[#b81414]"
                    style={{ fontFamily: '"Rozha One", "Amita", "Yatra One", "Kalam", serif', lineHeight: 1 }}
                  >
                    सह्याद्री
                  </span>
                  <span 
                    className="text-[11px] sm:text-xs font-bold text-slate-900 ml-1 sm:ml-1.5 tracking-wide"
                    style={{ fontFamily: '"Anek Marathi", sans-serif' }}
                  >
                    लँड डेव्हलपर
                  </span>
                </span>
              ) : (
                <span className="flex items-baseline whitespace-nowrap">
                  <span 
                    className="text-sm sm:text-base font-bold tracking-[0.12em] text-slate-950"
                    style={{ fontFamily: '"Cinzel", serif' }}
                  >
                    SAHYADRI
                  </span>
                  <span 
                    className="text-[10px] sm:text-xs font-bold uppercase tracking-[0.18em] text-slate-600 ml-1 sm:ml-1.5"
                    style={{ fontFamily: '"Montserrat", sans-serif' }}
                  >
                    LAND DEVELOPER
                  </span>
                </span>
              )}
            </Link>
          </div>

          {/* Right actions (Translator icon, Wishlist Heart, and Profile dropdown) */}
          <div className="flex items-center gap-1.5 sm:gap-3.5 relative z-10">
            {/* Language Switcher Dropdown */}
            <LanguageSwitcher mini={true} />

            {/* Saved Properties heart icon for Mobile View */}
            <Link
              to="/properties?filter=saved"
              className="relative p-1.5 text-slate-800 hover:text-primary transition-all duration-200"
              title={t('nav.savedProperties', 'Saved Properties')}
            >
              <Heart className="w-5.5 h-5.5 text-slate-800" />
              {savedCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-primary text-white text-[9px] font-bold min-w-[15px] h-3.5 px-0.5 rounded-full flex items-center justify-center leading-none">
                  {savedCount}
                </span>
              )}
            </Link>

            {/* User Profile Avatar dropdown */}
            {user ? (
              <div className="relative" ref={mobileDropdownRef}>
                <button
                  onClick={() => setIsMobileDropdownOpen(!isMobileDropdownOpen)}
                  className="w-8 h-8 rounded-full bg-slate-900 border border-slate-200 text-white flex items-center justify-center font-bold text-xs hover:bg-slate-800 hover:scale-105 transition-all shadow-sm cursor-pointer select-none"
                >
                  {user.displayName ? user.displayName.charAt(0).toUpperCase() : (user.email ? user.email.charAt(0).toUpperCase() : 'U')}
                </button>

                {isMobileDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-52 bg-white border border-slate-200 rounded-xl shadow-lg py-1.5 z-50 animate-fadeIn text-left">
                    {effectiveRole === 'seller' && (
                      <Link
                        to="/seller/dashboard"
                        onClick={() => setIsMobileDropdownOpen(false)}
                        className="block px-4 py-2 text-sm text-orange-600 hover:bg-orange-50 font-bold transition-colors"
                      >
                        🏠 {isMarathi ? 'विक्रेता डॅशबोर्ड' : 'Seller Dashboard'}
                      </Link>
                    )}
                    {effectiveRole === 'buyer' && (
                      <Link
                        to="/buyer/dashboard"
                        onClick={() => setIsMobileDropdownOpen(false)}
                        className="block px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 font-bold transition-colors"
                      >
                        🔍 {isMarathi ? 'खरेदीदार डॅशबोर्ड' : 'Buyer Dashboard'}
                      </Link>
                    )}
                    {effectiveRole === 'agent' && (
                      <Link
                        to="/agent/dashboard"
                        onClick={() => setIsMobileDropdownOpen(false)}
                        className="block px-4 py-2 text-sm text-amber-600 hover:bg-amber-50 font-bold transition-colors"
                      >
                        💼 {isMarathi ? 'एजंट डॅशबोर्ड' : 'Agent Dashboard'}
                      </Link>
                    )}
                    {effectiveRole === 'builder' && (
                      <Link
                        to="/builder/dashboard"
                        onClick={() => setIsMobileDropdownOpen(false)}
                        className="block px-4 py-2 text-sm text-purple-600 hover:bg-purple-50 font-bold transition-colors"
                      >
                        🏢 {isMarathi ? 'बिल्डर डॅशबोर्ड' : 'Builder Dashboard'}
                      </Link>
                    )}
                    {effectiveRole === 'supplier' && (
                      <Link
                        to="/supplier/dashboard"
                        onClick={() => setIsMobileDropdownOpen(false)}
                        className="block px-4 py-2 text-sm text-orange-600 hover:bg-orange-50 font-bold transition-colors"
                      >
                        🛠️ {isMarathi ? 'सप्लायर डॅशबोर्ड' : 'Supplier Dashboard'}
                      </Link>
                    )}
                    {effectiveRole === 'user' && (
                      <Link
                        to="/role-inquiry"
                        onClick={() => setIsMobileDropdownOpen(false)}
                        className="block px-4 py-2 text-sm text-primary hover:bg-primary/5 font-bold transition-colors"
                      >
                        ✨ {isMarathi ? 'भूमिका निवडा (विक्रेता / एजंट)' : 'Upgrade Role'}
                      </Link>
                    )}

                    {effectiveRole === 'representative' && (
                      <Link
                        to="/admin/tasks"
                        onClick={() => setIsMobileDropdownOpen(false)}
                        className="block px-4 py-2 text-sm text-slate-800 hover:bg-slate-50 hover:text-primary transition-colors font-semibold"
                      >
                        📋 {t('nav.representativeTasks', 'माझे कार्य / टास्क')}
                      </Link>
                    )}
                    <Link
                      to="/profile"
                      onClick={() => setIsMobileDropdownOpen(false)}
                      className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 hover:text-primary transition-colors font-medium"
                    >
                      {t('nav.myProfile', 'My Profile')}
                    </Link>
                    {canAccessDashboard && (
                      <Link
                        to="/admin/dashboard"
                        onClick={() => setIsMobileDropdownOpen(false)}
                        className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 hover:text-primary transition-colors font-medium flex items-center gap-2"
                      >
                        <LayoutDashboard className="w-4 h-4 text-slate-500" />
                        <span>{t('nav.adminDashboard', 'ॲडमिन डॅशबोर्ड')}</span>
                      </Link>
                    )}
                    <div className="border-t border-slate-100 my-1"></div>
                    <button
                      onClick={() => {
                        setIsMobileDropdownOpen(false);
                        handleLogout();
                      }}
                      className="w-full text-left block px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors font-medium cursor-pointer"
                    >
                      {t('nav.signOut', 'Logout')}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link
                to="/login"
                className="w-8 h-8 rounded-full border border-slate-900 bg-slate-50 flex items-center justify-center text-slate-900 cursor-pointer overflow-hidden transition-all hover:bg-slate-100"
              >
                <svg className="w-5 h-5 text-slate-800" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* ── MOBILE Drawer ── */}
      <div
        className={`md:hidden absolute top-16 left-0 w-full bg-white border-b border-slate-200 shadow-xl z-50 overflow-hidden transition-all duration-300 ${isOpen ? 'max-h-screen opacity-100' : 'max-h-0 opacity-0'
          }`}
      >
        <div className="px-5 py-6 flex flex-col gap-5">

          {/* Nav Links */}
          <nav className="flex flex-col gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                to={link.path}
                onClick={() => setIsOpen(false)}
                className={`px-3 py-2.5 text-sm font-bold transition-colors ${isActive(link.path)
                  ? 'text-primary'
                  : 'text-slate-900 hover:text-primary'
                  }`}
              >
                {link.name}
              </Link>
            ))}

            {/* Saved Properties Drawer Link */}
            <Link
              to="/properties?filter=saved"
              onClick={() => setIsOpen(false)}
              className={`px-3 py-2.5 text-sm font-semibold transition-colors flex items-center gap-2 ${isActive('/properties?filter=saved')
                ? 'text-primary'
                : 'text-slate-900 hover:text-primary'
                }`}
            >
              <Heart className="w-4 h-4 text-current" />
              <span>{t('nav.savedProperties', 'Saved Properties')}</span>
              {savedCount > 0 && (
                <span className="ml-1 bg-primary/10 text-primary text-xs font-bold px-2 py-0.5 rounded-full">
                  {savedCount}
                </span>
              )}
            </Link>
          </nav>

          {/* CTA Buttons - Only when user is logged in */}
          {user && (
            <>
              <hr className="border-slate-100" />
              <div className="flex flex-col gap-2">
                  {effectiveRole === 'seller' && (
                    <Link to="/seller/dashboard" onClick={() => setIsOpen(false)}>
                      <Button variant="outline" className="w-full py-2.5 rounded-xl text-sm font-bold text-orange-600 border-orange-200 bg-orange-50/50 hover:bg-orange-100 text-left justify-start px-4">
                        🏠 &nbsp; {isMarathi ? 'विक्रेता डॅशबोर्ड (Seller Dashboard)' : 'Seller Dashboard'}
                      </Button>
                    </Link>
                  )}
                  {effectiveRole === 'buyer' && (
                    <Link to="/buyer/dashboard" onClick={() => setIsOpen(false)}>
                      <Button variant="outline" className="w-full py-2.5 rounded-xl text-sm font-bold text-blue-600 border-blue-200 bg-blue-50/50 hover:bg-blue-100 text-left justify-start px-4">
                        🔍 &nbsp; {isMarathi ? 'खरेदीदार डॅशबोर्ड (Buyer Dashboard)' : 'Buyer Dashboard'}
                      </Button>
                    </Link>
                  )}
                  {effectiveRole === 'agent' && (
                    <Link to="/agent/dashboard" onClick={() => setIsOpen(false)}>
                      <Button variant="outline" className="w-full py-2.5 rounded-xl text-sm font-bold text-amber-600 border-amber-200 bg-amber-50/50 hover:bg-amber-100 text-left justify-start px-4">
                        💼 &nbsp; {isMarathi ? 'एजंट डॅशबोर्ड (Agent Dashboard)' : 'Agent Dashboard'}
                      </Button>
                    </Link>
                  )}
                  {effectiveRole === 'builder' && (
                    <Link to="/builder/dashboard" onClick={() => setIsOpen(false)}>
                      <Button variant="outline" className="w-full py-2.5 rounded-xl text-sm font-bold text-purple-600 border-purple-200 bg-purple-50/50 hover:bg-purple-100 text-left justify-start px-4">
                        🏢 &nbsp; {isMarathi ? 'बिल्डर डॅशबोर्ड (Builder Dashboard)' : 'Builder Dashboard'}
                      </Button>
                    </Link>
                  )}
                  {effectiveRole === 'supplier' && (
                    <Link to="/supplier/dashboard" onClick={() => setIsOpen(false)}>
                      <Button variant="outline" className="w-full py-2.5 rounded-xl text-sm font-bold text-orange-600 border-orange-200 bg-orange-50/50 hover:bg-orange-100 text-left justify-start px-4">
                        🛠️ &nbsp; {isMarathi ? 'सप्लायर डॅशबोर्ड (Supplier Dashboard)' : 'Supplier Dashboard'}
                      </Button>
                    </Link>
                  )}
                  {effectiveRole === 'user' && (
                    <Link to="/role-inquiry" onClick={() => setIsOpen(false)}>
                      <Button variant="outline" className="w-full py-2.5 rounded-xl text-sm font-bold text-primary border-primary/20 bg-primary/5 hover:bg-primary/10 text-left justify-start px-4">
                        ✨ &nbsp; {isMarathi ? 'भूमिका निवडा (विक्रेता / एजंट)' : 'Upgrade Role'}
                      </Button>
                    </Link>
                  )}
                  {effectiveRole === 'representative' && (
                    <Link to="/admin/tasks" onClick={() => setIsOpen(false)}>
                      <Button variant="outline" className="w-full py-2.5 rounded-xl text-sm font-semibold text-slate-800 border-slate-200 hover:bg-slate-50 text-left justify-start px-4">
                        📋 &nbsp; {t('nav.representativeTasks', 'माझे कार्य / टास्क')}
                      </Button>
                    </Link>
                  )}
                  <Link to="/profile" onClick={() => setIsOpen(false)}>
                    <Button variant="outline" className="w-full py-2.5 rounded-xl text-sm font-semibold text-slate-700 border-slate-200 hover:bg-slate-50 text-left justify-start px-4">
                      👤 &nbsp; {t('nav.myProfile', 'My Profile')}
                    </Button>
                  </Link>
                  {canAccessDashboard && (
                    <Link to="/admin/dashboard" onClick={() => setIsOpen(false)}>
                      <Button variant="outline" className="w-full py-2.5 rounded-xl text-sm font-semibold text-slate-700 border-slate-200 hover:bg-slate-50 text-left justify-start px-4">
                        ⚙️ &nbsp; {t('nav.adminDashboard', 'ॲडमिन डॅशबोर्ड')}
                      </Button>
                    </Link>
                  )}
                  <Button
                    variant="outline"
                    onClick={() => { handleLogout(); setIsOpen(false); }}
                    className="w-full py-2.5 rounded-xl text-sm font-semibold text-red-500 border-red-200 hover:bg-red-50 justify-start px-4"
                  >
                    <LogOut className="w-4 h-4 mr-1.5" />
                    {t('nav.signOut', 'Logout')}
                  </Button>
                </div>
            </>
          )}

          {!user && (
            <>
              <hr className="border-slate-100" />
              <Link to="/login" onClick={() => setIsOpen(false)}>
                <Button variant="primary" className="w-full py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2">
                  <User className="w-4 h-4" />
                  <span>{isMarathi ? 'लॉगिन' : 'Login'}</span>
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
};
