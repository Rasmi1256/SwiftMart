import { Request, Response, NextFunction } from 'express';
import jwt, { JwtPayload, JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken';
import { config } from '../config';

// Extend the Request interface to include the user property
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

    // verify may return string or object (JwtPayload). Narrow safely.
    const verified = jwt.verify(token, secret as jwt.Secret);

    if (typeof verified === 'string' || !verified) {
      return res.status(401).json({ message: 'Not authorized, invalid token payload.' });
    }

    const payload = verified as JwtPayload & { id?: unknown; email?: unknown };

    if (typeof payload.id !== 'string' || typeof payload.email !== 'string') {
      return res.status(401).json({ message: 'Not authorized, invalid token payload.' });
    }

    req.user = { id: payload.id, email: payload.email };

    return next();
  } catch (error) {
    console.error('Auth middleware error:', error);

    if (error instanceof TokenExpiredError) {
      return res.status(401).json({ message: 'Not authorized, token expired.' });
    }

    if (error instanceof JsonWebTokenError) {
      return res.status(401).json({ message: 'Not authorized, token invalid.' });
    }

    return res.status(500).json({ message: 'Server error during authentication.' });
  }
};
