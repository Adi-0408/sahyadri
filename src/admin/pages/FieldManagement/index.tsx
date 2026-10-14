import React, { useState, useEffect } from 'react';
import { fetchCollection, updateDocument } from '../../../services/firebase';
import { Card as UICard } from '../../../components/ui/Card';
import { Eye, EyeOff, ArrowUp, ArrowDown } from 'lucide-react';

export const FieldManagement: React.FC = () => {
  const [fields, setFields] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadFields = async () => {
    setLoading(true);
    try {
      const list = await fetchCollection('cms_fields');
      // Sort by order parameter
      list.sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0));
      setFields(list);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFields();
  }, []);

  const toggleVisibility = async (field: any) => {
    try {
      await updateDocument('cms_fields', field.id, {
        isVisible: !field.isVisible
      });
      loadFields();
    } catch (e) {
      console.error(e);
    }
  };

  const moveUp = async (index: number) => {
    if (index === 0) return;
    try {
      const current = fields[index];
      const prev = fields[index - 1];
      
      const currentOrder = current.order ?? index;
      const prevOrder = prev.order ?? (index - 1);

      await updateDocument('cms_fields', current.id, { order: prevOrder });
      await updateDocument('cms_fields', prev.id, { order: currentOrder });
      
      loadFields();
    } catch (e) {
      console.error(e);
    }
  };

  const moveDown = async (index: number) => {
    if (index === fields.length - 1) return;
    try {
      const current = fields[index];
      const next = fields[index + 1];
      
      const currentOrder = current.order ?? index;
      const nextOrder = next.order ?? (index + 1);

      await updateDocument('cms_fields', current.id, { order: nextOrder });
      await updateDocument('cms_fields', next.id, { order: currentOrder });
      
      loadFields();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-8 text-left">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold text-slate-900 mb-1">Field Management</h1>
        </div>
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
                  <th className="px-6 py-4">Order</th>
                  <th className="px-6 py-4">Field ID</th>
                  <th className="px-6 py-4">Label</th>
                  <th className="px-6 py-4">Required</th>
                  <th className="px-6 py-4">Visibility</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-650 bg-white">
                {fields.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-10 text-center text-slate-400 font-semibold">No CMS fields found.</td>
                  </tr>
                ) : (
                  fields.map((field, idx) => (
                    <tr key={field.id} className="hover:bg-slate-50/70 transition-colors group">
                      <td className="px-6 py-4 font-semibold text-slate-900">{field.order}</td>
                      <td className="px-6 py-4 text-slate-400">{field.id}</td>
                      <td className="px-6 py-4 text-slate-900 font-medium">{field.label}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-0.5 rounded text-[8px] uppercase tracking-wider font-bold border ${field.isRequired ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-slate-50 border-slate-200 text-slate-600'}`}>
                          {field.isRequired ? 'Required' : 'Optional'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-0.5 rounded text-[8px] uppercase tracking-wider font-bold border ${field.isVisible ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-rose-50 border-rose-200 text-rose-700'}`}>
                          {field.isVisible ? 'Visible' : 'Hidden'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-1.5">
                          <button
                            onClick={() => moveUp(idx)}
                            disabled={idx === 0}
                            className="p-1.5 text-slate-500 hover:text-primary hover:bg-slate-100 disabled:opacity-30 rounded-lg cursor-pointer transition-colors"
                            title="Move Up"
                          >
                            <ArrowUp className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => moveDown(idx)}
                            disabled={idx === fields.length - 1}
                            className="p-1.5 text-slate-500 hover:text-primary hover:bg-slate-100 disabled:opacity-30 rounded-lg cursor-pointer transition-colors"
                            title="Move Down"
                          >
                            <ArrowDown className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => toggleVisibility(field)}
                            className={`p-1.5 rounded-lg cursor-pointer transition-colors hover:bg-slate-100 ${field.isVisible ? 'text-slate-500 hover:text-rose-600' : 'text-slate-500 hover:text-emerald-600'}`}
                            title={field.isVisible ? 'Hide Field' : 'Show Field'}
                          >
                            {field.isVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
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
    </div>
  );
};

export default FieldManagement;
