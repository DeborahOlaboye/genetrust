import AppError from './AppError';

/**
 * Standard error codes for the application
 */
export const ErrorCode = {
  // General errors (1000-1999)
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  BAD_REQUEST: 'BAD_REQUEST',
  TIMEOUT: 'TIMEOUT',
  NETWORK_ERROR: 'NETWORK_ERROR',
  
  // Authentication errors (2000-2999)
  INVALID_CREDENTIALS: 'AUTH_INVALID_CREDENTIALS',
  TOKEN_EXPIRED: 'AUTH_TOKEN_EXPIRED',
  TOKEN_INVALID: 'AUTH_TOKEN_INVALID',
  SESSION_EXPIRED: 'AUTH_SESSION_EXPIRED',
  
  // API errors (3000-3999)
  API_ERROR: 'API_ERROR',
  API_VALIDATION_ERROR: 'API_VALIDATION_ERROR',
  API_RATE_LIMIT_EXCEEDED: 'API_RATE_LIMIT_EXCEEDED',
  
  // Resource errors (4000-4999)
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
  RESOURCE_EXISTS: 'RESOURCE_EXISTS',
  RESOURCE_LIMIT_REACHED: 'RESOURCE_LIMIT_REACHED',
  
  // Payment errors (5000-5999)
  PAYMENT_ERROR: 'PAYMENT_ERROR',
  PAYMENT_DECLINED: 'PAYMENT_DECLINED',
  INVOICE_NOT_PAID: 'INVOICE_NOT_PAID',
  
  // Wallet errors (6000-6999)
  WALLET_CONNECTION_FAILED: 'WALLET_CONNECTION_FAILED',
  INSUFFICIENT_FUNDS: 'INSUFFICIENT_FUNDS',
  TRANSACTION_FAILED: 'TRANSACTION_FAILED',
  
  // UI errors (7000-7999)
  UI_ERROR: 'UI_ERROR',
  COMPONENT_ERROR: 'COMPONENT_ERROR',
  
  // External service errors (8000-8999)
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',
  
  // Feature not available (9000-9999)
  FEATURE_NOT_AVAILABLE: 'FEATURE_NOT_AVAILABLE',
} as const;

export type ErrorCodeType = typeof ErrorCode[keyof typeof ErrorCode];

/**
 * Creates a standard error response object
 */
export function createErrorResponse(
  error: unknown,
  context: Record<string, unknown> = {}
): { error: AppError; status: number } {
  // If it's already an AppError, return it
  if (error instanceof AppError) {
    return {
      error,
      status: error.statusCode || 500,
    };
  }
  
  // Handle standard Error objects
  if (error instanceof Error) {
    const appError = new AppError(error.message, {
      code: ErrorCode.UNKNOWN_ERROR,
      cause: error,
      ...context,
    });
    
    return {
      error: appError,
      status: 500,
    };
  }
  
  // Handle string errors
  if (typeof error === 'string') {
    return {
      error: new AppError(error, {
        code: ErrorCode.UNKNOWN_ERROR,
        ...context,
      }),
      status: 500,
    };
  }
  
  // Handle other unknown error types
  return {
    error: new AppError('An unknown error occurred', {
      code: ErrorCode.UNKNOWN_ERROR,
      details: { originalError: error },
      ...context,
    }),
    status: 500,
  };
}

/**
 * Creates a standardized error handler function
 */
export function createErrorHandler(options: {
  defaultMessage?: string;
  defaultCode?: ErrorCodeType;
  defaultStatus?: number;
  logErrors?: boolean;
  context?: Record<string, unknown>;
} = {}) {
  return (error: unknown, overrideOptions: Partial<typeof options> = {}) => {
    const {
      defaultMessage = 'An error occurred',
      defaultCode = ErrorCode.UNKNOWN_ERROR,
      defaultStatus = 500,
      logErrors = process.env.NODE_ENV === 'development',
      context = {},
    } = { ...options, ...overrideOptions };
    
    const { error: appError, status } = createErrorResponse(error, {
      ...context,
      ...(overrideOptions.context || {}),
    });
    
    // Ensure the error has the default code and message if not set
    if (!appError.code || appError.code === ErrorCode.UNKNOWN_ERROR) {
      appError.code = defaultCode;
    }
    
    if (!appError.message || appError.message === 'An unknown error occurred') {
      appError.message = defaultMessage;
    }
    
    // Log the error if enabled
    if (logErrors) {
      console.error('Error handled:', {
        message: appError.message,
        code: appError.code,
        status,
        details: appError.details,
        stack: appError.stack,
      });
    }
    
    return {
      error: appError,
      status,
      isHandled: true,
    };
  };
}

/**
 * Helper to create a function that throws a specific type of error
 */
export function createErrorThrower(
  defaultCode: ErrorCodeType,
  defaultMessage: string,
  defaultStatus = 400
) {
  return (
    message = defaultMessage,
    options: {
      code?: ErrorCodeType;
      status?: number;
      details?: Record<string, unknown>;
    } = {}
  ) => {
    throw new AppError(message, {
      code: options.code || defaultCode,
      statusCode: options.status || defaultStatus,
      details: options.details,
    });
  };
}

// Common error throwers
export const throwValidationError = createErrorThrower(
  ErrorCode.VALIDATION_ERROR,
  'Validation failed',
  400
);

export const throwUnauthorizedError = createErrorThrower(
  ErrorCode.UNAUTHORIZED,
  'Authentication required',
  401
);

export const throwForbiddenError = createErrorThrower(
  ErrorCode.FORBIDDEN,
  'You do not have permission to perform this action',
  403
);

export const throwNotFoundError = createErrorThrower(
  ErrorCode.NOT_FOUND,
  'The requested resource was not found',
  404
);

/**
 * Asserts that a condition is true, otherwise throws an error
 */
export function assert(
  condition: unknown,
  message: string,
  options: {
    code?: ErrorCodeType;
    status?: number;
    details?: Record<string, unknown>;
  } = {}
): asserts condition {
  if (!condition) {
    throw new AppError(message, {
      code: options.code || ErrorCode.VALIDATION_ERROR,
      statusCode: options.status || 400,
      details: options.details,
    });
  }
}

/**
 * Asserts that a value is defined, otherwise throws an error
 */
export function assertDefined<T>(
  value: T | undefined | null,
  message = 'Value is required',
  options: {
    code?: ErrorCodeType;
    status?: number;
    details?: Record<string, unknown>;
  } = {}
): asserts value is T {
  if (value === undefined || value === null) {
    throw new AppError(message, {
      code: options.code || ErrorCode.VALIDATION_ERROR,
      statusCode: options.status || 400,
      details: options.details,
    });
  }
}
