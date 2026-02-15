import 'dotenv/config';
import app from './app';
import { config } from './config';
import './infra/redisClient'; // Initialize Redis client

const startServer = async () => {
  try {
    app.listen(config.port, () => {
      console.log(`🚀 Geo Index Service running on port ${config.port}`);
      console.log(`   http://localhost:${config.port}/api/geo-index`);
    });
  } catch (error) {
    console.error('❌ Failed to start Geo Index service:', error);
    process.exit(1);
  }
};

startServer();
