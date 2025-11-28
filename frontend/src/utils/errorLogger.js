/**
 * Global Error Logger
 *
 * Centralized error logging and monitoring utility
 *
 * Features:
 * - Log errors to console in development
 * - Send errors to monitoring service in production
 * - Store recent errors in local storage
 * - Error categorization and filtering
 */

const MAX_STORED_ERRORS = 50;
const STORAGE_KEY = 'genetrust_error_logs';

class ErrorLogger {
  constructor() {
    this.errors = this.loadStoredErrors();
    this.listeners = [];
  }

  /**
   * Load stored errors from localStorage
   */
  loadStoredErrors() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Failed to load stored errors:', error);
      return [];
    }
  }

  /**
   * Save errors to localStorage
   */
  saveErrors() {
    try {
      const recentErrors = this.errors.slice(-MAX_STORED_ERRORS);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(recentErrors));
    } catch (error) {
      console.error('Failed to save errors:', error);
    }
  }

  /**
   * Log an error
   * @param {Error|string} error - The error to log
   * @param {Object} context - Additional context about the error
   */
  logError(error, context = {}) {
    const errorEntry = {
      message: error?.message || String(error),
      stack: error?.stack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      context,
    };

    // Add to errors array
    this.errors.push(errorEntry);

    // Save to storage
    this.saveErrors();

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('[ErrorLogger]', errorEntry);
    }

    // Notify listeners
    this.notifyListeners(errorEntry);

    // Send to monitoring service in production
    if (process.env.NODE_ENV === 'production') {
      this.sendToMonitoring(errorEntry);
    }

    return errorEntry;
  }

  /**
   * Log a blockchain transaction error
   */
  logTransactionError(error, transactionData = {}) {
    return this.logError(error, {
      ...transactionData,
      type: 'blockchain_transaction',
      category: 'transaction',
    });
  }

  /**
   * Log a wallet connection error
   */
  logWalletError(error, walletData = {}) {
    return this.logError(error, {
      ...walletData,
      type: 'wallet_connection',
      category: 'wallet',
    });
  }

  /**
   * Log an API error
   */
  logApiError(error, requestData = {}) {
    return this.logError(error, {
      ...requestData,
      type: 'api_request',
      category: 'api',
    });
  }

  /**
   * Send error to monitoring service
   * @param {Object} errorEntry - The error entry to send
   */
  sendToMonitoring(errorEntry) {
    // Implement your monitoring service integration here
    // Example: Sentry, LogRocket, or custom backend
    try {
      // If Sentry is configured
      if (window.Sentry) {
        window.Sentry.captureException(new Error(errorEntry.message), {
          extra: errorEntry.context,
        });
      }

      // If custom backend endpoint is configured
      if (process.env.REACT_APP_ERROR_ENDPOINT) {
        fetch(process.env.REACT_APP_ERROR_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(errorEntry),
        }).catch(console.error);
      }
    } catch (error) {
      console.error('Failed to send error to monitoring:', error);
    }
  }

  /**
   * Add error listener
   * @param {Function} listener - Callback function to call when error is logged
   */
  addListener(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  /**
   * Notify all listeners
   */
  notifyListeners(errorEntry) {
    this.listeners.forEach((listener) => {
      try {
        listener(errorEntry);
      } catch (error) {
        console.error('Error in error listener:', error);
      }
    });
  }

  /**
   * Get all errors
   */
  getErrors() {
    return [...this.errors];
  }

  /**
   * Get errors by category
   */
  getErrorsByCategory(category) {
    return this.errors.filter((error) => error.context?.category === category);
  }

  /**
   * Get recent errors
   */
  getRecentErrors(count = 10) {
    return this.errors.slice(-count);
  }

  /**
   * Clear all errors
   */
  clearErrors() {
    this.errors = [];
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.error('Failed to clear errors:', error);
    }
  }

  /**
   * Export errors as JSON
   */
  exportErrors() {
    const dataStr = JSON.stringify(this.errors, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `genetrust-errors-${new Date().toISOString()}.json`;
    link.click();

    URL.revokeObjectURL(url);
  }
}

// Create singleton instance
const errorLogger = new ErrorLogger();

// Make available globally for error boundaries
if (typeof window !== 'undefined') {
  window.errorLogger = errorLogger;
}

export default errorLogger;
