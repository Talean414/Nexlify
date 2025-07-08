import { Request, Response, NextFunction } from "express";
import { body, param, validationResult } from "express-validator";
import { vendorService } from "../services/vendor.service";
import { logger } from "../utils/logger";
import { requireAuth, requireRole } from "@shared/utils/auth/requireAuth";

interface SuccessResponse<T = any> {
  success: true;
  message?: string;
  data?: T;
}

interface ErrorResponse {
  success: false;
  error: string;
  errorCode: string;
  details?: string;
}

class ApiError extends Error {
  constructor(
    public status: number,
    public error: string,
    public errorCode: string,
    public details?: string
  ) {
    super(error);
  }
}

const validateVendorInput = [
  body("businessName").notEmpty().withMessage("Business name is required"),
  body("ownerName").notEmpty().withMessage("Owner name is required"),
  body("email").isEmail().withMessage("Valid email is required"),
  body("phone").matches(/^\+254\d{9}$/).withMessage("Phone must be in +254 format"),
  body("location").notEmpty().withMessage("Location is required"),
  body("password").isLength({ min: 8 }).withMessage("Password must be at least 8 characters"),
];

const validateVendorId = [
  param("id").isUUID().withMessage("Vendor ID must be a valid UUID"),
];

const validateStatusUpdate = [
  param("id").isUUID().withMessage("Vendor ID must be a valid UUID"),
  body("status").isIn(["pending", "approved", "rejected"]).withMessage("Invalid status"),
];

export async function apply(req: Request, res: Response) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ApiError(400, "Invalid input", "INVALID_INPUT", errors.array().map(e => e.msg).join(", "));
    }

    const vendor = await vendorService.createVendor(req.body, req.correlationId);
    logger.info({
      context: "vendorController.apply",
      message: "Vendor application submitted",
      vendorId: vendor.id,
      correlationId: req.correlationId,
    });
    return res.status(201).json({ success: true, message: "Vendor application submitted", data: vendor } as SuccessResponse);
  } catch (err: any) {
    const error = err instanceof ApiError ? err : new ApiError(500, "Failed to submit vendor application", "INTERNAL_SERVER_ERROR", err.message);
    logger.error({
      context: "vendorController.apply",
      error: error.error,
      errorCode: error.errorCode,
      details: error.details,
      correlationId: req.correlationId,
    });
    return res.status(error.status).json({
      success: false,
      error: error.error,
      errorCode: error.errorCode,
      details: process.env.NODE_ENV === "development" ? error.details : undefined,
    } as ErrorResponse);
  }
}

export async function list(req: Request, res: Response) {
  try {
    const vendors = await vendorService.getAllVendors(req.correlationId);
    logger.info({
      context: "vendorController.list",
      message: "Vendors retrieved",
      count: vendors.length,
      correlationId: req.correlationId,
    });
    return res.json({ success: true, data: vendors } as SuccessResponse);
  } catch (err: any) {
    const error = err instanceof ApiError ? err : new ApiError(500, "Failed to retrieve vendors", "INTERNAL_SERVER_ERROR", err.message);
    logger.error({
      context: "vendorController.list",
      error: error.error,
      errorCode: error.errorCode,
      details: error.details,
      correlationId: req.correlationId,
    });
    return res.status(error.status).json({
      success: false,
      error: error.error,
      errorCode: error.errorCode,
      details: process.env.NODE_ENV === "development" ? error.details : undefined,
    } as ErrorResponse);
  }
}

export async function approveOrReject(req: Request, res: Response) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ApiError(400, "Invalid input", "INVALID_INPUT", errors.array().map(e => e.msg).join(", "));
    }

    const { id } = req.params;
    const { status } = req.body;
    const vendor = await vendorService.updateVendorStatus(id, status, req.correlationId);
    logger.info({
      context: "vendorController.approveOrReject",
      message: `Vendor status updated to ${status}`,
      vendorId: id,
      correlationId: req.correlationId,
    });
    return res.json({ success: true, data: vendor } as SuccessResponse);
  } catch (err: any) {
    const error = err instanceof ApiError ? err : new ApiError(500, "Failed to update vendor status", "INTERNAL_SERVER_ERROR", err.message);
    logger.error({
      context: "vendorController.approveOrReject",
      error: error.error,
      errorCode: error.errorCode,
      details: error.details,
      vendorId: req.params.id,
      correlationId: req.correlationId,
    });
    return res.status(error.status).json({
      success: false,
      error: error.error,
      errorCode: error.errorCode,
      details: process.env.NODE_ENV === "development" ? error.details : undefined,
    } as ErrorResponse);
  }
}

export async function getVendor(req: Request, res: Response) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ApiError(400, "Invalid vendor ID", "INVALID_UUID", errors.array().map(e => e.msg).join(", "));
    }

    const vendor = await vendorService.getVendorById(req.params.id, req.correlationId);
    if (!vendor) {
      throw new ApiError(404, "Vendor not found", "NOT_FOUND");
    }
    logger.info({
      context: "vendorController.getVendor",
      message: "Vendor retrieved",
      vendorId: req.params.id,
      correlationId: req.correlationId,
    });
    return res.json({ success: true, data: vendor } as SuccessResponse);
  } catch (err: any) {
    const error = err instanceof ApiError ? err : new ApiError(500, "Failed to retrieve vendor", "INTERNAL_SERVER_ERROR", err.message);
    logger.error({
      context: "vendorController.getVendor",
      error: error.error,
      errorCode: error.errorCode,
      details: error.details,
      vendorId: req.params.id,
      correlationId: req.correlationId,
    });
    return res.status(error.status).json({
      success: false,
      error: error.error,
      errorCode: error.errorCode,
      details: process.env.NODE_ENV === "development" ? error.details : undefined,
    } as ErrorResponse);
  }
}

export const vendorMiddleware = {
  validateVendorInput,
  validateVendorId,
  validateStatusUpdate,
};