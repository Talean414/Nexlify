import { Router } from "express";
import {
  placeOrder,
  vendorAction,
  assignCourier,
  markOrderDelivered,
  orderMiddleware
} from "../controllers/order.controller";
import { requireAuth, requireRole } from "@shared/utils/auth/requireAuth";
import { v4 as uuidv4 } from "uuid";
import { logger } from "../utils/logger";

const router = Router();

// Middleware to add correlation ID
router.use((req: Request, res: Response, next: NextFunction) => {
  (req as any).correlationId = uuidv4();
  logger.debug({
    context: "route",
    message: "Request received",
    method: req.method,
    url: req.url,
    correlationId: req.correlationId
  });
  next();
});

/**
 * @route POST /orders
 * @desc Create a new order
 * @access Customer
 */
router.post(
  "/",
  requireAuth,
  requireRole(["customer"]),
  orderMiddleware.validateOrderInput,
  orderMiddleware.rateLimit,
  placeOrder
);

/**
 * @route PATCH /orders/:id/action
 * @desc Approve or reject an order
 * @access Vendor
 */
router.patch(
  "/:id/action",
  requireAuth,
  requireRole(["vendor"]),
  orderMiddleware.validateVendorAction,
  orderMiddleware.rateLimit,
  vendorAction
);

/**
 * @route PATCH /orders/:id/assign
 * @desc Assign a courier to an order
 * @access Courier
 */
router.patch(
  "/:id/assign",
  requireAuth,
  requireRole(["courier"]),
  orderMiddleware.validateOrderId,
  orderMiddleware.rateLimit,
  assignCourier
);

/**
 * @route PATCH /orders/:id/delivered
 * @desc Mark an order as delivered
 * @access Courier
 */
router.patch(
  "/:id/delivered",
  requireAuth,
  requireRole(["courier"]),
  orderMiddleware.validateOrderId,
  orderMiddleware.rateLimit,
  markOrderDelivered
);

export default router;