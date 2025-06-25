import express from 'express';
import { createProxyMiddleware, Options } from 'http-proxy-middleware';
import { Request } from 'express';

const router = express.Router();

const modifyRequestBody: Options['onProxyReq'] = (proxyReq, req: Request) => {
  if (req.body && Object.keys(req.body).length) {
    const bodyData = JSON.stringify(req.body);

    // Update the headers to indicate content length & type
    proxyReq.setHeader('Content-Type', 'application/json');
    proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));

    // Write the new body to the proxy request
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
