/**
 * @class AppError
 * @extends Error
 * @description Custom error class for application-specific errors
 */
class AppError extends Error {
  /**
   * Create an application error
   * @param {string} message - Error message
   * @param {Object} options - Additional error options
   * @param {string} options.code - Application-specific error code
   * @param {number} options.statusCode - HTTP status code
   * @param {string} options.name - Error name
   * @param {any} options.details - Additional error details
   * @param {boolean} options.isOperational - Whether the error is operational
   * @param {Error} options.cause - The original error that caused this error
   */
  constructor(message, {
    code = 'APP_ERROR',
    statusCode = 500,
    name = 'AppError',
    details = null,
    isOperational = true,
    cause = null,
  } = {}) {
    super(message);
    
    // Ensure the name of this error is the same as the class name
    this.name = name;
    
    // Custom properties
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = isOperational;
    this.timestamp = new Date().toISOString();
    
    // Capture stack trace, excluding constructor call from it
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
    
    // Preserve the original error
    if (cause) {
      this.cause = cause;
      this.stack = `${this.stack}\nCaused by: ${cause.stack || cause.message || cause}`;
    }
  }
  
  /**
   * Create a new AppError from an existing error
   * @param {Error} error - The original error
   * @param {Object} options - Additional options
   * @returns {AppError} A new AppError instance
   */
  static fromError(error, options = {}) {
    if (error instanceof AppError) {
      return error;
    }
    
    return new AppError(
      options.message || error.message || 'An unknown error occurred',
      {
        ...options,
        cause: error,
        name: error.name || 'Error',
        code: options.code || 'UNKNOWN_ERROR',
      }
    );
  }
  
  /**
   * Convert the error to a plain object for serialization
   * @returns {Object} A plain object representation of the error
   */
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      details: this.details,
      timestamp: this.timestamp,
      isOperational: this.isOperational,
    };
  }
  
  /**
   * Create a new error with additional context
   * @param {Object} context - Additional context to add to the error
   * @returns {AppError} A new AppError instance with the added context
   */
  withContext(context) {
    return new AppError(this.message, {
      code: this.code,
      statusCode: this.statusCode,
      name: this.name,
      details: { ...this.details, ...context },
      isOperational: this.isOperational,
      cause: this.cause || this,
    });
  }
}

export default AppError;
