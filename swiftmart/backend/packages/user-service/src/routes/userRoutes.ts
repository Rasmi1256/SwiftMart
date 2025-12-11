import { Router } from 'express';
import {
  registerUser,
  loginUser,
  requestOtp,
  loginWithOtp,
  getUserProfile,
  updateUserProfile,
  addAddress,
  updateAddress,
  deleteAddress,
  asyncHandler,
  googleAuth,
  googleAuthCallback,
} from '../controllers/userController';
import { protect } from '../middlewares/authMiddleware'; 
const router = Router();

// Public routes
router.post('/register', registerUser);
router.post('/login', loginUser);

// OTP Routes
router.post('/otp/request', requestOtp);
router.post('/otp/login', loginWithOtp);

// Private routes (protected by JWT middleware)
router.route('/profile')
  .get(protect, getUserProfile)
  .put(protect, updateUserProfile);

router.post('/addresses', protect, addAddress);
router.put('/addresses/:id', protect, updateAddress);
router.delete('/addresses/:id', protect, deleteAddress);

router.get('/auth/google', googleAuth);
router.get('/auth/google/callback', googleAuthCallback);


export default router;
