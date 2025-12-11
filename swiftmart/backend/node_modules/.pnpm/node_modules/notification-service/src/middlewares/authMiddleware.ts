import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';

// Define the expected structure of the JWT payload, extending the base JwtPayload
interface CustomJwtPayload extends jwt.JwtPayload {
  id: string;
  email: string;
  // Add any other custom properties you expect in the JWT payload
}

// Extend the Request interface to include the user property with the defined payload type
export interface AuthRequest extends Request {
  user?: CustomJwtPayload;
}

export const protect = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ message: 'Not authorized, no token.' });
  }

  try {
    // Ensure jwtSecret is defined.
    if (!config.jwtSecret) {
      console.error('JWT Secret is not defined in configuration.');
      return res.status(500).json({ message: 'Server configuration error: JWT secret missing.' });
    }

    // Verify the token and cast it to our custom payload interface.
    const decoded = jwt.verify(token, config.jwtSecret) as CustomJwtPayload;
    req.user = decoded; // Assign the full decoded payload
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