-- PROD-007 / P12-050d: merge club_member_drafts.master_data into club_member_master_records on invite redeem.
-- Also: admin week helpers unchanged (client-side). Keep guardian + membership upsert behavior from 20260731160000.

create or replace function public.redeem_club_invite(_token text)
returns table (
  club_id uuid,
  role public.app_role
)
language plpgsql
security definer
set search_path = public, extensions
as $$
#variable_conflict use_column
declare
  v_hash text;
  v_inv public.club_invites%rowtype;
  v_user_id uuid;
  v_email text;
  v_team text;
  v_age_group text;
  v_position text;
  v_ward_id uuid;
  v_guardian_text text;
  v_draft public.club_member_drafts%rowtype;
  v_md jsonb;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if _token is null or length(trim(_token)) < 10 then
    raise exception 'Invalid token';
  end if;

  v_hash := encode(extensions.digest(_token, 'sha256'), 'hex');

  select * into v_inv
  from public.club_invites
  where token_hash = v_hash
  limit 1;

  if not found then
    raise exception 'Invite not found';
  end if;

  if v_inv.used_at is not null then
    raise exception 'Invite already used';
  end if;

  if v_inv.expires_at is not null and v_inv.expires_at <= now() then
    raise exception 'Invite expired';
  end if;

  if v_inv.email is not null then
    v_email := lower(coalesce(auth.jwt() ->> 'email', ''));
    if v_email = '' or v_email <> lower(v_inv.email) then
      raise exception 'Invite email mismatch';
    end if;
  end if;

  v_team := nullif(trim(coalesce(v_inv.invite_payload ->> 'team', '')), '');
  v_age_group := nullif(trim(coalesce(v_inv.invite_payload ->> 'age_group', '')), '');
  v_position := nullif(trim(coalesce(v_inv.invite_payload ->> 'position', '')), '');

  update public.club_memberships cm
  set
    role = v_inv.role,
    status = 'active',
    team = coalesce(v_team, cm.team),
    age_group = coalesce(v_age_group, cm.age_group),
    position = coalesce(v_position, cm.position),
    updated_at = now()
  where cm.club_id = v_inv.club_id
    and cm.user_id = v_user_id;

  if not found then
    begin
      insert into public.club_memberships (
        club_id,
        user_id,
        role,
        status,
        team,
        age_group,
        position
      )
      values (
        v_inv.club_id,
        v_user_id,
        v_inv.role,
        'active',
        v_team,
        v_age_group,
        v_position
      );
    exception
      when unique_violation then
        update public.club_memberships cm
        set
          role = v_inv.role,
          status = 'active',
          team = coalesce(v_team, cm.team),
          age_group = coalesce(v_age_group, cm.age_group),
          position = coalesce(v_position, cm.position),
          updated_at = now()
        where cm.club_id = v_inv.club_id
          and cm.user_id = v_user_id
          and cm.role = v_inv.role;
    end;
  end if;

  select cm.id into v_ward_id
  from public.club_memberships cm
  where cm.club_id = v_inv.club_id
    and cm.user_id = v_user_id
  order by cm.updated_at desc nulls last, cm.created_at desc
  limit 1;

  if v_ward_id is not null
     and jsonb_typeof(coalesce(v_inv.invite_payload -> 'guardian_membership_ids', '[]'::jsonb)) = 'array'
  then
    for v_guardian_text in
      select trim(t.elem)
      from jsonb_array_elements_text(
        coalesce(v_inv.invite_payload -> 'guardian_membership_ids', '[]'::jsonb)
      ) as t(elem)
    loop
      if v_guardian_text is null or length(v_guardian_text) = 0 then
        continue;
      end if;
      begin
        insert into public.club_member_guardian_links (
          club_id,
          guardian_membership_id,
          ward_membership_id,
          relationship
        )
        values (
          v_inv.club_id,
          v_guardian_text::uuid,
          v_ward_id,
          'guardian'
        )
        on conflict (club_id, guardian_membership_id, ward_membership_id) do nothing;
      exception
        when invalid_text_representation then
          null;
        when foreign_key_violation then
          null;
      end;
    end loop;
  end if;

  -- Merge draft master_data → club_member_master_records (P12-050d)
  if v_ward_id is not null then
    select * into v_draft
    from public.club_member_drafts d
    where d.club_id = v_inv.club_id
      and d.invite_id = v_inv.id
    order by d.updated_at desc nulls last
    limit 1;

    if found then
      v_md := coalesce(v_draft.master_data, '{}'::jsonb);
      -- Drop draft-only keys
      v_md := v_md - '__draft_guardian_membership_ids';

      insert into public.club_member_master_records (
        membership_id,
        club_id,
        first_name,
        last_name,
        sex,
        birth_date,
        street_line,
        address_line2,
        postal_code,
        city,
        country,
        membership_kind,
        photo_url,
        bank_account_holder,
        bank_name,
        iban,
        height_cm,
        weight_kg,
        strong_leg,
        strong_hand,
        shirt_size,
        shoe_size,
        jersey_number,
        role_development_notes,
        strengths,
        goals_count,
        club_registration_date,
        team_assignment_date,
        club_exit_date,
        invoice_reference,
        player_passport_number,
        internal_club_number,
        emergency_contact_name,
        emergency_contact_phone,
        allergies,
        medical_conditions,
        medications,
        medical_notes,
        nationality,
        onboarding_progress,
        team_integration_status,
        squad_status,
        last_evaluation_date
      )
      values (
        v_ward_id,
        v_inv.club_id,
        nullif(trim(coalesce(v_md ->> 'first_name', '')), ''),
        nullif(trim(coalesce(v_md ->> 'last_name', '')), ''),
        case
          when (v_md ->> 'sex') in ('male', 'female', 'other', 'prefer_not_to_say') then (v_md ->> 'sex')
          else null
        end,
        nullif(trim(coalesce(v_md ->> 'birth_date', '')), '')::date,
        nullif(trim(coalesce(v_md ->> 'street_line', '')), ''),
        nullif(trim(coalesce(v_md ->> 'address_line2', '')), ''),
        nullif(trim(coalesce(v_md ->> 'postal_code', '')), ''),
        nullif(trim(coalesce(v_md ->> 'city', '')), ''),
        nullif(trim(coalesce(v_md ->> 'country', '')), ''),
        coalesce(nullif(trim(coalesce(v_md ->> 'membership_kind', '')), ''), 'active_participant'),
        nullif(trim(coalesce(v_md ->> 'photo_url', '')), ''),
        nullif(trim(coalesce(v_md ->> 'bank_account_holder', '')), ''),
        nullif(trim(coalesce(v_md ->> 'bank_name', '')), ''),
        nullif(trim(coalesce(v_md ->> 'iban', '')), ''),
        nullif(trim(coalesce(v_md ->> 'height_cm', '')), '')::int,
        nullif(trim(coalesce(v_md ->> 'weight_kg', '')), '')::numeric,
        nullif(trim(coalesce(v_md ->> 'strong_leg', '')), ''),
        nullif(trim(coalesce(v_md ->> 'strong_hand', '')), ''),
        nullif(trim(coalesce(v_md ->> 'shirt_size', '')), ''),
        nullif(trim(coalesce(v_md ->> 'shoe_size', '')), ''),
        nullif(trim(coalesce(v_md ->> 'jersey_number', '')), '')::int,
        nullif(trim(coalesce(v_md ->> 'role_development_notes', '')), ''),
        nullif(trim(coalesce(v_md ->> 'strengths', '')), ''),
        nullif(trim(coalesce(v_md ->> 'goals_count', '')), '')::int,
        nullif(trim(coalesce(v_md ->> 'club_registration_date', '')), '')::date,
        nullif(trim(coalesce(v_md ->> 'team_assignment_date', '')), '')::date,
        nullif(trim(coalesce(v_md ->> 'club_exit_date', '')), '')::date,
        nullif(trim(coalesce(v_md ->> 'invoice_reference', '')), ''),
        nullif(trim(coalesce(v_md ->> 'player_passport_number', '')), ''),
        nullif(trim(coalesce(v_md ->> 'internal_club_number', '')), ''),
        nullif(trim(coalesce(v_md ->> 'emergency_contact_name', '')), ''),
        nullif(trim(coalesce(v_md ->> 'emergency_contact_phone', '')), ''),
        nullif(trim(coalesce(v_md ->> 'allergies', '')), ''),
        nullif(trim(coalesce(v_md ->> 'medical_conditions', '')), ''),
        nullif(trim(coalesce(v_md ->> 'medications', '')), ''),
        nullif(trim(coalesce(v_md ->> 'medical_notes', '')), ''),
        nullif(trim(coalesce(v_md ->> 'nationality', '')), ''),
        nullif(trim(coalesce(v_md ->> 'onboarding_progress', '')), ''),
        nullif(trim(coalesce(v_md ->> 'team_integration_status', '')), ''),
        nullif(trim(coalesce(v_md ->> 'squad_status', '')), ''),
        nullif(trim(coalesce(v_md ->> 'last_evaluation_date', '')), '')::date
      )
      on conflict (membership_id) do update set
        first_name = coalesce(excluded.first_name, club_member_master_records.first_name),
        last_name = coalesce(excluded.last_name, club_member_master_records.last_name),
        sex = coalesce(excluded.sex, club_member_master_records.sex),
        birth_date = coalesce(excluded.birth_date, club_member_master_records.birth_date),
        street_line = coalesce(excluded.street_line, club_member_master_records.street_line),
        address_line2 = coalesce(excluded.address_line2, club_member_master_records.address_line2),
        postal_code = coalesce(excluded.postal_code, club_member_master_records.postal_code),
        city = coalesce(excluded.city, club_member_master_records.city),
        country = coalesce(excluded.country, club_member_master_records.country),
        membership_kind = coalesce(excluded.membership_kind, club_member_master_records.membership_kind),
        photo_url = coalesce(excluded.photo_url, club_member_master_records.photo_url),
        bank_account_holder = coalesce(excluded.bank_account_holder, club_member_master_records.bank_account_holder),
        bank_name = coalesce(excluded.bank_name, club_member_master_records.bank_name),
        iban = coalesce(excluded.iban, club_member_master_records.iban),
        height_cm = coalesce(excluded.height_cm, club_member_master_records.height_cm),
        weight_kg = coalesce(excluded.weight_kg, club_member_master_records.weight_kg),
        strong_leg = coalesce(excluded.strong_leg, club_member_master_records.strong_leg),
        strong_hand = coalesce(excluded.strong_hand, club_member_master_records.strong_hand),
        shirt_size = coalesce(excluded.shirt_size, club_member_master_records.shirt_size),
        shoe_size = coalesce(excluded.shoe_size, club_member_master_records.shoe_size),
        jersey_number = coalesce(excluded.jersey_number, club_member_master_records.jersey_number),
        role_development_notes = coalesce(excluded.role_development_notes, club_member_master_records.role_development_notes),
        strengths = coalesce(excluded.strengths, club_member_master_records.strengths),
        goals_count = coalesce(excluded.goals_count, club_member_master_records.goals_count),
        club_registration_date = coalesce(excluded.club_registration_date, club_member_master_records.club_registration_date),
        team_assignment_date = coalesce(excluded.team_assignment_date, club_member_master_records.team_assignment_date),
        club_exit_date = coalesce(excluded.club_exit_date, club_member_master_records.club_exit_date),
        invoice_reference = coalesce(excluded.invoice_reference, club_member_master_records.invoice_reference),
        player_passport_number = coalesce(excluded.player_passport_number, club_member_master_records.player_passport_number),
        internal_club_number = coalesce(excluded.internal_club_number, club_member_master_records.internal_club_number),
        emergency_contact_name = coalesce(excluded.emergency_contact_name, club_member_master_records.emergency_contact_name),
        emergency_contact_phone = coalesce(excluded.emergency_contact_phone, club_member_master_records.emergency_contact_phone),
        allergies = coalesce(excluded.allergies, club_member_master_records.allergies),
        medical_conditions = coalesce(excluded.medical_conditions, club_member_master_records.medical_conditions),
        medications = coalesce(excluded.medications, club_member_master_records.medications),
        medical_notes = coalesce(excluded.medical_notes, club_member_master_records.medical_notes),
        nationality = coalesce(excluded.nationality, club_member_master_records.nationality),
        onboarding_progress = coalesce(excluded.onboarding_progress, club_member_master_records.onboarding_progress),
        team_integration_status = coalesce(excluded.team_integration_status, club_member_master_records.team_integration_status),
        squad_status = coalesce(excluded.squad_status, club_member_master_records.squad_status),
        last_evaluation_date = coalesce(excluded.last_evaluation_date, club_member_master_records.last_evaluation_date),
        updated_at = now();

      update public.club_member_drafts
      set status = 'joined', updated_at = now()
      where id = v_draft.id;
    end if;
  end if;

  update public.club_invites
  set used_at = now()
  where id = v_inv.id;

  return query
  select v_inv.club_id, v_inv.role;
end;
$$;

revoke all on function public.redeem_club_invite(text) from public;
grant execute on function public.redeem_club_invite(text) to authenticated;
