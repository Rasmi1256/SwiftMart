import express from 'express';
import deliveryRoutes from './routes/deliveryRoutes';

const app = express();

app.use(express.json());

app.use('/api/delivery', deliveryRoutes);

// Basic error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).send('Something broke in Delivery Service!');
});

export default app;