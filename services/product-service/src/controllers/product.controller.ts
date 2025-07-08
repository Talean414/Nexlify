import { Request, Response, NextFunction } from "express";
import { validate as isUUID } from "uuid";
import { body, param, query, validationResult } from "express-validator";
import rateLimit from "express-rate-limit";
import { productService } from "../services/product.service";
import { fetchUserById } from "../utils/fetchUser";
import { logger } from "../utils/logger";
import { AuthenticatedRequest } from "@shared/utils/auth/requireAuth";

// Define interfaces
interface ProductInput {
  name: string;
  description?: string;
  price: number;
  stock: number;
  category: string;
  imageUrl?: string;
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

// Custom error class
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
const validateProductInput = [
  body("name").notEmpty().withMessage("Name is required"),
  body("description").optional().isString().withMessage("Description must be a string"),
  body("price").isFloat({ min: 0 }).withMessage("Price must be a non-negative number"),
  body("stock").isInt({ min: 0 }).withMessage("Stock must be a non-negative integer"),
  body("category").notEmpty().withMessage("Category is required"),
  body("imageUrl").optional().isURL().withMessage("Image URL must be a valid URL"),
];

const validateProductId = [
  param("id").isUUID().withMessage("Product ID must be a valid UUID"),
];

const validateStockAdjustment = [
  param("id").isUUID().withMessage("Product ID must be a valid UUID"),
  body("quantity").isInt().withMessage("Quantity must be an integer"),
];

const validatePagination = [
  query("limit").optional().isInt({ min: 1 }).withMessage("Limit must be a positive integer"),
  query("offset").optional().isInt({ min: 0 }).withMessage("Offset must be a non-negative integer"),
  query("vendorId").optional().isUUID().withMessage("Vendor ID must be a valid UUID"),
  query("category").optional().isString().withMessage("Category must be a string"),
  query("isPublished").optional().isBoolean().withMessage("isPublished must be a boolean"),
];

// Rate limiting middleware
const rateLimitMiddleware = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: {
    success: false,
    error: "Too many requests",
    errorCode: "RATE_LIMIT_EXCEEDED",
  } as ErrorResponse,
  keyGenerator: (req: AuthenticatedRequest) => req.user?.userId || "anonymous",
});

// Vendor validation middleware
async function restrictToVendor(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.userId;
    const correlationId = req.correlationId || "unknown";
    if (!userId || !isUUID(userId)) {
      throw new ApiError(401, "Invalid user authentication", "INVALID_AUTH");
    }

    req.userCache = req.userCache || new Map();
    let user = req.userCache.get(userId);
    if (!user) {
      user = await fetchUserById(userId);
      req.userCache.set(userId, user);
    }

    if (!user || user.role !== "vendor" || !user.email_verified) {
      throw new ApiError(403, "Unauthorized: must be a verified vendor", "UNAUTHORIZED");
    }
    next();
  } catch (err: any) {
    const error = err instanceof ApiError ? err : new ApiError(500, "Internal server error", "INTERNAL_SERVER_ERROR", err.message);
    logger.error({
      context: "restrictToVendor",
      error: error.error,
      errorCode: error.errorCode,
      details: error.details,
      userId: req.user?.userId,
      correlationId,
    });
    res.status(error.status).json({
      success: false,
      error: error.error,
      errorCode: error.errorCode,
      details: process.env.NODE_ENV === "development" ? error.details : undefined,
    } as ErrorResponse);
  }
}

/**
 * @route POST /products
 * @desc Create a new product
 * @access Vendor
 */
export async function createProduct(req: AuthenticatedRequest, res: Response) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ApiError(400, "Invalid product input", "INVALID_INPUT", errors.array().map(e => e.msg).join(", "));
    }

    const input = req.body as ProductInput;
    const vendorId = req.user!.userId;
    const correlationId = req.correlationId || "unknown";

    const product = await productService.createProduct(input, vendorId, correlationId);
    logger.info({
      context: "createProduct",
      message: "Product created successfully",
      productId: product.id,
      vendorId,
      correlationId,
    });
    return res.status(201).json({ success: true, data: product } as SuccessResponse);
  } catch (err: any) {
    const error = err instanceof ApiError ? err : new ApiError(500, "Failed to create product", "INTERNAL_SERVER_ERROR", err.message);
    logger.error({
      context: "createProduct",
      error: error.error,
      errorCode: error.errorCode,
      details: error.details,
      vendorId: req.user?.userId,
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

/**
 * @route GET /products/:id
 * @desc Get a product by ID
 * @access Public
 */
export async function getProduct(req: AuthenticatedRequest, res: Response) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ApiError(400, "Invalid product ID", "INVALID_UUID", errors.array().map(e => e.msg).join(", "));
    }

    const { id } = req.params;
    const correlationId = req.correlationId || "unknown";

    const product = await productService.getProductById(id, correlationId);
    if (!product) {
      throw new ApiError(404, "Product not found or not published", "NOT_FOUND");
    }

    logger.info({
      context: "getProduct",
      message: "Product retrieved",
      productId: id,
      correlationId,
    });
    return res.status(200).json({ success: true, data: product } as SuccessResponse);
  } catch (err: any) {
    const error = err instanceof ApiError ? err : new ApiError(500, "Failed to retrieve product", "INTERNAL_SERVER_ERROR", err.message);
    logger.error({
      context: "getProduct",
      error: error.error,
      errorCode: error.errorCode,
      details: error.details,
      productId: req.params.id,
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

/**
 * @route PATCH /products/:id
 * @desc Update a product
 * @access Vendor
 */
export async function updateProduct(req: AuthenticatedRequest, res: Response) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ApiError(400, "Invalid input", "INVALID_INPUT", errors.array().map(e => e.msg).join(", "));
    }

    const { id } = req.params;
    const input = req.body as Partial<ProductInput>;
    const vendorId = req.user!.userId;
    const correlationId = req.correlationId || "unknown";

    const product = await productService.updateProduct(id, input, vendorId, correlationId);
    logger.info({
      context: "updateProduct",
      message: "Product updated",
      productId: id,
      vendorId,
      correlationId,
    });
    return res.status(200).json({ success: true, data: product } as SuccessResponse);
  } catch (err: any) {
    const error = err instanceof ApiError ? err : new ApiError(500, "Failed to update product", "INTERNAL_SERVER_ERROR", err.message);
    logger.error({
      context: "updateProduct",
      error: error.error,
      errorCode: error.errorCode,
      details: error.details,
      productId: req.params.id,
      vendorId: req.user?.userId,
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

/**
 * @route DELETE /products/:id
 * @desc Delete a product
 * @access Vendor
 */
export async function deleteProduct(req: AuthenticatedRequest, res: Response) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ApiError(400, "Invalid product ID", "INVALID_UUID", errors.array().map(e => e.msg).join(", "));
    }

    const { id } = req.params;
    const vendorId = req.user!.userId;
    const correlationId = req.correlationId || "unknown";

    await productService.deleteProduct(id, vendorId, correlationId);
    logger.info({
      context: "deleteProduct",
      message: "Product deleted",
      productId: id,
      vendorId,
      correlationId,
    });
    return res.status(200).json({ success: true, message: "Product deleted" } as SuccessResponse);
  } catch (err: any) {
    const error = err instanceof ApiError ? err : new ApiError(500, "Failed to delete product", "INTERNAL_SERVER_ERROR", err.message);
    logger.error({
      context: "deleteProduct",
      error: error.error,
      errorCode: error.errorCode,
      details: error.details,
      productId: req.params.id,
      vendorId: req.user?.userId,
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

/**
 * @route POST /products/:id/publish
 * @desc Publish a product
 * @access Vendor
 */
export async function publishProduct(req: AuthenticatedRequest, res: Response) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ApiError(400, "Invalid product ID", "INVALID_UUID", errors.array().map(e => e.msg).join(", "));
    }

    const { id } = req.params;
    const vendorId = req.user!.userId;
    const correlationId = req.correlationId || "unknown";

    const product = await productService.publishProduct(id, vendorId, correlationId);
    logger.info({
      context: "publishProduct",
      message: "Product published",
      productId: id,
      vendorId,
      correlationId,
    });
    return res.status(200).json({ success: true, data: product } as SuccessResponse);
  } catch (err: any) {
    const error = err instanceof ApiError ? err : new ApiError(500, "Failed to publish product", "INTERNAL_SERVER_ERROR", err.message);
    logger.error({
      context: "publishProduct",
      error: error.error,
      errorCode: error.errorCode,
      details: error.details,
      productId: req.params.id,
      vendorId: req.user?.userId,
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

/**
 * @route POST /products/:id/unpublish
 * @desc Unpublish a product
 * @access Vendor
 */
export async function unpublishProduct(req: AuthenticatedRequest, res: Response) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ApiError(400, "Invalid product ID", "INVALID_UUID", errors.array().map(e => e.msg).join(", "));
    }

    const { id } = req.params;
    const vendorId = req.user!.userId;
    const correlationId = req.correlationId || "unknown";

    const product = await productService.unpublishProduct(id, vendorId, correlationId);
    logger.info({
      context: "unpublishProduct",
      message: "Product unpublished",
      productId: id,
      vendorId,
      correlationId,
    });
    return res.status(200).json({ success: true, data: product } as SuccessResponse);
  } catch (err: any) {
    const error = err instanceof ApiError ? err : new ApiError(500, "Failed to unpublish product", "INTERNAL_SERVER_ERROR", err.message);
    logger.error({
      context: "unpublishProduct",
      error: error.error,
      errorCode: error.errorCode,
      details: error.details,
      productId: req.params.id,
      vendorId: req.user?.userId,
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

/**
 * @route POST /products/:id/adjust-stock
 * @desc Adjust product stock
 * @access Vendor
 */
export async function adjustStock(req: AuthenticatedRequest, res: Response) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ApiError(400, "Invalid input", "INVALID_INPUT", errors.array().map(e => e.msg).join(", "));
    }

    const { id } = req.params;
    const { quantity } = req.body;
    const vendorId = req.user!.userId;
    const correlationId = req.correlationId || "unknown";

    const product = await productService.adjustStock(id, vendorId, quantity, correlationId);
    logger.info({
      context: "adjustStock",
      message: `Stock adjusted by ${quantity}`,
      productId: id,
      vendorId,
      correlationId,
    });
    return res.status(200).json({ success: true, data: product } as SuccessResponse);
  } catch (err: any) {
    const error = err instanceof ApiError ? err : new ApiError(500, "Failed to adjust stock", "INTERNAL_SERVER_ERROR", err.message);
    logger.error({
      context: "adjustStock",
      error: error.error,
      errorCode: error.errorCode,
      details: error.details,
      productId: req.params.id,
      vendorId: req.user?.userId,
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

/**
 * @route GET /products
 * @desc Get all products with pagination and filtering
 * @access Public
 */
export async function listProducts(req: AuthenticatedRequest, res: Response) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ApiError(400, "Invalid pagination or filter parameters", "INVALID_INPUT", errors.array().map(e => e.msg).join(", "));
    }

    const limit = parseInt(req.query.limit as string, 10) || 10;
    const offset = parseInt(req.query.offset as string, 10) || 0;
    const vendorId = req.query.vendorId as string | undefined;
    const category = req.query.category as string | undefined;
    const isPublished = req.query.isPublished ? req.query.isPublished === "true" : undefined;
    const correlationId = req.correlationId || "unknown";

    const { products, total } = await productService.listProducts(
      limit,
      offset,
      { vendorId, category, isPublished },
      correlationId
    );
    logger.info({
      context: "listProducts",
      message: "Products retrieved",
      count: products.length,
      filters: { vendorId, category, isPublished },
      correlationId,
    });
    return res.status(200).json({ success: true, data: { products, total } } as SuccessResponse);
  } catch (err: any) {
    const error = err instanceof ApiError ? err : new ApiError(500, "Failed to retrieve products", "INTERNAL_SERVER_ERROR", err.message);
    logger.error({
      context: "listProducts",
      error: error.error,
      errorCode: error.errorCode,
      details: error.details,
      filters: { vendorId: req.query.vendorId, category: req.query.category, isPublished: req.query.isPublished },
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

// Export middleware
export const productMiddleware = {
  validateProductInput,
  validateProductId,
  validateStockAdjustment,
  validatePagination,
  restrictToVendor,
  rateLimit: rateLimitMiddleware,
};