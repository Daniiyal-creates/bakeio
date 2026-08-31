/**
 * Baileys transport.
 *
 * Implements the transport contract described in ./index.js: it owns one
 * WhatsApp socket, reports status changes and QR codes upward, and hands
 * inbound messages over in a normalised shape. It knows nothing about
 * Bakeio's database or AI — that wiring lives in ../sessions.js — which is
 * what makes this file replaceable by an HTTP-based provider later.
 */

import makeWASocket, {
  Browsers,
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
} from '@whiskeysockets/baileys';

import { clearAuthState, loadAuthState } from '../authState.js';
import { baileysLog, log } from '../log.js';

const MAX_BACKOFF_MS = 30_000;

/** Chats Bakeio deliberately ignores: groups, channels, status posts. */
function isIgnorableChat(jid) {
  return (
    jid === 'status@broadcast' ||
    jid.endsWith('@g.us') ||
    jid.endsWith('@newsletter') ||
    jid.endsWith('@broadcast')
  );
}

/** `4471234@s.whatsapp.net` / `4471234:12@s.whatsapp.net` -> `4471234`. */
function phoneFromJid(jid) {
  return String(jid ?? '')
    .split('@')[0]
    .split(':')[0];
}

/**
 * Pulls the answerable text out of a message, plus a plain-English name for
 * what arrived so non-text messages can be escalated with a useful label.
 * kind 'ignore' means the event carries nothing a customer actually sent.
 */
function readContent(message) {
  if (!message) return { text: '', kind: 'ignore' };

  const inner =
    message.ephemeralMessage?.message ??
    message.viewOnceMessage?.message ??
    message.viewOnceMessageV2?.message ??
    message.documentWithCaptionMessage?.message ??
    message;

  if (inner.conversation) return { text: inner.conversation, kind: 'text' };
  if (inner.extendedTextMessage?.text)
    return { text: inner.extendedTextMessage.text, kind: 'text' };
  if (inner.buttonsResponseMessage?.selectedDisplayText) {
    return { text: inner.buttonsResponseMessage.selectedDisplayText, kind: 'text' };
  }
  if (inner.listResponseMessage?.title) {
    return { text: inner.listResponseMessage.title, kind: 'text' };
  }
  if (inner.imageMessage) return { text: inner.imageMessage.caption ?? '', kind: 'photo' };
  if (inner.videoMessage) return { text: inner.videoMessage.caption ?? '', kind: 'video' };
  if (inner.audioMessage) {
    return { text: '', kind: inner.audioMessage.ptt ? 'voice note' : 'audio' };
  }
  if (inner.documentMessage) return { text: '', kind: 'document' };
  if (inner.locationMessage || inner.liveLocationMessage) return { text: '', kind: 'location' };
  if (inner.stickerMessage) return { text: '', kind: 'sticker' };
  if (inner.contactMessage || inner.contactsArrayMessage) return { text: '', kind: 'contact' };
  if (inner.orderMessage) return { text: '', kind: 'order' };

  // Reactions, receipts, key distribution and protocol chatter are not
  // customer messages and must never open a conversation.
  return { text: '', kind: 'ignore' };
}

/** Turns a socket close code into wording a bakery owner can act on. */
function describeClose(code, message) {
  switch (code) {
    case DisconnectReason.connectionReplaced:
      return 'Another device opened this WhatsApp session, so Bakeio was signed out. Scan the code again to take it back.';
    case DisconnectReason.multideviceMismatch:
      return 'WhatsApp needs this device linked again. Scan the new code to reconnect.';
    case DisconnectReason.forbidden:
      return 'WhatsApp blocked this session. Check the number in the WhatsApp app on your phone.';
    case DisconnectReason.unavailableService:
      return 'WhatsApp is not accepting connections right now. Bakeio keeps retrying.';
    default:
      return message ?? null;
  }
}

/**
 * @param {object} options
 * @param {string} options.bakeryId
 * @param {(status: string, detail?: object) => Promise<void>} options.onStatus
 * @param {(qr: string) => Promise<void>} options.onQr
 * @param {(message: object) => Promise<void>} options.onMessage
 */
export function createBaileysTransport({ bakeryId, onStatus, onQr, onMessage }) {
  let sock = null;
  let stopped = false;
  let attempts = 0;
  let timer = null;

  const child = log.child({ bakeryId });

  const report = async (status, detail) => {
    try {
      await onStatus(status, detail);
    } catch (err) {
      child.error({ err: String(err) }, 'failed to record status');
    }
  };

  function scheduleReconnect(delay) {
    if (stopped || timer) return;
    timer = setTimeout(() => {
      timer = null;
      connect().catch((err) => {
        child.error({ err: String(err) }, 'reconnect failed');
        scheduleReconnect(Math.min(MAX_BACKOFF_MS, 2000 * 2 ** attempts++));
      });
    }, delay);
  }

  async function handleClose(code, errorMessage) {
    if (stopped) return;

    // The phone unlinked us, or the stored keys are no longer usable. Nothing
    // to retry with: wipe and offer a fresh QR code.
    const needsNewScan =
      code === DisconnectReason.loggedOut ||
      code === DisconnectReason.badSession ||
      code === DisconnectReason.multideviceMismatch;

    if (needsNewScan) {
      child.warn({ code }, 'session invalidated, requesting a new scan');
      await clearAuthState(bakeryId);
      await report('qr_pending', { note: describeClose(code, null) });
      attempts = 0;
      scheduleReconnect(500);
      return;
    }

    // 515: WhatsApp asks for an immediate reconnect right after pairing.
    if (code === DisconnectReason.restartRequired) {
      attempts = 0;
      await report('connecting');
      scheduleReconnect(250);
      return;
    }

    // Another session grabbed the slot. Backing off hard avoids a tug of war
    // where both sides keep kicking each other off.
    if (code === DisconnectReason.connectionReplaced) {
      await report('error', { message: describeClose(code, null) });
      scheduleReconnect(MAX_BACKOFF_MS);
      return;
    }

    const delay = Math.min(MAX_BACKOFF_MS, 2000 * 2 ** attempts++);
    child.warn({ code, delay }, 'connection closed, retrying');
    await report('connecting', { note: describeClose(code, errorMessage) });
    scheduleReconnect(delay);
  }

  async function connect() {
    if (stopped) return;

    const { state, saveCreds } = await loadAuthState(bakeryId);
    const { version } = await fetchLatestBaileysVersion();

    await report(state.creds?.registered ? 'connecting' : 'qr_pending');

    sock = makeWASocket({
      version,
      logger: baileysLog,
      auth: { creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys, baileysLog) },
      browser: Browsers.ubuntu('Chrome'),
      // The owner's phone must keep buzzing for messages Bakeio answers, and
      // history sync would pull down chats Bakeio has no business storing.
      markOnlineOnConnect: false,
      syncFullHistory: false,
      shouldSyncHistoryMessage: () => false,
      generateHighQualityLinkPreview: false,
    });

    sock.ev.on('creds.update', () => {
      saveCreds().catch((err) => child.error({ err: String(err) }, 'failed to save credentials'));
    });

    sock.ev.on('connection.update', (update) => {
      void (async () => {
        if (update.qr) {
          attempts = 0;
          try {
            await onQr(update.qr);
          } catch (err) {
            child.error({ err: String(err) }, 'failed to publish qr');
          }
        }

        if (update.connection === 'open') {
          attempts = 0;
          await report('connected', {
            linkedAs: phoneFromJid(sock?.user?.id),
            name: sock?.user?.name ?? null,
          });
        }

        if (update.connection === 'close') {
          const code = update.lastDisconnect?.error?.output?.statusCode;
          await handleClose(code, update.lastDisconnect?.error?.message);
        }
      })();
    });

    sock.ev.on('messages.upsert', (event) => {
      // 'notify' is a live message. 'append' and history events are replays of
      // things the owner has already seen, and answering those would be spam.
      if (event.type !== 'notify') return;

      void (async () => {
        for (const message of event.messages ?? []) {
          try {
            const jid = message.key?.remoteJid;
            if (!jid || message.key?.fromMe || isIgnorableChat(jid)) continue;

            const { text, kind } = readContent(message.message);
            if (kind === 'ignore') continue;

            await onMessage({
              jid,
              // senderPn is the real number when WhatsApp addresses the chat
              // by its privacy-preserving LID instead.
              phone: phoneFromJid(message.key.senderPn ?? jid),
              name: message.pushName ?? null,
              text,
              kind,
              key: message.key,
            });
          } catch (err) {
            child.error({ err: String(err) }, 'failed to handle inbound message');
          }
        }
      })();
    });
  }

  return {
    start: connect,

    async sendText(jid, text) {
      if (!sock) throw new Error('WhatsApp session is not open');
      await sock.sendMessage(jid, { text });
    },

    async markRead(key) {
      try {
        await sock?.readMessages([key]);
      } catch {
        // A read receipt is a nicety; never let it break the reply.
      }
    },

    async setTyping(jid, isTyping) {
      try {
        await sock?.sendPresenceUpdate(isTyping ? 'composing' : 'paused', jid);
      } catch {
        // Same: presence is cosmetic.
      }
    },

    /**
     * @param {{ logout?: boolean }} options logout unlinks Bakeio from the
     * owner's phone; without it the socket just closes and can resume later.
     */
    async stop({ logout = false } = {}) {
      stopped = true;
      if (timer) clearTimeout(timer);
      timer = null;

      try {
        if (logout) await sock?.logout();
        else sock?.end(undefined);
      } catch (err) {
        child.warn({ err: String(err) }, 'error while closing session');
      }

      if (logout) await clearAuthState(bakeryId);
      sock = null;
    },
  };
}
