import React, { useState, useEffect } from 'react';
import { fetchCollection, fetchDocument, updateDocument, createDocument } from '../../../../services/firebase';
import { Card } from '../../../../components/ui/Card';
import { Button } from '../../../../components/ui/Button';
import { Input } from '../../../../components/ui/Input';
import { Textarea } from '../../../../components/ui/Textarea';
import { Image as ImageIcon, Type, Save, Eye, Smartphone, Monitor, Trash2, RefreshCw, Search, MapPin } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export const HeroContentTab: React.FC = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Form states
  const [bannerImage, setBannerImage] = useState('');
  const [heading, setHeading] = useState('');
  const [subHeading, setSubHeading] = useState('');
  const [ctaText, setCtaText] = useState('');
  const [ctaLink, setCtaLink] = useState('');
  const [secondaryCtaText, setSecondaryCtaText] = useState('');
  const [secondaryCtaLink, setSecondaryCtaLink] = useState('');
  const [searchButtonText, setSearchButtonText] = useState('');
  const [active, setActive] = useState(true);

  // Preview Mode
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop');

  // Dynamic loaded districts
  const [districtsList, setDistrictsList] = useState<any[]>([]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [doc, districts] = await Promise.all([
          fetchDocument('hero_settings', 'general'),
          fetchCollection('districts').catch(() => [])
        ]);
        if (doc) {
          setBannerImage(doc.bannerImage || '');
          setHeading(doc.heading || '');
          setSubHeading(doc.subHeading || '');
          setCtaText(doc.ctaText || '');
          setCtaLink(doc.ctaLink || '');
          setSecondaryCtaText(doc.secondaryCtaText || '');
          setSecondaryCtaLink(doc.secondaryCtaLink || '');
          setSearchButtonText(doc.searchButtonText || '');
          setActive(doc.active !== false);
        }
        if (districts) {
          setDistrictsList(districts.filter((d: any) => d.active !== false));
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const displayBannerImage = (active && bannerImage) ? bannerImage : '/hero-background.jpg';
  const displayHeading = (active && heading) ? heading : t('hero.heading', 'Buy, Sell & Rent Property');
  const displaySubHeading = (active && subHeading) ? subHeading : t('hero.subtitle');

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    try {
      const payload = {
        bannerImage,
        heading,
        subHeading,
        ctaText,
        ctaLink,
        secondaryCtaText,
        secondaryCtaLink,
        searchButtonText,
        active,
        updatedAt: new Date().toISOString()
      };
      
      try {
        await updateDocument('hero_settings', 'general', payload);
      } catch {
        await createDocument('hero_settings', { id: 'general', ...payload });
      }
      
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      console.error(e);
      alert("Failed to save changes. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleImageDelete = () => {
    if (window.confirm("Are you sure you want to remove the hero background image? A default fallback background will be shown instead.")) {
      setBannerImage('');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20 bg-white border border-slate-100 rounded-2xl">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-primary rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 text-left font-sans">
      {/* Configuration Panel */}
      <Card className="p-6 bg-white border border-slate-100 shadow-sm rounded-2xl flex flex-col gap-6">
        <div>
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-1 flex items-center gap-2">
            <Type className="w-4 h-4 text-primary" /> {t('admin.heroSection.heroContent.configTitle')}
          </h3>
          <p className="text-xs text-slate-500">{t('admin.heroSection.heroContent.configDesc')}</p>
        </div>

        <form onSubmit={handleSave} className="flex flex-col gap-5">
          {/* Image Upload/URL */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs uppercase tracking-widest font-extrabold text-slate-500 flex items-center gap-1.5">
              <ImageIcon className="w-3.5 h-3.5" /> {t('admin.heroSection.heroContent.bgImage')}
            </label>
            
            {bannerImage ? (
              <div className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <img src={bannerImage} alt="Thumbnail" className="w-16 h-10 object-cover rounded-lg border border-slate-200" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-slate-800 truncate">Image Loaded</p>
                  <p className="text-[10px] text-slate-500 truncate">Base64 or URL loaded successfully</p>
                </div>
                <div className="flex gap-1">
                  <label className="p-2 text-slate-500 hover:text-primary hover:bg-slate-100 rounded-lg cursor-pointer transition-colors" title="Replace Image">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          const file = e.target.files[0];
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            if (typeof reader.result === 'string') setBannerImage(reader.result);
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                    <RefreshCw className="w-4 h-4" />
                  </label>
                  <button
                    type="button"
                    onClick={handleImageDelete}
                    className="p-2 text-slate-500 hover:text-red-500 hover:bg-red-50 rounded-lg cursor-pointer transition-colors"
                    title="Delete Image"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="relative border border-dashed border-slate-250 hover:border-slate-350 rounded-xl p-6 flex flex-col items-center justify-center bg-slate-50/50 hover:bg-slate-50 transition-all cursor-pointer group">
                <input
                  type="file"
                  accept="image/*"
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      const file = e.target.files[0];
                      const reader = new FileReader();
                      reader.onloadend = () => {
                        if (typeof reader.result === 'string') setBannerImage(reader.result);
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                />
                <ImageIcon className="w-8 h-8 text-slate-400 mb-1.5 group-hover:text-primary transition-colors" />
                <span className="text-xs font-bold text-slate-700">{t('admin.heroSection.heroContent.uploadBg')}</span>
                <span className="text-[10px] text-slate-400 mt-0.5">{t('admin.heroSection.heroContent.uploadDesc')}</span>
              </div>
            )}
            <Input
              placeholder={t('admin.heroSection.heroContent.urlPlaceholder')}
              value={bannerImage}
              onChange={(e) => setBannerImage(e.target.value)}
              className="mt-1.5 text-xs"
            />
          </div>

          {/* Heading and Subtitle */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs uppercase tracking-widest font-extrabold text-slate-500 flex items-center gap-1.5">
              <Type className="w-3.5 h-3.5" /> {t('admin.heroSection.heroContent.mainHeading')}
            </label>
            <Input
              placeholder={t('hero.heading', 'Buy, Sell & Rent Property')}
              value={heading}
              onChange={(e) => setHeading(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs uppercase tracking-widest font-extrabold text-slate-500 flex items-center gap-1.5">
              <Type className="w-3.5 h-3.5" /> {t('admin.heroSection.heroContent.subHeading')}
            </label>
            <Textarea
              placeholder={t('hero.subtitle')}
              value={subHeading}
              onChange={(e) => setSubHeading(e.target.value)}
              rows={3}
            />
          </div>


          {/* Search Button Text */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs uppercase tracking-widest font-extrabold text-slate-500 flex items-center gap-1.5">
              <Search className="w-3.5 h-3.5" /> {t('admin.heroSection.heroContent.searchButton')}
            </label>
            <Input
              placeholder={t('hero.searchSaleListings', 'Search Sale Listings')}
              value={searchButtonText}
              onChange={(e) => setSearchButtonText(e.target.value)}
            />
          </div>

          {/* Active status */}
          <div className="flex items-center gap-2 py-1.5 border-t border-b border-slate-100">
            <input
              type="checkbox"
              id="hero-active"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
              className="w-4 h-4 text-primary border-slate-350 rounded focus:ring-primary cursor-pointer"
            />
            <label htmlFor="hero-active" className="text-xs uppercase tracking-widest font-extrabold text-slate-700 cursor-pointer">
              {t('admin.heroSection.heroContent.customHeroCheckbox')}
            </label>
          </div>

          {/* Buttons */}
          <div className="flex items-center gap-3">
            <Button
              type="submit"
              variant="primary"
              className="py-2.5 px-6 rounded-xl text-xs font-bold text-white flex items-center gap-1.5 cursor-pointer shadow-sm hover:shadow-md transition-all duration-200"
              disabled={saving}
            >
              <Save className="w-3.5 h-3.5" />
              {saving ? t('admin.heroSection.heroContent.saving') : t('admin.heroSection.heroContent.saveButton')}
            </Button>
            {saved && (
              <span className="text-xs text-emerald-600 font-extrabold animate-pulse">
                {t('admin.heroSection.heroContent.savedMsg')}
              </span>
            )}
          </div>
        </form>
      </Card>

      {/* Live Preview Panel */}
      <Card className="bg-white border border-slate-100 shadow-sm rounded-2xl overflow-hidden flex flex-col h-fit">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">{t('admin.heroSection.heroContent.livePreview')}</h3>
          </div>
          {/* Preview Selector */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg">
            <button
              onClick={() => setPreviewMode('desktop')}
              className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                previewMode === 'desktop' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'
              }`}
              title="Desktop view"
            >
              <Monitor className="w-4 h-4" />
            </button>
            <button
              onClick={() => setPreviewMode('mobile')}
              className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                previewMode === 'mobile' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'
              }`}
              title="Mobile view"
            >
              <Smartphone className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Dynamic preview pane wrapper */}
        <div className="bg-slate-100 p-4 sm:p-6 flex justify-center items-center overflow-x-hidden min-h-[420px]">
          {previewMode === 'desktop' ? (
            /* Desktop Mockup */
            <div className="w-full max-w-2xl bg-[#0b0f19] rounded-2xl overflow-hidden aspect-[16/9] shadow-lg relative text-center">
              {displayBannerImage ? (
                <img src={displayBannerImage} alt="" className="absolute inset-0 w-full h-full object-cover opacity-50 z-0" />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-slate-800 to-slate-950 opacity-90 z-0"></div>
              )}
              <div className="absolute inset-0 bg-black/30 z-10" />
              
              <div className="relative z-20 h-full flex flex-col justify-center items-center p-8 gap-3.5">
                {/* Location Badge */}
                <div className="inline-flex items-center gap-1.5 bg-orange-50/90 border border-orange-200 text-[#ea580c] px-3 py-1 rounded-full text-[9px] font-bold shadow-sm backdrop-blur-sm mb-1.5">
                  <MapPin className="w-3.5 h-3.5" />
                  {districtsList.length > 0
                    ? districtsList.map((d: any) => t(`districts.${d.label}`, d.label)).join(t('hero.joinAnd', ' & ')) + ' ' + t('hero.districtsAndState', 'Districts, Maharashtra')
                    : t('hero.defaultLocationBadge', 'सांगली व कोल्हापूर जिल्हे, महाराष्ट्र')}
                </div>

                <h2 className="text-white text-lg sm:text-2xl font-bold font-serif drop-shadow-md leading-tight">
                  {displayHeading}
                </h2>
                <p className="text-white/95 text-[10px] sm:text-xs max-w-md leading-relaxed font-semibold">
                  {displaySubHeading}
                </p>

              </div>
            </div>
          ) : (
            /* Mobile Mockup */
            <div className="w-[280px] bg-slate-50 rounded-[32px] border-[8px] border-slate-900 shadow-2xl overflow-hidden min-h-[440px] relative flex flex-col">
              {/* Screen Content */}
              <div className="flex-1 flex flex-col bg-white text-center pb-6">
                {/* Hero Header mock */}
                <div className="relative h-28 w-full bg-[#f8fafc] flex justify-center items-center overflow-hidden border-b border-slate-200/20">
                  <div className="absolute inset-0 bg-[#f8fafc]"></div>
                  <div className="relative z-10 p-2 flex flex-col items-center">
                    <span className="text-[10px] font-extrabold uppercase text-slate-800 tracking-wider">Sahyadri Lands</span>
                  </div>
                </div>

                {/* Mobile Heading Panel */}
                <div className="px-4 py-4 space-y-3">
                  <div className="inline-flex items-center gap-1 bg-orange-50 border border-orange-100 text-[#ea580c] px-2 py-0.5 rounded-full text-[8px] font-bold">
                    <MapPin className="w-2.5 h-2.5" />
                    <span className="truncate max-w-[200px]">
                      {districtsList.length > 0
                        ? districtsList.map((d: any) => t(`districts.${d.label}`, d.label)).join(t('hero.joinAnd', ' & ')) + ' ' + t('hero.districtsAndState', 'Districts, Maharashtra')
                        : t('hero.defaultLocationBadge', 'सांगली व कोल्हापूर जिल्हे, महाराष्ट्र')}
                    </span>
                  </div>

                  <h2 className="text-sm font-extrabold text-slate-900 leading-tight">
                    {displayHeading}
                  </h2>
                </div>

                {/* Subtitle / Buttons on Mobile */}
                <div className="px-4 flex-1 flex flex-col gap-3 justify-center">
                  <p className="text-slate-505 text-[9px] leading-relaxed font-semibold">
                    {displaySubHeading}
                  </p>

                </div>
              </div>
            </div>
          )}
        </div>
        
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-150/50 text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">
          {t('admin.heroSection.heroContent.previewDesc')}
        </div>
      </Card>
    </div>
  );
};
