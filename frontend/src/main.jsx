import React, { Suspense } from 'react';
import ReactDOM from 'react-dom/client';
import { I18nextProvider } from 'react-i18next';
import { ThemeProvider } from './theme/ThemeProvider.jsx';
import { AppStateProvider } from './contexts/AppStateContext.jsx';
import { ErrorBoundary } from './components/common';
import { disableHoverOnTouch } from './utils/mobileOptimization.js';
import * as serviceWorkerRegistration from './utils/serviceWorkerRegistration';
import reportWebVitals from './reportWebVitals';
import i18n from './i18n/config';
import App from './App';
import './index.css';
import './styles/mobile.css';

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

if (process.env.NODE_ENV === 'production') {
  reportWebVitals(console.log);
}

disableHoverOnTouch();

window.addEventListener('unhandledrejection', (event) => {
  console.error('[GeneTrust] Unhandled promise rejection:', event.reason);
  event.preventDefault();
});

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

const root = ReactDOM.createRoot(document.getElementById('root'));

root.render(
  <React.StrictMode>
    <I18nextProvider i18n={i18n}>
      <AppStateProvider>
        <ThemeProvider>
          <ErrorBoundary>
            <Suspense fallback={<PageLoader />}>
              <App />
            </Suspense>
          </ErrorBoundary>
        </ThemeProvider>
      </AppStateProvider>
    </I18nextProvider>
  </React.StrictMode>
);

reportWebVitals();
