// import React from 'react';
// import ReactDOM from 'react-dom/client';
// import DNAJourneyLanding from './components/landing/DNAJourneyLanding.jsx';
// import './index.css';

// ReactDOM.createRoot(document.getElementById('root')).render(
//   <React.StrictMode>
//     <DNAJourneyLanding />
//   </React.StrictMode>
// );
import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import GeneTrustLanding from './components/landing/GeneTrustLanding.jsx';
import UserDashboard from './pages/UserDashboard.jsx';
import ResearcherDashboard from './pages/ResearcherDashboard.jsx';
import { ThemeProvider } from './theme/ThemeProvider.jsx';
import { AppStateProvider } from './contexts/AppStateContext.jsx';
import ErrorBoundary from './components/common/ErrorBoundary.jsx';
import { disableHoverOnTouch } from './utils/mobileOptimization.js';
import './index.css';
import './styles/mobile.css';

// Initialize mobile optimizations
disableHoverOnTouch();

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
        <UserDashboard />
      </ErrorBoundary>
    );
  }
  if (route === 'researchers-dashboard') {
    return (
      <ErrorBoundary>
        <ResearcherDashboard />
      </ErrorBoundary>
    );
  }
  // default landing
  return (
    <ErrorBoundary>
      <GeneTrustLanding />
    </ErrorBoundary>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AppStateProvider>
      <ThemeProvider>
        <AppRouter />
      </ThemeProvider>
    </AppStateProvider>
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
