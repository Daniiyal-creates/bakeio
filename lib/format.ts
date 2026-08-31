import { differenceInCalendarDays, format, formatDistanceToNowStrict, isToday } from 'date-fns';

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  CAD: 'CA$',
  AUD: 'A$',
  INR: '₹',
  BRL: 'R$',
  MXN: 'MX$',
  ZAR: 'R',
  NGN: '₦',
  AED: 'AED ',
  SAR: 'SAR ',
  JPY: '¥',
  CHF: 'CHF ',
  SEK: 'kr ',
  PLN: 'zł ',
  TRY: '₺',
};

export const CURRENCY_OPTIONS = Object.keys(CURRENCY_SYMBOLS);

/** 1250 -> "$12.50" */
export function formatMoney(cents: number | null | undefined, currency = 'USD'): string {
  const symbol = CURRENCY_SYMBOLS[currency] ?? `${currency} `;
  const value = ((cents ?? 0) / 100).toFixed(2);
  return `${symbol}${value}`;
}

/** 1250 -> "12.50", for prefilling a price input. */
export function centsToInput(cents: number | null | undefined): string {
  if (cents === null || cents === undefined) return '';
  return (cents / 100).toFixed(2);
}

/** "12.5" / "12,50" / "" -> 1250 / 0 */
export function inputToCents(input: string): number {
  const normalized = input.replace(/[^\d.,]/g, '').replace(',', '.');
  const value = Number.parseFloat(normalized);
  if (!Number.isFinite(value) || value < 0) return 0;
  return Math.round(value * 100);
}

/** Keeps a phone number recognisable while stripping formatting noise. */
export function normalizePhone(input: string): string {
  const trimmed = input.trim();
  const digits = trimmed.replace(/[^\d]/g, '');
  return trimmed.startsWith('+') ? `+${digits}` : digits;
}

export function formatPhone(phone: string): string {
  return phone.startsWith('+') ? phone : `+${phone}`;
}

export function initialsFor(name: string | null | undefined, fallback: string): string {
  const source = (name ?? '').trim() || fallback.replace(/[^\d\w]/g, '');
  const words = source.split(/\s+/).filter(Boolean);
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  return source.slice(0, 2).toUpperCase();
}

/** Compact timestamp for list rows: "14:32", "Tue", "3 Mar". */
export function shortTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  if (isToday(date)) return format(date, 'HH:mm');
  if (differenceInCalendarDays(new Date(), date) < 7) return format(date, 'EEE');
  return format(date, 'd MMM');
}

/** "3 minutes ago", for detail views. */
export function relativeTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return formatDistanceToNowStrict(date, { addSuffix: true });
}

/** Time shown next to a chat bubble. */
export function messageTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return isToday(date) ? format(date, 'HH:mm') : format(date, 'd MMM, HH:mm');
}
