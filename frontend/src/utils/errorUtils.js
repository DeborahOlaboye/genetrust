/**
 * Error codes for different types of errors in the application
 * Each error code follows the format: APP_[CATEGORY]_[SPECIFIC_ERROR]
 */
export const ERROR_CODES = {
  // Authentication errors (1000-1999)
  AUTH_UNAUTHORIZED: 1001,
  AUTH_SESSION_EXPIRED: 1002,
  AUTH_PERMISSION_DENIED: 1003,
  AUTH_INVALID_CREDENTIALS: 1004,
  AUTH_ACCOUNT_LOCKED: 1005,
  
  // Validation errors (2000-2999)
  VALIDATION_INVALID_INPUT: 2001,
  VALIDATION_REQUIRED_FIELD: 2002,
  VALIDATION_INVALID_EMAIL: 2003,
  VALIDATION_PASSWORD_TOO_WEAK: 2004,
  VALIDATION_INVALID_FORMAT: 2005,
  
  // Network/API errors (3000-3999)
  NETWORK_OFFLINE: 3001,
  NETWORK_TIMEOUT: 3002,
  API_BAD_REQUEST: 3003,
  API_UNAUTHORIZED: 3004,
  API_FORBIDDEN: 3005,
  API_NOT_FOUND: 3006,
  API_SERVER_ERROR: 3007,
  API_SERVICE_UNAVAILABLE: 3008,
  
  // Wallet/Blockchain errors (4000-4999)
  WALLET_NOT_CONNECTED: 4001,
  WALLET_TRANSACTION_REJECTED: 4002,
  WALLET_INSUFFICIENT_BALANCE: 4003,
  WALLET_TRANSACTION_FAILED: 4004,
  WALLET_NETWORK_MISMATCH: 4005,
  
  // Resource errors (5000-5999)
  RESOURCE_NOT_FOUND: 5001,
  RESOURCE_ALREADY_EXISTS: 5002,
  RESOURCE_LIMIT_REACHED: 5003,
  
  // System/Unknown errors (9000-9999)
  UNKNOWN_ERROR: 9001,
  NOT_IMPLEMENTED: 9002,
  MAINTENANCE_MODE: 9003,
};

/**
 * Error categories for grouping related errors
 */
export const ERROR_CATEGORIES = {
  AUTH: 'authentication',
  VALIDATION: 'validation',
  NETWORK: 'network',
  WALLET: 'wallet',
  RESOURCE: 'resource',
  SYSTEM: 'system',
};

/**
 * User-friendly error messages
 */
const ERROR_MESSAGES = {
  // Authentication errors
  [ERROR_CODES.AUTH_UNAUTHORIZED]: {
    title: 'Not Authorized',
    message: 'You need to be logged in to access this resource.',
    recovery: 'Please sign in and try again.',
  },
  [ERROR_CODES.AUTH_SESSION_EXPIRED]: {
    title: 'Session Expired',
    message: 'Your session has expired due to inactivity.',
    recovery: 'Please sign in again to continue.',
  },
  [ERROR_CODES.AUTH_PERMISSION_DENIED]: {
    title: 'Permission Denied',
    message: 'You do not have permission to perform this action.',
    recovery: 'Contact your administrator if you believe this is an error.',
  },
  [ERROR_CODES.AUTH_INVALID_CREDENTIALS]: {
    title: 'Invalid Credentials',
    message: 'The email or password you entered is incorrect.',
    recovery: 'Please check your credentials and try again.',
  },
  [ERROR_CODES.AUTH_ACCOUNT_LOCKED]: {
    title: 'Account Locked',
    message: 'Your account has been locked due to too many failed login attempts.',
    recovery: 'Please try again later or contact support.',
  },
  
  // Validation errors
  [ERROR_CODES.VALIDATION_INVALID_INPUT]: {
    title: 'Invalid Input',
    message: 'The provided data is invalid.',
    recovery: 'Please check your input and try again.',
  },
  [ERROR_CODES.VALIDATION_REQUIRED_FIELD]: {
    title: 'Required Field',
    message: 'This field is required.',
    recovery: 'Please fill in all required fields.',
  },
  [ERROR_CODES.VALIDATION_INVALID_EMAIL]: {
    title: 'Invalid Email',
    message: 'Please enter a valid email address.',
    recovery: 'Check the email format and try again.',
  },
  [ERROR_CODES.VALIDATION_PASSWORD_TOO_WEAK]: {
    title: 'Weak Password',
    message: 'Your password does not meet the security requirements.',
    recovery: 'Use at least 8 characters with a mix of letters, numbers, and symbols.',
  },
  
  // Network/API errors
  [ERROR_CODES.NETWORK_OFFLINE]: {
    title: 'Offline',
    message: 'You appear to be offline.',
    recovery: 'Please check your internet connection and try again.',
  },
  [ERROR_CODES.NETWORK_TIMEOUT]: {
    title: 'Request Timeout',
    message: 'The request took too long to complete.',
    recovery: 'Please check your connection and try again.',
  },
  [ERROR_CODES.API_BAD_REQUEST]: {
    title: 'Invalid Request',
    message: 'The server could not process your request.',
    recovery: 'Please check your input and try again.',
  },
  [ERROR_CODES.API_UNAUTHORIZED]: {
    title: 'Unauthorized',
    message: 'You need to be logged in to access this resource.',
    recovery: 'Please sign in and try again.',
  },
  [ERROR_CODES.API_FORBIDDEN]: {
    title: 'Access Denied',
    message: 'You do not have permission to access this resource.',
    recovery: 'Contact your administrator if you believe this is an error.',
  },
  [ERROR_CODES.API_NOT_FOUND]: {
    title: 'Not Found',
    message: 'The requested resource could not be found.',
    recovery: 'The page or resource may have been moved or deleted.',
  },
  [ERROR_CODES.API_SERVER_ERROR]: {
    title: 'Server Error',
    message: 'Something went wrong on our end.',
    recovery: 'Our team has been notified. Please try again later.',
  },
  [ERROR_CODES.API_SERVICE_UNAVAILABLE]: {
    title: 'Service Unavailable',
    message: 'The service is currently unavailable.',
    recovery: 'Please try again in a few minutes.',
  },
  
  // Wallet/Blockchain errors
  [ERROR_CODES.WALLET_NOT_CONNECTED]: {
    title: 'Wallet Not Connected',
    message: 'Please connect your wallet to continue.',
    recovery: 'Click the connect wallet button and select your wallet provider.',
  },
  [ERROR_CODES.WALLET_TRANSACTION_REJECTED]: {
    title: 'Transaction Rejected',
    message: 'You rejected the transaction in your wallet.',
    recovery: 'Please try again and confirm the transaction in your wallet.',
  },
  [ERROR_CODES.WALLET_INSUFFICIENT_BALANCE]: {
    title: 'Insufficient Balance',
    message: 'You do not have enough funds to complete this transaction.',
    recovery: 'Add funds to your wallet or reduce the transaction amount.',
  },
  [ERROR_CODES.WALLET_TRANSACTION_FAILED]: {
    title: 'Transaction Failed',
    message: 'The transaction could not be completed.',
    recovery: 'Please try again or contact support if the problem persists.',
  },
  [ERROR_CODES.WALLET_NETWORK_MISMATCH]: {
    title: 'Wrong Network',
    message: 'Please switch to the correct network in your wallet.',
    recovery: 'Change your wallet network to the required network and try again.',
  },
  
  // Resource errors
  [ERROR_CODES.RESOURCE_NOT_FOUND]: {
    title: 'Not Found',
    message: 'The requested resource could not be found.',
    recovery: 'The item may have been moved or deleted.',
  },
  [ERROR_CODES.RESOURCE_ALREADY_EXISTS]: {
    title: 'Already Exists',
    message: 'A resource with these details already exists.',
    recovery: 'Please use a different identifier or update the existing resource.',
  },
  [ERROR_CODES.RESOURCE_LIMIT_REACHED]: {
    title: 'Limit Reached',
    message: 'You have reached the maximum limit for this resource.',
    recovery: 'Upgrade your plan or contact support for assistance.',
  },
  
  // System/Unknown errors
  [ERROR_CODES.UNKNOWN_ERROR]: {
    title: 'Something Went Wrong',
    message: 'An unexpected error occurred.',
    recovery: 'Please try again or contact support if the problem persists.',
  },
  [ERROR_CODES.NOT_IMPLEMENTED]: {
    title: 'Not Implemented',
    message: 'This feature is not available yet.',
    recovery: 'Please check back later for updates.',
  },
  [ERROR_CODES.MAINTENANCE_MODE]: {
    title: 'Maintenance in Progress',
    message: 'We are performing scheduled maintenance.',
    recovery: 'Please try again later. We apologize for the inconvenience.',
  },
};

/**
 * Custom error class for application errors
 */
export class AppError extends Error {
  /**
   * Create a new AppError
   * @param {string|number} code - Error code or message
   * @param {Object} options - Additional error options
   * @param {string} options.message - Custom error message (overrides default)
   * @param {string} options.recovery - Custom recovery suggestion (overrides default)
   * @param {Object} options.context - Additional context about the error
   * @param {Error} options.cause - Original error that caused this error
   * @param {boolean} options.isUserFriendly - Whether the error is safe to show to users
   */
  constructor(code, {
    message,
    recovery,
    context = {},
    cause = null,
    isUserFriendly = true,
  } = {}) {
    const errorInfo = typeof code === 'number' ? ERROR_MESSAGES[code] : null;
    const defaultMessage = errorInfo?.message || 'An unexpected error occurred.';
    const defaultRecovery = errorInfo?.recovery || 'Please try again or contact support if the problem persists.';
    
    super(message || defaultMessage);
    
    // Ensure the name of this error is the same as the class name
    this.name = this.constructor.name;
    
    // Custom properties
    this.code = code;
    this.recovery = recovery || defaultRecovery;
    this.context = context;
    this.isUserFriendly = isUserFriendly;
    this.timestamp = new Date().toISOString();
    
    // Capture stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
    
    // Preserve the original error
    if (cause) {
      this.cause = cause;
      this.stack += '\nCaused by: ' + cause.stack;
    }
  }
  
  /**
   * Get the error category based on the error code
   * @returns {string} The error category
   */
  get category() {
    if (this.code >= 1000 && this.code < 2000) return ERROR_CATEGORIES.AUTH;
    if (this.code >= 2000 && this.code < 3000) return ERROR_CATEGORIES.VALIDATION;
    if (this.code >= 3000 && this.code < 4000) return ERROR_CATEGORIES.NETWORK;
    if (this.code >= 4000 && this.code < 5000) return ERROR_CATEGORIES.WALLET;
    if (this.code >= 5000 && this.code < 6000) return ERROR_CATEGORIES.RESOURCE;
    return ERROR_CATEGORIES.SYSTEM;
  }
  
  /**
   * Convert the error to a plain object for serialization
   * @returns {Object} Plain object representation of the error
   */
  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      recovery: this.recovery,
      category: this.category,
      timestamp: this.timestamp,
      isUserFriendly: this.isUserFriendly,
      context: this.context,
      ...(this.cause && { cause: this.cause.toString() }),
      stack: this.stack,
    };
  }
  
  /**
   * Create an AppError from an unknown error
   * @param {Error|any} error - The error to normalize
   * @param {Object} options - Additional options
   * @returns {AppError} Normalized AppError
   */
  static fromError(error, options = {}) {
    if (error instanceof AppError) {
      return error;
    }
    
    // Handle common error patterns
    if (error?.response?.status) {
      const status = error.response.status;
      const statusToCode = {
        400: ERROR_CODES.API_BAD_REQUEST,
        401: ERROR_CODES.API_UNAUTHORIZED,
        403: ERROR_CODES.API_FORBIDDEN,
        404: ERROR_CODES.API_NOT_FOUND,
        500: ERROR_CODES.API_SERVER_ERROR,
        503: ERROR_CODES.API_SERVICE_UNAVAILABLE,
      };
      
      const code = statusToCode[status] || ERROR_CODES.UNKNOWN_ERROR;
      return new AppError(code, {
        ...options,
        message: error.response.data?.message || error.message,
        cause: error,
      });
    }
    
    // Handle network errors
    if (error instanceof TypeError && error.message.includes('Network Error')) {
      return new AppError(ERROR_CODES.NETWORK_OFFLINE, {
        ...options,
        cause: error,
      });
    }
    
    // Default to unknown error
    return new AppError(ERROR_CODES.UNKNOWN_ERROR, {
      ...options,
      message: error?.message || 'An unexpected error occurred',
      cause: error,
    });
  }
}

/**
 * Create a validation error with field-specific messages
 * @param {Object} fieldErrors - Object mapping field names to error messages
 * @returns {AppError} Validation error
 */
export function createValidationError(fieldErrors) {
  return new AppError(ERROR_CODES.VALIDATION_INVALID_INPUT, {
    message: 'Validation failed',
    context: { fieldErrors },
  });
}

/**
 * Check if an error is a network error
 * @param {Error} error - The error to check
 * @returns {boolean} True if it's a network error
 */
export function isNetworkError(error) {
  if (!error) return false;
  
  // Check if it's a known network error code
  if (error.code >= 3000 && error.code < 4000) {
    return true;
  }
  
  // Check common network error patterns
  return (
    error instanceof TypeError && 
    (error.message.includes('Network request failed') ||
     error.message.includes('Failed to fetch') ||
     error.message.includes('Network Error'))
  );
}

/**
 * Get a user-friendly error message for display
 * @param {Error} error - The error
 * @param {Object} options - Options
 * @param {boolean} options.includeRecovery - Whether to include recovery text
 * @returns {string} User-friendly error message
 */
export function getUserFriendlyMessage(error, { includeRecovery = true } = {}) {
  if (!error) return 'An unknown error occurred.';
  
  // Use AppError properties if available
  if (error instanceof AppError) {
    return includeRecovery && error.recovery 
      ? `${error.message} ${error.recovery}`
      : error.message;
  }
  
  // Handle common error patterns
  if (isNetworkError(error)) {
    return 'Unable to connect to the server. Please check your internet connection and try again.';
  }
  
  // Default to error message or generic message
  return error.message || 'An unexpected error occurred. Please try again.';
}

/**
 * Error boundary component for React
 * @example
 * <ErrorBoundary fallback={<ErrorFallback />}>
 *   <MyComponent />
 * </ErrorBoundary>
 */
export const ErrorBoundary = ({ children, fallback }) => {
  const [hasError, setHasError] = React.useState(false);
  const [error, setError] = React.useState(null);
  
  React.useEffect(() => {
    const handleGlobalError = (event) => {
      setHasError(true);
      setError(AppError.fromError(event.error || event));
      // Prevent the default error handler
      event.preventDefault();
      return true;
    };
    
    const handleRejection = (event) => {
      setHasError(true);
      setError(AppError.fromError(event.reason || event));
      // Prevent the default error handler
      event.preventDefault();
      return true;
    };
    
    window.addEventListener('error', handleGlobalError);
    window.addEventListener('unhandledrejection', handleRejection);
    
    return () => {
      window.removeEventListener('error', handleGlobalError);
      window.removeEventListener('unhandledrejection', handleRejection);
    };
  }, []);
  
  if (hasError) {
    return typeof fallback === 'function' 
      ? fallback(error) 
      : fallback || <DefaultErrorFallback error={error} />;
  }
  
  return children;
};

/**
 * Default error fallback component
 */
const DefaultErrorFallback = ({ error }) => (
  <div className="error-boundary">
    <h2>Something went wrong</h2>
    <p>{getUserFriendlyMessage(error)}</p>
    <button onClick={() => window.location.reload()}>
      Reload Page
    </button>
    {process.env.NODE_ENV === 'development' && (
      <details style={{ marginTop: '1em', whiteSpace: 'pre-wrap' }}>
        {error?.toString()}
        <br />
        {error?.stack}
      </details>
    )}
  </div>
);

// Export the error codes as a default object for easy importing
export default {
  ...ERROR_CODES,
  categories: ERROR_CATEGORIES,
  AppError,
  createValidationError,
  isNetworkError,
  getUserFriendlyMessage,
  ErrorBoundary,
};
