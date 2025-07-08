import { Knex } from "knex";
import axios from "axios";
import bcrypt from "bcryptjs";

export async function up(knex: Knex): Promise<void> {
  const hasEmailVerified = await knex.schema.hasColumn("users", "email_verified");

  if (!hasEmailVerified) {
    await knex.schema.alterTable("users", (table) => {
      table.boolean("email_verified").defaultTo(false);
    });
  }

  await knex("users")
    .whereIn("role", ["customer", "admin"])
    .update({ email_verified: true });

  // Sync vendors
  try {
    const vendorResponse = await axios.get(`${process.env.VENDOR_SERVICE_URL}/api/vendors`);
    const vendors = vendorResponse.data.data || [];

    for (const vendor of vendors) {
      const hashedPassword = await bcrypt.hash("temp_password_123", 12);
      await axios.post(`${process.env.AUTH_SERVICE_URL}/api/auth/register`, {
        id: vendor.id,
        email: vendor.email,
        password: hashedPassword,
        role: "vendor",
        email_verified: vendor.status === "approved",
      }).catch((err) => {
        if (err instanceof Error) {
          console.error(`Failed to sync vendor ${vendor.id}: ${err.message}`);
        } else {
          console.error(`Failed to sync vendor ${vendor.id}:`, err);
        }
      });
    }
  } catch (err) {
    if (err instanceof Error) {
      console.error(`Failed to fetch vendors: ${err.message}`);
    } else {
      console.error("Failed to fetch vendors:", err);
    }
  }

  // Sync couriers
  try {
    const courierResponse = await axios.get(`${process.env.COURIER_SERVICE_URL}/api/couriers`);
    const couriers = courierResponse.data.data || [];

    for (const courier of couriers) {
      const hashedPassword = await bcrypt.hash("temp_password_123", 12);
      await axios.post(`${process.env.AUTH_SERVICE_URL}/api/auth/register`, {
        id: courier.id,
        email: courier.email,
        password: hashedPassword,
        role: "courier",
        email_verified: courier.status === "approved",
      }).catch((err) => {
        if (err instanceof Error) {
          console.error(`Failed to sync courier ${courier.id}: ${err.message}`);
        } else {
          console.error(`Failed to sync courier ${courier.id}:`, err);
        }
      });
    }
  } catch (err) {
    if (err instanceof Error) {
      console.error(`Failed to fetch couriers: ${err.message}`);
    } else {
      console.error("Failed to fetch couriers:", err);
    }
  }
}

export async function down(knex: Knex): Promise<void> {
  const hasEmailVerified = await knex.schema.hasColumn("users", "email_verified");

  if (hasEmailVerified) {
    await knex.schema.alterTable("users", (table) => {
      table.dropColumn("email_verified");
    });
  }
}