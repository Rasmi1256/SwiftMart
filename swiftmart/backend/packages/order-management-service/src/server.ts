import app from './app';
import { config } from './config';
import prisma from './db';
import dotenv from 'dotenv';
dotenv.config();

const PORT = Number(process.env.PORT) || 3106;

const startServer = async () => {
  try {
    await prisma.$connect();
    console.log('Database connection established successfully.');

    const server = app.listen(PORT, () => {
      console.log(`Order Management Service running on port ${PORT}`);
      console.log(`Access at http://localhost:${PORT}/api/orders`);
    });

    // --- PERMANENT FIX for EADDRINUSE LOOP ---
    server.on('error', (err: any) => {
      if (err.code === 'EADDRINUSE') {
        console.error(`❌ PORT ${PORT} already in use. Stopping server.`);
        process.exit(1); // Prevent nodemon infinite restart loop
      } else {
        console.error('❌ Server error:', err);
      }
    });

  } catch (error) {
    console.error('Failed to connect to the database:', error);
    process.exit(1);
  }
};

startServer();
