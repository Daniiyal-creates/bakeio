import { asyncStorage, createClient, webStorage } from '@biltme/backend';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const url = process.env.EXPO_PUBLIC_BILT_URL;
const anonKey = process.env.EXPO_PUBLIC_BILT_ANON_KEY;

if (!url || !anonKey) {
  throw new Error('Backend is not configured: EXPO_PUBLIC_BILT_URL / _ANON_KEY are missing.');
}

export const backend = createClient(url, anonKey, {
  auth: {
    storage: Platform.OS === 'web' ? webStorage() : asyncStorage(AsyncStorage),
    autoRefreshToken: true,
    persistSession: true,
    // Expo is not a browser: there is no URL fragment carrying the session.
    detectSessionInUrl: false,
  },
});

/** Public URL Twilio posts inbound WhatsApp messages to. */
export const WEBHOOK_URL = `${url}/functions/v1/whatsapp-webhook`;

/** Turns backend/network errors into something a bakery owner can act on. */
export function friendlyError(error: unknown): string {
  if (!error) return 'Something went wrong. Please try again.';

  const raw =
    error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : JSON.stringify(error);
  const lower = raw.toLowerCase();

  if (lower.includes('failed to fetch') || lower.includes('network request failed')) {
    return 'No connection. Check your internet and try again.';
  }
  if (lower.includes('invalid') && lower.includes('otp')) {
    return 'That code is not right, or it has expired. Ask for a new one.';
  }
  if (lower.includes('token has expired')) {
    return 'That code has expired. Ask for a new one.';
  }
  if (lower.includes('rate limit') || lower.includes('too many')) {
    return 'Too many attempts. Please wait a moment and try again.';
  }
  if (lower.includes('twilio_account_sid')) {
    return 'That Twilio account is already connected to another bakery. Each bakery needs its own Twilio account.';
  }
  if (lower.includes('duplicate key') || lower.includes('already exists')) {
    return 'That already exists.';
  }
  if (lower.includes('row-level security') || lower.includes('permission denied')) {
    return 'You do not have access to that.';
  }
  return raw;
}
