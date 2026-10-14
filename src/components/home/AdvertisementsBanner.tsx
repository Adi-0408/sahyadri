import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight, Sparkles, ArrowRight, Search } from 'lucide-react';
import { subscribeToCollection } from '../../services/firebase';

interface Advertisement {
  id: string;
  image?: string;
  imageUrl?: string;
  bannerImage?: string;
  brandBadge?: string;
  offerBadge?: string;
  offerBadgeMr?: string;
  offer_badge?: string;
  offer?: string;
  preTitle?: string;
  title: string;
  titleMr?: string;
  subtitle?: string;
  subtitleMr?: string;
  link?: string;
  propertyId?: string;
  active?: boolean;
  status?: string;
  createdAt?: string;
}

export const AdvertisementsBanner: React.FC = () => {
  const { t, i18n } = useTranslation();
  const isMr = Boolean(i18n.language?.startsWith('mr'));
  const navigate = useNavigate();
  const [ads, setAds] = useState<Advertisement[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const [isPaused, setIsPaused] = useState(false);

  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);

  // Subscribe to live advertisements, banners, posters, and app_banners collections
  useEffect(() => {
    let adsList: any[] = [];
    let bannersList: any[] = [];
    let postersList: any[] = [];
    let appBannersList: any[] = [];

    const updateCombinedBanners = () => {
      const map = new Map<string, Advertisement>();
      [...adsList, ...bannersList, ...postersList, ...appBannersList].forEach((item: any) => {
        if (!item) return;
        const img = (item.image || item.imageUrl || item.image_url || item.bannerImage || item.banner_image || item.banner || item.poster || '').trim();
        if (!img) return;
        const isActive = item.active !== false && item.status !== 'paused' && item.status !== 'inactive' && item.status !== 'hidden';
        if (!isActive) return;

        const dedupeKey = item.id || img;
        if (!map.has(dedupeKey)) {
          map.set(dedupeKey, {
            id: String(item.id || dedupeKey),
            image: img,
            imageUrl: img,
            bannerImage: img,
            brandBadge: item.brandBadge || item.brand_badge || item.brand || 'SAHYADRI SIGNATURE',
            offerBadge: item.offerBadge || item.offer_badge || item.offer || '',
            preTitle: item.preTitle || item.pre_title || item.preHeading || '',
            title: item.title || item.heading || '',
            titleMr: item.titleMr || item.title_mr || item.title || '',
            subtitle: item.subtitle || item.sub_title || item.subHeading || item.sub_heading || '',
            link: item.link || item.actionUrl || item.action_url || item.url || '/properties',
            propertyId: item.propertyId || item.property_id || '',
            active: true,
            status: 'active',
            createdAt: item.createdAt || ''
          });
        }
      });

      const combined = Array.from(map.values()).sort((a, b) => {
        const timeA = (a.createdAt as any)?.seconds ? (a.createdAt as any).seconds * 1000 : new Date(a.createdAt || 0).getTime();
        const timeB = (b.createdAt as any)?.seconds ? (b.createdAt as any).seconds * 1000 : new Date(b.createdAt || 0).getTime();
        return timeB - timeA;
      });

      setAds(combined);
      setCurrentIndex((prev) => (prev >= combined.length ? 0 : prev));
    };

    const unsub1 = subscribeToCollection('advertisements', (list) => {
      adsList = list || [];
      updateCombinedBanners();
    });

    const unsub2 = subscribeToCollection('banners', (list) => {
      bannersList = list || [];
      updateCombinedBanners();
    });

    const unsub3 = subscribeToCollection('posters', (list) => {
      postersList = list || [];
      updateCombinedBanners();
    });

    const unsub4 = subscribeToCollection('app_banners', (list) => {
      appBannersList = list || [];
      updateCombinedBanners();
    });

    return () => {
      if (typeof unsub1 === 'function') unsub1();
      if (typeof unsub2 === 'function') unsub2();
      if (typeof unsub3 === 'function') unsub3();
      if (typeof unsub4 === 'function') unsub4();
    };
  }, []);

  // Smooth automatic scroll animation every 2.8 seconds (2-3 seconds as requested)
  useEffect(() => {
    if (ads.length <= 1 || isPaused) return;

    const timer = setInterval(() => {
      setDirection(1);
      setCurrentIndex((prev) => (prev + 1) % ads.length);
    }, 2800);

    return () => clearInterval(timer);
  }, [ads.length, isPaused]);

  if (!ads || ads.length === 0) {
    return null;
  }

  const currentAd = ads[currentIndex] || ads[0];
  const adImage = currentAd.image || currentAd.imageUrl || currentAd.bannerImage || '/hero-background.jpg';
  const displayTitle = isMr ? (currentAd.titleMr || currentAd.title) : (currentAd.title || currentAd.titleMr);
  const displaySubtitle = isMr ? (currentAd.subtitleMr || currentAd.subtitle) : (currentAd.subtitle || currentAd.subtitleMr);
  const rawBadge = currentAd.offerBadge || currentAd.offer_badge || currentAd.offer || '';
  const isSpecialOffer = !rawBadge || rawBadge === 'खास ऑफर' || rawBadge.toLowerCase() === 'special offer';
  const displayOfferBadge = isSpecialOffer
    ? (isMr ? 'खास ऑफर' : 'Special Offer')
    : (isMr ? (currentAd.offerBadgeMr || rawBadge) : rawBadge);

  const handleNavigate = () => {
    if (currentAd.link && currentAd.link.startsWith('/')) {
      navigate(currentAd.link);
    } else if (currentAd.propertyId) {
      navigate(`/property/${currentAd.propertyId}`);
    } else if (currentAd.link && currentAd.link.startsWith('http')) {
      window.open(currentAd.link, '_blank');
    } else {
      navigate('/properties');
    }
  };

  const nextSlide = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setDirection(1);
    setCurrentIndex((prev) => (prev + 1) % ads.length);
  };

  const prevSlide = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setDirection(-1);
    setCurrentIndex((prev) => (prev - 1 + ads.length) % ads.length);
  };

  // Touch swipe support
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchEndX.current = null;
    setIsPaused(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    setIsPaused(false);
    if (touchStartX.current === null || touchEndX.current === null) return;
    const diff = touchStartX.current - touchEndX.current;

    if (Math.abs(diff) > 40) {
      if (diff > 0) {
        // Swiped left -> next
        nextSlide();
      } else {
        // Swiped right -> prev
        prevSlide();
      }
    }
    touchStartX.current = null;
    touchEndX.current = null;
  };

  // Slide animation variants for 2-3 sec smooth horizontal scroll
  const slideVariants = {
    enter: (dir: number) => ({
      x: dir > 0 ? '100%' : '-100%',
      opacity: 0.4
    }),
    center: {
      x: '0%',
      opacity: 1,
      transition: {
        x: { type: 'spring' as const, stiffness: 300, damping: 32 },
        opacity: { duration: 0.35 }
      }
    },
    exit: (dir: number) => ({
      x: dir > 0 ? '-100%' : '100%',
      opacity: 0.4,
      transition: {
        x: { type: 'spring' as const, stiffness: 300, damping: 32 },
        opacity: { duration: 0.35 }
      }
    })
  };

  return (
    <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 md:px-12 my-6 sm:my-8 text-left">
      {/* Banner Card Container with Smooth Carousel */}
      <div
        className="relative w-full rounded-3xl overflow-hidden shadow-2xl border border-slate-200/90 bg-slate-950 text-white cursor-pointer select-none group"
        onClick={handleNavigate}
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Banner Slide Frame */}
        <div className="relative aspect-[16/9] sm:aspect-[21/9] md:aspect-[24/8] w-full overflow-hidden bg-slate-900">
          <AnimatePresence initial={false} custom={direction} mode="popLayout">
            <motion.div
              key={currentAd.id || currentIndex}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              className="absolute inset-0 w-full h-full"
            >
              {/* Image */}
              <img
                src={adImage}
                alt={displayTitle || 'Poster'}
                className="w-full h-full object-cover object-center"
                onError={(e: any) => {
                  e.target.src = '/hero-background.jpg';
                }}
              />

              {/* Gradient Overlays */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/50 to-black/30 pointer-events-none" />
              <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/50 to-transparent pointer-events-none" />

              {/* Top Badges */}
              <div className="absolute top-3.5 sm:top-5 left-3.5 sm:left-6 right-3.5 sm:right-6 flex items-center justify-between z-10 pointer-events-none">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-full bg-white/20 border border-white/30 text-white text-[10px] sm:text-xs font-black uppercase tracking-widest backdrop-blur-md flex items-center gap-1.5 shadow-sm">
                    <Sparkles className="w-3 h-3 text-amber-300" />
                    <span>{currentAd.brandBadge || 'SAHYADRI SIGNATURE'}</span>
                  </span>
                  {ads.length > 1 && (
                    <span className="px-2 py-0.5 rounded-full bg-black/50 text-white/90 text-[10px] font-bold backdrop-blur-md border border-white/20">
                      {currentIndex + 1} / {ads.length}
                    </span>
                  )}
                </div>

                {displayOfferBadge && (
                  <span className="px-2.5 py-1 rounded-full bg-gradient-to-r from-red-600 to-rose-600 text-white text-[10px] sm:text-xs font-black uppercase tracking-wider shadow-lg shadow-red-600/30 animate-pulse">
                    {displayOfferBadge}
                  </span>
                )}
              </div>

              {/* Content Area */}
              <div className="absolute bottom-3.5 sm:bottom-6 left-3.5 sm:left-6 right-3.5 sm:right-6 z-10 space-y-1 sm:space-y-1.5 text-left pointer-events-none max-w-2xl">
                {currentAd.preTitle && (
                  <div className="text-[10px] sm:text-xs font-black tracking-widest uppercase text-amber-400 drop-shadow-sm flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                    <span>{currentAd.preTitle}</span>
                  </div>
                )}

                <h3 className="text-base sm:text-2xl md:text-3xl font-black text-white leading-tight uppercase line-clamp-2 drop-shadow-md">
                  {displayTitle}
                </h3>

                {displaySubtitle && (
                  <p className="text-xs sm:text-sm md:text-base font-bold text-amber-200/90 line-clamp-1 drop-shadow-sm">
                    {displaySubtitle}
                  </p>
                )}

                {/* Action CTA Button */}
                <div className="pt-1 sm:pt-2">
                  <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-[11px] sm:text-xs font-black uppercase tracking-wider shadow-lg shadow-orange-500/30 transition-transform group-hover:scale-105 pointer-events-auto">
                    <span>{t('advertisements.viewProperty', 'मालमत्ता पहा')}</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </span>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Desktop & Mobile Navigation Buttons */}
          {ads.length > 1 && (
            <>
              <button
                type="button"
                onClick={prevSlide}
                className="absolute left-2.5 sm:left-4 top-1/2 -translate-y-1/2 z-20 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-black/50 hover:bg-black/80 backdrop-blur-md text-white flex items-center justify-center transition-all cursor-pointer border border-white/20 active:scale-95"
                title={t('advertisements.previousPoster', 'मागील पोस्टर')}
              >
                <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
              <button
                type="button"
                onClick={nextSlide}
                className="absolute right-2.5 sm:right-4 top-1/2 -translate-y-1/2 z-20 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-black/50 hover:bg-black/80 backdrop-blur-md text-white flex items-center justify-center transition-all cursor-pointer border border-white/20 active:scale-95"
                title={t('advertisements.nextPoster', 'पुढील पोस्टर')}
              >
                <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </>
          )}

          {/* Pagination Dots with smooth indicator */}
          {ads.length > 1 && (
            <div className="absolute bottom-3 right-4 z-20 flex items-center gap-1.5 pointer-events-auto bg-black/40 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/10">
              {ads.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDirection(idx > currentIndex ? 1 : -1);
                    setCurrentIndex(idx);
                  }}
                  className={`h-2 rounded-full transition-all cursor-pointer ${
                    currentIndex === idx ? 'w-6 bg-orange-500 shadow-sm' : 'w-2 bg-white/40 hover:bg-white/70'
                  }`}
                  title={`${t('advertisements.poster', 'पोस्टर')} ${idx + 1}`}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Interactive Search Bar below Banner (matching mobile app preview in admin) */}
      <div
        onClick={() => navigate('/properties')}
        className="mt-3 bg-white border border-slate-200/90 hover:border-orange-400 rounded-2xl px-4 py-3 flex items-center justify-between text-xs text-slate-500 shadow-sm cursor-pointer transition-all hover:shadow-md group/search"
      >
        <div className="flex items-center gap-2.5">
          <Search className="w-4 h-4 text-orange-500 group-hover/search:scale-110 transition-transform" />
          <span className="font-semibold text-slate-700">{t('advertisements.searchPlaceholder', 'शोधा "सांगली, कोल्हापूर, 2 BHK, फ्लॅट, कमर्शियल प्लॉट..."')}</span>
        </div>
        <div className="flex items-center gap-1.5 text-orange-600 font-bold text-[11px] group-hover/search:translate-x-1 transition-transform">
          <span>{t('advertisements.search', 'शोधा')}</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </div>
      </div>
    </section>
  );
};
