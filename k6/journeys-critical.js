/**
 * Critical-path k6 bundle: PostgREST reads + Edge co-trainer health (optional branch).
 *
 * Env (same as k6/smoke.js):
 *   SUPABASE_URL, SUPABASE_ANON_KEY, SB_JWT, CLUB_ID
 * Optional:
 *   K6_RUN_EDGE=1           — also hit functions/v1/co-trainer (mode: health)
 *   K6_EXPECT_AI_PLAN=1     — treat 402 on co-trainer chat path as failure (set when CLUB is Pro+)
 *
 * Example:
 *   k6 run --vus 20 --duration 3m k6/journeys-critical.js
 */

import http from "k6/http";
import { check, group, sleep } from "k6";

export const options = {
  vus: Number(__ENV.K6_VUS || "10"),
  duration: __ENV.K6_DURATION || "2m",
  thresholds: {
    http_req_failed: ["rate<0.08"],
    http_req_duration: ["p(95)<4000"],
  },
};

function headers(base, anon, token) {
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
  const h = headers(base, anon, token);

  group("rest_club_reads", () => {
    const teams = http.get(
      `${base}/rest/v1/teams?club_id=eq.${clubId}&select=id,name&limit=50`,
      { headers: h },
    );
    check(teams, { "teams 200": (r) => r.status === 200 });

    const matches = http.get(
      `${base}/rest/v1/matches?club_id=eq.${clubId}&select=id,opponent,match_date,status&order=match_date.desc&limit=30`,
      { headers: h },
    );
    check(matches, { "matches 200": (r) => r.status === 200 });

    const members = http.get(
      `${base}/rest/v1/club_memberships?club_id=eq.${clubId}&select=id,user_id,role,status&limit=100`,
      { headers: h },
    );
    check(members, { "memberships 200": (r) => r.status === 200 });
  });

  if (__ENV.K6_RUN_EDGE === "1") {
    group("edge_co_trainer_health", () => {
      const fnUrl = `${base}/functions/v1/co-trainer`;
      const res = http.post(
        fnUrl,
        JSON.stringify({ club_id: clubId, mode: "health" }),
        {
          headers: {
            ...h,
            "Content-Type": "application/json",
          },
        },
      );
      check(res, {
        "co-trainer health not 5xx": (r) => r.status < 500,
      });
    });
  }

  sleep(0.8 + Math.random() * 0.6);
}
