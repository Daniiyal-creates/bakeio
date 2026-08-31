# Bakeio

[![Built with Bilt](https://img.shields.io/endpoint?url=https%3A%2F%2Fapp.bilt.me%2Fapi%2Fbadge)](https://bilt.me)

An AI assistant that answers a bakery's WhatsApp messages — using only the products, prices,
policies, FAQs and delivery areas the owner has entered. Nothing invented, nothing guessed.

Built for small bakeries that lose orders to unanswered messages. The owner connects their own
Twilio WhatsApp number, fills in a knowledge base, and the assistant handles the repetitive
questions ("do you do gluten-free?", "can you deliver to Peckham on Saturday?", "how much notice
for a birthday cake?") while handing anything sensitive back to a human.

- **Platforms:** iOS, Android, and installable web (PWA)
- **Stack:** Expo Router 6, React Native 0.81, HeroUI Native + Uniwind, TanStack Query
- **Backend:** bilt-cloud (Postgres + auth + Deno edge functions) via `@biltme/backend`
- **Model:** Google Gemini 2.5 Flash

---

## Features

**Inbox** — every WhatsApp conversation in one list, with a "Needs you" filter for chats the
assistant escalated. Open a thread to read the full history, reply as the owner, or pause the
assistant for that customer.

**Knowledge base** — the only thing the assistant is allowed to answer from:

| Section | What it holds |
| --- | --- |
| Products | Name, description, category, price, unit, availability, lead time, allergens |
| Policies | Ordering, payment, delivery, collection, cancellation, allergens, general |
| FAQs | Free-form question and answer pairs |
| Delivery areas | Area, fee, minimum order, delivery window, notes |
| Bakery profile | About, address, currency, timezone, opening hours per day |

A one-tap **Add example bakery content** button seeds a believable bakery (12 products, 5 policies,
6 FAQs, 3 delivery areas, 2 example conversations) without overwriting anything already filled in.
Useful for demos and store review.

**Try it** — a playground that runs the real assistant against the real knowledge base without
touching WhatsApp, so the owner can check answers before customers see them.

**Settings** — assistant name, tone, language, greeting, fallback message, handoff keywords, and
whether the assistant may answer outside the knowledge base. Plus WhatsApp connection, privacy
policy, and in-app account deletion.

---

## How WhatsApp works

Each bakery brings its **own Twilio account**. There is no shared number, no Meta Business API
setup to do by hand, and no always-on worker process to host — everything runs in edge functions.

1. Owner pastes their Twilio **Account SID**, **Auth Token** and a **WhatsApp sender number** into
   Settings → WhatsApp number. Twilio's free sandbox sender is offered as a one-tap shortcut.
2. Credentials are verified against Twilio's API on save, so a typo fails immediately rather than
   silently on the first customer message.
3. The owner points Twilio's "When a message comes in" webhook at the URL the screen displays.

Inbound messages are routed by **Twilio Account SID**, not by sender number — several bakeries can
legitimately share Twilio's single sandbox sender, and routing on the number alone would cross
their messages. A unique partial index enforces one account per bakery. Every request is verified
against Twilio's `X-Twilio-Signature` using that bakery's own auth token, so the public webhook
cannot be fed fabricated customer messages.

---

## Architecture

```
app/                      Expo Router screens
  (tabs)/                 Inbox, Knowledge, Try it, Settings
  conversation/[id]       Chat thread
  knowledge/              Products, policies, FAQs, delivery zones + editors
  settings/               Agent behaviour, WhatsApp connection
  onboarding, sign-in, privacy
components/               Screen shell, forms, lists, chat, dialogs, MapView
components/ui/primitives  Uniwind-wrapped third-party primitives
lib/
  backend.ts              bilt-cloud client
  auth.tsx                Session provider (email OTP)
  data.ts                 TanStack Query hooks for every table
  types.ts                Domain types + allowed-value unions
  sampleBakery.ts         Demo seed content
  database.types.ts       Generated — do not edit
global.css                Theme tokens (warm bakery light theme)
```

### Database

Ten tables, all owner-scoped. `bakeries.user_id` references the authenticated user; everything else
hangs off `bakery_id` and is filtered by a `SECURITY DEFINER` helper (`owns_bakery`,
`owns_conversation`) so RLS never recurses. Deletes cascade from the bakery down, so removing an
account leaves nothing orphaned.

```
bakeries ─┬─ products
          ├─ policies
          ├─ faqs
          ├─ delivery_zones
          ├─ agent_settings
          ├─ whatsapp_connections
          └─ conversations ── messages
```

> String columns such as `category`, `tone` and `mode` are plain text guarded by CHECK constraints.
> When a union in `lib/types.ts` changes (`POLICY_CATEGORIES`, `PRODUCT_CATEGORIES`,
> `WHATSAPP_MODES`, …), the matching constraint must be updated in the same migration — the
> database does not follow TypeScript.

### Edge functions

| Function | Auth | Role |
| --- | --- | --- |
| `agent-reply` | JWT | Builds the grounded prompt from the bakery's knowledge base, calls Gemini, returns `{ reply, needs_human }` |
| `whatsapp-webhook` | public | Parses Twilio's form-encoded POST, verifies the signature, resolves the bakery by Account SID, records the message and triggers a reply |
| `twilio-check` | JWT | Validates pasted Twilio credentials before they are stored |
| `delete-account` | JWT | Deletes the caller's account and all their data |

Replies are sent over Twilio's REST API rather than in the webhook response, so a slow model answer
still gets delivered even if Twilio's 15-second webhook window has closed.

`whatsapp-inbound` and `reveal-keys` still exist as `410 Gone` stubs from the removed
self-hosted-worker era. Nothing calls them, and neither returns any data.

---

## Running locally

Requires Node.js 20.19.4+.

```sh
npm install
npx expo start
```

Scan the QR code with Expo Go, or press `w` for the browser.

The app reads `EXPO_PUBLIC_BILT_URL` and `EXPO_PUBLIC_BILT_ANON_KEY`. Inside Bilt these are
injected automatically; running outside Bilt, put them in `.env`. `GEMINI_API_KEY` is a **backend**
secret used by `agent-reply` and is never shipped to the client.

### Scripts

| Command | Does |
| --- | --- |
| `npx expo start` | Dev server |
| `npm run lint` | oxlint with type checking |
| `npm run format` | oxfmt |
| `npm run lint:css` | Theme token checks on `global.css` |
| `npm run build:pwa` | Web export + service worker |
| `npm run ios` / `npm run android` | Native builds |

---

## Conventions

- **Theme lives in `global.css`.** Semantic tokens in `oklch()` under `@layer theme`, defined inside
  both `@variant light` and `@variant dark`. The app is locked to light. Use token classes in
  `className`; read colours with `useThemeColor` anywhere a native prop needs a real value.
- **HeroUI Native first.** Custom components only where the library has no fit, and still built on
  its tokens.
- **`lib/database.types.ts` is generated.** Rows come back typed with nothing passed at the call
  site; never hand-write row types.
- **No realtime.** bilt-cloud serves no realtime channel — data is refetched after writes and on
  screen focus.

---

## Store readiness

- App icon, Android adaptive icon, splash screen, favicon and PWA icons are all wired to the
  croissant mark on cream (`#FCF3E8`, brand `#C57B3E`).
- In-app account deletion (required by both Apple and Google).
- Privacy policy at `/privacy`, reachable without an account from the sign-in screen.
- `ITSAppUsesNonExemptEncryption: false` declared.
- Publish identity (`BILT_APP_VERSION`, `BILT_IOS_BUNDLE_ID`, `BILT_ANDROID_PACKAGE`,
  `BILT_APP_STORE_APP_ID`) is Bilt-managed — leave those `app.config.ts` reads alone.

Both store privacy forms need the same declarations: email addresses, phone numbers and message
content are collected, and message content is shared with third parties (Twilio for delivery,
Google for reply generation) to provide the feature.

---

## Built with Bilt

**Project:** https://app.bilt.me/agent/4ed3b564-1e46-467a-8b42-d1178a1ae479

Edit by describing the change in natural language, or export the source and work in your own IDE —
both stay in sync through the connected repo. Publishing to web, App Store and Play Store runs from
**Deploy & Share**.

- [Documentation](https://bilt.me/docs)
- [Discord](https://discord.gg/9Y8vpDAhbD)
