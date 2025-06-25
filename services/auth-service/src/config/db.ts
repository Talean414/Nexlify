import { config as dotenvConfig } from 'dotenv';
import knex from 'knex';
import winston from 'winston';
import knexConfig from '../../knexfile'; // renamed to avoid conflict

// Load environment variables from .env
dotenvConfig();

// Configure Winston logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/database.log' }),
  ],
});

let db: knex.Knex;

// Connect to the database
export async function connectDB() {
  try {
    db = knex(knexConfig.development);
    await db.raw('SELECT 1+1 AS result');
    logger.info('✅ Database connection successful', {
      database: knexConfig.development.connection.database,
      host: knexConfig.development.connection.host,
      user: knexConfig.development.connection.user,
    });
    return db;
  } catch (err: any) {
    logger.error('❌ Database connection failed', {
      error: err.message,
      database: knexConfig.development?.connection?.database,
      host: knexConfig.development?.connection?.host,
      user: knexConfig.development?.connection?.user,
    });
    throw new Error(`Failed to connect to database: ${err.message}`);
  }
}

// Get the database instance
export function getDB() {
  if (!db) {
    logger.error('⚠️ Database not connected yet');
    throw new Error('Database not connected yet');
  }
  return db;
}