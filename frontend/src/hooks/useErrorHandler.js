import { useState, useCallback, useRef, useEffect } from 'react';
import { AppError, ERROR_CODES } from '../utils/errorUtils';
import analyticsService from '../services/analytics/analyticsService';

/**
 * Custom hook for handling errors in React components
 * @param {Object} options - Options for error handling
 * @param {boolean} options.autoTrack - Whether to automatically track errors (default: true)
 * @param {Function} options.onError - Custom error handler function
 * @param {boolean} options.showUserFriendly - Whether to show user-friendly messages (default: true)
 * @returns {Object} Error handling utilities
 */
const useErrorHandler = (options = {}) => {
  const {
    autoTrack = true,
    onError: customErrorHandler,
    showUserFriendly = true,
  } = options;
  
  const [error, setError] = useState(null);
  const errorRef = useRef(null);
  
  // Keep error ref in sync with state
  useEffect(() => {
    errorRef.current = error;
  }, [error]);
  
  /**
   * Handle an error
   * @param {Error|string|any} error - The error to handle
   * @param {Object} options - Additional options
   * @param {string} options.context - Context about where the error occurred
   * @param {boolean} options.throw - Whether to re-throw the error (default: false)
   * @param {boolean} options.track - Whether to track the error (default: autoTrack)
   * @returns {void}
   */
  const handleError = useCallback((error, { 
    context = {}, 
    throw: shouldThrow = false, 
    track = autoTrack,
  } = {}) => {
    // Normalize the error to an AppError
    let normalizedError = error;
    
    if (!(error instanceof AppError)) {
      normalizedError = AppError.fromError(error, {
        context: {
          ...(typeof context === 'string' ? { message: context } : context),
          componentStack: error?.stack,
        },
      });
    }
    
    // Update state
    setError(normalizedError);
    
    // Track the error if enabled
    if (track) {
      analyticsService.trackError(normalizedError, {
        context: {
          ...(normalizedError.context || {}),
          ...(typeof context === 'string' ? { message: context } : context),
        },
      });
    }
    
    // Call custom error handler if provided
    if (customErrorHandler) {
      customErrorHandler(normalizedError);
    }
    
    // Re-throw the error if requested
    if (shouldThrow) {
      throw normalizedError;
    }
    
    return normalizedError;
  }, [autoTrack, customErrorHandler]);
  
  /**
   * Clear the current error
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);
  
  /**
   * Execute an async function and handle any errors that occur
   * @param {Function} fn - The async function to execute
   * @param {Object} options - Options for error handling
   * @returns {Promise<{data: any, error: Error|null}>} The result of the function or an error
   */
  const withErrorHandling = useCallback(async (fn, options = {}) => {
    const {
      context,
      throw: shouldThrow = false,
      track = autoTrack,
      onSuccess,
      onError,
    } = options;
    
    try {
      const result = await fn();
      
      // Clear any previous errors
      if (errorRef.current) {
        clearError();
      }
      
      // Call success callback if provided
      if (onSuccess) {
        onSuccess(result);
      }
      
      return { data: result, error: null };
    } catch (error) {
      const normalizedError = handleError(error, { context, throw: shouldThrow, track });
      
      // Call error callback if provided
      if (onError) {
        onError(normalizedError);
      }
      
      return { data: null, error: normalizedError };
    }
  }, [autoTrack, clearError, handleError]);
  
  /**
   * Create a handler for a specific error code
   * @param {number} errorCode - The error code to handle
   * @param {Function} handler - The handler function
   * @returns {Function} A function that handles the specified error code
   */
  const createErrorHandler = useCallback((errorCode, handler) => {
    return (error, options = {}) => {
      if (error?.code === errorCode) {
        return handler(error, options);
      }
      
      // If the error doesn't match, re-throw it
      if (options.throw !== false) {
        throw error;
      }
      
      return error;
    };
  }, []);
  
  // Common error handlers
  const handleNetworkError = useCallback((error, options = {}) => {
    if (error?.code >= 3000 && error.code < 4000) {
      return handleError(error, {
        ...options,
        context: {
          ...(options.context || {}),
          isNetworkError: true,
        },
      });
    }
    
    if (options.throw !== false) {
      throw error;
    }
    
    return error;
  }, [handleError]);
  
  const handleUnauthorized = useCallback((error, options = {}) => {
    if (error?.code === ERROR_CODES.API_UNAUTHORIZED || 
        error?.response?.status === 401) {
      return handleError(error, {
        ...options,
        context: {
          ...(options.context || {}),
          requiresAuth: true,
        },
      });
    }
    
    if (options.throw !== false) {
      throw error;
    }
    
    return error;
  }, [handleError]);
  
  return {
    // State
    error,
    hasError: !!error,
    
    // Methods
    handleError,
    clearError,
    withErrorHandling,
    createErrorHandler,
    
    // Common error handlers
    handleNetworkError,
    handleUnauthorized,
    
    // Error codes for reference
    ERROR_CODES,
    
    // Error display utilities
    getErrorMessage: (customError = error) => {
      if (!customError) return null;
      
      if (showUserFriendly) {
        return customError.userMessage || customError.message || 'An unexpected error occurred';
      }
      
      return customError.message || 'An unexpected error occurred';
    },
    
    // Error boundary props
    errorBoundaryProps: {
      onError: (error, errorInfo) => {
        handleError(error, {
          context: {
            ...(errorInfo?.componentStack ? { componentStack: errorInfo.componentStack } : {}),
            isBoundaryError: true,
          },
        });
      },
    },
  };
};

export default useErrorHandler;
