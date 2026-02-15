import express from 'express';
import { getCachedETA } from '../controllers/etaController';

const router = express.Router();

// GET /api/eta - Get ETA for delivery
router.get('/', getCachedETA);

export default router;
