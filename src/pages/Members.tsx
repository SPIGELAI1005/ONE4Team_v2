import { useState, useEffect, useCallback, useMemo, useRef, Fragment, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useLanguage } from "@/hooks/use-language";
import { motion } from "framer-motion";
import { DashboardHeaderSlot } from "@/components/layout/DashboardHeaderSlot";
import { BrandedText } from "@/components/ai/Ai4TBrand";
import {
  Users, Search, Plus,
  Shield, Dumbbell, Crown, UserCheck, Heart, MoreHorizontal,
  Phone, Calendar, Loader2,
  Link2, Copy, Check, Inbox, UserPlus, Clock, X, Upload, UploadCloud, Download, AlertTriangle,
  FileSpreadsheet, UserCircle2, Pencil, ChevronDown, ChevronRight, RefreshCw, History, IdCard,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { supabaseDynamic } from "@/lib/supabase-dynamic";
import { useToast } from "@/hooks/use-toast";
import { useClubId } from "@/hooks/use-club-id";
import { usePermissions } from "@/hooks/use-permissions";
import { useModuleGateRole } from "@/hooks/use-module-gate-role";
import { canAccessModule, getModuleAccess } from "@/lib/rbac-config";
import { useModuleDataScope } from "@/hooks/use-module-data-scope";
import { AiAgentHeaderButton } from "@/components/ai-agent/AiAgentHeaderButton";
import {
  generateInviteToken,
  hashInviteToken,
  MembersImportPanel,
  MembersInvitesPanel,
  MembersRolesPanel,
  MembersRosterPanel,
  MembersTabNav,
  type MembersPageTab,
} from "@/features/members";
import { useRegisterAiAgentContext } from "@/hooks/use-register-ai-agent-context";
import { trackEvent } from "@/lib/telemetry";
import { trackJoinFunnelEvent } from "@/lib/track-join-funnel";
import { trackUsageEvent } from "@/lib/usage-events";
import { isUnder18 } from "@/lib/under-18";
import { photoValidUntil } from "@/lib/member-photo-validity";
import type { ClubMemberMasterRecord } from "@/lib/member-master-schema";
import {
  DRAFT_GUARDIAN_MEMBERSHIP_IDS_KEY,
  getMissingRequiredMasterFields,
  masterFieldsFromFlatImport,
  masterRecordCompletenessPct,
  masterRecordFromDraft,
  normalizeImportEmail,
  parseMembershipKind,
  readDraftGuardianMembershipIds,
} from "@/lib/member-master-schema";
import {
  buildMemberImportTemplateWorkbook,
  buildMemberRegistryWorkbook,
  masterFieldsFromRegistryImportRow,
  parseRegistrySpreadsheet,
  parseRegistrySpreadsheetFirstSheet,
} from "@/lib/member-master-xlsx";
import type { ImportColumnMappingEntry } from "@/lib/member-registry-spreadsheet-import";
import { MemberMasterDialog } from "@/components/members/member-master-dialog";
import { MasterDataTabs } from "@/components/members/master-data-tabs";
import { ClubMemberPassModal } from "@/components/members/club-member-pass-modal";
import { buildClubMemberPassLabels } from "@/components/members/club-member-pass-labels";
import { Badge } from "@/components/ui/badge";
import { badgeVariants } from "@/components/ui/badge-variants";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { appendMemberAuditEvent } from "@/lib/member-audit";
import { saveMemberMasterRecord } from "@/lib/member-master-api";
import {
  buildMemberMasterSavePayload,
  editableFieldKeysForActor,
  editableGroupsForActor,
  type MemberMasterEditActor,
} from "@/lib/member-master-field-policy";
import { listEditableMemberMasterMemberships } from "@/lib/member-master-api";
import { sendClubInviteEmail, type SendClubInviteEmailResult } from "@/lib/send-club-invite-email";
import { buildClubInviteLandingUrl } from "@/lib/club-invite-links";
import { cn } from "@/lib/utils";
import {
  DASHBOARD_PAGE_INNER,
  DASHBOARD_PAGE_ROOT,
} from "@/lib/dashboard-page-shell";
import { supabaseErrorMessage } from "@/lib/supabase-error-message";
import {
  clubTeamNamesFromIds,
  membershipDisplayTeamLabel,
  reconcileMemberTeamEditState,
  resolveClubTeamIdFromLabel,
  syncMembershipTeamAssignments,
  type ClubTeamOption,
} from "@/lib/member-team-assignments";
import { MemberTeamAssignmentField } from "@/components/members/member-team-assignment-field";
import { DuplicateReviewBadge } from "@/components/members/duplicate-review-badge";
import { SharedContactEmailBadge } from "@/components/members/shared-contact-email-badge";
import { SharedContactAccountsPanel } from "@/components/members/shared-contact-accounts-panel";
import { HouseholdDiscountBadge } from "@/components/members/household-discount-badge";
import {
  annotateRowsWithHouseholdDiscount,
  buildHouseholdDiscountGroups,
  findHouseholdGroupForMember,
  householdRefFromMasterLike,
  type HouseholdDiscountGroup,
} from "@/lib/member-household-discount";
import {
  mergeFieldGapPatches,
  parseClubComparisonWorkbook,
  type ComparisonFieldGapPatch,
  type ComparisonImportSummary,
  isClubComparisonWorkbook,
} from "@/lib/club-comparison-workbook-import";
import {
  mergeBulkImportRows,
  registryImportRowDisplayName,
  canAddRegistryRowToSavedList,
  summarizeMasterPayloadForDisplay,
} from "@/lib/member-import-dedupe";
import {
  buildMemberDuplicateReviewMap,
  countMemberDuplicateReviewEntries,
  getMemberDuplicateReview,
  memberNeedsDuplicateReview,
  planDuplicateDraftRemovals,
  type MemberDuplicateReviewReason,
} from "@/lib/member-duplicate-review";
import { resolveRegistryImportMatch } from "@/lib/member-registry-import-match";
import {
  buildSharedContactEmailGroups,
  getSharedContactGroup,
  memberRegistryIdentityKey,
  collectDraftIdentityKeys,
  resolveNewDraftIdentityKey,
  registryImportRowLinkKey,
  type SharedContactEmailMember,
} from "@/lib/member-shared-contact-email";

type HistoryPreviewState = {
  path: string;
  displayName: string;
  email: string | null;
  detailLine: string;
};

type MemberRow = {
  id: string;
  club_id: string;
  user_id: string;
  role: string;
  position: string | null;
  age_group: string | null;
  team: string | null;
  status: string;
  created_at: string;
  profiles?: {
    display_name: string | null;
    avatar_url: string | null;
    phone: string | null;
    user_id: string;
  };
};

type GuardianLinkRow = {
  id: string;
  club_id: string;
  guardian_membership_id: string;
  ward_membership_id: string;
  relationship: string | null;
};

type InviteRequestRow = {
  id: string;
  club_id: string;
  name: string;
  email: string;
  message: string | null;
  request_user_id: string | null;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  phone?: string | null;
  interested_role?: string | null;
  interested_team?: string | null;
  source?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  internal_note?: string | null;
};

type ClubInviteRow = {
  id: string;
  club_id: string;
  email: string | null;
  role: string;
  token_hash: string;
  expires_at: string | null;
  used_at: string | null;
  created_at: string;
};

const canRevokeInvite = (inv: ClubInviteRow) => !inv.used_at;
type MemberDraftRow = {
  id: string;
  club_id: string;
  name: string;
  email: string | null;
  role: string;
  team: string | null;
  age_group: string | null;
  position: string | null;
  status: "draft" | "invited" | "joined";
  invite_id: string | null;
  invited_at: string | null;
  created_at: string;
  master_data: Record<string, unknown> | null;
};

/** Metric-card filter for Saved Member List (and roster role chips where relevant). */
type MembersStatsFilter = "total" | "active" | "players" | "trainers" | "pending" | "needs_review";

function draftMatchesStatsFilter(draft: MemberDraftRow, filter: MembersStatsFilter | null): boolean {
  if (!filter || filter === "total") return true;
  if (filter === "pending") return draft.status === "draft";
  if (filter === "active") return draft.status === "invited";
  if (filter === "players") return draft.role === "player";
  if (filter === "trainers") return draft.role === "trainer";
  return true;
}

/** Hover tip on roster pills — button trigger (Badge has no ref) and no help cursor. */
function RosterPillTooltip({
  tip,
  className,
  children,
}: {
  tip: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Tooltip delayDuration={150}>
      <TooltipTrigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex shrink-0 items-center justify-center rounded-full border-0 bg-transparent p-0 text-left outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
            className,
          )}
          onClick={(event) => event.stopPropagation()}
          onPointerDown={(event) => event.stopPropagation()}
        >
          {children}
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" className="z-[80] max-w-[18rem] text-xs leading-snug">
        {tip}
      </TooltipContent>
    </Tooltip>
  );
}

type MemberSearchMatchField =
  | "display_name"
  | "master_name"
  | "first_name"
  | "last_name"
  | "phone"
  | "email"
  | "internal_club_number"
  | "team"
  | "draft_name";

function memberSearchTextIncludes(haystack: string | null | undefined, query: string): boolean {
  return (haystack ?? "").toLowerCase().includes(query);
}

function collectRosterSearchMatchFields(
  query: string,
  member: MemberRow,
  master: ClubMemberMasterRecord | null | undefined,
  email: string | undefined,
): MemberSearchMatchField[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const fields: MemberSearchMatchField[] = [];
  if (memberSearchTextIncludes(member.profiles?.display_name, q)) fields.push("display_name");
  const masterName = `${master?.first_name ?? ""} ${master?.last_name ?? ""}`.trim();
  if (memberSearchTextIncludes(masterName, q)) fields.push("master_name");
  if (memberSearchTextIncludes(master?.first_name, q)) fields.push("first_name");
  if (memberSearchTextIncludes(master?.last_name, q)) fields.push("last_name");
  if (memberSearchTextIncludes(member.profiles?.phone, q)) fields.push("phone");
  if (memberSearchTextIncludes(email, q)) fields.push("email");
  if (memberSearchTextIncludes(master?.internal_club_number, q)) fields.push("internal_club_number");
  return fields;
}

function collectDraftSearchMatchFields(query: string, draft: MemberDraftRow): MemberSearchMatchField[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const fields: MemberSearchMatchField[] = [];
  if (memberSearchTextIncludes(draft.name, q)) fields.push("draft_name");
  if (memberSearchTextIncludes(draft.email, q)) fields.push("email");
  if (memberSearchTextIncludes(draft.team, q)) fields.push("team");
  const master = masterRecordFromDraft(draft.master_data, draft.name || "");
  const masterName = `${master?.first_name ?? ""} ${master?.last_name ?? ""}`.trim();
  if (memberSearchTextIncludes(masterName, q)) fields.push("master_name");
  if (memberSearchTextIncludes(master?.first_name, q)) fields.push("first_name");
  if (memberSearchTextIncludes(master?.last_name, q)) fields.push("last_name");
  if (memberSearchTextIncludes(master?.internal_club_number, q)) fields.push("internal_club_number");
  if (memberSearchTextIncludes(master?.city, q)) fields.push("team");
  if (memberSearchTextIncludes(master?.postal_code, q)) fields.push("team");
  if (memberSearchTextIncludes(master?.street_line, q)) fields.push("team");
  if (memberSearchTextIncludes(draft.age_group, q)) fields.push("team");
  if (memberSearchTextIncludes(draft.position, q)) fields.push("team");
  if (memberSearchTextIncludes(typeof master?.phone === "string" ? master.phone : null, q)) fields.push("phone");
  return fields;
}

function draftMatchesMemberSearch(query: string, draft: MemberDraftRow): boolean {
  return collectDraftSearchMatchFields(query, draft).length > 0;
}

function mergeDraftSearchResults(
  query: string,
  loadedDrafts: MemberDraftRow[],
  serverDrafts: MemberDraftRow[],
): MemberDraftRow[] {
  const q = query.trim();
  if (!q) return [];
  const byId = new Map<string, MemberDraftRow>();
  for (const draft of serverDrafts) {
    if (draftMatchesMemberSearch(q, draft)) byId.set(draft.id, draft);
  }
  for (const draft of loadedDrafts) {
    if (draftMatchesMemberSearch(q, draft)) byId.set(draft.id, draft);
  }
  return [...byId.values()];
}

type BulkMemberDraft = {
  id: string;
  include: boolean;
  name: string;
  email: string;
  role: string;
  unknownRole: boolean;
  team: string;
  ageGroup: string;
  position: string;
  masterData: Partial<ClubMemberMasterRecord>;
};

function annotateBulkMemberDrafts(rows: BulkMemberDraft[]): BulkMemberDraft[] {
  return annotateRowsWithHouseholdDiscount(rows).rows;
}

type ImportSummary = {
  imported: number;
  usable: number;
  invalidEmail: number;
  sharedContactInFile: number;
  unknownRole: number;
  importDeduped?: number;
};

type BulkRowIssue =
  | "invalid_email"
  | "missing_email"
  | "shared_contact_email"
  | "shared_login_email"
  | "household_discount_candidate"
  | "already_in_club"
  | "already_in_saved_list"
  | "invite_exists"
  | "unknown_role";

type AbuseAuditRow = {
  action: "public_invite_request" | "public_join_request";
  total_attempts: number;
  allowed_attempts: number;
  blocked_attempts: number;
  unique_identifiers: number;
  unique_devices: number;
  last_attempt_at: string | null;
};

type AbuseAlertRow = {
  id: string;
  action: "public_invite_request" | "public_join_request";
  reason: string;
  severity: "low" | "medium" | "high";
  status: "open" | "resolved";
  blocked_count: number;
  total_count: number;
  first_seen_at: string;
  last_seen_at: string;
  resolved_at: string | null;
  resolution_note: string | null;
};

const SUPPORTED_ROLES = [
  "admin",
  "trainer",
  "player",
  "staff",
  "team_management",
  "member",
  "parent",
  "fan",
  "supporter",
  "sponsor",
  "supplier",
  "service_provider",
  "consultant",
] as const;

/** Display order for membership / invite role pickers (club roles, then partners, admin last). */
const MEMBERSHIP_ROLE_SELECT_ORDER = [
  "member",
  "player",
  "trainer",
  "staff",
  "team_management",
  "parent",
  "fan",
  "supporter",
  "sponsor",
  "supplier",
  "service_provider",
  "consultant",
  "admin",
] as const;

const roleIcons: Record<string, React.ElementType> = {
  admin: Crown,
  trainer: Dumbbell,
  player: Shield,
  staff: UserCheck,
  team_management: Users,
  member: Users,
  parent: Heart,
  fan: Heart,
  supporter: Heart,
};

const roleColors: Record<string, string> = {
  admin: "bg-primary/10 text-primary",
  trainer: "bg-accent/10 text-accent",
  player: "bg-blue-500/10 text-blue-400",
  staff: "bg-emerald-500/10 text-emerald-400",
  team_management: "bg-teal-500/10 text-teal-400",
  member: "bg-muted text-muted-foreground",
  parent: "bg-pink-500/10 text-pink-400",
  fan: "bg-sky-500/10 text-sky-400",
  supporter: "bg-amber-500/10 text-amber-400",
  sponsor: "bg-primary/10 text-primary",
  supplier: "bg-orange-500/10 text-orange-400",
  service_provider: "bg-violet-500/10 text-violet-400",
  consultant: "bg-cyan-500/10 text-cyan-400",
};

const MEMBERS_VISIBLE_PAGE_SIZE = 40;
const MEMBERS_SERVER_PAGE_SIZE = 100;
const DRAFT_LIST_PAGE_SIZE = 500;
const DRAFT_LIST_MAX_ROWS = 5000;
const DRAFT_SEARCH_MAX_ROWS = 2000;
/** Default rows shown in Gespeicherte Mitgliederliste before expanding. */
const SAVED_MEMBER_LIST_PREVIEW_COUNT = 12;

function mapSearchRpcRowToMember(row: Record<string, unknown>): MemberRow {
  const userId = String(row.user_id ?? "");
  return {
    id: String(row.id),
    club_id: String(row.club_id),
    user_id: userId,
    role: String(row.role ?? ""),
    position: row.position != null ? String(row.position) : null,
    age_group: row.age_group != null ? String(row.age_group) : null,
    team: row.team != null ? String(row.team) : null,
    status: String(row.status ?? ""),
    created_at: String(row.created_at ?? ""),
    profiles: {
      display_name: row.profile_display_name != null ? String(row.profile_display_name) : null,
      avatar_url: row.profile_avatar_url != null ? String(row.profile_avatar_url) : null,
      phone: row.profile_phone != null ? String(row.profile_phone) : null,
      user_id: userId,
    },
  };
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isPlayerRole(role: string | null | undefined): boolean {
  return (role || "").trim().toLowerCase() === "player";
}

/** Same bucket as Settings profile avatars; path must start with `auth.uid()` per RLS. */
const PROFILE_AVATAR_BUCKET = "images-avatars";

function splitStoredNameToFirstLast(
  name: string,
  master: Partial<ClubMemberMasterRecord> | null | undefined,
): { firstName: string; lastName: string } {
  const fn = typeof master?.first_name === "string" ? master.first_name.trim() : "";
  const ln = typeof master?.last_name === "string" ? master.last_name.trim() : "";
  if (fn || ln) return { firstName: fn, lastName: ln };
  const t = (name || "").trim();
  if (!t) return { firstName: "", lastName: "" };
  const space = t.indexOf(" ");
  if (space === -1) return { firstName: t, lastName: "" };
  return { firstName: t.slice(0, space), lastName: t.slice(space + 1).trim() };
}

function buildDisplayNameFromParts(firstName: string, lastName: string): string {
  return [firstName.trim(), lastName.trim()].filter(Boolean).join(" ");
}

/** Single view of registry fields for MasterDataTabs: top-of-form first/last always feed Identity tab. */
function mergeDraftMasterValuesForTabs(
  masterData: Partial<ClubMemberMasterRecord>,
  firstName: string,
  lastName: string,
): Partial<ClubMemberMasterRecord> {
  const md = { ...(masterData as Record<string, unknown>) };
  delete md[DRAFT_GUARDIAN_MEMBERSHIP_IDS_KEY];
  const rest = md as Partial<ClubMemberMasterRecord>;
  const fnTop = firstName.trim();
  const lnTop = lastName.trim();
  const fnM = typeof rest.first_name === "string" ? rest.first_name.trim() : "";
  const lnM = typeof rest.last_name === "string" ? rest.last_name.trim() : "";
  return {
    ...rest,
    first_name: fnTop || fnM || null,
    last_name: lnTop || lnM || null,
  };
}

function normalizeEmail(value: string | null | undefined) {
  return normalizeImportEmail(value);
}

/** Shape for club_invites.invite_payload (redeem_club_invite reads these keys). */
function buildInvitePayloadFromDraftFields(
  combinedName: string | null,
  role: string,
  masterData: Record<string, unknown>,
  team: string | null | undefined,
  age_group: string | null | undefined,
  position: string | null | undefined,
) {
  const guardianIds = isPlayerRole(role) ? readDraftGuardianMembershipIds(masterData) : [];
  const tn = (team ?? "").trim();
  const ag = (age_group ?? "").trim();
  const pos = (position ?? "").trim();
  const nm = (combinedName ?? "").trim();
  const split = splitStoredNameToFirstLast(nm, masterData);
  return {
    ...(split.firstName ? { first_name: split.firstName } : {}),
    ...(split.lastName ? { last_name: split.lastName } : {}),
    ...(nm ? { name: nm } : {}),
    ...(tn ? { team: tn } : {}),
    ...(ag ? { age_group: ag } : {}),
    ...(pos ? { position: pos } : {}),
    ...(guardianIds.length > 0 ? { guardian_membership_ids: guardianIds } : {}),
  };
}

function isMissingRelationError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const message = String((error as { message?: unknown }).message ?? "");
  return message.includes("Could not find the table") || message.includes("does not exist");
}

/** PostgREST when master_data column was not applied to club_member_drafts yet. */
function isMissingDraftMasterDataColumnError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const message = String((error as { message?: unknown }).message ?? "");
  return message.includes("master_data") && message.includes("club_member_drafts");
}

function joinVisitorInterestLabel(
  id: string | null | undefined,
  labels: {
    joinRolePlayer: string;
    joinRoleParent: string;
    joinRoleCoach: string;
    joinRoleVolunteer: string;
    joinRoleSponsor: string;
    joinRolePartner: string;
  },
): string {
  switch (id || "") {
    case "player":
      return labels.joinRolePlayer;
    case "parent":
      return labels.joinRoleParent;
    case "coach":
      return labels.joinRoleCoach;
    case "volunteer":
      return labels.joinRoleVolunteer;
    case "sponsor":
      return labels.joinRoleSponsor;
    case "partner":
      return labels.joinRolePartner;
    default:
      return id?.trim() ? id : "-";
  }
}

const Members = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const { t, language } = useLanguage();
  const { clubId, loading: clubLoading } = useClubId();
  const perms = usePermissions();
  const gateRole = useModuleGateRole();
  const canManageMembers = getModuleAccess(gateRole, "members") === "full";
  const canManageRoles = getModuleAccess(gateRole, "roles") === "full";
  const memberDataScope = useModuleDataScope("members");
  const agentPageContext = useMemo(() => ({ source: "members" as const }), []);
  useRegisterAiAgentContext(agentPageContext);
  const [tab, setTab] = useState<MembersPageTab>("members");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [membersServerPage, setMembersServerPage] = useState(1);
  const [membersDbTotalCount, setMembersDbTotalCount] = useState<number | null>(null);
  const [clubMemberStats, setClubMemberStats] = useState<{
    total: number;
    active: number;
    players: number;
    trainers: number;
  } | null>(null);
  const membersPivotRef = useRef<string>("");
  const [members, setMembers] = useState<MemberRow[]>([]);

  useEffect(() => {
    const id = window.setTimeout(() => setDebouncedSearch(search), 400);
    return () => window.clearTimeout(id);
  }, [search]);
  const [memberTeamNamesById, setMemberTeamNamesById] = useState<Record<string, string[]>>({});
  const [memberPlayerTeamIdsById, setMemberPlayerTeamIdsById] = useState<Record<string, string[]>>({});
  const [memberCoachTeamIdsById, setMemberCoachTeamIdsById] = useState<Record<string, string[]>>({});
  const [clubTeams, setClubTeams] = useState<ClubTeamOption[]>([]);
  const [supportsTeamCoachesTable, setSupportsTeamCoachesTable] = useState(true);
  const [editMemberTeamIds, setEditMemberTeamIds] = useState<string[]>([]);
  const [editDraftTeamIds, setEditDraftTeamIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  /** After first successful roster fetch; keeps search mounted during refetches. */
  const [hasMembersHydrated, setHasMembersHydrated] = useState(false);
  const [selectedMember, setSelectedMember] = useState<MemberRow | null>(null);
  const [memberPanelEditModeId, setMemberPanelEditModeId] = useState<string | null>(null);
  const [memberMasterEditDraft, setMemberMasterEditDraft] = useState<Partial<ClubMemberMasterRecord>>({});
  const [memberPanelSaving, setMemberPanelSaving] = useState(false);
  const [memberPanelAvatarUploading, setMemberPanelAvatarUploading] = useState(false);
  const [editMemberForm, setEditMemberForm] = useState({
    role: "member",
    team: "",
    ageGroup: "",
    position: "",
    status: "active",
  });

  const [inviteRequests, setInviteRequests] = useState<InviteRequestRow[]>([]);
  const [inviteReqFilter, setInviteReqFilter] = useState<"pending" | "approved" | "rejected" | "all">("pending");
  const [invites, setInvites] = useState<ClubInviteRow[]>([]);
  const [invitesLoading, setInvitesLoading] = useState(false);
  const [abuseAuditLoading, setAbuseAuditLoading] = useState(false);
  const [abuseAudit, setAbuseAudit] = useState<AbuseAuditRow[]>([]);
  const [abuseAlertsLoading, setAbuseAlertsLoading] = useState(false);
  const [abuseAlerts, setAbuseAlerts] = useState<AbuseAlertRow[]>([]);
  const [resolvingAlertId, setResolvingAlertId] = useState<string | null>(null);
  const [memberDrafts, setMemberDrafts] = useState<MemberDraftRow[]>([]);
  const [searchMatchedDrafts, setSearchMatchedDrafts] = useState<MemberDraftRow[]>([]);
  const [searchDraftsLoading, setSearchDraftsLoading] = useState(false);
  const [memberDraftTotalCount, setMemberDraftTotalCount] = useState(0);
  const [memberDraftsTruncated, setMemberDraftsTruncated] = useState(false);
  const [draftsLoading, setDraftsLoading] = useState(false);
  const [draftActionId, setDraftActionId] = useState<string | null>(null);
  const [duplicateDraftRemovalBusy, setDuplicateDraftRemovalBusy] = useState(false);
  const [draftInviteMetaById, setDraftInviteMetaById] = useState<
    Record<string, { inviteUsed: boolean; rosterMembershipId: string | null }>
  >({});
  const pendingFocusMembershipIdRef = useRef<string | null>(null);
  const [editingDraftId, setEditingDraftId] = useState<string | null>(null);
  const [editingDraftForm, setEditingDraftForm] = useState<{
    firstName: string;
    lastName: string;
    email: string;
    role: string;
    team: string;
    age_group: string;
    position: string;
    masterData: Partial<ClubMemberMasterRecord>;
  }>({ firstName: "", lastName: "", email: "", role: "member", team: "", age_group: "", position: "", masterData: {} });
  const [draftSaving, setDraftSaving] = useState(false);
  const [draftSaveConfirmedAt, setDraftSaveConfirmedAt] = useState<number | null>(null);
  const [memberPanelSaveConfirmedId, setMemberPanelSaveConfirmedId] = useState<string | null>(null);
  const [draftAvatarUploading, setDraftAvatarUploading] = useState(false);
  const [bulkAvatarUploadingRowId, setBulkAvatarUploadingRowId] = useState<string | null>(null);
  const [draftMasterExpanded, setDraftMasterExpanded] = useState(false);
  const [showAllDrafts, setShowAllDrafts] = useState(false);
  const [statsFilter, setStatsFilter] = useState<MembersStatsFilter | null>(null);
  const [sharedContactFilterEmail, setSharedContactFilterEmail] = useState<string | null>(null);
  const savedMemberListRef = useRef<HTMLDivElement | null>(null);
  const [joinReviewerPolicy, setJoinReviewerPolicy] = useState<"admin_only" | "admin_trainer">("admin_only");
  const [clubSlug, setClubSlug] = useState<string | null>(null);
  const [clubName, setClubName] = useState<string | null>(null);
  const [clubLogoUrl, setClubLogoUrl] = useState<string | null>(null);
  const [clubJoinDefaults, setClubJoinDefaults] = useState<{ role: string; team: string }>({ role: "member", team: "" });
  const [joinRequestReviewById, setJoinRequestReviewById] = useState<
    Record<string, { role: string; team: string; note: string }>
  >({});
  const [savingJoinNoteId, setSavingJoinNoteId] = useState<string | null>(null);

  const [masterByMembershipId, setMasterByMembershipId] = useState<Record<string, ClubMemberMasterRecord | null>>({});
  const [editableMasterActorById, setEditableMasterActorById] = useState<Record<string, MemberMasterEditActor>>({});
  const [membershipEmails, setMembershipEmails] = useState<Record<string, string>>({});
  const [guardianLinks, setGuardianLinks] = useState<GuardianLinkRow[]>([]);
  const [showMasterDialog, setShowMasterDialog] = useState(false);
  const [clubPassModalMember, setClubPassModalMember] = useState<MemberRow | null>(null);
  const [showRegistryImport, setShowRegistryImport] = useState(false);
  const [registryImportBusy, setRegistryImportBusy] = useState(false);
  const [registryImportPreview, setRegistryImportPreview] = useState<
    Array<{
      email: string;
      displayName: string;
      extractedSummary: string;
      membershipId: string | null;
      draftId: string | null;
      matchLabel: string | null;
      missing: string[];
      payload: Partial<ClubMemberMasterRecord>;
      guardianEmail: string;
      wardEmail: string;
      role: string;
      team: string;
      ageGroup: string;
      position: string;
    }>
  >([]);
  const [registryImportColumnMapping, setRegistryImportColumnMapping] = useState<ImportColumnMappingEntry[]>([]);
  const [registryImportSheetName, setRegistryImportSheetName] = useState<string | null>(null);
  const [registryHouseholdGroups, setRegistryHouseholdGroups] = useState<HouseholdDiscountGroup[]>([]);
  const [guardianPickId, setGuardianPickId] = useState("");
  const [draftGuardianPickId, setDraftGuardianPickId] = useState("");

  const [showCreateInvite, setShowCreateInvite] = useState(false);
  const [showAddMembers, setShowAddMembers] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("member");
  const [inviteDays, setInviteDays] = useState("7");
  const [createdInviteToken, setCreatedInviteToken] = useState<string | null>(null);
  const [draftResendTokenModalOpen, setDraftResendTokenModalOpen] = useState(false);
  const [draftResendInviteToken, setDraftResendInviteToken] = useState<string | null>(null);
  const [draftInviteLinkModalVariant, setDraftInviteLinkModalVariant] = useState<"send" | "resend">("send");
  const [historyPreview, setHistoryPreview] = useState<HistoryPreviewState | null>(null);
  const [copied, setCopied] = useState(false);
  const [bulkRows, setBulkRows] = useState<BulkMemberDraft[]>([
    {
      id: crypto.randomUUID(),
      include: true,
      name: "",
      email: "",
      role: "member",
      unknownRole: false,
      team: "",
      ageGroup: "",
      position: "",
      masterData: {},
    },
  ]);
  const [bulkSubmitting, setBulkSubmitting] = useState(false);
  const [expandedBulkRows, setExpandedBulkRows] = useState<Set<string>>(new Set());
  const [existingMemberEmails, setExistingMemberEmails] = useState<Set<string>>(new Set());
  const [importSummary, setImportSummary] = useState<ImportSummary | null>(null);
  const [importColumnMapping, setImportColumnMapping] = useState<ImportColumnMappingEntry[]>([]);
  const [importSheetName, setImportSheetName] = useState<string | null>(null);
  const [comparisonImportSummary, setComparisonImportSummary] = useState<ComparisonImportSummary | null>(null);
  const [pendingFieldGapPatches, setPendingFieldGapPatches] = useState<ComparisonFieldGapPatch[]>([]);
  const [fieldGapApplyBusy, setFieldGapApplyBusy] = useState(false);

  const renderImportColumnMapping = useCallback(
    (mapping: ImportColumnMappingEntry[], sheetName: string | null) => {
      if (!mapping.length) return null;
      return (
        <div className="mb-4 rounded-2xl border border-primary/20 bg-primary/5 p-3 text-xs">
          <div className="font-medium text-foreground mb-1">{t.membersPage.importColumnMappingTitle}</div>
          {sheetName ? (
            <div className="text-muted-foreground mb-2">
              {t.membersPage.importColumnMappingSheet.replace("{sheet}", sheetName)} ·{" "}
              {t.membersPage.importColumnMappingCount.replace("{count}", String(mapping.length))}
            </div>
          ) : null}
          <div className="flex flex-wrap gap-1.5">
            {mapping.map((entry) => (
              <span
                key={`${entry.sourceHeader}-${entry.target}`}
                className="inline-flex rounded-full border border-border/60 bg-background/70 px-2 py-0.5 font-mono text-[10px] text-foreground"
              >
                {t.membersPage.importColumnMappingEntry
                  .replace("{source}", entry.sourceHeader)
                  .replace("{target}", entry.targetLabel)}
              </span>
            ))}
          </div>
        </div>
      );
    },
    [t],
  );

  const getBulkIssueLabel = useCallback((issue: BulkRowIssue) => {
    switch (issue) {
      case "invalid_email":
        return t.membersPage.importIssueInvalidEmail;
      case "missing_email":
        return t.membersPage.importIssueMissingEmail;
      case "shared_contact_email":
        return t.membersPage.importIssueSharedContactEmail;
      case "shared_login_email":
        return t.membersPage.importIssueSharedLoginEmail;
      case "household_discount_candidate":
        return t.membersPage.importIssueHouseholdDiscountCandidate;
      case "already_in_saved_list":
        return t.membersPage.importIssueAlreadyInSavedList;
      case "already_in_club":
        return t.membersPage.importIssueAlreadyInClub;
      case "invite_exists":
        return t.membersPage.importIssueInviteExists;
      case "unknown_role":
        return t.membersPage.importIssueUnknownRoleMapped;
      default:
        return issue;
    }
  }, [t]);

  const getRoleLabel = useCallback((role: string) => {
    switch (role) {
      case "admin":
        return t.onboarding.clubAdmin;
      case "trainer":
        return t.onboarding.trainer;
      case "player":
        return t.onboarding.player;
      case "staff":
        return t.onboarding.teamStaff;
      case "team_management":
        return t.onboarding.teamManagement;
      case "member":
        return t.onboarding.member;
      case "parent":
        return t.onboarding.parent;
      case "fan":
        return t.onboarding.fan;
      case "supporter":
        return t.onboarding.supporter;
      case "sponsor":
        return t.onboarding.sponsor;
      case "supplier":
        return t.onboarding.supplier;
      case "service_provider":
        return t.onboarding.serviceProvider;
      case "consultant":
        return t.onboarding.consultant;
      default:
        return role.replace("_", " ");
    }
  }, [t]);

  const getRoleTooltip = useCallback(
    (role: string) => {
      switch (role) {
        case "admin":
          return t.membersPage.roleTooltipAdmin;
        case "trainer":
          return t.membersPage.roleTooltipTrainer;
        case "player":
          return t.membersPage.roleTooltipPlayer;
        case "staff":
          return t.membersPage.roleTooltipStaff;
        case "team_management":
          return t.membersPage.roleTooltipTeamManagement;
        case "member":
          return t.membersPage.roleTooltipMember;
        case "parent":
          return t.membersPage.roleTooltipParent;
        case "fan":
          return t.membersPage.roleTooltipFan;
        case "supporter":
          return t.membersPage.roleTooltipSupporter;
        case "sponsor":
          return t.membersPage.roleTooltipSponsor;
        case "supplier":
          return t.membersPage.roleTooltipSupplier;
        case "service_provider":
          return t.membersPage.roleTooltipServiceProvider;
        case "consultant":
          return t.membersPage.roleTooltipConsultant;
        default:
          return t.membersPage.roleTooltipGeneric;
      }
    },
    [t],
  );

  useEffect(() => {
    if (historyPreview) setCopied(false);
  }, [historyPreview]);

  // Reset page state on club switch to prevent cross-club flashes
  useEffect(() => {
    setMembers([]);
    setMemberTeamNamesById({});
    setMemberPlayerTeamIdsById({});
    setMemberCoachTeamIdsById({});
    setEditMemberTeamIds([]);
    setEditDraftTeamIds([]);
    setSelectedMember(null);
    setLoading(true);
    setHasMembersHydrated(false);

    setInviteRequests([]);
    setInvites([]);
    setInvitesLoading(false);
    setMemberDrafts([]);
    setDraftsLoading(false);
    setDraftActionId(null);
    setJoinReviewerPolicy("admin_only");
    setClubSlug(null);
    setClubName(null);
    setClubLogoUrl(null);
    setMasterByMembershipId({});
    setMembershipEmails({});
    setGuardianLinks([]);
    setShowMasterDialog(false);
    setShowRegistryImport(false);
    setRegistryImportPreview([]);
    setHistoryPreview(null);
    setDraftResendTokenModalOpen(false);
    setDraftResendInviteToken(null);
    setDraftInviteLinkModalVariant("send");

    setSearch("");
    setDebouncedSearch("");
    setRoleFilter("all");
    setMembersServerPage(1);
    membersPivotRef.current = "";
    setInviteReqFilter("pending");
  }, [clubId]);

  const hashToken = hashInviteToken;
  const generateToken = generateInviteToken;

  const normalizeRole = (value: string) => {
    const normalized = value.trim().toLowerCase().replace(/\s+/g, "_");
    const supported = [...SUPPORTED_ROLES];
    return {
      role: supported.includes(normalized as (typeof SUPPORTED_ROLES)[number]) ? normalized : "member",
      unknownRole: normalized.length > 0 && !supported.includes(normalized as (typeof SUPPORTED_ROLES)[number]),
    };
  };

  const toggleBulkRowExpand = (id: string) => {
    setExpandedBulkRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const updateBulkRowMasterField = (rowId: string, key: keyof ClubMemberMasterRecord, value: string | number | null) => {
    setBulkRows((prev) =>
      annotateBulkMemberDrafts(
        prev.map((r) => (r.id === rowId ? { ...r, masterData: { ...r.masterData, [key]: value } } : r)),
      ),
    );
  };

  const addDraftRow = () => {
    setBulkRows((previous) =>
      annotateBulkMemberDrafts([
        ...previous,
        {
          id: crypto.randomUUID(),
          include: true,
          name: "",
          email: "",
          role: "member",
          unknownRole: false,
          team: "",
          ageGroup: "",
          position: "",
          masterData: {},
        },
      ]),
    );
  };

  const updateDraftRow = (id: string, key: keyof BulkMemberDraft, value: string | boolean) => {
    setBulkRows((previous) =>
      annotateBulkMemberDrafts(previous.map((row) => (row.id === id ? { ...row, [key]: value } : row))),
    );
  };

  const removeDraftRow = (id: string) => {
    setBulkRows((previous) => annotateBulkMemberDrafts(previous.filter((row) => row.id !== id)));
  };

  const handleImportComparisonWorkbook = async (file: File) => {
    const [spreadsheet, comparison] = await Promise.all([
      parseRegistrySpreadsheet(file),
      parseClubComparisonWorkbook(file),
    ]);
    setComparisonImportSummary(comparison.summary);
    setPendingFieldGapPatches(comparison.fieldGapPatches);
    setImportColumnMapping(spreadsheet?.columnMapping ?? []);
    setImportSheetName(spreadsheet?.sheetName ?? null);

    const sourceRows = spreadsheet?.rows ?? [];
    const imported = sourceRows.map((row) => {
      const masterFields = masterFieldsFromRegistryImportRow(row);
      const name =
        [masterFields.first_name, masterFields.last_name].filter(Boolean).join(" ") ||
        row.raw.name ||
        row.raw.full_name ||
        [row.raw.vorname, row.raw.nachname].filter(Boolean).join(" ");
      const parsedRole = normalizeRole(row.role || "member");
      return {
        id: crypto.randomUUID(),
        include: true,
        name,
        email: row.email,
        role: parsedRole.role,
        unknownRole: parsedRole.unknownRole,
        team: row.team || row.raw.team || row.raw.latest_department || "",
        ageGroup: row.ageGroup || row.raw.age_group || "",
        position: row.position || row.raw.position || "",
        masterData: masterFields,
      } as BulkMemberDraft;
    }).filter(
      (row) =>
        normalizeEmail(row.email) ||
        row.masterData.internal_club_number?.trim() ||
        row.name.trim(),
    );

    const emailCounts = new Map<string, number>();
    for (const item of imported) {
      const email = normalizeEmail(item.email);
      if (!email) continue;
      emailCounts.set(email, (emailCounts.get(email) ?? 0) + 1);
    }

    let invalid = 0;
    let unknownRole = 0;
    for (const item of imported) {
      const email = normalizeEmail(item.email);
      if (email && !EMAIL_PATTERN.test(email)) invalid += 1;
      if (item.unknownRole) unknownRole += 1;
    }

    setBulkRows((previous) => {
      const merged = mergeBulkImportRows(previous, imported);
      setImportSummary({
        imported: comparison.summary.missingActive,
        usable: merged.rows.filter((row) => normalizeEmail(row.email)).length,
        invalidEmail: invalid,
        sharedContactInFile: [...emailCounts.values()].filter((count) => count > 1).length,
        unknownRole,
        importDeduped: merged.skipped + merged.updated,
      });
      if (merged.skipped > 0 || merged.updated > 0) {
        toast({
          title: t.membersPage.importDedupedTitle,
          description: t.membersPage.importDedupedDesc
            .replace("{added}", String(merged.added))
            .replace("{updated}", String(merged.updated))
            .replace("{skipped}", String(merged.skipped)),
        });
      }
      return annotateBulkMemberDrafts(merged.rows);
    });

    toast({
      title: t.membersPage.comparisonImportComplete,
      description: t.membersPage.comparisonImportCompleteDesc
        .replace("{missing}", String(comparison.summary.missingActive))
        .replace("{loaded}", String(imported.length))
        .replace("{withoutEmail}", String(comparison.summary.missingWithoutEmail))
        .replace("{fieldGaps}", String(comparison.summary.fieldGapPatchCount))
        .replace("{sharedGroups}", String(comparison.summary.sharedEmailGroupCount)),
    });
  };

  const handleImportSpreadsheet = async (file: File) => {
    const xlsx = await import("xlsx");
    const buffer = await file.arrayBuffer();
    const workbook = xlsx.read(buffer, { type: "array" });
    if (isClubComparisonWorkbook(workbook.SheetNames)) {
      await handleImportComparisonWorkbook(file);
      return;
    }

    const parsedResult = await parseRegistrySpreadsheet(file);
    const parsed = parsedResult?.rows ?? [];
    setImportColumnMapping(parsedResult?.columnMapping ?? []);
    setImportSheetName(parsedResult?.sheetName ?? null);
    if (!parsed.length) {
      toast({
        title: t.membersPage.importFailed,
        description: t.membersPage.importCsvNoDataRows,
        variant: "destructive",
      });
      return;
    }

    const imported = parsed.map((row) => {
      const masterFields = masterFieldsFromRegistryImportRow(row);
      const name =
        [masterFields.first_name, masterFields.last_name].filter(Boolean).join(" ") ||
        row.raw.name ||
        row.raw.full_name ||
        [row.raw.vorname, row.raw.nachname].filter(Boolean).join(" ");
      const parsedRole = normalizeRole(row.role || "member");
      return {
        id: crypto.randomUUID(),
        include: true,
        name,
        email: row.email,
        role: parsedRole.role,
        unknownRole: parsedRole.unknownRole,
        team: row.team || row.raw.team || "",
        ageGroup: row.ageGroup || row.raw.age_group || "",
        position: row.position || row.raw.position || "",
        masterData: masterFields,
      } as BulkMemberDraft;
    });

    const rowsToAdd = imported.filter((item) => item.name.trim() || normalizeEmail(item.email));
    const usable = rowsToAdd.filter((item) => normalizeEmail(item.email));

    const duplicates = new Set<string>();
    const emailCounts = new Map<string, number>();
    for (const item of imported) {
      const email = normalizeEmail(item.email);
      if (!email) continue;
      emailCounts.set(email, (emailCounts.get(email) ?? 0) + 1);
    }
    for (const [email, count] of emailCounts.entries()) {
      if (count > 1) duplicates.add(email);
    }

    const seen = new Set<string>();
    let invalid = 0;
    let unknownRole = 0;
    for (const item of usable) {
      const email = normalizeEmail(item.email);
      if (!EMAIL_PATTERN.test(email)) invalid += 1;
      if (item.unknownRole) unknownRole += 1;
      if (seen.has(email)) duplicates.add(email);
      seen.add(email);
    }

    setBulkRows((previous) => {
      const merged = mergeBulkImportRows(previous, rowsToAdd);
      setImportSummary({
        imported: imported.length,
        usable: usable.length,
        invalidEmail: invalid,
        sharedContactInFile: duplicates.size,
        unknownRole,
        importDeduped: merged.skipped + merged.updated,
      });
      if (merged.skipped > 0 || merged.updated > 0) {
        toast({
          title: t.membersPage.importDedupedTitle,
          description: t.membersPage.importDedupedDesc
            .replace("{added}", String(merged.added))
            .replace("{updated}", String(merged.updated))
            .replace("{skipped}", String(merged.skipped)),
        });
      }
      return annotateBulkMemberDrafts(merged.rows);
    });

    const isGerman = parsed.some((r) => r.sourceFormat === "german_mitgliederliste");
    toast({
      title: t.membersPage.importComplete,
      description: isGerman
        ? t.membersPage.importedRowsFromGermanExport.replace("{count}", String(rowsToAdd.length))
        : file.name.toLowerCase().endsWith(".csv")
          ? t.membersPage.importedRowsFromCsv.replace("{count}", String(rowsToAdd.length))
          : t.membersPage.importedRowsFromSpreadsheet.replace("{count}", String(rowsToAdd.length)),
    });
  };

  const handleDownloadTemplate = async () => {
    await buildMemberImportTemplateWorkbook();
    toast({ title: t.membersPage.downloadImportTemplate, description: t.membersPage.registryTemplateDownloaded });
  };

  const createInviteRecord = async (
    emailValue: string,
    roleValue: string,
    daysValue: string,
    payload?: {
      name?: string;
      team?: string;
      age_group?: string;
      position?: string;
      guardian_membership_ids?: string[];
    },
  ) => {
    if (!clubId) return { ok: false as const, error: t.membersPage.noClubSelected };
    const token = generateToken();
    const tokenHash = await hashToken(token);
    const days = Number(daysValue);
    const expiresAt = Number.isFinite(days) && days > 0
      ? new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString()
      : null;

    const { data, error } = await supabase
      .from("club_invites")
      .insert({
        club_id: clubId,
        email: emailValue.trim().toLowerCase() || null,
        role: roleValue,
        token_hash: tokenHash,
        expires_at: expiresAt,
        invite_payload: {
          ...(payload ?? {}),
          language: language === "de" ? "de" : "en",
        },
      })
      .select("id")
      .single();
    if (error) return { ok: false as const, error: error.message };
    if (!data?.id) return { ok: false as const, error: t.membersPage.noClubSelected };
    return { ok: true as const, token, inviteId: data.id };
  };

  const deliverClubInviteEmail = useCallback(
    async (input: {
      inviteId: string;
      toEmail: string;
      inviteToken: string;
      recipientName?: string | null;
    }): Promise<SendClubInviteEmailResult> => {
      if (!clubId) return { ok: false, error: t.membersPage.noClubSelected, code: "unknown" };
      return sendClubInviteEmail({
        clubId,
        inviteId: input.inviteId,
        toEmail: input.toEmail,
        inviteToken: input.inviteToken,
        recipientName: input.recipientName,
        language,
      });
    },
    [clubId, language, t.membersPage.noClubSelected],
  );

  const notifyInviteEmailDelivery = useCallback(
    (email: string, emailResult: SendClubInviteEmailResult) => {
      if (emailResult.ok) {
        toast({
          title: t.membersPage.inviteEmailSentTitle,
          description: t.membersPage.inviteEmailSentDesc.replace("{email}", email),
        });
        return;
      }
      if (emailResult.code === "email_not_configured") {
        toast({
          title: t.membersPage.inviteCreated,
          description: t.membersPage.inviteEmailNotConfiguredDesc,
          variant: "destructive",
        });
        return;
      }
      if (emailResult.error.startsWith("edge_unreachable:")) {
        const origin = emailResult.error.slice("edge_unreachable:".length) || window.location.origin;
        toast({
          title: t.membersPage.inviteEmailFailedTitle,
          description: t.membersPage.inviteEmailEdgeUnreachableDesc.replace("{origin}", origin),
          variant: "destructive",
        });
        return;
      }
      toast({
        title: t.membersPage.inviteEmailFailedTitle,
        description: t.membersPage.inviteEmailFailedDesc.replace("{error}", emailResult.error),
        variant: "destructive",
      });
    },
    [toast, t.membersPage.inviteCreated, t.membersPage.inviteEmailEdgeUnreachableDesc, t.membersPage.inviteEmailFailedDesc, t.membersPage.inviteEmailFailedTitle, t.membersPage.inviteEmailNotConfiguredDesc, t.membersPage.inviteEmailSentDesc, t.membersPage.inviteEmailSentTitle],
  );

  const fetchMemberDrafts = useCallback(async () => {
    if (!clubId || !canManageMembers) return;
    setDraftsLoading(true);
    const countRes = await supabase
      .from("club_member_drafts")
      .select("id", { count: "exact", head: true })
      .eq("club_id", clubId)
      .in("status", ["draft", "invited"]);

    const totalCount = countRes.count ?? 0;
    setMemberDraftTotalCount(totalCount);

    const drafts: MemberDraftRow[] = [];
    let offset = 0;
    while (offset < DRAFT_LIST_MAX_ROWS && offset < totalCount) {
      const { data, error } = await supabase
        .from("club_member_drafts")
        .select("*")
        .eq("club_id", clubId)
        .in("status", ["draft", "invited"])
        .order("created_at", { ascending: false })
        .range(offset, offset + DRAFT_LIST_PAGE_SIZE - 1);

      if (error) {
        toast({ title: t.common.error, description: error.message, variant: "destructive" });
        setMemberDrafts([]);
        setMemberDraftTotalCount(0);
        setMemberDraftsTruncated(false);
        setDraftInviteMetaById({});
        setDraftsLoading(false);
        return;
      }

      const batch = (data as unknown as MemberDraftRow[]) ?? [];
      drafts.push(...batch);
      if (batch.length < DRAFT_LIST_PAGE_SIZE) break;
      offset += DRAFT_LIST_PAGE_SIZE;
    }

    setMemberDrafts(drafts);
    setMemberDraftsTruncated(totalCount > drafts.length);

    const invited = drafts.filter((draft) => draft.status === "invited");
    const inviteIds = Array.from(
      new Set(invited.map((draft) => draft.invite_id).filter((id): id is string => Boolean(id))),
    );
    const emails = Array.from(
      new Set(invited.map((draft) => normalizeEmail(draft.email)).filter(Boolean)),
    );
    const [invitesRes, resolveRes] = await Promise.all([
      inviteIds.length > 0
        ? supabase.from("club_invites").select("id, used_at").eq("club_id", clubId).in("id", inviteIds)
        : Promise.resolve({ data: [] as Array<{ id: string; used_at: string | null }>, error: null }),
      emails.length > 0
        ? supabase.rpc("resolve_club_member_emails_to_memberships", {
            _club_id: clubId,
            _emails: emails,
          })
        : Promise.resolve({ data: [] as Array<{ email: string; membership_id: string }>, error: null }),
    ]);

    const usedByInviteId = new Map<string, boolean>();
    for (const row of (invitesRes.data as Array<{ id: string; used_at: string | null }> | null) ?? []) {
      usedByInviteId.set(row.id, Boolean(row.used_at));
    }
    const membershipByEmail = new Map<string, string>();
    for (const row of (resolveRes.data as Array<{ email: string; membership_id: string }> | null) ?? []) {
      if (row.email && row.membership_id) {
        membershipByEmail.set(normalizeEmail(row.email), String(row.membership_id));
      }
    }
    const nextMeta: Record<string, { inviteUsed: boolean; rosterMembershipId: string | null }> = {};
    for (const draft of invited) {
      nextMeta[draft.id] = {
        inviteUsed: draft.invite_id ? Boolean(usedByInviteId.get(draft.invite_id)) : false,
        rosterMembershipId: membershipByEmail.get(normalizeEmail(draft.email)) ?? null,
      };
    }
    setDraftInviteMetaById(nextMeta);
    setDraftsLoading(false);
  }, [clubId, canManageMembers, t.common.error, toast]);

  const resolveUnusedInviteIdForInvitedDraft = useCallback(
    async (draft: MemberDraftRow): Promise<string | null> => {
      if (!clubId) return null;
      if (draft.invite_id) return draft.invite_id;
      if (draft.status !== "invited") return null;
      const email = normalizeEmail(draft.email);
      if (!email) return null;
      const { data, error } = await supabase
        .from("club_invites")
        .select("id, created_at")
        .eq("club_id", clubId)
        .is("used_at", null)
        .eq("email", email);
      if (error || !data?.length) return null;
      if (data.length === 1) return data[0].id;
      const targetMs = draft.invited_at ? new Date(draft.invited_at).getTime() : Date.now();
      let best = data[0];
      let bestDelta = Infinity;
      for (const row of data) {
        const delta = Math.abs(new Date(row.created_at).getTime() - targetMs);
        if (delta < bestDelta) {
          bestDelta = delta;
          best = row;
        }
      }
      return best.id;
    },
    [clubId],
  );

  const loadClubMeta = useCallback(async () => {
    if (!clubId) return;
    const clubRes = await supabase
      .from("clubs")
      .select("slug, name, logo_url, join_reviewer_policy, join_default_role, join_default_team")
      .eq("id", clubId)
      .maybeSingle();
    if (clubRes.error) {
      toast({ title: "Error", description: clubRes.error.message, variant: "destructive" });
      return;
    }
    setClubSlug(clubRes.data?.slug ?? null);
    setClubName(clubRes.data?.name ?? null);
    setClubLogoUrl(clubRes.data?.logo_url?.trim() || null);
    const policy = (clubRes.data?.join_reviewer_policy as "admin_only" | "admin_trainer" | undefined) || "admin_only";
    setJoinReviewerPolicy(policy);
    setClubJoinDefaults({
      role: (clubRes.data?.join_default_role as string | undefined) || "member",
      team: (clubRes.data?.join_default_team as string | undefined)?.trim() || "",
    });
  }, [clubId, toast]);

  const fetchInvitesData = useCallback(async () => {
    if (!clubId) return;
    setInvitesLoading(true);

    await loadClubMeta();
    const [reqRes, invRes] = await Promise.all([
      supabase.from("club_invite_requests").select("*").eq("club_id", clubId).order("created_at", { ascending: false }).limit(100),
      supabase.from("club_invites").select("*").eq("club_id", clubId).order("created_at", { ascending: false }).limit(100),
    ]);

    if (reqRes.error) toast({ title: "Error", description: reqRes.error.message, variant: "destructive" });
    if (invRes.error) toast({ title: "Error", description: invRes.error.message, variant: "destructive" });

    setInviteRequests((reqRes.data as unknown as InviteRequestRow[]) || []);
    setInvites((invRes.data as unknown as ClubInviteRow[]) || []);
    setInvitesLoading(false);
  }, [clubId, toast, loadClubMeta]);

  useEffect(() => {
    if (!clubId) return;
    void loadClubMeta();
  }, [clubId, loadClubMeta]);

  useEffect(() => {
    setJoinRequestReviewById((prev) => {
      const next: Record<string, { role: string; team: string; note: string }> = { ...prev };
      for (const r of inviteRequests) {
        if (r.status !== "pending") continue;
        if (!next[r.id]) {
          next[r.id] = {
            role: clubJoinDefaults.role,
            team: clubJoinDefaults.team,
            note: (r.internal_note ?? "") || "",
          };
        }
      }
      for (const id of Object.keys(next)) {
        if (!inviteRequests.some((x) => x.id === id)) delete next[id];
      }
      return next;
    });
  }, [inviteRequests, clubJoinDefaults.role, clubJoinDefaults.team]);

  const fetchAbuseAudit = useCallback(async () => {
    if (!clubId) return;
    setAbuseAuditLoading(true);
    const { data, error } = await supabase.rpc("get_club_request_abuse_audit", { _club_id: clubId, _hours: 24 });
    if (error) {
      setAbuseAudit([]);
      setAbuseAuditLoading(false);
      return;
    }
    setAbuseAudit((data as unknown as AbuseAuditRow[]) || []);
    setAbuseAuditLoading(false);
  }, [clubId]);

  const fetchAbuseAlerts = useCallback(async () => {
    if (!clubId) return;
    setAbuseAlertsLoading(true);
    const { data, error } = await supabase.rpc("get_club_abuse_alerts", {
      _club_id: clubId,
      _status: "open",
      _limit: 20,
    });
    if (error) {
      setAbuseAlerts([]);
      setAbuseAlertsLoading(false);
      return;
    }
    setAbuseAlerts((data as unknown as AbuseAlertRow[]) || []);
    setAbuseAlertsLoading(false);
  }, [clubId]);

  const handleResolveAbuseAlert = useCallback(async (alertId: string) => {
    setResolvingAlertId(alertId);
    const { error } = await supabase.rpc("resolve_club_abuse_alert", { _alert_id: alertId, _note: null });
    if (error) {
      toast({ title: t.common.error, description: error.message, variant: "destructive" });
      setResolvingAlertId(null);
      return;
    }
    setAbuseAlerts((previous) => previous.filter((entry) => entry.id !== alertId));
    toast({ title: t.membersPage.abuseAlertResolved });
    setResolvingAlertId(null);
  }, [t, toast]);

  const teamAssignmentLabels = useMemo(
    () => ({
      title: t.membersPage.teamAssignmentTitle,
      hint: t.membersPage.teamAssignmentHintRoster,
      placeholder: t.membersPage.teamAssignmentPlaceholder,
      none: t.membersPage.teamAssignmentNone,
      selectedCount: t.membersPage.teamAssignmentSelectedCount,
    }),
    [t],
  );
  const draftTeamAssignmentLabels = useMemo(
    () => ({
      ...teamAssignmentLabels,
      hint: t.membersPage.teamAssignmentHintDraft,
    }),
    [teamAssignmentLabels, t],
  );

  useEffect(() => {
    if (!clubId) {
      setClubTeams([]);
      return;
    }
    void (async () => {
      const teamsRes = await supabase
        .from("teams")
        .select("id, name, age_group")
        .eq("club_id", clubId)
        .order("name");
      const teamIds = ((teamsRes.data as Array<{ id: string }> | null) ?? []).map((team) => team.id);
      const coachesProbe = await supabase
        .from("team_coaches")
        .select("id")
        .in("team_id", teamIds.length > 0 ? teamIds : ["00000000-0000-0000-0000-000000000000"])
        .limit(1);
      setSupportsTeamCoachesTable(!coachesProbe.error);
      setClubTeams(
        ((teamsRes.data as Array<{ id: string; name: string; age_group: string | null }> | null) ?? [])
          .filter((team) =>
            memberDataScope.teamIds === "all" || memberDataScope.teamIds.includes(team.id),
          )
          .map((team) => ({
            id: team.id,
            name: team.name,
            age_group: team.age_group,
          })),
      );
    })();
  }, [clubId, memberDataScope.teamIds]);

  const masterTabLabels = useMemo(() => ({
    identity: t.membersPage.masterSectionIdentity,
    contact: t.membersPage.masterSectionContact,
    sport: t.membersPage.masterSectionSport,
    performance: t.membersPage.masterSectionPerformance,
    club: t.membersPage.masterSectionClub,
    financial: t.membersPage.masterSectionFinancial,
    safety: t.membersPage.masterSectionSafety,
    clubCard: t.membersPage.masterSectionClubCard,
    clubCardHint: t.membersPage.masterClubCardHint,
    generateId: t.membersPage.masterGenerateId,
    downloadPass: t.membersPage.masterDownloadPassBtn,
    avatarPreview: t.settingsPage.avatarPreview,
    uploadAvatar: t.settingsPage.uploadAvatar,
    uploadingAvatar: t.settingsPage.uploadingAvatar,
    removeAvatar: t.settingsPage.removeAvatar,
    avatarUrl: t.settingsPage.avatarUrl,
    photoValidityHint: t.membersPage.photoValidityHint,
    photoRenewalDue: t.membersPage.photoRenewalDue,
    photoValidUntilLabel: t.membersPage.photoValidUntilLabel,
    photoFromRegistry: t.membersPage.photoFromRegistry,
    photoFromAccount: t.membersPage.photoFromAccount,
    photoAccountFallbackHint: t.membersPage.photoAccountFallbackHint,
    loginEmailLabel: t.membersPage.masterLoginEmailLabel,
    loginEmailHint: t.membersPage.masterLoginEmailHint,
    loginEmailMissing: t.membersPage.masterLoginEmailMissing,
  }), [t]);
  const clubPassLabels = useMemo(() => buildClubMemberPassLabels(t), [t]);
  const canReviewJoinRequests =
    canManageMembers ||
    getModuleAccess(gateRole, "invites") === "full" ||
    (perms.isTrainer && joinReviewerPolicy === "admin_trainer");
  const canAccessMembersPage = canAccessModule(gateRole, "members") || canManageMembers || perms.isTrainer;

  const canEditMemberMaster = useCallback(
    (membershipId: string) => canManageMembers || Boolean(editableMasterActorById[membershipId]),
    [canManageMembers, editableMasterActorById],
  );

  const masterEditActorFor = useCallback(
    (membershipId: string): MemberMasterEditActor =>
      canManageMembers ? "manager" : editableMasterActorById[membershipId] ?? "self",
    [canManageMembers, editableMasterActorById],
  );

  useEffect(() => {
    if (!clubId) {
      setEditableMasterActorById({});
      return;
    }
    let cancelled = false;
    void (async () => {
      const { data } = await listEditableMemberMasterMemberships(clubId);
      if (cancelled) return;
      const map: Record<string, MemberMasterEditActor> = {};
      for (const row of data ?? []) {
        if (row.edit_actor === "manager") map[row.membership_id] = "manager";
        else if (row.edit_actor === "trainer") map[row.membership_id] = "trainer";
        else map[row.membership_id] = "self";
      }
      setEditableMasterActorById(map);
    })();
    return () => {
      cancelled = true;
    };
  }, [clubId]);

  const fetchMembers = useCallback(async () => {
    if (!clubId) return;
    const finishMembersFetch = () => {
      setHasMembersHydrated(true);
      setLoading(false);
    };
    const teamScope = memberDataScope.teamIds;
    let scopedMembershipIds: Set<string> | null = null;
    if (teamScope !== "all") {
      if (teamScope.length === 0) {
        setMembers([]);
        setMembersDbTotalCount(0);
        setClubMemberStats(null);
        finishMembersFetch();
        return;
      }
      const [playersRes, coachesRes] = await Promise.all([
        supabase.from("team_players").select("membership_id").in("team_id", teamScope),
        supabase.from("team_coaches").select("membership_id").in("team_id", teamScope),
      ]);
      scopedMembershipIds = new Set<string>();
      for (const row of (playersRes.data ?? []) as { membership_id: string }[]) {
        scopedMembershipIds.add(String(row.membership_id));
      }
      for (const row of (coachesRes.data ?? []) as { membership_id: string }[]) {
        scopedMembershipIds.add(String(row.membership_id));
      }
    }
    const applyTeamScope = <T extends { id: string }>(rows: T[]): T[] => {
      if (!scopedMembershipIds) return rows;
      return rows.filter((row) => scopedMembershipIds!.has(row.id));
    };
    const searchKey = debouncedSearch.trim().length >= 2 ? debouncedSearch.trim() : "";
    const pivot = `${clubId}\0${roleFilter}\0${searchKey}`;
    if (membersPivotRef.current !== pivot) {
      membersPivotRef.current = pivot;
      if (membersServerPage !== 1) {
        setMembersServerPage(1);
        return;
      }
    }
    setLoading(true);
    const from = (membersServerPage - 1) * MEMBERS_SERVER_PAGE_SIZE;
    const to = from + MEMBERS_SERVER_PAGE_SIZE - 1; // upper bound for PostgREST range()

    const applyStats = (statsRes: { data: unknown; error: { message: string } | null }) => {
      if (statsRes.error) {
        setClubMemberStats(null);
      } else {
        const raw = statsRes.data;
        const row = (Array.isArray(raw) ? raw[0] : raw) as Record<string, unknown> | undefined;
        if (row && typeof row === "object") {
          setClubMemberStats({
            total: Number(row.total_count ?? 0),
            active: Number(row.active_count ?? 0),
            players: Number(row.player_count ?? 0),
            trainers: Number(row.trainer_count ?? 0),
          });
        } else {
          setClubMemberStats(null);
        }
      }
    };

    const loadSidecarsForMemberships = async (membershipIds: string[]) => {
      if (membershipIds.length === 0) {
        setMemberTeamNamesById({});
        setMemberPlayerTeamIdsById({});
        setMemberCoachTeamIdsById({});
        setMasterByMembershipId({});
        setGuardianLinks([]);
        setMembershipEmails({});
        return;
      }
      const [teamRowsRes, playersRes, coachesRes, masterRes, guardianRes, emailRes] = await Promise.all([
        supabase.from("teams").select("id, name").eq("club_id", clubId),
        supabase.from("team_players").select("team_id, membership_id").in("membership_id", membershipIds),
        supabase.from("team_coaches").select("team_id, membership_id").in("membership_id", membershipIds),
        supabase.from("club_member_master_records").select("*").in("membership_id", membershipIds),
        supabase.from("club_member_guardian_links").select("*").eq("club_id", clubId),
        supabase.rpc("list_club_membership_emails", { _club_id: clubId }),
      ]);

      const teamsById = new Map<string, string>();
      ((teamRowsRes.data as Array<Record<string, unknown>> | null) || []).forEach((row) => {
        teamsById.set(String(row.id), String(row.name));
      });

      const nameMap: Record<string, string[]> = {};
      const playerIdMap: Record<string, string[]> = {};
      const coachIdMap: Record<string, string[]> = {};
      const applyNameRows = (rows: Array<Record<string, unknown>>) => {
        rows.forEach((row) => {
          const membershipId = String(row.membership_id);
          const teamId = String(row.team_id);
          const teamName = teamsById.get(teamId);
          if (!teamName) return;
          const existing = nameMap[membershipId] || [];
          nameMap[membershipId] = existing.includes(teamName) ? existing : [...existing, teamName];
        });
      };
      const applyIdRows = (
        rows: Array<Record<string, unknown>>,
        target: Record<string, string[]>,
      ) => {
        rows.forEach((row) => {
          const membershipId = String(row.membership_id);
          const teamId = String(row.team_id);
          const existing = target[membershipId] || [];
          target[membershipId] = existing.includes(teamId) ? existing : [...existing, teamId];
        });
      };

      if (!playersRes.error) {
        const rows = (playersRes.data as Array<Record<string, unknown>> | null) || [];
        applyNameRows(rows);
        applyIdRows(rows, playerIdMap);
      }
      if (!coachesRes.error) {
        const rows = (coachesRes.data as Array<Record<string, unknown>> | null) || [];
        applyNameRows(rows);
        applyIdRows(rows, coachIdMap);
      }
      if (coachesRes.error && !isMissingRelationError(coachesRes.error)) {
        toast({ title: t.membersPage.errorLoadingMembers, description: coachesRes.error.message, variant: "destructive" });
      }
      setMemberTeamNamesById(nameMap);
      setMemberPlayerTeamIdsById(playerIdMap);
      setMemberCoachTeamIdsById(coachIdMap);

      if (!masterRes.error && masterRes.data) {
        const nextMaster: Record<string, ClubMemberMasterRecord | null> = {};
        for (const row of masterRes.data as ClubMemberMasterRecord[]) {
          nextMaster[row.membership_id] = row;
        }
        setMasterByMembershipId(nextMaster);
      } else if (masterRes.error && !isMissingRelationError(masterRes.error)) {
        toast({ title: t.membersPage.errorLoadingMembers, description: masterRes.error.message, variant: "destructive" });
        setMasterByMembershipId({});
      } else {
        setMasterByMembershipId({});
      }

      if (!guardianRes.error && guardianRes.data) {
        setGuardianLinks(guardianRes.data as unknown as GuardianLinkRow[]);
      } else if (guardianRes.error && !isMissingRelationError(guardianRes.error)) {
        toast({ title: t.membersPage.errorLoadingMembers, description: guardianRes.error.message, variant: "destructive" });
        setGuardianLinks([]);
      } else {
        setGuardianLinks([]);
      }

      if (!emailRes.error && emailRes.data) {
        const em: Record<string, string> = {};
        for (const row of emailRes.data as { membership_id: string; email: string }[]) {
          if (row.membership_id && row.email) em[row.membership_id] = row.email;
        }
        setMembershipEmails(em);
      } else {
        setMembershipEmails({});
      }
    };

    const trimmedSearch = debouncedSearch.trim();
    if (trimmedSearch.length >= 2) {
      const [rpcRes, statsRes] = await Promise.all([
        supabaseDynamic.rpc("search_club_members_page", {
          _club_id: clubId,
          _search: trimmedSearch,
          _role_filter: roleFilter === "all" ? null : roleFilter,
          _limit: MEMBERS_SERVER_PAGE_SIZE,
          _offset: from,
        }),
        supabaseDynamic.rpc("get_club_member_stats", { _club_id: clubId }),
      ]);
      applyStats(statsRes);
      const { data: rawSearch, error: rpcErr } = rpcRes;
      if (rpcErr) {
        toast({
          title: t.membersPage.errorLoadingMembers,
          description: supabaseErrorMessage(rpcErr),
          variant: "destructive",
        });
        finishMembersFetch();
        return;
      }
      const payload = rawSearch as { total?: unknown; items?: unknown } | null;
      const total = typeof payload?.total === "number" ? payload.total : 0;
      const rawItems = Array.isArray(payload?.items) ? payload.items : [];
      const memberships = applyTeamScope(
        rawItems.map((row) => mapSearchRpcRowToMember(row as Record<string, unknown>)),
      );
      setMembersDbTotalCount(scopedMembershipIds ? memberships.length : total);
      setMembers(memberships);
      await loadSidecarsForMemberships(memberships.map((item) => item.id));
      finishMembersFetch();
      return;
    }

    let membershipQuery = supabase
      .from("club_memberships")
      .select("id, club_id, user_id, role, position, age_group, team, status, created_at", { count: "exact" })
      .eq("club_id", clubId)
      .order("created_at", { ascending: false });
    if (roleFilter !== "all") {
      membershipQuery = membershipQuery.eq("role", roleFilter);
    }

    const [memRes, statsRes] = await Promise.all([
      membershipQuery.range(from, to),
      supabaseDynamic.rpc("get_club_member_stats", { _club_id: clubId }),
    ]);

    const { data: membershipData, error: membershipError, count } = memRes;
    setMembersDbTotalCount(
      scopedMembershipIds ? memberships.length : typeof count === "number" ? count : null,
    );
    applyStats(statsRes);

    if (membershipError) {
      toast({ title: t.membersPage.errorLoadingMembers, description: membershipError.message, variant: "destructive" });
      finishMembersFetch();
      return;
    }

    const memberships = applyTeamScope((membershipData as unknown as MemberRow[]) || []);
    const userIds = Array.from(new Set(memberships.map((item) => item.user_id))).filter(Boolean);
    const membershipIds = memberships.map((item) => item.id);

    let profileByUserId = new Map<string, MemberRow["profiles"]>();
    if (userIds.length) {
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("display_name, avatar_url, phone, user_id")
        .in("user_id", userIds);

      if (profileError) {
        toast({ title: t.membersPage.errorLoadingMembers, description: profileError.message, variant: "destructive" });
      } else {
        profileByUserId = new Map(
          ((profileData as MemberRow["profiles"][]) || []).map((profile) => [profile.user_id, profile]),
        );
      }
    }

    const withProfiles = memberships.map((membership) => ({
      ...membership,
      profiles: profileByUserId.get(membership.user_id),
    }));
    setMembers(withProfiles);

    await loadSidecarsForMemberships(membershipIds);
    finishMembersFetch();
  }, [clubId, debouncedSearch, membersServerPage, roleFilter, toast, t, memberDataScope.teamIds]);

  useEffect(() => {
    void fetchMembers();
  }, [fetchMembers]);

  useEffect(() => {
    if (tab !== "invites") return;
    if (!clubId) return;
    if (!canAccessMembersPage) return;
    void fetchInvitesData();
  }, [tab, clubId, canAccessMembersPage, fetchInvitesData]);

  useEffect(() => {
    if (tab !== "invites") return;
    if (!clubId) return;
    if (!canReviewJoinRequests) {
      setAbuseAudit([]);
      return;
    }
    void fetchAbuseAudit();
  }, [tab, clubId, canReviewJoinRequests, fetchAbuseAudit]);

  useEffect(() => {
    if (tab !== "invites") return;
    if (!clubId) return;
    if (!canReviewJoinRequests) {
      setAbuseAlerts([]);
      return;
    }
    void fetchAbuseAlerts();
  }, [tab, clubId, canReviewJoinRequests, fetchAbuseAlerts]);

  useEffect(() => {
    if (tab !== "members") return;
    if (!clubId) return;
    if (!canManageMembers) return;
    void fetchMemberDrafts();
  }, [tab, clubId, canManageMembers, fetchMemberDrafts]);

  useEffect(() => {
    if (!clubId || !canManageMembers) {
      setSearchMatchedDrafts([]);
      return;
    }
    const q = debouncedSearch.trim();
    if (q.length < 2) {
      setSearchMatchedDrafts([]);
      setSearchDraftsLoading(false);
      return;
    }
    let cancelled = false;
    setSearchDraftsLoading(true);
    const escaped = q.replace(/[%_\\]/g, "\\$&");
    const pattern = `%${escaped}%`;
    void (async () => {
      const { data, error } = await supabase
        .from("club_member_drafts")
        .select("*")
        .eq("club_id", clubId)
        .in("status", ["draft", "invited"])
        .or(
          [
            `name.ilike.${pattern}`,
            `email.ilike.${pattern}`,
            `team.ilike.${pattern}`,
            `age_group.ilike.${pattern}`,
            `position.ilike.${pattern}`,
            `master_data->>first_name.ilike.${pattern}`,
            `master_data->>last_name.ilike.${pattern}`,
            `master_data->>internal_club_number.ilike.${pattern}`,
            `master_data->>city.ilike.${pattern}`,
            `master_data->>postal_code.ilike.${pattern}`,
            `master_data->>street_line.ilike.${pattern}`,
          ].join(","),
        )
        .order("created_at", { ascending: false })
        .limit(DRAFT_SEARCH_MAX_ROWS);
      if (cancelled) return;
      if (error || !data) {
        setSearchMatchedDrafts([]);
      } else {
        const rows = data as unknown as MemberDraftRow[];
        setSearchMatchedDrafts(rows.filter((draft) => draftMatchesMemberSearch(q, draft)));
      }
      setSearchDraftsLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [clubId, debouncedSearch, canManageMembers]);

  const mergedSearchDrafts = useMemo(() => {
    const q = debouncedSearch.trim();
    if (q.length < 2) return [];
    return mergeDraftSearchResults(q, memberDrafts, searchMatchedDrafts);
  }, [debouncedSearch, memberDrafts, searchMatchedDrafts]);

  useEffect(() => {
    if (!clubId) return;
    const debounceMs = 400;
    let debounceTimer: ReturnType<typeof setTimeout> | undefined;
    const channels: ReturnType<typeof supabase.channel>[] = [];

    const schedule = (fn: () => void) => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        debounceTimer = undefined;
        fn();
      }, debounceMs);
    };

    if (tab === "members" && canManageMembers) {
      const ch = supabase
        .channel(`club-member-drafts-rt-${clubId}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "club_member_drafts", filter: `club_id=eq.${clubId}` },
          () => schedule(() => void fetchMemberDrafts()),
        )
        .subscribe();
      channels.push(ch);
    }

    if (tab === "invites" && canAccessMembersPage) {
      const ch = supabase
        .channel(`club-invites-rt-${clubId}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "club_invites", filter: `club_id=eq.${clubId}` },
          () => schedule(() => void fetchInvitesData()),
        )
        .subscribe();
      channels.push(ch);
    }

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      for (const ch of channels) {
        void supabase.removeChannel(ch);
      }
    };
  }, [clubId, tab, canManageMembers, canAccessMembersPage, fetchMemberDrafts, fetchInvitesData]);

  useEffect(() => {
    const run = async () => {
      if (!showAddMembers || !clubId || !canManageMembers) return;
      const { data } = await supabase
        .from("club_invites")
        .select("*")
        .eq("club_id", clubId)
        .order("created_at", { ascending: false })
        .limit(500);
      if (data) setInvites(data as unknown as ClubInviteRow[]);
    };
    void run();
  }, [showAddMembers, clubId, canManageMembers]);

  useEffect(() => {
    const run = async () => {
      if (!showAddMembers || !clubId || !canManageMembers) {
        setExistingMemberEmails(new Set());
        return;
      }

      const emails = Array.from(
        new Set(
          bulkRows
            .map((row) => normalizeEmail(row.email))
            .filter(Boolean)
        )
      );

      if (!emails.length) {
        setExistingMemberEmails(new Set());
        return;
      }

      const { data, error } = await supabase.rpc("lookup_club_member_emails", {
        _club_id: clubId,
        _emails: emails,
      });

      if (error) {
        setExistingMemberEmails(new Set());
        return;
      }

      const matched = new Set<string>();
      for (const row of (data as { email: string; is_member: boolean }[] | null) ?? []) {
        if (row.is_member && row.email) matched.add(normalizeEmail(row.email));
      }
      setExistingMemberEmails(matched);
    };

    void run();
  }, [showAddMembers, clubId, canManageMembers, bulkRows]);

  const filtered = useMemo(() => {
    let result: MemberRow[];
    if (debouncedSearch.trim().length >= 2) {
      result = members;
    } else {
      result = members.filter((m) => {
        const master = masterByMembershipId[m.id];
        const masterName = `${master?.first_name || ""} ${master?.last_name || ""}`.trim().toLowerCase();
        const name = (m.profiles?.display_name || "").toLowerCase();
        const phoneValue = (m.profiles?.phone || "").toLowerCase();
        const emailValue = (membershipEmails[m.id] || "").toLowerCase();
        const query = search.toLowerCase();
        const matchSearch =
          name.includes(query) ||
          masterName.includes(query) ||
          phoneValue.includes(query) ||
          emailValue.includes(query);
        const matchRole = roleFilter === "all" || m.role === roleFilter;
        return matchSearch && matchRole;
      });
    }
    if (sharedContactFilterEmail) {
      result = result.filter(
        (member) => normalizeEmail(membershipEmails[member.id] || "") === sharedContactFilterEmail,
      );
    }
    return result;
  }, [members, masterByMembershipId, membershipEmails, roleFilter, search, debouncedSearch, sharedContactFilterEmail]);

  const trimmedSearch = search.trim();
  const isSearchActive = trimmedSearch.length > 0;
  const rosterSearchQuery =
    debouncedSearch.trim().length >= 2 ? debouncedSearch.trim() : trimmedSearch;

  const rosterSearchResults = useMemo(() => {
    if (!isSearchActive) return [];
    return filtered.map((member) => ({
      member,
      fields: collectRosterSearchMatchFields(
        rosterSearchQuery,
        member,
        masterByMembershipId[member.id],
        membershipEmails[member.id],
      ),
    }));
  }, [filtered, isSearchActive, rosterSearchQuery, masterByMembershipId, membershipEmails]);

  const getMemberRosterName = useCallback(
    (member: MemberRow) => {
      const master = masterByMembershipId[member.id];
      const fn = master?.first_name?.trim();
      const ln = master?.last_name?.trim();
      if (fn || ln) return [fn, ln].filter(Boolean).join(" ");
      return member.profiles?.display_name || t.membersPage.unknownMember;
    },
    [masterByMembershipId, t.membersPage.unknownMember],
  );

  const duplicateReviewEntries = useMemo(
    () => [
      ...members.map((member) => ({
        id: member.id,
        source: "roster" as const,
        email: membershipEmails[member.id] || "",
        name: getMemberRosterName(member),
        memberNumber: masterByMembershipId[member.id]?.internal_club_number,
      })),
      ...memberDrafts.map((draft) => {
        const master = masterRecordFromDraft(draft.master_data, draft.name || "");
        return {
          id: draft.id,
          source: "draft" as const,
          email: draft.email || "",
          name:
            draft.name?.trim() ||
            registryImportRowDisplayName(master ?? {}, draft.email ?? ""),
          memberNumber: master?.internal_club_number,
        };
      }),
    ],
    [getMemberRosterName, masterByMembershipId, memberDrafts, members, membershipEmails],
  );

  const duplicateReviewMap = useMemo(
    () => buildMemberDuplicateReviewMap(duplicateReviewEntries),
    [duplicateReviewEntries],
  );

  const duplicateReviewCount = useMemo(
    () => countMemberDuplicateReviewEntries(duplicateReviewMap),
    [duplicateReviewMap],
  );

  const duplicateReviewKeys = useMemo(() => new Set(duplicateReviewMap.keys()), [duplicateReviewMap]);

  const duplicateReviewReasonLabels = useMemo(
    (): Record<MemberDuplicateReviewReason, string> => ({
      duplicate_club_number: t.membersPage.duplicateReviewReasonClubNumber,
      duplicate_name_and_email: t.membersPage.duplicateReviewReasonNameEmail,
      roster_and_draft_overlap: t.membersPage.duplicateReviewReasonRosterDraft,
    }),
    [t],
  );

  const duplicateDraftRemovalPlan = useMemo(
    () =>
      planDuplicateDraftRemovals(duplicateReviewEntries, {
        protectedDraftIds: new Set(
          memberDrafts.filter((draft) => draft.status === "invited").map((draft) => draft.id),
        ),
      }),
    [duplicateReviewEntries, memberDrafts],
  );

  const duplicateDraftsToRemoveCount = duplicateDraftRemovalPlan.draftIdsToRemove.length;

  const rosterForDisplay = useMemo(() => {
    if (statsFilter !== "needs_review") return filtered;
    return filtered.filter((member) => memberNeedsDuplicateReview(duplicateReviewMap, "roster", member.id));
  }, [duplicateReviewMap, filtered, statsFilter]);

  const filteredDrafts = useMemo(() => {
    const base = !isSearchActive
      ? memberDrafts
      : debouncedSearch.trim().length >= 2
        ? mergedSearchDrafts
        : memberDrafts.filter((draft) => draftMatchesMemberSearch(trimmedSearch, draft));
    return base
      .filter((draft) => draftMatchesStatsFilter(draft, statsFilter === "needs_review" ? null : statsFilter))
      .filter((draft) =>
        sharedContactFilterEmail ? normalizeEmail(draft.email) === sharedContactFilterEmail : true,
      );
  }, [
    memberDrafts,
    isSearchActive,
    trimmedSearch,
    debouncedSearch,
    mergedSearchDrafts,
    statsFilter,
    sharedContactFilterEmail,
  ]);

  const sharedContactFilterActive = Boolean(sharedContactFilterEmail);

  /** Full saved-list rows for the current filter context (before preview slice). */
  const savedDraftsForDisplay = useMemo(() => {
    if (statsFilter === "needs_review") {
      return memberDrafts.filter((draft) => memberNeedsDuplicateReview(duplicateReviewMap, "draft", draft.id));
    }
    if (isSearchActive || statsFilter || sharedContactFilterActive) {
      return filteredDrafts;
    }
    return memberDrafts;
  }, [
    duplicateReviewMap,
    filteredDrafts,
    isSearchActive,
    memberDrafts,
    sharedContactFilterActive,
    statsFilter,
  ]);

  const savedDraftsPreviewApplicable =
    !isSearchActive && savedDraftsForDisplay.length > SAVED_MEMBER_LIST_PREVIEW_COUNT;

  const visibleDrafts = useMemo(() => {
    if (isSearchActive) return filteredDrafts;
    if (!showAllDrafts && savedDraftsPreviewApplicable) {
      return savedDraftsForDisplay.slice(0, SAVED_MEMBER_LIST_PREVIEW_COUNT);
    }
    return savedDraftsForDisplay;
  }, [filteredDrafts, isSearchActive, savedDraftsForDisplay, savedDraftsPreviewApplicable, showAllDrafts]);

  useEffect(() => {
    setShowAllDrafts(false);
  }, [clubId]);

  const applyStatsFilter = useCallback(
    (next: MembersStatsFilter) => {
      const nextFilter = statsFilter === next ? null : next;
      setStatsFilter(nextFilter);
      if (nextFilter === "players") setRoleFilter("player");
      else if (nextFilter === "trainers") setRoleFilter("trainer");
      else if (nextFilter === null || nextFilter === "total") setRoleFilter("all");
      requestAnimationFrame(() => {
        savedMemberListRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    },
    [statsFilter],
  );

  const getSearchMatchFieldLabel = useCallback(
    (field: MemberSearchMatchField) => {
      switch (field) {
        case "display_name":
          return t.membersPage.searchMatchDisplayName;
        case "master_name":
          return t.membersPage.searchMatchMasterName;
        case "first_name":
          return t.membersPage.searchMatchFirstName;
        case "last_name":
          return t.membersPage.searchMatchLastName;
        case "phone":
          return t.membersPage.searchMatchPhone;
        case "email":
          return t.membersPage.searchMatchEmail;
        case "internal_club_number":
          return t.membersPage.searchMatchInternalNumber;
        case "team":
          return t.membersPage.searchMatchTeam;
        case "draft_name":
          return t.membersPage.searchMatchDraftName;
        default:
          return t.membersPage.searchMatchGeneric;
      }
    },
    [t],
  );

  const focusRosterMember = useCallback((member: MemberRow) => {
    setSelectedMember(member);
    setMemberPanelEditModeId(null);
    setMemberMasterEditDraft({});
    window.requestAnimationFrame(() => {
      document.getElementById(`roster-member-${member.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }, []);

  useEffect(() => {
    const membershipId = pendingFocusMembershipIdRef.current;
    if (!membershipId || loading) return;
    const member = members.find((row) => row.id === membershipId);
    if (!member) return;
    pendingFocusMembershipIdRef.current = null;
    focusRosterMember(member);
  }, [members, loading, focusRosterMember]);

  const getInvitedDraftPrimaryAction = useCallback(
    (draft: MemberDraftRow): "resend" | "open_roster" | null => {
      if (draft.status !== "invited") return null;
      const meta = draftInviteMetaById[draft.id];
      if (meta?.inviteUsed && meta.rosterMembershipId) return "open_roster";
      return "resend";
    },
    [draftInviteMetaById],
  );

  const membersServerTotalPages = Math.max(
    1,
    Math.ceil((membersDbTotalCount ?? 0) / MEMBERS_SERVER_PAGE_SIZE) || 1,
  );

  const getMemberAssignedTeamNames = useCallback((member: MemberRow) => {
    return membershipDisplayTeamLabel({
      assignedTeamNames: memberTeamNamesById[member.id] || [],
      membershipTeam: member.team,
      ageGroup: member.age_group,
    });
  }, [memberTeamNamesById]);

  const getMemberTeamLabel = useCallback((member: MemberRow) => {
    const assigned = getMemberAssignedTeamNames(member);
    return assigned || t.membersPage.noTeam;
  }, [getMemberAssignedTeamNames, t.membersPage.noTeam]);

  const draftTeamLabelForCard = useMemo(() => {
    const fromIds = clubTeamNamesFromIds(clubTeams, editDraftTeamIds).join(", ");
    return fromIds || editingDraftForm.team.trim();
  }, [clubTeams, editDraftTeamIds, editingDraftForm.team]);

  const sharedContactGroups = useMemo(() => {
    const entries: Array<{
      id: string;
      email: string;
      name: string;
      memberNumber?: string | null;
      source: "roster" | "draft" | "import";
    }> = [];

    for (const member of members) {
      const email = membershipEmails[member.id];
      if (!email) continue;
      entries.push({
        id: member.id,
        email,
        name: getMemberRosterName(member),
        memberNumber: masterByMembershipId[member.id]?.internal_club_number,
        source: "roster",
      });
    }

    for (const draft of memberDrafts) {
      const email = draft.email?.trim();
      if (!email) continue;
      const master = masterRecordFromDraft(draft.master_data, draft.name || "");
      entries.push({
        id: draft.id,
        email,
        name: draft.name?.trim() || email,
        memberNumber: master?.internal_club_number,
        source: "draft",
      });
    }

    for (const row of bulkRows) {
      const email = row.email?.trim();
      if (!email) continue;
      entries.push({
        id: row.id,
        email,
        name: row.name.trim() || email,
        memberNumber: row.masterData.internal_club_number,
        source: "import",
      });
    }

    return buildSharedContactEmailGroups(entries);
  }, [bulkRows, getMemberRosterName, masterByMembershipId, memberDrafts, members, membershipEmails]);

  const sharedContactFilterCount = sharedContactFilterActive
    ? filteredDrafts.length + filtered.length
    : 0;

  const rosterHouseholdDiscountGroups = useMemo(() => {
    const refs = [
      ...members.map((member) =>
        householdRefFromMasterLike(
          member.id,
          membershipEmails[member.id] || "",
          masterByMembershipId[member.id] ?? {},
          { membershipId: member.id },
        ),
      ),
      ...memberDrafts.map((draft) => {
        const master = masterRecordFromDraft(draft.master_data, draft.name || "");
        return householdRefFromMasterLike(draft.id, draft.email || "", master ?? {}, { draftId: draft.id });
      }),
    ];
    return buildHouseholdDiscountGroups(refs);
  }, [masterByMembershipId, memberDrafts, members, membershipEmails]);

  const bulkHouseholdDiscountGroups = useMemo(() => {
    const refs = bulkRows.map((row) => householdRefFromMasterLike(row.id, row.email, row.masterData));
    return buildHouseholdDiscountGroups(refs).filter((group) => group.eligibleForFamilyDiscount);
  }, [bulkRows]);

  const handleExportMemberRegistry = useCallback(async () => {
    if (!clubId) return;
    const EXPORT_CAP = 5000;
    const [memRes, draftRes] = await Promise.all([
      supabase
        .from("club_memberships")
        .select("id, club_id, user_id, role, position, age_group, team, status, created_at")
        .eq("club_id", clubId)
        .order("created_at", { ascending: false })
        .limit(EXPORT_CAP),
      supabase
        .from("club_member_drafts")
        .select("id, email, name, role, team, age_group, position, status, created_at, master_data")
        .eq("club_id", clubId)
        .in("status", ["draft", "invited"])
        .order("created_at", { ascending: false })
        .limit(EXPORT_CAP),
    ]);
    if (memRes.error) {
      toast({ title: t.common.error, description: memRes.error.message, variant: "destructive" });
      return;
    }
    if (draftRes.error) {
      toast({ title: t.common.error, description: draftRes.error.message, variant: "destructive" });
      return;
    }
    const exportMembers = (memRes.data as unknown as MemberRow[]) || [];
    const pendingDrafts = (draftRes.data as unknown as MemberDraftRow[]) || [];
    const userIds = Array.from(new Set(exportMembers.map((item) => item.user_id))).filter(Boolean);
    const membershipIds = exportMembers.map((item) => item.id);
    let profileByUserId = new Map<string, MemberRow["profiles"]>();
    if (userIds.length) {
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("display_name, avatar_url, phone, user_id")
        .in("user_id", userIds);
      if (profileError) {
        toast({ title: t.common.error, description: profileError.message, variant: "destructive" });
        return;
      }
      profileByUserId = new Map(
        ((profileData as MemberRow["profiles"][]) || []).map((profile) => [profile.user_id, profile]),
      );
    }
    const withProfiles = exportMembers.map((m) => ({
      ...m,
      profiles: profileByUserId.get(m.user_id),
    }));
    const masterMap: Record<string, ClubMemberMasterRecord | null> = {};
    const teamLabelMap: Record<string, string[]> = {};
    const emailMap: Record<string, string> = { ...membershipEmails };
    if (membershipIds.length) {
      const [teamRowsRes, playersRes, coachesRes, masterRes, emailRes] = await Promise.all([
        supabase.from("teams").select("id, name").eq("club_id", clubId),
        supabase.from("team_players").select("team_id, membership_id").in("membership_id", membershipIds),
        supabase.from("team_coaches").select("team_id, membership_id").in("membership_id", membershipIds),
        supabase.from("club_member_master_records").select("*").in("membership_id", membershipIds),
        supabase.rpc("list_club_membership_emails", { _club_id: clubId }),
      ]);
      const teamsById = new Map<string, string>();
      ((teamRowsRes.data as Array<Record<string, unknown>> | null) || []).forEach((row) => {
        teamsById.set(String(row.id), String(row.name));
      });
      const applyRows = (rows: Array<Record<string, unknown>>, map: Record<string, string[]>) => {
        rows.forEach((row) => {
          const membershipId = String(row.membership_id);
          const teamId = String(row.team_id);
          const teamName = teamsById.get(teamId);
          if (!teamName) return;
          const existing = map[membershipId] || [];
          map[membershipId] = existing.includes(teamName) ? existing : [...existing, teamName];
        });
      };
      if (!playersRes.error) applyRows(((playersRes.data as Array<Record<string, unknown>> | null) || []), teamLabelMap);
      if (!coachesRes.error) applyRows(((coachesRes.data as Array<Record<string, unknown>> | null) || []), teamLabelMap);
      if (!masterRes.error && masterRes.data) {
        for (const row of masterRes.data as ClubMemberMasterRecord[]) {
          masterMap[row.membership_id] = row;
        }
      }
      if (!emailRes.error && emailRes.data) {
        for (const row of emailRes.data as { membership_id: string; email: string }[]) {
          if (row.membership_id && row.email) emailMap[row.membership_id] = row.email;
        }
      }
    }
    const getTeam = (m: MemberRow) => {
      const assigned = teamLabelMap[m.id] || [];
      const label = membershipDisplayTeamLabel({
        assignedTeamNames: assigned,
        membershipTeam: m.team,
        ageGroup: m.age_group,
      });
      return label || t.membersPage.noTeam;
    };
    const getName = (m: MemberRow) => {
      const master = masterMap[m.id];
      const fn = master?.first_name?.trim();
      const ln = master?.last_name?.trim();
      if (fn || ln) return [fn, ln].filter(Boolean).join(" ");
      return m.profiles?.display_name || t.membersPage.unknownMember;
    };
    const rosterSnapshot = withProfiles.map((m) => ({
      email: emailMap[m.id] || "",
      displayName: getName(m),
      role: m.role,
      status: m.status,
      team: getTeam(m),
      ageGroup: m.age_group || "",
      position: m.position || "",
      joinedAt: new Date(m.created_at).toISOString().slice(0, 10),
      master: masterMap[m.id] || null,
    }));
    const rosterEmails = new Set(
      rosterSnapshot.map((row) => normalizeEmail(row.email)).filter(Boolean),
    );
    const draftSnapshot = pendingDrafts
      .filter((draft) => {
        const email = normalizeEmail(draft.email);
        if (email && rosterEmails.has(email)) return false;
        return Boolean(email || draft.name.trim() || masterRecordFromDraft(draft.master_data, draft.name));
      })
      .map((draft) => {
        const master = masterRecordFromDraft(draft.master_data, draft.name);
        const fn = master?.first_name?.trim();
        const ln = master?.last_name?.trim();
        const displayName =
          [fn, ln].filter(Boolean).join(" ") || draft.name.trim() || t.membersPage.unknownMember;
        const teamLabel =
          membershipDisplayTeamLabel({
            assignedTeamNames: [],
            membershipTeam: draft.team,
            ageGroup: draft.age_group,
          }) || t.membersPage.noTeam;
        return {
          email: (draft.email ?? "").trim(),
          displayName,
          role: draft.role,
          status: draft.status,
          team: teamLabel,
          ageGroup: draft.age_group || "",
          position: draft.position || "",
          joinedAt: "",
          master,
        };
      });
    const membersSnapshot = [...rosterSnapshot, ...draftSnapshot].slice(0, EXPORT_CAP);
    await buildMemberRegistryWorkbook({
      clubName: clubName || "Club",
      membersSnapshot,
    });
    const capped = rosterSnapshot.length + draftSnapshot.length > EXPORT_CAP;
    const description = capped
      ? t.membersPage.registryExportDescCapped
          .replace("{rosterCount}", String(rosterSnapshot.length))
          .replace("{draftCount}", String(draftSnapshot.length))
          .replace("{cap}", String(EXPORT_CAP))
      : t.membersPage.registryExportDescCounts
          .replace("{rosterCount}", String(rosterSnapshot.length))
          .replace("{draftCount}", String(draftSnapshot.length));
    toast({
      title: t.membersPage.registryExportTitle,
      description,
    });
  }, [clubId, clubName, membershipEmails, t, toast]);

  const handleSaveMasterRecord = useCallback(
    async (
      member: MemberRow,
      payload: Partial<ClubMemberMasterRecord>,
      options?: { suppressToast?: boolean },
    ) => {
      if (!clubId || !canEditMemberMaster(member.id)) {
        toast({ title: t.common.notAuthorized, description: t.membersPage.onlyAdminsMembers, variant: "destructive" });
        return;
      }
      const actor = masterEditActorFor(member.id);
      const baseline = masterByMembershipId[member.id] ?? {};
      const diff = buildMemberMasterSavePayload(payload, actor, baseline);
      if (!diff) {
        toast({
          title: t.common.error,
          description: t.myMemberDataPage.saveFailedNoChanges,
          variant: "destructive",
        });
        throw new Error("no_changes_detected");
      }
      const { data, error } = await saveMemberMasterRecord(member.id, diff);
      if (error) {
        toast({ title: t.common.error, description: error.message, variant: "destructive" });
        throw new Error(error.message);
      }
      if (data) {
        setMasterByMembershipId((previous) => ({
          ...previous,
          [member.id]: data as unknown as ClubMemberMasterRecord,
        }));
      }
      if (!options?.suppressToast) {
        const savedName =
          [payload.first_name, payload.last_name].filter(Boolean).join(" ").trim() ||
          member.profiles?.display_name?.trim() ||
          t.membersPage.unknownMember;
        toast({
          title: t.membersPage.masterDataSavedTitle,
          description: t.membersPage.masterDataSavedDescRoster.replace("{name}", savedName),
        });
      }
    },
    [canEditMemberMaster, clubId, masterByMembershipId, masterEditActorFor, t, toast],
  );

  const emailToMembershipIdFromEmail = useCallback(
    (emailRaw: string) => {
      const e = normalizeEmail(emailRaw);
      if (!e) return null;
      const found = members.find((m) => normalizeEmail(membershipEmails[m.id] || "") === e);
      return found?.id ?? null;
    },
    [members, membershipEmails],
  );

  const handlePrepareRegistryImport = useCallback(
    async (file: File) => {
      if (!clubId || !canManageMembers) return;
      setRegistryImportBusy(true);
      try {
        const buffer = await file.arrayBuffer();
        const reloadFile = new File([buffer], file.name, { type: file.type });
        const xlsx = await import("xlsx");
        const workbook = xlsx.read(buffer, { type: "array" });
        const parsedResult = await parseRegistrySpreadsheet(reloadFile);
        if (!parsedResult?.rows.length) {
          setRegistryImportPreview([]);
          setRegistryImportColumnMapping([]);
          setRegistryImportSheetName(null);
          toast({
            title: t.membersPage.registryImportFailed,
            description: t.membersPage.registryImportNoEmailColumn,
            variant: "destructive",
          });
          return;
        }

        setRegistryImportColumnMapping(parsedResult.columnMapping);
        setRegistryImportSheetName(parsedResult.sheetName);

        const rows = parsedResult.rows;
        const rowsWithIdentity = rows.filter(
          (row) =>
            normalizeEmail(row.email) ||
            masterFieldsFromRegistryImportRow(row).internal_club_number?.trim(),
        );
        if (rows.length > 0 && rowsWithIdentity.length === 0) {
          setRegistryImportPreview([]);
          toast({
            title: t.membersPage.registryImportFailed,
            description: t.membersPage.registryImportNoEmailColumn,
            variant: "destructive",
          });
          return;
        }

        if (isClubComparisonWorkbook(workbook.SheetNames)) {
          const comparison = await parseClubComparisonWorkbook(reloadFile);
          setComparisonImportSummary(comparison.summary);
          setPendingFieldGapPatches(comparison.fieldGapPatches);
        }

        const membershipByClubNumber = new Map<string, string>();
        for (const [membershipId, master] of Object.entries(masterByMembershipId)) {
          const clubNumber = master?.internal_club_number?.trim();
          if (clubNumber) membershipByClubNumber.set(clubNumber, membershipId);
        }

        const draftByClubNumber = new Map<string, { id: string; name: string | null }>();
        for (const draft of memberDrafts) {
          const master = masterRecordFromDraft(draft.master_data, draft.name || "");
          const clubNumber = master?.internal_club_number?.trim();
          if (!clubNumber) continue;
          if (!draftByClubNumber.has(clubNumber)) {
            draftByClubNumber.set(clubNumber, { id: draft.id, name: draft.name });
          }
        }

        const emails = Array.from(new Set(rows.map((r) => normalizeEmail(r.email)).filter(Boolean)));
        const { data: resolved, error } = await supabase.rpc("resolve_club_member_emails_to_memberships", {
          _club_id: clubId,
          _emails: emails,
        });
        if (error) {
          toast({ title: t.membersPage.registryImportFailed, description: error.message, variant: "destructive" });
          setRegistryImportPreview([]);
          return;
        }
        const emailToMembership = new Map<string, string>();
        for (const entry of (resolved as { email: string; membership_id: string }[] | null) ?? []) {
          emailToMembership.set(normalizeEmail(entry.email), entry.membership_id);
        }

        const emailToDraft = new Map<string, { id: string; name: string | null }>();
        const chunkSize = 100;
        for (let i = 0; i < emails.length; i += chunkSize) {
          const chunk = emails.slice(i, i + chunkSize);
          const { data: draftMatches, error: draftError } = await supabase
            .from("club_member_drafts")
            .select("id, email, name")
            .eq("club_id", clubId)
            .in("email", chunk);
          if (draftError) {
            toast({ title: t.membersPage.registryImportFailed, description: draftError.message, variant: "destructive" });
            setRegistryImportPreview([]);
            return;
          }
          for (const draft of draftMatches ?? []) {
            const key = normalizeEmail(String(draft.email ?? ""));
            if (key && !emailToDraft.has(key)) {
              emailToDraft.set(key, { id: String(draft.id), name: draft.name != null ? String(draft.name) : null });
            }
          }
        }

        const preview: typeof registryImportPreview = [];
        const rosterMasterByMembershipId = new Map<
          string,
          { firstName?: string | null; lastName?: string | null; displayName?: string | null }
        >();
        for (const member of members) {
          const master = masterByMembershipId[member.id];
          rosterMasterByMembershipId.set(member.id, {
            firstName: master?.first_name,
            lastName: master?.last_name,
            displayName: member.profiles?.display_name ?? null,
          });
        }

        for (const r of rows) {
          const payload = masterFieldsFromRegistryImportRow(r);
          const clubNumber = payload.internal_club_number?.trim() || "";
          const email = normalizeEmail(r.email);
          const resolved = resolveRegistryImportMatch({
            clubNumber,
            email,
            importFirstName: payload.first_name,
            importLastName: payload.last_name,
            membershipByClubNumber,
            emailToMembership,
            draftByClubNumber,
            emailToDraft,
            rosterMasterByMembershipId,
          });
          const membershipId = resolved.membershipId;
          const draftId = membershipId ? null : resolved.draftId;
          const draftMatch = draftId ? { id: draftId, name: resolved.draftName } : null;

          const mem = membershipId ? members.find((mm) => mm.id === membershipId) : null;
          const roleParsed = mem?.role || (r.role ? normalizeRole(r.role).role : "member");
          const displayName = registryImportRowDisplayName(payload, r.email);
          const canAddToSavedList =
            !membershipId && !draftId && canAddRegistryRowToSavedList({ membershipId, draftId, email: r.email, payload });
          const missingCodes: string[] = membershipId
            ? getMissingRequiredMasterFields(payload, roleParsed).map(String)
            : draftId
              ? getMissingRequiredMasterFields(payload, r.role ? normalizeRole(r.role).role : "member").map(String)
              : canAddToSavedList
                ? ["not_in_club_add_to_list"]
                : ["email_not_in_club"];
          if (resolved.rejectedNameMismatch) missingCodes.unshift("registry_club_number_name_conflict");
          if (!email && canAddToSavedList) missingCodes.push("missing_email_in_source");
          const missing = missingCodes;
          const extractedSummary = summarizeMasterPayloadForDisplay(payload);
          const matchLabel = membershipId
            ? mem
              ? `${t.membersPage.registryMatchRoster}: ${registryImportRowDisplayName(masterByMembershipId[membershipId] ?? {}, membershipEmails[membershipId] || "")}`
              : t.membersPage.registryMatchRoster
            : draftId
              ? draftMatch?.name?.trim() || t.membersPage.registryMatchDraft
              : null;

          preview.push({
            email: r.email,
            displayName,
            extractedSummary,
            membershipId,
            draftId,
            matchLabel,
            missing,
            payload,
            guardianEmail: r.guardianEmail,
            wardEmail: r.wardEmail,
            role: r.role ? normalizeRole(r.role).role : "member",
            team: r.team || r.raw.team || r.raw.latest_department || "",
            ageGroup: r.ageGroup || r.raw.age_group || "",
            position: r.position || r.raw.position || "",
          });
        }
        const annotated = annotateRowsWithHouseholdDiscount(
          preview.map((row, index) => ({
            id: `registry-preview-${index}`,
            email: row.email,
            masterData: row.payload,
          })),
        );
        setRegistryHouseholdGroups(annotated.groups.filter((group) => group.eligibleForFamilyDiscount));
        setRegistryImportPreview(
          preview.map((row, index) => ({
            ...row,
            payload: annotated.rows[index]?.masterData ?? row.payload,
          })),
        );
        const isGerman = rows.some((r) => r.sourceFormat === "german_mitgliederliste");
        const unmatchedAddable = preview.filter((row) =>
          canAddRegistryRowToSavedList(row),
        ).length;
        const parsedDesc = (isGerman ? t.membersPage.registryImportParsedGermanDesc : t.membersPage.registryImportParsedDesc).replace(
          "{count}",
          String(preview.length),
        );
        toast({
          title: t.membersPage.registryImportParsed,
          description:
            unmatchedAddable > 0
              ? `${parsedDesc} ${t.membersPage.registryImportParsedUnmatchedHint.replace("{count}", String(unmatchedAddable))}`
              : parsedDesc,
        });
      } finally {
        setRegistryImportBusy(false);
      }
    },
    [clubId, canManageMembers, masterByMembershipId, memberDrafts, members, membershipEmails, t, toast],
  );

  const registryUnmatchedAddable = useMemo(
    () => registryImportPreview.filter((row) => canAddRegistryRowToSavedList(row)),
    [registryImportPreview],
  );

  const insertUnmatchedRegistryRows = useCallback(
    async (candidates: typeof registryImportPreview) => {
      if (!clubId) {
        return { savedCount: 0, skippedCount: 0, firstError: null as string | null, linkedByIdentity: new Map<string, string>() };
      }

      const existingDraftKeySet = new Set<string>();
      for (const item of memberDrafts) {
        const master = masterRecordFromDraft(item.master_data, item.name || "");
        const displayName =
          item.name?.trim() || registryImportRowDisplayName(master ?? {}, item.email);
        for (const key of collectDraftIdentityKeys(
          item.email ?? "",
          master?.internal_club_number,
          displayName,
        )) {
          existingDraftKeySet.add(key);
        }
      }

      let savedCount = 0;
      let skippedCount = 0;
      let firstError: string | null = null;
      const linkedByIdentity = new Map<string, string>();

      for (const row of candidates) {
        const email = normalizeEmail(row.email);
        const displayName = registryImportRowDisplayName(row.payload, row.email);
        const clubNumberConflict = row.missing.includes("registry_club_number_name_conflict");
        const identityKey = resolveNewDraftIdentityKey(
          email,
          row.payload.internal_club_number,
          displayName,
          existingDraftKeySet,
          { clubNumberConflict },
        );
        if (!identityKey || !canAddRegistryRowToSavedList(row)) {
          skippedCount += 1;
          continue;
        }

        const { data: insertedDraft, error } = await supabase
          .from("club_member_drafts")
          .insert({
            club_id: clubId,
            name: displayName || null,
            email: email || null,
            role: row.role || "member",
            team: row.team.trim() || null,
            age_group: row.ageGroup.trim() || null,
            position: row.position.trim() || null,
            master_data: row.payload,
          } as Record<string, unknown>)
          .select("id")
          .maybeSingle();

        if (error || !insertedDraft?.id) {
          skippedCount += 1;
          if (!firstError) {
            firstError = isMissingDraftMasterDataColumnError(error)
              ? t.membersPage.masterDataColumnMissingDesc
              : error?.message || t.membersPage.registryAddUnmatchedInsertFailed;
          }
          continue;
        }

        existingDraftKeySet.add(identityKey);
        for (const key of collectDraftIdentityKeys(email, row.payload.internal_club_number, displayName)) {
          existingDraftKeySet.add(key);
        }
        linkedByIdentity.set(identityKey, String(insertedDraft.id));
        linkedByIdentity.set(
          registryImportRowLinkKey(email, displayName, row.payload.internal_club_number),
          String(insertedDraft.id),
        );
        savedCount += 1;
        void appendMemberAuditEvent({
          clubId,
          draftId: String(insertedDraft.id),
          correlationEmail: email,
          eventType: "draft_added_to_list",
          summary: "Added to saved member list from registry import",
          detail: { source: "registry_import_unmatched" },
        });
      }

      return { savedCount, skippedCount, firstError, linkedByIdentity };
    },
    [clubId, memberDrafts, t.membersPage.masterDataColumnMissingDesc, t.membersPage.registryAddUnmatchedInsertFailed],
  );

  const handleApplyRegistryImport = useCallback(async () => {
    if (!clubId || !canManageMembers) return;
    const applicableMembers = registryImportPreview.filter((row) => row.membershipId);
    const applicableDrafts = registryImportPreview.filter((row) => row.draftId && !row.membershipId);
    const unmatchedCandidates = registryImportPreview.filter((row) => canAddRegistryRowToSavedList(row));
    if (!applicableMembers.length && !applicableDrafts.length && !unmatchedCandidates.length) {
      toast({ title: t.membersPage.registryImportNothingToApply, variant: "destructive" });
      return;
    }
    setRegistryImportBusy(true);
    try {
      let added = 0;
      let addSkipped = 0;
      let addError: string | null = null;

      if (unmatchedCandidates.length) {
        const insertResult = await insertUnmatchedRegistryRows(unmatchedCandidates);
        added = insertResult.savedCount;
        addSkipped = insertResult.skippedCount;
        addError = insertResult.firstError;
        if (added > 0) {
          setRegistryImportPreview((previous) =>
            previous.map((row) => {
              if (row.membershipId || row.draftId || !canAddRegistryRowToSavedList(row)) return row;
              const displayName = registryImportRowDisplayName(row.payload, row.email);
              const draftId =
                insertResult.linkedByIdentity.get(
                  registryImportRowLinkKey(normalizeEmail(row.email), displayName, row.payload.internal_club_number),
                ) ?? null;
              if (!draftId) return row;
              return {
                ...row,
                draftId,
                matchLabel: row.displayName || t.membersPage.registryMatchDraft,
                missing: getMissingRequiredMasterFields(row.payload, row.role).map(String),
              };
            }),
          );
        }
      }

      let ok = 0;
      for (const row of applicableMembers) {
        const memberId = row.membershipId as string;
        const rawKind = row.payload.membership_kind;
        const parsedKind = typeof rawKind === "string" ? parseMembershipKind(rawKind) : null;
        const kind: ClubMemberMasterRecord["membership_kind"] =
          parsedKind ??
          (rawKind === "active_participant" || rawKind === "supporting_member" ? rawKind : "active_participant");
        const rowPayload = {
          ...row.payload,
          membership_id: memberId,
          club_id: clubId,
          membership_kind: kind,
        };
        const { error } = await supabase.from("club_member_master_records").upsert(rowPayload, { onConflict: "membership_id" });
        if (!error) {
          ok += 1;
          void appendMemberAuditEvent({
            clubId,
            membershipId: memberId,
            correlationEmail: normalizeEmail(row.email),
            eventType: "registry_import_row",
            summary: "Registry updated from import",
            detail: { source: "spreadsheet" },
          });
        }
      }

      let draftsOk = 0;
      for (const row of applicableDrafts) {
        const draftId = row.draftId as string;
        const existing = memberDrafts.find((d) => d.id === draftId);
        const mergedMaster = {
          ...((existing?.master_data as Record<string, unknown> | null) ?? {}),
          ...row.payload,
        };
        const firstName = row.payload.first_name?.trim();
        const lastName = row.payload.last_name?.trim();
        const combinedName =
          registryImportRowDisplayName(row.payload, row.email) ||
          [firstName, lastName].filter(Boolean).join(" ").trim();
        const { error } = await supabase
          .from("club_member_drafts")
          .update({
            master_data: mergedMaster,
            ...(combinedName ? { name: combinedName } : {}),
            ...(row.payload.membership_kind ? {} : {}),
          } as Record<string, unknown>)
          .eq("club_id", clubId)
          .eq("id", draftId);
        if (!error) {
          draftsOk += 1;
          void appendMemberAuditEvent({
            clubId,
            draftId,
            correlationEmail: normalizeEmail(row.email),
            eventType: "registry_import_draft_row",
            summary: "Draft registry updated from import",
            detail: { source: "spreadsheet" },
          });
        }
      }

      let linksOk = 0;
      for (const r of registryImportPreview) {
        if (!r.membershipId || !normalizeEmail(r.guardianEmail)) continue;
        const wardId = r.membershipId;
        const guardianId = emailToMembershipIdFromEmail(r.guardianEmail);
        if (!guardianId || guardianId === wardId) continue;
        const { error } = await supabase.from("club_member_guardian_links").insert({
          club_id: clubId,
          guardian_membership_id: guardianId,
          ward_membership_id: wardId,
          relationship: "guardian",
        });
        if (!error) linksOk += 1;
      }

      toast({
        title: t.membersPage.registryImportApplied,
        description: t.membersPage.registryImportAppliedDesc
          .replace("{added}", String(added))
          .replace("{rows}", String(ok))
          .replace("{drafts}", String(draftsOk))
          .replace("{skipped}", String(addSkipped))
          .replace("{links}", String(linksOk)),
        variant: added === 0 && ok === 0 && draftsOk === 0 && addError ? "destructive" : "default",
      });
      if (added === 0 && ok === 0 && draftsOk === 0 && addError) {
        toast({
          title: t.common.error,
          description: addError,
          variant: "destructive",
        });
      } else if (added === 0 && addSkipped > 0 && unmatchedCandidates.length > 0) {
        toast({
          title: t.membersPage.registryImportSkippedHintTitle,
          description: t.membersPage.registryImportSkippedHintDesc,
        });
      }
      setShowRegistryImport(false);
      setRegistryImportPreview([]);
      setRegistryHouseholdGroups([]);
      void fetchMembers();
      void fetchMemberDrafts();
    } finally {
      setRegistryImportBusy(false);
    }
  }, [clubId, canManageMembers, registryImportPreview, memberDrafts, emailToMembershipIdFromEmail, insertUnmatchedRegistryRows, t, toast, fetchMembers, fetchMemberDrafts]);

  const handleAddUnmatchedRegistryToSavedList = useCallback(async () => {
    if (!clubId || !canManageMembers || registryImportBusy) return;
    const candidates = registryUnmatchedAddable;
    if (!candidates.length) {
      toast({ title: t.membersPage.registryAddUnmatchedNone, variant: "destructive" });
      return;
    }

    setRegistryImportBusy(true);
    try {
      const { savedCount, skippedCount, firstError, linkedByIdentity } = await insertUnmatchedRegistryRows(candidates);

      if (savedCount > 0) {
        setRegistryImportPreview((previous) =>
          previous.map((row) => {
            if (row.membershipId || row.draftId || !canAddRegistryRowToSavedList(row)) return row;
            const displayName = registryImportRowDisplayName(row.payload, row.email);
            const draftId =
              linkedByIdentity.get(
                registryImportRowLinkKey(normalizeEmail(row.email), displayName, row.payload.internal_club_number),
              ) ?? null;
            if (!draftId) return row;
            return {
              ...row,
              draftId,
              matchLabel: row.displayName || t.membersPage.registryMatchDraft,
              missing: getMissingRequiredMasterFields(row.payload, row.role).map(String),
            };
          }),
        );
        await fetchMemberDrafts();
      }

      toast({
        title: savedCount > 0 ? t.membersPage.registryAddUnmatchedComplete : t.common.error,
        description:
          savedCount > 0
            ? t.membersPage.registryAddUnmatchedCompleteDesc
                .replace("{saved}", String(savedCount))
                .replace("{skipped}", String(skippedCount))
            : firstError || t.membersPage.registryAddUnmatchedNone,
        variant: savedCount > 0 ? "default" : "destructive",
      });
    } finally {
      setRegistryImportBusy(false);
    }
  }, [
    clubId,
    canManageMembers,
    fetchMemberDrafts,
    insertUnmatchedRegistryRows,
    registryImportBusy,
    registryUnmatchedAddable,
    t,
    toast,
  ]);

  const allRoles = ["all", "admin", "trainer", "player", "staff", "member", "parent", "sponsor"];
  const existingInviteEmails = useMemo(
    () =>
      new Set(
        invites
          .map((invite) => normalizeEmail(invite.email || ""))
          .filter(Boolean)
      ),
    [invites]
  );

  const existingDraftIdentityKeys = useMemo(
    () =>
      new Set(
        memberDrafts
          .map((draft) => {
            const master = masterRecordFromDraft(draft.master_data, draft.name || "");
            return memberRegistryIdentityKey(
              draft.email ?? "",
              master?.internal_club_number,
              draft.name?.trim() || registryImportRowDisplayName(master ?? {}, draft.email ?? ""),
            );
          })
          .filter(Boolean),
      ),
    [memberDrafts],
  );

  const rosterClubNumbers = useMemo(() => {
    const map = new Map<string, string>();
    for (const [membershipId, master] of Object.entries(masterByMembershipId)) {
      const num = master?.internal_club_number?.trim();
      if (num) map.set(num, membershipId);
    }
    return map;
  }, [masterByMembershipId]);

  const getRegistryMissingLabel = useCallback(
    (code: string) => {
      switch (code) {
        case "email_not_in_club":
          return t.membersPage.registryMissingNotInClub;
        case "not_in_club_add_to_list":
          return t.membersPage.registryMissingAddToSavedList;
        case "registry_club_number_name_conflict":
          return t.membersPage.registryClubNumberNameConflict;
        case "email_matched_draft":
          return t.membersPage.registryMissingMatchedDraft;
        case "missing_email_in_source":
          return t.membersPage.registryMissingEmailInSource;
        default:
          return code.replace(/_/g, " ");
      }
    },
    [t],
  );

  const bulkRowIssues = useMemo(() => {
    const counts = new Map<string, number>();
    for (const row of bulkRows) {
      const email = normalizeEmail(row.email);
      if (!email) continue;
      counts.set(email, (counts.get(email) ?? 0) + 1);
    }

    const byRowId = new Map<string, BulkRowIssue[]>();
    for (const row of bulkRows) {
      const issues: BulkRowIssue[] = [];
      const email = normalizeEmail(row.email);
      const clubNumber = row.masterData.internal_club_number?.trim() || "";
      if (!email) {
        if (!clubNumber) issues.push("missing_email");
        byRowId.set(row.id, issues);
        continue;
      }
      if (!EMAIL_PATTERN.test(email)) issues.push("invalid_email");
      if ((counts.get(email) ?? 0) > 1) issues.push("shared_contact_email");
      const identityKey = memberRegistryIdentityKey(email, clubNumber);
      if (identityKey && existingDraftIdentityKeys.has(identityKey)) issues.push("already_in_saved_list");
      if (existingMemberEmails.has(email)) {
        if (clubNumber && rosterClubNumbers.has(clubNumber)) {
          issues.push("already_in_club");
        } else if (clubNumber) {
          issues.push("shared_login_email");
        } else {
          issues.push("already_in_club");
        }
      }
      if (existingInviteEmails.has(email)) issues.push("invite_exists");
      if (row.unknownRole) issues.push("unknown_role");
      if (row.masterData.household_discount_status === "pending_verification") {
        issues.push("household_discount_candidate");
      }
      byRowId.set(row.id, issues);
    }
    return byRowId;
  }, [bulkRows, existingDraftIdentityKeys, existingInviteEmails, existingMemberEmails, rosterClubNumbers]);

  const handleApplyFieldGapPatches = useCallback(async () => {
    if (!clubId || !canManageMembers || fieldGapApplyBusy || pendingFieldGapPatches.length === 0) return;

    setFieldGapApplyBusy(true);
    const merged = mergeFieldGapPatches(pendingFieldGapPatches);
    let applied = 0;
    let skipped = 0;

    try {
      for (const [memberNumber, patch] of merged.entries()) {
        const membershipId = rosterClubNumbers.get(memberNumber);
        if (!membershipId) {
          skipped += 1;
          continue;
        }
        const member = members.find((item) => item.id === membershipId);
        if (!member) {
          skipped += 1;
          continue;
        }
        const existing = masterByMembershipId[membershipId] ?? {};
        await handleSaveMasterRecord(member, { ...existing, ...patch }, { suppressToast: true });
        applied += 1;
      }

      toast({
        title: t.membersPage.fieldGapApplyComplete,
        description: t.membersPage.fieldGapApplyCompleteDesc
          .replace("{applied}", String(applied))
          .replace("{skipped}", String(skipped)),
      });
      if (applied > 0) setPendingFieldGapPatches([]);
    } finally {
      setFieldGapApplyBusy(false);
    }
  }, [
    canManageMembers,
    clubId,
    fieldGapApplyBusy,
    handleSaveMasterRecord,
    masterByMembershipId,
    members,
    pendingFieldGapPatches,
    rosterClubNumbers,
    t.membersPage.fieldGapApplyComplete,
    t.membersPage.fieldGapApplyCompleteDesc,
    toast,
  ]);

  const handleDeleteMember = async (membershipId: string) => {
    if (!canManageMembers || !clubId) {
      toast({ title: t.common.notAuthorized, description: t.membersPage.onlyAdminsMembers, variant: "destructive" });
      return;
    }
    const { error } = await supabase
      .from("club_memberships")
      .delete()
      .eq("club_id", clubId)
      .eq("id", membershipId);
    if (error) {
      toast({ title: t.membersPage.errorRemovingMember, description: error.message, variant: "destructive" });
    } else {
      setMembers((prev) => prev.filter((m) => m.id !== membershipId));
      setSelectedMember(null);
      setMemberPanelEditModeId(null);
      setMemberMasterEditDraft({});
      toast({ title: t.membersPage.memberRemoved });
      void fetchMembers();
    }
  };

  const handleAddGuardianLink = async (wardMembershipId: string) => {
    if (!clubId || !wardMembershipId || !guardianPickId) return;
    if (guardianPickId === wardMembershipId) return;
    const { data, error } = await supabase
      .from("club_member_guardian_links")
      .insert({
        club_id: clubId,
        guardian_membership_id: guardianPickId,
        ward_membership_id: wardMembershipId,
        relationship: "guardian",
      })
      .select("*")
      .maybeSingle();
    if (error) {
      toast({ title: t.common.error, description: error.message, variant: "destructive" });
      return;
    }
    if (data) setGuardianLinks((previous) => [...previous, data as unknown as GuardianLinkRow]);
    setGuardianPickId("");
    toast({ title: t.common.updated });
  };

  const renderGuardiansSafetyTabExtra = (ward: MemberRow, effectiveRole: string) => {
    if (!isPlayerRole(effectiveRole)) return null;
    const wardLinks = guardianLinks.filter((g) => g.ward_membership_id === ward.id);
    const birthDate = masterByMembershipId[ward.id]?.birth_date ?? null;
    const needsUnder18Guardian = isUnder18(birthDate) && wardLinks.length === 0;
    if (wardLinks.length === 0 && !canManageMembers && !needsUnder18Guardian) return null;
    return (
      <>
        <div className="text-sm font-semibold text-foreground">{t.membersPage.guardians}</div>
        {needsUnder18Guardian ? (
          <div className="text-sm rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-amber-200">
            {t.membersPage.under18GuardianHint}
          </div>
        ) : null}
        {wardLinks.length > 0 ? (
          <div className="space-y-1.5">
            {wardLinks.map((link) => {
              const gMem = members.find((m) => m.id === link.guardian_membership_id);
              return (
                <div
                  key={link.id}
                  className="text-sm rounded-lg border border-border/60 bg-background/40 px-3 py-2 flex justify-between gap-2"
                >
                  <span className="truncate">{gMem ? getMemberRosterName(gMem) : link.guardian_membership_id}</span>
                  {gMem ? (
                    <span className="text-xs text-muted-foreground shrink-0">{getRoleLabel(gMem.role)}</span>
                  ) : null}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">{t.membersPage.guardiansEmpty}</div>
        )}
        {canManageMembers ? (
          <div className="mt-1 space-y-2">
            <div className="text-sm text-muted-foreground">
              {needsUnder18Guardian ? t.membersPage.linkGuardianUnder18 : t.membersPage.linkGuardian}
            </div>
            <div className="flex flex-col sm:flex-row gap-2 sm:items-end">
              <Select value={guardianPickId || undefined} onValueChange={setGuardianPickId}>
                <SelectTrigger className="h-10 text-sm flex-1">
                  <SelectValue placeholder={t.membersPage.pickGuardian} />
                </SelectTrigger>
                <SelectContent>
                  {members
                    .filter((m) => m.id !== ward.id)
                    .map((m) => (
                      <SelectItem key={m.id} value={m.id} className="text-sm">
                        {getMemberRosterName(m)} · {getRoleLabel(m.role)}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <Button
                size="sm"
                variant="secondary"
                className="h-10 shrink-0"
                onClick={() => void handleAddGuardianLink(ward.id)}
                disabled={!guardianPickId}
              >
                {t.membersPage.linkGuardianAction}
              </Button>
            </div>
          </div>
        ) : null}
      </>
    );
  };

  const addDraftGuardian = useCallback(() => {
    if (!draftGuardianPickId) return;
    setEditingDraftForm((f) => {
      const cur = readDraftGuardianMembershipIds(f.masterData as Record<string, unknown>);
      if (cur.includes(draftGuardianPickId)) return f;
      const next = [...cur, draftGuardianPickId];
      return {
        ...f,
        masterData: { ...f.masterData, [DRAFT_GUARDIAN_MEMBERSHIP_IDS_KEY]: next } as typeof f.masterData,
      };
    });
    setDraftGuardianPickId("");
  }, [draftGuardianPickId]);

  const removeDraftGuardian = useCallback((gid: string) => {
    setEditingDraftForm((f) => {
      const cur = readDraftGuardianMembershipIds(f.masterData as Record<string, unknown>);
      const next = cur.filter((id) => id !== gid);
      const md = { ...(f.masterData as Record<string, unknown>) };
      if (next.length === 0) delete md[DRAFT_GUARDIAN_MEMBERSHIP_IDS_KEY];
      else md[DRAFT_GUARDIAN_MEMBERSHIP_IDS_KEY] = next;
      return { ...f, masterData: md as typeof f.masterData };
    });
  }, []);

  const renderDraftGuardiansSafetyTabExtra = () => {
    if (!isPlayerRole(editingDraftForm.role)) return null;
    const md = editingDraftForm.masterData as Record<string, unknown>;
    const ids = readDraftGuardianMembershipIds(md);
    if (ids.length === 0 && !canManageMembers) return null;
    return (
      <>
        <div className="text-sm font-semibold text-foreground">{t.membersPage.guardians}</div>
        {ids.length > 0 ? (
          <div className="space-y-1.5">
            {ids.map((gid) => {
              const gMem = members.find((m) => m.id === gid);
              return (
                <div
                  key={gid}
                  className="text-sm rounded-lg border border-border/60 bg-background/40 px-3 py-2 flex justify-between gap-2 items-center"
                >
                  <div className="min-w-0 flex-1 flex items-center gap-2">
                    <span className="truncate">{gMem ? getMemberRosterName(gMem) : gid}</span>
                    {gMem ? (
                      <span className="text-xs text-muted-foreground shrink-0">{getRoleLabel(gMem.role)}</span>
                    ) : null}
                  </div>
                  {canManageMembers ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 shrink-0 p-0 text-muted-foreground"
                      onClick={() => removeDraftGuardian(gid)}
                      aria-label={t.common.remove}
                    >
                      <X className="w-3.5 h-3.5" />
                    </Button>
                  ) : null}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">{t.membersPage.guardiansEmpty}</div>
        )}
        {canManageMembers ? (
          <div className="mt-1 space-y-2">
            <div className="text-sm text-muted-foreground">{t.membersPage.linkGuardian}</div>
            <div className="flex flex-col sm:flex-row gap-2 sm:items-end">
              <Select value={draftGuardianPickId || undefined} onValueChange={setDraftGuardianPickId}>
                <SelectTrigger className="h-10 text-sm flex-1">
                  <SelectValue placeholder={t.membersPage.pickGuardian} />
                </SelectTrigger>
                <SelectContent>
                  {members.map((m) => (
                    <SelectItem key={m.id} value={m.id} className="text-sm">
                      {getMemberRosterName(m)} · {getRoleLabel(m.role)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                size="sm"
                variant="secondary"
                className="h-10 shrink-0"
                onClick={addDraftGuardian}
                disabled={!draftGuardianPickId}
              >
                {t.membersPage.linkGuardianAction}
              </Button>
            </div>
          </div>
        ) : null}
      </>
    );
  };

  const startMemberPanelEdit = (member: MemberRow) => {
    setSelectedMember(member);
    setMemberPanelEditModeId(member.id);
    setMemberMasterEditDraft({ ...(masterByMembershipId[member.id] ?? {}) });
    const reconciled = reconcileMemberTeamEditState({
      clubTeams,
      playerTeamIds: memberPlayerTeamIdsById[member.id] || [],
      coachTeamIds: memberCoachTeamIdsById[member.id] || [],
      membershipTeam: member.team,
      ageGroup: member.age_group,
    });
    setEditMemberTeamIds(reconciled.teamIds);
    setEditMemberForm({
      role: member.role || "member",
      team: reconciled.team,
      ageGroup: reconciled.ageGroup,
      position: member.position || "",
      status: member.status || "active",
    });
  };

  const cancelMemberPanelEdit = () => {
    setMemberPanelEditModeId(null);
    setMemberMasterEditDraft({});
    setEditMemberTeamIds([]);
    setSharedContactFilterEmail(null);
  };

  const uploadMemberPanelAvatar = async (membershipId: string, file: File) => {
    if (!user || memberPanelAvatarUploading) return;
    setMemberPanelAvatarUploading(true);
    try {
      const cleanName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, "-");
      const filePath = `${user.id}/club-member-panel-${membershipId}-${Date.now()}-${cleanName}`;
      const { error } = await supabase.storage
        .from(PROFILE_AVATAR_BUCKET)
        .upload(filePath, file, { upsert: true, contentType: file.type || undefined });
      if (error) throw error;
      const { data } = supabase.storage.from(PROFILE_AVATAR_BUCKET).getPublicUrl(filePath);
      setMemberMasterEditDraft((d) => ({
        ...d,
        photo_url: data.publicUrl,
        photo_uploaded_at: new Date().toISOString(),
      }));
      toast({ title: t.settingsPage.avatarUploadSuccess });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t.settingsPage.uploadFailed;
      toast({
        title: t.settingsPage.avatarUploadFailed,
        description: message.includes("Bucket not found") ? t.settingsPage.avatarUploadBucketHint : message,
        variant: "destructive",
      });
    } finally {
      setMemberPanelAvatarUploading(false);
    }
  };

  const saveMemberPanelInline = async (member: MemberRow) => {
    if (!clubId) return;
    if (!canEditMemberMaster(member.id)) {
      toast({ title: t.common.notAuthorized, description: t.membersPage.onlyAdminsMembers, variant: "destructive" });
      return;
    }
    if (!canManageMembers) {
      setMemberPanelSaving(true);
      try {
        const mergedMaster = { ...(masterByMembershipId[member.id] ?? {}), ...memberMasterEditDraft };
        await handleSaveMasterRecord(member, mergedMaster, { suppressToast: true });
        const savedName = getMemberRosterName(member);
        toast({
          title: t.membersPage.masterDataSavedTitle,
          description: t.membersPage.masterDataSavedDescRoster.replace("{name}", savedName),
        });
        setMemberPanelSaveConfirmedId(member.id);
        window.setTimeout(() => {
          setMemberPanelSaveConfirmedId((current) => (current === member.id ? null : current));
        }, 4000);
        setMemberPanelEditModeId(null);
        setMemberMasterEditDraft({});
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : t.common.error;
        toast({ title: t.common.error, description: message, variant: "destructive" });
      } finally {
        setMemberPanelSaving(false);
      }
      return;
    }
    setMemberPanelSaving(true);
    try {
      const reconciled = reconcileMemberTeamEditState({
        clubTeams,
        playerTeamIds: editMemberTeamIds,
        coachTeamIds: [],
        membershipTeam: editMemberForm.team,
        ageGroup: editMemberForm.ageGroup,
      });
      const nextTeamIds =
        editMemberTeamIds.length > 0
          ? Array.from(new Set(editMemberTeamIds.filter(Boolean)))
          : reconciled.teamIds;
      const assignedTeamNames = clubTeamNamesFromIds(clubTeams, nextTeamIds);
      const primaryTeamName =
        assignedTeamNames[0] || reconciled.team.trim() || editMemberForm.team.trim() || null;
      const nextAgeGroup =
        editMemberTeamIds.length > 0
          ? editMemberForm.ageGroup.trim() || null
          : reconciled.ageGroup.trim() || null;
      const { data, error } = await supabase
        .from("club_memberships")
        .update({
          role: editMemberForm.role,
          team: primaryTeamName,
          age_group: nextAgeGroup,
          position: editMemberForm.position.trim() || null,
          status: editMemberForm.status || "active",
        })
        .eq("club_id", clubId)
        .eq("id", member.id)
        .select("*")
        .single();

      if (error) {
        toast({ title: t.common.error, description: error.message, variant: "destructive" });
        return;
      }

      const updatedMembership = data as unknown as MemberRow;
      const mergedMember = { ...member, ...updatedMembership, profiles: member.profiles };
      setMembers((previous) =>
        previous.map((m) => (m.id === member.id ? mergedMember : m)),
      );
      setSelectedMember((previous) =>
        previous && previous.id === member.id ? mergedMember : previous,
      );

      if (!isPlayerRole(editMemberForm.role)) {
        const { error: guardianDelErr } = await supabase
          .from("club_member_guardian_links")
          .delete()
          .eq("club_id", clubId)
          .eq("ward_membership_id", member.id);
        if (!guardianDelErr) {
          setGuardianLinks((previous) => previous.filter((g) => g.ward_membership_id !== member.id));
        }
      }

      const mergedMaster = { ...(masterByMembershipId[member.id] ?? {}), ...memberMasterEditDraft };
      await handleSaveMasterRecord(mergedMember, mergedMaster, { suppressToast: true });

      const assignment = await syncMembershipTeamAssignments({
        membershipId: member.id,
        membershipRole: editMemberForm.role,
        nextTeamIds,
        existingPlayerTeamIds: memberPlayerTeamIdsById[member.id] || [],
        existingCoachTeamIds: memberCoachTeamIdsById[member.id] || [],
        supportsTeamCoachesTable,
      });
      setMemberPlayerTeamIdsById((previous) => ({ ...previous, [member.id]: assignment.playerTeamIds }));
      setMemberCoachTeamIdsById((previous) => ({ ...previous, [member.id]: assignment.coachTeamIds }));
      setMemberTeamNamesById((previous) => ({
        ...previous,
        [member.id]: clubTeamNamesFromIds(clubTeams, nextTeamIds),
      }));

      const savedName = getMemberRosterName(mergedMember);
      toast({
        title: t.membersPage.masterDataSavedTitle,
        description: t.membersPage.masterDataSavedDescRoster.replace("{name}", savedName),
      });
      setMemberPanelSaveConfirmedId(member.id);
      window.setTimeout(() => {
        setMemberPanelSaveConfirmedId((current) => (current === member.id ? null : current));
      }, 4000);
      setMemberPanelEditModeId(null);
      setMemberMasterEditDraft({});
      setEditMemberTeamIds([]);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t.common.error;
      toast({ title: t.common.error, description: message, variant: "destructive" });
    } finally {
      setMemberPanelSaving(false);
    }
  };

  const handleUpdateInviteRequestStatus = async (requestId: string, status: InviteRequestRow["status"]) => {
    if (!clubId) return;
    if (!canReviewJoinRequests) {
      toast({ title: t.common.notAuthorized, description: t.membersPage.invitesTabRestrictedDesc, variant: "destructive" });
      return;
    }
    const { error } = await supabase
      .from("club_invite_requests")
      .update({ status })
      .eq("club_id", clubId)
      .eq("id", requestId);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }

    setInviteRequests((prev) => prev.map((r) => (r.id === requestId ? { ...r, status } : r)));
    toast({ title: status === "approved" ? t.common.approved : t.common.updated });
  };

  const handleSaveJoinRequestNote = async (requestId: string) => {
    if (!clubId) return;
    if (!canReviewJoinRequests) {
      toast({ title: t.common.notAuthorized, description: t.membersPage.invitesTabRestrictedDesc, variant: "destructive" });
      return;
    }
    const note = joinRequestReviewById[requestId]?.note ?? "";
    setSavingJoinNoteId(requestId);
    const { error } = await supabase
      .from("club_invite_requests")
      .update({ internal_note: note.trim() || null })
      .eq("club_id", clubId)
      .eq("id", requestId);
    setSavingJoinNoteId(null);
    if (error) {
      toast({ title: t.common.error, description: error.message, variant: "destructive" });
      return;
    }
    setInviteRequests((prev) =>
      prev.map((r) => (r.id === requestId ? { ...r, internal_note: note.trim() || null } : r)),
    );
    toast({ title: t.membersPage.joinRequestNoteSaved });
  };

  const handleCreateInvite = async (prefillEmail?: string) => {
    if (!clubId) return;
    if (!canReviewJoinRequests) {
      toast({ title: t.common.notAuthorized, description: t.membersPage.invitesTabRestrictedDesc, variant: "destructive" });
      return;
    }

    const response = await createInviteRecord(prefillEmail ?? inviteEmail, inviteRole, inviteDays);
    if (!response.ok) {
      toast({ title: "Error", description: response.error, variant: "destructive" });
      return;
    }

    setCreatedInviteToken(response.token);
    trackEvent("invite_created", {
      role: inviteRole,
      hasPrefillEmail: Boolean((prefillEmail ?? inviteEmail).trim()),
      inviteDays: Number(inviteDays),
    });
    trackUsageEvent({
      eventName: "invitation_sent",
      clubId,
      moduleKey: "invites",
      metadata: {
        role: inviteRole,
        has_prefill_email: Boolean((prefillEmail ?? inviteEmail).trim()),
      },
    });
    const emailValue = (prefillEmail ?? inviteEmail).trim();
    const normalizedInviteEmail = normalizeEmail(emailValue);
    if (normalizedInviteEmail) {
      const emailResult = await deliverClubInviteEmail({
        inviteId: response.inviteId,
        toEmail: normalizedInviteEmail,
        inviteToken: response.token,
      });
      notifyInviteEmailDelivery(normalizedInviteEmail, emailResult);
    } else {
      toast({ title: t.membersPage.inviteCreated, description: t.membersPage.inviteCreatedDesc });
    }
    await fetchInvitesData();
  };

  const handleApproveInviteRequest = async (request: InviteRequestRow) => {
    if (!clubId) return;
    if (!canReviewJoinRequests) {
      toast({ title: t.common.notAuthorized, description: t.membersPage.invitesTabRestrictedDesc, variant: "destructive" });
      return;
    }
    const draft = joinRequestReviewById[request.id];
    const roleToUse = draft?.role || clubJoinDefaults.role;
    const teamTrim = draft?.team?.trim() || "";
    const { data, error } = await supabase.rpc("approve_club_join_request", {
      _request_id: request.id,
      _membership_role: roleToUse,
      _membership_team: teamTrim.length ? teamTrim : null,
    });
    if (error) {
      toast({ title: t.common.error, description: error.message, variant: "destructive" });
      return;
    }
    const row = Array.isArray(data) ? data[0] : null;
    const outcome = (row?.outcome as string | undefined) || "requires_invite";
    const resolvedRole = (row?.role as string | undefined) || roleToUse || "member";

    if (outcome === "joined") {
      trackEvent("join_request_approved", { outcome: "joined_directly" });
      if (clubId) void trackJoinFunnelEvent({ clubId, eventName: "request_approved" });
      setInviteRequests((prev) => prev.map((r) => (r.id === request.id ? { ...r, status: "approved" } : r)));
      toast({ title: t.common.approved, description: t.membersPage.requestApprovedAndJoined });
      return;
    }

    trackEvent("join_request_approved", { outcome: "requires_invite" });
    await handleUpdateInviteRequestStatus(request.id, "approved");
    setInviteEmail(request.email);
    setInviteRole(resolvedRole);
    setInviteDays("7");
    setCreatedInviteToken(null);
    setShowCreateInvite(true);
  };

  const handleSaveBulkDrafts = async () => {
    if (!clubId || bulkSubmitting) return;
    const selected = bulkRows.filter((row) => {
      if (!row.include || !normalizeEmail(row.email)) return false;
      const issues = bulkRowIssues.get(row.id) ?? [];
      const hasBlockingIssue = issues.some((issue) =>
        ["invalid_email", "missing_email", "already_in_club", "already_in_saved_list"].includes(issue)
      );
      return !hasBlockingIssue;
    });
    if (!selected.length) {
      toast({
        title: t.membersPage.noMembersSelected,
        description: t.membersPage.selectRowsWithoutBlockingIssuesToSave,
        variant: "destructive",
      });
      return;
    }

    setBulkSubmitting(true);
    let savedCount = 0;
    let skippedCount = 0;

    const existingDraftKeySet = new Set(
      memberDrafts
        .map((item) => {
          const master = masterRecordFromDraft(item.master_data, item.name || "");
          return memberRegistryIdentityKey(item.email ?? "", master?.internal_club_number);
        })
        .filter(Boolean),
    );

    for (const row of selected) {
      const email = normalizeEmail(row.email);
      const identityKey = memberRegistryIdentityKey(
        email,
        row.masterData.internal_club_number,
        row.name.trim() || registryImportRowDisplayName(row.masterData, email),
      );
      if (!email || !identityKey || existingDraftKeySet.has(identityKey)) {
        skippedCount += 1;
        continue;
      }

      const { data: insertedDraft, error } = await supabase
        .from("club_member_drafts")
        .insert({
          club_id: clubId,
          name: row.name.trim() || null,
          email,
          role: row.role,
          team: row.team.trim() || null,
          age_group: row.ageGroup.trim() || null,
          position: row.position.trim() || null,
          master_data: Object.keys(row.masterData).length > 0 ? row.masterData : {},
        } as Record<string, unknown>)
        .select("id")
        .maybeSingle();
      if (error) {
        if (isMissingDraftMasterDataColumnError(error)) {
          setBulkSubmitting(false);
          toast({
            title: t.membersPage.masterDataColumnMissingTitle,
            description: t.membersPage.masterDataColumnMissingDesc,
            variant: "destructive",
          });
          return;
        }
        skippedCount += 1;
        continue;
      }
      if (insertedDraft?.id) {
        void appendMemberAuditEvent({
          clubId,
          draftId: insertedDraft.id,
          correlationEmail: email,
          eventType: "draft_added_to_list",
          summary: "Added to saved member list",
          detail: {
            name: row.name.trim() || null,
            role: row.role,
            team: row.team.trim() || null,
            age_group: row.ageGroup.trim() || null,
            position: row.position.trim() || null,
          },
        });
      }
      existingDraftKeySet.add(identityKey);
      savedCount += 1;
    }

    setBulkSubmitting(false);
    toast({
      title: t.membersPage.memberDraftsSaved,
      description: t.membersPage.memberDraftsSavedDesc
        .replace("{savedCount}", String(savedCount))
        .replace("{skippedPart}", skippedCount ? t.membersPage.memberDraftsSkippedPart.replace("{skippedCount}", String(skippedCount)) : ""),
      variant: skippedCount ? "destructive" : "default",
    });

    if (savedCount > 0) {
      setShowAddMembers(false);
      await fetchMemberDrafts();
    }
  };

  const handleSendInviteForDraft = async (draft: MemberDraftRow) => {
    if (!clubId || draftActionId) return;
    setDraftActionId(draft.id);
    const inviteMasterSource =
      editingDraftId === draft.id
        ? (editingDraftForm.masterData as Record<string, unknown>)
        : ((draft.master_data as Record<string, unknown> | null) ?? {});
    const draftRole =
      editingDraftId === draft.id ? editingDraftForm.role : draft.role;
    const displayNameForInvite =
      editingDraftId === draft.id
        ? buildDisplayNameFromParts(editingDraftForm.firstName, editingDraftForm.lastName)
        : (draft.name || "");
    const teamForInvite = editingDraftId === draft.id ? editingDraftForm.team : draft.team || "";
    const ageForInvite = editingDraftId === draft.id ? editingDraftForm.age_group : draft.age_group || "";
    const posForInvite = editingDraftId === draft.id ? editingDraftForm.position : draft.position || "";
    const invitePayload = buildInvitePayloadFromDraftFields(
      displayNameForInvite || null,
      draftRole,
      inviteMasterSource,
      teamForInvite,
      ageForInvite,
      posForInvite,
    );
    const emailForInvite = editingDraftId === draft.id ? editingDraftForm.email.trim() : draft.email;
    if (!normalizeEmail(emailForInvite)) {
      toast({
        title: t.common.error,
        description: t.membersPage.resendInviteInvalidEmail,
        variant: "destructive",
      });
      setDraftActionId(null);
      return;
    }
    const result = await createInviteRecord(emailForInvite, draftRole, inviteDays, invitePayload);
    if (!result.ok) {
      toast({ title: t.common.error, description: result.error, variant: "destructive" });
      setDraftActionId(null);
      return;
    }

    const { error } = await supabase
      .from("club_member_drafts")
      .update({
        status: "invited",
        invited_at: new Date().toISOString(),
        invite_id: result.inviteId,
      })
      .eq("id", draft.id)
      .eq("club_id", clubId);
    if (error) {
      toast({ title: t.common.error, description: error.message, variant: "destructive" });
      setDraftActionId(null);
      return;
    }

    const normalizedInviteEmail = normalizeEmail(emailForInvite);
    const emailResult = await deliverClubInviteEmail({
      inviteId: result.inviteId,
      toEmail: normalizedInviteEmail,
      inviteToken: result.token,
      recipientName: displayNameForInvite || null,
    });

    void appendMemberAuditEvent({
      clubId,
      draftId: draft.id,
      correlationEmail: normalizedInviteEmail,
      eventType: "invite_sent",
      summary: "Invite sent",
      detail: { invite_id: result.inviteId, email_sent: emailResult.ok },
    });

    await fetchMemberDrafts();
    const slugRes = await supabase.from("clubs").select("slug").eq("id", clubId).maybeSingle();
    if (!slugRes.error && slugRes.data?.slug) setClubSlug(slugRes.data.slug);
    void fetchInvitesData();
    setDraftInviteLinkModalVariant("send");
    setDraftResendInviteToken(result.token);
    setDraftResendTokenModalOpen(true);
    notifyInviteEmailDelivery(normalizedInviteEmail, emailResult);
    setDraftActionId(null);
  };

  const handleOpenRosterFromDraft = async (draft: MemberDraftRow) => {
    if (!clubId || draftActionId) return;
    const membershipId =
      draftInviteMetaById[draft.id]?.rosterMembershipId ||
      emailToMembershipIdFromEmail(draft.email);
    if (!membershipId) {
      toast({
        title: t.common.error,
        description: t.membersPage.resendInviteBlockedUsed,
        variant: "destructive",
      });
      return;
    }

    setDraftActionId(draft.id);
    const { error } = await supabase
      .from("club_member_drafts")
      .update({ status: "joined" })
      .eq("id", draft.id)
      .eq("club_id", clubId);
    if (error) {
      toast({ title: t.common.error, description: error.message, variant: "destructive" });
      setDraftActionId(null);
      return;
    }

    void appendMemberAuditEvent({
      clubId,
      draftId: draft.id,
      correlationEmail: normalizeEmail(draft.email),
      eventType: "draft_joined_via_roster_open",
      summary: "Opened used invite in active roster",
      detail: { membership_id: membershipId, invite_id: draft.invite_id ?? null },
    });

    setMemberDrafts((previous) => previous.filter((row) => row.id !== draft.id));
    setSearchMatchedDrafts((previous) => previous.filter((row) => row.id !== draft.id));
    setDraftInviteMetaById((previous) => {
      const next = { ...previous };
      delete next[draft.id];
      return next;
    });
    if (editingDraftId === draft.id) {
      setEditingDraftId(null);
    }

    pendingFocusMembershipIdRef.current = membershipId;
    const searchHint = normalizeEmail(draft.email) || draft.name?.trim() || "";
    setTab("members");
    setSearch(searchHint);
    setDebouncedSearch(searchHint);
    toast({
      title: t.membersPage.openInRoster,
      description: t.membersPage.openInRosterDone,
    });
    setDraftActionId(null);
  };

  const handleResendInviteForDraft = async (draft: MemberDraftRow) => {
    if (!clubId || draftActionId) return;
    if (draft.status !== "invited") return;

    setDraftActionId(draft.id);

    if (draft.invite_id) {
      const { data: priorInv, error: priorErr } = await supabase
        .from("club_invites")
        .select("used_at")
        .eq("id", draft.invite_id)
        .eq("club_id", clubId)
        .maybeSingle();
      if (priorErr) {
        toast({ title: t.common.error, description: priorErr.message, variant: "destructive" });
        setDraftActionId(null);
        return;
      }
      if (priorInv?.used_at) {
        const emailForLookup =
          editingDraftId === draft.id
            ? normalizeEmail(editingDraftForm.email)
            : normalizeEmail(draft.email);
        let rosterMembershipId = draftInviteMetaById[draft.id]?.rosterMembershipId ?? null;
        if (!rosterMembershipId && emailForLookup) {
          const { data: resolved } = await supabase.rpc("resolve_club_member_emails_to_memberships", {
            _club_id: clubId,
            _emails: [emailForLookup],
          });
          const hit = ((resolved as Array<{ email: string; membership_id: string }> | null) ?? []).find(
            (row) => normalizeEmail(row.email) === emailForLookup,
          );
          rosterMembershipId = hit?.membership_id ? String(hit.membership_id) : null;
        }
        if (rosterMembershipId) {
          setDraftInviteMetaById((previous) => ({
            ...previous,
            [draft.id]: { inviteUsed: true, rosterMembershipId },
          }));
          setDraftActionId(null);
          await handleOpenRosterFromDraft({ ...draft, invite_id: draft.invite_id });
          return;
        }
        // Invite was used but person is not on the roster — allow a fresh invite below.
      }
    }

    const inviteMasterSource =
      editingDraftId === draft.id
        ? (editingDraftForm.masterData as Record<string, unknown>)
        : ((draft.master_data as Record<string, unknown> | null) ?? {});
    const draftRole = editingDraftId === draft.id ? editingDraftForm.role : draft.role;
    const displayNameForInvite =
      editingDraftId === draft.id
        ? buildDisplayNameFromParts(editingDraftForm.firstName, editingDraftForm.lastName)
        : (draft.name || "");
    const teamForInvite = editingDraftId === draft.id ? editingDraftForm.team : draft.team || "";
    const ageForInvite = editingDraftId === draft.id ? editingDraftForm.age_group : draft.age_group || "";
    const posForInvite = editingDraftId === draft.id ? editingDraftForm.position : draft.position || "";
    const emailForInvite = editingDraftId === draft.id ? editingDraftForm.email.trim() : draft.email;
    if (!normalizeEmail(emailForInvite)) {
      toast({
        title: t.common.error,
        description: t.membersPage.resendInviteInvalidEmail,
        variant: "destructive",
      });
      setDraftActionId(null);
      return;
    }

    const invitePayload = buildInvitePayloadFromDraftFields(
      displayNameForInvite || null,
      draftRole,
      inviteMasterSource,
      teamForInvite,
      ageForInvite,
      posForInvite,
    );
    const result = await createInviteRecord(emailForInvite, draftRole, inviteDays, invitePayload);
    if (!result.ok) {
      toast({ title: t.common.error, description: result.error, variant: "destructive" });
      setDraftActionId(null);
      return;
    }

    const previousInviteId = draft.invite_id;

    const { error: draftErr } = await supabase
      .from("club_member_drafts")
      .update({
        invite_id: result.inviteId,
        invited_at: new Date().toISOString(),
      })
      .eq("id", draft.id)
      .eq("club_id", clubId);
    if (draftErr) {
      toast({ title: t.common.error, description: draftErr.message, variant: "destructive" });
      setDraftActionId(null);
      return;
    }

    const normalizedInviteEmail = normalizeEmail(emailForInvite);
    const emailResult = await deliverClubInviteEmail({
      inviteId: result.inviteId,
      toEmail: normalizedInviteEmail,
      inviteToken: result.token,
      recipientName: displayNameForInvite || null,
    });

    void appendMemberAuditEvent({
      clubId,
      draftId: draft.id,
      correlationEmail: normalizedInviteEmail,
      eventType: "invite_resent",
      summary: "Invite resent (new link)",
      detail: {
        invite_id: result.inviteId,
        previous_invite_id: previousInviteId ?? null,
        email_sent: emailResult.ok,
      },
    });

    if (previousInviteId) {
      const { error: delErr } = await supabase
        .from("club_invites")
        .delete()
        .eq("club_id", clubId)
        .eq("id", previousInviteId)
        .is("used_at", null);
      if (delErr) {
        toast({
          title: t.common.error,
          description: delErr.message,
          variant: "destructive",
        });
      }
    }

    trackEvent("invite_resent_from_draft", { draftId: draft.id });
    await fetchMemberDrafts();
    const slugRes = await supabase.from("clubs").select("slug").eq("id", clubId).maybeSingle();
    if (!slugRes.error && slugRes.data?.slug) setClubSlug(slugRes.data.slug);
    void fetchInvitesData();
    setDraftInviteLinkModalVariant("resend");
    setDraftResendInviteToken(result.token);
    setDraftResendTokenModalOpen(true);
    notifyInviteEmailDelivery(normalizedInviteEmail, emailResult);
    setDraftActionId(null);
  };

  const handleRemoveDuplicateDrafts = useCallback(async () => {
    if (!clubId || !canManageMembers || duplicateDraftRemovalBusy) return;
    const { draftIdsToRemove, protectedDraftIds } = duplicateDraftRemovalPlan;
    if (!draftIdsToRemove.length) {
      toast({
        title: t.membersPage.duplicateReviewRemoveNone,
        description:
          protectedDraftIds.length > 0
            ? t.membersPage.duplicateReviewRemoveProtectedDesc.replace(
                "{count}",
                String(protectedDraftIds.length),
              )
            : undefined,
        variant: "destructive",
      });
      return;
    }

    setDuplicateDraftRemovalBusy(true);
    let removed = 0;
    let failed = 0;

    for (const draftId of draftIdsToRemove) {
      const snapshot = memberDrafts.find((draft) => draft.id === draftId);
      const { error } = await supabase
        .from("club_member_drafts")
        .delete()
        .eq("id", draftId)
        .eq("club_id", clubId);
      if (error) {
        failed += 1;
        continue;
      }
      removed += 1;
      if (snapshot) {
        void appendMemberAuditEvent({
          clubId,
          draftId,
          correlationEmail: normalizeEmail(snapshot.email),
          eventType: "draft_removed",
          summary: "Removed duplicate saved-list draft",
          detail: { source: "duplicate_draft_cleanup", status: snapshot.status },
        });
      }
    }

    if (removed > 0) {
      const removedSet = new Set(draftIdsToRemove);
      setMemberDrafts((previous) => previous.filter((draft) => !removedSet.has(draft.id)));
      if (editingDraftId && removedSet.has(editingDraftId)) {
        setEditingDraftId(null);
        setEditDraftTeamIds([]);
      }
      await fetchMemberDrafts();
    }

    toast({
      title: removed > 0 ? t.membersPage.duplicateReviewRemoveComplete : t.common.error,
      description:
        removed > 0
          ? t.membersPage.duplicateReviewRemoveCompleteDesc
              .replace("{removed}", String(removed))
              .replace("{protected}", String(protectedDraftIds.length))
              .replace("{failed}", String(failed))
          : t.membersPage.duplicateReviewRemoveFailed,
      variant: removed > 0 ? "default" : "destructive",
    });
    setDuplicateDraftRemovalBusy(false);
  }, [
    clubId,
    canManageMembers,
    duplicateDraftRemovalBusy,
    duplicateDraftRemovalPlan,
    editingDraftId,
    fetchMemberDrafts,
    memberDrafts,
    t,
    toast,
  ]);

  const handleDeleteDraft = async (draftId: string) => {
    if (!clubId || draftActionId) return;
    const snapshot = memberDrafts.find((d) => d.id === draftId);
    setDraftActionId(draftId);
    const { error } = await supabase
      .from("club_member_drafts")
      .delete()
      .eq("id", draftId)
      .eq("club_id", clubId);
    if (error) {
      toast({ title: t.common.error, description: error.message, variant: "destructive" });
      setDraftActionId(null);
      return;
    }
    if (snapshot) {
      void appendMemberAuditEvent({
        clubId,
        draftId,
        correlationEmail: normalizeEmail(snapshot.email),
        eventType: "draft_removed",
        summary: "Removed from saved list",
        detail: { status: snapshot.status, had_invite_id: Boolean(snapshot.invite_id) },
      });
    }
    setMemberDrafts((previous) => previous.filter((row) => row.id !== draftId));
    setDraftActionId(null);
  };

  const handleStartEditDraft = (draft: MemberDraftRow) => {
    setEditingDraftId(draft.id);
    setDraftGuardianPickId("");
    const md = (draft.master_data as Partial<ClubMemberMasterRecord>) ?? {};
    const { firstName, lastName } = splitStoredNameToFirstLast(draft.name || "", md);
    const fn = firstName.trim() || (typeof md.first_name === "string" ? md.first_name.trim() : "");
    const ln = lastName.trim() || (typeof md.last_name === "string" ? md.last_name.trim() : "");
    setEditingDraftForm({
      firstName,
      lastName,
      email: draft.email ?? "",
      role: draft.role,
      team: draft.team || "",
      age_group: draft.age_group || "",
      position: draft.position || "",
      masterData: {
        ...md,
        first_name: fn || null,
        last_name: ln || null,
      },
    });
    const draftTeamId = resolveClubTeamIdFromLabel(clubTeams, draft.team);
    setEditDraftTeamIds(draftTeamId ? [draftTeamId] : []);
    setDraftMasterExpanded(false);
  };

  const applySharedContactFilter = (email: string, focus?: SharedContactEmailMember) => {
    const normalized = normalizeEmail(email);
    if (!normalized) return;

    setSharedContactFilterEmail(normalized);

    const scrollToSavedList = () => {
      window.requestAnimationFrame(() => {
        savedMemberListRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    };

    if (!focus) {
      setEditingDraftId(null);
      scrollToSavedList();
      return;
    }

    if (focus.source === "roster") {
      const rosterMember = members.find((m) => m.id === focus.id);
      if (!rosterMember) return;
      setEditingDraftId(null);
      focusRosterMember(rosterMember);
      return;
    }

    if (focus.source === "draft") {
      const draft = memberDrafts.find((d) => d.id === focus.id);
      if (!draft) return;
      setSelectedMember(null);
      setMemberPanelEditModeId(null);
      setMemberMasterEditDraft({});
      handleStartEditDraft(draft);
      window.requestAnimationFrame(() => {
        savedMemberListRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        window.requestAnimationFrame(() => {
          document.getElementById(`saved-draft-${draft.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
        });
      });
    }
  };

  const uploadDraftMemberAvatar = async (file: File) => {
    if (!user || !editingDraftId || draftAvatarUploading) return;
    setDraftAvatarUploading(true);
    try {
      const cleanName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, "-");
      const filePath = `${user.id}/club-member-draft-${editingDraftId}-${Date.now()}-${cleanName}`;
      const { error } = await supabase.storage
        .from(PROFILE_AVATAR_BUCKET)
        .upload(filePath, file, { upsert: true, contentType: file.type || undefined });
      if (error) throw error;
      const { data } = supabase.storage.from(PROFILE_AVATAR_BUCKET).getPublicUrl(filePath);
      setEditingDraftForm((f) => ({
        ...f,
        masterData: { ...f.masterData, photo_url: data.publicUrl, photo_uploaded_at: new Date().toISOString() },
      }));
      toast({ title: t.settingsPage.avatarUploadSuccess });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t.settingsPage.uploadFailed;
      toast({
        title: t.settingsPage.avatarUploadFailed,
        description: message.includes("Bucket not found") ? t.settingsPage.avatarUploadBucketHint : message,
        variant: "destructive",
      });
    } finally {
      setDraftAvatarUploading(false);
    }
  };

  const uploadBulkRowAvatar = async (rowId: string, file: File) => {
    if (!user || bulkAvatarUploadingRowId !== null) return;
    setBulkAvatarUploadingRowId(rowId);
    try {
      const cleanName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, "-");
      const filePath = `${user.id}/club-member-bulk-${rowId}-${Date.now()}-${cleanName}`;
      const { error } = await supabase.storage
        .from(PROFILE_AVATAR_BUCKET)
        .upload(filePath, file, { upsert: true, contentType: file.type || undefined });
      if (error) throw error;
      const { data } = supabase.storage.from(PROFILE_AVATAR_BUCKET).getPublicUrl(filePath);
      updateBulkRowMasterField(rowId, "photo_url", data.publicUrl);
      toast({ title: t.settingsPage.avatarUploadSuccess });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t.settingsPage.uploadFailed;
      toast({
        title: t.settingsPage.avatarUploadFailed,
        description: message.includes("Bucket not found") ? t.settingsPage.avatarUploadBucketHint : message,
        variant: "destructive",
      });
    } finally {
      setBulkAvatarUploadingRowId(null);
    }
  };

  const resolveDraftById = useCallback(
    (draftId: string) =>
      memberDrafts.find((d) => d.id === draftId) ?? searchMatchedDrafts.find((d) => d.id === draftId),
    [memberDrafts, searchMatchedDrafts],
  );

  const handleSaveDraftEdit = async () => {
    if (!clubId || !editingDraftId) {
      toast({ title: t.common.error, description: t.membersPage.noClubSelected, variant: "destructive" });
      return;
    }
    setDraftSaving(true);
    let currentDraft = resolveDraftById(editingDraftId);
    if (!currentDraft) {
      const { data, error: loadError } = await supabase
        .from("club_member_drafts")
        .select("*")
        .eq("id", editingDraftId)
        .eq("club_id", clubId)
        .maybeSingle();
      if (loadError) {
        toast({ title: t.common.error, description: loadError.message, variant: "destructive" });
        setDraftSaving(false);
        return;
      }
      currentDraft = (data as unknown as MemberDraftRow | null) ?? undefined;
    }
    if (!currentDraft) {
      toast({ title: t.common.error, description: t.membersPage.savedMemberDraftNotFound, variant: "destructive" });
      setDraftSaving(false);
      return;
    }
    const combinedName = buildDisplayNameFromParts(editingDraftForm.firstName, editingDraftForm.lastName);
    const nextMaster: Partial<ClubMemberMasterRecord> = {
      ...editingDraftForm.masterData,
      first_name: editingDraftForm.firstName.trim() || null,
      last_name: editingDraftForm.lastName.trim() || null,
    };
    const masterPayload = Object.fromEntries(
      Object.entries(nextMaster as Record<string, unknown>).filter(
        ([, v]) => v !== null && v !== undefined && v !== "",
      ),
    ) as Record<string, unknown>;
    if (!isPlayerRole(editingDraftForm.role)) {
      delete masterPayload[DRAFT_GUARDIAN_MEMBERSHIP_IDS_KEY];
    }

    let resolvedInviteId: string | null = currentDraft.invite_id;
    if (currentDraft.status === "invited" && !resolvedInviteId) {
      resolvedInviteId = await resolveUnusedInviteIdForInvitedDraft(currentDraft);
    }

    const assignedDraftTeamNames = clubTeamNamesFromIds(clubTeams, editDraftTeamIds);
    const draftTeamName = assignedDraftTeamNames[0] || editingDraftForm.team.trim() || null;
    const selectedDraftTeam = clubTeams.find((team) => editDraftTeamIds.includes(team.id));

    const draftRowUpdate: Record<string, unknown> = {
      name: combinedName || null,
      email: editingDraftForm.email.trim() || null,
      role: editingDraftForm.role,
      team: draftTeamName,
      age_group: editingDraftForm.age_group.trim() || selectedDraftTeam?.age_group || null,
      position: editingDraftForm.position || null,
      master_data: masterPayload,
    };
    if (resolvedInviteId && !currentDraft.invite_id) {
      draftRowUpdate.invite_id = resolvedInviteId;
    }

    const { error } = await supabase
      .from("club_member_drafts")
      .update(draftRowUpdate as Record<string, unknown>)
      .eq("id", editingDraftId)
      .eq("club_id", clubId);
    if (error) {
      if (isMissingDraftMasterDataColumnError(error)) {
        toast({
          title: t.membersPage.masterDataColumnMissingTitle,
          description: t.membersPage.masterDataColumnMissingDesc,
          variant: "destructive",
        });
      } else {
        toast({ title: t.common.error, description: error.message, variant: "destructive" });
      }
      setDraftSaving(false);
      return;
    }

    void appendMemberAuditEvent({
      clubId,
      draftId: editingDraftId,
      correlationEmail: normalizeEmail(editingDraftForm.email),
      eventType: "draft_saved",
      summary: "Saved member list entry",
      detail: {
        status: currentDraft.status,
        role: editingDraftForm.role,
        email_changed: (currentDraft.email ?? "").trim() !== editingDraftForm.email.trim(),
      },
    });

    let inviteSyncSkippedUsed = false;
    if (currentDraft.status === "invited" && resolvedInviteId) {
      const { data: invRow, error: invSelectError } = await supabase
        .from("club_invites")
        .select("used_at")
        .eq("id", resolvedInviteId)
        .eq("club_id", clubId)
        .maybeSingle();
      if (!invSelectError && invRow && !invRow.used_at) {
        const invitePayload = buildInvitePayloadFromDraftFields(
          combinedName || null,
          editingDraftForm.role,
          editingDraftForm.masterData as Record<string, unknown>,
          editingDraftForm.team,
          editingDraftForm.age_group,
          editingDraftForm.position,
        );
        const emailLower = normalizeEmail(editingDraftForm.email);
        const { error: invUpdateError } = await supabase
          .from("club_invites")
          .update({
            invite_payload: invitePayload,
            email: emailLower || null,
          })
          .eq("id", resolvedInviteId)
          .eq("club_id", clubId);
        if (invUpdateError) {
          toast({ title: t.common.error, description: invUpdateError.message, variant: "destructive" });
        } else {
          void fetchInvitesData();
        }
      } else if (invRow?.used_at) {
        inviteSyncSkippedUsed = true;
      }
    }

    const updatedDraft: MemberDraftRow = {
      ...currentDraft,
      name: combinedName,
      email: editingDraftForm.email.trim() || null,
      role: editingDraftForm.role,
      team: editingDraftForm.team || null,
      age_group: editingDraftForm.age_group || null,
      position: editingDraftForm.position || null,
      master_data: masterPayload as Record<string, unknown>,
      invite_id: resolvedInviteId ?? currentDraft.invite_id,
    };

    setMemberDrafts((prev) => {
      const exists = prev.some((d) => d.id === editingDraftId);
      if (!exists) return [updatedDraft, ...prev];
      return prev.map((d) => (d.id === editingDraftId ? updatedDraft : d));
    });
    setSearchMatchedDrafts((prev) => {
      if (!prev.some((d) => d.id === editingDraftId)) return prev;
      return prev.map((d) => (d.id === editingDraftId ? updatedDraft : d));
    });
    const savedDisplayName = combinedName || editingDraftForm.email.trim() || t.membersPage.unknownMember;
    toast({
      title: t.membersPage.masterDataSavedTitle,
      description: t.membersPage.masterDataSavedDescDraft.replace("{name}", savedDisplayName),
    });
    if (inviteSyncSkippedUsed) {
      window.setTimeout(() => {
        toast({ title: t.membersPage.draftUpdated, description: t.membersPage.inviteSyncSkippedAlreadyJoined });
      }, 300);
    }
    setDraftSaveConfirmedAt(Date.now());
    window.setTimeout(() => setDraftSaveConfirmedAt(null), 4000);
    setDraftSaving(false);
  };

  const handleCancelDraftEdit = () => {
    setEditingDraftId(null);
    setEditDraftTeamIds([]);
    setDraftGuardianPickId("");
    setSharedContactFilterEmail(null);
  };

  const closeRosterMemberPanel = () => {
    setMemberPanelEditModeId(null);
    setMemberMasterEditDraft({});
    setSelectedMember(null);
    setSharedContactFilterEmail(null);
  };

  const draftMergedMasterForTabs = useMemo(
    () =>
      mergeDraftMasterValuesForTabs(
        editingDraftForm.masterData,
        editingDraftForm.firstName,
        editingDraftForm.lastName,
      ),
    [editingDraftForm.masterData, editingDraftForm.firstName, editingDraftForm.lastName],
  );

  const handleCopy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  };

  /** Same height, padding, radius, and icon scale for status + actions in saved member list rows */
  const savedMemberListRowChipClass =
    "inline-flex h-8 min-h-8 shrink-0 items-center justify-center gap-1.5 rounded-full px-3 text-xs font-medium leading-none shadow-none [&_svg]:h-3.5 [&_svg]:w-3.5 [&_svg]:shrink-0";

  const openCreateInvite = () => {
    setCreatedInviteToken(null);
    setInviteEmail("");
    setInviteRole("member");
    setInviteDays("7");
    setShowCreateInvite(true);
  };

  return (
    <div className={DASHBOARD_PAGE_ROOT}>
      <DashboardHeaderSlot
        title={t.membersPage.title}
        subtitle={tab === "members" ? t.membersPage.roster : tab === "roles" ? t.membersPage.roles.subtitle : (clubName ? `${clubName} · ${t.membersPage.invites}` : t.membersPage.invites)}
        toolbarRevision={`${tab}-${canManageMembers}-${canReviewJoinRequests}`}
        rightSlot={
          <div className="flex gap-2 flex-wrap justify-end">
            <AiAgentHeaderButton intent="add_member_draft" />
            {tab === "members" && canManageMembers ? (
              <Button
                size="sm"
                className="bg-gradient-gold-static text-primary-foreground font-semibold hover:brightness-110"
                onClick={() => setShowAddMembers(true)}
              >
                <Plus className="w-4 h-4 mr-1" /> {t.membersPage.addMember}
              </Button>
            ) : null}
            {tab !== "members" && canReviewJoinRequests ? (
              <Button
                size="sm"
                className="bg-gradient-gold-static text-primary-foreground font-semibold hover:brightness-110"
                onClick={openCreateInvite}
              >
                <UserPlus className="w-4 h-4 mr-1" /> {t.membersPage.createInvite}
              </Button>
            ) : null}
          </div>
        }
      />

      <MembersTabNav
        tab={tab}
        onTabChange={setTab}
        showRoles={canManageRoles}
        labels={{
          members: t.membersPage.title,
          invites: t.membersPage.invites,
          roles: t.membersPage.roles.tabLabel,
        }}
      />

      <div className={DASHBOARD_PAGE_INNER}>
        {(clubLoading || (loading && !hasMembersHydrated)) ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : !clubId ? (
          <div className="text-center py-20">
            <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="font-display text-xl font-bold text-foreground mb-2">{t.membersPage.noClubFound}</h2>
            <p className="text-muted-foreground mb-4">{t.membersPage.joinClubToManage}</p>
            <Button onClick={() => navigate("/onboarding")} variant="outline">{t.membersPage.goToOnboarding}</Button>
          </div>
        ) : !canAccessMembersPage ? (
          <div className="text-center py-20">
            <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="font-display text-xl font-bold text-foreground mb-2">{t.common.notAuthorized}</h2>
            <p className="text-muted-foreground mb-4">{t.membersPage.onlyAdminsMembers}</p>
            <Button onClick={() => navigate(-1)} variant="outline">{t.membersPage.goBack}</Button>
          </div>
        ) : (
          <>
            {tab === "roles" && canManageRoles && <MembersRolesPanel />}
            {tab === "members" ? (
              !canManageMembers ? (
                <div className="rounded-xl bg-card border border-border p-8 text-center">
                  <h2 className="font-display text-lg font-bold text-foreground mb-2">{t.membersPage.membersTabRestrictedTitle}</h2>
                  <p className="text-muted-foreground mb-4">{t.membersPage.membersTabRestrictedDesc}</p>
                  <Button variant="outline" onClick={() => setTab("invites")}>{t.membersPage.switchToInvites}</Button>
                </div>
              ) : (
              <MembersRosterPanel
                toolbar={
                  <>
            {clubId && canManageMembers ? (
              <div className="mb-4">
                <MembersImportPanel
                  clubId={clubId}
                  labels={{
                    title: t.guidedSetupPage.importStepTitle,
                    hint: t.guidedSetupPage.importHint,
                    upload: t.guidedSetupPage.importUpload,
                    save: t.guidedSetupPage.importContinue,
                    preview: t.guidedSetupPage.importPreviewCount,
                    truncated: t.guidedSetupPage.importTruncatedHint,
                  }}
                  onSaved={(saved, skipped) => {
                    toast({
                      title: t.guidedSetupPage.importSavedTitle,
                      description: t.guidedSetupPage.importSavedDesc
                        .replace("{saved}", String(saved))
                        .replace("{skipped}", String(skipped)),
                    });
                    void fetchMemberDrafts();
                  }}
                  onError={(message) => {
                    toast({
                      title: t.common.error,
                      description: message === "empty" ? t.guidedSetupPage.importEmptyDesc : message,
                      variant: "destructive",
                    });
                  }}
                />
              </div>
            ) : null}
            {/* Search & Filter */}
            <div className="flex flex-col sm:flex-row gap-3 mb-6">
              <div className="flex-1">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder={t.membersPage.searchMembers}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9 bg-card border-border"
                  />
                </div>
                {search.trim() ? (
                  <p className="mt-1.5 text-[11px] text-muted-foreground">
                    {debouncedSearch.trim().length >= 2
                      ? "Search runs across the full roster and saved list (name, phone, email, master fields, club number). Use paging for more roster results."
                      : "Type at least 2 characters to search the full roster; shorter text filters the current page and saved list."}
                  </p>
                ) : null}
              </div>
              <div className="flex min-w-0 gap-2 overflow-x-auto pb-1 sm:max-w-[min(100%,28rem)] sm:shrink-0 lg:max-w-none">
                {allRoles.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRoleFilter(r)}
                    className={`inline-flex h-8 shrink-0 items-center justify-center px-3.5 text-xs font-medium leading-none rounded-full whitespace-nowrap transition-colors ${
                      roleFilter === r
                        ? "bg-primary text-primary-foreground"
                        : "bg-card border border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {r === "all" ? t.membersPage.allRoles : getRoleLabel(r)}
                  </button>
                ))}
              </div>
            </div>
                  </>
                }
              >
            {/* Stats (club-wide via RPC; tap to filter Saved Member List) */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
              {(
                [
                  {
                    key: "total" as const,
                    label:
                      isSearchActive && debouncedSearch.trim().length >= 2
                        ? t.membersPage.searchStatsMatches
                        : t.membersPage.total,
                    value:
                      isSearchActive && debouncedSearch.trim().length >= 2
                        ? (membersDbTotalCount ?? rosterSearchResults.length)
                        : clubMemberStats?.total ?? members.length,
                    color: "text-foreground",
                  },
                  {
                    key: "active" as const,
                    label: t.membersPage.active,
                    value:
                      isSearchActive && debouncedSearch.trim().length >= 2
                        ? rosterSearchResults.filter(({ member }) => member.status === "active").length
                        : clubMemberStats?.active ?? members.filter((m) => m.status === "active").length,
                    color: "text-primary",
                  },
                  {
                    key: "players" as const,
                    label: t.common.players,
                    value: clubMemberStats?.players ?? members.filter((m) => m.role === "player").length,
                    color: "text-blue-400",
                  },
                  {
                    key: "trainers" as const,
                    label: t.common.trainers,
                    value: clubMemberStats?.trainers ?? members.filter((m) => m.role === "trainer").length,
                    color: "text-accent",
                  },
                  {
                    key: "pending" as const,
                    label: t.membersPage.pendingImport,
                    value: isSearchActive ? filteredDrafts.length : memberDraftTotalCount,
                    color: "text-violet-400",
                  },
                  {
                    key: "needs_review" as const,
                    label: t.membersPage.duplicateReviewStat,
                    value: duplicateReviewCount,
                    color: "text-amber-400",
                  },
                ] as const
              ).map((s) => {
                const isSelected = statsFilter === s.key;
                return (
                  <button
                    key={s.key}
                    type="button"
                    onClick={() => applyStatsFilter(s.key)}
                    aria-pressed={isSelected}
                    title={t.membersPage.statsFilterSavedHint.replace("{count}", String(filteredDrafts.length))}
                    className={cn(
                      "p-4 rounded-xl bg-card border text-center transition-colors",
                      "hover:border-primary/50 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
                      isSelected ? "border-primary ring-2 ring-primary/30 bg-primary/5" : "border-border",
                    )}
                  >
                    <div className={`text-2xl font-display font-bold ${s.color}`}>{s.value}</div>
                    <div className="text-xs text-muted-foreground mt-1">{s.label}</div>
                  </button>
                );
              })}
            </div>
            {duplicateReviewCount > 0 ? (
              <div className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs text-amber-100/90">
                <div className="font-medium text-amber-200">{t.membersPage.duplicateReviewBannerTitle}</div>
                <p className="mt-1 text-amber-100/80">
                  {t.membersPage.duplicateReviewBannerDesc.replace("{count}", String(duplicateReviewCount))}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {statsFilter !== "needs_review" ? (
                    <Button
                      type="button"
                      variant="link"
                      size="sm"
                      className="h-8 px-0 text-xs text-amber-300 hover:text-amber-200"
                      onClick={() => applyStatsFilter("needs_review")}
                    >
                      {t.membersPage.duplicateReviewStat}
                    </Button>
                  ) : null}
                  {duplicateDraftsToRemoveCount > 0 ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      className="h-8 text-xs"
                      disabled={duplicateDraftRemovalBusy}
                      onClick={() => void handleRemoveDuplicateDrafts()}
                    >
                      {duplicateDraftRemovalBusy ? (
                        <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                      ) : null}
                      {t.membersPage.duplicateReviewRemoveDrafts.replace(
                        "{count}",
                        String(duplicateDraftsToRemoveCount),
                      )}
                    </Button>
                  ) : null}
                </div>
              </div>
            ) : null}
            {statsFilter ? (
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                <span>
                  {t.membersPage.statsFilterSavedHint.replace("{count}", String(filteredDrafts.length))}
                </span>
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  className="h-auto p-0 text-xs"
                  onClick={() => {
                    setStatsFilter(null);
                    setRoleFilter("all");
                  }}
                >
                  {t.membersPage.statsFilterClear}
                </Button>
              </div>
            ) : null}
            {sharedContactFilterActive ? (
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-sky-500/25 bg-sky-500/5 px-3 py-2 text-xs text-sky-200/90">
                <span>
                  {t.membersPage.sharedContactFilterActive
                    .replace("{count}", String(sharedContactFilterCount))
                    .replace("{email}", sharedContactFilterEmail || "")}
                </span>
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  className="h-auto p-0 text-xs text-sky-300"
                  onClick={() => setSharedContactFilterEmail(null)}
                >
                  {t.membersPage.sharedContactFilterClear}
                </Button>
              </div>
            ) : null}

            <div className="rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/12 via-card/90 to-accent/10 p-5 sm:p-6 mb-6 shadow-[0_12px_40px_rgba(0,0,0,0.12)]">
              <div className="flex flex-col lg:flex-row lg:items-center gap-4 lg:gap-6">
                <div className="flex items-start gap-3 flex-1">
                  <div className="shrink-0">
                    {clubLogoUrl ? (
                      <img
                        src={clubLogoUrl}
                        alt={clubName ? `${clubName} logo` : "Club logo"}
                        className="h-10 w-10 rounded-xl border border-primary/20 bg-background/70 object-cover"
                      />
                    ) : (
                      <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-sm font-semibold text-primary">
                        {clubName?.trim()?.[0]?.toUpperCase() ?? "C"}
                      </div>
                    )}
                  </div>
                  <div>
                    <h2 className="font-display text-lg sm:text-xl font-bold text-foreground tracking-tight">{t.membersPage.registryHeroTitle}</h2>
                    <p className="text-sm text-muted-foreground mt-1 leading-relaxed whitespace-pre-line">{t.membersPage.registryHeroBody}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 shrink-0">
                  <Button
                    variant="outline"
                    className="border-border/80 bg-background/60"
                    onClick={() => void handleExportMemberRegistry()}
                  >
                    <FileSpreadsheet className="w-4 h-4 mr-2" /> {t.membersPage.exportRegistry}
                  </Button>
                  <Button
                    className="bg-gradient-gold-static text-primary-foreground font-semibold hover:brightness-110"
                    onClick={() => setShowRegistryImport(true)}
                  >
                    <Upload className="w-4 h-4 mr-2" /> {t.membersPage.importRegistry}
                  </Button>
                </div>
              </div>
            </div>

            <div
              ref={savedMemberListRef}
              className="rounded-xl bg-card border border-border p-4 mb-6"
            >
              {memberDraftsTruncated ? (
                <div className="mb-3 rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs text-amber-200/90">
                  {t.membersPage.savedMemberListTruncated
                    .replace("{loaded}", String(memberDrafts.length))
                    .replace("{total}", String(memberDraftTotalCount))}
                </div>
              ) : null}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
                <div>
                  <div className="text-sm font-display font-bold text-foreground tracking-tight">
                    {isSearchActive ? t.membersPage.searchResultsTitle : t.membersPage.savedMemberList}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {isSearchActive
                      ? t.membersPage.searchResultsSummary
                          .replace("{rosterCount}", String(rosterSearchResults.length))
                          .replace("{draftCount}", String(filteredDrafts.length))
                          .replace("{query}", trimmedSearch)
                      : t.membersPage.savedMemberListDesc}
                  </div>
                </div>
                {!isSearchActive ? (
                <div className="flex items-center gap-3">
                  <div className="text-xs text-muted-foreground">
                    {statsFilter
                      ? t.membersPage.statsFilterSavedHint.replace("{count}", String(filteredDrafts.length))
                      : t.membersPage.savedMemberCount
                          .replace("{draftCount}", String(memberDraftTotalCount || memberDrafts.filter((row) => row.status === "draft").length))
                          .replace("{invitedCount}", String(memberDrafts.filter((row) => row.status === "invited").length))}
                  </div>
                  {!isSearchActive && savedDraftsPreviewApplicable && !showAllDrafts ? (
                    <Button variant="link" size="sm" className="h-auto p-0 text-[11px]" onClick={() => setShowAllDrafts(true)}>
                      {t.membersPage.showAllDrafts.replace("{count}", String(savedDraftsForDisplay.length))}
                    </Button>
                  ) : !isSearchActive && savedDraftsPreviewApplicable && showAllDrafts ? (
                    <Button variant="link" size="sm" className="h-auto p-0 text-[11px]" onClick={() => setShowAllDrafts(false)}>
                      {t.membersPage.showLessDrafts}
                    </Button>
                  ) : null}
                </div>
                ) : null}
              </div>

              {isSearchActive ? (
                <div className="space-y-4 mb-4">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                      {t.membersPage.searchResultsRosterSection} ({rosterSearchResults.length})
                    </div>
                    {rosterSearchResults.length === 0 ? (
                      <p className="text-xs text-muted-foreground py-2">{t.membersPage.searchResultsRosterEmpty}</p>
                    ) : (
                      <div className="space-y-2">
                        {rosterSearchResults.map(({ member, fields }) => (
                          <button
                            key={member.id}
                            type="button"
                            onClick={() => focusRosterMember(member)}
                            className="w-full rounded-lg border border-primary/25 bg-primary/5 p-3 text-left hover:border-primary/40 hover:bg-primary/10 transition-colors"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="text-sm font-medium text-foreground truncate">{getMemberRosterName(member)}</div>
                                <div className="text-xs text-muted-foreground truncate">
                                  {getMemberTeamLabel(member)}
                                  {membershipEmails[member.id] ? ` · ${membershipEmails[member.id]}` : ""}
                                </div>
                                <div className="text-[11px] text-primary/80 mt-1">{t.membersPage.searchResultsTapToOpen}</div>
                              </div>
                              <span className={`text-xs font-medium px-2.5 py-1 rounded-full shrink-0 ${roleColors[member.role] || "bg-muted text-muted-foreground"}`}>
                                {getRoleLabel(member.role)}
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-1.5 mt-2">
                              {(fields.length > 0 ? fields : (["master_name"] as const)).slice(0, 1).map((field) => (
                                <Badge key={field} variant="secondary" className="text-[10px] font-normal px-2 py-0">
                                  {fields.length > 0 ? getSearchMatchFieldLabel(field) : t.membersPage.searchMatchGeneric}
                                </Badge>
                              ))}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                      {t.membersPage.searchResultsSavedListSection} ({filteredDrafts.length})
                    </div>
                    {filteredDrafts.length === 0 ? (
                      <p className="text-xs text-muted-foreground py-2">
                        {searchDraftsLoading ? t.common.loading : t.membersPage.searchResultsSavedListEmpty}
                      </p>
                    ) : null}
                  </div>
                  {rosterSearchResults.length === 0 && filteredDrafts.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      {t.membersPage.searchResultsNoMatches.replace("{query}", trimmedSearch)}
                    </p>
                  ) : null}
                </div>
              ) : null}

              {draftsLoading ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="w-4 h-4 animate-spin text-primary" />
                </div>
              ) : memberDrafts.length === 0 ? (
                <div className="text-xs text-muted-foreground py-4">{t.membersPage.savedMemberListEmpty}</div>
              ) : statsFilter && filteredDrafts.length === 0 && !isSearchActive ? (
                <div className="text-xs text-muted-foreground py-4">{t.membersPage.statsFilterSavedEmpty}</div>
              ) : isSearchActive && filteredDrafts.length === 0 ? (
                null
              ) : (
                <div className="space-y-2">
                  {visibleDrafts.map((draft) => (
                    editingDraftId === draft.id ? (
                      <div
                        key={draft.id}
                        id={`saved-draft-${draft.id}`}
                        className="w-full min-w-0 overflow-x-hidden space-y-4 rounded-lg border-2 border-primary/30 bg-background/60 p-4 max-lg:p-4"
                      >
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <div className="text-xs text-muted-foreground mb-1">{t.membersPage.draftEditLabelFirstName}</div>
                            <Input
                              id={`draft-${draft.id}-first`}
                              className="h-10 text-sm"
                              value={editingDraftForm.firstName}
                              placeholder={t.membersPage.draftEditFirstNamePlaceholder}
                              onChange={(e) => {
                                const v = e.target.value;
                                setEditingDraftForm((f) => ({
                                  ...f,
                                  firstName: v,
                                  masterData: { ...f.masterData, first_name: v.trim() || null },
                                }));
                              }}
                              autoComplete="given-name"
                            />
                          </div>
                          <div>
                            <div className="text-xs text-muted-foreground mb-1">{t.membersPage.draftEditLabelLastName}</div>
                            <Input
                              id={`draft-${draft.id}-last`}
                              className="h-10 text-sm"
                              value={editingDraftForm.lastName}
                              placeholder={t.membersPage.draftEditLastNamePlaceholder}
                              onChange={(e) => {
                                const v = e.target.value;
                                setEditingDraftForm((f) => ({
                                  ...f,
                                  lastName: v,
                                  masterData: { ...f.masterData, last_name: v.trim() || null },
                                }));
                              }}
                              autoComplete="family-name"
                            />
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground mb-1">{t.settingsPage.displayName}</div>
                          <Input
                            readOnly
                            className="h-10 text-sm opacity-80"
                            value={buildDisplayNameFromParts(editingDraftForm.firstName, editingDraftForm.lastName)}
                            placeholder={t.membersPage.draftEditDisplayNamePlaceholder}
                          />
                        </div>
                        {draft.status === "invited" ? (
                          <p className="text-xs text-muted-foreground leading-relaxed">{t.membersPage.invitedDraftEditHint}</p>
                        ) : null}
                        <div>
                          <div className="text-xs text-muted-foreground mb-2">{t.settingsPage.avatarPreview}</div>
                          <div className="flex items-center gap-3 flex-wrap">
                            <div className="w-14 h-14 rounded-2xl border border-border/60 bg-background/60 overflow-hidden flex items-center justify-center shrink-0">
                              {editingDraftForm.masterData.photo_url ? (
                                <img
                                  src={editingDraftForm.masterData.photo_url}
                                  alt=""
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <UserCircle2 className="w-8 h-8 text-muted-foreground" />
                              )}
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <label className="inline-flex">
                                <input
                                  type="file"
                                  accept="image/png,image/jpeg,image/jpg,image/webp,image/gif"
                                  className="hidden"
                                  onChange={(event) => {
                                    const file = event.target.files?.[0];
                                    if (!file) return;
                                    void uploadDraftMemberAvatar(file);
                                    event.currentTarget.value = "";
                                  }}
                                />
                                <span className="inline-flex items-center rounded-md border border-input bg-background px-3 py-2 text-xs font-medium cursor-pointer hover:bg-accent hover:text-accent-foreground">
                                  {draftAvatarUploading ? (
                                    <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                                  ) : (
                                    <UploadCloud className="w-3.5 h-3.5 mr-1" />
                                  )}
                                  {draftAvatarUploading ? t.settingsPage.uploadingAvatar : t.settingsPage.uploadAvatar}
                                </span>
                              </label>
                              {editingDraftForm.masterData.photo_url ? (
                                <>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    className="h-9 text-xs"
                                    onClick={() =>
                                      setEditingDraftForm((f) => ({
                                        ...f,
                                        masterData: { ...f.masterData, photo_url: null, photo_uploaded_at: null },
                                      }))
                                    }
                                    disabled={draftAvatarUploading}
                                  >
                                    {t.settingsPage.removeAvatar}
                                  </Button>
                                  {(() => {
                                    const validUntil = photoValidUntil(
                                      editingDraftForm.masterData.photo_uploaded_at ?? new Date().toISOString(),
                                    );
                                    if (!validUntil) return null;
                                    return (
                                      <span className="inline-flex h-9 items-center text-xs font-medium text-muted-foreground">
                                        {t.membersPage.photoValidUntilLabel.replace(
                                          "{date}",
                                          validUntil.toLocaleDateString(undefined, {
                                            year: "numeric",
                                            month: "short",
                                            day: "numeric",
                                          }),
                                        )}
                                      </span>
                                    );
                                  })()}
                                </>
                              ) : null}
                            </div>
                          </div>
                          <div className="mt-3">
                            <div className="text-xs text-muted-foreground mb-1">{t.settingsPage.avatarUrl}</div>
                            <Input
                              className="h-10 text-sm"
                              value={editingDraftForm.masterData.photo_url ?? ""}
                              onChange={(e) =>
                                setEditingDraftForm((f) => ({
                                  ...f,
                                  masterData: {
                                    ...f.masterData,
                                    photo_url: e.target.value || null,
                                    photo_uploaded_at: e.target.value
                                      ? (f.masterData.photo_uploaded_at ?? new Date().toISOString())
                                      : null,
                                  },
                                }))
                              }
                              placeholder="https://..."
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                          <div>
                            <div className="text-xs text-muted-foreground mb-1">{t.membersPage.draftEditLabelEmail}</div>
                            <Input
                              id={`draft-${draft.id}-email`}
                              type="email"
                              className="h-10 text-sm"
                              value={editingDraftForm.email}
                              placeholder={t.membersPage.memberEmailPlaceholder}
                              onChange={(e) => setEditingDraftForm((f) => ({ ...f, email: e.target.value }))}
                              autoComplete="email"
                            />
                          </div>
                          <div>
                            <div className="text-xs text-muted-foreground mb-1">{t.membersPage.draftEditLabelRole}</div>
                            <Select
                              value={editingDraftForm.role}
                              onValueChange={(v) =>
                                setEditingDraftForm((f) => {
                                  if (isPlayerRole(v)) return { ...f, role: v };
                                  const md = { ...(f.masterData as Record<string, unknown>) };
                                  delete md[DRAFT_GUARDIAN_MEMBERSHIP_IDS_KEY];
                                  return { ...f, role: v, masterData: md as typeof f.masterData };
                                })
                              }
                            >
                              <SelectTrigger id={`draft-${draft.id}-role`} className="h-10 w-full text-sm">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {SUPPORTED_ROLES.map((r) => (
                                  <SelectItem key={r} value={r} className="text-sm">{getRoleLabel(r)}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <MemberTeamAssignmentField
                            teams={clubTeams}
                            selectedTeamIds={editDraftTeamIds}
                            single
                            labels={draftTeamAssignmentLabels}
                            onChange={(ids) => {
                              setEditDraftTeamIds(ids);
                              const team = clubTeams.find((entry) => entry.id === ids[0]);
                              setEditingDraftForm((f) => ({
                                ...f,
                                team: team?.name || "",
                                age_group: f.age_group.trim() || team?.age_group || "",
                              }));
                            }}
                          />
                          <div>
                            <div className="text-xs text-muted-foreground mb-1">{t.membersPage.draftEditLabelAgeGroup}</div>
                            <Input
                              id={`draft-${draft.id}-age`}
                              className="h-10 text-sm"
                              value={editingDraftForm.age_group}
                              placeholder={t.membersPage.ageGroupPlaceholder}
                              onChange={(e) => setEditingDraftForm((f) => ({ ...f, age_group: e.target.value }))}
                            />
                          </div>
                          <div>
                            <div className="text-xs text-muted-foreground mb-1">{t.membersPage.draftEditLabelPosition}</div>
                            <Input
                              id={`draft-${draft.id}-position`}
                              className="h-10 text-sm"
                              value={editingDraftForm.position}
                              placeholder={t.membersPage.positionPlaceholder}
                              onChange={(e) => setEditingDraftForm((f) => ({ ...f, position: e.target.value }))}
                            />
                          </div>
                        </div>
                        {(() => {
                          const group = getSharedContactGroup(sharedContactGroups, editingDraftForm.email);
                          if (!group || !editingDraftId) return null;
                          return (
                            <SharedContactAccountsPanel
                              group={group}
                              currentId={editingDraftId}
                              labels={{
                                title: t.membersPage.sharedContactAccountsTitle,
                                current: t.membersPage.sharedContactAccountsCurrent,
                                showAll: t.membersPage.sharedContactFilterShowAll,
                                openMember: t.membersPage.sharedContactOpenMember,
                                importPreview: t.membersPage.sharedContactImportPreview,
                              }}
                              duplicateMemberKeys={duplicateReviewKeys}
                              duplicateWarning={t.membersPage.duplicateReviewPanelWarning}
                              onShowAll={(email) => applySharedContactFilter(email)}
                              onOpenMember={(member) => applySharedContactFilter(group.email, member)}
                            />
                          );
                        })()}
                        <button
                          type="button"
                          className="flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
                          onClick={() => setDraftMasterExpanded((prev) => !prev)}
                        >
                          {draftMasterExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                          {t.membersPage.masterDataFields}
                        </button>
                        {draftMasterExpanded && (
                          <div className="w-full min-w-0 overflow-x-hidden rounded-lg border border-border/40 bg-muted/10 p-3 max-lg:p-4">
                            <MasterDataTabs
                              values={draftMergedMasterForTabs}
                              labels={masterTabLabels}
                              compact
                              displayName={buildDisplayNameFromParts(
                                editingDraftForm.firstName,
                                editingDraftForm.lastName,
                              )}
                              clubName={clubName}
                              logoSrc={clubLogoUrl ?? ""}
                              membershipRole={getRoleLabel(editingDraftForm.role)}
                              isPlayer={isPlayerRole(editingDraftForm.role)}
                              teamLabel={draftTeamLabelForCard}
                              email={editingDraftForm.email.trim() || null}
                              clubId={clubId}
                              membershipId={
                                (typeof draftMergedMasterForTabs.membership_id === "string"
                                  ? draftMergedMasterForTabs.membership_id
                                  : null) ||
                                (() => {
                                  const emailKey = normalizeEmail(editingDraftForm.email);
                                  if (!emailKey) return null;
                                  const hit = Object.entries(membershipEmails).find(
                                    ([, email]) => normalizeEmail(email) === emailKey,
                                  );
                                  return hit?.[0] ?? null;
                                })()
                              }
                              avatarUpload={{
                                uploading: draftAvatarUploading,
                                onUpload: (file) => void uploadDraftMemberAvatar(file),
                                onRemove: () =>
                                  setEditingDraftForm((f) => ({
                                    ...f,
                                    masterData: { ...f.masterData, photo_url: null, photo_uploaded_at: null },
                                  })),
                              }}
                              onChange={(key, value) =>
                                setEditingDraftForm((f) => {
                                  if (key === "first_name") {
                                    const s = String(value ?? "");
                                    return {
                                      ...f,
                                      firstName: s,
                                      masterData: { ...f.masterData, first_name: s.trim() || null },
                                    };
                                  }
                                  if (key === "last_name") {
                                    const s = String(value ?? "");
                                    return {
                                      ...f,
                                      lastName: s,
                                      masterData: { ...f.masterData, last_name: s.trim() || null },
                                    };
                                  }
                                  if (key === "photo_url") {
                                    const url = value === "" || value === null ? null : String(value);
                                    return { ...f, masterData: { ...f.masterData, photo_url: url } };
                                  }
                                  return { ...f, masterData: { ...f.masterData, [key]: value } };
                                })
                              }
                              safetyTabExtraEnabled={isPlayerRole(editingDraftForm.role)}
                              safetyTabExtra={renderDraftGuardiansSafetyTabExtra()}
                            />
                          </div>
                        )}
                        <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
                          {draftSaveConfirmedAt && editingDraftId === draft.id ? (
                            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-400 sm:mr-auto">
                              <Check className="h-3.5 w-3.5" />
                              {t.membersPage.masterDataSavedHint}
                            </span>
                          ) : null}
                          {draft.status === "invited" ? (
                            getInvitedDraftPrimaryAction(draft) === "open_roster" ? (
                              <Button
                                size="sm"
                                variant="secondary"
                                className="h-9 text-sm"
                                disabled={draftSaving || draftActionId === draft.id}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  void handleOpenRosterFromDraft(draft);
                                }}
                              >
                                {draftActionId === draft.id ? (
                                  <Loader2 className="w-4 h-4 animate-spin mr-1" />
                                ) : (
                                  <Users className="w-4 h-4 mr-1" />
                                )}
                                {t.membersPage.openInRoster}
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="secondary"
                                className="h-9 text-sm"
                                disabled={draftSaving || draftActionId === draft.id}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  void handleResendInviteForDraft(draft);
                                }}
                              >
                                {draftActionId === draft.id ? (
                                  <Loader2 className="w-4 h-4 animate-spin mr-1" />
                                ) : (
                                  <RefreshCw className="w-4 h-4 mr-1" />
                                )}
                                {t.membersPage.resendInvite}
                              </Button>
                            )
                          ) : null}
                          <Button size="sm" variant="ghost" onClick={handleCancelDraftEdit} className="h-11 w-full text-sm sm:h-9 sm:w-auto" disabled={draftSaving}>
                            {t.common.cancel}
                          </Button>
                          <Button
                            size="sm"
                            type="button"
                            onClick={() => void handleSaveDraftEdit()}
                            disabled={
                              draftSaving ||
                              !(
                                editingDraftForm.email.trim() ||
                                buildDisplayNameFromParts(editingDraftForm.firstName, editingDraftForm.lastName).trim() ||
                                String(editingDraftForm.masterData?.internal_club_number ?? "").trim()
                              )
                            }
                            className="h-11 w-full bg-gradient-gold-static text-sm font-semibold text-primary-foreground hover:brightness-110 sm:h-9 sm:w-auto sm:min-w-[6.5rem]"
                          >
                            {draftSaving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                            {t.common.save}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div
                        key={draft.id}
                        id={`saved-draft-${draft.id}`}
                        className="rounded-lg border border-border/60 bg-background/40 p-3 flex items-center justify-between gap-3 cursor-pointer hover:border-primary/30 hover:bg-muted/30 transition-colors"
                        onClick={() => handleStartEditDraft(draft)}
                      >
                        <div className="min-w-0 flex items-center gap-2">
                          <Pencil className="w-3 h-3 text-muted-foreground shrink-0" />
                          <div className="min-w-0">
                            <div className="text-sm font-medium text-foreground truncate">
                              {draft.name || draft.email || t.membersPage.noEmail}
                            </div>
                            <div className="text-xs text-muted-foreground truncate">
                              {draft.email?.trim() ? draft.email : t.membersPage.noEmail} · {getRoleLabel(draft.role)}
                              {draft.team ? ` · ${draft.team}` : ""}
                              {draft.age_group ? ` · ${draft.age_group}` : ""}
                              {draft.position ? ` · ${draft.position}` : ""}
                            </div>
                            {getSharedContactGroup(sharedContactGroups, draft.email) ? (
                              <div className="mt-1">
                                <SharedContactEmailBadge
                                  group={getSharedContactGroup(sharedContactGroups, draft.email)!}
                                  label={t.membersPage.sharedContactBadge}
                                  tooltipTitle={t.membersPage.sharedContactTooltip}
                                />
                              </div>
                            ) : null}
                            {(() => {
                              const duplicateFlag = getMemberDuplicateReview(duplicateReviewMap, "draft", draft.id);
                              return duplicateFlag ? (
                                <div className="mt-1">
                                  <DuplicateReviewBadge
                                    flag={duplicateFlag}
                                    label={t.membersPage.duplicateReviewBadge}
                                    tooltipTitle={t.membersPage.duplicateReviewTooltip}
                                    reasonLabels={duplicateReviewReasonLabels}
                                  />
                                </div>
                              ) : null;
                            })()}
                            {(() => {
                              const master = masterRecordFromDraft(draft.master_data, draft.name || "");
                              const hhGroup = findHouseholdGroupForMember(
                                rosterHouseholdDiscountGroups,
                                householdRefFromMasterLike(draft.id, draft.email || "", master ?? {}),
                              );
                              return master?.household_discount_status === "pending_verification" && hhGroup?.eligibleForFamilyDiscount ? (
                                <div className="mt-1">
                                  <HouseholdDiscountBadge
                                    group={hhGroup}
                                    label={t.membersPage.householdDiscountBadge}
                                    tooltip={t.membersPage.householdDiscountTooltip}
                                  />
                                </div>
                              ) : null;
                            })()}
                            {isSearchActive ? (
                              <div className="flex flex-wrap gap-1 mt-1.5">
                                {collectDraftSearchMatchFields(trimmedSearch, draft).map((field) => (
                                  <Badge key={field} variant="secondary" className="text-[10px] font-normal px-2 py-0">
                                    {getSearchMatchFieldLabel(field)}
                                  </Badge>
                                ))}
                              </div>
                            ) : null}
                          </div>
                        </div>
                        <div
                          className="flex flex-wrap items-center justify-end gap-2"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <span
                            className={cn(
                              savedMemberListRowChipClass,
                              draft.status === "invited"
                                ? "bg-emerald-500/10 text-emerald-400"
                                : "bg-muted text-muted-foreground",
                            )}
                          >
                            {draft.status === "invited" ? t.membersPage.invited : t.membersPage.draft}
                          </span>
                          {draft.status === "draft" ? (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              disabled={draftActionId === draft.id}
                              onClick={() => void handleSendInviteForDraft(draft)}
                              className={savedMemberListRowChipClass}
                            >
                              {draftActionId === draft.id ? (
                                <Loader2 className="animate-spin" />
                              ) : (
                                <Link2 />
                              )}
                              {t.membersPage.sendInvite}
                            </Button>
                          ) : null}
                          {draft.status === "invited" ? (
                            getInvitedDraftPrimaryAction(draft) === "open_roster" ? (
                              <Button
                                type="button"
                                size="sm"
                                variant="secondary"
                                disabled={draftActionId === draft.id}
                                onClick={() => void handleOpenRosterFromDraft(draft)}
                                className={savedMemberListRowChipClass}
                              >
                                {draftActionId === draft.id ? (
                                  <Loader2 className="animate-spin" />
                                ) : (
                                  <Users />
                                )}
                                {t.membersPage.openInRoster}
                              </Button>
                            ) : (
                              <Button
                                type="button"
                                size="sm"
                                variant="secondary"
                                disabled={draftActionId === draft.id}
                                onClick={() => void handleResendInviteForDraft(draft)}
                                className={savedMemberListRowChipClass}
                              >
                                {draftActionId === draft.id ? (
                                  <Loader2 className="animate-spin" />
                                ) : (
                                  <RefreshCw />
                                )}
                                {t.membersPage.resendInvite}
                              </Button>
                            )
                          ) : null}
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className={savedMemberListRowChipClass}
                            onClick={() =>
                              setHistoryPreview({
                                path: `/members/history/draft/${draft.id}`,
                                displayName: (draft.name?.trim() || draft.email || t.membersPage.noEmail).trim(),
                                email: draft.email,
                                detailLine: [
                                  getRoleLabel(draft.role),
                                  draft.team?.trim() || null,
                                  draft.age_group?.trim() || null,
                                  draft.status === "invited" ? t.membersPage.invited : t.membersPage.draft,
                                ]
                                  .filter(Boolean)
                                  .join(" · "),
                              })
                            }
                          >
                            <History />
                            {t.membersPage.history}
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            disabled={draftActionId === draft.id}
                            onClick={() => handleDeleteDraft(draft.id)}
                            className={cn(savedMemberListRowChipClass, "text-muted-foreground hover:text-foreground")}
                          >
                            {t.common.remove}
                          </Button>
                        </div>
                      </div>
                    )
                  ))}
                  {savedDraftsPreviewApplicable && !showAllDrafts && !isSearchActive ? (
                    <button type="button" className="text-[11px] text-primary hover:underline pt-1" onClick={() => setShowAllDrafts(true)}>
                      {t.membersPage.savedMemberListMore.replace(
                        "{count}",
                        String(savedDraftsForDisplay.length - SAVED_MEMBER_LIST_PREVIEW_COUNT),
                      )}
                    </button>
                  ) : null}
                </div>
              )}
            </div>

            <div className="rounded-xl bg-card border border-border overflow-hidden">
              {rosterForDisplay.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground text-sm">
                  {members.length === 0 ? t.membersPage.noMembersYet : t.membersPage.noMembersFound}
                </div>
              ) : (
                <>
                <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/20">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {loading ? <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-primary" aria-hidden /> : null}
                    {rosterForDisplay.length} match{rosterForDisplay.length === 1 ? "" : "es"} on this page ·{" "}
                    {membersDbTotalCount != null
                      ? `database page ${membersServerPage}/${membersServerTotalPages} (${membersDbTotalCount} in filter)`
                      : `page ${membersServerPage}`}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-7 px-2 text-xs"
                      disabled={membersServerPage <= 1}
                      onClick={() => setMembersServerPage((p) => Math.max(1, p - 1))}
                    >
                      Previous
                    </Button>
                    <span className="text-xs text-muted-foreground">
                      {membersServerPage}/{membersServerTotalPages}
                    </span>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-7 px-2 text-xs"
                      disabled={membersServerPage >= membersServerTotalPages}
                      onClick={() => setMembersServerPage((p) => Math.min(membersServerTotalPages, p + 1))}
                    >
                      Next
                    </Button>
                  </div>
                </div>
                {rosterForDisplay.map((member, i) => {
                  const isOpen = selectedMember?.id === member.id;
                  const rosterGuardianRole =
                    memberPanelEditModeId === member.id ? editMemberForm.role : member.role;
                  return (
                    <Fragment key={member.id}>
                      <motion.div
                        id={`roster-member-${member.id}`}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: i * 0.03 }}
                        onClick={() =>
                          setSelectedMember((cur) => {
                            if (cur?.id === member.id) {
                              setMemberPanelEditModeId(null);
                              setMemberMasterEditDraft({});
                              setSharedContactFilterEmail(null);
                              return null;
                            }
                            if (cur && cur.id !== member.id) {
                              setMemberPanelEditModeId(null);
                              setMemberMasterEditDraft({});
                            }
                            return member;
                          })
                        }
                        className={`px-4 py-3 border-b border-border cursor-pointer hover:bg-muted/50 transition-colors ${
                          isOpen ? "bg-muted/50 border-b-0" : ""
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-9 h-9 rounded-lg bg-gradient-gold flex items-center justify-center text-primary-foreground font-bold text-sm shrink-0 overflow-hidden">
                              {masterByMembershipId[member.id]?.photo_url || member.profiles?.avatar_url ? (
                                <img
                                  src={masterByMembershipId[member.id]?.photo_url || member.profiles?.avatar_url || ""}
                                  alt=""
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                (getMemberRosterName(member) || "?").split(" ").map((n) => n[0]).join("").slice(0, 2)
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="text-sm font-medium text-foreground truncate">{getMemberRosterName(member)}</div>
                              <div className="text-xs text-muted-foreground flex flex-wrap items-center gap-1.5">
                                <span>{getMemberTeamLabel(member)}</span>
                                {membershipEmails[member.id] ? (
                                  <span className="text-xs opacity-80">· {membershipEmails[member.id]}</span>
                                ) : null}
                                {membershipEmails[member.id] &&
                                getSharedContactGroup(sharedContactGroups, membershipEmails[member.id]) ? (
                                  <SharedContactEmailBadge
                                    group={getSharedContactGroup(sharedContactGroups, membershipEmails[member.id])!}
                                    label={t.membersPage.sharedContactBadge}
                                    tooltipTitle={t.membersPage.sharedContactTooltip}
                                  />
                                ) : null}
                                {(() => {
                                  const duplicateFlag = getMemberDuplicateReview(
                                    duplicateReviewMap,
                                    "roster",
                                    member.id,
                                  );
                                  return duplicateFlag ? (
                                    <DuplicateReviewBadge
                                      flag={duplicateFlag}
                                      label={t.membersPage.duplicateReviewBadge}
                                      tooltipTitle={t.membersPage.duplicateReviewTooltip}
                                      reasonLabels={duplicateReviewReasonLabels}
                                    />
                                  ) : null;
                                })()}
                                {(() => {
                                  const master = masterByMembershipId[member.id];
                                  const hhGroup = findHouseholdGroupForMember(
                                    rosterHouseholdDiscountGroups,
                                    householdRefFromMasterLike(
                                      member.id,
                                      membershipEmails[member.id] || "",
                                      master ?? {},
                                      { membershipId: member.id },
                                    ),
                                  );
                                  return master?.household_discount_status === "pending_verification" &&
                                    hhGroup?.eligibleForFamilyDiscount ? (
                                    <HouseholdDiscountBadge
                                      group={hhGroup}
                                      label={t.membersPage.householdDiscountBadge}
                                      tooltip={t.membersPage.householdDiscountTooltip}
                                    />
                                  ) : null;
                                })()}
                                {isSearchActive
                                  ? collectRosterSearchMatchFields(
                                      rosterSearchQuery,
                                      member,
                                      masterByMembershipId[member.id],
                                      membershipEmails[member.id],
                                    ).map((field) => (
                                      <Badge key={field} variant="outline" className="text-[10px] font-normal px-1.5 py-0 h-5">
                                        {getSearchMatchFieldLabel(field)}
                                      </Badge>
                                    ))
                                  : null}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <RosterPillTooltip tip={t.membersPage.completenessTooltip}>
                              <span
                                className={cn(
                                  badgeVariants({ variant: "secondary" }),
                                  "h-6 px-2.5 py-0.5 text-xs font-normal",
                                )}
                              >
                                {masterRecordCompletenessPct(masterByMembershipId[member.id], member.role)}%
                              </span>
                            </RosterPillTooltip>
                            {masterByMembershipId[member.id]?.membership_kind === "supporting_member" ? (
                              <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-violet-500/10 text-violet-300">
                                {t.membersPage.supportingMember}
                              </span>
                            ) : null}
                            <RosterPillTooltip tip={getRoleTooltip(member.role)}>
                              <span
                                className={cn(
                                  "rounded-full px-2.5 py-1 text-xs font-medium",
                                  roleColors[member.role] || "bg-muted text-muted-foreground",
                                )}
                              >
                                {getRoleLabel(member.role)}
                              </span>
                            </RosterPillTooltip>
                            {masterByMembershipId[member.id]?.internal_club_number ? (
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  setClubPassModalMember(member);
                                }}
                                className="inline-flex items-center gap-1 rounded-full border border-primary/25 bg-primary/5 px-2.5 py-1 text-xs font-mono font-semibold text-primary transition-colors hover:bg-primary/10"
                                title={t.membersPage.clubPassOpenHint}
                              >
                                <IdCard className="h-3.5 w-3.5 shrink-0" />
                                {String(masterByMembershipId[member.id]?.internal_club_number)}
                              </button>
                            ) : null}
                            <RosterPillTooltip
                              tip={
                                member.status === "active"
                                  ? t.membersPage.statusActiveTooltip
                                  : t.membersPage.statusInactiveTooltip
                              }
                            >
                              <span
                                className={cn(
                                  "rounded-full px-2.5 py-1 text-xs font-medium",
                                  member.status === "active"
                                    ? "bg-emerald-500/10 text-emerald-400"
                                    : "bg-muted text-muted-foreground",
                                )}
                              >
                                {member.status === "active" ? t.common.active : member.status}
                              </span>
                            </RosterPillTooltip>
                          </div>
                        </div>
                      </motion.div>

                      {isOpen && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="border-b border-border bg-card border-t border-primary/20"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="w-full min-w-0 overflow-x-hidden space-y-3 px-4 pb-4 pt-3 sm:px-5">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-muted-foreground min-w-0">
                                {member.profiles?.phone ? (
                                  <div className="flex items-center gap-2">
                                    <Phone className="w-4 h-4 shrink-0" /> {member.profiles.phone}
                                  </div>
                                ) : null}
                                <div className="flex items-center gap-2">
                                  <Calendar className="w-4 h-4 shrink-0" /> {t.membersPage.joined}{" "}
                                  {new Date(member.created_at).toLocaleDateString()}
                                </div>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <Button variant="outline" size="sm" className="h-9 rounded-lg text-xs" asChild>
                                  <Link
                                    to={`/co-trainer?tab=chat&prompt=${encodeURIComponent(
                                      t.membersPage.askAi4TeamPrompt.replace("{name}", getMemberRosterName(member)),
                                    )}&context=${encodeURIComponent(
                                      JSON.stringify({
                                        source: "members",
                                        membershipId: member.id,
                                        displayName: getMemberRosterName(member),
                                        role: member.role,
                                        team: member.team,
                                        position: member.position,
                                        status: member.status,
                                      }),
                                    )}`}
                                  >
                                    <BrandedText text={t.membersPage.askAi4Team} />
                                  </Link>
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-9 w-9 rounded-lg"
                                  onClick={closeRosterMemberPanel}
                                  aria-label={t.common.close}
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>

                            {(() => {
                              const email = membershipEmails[member.id];
                              const group = email ? getSharedContactGroup(sharedContactGroups, email) : undefined;
                              if (!group) return null;
                              return (
                                <SharedContactAccountsPanel
                                  group={group}
                                  currentId={member.id}
                                  labels={{
                                    title: t.membersPage.sharedContactAccountsTitle,
                                    current: t.membersPage.sharedContactAccountsCurrent,
                                    showAll: t.membersPage.sharedContactFilterShowAll,
                                    openMember: t.membersPage.sharedContactOpenMember,
                                    importPreview: t.membersPage.sharedContactImportPreview,
                                  }}
                                  duplicateMemberKeys={duplicateReviewKeys}
                                  duplicateWarning={t.membersPage.duplicateReviewPanelWarning}
                                  onShowAll={(email) => applySharedContactFilter(email)}
                                  onOpenMember={(linkedMember) => applySharedContactFilter(group.email, linkedMember)}
                                />
                              );
                            })()}

                            {memberPanelEditModeId === member.id && canManageMembers ? (
                              <div className="space-y-3 rounded-lg border border-primary/25 bg-muted/5 p-3">
                                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                  <Select
                                    value={editMemberForm.role}
                                    onValueChange={(value) => setEditMemberForm((previous) => ({ ...previous, role: value }))}
                                  >
                                    <SelectTrigger className="h-10 w-full rounded-xl border-border bg-background/60 text-sm">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {MEMBERSHIP_ROLE_SELECT_ORDER.map((role) => (
                                        <SelectItem key={role} value={role}>
                                          {getRoleLabel(role)}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  <Select
                                    value={editMemberForm.status}
                                    onValueChange={(value) => setEditMemberForm((previous) => ({ ...previous, status: value }))}
                                  >
                                    <SelectTrigger className="h-10 w-full rounded-xl border-border bg-background/60 text-sm">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="active">{t.common.active}</SelectItem>
                                      <SelectItem value="inactive">{t.common.inactive}</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                <MemberTeamAssignmentField
                                  teams={clubTeams}
                                  selectedTeamIds={editMemberTeamIds}
                                  labels={teamAssignmentLabels}
                                  onChange={(ids) => {
                                    setEditMemberTeamIds(ids);
                                    const names = clubTeamNamesFromIds(clubTeams, ids);
                                    setEditMemberForm((previous) => ({
                                      ...previous,
                                      team: names.join(", ") || previous.team,
                                      ageGroup:
                                        previous.ageGroup.trim() ||
                                        (ids.length === 1
                                          ? clubTeams.find((team) => team.id === ids[0])?.age_group || ""
                                          : previous.ageGroup),
                                    }));
                                  }}
                                />
                                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                                  <div>
                                    <div className="mb-1 text-xs text-muted-foreground">
                                      {t.membersPage.draftEditLabelTeam}
                                    </div>
                                    <Input
                                      value={editMemberForm.team}
                                      onChange={(event) =>
                                        setEditMemberForm((previous) => ({
                                          ...previous,
                                          team: event.target.value,
                                        }))
                                      }
                                      placeholder={t.membersPage.teamPlaceholder}
                                      className="h-10 bg-background/60"
                                    />
                                  </div>
                                  <div>
                                    <div className="mb-1 text-xs text-muted-foreground">
                                      {t.membersPage.draftEditLabelAgeGroup}
                                    </div>
                                    <Input
                                      value={editMemberForm.ageGroup}
                                      onChange={(event) =>
                                        setEditMemberForm((previous) => ({
                                          ...previous,
                                          ageGroup: event.target.value,
                                        }))
                                      }
                                      placeholder={t.membersPage.ageGroupPlaceholder}
                                      className="h-10 bg-background/60"
                                    />
                                  </div>
                                  <div>
                                    <div className="mb-1 text-xs text-muted-foreground">
                                      {t.membersPage.draftEditLabelPosition}
                                    </div>
                                    <Input
                                      value={editMemberForm.position}
                                      onChange={(event) =>
                                        setEditMemberForm((previous) => ({
                                          ...previous,
                                          position: event.target.value,
                                        }))
                                      }
                                      placeholder={t.membersPage.positionPlaceholder}
                                      className="h-10 bg-background/60"
                                    />
                                  </div>
                                </div>
                              </div>
                            ) : null}

                            <div className="w-full min-w-0 overflow-x-hidden rounded-lg border border-border/40 bg-muted/10 p-3 max-lg:p-4">
                              <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
                                <UserCircle2 className="w-4 h-4 text-primary" /> {t.membersPage.masterDataFields}
                              </div>
                              <MasterDataTabs
                                values={
                                  memberPanelEditModeId === member.id
                                    ? {
                                        ...(masterByMembershipId[member.id] ?? {}),
                                        ...memberMasterEditDraft,
                                      }
                                    : (masterByMembershipId[member.id] ?? {})
                                }
                                labels={masterTabLabels}
                                readOnly={memberPanelEditModeId !== member.id}
                                compact
                                displayName={
                                  memberPanelEditModeId === member.id
                                    ? buildDisplayNameFromParts(
                                        String(memberMasterEditDraft.first_name ?? "").trim(),
                                        String(memberMasterEditDraft.last_name ?? "").trim(),
                                      ) ||
                                      getMemberRosterName(member)
                                    : getMemberRosterName(member)
                                }
                                clubName={clubName}
                                logoSrc={clubLogoUrl ?? ""}
                                membershipRole={getRoleLabel(
                                  memberPanelEditModeId === member.id ? editMemberForm.role : member.role,
                                )}
                                isPlayer={isPlayerRole(
                                  memberPanelEditModeId === member.id ? editMemberForm.role : member.role,
                                )}
                                teamLabel={
                                  memberPanelEditModeId === member.id
                                    ? clubTeamNamesFromIds(clubTeams, editMemberTeamIds).join(", ") ||
                                      editMemberForm.team.trim() ||
                                      editMemberForm.ageGroup.trim()
                                    : getMemberAssignedTeamNames(member)
                                }
                                email={membershipEmails[member.id] ?? null}
                                clubId={clubId}
                                membershipId={member.id}
                                profileAvatarUrl={member.profiles?.avatar_url ?? null}
                                avatarUpload={
                                  memberPanelEditModeId === member.id && canEditMemberMaster(member.id)
                                    ? {
                                        uploading: memberPanelAvatarUploading,
                                        onUpload: (file) => void uploadMemberPanelAvatar(member.id, file),
                                        onRemove: () =>
                                          setMemberMasterEditDraft((d) => ({
                                            ...d,
                                            photo_url: null,
                                            photo_uploaded_at: null,
                                          })),
                                      }
                                    : undefined
                                }
                                onChange={
                                  memberPanelEditModeId === member.id
                                    ? (key, value) =>
                                        setMemberMasterEditDraft((d) => ({
                                          ...d,
                                          [key]: value,
                                          ...(key === "photo_url"
                                            ? {
                                                photo_uploaded_at: value
                                                  ? (d.photo_uploaded_at ?? new Date().toISOString())
                                                  : null,
                                              }
                                            : {}),
                                        }))
                                    : undefined
                                }
                                safetyTabExtraEnabled={isPlayerRole(rosterGuardianRole)}
                                safetyTabExtra={renderGuardiansSafetyTabExtra(member, rosterGuardianRole)}
                                allowedFieldKeys={editableFieldKeysForActor(masterEditActorFor(member.id))}
                                allowedGroups={editableGroupsForActor(masterEditActorFor(member.id))}
                                hideClubNumberGenerator={!canManageMembers}
                              />
                            </div>

                            {memberPanelEditModeId !== member.id && (member.position || member.age_group) ? (
                              <div className="border-t border-border/60 pt-2">
                                <h4 className="mb-2 text-xs font-medium text-muted-foreground">{t.membersPage.playerAttributes}</h4>
                                <div className="grid max-w-md grid-cols-2 gap-2">
                                  {member.position ? (
                                    <div className="rounded-lg bg-muted/50 p-2">
                                      <div className="text-[10px] text-muted-foreground">{t.membersPage.position}</div>
                                      <div className="text-sm font-medium text-foreground">{member.position}</div>
                                    </div>
                                  ) : null}
                                  {member.age_group ? (
                                    <div className="rounded-lg bg-muted/50 p-2">
                                      <div className="text-[10px] text-muted-foreground">{t.membersPage.ageGroup}</div>
                                      <div className="text-sm font-medium text-foreground">{member.age_group}</div>
                                    </div>
                                  ) : null}
                                </div>
                              </div>
                            ) : null}

                            <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:items-center">
                              {memberPanelSaveConfirmedId === member.id ? (
                                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-400 sm:mr-auto">
                                  <Check className="h-3.5 w-3.5" />
                                  {t.membersPage.masterDataSavedHint}
                                </span>
                              ) : null}
                              {memberPanelEditModeId === member.id ? (
                                <>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-11 w-full sm:h-9 sm:flex-1"
                                    disabled={memberPanelSaving}
                                    onClick={cancelMemberPanelEdit}
                                  >
                                    {t.common.cancel}
                                  </Button>
                                  <Button
                                    size="sm"
                                    type="button"
                                    className="h-11 w-full bg-gradient-gold-static font-semibold text-primary-foreground hover:brightness-110 sm:h-9 sm:flex-1"
                                    disabled={memberPanelSaving}
                                    onClick={() => void saveMemberPanelInline(member)}
                                  >
                                    {memberPanelSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                    {t.common.save}
                                  </Button>
                                </>
                              ) : canEditMemberMaster(member.id) ? (
                                <>
                                  <Button
                                    size="sm"
                                    className="w-full bg-gradient-gold-static font-semibold text-primary-foreground hover:brightness-110 sm:flex-1"
                                    onClick={() => setShowMasterDialog(true)}
                                  >
                                    <IdCard className="mr-2 h-4 w-4" /> {t.membersPage.openFullRegistry}
                                  </Button>
                                  {canAccessMembersPage ? (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="w-full sm:flex-1"
                                      onClick={() =>
                                        setHistoryPreview({
                                          path: `/members/history/${member.id}`,
                                          displayName: getMemberRosterName(member),
                                          email: membershipEmails[member.id] ?? null,
                                          detailLine: [getRoleLabel(member.role), getMemberTeamLabel(member)]
                                            .filter((s) => s && String(s).trim())
                                            .join(" · "),
                                        })
                                      }
                                    >
                                      <History className="mr-2 h-4 w-4" /> {t.membersPage.activityLog}
                                    </Button>
                                  ) : null}
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="sm:flex-1"
                                    onClick={() => startMemberPanelEdit(member)}
                                  >
                                    {t.common.edit}
                                  </Button>
                                  {canManageMembers ? (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="sm:flex-1 border-accent/30 text-accent hover:bg-accent/10"
                                    onClick={() => handleDeleteMember(member.id)}
                                  >
                                    {t.common.remove}
                                  </Button>
                                  ) : null}
                                </>
                              ) : null}
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </Fragment>
                  );
                })}
                </>
              )}
            </div>
              </MembersRosterPanel>
              )
            ) : (
              <MembersInvitesPanel>
                {!canReviewJoinRequests ? (
                  <div className="rounded-xl bg-card border border-border p-8 text-center">
                    <h2 className="font-display text-lg font-bold text-foreground mb-2">{t.membersPage.invitesTabRestrictedTitle}</h2>
                    <p className="text-muted-foreground">{t.membersPage.invitesTabRestrictedDesc}</p>
                  </div>
                ) : invitesLoading ? (
                  <div className="flex items-center justify-center py-20">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="rounded-2xl border border-border/70 bg-card/55 backdrop-blur-xl p-5 shadow-[0_10px_30px_rgba(0,0,0,0.10)]">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                          <div className="text-sm font-display font-bold text-foreground tracking-tight flex items-center gap-2">
                            <UserPlus className="w-4 h-4 text-primary" /> {t.membersPage.createInviteTitle}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {t.membersPage.createInvitePageDesc}
                          </div>
                        </div>
                        <Button
                          className="w-full shrink-0 bg-gradient-gold-static font-semibold text-primary-foreground hover:brightness-110 sm:w-auto"
                          onClick={openCreateInvite}
                        >
                          <UserPlus className="w-4 h-4 mr-2" /> {t.membersPage.createInvite}
                        </Button>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-border/70 bg-card/55 backdrop-blur-xl p-5 shadow-[0_10px_30px_rgba(0,0,0,0.10)]">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <div className="text-sm font-display font-bold text-foreground tracking-tight flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4 text-primary" /> {t.membersPage.abuseAuditTitle}
                          </div>
                          <div className="text-xs text-muted-foreground">{t.membersPage.abuseAuditDesc}</div>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => void fetchAbuseAudit()} disabled={abuseAuditLoading}>
                          {t.common.refresh}
                        </Button>
                      </div>

                      {abuseAuditLoading ? (
                        <div className="flex items-center justify-center py-6">
                          <Loader2 className="w-5 h-5 animate-spin text-primary" />
                        </div>
                      ) : abuseAudit.length === 0 ? (
                        <div className="text-sm text-muted-foreground py-4">{t.membersPage.abuseAuditEmpty}</div>
                      ) : (
                        <div className="grid sm:grid-cols-2 gap-3">
                          {abuseAudit.map((entry) => (
                            <div key={entry.action} className="rounded-xl border border-border/60 bg-background/40 p-4">
                              <div className="text-xs font-medium text-foreground">
                                {entry.action === "public_invite_request"
                                  ? t.membersPage.abuseAuditInviteAction
                                  : t.membersPage.abuseAuditJoinAction}
                              </div>
                              <div className="mt-2 grid grid-cols-2 gap-2 text-[11px]">
                                <div className="rounded-lg bg-muted/40 px-2 py-1.5">
                                  <div className="text-muted-foreground">{t.membersPage.abuseAuditTotal}</div>
                                  <div className="font-semibold text-foreground">{entry.total_attempts}</div>
                                </div>
                                <div className="rounded-lg bg-muted/40 px-2 py-1.5">
                                  <div className="text-muted-foreground">{t.membersPage.abuseAuditBlocked}</div>
                                  <div className="font-semibold text-foreground">{entry.blocked_attempts}</div>
                                </div>
                                <div className="rounded-lg bg-muted/40 px-2 py-1.5">
                                  <div className="text-muted-foreground">{t.membersPage.abuseAuditUniqueIds}</div>
                                  <div className="font-semibold text-foreground">{entry.unique_identifiers}</div>
                                </div>
                                <div className="rounded-lg bg-muted/40 px-2 py-1.5">
                                  <div className="text-muted-foreground">{t.membersPage.abuseAuditDevices}</div>
                                  <div className="font-semibold text-foreground">{entry.unique_devices}</div>
                                </div>
                              </div>
                              <div className="mt-2 text-[10px] text-muted-foreground">
                                {t.membersPage.abuseAuditLastAttempt}:{" "}
                                {entry.last_attempt_at ? new Date(entry.last_attempt_at).toLocaleString() : "-"}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="rounded-2xl border border-border/70 bg-card/55 backdrop-blur-xl p-5 shadow-[0_10px_30px_rgba(0,0,0,0.10)]">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <div className="text-sm font-display font-bold text-foreground tracking-tight flex items-center gap-2">
                            <Shield className="w-4 h-4 text-primary" /> {t.membersPage.abuseAlertsTitle}
                          </div>
                          <div className="text-xs text-muted-foreground">{t.membersPage.abuseAlertsDesc}</div>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => void fetchAbuseAlerts()} disabled={abuseAlertsLoading}>
                          {t.common.refresh}
                        </Button>
                      </div>

                      {abuseAlertsLoading ? (
                        <div className="flex items-center justify-center py-6">
                          <Loader2 className="w-5 h-5 animate-spin text-primary" />
                        </div>
                      ) : abuseAlerts.length === 0 ? (
                        <div className="text-sm text-muted-foreground py-4">{t.membersPage.abuseAlertsEmpty}</div>
                      ) : (
                        <div className="space-y-3">
                          {abuseAlerts.map((entry) => (
                            <div key={entry.id} className="rounded-xl border border-border/60 bg-background/40 p-4">
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <div className="text-xs font-medium text-foreground">
                                    {entry.action === "public_invite_request"
                                      ? t.membersPage.abuseAuditInviteAction
                                      : t.membersPage.abuseAuditJoinAction}
                                  </div>
                                  <div className="text-[11px] text-muted-foreground mt-0.5">{entry.reason}</div>
                                </div>
                                <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                                  entry.severity === "high"
                                    ? "bg-red-500/15 text-red-300"
                                    : entry.severity === "medium"
                                      ? "bg-amber-500/15 text-amber-300"
                                      : "bg-primary/10 text-primary"
                                }`}>
                                  {entry.severity}
                                </span>
                              </div>
                              <div className="mt-2 text-[11px] text-muted-foreground flex flex-wrap items-center gap-3">
                                <span>{t.membersPage.abuseAlertsBlocked}: {entry.blocked_count}</span>
                                <span>{t.membersPage.abuseAlertsTotal}: {entry.total_count}</span>
                                <span>{t.membersPage.abuseAuditLastAttempt}: {new Date(entry.last_seen_at).toLocaleString()}</span>
                              </div>
                              <div className="mt-3 flex justify-end">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  disabled={resolvingAlertId === entry.id}
                                  onClick={() => void handleResolveAbuseAlert(entry.id)}
                                >
                                  {resolvingAlertId === entry.id ? (
                                    <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> {t.membersPage.resolvingAlert}</>
                                  ) : (
                                    t.membersPage.resolveAlert
                                  )}
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="grid lg:grid-cols-2 gap-6">
                    {/* Invite requests */}
                    <div className="rounded-2xl border border-border/70 bg-card/55 backdrop-blur-xl p-5 shadow-[0_10px_30px_rgba(0,0,0,0.10)]">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <div className="text-sm font-display font-bold text-foreground tracking-tight flex items-center gap-2">
                            <Inbox className="w-4 h-4 text-primary" /> {t.membersPage.inviteRequests}
                          </div>
                          <div className="text-xs text-muted-foreground">{t.membersPage.approveHint}</div>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => fetchInvitesData()}>{t.common.refresh}</Button>
                      </div>

                      <div className="flex gap-2 mb-4">
                        {(["pending", "approved", "rejected", "all"] as const).map((s) => (
                          <button
                            key={s}
                            onClick={() => setInviteReqFilter(s)}
                            className={`text-xs font-medium px-3 py-1.5 rounded-full whitespace-nowrap transition-colors border ${
                              inviteReqFilter === s
                                ? "bg-primary text-primary-foreground border-primary"
                                : "bg-card/40 border-border/60 text-muted-foreground hover:text-foreground"
                            }`}
                          >
                            {s === "all" ? t.common.all : s.charAt(0).toUpperCase() + s.slice(1)}
                          </button>
                        ))}
                      </div>

                      {inviteRequests.filter((r) => inviteReqFilter === "all" || r.status === inviteReqFilter).length === 0 ? (
                        <div className="text-sm text-muted-foreground py-8 text-center">{inviteReqFilter === "all" ? t.membersPage.noRequestsAll : t.membersPage.noRequests.replace("{status}", inviteReqFilter === "pending" ? t.common.pending : inviteReqFilter === "approved" ? t.common.approved : t.common.rejected)}</div>
                      ) : (
                        <div className="space-y-3">
                          {inviteRequests
                            .filter((r) => inviteReqFilter === "all" || r.status === inviteReqFilter)
                            .map((r) => (
                            <div key={r.id} className="p-4 rounded-2xl border border-border/60 bg-background/40 backdrop-blur-xl">
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <div className="text-sm font-medium text-foreground truncate">{r.name}</div>
                                  <div className="text-xs text-muted-foreground truncate">{r.email}</div>
                                </div>
                                <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                                  r.status === "pending" ? "bg-primary/10 text-primary" : r.status === "approved" ? "bg-emerald-500/10 text-emerald-400" : "bg-muted text-muted-foreground"
                                }`}>{r.status}</span>
                              </div>
                              {(r.interested_role || r.interested_team || r.phone || r.source) ? (
                                <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                                  {r.source === "public_club_page" ? (
                                    <span>
                                      <span className="text-foreground/70">{t.membersPage.joinRequestSourceLabel}</span>
                                      {": "}
                                      {t.membersPage.joinRequestSourcePublicClub}
                                    </span>
                                  ) : null}
                                  {r.interested_role ? (
                                    <span>
                                      <span className="text-foreground/70">{t.membersPage.joinRequestInterest}</span>
                                      {": "}
                                      {joinVisitorInterestLabel(r.interested_role, t.clubPage)}
                                    </span>
                                  ) : null}
                                  {r.interested_team ? (
                                    <span className="truncate max-w-[200px]" title={r.interested_team}>
                                      Team: {r.interested_team}
                                    </span>
                                  ) : null}
                                  {r.phone ? (
                                    <span>
                                      {t.membersPage.joinRequestPhone}: {r.phone}
                                    </span>
                                  ) : null}
                                </div>
                              ) : null}
                              {r.message && <div className="text-xs text-muted-foreground mt-2 leading-relaxed">{r.message}</div>}
                              {r.status === "pending" ? (
                                <div className="mt-3 space-y-3 rounded-xl border border-border/50 bg-muted/20 p-3">
                                  <div className="grid gap-3 sm:grid-cols-2">
                                    <div className="space-y-1.5">
                                      <div className="text-[10px] font-medium text-muted-foreground">{t.membersPage.joinRequestAssignRole}</div>
                                      <Select
                                        value={joinRequestReviewById[r.id]?.role ?? clubJoinDefaults.role}
                                        onValueChange={(v) =>
                                          setJoinRequestReviewById((prev) => ({
                                            ...prev,
                                            [r.id]: {
                                              role: v,
                                              team: prev[r.id]?.team ?? clubJoinDefaults.team,
                                              note: prev[r.id]?.note ?? "",
                                            },
                                          }))
                                        }
                                      >
                                        <SelectTrigger className="h-9 text-xs">
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {SUPPORTED_ROLES.map((roleId) => (
                                            <SelectItem key={roleId} value={roleId} className="text-xs">
                                              {getRoleLabel(roleId)}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    </div>
                                    <div className="space-y-1.5">
                                      <div className="text-[10px] font-medium text-muted-foreground">{t.membersPage.joinRequestAssignTeam}</div>
                                      <Input
                                        className="h-9 text-xs"
                                        value={joinRequestReviewById[r.id]?.team ?? ""}
                                        onChange={(e) =>
                                          setJoinRequestReviewById((prev) => ({
                                            ...prev,
                                            [r.id]: {
                                              role: prev[r.id]?.role ?? clubJoinDefaults.role,
                                              team: e.target.value,
                                              note: prev[r.id]?.note ?? "",
                                            },
                                          }))
                                        }
                                        placeholder={t.membersPage.teamPlaceholder}
                                      />
                                    </div>
                                  </div>
                                  <div className="space-y-1.5">
                                    <div className="text-[10px] font-medium text-muted-foreground">{t.membersPage.joinRequestInternalNote}</div>
                                    <textarea
                                      className={cn(
                                        "flex min-h-[72px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-xs shadow-sm",
                                        "placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                                      )}
                                      value={joinRequestReviewById[r.id]?.note ?? ""}
                                      onChange={(e) =>
                                        setJoinRequestReviewById((prev) => ({
                                          ...prev,
                                          [r.id]: {
                                            role: prev[r.id]?.role ?? clubJoinDefaults.role,
                                            team: prev[r.id]?.team ?? "",
                                            note: e.target.value,
                                          },
                                        }))
                                      }
                                    />
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="secondary"
                                      className="h-8 text-xs"
                                      disabled={savingJoinNoteId === r.id}
                                      onClick={() => void handleSaveJoinRequestNote(r.id)}
                                    >
                                      {savingJoinNoteId === r.id ? (
                                        <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                                      ) : null}
                                      {t.membersPage.joinRequestSaveNote}
                                    </Button>
                                  </div>
                                </div>
                              ) : r.internal_note ? (
                                <div className="mt-2 rounded-lg border border-border/40 bg-muted/15 px-2 py-1.5 text-[11px] text-muted-foreground">
                                  <span className="font-medium text-foreground/80">{t.membersPage.joinRequestInternalNote}: </span>
                                  {r.internal_note}
                                </div>
                              ) : null}
                              <div className="flex items-center justify-between mt-3">
                                <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                                  <Clock className="w-3 h-3" /> {new Date(r.created_at).toLocaleString()}
                                </div>
                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    disabled={r.status !== "pending"}
                                    onClick={() => handleUpdateInviteRequestStatus(r.id, "rejected")}
                                  >
                                    {t.membersPage.reject}
                                  </Button>
                                  <Button
                                    size="sm"
                                    className="bg-gradient-gold-static text-primary-foreground hover:brightness-110"
                                    disabled={r.status !== "pending"}
                                    onClick={() => void handleApproveInviteRequest(r)}
                                  >
                                    {t.membersPage.approve}
                                  </Button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Invites */}
                    <div className="rounded-2xl border border-border/70 bg-card/55 backdrop-blur-xl p-5 shadow-[0_10px_30px_rgba(0,0,0,0.10)]">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
                        <div>
                          <div className="text-sm font-display font-bold text-foreground tracking-tight flex items-center gap-2">
                            <Link2 className="w-4 h-4 text-primary" /> {t.membersPage.activeInvites}
                          </div>
                          <div className="text-xs text-muted-foreground">{t.membersPage.tokensHashedHint}</div>
                        </div>
                        <Button
                          size="sm"
                          className="w-full shrink-0 bg-gradient-gold-static font-semibold text-primary-foreground hover:brightness-110 sm:w-auto"
                          onClick={openCreateInvite}
                        >
                          <UserPlus className="w-4 h-4 mr-1" /> {t.membersPage.createInvite}
                        </Button>
                      </div>

                      {invites.length === 0 ? (
                        <div className="py-8 text-center space-y-3">
                          <p className="text-sm text-muted-foreground">{t.membersPage.noInvitesYet}</p>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={openCreateInvite}
                          >
                            <UserPlus className="w-4 h-4 mr-1" /> {t.membersPage.createInvite}
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {invites.map((inv) => (
                            <div key={inv.id} className="p-4 rounded-2xl border border-border/60 bg-background/40 backdrop-blur-xl">
                              <div className="flex items-center justify-between gap-3">
                                <div className="min-w-0">
                                  <div className="text-sm font-medium text-foreground truncate">{inv.email || t.membersPage.noEmail}</div>
                                  <div className="text-xs text-muted-foreground">{t.onboarding.role}: {getRoleLabel(inv.role)}</div>
                                </div>
                                <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                                  inv.used_at ? "bg-emerald-500/10 text-emerald-400" : "bg-primary/10 text-primary"
                                }`}>{inv.used_at ? t.common.used : t.common.unused}</span>
                              </div>
                              <div className="flex items-center justify-between mt-3 text-[10px] text-muted-foreground">
                                <span>{t.membersPage.created} {new Date(inv.created_at).toLocaleDateString()}</span>
                                <span>{inv.expires_at ? `${t.membersPage.expires} ${new Date(inv.expires_at).toLocaleDateString()}` : t.membersPage.noExpiry}</span>
                              </div>
                              <div className="mt-3 flex justify-end">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  disabled={!canRevokeInvite(inv)}
                                  onClick={async () => {
                                    if (!clubId) return;
                                    const { error } = await supabase
                                      .from("club_invites")
                                      .delete()
                                      .eq("club_id", clubId)
                                      .eq("id", inv.id);
                                    if (error) {
                                      toast({ title: "Error", description: error.message, variant: "destructive" });
                                      return;
                                    }
                                    setInvites((prev) => prev.filter((x) => x.id !== inv.id));
                                    toast({ title: t.membersPage.inviteRevoked });
                                  }}
                                  className="h-7 text-[10px]"
                                >
                                  {t.membersPage.revoke}
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    </div>
                  </div>
                )}

                {/* Create Invite Modal */}
                {showCreateInvite && (
                  <div className="fixed inset-0 z-50 bg-background/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowCreateInvite(false)}>
                    <motion.div
                      initial={{ opacity: 0, scale: 0.98, y: 6 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      className="w-full max-w-md rounded-3xl border border-border/60 bg-card/60 backdrop-blur-2xl p-6 shadow-[0_20px_60px_rgba(0,0,0,0.22)]"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="font-display font-bold text-foreground tracking-tight">{t.membersPage.createInviteTitle}</h3>
                          <p className="text-xs text-muted-foreground">{t.membersPage.createInviteDesc}</p>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => setShowCreateInvite(false)}>
                          <X className="w-4 h-4" />
                        </Button>
                      </div>

                      <div className="space-y-3">
                        <Input
                          placeholder={t.membersPage.emailOptional}
                          value={inviteEmail}
                          onChange={(e) => setInviteEmail(e.target.value)}
                          className="bg-background/60"
                          maxLength={254}
                        />

                        <div className="grid grid-cols-2 gap-2">
                          <Select value={inviteRole} onValueChange={setInviteRole}>
                            <SelectTrigger className="h-10 rounded-xl border-border bg-background/60 text-sm">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl border-border/70 bg-card/95 backdrop-blur-2xl">
                              {MEMBERSHIP_ROLE_SELECT_ORDER.map((role) => (
                                <SelectItem key={role} value={role} className="rounded-lg">
                                  {getRoleLabel(role)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Select value={inviteDays} onValueChange={setInviteDays}>
                            <SelectTrigger className="h-10 rounded-xl border-border bg-background/60 text-sm">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl border-border/70 bg-card/95 backdrop-blur-2xl">
                              <SelectItem value="1" className="rounded-lg">{t.membersPage.day1}</SelectItem>
                              <SelectItem value="3" className="rounded-lg">{t.membersPage.days3}</SelectItem>
                              <SelectItem value="7" className="rounded-lg">{t.membersPage.days7}</SelectItem>
                              <SelectItem value="14" className="rounded-lg">{t.membersPage.days14}</SelectItem>
                              <SelectItem value="0" className="rounded-lg">{t.membersPage.noExpiryOption}</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <Button
                          onClick={() => handleCreateInvite()}
                          className="w-full bg-gradient-gold-static text-primary-foreground hover:brightness-110"
                        >
                          <UserPlus className="w-4 h-4 mr-2" /> {t.membersPage.createToken}
                        </Button>

                        {createdInviteToken && (
                          <div className="mt-2 p-4 rounded-2xl border border-border/60 bg-background/40">
                            <div className="text-[10px] text-muted-foreground mb-1">{t.membersPage.inviteTokenLabel}</div>
                            <div className="font-mono text-xs text-foreground break-all">{createdInviteToken}</div>
                            <div className="mt-3 grid gap-2">
                              <Button
                                variant="outline"
                                onClick={() => handleCopy(createdInviteToken)}
                                className="w-full"
                              >
                                {copied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                                {copied ? t.membersPage.copied : t.membersPage.copyToken}
                              </Button>
                              <Button
                                variant="outline"
                                onClick={() => {
                                  const link = buildClubInviteLandingUrl({
                                    inviteToken: createdInviteToken,
                                    clubSlug,
                                    siteOrigin: window.location.origin,
                                  });
                                  void handleCopy(link);
                                }}
                                className="w-full"
                              >
                                {copied ? <Check className="w-4 h-4 mr-2" /> : <Link2 className="w-4 h-4 mr-2" />}
                                {t.membersPage.copyInviteLink}
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  </div>
                )}
              </MembersInvitesPanel>
            )}
          </>
        )}
      </div>

      {draftResendTokenModalOpen && draftResendInviteToken ? (
        <div
          className="fixed inset-0 z-50 bg-background/40 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => {
            setDraftResendTokenModalOpen(false);
            setDraftResendInviteToken(null);
          }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.98, y: 6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="w-full max-w-md rounded-3xl border border-border/60 bg-card/60 backdrop-blur-2xl p-6 shadow-[0_20px_60px_rgba(0,0,0,0.22)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-display font-bold text-foreground tracking-tight">
                  {draftInviteLinkModalVariant === "resend"
                    ? t.membersPage.resendInviteModalTitle
                    : t.membersPage.sendInviteModalTitle}
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  {draftInviteLinkModalVariant === "resend"
                    ? t.membersPage.resendInviteModalDesc
                    : t.membersPage.sendInviteModalDesc}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setDraftResendTokenModalOpen(false);
                  setDraftResendInviteToken(null);
                }}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="p-4 rounded-2xl border border-border/60 bg-background/40">
              <div className="text-[10px] text-muted-foreground mb-1">{t.membersPage.inviteTokenLabel}</div>
              <div className="font-mono text-xs text-foreground break-all">{draftResendInviteToken}</div>
              <div className="mt-3 grid gap-2">
                <Button
                  variant="outline"
                  onClick={() => handleCopy(draftResendInviteToken)}
                  className="w-full"
                >
                  {copied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                  {copied ? t.membersPage.copied : t.membersPage.copyToken}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    const link = buildClubInviteLandingUrl({
                      inviteToken: draftResendInviteToken,
                      clubSlug,
                      siteOrigin: window.location.origin,
                    });
                    void handleCopy(link);
                  }}
                  className="w-full"
                >
                  {copied ? <Check className="w-4 h-4 mr-2" /> : <Link2 className="w-4 h-4 mr-2" />}
                  {t.membersPage.copyInviteLink}
                </Button>
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground mt-3">{t.membersPage.resendInviteSaveHint}</p>
          </motion.div>
        </div>
      ) : null}

      {historyPreview ? (
        <div
          className="fixed inset-0 z-50 bg-background/40 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setHistoryPreview(null)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.98, y: 6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="w-full max-w-md rounded-3xl border border-border/60 bg-card/60 backdrop-blur-2xl p-6 shadow-[0_20px_60px_rgba(0,0,0,0.22)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-display font-bold text-foreground tracking-tight">{t.membersPage.historyPreviewTitle}</h3>
                <p className="text-xs text-muted-foreground mt-1">{t.membersPage.historyPreviewDesc}</p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setHistoryPreview(null)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="rounded-2xl border border-border/60 bg-background/40 p-4 space-y-2 mb-4">
              <div className="text-sm font-semibold text-foreground">{historyPreview.displayName}</div>
              {historyPreview.email ? (
                <div className="text-xs text-muted-foreground">{historyPreview.email}</div>
              ) : null}
              {historyPreview.detailLine ? (
                <div className="text-xs text-muted-foreground/90">{historyPreview.detailLine}</div>
              ) : null}
            </div>
            <div className="p-4 rounded-2xl border border-border/60 bg-background/40">
              <div className="text-[10px] text-muted-foreground mb-1">{t.membersPage.historyLinkLabel}</div>
              <div className="font-mono text-xs text-foreground break-all">
                {`${window.location.origin}${historyPreview.path}`}
              </div>
              <div className="mt-3 grid gap-2">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => void handleCopy(`${window.location.origin}${historyPreview.path}`)}
                >
                  {copied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                  {copied ? t.membersPage.copied : t.membersPage.copyHistoryLink}
                </Button>
                <Button
                  className="w-full bg-gradient-gold-static font-semibold text-primary-foreground hover:brightness-110"
                  onClick={() => {
                    const target = historyPreview.path;
                    setHistoryPreview(null);
                    navigate(target);
                  }}
                >
                  <History className="w-4 h-4 mr-2" />
                  {t.membersPage.openFullHistory}
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      ) : null}

      {showAddMembers && (
        <div
          className="fixed inset-0 z-50 bg-background/45 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setShowAddMembers(false)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.98, y: 6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="w-full max-w-5xl rounded-3xl border border-border/60 bg-card/65 backdrop-blur-2xl p-6 shadow-[0_24px_60px_rgba(0,0,0,0.22)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-display font-bold text-foreground tracking-tight text-lg">{t.membersPage.addMembersProfessionally}</h3>
                <p className="text-xs text-muted-foreground">
                  {t.membersPage.addMemberDesc}
                </p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setShowAddMembers(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 mb-4">
              <Button variant="outline" onClick={addDraftRow}>
                <Plus className="w-4 h-4 mr-1.5" /> {t.membersPage.addDraftRow}
              </Button>
              <Button variant="outline" onClick={handleDownloadTemplate}>
                <Download className="w-4 h-4 mr-1.5" /> {t.membersPage.downloadImportTemplate}
              </Button>
              <label className="inline-flex">
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  className="hidden"
                  onChange={(event) => {
                    const input = event.currentTarget;
                    const file = input.files?.[0];
                    if (!file) return;
                    void handleImportSpreadsheet(file).finally(() => {
                      input.value = "";
                    });
                  }}
                />
                <span className="inline-flex items-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium cursor-pointer hover:bg-accent hover:text-accent-foreground">
                  <Upload className="w-4 h-4 mr-1.5" /> {t.membersPage.importSpreadsheet}
                </span>
              </label>
              <div className="sm:ml-auto flex items-center gap-2">
                <div className="text-xs text-muted-foreground">{t.membersPage.inviteValidity}</div>
                <Select value={inviteDays} onValueChange={setInviteDays}>
                  <SelectTrigger className="h-9 w-full sm:w-[180px] rounded-xl border-border bg-background/60 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">{t.membersPage.day1}</SelectItem>
                    <SelectItem value="3">{t.membersPage.days3}</SelectItem>
                    <SelectItem value="7">{t.membersPage.days7}</SelectItem>
                    <SelectItem value="14">{t.membersPage.days14}</SelectItem>
                    <SelectItem value="0">{t.membersPage.noExpiryOption}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {renderImportColumnMapping(importColumnMapping, importSheetName)}

            {comparisonImportSummary && (
              <div className="mb-4 rounded-2xl border border-sky-500/25 bg-sky-500/5 p-3 text-xs space-y-2">
                <div className="font-medium text-foreground">{t.membersPage.comparisonImportSummaryTitle}</div>
                <div className="text-muted-foreground">
                  {t.membersPage.comparisonImportSummaryDesc
                    .replace("{missing}", String(comparisonImportSummary.missingTotal))
                    .replace("{active}", String(comparisonImportSummary.missingActive))
                    .replace("{withEmail}", String(comparisonImportSummary.missingWithEmail))
                    .replace("{withoutEmail}", String(comparisonImportSummary.missingWithoutEmail))
                    .replace("{fieldGaps}", String(comparisonImportSummary.fieldGapPatchCount))
                    .replace("{sharedGroups}", String(comparisonImportSummary.sharedEmailGroupCount))
                    .replace("{sharedMembers}", String(comparisonImportSummary.sharedEmailMemberCount))}
                </div>
                {pendingFieldGapPatches.length > 0 ? (
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <Button
                      size="sm"
                      variant="secondary"
                      className="h-8 text-xs"
                      disabled={fieldGapApplyBusy}
                      onClick={() => void handleApplyFieldGapPatches()}
                    >
                      {fieldGapApplyBusy ? (
                        <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                      ) : (
                        <FileSpreadsheet className="w-3.5 h-3.5 mr-1" />
                      )}
                      {t.membersPage.applyFieldGapPatches.replace("{count}", String(pendingFieldGapPatches.length))}
                    </Button>
                    <span className="text-muted-foreground">{t.membersPage.sharedContactEmailPaymentsHint}</span>
                  </div>
                ) : null}
              </div>
            )}

            {importSummary && (
              <div className="mb-4 rounded-2xl border border-border/60 bg-background/40 p-3 text-xs">
                <div className="font-medium text-foreground mb-1">{t.membersPage.importValidationReport}</div>
                <div className="text-muted-foreground">
                  {t.membersPage.importValidationReportDesc
                    .replace("{imported}", String(importSummary.imported))
                    .replace("{usable}", String(importSummary.usable))
                    .replace("{invalidEmail}", String(importSummary.invalidEmail))
                    .replace("{sharedContactInFile}", String(importSummary.sharedContactInFile))
                    .replace("{unknownRole}", String(importSummary.unknownRole))}
                </div>
              </div>
            )}

            {bulkHouseholdDiscountGroups.length > 0 ? (
              <div className="mb-4 rounded-2xl border border-violet-500/25 bg-violet-500/5 p-3 text-xs">
                <div className="font-medium text-foreground">{t.membersPage.registryHouseholdDiscountSummaryTitle}</div>
                <p className="text-muted-foreground mt-1">
                  {t.membersPage.registryHouseholdDiscountSummaryDesc.replace(
                    "{count}",
                    String(bulkHouseholdDiscountGroups.length),
                  )}
                </p>
              </div>
            ) : null}

            <div className="w-full min-w-0 overflow-x-auto rounded-2xl border border-border/60">
              <div className="max-h-[52vh] overflow-y-auto">
              <table className="w-full min-w-[900px] text-sm">
                <thead className="bg-background/70 sticky top-0">
                  <tr className="text-left text-xs text-muted-foreground">
                    <th className="px-2 py-2 w-28"></th>
                    <th className="px-3 py-2 w-10">{t.membersPage.useColumn}</th>
                    <th className="px-3 py-2">{t.membersPage.nameColumn}</th>
                    <th className="px-3 py-2">{t.membersPage.emailRequiredColumn}</th>
                    <th className="px-3 py-2">{t.onboarding.role}</th>
                    <th className="px-3 py-2">{t.membersPage.teamColumn}</th>
                    <th className="px-3 py-2">{t.membersPage.ageGroupColumn}</th>
                    <th className="px-3 py-2">{t.membersPage.positionColumn}</th>
                    <th className="px-3 py-2">{t.membersPage.validationColumn}</th>
                    <th className="px-3 py-2 w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {bulkRows.map((row) => {
                    const bulkRowExpanded = expandedBulkRows.has(row.id);
                    return (
                    <Fragment key={row.id}>
                    <tr className="border-t border-border/50">
                      <td className="px-2 py-2">
                        <button
                          type="button"
                          className={`flex min-h-11 min-w-11 items-center justify-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium touch-manipulation transition-all sm:min-w-0 sm:justify-start ${
                            bulkRowExpanded
                              ? "bg-primary/15 text-primary"
                              : "bg-muted/60 text-muted-foreground hover:bg-primary/10 hover:text-primary"
                          }`}
                          onClick={() => toggleBulkRowExpand(row.id)}
                          title={t.membersPage.masterDataToggle}
                        >
                          {bulkRowExpanded
                            ? <ChevronDown className="w-4 h-4" />
                            : <ChevronRight className="w-4 h-4" />}
                          <span className="hidden sm:inline whitespace-nowrap">{bulkRowExpanded ? t.membersPage.hideDetails : t.membersPage.moreDetails}</span>
                        </button>
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="checkbox"
                          checked={row.include}
                          onChange={(event) => updateDraftRow(row.id, "include", event.target.checked)}
                          className="accent-primary"
                        />
                      </td>
                      <td className="px-2 py-2">
                        <Input value={row.name} onChange={(event) => updateDraftRow(row.id, "name", event.target.value)} placeholder={t.membersPage.fullNamePlaceholder} />
                      </td>
                      <td className="px-2 py-2">
                        <Input
                          type="email"
                          value={row.email}
                          onChange={(event) => updateDraftRow(row.id, "email", event.target.value)}
                          placeholder={t.membersPage.memberEmailPlaceholder}
                        />
                      </td>
                      <td className="px-2 py-2">
                        <Select
                          value={row.role}
                          onValueChange={(value) => {
                            const parsedRole = normalizeRole(value);
                            updateDraftRow(row.id, "role", parsedRole.role);
                            updateDraftRow(row.id, "unknownRole", false);
                          }}
                        >
                          <SelectTrigger className="w-full h-10 rounded-xl border-border bg-background/60 text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {MEMBERSHIP_ROLE_SELECT_ORDER.map((role) => (
                              <SelectItem key={role} value={role}>
                                {getRoleLabel(role)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="px-2 py-2">
                        <Input value={row.team} onChange={(event) => updateDraftRow(row.id, "team", event.target.value)} placeholder={t.membersPage.teamPlaceholder} />
                      </td>
                      <td className="px-2 py-2">
                        <Input value={row.ageGroup} onChange={(event) => updateDraftRow(row.id, "ageGroup", event.target.value)} placeholder={t.membersPage.ageGroupPlaceholder} />
                      </td>
                      <td className="px-2 py-2">
                        <Input value={row.position} onChange={(event) => updateDraftRow(row.id, "position", event.target.value)} placeholder={t.membersPage.positionPlaceholder} />
                      </td>
                      <td className="px-2 py-2">
                        <div className="flex flex-wrap gap-1">
                          {(bulkRowIssues.get(row.id) ?? []).length === 0 ? (
                            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400">
                              {t.membersPage.ready}
                            </span>
                          ) : (
                            (bulkRowIssues.get(row.id) ?? []).map((issue) => (
                              <span
                                key={`${row.id}-${issue}`}
                                className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                                  issue === "unknown_role" ||
                                  issue === "shared_contact_email" ||
                                  issue === "shared_login_email" ||
                                  issue === "household_discount_candidate"
                                    ? "bg-amber-500/10 text-amber-500"
                                    : issue === "already_in_saved_list"
                                      ? "bg-orange-500/10 text-orange-400"
                                    : "bg-accent/10 text-accent"
                                }`}
                              >
                                {getBulkIssueLabel(issue)}
                              </span>
                            ))
                          )}
                        </div>
                      </td>
                      <td className="px-2 py-2">
                        <Button variant="ghost" size="icon" className="min-h-11 min-w-11 touch-manipulation" onClick={() => removeDraftRow(row.id)} disabled={bulkRows.length <= 1}>
                          <X className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                    {bulkRowExpanded && (
                      <tr className="border-t border-primary/15 bg-muted/20">
                        <td colSpan={10} className="px-4 py-3">
                          <MasterDataTabs
                            values={row.masterData}
                            labels={masterTabLabels}
                            displayName={row.name.trim() || undefined}
                            clubName={clubName}
                            logoSrc={clubLogoUrl ?? ""}
                            membershipRole={row.role ? getRoleLabel(row.role) : undefined}
                            isPlayer={isPlayerRole(row.role)}
                            teamLabel={row.team.trim()}
                            email={row.email.trim() || null}
                            avatarUpload={{
                              uploading: bulkAvatarUploadingRowId === row.id,
                              onUpload: (file) => void uploadBulkRowAvatar(row.id, file),
                              onRemove: () => updateBulkRowMasterField(row.id, "photo_url", null),
                            }}
                            onChange={(key, value) => updateBulkRowMasterField(row.id, key, value)}
                          />
                        </td>
                      </tr>
                    )}
                    </Fragment>
                    );
                  })}
                </tbody>
              </table>
              </div>
            </div>

            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-xs text-muted-foreground">
                {t.membersPage.tipExcelCsvColumns}
                {" "}
                <code>{t.membersPage.emailRequiredColumn}</code>,{" "}
                <code>{t.membersPage.nameColumn}</code>,{" "}
                <code>{t.onboarding.role}</code>,{" "}
                <code>{t.membersPage.teamColumn}</code>,{" "}
                <code>{t.membersPage.ageGroupColumn}</code>,{" "}
                <code>{t.membersPage.positionColumn}</code>.
              </div>
              <Button
                className="bg-gradient-gold-static text-primary-foreground font-semibold hover:brightness-110"
                onClick={handleSaveBulkDrafts}
                disabled={bulkSubmitting}
              >
                {bulkSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <UserPlus className="w-4 h-4 mr-1.5" />}
                {t.membersPage.saveSelectedToList}
              </Button>
            </div>
          </motion.div>
        </div>
      )}

      {clubPassModalMember ? (
        <ClubMemberPassModal
          open={Boolean(clubPassModalMember)}
          onOpenChange={(open) => {
            if (!open) setClubPassModalMember(null);
          }}
          values={
            memberPanelEditModeId === clubPassModalMember.id
              ? memberMasterEditDraft
              : (masterByMembershipId[clubPassModalMember.id] ?? {})
          }
          displayName={getMemberRosterName(clubPassModalMember)}
          clubName={clubName}
          logoSrc={clubLogoUrl ?? ""}
          membershipRole={getRoleLabel(
            memberPanelEditModeId === clubPassModalMember.id ? editMemberForm.role : clubPassModalMember.role,
          )}
          isPlayer={isPlayerRole(
            memberPanelEditModeId === clubPassModalMember.id ? editMemberForm.role : clubPassModalMember.role,
          )}
          teamLabel={
            memberPanelEditModeId === clubPassModalMember.id
              ? clubTeamNamesFromIds(clubTeams, editMemberTeamIds).join(", ") || editMemberForm.team.trim()
              : getMemberAssignedTeamNames(clubPassModalMember)
          }
          readOnly={memberPanelEditModeId !== clubPassModalMember.id}
          onGenerateId={
            memberPanelEditModeId === clubPassModalMember.id
              ? () => {
                  const id = `O4T-${Date.now().toString(36).toUpperCase().slice(-6)}${Math.random().toString(36).slice(2, 4).toUpperCase()}`;
                  setMemberMasterEditDraft((draft) => ({ ...draft, internal_club_number: id }));
                }
              : undefined
          }
          onDownloadComplete={() => {
            if (memberPanelEditModeId === clubPassModalMember.id) {
              setMemberMasterEditDraft((draft) => ({ ...draft, club_pass_generated_at: new Date().toISOString() }));
            }
          }}
          clubId={
            clubId ||
            (typeof masterByMembershipId[clubPassModalMember.id]?.club_id === "string"
              ? masterByMembershipId[clubPassModalMember.id]!.club_id
              : null)
          }
          membershipId={clubPassModalMember.id}
          profileAvatarUrl={clubPassModalMember.profiles?.avatar_url ?? null}
          labels={clubPassLabels}
        />
      ) : null}

      {selectedMember ? (
        <MemberMasterDialog
          open={showMasterDialog}
          onOpenChange={setShowMasterDialog}
          membershipId={selectedMember.id}
          displayName={getMemberRosterName(selectedMember)}
          email={membershipEmails[selectedMember.id] ?? null}
          membershipRole={selectedMember.role}
          teamLabel={getMemberAssignedTeamNames(selectedMember)}
          clubName={clubName}
          logoSrc={clubLogoUrl ?? ""}
          initial={masterByMembershipId[selectedMember.id] ?? null}
          profileAvatarUrl={selectedMember.profiles?.avatar_url ?? null}
          memberStatus={selectedMember.status}
          phone={selectedMember.profiles?.phone ?? null}
          joinedAt={selectedMember.created_at}
          joinedLabel={t.membersPage.joined}
          supportingMemberLabel={t.membersPage.supportingMember}
          activeLabel={t.common.active}
          roleDisplayLabel={getRoleLabel(selectedMember.role)}
          roleBadgeClassName={roleColors[selectedMember.role] || "bg-muted text-muted-foreground"}
          masterTabLabels={masterTabLabels}
          labels={{
            title: t.membersPage.masterDialogTitle,
            subtitle: t.membersPage.masterDialogSubtitle,
            save: t.common.save,
            cancel: t.common.cancel,
            readyBadge: t.membersPage.ready,
            missingFields: t.membersPage.masterMissingFields,
            masterDataFields: t.membersPage.masterDataFields,
          }}
          onSave={async (payload) => {
            await handleSaveMasterRecord(selectedMember, payload, { suppressToast: true });
          }}
        />
      ) : null}

      {showRegistryImport ? (
        <div
          className="fixed inset-0 z-50 bg-background/50 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setShowRegistryImport(false)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.98, y: 6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="w-full max-w-4xl rounded-3xl border border-border/60 bg-card/90 backdrop-blur-2xl p-6 shadow-xl max-h-[90vh] overflow-y-auto"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-display font-bold text-lg">{t.membersPage.registryImportTitle}</h3>
                <p className="text-xs text-muted-foreground mt-1">{t.membersPage.registryImportBody}</p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setShowRegistryImport(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            <label className="inline-flex mb-4">
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={(event) => {
                  const input = event.currentTarget;
                  const file = input.files?.[0];
                  if (!file) return;
                  void handlePrepareRegistryImport(file).finally(() => {
                    input.value = "";
                  });
                }}
              />
              <span className="inline-flex items-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium cursor-pointer hover:bg-accent hover:text-accent-foreground">
                <Upload className="w-4 h-4 mr-2" /> {t.membersPage.importSpreadsheet}
              </span>
            </label>
            {renderImportColumnMapping(registryImportColumnMapping, registryImportSheetName)}
            {registryHouseholdGroups.length > 0 ? (
              <div className="mb-4 rounded-2xl border border-violet-500/25 bg-violet-500/5 p-3 text-xs">
                <div className="font-medium text-foreground">{t.membersPage.registryHouseholdDiscountSummaryTitle}</div>
                <p className="text-muted-foreground mt-1">
                  {t.membersPage.registryHouseholdDiscountSummaryDesc.replace(
                    "{count}",
                    String(registryHouseholdGroups.length),
                  )}
                </p>
              </div>
            ) : null}
            {registryUnmatchedAddable.length > 0 ? (
              <div className="mb-4 rounded-2xl border border-amber-500/30 bg-amber-500/5 p-3 text-xs">
                <div className="font-medium text-foreground">{t.membersPage.registryUnmatchedBannerTitle}</div>
                <p className="text-muted-foreground mt-1">
                  {t.membersPage.registryUnmatchedBannerDesc.replace("{count}", String(registryUnmatchedAddable.length))}
                </p>
                <Button
                  size="sm"
                  variant="secondary"
                  className="mt-3 h-8 text-xs"
                  disabled={registryImportBusy}
                  onClick={() => void handleAddUnmatchedRegistryToSavedList()}
                >
                  {t.membersPage.registryAddUnmatchedToSavedList.replace(
                    "{count}",
                    String(registryUnmatchedAddable.length),
                  )}
                </Button>
              </div>
            ) : null}
            {registryImportBusy ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : registryImportPreview.length > 0 ? (
              <div className="rounded-xl border border-border overflow-hidden overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-muted/50">
                    <tr className="text-left">
                      <th className="px-2 py-2">{t.membersPage.registryImportMemberColumn}</th>
                      <th className="px-2 py-2">{t.membersPage.registryImportMatched}</th>
                      <th className="px-2 py-2">{t.membersPage.registryImportEmailColumn}</th>
                      <th className="px-2 py-2">{t.membersPage.registryImportMissing}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {registryImportPreview.map((row, idx) => (
                      <tr key={`${row.displayName}-${row.email}-${idx}`} className="border-t border-border/60">
                        <td className="px-2 py-2">
                          <div className="font-medium text-foreground">{row.displayName || "-"}</div>
                          {row.extractedSummary ? (
                            <div className="text-muted-foreground font-mono text-[10px] mt-0.5">{row.extractedSummary}</div>
                          ) : null}
                        </td>
                        <td className="px-2 py-2">
                          {row.matchLabel ? (
                            <span className="text-emerald-500 font-medium">{row.matchLabel}</span>
                          ) : (
                            "-"
                          )}
                        </td>
                        <td className="px-2 py-2 font-mono truncate max-w-[220px]">
                          <div>{row.email || "-"}</div>
                          {row.payload.household_discount_status === "pending_verification" ? (
                            <div className="mt-1">
                              {(() => {
                                const hhGroup = findHouseholdGroupForMember(
                                  registryHouseholdGroups,
                                  householdRefFromMasterLike("", row.email, row.payload),
                                );
                                return hhGroup ? (
                                  <HouseholdDiscountBadge
                                    group={hhGroup}
                                    label={t.membersPage.householdDiscountBadge}
                                    tooltip={t.membersPage.householdDiscountTooltip}
                                  />
                                ) : null;
                              })()}
                            </div>
                          ) : null}
                        </td>
                        <td className="px-2 py-2 text-amber-600">
                          {row.missing.map((code) => getRegistryMissingLabel(code)).join(", ")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
            <div className="mt-4 flex flex-col sm:flex-row sm:justify-end gap-2">
              <Button variant="outline" onClick={() => setShowRegistryImport(false)}>{t.common.cancel}</Button>
              {registryUnmatchedAddable.length > 0 ? (
                <Button
                  variant="secondary"
                  disabled={registryImportBusy}
                  onClick={() => void handleAddUnmatchedRegistryToSavedList()}
                >
                  {t.membersPage.registryAddUnmatchedToSavedList.replace(
                    "{count}",
                    String(registryUnmatchedAddable.length),
                  )}
                </Button>
              ) : null}
              <Button
                className="bg-gradient-gold-static text-primary-foreground"
                disabled={
                  registryImportBusy ||
                  (!registryImportPreview.some((r) => r.membershipId || r.draftId) &&
                    registryUnmatchedAddable.length === 0)
                }
                onClick={() => void handleApplyRegistryImport()}
              >
                {t.membersPage.registryImportApply}
              </Button>
            </div>
          </motion.div>
        </div>
      ) : null}

    </div>
  );
};

export default Members;
