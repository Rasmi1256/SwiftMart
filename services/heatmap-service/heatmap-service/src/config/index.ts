import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: process.env.PORT || 3010,
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  h3Resolution: parseInt(process.env.H3_RESOLUTION || '8'),
  heatmapWindowMinutes: parseInt(process.env.HEATMAP_WINDOW_MINUTES || '15'),
  surgeThreshold: parseFloat(process.env.SURGE_THRESHOLD || '1.5'),
};
