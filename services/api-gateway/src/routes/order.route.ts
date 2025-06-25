import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { validateJWT } from '../middlewares/auth';

const router = express.Router();

router.use(validateJWT); // protect order routes

router.use('/', createProxyMiddleware({
  target: 'http://localhost:5006', // Order service base URL
  changeOrigin: true,
  pathRewrite: {
    '^/api/orders': '',
  },
}));

export default router;