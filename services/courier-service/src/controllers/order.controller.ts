import { Request, Response, NextFunction } from "express";
import { validate as isUUID } from "uuid";
import { body, param, validationResult } from "express-validator";
import rateLimit from "express-rate-limit";
import { orderService } from "../services/order.service";
import { fetchUserById } from "../utils/fetchUser";
import { logger } from "../utils/logger";
import { AuthenticatedRequest } from "@shared/utils/auth/requireAuth";

// Define interfaces for type safety
interface OrderInput {
  vendorId: string;
  items: Array<{ productId: string; quantity: number; price: number }>;
}

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

// Custom error class for standardized error handling
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

// Middleware for input sanitization
const validateOrderInput = [
  body("vendorId").isUUID().withMessage("Vendor ID must be a valid UUID"),
  body("items").isArray({ min: 1 }).withMessage("Items must be a non-empty array"),
  body("items.*.productId").isUUID().withMessage("Product ID must be a valid UUID"), // Changed from itemId
  body("items.*.quantity").isInt({ min: 1 }).withMessage("Quantity must be a positive integer"),
  body("items.*.price").isFloat({ min: 0 }).withMessage("Price must be a non-negative number"), // Added price validation
];

const validateVendorAction = [
  param("id").isUUID().withMessage("Order ID must be a valid UUID"),
  body("action").isIn(["approve", "reject"]).withMessage("Action must be 'approve' or 'reject'"),
];

const validateOrderId = [
  param("id").isUUID().withMessage("Order ID must be a valid UUID"),
];

// Rate limiting middleware
const rateLimitMiddleware = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: {
    success: false,
    error: "Too many requests",
    errorCode: "RATE_LIMIT_EXCEEDED"
  } as ErrorResponse,
  keyGenerator: (req: AuthenticatedRequest) => req.user?.userId || "anonymous"
});

// User validation middleware
async function restrictToRole(role: "customer" | "vendor" | "courier") {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.userId;
      const correlationId = req.correlationId || "unknown";
      if (!userId || !isUUID(userId)) {
        throw new ApiError(401, "Invalid user authentication", "INVALID_AUTH");
      }

      // Check request-scoped cache
      req.userCache = req.userCache || new Map();
      let user = req.userCache.get(userId);
      if (!user) {
        user = await fetchUserById(userId);
        req.userCache.set(userId, user);
      }

      if (!user || user.role !== role || !user.email_verified) {
        throw new ApiError(403, `Unauthorized: must be a verified ${role}`, "UNAUTHORIZED");
      }
      next();
    } catch (err: any) {
      const error = err instanceof ApiError ? err : new ApiError(500, "Internal server error", "INTERNAL_SERVER_ERROR", err.message);
      logger.error({
        context: `restrictToRole:${role}`,
        error: error.error,
        errorCode: error.errorCode,
        details: error.details,
        userId: req.user?.userId,
        correlationId
      });
      res.status(error.status).json({
        success: false,
        error: error.error,
        errorCode: error.errorCode,
        details: process.env.NODE_ENV === "development" ? error.details : undefined
      } as ErrorResponse);
    }
  };
}

/**
 * @route POST /orders
 * @desc Place a new order
 * @access Customer
 */
export async function placeOrder(req: AuthenticatedRequest, res: Response) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ApiError(400, "Invalid order input", "INVALID_INPUT", errors.array().map(e => e.msg).join(", "));
    }

    const { vendorId, items } = req.body as OrderInput;
    const customerId = req.user!.userId;
    const correlationId = req.correlationId || "unknown";

    const order = await orderService.createOrder({ customerId, vendorId, items }, correlationId);
    logger.info({
      context: "placeOrder",
      message: "Order created successfully",
      customerId,
      orderId: order.id,
      correlationId
    });
    return res.status(201).json({ success: true, data: order } as SuccessResponse);
  } catch (err: any) {
    const error = err instanceof ApiError ? err : new ApiError(500, "Failed to place order", "INTERNAL_SERVER_ERROR", err.message);
    logger.error({
      context: "placeOrder",
      error: error.error,
      errorCode: error.errorCode,
      details: error.details,
      customerId: req.user?.userId,
      correlationId: req.correlationId
    });
    return res.status(error.status).json({
      success: false,
      error: error.error,
      errorCode: error.errorCode,
      details: process.env.NODE_ENV === "development" ? error.details : undefined
    } as ErrorResponse);
  }
}

/**
 * @route PATCH /orders/:id/action
 * @desc Approve or reject an order
 * @access Vendor
 */
export async function vendorAction(req: AuthenticatedRequest, res: Response) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ApiError(400, "Invalid input", "INVALID_INPUT", errors.array().map(e => e.msg).join(", "));
    }

    const orderId = req.params.id;
    const { action } = req.body;
    const vendorId = req.user!.userId;
    const correlationId = req.correlationId || "unknown";

    const result = await orderService.vendorAction(orderId, action, correlationId);
    if (!result) {
      throw new ApiError(404, "Order not found or invalid", "NOT_FOUND");
    }

    logger.info({
      context: "vendorAction",
      message: `Order ${action}ed`,
      orderId,
      vendorId,
      correlationId
    });
    return res.json({ success: true, message: `Order ${action}ed`, data: result } as SuccessResponse);
  } catch (err: any) {
    const error = err instanceof ApiError ? err : new ApiError(500, "Failed to update order", "INTERNAL_SERVER_ERROR", err.message);
    logger.error({
      context: "vendorAction",
      error: error.error,
      errorCode: error.errorCode,
      details: error.details,
      vendorId: req.user?.userId,
      correlationId: req.correlationId
    });
    return res.status(error.status).json({
      success: false,
      error: error.error,
      errorCode: error.errorCode,
      details: process.env.NODE_ENV === "development" ? error.details : undefined
    } as ErrorResponse);
  }
}

/**
 * @route PATCH /orders/:id/assign
 * @desc Assign a courier to an order
 * @access Courier
 */
export async function assignCourier(req: AuthenticatedRequest, res: Response) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ApiError(400, "Invalid UUID", "INVALID_UUID", errors.array().map(e => e.msg).join(", "));
    }

    const { id } = req.params;
    const courierId = req.user!.userId;
    const correlationId = req.correlationId || "unknown";

    const order = await orderService.getOrderById(id, correlationId);
    if (!order) {
      throw new ApiError(404, "Order not found", "NOT_FOUND");
    }
    if (order.status !== "APPROVED") {
      throw new ApiError(400, "Order not ready for courier assignment", "INVALID_STATE");
    }

    const updatedOrder = await orderService.assignCourier(id, courierId, correlationId);
    logger.info({
      context: "assignCourier",
      message: "Courier assigned",
      orderId: id,
      courierId,
      correlationId
    });
    return res.status(200).json({ success: true, message: "Courier assigned", data: updatedOrder } as SuccessResponse);
  } catch (err: any) {
    const error = err instanceof ApiError ? err : new ApiError(500, "Failed to assign courier", "INTERNAL_SERVER_ERROR", err.message);
    logger.error({
      context: "assignCourier",
      error: error.error,
      errorCode: error.errorCode,
      details: error.details,
      courierId: req.user?.userId,
      correlationId: req.correlationId
    });
    return res.status(error.status).json({
      success: false,
      error: error.error,
      errorCode: error.errorCode,
      details: process.env.NODE_ENV === "development" ? error.details : undefined
    } as ErrorResponse);
  }
}

/**
 * @route PATCH /orders/:id/delivered
 * @desc Mark an order as delivered
 * @access Courier
 */
export async function markOrderDelivered(req: AuthenticatedRequest, res: Response) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ApiError(400, "Invalid UUID", "INVALID_UUID", errors.array().map(e => e.msg).join(", "));
    }

    const { id } = req.params;
    const courierId = req.user!.userId;
    const correlationId = req.correlationId || "unknown";

    const order = await orderService.getOrderById(id, correlationId);
    if (!order) {
      throw new ApiError(404, "Order not found", "NOT_FOUND");
    }
    if (order.status !== "EN_ROUTE") {
      throw new ApiError(400, "Order not in transit", "INVALID_STATE");
    }
    if (order.courier_id !== courierId) {
      throw new ApiError(403, "Courier not assigned to this order", "UNAUTHORIZED");
    }

    const updatedOrder = await orderService.markDelivered(id, correlationId);
    logger.info({
      context: "markOrderDelivered",
      message: "Order marked as delivered",
      orderId: id,
      courierId,
      correlationId
    });
    return res.status(200).json({ success: true, message: "Order delivered", data: updatedOrder } as SuccessResponse);
  } catch (err: any) {
    const error = err instanceof ApiError ? err : new ApiError(500, "Failed to mark as delivered", "INTERNAL_SERVER_ERROR", err.message);
    logger.error({
      context: "markOrderDelivered",
      error: error.error,
      errorCode: error.errorCode,
      details: error.details,
      courierId: req.user?.userId,
      correlationId: req.correlationId
    });
    return res.status(error.status).json({
      success: false,
      error: error.error,
      errorCode: error.errorCode,
      details: process.env.NODE_ENV === "development" ? error.details : undefined
    } as ErrorResponse);
  }
}

// Export middleware for use in routes
export const orderMiddleware = {
  validateOrderInput,
  validateVendorAction,
  validateOrderId,
  restrictToCustomer: restrictToRole("customer"),
  restrictToVendor: restrictToRole("vendor"),
  restrictToCourier: restrictToRole("courier"),
  rateLimit: rateLimitMiddleware
};