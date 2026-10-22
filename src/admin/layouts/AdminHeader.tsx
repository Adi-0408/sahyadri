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
    <header className="fixed top-0 right-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-200/80 flex justify-between items-center w-full md:pl-[240px] lg:pl-[260px] xl:pl-[280px] 2xl:pl-[300px] px-3 sm:px-4 md:px-6 h-16 shadow-2xs transition-all duration-150">
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        <button
          onClick={onMobileMenuToggle}
          className="md:hidden text-primary p-2 hover:bg-slate-100 rounded-lg cursor-pointer transition-colors"
          aria-label="Open Navigation"
        >
          <Menu className="w-5 h-5 sm:w-6 sm:h-6" />
        </button>
        <h2 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight hidden md:block">
          {user?.role === 'admin' ? t('admin.title') : 'Employee'}
        </h2>
      </div>

      <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
        {/* Search */}
        <div className="hidden sm:flex relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder={t('admin.searchPlaceholder')}
            className="bg-slate-50 border border-slate-200 focus:border-primary focus:bg-white transition-all rounded-lg pl-8.5 pr-3 py-1.5 text-xs text-slate-900 w-32 md:w-36 lg:w-48 xl:w-60 focus:w-44 lg:focus:w-60 focus:outline-none placeholder-slate-400"
          />
        </div>

        {/* Notifications */}
        <NotificationCenter />

        {/* Language Switcher */}
        <LanguageSwitcher />

        {/* User Info */}
        <div className="flex items-center gap-2 sm:gap-2.5 pl-1 sm:pl-2 border-l border-slate-200/80">
          <div className="text-right hidden sm:block max-w-[100px] md:max-w-[130px] xl:max-w-[180px]">
            <p className="text-xs uppercase tracking-wider font-bold text-slate-900 truncate">
              {user?.displayName || (user as any)?.name || t('admin.role')}
            </p>
            <p className="text-[9px] uppercase tracking-widest text-slate-400 font-semibold">
              {user?.role === 'admin' ? 'Admin' : 'Employee'}
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="p-1.5 sm:p-2 text-rose-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer transition-all"
            title={t('admin.logout')}
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
