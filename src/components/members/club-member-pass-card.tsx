import { forwardRef, useImperativeHandle, useRef, useState } from "react";
import { Crown, Download, Loader2, Moon, Sun, UserCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Ai4TLogo } from "@/components/ai/Ai4TLogo";
import type { ClubMemberMasterRecord } from "@/lib/member-master-schema";
import { captureClubPassAsPng } from "@/lib/club-pass-capture";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import one4teamLogo from "@/assets/one4team-logo.png";

export type ClubMemberPassTheme = "light" | "dark" | "gold";

const CLUB_PASS_FONT = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
const CARD_THEME_STORAGE_KEY = "one4team.clubCardTheme";

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
      muted: "rgba(15,23,42,0.55)",
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
      muted: "rgba(255,246,224,0.70)",
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
    muted: "rgba(255,255,255,0.55)",
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
}

export interface ClubMemberPassCardProps {
  values: Partial<ClubMemberMasterRecord>;
  displayName?: string;
  clubName?: string | null;
  logoSrc?: string;
  membershipRole?: string;
  teamLabel?: string;
  readOnly?: boolean;
  showControls?: boolean;
  theme?: ClubMemberPassTheme;
  onThemeChange?: (theme: ClubMemberPassTheme) => void;
  onGenerateId?: () => void;
  onDownloadComplete?: () => void;
  onMemberIdClick?: () => void;
  labels: ClubMemberPassCardLabels;
  className?: string;
}

export interface ClubMemberPassCardHandle {
  download: () => Promise<void>;
}

export const ClubMemberPassCard = forwardRef<ClubMemberPassCardHandle, ClubMemberPassCardProps>(
  function ClubMemberPassCard(
    {
      values,
      displayName,
      clubName,
      logoSrc,
      membershipRole,
      teamLabel,
      readOnly = false,
      showControls = true,
      theme: controlledTheme,
      onThemeChange,
      onGenerateId,
      onDownloadComplete,
      onMemberIdClick,
      labels,
      className,
    },
    ref,
  ) {
    const { toast } = useToast();
    const passRef = useRef<HTMLDivElement | null>(null);
    const [passBusy, setPassBusy] = useState(false);
    const [internalTheme, setInternalTheme] = useState<ClubMemberPassTheme>(readStoredCardTheme);

    const cardTheme = controlledTheme ?? internalTheme;
    const cardVars = cardThemeVars(cardTheme);

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

    const handleDownloadPass = async () => {
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

        <div className="flex items-start justify-center py-2">
          <div
            ref={passRef}
            data-club-pass-root
            className={cn(
              "h-fit w-[380px] max-w-full shrink-0",
              "relative rounded-3xl shadow-xl text-left select-none",
            )}
            style={{
              background: cardVars.bg,
              border: `1px solid ${cardVars.border}`,
              fontFamily: CLUB_PASS_FONT,
            }}
          >
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

            <div className="relative z-10 rounded-3xl">
              <div
                data-club-pass-header
                className="grid items-start gap-x-3 rounded-t-3xl px-5 py-3.5"
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
                    style={{ background: cardVars.soft, border: `1px solid ${cardVars.softBorder}`, color: cardVars.muted }}
                  >
                    {(clubName || "C")[0]}
                  </div>
                )}

                <div className="min-w-0">
                  <span
                    data-club-pass-header-line
                    data-line-height="18"
                    className="uppercase"
                    style={clubPassHeaderLineStyle(cardVars.muted, 11, 18, { fontWeight: 500, letterSpacing: "0.05em" })}
                  >
                    {clubName || "Club"}
                  </span>
                  <span
                    data-club-pass-header-line
                    data-line-height="20"
                    className="mt-1.5 font-semibold"
                    style={clubPassHeaderLineStyle(cardVars.fg, 12, 20, { fontWeight: 600, letterSpacing: "0.03em" })}
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

              <div className="relative px-5 pt-4 pb-5">
                <div className="flex items-start gap-3">
                  <div
                    className="h-16 w-14 rounded-2xl overflow-hidden flex items-center justify-center shrink-0"
                    style={{ background: cardVars.soft, border: `1px solid ${cardVars.softBorder}` }}
                  >
                    {typeof values.photo_url === "string" && values.photo_url.trim() ? (
                      <img src={values.photo_url.trim()} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <UserCircle2 className="h-8 w-8" style={{ color: cardVars.muted }} />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="text-[14px] font-semibold leading-snug break-words" style={{ color: cardVars.fg }}>
                      {memberName}
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-2 text-[10px]">
                      <div className="min-w-0">
                        <div className="leading-4" style={{ color: cardVars.muted }}>{labels.memberSince}</div>
                        <div className="font-medium leading-4 mt-0.5" style={{ color: cardVars.fg }}>{memberSince || "-"}</div>
                      </div>
                      <div className="min-w-0">
                        <div className="leading-4" style={{ color: cardVars.muted }}>{labels.dateOfBirth}</div>
                        <div className="font-medium leading-4 mt-0.5" style={{ color: cardVars.fg }}>{birthDate || "-"}</div>
                      </div>
                      <div className="min-w-0">
                        <div className="leading-4" style={{ color: cardVars.muted }}>{labels.role}</div>
                        <div className="font-medium leading-4 mt-0.5" style={{ color: cardVars.fg }}>
                          {membershipRole?.trim() ? membershipRole.replace(/_/g, " ") : "-"}
                        </div>
                      </div>
                      <div className="min-w-0">
                        <div className="leading-4" style={{ color: cardVars.muted }}>{labels.team}</div>
                        <div className="font-medium leading-4 mt-0.5 break-words" style={{ color: cardVars.fg }}>{teamLabel || "-"}</div>
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0 text-right max-w-[96px]">
                    <div className="text-[10px] leading-4" style={{ color: cardVars.muted }}>{labels.idNo}</div>
                    {memberIdNo && onMemberIdClick ? (
                      <button
                        type="button"
                        onClick={onMemberIdClick}
                        className="font-mono text-[12px] font-semibold leading-4 mt-0.5 break-all text-left underline-offset-2 hover:underline"
                        style={{ color: cardVars.accent }}
                      >
                        {memberIdNo}
                      </button>
                    ) : (
                      <div className="font-mono text-[12px] font-semibold leading-4 mt-0.5 break-all" style={{ color: cardVars.accent }}>
                        {memberIdNo || "-"}
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2 text-[10px]">
                  <div className="rounded-2xl px-3 py-2.5" style={{ background: cardVars.soft, border: `1px solid ${cardVars.softBorder}` }}>
                    <div className="leading-4" style={{ color: cardVars.muted }}>{labels.membership}</div>
                    <div className="font-medium leading-4 mt-0.5 break-words" style={{ color: cardVars.fg }}>
                      {values.membership_kind ? String(values.membership_kind).replace(/_/g, " ") : "-"}
                    </div>
                  </div>
                  <div className="rounded-2xl px-3 py-2.5" style={{ background: cardVars.soft, border: `1px solid ${cardVars.softBorder}` }}>
                    <div className="leading-4" style={{ color: cardVars.muted }}>{labels.passNumber}</div>
                    <div className="font-medium leading-4 mt-0.5 break-all" style={{ color: cardVars.fg }}>
                      {passNumber || "-"}
                    </div>
                  </div>
                </div>
              </div>

              <div className="overflow-hidden rounded-b-3xl" style={{ borderTop: `1px solid ${cardVars.softBorder}` }}>
                <div className="h-5" style={{ background: cardVars.stripe }} />
                <div className="h-1.5" style={{ background: passAccentGradient }} />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  },
);
