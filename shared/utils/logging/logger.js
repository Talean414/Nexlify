"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
const winston_1 = __importDefault(require("winston"));
const path_1 = __importDefault(require("path"));
// Define log format with correlation ID
const logFormat = winston_1.default.format.combine(winston_1.default.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }), winston_1.default.format.printf(({ timestamp, level, message, correlationId, ...meta }) => {
    const metaString = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : "";
    return `[${timestamp}] ${level.toUpperCase()} [${correlationId || "unknown"}]: ${message} ${metaString}`;
}));
// Create logger with console and file transports
const logger = winston_1.default.createLogger({
    level: process.env.LOG_LEVEL || "info",
    format: logFormat,
    transports: [
        // Console transport for development
        new winston_1.default.transports.Console({
            format: winston_1.default.format.combine(winston_1.default.format.colorize(), logFormat)
        }),
        // Combined log file
        new winston_1.default.transports.File({
            filename: path_1.default.join(__dirname, "../../logs/order-service.log"),
            maxsize: 5 * 1024 * 1024, // 5MB max file size
            maxFiles: 5, // Keep 5 rotated log files
            tailable: true,
            zippedArchive: true // Compress rotated logs
        }),
        // Error-only log file
        new winston_1.default.transports.File({
            filename: path_1.default.join(__dirname, "../../logs/order-service-error.log"),
            level: "error",
            maxsize: 5 * 1024 * 1024,
            maxFiles: 5,
            tailable: true,
            zippedArchive: true
        })
    ]
});
exports.logger = logger;
