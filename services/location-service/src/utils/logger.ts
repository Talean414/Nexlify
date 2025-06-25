import winston from 'winston';
import path from 'path';

// Define log format combining timestamp, level, and message
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const metaString = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
    return `[${timestamp}] ${level.toUpperCase()}: ${message} ${metaString}`;
  })
);

// Create logger with console and file transports
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info', // Configurable via environment variable
  format: logFormat,
  transports: [
    // Console transport for development
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(), // Colorize output for readability
        logFormat
      ),
    }),
    // File transport for production debugging
    new winston.transports.File({
      filename: path.join(__dirname, '../../logs/location-service.log'),
      maxsize: 5 * 1024 * 1024, // 5MB max file size
      maxFiles: 5, // Keep up to 5 rotated log files
    }),
  ],
});

// Export logger for use in other modules
export { logger };