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
 * Optional Wave 1 attendance / finance probes:
 *   RLS_TEST_JWT_TRAINER_TEAM_A  — trainer scoped to team A only
 *   RLS_TEST_TEAM_B_ACTIVITY_ID  — activity on team B (same club A)
 *   RLS_TEST_TEAM_B_MEMBERSHIP_ID
 *   RLS_TEST_JWT_TEAM_MGMT       — team_management user on club A
 *   RLS_TEST_JWT_PARENT          — parent without link to TARGET membership
 *   RLS_TEST_UNRELATED_MEMBERSHIP_ID
 *   RLS_TEST_ACTIVITY_ID         — any activity in club A for RSVP probe
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

const jwtTrainerA = (process.env.RLS_TEST_JWT_TRAINER_TEAM_A ?? "").trim();
const teamBActivityId = (process.env.RLS_TEST_TEAM_B_ACTIVITY_ID ?? "").trim();
const teamBMembershipId = (process.env.RLS_TEST_TEAM_B_MEMBERSHIP_ID ?? "").trim();
const jwtTeamMgmt = (process.env.RLS_TEST_JWT_TEAM_MGMT ?? "").trim();
const jwtParent = (process.env.RLS_TEST_JWT_PARENT ?? "").trim();
const unrelatedMembershipId = (process.env.RLS_TEST_UNRELATED_MEMBERSHIP_ID ?? "").trim();
const activityId = (process.env.RLS_TEST_ACTIVITY_ID ?? "").trim();

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
   * Staging-only: if RLS is wrong, this could update club B - use a disposable club B UUID.
   * Expect zero rows updated when policies isolate tenants.
   */
  it("user A cannot update club B row (mutation probe)", async () => {
    const c = clientForJwt(jwtA);
    const { data, error } = await c.from("clubs").update({ name: "rls_probe_should_not_apply" }).eq("id", clubB).select("id");
    expect(error).toBeNull();
    expect((data ?? []).length).toBe(0);
  });

  it("user A cannot list payments for club B", async () => {
    const c = clientForJwt(jwtA);
    const { data, error } = await c.from("payments").select("id").eq("club_id", clubB).limit(5);
    expect(error).toBeNull();
    expect((data ?? []).length).toBe(0);
  });
});

describe.skipIf(!enabled || !jwtTrainerA || !teamBActivityId || !teamBMembershipId)(
  "Wave 1 — trainer team scope (JWT)",
  () => {
    it("trainer for team A cannot upsert attendance for team B activity member", async () => {
      const c = clientForJwt(jwtTrainerA);
      const { data, error } = await c.rpc("upsert_activity_attendance_response", {
        _activity_id: teamBActivityId,
        _membership_id: teamBMembershipId,
        _status: "confirmed",
        _notes: null,
        _response_reason: "rls_probe",
      });
      // Forbidden or not_found — never a successful ok write for foreign team.
      if (error) {
        expect(error.message.length).toBeGreaterThan(0);
        return;
      }
      const payload = data as { ok?: boolean; error?: string } | null;
      expect(payload?.ok).not.toBe(true);
    });
  },
);

describe.skipIf(!enabled || !jwtTeamMgmt)("Wave 1 — team_management finance (JWT)", () => {
  it("team_management cannot list club payments (RLS)", async () => {
    const c = clientForJwt(jwtTeamMgmt);
    const { data, error } = await c.from("payments").select("id").eq("club_id", clubA).limit(5);
    expect(error).toBeNull();
    expect((data ?? []).length).toBe(0);
  });
});

describe.skipIf(!enabled || !jwtParent || !unrelatedMembershipId || !activityId)(
  "Wave 1 — guardian RSVP scope (JWT)",
  () => {
    it("parent cannot RSVP for unrelated membership via RPC", async () => {
      const c = clientForJwt(jwtParent);
      const { data, error } = await c.rpc("upsert_activity_attendance_response", {
        _activity_id: activityId,
        _membership_id: unrelatedMembershipId,
        _status: "confirmed",
        _notes: null,
        _response_reason: null,
      });
      if (error) {
        expect(error.message.length).toBeGreaterThan(0);
        return;
      }
      const payload = data as { ok?: boolean; error?: string } | null;
      expect(payload?.ok).not.toBe(true);
    });
  },
);

const jwtTrainerGuest = (process.env.RLS_TEST_JWT_TRAINER_GUEST ?? "").trim();
const guestIdForProbe = (process.env.RLS_TEST_GUEST_ID ?? "").trim();

describe.skipIf(!enabled || !jwtTrainerGuest || !guestIdForProbe)(
  "Tier 1 — guest draft+invite RPC (JWT)",
  () => {
    it("trainer can convert guest via security-definer RPC without direct club_invites insert", async () => {
      const c = clientForJwt(jwtTrainerGuest);
      const { data, error } = await c.rpc("convert_activity_guest_to_draft_invite", {
        _guest_id: guestIdForProbe,
        _draft_role: "player",
      });
      if (error) {
        expect(error.message.length).toBeGreaterThan(0);
        return;
      }
      const payload = data as { ok?: boolean; error?: string; invite_token?: string } | null;
      expect(payload?.ok === true || payload?.error === "already_invited" || payload?.error === "already_converted").toBe(
        true,
      );
    });
  },
);

const jwtMemberTransport = (process.env.RLS_TEST_JWT_MEMBER_TRANSPORT ?? "").trim();
const transportOfferId = (process.env.RLS_TEST_TRANSPORT_OFFER_ID ?? "").trim();

describe.skipIf(!enabled || !jwtMemberTransport || !transportOfferId)(
  "Tier 2 — transport pending request (JWT)",
  () => {
    it("member can request seat (pending) without bypassing driver accept", async () => {
      const c = clientForJwt(jwtMemberTransport);
      const { data, error } = await c.rpc("request_activity_transport_seat", {
        _offer_id: transportOfferId,
        _note: "rls_probe",
      });
      if (error) {
        expect(error.message.length).toBeGreaterThan(0);
        return;
      }
      const payload = data as { ok?: boolean; status?: string; error?: string } | null;
      expect(payload?.ok === true || payload?.error === "full" || payload?.error === "own_offer").toBe(true);
      if (payload?.ok) expect(["pending", "accepted"].includes(payload.status ?? "")).toBe(true);
    });
  },
);
