import { Router } from 'express';
import {
  createCategory,
  getCategories,
  getCategoryByIdentifier,
  updateCategory,
  deleteCategory,
} from '../controllers/categoryController';

const router = Router();

// Public routes for categories
router.get('/', getCategories);
router.get('/:identifier', getCategoryByIdentifier);

// Admin routes for categories (would add 'protect' and 'authorize' middleware here)
router.post('/', createCategory);
router.put('/:id', updateCategory);
router.delete('/:id', deleteCategory);

export default router;