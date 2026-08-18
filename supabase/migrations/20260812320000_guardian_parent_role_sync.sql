-- Guardians are parents in ONE4Team: linking someone as guardian grants the parent role
-- so they receive family-scoped Members access, attendance RSVP, and related parent flows.

create or replace function public.ensure_guardian_parent_role(_membership_id uuid, _club_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
begin
  select cm.role::text
  into v_role
  from public.club_memberships cm
  where cm.id = _membership_id
    and cm.club_id = _club_id
    and cm.status = 'active';

  if v_role is null then
    return;
  end if;

  if not exists (
    select 1
    from public.club_role_assignments cra
    where cra.membership_id = _membership_id
      and cra.club_id = _club_id
      and cra.role_kind = 'parent'
      and cra.scope = 'club'
  ) then
    insert into public.club_role_assignments (club_id, membership_id, role_kind, scope, scope_team_id)
    values (_club_id, _membership_id, 'parent', 'club'::public.club_role_scope, null::uuid);
  end if;

  -- Promote generic membership labels; keep trainer/admin/player labels intact.
  if v_role in ('member', 'fan', 'supporter') then
    update public.club_memberships
    set role = 'parent'::public.app_role
    where id = _membership_id
      and club_id = _club_id
      and role::text = v_role;
  end if;
end;
$$;

revoke all on function public.ensure_guardian_parent_role(uuid, uuid) from public;
grant execute on function public.ensure_guardian_parent_role(uuid, uuid) to authenticated;

create or replace function public.trg_guardian_link_ensure_parent_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.ensure_guardian_parent_role(new.guardian_membership_id, new.club_id);
  return new;
end;
$$;

drop trigger if exists trg_club_member_guardian_link_parent_role on public.club_member_guardian_links;
create trigger trg_club_member_guardian_link_parent_role
  after insert on public.club_member_guardian_links
  for each row execute function public.trg_guardian_link_ensure_parent_role();

-- Backfill existing guardian links.
insert into public.club_role_assignments (club_id, membership_id, role_kind, scope, scope_team_id)
select distinct gl.club_id, gl.guardian_membership_id, 'parent', 'club'::public.club_role_scope, null::uuid
from public.club_member_guardian_links gl
join public.club_memberships cm
  on cm.id = gl.guardian_membership_id
 and cm.club_id = gl.club_id
 and cm.status = 'active'
where not exists (
  select 1
  from public.club_role_assignments cra
  where cra.membership_id = gl.guardian_membership_id
    and cra.club_id = gl.club_id
    and cra.role_kind = 'parent'
    and cra.scope = 'club'
);

update public.club_memberships cm
set role = 'parent'::public.app_role
where cm.status = 'active'
  and cm.role::text in ('member', 'fan', 'supporter')
  and exists (
    select 1
    from public.club_member_guardian_links gl
    where gl.guardian_membership_id = cm.id
      and gl.club_id = cm.club_id
  );
