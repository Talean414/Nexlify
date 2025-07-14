import { config } from "dotenv";
import { getDB, connectDB } from "../config/db";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import axios, { AxiosError } from "axios";
import { logger } from "../utils/logger";
import { Knex } from "knex";

// Load environment variables
config();

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error("JWT_SECRET is not defined in environment variables");
}

export class ServiceError extends Error {
  constructor(
    public status: number,
    public error: string,
    public errorCode: string,
    public details?: string
  ) {
    super(error);
    this.name = "ServiceError";
  }
}

let db: Knex;
connectDB()
  .then((knexInstance) => {
    db = knexInstance;
    logger.info({
      context: "authService",
      message: "Database initialized for authentication service",
    });
  })
  .catch((err) => {
    logger.error({
      context: "authService",
      error: "Failed to initialize database",
      details: err.message,
      stack: err.stack,
    });
    process.exit(1);
  });

function generate2FACode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function registerUser(id: string, email: string, password: string, role: string, correlationId?: string) {
  try {
    const dbInstance = await getDB();
    const existing = await dbInstance("users").where({ email }).first();
    if (existing) {
      throw new ServiceError(400, "Email already in use", "EMAIL_EXISTS");
    }

    const hashed = await bcrypt.hash(password, 12);
    const [user] = await dbInstance("users")
      .insert({
        id,
        email,
        password: hashed,
        role,
        email_verified: role === "vendor" ? false : true,
      })
      .returning(["id", "email", "role", "email_verified"]);

    logger.info({
      context: "authService.registerUser",
      message: "User registered",
      userId: id,
      role,
      correlationId,
    });
    return { success: true, data: user };
  } catch (err: any) {
    const error = err instanceof ServiceError ? err : new ServiceError(500, "Failed to register user", "INTERNAL_SERVER_ERROR", err.message);
    logger.error({
      context: "authService.registerUser",
      error: error.error,
      errorCode: error.errorCode,
      details: error.details || err.stack,
      userId: id,
      correlationId,
    });
    throw error;
  }
}

export async function updateUser(id: string, updates: { email_verified?: boolean }, correlationId?: string) {
  try {
    const dbInstance = await getDB();
    const [user] = await dbInstance("users")
      .where({ id })
      .update({ ...updates, updated_at: dbInstance.fn.now() })
      .returning(["id", "email", "role", "email_verified"]);

    if (!user) {
      throw new ServiceError(404, "User not found", "NOT_FOUND");
    }

    logger.info({
      context: "authService.updateUser",
      message: "User updated",
      userId: id,
      correlationId,
    });
    return user;
  } catch (err: any) {
    const error = err instanceof ServiceError ? err : new ServiceError(500, "Failed to update user", "INTERNAL_SERVER_ERROR", err.message);
    logger.error({
      context: "authService.updateUser",
      error: error.error,
      errorCode: error.errorCode,
      details: error.details || err.stack,
      userId: id,
      correlationId,
    });
    throw error;
  }
}

export async function signAccessToken(userId: string, correlationId?: string) {
  try {
    const dbInstance = await getDB();
    const user = await dbInstance("users").where({ id: userId }).select("id", "role", "email_verified").first();
    if (!user) {
      throw new ServiceError(404, "User not found", "NOT_FOUND");
    }
    if (!user.email_verified) {
      throw new ServiceError(403, "Email not verified", "EMAIL_NOT_VERIFIED");
    }
    const token = jwt.sign({ userId, type: "access", role: user.role }, JWT_SECRET, { expiresIn: "15m" });
    logger.debug({
      context: "authService.signAccessToken",
      message: "Access token signed",
      userId,
      correlationId,
    });
    return token;
  } catch (err: any) {
    const error = err instanceof ServiceError ? err : new ServiceError(500, "Failed to sign access token", "INTERNAL_SERVER_ERROR", err.message);
    logger.error({
      context: "authService.signAccessToken",
      error: error.error,
      errorCode: error.errorCode,
      details: error.details || err.stack,
      userId,
      correlationId,
    });
    throw error;
  }
}

export function signRefreshToken(userId: string, correlationId?: string) {
  try {
    const token = jwt.sign({ userId, type: "refresh" }, JWT_SECRET, { expiresIn: "7d" });
    logger.debug({
      context: "authService.signRefreshToken",
      message: "Refresh token signed",
      userId,
      correlationId,
    });
    return token;
  } catch (err: any) {
    const error = err instanceof ServiceError ? err : new ServiceError(500, "Failed to sign refresh token", "INTERNAL_SERVER_ERROR", err.message);
    logger.error({
      context: "authService.signRefreshToken",
      error: error.error,
      errorCode: error.errorCode,
      details: error.details || err.stack,
      userId,
      correlationId,
    });
    throw error;
  }
}

export function verifyRefreshToken(refreshToken: string, correlationId?: string) {
  try {
    const payload = jwt.verify(refreshToken, JWT_SECRET, { complete: false }) as { userId: string; type: string };
    if (payload.type !== "refresh") {
      throw new ServiceError(401, "Invalid token type", "INVALID_TOKEN");
    }
    logger.debug({
      context: "authService.verifyRefreshToken",
      message: "Refresh token verified",
      userId: payload.userId,
      correlationId,
    });
    return { userId: payload.userId };
  } catch (err: any) {
    const error = err instanceof ServiceError ? err : new ServiceError(401, "Invalid refresh token", "INVALID_TOKEN", err.message);
    logger.error({
      context: "authService.verifyRefreshToken",
      error: error.error,
      errorCode: error.errorCode,
      details: error.details || err.stack,
      correlationId,
    });
    throw error;
  }
}

export async function loginUser(email: string, password: string, deviceInfo: string = "unknown", correlationId?: string) {
  try {
    if (!email || !password) {
      throw new ServiceError(400, "Email and password are required", "INVALID_INPUT");
    }

    const dbInstance = await getDB();
    const user = await dbInstance("users").where({ email }).first();
    if (!user) {
      throw new ServiceError(401, "Invalid credentials", "INVALID_CREDENTIALS");
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      throw new ServiceError(401, "Invalid credentials", "INVALID_CREDENTIALS");
    }

    await initiate2FA(user.id, correlationId);
    const tempToken = jwt.sign({ userId: user.id, type: "2fa", role: user.role }, JWT_SECRET, { expiresIn: "10m" });

    await dbInstance("user_devices")
      .insert({
        user_id: user.id,
        device_info: deviceInfo,
        created_at: new Date(),
      })
      .onConflict(["user_id", "device_info"])
      .merge({ created_at: new Date() });

    logger.info({
      context: "authService.loginUser",
      message: "Login initiated, 2FA required",
      userId: user.id,
      correlationId,
    });
    return {
      success: true,
      data: {
        user: { id: user.id, email: user.email, role: user.role },
        tempToken,
        message: "2FA code sent. Please verify to complete login.",
      },
    };
  } catch (err: any) {
    const error = err instanceof ServiceError ? err : new ServiceError(500, "Failed to login user", "INTERNAL_SERVER_ERROR", err.message);
    logger.error({
      context: "authService.loginUser",
      error: error.error,
      errorCode: error.errorCode,
      details: error.details || err.stack,
      email,
      correlationId,
    });
    throw error;
  }
}

export async function initiate2FA(userId: string, correlationId?: string) {
  try {
    if (!userId) {
      throw new ServiceError(400, "User ID is required", "INVALID_INPUT");
    }

    if (!process.env.NOTIFICATION_SERVICE_URL) {
      throw new ServiceError(500, "Notification service URL is not configured", "CONFIG_ERROR");
    }

    const dbInstance = await getDB();
    const code = generate2FACode();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    const user = await dbInstance("users").where({ id: userId }).select("email").first();
    if (!user) {
      throw new ServiceError(404, "User not found", "NOT_FOUND");
    }

    await dbInstance("user_2fa_codes").where({ user_id: userId }).del();
    await dbInstance("user_2fa_codes").insert({
      user_id: userId,
      code,
      expires_at: expiresAt,
    });

    try {
      const response = await axios.post(
        `${process.env.NOTIFICATION_SERVICE_URL}/api/notification/email`,
        {
          to: user.email,
          subject: "Your 2FA Code",
          message: `Your 2FA code is ${code}. It expires in 5 minutes.`,
        },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${jwt.sign({ service: "auth-service" }, JWT_SECRET, { expiresIn: "1h" })}`,
          },
          timeout: 10000,
        }
      );
      logger.info({
        context: "authService.initiate2FA",
        message: "2FA notification sent successfully",
        userId,
        email: user.email,
        correlationId,
        response: response.data,
      });
    } catch (error: any) {
      const errorDetails = error instanceof AxiosError
        ? {
            message: error.message,
            code: error.code,
            status: error.response?.status,
            responseData: error.response?.data,
            requestUrl: error.config?.url,
            requestHeaders: error.config?.headers,
          }
        : { message: error.message, stack: error.stack };
      logger.error({
        context: "authService.initiate2FA",
        error: "Failed to send 2FA notification",
        errorCode: "NOTIFICATION_ERROR",
        details: errorDetails,
        userId,
        email: user.email,
        correlationId,
      });
      throw new ServiceError(500, "Failed to send 2FA notification", "NOTIFICATION_ERROR", JSON.stringify(errorDetails));
    }

    logger.info({
      context: "authService.initiate2FA",
      message: "2FA code generated and sent",
      userId,
      email: user.email,
      correlationId,
    });
  } catch (err: any) {
    const error = err instanceof ServiceError ? err : new ServiceError(500, "Failed to initiate 2FA", "INTERNAL_SERVER_ERROR", err.message);
    logger.error({
      context: "authService.initiate2FA",
      error: error.error,
      errorCode: error.errorCode,
      details: error.details || err.stack,
      userId,
      correlationId,
    });
    throw error;
  }
}

export async function verify2FA(userId: string, code: string, deviceInfo: string = "unknown", correlationId?: string) {
  try {
    if (!userId || !code) {
      throw new ServiceError(400, "User ID and code are required", "INVALID_INPUT");
    }

    const dbInstance = await getDB();
    const entry = await dbInstance("user_2fa_codes")
      .where({ user_id: userId, code, verified: false })
      .andWhere("expires_at", ">", new Date())
      .first();

    if (!entry) {
      throw new ServiceError(401, "Invalid or expired 2FA code", "INVALID_2FA_CODE");
    }

    await dbInstance("user_2fa_codes").where({ id: entry.id }).update({ verified: true });

    const accessToken = await signAccessToken(userId, correlationId);
    const refreshToken = signRefreshToken(userId, correlationId);

    await dbInstance("users")
      .where({ id: userId })
      .update({ refresh_token: refreshToken });

    await dbInstance("user_devices")
      .insert({
        user_id: userId,
        device_info: deviceInfo,
        created_at: new Date(),
      })
      .onConflict(["user_id", "device_info"])
      .merge({ created_at: new Date() });

    logger.info({
      context: "authService.verify2FA",
      message: "2FA verified successfully",
      userId,
      correlationId,
    });
    return { success: true, data: { accessToken, refreshToken } };
  } catch (err: any) {
    const error = err instanceof ServiceError ? err : new ServiceError(500, "Failed to verify 2FA", "INTERNAL_SERVER_ERROR", err.message);
    logger.error({
      context: "authService.verify2FA",
      error: error.error,
      errorCode: error.errorCode,
      details: error.details || err.stack,
      userId,
      correlationId,
    });
    throw error;
  }
}

export async function refreshAuthToken(refreshToken: string, correlationId?: string) {
  try {
    if (!refreshToken) {
      throw new ServiceError(400, "Refresh token is required", "INVALID_INPUT");
    }

    const { userId } = verifyRefreshToken(refreshToken, correlationId);
    const dbInstance = await getDB();
    const user = await dbInstance("users")
      .where({ id: userId, refresh_token: refreshToken })
      .first();

    if (!user) {
      throw new ServiceError(401, "Invalid refresh token", "INVALID_TOKEN");
    }

    const accessToken = await signAccessToken(userId, correlationId);
    logger.info({
      context: "authService.refreshAuthToken",
      message: "Access token refreshed",
      userId,
      correlationId,
    });
    return { success: true, data: { accessToken } };
  } catch (err: any) {
    const error = err instanceof ServiceError ? err : new ServiceError(500, "Failed to refresh token", "INTERNAL_SERVER_ERROR", err.message);
    logger.error({
      context: "authService.refreshAuthToken",
      error: error.error,
      errorCode: error.errorCode,
      details: error.details || err.stack,
      correlationId,
    });
    throw error;
  }
}

export async function logoutDevice(userId: string, refreshToken: string, correlationId?: string) {
  try {
    if (!userId || !refreshToken) {
      throw new ServiceError(400, "User ID and refresh token are required", "INVALID_INPUT");
    }

    const dbInstance = await getDB();
    await dbInstance("users")
      .where({ id: userId, refresh_token: refreshToken })
      .update({ refresh_token: null });

    logger.info({
      context: "authService.logoutDevice",
      message: "Logged out from device",
      userId,
      correlationId,
    });
  } catch (err: any) {
    const error = err instanceof ServiceError ? err : new ServiceError(500, "Failed to logout device", "INTERNAL_SERVER_ERROR", err.message);
    logger.error({
      context: "authService.logoutDevice",
      error: error.error,
      errorCode: error.errorCode,
      details: error.details || err.stack,
      userId,
      correlationId,
    });
    throw error;
  }
}

export async function logoutAllDevices(userId: string, correlationId?: string) {
  try {
    if (!userId) {
      throw new ServiceError(400, "User ID is required", "INVALID_INPUT");
    }

    const dbInstance = await getDB();
    await dbInstance("users")
      .where({ id: userId })
      .update({ refresh_token: null });

    await dbInstance("user_devices").where({ user_id: userId }).del();

    logger.info({
      context: "authService.logoutAllDevices",
      message: "Logged out from all devices",
      userId,
      correlationId,
    });
  } catch (err: any) {
    const error = err instanceof ServiceError ? err : new ServiceError(500, "Failed to logout all devices", "INTERNAL_SERVER_ERROR", err.message);
    logger.error({
      context: "authService.logoutAllDevices",
      error: error.error,
      errorCode: error.errorCode,
      details: error.details || err.stack,
      userId,
      correlationId,
    });
    throw error;
  }
}

export async function requestPasswordReset(email: string, correlationId?: string): Promise<void> {
  try {
    if (!email) {
      throw new ServiceError(400, "Email is required", "INVALID_INPUT");
    }

    if (!process.env.NOTIFICATION_SERVICE_URL) {
      throw new ServiceError(500, "Notification service URL is not configured", "CONFIG_ERROR");
    }

    const dbInstance = await getDB();
    const user = await dbInstance("users").where({ email }).first();
    if (!user) {
      logger.info({
        context: "authService.requestPasswordReset",
        message: "No user found with this email, but continuing for security",
        email,
        correlationId,
      });
      return;
    }

    const token = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    await dbInstance("password_resets").where({ email }).del();
    await dbInstance("password_resets").insert({
      email,
      token: hashedToken,
      expires_at: expiresAt,
    });

    try {
      await axios.post(
        `${process.env.NOTIFICATION_SERVICE_URL}/api/notifications`,
        {
          userId: user.id,
          type: "password_reset",
          content: `Your password reset link: ${process.env.FRONTEND_URL}/reset-password?token=${token}`,
        },
        {
          headers: {
            "Content-Type": "application/json",
            // Add authentication header if required
            // "Authorization": `Bearer ${process.env.NOTIFICATION_SERVICE_TOKEN}`,
          },
          timeout: 10000,
        }
      );
    } catch (error: any) {
      const errorDetails = error instanceof AxiosError
        ? {
            message: error.message,
            response: error.response?.data,
            status: error.response?.status,
            code: error.code,
          }
        : { message: error.message, stack: error.stack };
      logger.error({
        context: "authService.requestPasswordReset",
        error: "Failed to send password reset notification",
        errorCode: "NOTIFICATION_ERROR",
        details: errorDetails,
        email,
        correlationId,
      });
      throw new ServiceError(500, "Failed to send password reset notification", "NOTIFICATION_ERROR", JSON.stringify(errorDetails));
    }

    logger.info({
      context: "authService.requestPasswordReset",
      message: "Password reset requested",
      email,
      correlationId,
    });
  } catch (err: any) {
    const error = err instanceof ServiceError ? err : new ServiceError(500, "Failed to request password reset", "INTERNAL_SERVER_ERROR", err.message);
    logger.error({
      context: "authService.requestPasswordReset",
      error: error.error,
      errorCode: error.errorCode,
      details: error.details || err.stack,
      email,
      correlationId,
    });
    throw error;
  }
}