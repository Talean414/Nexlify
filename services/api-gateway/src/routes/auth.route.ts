import express, { Request, Response, NextFunction } from 'express';
import { createProxyMiddleware, Options } from 'http-proxy-middleware';
import { IncomingMessage, ServerResponse } from 'http';

const router = express.Router();

// Log every request
router.use((req: Request, res: Response, next: NextFunction) => {
  console.log('📥 Reached auth route:', req.method, req.url);
  next();
});

// Extend the Options interface to include onError and logLevel
interface CustomProxyOptions extends Options<IncomingMessage, ServerResponse<IncomingMessage>> {
  onError?: (err: Error, req: Request, res: Response) => void;
  logLevel?: string; // Add logLevel to the interface
}

// Proxy middleware options
const proxyOptions: CustomProxyOptions = {
  target: 'http://localhost:5001',
  changeOrigin: true,
  pathRewrite: { '^/api/auth': '/api/auth' },
  selfHandleResponse: false, // Ensure proxy handles response
  onError: (err: Error, req: Request, res: Response) => {
    console.error('❌ Proxy error:', err.message);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Proxy error' });
    }
  },
  logLevel: 'debug', // Now TypeScript recognizes logLevel
};

// Create proxy
const proxy = createProxyMiddleware(proxyOptions);

router.use('/', proxy);

export default router;
