import { Pool } from "pg";
import dotenv from "dotenv";
dotenv.config();

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export const connectDB = async () => {
  try {
    await pool.connect();
    console.log("✅ Connected to PostgreSQL database");
  } catch (err) {
    console.error("❌ Database connection error:", err);
    process.exit(1);
  }
};