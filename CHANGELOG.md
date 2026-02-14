# ONE4Team (clubhub-connect) — CHANGELOG

This log is maintained by the agent during local-first execution.
It records notable changes, features, and hardening steps.

## 2026-02-14
### Internationalization (i18n) — Full DE/EN support
- Added `LanguageContext` + `useLanguage` hook + `LanguageToggle` component
- Created centralized translation files (`src/i18n/en.ts`, `src/i18n/de.ts`)
- Translated all pages and components: Landing, Auth, Pricing, Dashboard, Members, etc.
- Language toggle in header (next to theme toggle) on all pages
- Browser language auto-detection with localStorage persistence

### New pages: Features, Clubs & Partners, About, Pricing
- **Features page** (`/features`): comprehensive feature showcase with club features, partner features, AI features, "Who Benefits" section, and 4 real-world use cases
- **Clubs & Partners page** (`/clubs-and-partners`): partner showcase with TSV Allach 09 (green chrome gradient) and Sportecke München (blue chrome gradient), including integrated images, testimonials, and CTA for new partners
- **Pricing page** (`/pricing`): translated pricing cards with consistent 3-line descriptions, feature comparison table, and price calculator
- **About page** (`/about`): company overview and vision

### Animated football background on Auth page
- Applied `FootballFieldAnimation` canvas animation (from hero section) as background on `/auth`
- Chat bubbles in the animation now translate to German when language is switched
- Full German phrase banks for player chat, coach instructions, supporter cheers, referee calls, set-piece labels, and goal celebrations

### Auth & navigation improvements
- "Back" pill button on Auth page linking to landing page (translated)
- `RequireAuth` route guard with loading state — all protected routes auto-redirect to `/auth`
- Removed all inline "Please sign in" fallbacks from 13 pages (centralized in route guard)
- "Watch Demo" button renamed to "Find out More" and linked to Features page

### Test Mode Banner
- Dismissible red banner under header on all app pages (Auth + Dashboard)
- Professional message informing users about beta/test mode
- "Report an Issue" mailto link
- Session-persistent dismiss (sessionStorage)
- Fully translated (EN/DE)

### Theme toggle
- Dark/light mode toggle with system preference detection
- `ThemeContext` + `useTheme` hook + `ThemeToggle` component

### Bug fixes & polish
- Fixed flickering registration button (replaced animated `bg-gradient-gold` with static `bg-gradient-gold-static`)
- Fixed blank page caused by German typographic quotes in `de.ts` string literals
- Fixed `t is not defined` error on Pricing page (missing `useLanguage` hook)
- Pricing card descriptions now always occupy 3 lines (`line-clamp-3`)
- Bespoke plan name stays "Bespoke" in German translation

### Vercel deployment readiness
- Created `vercel.json` with SPA rewrite rules for client-side routing
- Production build verified (`vite build` succeeds)
- Fixed `DEPLOYMENT.md` env var name (`VITE_SUPABASE_PUBLISHABLE_KEY`)

### Dashboard sidebar fixes
- Added missing routes: partners → `/partners`, schedule → `/activities`, messages → `/communication`
- Fixed for all roles: admin, trainer, player, sponsor, supplier, service, consultant

### 404 page translated
- NotFound page now uses i18n translations (EN/DE)

## 2026-02-13
### Trainer-first UX pass (Schedule / Dues / Partners / Dashboard / Profile)
- Schedule became the central hub:
  - Added filters (type/team/mine/past)
  - Added trainer attendance summaries per activity
  - Added trainer attendance detail drawer (confirmed/declined/unconfirmed + member lists)
  - Added "Week template" action (creates 2 trainings + 1 match, uses team filter if set)
  - Added "Nudge unconfirmed" placeholder (copies message to clipboard; real send is HOLD)
- Dues improvements:
  - Added bulk create dues for active members (with role filter)
  - Include member display names in UI and CSV export
- Partners improvements:
  - Contact-card fields (website/email/phone/notes)
  - Search across partner fields
- Dashboard improvements:
  - Added trainer "Getting started" checklist
  - Best-effort upcoming list + KPIs from DB when available (falls back safely when not)
- Player profile polish:
  - Added dues summary (due/paid) as best-effort block in Overview
- Navigation polish:
  - Trainer sidebar + mobile nav include Schedule

### Phase 7 hardening (local readiness)
- Auth redirect semantics: protected routes redirect to `/auth`.
- ErrorBoundary + minimal logger wired.
- Health/debug endpoint: `/health`.
- E2E:
  - Playwright scaffold with webServer.
  - Route smoke coverage and protected-route redirect coverage.
  - CI runs Playwright (installs browsers).
- Bundle report:
  - Added `npm run build:report` / `bundle:report`.

## Previous phases (local readiness)
- Phase 2: activities + attendance (bundle + page + audits)
- Phase 3: matches + stats (bundle + docs)
- Phase 4: manual dues (bundle + Dues page)
- Phase 5: partners stub (bundle + placeholder page)
- Phase 6: AI hub (ai_requests logging + stub copilots)

---

## HOLD (requires Supabase / infra)
See `HOLD.md`.
