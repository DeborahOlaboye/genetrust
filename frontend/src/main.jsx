// import React from 'react';
// import ReactDOM from 'react-dom/client';
// import DNAJourneyLanding from './components/landing/DNAJourneyLanding.jsx';
// import './index.css';

// ReactDOM.createRoot(document.getElementById('root')).render(
//   <React.StrictMode>
//     <DNAJourneyLanding />
//   </React.StrictMode>
// );
import React, { useEffect, useState, lazy, Suspense } from 'react';
import ReactDOM from 'react-dom/client';
import { I18nextProvider } from 'react-i18next';
import { ThemeProvider } from './theme/ThemeProvider.jsx';
import { AppStateProvider } from './contexts/AppStateContext.jsx';
import ErrorBoundary from './components/common/ErrorBoundary.jsx';
import { disableHoverOnTouch } from './utils/mobileOptimization.js';
import i18n from './i18n/config';
import './index.css';
import './styles/mobile.css';

// Lazy load route components for code splitting
const GeneTrustLanding = lazy(() => import('./components/landing/GeneTrustLanding.jsx'));
const UserDashboard = lazy(() => import('./pages/UserDashboard.jsx'));
const ResearcherDashboard = lazy(() => import('./pages/ResearcherDashboard.jsx'));

// Initialize mobile optimizations
disableHoverOnTouch();

// Loading component
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0B0B1D] via-[#14102E] to-[#0B0B1D]">
    <div className="text-center">
      <div className="w-16 h-16 mx-auto mb-4 border-4 border-[#8B5CF6] border-t-transparent rounded-full animate-spin" />
      <p className="text-[#9AA0B2] text-sm">Loading...</p>
    </div>
  </div>
);

function AppRouter() {
  const [hash, setHash] = useState(window.location.hash);

  useEffect(() => {
    const onHashChange = () => setHash(window.location.hash);
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const route = (hash || '').replace(/^#/, '').toLowerCase();

  if (route === 'dashboard') {
    return (
      <ErrorBoundary>
        <Suspense fallback={<PageLoader />}>
          <UserDashboard />
        </Suspense>
      </ErrorBoundary>
    );
  }
  if (route === 'researchers-dashboard') {
    return (
      <ErrorBoundary>
        <Suspense fallback={<PageLoader />}>
          <ResearcherDashboard />
        </Suspense>
      </ErrorBoundary>
    );
  }
  // default landing
  return (
    <ErrorBoundary>
      <Suspense fallback={<PageLoader />}>
        <GeneTrustLanding />
      </Suspense>
    </ErrorBoundary>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <I18nextProvider i18n={i18n}>
      <AppStateProvider>
        <ThemeProvider>
          <AppRouter />
        </ThemeProvider>
      </AppStateProvider>
    </I18nextProvider>
  </React.StrictMode>
);











// 
// import { StrictMode } from 'react'
// import { createRoot } from 'react-dom/client'
// import './index.css'
// import App from './App.jsx'

// createRoot(document.getElementById('root')).render(
//   <StrictMode>
//     <App />
//   </StrictMode>,
// )
