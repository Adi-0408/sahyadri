import React, { useState, useEffect } from 'react';
import { NavLink, Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  LayoutDashboard,
  Home,
  Key,
  FolderGit2,
  MessageSquare,
  UserCheck,
  Briefcase,
  Users,
  ClipboardList,
  Image,
  Clapperboard,
  Megaphone,
  Settings,
  Shield,
  ExternalLink,
  LogOut
} from 'lucide-react';
import { subscribeToCollection } from '../../services/firebase';
import { subscribeToRoleInquiries } from '../../services/roleInquiry';
import { useAuth } from '../../app/providers/AuthProvider';

interface AdminSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AdminSidebar: React.FC<AdminSidebarProps> = ({ isOpen, onClose }) => {
  const { user, logout } = useAuth();
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
    } finally {
      navigate('/', { replace: true });
    }
  };

  const [pendingSellCount, setPendingSellCount] = useState(0);
  const [pendingRentCount, setPendingRentCount] = useState(0);
  const [pendingRoleCount, setPendingRoleCount] = useState(0);

  useEffect(() => {
    const unsubscribe = subscribeToCollection('properties', (list) => {
      const pendingSell = list.filter((p: any) => {
        const t = (p.type || '').toLowerCase().trim();
        return (t === 'sale' || t === 'sell' || t === 'buy') && p.status === 'pending';
      }).length;
      const pendingRent = list.filter((p: any) => {
        const t = (p.type || '').toLowerCase().trim();
        return (t === 'rent' || t === 'rental') && p.status === 'pending';
      }).length;
      setPendingSellCount(pendingSell);
      setPendingRentCount(pendingRent);
    });

    const unsubRoles = subscribeToRoleInquiries((list) => {
      setPendingRoleCount(list.filter((i: any) => i.status === 'pending').length);
    });

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
      if (typeof unsubRoles === 'function') unsubRoles();
    };
  }, []);

  const hasAccess = (path: string) => {
    if (
      user?.role === 'admin' ||
      user?.email === 'admin@gmail.com' ||
      user?.email === 'admin@astitvarealestate.com' ||
      user?.email === 'admin@propertyastitv.com' ||
      user?.email === 'admin@propertyvishva.com'
    ) {
      return true;
    }
    if (user?.role === 'representative') {
      return path === '/admin/tasks' || path === '/admin/enquiries';
    }
    if (user?.role === 'employee') {
      return (
        Array.isArray(user?.permissions) &&
        (user.permissions.includes(path) ||
          ((path === '/admin/shots' || path === '/admin/advertisements') &&
            user.permissions.includes('/admin/hero-section')))
      );
    }
    return false;
  };

  const hasAnyAccess = (paths: string[]) => paths.some((p) => hasAccess(p));

  const isSectionActive = (section: 'overview' | 'properties' | 'leads' | 'marketing' | 'system') => {
    const p = location.pathname;
    switch (section) {
      case 'overview':
        return p === '/admin/dashboard' || p === '/admin' || p === '/admin/';
      case 'properties':
        return (
          p.startsWith('/admin/property-sell') ||
          p.startsWith('/admin/property-rent') ||
          p.startsWith('/admin/projects') ||
          p.startsWith('/admin/properties') ||
          p.startsWith('/admin/property-edit')
        );
      case 'leads':
        return (
          p.startsWith('/admin/enquiries') ||
          p.startsWith('/admin/role-requests') ||
          p.startsWith('/admin/agents') ||
          p.startsWith('/admin/representatives') ||
          p.startsWith('/admin/users') ||
          p.startsWith('/admin/tasks') ||
          p.startsWith('/admin/send-property')
        );
      case 'marketing':
        return (
          p.startsWith('/admin/hero-section') ||
          p.startsWith('/admin/shots') ||
          p.startsWith('/admin/advertisements') ||
          p.startsWith('/admin/blogs') ||
          p.startsWith('/admin/districts') ||
          p.startsWith('/admin/talukas') ||
          p.startsWith('/admin/property-types')
        );
      case 'system':
        return (
          p.startsWith('/admin/settings') ||
          p.startsWith('/admin/employees') ||
          p.startsWith('/admin/reports')
        );
      default:
        return false;
    }
  };

  const renderNavItem = (item: { name: string; path: string; icon: React.ReactNode; badge?: number | string }) => {
    if (!hasAccess(item.path)) return null;

    const isActive =
      item.path === '/admin/property-sell' || item.path === '/admin/property-rent'
        ? location.pathname.startsWith(item.path)
        : item.path === '/admin/dashboard'
          ? location.pathname === '/admin/dashboard' || location.pathname === '/admin' || location.pathname === '/admin/'
          : location.pathname === item.path || location.pathname.startsWith(item.path + '/');

    return (
      <NavLink
        key={item.path}
        to={item.path}
        onClick={onClose}
        className={`group relative flex items-center justify-between px-2.5 py-1.5 xl:py-2 rounded-lg text-xs lg:text-[13px] xl:text-[13.5px] font-medium transition-all duration-150 cursor-pointer ${
          isActive
            ? 'text-white font-bold bg-gradient-to-r from-emerald-500/20 via-emerald-500/10 to-transparent border border-emerald-500/30 shadow-xs'
            : 'text-slate-300 hover:text-white hover:bg-white/5 border border-transparent'
        }`}
      >
        {/* Left active accent marker */}
        {isActive && (
          <span className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-emerald-400 rounded-r shadow-xs shadow-emerald-400/50" />
        )}

        <div className="flex items-center gap-2.5 min-w-0 pl-0.5">
          <span
            className={`shrink-0 transition-colors ${
              isActive ? 'text-emerald-400' : 'text-slate-400 group-hover:text-slate-200'
            }`}
          >
            {item.icon}
          </span>
          <span className="truncate">{item.name}</span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {item.badge !== undefined && (
            <span className="px-1.5 py-0.5 rounded-full text-[9px] xl:text-[10px] font-bold bg-amber-500 text-slate-950 shrink-0 shadow-xs animate-pulse">
              {item.badge}
            </span>
          )}
          {isActive && (
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0 shadow-xs shadow-emerald-400/50" />
          )}
        </div>
      </NavLink>
    );
  };

  const sidebarContent = (
    <div className="flex flex-col h-full bg-[#0b0f19] border-r border-slate-800/60 overflow-hidden w-full select-none text-left shadow-xl">
      {/* Brand Header */}
      <div className="px-3.5 xl:px-4 py-3 xl:py-3.5 border-b border-slate-800/60 flex items-center justify-between shrink-0 bg-slate-950/60">
        <Link to="/" className="flex items-center gap-2.5">
          <img
            src="/sahyadri-logo.png"
            alt="Sahyadri Land Developer"
            className="h-8 xl:h-9 w-auto object-contain shrink-0 drop-shadow-md"
          />
          <div className="flex flex-col">
            <span className="text-sm xl:text-base font-black tracking-wide text-white leading-tight">
              Sahyadri
            </span>
            <span className="text-[9px] xl:text-[10px] uppercase tracking-wider text-emerald-400 font-extrabold">
              Land Developer
            </span>
          </div>
        </Link>
        <Link
          to="/"
          className="text-slate-400 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-white/10"
          title={t('admin.viewPublicSite', 'View Public Site')}
        >
          <ExternalLink className="w-3.5 h-3.5 xl:w-4 xl:h-4" />
        </Link>
      </div>

      {/* Navigation Sections with distinct card borders */}
      <div className="flex-1 p-2.5 xl:p-3 space-y-2.5 xl:space-y-3 overflow-y-auto overscroll-contain admin-sidebar-scroll">
        {/* 1. Overview */}
        {hasAnyAccess(['/admin/dashboard']) && (
          <div
            className={`rounded-xl border transition-all duration-200 overflow-hidden ${
              isSectionActive('overview')
                ? 'border-emerald-500/40 bg-slate-900/80 shadow-md ring-1 ring-emerald-500/25'
                : 'border-slate-800/80 bg-slate-900/35 hover:border-slate-700/80'
            }`}
          >
            <div className="flex items-center justify-between px-3 py-2 bg-slate-950/40 border-b border-slate-800/60">
              <span
                className={`text-[11px] xl:text-xs uppercase font-extrabold tracking-wider ${
                  isSectionActive('overview') ? 'text-emerald-400' : 'text-slate-400'
                }`}
              >
                {t('admin.sidebar.overview', 'Overview')}
              </span>
              {isSectionActive('overview') && (
                <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] xl:text-[11px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shadow-xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  {t('admin.sidebar.active', 'Active')}
                </span>
              )}
            </div>
            <div className="p-1.5 xl:p-2 space-y-1">
              {renderNavItem({
                name: t('admin.sidebar.dashboard', 'Dashboard'),
                path: '/admin/dashboard',
                icon: <LayoutDashboard className="w-4.5 h-4.5 xl:w-5 xl:h-5" />
              })}
            </div>
          </div>
        )}

        {/* 2. Properties & Projects */}
        {hasAnyAccess(['/admin/property-sell', '/admin/property-rent', '/admin/projects']) && (
          <div
            className={`rounded-xl border transition-all duration-200 overflow-hidden ${
              isSectionActive('properties')
                ? 'border-emerald-500/40 bg-slate-900/80 shadow-md ring-1 ring-emerald-500/25'
                : 'border-slate-800/80 bg-slate-900/35 hover:border-slate-700/80'
            }`}
          >
            <div className="flex items-center justify-between px-3 py-2 bg-slate-950/40 border-b border-slate-800/60">
              <span
                className={`text-[11px] xl:text-xs uppercase font-extrabold tracking-wider ${
                  isSectionActive('properties') ? 'text-emerald-400' : 'text-slate-400'
                }`}
              >
                {t('admin.sidebar.propertiesGroup', 'Properties & Projects')}
              </span>
              {isSectionActive('properties') && (
                <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] xl:text-[11px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shadow-xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  {t('admin.sidebar.active', 'Active')}
                </span>
              )}
            </div>
            <div className="p-1.5 xl:p-2 space-y-1">
              {renderNavItem({
                name: t('admin.sidebar.propertyForSell', 'Properties for Sale'),
                path: '/admin/property-sell',
                icon: <Home className="w-4.5 h-4.5 xl:w-5 xl:h-5" />,
                badge: pendingSellCount > 0 ? pendingSellCount : undefined
              })}

              {renderNavItem({
                name: t('admin.sidebar.propertyForRent', 'Properties for Rent'),
                path: '/admin/property-rent',
                icon: <Key className="w-4.5 h-4.5 xl:w-5 xl:h-5" />,
                badge: pendingRentCount > 0 ? pendingRentCount : undefined
              })}

              {renderNavItem({
                name: t('admin.sidebar.newProjects', 'New Projects'),
                path: '/admin/projects',
                icon: <FolderGit2 className="w-4.5 h-4.5 xl:w-5 xl:h-5" />
              })}
            </div>
          </div>
        )}

        {/* 3. Leads & Network */}
        {hasAnyAccess(['/admin/enquiries', '/admin/role-requests', '/admin/agents', '/admin/representatives', '/admin/users', '/admin/tasks']) && (
          <div
            className={`rounded-xl border transition-all duration-200 overflow-hidden ${
              isSectionActive('leads')
                ? 'border-emerald-500/40 bg-slate-900/80 shadow-md ring-1 ring-emerald-500/25'
                : 'border-slate-800/80 bg-slate-900/35 hover:border-slate-700/80'
            }`}
          >
            <div className="flex items-center justify-between px-3 py-2 bg-slate-950/40 border-b border-slate-800/60">
              <span
                className={`text-[11px] xl:text-xs uppercase font-extrabold tracking-wider ${
                  isSectionActive('leads') ? 'text-emerald-400' : 'text-slate-400'
                }`}
              >
                {t('admin.sidebar.leadsAndPeople', 'Leads & Network')}
              </span>
              {isSectionActive('leads') && (
                <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] xl:text-[11px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shadow-xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  {t('admin.sidebar.active', 'Active')}
                </span>
              )}
            </div>
            <div className="p-1.5 xl:p-2 space-y-1">
              {renderNavItem({
                name: t('admin.sidebar.leadsEnquiries', 'Leads & Enquiries'),
                path: '/admin/enquiries',
                icon: <MessageSquare className="w-4.5 h-4.5 xl:w-5 xl:h-5" />
              })}

              {renderNavItem({
                name: t('admin.sidebar.roleRequests', 'Role Requests'),
                path: '/admin/role-requests',
                icon: <UserCheck className="w-4.5 h-4.5 xl:w-5 xl:h-5" />,
                badge: pendingRoleCount > 0 ? pendingRoleCount : undefined
              })}

              {renderNavItem({
                name: t('admin.sidebar.agents', 'Agents'),
                path: '/admin/agents',
                icon: <Briefcase className="w-4.5 h-4.5 xl:w-5 xl:h-5" />
              })}

              {renderNavItem({
                name: t('admin.sidebar.representatives', 'Representatives'),
                path: '/admin/representatives',
                icon: <UserCheck className="w-4.5 h-4.5 xl:w-5 xl:h-5" />
              })}

              {renderNavItem({
                name: t('admin.sidebar.registeredUsers', 'Registered Users'),
                path: '/admin/users',
                icon: <Users className="w-4.5 h-4.5 xl:w-5 xl:h-5" />
              })}

              {renderNavItem({
                name: t('admin.sidebar.representativeTasks', 'My Tasks'),
                path: '/admin/tasks',
                icon: <ClipboardList className="w-4.5 h-4.5 xl:w-5 xl:h-5" />
              })}
            </div>
          </div>
        )}

        {/* 4. Marketing & Media */}
        {hasAnyAccess(['/admin/hero-section', '/admin/shots', '/admin/advertisements']) && (
          <div
            className={`rounded-xl border transition-all duration-200 overflow-hidden ${
              isSectionActive('marketing')
                ? 'border-emerald-500/40 bg-slate-900/80 shadow-md ring-1 ring-emerald-500/25'
                : 'border-slate-800/80 bg-slate-900/35 hover:border-slate-700/80'
            }`}
          >
            <div className="flex items-center justify-between px-3 py-2 bg-slate-950/40 border-b border-slate-800/60">
              <span
                className={`text-[11px] xl:text-xs uppercase font-extrabold tracking-wider ${
                  isSectionActive('marketing') ? 'text-emerald-400' : 'text-slate-400'
                }`}
              >
                {t('admin.sidebar.marketingAndMedia', 'Marketing & Media')}
              </span>
              {isSectionActive('marketing') && (
                <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] xl:text-[11px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shadow-xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  {t('admin.sidebar.active', 'Active')}
                </span>
              )}
            </div>
            <div className="p-1.5 xl:p-2 space-y-1">
              {renderNavItem({
                name: t('admin.sidebar.heroSection', 'Hero Banner'),
                path: '/admin/hero-section',
                icon: <Image className="w-4.5 h-4.5 xl:w-5 xl:h-5" />
              })}

              {renderNavItem({
                name: t('admin.sidebar.shots', 'Property Shots (Reels)'),
                path: '/admin/shots',
                icon: <Clapperboard className="w-4.5 h-4.5 xl:w-5 xl:h-5" />
              })}

              {renderNavItem({
                name: t('admin.sidebar.advertisements', 'Advertisements & Posters'),
                path: '/admin/advertisements',
                icon: <Megaphone className="w-4.5 h-4.5 xl:w-5 xl:h-5" />
              })}
            </div>
          </div>
        )}

        {/* 5. Settings & System */}
        {hasAnyAccess(['/admin/settings', '/admin/employees']) && (
          <div
            className={`rounded-xl border transition-all duration-200 overflow-hidden ${
              isSectionActive('system')
                ? 'border-emerald-500/40 bg-slate-900/80 shadow-md ring-1 ring-emerald-500/25'
                : 'border-slate-800/80 bg-slate-900/35 hover:border-slate-700/80'
            }`}
          >
            <div className="flex items-center justify-between px-3 py-2 bg-slate-950/40 border-b border-slate-800/60">
              <span
                className={`text-[11px] xl:text-xs uppercase font-extrabold tracking-wider ${
                  isSectionActive('system') ? 'text-emerald-400' : 'text-slate-400'
                }`}
              >
                {t('admin.sidebar.system', 'Settings & System')}
              </span>
              {isSectionActive('system') && (
                <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] xl:text-[11px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shadow-xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  {t('admin.sidebar.active', 'Active')}
                </span>
              )}
            </div>
            <div className="p-1.5 xl:p-2 space-y-1">
              {renderNavItem({
                name: t('admin.sidebar.websiteSettings', 'Website Settings'),
                path: '/admin/settings',
                icon: <Settings className="w-4.5 h-4.5 xl:w-5 xl:h-5" />
              })}

              {renderNavItem({
                name: t('admin.sidebar.employeeManagement', 'Employee Management'),
                path: '/admin/employees',
                icon: <Shield className="w-4.5 h-4.5 xl:w-5 xl:h-5" />
              })}
            </div>
          </div>
        )}
      </div>

      {/* Logout Footer */}
      <div className="p-3 xl:p-4 border-t border-slate-800/60 shrink-0 bg-slate-950/60">
        <button
          type="button"
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 xl:py-2.5 rounded-xl text-xs xl:text-sm font-bold text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 hover:border-rose-500/30 transition-all duration-150 cursor-pointer shadow-xs"
        >
          <LogOut className="w-4 h-4 xl:w-4.5 xl:h-4.5 shrink-0" />
          <span>{t('admin.logout', 'Sign Out')}</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar (Pinned on large screens >= 1024px) */}
      <aside className="fixed left-0 top-0 h-full w-[260px] xl:w-[280px] 2xl:w-[300px] z-50 hidden lg:block transition-all duration-150">
        {sidebarContent}
      </aside>

      {/* Off-canvas Drawer for Mobile, Tablet & Split-Screen (< 1024px) */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          {/* Backdrop */}
          <div
            onClick={onClose}
            className="fixed inset-0 bg-slate-950/75 backdrop-blur-xs transition-opacity cursor-pointer"
          />
          {/* Sidebar Drawer */}
          <div className="relative w-[280px] max-w-[85vw] h-full shadow-2xl animate-in slide-in-from-left duration-200 z-10">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};
