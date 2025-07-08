import knex from "knex";
import { logger } from "../utils/logger";

const db = knex({
  client: "pg",
  connection: {
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || "5432"),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  },
  pool: { min: 2, max: 10 },
});

db.raw("SELECT 1")
  .then(() => logger.info({ context: "db", message: "Database connected" }))
  .catch((err) => logger.error({ context: "db", message: "Database connection failed", error: err.message }));

export default db;