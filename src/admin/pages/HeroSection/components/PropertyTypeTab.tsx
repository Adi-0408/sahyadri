import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { fetchCollection, createDocument, updateDocument, deleteDocument } from '../../../../services/firebase';
import { Card } from '../../../../components/ui/Card';
import { Button } from '../../../../components/ui/Button';
import { Input } from '../../../../components/ui/Input';
import { Select } from '../../../../components/ui/Select';
import { Dialog } from '../../../../components/ui/Dialog';
import { Plus, Edit, Trash2, CheckCircle2, XCircle, Search } from 'lucide-react';

export const PropertyTypeTab: React.FC = () => {
  const { t } = useTranslation();
  const [propertyTypes, setPropertyTypes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Dialog Form Fields
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingType, setEditingType] = useState<any>(null);
  const [idValue, setIdValue] = useState('');
  const [label, setLabel] = useState('');
  const [group, setGroup] = useState('RESIDENTIAL');
  const [iconName, setIconName] = useState('Home');
  const [active, setActive] = useState(true);

  const loadPropertyTypes = async () => {
    setLoading(true);
    try {
      const list = await fetchCollection('property_types');
      setPropertyTypes(list);
    } catch (e) {
      console.error(e);
    } finally {
      setPropertyTypes(list => list || []); // Safe fallback
      setLoading(false);
    }
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const list = await fetchCollection('property_types');
        setPropertyTypes(list);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleOpenAdd = () => {
    setEditingType(null);
    setIdValue('');
    setLabel('');
    setGroup('RESIDENTIAL');
    setIconName('Home');
    setActive(true);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (pt: any) => {
    setEditingType(pt);
    setIdValue(pt.id);
    setLabel(pt.label);
    setGroup(pt.group);
    setIconName(pt.iconName);
    setActive(pt.active !== false);
    setIsFormOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!idValue.trim() || !label.trim() || !group || !iconName) {
      alert(t('admin.heroSection.propertyTypes.alertFillFields'));
      return;
    }

    const cleanedId = idValue.toLowerCase().trim().replace(/\s+/g, '');
    
    // Duplicate check
    if (!editingType && propertyTypes.some((pt) => pt.id === cleanedId)) {
      alert(t('admin.heroSection.propertyTypes.alertDuplicate'));
      return;
    }

    const payload = {
      id: cleanedId,
      label: label.trim(),
      group,
      iconName,
      active,
      createdAt: editingType ? editingType.createdAt : new Date().toISOString()
    };

    try {
      if (editingType) {
        await updateDocument('property_types', editingType.id, payload);
      } else {
        await createDocument('property_types', payload);
      }
      setIsFormOpen(false);
      loadPropertyTypes();
    } catch (e) {
      console.error(e);
      alert(t('admin.heroSection.propertyTypes.alertSaveFail'));
    }
  };

  const handleDelete = async (pt: any) => {
    if (!window.confirm(t('admin.heroSection.propertyTypes.confirmDelete', { label: pt.label }))) return;
    try {
      await deleteDocument('property_types', pt.id);
      loadPropertyTypes();
    } catch (e) {
      console.error(e);
      alert(t('admin.heroSection.propertyTypes.alertDeleteFail'));
    }
  };

  const handleToggleStatus = async (item: any) => {
    try {
      const updatedStatus = item.active === false ? true : false;
      await updateDocument('property_types', item.id, {
        ...item,
        active: updatedStatus
      });
      loadPropertyTypes();
    } catch (e) {
      console.error(e);
      alert(t('admin.heroSection.propertyTypes.alertStatusFail'));
    }
  };

  const filteredTypes = propertyTypes.filter((pt) => 
    pt.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
    pt.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    pt.group.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const GROUP_OPTIONS = [
    { value: 'RESIDENTIAL', label: t('admin.heroSection.propertyTypes.groups.residential') as string },
    { value: 'COMMERCIAL', label: t('admin.heroSection.propertyTypes.groups.commercial') as string },
    { value: 'PLOT & LAND', label: t('admin.heroSection.propertyTypes.groups.plotland') as string },
    { value: 'OTHERS', label: t('admin.heroSection.propertyTypes.groups.others') as string }
  ];

  const ICON_OPTIONS = [
    { value: 'Building', label: 'Building (Flat/Apartment)' },
    { value: 'Home', label: 'Home (Villa/Bungalow)' },
    { value: 'LayoutGrid', label: 'Layout Grid (Row House)' },
    { value: 'Building2', label: 'Building2 (Office Space)' },
    { value: 'Store', label: 'Store (Shop/Retail)' },
    { value: 'MonitorPlay', label: 'Monitor Play (Showroom)' },
    { value: 'Map', label: 'Map (Individual Plot)' },
    { value: 'Layout', label: 'Layout (Plotting Project)' },
    { value: 'Users', label: 'Users (PG/Hostel)' },
    { value: 'Hammer', label: 'Hammer (New Project)' },
    { value: 'Key', label: 'Key (General)' },
    { value: 'Briefcase', label: 'Briefcase (Commercial)' }
  ];

  return (
    <div className="space-y-6 text-left font-sans">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-1">{t('admin.heroSection.propertyTypes.title')}</h3>
          <p className="text-xs text-slate-500 font-medium">{t('admin.heroSection.propertyTypes.desc')}</p>
        </div>
        <Button onClick={handleOpenAdd} variant="primary" className="py-2.5 px-4 rounded-xl text-xs flex items-center gap-1.5 font-bold text-white shadow-sm cursor-pointer hover:shadow-md transition-all duration-200">
          <Plus className="w-4 h-4" /> {t('admin.heroSection.propertyTypes.addType')}
        </Button>
      </div>

      {/* Filter and Search */}
      <div className="flex bg-white p-4 rounded-2xl border border-slate-100 shadow-sm items-center relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-8" />
        <input
          type="text"
          placeholder={t('admin.heroSection.propertyTypes.searchPlaceholder')}
          className="w-full bg-slate-50 border border-slate-200 focus:border-primary focus:bg-white transition-all rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-900 focus:outline-none placeholder-slate-400"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-20 bg-white border border-slate-100 rounded-2xl">
          <div className="w-8 h-8 border-4 border-slate-200 border-t-primary rounded-full animate-spin"></div>
        </div>
      ) : (
        <Card className="bg-white border border-slate-100 shadow-sm rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-[#0b0f19] text-[10px] uppercase font-bold text-white tracking-wider">
                <tr>
                  <th className="px-6 py-4">{t('admin.heroSection.propertyTypes.table.label')}</th>
                  <th className="px-6 py-4">{t('admin.heroSection.propertyTypes.table.id')}</th>
                  <th className="px-6 py-4">{t('admin.heroSection.propertyTypes.table.group')}</th>
                  <th className="px-6 py-4">{t('admin.heroSection.propertyTypes.table.icon')}</th>
                  <th className="px-6 py-4">{t('admin.heroSection.propertyTypes.table.status')}</th>
                  <th className="px-6 py-4 text-right">{t('admin.heroSection.propertyTypes.table.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-650 bg-white">
                {filteredTypes.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-10 text-center text-slate-400 font-semibold">
                      {t('admin.heroSection.propertyTypes.noTypes')}
                    </td>
                  </tr>
                ) : (
                  filteredTypes.map((pt) => (
                    <tr key={pt.id} className="hover:bg-slate-50/70 transition-colors group">
                      <td className="px-6 py-4 font-semibold text-slate-900 text-sm">{pt.label}</td>
                      <td className="px-6 py-4 text-slate-500 font-medium font-mono">{pt.id}</td>
                      <td className="px-6 py-4">
                        <span className="px-2.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-600 text-[8px] uppercase tracking-wider font-extrabold">
                          {t(`admin.heroSection.propertyTypes.groups.${(pt.group || '').toLowerCase().replace(/[^a-z]/g, '')}`, pt.group) as string}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-500 font-mono text-[11px]">{pt.iconName}</td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => handleToggleStatus(pt)}
                          className={`px-2.5 py-0.5 rounded-full text-[9px] uppercase font-extrabold border cursor-pointer flex items-center gap-1 transition-all ${
                            pt.active !== false
                              ? 'bg-emerald-50 border-emerald-250 text-emerald-700 hover:bg-emerald-100'
                              : 'bg-rose-50 border-rose-250 text-rose-600 hover:bg-rose-100'
                          }`}
                          title="Click to toggle status"
                        >
                          {pt.active !== false ? (
                            <>
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              <span>{t('admin.heroSection.districts.active')}</span>
                            </>
                          ) : (
                            <>
                              <XCircle className="w-3 h-3 text-rose-500" />
                              <span>{t('admin.heroSection.districts.disabled')}</span>
                            </>
                          )}
                        </button>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenEdit(pt)}
                            className="p-2 text-slate-500 hover:text-primary rounded-lg cursor-pointer hover:bg-slate-100 transition-colors"
                            title="Edit Property Type"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(pt)}
                            className="p-2 text-slate-500 hover:text-red-500 rounded-lg cursor-pointer hover:bg-red-550/10 transition-colors"
                            title="Delete Property Type"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Form Modal */}
      <Dialog
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title={editingType ? t('admin.heroSection.propertyTypes.editTitle') : t('admin.heroSection.propertyTypes.addTitle')}
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 text-left font-sans">
          <div>
            <Input 
              label={t('admin.heroSection.propertyTypes.idLabel')} 
              value={idValue} 
              onChange={(e) => setIdValue(e.target.value.toLowerCase().replace(/\s+/g, ''))} 
              required 
              disabled={!!editingType}
            />
            <p className="text-[10px] text-slate-400 mt-1 font-medium">
              {t('admin.heroSection.propertyTypes.idDesc')}
            </p>
          </div>
          <Input 
            label={t('admin.heroSection.propertyTypes.labelLabel')} 
            value={label} 
            onChange={(e) => setLabel(e.target.value)} 
            required 
          />

          <div className="grid grid-cols-2 gap-4">
            <div>
               <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">{t('admin.heroSection.propertyTypes.groupLabel')}</label>
               <Select 
                 value={group} 
                 onChange={(e) => setGroup(e.target.value)} 
                 options={GROUP_OPTIONS} 
                 required 
               />
            </div>
            <div>
               <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">{t('admin.heroSection.propertyTypes.iconLabel')}</label>
               <Select 
                 value={iconName} 
                 onChange={(e) => setIconName(e.target.value)} 
                 options={ICON_OPTIONS} 
                 required 
               />
            </div>
          </div>

          <div className="flex items-center gap-2 py-1.5">
            <input
              type="checkbox"
              id="pt-status-chk"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
              className="w-4 h-4 text-primary border-slate-350 rounded focus:ring-primary cursor-pointer"
            />
            <label htmlFor="pt-status-chk" className="text-xs uppercase tracking-widest font-extrabold text-slate-700 cursor-pointer">
              {t('admin.heroSection.propertyTypes.checkboxLabel')}
            </label>
          </div>

          <div className="flex gap-3 justify-end mt-4 pt-3 border-t border-slate-100">
            <Button type="button" variant="glass" onClick={() => setIsFormOpen(false)} className="py-2 px-4 rounded-xl text-xs border-slate-200 cursor-pointer">
              {t('admin.heroSection.propertyTypes.cancelButton')}
            </Button>
            <Button type="submit" variant="primary" className="py-2 px-5 rounded-xl text-xs text-white font-bold cursor-pointer">
              {t('admin.heroSection.propertyTypes.saveButton')}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
};
