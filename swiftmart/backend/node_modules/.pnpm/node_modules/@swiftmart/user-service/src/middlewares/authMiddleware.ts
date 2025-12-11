import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import asyncHandler from 'express-async-handler';
import prisma from '../db'; // Assuming you have a User model

// Extend Express's Request interface to include the user property
interface AuthRequest extends Request {
  user?: any; // Or a more specific user type
}

const protect = asyncHandler(async (req: AuthRequest, res: Response, next: NextFunction) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      // Get token from header
      token = req.headers.authorization.split(' ')[1];
      const jwtSecret = process.env.JWT_SECRET;
      if (!jwtSecret) {
        // This is a configuration error; we should halt execution
        console.error("Configuration Error: JWT_SECRET is not set.");
        res.status(500);
        throw new Error('Server configuration error: Authentication secret missing.');
      }

      // Verify token
      const decoded: any = jwt.verify(token,jwtSecret);

      // Get user from the token
      req.user = await prisma.user.findUnique({
        where: { id: decoded.id },
        select: { id: true, email: true, firstName: true, lastName: true, phoneNumber: true }, // Select fields excluding passwordHash
      });

      if (!req.user) {
        res.status(401);
        throw new Error('Not authorized, user not found');
      }

      next();
    } catch (error) {
      console.error(error);
      res.status(401);
      throw new Error('Not authorized, token failed');
    }
  }

  if (!token) {
    res.status(401);
    throw new Error('Not authorized, no token');
  }
});

export { protect };
