import 'dotenv/config';
import express, { Application } from 'express';
import http from 'http';
import cors from 'cors';
import { Server, Socket } from 'socket.io';
import locationRoutes from './routes/location.route';
import { initSocketIO } from './services/location.service';
import { logger } from './utils/logger'; // Assuming a logger utility (e.g., Winston)

// Initialize Express app and HTTP server
const app: Application = express();
const server = http.createServer(app);

// Configure Socket.IO with CORS
const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || '*', // Use environment variable for production
    methods: ['GET', 'POST'],
  },
});

// Initialize Socket.IO in location service
initSocketIO(io);

// Socket.IO event handlers
io.on('connection', (socket: Socket) => {
  logger.info(`Client connected: ${socket.id}`);

  socket.on('joinOrderRoom', (orderId: string) => {
    if (!orderId) {
      logger.warn(`Invalid orderId for joinOrderRoom: ${orderId}`);
      socket.emit('error', { message: 'Invalid orderId' });
      return;
    }
    const room = `order-${orderId}`;
    socket.join(room);
    logger.debug(`Client ${socket.id} joined room: ${room}`);
  });

  socket.on('leaveOrderRoom', (orderId: string) => {
    if (!orderId) {
      logger.warn(`Invalid orderId for leaveOrderRoom: ${orderId}`);
      socket.emit('error', { message: 'Invalid orderId' });
      return;
    }
    const room = `order-${orderId}`;
    socket.leave(room);
    logger.debug(`Client ${socket.id} left room: ${room}`);
  });

  socket.on('disconnect', () => {
    logger.info(`Client disconnected: ${socket.id}`);
  });

  socket.on('error', (err: Error) => {
    logger.error(`Socket error for client ${socket.id}: ${err.message}`);
  });
});

// Configure Express middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*', // Align with Socket.IO CORS
}));
app.use(express.json());
app.use('/api/location', locationRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', uptime: process.uptime() });
});

// Global error handler
app.use((err: Error, req: any, res: any, next: any) => {
  logger.error(`Express error: ${err.message}`, { stack: err.stack });
  res.status(500).json({ success: false, error: 'Internal server error' });
});

const PORT = process.env.PORT || 5004;
server.listen(PORT, () => {
  logger.info(`Location service running on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('Received SIGTERM. Performing graceful shutdown...');
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
  io.close(() => {
    logger.info('Socket.IO server closed');
  });
});

// Export io for use in other modules (e.g., controllers)
export { io };