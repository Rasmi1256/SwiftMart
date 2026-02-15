import { Request, Response, NextFunction } from 'express';
// Default import for the runtime logic
import jwt from 'jsonwebtoken';
// Type-only import to keep TypeScript happy without breaking ESM runtime
import type { JwtPayload } from 'jsonwebtoken';
import { config } from '../config';

declare global {
  namespace Express {
    interface Request {
      user?: { id: string; email: string };
    }
  }
}

export const protect = (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization ?? '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : undefined;

    if (!token) {
      return res.status(401).json({ message: 'Not authorized, no token.' });
    }

    const secret = config.jwtSecret;
    if (!secret) {
      console.error('JWT secret missing in configuration');
      return res.status(500).json({ message: 'Server configuration error.' });
    }

    const verified = jwt.verify(token, secret);

    if (typeof verified === 'string' || !verified) {
      return res.status(401).json({ message: 'Not authorized, invalid token payload.' });
    }

    const payload = verified as JwtPayload & { id?: unknown; email?: unknown };

    if (typeof payload.id !== 'string' || typeof payload.email !== 'string') {
      return res.status(401).json({ message: 'Not authorized, invalid token payload.' });
    }

    req.user = { id: payload.id, email: payload.email };
    return next();
  } catch (error: any) {
    console.error('Auth middleware error:', error);

    // Access the Error classes directly from the default 'jwt' object
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({ message: 'Not authorized, token expired.' });
    }

    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({ message: 'Not authorized, token invalid.' });
    }

    return res.status(500).json({ message: 'Server error during authentication.' });
  }
};

export const admin = (req: Request, res: Response, next: NextFunction) => {
  if (req.user && req.user.email === 'admin@swiftmart.com') {
    return next();
  }
  return res.status(403).json({ message: 'Not authorized as admin.' });
};
