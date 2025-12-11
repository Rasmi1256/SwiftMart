import { Request, Response, NextFunction } from 'express';
import jwt, { Secret, SignOptions } from 'jsonwebtoken';
import passport from 'passport';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { User, Address } from '../generated/prisma/client';
import prisma from '../db'; // Using a shared Prisma instance
import { config } from '../config';
import { sendEmail } from '../config/sendEmail';

// Extend Express Request type to include the user property
declare global {
  namespace Express {
    interface User {
      id: string;
      email?: string;
    }
  }
}

export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>
) => (req: Request, res: Response, next: NextFunction) =>
  Promise.resolve(fn(req, res, next)).catch(next);

const generateToken = (id: string, email: string | undefined) => {
  if (!config.jwtSecret) {
    throw new Error('JWT secret is not defined in configuration.');
  }

  const expiresInValue: number | string | undefined = (() => {
  if (config.jwtExpiresIn === undefined || config.jwtExpiresIn === null) return undefined;
  // If it's a numeric string (e.g. "86400"), convert to number, otherwise keep as string like "1d" or "24h"
  const maybeNumber = Number(config.jwtExpiresIn);
  return Number.isFinite(maybeNumber) ? maybeNumber : String(config.jwtExpiresIn);
})();

const signOptions: SignOptions = { expiresIn: expiresInValue as SignOptions['expiresIn'] };
// ...existing code...

  return jwt.sign(
    { id, email },
    config.jwtSecret as Secret,
    signOptions
  );
}; 

// @desc    Register new user
// @route   POST /api/users/register
// @access  Public
export const registerUser = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { email, password, firstName, lastName, phoneNumber } = req.body;

  // Basic validation
  if (!email || !password) {
    res.status(400).json({ message: 'Please enter all required fields: email and password.' });
    return;
  }

  // Check if user already exists
  const userExists = await prisma.user.findUnique({ where: { email } });
  if (userExists) {
    res.status(400).json({ message: 'User with this email already exists.' });
    return;
  }

  try {
    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Create new user
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        firstName,
        lastName,
        phoneNumber,
      },
    });

    // Generate JWT token
    const token = generateToken(user.id, user.email);

    res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phoneNumber: user.phoneNumber,
      },
      token,
    });
  } catch (error) {
    console.error('Error registering user:', error);
    if ((error as any)?.code === 'P2002') { // Prisma unique constraint violation
      res.status(400).json({ message: 'A user with this email already exists.' });
    } else {
      res.status(500).json({ message: 'Server error during registration.' });
    }
  }
});
// @desc    Authenticate user & get token
// @route   POST /api/users/login
// @access  Public
export const loginUser = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body;
  try {
    if (!email || !password) {
      res.status(400).json({ message: 'Please enter all required fields: email and password.' });
      return;
    }

    // Find user by email
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user || !user.passwordHash) {
      res.status(400).json({ message: 'Invalid credentials.' });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);

    if (!isMatch) {
      res.status(400).json({ message: 'Invalid credentials.' });
      return;
    }

    // Generate JWT token
    const token = generateToken(user.id, user.email);

    res.status(200).json({
      message: 'Logged in successfully',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phoneNumber: user.phoneNumber,
      },
      token,
    });
  } catch (error) {
    console.error('Error during login:', error);
    // This will catch errors from DB connection, bcrypt, token generation, etc.
    res.status(500).json({ message: 'Server error during login.' });
  }
});

// @desc    Request OTP for login
// @route   POST /api/users/otp/request
// @access  Public
export const requestOtp = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { email } = req.body;
  if (!email) {
    res.status(400).json({ message: 'Please provide an email.' });
    return;
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    // We send a 200 to prevent user enumeration
    res.status(200).json({ message: 'If a user with that email exists, an OTP has been sent.' });
    return;
  }

  // Generate a 6-digit OTP
  const otp = crypto.randomInt(100000, 999999).toString();

  // Set OTP and expiration (e.g., 10 minutes)
  await prisma.user.update({
    where: { email },
    data: {
      otp,
      otpExpires: new Date(Date.now() + 10 * 60 * 1000),
    },
  });

  try {
    await sendEmail({
      to: user.email,
      subject: 'Your SwiftMart Login Code',
      text: `Your one-time login code is ${otp}. It is valid for 10 minutes.`,
      html: `<b>Your one-time login code is ${otp}</b>. It is valid for 10 minutes.`,
    });
    res.status(200).json({ message: 'If a user with that email exists, an OTP has been sent.' });
  } catch (error) {
    console.error('Error sending OTP email:', error);
    // Clear OTP fields on failure to send
    await prisma.user.update({
      where: { email },
      data: {
        otp: null,
        otpExpires: null,
      },
    });
    res.status(500).json({ message: 'Error sending OTP. Please try again.' });
  }
});

// @desc    Login with OTP
// @route   POST /api/users/otp/login
// @access  Public
export const loginWithOtp = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { email, otp } = req.body;
  if (!email || !otp) {
    res.status(400).json({ message: 'Please provide an email and OTP.' });
    return;
  }

  const user = await prisma.user.findFirst({
    where: {
      email,
      otp,
      otpExpires: {
        gt: new Date(),
      },
    },
  });

  if (!user) {
    res.status(400).json({ message: 'Invalid OTP or OTP has expired.' });
    return;
  }

  // Clear OTP fields after successful login by updating the user
  await prisma.user.update({
    where: { id: user.id },
    data: { otp: null, otpExpires: null },
  });

  // Generate JWT and send response (similar to password login)
  const token = generateToken(user.id, user.email);
  res.status(200).json({ message: 'Logged in successfully with OTP.', token });
});

// @desc    Get user profile
// @route   GET /api/users/profile
// @access  Private
export const getUserProfile = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ message: 'Not authorized, user not found.' });
    return;
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
    });

    if (!user) {
      res.status(404).json({ message: 'User not found.' });
      return;
    }

    const addresses = await prisma.address.findMany({
      where: { userId: req.user.id },
    });

    // Exclude passwordHash from the response
    const { passwordHash, ...userWithoutPassword } = user;

    res.status(200).json({
      ...userWithoutPassword,
      email: user.email,
      addresses,
    });
    return;
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ message: 'Server error fetching profile.' });
  }
});
// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
export const updateUserProfile = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  if (!req.user) {
     res.status(401).json({ message: 'Not authorized, user not found.' });
     return;
  }

  const { firstName, lastName, phoneNumber } = req.body;

  try {
    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        firstName,
        lastName,
        phoneNumber,
      },
    });

    if (!updatedUser) {
      res.status(404).json({ message: 'User not found.' });
      return;
    }

    res.status(200).json({
      message: 'Profile updated successfully',
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        phoneNumber: updatedUser.phoneNumber,
      },
    });
    return;
  } catch (error) {
    console.error('Error updating user profile:', error);
    if ((error as any).code === 'P2002') { // Prisma unique constraint violation
     res.status(400).json({ message: 'Phone number already in use by another user.' });
      return;
    }
    res.status(500).json({ message: 'Server error updating profile.' });
  }
});

// @desc    Add a new address
// @route   POST /api/users/addresses
// @access  Private
export const addAddress = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  if (!req.user) {
   res.status(401).json({ message: 'Not authorized, user not found.' });
   return;
  }

  const { addressLine1, addressLine2, city, state, zipCode, country, latitude, longitude, isDefault } = req.body;

  if (!addressLine1 || !city || !state || !zipCode) {
     res.status(400).json({ message: 'Required address fields missing: addressLine1, city, state, zipCode.' });
     return;
  }

  try {
    // If new address is set as default, unset previous default for this user
    // This can be done in a transaction to ensure atomicity
    if (isDefault) {
      await prisma.address.updateMany({
        where: { userId: req.user.id, isDefault: true },
        data: { isDefault: false },
      });
    }

    const createdAddress = await prisma.address.create({
      data: {
        userId: req.user.id,
        addressLine1: addressLine1,
        addressLine2: addressLine2,
        city: city,
        state: state,
        zipCode,
        country,
        latitude,
        longitude,
        isDefault: isDefault || false,
      },
    });

    res.status(201).json({
      message: 'Address added successfully',
      address: createdAddress,
    });
    return;
  } catch (error) {
    console.error('Error adding address:', error);
    res.status(500).json({ message: 'Server error adding address.' });
  }
});

// @desc    Update an existing address
// @route   PUT /api/users/addresses/:id
// @access  Private
export const updateAddress = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  if (!req.user) {
     res.status(401).json({ message: 'Not authorized, user not found.' });
     return;
  }

  const addressId = req.params.id;
  const { addressLine1, addressLine2, city, state, zipCode, country, latitude, longitude, isDefault } = req.body;

  try {
    // Find the address and ensure it belongs to the authenticated user
    const address = await prisma.address.findFirst({
      where: { id: addressId, userId: req.user.id },
    });

    if (!address) {
      res.status(404).json({ message: 'Address not found or does not belong to user.' });
      return;
    }

    // If updating to default, unset previous default for this user
    if (isDefault === true && !address.isDefault) {
      await prisma.address.updateMany({
        where: { userId: req.user.id, isDefault: true },
        data: { isDefault: false },
      });
    }

    const updatedAddress = await prisma.address.update({
      where: { id: addressId },
      data: {
        ...(addressLine1 !== undefined && { addressLine1 }),
        ...(addressLine2 !== undefined && { addressLine2 }),
        ...(city !== undefined && { city }),
        ...(state !== undefined && { state }),
        ...(zipCode !== undefined && { zipCode }),
        ...(country !== undefined && { country }),
        ...(latitude !== undefined && { latitude }),
        ...(longitude !== undefined && { longitude }),
        ...(isDefault !== undefined && { isDefault }),
      },
    });

    res.status(200).json({
      message: 'Address updated successfully',
      address: updatedAddress,
    });
    return;
  } catch (error) {
    console.error('Error updating address:', error);
    res.status(500).json({ message: 'Server error updating address.' });
  }
});

// @desc    Delete an address
// @route   DELETE /api/users/addresses/:id
// @access  Private
export const deleteAddress = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ message: 'Not authorized, user not found.' });
    return;
  }

  const addressId = req.params.id;

  try {
    // Ensure the address belongs to the authenticated user before deleting
    const result = await prisma.address.deleteMany({
      where: { id: addressId, userId: req.user.id },
    });

    if (result.count === 0) {
      res.status(404).json({ message: 'Address not found or does not belong to user.' });
      return;
    }

    res.status(200).json({ message: 'Address deleted successfully', id: addressId });
    return;
  } catch (error) {
    console.error('Error deleting address:', error);
    res.status(500).json({ message: 'Server error deleting address.' });
  }
});

// --- OAuth2 Authentication ---

// @desc    Authenticate with Google
// @route   GET /api/users/auth/google
// @access  Public
export const googleAuth = passport.authenticate('google', {
  scope: ['profile', 'email'], // The permissions we ask from Google
  session: false, // We are using JWTs, not sessions
});

// @desc    Google auth callback
// @route   GET /api/users/auth/google/callback
// @access  Public
export const googleAuthCallback = (req: Request, res: Response) => {
  passport.authenticate('google', { session: false, failureRedirect: '/login/failed' }, (err: any, user: any, info: any) => {    
    const frontendUrl = (config as any).frontendUrl;
    if (!frontendUrl) {
      console.error('Frontend URL is not defined in configuration.');
      return res.status(500).json({ message: 'Configuration error: Frontend URL is missing.' });
    }
    if (err || !user) {
      // Redirect to a failure page on the frontend, with an error message
      return res.redirect(`${frontendUrl}/login?error=${encodeURIComponent(err?.message || 'Authentication failed.')}`);
    }

    // On success, generate a JWT for the user
    const token = generateToken(user.id, user.email);

    // Redirect user to the frontend, passing the token as a query parameter
    // The frontend will then store this token.
    res.redirect(`${frontendUrl}/auth/callback?token=${token}`);

  })(req, res);
};
