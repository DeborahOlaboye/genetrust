import analyticsService from '../services/analytics/analyticsService';

// Performance metrics tracker
class PerformanceTracker {
  constructor() {
    this.marks = new Map();
    this.measurements = new Map();
    this.isInitialized = false;
  }

  /**
   * Initialize performance tracking
   */
  init() {
    if (this.isInitialized || typeof window === 'undefined' || !window.performance) {
      return;
    }

    // Track initial page load performance
    if (window.performance.timing) {
      this._trackNavigationTiming();
    }

    // Track long tasks (blocking the main thread for > 50ms)
    if ('PerformanceObserver' in window) {
      this._observeLongTasks();
    }

    // Track first input delay (FID)
    this._trackFirstInputDelay();

    // Track cumulative layout shift (CLS)
    this._trackCumulativeLayoutShift();

    this.isInitialized = true;
  }

  /**
   * Mark a point in time for performance measurement
   * @param {string} name - Name of the mark
   */
  mark(name) {
    if (typeof window === 'undefined' || !window.performance || !window.performance.mark) {
      return;
    }

    try {
      window.performance.mark(name);
      this.marks.set(name, performance.now());
    } catch (error) {
      console.error('Failed to set performance mark:', error);
    }
  }

  /**
   * Measure the duration between two marks
   * @param {string} name - Name of the measurement
   * @param {string} startMark - Name of the start mark
   * @param {string} endMark - Name of the end mark
   * @param {Object} metadata - Additional metadata for the measurement
   */
  measure(name, startMark, endMark, metadata = {}) {
    if (typeof window === 'undefined' || !window.performance || !window.performance.measure) {
      return;
    }

    try {
      // If either mark doesn't exist, don't measure
      if (!this.marks.has(startMark) || !this.marks.has(endMark)) {
        return;
      }

      window.performance.measure(name, startMark, endMark);
      const measurements = window.performance.getEntriesByName(name);
      const duration = measurements[measurements.length - 1]?.duration;

      if (duration !== undefined) {
        this.measurements.set(name, duration);
        
        // Send the measurement to analytics
        analyticsService.trackMetric(name, duration, {
          ...metadata,
          startMark,
          endMark
        });
      }
    } catch (error) {
      console.error('Failed to measure performance:', error);
    }
  }

  /**
   * Track navigation timing metrics
   * @private
   */
  _trackNavigationTiming() {
    const timing = window.performance.timing;
    const now = new Date().getTime();

    // Only calculate metrics if the page has fully loaded
    if (timing.loadEventEnd > 0) {
      const metrics = {
        dns: timing.domainLookupEnd - timing.domainLookupStart,
        tcp: timing.connectEnd - timing.connectStart,
        ttfb: timing.responseStart - timing.requestStart,
        download: timing.responseEnd - timing.responseStart,
        domReady: timing.domComplete - timing.domLoading,
        domProcessing: timing.domComplete - timing.domInteractive,
        loadEvent: timing.loadEventEnd - timing.loadEventStart,
        total: timing.loadEventEnd - timing.navigationStart,
      };

      // Send each metric
      Object.entries(metrics).forEach(([name, value]) => {
        if (value > 0) {
          analyticsService.trackMetric(`navigation.${name}`, value, {
            type: 'navigation',
            url: window.location.href
          });
        }
      });
    } else if (now - timing.navigationStart < 10000) {
      // If the page hasn't fully loaded yet, wait and try again
      setTimeout(() => this._trackNavigationTiming(), 100);
    }
  }

  /**
   * Track long tasks (blocking the main thread for > 50ms)
   * @private
   */
  _observeLongTasks() {
    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          analyticsService.trackMetric('long_task', entry.duration, {
            type: 'long_task',
            startTime: entry.startTime,
            url: window.location.href
          });
        }
      });

      observer.observe({ entryTypes: ['longtask'] });
    } catch (error) {
      console.error('Failed to observe long tasks:', error);
    }
  }

  /**
   * Track First Input Delay (FID)
   * @private
   */
  _trackFirstInputDelay() {
    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          // Only track the first input
          if (entry.entryType === 'first-input') {
            const delay = entry.processingStart - entry.startTime;
            
            analyticsService.trackMetric('first_input_delay', delay, {
              type: 'first_input',
              name: entry.name,
              startTime: entry.startTime,
              processingStart: entry.processingStart,
              processingEnd: entry.processingEnd,
              cancelable: entry.cancelable,
              url: window.location.href
            });

            // Disconnect after the first input
            observer.disconnect();
            break;
          }
        }
      });

      observer.observe({ type: 'first-input', buffered: true });
    } catch (error) {
      console.error('Failed to track first input delay:', error);
    }
  }

  /**
   * Track Cumulative Layout Shift (CLS)
   * @private
   */
  _trackCumulativeLayoutShift() {
    try {
      let cls = 0;
      let sessionValue = 0;
      let sessionEntries = [];
      let lastKnownShift = 0;

      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          // Only count layout shifts that occurred without recent user input
          if (!entry.hadRecentInput) {
            const firstSessionEntry = sessionEntries[0];
            const lastSessionEntry = sessionEntries[sessionEntries.length - 1];

            // If this shift is part of the same session as the last entry
            if (
              sessionEntries.length > 0 &&
              entry.startTime - lastSessionEntry.startTime < 1000 &&
              entry.startTime - firstSessionEntry.startTime < 5000
            ) {
              sessionValue += entry.value;
              sessionEntries.push(entry);
            } else {
              // New session
              sessionValue = entry.value;
              sessionEntries = [entry];
            }

            // Update CLS if the current session value is larger than the current CLS
            if (sessionValue > cls) {
              cls = sessionValue;
              lastKnownShift = entry.startTime;
              
              // Send CLS update
              analyticsService.trackMetric('cumulative_layout_shift', cls, {
                type: 'layout_shift',
                value: entry.value,
                hadRecentInput: entry.hadRecentInput,
                sources: entry.sources,
                url: window.location.href
              });
            }
          }
        }
      });

      observer.observe({ type: 'layout-shift', buffered: true });
    } catch (error) {
      console.error('Failed to track cumulative layout shift:', error);
    }
  }
}

// Create and export a singleton instance
const performanceTracker = new PerformanceTracker();

export default performanceTracker;
