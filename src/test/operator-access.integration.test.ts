/**
 * JWT integration checks for ONE4Team Control Center RPC access (staging recommended).
 *
 * Without env vars, tests are skipped. Example:
 *
 *   RLS_TEST_SUPABASE_URL=... \
 *   RLS_TEST_SUPABASE_ANON_KEY=... \
 *   RLS_TEST_JWT_CLUB_ADMIN=... \
 *   RLS_TEST_JWT_PLATFORM_VIEWER=... \
 *   RLS_TEST_JWT_PLATFORM_OPERATOR=... \
 *   npm test -- src/test/operator-access.integration.test.ts
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";

const url = (process.env.RLS_TEST_SUPABASE_URL ?? "").trim();
const anon = (process.env.RLS_TEST_SUPABASE_ANON_KEY ?? "").trim();
const jwtClubAdmin = (process.env.RLS_TEST_JWT_CLUB_ADMIN ?? "").trim();
const jwtViewer = (process.env.RLS_TEST_JWT_PLATFORM_VIEWER ?? "").trim();
const jwtOperator = (process.env.RLS_TEST_JWT_PLATFORM_OPERATOR ?? "").trim();

const enabled = Boolean(url && anon && jwtClubAdmin && jwtViewer);

function clientForJwt(jwt: string): SupabaseClient {
  return createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${jwt}` } },
  });
}

describe.skipIf(!enabled)("operator access integration (JWT against staging)", () => {
  it("club admin cannot load operator platform overview", async () => {
    const client = clientForJwt(jwtClubAdmin);
    const { error } = await client.rpc("get_operator_platform_overview");
    expect(error).not.toBeNull();
  });

  it("platform VIEWER can read overview but cannot mutate club modules", async () => {
    const client = clientForJwt(jwtViewer);
    const overview = await client.rpc("get_operator_platform_overview");
    expect(overview.error).toBeNull();

    const mutation = await client.rpc("set_operator_club_module_entitlement", {
      _club_id: "00000000-0000-0000-0000-000000000001",
      _module_id: "00000000-0000-0000-0000-000000000001",
      _enabled: false,
      _source: "MANUAL_OVERRIDE",
      _reason: "integration probe",
    });
    expect(mutation.error).not.toBeNull();
  });

  it("platform VIEWER cannot list platform users for management mutations", async () => {
    const client = clientForJwt(jwtViewer);
    const read = await client.rpc("get_platform_users");
    expect(read.error).toBeNull();

    const create = await client.rpc("create_platform_user", {
      _email: "probe@example.com",
      _role: "VIEWER",
      _reason: "integration probe",
    });
    expect(create.error).not.toBeNull();
  });
});

describe.skipIf(!enabled || !jwtOperator)("operator mutation integration (optional operator JWT)", () => {
  it("platform OPERATOR cannot create platform users (OWNER only)", async () => {
    const client = clientForJwt(jwtOperator);
    const { error } = await client.rpc("create_platform_user", {
      _email: "probe@example.com",
      _role: "VIEWER",
      _reason: "integration probe",
    });
    expect(error).not.toBeNull();
  });
});
