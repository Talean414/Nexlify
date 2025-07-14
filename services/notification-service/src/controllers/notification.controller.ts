import { Request, Response } from "express";
import { logger } from "../utils/logger";
import { sendEmail } from "../services/email.service";
import { sendSMS } from "../services/sms.service";
import { sendPush } from "../services/push.service";

export const sendEmailNotification = async (req: Request, res: Response) => {
  const { to, subject, message } = req.body;
  const correlationId = req.correlationId || "unknown";
  try {
    const info = await sendEmail(to, subject, message);
    logger.info({
      context: "notificationController.sendEmailNotification",
      message: "Email sent successfully",
      to,
      subject,
      correlationId,
    });
    res.status(200).json({ success: true, info });
  } catch (err: any) {
    logger.error({
      context: "notificationController.sendEmailNotification",
      error: err.message,
      details: err.stack,
      to,
      subject,
      correlationId,
    });
    res.status(500).json({ success: false, error: err.message });
  }
};

export const sendSMSNotification = async (req: Request, res: Response) => {
  const { to, message } = req.body;
  const correlationId = req.correlationId || "unknown";
  try {
    const info = await sendSMS(to, message);
    logger.info({
      context: "notificationController.sendSMSNotification",
      message: "SMS sent successfully",
      to,
      correlationId,
    });
    res.status(200).json({ success: true, info });
  } catch (err: any) {
    logger.error({
      context: "notificationController.sendSMSNotification",
      error: err.message,
      details: err.stack,
      to,
      correlationId,
    });
    res.status(500).json({ success: false, error: err.message });
  }
};

export const sendPushNotification = async (req: Request, res: Response) => {
  const { to, title, body } = req.body;
  const correlationId = req.correlationId || "unknown";
  try {
    const info = await sendPush(to, title, body);
    logger.info({
      context: "notificationController.sendPushNotification",
      message: "Push notification sent successfully",
      to,
      correlationId,
    });
    res.status(200).json({ success: true, info });
  } catch (err: any) {
    logger.error({
      context: "notificationController.sendPushNotification",
      error: err.message,
      details: err.stack,
      to,
      correlationId,
    });
    res.status(500).json({ success: false, error: err.message });
  }
};