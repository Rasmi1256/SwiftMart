import app from './app';
import { config } from './config';
import prisma from './db';
const startServer = async () => {
    try {
        await prisma.$connect();
        console.log('Database connection established successfully.');
        app.listen(config.port, () => {
            console.log(`User Service running on port ${config.port}`);
            console.log(`Access at http://localhost:${config.port}/api/promotions`);
        });
    }
    catch (error) {
        console.error('Failed to connect to the database:', error);
        process.exit(1);
    }
};
startServer();
