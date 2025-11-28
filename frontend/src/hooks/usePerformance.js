import { useEffect, useRef, useCallback } from 'react';
import { performanceTracker } from '../utils/performanceOptimization';

/**
 * usePerformance Hook
 *
 * Monitor and optimize component performance
 *
 * Features:
 * - Render time tracking
 * - Re-render counting
 * - Performance metrics
 */

export const usePerformance = (componentName, options = {}) => {
  const { trackRenders = true, trackEffects = true, logToConsole = process.env.NODE_ENV === 'development' } = options;

  const renderCount = useRef(0);
  const mountTime = useRef(null);
  const previousProps = useRef(null);

  // Track component mount
  useEffect(() => {
    mountTime.current = performance.now();
    performanceTracker.start(`${componentName}-mount`);

    return () => {
      performanceTracker.end(`${componentName}-mount`);
      const mountDuration = performanceTracker.getMetric(`${componentName}-mount`)?.duration;

      if (logToConsole) {
        console.log(`[Performance] ${componentName} lifecycle:`, {
          totalRenders: renderCount.current,
          mountDuration: mountDuration?.toFixed(2) + 'ms',
        });
      }
    };
  }, [componentName, logToConsole]);

  // Track renders
  if (trackRenders) {
    renderCount.current++;

    if (logToConsole && renderCount.current > 10) {
      console.warn(`[Performance] ${componentName} has rendered ${renderCount.current} times - consider optimization`);
    }
  }

  /**
   * Track specific operation
   */
  const trackOperation = useCallback((operationName) => {
    const fullName = `${componentName}-${operationName}`;

    return {
      start: () => performanceTracker.start(fullName),
      end: () => {
        const duration = performanceTracker.end(fullName);
        if (logToConsole) {
          console.log(`[Performance] ${fullName}: ${duration?.toFixed(2)}ms`);
        }
        return duration;
      },
    };
  }, [componentName, logToConsole]);

  /**
   * Detect why component re-rendered
   */
  const whyDidYouRender = useCallback((props) => {
    if (!previousProps.current) {
      previousProps.current = props;
      return;
    }

    const changedProps = {};
    for (const key in props) {
      if (props[key] !== previousProps.current[key]) {
        changedProps[key] = {
          from: previousProps.current[key],
          to: props[key],
        };
      }
    }

    if (Object.keys(changedProps).length > 0 && logToConsole) {
      console.log(`[Performance] ${componentName} re-rendered due to:`, changedProps);
    }

    previousProps.current = props;
  }, [componentName, logToConsole]);

  return {
    renderCount: renderCount.current,
    trackOperation,
    whyDidYouRender,
  };
};

export default usePerformance;
