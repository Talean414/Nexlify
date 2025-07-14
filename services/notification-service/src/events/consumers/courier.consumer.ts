import { kafka } from "../../config/kafka";
import { logger } from "../../utils/logger";
import { sendNotification } from "../../services/notification.service";
import { getDB } from "../../config/db";

export const startCourierConsumer = async () => {
  const consumer = kafka.consumer({ groupId: "notification-courier-group" });
  await consumer.connect();
  await consumer.subscribe({ topic: "courier-events", fromBeginning: false });

  await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      const event = JSON.parse(message.value?.toString() || "{}");
      const correlationId = message.headers?.correlationId?.toString() || "unknown";

      try {
        const dbInstance = await getDB();
        const courier = await dbInstance("couriers").where({ id: event.courierId }).select("email", "device_token").first();

        if (event.type === "order_assigned") {
          await sendNotification({
            userId: event.courierId,
            type: "order_assigned",
            channel: "push",
            to: courier.device_token || courier.email,
            title: "New Order Assigned",
            message: `Order #${event.orderId} is awaiting pickup.`,
            correlationId,
          });
        }
      } catch (err: any) {
        logger.error({
          context: "courierConsumer",
          error: err.message,
          details: err.stack,
          event,
          correlationId,
        });
      }
    },
  });

  logger.info({
    context: "courierConsumer",
    message: "Courier consumer started",
  });
};