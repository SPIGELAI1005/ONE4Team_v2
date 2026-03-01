# ONE4Team (clubhub-connect)

Club/team management SaaS with an iOS-style glass UI, full internationalization (DE/EN), and an animated football field background.

## Features
- **Multi-language**: Full German and English support with auto-detection
- **Dark/Light theme**: System preference detection + manual toggle
- **Animated football field**: Canvas-based match simulation with translated chat bubbles
- **Public pages**: Features, Clubs & Partners, Pricing, About
- **Legal pages**: Terms of Service, Privacy Policy, Impressum (GDPR/TMG compliant)
- **Cookie Consent**: GDPR-compliant banner with Accept All / Essential Only
- **Dashboard**: Role-based views (Admin, Trainer, Player, Sponsor, Supplier, etc.) with personalized greeting
- **Shop**: Product catalog, orders management, categories (demo data)
- **Club Page Admin**: Manage public club page (branding, contact, social, SEO)
- **Settings**: Profile, club config, notification preferences, account security
- **AI copilots**: Co-Trainer + Co-AImin with club-scoped logging
- **Partner showcase**: TSV Allach 09 + Sportecke München with images and testimonials
- **Test Mode Banner**: Dismissible beta disclaimer across all pages

## Stack
- Vite + React + TypeScript
- shadcn-ui + Radix UI + Tailwind CSS
- Framer Motion (animations)
- Supabase (Auth + Postgres)
- Vercel (deployment-ready)

## Local development

### 1) Install
```bash
npm install
```

### 2) Configure environment
Create a `.env` file (see `.env.example`).

Required:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_SUPABASE_PROJECT_ID`

### 3) Run
```bash
npm run dev
```

## Scripts
```bash
npm run build        # Production build
npm run lint         # Lint check
npm test             # Run tests
npm run build:report # Bundle size report
```

## Deployment (Vercel)
- `vercel.json` is configured with SPA rewrite rules
- See `DEPLOYMENT.md` for full deployment guide
- Set environment variables in Vercel dashboard

## Project documentation
- `CHANGELOG.md` — detailed change log
- `PROJECT_STATUS.md` — current project state
- `ROADMAP.md` — development roadmap (Phase 0–12 + v2)
- `TASKS.md` — execution queue with task status
- `DEPLOYMENT.md` — Vercel deployment guide
- `HOLD.md` — items blocked on Supabase/infra

## Current Release Snapshot
Go-live readiness checklist:

- [ ] **DB ready:** baseline bundles + incremental communication migrations applied (`20260301152000`, `20260301164000`, `20260301173500`, `20260301181500`).
- [ ] **Env vars correct:** `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` match the intended Supabase project per environment.
- [ ] **Smoke tests pass:** auth, onboarding/invites, members flow, settings save, club-page admin save, public club preview.
- [ ] **Communication verified:** announcements, chat send/retry, attachments, connector save/list, and no schema-cache missing-table errors.
- [ ] **Quality gates green:** `npm run lint`, `npm test`, `npm run build` pass for the release branch.

## Notes
- Do **not** commit `.env` (use `.env.example`).
- Route-level code splitting is already implemented for all pages.
- All pages are fully translated (EN/DE) via `src/i18n/`.
