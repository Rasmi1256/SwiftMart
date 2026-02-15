import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: process.env.PORT || 3007, // Assuming 3006 for inventory-service
  databaseUrl: process.env.DATABASE_URL,
  jwtSecret: process.env.JWT_SECRET,
  orderServiceUrl: process.env.ORDER_SERVICE_URL,
  userServiceUrl: process.env.USER_SERVICE_URL,
  geoIndexServiceUrl: process.env.GEO_INDEX_SERVICE_URL || 'http://localhost:3008',
  etaServiceUrl: process.env.ETA_SERVICE_URL || 'http://localhost:3009',
  heatmapServiceUrl: process.env.HEATMAP_SERVICE_URL || 'http://localhost:3010',
  aiScoringServiceUrl: process.env.AI_SCORING_SERVICE_URL || 'http://localhost:3011',
  notificationServiceUrl: process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3003',
};
