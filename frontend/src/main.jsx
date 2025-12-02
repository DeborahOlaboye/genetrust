import React, { useEffect, useState, lazy, Suspense } from 'react';
import ReactDOM from 'react-dom/client';
import { I18nextProvider } from 'react-i18next';
import { ThemeProvider } from './theme/ThemeProvider.jsx';
import { AppStateProvider } from './contexts/AppStateContext.jsx';
import ErrorBoundary from './components/common/ErrorBoundary.jsx';
import { disableHoverOnTouch } from './utils/mobileOptimization.js';
import * as serviceWorkerRegistration from './utils/serviceWorkerRegistration';
import reportWebVitals from './reportWebVitals';
import i18n from './i18n/config';
import './index.css';
import './styles/mobile.css';

// Register service worker in production
if (process.env.NODE_ENV === 'production') {
  serviceWorkerRegistration.register({
    onUpdate: (registration) => {
      if (registration.waiting) {
        if (window.confirm('A new version is available! Would you like to update?')) {
          registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        }
      }
    },
    onSuccess: () => {
      console.log('Content is cached for offline use.');
    },
  });
}

// Configure web vitals reporting
if (process.env.NODE_ENV === 'production') {
  reportWebVitals(console.log);
}

// Lazy load route components with retry for better reliability
const lazyWithRetry = (componentImport) =>
  lazy(async () => {
    const pageHasRefreshed = JSON.parse(
      window.sessionStorage.getItem('_retry_page_refreshed') || 'false'
    );

    try {
      const component = await componentImport();
      window.sessionStorage.setItem('_retry_page_refreshed', 'false');
      return component;
    } catch (error) {
      if (!pageHasRefreshed) {
        window.sessionStorage.setItem('_retry_page_refreshed', 'true');
        return window.location.reload();
      }
      window.sessionStorage.setItem('_retry_page_refreshed', 'false');
      throw error;
    }
  });

// Lazy load route components for code splitting with retry
const GeneTrustLanding = lazyWithRetry(() => 
  import(/* webpackPrefetch: true */ './components/landing/GeneTrustLanding.jsx')
);
const UserDashboard = lazyWithRetry(() => 
  import(/* webpackPrefetch: true */ './pages/UserDashboard.jsx')
);
const ResearcherDashboard = lazyWithRetry(() => 
  import(/* webpackPrefetch: true */ './pages/ResearcherDashboard.jsx')
);

// Initialize mobile optimizations
disableHoverOnTouch();

// Optimized loading component with better performance
const PageLoader = React.memo(() => (
  <div 
    className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0B0B1D] via-[#14102E] to-[#0B0B1D]"
    role="status"
    aria-live="polite"
    aria-label="Loading application..."
  >
    <div className="text-center">
      <div 
        className="w-16 h-16 mx-auto mb-4 border-4 border-[#8B5CF6] border-t-transparent rounded-full animate-spin"
        aria-hidden="true"
      />
      <p className="text-[#9AA0B2] text-sm">Loading application...</p>
    </div>
  </div>
));

// Memoize the router to prevent unnecessary re-renders
const MemoizedRouter = React.memo(AppRouter);

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

// Use createRoot with concurrent mode features
const root = ReactDOM.createRoot(document.getElementById('root'));

// Use React's concurrent features for better performance
root.render(
  <React.StrictMode>
    <I18nextProvider i18n={i18n}>
      <AppStateProvider>
        <ThemeProvider>
          <ErrorBoundary>
            <Suspense fallback={<PageLoader />}>
              <MemoizedRouter />
            </Suspense>
          </ErrorBoundary>
        </ThemeProvider>
      </AppStateProvider>
    </I18nextProvider>
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();











// In development, log performance metrics
if (process.env.NODE_ENV === 'development') {
  const { whyDidYouUpdate } = require('@welldone-software/why-did-you-render');
  whyDidYouUpdate(React, {
    trackAllPureComponents: true,
  });
}
