import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import morgan from 'morgan';

import authRoutes from './routes/auth.route';
import orderRoutes from './routes/order.route';

dotenv.config();
const app = express();
const PORT = process.env.PORT || 5000;

// Middlewares
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

// Routes
app.use('/api/auth', (req: Request, res: Response, next: express.NextFunction) => {
  console.log('Mounting /api/auth:', req.method, req.url);
  next();
}, authRoutes);
app.use('/api/orders', orderRoutes);
app.get('/healthz', (_, res) => res.status(200).send('Gateway is healthy ✅'));

// Error handling
app.use((err: Error, req: Request, res: Response, next: express.NextFunction) => {
  console.error('Express error:', err);
  res.status(500).send('Internal server error');
});

app.listen(PORT, () => {
  console.log(`🚪 API Gateway running at http://localhost:${PORT}`);
});
