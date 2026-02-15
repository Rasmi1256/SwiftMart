import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import asyncHandler from 'express-async-handler';
import {prisma} from 'database';  

interface AuthRequest extends Request {
  user?: any; // Replace with your actual User type if available
}

// Define the shape of your token payload
interface MyTokenPayload extends jwt.JwtPayload {
  id: string;
}

const protect = asyncHandler(async (req: AuthRequest, res: Response, next: NextFunction) => {
  let token: string | undefined;

  if (req.headers.authorization?.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const jwtSecret = process.env.JWT_SECRET;

      if (!jwtSecret) {
        console.error("Configuration Error: JWT_SECRET is not set.");
        res.status(500);
        throw new Error('Server configuration error.');
      }

      // Verify token using the default 'jwt' object
      const decoded = jwt.verify(token, jwtSecret) as MyTokenPayload;

      // Get user from the token
      req.user = await prisma.user.findUnique({
        where: { id: decoded.id },
        select: { id: true, email: true, firstName: true, lastName: true, phoneNumber: true },
      });

      if (!req.user) {
        res.status(401);
        throw new Error('Not authorized, user not found');
      }

      return next(); 
    } catch (error) {
      console.error(error);
      res.status(401);
      
      // Now you can safely check error types if needed
      if (error instanceof jwt.JsonWebTokenError) {
        throw new Error('Not authorized, token is invalid');
      }
      throw new Error('Not authorized, token failed');
    }
  }

  if (!token) {
    res.status(401);
    throw new Error('Not authorized, no token');
  }
});

export { protect };
