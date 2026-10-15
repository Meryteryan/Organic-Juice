// Local preview: serves site/ and routes /api/* to the same handlers Netlify runs.
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import config from '../netlify/functions/config.mjs';
import checkout from '../netlify/functions/checkout.mjs';
import sessionStatus from '../netlify/functions/session-status.mjs';
import stripeWebhook from '../netlify/functions/stripe-webhook.mjs';

const routes = { '/api/config': config, '/api/checkout': checkout, '/api/session-status': sessionStatus, '/api/stripe-webhook': stripeWebhook };
const root = fileURLToPath(new URL('../site/', import.meta.url));
const port = Number(process.env.PORT || 8777);
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg' };

http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const handler = routes[url.pathname];
  if (handler) {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const body = ['GET', 'HEAD'].includes(req.method) ? undefined : Buffer.concat(chunks);
    const response = await handler(new Request(url, { method: req.method, headers: req.headers, body }));
    res.writeHead(response.status, Object.fromEntries(response.headers));
    return res.end(Buffer.from(await response.arrayBuffer()));
  }
  const name = url.pathname === '/' ? 'index.html' : decodeURIComponent(url.pathname.slice(1));
  const file = resolve(root, name);
  try {
    if (!file.startsWith(root)) throw new Error('outside site');
    const bytes = await readFile(file);
    res.writeHead(200, { 'Content-Type': mime[extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    res.end(bytes);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not found');
  }
}).listen(port, '127.0.0.1', () => console.log(`Preview: http://127.0.0.1:${port}/`));
