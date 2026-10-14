import React, { useState, useEffect } from 'react';
import { fetchCollection, createDocument, updateDocument, deleteDocument } from '../../../services/firebase';
import { Card as UICard } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Select } from '../../../components/ui/Select';
import { Dialog } from '../../../components/ui/Dialog';
import { Plus, Edit, Trash2 } from 'lucide-react';

export const PropertyTypesManager: React.FC = () => {
  const [propertyTypes, setPropertyTypes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingType, setEditingType] = useState<any>(null);

  // Form Fields
  const [idValue, setIdValue] = useState('');
  const [label, setLabel] = useState('');
  const [group, setGroup] = useState('RESIDENTIAL');
  const [iconName, setIconName] = useState('Home');

  const loadPropertyTypes = async () => {
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

  useEffect(() => {
    loadPropertyTypes();
  }, []);

  const handleOpenAdd = () => {
    setEditingType(null);
    setIdValue('');
    setLabel('');
    setGroup('RESIDENTIAL');
    setIconName('Home');
    setIsFormOpen(true);
  };

  const handleOpenEdit = (pt: any) => {
    setEditingType(pt);
    setIdValue(pt.id);
    setLabel(pt.label);
    setGroup(pt.group);
    setIconName(pt.iconName);
    setIsFormOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!idValue || !label || !group || !iconName) return;

    const payload = {
      id: idValue,
      label,
      group,
      iconName,
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
    }
  };

  const handleDelete = async (ptId: string) => {
    if (!window.confirm("Are you sure you want to delete this property type?")) return;
    try {
      await deleteDocument('property_types', ptId);
      loadPropertyTypes();
    } catch (e) {
      console.error(e);
    }
  };

  const GROUP_OPTIONS = [
    { value: 'RESIDENTIAL', label: 'RESIDENTIAL' },
    { value: 'COMMERCIAL', label: 'COMMERCIAL' },
    { value: 'PLOT & LAND', label: 'PLOT & LAND' },
    { value: 'OTHERS', label: 'OTHERS' }
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
    <div className="space-y-8 text-left">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold text-slate-900 mb-1">Property Types</h1>
        </div>
        <Button onClick={handleOpenAdd} variant="primary" className="py-2.5 px-4 rounded-xl text-xs flex items-center gap-1.5 font-bold text-white">
          <Plus className="w-4 h-4" /> Add Property Type
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
        </div>
      ) : (
        <UICard className="bg-white border border-slate-100 shadow-sm rounded-2xl overflow-hidden" >
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-[#0b0f19] text-[10px] uppercase font-bold text-white tracking-wider">
                <tr>
                  <th className="px-6 py-4">ID (Value)</th>
                  <th className="px-6 py-4">Label</th>
                  <th className="px-6 py-4">Group</th>
                  <th className="px-6 py-4">Icon Name</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-650 bg-white">
                {propertyTypes.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-10 text-center text-slate-400 font-semibold">No property types found.</td>
                  </tr>
                ) : (
                  propertyTypes.map((pt) => (
                    <tr key={pt.id} className="hover:bg-slate-50/70 transition-colors group">
                      <td className="px-6 py-4 font-semibold text-slate-900">{pt.id}</td>
                      <td className="px-6 py-4 text-slate-600">{pt.label}</td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-0.5 rounded bg-slate-50 border border-slate-200 text-slate-600 text-[8px] uppercase tracking-wider font-bold">
                          {pt.group}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-600">{pt.iconName}</td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenEdit(pt)}
                            className="p-1.5 text-slate-500 hover:text-primary rounded-lg cursor-pointer hover:bg-slate-100 transition-colors"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(pt.id)}
                            className="p-1.5 text-slate-500 hover:text-red-500 rounded-lg cursor-pointer hover:bg-red-50 transition-colors"
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

      {/* Form Modal */}
      <Dialog
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title={editingType ? 'Edit Property Type' : 'Add Property Type'}
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 text-left font-sans">
          <Input 
            label="Internal ID (e.g. 'villa', 'flat')" 
            value={idValue} 
            onChange={(e) => setIdValue(e.target.value.toLowerCase().replace(/\s+/g, ''))} 
            required 
            disabled={!!editingType}
          />
          <Input 
            label="Display Label (e.g. 'Bungalow / Villa')" 
            value={label} 
            onChange={(e) => setLabel(e.target.value)} 
            required 
          />

          <div className="grid grid-cols-2 gap-4">
            <div>
               <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Group</label>
               <Select 
                 value={group} 
                 onChange={(e) => setGroup(e.target.value)} 
                 options={GROUP_OPTIONS} 
                 required 
               />
            </div>
            <div>
               <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Icon</label>
               <Select 
                 value={iconName} 
                 onChange={(e) => setIconName(e.target.value)} 
                 options={ICON_OPTIONS} 
                 required 
               />
            </div>
          </div>

          <div className="flex gap-3 justify-end mt-4">
            <Button type="button" variant="glass" onClick={() => setIsFormOpen(false)} className="py-2 px-4 rounded-xl text-xs border-slate-200">
              Cancel
            </Button>
            <Button type="submit" variant="primary" className="py-2 px-5 rounded-xl text-xs text-white font-bold">
              Save Property Type
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
};
export default PropertyTypesManager;
