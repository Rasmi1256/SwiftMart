import { Router } from 'express';
import {
  createProduct,
  getProducts,
  getProductByIdentifier,
  updateProduct,
  deleteProduct,
} from '../controllers/productController';

const router = Router();

// Public routes for products
router.get('/', getProducts);
router.get('/:identifier', getProductByIdentifier);

// Admin routes for products (would add 'protect' and 'authorize' middleware here)
router.post('/', createProduct);
router.put('/:id', updateProduct);
router.delete('/:id', deleteProduct);

export default router;