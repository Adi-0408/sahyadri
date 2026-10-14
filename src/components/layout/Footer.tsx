import React from 'react';
import { Link } from 'react-router-dom';
import { Mail, Phone, MapPin } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export const Footer: React.FC = () => {
  const { t } = useTranslation();

  return (
    <footer className="bg-slate-950 text-slate-300 border-t border-slate-900 py-6 sm:py-16 px-4 sm:px-6 md:px-12 transition-all">
      <div className="max-w-7xl mx-auto grid grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-10">

        {/* Branding Column */}
        <div className="flex flex-col gap-4 text-left col-span-2 lg:col-span-1">
          <Link to="/" className="flex items-center gap-3 select-none">
            <img
              src="/sahyadri-logo.png"
              alt="Sahyadri Land Developer"
              className="h-11 w-auto object-contain shrink-0"
            />
            <span className="text-xl font-bold text-white tracking-tight">
              Sahyadri Land Developer
            </span>
          </Link>
          <p className="text-sm text-slate-400 leading-relaxed max-w-xs">
            {t('footer.about')}
          </p>
          <div className="flex gap-4 mt-2">
            <a href="https://instagram.com" aria-label="Instagram" className="hover:text-white text-slate-400 transition-colors">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
              </svg>
            </a>
            <a href="https://facebook.com" aria-label="Facebook" className="hover:text-white text-slate-400 transition-colors">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path>
              </svg>
            </a>
            <a href="https://twitter.com" aria-label="Twitter" className="hover:text-white text-slate-400 transition-colors">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z"></path>
              </svg>
            </a>
          </div>
        </div>

        {/* Quick Links */}
        <div className="flex flex-col gap-3 text-left col-span-1">
          <h4 className="text-xs uppercase tracking-widest text-white font-bold mb-1">{t('footer.navigation')}</h4>
          <Link to="/" className="text-sm hover:text-white transition-colors">{t('footer.home')}</Link>
          <Link to="/projects" className="text-sm hover:text-white transition-colors">{t('footer.projects')}</Link>
        </div>

        {/* Company Info */}
        <div className="flex flex-col gap-3 text-left col-span-1">
          <h4 className="text-xs uppercase tracking-widest text-white font-bold mb-1">{t('footer.company')}</h4>
          <Link to="/contact" className="text-sm hover:text-white transition-colors">{t('footer.getInTouch')}</Link>
          <Link to="/post-property" className="text-sm hover:text-white transition-colors">{t('footer.submitProperty')}</Link>
        </div>

        {/* Contact Details */}
        <div className="flex flex-col gap-3 text-left col-span-2 lg:col-span-1">
          <h4 className="text-xs uppercase tracking-widest text-white font-bold mb-1">{t('footer.contactUs')}</h4>
          <div className="flex items-center gap-2.5 text-sm">
            <Mail className="w-4 h-4 text-primary" />
            <span>contact@astitvarealestate.com</span>
          </div>
          <div className="flex items-start gap-2.5 text-sm">
            <Phone className="w-4 h-4 text-primary mt-1" />
            <div className="flex flex-col">
              <span>8328-712-712</span>
              <span>778899-3-712</span>
            </div>
          </div>
          <div className="flex items-start gap-2.5 text-sm leading-relaxed">
            <MapPin className="w-4 h-4 text-primary mt-0.5" />
            <span>{t('footer.addressLine1')}<br />{t('footer.addressLine2')}<br />{t('footer.addressLine3')}</span>
          </div>
        </div>

      </div>

      <div className="max-w-7xl mx-auto border-t border-slate-800 mt-6 pt-6 sm:mt-12 sm:pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-slate-500">
        <p>{t('footer.rights')}</p>
        <div className="flex flex-wrap items-center gap-6">
          <a href="#" className="hover:text-white transition-colors">{t('footer.privacyPolicy')}</a>
          <a href="#" className="hover:text-white transition-colors">{t('footer.termsOfService')}</a>
        </div>
      </div>
    </footer>
  );
};
