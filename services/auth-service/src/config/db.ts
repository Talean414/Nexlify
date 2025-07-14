// config/db.ts
import { config as dotenvConfig } from 'dotenv';
import knex, { Knex } from 'knex';
import winston from 'winston';
import knexConfig from './knexfile';

dotenvConfig();

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

// Define Knex connection types for reuse
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

export async function connectDB() {
  try {
    const env = process.env.NODE_ENV || 'development';
    const selectedConfig = (knexConfig as KnexConfig)[env];

    if (!selectedConfig?.connection) {
      throw new Error(`Database connection configuration for '${env}' is missing`);
    }

    db = knex(selectedConfig);
    await db.raw('SELECT 1+1 AS result');

    logger.info('✅ Database connection successful', {
      environment: env,
      database: selectedConfig.connection.database,
      host: selectedConfig.connection.host,
      user: selectedConfig.connection.user,
    });

    return db;

  } catch (err: any) {
    console.error('❌ Database connection error:', err);

    logger.error('❌ Database connection failed', {
      error: err.message,
      stack: err.stack,
    });

    throw new Error(`Failed to connect to database: ${err.message}`);
  }
}

export function getDB() {
  if (!db) {
    logger.error('⚠️ Database not connected yet');
    throw new Error('Database not connected yet');
  }
  return db;
}