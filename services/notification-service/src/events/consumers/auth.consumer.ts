import { kafka } from "../../config/kafka";
import { logger } from "../../utils/logger";
import { sendNotification } from "../../services/notification.service";
import { getDB } from "../../config/db";

export const startAuthConsumer = async () => {
  const consumer = kafka.consumer({ groupId: "notification-auth-group" });
  await consumer.connect();
  await consumer.subscribe({ topic: "auth-events", fromBeginning: false });

  await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      const event = JSON.parse(message.value?.toString() || "{}");
      const correlationId = message.headers?.correlationId?.toString() || "unknown";

      try {
        const dbInstance = await getDB();
        const user = await dbInstance("users").where({ id: event.userId }).select("email").first();
        if (!user) {
          throw new Error("User not found");
        }

        if (event.type === "otp") {
          await sendNotification({
            userId: event.userId,
            type: "otp",
            channel: "email",
            to: user.email,
            subject: "Your OTP Code",
            message: `Your OTP code is ${event.code}. It expires in 5 minutes.`,
            correlationId,
          });
        }
      } catch (err: any) {
        logger.error({
          context: "authConsumer",
          error: err.message,
          details: err.stack,
          event,
          correlationId,
        });
      }
    },
  });

  logger.info({
    context: "authConsumer",
    message: "Auth consumer started",
  });
};