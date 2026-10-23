import React, { Suspense, lazy } from 'react';
import { Route, Routes, Navigate } from 'react-router-dom';
import { ProtectedAdminRoute } from './ProtectedAdminRoute';
import { AdminLayout } from '../../admin/layouts/AdminLayout';
import { PageLoader } from '../../components/ui/PageLoader';

// Lazy load admin pages to keep the public bundle small
const AdminLogin = lazy(() => import('../../admin/pages/Login').then(m => ({ default: m.AdminLogin })));
const Dashboard = lazy(() => import('../../admin/pages/Dashboard').then(m => ({ default: m.Dashboard })));
const ProjectsManager = lazy(() => import('../../admin/pages/Projects').then(m => ({ default: m.ProjectsManager })));
const UsersManager = lazy(() => import('../../admin/pages/Users').then(m => ({ default: m.UsersManager })));
const EnquiriesManager = lazy(() => import('../../admin/pages/Enquiries').then(m => ({ default: m.EnquiriesManager })));
const BlogsManager = lazy(() => import('../../admin/pages/Blogs').then(m => ({ default: m.BlogsManager })));
const AdvertisementsManager = lazy(() => import('../../admin/pages/Advertisements').then(m => ({ default: m.AdvertisementsManager })));
const Settings = lazy(() => import('../../admin/pages/Settings').then(m => ({ default: m.Settings })));
const HeroSectionManager = lazy(() => import('../../admin/pages/HeroSection').then(m => ({ default: m.HeroSectionManager })));
const PropertyForSell = lazy(() => import('../../admin/pages/PropertyForSell').then(m => ({ default: m.PropertyForSell })));
const PropertyForRent = lazy(() => import('../../admin/pages/PropertyForRent').then(m => ({ default: m.PropertyForRent })));
const PropertyEdit = lazy(() => import('../../admin/pages/PropertyEdit').then(m => ({ default: m.PropertyEdit })));
const SendProperty = lazy(() => import('../../admin/pages/SendProperty').then(m => ({ default: m.SendProperty })));
const EmployeeManagement = lazy(() => import('../../admin/pages/EmployeeManagement').then(m => ({ default: m.EmployeeManagement })));
const RepresentativesManager = lazy(() => import('../../admin/pages/Representatives').then(m => ({ default: m.RepresentativesManager })));
const RepresentativeTasks = lazy(() => import('../../admin/pages/RepresentativeTasks').then(m => ({ default: m.RepresentativeTasks })));
const ShotsManager = lazy(() => import('../../admin/pages/Shots').then(m => ({ default: m.ShotsManager })));
const AgentsManager = lazy(() => import('../../admin/pages/Agents').then(m => ({ default: m.AgentsManager })));
const RoleRequestsManager = lazy(() => import('../../admin/pages/RoleRequests').then(m => ({ default: m.RoleRequestsManager })));
const RoleActivityManager = lazy(() => import('../../admin/pages/RoleActivity').then(m => ({ default: m.RoleActivityManager })));

export const AdminRoutes: React.FC = () => {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* Login route is not protected, does not have layout */}
        <Route path="login" element={<AdminLogin />} />

        {/* Protected dashboard and manager modules */}
        <Route element={<ProtectedAdminRoute />}>
          <Route element={<AdminLayout />}>
            <Route path="dashboard" element={<Dashboard />} />

            {/* Legacy properties route — redirect to property-sell */}
            <Route path="properties" element={<Navigate to="/admin/property-sell" replace />} />
            <Route path="properties/pending" element={<Navigate to="/admin/property-sell/pending" replace />} />
            <Route path="properties/approved" element={<Navigate to="/admin/property-sell/approved" replace />} />
            <Route path="properties/rejected" element={<Navigate to="/admin/property-sell/rejected" replace />} />
            <Route path="properties/onhold" element={<Navigate to="/admin/property-sell/pending" replace />} />

            {/* Property For Sell */}
            <Route path="property-sell" element={<PropertyForSell />} />
            <Route path="property-sell/pending" element={<PropertyForSell />} />
            <Route path="property-sell/approved" element={<PropertyForSell />} />
            <Route path="property-sell/rejected" element={<PropertyForSell />} />
            <Route path="property-sell/hidden" element={<PropertyForSell />} />

            {/* Property For Rent */}
            <Route path="property-rent" element={<PropertyForRent />} />
            <Route path="property-rent/pending" element={<PropertyForRent />} />
            <Route path="property-rent/approved" element={<PropertyForRent />} />
            <Route path="property-rent/rejected" element={<PropertyForRent />} />
            <Route path="property-rent/hidden" element={<PropertyForRent />} />

            {/* Projects */}
            <Route path="projects" element={<ProjectsManager />} />

            {/* Edit Property */}
            <Route path="property-edit/:id" element={<PropertyEdit />} />

            {/* Hero Section */}
            <Route path="hero-section" element={<HeroSectionManager />} />

            {/* 99. Shots (Add Shot / Reels Management) */}
            <Route path="shots" element={<ShotsManager />} />

            {/* Location Config Redirects */}
            <Route path="districts" element={<Navigate to="/admin/hero-section" replace />} />
            <Route path="talukas" element={<Navigate to="/admin/hero-section" replace />} />
            <Route path="property-types" element={<Navigate to="/admin/hero-section" replace />} />

            {/* Client Leads & Network */}
            <Route path="role-activity" element={<RoleActivityManager />} />
            <Route path="role-requests" element={<RoleRequestsManager />} />
            <Route path="tasks" element={<RepresentativeTasks />} />
            <Route path="users" element={<UsersManager />} />
            <Route path="representatives" element={<RepresentativesManager />} />
            <Route path="agents" element={<AgentsManager />} />
            <Route path="send-property" element={<SendProperty />} />
            <Route path="enquiries" element={<EnquiriesManager />} />
            <Route path="visit-requests" element={<Navigate to="/admin/dashboard" replace />} />

            {/* Content */}
            <Route path="blogs" element={<BlogsManager />} />
            <Route path="advertisements" element={<AdvertisementsManager />} />

            {/* System */}
            <Route path="reports" element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="settings" element={<Settings />} />
            <Route path="employees" element={<EmployeeManagement />} />
            <Route path="homepage" element={<Navigate to="/admin/dashboard" replace />} />

            {/* Index and fallback redirect to dashboard */}
            <Route path="" element={<Navigate to="dashboard" replace />} />
            <Route path="*" element={<Navigate to="dashboard" replace />} />
          </Route>
        </Route>
      </Routes>
    </Suspense>
  );
};
