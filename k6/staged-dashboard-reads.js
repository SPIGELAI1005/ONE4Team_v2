/**
 * Staged read load against PostgREST (dashboard-style fan-out).
 *
 * Validates: club-scoped list endpoints under rising concurrency (RLS + pool pressure).
 * Complements k6/smoke.js and k6/journeys-critical.js with explicit stages and stricter thresholds.
 *
 * Env:
 *   SUPABASE_URL, SUPABASE_ANON_KEY, SB_JWT, CLUB_ID  (same as smoke.js)
 *
 * Example:
 *   k6 run k6/staged-dashboard-reads.js
 *
 * Stages approximate: warm-up → 100 concurrent readers → spike → cool-down.
 * Adjust stages via K6_STAGES_JSON if needed (optional extension).
 */

import http from "k6/http";
import { check, group, sleep } from "k6";

export const options = {
  stages: [
    { duration: "30s", target: 10 },
    { duration: "1m", target: 50 },
    { duration: "30s", target: 100 },
    { duration: "1m", target: 100 },
    { duration: "30s", target: 0 },
  ],
  thresholds: {
    http_req_failed: ["rate<0.05"],
    http_req_duration: ["p(95)<5000", "p(99)<12000"],
  },
};

function authHeaders(anon, token) {
  return {
    apikey: anon,
    authorization: `Bearer ${token}`,
  };
}

export default function () {
  const base = (__ENV.SUPABASE_URL || "").replace(/\/+$/, "");
  const anon = __ENV.SUPABASE_ANON_KEY || "";
  const token = __ENV.SB_JWT || "";
  const clubId = __ENV.CLUB_ID || "";

  if (!base || !anon || !token || !clubId) {
    console.error("Missing SUPABASE_URL, SUPABASE_ANON_KEY, SB_JWT, or CLUB_ID");
    return;
  }

  const h = authHeaders(anon, token);

  group("dashboard_parallel_reads", () => {
    const teams = http.get(
      `${base}/rest/v1/teams?club_id=eq.${clubId}&select=id,name,sport&limit=100`,
      { headers: h, tags: { name: "teams" } },
    );
    check(teams, { "teams ok": (r) => r.status === 200 });

    const events = http.get(
      `${base}/rest/v1/events?club_id=eq.${clubId}&select=id,title,starts_at&order=starts_at.desc&limit=50`,
      { headers: h, tags: { name: "events" } },
    );
    check(events, { "events ok": (r) => r.status === 200 });

    const members = http.get(
      `${base}/rest/v1/club_memberships?club_id=eq.${clubId}&select=id,user_id,role,status&limit=200`,
      { headers: h, tags: { name: "memberships" } },
    );
    check(members, { "memberships ok": (r) => r.status === 200 });

    const messages = http.get(
      `${base}/rest/v1/messages?club_id=eq.${clubId}&select=id,created_at&order=created_at.desc,id.desc&limit=50`,
      { headers: h, tags: { name: "messages" } },
    );
    check(messages, {
      "messages ok or missing table": (r) => r.status === 200 || r.status === 404,
    });

    const matchesPaged = http.get(
      `${base}/rest/v1/matches?club_id=eq.${clubId}&select=id,match_date&order=match_date.desc,id.desc&limit=20`,
      { headers: h, tags: { name: "matches_keyset_window" } },
    );
    check(matchesPaged, { "matches paged ok": (r) => r.status === 200 });

    const rpcHeaders = { ...h, "Content-Type": "application/json", Prefer: "return=minimal" };
    const seasonAwards = http.post(
      `${base}/rest/v1/rpc/get_season_award_winners`,
      JSON.stringify({ _club_id: clubId }),
      { headers: rpcHeaders, tags: { name: "rpc_season_awards" } },
    );
    check(seasonAwards, {
      "season awards rpc ok": (r) => r.status === 200 || r.status === 404,
    });
  });

  sleep(0.3 + Math.random() * 0.7);
}
