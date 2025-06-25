// src/controllers/notification.controller.ts
import { Request, Response } from "express";
import { sendSMS } from "@sms/sendSms";
import { sendEmail } from "@email/sendEmail";

export const sendEmailNotification = async (req: Request, res: Response) => {
  const { to, subject, message } = req.body;
  try {
    const info = await sendEmail(to, subject, message);
    res.status(200).json({ success: true, info });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

export const sendSMSNotification = async (req: Request, res: Response) => {
  const { to, message } = req.body;
  try {
    const info = await sendSMS(to, message);
    res.status(200).json({ success: true, info });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};