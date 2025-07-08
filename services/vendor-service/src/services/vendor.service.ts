import { v4 as uuidv4 } from "uuid";
import axios from "axios";
import db from "../config/db";
import { logger } from "../utils/logger";

interface VendorInput {
  businessName: string;
  ownerName: string;
  email: string;
  phone: string;
  location: string;
  password: string;
}

interface Vendor {
  id: string;
  business_name: string;
  owner_name: string;
  email: string;
  phone: string;
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

export const vendorService = {
  async createVendor(input: VendorInput, correlationId?: string): Promise<Vendor> {
    try {
      const id = uuidv4();
      const dbInstance = await db;

      // Check if email exists in vendors table
      const existingVendor = await dbInstance("vendors").where({ email: input.email }).first();
      if (existingVendor) {
        throw new ServiceError(400, "Email already in use", "EMAIL_EXISTS");
      }

      // Create user in auth-service
      const authResponse = await axios.post(`${process.env.AUTH_SERVICE_URL}/api/auth/register`, {
        id,
        email: input.email,
        password: input.password,
        role: "vendor",
      });

      if (!authResponse.data.success) {
        throw new ServiceError(400, "Failed to create user in auth-service", "AUTH_SERVICE_ERROR", authResponse.data.error);
      }

      // Create vendor in vendors table
      const [vendor] = await dbInstance("vendors")
        .insert({
          id,
          business_name: input.businessName,
          owner_name: input.ownerName,
          email: input.email,
          phone: input.phone,
          location: input.location,
          status: "pending",
          created_at: dbInstance.fn.now(),
          updated_at: dbInstance.fn.now(),
        })
        .returning(["id", "business_name", "owner_name", "email", "phone", "location", "status", "created_at", "updated_at"]);

      logger.info({
        context: "vendorService.createVendor",
        message: "Vendor application created",
        vendorId: id,
        correlationId,
      });
      return vendor;
    } catch (err: any) {
      const error = err instanceof ServiceError ? err : new ServiceError(500, "Failed to create vendor", "INTERNAL_SERVER_ERROR", err.message);
      logger.error({
        context: "vendorService.createVendor",
        error: error.error,
        errorCode: error.errorCode,
        details: error.details,
        correlationId,
      });
      throw error;
    }
  },

  async getAllVendors(correlationId?: string): Promise<Vendor[]> {
    try {
      const dbInstance = await db;
      const vendors = await dbInstance("vendors")
        .select("id", "business_name", "owner_name", "email", "phone", "location", "status", "created_at", "updated_at");
      logger.debug({
        context: "vendorService.getAllVendors",
        message: "Vendors retrieved",
        count: vendors.length,
        correlationId,
      });
      return vendors;
    } catch (err: any) {
      const error = new ServiceError(500, "Failed to retrieve vendors", "INTERNAL_SERVER_ERROR", err.message);
      logger.error({
        context: "vendorService.getAllVendors",
        error: error.error,
        errorCode: error.errorCode,
        details: error.details,
        correlationId,
      });
      throw error;
    }
  },

  async updateVendorStatus(id: string, status: "pending" | "approved" | "rejected", correlationId?: string): Promise<Vendor> {
    try {
      if (!["pending", "approved", "rejected"].includes(status)) {
        throw new ServiceError(400, "Invalid status", "INVALID_STATUS");
      }
      const dbInstance = await db;

      const [vendor] = await dbInstance("vendors")
        .where({ id })
        .update({ status, updated_at: dbInstance.fn.now() })
        .returning(["id", "business_name", "owner_name", "email", "phone", "location", "status", "created_at", "updated_at"]);

      if (!vendor) {
        throw new ServiceError(404, "Vendor not found", "NOT_FOUND");
      }

      if (status === "approved") {
        // Update user in auth-service to enable login
        await axios.patch(`${process.env.AUTH_SERVICE_URL}/api/users/${id}`, {
          email_verified: true,
        });
        // TODO: Send email/SMS with login credentials (e.g., via notification-service)
      }

      logger.info({
        context: "vendorService.updateVendorStatus",
        message: `Vendor status updated to ${status}`,
        vendorId: id,
        correlationId,
      });
      return vendor;
    } catch (err: any) {
      const error = err instanceof ServiceError ? err : new ServiceError(500, "Failed to update vendor status", "INTERNAL_SERVER_ERROR", err.message);
      logger.error({
        context: "vendorService.updateVendorStatus",
        error: error.error,
        errorCode: error.errorCode,
        details: error.details,
        vendorId: id,
        correlationId,
      });
      throw error;
    }
  },

  async getVendorById(id: string, correlationId?: string): Promise<Vendor | undefined> {
    try {
      const dbInstance = await db;
      const vendor = await dbInstance("vendors")
        .where({ id })
        .first()
        .select("id", "business_name", "owner_name", "email", "phone", "location", "status", "created_at", "updated_at");

      if (vendor) {
        logger.debug({
          context: "vendorService.getVendorById",
          message: "Vendor retrieved",
          vendorId: id,
          correlationId,
        });
      }
      return vendor;
    } catch (err: any) {
      const error = new ServiceError(500, "Failed to retrieve vendor", "INTERNAL_SERVER_ERROR", err.message);
      logger.error({
        context: "vendorService.getVendorById",
        error: error.error,
        errorCode: error.errorCode,
        details: error.details,
        vendorId: id,
        correlationId,
      });
      throw error;
    }
  },
};