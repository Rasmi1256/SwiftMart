import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: process.env.PORT || 3008,
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  h3Resolution: parseInt(process.env.H3_RESOLUTION || '9'),
  logLevel: process.env.LOG_LEVEL || 'info',
  heartbeatTTL: parseInt(process.env.HEARTBEAT_TTL || '30'), // seconds
};
