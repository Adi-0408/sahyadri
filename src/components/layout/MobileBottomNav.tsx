import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Home,
  Clapperboard,
  Search,
  Key,
  PlusCircle
} from 'lucide-react';

export const MobileBottomNav: React.FC = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();

  // Don't show bottom nav inside admin panel or login/register pages
  if (
    location.pathname.startsWith('/admin') ||
    location.pathname === '/login' ||
    location.pathname === '/register'
  ) {
    return null;
  }

  const handleOpenShots = () => {
    if (location.pathname !== '/') {
      navigate('/#99-shots-section');
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('open_99_shots'));
      }, 300);
    } else {
      window.dispatchEvent(new CustomEvent('open_99_shots'));
    }
  };

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/' && !location.hash;
    return location.pathname + location.search === path;
  };

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/90 shadow-[0_-4px_25px_rgba(0,0,0,0.08)] py-1.5 px-2 flex justify-around items-center select-none">
      {/* 1. Home */}
      <button
        type="button"
        onClick={() => {
          navigate('/');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        className={`flex-1 flex flex-col items-center justify-center py-1 transition-colors ${
          isActive('/') ? 'text-primary font-black' : 'text-slate-500 hover:text-slate-800'
        }`}
      >
        <Home className="w-5 h-5 mb-0.5" />
        <span className="text-[10px] font-bold tracking-tight">{t('bottomNav.home', 'होम')}</span>
      </button>

      {/* 2. 99. Shots (Reels) */}
      <button
        type="button"
        onClick={handleOpenShots}
        className="flex-1 flex flex-col items-center justify-center py-1 text-slate-700 hover:text-red-600 transition-colors relative group"
      >
        <div className="relative">
          <Clapperboard className="w-5 h-5 text-red-600 mb-0.5" />
          <span className="absolute -top-1 -right-2 px-1 py-0.2 rounded-full bg-red-600 text-white text-[7px] font-black tracking-tighter uppercase animate-pulse">
            LIVE
          </span>
        </div>
        <span className="text-[10px] font-extrabold text-red-600 tracking-tight">{t('bottomNav.shots', '99. शॉट्स')}</span>
      </button>

      {/* 3. Post Property (Center Highlight CTA) */}
      <button
        type="button"
        onClick={() => navigate('/post-property')}
        className="flex-1 flex flex-col items-center justify-center py-1 transition-colors text-slate-700 hover:text-primary"
      >
        <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-primary to-orange-500 text-white flex items-center justify-center shadow-md shadow-orange-500/30 mb-0.5">
          <PlusCircle className="w-4 h-4" />
        </div>
        <span className="text-[9px] font-black text-slate-800 tracking-tight uppercase">{t('bottomNav.sellRent', 'विक्री/भाडे')}</span>
      </button>

      {/* 4. Buy */}
      <button
        type="button"
        onClick={() => navigate('/properties?type=sale')}
        className={`flex-1 flex flex-col items-center justify-center py-1 transition-colors ${
          isActive('/properties?type=sale') ? 'text-primary font-black' : 'text-slate-500 hover:text-slate-800'
        }`}
      >
        <Search className="w-5 h-5 mb-0.5" />
        <span className="text-[10px] font-bold tracking-tight">{t('bottomNav.buy', 'खरेदी')}</span>
      </button>

      {/* 5. Rent */}
      <button
        type="button"
        onClick={() => navigate('/properties?type=rent')}
        className={`flex-1 flex flex-col items-center justify-center py-1 transition-colors ${
          isActive('/properties?type=rent') ? 'text-primary font-black' : 'text-slate-500 hover:text-slate-800'
        }`}
      >
        <Key className="w-5 h-5 mb-0.5" />
        <span className="text-[10px] font-bold tracking-tight">{t('bottomNav.rent', 'भाड्याने')}</span>
      </button>
    </nav>
  );
};
