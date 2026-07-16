-- Align platform plan catalog with revised commercial packaging.
-- Source of truth in app: src/lib/plan-catalog.ts

update public.plans
set
  description = 'Entry plan for small clubs (up to 100 members).',
  price_monthly = 19.00,
  price_yearly = 182.40,
  max_users = 100,
  max_teams = 5,
  updated_at = now()
where key = 'kickoff';

update public.plans
set
  description = 'Growth plan for active clubs with payments, partners, and shop (up to 400 members).',
  price_monthly = 39.00,
  price_yearly = 374.40,
  max_users = 400,
  max_teams = 20,
  updated_at = now()
where key = 'squad';

update public.plans
set
  description = 'Advanced plan with AI, analytics, branding, and bilingual pages (up to 1,200 members).',
  price_monthly = 79.00,
  price_yearly = 758.40,
  max_users = 1200,
  max_teams = 60,
  updated_at = now()
where key = 'pro';

update public.plans
set
  description = 'Large-club plan with API, priority support, and higher limits (up to 5,000 members).',
  price_monthly = 149.00,
  price_yearly = 1430.40,
  max_users = 5000,
  max_teams = 200,
  updated_at = now()
where key = 'champions';
