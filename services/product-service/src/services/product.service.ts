import { v4 as uuidv4 } from "uuid";
import { validate as isUUID } from "uuid";
import knex from "../config/db";
import { logger } from "../utils/logger";

// Define interfaces
interface ProductInput {
  name: string;
  description?: string;
  price: number;
  stock: number;
  category: string;
  imageUrl?: string;
}

interface Product {
  id: string;
  vendor_id: string;
  name: string;
  description?: string;
  price: number;
  stock: number;
  category: string;
  image_url?: string;
  is_published: boolean;
  created_at?: Date;
  updated_at?: Date;
}

// Custom error class
class ServiceError extends Error {
  constructor(
    public status: number,
    public error: string,
    public errorCode: string,
    public details?: string
  ) {
    super(error);
  }
}

export const productService = {
  /**
   * Creates a new product in a transaction
   * @param input - Product creation input
   * @param vendorId - Vendor ID
   * @param correlationId - Request correlation ID
   * @returns Created product
   */
  async createProduct(input: ProductInput, vendorId: string, correlationId?: string): Promise<Product> {
    try {
      if (!isUUID(vendorId)) {
        throw new ServiceError(400, "Invalid vendor ID", "INVALID_UUID");
      }
      if (!input.name || input.price < 0 || input.stock < 0 || !input.category) {
        throw new ServiceError(400, "Invalid product input", "INVALID_INPUT");
      }

      const productId = uuidv4();
      let product: Product;

      await knex.transaction(async (trx) => {
        const [inserted] = await trx("products")
          .insert({
            id: productId,
            vendor_id: vendorId,
            name: input.name,
            description: input.description || "",
            price: input.price,
            stock: input.stock,
            category: input.category,
            image_url: input.imageUrl || null,
            is_published: false,
            created_at: knex.fn.now(),
            updated_at: knex.fn.now(),
          })
          .returning(["id", "vendor_id", "name", "description", "price", "stock", "category", "image_url", "is_published", "created_at", "updated_at"]);
        product = inserted;
      });

      logger.info({
        context: "productService.createProduct",
        message: "Product created",
        productId,
        vendorId,
        correlationId,
      });
      return product!;
    } catch (err: any) {
      const error = err instanceof ServiceError ? err : new ServiceError(500, "Failed to create product", "INTERNAL_SERVER_ERROR", err.message);
      logger.error({
        context: "productService.createProduct",
        error: error.error,
        errorCode: error.errorCode,
        details: error.details,
        vendorId,
        correlationId,
      });
      throw error;
    }
  },

  /**
   * Retrieves a product by ID
   * @param id - Product ID
   * @param correlationId - Request correlation ID
   * @returns Product or undefined
   */
  async getProductById(id: string, correlationId?: string): Promise<Product | undefined> {
    try {
      if (!isUUID(id)) {
        throw new ServiceError(400, "Invalid product ID", "INVALID_UUID");
      }

      const product = await knex("products")
        .where({ id, is_published: true })
        .first()
        .select("id", "vendor_id", "name", "description", "price", "stock", "category", "image_url", "is_published", "created_at", "updated_at");

      if (product) {
        logger.debug({
          context: "productService.getProductById",
          message: "Product retrieved",
          productId: id,
          correlationId,
        });
      }
      return product;
    } catch (err: any) {
      const error = err instanceof ServiceError ? err : new ServiceError(500, "Failed to retrieve product", "INTERNAL_SERVER_ERROR", err.message);
      logger.error({
        context: "productService.getProductById",
        error: error.error,
        errorCode: error.errorCode,
        details: error.details,
        productId: id,
        correlationId,
      });
      throw error;
    }
  },

  /**
   * Updates a product
   * @param id - Product ID
   * @param input - Product update input
   * @param vendorId - Vendor ID
   * @param correlationId - Request correlation ID
   * @returns Updated product
   */
  async updateProduct(id: string, input: Partial<ProductInput>, vendorId: string, correlationId?: string): Promise<Product> {
    try {
      if (!isUUID(id) || !isUUID(vendorId)) {
        throw new ServiceError(400, "Invalid product or vendor ID", "INVALID_UUID");
      }
      if (input.price && input.price < 0) {
        throw new ServiceError(400, "Invalid price", "INVALID_INPUT");
      }
      if (input.stock && input.stock < 0) {
        throw new ServiceError(400, "Invalid stock", "INVALID_INPUT");
      }

      const [updated] = await knex("products")
        .where({ id, vendor_id: vendorId })
        .update({
          ...input,
          updated_at: knex.fn.now(),
        })
        .returning(["id", "vendor_id", "name", "description", "price", "stock", "category", "image_url", "is_published", "created_at", "updated_at"]);

      if (!updated) {
        throw new ServiceError(404, "Product not found or not owned by vendor", "NOT_FOUND");
      }

      logger.info({
        context: "productService.updateProduct",
        message: "Product updated",
        productId: id,
        vendorId,
        correlationId,
      });
      return updated;
    } catch (err: any) {
      const error = err instanceof ServiceError ? err : new ServiceError(500, "Failed to update product", "INTERNAL_SERVER_ERROR", err.message);
      logger.error({
        context: "productService.updateProduct",
        error: error.error,
        errorCode: error.errorCode,
        details: error.details,
        productId: id,
        vendorId,
        correlationId,
      });
      throw error;
    }
  },

  /**
   * Deletes a product
   * @param id - Product ID
   * @param vendorId - Vendor ID
   * @param correlationId - Request correlation ID
   * @returns True if deleted
   */
  async deleteProduct(id: string, vendorId: string, correlationId?: string): Promise<boolean> {
    try {
      if (!isUUID(id) || !isUUID(vendorId)) {
        throw new ServiceError(400, "Invalid product or vendor ID", "INVALID_UUID");
      }

      const deleted = await knex("products").where({ id, vendor_id: vendorId }).del();

      if (!deleted) {
        throw new ServiceError(404, "Product not found or not owned by vendor", "NOT_FOUND");
      }

      logger.info({
        context: "productService.deleteProduct",
        message: "Product deleted",
        productId: id,
        vendorId,
        correlationId,
      });
      return true;
    } catch (err: any) {
      const error = err instanceof ServiceError ? err : new ServiceError(500, "Failed to delete product", "INTERNAL_SERVER_ERROR", err.message);
      logger.error({
        context: "productService.deleteProduct",
        error: error.error,
        errorCode: error.errorCode,
        details: error.details,
        productId: id,
        vendorId,
        correlationId,
      });
      throw error;
    }
  },

  /**
   * Publishes a product
   * @param id - Product ID
   * @param vendorId - Vendor ID
   * @param correlationId - Request correlation ID
   * @returns Updated product
   */
  async publishProduct(id: string, vendorId: string, correlationId?: string): Promise<Product> {
    try {
      if (!isUUID(id) || !isUUID(vendorId)) {
        throw new ServiceError(400, "Invalid product or vendor ID", "INVALID_UUID");
      }

      const [updated] = await knex("products")
        .where({ id, vendor_id: vendorId })
        .update({
          is_published: true,
          updated_at: knex.fn.now(),
        })
        .returning(["id", "vendor_id", "name", "description", "price", "stock", "category", "image_url", "is_published", "created_at", "updated_at"]);

      if (!updated) {
        throw new ServiceError(404, "Product not found or not owned by vendor", "NOT_FOUND");
      }

      logger.info({
        context: "productService.publishProduct",
        message: "Product published",
        productId: id,
        vendorId,
        correlationId,
      });
      return updated;
    } catch (err: any) {
      const error = err instanceof ServiceError ? err : new ServiceError(500, "Failed to publish product", "INTERNAL_SERVER_ERROR", err.message);
      logger.error({
        context: "productService.publishProduct",
        error: error.error,
        errorCode: error.errorCode,
        details: error.details,
        productId: id,
        vendorId,
        correlationId,
      });
      throw error;
    }
  },

  /**
   * Unpublishes a product
   * @param id - Product ID
   * @param vendorId - Vendor ID
   * @param correlationId - Request correlation ID
   * @returns Updated product
   */
  async unpublishProduct(id: string, vendorId: string, correlationId?: string): Promise<Product> {
    try {
      if (!isUUID(id) || !isUUID(vendorId)) {
        throw new ServiceError(400, "Invalid product or vendor ID", "INVALID_UUID");
      }

      const [updated] = await knex("products")
        .where({ id, vendor_id: vendorId })
        .update({
          is_published: false,
          updated_at: knex.fn.now(),
        })
        .returning(["id", "vendor_id", "name", "description", "price", "stock", "category", "image_url", "is_published", "created_at", "updated_at"]);

      if (!updated) {
        throw new ServiceError(404, "Product not found or not owned by vendor", "NOT_FOUND");
      }

      logger.info({
        context: "productService.unpublishProduct",
        message: "Product unpublished",
        productId: id,
        vendorId,
        correlationId,
      });
      return updated;
    } catch (err: any) {
      const error = err instanceof ServiceError ? err : new ServiceError(500, "Failed to unpublish product", "INTERNAL_SERVER_ERROR", err.message);
      logger.error({
        context: "productService.unpublishProduct",
        error: error.error,
        errorCode: error.errorCode,
        details: error.details,
        productId: id,
        vendorId,
        correlationId,
      });
      throw error;
    }
  },

  /**
   * Adjusts product stock
   * @param id - Product ID
   * @param vendorId - Vendor ID
   * @param delta - Stock change (positive or negative)
   * @param correlationId - Request correlation ID
   * @returns Updated product
   */
  async adjustStock(id: string, vendorId: string, delta: number, correlationId?: string): Promise<Product> {
    try {
      if (!isUUID(id) || !isUUID(vendorId)) {
        throw new ServiceError(400, "Invalid product or vendor ID", "INVALID_UUID");
      }
      if (!Number.isInteger(delta)) {
        throw new ServiceError(400, "Invalid stock delta", "INVALID_INPUT");
      }

      let product: Product;
      await knex.transaction(async (trx) => {
        const [existing] = await trx("products").where({ id, vendor_id: vendorId }).select("stock");
        if (!existing) {
          throw new ServiceError(404, "Product not found or not owned by vendor", "NOT_FOUND");
        }
        if (existing.stock + delta < 0) {
          throw new ServiceError(400, "Stock cannot be negative", "INVALID_STOCK");
        }

        const [updated] = await trx("products")
          .where({ id, vendor_id: vendorId })
          .increment("stock", delta)
          .returning(["id", "vendor_id", "name", "description", "price", "stock", "category", "image_url", "is_published", "created_at", "updated_at"]);
        product = updated;
      });

      logger.info({
        context: "productService.adjustStock",
        message: `Stock adjusted by ${delta}`,
        productId: id,
        vendorId,
        correlationId,
      });
      return product!;
    } catch (err: any) {
      const error = err instanceof ServiceError ? err : new ServiceError(500, "Failed to adjust stock", "INTERNAL_SERVER_ERROR", err.message);
      logger.error({
        context: "productService.adjustStock",
        error: error.error,
        errorCode: error.errorCode,
        details: error.details,
        productId: id,
        vendorId,
        correlationId,
      });
      throw error;
    }
  },

  /**
   * Retrieves products with pagination and filtering
   * @param limit - Number of products to return
   * @param offset - Offset for pagination
   * @param filters - Optional filters (vendorId, category, isPublished)
   * @param correlationId - Request correlation ID
   * @returns Products and total count
   */
  async listProducts(
    limit: number = 10,
    offset: number = 0,
    filters: { vendorId?: string; category?: string; isPublished?: boolean } = {},
    correlationId?: string
  ): Promise<{ products: Product[]; total: number }> {
    try {
      if (filters.vendorId && !isUUID(filters.vendorId)) {
        throw new ServiceError(400, "Invalid vendor ID", "INVALID_UUID");
      }
      if (limit < 1 || offset < 0) {
        throw new ServiceError(400, "Invalid pagination parameters", "INVALID_INPUT");
      }

      const query = knex("products").select("id", "vendor_id", "name", "description", "price", "stock", "category", "image_url", "is_published", "created_at", "updated_at");
      if (filters.vendorId) {
        query.where("vendor_id", filters.vendorId);
      }
      if (filters.category) {
        query.where("category", filters.category);
      }
      if (filters.isPublished !== undefined) {
        query.where("is_published", filters.isPublished);
      }

      const [products, [{ count }]] = await Promise.all([
        query.orderBy("updated_at", "desc").limit(limit).offset(offset),
        knex("products")
          .count()
          .where({
            ...(filters.vendorId && { vendor_id: filters.vendorId }),
            ...(filters.category && { category: filters.category }),
            ...(filters.isPublished !== undefined && { is_published: filters.isPublished }),
          }),
      ]);

      logger.debug({
        context: "productService.listProducts",
        message: "Products retrieved",
        count: products.length,
        filters,
        correlationId,
      });
      return { products, total: parseInt(count as string, 10) };
    } catch (err: any) {
      const error = err instanceof ServiceError ? err : new ServiceError(500, "Failed to retrieve products", "INTERNAL_SERVER_ERROR", err.message);
      logger.error({
        context: "productService.listProducts",
        error: error.error,
        errorCode: error.errorCode,
        details: error.details,
        filters,
        correlationId,
      });
      throw error;
    }
  },
};