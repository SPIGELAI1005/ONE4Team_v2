-- Chat bridge backend skeleton for WhatsApp/Telegram connectors.
-- Stores connector configuration and inbound/outbound bridge events.

create table if not exists public.chat_bridge_connectors (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  provider text not null check (provider in ('whatsapp', 'telegram')),
  status text not null default 'pending' check (status in ('pending', 'connected', 'error', 'disabled')),
  display_name text,
  external_channel_id text,
  webhook_secret text not null default gen_random_uuid()::text,
  config jsonb not null default '{}'::jsonb,
  bridge_user_id uuid references auth.users(id) on delete set null,
  created_by uuid not null references auth.users(id) on delete cascade,
  last_error text,
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists uq_chat_bridge_connectors_club_provider
  on public.chat_bridge_connectors (club_id, provider);

create index if not exists idx_chat_bridge_connectors_status
  on public.chat_bridge_connectors (status);

create index if not exists idx_chat_bridge_connectors_webhook_secret
  on public.chat_bridge_connectors (provider, webhook_secret);

alter table public.chat_bridge_connectors enable row level security;

drop policy if exists "chat_bridge_connectors_select_admin" on public.chat_bridge_connectors;
create policy "chat_bridge_connectors_select_admin"
  on public.chat_bridge_connectors
  for select to authenticated
  using (public.is_club_admin(auth.uid(), club_id));

drop policy if exists "chat_bridge_connectors_insert_admin" on public.chat_bridge_connectors;
create policy "chat_bridge_connectors_insert_admin"
  on public.chat_bridge_connectors
  for insert to authenticated
  with check (public.is_club_admin(auth.uid(), club_id) and created_by = auth.uid());

drop policy if exists "chat_bridge_connectors_update_admin" on public.chat_bridge_connectors;
create policy "chat_bridge_connectors_update_admin"
  on public.chat_bridge_connectors
  for update to authenticated
  using (public.is_club_admin(auth.uid(), club_id))
  with check (public.is_club_admin(auth.uid(), club_id));

drop policy if exists "chat_bridge_connectors_delete_admin" on public.chat_bridge_connectors;
create policy "chat_bridge_connectors_delete_admin"
  on public.chat_bridge_connectors
  for delete to authenticated
  using (public.is_club_admin(auth.uid(), club_id));

drop trigger if exists update_chat_bridge_connectors_updated_at on public.chat_bridge_connectors;
create trigger update_chat_bridge_connectors_updated_at
before update on public.chat_bridge_connectors
for each row execute function public.update_updated_at();

create table if not exists public.chat_bridge_events (
  id uuid primary key default gen_random_uuid(),
  connector_id uuid not null references public.chat_bridge_connectors(id) on delete cascade,
  club_id uuid not null references public.clubs(id) on delete cascade,
  direction text not null check (direction in ('inbound', 'outbound', 'system')),
  team_id uuid references public.teams(id) on delete set null,
  message_payload jsonb not null default '{}'::jsonb,
  provider_message_id text,
  status text not null default 'queued' check (status in ('queued', 'processed', 'failed', 'ignored')),
  error_message text,
  created_at timestamptz not null default now(),
  processed_at timestamptz
);

create index if not exists idx_chat_bridge_events_connector_created_at
  on public.chat_bridge_events (connector_id, created_at desc);

create index if not exists idx_chat_bridge_events_club_created_at
  on public.chat_bridge_events (club_id, created_at desc);

create index if not exists idx_chat_bridge_events_status
  on public.chat_bridge_events (status);

alter table public.chat_bridge_events enable row level security;

drop policy if exists "chat_bridge_events_select_admin" on public.chat_bridge_events;
create policy "chat_bridge_events_select_admin"
  on public.chat_bridge_events
  for select to authenticated
  using (public.is_club_admin(auth.uid(), club_id));
