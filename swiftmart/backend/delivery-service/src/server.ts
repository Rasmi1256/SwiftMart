import app from './app';
import { config } from './config';
import { connectDb } from './db';

const startServer = async () => {
  await connectDb(); // Connect to database

  app.listen(config.port, () => {
    console.log(`Delivery Service running on port ${config.port}`);
    console.log(`Access at http://localhost:${config.port}/api/delivery`);
  });
};

startServer();