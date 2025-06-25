// src/routes/notification.route.ts
import { Router } from "express";
import {
  sendEmailNotification,
  sendSMSNotification,
} from "../controllers/notification.controller";

const router = Router();

router.post("/email", sendEmailNotification);
router.post("/sms", sendSMSNotification);

export default router;