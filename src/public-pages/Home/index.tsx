import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
// Trigger HMR rebuild to clear dev server cache
import { useNavigate, Link } from 'react-router-dom';
import { fetchCollection, fetchRecentProperties, fetchSoldOutProperties, getStorageCache, getCachedCollection } from '../../services/firebase';
import { optimizeCloudinaryUrl, getValidImageUrl } from '../../utils/cloudinary';
import {
  MapPin, BedDouble, ArrowRight, Heart,
  ShieldCheck, Star,
  Map, Ruler, Armchair, MessageSquare, Shield
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Dialog } from '../../components/ui/Dialog';
import { MobileAutoScroll } from '../../components/ui/MobileAutoScroll';
import { useTranslation } from 'react-i18next';
import { AdvertisementsBanner } from '../../components/home/AdvertisementsBanner';
import { ShotsReelsSection } from '../../components/home/ShotsReelsSection';

const formatPrice = (price: any) => {
  if (price === undefined || price === null) return 'Contact for Price';
  const num = typeof price === 'number' ? price : parseFloat(price);
  if (isNaN(num)) return 'Contact for Price';
  return `₹${num.toLocaleString('en-IN')}`;
};

export const Home: React.FC = () => {
  const { t, i18n } = useTranslation();
  const isMr = Boolean(i18n.language?.startsWith('mr'));
  const navigate = useNavigate();

  // Instant Cache Rehydration: Pre-populate from storage cache so home properties never flash empty
  const [rentProperties, setRentProperties] = useState<any[]>(() => {
    if (typeof window !== 'undefined') {
      const cached = getStorageCache<any[]>('session', 'sahyadri_cache_recent_rent_4', 24 * 60 * 60 * 1000)
        || getStorageCache<any[]>('local', 'sahyadri_cache_recent_rent_4', 24 * 60 * 60 * 1000);
      if (Array.isArray(cached) && cached.length > 0) return cached;
    }
    return [];
  });
  const [saleProperties, setSaleProperties] = useState<any[]>(() => {
    if (typeof window !== 'undefined') {
      const cached = getStorageCache<any[]>('session', 'sahyadri_cache_recent_sale_4', 24 * 60 * 60 * 1000)
        || getStorageCache<any[]>('local', 'sahyadri_cache_recent_sale_4', 24 * 60 * 60 * 1000);
      if (Array.isArray(cached) && cached.length > 0) return cached;
    }
    return [];
  });
  const [soldOutProperties, setSoldOutProperties] = useState<any[]>(() => {
    if (typeof window !== 'undefined') {
      const cached = getStorageCache<any[]>('session', 'sahyadri_cache_soldout_4', 24 * 60 * 60 * 1000)
        || getStorageCache<any[]>('local', 'sahyadri_cache_soldout_4', 24 * 60 * 60 * 1000);
      if (Array.isArray(cached) && cached.length > 0) return cached;
    }
    return [];
  });
  const [projects, setProjects] = useState<any[]>(() => {
    if (typeof window !== 'undefined') {
      const cached = getCachedCollection('projects');
      if (Array.isArray(cached) && cached.length > 0) {
        return cached.filter((p: any) => p.isVisible !== false).slice(0, 3);
      }
    }
    return [];
  });
  const [selectedProject, setSelectedProject] = useState<any>(null);

  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 640);
  const [activeTestimonial, setActiveTestimonial] = useState(0);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  // 4. Load projects, properties and perform storage sync on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        // Optimized: Fetch only the recent required properties without downloading the entire DB
        const [rentProps, saleProps, soldOutProps] = await Promise.all([
          fetchRecentProperties('rent', 4),
          fetchRecentProperties('sale', 4),
          fetchSoldOutProperties(4)
        ]);
        
        setRentProperties(rentProps);
        setSaleProperties(saleProps);
        setSoldOutProperties(soldOutProps);

        // Filter projects (cached)
        const projs = await fetchCollection('projects');
        const activeProjs = projs.filter((p: any) => p.isVisible !== false);
        setProjects(activeProjs.slice(0, 3));

      } catch (error) {
        console.error("Failed to load home page data:", error);
      }
    };
    loadData();

    // Re-fetch immediately when properties are updated/approved in admin or mobile
    const handleUpdate = () => {
      loadData();
    };
    window.addEventListener('sahyadri_content_updated', handleUpdate);
    return () => {
      window.removeEventListener('sahyadri_content_updated', handleUpdate);
    };
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem('luminous_saved_properties');
    if (saved) {
      try {
        setSavedIds(JSON.parse(saved));
      } catch {
        setSavedIds([]);
      }
    }
    const handleStorageChange = () => {
      const updated = localStorage.getItem('luminous_saved_properties');
      if (updated) setSavedIds(JSON.parse(updated));
    };
    window.addEventListener('saved_properties_changed', handleStorageChange);
    return () => window.removeEventListener('saved_properties_changed', handleStorageChange);
  }, []);

  // Monitor screen size
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 640);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Auto-scroll testimonials on mobile view
  useEffect(() => {
    if (!isMobile) return;
    const interval = setInterval(() => {
      setActiveTestimonial((prev) => (prev + 1) % 3);
    }, 4000);
    return () => clearInterval(interval);
  }, [isMobile, activeTestimonial]);

  const handleTestimonialTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTestimonialTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTestimonialTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;
    if (isLeftSwipe) {
      setActiveTestimonial((prev) => (prev + 1) % 3);
    } else if (isRightSwipe) {
      setActiveTestimonial((prev) => (prev - 1 + 3) % 3);
    }
  };

  const handleSavedToggle = (e: React.MouseEvent, propId: string) => {
    e.stopPropagation();
    let currentSaved = [...savedIds];
    if (currentSaved.includes(propId)) {
      currentSaved = currentSaved.filter((id) => id !== propId);
    } else {
      currentSaved.push(propId);
    }
    setSavedIds(currentSaved);
    localStorage.setItem('luminous_saved_properties', JSON.stringify(currentSaved));

    // Dispatch event to Navbar
    window.dispatchEvent(new Event('saved_properties_changed'));
  };

  const renderSoldOutCard = (prop: any) => (
    <Card
      className="group/card relative overflow-hidden flex flex-col h-full bg-slate-50/50 border border-slate-200 rounded-3xl shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer"
      onClick={() => navigate(`/property/${prop.id}`)}
    >
      <div className="aspect-[4/3] w-full overflow-hidden relative">
        <img
          src={getValidImageUrl(prop.images?.[0])}
          alt={prop.title}
          className="w-full h-full object-cover grayscale-[40%] transition-transform duration-700 group-hover/card:scale-105"
        />
        {prop.propertyCode && (
          <div className="absolute top-3.5 left-3.5 bg-[#111c2e] text-white text-[10px] font-mono font-black px-2.5 py-1 rounded-lg uppercase tracking-wider shadow-sm z-10">
            {prop.propertyCode}
          </div>
        )}
        {prop.isSoldOut && (
          <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none overflow-hidden">
            <div className="bg-red-600/90 text-white w-[120%] py-2 text-center transform -rotate-12 shadow-xl border-y-2 border-red-500 backdrop-blur-sm shadow-red-500/30">
              <span className="text-sm font-black uppercase tracking-[0.3em] flex items-center justify-center gap-2 drop-shadow-md">
                <span className="text-[10px]">🔴</span>
                {isMr ? 'विकले' : 'SOLD OUT'}
                <span className="text-[10px]">🔴</span>
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="p-5 flex flex-col justify-between flex-grow">
        <div className="space-y-1.5 text-left">
          <div className="text-slate-500 font-extrabold text-base line-through">
            {formatPrice(prop.price)}
          </div>
          <h3 className="text-sm font-bold text-slate-700 line-clamp-1 flex items-center gap-1.5 flex-wrap">
            <span>{isMr ? prop.titleMr || prop.title : prop.title}</span>
          </h3>
          <div className="flex items-center gap-1.5 text-slate-500 text-xs mt-1">
            <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
            <span className="truncate">{isMr ? prop.locationMr || prop.location : prop.location}</span>
          </div>
        </div>

        <div className="mt-3 pt-3 border-t border-slate-200 flex gap-4 text-slate-500 text-[11px] font-medium justify-between">
          <span className="flex items-center gap-1"><BedDouble className="w-3.5 h-3.5 text-slate-400" /> {prop.beds || 3} BHK</span>
          <span className="flex items-center gap-1"><Ruler className="w-3.5 h-3.5 text-slate-400" /> {prop.area || 1450} sqft</span>
          <span className="flex items-center gap-1"><Armchair className="w-3.5 h-3.5 text-slate-400" /> {prop.furnishing || 'Semi Furnished'}</span>
        </div>
      </div>
    </Card>
  );

  return (
    <div className="relative min-h-screen text-slate-900 bg-slate-50 pb-16 overflow-x-hidden">


      {/* 1. Cinematic Hero Video Banner with Centered Brand Logo */}
      <section className="relative mt-16 w-full h-[65vh] sm:h-[75vh] lg:h-[82vh] min-h-[500px] max-h-[850px] bg-[#0b0f19] overflow-hidden flex flex-col justify-between items-center">
        {/* Hero Background Video - Visible on all devices (Mobile & Desktop) */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.9, ease: 'easeOut' }}
          className="hero-video-container absolute inset-0 z-0 overflow-hidden block"
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
          {/* Bottom gradient to blend video smoothly into waves below */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-[#0b0f19]/70 pointer-events-none" />
        </motion.div>

        {/* Centered Brand Logo with Premium Cinematic Animation */}
        <div className="relative z-20 w-full max-w-5xl mx-auto px-4 flex flex-col items-center justify-center my-auto pt-6 sm:pt-10">
          {/* Subtle Ambient Back-Glow matching Sahyadri green & warm amber */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: [0.2, 0.45, 0.2], scale: [0.95, 1.06, 0.95] }}
            transition={{
              duration: 5,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 0.5
            }}
            className="absolute w-80 sm:w-[32rem] h-56 sm:h-80 rounded-full bg-gradient-to-tr from-emerald-600/35 via-green-500/25 to-amber-500/30 blur-3xl pointer-events-none will-change-[opacity,transform] transform-gpu"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.88, y: 25 }}
            animate={{ 
              opacity: 1, 
              scale: 1, 
              y: [0, -8, 0] 
            }}
            transition={{ 
              opacity: { duration: 1.2, ease: [0.16, 1, 0.3, 1] },
              scale: { duration: 1.2, ease: [0.16, 1, 0.3, 1] },
              y: { 
                duration: 4.5, 
                repeat: Infinity, 
                ease: 'easeInOut', 
                delay: 1.2 
              }
            }}
            whileHover={{ scale: 1.04, transition: { duration: 0.35 } }}
            className="relative z-10 flex flex-col items-center text-center select-none cursor-pointer will-change-transform"
          >
            <img
              src="/sahyadri-logo.png"
              alt="Sahyadri Land Developer"
              className="h-44 sm:h-60 md:h-76 lg:h-84 xl:h-[350px] w-auto object-contain transition-transform duration-500 animate-logo-breathe will-change-transform"
            />
          </motion.div>
        </div>

        {/* Floating Scroll Cue to Properties */}
        <div className="relative z-20 pb-16 sm:pb-22 flex flex-col items-center pointer-events-none">
          <Link
            to="/properties"
            className="pointer-events-auto inline-flex items-center gap-2 bg-slate-950/75 hover:bg-slate-900 text-white border border-white/20 backdrop-blur-md px-5 py-2.5 rounded-full text-xs font-bold tracking-wider uppercase transition-all shadow-xl hover:scale-105 cursor-pointer group"
          >
            <span>{t('hero.search', 'मालमत्ता शोधा')}</span>
            <ArrowRight className="w-4 h-4 text-orange-400 group-hover:text-orange-300 transition-colors" />
          </Link>
        </div>

        {/* Sea Waves Divider - seamlessly merging hero video into search section */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.35, ease: 'easeOut' }}
          className="absolute -bottom-1 left-0 right-0 w-full overflow-hidden leading-none pointer-events-none z-10"
        >
          <svg
            className="relative block w-full h-[45px] sm:h-[65px] md:h-[85px] lg:h-[110px]"
            viewBox="0 0 1440 120"
            preserveAspectRatio="none"
          >
            {/* Deep ocean back wave */}
            <path
              d="M0,28 C180,82 360,10 540,50 C720,90 900,22 1080,64 C1260,106 1380,38 1440,52 L1440,120 L0,120 Z"
              className="fill-slate-50/25"
            />
            {/* Middle rolling wave */}
            <path
              d="M0,52 C220,108 440,30 660,74 C880,118 1100,46 1280,80 C1360,94 1410,66 1440,60 L1440,120 L0,120 Z"
              className="fill-slate-50/55"
            />
            {/* Front sea wave - seamlessly blends directly into bg-slate-50 */}
            <path
              d="M0,74 C140,116 290,56 450,92 C620,126 790,64 950,98 C1120,132 1290,76 1440,90 L1440,120 L0,120 Z"
              className="fill-slate-50"
            />
          </svg>
        </motion.div>
      </section>

      {/* Mobile & Web App Advertisements / Promotional Posters Banner */}
      <AdvertisementsBanner />

      {/* 99. Shots - Short Property Video Reels Section & Fullscreen Player */}
      <ShotsReelsSection />

      {/* Interactive Map Section */}
      <section id="map-section" className="max-w-7xl mx-auto px-4 sm:px-6 md:px-12 mt-4 sm:mt-8 md:mt-10 grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-center text-left">
        {/* Call to Action */}
        <div className="lg:col-span-5 bg-slate-900 rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between text-white shadow-xl relative overflow-hidden gap-6 max-w-md sm:max-w-xl lg:max-w-none w-full mx-auto">
          <div className="flex-grow flex flex-col gap-3.5">
            <h3 className="text-lg font-bold text-white font-sans">{t('home.propertiesNearYou', 'Properties Near You')}</h3>
            <p className="text-slate-300 text-xs leading-relaxed max-w-[280px]">
              {t('home.mapSearchDesc', 'Find verified local apartments, plots, and homes directly on the map.')}
            </p>
            <button
              onClick={() => {
                window.open("https://www.google.com/maps/place/Sangli,+Maharashtra", "_blank");
              }}
              className="w-fit bg-[#f97316] hover:bg-orange-600 text-white py-2.5 px-6 rounded-xl font-bold uppercase tracking-wider text-xs flex items-center gap-2 shadow-lg shadow-orange-500/25 transition-all hover:scale-105 cursor-pointer mt-1"
            >
              {t('home.exploreMap', 'Explore Map')}
            </button>
          </div>
          <div className="w-14 h-14 rounded-full bg-slate-800 flex items-center justify-center flex-shrink-0 border border-slate-700 self-end sm:self-center">
            <Map className="w-7 h-7 text-orange-500" />
          </div>
        </div>

        {/* Map Visual */}
        <div className="hidden lg:block lg:col-span-7 w-full">
          <Card className="relative w-full h-[280px] sm:h-[300px] overflow-hidden border border-slate-200 shadow-2xl rounded-[32px]" >
            {/* Google Map Iframe */}
            <iframe
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d122177.34863339077!2d74.51264426562502!3d16.850400037803328!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3bc123b1a10c7bf7%3A0xd705bc032c57f20e!2sSangli%2C%20Maharashtra!5e0!3m2!1sen!2sin!4v1717800000000!5m2!1sen!2sin"
              width="100%"
              height="100%"
              style={{ border: 0 }}
              allowFullScreen={true}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              className="absolute inset-0 w-full h-full border-none"
            ></iframe>
          </Card>
        </div>
      </section>

      {/* New Projects Section (Screenshot 1) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 md:px-12 mt-12 sm:mt-20 md:mt-28 text-left">
        <div className="flex flex-wrap justify-between items-end gap-4 mb-8">
          <div className="min-w-0">
            <span className="text-xs uppercase tracking-[0.2em] font-semibold text-primary font-serif">{t('home.verifiedDevelopments')}</span>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mt-1 text-slate-900">{t('home.newProjects')}</h2>
            <p className="text-slate-600 text-xs md:text-sm mt-1">{t('home.newProjectsDesc')}</p>
          </div>
          <Link to="/projects" className="flex items-center gap-1.5 text-xs uppercase tracking-widest font-semibold text-primary hover:text-primary/80 transition-colors border-b border-primary/20 hover:border-primary pb-0.5 shrink-0">
            {t('home.viewAll')} <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {projects.length === 0 ? (
          <div className="text-slate-600 py-12">{t('home.noProjects')}</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
            {projects.slice(0, 4).map((proj) => (
              <div
                key={proj.id}
                className="group bg-white border border-slate-100 rounded-3xl overflow-hidden flex flex-col shadow-md hover:shadow-lg transition-all duration-300 cursor-pointer"
                onClick={() => navigate(`/project/${proj.id}`)}
              >
                {/* Image */}
                <div className="aspect-[4/3] w-full overflow-hidden relative">
                  <img
                    src={optimizeCloudinaryUrl(getValidImageUrl(proj.images?.[0]), 600)}
                    alt={proj.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  {/* Status badge */}
                  <div className="absolute top-3.5 left-3.5 bg-emerald-800 text-white text-[9px] font-bold px-2.5 py-1 rounded uppercase tracking-wider shadow-sm">
                    {t('properties.reraApproved', 'RERA Approved')}
                  </div>
                  {/* Action icons */}
                  <div className="absolute top-3.5 right-3.5">
                    <button
                      type="button"
                      onClick={(e) => handleSavedToggle(e, proj.id)}
                      className="p-2 bg-white/95 hover:bg-white rounded-full text-slate-400 hover:text-red-500 shadow-sm transition-colors cursor-pointer flex items-center justify-center"
                    >
                      <Heart className={`w-3.5 h-3.5 ${savedIds.includes(proj.id) ? 'fill-red-500 text-red-500' : ''}`} />
                    </button>
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-5 flex-1 flex flex-col justify-between">
                  <div className="space-y-1.5 text-left">
                    <div className="text-slate-900 font-extrabold text-base">
                      {proj.priceRange === 'Contact for Price' ? (
                        <span className="text-blue-500 text-xs">{t('contactForPrice')}</span>
                      ) : proj.priceRange}
                    </div>
                    <h3 className="text-sm font-bold text-slate-900 group-hover:text-primary transition-colors line-clamp-1">
                      {isMr ? proj.titleMr || proj.title : proj.title}
                    </h3>
                    <div className="flex items-center gap-1 text-slate-500 text-xs mt-1">
                      <MapPin className="w-3.5 h-3.5 text-orange-500 flex-shrink-0" />
                      <span className="line-clamp-1">{isMr ? proj.locationMr || proj.location : proj.location}</span>
                    </div>
                  </div>

                  <div className="mt-4 pt-3.5 border-t border-slate-100 flex justify-between items-center text-xs text-slate-400 font-medium">
                    <span>{proj.developerName}</span>
                    <span className="font-bold text-slate-700">{proj.areaRange || '1050 sqft'}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Properties for Rent Section (Screenshot 2) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 md:px-12 mt-12 sm:mt-20 md:mt-28 text-left">
        <div className="flex flex-wrap justify-between items-end gap-4 mb-8">
          <div className="min-w-0">
            <span className="text-xs uppercase tracking-[0.2em] font-semibold text-primary font-serif">{t('home.rentalsCuration')}</span>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mt-1 text-slate-900">{t('home.propertiesForRent')}</h2>
            <p className="text-slate-600 text-xs md:text-sm mt-1">{t('home.propertiesForRentDesc')}</p>
          </div>
          <Link to="/properties?type=rent" className="flex items-center gap-1.5 text-xs uppercase tracking-widest font-semibold text-primary hover:text-primary/80 transition-colors border-b border-primary/20 hover:border-primary pb-0.5 shrink-0">
            {t('home.viewAll')} <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {rentProperties.length === 0 ? (
          <div className="text-slate-600 py-12">{t('home.noRentals')}</div>
        ) : (
          <MobileAutoScroll autoScrollInterval={3000}>
            {rentProperties.slice(0, 4).map((prop) => (
              <Card
                key={prop.id}
                className="group relative overflow-hidden flex flex-col h-full bg-white border border-slate-100 rounded-3xl shadow-md hover:shadow-lg transition-all duration-300 cursor-pointer"
                onClick={() => navigate(`/property/${prop.id}`)}
              >
                <div className="aspect-[4/3] w-full overflow-hidden relative">
                  <img
                    src={getValidImageUrl(prop.images?.[0])}
                    alt={prop.title}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                  {prop.propertyCode && (
                    <div className="absolute top-3.5 left-3.5 bg-[#111c2e] text-white text-[10px] font-mono font-black px-2.5 py-1 rounded-lg uppercase tracking-wider shadow-sm z-10">
                      {prop.propertyCode}
                    </div>
                  )}

                  <div className="absolute top-3.5 right-3.5">
                    <button
                      type="button"
                      onClick={(e) => handleSavedToggle(e, prop.id)}
                      className="p-2 bg-white/95 hover:bg-white rounded-full text-slate-400 hover:text-red-500 shadow-sm transition-colors cursor-pointer flex items-center justify-center"
                      title={savedIds.includes(prop.id) ? "Remove from Favorites" : "Add to Favorites"}
                    >
                      <Heart className={`w-3.5 h-3.5 ${savedIds.includes(prop.id) ? 'fill-red-500 text-red-500' : ''}`} />
                    </button>
                  </div>
                </div>

                <div className="p-5 flex flex-col justify-between flex-grow">
                  <div className="space-y-1.5 text-left">
                    <div className="text-slate-900 font-extrabold text-base">
                      {formatPrice(prop.price)}<span className="text-[10px] text-slate-500 font-normal">/mo</span>
                    </div>
                    <h3 className="text-sm font-bold text-slate-900 group-hover:text-primary transition-colors line-clamp-1 flex items-center gap-1.5 flex-wrap">
                      <span>{isMr ? prop.titleMr || prop.title : prop.title}</span>
                    </h3>
                    <div className="flex items-center gap-1.5 text-slate-500 text-xs mt-1">
                      <MapPin className="w-3.5 h-3.5 text-orange-500 flex-shrink-0" />
                      <span className="truncate">{isMr ? prop.locationMr || prop.location : prop.location}</span>
                    </div>
                  </div>

                  <div className="mt-auto pt-3 border-t border-slate-100 flex justify-between items-center text-xs text-slate-400 font-medium">
                    <span>{prop.isBuilder ? 'Developer Listing' : 'Owner Direct'}</span>
                    <span className="font-bold text-slate-700">{prop.area} sqft</span>
                  </div>
                </div>
              </Card>
            ))}
          </MobileAutoScroll>
        )}
      </section>
      {/* Properties for Sale Section (Screenshot 3) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 md:px-12 mt-12 sm:mt-20 md:mt-28 text-left">
        <div className="flex flex-wrap justify-between items-end gap-4 mb-8">
          <div className="min-w-0">
            {/* Asset Portfolios text removed per request */}
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mt-1 text-slate-900">{t('home.propertiesForSale')}</h2>
            <p className="text-slate-600 text-xs md:text-sm mt-1">{t('home.propertiesForSaleDesc')}</p>
          </div>
          <Link to="/properties?type=sale" className="flex items-center gap-1.5 text-xs uppercase tracking-widest font-semibold text-primary hover:text-primary/80 transition-colors border-b border-primary/20 hover:border-primary pb-0.5 shrink-0">
            {t('home.viewAll')} <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {saleProperties.length === 0 ? (
          <div className="text-slate-600 py-12">{t('home.noSales')}</div>
        ) : (
          <MobileAutoScroll autoScrollInterval={3000}>
            {saleProperties.slice(0, 4).map((prop) => (
              <Card
                key={prop.id}
                className="group relative overflow-hidden flex flex-col h-full bg-white border border-slate-100 rounded-3xl shadow-md hover:shadow-lg transition-all duration-300 cursor-pointer"
                onClick={() => navigate(`/property/${prop.id}`)}
              >
                <div className="aspect-[4/3] w-full overflow-hidden relative">
                  <img
                    src={getValidImageUrl(prop.images?.[0])}
                    alt={prop.title}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  />

                  {prop.propertyCode && (
                    <div className="absolute top-3.5 left-3.5 bg-[#111c2e] text-white text-[10px] font-mono font-black px-2.5 py-1 rounded-lg uppercase tracking-wider shadow-sm z-10">
                      {prop.propertyCode}
                    </div>
                  )}



                  <div className="absolute top-3.5 right-3.5 z-10">
                    <button
                      type="button"
                      onClick={(e) => handleSavedToggle(e, prop.id)}
                      className="p-2 bg-white/95 hover:bg-white rounded-full text-slate-400 hover:text-red-500 shadow-sm transition-colors cursor-pointer flex items-center justify-center"
                      title={savedIds.includes(prop.id) ? "Remove from Favorites" : "Add to Favorites"}
                    >
                      <Heart className={`w-3.5 h-3.5 ${savedIds.includes(prop.id) ? 'fill-red-500 text-red-500' : ''}`} />
                    </button>
                  </div>
                </div>

                <div className="p-5 flex flex-col justify-between flex-grow">
                  <div className="space-y-1.5 text-left">
                    <div className="text-slate-900 font-extrabold text-base">
                      {formatPrice(prop.price)}
                    </div>
                    <h3 className="text-sm font-bold text-slate-900 group-hover:text-primary transition-colors line-clamp-1 flex items-center gap-1.5 flex-wrap">
                      <span>{isMr ? prop.titleMr || prop.title : prop.title}</span>
                    </h3>
                    <div className="flex items-center gap-1.5 text-slate-500 text-xs mt-1">
                      <MapPin className="w-3.5 h-3.5 text-orange-500 flex-shrink-0" />
                      <span className="truncate">{isMr ? prop.locationMr || prop.location : prop.location}</span>
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t border-slate-100 flex gap-4 text-slate-500 text-[11px] font-medium justify-between">
                    <span className="flex items-center gap-1"><BedDouble className="w-3.5 h-3.5 text-slate-400" /> {prop.beds || 3} BHK</span>
                    <span className="flex items-center gap-1"><Ruler className="w-3.5 h-3.5 text-slate-400" /> {prop.area || 1450} sqft</span>
                    <span className="flex items-center gap-1"><Armchair className="w-3.5 h-3.5 text-slate-400" /> {prop.furnishing || 'Semi Furnished'}</span>
                  </div>
                </div>
              </Card>
            ))}
          </MobileAutoScroll>
        )}
      </section>

      {/* Sold Out Properties Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 md:px-12 mt-12 sm:mt-20 md:mt-28 text-left">
        <div className="flex flex-wrap justify-between items-end gap-4 mb-8">
          <div className="min-w-0">
            <span className="text-xs uppercase tracking-[0.2em] font-semibold text-purple-600 font-serif">{t('home.recentlySold', 'Recently Sold')}</span>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mt-1 text-slate-900">{t('home.soldOutProperties', 'Sold Out Properties')}</h2>
            {/* Subtitle removed per request */}
          </div>
          <Link to="/properties?status=sold" className="flex items-center gap-1.5 text-xs uppercase tracking-widest font-semibold text-purple-600 hover:text-purple-500 transition-colors border-b border-purple-600/20 hover:border-purple-600 pb-0.5 shrink-0">
            {t('home.viewAll', 'View All')} <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {soldOutProperties.length === 0 ? (
          <div className="text-slate-600 py-12">{t('home.noSoldOut', 'No sold out properties at the moment.')}</div>
        ) : soldOutProperties.length <= 3 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {soldOutProperties.map((prop) => (
              <div key={prop.id} className="w-full">
                {renderSoldOutCard(prop)}
              </div>
            ))}
          </div>
        ) : (
          <div className="relative overflow-hidden group -mx-4 px-4 sm:mx-0 sm:px-0">
            <div className="flex gap-4 sm:gap-6 w-max animate-marquee pb-4">
              {[...soldOutProperties.slice(0, 8), ...soldOutProperties.slice(0, 8)].map((prop, idx) => (
                <div key={`${prop.id}-${idx}`} className="w-[280px] sm:w-[320px] shrink-0">
                  {renderSoldOutCard(prop)}
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* How Astitva Realty Works Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 md:px-12 mt-12 sm:mt-20 md:mt-28 relative text-center animate-fadeIn">
        <div className="bg-[#f4f6fa] rounded-[32px] py-10 px-4 sm:py-14 sm:px-12 relative overflow-hidden text-center border border-slate-200/40">
          <div className="flex flex-col items-center gap-2 mb-10 sm:mb-12">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#0f172a] font-serif">{t('home.notBrokers')}</h2>
            <p className="text-slate-500 text-xs sm:text-sm max-w-xl px-2 leading-relaxed">
              {t('home.notBrokersDesc')}
            </p>
          </div>

          <div className="relative">
            <div className="grid grid-cols-3 gap-2 sm:gap-8 w-full relative z-10 max-w-4xl mx-auto">
              {/* Step 1 */}
              <div className="flex flex-col items-center text-center group">
                <div className="w-12 h-12 xs:w-14 h-14 sm:w-16 h-16 bg-white text-[#c2410c] rounded-full flex items-center justify-center font-extrabold text-base xs:text-lg sm:text-2xl shadow-md shadow-slate-200/50 group-hover:scale-105 transition-transform duration-300 border border-slate-100/50">
                  %
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm md:text-base font-extrabold text-[#0f172a] mt-3 sm:mt-4 tracking-tight">{t('home.zeroBrokerage')}</h4>
                  <p className="text-slate-600 text-[10px] sm:text-xs md:text-sm leading-tight sm:leading-relaxed mt-1 sm:mt-2 max-w-[100px] min-[400px]:max-w-[125px] sm:max-w-[280px] mx-auto text-center font-medium">
                    {t('home.zeroBrokerageDesc')}
                  </p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex flex-col items-center text-center group">
                <div className="w-12 h-12 xs:w-14 h-14 sm:w-16 h-16 bg-white text-[#c2410c] rounded-full flex items-center justify-center shadow-md shadow-slate-200/50 group-hover:scale-105 transition-transform duration-300 border border-slate-100/50">
                  <MessageSquare className="w-5 h-5 xs:w-6 h-6 sm:w-7 h-7 text-[#c2410c] fill-[#c2410c]" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm md:text-base font-extrabold text-[#0f172a] mt-3 sm:mt-4 tracking-tight">{t('home.directChat')}</h4>
                  <p className="text-slate-600 text-[10px] sm:text-xs md:text-sm leading-tight sm:leading-relaxed mt-1 sm:mt-2 max-w-[100px] min-[400px]:max-w-[125px] sm:max-w-[280px] mx-auto text-center font-medium">
                    {t('home.directChatDesc')}
                  </p>
                </div>
              </div>

              {/* Step 3 */}
              <div className="flex flex-col items-center text-center group">
                <div className="w-12 h-12 xs:w-14 h-14 sm:w-16 h-16 bg-white text-[#c2410c] rounded-full flex items-center justify-center shadow-md shadow-slate-200/50 group-hover:scale-105 transition-transform duration-300 border border-slate-100/50">
                  <Shield className="w-5 h-5 xs:w-6 h-6 sm:w-7 h-7 text-[#c2410c] fill-[#c2410c]" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm md:text-base font-extrabold text-[#0f172a] mt-3 sm:mt-4 tracking-tight">{t('home.zeroInterference')}</h4>
                  <p className="text-slate-600 text-[10px] sm:text-xs md:text-sm leading-tight sm:leading-relaxed mt-1 sm:mt-2 max-w-[100px] min-[400px]:max-w-[125px] sm:max-w-[280px] mx-auto text-center font-medium">
                    {t('home.zeroInterferenceDesc')}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Commission Callout box */}
        <div className="mt-12 sm:mt-16 md:mt-20 max-w-4xl mx-auto">
          <Card className="w-full p-5 sm:p-10 bg-white border border-slate-200 rounded-3xl flex flex-col md:flex-row items-center gap-6 sm:gap-10 overflow-hidden shadow-xl shadow-slate-200/50 relative">
            <div className="absolute -right-20 -top-20 w-64 h-64 bg-primary/5 rounded-full blur-3xl pointer-events-none"></div>

            <div className="flex-shrink-0 w-20 h-20 bg-green-50 rounded-2xl flex items-center justify-center">
              <ShieldCheck className="w-10 h-10 text-green-500" />
            </div>

            <div className="flex-grow text-center md:text-left space-y-3 z-10">
              <h3 className="text-2xl font-serif font-bold text-slate-900 tracking-tight">
                {t('home.zeroCommissionTitle')}
              </h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                {t('home.zeroCommissionDesc')}
              </p>
            </div>

            <div className="flex-shrink-0 z-10">
              <Link to="/post-property">
                <Button variant="primary" className="py-3 px-6 rounded-xl text-sm font-bold shadow-lg shadow-primary/20">
                  {t('home.listForFree')}
                </Button>
              </Link>
            </div>
          </Card>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 md:px-12 mt-12 sm:mt-20 md:mt-28 text-center flex flex-col items-center gap-8 sm:gap-12 overflow-hidden">
        <div className="max-w-xl flex flex-col gap-2 text-center">
          <span className="text-xs uppercase tracking-[0.2em] font-semibold text-primary font-serif">{t('home.successStories')}</span>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-slate-900">{t('home.whatClientsSay')}</h2>
          <p className="text-slate-600 text-xs md:text-sm">{t('home.happyHomeowners')}</p>
        </div>

        {isMobile ? (
          <div className="w-full overflow-hidden relative px-1">
            <div
              className="flex transition-transform duration-500 ease-in-out"
              style={{ transform: `translateX(-${activeTestimonial * 100}%)` }}
              onTouchStart={handleTestimonialTouchStart}
              onTouchMove={handleTestimonialTouchMove}
              onTouchEnd={handleTestimonialTouchEnd}
            >
              {/* Testimonial 1 */}
              <div className="w-full flex-shrink-0 px-3">
                <Card className="p-6 bg-white border border-slate-100 rounded-3xl shadow-md flex flex-col gap-4 text-left h-full">
                  <div className="flex justify-between items-center">
                    <div className="flex gap-0.5">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                      ))}
                    </div>
                    <span className="text-[10px] font-extrabold text-green-700 uppercase tracking-wider">
                      {t('home.locationVerified')}
                    </span>
                  </div>
                  <p className="text-slate-700 text-sm leading-relaxed font-medium">
                    {t('testimonials.t1Text')}
                  </p>
                  <div className="mt-auto text-xs text-slate-900 font-bold">
                    — {t('testimonials.t1Author')}, {t('testimonials.t1Role')}
                  </div>
                </Card>
              </div>

              {/* Testimonial 2 */}
              <div className="w-full flex-shrink-0 px-3">
                <Card className="p-6 bg-white border border-slate-100 rounded-3xl shadow-md flex flex-col gap-4 text-left h-full">
                  <div className="flex justify-between items-center">
                    <div className="flex gap-0.5">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                      ))}
                    </div>
                    <span className="text-[10px] font-extrabold text-green-700 uppercase tracking-wider">
                      {t('home.directOwner')}
                    </span>
                  </div>
                  <p className="text-slate-700 text-sm leading-relaxed font-medium">
                    {t('testimonials.t2Text')}
                  </p>
                  <div className="mt-auto text-xs text-slate-900 font-bold">
                    — {t('testimonials.t2Author')}, {t('testimonials.t2Role')}
                  </div>
                </Card>
              </div>

              {/* Testimonial 3 */}
              <div className="w-full flex-shrink-0 px-3">
                <Card className="p-6 bg-white border border-slate-100 rounded-3xl shadow-md flex flex-col gap-4 text-left h-full">
                  <div className="flex justify-between items-center">
                    <div className="flex gap-0.5">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                      ))}
                    </div>
                    <span className="text-[10px] font-extrabold text-green-700 uppercase tracking-wider">
                      {t('home.locationVerified')}
                    </span>
                  </div>
                  <p className="text-slate-700 text-sm leading-relaxed font-medium">
                    {t('testimonials.t3Text')}
                  </p>
                  <div className="mt-auto text-xs text-slate-900 font-bold">
                    — {t('testimonials.t3Author')}, {t('testimonials.t3Role')}
                  </div>
                </Card>
              </div>
            </div>

            {/* Dots Indicators */}
            <div className="flex gap-2 justify-center mt-5">
              {[0, 1, 2].map((idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setActiveTestimonial(idx)}
                  className={`w-2 h-2 rounded-full transition-all duration-300 ${activeTestimonial === idx ? 'bg-[#f97316] w-5' : 'bg-slate-300'
                    }`}
                  aria-label={`Go to testimonial ${idx + 1}`}
                />
              ))}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 sm:gap-6 w-full text-left">
            {/* Testimonial 1 */}
            <Card className="p-6 sm:p-8 bg-white border border-slate-100 rounded-3xl shadow-md flex flex-col gap-4 text-left">
              <div className="flex justify-between items-center">
                <div className="flex gap-0.5">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <span className="text-[10px] font-extrabold text-green-700 uppercase tracking-wider">
                  {t('home.locationVerified')}
                </span>
              </div>
              <p className="text-slate-700 text-sm leading-relaxed font-medium">
                {t('testimonials.t1Text')}
              </p>
              <div className="mt-auto text-xs text-slate-900 font-bold">
                — {t('testimonials.t1Author')}, {t('testimonials.t1Role')}
              </div>
            </Card>

            {/* Testimonial 2 */}
            <Card className="p-6 sm:p-8 bg-white border border-slate-100 rounded-3xl shadow-md flex flex-col gap-4 text-left">
              <div className="flex justify-between items-center">
                <div className="flex gap-0.5">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <span className="text-[10px] font-extrabold text-green-700 uppercase tracking-wider">
                  {t('home.directOwner')}
                </span>
              </div>
              <p className="text-slate-700 text-sm leading-relaxed font-medium">
                {t('testimonials.t2Text')}
              </p>
              <div className="mt-auto text-xs text-slate-900 font-bold">
                — {t('testimonials.t2Author')}, {t('testimonials.t2Role')}
              </div>
            </Card>

            {/* Testimonial 3 */}
            <Card className="p-6 sm:p-8 bg-white border border-slate-100 rounded-3xl shadow-md flex flex-col gap-4 text-left">
              <div className="flex justify-between items-center">
                <div className="flex gap-0.5">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <span className="text-[10px] font-extrabold text-green-700 uppercase tracking-wider">
                  {t('home.locationVerified')}
                </span>
              </div>
              <p className="text-slate-700 text-sm leading-relaxed font-medium">
                {t('testimonials.t3Text')}
              </p>
              <div className="mt-auto text-xs text-slate-900 font-bold">
                — {t('testimonials.t3Author')}, {t('testimonials.t3Role')}
              </div>
            </Card>
          </div>
        )}
      </section>






      {selectedProject && (
        <Dialog
          isOpen={!!selectedProject}
          onClose={() => setSelectedProject(null)}
          title={isMr ? selectedProject.titleMr || selectedProject.title : selectedProject.title}
        >
          <div className="flex flex-col gap-6 text-left">
            {/* Image Gallery */}
            {selectedProject.images && selectedProject.images.length > 0 && (
              <div className="aspect-[16/10] w-full rounded-2xl overflow-hidden border border-slate-200 relative shadow-sm">
                <img src={selectedProject.images[0]} alt="" className="w-full h-full object-cover" />
                <div className="absolute top-4 left-4 bg-emerald-800 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg uppercase tracking-wider shadow-md">
                  {selectedProject.status}
                </div>
              </div>
            )}

            {/* Project Specifications */}
            <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100 text-sm">
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-slate-400 uppercase">{isMr ? 'किंमत श्रेणी' : 'Price Range'}</span>
                <span className="font-extrabold text-slate-800 mt-0.5">{selectedProject.priceRange}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-slate-400 uppercase">{isMr ? 'लक्ष्य वर्ष' : 'Target Year'}</span>
                <span className="font-extrabold text-slate-800 mt-0.5">{selectedProject.targetYear || '2027'}</span>
              </div>
              <div className="flex flex-col col-span-2 border-t border-slate-200/60 pt-2.5 mt-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase">{isMr ? 'स्थान' : 'Location'}</span>
                <div className="flex items-center gap-1 mt-0.5">
                  <MapPin className="w-3.5 h-3.5 text-orange-500 fill-orange-500/20" />
                  <span className="font-bold text-slate-800">
                    {isMr ? selectedProject.locationMr || selectedProject.location : selectedProject.location}
                  </span>
                </div>
              </div>
            </div>

            {/* Developer Details */}
            <div className="p-4 rounded-2xl border border-slate-100 bg-white flex items-center gap-3 shadow-sm">
              <div className="w-10 h-10 rounded-xl bg-orange-600/10 text-orange-700 flex items-center justify-center font-extrabold text-sm tracking-wider shrink-0 border border-orange-500/10">
                {selectedProject.developerName ? selectedProject.developerName.slice(0, 2).toUpperCase() : 'DV'}
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">{selectedProject.developerName || (isMr ? 'थेट डेव्हलपर' : 'Direct Developer')}</h4>
                <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">{isMr ? 'अधिकृत रिअल इस्टेट डेव्हलपर' : 'Authorized Real Estate Developer'}</p>
              </div>
            </div>

            {/* Description */}
            <div>
              <h4 className="text-sm font-bold text-slate-900 mb-1.5">{isMr ? 'प्रकल्प विहंगावलोकन' : 'Project Overview'}</h4>
              <p className="text-xs text-slate-600 leading-relaxed font-sans whitespace-pre-line">
                {isMr ? selectedProject.descriptionMr || selectedProject.description : selectedProject.description}
              </p>
            </div>

            {/* Footer Actions */}
            <div className="flex gap-3 justify-end pt-4 border-t border-slate-100">
              <Button type="button" variant="glass" onClick={() => setSelectedProject(null)} className="py-2.5 px-4 rounded-xl text-xs border-slate-200">
                {isMr ? 'बंद करा' : 'Close'}
              </Button>
              <a href={`https://wa.me/918328712712?text=${encodeURIComponent(`I would like to inquire about the project: ${selectedProject.title}`)}`} target="_blank" rel="noreferrer">
                <Button variant="primary" className="py-2.5 px-5 rounded-xl text-xs text-white font-bold bg-emerald-700 hover:bg-emerald-800 border-none flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-white" /> {isMr ? 'व्हॉट्सॲपवर चौकशी करा' : 'Inquire via WhatsApp'}
                </Button>
              </a>
            </div>
          </div>
        </Dialog>
      )}

    </div>
  );
};
