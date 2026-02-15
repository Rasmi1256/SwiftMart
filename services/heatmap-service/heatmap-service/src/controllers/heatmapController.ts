import { Request, Response } from 'express';
import { HeatmapService } from '../services/heatmapService';

const heatmapService = new HeatmapService();

// @desc    Get surge multiplier for location
// @route   GET /api/heatmap/surge
// @access  Internal
export const getSurgeMultiplier = async (req: Request, res: Response) => {
  try {
    const { lat, lng } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({ message: 'Latitude and longitude are required.' });
    }

    const latNum = parseFloat(lat as string);
    const lngNum = parseFloat(lng as string);

    if (isNaN(latNum) || isNaN(lngNum)) {
      return res.status(400).json({ message: 'Invalid latitude or longitude.' });
    }

    const multiplier = await heatmapService.getSurgeMultiplier(latNum, lngNum);

    res.status(200).json({
      multiplier,
      location: { lat: latNum, lng: lngNum }
    });
  } catch (error) {
    console.error('Error getting surge multiplier:', error);
    res.status(500).json({ message: 'Failed to get surge multiplier.' });
  }
};

// @desc    Update heatmap with order data
// @route   POST /api/heatmap/update
// @access  Internal
export const updateHeatmap = async (req: Request, res: Response) => {
  try {
    const { lat, lng, orderCount, driverCount } = req.body;

    if (typeof lat !== 'number' || typeof lng !== 'number') {
      return res.status(400).json({ message: 'Valid latitude and longitude are required.' });
    }

    await heatmapService.updateHeatmap(lat, lng, orderCount || 1, driverCount || 0);

    res.status(200).json({
      message: 'Heatmap updated successfully.',
      location: { lat, lng }
    });
  } catch (error) {
    console.error('Error updating heatmap:', error);
    res.status(500).json({ message: 'Failed to update heatmap.' });
  }
};

// @desc    Get heatmap data for region
// @route   GET /api/heatmap/region
// @access  Internal
export const getHeatmapData = async (req: Request, res: Response) => {
  try {
    const { centerLat, centerLng, radius } = req.query;

    if (!centerLat || !centerLng) {
      return res.status(400).json({ message: 'Center latitude and longitude are required.' });
    }

    const centerLatNum = parseFloat(centerLat as string);
    const centerLngNum = parseFloat(centerLng as string);
    const radiusNum = parseFloat(radius as string) || 5;

    const heatmapData = await heatmapService.getHeatmapData(centerLatNum, centerLngNum, radiusNum);

    res.status(200).json({
      center: { lat: centerLatNum, lng: centerLngNum },
      radius: radiusNum,
      data: heatmapData
    });
  } catch (error) {
    console.error('Error getting heatmap data:', error);
    res.status(500).json({ message: 'Failed to get heatmap data.' });
  }
};
