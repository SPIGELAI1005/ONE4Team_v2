/**
 * Lightweight DB reachability check (service role). Deploy alongside other Edge functions.
 * Invoke with anon JWT + apikey from the Health page or synthetic monitors.
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.3";
import { edgeCorsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  const cors = edgeCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: cors });
  }
  if (req.method !== "GET") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  const url = Deno.env.get("SUPABASE_URL") ?? "";
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!url || !key) {
    return new Response(JSON.stringify({ ok: false, database: "misconfigured" }), {
      status: 503,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(url, key);
  const { error } = await supabase.from("clubs").select("id").limit(1);
  const database = error ? "fail" : "ok";
  return new Response(JSON.stringify({ ok: database === "ok", database }), {
    status: database === "ok" ? 200 : 503,
    headers: { ...cors, "Content-Type": "application/json" },
  });
});
