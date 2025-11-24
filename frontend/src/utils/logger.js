/**
 * Logging utility with different log levels and optional context
 */

// Log levels
const LogLevel = {
  ERROR: 'error',
  WARN: 'warn',
  INFO: 'info',
  DEBUG: 'debug',
  TRACE: 'trace'
};

// Default log level (can be overridden in config)
let currentLogLevel = process.env.NEXT_PUBLIC_LOG_LEVEL || LogLevel.INFO;

/**
 * Set the current log level
 */
const setLogLevel = (level) => {
  if (Object.values(LogLevel).includes(level)) {
    currentLogLevel = level;
  } else {
    console.warn(`Invalid log level: ${level}. Using default: ${currentLogLevel}`);
  }
};

/**
 * Check if a log level should be logged
 */
const shouldLog = (level) => {
  const levels = Object.values(LogLevel);
  const currentLevelIndex = levels.indexOf(currentLogLevel);
  const messageLevelIndex = levels.indexOf(level);
  return messageLevelIndex <= currentLevelIndex;
};

/**
 * Format log message with context
 */
const formatMessage = (message, context = {}) => {
  const timestamp = new Date().toISOString();
  const contextStr = Object.keys(context).length > 0 
    ? `\nContext: ${JSON.stringify(context, null, 2)}` 
    : '';
  return `[${timestamp}] ${message}${contextStr}`;
};

/**
 * Log an error message
 */
const error = (message, error = null, context = {}) => {
  if (!shouldLog(LogLevel.ERROR)) return;
  
  const logContext = { ...context };
  if (error) {
    logContext.error = {
      message: error.message,
      stack: error.stack,
      ...(error.code && { code: error.code })
    };
  }
  
  const formattedMessage = formatMessage(message, logContext);
  console.error(formattedMessage);
  
  // TODO: Send to error tracking service (e.g., Sentry)
  // if (process.env.NODE_ENV === 'production') {
  //   trackError(message, error, context);
  // }
};

/**
 * Log a warning message
 */
const warn = (message, context = {}) => {
  if (!shouldLog(LogLevel.WARN)) return;
  console.warn(formatMessage(message, context));
};

/**
 * Log an info message
 */
const info = (message, context = {}) => {
  if (!shouldLog(LogLevel.INFO)) return;
  console.info(formatMessage(message, context));
};

/**
 * Log a debug message
 */
const debug = (message, context = {}) => {
  if (!shouldLog(LogLevel.DEBUG)) return;
  console.debug(formatMessage(message, context));
};

/**
 * Log a trace message (most verbose)
 */
const trace = (message, context = {}) => {
  if (!shouldLog(LogLevel.TRACE)) return;
  console.trace(formatMessage(message, context));
};

/**
 * Create a scoped logger with a specific context
 */
const createLogger = (defaultContext = {}) => ({
  error: (message, error, context = {}) => 
    error(message, error, { ...defaultContext, ...context }),
  warn: (message, context = {}) => 
    warn(message, { ...defaultContext, ...context }),
  info: (message, context = {}) => 
    info(message, { ...defaultContext, ...context }),
  debug: (message, context = {}) => 
    debug(message, { ...defaultContext, ...context }),
  trace: (message, context = {}) => 
    trace(message, { ...defaultContext, ...context })
});

export {
  LogLevel,
  setLogLevel,
  error,
  warn,
  info,
  debug,
  trace,
  createLogger
};

export default {
  LogLevel,
  setLogLevel,
  error,
  warn,
  info,
  debug,
  trace,
  createLogger
};
