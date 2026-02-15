// ✅ 1. Use this special import to load .env BEFORE anything else
import 'dotenv/config'; 

import app from './app';
import { config } from './config';
import { prisma } from 'database'; // ✅ Now safe to import

const startServer = async () => {
  try {
    // Debugging: Ensure the URL is visible
    console.log('Database URL loaded:', process.env.DATABASE_URL ? 'YES' : 'NO');
    
    // Explicit connection check (optional but good for safety)
    await prisma.$connect();
    console.log('✅ Database connection established via Shared Library.');

    app.listen(config.port, () => {
      console.log(`🚀 User Service running on port ${config.port}`);
      console.log(`   http://localhost:${config.port}/api/users`);
    });

  } catch (error) {
    console.error('❌ Failed to connect to the database:', error);
    process.exit(1);
  }
};

startServer();