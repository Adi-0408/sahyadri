import React, { useState, useEffect } from 'react';
import { fetchCollection, createDocument, updateDocument, deleteDocument } from '../../../services/firebase';
import { Card as UICard } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Select } from '../../../components/ui/Select';
import { Dialog } from '../../../components/ui/Dialog';
import { Plus, Edit, Trash2, MapPin } from 'lucide-react';

export const TalukasManager: React.FC = () => {
  const [talukas, setTalukas] = useState<any[]>([]);
  const [districts, setDistricts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);

  const [idValue, setIdValue] = useState('');
  const [label, setLabel] = useState('');
  const [districtId, setDistrictId] = useState('');
  const [active, setActive] = useState(true);

  // Filter
  const [filterDistrict, setFilterDistrict] = useState('ALL');

  const loadData = async () => {
    setLoading(true);
    try {
      const [talukasList, districtsList] = await Promise.all([
        fetchCollection('talukas'),
        fetchCollection('districts')
      ]);
      setTalukas(talukasList);
      setDistricts(districtsList);
      if (districtsList.length > 0 && !districtId) {
        setDistrictId(districtsList[0].id);
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

  const filteredTalukas = filterDistrict === 'ALL'
    ? talukas
    : talukas.filter((t) => t.districtId === filterDistrict);

  const handleOpenAdd = () => {
    setEditingItem(null);
    setIdValue('');
    setLabel('');
    setDistrictId(districts[0]?.id || '');
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
    if (!label || !districtId) return;

    const generatedId = idValue || label.toUpperCase().replace(/\s+/g, '_');
    const payload = {
      id: generatedId,
      label,
      districtId,
      active
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
    }
  };

  const handleDelete = async (itemId: string) => {
    if (!window.confirm("Are you sure you want to delete this taluka?")) return;
    try {
      await deleteDocument('talukas', itemId);
      loadData();
    } catch (e) {
      console.error(e);
    }
  };

  const getDistrictName = (dId: string) => {
    const d = districts.find((dt) => dt.id === dId);
    return d?.label || dId;
  };

  return (
    <div className="space-y-8 text-left">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold text-slate-900 mb-1">Taluka Management</h1>
        </div>
        <Button onClick={handleOpenAdd} variant="primary" className="py-2.5 px-4 rounded-xl text-xs flex items-center gap-1.5 font-bold text-white cursor-pointer shadow-sm hover:shadow-md transition-all duration-200">
          <Plus className="w-4 h-4" /> Add Taluka
        </Button>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col md:flex-row gap-4 items-center bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
        <div className="w-full md:w-64">
          <Select
            label="Filter by District"
            options={[
              { value: 'ALL', label: 'All Districts' },
              ...districts.map((d) => ({ value: d.id, label: d.label }))
            ]}
            value={filterDistrict}
            onChange={(e) => setFilterDistrict(e.target.value)}
          />
        </div>
        <div className="text-xs text-slate-400 font-semibold">
          Showing {filteredTalukas.length} of {talukas.length} talukas
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-slate-200 border-t-primary rounded-full animate-spin"></div>
        </div>
      ) : (
        <UICard className="bg-white border border-slate-100 shadow-sm rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-[#0b0f19] text-[10px] uppercase font-bold text-white tracking-wider">
                <tr>
                  <th className="px-6 py-4">
                    <span className="flex items-center gap-1.5"><MapPin className="w-3 h-3" /> ID</span>
                  </th>
                  <th className="px-6 py-4">Taluka Name</th>
                  <th className="px-6 py-4">District</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-600 bg-white">
                {filteredTalukas.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-10 text-center text-slate-400 font-semibold">
                      No talukas found for this filter.
                    </td>
                  </tr>
                ) : (
                  filteredTalukas.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/70 transition-colors group">
                      <td className="px-6 py-4 font-semibold text-slate-900">{item.id}</td>
                      <td className="px-6 py-4 text-slate-700 font-medium">{item.label}</td>
                      <td className="px-6 py-4">
                        <span className="px-2.5 py-0.5 rounded-full text-[9px] uppercase font-extrabold border bg-purple-50 border-purple-200 text-purple-700">
                          {getDistrictName(item.districtId)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-0.5 rounded-full text-[9px] uppercase font-extrabold border ${
                          item.active !== false
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                            : 'bg-slate-50 border-slate-200 text-slate-500'
                        }`}>
                          {item.active !== false ? 'Active' : 'Disabled'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => handleOpenEdit(item)}
                            className="p-1.5 text-slate-500 hover:text-primary rounded-lg cursor-pointer hover:bg-slate-100 transition-colors"
                            title="Edit Taluka"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(item.id)}
                            className="p-1.5 text-slate-500 hover:text-rose-600 rounded-lg cursor-pointer hover:bg-rose-50 transition-colors"
                            title="Delete Taluka"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </UICard>
      )}

      {/* Add / Edit Dialog */}
      <Dialog
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title={editingItem ? 'Edit Taluka' : 'Add Taluka'}
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 text-left">
          <Input
            label="Taluka Name"
            placeholder="e.g. Miraj"
            value={label}
            onChange={(e) => {
              setLabel(e.target.value);
              if (!editingItem) {
                setIdValue(e.target.value.toUpperCase().replace(/\s+/g, '_'));
              }
            }}
            required
          />
          <Input
            label="ID (Auto-generated)"
            value={idValue}
            onChange={(e) => setIdValue(e.target.value.toUpperCase().replace(/\s+/g, '_'))}
            required
            disabled={!!editingItem}
          />
          <Select
            label="Parent District"
            options={districts.map((d) => ({ value: d.id, label: d.label }))}
            value={districtId}
            onChange={(e) => setDistrictId(e.target.value)}
            required
          />
          <div className="flex items-center gap-2 py-1">
            <input
              type="checkbox"
              id="taluka-active"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
              className="w-4 h-4 text-primary border-slate-300 rounded focus:ring-primary cursor-pointer"
            />
            <label htmlFor="taluka-active" className="text-xs uppercase tracking-widest font-bold text-slate-700 cursor-pointer">
              Active / Enabled
            </label>
          </div>
          <div className="flex gap-3 justify-end mt-4">
            <Button type="button" variant="glass" onClick={() => setIsFormOpen(false)} className="py-2 px-4 rounded-xl text-xs border-slate-200 cursor-pointer">
              Cancel
            </Button>
            <Button type="submit" variant="primary" className="py-2 px-5 rounded-xl text-xs text-white font-bold cursor-pointer">
              Save Taluka
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
};

export default TalukasManager;
