import { Router } from "express";
import {
  createProduct,
  getProduct,
  updateProduct,
  deleteProduct,
  publishProduct,
  unpublishProduct,
  adjustStock,
  listProducts,
  productMiddleware,
} from "../controllers/product.controller";
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
    correlationId: req.correlationId,
  });
  next();
});

/**
 * @route POST /products
 * @desc Create a new product
 * @access Vendor
 */
router.post(
  "/",
  requireAuth,
  requireRole(["vendor"]),
  productMiddleware.validateProductInput,
  productMiddleware.rateLimit,
  createProduct
);

/**
 * @route GET /products/:id
 * @desc Get a product by ID
 * @access Public
 */
router.get(
  "/:id",
  productMiddleware.validateProductId,
  productMiddleware.rateLimit,
  getProduct
);

/**
 * @route PATCH /products/:id
 * @desc Update a product
 * @access Vendor
 */
router.patch(
  "/:id",
  requireAuth,
  requireRole(["vendor"]),
  productMiddleware.validateProductInput,
  productMiddleware.rateLimit,
  updateProduct
);

/**
 * @route DELETE /products/:id
 * @desc Delete a product
 * @access Vendor
 */
router.delete(
  "/:id",
  requireAuth,
  requireRole(["vendor"]),
  productMiddleware.validateProductId,
  productMiddleware.rateLimit,
  deleteProduct
);

/**
 * @route POST /products/:id/publish
 * @desc Publish a product
 * @access Vendor
 */
router.post(
  "/:id/publish",
  requireAuth,
  requireRole(["vendor"]),
  productMiddleware.validateProductId,
  productMiddleware.rateLimit,
  publishProduct
);

/**
 * @route POST /products/:id/unpublish
 * @desc Unpublish a product
 * @access Vendor
 */
router.post(
  "/:id/unpublish",
  requireAuth,
  requireRole(["vendor"]),
  productMiddleware.validateProductId,
  productMiddleware.rateLimit,
  unpublishProduct
);

/**
 * @route POST /products/:id/adjust-stock
 * @desc Adjust product stock
 * @access Vendor
 */
router.post(
  "/:id/adjust-stock",
  requireAuth,
  requireRole(["vendor"]),
  productMiddleware.validateStockAdjustment,
  productMiddleware.rateLimit,
  adjustStock
);

/**
 * @route GET /products
 * @desc Get all products with pagination and filtering
 * @access Public
 */
router.get(
  "/",
  productMiddleware.validatePagination,
  productMiddleware.rateLimit,
  listProducts
);

export default router;