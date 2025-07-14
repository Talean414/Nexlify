import AfricasTalking from "africastalking";
import dotenv from "dotenv";
import { logger } from "../utils/logger";

dotenv.config();

const at = AfricasTalking({
  apiKey: process.env.AT_API_KEY!,
  username: process.env.AT_USERNAME!,
  environment: process.env.AT_ENV || "sandbox",
});

const sms = at.SMS;

export const sendSMS = async (to: string, message: string) => {
  try {
    const result = await sms.send({ to, message });
    logger.info({
      context: "smsService.sendSMS",
      message: "SMS sent successfully",
      to,
    });
    return result;
  } catch (err: any) {
    logger.error({
      context: "smsService.sendSMS",
      error: err.message,
      details: err.stack,
      to,
    });
    throw err;
  }
};