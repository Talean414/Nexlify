import { Router, Response, NextFunction, RequestHandler } from "express";
import { AuthenticatedRequest } from "@shared/utils/auth/requireAuth";
import * as authController from "../controllers/auth.controller";
import passport from "passport";
import { v4 as uuidv4 } from "uuid";
import { logger } from "../utils/logger";
import { requireAuth, requireRole } from "@shared/utils/auth/requireAuth";
import { authMiddleware } from "../controllers/auth.controller";

const router = Router();

// Middleware to add correlation ID
router.use(((
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  req.correlationId = uuidv4();
  logger.debug({
    context: "auth.route",
    message: "Request received",
    method: req.method,
    url: req.url,
    correlationId: req.correlationId,
  });
  next();
}) as RequestHandler);

/**
 * @route POST /api/auth/signup
 * @desc Register a new user
 * @access Public
 */
router.post("/signup", authMiddleware.validateSignup, authController.signup as RequestHandler);

/**
 * @route POST /api/auth/login
 * @desc Login a user and initiate 2FA
 * @access Public
 */
router.post("/login", authMiddleware.validateLogin, authController.login as RequestHandler);

/**
 * @route POST /api/auth/verify-2fa
 * @desc Verify 2FA code and issue tokens
 * @access Public
 */
router.post("/verify-2fa", authMiddleware.validate2FA, authController.verify2FA as RequestHandler);

/**
 * @route POST /api/auth/refresh
 * @desc Refresh access token
 * @access Public
 */
router.post("/refresh", authMiddleware.validateRefreshToken, authController.refreshToken as RequestHandler);

/**
 * @route POST /api/auth/logout
 * @desc Logout from a device
 * @access Authenticated
 */
router.post("/logout", requireAuth, authController.logout as RequestHandler);

/**
 * @route POST /api/auth/logout-all
 * @desc Logout from all devices
 * @access Authenticated
 */
router.post("/logout-all", requireAuth, authController.logoutAll as RequestHandler);

/**
 * @route POST /api/auth/request-password-reset
 * @desc Request a password reset link
 * @access Public
 */
router.post("/request-password-reset", authController.requestPasswordReset as RequestHandler);

/**
 * @route GET /api/auth/google
 * @desc Initiate Google OAuth login
 * @access Public
 */
router.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"] }) as RequestHandler
);

/**
 * @route GET /api/auth/google/callback
 * @desc Google OAuth callback
 * @access Public
 */
router.get(
  "/google/callback",
  passport.authenticate("google", { failureRedirect: "/login-failed" }) as RequestHandler,
  authController.googleCallback as RequestHandler
);

/**
 * @route PATCH /api/auth/users/:id
 * @desc Update user attributes (e.g., email_verified)
 * @access Admin
 */
router.patch(
  "/users/:id",
  requireAuth,
  requireRole(["admin"]),
  authMiddleware.validateSignup,
  (async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { id } = req.params;
      const { email_verified } = req.body;
      const user = await authController.authService.updateUser(id, { email_verified }, req.correlationId);
      logger.info({
        context: "auth.route.updateUser",
        message: "User updated",
        userId: id,
        correlationId: req.correlationId,
      });
      return res.json({ success: true, data: user });
    } catch (err: any) {
      const error = err instanceof authController.ApiError
        ? err
        : new authController.ApiError(500, "Failed to update user", "INTERNAL_SERVER_ERROR", err.message);
      logger.error({
        context: "auth.route.updateUser",
        error: error.error,
        errorCode: error.errorCode,
        details: error.details,
        correlationId: req.correlationId,
      });
      return res.status(error.status).json({
        success: false,
        error: error.error,
        errorCode: error.errorCode,
        details: process.env.NODE_ENV === "development" ? error.details : undefined,
      });
    }
  }) as RequestHandler
);

export default router;