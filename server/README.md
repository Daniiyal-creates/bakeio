# Bakeio WhatsApp worker

Holds one live WhatsApp connection per bakery and bridges customer messages to
Bakeio's AI agent. Bakery owners connect by scanning a QR code in the app —
exactly like linking WhatsApp Web.

This is a **separate Node service**. It cannot live inside Bakeio's backend:
edge functions are stateless and shut down after each request, while a WhatsApp
session needs a socket that stays open for weeks. The mobile app never imports
anything from this folder.

## How it fits together

```
Owner taps Connect  ->  whatsapp_connections.desired_state = 'connected'
                              |
                     this worker notices (polls every 5s)
                              |
             opens a WhatsApp socket, writes the QR code back
                              |
              Owner scans  ->  status = 'connected'
                              |
Customer message  ->  worker  ->  whatsapp-inbound function
                                       (conversation + greeting + AI answer)
                              <-  reply text
                     worker sends it back through WhatsApp
```

The app never talks to this worker. It records what the owner wants on their own
row and the worker reconciles towards it, so a restart or redeploy picks the
intent back up on its own.

## What runs where

| Concern                                  | Lives in                                       |
| ---------------------------------------- | ---------------------------------------------- |
| QR pairing, socket lifecycle, reconnects | this worker                                    |
| Session credentials                      | `whatsapp_auth_state` table (service key only) |
| Conversations, greeting, AI answer       | `whatsapp-inbound` edge function               |
| Knowledge base and prompt                | `agent-reply` edge function                    |
| UI, status, disconnect                   | `app/settings/whatsapp.tsx`                    |

Because the AI and conversation rules sit in an edge function, QR sessions
behave identically to the official API path and to the in-app playground.

## Deploy

Any host that runs a long-lived Node process works: Railway, Fly.io, Render,
a $5 VPS. **Run exactly one instance** — two would fight over the same WhatsApp
sessions and keep disconnecting each other. Turn off autoscaling and set
replicas to 1.

1. Copy this `server/` folder to the host (or point it at this repo with
   `server` as the root directory).
2. Set the environment variables from `.env.example`. `BILT_SERVICE_KEY` is a
   secret: it belongs only here, never in the mobile app.
3. Start it with `npm install && npm start`, or build the included `Dockerfile`.
4. Check `GET /health`. It reports the last reconcile time, any error, and the
   sessions currently open.

Persistent disk is not needed — credentials live in the database, so a bakery
never has to rescan because of a redeploy.

### Railway / Render quick path

- Root directory: `server`
- Build command: `npm install`
- Start command: `npm start`
- Health check path: `/health`
- Instances / replicas: `1`

## Using it

In Bakeio: **Settings → WhatsApp number → Scan a QR code → Show my QR code**.
The code appears within a few seconds and refreshes itself until scanned. On the
owner's phone: WhatsApp → Settings → Linked devices → Link a device.

After that, any customer who messages that number gets the greeting and then
answers drawn from the bakery's own products, prices, policies, FAQs and
delivery zones. Non-text messages (photos, voice notes, locations) are logged
and flagged for the owner instead of guessed at.

## Deliberate limits

- **Groups, channels and status updates are ignored.** Bakeio only answers
  one-to-one customer chats.
- **No bulk or unsolicited messages.** The worker can only reply to an inbound
  message; there is no send-to-many path anywhere in it.
- **Minimal storage.** Message text and the customer's number, nothing else.
  Media is never downloaded. History sync is switched off, so the owner's
  existing chats are never pulled in.
- **`markOnlineOnConnect` is off** so the owner's phone keeps buzzing normally.

## Reconnection behaviour

| What happened                      | What the worker does                                 |
| ---------------------------------- | ---------------------------------------------------- |
| Network dropped                    | Reconnects with backoff up to 30s                    |
| WhatsApp asked for a restart (515) | Reconnects immediately                               |
| Owner unlinked the device          | Wipes credentials, shows a fresh QR code             |
| Session keys went bad              | Same: wipe and re-pair                               |
| Another device took the session    | Reports it and retries slowly, to avoid a tug of war |
| Owner tapped Disconnect            | Logs out properly and deletes the credentials        |

## The honest risks

This uses [Baileys](https://github.com/WhiskeySockets/Baileys), which talks to
WhatsApp's own protocol without being an official client.

- It is **against WhatsApp's terms**. A number can be banned, with no appeal.
  The risk is highest for numbers that message people who did not write first —
  which is why this worker cannot do that at all.
- WhatsApp can change the protocol at any time and break sessions until Baileys
  is updated. Keep the dependency current.
- Sessions do drop and need the occasional rescan.

Recommend to owners that they start on a spare number rather than the number
their business depends on.

## Swapping Baileys out later

`src/providers/` defines one transport contract. Adding the official Cloud API,
360dialog or Gupshup means adding a file there and one line in `TRANSPORTS` —
`src/sessions.js`, the inbound function, the inbox, the knowledge base and every
screen stay untouched. Request/response providers need no worker at all; those
arrive through the existing `whatsapp-webhook` function instead.
