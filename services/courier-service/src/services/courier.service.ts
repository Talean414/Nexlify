import { v4 as uuidv4 } from "uuid";
import axios from "axios";
import db from "../config/db";
import redis from "../config/redis";
import { producer } from "../config/kafka";
import { logger } from "../utils/logger";
import { tracer } from "../utils/tracing";
import { courierCount } from "../utils/metrics";

interface CourierInput {
  name: string;
  email: string;
  phone: string;
  vehicleType: string;
  location: string;
  password: string;
}

interface Courier {
  id: string;
  name: string;
  email: string;
  phone: string;
  vehicle_type: string;
  location: string;
  status: string;
  created_at: Date;
  updated_at: Date;
}

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

export const courierService = {
  async createCourier(input: CourierInput, correlationId?: string): Promise<Courier> {
    const span = tracer.startSpan("courierService.createCourier");
    try {
      const id = uuidv4();
      const dbInstance = await db;

      const existingCourier = await dbInstance("couriers").where({ email: input.email }).first();
      if (existingCourier) {
        throw new ServiceError(400, "Email already in use", "EMAIL_EXISTS");
      }

      await axios.post(`${process.env.AUTH_SERVICE_URL}/api/auth/register`, {
        id,
        email: input.email,
        password: input.password,
        role: "courier",
        email_verified: false,
      });

      const [courier] = await dbInstance("couriers")
        .insert({
          id,
          name: input.name,
          email: input.email,
          phone: input.phone,
          vehicle_type: input.vehicleType,
          location: input.location,
          status: "pending",
          created_at: dbInstance.fn.now(),
          updated_at: dbInstance.fn.now(),
        })
        .returning(["id", "name", "email", "phone", "vehicle_type", "location", "status", "created_at", "updated_at"]);

      await redis.setEx(`courier:${id}`, 3600, JSON.stringify(courier));
      await producer.send({
        topic: "courier-events",
        messages: [{ value: JSON.stringify({ event: "courier.created", courierId: id, email: input.email }) }],
      });
      courierCount.inc({ status: "pending" });

      logger.info({ context: "courierService.createCourier", message: "Courier created", courierId: id, correlationId });
      span.end();
      return courier;
    } catch (err: any) {
      const error = err instanceof ServiceError ? err : new ServiceError(500, "Failed to create courier", "INTERNAL_SERVER_ERROR", err.message);
      logger.error({ context: "courierService.createCourier", error: error.error, errorCode: error.errorCode, details: error.details, correlationId });
      span.recordException(error);
      span.end();
      throw error;
    }
  },

  async getAllCouriers(correlationId?: string): Promise<Courier[]> {
    const span = tracer.startSpan("courierService.getAllCouriers");
    try {
      const dbInstance = await db;
      const couriers = await dbInstance("couriers")
        .select("id", "name", "email", "phone", "vehicle_type", "location", "status", "created_at", "updated_at");
      
      logger.debug({ context: "courierService.getAllCouriers", message: "Couriers retrieved", count: couriers.length, correlationId });
      span.end();
      return couriers;
    } catch (err: any) {
      const error = new ServiceError(500, "Failed to retrieve couriers", "INTERNAL_SERVER_ERROR", err.message);
      logger.error({ context: "courierService.getAllCouriers", error: error.error, errorCode: error.errorCode, details: error.details, correlationId });
      span.recordException(error);
      span.end();
      throw error;
    }
  },

  async getCourierById(id: string, correlationId?: string): Promise<Courier | undefined> {
    const span = tracer.startSpan("courierService.getCourierById");
    try {
      const cached = await redis.get(`courier:${id}`);
      if (cached) {
        logger.debug({ context: "courierService.getCourierById", message: "Courier retrieved from cache", courierId: id, correlationId });
        span.end();
        return JSON.parse(cached);
      }

      const dbInstance = await db;
      const courier = await dbInstance("couriers")
        .where({ id })
        .first()
        .select("id", "name", "email", "phone", "vehicle_type", "location", "status", "created_at", "updated_at");

      if (courier) {
        await redis.setEx(`courier:${id}`, 3600, JSON.stringify(courier));
        logger.debug({ context: "courierService.getCourierById", message: "Courier retrieved", courierId: id, correlationId });
      }
      span.end();
      return courier;
    } catch (err: any) {
      const error = new ServiceError(500, "Failed to retrieve courier", "INTERNAL_SERVER_ERROR", err.message);
      logger.error({ context: "courierService.getCourierById", error: error.error, errorCode: error.errorCode, details: error.details, courierId: id, correlationId });
      span.recordException(error);
      span.end();
      throw error;
    }
  },

  async updateCourierStatus(id: string, status: "pending" | "approved" | "rejected", correlationId?: string): Promise<Courier> {
    const span = tracer.startSpan("courierService.updateCourierStatus");
    try {
      if (!["pending", "approved", "rejected"].includes(status)) {
        throw new ServiceError(400, "Invalid status", "INVALID_STATUS");
      }
      const dbInstance = await db;
      const [courier] = await dbInstance("couriers")
        .where({ id })
        .update({ status, updated_at: dbInstance.fn.now() })
        .returning(["id", "name", "email", "phone", "vehicle_type", "location", "status", "created_at", "updated_at"]);

      if (!courier) {
        throw new ServiceError(404, "Courier not found", "NOT_FOUND");
      }

      await axios.patch(`${process.env.AUTH_SERVICE_URL}/api/users/${id}`, {
        email_verified: status === "approved",
      });

      await redis.setEx(`courier:${id}`, 3600, JSON.stringify(courier));
      await producer.send({
        topic: "courier-events",
        messages: [{ value: JSON.stringify({ event: `courier.${status}`, courierId: id, email: courier.email }) }],
      });
      courierCount.inc({ status });

      logger.info({ context: "courierService.updateCourierStatus", message: `Courier status updated to ${status}`, courierId: id, correlationId });
      span.end();
      return courier;
    } catch (err: any) {
      const error = err instanceof ServiceError ? err : new ServiceError(500, "Failed to update courier status", "INTERNAL_SERVER_ERROR", err.message);
      logger.error({ context: "courierService.updateCourierStatus", error: error.error, errorCode: error.errorCode, details: error.details, courierId: id, correlationId });
      span.recordException(error);
      span.end();
      throw error;
    }
  },

  async assignOrder(courierId: string, orderId: string, correlationId?: string): Promise<void> {
    const span = tracer.startSpan("courierService.assignOrder");
    try {
      const dbInstance = await db;
      const courier = await dbInstance("couriers").where({ id: courierId, status: "approved" }).first();
      if (!courier) {
        throw new ServiceError(404, "Courier not found or not approved", "NOT_FOUND");
      }

      // Validate order exists via order-service (assumed)
      await axios.get(`${process.env.ORDER_SERVICE_PORT}/api/orders/${orderId}`);

      await producer.send({
        topic: "order-events",
        messages: [{ value: JSON.stringify({ event: "order.assigned", orderId, courierId }) }],
      });

      logger.info({ context: "courierService.assignOrder", message: "Order assigned", courierId, orderId, correlationId });
      span.end();
    } catch (err: any) {
      const error = err instanceof ServiceError ? err : new ServiceError(500, "Failed to assign order", "INTERNAL_SERVER_ERROR", err.message);
      logger.error({ context: "courierService.assignOrder", error: error.error, errorCode: error.errorCode, details: error.details, courierId, orderId, correlationId });
      span.recordException(error);
      span.end();
      throw error;
    }
  },

  async updateCourierLocation(courierId: string, latitude: number, longitude: number, correlationId?: string): Promise<void> {
    const span = tracer.startSpan("courierService.updateCourierLocation");
    try {
      const dbInstance = await db;
      const courier = await dbInstance("couriers").where({ id: courierId, status: "approved" }).first();
      if (!courier) {
        throw new ServiceError(404, "Courier not found or not approved", "NOT_FOUND");
      }

      await producer.send({
        topic: "courier-events",
        messages: [{ value: JSON.stringify({ event: "courier.location_updated", courierId, latitude, longitude }) }],
      });

      logger.info({ context: "courierService.updateCourierLocation", message: "Courier location updated", courierId, latitude, longitude, correlationId });
      span.end();
    } catch (err: any) {
      const error = err instanceof ServiceError ? err : new ServiceError(500, "Failed to update courier location", "INTERNAL_SERVER_ERROR", err.message);
      logger.error({ context: "courierService.updateCourierLocation", error: error.error, errorCode: error.errorCode, details: error.details, courierId, correlationId });
      span.recordException(error);
      span.end();
      throw error;
    }
  },
};