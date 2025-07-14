import { Request, Response, NextFunction, RequestHandler } from "express";
import { verify } from "jsonwebtoken";
import { logger } from "../logging/logger";
import { validate as isUUID } from "uuid";

export interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    email?: string;
    role?: string;
  };
  correlationId?: string;
}

export class AuthError extends Error {
  constructor(
    public status: number,
    public error: string,
    public errorCode: string,
    public details?: string
  ) {
    super(error);
    this.name = "AuthError";
  }
}

/**
 * Verifies an access token and returns the decoded payload
 * @param token - JWT token
 * @returns Decoded token payload
 * @throws AuthError if verification fails
 */
export function verifyAccessToken(token: string): { userId: string; email?: string; role?: string } {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is not defined");
  }
  try {
    return verify(token, process.env.JWT_SECRET) as {
      userId: string;
      email?: string;
      role?: string;
    };
  } catch (err: any) {
    throw new AuthError(401, "Invalid or expired token", "AUTH_FAILED", err.message);
  }
}

/**
 * Middleware to require authentication
 */
export const requireAuth: RequestHandler = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers["authorization"];
  const correlationId = req.correlationId || "unknown";

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    const error = new AuthError(401, "Authorization token missing or malformed", "INVALID_TOKEN");
    logger.error({
      context: "requireAuth",
      error: error.error,
      errorCode: error.errorCode,
      correlationId,
    });
    return res.status(error.status).json({
      success: false,
      error: error.error,
      errorCode: error.errorCode,
      details: process.env.NODE_ENV === "development" ? error.details : undefined,
    });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = verifyAccessToken(token);
    if (!isUUID(decoded.userId)) {
      throw new AuthError(401, "Invalid user ID in token", "INVALID_USER_ID");
    }

    req.user = {
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role,
    };

    logger.debug({
      context: "requireAuth",
      message: "User authenticated",
      userId: decoded.userId,
      role: decoded.role,
      correlationId,
    });
    next();
  } catch (err: any) {
    const error = err instanceof AuthError ? err : new AuthError(401, "Invalid or expired token", "AUTH_FAILED", err.message);
    logger.error({
      context: "requireAuth",
      error: error.error,
      errorCode: error.errorCode,
      details: error.details,
      correlationId,
    });
    return res.status(error.status).json({
      success: false,
      error: error.error,
      errorCode: error.errorCode,
      details: process.env.NODE_ENV === "development" ? error.details : undefined,
    });
  }
};

/**
 * Middleware to restrict access to specific roles
 * @param roles - Allowed roles
 * @returns Middleware function
 */
export function requireRole(roles: string[]): RequestHandler {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const correlationId = req.correlationId || "unknown";
    try {
      const role = req.user?.role;
      if (!role || !roles.includes(role)) {
        throw new AuthError(403, `Forbidden: Requires one of roles ${roles.join(", ")}`, "FORBIDDEN");
      }
      logger.debug({
        context: "requireRole",
        message: "Role authorized",
        userId: req.user?.userId,
        role,
        correlationId,
      });
      next();
    } catch (err: any) {
      const error = err instanceof AuthError ? err : new AuthError(403, "Forbidden", "FORBIDDEN", err.message);
      logger.error({
        context: "requireRole",
        error: error.error,
        errorCode: error.errorCode,
        details: error.details,
        userId: req.user?.userId,
        role: req.user?.role,
        correlationId,
      });
      return res.status(error.status).json({
        success: false,
        error: error.error,
        errorCode: error.errorCode,
        details: process.env.NODE_ENV === "development" ? error.details : undefined,
      });
    }
  };
}