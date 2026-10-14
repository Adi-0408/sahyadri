import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import { AuthProvider } from './app/providers/AuthProvider';
import { ScrollToTop } from './components/layout/ScrollToTop';
import { PageLoader } from './components/ui/PageLoader';

// Lazy load route aggregators
const PublicRoutes = lazy(() => import('./app/routes/PublicRoutes').then(m => ({ default: m.PublicRoutes })));
const AdminRoutes = lazy(() => import('./app/routes/AdminRoutes').then(m => ({ default: m.AdminRoutes })));

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <ScrollToTop />
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="admin/*" element={<AdminRoutes />} />
            <Route path="/*" element={<PublicRoutes />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
