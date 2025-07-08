import { Request, Response, NextFunction } from "express";
import { AuthenticatedRequest } from "@your-org/shared-utils";
import { courierService } from "../services/courier.service";
import { logger } from "../utils/logger";
import { tracer } from "../utils/tracing";
import { httpRequestDuration } from "../utils/metrics";
import { validateRequest, validateCourierInput, validateCourierId, validateStatusUpdate, validateOrderAssignment, validateLocationUpdate } from "../middlewares/validation";

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

export async function apply(req: Request, res: Response, next: NextFunction) {
  const span = tracer.startSpan("courierController.apply");
  const end = httpRequestDuration.startTimer({ method: req.method, route: req.path });
  try {
    await validateRequest(req, res, async () => {
      const courier = await courierService.createCourier(req.body, (req as any).correlationId);
      logger.info({ context: "courierController.apply", message: "Courier application submitted", courierId: courier.id, correlationId: (req as any).correlationId });
      span.end();
      end({ status: 201 });
      return res.status(201).json({ success: true, message: "Courier application submitted", data: courier } as SuccessResponse);
    });
  } catch (err: any) {
    const error = err instanceof ApiError ? err : new ApiError(500, "Failed to submit courier application", "INTERNAL_SERVER_ERROR", err.message);
    logger.error({ context: "courierController.apply", error: error.error, errorCode: error.errorCode, details: error.details, correlationId: (req as any).correlationId });
    span.recordException(error);
    span.end();
    end({ status: error.status });
    return res.status(error.status).json({ success: false, error: error.error, errorCode: error.errorCode, details: process.env.NODE_ENV === "development" ? error.details : undefined } as ErrorResponse);
  }
}

export async function list(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const span = tracer.startSpan("courierController.list");
  const end = httpRequestDuration.startTimer({ method: req.method, route: req.path });
  try {
    const couriers = await courierService.getAllCouriers(req.correlationId);
    logger.info({ context: "courierController.list", message: "Couriers retrieved", count: couriers.length, correlationId: req.correlationId });
    span.end();
    end({ status: 200 });
    return res.json({ success: true, data: couriers } as SuccessResponse);
  } catch (err: any) {
    const error = err instanceof ApiError ? err : new ApiError(500, "Failed to retrieve couriers", "INTERNAL_SERVER_ERROR", err.message);
    logger.error({ context: "courierController.list", error: error.error, errorCode: error.errorCode, details: error.details, correlationId: req.correlationId });
    span.recordException(error);
    span.end();
    end({ status: error.status });
    return res.status(error.status).json({ success: false, error: error.error, errorCode: error.errorCode, details: process.env.NODE_ENV === "development" ? error.details : undefined } as ErrorResponse);
  }
}

export async function getCourier(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const span = tracer.startSpan("courierController.getCourier");
  const end = httpRequestDuration.startTimer({ method: req.method, route: req.path });
  try {
    await validateRequest(req, res, async () => {
      const courier = await courierService.getCourierById(req.params.id, req.correlationId);
      if (!courier) {
        throw new ApiError(404, "Courier not found", "NOT_FOUND");
      }
      logger.info({ context: "courierController.getCourier", message: "Courier retrieved", courierId: req.params.id, correlationId: req.correlationId });
      span.end();
      end({ status: 200 });
      return res.json({ success: true, data: courier } as SuccessResponse);
    });
  } catch (err: any) {
    const error = err instanceof ApiError ? err : new ApiError(500, "Failed to retrieve courier", "INTERNAL_SERVER_ERROR", err.message);
    logger.error({ context: "courierController.getCourier", error: error.error, errorCode: error.errorCode, details: error.details, courierId: req.params.id, correlationId: req.correlationId });
    span.recordException(error);
    span.end();
    end({ status: error.status });
    return res.status(error.status).json({ success: false, error: error.error, errorCode: error.errorCode, details: process.env.NODE_ENV === "development" ? error.details : undefined } as ErrorResponse);
  }
}

export async function approveOrReject(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const span = tracer.startSpan("courierController.approveOrReject");
  const end = httpRequestDuration.startTimer({ method: req.method, route: req.path });
  try {
    await validateRequest(req, res, async () => {
      const { id } = req.params;
      const { status } = req.body;
      const courier = await courierService.updateCourierStatus(id, status, req.correlationId);
      logger.info({ context: "courierController.approveOrReject", message: `Courier status updated to ${status}`, courierId: id, correlationId: req.correlationId });
      span.end();
      end({ status: 200 });
      return res.json({ success: true, data: courier } as SuccessResponse);
    });
  } catch (err: any) {
    const error = err instanceof ApiError ? err : new ApiError(500, "Failed to update courier status", "INTERNAL_SERVER_ERROR", err.message);
    logger.error({ context: "courierController.approveOrReject", error: error.error, errorCode: error.errorCode, details: error.details, courierId: req.params.id, correlationId: req.correlationId });
    span.recordException(error);
    span.end();
    end({ status: error.status });
    return res.status(error.status).json({ success: false, error: error.error, errorCode: error.errorCode, details: process.env.NODE_ENV === "development" ? error.details : undefined } as ErrorResponse);
  }
}

export async function assignOrder(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const span = tracer.startSpan("courierController.assignOrder");
  const end = httpRequestDuration.startTimer({ method: req.method, route: req.path });
  try {
    await validateRequest(req, res, async () => {
      const { id, orderId } = req.body;
      await courierService.assignOrder(id, orderId, req.correlationId);
      logger.info({ context: "courierController.assignOrder", message: "Order assigned", courierId: id, orderId, correlationId: req.correlationId });
      span.end();
      end({ status: 200 });
      return res.json({ success: true, message: "Order assigned successfully" } as SuccessResponse);
    });
  } catch (err: any) {
    const error = err instanceof ApiError ? err : new ApiError(500, "Failed to assign order", "INTERNAL_SERVER_ERROR", err.message);
    logger.error({ context: "courierController.assignOrder", error: error.error, errorCode: error.errorCode, details: error.details, courierId: req.body.id, correlationId: req.correlationId });
    span.recordException(error);
    span.end();
    end({ status: error.status });
    return res.status(error.status).json({ success: false, error: error.error, errorCode: error.errorCode, details: process.env.NODE_ENV === "development" ? error.details : undefined } as ErrorResponse);
  }
}

export async function updateLocation(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const span = tracer.startSpan("courierController.updateLocation");
  const end = httpRequestDuration.startTimer({ method: req.method, route: req.path });
  try {
    await validateRequest(req, res, async () => {
      const { latitude, longitude } = req.body;
      await courierService.updateCourierLocation(req.user!.userId, latitude, longitude, req.correlationId);
      logger.info({ context: "courierController.updateLocation", message: "Courier location updated", courierId: req.user!.userId, correlationId: req.correlationId });
      span.end();
      end({ status: 200 });
      return res.json({ success: true, message: "Location updated successfully" } as SuccessResponse);
    });
  } catch (err: any) {
    const error = err instanceof ApiError ? err : new ApiError(500, "Failed to update location", "INTERNAL_SERVER_ERROR", err.message);
    logger.error({ context: "courierController.updateLocation", error: error.error, errorCode: error.errorCode, details: error.details, courierId: req.user?.userId, correlationId: req.correlationId });
    span.recordException(error);
    span.end();
    end({ status: error.status });
    return res.status(error.status).json({ success: false, error: error.error, errorCode: error.errorCode, details: process.env.NODE_ENV === "development" ? error.details : undefined } as ErrorResponse);
  }
}