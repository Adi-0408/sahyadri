import React, { useEffect, Suspense, lazy } from 'react';
import { Route, Routes, Outlet, Navigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Navbar } from '../../components/layout/Navbar';
import { Footer } from '../../components/layout/Footer';
import { MobileBottomNav } from '../../components/layout/MobileBottomNav';
import { PageLoader } from '../../components/ui/PageLoader';

// Lazy loading pages for code splitting
const Home = lazy(() => import('../../public-pages/Home').then(module => ({ default: module.Home })));
const Properties = lazy(() => import('../../public-pages/Properties').then(module => ({ default: module.Properties })));
const Details = lazy(() => import('../../public-pages/Properties/Details').then(module => ({ default: module.Details })));
const Projects = lazy(() => import('../../public-pages/Projects').then(module => ({ default: module.Projects })));
const ProjectDetails = lazy(() => import('../../public-pages/Projects/ProjectDetails').then(module => ({ default: module.ProjectDetails })));
const Contact = lazy(() => import('../../public-pages/Contact').then(module => ({ default: module.Contact })));
const Login = lazy(() => import('../../public-pages/Auth/Login').then(module => ({ default: module.Login })));
const Register = lazy(() => import('../../public-pages/Auth/Register').then(module => ({ default: module.Register })));
const PostProperty = lazy(() => import('../../public-pages/Properties/PostProperty').then(module => ({ default: module.PostProperty })));
const Profile = lazy(() => import('../../public-pages/Profile').then(module => ({ default: module.Profile })));
const RoleInquiry = lazy(() => import('../../public-pages/RoleInquiry').then(module => ({ default: module.RoleInquiryPage })));
const SellerDashboard = lazy(() => import('../../public-pages/Dashboards/SellerDashboard').then(module => ({ default: module.SellerDashboard })));
const BuyerDashboard = lazy(() => import('../../public-pages/Dashboards/BuyerDashboard').then(module => ({ default: module.BuyerDashboard })));
const AgentDashboard = lazy(() => import('../../public-pages/Dashboards/AgentDashboard').then(module => ({ default: module.AgentDashboard })));
const BuilderDashboard = lazy(() => import('../../public-pages/Dashboards/BuilderDashboard').then(module => ({ default: module.BuilderDashboard })));
const SupplierDashboard = lazy(() => import('../../public-pages/Dashboards/SupplierDashboard').then(module => ({ default: module.SupplierDashboard })));
const Materials = lazy(() => import('../../public-pages/Materials').then(module => ({ default: module.Materials })));

const PublicLayout: React.FC = () => {
  const location = useLocation();

  // Instant scroll to top on route change to prevent smooth scroll stutter
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
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
              className="w-full flex-grow flex flex-col will-change-[opacity,transform]"
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </Suspense>
      </main>
      <Footer />

      {/* Native-style Mobile Bottom Navigation */}
      <MobileBottomNav />
    </div>
  );
};

export const PublicRoutes: React.FC = () => {
  return (
    <Routes>
      {/* Standalone full-screen pages (no Navbar/Footer) */}
      <Route path="/login" element={
        <Suspense fallback={<PageLoader />}>
          <Login />
        </Suspense>
      } />
      <Route path="/register" element={
        <Suspense fallback={<PageLoader />}>
          <Register />
        </Suspense>
      } />

      {/* Standard pages with Navbar + Footer */}
      <Route element={<PublicLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/properties" element={<Properties />} />
        <Route path="/property/:id" element={<Details />} />
        <Route path="/projects" element={<Projects />} />
        <Route path="/project/:id" element={<ProjectDetails />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/post-property" element={<PostProperty />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/role-inquiry" element={<RoleInquiry />} />
        <Route path="/seller/dashboard" element={<SellerDashboard />} />
        <Route path="/buyer/dashboard" element={<BuyerDashboard />} />
        <Route path="/builder/dashboard" element={<BuilderDashboard />} />
        <Route path="/agent/dashboard" element={<AgentDashboard />} />
        <Route path="/supplier/dashboard" element={<SupplierDashboard />} />
        <Route path="/materials" element={<Materials />} />
        <Route path="/suppliers" element={<Navigate to="/materials" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
};

