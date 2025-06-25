import { Request, Response } from 'express';
import * as locationService from '../services/location.service';
import { io } from '../main'; // Socket.IO instance, ensure exported from main.ts
import { logger } from '../utils/logger'; // Assuming a logger utility for error logging

// Define interface for location data
interface LocationData {
  userId: string;
  orderId: string;
  latitude: number;
  longitude: number;
}

// Define interface for API responses
interface ApiResponse<T> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
}

/**
 * Validates required fields for location data.
 * @param data - The location data to validate
 * @returns Error message if validation fails, else null
 */
function validateLocationData(data: Partial<LocationData>): string | null {
  const { userId, orderId, latitude, longitude } = data;
  if (!userId || !orderId || latitude == null || longitude == null) {
    return 'Missing required fields: userId, orderId, latitude, longitude';
  }
  // Additional validation (e.g., latitude/longitude range)
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    return 'Invalid latitude or longitude values';
  }
  return null;
}

/**
 * Saves a new location for a user and order.
 * @route POST /locations
 * @remark Consider adding rate-limiting middleware to prevent abuse
 */
export async function postLocation(req: Request, res: Response): Promise<void> {
  try {
    const locationData: LocationData = req.body;
    const validationError = validateLocationData(locationData);
    if (validationError) {
      res.status(400).json({
        success: false,
        message: 'Validation failed',
        error: validationError,
      } as ApiResponse<never>);
      return;
    }

    const savedLocation = await locationService.saveLocation(locationData);
    res.status(201).json({
      success: true,
      message: 'Location saved successfully',
      data: savedLocation,
    } as ApiResponse<typeof savedLocation>);
  } catch (err) {
    logger.error('Error in postLocation:', err);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: err instanceof Error ? err.message : 'Unknown error',
    } as ApiResponse<never>);
  }
}

/**
 * Fetches recent locations for a user.
 * @route GET /locations/:userId
 * @remark Consider adding pagination for large datasets
 */
export async function fetchLocations(req: Request, res: Response): Promise<void> {
  try {
    const { userId } = req.params;
    if (!userId) {
      res.status(400).json({
        success: false,
        message: 'Validation failed',
        error: 'Missing userId parameter',
      } as ApiResponse<never>);
      return;
    }

    const locations = await locationService.getRecentLocations(userId);
    res.json({
      success: true,
      message: 'Locations retrieved successfully',
      data: locations,
    } as ApiResponse<typeof locations>);
  } catch (err) {
    logger.error('Error in fetchLocations:', err);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: err instanceof Error ? err.message : 'Unknown error',
    } as ApiResponse<never>);
  }
}

/**
 * Updates a location and emits a real-time update via Socket.IO.
 * @route PATCH /locations
 * @remark Requires Socket.IO room subscription for orderId
 */
export async function updateLocation(req: Request, res: Response): Promise<void> {
  try {
    const locationData: LocationData = req.body;
    const validationError = validateLocationData(locationData);
    if (validationError) {
      res.status(400).json({
        success: false,
        message: 'Validation failed',
        error: validationError,
      } as ApiResponse<never>);
      return;
    }

    const { userId, orderId, latitude, longitude } = locationData;
    const updatedLocation = await locationService.saveLocation(locationData);

    // Emit real-time update to Socket.IO room
    io.to(`order-${orderId}`).emit('locationUpdate', {
      orderId,
      latitude,
      longitude,
      userId,
      timestamp: Date.now(),
    });

    res.json({
      success: true,
      message: 'Location updated successfully',
      data: updatedLocation,
    } as ApiResponse<typeof updatedLocation>);
  } catch (err) {
    logger.error('Error in updateLocation:', err);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: err instanceof Error ? err.message : 'Unknown error',
    } as ApiResponse<never>);
  }
}