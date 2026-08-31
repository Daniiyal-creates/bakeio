/**
 * Session supervisor.
 *
 * Owns the loop that keeps live WhatsApp sessions matching what bakery owners
 * asked for in the app. The app never talks to this worker directly: it sets
 * `desired_state` on its own connection row and the worker reconciles.
 * That keeps the mobile app free of any WhatsApp dependency and means a worker
 * restart simply picks the intent back up.
 *
 * All Bakeio-specific wiring lives here — status writes, QR rendering, and
 * handing messages to the whatsapp-inbound function — so the transport under
 * ./providers stays swappable.
 */

import QRCode from 'qrcode';

import { collectOrphanedAuthState, clearAuthState, heartbeat } from './authState.js';
import { GC_INTERVAL_MS, QR_TTL_MS } from './env.js';
import { log } from './log.js';
import { createTransport, WORKER_MODES } from './providers/index.js';
import { invoke, patch, select } from './rest.js';

/** bakery_id -> { connectionId, transport } */
const sessions = new Map();

let lastGc = 0;

const now = () => new Date().toISOString();

function updateConnection(connectionId, body) {
  return patch('whatsapp_connections', `id=eq.${connectionId}`, { ...body, updated_at: now() });
}

/* ------------------------------- callbacks -------------------------------- */

function statusWriter(connectionId) {
  return async (status, detail = {}) => {
    if (status === 'connected') {
      await updateConnection(connectionId, {
        status: 'connected',
        connected_at: now(),
        linked_as: detail.linkedAs ?? null,
        qr_image: null,
        qr_expires_at: null,
        error_message: null,
        worker_seen_at: now(),
      });
      return;
    }

    if (status === 'qr_pending') {
      await updateConnection(connectionId, {
        status: 'qr_pending',
        error_message: detail.note ?? null,
        worker_seen_at: now(),
      });
      return;
    }

    if (status === 'error') {
      await updateConnection(connectionId, {
        status: 'error',
        error_message: detail.message ?? 'WhatsApp could not stay connected.',
        worker_seen_at: now(),
      });
      return;
    }

    await updateConnection(connectionId, {
      status: 'connecting',
      error_message: detail.note ?? null,
      worker_seen_at: now(),
    });
  };
}

function qrWriter(connectionId) {
  return async (payload) => {
    // Rendered here rather than in the app: the app should never need a QR
    // library, and a data URL drops straight into an <Image />.
    const image = await QRCode.toDataURL(payload, {
      margin: 1,
      width: 512,
      errorCorrectionLevel: 'M',
    });

    await updateConnection(connectionId, {
      status: 'qr_pending',
      qr_image: image,
      qr_expires_at: new Date(Date.now() + QR_TTL_MS).toISOString(),
      error_message: null,
      worker_seen_at: now(),
    });
  };
}

function messageHandler({ bakeryId, connectionId, getTransport }) {
  return async (message) => {
    const transport = getTransport();
    if (!transport) return;

    await transport.markRead(message.key);
    await transport.setTyping(message.jid, true);

    let result;
    try {
      // Every conversation rule, the greeting and the grounded answer come
      // from Bakeio's own function, so QR sessions behave exactly like the
      // official transport and the playground.
      result = await invoke('whatsapp-inbound', {
        bakery_id: bakeryId,
        from: message.phone,
        customer_name: message.name,
        type: message.kind,
        text: message.text,
      });
    } catch (err) {
      log.error({ bakeryId, err: String(err) }, 'inbound handling failed');
      await updateConnection(connectionId, {
        error_message: 'Bakeio could not work out a reply to the last message. Please try again.',
      });
      return;
    } finally {
      await transport.setTyping(message.jid, false);
    }

    for (const reply of result?.replies ?? []) {
      try {
        await transport.sendText(message.jid, reply);
      } catch (err) {
        log.error({ bakeryId, err: String(err) }, 'failed to deliver reply');
        await updateConnection(connectionId, {
          error_message: 'A reply could not be delivered to WhatsApp. Bakeio is reconnecting.',
        });
        break;
      }
    }
  };
}

/* -------------------------------- lifecycle ------------------------------- */

async function startSession(row) {
  const bakeryId = String(row.bakery_id);
  const connectionId = String(row.id);
  if (sessions.has(bakeryId)) return;

  log.info({ bakeryId, mode: row.mode }, 'starting session');

  const entry = { connectionId, transport: null };
  sessions.set(bakeryId, entry);

  entry.transport = createTransport(row.mode, {
    bakeryId,
    onStatus: statusWriter(connectionId),
    onQr: qrWriter(connectionId),
    onMessage: messageHandler({
      bakeryId,
      connectionId,
      getTransport: () => entry.transport,
    }),
  });

  try {
    await entry.transport.start();
  } catch (err) {
    log.error({ bakeryId, err: String(err) }, 'session failed to start');
    sessions.delete(bakeryId);
    await updateConnection(connectionId, {
      status: 'error',
      error_message: 'Bakeio could not reach WhatsApp. It will try again shortly.',
    });
  }
}

async function stopSession(bakeryId, { logout }) {
  const entry = sessions.get(bakeryId);
  if (!entry) return;
  sessions.delete(bakeryId);
  log.info({ bakeryId, logout }, 'stopping session');
  await entry.transport?.stop({ logout });
}

/** Brings a row that asked to be disconnected to a clean, final state. */
async function finalizeDisconnect(row) {
  const bakeryId = String(row.bakery_id);
  await stopSession(bakeryId, { logout: true });
  await clearAuthState(bakeryId);
  await updateConnection(row.id, {
    status: 'disconnected',
    qr_image: null,
    qr_expires_at: null,
    linked_as: null,
    connected_at: null,
    error_message: null,
    worker_seen_at: now(),
  });
}

/* ------------------------------- reconcile -------------------------------- */

export async function reconcile() {
  const rows = await select(
    'whatsapp_connections',
    `mode=in.(${WORKER_MODES.join(',')})&select=id,bakery_id,mode,desired_state,status`,
  );

  const seen = new Set();

  for (const row of rows) {
    const bakeryId = String(row.bakery_id);
    seen.add(bakeryId);

    if (row.desired_state === 'connected') {
      await startSession(row);
    } else if (sessions.has(bakeryId) || row.status !== 'disconnected') {
      await finalizeDisconnect(row);
    }
  }

  // A connection row the owner deleted: close the socket and forget the keys.
  for (const bakeryId of [...sessions.keys()]) {
    if (seen.has(bakeryId)) continue;
    await stopSession(bakeryId, { logout: true });
    await clearAuthState(bakeryId);
  }

  await heartbeat(rows.filter((row) => row.desired_state === 'connected').map((row) => row.id));

  if (Date.now() - lastGc > GC_INTERVAL_MS) {
    lastGc = Date.now();
    const swept = await collectOrphanedAuthState(seen);
    if (swept) log.info({ swept }, 'cleared orphaned credentials');
  }
}

export function sessionSnapshot() {
  return [...sessions.keys()].map((bakeryId) => ({ bakeryId }));
}

/** Closes every socket without unlinking, so a redeploy resumes silently. */
export async function shutdown() {
  for (const bakeryId of [...sessions.keys()]) {
    await stopSession(bakeryId, { logout: false });
  }
}
