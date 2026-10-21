import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../app/providers/AuthProvider';
import { LogOut, Search, Menu } from 'lucide-react';
import { LanguageSwitcher } from '../../components/ui/LanguageSwitcher';
import { NotificationCenter } from '../components/NotificationCenter';

interface AdminHeaderProps {
  onMobileMenuToggle: () => void;
}

export const AdminHeader: React.FC<AdminHeaderProps> = ({ onMobileMenuToggle }) => {
  const { logout, user } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
    } finally {
      navigate('/', { replace: true });
    }
  };

  return (
    <header className="fixed top-0 right-0 z-40 bg-white/70 backdrop-blur-md border-b border-slate-200/60 flex justify-between items-center w-full md:pl-[280px] px-4 sm:px-6 md:px-8 h-16 sm:h-20 shadow-sm">
      <div className="flex items-center gap-4">
        <button
          onClick={onMobileMenuToggle}
          className="md:hidden text-primary p-2 hover:bg-slate-100 rounded-lg cursor-pointer transition-colors"
        >
          <Menu className="w-6 h-6" />
        </button>
        <h2 className="text-lg font-extrabold text-slate-850 tracking-tight hidden md:block ml-4 md:ml-8">
          {user?.role === 'admin' ? t('admin.title') : 'Employee'}
        </h2>
      </div>

      <div className="flex items-center gap-2 sm:gap-4">
        {/* Search */}
        <div className="hidden md:flex relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder={t('admin.searchPlaceholder')}
            className="bg-slate-50 border border-slate-200 focus:border-primary focus:bg-white transition-all rounded-lg pl-9 pr-4 py-2 text-xs text-slate-900 w-60 focus:outline-none placeholder-slate-400"
          />
        </div>

        {/* Notifications */}
        <NotificationCenter />

        {/* Language Switcher */}
        <LanguageSwitcher />

        {/* User Info */}
        <div className="flex items-center gap-3">
          <div className="text-center hidden sm:block">
            <p className="text-xs uppercase tracking-wider font-bold text-slate-900">{user?.displayName || (user as any)?.name || t('admin.role')}</p>
            <p className="text-[9px] uppercase tracking-widest text-slate-400">{user?.role === 'admin' ? 'Admin' : 'Employee'}</p>
          </div>
          <button
            onClick={handleLogout}
            className="p-2 text-red-500 hover:text-red-600 hover:bg-red-50 rounded-full cursor-pointer transition-all"
            title={t('admin.logout')}
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
