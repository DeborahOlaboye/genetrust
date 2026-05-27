import { lazy, Suspense } from 'react';
import { Routes, Route, BrowserRouter as Router } from 'react-router-dom';
import { lazyWithRetry } from '../utils/lazyWithRetry';
import { LoadingSpinner, PageErrorBoundary } from '../components/common';

const GeneTrustLanding = lazyWithRetry(() => import('../components/landing/GeneTrustLanding'));
const UserDashboard = lazyWithRetry(() => import('../pages/UserDashboard'));
const ResearcherDashboard = lazyWithRetry(() => import('../pages/ResearcherDashboard'));
const UploadPage = lazyWithRetry(() => import('../pages/UploadPage'));
const ConsentPage = lazyWithRetry(() => import('../pages/ConsentPage'));
const NotFound = lazyWithRetry(() => import('../pages/NotFound'));

const SuspenseFallback = () => (
  <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-[#0B0B1D] via-[#14102E] to-[#0B0B1D]">
    <LoadingSpinner size="lg" label="Loading page…" />
  </div>
);

const AppRouter = () => (
  <Router>
    <Suspense fallback={<SuspenseFallback />}>
      <Routes>
        <Route path="/" element={<GeneTrustLanding />} />
        <Route
          path="/dashboard"
          element={
            <PageErrorBoundary pageName="Dashboard">
              <UserDashboard />
            </PageErrorBoundary>
          }
        />
        <Route
          path="/researcher"
          element={
            <PageErrorBoundary pageName="Researcher Marketplace">
              <ResearcherDashboard />
            </PageErrorBoundary>
          }
        />
        <Route
          path="/upload"
          element={
            <PageErrorBoundary pageName="Upload">
              <UploadPage />
            </PageErrorBoundary>
          }
        />
        <Route
          path="/consent"
          element={
            <PageErrorBoundary pageName="Consent Management">
              <ConsentPage />
            </PageErrorBoundary>
          }
        />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  </Router>
);

export default AppRouter;
