import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

interface LanguageSwitcherProps {
  mini?: boolean;
}

export const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({ mini = false }) => {
  const { i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const currentLanguage = i18n.language || 'mr';
  const isMr = Boolean(currentLanguage?.startsWith('mr'));

  const toggleLanguage = (lang: string) => {
    if (i18n.language === lang) {
      setIsOpen(false);
      return;
    }
    setIsOpen(false);
    React.startTransition(() => {
      i18n.changeLanguage(lang);
      try {
        localStorage.setItem('i18nextLng', lang);
      } catch {}
      if (typeof document !== 'undefined') {
        document.documentElement.lang = lang;
      }
    });
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative inline-block text-left" ref={containerRef}>
      {mini ? (
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="p-1 text-slate-800 hover:text-slate-900 cursor-pointer flex items-center justify-center transition-colors select-none"
          title="Toggle Language"
        >
          <span className="text-xl font-bold font-sans tracking-tight leading-none select-none">文A</span>
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300 rounded-xl text-xs font-bold text-slate-800 transition-colors cursor-pointer select-none"
        >
          <span className="text-sm font-semibold">文A</span>
          <span className="font-sans font-extrabold text-xs">{isMr ? 'मराठी' : 'English'}</span>
          <svg className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      )}

      {isOpen && (
        <div className="absolute right-0 mt-2 w-36 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 overflow-hidden py-1.5 animate-fadeIn origin-top-right">
          {/* Marathi */}
          <button
            type="button"
            onClick={() => { toggleLanguage('mr'); setIsOpen(false); }}
            className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-sm font-semibold transition-colors cursor-pointer text-left select-none ${
              isMr ? 'text-[#c2410c] bg-orange-50/20' : 'text-slate-700 hover:bg-slate-50'
            }`}
          >
            <div className="w-4 flex items-center justify-center flex-shrink-0">
              {isMr && (
                <svg className="w-4 h-4 text-[#f97316]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>
            <span className="font-sans">मराठी</span>
          </button>

          {/* English */}
          <button
            type="button"
            onClick={() => { toggleLanguage('en'); setIsOpen(false); }}
            className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-sm font-semibold transition-colors cursor-pointer text-left select-none ${
              !isMr ? 'text-[#c2410c] bg-orange-50/20' : 'text-slate-700 hover:bg-slate-50'
            }`}
          >
            <div className="w-4 flex items-center justify-center flex-shrink-0">
              {!isMr && (
                <svg className="w-4 h-4 text-[#f97316]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>
            <span className="font-sans">English</span>
          </button>
        </div>
      )}
    </div>
  );
};
