import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { fetchCollection, createDocument, updateDocument, deleteDocument } from '../../../../services/firebase';
import { Card } from '../../../../components/ui/Card';
import { Button } from '../../../../components/ui/Button';
import { Input } from '../../../../components/ui/Input';
import { Select } from '../../../../components/ui/Select';
import { Dialog } from '../../../../components/ui/Dialog';
import { Plus, Edit, Trash2, CheckCircle2, XCircle, Search, Calendar } from 'lucide-react';

export const DistrictManagementTab: React.FC = () => {
  const { t } = useTranslation();
  const [districts, setDistricts] = useState<any[]>([]);
  const [talukas, setTalukas] = useState<any[]>([]);
  const [states, setStates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Dialog Form State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [idValue, setIdValue] = useState('');
  const [label, setLabel] = useState('');
  const [stateId, setStateId] = useState('MH');
  const [active, setActive] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const [districtsList, talukasList, statesList] = await Promise.all([
        fetchCollection('districts'),
        fetchCollection('talukas'),
        fetchCollection('states').catch(() => [])
      ]);
      setDistricts(districtsList);
      setTalukas(talukasList);
      setStates(statesList.length > 0 ? statesList : [{ id: 'MH', label: 'Maharashtra' }]);
      if (statesList.length > 0 && !stateId) {
        setStateId(statesList[0].id);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenAdd = () => {
    setEditingItem(null);
    setIdValue('');
    setLabel('');
    setStateId(states[0]?.id || 'MH');
    setActive(true);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (item: any) => {
    setEditingItem(item);
    setIdValue(item.id);
    setLabel(item.label);
    setStateId(item.stateId || 'MH');
    setActive(item.active !== false);
    setIsFormOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!label.trim()) {
      alert(t('admin.heroSection.districts.alertEnterName'));
      return;
    }

    const generatedId = idValue || label.toUpperCase().trim().replace(/\s+/g, '_');
    
    // Check duplication if adding new
    if (!editingItem && districts.some((d) => d.id === generatedId)) {
      alert(t('admin.heroSection.districts.alertDuplicate'));
      return;
    }

    const payload = {
      id: generatedId,
      label: label.trim(),
      stateId,
      active,
      createdAt: editingItem?.createdAt || new Date().toISOString()
    };

    try {
      if (editingItem) {
        await updateDocument('districts', editingItem.id, payload);
      } else {
        await createDocument('districts', payload);
      }
      setIsFormOpen(false);
      loadData();
    } catch (e) {
      console.error(e);
      alert(t('admin.heroSection.districts.alertStatusFail'));
    }
  };

  const handleDelete = async (item: any) => {
    const associatedTalukas = talukas.filter((t) => t.districtId === item.id);
    if (associatedTalukas.length > 0) {
      if (!window.confirm(t('admin.heroSection.districts.confirmDeleteOrphan', { label: item.label, count: associatedTalukas.length }))) {
        return;
      }
    } else {
      if (!window.confirm(t('admin.heroSection.districts.confirmDelete', { label: item.label }))) {
        return;
      }
    }

    try {
      await deleteDocument('districts', item.id);
      loadData();
    } catch (e) {
      console.error(e);
      alert(t('admin.heroSection.districts.alertDeleteFail'));
    }
  };

  const handleToggleStatus = async (item: any) => {
    try {
      const updatedStatus = item.active === false ? true : false;
      await updateDocument('districts', item.id, {
        ...item,
        active: updatedStatus
      });
      loadData();
    } catch (e) {
      console.error(e);
      alert(t('admin.heroSection.districts.alertStatusFail'));
    }
  };

  const getTalukaCount = (districtId: string) => {
    return talukas.filter((t) => t.districtId === districtId).length;
  };

  const filteredDistricts = districts.filter((d) => 
    d.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 text-left font-sans">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-1">{t('admin.heroSection.districts.title')}</h3>
          <p className="text-xs text-slate-500 font-medium">{t('admin.heroSection.districts.desc')}</p>
        </div>
        <Button onClick={handleOpenAdd} variant="primary" className="py-2.5 px-4 rounded-xl text-xs flex items-center gap-1.5 font-bold text-white shadow-sm cursor-pointer hover:shadow-md transition-all duration-200">
          <Plus className="w-4 h-4" /> {t('admin.heroSection.districts.addDistrict')}
        </Button>
      </div>

      {/* Filter and Search */}
      <div className="flex bg-white p-4 rounded-2xl border border-slate-100 shadow-sm items-center relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-8" />
        <input
          type="text"
          placeholder={t('admin.heroSection.districts.searchPlaceholder')}
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
                  <th className="px-6 py-4">{t('admin.heroSection.districts.table.name')}</th>
                  <th className="px-6 py-4">{t('admin.heroSection.districts.table.totalTalukas')}</th>
                  <th className="px-6 py-4">{t('admin.heroSection.districts.table.status')}</th>
                  <th className="px-6 py-4">{t('admin.heroSection.districts.table.createdDate')}</th>
                  <th className="px-6 py-4 text-right">{t('admin.heroSection.districts.table.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-650 bg-white">
                {filteredDistricts.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-10 text-center text-slate-400 font-semibold">
                      {t('admin.heroSection.districts.noDistricts')}
                    </td>
                  </tr>
                ) : (
                  filteredDistricts.map((item) => {
                    const talukasCount = getTalukaCount(item.id);
                    const formattedDate = item.createdAt 
                    ? new Date(item.createdAt).toLocaleDateString('en-IN')
                    : 'N/A';
                      
                    return (
                      <tr key={item.id} className="hover:bg-slate-50/70 transition-colors group">
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="font-semibold text-slate-900 text-sm">{item.label}</span>
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">ID: {item.id}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 border border-slate-200 text-slate-700">
                            {talukasCount} {talukasCount === 1 ? t('admin.heroSection.talukas.totalTalukas', { count: talukasCount }) : t('admin.heroSection.talukas.totalTalukasPlural', { count: talukasCount })}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <button
                            onClick={() => handleToggleStatus(item)}
                            className={`px-2.5 py-0.5 rounded-full text-[9px] uppercase font-extrabold border cursor-pointer flex items-center gap-1 transition-all ${
                              item.active !== false
                                ? 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100'
                                : 'bg-rose-50 border-rose-200 text-rose-600 hover:bg-rose-100'
                            }`}
                            title="Click to toggle status"
                          >
                            {item.active !== false ? (
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
                        <td className="px-6 py-4 text-slate-500">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            <span>{formattedDate}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-1.5">
                            <button
                              onClick={() => handleOpenEdit(item)}
                              className="p-2 text-slate-500 hover:text-primary rounded-lg cursor-pointer hover:bg-slate-100 transition-colors"
                              title="Edit District"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(item)}
                              className="p-2 text-slate-500 hover:text-red-500 rounded-lg cursor-pointer hover:bg-red-50 transition-colors"
                              title="Delete District"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Add / Edit Dialog */}
      <Dialog
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title={editingItem ? t('admin.heroSection.districts.editTitle') : t('admin.heroSection.districts.addTitle')}
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 text-left font-sans">
          <Input
            label={t('admin.heroSection.districts.districtNameLabel')}
            placeholder="e.g. Sangli"
            value={label}
            onChange={(e) => {
              setLabel(e.target.value);
              if (!editingItem) {
                setIdValue(e.target.value.toUpperCase().trim().replace(/\s+/g, '_'));
              }
            }}
            required
          />
          <div>
            <Input
              label={t('admin.heroSection.districts.idLabel')}
              value={idValue}
              onChange={(e) => setIdValue(e.target.value.toUpperCase().trim().replace(/\s+/g, '_'))}
              required
              disabled={!!editingItem}
            />
            <p className="text-[10px] text-slate-400 mt-1 font-medium">
              {t('admin.heroSection.districts.idDesc')}
            </p>
          </div>
          <Select
            label={t('admin.heroSection.districts.parentState')}
            options={states.map((s) => ({ value: s.id, label: s.label }))}
            value={stateId}
            onChange={(e) => setStateId(e.target.value)}
            required
          />
          <div className="flex items-center gap-2 py-1.5">
            <input
              type="checkbox"
              id="district-status-chk"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
              className="w-4 h-4 text-primary border-slate-350 rounded focus:ring-primary cursor-pointer"
            />
            <label htmlFor="district-status-chk" className="text-xs uppercase tracking-widest font-extrabold text-slate-700 cursor-pointer">
              {t('admin.heroSection.districts.checkboxLabel')}
            </label>
          </div>

          <div className="flex gap-3 justify-end mt-4 pt-3 border-t border-slate-100">
            <Button type="button" variant="glass" onClick={() => setIsFormOpen(false)} className="py-2 px-4 rounded-xl text-xs border-slate-200 cursor-pointer">
              {t('admin.heroSection.districts.cancelButton')}
            </Button>
            <Button type="submit" variant="primary" className="py-2 px-5 rounded-xl text-xs text-white font-bold cursor-pointer">
              {t('admin.heroSection.districts.saveButton')}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
};
