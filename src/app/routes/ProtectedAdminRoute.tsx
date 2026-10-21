import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../providers/AuthProvider';

export const ProtectedAdminRoute: React.FC = () => {
  const { user, loading, isAdmin, authInitialized } = useAuth();

  // If the admin was logging out, redirect directly to the public landing page '/'
  if (typeof window !== 'undefined' && sessionStorage.getItem('admin_logging_out') === 'true') {
    sessionStorage.removeItem('admin_logging_out');
    return <Navigate to="/" replace />;
  }

  // Instant authorization check for master admin or representative session from localStorage
  const hasLocalAdmin = typeof window !== 'undefined' && (() => {
    try {
      const saved = localStorage.getItem('astitva_admin_session');
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed?.role === 'admin' || parsed?.email === 'admin@gmail.com';
      }
    } catch (e) {}
    return false;
  })();

  const hasLocalRep = typeof window !== 'undefined' && (() => {
    try {
      const saved = localStorage.getItem('sahyadri_rep_session');
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed?.role === 'representative';
      }
    } catch (e) {}
    return false;
  })();

  const isAuthorized = hasLocalAdmin || hasLocalRep || (user && (isAdmin || user.role === 'employee' || user.role === 'representative' || user.email === 'admin@gmail.com'));

  // If already authorized, render the admin dashboard immediately with 0ms delay!
  if (isAuthorized) {
    return <Outlet />;
  }

  // Only show loading spinner if completely uninitialized and checking
  if (!authInitialized || loading) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-[#0b1326] text-white z-50">
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 rounded-full border-4 border-primary/20 animate-pulse"></div>
          <div className="absolute inset-0 rounded-full border-4 border-t-primary animate-spin"></div>
        </div>
        <p className="mt-6 font-serif text-lg tracking-widest text-primary animate-pulse">SAHYADRI LAND DEVELOPER ADMIN</p>
        <p className="text-xs text-slate-400 mt-2">Securing admin gateway...</p>
      </div>
    );
  }

  return <Navigate to="/admin/login" replace />;
};
