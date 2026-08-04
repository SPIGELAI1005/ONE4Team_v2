-- Fix /my-data self-save for members (incl. player role) and sync login display name.
-- Re-applies scoped membership list + self-first edit actor (20260810120000 was overwritten by 20260809180000).

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

  if public.can_manage_club_members(_user_id, v_club_id)
     and not public.is_own_membership(_user_id, _membership_id) then
    return 'manager';
  end if;

  if public.is_own_membership(_user_id, _membership_id)
     or public.is_guardian_for_member(_user_id, _membership_id)
     or public.shares_login_email_with_membership(_user_id, _membership_id) then
    return 'self';
  end if;

  if public.is_trainer_for_member(_user_id, _membership_id) then
    return 'trainer';
  end if;

  if public.can_manage_club_members(_user_id, v_club_id) then
    return 'manager';
  end if;

  return 'none';
end;
$$;

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
      and (
        public.is_own_membership(v_uid, cm.id)
        or public.is_guardian_for_member(v_uid, cm.id)
        or public.shares_login_email_with_membership(v_uid, cm.id)
        or public.is_trainer_for_member(v_uid, cm.id)
      )
  )
  select
    cm.id::uuid,
    cm.club_id::uuid,
    coalesce(
      nullif(trim(concat_ws(' ', m.first_name, m.last_name)), ''),
      p.display_name,
      u.email
    )::text as display_name,
    cm.role::text,
    coalesce(nullif(trim(cm.team), ''), nullif(trim(cm.age_group), ''))::text as team_label,
    coalesce(u.email, '')::text as email,
    public.get_member_master_edit_actor(v_uid, cm.id)::text as edit_actor,
    (case
      when public.is_own_membership(v_uid, cm.id) then 'self'
      when public.is_guardian_for_member(v_uid, cm.id) then 'guardian'
      when public.shares_login_email_with_membership(v_uid, cm.id) then 'household_email'
      when public.is_trainer_for_member(v_uid, cm.id) then 'team_trainer'
      when public.can_manage_club_members(v_uid, cm.club_id) then 'manager'
      else null
    end)::text as relationship
  from candidates c
  join public.club_memberships cm on cm.id = c.membership_id
  left join public.club_member_master_records m on m.membership_id = cm.id
  left join public.profiles p on p.user_id = cm.user_id
  left join auth.users u on u.id = cm.user_id
  order by
    case
      when public.is_own_membership(v_uid, cm.id) then 0
      when public.is_guardian_for_member(v_uid, cm.id) then 1
      when public.shares_login_email_with_membership(v_uid, cm.id) then 2
      else 3
    end,
    coalesce(
      nullif(trim(concat_ws(' ', m.first_name, m.last_name)), ''),
      p.display_name,
      u.email
    ) asc nulls last;
end;
$$;

-- Sync profiles.display_name when members save their own registry identity.
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
  v_display_name text;
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
    v_display_name := nullif(trim(concat_ws(' ', v_result.first_name, v_result.last_name)), '');
    if v_display_name is not null then
      update public.profiles p
      set display_name = v_display_name
      from public.club_memberships cm
      where cm.id = _membership_id
        and cm.user_id = v_uid
        and p.user_id = v_uid;
    end if;
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

notify pgrst, 'reload schema';
