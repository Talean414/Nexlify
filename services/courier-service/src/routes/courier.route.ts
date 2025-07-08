import { Router } from "express";
import { v4 as uuidv4 } from "uuid";
import { logger } from "../utils/logger";
import { requireAuth, requireRole, AuthenticatedRequest } from "@shared/utils/auth/requireAuth";
import { validateCourierInput, validateCourierId, validateStatusUpdate, validateOrderAssignment, validateLocationUpdate } from "../middlewares/validation";
import { apply, list, getCourier, approveOrReject, assignOrder, updateLocation } from "../controllers/courier.controller";

const router = Router();

router.use((req: AuthenticatedRequest, res, next) => {
  req.correlationId = uuidv4();
  logger.debug({ context: "courier.route", message: "Request received", method: req.method, url: req.url, correlationId: req.correlationId });
  next();
});

/**
 * @route POST /api/couriers/apply
 * @desc Submit a courier application
 * @access Public
 */
router.post("/apply", validateCourierInput, apply);

/**
 * @route GET /api/couriers
 * @desc List all couriers
 * @access Admin
 */
router.get("/", requireAuth, requireRole(["admin"]), list);

/**
 * @route GET /api/couriers/:id
 * @desc Get a courier by ID
 * @access Courier, Admin
 */
router.get("/:id", requireAuth, requireRole(["courier", "admin"]), validateCourierId, getCourier);

/**
 * @route PATCH /api/couriers/:id/status
 * @desc Approve or reject a courier
 * @access Admin
 */
router.patch("/:id/status", requireAuth, requireRole(["admin"]), validateStatusUpdate, approveOrReject);

/**
 * @route POST /api/couriers/assign-order
 * @desc Assign an order to a courier
 * @access Admin
 */
router.post("/assign-order", requireAuth, requireRole(["admin"]), validateOrderAssignment, assignOrder);

/**
 * @route POST /api/couriers/location
 * @desc Update courier location
 * @access Courier
 */
router.post("/location", requireAuth, requireRole(["courier"]), validateLocationUpdate, updateLocation);

export default router;