import 'dotenv/config';
import app from './app';
import { config } from './config';

const startServer = async () => {
  try {
    app.listen(config.port, () => {
      console.log(`🚀 Heatmap Service running on port ${config.port}`);
      console.log(`   http://localhost:${config.port}/api/heatmap`);
    });
  } catch (error) {
    console.error('❌ Failed to start Heatmap service:', error);
    process.exit(1);
  }
};

startServer();
