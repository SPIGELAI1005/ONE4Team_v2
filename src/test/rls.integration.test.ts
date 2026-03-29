/**
 * JWT RLS checks against a real Supabase project (staging recommended).
 *
 * Without env vars, tests are skipped (CI stays green). To run locally:
 *
 *   RLS_TEST_SUPABASE_URL=... \
 *   RLS_TEST_SUPABASE_ANON_KEY=... \
 *   RLS_TEST_JWT_USER_A=... \
 *   RLS_TEST_CLUB_A_ID=... \
 *   RLS_TEST_CLUB_B_ID=... \
 *   npm test -- src/test/rls.integration.test.ts
 *
 * user A must be a normal member of club A only (not club B).
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";

const url = (process.env.RLS_TEST_SUPABASE_URL ?? "").trim();
const anon = (process.env.RLS_TEST_SUPABASE_ANON_KEY ?? "").trim();
const jwtA = (process.env.RLS_TEST_JWT_USER_A ?? "").trim();
const clubA = (process.env.RLS_TEST_CLUB_A_ID ?? "").trim();
const clubB = (process.env.RLS_TEST_CLUB_B_ID ?? "").trim();

const enabled = Boolean(url && anon && jwtA && clubA && clubB);

function clientForJwt(jwt: string): SupabaseClient {
  return createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${jwt}` } },
  });
}

describe.skipIf(!enabled)("RLS tenant isolation (JWT against staging)", () => {
  it("user A cannot list memberships for club B", async () => {
    const c = clientForJwt(jwtA);
    const { data, error } = await c.from("club_memberships").select("id").eq("club_id", clubB).limit(10);
    expect(error).toBeNull();
    expect((data ?? []).length).toBe(0);
  });

  it("user A cannot read club B row by id", async () => {
    const c = clientForJwt(jwtA);
    const { data, error } = await c.from("clubs").select("id, name").eq("id", clubB).maybeSingle();
    expect(error).toBeNull();
    expect(data).toBeNull();
  });

  it("user A can read own club membership row", async () => {
    const c = clientForJwt(jwtA);
    const { data, error } = await c.from("club_memberships").select("id").eq("club_id", clubA).limit(5);
    expect(error).toBeNull();
    expect((data ?? []).length).toBeGreaterThan(0);
  });

  /**
   * Staging-only: if RLS is wrong, this could update club B — use a disposable club B UUID.
   * Expect zero rows updated when policies isolate tenants.
   */
  it("user A cannot update club B row (mutation probe)", async () => {
    const c = clientForJwt(jwtA);
    const { data, error } = await c.from("clubs").update({ name: "rls_probe_should_not_apply" }).eq("id", clubB).select("id");
    expect(error).toBeNull();
    expect((data ?? []).length).toBe(0);
  });
});
