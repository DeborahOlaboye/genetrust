import { useEffect, useRef, useCallback } from 'react';
import analyticsService from '../services/analytics/analyticsService';
import { consentManager, ConsentCategories } from '../services/analytics/consentManager';

/**
 * Custom hook for analytics functionality
 * @param {Object} config - Configuration for analytics
 * @param {boolean} [config.autoTrackPageViews=true] - Whether to automatically track page views
 * @param {boolean} [config.autoTrackErrors=true] - Whether to automatically track errors
 * @returns {Object} Analytics methods and consent management
 */
const useAnalytics = (config = {}) => {
  const {
    autoTrackPageViews = true,
    autoTrackErrors = true,
    ...analyticsConfig
  } = config;
  
  const initializedRef = useRef(false);
  const previousPathRef = useRef('');
  const errorHandlerRef = useRef(null);

  // Initialize analytics service
  useEffect(() => {
    if (!initializedRef.current) {
      analyticsService.init(analyticsConfig);
      initializedRef.current = true;
    }

    return () => {
      // Cleanup if needed
      if (errorHandlerRef.current) {
        window.removeEventListener('error', errorHandlerRef.current);
        errorHandlerRef.current = null;
      }
    };
  }, [analyticsConfig]);

  // Set up error tracking
  useEffect(() => {
    if (!autoTrackErrors) return;

    const handleError = (event) => {
      // Skip if the error was already handled
      if (event.defaultPrevented) return;
      
      const { message, filename, lineno, colno, error } = event;
      
      analyticsService.trackError(error || new Error(message), {
        filename,
        line: lineno,
        column: colno,
        timestamp: new Date().toISOString(),
        url: window.location.href,
        userAgent: navigator.userAgent
      });
      
      // Prevent the default error handler
      event.preventDefault();
    };

    // Store the handler reference for cleanup
    errorHandlerRef.current = handleError;
    
    // Listen for unhandled errors
    window.addEventListener('error', handleError);
    
    // Listen for unhandled promise rejections
    const handleUnhandledRejection = (event) => {
      const error = event.reason || new Error('Unhandled promise rejection');
      analyticsService.trackError(error, {
        type: 'unhandledrejection',
        timestamp: new Date().toISOString(),
        url: window.location.href
      });
    };
    
    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    
    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, [autoTrackErrors]);

  // Set up page view tracking
  useEffect(() => {
    if (!autoTrackPageViews) return;

    const trackPageView = () => {
      const currentPath = window.location.pathname + window.location.search;
      
      // Only track if the path has changed
      if (currentPath !== previousPathRef.current) {
        analyticsService.trackPageView(
          currentPath,
          document.title,
          {
            referrer: document.referrer,
            url: window.location.href,
            search: window.location.search,
            hash: window.location.hash
          }
        );
        
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

    // Clean up overrides on unmount
    return () => {
      window.history.pushState = originalPushState;
      window.history.replaceState = originalReplaceState;
    };
  }, [autoTrackPageViews]);

  // Helper function to check if analytics is enabled
  const isAnalyticsEnabled = useCallback(() => {
    return consentManager.hasConsent(ConsentCategories.ANALYTICS);
  }, []);

  // Helper function to update consent
  const updateConsent = useCallback((updates) => {
    consentManager.updateConsent(updates);
  }, []);

  // Helper function to get current consent
  const getConsent = useCallback(() => {
    return consentManager.getConsent();
  }, []);

  // Return the analytics service methods and consent management
  return {
    // Core tracking methods
    trackEvent: analyticsService.trackEvent.bind(analyticsService),
    trackError: analyticsService.trackError.bind(analyticsService),
    trackMetric: analyticsService.trackMetric.bind(analyticsService),
    identifyUser: analyticsService.identifyUser.bind(analyticsService),
    trackPageView: (path, title, properties) => {
      analyticsService.trackPageView(path, title, properties);
    },
    
    // Consent management
    isAnalyticsEnabled,
    updateConsent,
    getConsent,
    
    // Consent categories for easier access
    ConsentCategories,
    
    // Direct access to the consent manager if needed
    consentManager,
    
    // Direct access to the analytics service if needed
    analyticsService,
  };
};

export default useAnalytics;
