/**
 * Transport registry.
 *
 * Everything above this folder talks to a transport through one contract, so
 * swapping Baileys for the official WhatsApp Business API (or a BSP like
 * 360dialog) means adding a file here and one entry in TRANSPORTS — the
 * supervisor, the inbound function, the inbox and the AI stay untouched.
 *
 * A transport factory receives:
 *   { bakeryId, onStatus(status, detail), onQr(payload), onMessage(message) }
 *
 * and returns:
 *   start()                    open the session and keep it open
 *   sendText(jid, text)        deliver one reply
 *   markRead(key)              optional read receipt
 *   setTyping(jid, isTyping)   optional typing indicator
 *   stop({ logout })           close; logout also forgets the credentials
 *
 * Statuses a transport may report: connecting, qr_pending, connected, error.
 * Inbound messages arrive as { jid, phone, name, text, kind, key }.
 *
 * A request/response provider (Cloud API, BSP) has no socket to hold, so its
 * factory would report 'connected' immediately and leave start() as a no-op —
 * those live behind the existing whatsapp-webhook function instead.
 */

import { createBaileysTransport } from './baileys.js';

/** whatsapp_connections.mode -> transport factory. */
export const TRANSPORTS = {
  qr: createBaileysTransport,
};

/** Modes this worker is responsible for. Others are handled by the webhook. */
export const WORKER_MODES = Object.keys(TRANSPORTS);

export function createTransport(mode, options) {
  const factory = TRANSPORTS[mode];
  if (!factory) throw new Error(`No transport registered for mode "${mode}"`);
  return factory(options);
}
