import { Request, Response } from "express";
import { orderService } from "../services/order.service";
import { validate as isUUID } from "uuid"; // Added UUID validation

export async function placeOrder(req: Request, res: Response) {
  try {
    const { customerId, vendorId, items } = req.body;

    if (!customerId || !vendorId || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "Invalid order input" });
    }

    const order = await orderService.createOrder({ customerId, vendorId, items });

    return res.status(201).json({ success: true, order });
  } catch (err: any) {
    console.error("Order creation error:", err);
    return res.status(500).json({ error: "Failed to place order" });
  }
}

export async function vendorAction(req: Request, res: Response) {
  try {
    const orderId = req.params.id;
    const { action } = req.body;

    // Validate UUID format first
    if (!isUUID(orderId)) {
      return res.status(400).json({ error: "Invalid order ID format (must be UUID)" });
    }

    // Validate action type
    if (!["approve", "reject"].includes(action)) {
      return res.status(400).json({ error: "Invalid action" });
    }

    const result = await orderService.vendorAction(orderId, action);

    if (!result) {
      return res.status(404).json({ error: "Order not found or cannot be updated" });
    }

    return res.json({ success: true, message: `Order ${action}ed`, order: result });
  } catch (err: any) {
    console.error("Vendor action error:", err.message); // More detailed error logging
    return res.status(500).json({ 
      error: "Failed to update order",
      details: err.message // Optional: include error details for debugging
    });
  }
}

export async function assignCourier(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { courierId } = req.body;

    if (!courierId) {
      return res.status(400).json({ error: "Courier ID is required" });
    }

    const order = await orderService.getOrderById(id);
    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    if (order.status !== "APPROVED") {
      return res.status(400).json({ error: "Order is not available for courier assignment" });
    }

    const updatedOrder = await orderService.assignCourier(id, courierId);

    return res.status(200).json({
      success: true,
      message: "Courier assigned and order now en route",
      order: updatedOrder,
    });
  } catch (err: any) {
    console.error("Assign courier error:", err);
    return res.status(500).json({ error: "Failed to assign courier" });
  }
}

export async function markOrderDelivered(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { courierId } = req.body;

    const order = await orderService.getOrderById(id);
    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    if (order.status !== "EN_ROUTE") {
      return res.status(400).json({ error: "Order is not in transit" });
    }

    if (order.courier_id !== courierId) {
      return res.status(403).json({ error: "Courier not assigned to this order" });
    }

    const updatedOrder = await orderService.markDelivered(id);

    return res.status(200).json({
      success: true,
      message: "Order marked as delivered",
      order: updatedOrder,
    });
  } catch (err: any) {
    console.error("Delivery error:", err);
    return res.status(500).json({ error: "Failed to mark order as delivered" });
  }
}