import { useEffect, useRef } from 'react';
import analyticsService from '../services/analytics/analyticsService';

/**
 * Custom hook for analytics functionality
 * @param {Object} config - Configuration for analytics
 * @returns {Object} Analytics methods
 */
const useAnalytics = (config = {}) => {
  const initializedRef = useRef(false);
  const previousPathRef = useRef('');

  // Initialize analytics service
  useEffect(() => {
    if (!initializedRef.current) {
      analyticsService.init(config);
      initializedRef.current = true;
    }

    // Track page views
    const trackPageView = () => {
      const currentPath = window.location.pathname + window.location.search;
      
      // Only track if the path has changed
      if (currentPath !== previousPathRef.current) {
        analyticsService.trackEvent('page_view', {
          path: currentPath,
          title: document.title,
          referrer: document.referrer
        });
        
        previousPathRef.current = currentPath;
      }
    };

    // Initial page view
    trackPageView();

    // Set up history listener for SPA navigation
    const originalPushState = window.history.pushState;
    const originalReplaceState = window.history.replaceState;

    // Override pushState to track page views
    window.history.pushState = function(...args) {
      originalPushState.apply(this, args);
      trackPageView();
    };

    // Override replaceState to track page views
    window.history.replaceState = function(...args) {
      originalReplaceState.apply(this, args);
      trackPageView();
    };

    // Listen for popstate events (back/forward navigation)
    window.addEventListener('popstate', trackPageView);

    // Cleanup
    return () => {
      window.history.pushState = originalPushState;
      window.history.replaceState = originalReplaceState;
      window.removeEventListener('popstate', trackPageView);
    };
  }, [config]);

  // Return methods for manual tracking
  return {
    trackEvent: analyticsService.trackEvent.bind(analyticsService),
    trackError: analyticsService.trackError.bind(analyticsService),
    trackMetric: analyticsService.trackMetric.bind(analyticsService),
    identifyUser: analyticsService.identifyUser.bind(analyticsService)
  };
};

export default useAnalytics;
