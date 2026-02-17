/**
 * Production-safe logger utility
 * Only logs in development mode, prevents console spam in production
 * 
 * Usage:
 *   import { logger } from './utils/logger';
 *   logger.log('Debug info'); // Only in development
 *   logger.error('Error!'); // Always logged
 */

const isDevelopment = import.meta.env.MODE === 'development';
const isTest = import.meta.env.MODE === 'test';

// Log levels
const LogLevel = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
  NONE: 4,
};

// Configure minimum log level (can be set via env var)
const MIN_LOG_LEVEL = import.meta.env.VITE_LOG_LEVEL || 
  (isDevelopment ? LogLevel.DEBUG : LogLevel.ERROR);

class Logger {
  constructor() {
    this.context = '';
  }

  /**
   * Create a logger with context (e.g., component name)
   * @param {string} context - Context identifier
   */
  createContext(context) {
    const contextLogger = new Logger();
    contextLogger.context = context;
    return contextLogger;
  }

  /**
   * Format log message with timestamp and context
   */
  formatMessage(level, ...args) {
    const timestamp = new Date().toISOString();
    const context = this.context ? `[${this.context}]` : '';
    return [`[${timestamp}]`, context, ...args].filter(Boolean);
  }

  /**
   * Debug level logging - only in development
   */
  debug(...args) {
    if (isDevelopment && MIN_LOG_LEVEL <= LogLevel.DEBUG) {
      console.debug(...this.formatMessage('DEBUG', ...args));
    }
  }

  /**
   * Info level logging - development only by default
   */
  log(...args) {
    if (isDevelopment && MIN_LOG_LEVEL <= LogLevel.INFO) {
      console.log(...this.formatMessage('INFO', ...args));
    }
  }

  /**
   * Alias for log()
   */
  info(...args) {
    this.log(...args);
  }

  /**
   * Warning level - logs in development, can be enabled in production
   */
  warn(...args) {
    if (MIN_LOG_LEVEL <= LogLevel.WARN) {
      console.warn(...this.formatMessage('WARN', ...args));
    }
  }

  /**
   * Error level - ALWAYS logged, even in production
   */
  error(...args) {
    if (MIN_LOG_LEVEL <= LogLevel.ERROR) {
      console.error(...this.formatMessage('ERROR', ...args));
      
      // In production, send to error tracking service
      if (!isDevelopment && !isTest) {
        this.sendToErrorTracking(args);
      }
    }
  }

  /**
   * Log API requests (development only)
   */
  api(method, url, data = null) {
    if (isDevelopment) {
      console.group(`🌐 API ${method.toUpperCase()} ${url}`);
      if (data) {
        console.log('Data:', data);
      }
      console.groupEnd();
    }
  }

  /**
   * Log API responses (development only)
   */
  apiResponse(url, status, data = null) {
    if (isDevelopment) {
      const emoji = status < 300 ? '✅' : status < 500 ? '⚠️' : '❌';
      console.group(`${emoji} Response ${status} from ${url}`);
      if (data) {
        console.log('Data:', data);
      }
      console.groupEnd();
    }
  }

  /**
   * Log performance metrics
   */
  performance(label, duration) {
    if (isDevelopment) {
      console.log(`⚡ ${label}: ${duration.toFixed(2)}ms`);
    }
  }

  /**
   * Group related logs
   */
  group(label, collapsed = false) {
    if (isDevelopment) {
      if (collapsed) {
        console.groupCollapsed(label);
      } else {
        console.group(label);
      }
    }
  }

  /**
   * End log group
   */
  groupEnd() {
    if (isDevelopment) {
      console.groupEnd();
    }
  }

  /**
   * Table output for structured data
   */
  table(data) {
    if (isDevelopment) {
      console.table(data);
    }
  }

  /**
   * Send errors to tracking service (Sentry, etc.)
   * TODO: Implement actual error tracking integration
   */
  sendToErrorTracking(errorData) {
    // Placeholder for error tracking service integration
    // Example: Sentry.captureException(errorData);
    console.error('Error tracking not yet configured:', errorData);
  }

  /**
   * Assert condition - throws in development, logs in production
   */
  assert(condition, message) {
    if (!condition) {
      if (isDevelopment) {
        throw new Error(`Assertion failed: ${message}`);
      } else {
        this.error(`Assertion failed: ${message}`);
      }
    }
  }
}

// Create and export default logger instance
export const logger = new Logger();

// Export LogLevel for external configuration
export { LogLevel };

// Export Logger class for creating contextual loggers
export default logger;

/**
 * Example usage:
 * 
 * // Basic logging
 * import { logger } from '@/utils/logger';
 * 
 * logger.debug('Detailed debug info');
 * logger.log('General information');
 * logger.warn('Warning message');
 * logger.error('Error message');
 * 
 * // Contextual logging
 * const authLogger = logger.createContext('AuthService');
 * authLogger.log('User logged in');
 * 
 * // API logging
 * logger.api('POST', '/api/medicines', { name: 'Aspirin' });
 * logger.apiResponse('/api/medicines', 201, { id: 1 });
 * 
 * // Performance tracking
 * const start = performance.now();
 * // ... do work ...
 * logger.performance('Task completion', performance.now() - start);
 * 
 * // Grouped logs
 * logger.group('User Registration Flow');
 * logger.log('Step 1: Validate input');
 * logger.log('Step 2: Create user');
 * logger.groupEnd();
 */
