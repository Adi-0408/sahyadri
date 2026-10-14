import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { fetchCollection, createDocument, updateDocument, deleteDocument } from '../../../services/firebase';
import { Card as UICard } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Select } from '../../../components/ui/Select';
import { Textarea } from '../../../components/ui/Textarea';
import { Dialog } from '../../../components/ui/Dialog';
import { Plus, Edit, Trash2, Eye, EyeOff, MapPin, User } from 'lucide-react';

export const ProjectsManager: React.FC = () => {
  const { t } = useTranslation();
  const [projects, setProjects] = useState<any[]>([]);
  const [districts, setDistricts] = useState<any[]>([]);
  const [talukas, setTalukas] = useState<any[]>([]);
  const [amenitiesList, setAmenitiesList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProj, setEditingProj] = useState<any>(null);

  // Form Fields
  const [title, setTitle] = useState('');
  const [builderName, setBuilderName] = useState('');
  const [description, setDescription] = useState('');
  const [district, setDistrict] = useState('');
  const [taluka, setTaluka] = useState('');
  const [address, setAddress] = useState('');
  const [startingPrice, setStartingPrice] = useState('');
  const [status, setStatus] = useState('upcoming');
  const [imageLink, setImageLink] = useState('');
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [isVisible, setIsVisible] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const [projectsList, districtsList, talukasList, amenities] = await Promise.all([
        fetchCollection('projects'),
        fetchCollection('districts'),
        fetchCollection('talukas'),
        fetchCollection('amenities')
      ]);
      setProjects(projectsList);
      setDistricts(districtsList);
      setTalukas(talukasList);
      setAmenitiesList(amenities);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filter talukas by selected district
  const filteredTalukas = talukas.filter((t) => t.districtId === district);

  const handleOpenAdd = () => {
    setEditingProj(null);
    setTitle('');
    setBuilderName('');
    setDescription('');
    setDistrict(districts[0]?.id || '');
    setTaluka('');
    setAddress('');
    setStartingPrice('');
    setStatus('upcoming');
    setImageLink('');
    setSelectedAmenities([]);
    setIsVisible(true);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (proj: any) => {
    setEditingProj(proj);
    setTitle(proj.title || '');
    setBuilderName(proj.builderName || proj.developerName || '');
    setDescription(proj.description || '');
    setDistrict(proj.district || '');
    setTaluka(proj.taluka || '');
    setAddress(proj.address || proj.location || '');
    setStartingPrice(proj.startingPrice || proj.priceRange || '');
    setStatus(proj.status || 'upcoming');
    setImageLink(proj.images?.[0] || '');
    setSelectedAmenities(proj.amenities || []);
    setIsVisible(proj.isVisible !== false);
    setIsFormOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !builderName || !description) return;

    const payload = {
      title,
      builderName,
      description,
      district,
      taluka,
      address,
      location: address, // backward compat
      startingPrice,
      priceRange: startingPrice, // backward compat
      status,
      amenities: selectedAmenities,
      isVisible,
      images: [imageLink || 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1200&q=80'],
      developerName: builderName // backward compat
    };

    try {
      if (editingProj) {
        await updateDocument('projects', editingProj.id, payload);
      } else {
        await createDocument('projects', {
          ...payload,
          createdAt: new Date().toISOString()
        });
      }
      setIsFormOpen(false);
      loadData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async (projId: string) => {
    if (!window.confirm(t('admin.projects.confirmDelete') as string)) return;
    try {
      await deleteDocument('projects', projId);
      loadData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleToggleVisibility = async (proj: any) => {
    try {
      await updateDocument('projects', proj.id, { isVisible: proj.isVisible === false ? true : false });
      loadData();
    } catch (e) {
      console.error(e);
    }
  };

  const toggleAmenity = (amenityId: string) => {
    setSelectedAmenities((prev) =>
      prev.includes(amenityId)
        ? prev.filter((a) => a !== amenityId)
        : [...prev, amenityId]
    );
  };

  const getDistrictName = (dId: string) => {
    const d = districts.find((dt) => dt.id === dId);
    return d ? (t(`districts.${d.label}`, d.label) as string) : dId || '—';
  };

  const getTalukaName = (tId: string) => {
    const tVal = talukas.find((tk) => tk.id === tId);
    return tVal ? (t(`talukas.${tVal.label}`, tVal.label) as string) : tId || '—';
  };

  return (
    <div className="space-y-8 text-left">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold text-slate-900 mb-1">{t('admin.projects.title')}</h1>
        </div>
        <Button onClick={handleOpenAdd} variant="primary" className="py-2.5 px-4 rounded-xl text-xs flex items-center gap-1.5 font-bold text-white cursor-pointer shadow-sm hover:shadow-md transition-all duration-200">
          <Plus className="w-4 h-4" /> {t('admin.projects.addProject')}
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-slate-200 border-t-primary rounded-full animate-spin"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {projects.map((proj) => (
            <UICard key={proj.id} className="bg-white border border-slate-100 shadow-sm hover:shadow-md transition-all duration-300 rounded-2xl overflow-hidden flex flex-col justify-between group">
              <div>
                <div className="aspect-[16/9] overflow-hidden relative">
                  <img src={proj.images?.[0]} alt="" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                  <div className="absolute top-4 right-4 bg-primary/95 text-white backdrop-blur-sm text-[9px] font-bold px-3 py-1 rounded-full uppercase tracking-wider shadow-sm">
                    {t(`admin.projects.statusOptions.${(proj.status || 'upcoming').replace(/\s+/g, '')}`, proj.status) as string}
                  </div>
                  {proj.isVisible === false && (
                    <div className="absolute top-4 left-4 bg-orange-500/95 text-white backdrop-blur-sm text-[9px] font-bold px-3 py-1 rounded-full uppercase tracking-wider shadow-sm flex items-center gap-1">
                      <EyeOff className="w-3 h-3" /> {t('admin.projects.hidden')}
                    </div>
                  )}
                </div>
                <div className="p-6 space-y-3">
                  <h3 className="text-xl font-serif font-bold text-slate-900 group-hover:text-accent transition-colors">{proj.title}</h3>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <User className="w-3 h-3 text-slate-400" />
                      {proj.builderName || proj.developerName || '—'}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-slate-400" />
                      {proj.address || proj.location || '—'}
                    </span>
                  </div>
                  {(proj.district || proj.taluka) && (
                    <div className="flex gap-2">
                      {proj.district && (
                        <span className="px-2 py-0.5 rounded-full text-[8px] uppercase font-extrabold border bg-blue-50 border-blue-200 text-blue-700">
                          {getDistrictName(proj.district)}
                        </span>
                      )}
                      {proj.taluka && (
                        <span className="px-2 py-0.5 rounded-full text-[8px] uppercase font-extrabold border bg-purple-50 border-purple-200 text-purple-700">
                          {getTalukaName(proj.taluka)}
                        </span>
                      )}
                    </div>
                  )}
                  <div className="font-serif font-bold text-primary text-sm">
                    {proj.startingPrice || proj.priceRange ? (proj.startingPrice || proj.priceRange) : t('admin.projects.contactForPrice')}
                  </div>
                  <p className="text-slate-505 text-xs leading-relaxed font-sans line-clamp-2">{proj.description}</p>
                  {proj.amenities && proj.amenities.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {proj.amenities.slice(0, 4).map((a: string) => (
                        <span key={a} className="px-2 py-0.5 rounded text-[8px] uppercase tracking-wider font-bold bg-slate-100 text-slate-600 border border-slate-200">
                          {t(`amenities.${a}`, a)}
                        </span>
                      ))}
                      {proj.amenities.length > 4 && (
                        <span className="text-[8px] text-slate-400 font-bold">{t('admin.projects.more', { count: proj.amenities.length - 4 })}</span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="p-6 border-t border-slate-100 flex gap-3 justify-end mt-auto bg-slate-50/50">
                <Button onClick={() => handleToggleVisibility(proj)} variant="glass" className="py-2 px-4 rounded-lg text-[10px] flex items-center gap-1 border-slate-200 cursor-pointer">
                  {proj.isVisible === false ? <Eye className="w-3.5 h-3.5 text-green-600" /> : <EyeOff className="w-3.5 h-3.5 text-orange-600" />}
                  {proj.isVisible === false ? t('admin.projects.actions.show') : t('admin.projects.actions.hide')}
                </Button>
                <Button onClick={() => handleOpenEdit(proj)} variant="glass" className="py-2 px-4 rounded-lg text-[10px] flex items-center gap-1 border-slate-200 cursor-pointer">
                  <Edit className="w-3.5 h-3.5 text-primary" /> {t('admin.projects.actions.edit')}
                </Button>
                <Button onClick={() => handleDelete(proj.id)} variant="glass" className="py-2 px-4 rounded-lg text-[10px] flex items-center gap-1 border-slate-200 text-rose-500 hover:bg-rose-50 cursor-pointer">
                  <Trash2 className="w-3.5 h-3.5" /> {t('admin.projects.actions.delete')}
                </Button>
              </div>
            </UICard>
          ))}
        </div>
      )}

      {/* Form Modal */}
      <Dialog
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title={editingProj ? t('admin.projects.editTitle') : t('admin.projects.addTitle')}
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 text-left max-h-[70vh] overflow-y-auto pr-1">
          <Input label={t('admin.projects.form.name')} value={title} onChange={(e) => setTitle(e.target.value)} required />
          <Input label={t('admin.projects.form.builderName')} placeholder={t('admin.projects.form.builderPlaceholder')} value={builderName} onChange={(e) => setBuilderName(e.target.value)} required />
          <Textarea label={t('admin.projects.form.description')} value={description} onChange={(e) => setDescription(e.target.value)} required />

          <div className="grid grid-cols-2 gap-4">
            <Select
              label={t('admin.projects.form.district') as string}
              options={[
                { value: '', label: t('admin.projects.form.selectDistrict') as string },
                ...districts.map((d) => ({ value: d.id, label: t(`districts.${d.label}`, d.label) as string }))
              ]}
              value={district}
              onChange={(e) => { setDistrict(e.target.value); setTaluka(''); }}
            />
            <Select
              label={t('admin.projects.form.taluka') as string}
              options={[
                { value: '', label: t('admin.projects.form.selectTaluka') as string },
                ...filteredTalukas.map((tVal) => ({ value: tVal.id, label: t(`talukas.${tVal.label}`, tVal.label) as string }))
              ]}
              value={taluka}
              onChange={(e) => setTaluka(e.target.value)}
            />
          </div>

          <Input label={t('admin.projects.form.address')} placeholder={t('admin.projects.form.addressPlaceholder')} value={address} onChange={(e) => setAddress(e.target.value)} />
          <Input label={t('admin.projects.form.startingPrice')} placeholder={t('admin.projects.form.startingPricePlaceholder')} value={startingPrice} onChange={(e) => setStartingPrice(e.target.value)} />

          <Select
            label={t('admin.projects.form.status') as string}
            options={[
              { value: 'upcoming', label: t('admin.projects.statusOptions.upcoming') as string },
              { value: 'under construction', label: t('admin.projects.statusOptions.underConstruction') as string },
              { value: 'Ready to Move', label: t('admin.projects.statusOptions.readyToMove') as string },
              { value: 'completed', label: t('admin.projects.statusOptions.completed') as string }
            ]}
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          />

          <Input label={t('admin.projects.form.image')} value={imageLink} onChange={(e) => setImageLink(e.target.value)} />

          {/* Amenities Multi-Select */}
          <div className="flex flex-col gap-2">
            <label className="text-xs uppercase tracking-widest font-bold text-slate-500">{t('admin.projects.form.amenities') as string}</label>
            <div className="flex flex-wrap gap-2 p-3 border border-slate-200 rounded-xl bg-white max-h-40 overflow-y-auto">
              {amenitiesList.map((am) => (
                <label
                  key={am.id}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider cursor-pointer transition-all ${
                    selectedAmenities.includes(am.id)
                      ? 'bg-primary text-white border border-primary'
                      : 'bg-slate-50 text-slate-600 border border-slate-200 hover:border-primary/30'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedAmenities.includes(am.id)}
                    onChange={() => toggleAmenity(am.id)}
                    className="sr-only"
                  />
                  {t(`amenities.${am.id}`, am.label) as string}
                </label>
              ))}
            </div>
          </div>

          {/* Visibility Toggle */}
          <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-555/50 transition-colors">
            <input
              type="checkbox"
              checked={isVisible}
              onChange={(e) => setIsVisible(e.target.checked)}
              className="w-4 h-4 accent-primary cursor-pointer"
            />
            <span className="text-xs font-bold text-slate-700">{t('admin.projects.form.showOnWebsite')}</span>
          </label>

          <div className="flex gap-3 justify-end mt-4">
            <Button type="button" variant="glass" onClick={() => setIsFormOpen(false)} className="py-2 px-4 rounded-xl text-xs border-slate-200 cursor-pointer">
              {t('admin.projects.form.cancel')}
            </Button>
            <Button type="submit" variant="primary" className="py-2 px-5 rounded-xl text-xs text-white font-bold cursor-pointer">
              {t('admin.projects.form.save')}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
};
export default ProjectsManager;
