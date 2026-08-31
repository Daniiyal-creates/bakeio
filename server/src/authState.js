/**
 * Baileys auth state stored in Bakeio's database instead of on local disk.
 *
 * Two reasons. Hosts recycle containers and wipe their filesystems, and an
 * owner who had to rescan a QR code after every deploy would abandon the
 * product. And keeping credentials in Postgres means each bakery's session
 * keys live behind the same row-level isolation as the rest of their data
 * (whatsapp_auth_state grants nothing to signed-in users at all — only this
 * worker's service key can read it).
 *
 * Values are serialised through Baileys' BufferJSON so Buffers survive the
 * round trip to jsonb intact.
 */

import { BufferJSON, initAuthCreds, proto } from '@whiskeysockets/baileys';

import { patch, remove, select, upsert } from './rest.js';

const TABLE = 'whatsapp_auth_state';

/** jsonb -> live object, restoring Buffers and protobuf wrappers. */
function revive(raw, type) {
  if (raw === undefined || raw === null) return null;
  const value = JSON.parse(JSON.stringify(raw), BufferJSON.reviver);
  if (type === 'app-state-sync-key' && value) {
    return proto.Message.AppStateSyncKeyData.fromObject(value);
  }
  return value;
}

/** live object -> jsonb-safe plain JSON. */
function plain(value) {
  return JSON.parse(JSON.stringify(value, BufferJSON.replacer));
}

/**
 * Loads (or initialises) the signal auth state for one bakery.
 * Returns the shape Baileys' `auth` option expects, plus a creds saver.
 */
export async function loadAuthState(bakeryId) {
  const rows = await select(TABLE, `bakery_id=eq.${bakeryId}&select=key,value`);
  const cache = new Map(rows.map((row) => [row.key, row.value]));

  const now = () => new Date().toISOString();
  const row = (key, value) => ({ bakery_id: bakeryId, key, value, updated_at: now() });

  const creds = revive(cache.get('creds')) ?? initAuthCreds();

  const saveCreds = async () => {
    const value = plain(creds);
    cache.set('creds', value);
    await upsert(TABLE, [row('creds', value)], 'bakery_id,key');
  };

  const keys = {
    get: async (type, ids) => {
      const found = {};
      for (const id of ids) {
        const value = revive(cache.get(`${type}-${id}`), type);
        if (value) found[id] = value;
      }
      return found;
    },
    set: async (data) => {
      const writes = [];
      const deletes = [];

      for (const type of Object.keys(data)) {
        for (const id of Object.keys(data[type] ?? {})) {
          const key = `${type}-${id}`;
          const value = data[type][id];
          if (value) {
            const stored = plain(value);
            cache.set(key, stored);
            writes.push(row(key, stored));
          } else {
            cache.delete(key);
            deletes.push(key);
          }
        }
      }

      // Baileys writes pre-keys in batches of ~30, so both sides go out as one
      // request each rather than one round trip per key.
      if (writes.length) await upsert(TABLE, writes, 'bakery_id,key');
      if (deletes.length) {
        const list = deletes.map((key) => `"${key}"`).join(',');
        await remove(TABLE, `bakery_id=eq.${bakeryId}&key=in.(${encodeURIComponent(list)})`);
      }
    },
  };

  return { state: { creds, keys }, saveCreds };
}

/** Forgets a bakery's session entirely. The next connect starts at a new QR. */
export async function clearAuthState(bakeryId) {
  await remove(TABLE, `bakery_id=eq.${bakeryId}`);
}

/**
 * Drops credentials for bakeries that no longer have a QR connection row,
 * so a removed integration leaves nothing behind.
 */
export async function collectOrphanedAuthState(activeBakeryIds) {
  const rows = await select(TABLE, 'select=bakery_id');
  const orphans = [...new Set(rows.map((r) => String(r.bakery_id)))].filter(
    (id) => !activeBakeryIds.has(id),
  );
  for (const id of orphans) await clearAuthState(id);
  return orphans.length;
}

/** Records that this worker is alive, so the app can warn when it is not. */
export async function heartbeat(connectionIds) {
  if (!connectionIds.length) return;
  const list = connectionIds.map((id) => `"${id}"`).join(',');
  await patch('whatsapp_connections', `id=in.(${encodeURIComponent(list)})`, {
    worker_seen_at: new Date().toISOString(),
  });
}
