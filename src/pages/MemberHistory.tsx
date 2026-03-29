import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  CalendarClock,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  FileSpreadsheet,
  History,
  Link2,
  Loader2,
  RefreshCw,
  UserPlus,
  Users,
  UserMinus,
  Pencil,
  Shield,
} from "lucide-react";
import { DashboardHeaderSlot } from "@/components/layout/DashboardHeaderSlot";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useClubId } from "@/hooks/use-club-id";
import { useLanguage } from "@/hooks/use-language";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { Json } from "@/integrations/supabase/types";

type TimelineRow = {
  id: string;
  event_type: string;
  summary: string | null;
  detail: Json;
  actor_user_id: string | null;
  created_at: string;
  correlation_email: string | null;
  membership_id: string | null;
};

type MemberHeader = {
  id: string;
  role: string;
  status: string;
  created_at: string;
  display_name: string | null;
};

type DraftSummary = {
  id: string;
  name: string | null;
  email: string;
  role: string;
  status: "draft" | "invited";
  invited_at: string | null;
  created_at: string;
};

function formatJsonPreview(detail: Json): string {
  if (detail === null || detail === undefined) return "";
  try {
    return JSON.stringify(detail, null, 2);
  } catch {
    return String(detail);
  }
}

function MemberHistory() {
  const { membershipId, draftId } = useParams<{ membershipId?: string; draftId?: string }>();
  const navigate = useNavigate();
  const { clubId, loading: clubLoading } = useClubId();
  const { t } = useLanguage();
  const { toast } = useToast();

  const [member, setMember] = useState<MemberHeader | null>(null);
  const [draftSummary, setDraftSummary] = useState<DraftSummary | null>(null);
  const [memberEmail, setMemberEmail] = useState<string | null>(null);
  const [rows, setRows] = useState<TimelineRow[]>([]);
  const [actorNames, setActorNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [missingFn, setMissingFn] = useState(false);

  const eventMeta = useMemo(
    () =>
      ({
        membership_joined: { icon: UserPlus, tone: "text-emerald-400 bg-emerald-500/10" },
        membership_profile_updated: { icon: Pencil, tone: "text-sky-400 bg-sky-500/10" },
        membership_removed: { icon: UserMinus, tone: "text-rose-400 bg-rose-500/10" },
        draft_saved: { icon: ClipboardList, tone: "text-amber-400 bg-amber-500/10" },
        draft_added_to_list: { icon: Users, tone: "text-violet-400 bg-violet-500/10" },
        draft_removed: { icon: UserMinus, tone: "text-muted-foreground bg-muted" },
        invite_sent: { icon: Link2, tone: "text-primary bg-primary/10" },
        invite_resent: { icon: RefreshCw, tone: "text-cyan-400 bg-cyan-500/10" },
        registry_updated: { icon: FileSpreadsheet, tone: "text-orange-400 bg-orange-500/10" },
        registry_import_row: { icon: FileSpreadsheet, tone: "text-orange-300 bg-orange-500/10" },
      }) as Record<string, { icon: typeof History; tone: string }>,
    [],
  );

  const getRoleLabel = useCallback(
    (role: string) => {
      switch (role) {
        case "admin":
          return t.onboarding.clubAdmin;
        case "trainer":
          return t.onboarding.trainer;
        case "player":
          return t.onboarding.player;
        case "staff":
          return t.onboarding.teamStaff;
        case "member":
          return t.onboarding.member;
        case "parent":
          return t.onboarding.parentSupporter;
        case "sponsor":
          return t.onboarding.sponsor;
        case "supplier":
          return t.onboarding.supplier;
        case "service_provider":
          return t.onboarding.serviceProvider;
        case "consultant":
          return t.onboarding.consultant;
        default:
          return role.replace(/_/g, " ");
      }
    },
    [t],
  );

  const load = useCallback(async () => {
    if (!clubId) return;
    setLoading(true);
    setMissingFn(false);

    async function resolveActors(list: TimelineRow[]) {
      const actorIds = [...new Set(list.map((r) => r.actor_user_id).filter(Boolean) as string[])];
      if (actorIds.length) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("user_id, display_name")
          .in("user_id", actorIds);
        const map: Record<string, string> = {};
        for (const p of (profs as { user_id: string; display_name: string | null }[] | null) ?? []) {
          if (p.user_id) map[p.user_id] = p.display_name?.trim() || p.user_id.slice(0, 8);
        }
        setActorNames(map);
      } else {
        setActorNames({});
      }
    }

    function handleTimelineError(tlErr: { message?: string }) {
      const msg = tlErr.message || "";
      if (msg.includes("function") && msg.includes("does not exist")) {
        setMissingFn(true);
        setRows([]);
      } else if (msg.includes("Not authorized")) {
        toast({ title: t.common.notAuthorized, description: msg, variant: "destructive" });
        setRows([]);
      } else {
        toast({ title: t.common.error, description: msg, variant: "destructive" });
        setRows([]);
      }
    }

    if (draftId) {
      setMember(null);
      const { data: dr, error: dErr } = await supabase
        .from("club_member_drafts")
        .select("id, name, email, role, status, invited_at, created_at")
        .eq("club_id", clubId)
        .eq("id", draftId)
        .maybeSingle();

      if (dErr) {
        toast({ title: t.common.error, description: dErr.message, variant: "destructive" });
        setDraftSummary(null);
        setMemberEmail(null);
        setRows([]);
        setLoading(false);
        return;
      }

      if (!dr) {
        setDraftSummary(null);
        setMemberEmail(null);
        setRows([]);
        setLoading(false);
        return;
      }

      setDraftSummary({
        ...dr,
        status: dr.status === "invited" ? "invited" : "draft",
      });
      setMemberEmail(dr.email?.trim() || null);

      const { data: timeline, error: tlErr } = await supabase.rpc("get_club_member_audit_timeline_for_draft", {
        _club_id: clubId,
        _draft_id: draftId,
      });

      if (tlErr) {
        handleTimelineError(tlErr);
        setLoading(false);
        return;
      }

      const list = (timeline ?? []) as TimelineRow[];
      setRows(list);
      await resolveActors(list);
      setLoading(false);
      return;
    }

    setDraftSummary(null);

    if (!membershipId) {
      setMember(null);
      setMemberEmail(null);
      setRows([]);
      setLoading(false);
      return;
    }

    const { data: memRaw, error: memErr } = await supabase
      .from("club_memberships")
      .select("id, role, status, created_at, profiles!club_memberships_profile_fk(display_name)")
      .eq("club_id", clubId)
      .eq("id", membershipId)
      .maybeSingle();

    if (memErr || !memRaw) {
      setMember(null);
      setRows([]);
      setLoading(false);
      if (memErr) {
        toast({ title: t.common.error, description: memErr.message, variant: "destructive" });
      }
      return;
    }

    const mem = memRaw as unknown as MemberHeader & { profiles?: { display_name: string | null } };
    setMember({
      id: mem.id,
      role: mem.role,
      status: mem.status,
      created_at: mem.created_at,
      display_name: mem.profiles?.display_name ?? null,
    });

    const { data: emailRows } = await supabase.rpc("list_club_membership_emails", { _club_id: clubId });
    const emailEntry = ((emailRows as { membership_id: string; email: string }[] | null) ?? []).find(
      (r) => r.membership_id === membershipId,
    );
    setMemberEmail(emailEntry?.email?.trim() || null);

    const { data: timeline, error: tlErr } = await supabase.rpc("get_club_member_audit_timeline", {
      _club_id: clubId,
      _membership_id: membershipId,
    });

    if (tlErr) {
      handleTimelineError(tlErr);
      setLoading(false);
      return;
    }

    const list = (timeline ?? []) as TimelineRow[];
    setRows(list);
    await resolveActors(list);

    setLoading(false);
  }, [clubId, draftId, membershipId, t.common.error, t.common.notAuthorized, toast]);

  useEffect(() => {
    if (clubLoading) return;
    if (!clubId) {
      setLoading(false);
      return;
    }
    if (!draftId && !membershipId) {
      setLoading(false);
      return;
    }
    void load();
  }, [clubId, clubLoading, draftId, membershipId, load]);

  const eventTypeLabel = useCallback(
    (type: string) => {
      const key = type as keyof typeof t.memberHistoryPage.eventTypes;
      const map = t.memberHistoryPage.eventTypes;
      return (map[key] as string | undefined) ?? type.replace(/_/g, " ");
    },
    [t],
  );

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeaderSlot
        title={t.memberHistoryPage.title}
        subtitle={
          draftSummary
            ? draftSummary.name?.trim() || draftSummary.email || t.memberHistoryPage.subtitleFallback
            : member?.display_name || memberEmail || t.memberHistoryPage.subtitleFallback
        }
        rightSlot={
          <Button variant="outline" size="sm" onClick={() => navigate("/members")}>
            <ArrowLeft className="w-4 h-4 mr-1.5" /> {t.memberHistoryPage.backToMembers}
          </Button>
        }
      />

      <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 space-y-6">
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : !member && !draftSummary ? (
          <div className="rounded-xl border border-border bg-card p-8 text-center text-muted-foreground">
            {draftId ? t.memberHistoryPage.draftNotFound : t.memberHistoryPage.memberNotFound}
            <div className="mt-4">
              <Button variant="outline" onClick={() => navigate("/members")}>
                {t.memberHistoryPage.backToMembers}
              </Button>
            </div>
          </div>
        ) : (
          <>
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl border border-border/70 bg-card/80 backdrop-blur-sm p-5 shadow-sm"
            >
              {draftSummary ? (
                <>
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        {t.memberHistoryPage.draftSummaryCard}
                      </div>
                      <h2 className="mt-1 font-display text-xl font-bold text-foreground">
                        {draftSummary.name?.trim() || memberEmail || t.memberHistoryPage.unnamed}
                      </h2>
                      {draftSummary.name?.trim() && memberEmail ? (
                        <p className="text-sm text-muted-foreground mt-0.5">{memberEmail}</p>
                      ) : null}
                      <div className="flex flex-wrap gap-2 mt-3">
                        <Badge variant="secondary" className="font-normal">
                          <Shield className="w-3 h-3 mr-1" /> {getRoleLabel(draftSummary.role)}
                        </Badge>
                        <Badge variant="outline" className="font-normal">
                          {draftSummary.status === "invited" ? t.membersPage.invited : t.membersPage.draft}
                        </Badge>
                      </div>
                    </div>
                    <div className="rounded-xl bg-muted/40 border border-border/50 px-4 py-3 text-sm space-y-3 min-w-[200px]">
                      <div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <CalendarClock className="w-4 h-4 shrink-0" />
                          <span>{t.memberHistoryPage.listSince}</span>
                        </div>
                        <div className="font-medium text-foreground mt-1">
                          {new Date(draftSummary.created_at).toLocaleString()}
                        </div>
                      </div>
                      {draftSummary.status === "invited" && draftSummary.invited_at ? (
                        <div>
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <CalendarClock className="w-4 h-4 shrink-0" />
                            <span>{t.memberHistoryPage.invitedAtLabel}</span>
                          </div>
                          <div className="font-medium text-foreground mt-1">
                            {new Date(draftSummary.invited_at).toLocaleString()}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-4 leading-relaxed border-t border-border/50 pt-4">
                    {t.memberHistoryPage.draftIntro}
                  </p>
                </>
              ) : member ? (
                <>
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        {t.memberHistoryPage.summaryCard}
                      </div>
                      <h2 className="mt-1 font-display text-xl font-bold text-foreground">
                        {member.display_name || memberEmail || t.memberHistoryPage.unnamed}
                      </h2>
                      {memberEmail ? (
                        <p className="text-sm text-muted-foreground mt-0.5">{memberEmail}</p>
                      ) : null}
                      <div className="flex flex-wrap gap-2 mt-3">
                        <Badge variant="secondary" className="font-normal">
                          <Shield className="w-3 h-3 mr-1" /> {getRoleLabel(member.role)}
                        </Badge>
                        <Badge variant="outline" className="font-normal">
                          {member.status}
                        </Badge>
                      </div>
                    </div>
                    <div className="rounded-xl bg-muted/40 border border-border/50 px-4 py-3 text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <CalendarClock className="w-4 h-4 shrink-0" />
                        <span>{t.memberHistoryPage.rosterSince}</span>
                      </div>
                      <div className="font-medium text-foreground mt-1">
                        {new Date(member.created_at).toLocaleString()}
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-4 leading-relaxed border-t border-border/50 pt-4">
                    {t.memberHistoryPage.intro}
                  </p>
                </>
              ) : null}
            </motion.div>

            {missingFn ? (
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm text-amber-200/90">
                {t.memberHistoryPage.migrationHint}
              </div>
            ) : null}

            <div className="flex items-center gap-2 text-sm font-display font-semibold text-foreground">
              <History className="w-4 h-4 text-primary" />
              {t.memberHistoryPage.timelineTitle}
            </div>

            {rows.length === 0 && !missingFn ? (
              <div className="rounded-xl border border-dashed border-border/80 bg-muted/20 p-10 text-center text-sm text-muted-foreground">
                {t.memberHistoryPage.emptyTimeline}
              </div>
            ) : (
              <div className="relative pl-2">
                <div className="absolute left-[15px] top-2 bottom-2 w-px bg-border" aria-hidden />
                <ul className="space-y-0">
                  {rows.map((row, i) => {
                    const meta = eventMeta[row.event_type] ?? {
                      icon: History,
                      tone: "text-muted-foreground bg-muted",
                    };
                    const Icon = meta.icon;
                    const expanded = expandedId === row.id;
                    const detailStr = formatJsonPreview(row.detail);
                    const hasDetail = detailStr.length > 2;
                    return (
                      <motion.li
                        key={row.id}
                        initial={{ opacity: 0, x: -6 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: Math.min(i * 0.02, 0.3) }}
                        className="relative pb-8 last:pb-0"
                      >
                        <div className="flex gap-4">
                          <div
                            className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border/80 ${meta.tone}`}
                          >
                            <Icon className="h-4 w-4" />
                          </div>
                          <div className="min-w-0 flex-1 pt-0.5">
                            <div className="flex flex-wrap items-center gap-2 gap-y-1">
                              <span className="font-medium text-foreground text-sm">
                                {row.summary || eventTypeLabel(row.event_type)}
                              </span>
                              <Badge variant="outline" className="text-[10px] font-normal h-5 px-1.5">
                                {eventTypeLabel(row.event_type)}
                              </Badge>
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                              {new Date(row.created_at).toLocaleString()}
                              {row.actor_user_id ? (
                                <>
                                  {" · "}
                                  {t.memberHistoryPage.by}{" "}
                                  <span className="text-foreground/80">
                                    {actorNames[row.actor_user_id] || t.memberHistoryPage.unknownActor}
                                  </span>
                                </>
                              ) : null}
                            </div>
                            {hasDetail ? (
                              <button
                                type="button"
                                className="mt-2 flex items-center gap-1 text-xs text-primary hover:underline"
                                onClick={() => setExpandedId(expanded ? null : row.id)}
                              >
                                {expanded ? (
                                  <ChevronDown className="w-3.5 h-3.5" />
                                ) : (
                                  <ChevronRight className="w-3.5 h-3.5" />
                                )}
                                {expanded ? t.memberHistoryPage.hideDetails : t.memberHistoryPage.showDetails}
                              </button>
                            ) : null}
                            {expanded && hasDetail ? (
                              <pre className="mt-2 max-h-48 overflow-auto rounded-lg bg-muted/50 border border-border/60 p-3 text-[11px] leading-relaxed text-muted-foreground font-mono">
                                {detailStr}
                              </pre>
                            ) : null}
                          </div>
                        </div>
                      </motion.li>
                    );
                  })}
                </ul>
              </div>
            )}

            <p className="text-[11px] text-muted-foreground text-center pb-8">
              {t.memberHistoryPage.footerNote}
            </p>
          </>
        )}
      </div>
    </div>
  );
}

export default MemberHistory;
