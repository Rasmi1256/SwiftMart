import { Router } from 'express';
import {
  registerUser,
  loginUser,
  getUserProfile,
  updateUserProfile,
  addAddress,
  updateAddress,
  deleteAddress,
  asyncHandler,
} from '../controllers/userController';
import { protect } from '../middlewares/authMiddleware'; 
const router = Router();

// Public routes
router.post('/register', registerUser);
router.post('/login', loginUser);

// Private routes (protected by JWT middleware)
router.get('/profile', protect, getUserProfile);
router.put('/profile', protect, updateUserProfile);
router.post('/addresses', protect, addAddress);
router.put('/addresses/:id', protect, updateAddress);
router.delete('/addresses/:id', protect, deleteAddress);

export default router;
