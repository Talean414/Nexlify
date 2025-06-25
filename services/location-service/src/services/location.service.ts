import db from '../config/db';
import { Server } from 'socket.io';
import { logger } from '../utils/logger'; // Assuming a logger utility (e.g., Winston)

// Define interface for location data
interface LocationData {
  userId: string;
  orderId?: string;
  latitude: number;
  longitude: number;
}

// Define interface for saved location response
interface SavedLocation {
  id?: number; // Auto-incremented ID from DB, if applicable
  user_id: string;
  order_id?: string;
  latitude: number;
  longitude: number;
  timestamp: Date;
}

// Custom error for location service
class LocationServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LocationServiceError';
  }
}

let io: Server | null = null;

/**
 * Initializes Socket.IO instance for real-time communication.
 * @param socketServer - The Socket.IO server instance
 */
export function initSocketIO(socketServer: Server): void {
  io = socketServer;
  logger.info('Socket.IO initialized for location service');
}

/**
 * Validates location data before saving.
 * @param data - The location data to validate
 * @returns Error message if validation fails, else null
 */
function validateLocationData(data: Partial<LocationData>): string | null {
  const { userId, latitude, longitude } = data;
  if (!userId) {
    return 'Missing required field: userId';
  }
  if (latitude == null || longitude == null) {
    return 'Missing required fields: latitude, longitude';
  }
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    return 'Invalid latitude or longitude values';
  }
  return null;
}

/**
 * Saves a new location to the database and emits a real-time update.
 * @param data - The location data to save
 * @returns The saved location data
 * @remark Ensure database has indexes on user_id and order_id for performance
 */
export async function saveLocation(data: LocationData): Promise<SavedLocation> {
  try {
    const validationError = validateLocationData(data);
    if (validationError) {
      throw new LocationServiceError(validationError);
    }

    const location = {
      user_id: data.userId,
      order_id: data.orderId,
      latitude: data.latitude,
      longitude: data.longitude,
      timestamp: new Date(), // Explicitly set timestamp for consistency
    };

    // Insert into database (returns inserted IDs or records depending on DB config)
    const [insertedId] = await db('locations').insert(location).returning(['id', 'user_id', 'order_id', 'latitude', 'longitude', 'timestamp']);
    const savedLocation: SavedLocation = insertedId || location; // Fallback to input if no ID returned

    // Emit real-time update if Socket.IO is initialized and orderId is provided
    if (io && data.orderId) {
      const eventData = {
        userId: data.userId,
        orderId: data.orderId,
        latitude: data.latitude,
        longitude: data.longitude,
        timestamp: new Date().toISOString(),
      };
      io.to(`order-${data.orderId}`).emit('locationUpdate', eventData);
      logger.debug(`Emitted location update to order-${data.orderId}: ${JSON.stringify(eventData)}`);
    }

    return savedLocation;
  } catch (err) {
    logger.error('Error saving location:', err);
    throw err instanceof LocationServiceError ? err : new LocationServiceError('Failed to save location');
  }
}

/**
 * Retrieves recent locations for a user.
 * @param userId - The user ID to query
 * @returns Array of recent locations (up to 50)
 * @remark Consider adding pagination for large datasets
 */
export async function getRecentLocations(userId: string): Promise<SavedLocation[]> {
  try {
    if (!userId) {
      throw new LocationServiceError('Missing required field: userId');
    }

    const locations = await db('locations')
      .select('id', 'user_id', 'order_id', 'latitude', 'longitude', 'timestamp')
      .where({ user_id: userId })
      .orderBy('timestamp', 'desc')
      .limit(50);

    return locations as SavedLocation[];
  } catch (err) {
    logger.error('Error fetching recent locations:', err);
    throw err instanceof LocationServiceError ? err : new LocationServiceError('Failed to fetch recent locations');
  }
}