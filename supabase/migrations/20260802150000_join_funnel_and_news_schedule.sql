-- PROD-018 join funnel + PROD-019 news scheduling

create table if not exists public.club_join_funnel_events (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  event_name text not null check (event_name in (
    'page_view',
    'join_view',
    'request_submitted',
    'request_approved',
    'request_rejected'
  )),
  path text,
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_club_join_funnel_events_club_created
  on public.club_join_funnel_events (club_id, created_at desc);

alter table public.club_join_funnel_events enable row level security;

drop policy if exists club_join_funnel_events_insert_anon on public.club_join_funnel_events;
create policy club_join_funnel_events_insert_anon
  on public.club_join_funnel_events for insert
  with check (true);

drop policy if exists club_join_funnel_events_select_admin on public.club_join_funnel_events;
create policy club_join_funnel_events_select_admin
  on public.club_join_funnel_events for select
  using (public.is_club_admin(auth.uid(), club_id));

alter table public.announcements
  add column if not exists scheduled_publish_at timestamptz;

alter table public.announcements
  add column if not exists is_draft boolean not null default false;
