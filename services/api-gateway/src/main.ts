import express from 'express';
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
app.use('/api/auth', authRoutes);
app.use('/api/orders', orderRoutes);

app.get('/healthz', (_, res) => res.status(200).send('Gateway is healthy ✅'));

app.listen(PORT, () => {
  console.log(`🚪 API Gateway running at http://localhost:${PORT}`);
});