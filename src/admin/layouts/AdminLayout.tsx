import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AdminSidebar } from './AdminSidebar';
import { AdminHeader } from './AdminHeader';

export const AdminLayout: React.FC = () => {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const location = useLocation();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex font-sans w-full overflow-x-hidden">
      
      {/* Admin Sidebar drawer */}
      <AdminSidebar 
        isOpen={isMobileOpen} 
        onClose={() => setIsMobileOpen(false)} 
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col md:pl-[240px] lg:pl-[260px] xl:pl-[280px] 2xl:pl-[300px] w-full min-w-0 overflow-x-hidden transition-all duration-150">
        {/* Header */}
        <AdminHeader 
          onMobileMenuToggle={() => setIsMobileOpen(!isMobileOpen)} 
        />

        {/* Content canvas */}
        <main className="flex-grow pt-20 sm:pt-22 pb-12 px-3 sm:px-5 md:px-6 lg:px-8 max-w-7xl w-full mx-auto min-w-0">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="w-full flex-grow flex flex-col min-w-0"
          >
            <Outlet />
          </motion.div>
        </main>
      </div>



      {/* Atmospheric Background Blur Glows */}
      <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
        <div className="absolute -top-[10%] -right-[10%] w-[50%] h-[50%] bg-primary/[0.02] rounded-full blur-[120px]"></div>
        <div className="absolute -bottom-[20%] -left-[10%] w-[60%] h-[60%] bg-accent/[0.02] rounded-full blur-[150px]"></div>
      </div>
    </div>
  );
};
export default AdminLayout;
