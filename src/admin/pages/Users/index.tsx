import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { fetchCollection, updateDocument, deleteUserAccount, isMockMode, createDocument, generateUserCode, toggleBlockUser, isUserBlacklisted } from '../../../services/firebase';
import { Card as UICard } from '../../../components/ui/Card';
import { ShieldCheck, Ban, Trash2, Search, UserPlus, X, User, Smartphone, Lock, Eye, EyeOff, Send, ChevronDown, Check } from 'lucide-react';
import { Input } from '../../../components/ui/Input';
import { Button } from '../../../components/ui/Button';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, deleteUser } from 'firebase/auth';

const ROLE_CONFIG: Record<string, { label: string; bg: string; border: string; text: string; dot: string }> = {
  user: { label: 'User', bg: 'bg-slate-50', border: 'border-slate-200', text: 'text-slate-600', dot: 'bg-slate-400' },
  buyer: { label: 'Buyer', bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', dot: 'bg-blue-500' },
  seller: { label: 'Seller', bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700', dot: 'bg-orange-500' },
  builder: { label: 'Builder', bg: 'bg-indigo-50', border: 'border-indigo-200', text: 'text-indigo-700', dot: 'bg-indigo-500' },
  agent: { label: 'Agent', bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', dot: 'bg-amber-500' },
  supplier: { label: 'Supplier', bg: 'bg-teal-50', border: 'border-teal-200', text: 'text-teal-700', dot: 'bg-teal-500' },
  representative: { label: 'Representative', bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  admin: { label: 'Admin', bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-700', dot: 'bg-purple-500' },
};

const ALL_ROLES = ['user', 'buyer', 'seller', 'builder', 'agent', 'supplier', 'representative', 'admin'];

interface RoleDropdownProps {
  currentRole: string;
  onRoleChange: (newRole: string) => void;
}

const RoleDropdown: React.FC<RoleDropdownProps> = ({ currentRole, onRoleChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number; openUpward: boolean } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const normalized = (currentRole || 'user').toLowerCase();
  const activeCfg = ROLE_CONFIG[normalized] || ROLE_CONFIG.user;

  const handleToggle = () => {
    if (!isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const upward = spaceBelow < 280;
      setCoords({
        top: upward ? rect.top : rect.bottom + 6,
        left: Math.max(8, Math.min(rect.left, window.innerWidth - 190)),
        openUpward: upward,
      });
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;

    const handleOutsideClick = (e: MouseEvent | TouchEvent) => {
      if (
        buttonRef.current && !buttonRef.current.contains(e.target as Node) &&
        dropdownRef.current && !dropdownRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    const handleScroll = () => {
      setIsOpen(false);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('touchstart', handleOutsideClick);
    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', handleScroll);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleScroll);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div className="relative inline-block text-left">
      <button
        ref={buttonRef}
        type="button"
        onClick={handleToggle}
        className={`px-2.5 py-1 rounded-full text-[10px] uppercase font-bold tracking-wider border cursor-pointer transition-all duration-150 inline-flex items-center gap-1.5 select-none focus:outline-none shadow-2xs hover:brightness-95 active:scale-95 ${activeCfg.bg} ${activeCfg.border} ${activeCfg.text}`}
      >
        <span className={`w-1.5 h-1.5 rounded-full ${activeCfg.dot}`} />
        <span>{activeCfg.label}</span>
        <ChevronDown className={`w-3 h-3 opacity-70 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && coords && createPortal(
        <div
          ref={dropdownRef}
          style={{
            position: 'fixed',
            top: coords.openUpward ? undefined : `${coords.top}px`,
            bottom: coords.openUpward ? `${window.innerHeight - coords.top + 6}px` : undefined,
            left: `${coords.left}px`,
            zIndex: 9999,
          }}
          className="w-48 bg-white border border-slate-200/90 rounded-2xl shadow-2xl shadow-slate-900/15 p-1.5 animate-in fade-in zoom-in-95 duration-100"
        >
          <div className="space-y-0.5">
            {ALL_ROLES.map((roleKey) => {
              const cfg = ROLE_CONFIG[roleKey];
              const isSelected = normalized === roleKey;
              return (
                <button
                  key={roleKey}
                  type="button"
                  onClick={() => {
                    if (!isSelected) onRoleChange(roleKey);
                    setIsOpen(false);
                  }}
                  className={`w-full text-left px-3 py-1.5 text-xs font-semibold rounded-xl flex items-center justify-between transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-slate-100 text-slate-900 font-bold'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                    <span>{cfg.label}</span>
                  </div>
                  {isSelected && <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export const UsersManager: React.FC = () => {
  const { t } = useTranslation();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  // Register Client State
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [regName, setRegName] = useState('');
  const [regMobile, setRegMobile] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [regError, setRegError] = useState('');
  const [regLoading, setRegLoading] = useState(false);
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [showRegConfirmPassword, setShowRegConfirmPassword] = useState(false);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const list = await fetchCollection('users');
      // If list is empty in mock/real, fallback to some mock users for visual excellence
      if (list.length === 0) {
        setUsers([
          { id: 'user-1', name: 'Elena Rossi', email: 'elena@example.com', role: 'user', isBlocked: false },
          { id: 'user-2', name: 'Julian Vane', email: 'julian@example.com', role: 'user', isBlocked: true },
          { id: 'user-3', name: 'Marcus Thorne', email: 'marcus@example.com', role: 'user', isBlocked: false }
        ]);
      } else {
        setUsers(list);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    if (showRegisterModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [showRegisterModal]);

  const handleToggleBlock = async (user: any) => {
    try {
      const updatedBlocked = await toggleBlockUser(user);
      
      // Update local state
      setUsers(users.map((u) => u.id === user.id ? { ...u, isBlocked: updatedBlocked, isBlacklisted: updatedBlocked } : u));
    } catch (e) {
      console.error("Failed to block/blacklist user:", e);
    }
  };

  const handleRoleChange = async (targetUser: any, newRole: string) => {
    try {
      await updateDocument('users', targetUser.id, { role: newRole });
      if (isMockMode && typeof window !== 'undefined') {
        const raw = localStorage.getItem('luminous_mock_users');
        if (raw) {
          const list = JSON.parse(raw);
          const idx = list.findIndex((x: any) => x.uid === targetUser.id || x.id === targetUser.id || x.email === targetUser.email);
          if (idx !== -1) {
            list[idx].role = newRole;
            localStorage.setItem('luminous_mock_users', JSON.stringify(list));
          }
        }
      }
      setUsers(users.map((u) => (u.id === targetUser.id ? { ...u, role: newRole } : u)));
    } catch (e) {
      console.error("Failed to change user role:", e);
    }
  };

  const handleDelete = async (targetUser: any) => {
    if (!window.confirm(t('admin.users.confirmDelete'))) return;
    try {
      await deleteUserAccount(targetUser);
      setUsers(users.filter((u) => u.id !== targetUser.id));
    } catch (e) {
      console.error("Failed to delete user:", e);
    }
  };

  const navigate = useNavigate();

  const handleSendProperty = (user: any) => {
    navigate('/admin/send-property', { state: { user } });
  };

  const handleRegisterClient = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError('');
    
    if (!regName || !regMobile || !regPassword || !regConfirmPassword) {
      setRegError('All fields are required.');
      return;
    }

    if (regMobile.length !== 10 || !/^\d+$/.test(regMobile)) {
      setRegError('Please enter a valid 10-digit mobile number.');
      return;
    }

    if (regPassword !== regConfirmPassword) {
      setRegError('Passwords do not match.');
      return;
    }

    if (regPassword.length < 6) {
      setRegError('Password must be at least 6 characters long.');
      return;
    }

    setRegLoading(true);
    const cleanMobile = regMobile.replace(/[^0-9]/g, '').slice(-10);
    const pseudoEmail = `${cleanMobile}@propertyvishva.com`;
    const AUTH_MASTER_PASSWORD = 'PropertyVishvaMasterPassword2026!';

    try {
      // 1. Check if blacklisted
      const isBl = await isUserBlacklisted(cleanMobile);
      if (isBl) {
        setRegError('हा मोबाईल नंबर ॲडमिनद्वारे ब्लॉक / ब्लॅकलिस्ट केला आहे. (This mobile number has been blacklisted by admin.)');
        setRegLoading(false);
        return;
      }

      if (isMockMode) {
        const userCode = await generateUserCode();
        const newMockDoc = {
          userCode,
          name: regName,
          email: pseudoEmail,
          mobile: cleanMobile,
          password: regPassword,
          role: 'user',
          isBlocked: false,
          isBlacklisted: false,
          createdAt: new Date().toISOString()
        };
        const res = await createDocument('users', newMockDoc);
        setUsers([res, ...users]);
      } else {
        const config = {
          apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
          authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
          projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
        };
        const secondaryApp = initializeApp(config, 'SecondaryApp');
        const secondaryAuth = getAuth(secondaryApp);
        let cred: any = null;
        try {
          cred = await createUserWithEmailAndPassword(secondaryAuth, pseudoEmail, AUTH_MASTER_PASSWORD);
        } catch (createErr: any) {
          if (createErr.code === 'auth/email-already-in-use') {
            // Check if active user already exists in current list
            const existingActive = users.find((u: any) => {
              const uMob = String(u.mobile || u.phone || '').replace(/\D/g, '').slice(-10);
              return uMob === cleanMobile && !u.isDeleted && u.status !== 'deleted';
            });
            if (existingActive) {
              throw new Error('हा मोबाईल नंबर आधीच नोंदणीकृत आहे. (This mobile number is already registered.)');
            }
            // Stale account from previously deleted user: delete stale auth user and recreate
            try {
              const oldCred = await signInWithEmailAndPassword(secondaryAuth, pseudoEmail, AUTH_MASTER_PASSWORD);
              if (oldCred?.user) {
                await deleteUser(oldCred.user);
                cred = await createUserWithEmailAndPassword(secondaryAuth, pseudoEmail, AUTH_MASTER_PASSWORD);
              }
            } catch {
              try {
                cred = await signInWithEmailAndPassword(secondaryAuth, pseudoEmail, AUTH_MASTER_PASSWORD);
              } catch {
                throw new Error('Failed to register client.');
              }
            }
          } else {
            throw createErr;
          }
        }
        
        const userCode = await generateUserCode();
        const uid = cred.user.uid;
        const newDoc = {
          id: uid,
          uid: uid,
          firebaseId: uid,
          userCode,
          name: regName,
          email: pseudoEmail,
          mobile: cleanMobile,
          password: regPassword, // Stored so Mobile App can validate it
          role: 'user',
          isBlocked: false,
          isBlacklisted: false,
          createdAt: new Date().toISOString()
        };
        await createDocument('users', newDoc);
        setUsers([newDoc, ...users]);
        
        await secondaryAuth.signOut().catch(() => {});
        await deleteApp(secondaryApp).catch(() => {});
      }

      setShowRegisterModal(false);
      setRegName('');
      setRegMobile('');
      setRegPassword('');
      setRegConfirmPassword('');
    } catch (err: any) {
      setRegError(err?.message || 'Failed to register client.');
    } finally {
      setRegLoading(false);
    }
  };

  const getDisplayMobile = (u: any) => {
    if (u.mobile) return String(u.mobile);
    if (u.mobileNumber) return String(u.mobileNumber);
    if (u.phone) return String(u.phone);
    if (u.phoneNumber) return String(u.phoneNumber);
    if (u.id && String(u.id).length === 10 && /^\d{10}$/.test(String(u.id))) return String(u.id);

    if (!u.email) return '-';
    if (u.email.includes('@')) {
      const num = u.email.split('@')[0];
      if (num.length === 10 && /^\d+$/.test(num)) return num;
    }
    return u.email;
  };

  const filteredUsers = users.filter((u) => {
    if (!searchTerm) return true;
    const lowerTerm = searchTerm.toLowerCase();
    const displayMobile = getDisplayMobile(u);
    const userCode = (u.userCode || u.id || '').toLowerCase();
    const userInterest = String(u.interest || u.interests || u.propertyInterest || '').toLowerCase();
    return (
      (u.name && u.name.toLowerCase().includes(lowerTerm)) ||
      userCode.includes(lowerTerm) ||
      (displayMobile && displayMobile.toLowerCase().includes(lowerTerm)) ||
      (userInterest && userInterest.includes(lowerTerm))
    );
  });

  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const paginatedUsers = filteredUsers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="space-y-8 text-left">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-3xl font-serif font-bold text-slate-900 mb-1">{t('admin.users.title')}</h1>
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
          <div className="w-full sm:w-72">
            <Input 
              icon={Search}
              placeholder="Search by ID, Name or Mobile..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button variant="secondary" className="whitespace-nowrap flex items-center justify-center w-full sm:w-auto" onClick={() => handleSendProperty({ name: 'Selected Client' })}>
            <Send className="w-4 h-4 mr-2" />
            Send Property to Client
          </Button>
          <Button variant="primary" className="whitespace-nowrap flex items-center justify-center w-full sm:w-auto" onClick={() => setShowRegisterModal(true)}>
            <UserPlus className="w-4 h-4 mr-2" />
            Register Client
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
        </div>
      ) : (
        <UICard className="bg-white border border-slate-100 shadow-sm rounded-2xl overflow-hidden w-full min-w-0" >
          <div className="overflow-x-auto w-full custom-scrollbar">
            <table className="w-full text-left min-w-[720px] border-collapse">
              <thead className="bg-[#0b0f19] text-[10px] uppercase font-bold text-white tracking-wider sticky top-0 z-10 select-none">
                <tr>
                  <th className="px-5 py-3.5 whitespace-nowrap">{t('admin.users.table.id')}</th>
                  <th className="px-5 py-3.5 whitespace-nowrap">{t('admin.users.table.name')}</th>
                  <th className="px-5 py-3.5 whitespace-nowrap">Mobile No</th>
                  <th className="px-5 py-3.5 whitespace-nowrap">Interest</th>
                  <th className="px-5 py-3.5 whitespace-nowrap">{t('admin.users.table.role')}</th>
                  <th className="px-5 py-3.5 whitespace-nowrap">{t('admin.users.table.status')}</th>
                  <th className="px-5 py-3.5 text-right whitespace-nowrap">{t('admin.users.table.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-650 bg-white">
                {paginatedUsers.length > 0 ? paginatedUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/70 transition-colors group">
                    <td className="px-6 py-4 font-mono text-slate-400">{u.userCode || u.id}</td>
                    <td className="px-6 py-4 font-semibold text-slate-900">{u.name}</td>
                    <td className="px-6 py-4 text-slate-600 font-medium">{getDisplayMobile(u)}</td>
                    <td className="px-6 py-4 text-slate-600 text-xs truncate max-w-[150px]" title={u.interest || u.interests || u.propertyInterest || '-'}>
                      {u.interest || u.interests || u.propertyInterest || '-'}
                    </td>
                    <td className="px-6 py-4">
                      <RoleDropdown
                        currentRole={u.role || 'user'}
                        onRoleChange={(newRole) => handleRoleChange(u, newRole)}
                      />
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-0.5 rounded-full text-[9px] uppercase font-bold border ${
                        u.isBlocked || u.isBlacklisted
                          ? 'bg-rose-50 border-rose-200 text-rose-700' 
                          : 'bg-emerald-50 border-emerald-200 text-emerald-700'
                      }`}>
                        {u.isBlocked || u.isBlacklisted ? t('admin.users.status.blocked') : t('admin.users.status.active')}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end items-center gap-1.5">
                        <button
                          onClick={() => handleToggleBlock(u)}
                          className={`p-1.5 rounded-lg border cursor-pointer transition-colors ${
                            u.isBlocked || u.isBlacklisted
                              ? 'bg-emerald-50 border-emerald-200 text-emerald-600 hover:bg-emerald-100' 
                              : 'bg-amber-50 border-amber-200 text-amber-600 hover:bg-amber-100'
                          }`}
                          title={u.isBlocked || u.isBlacklisted ? t('admin.users.tooltips.unblock') : t('admin.users.tooltips.block')}
                        >
                          {u.isBlocked || u.isBlacklisted ? <ShieldCheck className="w-3.5 h-3.5" /> : <Ban className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          onClick={() => handleDelete(u)}
                          className="p-1.5 bg-rose-50 border border-rose-200 text-rose-600 hover:bg-rose-100 rounded-lg cursor-pointer transition-colors"
                          title={t('admin.users.tooltips.delete')}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-slate-500">
                      No users found matching "{searchTerm}"
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          
          {/* Pagination Controls */}
          {totalPages > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between p-4 border-t border-slate-100 bg-white gap-4">
              <div className="text-xs text-slate-500 font-medium">
                Showing {filteredUsers.length === 0 ? 0 : ((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredUsers.length)} of {filteredUsers.length} entries
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  Previous
                </button>
                <div className="flex items-center px-2 text-xs font-bold text-slate-700">
                  Page {currentPage} of {totalPages || 1}
                </div>
                <button
                  type="button"
                  disabled={currentPage === totalPages || totalPages === 0}
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </UICard>
      )}

      {/* Register Client Modal */}
      {showRegisterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setShowRegisterModal(false)}></div>
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-primary" />
                Register New Client
              </h2>
              <button
                onClick={() => setShowRegisterModal(false)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              {regError && (
                <div className="mb-4 bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-3">
                  {regError}
                </div>
              )}
              <form onSubmit={handleRegisterClient} className="flex flex-col gap-4">
                <Input
                  icon={User}
                  label="FULL NAME"
                  placeholder="Enter full name"
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  required
                />
                <Input
                  icon={Smartphone}
                  type="tel"
                  maxLength={10}
                  label="MOBILE NUMBER"
                  placeholder="Enter 10-digit mobile number"
                  value={regMobile}
                  onChange={(e) => setRegMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  required
                />
                <Input
                   icon={Lock}
                   type={showRegPassword ? 'text' : 'password'}
                   label="PASSWORD"
                   placeholder="Create a password (min 6 chars)"
                   value={regPassword}
                   onChange={(e) => setRegPassword(e.target.value)}
                   required
                   suffix={
                     <button
                       type="button"
                       onClick={() => setShowRegPassword(!showRegPassword)}
                       className="text-slate-400 hover:text-slate-600 transition-colors p-1"
                     >
                       {showRegPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                     </button>
                   }
                 />
                <Input
                   icon={Lock}
                   type={showRegConfirmPassword ? 'text' : 'password'}
                   label="CONFIRM PASSWORD"
                   placeholder="Retype your password"
                   value={regConfirmPassword}
                   onChange={(e) => setRegConfirmPassword(e.target.value)}
                   required
                   suffix={
                     <button
                       type="button"
                       onClick={() => setShowRegConfirmPassword(!showRegConfirmPassword)}
                       className="text-slate-400 hover:text-slate-600 transition-colors p-1"
                     >
                       {showRegConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                     </button>
                   }
                 />

                <Button
                  type="submit"
                  variant="primary"
                  isLoading={regLoading}
                  className="w-full mt-4 py-3 rounded-xl font-bold"
                >
                  Register Client
                </Button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default UsersManager;
