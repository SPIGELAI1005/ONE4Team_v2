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

Public URL slug: **`sommerfest-2026`**. Match import keys: **`tsv-sommerfest-2026:m01`** … **`m22`**.

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

## Still manual / not in product yet

| Wix feature | Workaround |
|-------------|------------|
| Newsletter widget | External link or Join CTA |
| Vereinssong (audio) | YouTube link in news |
| SportsBar page | News post + contact |
| Nested team nav groups | Team naming in **Teams** admin |
| WhatsApp | No dedicated field — use social or website URL containing `wa.me` |
