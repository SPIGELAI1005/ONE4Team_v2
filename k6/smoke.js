/**
 * ONE4Team / Supabase smoke load (k6).
 *
 * Prerequisites:
 *   npm i -g k6   (or use Docker: docker run --rm -i grafana/k6 run - <k6/smoke.js)
 *
 * Environment:
 *   SUPABASE_URL          e.g. https://xxx.supabase.co
 *   SUPABASE_ANON_KEY     project anon key
 *   SB_JWT                user access_token (sign in via app or auth API)
 *   CLUB_ID               uuid of a club the user belongs to
 *
 * Example:
 *   k6 run --vus 10 --duration 2m k6/smoke.js
 *
 * Do NOT point high VU counts at production without approval.
 */

import http from "k6/http";
import { check, sleep } from "k6";

export const options = {
  vus: Number(__ENV.K6_VUS || "5"),
  duration: __ENV.K6_DURATION || "2m",
  thresholds: {
    http_req_failed: ["rate<0.05"],
    http_req_duration: ["p(95)<3000"],
  },
};

export default function () {
  const base = (__ENV.SUPABASE_URL || "").replace(/\/+$/, "");
  const anon = __ENV.SUPABASE_ANON_KEY || "";
  const token = __ENV.SB_JWT || "";
  const clubId = __ENV.CLUB_ID || "";

  if (!base || !anon || !token || !clubId) {
    console.error("Missing SUPABASE_URL, SUPABASE_ANON_KEY, SB_JWT, or CLUB_ID");
    return;
  }

  const headers = {
    apikey: anon,
    authorization: `Bearer ${token}`,
  };

  const teams = http.get(
    `${base}/rest/v1/teams?club_id=eq.${clubId}&select=id,name&limit=50`,
    { headers },
  );
  check(teams, { "teams 200": (r) => r.status === 200 });

  const matches = http.get(
    `${base}/rest/v1/matches?club_id=eq.${clubId}&select=id,opponent,match_date&order=match_date.desc&limit=20`,
    { headers },
  );
  check(matches, { "matches 200": (r) => r.status === 200 });

  sleep(1);
}
