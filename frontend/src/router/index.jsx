import { lazy, Suspense } from 'react';
import { Routes, Route, BrowserRouter as Router } from 'react-router-dom';
import { lazyWithRetry } from '../utils/lazyWithRetry';
import LoadingSpinner from '../components/common/LoadingSpinner';

// Lazy load components with retry
const UserDashboard = lazyWithRetry(() => import('../pages/UserDashboard'));
const ResearcherDashboard = lazyWithRetry(() => import('../pages/ResearcherDashboard'));
const NotFound = lazyWithRetry(() => import('../pages/NotFound'));

// Suspense fallback component
const SuspenseFallback = () => (
  <div className="flex items-center justify-center min-h-screen">
    <LoadingSpinner size="lg" />
  </div>
);

const AppRouter = () => (
  <Router>
    <Suspense fallback={<SuspenseFallback />}>
      <Routes>
        <Route path="/" element={<UserDashboard />} />
        <Route path="/researcher" element={<ResearcherDashboard />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  </Router>
);

export default AppRouter;
