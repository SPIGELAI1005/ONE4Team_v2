import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/hooks/use-language";
import { motion } from "framer-motion";
import AppHeader from "@/components/layout/AppHeader";
import {
  Users, Search, Plus, ArrowLeft,
  Shield, Dumbbell, Crown, UserCheck, Heart, MoreHorizontal,
  Mail, Phone, Calendar, Loader2,
  Link2, Copy, Check, Inbox, UserPlus, Clock, X, Upload, Download
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useClubId } from "@/hooks/use-club-id";
import { usePermissions } from "@/hooks/use-permissions";
import logo from "@/assets/one4team-logo.png";

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

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

const Members = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useLanguage();
  const { clubId, loading: clubLoading } = useClubId();
  const perms = usePermissions();
  const [tab, setTab] = useState<"members" | "invites">("members");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMember, setSelectedMember] = useState<MemberRow | null>(null);

  const [inviteRequests, setInviteRequests] = useState<InviteRequestRow[]>([]);
  const [inviteReqFilter, setInviteReqFilter] = useState<"pending" | "approved" | "rejected" | "all">("pending");
  const [invites, setInvites] = useState<ClubInviteRow[]>([]);
  const [invitesLoading, setInvitesLoading] = useState(false);
  const [memberDrafts, setMemberDrafts] = useState<MemberDraftRow[]>([]);
  const [draftsLoading, setDraftsLoading] = useState(false);
  const [draftActionId, setDraftActionId] = useState<string | null>(null);
  const [joinReviewerPolicy, setJoinReviewerPolicy] = useState<"admin_only" | "admin_trainer">("admin_only");
  const [clubSlug, setClubSlug] = useState<string | null>(null);
  const [clubName, setClubName] = useState<string | null>(null);

  const [showCreateInvite, setShowCreateInvite] = useState(false);
  const [showAddMembers, setShowAddMembers] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("member");
  const [inviteDays, setInviteDays] = useState("7");
  const [createdInviteToken, setCreatedInviteToken] = useState<string | null>(null);
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
    },
  ]);
  const [bulkSubmitting, setBulkSubmitting] = useState(false);
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

  // Reset page state on club switch to prevent cross-club flashes
  useEffect(() => {
    setMembers([]);
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

    setSearch("");
    setRoleFilter("all");
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
    const xlsx = await import("xlsx");

    const templateData: (string | number)[][] = [
      ["ONE4Team - Members Import Template"],
      ["Fill the rows below and keep the header names exactly as provided."],
      ["Required for import: email, role. Additional profile fields are optional and can be used as rich member records."],
      [],
      [
        "title",
        "salutation",
        "first_name",
        "last_name",
        "birth_name",
        "nickname",
        "birth_date",
        "email",
        "email_secondary",
        "mobile",
        "phone",
        "street",
        "house_number",
        "postal_code",
        "city",
        "country",
        "membership_number",
        "membership_status",
        "member_since",
        "member_until",
        "role",
        "team",
        "age_group",
        "position",
        "department",
        "notes",
      ],
      [
        "",
        "Mr",
        "Alex",
        "Example",
        "",
        "Lex",
        "2008-05-20",
        "alex@example.com",
        "",
        "+4915112345678",
        "",
        "Musterstr.",
        "10",
        "80999",
        "Munich",
        "DE",
        "M-1001",
        "active",
        "2023-07-01",
        "",
        "player",
        "U16",
        "U16",
        "Midfield",
        "Youth",
        "",
      ],
      [
        "",
        "Ms",
        "Sam",
        "Trainer",
        "",
        "",
        "1990-09-11",
        "sam@example.com",
        "",
        "",
        "+49891234567",
        "Sportweg",
        "4",
        "80331",
        "Munich",
        "DE",
        "M-1002",
        "active",
        "2022-01-15",
        "",
        "trainer",
        "Senior",
        "Adult",
        "Head Coach",
        "Football",
        "UEFA B",
      ],
    ];

    const currentMembersData: (string | number)[][] = [
      ["ONE4Team - Current Members Snapshot"],
      ["This sheet is generated from your current members overview and includes profile placeholders for richer member management."],
      ["Only core app fields are currently auto-filled from this page (name, role, team, age_group, position, status, joined_at)."],
      [],
      [
        "title",
        "salutation",
        "first_name",
        "last_name",
        "birth_name",
        "nickname",
        "birth_date",
        "email",
        "email_secondary",
        "mobile",
        "phone",
        "street",
        "house_number",
        "postal_code",
        "city",
        "country",
        "membership_number",
        "membership_status",
        "member_since",
        "member_until",
        "role",
        "team",
        "age_group",
        "position",
        "department",
        "notes",
        "joined_at",
      ],
      ...members.map((member) => [
        "",
        "",
        (member.profiles?.display_name || "").split(" ").slice(0, -1).join(" "),
        (member.profiles?.display_name || "").split(" ").slice(-1).join(" "),
        "",
        "",
        "",
        "",
        "",
        member.profiles?.phone || "",
        "",
        "",
        "",
        "",
        "",
        "",
        member.status,
        "",
        "",
        member.role,
        member.team || "",
        member.age_group || "",
        member.position || "",
        "",
        "",
        new Date(member.created_at).toLocaleDateString(),
      ]),
    ];

    const workbook = xlsx.utils.book_new();
    const templateSheet = xlsx.utils.aoa_to_sheet(templateData);
    const membersSheet = xlsx.utils.aoa_to_sheet(currentMembersData);

    templateSheet["!cols"] = [
      { wch: 10 },
      { wch: 12 },
      { wch: 16 },
      { wch: 16 },
      { wch: 14 },
      { wch: 14 },
      { wch: 12 },
      { wch: 30 },
      { wch: 28 },
      { wch: 16 },
      { wch: 16 },
      { wch: 16 },
      { wch: 12 },
      { wch: 10 },
      { wch: 14 },
      { wch: 14 },
      { wch: 16 },
      { wch: 16 },
      { wch: 14 },
      { wch: 14 },
      { wch: 16 },
      { wch: 14 },
      { wch: 14 },
      { wch: 18 },
      { wch: 14 },
      { wch: 24 },
    ];
    membersSheet["!cols"] = [
      { wch: 10 },
      { wch: 12 },
      { wch: 16 },
      { wch: 16 },
      { wch: 14 },
      { wch: 14 },
      { wch: 12 },
      { wch: 30 },
      { wch: 28 },
      { wch: 16 },
      { wch: 16 },
      { wch: 16 },
      { wch: 12 },
      { wch: 10 },
      { wch: 14 },
      { wch: 14 },
      { wch: 16 },
      { wch: 16 },
      { wch: 14 },
      { wch: 14 },
      { wch: 16 },
      { wch: 14 },
      { wch: 14 },
      { wch: 18 },
      { wch: 14 },
      { wch: 24 },
      { wch: 14 },
    ];

    xlsx.utils.book_append_sheet(workbook, templateSheet, "Import Template");
    xlsx.utils.book_append_sheet(workbook, membersSheet, "Current Members");
    xlsx.writeFile(workbook, "one4team-members-import-template.xlsx");
  };

  const createInviteRecord = async (
    emailValue: string,
    roleValue: string,
    daysValue: string,
    payload?: { name?: string; team?: string; age_group?: string; position?: string }
  ) => {
    if (!clubId) return { ok: false as const, error: t.membersPage.noClubSelected };
    const token = generateToken();
    const tokenHash = await hashToken(token);
    const days = Number(daysValue);
    const expiresAt = Number.isFinite(days) && days > 0
      ? new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString()
      : null;

    const { error } = await supabase
      .from("club_invites")
      .insert({
        club_id: clubId,
        email: emailValue.trim().toLowerCase() || null,
        role: roleValue,
        token_hash: tokenHash,
        expires_at: expiresAt,
        invite_payload: payload ?? {},
      });
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const, token };
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

  const canManageMembers = perms.isAdmin;
  const canReviewJoinRequests = perms.isAdmin || (perms.isTrainer && joinReviewerPolicy === "admin_trainer");
  const canAccessMembersPage = perms.isAdmin || perms.isTrainer;

  // Fetch members
  useEffect(() => {
    if (!clubId) return;
    const fetchMembers = async () => {
      setLoading(true);
      const { data: membershipData, error: membershipError } = await supabase
        .from("club_memberships")
        .select("*")
        .eq("club_id", clubId)
        .order("created_at", { ascending: false });

      if (membershipError) {
        toast({ title: t.membersPage.errorLoadingMembers, description: membershipError.message, variant: "destructive" });
      } else {
        const memberships = (membershipData as unknown as MemberRow[]) || [];
        const userIds = Array.from(new Set(memberships.map((item) => item.user_id))).filter(Boolean);

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
              ((profileData as MemberRow["profiles"][]) || []).map((profile) => [profile.user_id, profile])
            );
          }
        }

        setMembers(
          memberships.map((membership) => ({
            ...membership,
            profiles: profileByUserId.get(membership.user_id),
          }))
        );
      }
      setLoading(false);
    };
    void fetchMembers();
  }, [clubId, toast, t]);

  useEffect(() => {
    if (tab !== "invites") return;
    if (!clubId) return;
    if (!canAccessMembersPage) return;
    void fetchInvitesData();
  }, [tab, clubId, canAccessMembersPage, fetchInvitesData]);

  useEffect(() => {
    if (tab !== "members") return;
    if (!clubId) return;
    if (!perms.isAdmin) return;
    void fetchMemberDrafts();
  }, [tab, clubId, perms.isAdmin, fetchMemberDrafts]);

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

  const filtered = members.filter((m) => {
    const name = (m.profiles?.display_name || "").toLowerCase();
    const phoneValue = (m.profiles?.phone || "").toLowerCase();
    const query = search.toLowerCase();
    const matchSearch = name.includes(query) || phoneValue.includes(query);
    const matchRole = roleFilter === "all" || m.role === roleFilter;
    return matchSearch && matchRole;
  });

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
      toast({ title: t.membersPage.memberRemoved });
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

    const response = await createInviteRecord(prefillEmail ?? inviteEmail, inviteRole, inviteDays);
    if (!response.ok) {
      toast({ title: "Error", description: response.error, variant: "destructive" });
      return;
    }

    setCreatedInviteToken(response.token);
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
      setInviteRequests((prev) => prev.map((r) => (r.id === request.id ? { ...r, status: "approved" } : r)));
      toast({ title: t.common.approved, description: t.membersPage.requestApprovedAndJoined });
      return;
    }

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

      const { error } = await supabase.from("club_member_drafts").insert({
        club_id: clubId,
        name: row.name.trim() || null,
        email,
        role: row.role,
        team: row.team.trim() || null,
        age_group: row.ageGroup.trim() || null,
        position: row.position.trim() || null,
      });
      if (error) {
        skippedCount += 1;
        continue;
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
    const result = await createInviteRecord(draft.email, draft.role, inviteDays, {
      name: draft.name || undefined,
      team: draft.team || undefined,
      age_group: draft.age_group || undefined,
      position: draft.position || undefined,
    });
    if (!result.ok) {
      toast({ title: t.common.error, description: result.error, variant: "destructive" });
      setDraftActionId(null);
      return;
    }

    const { error } = await supabase
      .from("club_member_drafts")
      .update({ status: "invited", invited_at: new Date().toISOString() })
      .eq("id", draft.id)
      .eq("club_id", clubId);
    if (error) {
      toast({ title: t.common.error, description: error.message, variant: "destructive" });
      setDraftActionId(null);
      return;
    }

    toast({ title: t.membersPage.inviteCreated, description: t.membersPage.inviteSentForDraft });
    await fetchMemberDrafts();
    setDraftActionId(null);
  };

  const handleDeleteDraft = async (draftId: string) => {
    if (!clubId || draftActionId) return;
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
    setMemberDrafts((previous) => previous.filter((row) => row.id !== draftId));
    setDraftActionId(null);
  };

  const handleCopy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader
        title={t.membersPage.title}
        subtitle={tab === "members" ? t.membersPage.roster : (clubName ? `${clubName} · ${t.membersPage.invites}` : t.membersPage.invites)}
        rightSlot={
          tab === "members" ? (canManageMembers ? (
            <Button
              size="sm"
              className="bg-gradient-gold-static text-primary-foreground font-semibold hover:brightness-110"
              onClick={() => setShowAddMembers(true)}
            >
              <Plus className="w-4 h-4 mr-1" /> {t.membersPage.addMember}
            </Button>
          ) : null) : (
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
          )
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

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
              {[
                { label: t.membersPage.total, value: members.length, color: "text-foreground" },
                { label: t.membersPage.active, value: members.filter(m => m.status === "active").length, color: "text-primary" },
                { label: t.common.players, value: members.filter(m => m.role === "player").length, color: "text-blue-400" },
                { label: t.common.trainers, value: members.filter(m => m.role === "trainer").length, color: "text-accent" },
              ].map((s, i) => (
                <div key={i} className="p-4 rounded-xl bg-card border border-border text-center">
                  <div className={`text-2xl font-display font-bold ${s.color}`}>{s.value}</div>
                  <div className="text-xs text-muted-foreground mt-1">{s.label}</div>
                </div>
              ))}
            </div>

            <div className="rounded-xl bg-card border border-border p-4 mb-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
                <div>
                  <div className="text-sm font-display font-bold text-foreground tracking-tight">{t.membersPage.savedMemberList}</div>
                  <div className="text-xs text-muted-foreground">{t.membersPage.savedMemberListDesc}</div>
                </div>
                <div className="text-xs text-muted-foreground">
                  {t.membersPage.savedMemberCount
                    .replace("{draftCount}", String(memberDrafts.filter((row) => row.status === "draft").length))
                    .replace("{invitedCount}", String(memberDrafts.filter((row) => row.status === "invited").length))}
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
                  {memberDrafts.slice(0, 8).map((draft) => (
                    <div key={draft.id} className="rounded-lg border border-border/60 bg-background/40 p-3 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-foreground truncate">{draft.name || draft.email}</div>
                        <div className="text-xs text-muted-foreground truncate">
                          {draft.email} · {getRoleLabel(draft.role)}
                          {draft.team ? ` · ${draft.team}` : ""}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                          draft.status === "invited" ? "bg-emerald-500/10 text-emerald-400" : "bg-muted text-muted-foreground"
                        }`}>
                          {draft.status === "invited" ? t.membersPage.invited : t.membersPage.draft}
                        </span>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={draft.status !== "draft" || draftActionId === draft.id}
                          onClick={() => handleSendInviteForDraft(draft)}
                          className="h-7 text-[10px]"
                        >
                          {draftActionId === draft.id ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Link2 className="w-3 h-3 mr-1" />}
                          {t.membersPage.sendInvite}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={draftActionId === draft.id}
                          onClick={() => handleDeleteDraft(draft.id)}
                          className="h-7 px-2 text-[10px] text-muted-foreground"
                        >
                          {t.common.remove}
                        </Button>
                      </div>
                    </div>
                  ))}
                  {memberDrafts.length > 8 ? (
                    <div className="text-[11px] text-muted-foreground pt-1">
                      {t.membersPage.savedMemberListMore.replace("{count}", String(memberDrafts.length - 8))}
                    </div>
                  ) : null}
                </div>
              )}
            </div>

            <div className="flex gap-6">
              {/* Members List */}
              <div className={`flex-1 ${selectedMember ? "hidden lg:block" : ""}`}>
                <div className="rounded-xl bg-card border border-border overflow-hidden">
                  {filtered.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground text-sm">
                      {members.length === 0 ? t.membersPage.noMembersYet : t.membersPage.noMembersFound}
                    </div>
                  ) : (
                    filtered.map((member, i) => (
                      <motion.div
                        key={member.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: i * 0.03 }}
                        onClick={() => setSelectedMember(member)}
                        className={`px-4 py-3 border-b border-border last:border-0 cursor-pointer hover:bg-muted/50 transition-colors ${
                          selectedMember?.id === member.id ? "bg-muted/50" : ""
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg bg-gradient-gold flex items-center justify-center text-primary-foreground font-bold text-sm shrink-0">
                              {(member.profiles?.display_name || "?").split(" ").map(n => n[0]).join("").slice(0, 2)}
                            </div>
                            <div>
                              <div className="text-sm font-medium text-foreground">{member.profiles?.display_name || "Unknown"}</div>
                              <div className="text-xs text-muted-foreground">{member.team || t.membersPage.noTeam}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${roleColors[member.role] || "bg-muted text-muted-foreground"}`}>
                              {getRoleLabel(member.role)}
                            </span>
                            <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                              member.status === "active" ? "bg-emerald-500/10 text-emerald-400" : "bg-muted text-muted-foreground"
                            }`}>
                              {member.status === "active" ? t.common.active : member.status}
                            </span>
                          </div>
                        </div>
                      </motion.div>
                    ))
                  )}
                </div>
              </div>

              {/* Detail Panel */}
              {selectedMember && (
                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="w-full lg:w-80 shrink-0">
                  <div className="rounded-xl bg-card border border-border p-5 sticky top-24">
                    <div className="flex items-center justify-between mb-4 lg:hidden">
                      <span className="text-sm text-muted-foreground">{t.membersPage.details}</span>
                      <Button variant="ghost" size="sm" onClick={() => setSelectedMember(null)}>
                        <ArrowLeft className="w-4 h-4 mr-1" /> {t.common.back}
                      </Button>
                    </div>
                    <div className="text-center mb-5">
                      <div className="w-16 h-16 rounded-xl bg-gradient-gold flex items-center justify-center text-primary-foreground font-bold text-xl mx-auto mb-3">
                        {(selectedMember.profiles?.display_name || "?").split(" ").map(n => n[0]).join("").slice(0, 2)}
                      </div>
                      <h3 className="font-display font-bold text-foreground">{selectedMember.profiles?.display_name}</h3>
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full inline-block mt-2 ${roleColors[selectedMember.role]}`}>
                        {getRoleLabel(selectedMember.role)}
                      </span>
                    </div>

                    <div className="space-y-3 text-sm">
                      {selectedMember.profiles?.phone && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Phone className="w-4 h-4" /> {selectedMember.profiles.phone}
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Users className="w-4 h-4" /> {selectedMember.team || t.membersPage.noTeam}
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="w-4 h-4" /> {t.membersPage.joined} {new Date(selectedMember.created_at).toLocaleDateString()}
                      </div>
                    </div>

                    {(selectedMember.position || selectedMember.age_group) && (
                      <div className="mt-4 pt-4 border-t border-border">
                        <h4 className="text-xs font-medium text-muted-foreground mb-2">{t.membersPage.playerAttributes}</h4>
                        <div className="grid grid-cols-2 gap-2">
                          {selectedMember.position && (
                            <div className="p-2 rounded-lg bg-muted/50">
                              <div className="text-[10px] text-muted-foreground">{t.membersPage.position}</div>
                              <div className="text-sm font-medium text-foreground">{selectedMember.position}</div>
                            </div>
                          )}
                          {selectedMember.age_group && (
                            <div className="p-2 rounded-lg bg-muted/50">
                              <div className="text-[10px] text-muted-foreground">{t.membersPage.ageGroup}</div>
                              <div className="text-sm font-medium text-foreground">{selectedMember.age_group}</div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="mt-4 pt-4 border-t border-border flex gap-2">
                      <Button variant="outline" size="sm" className="flex-1">{t.common.edit}</Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 text-accent border-accent/30 hover:bg-accent/10"
                        onClick={() => handleDeleteMember(selectedMember.id)}
                      >
                        {t.common.remove}
                      </Button>
                    </div>
                  </div>
                </motion.div>
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
                <select
                  value={inviteDays}
                  onChange={(event) => setInviteDays(event.target.value)}
                  className="h-9 rounded-xl border border-border bg-background/60 px-3 text-sm text-foreground"
                >
                  <option value="1">{t.membersPage.day1}</option>
                  <option value="3">{t.membersPage.days3}</option>
                  <option value="7">{t.membersPage.days7}</option>
                  <option value="14">{t.membersPage.days14}</option>
                  <option value="0">{t.membersPage.noExpiryOption}</option>
                </select>
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

            <div className="rounded-2xl border border-border/60 overflow-hidden max-h-[52vh] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-background/70 sticky top-0">
                  <tr className="text-left text-xs text-muted-foreground">
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
                  {bulkRows.map((row) => (
                    <tr key={row.id} className="border-t border-border/50">
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
                        <select
                          value={row.role}
                          onChange={(event) => {
                            const parsedRole = normalizeRole(event.target.value);
                            updateDraftRow(row.id, "role", parsedRole.role);
                            updateDraftRow(row.id, "unknownRole", false);
                          }}
                          className="w-full h-10 rounded-xl border border-border bg-background/60 px-3 text-sm text-foreground"
                        >
                          <option value="member">{t.onboarding.member}</option>
                          <option value="player">{t.onboarding.player}</option>
                          <option value="trainer">{t.onboarding.trainer}</option>
                          <option value="staff">{t.onboarding.teamStaff}</option>
                          <option value="parent">{t.onboarding.parentSupporter}</option>
                          <option value="sponsor">{t.onboarding.sponsor}</option>
                          <option value="supplier">{t.onboarding.supplier}</option>
                          <option value="service_provider">{t.onboarding.serviceProvider}</option>
                          <option value="consultant">{t.onboarding.consultant}</option>
                          <option value="admin">{t.onboarding.clubAdmin}</option>
                        </select>
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
                        <Button variant="ghost" size="icon" onClick={() => removeDraftRow(row.id)} disabled={bulkRows.length <= 1}>
                          <X className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex items-center justify-between gap-3">
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
    </div>
  );
};

export default Members;
