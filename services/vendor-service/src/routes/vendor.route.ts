import { Router } from "express";
import {
  apply,
  list,
  approveOrReject,
  getVendor,
  vendorMiddleware,
} from "../controllers/vendor.controller";
import { requireAuth, requireRole } from "@shared/utils/auth/requireAuth";
import { v4 as uuidv4 } from "uuid";
import { logger } from "../utils/logger";

const router = Router();

// Middleware to add correlation ID
router.use((req: Request, res: Response, next: NextFunction) => {
  (req as any).correlationId = uuidv4();
  logger.debug({
    context: "vendor.route",
    message: "Request received",
    method: req.method,
    url: req.url,
    correlationId: req.correlationId,
  });
  next();
});

/**
 * @route POST /api/vendors/apply
 * @desc Submit a vendor application
 * @access Public
 */
router.post(
  "/apply",
  vendorMiddleware.validateVendorInput,
  apply
);

/**
 * @route GET /api/vendors
 * @desc List all vendors
 * @access Admin
 */
router.get(
  "/",
  requireAuth,
  requireRole(["admin"]),
  list
);

/**
 * @route GET /api/vendors/:id
 * @desc Get a vendor by ID
 * @access Vendor, Admin
 */
router.get(
  "/:id",
  requireAuth,
  requireRole(["vendor", "admin"]),
  vendorMiddleware.validateVendorId,
  getVendor
);

/**
 * @route PATCH /api/vendors/:id/status
 * @desc Approve or reject a vendor
 * @access Admin
 */
router.patch(
  "/:id/status",
  requireAuth,
  requireRole(["admin"]),
  vendorMiddleware.validateStatusUpdate,
  approveOrReject
);

export default router;