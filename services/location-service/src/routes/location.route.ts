import express from 'express';
import {
  postLocation,
  fetchLocations,
  updateLocation,
} from '../controllers/location.controller';

const router = express.Router();

router.post('/', postLocation); // For couriers to push location
router.get('/:userId', fetchLocations); // For tracking past positions
router.patch('/', updateLocation); // Real-time update

export default router;