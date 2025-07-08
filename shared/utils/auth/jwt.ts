import jwt from "jsonwebtoken";
import { logger } from "../logging/logger";

export interface JwtPayload {
  userId: string;
  email?: string;
  role?: "customer" | "vendor" | "courier" | "admin";
}

export function signAccessToken(payload: JwtPayload): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    const error = new Error("JWT_SECRET not set in environment");
    logger.error({
      context: "jwt.signAccessToken",
      error: error.message,
      errorCode: "CONFIG_ERROR",
      details: "Ensure JWT_SECRET is set in the service's .env file"
    });
    throw error;
  }
  return jwt.sign(payload, secret, { expiresIn: "30m" });
}

export function signRefreshToken(payload: Pick<JwtPayload, "userId">): string {
  const secret = process.env.REFRESH_TOKEN_SECRET;
  if (!secret) {
    const error = new Error("REFRESH_TOKEN_SECRET not set in environment");
    logger.error({
      context: "jwt.signRefreshToken",
      error: error.message,
      errorCode: "CONFIG_ERROR",
      details: "Ensure REFRESH_TOKEN_SECRET is set in the service's .env file"
    });
    throw error;
  }
  return jwt.sign(payload, secret, { expiresIn: "7d" });
}

export function verifyAccessToken(token: string): JwtPayload {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    const error = new Error("JWT_SECRET not set in environment");
    logger.error({
      context: "jwt.verifyAccessToken",
      error: error.message,
      errorCode: "CONFIG_ERROR",
      details: "Ensure JWT_SECRET is set in the service's .env file"
    });
    throw error;
  }
  try {
    return jwt.verify(token, secret) as JwtPayload;
  } catch (err: any) {
    logger.error({
      context: "jwt.verifyAccessToken",
      error: err.message,
      errorCode: "TOKEN_VERIFICATION_FAILED",
      details: `Token: ${token.substring(0, 10)}...`
    });
    throw new Error("Invalid or expired token");
  }
}

export function verifyRefreshToken(token: string): JwtPayload {
  const secret = process.env.REFRESH_TOKEN_SECRET;
  if (!secret) {
    const error = new Error("REFRESH_TOKEN_SECRET not set in environment");
    logger.error({
      context: "jwt.verifyRefreshToken",
      error: error.message,
      errorCode: "CONFIG_ERROR",
      details: "Ensure REFRESH_TOKEN_SECRET is set in the service's .env file"
    });
    throw error;
  }
  try {
    return jwt.verify(token, secret) as JwtPayload;
  } catch (err: any) {
    logger.error({
      context: "jwt.verifyRefreshToken",
      error: err.message,
      errorCode: "TOKEN_VERIFICATION_FAILED",
      details: `Token: ${token.substring(0, 10)}...`
    });
    throw new Error("Invalid or expired refresh token");
  }
}

export function getUserFromRequest(req: any): JwtPayload | null {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.split(" ")[1] : null;
  if (!token) {
    logger.debug({
      context: "jwt.getUserFromRequest",
      message: "No token provided in Authorization header"
    });
    return null;
  }

  try {
    return verifyAccessToken(token);
  } catch (err: any) {
    logger.error({
      context: "jwt.getUserFromRequest",
      error: err.message,
      errorCode: "TOKEN_VERIFICATION_FAILED",
      details: `Token: ${token.substring(0, 10)}...`
    });
    return null;
  }
}