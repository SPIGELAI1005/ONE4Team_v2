-- Marketplace offers: currency, notes, audit fields, Partners bridge column.

alter table public.marketplace_offers
  add column if not exists currency text not null default 'EUR'
    check (char_length(currency) between 3 and 3);

alter table public.marketplace_offers
  add column if not exists notes text;

alter table public.marketplace_offers
  add column if not exists accepted_at timestamptz;

alter table public.marketplace_offers
  add column if not exists accepted_by uuid references auth.users(id) on delete set null;

alter table public.partner_tasks
  add column if not exists marketplace_offer_id uuid
    references public.marketplace_offers(id) on delete set null;

create index if not exists partner_tasks_marketplace_offer_idx
  on public.partner_tasks(marketplace_offer_id)
  where marketplace_offer_id is not null;
