// backend/payment-service/src/controllers/paymentController.ts
import { Request, Response } from 'express';
import axios from 'axios';
import { config } from '../config';
import { prisma , Prisma, TransactionStatus } from 'database';
import '../middlewares/authMiddleware'; // Import to ensure type extension is available

// Helper to update order status in Order Management Service
const updateOrderStatus = async (orderId: string, newStatus: string, token: string) => {
  try {
    // Note: We use the admin endpoint on the Order Service
    await axios.put(
      `${config.orderServiceUrl}/admin/orders/${orderId}`,
      { status: newStatus },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    console.log(`Order ${orderId} status updated to ${newStatus} in Order Management Service.`);
  } catch (error) {
    console.error(`Failed to update order ${orderId} status to ${newStatus}:`, (error as any).response?.data || error);
  }
};

// Mock function to simulate creating a payment intent with a real gateway
const mockCreatePaymentIntent = (amount: number, currency: string) => {
  // In a real application, this would call the Stripe/PayPal API
  // and receive a PaymentIntent ID and Client Secret.
  return {
    paymentIntentId: `pi_${Date.now()}_${Math.random().toString(36).substring(7)}`,
    clientSecret: `sec_${Date.now()}_${Math.random().toString(36).substring(7)}`,
    amount: amount,
    currency: currency,
    success: true,
  };
};

// Mock function to simulate confirming a payment by the gateway
const mockConfirmPayment = (paymentIntentId: string, shouldSucceed: boolean) => {
  // In a real application, this would be handled via a webhook or final API call
  // For the mock, we randomly succeed or use the test key
  const succeed = shouldSucceed || (Math.random() > 0.1); // 90% success rate
  return {
    success: succeed,
    status: succeed ? 'succeeded' : 'failed',
    message: succeed ? 'Payment confirmed and funds captured.' : 'Payment failed due to mock bank error.',
  };
};


// @desc    Create a payment intent for a new order
// @route   POST /api/payments/intent
// @access  Private (User Only)
export const createPaymentIntent = async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Not authorized, user not found.' });
  }

  const { orderId, amount, currency = 'USD' } = req.body;

  if (!orderId || typeof amount !== 'number' || amount <= 0) {
    return res.status(400).json({ message: 'Order ID and a valid amount are required.' });
  }

  try {
    // 1. Check if order exists and is pending payment (optional, but good)
    // In a real system, you'd fetch the order to verify the amount/status.

    // 2. Simulate Payment Gateway interaction
    const paymentIntent = mockCreatePaymentIntent(amount, currency);

    // 3. Record the transaction as PENDING
    await prisma.transaction.create({
      data: {
        orderId,
        userId: req.user.id,
        amount,
        currency,
        paymentGateway: 'stripe_mock',
        gatewayTransactionId: paymentIntent.paymentIntentId,
        status: 'pending',
      },
    });

    res.status(200).json({
      message: 'Payment intent created successfully.',
      clientSecret: paymentIntent.clientSecret, // Used by frontend SDK
      paymentIntentId: paymentIntent.paymentIntentId,
    });
  } catch (error) {
    console.error('Error creating payment intent:', error);
    res.status(500).json({ message: 'Server error creating payment intent.' });
  }
};

// @desc    Finalize the payment process (Called after client-side confirmation)
// @route   POST /api/payments/finalize
// @access  Private (User Only)
export const finalizePayment = async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Not authorized, user not found.' });
  }

  const { paymentIntentId, orderId, finalStatus } = req.body;

  if (!paymentIntentId || !orderId || !finalStatus) {
    return res.status(400).json({ message: 'Payment Intent ID, Order ID, and finalStatus are required.' });
  }

  try {
    // 1. Find the PENDING transaction record
    const transaction = await prisma.transaction.findFirst({
      where: { gatewayTransactionId: paymentIntentId, orderId },
    });

    if (!transaction) {
      return res.status(404).json({ message: 'Transaction record not found.' });
    }

    let isSuccess = finalStatus === 'succeeded';

    // 2. Simulate final confirmation with the payment gateway
    const confirmation = mockConfirmPayment(paymentIntentId, isSuccess);

    let newTransactionStatus: TransactionStatus;
    let newOrderStatus: string;

    if (confirmation.success) {
      newTransactionStatus = 'succeeded';
      newOrderStatus = 'placed'; // Change from 'pending' to 'placed' in Order Service
    } else {
      newTransactionStatus = 'failed';
      newOrderStatus = 'pending'; // Keep as 'pending' for retry or change to 'failed'
    }

    // 3. Update the transaction record
    await prisma.transaction.update({
      where: { id: transaction.id },
      data: { status: newTransactionStatus },
    });

    // 4. Update the Order status in the Order Management Service
    // We need the user's token (from the request) to update the order as an authorized user.
    const token = req.headers.authorization?.split(' ')[1];
    if (token) {
        await updateOrderStatus(orderId, newOrderStatus, token);
    }

    if (newTransactionStatus === 'succeeded') {
      res.status(200).json({
        message: 'Payment successful. Order status updated to placed.',
        status: 'succeeded',
      });
    } else {
      res.status(400).json({
        message: confirmation.message,
        status: 'failed',
      });
    }
  } catch (error) {
    console.error('Error finalizing payment:', error);
    res.status(500).json({ message: 'Server error finalizing payment.' });
  }
};