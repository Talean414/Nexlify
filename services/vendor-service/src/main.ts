import express, { Request, Response, NextFunction } from "express";
import dotenv from "dotenv";
import path from "path";
import vendorRoutes from "./routes/vendor.route";
import morgan from "morgan";
import { logger } from "../utils/logger";

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const app = express();
const PORT = process.env.VENDOR_SERVICE_PORT || 6001;

// Debug environment variables
logger.info({
  context: "main",
  message: "Environment variables loaded",
  jwtSecret: process.env.JWT_SECRET ? "set" : "not set",
  authServiceUrl: process.env.AUTH_SERVICE_URL ? "set" : "not set",
  nodeEnv: process.env.NODE_ENV,
  vendorServicePort: process.env.VENDOR_SERVICE_PORT || "6001",
});

app.use(morgan("dev"));
app.use(express.json());

app.use("/api/vendors", vendorRoutes);

// Global error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  const correlationId = (req as any).correlationId || "unknown";
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

app.get("/", (_req, res) => {
  res.send("Vendor Service is running!");
});

app.listen(PORT, () => {
  logger.info({
    context: "main",
    message: `Vendor Service running on port ${PORT}`,
    environment: process.env.NODE_ENV,
  });
});