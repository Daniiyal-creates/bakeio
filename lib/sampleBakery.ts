import type { OpeningHours } from '@/lib/types';

/**
 * A small, believable bakery used to fill an empty account: handy for a store
 * reviewer opening Bakeio for the first time, and for an owner who wants to see
 * how the assistant answers before typing in their own catalogue.
 *
 * Prices are in cents of the bakery's own currency.
 */

export type SampleProduct = {
  name: string;
  description: string;
  category: string;
  price_cents: number;
  unit: string;
  available: boolean;
  lead_time_hours: number | null;
  allergens: string[];
};

export type SamplePolicy = { title: string; body: string; category: string };
export type SampleFaq = { question: string; answer: string };
export type SampleZone = {
  area: string;
  fee_cents: number;
  min_order_cents: number;
  eta: string;
  notes: string | null;
};

export type SampleMessage = {
  role: 'customer' | 'agent' | 'owner';
  body: string;
  handoff?: boolean;
  /** How long ago the message was sent, so the inbox reads naturally. */
  minutesAgo: number;
};

export type SampleConversation = {
  customer_name: string;
  customer_phone: string;
  status: 'active' | 'needs_human';
  ai_paused?: boolean;
  unread_count?: number;
  messages: SampleMessage[];
};

export const SAMPLE_PROFILE: {
  tagline: string;
  about: string;
  address: string;
  city: string;
  order_lead_time: string;
  opening_hours: OpeningHours;
} = {
  tagline: 'Slow-fermented bread and pastries, baked every morning',
  about:
    'A two-person neighbourhood bakery. Everything is mixed the day before and baked fresh from 5am. Cakes are made to order, and we keep a short list of daily specials on the counter.',
  address: '48 Mill Lane',
  city: 'Riverford',
  order_lead_time: '48 hours for cakes, next morning for everything else',
  opening_hours: {
    mon: 'Closed',
    tue: '7:00 – 17:00',
    wed: '7:00 – 17:00',
    thu: '7:00 – 17:00',
    fri: '7:00 – 18:00',
    sat: '7:30 – 15:00',
    sun: '8:00 – 13:00',
  },
};

export const SAMPLE_PRODUCTS: SampleProduct[] = [
  {
    name: 'Country sourdough',
    description: 'Naturally leavened, 24-hour ferment. Crisp crust, open crumb.',
    category: 'Bread',
    price_cents: 750,
    unit: '800 g loaf',
    available: true,
    lead_time_hours: null,
    allergens: ['gluten'],
  },
  {
    name: 'Seeded rye',
    description: 'Dense rye with sunflower and pumpkin seeds. Keeps for four days.',
    category: 'Bread',
    price_cents: 690,
    unit: '700 g loaf',
    available: true,
    lead_time_hours: null,
    allergens: ['gluten', 'sesame'],
  },
  {
    name: 'Baguette',
    description: 'Baked twice daily, at 7am and again at 3pm.',
    category: 'Bread',
    price_cents: 350,
    unit: 'each',
    available: true,
    lead_time_hours: null,
    allergens: ['gluten'],
  },
  {
    name: 'Butter croissant',
    description: 'Laminated over three days with cultured butter.',
    category: 'Pastries',
    price_cents: 320,
    unit: 'each',
    available: true,
    lead_time_hours: null,
    allergens: ['gluten', 'milk', 'eggs'],
  },
  {
    name: 'Almond croissant',
    description: 'Yesterday\u2019s croissant, filled with frangipane and baked again.',
    category: 'Pastries',
    price_cents: 380,
    unit: 'each',
    available: true,
    lead_time_hours: null,
    allergens: ['gluten', 'milk', 'eggs', 'nuts'],
  },
  {
    name: 'Cinnamon bun',
    description: 'Cardamom dough, brushed with syrup out of the oven.',
    category: 'Pastries',
    price_cents: 400,
    unit: 'each',
    available: true,
    lead_time_hours: null,
    allergens: ['gluten', 'milk', 'eggs'],
  },
  {
    name: 'Carrot and walnut cake',
    description: 'Cream cheese frosting. Made to order.',
    category: 'Cakes',
    price_cents: 4200,
    unit: '20 cm, serves 10',
    available: true,
    lead_time_hours: 48,
    allergens: ['gluten', 'eggs', 'milk', 'nuts'],
  },
  {
    name: 'Celebration cake',
    description:
      'Two layers, your choice of vanilla or chocolate sponge, piped name on top. Tell us the date and we confirm the same day.',
    category: 'Cakes',
    price_cents: 5500,
    unit: 'serves 12',
    available: true,
    lead_time_hours: 72,
    allergens: ['gluten', 'eggs', 'milk'],
  },
  {
    name: 'Chocolate chip cookies',
    description: 'Dark chocolate, sea salt. Sold by the box.',
    category: 'Cookies',
    price_cents: 1200,
    unit: 'box of 6',
    available: true,
    lead_time_hours: null,
    allergens: ['gluten', 'milk', 'eggs', 'soy'],
  },
  {
    name: 'Spinach and feta roll',
    description: 'Flaky pastry, served warm until midday.',
    category: 'Savoury',
    price_cents: 450,
    unit: 'each',
    available: true,
    lead_time_hours: null,
    allergens: ['gluten', 'milk', 'eggs'],
  },
  {
    name: 'Sausage roll',
    description: 'Free-range pork, fennel and black pepper.',
    category: 'Savoury',
    price_cents: 480,
    unit: 'each',
    available: false,
    lead_time_hours: null,
    allergens: ['gluten', 'milk'],
  },
  {
    name: 'Filter coffee',
    description: 'Single origin, changes monthly. Refills are free.',
    category: 'Drinks',
    price_cents: 280,
    unit: '350 ml',
    available: true,
    lead_time_hours: null,
    allergens: [],
  },
];

export const SAMPLE_POLICIES: SamplePolicy[] = [
  {
    title: 'Ordering ahead',
    body: 'Bread and pastries can be reserved until 6pm the day before for collection the next morning. Cakes need 48 hours, and celebration cakes 72 hours. Orders are confirmed by WhatsApp once we have the date, and nothing is held without that confirmation.',
    category: 'ordering',
  },
  {
    title: 'Payment',
    body: 'Card and cash in the shop. For orders over 40 we ask for half up front by bank transfer, and the rest on collection. We do not take payment over WhatsApp.',
    category: 'payment',
  },
  {
    title: 'Changes and cancellations',
    body: 'Cakes can be changed or cancelled up to 24 hours before collection, with a full refund of any deposit. Inside 24 hours the deposit is kept, because the cake is already being made. Bread and pastry orders can be cancelled any time before collection.',
    category: 'cancellation',
  },
  {
    title: 'Collection',
    body: 'Orders are ready from opening on the agreed day and held until closing. If you need a later pickup, tell us and we will box it and keep it behind the counter.',
    category: 'pickup',
  },
  {
    title: 'Allergens',
    body: 'Everything is baked in one small kitchen that handles wheat, milk, eggs, nuts, soy and sesame, so we cannot promise anything is free of traces. Each product lists its own allergens, and we are happy to read an ingredient list out for you. We do not make certified gluten-free items.',
    category: 'allergens',
  },
];

export const SAMPLE_FAQS: SampleFaq[] = [
  {
    question: 'What time do you open?',
    answer:
      'Tuesday to Thursday 7:00 to 17:00, Friday 7:00 to 18:00, Saturday 7:30 to 15:00 and Sunday 8:00 to 13:00. We are closed on Mondays.',
  },
  {
    question: 'Do you have anything gluten free?',
    answer:
      'Not at the moment. Everything is baked in one kitchen that handles wheat, so we cannot avoid traces.',
  },
  {
    question: 'Can I order a cake for this weekend?',
    answer:
      'Yes, as long as we have 48 hours, or 72 hours for a celebration cake. Send us the date, the number of people and any writing you would like on top.',
  },
  {
    question: 'What time does the bread come out?',
    answer:
      'Loaves are on the shelf from 7:30, and baguettes are baked again at 15:00. Sourdough usually sells out by early afternoon on Saturdays.',
  },
  {
    question: 'Do you deliver?',
    answer:
      'We deliver in Riverford and two nearby areas, with a minimum order and a small fee depending on where you are. Anything else is collection from the shop.',
  },
  {
    question: 'Can I pay when I collect?',
    answer:
      'Yes for bread and pastries. Orders over 40 need half up front so we know the order is going ahead.',
  },
];

export const SAMPLE_ZONES: SampleZone[] = [
  {
    area: 'Riverford centre',
    fee_cents: 0,
    min_order_cents: 2500,
    eta: 'Same day, 2 – 4 hours',
    notes: 'Free above the minimum. Orders placed after 14:00 go out the next morning.',
  },
  {
    area: 'Northgate and Mill Hill',
    fee_cents: 500,
    min_order_cents: 3000,
    eta: 'Next morning before 11:00',
    notes: null,
  },
  {
    area: 'Harbour district',
    fee_cents: 800,
    min_order_cents: 4000,
    eta: 'Tuesdays and Fridays',
    notes: 'One run each of those days, leaving the shop at 9:00.',
  },
];

export const SAMPLE_CONVERSATIONS: SampleConversation[] = [
  {
    customer_name: 'Amara Diallo',
    customer_phone: '+15550100142',
    status: 'active',
    messages: [
      {
        role: 'customer',
        body: 'Hi! Do you have sourdough today and how much is it?',
        minutesAgo: 214,
      },
      {
        role: 'agent',
        body: 'Hi! Yes, our country sourdough is on the shelf from 7:30 — 7.50 for an 800 g loaf. On Saturdays it usually goes by early afternoon, so I can put one aside for you if you like.',
        minutesAgo: 213,
      },
      {
        role: 'customer',
        body: 'Please do, I can come around 4. Also two almond croissants',
        minutesAgo: 209,
      },
      {
        role: 'agent',
        body: 'Done — one sourdough and two almond croissants held behind the counter until closing at 17:00. That comes to 15.10, payable when you collect. Just so you know, the almond croissants contain nuts, milk, eggs and gluten.',
        minutesAgo: 208,
      },
      { role: 'customer', body: 'Perfect, thank you!', minutesAgo: 205 },
    ],
  },
  {
    customer_name: 'Tom Reyes',
    customer_phone: '+15550100177',
    status: 'needs_human',
    unread_count: 1,
    messages: [
      {
        role: 'customer',
        body: 'I need a cake for 12 people on Saturday, chocolate, with "Happy 40th Priya" on it',
        minutesAgo: 96,
      },
      {
        role: 'agent',
        body: 'That would be our celebration cake — 55.00, two layers of chocolate sponge, serves 12, with the name piped on top. We need 72 hours, so Saturday works if we confirm today. Contains gluten, eggs and milk.',
        minutesAgo: 95,
      },
      { role: 'customer', body: 'Great. Can you also make it dairy free?', minutesAgo: 62 },
      {
        role: 'agent',
        body: 'I am not sure about a dairy-free version — that is not something I have on file. Let me pass this to the bakery and someone will come back to you shortly.',
        handoff: true,
        minutesAgo: 61,
      },
      { role: 'customer', body: 'No problem, I will wait to hear back', minutesAgo: 44 },
    ],
  },
];
