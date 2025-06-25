import { v4 as uuidv4 } from "uuid";
import knex from "../config/db";

type OrderItem = {
  productId: string;
  quantity: number;
  price: number;
};

type CreateOrderInput = {
  customerId: string;
  vendorId: string;
  items: OrderItem[];
};

export const orderService = {
  createOrder: async ({ customerId, vendorId, items }: CreateOrderInput) => {
    // [Existing createOrder implementation remains exactly the same]
    const orderId = uuidv4();
    const totalPrice = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

    await knex.transaction(async (trx) => {
      await trx("orders").insert({
        id: orderId,
        customer_id: customerId,
        vendor_id: vendorId,
        status: "PENDING_VENDOR",
        total_price: totalPrice,
      });

      const orderItems = items.map((item) => ({
        id: uuidv4(),
        order_id: orderId,
        product_id: item.productId,
        quantity: item.quantity,
        price: item.price,
      }));

      await trx("order_items").insert(orderItems);
    });

    return {
      id: orderId,
      customerId,
      vendorId,
      status: "PENDING_VENDOR",
      totalPrice,
      items,
    };
  },

  getOrderById: async (id: string) => {
    return knex("orders").where("id", id).first();
  },

  updateOrderStatus: async (id: string, status: string) => {
    const updated = await knex("orders")
      .where("id", id)
      .update({
        status,
        updated_at: knex.fn.now(),
      })
      .returning("*");

    return updated[0];
  },

  vendorAction: async (orderId: string, action: string) => {
    const validStatus = action === "approve" ? "APPROVED" : "REJECTED";
    return orderService.updateOrderStatus(orderId, validStatus);
  },

  assignCourier: async (orderId: string, courierId: string) => {
    const updated = await knex("orders")
      .where({ id: orderId })
      .update({
        courier_id: courierId,
        status: "EN_ROUTE",
        updated_at: knex.fn.now(),
      })
      .returning("*");

    return updated[0];
  },

  markDelivered: async (orderId: string) => {
    const updated = await knex("orders")
      .where({ id: orderId })
      .update({
        status: "DELIVERED",
        updated_at: knex.fn.now()
      })
      .returning("*");

    return updated[0];
  }
};