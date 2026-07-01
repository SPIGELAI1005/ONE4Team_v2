-- Supplier / external provider scoped access: partner threads, tasks, invoices.
-- Re-versioned from 20260731160000 (collision with repair_redeem_invite_membership_upsert).
-- ---------------------------------------------------------------------------
-- Helper: marketplace profile owner linked to a club partner row
-- ---------------------------------------------------------------------------
create or replace function public.is_marketplace_provider_for_partner(
  _partner_id uuid,
  _user_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.marketplace_provider_profiles p
    where p.owner_user_id = _user_id
      and (
        p.partner_id = _partner_id
        or exists (
          select 1
          from public.partners pt
          join public.marketplace_offers o on o.id = pt.marketplace_offer_id
          where pt.id = _partner_id
            and o.provider_profile_id = p.id
            and o.status = 'accepted'
        )
      )
  );
$$;

revoke all on function public.is_marketplace_provider_for_partner(uuid, uuid) from public;
grant execute on function public.is_marketplace_provider_for_partner(uuid, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Partner ↔ club direct messages (not internal team chat)
-- ---------------------------------------------------------------------------
create table if not exists public.partner_messages (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  partner_id uuid not null references public.partners(id) on delete cascade,
  sender_user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  content text not null check (char_length(trim(content)) > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists partner_messages_thread_idx
  on public.partner_messages (club_id, partner_id, created_at desc);

drop trigger if exists update_partner_messages_updated_at on public.partner_messages;
create trigger update_partner_messages_updated_at
  before update on public.partner_messages
  for each row execute function public.update_updated_at();

alter table public.partner_messages enable row level security;

drop policy if exists partner_messages_select on public.partner_messages;
create policy partner_messages_select
  on public.partner_messages for select to authenticated
  using (
    public.is_club_admin(auth.uid(), club_id)
    or public.is_marketplace_provider_for_partner(partner_id, auth.uid())
  );

drop policy if exists partner_messages_insert on public.partner_messages;
create policy partner_messages_insert
  on public.partner_messages for insert to authenticated
  with check (
    sender_user_id = auth.uid()
    and (
      public.is_club_admin(auth.uid(), club_id)
      or public.is_marketplace_provider_for_partner(partner_id, auth.uid())
    )
  );

-- ---------------------------------------------------------------------------
-- External providers: read/update assigned partner tasks & read own invoices
-- ---------------------------------------------------------------------------
drop policy if exists partner_tasks_select_provider on public.partner_tasks;
create policy partner_tasks_select_provider
  on public.partner_tasks for select to authenticated
  using (
    assigned_to_user_id = auth.uid()
    or public.is_marketplace_provider_for_partner(partner_id, auth.uid())
  );

drop policy if exists partner_tasks_update_provider on public.partner_tasks;
create policy partner_tasks_update_provider
  on public.partner_tasks for update to authenticated
  using (
    assigned_to_user_id = auth.uid()
    or public.is_marketplace_provider_for_partner(partner_id, auth.uid())
  )
  with check (
    assigned_to_user_id = auth.uid()
    or public.is_marketplace_provider_for_partner(partner_id, auth.uid())
  );

drop policy if exists partner_invoices_select_provider on public.partner_invoices;
create policy partner_invoices_select_provider
  on public.partner_invoices for select to authenticated
  using (public.is_marketplace_provider_for_partner(partner_id, auth.uid()));

-- Public supplier page: active listings with public visibility
drop policy if exists marketplace_profiles_select_public on public.marketplace_provider_profiles;
create policy marketplace_profiles_select_public
  on public.marketplace_provider_profiles for select to anon, authenticated
  using (
    listing_status = 'active'
    and visibility = 'public'
    and slug is not null
  );
