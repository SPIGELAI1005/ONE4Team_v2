/**
 * Low-rate check against co-trainer Edge Function (optional).
 *
 *   SUPABASE_URL, SUPABASE_ANON_KEY, SB_JWT, CLUB_ID as in smoke.js
 *   K6_EDGE_RPS max requests per second per VU cycle (default 0.2 => sleep 5s)
 *
 * Expect 200, 400 (no LLM), or 429 — not 5xx bursts.
 */

import http from "k6/http";
import { check, sleep } from "k6";

export const options = {
  vus: 1,
  iterations: 3,
  thresholds: {
    http_req_failed: ["rate<0.5"],
  },
};

export default function () {
  const base = (__ENV.SUPABASE_URL || "").replace(/\/+$/, "");
  const anon = __ENV.SUPABASE_ANON_KEY || "";
  const token = __ENV.SB_JWT || "";
  const clubId = __ENV.CLUB_ID || "";
  if (!base || !anon || !token || !clubId) return;

  const fnUrl = `${base}/functions/v1/co-trainer`;
  const res = http.post(
    fnUrl,
    JSON.stringify({
      club_id: clubId,
      mode: "health",
    }),
    {
      headers: {
        "Content-Type": "application/json",
        apikey: anon,
        authorization: `Bearer ${token}`,
      },
    },
  );

  check(res, {
    "health not 5xx": (r) => r.status < 500,
  });

  sleep(Number(__ENV.K6_EDGE_PAUSE_SEC || "5"));
}
