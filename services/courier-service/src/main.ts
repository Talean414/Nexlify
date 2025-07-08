import express, { Request, Response, NextFunction } from "express";
import dotenv from "dotenv";
import morgan from "morgan";
import { Server } from "socket.io";
import http from "http";
import { logger } from "./utils/logger";
import { initializeKafka } from "./config/kafka";
import courierRoutes from "./routes/courier.route";
import { register } from "./utils/metrics";
import { tracer } from "./utils/tracing";

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: process.env.FRONTEND_URL },
});

const PORT = process.env.COURIER_SERVICE_PORT || 5002;

logger.info({
  context: "main",
  message: "Environment variables loaded",
  jwtSecret: process.env.JWT_SECRET ? "set" : "not set",
  authServiceUrl: process.env.AUTH_SERVICE_URL ? "set" : "not set",
  nodeEnv: process.env.NODE_ENV,
  courierServicePort: PORT,
});

app.use(morgan("dev"));
app.use(express.json());

// Metrics endpoint
app.get("/metrics", async (req, res) => {
  res.set("Content-Type", register.contentType);
  res.end(await register.metrics());
});

// WebSocket for real-time courier location updates
io.on("connection", (socket) => {
  logger.info({ context: "websocket", message: "Client connected", socketId: socket.id });
  socket.on("location_update", async (data: { courierId: string; latitude: number; longitude: number }) => {
    const span = tracer.startSpan("websocket.location_update");
    try {
      await courierService.updateCourierLocation(data.courierId, data.latitude, data.longitude, socket.id);
      io.emit("courier_location", data);
      logger.info({ context: "websocket", message: "Location update broadcast", courierId: data.courierId });
      span.end();
    } catch (err: any) {
      logger.error({ context: "websocket", message: "Failed to update location", error: err.message, courierId: data.courierId });
      span.recordException(err);
      span.end();
    }
  });
  socket.on("disconnect", () => {
    logger.info({ context: "websocket", message: "Client disconnected", socketId: socket.id });
  });
});

app.use("/api/couriers", courierRoutes);

app.get("/", (_req, res) => {
  res.send("Courier Service is running!");
});

// Global error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  const correlationId = (req as any).correlationId || "unknown";
  const errorResponse = {
    success: false,
    error: err.message || "Internal server error",
    errorCode: "INTERNAL_SERVER_ERROR",
    details: process.env.NODE_ENV === "development" ? err.stack : undefined,
  };

  logger.error({ context: "globalErrorHandler", error: err.message, errorCode: "INTERNAL_SERVER_ERROR", details: err.stack, correlationId });
  res.status(500).json(errorResponse);
});

// Initialize Kafka
initializeKafka().catch((err) => {
  logger.error({ context: "main", message: "Failed to initialize Kafka", error: err.message });
});

server.listen(PORT, () => {
  logger.info({ context: "main", message: `Courier Service running on port ${PORT}`, environment: process.env.NODE_ENV });
});