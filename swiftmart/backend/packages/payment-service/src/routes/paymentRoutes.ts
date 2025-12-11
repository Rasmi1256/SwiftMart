// backend/payment-service/src/routes/paymentRoutes.ts
import { Router } from 'express';
import { createPaymentIntent, finalizePayment } from '../controllers/paymentController';
import { protect } from '../middlewares/authMiddleware'; // Assumed to be available/copied

const router = Router();

// Endpoint 1: Initiate payment flow (Get client secret)
router.post('/intent', protect, createPaymentIntent);

// Endpoint 2: Finalize payment after client confirmation
router.post('/finalize', protect, finalizePayment);

export default router;