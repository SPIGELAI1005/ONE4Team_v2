-- Marketplace ↔ Partners provenance and traceability.

alter table public.partners
  add column if not exists marketplace_source boolean not null default false;

alter table public.partners
  add column if not exists marketplace_offer_id uuid
    references public.marketplace_offers(id) on delete set null;

alter table public.partners
  add column if not exists marketplace_request_id uuid
    references public.marketplace_requests(id) on delete set null;

create index if not exists partners_marketplace_source_idx
  on public.partners(club_id, marketplace_source)
  where marketplace_source = true;

alter table public.partner_tasks
  add column if not exists marketplace_request_id uuid
    references public.marketplace_requests(id) on delete set null;

create index if not exists partner_tasks_marketplace_request_idx
  on public.partner_tasks(marketplace_request_id)
  where marketplace_request_id is not null;
