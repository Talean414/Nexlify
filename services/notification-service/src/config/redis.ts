import { createClient } from "redis";
import { logger } from "../utils/logger";

export const RedisClient = createClient({
  url: `redis://${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`,
});

export const connectRedis = async () => {
  try {
    await RedisClient.connect();
    logger.info({
      context: "redis.connectRedis",
      message: "Connected to Redis",
    });
  } catch (err: any) {
    logger.error({
      context: "redis.connectRedis",
      error: err.message,
      details: err.stack,
    });
    throw err;
  }
};