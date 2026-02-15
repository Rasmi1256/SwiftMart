import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';

// 1. Keep this for internal logic
interface CustomJwtPayload extends jwt.JwtPayload {
  id: string;
  email: string;
}

// 2. THIS IS THE KEY CHANGE: Extend the global Express namespace
declare global {
  namespace Express {
    interface Request {
      user?: CustomJwtPayload;
    }
  }
}

// 3. Change 'AuthRequest' back to 'Request'
export const authenticate = (req: Request, res: Response, next: NextFunction) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ message: 'Access denied. No token provided.' });
  }

  try {
    if (!config.jwtSecret) {
      console.error('JWT Secret is not defined in configuration.');
      return res.status(500).json({ message: 'Server configuration error.' });
    }

    const decoded = jwt.verify(token, config.jwtSecret) as CustomJwtPayload;

    if (!decoded.id || !decoded.email) {
      return res.status(400).json({ message: 'Invalid token payload.' });
    }

    req.user = decoded; // Now TypeScript knows req.user exists on standard Request
    next();
  } catch (error) {
    // More specific error handling for JWT issues
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({ message: 'Token expired.' });
    }
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({ message: 'Invalid token.' });
    }
    // Catch-all for other potential errors during verification
    res.status(400).json({ message: 'Token verification failed.' });
  }
};
