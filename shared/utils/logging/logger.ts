import winston from "winston";
import path from "path";

// Define log format with correlation ID
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  winston.format.printf(({ timestamp, level, message, correlationId, ...meta }) => {
    const metaString = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : "";
    return `[${timestamp}] ${level.toUpperCase()} [${correlationId || "unknown"}]: ${message} ${metaString}`;
  })
);

// Create logger with console and file transports
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info",
  format: logFormat,
  transports: [
    // Console transport for development
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        logFormat
      )
    }),
    // Combined log file
    new winston.transports.File({
      filename: path.join(__dirname, "../../logs/order-service.log"),
      maxsize: 5 * 1024 * 1024, // 5MB max file size
      maxFiles: 5, // Keep 5 rotated log files
      tailable: true,
      zippedArchive: true // Compress rotated logs
    }),
    // Error-only log file
    new winston.transports.File({
      filename: path.join(__dirname, "../../logs/order-service-error.log"),
      level: "error",
      maxsize: 5 * 1024 * 1024,
      maxFiles: 5,
      tailable: true,
      zippedArchive: true
    })
  ]
});

export { logger };