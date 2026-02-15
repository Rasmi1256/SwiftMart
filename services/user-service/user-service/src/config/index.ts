import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: process.env.PORT || 3005, // Assuming 3005 for delivery-service
  databaseUrl: process.env.DATABASE_URL,
  orderServiceUrl: process.env.ORDER_SERVICE_URL || 'http://localhost:3002',
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1h',
  googleClientId: process.env.GOOGLE_CLIENT_ID,
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET,
  email: {
    host: process.env.EMAIL_HOST || 'smtp.ethereal.email',
    port: process.env.EMAIL_PORT ? parseInt(process.env.EMAIL_PORT) : 587,
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
},
};

