// backend/search-service/src/routes/searchRoutes.ts
import { Router } from 'express';
import { refreshIndex, searchProducts } from '../controllers/searchController';

const router = Router();

// Public Search Endpoint
router.get('/', searchProducts);

// Internal Indexing Endpoint (Should be protected or internal only in production)
router.post('/index/refresh', refreshIndex); 

export default router;