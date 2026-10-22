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
      <div className="flex-1 flex flex-col md:pl-[300px] xl:pl-[325px] 2xl:pl-[340px] w-full overflow-x-hidden transition-all duration-150">
        {/* Header */}
        <AdminHeader 
          onMobileMenuToggle={() => setIsMobileOpen(!isMobileOpen)} 
        />

        {/* Content canvas */}
        <main className="flex-grow pt-24 sm:pt-28 pb-12 px-4 sm:px-6 md:px-10 max-w-7xl w-full mx-auto overflow-x-hidden">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="w-full flex-grow flex flex-col"
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
