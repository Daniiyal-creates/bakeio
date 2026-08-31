/**
 * Thin REST client for Bakeio's backend.
 *
 * The worker runs with the service key, so it deliberately keeps its surface
 * small: only the tables and functions it genuinely needs. Everything is plain
 * fetch, which keeps the worker dependency-light and easy to audit.
 */

import { BILT_ANON_KEY, BILT_SERVICE_KEY, BILT_URL } from './env.js';

const headers = {
  apikey: BILT_ANON_KEY,
  Authorization: `Bearer ${BILT_SERVICE_KEY}`,
  'Content-Type': 'application/json',
};

async function fail(action, res) {
  const detail = await res.text().catch(() => '');
  throw new Error(`${action} -> ${res.status} ${detail}`);
}

/** GET rows. `query` is a PostgREST query string, e.g. `id=eq.1&select=*`. */
export async function select(table, query) {
  const res = await fetch(`${BILT_URL}/rest/v1/${table}?${query}`, { headers });
  if (!res.ok) await fail(`select ${table}`, res);
  return res.json();
}

/** Insert or update rows, matching on `onConflict` columns. */
export async function upsert(table, rows, onConflict) {
  if (!rows.length) return;
  const query = onConflict ? `?on_conflict=${encodeURIComponent(onConflict)}` : '';
  const res = await fetch(`${BILT_URL}/rest/v1/${table}${query}`, {
    method: 'POST',
    headers: {
      ...headers,
      Prefer: onConflict ? 'resolution=merge-duplicates,return=minimal' : 'return=minimal',
    },
    body: JSON.stringify(rows),
  });
  if (!res.ok) await fail(`upsert ${table}`, res);
}

export async function patch(table, query, body) {
  const res = await fetch(`${BILT_URL}/rest/v1/${table}?${query}`, {
    method: 'PATCH',
    headers: { ...headers, Prefer: 'return=minimal' },
    body: JSON.stringify(body),
  });
  if (!res.ok) await fail(`patch ${table}`, res);
}

export async function remove(table, query) {
  const res = await fetch(`${BILT_URL}/rest/v1/${table}?${query}`, {
    method: 'DELETE',
    headers: { ...headers, Prefer: 'return=minimal' },
  });
  if (!res.ok) await fail(`delete ${table}`, res);
}

/** Calls an edge function with the service key and returns its JSON body. */
export async function invoke(name, body) {
  const res = await fetch(`${BILT_URL}/functions/v1/${name}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  const payload = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(`invoke ${name} -> ${res.status} ${payload?.error ?? ''}`);
  }
  return payload;
}
