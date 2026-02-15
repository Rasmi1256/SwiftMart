import 'dotenv/config';
import http from 'http';
import app from './app';
import { config } from './config';
import { prisma } from 'database'; // Importing from shared database package
import { initializeWebSocket } from './app';

const startServer = async () => {
  try {
    await prisma.$connect();
    console.log('Database connection established successfully.');

    const server = http.createServer(app);

    // Initialize WebSocket with the HTTP server
    initializeWebSocket(server);

    server.listen(config.port, () => {
      console.log(`Delivery Service running on port ${config.port}`);
      console.log(`Access at http://localhost:${config.port}/api/delivery`);
    });
  } catch (error) {
    console.error('Failed to connect to the database:', error);
    process.exit(1);
  }
};

startServer();