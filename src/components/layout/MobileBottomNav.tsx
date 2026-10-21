import React from 'react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Home,
  Layers,
  Download,
  PhoneCall
} from 'lucide-react';

const PLAY_STORE_URL = "https://play.google.com/store/apps/details?id=com.spark.sahyadrilanddeveloper";

export const MobileBottomNav: React.FC = () => {
  const { i18n } = useTranslation();
  const isMr = Boolean(i18n.language?.startsWith('mr'));
  const location = useLocation();

  if (location.pathname.startsWith('/admin')) {
    return null;
  }

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <nav
      data-mobile-bottom-nav
      className="mobile-bottom-nav md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] py-2 px-3 flex justify-around items-center select-none"
    >
      
      {/* 1. Overview */}
      <button
        type="button"
        onClick={() => scrollTo('overview')}
        className="flex-1 flex flex-col items-center justify-center py-0.5 text-slate-600 hover:text-[#b81414] transition-colors"
      >
        <Home className="w-5 h-5 mb-0.5 text-slate-800" />
        <span className="text-[10px] font-bold tracking-tight">{isMr ? 'मुख्य' : 'Overview'}</span>
      </button>

      {/* 2. Developments */}
      <button
        type="button"
        onClick={() => scrollTo('developments')}
        className="flex-1 flex flex-col items-center justify-center py-0.5 text-slate-600 hover:text-[#b81414] transition-colors"
      >
        <Layers className="w-5 h-5 mb-0.5 text-slate-800" />
        <span className="text-[10px] font-bold tracking-tight">{isMr ? 'प्रकल्प' : 'Projects'}</span>
      </button>

      {/* 3. Download App */}
      <a
        href={PLAY_STORE_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="flex-1 flex flex-col items-center justify-center py-0.5 text-slate-900 group"
      >
        <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-600 flex items-center justify-center shadow-md shadow-emerald-600/30 mb-0.5 transform group-hover:scale-105 transition-transform">
          <Download className="w-4 h-4 text-white" />
        </div>
        <span className="text-[9px] font-black text-emerald-700 tracking-tight uppercase">{isMr ? 'ॲप मिळवा' : 'Get App'}</span>
      </a>

      {/* 4. Call / Contact */}
      <a
        href="tel:8328712712"
        className="flex-1 flex flex-col items-center justify-center py-0.5 text-slate-600 hover:text-[#b81414] transition-colors"
      >
        <PhoneCall className="w-5 h-5 mb-0.5 text-slate-800" />
        <span className="text-[10px] font-bold tracking-tight">{isMr ? 'कॉल करा' : 'Call'}</span>
      </a>

    </nav>
  );
};
