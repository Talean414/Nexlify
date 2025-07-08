import Redis from "ioredis";
import { logger } from "../utils/logger";

const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
const redis = new Redis(redisUrl);

redis.on("connect", () => logger.info({ context: "redis", message: "Redis connected" }));
redis.on("error", (err) => logger.error({ context: "redis", message: "Redis connection failed", error: err.message }));

export default redis;