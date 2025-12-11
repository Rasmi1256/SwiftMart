import app from './app';
import { config } from './config';
import prisma from './db';

process.on('uncaughtException', (error: Error) => {
  console.error('UNCAUGHT EXCEPTION! 💥 Shutting down...');
  console.error(error.name, error.message, error.stack);
  process.exit(1);
});

process.on('unhandledRejection', (reason: any) => {
  console.error('UNHANDLED REJECTION! 💥 Shutting down...');
  console.error('Reason:', reason);
  // A graceful shutdown is better here, but process.exit will ensure it stops.
  process.exit(1);
});

const startServer = async () => {
  try {
    await prisma.$connect();
    console.log('Database connection established successfully.');

    app.listen(config.port, () => {
      console.log(`Search Service running on port ${config.port}`);
      console.log(`Access at http://localhost:${config.port}/api/search`);
    });
  } catch (error) {
    console.error('Failed to connect to the database:', error);
    process.exit(1);
  }
};

startServer();
