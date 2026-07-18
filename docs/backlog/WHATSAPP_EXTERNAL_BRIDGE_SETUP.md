# Backlog: WhatsApp External Bridge setup (club admin)

**Status:** Code ready for Meta verify (BRIDGE-WA-001) — redeploy `chat-bridge` before Meta callback setup  
**Owner:** Club admin + platform operator  
**Related UI:** `/communication` → left sidebar → **External Bridge (Beta)** → **WhatsApp**  
**Edge function:** `supabase/functions/chat-bridge`  
**Last updated:** 2026-07-18

---

## Summary

ONE4Team can link club chat to **WhatsApp Business API** (not personal WhatsApp / no QR scan like WhatsApp Web). Inbound messages appear in **Club General** (or a team channel). Setup requires Meta Cloud API credentials, ONE4Team connector save, and a **public webhook URL** (localhost cannot receive WhatsApp callbacks).

**Webhook verification (BRIDGE-WA-001):** `GET /functions/v1/chat-bridge/webhook/whatsapp` accepts Meta’s `hub.mode=subscribe`, `hub.verify_token`, `hub.challenge` and returns the challenge as **plain text** when the token matches:

1. Edge secret **`WHATSAPP_VERIFY_TOKEN`**, or  
2. A WhatsApp connector’s **`webhook_secret`**, or  
3. Connector config **`verify_token`** / **`webhook_verify_token`**

Redeploy after pull: `supabase functions deploy chat-bridge`.

---

## Prerequisites

| Requirement | Notes |
|-------------|--------|
| **Club admin** in ONE4Team | Only admins can save connectors |
| **Deployed Supabase** | Webhooks must reach the internet; `localhost:8080` is not enough for end-to-end |
| **`chat-bridge` deployed** | `supabase functions deploy chat-bridge` |
| **Chat tables applied** | If Communication shows “chat database not ready”, apply messages + bridge migrations |
| **WhatsApp Business API** | Meta Business account + business phone number (test number OK for dev) |

**Example webhook base** (project `qbtunzuztvnkerbdazjs`):

```text
https://qbtunzuztvnkerbdazjs.supabase.co/functions/v1/chat-bridge/webhook/whatsapp
```

---

## Part 1 — Meta WhatsApp Cloud API

### 1. Create app

1. [Meta for Developers](https://developers.facebook.com/) → **My Apps** → **Create App** (Business type).
2. Add product **WhatsApp** → **Getting Started**.
3. Link **Meta Business Account** and add a phone number.

### 2. Collect credentials

From **WhatsApp → API Setup**:

| Field | Example |
|-------|---------|
| **Phone Number ID** | `123456789012345` |
| **Permanent access token** | `EAAxxxxx...` |
| **Business phone number** (no `+`) | `491701234567` |

### 3. API base URL for ONE4Team

```text
https://graph.facebook.com/v21.0/YOUR_PHONE_NUMBER_ID
```

ONE4Team appends `/messages` when sending outbound.

---

## Part 2 — ONE4Team connector

1. Sign in as **club admin**.
2. Open **`/communication`** → **External Bridge (Beta)** → **WhatsApp**.
3. Fill in:

| Field | Value |
|-------|--------|
| **Display name** | e.g. `TSV Allach WhatsApp` |
| **External channel id / chat id** | Default **outbound** recipient (international number without `+`). Inbound from anyone messaging the business number still lands in ONE4Team. |
| **Optional team id** | Blank → **Club General**; or team UUID → that team’s channel |
| **Status** | `pending` until webhook works, then **`connected`** |
| **WhatsApp API base URL** | `https://graph.facebook.com/v21.0/PHONE_NUMBER_ID` |
| **WhatsApp access token** | Meta token |
| **WhatsApp from number** | Business number without `+` |
| **Webhook secret** | Leave blank (ONE4Team generates one) |

4. Click **Save connector**.
5. Clipboard receives:

```text
Webhook URL: https://<project>.supabase.co/functions/v1/chat-bridge/webhook/whatsapp
Header: x-bridge-secret
Secret: <uuid>
```

Store the **secret** for Meta configuration.

---

## Part 3 — Meta webhook

In **Meta for Developers** → **WhatsApp** → **Configuration**:

1. **Callback URL** — include secret in query (Meta does not send custom headers on verify):

```text
https://<project>.supabase.co/functions/v1/chat-bridge/webhook/whatsapp?secret=YOUR_SECRET
```

2. **Verify token** — any string you choose (e.g. `one4team-verify`). Requires GET `hub.challenge` support in `chat-bridge` (see **Known gap** above).

3. Subscribe to **`messages`**.

4. **Verify and save**.

5. In ONE4Team, set **Status** → **connected** and **Save** again.

---

## Part 4 — Test

1. From a phone, message your **business WhatsApp number**.
2. In ONE4Team → **Communication** → **Club General** (or team channel).
3. Refresh; message text should appear.
4. **External Bridge** health card: **processed** count should increase.

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| **Bridge setup failed** | Deploy `chat-bridge` Edge function |
| **Only club admins…** | Check role under **Members** |
| **Chat database not ready** | Apply `20260301152000` + messages migrations |
| **Webhook verification failed** | Add Meta GET verify to `chat-bridge` |
| **Invalid webhook secret** | Re-save connector; match `?secret=` exactly |
| **Processed stays 0** | Status must be `connected`; use deployed URL not localhost |
| Personal WhatsApp / QR | **Not supported** — use Business API only |

---

## Easier alternative: Telegram

See Support FAQ in app (`/support`) — **External Bridge** → **Telegram**: BotFather bot token + group chat id + `setWebhook` to the copied URL.

---

## Engineering follow-ups (backlog)

- [ ] **BRIDGE-WA-001** — Meta webhook GET verification (`hub.mode`, `hub.verify_token`, `hub.challenge`) on `chat-bridge/webhook/whatsapp`
- [ ] **BRIDGE-WA-002** — Operator smoke: save connector → Meta verify → inbound message in Club General
- [ ] **BRIDGE-WA-003** — Document verify token field in Communication UI if we add Meta-specific config
- [ ] **BRIDGE-WA-004** — Confirm outbound reply path from ONE4Team chat to WhatsApp for pilot clubs

---

## References

- In-app FAQ: `/support` → Communication → External Bridge
- `src/pages/Communication.tsx` — bridge settings modal
- `supabase/functions/chat-bridge/index.ts` — webhook + dispatch
- `supabase/migrations/20260301152000_add_chat_bridge_connectors_and_events.sql`
- `CHANGELOG.md` § 2026-06-25 (communication + attendance wave)
