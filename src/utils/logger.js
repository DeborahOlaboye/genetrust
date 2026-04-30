/**
 * Winston-based logging utility for GeneTrust platform
 * 
 * Provides structured logging with multiple levels, file rotation,
 * and environment-specific configuration. Supports both development
 * and production logging scenarios with appropriate formatting.
 * 
 * @fileoverview Logging utility with Winston and daily rotation
 * @version 2.0.0
 * @since 1.0.0
 * @author GeneTrust Development Team
 * 
 * @example
 * // Basic logging
 * import { logger } from './logger.js';
 * logger.info('Application started');
 * logger.error('Error occurred', { error: err });
 * 
 * @example
 * // Contextual logging
 * logger.debug('Processing request', { requestId, userId });
 * logger.warn('Rate limit approaching', { currentRate, limit });
 */

import winston from 'winston';
import 'winston-daily-rotate-file';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the current directory in ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Winston log levels configuration
 * Defines priority levels for log messages
 * @readonly
 * @type {Object}
 * @property {number} error - Error level (0)
 * @property {number} warn - Warning level (1)
 * @property {number} info - Info level (2)
 * @property {number} http - HTTP level (3)
 * @property {number} debug - Debug level (4)
 */
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

/**
 * Console color configuration for log levels
 * Maps log levels to terminal colors for better readability
 * @readonly
 * @type {Object}
 * @property {string} error - Red color for errors
 * @property {string} warn - Yellow color for warnings
 * @property {string} info - Green color for info messages
 * @property {string} http - Magenta color for HTTP logs
 * @property {string} debug - Blue color for debug messages
 */
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'blue',
};

// Add colors to winston
winston.addColors(colors);

/**
 * Winston log format configuration
 * Combines timestamp, colorization, and custom formatting
 * for consistent log output across all transports
 * 
 * @type {winston.Logform.Format}
 */
const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info) => `${info.timestamp} ${info.level}: ${info.message}`,
  ),
);

/**
 * Winston transport configuration
 * Defines where log messages are written (console and files)
 * Includes daily rotation for file logs with size limits
 * 
 * @type {winston.transport[]}
 */
const transports = [
  // Console transport
  new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple(),
    ),
  }),
  // Daily rotate file transport for all logs
  new winston.transports.DailyRotateFile({
    filename: path.join(__dirname, '../../logs/application-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    zippedArchive: true,
    maxSize: '20m',
    maxFiles: '14d',
    format: winston.format.combine(
      winston.format.uncolorize(),
      winston.format.json()
    ),
  }),
  // Error logs
  new winston.transports.File({
    filename: path.join(__dirname, '../../logs/error.log'),
    level: 'error',
    format: winston.format.combine(
      winston.format.uncolorize(),
      winston.format.json()
    ),
  }),
];

// Create the logger
const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  levels,
  format,
  transports,
  exitOnError: false, // Don't exit on handled exceptions
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error(`Uncaught Exception: ${error.message}`, { error });
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error(`Unhandled Rejection at: ${promise}, reason: ${reason}`);
  process.exit(1);
});

// Stream for morgan (HTTP request logging)
logger.stream = {
  write: (message) => {
    logger.http(message.trim());
  },
};

export default logger;
