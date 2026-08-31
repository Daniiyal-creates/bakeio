/**
 * Bakeio WhatsApp worker entry point.
 *
 * Run one instance. Two instances would both try to hold the same WhatsApp
 * sessions and keep kicking each other off, so disable autoscaling and
 * multiple replicas on whichever host you use.
 */

import http from 'node:http';

import { PORT, POLL_INTERVAL_MS } from './env.js';
import { log } from './log.js';
import { reconcile, sessionSnapshot, shutdown } from './sessions.js';

let ticking = false;
let lastTickAt = null;
let lastError = null;

async function tick() {
  // Reconciling can take a moment on a cold start; skipping overlaps keeps the
  // worker from opening two sockets for the same bakery.
  if (ticking) return;
  ticking = true;
  try {
    await reconcile();
    lastTickAt = new Date().toISOString();
    lastError = null;
  } catch (err) {
    lastError = String(err);
    log.error({ err: lastError }, 'reconcile failed');
  } finally {
    ticking = false;
  }
}

const server = http.createServer((req, res) => {
  if (req.url?.startsWith('/health')) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        ok: !lastError,
        lastTickAt,
        lastError,
        sessions: sessionSnapshot(),
      }),
    );
    return;
  }

  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not found');
});

server.listen(PORT, () => log.info({ port: PORT }, 'bakeio whatsapp worker listening'));

void tick();
const loop = setInterval(() => void tick(), POLL_INTERVAL_MS);

for (const signal of ['SIGTERM', 'SIGINT']) {
  process.on(signal, () => {
    log.info({ signal }, 'shutting down');
    clearInterval(loop);
    server.close();
    void shutdown().finally(() => process.exit(0));
  });
}
