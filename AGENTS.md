# AGENTS.md

## Cursor Cloud specific instructions

### Project overview

ONE4Team is a football/soccer club management SaaS — a Vite + React + TypeScript SPA using shadcn/ui, Radix UI, and Tailwind CSS. Backend is cloud-hosted Supabase (Auth + Postgres). See `README.md` for full details.

### Key commands

| Task | Command |
|---|---|
| Dev server | `npm run dev` (port 8080) |
| Lint | `npm run lint` |
| Unit tests | `npm test` |
| E2E tests | `npm run e2e` (starts its own dev server) |
| Build | `npm run build` |

### Non-obvious notes

- The app gracefully degrades without Supabase credentials — public pages (landing, features, pricing, about, clubs & partners, legal) render fine. Auth-gated pages (dashboard, members, etc.) redirect to `/auth`.
- ESLint is configured with `--max-warnings 0`. The codebase currently has 5 pre-existing warnings, so `npm run lint` exits non-zero. This is the expected baseline state.
- Playwright e2e tests (`npm run e2e`) spin up their own Vite dev server on port 5173 — no need to start a dev server separately for e2e.
- The Vite dev server binds to `::` (all interfaces) on port 8080 with HMR overlay disabled.
- Path alias `@` maps to `./src` (configured in `vite.config.ts` and `tsconfig.json`).
- No Docker or local database setup needed — all backend services are cloud-hosted on Supabase.
- Supabase env vars (`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID`) go in `.env` — see `.env.example`.
