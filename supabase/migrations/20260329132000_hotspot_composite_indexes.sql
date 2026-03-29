-- ST-007: Composite indexes aligned with dashboard, analytics RPCs, and communication reads.
-- Hotspots: club-scoped lists with sort keys, match child tables by match_id, membership-scoped attendance.
--
-- Each index is created only if the target table exists (partial / legacy databases). Uses EXECUTE so
-- missing tables are not resolved at parse time.

do $idx$
begin
  if to_regclass('public.matches') is not null then
    execute $sql$
      create index if not exists idx_matches_club_status_match_date
      on public.matches (club_id, status, match_date desc nulls last)
    $sql$;
  end if;

  if to_regclass('public.messages') is not null then
    execute $sql$
      create index if not exists idx_messages_club_created_at_desc
      on public.messages (club_id, created_at desc)
    $sql$;
  end if;

  if to_regclass('public.match_events') is not null then
    execute $sql$
      create index if not exists idx_match_events_match_id_membership
      on public.match_events (match_id, membership_id)
      where membership_id is not null
    $sql$;
  end if;

  if to_regclass('public.match_lineups') is not null then
    execute $sql$
      create index if not exists idx_match_lineups_match_id_membership
      on public.match_lineups (match_id, membership_id)
    $sql$;
  end if;

  if to_regclass('public.event_participants') is not null then
    execute $sql$
      create index if not exists idx_event_participants_membership_event
      on public.event_participants (membership_id, event_id)
    $sql$;
  end if;

  if to_regclass('public.events') is not null then
    execute $sql$
      create index if not exists idx_events_club_starts_at
      on public.events (club_id, starts_at desc)
    $sql$;
  end if;

  if to_regclass('public.club_memberships') is not null then
    execute $sql$
      create index if not exists idx_club_memberships_club_status
      on public.club_memberships (club_id, status)
    $sql$;
  end if;

  if to_regclass('public.teams') is not null then
    execute $sql$
      create index if not exists idx_teams_club_id
      on public.teams (club_id)
    $sql$;
  end if;
end
$idx$;
