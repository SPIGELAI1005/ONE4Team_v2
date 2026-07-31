-- Allow Team Management (and club-wide team_staff) to manage club members.
-- Keep is_club_admin narrow (billing/settings/etc.); member ops use can_manage_club_members.

create or replace function public.can_manage_club_members(_user_id uuid, _club_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.is_club_admin(_user_id, _club_id)
    or exists (
      select 1
      from public.club_memberships cm
      where cm.user_id = _user_id
        and cm.club_id = _club_id
        and cm.status = 'active'
        and (
          cm.role::text in ('team_management', 'team_staff', 'staff')
          or exists (
            select 1
            from public.club_role_assignments cra
            where cra.membership_id = cm.id
              and cra.club_id = _club_id
              and cra.scope = 'club'
              and cra.role_kind in ('team_management', 'staff')
          )
        )
    );
$$;

revoke all on function public.can_manage_club_members(uuid, uuid) from public;
grant execute on function public.can_manage_club_members(uuid, uuid) to authenticated;

-- Join / invite reviewers: team management can always review; trainers when policy allows.
create or replace function public.can_review_club_join_requests(
  _user_id uuid,
  _club_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.can_manage_club_members(_user_id, _club_id)
    or exists (
      select 1
      from public.clubs c
      join public.club_memberships cm
        on cm.club_id = c.id
       and cm.user_id = _user_id
       and cm.status = 'active'
       and cm.role = 'trainer'
      where c.id = _club_id
        and c.join_reviewer_policy = 'admin_trainer'
    );
$$;

-- Membership CRUD
drop policy if exists "Admins can view all club memberships" on public.club_memberships;
create policy "Admins can view all club memberships"
  on public.club_memberships for select
  to authenticated
  using (public.can_manage_club_members(auth.uid(), club_id));

drop policy if exists "Admins can add members" on public.club_memberships;
create policy "Admins can add members"
  on public.club_memberships for insert
  to authenticated
  with check (public.can_manage_club_members(auth.uid(), club_id));

drop policy if exists "Admins can update memberships" on public.club_memberships;
create policy "Admins can update memberships"
  on public.club_memberships for update
  to authenticated
  using (public.can_manage_club_members(auth.uid(), club_id));

drop policy if exists "Admins can remove members" on public.club_memberships;
create policy "Admins can remove members"
  on public.club_memberships for delete
  to authenticated
  using (public.can_manage_club_members(auth.uid(), club_id));

-- Saved member drafts
drop policy if exists "club_member_drafts_select_admin" on public.club_member_drafts;
create policy "club_member_drafts_select_admin"
  on public.club_member_drafts for select
  using (public.can_manage_club_members(auth.uid(), club_id));

drop policy if exists "club_member_drafts_insert_admin" on public.club_member_drafts;
create policy "club_member_drafts_insert_admin"
  on public.club_member_drafts for insert
  with check (public.can_manage_club_members(auth.uid(), club_id));

drop policy if exists "club_member_drafts_update_admin" on public.club_member_drafts;
create policy "club_member_drafts_update_admin"
  on public.club_member_drafts for update
  using (public.can_manage_club_members(auth.uid(), club_id))
  with check (public.can_manage_club_members(auth.uid(), club_id));

drop policy if exists "club_member_drafts_delete_admin" on public.club_member_drafts;
create policy "club_member_drafts_delete_admin"
  on public.club_member_drafts for delete
  using (public.can_manage_club_members(auth.uid(), club_id));

-- Master records + guardian links
drop policy if exists "club_member_master_admin_write" on public.club_member_master_records;
create policy "club_member_master_admin_write"
  on public.club_member_master_records for all to authenticated
  using (public.can_manage_club_members(auth.uid(), club_id))
  with check (public.can_manage_club_members(auth.uid(), club_id));

drop policy if exists "club_member_guardian_admin_write" on public.club_member_guardian_links;
create policy "club_member_guardian_admin_write"
  on public.club_member_guardian_links for all to authenticated
  using (public.can_manage_club_members(auth.uid(), club_id))
  with check (public.can_manage_club_members(auth.uid(), club_id));

drop policy if exists "club_member_guardian_select_staff" on public.club_member_guardian_links;
create policy "club_member_guardian_select_staff"
  on public.club_member_guardian_links for select to authenticated
  using (
    public.can_manage_club_members(auth.uid(), club_id)
    or exists (
      select 1
      from public.club_memberships cm
      where cm.club_id = club_member_guardian_links.club_id
        and cm.user_id = auth.uid()
        and cm.status = 'active'
        and cm.role in ('admin'::public.app_role, 'trainer'::public.app_role, 'team_management'::public.app_role)
    )
  );

-- Email helpers used by Members import / roster
create or replace function public.resolve_club_member_emails_to_memberships(
  _club_id uuid,
  _emails text[]
)
returns table (
  email text,
  membership_id uuid,
  user_id uuid
)
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if not public.can_manage_club_members(auth.uid(), _club_id) then
    raise exception 'Only club member managers can resolve member emails';
  end if;

  return query
  with normalized as (
    select distinct lower(trim(value)) as email
    from unnest(coalesce(_emails, array[]::text[])) as value
    where trim(value) <> ''
  )
  select
    n.email,
    cm.id as membership_id,
    cm.user_id
  from normalized n
  join auth.users u on lower(u.email) = n.email
  join public.club_memberships cm
    on cm.user_id = u.id
   and cm.club_id = _club_id
   and cm.status = 'active';
end;
$$;

revoke all on function public.resolve_club_member_emails_to_memberships(uuid, text[]) from public;
grant execute on function public.resolve_club_member_emails_to_memberships(uuid, text[]) to authenticated;

create or replace function public.list_club_membership_emails(_club_id uuid)
returns table (
  membership_id uuid,
  email text
)
language sql
security definer
set search_path = public, auth
as $$
  select
    cm.id as membership_id,
    coalesce(u.email, '') as email
  from public.club_memberships cm
  join auth.users u on u.id = cm.user_id
  where cm.club_id = _club_id
    and cm.status = 'active'
    and public.can_manage_club_members(auth.uid(), _club_id);
$$;

revoke all on function public.list_club_membership_emails(uuid) from public;
grant execute on function public.list_club_membership_emails(uuid) to authenticated;

-- Team coaches: member managers (admins + team management) can assign
drop policy if exists team_coaches_manage_admin on public.team_coaches;
create policy team_coaches_manage_admin
  on public.team_coaches for all
  to authenticated
  using (
    exists (
      select 1 from public.teams t
      where t.id = team_coaches.team_id
        and public.can_manage_club_members(auth.uid(), t.club_id)
    )
  )
  with check (
    exists (
      select 1 from public.teams t
      where t.id = team_coaches.team_id
        and public.can_manage_club_members(auth.uid(), t.club_id)
    )
  );

-- Ensure membership role team_management is recognized for team roster writes
create or replace function public.is_trainer_for_team(_user_id uuid, _team_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.teams t
    join public.club_memberships cm
      on cm.club_id = t.club_id
     and cm.user_id = _user_id
     and cm.status = 'active'
    where t.id = _team_id
      and (
        public.can_manage_club_members(_user_id, t.club_id)
        or cm.role::text in ('trainer', 'team_management')
        or exists (
          select 1
          from public.club_role_assignments cra
          where cra.membership_id = cm.id
            and cra.club_id = t.club_id
            and (
              (cra.role_kind in ('club_admin', 'trainer', 'team_management') and cra.scope = 'club')
              or (
                cra.role_kind in ('trainer', 'team_admin')
                and cra.scope = 'team'
                and cra.scope_team_id = _team_id
              )
            )
        )
        or exists (
          select 1
          from public.team_coaches tc
          where tc.team_id = _team_id
            and tc.membership_id = cm.id
        )
      )
  );
$$;

grant execute on function public.is_trainer_for_team(uuid, uuid) to authenticated;

-- Member audit trail writes for member managers
create or replace function public.append_club_member_audit_event(
  _club_id uuid,
  _membership_id uuid,
  _correlation_email text,
  _draft_id uuid,
  _event_type text,
  _summary text,
  _detail jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_id uuid;
  v_actor uuid := auth.uid();
begin
  if v_actor is null then
    raise exception 'Not authenticated';
  end if;
  if not public.can_manage_club_members(v_actor, _club_id) then
    raise exception 'Not authorized';
  end if;

  insert into public.club_member_audit_events (
    club_id,
    membership_id,
    correlation_email,
    draft_id,
    event_type,
    summary,
    detail,
    actor_user_id
  )
  values (
    _club_id,
    _membership_id,
    case
      when _correlation_email is not null and length(trim(_correlation_email)) > 0
      then lower(trim(_correlation_email))
      else null
    end,
    _draft_id,
    _event_type,
    nullif(trim(coalesce(_summary, '')), ''),
    coalesce(_detail, '{}'::jsonb),
    v_actor
  )
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.append_club_member_audit_event(uuid, uuid, text, uuid, text, text, jsonb) from public;
grant execute on function public.append_club_member_audit_event(uuid, uuid, text, uuid, text, text, jsonb) to authenticated;

drop policy if exists "club_member_audit_events_select_staff" on public.club_member_audit_events;
create policy "club_member_audit_events_select_staff"
  on public.club_member_audit_events for select
  using (
    public.can_manage_club_members(auth.uid(), club_id)
    or public.is_club_trainer(auth.uid(), club_id)
  );

notify pgrst, 'reload schema';
