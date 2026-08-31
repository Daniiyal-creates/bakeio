/**
 * Configuration, read once at boot so a missing value fails loudly on start
 * rather than halfway through someone's first QR scan.
 */

function required(name, value) {
  const trimmed = typeof value === 'string' ? value.trim() : '';
  if (!trimmed) {
    throw new Error(
      `Missing ${name}. Copy server/.env.example, fill it in, and pass it to the process.`,
    );
  }
  return trimmed;
}

export const BILT_URL = required('BILT_URL', process.env.BILT_URL).replace(/\/+$/, '');
export const BILT_ANON_KEY = required('BILT_ANON_KEY', process.env.BILT_ANON_KEY);
export const BILT_SERVICE_KEY = required('BILT_SERVICE_KEY', process.env.BILT_SERVICE_KEY);

export const PORT = Number(process.env.PORT ?? 8080);
export const POLL_INTERVAL_MS = Math.max(2000, Number(process.env.POLL_INTERVAL_MS ?? 5000));

/** How long a rendered QR code stays valid before the app calls it stale. */
export const QR_TTL_MS = 55_000;

/** Auth rows for bakeries with no connection are swept on this interval. */
export const GC_INTERVAL_MS = 5 * 60_000;
