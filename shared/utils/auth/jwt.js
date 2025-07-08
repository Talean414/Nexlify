"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.signAccessToken = signAccessToken;
exports.signRefreshToken = signRefreshToken;
exports.verifyAccessToken = verifyAccessToken;
exports.verifyRefreshToken = verifyRefreshToken;
exports.getUserFromRequest = getUserFromRequest;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const logger_1 = require("../logging/logger");
function signAccessToken(payload) {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        const error = new Error("JWT_SECRET not set in environment");
        logger_1.logger.error({
            context: "jwt.signAccessToken",
            error: error.message,
            errorCode: "CONFIG_ERROR",
            details: "Ensure JWT_SECRET is set in the service's .env file"
        });
        throw error;
    }
    return jsonwebtoken_1.default.sign(payload, secret, { expiresIn: "30m" });
}
function signRefreshToken(payload) {
    const secret = process.env.REFRESH_TOKEN_SECRET;
    if (!secret) {
        const error = new Error("REFRESH_TOKEN_SECRET not set in environment");
        logger_1.logger.error({
            context: "jwt.signRefreshToken",
            error: error.message,
            errorCode: "CONFIG_ERROR",
            details: "Ensure REFRESH_TOKEN_SECRET is set in the service's .env file"
        });
        throw error;
    }
    return jsonwebtoken_1.default.sign(payload, secret, { expiresIn: "7d" });
}
function verifyAccessToken(token) {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        const error = new Error("JWT_SECRET not set in environment");
        logger_1.logger.error({
            context: "jwt.verifyAccessToken",
            error: error.message,
            errorCode: "CONFIG_ERROR",
            details: "Ensure JWT_SECRET is set in the service's .env file"
        });
        throw error;
    }
    try {
        return jsonwebtoken_1.default.verify(token, secret);
    }
    catch (err) {
        logger_1.logger.error({
            context: "jwt.verifyAccessToken",
            error: err.message,
            errorCode: "TOKEN_VERIFICATION_FAILED",
            details: `Token: ${token.substring(0, 10)}...`
        });
        throw new Error("Invalid or expired token");
    }
}
function verifyRefreshToken(token) {
    const secret = process.env.REFRESH_TOKEN_SECRET;
    if (!secret) {
        const error = new Error("REFRESH_TOKEN_SECRET not set in environment");
        logger_1.logger.error({
            context: "jwt.verifyRefreshToken",
            error: error.message,
            errorCode: "CONFIG_ERROR",
            details: "Ensure REFRESH_TOKEN_SECRET is set in the service's .env file"
        });
        throw error;
    }
    try {
        return jsonwebtoken_1.default.verify(token, secret);
    }
    catch (err) {
        logger_1.logger.error({
            context: "jwt.verifyRefreshToken",
            error: err.message,
            errorCode: "TOKEN_VERIFICATION_FAILED",
            details: `Token: ${token.substring(0, 10)}...`
        });
        throw new Error("Invalid or expired refresh token");
    }
}
function getUserFromRequest(req) {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.split(" ")[1] : null;
    if (!token) {
        logger_1.logger.debug({
            context: "jwt.getUserFromRequest",
            message: "No token provided in Authorization header"
        });
        return null;
    }
    try {
        return verifyAccessToken(token);
    }
    catch (err) {
        logger_1.logger.error({
            context: "jwt.getUserFromRequest",
            error: err.message,
            errorCode: "TOKEN_VERIFICATION_FAILED",
            details: `Token: ${token.substring(0, 10)}...`
        });
        return null;
    }
}
