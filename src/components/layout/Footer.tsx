import React from 'react';
import { Link } from 'react-router-dom';
import { Mail, Phone, MapPin, Shield, Download, ExternalLink } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const PLAY_STORE_URL = "https://play.google.com/store/apps/details?id=com.spark.sahyadrilanddeveloper";

export const Footer: React.FC = () => {
  const { i18n } = useTranslation();
  const isMr = Boolean(i18n.language?.startsWith('mr'));

  return (
    <footer className="bg-slate-950 text-slate-300 border-t border-slate-900 py-12 px-4 sm:px-6 md:px-12 transition-all">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 sm:gap-10">

        {/* Branding Column */}
        <div className="flex flex-col gap-4 text-left">
          <Link to="/" className="flex items-center gap-3 select-none">
            <img
              src="/sahyadri-logo.png"
              alt="Sahyadri Lands"
              className="h-11 w-auto object-contain shrink-0"
            />
            <span className="text-xl font-bold text-white tracking-tight">
              Sahyadri Lands
            </span>
          </Link>
          <p className="text-sm text-slate-400 leading-relaxed max-w-sm">
            {isMr
              ? 'पश्चिम महाराष्ट्रातील विश्वासार्ह जमीन विकासक. १००% निर्वेध ७/१२, कलेक्टर व रेरा मंजूर एन.ए. प्लॉट्स, फार्महाऊस आणि कमर्शियल प्रकल्पांची खात्रीशीर उपलब्धता.'
              : 'Maharashtra’s trusted land development partner. Specializing in verified 7/12 RERA Collector NA plots, fertile agro-parcels, and turnkey infrastructure.'}
          </p>

          <div className="pt-1">
            <a
              href={PLAY_STORE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-850 border border-slate-800 text-emerald-400 text-xs font-bold transition-all hover:border-emerald-500/40"
            >
              <Download className="w-4 h-4 shrink-0" />
              <span>{isMr ? 'गुगल प्ले वरून ॲप मिळवा' : 'Download Android App'}</span>
              <ExternalLink className="w-3 h-3 text-slate-500 shrink-0" />
            </a>
          </div>
        </div>

        {/* Quick Links */}
        <div className="flex flex-col gap-3 text-left">
          <h4 className="text-xs uppercase tracking-widest text-[#b81414] font-bold mb-1">
            {isMr ? 'प्रकल्प विभाग' : 'Project Sections'}
          </h4>
          <a href="/#overview" className="text-sm hover:text-white transition-colors">{isMr ? 'प्रकल्प विहंगावलोकन' : 'Project Overview'}</a>
          <a href="/#developments" className="text-sm hover:text-white transition-colors">{isMr ? 'प्लॉट्स व सेवा' : 'Our Developments'}</a>
          <a href="/#amenities" className="text-sm hover:text-white transition-colors">{isMr ? 'पायाभूत सुविधा' : 'Amenities'}</a>
          <a href="/#app" className="text-sm hover:text-white transition-colors">{isMr ? 'मोबाईल ॲप' : 'Official Android App'}</a>
          <a href="/#process" className="text-sm hover:text-white transition-colors">{isMr ? '४ पायऱ्यांची पद्धत' : '4-Step Process'}</a>
          <a href="/#faq" className="text-sm hover:text-white transition-colors">{isMr ? 'नेहमीचे प्रश्न' : 'FAQ'}</a>
          <a href="/#contact" className="text-sm hover:text-white transition-colors">{isMr ? 'थेट संपर्क' : 'Contact Advisory'}</a>
        </div>

        {/* Trust & Transparency */}
        <div className="flex flex-col gap-3 text-left">
          <h4 className="text-xs uppercase tracking-widest text-emerald-400 font-bold mb-1">
            {isMr ? 'कायदेशीर पारदर्शकता' : 'Legal Transparency'}
          </h4>
          <div className="text-sm text-slate-400 space-y-2">
            <p>✓ {isMr ? '३० वर्षांचा सर्च रिपोर्ट' : '30-Year Title Search Reports'}</p>
            <p>✓ {isMr ? 'कलेक्टर व रेरा संमत लेआऊट' : 'Collector & RERA Sanctioned'}</p>
            <p>✓ {isMr ? 'थेट डेव्हलपरकडून व्यवहार' : 'Zero Middleman Commission'}</p>
            <p>✓ {isMr ? 'स्वतंत्र ७/१२ पी.आर. कार्ड' : 'Individual 7/12 & PR Cards'}</p>
          </div>
        </div>

        {/* Contact Details */}
        <div className="flex flex-col gap-3 text-left">
          <h4 className="text-xs uppercase tracking-widest text-emerald-400 font-bold mb-1">
            {isMr ? 'कार्यालय संपर्क' : 'Project Office'}
          </h4>
          <div className="flex items-center gap-2.5 text-sm">
            <Mail className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="truncate">contact@astitvarealestate.com</span>
          </div>
          <div className="flex items-start gap-2.5 text-sm">
            <Phone className="w-4 h-4 text-emerald-400 mt-1 shrink-0" />
            <div className="flex flex-col">
              <a href="tel:8328712712" className="hover:text-emerald-400 transition-colors">8328-712-712</a>
              <a href="tel:7788993712" className="hover:text-emerald-400 transition-colors">778899-3-712</a>
            </div>
          </div>
          <div className="flex items-start gap-2.5 text-sm leading-relaxed">
            <MapPin className="w-4 h-4 text-emerald-400 mt-1 shrink-0" />
            <span>Sahyadri Lands, Satara / Karad Belt, Maharashtra, India.</span>
          </div>
        </div>

      </div>

      {/* Bottom Bar with Admin Access Trigger */}
      <div className="max-w-7xl mx-auto border-t border-slate-900 mt-10 pt-6 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-slate-500">
        <p>© {new Date().getFullYear()} Sahyadri Lands. All Rights Reserved.</p>
        
        <div className="flex items-center gap-6">
          {/* Admin Panel Direct Link (navigates directly to /admin/login page) */}
          <Link
            to="/admin/login"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-emerald-500/40 text-slate-400 hover:text-emerald-400 transition-all cursor-pointer select-none"
            title="Administrator Login"
          >
            <Shield className="w-3.5 h-3.5 text-emerald-400" />
            <span className="font-semibold">{isMr ? 'ॲडमिन प्रवेश' : 'Admin Access'}</span>
          </Link>
        </div>
      </div>
    </footer>
  );
};
