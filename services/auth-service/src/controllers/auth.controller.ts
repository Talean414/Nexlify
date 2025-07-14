import { RequestHandler, Response, NextFunction } from "express";
import { body, validationResult, ValidationError } from "express-validator";
import jwt from "jsonwebtoken";
import { AuthenticatedRequest } from "@shared/utils/auth/requireAuth";
import * as authService from "../services/auth.service";
import { logger } from "../utils/logger";

interface SuccessResponse<T = any> {
  success: true;
  message?: string;
  data?: T;
}

interface ErrorResponse {
  success: false;
  error: string;
  errorCode: string;
  details?: string;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    public error: string,
    public errorCode: string,
    public details?: string
  ) {
    super(error);
    this.name = "ApiError";
  }
}

export const validateSignup = [
  body("id").optional().isUUID().withMessage("ID must be a valid UUID"),
  body("email").isEmail().withMessage("Valid email is required"),
  body("password")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters"),
  body("role")
    .optional()
    .isIn(["customer", "vendor", "courier", "admin"])
    .withMessage("Invalid role"),
];

export const validateLogin = [
  body("email").isEmail().withMessage("Valid email is required"),
  body("password").notEmpty().withMessage("Password is required"),
];

export const validate2FA = [
  body("code")
    .isString()
    .isLength({ min: 6, max: 6 })
    .withMessage("2FA code must be 6 digits"),
  body("tempToken").notEmpty().withMessage("Temporary token is required"),
];

export const validateRefreshToken = [
  body("token").notEmpty().withMessage("Refresh token is required"),
];

export const signup: RequestHandler = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ApiError(
        400,
        "Invalid input",
        "INVALID_INPUT",
        errors.array().map((e: ValidationError) => e.msg).join(", ")
      );
    }

    const { id, email, password, role = "customer" } = req.body;
    const result = await authService.registerUser(
      id,
      email,
      password,
      role,
      req.correlationId
    );
    logger.info({
      context: "authController.signup",
      message: "User registered",
      userId: result.data.id,
      correlationId: req.correlationId,
    });
    return res.status(201).json(result as SuccessResponse);
  } catch (err: any) {
    const error = err instanceof ApiError
      ? err
      : new ApiError(500, "Failed to register user", "INTERNAL_SERVER_ERROR", err.message);
    logger.error({
      context: "authController.signup",
      error: error.error,
      errorCode: error.errorCode,
      details: error.details || err.stack,
      correlationId: req.correlationId,
    });
    return res.status(error.status).json({
      success: false,
      error: error.error,
      errorCode: error.errorCode,
      details: process.env.NODE_ENV === "development" ? error.details : undefined,
    } as ErrorResponse);
  }
};

export const login: RequestHandler = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ApiError(
        400,
        "Invalid input",
        "INVALID_INPUT",
        errors.array().map((e: ValidationError) => e.msg).join(", ")
      );
    }

    const { email, password, deviceInfo = "unknown" } = req.body;
    const result = await authService.loginUser(
      email,
      password,
      deviceInfo,
      req.correlationId
    );
    logger.info({
      context: "authController.login",
      message: "Login initiated",
      userId: result.data?.user?.id || "unknown",
      correlationId: req.correlationId,
    });
    return res.json(result as SuccessResponse);
  } catch (err: any) {
    const error = err instanceof ApiError
      ? err
      : new ApiError(401, "Failed to login", "AUTH_FAILED", err.message);
    logger.error({
      context: "authController.login",
      error: error.error,
      errorCode: error.errorCode,
      details: error.details || err.stack,
      correlationId: req.correlationId,
    });
    return res.status(error.status).json({
      success: false,
      error: error.error,
      errorCode: error.errorCode,
      details: process.env.NODE_ENV === "development" ? error.details : undefined,
    } as ErrorResponse);
  }
};

export const verify2FA: RequestHandler = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ApiError(
        400,
        "Invalid input",
        "INVALID_INPUT",
        errors.array().map((e: ValidationError) => e.msg).join(", ")
      );
    }

    const { code, tempToken, deviceInfo = "unknown" } = req.body;
    const payload = jwt.verify(tempToken, process.env.JWT_SECRET!) as {
      userId: string;
      type: string;
    };

    if (payload.type !== "2fa") {
      throw new ApiError(401, "Invalid token type", "INVALID_TOKEN");
    }

    const result = await authService.verify2FA(
      payload.userId,
      code,
      deviceInfo,
      req.correlationId
    );
    logger.info({
      context: "authController.verify2FA",
      message: "2FA verified",
      userId: payload.userId,
      correlationId: req.correlationId,
    });
    return res.json({
      success: true,
      message: "2FA verified successfully",
      data: {
        user: { id: payload.userId },
        accessToken: result.data.accessToken,
        refreshToken: result.data.refreshToken,
      },
    } as SuccessResponse);
  } catch (err: any) {
    const error = err instanceof ApiError
      ? err
      : new ApiError(401, "Failed to verify 2FA", "AUTH_FAILED", err.message);
    logger.error({
      context: "authController.verify2FA",
      error: error.error,
      errorCode: error.errorCode,
      details: error.details || err.stack,
      correlationId: req.correlationId,
    });
    return res.status(error.status).json({
      success: false,
      error: error.error,
      errorCode: error.errorCode,
      details: process.env.NODE_ENV === "development" ? error.details : undefined,
    } as ErrorResponse);
  }
};

export const refreshToken: RequestHandler = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ApiError(
        400,
        "Invalid input",
        "INVALID_INPUT",
        errors.array().map((e: ValidationError) => e.msg).join(", ")
      );
    }

    const { token } = req.body;
    const result = await authService.refreshAuthToken(token, req.correlationId);
    logger.info({
      context: "authController.refreshToken",
      message: "Token refreshed",
      correlationId: req.correlationId,
    });
    return res.json(result as SuccessResponse);
  } catch (err: any) {
    const error = err instanceof ApiError
      ? err
      : new ApiError(401, "Failed to refresh token", "AUTH_FAILED", err.message);
    logger.error({
      context: "authController.refreshToken",
      error: error.error,
      errorCode: error.errorCode,
      details: error.details || err.stack,
      correlationId: req.correlationId,
    });
    return res.status(error.status).json({
      success: false,
      error: error.error,
      errorCode: error.errorCode,
      details: process.env.NODE_ENV === "development" ? error.details : undefined,
    } as ErrorResponse);
  }
};

export const logout: RequestHandler = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { userId, refreshToken } = req.body;
    await authService.logoutDevice(userId, refreshToken, req.correlationId);
    logger.info({
      context: "authController.logout",
      message: "Logged out from device",
      userId,
      correlationId: req.correlationId,
    });
    return res.json({
      success: true,
      message: "Logged out from current device",
    } as SuccessResponse);
  } catch (err: any) {
    const error = err instanceof ApiError
      ? err
      : new ApiError(400, "Failed to logout", "AUTH_FAILED", err.message);
    logger.error({
      context: "authController.logout",
      error: error.error,
      errorCode: error.errorCode,
      details: error.details || err.stack,
      correlationId: req.correlationId,
    });
    return res.status(error.status).json({
      success: false,
      error: error.error,
      errorCode: error.errorCode,
      details: process.env.NODE_ENV === "development" ? error.details : undefined,
    } as ErrorResponse);
  }
};

export const logoutAll: RequestHandler = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { userId } = req.body;
    await authService.logoutAllDevices(userId, req.correlationId);
    logger.info({
      context: "authController.logoutAll",
      message: "Logged out from all devices",
      userId,
      correlationId: req.correlationId,
    });
    return res.json({
      success: true,
      message: "Logged out from all devices",
    } as SuccessResponse);
  } catch (err: any) {
    const error = err instanceof ApiError
      ? err
      : new ApiError(400, "Failed to logout all devices", "AUTH_FAILED", err.message);
    logger.error({
      context: "authController.logoutAll",
      error: error.error,
      errorCode: error.errorCode,
      details: error.details || err.stack,
      correlationId: req.correlationId,
    });
    return res.status(error.status).json({
      success: false,
      error: error.error,
      errorCode: error.errorCode,
      details: process.env.NODE_ENV === "development" ? error.details : undefined,
    } as ErrorResponse);
  }
};

export const requestPasswordReset: RequestHandler = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { email } = req.body;
    await authService.requestPasswordReset(email, req.correlationId);
    logger.info({
      context: "authController.requestPasswordReset",
      message: "Password reset requested",
      email,
      correlationId: req.correlationId,
    });
    return res.json({
      success: true,
      message: "If the email is valid, a reset link has been sent.",
    } as SuccessResponse);
  } catch (err: any) {
    const error = err instanceof ApiError
      ? err
      : new ApiError(400, "Failed to request password reset", "INVALID_INPUT", err.message);
    logger.error({
      context: "authController.requestPasswordReset",
      error: error.error,
      errorCode: error.errorCode,
      details: error.details || err.stack,
      correlationId: req.correlationId,
    });
    return res.status(error.status).json({
      success: false,
      error: error.error,
      errorCode: error.errorCode,
      details: process.env.NODE_ENV === "development" ? error.details : undefined,
    } as ErrorResponse);
  }
};

export const googleCallback: RequestHandler = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const user = req.user as { userId: string; email: string; role?: string };
    await authService.initiate2FA(user.userId, req.correlationId);
    const tempToken = jwt.sign(
      { userId: user.userId, type: "2fa", role: user.role },
      process.env.JWT_SECRET!,
      { expiresIn: "10m" }
    );

    logger.info({
      context: "authController.googleCallback",
      message: "Google login successful",
      userId: user.userId,
      correlationId: req.correlationId,
    });
    return res.json({
      success: true,
      message: "Google login successful. 2FA code sent.",
      data: {
        tempToken,
        user: { id: user.userId, email: user.email },
      },
    } as SuccessResponse);
  } catch (err: any) {
    const error = err instanceof ApiError
      ? err
      : new ApiError(500, "Failed to process Google login", "INTERNAL_SERVER_ERROR", err.message);
    logger.error({
      context: "authController.googleCallback",
      error: error.error,
      errorCode: error.errorCode,
      details: error.details || err.stack,
      correlationId: req.correlationId,
    });
    return res.status(error.status).json({
      success: false,
      error: error.error,
      errorCode: error.errorCode,
      details: process.env.NODE_ENV === "development" ? error.details : undefined,
    } as ErrorResponse);
  }
};

export const authMiddleware = {
  validateSignup,
  validateLogin,
  validate2FA,
  validateRefreshToken,
};