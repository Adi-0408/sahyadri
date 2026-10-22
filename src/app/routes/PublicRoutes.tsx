import React, { useEffect, Suspense, lazy } from 'react';
import { Route, Routes, Outlet, Navigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Navbar } from '../../components/layout/Navbar';
import { Footer } from '../../components/layout/Footer';
import { MobileBottomNav } from '../../components/layout/MobileBottomNav';
import { PageLoader } from '../../components/ui/PageLoader';

// Landing Page & Public Catalogs
const Home = lazy(() => import('../../public-pages/Home').then(module => ({ default: module.Home })));
const Properties = lazy(() => import('../../public-pages/Properties').then(module => ({ default: module.Properties })));
const Details = lazy(() => import('../../public-pages/Properties/Details').then(module => ({ default: module.Details })));
const Projects = lazy(() => import('../../public-pages/Projects').then(module => ({ default: module.Projects })));
const ProjectDetails = lazy(() => import('../../public-pages/Projects/ProjectDetails').then(module => ({ default: module.ProjectDetails })));
const RoleInquiry = lazy(() => import('../../public-pages/RoleInquiry').then(module => ({ default: module.RoleInquiryPage })));
const PostProperty = lazy(() => import('../../public-pages/Properties/PostProperty').then(module => ({ default: module.PostProperty })));

const PublicLayout: React.FC = () => {
  const location = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [location.pathname]);

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 text-slate-900 relative w-full overflow-x-hidden pb-16 md:pb-0">
      <Navbar />

      <main className="flex-grow w-full overflow-x-hidden flex flex-col relative">
        <Suspense fallback={<PageLoader />}>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="w-full flex-grow flex flex-col"
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </Suspense>
      </main>

      <Footer />

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav />
    </div>
  );
};

export const PublicRoutes: React.FC = () => {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        {/* Landing Page */}
        <Route path="/" element={<Home />} />

        {/* Public Catalogs & Details */}
        <Route path="/properties" element={<Properties />} />
        <Route path="/property/:id" element={<Details />} />
        <Route path="/projects" element={<Projects />} />
        <Route path="/project/:id" element={<ProjectDetails />} />
        <Route path="/role-inquiry" element={<RoleInquiry />} />
        <Route path="/post-property" element={<PostProperty />} />

        {/* Redirects for legacy / protected paths */}
        <Route path="/login" element={<Navigate to="/" replace />} />
        <Route path="/register" element={<Navigate to="/" replace />} />
        <Route path="/contact" element={<Navigate to="/#contact" replace />} />
        <Route path="/materials" element={<Navigate to="/" replace />} />
        <Route path="/profile" element={<Navigate to="/" replace />} />
        <Route path="/seller/dashboard" element={<Navigate to="/" replace />} />
        <Route path="/buyer/dashboard" element={<Navigate to="/" replace />} />
        <Route path="/builder/dashboard" element={<Navigate to="/" replace />} />
        <Route path="/agent/dashboard" element={<Navigate to="/" replace />} />
        <Route path="/supplier/dashboard" element={<Navigate to="/" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
};
