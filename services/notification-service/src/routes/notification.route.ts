import { Router } from "express";
import { sendEmailNotification, sendSMSNotification, sendPushNotification } from "../controllers/notification.controller";
import { authMiddleware } from "../middlewares/auth.middleware";
import { rateLimitMiddleware } from "../middlewares/rateLimit.middleware";

const router = Router();

router.post("/email", authMiddleware, rateLimitMiddleware, sendEmailNotification);
router.post("/sms", authMiddleware, rateLimitMiddleware, sendSMSNotification);
router.post("/push", authMiddleware, rateLimitMiddleware, sendPushNotification);

export default router;