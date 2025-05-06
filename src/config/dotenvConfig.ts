import dotenvFlow from 'dotenv-flow';
import process from 'process';

dotenvFlow.config();

// Config interface definition
interface AppConfig {
  NODE_ENV: string | undefined;
  PORT: string | undefined;
  SERVER_URL: string | undefined;
  FRONTEND_URL: string | undefined;
  DATABASE: string | undefined;
  DB_POOL_SIZE: number;
  MIGRATE_MONGO_URI: string | undefined;
  MIGRATE_AUTOSYNC: boolean;
  REDIS_HOST: string | undefined;
  REDIS_PORT: number;
  REDIS_USERNAME: string | undefined;
  REDIS_PASSWORD: string | undefined;
  RABBITMQ_URL: string | undefined;
  ACCESS_TOKEN_SECRET: string | undefined;
  REFRESH_TOKEN_SECRET: string | undefined;
  ACCESS_TOKEN_EXPIRY: number;
  REFRESH_TOKEN_EXPIRY: string | undefined;
  RESEND_KEY: string | undefined;
  S3_BACKUP_ENABLED: boolean;
  S3_BUCKET_NAME: string | undefined;
  AWS_REGION: string | undefined;
  S3_PREFIX: string | undefined;
  BUCKET_NAME: string | undefined;
  BUCKET_REGION: string | undefined;
  ACCESS_KEY: string | undefined;
  SECRET_ACCESS_KEY: string | undefined;
  RUN_BACKUP_ONCE: boolean;
}

const _config: AppConfig = {
  // General
  NODE_ENV: process.env.NODE_ENV,
  PORT: process.env.PORT,
  SERVER_URL: process.env.SERVER_URL,
  FRONTEND_URL: process.env.FRONTEND_URL,

  // Database
  DATABASE: process.env.DATABASE,
  DB_POOL_SIZE: Number(process.env.DB_POOL_SIZE) || 10,

  // Migration
  MIGRATE_MONGO_URI: process.env.MIGRATE_MONGO_URI,
  MIGRATE_AUTOSYNC: process.env.MIGRATE_AUTOSYNC === 'true',

  // Redis
  REDIS_HOST: process.env.REDIS_HOST,
  REDIS_PORT: Number(process.env.REDIS_PORT) || 6379,
  REDIS_USERNAME: process.env.REDIS_USERNAME,
  REDIS_PASSWORD: process.env.REDIS_PASSWORD,

  // RabbitMQ
  RABBITMQ_URL: process.env.RABBITMQ_URL,

  // JWT configuration
  ACCESS_TOKEN_SECRET: process.env.ACCESS_TOKEN_SECRET,
  REFRESH_TOKEN_SECRET: process.env.REFRESH_TOKEN_SECRET,
  ACCESS_TOKEN_EXPIRY: Number(process.env.ACCESS_TOKEN_EXPIRY) || 3600,
  REFRESH_TOKEN_EXPIRY: process.env.REFRESH_TOKEN_EXPIRY,

  // Email
  RESEND_KEY: process.env.RESEND_KEY,

  // S3 Backup
  S3_BACKUP_ENABLED: process.env.S3_BACKUP_ENABLED === 'true',
  S3_BUCKET_NAME: process.env.S3_BUCKET_NAME,
  AWS_REGION: process.env.AWS_REGION,
  S3_PREFIX: process.env.S3_PREFIX,

  // AWS S3
  BUCKET_NAME: process.env.BUCKET_NAME,
  BUCKET_REGION: process.env.BUCKET_REGION,
  ACCESS_KEY: process.env.ACCESS_KEY,
  SECRET_ACCESS_KEY: process.env.SECRET_ACCESS_KEY,

  // Backup
  RUN_BACKUP_ONCE: process.env.RUN_BACKUP_ONCE === 'true'
};

const config = Object.freeze(_config);
export default config;
