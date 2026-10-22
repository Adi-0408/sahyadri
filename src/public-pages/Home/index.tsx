import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import {
  CheckCircle2,
  MapPin,
  Phone,
  MessageCircle,
  ExternalLink,
  Download,
  Building2,
  Trees,
  Truck,
  FileCheck2,
  Compass,
  FileText,
  BadgeCheck,
  Clock,
  Sparkles,
  Layers,
  ChevronDown,
  Droplets,
  Zap,
  Fence,
  TreePine,
  SunMedium,
  HelpCircle,
  Ruler,
  Landmark,
  Building,
  ArrowRight,
  BedDouble,
  Bath
} from 'lucide-react';
import { WaveDivider } from '../../components/ui/WaveDivider';
import { subscribeToCollection, getCachedCollection } from '../../services/firebase';
import {
  syncApprovedRoleInquiriesWithProperties,
  subscribeToRoleInquiries,
  synthesizePropertyFromInquiry
} from '../../services/roleInquiry';

const PLAY_STORE_URL = "https://play.google.com/store/apps/details?id=com.spark.sahyadrilanddeveloper";

export const Home: React.FC = () => {
  const { i18n } = useTranslation();
  const isMr = Boolean(i18n.language?.startsWith('mr'));

  // FAQ accordion active state
  const [activeFaq, setActiveFaq] = useState<number | null>(0);

  const toggleFaq = (index: number) => {
    setActiveFaq(activeFaq === index ? null : index);
  };

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Real-time approved properties state
  const [properties, setProperties] = useState<any[]>(() => {
    if (typeof window !== 'undefined') {
      const cached = getCachedCollection('properties');
      if (Array.isArray(cached) && cached.length > 0) {
        return cached
          .filter((p: any) =>
            p &&
            (p.isSoldOut === true ||
              p.status === 'sold' ||
              p.status === 'approved' ||
              p.status === 'active' ||
              (p.adminApproved === true && p.isActive !== false))
          )
          .sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      }
    }
    return [];
  });

  const [propCategoryFilter, setPropCategoryFilter] = useState<'All' | 'Plot' | 'Flat' | 'House' | 'Land' | 'Bungalow'>('All');
  const [propTypeFilter, setPropTypeFilter] = useState<'all' | 'sale' | 'rent'>('all');

  useEffect(() => {
    syncApprovedRoleInquiriesWithProperties().catch(() => {});

    // 1. Subscribe to properties collection from Firestore
    const unsubProps = subscribeToCollection('properties', (list) => {
      const live = (list || [])
        .filter((p: any) =>
          p &&
          (p.isSoldOut === true ||
            p.status === 'sold' ||
            p.status === 'approved' ||
            p.status === 'active' ||
            (p.adminApproved === true && p.isActive !== false))
        );

      setProperties((prev) => {
        const propMap = new Map();
        live.forEach((p) => propMap.set(p.id, p));
        prev.forEach((p) => {
          if ((p.source === 'approved_role_inquiry_sync' || p.source === 'user_role_sync') && !propMap.has(p.id)) {
            propMap.set(p.id, p);
          }
        });
        return Array.from(propMap.values()).sort(
          (a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
        );
      });
    });

    // 2. Real-time Role Inquiries listener:
    // Ensures ANY accepted role request immediately appears on the website without delay!
    const unsubInqs = subscribeToRoleInquiries((inqList) => {
      const approvedInqs = (inqList || []).filter(
        (i) => i && ((i.status as string) === 'approved' || (i.status as string) === 'accepted')
      );
      if (approvedInqs.length > 0) {
        setProperties((prev) => {
          const propMap = new Map();
          prev.forEach((p) => propMap.set(p.id, p));
          approvedInqs.forEach((inq) => {
            const hasProp = Array.from(propMap.values()).some(
              (p: any) =>
                p.roleInquiryId === inq.id ||
                p.id === inq.id ||
                p.id === `prop-inquiry-${inq.id}`
            );
            if (!hasProp) {
              const synthesized = synthesizePropertyFromInquiry(inq);
              if (synthesized) {
                propMap.set(synthesized.id, synthesized);
              }
            }
          });
          return Array.from(propMap.values()).sort(
            (a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
          );
        });
      }
    });

    return () => {
      if (typeof unsubProps === 'function') unsubProps();
      if (typeof unsubInqs === 'function') unsubInqs();
    };
  }, []);

  const filteredProperties = useMemo(() => {
    return properties.filter((p) => {
      if (propTypeFilter !== 'all') {
        const t = (p.type || 'sale').toLowerCase();
        if (t !== propTypeFilter) return false;
      }
      if (propCategoryFilter !== 'All') {
        const c = (p.category || '').toLowerCase();
        const f = propCategoryFilter.toLowerCase();
        if (f === 'plot' && c !== 'plot' && c !== 'land') return false;
        if (f === 'land' && c !== 'land' && c !== 'plot') return false;
        if (f === 'flat' && c !== 'flat' && c !== 'apartment') return false;
        if (f === 'house' && c !== 'house' && c !== 'villa' && c !== 'bungalow') return false;
        if (f === 'bungalow' && c !== 'bungalow' && c !== 'villa' && c !== 'house') return false;
      }
      return true;
    });
  }, [properties, propCategoryFilter, propTypeFilter]);

  const getFallbackImage = (cat?: string) => {
    const c = (cat || '').toLowerCase();
    if (c.includes('plot') || c.includes('land')) {
      return 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=800&q=80';
    }
    if (c.includes('flat') || c.includes('apartment')) {
      return 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=800&q=80';
    }
    if (c.includes('bungalow') || c.includes('villa')) {
      return 'https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=800&q=80';
    }
    return 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=800&q=80';
  };

  const formatPrice = (val?: number | string) => {
    if (val === undefined || val === null || val === '') return isMr ? 'किंमत विचारणा' : 'On Request';
    const num = typeof val === 'number' ? val : Number(String(val).replace(/[^0-9.]/g, ''));
    if (isNaN(num) || num <= 0) return isMr ? 'किंमत विचारणा' : 'On Request';
    if (num >= 10000000) {
      return `₹${(num / 10000000).toFixed(2).replace(/\.00$/, '')} Cr`;
    }
    if (num >= 100000) {
      return `₹${(num / 100000).toFixed(2).replace(/\.00$/, '')} Lakh`;
    }
    return `₹${num.toLocaleString('en-IN')}`;
  };

  const faqs = [
    {
      q: isMr ? 'प्लॉटचे टायटल १००% क्लिअर आणि निर्वेध आहे का?' : 'Is the land title 100% clear and legally verified?',
      a: isMr
        ? 'होय, सह्याद्री लँड डेव्हलपरच्या प्रत्येक प्रकल्पाचा नामांकित वकिलांमार्फत ३० वर्षांचा सर्च रिपोर्ट काढलेला असतो. मूळ ७/१२, फेरफार नोंदी आणि एन.ए. आदेश पूर्णपणे निर्वेध असतात.'
        : 'Yes, every project developed by Sahyadri Land Developer is backed by an exhaustive 30-year title search certificate by legal counsel. Revenue records, 7/12 extracts, and NA orders are 100% encumbrance-free.'
    },
    {
      q: isMr ? 'प्लॉट्सवर राष्ट्रीयीकृत बँकेचे कर्ज मिळते का?' : 'Are bank loans available on NA plots?',
      a: isMr
        ? 'होय, आमचे सर्व एन.ए. रेसिडेन्शियल लेआऊट्स रेरा व कलेक्टर संमत असल्यामुळे नामांकित राष्ट्रीयीकृत व खाजगी बँकांकडून ७०% ते ८०% पर्यंत कर्ज सुविधा उपलब्ध आहे.'
        : 'Yes, since our residential layouts are RERA & Collector approved with individual PR cards, leading nationalized and private banks readily approve up to 70%–80% housing plot loans.'
    },
    {
      q: isMr ? 'खरेदीनंतर माझ्या नावावर स्वतंत्र ७/१२ किती दिवसांत होतो?' : 'How long does mutation (Ferfar) to individual 7/12 take?',
      a: isMr
        ? 'दुय्यम निबंधक कार्यालयात अधिकृत खरेदीखत (Registry) झाल्यानंतर तात्काळ महसूल विभागाकडे फेरफारची नोंद केली जाते आणि साधारण १५ ते ३० दिवसांत स्वतंत्र ७/१२ आपल्या नावे मिळतो.'
        : 'Immediately upon registered sale deed execution at the Sub-Registrar office, the online mutation entry is triggered. Individual 7/12 and PR cards are officially updated in your name within 15 to 30 days.'
    },
    {
      q: isMr ? 'जागेवर प्रत्यक्ष कोणत्या सोयी-सुविधा उपलब्ध आहेत?' : 'What physical infrastructure is developed on-site?',
      a: isMr
        ? 'केवळ कागदावर नाही, तर प्रत्यक्ष जागेवर पक्के डांबरी/काँक्रीट रस्ते, स्वतंत्र पाणी लाईन, महावितरण वीज ट्रान्सफॉर्मर, स्ट्रीट लाईट, तारेचे कुंपण व प्रवेशद्वार तयार असते.'
        : 'We deliver complete on-ground development: internal asphalt tar roads, underground stormwater drains, borewell water pipelines, MSEB electric lines, security boundary fencing, and avenue tree plantation.'
    },
    {
      q: isMr ? 'शेतकरी नसलेली व्यक्ती शेतजमीन किंवा फार्महाऊस घेऊ शकते का?' : 'Can a non-farmer purchase agricultural or farmhouse land?',
      a: isMr
        ? 'रेसिडेन्शियल एन.ए. प्लॉट्स कोणीही थेट खरेदी करू शकते. फार्महाऊस किंवा शेतजमिनीसाठी आवश्यक शेतकरी प्रमाणपत्राबाबत आमची कायदेशीर टीम संपूर्ण कायदेशीर मार्गदर्शन करते.'
        : 'Anyone can purchase our Residential NA plots without any farmer status. For agricultural or farmhouse plots, our legal advisory team provides complete guidance on legal compliance under Maharashtra land revenue laws.'
    },
    {
      q: isMr ? 'प्लॉट्सचे लाइव्ह नकाशे व उपलब्ध जागा मोबाईल ॲपवर कशा पहाव्यात?' : 'How can I view live plots and layout maps on the mobile app?',
      a: isMr
        ? 'आमचे अधिकृत "Sahyadri Land Developer" ॲन्ड्रॉइड ॲप गुगल प्ले वरून डाउनलोड करा. तेथे सर्व उपलब्ध प्लॉट्सचे जीपीएस नकाशे, फोटो, दर व कागदपत्रे एका क्लिकवर उपलब्ध आहेत.'
        : 'Simply install our official "Sahyadri Land Developer" Android app from the Google Play Store. You can browse all active layouts, inspect GPS boundaries, view 7/12 records, and schedule site inspections directly.'
    }
  ];

  return (
    <div className="w-full bg-slate-50 text-slate-900 font-sans selection:bg-[#b81414] selection:text-white">

      {/* ─────────────────────────────────────────────────────────────
          SECTION 1: CINEMATIC HERO VIDEO BANNER (#overview)
      ───────────────────────────────────────────────────────────── */}
      <section id="overview" className="relative w-full h-[65vh] sm:h-[75vh] lg:h-[82vh] min-h-[520px] max-h-[860px] bg-[#0b0f19] overflow-hidden flex flex-col justify-between items-center text-center">
        
        {/* Background Video */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.9, ease: 'easeOut' }}
          className="absolute inset-0 z-0 overflow-hidden block"
        >
          <video
            autoPlay
            loop
            muted
            playsInline
            poster="/hero-background.jpg"
            className="w-full h-full object-cover"
          >
            <source src="/videos/sahyadri-hero-video.mp4" type="video/mp4" />
          </video>
          <div className="absolute inset-0 bg-gradient-to-b from-black/35 via-black/20 to-[#0b0f19]/80 pointer-events-none" />
        </motion.div>

        {/* Ambient Back Glow */}
        <div className="relative z-10 w-full max-w-5xl mx-auto px-4 flex flex-col items-center justify-center my-auto pt-16 sm:pt-20">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: [0.25, 0.5, 0.25], scale: [0.95, 1.05, 0.95] }}
            transition={{
              duration: 5,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 0.5
            }}
            className="absolute w-72 sm:w-[30rem] h-52 sm:h-72 rounded-full bg-gradient-to-tr from-emerald-600/30 via-[#b81414]/25 to-amber-500/30 blur-3xl pointer-events-none"
          />

          {/* Centered Breathing Sahyadri Logo */}
          <motion.div
            initial={{ opacity: 0, scale: 0.88, y: 20 }}
            animate={{ 
              opacity: 1, 
              scale: 1, 
              y: [0, -6, 0] 
            }}
            transition={{ 
              opacity: { duration: 1, ease: 'easeOut' },
              scale: { duration: 1, ease: 'easeOut' },
              y: { 
                duration: 4.5, 
                repeat: Infinity, 
                ease: 'easeInOut', 
                delay: 1 
              }
            }}
            whileHover={{ scale: 1.04, transition: { duration: 0.3 } }}
            className="relative z-10 flex flex-col items-center text-center select-none cursor-pointer"
          >
            <img
              src="/sahyadri-logo.png"
              alt="Sahyadri Land Developer"
              className="h-36 sm:h-52 md:h-64 lg:h-72 w-auto object-contain drop-shadow-2xl"
            />
          </motion.div>

          {/* Action CTAs Over Video */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="mt-6 flex flex-wrap items-center justify-center gap-3.5"
          >
            <a
              href={PLAY_STORE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2.5 px-6 py-3 rounded-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs sm:text-sm shadow-xl shadow-emerald-900/50 transition-all transform hover:scale-105 active:scale-95 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>{isMr ? 'गुगल प्ले वरून ॲप मिळवा' : 'Download Android App'}</span>
              <ExternalLink className="w-3.5 h-3.5 text-white/80" />
            </a>

            <button
              type="button"
              onClick={() => scrollToSection('developments')}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-slate-950/80 hover:bg-slate-900 text-white border border-white/20 backdrop-blur-md text-xs sm:text-sm font-bold transition-all hover:scale-105 cursor-pointer"
            >
              <span>{isMr ? 'प्रकल्प माहिती पहा' : 'Explore Projects'}</span>
              <ChevronDown className="w-4 h-4 text-amber-400" />
            </button>
          </motion.div>
        </div>

        {/* Multi-layered Wave Divider to Section 2 (slate-50) */}
        <WaveDivider to="slate-50" variant="forward" />
      </section>


      {/* ─────────────────────────────────────────────────────────────
          SECTION 2: ABOUT THE PROJECT & CORE VALUES
      ───────────────────────────────────────────────────────────── */}
      <section className="relative bg-slate-50 pt-14 sm:pt-20 pb-0 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 pb-14 sm:pb-20">
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            
            <div className="lg:col-span-7 text-left space-y-5">
              <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#b81414] bg-red-50 px-3.5 py-1 rounded-full border border-red-200">
                <Sparkles className="w-3.5 h-3.5 text-[#b81414]" />
                <span>{isMr ? 'सह्याद्रीचा वारसा व विश्वास' : 'The Sahyadri Legacy'}</span>
              </div>

              <h2 className="text-2xl sm:text-4xl lg:text-5xl font-black text-slate-900 leading-tight">
                {isMr ? (
                  <>
                    पश्चिम महाराष्ट्रातील{' '}
                    <span className="text-[#b81414]">विश्वासार्ह</span> जमीन विकासक
                  </>
                ) : (
                  <>
                    Building Trust & Legal Security in{' '}
                    <span className="text-[#b81414]">Land Investments</span>
                  </>
                )}
              </h2>

              <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                {isMr
                  ? 'सह्याद्री लँड डेव्हलपर ही केवळ जमीन खरेदी-विक्री करणारी संस्था नसून, प्रत्येक ग्राहकाला निर्वेध मालकी हक्क आणि प्रत्यक्ष पायाभूत सुविधा देणारे अग्रगण्य नाव आहे. सातारा, सांगली, पुणे व पश्चिम महाराष्ट्रातील निसर्गरम्य ठिकाणी आम्ही पारदर्शकपणे भूखंड विकसित करतो.'
                  : 'Sahyadri Land Developer is dedicated to transforming real estate land ownership into a transparent, secure, and legally bulletproof journey. Operating across Satara, Sangli, Pune, and the Sahyadri belt, we develop clear-title, sanction-backed layouts with complete on-ground infrastructure.'}
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4">
                <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-xs hover:shadow-md transition-shadow text-center">
                  <div className="text-2xl sm:text-3xl font-extrabold text-[#b81414] font-serif">500+</div>
                  <div className="text-xs text-slate-500 mt-1 font-bold">{isMr ? 'समाधानी ग्राहक' : 'Plot Owners'}</div>
                </div>
                <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-xs hover:shadow-md transition-shadow text-center">
                  <div className="text-2xl sm:text-3xl font-extrabold text-emerald-700 font-serif">100%</div>
                  <div className="text-xs text-slate-500 mt-1 font-bold">{isMr ? 'क्लिअर टायटल' : 'Clear Titles'}</div>
                </div>
                <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-xs hover:shadow-md transition-shadow text-center">
                  <div className="text-2xl sm:text-3xl font-extrabold text-amber-600 font-serif">15+</div>
                  <div className="text-xs text-slate-500 mt-1 font-bold">{isMr ? 'पूर्ण प्रकल्प' : 'Layouts'}</div>
                </div>
                <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-xs hover:shadow-md transition-shadow text-center">
                  <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-serif">10+</div>
                  <div className="text-xs text-slate-500 mt-1 font-bold">{isMr ? 'वर्षे अनुभव' : 'Years Exp.'}</div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-5">
              <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-sm space-y-4 text-left">
                <h3 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-3">
                  {isMr ? 'सह्याद्रीची ४ प्रमुख तत्त्वे' : 'Our 4 Core Pillars'}
                </h3>
                
                <div className="space-y-3.5 text-xs sm:text-sm text-slate-700">
                  <div className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 font-bold">1</div>
                    <div>
                      <strong className="text-slate-900 block">{isMr ? '१००% कायदेशीर निर्वेधता' : '100% Legal Clearance'}</strong>
                      <span className="text-slate-500 text-xs">{isMr ? '३० वर्षांचा सर्च रिपोर्ट व मूळ महसूल नोंदी' : '30-year search history & clean revenue records'}</span>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center shrink-0 font-bold">2</div>
                    <div>
                      <strong className="text-slate-900 block">{isMr ? 'प्रत्यक्ष जागेवर विकास' : 'Physical On-Ground Delivery'}</strong>
                      <span className="text-slate-500 text-xs">{isMr ? 'डांबरी रस्ते, पाणी, वीज आणि कंपाउंड' : 'Tar roads, drainage, water lines & gated entry'}</span>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center shrink-0 font-bold">3</div>
                    <div>
                      <strong className="text-slate-900 block">{isMr ? 'थेट डेव्हलपर व्यवहार' : 'Direct Developer Pricing'}</strong>
                      <span className="text-slate-500 text-xs">{isMr ? 'कोणतेही मध्यस्थ अथवा छुपा खर्च नाही' : 'Zero brokerage, no surprise surcharges'}</span>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center shrink-0 font-bold">4</div>
                    <div>
                      <strong className="text-slate-900 block">{isMr ? 'नोंदणी व फेरफार सहाय्य' : 'Deed & Mutation Assistance'}</strong>
                      <span className="text-slate-500 text-xs">{isMr ? 'खरेदीखत ते नावावर ७/१२ पर्यंत पूर्ण पाठपुरावा' : 'Sub-registrar registry to 7/12 Ferfar handover'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>

        </div>

        {/* Multi-layered Wave Divider to Section 3 (white) */}
        <WaveDivider to="white" variant="forward" />
      </section>


      {/* ─────────────────────────────────────────────────────────────
          SECTION 3: WHAT WE OFFER - CORE DEVELOPMENTS (#developments)
      ───────────────────────────────────────────────────────────── */}
      <section id="developments" className="relative bg-white pt-16 sm:pt-24 pb-0 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 pb-16 sm:pb-24">
          
          <div className="text-center max-w-3xl mx-auto mb-14">
            <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-emerald-700 bg-emerald-50 px-3.5 py-1 rounded-full border border-emerald-200 mb-3">
              <Layers className="w-3.5 h-3.5" />
              <span>{isMr ? 'प्लॉट्स व सेवा' : 'Our Developments'}</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
              {isMr ? 'सह्याद्री लँड डेव्हलपरचे प्रमुख प्रकल्प' : 'Comprehensive Land Solutions Tailored for You'}
            </h2>
            <p className="mt-3 text-sm sm:text-base text-slate-600">
              {isMr
                ? 'प्रत्येक जागेची कायदेशीर तपासणी करून, प्रत्यक्ष पायाभूत सुविधांसह विकसित केलेले खात्रीशीर भूखंड.'
                : 'Every property is hand-picked, legally audited, and physically developed to guarantee generational wealth and peace of mind.'}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            
            {/* Card 1: NA Plots */}
            <motion.div
              whileHover={{ y: -6, transition: { duration: 0.25 } }}
              className="bg-slate-50 rounded-3xl p-6 sm:p-7 border border-slate-200/90 hover:border-emerald-500 hover:shadow-lg transition-all duration-300 flex flex-col justify-between text-left"
            >
              <div>
                <div className="w-13 h-13 rounded-2xl bg-emerald-100/80 text-emerald-800 flex items-center justify-center mb-5">
                  <Building2 className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2.5">
                  {isMr ? 'कलेक्टर व रेरा एन.ए. प्लॉट्स' : 'RERA & Collector NA Plots'}
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mb-6">
                  {isMr
                    ? 'स्वतंत्र सातबारा, भव्य प्रवेशद्वार, अंतर्गत डांबरी रस्ते, गटार लाईन आणि महावितरण वीज पुरवठ्यासह हक्काचे घर बांधण्यासाठी योग्य जागा.'
                    : 'Individual 7/12 land titles, internal asphalt roads, drainage, water supply, and MSEB electricity for immediate bungalow construction.'}
                </p>
              </div>
              <ul className="space-y-2 text-xs text-slate-700 border-t border-slate-200 pt-4 font-medium">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>{isMr ? 'स्वतंत्र पी.आर. कार्ड व ७/१२' : 'Individual 7/12 & PR Card'}</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>{isMr ? 'कंपाउंड व डिमार्केशन पूर्ण' : 'Demarcated & Fenced'}</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>{isMr ? 'बँक कर्ज सुविधा उपलब्ध' : 'Bank Loan Approved'}</span>
                </li>
              </ul>
            </motion.div>

            {/* Card 2: Farmhouse */}
            <motion.div
              whileHover={{ y: -6, transition: { duration: 0.25 } }}
              className="bg-slate-50 rounded-3xl p-6 sm:p-7 border border-slate-200/90 hover:border-teal-500 hover:shadow-lg transition-all duration-300 flex flex-col justify-between text-left"
            >
              <div>
                <div className="w-13 h-13 rounded-2xl bg-teal-100/80 text-teal-800 flex items-center justify-center mb-5">
                  <Trees className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2.5">
                  {isMr ? 'फार्महाऊस व शेतजमीन प्रकल्प' : 'Farmhouse & Agro Parcels'}
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mb-6">
                  {isMr
                    ? 'सह्याद्रीच्या नयनरम्य निसर्गात, पाण्याच्या खात्रीसह वीकेंड फार्महाऊस, सेंद्रिय शेती किंवा दीर्घकालीन गुंतवणुकीसाठी उत्तम शेतजमीन.'
                    : 'Picturesque hill-view parcels with rich black soil, abundant water sources, and legal road approach. Perfect for weekend villas & agro-investments.'}
                </p>
              </div>
              <ul className="space-y-2 text-xs text-slate-700 border-t border-slate-200 pt-4 font-medium">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                  <span>{isMr ? 'कायदेशीर रस्ता व वहिवाट' : 'Sanctioned Road Approach'}</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                  <span>{isMr ? 'मुबलक पाणी व वीज स्त्रोत' : 'Abundant Water & Power'}</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                  <span>{isMr ? '११ गुंठ्यांपासून एकरापर्यंत' : 'From 11 Guntha to Acres'}</span>
                </li>
              </ul>
            </motion.div>

            {/* Card 3: Highway Commercial */}
            <motion.div
              whileHover={{ y: -6, transition: { duration: 0.25 } }}
              className="bg-slate-50 rounded-3xl p-6 sm:p-7 border border-slate-200/90 hover:border-amber-500 hover:shadow-lg transition-all duration-300 flex flex-col justify-between text-left"
            >
              <div>
                <div className="w-13 h-13 rounded-2xl bg-amber-100/80 text-amber-800 flex items-center justify-center mb-5">
                  <Truck className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2.5">
                  {isMr ? 'हायवे-टच कमर्शियल जागा' : 'Highway Commercial Land'}
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mb-6">
                  {isMr
                    ? 'राष्ट्रीय व राज्य महामार्गांलगत वेअरहाऊस, हॉटेल, रिसॉर्ट, पेट्रोल पंप अथवा व्यावसायिक केंद्रांसाठी मोक्याच्या कमर्शियल जागा.'
                    : 'High-visibility frontage on major national & state highways. Ideal for logistics parks, resorts, petrol stations, and commercial complexes.'}
                </p>
              </div>
              <ul className="space-y-2 text-xs text-slate-700 border-t border-slate-200 pt-4 font-medium">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span>{isMr ? 'मोठा फ्रंट व मोक्याचे लोकेशन' : 'Prime High-Traffic Frontage'}</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span>{isMr ? 'कमर्शियल झोन एनओसी सहाय्य' : 'Commercial Zone & NOC Support'}</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span>{isMr ? 'उत्कृष्ट भाडे परतावा क्षमता' : 'High Appreciation & Yield'}</span>
                </li>
              </ul>
            </motion.div>

            {/* Card 4: Turnkey Infrastructure */}
            <motion.div
              whileHover={{ y: -6, transition: { duration: 0.25 } }}
              className="bg-slate-50 rounded-3xl p-6 sm:p-7 border border-slate-200/90 hover:border-blue-500 hover:shadow-lg transition-all duration-300 flex flex-col justify-between text-left"
            >
              <div>
                <div className="w-13 h-13 rounded-2xl bg-blue-100/80 text-blue-800 flex items-center justify-center mb-5">
                  <Compass className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2.5">
                  {isMr ? 'पायाभूत सुविधा विकास' : 'Turnkey Infrastructure'}
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mb-6">
                  {isMr
                    ? 'केवळ कागदावर नाही तर प्रत्यक्ष जागेवर सीमांकन, तारेचे कुंपण, वृक्षारोपण, पथदिवे व सुरक्षा व्यवस्था आम्ही प्रत्यक्ष उभी करतो.'
                    : 'Complete physical development on the ground: boundary stone planting, chain-link security fencing, streetlights, and arboriculture.'}
                </p>
              </div>
              <ul className="space-y-2 text-xs text-slate-700 border-t border-slate-200 pt-4 font-medium">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span>{isMr ? 'पक्के सीमांकन व दगडी खांब' : 'RCC Boundary Demarcation'}</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span>{isMr ? 'मुख्य प्रवेशद्वार व सुरक्षा' : 'Gated Compound & Security'}</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span>{isMr ? 'तात्काळ प्रत्यक्ष ताबा' : 'Instant Handover & Possession'}</span>
                </li>
              </ul>
            </motion.div>

          </div>

        </div>

        {/* Multi-layered Wave Divider to Section 3.5 (slate-50) */}
        <WaveDivider to="slate-50" variant="reverse" />
      </section>


      {/* ─────────────────────────────────────────────────────────────
          SECTION 3.5: LIVE VERIFIED & APPROVED PROPERTIES (#properties)
      ───────────────────────────────────────────────────────────── */}
      <section id="properties" className="relative bg-slate-50 pt-16 sm:pt-24 pb-0 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 pb-16 sm:pb-24">
          
          {/* Section Header */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-[#b81414] bg-red-50 px-3.5 py-1 rounded-full border border-red-200 mb-3">
                <Sparkles className="w-3.5 h-3.5 text-[#b81414]" />
                <span>{isMr ? 'थेट उपलब्ध मालमत्ता' : 'Live Verified Listings'}</span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
                {isMr ? 'नुकत्याच मंजूर झालेल्या थेट मालमत्ता' : 'Freshly Approved Properties & Plots'}
              </h2>
              <p className="mt-2 text-sm sm:text-base text-slate-600 max-w-2xl">
                {isMr
                  ? 'सह्याद्री लँड डेव्हलपरद्वारे कायदेशीर पडताळणी पूर्ण झालेले अधिकृत रेसिडेन्शियल प्लॉट्स, फ्लॅट्स आणि स्वतंत्र घरे.'
                  : 'Hand-picked residential, commercial, and agricultural properties directly reviewed and live for acquisition.'}
              </p>
            </div>

            {/* Direct CTA to full catalog */}
            <div className="shrink-0 flex items-center gap-3">
              <Link
                to="/properties"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-800 text-xs font-bold shadow-xs hover:border-[#b81414] hover:text-[#b81414] hover:shadow-sm transition-all"
              >
                <span>{isMr ? 'सर्व मालमत्ता पहा' : 'View All Properties'}</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 mb-8 pb-4 border-b border-slate-200">
            {/* Category pills */}
            <div className="flex flex-wrap gap-2">
              {[
                { id: 'All', labelMr: 'सर्व मालमत्ता', labelEn: 'All Listings' },
                { id: 'Plot', labelMr: 'प्लॉट्स व जमीन', labelEn: 'Plots & Land' },
                { id: 'Flat', labelMr: 'फ्लॅट्स', labelEn: 'Flats & Apartments' },
                { id: 'House', labelMr: 'घरे व बंगले', labelEn: 'Houses & Villas' }
              ].map((tab) => {
                const active = propCategoryFilter === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setPropCategoryFilter(tab.id as any)}
                    className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                      active
                        ? 'bg-[#b81414] text-white shadow-xs'
                        : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {isMr ? tab.labelMr : tab.labelEn}
                  </button>
                );
              })}
            </div>

            {/* Type selector (Sale / Rent) */}
            <div className="flex items-center gap-1.5 bg-white p-1 rounded-xl border border-slate-200 text-xs font-bold">
              {[
                { id: 'all', labelMr: 'सर्व', labelEn: 'All' },
                { id: 'sale', labelMr: 'विक्रीसाठी', labelEn: 'For Sale' },
                { id: 'rent', labelMr: 'भाड्याने', labelEn: 'For Rent' }
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setPropTypeFilter(t.id as any)}
                  className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                    propTypeFilter === t.id
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {isMr ? t.labelMr : t.labelEn}
                </button>
              ))}
            </div>
          </div>

          {/* Properties Grid */}
          {filteredProperties.length === 0 ? (
            <div className="bg-white rounded-3xl border border-dashed border-slate-300 p-12 text-center max-w-lg mx-auto">
              <Building className="w-12 h-12 text-slate-400 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-800">
                {isMr ? 'नवीन मालमत्ता लवकरच उपलब्ध होतील' : 'No Properties in this Category'}
              </h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                {isMr
                  ? 'आमच्या ॲडमिन टीमद्वारे नवीन प्राप्त झालेल्या मालमत्तांची पडताळणी सुरू आहे. मंजूर होताच त्या येथे दिसतील.'
                  : 'New listings are currently undergoing title audit and verification. They will appear here immediately upon approval.'}
              </p>
              <div className="mt-5 flex justify-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setPropCategoryFilter('All');
                    setPropTypeFilter('all');
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold hover:bg-slate-200 cursor-pointer"
                >
                  {isMr ? 'सर्व फिल्टर काढा' : 'Reset Filters'}
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredProperties.slice(0, 8).map((prop) => {
                const img = (prop.images && prop.images.length > 0 && prop.images[0]) || getFallbackImage(prop.category);
                const priceText = formatPrice(prop.type === 'rent' ? (prop.monthlyRent || prop.expectedPrice || prop.price) : (prop.expectedPrice || prop.price || prop.priceAmount));
                const categoryLabel = prop.category || 'Plot';
                const isRent = (prop.type || '').toLowerCase() === 'rent';
                const titleText = prop.title || prop.propertyName || `${categoryLabel} in ${prop.cityVillage || prop.location || 'Sangli'}`;
                const locationText = [prop.cityVillage, prop.taluka, prop.district].filter(Boolean).join(', ') || prop.location || 'Sangli';

                return (
                  <motion.div
                    key={prop.id}
                    whileHover={{ y: -6, transition: { duration: 0.2 } }}
                    className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs hover:shadow-xl hover:border-slate-300 transition-all flex flex-col justify-between group text-left"
                  >
                    <div>
                      {/* Image Thumbnail */}
                      <div className="relative h-48 w-full overflow-hidden bg-slate-100">
                        <img
                          src={img}
                          alt={titleText}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />

                        {/* Badges on Image */}
                        <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-white/95 text-slate-900 shadow-xs backdrop-blur-xs">
                            {categoryLabel}
                          </span>
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider text-white shadow-xs backdrop-blur-xs ${
                            isRent ? 'bg-amber-600' : 'bg-emerald-600'
                          }`}>
                            {isRent ? (isMr ? 'भाड्याने' : 'For Rent') : (isMr ? 'विक्रीसाठी' : 'For Sale')}
                          </span>
                        </div>

                        {prop.isSoldOut && (
                          <div className="absolute top-3 right-3">
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-600 text-white shadow-xs">
                              {isMr ? 'विक्री पूर्ण' : 'Sold Out'}
                            </span>
                          </div>
                        )}

                        {/* Price Tag pinned to bottom of photo */}
                        <div className="absolute bottom-3 left-3 right-3 flex items-baseline justify-between text-white">
                          <div>
                            <span className="text-lg font-black tracking-tight drop-shadow-md">
                              {priceText}
                            </span>
                            {isRent && <span className="text-[10px] ml-1 opacity-90">{isMr ? '/महिना' : '/mo'}</span>}
                          </div>
                        </div>
                      </div>

                      {/* Content */}
                      <div className="p-4 sm:p-5">
                        <h3 className="text-base font-bold text-slate-900 line-clamp-1 group-hover:text-[#b81414] transition-colors mb-1.5" title={titleText}>
                          {titleText}
                        </h3>

                        <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-3.5">
                          <MapPin className="w-3.5 h-3.5 text-[#b81414] shrink-0" />
                          <span className="truncate">{locationText}</span>
                        </div>

                        {/* Specs Pills */}
                        <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-600 border-t border-slate-100 pt-3">
                          {/* Built-up area / plot area */}
                          {(prop.plotAreaGuntha || prop.plotAreaSqFt || prop.builtUpArea || prop.carpetArea || prop.landArea) && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-50 rounded-md border border-slate-200 font-semibold">
                              <Ruler className="w-3 h-3 text-slate-500" />
                              <span>
                                {prop.plotAreaGuntha
                                  ? `${prop.plotAreaGuntha} गुंठे`
                                  : prop.plotAreaSqFt
                                  ? `${prop.plotAreaSqFt} sqft`
                                  : prop.builtUpArea
                                  ? `${prop.builtUpArea} sqft`
                                  : prop.carpetArea
                                  ? `${prop.carpetArea} sqft`
                                  : prop.landArea || ''}
                              </span>
                            </span>
                          )}

                          {/* BHK / Bedrooms */}
                          {(prop.bedrooms || prop.flatType) && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-50 rounded-md border border-slate-200 font-semibold">
                              <BedDouble className="w-3 h-3 text-slate-500" />
                              <span>{prop.bedrooms ? `${prop.bedrooms} BHK` : prop.flatType}</span>
                            </span>
                          )}

                          {/* Bathrooms */}
                          {Boolean(prop.bathrooms) && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-50 rounded-md border border-slate-200 font-semibold">
                              <Bath className="w-3 h-3 text-slate-500" />
                              <span>{prop.bathrooms} बाथ</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Card Actions Footer */}
                    <div className="p-4 pt-0 sm:p-5 sm:pt-0 flex items-center gap-2">
                      <Link
                        to={`/property/${prop.id}`}
                        className="flex-1 text-center py-2 px-3 rounded-xl bg-slate-900 hover:bg-[#b81414] text-white text-xs font-bold transition-colors shadow-xs"
                      >
                        {isMr ? 'तपशील पहा' : 'View Details'}
                      </Link>

                      <a
                        href={`https://wa.me/918328712712?text=${encodeURIComponent(
                          `नमस्कार Sahyadri Land Developer, मला "${titleText}" (${prop.id}) या मालमत्तेबद्दल अधिक माहिती हवी आहे.`
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white border border-emerald-200 transition-colors shrink-0"
                        title={isMr ? 'व्हॉट्सॲप चौकशी' : 'WhatsApp Enquiry'}
                      >
                        <MessageCircle className="w-4 h-4" />
                      </a>
                    </div>

                  </motion.div>
                );
              })}
            </div>
          )}

          {/* Bottom View All Link Banner */}
          {properties.length > 8 && (
            <div className="mt-12 text-center">
              <Link
                to="/properties"
                className="inline-flex items-center gap-2.5 px-7 py-3.5 rounded-2xl bg-gradient-to-r from-slate-900 to-slate-800 hover:from-[#b81414] hover:to-[#991b1b] text-white text-sm font-bold shadow-md hover:shadow-lg transition-all"
              >
                <span>{isMr ? `सर्व ${properties.length} मालमत्तांची यादी पहा` : `Browse All ${properties.length} Available Listings`}</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          )}

        </div>

        {/* Multi-layered Wave Divider to Section 4 (white) */}
        <WaveDivider to="white" variant="forward" />
      </section>


      {/* ─────────────────────────────────────────────────────────────
          SECTION 4: AMENITIES & INFRASTRUCTURE GALLERY (#amenities)
      ───────────────────────────────────────────────────────────── */}
      <section id="amenities" className="relative bg-white pt-16 sm:pt-24 pb-0 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 pb-16 sm:pb-24">
          
          <div className="text-center max-w-3xl mx-auto mb-14">
            <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-[#b81414] bg-red-50 px-3.5 py-1 rounded-full border border-red-200 mb-3">
              <Landmark className="w-3.5 h-3.5" />
              <span>{isMr ? 'सुविधा व विकास' : 'Project Amenities'}</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
              {isMr ? 'प्रत्यक्ष जागेवरील जागतिक दर्जाच्या पायाभूत सुविधा' : 'On-Ground World-Class Infrastructure'}
            </h2>
            <p className="mt-3 text-sm sm:text-base text-slate-600">
              {isMr
                ? 'सह्याद्री लँड डेव्हलपरच्या प्रत्येक लेआऊटमध्ये नागरिकांच्या सुखकर जीवनासाठी परिपूर्ण सुविधांची खात्री.'
                : 'Every project layout is engineered for lifelong comfort, accessibility, and high capital appreciation.'}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            
            {/* 1. Tar Roads */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-xs hover:shadow-md transition-shadow flex items-start gap-4 text-left">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-800 flex items-center justify-center shrink-0">
                <Truck className="w-6 h-6 text-[#b81414]" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-base mb-1">
                  {isMr ? '९ ते १२ मीटर रुंद अंतर्गत रस्ते' : '9m & 12m Wide Internal Tar Roads'}
                </h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  {isMr ? 'दर्जेदार डांबरीकरण, मजबूत खडीकरण आणि पावसाळी पाण्याचा निचरा होणारी गटार व्यवस्था.' : 'High-grade asphalt paving with structured storm-water drainage for year-round durability.'}
                </p>
              </div>
            </div>

            {/* 2. Water */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-xs hover:shadow-md transition-shadow flex items-start gap-4 text-left">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center shrink-0">
                <Droplets className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-base mb-1">
                  {isMr ? 'स्वतंत्र पाणी पुरवठा लाईन' : 'Dedicated Water Pipeline'}
                </h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  {isMr ? 'प्रत्येक प्लॉटपर्यंत भूमिगत पाणी पाईपलाईन आणि साठवणुकीसाठी ओव्हरहेड पाण्याची टाकी.' : 'Underground water connection pipeline to each plot boundary with overhead storage reservoir.'}
                </p>
              </div>
            </div>

            {/* 3. MSEB Electricity */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-xs hover:shadow-md transition-shadow flex items-start gap-4 text-left">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
                <Zap className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-base mb-1">
                  {isMr ? 'महावितरण वीज व ट्रान्सफॉर्मर' : 'MSEB Power Sub-Station'}
                </h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  {isMr ? 'स्वतंत्र वीज खांब, ट्रान्सफॉर्मर आणि तात्काळ घरगुती वीज मीटर जोडणीची कायदेशीर सोय.' : 'Sanctioned electric poles, transformers, and fast-track domestic meter connection approval.'}
                </p>
              </div>
            </div>

            {/* 4. Gated Security */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-xs hover:shadow-md transition-shadow flex items-start gap-4 text-left">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                <Fence className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-base mb-1">
                  {isMr ? 'प्रवेशद्वार व सुरक्षा कुंपण' : 'Grand Entrance Gate & Fencing'}
                </h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  {isMr ? 'भव्य कमानदार प्रवेशद्वार, सुरक्षा रक्षक केबिन आणि संपूर्ण लेआऊटला चेनलिंक कुंपण.' : 'Architectural entrance arch, security cabin, and complete perimeter chain-link security fencing.'}
                </p>
              </div>
            </div>

            {/* 5. Tree Plantation */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-xs hover:shadow-md transition-shadow flex items-start gap-4 text-left">
              <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center shrink-0">
                <TreePine className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-base mb-1">
                  {isMr ? 'रस्त्यालगत हरित वृक्षारोपण' : 'Avenue Tree Plantation'}
                </h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  {isMr ? 'रस्त्याच्या दोन्ही बाजूंना फळे व सावली देणाऱ्या झाडांची लागवड आणि हिरवेगार वातावरण.' : 'Lush avenue trees planted along road buffers to promote clean, green, oxygenated living.'}
                </p>
              </div>
            </div>

            {/* 6. Street Lighting */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-xs hover:shadow-md transition-shadow flex items-start gap-4 text-left">
              <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-700 flex items-center justify-center shrink-0">
                <SunMedium className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-base mb-1">
                  {isMr ? 'सौर व एलईडी पथदिवे' : 'Solar & LED Street Lighting'}
                </h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  {isMr ? 'लेआऊटमधील सर्व रस्त्यांवर अखंड प्रकाशासाठी आधुनिक सौर व एलईडी पथदिव्यांची सोय.' : 'Continuous night illumination across all internal roads via energy-efficient LED streetlamps.'}
                </p>
              </div>
            </div>

          </div>

        </div>

        {/* Multi-layered Wave Divider to Section 5 (slate-50) */}
        <WaveDivider to="slate-50" variant="forward" />
      </section>


      {/* ─────────────────────────────────────────────────────────────
          SECTION 5: GUNTHA & LAND MEASUREMENT BUYER'S GUIDE
      ───────────────────────────────────────────────────────────── */}
      <section className="relative bg-slate-50 pt-16 sm:pt-20 pb-0 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 pb-16 sm:pb-20">
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            
            <div className="lg:col-span-6 text-left space-y-4">
              <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-3.5 py-1 rounded-full border border-emerald-200">
                <Ruler className="w-3.5 h-3.5" />
                <span>{isMr ? 'जमीन मोजमाप मार्गदर्शक' : 'Land Measurement Guide'}</span>
              </div>

              <h2 className="text-2xl sm:text-4xl font-black text-slate-900 leading-tight">
                {isMr
                  ? 'गुंठा व एकराचे सोपे गणित समजून घ्या'
                  : 'Understanding Guntha & Acre Plot Dimensions'}
              </h2>

              <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                {isMr
                  ? 'महाराष्ट्रात जमीन खरेदी करताना क्षेत्रफळाची अचूक माहिती असणे महत्त्वाचे असते. सह्याद्री लँड डेव्हलपरकडे १ गुंठ्यापासून ते एकरापर्यंत स्वतंत्र डिमार्केशन असलेले प्लॉट्स उपलब्ध आहेत.'
                  : 'When buying land in Maharashtra, understanding exact Guntha conversion ensures complete transparency. We offer certified demarcated plots from 1 Guntha up to multi-acre parcels.'}
              </p>

              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200/70 text-xs text-amber-900 flex items-start gap-2.5">
                <BadgeCheck className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <span>
                  {isMr
                    ? 'सर्व प्लॉट्स वास्तुशास्त्रानुसार योग्य दिशा, प्रशस्त फ्रंट आणि ९ ते १२ मीटर रस्त्यांच्या नियोजनासह उपलब्ध आहेत.'
                    : 'All layout plots feature Vastu-compliant road facing, generous road frontage, and standardized geometric demarcations.'}
                </span>
              </div>
            </div>

            <div className="lg:col-span-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
                
                {/* 1 Guntha */}
                <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200 shadow-xs hover:border-emerald-500 transition-colors">
                  <div className="text-xs uppercase font-extrabold text-emerald-700 tracking-wider">
                    {isMr ? '१ गुंठा' : '1 Guntha'}
                  </div>
                  <div className="text-2xl sm:text-3xl font-black text-slate-900 my-2 font-serif">
                    1,089
                  </div>
                  <div className="text-xs text-slate-500 font-medium">{isMr ? 'चौरस फूट (Sq.Ft)' : 'Square Feet'}</div>
                  <div className="mt-3 pt-3 border-t border-slate-200 text-[11px] text-slate-400">
                    ~ 101.17 sq.m
                  </div>
                </div>

                {/* 11 Guntha */}
                <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200 shadow-xs hover:border-teal-500 transition-colors">
                  <div className="text-xs uppercase font-extrabold text-teal-700 tracking-wider">
                    {isMr ? '११ गुंठे' : '11 Guntha'}
                  </div>
                  <div className="text-2xl sm:text-3xl font-black text-slate-900 my-2 font-serif">
                    11,979
                  </div>
                  <div className="text-xs text-slate-500 font-medium">{isMr ? 'फार्महाऊस प्लॉट' : 'Farmhouse Plot'}</div>
                  <div className="mt-3 pt-3 border-t border-slate-200 text-[11px] text-slate-400">
                    ~ 1,113 sq.m
                  </div>
                </div>

                {/* 1 Acre */}
                <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200 shadow-xs hover:border-[#b81414] transition-colors">
                  <div className="text-xs uppercase font-extrabold text-[#b81414] tracking-wider">
                    {isMr ? '१ एकर' : '1 Acre'}
                  </div>
                  <div className="text-2xl sm:text-3xl font-black text-slate-900 my-2 font-serif">
                    43,560
                  </div>
                  <div className="text-xs text-slate-500 font-medium">{isMr ? '४० गुंठे क्षेत्र' : '40 Guntha Total'}</div>
                  <div className="mt-3 pt-3 border-t border-slate-200 text-[11px] text-slate-400">
                    ~ 4,047 sq.m
                  </div>
                </div>

              </div>
            </div>

          </div>

        </div>

        {/* Multi-layered Wave Divider to Section 6 (slate-900) */}
        <WaveDivider to="slate-900" variant="reverse" />
      </section>


      {/* ─────────────────────────────────────────────────────────────
          SECTION 6: OFFICIAL ANDROID APP SHOWCASE (#app)
      ───────────────────────────────────────────────────────────── */}
      <section id="app" className="relative bg-slate-900 text-white pt-16 sm:pt-24 pb-0 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 pb-16 sm:pb-24">
          
          <div className="bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 text-white rounded-3xl p-8 sm:p-12 lg:p-16 border border-slate-800 shadow-2xl grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            
            <div className="lg:col-span-7 text-left space-y-6">
              <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-3.5 py-1 rounded-full border border-emerald-500/20">
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                <span>{isMr ? 'सह्याद्री अधिकृत ॲन्ड्रॉइड ॲप' : 'Official Android App'}</span>
              </div>

              <h2 className="text-2xl sm:text-4xl lg:text-5xl font-black text-white leading-tight">
                {isMr
                  ? 'सर्व उपलब्ध प्लॉट्स, नकाशे व ७/१२ आता मोबाईल ॲपवर!'
                  : 'Inspect Plots, GPS Boundaries & 7/12 Records on Mobile'}
              </h2>

              <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
                {isMr
                  ? 'आमच्या मोफत ॲन्ड्रॉइड ॲप्लिकेशनद्वारे आपण घरबसल्या प्रत्येक प्रकल्पाचे सॅटेलाईट नकाशे, उपलब्ध जागांचे क्षेत्रफळ, मंजूर लेआऊट ऑर्डर आणि दर तपासू शकता. कोणत्याही दलालाशिवाय थेट विकासकांशी संवाद साधा!'
                  : 'Download the official Sahyadri Land Developer app from Google Play. Explore active layouts with real-time GPS dimensions, revenue 7/12 records, approved layout sanctions, and schedule personal site inspections.'}
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
                <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-950/70 border border-slate-800">
                  <Compass className="w-5 h-5 text-emerald-400 shrink-0" />
                  <span className="text-xs font-semibold text-slate-200">{isMr ? 'जीपीएस सॅटेलाईट मॅपिंग' : 'GPS Satellite Plot Maps'}</span>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-950/70 border border-slate-800">
                  <FileText className="w-5 h-5 text-teal-400 shrink-0" />
                  <span className="text-xs font-semibold text-slate-200">{isMr ? 'डिजिटल ७/१२ व फेरफार' : 'Verified 7/12 & PR Cards'}</span>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-950/70 border border-slate-800">
                  <MessageCircle className="w-5 h-5 text-amber-400 shrink-0" />
                  <span className="text-xs font-semibold text-slate-200">{isMr ? 'थेट डेव्हलपरशी संवाद' : 'Zero Brokerage Direct Deal'}</span>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-950/70 border border-slate-800">
                  <Clock className="w-5 h-5 text-purple-400 shrink-0" />
                  <span className="text-xs font-semibold text-slate-200">{isMr ? 'लाईव्ह नवीन प्रकल्प अपडेट्स' : 'Instant Layout Launch Alerts'}</span>
                </div>
              </div>

              <div className="pt-2 flex flex-wrap items-center gap-4">
                <a
                  href={PLAY_STORE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2.5 px-6 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-sm shadow-xl shadow-emerald-500/25 transition-all transform hover:scale-105 cursor-pointer"
                >
                  <Download className="w-4 h-4 text-slate-950" />
                  <span>{isMr ? 'गुगल प्ले वरून इन्स्टॉल करा' : 'Get it on Google Play'}</span>
                  <ExternalLink className="w-3.5 h-3.5 text-slate-950/70" />
                </a>

                <span className="text-xs text-slate-400 font-mono">
                  com.spark.sahyadrilanddeveloper
                </span>
              </div>
            </div>

            {/* Right Mockup Display */}
            <div className="lg:col-span-5 flex justify-center">
              <div className="w-full max-w-xs rounded-3xl bg-slate-950 border-2 border-slate-800 p-5 shadow-2xl text-left space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <img src="/sahyadri-emblem.png" alt="" className="w-5 h-5 object-contain" />
                    <span className="text-xs font-bold text-white">Sahyadri Mobile App</span>
                  </div>
                  <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                    PLAY STORE
                  </span>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 space-y-1.5">
                  <span className="text-[9px] uppercase font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md">
                    Collector NA Plot
                  </span>
                  <div className="text-xs font-bold text-white">Sahyadri Valley Greens Layout</div>
                  <div className="text-[11px] text-slate-400 flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-red-400" />
                    <span>Satara Highway Belt</span>
                  </div>
                  <div className="text-xs font-bold text-amber-300 pt-1">₹ 12,50,000*</div>
                </div>

                <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-center space-y-2">
                  <p className="text-[11px] text-slate-300">
                    {isMr ? 'प्रत्येक प्लॉटचे तपशील व नकाशे ॲपमध्ये पहा' : 'View all plot listings and site maps on app'}
                  </p>
                  <a
                    href={PLAY_STORE_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition-colors"
                  >
                    {isMr ? 'ॲप उघडा' : 'Install on Android'}
                  </a>
                </div>
              </div>
            </div>

          </div>

        </div>

        {/* Multi-layered Wave Divider to Section 7 (white) */}
        <WaveDivider to="white" variant="forward" />
      </section>


      {/* ─────────────────────────────────────────────────────────────
          SECTION 7: 4-STEP PROCESS JOURNEY (#process)
      ───────────────────────────────────────────────────────────── */}
      <section id="process" className="relative bg-white pt-16 sm:pt-24 pb-0 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 pb-16 sm:pb-24">
          
          <div className="text-center max-w-3xl mx-auto mb-14">
            <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-[#b81414] bg-red-50 px-3.5 py-1 rounded-full border border-red-200 mb-3">
              <BadgeCheck className="w-3.5 h-3.5" />
              <span>{isMr ? 'सोपी व पारदर्शक पद्धत' : 'The Sahyadri Standard'}</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
              {isMr ? 'प्लॉट खरेदीची ४ सोपी व सुरक्षित पावले' : 'Your 4-Step Seamless Land Buying Journey'}
            </h2>
            <p className="mt-3 text-sm sm:text-base text-slate-600">
              {isMr
                ? 'जमिनीच्या निवडीपासून ते नोंदणीकृत दस्त आणि नावावर स्वतंत्र ७/१२ होईपर्यंत संपूर्ण कायदेशीर प्रक्रिया आम्ही स्वतः पूर्ण करतो.'
                : 'From the initial site visit to legal search verification and the final registered deed with mutation (Ferfar) entry.'}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            
            <div className="bg-slate-50 rounded-3xl p-6 sm:p-7 border border-slate-200 text-left flex flex-col justify-between hover:border-emerald-500 transition-colors shadow-xs">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-3xl font-black text-emerald-700 font-serif">01</span>
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                    <MapPin className="w-5 h-5" />
                  </div>
                </div>
                <h3 className="text-base font-bold text-slate-900 mb-2">
                  {isMr ? '१. प्रत्यक्ष जागा पाहणी' : '1. On-Site Inspection'}
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  {isMr
                    ? 'आमच्या प्रतिनिधींसोबत प्रत्यक्ष जागेची पाहणी करा, पक्के डिमार्केशन, रस्ते, पाणी व विजेची सोय स्वतः खात्री करून निवडा.'
                    : 'Personal escorted site tour to inspect physical boundary stones, access roads, connectivity, and surrounding developments.'}
                </p>
              </div>
            </div>

            <div className="bg-slate-50 rounded-3xl p-6 sm:p-7 border border-slate-200 text-left flex flex-col justify-between hover:border-teal-500 transition-colors shadow-xs">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-3xl font-black text-teal-700 font-serif">02</span>
                  <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-800 flex items-center justify-center font-bold">
                    <FileCheck2 className="w-5 h-5" />
                  </div>
                </div>
                <h3 className="text-base font-bold text-slate-900 mb-2">
                  {isMr ? '२. कायदेशीर कागदपत्र तपासणी' : '2. 30-Year Legal Verification'}
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  {isMr
                    ? 'अ‍ॅडव्होकेटद्वारे ३० वर्षांचा सर्च रिपोर्ट, मूळ ७/१२, बिनशेती (NA) आदेश व झोन सर्टिफिकेटची संपूर्ण पारदर्शक तपासणी.'
                    : 'Review the 30-year title search certificate, non-agricultural sanctions, approved layout order, and encumbrance-free records.'}
                </p>
              </div>
            </div>

            <div className="bg-slate-50 rounded-3xl p-6 sm:p-7 border border-slate-200 text-left flex flex-col justify-between hover:border-amber-500 transition-colors shadow-xs">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-3xl font-black text-amber-700 font-serif">03</span>
                  <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                </div>
                <h3 className="text-base font-bold text-slate-900 mb-2">
                  {isMr ? '३. पारदर्शक करार व दर' : '3. Transparent Booking'}
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  {isMr
                    ? 'थेट डेव्हलपरसोबत स्पष्ट व्यवहार. कोणताही छुप्या खर्चाचा धोका नाही. सुलभ हप्ते व बँक कर्ज सहाय्य उपलब्ध.'
                    : 'Clear developer-direct pricing with zero hidden surcharges. Transparent booking agreement and bank loan processing assistance.'}
                </p>
              </div>
            </div>

            <div className="bg-slate-50 rounded-3xl p-6 sm:p-7 border border-slate-200 text-left flex flex-col justify-between hover:border-[#b81414] transition-colors shadow-xs">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-3xl font-black text-[#b81414] font-serif">04</span>
                  <div className="w-10 h-10 rounded-xl bg-red-100 text-red-800 flex items-center justify-center font-bold">
                    <BadgeCheck className="w-5 h-5" />
                  </div>
                </div>
                <h3 className="text-base font-bold text-slate-900 mb-2">
                  {isMr ? '४. नोंदणीकृत खरेदीखत व फेरफार' : '4. Registry & Mutation'}
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  {isMr
                    ? 'दुय्यम निबंधक कार्यालयात कायदेशीर खरेदीखत (Registry) आणि महसूल दप्तरी आपल्या नावे स्वतंत्र ७/१२ फेरफार हस्तांतरण.'
                    : 'Sub-registrar office registered sale deed execution, official key handover, and government mutation entry (Ferfar) on 7/12.'}
                </p>
              </div>
            </div>

          </div>

        </div>

        {/* Multi-layered Wave Divider to Section 8 (slate-50) */}
        <WaveDivider to="slate-50" variant="reverse" />
      </section>


      {/* ─────────────────────────────────────────────────────────────
          SECTION 8: INTERACTIVE FREQUENTLY ASKED QUESTIONS (#faq)
      ───────────────────────────────────────────────────────────── */}
      <section id="faq" className="relative bg-slate-50 pt-16 sm:pt-24 pb-0 overflow-hidden">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-12 pb-16 sm:pb-24">
          
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-[#b81414] bg-red-50 px-3.5 py-1 rounded-full border border-red-200 mb-3">
              <HelpCircle className="w-3.5 h-3.5" />
              <span>{isMr ? 'सतत विचारले जाणारे प्रश्न' : 'Buyer Questions'}</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
              {isMr ? 'नेहमी विचारले जाणारे महत्त्वाचे प्रश्न' : 'Frequently Asked Questions'}
            </h2>
            <p className="mt-3 text-sm text-slate-600">
              {isMr
                ? 'जमीन खरेदीसंबंधी सामान्य प्रश्न आणि कायदेशीर स्पष्टीकरण खालीलप्रमाणे आहे.'
                : 'Clear answers on legal verification, sanctions, loans, and registry procedures.'}
            </p>
          </div>

          <div className="space-y-3.5 text-left">
            {faqs.map((faq, idx) => (
              <div
                key={idx}
                className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden shadow-xs transition-colors"
              >
                <button
                  type="button"
                  onClick={() => toggleFaq(idx)}
                  className="w-full p-5 sm:p-6 text-left flex items-center justify-between gap-4 font-bold text-slate-900 hover:text-[#b81414] transition-colors cursor-pointer"
                >
                  <span className="text-sm sm:text-base">{faq.q}</span>
                  <ChevronDown
                    className={`w-5 h-5 text-slate-400 shrink-0 transition-transform duration-300 ${
                      activeFaq === idx ? 'rotate-180 text-[#b81414]' : ''
                    }`}
                  />
                </button>

                <AnimatePresence>
                  {activeFaq === idx && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25 }}
                      className="overflow-hidden"
                    >
                      <div className="px-5 pb-5 sm:px-6 sm:pb-6 text-xs sm:text-sm text-slate-600 border-t border-slate-100 pt-3 leading-relaxed">
                        {faq.a}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>

        </div>

        {/* Multi-layered Wave Divider to Section 9 (white) */}
        <WaveDivider to="white" variant="forward" />
      </section>


      {/* ─────────────────────────────────────────────────────────────
          SECTION 9: CONTACT ADVISORY & OFFICE HUB (#contact)
      ───────────────────────────────────────────────────────────── */}
      <section id="contact" className="relative bg-white pt-16 sm:pt-24 pb-0 overflow-hidden">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-12 pb-16 sm:pb-24 text-center space-y-8">
          
          <div className="space-y-3 max-w-2xl mx-auto">
            <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-emerald-700 bg-emerald-50 px-3.5 py-1 rounded-full border border-emerald-200">
              <Phone className="w-3.5 h-3.5" />
              <span>{isMr ? 'थेट संपर्क केंद्र' : 'Direct Advisory Hub'}</span>
            </div>

            <h2 className="text-3xl sm:text-4xl font-black text-slate-900">
              {isMr ? 'आमच्या प्रतिनिधींशी थेट बोला किंवा भेटा' : 'Connect Directly With Our Development Team'}
            </h2>

            <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
              {isMr
                ? 'प्लॉटचे उपलब्ध नकाशे पाहण्यासाठी आमच्या अधिकृत मोबाईल ॲपचा वापर करा किंवा प्रत्यक्ष साईट व्हिजिटसाठी आमच्याशी थेट संपर्क साधा.'
                : 'Browse all available properties, live GPS maps, and approved layouts on our official Android app, or connect directly with our advisory office for escorted site visits.'}
            </p>
          </div>

          {/* Direct Connect Buttons (Call + WhatsApp + App) */}
          <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
            
            {/* Primary Phone */}
            <a
              href="tel:8328712712"
              className="inline-flex items-center gap-2.5 px-6 py-3.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm shadow-md transition-all cursor-pointer"
            >
              <Phone className="w-4 h-4 text-emerald-400" />
              <span>8328-712-712</span>
            </a>

            {/* Secondary Phone */}
            <a
              href="tel:7788993712"
              className="inline-flex items-center gap-2.5 px-6 py-3.5 rounded-2xl bg-white hover:bg-slate-50 text-slate-800 font-bold text-sm border border-slate-200 shadow-xs transition-all cursor-pointer"
            >
              <Phone className="w-4 h-4 text-[#b81414]" />
              <span>778899-3-712</span>
            </a>

            {/* WhatsApp */}
            <a
              href="https://wa.me/918328712712?text=Hello%20Sahyadri%20Land%20Developer,%20I%20am%20interested%20in%20your%20land%20plots."
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2.5 px-6 py-3.5 rounded-2xl bg-[#25D366] hover:bg-[#20ba59] text-slate-950 font-bold text-sm shadow-md transition-all cursor-pointer"
            >
              <MessageCircle className="w-4 h-4" />
              <span>{isMr ? 'व्हॉट्सॲपवर बोला' : 'Chat on WhatsApp'}</span>
            </a>

            {/* App CTA */}
            <a
              href={PLAY_STORE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2.5 px-6 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-md transition-all cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>{isMr ? 'मोबाईल ॲप डाउनलोड करा' : 'Get Android App'}</span>
            </a>

          </div>

          {/* Office Address Card */}
          <div className="max-w-2xl mx-auto p-6 sm:p-7 rounded-3xl bg-slate-50 border border-slate-200/90 text-left space-y-3.5 shadow-xs">
            <div className="flex items-start gap-3 text-sm text-slate-700">
              <MapPin className="w-5 h-5 text-[#b81414] shrink-0 mt-0.5" />
              <div>
                <strong className="text-slate-900 block">{isMr ? 'मुख्य कार्यालय:' : 'Project Head Office:'}</strong>
                <span className="text-slate-600">Sahyadri Land Developer, Satara / Karad Belt, Maharashtra, India.</span>
              </div>
            </div>

            <div className="flex items-start gap-3 text-sm text-slate-700 border-t border-slate-200 pt-3">
              <Clock className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
              <div>
                <strong className="text-slate-900 block">{isMr ? 'कार्यालयीन वेळ:' : 'Office & Site Visit Hours:'}</strong>
                <span className="text-slate-600">{isMr ? 'सोमवार ते रविवार: सकाळी ९:०० ते संध्याकाळी ७:३० (आठवड्याचे ७ दिवस साईट व्हिजिट सुरू)' : 'Monday to Sunday: 9:00 AM – 7:30 PM (Site inspections open all 7 days)'}</span>
              </div>
            </div>
          </div>

        </div>

        {/* Multi-layered Wave Divider to Footer (slate-950) */}
        <WaveDivider to="slate-950" variant="reverse" />
      </section>

    </div>
  );
};
