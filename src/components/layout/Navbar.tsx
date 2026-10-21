import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Download, ExternalLink } from 'lucide-react';
import { LanguageSwitcher } from '../ui/LanguageSwitcher';
import { useTranslation } from 'react-i18next';

const PLAY_STORE_URL = "https://play.google.com/store/apps/details?id=com.spark.sahyadrilanddeveloper";

export const Navbar: React.FC = () => {
  const { i18n } = useTranslation();
  const isMr = Boolean(i18n.language?.startsWith('mr'));
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [activeSection, setActiveSection] = useState('overview');
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 12);
      
      const sections = ['overview', 'developments', 'amenities', 'app', 'process', 'faq', 'contact'];
      const scrollPos = window.scrollY + 140;
      
      for (let i = sections.length - 1; i >= 0; i--) {
        const el = document.getElementById(sections[i]);
        if (el && el.offsetTop <= scrollPos) {
          setActiveSection(sections[i]);
          break;
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { id: 'overview', name: isMr ? 'माहिती' : 'Overview', href: '#overview' },
    { id: 'developments', name: isMr ? 'प्रकल्प' : 'Projects', href: '#developments' },
    { id: 'amenities', name: isMr ? 'सुविधा' : 'Amenities', href: '#amenities' },
    { id: 'app', name: isMr ? 'ॲप' : 'App', href: '#app' },
    { id: 'process', name: isMr ? 'प्रक्रिया' : 'Process', href: '#process' },
    { id: 'faq', name: isMr ? 'प्रश्नोत्तरे' : 'FAQ', href: '#faq' },
    { id: 'contact', name: isMr ? 'संपर्क' : 'Contact', href: '#contact' },
  ];

  const handleScrollTo = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    if (location.pathname === '/') {
      e.preventDefault();
      const targetId = href.replace('#', '');
      const el = document.getElementById(targetId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
        setActiveSection(targetId);
      }
      setIsOpen(false);
    }
  };

  return (
    <header
      className={`fixed top-0 w-full z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-white/95 backdrop-blur-md shadow-sm border-b border-slate-200'
          : 'bg-white/90 backdrop-blur-sm border-b border-slate-200/70'
      }`}
      style={{ height: '68px' }}
    >
      <div className="h-full max-w-7xl mx-auto px-3 sm:px-5 lg:px-8 flex items-center justify-between gap-2 lg:gap-4">

        {/* ── LEFT: Brand Logo & Title ── */}
        <Link to="/" className="flex items-center gap-2 lg:gap-2.5 shrink-0 select-none group">
          <img
            src="/sahyadri-emblem.png"
            alt="Sahyadri Land Developer"
            className="h-8 sm:h-9 lg:h-10 w-auto object-contain transition-transform duration-300 group-hover:scale-105"
          />
          {isMr ? (
            <div className="flex items-baseline whitespace-nowrap">
              <span
                className="text-lg sm:text-xl lg:text-2xl font-bold tracking-tight text-[#b81414] group-hover:text-[#991b1b] transition-colors"
                style={{ fontFamily: '"Rozha One", "Amita", "Yatra One", "Kalam", serif', lineHeight: 1 }}
              >
                सह्याद्री
              </span>
              <span
                className="text-xs sm:text-sm font-bold text-slate-800 ml-1 sm:ml-1.5 tracking-wide"
                style={{ fontFamily: '"Anek Marathi", sans-serif' }}
              >
                लँड डेव्हलपर
              </span>
            </div>
          ) : (
            <div className="flex flex-col text-left leading-none">
              <span
                className="text-sm sm:text-base lg:text-lg font-black tracking-wider text-slate-950 font-serif"
              >
                SAHYADRI
              </span>
              <span
                className="text-[8px] sm:text-[9px] lg:text-[10px] font-bold uppercase tracking-[0.2em] text-[#b81414] mt-0.5"
              >
                LAND DEVELOPER
              </span>
            </div>
          )}
        </Link>

        {/* ── CENTER: Section Anchor Nav Links (Desktop md and above) ── */}
        <nav className="hidden md:flex items-center gap-0.5 lg:gap-1.5 xl:gap-2.5">
          {navLinks.map((link) => {
            const isActive = activeSection === link.id;
            return (
              <a
                key={link.id}
                href={`/${link.href}`}
                onClick={(e) => handleScrollTo(e, link.href)}
                className={`px-2 lg:px-2.5 xl:px-3 py-1.5 text-xs lg:text-[13px] xl:text-[14px] font-bold rounded-lg transition-all whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'text-[#b81414] bg-red-50/80 shadow-xs'
                    : 'text-slate-700 hover:text-[#b81414] hover:bg-slate-100/70'
                }`}
              >
                {link.name}
              </a>
            );
          })}
        </nav>

        {/* ── RIGHT: App Download CTA + Language Switcher (NO ADMIN ACCESS) ── */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          
          {/* Download App Button */}
          <a
            href={PLAY_STORE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:inline-flex items-center gap-1.5 px-2.5 lg:px-3.5 py-1.5 lg:py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-xs hover:shadow-md transition-all transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer select-none"
            title="Download Official Android App from Google Play"
          >
            <Download className="w-3.5 h-3.5 text-white shrink-0" />
            <span className="whitespace-nowrap">{isMr ? 'ॲप मिळवा' : 'Download App'}</span>
            <ExternalLink className="w-3 h-3 text-white/80 shrink-0 hidden lg:inline" />
          </a>

          {/* Language Switcher */}
          <LanguageSwitcher />

          {/* Mobile Hamburger Button */}
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden p-2 text-slate-700 hover:text-slate-900 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-colors cursor-pointer"
            aria-label="Toggle Menu"
          >
            {isOpen ? (
              <svg className="w-5 h-5 text-slate-800" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-5 h-5 text-slate-800" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>

        </div>

      </div>

      {/* ── MOBILE Menu Drawer ── */}
      <div
        className={`md:hidden absolute top-[68px] left-0 w-full bg-white border-b border-slate-200 shadow-xl overflow-hidden transition-all duration-300 ${
          isOpen ? 'max-h-[480px] opacity-100 py-4' : 'max-h-0 opacity-0 py-0'
        }`}
      >
        <div className="px-5 flex flex-col gap-2.5">
          <nav className="flex flex-col gap-1">
            {navLinks.map((link) => (
              <a
                key={link.id}
                href={`/${link.href}`}
                onClick={(e) => handleScrollTo(e, link.href)}
                className={`px-3 py-2 text-sm font-bold rounded-xl transition-colors cursor-pointer flex items-center justify-between ${
                  activeSection === link.id
                    ? 'text-[#b81414] bg-red-50'
                    : 'text-slate-800 hover:text-[#b81414] hover:bg-slate-50'
                }`}
              >
                <span>{link.name}</span>
                {activeSection === link.id && (
                  <span className="w-2 h-2 rounded-full bg-[#b81414]" />
                )}
              </a>
            ))}
          </nav>

          <hr className="border-slate-100 my-1" />

          {/* Mobile App Download Button */}
          <a
            href={PLAY_STORE_URL}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setIsOpen(false)}
            className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold text-sm shadow-md"
          >
            <Download className="w-4 h-4 text-white" />
            <span>{isMr ? 'गुगल प्ले वरून ॲप मिळवा' : 'Download Android App'}</span>
            <ExternalLink className="w-3.5 h-3.5 text-white/80" />
          </a>
        </div>
      </div>
    </header>
  );
};
