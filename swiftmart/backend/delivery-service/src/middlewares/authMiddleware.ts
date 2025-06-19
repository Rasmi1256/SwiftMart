import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import DeliveryPerson from '../models/deliveryPerson'; // Import DeliveryPerson model

// Extend the Request interface to include the deliveryPerson property
declare global {
  namespace Express {
    interface Request {
      deliveryPerson?: { id: string; email: string };
    }
  }
}

export const protectDeliveryPerson = async (req: Request, res: Response, next: NextFunction) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, config.jwtSecret) as { id: string; email: string; iat: number; exp: number };

      // Optional: Fetch delivery person from DB to ensure they still exist and are active
      const deliveryPerson = await DeliveryPerson.findById(decoded.id).select('-passwordHash');
      if (!deliveryPerson || deliveryPerson.status === 'inactive') { // Check if active
         res.status(401).json({ message: 'Not authorized, delivery person inactive or not found.' });
         return;
    
      }

      req.deliveryPerson = { id: decoded.id, email: decoded.email };
      next();
    } catch (error) {
      console.error('Auth middleware error (Delivery Person):', error);
      if (error instanceof jwt.JsonWebTokenError) {
         res.status(401).json({ message: 'Not authorized, token failed or invalid.' });
         return;
      }
      res.status(500).json({ message: 'Server error during authentication.' });
    }
  }

  if (!token) {
    res.status(401).json({ message: 'Not authorized, no token provided.' });
  }
};