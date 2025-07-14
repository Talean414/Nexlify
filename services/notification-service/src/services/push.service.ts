import admin from "firebase-admin";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { logger } from "../utils/logger";

dotenv.config();

// Resolve and parse the Firebase service account JSON
const serviceAccountPath = path.resolve(process.env.FIREBASE_CREDENTIALS_PATH!);
const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, "utf-8"));

// Initialize Firebase Admin SDK with the parsed credentials
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

export const sendPush = async (to: string, title: string, body: string) => {
  const message = {
    token: to,
    notification: {
      title,
      body,
    },
  };

  try {
    const response = await admin.messaging().send(message);
    logger.info({
      context: "pushService.sendPush",
      message: "Push notification sent successfully",
      to,
      title,
    });
    return response;
  } catch (err: any) {
    logger.error({
      context: "pushService.sendPush",
      error: err.message,
      details: err.stack,
      to,
      title,
    });
    throw err;
  }
};