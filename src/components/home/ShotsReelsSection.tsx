import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Play,
  Volume2,
  VolumeX,
  X,
  Phone,
  MessageCircle,
  MapPin,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Smartphone,
  Clapperboard
} from 'lucide-react';
import { subscribeToCollection } from '../../services/firebase';
import { UniversalVideoPlayer } from '../common/UniversalVideoPlayer';
import { getYouTubeId, parseVideoUrl } from '../../utils/videoHelper';

interface ShotItem {
  id: string;
  title: string;
  titleMr?: string;
  description?: string;
  videoUrl: string;
  hlsUrl?: string;
  directPlayUrl?: string;
  bunnyVideoId?: string;
  thumbnailUrl?: string;
  propertyId?: string;
  propertyCode?: string;
  price?: string;
  location?: string;
  contactNumber?: string;
  whatsappNumber?: string;
  status?: string;
  views?: number;
  createdAt?: string;
}

export const ShotsReelsSection: React.FC = () => {
  const { t, i18n } = useTranslation();
  const isMr = Boolean(i18n.language?.startsWith('mr'));
  const navigate = useNavigate();
  const [shots, setShots] = useState<ShotItem[]>([]);
  const [activeShotIndex, setActiveShotIndex] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true); // Default muted so mobile browsers allow instant autoplay without blocking
  const [videoError, setVideoError] = useState(false);
  const modalVideoRef = useRef<HTMLVideoElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const lastWheelTime = useRef<number>(0);

  const touchStartY = useRef<number | null>(null);
  const touchEndY = useRef<number | null>(null);
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);

  const getThumbnail = (shot: ShotItem) => {
    const ytId = getYouTubeId(shot.videoUrl);
    if (ytId) {
      return `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`;
    }
    if (shot.thumbnailUrl && !shot.thumbnailUrl.startsWith('data:') && !shot.thumbnailUrl.includes('unsplash.com')) {
      return shot.thumbnailUrl;
    }
    if (shot.thumbnailUrl && shot.thumbnailUrl.startsWith('data:')) {
      return shot.thumbnailUrl;
    }
    if (shot.videoUrl && shot.videoUrl.includes('b-cdn.net')) {
      return shot.videoUrl.replace(/\/play_[^/]+\.mp4$/i, '/thumbnail.jpg');
    }
    if (shot.videoUrl && shot.videoUrl.includes('cloudinary.com') && shot.videoUrl.endsWith('.mp4')) {
      return shot.videoUrl.replace(/\.mp4$/i, '.jpg');
    }
    return shot.thumbnailUrl || '/hero-background.jpg';
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
    touchStartX.current = e.touches[0].clientX;
    touchEndY.current = null;
    touchEndX.current = null;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndY.current = e.touches[0].clientY;
    touchEndX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (touchStartY.current === null || touchEndY.current === null) return;
    const diffY = touchStartY.current - touchEndY.current;
    const diffX = (touchStartX.current || 0) - (touchEndX.current || 0);

    // Swipe threshold 35px
    if (Math.abs(diffY) > 35 && Math.abs(diffY) > Math.abs(diffX)) {
      if (diffY > 0) {
        // Swiped UP -> Next reel
        setActiveShotIndex((prev) => (prev !== null ? (prev + 1) % shots.length : 0));
      } else {
        // Swiped DOWN -> Previous reel
        setActiveShotIndex((prev) => (prev !== null ? (prev - 1 + shots.length) % shots.length : 0));
      }
    } else if (Math.abs(diffX) > 40) {
      if (diffX > 0) {
        // Swiped LEFT -> Next reel
        setActiveShotIndex((prev) => (prev !== null ? (prev + 1) % shots.length : 0));
      } else {
        // Swiped RIGHT -> Previous reel
        setActiveShotIndex((prev) => (prev !== null ? (prev - 1 + shots.length) % shots.length : 0));
      }
    }

    touchStartY.current = null;
    touchEndY.current = null;
    touchStartX.current = null;
    touchEndX.current = null;
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (shots.length <= 1) return;
    const now = Date.now();
    if (now - lastWheelTime.current < 400) return;
    if (Math.abs(e.deltaY) > 20) {
      lastWheelTime.current = now;
      if (e.deltaY > 0) {
        // Scroll down -> next video
        setActiveShotIndex((prev) => (prev !== null ? (prev + 1) % shots.length : 0));
      } else {
        // Scroll up -> previous video
        setActiveShotIndex((prev) => (prev !== null ? (prev - 1 + shots.length) % shots.length : 0));
      }
    }
  };

  // Subscribe to ALL shot collections and merge them so no video is ever missed
  useEffect(() => {
    let shortsList: any[] = [];
    let shots99List: any[] = [];
    let legacyShotsList: any[] = [];
    let singularShortsList: any[] = [];

    const parseTime = (val: any) => {
      if (!val) return 0;
      if (typeof val?.toMillis === 'function') return val.toMillis();
      if (typeof val?.toDate === 'function') return val.toDate().getTime();
      if (typeof val?.seconds === 'number') return val.seconds * 1000;
      if (typeof val === 'number') return val;
      const p = new Date(val).getTime();
      return isNaN(p) ? 0 : p;
    };

    const updateCombined = () => {
      const map = new Map<string, ShotItem>();
      [...legacyShotsList, ...shots99List, ...shortsList, ...singularShortsList].forEach((item: any) => {
        if (!item) return;
        const video = (item.videoUrl || item.video_url || item.video || item.url || item.mediaUrl || item.media_url || '').trim();
        const thumb = item.thumbnailUrl || item.thumbnail_url || item.thumbnail || item.image || item.imageUrl || item.poster || '';
        const id = String(item.id || video || Math.random());

        const norm: ShotItem = {
          id,
          title: item.title || item.caption || '99. Shot',
          titleMr: item.titleMr || item.title || item.caption,
          description: item.description || '',
          videoUrl: video,
          hlsUrl: item.hlsUrl || item.hls_url || '',
          directPlayUrl: item.directPlayUrl || '',
          bunnyVideoId: item.bunnyVideoId || '',
          thumbnailUrl: thumb,
          propertyId: item.propertyId || item.property_id || '',
          propertyCode: item.propertyCode || item.property_code || '',
          price: item.price || '',
          location: item.location || '',
          contactNumber: item.contactNumber || item.contact_number || item.phone || '8328712712',
          whatsappNumber: item.whatsappNumber || item.whatsapp_number || item.whatsapp || '8328712712',
          status: item.status || (item.active === false || item.isActive === false ? 'hidden' : 'active'),
          views: Number(item.views || 0),
          createdAt: item.createdAt || ''
        };

        const isActive = norm.status !== 'hidden' && norm.status !== 'inactive' && norm.status !== 'draft';
        if (isActive && norm.videoUrl) {
          const dedupeKey = norm.videoUrl ? norm.videoUrl.toLowerCase() : norm.id;
          map.set(dedupeKey, norm);
        }
      });

      const combined = Array.from(map.values()).sort((a: any, b: any) => {
        return parseTime(b.createdAt) - parseTime(a.createdAt);
      });

      setShots(combined);
    };

    const unsub1 = subscribeToCollection('99shorts', (list) => {
      shortsList = list || [];
      updateCombined();
    });

    const unsub2 = subscribeToCollection('99shots', (list) => {
      shots99List = list || [];
      updateCombined();
    });

    const unsub3 = subscribeToCollection('shots', (list) => {
      legacyShotsList = list || [];
      updateCombined();
    });

    const unsub4 = subscribeToCollection('shorts', (list) => {
      singularShortsList = list || [];
      updateCombined();
    });

    return () => {
      if (typeof unsub1 === 'function') unsub1();
      if (typeof unsub2 === 'function') unsub2();
      if (typeof unsub3 === 'function') unsub3();
      if (typeof unsub4 === 'function') unsub4();
    };
  }, []);

  // Listen to open_99_shots custom event from mobile bottom nav
  useEffect(() => {
    const handleOpenShots = () => {
      if (shots.length > 0) {
        setActiveShotIndex(0);
      } else {
        const el = document.getElementById('99-shots-section');
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }
    };
    window.addEventListener('open_99_shots', handleOpenShots);
    return () => window.removeEventListener('open_99_shots', handleOpenShots);
  }, [shots]);

  // Lock body scroll and trigger video play when reel player is open
  useEffect(() => {
    if (activeShotIndex !== null) {
      document.body.style.overflow = 'hidden';
      setVideoError(false);
      setIsPlaying(true);
      const timer = setTimeout(() => {
        if (modalVideoRef.current) {
          modalVideoRef.current.currentTime = 0;
          const playPromise = modalVideoRef.current.play();
          if (playPromise !== undefined) {
            playPromise
              .then(() => setIsPlaying(true))
              .catch((err) => {
                console.warn('Video auto-playback waiting for user tap:', err);
                setIsPlaying(false);
              });
          }
        }
      }, 60);
      return () => clearTimeout(timer);
    } else {
      document.body.style.overflow = '';
      setVideoError(false);
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [activeShotIndex]);

  // Keyboard navigation (Esc to close, Left/Right arrows)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (activeShotIndex === null) return;
      if (e.key === 'Escape') setActiveShotIndex(null);
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        setActiveShotIndex((prev) => (prev !== null ? (prev + 1) % shots.length : 0));
      }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        setActiveShotIndex((prev) => (prev !== null ? (prev - 1 + shots.length) % shots.length : 0));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeShotIndex, shots.length]);

  if (!shots || shots.length === 0) {
    return null;
  }

  const activeShot = activeShotIndex !== null ? shots[activeShotIndex] : null;

  const scrollLeft = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: -280, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: 280, behavior: 'smooth' });
    }
  };

  return (
    <section id="99-shots-section" className="w-full max-w-7xl mx-auto px-4 sm:px-6 md:px-12 my-10 sm:my-16 text-left">
      {/* Section Header */}
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-red-600 text-white shadow-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              99. SHOTS
            </span>
            <span className="text-xs uppercase tracking-[0.2em] font-bold text-orange-600 font-serif">
              {t('shots.videoReels', 'व्हिडिओ रील्स')}
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1 flex items-center gap-2">
            <span>{t('shots.videoTours', 'मालमत्ता व्हिडिओ टूर्स (Reels)')}</span>
            <Clapperboard className="w-6 h-6 text-red-600" />
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            {t('shots.videoToursSubtitle', 'घरबसल्या पहा लोकप्रिय मालमत्तांचे व्हर्च्युअल शॉर्ट व्हिडिओ आणि थेट एजंटशी संपर्क साधा.')}
          </p>
        </div>

        {/* Carousel Controls (Mobile + Desktop) */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-500 mr-1">({shots.length} {t('shots.videosCount', 'व्हिडिओ')})</span>
          <button
            type="button"
            onClick={scrollLeft}
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 flex items-center justify-center transition-all cursor-pointer shadow-xs active:scale-95"
            title={t('shots.scrollLeft', 'मागे स्क्रोल करा')}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={scrollRight}
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 flex items-center justify-center transition-all cursor-pointer shadow-xs active:scale-95"
            title={t('shots.scrollRight', 'पुढे स्क्रोल करा')}
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Horizontal Reel Cards Container */}
      <div
        ref={scrollContainerRef}
        className="flex gap-4 sm:gap-5 overflow-x-auto pb-4 no-scrollbar scroll-smooth snap-x snap-mandatory"
      >
        {shots.map((shot, idx) => {
          const displayTitle = isMr ? (shot.titleMr || shot.title) : (shot.title || shot.titleMr);
          const poster = getThumbnail(shot);

          return (
            <motion.div
              key={shot.id || idx}
              whileHover={{ scale: 1.03, y: -4 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setActiveShotIndex(idx)}
              className="relative flex-shrink-0 w-[170px] sm:w-[220px] aspect-[9/16] rounded-3xl overflow-hidden cursor-pointer shadow-md hover:shadow-xl border border-slate-200 bg-slate-900 group select-none snap-start"
            >
              {/* Thumbnail / Video Poster */}
              <img
                src={poster}
                alt={displayTitle}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                onError={(e: any) => {
                  e.target.src = '/hero-background.jpg';
                }}
              />

              {/* Gradient Overlays */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-black/40" />

              {/* Top Badges */}
              <div className="absolute top-3 left-3 right-3 flex items-center justify-between z-10">
                <span className="px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-md text-white text-[9px] font-black tracking-wider uppercase border border-white/20 flex items-center gap-1">
                  <Smartphone className="w-2.5 h-2.5 text-red-500" />
                  99. shots
                </span>
                {shot.propertyCode && (
                  <span className="px-1.5 py-0.5 rounded bg-white/20 backdrop-blur-md text-white text-[8px] font-mono font-bold">
                    {shot.propertyCode}
                  </span>
                )}
              </div>

              {/* Center Play Button Overlay */}
              <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
                <div className="w-12 h-12 rounded-full bg-red-600/90 text-white flex items-center justify-center shadow-lg shadow-red-600/50 backdrop-blur-xs transition-transform duration-300 group-hover:scale-115">
                  <Play className="w-5 h-5 fill-white ml-0.5" />
                </div>
              </div>

              {/* Bottom Card Content */}
              <div className="absolute bottom-3 left-3 right-3 z-10 space-y-1 text-white text-left pointer-events-none">
                {shot.price && (
                  <span className="inline-block px-2 py-0.5 rounded-md bg-amber-500 text-slate-950 font-black text-[10px] shadow-sm">
                    {shot.price}
                  </span>
                )}

                <h3 className="text-xs sm:text-sm font-black text-white leading-tight line-clamp-2 drop-shadow-md">
                  {displayTitle}
                </h3>

                {shot.location && (
                  <div className="flex items-center gap-1 text-[10px] text-slate-300 font-bold drop-shadow-sm truncate">
                    <MapPin className="w-3 h-3 text-red-400 shrink-0" />
                    <span className="truncate">{shot.location}</span>
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* FULLSCREEN REEL PLAYER MODAL */}
      <AnimatePresence>
        {activeShot && (
          <div
            className="fixed inset-0 z-[999999] flex items-center justify-center p-0 sm:p-4 bg-black/90 backdrop-blur-md"
            onWheel={handleWheel}
          >
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setActiveShotIndex(null)}
              className="absolute inset-0 cursor-pointer"
            />

            {/* Reel Smartphone Player Container */}
            <motion.div
              initial={{ scale: 0.92, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.92, opacity: 0, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              onWheel={handleWheel}
              className="relative w-full max-w-md h-full sm:h-[85vh] sm:max-h-[740px] bg-black sm:rounded-[36px] overflow-hidden shadow-2xl z-10 flex flex-col border border-slate-800"
            >
              {/* Top Bar Header */}
              <div className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between px-4 sm:px-6 pt-3 pb-2 text-white bg-gradient-to-b from-black/80 to-transparent">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-full bg-red-600 text-white text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shadow-md">
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                    99. shots
                  </span>
                  <span className="text-[10px] font-bold text-white/90 bg-white/20 px-2 py-0.5 rounded-md backdrop-blur-md">
                    {(activeShotIndex ?? 0) + 1} / {shots.length}
                  </span>
                  {activeShot.propertyCode && (
                    <span className="text-[10px] font-mono text-slate-300 bg-white/10 px-2 py-0.5 rounded-md">
                      {activeShot.propertyCode}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {/* Sound Toggle */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsMuted(!isMuted);
                    }}
                    className="w-8 h-8 rounded-full bg-black/60 backdrop-blur-md text-white flex items-center justify-center hover:bg-black/80 transition-colors cursor-pointer"
                    title={isMuted ? t('shots.unmute', 'आवाज सुरू करा') : t('shots.mute', 'आवाज बंद करा')}
                  >
                    {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-white" />}
                  </button>

                  {/* Close Button */}
                  <button
                    type="button"
                    onClick={() => setActiveShotIndex(null)}
                    className="w-8 h-8 rounded-full bg-black/60 backdrop-blur-md text-white flex items-center justify-center hover:bg-red-600 transition-colors cursor-pointer"
                    title={t('shots.close', 'बंद करा (Close)')}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Video Element with Touch Swipe and Wheel Handling */}
              <div
                className="relative flex-1 w-full h-full bg-black flex items-center justify-center cursor-pointer select-none"
                onWheel={handleWheel}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
              >
                {/* Swipe up hint on mobile */}
                {shots.length > 1 && (
                  <div className="sm:hidden absolute top-14 left-1/2 -translate-x-1/2 z-20 pointer-events-none text-[10px] font-bold bg-black/60 backdrop-blur-xs text-white/90 px-3 py-1 rounded-full flex items-center gap-1.5 shadow-md">
                    <span>{t('shots.swipeUpHint', 'पुढील रीलसाठी वर स्वाइप करा')}</span>
                    <ChevronUp className="w-3.5 h-3.5 animate-bounce text-red-400" />
                  </div>
                )}

                <UniversalVideoPlayer
                  videoRef={modalVideoRef}
                  url={activeShot.videoUrl}
                  poster={getThumbnail(activeShot)}
                  autoPlay={isPlaying}
                  muted={isMuted}
                  loop
                  className="w-full h-full object-cover"
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                  onError={() => {
                    console.warn('Video failed to play:', activeShot.videoUrl);
                    setVideoError(true);
                  }}
                />

                {/* Gesture, Swipe & Wheel overlay to guarantee swipe & scroll detection over iframes */}
                <div
                  className="absolute inset-0 z-10 cursor-pointer"
                  onTouchStart={handleTouchStart}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={handleTouchEnd}
                  onWheel={handleWheel}
                  onClick={() => {
                    if (parseVideoUrl(activeShot.videoUrl).type === 'direct') {
                      if (modalVideoRef.current) {
                        if (isPlaying) {
                          modalVideoRef.current.pause();
                          setIsPlaying(false);
                        } else {
                          modalVideoRef.current.play();
                          setIsPlaying(true);
                        }
                      }
                    } else {
                      setIsMuted((prev) => !prev);
                    }
                  }}
                />

                {/* Unmute prompt banner on mobile (for direct videos) */}
                {isMuted && !videoError && parseVideoUrl(activeShot.videoUrl).type === 'direct' && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsMuted(false);
                      if (modalVideoRef.current) {
                        modalVideoRef.current.muted = false;
                        modalVideoRef.current.play().catch(() => {});
                      }
                    }}
                    className="absolute top-14 left-4 z-20 px-3 py-1 rounded-full bg-black/70 backdrop-blur-md text-white text-[10px] font-extrabold flex items-center gap-1.5 shadow-lg border border-white/20 active:scale-95 transition-transform cursor-pointer"
                  >
                    <VolumeX className="w-3.5 h-3.5 text-amber-400" />
                    <span>{t('shots.tapForSound', 'आवाज सुरू करा (Tap for Sound)')}</span>
                  </button>
                )}

                {/* If direct video encounters error, fallback to Bunny Stream official web player */}
                {videoError && (activeShot.directPlayUrl || activeShot.bunnyVideoId) ? (
                  <div className="absolute inset-0 z-20 bg-black flex items-center justify-center">
                    <iframe
                      src={`${activeShot.directPlayUrl || `https://iframe.mediadelivery.net/play/766382/${activeShot.bunnyVideoId}`}?autoplay=true&loop=true&muted=true&preload=true`}
                      loading="lazy"
                      className="w-full h-full border-0"
                      allow="accelerometer;gyroscope;autoplay;encrypted-media;picture-in-picture;"
                      allowFullScreen
                    />
                  </div>
                ) : videoError ? (
                  <div className="absolute inset-0 z-20 bg-black/85 flex flex-col items-center justify-center p-6 text-center text-white space-y-3">
                    <p className="text-sm font-bold text-amber-300">
                      {t('shots.videoLoadError', 'हा व्हिडिओ लोड होऊ शकला नाही (किंवा अजून एन्कोड होत आहे).')}
                    </p>
                    <a
                      href={activeShot.videoUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-lg"
                    >
                      {t('shots.openDirectLink', 'थेट व्हिडिओ लिंक उघडा')}
                    </a>
                  </div>
                ) : null}

                {/* Big Center Play Indicator if paused (for direct video only) */}
                {!isPlaying && !videoError && parseVideoUrl(activeShot.videoUrl).type === 'direct' && (
                  <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
                    <div className="w-16 h-16 rounded-full bg-black/70 text-white flex items-center justify-center shadow-xl backdrop-blur-xs">
                      <Play className="w-8 h-8 fill-white ml-1" />
                    </div>
                  </div>
                )}

                {/* Previous & Next Floating Buttons for Reels */}
                {shots.length > 1 && (
                  <>
                    {/* Desktop horizontal buttons */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveShotIndex((prev) => (prev !== null ? (prev - 1 + shots.length) % shots.length : 0));
                      }}
                      className="hidden sm:flex absolute left-3 top-1/2 -translate-y-1/2 z-30 w-11 h-11 rounded-full bg-black/60 hover:bg-black/90 text-white items-center justify-center backdrop-blur-xs transition-colors cursor-pointer border border-white/20 shadow-xl"
                      title={t('shots.previousReel', 'मागील रील')}
                    >
                      <ChevronLeft className="w-6 h-6" />
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveShotIndex((prev) => (prev !== null ? (prev + 1) % shots.length : 0));
                      }}
                      className="hidden sm:flex absolute right-3 top-1/2 -translate-y-1/2 z-30 w-11 h-11 rounded-full bg-black/60 hover:bg-black/90 text-white items-center justify-center backdrop-blur-xs transition-colors cursor-pointer border border-white/20 shadow-xl"
                      title={t('shots.nextReel', 'पुढील रील')}
                    >
                      <ChevronRight className="w-6 h-6" />
                    </button>

                    {/* Mobile vertical up/down buttons */}
                    <div className="sm:hidden absolute right-3 top-1/2 -translate-y-1/2 z-30 flex flex-col gap-3 pointer-events-auto">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveShotIndex((prev) => (prev !== null ? (prev - 1 + shots.length) % shots.length : 0));
                        }}
                        className="w-11 h-11 rounded-full bg-black/70 active:bg-black text-white flex items-center justify-center border border-white/30 shadow-xl active:scale-90 transition-transform cursor-pointer"
                        title={t('shots.previousReel', 'मागील व्हिडिओ (Previous Reel)')}
                      >
                        <ChevronUp className="w-6 h-6" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveShotIndex((prev) => (prev !== null ? (prev + 1) % shots.length : 0));
                        }}
                        className="w-11 h-11 rounded-full bg-black/70 active:bg-black text-white flex items-center justify-center border border-white/30 shadow-xl active:scale-90 transition-transform cursor-pointer"
                        title={t('shots.nextReel', 'पुढील व्हिडिओ (Next Reel)')}
                      >
                        <ChevronDown className="w-6 h-6" />
                      </button>
                    </div>
                  </>
                )}

                {/* Reel Bottom Details Overlay */}
                <div
                  className="absolute bottom-0 left-0 right-0 p-4 sm:p-5 bg-gradient-to-t from-black via-black/80 to-transparent text-white space-y-2.5 z-20 text-left pointer-events-auto"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center gap-2">
                    {activeShot.price && (
                      <span className="px-2.5 py-0.5 rounded-lg bg-amber-500 text-slate-950 font-black text-xs shadow-md">
                        {activeShot.price}
                      </span>
                    )}
                    {activeShot.location && (
                      <span className="flex items-center gap-1 text-xs text-slate-200 font-bold">
                        <MapPin className="w-3.5 h-3.5 text-red-500" />
                        <span>{activeShot.location}</span>
                      </span>
                    )}
                  </div>

                  <div>
                    <h2 className="text-base sm:text-lg font-black text-white leading-tight drop-shadow-md">
                      {isMr ? (activeShot.titleMr || activeShot.title) : (activeShot.title || activeShot.titleMr)}
                    </h2>
                    {activeShot.description && (
                      <p className="text-xs text-slate-300 mt-1 line-clamp-2 drop-shadow-sm font-medium">
                        {activeShot.description}
                      </p>
                    )}
                  </div>

                  {/* Call to Action Buttons */}
                  <div className="flex items-center gap-2 pt-1">
                    {activeShot.contactNumber && (
                      <a
                        href={`tel:${activeShot.contactNumber}`}
                        className="flex-1 py-2.5 px-3 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-black flex items-center justify-center gap-1.5 shadow-lg shadow-red-600/40 transition-transform active:scale-95"
                      >
                        <Phone className="w-3.5 h-3.5" />
                        <span>{t('shots.callNow', 'कॉल करा')}</span>
                      </a>
                    )}

                    {activeShot.whatsappNumber && (
                      <a
                        href={`https://wa.me/91${activeShot.whatsappNumber}`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex-1 py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-600/40 transition-transform active:scale-95"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        <span>{t('shots.whatsapp', 'व्हॉट्सॲप')}</span>
                      </a>
                    )}

                    {activeShot.propertyId && (
                      <button
                        type="button"
                        onClick={() => {
                          setActiveShotIndex(null);
                          navigate(`/property/${activeShot.propertyId}`);
                        }}
                        className="py-2.5 px-3 bg-white/20 hover:bg-white/30 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
                        title={t('shots.viewFullDetails', 'मालमत्तेचे संपूर्ण तपशील पहा')}
                      >
                        {t('shots.details', 'तपशील')}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </section>
  );
};
