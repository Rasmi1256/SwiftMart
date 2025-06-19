import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
 // Assuming you have a database connection pool set up

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

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      // Get token from header
      token = req.headers.authorization.split(' ')[1];

      // Verify token
      const decoded = jwt.verify(token, config.jwtSecret) as { id: string; email: string; iat: number; exp: number };

      // Attach user information to the request object
      // For simplicity, we're just attaching id and email from the token.
      // In a real app, you might fetch the user from the DB to ensure they still exist and are active.
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