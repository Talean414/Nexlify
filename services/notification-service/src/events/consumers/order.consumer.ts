import { kafka } from "../../config/kafka";
import { logger } from "../../utils/logger";
import { sendNotification } from "../../services/notification.service";
import { getDB } from "../../config/db";

export const startOrderConsumer = async () => {
  const consumer = kafka.consumer({ groupId: "notification-order-group" });
  await consumer.connect();
  await consumer.subscribe({ topic: "order-events", fromBeginning: false });

  await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      const event = JSON.parse(message.value?.toString() || "{}");
      const correlationId = message.headers?.correlationId?.toString() || "unknown";

      try {
        const dbInstance = await getDB();
        const user = await dbInstance("users").where({ id: event.userId }).select("email").first();
        const vendor = event.vendorId ? await dbInstance("vendors").where({ id: event.vendorId }).select("email").first() : null;

        switch (event.type) {
          case "order_placed":
            // Notify customer
            await sendNotification({
              userId: event.userId,
              type: "order_placed",
              channel: "email",
              to: user.email,
              subject: "Order Confirmation",
              message: `Your order #${event.orderId} has been placed successfully.`,
              correlationId,
            });
            // Notify vendor
            if (vendor) {
              await sendNotification({
                userId: event.vendorId,
                type: "order_placed",
                channel: "email",
                to: vendor.email,
                subject: "New Order Received",
                message: `A new order #${event.orderId} has been placed.`,
                correlationId,
              });
            }
            break;
          case "order_delivered":
            await sendNotification({
              userId: event.userId,
              type: "order_delivered",
              channel: "push",
              to: event.deviceToken || user.email,
              title: "Order Delivered",
              message: `Your order #${event.orderId} has been delivered.`,
              correlationId,
            });
            break;
        }
      } catch (err: any) {
        logger.error({
          context: "orderConsumer",
          error: err.message,
          details: err.stack,
          event,
          correlationId,
        });
      }
    },
  });

  logger.info({
    context: "orderConsumer",
    message: "Order consumer started",
  });
};