import { logger } from "../utils/logger";
import { sendEmail } from "./email.service";
import { sendSMS } from "./sms.service";
import { sendPush } from "./push.service";
import { RedisClient } from "../config/redis";
import { produceNotificationEvent } from "../events/producers/notification.producer";

export interface NotificationPayload {
  userId: string;
  type: "otp" | "order_placed" | "order_assigned" | "order_delivered" | "order_ready" | "system_alert";
  channel: "email" | "sms" | "push";
  to: string;
  subject?: string;
  message: string;
  title?: string; // For push notifications
  correlationId?: string;
}

export async function sendNotification(payload: NotificationPayload) {
  const { userId, type, channel, to, subject, message, title, correlationId } = payload;
  const cacheKey = `notification:${userId}:${type}:${Date.now()}`;
  const maxRetries = 3;

  // Check rate limit
  const sentCount = await RedisClient.get(`rate_limit:${userId}:${type}`);
  if (sentCount && parseInt(sentCount) >= 5) {
    throw new Error("Rate limit exceeded for notifications");
  }

  // Cache notification to prevent duplicates
  const cached = await RedisClient.get(cacheKey);
  if (cached) {
    logger.info({
      context: "notificationService.sendNotification",
      message: "Notification already sent",
      userId,
      type,
      correlationId,
    });
    return;
  }

  let attempts = 0;
  while (attempts < maxRetries) {
    try {
      let result;
      switch (channel) {
        case "email":
          result = await sendEmail(to, subject || `Nexlify ${type}`, message);
          break;
        case "sms":
          result = await sendSMS(to, message);
          break;
        case "push":
          result = await sendPush(to, title || `Nexlify ${type}`, message);
          break;
        default:
          throw new Error(`Unsupported channel: ${channel}`);
      }

      await RedisClient.set(cacheKey, "sent", { EX: 3600 }); // Cache for 1 hour
      await RedisClient.incr(`rate_limit:${userId}:${type}`);
      await RedisClient.expire(`rate_limit:${userId}:${type}`, 3600);

      // Produce event for tracking
      await produceNotificationEvent({ ...payload, status: "sent" });

      logger.info({
        context: "notificationService.sendNotification",
        message: "Notification sent successfully",
        userId,
        type,
        channel,
        to,
        correlationId,
      });
      return result;
    } catch (err: any) {
      attempts++;
      if (attempts === maxRetries) {
        // Fallback to alternative channel
        const fallbackChannel = channel === "email" ? "sms" : "email";
        if (fallbackChannel !== channel) {
          logger.warn({
            context: "notificationService.sendNotification",
            message: `Retrying with fallback channel ${fallbackChannel}`,
            userId,
            type,
            correlationId,
            error: err.message,
          });
          return sendNotification({ ...payload, channel: fallbackChannel });
        }
        logger.error({
          context: "notificationService.sendNotification",
          error: err.message,
          details: err.stack,
          userId,
          type,
          channel,
          correlationId,
        });
        await produceNotificationEvent({ ...payload, status: "failed", error: err.message });
        throw err;
      }
      await new Promise((resolve) => setTimeout(resolve, 1000 * attempts));
    }
  }
}