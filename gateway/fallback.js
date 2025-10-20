const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const jwt = require('jsonwebtoken');
const redis = require('redis');
const cors = require('cors');
const app = express();

const redisClient = redis.createClient({ url: 'redis://localhost:6379' });
redisClient.connect().catch(console.error);

const validateJWT = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(403).json({ error: 'Invalid token' });
  }
};

app.use(express.json());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000', // Allow frontend origin
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Cache only GET requests
app.use(async (req, res, next) => {
  if (req.method !== 'GET') return next(); // Skip caching for non-GET requests
  const cacheKey = `${req.method}|${req.url}`;
  try {
    const cached = await redisClient.get(cacheKey);
    if (cached) {
      res.setHeader('X-Cache', 'HIT');
      return res.json(JSON.parse(cached));
    }
    const originalSend = res.send.bind(res);
    res.send = (body) => {
      if (res.statusCode === 200) {
        redisClient.setEx(cacheKey, 60, JSON.stringify(body)).catch(console.error);
      }
      originalSend(body);
    };
  } catch (err) {
    console.error('Redis error:', err);
  }
  next();
});

app.use('/api/auth', createProxyMiddleware({
  target: 'http://localhost:5001',
  changeOrigin: true,
  pathRewrite: { '^/api/auth': '/api/auth' },
  onProxyReq: (proxyReq, req, res) => {
    // Skip JWT validation for public endpoints like signup
    if (req.path === '/api/auth/signup' || req.path === '/api/auth/login') return;
    validateJWT(req, res, () => proxyReq);
  }
}));

app.use('/api/orders', validateJWT, createProxyMiddleware({
  target: 'http://localhost:5006',
  changeOrigin: true,
  pathRewrite: { '^/api/orders': '/api/orders' }
}));

app.listen(8080, () => console.log('Nexlify Gateway (Fallback) running on port 8080'));
