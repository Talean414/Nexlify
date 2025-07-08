import { body, param, validationResult } from "express-validator";
import { Request, Response, NextFunction } from "express";
import { logger } from "../utils/logger";

export const validateCourierInput = [
  body("name").notEmpty().withMessage("Name is required"),
  body("email").isEmail().withMessage("Valid email is required"),
  body("phone").matches(/^\+254\d{9}$/).withMessage("Phone must be in +254 format"),
  body("vehicleType").isIn(["bike", "car", "van"]).withMessage("Valid vehicle type required"),
  body("location").notEmpty().withMessage("Location is required"),
  body("password").isLength({ min: 8 }).withMessage("Password must be at least 8 characters"),
];

export const validateCourierId = [
  param("id").isUUID().withMessage("Courier ID must be a valid UUID"),
];

export const validateStatusUpdate = [
  param("id").isUUID().withMessage("Courier ID must be a valid UUID"),
  body("status").isIn(["pending", "approved", "rejected"]).withMessage("Invalid status"),
];

export const validateOrderAssignment = [
  param("id").isUUID().withMessage("Courier ID must be a valid UUID"),
  body("orderId").isUUID().withMessage("Order ID must be a valid UUID"),
];

export const validateLocationUpdate = [
  body("latitude").isFloat({ min: -90, max: 90 }).withMessage("Invalid latitude"),
  body("longitude").isFloat({ min: -180, max: 180 }).withMessage("Invalid longitude"),
];

export function validateRequest(req: Request, res: Response, next: NextFunction) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    logger.error({ context: "validationMiddleware", message: "Validation failed", errors: errors.array(), correlationId: (req as any).correlationId });
    return res.status(400).json({
      success: false,
      error: "Invalid input",
      errorCode: "INVALID_INPUT",
      details: errors.array().map(e => e.msg).join(", "),
    });
  }
  next();
}