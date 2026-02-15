import express from 'express';
import {
  indexDriverLocation,
  removeDriverLocation,
  findNearbyDrivers,
  getDriverLocation,
} from '../controllers/geoIndexController';

const router = express.Router();

// Driver location indexing
router.post('/drivers/:driverId/location', indexDriverLocation);
router.delete('/drivers/:driverId/location', removeDriverLocation);

// Driver queries
router.get('/drivers/nearby', findNearbyDrivers);
router.get('/drivers/:driverId/location', getDriverLocation);

export default router;
