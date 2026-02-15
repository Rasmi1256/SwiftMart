import express from 'express';
import { getHeatmapData, updateHeatmap} from '../controllers/heatmapController';

const router = express.Router();

// GET /api/heatmap - Get heatmap data
router.get('/', getHeatmapData);

// GET /api/heatmap/:area - Get heatmap data for specific area
//router.get('/:area', getHeatmapDataByArea);

// POST /api/heatmap/update - Update heatmap data
router.post('/update', updateHeatmap);

export default router;
