import { startAuthConsumer } from "./auth.consumer";
import { startOrderConsumer } from "./order.consumer";
import { startCourierConsumer } from "./courier.consumer";
import { logger } from "../../utils/logger";

export const startConsumers = async () => {
  try {
    await Promise.all([startAuthConsumer(), startOrderConsumer(), startCourierConsumer()]);
    logger.info({
      context: "consumers",
      message: "All Kafka consumers started",
    });
  } catch (err: any) {
    logger.error({
      context: "consumers",
      error: err.message,
      details: err.stack,
    });
    throw err;
  }
};