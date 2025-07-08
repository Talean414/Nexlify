import { v4 as uuidv4 } from "uuid";
import { validate as isUUID } from "uuid";
import knex from "../config/db";
import { logger } from "../utils/logger";

// Define interfaces
interface OrderItem {
  productId: string;
  quantity: number;
  price: number;
}

interface CreateOrderInput {
  customerId: string;
  vendorId: string;
  items: OrderItem[];
}

interface Order {
  id: string;
  customer_id: string;
  vendor_id: string;
  status: string;
  total_price: number;
  courier_id?: string;
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

export const orderService = {
  /**
   * Creates a new order with items in a transaction
   * @param input - Order creation input
   * @param correlationId - Request correlation ID
   * @returns Created order
   */
  async createOrder(input: CreateOrderInput, correlationId?: string): Promise<Order> {
    try {
      // Validate inputs
      if (!isUUID(input.customerId) || !isUUID(input.vendorId)) {
        throw new ServiceError(400, "Invalid customer or vendor ID", "INVALID_UUID");
      }
      if (!input.items?.length || !Array.isArray(input.items)) {
        throw new ServiceError(400, "Invalid items", "INVALID_ITEMS");
      }
      if (!input.items.every(item => isUUID(item.productId) && item.quantity > 0 && item.price >= 0)) {
        throw new ServiceError(400, "Invalid item format", "INVALID_ITEM_FORMAT");
      }

      const orderId = uuidv4();
      const totalPrice = input.items.reduce((sum, item) => sum + item.price * item.quantity, 0);

      await knex.transaction(async (trx) => {
        await trx("orders").insert({
          id: orderId,
          customer_id: input.customerId,
          vendor_id: input.vendorId,
          status: "PENDING_VENDOR",
          total_price: totalPrice,
          created_at: knex.fn.now(),
          updated_at: knex.fn.now()
        });

        const orderItems = input.items.map((item) => ({
          id: uuidv4(),
          order_id: orderId,
          product_id: item.productId,
          quantity: item.quantity,
          price: item.price,
        }));

        await trx("order_items").insert(orderItems);
      });

      const order: Order = {
        id: orderId,
        customer_id: input.customerId,
        vendor_id: input.vendorId,
        status: "PENDING_VENDOR",
        total_price: totalPrice,
        items: input.items
      };

      logger.info({
        context: "orderService.createOrder",
        message: "Order created",
        orderId,
        customerId: input.customerId,
        correlationId
      });
      return order;
    } catch (err: any) {
      const error = err instanceof ServiceError ? err : new ServiceError(500, "Failed to create order", "INTERNAL_SERVER_ERROR", err.message);
      logger.error({
        context: "orderService.createOrder",
        error: error.error,
        errorCode: error.errorCode,
        details: error.details,
        customerId: input.customerId,
        correlationId
      });
      throw error;
    }
  },

  /**
   * Retrieves an order by ID
   * @param id - Order ID
   * @param correlationId - Request correlation ID
   * @returns Order or undefined
   */
  async getOrderById(id: string, correlationId?: string): Promise<Order | undefined> {
    try {
      if (!isUUID(id)) {
        throw new ServiceError(400, "Invalid order ID", "INVALID_UUID");
      }

      const order = await knex("orders")
        .where("id", id)
        .first()
        .select("id", "customer_id", "vendor_id", "courier_id", "status", "total_price", "created_at", "updated_at");

      if (order) {
        logger.debug({
          context: "orderService.getOrderById",
          message: "Order retrieved",
          orderId: id,
          correlationId
        });
      }
      return order;
    } catch (err: any) {
      const error = err instanceof ServiceError ? err : new ServiceError(500, "Failed to retrieve order", "INTERNAL_SERVER_ERROR", err.message);
      logger.error({
        context: "orderService.getOrderById",
        error: error.error,
        errorCode: error.errorCode,
        details: error.details,
        orderId: id,
        correlationId
      });
      throw error;
    }
  },

  /**
   * Updates order status
   * @param id - Order ID
   * @param status - New status
   * @param correlationId - Request correlation ID
   * @returns Updated order
   */
  async updateOrderStatus(id: string, status: string, correlationId?: string): Promise<Order> {
    try {
      if (!isUUID(id)) {
        throw new ServiceError(400, "Invalid order ID", "INVALID_UUID");
      }
      if (!["PENDING_VENDOR", "APPROVED", "REJECTED", "EN_ROUTE", "DELIVERED"].includes(status)) {
        throw new ServiceError(400, "Invalid status", "INVALID_STATUS");
      }

      const updated = await knex("orders")
        .where("id", id)
        .update({
          status,
          updated_at: knex.fn.now()
        })
        .returning(["id", "customer_id", "vendor_id", "courier_id", "status", "total_price", "created_at", "updated_at"]);

      if (!updated[0]) {
        throw new ServiceError(404, "Order not found", "NOT_FOUND");
      }

      logger.info({
        context: "orderService.updateOrderStatus",
        message: `Order status updated to ${status}`,
        orderId: id,
        correlationId
      });
      return updated[0];
    } catch (err: any) {
      const error = err instanceof ServiceError ? err : new ServiceError(500, "Failed to update order status", "INTERNAL_SERVER_ERROR", err.message);
      logger.error({
        context: "orderService.updateOrderStatus",
        error: error.error,
        errorCode: error.errorCode,
        details: error.details,
        orderId: id,
        correlationId
      });
      throw error;
    }
  },

  /**
   * Handles vendor approve/reject action
   * @param orderId - Order ID
   * @param action - 'approve' or 'reject'
   * @param correlationId - Request correlation ID
   * @returns Updated order
   */
  async vendorAction(orderId: string, action: string, correlationId?: string): Promise<Order> {
    try {
      if (!isUUID(orderId)) {
        throw new ServiceError(400, "Invalid order ID", "INVALID_UUID");
      }
      if (!["approve", "reject"].includes(action)) {
        throw new ServiceError(400, "Invalid action", "INVALID_ACTION");
      }

      const validStatus = action === "approve" ? "APPROVED" : "REJECTED";
      return await orderService.updateOrderStatus(orderId, validStatus, correlationId);
    } catch (err: any) {
      const error = err instanceof ServiceError ? err : new ServiceError(500, "Failed to process vendor action", "INTERNAL_SERVER_ERROR", err.message);
      logger.error({
        context: "orderService.vendorAction",
        error: error.error,
        errorCode: error.errorCode,
        details: error.details,
        orderId,
        correlationId
      });
      throw error;
    }
  },

  /**
   * Assigns a courier to an order
   * @param orderId - Order ID
   * @param courierId - Courier ID
   * @param correlationId - Request correlation ID
   * @returns Updated order
   */
  async assignCourier(orderId: string, courierId: string, correlationId?: string): Promise<Order> {
    try {
      if (!isUUID(orderId) || !isUUID(courierId)) {
        throw new ServiceError(400, "Invalid order or courier ID", "INVALID_UUID");
      }

      const order = await orderService.getOrderById(orderId, correlationId);
      if (!order) {
        throw new ServiceError(404, "Order not found", "NOT_FOUND");
      }

      const updated = await knex("orders")
        .where({ id: orderId, status: "APPROVED" })
        .update({
          courier_id: courierId,
          status: "EN_ROUTE",
          updated_at: knex.fn.now()
        })
        .returning(["id", "customer_id", "vendor_id", "courier_id", "status", "total_price", "created_at", "updated_at"]);

      if (!updated[0]) {
        throw new ServiceError(400, "Order not in APPROVED state", "INVALID_STATE");
      }

      logger.info({
        context: "orderService.assignCourier",
        message: "Courier assigned",
        orderId,
        courierId,
        correlationId
      });
      return updated[0];
    } catch (err: any) {
      const error = err instanceof ServiceError ? err : new ServiceError(500, "Failed to assign courier", "INTERNAL_SERVER_ERROR", err.message);
      logger.error({
        context: "orderService.assignCourier",
        error: error.error,
        errorCode: error.errorCode,
        details: error.details,
        orderId,
        courierId,
        correlationId
      });
      throw error;
    }
  },

  /**
   * Marks an order as delivered
   * @param orderId - Order ID
   * @param correlationId - Request correlation ID
   * @returns Updated order
   */
  async markDelivered(orderId: string, correlationId?: string): Promise<Order> {
    try {
      if (!isUUID(orderId)) {
        throw new ServiceError(400, "Invalid order ID", "INVALID_UUID");
      }

      const order = await orderService.getOrderById(orderId, correlationId);
      if (!order) {
        throw new ServiceError(404, "Order not found", "NOT_FOUND");
      }

      const updated = await knex("orders")
        .where({ id: orderId, status: "EN_ROUTE" })
        .update({
          status: "DELIVERED",
          updated_at: knex.fn.now()
        })
        .returning(["id", "customer_id", "vendor_id", "courier_id", "status", "total_price", "created_at", "updated_at"]);

      if (!updated[0]) {
        throw new ServiceError(400, "Order not in EN_ROUTE state", "INVALID_STATE");
      }

      logger.info({
        context: "orderService.markDelivered",
        message: "Order marked as delivered",
        orderId,
        correlationId
      });
      return updated[0];
    } catch (err: any) {
      const error = err instanceof ServiceError ? err : new ServiceError(500, "Failed to mark order as delivered", "INTERNAL_SERVER_ERROR", err.message);
      logger.error({
        context: "orderService.markDelivered",
        error: error.error,
        errorCode: error.errorCode,
        details: error.details,
        orderId,
        correlationId
      });
      throw error;
    }
  }
};