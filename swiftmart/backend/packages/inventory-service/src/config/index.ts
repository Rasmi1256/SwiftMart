import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: process.env.PORT || 3006, // Assuming 3006 for inventory-service
  databaseUrl: process.env.DATABASE_URL,
  jwtSecret: process.env.JWT_SECRET,
};
