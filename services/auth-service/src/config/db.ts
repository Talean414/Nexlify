import { config as dotenvConfig } from 'dotenv';
import { Knex } from 'knex';
import winston from 'winston';

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

let db: Knex;

// Define Knex configuration type
interface KnexConnectionConfig {
  host: string;
  user: string;
  password?: string;
  database: string;
  port?: number;
}

interface KnexConfig {
  [key: string]: {
    client: string;
    connection: KnexConnectionConfig;
    migrations?: {
      directory: string;
    };
    seeds?: {
      directory: string;
    };
  };
}

// Connect to the database
export async function connectDB() {
  try {
    const knexConfig: KnexConfig = require('./knexfile'); // Explicitly import
    if (!knexConfig.development.connection) {
      throw new Error('Database connection configuration is missing');
    }

    db = require('knex')(knexConfig.development);
    await db.raw('SELECT 1+1 AS result');
    logger.info('✅ Database connection successful', {
      database: (knexConfig.development.connection as KnexConnectionConfig).database,
      host: (knexConfig.development.connection as KnexConnectionConfig).host,
      user: (knexConfig.development.connection as KnexConnectionConfig).user,
    });
    return db;
  } catch (err: any) {
    logger.error('❌ Database connection failed', {
      error: err.message,
      database: (knexConfig.development?.connection as KnexConnectionConfig | undefined)?.database,
      host: (knexConfig.development?.connection as KnexConnectionConfig | undefined)?.host,
      user: (knexConfig.development?.connection as KnexConnectionConfig | undefined)?.user,
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