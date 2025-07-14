import express from "express";
import dotenv from "dotenv";
import { connectDB } from "./config/db";
import { connectKafka } from "./config/kafka";
import { connectRedis } from "./config/redis";
import notificationRoutes from "./routes/notification.route";
import { logger } from "./utils/logger";
import { initMetrics } from "./utils/metrics";
import { initTracing } from "./utils/tracing";
import { startConsumers } from "./events/consumers";

dotenv.config();

const app = express();
app.use(express.json());

// Initialize observability
initMetrics(app);
initTracing();

// Connect to dependencies
Promise.all([connectDB(), connectKafka(), connectRedis()])
  .then(() => {
    logger.info({
      context: "notificationService",
      message: "Connected to database, Kafka, and Redis",
    });
    // Start Kafka consumers
    startConsumers();
  })
  .catch((err) => {
    logger.error({
      context: "notificationService",
      error: "Failed to initialize dependencies",
      details: err.message,
      stack: err.stack,
    });
    process.exit(1);
  });

// Mount routes
app.use("/api/notification", notificationRoutes);

const PORT = process.env.PORT || 5005;
app.listen(PORT, () => {
  logger.info({
    context: "notificationService",
    message: `Notification service running on port ${PORT}`,
  });
});