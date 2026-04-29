import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useClubId } from "@/hooks/use-club-id";
import { useAuth } from "@/contexts/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useActiveClub } from "@/hooks/use-active-club";
import { useLanguage } from "@/hooks/use-language";
import { extractTrainingPlanFromPdf, type TrainingPlanPdfExtraction } from "@/lib/training-plan-import/training-plan-pdf";
import { WEEKDAY_KEYS, type SlotDraftRow, type TrainingPlanSlot, computeDurationMinutes } from "@/lib/training-plan-import/training-plan-model";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { materializeDraftOccurrences } from "@/lib/training-plan-import/training-plan-schedule";
import { parseTrainingScheduleCsvToSlotRows } from "@/lib/training-plan-import/training-plan-schedule-csv";
import { proposeSlotRowsFromPdfText } from "@/lib/training-plan-import/training-plan-pdf-slot-proposal";
import { Progress } from "@/components/ui/progress";

interface ClubPitchOption {
  id: string;
  name: string;
}

function fill(template: string, vars: Record<string, string | number>): string {
  let out = template;
  for (const [key, value] of Object.entries(vars)) {
    out = out.split(`{{${key}}}`).join(String(value));
  }
  return out;
}

function toSlotFromDraft(row: SlotDraftRow, source: { documentLabel: string; pageNumber: number; rawText: string }): TrainingPlanSlot {
  const time = { startsAtLocalTime: row.startsAtLocalTime, endsAtLocalTime: row.endsAtLocalTime };
  return {
    weekday: row.weekday,
    pitchCode: row.pitchCode.trim(),
    time,
    teamLabel: row.teamLabel.trim(),
    coachLabels: row.coachLabels
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
    durationMinutes: computeDurationMinutes(time),
    locationLabel: row.locationLabel.trim() || null,
    notes: row.notes.trim() || null,
    source,
  };
}

function applyPdfDraftSlots(rawText: string): SlotDraftRow[] {
  const proposed = proposeSlotRowsFromPdfText(rawText);
  if (proposed.length === 0) return [];

  // PDF text extraction usually can't infer pitch columns reliably; keep pitch empty for user mapping.
  return proposed.map((r) => ({
    ...r,
    pitchCode: r.pitchCode.trim() ? r.pitchCode.trim() : "",
  }));
}

export default function TrainingPlanImport() {
  const { toast } = useToast();
  const { clubId, loading: clubLoading } = useClubId();
  const { activeClub } = useActiveClub();
  const { user } = useAuth();
  const { t } = useLanguage();
  const ti = t.trainingPlanImportPage;

  const [pdfExtraction, setPdfExtraction] = useState<TrainingPlanPdfExtraction | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [validFromDate, setValidFromDate] = useState("");
  const [validToDate, setValidToDate] = useState("");
  const [timezone, setTimezone] = useState("Europe/Berlin");

  const [clubPitches, setClubPitches] = useState<ClubPitchOption[]>([]);
  const [pitchCodeToPitchId, setPitchCodeToPitchId] = useState<Record<string, string>>({});

  const [slotRows, setSlotRows] = useState<SlotDraftRow[]>([]);
  const slotRowsRef = useRef<SlotDraftRow[]>([]);
  useEffect(() => {
    slotRowsRef.current = slotRows;
  }, [slotRows]);

  const [isApplyingImport, setIsApplyingImport] = useState(false);
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0, percent: 0, label: "" });

  const pitchCodesForMapping = useMemo(() => {
    const fromPdf = pdfExtraction?.pitchCodes ?? [];
    const fromSlots = slotRows.map((r) => r.pitchCode.trim()).filter(Boolean);
    return Array.from(new Set([...fromPdf, ...fromSlots])).sort((a, b) => a.localeCompare(b));
  }, [pdfExtraction?.pitchCodes, slotRows]);

  const generateDraftSlotsFromPdf = useCallback(() => {
    const rawText = pdfExtraction?.rawText ?? "";
    if (!rawText.trim()) {
      toast({ title: ti.toastNoPdfTitle, description: ti.toastNoPdfDesc, variant: "destructive" });
      return;
    }

    const next = applyPdfDraftSlots(rawText);
    if (next.length === 0) {
      toast({
        title: ti.toastInferFailTitle,
        description: ti.toastInferFailDesc,
        variant: "destructive",
      });
      return;
    }

    setSlotRows(next);
    toast({
      title: ti.toastDraftFromPdfTitle,
      description: fill(ti.toastDraftFromPdfDesc, { count: next.length }),
    });
  }, [pdfExtraction?.rawText, ti, toast]);

  useEffect(() => {
    if (!clubId) return;
    let isCancelled = false;
    void supabase
      .from("club_pitches")
      .select("id, name")
      .eq("club_id", clubId)
      .order("name", { ascending: true })
      .then(({ data, error }) => {
        if (isCancelled) return;
        if (error) {
          toast({ title: t.common.error, description: error.message, variant: "destructive" });
          return;
        }
        setClubPitches((data ?? []) as ClubPitchOption[]);
      });
    return () => {
      isCancelled = true;
    };
  }, [clubId, t, toast]);

  const defaultRow = useMemo<SlotDraftRow>(
    () => ({
      weekday: "mon",
      pitchCode: "",
      startsAtLocalTime: "16:30",
      endsAtLocalTime: "18:00",
      teamLabel: "",
      coachLabels: "",
      locationLabel: "",
      notes: "",
    }),
    [],
  );

  const canApply = Boolean(!clubLoading && clubId && validFromDate && validToDate && slotRows.length > 0);
  const missingReasons = useMemo(
    () =>
      [
        clubLoading ? ti.missingClubLoading : null,
        clubId ? null : ti.missingNoClub,
        validFromDate ? null : ti.missingValidFrom,
        validToDate ? null : ti.missingValidTo,
        slotRows.length > 0 ? null : ti.missingNoSlots,
      ].filter((v): v is string => Boolean(v)),
    [clubId, clubLoading, slotRows.length, ti, validFromDate, validToDate],
  );

  return (
    <div className="w-full max-w-6xl px-4 sm:px-6 py-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{ti.title}</CardTitle>
          <CardDescription>{ti.subtitle}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">{ti.labelTimezone}</div>
              <Input value={timezone} onChange={(e) => setTimezone(e.target.value)} placeholder={ti.placeholderTimezone} />
            </div>
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">{ti.labelValidFrom}</div>
              <Input value={validFromDate} onChange={(e) => setValidFromDate(e.target.value)} placeholder={ti.placeholderDate} />
            </div>
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">{ti.labelValidTo}</div>
              <Input value={validToDate} onChange={(e) => setValidToDate(e.target.value)} placeholder={ti.placeholderDate} />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <div className="rounded-lg border border-border/60 bg-card/30 p-3 space-y-2">
              <div className="text-sm font-medium">{ti.sectionPdfTitle}</div>
              <div className="text-xs text-muted-foreground">{ti.sectionPdfHint}</div>
              <Input
                type="file"
                accept=".pdf"
                disabled={isExtracting}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  setIsExtracting(true);
                  void extractTrainingPlanFromPdf(file)
                    .then((extraction) => {
                      setPdfExtraction(extraction);
                      if (!validFromDate && extraction.validFromDateHint) setValidFromDate(extraction.validFromDateHint);
                      toast({
                        title: ti.toastPdfExtractedTitle,
                        description: fill(ti.toastPdfExtractedDesc, {
                          pitchCount: extraction.pitchCodes.length,
                          teamCount: extraction.teamLabels.length,
                        }),
                      });

                      // Best-effort: auto-generate draft slots from PDF text (user should verify).
                      const nextSlots = applyPdfDraftSlots(extraction.rawText);
                      const hadSlotsBefore = slotRowsRef.current.length > 0;
                      setSlotRows((previous) => {
                        if (previous.length > 0) return previous;
                        if (nextSlots.length === 0) return previous;
                        return nextSlots;
                      });
                      if (!hadSlotsBefore && nextSlots.length > 0) {
                        toast({
                          title: ti.toastDraftAutoTitle,
                          description: fill(ti.toastDraftAutoDesc, { count: nextSlots.length }),
                        });
                      }
                    })
                    .catch((error: unknown) => {
                      const message = error instanceof Error ? error.message : ti.pdfExtractionFailed;
                      toast({ title: t.common.error, description: message, variant: "destructive" });
                    })
                    .finally(() => setIsExtracting(false));
                  e.currentTarget.value = "";
                }}
              />
              <div className="flex flex-wrap items-center gap-2">
                <Button size="sm" variant="outline" type="button" disabled={!pdfExtraction?.rawText} onClick={() => generateDraftSlotsFromPdf()}>
                  {ti.buttonGenerateDraftFromPdf}
                </Button>
                <div className="text-xs text-muted-foreground">{ti.hintPdfVsCsv}</div>
              </div>
            </div>

            <div className="rounded-lg border border-border/60 bg-card/30 p-3 space-y-2">
              <div className="text-sm font-medium">{ti.sectionCsvTitle}</div>
              <div className="text-xs text-muted-foreground">{ti.sectionCsvHint}</div>
              <Input
                type="file"
                accept=".csv"
                disabled={isExtracting}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  void file
                    .text()
                    .then((text) => {
                      const parsed = parseTrainingScheduleCsvToSlotRows(text);
                      if (parsed.length === 0) {
                        toast({
                          title: ti.toastCsvNotRecognizedTitle,
                          description: ti.toastCsvNotRecognizedDesc,
                          variant: "destructive",
                        });
                        return;
                      }
                      setSlotRows(parsed);
                      toast({
                        title: ti.toastSlotsImportedTitle,
                        description: fill(ti.toastSlotsImportedDesc, { count: parsed.length }),
                      });
                    })
                    .catch((error: unknown) => {
                      const message = error instanceof Error ? error.message : ti.csvImportFailed;
                      toast({ title: t.common.error, description: message, variant: "destructive" });
                    })
                    .finally(() => {
                      e.currentTarget.value = "";
                    });
                }}
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="destructive"
              onClick={() => {
                setSlotRows((prev) => [...prev, { ...defaultRow }]);
              }}
            >
              {ti.buttonAddSlot}
            </Button>
            <div className="text-xs text-muted-foreground">{ti.hintManualSlot}</div>
          </div>

          {pdfExtraction ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
              <Card className="border-border/60">
                <CardHeader className="py-3">
                  <CardTitle className="text-base">{ti.cardPitchCodes}</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  {(pdfExtraction.pitchCodes.length ? pdfExtraction.pitchCodes : ["—"]).join(", ")}
                </CardContent>
              </Card>
              <Card className="border-border/60">
                <CardHeader className="py-3">
                  <CardTitle className="text-base">{ti.cardTeams}</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  {(pdfExtraction.teamLabels.length ? pdfExtraction.teamLabels : ["—"]).join(", ")}
                </CardContent>
              </Card>
              <Card className="border-border/60">
                <CardHeader className="py-3">
                  <CardTitle className="text-base">{ti.cardCoachNames}</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  {(pdfExtraction.coachLabels.length ? pdfExtraction.coachLabels : ["—"]).join(", ")}
                </CardContent>
              </Card>
            </div>
          ) : null}

          {pitchCodesForMapping.length ? (
            <div className="space-y-2">
              <div className="text-sm font-medium">{ti.sectionMappingTitle}</div>
              <div className="text-sm text-muted-foreground">{ti.sectionMappingHint}</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {pitchCodesForMapping.map((code) => (
                  <div key={code} className="flex items-center gap-2 rounded-md border border-border/60 p-2">
                    <div className="text-sm font-medium w-16">{code}</div>
                    <Select
                      value={pitchCodeToPitchId[code] || ""}
                      onValueChange={(value) => setPitchCodeToPitchId((prev) => ({ ...prev, [code]: value }))}
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder={ti.selectPitchPlaceholder} />
                      </SelectTrigger>
                      <SelectContent>
                        {clubPitches.map((pitch) => (
                          <SelectItem key={pitch.id} value={pitch.id}>
                            {pitch.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    const nextCode = `CUSTOM_${Object.keys(pitchCodeToPitchId).length + 1}`;
                    setPitchCodeToPitchId((prev) => ({ ...prev, [nextCode]: prev[nextCode] ?? "" }));
                    toast({
                      title: ti.toastCustomPitchTitle,
                      description: fill(ti.toastCustomPitchDesc, { code: nextCode }),
                    });
                  }}
                >
                  {ti.buttonAddMapping}
                </Button>
                <div className="text-xs text-muted-foreground">{ti.hintCombinedCodes}</div>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{ti.slotsTitle}</CardTitle>
          <CardDescription>{ti.slotsSubtitle}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {slotRows.length === 0 ? (
            <div className="text-sm text-muted-foreground">{ti.slotsEmpty}</div>
          ) : null}

          <div className="space-y-2">
            {slotRows.map((row, index) => (
              <div key={index} className="grid grid-cols-1 lg:grid-cols-12 gap-2 rounded-md border border-border/60 p-3">
                <div className="lg:col-span-2">
                  <Select
                    value={row.weekday}
                    onValueChange={(value) => {
                      setSlotRows((prev) => prev.map((r, i) => (i === index ? { ...r, weekday: value as SlotDraftRow["weekday"] } : r)));
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={ti.selectWeekdayPlaceholder} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mon">{ti.weekdayMon}</SelectItem>
                      <SelectItem value="tue">{ti.weekdayTue}</SelectItem>
                      <SelectItem value="wed">{ti.weekdayWed}</SelectItem>
                      <SelectItem value="thu">{ti.weekdayThu}</SelectItem>
                      <SelectItem value="fri">{ti.weekdayFri}</SelectItem>
                      <SelectItem value="sat">{ti.weekdaySat}</SelectItem>
                      <SelectItem value="sun">{ti.weekdaySun}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="lg:col-span-2">
                  <Input
                    value={row.pitchCode}
                    onChange={(e) => setSlotRows((prev) => prev.map((r, i) => (i === index ? { ...r, pitchCode: e.target.value } : r)))}
                    placeholder={ti.placeholderPitchCode}
                  />
                </div>
                <div className="lg:col-span-2 grid grid-cols-2 gap-2">
                  <Input
                    value={row.startsAtLocalTime}
                    onChange={(e) => setSlotRows((prev) => prev.map((r, i) => (i === index ? { ...r, startsAtLocalTime: e.target.value } : r)))}
                    placeholder={ti.placeholderTimeStart}
                  />
                  <Input
                    value={row.endsAtLocalTime}
                    onChange={(e) => setSlotRows((prev) => prev.map((r, i) => (i === index ? { ...r, endsAtLocalTime: e.target.value } : r)))}
                    placeholder={ti.placeholderTimeEnd}
                  />
                </div>
                <div className="lg:col-span-2">
                  <Input
                    value={row.teamLabel}
                    onChange={(e) => setSlotRows((prev) => prev.map((r, i) => (i === index ? { ...r, teamLabel: e.target.value } : r)))}
                    placeholder={ti.placeholderTeam}
                  />
                </div>
                <div className="lg:col-span-3">
                  <Input
                    value={row.coachLabels}
                    onChange={(e) => setSlotRows((prev) => prev.map((r, i) => (i === index ? { ...r, coachLabels: e.target.value } : r)))}
                    placeholder={ti.placeholderCoaches}
                  />
                </div>
                <div className="lg:col-span-1 flex items-center justify-end gap-2">
                  <Button
                    variant="ghost"
                    onClick={() => setSlotRows((prev) => prev.filter((_, i) => i !== index))}
                  >
                    {t.common.remove}
                  </Button>
                </div>
                <div className="lg:col-span-12 grid grid-cols-1 lg:grid-cols-12 gap-2">
                  <div className="lg:col-span-4">
                    <Input
                      value={row.locationLabel}
                      onChange={(e) => setSlotRows((prev) => prev.map((r, i) => (i === index ? { ...r, locationLabel: e.target.value } : r)))}
                      placeholder={ti.placeholderLocationOptional}
                    />
                  </div>
                  <div className="lg:col-span-8">
                    <Input
                      value={row.notes}
                      onChange={(e) => setSlotRows((prev) => prev.map((r, i) => (i === index ? { ...r, notes: e.target.value } : r)))}
                      placeholder={ti.placeholderNotesOptional}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm text-muted-foreground">
              {ti.clubPrefix} {clubId || "—"}
              {activeClub?.name ? ` · ${activeClub.name}` : ""}
            </div>
            <Button
              disabled={!canApply}
              onClick={() => {
                const source = {
                  documentLabel: pdfExtraction?.documentLabel || "manual-entry",
                  pageNumber: 1,
                  rawText: pdfExtraction?.rawText || "",
                };
                try {
                  const slots = slotRows.map((r) => toSlotFromDraft(r, source));
                  const invalid = slots.find((s) => !s.pitchCode || !s.teamLabel || s.durationMinutes <= 0);
                  if (invalid) {
                    toast({
                      title: ti.toastMissingDataTitle,
                      description: ti.toastMissingDataDesc,
                      variant: "destructive",
                    });
                    return;
                  }
                  toast({
                    title: ti.toastDraftReadyTitle,
                    description: fill(ti.toastDraftReadyDesc, { count: slots.length }),
                  });
                } catch (error: unknown) {
                  const message = error instanceof Error ? error.message : ti.buildDraftFailed;
                  toast({ title: t.common.error, description: message, variant: "destructive" });
                }
              }}
            >
              {ti.prepareDraft}
            </Button>
          </div>
          {!canApply ? (
            <div className="text-xs text-muted-foreground">
              {ti.missingEnablePrefix} {missingReasons.join(", ")}.
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{ti.applyTitle}</CardTitle>
          <CardDescription>{ti.applySubtitle}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button
            disabled={!canApply || !user?.id || isApplyingImport}
            onClick={() => {
              if (!clubId || !user?.id) return;
              const source = {
                documentLabel: pdfExtraction?.documentLabel || "manual-entry",
                pageNumber: 1,
                rawText: pdfExtraction?.rawText || "",
              };
              const slots = slotRows.map((r) => toSlotFromDraft(r, source));
              const draft = {
                clubId,
                timezone,
                validFromDate,
                validToDate,
                slots,
              };

              const occurrences = materializeDraftOccurrences(draft);

              void (async () => {
                try {
                  setIsApplyingImport(true);
                  setImportProgress({
                    current: 0,
                    total: Math.max(1, occurrences.length),
                    percent: 0,
                    label: ti.progressValidatingMappings,
                  });

                  const pitchCodesNeeded = Array.from(new Set(slots.map((s) => s.pitchCode))).filter(Boolean);
                  const missingPitchMappings = pitchCodesNeeded.filter((code) => !pitchCodeToPitchId[code]);
                  if (missingPitchMappings.length > 0) {
                    toast({
                      title: ti.toastPitchMappingTitle,
                      description: fill(ti.toastPitchMappingDesc, { codes: missingPitchMappings.join(", ") }),
                      variant: "destructive",
                    });
                    return;
                  }

                  // 1) Upsert teams
                  setImportProgress((p) => ({ ...p, label: ti.progressUpsertingTeams }));
                  const teamLabels = Array.from(new Set(slots.map((s) => s.teamLabel)));
                  const { data: existingTeams, error: teamsError } = await supabase
                    .from("teams")
                    .select("id, name")
                    .eq("club_id", clubId)
                    .in("name", teamLabels);
                  if (teamsError) throw teamsError;

                  const existingTeamByName = new Map((existingTeams ?? []).map((t) => [t.name, t.id]));
                  const missingTeams = teamLabels.filter((name) => !existingTeamByName.has(name));
                  if (missingTeams.length > 0) {
                    const { data: insertedTeams, error: insertTeamsError } = await supabase
                      .from("teams")
                      .insert(missingTeams.map((name) => ({ club_id: clubId, name, sport: "Football" })))
                      .select("id, name");
                    if (insertTeamsError) throw insertTeamsError;
                    for (const t of insertedTeams ?? []) existingTeamByName.set(t.name, t.id);
                  }

                  // 2) Upsert coach placeholders (club scoped)
                  setImportProgress((p) => ({ ...p, label: ti.progressUpsertingPlaceholders }));
                  const coachNames = Array.from(new Set(slots.flatMap((s) => s.coachLabels))).filter(Boolean);
                  if (coachNames.length > 0) {
                    const { data: existing, error } = await supabase
                      .from("club_person_placeholders")
                      .select("id, display_name")
                      .eq("club_id", clubId)
                      .eq("kind", "coach")
                      .in("display_name", coachNames);
                    if (error) throw error;
                    const existingByName = new Set((existing ?? []).map((p) => p.display_name));
                    const missing = coachNames.filter((name) => !existingByName.has(name));
                    if (missing.length > 0) {
                      const { error: insertError } = await supabase.from("club_person_placeholders").insert(
                        missing.map((display_name) => ({
                          club_id: clubId,
                          kind: "coach",
                          display_name,
                          created_by: user.id,
                        })),
                      );
                      if (insertError) throw insertError;
                    }
                  }

                  // 2b) Link coaches to teams via placeholders (team_coaches.placeholder_id)
                  setImportProgress((p) => ({ ...p, label: ti.progressLinkingCoaches }));
                  if (coachNames.length > 0) {
                    const { data: placeholders, error: placeholdersError } = await supabase
                      .from("club_person_placeholders")
                      .select("id, display_name")
                      .eq("club_id", clubId)
                      .eq("kind", "coach")
                      .in("display_name", coachNames);
                    if (placeholdersError) throw placeholdersError;
                    const placeholderIdByName = new Map((placeholders ?? []).map((p) => [p.display_name, p.id]));

                    const teamCoachPairs = new Map<string, { team_id: string; placeholder_id: string }>();
                    for (const slot of slots) {
                      const teamId = existingTeamByName.get(slot.teamLabel);
                      if (!teamId) continue;
                      for (const coachName of slot.coachLabels) {
                        const placeholderId = placeholderIdByName.get(coachName);
                        if (!placeholderId) continue;
                        const key = `${teamId}|${placeholderId}`;
                        teamCoachPairs.set(key, { team_id: teamId, placeholder_id: placeholderId });
                      }
                    }

                    const rows = Array.from(teamCoachPairs.values());
                    if (rows.length > 0) {
                      const { error } = await supabase.from("team_coaches").upsert(rows, { onConflict: "team_id,placeholder_id" });
                      if (error) throw error;
                    }
                  }

                  // 3) Create/Upsert pitch bookings + activities by import_key
                  setImportProgress((p) => ({
                    ...p,
                    label: fill(ti.progressCreatingTrainings, { current: 0, total: occurrences.length }),
                  }));
                  for (const occ of occurrences) {
                    setImportProgress((p) => {
                      const nextCurrent = Math.min(p.total, p.current + 1);
                      const percent = Math.round((nextCurrent / p.total) * 100);
                      return {
                        ...p,
                        current: nextCurrent,
                        percent,
                        label: fill(ti.progressCreatingTrainings, { current: nextCurrent, total: p.total }),
                      };
                    });

                    const teamId = existingTeamByName.get(occ.slot.teamLabel) ?? null;
                    const title = `${occ.slot.teamLabel} ${ti.trainingTitleSuffix}`.trim();
                    const bookingImportKey = `pb|${occ.importKey}`;
                    const activityImportKey = `act|${occ.importKey}`;
                    const pitchId = pitchCodeToPitchId[occ.slot.pitchCode];

                    // Upsert booking (we do it first to link into activity)
                    const { data: booking, error: bookingError } = await supabase
                      .from("pitch_bookings")
                      .upsert(
                        {
                          club_id: clubId,
                          pitch_id: pitchId,
                          team_id: teamId,
                          booking_type: "training",
                          title,
                          starts_at: occ.startsAtIso,
                          ends_at: occ.endsAtIso,
                          status: "booked",
                          created_by: user.id,
                          import_key: bookingImportKey,
                        },
                        { onConflict: "club_id,import_key" },
                      )
                      .select("id")
                      .single();
                    if (bookingError) throw bookingError;

                    const { data: activity, error: activityError } = await supabase
                      .from("activities")
                      .upsert(
                        {
                          club_id: clubId,
                          type: "training",
                          title,
                          description: null,
                          starts_at: occ.startsAtIso,
                          ends_at: occ.endsAtIso,
                          location: occ.slot.locationLabel,
                          team_id: teamId,
                          created_by: user.id,
                          pitch_booking_id: booking.id,
                          import_key: activityImportKey,
                        },
                        { onConflict: "club_id,import_key" },
                      )
                      .select("id")
                      .single();
                    if (activityError) throw activityError;

                    // Back-link booking -> activity
                    const { error: linkError } = await supabase
                      .from("pitch_bookings")
                      .update({ activity_id: activity.id })
                      .eq("club_id", clubId)
                      .eq("id", booking.id);
                    if (linkError) throw linkError;
                  }

                  toast({
                    title: ti.toastImportAppliedTitle,
                    description: fill(ti.toastImportAppliedDesc, { count: occurrences.length }),
                  });
                } catch (error: unknown) {
                  const err = error as { message?: unknown; details?: unknown; hint?: unknown; code?: unknown };
                  const message =
                    typeof err?.message === "string"
                      ? err.message
                      : error instanceof Error
                        ? error.message
                        : ti.importFailedGeneric;
                  const meta = [err?.code, err?.hint, err?.details].filter(Boolean).map(String).join(" · ");
                  toast({
                    title: ti.toastImportFailedTitle,
                    description: meta ? `${message} (${meta})` : message,
                    variant: "destructive",
                  });
                } finally {
                  setIsApplyingImport(false);
                  setImportProgress((p) => ({ ...p, label: "" }));
                }
              })();
            }}
          >
            {isApplyingImport ? ti.applyingImport : ti.applyImportBeta}
          </Button>

          {isApplyingImport ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <div>{importProgress.label || ti.progressWorking}</div>
                <div className="tabular-nums">{importProgress.percent}%</div>
              </div>
              <Progress value={importProgress.percent} />
            </div>
          ) : null}

          <div className="text-xs text-muted-foreground">
            {user?.id ? null : `${ti.footerMustSignIn} `}
            {canApply ? null : `${ti.footerMissingPrefix} ${missingReasons.join(", ")}.`}
            {isApplyingImport ? ` ${ti.footerImportRunning}` : null}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

