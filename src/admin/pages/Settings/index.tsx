import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { fetchDocument, updateDocument } from '../../../services/firebase';
import { Card as UICard } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Textarea } from '../../../components/ui/Textarea';
import { CheckCircle, Info } from 'lucide-react';

export const Settings: React.FC = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);

  // General Settings fields
  const [websiteName, setWebsiteName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactAddress, setContactAddress] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [socialFacebook, setSocialFacebook] = useState('');
  const [socialInstagram, setSocialInstagram] = useState('');
  const [socialTwitter, setSocialTwitter] = useState('');
  
  // SEO fields
  const [seoTitle, setSeoTitle] = useState('');
  const [seoDescription, setSeoDescription] = useState('');

  useEffect(() => {
    const loadSettings = async () => {
      setLoading(true);
      try {
        const doc = await fetchDocument('settings', 'general');
        if (doc) {
          setWebsiteName(doc.websiteName || '');
          setContactEmail(doc.contactEmail || '');
          setContactPhone(doc.contactPhone || '');
          setContactAddress(doc.contactAddress || '');
          setWhatsappNumber(doc.whatsappNumber || '');
          setSocialFacebook(doc.socialFacebook || '');
          setSocialInstagram(doc.socialInstagram || '');
          setSocialTwitter(doc.socialTwitter || '');
          setSeoTitle(doc.seoTitle || '');
          setSeoDescription(doc.seoDescription || '');
        }
      } catch (e) {
        console.error("Failed to load settings document:", e);
      } finally {
        setLoading(false);
      }
    };
    loadSettings();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccess(false);

    try {
      await updateDocument('settings', 'general', {
        websiteName,
        contactEmail,
        contactPhone,
        contactAddress,
        whatsappNumber,
        socialFacebook,
        socialInstagram,
        socialTwitter,
        seoTitle,
        seoDescription
      });
      setSuccess(true);
    } catch (error) {
      console.error("Failed to update general settings document:", error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 text-left font-sans">
      <div>
        <h1 className="text-3xl font-serif font-bold text-slate-900 mb-1">{t('admin.settings.title')}</h1>
      </div>

      {success && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-xl p-4 flex items-center gap-2 max-w-xl">
          <CheckCircle className="w-5 h-5 text-emerald-600" /> {t('admin.settings.successMsg')}
        </div>
      )}

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Contact Info and Social links */}
        <div className="lg:col-span-2 space-y-6">
          <UICard className="p-8 bg-white border border-slate-100 shadow-sm rounded-2xl space-y-4" >
            <h3 className="text-lg font-serif text-primary font-bold mb-2">{t('admin.settings.coreInfoTitle')}</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label={t('admin.settings.labels.websiteName')} value={websiteName} onChange={(e) => setWebsiteName(e.target.value)} required />
              <Input label={t('admin.settings.labels.whatsappNumber')} placeholder="e.g. 15555551212" value={whatsappNumber} onChange={(e) => setWhatsappNumber(e.target.value)} required />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
              <Input type="email" label={t('admin.settings.labels.contactEmail')} value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} required />
              <Input label={t('admin.settings.labels.contactPhone')} value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} required />
            </div>

            <Textarea label={t('admin.settings.labels.officeAddress')} value={contactAddress} onChange={(e) => setContactAddress(e.target.value)} required className="mt-2" />
          </UICard>

          <UICard className="p-8 bg-white border border-slate-100 shadow-sm rounded-2xl space-y-4" >
            <h3 className="text-lg font-serif text-primary font-bold mb-2">{t('admin.settings.socialTitle')}</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input label={t('admin.settings.labels.instagram')} value={socialInstagram} onChange={(e) => setSocialInstagram(e.target.value)} />
              <Input label={t('admin.settings.labels.facebook')} value={socialFacebook} onChange={(e) => setSocialFacebook(e.target.value)} />
              <Input label={t('admin.settings.labels.twitter')} value={socialTwitter} onChange={(e) => setSocialTwitter(e.target.value)} />
            </div>
          </UICard>

          <Button type="submit" variant="primary" className="py-3 px-8 rounded-xl font-bold text-white">
            {t('admin.settings.saveButton')}
          </Button>
        </div>

        {/* SEO Configuration */}
        <div>
          <UICard className="p-8 bg-white border border-slate-100 shadow-sm rounded-2xl space-y-4" >
            <h3 className="text-lg font-serif text-primary font-bold flex items-center gap-1.5">
              <Info className="w-5 h-5 text-primary" /> {t('admin.settings.seoTitle')}
            </h3>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold mb-2">Metadata settings</p>
            
            <Input label={t('admin.settings.labels.seoTitle')} value={seoTitle} onChange={(e) => setSeoTitle(e.target.value)} required />
            <Textarea label={t('admin.settings.labels.seoDescription')} value={seoDescription} onChange={(e) => setSeoDescription(e.target.value)} required />
          </UICard>
        </div>

      </form>
    </div>
  );
};
export default Settings;
