/**
 * AWS Lambda handler (API Gateway v2 / HTTP API proxy integration).
 *
 * Runs the SAME Express app used locally. Instead of faking req/res objects
 * (which is fragile and can leave promises unsettled), we start a real
 * in-process HTTP server on a loopback port once per container and forward
 * each API Gateway event to it with a genuine HTTP request. This gives Express
 * real IncomingMessage/ServerResponse objects, so every response settles.
 */
import http from 'node:http';
import { createApp } from './app.js';
import { initStore } from './lib/store.js';
import { logger } from './lib/logger.js';

let serverPromise = null;

async function getServer() {
  if (!serverPromise) {
    serverPromise = (async () => {
      await initStore();
      const app = createApp();
      const server = http.createServer(app);
      await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
      const { port } = server.address();
      logger.info('lambda.server_ready', { port });
      return { server, port };
    })();
  }
  return serverPromise;
}

function forward(port, method, path, headers, body) {
  return new Promise((resolve, reject) => {
    const payload = body ? Buffer.from(body) : null;
    const reqHeaders = { ...headers };
    // Let Node compute host/content-length; strip hop-by-hop / gateway headers.
    delete reqHeaders.host;
    delete reqHeaders['content-length'];
    if (payload) {
      reqHeaders['content-type'] = reqHeaders['content-type'] || 'application/json';
      reqHeaders['content-length'] = String(payload.length);
    }

    const req = http.request(
      { host: '127.0.0.1', port, method, path, headers: reqHeaders },
      (res) => {
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () =>
          resolve({
            statusCode: res.statusCode || 200,
            headers: res.headers,
            body: Buffer.concat(chunks).toString('utf8')
          })
        );
      }
    );
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

export const handler = async (event) => {
  const { port } = await getServer();
  const method = event.requestContext?.http?.method || event.httpMethod || 'GET';
  const rawPath = event.rawPath || event.path || '/';
  const qs = event.rawQueryString ? `?${event.rawQueryString}` : '';
  const path = rawPath + qs;
  const headers = event.headers || {};
  let body = event.body || '';
  if (event.isBase64Encoded && body) {
    body = Buffer.from(body, 'base64').toString('utf8');
  }

  logger.info('lambda.invoke', { method, path: rawPath });

  try {
    const result = await forward(port, method, path, headers, body);
    // CORS is handled at the API Gateway level (see template CorsConfiguration),
    // so we do not add CORS headers here (avoids duplicate-header rejection).
    return {
      statusCode: result.statusCode,
      headers: { 'content-type': result.headers['content-type'] || 'application/json' },
      body: result.body
    };
  } catch (err) {
    logger.error('lambda.error', { message: err.message });
    return {
      statusCode: 500,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ error: 'Something went wrong on our side. Please try again.' })
    };
  }
};
