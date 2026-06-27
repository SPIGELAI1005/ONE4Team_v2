-- Repair: events, training_sessions, and club_public_has_feature were missing on remote
-- despite migration history (same class of drift as notifications).

-- ---------------------------------------------------------------------------
-- events
-- ---------------------------------------------------------------------------
create table if not exists public.events (
  id uuid not null default gen_random_uuid() primary key,
  club_id uuid not null references public.clubs(id) on delete cascade,
  title text not null,
  description text,
  event_type text not null default 'event',
  location text,
  starts_at timestamptz not null,
  ends_at timestamptz,
  max_participants integer,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  publish_to_public_schedule boolean not null default true,
  image_url text,
  public_summary text,
  public_registration_enabled boolean not null default false,
  registration_external_url text,
  public_event_detail_enabled boolean not null default false,
  team_id uuid references public.teams(id) on delete set null,
  target_audience text,
  partner_name text,
  contact_email text,
  import_key text
);

create unique index if not exists events_club_import_key_uidx
  on public.events (club_id, import_key)
  where import_key is not null;

create index if not exists idx_events_club_starts_at
  on public.events (club_id, starts_at);

alter table public.events enable row level security;

drop trigger if exists update_events_updated_at on public.events;
create trigger update_events_updated_at
  before update on public.events
  for each row execute function public.update_updated_at();

drop policy if exists "Members can view events" on public.events;
drop policy if exists "Admins can create events" on public.events;
drop policy if exists "Admins can update events" on public.events;
drop policy if exists "Admins can delete events" on public.events;
drop policy if exists "Public can view published events of public clubs" on public.events;

create policy "Members can view events"
  on public.events for select to authenticated
  using (public.is_member_of_club(auth.uid(), club_id));

create policy "Admins can create events"
  on public.events for insert to authenticated
  with check (public.is_club_admin(auth.uid(), club_id) and created_by = auth.uid());

create policy "Admins can update events"
  on public.events for update to authenticated
  using (public.is_club_admin(auth.uid(), club_id));

create policy "Admins can delete events"
  on public.events for delete to authenticated
  using (public.is_club_admin(auth.uid(), club_id));

create policy "Public can view published events of public clubs"
  on public.events for select to anon, authenticated
  using (
    exists (
      select 1 from public.clubs c
      where c.id = events.club_id and c.is_public = true
    )
    and coalesce(events.publish_to_public_schedule, true) = true
  );

-- ---------------------------------------------------------------------------
-- training_sessions
-- ---------------------------------------------------------------------------
create table if not exists public.training_sessions (
  id uuid not null default gen_random_uuid() primary key,
  club_id uuid not null references public.clubs(id) on delete cascade,
  team_id uuid references public.teams(id) on delete set null,
  title text not null,
  description text,
  location text,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  recurring text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  publish_to_public_schedule boolean not null default true
);

create index if not exists idx_training_sessions_club_starts_at
  on public.training_sessions (club_id, starts_at);

alter table public.training_sessions enable row level security;

drop trigger if exists update_training_sessions_updated_at on public.training_sessions;
create trigger update_training_sessions_updated_at
  before update on public.training_sessions
  for each row execute function public.update_updated_at();

drop policy if exists "Members can view training sessions" on public.training_sessions;
drop policy if exists "Admins/trainers can create sessions" on public.training_sessions;
drop policy if exists "Admins can update sessions" on public.training_sessions;
drop policy if exists "Admins can delete sessions" on public.training_sessions;
drop policy if exists "Public can view training_sessions of public clubs" on public.training_sessions;

create policy "Members can view training sessions"
  on public.training_sessions for select to authenticated
  using (public.is_member_of_club(auth.uid(), club_id));

create policy "Admins/trainers can create sessions"
  on public.training_sessions for insert to authenticated
  with check (public.is_member_of_club(auth.uid(), club_id));

create policy "Admins can update sessions"
  on public.training_sessions for update to authenticated
  using (public.is_club_admin(auth.uid(), club_id) or created_by = auth.uid());

create policy "Admins can delete sessions"
  on public.training_sessions for delete to authenticated
  using (public.is_club_admin(auth.uid(), club_id));

create policy "Public can view training_sessions of public clubs"
  on public.training_sessions for select to anon, authenticated
  using (
    exists (
      select 1 from public.clubs c
      where c.id = training_sessions.club_id and c.is_public = true
    )
    and coalesce(training_sessions.publish_to_public_schedule, true) = true
    and (
      training_sessions.team_id is null
      or exists (
        select 1 from public.teams t
        where t.id = training_sessions.team_id
          and t.club_id = training_sessions.club_id
          and coalesce(t.public_website_visible, true) = true
          and coalesce(t.public_training_schedule_visible, true) = true
      )
    )
  );

-- ---------------------------------------------------------------------------
-- club_public_has_feature (latest: ai, shop, multilingual)
-- ---------------------------------------------------------------------------
alter table public.club_feature_trials
  drop constraint if exists club_feature_trials_feature_check;

alter table public.club_feature_trials
  add constraint club_feature_trials_feature_check
  check (feature in ('ai', 'shop', 'multilingual'));

create or replace function public.club_public_has_feature(p_club_id uuid, p_feature text)
returns boolean
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_is_public boolean;
  v_plan_id text;
  v_status text;
  v_trial_expires timestamptz;
begin
  if p_club_id is null or p_feature is null or p_feature not in ('ai', 'shop', 'multilingual') then
    return false;
  end if;

  select coalesce(c.is_public, false) into v_is_public
  from public.clubs c
  where c.id = p_club_id;

  if not v_is_public then
    return false;
  end if;

  select t.expires_at into v_trial_expires
  from public.club_feature_trials t
  where t.club_id = p_club_id
    and t.feature = p_feature;

  if v_trial_expires is not null and v_trial_expires > now() then
    return true;
  end if;

  select b.plan_id, b.status into v_plan_id, v_status
  from public.billing_subscriptions b
  where b.club_id = p_club_id;

  if v_status is null or v_status not in ('active', 'trialing') then
    return false;
  end if;

  v_plan_id := lower(coalesce(v_plan_id, 'kickoff'));

  if p_feature = 'ai' then
    return v_plan_id in ('pro', 'champions', 'bespoke');
  end if;

  if p_feature = 'multilingual' then
    return v_plan_id in ('pro', 'champions', 'bespoke');
  end if;

  return v_plan_id in ('squad', 'pro', 'champions', 'bespoke');
end;
$$;

revoke all on function public.club_public_has_feature(uuid, text) from public;
grant execute on function public.club_public_has_feature(uuid, text) to anon, authenticated;

notify pgrst, 'reload schema';
