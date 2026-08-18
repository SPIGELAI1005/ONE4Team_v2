/**
 * Public ICS calendar feed for Wave 7.
 * Auth: opaque token in query/path only (no JWT / session cookie).
 * Deploy with JWT verification disabled: `supabase functions deploy calendar-ics --no-verify-jwt`
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.3";
import { edgeCorsHeaders } from "../_shared/cors.ts";
import {
  buildIcsCalendar,
  extractCalendarToken,
  hashCalendarToken,
  type IcsActivityRow,
} from "../_shared/calendar_ics.ts";

const MAX_EVENTS = 500;
const LOOKBACK_DAYS = 30;
const LOOKAHEAD_DAYS = 180;

function notFound(cors: Record<string, string>) {
  return new Response("Not found", {
    status: 404,
    headers: { ...cors, "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
  });
}

serve(async (req) => {
  const cors = edgeCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: cors });
  }
  if (req.method !== "GET" && req.method !== "HEAD") {
    return new Response("Method not allowed", {
      status: 405,
      headers: { ...cors, "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  const token = extractCalendarToken(req);
  if (!token || token.length < 32) {
    return notFound(cors);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!supabaseUrl || !serviceKey) {
    return new Response("Service unavailable", {
      status: 503,
      headers: { ...cors, "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  const admin = createClient(supabaseUrl, serviceKey);
  const tokenHash = await hashCalendarToken(token);

  const { data: resolved, error: resolveError } = await admin.rpc(
    "resolve_calendar_subscription_for_ics",
    { _token_hash: tokenHash },
  );

  if (resolveError) {
    console.error("calendar-ics resolve:", resolveError.message);
    return notFound(cors);
  }

  const row = (resolved ?? {}) as Record<string, unknown>;
  if (!row.ok) {
    return notFound(cors);
  }

  const clubId = String(row.club_id ?? "");
  const membershipId = String(row.membership_id ?? "");
  const scope = String(row.scope ?? "club");
  const teamId = row.team_id != null ? String(row.team_id) : null;
  const clubName = String(row.club_name ?? "ONE4Team");
  const label = row.label != null ? String(row.label) : "";

  if (!clubId) return notFound(cors);

  const now = Date.now();
  const fromIso = new Date(now - LOOKBACK_DAYS * 86_400_000).toISOString();
  const toIso = new Date(now + LOOKAHEAD_DAYS * 86_400_000).toISOString();

  let query = admin
    .from("activities")
    .select("id, title, starts_at, ends_at, location, type, team_id")
    .eq("club_id", clubId)
    .gte("starts_at", fromIso)
    .lte("starts_at", toIso)
    .order("starts_at", { ascending: true })
    .limit(MAX_EVENTS);

  if (scope === "team" && teamId) {
    query = query.eq("team_id", teamId);
  }

  const { data: acts, error: actsError } = await query;
  if (actsError) {
    console.error("calendar-ics activities:", actsError.message);
    return notFound(cors);
  }

  let activities = (acts ?? []) as Array<IcsActivityRow & { team_id?: string | null }>;

  if (scope === "self" && membershipId) {
    const { data: guardianRows } = await admin
      .from("club_member_guardian_links")
      .select("ward_membership_id")
      .eq("club_id", clubId)
      .eq("guardian_membership_id", membershipId);
    const familyMembershipIds = [
      membershipId,
      ...(guardianRows ?? []).map((row: { ward_membership_id: string }) => row.ward_membership_id),
    ];

    const { data: roster } = await admin
      .from("team_players")
      .select("team_id")
      .in("membership_id", familyMembershipIds);
    const teamIds = new Set((roster ?? []).map((r: { team_id: string }) => r.team_id));

    const { data: attRows } = await admin
      .from("activity_attendance")
      .select("activity_id")
      .eq("club_id", clubId)
      .in("membership_id", familyMembershipIds);
    const attIds = new Set((attRows ?? []).map((r: { activity_id: string }) => r.activity_id));

    activities = activities.filter(
      (a) => (a.team_id && teamIds.has(a.team_id)) || attIds.has(a.id),
    );
  }

  const calendarName = label
    ? `${clubName} — ${label}`
    : scope === "team"
      ? `${clubName} (team)`
      : scope === "self"
        ? `${clubName} (my schedule)`
        : clubName;

  const ics = buildIcsCalendar({
    calendarName,
    activities: activities.map((a) => ({
      id: a.id,
      title: a.title,
      starts_at: a.starts_at,
      ends_at: a.ends_at,
      location: a.location,
      type: a.type,
    })),
  });

  const headers = {
    ...cors,
    "Content-Type": "text/calendar; charset=utf-8",
    "Content-Disposition": 'attachment; filename="one4team.ics"',
    "Cache-Control": "private, max-age=300",
  };

  if (req.method === "HEAD") {
    return new Response(null, { status: 200, headers });
  }

  return new Response(ics, { status: 200, headers });
});
