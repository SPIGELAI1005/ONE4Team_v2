-- PROD-016: engagement reviews after closed partner tasks / marketplace engagements

create table if not exists public.marketplace_engagement_reviews (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  partner_id uuid references public.partners(id) on delete set null,
  provider_profile_id uuid references public.marketplace_provider_profiles(id) on delete set null,
  engagement_id uuid references public.partner_tasks(id) on delete cascade,
  rating integer not null check (rating >= 1 and rating <= 5),
  comment text,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (engagement_id)
);

create index if not exists idx_marketplace_engagement_reviews_club
  on public.marketplace_engagement_reviews(club_id);
create index if not exists idx_marketplace_engagement_reviews_provider
  on public.marketplace_engagement_reviews(provider_profile_id);

alter table public.marketplace_engagement_reviews enable row level security;

drop policy if exists marketplace_engagement_reviews_select on public.marketplace_engagement_reviews;
create policy marketplace_engagement_reviews_select
  on public.marketplace_engagement_reviews for select
  using (
    exists (
      select 1 from public.club_memberships cm
      where cm.club_id = marketplace_engagement_reviews.club_id
        and cm.user_id = auth.uid()
        and cm.status = 'active'
    )
    or provider_profile_id in (
      select id from public.marketplace_provider_profiles
      where listing_status = 'active'
        and visibility in ('public', 'marketplace_only')
    )
  );

drop policy if exists marketplace_engagement_reviews_insert on public.marketplace_engagement_reviews;
create policy marketplace_engagement_reviews_insert
  on public.marketplace_engagement_reviews for insert
  with check (
    public.is_club_admin(auth.uid(), club_id)
    and created_by = auth.uid()
  );

drop policy if exists marketplace_engagement_reviews_update on public.marketplace_engagement_reviews;
create policy marketplace_engagement_reviews_update
  on public.marketplace_engagement_reviews for update
  using (public.is_club_admin(auth.uid(), club_id) and created_by = auth.uid());
