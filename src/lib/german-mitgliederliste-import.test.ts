import { describe, expect, it } from "vitest";
import {
  deriveGermanAppRole,
  deriveGermanMembershipKind,
  deriveGermanMembershipStatus,
  enrichGermanMitgliederlisteRow,
  isGermanMitgliederlisteHeaders,
  normalizeGermanPhone,
  parseSemicolonDelimitedCsv,
} from "@/lib/german-mitgliederliste-import";
import { masterFieldsFromFlatImport, normalizeHeaderKey } from "@/lib/member-master-schema";
import { parseRegistrySpreadsheetFirstSheet } from "@/lib/member-master-xlsx";

const SAMPLE_HEADER =
  "Mitglieds-Nr;Nachname;Vorname;Abteilungen;E-Mail;Geschlecht;Geburtsdatum;Straße;PLZ;Ort;Land;Eintrittsdatum;Passnummer;Spielrecht;Status;Abteilung_1;Abteilungseintritt_1;Mobil;IBAN;Kontoinhaber;Kreditinstitut;Notfallkontakt;Notfallnummer;Funktionen";

const SAMPLE_ROW =
  "11795;Damjanovic;Dominik;Herren (01.07.2024 bis -);dembaba8888@gmail.com;männlich;19.08.1995;Emmy-Lenbach-Straße 7;85221;Dachau;Deutschland;01.07.2024;0603-9980;Hauptspielrecht;Aktiv;Herren;01.07.2024;1603115126;DE64700915000000470490;Damjanovic Dominik;Volksbank Raiffeisenbank Dachau;Mama;089123456;;";

describe("german-mitgliederliste-import", () => {
  it("detects German export headers", () => {
    const headers = SAMPLE_HEADER.split(";");
    expect(isGermanMitgliederlisteHeaders(headers)).toBe(true);
    expect(isGermanMitgliederlisteHeaders(["email", "name"])).toBe(false);
  });

  it("parses semicolon CSV rows", () => {
    const csv = `${SAMPLE_HEADER}\n${SAMPLE_ROW}`;
    const rows = parseSemicolonDelimitedCsv(csv);
    expect(rows).toHaveLength(2);
    expect(rows[0][0]).toMatch(/Mitglieds-Nr/);
    expect(rows[1][1]).toBe("Damjanovic");
  });

  it("enriches a German row into ONE4Team import shape", () => {
    const headers = SAMPLE_HEADER.split(";");
    const cells = SAMPLE_ROW.split(";");
    const raw: Record<string, string> = {};
    headers.forEach((h, i) => {
      raw[normalizeHeaderKey(h)] = cells[i] ?? "";
    });

    const enriched = enrichGermanMitgliederlisteRow(raw);
    expect(enriched.email).toBe("dembaba8888@gmail.com");
    expect(enriched.role).toBe("player");
    expect(enriched.status).toBe("active");
    expect(enriched.team).toBe("Herren");
    expect(enriched.raw.first_name).toBe("Dominik");
    expect(enriched.raw.last_name).toBe("Damjanovic");
    expect(enriched.raw.internal_club_number).toBe("11795");
    expect(enriched.raw.membership_kind).toBe("active_participant");
    expect(enriched.raw.squad_status).toBe("Hauptspielrecht");
    expect(enriched.raw.birth_date).toBe("1995-08-19");

    const master = masterFieldsFromFlatImport(enriched.raw);
    expect(master.first_name).toBe("Dominik");
    expect(master.last_name).toBe("Damjanovic");
    expect(master.sex).toBe("male");
    expect(master.iban).toBe("DE64700915000000470490");
    expect(master.city).toBe("Dachau");
  });

  it("marks exited members inactive", () => {
    expect(deriveGermanMembershipStatus("Aktiv", "31.12.2024", "11880")).toBe("inactive");
    expect(deriveGermanMembershipStatus("Aktiv", "", "* 11880")).toBe("inactive");
  });

  it("derives roles from Funktionen and department", () => {
    expect(deriveGermanAppRole("Trainer Jugend", "Jugend", "", "")).toBe("trainer");
    expect(deriveGermanAppRole("", "Jugend", "Jugend (2024)", "0636-1234")).toBe("player");
    expect(deriveGermanMembershipKind("Jugend", "")).toBe("active_participant");
  });

  it("normalizes scientific phone notation", () => {
    expect(normalizeGermanPhone("4,91574E+12")).toMatch(/^\+?491574/);
  });
});

describe("parseRegistrySpreadsheetFirstSheet (German CSV)", () => {
  it("parses a File-like German Mitgliederliste CSV", async () => {
    const csv = `${SAMPLE_HEADER}\n${SAMPLE_ROW}`;
    const file = {
      name: "Mitgliederliste_2026.csv",
      text: async () => csv,
    } as File;
    const rows = await parseRegistrySpreadsheetFirstSheet(file);
    expect(rows).toHaveLength(1);
    expect(rows[0].sourceFormat).toBe("german_mitgliederliste");
    expect(rows[0].email).toBe("dembaba8888@gmail.com");
    expect(rows[0].role).toBe("player");
  });
});
