import { kafka } from "../../config/kafka";
import { logger } from "../../utils/logger";

export const produceNotificationEvent = async (payload: {
  userId: string;
  type: string;
  channel: string;
  to: string;
  status: "sent" | "failed";
  error?: string;
  correlationId?: string;
}) => {
  const producer = kafka.producer();
  await producer.connect();

  try {
    await producer.send({
      topic: "notifications",
      messages: [
        {
          value: JSON.stringify(payload),
          headers: { correlationId: payload.correlationId || "unknown" },
        },
      ],
    });
    logger.info({
      context: "notificationProducer",
      message: "Notification event produced",
      payload,
    });
  } catch (err: any) {
    logger.error({
      context: "notificationProducer",
      error: err.message,
      details: err.stack,
      payload,
    });
    throw err;
  } finally {
    await producer.disconnect();
  }
};