-- Profile photo 2-year validity + renewal notifications.
-- Tracks when club registry photos were uploaded; notifies members (or parents
-- for under-18 players) when the photo is older than 2 years.

alter table public.club_member_master_records
  add column if not exists photo_uploaded_at timestamptz;

comment on column public.club_member_master_records.photo_uploaded_at is
  'When photo_url was last set/uploaded. Photos should be renewed after 2 years.';

-- Backfill existing photos so they receive a validity window from last update.
update public.club_member_master_records
set photo_uploaded_at = coalesce(updated_at, created_at, now())
where photo_url is not null
  and photo_uploaded_at is null;

create index if not exists idx_club_member_master_photo_uploaded_at
  on public.club_member_master_records (club_id, photo_uploaded_at)
  where photo_url is not null;

-- Keep photo_uploaded_at in sync when photo_url changes.
create or replace function public.sync_master_photo_uploaded_at()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    if new.photo_url is not null and new.photo_uploaded_at is null then
      new.photo_uploaded_at := now();
    elsif new.photo_url is null then
      new.photo_uploaded_at := null;
    end if;
    return new;
  end if;

  if new.photo_url is distinct from old.photo_url then
    if new.photo_url is null then
      new.photo_uploaded_at := null;
    else
      new.photo_uploaded_at := now();
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_sync_master_photo_uploaded_at on public.club_member_master_records;
create trigger trg_sync_master_photo_uploaded_at
  before insert or update of photo_url on public.club_member_master_records
  for each row
  execute function public.sync_master_photo_uploaded_at();

-- Insert photo_renewal notifications for expired photos in a club.
-- Adults: notify the member. Under-18 players: notify linked parents/guardians
-- (fall back to the member if no guardian links).
-- Dedupes per recipient+membership within 30 days.
create or replace function public.ensure_photo_renewal_notifications(_club_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  inserted_count integer := 0;
  rec record;
  recipient uuid;
  recipient_ids uuid[];
  member_label text;
  title_text text;
  body_text text;
  is_youth boolean;
begin
  if _club_id is null then
    return 0;
  end if;

  if auth.uid() is null or not public.is_member_of_club(auth.uid(), _club_id) then
    return 0;
  end if;

  for rec in
    select
      m.membership_id,
      m.photo_uploaded_at,
      m.birth_date,
      cm.user_id as member_user_id,
      cm.role::text as member_role,
      nullif(trim(concat_ws(' ', m.first_name, m.last_name)), '') as registry_name,
      nullif(trim(p.display_name), '') as profile_name
    from public.club_member_master_records m
    join public.club_memberships cm on cm.id = m.membership_id
    left join public.profiles p on p.user_id = cm.user_id
    where m.club_id = _club_id
      and m.photo_url is not null
      and m.photo_uploaded_at is not null
      and m.photo_uploaded_at <= (now() - interval '2 years')
      and cm.status = 'active'
      and cm.user_id is not null
  loop
    member_label := coalesce(rec.registry_name, rec.profile_name, 'Member');
    is_youth := (
      rec.birth_date is not null
      and rec.birth_date > (current_date - interval '18 years')
      and lower(rec.member_role) in ('player', 'player_teen', 'player_adult')
    );

    recipient_ids := array[]::uuid[];

    if is_youth then
      select coalesce(array_agg(distinct gcm.user_id), array[]::uuid[])
      into recipient_ids
      from public.club_member_guardian_links gl
      join public.club_memberships gcm on gcm.id = gl.guardian_membership_id
      where gl.club_id = _club_id
        and gl.ward_membership_id = rec.membership_id
        and gcm.status = 'active'
        and gcm.user_id is not null;

      if coalesce(array_length(recipient_ids, 1), 0) = 0 then
        recipient_ids := array[rec.member_user_id];
      end if;

      title_text := 'Renew profile picture';
      body_text := format(
        'The profile picture for %s is older than 2 years and should be renewed.',
        member_label
      );
    else
      recipient_ids := array[rec.member_user_id];
      title_text := 'Renew your profile picture';
      body_text := 'Your club profile picture is older than 2 years and should be renewed.';
    end if;

    foreach recipient in array recipient_ids
    loop
      if exists (
        select 1
        from public.notifications n
        where n.club_id = _club_id
          and n.user_id = recipient
          and n.notification_type = 'photo_renewal'
          and n.reference_id = rec.membership_id
          and n.created_at > (now() - interval '30 days')
      ) then
        continue;
      end if;

      insert into public.notifications (
        club_id,
        user_id,
        title,
        body,
        notification_type,
        reference_id,
        is_read
      ) values (
        _club_id,
        recipient,
        title_text,
        body_text,
        'photo_renewal',
        rec.membership_id,
        false
      );
      inserted_count := inserted_count + 1;
    end loop;
  end loop;

  return inserted_count;
end;
$$;

grant execute on function public.ensure_photo_renewal_notifications(uuid) to authenticated;
