import React, { useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import analyticsService from '../services/analytics/analyticsService';
import performanceTracker from '../utils/performance';

/**
 * AnalyticsProvider component that initializes and provides analytics functionality
 * to the application. Should be placed near the root of the component tree.
 */
const AnalyticsProvider = ({ children, config = {} }) => {
  const initializedRef = useRef(false);

  // Initialize analytics and performance tracking
  useEffect(() => {
    if (initializedRef.current) return;

    const initAnalytics = async () => {
      try {
        // Initialize analytics service
        await analyticsService.init({
          // Default configuration can be overridden by the config prop
          errorTracking: {
            enabled: true,
            ...config.errorTracking,
          },
          performanceMonitoring: {
            enabled: true,
            ...config.performanceMonitoring,
          },
          userAnalytics: {
            enabled: true,
            ...config.userAnalytics,
          },
          // Pass through any additional config
          ...config,
        });

        // Initialize performance tracking
        performanceTracker.init();

        // Track initial page load
        analyticsService.trackEvent('app_loaded', {
          path: window.location.pathname,
          referrer: document.referrer,
          userAgent: navigator.userAgent,
        });

        initializedRef.current = true;
      } catch (error) {
        console.error('Failed to initialize analytics:', error);
      }
    };

    initAnalytics();

    // Cleanup function
    return () => {
      // Any cleanup if needed when the component unmounts
    };
  }, [config]);

  return <>{children}</>;
};

AnalyticsProvider.propTypes = {
  children: PropTypes.node.isRequired,
  config: PropTypes.shape({
    errorTracking: PropTypes.object,
    performanceMonitoring: PropTypes.object,
    userAnalytics: PropTypes.object,
    // Allow any other config properties
    [PropTypes.string]: PropTypes.any,
  }),
};

export default AnalyticsProvider;
