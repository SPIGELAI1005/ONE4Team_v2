-- Member self-service master data, trainer team-scoped edits, audit + notifications.

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create or replace function public.is_trainer_for_member(_user_id uuid, _membership_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.team_players tp
    join public.teams t on t.id = tp.team_id
    where tp.membership_id = _membership_id
      and public.is_trainer_for_team(_user_id, tp.team_id)
  );
$$;

revoke all on function public.is_trainer_for_member(uuid, uuid) from public;
grant execute on function public.is_trainer_for_member(uuid, uuid) to authenticated;

create or replace function public.is_guardian_for_member(_user_id uuid, _membership_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.club_member_guardian_links gl
    join public.club_memberships g
      on g.id = gl.guardian_membership_id
     and g.status = 'active'
     and g.user_id = _user_id
    where gl.ward_membership_id = _membership_id
  );
$$;

revoke all on function public.is_guardian_for_member(uuid, uuid) from public;
grant execute on function public.is_guardian_for_member(uuid, uuid) to authenticated;

create or replace function public.is_own_membership(_user_id uuid, _membership_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.club_memberships cm
    where cm.id = _membership_id
      and cm.user_id = _user_id
      and cm.status = 'active'
  );
$$;

revoke all on function public.is_own_membership(uuid, uuid) from public;
grant execute on function public.is_own_membership(uuid, uuid) to authenticated;

-- Same login email: other active memberships in the club sharing auth.users.email
create or replace function public.shares_login_email_with_membership(_user_id uuid, _membership_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select exists (
    select 1
    from public.club_memberships cm_target
    join auth.users u_target on u_target.id = cm_target.user_id
    join auth.users u_actor on u_actor.id = _user_id
    join public.club_memberships cm_actor
      on cm_actor.user_id = _user_id
     and cm_actor.club_id = cm_target.club_id
     and cm_actor.status = 'active'
    where cm_target.id = _membership_id
      and cm_target.status = 'active'
      and cm_target.user_id is distinct from _user_id
      and lower(trim(coalesce(u_target.email, ''))) <> ''
      and lower(trim(u_target.email)) = lower(trim(u_actor.email))
  );
$$;

revoke all on function public.shares_login_email_with_membership(uuid, uuid) from public;
grant execute on function public.shares_login_email_with_membership(uuid, uuid) to authenticated;

create or replace function public.get_member_master_edit_actor(
  _user_id uuid,
  _membership_id uuid
)
returns text
language plpgsql
stable
security definer
set search_path = public, auth
as $$
declare
  v_club_id uuid;
begin
  if _user_id is null or _membership_id is null then
    return 'none';
  end if;

  select cm.club_id into v_club_id
  from public.club_memberships cm
  where cm.id = _membership_id
    and cm.status = 'active';

  if v_club_id is null then
    return 'none';
  end if;

  if public.can_manage_club_members(_user_id, v_club_id) then
    return 'manager';
  end if;

  if public.is_trainer_for_member(_user_id, _membership_id) then
    return 'trainer';
  end if;

  if public.is_own_membership(_user_id, _membership_id)
     or public.is_guardian_for_member(_user_id, _membership_id)
     or public.shares_login_email_with_membership(_user_id, _membership_id) then
    return 'self';
  end if;

  return 'none';
end;
$$;

revoke all on function public.get_member_master_edit_actor(uuid, uuid) from public;
grant execute on function public.get_member_master_edit_actor(uuid, uuid) to authenticated;

create or replace function public.can_read_member_master_record(_user_id uuid, _membership_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.get_member_master_edit_actor(_user_id, _membership_id) <> 'none';
$$;

revoke all on function public.can_read_member_master_record(uuid, uuid) from public;
grant execute on function public.can_read_member_master_record(uuid, uuid) to authenticated;

create or replace function public.can_edit_member_master_record(_user_id uuid, _membership_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.get_member_master_edit_actor(_user_id, _membership_id) <> 'none';
$$;

revoke all on function public.can_edit_member_master_record(uuid, uuid) from public;
grant execute on function public.can_edit_member_master_record(uuid, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- RLS: read own / trainer / manager paths (writes via RPC)
-- ---------------------------------------------------------------------------

drop policy if exists "club_member_master_select_staff" on public.club_member_master_records;
create policy "club_member_master_select_staff"
  on public.club_member_master_records for select to authenticated
  using (
    public.can_manage_club_members(auth.uid(), club_id)
    or exists (
      select 1 from public.club_memberships cm
      where cm.club_id = club_member_master_records.club_id
        and cm.user_id = auth.uid()
        and cm.status = 'active'
        and cm.role = 'trainer'::public.app_role
    )
    or public.can_read_member_master_record(auth.uid(), membership_id)
  );

drop policy if exists "club_member_guardian_select_staff" on public.club_member_guardian_links;
create policy "club_member_guardian_select_staff"
  on public.club_member_guardian_links for select to authenticated
  using (
    public.can_manage_club_members(auth.uid(), club_id)
    or exists (
      select 1 from public.club_memberships cm
      where cm.club_id = club_member_guardian_links.club_id
        and cm.user_id = auth.uid()
        and cm.status = 'active'
        and cm.role = 'trainer'::public.app_role
    )
    or public.is_own_membership(auth.uid(), guardian_membership_id)
    or public.is_own_membership(auth.uid(), ward_membership_id)
    or public.is_guardian_for_member(auth.uid(), ward_membership_id)
  );

-- ---------------------------------------------------------------------------
-- Internal audit + notifications
-- ---------------------------------------------------------------------------

create or replace function public._insert_member_master_audit_event(
  _club_id uuid,
  _membership_id uuid,
  _event_type text,
  _summary text,
  _detail jsonb,
  _actor_user_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_email text;
begin
  select lower(trim(coalesce(u.email, ''))) into v_email
  from public.club_memberships cm
  join auth.users u on u.id = cm.user_id
  where cm.id = _membership_id;

  insert into public.club_member_audit_events (
    club_id,
    membership_id,
    correlation_email,
    event_type,
    summary,
    detail,
    actor_user_id
  )
  values (
    _club_id,
    _membership_id,
    nullif(v_email, ''),
    _event_type,
    nullif(trim(coalesce(_summary, '')), ''),
    coalesce(_detail, '{}'::jsonb),
    _actor_user_id
  )
  returning id into v_id;

  return v_id;
end;
$$;

create or replace function public._notify_member_master_change(
  _club_id uuid,
  _target_membership_id uuid,
  _actor_kind text,
  _actor_user_id uuid,
  _changed_fields text[]
)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  rec record;
  v_target_user uuid;
  v_target_name text;
  v_actor_name text;
  v_title text;
  v_body text;
  v_field_count integer;
begin
  v_field_count := coalesce(array_length(_changed_fields, 1), 0);

  select cm.user_id,
         coalesce(
           nullif(trim(concat_ws(' ', m.first_name, m.last_name)), ''),
           p.display_name,
           'Member'
         )
  into v_target_user, v_target_name
  from public.club_memberships cm
  left join public.club_member_master_records m on m.membership_id = cm.id
  left join public.profiles p on p.user_id = cm.user_id
  where cm.id = _target_membership_id;

  select coalesce(nullif(trim(display_name), ''), 'Someone')
  into v_actor_name
  from public.profiles
  where user_id = _actor_user_id;

  if _actor_kind = 'self' then
    v_title := 'Member updated their registry data';
    v_body := format(
      '%s updated master data (%s field(s) changed). Review in Members.',
      v_target_name,
      v_field_count
    );

    for rec in
      select distinct cm.user_id as uid
      from public.club_memberships cm
      where cm.club_id = _club_id
        and cm.status = 'active'
        and cm.user_id is not null
        and public.can_manage_club_members(cm.user_id, _club_id)
    loop
      insert into public.notifications (
        club_id, user_id, title, body, notification_type, reference_id
      )
      values (
        _club_id,
        rec.uid,
        v_title,
        v_body,
        'master_data_updated_by_member',
        _target_membership_id
      );
    end loop;

    return;
  end if;

  if _actor_kind = 'trainer' then
    v_title := 'Trainer updated your registry data';
    v_body := format(
      '%s updated master data for %s (%s field(s)). Open My Data to review.',
      v_actor_name,
      v_target_name,
      v_field_count
    );

    if v_target_user is not null then
      insert into public.notifications (
        club_id, user_id, title, body, notification_type, reference_id
      )
      values (
        _club_id,
        v_target_user,
        v_title,
        v_body,
        'master_data_updated_by_trainer',
        _target_membership_id
      );
    end if;

    for rec in
      select distinct cm.user_id as uid
      from public.club_memberships cm
      where cm.club_id = _club_id
        and cm.status = 'active'
        and cm.user_id is not null
        and cm.role::text = 'team_management'
        and cm.user_id is distinct from _actor_user_id
        and cm.user_id is distinct from v_target_user
    loop
      insert into public.notifications (
        club_id, user_id, title, body, notification_type, reference_id
      )
      values (
        _club_id,
        rec.uid,
        format('Trainer updated member registry'),
        format('%s updated master data for %s.', v_actor_name, v_target_name),
        'master_data_updated_by_trainer',
        _target_membership_id
      );
    end loop;

    for rec in
      select distinct cm.user_id as uid
      from public.club_role_assignments cra
      join public.club_memberships cm on cm.id = cra.membership_id
      where cra.club_id = _club_id
        and cra.scope = 'club'
        and cra.role_kind = 'team_management'
        and cm.status = 'active'
        and cm.user_id is not null
        and cm.user_id is distinct from _actor_user_id
        and cm.user_id is distinct from v_target_user
    loop
      insert into public.notifications (
        club_id, user_id, title, body, notification_type, reference_id
      )
      select
        _club_id,
        rec.uid,
        format('Trainer updated member registry'),
        format('%s updated master data for %s.', v_actor_name, v_target_name),
        'master_data_updated_by_trainer',
        _target_membership_id
      where not exists (
        select 1 from public.notifications n
        where n.club_id = _club_id
          and n.user_id = rec.uid
          and n.reference_id = _target_membership_id
          and n.notification_type = 'master_data_updated_by_trainer'
          and n.created_at > now() - interval '1 minute'
      );
    end loop;

    return;
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- List editable memberships for current user
-- ---------------------------------------------------------------------------

create or replace function public.list_editable_member_master_memberships(_club_id uuid)
returns table (
  membership_id uuid,
  club_id uuid,
  display_name text,
  role text,
  team_label text,
  email text,
  edit_actor text,
  relationship text
)
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;
  if not public.is_member_of_club(v_uid, _club_id) then
    raise exception 'Not authorized';
  end if;

  return query
  with candidates as (
    select cm.id as membership_id
    from public.club_memberships cm
    where cm.club_id = _club_id
      and cm.status = 'active'
      and public.can_edit_member_master_record(v_uid, cm.id)
  )
  select
    cm.id,
    cm.club_id,
    coalesce(
      nullif(trim(concat_ws(' ', m.first_name, m.last_name)), ''),
      p.display_name,
      u.email
    ) as display_name,
    cm.role::text,
    coalesce(nullif(trim(cm.team), ''), nullif(trim(cm.age_group), '')) as team_label,
    coalesce(u.email, '') as email,
    public.get_member_master_edit_actor(v_uid, cm.id) as edit_actor,
    case
      when public.is_own_membership(v_uid, cm.id) then 'self'
      when public.is_guardian_for_member(v_uid, cm.id) then 'guardian'
      when public.shares_login_email_with_membership(v_uid, cm.id) then 'household_email'
      when public.is_trainer_for_member(v_uid, cm.id) then 'team_trainer'
      when public.can_manage_club_members(v_uid, cm.club_id) then 'manager'
      else null
    end as relationship
  from candidates c
  join public.club_memberships cm on cm.id = c.membership_id
  left join public.club_member_master_records m on m.membership_id = cm.id
  left join public.profiles p on p.user_id = cm.user_id
  left join auth.users u on u.id = cm.user_id
  order by
    case public.get_member_master_edit_actor(v_uid, cm.id)
      when 'self' then 0
      when 'trainer' then 1
      when 'manager' then 2
      else 3
    end,
    display_name;
end;
$$;

revoke all on function public.list_editable_member_master_memberships(uuid) from public;
grant execute on function public.list_editable_member_master_memberships(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Read bundle for editor
-- ---------------------------------------------------------------------------

create or replace function public.get_member_master_record_for_actor(_membership_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_uid uuid := auth.uid();
  v_actor text;
  v_row record;
  v_master jsonb;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  v_actor := public.get_member_master_edit_actor(v_uid, _membership_id);
  if v_actor = 'none' then
    raise exception 'Not authorized';
  end if;

  select
    cm.id,
    cm.club_id,
    cm.role::text as role,
    coalesce(
      nullif(trim(concat_ws(' ', m.first_name, m.last_name)), ''),
      p.display_name
    ) as display_name,
    coalesce(u.email, '') as email,
    coalesce(nullif(trim(cm.team), ''), nullif(trim(cm.age_group), '')) as team_label
  into v_row
  from public.club_memberships cm
  left join public.club_member_master_records m on m.membership_id = cm.id
  left join public.profiles p on p.user_id = cm.user_id
  left join auth.users u on u.id = cm.user_id
  where cm.id = _membership_id
    and cm.status = 'active';

  if v_row.id is null then
    raise exception 'membership_not_found';
  end if;

  select to_jsonb(m.*) into v_master
  from public.club_member_master_records m
  where m.membership_id = _membership_id;

  return jsonb_build_object(
    'membership_id', v_row.id,
    'club_id', v_row.club_id,
    'role', v_row.role,
    'display_name', v_row.display_name,
    'email', v_row.email,
    'team_label', v_row.team_label,
    'edit_actor', v_actor,
    'master', coalesce(v_master, '{}'::jsonb)
  );
end;
$$;

revoke all on function public.get_member_master_record_for_actor(uuid) from public;
grant execute on function public.get_member_master_record_for_actor(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Save (filtered fields + audit + notifications)
-- ---------------------------------------------------------------------------

create or replace function public.save_member_master_record(
  _membership_id uuid,
  _fields jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_uid uuid := auth.uid();
  v_actor text;
  v_club_id uuid;
  v_existing public.club_member_master_records%rowtype;
  v_payload jsonb := coalesce(_fields, '{}'::jsonb);
  v_filtered jsonb := '{}'::jsonb;
  v_key text;
  v_self_keys text[] := array[
    'first_name','last_name','sex','birth_date','nationality','photo_url','membership_kind',
    'street_line','address_line2','postal_code','city','country',
    'height_cm','weight_kg','strong_leg','strong_hand','shirt_size','shoe_size','jersey_number',
    'emergency_contact_name','emergency_contact_phone',
    'allergies','medical_conditions','medications','medical_notes',
    'bank_account_holder','bank_name','iban'
  ];
  v_trainer_extra text[] := array[
    'role_development_notes','strengths','goals_count',
    'onboarding_progress','team_integration_status','squad_status','last_evaluation_date'
  ];
  v_allowed text[];
  v_changed text[] := '{}'::text[];
  v_result public.club_member_master_records%rowtype;
  v_event_type text;
  v_summary text;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  v_actor := public.get_member_master_edit_actor(v_uid, _membership_id);
  if v_actor = 'none' then
    raise exception 'Not authorized';
  end if;

  select cm.club_id into v_club_id
  from public.club_memberships cm
  where cm.id = _membership_id
    and cm.status = 'active';

  if v_club_id is null then
    raise exception 'membership_not_found';
  end if;

  select * into v_existing
  from public.club_member_master_records m
  where m.membership_id = _membership_id;

  if v_actor = 'manager' then
    v_allowed := array(
      select column_name::text
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'club_member_master_records'
        and column_name not in (
          'membership_id','club_id','created_at','updated_at','photo_uploaded_at'
        )
    );
  elsif v_actor = 'trainer' then
    v_allowed := v_self_keys || v_trainer_extra;
  else
    v_allowed := v_self_keys;
  end if;

  for v_key in select jsonb_object_keys(v_payload)
  loop
    if v_key = any (v_allowed) then
      v_filtered := v_filtered || jsonb_build_object(v_key, v_payload -> v_key);
    end if;
  end loop;

  if v_filtered = '{}'::jsonb then
    raise exception 'no_editable_fields';
  end if;

  insert into public.club_member_master_records (membership_id, club_id)
  values (_membership_id, v_club_id)
  on conflict (membership_id) do nothing;

  update public.club_member_master_records m
  set
    first_name = case when v_filtered ? 'first_name' then nullif(trim(both from v_filtered->>'first_name'), '') else m.first_name end,
    last_name = case when v_filtered ? 'last_name' then nullif(trim(both from v_filtered->>'last_name'), '') else m.last_name end,
    sex = case when v_filtered ? 'sex' then nullif(v_filtered->>'sex', '') else m.sex end,
    birth_date = case when v_filtered ? 'birth_date' then nullif(v_filtered->>'birth_date', '')::date else m.birth_date end,
    nationality = case when v_filtered ? 'nationality' then nullif(trim(both from v_filtered->>'nationality'), '') else m.nationality end,
    photo_url = case when v_filtered ? 'photo_url' then nullif(trim(both from v_filtered->>'photo_url'), '') else m.photo_url end,
    membership_kind = case
      when v_filtered ? 'membership_kind' and v_filtered->>'membership_kind' in ('active_participant', 'supporting_member')
        then v_filtered->>'membership_kind'
      else m.membership_kind
    end,
    street_line = case when v_filtered ? 'street_line' then nullif(trim(both from v_filtered->>'street_line'), '') else m.street_line end,
    address_line2 = case when v_filtered ? 'address_line2' then nullif(trim(both from v_filtered->>'address_line2'), '') else m.address_line2 end,
    postal_code = case when v_filtered ? 'postal_code' then nullif(trim(both from v_filtered->>'postal_code'), '') else m.postal_code end,
    city = case when v_filtered ? 'city' then nullif(trim(both from v_filtered->>'city'), '') else m.city end,
    country = case when v_filtered ? 'country' then nullif(trim(both from v_filtered->>'country'), '') else m.country end,
    height_cm = case when v_filtered ? 'height_cm' then nullif(v_filtered->>'height_cm', '')::smallint else m.height_cm end,
    weight_kg = case when v_filtered ? 'weight_kg' then nullif(v_filtered->>'weight_kg', '')::smallint else m.weight_kg end,
    strong_leg = case when v_filtered ? 'strong_leg' then nullif(v_filtered->>'strong_leg', '') else m.strong_leg end,
    strong_hand = case when v_filtered ? 'strong_hand' then nullif(v_filtered->>'strong_hand', '') else m.strong_hand end,
    shirt_size = case when v_filtered ? 'shirt_size' then nullif(trim(both from v_filtered->>'shirt_size'), '') else m.shirt_size end,
    shoe_size = case when v_filtered ? 'shoe_size' then nullif(trim(both from v_filtered->>'shoe_size'), '') else m.shoe_size end,
    jersey_number = case when v_filtered ? 'jersey_number' then nullif(v_filtered->>'jersey_number', '')::smallint else m.jersey_number end,
    role_development_notes = case when v_filtered ? 'role_development_notes' then nullif(trim(both from v_filtered->>'role_development_notes'), '') else m.role_development_notes end,
    strengths = case when v_filtered ? 'strengths' then nullif(trim(both from v_filtered->>'strengths'), '') else m.strengths end,
    goals_count = case when v_filtered ? 'goals_count' then nullif(v_filtered->>'goals_count', '')::integer else m.goals_count end,
    onboarding_progress = case when v_filtered ? 'onboarding_progress' then nullif(trim(both from v_filtered->>'onboarding_progress'), '') else m.onboarding_progress end,
    team_integration_status = case when v_filtered ? 'team_integration_status' then nullif(trim(both from v_filtered->>'team_integration_status'), '') else m.team_integration_status end,
    squad_status = case when v_filtered ? 'squad_status' then nullif(trim(both from v_filtered->>'squad_status'), '') else m.squad_status end,
    last_evaluation_date = case when v_filtered ? 'last_evaluation_date' then nullif(v_filtered->>'last_evaluation_date', '')::date else m.last_evaluation_date end,
    bank_account_holder = case when v_filtered ? 'bank_account_holder' then nullif(trim(both from v_filtered->>'bank_account_holder'), '') else m.bank_account_holder end,
    bank_name = case when v_filtered ? 'bank_name' then nullif(trim(both from v_filtered->>'bank_name'), '') else m.bank_name end,
    iban = case when v_filtered ? 'iban' then nullif(trim(both from v_filtered->>'iban'), '') else m.iban end,
    emergency_contact_name = case when v_filtered ? 'emergency_contact_name' then nullif(trim(both from v_filtered->>'emergency_contact_name'), '') else m.emergency_contact_name end,
    emergency_contact_phone = case when v_filtered ? 'emergency_contact_phone' then nullif(trim(both from v_filtered->>'emergency_contact_phone'), '') else m.emergency_contact_phone end,
    allergies = case when v_filtered ? 'allergies' then nullif(trim(both from v_filtered->>'allergies'), '') else m.allergies end,
    medical_conditions = case when v_filtered ? 'medical_conditions' then nullif(trim(both from v_filtered->>'medical_conditions'), '') else m.medical_conditions end,
    medications = case when v_filtered ? 'medications' then nullif(trim(both from v_filtered->>'medications'), '') else m.medications end,
    medical_notes = case when v_filtered ? 'medical_notes' then nullif(trim(both from v_filtered->>'medical_notes'), '') else m.medical_notes end,
    internal_club_number = case when v_filtered ? 'internal_club_number' then nullif(trim(both from v_filtered->>'internal_club_number'), '') else m.internal_club_number end,
    invoice_reference = case when v_filtered ? 'invoice_reference' then nullif(trim(both from v_filtered->>'invoice_reference'), '') else m.invoice_reference end,
    player_passport_number = case when v_filtered ? 'player_passport_number' then nullif(trim(both from v_filtered->>'player_passport_number'), '') else m.player_passport_number end,
    club_registration_date = case when v_filtered ? 'club_registration_date' then nullif(v_filtered->>'club_registration_date', '')::date else m.club_registration_date end,
    team_assignment_date = case when v_filtered ? 'team_assignment_date' then nullif(v_filtered->>'team_assignment_date', '')::date else m.team_assignment_date end,
    club_exit_date = case when v_filtered ? 'club_exit_date' then nullif(v_filtered->>'club_exit_date', '')::date else m.club_exit_date end
  where m.membership_id = _membership_id
  returning * into v_result;

  for v_key in select jsonb_object_keys(v_filtered)
  loop
    v_changed := array_append(v_changed, v_key);
  end loop;

  if v_actor = 'self' then
    v_event_type := 'registry_updated_by_member';
    v_summary := 'Member updated their registry data';
  elsif v_actor = 'trainer' then
    v_event_type := 'registry_updated_by_trainer';
    v_summary := 'Trainer updated member registry data';
  else
    v_event_type := 'registry_updated';
    v_summary := 'Registry updated';
  end if;

  perform public._insert_member_master_audit_event(
    v_club_id,
    _membership_id,
    v_event_type,
    v_summary,
    jsonb_build_object('fields', to_jsonb(v_changed), 'actor_kind', v_actor),
    v_uid
  );

  if v_actor in ('self', 'trainer') then
    perform public._notify_member_master_change(
      v_club_id,
      _membership_id,
      v_actor,
      v_uid,
      v_changed
    );
  end if;

  return jsonb_build_object(
    'ok', true,
    'actor', v_actor,
    'record', to_jsonb(v_result)
  );
end;
$$;

revoke all on function public.save_member_master_record(uuid, jsonb) from public;
grant execute on function public.save_member_master_record(uuid, jsonb) to authenticated;

notify pgrst, 'reload schema';
