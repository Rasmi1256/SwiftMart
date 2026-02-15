import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';

// 1. Define the payload structure
interface CustomJwtPayload extends jwt.JwtPayload {
  id: string;
  email: string;
}

// 2. GLOBAL AUGMENTATION: This tells TypeScript that the standard 
// Express Request object has an optional 'user' property.
declare global {
  namespace Express {
    interface Request {
      user?: CustomJwtPayload;
    }
  }
}

// 3. Use the standard 'Request' type now. 
// Because of the augmentation above, 'req.user' is now valid!
export const protect = async (req: Request, res: Response, next: NextFunction) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ message: 'Not authorized, no token.' });
  }

  try {
    if (!config.jwtSecret) {
      console.error('JWT Secret is not defined in configuration.');
      return res.status(500).json({ message: 'Server configuration error: JWT secret missing.' });
    }

    const decoded = jwt.verify(token, config.jwtSecret) as CustomJwtPayload;
    
    // This no longer throws a TypeScript error
    req.user = decoded; 
    
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({ message: 'Not authorized, token expired.' });
    }
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({ message: 'Not authorized, token failed or invalid.' });
    }
    res.status(500).json({ message: 'Server error during authentication.' });
  }
};