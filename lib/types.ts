export const DAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;
export type DayKey = (typeof DAY_KEYS)[number];

export const DAY_LABELS: Record<DayKey, string> = {
  mon: 'Monday',
  tue: 'Tuesday',
  wed: 'Wednesday',
  thu: 'Thursday',
  fri: 'Friday',
  sat: 'Saturday',
  sun: 'Sunday',
};

/** Free text per day, e.g. { mon: '7:00 – 18:00' }. Missing day = closed. */
export type OpeningHours = Partial<Record<DayKey, string>>;

export type Bakery = {
  id: string;
  user_id: string;
  name: string;
  tagline: string | null;
  about: string | null;
  address: string | null;
  city: string | null;
  currency: string;
  timezone: string;
  order_lead_time: string | null;
  opening_hours: OpeningHours;
  created_at: string;
  updated_at: string;
};

export const PRODUCT_CATEGORIES = [
  'Bread',
  'Pastries',
  'Cakes',
  'Cookies',
  'Savoury',
  'Drinks',
  'Other',
] as const;
export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number];

export const COMMON_ALLERGENS = [
  'gluten',
  'eggs',
  'milk',
  'nuts',
  'peanuts',
  'soy',
  'sesame',
] as const;

export type Product = {
  id: string;
  bakery_id: string;
  name: string;
  description: string | null;
  category: string;
  price_cents: number;
  unit: string | null;
  available: boolean;
  lead_time_hours: number | null;
  allergens: string[];
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export const POLICY_CATEGORIES = [
  'general',
  'ordering',
  'payment',
  'delivery',
  'pickup',
  'cancellation',
  'allergens',
] as const;
export type PolicyCategory = (typeof POLICY_CATEGORIES)[number];

export type Policy = {
  id: string;
  bakery_id: string;
  title: string;
  body: string;
  category: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type Faq = {
  id: string;
  bakery_id: string;
  question: string;
  answer: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type DeliveryZone = {
  id: string;
  bakery_id: string;
  area: string;
  fee_cents: number;
  min_order_cents: number;
  eta: string | null;
  notes: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export const AGENT_TONES = ['friendly', 'professional', 'playful', 'concise'] as const;
export type AgentTone = (typeof AGENT_TONES)[number];

export const TONE_LABELS: Record<AgentTone, string> = {
  friendly: 'Friendly',
  professional: 'Professional',
  playful: 'Playful',
  concise: 'Straight to the point',
};

export type AgentSettings = {
  id: string;
  bakery_id: string;
  enabled: boolean;
  agent_name: string;
  tone: string;
  language: string;
  greeting: string;
  fallback_message: string;
  handoff_keywords: string[];
  answer_only_from_knowledge: boolean;
  auto_reply_outside_hours: boolean;
  created_at: string;
  updated_at: string;
};

export type WhatsappStatus = 'pending' | 'connected' | 'error' | 'disconnected';

export type WhatsappConnection = {
  id: string;
  bakery_id: string;
  phone_number: string;
  display_name: string | null;
  status: string;
  verification_code: string | null;
  error_message: string | null;
  connected_at: string | null;
  mode: string;
  provider_phone_number_id: string | null;
  provider_token: string | null;
  webhook_verify_token: string | null;
  created_at: string;
  updated_at: string;
};

export type ConversationStatus = 'active' | 'needs_human' | 'closed';

export type Conversation = {
  id: string;
  bakery_id: string;
  customer_name: string | null;
  customer_phone: string;
  status: string;
  ai_paused: boolean;
  is_test: boolean;
  last_message_preview: string | null;
  last_message_at: string;
  unread_count: number;
  created_at: string;
  updated_at: string;
};

export type MessageRole = 'customer' | 'agent' | 'owner';

export type Message = {
  id: string;
  conversation_id: string;
  role: string;
  body: string;
  handoff: boolean;
  model: string | null;
  created_at: string;
};

/** What the agent-reply function returns. */
export type AgentReplyResult = {
  replied: boolean;
  reply?: string;
  needs_human?: boolean;
  message_id?: string;
  reason?: 'agent_disabled' | 'ai_paused' | 'no_settings' | 'missing_api_key';
};

/**
 * Category, tone and mode columns are stored as free text, so a value coming
 * back from the database is checked against the allowed list instead of being
 * trusted. Anything unrecognised falls back to the given default.
 */
export function toOption<T extends string>(
  options: readonly T[],
  value: string | null | undefined,
  fallback: T,
): T {
  return options.find((option) => option === value) ?? fallback;
}
