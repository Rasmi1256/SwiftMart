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
interface AuthRequest extends Request {
  user?: CustomJwtPayload;
}

export const authenticate = (req: AuthRequest, res: Response, next: NextFunction) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ message: 'Access denied. No token provided.' });
  }

  try {
    // Ensure jwtSecret is defined. This addresses TS2769.
    if (!config.jwtSecret) {
      console.error('JWT Secret is not defined in configuration.');
      return res.status(500).json({ message: 'Server configuration error: JWT secret missing.' });
    }

    // Verify the token and cast it to our custom payload interface.
    // This addresses TS2352 by explicitly telling TypeScript the expected shape.
    const decoded = jwt.verify(token, config.jwtSecret) as CustomJwtPayload;

    // It's good practice to also check if the required custom fields exist at runtime,
    // although TypeScript will assume they do after the cast.
    if (!decoded.id || !decoded.email) {
      return res.status(400).json({ message: 'Invalid token payload: missing user ID or email.' });
    }

    req.user = decoded; // Assign the decoded payload to req.user
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
