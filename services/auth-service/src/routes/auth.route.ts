import { Router, Response, NextFunction } from "express";
import { AuthenticatedRequest } from "@shared/utils/auth/requireAuth";
import * as authController from "../controllers/auth.controller";
import passport from "passport";
import { v4 as uuidv4 } from "uuid";
import { logger } from "../utils/logger";
import { requireAuth, requireRole } from "@shared/utils/auth/requireAuth";
import { authMiddleware } from "../controllers/auth.controller";

const router = Router();

// Middleware to add correlation ID
router.use((req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  req.correlationId = uuidv4();
  logger.debug({
    context: "auth.route",
    message: "Request received",
    method: req.method,
    url: req.url,
    correlationId: req.correlationId,
  });
  next();
});

/**
 * @route POST /api/auth/signup
 */
router.post("/signup", authMiddleware.validateSignup, authController.signup);

/**
 * @route POST /api/auth/login
 */
router.post("/login", authMiddleware.validateLogin, authController.login);

/**
 * @route POST /api/auth/verify-2fa
 */
router.post("/verify-2fa", authMiddleware.validate2FA, authController.verify2FA);

/**
 * @route POST /api/auth/refresh
 */
router.post("/refresh", authMiddleware.validateRefreshToken, authController.refreshToken);

/**
 * @route POST /api/auth/logout
 */
router.post("/logout", requireAuth, authController.logout);

/**
 * @route POST /api/auth/logout-all
 */
router.post("/logout-all", requireAuth, authController.logoutAll);

/**
 * @route POST /api/auth/request-password-reset
 */
router.post("/request-password-reset", authController.requestPasswordReset);

/**
 * @route GET /api/auth/google
 */
router.get("/google", passport.authenticate("google", { scope: ["profile", "email"] }));

/**
 * @route GET /api/auth/google/callback
 */
router.get(
  "/google/callback",
  passport.authenticate("google", { failureRedirect: "/login-failed" }),
  authController.googleCallback
);

/**
 * @route PATCH /api/auth/users/:id
 * @access Admin
 */
router.patch(
  "/users/:id",
  requireAuth,
  requireRole(["admin"]),
  authMiddleware.validateSignup,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
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
  }
);

export default router;
