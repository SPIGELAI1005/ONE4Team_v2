import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { Crown, Download, Info, Loader2, Moon, RefreshCw, RotateCcw, Sun, UserCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Ai4TInlineLabel, BrandedText } from "@/components/ai/Ai4TBrand";
import { Ai4TLogo } from "@/components/ai/Ai4TLogo";
import type { ClubMemberMasterRecord } from "@/lib/member-master-schema";
import type { ClubPassSkillsSummary } from "@/lib/club-member-pass-skills";
import { CLUB_PASS_EMPTY_VALUE } from "@/lib/club-member-pass-skills";
import { captureClubPassAsPng } from "@/lib/club-pass-capture";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/hooks/use-language";
import one4teamLogo from "@/assets/one4team-logo.png";

export type ClubMemberPassTheme = "light" | "dark" | "gold";

const CLUB_PASS_FONT = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
const CARD_THEME_STORAGE_KEY = "one4team.clubCardTheme";
/** Fixed stage height so front/back flip does not resize the modal. */
const CARD_FLIP_MIN_HEIGHT = 460;
const cardFaceHiddenStyle = {
  backfaceVisibility: "hidden" as const,
  WebkitBackfaceVisibility: "hidden" as const,
};

function clubPassHeaderLineStyle(
  color: string,
  fontSize: number,
  lineHeight: number,
  options?: { fontWeight?: number; letterSpacing?: string },
) {
  return {
    display: "block" as const,
    margin: 0,
    padding: "2px 0",
    color,
    fontSize,
    lineHeight: `${lineHeight}px`,
    letterSpacing: options?.letterSpacing ?? "0.04em",
    fontWeight: options?.fontWeight ?? 500,
    whiteSpace: "nowrap" as const,
    textOverflow: "ellipsis" as const,
    overflowX: "hidden" as const,
    overflowY: "visible" as const,
  };
}

function readStoredCardTheme(): ClubMemberPassTheme {
  try {
    const stored = localStorage.getItem(CARD_THEME_STORAGE_KEY);
    if (stored === "light" || stored === "dark" || stored === "gold") return stored;
  } catch {
    /* ignore */
  }
  return "dark";
}

function cardThemeVars(theme: ClubMemberPassTheme) {
  if (theme === "light") {
    return {
      bg: "linear-gradient(145deg,#ffffff 0%,#f4f5f7 55%,#ffffff 100%)",
      border: "rgba(15,23,42,0.10)",
      fg: "rgba(15,23,42,0.92)",
      muted: "rgba(15,23,42,0.72)",
      soft: "rgba(15,23,42,0.05)",
      softBorder: "rgba(15,23,42,0.10)",
      accent: "rgba(196,149,42,0.95)",
      stripe: "rgba(15,23,42,0.10)",
    } as const;
  }
  if (theme === "gold") {
    return {
      bg: "linear-gradient(145deg,#3a2a12 0%,#6b4a1a 45%,#2a1b0b 100%)",
      border: "rgba(255,221,128,0.28)",
      fg: "rgba(255,252,246,0.96)",
      muted: "rgba(255,246,224,0.88)",
      soft: "rgba(255,221,128,0.12)",
      softBorder: "rgba(255,221,128,0.22)",
      accent: "rgba(255,216,112,0.98)",
      stripe: "rgba(0,0,0,0.28)",
    } as const;
  }
  return {
    bg: "linear-gradient(145deg,#07070a 0%,#14141d 52%,#060607 100%)",
    border: "rgba(255,255,255,0.12)",
    fg: "rgba(255,255,255,0.92)",
    muted: "rgba(255,255,255,0.78)",
    soft: "rgba(255,255,255,0.06)",
    softBorder: "rgba(255,255,255,0.10)",
    accent: "rgba(34,197,94,0.95)",
    stripe: "rgba(0,0,0,0.35)",
  } as const;
}

export interface ClubMemberPassCardLabels {
  generateId: string;
  downloadPass: string;
  memberSince: string;
  dateOfBirth: string;
  role: string;
  team: string;
  idNo: string;
  membership: string;
  passNumber: string;
  memberIdCard: string;
  themeLight: string;
  themeDark: string;
  themeGold: string;
  downloadFailed: string;
  skillsTitle: string;
  skillsOverview: string;
  flipHint: string;
  flipClubHint: string;
  flipBackHint: string;
  overall: string;
  overallFull: string;
  skillTec: string;
  skillFit: string;
  skillTac: string;
  skillMnd: string;
  skillAtt: string;
  skillCmp: string;
  skillTecFull: string;
  skillFitFull: string;
  skillTacFull: string;
  skillMndFull: string;
  skillAttFull: string;
  skillCmpFull: string;
  marketValue: string;
  marketValueAi: string;
  marketInfoTitle: string;
  marketInfoBody: string;
  marketEstimatedOn: string;
  marketRefresh: string;
  marketConfidenceLow: string;
  marketConfidenceMedium: string;
  marketConfidenceHigh: string;
  noProgress: string;
  level: string;
  xp: string;
}

export interface ClubMemberPassCardProps {
  values: Partial<ClubMemberMasterRecord>;
  displayName?: string;
  clubName?: string | null;
  logoSrc?: string;
  membershipRole?: string;
  /** When true, card back shows My Progress skills. When false, card back shows club crest only. */
  isPlayer?: boolean;
  teamLabel?: string;
  readOnly?: boolean;
  showControls?: boolean;
  theme?: ClubMemberPassTheme;
  onThemeChange?: (theme: ClubMemberPassTheme) => void;
  onGenerateId?: () => void;
  onDownloadComplete?: () => void;
  onMemberIdClick?: () => void;
  /** When set, tapping the card flips to skills + AI market value. */
  skillsSummary?: ClubPassSkillsSummary | null;
  levelLabel?: string;
  xpValue?: number;
  /** ISO timestamp for when the current estimate was generated. */
  estimateGeneratedAt?: string | null;
  estimateRefreshing?: boolean;
  onRefreshEstimate?: () => void;
  labels: ClubMemberPassCardLabels;
  className?: string;
}

export interface ClubMemberPassCardHandle {
  download: () => Promise<void>;
}

function SkillStat({
  code,
  full,
  value,
  fg,
  label,
}: {
  code: string;
  full: string;
  value: number | string;
  fg: string;
  label: string;
}) {
  return (
    <div className="flex items-center justify-between gap-2 px-1 py-1" title={`${code}: ${full}`}>
      <span className="text-sm font-bold tabular-nums tracking-tight" style={{ color: fg }}>
        {value}
      </span>
      <div className="min-w-0 text-right">
        <div className="text-[11px] font-bold uppercase tracking-[0.06em]" style={{ color: fg }}>
          {code}
        </div>
        <div className="text-[10px] font-semibold leading-tight" style={{ color: label }}>
          {full}
        </div>
      </div>
    </div>
  );
}

export const ClubMemberPassCard = forwardRef<ClubMemberPassCardHandle, ClubMemberPassCardProps>(
  function ClubMemberPassCard(
    {
      values,
      displayName,
      clubName,
      logoSrc,
      membershipRole,
      isPlayer = false,
      teamLabel,
      readOnly = false,
      showControls = true,
      theme: controlledTheme,
      onThemeChange,
      onGenerateId,
      onDownloadComplete,
      onMemberIdClick,
      skillsSummary,
      levelLabel,
      xpValue,
      estimateGeneratedAt,
      estimateRefreshing = false,
      onRefreshEstimate,
      labels,
      className,
    },
    ref,
  ) {
    const { toast } = useToast();
    const { language } = useLanguage();
    const passRef = useRef<HTMLDivElement | null>(null);
    const [passBusy, setPassBusy] = useState(false);
    const [internalTheme, setInternalTheme] = useState<ClubMemberPassTheme>(readStoredCardTheme);
    const [flipped, setFlipped] = useState(false);
    const [marketInfoOpen, setMarketInfoOpen] = useState(false);

    const cardTheme = controlledTheme ?? internalTheme;
    const cardVars = cardThemeVars(cardTheme);
    const canFlipSkills = isPlayer && Boolean(skillsSummary);
    const canFlipClubCrest = !isPlayer && Boolean(logoSrc || clubName);
    const canFlip = canFlipSkills || canFlipClubCrest;

    useEffect(() => {
      setFlipped(false);
    }, [isPlayer]);
    /** Stronger secondary text for skills back (kids + contrast). */
    const backLabelColor =
      cardTheme === "light"
        ? "rgba(15,23,42,0.78)"
        : cardTheme === "gold"
          ? "rgba(255,246,224,0.90)"
          : "rgba(255,255,255,0.82)";

    const estimateDateLabel = useMemo(() => {
      const when = estimateGeneratedAt ? new Date(estimateGeneratedAt) : new Date();
      const date = when.toLocaleDateString(language === "de" ? "de-DE" : "en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
      return labels.marketEstimatedOn.replace("{date}", date);
    }, [estimateGeneratedAt, language, labels.marketEstimatedOn]);

    const setCardTheme = (next: ClubMemberPassTheme) => {
      if (onThemeChange) onThemeChange(next);
      else setInternalTheme(next);
      try {
        localStorage.setItem(CARD_THEME_STORAGE_KEY, next);
      } catch {
        /* ignore */
      }
    };

    const memberNameFromMaster = `${values.first_name || ""} ${values.last_name || ""}`.trim();
    const memberName = memberNameFromMaster || displayName || "Member";
    const memberSince = values.club_registration_date ? String(values.club_registration_date) : null;
    const birthDate = values.birth_date ? String(values.birth_date) : null;
    const memberIdNo = values.internal_club_number ? String(values.internal_club_number) : null;
    const passNumber = values.player_passport_number ? String(values.player_passport_number) : null;

    const passExportBackground =
      cardTheme === "light" ? "#f4f5f7" : cardTheme === "gold" ? "#2a1b0b" : "#0c0c0f";

    const passAccentGradient =
      cardTheme === "gold"
        ? "linear-gradient(90deg, #ffd870 0%, #ffb347 50%, #ffd870 100%)"
        : cardTheme === "light"
          ? "linear-gradient(90deg, #c4952a 0%, #f59e0b 50%, #c4952a 100%)"
          : "linear-gradient(90deg, #c4952a 0%, #fbbf24 50%, #c4952a 100%)";

    const confidenceCopy =
      !skillsSummary || !skillsSummary.hasRecording
        ? labels.noProgress
        : skillsSummary.market.confidence === "high"
          ? labels.marketConfidenceHigh
          : skillsSummary.market.confidence === "medium"
            ? labels.marketConfidenceMedium
            : labels.marketConfidenceLow;

    const scoreOrEmpty = (n: number) =>
      skillsSummary?.hasRecording ? n : CLUB_PASS_EMPTY_VALUE;

    const handleDownloadPass = async () => {
      if (flipped) {
        setFlipped(false);
        await new Promise((r) => setTimeout(r, 700));
      }
      if (!passRef.current) return;
      setPassBusy(true);
      try {
        const url = await captureClubPassAsPng(passRef.current, passExportBackground);
        const a = document.createElement("a");
        a.href = url;
        a.download = `club-pass-${values.internal_club_number || "member"}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        onDownloadComplete?.();
      } catch (err) {
        const message = err instanceof Error ? err.message : labels.downloadFailed;
        toast({
          title: labels.downloadFailed,
          description: message,
          variant: "destructive",
        });
      } finally {
        setPassBusy(false);
      }
    };

    useImperativeHandle(ref, () => ({
      download: handleDownloadPass,
    }));

    const cardShellStyle = {
      background: cardVars.bg,
      border: `1px solid ${cardVars.border}`,
      fontFamily: CLUB_PASS_FONT,
    } as const;

    const decoration = (
      <div
        data-club-pass-decoration
        className="pointer-events-none absolute inset-0 z-0 overflow-hidden rounded-3xl"
        aria-hidden
      >
        <div
          className="absolute -bottom-16 -right-16 h-40 w-40 rounded-full blur-3xl"
          style={{ background: "rgba(34,197,94,0.16)" }}
        />
        <div
          className="absolute -bottom-20 left-8 h-32 w-32 rounded-full blur-3xl"
          style={{ background: "rgba(196,149,42,0.14)" }}
        />
      </div>
    );

    const footerStripe = (
      <div className="overflow-hidden rounded-b-3xl" style={{ borderTop: `1px solid ${cardVars.softBorder}` }}>
        <div className="h-5" style={{ background: cardVars.stripe }} />
        <div className="h-1.5" style={{ background: passAccentGradient }} />
      </div>
    );

    return (
      <div className={cn("flex w-full min-w-0 flex-col", className)}>
        {showControls && !readOnly ? (
          <div className="mb-4 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap gap-2">
                {onGenerateId ? (
                  <Button type="button" size="sm" variant="outline" onClick={onGenerateId} className="text-sm">
                    <Ai4TLogo size="xs" variant="bubble" className="mr-1.5" /> {labels.generateId}
                  </Button>
                ) : null}
                <Button
                  type="button"
                  size="sm"
                  className="bg-gradient-gold-static text-primary-foreground text-sm"
                  disabled={passBusy || !values.internal_club_number}
                  onClick={() => void handleDownloadPass()}
                >
                  {passBusy ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Download className="w-4 h-4 mr-1.5" />}
                  {labels.downloadPass}
                </Button>
              </div>

              <div className="flex items-center gap-1.5 rounded-xl border border-border/60 bg-background/40 p-1">
                {([
                  { id: "light" as const, label: labels.themeLight, icon: Sun },
                  { id: "dark" as const, label: labels.themeDark, icon: Moon },
                  { id: "gold" as const, label: labels.themeGold, icon: Crown },
                ]).map((item) => {
                  const Icon = item.icon;
                  const isActive = cardTheme === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setCardTheme(item.id)}
                      className={cn(
                        "inline-flex items-center justify-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors",
                        isActive
                          ? "bg-primary/12 text-primary border border-primary/20"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted/40",
                      )}
                      aria-pressed={isActive}
                      title={item.label}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        ) : null}

        {canFlip ? (
          <p className="mb-2 flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
            <RotateCcw className="h-3.5 w-3.5" />
            {flipped
              ? labels.flipBackHint
              : isPlayer
                ? labels.flipHint
                : labels.flipClubHint}
          </p>
        ) : null}

        <div
          className="flex items-start justify-center py-2"
          style={canFlip ? { perspective: "1200px", WebkitPerspective: "1200px" } : undefined}
        >
          <div
            className="relative w-[380px] max-w-full shrink-0"
            style={canFlip ? { minHeight: CARD_FLIP_MIN_HEIGHT } : undefined}
          >
            <div
              role={canFlip ? "button" : undefined}
              tabIndex={canFlip ? 0 : undefined}
              aria-pressed={canFlip ? flipped : undefined}
              onClick={canFlip ? () => setFlipped((v) => !v) : undefined}
              onKeyDown={
                canFlip
                  ? (e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setFlipped((v) => !v);
                      }
                    }
                  : undefined
              }
              className={cn("relative w-full", canFlip && "cursor-pointer")}
              style={
                canFlip
                  ? {
                      minHeight: CARD_FLIP_MIN_HEIGHT,
                      transformStyle: "preserve-3d",
                      WebkitTransformStyle: "preserve-3d",
                      transition: "transform 0.65s cubic-bezier(0.4, 0.2, 0.2, 1)",
                      transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
                      WebkitTransform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
                    }
                  : undefined
              }
            >
            <div
              ref={passRef}
              data-club-pass-root
              aria-hidden={flipped && canFlip ? true : undefined}
              className={cn(
                "rounded-3xl text-left shadow-xl select-none",
                canFlip ? "absolute inset-0 flex flex-col" : "relative",
              )}
              style={{
                ...cardShellStyle,
                ...(canFlip
                  ? {
                      ...cardFaceHiddenStyle,
                      pointerEvents: flipped ? "none" : "auto",
                    }
                  : null),
              }}
            >
              {decoration}
              <div className={cn("relative z-10 flex flex-col rounded-3xl", canFlip && "h-full min-h-0")}>
                <div
                  data-club-pass-header
                  className="grid shrink-0 items-start gap-x-3 rounded-t-3xl px-5 py-3.5"
                  style={{
                    gridTemplateColumns: "auto minmax(0, 1fr) auto",
                    borderBottom: `1px solid ${cardVars.softBorder}`,
                    background: cardTheme === "light" ? "rgba(255,255,255,0.72)" : "rgba(0,0,0,0.28)",
                  }}
                >
                  {logoSrc ? (
                    <img
                      src={logoSrc}
                      alt={clubName ? `${clubName} logo` : "Club logo"}
                      className="mt-0.5 h-9 w-9 shrink-0 rounded-xl object-cover"
                      style={{ background: cardVars.soft, border: `1px solid ${cardVars.softBorder}` }}
                    />
                  ) : (
                    <div
                      className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xs font-bold"
                      style={{
                        background: cardVars.soft,
                        border: `1px solid ${cardVars.softBorder}`,
                        color: cardVars.muted,
                      }}
                    >
                      {(clubName || "C")[0]}
                    </div>
                  )}

                  <div className="min-w-0">
                    <span
                      data-club-pass-header-line
                      data-line-height="18"
                      className="uppercase"
                      style={clubPassHeaderLineStyle(cardVars.muted, 11, 18, {
                        fontWeight: 500,
                        letterSpacing: "0.05em",
                      })}
                    >
                      {clubName || "Club"}
                    </span>
                    <span
                      data-club-pass-header-line
                      data-line-height="20"
                      className="mt-1.5 font-semibold"
                      style={clubPassHeaderLineStyle(cardVars.fg, 12, 20, {
                        fontWeight: 600,
                        letterSpacing: "0.03em",
                      })}
                    >
                      {labels.memberIdCard}
                    </span>
                  </div>

                  <div className="flex shrink-0 items-center gap-2 pt-0.5">
                    <img
                      src={one4teamLogo}
                      alt="ONE4Team"
                      className="h-7 w-7 rounded-lg p-1 object-contain"
                      style={{ background: cardVars.soft, border: `1px solid ${cardVars.softBorder}` }}
                    />
                    <span
                      data-club-pass-header-line
                      data-line-height="18"
                      className="uppercase"
                      style={clubPassHeaderLineStyle(cardVars.muted, 11, 18, { letterSpacing: "0.05em" })}
                    >
                      ONE4TEAM
                    </span>
                  </div>
                </div>

                <div className={cn("relative px-5 pt-4 pb-5", canFlip && "flex-1")}>
                  <div className="flex items-start gap-3">
                    <div
                      className="flex h-16 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl"
                      style={{ background: cardVars.soft, border: `1px solid ${cardVars.softBorder}` }}
                    >
                      {typeof values.photo_url === "string" && values.photo_url.trim() ? (
                        <img src={values.photo_url.trim()} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <UserCircle2 className="h-8 w-8" style={{ color: cardVars.muted }} />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="break-words text-[15px] font-bold leading-snug" style={{ color: cardVars.fg }}>
                        {memberName}
                      </div>
                      <div className="mt-2.5 grid grid-cols-2 gap-x-3 gap-y-2.5 text-[11px]">
                        <div className="min-w-0">
                          <div className="font-bold leading-4" style={{ color: cardVars.muted }}>
                            {labels.memberSince}
                          </div>
                          <div className="mt-0.5 text-[12px] font-semibold leading-4" style={{ color: cardVars.fg }}>
                            {memberSince || "-"}
                          </div>
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold leading-4" style={{ color: cardVars.muted }}>
                            {labels.dateOfBirth}
                          </div>
                          <div className="mt-0.5 text-[12px] font-semibold leading-4" style={{ color: cardVars.fg }}>
                            {birthDate || "-"}
                          </div>
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold leading-4" style={{ color: cardVars.muted }}>
                            {labels.role}
                          </div>
                          <div className="mt-0.5 text-[12px] font-semibold leading-4" style={{ color: cardVars.fg }}>
                            {membershipRole?.trim() ? membershipRole.replace(/_/g, " ") : "-"}
                          </div>
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold leading-4" style={{ color: cardVars.muted }}>
                            {labels.team}
                          </div>
                          <div className="mt-0.5 break-words text-[12px] font-semibold leading-4" style={{ color: cardVars.fg }}>
                            {teamLabel || "-"}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="max-w-[96px] shrink-0 text-right">
                      <div className="text-[11px] font-bold leading-4" style={{ color: cardVars.muted }}>
                        {labels.idNo}
                      </div>
                      {memberIdNo && onMemberIdClick ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onMemberIdClick();
                          }}
                          className="mt-0.5 break-all text-left font-mono text-[12px] font-bold leading-4 underline-offset-2 hover:underline"
                          style={{ color: cardVars.accent }}
                        >
                          {memberIdNo}
                        </button>
                      ) : (
                        <div
                          className="mt-0.5 break-all font-mono text-[12px] font-bold leading-4"
                          style={{ color: cardVars.accent }}
                        >
                          {memberIdNo || "-"}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
                    <div
                      className="rounded-2xl px-3 py-2.5"
                      style={{ background: cardVars.soft, border: `1px solid ${cardVars.softBorder}` }}
                    >
                      <div className="font-bold leading-4" style={{ color: cardVars.muted }}>
                        {labels.membership}
                      </div>
                      <div className="mt-0.5 break-words text-[12px] font-semibold leading-4" style={{ color: cardVars.fg }}>
                        {values.membership_kind ? String(values.membership_kind).replace(/_/g, " ") : "-"}
                      </div>
                    </div>
                    <div
                      className="rounded-2xl px-3 py-2.5"
                      style={{ background: cardVars.soft, border: `1px solid ${cardVars.softBorder}` }}
                    >
                      <div className="font-bold leading-4" style={{ color: cardVars.muted }}>
                        {labels.passNumber}
                      </div>
                      <div className="mt-0.5 break-all text-[12px] font-semibold leading-4" style={{ color: cardVars.fg }}>
                        {passNumber || "-"}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-auto shrink-0">{footerStripe}</div>
              </div>
            </div>

            {canFlipSkills && skillsSummary ? (
              <div
                aria-hidden={!flipped}
                className="absolute inset-0 flex flex-col rounded-3xl text-left shadow-xl select-none"
                style={{
                  ...cardShellStyle,
                  ...cardFaceHiddenStyle,
                  transform: "rotateY(180deg)",
                  WebkitTransform: "rotateY(180deg)",
                  pointerEvents: flipped ? "auto" : "none",
                }}
              >
                {decoration}
                <div className="relative z-10 flex h-full min-h-0 flex-col rounded-3xl">
                  <div
                    className="flex shrink-0 items-center justify-between gap-3 rounded-t-3xl px-5 py-3"
                    style={{
                      borderBottom: `1px solid ${cardVars.softBorder}`,
                      background: cardTheme === "light" ? "rgba(255,255,255,0.72)" : "rgba(0,0,0,0.28)",
                    }}
                  >
                    <div className="min-w-0">
                      <div
                        className="text-[10px] font-bold uppercase tracking-[0.12em]"
                        style={{ color: backLabelColor }}
                      >
                        {labels.skillsTitle}
                      </div>
                      <div className="mt-0.5 truncate text-sm font-semibold" style={{ color: cardVars.fg }}>
                        {memberName}
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-col items-end" title={`${labels.overall}: ${labels.overallFull}`}>
                      <div
                        className="font-display text-3xl font-bold leading-none tabular-nums"
                        style={{ color: cardVars.accent }}
                      >
                        {scoreOrEmpty(skillsSummary.scores.overall)}
                      </div>
                      <div
                        className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.12em]"
                        style={{ color: cardVars.fg }}
                      >
                        {labels.overall}
                      </div>
                      <div className="text-[10px] font-semibold leading-tight" style={{ color: backLabelColor }}>
                        {labels.overallFull}
                      </div>
                    </div>
                  </div>

                  <div className="flex min-h-0 flex-1 flex-col px-5 py-4">
                    <div
                      className="mb-2 text-[10px] font-bold uppercase tracking-[0.1em]"
                      style={{ color: backLabelColor }}
                    >
                      {labels.skillsOverview}
                    </div>
                    <div
                      className="grid grid-cols-2 gap-x-3 rounded-2xl px-2.5 py-1.5"
                      style={{ background: cardVars.soft, border: `1px solid ${cardVars.softBorder}` }}
                    >
                      <div className="space-y-0.5 border-r pr-2" style={{ borderColor: cardVars.softBorder }}>
                        <SkillStat
                          code={labels.skillTec}
                          full={labels.skillTecFull}
                          value={scoreOrEmpty(skillsSummary.scores.technique)}
                          fg={cardVars.fg}
                          label={backLabelColor}
                        />
                        <SkillStat
                          code={labels.skillFit}
                          full={labels.skillFitFull}
                          value={scoreOrEmpty(skillsSummary.scores.fitness)}
                          fg={cardVars.fg}
                          label={backLabelColor}
                        />
                        <SkillStat
                          code={labels.skillTac}
                          full={labels.skillTacFull}
                          value={scoreOrEmpty(skillsSummary.scores.tactics)}
                          fg={cardVars.fg}
                          label={backLabelColor}
                        />
                      </div>
                      <div className="space-y-0.5 pl-1">
                        <SkillStat
                          code={labels.skillMnd}
                          full={labels.skillMndFull}
                          value={scoreOrEmpty(skillsSummary.scores.mindset)}
                          fg={cardVars.fg}
                          label={backLabelColor}
                        />
                        <SkillStat
                          code={labels.skillAtt}
                          full={labels.skillAttFull}
                          value={scoreOrEmpty(skillsSummary.scores.attendance)}
                          fg={cardVars.fg}
                          label={backLabelColor}
                        />
                        <SkillStat
                          code={labels.skillCmp}
                          full={labels.skillCmpFull}
                          value={scoreOrEmpty(skillsSummary.scores.competition)}
                          fg={cardVars.fg}
                          label={backLabelColor}
                        />
                      </div>
                    </div>

                    <div className="mt-3 flex items-center justify-between gap-2 text-[11px]">
                      <span className="font-semibold" style={{ color: backLabelColor }}>
                        {labels.level}
                        {skillsSummary.hasRecording && levelLabel
                          ? ` · ${levelLabel}`
                          : ` · ${CLUB_PASS_EMPTY_VALUE}`}
                      </span>
                      <span className="font-bold tabular-nums" style={{ color: cardVars.fg }}>
                        {labels.xp}{" "}
                        {skillsSummary.hasRecording && xpValue != null
                          ? xpValue
                          : CLUB_PASS_EMPTY_VALUE}
                      </span>
                    </div>

                    <div
                      className="mt-auto rounded-2xl px-3.5 py-3"
                      style={{ background: cardVars.soft, border: `1px solid ${cardVars.softBorder}` }}
                      onClick={(e) => e.stopPropagation()}
                      onKeyDown={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div
                            className="text-[10px] font-bold uppercase tracking-[0.08em]"
                            style={{ color: backLabelColor }}
                          >
                            {labels.marketValue}
                          </div>
                          <div
                            className="mt-1 font-display text-xl font-bold tracking-tight tabular-nums"
                            style={{ color: cardVars.fg }}
                          >
                            {skillsSummary.hasRecording
                              ? skillsSummary.market.label
                              : CLUB_PASS_EMPTY_VALUE}
                          </div>
                        </div>
                        <div className="flex shrink-0 items-start gap-1.5">
                          <div className="flex min-w-0 flex-col items-end gap-1.5">
                            <div
                              className="inline-flex min-w-0 items-center gap-1.5 rounded-full border px-2.5 py-1.5"
                              style={{
                                borderColor: cardVars.accent,
                                background: cardTheme === "light" ? "rgba(196,149,42,0.12)" : "rgba(255,216,112,0.14)",
                                color: cardVars.fg,
                              }}
                            >
                              <Ai4TInlineLabel
                                text={labels.marketValueAi}
                                logoClassName="!h-[1.2rem] !w-[1.2rem]"
                                textClassName="text-[11px] font-bold"
                              />
                            </div>
                            {skillsSummary.hasRecording ? (
                              <p
                                className="max-w-[11rem] text-right text-[10px] font-semibold leading-snug"
                                style={{ color: backLabelColor }}
                              >
                                {estimateDateLabel}
                              </p>
                            ) : null}
                          </div>
                          <div className="flex flex-col items-center gap-1.5">
                            <Popover open={marketInfoOpen} onOpenChange={setMarketInfoOpen}>
                              <PopoverTrigger asChild>
                                <button
                                  type="button"
                                  className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border"
                                  style={{
                                    borderColor: cardVars.accent,
                                    background: cardTheme === "light" ? "rgba(196,149,42,0.12)" : "rgba(255,216,112,0.14)",
                                  }}
                                  aria-label={labels.marketInfoTitle}
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <Info className="h-3.5 w-3.5" style={{ color: cardVars.accent }} />
                                </button>
                              </PopoverTrigger>
                              <PopoverContent
                                align="end"
                                className="z-[200] w-72 space-y-2.5 p-3.5 text-[13px] leading-relaxed"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <div className="font-semibold text-foreground">
                                  {labels.marketInfoTitle}
                                </div>
                                <p className="text-foreground/85">
                                  <BrandedText text={labels.marketInfoBody} ai4tOnly />
                                </p>
                                {skillsSummary.hasRecording ? (
                                  <p className="font-medium text-foreground">{estimateDateLabel}</p>
                                ) : null}
                                <p className="text-foreground/85">{confidenceCopy}</p>
                              </PopoverContent>
                            </Popover>
                            {onRefreshEstimate ? (
                              <button
                                type="button"
                                className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border"
                                style={{
                                  borderColor: cardVars.accent,
                                  background: cardTheme === "light" ? "rgba(196,149,42,0.12)" : "rgba(255,216,112,0.14)",
                                  color: cardVars.accent,
                                }}
                                aria-label={labels.marketRefresh}
                                title={labels.marketRefresh}
                                disabled={estimateRefreshing}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onRefreshEstimate();
                                }}
                              >
                                <RefreshCw
                                  className={cn("h-3.5 w-3.5", estimateRefreshing && "animate-spin")}
                                />
                              </button>
                            ) : null}
                          </div>
                        </div>
                      </div>
                      <p className="mt-2 text-[11px] font-medium leading-relaxed" style={{ color: backLabelColor }}>
                        {confidenceCopy}
                      </p>
                    </div>
                  </div>

                  <div className="shrink-0">{footerStripe}</div>
                </div>
              </div>
            ) : canFlipClubCrest ? (
              <div
                aria-hidden={!flipped}
                className="absolute inset-0 flex flex-col rounded-3xl text-left shadow-xl select-none"
                style={{
                  ...cardShellStyle,
                  ...cardFaceHiddenStyle,
                  transform: "rotateY(180deg)",
                  WebkitTransform: "rotateY(180deg)",
                  pointerEvents: flipped ? "auto" : "none",
                }}
              >
                {decoration}
                <div className="relative z-10 flex h-full min-h-0 flex-col items-center justify-center gap-5 rounded-3xl px-6 py-8">
                  {logoSrc ? (
                    <img
                      src={logoSrc}
                      alt={clubName ? `${clubName} logo` : "Club logo"}
                      className="h-36 w-36 rounded-[1.75rem] object-cover shadow-lg sm:h-40 sm:w-40"
                      style={{
                        background: cardVars.soft,
                        border: `1px solid ${cardVars.softBorder}`,
                      }}
                    />
                  ) : (
                    <div
                      className="flex h-36 w-36 items-center justify-center rounded-[1.75rem] text-4xl font-bold sm:h-40 sm:w-40"
                      style={{
                        background: cardVars.soft,
                        border: `1px solid ${cardVars.softBorder}`,
                        color: cardVars.accent,
                      }}
                    >
                      {(clubName || "C")[0]}
                    </div>
                  )}
                  {clubName ? (
                    <div className="max-w-[16rem] text-center">
                      <div
                        className="text-[10px] font-bold uppercase tracking-[0.14em]"
                        style={{ color: backLabelColor }}
                      >
                        {labels.memberIdCard}
                      </div>
                      <div
                        className="mt-1.5 font-display text-lg font-bold leading-snug tracking-tight"
                        style={{ color: cardVars.fg }}
                      >
                        {clubName}
                      </div>
                    </div>
                  ) : null}
                </div>
                <div className="absolute inset-x-0 bottom-0 shrink-0">{footerStripe}</div>
              </div>
            ) : null}
            </div>
          </div>
        </div>
      </div>
    );
  },
);
