import express from "express";
import dotenv from "dotenv";
import path from "path";
import orderRoutes from "./routes/order.route";
import { logger } from "./utils/logger";

// Load environment variables from .env file
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const app = express();
const PORT = process.env.PORT || 5006;

// Debug environment variables
logger.info({
  context: "main",
  message: "Environment variables loaded",
  jwtSecret: process.env.JWT_SECRET ? "set" : "not set",
  refreshTokenSecret: process.env.REFRESH_TOKEN_SECRET ? "set" : "not set",
  nodeEnv: process.env.NODE_ENV
});

app.use(express.json());
app.use("/orders", orderRoutes);

app.listen(PORT, () => {
  logger.info({
    context: "main",
    message: `Order service running on port ${PORT}`,
    environment: process.env.NODE_ENV
  });
});