import jwt from 'jsonwebtoken';
import { config } from '../config';
export const protect = async (req, res, next) => {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            token = req.headers.authorization.split(' ')[1];
            const decoded = jwt.verify(token, config.jwtSecret);
            req.user = { id: decoded.id, email: decoded.email };
            next();
        }
        catch (error) {
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
export const admin = (req, res, next) => {
    if (req.user && req.user.email === 'admin@swiftmart.com') { // Simple check, replace with proper role check
        next();
    }
    else {
        res.status(403).json({ message: 'Not authorized as admin.' });
    }
};
