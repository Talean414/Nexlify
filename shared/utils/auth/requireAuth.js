"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAuth = requireAuth;
exports.requireRole = requireRole;
const jwt_1 = require("./jwt");
const logger_1 = require("../logging/logger");
const uuid_1 = require("uuid");
class AuthError extends Error {
    constructor(status, error, errorCode, details) {
        super(error);
        this.status = status;
        this.error = error;
        this.errorCode = errorCode;
        this.details = details;
    }
}
/**
 * Middleware to require authentication
 * @param req - Express request
 * @param res - Express response
 * @param next - Next function
 */
function requireAuth(req, res, next) {
    const authHeader = req.headers["authorization"];
    const correlationId = req.correlationId || "unknown";
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        const error = new AuthError(401, "Authorization token missing or malformed", "INVALID_TOKEN");
        logger_1.logger.error({
            context: "requireAuth",
            error: error.error,
            errorCode: error.errorCode,
            correlationId
        });
        return res.status(error.status).json({
            success: false,
            error: error.error,
            errorCode: error.errorCode,
            details: process.env.NODE_ENV === "development" ? error.details : undefined
        });
    }
    const token = authHeader.split(" ")[1];
    try {
        const decoded = (0, jwt_1.verifyAccessToken)(token);
        if (!(0, uuid_1.validate)(decoded.userId)) {
            throw new AuthError(401, "Invalid user ID in token", "INVALID_USER_ID");
        }
        req.user = {
            userId: decoded.userId,
            email: decoded.email,
            role: decoded.role
        };
        logger_1.logger.debug({
            context: "requireAuth",
            message: "User authenticated",
            userId: decoded.userId,
            role: decoded.role,
            correlationId
        });
        next();
    }
    catch (err) {
        const error = err instanceof AuthError ? err : new AuthError(401, "Invalid or expired token", "AUTH_FAILED", err.message);
        logger_1.logger.error({
            context: "requireAuth",
            error: error.error,
            errorCode: error.errorCode,
            details: error.details,
            correlationId
        });
        return res.status(error.status).json({
            success: false,
            error: error.error,
            errorCode: error.errorCode,
            details: process.env.NODE_ENV === "development" ? error.details : undefined
        });
    }
}
/**
 * Middleware to restrict access to specific roles
 * @param roles - Allowed roles
 * @returns Middleware function
 */
function requireRole(roles) {
    return (req, res, next) => {
        const correlationId = req.correlationId || "unknown";
        try {
            const role = req.user?.role;
            if (!role || !roles.includes(role)) {
                throw new AuthError(403, `Forbidden: Requires one of roles ${roles.join(", ")}`, "FORBIDDEN");
            }
            logger_1.logger.debug({
                context: "requireRole",
                message: "Role authorized",
                userId: req.user?.userId,
                role,
                correlationId
            });
            next();
        }
        catch (err) {
            const error = err instanceof AuthError ? err : new AuthError(403, "Forbidden", "FORBIDDEN", err.message);
            logger_1.logger.error({
                context: "requireRole",
                error: error.error,
                errorCode: error.errorCode,
                details: error.details,
                userId: req.user?.userId,
                role: req.user?.role,
                correlationId
            });
            return res.status(error.status).json({
                success: false,
                error: error.error,
                errorCode: error.errorCode,
                details: process.env.NODE_ENV === "development" ? error.details : undefined
            });
        }
    };
}
