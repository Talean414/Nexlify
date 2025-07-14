import rateLimit from "express-rate-limit";
import { RedisClient } from "../config/redis";
import { logger } from "../utils/logger";

export const rateLimitMiddleware = rateLimit({
  store: new (require("express-rate-limit").MemoryStore)(), // Use Redis in production
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  handler: (req, res) => {
    logger.warn({
      context: "rateLimitMiddleware",
      message: "Rate limit exceeded",
      ip: req.ip,
      url: req.url,
    });
    res.status(429).json({ success: false, error: "Too many requests" });
  },
});