import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { fetchCollection, createDocument, updateDocument, deleteDocument } from '../../../../services/firebase';
import { Card } from '../../../../components/ui/Card';
import { Button } from '../../../../components/ui/Button';
import { Input } from '../../../../components/ui/Input';
import { Select } from '../../../../components/ui/Select';
import { Dialog } from '../../../../components/ui/Dialog';
import { Plus, Edit, Trash2, ChevronDown, ChevronUp, MapPin, CheckCircle2, XCircle, Search } from 'lucide-react';

export const TalukaManagementTab: React.FC = () => {
  const { t } = useTranslation();
  const [districts, setDistricts] = useState<any[]>([]);
  const [talukas, setTalukas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Accordion collapsed state: object map of { [districtId]: isOpenBoolean }
  const [expandedDistricts, setExpandedDistricts] = useState<{ [key: string]: boolean }>({});

  // Dialog State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [idValue, setIdValue] = useState('');
  const [label, setLabel] = useState('');
  const [districtId, setDistrictId] = useState('');
  const [active, setActive] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const [districtsList, talukasList] = await Promise.all([
        fetchCollection('districts'),
        fetchCollection('talukas')
      ]);
      setDistricts(districtsList);
      setTalukas(talukasList);
      
      // Auto-expand first district if any
      if (districtsList.length > 0) {
        setExpandedDistricts((prev) => {
          const updated = { ...prev };
          districtsList.forEach((d: any, idx: number) => {
            if (updated[d.id] === undefined) {
              updated[d.id] = idx === 0; // expand first by default
            }
          });
          return updated;
        });
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

  const toggleAccordion = (dId: string) => {
    setExpandedDistricts((prev) => ({
      ...prev,
      [dId]: !prev[dId]
    }));
  };

  const handleOpenAdd = (defaultDistrictId?: string) => {
    setEditingItem(null);
    setIdValue('');
    setLabel('');
    setDistrictId(defaultDistrictId || districts[0]?.id || '');
    setActive(true);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (item: any) => {
    setEditingItem(item);
    setIdValue(item.id);
    setLabel(item.label);
    setDistrictId(item.districtId);
    setActive(item.active !== false);
    setIsFormOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!label.trim() || !districtId) {
      alert(t('admin.heroSection.talukas.alertFillFields'));
      return;
    }

    const generatedId = idValue || label.toUpperCase().trim().replace(/\s+/g, '_');

    // Duplicate check
    if (!editingItem && talukas.some((t) => t.id === generatedId)) {
      alert(t('admin.heroSection.talukas.alertDuplicate'));
      return;
    }

    const payload = {
      id: generatedId,
      label: label.trim(),
      districtId,
      active,
      createdAt: editingItem?.createdAt || new Date().toISOString()
    };

    try {
      if (editingItem) {
        await updateDocument('talukas', editingItem.id, payload);
      } else {
        await createDocument('talukas', payload);
      }
      setIsFormOpen(false);
      loadData();
    } catch (e) {
      console.error(e);
      alert(t('admin.heroSection.talukas.alertSaveFail'));
    }
  };

  const handleDelete = async (item: any) => {
    if (!window.confirm(t('admin.heroSection.talukas.confirmDelete', { label: item.label }))) return;
    try {
      await deleteDocument('talukas', item.id);
      loadData();
    } catch (e) {
      console.error(e);
      alert(t('admin.heroSection.talukas.alertDeleteFail'));
    }
  };

  const handleToggleStatus = async (item: any) => {
    try {
      const updatedStatus = item.active === false ? true : false;
      await updateDocument('talukas', item.id, {
        ...item,
        active: updatedStatus
      });
      loadData();
    } catch (e) {
      console.error(e);
      alert(t('admin.heroSection.talukas.alertStatusFail'));
    }
  };

  // Filter talukas by query
  const getFilteredTalukasForDistrict = (dId: string) => {
    return talukas.filter((t) => 
      t.districtId === dId && 
      (t.label.toLowerCase().includes(searchQuery.toLowerCase()) || t.id.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  };

  return (
    <div className="space-y-6 text-left font-sans">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-1">{t('admin.heroSection.talukas.title')}</h3>
          <p className="text-xs text-slate-500 font-medium">{t('admin.heroSection.talukas.desc')}</p>
        </div>
        <Button onClick={() => handleOpenAdd()} variant="primary" className="py-2.5 px-4 rounded-xl text-xs flex items-center gap-1.5 font-bold text-white shadow-sm cursor-pointer hover:shadow-md transition-all duration-200">
          <Plus className="w-4 h-4" /> {t('admin.heroSection.talukas.addTaluka')}
        </Button>
      </div>

      {/* Filter and Search */}
      <div className="flex bg-white p-4 rounded-2xl border border-slate-100 shadow-sm items-center relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-8" />
        <input
          type="text"
          placeholder={t('admin.heroSection.talukas.searchPlaceholder')}
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
        <div className="space-y-4">
          {districts.length === 0 ? (
            <Card className="p-8 text-center bg-white border border-slate-100 rounded-2xl text-slate-400 font-semibold">
              {t('admin.heroSection.talukas.noDistricts')}
            </Card>
          ) : (
            districts.map((dst) => {
              const districtTalukas = getFilteredTalukasForDistrict(dst.id);
              const totalTalukasCount = talukas.filter((t) => t.districtId === dst.id).length;
              const isExpanded = expandedDistricts[dst.id];

              return (
                <div key={dst.id} className="border border-slate-150/70 rounded-2xl overflow-hidden bg-white shadow-sm transition-all">
                  {/* Accordion Header */}
                  <div
                    onClick={() => toggleAccordion(dst.id)}
                    className="flex justify-between items-center px-5 py-4 cursor-pointer hover:bg-slate-550/5 select-none bg-slate-50 border-b border-slate-100"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-1.5 bg-[#0b0f19]/10 text-[#0b0f19] rounded-lg">
                        <MapPin className="w-4 h-4" />
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-sm">{dst.label}</span>
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">({dst.id})</span>
                      </div>
                      <span className="text-xs bg-slate-200 text-slate-700 px-2.5 py-0.5 rounded-full font-bold">
                        {totalTalukasCount === 1 ? t('admin.heroSection.talukas.totalTalukas', { count: totalTalukasCount }) : t('admin.heroSection.talukas.totalTalukasPlural', { count: totalTalukasCount })}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenAdd(dst.id);
                        }}
                        className="py-1 px-3 bg-white border border-slate-200 hover:border-slate-350 text-[10px] font-bold uppercase text-slate-700 hover:text-slate-900 rounded-lg flex items-center gap-1 transition-all"
                      >
                        <Plus className="w-3.5 h-3.5" /> {t('admin.heroSection.talukas.addTaluka')}
                      </button>
                      {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
                    </div>
                  </div>

                  {/* Accordion Body */}
                  {isExpanded && (
                    <div className="divide-y divide-slate-100 max-h-[350px] overflow-y-auto">
                      {districtTalukas.length === 0 ? (
                        <div className="p-6 text-center text-slate-400 font-semibold text-xs bg-white">
                          {searchQuery ? t('admin.heroSection.talukas.noTalukasMatching') : t('admin.heroSection.talukas.noTalukas')}
                        </div>
                      ) : (
                        <table className="w-full text-left">
                          <thead className="bg-[#0b0f19]/5 text-[9px] uppercase font-bold text-slate-500 tracking-wider">
                            <tr>
                              <th className="px-6 py-3">{t('admin.heroSection.talukas.table.name')}</th>
                              <th className="px-6 py-3">{t('admin.heroSection.talukas.table.status')}</th>
                              <th className="px-6 py-3 text-right">{t('admin.heroSection.talukas.table.actions')}</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 text-xs bg-white">
                            {districtTalukas.map((tk) => (
                              <tr key={tk.id} className="hover:bg-slate-50/40 transition-colors">
                                <td className="px-6 py-3.5">
                                  <div className="flex flex-col">
                                    <span className="font-semibold text-slate-800 text-xs">{tk.label}</span>
                                    <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">ID: {tk.id}</span>
                                  </div>
                                </td>
                                <td className="px-6 py-3.5">
                                  <button
                                    onClick={() => handleToggleStatus(tk)}
                                    className={`px-2 py-0.5 rounded-full text-[8px] uppercase font-extrabold border cursor-pointer flex items-center gap-1 w-fit transition-all ${
                                      tk.active !== false
                                        ? 'bg-emerald-50 border-emerald-250 text-emerald-700 hover:bg-emerald-100'
                                        : 'bg-rose-50 border-rose-250 text-rose-600 hover:bg-rose-100'
                                    }`}
                                    title="Click to toggle status"
                                  >
                                    {tk.active !== false ? (
                                      <>
                                        <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
                                        <span>{t('admin.heroSection.districts.active')}</span>
                                      </>
                                    ) : (
                                      <>
                                        <XCircle className="w-2.5 h-2.5 text-rose-500" />
                                        <span>{t('admin.heroSection.districts.disabled')}</span>
                                      </>
                                    )}
                                  </button>
                                </td>
                                <td className="px-6 py-3.5 text-right">
                                  <div className="flex justify-end gap-1.5">
                                    <button
                                      onClick={() => handleOpenEdit(tk)}
                                      className="p-1.5 text-slate-500 hover:text-primary rounded-lg cursor-pointer hover:bg-slate-100 transition-colors"
                                      title="Edit Taluka"
                                    >
                                      <Edit className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      onClick={() => handleDelete(tk)}
                                      className="p-1.5 text-slate-500 hover:text-red-500 rounded-lg cursor-pointer hover:bg-red-50 transition-colors"
                                      title="Delete Taluka"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Add / Edit Dialog */}
      <Dialog
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title={editingItem ? t('admin.heroSection.talukas.editTitle') : t('admin.heroSection.talukas.addTitle')}
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 text-left font-sans">
          <Input
            label={t('admin.heroSection.talukas.nameLabel')}
            placeholder="e.g. Miraj"
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
              label={t('admin.heroSection.talukas.idLabel')}
              value={idValue}
              onChange={(e) => setIdValue(e.target.value.toUpperCase().trim().replace(/\s+/g, '_'))}
              required
              disabled={!!editingItem}
            />
            <p className="text-[10px] text-slate-400 mt-1 font-medium">
              {t('admin.heroSection.talukas.idDesc')}
            </p>
          </div>
          <Select
            label={t('admin.heroSection.talukas.parentDistrict')}
            options={districts.map((d) => ({ value: d.id, label: d.label }))}
            value={districtId}
            onChange={(e) => setDistrictId(e.target.value)}
            required
          />
          <div className="flex items-center gap-2 py-1.5">
            <input
              type="checkbox"
              id="taluka-status-chk"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
              className="w-4 h-4 text-primary border-slate-350 rounded focus:ring-primary cursor-pointer"
            />
            <label htmlFor="taluka-status-chk" className="text-xs uppercase tracking-widest font-extrabold text-slate-700 cursor-pointer">
              {t('admin.heroSection.talukas.checkboxLabel')}
            </label>
          </div>

          <div className="flex gap-3 justify-end mt-4 pt-3 border-t border-slate-100">
            <Button type="button" variant="glass" onClick={() => setIsFormOpen(false)} className="py-2 px-4 rounded-xl text-xs border-slate-200 cursor-pointer">
              {t('admin.heroSection.talukas.cancelButton')}
            </Button>
            <Button type="submit" variant="primary" className="py-2 px-5 rounded-xl text-xs text-white font-bold cursor-pointer">
              {t('admin.heroSection.talukas.saveButton')}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
};
