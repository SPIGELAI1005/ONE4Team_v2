# TSV Allach 09 — Club Page Admin checklist

**Reference site:** [tsvallach09.de](https://www.tsvallach09.de/)  
**ONE4Team public URL:** `/club/tsv-allach-09`  
**Admin:** `/club-page-admin`  
**Draft preview:** `/club/tsv-allach-09?draft=1`

**Workflow:** Edit tab → **Save draft** → preview with `?draft=1` → **Publish** → smoke live URL.

---

## Footer parity (Wix → ONE4Team)

The public club footer now mirrors the [tsvallach09.de](https://www.tsvallach09.de/) structure:

| Wix footer | ONE4Team | Admin / data source |
|------------|----------|---------------------|
| Logo + TSV ALLACH 09 + ABTEILUNG FUSSBALL | Logo + name + **club category** subtitle | **Basics** → Club category = `Abteilung Fußball` |
| **Allgemeines → FAQ** | Footer link → `/documents#club-faq` or `/join#club-faq` | **Pages** → Documents + FAQ on; add FAQ rows in DB |
| **KONTAKT** | `/contact` | **Contact** tab |
| **MITGLIEDSANTRAG** | `/join` | **Pages** → Join enabled; **Join** tab |
| **IMPRESSUM** | `/impressum` (platform) | ONE4Team legal page |
| **DATENSCHUTZ** | `/privacy` (platform) | ONE4Team privacy policy |
| **SATZUNG** | `/documents#club-documents` | Upload PDF in **club_public_documents** (category: policies) |
| **KINDER- UND JUGENDSCHUTZ** | `/documents#club-documents` | Same; separate PDF or FAQ entry |
| **MITGLIEDSCHAFT KÜNDIGEN** | `mailto:` club email or `/contact` | **Contact** → club email |
| **Cookie settings** | Footer button → cookie preference centre | Global `CookieConsent` on all routes including `/club/*` |
| Instagram / Facebook / YouTube / WhatsApp | Footer social icons | **Contact** → social URLs |

- [ ] Club category set to **Abteilung Fußball** (or **Fußball**)
- [ ] Documents section enabled + Satzung + Jugendschutz PDFs uploaded
- [ ] FAQ items created (`club_public_faq_items`)
- [ ] Social URLs filled (Instagram, Facebook, YouTube)
- [ ] Club email set for membership cancellation mailto
- [ ] Footer visible on live page with both columns + cookie link

---

## Cookies on the published club website

- [ ] Open `/club/tsv-allach-09` in a private window — **cookie banner** appears (same as marketing site)
- [ ] Click **Cookie settings** in the **club footer** — preference dialog opens
- [ ] Accept / reject flow persists in `localStorage` (`one4team.cookieConsent`)
- [ ] Privacy policy link in banner points to `/privacy`

---

## New visitors — join instructions (built into product)

| Location | What visitors see |
|----------|-------------------|
| **Home** → Join CTA module | 3-step summary + **Request invite** + **Full step-by-step guide** → `/join` |
| **`/join`** | Role picker, detailed 3-step cards, membership form, FAQ accordion |

Admin checks:

- [ ] **Pages** → Join (`nextsteps`) enabled + **Show in navigation**
- [ ] **Join** tab → approval mode = `manual` (matches Mitgliedsantrag review)
- [ ] **Privacy** → allow public join requests ON
- [ ] Test flow: submit form → pending → admin approves in app

---

## Phase 0 — Data before Club Page Admin

| # | Task | Where |
|---|------|--------|
| 0.1 | Team names aligned with Wix (Erste Herren, Frauen, …) | **Teams** |
| 0.2 | Stadion Ticker news posts | **Communication → Announcements** (public website) |
| 0.3 | Matches + events with public publish flags | **Matches**, **Events** |
| 0.4 | Partners (Sportecke, …) | **Partners** |
| 0.5 | Public documents (Satzung, Datenschutz club PDF if separate) | **club_public_documents** |
| 0.6 | FAQ rows | **club_public_faq_items** |

---

## Tab 1 — Basics

| Field | Value |
|-------|--------|
| Club name | `TSV Allach 09` |
| Slug | `tsv-allach-09` |
| Description (DE) | Welcome + founded 1909 + football-only + Jugend bis Senioren (from Wix hero) |
| Club category | `Abteilung Fußball` |
| Default language | `de` |
| Timezone | `Europe/Berlin` |
| Publicly visible | ON |

---

## Tab 2 — Branding

Green primary (~`#1B7A3D`), dark secondary — match [tsvallach09.de](https://www.tsvallach09.de/).

---

## Tab 3 — Assets

- [ ] Logo (crest)
- [ ] Hero: stadium / team photo
- [ ] Hero overlay ON, strength ~40–60%
- [ ] Reference images for gallery

---

## Tab 4 — Pages

Enable and show in nav where applicable:

- [ ] News (`Stadion Ticker` label optional in SEO news subtitle)
- [ ] Teams, Schedule, Matches, Events
- [ ] Documents, FAQ, Join, Contact
- [ ] Shop (if Teamshop products exist)

---

## Tab 5 — Homepage modules

Order: Stats → Next up → Latest news → Featured teams → Events → Matches → Join CTA → Partners → Gallery

Featured teams: Erste Herren, Erste Frauen, Zweite Herren, Senioren, one Jugend team, Bambini/Kindergarten.

---

## Tab 6 — Privacy

- [ ] Youth protection mode ON (recommended)
- [ ] Player names hidden on public site
- [ ] Join requests allowed

---

## Tab 7 — Join

- [ ] Manual approval
- [ ] Reviewer: admin + trainer
- [ ] Notify emails set

---

## Tab 8 — Contact

| Field | Value |
|-------|--------|
| Address | `Enterstraße 55, 80999 München` |
| Phone | Club / SportsBar number from Wix |
| Email | Club contact email |
| Website | `https://www.tsvallach09.de/` (until fully migrated) |
| Lat/long | Geocode for map |
| Instagram / Facebook / YouTube | From Wix footer |

---

## Tab 9 — SEO

| Field | DE suggestion |
|-------|----------------|
| Meta title | `TSV Allach 09 \| Fußball München-Allach` |
| Meta description | Tradition since 1909, Jugend bis Senioren |
| News subtitle | `Stadion Ticker` |

---

## Tab 10 — Publish

- [ ] Save draft → preview `?draft=1` → **Publish**
- [ ] Smoke all routes (see below)

---

## Post-publish smoke test

| URL | Expect |
|-----|--------|
| `/club/tsv-allach-09` | DE content, join steps on home, footer columns, mobile hero CTA stack |
| `/club/tsv-allach-09/join` | TSV Allach **5-step** membership application + role pills |
| `/club/tsv-allach-09/tournament/sommerfest-2026` | Live tournament board (after admin publish); banner from event window |
| `/club/tsv-allach-09/news` | Stadion Ticker posts + carousel |
| `/club/tsv-allach-09/documents` | Satzung, FAQ anchor |
| `/club/tsv-allach-09/contact` | Map + social (link via footer, not header nav) |
| Footer **Cookie-Einstellungen** | Opens preference dialog |

---

## Sommerfest 2026 tournament (Jul 2026)

| # | Task | Where |
|---|------|--------|
| SF.1 | Publish/sync 22 Sommerfest matches to cup **Sommerfest 2026** | **Matches** → Publish tournament |
| SF.2 | Set scores during event (kick-off / full time) | **Matches** admin |
| SF.3 | Verify public live board updates | `/club/tsv-allach-09/tournament/sommerfest-2026` |
| SF.4 | Pulsating **Live tournament board** CTA visible from **11 Jul 2026** | Home + event detail + fixed banner |
| SF.5 | **Animated Sommerfest banner** under header draws attention (gradient + sweep; respects reduced motion) | `/club/tsv-allach-09` home |
| SF.6 | **Share tournament** on hero; **live glow** on poster left edge when matches live | Tournament page hero |
| SF.7 | **Team logos** on live board cards; **Goals** KPI; high-contrast live red UI | Tournament board |
| SF.8 | Mobile **bottom live bar**; Messages FAB does not overlap live cards | Phone + live matches |
| SF.9 | Mobile hero shows **club logo** + live pulse (desktop keeps poster) | Tournament page hero (phone) |
| SF.10 | Pitch category filters — **5 columns** on mobile | Tournament board filters |

Public URL slug: **`sommerfest-2026`**. Match import keys: **`tsv-sommerfest-2026:m01`** … **`m22`**.

## Public messaging — forward + embedded UX (2026-07-05)

| # | Task | Where |
|---|------|--------|
| MSG.1 | Type in embedded chat composer — text visible (not white on white) | Public club → **Open Messages** |
| MSG.2 | **Forward** menu appears above modal (not behind) | Any sent message → **Weiterleiten** |
| MSG.3 | WhatsApp forward includes **Message forwarded from ONE4Team - {club}** + From + Team | Share to WhatsApp |

**Deploy (2026-07-05):** Redeploy Edge **`co-trainer`** after pull for public AI 4 T role-specific system prompts.

---

## Member invite accept on public club page (2026-07-03)

| # | Task | Where |
|---|------|--------|
| MI.1 | Apply migrations **`20260731230000`**, **`20260731240000`** | Supabase |
| MI.2 | Deploy Edge **`complete-club-invite-signup`** | Supabase Functions |
| MI.3 | Create invite in **Members** → link opens **`/club/tsv-allach-09?invite=…`** | Admin + email |
| MI.4 | Modal pre-fills name/email/team; member sets password and joins | Public club page |
| MI.5 | Welcome email arrives; congratulations step offers club page + dashboard | Inbox + UI |
| MI.6 | Logged-in visitor: browse club → **Open Dashboard** → **Club page** link still visible | Dashboard menu |

---

## Social sharing + iOS home screen (2026-07-03)

- [ ] Share **`/club/tsv-allach-09`** in WhatsApp — preview shows club name + logo (not generic ONE4Team)
- [ ] Refresh cache in Facebook Sharing Debugger after each production deploy
- [ ] **Club Page Admin:** **`og_image_url`**, meta description, PNG favicon set
- [ ] iPhone **Add to Home Screen** shows club logo (re-add shortcut after deploy)

---

## Online membership application (Mitgliedsantrag)

Aligned with [tsvallach09.de/onlineanmeldung](https://www.tsvallach09.de/onlineanmeldung):

- [ ] Migration **`20260628120000_club_invite_application_payload.sql`** applied
- [ ] **`/join`** shows 5-step form for TSV Allach (personal → address → player → membership → SEPA/consents)
- [ ] Submit creates pending request with **`application_payload`** JSON for admin review
- [ ] Role pills at top (Player / Parent / Coach / …) with red selected state

---

## Navigation note (2026-06-27)

- **Contact** removed from **header** nav; remains in **footer** and direct URL `/contact`
- Mobile hero button order: team filter → next training → AI 4 T → dashboard

---

## Public shop, reports, live scores (2026-07-01)

| Route | Admin toggle | Smoke |
|-------|--------------|-------|
| `/club/tsv-allach-09/shop` | **Pages** → Shop enabled | JAKO products visible after seed/migration |
| `/club/tsv-allach-09/reports` | **Pages** → Reports enabled | Role-scoped report persona |
| `/club/tsv-allach-09/live-scores` | **Pages** → Live scores enabled | Live board when matches published; **home section** title + description matches Reports card |

Additional checks:

- [ ] Migration **`20260730120000`**–**`20260730140000`** applied
- [ ] Optional **`seed_tsv_allach_jako_shop.sql`** run for pilot retail
- [ ] **Basics** → favicon uploaded; live page shows club icon (not default ONE4Team)
- [ ] **`/matches`** on public site shows opponent logos where uploaded in admin **`/matches`**
- [ ] Marketing **`/features`** — AI intro video plays when section centered; hero width matches 3 AI cards below

---

## Still manual / not in product yet

| Wix feature | Workaround |
|-------------|------------|
| Newsletter widget | External link or Join CTA |
| Vereinssong (audio) | YouTube link in news |
| SportsBar page | News post + contact |
| Nested team nav groups | Team naming in **Teams** admin |
| WhatsApp | No dedicated field — use social or website URL containing `wa.me` |
