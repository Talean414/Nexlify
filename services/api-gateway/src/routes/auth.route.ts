import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import type { Request } from 'express';
import type { ProxyReqCallback } from 'http-proxy';

const router = express.Router();

const modifyRequestBody: ProxyReqCallback = (proxyReq, req: Request) => {
  if (req.body && Object.keys(req.body).length) {
    const bodyData = JSON.stringify(req.body);

    proxyReq.setHeader('Content-Type', 'application/json');
    proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
    proxyReq.write(bodyData);
  }
};

router.use('/', createProxyMiddleware({
  target: 'http://localhost:5002',
  changeOrigin: true,
  pathRewrite: { '^/api/auth': '' },
  selfHandleResponse: false,
  onProxyReq: modifyRequestBody,
}));

export default router;