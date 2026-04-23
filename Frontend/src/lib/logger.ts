/**
 * Frontend Logger
 * A structured logging utility for client-side applications
 */

// Define log levels with types
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogOptions {
  context?: string;
  data?: any;
  timestamp?: boolean;
}

interface LogEntry {
  level: LogLevel;
  message: string;
  context?: string;
  data?: any;
  timestamp: string;
}

// Define colors for different log levels
const LOG_COLORS = {
  debug: '#7986CB', // Light blue
  info: '#4CAF50',  // Green
  warn: '#FF9800',  // Orange
  error: '#E53935', // Red
};

// Environment configuration
const isDevelopment = import.meta.env.DEV;
const isProduction = import.meta.env.PROD;
const minLevel: LogLevel = isProduction ? 'warn' : 'debug';

// Store logs for retrieval if needed
const logHistory: LogEntry[] = [];
const MAX_HISTORY = 1000;

/**
 * Main logger function to handle all types of logs
 */
const log = (level: LogLevel, message: string, options: LogOptions = {}) => {
  // Skip logs below minimum level in production
  if (isProduction && !shouldLog(level)) {
    return;
  }

  const { context, data, timestamp = true } = options;
  const now = timestamp ? new Date().toISOString() : '';

  // Create log entry
  const logEntry: LogEntry = {
    level,
    message,
    timestamp: now,
  };

  if (context) logEntry.context = context;
  if (data) logEntry.data = data;

  // Add to history (limiting size)
  logHistory.push(logEntry);
  if (logHistory.length > MAX_HISTORY) {
    logHistory.shift();
  }

  // Format for console
  const formattedMessage = formatMessage(logEntry);

  // Output to console with appropriate styling
  switch (level) {
    case 'debug':
      console.debug(...formattedMessage);
      break;
    case 'info':
      console.info(...formattedMessage);
      break;
    case 'warn':
      console.warn(...formattedMessage);
      break;
    case 'error':
      console.error(...formattedMessage);
      break;
  }

  // In development, we could also send to a logging service
  if (isProduction) {
    // Example: Send critical errors to a backend service
    if (level === 'error') {
      sendToErrorService(logEntry);
    }
  }
};

/**
 * Format the log message for console output
 */
const formatMessage = (entry: LogEntry): any[] => {
  const { level, message, context, data, timestamp } = entry;
  
  const parts = [];
  const contextStr = context ? `[${context}]` : '';
  const timeStr = timestamp ? `${timestamp.split('T')[1].split('.')[0]}` : '';
  
  // Create styled message for console
  const coloredLabel = `%c${level.toUpperCase()}${contextStr ? ' ' + contextStr : ''}:`;
  parts.push(coloredLabel);
  parts.push(`font-weight: bold; color: ${LOG_COLORS[level]};`);
  
  // Add timestamp if needed
  if (timestamp) {
    parts.push(`${timeStr} -`);
  }
  
  // Add the message
  parts.push(message);
  
  // Add data if present
  if (data) {
    parts.push(data);
  }
  
  return parts;
};

/**
 * Determine if a log should be processed based on minimum level
 */
const shouldLog = (level: LogLevel): boolean => {
  const levels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
  const minLevelIndex = levels.indexOf(minLevel);
  const currentLevelIndex = levels.indexOf(level);
  
  return currentLevelIndex >= minLevelIndex;
};

/**
 * Send critical errors to an error service (placeholder)
 */
const sendToErrorService = (entry: LogEntry): void => {
  // This would be implemented to send errors to a service like Sentry
  // Example implementation:
  /*
  fetch('/api/log', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(entry)
  }).catch(err => console.error('Failed to send log to server:', err));
  */
};

// Public API
const logger = {
  debug: (message: string, options?: LogOptions) => log('debug', message, options),
  info: (message: string, options?: LogOptions) => log('info', message, options),
  warn: (message: string, options?: LogOptions) => log('warn', message, options),
  error: (message: string, options?: LogOptions) => log('error', message, options),
  
  // Get log history (useful for debugging or displaying logs in app)
  getHistory: (level?: LogLevel): LogEntry[] => {
    if (level) {
      return logHistory.filter(entry => entry.level === level);
    }
    return [...logHistory];
  },
  
  // Clear log history
  clearHistory: (): void => {
    logHistory.length = 0;
  }
};

export default logger; 