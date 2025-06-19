import app from './app';
import { config } from './config';
import { connectDb } from './db';

const startServer = async () => {
  await connectDb(); // Connect to database

  app.listen(config.port, () => {
    console.log(`Product Catalog Service running on port ${config.port}`);
    console.log(`Access products at http://localhost:${config.port}/api/products`);
    console.log(`Access categories at http://localhost:${config.port}/api/categories`);
  });
};

startServer();