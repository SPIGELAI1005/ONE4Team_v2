import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { de } from "@/i18n/de";
import { en } from "@/i18n/en";
import {
  formatSupportClubRole,
  formatSupportDeliveryStatus,
  formatSupportGenericStatus,
  formatSupportPlatformRole,
  localizeInviteDeliveryNote,
  localizeMonitoringConnectorLabel,
  localizeSupportError,
} from "@/lib/operator-enhancements";

const migration = readFileSync(
  path.resolve(process.cwd(), "supabase/migrations/20260801180000_operator_enhancements.sql"),
  "utf8",
);

describe("operator enhancements migration", () => {
  it("defines platform settings and audited updates", () => {
    expect(migration).toContain("platform_settings");
    expect(migration).toContain("get_platform_settings");
    expect(migration).toContain("set_platform_setting");
    expect(migration).toContain("PLATFORM_SETTING_CHANGED");
  });

  it("defines support diagnostics RPCs with support permission", () => {
    expect(migration).toContain("get_operator_support_club_diagnostics");
    expect(migration).toContain("get_operator_support_user_diagnostics");
    expect(migration).toContain("check_operator_invite_delivery");
    expect(migration).toContain("operator.support.use");
  });

  it("does not expose service role or raw log tables to clients", () => {
    expect(migration).toContain("platform_settings_no_direct_access");
    expect(migration).not.toContain("service_role");
  });

  it("localizes support diagnostics labels from RPC English copy", () => {
    expect(formatSupportDeliveryStatus("pending", en)).toBe("Pending");
    expect(formatSupportDeliveryStatus("accepted", de)).toBe("Angenommen");
    expect(formatSupportPlatformRole(null, de)).toBe("Keine");
    expect(formatSupportGenericStatus("SUSPENDED", de)).toBe("Gesperrt");
    expect(
      localizeInviteDeliveryNote(
        "Email delivery telemetry is not connected yet. Status reflects invite record only.",
        de,
      ),
    ).toBe("E-Mail-Zustellungs-Telemetrie ist noch nicht verbunden. Der Status spiegelt nur den Einladungsdatensatz wider.");
    expect(formatSupportClubRole("player", de)).toBe("Spieler");
    expect(localizeSupportError("Club not found", de)).toBe("Verein nicht gefunden");
    expect(localizeMonitoringConnectorLabel("resend", de)).toBe("Resend E-Mail");
  });
});
