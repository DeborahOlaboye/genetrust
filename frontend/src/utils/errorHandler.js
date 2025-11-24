// Error codes and messages
export const ErrorCodes = {
  // Wallet errors (1000-1999)
  WALLET_NOT_CONNECTED: {
    code: 1000,
    message: 'Wallet not connected',
    userMessage: 'Please connect your wallet to continue',
    level: 'warn'
  },
  WALLET_CONNECTION_FAILED: {
    code: 1001,
    message: 'Failed to connect wallet',
    userMessage: 'Failed to connect wallet. Please try again.',
    level: 'error'
  },
  WALLET_DISCONNECT_FAILED: {
    code: 1002,
    message: 'Failed to disconnect wallet',
    userMessage: 'Failed to disconnect wallet. Please try again.',
    level: 'error'
  },
  WALLET_NETWORK_ERROR: {
    code: 1003,
    message: 'Network error occurred',
    userMessage: 'Network error. Please check your connection and try again.',
    level: 'error'
  },
  
  // Contract errors (2000-2999)
  CONTRACT_NOT_INITIALIZED: {
    code: 2000,
    message: 'Contract not initialized',
    userMessage: 'Contract service is not properly initialized',
    level: 'error'
  },
  CONTRACT_CALL_FAILED: {
    code: 2001,
    message: 'Contract call failed',
    userMessage: 'Failed to interact with the smart contract',
    level: 'error'
  },
  
  // Validation errors (3000-3999)
  INVALID_INPUT: {
    code: 3000,
    message: 'Invalid input provided',
    userMessage: 'The provided input is invalid',
    level: 'warn'
  },
  
  // Generic errors (9000-9999)
  UNKNOWN_ERROR: {
    code: 9000,
    message: 'An unknown error occurred',
    userMessage: 'Something went wrong. Please try again.',
    level: 'error'
  }
};

/**
 * Custom error class for application errors
 */
export class AppError extends Error {
  constructor(errorCode, originalError = null, context = {}) {
    const errorInfo = typeof errorCode === 'string' ? 
      ErrorCodes[errorCode] || ErrorCodes.UNKNOWN_ERROR : 
      errorCode;
      
    super(errorInfo.message);
    this.name = 'AppError';
    this.code = errorInfo.code;
    this.userMessage = errorInfo.userMessage;
    this.level = errorInfo.level || 'error';
    this.originalError = originalError;
    this.context = context;
    this.timestamp = new Date().toISOString();
    
    // Capture stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AppError);
    }
  }
}

/**
 * Logs an error with appropriate level
 */
const logError = (error) => {
  if (!error) return;
  
  const errorToLog = error instanceof AppError ? error : new AppError('UNKNOWN_ERROR', error);
  const logContext = {
    ...errorToLog.context,
    code: errorToLog.code,
    timestamp: errorToLog.timestamp,
    stack: errorToLog.stack
  };
  
  switch (errorToLog.level) {
    case 'warn':
      console.warn(errorToLog.message, logContext);
      break;
    case 'info':
      console.info(errorToLog.message, logContext);
      break;
    case 'debug':
      console.debug(errorToLog.message, logContext);
      break;
    default: // error
      console.error(errorToLog.message, logContext);
  }
  
  // TODO: Integrate with error tracking service (e.g., Sentry)
  // trackError(errorToLog);
};

/**
 * Handles errors and shows user-friendly messages
 */
export const handleError = (error, showToast = true) => {
  const errorToHandle = error instanceof AppError ? error : new AppError('UNKNOWN_ERROR', error);
  
  // Log the error
  logError(errorToHandle);
  
  // Show toast notification if needed
  if (showToast && typeof window !== 'undefined') {
    // TODO: Replace with your toast implementation
    // toast.error(errorToHandle.userMessage);
    console.log('[Toast]', errorToHandle.userMessage);
  }
  
  // Return a rejected promise for async/await
  return Promise.reject(errorToHandle);
};

/**
 * Creates an error handler wrapper for async functions
 */
export const withErrorHandling = (fn, errorContext = {}) => {
  return async (...args) => {
    try {
      return await fn(...args);
    } catch (error) {
      if (error instanceof AppError) {
        // Add additional context if needed
        error.context = { ...error.context, ...errorContext };
        throw error;
      }
      throw new AppError('UNKNOWN_ERROR', error, errorContext);
    }
  };
};

export default {
  ErrorCodes,
  AppError,
  handleError,
  withErrorHandling,
  logError
};
