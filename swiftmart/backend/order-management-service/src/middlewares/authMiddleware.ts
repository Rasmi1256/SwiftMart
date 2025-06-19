import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';

// Extend the Request interface to include the user property
declare global {
  namespace Express {
    interface Request {
      user?: { id: string; email: string };
    }
  }
}

export const protect = async (req: Request, res: Response, next: NextFunction) => {
  let token;

  console.log('JWT Secret in authMiddleware:', config.jwtSecret); // Log the secret for debugging (remove in production)

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, config.jwtSecret) as { id: string; email: string; iat: number; exp: number };
      req.user = { id: decoded.id, email: decoded.email };
      next();
    } catch (error) {
      console.error('Auth middleware error:', error);
      if (error instanceof jwt.JsonWebTokenError) {
         res.status(401).json({ message: 'Not authorized, token failed or invalid.' });
          return;
      }
      res.status(500).json({ message: 'Server error during authentication.' });
    }
  }

  if (!token) {
    res.status(401).json({ message: 'Not authorized, no token.' });
  }
};
