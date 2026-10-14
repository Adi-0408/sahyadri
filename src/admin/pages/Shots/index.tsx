import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Clapperboard,
  Plus,
  Edit2,
  Trash2,
  Eye,
  EyeOff,
  Play,
  Volume2,
  VolumeX,
  Smartphone,
  Phone,
  MessageCircle,
  MapPin,
  CheckCircle2,
  X,
  Search
} from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Dialog } from '../../../components/ui/Dialog';
import { Select } from '../../../components/ui/Select';
import {
  fetchCollection,
  subscribeToCollection,
  saveShortVideo,
  deleteShortVideo,
  toggleShortVideoStatus
} from '../../../services/firebase';
import { UniversalVideoPlayer } from '../../../components/common/UniversalVideoPlayer';
import { parseVideoUrl, getAutoThumbnail } from '../../../utils/videoHelper';


export const ShotsManager: React.FC = () => {
  const { t, i18n } = useTranslation();
  const isMr = Boolean(i18n.language?.startsWith('mr'));

  // Data States
  const [shots, setShots] = useState<any[]>([]);
  const [properties, setProperties] = useState<any[]>([]);
  const [districts, setDistricts] = useState<any[]>([]);
  const [talukas, setTalukas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'hidden'>('all');

  // Form Modal State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingShot, setEditingShot] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form Fields
  const [title, setTitle] = useState('');
  const [titleMr, setTitleMr] = useState('');
  const [description, setDescription] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [selectedPropertyId, setSelectedPropertyId] = useState('');
  const [propertyCode, setPropertyCode] = useState('');
  const [price, setPrice] = useState('');
  const [location, setLocation] = useState('');
  const [district, setDistrict] = useState('');
  const [taluka, setTaluka] = useState('');
  const [contactNumber, setContactNumber] = useState('8328712712');
  const [whatsappNumber, setWhatsappNumber] = useState('8328712712');
  const [status, setStatus] = useState<'active' | 'hidden'>('active');

  // Fullscreen Reel Preview Modal
  const [previewShot, setPreviewShot] = useState<any>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const previewVideoRef = useRef<HTMLVideoElement>(null);

  // Load properties and initial shots
  useEffect(() => {
    const loadDependencies = async () => {
      try {
        const [propsList, distList, talList] = await Promise.all([
          fetchCollection('properties'),
          fetchCollection('districts'),
          fetchCollection('talukas')
        ]);
        setProperties(propsList || []);
        setDistricts(distList || []);
        setTalukas(talList || []);
      } catch (err) {
        console.error('Error loading dependencies for shots:', err);
      }
    };
    loadDependencies();

    // Subscribe to live video collections and merge so no video is ever missed
    let s1: any[] = [];
    let s2: any[] = [];
    let s3: any[] = [];
    let s4: any[] = [];

    const parseTime = (val: any) => {
      if (!val) return 0;
      if (typeof val?.toMillis === 'function') return val.toMillis();
      if (typeof val?.toDate === 'function') return val.toDate().getTime();
      if (typeof val?.seconds === 'number') return val.seconds * 1000;
      if (typeof val === 'number') return val;
      const p = new Date(val).getTime();
      return isNaN(p) ? 0 : p;
    };

    const updateAdminShots = () => {
      const map = new Map<string, any>();
      [...s4, ...s3, ...s2, ...s1].forEach((item: any) => {
        if (!item) return;
        const vUrl = (item.videoUrl || item.video || item.mediaUrl || item.url || '').trim();
        const key = vUrl ? vUrl.toLowerCase() : (item.id || '');
        if (key) map.set(key, item);
      });
      const sorted = Array.from(map.values()).sort((a: any, b: any) => {
        return parseTime(b.createdAt) - parseTime(a.createdAt);
      });
      setShots(sorted);
      setLoading(false);
    };

    const unsub1 = subscribeToCollection('99shorts', (list) => {
      s1 = list || [];
      updateAdminShots();
    });

    const unsub2 = subscribeToCollection('shots', (list) => {
      s2 = list || [];
      updateAdminShots();
    });

    const unsub3 = subscribeToCollection('99shots', (list) => {
      s3 = list || [];
      updateAdminShots();
    });

    const unsub4 = subscribeToCollection('shorts', (list) => {
      s4 = list || [];
      updateAdminShots();
    });

    return () => {
      if (typeof unsub1 === 'function') unsub1();
      if (typeof unsub2 === 'function') unsub2();
      if (typeof unsub3 === 'function') unsub3();
      if (typeof unsub4 === 'function') unsub4();
    };
  }, []);

  // Filtered talukas based on district
  const filteredTalukas = talukas.filter(
    (item) => !district || item.districtId === district || item.district === district
  );

  // Property Selection Helper
  const handlePropertySelect = (propId: string) => {
    setSelectedPropertyId(propId);
    if (!propId) return;

    const prop = properties.find((p) => p.id === propId);
    if (prop) {
      if (!title) setTitle(prop.title || prop.propertyName || '');
      if (!titleMr && prop.titleMr) setTitleMr(prop.titleMr);
      setPropertyCode(prop.propertyCode || '');
      if (!price) {
        const pVal = prop.expectedPrice || prop.monthlyRent || prop.price;
        setPrice(pVal ? `₹${Number(pVal).toLocaleString('en-IN')}` : '');
      }
      if (!location) setLocation(prop.cityVillage || prop.location || '');
      if (!district && prop.district) setDistrict(prop.district);
      if (!taluka && prop.taluka) setTaluka(prop.taluka);
      if (prop.mobileNumber) {
        setContactNumber(prop.mobileNumber);
        setWhatsappNumber(prop.mobileNumber);
      }
      if (!thumbnailUrl && prop.images && prop.images.length > 0) {
        setThumbnailUrl(prop.images[0]);
      }
    }
  };

  const handleOpenAdd = () => {
    setEditingShot(null);
    setTitle('');
    setTitleMr('');
    setDescription('');
    setVideoUrl('');
    setThumbnailUrl('');
    setSelectedPropertyId('');
    setPropertyCode('');
    setPrice('');
    setLocation('');
    setDistrict(districts[0]?.name || 'Sangli');
    setTaluka('');
    setContactNumber('8328712712');
    setWhatsappNumber('8328712712');
    setStatus('active');
    setIsFormOpen(true);
  };

  const handleOpenEdit = (shot: any) => {
    setEditingShot(shot);
    setTitle(shot.title || shot.caption || '');
    setTitleMr(shot.titleMr || '');
    setDescription(shot.description || '');
    setVideoUrl(shot.videoUrl || shot.video || shot.mediaUrl || shot.url || '');
    setThumbnailUrl(shot.thumbnailUrl || shot.thumbnail || shot.image || shot.imageUrl || shot.poster || '');
    setSelectedPropertyId(shot.propertyId || shot.property_id || '');
    setPropertyCode(shot.propertyCode || shot.property_code || '');
    setPrice(shot.price || '');
    setLocation(shot.location || '');
    setDistrict(shot.district || '');
    setTaluka(shot.taluka || '');
    setContactNumber(shot.contactNumber || shot.contact_number || '8328712712');
    setWhatsappNumber(shot.whatsappNumber || shot.whatsapp_number || '8328712712');
    setStatus(shot.status || 'active');
    setIsFormOpen(true);
  };

  const handleToggleStatus = async (shot: any, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await toggleShortVideoStatus(shot);
    } catch (err) {
      console.error('Error toggling status:', err);
    }
  };

  const handleDelete = async (shot: any, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm(t('shots.confirmDelete', 'तुम्हाला खात्री आहे का की हा शॉट हटवायचा आहे? हे मोबाईल ॲपमधूनही काढले जाईल.'))) {
      return;
    }
    const shotId = typeof shot === 'string' ? shot : shot.id;
    const vUrl = typeof shot === 'object' ? (shot.videoUrl || shot.video || shot.mediaUrl || shot.url || '') : '';
    // Optimistic removal from UI so user immediately sees it removed
    setShots((prev) => prev.filter((s) => s.id !== shotId && (!vUrl || (s.videoUrl || s.video || s.mediaUrl || s.url || '') !== vUrl)));
    try {
      await deleteShortVideo(shotId, vUrl);
    } catch (err) {
      console.error('Error deleting shot:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      alert('कृपया शॉटचे शीर्षक प्रविष्ट करा (Please enter title)');
      return;
    }
    if (!videoUrl.trim()) {
      alert('कृपया व्हिडिओ URL प्रविष्ट करा (Please provide video URL)');
      return;
    }

    setIsSubmitting(true);
    const payload = {
      id: editingShot?.id || undefined,
      title: title.trim(),
      titleMr: titleMr.trim() || undefined,
      description: description.trim() || undefined,
      videoUrl: videoUrl.trim(),
      thumbnailUrl: thumbnailUrl.trim() || undefined,
      propertyId: selectedPropertyId || undefined,
      propertyCode: propertyCode.trim() || undefined,
      price: price.trim() || undefined,
      location: location.trim() || undefined,
      district: district.trim() || undefined,
      taluka: taluka.trim() || undefined,
      contactNumber: contactNumber.trim() || undefined,
      whatsappNumber: whatsappNumber.trim() || undefined,
      status: status,
      createdAt: editingShot?.createdAt
    };

    try {
      await saveShortVideo(payload);
      setIsFormOpen(false);
    } catch (err) {
      console.error('Failed to save shot:', err);
      alert('शॉट सेव्ह करताना त्रुटी आली. कृपया पुन्हा प्रयत्न करा.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filtered Shots
  const filteredShots = shots.filter((s) => {
    if (statusFilter === 'active' && s.status !== 'active') return false;
    if (statusFilter === 'hidden' && s.status === 'active') return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = (s.title || '').toLowerCase().includes(q);
      const matchTitleMr = (s.titleMr || '').toLowerCase().includes(q);
      const matchLocation = (s.location || '').toLowerCase().includes(q);
      const matchCode = (s.propertyCode || '').toLowerCase().includes(q);
      return matchTitle || matchTitleMr || matchLocation || matchCode;
    }
    return true;
  });

  const totalCount = shots.length;
  const activeCount = shots.filter((s) => s.status === 'active').length;
  const hiddenCount = totalCount - activeCount;

  return (
    <div className="space-y-8 text-left pb-16">
      {/* Top Banner / Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 p-6 md:p-8 rounded-3xl border border-slate-800 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-80 h-80 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="space-y-2 relative z-10">
          <div className="flex items-center gap-2 text-red-500 font-extrabold text-xs uppercase tracking-widest">
            <Smartphone className="w-4 h-4 animate-pulse" />
            <span>{t('shots.appSyncNote', 'मोबाईल ॲप सिंक: 99. shots')}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight flex items-center gap-3">
            <span className="p-2.5 rounded-2xl bg-gradient-to-tr from-red-600 to-rose-500 text-white shadow-lg shadow-red-500/30">
              <Clapperboard className="w-6 h-6" />
            </span>
            <span>99. {t('shots.title', 'शॉट्स व्यवस्थापन')}</span>
          </h1>
          <p className="text-slate-400 text-xs sm:text-sm max-w-2xl">
            {t('shots.subtitle', 'मोबाईल ॲपसाठी शॉर्ट व्हिडिओ (Reels/Shots) जोडा, संपादित करा आणि थेट ॲपवर प्रदर्शित करा.')}
          </p>
        </div>

        <div className="flex items-center gap-3 relative z-10">
          <Button
            onClick={handleOpenAdd}
            className="bg-red-600 hover:bg-red-700 text-white font-bold text-sm px-5 py-3 rounded-xl shadow-lg shadow-red-600/30 flex items-center gap-2 transition-transform active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>{t('shots.addShot', 'नवीन शॉट जोडा')}</span>
          </Button>
        </div>
      </div>


      {/* Stats Counter Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200/80 p-5 rounded-2xl shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs uppercase font-extrabold tracking-wider text-slate-400">
              {t('shots.totalShots', 'एकूण शॉट्स')}
            </span>
            <div className="text-2xl font-black text-slate-800 mt-1">{totalCount}</div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600">
            <Clapperboard className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white border border-emerald-200/80 p-5 rounded-2xl shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs uppercase font-extrabold tracking-wider text-emerald-600">
              {t('shots.activeShots', 'सक्रिय (ॲपवर दिसणारे)')}
            </span>
            <div className="text-2xl font-black text-emerald-700 mt-1">{activeCount}</div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
            <Eye className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 p-5 rounded-2xl shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs uppercase font-extrabold tracking-wider text-slate-400">
              {t('shots.hiddenShots', 'लपवलेले')}
            </span>
            <div className="text-2xl font-black text-slate-600 mt-1">{hiddenCount}</div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500">
            <EyeOff className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Filters & Search Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Status Filter Tabs */}
        <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-bold">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-4 py-2 rounded-lg transition-all cursor-pointer ${
              statusFilter === 'all' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            {isMr ? 'सर्व' : 'All'} ({totalCount})
          </button>
          <button
            onClick={() => setStatusFilter('active')}
            className={`px-4 py-2 rounded-lg transition-all cursor-pointer ${
              statusFilter === 'active' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            {isMr ? 'सक्रिय' : 'Active'} ({activeCount})
          </button>
          <button
            onClick={() => setStatusFilter('hidden')}
            className={`px-4 py-2 rounded-lg transition-all cursor-pointer ${
              statusFilter === 'hidden' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            {isMr ? 'लपवलेले' : 'Hidden'} ({hiddenCount})
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={isMr ? "नाव, कोड किंवा स्थानानुसार शोधा..." : "Search by title, code or location..."}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all"
          />
        </div>
      </div>

      {/* Main Grid: Reels Style 9:16 Cards */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="animate-pulse bg-slate-200 rounded-3xl h-[420px]" />
          ))}
        </div>
      ) : filteredShots.length === 0 ? (
        <div className="bg-white border-2 border-dashed border-slate-200 rounded-3xl p-12 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-red-50 text-red-500 flex items-center justify-center mx-auto">
            <Clapperboard className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-slate-800">
              {t('shots.noShots', 'कोणतेही शॉट्स सापडले नाहीत.')}
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {isMr
                ? 'मोबाईल ॲपमधील 99. shots विभागात दाखवण्यासाठी नवीन रील्स किंवा शॉर्ट व्हिडिओ जोडा.'
                : 'Add new Reels or short video tours to display in the mobile app 99. shots section.'}
            </p>
          </div>
          <Button
            onClick={handleOpenAdd}
            className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-6 py-2.5 rounded-xl cursor-pointer"
          >
            {t('shots.addShot', 'नवीन शॉट जोडा')}
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredShots.map((shot) => {
            const isActive = shot.status === 'active';
            return (
              <div
                key={shot.id}
                onClick={() => setPreviewShot(shot)}
                className="group relative bg-slate-900 rounded-3xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 border border-slate-800 flex flex-col h-[460px] cursor-pointer"
              >
                {/* Reel Video Thumbnail / Poster */}
                <div className="relative flex-1 bg-black overflow-hidden flex items-center justify-center">
                  {shot.videoUrl && parseVideoUrl(shot.videoUrl).type === 'direct' ? (
                    <video
                      src={shot.videoUrl}
                      poster={shot.thumbnailUrl}
                      muted
                      loop
                      playsInline
                      preload="metadata"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      onMouseEnter={(e) => {
                        const target = e.currentTarget;
                        target.play().catch(() => {});
                      }}
                      onMouseLeave={(e) => {
                        const target = e.currentTarget;
                        target.pause();
                        target.currentTime = 0;
                      }}
                    />
                  ) : (
                    <img
                      src={getAutoThumbnail(shot.videoUrl, shot.thumbnailUrl) || '/hero-background.jpg'}
                      alt={shot.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  )}

                  {/* Gradient Vignette Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-black/60 pointer-events-none" />

                  {/* Top Badges */}
                  <div className="absolute top-3 left-3 right-3 flex items-center justify-between z-10">
                    <span
                      onClick={(e) => handleToggleStatus(shot, e)}
                      className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider backdrop-blur-md transition-all cursor-pointer ${
                        isActive
                          ? 'bg-emerald-500/90 text-white shadow-emerald-500/30 shadow-md'
                          : 'bg-slate-700/80 text-slate-300'
                      }`}
                    >
                      {isActive ? '● ' + t('shots.statusActive', 'सक्रिय') : '○ ' + t('shots.statusHidden', 'लपवलेले')}
                    </span>

                    {shot.propertyCode && (
                      <span className="px-2.5 py-1 rounded-full bg-white/20 text-white text-[10px] font-extrabold backdrop-blur-md">
                        {shot.propertyCode}
                      </span>
                    )}
                  </div>

                  {/* Center Play Button Overlay */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-all pointer-events-none">
                    <div className="w-14 h-14 rounded-full bg-red-600/90 text-white flex items-center justify-center shadow-xl shadow-red-600/40 backdrop-blur-sm">
                      <Play className="w-6 h-6 fill-white ml-0.5" />
                    </div>
                  </div>

                  {/* Bottom Info on Reel */}
                  <div className="absolute bottom-3 left-3 right-3 text-white space-y-1.5 z-10 pointer-events-none">
                    {shot.price && (
                      <span className="inline-block px-2.5 py-0.5 rounded-lg bg-amber-500 text-slate-950 font-black text-xs shadow-sm">
                        {shot.price}
                      </span>
                    )}
                    <h3 className="font-extrabold text-sm sm:text-base line-clamp-1 leading-snug drop-shadow-md">
                      {shot.titleMr || shot.title}
                    </h3>
                    {shot.location && (
                      <div className="flex items-center gap-1 text-[11px] text-slate-300 font-medium drop-shadow-sm">
                        <MapPin className="w-3 h-3 text-red-400 shrink-0" />
                        <span className="truncate">{shot.location}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer Controls / Actions */}
                <div className="p-3 bg-slate-950/90 border-t border-slate-800/80 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-3 text-slate-400 font-semibold text-[11px]">
                    <span className="flex items-center gap-1">
                      <Eye className="w-3.5 h-3.5" /> {shot.views || 0}
                    </span>
                    <span className="text-[10px] text-red-400 font-bold bg-red-950/40 px-2 py-0.5 rounded-md border border-red-900/30">
                      99. shots
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenEdit(shot);
                      }}
                      className="p-2 text-slate-300 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
                      title={t('shots.editShot', 'संपादित करा')}
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => handleDelete(shot, e)}
                      className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-colors cursor-pointer"
                      title={t('shots.deleteShot', 'हटवा')}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ADD / EDIT MODAL */}
      <Dialog
        isOpen={isFormOpen}
        onClose={() => !isSubmitting && setIsFormOpen(false)}
        title={
          <div className="flex items-center gap-3">
            <span className="p-2 rounded-xl bg-red-50 text-red-600">
              <Clapperboard className="w-5 h-5" />
            </span>
            <span className="font-extrabold text-lg sm:text-xl text-slate-900">
              {editingShot ? t('shots.editShot', 'शॉट संपादित करा') : t('shots.addShot', 'नवीन शॉट जोडा (99. Shots)')}
            </span>
          </div>
        }
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleSubmit} className="space-y-6 pt-2">
          {/* Quick Property Selector */}
          <div className="bg-red-50/50 p-4 rounded-2xl border border-red-100 space-y-2">
            <label className="text-xs font-black uppercase tracking-wider text-red-900 flex items-center justify-between">
              <span>{t('shots.linkedProperty', 'संबंधित मालमत्ता लिंक करा (पर्यायी)')}</span>
              <span className="text-[10px] text-red-600 normal-case font-medium">
                {isMr ? '(माहिती आपोआप भरली जाईल)' : '(Details will autofill)'}
              </span>
            </label>
            <Select
              value={selectedPropertyId}
              onChange={(e) => handlePropertySelect(e.target.value)}
              options={[
                { value: '', label: t('shots.selectProperty', '-- कोणतीही मालमत्ता निवडा --') },
                ...properties.map((p) => ({
                  value: p.id,
                  label: `[${p.propertyCode || 'P'}] ${p.title || p.propertyName} - ${p.cityVillage || p.district} (${p.expectedPrice || p.monthlyRent || p.price ? `₹${p.expectedPrice || p.monthlyRent || p.price}` : 'No price'})`
                }))
              ]}
              className="py-2.5 text-xs sm:text-sm font-medium"
            />
          </div>

          {/* Direct Video URL */}
          <div className="space-y-1">
            <input
              type="url"
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              placeholder={isMr ? "https://.../video.mp4 (डायरेक्ट MP4 किंवा CDN लिंक)" : "https://.../video.mp4 (Direct MP4 or CDN link)"}
              className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm font-medium focus:ring-2 focus:ring-red-500 focus:outline-none"
            />
            <span className="text-[11px] text-slate-400">
              {isMr
                ? 'Cloudinary, Firebase Storage किंवा कोणत्याही होस्ट केलेल्या MP4 व्हिडिओची लिंक येथे पेस्ट करा.'
                : 'Paste link to Cloudinary, Firebase Storage, or any hosted MP4 video here.'}
            </span>
          </div>

          {/* Video Preview in Form */}
          {videoUrl && (
            <div className="bg-slate-900 rounded-2xl p-3 flex items-center gap-4 text-white">
              <div className="w-20 h-28 bg-black rounded-xl overflow-hidden shrink-0 relative">
                {parseVideoUrl(videoUrl).type !== 'direct' ? (
                  <img
                    src={getAutoThumbnail(videoUrl, thumbnailUrl) || 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=600&q=80'}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <video src={videoUrl} className="w-full h-full object-cover" muted playsInline />
                )}
                <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                  <Play className="w-5 h-5 fill-white text-white" />
                </div>
              </div>
              <div className="flex-1 space-y-1 text-xs">
                <div className="font-extrabold text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" />
                  {parseVideoUrl(videoUrl).type === 'youtube'
                    ? (isMr ? 'YouTube व्हिडिओ लिंक तयार आहे' : 'YouTube video link ready')
                    : (isMr ? 'व्हिडिओ तयार आहे' : 'Video ready')}
                </div>
                <div className="text-[11px] text-slate-400 truncate max-w-xs">{videoUrl}</div>
                <button
                  type="button"
                  onClick={() => setVideoUrl('')}
                  className="text-red-400 hover:text-red-300 text-[11px] font-bold underline cursor-pointer"
                >
                  {isMr ? 'बदला / काढा' : 'Change / Remove'}
                </button>
              </div>
            </div>
          )}

          {/* Titles */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-black uppercase tracking-wider text-slate-600">
                {t('shots.shotTitle', 'शीर्षक (Title)')} *
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t('shots.shotTitlePlaceholder', 'उदा. 2 BHK लक्झरी फ्लॅट - विश्रामबाग')}
                className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm font-medium focus:ring-2 focus:ring-red-500 focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-black uppercase tracking-wider text-slate-600">
                {t('shots.shotTitleMr', 'मराठी शीर्षक (पर्यायी)')}
              </label>
              <input
                type="text"
                value={titleMr}
                onChange={(e) => setTitleMr(e.target.value)}
                placeholder={isMr ? "उदा. २ बीएचके लक्झरी फ्लॅट" : "e.g. 2 BHK Luxury Flat"}
                className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm font-medium focus:ring-2 focus:ring-red-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="text-xs font-black uppercase tracking-wider text-slate-600">
              {t('shots.shotDescription', 'वर्णन (Description)')}
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('shots.shotDescriptionPlaceholder', 'मालमत्तेची मुख्य वैशिष्ट्ये...')}
              className="w-full border border-slate-300 rounded-xl px-4 py-2 text-sm font-medium focus:ring-2 focus:ring-red-500 focus:outline-none"
            />
          </div>

          {/* Price, Location, District, Taluka */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-black uppercase tracking-wider text-slate-600">
                {t('shots.price', 'किंमत (Price)')}
              </label>
              <input
                type="text"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder={isMr ? "उदा. ₹45,00,000" : "e.g. ₹45,00,000"}
                className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm font-medium focus:ring-2 focus:ring-red-500 focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-black uppercase tracking-wider text-slate-600">
                {t('shots.location', 'स्थान (Location)')}
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder={isMr ? "उदा. विश्रामबाग, सांगली" : "e.g. Vishrambag, Sangli"}
                className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm font-medium focus:ring-2 focus:ring-red-500 focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-black uppercase tracking-wider text-slate-600">
                {t('shots.district', 'जिल्हा')}
              </label>
              <input
                type="text"
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                placeholder={isMr ? "उदा. सांगली" : "e.g. Sangli"}
                className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm font-medium focus:ring-2 focus:ring-red-500 focus:outline-none"
              />
            </div>

            <div>
              {filteredTalukas.length > 0 ? (
                <Select
                  label={t('shots.taluka', 'तालुका')}
                  value={taluka}
                  onChange={(e) => setTaluka(e.target.value)}
                  options={[
                    { value: '', label: isMr ? '-- निवडा --' : '-- Select --' },
                    ...filteredTalukas.map((tItem) => ({
                      value: tItem.nameMr || tItem.name,
                      label: tItem.nameMr || tItem.name
                    }))
                  ]}
                  className="py-2.5 text-sm font-medium"
                />
              ) : (
                <div className="space-y-1.5">
                  <label className="text-xs font-black uppercase tracking-wider text-slate-600">
                    {t('shots.taluka', 'तालुका')}
                  </label>
                  <input
                    type="text"
                    value={taluka}
                    onChange={(e) => setTaluka(e.target.value)}
                    placeholder={isMr ? "उदा. मिरज" : "e.g. Miraj"}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary focus:outline-none"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Contact & Status */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-black uppercase tracking-wider text-slate-600">
                {t('shots.contactNumber', 'कॉल क्रमांक')}
              </label>
              <input
                type="tel"
                maxLength={10}
                inputMode="numeric"
                value={contactNumber}
                onKeyDown={(e) => {
                  if (
                    !/^\d$/.test(e.key) &&
                    !['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(e.key) &&
                    !e.ctrlKey && !e.metaKey && !e.altKey && e.key !== 'Unidentified' && e.keyCode !== 229
                  ) {
                    e.preventDefault();
                  }
                }}
                onChange={(e) => setContactNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
                placeholder="8328712712"
                className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-black uppercase tracking-wider text-slate-600">
                {t('shots.whatsappNumber', 'व्हॉट्सॲप क्रमांक')}
              </label>
              <input
                type="tel"
                maxLength={10}
                inputMode="numeric"
                value={whatsappNumber}
                onKeyDown={(e) => {
                  if (
                    !/^\d$/.test(e.key) &&
                    !['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(e.key) &&
                    !e.ctrlKey && !e.metaKey && !e.altKey && e.key !== 'Unidentified' && e.keyCode !== 229
                  ) {
                    e.preventDefault();
                  }
                }}
                onChange={(e) => setWhatsappNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
                placeholder="8328712712"
                className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary focus:outline-none"
              />
            </div>

            <Select
              label={t('shots.status', 'स्थिती (Status)')}
              value={status}
              onChange={(e) => setStatus(e.target.value as 'active' | 'hidden')}
              options={[
                { value: 'active', label: `● ${t('shots.statusActive', 'सक्रिय (ॲपवर दाखवा)')}` },
                { value: 'hidden', label: `○ ${t('shots.statusHidden', 'लपवा (ड्राफ्ट)')}` }
              ]}
              className="py-2.5 text-sm font-bold"
            />
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              disabled={isSubmitting}
              onClick={() => setIsFormOpen(false)}
              className="rounded-xl px-5 text-xs font-bold cursor-pointer"
            >
              {t('shots.cancel', 'रद्द करा')}
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-red-600 hover:bg-red-700 text-white rounded-xl px-7 text-xs font-black shadow-lg shadow-red-600/30 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting
                ? t('shots.saving', 'सेव्ह होत आहे...')
                : t('shots.save', 'शॉट सेव्ह करा')}
            </Button>
          </div>
        </form>
      </Dialog>

      {/* REEL PREVIEW MODAL (Smartphone UI Experience) */}
      <AnimatePresence>
        {previewShot && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setPreviewShot(null)}
              className="fixed inset-0 bg-black/85 backdrop-blur-md"
            />

            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-[360px] h-[640px] bg-black rounded-[40px] border-4 border-slate-800 shadow-2xl overflow-hidden z-10 flex flex-col"
            >
              {/* Smartphone Notch / Top Bar */}
              <div className="absolute top-0 left-0 right-0 z-20 flex justify-between items-center px-6 pt-3 text-white text-[11px] font-bold">
                <span className="flex items-center gap-1.5 text-red-500 uppercase tracking-widest font-black text-[10px]">
                  <Smartphone className="w-3.5 h-3.5" /> 99. shots
                </span>
                <button
                  onClick={() => setPreviewShot(null)}
                  className="w-7 h-7 rounded-full bg-black/60 backdrop-blur-md flex items-center justify-center text-white/80 hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Video Player */}
              <div className="relative flex-1 bg-black flex items-center justify-center">
                <UniversalVideoPlayer
                  videoRef={previewVideoRef}
                  url={previewShot.videoUrl}
                  poster={previewShot.thumbnailUrl}
                  autoPlay={isPlaying}
                  muted={isMuted}
                  loop
                />

                {/* Video Click to Play/Pause (only for direct video) */}
                {parseVideoUrl(previewShot.videoUrl).type === 'direct' && (
                  <button
                    onClick={() => {
                      if (previewVideoRef.current) {
                        if (isPlaying) {
                          previewVideoRef.current.pause();
                          setIsPlaying(false);
                        } else {
                          previewVideoRef.current.play();
                          setIsPlaying(true);
                        }
                      }
                    }}
                    className="absolute inset-0 w-full h-full cursor-pointer flex items-center justify-center group"
                  >
                    {!isPlaying && (
                      <div className="w-16 h-16 rounded-full bg-black/60 text-white flex items-center justify-center backdrop-blur-sm">
                        <Play className="w-8 h-8 fill-white ml-1" />
                      </div>
                    )}
                  </button>
                )}

                {/* Floating Sound Toggle (only for direct video) */}
                {parseVideoUrl(previewShot.videoUrl).type === 'direct' && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsMuted(!isMuted);
                    }}
                    className="absolute top-12 right-4 z-20 w-8 h-8 rounded-full bg-black/60 backdrop-blur-md text-white flex items-center justify-center cursor-pointer"
                  >
                    {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                  </button>
                )}

                {/* Reel Bottom Details Overlay */}
                <div className="absolute bottom-0 left-0 right-0 p-5 bg-gradient-to-t from-black via-black/70 to-transparent text-white space-y-3 z-20 pointer-events-none">
                  {previewShot.price && (
                    <span className="inline-block px-3 py-1 rounded-xl bg-amber-500 text-slate-950 font-black text-xs shadow-md">
                      {previewShot.price}
                    </span>
                  )}
                  <div>
                    <h2 className="text-lg font-black leading-tight drop-shadow-md">
                      {previewShot.titleMr || previewShot.title}
                    </h2>
                    {previewShot.description && (
                      <p className="text-xs text-slate-300 mt-1 line-clamp-2 drop-shadow-sm">
                        {previewShot.description}
                      </p>
                    )}
                  </div>

                  {previewShot.location && (
                    <div className="flex items-center gap-1.5 text-xs text-red-400 font-bold">
                      <MapPin className="w-3.5 h-3.5" />
                      <span>{previewShot.location}</span>
                    </div>
                  )}

                  {/* App Action Buttons (Call / WhatsApp) */}
                  <div className="flex gap-2 pt-2 pointer-events-auto">
                    {previewShot.contactNumber && (
                      <a
                        href={`tel:${previewShot.contactNumber}`}
                        className="flex-1 py-2.5 px-3 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-black flex items-center justify-center gap-1.5 shadow-lg shadow-red-600/40"
                      >
                        <Phone className="w-3.5 h-3.5" />
                        {isMr ? 'कॉल करा' : 'Call Now'}
                      </a>
                    )}
                    {previewShot.whatsappNumber && (
                      <a
                        href={`https://wa.me/91${previewShot.whatsappNumber}`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex-1 py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-600/40"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        {isMr ? 'व्हॉट्सॲप' : 'WhatsApp'}
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ShotsManager;
