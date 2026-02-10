# ONE4Team (clubhub-connect)

Club/team management app with an iOS-style glass UI.

## Stack
- Vite + React + TypeScript
- shadcn-ui + Tailwind
- Supabase (Auth + Postgres)

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
npm run build
npm run lint
npm test
```

## Notes
- Do **not** commit `.env` (use `.env.example`).
- Bundle size warnings can be reduced via route-level code splitting and/or Vite manualChunks.
