import { useState, useEffect, useCallback, useMemo, useRef, Fragment } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useLanguage } from "@/hooks/use-language";
import { motion } from "framer-motion";
import { DashboardHeaderSlot } from "@/components/layout/DashboardHeaderSlot";
import {
  Users, Search, Plus,
  Shield, Dumbbell, Crown, UserCheck, Heart, MoreHorizontal,
  Phone, Calendar, Loader2,
  Link2, Copy, Check, Inbox, UserPlus, Clock, X, Upload, UploadCloud, Download, AlertTriangle,
  Sparkles, FileSpreadsheet, UserCircle2, Pencil, ChevronDown, ChevronRight, RefreshCw, History,
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
import { RoleManager } from "@/components/members/role-manager";
import { trackEvent } from "@/lib/telemetry";
import logo from "@/assets/one4team-logo.png";
import type { ClubMemberMasterRecord } from "@/lib/member-master-schema";
import {
  DRAFT_GUARDIAN_MEMBERSHIP_IDS_KEY,
  getMissingRequiredMasterFields,
  masterFieldsFromFlatImport,
  masterRecordCompletenessPct,
  parseMembershipKind,
  readDraftGuardianMembershipIds,
} from "@/lib/member-master-schema";
import {
  buildMemberImportTemplateWorkbook,
  buildMemberRegistryWorkbook,
  parseRegistrySpreadsheetFirstSheet,
} from "@/lib/member-master-xlsx";
import { MemberMasterDialog } from "@/components/members/member-master-dialog";
import { MasterDataTabs } from "@/components/members/master-data-tabs";
import { Badge } from "@/components/ui/badge";
import { appendMemberAuditEvent } from "@/lib/member-audit";
import { cn } from "@/lib/utils";
import { supabaseErrorMessage } from "@/lib/supabase-error-message";

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
  email: string;
  role: string;
  team: string | null;
  age_group: string | null;
  position: string | null;
  status: "draft" | "invited";
  invite_id: string | null;
  invited_at: string | null;
  created_at: string;
  master_data: Record<string, unknown> | null;
};

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

type ImportSummary = {
  imported: number;
  usable: number;
  invalidEmail: number;
  duplicateInFile: number;
  unknownRole: number;
};

type BulkRowIssue =
  | "invalid_email"
  | "duplicate_email"
  | "already_in_club"
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
  "member",
  "parent",
  "sponsor",
  "supplier",
  "service_provider",
  "consultant",
] as const;

const roleIcons: Record<string, React.ElementType> = {
  admin: Crown,
  trainer: Dumbbell,
  player: Shield,
  staff: UserCheck,
  member: Users,
  parent: Heart,
};

const roleColors: Record<string, string> = {
  admin: "bg-primary/10 text-primary",
  trainer: "bg-accent/10 text-accent",
  player: "bg-blue-500/10 text-blue-400",
  staff: "bg-emerald-500/10 text-emerald-400",
  member: "bg-muted text-muted-foreground",
  parent: "bg-pink-500/10 text-pink-400",
  sponsor: "bg-primary/10 text-primary",
  supplier: "bg-orange-500/10 text-orange-400",
  service_provider: "bg-violet-500/10 text-violet-400",
  consultant: "bg-cyan-500/10 text-cyan-400",
};

const MEMBERS_VISIBLE_PAGE_SIZE = 40;
const MEMBERS_SERVER_PAGE_SIZE = 100;

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

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
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
  return {
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

const Members = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useLanguage();
  const { clubId, loading: clubLoading } = useClubId();
  const perms = usePermissions();
  const [tab, setTab] = useState<"members" | "invites" | "roles">("members");
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
  const [loading, setLoading] = useState(true);
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
  const [draftsLoading, setDraftsLoading] = useState(false);
  const [draftActionId, setDraftActionId] = useState<string | null>(null);
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
  const [draftAvatarUploading, setDraftAvatarUploading] = useState(false);
  const [bulkAvatarUploadingRowId, setBulkAvatarUploadingRowId] = useState<string | null>(null);
  const [draftMasterExpanded, setDraftMasterExpanded] = useState(false);
  const [showAllDrafts, setShowAllDrafts] = useState(false);
  const [joinReviewerPolicy, setJoinReviewerPolicy] = useState<"admin_only" | "admin_trainer">("admin_only");
  const [clubSlug, setClubSlug] = useState<string | null>(null);
  const [clubName, setClubName] = useState<string | null>(null);

  const [masterByMembershipId, setMasterByMembershipId] = useState<Record<string, ClubMemberMasterRecord | null>>({});
  const [membershipEmails, setMembershipEmails] = useState<Record<string, string>>({});
  const [guardianLinks, setGuardianLinks] = useState<GuardianLinkRow[]>([]);
  const [showMasterDialog, setShowMasterDialog] = useState(false);
  const [showRegistryImport, setShowRegistryImport] = useState(false);
  const [registryImportBusy, setRegistryImportBusy] = useState(false);
  const [registryImportPreview, setRegistryImportPreview] = useState<
    Array<{
      email: string;
      membershipId: string | null;
      missing: string[];
      payload: Partial<ClubMemberMasterRecord>;
      guardianEmail: string;
      wardEmail: string;
    }>
  >([]);
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

  const getBulkIssueLabel = useCallback((issue: BulkRowIssue) => {
    switch (issue) {
      case "invalid_email":
        return t.membersPage.importIssueInvalidEmail;
      case "duplicate_email":
        return t.membersPage.importIssueDuplicateInImport;
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
        return role.replace("_", " ");
    }
  }, [t]);

  useEffect(() => {
    if (historyPreview) setCopied(false);
  }, [historyPreview]);

  // Reset page state on club switch to prevent cross-club flashes
  useEffect(() => {
    setMembers([]);
    setMemberTeamNamesById({});
    setSelectedMember(null);
    setLoading(true);

    setInviteRequests([]);
    setInvites([]);
    setInvitesLoading(false);
    setMemberDrafts([]);
    setDraftsLoading(false);
    setDraftActionId(null);
    setJoinReviewerPolicy("admin_only");
    setClubSlug(null);
    setClubName(null);
    setMasterByMembershipId({});
    setMembershipEmails({});
    setGuardianLinks([]);
    setShowMasterDialog(false);
    setShowRegistryImport(false);
    setRegistryImportPreview([]);
    setHistoryPreview(null);
    setDraftResendTokenModalOpen(false);
    setDraftResendInviteToken(null);

    setSearch("");
    setDebouncedSearch("");
    setRoleFilter("all");
    setMembersServerPage(1);
    membersPivotRef.current = "";
    setInviteReqFilter("pending");
  }, [clubId]);

  const toHex = (buf: ArrayBuffer) => Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");

  const hashToken = async (token: string) => {
    const bytes = new TextEncoder().encode(token);
    const digest = await crypto.subtle.digest("SHA-256", bytes);
    return toHex(digest);
  };

  const generateToken = () => {
    const bytes = new Uint8Array(24);
    crypto.getRandomValues(bytes);
    // base64url-ish
    return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
  };

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
      prev.map((r) => (r.id === rowId ? { ...r, masterData: { ...r.masterData, [key]: value } } : r)),
    );
  };

  const addDraftRow = () => {
    setBulkRows((previous) => [
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
    ]);
  };

  const updateDraftRow = (id: string, key: keyof BulkMemberDraft, value: string | boolean) => {
    setBulkRows((previous) => previous.map((row) => (row.id === id ? { ...row, [key]: value } : row)));
  };

  const removeDraftRow = (id: string) => {
    setBulkRows((previous) => previous.filter((row) => row.id !== id));
  };

  const handleImportSpreadsheet = async (file: File) => {
    const isCsv = file.name.toLowerCase().endsWith(".csv");
    if (isCsv) {
      const raw = await file.text();
      const rows = raw
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);
      if (rows.length < 2) {
        toast({ title: t.membersPage.importFailed, description: t.membersPage.importCsvNoDataRows, variant: "destructive" });
        return;
      }
      const headers = rows[0].split(",").map((h) => h.trim().toLowerCase());
      const dataRows = rows.slice(1).map((line) => line.split(","));
      const imported = dataRows.map((columns) => {
        const get = (key: string) => {
          const index = headers.indexOf(key);
          return index >= 0 ? (columns[index] ?? "").trim() : "";
        };
        const parsedRole = normalizeRole(get("role"));
        const masterFields = masterFieldsFromFlatImport(
          Object.fromEntries(
            Object.entries(record).map(([k, v]) => [k.toLowerCase().trim(), String(v ?? "").trim()]),
          ),
        );
        return {
          id: crypto.randomUUID(),
          include: true,
          name: get("name") || get("full_name"),
          email: get("email"),
          role: parsedRole.role,
          unknownRole: parsedRole.unknownRole,
          team: get("team"),
          ageGroup: get("age_group"),
          position: get("position"),
          masterData: masterFields,
        } as BulkMemberDraft;
      });

      const usable = imported.filter((item) => normalizeEmail(item.email));
      const duplicates = new Set<string>();
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

      setBulkRows((previous) => [...previous, ...usable]);
      setImportSummary({
        imported: imported.length,
        usable: usable.length,
        invalidEmail: invalid,
        duplicateInFile: duplicates.size,
        unknownRole,
      });
      toast({
        title: t.membersPage.importComplete,
        description: t.membersPage.importedRowsFromCsv.replace("{count}", String(usable.length)),
      });
      return;
    }

    const xlsx = await import("xlsx");
    const buffer = await file.arrayBuffer();
    const workbook = xlsx.read(buffer, { type: "array" });
    const firstSheetName = workbook.SheetNames[0];
    const firstSheet = workbook.Sheets[firstSheetName];
    const records = xlsx.utils.sheet_to_json<Record<string, unknown>>(firstSheet, { defval: "" });

    const imported = records.map((record) => {
      const get = (...keys: string[]) => {
        for (const key of keys) {
          const entry = Object.entries(record).find(([k]) => k.toLowerCase().trim() === key);
          if (entry) return String(entry[1] ?? "").trim();
        }
        return "";
      };
      const parsedRole = normalizeRole(get("role"));
      const masterFields = masterFieldsFromFlatImport(
        Object.fromEntries(
          Object.entries(record).map(([k, v]) => [String(k).toLowerCase().trim(), String(v ?? "").trim()]),
        ),
      );
      return {
        id: crypto.randomUUID(),
        include: true,
        name: get("name", "full_name"),
        email: get("email"),
        role: parsedRole.role,
        unknownRole: parsedRole.unknownRole,
        team: get("team"),
        ageGroup: get("age_group"),
        position: get("position"),
        masterData: masterFields,
      } as BulkMemberDraft;
    });

    const usable = imported.filter((row) => row.email);
    if (!usable.length) {
      toast({
        title: t.membersPage.importFailed,
        description: t.membersPage.importNoValidRows,
        variant: "destructive",
      });
      return;
    }

    const duplicates = new Set<string>();
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

    setBulkRows((previous) => [...previous, ...usable]);
    setImportSummary({
      imported: imported.length,
      usable: usable.length,
      invalidEmail: invalid,
      duplicateInFile: duplicates.size,
      unknownRole,
    });
    toast({
      title: t.membersPage.importComplete,
      description: t.membersPage.importedRowsFromSpreadsheet.replace("{count}", String(usable.length)),
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
        invite_payload: payload ?? {},
      })
      .select("id")
      .single();
    if (error) return { ok: false as const, error: error.message };
    if (!data?.id) return { ok: false as const, error: t.membersPage.noClubSelected };
    return { ok: true as const, token, inviteId: data.id };
  };

  const fetchMemberDrafts = useCallback(async () => {
    if (!clubId || !perms.isAdmin) return;
    setDraftsLoading(true);
    const { data, error } = await supabase
      .from("club_member_drafts")
      .select("*")
      .eq("club_id", clubId)
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) {
      toast({ title: t.common.error, description: error.message, variant: "destructive" });
      setMemberDrafts([]);
      setDraftsLoading(false);
      return;
    }
    setMemberDrafts((data as unknown as MemberDraftRow[]) ?? []);
    setDraftsLoading(false);
  }, [clubId, perms.isAdmin, t.common.error, toast]);

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

  const fetchInvitesData = useCallback(async () => {
    if (!clubId) return;
    setInvitesLoading(true);

    const clubRes = await supabase.from("clubs").select("slug, name, join_reviewer_policy").eq("id", clubId).maybeSingle();
    if (clubRes.error) {
      toast({ title: "Error", description: clubRes.error.message, variant: "destructive" });
    } else {
      setClubSlug(clubRes.data?.slug ?? null);
      setClubName(clubRes.data?.name ?? null);
      const policy = (clubRes.data?.join_reviewer_policy as "admin_only" | "admin_trainer" | undefined) || "admin_only";
      setJoinReviewerPolicy(policy);
    }
    const [reqRes, invRes] = await Promise.all([
      supabase.from("club_invite_requests").select("*").eq("club_id", clubId).order("created_at", { ascending: false }).limit(100),
      supabase.from("club_invites").select("*").eq("club_id", clubId).order("created_at", { ascending: false }).limit(100),
    ]);

    if (reqRes.error) toast({ title: "Error", description: reqRes.error.message, variant: "destructive" });
    if (invRes.error) toast({ title: "Error", description: invRes.error.message, variant: "destructive" });

    setInviteRequests((reqRes.data as unknown as InviteRequestRow[]) || []);
    setInvites((invRes.data as unknown as ClubInviteRow[]) || []);
    setInvitesLoading(false);
  }, [clubId, toast]);

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

  const canManageMembers = perms.isAdmin;

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
  }), [t]);
  const canReviewJoinRequests = perms.isAdmin || (perms.isTrainer && joinReviewerPolicy === "admin_trainer");
  const canAccessMembersPage = perms.isAdmin || perms.isTrainer;

  const fetchMembers = useCallback(async () => {
    if (!clubId) return;
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

      const map: Record<string, string[]> = {};
      const applyRows = (rows: Array<Record<string, unknown>>) => {
        rows.forEach((row) => {
          const membershipId = String(row.membership_id);
          const teamId = String(row.team_id);
          const teamName = teamsById.get(teamId);
          if (!teamName) return;
          const existing = map[membershipId] || [];
          map[membershipId] = existing.includes(teamName) ? existing : [...existing, teamName];
        });
      };

      if (!playersRes.error) applyRows(((playersRes.data as Array<Record<string, unknown>> | null) || []));
      if (!coachesRes.error) applyRows(((coachesRes.data as Array<Record<string, unknown>> | null) || []));
      if (coachesRes.error && !isMissingRelationError(coachesRes.error)) {
        toast({ title: t.membersPage.errorLoadingMembers, description: coachesRes.error.message, variant: "destructive" });
      }
      setMemberTeamNamesById(map);

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
        setLoading(false);
        return;
      }
      const payload = rawSearch as { total?: unknown; items?: unknown } | null;
      const total = typeof payload?.total === "number" ? payload.total : 0;
      const rawItems = Array.isArray(payload?.items) ? payload.items : [];
      setMembersDbTotalCount(total);
      const memberships = rawItems.map((row) => mapSearchRpcRowToMember(row as Record<string, unknown>));
      setMembers(memberships);
      await loadSidecarsForMemberships(memberships.map((item) => item.id));
      setLoading(false);
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
    setMembersDbTotalCount(typeof count === "number" ? count : null);
    applyStats(statsRes);

    if (membershipError) {
      toast({ title: t.membersPage.errorLoadingMembers, description: membershipError.message, variant: "destructive" });
      setLoading(false);
      return;
    }

    const memberships = (membershipData as unknown as MemberRow[]) || [];
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
    setLoading(false);
  }, [clubId, debouncedSearch, membersServerPage, roleFilter, toast, t]);

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
    if (!perms.isAdmin) return;
    void fetchMemberDrafts();
  }, [tab, clubId, perms.isAdmin, fetchMemberDrafts]);

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

    if (tab === "members" && perms.isAdmin) {
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
  }, [clubId, tab, perms.isAdmin, canAccessMembersPage, fetchMemberDrafts, fetchInvitesData]);

  useEffect(() => {
    const run = async () => {
      if (!showAddMembers || !clubId || !perms.isAdmin) return;
      const { data } = await supabase
        .from("club_invites")
        .select("*")
        .eq("club_id", clubId)
        .order("created_at", { ascending: false })
        .limit(500);
      if (data) setInvites(data as unknown as ClubInviteRow[]);
    };
    void run();
  }, [showAddMembers, clubId, perms.isAdmin]);

  useEffect(() => {
    const run = async () => {
      if (!showAddMembers || !clubId || !perms.isAdmin) {
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
  }, [showAddMembers, clubId, perms.isAdmin, bulkRows]);

  const filtered = useMemo(() => {
    if (debouncedSearch.trim().length >= 2) {
      return members;
    }
    return members.filter((m) => {
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
  }, [members, masterByMembershipId, membershipEmails, roleFilter, search, debouncedSearch]);

  const membersServerTotalPages = Math.max(
    1,
    Math.ceil((membersDbTotalCount ?? 0) / MEMBERS_SERVER_PAGE_SIZE) || 1,
  );

  const getMemberTeamLabel = useCallback((member: MemberRow) => {
    const assignedTeams = memberTeamNamesById[member.id] || [];
    if (assignedTeams.length > 0) return assignedTeams.join(", ");
    return member.team || t.membersPage.noTeam;
  }, [memberTeamNamesById, t.membersPage.noTeam]);

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

  const handleExportMemberRegistry = useCallback(async () => {
    if (!clubId) return;
    const EXPORT_CAP = 5000;
    const { data: allRows, error: memErr } = await supabase
      .from("club_memberships")
      .select("id, club_id, user_id, role, position, age_group, team, status, created_at")
      .eq("club_id", clubId)
      .order("created_at", { ascending: false })
      .limit(EXPORT_CAP);
    if (memErr) {
      toast({ title: t.common.error, description: memErr.message, variant: "destructive" });
      return;
    }
    const exportMembers = (allRows as unknown as MemberRow[]) || [];
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
      if (assigned.length > 0) return assigned.join(", ");
      return m.team || t.membersPage.noTeam;
    };
    const getName = (m: MemberRow) => {
      const master = masterMap[m.id];
      const fn = master?.first_name?.trim();
      const ln = master?.last_name?.trim();
      if (fn || ln) return [fn, ln].filter(Boolean).join(" ");
      return m.profiles?.display_name || t.membersPage.unknownMember;
    };
    await buildMemberRegistryWorkbook({
      clubName: clubName || "Club",
      membersSnapshot: withProfiles.map((m) => ({
        email: emailMap[m.id] || "",
        displayName: getName(m),
        role: m.role,
        status: m.status,
        team: getTeam(m),
        ageGroup: m.age_group || "",
        position: m.position || "",
        joinedAt: new Date(m.created_at).toISOString().slice(0, 10),
        master: masterMap[m.id] || null,
      })),
    });
    toast({
      title: t.membersPage.registryExportTitle,
      description:
        exportMembers.length >= EXPORT_CAP
          ? `${t.membersPage.registryExportDesc} (capped at ${EXPORT_CAP} rows)`
          : t.membersPage.registryExportDesc,
    });
  }, [clubId, clubName, membershipEmails, t, toast]);

  const handleSaveMasterRecord = useCallback(
    async (
      member: MemberRow,
      payload: Partial<ClubMemberMasterRecord>,
      options?: { suppressToast?: boolean },
    ) => {
      if (!clubId || !perms.isAdmin) {
        toast({ title: t.common.notAuthorized, description: t.membersPage.onlyAdminsMembers, variant: "destructive" });
        return;
      }
      const row = {
        ...payload,
        membership_id: member.id,
        club_id: clubId,
        membership_kind: payload.membership_kind || "active_participant",
      };
      const { data, error } = await supabase.from("club_member_master_records").upsert(row, { onConflict: "membership_id" }).select("*").maybeSingle();
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
        toast({ title: t.common.updated, description: t.membersPage.registrySaved });
      }
      const fieldKeys = Object.keys(payload).filter((k) => k !== "membership_id" && k !== "club_id");
      void appendMemberAuditEvent({
        clubId,
        membershipId: member.id,
        correlationEmail: membershipEmails[member.id] ?? null,
        eventType: "registry_updated",
        summary: "Registry updated",
        detail: { fields: fieldKeys },
      });
    },
    [clubId, perms.isAdmin, membershipEmails, t, toast],
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
      if (!clubId || !perms.isAdmin) return;
      setRegistryImportBusy(true);
      try {
        const rows = await parseRegistrySpreadsheetFirstSheet(file);
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

        const preview: typeof registryImportPreview = [];
        for (const r of rows) {
          const email = normalizeEmail(r.email);
          const membershipId = email ? emailToMembership.get(email) ?? null : null;
          const payload = masterFieldsFromFlatImport(r.raw);
          const mem = membershipId ? members.find((mm) => mm.id === membershipId) : null;
          const roleParsed = mem?.role || (r.role ? normalizeRole(r.role).role : "member");
          const missing = membershipId
            ? getMissingRequiredMasterFields(payload, roleParsed)
            : ["email_not_in_club"];
          preview.push({
            email: r.email,
            membershipId,
            missing: missing.map((m) => String(m)),
            payload,
            guardianEmail: r.guardianEmail,
            wardEmail: r.wardEmail,
          });
        }
        setRegistryImportPreview(preview);
        toast({
          title: t.membersPage.registryImportParsed,
          description: t.membersPage.registryImportParsedDesc.replace("{count}", String(preview.length)),
        });
      } finally {
        setRegistryImportBusy(false);
      }
    },
    [clubId, perms.isAdmin, members, t, toast],
  );

  const handleApplyRegistryImport = useCallback(async () => {
    if (!clubId || !perms.isAdmin) return;
    const applicable = registryImportPreview.filter((row) => row.membershipId);
    if (!applicable.length) {
      toast({ title: t.membersPage.registryImportNothingToApply, variant: "destructive" });
      return;
    }
    setRegistryImportBusy(true);
    try {
      let ok = 0;
      for (const row of applicable) {
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
        description: t.membersPage.registryImportAppliedDesc.replace("{rows}", String(ok)).replace("{links}", String(linksOk)),
      });
      setShowRegistryImport(false);
      setRegistryImportPreview([]);
      void fetchMembers();
    } finally {
      setRegistryImportBusy(false);
    }
  }, [clubId, perms.isAdmin, registryImportPreview, emailToMembershipIdFromEmail, t, toast, fetchMembers]);

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
      if (!email) {
        byRowId.set(row.id, issues);
        continue;
      }
      if (!EMAIL_PATTERN.test(email)) issues.push("invalid_email");
      if ((counts.get(email) ?? 0) > 1) issues.push("duplicate_email");
      if (existingMemberEmails.has(email)) issues.push("already_in_club");
      if (existingInviteEmails.has(email)) issues.push("invite_exists");
      if (row.unknownRole) issues.push("unknown_role");
      byRowId.set(row.id, issues);
    }
    return byRowId;
  }, [bulkRows, existingInviteEmails, existingMemberEmails]);

  const handleDeleteMember = async (membershipId: string) => {
    if (!perms.isAdmin || !clubId) {
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
    if (wardLinks.length === 0 && !canManageMembers) return null;
    return (
      <>
        <div className="text-sm font-semibold text-foreground">{t.membersPage.guardians}</div>
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
            <div className="text-sm text-muted-foreground">{t.membersPage.linkGuardian}</div>
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
    setEditMemberForm({
      role: member.role || "member",
      team: member.team || "",
      ageGroup: member.age_group || "",
      position: member.position || "",
      status: member.status || "active",
    });
  };

  const cancelMemberPanelEdit = () => {
    setMemberPanelEditModeId(null);
    setMemberMasterEditDraft({});
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
      setMemberMasterEditDraft((d) => ({ ...d, photo_url: data.publicUrl }));
      toast({ title: t.settingsPage.avatarUploadSuccess });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Upload failed";
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
    if (!perms.isAdmin) {
      toast({ title: t.common.notAuthorized, description: t.membersPage.onlyAdminsMembers, variant: "destructive" });
      return;
    }
    setMemberPanelSaving(true);
    try {
      const { data, error } = await supabase
        .from("club_memberships")
        .update({
          role: editMemberForm.role,
          team: editMemberForm.team.trim() || null,
          age_group: editMemberForm.ageGroup.trim() || null,
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
      toast({ title: t.common.updated, description: t.membersPage.registrySaved });
      setMemberPanelEditModeId(null);
      setMemberMasterEditDraft({});
    } catch {
      /* handleSaveMasterRecord already toasts */
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
    toast({ title: t.membersPage.inviteCreated, description: t.membersPage.inviteCreatedDesc });
    await fetchInvitesData();
  };

  const handleApproveInviteRequest = async (request: InviteRequestRow) => {
    if (!clubId) return;
    if (!canReviewJoinRequests) {
      toast({ title: t.common.notAuthorized, description: t.membersPage.invitesTabRestrictedDesc, variant: "destructive" });
      return;
    }
    const { data, error } = await supabase.rpc("approve_club_join_request", { _request_id: request.id });
    if (error) {
      toast({ title: t.common.error, description: error.message, variant: "destructive" });
      return;
    }
    const row = Array.isArray(data) ? data[0] : null;
    const outcome = (row?.outcome as string | undefined) || "requires_invite";

    if (outcome === "joined") {
      trackEvent("join_request_approved", { outcome: "joined_directly" });
      setInviteRequests((prev) => prev.map((r) => (r.id === request.id ? { ...r, status: "approved" } : r)));
      toast({ title: t.common.approved, description: t.membersPage.requestApprovedAndJoined });
      return;
    }

    trackEvent("join_request_approved", { outcome: "requires_invite" });
    await handleUpdateInviteRequestStatus(request.id, "approved");
    setInviteEmail(request.email);
    setInviteRole("member");
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
        ["invalid_email", "duplicate_email", "already_in_club"].includes(issue)
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

    const existingDraftEmailSet = new Set(
      memberDrafts
        .filter((item) => item.status === "draft")
        .map((item) => normalizeEmail(item.email))
        .filter(Boolean)
    );

    for (const row of selected) {
      const email = normalizeEmail(row.email);
      if (!email || existingDraftEmailSet.has(email)) {
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
      existingDraftEmailSet.add(email);
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

    void appendMemberAuditEvent({
      clubId,
      draftId: draft.id,
      correlationEmail: normalizeEmail(emailForInvite),
      eventType: "invite_sent",
      summary: "Invite sent",
      detail: { invite_id: result.inviteId },
    });

    toast({ title: t.membersPage.inviteCreated, description: t.membersPage.inviteSentForDraft });
    await fetchMemberDrafts();
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
        toast({
          title: t.common.error,
          description: t.membersPage.resendInviteBlockedUsed,
          variant: "destructive",
        });
        setDraftActionId(null);
        return;
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

    void appendMemberAuditEvent({
      clubId,
      draftId: draft.id,
      correlationEmail: normalizeEmail(emailForInvite),
      eventType: "invite_resent",
      summary: "Invite resent (new link)",
      detail: { invite_id: result.inviteId, previous_invite_id: previousInviteId ?? null },
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
    setDraftResendInviteToken(result.token);
    setDraftResendTokenModalOpen(true);
    toast({ title: t.membersPage.resendInviteSuccessTitle, description: t.membersPage.resendInviteSuccessDesc });
    setDraftActionId(null);
  };

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
      email: draft.email,
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
    setDraftMasterExpanded(false);
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
        masterData: { ...f.masterData, photo_url: data.publicUrl },
      }));
      toast({ title: t.settingsPage.avatarUploadSuccess });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Upload failed";
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
      const message = err instanceof Error ? err.message : "Upload failed";
      toast({
        title: t.settingsPage.avatarUploadFailed,
        description: message.includes("Bucket not found") ? t.settingsPage.avatarUploadBucketHint : message,
        variant: "destructive",
      });
    } finally {
      setBulkAvatarUploadingRowId(null);
    }
  };

  const handleSaveDraftEdit = async () => {
    if (!clubId || !editingDraftId) return;
    setDraftSaving(true);
    const currentDraft = memberDrafts.find((d) => d.id === editingDraftId);
    if (!currentDraft) {
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

    const draftRowUpdate: Record<string, unknown> = {
      name: combinedName || null,
      email: editingDraftForm.email.trim(),
      role: editingDraftForm.role,
      team: editingDraftForm.team || null,
      age_group: editingDraftForm.age_group || null,
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
        email_changed: currentDraft.email.trim() !== editingDraftForm.email.trim(),
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

    setMemberDrafts((prev) =>
      prev.map((d) =>
        d.id === editingDraftId
          ? {
              ...d,
              name: combinedName,
              email: editingDraftForm.email.trim(),
              role: editingDraftForm.role,
              team: editingDraftForm.team || null,
              age_group: editingDraftForm.age_group || null,
              position: editingDraftForm.position || null,
              master_data: masterPayload as Record<string, unknown>,
              invite_id: resolvedInviteId ?? d.invite_id,
            }
          : d,
      ),
    );
    toast({
      title: t.membersPage.draftUpdated,
      description: inviteSyncSkippedUsed ? t.membersPage.inviteSyncSkippedAlreadyJoined : undefined,
    });
    setEditingDraftId(null);
    setDraftSaving(false);
  };

  const handleCancelDraftEdit = () => {
    setEditingDraftId(null);
    setDraftGuardianPickId("");
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

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeaderSlot
        title={t.membersPage.title}
        subtitle={tab === "members" ? t.membersPage.roster : tab === "roles" ? t.membersPage.roles.subtitle : (clubName ? `${clubName} · ${t.membersPage.invites}` : t.membersPage.invites)}
        toolbarRevision={`${tab}-${canManageMembers}-${canReviewJoinRequests}`}
        rightSlot={
          tab === "members" ? (canManageMembers ? (
            <Button
              size="sm"
              className="bg-gradient-gold-static text-primary-foreground font-semibold hover:brightness-110"
              onClick={() => setShowAddMembers(true)}
            >
              <Plus className="w-4 h-4 mr-1" /> {t.membersPage.addMember}
            </Button>
          ) : null) : canReviewJoinRequests ? (
            <Button
              size="sm"
              className="bg-gradient-gold-static text-primary-foreground font-semibold hover:brightness-110"
              onClick={() => {
                setCreatedInviteToken(null);
                setInviteEmail("");
                setInviteRole("member");
                setInviteDays("7");
                setShowCreateInvite(true);
              }}
            >
              <UserPlus className="w-4 h-4 mr-1" /> {t.membersPage.createInvite}
            </Button>
          ) : null
        }
      />

      {/* Tabs */}
      <div className="border-b border-border">
        <div className="container mx-auto px-4 flex gap-1">
          <button
            onClick={() => setTab("members")}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              tab === "members" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Users className="w-4 h-4" /> {t.membersPage.title}
          </button>
          <button
            onClick={() => setTab("invites")}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              tab === "invites" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Inbox className="w-4 h-4" /> {t.membersPage.invites}
          </button>
          {perms.isAdmin && (
            <button
              onClick={() => setTab("roles")}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                tab === "roles" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Shield className="w-4 h-4" /> {t.membersPage.roles.tabLabel}
            </button>
          )}
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        {(clubLoading || loading) ? (
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
            {tab === "roles" && perms.isAdmin && (
              <RoleManager />
            )}
            {tab === "members" ? (
              !canManageMembers ? (
                <div className="rounded-xl bg-card border border-border p-8 text-center">
                  <h2 className="font-display text-lg font-bold text-foreground mb-2">{t.membersPage.membersTabRestrictedTitle}</h2>
                  <p className="text-muted-foreground mb-4">{t.membersPage.membersTabRestrictedDesc}</p>
                  <Button variant="outline" onClick={() => setTab("invites")}>{t.membersPage.switchToInvites}</Button>
                </div>
              ) : (
              <>
            {/* Search & Filter */}
            <div className="flex flex-col sm:flex-row gap-3 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder={t.membersPage.searchMembers}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 bg-card border-border"
                />
                {search.trim() ? (
                  <p className="text-[11px] text-muted-foreground mt-1.5">
                    {debouncedSearch.trim().length >= 2
                      ? "Search runs across the full roster (name, phone, master fields, internal club number). Use paging for more results."
                      : "Type at least 2 characters to search the full roster; shorter text only filters the current page."}
                  </p>
                ) : null}
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {allRoles.map((r) => (
                  <button
                    key={r}
                    onClick={() => setRoleFilter(r)}
                    className={`text-xs font-medium px-3 py-1.5 rounded-full whitespace-nowrap transition-colors ${
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

            {/* Stats (club-wide via RPC; accurate with server-paged roster) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
              {[
                {
                  label: t.membersPage.total,
                  value: clubMemberStats?.total ?? members.length,
                  color: "text-foreground",
                },
                {
                  label: t.membersPage.active,
                  value: clubMemberStats?.active ?? members.filter((m) => m.status === "active").length,
                  color: "text-primary",
                },
                {
                  label: t.common.players,
                  value: clubMemberStats?.players ?? members.filter((m) => m.role === "player").length,
                  color: "text-blue-400",
                },
                {
                  label: t.common.trainers,
                  value: clubMemberStats?.trainers ?? members.filter((m) => m.role === "trainer").length,
                  color: "text-accent",
                },
              ].map((s, i) => (
                <div key={i} className="p-4 rounded-xl bg-card border border-border text-center">
                  <div className={`text-2xl font-display font-bold ${s.color}`}>{s.value}</div>
                  <div className="text-xs text-muted-foreground mt-1">{s.label}</div>
                </div>
              ))}
            </div>

            <div className="rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/12 via-card/90 to-accent/10 p-5 sm:p-6 mb-6 shadow-[0_12px_40px_rgba(0,0,0,0.12)]">
              <div className="flex flex-col lg:flex-row lg:items-center gap-4 lg:gap-6">
                <div className="flex items-start gap-3 flex-1">
                  <div className="rounded-xl bg-primary/15 p-2.5 text-primary shrink-0">
                    <Sparkles className="w-5 h-5" />
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

            <div className="rounded-xl bg-card border border-border p-4 mb-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
                <div>
                  <div className="text-sm font-display font-bold text-foreground tracking-tight">{t.membersPage.savedMemberList}</div>
                  <div className="text-xs text-muted-foreground">{t.membersPage.savedMemberListDesc}</div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-xs text-muted-foreground">
                    {t.membersPage.savedMemberCount
                      .replace("{draftCount}", String(memberDrafts.filter((row) => row.status === "draft").length))
                      .replace("{invitedCount}", String(memberDrafts.filter((row) => row.status === "invited").length))}
                  </div>
                  {memberDrafts.length > 8 && !showAllDrafts ? (
                    <Button variant="link" size="sm" className="h-auto p-0 text-[11px]" onClick={() => setShowAllDrafts(true)}>
                      {t.membersPage.showAllDrafts}
                    </Button>
                  ) : memberDrafts.length > 8 && showAllDrafts ? (
                    <Button variant="link" size="sm" className="h-auto p-0 text-[11px]" onClick={() => setShowAllDrafts(false)}>
                      {t.membersPage.showLessDrafts}
                    </Button>
                  ) : null}
                </div>
              </div>

              {draftsLoading ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="w-4 h-4 animate-spin text-primary" />
                </div>
              ) : memberDrafts.length === 0 ? (
                <div className="text-xs text-muted-foreground py-4">{t.membersPage.savedMemberListEmpty}</div>
              ) : (
                <div className="space-y-2">
                  {(showAllDrafts ? memberDrafts : memberDrafts.slice(0, 8)).map((draft) => (
                    editingDraftId === draft.id ? (
                      <div key={draft.id} className="w-full min-w-0 space-y-4 rounded-lg border-2 border-primary/30 bg-background/60 p-4">
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
                                <Button
                                  type="button"
                                  variant="outline"
                                  className="h-9 text-xs"
                                  onClick={() =>
                                    setEditingDraftForm((f) => ({
                                      ...f,
                                      masterData: { ...f.masterData, photo_url: null },
                                    }))
                                  }
                                  disabled={draftAvatarUploading}
                                >
                                  {t.settingsPage.removeAvatar}
                                </Button>
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
                                  masterData: { ...f.masterData, photo_url: e.target.value || null },
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
                              <SelectTrigger id={`draft-${draft.id}-role`} className="h-10 text-sm">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {SUPPORTED_ROLES.map((r) => (
                                  <SelectItem key={r} value={r} className="text-sm">{getRoleLabel(r)}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <div className="text-xs text-muted-foreground mb-1">{t.membersPage.draftEditLabelTeam}</div>
                            <Input
                              id={`draft-${draft.id}-team`}
                              className="h-10 text-sm"
                              value={editingDraftForm.team}
                              placeholder={t.membersPage.teamPlaceholder}
                              onChange={(e) => setEditingDraftForm((f) => ({ ...f, team: e.target.value }))}
                            />
                          </div>
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
                        <button
                          type="button"
                          className="flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
                          onClick={() => setDraftMasterExpanded((prev) => !prev)}
                        >
                          {draftMasterExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                          {t.membersPage.masterDataFields}
                        </button>
                        {draftMasterExpanded && (
                          <div className="w-full min-w-0 rounded-lg border border-border/40 bg-muted/10 p-3">
                            <MasterDataTabs
                              values={draftMergedMasterForTabs}
                              labels={masterTabLabels}
                              compact
                              avatarUpload={{
                                uploading: draftAvatarUploading,
                                onUpload: (file) => void uploadDraftMemberAvatar(file),
                                onRemove: () =>
                                  setEditingDraftForm((f) => ({
                                    ...f,
                                    masterData: { ...f.masterData, photo_url: null },
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
                        <div className="flex flex-wrap justify-end gap-2">
                          {draft.status === "invited" ? (
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
                          ) : null}
                          <Button size="sm" variant="ghost" onClick={handleCancelDraftEdit} className="h-9 text-sm" disabled={draftSaving}>
                            {t.common.cancel}
                          </Button>
                          <Button size="sm" onClick={() => void handleSaveDraftEdit()} disabled={draftSaving || !editingDraftForm.email.trim()} className="h-9 text-sm">
                            {draftSaving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                            {t.common.save}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div
                        key={draft.id}
                        className="rounded-lg border border-border/60 bg-background/40 p-3 flex items-center justify-between gap-3 cursor-pointer hover:border-primary/30 hover:bg-muted/30 transition-colors"
                        onClick={() => handleStartEditDraft(draft)}
                      >
                        <div className="min-w-0 flex items-center gap-2">
                          <Pencil className="w-3 h-3 text-muted-foreground shrink-0" />
                          <div className="min-w-0">
                            <div className="text-sm font-medium text-foreground truncate">{draft.name || draft.email}</div>
                            <div className="text-xs text-muted-foreground truncate">
                              {draft.email} · {getRoleLabel(draft.role)}
                              {draft.team ? ` · ${draft.team}` : ""}
                              {draft.age_group ? ` · ${draft.age_group}` : ""}
                              {draft.position ? ` · ${draft.position}` : ""}
                            </div>
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
                          ) : null}
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className={savedMemberListRowChipClass}
                            onClick={() =>
                              setHistoryPreview({
                                path: `/members/history/draft/${draft.id}`,
                                displayName: (draft.name?.trim() || draft.email).trim(),
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
                  {memberDrafts.length > 8 && !showAllDrafts ? (
                    <button className="text-[11px] text-primary hover:underline pt-1" onClick={() => setShowAllDrafts(true)}>
                      {t.membersPage.savedMemberListMore.replace("{count}", String(memberDrafts.length - 8))}
                    </button>
                  ) : null}
                </div>
              )}
            </div>

            <div className="rounded-xl bg-card border border-border overflow-hidden">
              {filtered.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground text-sm">
                  {members.length === 0 ? t.membersPage.noMembersYet : t.membersPage.noMembersFound}
                </div>
              ) : (
                <>
                <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/20">
                  <div className="text-xs text-muted-foreground">
                    {filtered.length} match{filtered.length === 1 ? "" : "es"} on this page ·{" "}
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
                {filtered.map((member, i) => {
                  const isOpen = selectedMember?.id === member.id;
                  const rosterGuardianRole =
                    memberPanelEditModeId === member.id ? editMemberForm.role : member.role;
                  return (
                    <Fragment key={member.id}>
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: i * 0.03 }}
                        onClick={() =>
                          setSelectedMember((cur) => {
                            if (cur?.id === member.id) {
                              setMemberPanelEditModeId(null);
                              setMemberMasterEditDraft({});
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
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <Badge variant="secondary" className="text-xs font-normal px-2.5 py-0.5 h-6">
                              {masterRecordCompletenessPct(masterByMembershipId[member.id], member.role)}%
                            </Badge>
                            {masterByMembershipId[member.id]?.membership_kind === "supporting_member" ? (
                              <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-violet-500/10 text-violet-300">
                                {t.membersPage.supportingMember}
                              </span>
                            ) : null}
                            <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${roleColors[member.role] || "bg-muted text-muted-foreground"}`}>
                              {getRoleLabel(member.role)}
                            </span>
                            <span
                              className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                                member.status === "active" ? "bg-emerald-500/10 text-emerald-400" : "bg-muted text-muted-foreground"
                              }`}
                            >
                              {member.status === "active" ? t.common.active : member.status}
                            </span>
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
                          <div className="w-full min-w-0 space-y-3 px-4 pb-4 pt-3 sm:px-5">
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
                                      t.membersPage.askOne4AiPrompt.replace("{name}", getMemberRosterName(member)),
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
                                    {t.membersPage.askOne4Ai}
                                  </Link>
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-9 w-9 rounded-lg"
                                  onClick={() => {
                                    setMemberPanelEditModeId(null);
                                    setMemberMasterEditDraft({});
                                    setSelectedMember(null);
                                  }}
                                  aria-label={t.common.close}
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>

                            {memberPanelEditModeId === member.id ? (
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
                                      <SelectItem value="member">{t.onboarding.member}</SelectItem>
                                      <SelectItem value="player">{t.onboarding.player}</SelectItem>
                                      <SelectItem value="trainer">{t.onboarding.trainer}</SelectItem>
                                      <SelectItem value="staff">{t.onboarding.teamStaff}</SelectItem>
                                      <SelectItem value="parent">{t.onboarding.parentSupporter}</SelectItem>
                                      <SelectItem value="sponsor">{t.onboarding.sponsor}</SelectItem>
                                      <SelectItem value="supplier">{t.onboarding.supplier}</SelectItem>
                                      <SelectItem value="service_provider">{t.onboarding.serviceProvider}</SelectItem>
                                      <SelectItem value="consultant">{t.onboarding.consultant}</SelectItem>
                                      <SelectItem value="admin">{t.onboarding.clubAdmin}</SelectItem>
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
                                <Input
                                  value={editMemberForm.team}
                                  onChange={(event) => setEditMemberForm((previous) => ({ ...previous, team: event.target.value }))}
                                  placeholder={t.membersPage.teamPlaceholder}
                                  className="h-10 bg-background/60"
                                />
                                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                  <Input
                                    value={editMemberForm.ageGroup}
                                    onChange={(event) => setEditMemberForm((previous) => ({ ...previous, ageGroup: event.target.value }))}
                                    placeholder={t.membersPage.ageGroupPlaceholder}
                                    className="h-10 bg-background/60"
                                  />
                                  <Input
                                    value={editMemberForm.position}
                                    onChange={(event) => setEditMemberForm((previous) => ({ ...previous, position: event.target.value }))}
                                    placeholder={t.membersPage.positionPlaceholder}
                                    className="h-10 bg-background/60"
                                  />
                                </div>
                              </div>
                            ) : null}

                            <div className="w-full min-w-0 rounded-lg border border-border/40 bg-muted/10 p-3">
                              <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
                                <UserCircle2 className="w-4 h-4 text-primary" /> {t.membersPage.masterDataFields}
                              </div>
                              <MasterDataTabs
                                values={
                                  memberPanelEditModeId === member.id
                                    ? memberMasterEditDraft
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
                                logoSrc={logo}
                                membershipRole={
                                  memberPanelEditModeId === member.id ? editMemberForm.role : member.role
                                }
                                teamLabel={
                                  memberPanelEditModeId === member.id
                                    ? editMemberForm.team.trim() || getMemberTeamLabel(member)
                                    : getMemberTeamLabel(member)
                                }
                                email={membershipEmails[member.id] ?? null}
                                avatarUpload={
                                  memberPanelEditModeId === member.id && perms.isAdmin
                                    ? {
                                        uploading: memberPanelAvatarUploading,
                                        onUpload: (file) => void uploadMemberPanelAvatar(member.id, file),
                                        onRemove: () =>
                                          setMemberMasterEditDraft((d) => ({ ...d, photo_url: null })),
                                      }
                                    : undefined
                                }
                                onChange={
                                  memberPanelEditModeId === member.id
                                    ? (key, value) =>
                                        setMemberMasterEditDraft((d) => ({ ...d, [key]: value }))
                                    : undefined
                                }
                                safetyTabExtraEnabled={isPlayerRole(rosterGuardianRole)}
                                safetyTabExtra={renderGuardiansSafetyTabExtra(member, rosterGuardianRole)}
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

                            <div className="flex flex-col gap-2 pt-2 sm:flex-row">
                              {memberPanelEditModeId === member.id ? (
                                <>
                                  <Button
                                    size="sm"
                                    className="w-full bg-gradient-gold-static font-semibold text-primary-foreground hover:brightness-110 sm:flex-1"
                                    disabled={memberPanelSaving}
                                    onClick={() => void saveMemberPanelInline(member)}
                                  >
                                    {memberPanelSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                    {t.common.save}
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="w-full sm:flex-1"
                                    disabled={memberPanelSaving}
                                    onClick={cancelMemberPanelEdit}
                                  >
                                    {t.common.cancel}
                                  </Button>
                                </>
                              ) : (
                                <>
                                  <Button
                                    size="sm"
                                    className="w-full bg-gradient-gold-static font-semibold text-primary-foreground hover:brightness-110 sm:flex-1"
                                    onClick={() => setShowMasterDialog(true)}
                                  >
                                    <Sparkles className="mr-2 h-4 w-4" /> {t.membersPage.openFullRegistry}
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
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="sm:flex-1 border-accent/30 text-accent hover:bg-accent/10"
                                    onClick={() => handleDeleteMember(member.id)}
                                  >
                                    {t.common.remove}
                                  </Button>
                                </>
                              )}
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
          </>
              )
            ) : (
              <>
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
                              {r.message && <div className="text-xs text-muted-foreground mt-2 leading-relaxed">{r.message}</div>}
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
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <div className="text-sm font-display font-bold text-foreground tracking-tight flex items-center gap-2">
                            <Link2 className="w-4 h-4 text-primary" /> {t.membersPage.activeInvites}
                          </div>
                          <div className="text-xs text-muted-foreground">{t.membersPage.tokensHashedHint}</div>
                        </div>
                      </div>

                      {invites.length === 0 ? (
                        <div className="text-sm text-muted-foreground py-8 text-center">{t.membersPage.noInvitesYet}</div>
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
                              <SelectItem value="member" className="rounded-lg">{t.onboarding.member}</SelectItem>
                              <SelectItem value="player" className="rounded-lg">{t.onboarding.player}</SelectItem>
                              <SelectItem value="trainer" className="rounded-lg">{t.onboarding.trainer}</SelectItem>
                              <SelectItem value="admin" className="rounded-lg">{t.onboarding.clubAdmin}</SelectItem>
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
                                  const qs = new URLSearchParams({ invite: createdInviteToken });
                                  if (clubSlug) qs.set("club", clubSlug);
                                  const link = `${window.location.origin}/onboarding?${qs.toString()}`;
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
              </>
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
                <h3 className="font-display font-bold text-foreground tracking-tight">{t.membersPage.resendInviteModalTitle}</h3>
                <p className="text-xs text-muted-foreground mt-1">{t.membersPage.resendInviteModalDesc}</p>
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
                    const qs = new URLSearchParams({ invite: draftResendInviteToken });
                    if (clubSlug) qs.set("club", clubSlug);
                    const link = `${window.location.origin}/onboarding?${qs.toString()}`;
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
                  onChange={async (event) => {
                    const file = event.target.files?.[0];
                    if (!file) return;
                    await handleImportSpreadsheet(file);
                    event.currentTarget.value = "";
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

            {importSummary && (
              <div className="mb-4 rounded-2xl border border-border/60 bg-background/40 p-3 text-xs">
                <div className="font-medium text-foreground mb-1">{t.membersPage.importValidationReport}</div>
                <div className="text-muted-foreground">
                  {t.membersPage.importValidationReportDesc
                    .replace("{imported}", String(importSummary.imported))
                    .replace("{usable}", String(importSummary.usable))
                    .replace("{invalidEmail}", String(importSummary.invalidEmail))
                    .replace("{duplicateInFile}", String(importSummary.duplicateInFile))
                    .replace("{unknownRole}", String(importSummary.unknownRole))}
                </div>
              </div>
            )}

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
                            <SelectItem value="member">{t.onboarding.member}</SelectItem>
                            <SelectItem value="player">{t.onboarding.player}</SelectItem>
                            <SelectItem value="trainer">{t.onboarding.trainer}</SelectItem>
                            <SelectItem value="staff">{t.onboarding.teamStaff}</SelectItem>
                            <SelectItem value="parent">{t.onboarding.parentSupporter}</SelectItem>
                            <SelectItem value="sponsor">{t.onboarding.sponsor}</SelectItem>
                            <SelectItem value="supplier">{t.onboarding.supplier}</SelectItem>
                            <SelectItem value="service_provider">{t.onboarding.serviceProvider}</SelectItem>
                            <SelectItem value="consultant">{t.onboarding.consultant}</SelectItem>
                            <SelectItem value="admin">{t.onboarding.clubAdmin}</SelectItem>
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
                                  issue === "unknown_role"
                                    ? "bg-amber-500/10 text-amber-500"
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

      {selectedMember ? (
        <MemberMasterDialog
          open={showMasterDialog}
          onOpenChange={setShowMasterDialog}
          membershipId={selectedMember.id}
          displayName={getMemberRosterName(selectedMember)}
          email={membershipEmails[selectedMember.id] ?? null}
          membershipRole={selectedMember.role}
          teamLabel={getMemberTeamLabel(selectedMember)}
          clubName={clubName}
          logoSrc={logo}
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
            await handleSaveMasterRecord(selectedMember, payload);
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
                onChange={async (event) => {
                  const file = event.target.files?.[0];
                  if (file) await handlePrepareRegistryImport(file);
                  event.currentTarget.value = "";
                }}
              />
              <span className="inline-flex items-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium cursor-pointer hover:bg-accent hover:text-accent-foreground">
                <Upload className="w-4 h-4 mr-2" /> {t.membersPage.importSpreadsheet}
              </span>
            </label>
            {registryImportBusy ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : registryImportPreview.length > 0 ? (
              <div className="rounded-xl border border-border overflow-hidden overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-muted/50">
                    <tr className="text-left">
                      <th className="px-2 py-2">{t.membersPage.registryImportMatched}</th>
                      <th className="px-2 py-2">{t.membersPage.registryImportEmailColumn}</th>
                      <th className="px-2 py-2">{t.membersPage.registryImportMissing}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {registryImportPreview.map((row, idx) => (
                      <tr key={`${row.email}-${idx}`} className="border-t border-border/60">
                        <td className="px-2 py-2">{row.membershipId ? "✓" : "—"}</td>
                        <td className="px-2 py-2 font-mono truncate max-w-[220px]">{row.email}</td>
                        <td className="px-2 py-2 text-amber-600">{row.missing.join(", ")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowRegistryImport(false)}>{t.common.cancel}</Button>
              <Button
                className="bg-gradient-gold-static text-primary-foreground"
                disabled={registryImportBusy || !registryImportPreview.some((r) => r.membershipId)}
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
