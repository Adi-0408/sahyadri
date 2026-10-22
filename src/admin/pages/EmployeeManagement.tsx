import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card as UICard } from '../../components/ui/Card';
import { createEmployeeAccount, fetchCollection, updateDocument, deleteDocument } from '../../services/firebase';
import { Briefcase, Plus, Save, User, Shield, AlertCircle, Eye, EyeOff, Trash2, Edit } from 'lucide-react';

const AVAILABLE_PERMISSIONS = [
  { id: '/admin/dashboard', tKey: 'admin.sidebar.dashboard' },
  { id: '/admin/hero-section', tKey: 'admin.sidebar.cmsManagement' },
  { id: '/admin/projects', tKey: 'admin.sidebar.projects' },
  { id: '/admin/property-sell', tKey: 'admin.sidebar.propertyForSell' },
  { id: '/admin/property-rent', tKey: 'admin.sidebar.propertyForRent' },
  { id: '/admin/users', tKey: 'admin.sidebar.registeredUsers' },
  { id: '/admin/representatives', tKey: 'admin.sidebar.representatives' },
  { id: '/admin/enquiries', tKey: 'admin.sidebar.leadsEnquiries' },
  { id: '/admin/settings', tKey: 'admin.sidebar.websiteSettings' },
];

export const EmployeeManagement: React.FC = () => {
  const { t } = useTranslation();
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Form State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    email: '',
    mobile: '',
    password: '',
    role: 'employee',
    permissions: [] as string[]
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadEmployees();
  }, []);

  const loadEmployees = async () => {
    setLoading(true);
    try {
      const emps = await fetchCollection('employee');
      setEmployees(emps);
    } catch (err) {
      console.error("Failed to load employees", err);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      id: '',
      name: '',
      email: '',
      mobile: '',
      password: '',
      role: 'employee',
      permissions: []
    });
    setError('');
    setShowPassword(false);
  };

  const handleOpenForm = (employee?: any) => {
    if (employee) {
      setFormData({
        id: employee.id || employee.uid,
        name: employee.name || '',
        email: employee.email || '',
        mobile: employee.mobile || employee.mobileNumber || '',
        password: '', // do not populate password for edits
        role: employee.role || 'employee',
        permissions: employee.permissions || []
      });
    } else {
      resetForm();
    }
    setIsFormOpen(true);
  };

  const handlePermissionToggle = (permId: string) => {
    setFormData(prev => {
      const perms = prev.permissions.includes(permId)
        ? prev.permissions.filter(p => p !== permId)
        : [...prev.permissions, permId];
      return { ...prev, permissions: perms };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email) {
      setError(t('admin.employeeForm.errors.nameEmailRequired'));
      return;
    }
    if (!formData.id && !formData.password) {
      setError(t('admin.employeeForm.errors.passwordRequired'));
      return;
    }

    setSaving(true);
    setError('');
    try {
      if (formData.id) {
        // Edit existing
        const updateData: any = {
          name: formData.name,
          mobile: formData.mobile,
          role: formData.role,
          permissions: formData.permissions
        };
        if (formData.password) {
          updateData.password = formData.password;
        }
        // In real mode, password update requires admin SDK. We ignore it or handle mock.
        await updateDocument('employee', formData.id, updateData);
      } else {
        // Create new
        await createEmployeeAccount(formData);
      }
      setIsFormOpen(false);
      resetForm();
      loadEmployees();
    } catch (err: any) {
      setError(err.message || t('admin.employeeForm.errors.errorSaving'));
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteEmployee = async (empId: string) => {
    if (!window.confirm(t('admin.employeeForm.errors.deleteConfirm'))) {
      return;
    }
    
    try {
      setLoading(true); // show loader during delete
      await deleteDocument('employee', empId);
      await loadEmployees();
    } catch (err: any) {
      setError(err.message || t('admin.employeeForm.errors.deleteFailed'));
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-primary rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 text-left animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-serif font-bold text-slate-900 mb-1.5 flex items-center gap-3">
            <Briefcase className="w-8 h-8 text-primary" />
            {t('admin.sidebar.employeeManagement')}
          </h1>
          <p className="text-sm text-slate-500 font-medium">{t('admin.employeeForm.subtitle')}</p>
        </div>
        <button
          onClick={() => handleOpenForm()}
          className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-xl font-bold text-sm tracking-wide shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all active:scale-95 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          {t('admin.employeeForm.addEmployee')}
        </button>
      </div>

      {isFormOpen && (
        <UICard className="p-6 bg-white border border-slate-200 shadow-xl rounded-2xl animate-fade-in relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1.5 bg-primary" />
          <h2 className="text-xl font-serif font-bold text-slate-900 mb-6 flex items-center gap-2">
            {formData.id ? t('admin.employeeForm.editEmployee') : t('admin.employeeForm.addNewEmployee')}
          </h2>

          {error && (
            <div className="flex items-start gap-3 bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-xl px-4 py-3 mb-6">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span className="font-medium">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t('admin.employeeForm.form.fullName')}</label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:border-primary focus:bg-white outline-none transition-all"
                    placeholder={t('admin.employeeForm.form.fullNamePlaceholder')}
                    required
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t('admin.employeeForm.form.email')}</label>
                <input
                  type="email"
                  value={formData.email}
                  disabled={!!formData.id}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:border-primary focus:bg-white outline-none transition-all disabled:opacity-50"
                  placeholder={t('admin.employeeForm.form.emailPlaceholder')}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t('admin.employeeForm.form.mobile')}</label>
                <input
                  type="tel"
                  maxLength={10}
                  inputMode="numeric"
                  value={formData.mobile}
                  onKeyDown={(e) => {
                    if (
                      !/^\d$/.test(e.key) &&
                      !['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(e.key) &&
                      !e.ctrlKey && !e.metaKey && !e.altKey && e.key !== 'Unidentified' && e.keyCode !== 229
                    ) {
                      e.preventDefault();
                    }
                  }}
                  onChange={e => setFormData({ ...formData, mobile: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:border-primary focus:bg-white outline-none transition-all"
                  placeholder="9822XXXXXX"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  {formData.id ? t('admin.employeeForm.form.passwordOptional') : t('admin.employeeForm.form.password')}
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:border-primary focus:bg-white outline-none transition-all pr-12"
                    placeholder={formData.id ? t('admin.employeeForm.form.passwordPlaceholderExisting') : t('admin.employeeForm.form.passwordPlaceholderNew')}
                    required={!formData.id}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-650 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Role & Permissions */}
            <div className="pt-4 border-t border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
                <Shield className="w-4 h-4 text-primary" /> {t('admin.employeeForm.form.assignPermissions')}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {AVAILABLE_PERMISSIONS.map(perm => {
                  const isChecked = formData.permissions.includes(perm.id);
                  return (
                    <label 
                      key={perm.id} 
                      className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                        isChecked ? 'bg-primary/5 border-primary text-primary' : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handlePermissionToggle(perm.id)}
                        className="mt-0.5 w-4 h-4 text-primary rounded border-slate-300 focus:ring-primary"
                      />
                      <span className="text-sm font-semibold select-none">{t(perm.tKey)}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="flex gap-3 pt-4 border-t border-slate-100 justify-end">
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="px-6 py-2.5 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl text-sm hover:bg-slate-50 transition-all cursor-pointer"
              >
                {t('admin.employeeForm.actions.cancel')}
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 px-6 py-2.5 bg-primary text-white font-bold rounded-xl text-sm shadow-md hover:bg-primary/95 transition-all disabled:opacity-70 cursor-pointer"
              >
                {saving ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                {saving ? t('admin.employeeForm.actions.saving') : t('admin.employeeForm.actions.save')}
              </button>
            </div>
          </form>
        </UICard>
      )}

      {/* Employees List */}
      <UICard className="p-0 bg-white border border-slate-100 shadow-sm rounded-2xl overflow-hidden w-full min-w-0">
        <div className="overflow-x-auto w-full custom-scrollbar">
          <table className="w-full text-left text-sm min-w-[650px] border-collapse">
            <thead className="bg-[#0b0f19] text-white sticky top-0 z-10 select-none">
              <tr>
                <th className="px-5 py-3.5 font-bold tracking-wider text-[11px] uppercase whitespace-nowrap">{t('admin.employeeForm.table.employeeName')}</th>
                <th className="px-5 py-3.5 font-bold tracking-wider text-[11px] uppercase whitespace-nowrap">{t('admin.employeeForm.table.emailContact')}</th>
                <th className="px-5 py-3.5 font-bold tracking-wider text-[11px] uppercase whitespace-nowrap">{t('admin.employeeForm.table.permissions')}</th>
                <th className="px-5 py-3.5 font-bold tracking-wider text-[11px] uppercase text-right whitespace-nowrap">{t('admin.employeeForm.table.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {employees.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-slate-500 font-medium">
                    {t('admin.employeeForm.table.noEmployees')}
                  </td>
                </tr>
              ) : (
                employees.map(emp => (
                  <tr key={emp.id || emp.uid} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                          {(emp.name || 'U').charAt(0).toUpperCase()}
                        </div>
                        <span className="font-bold text-slate-900">{emp.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-slate-900 font-medium">{emp.email}</span>
                        {emp.mobile && <span className="text-xs text-slate-500">{emp.mobile}</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1.5 max-w-xs">
                        {emp.permissions && emp.permissions.length > 0 ? (
                          emp.permissions.map((p: string, idx: number) => {
                            const permDef = AVAILABLE_PERMISSIONS.find(ap => ap.id === p);
                            const label = permDef ? t(permDef.tKey) : p;
                            return (
                              <span key={idx} className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md text-[10px] font-bold">
                                {label}
                              </span>
                            );
                          })
                        ) : (
                          <span className="text-xs text-slate-400 italic">{t('admin.employeeForm.table.noAccess')}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <button
                          onClick={() => handleOpenForm(emp)}
                          className="text-primary hover:text-primary/80 font-bold p-1.5 bg-primary/5 hover:bg-primary/10 rounded-lg transition-colors cursor-pointer"
                          title={t('admin.employeeForm.actions.editAccess')}
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteEmployee(emp.id || emp.uid)}
                          className="text-rose-500 hover:text-rose-600 font-bold p-1.5 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors cursor-pointer"
                          title={t('admin.employeeForm.actions.deleteEmployee')}
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
      </UICard>
    </div>
  );
};

export default EmployeeManagement;
