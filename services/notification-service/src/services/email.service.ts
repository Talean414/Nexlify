import nodemailer from "nodemailer";
import dotenv from "dotenv";
import { logger } from "../utils/logger";

dotenv.config();

const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

export const sendEmail = async (to: string, subject: string, text: string) => {
  const mailOptions = {
    from: `"Nexlify" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    text,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    logger.info({
      context: "emailService.sendEmail",
      message: "Email sent successfully",
      to,
      subject,
    });
    return info;
  } catch (err: any) {
    logger.error({
      context: "emailService.sendEmail",
      error: err.message,
      details: err.stack,
      to,
      subject,
    });
    throw err;
  }
};