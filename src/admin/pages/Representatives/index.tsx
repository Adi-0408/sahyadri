import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  UserCheck, Plus, Search, Phone, MessageSquare, MapPin, Mail,
  Trash2, Edit, CheckCircle2, X, AlertCircle, Key, Eye, EyeOff
} from 'lucide-react';
import { Card as UICard } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Select } from '../../../components/ui/Select';
import {
  fetchCollection,
  createDocument,
  updateDocument,
  deleteDocument,
  subscribeToCollection
} from '../../../services/firebase';

interface Representative {
  id?: string;
  code?: string;
  name: string;
  designation?: string;
  mobile: string;
  password?: string;
  alternateMobile?: string;
  email?: string;
  district?: string;
  taluka?: string;
  cityVillage?: string;
  address?: string;
  status: 'active' | 'inactive';
  notes?: string;
  role?: 'representative';
  createdAt?: string;
}

export const RepresentativesManager: React.FC = () => {
  const { i18n } = useTranslation();
  const isMr = Boolean(i18n.language?.startsWith('mr'));

  const [representatives, setRepresentatives] = useState<Representative[]>([]);
  const [districts, setDistricts] = useState<any[]>([]);
  const [talukas, setTalukas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [talukaFilter, setTalukaFilter] = useState('All');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState<Representative>({
    name: '',
    code: '',
    designation: isMr ? 'विक्री प्रतिनिधी (Sales Representative)' : 'Sales Representative',
    mobile: '',
    password: '',
    alternateMobile: '',
    email: '',
    district: 'Sangli',
    taluka: 'Miraj',
    cityVillage: '',
    address: '',
    status: 'active',
    role: 'representative',
    notes: ''
  });
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Delete State
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    // Load districts and talukas
    Promise.all([
      fetchCollection('districts'),
      fetchCollection('talukas')
    ]).then(([dList, tList]) => {
      setDistricts(dList || []);
      setTalukas(tList || []);
    }).catch(console.error);

    // Subscribe to representatives collection
    const unsub = subscribeToCollection('representatives', (list) => {
      setRepresentatives(list || []);
      setLoading(false);
    });

    return () => {
      if (typeof unsub === 'function') unsub();
    };
  }, []);

  const openAddModal = () => {
    setModalMode('add');
    setEditingId(null);
    setShowPassword(false);
    const nextCode = `REP-${String(representatives.length + 1).padStart(2, '0')}`;
    setFormData({
      name: '',
      code: nextCode,
      designation: isMr ? 'विक्री प्रतिनिधी (Sales Representative)' : 'Sales Representative',
      mobile: '',
      password: '',
      alternateMobile: '',
      email: '',
      district: districts[0]?.label || 'Sangli',
      taluka: talukas[0]?.label || 'Miraj',
      cityVillage: '',
      address: '',
      status: 'active',
      role: 'representative',
      notes: ''
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const openEditModal = (rep: Representative) => {
    setModalMode('edit');
    setEditingId(rep.id || null);
    setShowPassword(false);
    setFormData({
      name: rep.name || '',
      code: rep.code || '',
      designation: rep.designation || (isMr ? 'विक्री प्रतिनिधी (Sales Representative)' : 'Sales Representative'),
      mobile: rep.mobile || '',
      password: rep.password || '',
      alternateMobile: rep.alternateMobile || '',
      email: rep.email || '',
      district: rep.district || 'Sangli',
      taluka: rep.taluka || '',
      cityVillage: rep.cityVillage || '',
      address: rep.address || '',
      status: rep.status || 'active',
      role: 'representative',
      notes: rep.notes || ''
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.mobile.trim()) {
      setFormError(isMr ? 'नाव आणि मोबाईल नंबर आवश्यक आहेत.' : 'Name and mobile number are required.');
      return;
    }

    if (!/^\d{10}$/.test(formData.mobile.trim())) {
      setFormError(isMr ? 'कृपया वैध १० अंकी मोबाईल नंबर टाका.' : 'Please enter a valid 10-digit mobile number.');
      return;
    }

    if (modalMode === 'add' && (!formData.password || formData.password.trim().length < 4)) {
      setFormError(isMr ? 'कृपया प्रतिनिधीसाठी किमान ४ अक्षरी लॉगिन पासवर्ड टाका.' : 'Please enter at least a 4-character login password for the representative.');
      return;
    }

    setSubmitting(true);
    setFormError('');

    try {
      const payload: Representative = {
        ...formData,
        name: formData.name.trim(),
        mobile: formData.mobile.trim(),
        password: formData.password ? formData.password.trim() : (modalMode === 'add' ? '123456' : ''),
        alternateMobile: formData.alternateMobile?.trim() || '',
        email: formData.email?.trim() || `${formData.mobile.trim()}@sahyadrilanddev.com`,
        role: 'representative',
        createdAt: formData.createdAt || new Date().toISOString()
      };

      if (modalMode === 'add') {
        await createDocument('representatives', payload);
      } else if (editingId) {
        await updateDocument('representatives', editingId, payload);
      }
      setIsModalOpen(false);
    } catch (err: any) {
      console.error('Error saving representative:', err);
      setFormError(err?.message || (isMr ? 'प्रतिनिधी जतन करताना त्रुटी आली.' : 'Failed to save representative.'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (rep: Representative) => {
    if (!rep.id) return;
    const newStatus = rep.status === 'active' ? 'inactive' : 'active';
    try {
      await updateDocument('representatives', rep.id, { status: newStatus });
    } catch (err) {
      console.error('Failed to toggle status:', err);
    }
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteDocument('representatives', deleteId);
    } catch (err) {
      console.error('Failed to delete representative:', err);
    } finally {
      setDeleteId(null);
    }
  };

  // Filtered List
  const filteredList = representatives.filter((r) => {
    const s = search.toLowerCase();
    const matchesSearch =
      !s ||
      (r.name && r.name.toLowerCase().includes(s)) ||
      (r.mobile && r.mobile.includes(s)) ||
      (r.code && r.code.toLowerCase().includes(s)) ||
      (r.taluka && r.taluka.toLowerCase().includes(s)) ||
      (r.cityVillage && r.cityVillage.toLowerCase().includes(s)) ||
      (r.designation && r.designation.toLowerCase().includes(s));

    const matchesStatus =
      statusFilter === 'all' || r.status === statusFilter;

    const matchesTaluka =
      talukaFilter === 'All' || r.taluka === talukaFilter;

    return matchesSearch && matchesStatus && matchesTaluka;
  });

  const activeCount = representatives.filter(r => r.status === 'active').length;
  const uniqueTalukas = Array.from(new Set(representatives.map(r => r.taluka).filter(Boolean)));

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <UserCheck className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              {isMr ? 'प्रतिनिधी व्यवस्थापन (Representatives)' : 'Representatives Management'}
            </h1>
          </div>
          <p className="text-xs text-slate-500 font-medium">
            {isMr ? 'सह्याद्री लँड डेव्हलपरचे अधिकृत प्रतिनिधी, त्यांचे कार्यक्षेत्र व संपर्क व्यवस्थापित करा.' : 'Manage authorized representatives, service areas and contact details.'}
          </p>
        </div>

        <Button
          onClick={openAddModal}
          variant="primary"
          className="flex items-center gap-2 self-start sm:self-auto font-bold px-5 py-2.5 shadow-sm rounded-xl"
        >
          <Plus className="w-4 h-4" />
          {isMr ? 'नवीन प्रतिनिधी जोडा (Add New)' : 'Add New Representative'}
        </Button>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <UICard className="p-4 bg-white border border-slate-200/80 rounded-2xl shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <UserCheck className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider text-slate-500 font-semibold">{isMr ? 'एकूण प्रतिनिधी' : 'Total Representatives'}</p>
            <p className="text-2xl font-extrabold text-slate-900">{representatives.length}</p>
          </div>
        </UICard>

        <UICard className="p-4 bg-white border border-slate-200/80 rounded-2xl shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider text-slate-500 font-semibold">{isMr ? 'सक्रिय प्रतिनिधी (Active)' : 'Active Representatives'}</p>
            <p className="text-2xl font-extrabold text-emerald-600">{activeCount}</p>
          </div>
        </UICard>

        <UICard className="p-4 bg-white border border-slate-200/80 rounded-2xl shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
            <MapPin className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider text-slate-500 font-semibold">{isMr ? 'कार्यक्षेत्र तालुके' : 'Operational Talukas'}</p>
            <p className="text-2xl font-extrabold text-slate-900">{uniqueTalukas.length}</p>
          </div>
        </UICard>
      </div>

      {/* Filters & Search */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={isMr ? "नाव, मोबाईल, तालुका किंवा कोड शोधा..." : "Search name, mobile, taluka or code..."}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-primary focus:bg-white transition-all"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Status Filter */}
          <div className="flex bg-slate-100 p-1 rounded-xl text-xs">
            <button
              type="button"
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                statusFilter === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {isMr ? 'सर्व' : 'All'} ({representatives.length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('active')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                statusFilter === 'active' ? 'bg-white text-emerald-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {isMr ? 'सक्रिय' : 'Active'} ({activeCount})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('inactive')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                statusFilter === 'inactive' ? 'bg-white text-rose-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {isMr ? 'निष्क्रिय' : 'Inactive'} ({representatives.length - activeCount})
            </button>
          </div>

          {/* Taluka Dropdown */}
          <div className="w-40">
            <Select
              value={talukaFilter}
              onChange={(e) => setTalukaFilter(e.target.value)}
              options={[
                { value: 'All', label: isMr ? 'सर्व तालुके' : 'All Talukas' },
                ...talukas.map((t) => ({ value: t.label, label: t.label }))
              ]}
              className="py-1.5 text-xs font-semibold"
            />
          </div>
        </div>
      </div>

      {/* Representatives Cards Grid */}
      {loading ? (
        <div className="p-12 text-center flex flex-col items-center justify-center">
          <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
          <p className="text-xs text-slate-500 mt-2">{isMr ? 'प्रतिनिधी लोड होत आहेत...' : 'Loading representatives...'}</p>
        </div>
      ) : filteredList.length === 0 ? (
        <div className="p-12 bg-white rounded-2xl border border-slate-200 text-center flex flex-col items-center">
          <UserCheck className="w-12 h-12 text-slate-300 mb-3" />
          <p className="text-sm font-bold text-slate-700">{isMr ? 'कोणतेही प्रतिनिधी आढळले नाहीत' : 'No representatives found'}</p>
          <p className="text-xs text-slate-400 mt-1">{isMr ? 'नवीन प्रतिनिधी जोडण्यासाठी वरील बटणावर क्लिक करा.' : 'Click the button above to add a new representative.'}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredList.map((rep) => {
            const isActive = rep.status === 'active';

            return (
              <div
                key={rep.id || rep.code}
                className={`bg-white rounded-2xl border transition-all duration-200 hover:shadow-md p-5 flex flex-col justify-between ${
                  isActive ? 'border-slate-200/90' : 'border-slate-200/50 opacity-75 bg-slate-50/50'
                }`}
              >
                <div>
                  {/* Top Bar: Code + Status Badge */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                      {rep.code || 'REP'}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleToggleStatus(rep)}
                      className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full cursor-pointer transition-colors ${
                        isActive
                          ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                          : 'bg-rose-100 text-rose-800 hover:bg-rose-200'
                      }`}
                      title={isMr ? "स्थिती बदलण्यासाठी क्लिक करा" : "Click to toggle status"}
                    >
                      {isActive ? (isMr ? '● सक्रिय (Active)' : '● Active') : (isMr ? '○ निष्क्रिय (Inactive)' : '○ Inactive')}
                    </button>
                  </div>

                  {/* Representative Info */}
                  <div className="flex items-start gap-3 mb-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-emerald-700 text-white font-extrabold text-lg flex items-center justify-center shrink-0 shadow-sm">
                      {rep.name ? rep.name.charAt(0).toUpperCase() : 'P'}
                    </div>
                    <div>
                      <h3 className="font-bold text-base text-slate-900 leading-snug">
                        {rep.name}
                      </h3>
                      <p className="text-xs text-emerald-700 font-semibold mt-0.5">
                        {rep.designation || (isMr ? 'प्रतिनिधी' : 'Representative')}
                      </p>
                    </div>
                  </div>

                  {/* Details List */}
                  <div className="space-y-2 text-xs text-slate-600 bg-slate-50/70 p-3 rounded-xl border border-slate-100 mb-4">
                    {/* Primary Login Credentials: Mobile + Password together */}
                    <div className="flex items-center justify-between gap-2 bg-emerald-50/90 border border-emerald-200/90 text-emerald-950 p-2.5 rounded-xl">
                      <div className="flex items-center gap-1.5 font-bold">
                        <Phone className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                        <span className="font-mono text-xs text-slate-900">{rep.mobile}</span>
                        {rep.alternateMobile && (
                          <span className="text-[10px] text-slate-400 font-normal">/ {rep.alternateMobile}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 bg-white px-2 py-0.5 rounded-md border border-emerald-200 text-[11px] font-mono text-emerald-800 shadow-xs">
                        <Key className="w-3 h-3 text-emerald-600 shrink-0" />
                        <span>{isMr ? 'पासवर्ड:' : 'Password:'} <strong>{rep.password || 'rep@123'}</strong></span>
                      </div>
                    </div>

                    {rep.email && (
                      <div className="flex items-center gap-2 truncate">
                        <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{rep.email}</span>
                      </div>
                    )}

                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>
                        {rep.taluka ? `${rep.taluka}, ` : ''}
                        {rep.cityVillage || rep.district || (isMr ? 'सांगली' : 'Sangli')}
                      </span>
                    </div>

                    {rep.notes && (
                      <div className="pt-1 border-t border-slate-200/60 text-[11px] text-slate-500 italic">
                        "{rep.notes}"
                      </div>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  {/* Quick Connect Buttons */}
                  <div className="flex items-center gap-1.5">
                    <a
                      href={`tel:${rep.mobile}`}
                      className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg transition-colors"
                      title={isMr ? "कॉल करा" : "Call"}
                    >
                      <Phone className="w-3.5 h-3.5" />
                      {isMr ? 'कॉल' : 'Call'}
                    </a>
                    <a
                      href={`https://wa.me/91${rep.mobile}?text=${encodeURIComponent(isMr ? `नमस्कार ${rep.name}, सह्याद्री लँड डेव्हलपर कडून.` : `Hello ${rep.name}, contacting from Sahyadri Land Developer.`)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-bold text-green-700 bg-green-50 hover:bg-green-100 px-3 py-1.5 rounded-lg transition-colors"
                      title={isMr ? "व्हॉट्सॲप मेसेज पाठवा" : "Send WhatsApp message"}
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      {isMr ? 'व्हॉट्सॲप' : 'WhatsApp'}
                    </a>
                  </div>

                  {/* Edit & Delete */}
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => openEditModal(rep)}
                      className="p-1.5 text-slate-400 hover:text-primary hover:bg-slate-100 rounded-lg transition-colors"
                      title={isMr ? "माहिती संपादित करा" : "Edit details"}
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteId(rep.id || null)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                      title={isMr ? "हटवा" : "Delete"}
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

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-8">
            <div className="px-6 py-4 bg-gradient-to-r from-slate-900 to-slate-800 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base">
                    {modalMode === 'add'
                      ? (isMr ? 'नवीन प्रतिनिधी जोडा' : 'Add New Representative')
                      : (isMr ? 'प्रतिनिधी माहिती संपादित करा' : 'Edit Representative Details')}
                  </h3>
                  <p className="text-[11px] text-slate-300">
                    {modalMode === 'add'
                      ? (isMr ? 'सह्याद्री लँड डेव्हलपर अधिकृत प्रतिनिधी' : 'Sahyadri Land Developer Authorized Representative')
                      : (isMr ? `कोड: ${formData.code}` : `Code: ${formData.code}`)}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {isMr ? 'पूर्ण नाव (Full Name) *' : 'Full Name *'}
                  </label>
                  <Input
                    required
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder={isMr ? "उदा. सचिन पाटील" : "e.g. Sachin Patil"}
                    className="text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {isMr ? 'प्रतिनिधी कोड (Code)' : 'Representative Code'}
                  </label>
                  <Input
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    placeholder="REP-01"
                    className="text-xs font-mono font-bold"
                  />
                </div>
              </div>

              {/* Row 2: Login Credentials (Mobile + Password side by side) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {isMr ? 'मोबाईल नंबर (१० अंकी) *' : 'Mobile Number (10 digits) *'}
                  </label>
                  <Input
                    required
                    type="tel"
                    maxLength={10}
                    value={formData.mobile}
                    onChange={(e) => setFormData({ ...formData, mobile: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                    placeholder={isMr ? "९८२२०xxxxx" : "98220xxxxx"}
                    className="text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                    <span>{isMr ? 'लॉगिन पासवर्ड *' : 'Login Password *'}</span>
                    <span className="text-[10px] text-emerald-700 font-semibold">{isMr ? 'लॉगिनसाठी' : 'For Login'}</span>
                  </label>
                  <div className="relative">
                    <Input
                      required={modalMode === 'add'}
                      type={showPassword ? 'text' : 'password'}
                      value={formData.password || ''}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      placeholder={isMr ? "किमान ४ अक्षरे (उदा. rep@123)" : "Min 4 characters (e.g. rep@123)"}
                      className="text-xs pr-10 font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Row 3: Alternate Contact & Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {isMr ? 'पर्यायी नंबर / व्हॉट्सॲप' : 'Alternate Mobile / WhatsApp'}
                  </label>
                  <Input
                    type="tel"
                    maxLength={10}
                    value={formData.alternateMobile}
                    onChange={(e) => setFormData({ ...formData, alternateMobile: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                    placeholder={isMr ? "पर्यायी मोबाईल" : "Alternate mobile"}
                    className="text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {isMr ? 'ईमेल पत्ता (Email)' : 'Email Address'}
                  </label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="rep@sahyadrilanddev.com"
                    className="text-xs"
                  />
                </div>
              </div>

              {/* Row 4: Designation & Taluka */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {isMr ? 'पद / हुद्दा (Designation)' : 'Designation'}
                  </label>
                  <Input
                    type="text"
                    value={formData.designation}
                    onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                    placeholder={isMr ? "विक्री प्रतिनिधी / सल्लागार" : "Sales Representative / Consultant"}
                    className="text-xs"
                  />
                </div>

                <Select
                  label={isMr ? 'तालुका (Taluka)' : 'Taluka'}
                  value={formData.taluka}
                  onChange={(e) => setFormData({ ...formData, taluka: e.target.value })}
                  options={[
                    { value: '', label: isMr ? 'तालुका निवडा' : 'Select Taluka' },
                    ...talukas.map((t) => ({ value: t.label, label: t.label }))
                  ]}
                  className="py-2 text-xs font-semibold"
                />
              </div>

              {/* Row 5: Village/City & Address */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {isMr ? 'गाव / शहर (Village / City)' : 'Village / City'}
                  </label>
                  <Input
                    type="text"
                    value={formData.cityVillage}
                    onChange={(e) => setFormData({ ...formData, cityVillage: e.target.value })}
                    placeholder={isMr ? "उदा. मिरज / सांगली" : "e.g. Miraj / Sangli"}
                    className="text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {isMr ? 'पत्ता / ऑफिस लोकेशन (Address)' : 'Address / Office Location'}
                  </label>
                  <Input
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder={isMr ? "पत्ता किंवा स्थानिक संपर्क कार्यालय" : "Address or local office"}
                    className="text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                <Select
                  label={isMr ? 'स्थिती (Status)' : 'Status'}
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                  options={[
                    { value: 'active', label: isMr ? '● सक्रिय (Active)' : '● Active' },
                    { value: 'inactive', label: isMr ? '○ निष्क्रिय (Inactive)' : '○ Inactive' }
                  ]}
                  className="py-2 text-xs font-bold"
                />

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {isMr ? 'टीप / विशेष माहिती (Notes)' : 'Notes / Special Info'}
                  </label>
                  <Input
                    type="text"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder={isMr ? "उदा. प्लॉट / शेतजमीन विशेषज्ञ" : "e.g. Plot / Farmland Specialist"}
                    className="text-xs"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                <Button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  variant="outline"
                  className="px-4 py-2 text-xs rounded-xl"
                >
                  {isMr ? 'रद्द करा' : 'Cancel'}
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={submitting}
                  className="px-6 py-2 text-xs font-bold rounded-xl shadow-xs"
                >
                  {submitting
                    ? (isMr ? 'जतन होत आहे...' : 'Saving...')
                    : modalMode === 'add'
                      ? (isMr ? 'प्रतिनिधी जोडा' : 'Add Representative')
                      : (isMr ? 'बदल सेव्ह करा' : 'Save Changes')}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteId && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full text-center shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-3">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-base text-slate-900 mb-1">
              {isMr ? 'प्रतिनिधी हटवायचा आहे का?' : 'Delete Representative?'}
            </h3>
            <p className="text-xs text-slate-500 mb-5">
              {isMr ? 'हा प्रतिनिधी कायमस्वरूपी हटवला जाईल. ही क्रिया परत करता येणार नाही.' : 'This representative will be permanently deleted. This action cannot be undone.'}
            </p>
            <div className="flex gap-2 justify-center">
              <Button
                type="button"
                onClick={() => setDeleteId(null)}
                variant="outline"
                className="px-4 py-2 text-xs rounded-xl"
              >
                {isMr ? 'रद्द करा' : 'Cancel'}
              </Button>
              <Button
                type="button"
                onClick={confirmDelete}
                className="px-5 py-2 text-xs font-bold rounded-xl bg-rose-600 hover:bg-rose-700 text-white"
              >
                {isMr ? 'होय, हटवा' : 'Yes, Delete'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default RepresentativesManager;
