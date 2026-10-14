import React, { useState, useEffect } from 'react';
import { NavLink, Link, useLocation } from 'react-router-dom';
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

  const renderNavItem = (item: { name: string; path: string; icon: React.ReactNode; badge?: number | string }) => {
    if (!hasAccess(item.path)) return null;
    return (
      <NavLink
        key={item.path}
        to={item.path}
        onClick={onClose}
        className={({ isActive: navActive }) => {
          const isActive =
            item.path === '/admin/property-sell' || item.path === '/admin/property-rent'
              ? location.pathname.startsWith(item.path)
              : navActive;

          return `group flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs sm:text-[12px] font-medium transition-all duration-150 cursor-pointer ${
            isActive
              ? 'text-white bg-white/10 font-semibold shadow-2xs'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`;
        }}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="shrink-0 opacity-80 group-hover:opacity-100 transition-opacity">
            {item.icon}
          </span>
          <span className="truncate">{item.name}</span>
        </div>
        {item.badge !== undefined && (
          <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-amber-500 text-slate-950 shrink-0 shadow-xs animate-pulse">
            {item.badge}
          </span>
        )}
      </NavLink>
    );
  };

  const sidebarContent = (
    <div className="flex flex-col h-full bg-[#0b0f19] border-r border-slate-800/40 overflow-hidden w-full select-none text-left shadow-sm overscroll-none">
      {/* Brand Header */}
      <div className="px-4 py-3 border-b border-slate-800/40 flex items-center justify-between shrink-0">
        <Link to="/" className="flex items-center gap-2.5">
          <img
            src="/sahyadri-logo.png"
            alt="Sahyadri Land Developer"
            className="h-8 w-auto object-contain shrink-0"
          />
          <div className="flex flex-col">
            <span className="text-sm font-sans tracking-wide font-extrabold text-white leading-tight">
              Sahyadri
            </span>
            <span className="text-[8.5px] uppercase tracking-wider text-emerald-400 font-extrabold">
              Land Developer
            </span>
          </div>
        </Link>
        <Link
          to="/"
          className="text-slate-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/5"
          title={t('admin.viewPublicSite', 'View Public Site')}
        >
          <ExternalLink className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Navigation Sections - Compact & Locked (No Scroll) */}
      <div className="flex-1 py-2 px-2.5 space-y-2 overflow-hidden flex flex-col justify-between">
        {/* 1. Overview */}
        <div className="space-y-0.5">
          <h4 className="text-[9px] uppercase font-bold text-slate-500 tracking-wider px-2.5 mb-0.5 select-none">
            {t('admin.sidebar.overview', 'Overview')}
          </h4>
          {renderNavItem({
            name: t('admin.sidebar.dashboard', 'Dashboard'),
            path: '/admin/dashboard',
            icon: <LayoutDashboard className="w-3.5 h-3.5" />
          })}
        </div>

        {/* 2. Properties & Projects */}
        <div className="space-y-0.5">
          <h4 className="text-[9px] uppercase font-bold text-slate-500 tracking-wider px-2.5 mb-0.5 select-none">
            {t('admin.sidebar.propertiesGroup', 'Properties & Projects')}
          </h4>

          {renderNavItem({
            name: t('admin.sidebar.propertyForSell', 'Properties for Sale'),
            path: '/admin/property-sell',
            icon: <Home className="w-3.5 h-3.5" />,
            badge: pendingSellCount > 0 ? pendingSellCount : undefined
          })}

          {renderNavItem({
            name: t('admin.sidebar.propertyForRent', 'Properties for Rent'),
            path: '/admin/property-rent',
            icon: <Key className="w-3.5 h-3.5" />,
            badge: pendingRentCount > 0 ? pendingRentCount : undefined
          })}

          {/* New Projects */}
          {renderNavItem({
            name: t('admin.sidebar.newProjects', 'New Projects'),
            path: '/admin/projects',
            icon: <FolderGit2 className="w-3.5 h-3.5" />
          })}
        </div>

        {/* 3. Leads & Network */}
        <div className="space-y-0.5">
          <h4 className="text-[9px] uppercase font-bold text-slate-500 tracking-wider px-2.5 mb-0.5 select-none">
            {t('admin.sidebar.leadsAndPeople', 'Leads & Network')}
          </h4>

          {renderNavItem({
            name: t('admin.sidebar.leadsEnquiries', 'Leads & Enquiries'),
            path: '/admin/enquiries',
            icon: <MessageSquare className="w-3.5 h-3.5" />
          })}

          {renderNavItem({
            name: t('admin.sidebar.roleRequests', 'Role Requests'),
            path: '/admin/role-requests',
            icon: <UserCheck className="w-3.5 h-3.5" />,
            badge: pendingRoleCount > 0 ? pendingRoleCount : undefined
          })}

          {renderNavItem({
            name: t('admin.sidebar.agents', 'Agents'),
            path: '/admin/agents',
            icon: <Briefcase className="w-3.5 h-3.5" />
          })}

          {renderNavItem({
            name: t('admin.sidebar.representatives', 'Representatives'),
            path: '/admin/representatives',
            icon: <UserCheck className="w-3.5 h-3.5" />
          })}

          {renderNavItem({
            name: t('admin.sidebar.registeredUsers', 'Registered Users'),
            path: '/admin/users',
            icon: <Users className="w-3.5 h-3.5" />
          })}

          {renderNavItem({
            name: t('admin.sidebar.representativeTasks', 'My Tasks'),
            path: '/admin/tasks',
            icon: <ClipboardList className="w-3.5 h-3.5" />
          })}
        </div>

        {/* 4. Marketing & Media */}
        <div className="space-y-0.5">
          <h4 className="text-[9px] uppercase font-bold text-slate-500 tracking-wider px-2.5 mb-0.5 select-none">
            {t('admin.sidebar.marketingAndMedia', 'Marketing & Media')}
          </h4>

          {renderNavItem({
            name: t('admin.sidebar.heroSection', 'Hero Banner'),
            path: '/admin/hero-section',
            icon: <Image className="w-3.5 h-3.5" />
          })}

          {renderNavItem({
            name: t('admin.sidebar.shots', 'Property Shots (Reels)'),
            path: '/admin/shots',
            icon: <Clapperboard className="w-3.5 h-3.5" />
          })}

          {renderNavItem({
            name: t('admin.sidebar.advertisements', 'Advertisements & Posters'),
            path: '/admin/advertisements',
            icon: <Megaphone className="w-3.5 h-3.5" />
          })}
        </div>

        {/* 5. Settings & System */}
        <div className="space-y-0.5">
          <h4 className="text-[9px] uppercase font-bold text-slate-500 tracking-wider px-2.5 mb-0.5 select-none">
            {t('admin.sidebar.system', 'Settings & System')}
          </h4>

          {renderNavItem({
            name: t('admin.sidebar.websiteSettings', 'Website Settings'),
            path: '/admin/settings',
            icon: <Settings className="w-3.5 h-3.5" />
          })}

          {renderNavItem({
            name: t('admin.sidebar.employeeManagement', 'Employee Management'),
            path: '/admin/employees',
            icon: <Shield className="w-3.5 h-3.5" />
          })}
        </div>
      </div>

      {/* Logout Footer */}
      <div className="p-2 border-t border-slate-800/40 shrink-0">
        <button
          type="button"
          onClick={() => logout()}
          className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-all duration-150 cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5 shrink-0" />
          <span>{t('admin.logout', 'Sign Out')}</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="fixed left-0 top-0 h-full w-[270px] z-50 hidden md:block">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          {/* Backdrop */}
          <div
            onClick={onClose}
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs transition-opacity"
          />
          {/* Sidebar Drawer */}
          <div className="relative w-[270px] h-full shadow-2xl animate-in slide-in-from-left duration-200">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};
