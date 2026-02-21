// HTTP Status Code mapping
const HTTP_STATUS_CODES = {
  400: { name: 'Bad Request', level: 'warn' },
  401: { name: 'Unauthorized', level: 'error' },
  403: { name: 'Forbidden', level: 'error' },
  404: { name: 'Not Found', level: 'warn' },
  409: { name: 'Conflict', level: 'warn' },
  422: { name: 'Unprocessable Entity', level: 'error' },
  429: { name: 'Too Many Requests', level: 'warn' },
  500: { name: 'Internal Server Error', level: 'error' },
  503: { name: 'Service Unavailable', level: 'error' }
};

// Smart Contract Error Codes (HTTP-style)
export const ContractErrorCodes = {
  400: { message: 'Invalid input provided', userMessage: 'The request contained invalid data' },
  401: { message: 'Authorization required', userMessage: 'You are not authorized to perform this action' },
  403: { message: 'Access denied', userMessage: 'You do not have permission to access this resource' },
  404: { message: 'Resource not found', userMessage: 'The requested resource was not found' },
  409: { message: 'Resource already exists', userMessage: 'This resource already exists' },
  422: { message: 'Invalid state', userMessage: 'The resource is in an invalid state for this operation' },
  429: { message: 'Rate limit exceeded', userMessage: 'Too many requests. Please try again later' },
  500: { message: 'Internal error', userMessage: 'An internal server error occurred' },
  503: { message: 'Service unavailable', userMessage: 'The service is temporarily unavailable' }
};

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

// Map contract error codes to application error codes
export const mapContractError = (contractErrorCode) => {
  const errorInfo = ContractErrorCodes[contractErrorCode];
  const httpStatus = HTTP_STATUS_CODES[contractErrorCode];
  
  if (!errorInfo) {
    return ErrorCodes.UNKNOWN_ERROR;
  }
  
  return {
    code: contractErrorCode,
    message: errorInfo.message,
    userMessage: errorInfo.userMessage,
    level: httpStatus?.level || 'error',
    httpStatus: contractErrorCode
  };
};

/**
 * Structured error response from smart contracts
 */
export class StructuredErrorResponse {
  constructor(errorCode, message, context = {}) {
    this.errorCode = errorCode;
    this.message = message;
    this.context = context;
    this.timestamp = new Date().toISOString();
    
    // Map to application error
    const mapped = mapContractError(errorCode);
    this.userMessage = mapped.userMessage;
    this.level = mapped.level;
    this.httpStatus = mapped.httpStatus;
  }
  
  toJSON() {
    return {
      errorCode: this.errorCode,
      message: this.message,
      userMessage: this.userMessage,
      context: this.context,
      level: this.level,
      httpStatus: this.httpStatus,
      timestamp: this.timestamp
    };
  }
}

/**
 * Custom error class for application errors with Clarity 4 support
 */
export class AppError extends Error {
  constructor(errorCode, originalError = null, context = {}) {
    let errorInfo;
    
    // Check if it's a contract error code (number)
    if (typeof errorCode === 'number') {
      errorInfo = mapContractError(errorCode);
    } else {
      // Check if it's a string reference to ErrorCodes
      errorInfo = typeof errorCode === 'string' ? 
        ErrorCodes[errorCode] || ErrorCodes.UNKNOWN_ERROR : 
        errorCode;
    }
      
    super(errorInfo.message);
    this.name = 'AppError';
    this.code = errorInfo.code || errorCode;
    this.userMessage = errorInfo.userMessage;
    this.level = errorInfo.level || 'error';
    this.httpStatus = errorInfo.httpStatus;
    this.originalError = originalError;
    this.context = {
      ...context,
      errorId: context.errorId || null,
      operator: context.operator || null
    };
    this.timestamp = new Date().toISOString();
    
    // Capture stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AppError);
    }
  }
  
  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      userMessage: this.userMessage,
      level: this.level,
      httpStatus: this.httpStatus,
      context: this.context,
      timestamp: this.timestamp,
      originalError: this.originalError?.message || null
    };
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

/**
 * Creates an error with contract context from response
 */
export const createContractError = (contractErrorCode, message, context = {}) => {
  return new AppError(
    contractErrorCode, 
    null, 
    { 
      ...context, 
      source: 'contract' 
    }
  );
};

/**
 * Parses contract error responses and converts to AppError
 */
export const parseContractErrorResponse = (response) => {
  if (!response) return new AppError('UNKNOWN_ERROR');
  
  // Handle error code as number
  if (typeof response === 'number') {
    return createContractError(response, 'Contract error occurred');
  }
  
  // Handle structured response object
  if (response.errorCode !== undefined) {
    return createContractError(
      response.errorCode,
      response.message || 'Contract error',
      response.context || {}
    );
  }
  
  // Handle error object
  if (response.error) {
    return createContractError(
      response.error,
      response.message || 'Contract call failed',
      { errorDetails: response }
    );
  }
  
  return new AppError('UNKNOWN_ERROR', response);
};

export const isRetryableError = (error) => {
  if (!(error instanceof AppError)) return false;
  
  const retryableCodes = [429, 503, 1003];
  return retryableCodes.includes(error.httpStatus);
};

export const getErrorRecoveryStrategy = (error) => {
  if (!(error instanceof AppError)) return 'LOG_AND_NOTIFY';
  
  switch (error.httpStatus) {
    case 429:
      return 'RETRY_WITH_BACKOFF';
    case 503:
      return 'RETRY_WITH_EXPONENTIAL_BACKOFF';
    case 401:
    case 403:
      return 'REDIRECT_TO_LOGIN';
    case 404:
      return 'RESOURCE_NOT_FOUND';
    case 400:
    case 422:
      return 'VALIDATE_INPUT';
    default:
      return 'LOG_AND_NOTIFY';
  }
};

export const withRetry = async (fn, options = {}) => {
  const {
    maxRetries = 3,
    delayMs = 1000,
    backoffMultiplier = 2,
    onRetry = null
  } = options;
  
  let lastError;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      if (attempt < maxRetries && isRetryableError(error)) {
        const delay = delayMs * Math.pow(backoffMultiplier, attempt);
        if (onRetry) {
          onRetry(attempt + 1, error, delay);
        }
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        throw error;
      }
    }
  }
  
  throw lastError;
};

export const getErrorSeverity = (error) => {
  if (!(error instanceof AppError)) return 'UNKNOWN';
  
  if (error.httpStatus >= 500) return 'CRITICAL';
  if (error.httpStatus >= 400) return 'WARNING';
  return 'INFO';
};

export default {
  ErrorCodes,
  ContractErrorCodes,
  AppError,
  StructuredErrorResponse,
  handleError,
  withErrorHandling,
  logError,
  mapContractError,
  createContractError,
  parseContractErrorResponse,
  isRetryableError,
  getErrorRecoveryStrategy,
  withRetry,
  getErrorSeverity
};
