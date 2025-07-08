import express, { RequestHandler, Response, NextFunction } from "express";
import dotenv from "dotenv";
import path from "path";
import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";
import session from "express-session";
import passport from "passport";
import authRoutes from "./routes/auth.route";
import { connectDB } from "./config/db";
import { logger } from "./utils/logger";
import { AuthenticatedRequest } from "@shared/utils/auth/requireAuth";
import "./config/passport";

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const app = express();
const PORT = process.env.AUTH_SERVICE_PORT || 5001;

// Debug environment variables
logger.info({
  context: "main",
  message: "Environment variables loaded",
  jwtSecret: process.env.JWT_SECRET ? "set" : "not set",
  sessionSecret: process.env.SESSION_SECRET ? "set" : "not set",
  authServiceUrl: process.env.AUTH_SERVICE_URL ? "set" : "not set",
  nodeEnv: process.env.NODE_ENV,
  authServicePort: process.env.AUTH_SERVICE_PORT || "5001",
});

// Middleware
app.use(express.json() as RequestHandler);
app.use(helmet() as RequestHandler);
app.use(cors() as RequestHandler);
app.use(
  rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 20,
    message: { success: false, error: "Too many requests", errorCode: "RATE_LIMIT_EXCEEDED" },
  }) as RequestHandler
);
app.use(
  session({
    secret: process.env.SESSION_SECRET || "keyboard cat",
    resave: false,
    saveUninitialized: false,
  }) as RequestHandler
);
app.use(passport.initialize() as RequestHandler);
app.use(passport.session() as RequestHandler);

// Routes
app.use("/api/auth", authRoutes);

// Health check for Kubernetes
app.get("/health", (_req: AuthenticatedRequest, res: Response) => {
  res.json({ status: "ok", service: "auth-service" });
});

// Global error handler
app.use((err: Error, req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const correlationId = req.correlationId || "unknown";
  const errorResponse = {
    success: false,
    error: err.message || "Internal server error",
    errorCode: "INTERNAL_SERVER_ERROR",
    details: process.env.NODE_ENV === "development" ? err.stack : undefined,
  };

  logger.error({
    context: "globalErrorHandler",
    error: err.message,
    errorCode: "INTERNAL_SERVER_ERROR",
    details: err.stack,
    correlationId,
  });

  res.status(500).json(errorResponse);
});

// Start server
connectDB()
  .then(() => {
    app.listen(PORT, () => {
      logger.info({
        context: "main",
        message: `Auth service running on http://localhost:${PORT}`,
        environment: process.env.NODE_ENV,
      });
    });
  })
  .catch((err) => {
    logger.error({
      context: "main",
      error: "Failed to connect to database",
      details: err.message,
    });
    process.exit(1);
  });