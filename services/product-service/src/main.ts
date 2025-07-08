import express, { Request, Response, NextFunction } from "express";
import dotenv from "dotenv";
import path from "path";
import productRoutes from "./routes/product.route";
import { logger } from "../utils/logger";

// Load environment variables from .env file
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const app = express();
const PORT = process.env.PRODUCT_SERVICE_PORT || 5008;

// Debug environment variables
logger.info({
  context: "main",
  message: "Environment variables loaded",
  jwtSecret: process.env.JWT_SECRET ? "set" : "not set",
  refreshTokenSecret: process.env.REFRESH_TOKEN_SECRET ? "set" : "not set",
  nodeEnv: process.env.NODE_ENV,
  productServicePort: process.env.PRODUCT_SERVICE_PORT || "5008",
});

// Middleware to parse JSON bodies
app.use(express.json());

// Routes
app.use("/api/products", productRoutes);

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

app.listen(PORT, () => {
  logger.info({
    context: "main",
    message: `Product service running on port ${PORT}`,
    environment: process.env.NODE_ENV,
  });
});