import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Megaphone,
  Plus,
  Edit2,
  Trash2,
  Eye,
  EyeOff,
  UploadCloud,
  Link as LinkIcon,
  Smartphone,
  X,
  Search,
  ArrowRight,
  Sparkles,
  Layers,
  Image as ImageIcon
} from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Dialog } from '../../../components/ui/Dialog';
import { Select } from '../../../components/ui/Select';
import {
  fetchCollection,
  subscribeToCollection,
  uploadFileToFirebaseStorage,
  saveAppBanner,
  deleteAppBanner,
  toggleAppBannerStatus
} from '../../../services/firebase';
import { uploadImageSmart } from '../../../utils/bunnyUpload';

const SAMPLE_POSTER_IMAGES = [
  {
    name: 'Luxury Villa Poster',
    nameMr: 'लक्झरी व्हिला पोस्टर',
    url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80'
  },
  {
    name: 'Sahyadri Land View Poster',
    nameMr: 'सह्याद्री लँड पोस्टर',
    url: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1200&q=80'
  },
  {
    name: 'Modern Architecture Poster',
    nameMr: 'मॉडर्न आर्किटेक्चर पोस्टर',
    url: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=80'
  }
];

export const AdvertisementsManager: React.FC = () => {
  const { t, i18n } = useTranslation();
  const isMr = Boolean(i18n.language?.startsWith('mr'));

  // Data states
  const [ads, setAds] = useState<any[]>([]);
  const [properties, setProperties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'active' | 'paused'>('all');

  // Modal & Form states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingAd, setEditingAd] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form Fields (matching the mobile app top poster in Demo Image 2)
  const [imageSourceType, setImageSourceType] = useState<'upload' | 'url' | 'sample'>('upload');
  const [image, setImage] = useState('');
  const [previewUrl, setPreviewUrl] = useState('');
  const [brandBadge, setBrandBadge] = useState('SAHYADRI SIGNATURE');
  const [offerBadge, setOfferBadge] = useState(isMr ? 'खास ऑफर' : 'Special Offer');
  const [preTitle, setPreTitle] = useState('');
  const [title, setTitle] = useState('');
  const [titleMr, setTitleMr] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [link, setLink] = useState('/properties');
  const [selectedPropertyId, setSelectedPropertyId] = useState('');
  const [propertyCode, setPropertyCode] = useState('');
  const [type, setType] = useState('home_top_banner');
  const [active, setActive] = useState(true);

  // Upload progress
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Smartphone Live Simulation Modal
  const [simulationAd, setSimulationAd] = useState<any>(null);

  useEffect(() => {
    // Load properties for dropdown
    fetchCollection('properties')
      .then((res) => setProperties(res || []))
      .catch((err) => console.error('Error fetching properties:', err));

    let adsList: any[] = [];
    let bannersList: any[] = [];
    let postersList: any[] = [];
    let appBannersList: any[] = [];

    const updateCombined = () => {
      const map = new Map<string, any>();
      [...adsList, ...bannersList, ...postersList, ...appBannersList].forEach((item: any) => {
        if (!item) return;
        const img = (item.image || item.imageUrl || item.image_url || item.bannerImage || item.banner_image || item.banner || item.poster || '').trim();
        const key = item.id || img;
        if (!key) return;

        if (!map.has(key)) {
          const isActive = item.active !== false && item.status !== 'paused' && item.status !== 'inactive' && item.status !== 'hidden';
          map.set(key, {
            ...item,
            id: String(item.id || key),
            image: img,
            imageUrl: img,
            bannerImage: img,
            title: item.title || item.heading || 'सह्याद्री लँड डेव्हलपर',
            titleMr: item.titleMr || item.title_mr || item.title || item.heading || 'सह्याद्री लँड डेव्हलपर',
            subtitle: item.subtitle || item.sub_title || item.subHeading || item.sub_heading || '',
            brandBadge: item.brandBadge || item.brand_badge || item.brand || 'SAHYADRI SIGNATURE',
            offerBadge: item.offerBadge || item.offer_badge || item.offer || '',
            preTitle: item.preTitle || item.pre_title || item.preHeading || '',
            link: item.link || item.actionUrl || item.action_url || item.url || '/properties',
            propertyId: item.propertyId || item.property_id || '',
            propertyCode: item.propertyCode || item.property_code || '',
            type: item.type || 'home_top_banner',
            active: isActive,
            status: isActive ? 'active' : 'paused',
            createdAt: item.createdAt || ''
          });
        }
      });

      const combined = Array.from(map.values()).sort((a, b) => {
        const timeA = a.createdAt?.seconds ? a.createdAt.seconds * 1000 : new Date(a.createdAt || 0).getTime();
        const timeB = b.createdAt?.seconds ? b.createdAt.seconds * 1000 : new Date(b.createdAt || 0).getTime();
        return timeB - timeA;
      });

      setAds(combined);
      setLoading(false);
    };

    // Subscribe to all 4 banner collections for complete database & app sync
    const unsub1 = subscribeToCollection('advertisements', (list) => {
      adsList = list || [];
      updateCombined();
    });

    const unsub2 = subscribeToCollection('banners', (list) => {
      bannersList = list || [];
      updateCombined();
    });

    const unsub3 = subscribeToCollection('posters', (list) => {
      postersList = list || [];
      updateCombined();
    });

    const unsub4 = subscribeToCollection('app_banners', (list) => {
      appBannersList = list || [];
      updateCombined();
    });

    return () => {
      if (typeof unsub1 === 'function') unsub1();
      if (typeof unsub2 === 'function') unsub2();
      if (typeof unsub3 === 'function') unsub3();
      if (typeof unsub4 === 'function') unsub4();
    };
  }, []);

  // Handle Property Selection for quick auto-fill
  const handlePropertySelect = (propId: string) => {
    setSelectedPropertyId(propId);
    if (!propId) return;

    const prop = properties.find((p) => p.id === propId);
    if (prop) {
      if (prop.title || prop.propertyName) setTitle(prop.title || prop.propertyName);
      if (prop.titleMr) setTitleMr(prop.titleMr);
      if (prop.propertyCode) setPropertyCode(prop.propertyCode);

      const priceVal = prop.expectedPrice || prop.monthlyRent || prop.price;
      if (priceVal) {
        setSubtitle(`${prop.flatType || prop.category || 'Luxury Property'} • STARTING ₹ ${Number(priceVal).toLocaleString('en-IN')}`);
      }
      if (prop.images && prop.images.length > 0 && !image) {
        setImage(prop.images[0]);
      }
      setLink(`/property/${prop.id}`);
    }
  };

  // Image Upload Handler with Bunny.net Storage & CDN verification
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    setUploadError(null);
    setIsUploading(true);
    setUploadProgress(15);

    // Instant local file preview so user sees their selected file in the modal right away
    const localUrl = URL.createObjectURL(file);
    setPreviewUrl(localUrl);

    try {
      // 1. Upload to Bunny.net Storage (with verified accessibility)
      const secureUrl = await uploadImageSmart(file, 'banners', (progress) => {
        setUploadProgress(Math.max(15, progress));
      });

      if (!secureUrl) {
        throw new Error('Upload returned empty URL');
      }

      setImage(secureUrl);
      setPreviewUrl(secureUrl);
      setUploadProgress(100);
      setIsUploading(false);
    } catch (uploadErr: any) {
      console.warn('Primary upload failed, attempting Firebase Storage fallback:', uploadErr);
      try {
        // 2. Fallback to Firebase Storage
        const downloadUrl = await uploadFileToFirebaseStorage(file, 'banners', (progress) => {
          setUploadProgress(progress);
        });
        setImage(downloadUrl);
        setPreviewUrl(downloadUrl);
        setUploadProgress(100);
        setIsUploading(false);
      } catch (firebaseErr: any) {
        console.error('All uploads failed:', firebaseErr);
        setUploadError(isMr ? 'पोस्टर इमेज अपलोड करताना त्रुटी आली. कृपया पुन्हा प्रयत्न करा.' : 'Error uploading poster image. Please try again.');
        setIsUploading(false);
        setImage('');
      }
    } finally {
      // Reset input value so re-selecting same file works
      if (e.target) e.target.value = '';
    }
  };

  const handleOpenAdd = () => {
    setEditingAd(null);
    setPreviewUrl('');
    setImageSourceType('upload');
    setImage(''); // Clean start - do NOT pre-fill with old image!
    setBrandBadge('SAHYADRI SIGNATURE');
    setOfferBadge(isMr ? 'खास ऑफर' : 'Special Offer');
    setPreTitle('');
    setTitle('');
    setTitleMr('');
    setSubtitle('');
    setLink('/properties');
    setSelectedPropertyId('');
    setPropertyCode('');
    setType('home_top_banner');
    setActive(true);
    setUploadProgress(null);
    setUploadError(null);
    setIsUploading(false);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (ad: any) => {
    setEditingAd(ad);
    const existingImg = ad.image || ad.imageUrl || ad.bannerImage || '';
    setPreviewUrl(existingImg);
    setImage(existingImg);
    setImageSourceType('upload');
    setBrandBadge(ad.brandBadge || 'SAHYADRI SIGNATURE');
    setOfferBadge(ad.offerBadge || (isMr ? 'खास ऑफर' : 'Special Offer'));
    setPreTitle(ad.preTitle || '');
    setTitle(ad.title || '');
    setTitleMr(ad.titleMr || '');
    setSubtitle(ad.subtitle || '');
    setLink(ad.link || '/properties');
    setSelectedPropertyId(ad.propertyId || '');
    setPropertyCode(ad.propertyCode || '');
    setType(ad.type || 'home_top_banner');
    setActive(ad.active !== false);
    setUploadProgress(null);
    setUploadError(null);
    setIsUploading(false);
    setIsFormOpen(true);
  };

  const handleToggleStatus = async (ad: any, e: React.MouseEvent) => {
    e.stopPropagation();
    const currentActive = ad.active !== false && ad.status !== 'paused';
    const nextActive = !currentActive;
    // Optimistic UI update
    setAds((prev) =>
      prev.map((item) => {
        if (item.id === ad.id) {
          return {
            ...item,
            active: nextActive,
            status: nextActive ? 'active' : 'paused'
          };
        }
        return item;
      })
    );
    try {
      await toggleAppBannerStatus(ad);
    } catch (err) {
      console.error('Error toggling poster status:', err);
    }
  };

  const handleDelete = async (ad: any, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm(t('advertisements.confirmDelete', 'तुम्हाला खात्री आहे का की हे पोस्टर हटवायचे आहे? हे मोबाईल ॲपमधूनही काढले जाईल.'))) {
      return;
    }
    const adId = typeof ad === 'string' ? ad : ad?.id;
    const adImg = typeof ad === 'object' ? (ad?.image || ad?.imageUrl || ad?.bannerImage) : undefined;
    // Optimistic UI update
    setAds((prev) => prev.filter((item) => item.id !== adId));
    try {
      await deleteAppBanner(adId, adImg);
    } catch (err) {
      console.error('Error deleting poster:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isUploading) {
      alert('कृपया पोस्टर इमेज क्लाउडवर पूर्णपणे अपलोड होईपर्यंत थांबा.');
      return;
    }
    if (!image.trim()) {
      alert('कृपया नवीन पोस्टर इमेज निवडा किंवा अपलोड करा (Please select poster image)');
      return;
    }
    if (image.startsWith('blob:')) {
      alert(isMr ? 'इमेज अद्याप क्लाउडवर अपलोड झालेली नाही. कृपया १-२ सेकंद थांबा किंवा पुन्हा निवडा.' : 'Image is not fully uploaded yet. Please wait a moment or reselect.');
      return;
    }
    if (!title.trim()) {
      alert(isMr ? 'कृपया मुख्य शीर्षक प्रविष्ट करा (Please provide title)' : 'Please provide title');
      return;
    }

    setIsSubmitting(true);
    const payload = {
      id: editingAd?.id || undefined,
      brandBadge: brandBadge.trim() || 'SAHYADRI SIGNATURE',
      offerBadge: offerBadge.trim() || (isMr ? 'खास ऑफर' : 'Special Offer'),
      preTitle: preTitle.trim(),
      title: title.trim(),
      titleMr: titleMr.trim() || title.trim(),
      subtitle: subtitle.trim(),
      image: image.trim(),
      link: link.trim() || '/properties',
      propertyId: selectedPropertyId || '',
      propertyCode: propertyCode.trim() || '',
      type,
      active,
      status: active ? 'active' : 'paused',
      createdAt: editingAd?.createdAt
    };

    try {
      await saveAppBanner(payload);
      setIsFormOpen(false);
    } catch (err) {
      console.error('Failed to save poster:', err);
      alert('पोस्टर सेव्ह करताना त्रुटी आली. कृपया पुन्हा प्रयत्न करा.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter ads
  const filteredAds = ads.filter((ad) => {
    if (filterType === 'active' && !ad.active) return false;
    if (filterType === 'paused' && ad.active) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = (ad.title || '').toLowerCase().includes(q);
      const matchSubtitle = (ad.subtitle || '').toLowerCase().includes(q);
      const matchBrand = (ad.brandBadge || '').toLowerCase().includes(q);
      const matchOffer = (ad.offerBadge || '').toLowerCase().includes(q);
      return matchTitle || matchSubtitle || matchBrand || matchOffer;
    }
    return true;
  });

  const totalCount = ads.length;
  const activeCount = ads.filter((a) => a.active).length;
  const pausedCount = totalCount - activeCount;

  return (
    <div className="space-y-8 text-left pb-16">
      {/* Top Banner / Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 p-6 md:p-8 rounded-3xl border border-slate-800 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-80 h-80 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="space-y-2 relative z-10">
          <div className="flex items-center gap-2 text-red-500 font-extrabold text-xs uppercase tracking-widest">
            <Smartphone className="w-4 h-4 animate-pulse" />
            <span>{t('advertisements.appSyncNote', 'मोबाईल ॲप सिंक: होम स्क्रीन टॉप पोस्टर')}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight flex items-center gap-3">
            <span className="p-2.5 rounded-2xl bg-gradient-to-tr from-red-600 to-rose-500 text-white shadow-lg shadow-red-500/30">
              <Megaphone className="w-6 h-6" />
            </span>
            <span>{t('advertisements.title', 'ॲप जाहिरात व पोस्टर्स')}</span>
          </h1>
          <p className="text-slate-400 text-xs sm:text-sm max-w-2xl">
            {t('advertisements.subtitle', 'मोबाईल ॲपच्या मुख्य स्क्रीनवरील टॉप पोस्टर्स व प्रमोशनल बॅनर जोडा, बदला आणि नियंत्रित करा.')}
          </p>
        </div>

        <div className="flex items-center gap-3 relative z-10">
          <Button
            onClick={handleOpenAdd}
            className="bg-red-600 hover:bg-red-700 text-white font-bold text-sm px-5 py-3 rounded-xl shadow-lg shadow-red-600/30 flex items-center gap-2 transition-transform active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>{t('advertisements.addBanner', 'नवीन पोस्टर जोडा')}</span>
          </Button>
        </div>
      </div>


      {/* Stats Counters */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200/80 p-5 rounded-2xl shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs uppercase font-extrabold tracking-wider text-slate-400">
              {t('advertisements.totalBanners', 'एकूण पोस्टर्स')}
            </span>
            <div className="text-2xl font-black text-slate-800 mt-1">{totalCount}</div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600">
            <Layers className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white border border-emerald-200/80 p-5 rounded-2xl shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs uppercase font-extrabold tracking-wider text-emerald-600">
              {t('advertisements.activeBanners', 'सक्रिय (ॲपवर दिसणारे)')}
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
              {t('advertisements.pausedBanners', 'थांबवलेले')}
            </span>
            <div className="text-2xl font-black text-slate-600 mt-1">{pausedCount}</div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500">
            <EyeOff className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Filter Tabs & Search */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-bold">
          <button
            onClick={() => setFilterType('all')}
            className={`px-4 py-2 rounded-lg transition-all cursor-pointer ${
              filterType === 'all' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            {isMr ? 'सर्व' : 'All'} ({totalCount})
          </button>
          <button
            onClick={() => setFilterType('active')}
            className={`px-4 py-2 rounded-lg transition-all cursor-pointer ${
              filterType === 'active' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            {isMr ? 'सक्रिय' : 'Active'} ({activeCount})
          </button>
          <button
            onClick={() => setFilterType('paused')}
            className={`px-4 py-2 rounded-lg transition-all cursor-pointer ${
              filterType === 'paused' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            {isMr ? 'थांबवलेले' : 'Paused'} ({pausedCount})
          </button>
        </div>

        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={isMr ? "शीर्षक, ब्रँड किंवा ऑफरनुसार शोधा..." : "Search by title, brand or offer..."}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all"
          />
        </div>
      </div>

      {/* Main Grid: Live App Card Simulation */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {[1, 2].map((i) => (
            <div key={i} className="animate-pulse bg-slate-200 rounded-3xl h-64" />
          ))}
        </div>
      ) : filteredAds.length === 0 ? (
        <div className="bg-white border-2 border-dashed border-slate-200 rounded-3xl p-12 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-red-50 text-red-500 flex items-center justify-center mx-auto">
            <Megaphone className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-slate-800">
              {t('advertisements.noBanners', 'कोणतेही पोस्टर्स सापडले नाहीत.')}
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {isMr
                ? 'मोबाईल ॲपच्या होम स्क्रीनवर दाखवण्यासाठी नवीन आकर्षक पोस्टर किंवा बॅनर जोडा.'
                : 'Add new banners or posters to display on the mobile app home screen.'}
            </p>
          </div>
          <Button
            onClick={handleOpenAdd}
            className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-6 py-2.5 rounded-xl cursor-pointer"
          >
            {t('advertisements.addBanner', 'नवीन पोस्टर जोडा')}
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {filteredAds.map((ad) => {
            const isActive = ad.active !== false;
            return (
              <div
                key={ad.id}
                className="bg-white rounded-3xl border border-slate-200/90 shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col justify-between"
              >
                {/* Visual Header matching Mobile App Simulation (Image 2) */}
                <div className="p-4 sm:p-5 bg-slate-100/70 border-b border-slate-200/80">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-500 mb-2">
                    <span className="flex items-center gap-1.5 text-red-600 uppercase tracking-widest text-[10px] font-black">
                      <Smartphone className="w-3.5 h-3.5" /> {isMr ? 'ॲप होम स्क्रीन प्रिव्ह्यू' : 'App Home Screen Preview'}
                    </span>
                    <span
                      onClick={(e) => handleToggleStatus(ad, e)}
                      className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                        isActive
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {isActive ? (isMr ? '● सक्रिय (Live)' : '● Active') : (isMr ? '○ थांबवलेले (Paused)' : '○ Paused')}
                    </span>
                  </div>

                  {/* 1:1 Accurate Simulation of Demo Image 2 Poster Card */}
                  <div
                    onClick={() => setSimulationAd(ad)}
                    className="relative rounded-2xl sm:rounded-3xl overflow-hidden aspect-[16/9] sm:aspect-[2/1] bg-slate-900 text-white shadow-xl cursor-pointer group"
                  >
                    {/* Background Poster Image */}
                    <img
                      src={ad.image || ad.imageUrl || ad.bannerImage || '/hero-background.jpg'}
                      alt={ad.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      onError={(e: any) => {
                        e.target.src = '/hero-background.jpg';
                      }}
                    />

                    {/* Dark gradient overlay for readable text */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-black/30" />

                    {/* Top Badges */}
                    <div className="absolute top-3.5 left-4 right-4 flex items-center justify-between z-10">
                      {ad.brandBadge ? (
                        <span className="px-2.5 py-1 rounded-md bg-black/40 border border-white/20 text-white text-[9px] sm:text-[10px] font-extrabold uppercase tracking-widest backdrop-blur-md">
                          {ad.brandBadge}
                        </span>
                      ) : (
                        <span />
                      )}

                      {ad.offerBadge && (
                        <span className="px-2.5 py-1 rounded-md bg-red-600 text-white text-[9px] sm:text-[10px] font-black uppercase tracking-wider shadow-md shadow-red-600/50">
                          {ad.offerBadge}
                        </span>
                      )}
                    </div>

                    {/* Poster Titles & Highlights */}
                    <div className="absolute bottom-3 left-4 right-4 text-white space-y-1 z-10">
                      {ad.preTitle && (
                        <div className="text-[10px] sm:text-xs font-black tracking-widest text-slate-300 uppercase drop-shadow">
                          {ad.preTitle}
                        </div>
                      )}
                      <h2 className="text-sm sm:text-lg font-black uppercase tracking-wide leading-tight drop-shadow-md text-white line-clamp-2">
                        {ad.titleMr || ad.title}
                      </h2>
                      {ad.subtitle && (
                        <div className="text-[10px] sm:text-xs font-bold text-amber-300 drop-shadow flex items-center gap-1">
                          <Sparkles className="w-3 h-3 text-amber-400" />
                          <span>{ad.subtitle}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Simulated App Search Bar below Poster (matches Image 2) */}
                  <div className="mt-3 bg-white border border-slate-200/90 rounded-xl px-3.5 py-2.5 flex items-center justify-between text-xs text-slate-400 shadow-sm pointer-events-none">
                    <div className="flex items-center gap-2">
                      <Search className="w-3.5 h-3.5 text-slate-400" />
                      <span className="truncate text-slate-500">
                        {isMr ? 'शोधा "सांगली, कोल्हापूर, 2 BHK, फ्लॅट..."' : 'Search "Sangli, Kolhapur, 2 BHK, Flat..."'}
                      </span>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-blue-500" />
                  </div>
                </div>

                {/* Footer Controls */}
                <div className="p-4 sm:p-5 flex items-center justify-between text-xs bg-white">
                  <div className="space-y-0.5 max-w-[200px] sm:max-w-xs">
                    <div className="text-[11px] font-extrabold text-slate-700 truncate">
                      {ad.title}
                    </div>
                    <div className="text-[10px] text-slate-400 truncate flex items-center gap-1">
                      <LinkIcon className="w-3 h-3" />
                      <span>{ad.link || '/properties'}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      onClick={() => setSimulationAd(ad)}
                      variant="outline"
                      className="text-[11px] font-bold py-1.5 px-3 rounded-xl border-slate-200 hover:bg-slate-50 cursor-pointer flex items-center gap-1"
                    >
                      <Smartphone className="w-3.5 h-3.5" />
                      <span>{isMr ? 'प्रिव्ह्यू' : 'Preview'}</span>
                    </Button>
                    <button
                      onClick={() => handleOpenEdit(ad)}
                      className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                      title={t('advertisements.editBanner', 'संपादित करा')}
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => handleDelete(ad, e)}
                      className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
                      title={t('advertisements.deleteBanner', 'हटवा')}
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

      {/* ADD / EDIT POSTER MODAL */}
      <Dialog
        isOpen={isFormOpen}
        onClose={() => !isSubmitting && setIsFormOpen(false)}
        title={
          <div className="flex items-center gap-3">
            <span className="p-2 rounded-xl bg-red-50 text-red-600">
              <Megaphone className="w-5 h-5" />
            </span>
            <span className="font-extrabold text-lg sm:text-xl text-slate-900">
              {editingAd ? t('advertisements.editBanner', 'पोस्टर संपादित करा') : t('advertisements.addBanner', 'नवीन ॲप पोस्टर जोडा')}
            </span>
          </div>
        }
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleSubmit} className="space-y-6 pt-2">
          {/* Quick Property Selector */}
          <div className="bg-red-50/50 p-4 rounded-2xl border border-red-100 space-y-2">
            <label className="text-xs font-black uppercase tracking-wider text-red-900 flex items-center justify-between">
              <span>{t('advertisements.linkProperty', 'संबंधित मालमत्ता लिंक करा (पर्यायी)')}</span>
              <span className="text-[10px] text-red-600 normal-case font-medium">
                {isMr ? '(पोस्टर माहिती आपोआप भरली जाईल)' : '(Poster details will autofill)'}
              </span>
            </label>
            <Select
              value={selectedPropertyId}
              onChange={(e) => handlePropertySelect(e.target.value)}
              options={[
                { value: '', label: isMr ? '-- कोणतीही मालमत्ता निवडा --' : '-- Select Property --' },
                ...properties.map((p) => ({
                  value: p.id,
                  label: `[${p.propertyCode || 'P'}] ${p.title || p.propertyName} - ${p.cityVillage || p.district}`
                }))
              ]}
              className="py-2.5 text-xs sm:text-sm font-medium"
            />
          </div>

          {/* Poster Image Source */}
          <div className="space-y-3">
            <label className="text-xs font-black uppercase tracking-wider text-slate-600">
              {t('advertisements.posterImage', 'पोस्टर इमेज (Poster Image)')} *
            </label>
            <div className="grid grid-cols-3 gap-2 p-1 bg-slate-100 rounded-xl text-xs font-bold">
              <button
                type="button"
                onClick={() => setImageSourceType('upload')}
                className={`py-2 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  imageSourceType === 'upload' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
                }`}
              >
                <UploadCloud className="w-3.5 h-3.5" />
                <span>{isMr ? 'फाईल अपलोड' : 'File Upload'}</span>
              </button>
              <button
                type="button"
                onClick={() => setImageSourceType('url')}
                className={`py-2 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  imageSourceType === 'url' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
                }`}
              >
                <LinkIcon className="w-3.5 h-3.5" />
                <span>{isMr ? 'इमेज लिंक' : 'Image Link'}</span>
              </button>
              <button
                type="button"
                onClick={() => setImageSourceType('sample')}
                className={`py-2 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  imageSourceType === 'sample' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
                }`}
              >
                <ImageIcon className="w-3.5 h-3.5" />
                <span>{isMr ? 'नमुना पोस्टर्स' : 'Sample Posters'}</span>
              </button>
            </div>

            {/* File Upload */}
            {imageSourceType === 'upload' && (
              <div className="space-y-2">
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-300 hover:border-red-500 rounded-2xl p-6 text-center bg-slate-50/50 hover:bg-red-50/30 transition-all cursor-pointer group"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-2 group-hover:scale-110 transition-transform">
                    <UploadCloud className="w-6 h-6" />
                  </div>
                  <div className="font-extrabold text-sm text-slate-800">
                    {isMr ? 'पोस्टर इमेज निवडा (JPG / PNG / WebP)' : 'Select Poster Image (JPG / PNG / WebP)'}
                  </div>
                  <div className="text-xs text-slate-400 mt-1">
                    {isMr
                      ? 'मोबाईल बॅनरसाठी 16:9 किंवा 2:1 रेशोची इमेज उत्तम दिसेल.'
                      : '16:9 or 2:1 ratio image looks best for mobile banner.'}
                  </div>
                </div>

                {uploadProgress !== null && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-bold text-slate-600">
                      <span>{isMr ? 'अपलोड होत आहे...' : 'Uploading...'}</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-red-600 h-full transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  </div>
                )}
                {uploadError && <p className="text-xs text-amber-600 font-bold">{uploadError}</p>}
              </div>
            )}

            {/* Image URL */}
            {imageSourceType === 'url' && (
              <div className="space-y-1">
                <input
                  type="url"
                  value={image}
                  onChange={(e) => setImage(e.target.value)}
                  placeholder={isMr ? "https://.../poster.jpg (थेट इमेज लिंक)" : "https://.../poster.jpg (Direct image link)"}
                  className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm font-medium focus:ring-2 focus:ring-red-500 focus:outline-none"
                />
              </div>
            )}

            {/* Sample Images */}
            {imageSourceType === 'sample' && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {SAMPLE_POSTER_IMAGES.map((sample, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setImage(sample.url)}
                    className={`p-2 rounded-xl border text-left text-xs font-bold transition-all cursor-pointer flex flex-col gap-2 ${
                      image === sample.url
                        ? 'border-red-500 bg-red-50 text-red-950'
                        : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                    }`}
                  >
                    <img src={sample.url} alt="" className="w-full h-16 object-cover rounded-lg" />
                    <span className="text-[11px] font-medium text-slate-700 line-clamp-1">
                      {isMr ? (sample.nameMr || sample.name) : sample.name}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Poster Live Preview inside Modal */}
          {image && (
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-wider text-slate-600">
                {isMr ? 'पोस्टर प्रिव्ह्यू (Live Preview)' : 'Poster Live Preview'}
              </label>
              <div className="relative rounded-2xl overflow-hidden aspect-[16/9] sm:aspect-[2/1] bg-slate-900 text-white shadow-lg">
                <img
                  src={previewUrl || image}
                  alt=""
                  className="w-full h-full object-cover"
                  onError={(e: any) => {
                    if (previewUrl && e.target.src !== previewUrl) {
                      e.target.src = previewUrl;
                    } else {
                      e.target.src = '/hero-background.jpg';
                    }
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-black/30" />

                <div className="absolute top-3 left-4 right-4 flex items-center justify-between z-10">
                  {brandBadge && (
                    <span className="px-2.5 py-1 rounded-md bg-black/40 border border-white/20 text-white text-[9px] sm:text-[10px] font-extrabold uppercase tracking-widest backdrop-blur-md">
                      {brandBadge}
                    </span>
                  )}
                  {offerBadge && (
                    <span className="px-2.5 py-1 rounded-md bg-red-600 text-white text-[9px] sm:text-[10px] font-black uppercase tracking-wider shadow-md">
                      {offerBadge}
                    </span>
                  )}
                </div>

                <div className="absolute bottom-3 left-4 right-4 text-white space-y-1 z-10">
                  {preTitle && (
                    <div className="text-[10px] sm:text-xs font-black tracking-widest text-slate-300 uppercase">
                      {preTitle}
                    </div>
                  )}
                  <h2 className="text-sm sm:text-base font-black uppercase tracking-wide leading-tight text-white line-clamp-2">
                    {titleMr || title}
                  </h2>
                  {subtitle && (
                    <div className="text-[10px] sm:text-xs font-bold text-amber-300">
                      {subtitle}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Badges: Brand & Offer Tag */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-black uppercase tracking-wider text-slate-600">
                {t('advertisements.brandBadge', 'ब्रँड टॅग (Brand Tag)')}
              </label>
              <input
                type="text"
                value={brandBadge}
                onChange={(e) => setBrandBadge(e.target.value)}
                placeholder={isMr ? "उदा. ASTITVA SIGNATURE किंवा SAHYADRI SIGNATURE" : "e.g. ASTITVA SIGNATURE or SAHYADRI SIGNATURE"}
                className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm font-medium focus:ring-2 focus:ring-red-500 focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-black uppercase tracking-wider text-slate-600">
                {t('advertisements.offerBadge', 'ऑफर बॅज (Offer Tag)')}
              </label>
              <input
                type="text"
                value={offerBadge}
                onChange={(e) => setOfferBadge(e.target.value)}
                placeholder={isMr ? "उदा. LIMITED PERIOD OFFER" : "e.g. LIMITED PERIOD OFFER"}
                className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm font-medium focus:ring-2 focus:ring-red-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Pre-title & Main Title */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-black uppercase tracking-wider text-slate-600">
                {t('advertisements.preTitle', 'वरचे शीर्षक (Pre-title)')}
              </label>
              <input
                type="text"
                value={preTitle}
                onChange={(e) => setPreTitle(e.target.value)}
                placeholder={isMr ? "उदा. CHECK IN. NEVER LEAVE." : "e.g. CHECK IN. NEVER LEAVE."}
                className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm font-medium focus:ring-2 focus:ring-red-500 focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-black uppercase tracking-wider text-slate-600">
                {t('advertisements.mainTitle', 'मुख्य शीर्षक (Heading)')} *
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={isMr ? "उदा. HOME THAT FEELS LIKE A VACATION" : "e.g. HOME THAT FEELS LIKE A VACATION"}
                className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm font-medium focus:ring-2 focus:ring-red-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Subtitle & Destination Link */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-black uppercase tracking-wider text-slate-600">
                {t('advertisements.subtitle', 'उपशीर्षक / किंमत (Subtitle)')}
              </label>
              <input
                type="text"
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
                placeholder={isMr ? "उदा. 2 & 3 BHK LUXURY HOMES • STARTING ₹ 35 LAKH*" : "e.g. 2 & 3 BHK LUXURY HOMES • STARTING ₹ 35 LAKH*"}
                className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm font-medium focus:ring-2 focus:ring-red-500 focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-black uppercase tracking-wider text-slate-600">
                {t('advertisements.destinationLink', 'क्लिक केल्यावर लिंक (Destination)')}
              </label>
              <input
                type="text"
                value={link}
                onChange={(e) => setLink(e.target.value)}
                placeholder={isMr ? "/properties किंवा /property/xyz" : "/properties or /property/xyz"}
                className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm font-medium focus:ring-2 focus:ring-red-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Placement & Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label={t('advertisements.type', 'स्थान / प्रकार (Type)')}
              value={type}
              onChange={(e) => setType(e.target.value)}
              options={[
                { value: 'home_top_banner', label: isMr ? 'मुख्य ॲप टॉप पोस्टर (Home Top Poster)' : 'Home Top Poster' },
                { value: 'popup_banner', label: isMr ? 'पॉपअप ऑफर (Popup Offer)' : 'Popup Offer' },
                { value: 'promo_card', label: isMr ? 'प्रमोशनल कार्ड (Promo Card)' : 'Promo Card' }
              ]}
              className="py-2.5 text-sm font-semibold"
            />

            <Select
              label={t('advertisements.status', 'स्थिती (Status)')}
              value={active ? 'true' : 'false'}
              onChange={(e) => setActive(e.target.value === 'true')}
              options={[
                { value: 'true', label: `● ${t('advertisements.statusActive', 'सक्रिय (ॲपवर दाखवा)')}` },
                { value: 'false', label: `○ ${t('advertisements.statusPaused', 'थांबवा (ड्राफ्ट)')}` }
              ]}
              className="py-2.5 text-sm font-semibold"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              disabled={isSubmitting}
              onClick={() => setIsFormOpen(false)}
              className="rounded-xl px-5 text-xs font-bold cursor-pointer"
            >
              {t('advertisements.cancel', 'रद्द करा')}
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || isUploading}
              className="bg-red-600 hover:bg-red-700 text-white rounded-xl px-7 text-xs font-black shadow-lg shadow-red-600/30 cursor-pointer disabled:opacity-50"
            >
              {isUploading
                ? (isMr ? `पोस्टर अपलोड होत आहे (${uploadProgress || 0}%)...` : `Uploading poster (${uploadProgress || 0}%)...`)
                : isSubmitting
                ? t('advertisements.saving', 'सेव्ह होत आहे...')
                : t('advertisements.save', 'पोस्टर सेव्ह करा')}
            </Button>
          </div>
        </form>
      </Dialog>

      {/* SMARTPHONE FULLSCREEN SIMULATION PREVIEW MODAL */}
      <AnimatePresence>
        {simulationAd && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSimulationAd(null)}
              className="fixed inset-0 bg-black/85 backdrop-blur-md"
            />

            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-[360px] h-[660px] bg-slate-50 rounded-[44px] border-4 border-slate-800 shadow-2xl overflow-hidden z-10 flex flex-col text-slate-900"
            >
              {/* Phone Status Notch */}
              <div className="pt-3 px-6 pb-2 flex justify-between items-center text-[10px] font-bold text-slate-800 shrink-0 bg-white">
                <span>9:42</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-[9px]">5G</span>
                  <span>91%</span>
                  <button
                    onClick={() => setSimulationAd(null)}
                    className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center hover:bg-slate-200 cursor-pointer ml-1"
                  >
                    <X className="w-3 h-3 text-slate-600" />
                  </button>
                </div>
              </div>

              {/* App Navbar (matches Image 2) */}
              <div className="px-4 py-2 bg-white flex items-center justify-between border-b border-slate-100 shrink-0">
                <div className="flex items-center gap-1">
                  <img src="/sahyadri-logo.png" alt="" className="h-6 w-auto" />
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-full border border-blue-600 text-blue-600 text-[10px] font-bold flex items-center gap-1">
                    Post Property <span className="bg-emerald-600 text-white text-[8px] px-1 rounded">FREE</span>
                  </span>
                </div>
              </div>

              {/* Scrollable Mobile Content */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
                {/* Simulated Top Poster Card */}
                <div className="relative rounded-2xl overflow-hidden aspect-[16/9] bg-slate-900 text-white shadow-lg">
                  <img src={simulationAd.image} alt="" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-black/30" />

                  <div className="absolute top-2.5 left-3 right-3 flex items-center justify-between z-10">
                    {simulationAd.brandBadge && (
                      <span className="px-2 py-0.5 rounded bg-black/40 border border-white/20 text-white text-[8px] font-extrabold uppercase tracking-widest backdrop-blur-md">
                        {simulationAd.brandBadge}
                      </span>
                    )}
                    {simulationAd.offerBadge && (
                      <span className="px-2 py-0.5 rounded bg-red-600 text-white text-[8px] font-black uppercase tracking-wider shadow">
                        {simulationAd.offerBadge}
                      </span>
                    )}
                  </div>

                  <div className="absolute bottom-2.5 left-3 right-3 text-white space-y-0.5 z-10">
                    {simulationAd.preTitle && (
                      <div className="text-[9px] font-black tracking-widest text-slate-300 uppercase">
                        {simulationAd.preTitle}
                      </div>
                    )}
                    <h2 className="text-xs font-black uppercase tracking-wide leading-tight text-white line-clamp-2">
                      {simulationAd.titleMr || simulationAd.title}
                    </h2>
                    {simulationAd.subtitle && (
                      <div className="text-[9px] font-bold text-amber-300">
                        {simulationAd.subtitle}
                      </div>
                    )}
                  </div>
                </div>

                {/* Simulated Search Input */}
                <div className="bg-white border border-slate-200 rounded-xl px-3 py-2 flex items-center justify-between text-[11px] shadow-sm">
                  <div className="flex items-center gap-2 text-slate-400">
                    <Search className="w-3.5 h-3.5" />
                    <span>
                      {isMr ? 'शोधा "सांगली, कोल्हापूर, 2 BHK, फ्लॅट..."' : 'Search "Sangli, Kolhapur, 2 BHK, Flat..."'}
                    </span>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-blue-500" />
                </div>

                {/* Simulated 'Get started with' */}
                <div className="space-y-2">
                  <div className="text-xs font-black text-slate-800">Get started with</div>
                  <div className="grid grid-cols-4 gap-2 text-center text-[10px] font-bold">
                    <div className="p-2 bg-white rounded-xl border border-slate-100 shadow-sm">{isMr ? 'खरेदीदार' : 'Buyer'}</div>
                    <div className="p-2 bg-white rounded-xl border border-slate-100 shadow-sm">{isMr ? 'विक्रेता' : 'Seller'}</div>
                    <div className="p-2 bg-white rounded-xl border border-slate-100 shadow-sm">{isMr ? 'बिल्डर' : 'Builder'}</div>
                    <div className="p-2 bg-white rounded-xl border border-slate-100 shadow-sm">{isMr ? 'एजंट' : 'Agent'}</div>
                  </div>
                </div>
              </div>

              {/* Simulated App Bottom Navigation Bar */}
              <div className="bg-white border-t border-slate-200 py-2 px-4 flex justify-between items-center text-[9px] font-bold text-slate-500 shrink-0">
                <span className="text-red-600 flex flex-col items-center">● Home</span>
                <span>Search</span>
                <span>Sell/Rent</span>
                <span>99shorts</span>
                <span>Menu</span>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdvertisementsManager;
