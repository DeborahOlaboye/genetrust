/**
 * Performance Optimization Utilities
 *
 * Tools for monitoring and optimizing application performance
 *
 * Features:
 * - Performance metrics tracking
 * - Blockchain query batching
 * - Request deduplication
 * - Memory optimization
 */

/**
 * Performance metrics tracker
 */
class PerformanceTracker {
  constructor() {
    this.metrics = new Map();
  }

  /**
   * Mark start of an operation
   */
  start(operationName) {
    this.metrics.set(operationName, {
      startTime: performance.now(),
      endTime: null,
      duration: null,
    });
  }

  /**
   * Mark end of an operation
   */
  end(operationName) {
    const metric = this.metrics.get(operationName);
    if (metric) {
      metric.endTime = performance.now();
      metric.duration = metric.endTime - metric.startTime;
      return metric.duration;
    }
    return null;
  }

  /**
   * Get metrics for an operation
   */
  getMetric(operationName) {
    return this.metrics.get(operationName);
  }

  /**
   * Get all metrics
   */
  getAllMetrics() {
    return Array.from(this.metrics.entries()).map(([name, metric]) => ({
      name,
      ...metric,
    }));
  }

  /**
   * Clear all metrics
   */
  clear() {
    this.metrics.clear();
  }
}

// Singleton instance
export const performanceTracker = new PerformanceTracker();

/**
 * Request deduplication helper
 * Prevents duplicate requests for the same data
 */
class RequestDeduplicator {
  constructor() {
    this.pendingRequests = new Map();
  }

  /**
   * Execute request with deduplication
   */
  async execute(key, requestFn) {
    // Check if request is already pending
    if (this.pendingRequests.has(key)) {
      return this.pendingRequests.get(key);
    }

    // Execute request
    const promise = requestFn()
      .finally(() => {
        // Remove from pending after completion
        this.pendingRequests.delete(key);
      });

    this.pendingRequests.set(key, promise);
    return promise;
  }

  /**
   * Clear all pending requests
   */
  clear() {
    this.pendingRequests.clear();
  }
}

export const requestDeduplicator = new RequestDeduplicator();

/**
 * Blockchain query batcher
 * Batches multiple queries into single request
 */
class QueryBatcher {
  constructor(batchDelay = 50) {
    this.batchDelay = batchDelay;
    this.queue = [];
    this.timer = null;
  }

  /**
   * Add query to batch
   */
  add(query) {
    return new Promise((resolve, reject) => {
      this.queue.push({ query, resolve, reject });

      // Clear existing timer
      if (this.timer) {
        clearTimeout(this.timer);
      }

      // Set new timer to flush batch
      this.timer = setTimeout(() => {
        this.flush();
      }, this.batchDelay);
    });
  }

  /**
   * Flush batch and execute queries
   */
  async flush() {
    if (this.queue.length === 0) return;

    const batch = [...this.queue];
    this.queue = [];
    this.timer = null;

    // Execute all queries in parallel
    const results = await Promise.allSettled(
      batch.map(({ query }) => query())
    );

    // Resolve/reject individual promises
    results.forEach((result, index) => {
      const { resolve, reject } = batch[index];
      if (result.status === 'fulfilled') {
        resolve(result.value);
      } else {
        reject(result.reason);
      }
    });
  }
}

export const queryBatcher = new QueryBatcher();

/**
 * Memory usage monitor
 */
export const getMemoryUsage = () => {
  if (performance.memory) {
    return {
      usedJSHeapSize: (performance.memory.usedJSHeapSize / 1048576).toFixed(2) + ' MB',
      totalJSHeapSize: (performance.memory.totalJSHeapSize / 1048576).toFixed(2) + ' MB',
      jsHeapSizeLimit: (performance.memory.jsHeapSizeLimit / 1048576).toFixed(2) + ' MB',
    };
  }
  return null;
};

/**
 * Component render counter for debugging
 */
export const createRenderCounter = (componentName) => {
  let count = 0;
  return () => {
    count++;
    if (process.env.NODE_ENV === 'development') {
      console.log(`${componentName} rendered ${count} times`);
    }
  };
};

/**
 * Measure component render time
 */
export const measureRenderTime = (componentName, renderFn) => {
  const start = performance.now();
  const result = renderFn();
  const end = performance.now();

  if (process.env.NODE_ENV === 'development') {
    console.log(`${componentName} render time: ${(end - start).toFixed(2)}ms`);
  }

  return result;
};

/**
 * Optimize large list rendering
 */
export const chunkArray = (array, chunkSize = 50) => {
  const chunks = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
};

/**
 * Web Worker helper for heavy computations
 */
export const runInWorker = (workerFunction, data) => {
  return new Promise((resolve, reject) => {
    const blob = new Blob([`(${workerFunction.toString()})()`], {
      type: 'application/javascript',
    });
    const workerUrl = URL.createObjectURL(blob);
    const worker = new Worker(workerUrl);

    worker.onmessage = (e) => {
      resolve(e.data);
      worker.terminate();
      URL.revokeObjectURL(workerUrl);
    };

    worker.onerror = (error) => {
      reject(error);
      worker.terminate();
      URL.revokeObjectURL(workerUrl);
    };

    worker.postMessage(data);
  });
};

/**
 * Idle callback wrapper
 * Executes task when browser is idle
 */
export const runWhenIdle = (callback, options = {}) => {
  if ('requestIdleCallback' in window) {
    return requestIdleCallback(callback, options);
  }
  // Fallback for browsers that don't support requestIdleCallback
  return setTimeout(callback, 1);
};

/**
 * Cancel idle callback
 */
export const cancelIdle = (id) => {
  if ('cancelIdleCallback' in window) {
    cancelIdleCallback(id);
  } else {
    clearTimeout(id);
  }
};

export default {
  performanceTracker,
  requestDeduplicator,
  queryBatcher,
  getMemoryUsage,
  createRenderCounter,
  measureRenderTime,
  chunkArray,
  runInWorker,
  runWhenIdle,
  cancelIdle,
};
