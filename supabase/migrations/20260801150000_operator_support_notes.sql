-- Internal ONE4Team support notes for operator club detail.
-- Never exposed to club users; all access goes through security-definer RPCs.

create table if not exists public.support_notes (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  author_user_id uuid not null references auth.users(id) on delete restrict,
  author_email text not null,
  note text not null,
  category text not null default 'general',
  visibility text not null default 'internal',
  is_archived boolean not null default false,
  archived_at timestamptz,
  archived_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'support_notes_category_check') then
    alter table public.support_notes
      add constraint support_notes_category_check
      check (category in (
        'general',
        'billing',
        'technical',
        'onboarding',
        'bug',
        'feature_request',
        'contract',
        'pilot'
      ));
  end if;

  if not exists (select 1 from pg_constraint where conname = 'support_notes_visibility_check') then
    alter table public.support_notes
      add constraint support_notes_visibility_check
      check (visibility in ('internal'));
  end if;
end $$;

create index if not exists idx_support_notes_club_created
  on public.support_notes (club_id, created_at desc);

create index if not exists idx_support_notes_club_category
  on public.support_notes (club_id, category, created_at desc);

alter table public.support_notes enable row level security;

drop policy if exists support_notes_no_direct_access on public.support_notes;
create policy support_notes_no_direct_access
on public.support_notes
for all
to authenticated
using (false)
with check (false);

create or replace function public.assert_operator_support_note_write_access()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  current_platform_user jsonb;
  platform_user_role text;
begin
  current_platform_user := public.require_platform_permission('operator.clubs.read');
  platform_user_role := coalesce(current_platform_user ->> 'role', '');

  if platform_user_role not in ('OWNER', 'OPERATOR', 'SUPPORT') then
    raise exception 'Only OWNER, OPERATOR, and SUPPORT can manage support notes';
  end if;

  return current_platform_user;
end;
$$;

create or replace function public.get_operator_club_support_notes(
  _club_id uuid,
  _category text default null,
  _include_archived boolean default false
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  current_platform_user jsonb;
  platform_user_role text;
  result jsonb;
begin
  current_platform_user := public.require_platform_permission('operator.clubs.read');
  platform_user_role := coalesce(current_platform_user ->> 'role', '');

  if not exists (select 1 from public.clubs c where c.id = _club_id) then
    raise exception 'Club not found';
  end if;

  select jsonb_build_object(
    'notes', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', sn.id,
          'club_id', sn.club_id,
          'author_user_id', sn.author_user_id,
          'author_email', sn.author_email,
          'note', sn.note,
          'category', sn.category,
          'visibility', sn.visibility,
          'is_archived', sn.is_archived,
          'archived_at', sn.archived_at,
          'created_at', sn.created_at,
          'updated_at', sn.updated_at,
          'can_edit', (
            not sn.is_archived
            and (
              sn.author_user_id = auth.uid()
              or platform_user_role in ('OWNER', 'OPERATOR')
            )
          ),
          'can_archive', (
            not sn.is_archived
            and platform_user_role = 'OWNER'
          )
        )
        order by sn.created_at desc
      )
      from public.support_notes sn
      where sn.club_id = _club_id
        and (_category is null or trim(_category) = '' or sn.category = trim(_category))
        and (_include_archived or sn.is_archived = false)
    ), '[]'::jsonb),
    'can_create', platform_user_role in ('OWNER', 'OPERATOR', 'SUPPORT'),
    'can_view_archived', platform_user_role = 'OWNER'
  )
  into result;

  return result;
end;
$$;

create or replace function public.create_operator_support_note(
  _club_id uuid,
  _note text,
  _category text default 'general',
  _visibility text default 'internal'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  current_platform_user jsonb;
  normalized_category text := lower(trim(coalesce(_category, 'general')));
  normalized_visibility text := lower(trim(coalesce(_visibility, 'internal')));
  trimmed_note text := trim(coalesce(_note, ''));
  inserted public.support_notes;
begin
  current_platform_user := public.assert_operator_support_note_write_access();

  if not exists (select 1 from public.clubs c where c.id = _club_id) then
    raise exception 'Club not found';
  end if;

  if trimmed_note = '' then
    raise exception 'Support note text is required';
  end if;

  if length(trimmed_note) > 8000 then
    raise exception 'Support note is too long';
  end if;

  if normalized_category not in (
    'general', 'billing', 'technical', 'onboarding', 'bug', 'feature_request', 'contract', 'pilot'
  ) then
    raise exception 'Invalid support note category';
  end if;

  if normalized_visibility <> 'internal' then
    raise exception 'Support notes must remain internal';
  end if;

  insert into public.support_notes (
    club_id,
    author_user_id,
    author_email,
    note,
    category,
    visibility
  )
  values (
    _club_id,
    auth.uid(),
    coalesce(current_platform_user ->> 'email', 'unknown@operator'),
    trimmed_note,
    normalized_category,
    normalized_visibility
  )
  returning * into inserted;

  perform public.append_audit_log(
    'SUPPORT_NOTE_CREATED',
    'support_note',
    inserted.id::text,
    _club_id,
    null,
    jsonb_build_object(
      'category', inserted.category,
      'visibility', inserted.visibility,
      'note_preview', left(inserted.note, 240)
    ),
    null,
    null,
    null
  );

  return jsonb_build_object(
    'id', inserted.id,
    'club_id', inserted.club_id,
    'author_user_id', inserted.author_user_id,
    'author_email', inserted.author_email,
    'note', inserted.note,
    'category', inserted.category,
    'visibility', inserted.visibility,
    'is_archived', inserted.is_archived,
    'created_at', inserted.created_at,
    'updated_at', inserted.updated_at
  );
end;
$$;

create or replace function public.update_operator_support_note(
  _note_id uuid,
  _note text,
  _category text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  current_platform_user jsonb;
  platform_user_role text;
  existing public.support_notes;
  normalized_category text;
  trimmed_note text := trim(coalesce(_note, ''));
  updated public.support_notes;
begin
  current_platform_user := public.assert_operator_support_note_write_access();
  platform_user_role := coalesce(current_platform_user ->> 'role', '');

  select * into existing
  from public.support_notes sn
  where sn.id = _note_id;

  if existing.id is null then
    raise exception 'Support note not found';
  end if;

  if existing.is_archived then
    raise exception 'Archived support notes cannot be edited';
  end if;

  if existing.author_user_id <> auth.uid() and platform_user_role not in ('OWNER', 'OPERATOR') then
    raise exception 'You can only edit your own support notes';
  end if;

  if trimmed_note = '' then
    raise exception 'Support note text is required';
  end if;

  if length(trimmed_note) > 8000 then
    raise exception 'Support note is too long';
  end if;

  normalized_category := lower(trim(coalesce(_category, existing.category)));
  if normalized_category not in (
    'general', 'billing', 'technical', 'onboarding', 'bug', 'feature_request', 'contract', 'pilot'
  ) then
    raise exception 'Invalid support note category';
  end if;

  update public.support_notes
  set
    note = trimmed_note,
    category = normalized_category,
    updated_at = now()
  where id = _note_id
  returning * into updated;

  perform public.append_audit_log(
    'SUPPORT_NOTE_UPDATED',
    'support_note',
    updated.id::text,
    updated.club_id,
    jsonb_build_object(
      'category', existing.category,
      'note_preview', left(existing.note, 240)
    ),
    jsonb_build_object(
      'category', updated.category,
      'note_preview', left(updated.note, 240)
    ),
    null,
    null,
    null
  );

  return jsonb_build_object(
    'id', updated.id,
    'club_id', updated.club_id,
    'author_user_id', updated.author_user_id,
    'author_email', updated.author_email,
    'note', updated.note,
    'category', updated.category,
    'visibility', updated.visibility,
    'is_archived', updated.is_archived,
    'created_at', updated.created_at,
    'updated_at', updated.updated_at
  );
end;
$$;

create or replace function public.archive_operator_support_note(_note_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  current_platform_user jsonb;
  platform_user_role text;
  existing public.support_notes;
  updated public.support_notes;
begin
  current_platform_user := public.require_platform_permission('operator.clubs.read');
  platform_user_role := coalesce(current_platform_user ->> 'role', '');

  if platform_user_role <> 'OWNER' then
    raise exception 'Only OWNER can archive support notes';
  end if;

  select * into existing
  from public.support_notes sn
  where sn.id = _note_id;

  if existing.id is null then
    raise exception 'Support note not found';
  end if;

  if existing.is_archived then
    return jsonb_build_object('id', existing.id, 'is_archived', true);
  end if;

  update public.support_notes
  set
    is_archived = true,
    archived_at = now(),
    archived_by = auth.uid(),
    updated_at = now()
  where id = _note_id
  returning * into updated;

  perform public.append_audit_log(
    'SUPPORT_NOTE_ARCHIVED',
    'support_note',
    updated.id::text,
    updated.club_id,
    jsonb_build_object(
      'category', existing.category,
      'note_preview', left(existing.note, 240)
    ),
    jsonb_build_object('is_archived', true),
    null,
    null,
    null
  );

  return jsonb_build_object(
    'id', updated.id,
    'club_id', updated.club_id,
    'is_archived', updated.is_archived,
    'archived_at', updated.archived_at
  );
end;
$$;

revoke all on function public.assert_operator_support_note_write_access() from public;
revoke all on function public.get_operator_club_support_notes(uuid, text, boolean) from public;
revoke all on function public.create_operator_support_note(uuid, text, text, text) from public;
revoke all on function public.update_operator_support_note(uuid, text, text) from public;
revoke all on function public.archive_operator_support_note(uuid) from public;

grant execute on function public.get_operator_club_support_notes(uuid, text, boolean) to authenticated;
grant execute on function public.create_operator_support_note(uuid, text, text, text) to authenticated;
grant execute on function public.update_operator_support_note(uuid, text, text) to authenticated;
grant execute on function public.archive_operator_support_note(uuid) to authenticated;
