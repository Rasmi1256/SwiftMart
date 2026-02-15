import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';

/**
 * 1. Global Type Augmentation
 * This tells TypeScript that every 'Request' object in your app 
 * has an optional 'user' property containing your JWT data.
 */
interface CustomJwtPayload extends jwt.JwtPayload {
  id: string;
  email: string;
  role: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: CustomJwtPayload;
    }
  }
}

/**
 * Middleware to protect routes and verify JWT
 */
export const protect = async (
  req: Request, 
  res: Response, 
  next: NextFunction
): Promise<void> => {
  let token: string | undefined;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    res.status(401).json({ message: 'Not authorized, no token.' });
    return; // Return void to stop execution
  }

  try {
    if (!config.jwtSecret) {
      console.error('JWT Secret is not defined in configuration.');
      res.status(500).json({ message: 'Server configuration error.' });
      return;
    }

    // Verify token
    const decoded = jwt.verify(token, config.jwtSecret) as CustomJwtPayload;

    // Runtime check for payload integrity
    if (!decoded.id || !decoded.email || !decoded.role) {
      res.status(401).json({ message: 'Invalid token payload.' });
      return;
    }

    // Assign user to request object
    req.user = decoded;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    
    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({ message: 'Not authorized, token expired.' });
    } else if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({ message: 'Not authorized, token invalid.' });
    } else {
      res.status(500).json({ message: 'Internal server error during auth.' });
    }
  }
};

/**
 * Role-based authorization middleware
 */
export const admin = (req: Request, res: Response, next: NextFunction): void => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ message: 'Not authorized as admin.' });
  }
};

export const driver = (req: Request, res: Response, next: NextFunction): void => {
  if (req.user && req.user.role === 'driver') {
    next();
  } else {
    res.status(403).json({ message: 'Not authorized as driver.' });
  }
};
