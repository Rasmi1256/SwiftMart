// File: server.ts
import dotenv from 'dotenv'; // 1. IMPORT dotenv
dotenv.config(); // 2. EXECUTE CONFIG at the very top of the entry file.

import app from './app';
import { config } from './config';
import prisma from './db';

const startServer = async () => {
  try {
    // The check below should now print the correct URL
    console.log('Database URL being used:', process.env.DATABASE_URL);
    
    // Now that the env is loaded, the database connection should succeed
    await prisma.$connect();
    console.log('Database connection established successfully.');


    app.listen(config.port, () => {
      console.log(`User Service running on port ${config.port}`);
      console.log(`Access at http://localhost:${config.port}/api/users`);
    });
  } catch (error) {
    console.error('Failed to connect to the database:', error);
    process.exit(1);
  }
};

startServer();
