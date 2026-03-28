import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { DashboardHeaderSlot } from "@/components/layout/DashboardHeaderSlot";
import {
  Plus, Trophy, Dumbbell, Loader2,
  Calendar, MapPin, Clock, Trash2, X, LayoutGrid, AlertTriangle, CheckCircle2, ShieldCheck, Pencil, Layers3, Building2, ChevronDown, UploadCloud
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/useAuth";
import { useClubId } from "@/hooks/use-club-id";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { usePermissions } from "@/hooks/use-permissions";
import { useLanguage } from "@/hooks/use-language";
import { resolveSportId, resolveSportLabel, SPORTS_CATALOG } from "@/lib/sports";
import { useLocation } from "react-router-dom";

type Team = {
  id: string;
  name: string;
  sport: string;
  age_group: string | null;
  coach_name: string | null;
  league: string | null;
  created_at: string;
};

type ClubMembershipOption = {
  id: string;
  user_id: string;
  role: string;
  display_name: string;
};

type TrainingSession = {
  id: string;
  title: string;
  location: string | null;
  starts_at: string;
  ends_at: string | null;
  team_id: string | null;
  teams?: { name: string } | null;
};

type ClubPitch = {
  id: string;
  club_id: string;
  name: string;
  grid_cells: number[];
  notes: string | null;
  parent_pitch_id: string | null;
  layer_id: string | null;
  element_type: "pitch" | "clubhouse" | "street" | "garage" | "stadium" | "parking" | "storage" | "other";
  display_color: string | null;
  created_at: string;
};

type ClubAssetLayer = {
  id: string;
  club_id: string;
  name: string;
  purpose: "training" | "administration" | "operations" | "other";
  description: string | null;
  is_default: boolean;
  created_at: string;
};

type PitchBooking = {
  id: string;
  club_id: string;
  pitch_id: string;
  team_id: string | null;
  booking_type: "training" | "match" | "other";
  title: string;
  starts_at: string;
  ends_at: string;
  status: "booked" | "cancelled";
  created_by: string | null;
  needs_reconfirmation: boolean;
  reconfirmation_status: "not_required" | "pending" | "confirmed" | "declined";
  overridden_by_booking_id: string | null;
  reconfirmation_requested_at: string | null;
  created_at: string;
};

type EnrichedPitchBooking = PitchBooking & {
  pitchName: string;
  teamName: string | null;
  hasConflict: boolean;
};

type ChangeHistoryItem = {
  id: string;
  club_id: string;
  scope: "teams" | "sessions" | "uploads";
  action: "create" | "update" | "delete" | "upload";
  entity_type: string;
  entity_id: string | null;
  details: Record<string, unknown>;
  created_by: string | null;
  created_at: string;
};

const GRID_SIZE = 13;
const GRID_CELLS = GRID_SIZE * GRID_SIZE;
const GRID_LABEL = `${GRID_SIZE}x${GRID_SIZE}`;
const PITCH_COLORS = ["#22c55e", "#0ea5e9", "#8b5cf6", "#f59e0b", "#f43f5e", "#06b6d4"];
const EXTRA_ELEMENT_SWATCHES = ["#ec4899", "#14b8a6", "#eab308", "#78716c", "#a855f7", "#64748b"];
const ELEMENT_COLOR_SWATCHES = [...PITCH_COLORS, ...EXTRA_ELEMENT_SWATCHES];
const PROPERTY_ELEMENT_TYPES: Array<ClubPitch["element_type"]> = ["pitch", "clubhouse", "street", "garage", "stadium", "parking", "storage", "other"];
const TRAINING_LAYER_FILTER_ID = "purpose:training";
const ADMIN_LAYER_FILTER_ID = "purpose:administration";

function fillTemplate(template: string, values: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => values[key] ?? `{${key}}`);
}

/** English fallback when called with one argument (e.g. stale chunk); pass `t.teamsPage.elementTypes` as second arg for full i18n. */
const DEFAULT_ELEMENT_TYPE_LABELS: Record<ClubPitch["element_type"], string> = {
  pitch: "Pitch",
  clubhouse: "Club house",
  street: "Street",
  garage: "Garage",
  stadium: "Stadium",
  parking: "Parking",
  storage: "Storage",
  other: "Other area",
};

function formatElementTypeLabel(
  value: ClubPitch["element_type"],
  labels: Record<ClubPitch["element_type"], string> = DEFAULT_ELEMENT_TYPE_LABELS,
): string {
  return labels[value] ?? DEFAULT_ELEMENT_TYPE_LABELS[value] ?? value;
}

function overlaps(aStartIso: string, aEndIso: string, bStartIso: string, bEndIso: string): boolean {
  const aStart = new Date(aStartIso).getTime();
  const aEnd = new Date(aEndIso).getTime();
  const bStart = new Date(bStartIso).getTime();
  const bEnd = new Date(bEndIso).getTime();
  return aStart < bEnd && aEnd > bStart;
}

function isSubset(small: number[], big: number[]): boolean {
  if (small.length === 0) return false;
  const bigSet = new Set(big);
  return small.every((cell) => bigSet.has(cell));
}

function normalizeHexColor(input: string): string | null {
  let s = input.trim();
  if (!s) return null;
  if (!s.startsWith("#")) s = `#${s}`;
  if (s.length === 4 && /^#[0-9a-fA-F]{3}$/i.test(s)) {
    s = `#${s[1]}${s[1]}${s[2]}${s[2]}${s[3]}${s[3]}`;
  }
  if (!/^#[0-9a-fA-F]{6}$/i.test(s)) return null;
  return s.toLowerCase();
}

function suggestColorByIndex(index: number): string {
  const i = ((index % PITCH_COLORS.length) + PITCH_COLORS.length) % PITCH_COLORS.length;
  return PITCH_COLORS[i];
}

function ensureHexForPicker(input: string): string {
  return normalizeHexColor(input) ?? "#22c55e";
}

function hexToRgba(hex: string, alpha: number): string {
  const normalized = ensureHexForPicker(hex).replace("#", "");
  const bigint = Number.parseInt(normalized, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function mixedCellBackground(colors: string[]): string {
  if (colors.length === 0) return "transparent";
  if (colors.length === 1) return hexToRgba(colors[0], 0.65);

  const uniqueColors = [...new Set(colors)];
  const step = 100 / uniqueColors.length;
  const segments = uniqueColors.map((color, index) => {
    const from = Number((index * step).toFixed(2));
    const to = Number(((index + 1) * step).toFixed(2));
    return `${hexToRgba(color, 0.74)} ${from}% ${to}%`;
  });
  return `linear-gradient(135deg, ${segments.join(", ")})`;
}

function isMissingRelationError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const message = String((error as { message?: unknown }).message ?? "");
  return message.includes("Could not find the table") || message.includes("does not exist");
}

function resolveLayerFilterPurpose(filterId: string): ClubAssetLayer["purpose"] | null {
  if (filterId === TRAINING_LAYER_FILTER_ID) return "training";
  if (filterId === ADMIN_LAYER_FILTER_ID) return "administration";
  return null;
}

function pickDefaultLayerIdForPurpose(layers: ClubAssetLayer[], purpose: ClubAssetLayer["purpose"]): string {
  const preferred = layers.find((layer) => layer.purpose === purpose && layer.is_default);
  if (preferred) return preferred.id;
  const fallback = layers.find((layer) => layer.purpose === purpose);
  return fallback ? fallback.id : "";
}

function normalizeHeader(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}

function getRowCell(row: Record<string, unknown>, aliases: string[]): string {
  const normalizedAliases = aliases.map(normalizeHeader);
  for (const [rawKey, rawValue] of Object.entries(row)) {
    if (!normalizedAliases.includes(normalizeHeader(rawKey))) continue;
    return typeof rawValue === "string" ? rawValue.trim() : String(rawValue ?? "").trim();
  }
  return "";
}

function excelSerialToIso(value: number): string | null {
  if (!Number.isFinite(value)) return null;
  const utcDays = Math.floor(value - 25569);
  const utcValue = utcDays * 86400;
  const fractionalDay = value - Math.floor(value) + 0.0000001;
  const totalSeconds = Math.floor(utcValue + fractionalDay * 86400);
  const date = new Date(totalSeconds * 1000);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function toIsoDateTime(input: string): string | null {
  if (!input) return null;
  const numeric = Number(input);
  if (!Number.isNaN(numeric) && /^\d+(\.\d+)?$/.test(input)) return excelSerialToIso(numeric);
  const parsed = new Date(input);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function buildSessionOccurrences(
  startInput: string,
  endInput: string,
  repeatWeekly: boolean,
  repeatUntil: string,
): Array<{ starts_at: string; ends_at: string }> {
  const start = new Date(startInput);
  const end = new Date(endInput);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) return [];

  if (!repeatWeekly || !repeatUntil) {
    return [{ starts_at: start.toISOString(), ends_at: end.toISOString() }];
  }

  const untilDate = new Date(`${repeatUntil}T23:59:59`);
  if (Number.isNaN(untilDate.getTime()) || untilDate < start) {
    return [{ starts_at: start.toISOString(), ends_at: end.toISOString() }];
  }

  const occurrences: Array<{ starts_at: string; ends_at: string }> = [];
  let cursorStart = new Date(start);
  let cursorEnd = new Date(end);
  while (cursorStart <= untilDate) {
    occurrences.push({ starts_at: cursorStart.toISOString(), ends_at: cursorEnd.toISOString() });
    cursorStart = addDays(cursorStart, 7);
    cursorEnd = addDays(cursorEnd, 7);
  }
  return occurrences;
}

const Teams = () => {
  // navigation is handled by AppHeader
  const location = useLocation();
  const { user } = useAuth();
  const { clubId, loading: clubLoading } = useClubId();
  const { toast } = useToast();
  const perms = usePermissions();
  const { t } = useLanguage();
  const canManage = perms.isTrainer || perms.isAdmin;
  const canManageLayers = perms.isAdmin;
  const [activeTab, setActiveTab] = useState<"pitches" | "teams" | "sessions" | "history">("pitches");

  const [teams, setTeams] = useState<Team[]>([]);
  const [memberships, setMemberships] = useState<ClubMembershipOption[]>([]);
  const [teamPlayerIdsByTeamId, setTeamPlayerIdsByTeamId] = useState<Record<string, string[]>>({});
  const [teamCoachIdsByTeamId, setTeamCoachIdsByTeamId] = useState<Record<string, string[]>>({});
  const [sessions, setSessions] = useState<TrainingSession[]>([]);
  const [layers, setLayers] = useState<ClubAssetLayer[]>([]);
  const [pitches, setPitches] = useState<ClubPitch[]>([]);
  const [bookings, setBookings] = useState<PitchBooking[]>([]);
  const [changeHistory, setChangeHistory] = useState<ChangeHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddTeam, setShowAddTeam] = useState(false);
  const [showAddSession, setShowAddSession] = useState(false);
  const [showAddPitch, setShowAddPitch] = useState(false);
  const [showAddLayer, setShowAddLayer] = useState(false);
  const [showAddBooking, setShowAddBooking] = useState(false);
  const [editingTeamId, setEditingTeamId] = useState<string | null>(null);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editingPitchId, setEditingPitchId] = useState<string | null>(null);
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);
  const [bookingDetailsId, setBookingDetailsId] = useState<string | null>(null);
  const [supportsParentPitchField, setSupportsParentPitchField] = useState(false);
  const [pendingPitchDeleteId, setPendingPitchDeleteId] = useState<string | null>(null);
  const [supportsLayerFields, setSupportsLayerFields] = useState(false);
  const [supportsDisplayColorField, setSupportsDisplayColorField] = useState(false);
  const [supportsChangeHistory, setSupportsChangeHistory] = useState(false);
  const [supportsTeamLeagueField, setSupportsTeamLeagueField] = useState(false);
  const [supportsTeamCoachesTable, setSupportsTeamCoachesTable] = useState(false);

  // Form state
  const [teamName, setTeamName] = useState("");
  const [teamSport, setTeamSport] = useState("football");
  const [teamAge, setTeamAge] = useState("");
  const [teamCoach, setTeamCoach] = useState("");
  const [teamLeague, setTeamLeague] = useState("");
  const [selectedCoachMembershipIds, setSelectedCoachMembershipIds] = useState<string[]>([]);
  const [selectedPlayerMembershipIds, setSelectedPlayerMembershipIds] = useState<string[]>([]);
  const [teamMemberSearch, setTeamMemberSearch] = useState("");

  const [sessionTitle, setSessionTitle] = useState("");
  const [sessionLocation, setSessionLocation] = useState("");
  const [sessionTeamId, setSessionTeamId] = useState("");
  const [sessionStart, setSessionStart] = useState("");
  const [sessionEnd, setSessionEnd] = useState("");
  const [sessionPitchId, setSessionPitchId] = useState("");
  const [sessionRepeatWeekly, setSessionRepeatWeekly] = useState(false);
  const [sessionRepeatUntil, setSessionRepeatUntil] = useState("");

  const [pitchName, setPitchName] = useState("");
  const [pitchNotes, setPitchNotes] = useState("");
  const [pitchParentId, setPitchParentId] = useState("");
  const [pitchElementType, setPitchElementType] = useState<ClubPitch["element_type"]>("pitch");
  const [activeLayerId, setActiveLayerId] = useState<string>("all");
  const [pitchLayerId, setPitchLayerId] = useState<string>("");
  const [pitchDisplayColor, setPitchDisplayColor] = useState("#22c55e");
  const [elementColorSectionOpen, setElementColorSectionOpen] = useState(false);
  const [selectedPitchCells, setSelectedPitchCells] = useState<number[]>([]);
  const [pitchViewMode, setPitchViewMode] = useState<"separate" | "combined">("separate");

  const [layerName, setLayerName] = useState("");
  const [layerPurpose, setLayerPurpose] = useState<ClubAssetLayer["purpose"]>("training");
  const [layerDescription, setLayerDescription] = useState("");

  const [bookingPitchId, setBookingPitchId] = useState("");
  const [bookingTeamId, setBookingTeamId] = useState("");
  const [bookingType, setBookingType] = useState<"training" | "match" | "other">("training");
  const [bookingTitle, setBookingTitle] = useState("");
  const [bookingStart, setBookingStart] = useState("");
  const [bookingEnd, setBookingEnd] = useState("");

  const [usageDate, setUsageDate] = useState(new Date().toISOString().slice(0, 10));
  const isAssetLayersPage =
    location.pathname === "/asset-layers" || location.pathname === "/property-layers";
  const currentTab: "pitches" | "teams" | "sessions" | "history" = isAssetLayersPage ? "pitches" : activeTab;
  const teamsUploadInputRef = useRef<HTMLInputElement | null>(null);
  const sessionsUploadInputRef = useRef<HTMLInputElement | null>(null);
  const pitchCardRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [uploadProgress, setUploadProgress] = useState({
    mode: "teams" as "teams" | "sessions",
    inProgress: false,
    processed: 0,
    total: 0,
    percent: 0,
    done: false,
  });

  const resetTeamForm = () => {
    setEditingTeamId(null);
    setTeamName("");
    setTeamAge("");
    setTeamCoach("");
    setTeamLeague("");
    setSelectedCoachMembershipIds([]);
    setSelectedPlayerMembershipIds([]);
    setTeamMemberSearch("");
    setTeamSport("football");
  };

  const resetSessionForm = () => {
    setEditingSessionId(null);
    setSessionTitle("");
    setSessionLocation("");
    setSessionTeamId("");
    setSessionStart("");
    setSessionEnd("");
    setSessionPitchId("");
    setSessionRepeatWeekly(false);
    setSessionRepeatUntil("");
  };

  // Reset page state on club switch to prevent cross-club flashes
  useEffect(() => {
    setTeams([]);
    setMemberships([]);
    setTeamPlayerIdsByTeamId({});
    setTeamCoachIdsByTeamId({});
    setSessions([]);
    setLayers([]);
    setPitches([]);
    setBookings([]);
    setChangeHistory([]);
    setSupportsChangeHistory(false);
    setLoading(true);
  }, [clubId]);

  useEffect(() => {
    if (!isAssetLayersPage) return;
    if (activeTab !== "pitches") setActiveTab("pitches");
  }, [activeTab, isAssetLayersPage]);

  useEffect(() => {
    if (!clubId) return;
    const fetchData = async () => {
      setLoading(true);
      const sessionQuery = async () => {
        const activitiesRes = await supabase
          .from("activities")
          .select("id, title, location, starts_at, ends_at, team_id, teams(name)")
          .eq("club_id", clubId)
          .eq("type", "training")
          .order("starts_at", { ascending: true })
          .limit(20);
        if (!activitiesRes.error) return activitiesRes;
        if (!isMissingRelationError(activitiesRes.error)) return activitiesRes;
        return supabase
          .from("training_sessions")
          .select("id, title, location, starts_at, ends_at, team_id, teams(name)")
          .eq("club_id", clubId)
          .order("starts_at", { ascending: true })
          .limit(20);
      };

      const [teamsRes, sessionsRes, pitchesRes, bookingsRes, pitchSchemaProbeRes, layerSchemaProbeRes, colorSchemaProbeRes, layersRes, historyProbeRes, historyRes, leagueProbeRes, teamCoachesProbeRes, teamPlayersRes, teamCoachesRes, membershipsRes] = await Promise.all([
        supabase.from("teams").select("*").eq("club_id", clubId).order("name"),
        sessionQuery(),
        supabase.from("club_pitches").select("*").eq("club_id", clubId).order("name"),
        supabase.from("pitch_bookings").select("*").eq("club_id", clubId).order("starts_at", { ascending: true }).limit(400),
        supabase.from("club_pitches").select("id, parent_pitch_id").eq("club_id", clubId).limit(1),
        supabase.from("club_pitches").select("id, layer_id, element_type").eq("club_id", clubId).limit(1),
        supabase.from("club_pitches").select("id, display_color").eq("club_id", clubId).limit(1),
        supabase.from("club_property_layers").select("*").eq("club_id", clubId).order("name"),
        supabase.from("club_training_change_history").select("id").eq("club_id", clubId).limit(1),
        supabase.from("club_training_change_history").select("*").eq("club_id", clubId).order("created_at", { ascending: false }).limit(200),
        supabase.from("teams").select("id, league").eq("club_id", clubId).limit(1),
        supabase.from("team_coaches").select("id, team_id, membership_id").limit(1),
        supabase.from("team_players").select("team_id, membership_id").limit(2500),
        supabase.from("team_coaches").select("team_id, membership_id").limit(2500),
        supabase.from("club_memberships").select("id, user_id, role, status").eq("club_id", clubId).eq("status", "active").limit(2500),
      ]);
      const rawTeams = (teamsRes.data as unknown as Array<Record<string, unknown>>) || [];
      setTeams(rawTeams.map((team) => ({
        id: String(team.id),
        name: String(team.name),
        sport: String((team.sport as string | null) || "football"),
        age_group: (team.age_group as string | null) ?? null,
        coach_name: (team.coach_name as string | null) ?? null,
        league: (team.league as string | null) ?? null,
        created_at: String(team.created_at),
      })));
      setSessions((sessionsRes.data as unknown as TrainingSession[]) || []);
      const rawPitches = (pitchesRes.data as unknown as Array<Record<string, unknown>>) || [];
      setSupportsParentPitchField(!pitchSchemaProbeRes.error);
      setSupportsLayerFields(!layerSchemaProbeRes.error);
      const rawLayers = (layersRes.data as unknown as Array<Record<string, unknown>>) || [];
      setLayers(rawLayers.map((layer) => ({
        id: String(layer.id),
        club_id: String(layer.club_id),
        name: String(layer.name),
        purpose: ((layer.purpose as ClubAssetLayer["purpose"]) || "training"),
        description: (layer.description as string | null) ?? null,
        is_default: Boolean(layer.is_default),
        created_at: String(layer.created_at),
      })));
      setPitches(rawPitches.map((pitch) => ({
        id: String(pitch.id),
        club_id: String(pitch.club_id),
        name: String(pitch.name),
        grid_cells: Array.isArray(pitch.grid_cells) ? pitch.grid_cells.map((cell) => Number(cell)).filter((cell) => Number.isInteger(cell)) : [],
        notes: (pitch.notes as string | null) ?? null,
        parent_pitch_id: (pitch.parent_pitch_id as string | null) ?? null,
        layer_id: (pitch.layer_id as string | null) ?? null,
        element_type: ((pitch.element_type as ClubPitch["element_type"]) || "pitch"),
        display_color: (pitch.display_color as string | null) ?? null,
        created_at: String(pitch.created_at),
      })));
      const rawBookings = (bookingsRes.data as unknown as Array<Record<string, unknown>>) || [];
      setBookings(rawBookings.map((booking) => ({
        id: String(booking.id),
        club_id: String(booking.club_id),
        pitch_id: String(booking.pitch_id),
        team_id: (booking.team_id as string | null) ?? null,
        booking_type: ((booking.booking_type as "training" | "match" | "other") || "training"),
        title: String(booking.title),
        starts_at: String(booking.starts_at),
        ends_at: String(booking.ends_at),
        status: ((booking.status as "booked" | "cancelled") || "booked"),
        created_by: (booking.created_by as string | null) ?? null,
        needs_reconfirmation: Boolean(booking.needs_reconfirmation),
        reconfirmation_status: ((booking.reconfirmation_status as "not_required" | "pending" | "confirmed" | "declined") || "not_required"),
        overridden_by_booking_id: (booking.overridden_by_booking_id as string | null) ?? null,
        reconfirmation_requested_at: (booking.reconfirmation_requested_at as string | null) ?? null,
        created_at: String(booking.created_at),
      })));
      setSupportsChangeHistory(!historyProbeRes.error);
      setSupportsTeamLeagueField(!leagueProbeRes.error);
      setSupportsTeamCoachesTable(!teamCoachesProbeRes.error);

      const membershipsRaw = (membershipsRes.data as unknown as Array<Record<string, unknown>>) || [];
      const membershipUserIds = Array.from(new Set(membershipsRaw.map((membership) => String(membership.user_id)).filter(Boolean)));
      let profileByUserId = new Map<string, string>();
      if (membershipUserIds.length > 0) {
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("user_id, display_name")
          .in("user_id", membershipUserIds);
        profileByUserId = new Map(
          ((profilesData as unknown as Array<Record<string, unknown>>) || []).map((profile) => [
            String(profile.user_id),
            String((profile.display_name as string | null) || "").trim(),
          ]),
        );
      }
      setMemberships(membershipsRaw.map((membership) => ({
        id: String(membership.id),
        user_id: String(membership.user_id),
        role: String(membership.role),
        display_name: profileByUserId.get(String(membership.user_id)) || String(membership.user_id),
      })));

      const playerMap: Record<string, string[]> = {};
      const playerRows = (teamPlayersRes.data as unknown as Array<Record<string, unknown>>) || [];
      playerRows.forEach((row) => {
        const teamId = String(row.team_id);
        const membershipId = String(row.membership_id);
        playerMap[teamId] = [...(playerMap[teamId] || []), membershipId];
      });
      setTeamPlayerIdsByTeamId(playerMap);

      const coachMap: Record<string, string[]> = {};
      if (!teamCoachesRes.error) {
        const coachRows = (teamCoachesRes.data as unknown as Array<Record<string, unknown>>) || [];
        coachRows.forEach((row) => {
          const teamId = String(row.team_id);
          const membershipId = String(row.membership_id);
          coachMap[teamId] = [...(coachMap[teamId] || []), membershipId];
        });
      }
      setTeamCoachIdsByTeamId(coachMap);

      const rawHistory = (historyRes.data as unknown as Array<Record<string, unknown>>) || [];
      if (!historyRes.error) {
        setChangeHistory(rawHistory.map((entry) => ({
          id: String(entry.id),
          club_id: String(entry.club_id),
          scope: ((entry.scope as ChangeHistoryItem["scope"]) || "uploads"),
          action: ((entry.action as ChangeHistoryItem["action"]) || "upload"),
          entity_type: String(entry.entity_type || "unknown"),
          entity_id: (entry.entity_id as string | null) ?? null,
          details: (entry.details as Record<string, unknown>) || {},
          created_by: (entry.created_by as string | null) ?? null,
          created_at: String(entry.created_at),
        })));
      } else {
        setChangeHistory([]);
      }
      setLoading(false);
    };
    fetchData();
  }, [clubId]);

  const teamNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const team of teams) map.set(team.id, team.name);
    return map;
  }, [teams]);

  const membershipNameById = useMemo(() => {
    const map = new Map<string, string>();
    memberships.forEach((membership) => map.set(membership.id, membership.display_name));
    return map;
  }, [memberships]);

  const teamCoachById = useMemo(() => {
    const map = new Map<string, string>();
    for (const team of teams) {
      const coachIds = teamCoachIdsByTeamId[team.id] || [];
      const coachNames = coachIds
        .map((membershipId) => membershipNameById.get(membershipId))
        .filter((name): name is string => Boolean(name));
      if (coachNames.length > 0) {
        map.set(team.id, coachNames.join(", "));
        continue;
      }
      if (team.coach_name) map.set(team.id, team.coach_name);
    }
    return map;
  }, [membershipNameById, teamCoachIdsByTeamId, teams]);

  const clubCoachContacts = useMemo(() => {
    const fromTeamAssignments = Object.values(teamCoachIdsByTeamId)
      .flatMap((membershipIds) => membershipIds.map((membershipId) => membershipNameById.get(membershipId) || ""))
      .map((name) => name.trim())
      .filter((name) => Boolean(name));
    const fromLegacy = teams
      .map((team) => (team.coach_name || "").trim())
      .filter((name) => Boolean(name));
    return Array.from(new Set([...fromTeamAssignments, ...fromLegacy]));
  }, [membershipNameById, teamCoachIdsByTeamId, teams]);

  const coachMemberOptions = useMemo(() => {
    return memberships.filter((membership) => membership.role === "trainer" || membership.role === "admin");
  }, [memberships]);

  const playerMemberOptions = useMemo(() => {
    return memberships.filter((membership) => membership.role === "player");
  }, [memberships]);

  const normalizedTeamMemberSearch = teamMemberSearch.trim().toLowerCase();
  const filteredCoachOptions = useMemo(() => {
    if (!normalizedTeamMemberSearch) return coachMemberOptions;
    return coachMemberOptions.filter((membership) => membership.display_name.toLowerCase().includes(normalizedTeamMemberSearch));
  }, [coachMemberOptions, normalizedTeamMemberSearch]);

  const filteredPlayerOptions = useMemo(() => {
    if (!normalizedTeamMemberSearch) return playerMemberOptions;
    return playerMemberOptions.filter((membership) => membership.display_name.toLowerCase().includes(normalizedTeamMemberSearch));
  }, [normalizedTeamMemberSearch, playerMemberOptions]);

  const pitchNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const pitch of pitches) map.set(pitch.id, pitch.name);
    return map;
  }, [pitches]);

  const pitchById = useMemo(() => {
    const map = new Map<string, ClubPitch>();
    for (const pitch of pitches) map.set(pitch.id, pitch);
    return map;
  }, [pitches]);

  const pitchColorById = useMemo(() => {
    const map = new Map<string, string>();
    pitches.forEach((pitch, index) => {
      const stored = pitch.display_color ? normalizeHexColor(pitch.display_color) : null;
      map.set(pitch.id, stored ?? suggestColorByIndex(index));
    });
    return map;
  }, [pitches]);

  const layerNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const layer of layers) map.set(layer.id, layer.name);
    return map;
  }, [layers]);

  const layerById = useMemo(() => {
    const map = new Map<string, ClubAssetLayer>();
    for (const layer of layers) map.set(layer.id, layer);
    return map;
  }, [layers]);

  const activeLayerPurposeFilter = useMemo(() => resolveLayerFilterPurpose(activeLayerId), [activeLayerId]);

  const matchesActiveLayerFilter = useCallback((pitch: ClubPitch): boolean => {
    if (activeLayerId === "all") return true;
    if (activeLayerPurposeFilter) {
      const layer = pitch.layer_id ? layerById.get(pitch.layer_id) : null;
      if (!layer) return activeLayerPurposeFilter === "training";
      return layer.purpose === activeLayerPurposeFilter;
    }
    return pitch.layer_id === activeLayerId;
  }, [activeLayerId, activeLayerPurposeFilter, layerById]);

  const derivePitchLayerIdFromFilter = (filterId: string): string => {
    if (filterId === "all") return "";
    const purposeFilter = resolveLayerFilterPurpose(filterId);
    if (!purposeFilter) return filterId;
    return pickDefaultLayerIdForPurpose(layers, purposeFilter);
  };

  const filteredPitches = useMemo(() => {
    return pitches.filter(matchesActiveLayerFilter);
  }, [pitches, matchesActiveLayerFilter]);

  const activeLayer = useMemo(() => {
    if (activeLayerId === "all") return null;
    if (activeLayerPurposeFilter) return null;
    return layers.find((layer) => layer.id === activeLayerId) || null;
  }, [activeLayerId, activeLayerPurposeFilter, layers]);

  const bookingActionLabel = useMemo(() => {
    const activePurpose = activeLayerPurposeFilter || activeLayer?.purpose || null;
    if (!activePurpose) return t.teamsPage.bookByLayer.all;
    if (activePurpose === "training") return t.teamsPage.bookByLayer.training;
    if (activePurpose === "administration") return t.teamsPage.bookByLayer.administration;
    if (activePurpose === "operations") return t.teamsPage.bookByLayer.operations;
    return t.teamsPage.bookByLayer.other;
  }, [activeLayer, activeLayerPurposeFilter, t.teamsPage.bookByLayer]);

  const mapElementModalCopy = useMemo(() => {
    const type = formatElementTypeLabel(pitchElementType, t.teamsPage.elementTypes);
    const modal = t.teamsPage.elementModal;
    return {
      title: fillTemplate(editingPitchId ? modal.editTitle : modal.createTitle, { type, grid: GRID_LABEL }),
      namePlaceholder: fillTemplate(modal.namePlaceholder, { type }),
      gridHint: fillTemplate(modal.gridHint, { type }),
      saveButton: fillTemplate(editingPitchId ? modal.saveUpdate : modal.saveCreate, { type }),
      selectedCounter: fillTemplate(modal.selectedOf, {
        selected: String(selectedPitchCells.length),
        total: String(GRID_CELLS),
      }),
    };
  }, [editingPitchId, pitchElementType, selectedPitchCells.length, t.teamsPage.elementModal, t.teamsPage.elementTypes]);

  const splitHierarchyInfo = useMemo(() => {
    const childrenCountByPitchId = new Map<string, number>();
    for (const pitch of filteredPitches) {
      if (!pitch.parent_pitch_id) continue;
      childrenCountByPitchId.set(
        pitch.parent_pitch_id,
        (childrenCountByPitchId.get(pitch.parent_pitch_id) || 0) + 1,
      );
    }
    return childrenCountByPitchId;
  }, [filteredPitches]);

  const combinedPitchCells = useMemo(() => {
    const map = new Map<number, string[]>();
    for (const pitch of filteredPitches) {
      for (const cell of pitch.grid_cells) {
        map.set(cell, [...(map.get(cell) || []), pitch.id]);
      }
    }
    return map;
  }, [filteredPitches]);

  const enrichedBookings = useMemo<EnrichedPitchBooking[]>(() => {
    return bookings.map((booking) => {
      const bookingPitch = pitchById.get(booking.pitch_id);
      const hasConflict = bookings.some((candidate) =>
        candidate.id !== booking.id
        && candidate.status !== "cancelled"
        && booking.status !== "cancelled"
        && (() => {
          const candidatePitch = pitchById.get(candidate.pitch_id);
          if (!bookingPitch || !candidatePitch) return candidate.pitch_id === booking.pitch_id;
          return bookingPitch.grid_cells.some((cell) => candidatePitch.grid_cells.includes(cell));
        })()
        && overlaps(booking.starts_at, booking.ends_at, candidate.starts_at, candidate.ends_at)
      );
      return {
        ...booking,
        pitchName: pitchNameById.get(booking.pitch_id) || t.teamsPage.unknownElement,
        teamName: booking.team_id ? (teamNameById.get(booking.team_id) || null) : null,
        hasConflict,
      };
    });
  }, [bookings, pitchById, pitchNameById, teamNameById, t.teamsPage.unknownElement]);

  const usageSummary = useMemo(() => {
    const activeBookings = enrichedBookings.filter((booking) => {
      if (booking.status === "cancelled") return false;
      const pitch = pitchById.get(booking.pitch_id);
      return Boolean(pitch && matchesActiveLayerFilter(pitch));
    });
    const nowIso = new Date().toISOString();
    const activeNow = activeBookings.filter((booking) => booking.starts_at <= nowIso && booking.ends_at > nowIso);
    const freeNow = Math.max(0, filteredPitches.length - new Set(activeNow.map((booking) => booking.pitch_id)).size);
    const conflictCount = activeBookings.filter((booking) => booking.hasConflict).length;

    const countsByPitch = new Map<string, number>();
    for (const booking of activeBookings) {
      countsByPitch.set(booking.pitch_id, (countsByPitch.get(booking.pitch_id) || 0) + 1);
    }
    let topPitchId: string | null = null;
    let topPitchCount = 0;
    for (const [pitchId, count] of countsByPitch.entries()) {
      if (count > topPitchCount) {
        topPitchCount = count;
        topPitchId = pitchId;
      }
    }

    return {
      totalBookings: activeBookings.length,
      freeNow,
      conflictCount,
      topPitchName: topPitchId ? (pitchNameById.get(topPitchId) || t.teamsPage.unknownElement) : "—",
      topPitchCount,
    };
  }, [enrichedBookings, filteredPitches.length, matchesActiveLayerFilter, pitchById, pitchNameById, t.teamsPage.unknownElement]);

  const dayBookings = useMemo(() => {
    const from = new Date(`${usageDate}T00:00:00`);
    const to = new Date(`${usageDate}T23:59:59`);
    return enrichedBookings.filter((booking) => {
      const start = new Date(booking.starts_at);
      const pitch = pitchById.get(booking.pitch_id);
      if (!pitch || !matchesActiveLayerFilter(pitch)) return false;
      return start >= from && start <= to;
    });
  }, [enrichedBookings, matchesActiveLayerFilter, pitchById, usageDate]);

  const selectedBooking = useMemo(() => {
    if (!selectedBookingId) return null;
    return enrichedBookings.find((booking) => booking.id === selectedBookingId) || null;
  }, [enrichedBookings, selectedBookingId]);

  const bookingDetails = useMemo(() => {
    if (!bookingDetailsId) return null;
    return enrichedBookings.find((booking) => booking.id === bookingDetailsId) || null;
  }, [bookingDetailsId, enrichedBookings]);

  const selectedBookingPitchId = selectedBooking?.pitch_id || null;

  const formattedHistoryEntries = useMemo(() => {
    const formatAction = (action: ChangeHistoryItem["action"]): string => {
      if (action === "create") return t.teamsPage.history.actions.create;
      if (action === "update") return t.teamsPage.history.actions.update;
      if (action === "delete") return t.teamsPage.history.actions.delete;
      return t.teamsPage.history.actions.upload;
    };
    const formatScope = (scope: ChangeHistoryItem["scope"]): string => {
      if (scope === "teams") return t.teamsPage.tabs.teams;
      if (scope === "sessions") return t.teamsPage.tabs.sessions;
      return t.teamsPage.history.scopeUploads;
    };
    const normalizeEntityLabel = (entityType: string): string => {
      const clean = entityType.replace(/_/g, " ").trim();
      if (!clean) return t.teamsPage.history.entityGeneric;
      return clean.charAt(0).toUpperCase() + clean.slice(1);
    };
    const actorLabel = (createdBy: string | null): string => {
      if (!createdBy) return t.teamsPage.history.actorSystem;
      if (createdBy === user?.id) return t.teamsPage.history.actorYou;
      return `${t.teamsPage.history.actorUserPrefix} ${createdBy.slice(0, 8)}`;
    };
    const yesNo = (value: boolean): string => (value ? t.teamsPage.history.booleanYes : t.teamsPage.history.booleanNo);

    return changeHistory.map((entry) => {
      const details = entry.details || {};
      const detailItems: Array<{ label: string; value: string }> = [];
      const pushIf = (label: string, value: unknown) => {
        if (value === null || value === undefined) return;
        const text = typeof value === "string" ? value.trim() : String(value);
        if (!text) return;
        detailItems.push({ label, value: text });
      };
      const pushDateIf = (label: string, value: unknown) => {
        if (!value) return;
        const d = new Date(String(value));
        if (Number.isNaN(d.getTime())) {
          pushIf(label, value);
          return;
        }
        pushIf(label, d.toLocaleString());
      };

      const detailRecord = details as Record<string, unknown>;
      pushIf(t.teamsPage.history.fields.fileName, detailRecord.file_name);
      pushIf(t.teamsPage.history.fields.totalRows, detailRecord.total_rows);
      pushIf(t.teamsPage.history.fields.created, detailRecord.created);
      pushIf(t.teamsPage.history.fields.updated, detailRecord.updated);
      pushIf(t.teamsPage.history.fields.failed, detailRecord.failed);
      pushIf(t.teamsPage.history.fields.title, detailRecord.title);
      pushIf(
        t.teamsPage.history.fields.team,
        detailRecord.team_id ? (teamNameById.get(String(detailRecord.team_id)) || String(detailRecord.team_id)) : detailRecord.team_id,
      );
      pushIf(
        t.teamsPage.history.fields.pitch,
        detailRecord.pitch_id ? (pitchNameById.get(String(detailRecord.pitch_id)) || String(detailRecord.pitch_id)) : detailRecord.pitch_id,
      );
      pushDateIf(t.teamsPage.history.fields.start, detailRecord.starts_at);
      pushDateIf(t.teamsPage.history.fields.end, detailRecord.ends_at);
      pushIf(t.teamsPage.history.fields.location, detailRecord.location);
      pushIf(t.teamsPage.history.fields.coach, detailRecord.coach_name);
      pushIf(t.teamsPage.history.fields.sport, detailRecord.sport);
      pushIf(t.teamsPage.history.fields.ageGroup, detailRecord.age_group);
      pushIf(t.teamsPage.history.fields.league, detailRecord.league);
      if (typeof detailRecord.repeat_weekly === "boolean") {
        pushIf(t.teamsPage.history.fields.repeatWeekly, yesNo(Boolean(detailRecord.repeat_weekly)));
      }
      pushDateIf(t.teamsPage.history.fields.repeatUntil, detailRecord.repeat_until);
      pushIf(t.teamsPage.history.fields.bookingsCreated, detailRecord.bookings_created);
      pushIf(t.teamsPage.history.fields.source, detailRecord.source);
      if (detailItems.length === 0) {
        pushIf(t.teamsPage.history.fields.entityId, entry.entity_id);
      }

      return {
        id: entry.id,
        actionLabel: formatAction(entry.action),
        scopeLabel: formatScope(entry.scope),
        entityLabel: normalizeEntityLabel(entry.entity_type),
        actor: actorLabel(entry.created_by),
        timestamp: new Date(entry.created_at).toLocaleString(),
        detailItems,
      };
    });
  }, [changeHistory, pitchNameById, t.teamsPage.history, t.teamsPage.tabs.sessions, t.teamsPage.tabs.teams, teamNameById, user?.id]);

  useEffect(() => {
    if (!selectedBookingPitchId) return;
    if (currentTab !== "pitches") return;
    if (pitchViewMode !== "separate") return;

    const attemptScroll = () => {
      const target = pitchCardRefs.current[selectedBookingPitchId];
      if (!target) return;
      target.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
    };

    const timer = window.setTimeout(() => {
      window.requestAnimationFrame(attemptScroll);
    }, 40);

    return () => window.clearTimeout(timer);
  }, [currentTab, pitchViewMode, selectedBookingPitchId, filteredPitches.length]);

  const syncSessionBookings = async (params: {
    title: string;
    teamId: string | null;
    pitchId: string;
    startsAtInput: string;
    endsAtInput: string;
    repeatWeekly: boolean;
    repeatUntil: string;
  }) => {
    if (!clubId || !params.pitchId) return 0;
    const occurrences = buildSessionOccurrences(
      params.startsAtInput,
      params.endsAtInput,
      params.repeatWeekly,
      params.repeatUntil,
    );
    if (occurrences.length === 0) return 0;

    const rangeStart = occurrences[0]?.starts_at;
    const rangeEnd = occurrences[occurrences.length - 1]?.starts_at;
    const { data: existingRows, error: existingError } = await supabase
      .from("pitch_bookings")
      .select("id, title, team_id, starts_at, ends_at, pitch_id, booking_type, status")
      .eq("club_id", clubId)
      .eq("pitch_id", params.pitchId)
      .eq("booking_type", "training")
      .gte("starts_at", rangeStart)
      .lte("starts_at", rangeEnd)
      .limit(1000);

    if (existingError) {
      if (isMissingRelationError(existingError)) return 0;
      toast({ title: t.teamsPage.common.error, description: existingError.message, variant: "destructive" });
      return 0;
    }

    const normalizedTitle = params.title.trim().toLowerCase();
    const existing = (existingRows as Array<Record<string, unknown>> | null) || [];
    const existingKey = new Set(
      existing
        .filter((row) => String(row.status || "booked") !== "cancelled")
        .map((row) => [
          String(row.starts_at),
          String(row.ends_at),
          String((row.team_id as string | null) || ""),
          String((row.title as string) || "").trim().toLowerCase(),
        ].join("|")),
    );

    const inserts = occurrences
      .map((occurrence) => ({
        club_id: clubId,
        pitch_id: params.pitchId,
        team_id: params.teamId,
        booking_type: "training" as const,
        title: params.title.trim(),
        starts_at: occurrence.starts_at,
        ends_at: occurrence.ends_at,
        status: "booked" as const,
        created_by: user?.id || null,
      }))
      .filter((candidate) => !existingKey.has([
        candidate.starts_at,
        candidate.ends_at,
        candidate.team_id || "",
        normalizedTitle,
      ].join("|")));

    if (inserts.length === 0) return 0;
    const { data: insertedRows, error: insertError } = await supabase
      .from("pitch_bookings")
      .insert(inserts)
      .select("*");
    if (insertError) {
      toast({ title: t.teamsPage.common.error, description: insertError.message, variant: "destructive" });
      return 0;
    }

    const inserted = (insertedRows as Array<Record<string, unknown>> | null) || [];
    if (inserted.length > 0) {
      const mapped = inserted.map((booking) => ({
        id: String(booking.id),
        club_id: String(booking.club_id),
        pitch_id: String(booking.pitch_id),
        team_id: (booking.team_id as string | null) ?? null,
        booking_type: ((booking.booking_type as "training" | "match" | "other") || "training"),
        title: String(booking.title),
        starts_at: String(booking.starts_at),
        ends_at: String(booking.ends_at),
        status: ((booking.status as "booked" | "cancelled") || "booked"),
        created_by: (booking.created_by as string | null) ?? null,
        needs_reconfirmation: Boolean(booking.needs_reconfirmation),
        reconfirmation_status: ((booking.reconfirmation_status as "not_required" | "pending" | "confirmed" | "declined") || "not_required"),
        overridden_by_booking_id: (booking.overridden_by_booking_id as string | null) ?? null,
        reconfirmation_requested_at: (booking.reconfirmation_requested_at as string | null) ?? null,
        created_at: String(booking.created_at),
      }));
      setBookings((previous) => [...previous, ...mapped].sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime()));
    }
    return inserts.length;
  };

  const recordChangeHistory = async (
    payload: Omit<ChangeHistoryItem, "id" | "club_id" | "created_by" | "created_at">,
  ) => {
    if (!clubId || !supportsChangeHistory) return;
    const { data, error } = await supabase
      .from("club_training_change_history")
      .insert({
        club_id: clubId,
        scope: payload.scope,
        action: payload.action,
        entity_type: payload.entity_type,
        entity_id: payload.entity_id,
        details: payload.details,
        created_by: user?.id || null,
      })
      .select("*")
      .single();
    if (error || !data) return;
    const row = data as unknown as ChangeHistoryItem;
    setChangeHistory((previous) => [row, ...previous].slice(0, 200));
  };

  const validateHeadersForTeamUpload = (firstRow: Record<string, unknown>): boolean => {
    return Boolean(getRowCell(firstRow, ["name", "team", "team_name", "title"]));
  };

  const validateHeadersForSessionUpload = (firstRow: Record<string, unknown>): boolean => {
    const hasTitle = Boolean(getRowCell(firstRow, ["title", "session", "session_title", "name"]));
    const hasStart = Boolean(getRowCell(firstRow, ["starts_at", "start", "start_time", "start_at", "date"]));
    const hasEnd = Boolean(getRowCell(firstRow, ["ends_at", "end", "end_time", "end_at"]));
    return hasTitle && hasStart && hasEnd;
  };

  const handleUploadTeamsFile = async (file: File) => {
    if (!clubId || !canManage) return;
    setUploadProgress({ mode: "teams", inProgress: true, processed: 0, total: 0, percent: 0, done: false });
    try {
      const buffer = await file.arrayBuffer();
      const xlsx = await import("xlsx");
      const workbook = xlsx.read(buffer, { type: "array" });
      const firstSheetName = workbook.SheetNames[0];
      const firstSheet = workbook.Sheets[firstSheetName];
      const rows = xlsx.utils.sheet_to_json<Record<string, unknown>>(firstSheet, { defval: "" });
      if (rows.length === 0) {
        toast({ title: t.teamsPage.common.error, description: t.teamsPage.upload.emptyFile, variant: "destructive" });
        return;
      }
      if (!validateHeadersForTeamUpload(rows[0])) {
        toast({ title: t.teamsPage.common.error, description: t.teamsPage.upload.invalidTeamsHeaders, variant: "destructive" });
        return;
      }

      let createdCount = 0;
      let updatedCount = 0;
      let failedCount = 0;
      const nextTeams = [...teams];
      setUploadProgress((prev) => ({ ...prev, total: rows.length }));

      for (let index = 0; index < rows.length; index += 1) {
        const row = rows[index];
        const name = getRowCell(row, ["name", "team", "team_name", "title"]);
        if (!name) {
          failedCount += 1;
          continue;
        }
        const sport = resolveSportId(getRowCell(row, ["sport", "sport_id", "discipline"]) || "football");
        const ageGroup = getRowCell(row, ["age_group", "age", "agegroup"]) || null;
        const coachName = getRowCell(row, ["coach_name", "coach", "trainer", "coachname"]) || null;
        const league = getRowCell(row, ["league", "liga", "division", "competition"]) || null;
        const existing = nextTeams.find((team) => team.name.trim().toLowerCase() === name.trim().toLowerCase());

        if (!existing) {
          const { data, error } = await supabase
            .from("teams")
            .insert({ club_id: clubId, name: name.trim(), sport, age_group: ageGroup, coach_name: coachName, ...(supportsTeamLeagueField ? { league } : {}) })
            .select()
            .single();
          if (error || !data) failedCount += 1;
          else {
            nextTeams.push(data as Team);
            createdCount += 1;
          }
        } else {
          const { data, error } = await supabase
            .from("teams")
            .update({ name: name.trim(), sport, age_group: ageGroup, coach_name: coachName, ...(supportsTeamLeagueField ? { league } : {}) })
            .eq("club_id", clubId)
            .eq("id", existing.id)
            .select()
            .single();
          if (error || !data) failedCount += 1;
          else {
            const updated = data as Team;
            const teamIndex = nextTeams.findIndex((team) => team.id === existing.id);
            if (teamIndex >= 0) nextTeams[teamIndex] = updated;
            updatedCount += 1;
          }
        }

        const processed = index + 1;
        const percent = Math.round((processed / rows.length) * 100);
        setUploadProgress((prev) => ({ ...prev, processed, percent }));
      }

      setTeams(nextTeams.sort((a, b) => a.name.localeCompare(b.name)));
      await recordChangeHistory({
        scope: "uploads",
        action: "upload",
        entity_type: "teams_excel",
        entity_id: null,
        details: {
          file_name: file.name,
          total_rows: rows.length,
          created: createdCount,
          updated: updatedCount,
          failed: failedCount,
        },
      });
      setUploadProgress((prev) => ({ ...prev, inProgress: false, done: true, percent: 100 }));
      toast({
        title: t.teamsPage.upload.uploadDone,
        description: `${createdCount} created, ${updatedCount} updated, ${failedCount} failed`,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : t.teamsPage.upload.uploadFailed;
      toast({ title: t.teamsPage.common.error, description: message, variant: "destructive" });
      setUploadProgress((prev) => ({ ...prev, inProgress: false, done: false }));
    }
  };

  const handleUploadSessionsFile = async (file: File) => {
    if (!clubId || !canManage) return;
    setUploadProgress({ mode: "sessions", inProgress: true, processed: 0, total: 0, percent: 0, done: false });
    try {
      const buffer = await file.arrayBuffer();
      const xlsx = await import("xlsx");
      const workbook = xlsx.read(buffer, { type: "array" });
      const firstSheetName = workbook.SheetNames[0];
      const firstSheet = workbook.Sheets[firstSheetName];
      const rows = xlsx.utils.sheet_to_json<Record<string, unknown>>(firstSheet, { defval: "" });
      if (rows.length === 0) {
        toast({ title: t.teamsPage.common.error, description: t.teamsPage.upload.emptyFile, variant: "destructive" });
        return;
      }
      if (!validateHeadersForSessionUpload(rows[0])) {
        toast({ title: t.teamsPage.common.error, description: t.teamsPage.upload.invalidSessionsHeaders, variant: "destructive" });
        return;
      }

      let createdCount = 0;
      let updatedCount = 0;
      let failedCount = 0;
      const nextSessions = [...sessions];
      setUploadProgress((prev) => ({ ...prev, total: rows.length }));

      for (let index = 0; index < rows.length; index += 1) {
        const row = rows[index];
        const title = getRowCell(row, ["title", "session", "session_title", "name"]);
        const startRaw = getRowCell(row, ["starts_at", "start", "start_time", "start_at", "date"]);
        const endRaw = getRowCell(row, ["ends_at", "end", "end_time", "end_at"]);
        const startsAt = toIsoDateTime(startRaw);
        const endsAt = toIsoDateTime(endRaw);
        if (!title || !startsAt || !endsAt) {
          failedCount += 1;
          continue;
        }
        const teamRaw = getRowCell(row, ["team_id", "team", "team_name"]);
        const matchedTeam = teams.find((team) => team.id === teamRaw || team.name.trim().toLowerCase() === teamRaw.trim().toLowerCase());
        const teamId = matchedTeam?.id || null;
        const payload = {
          team_id: teamId,
          title: title.trim(),
          location: getRowCell(row, ["location", "place", "pitch"]) || null,
          starts_at: startsAt,
          ends_at: endsAt,
        };
        const existing = nextSessions.find((entry) =>
          entry.title.trim().toLowerCase() === payload.title.toLowerCase()
          && new Date(entry.starts_at).getTime() === new Date(payload.starts_at).getTime(),
        );

        if (!existing) {
          const createSession = async () => {
            const activitiesRes = await supabase
              .from("activities")
              .insert({
                club_id: clubId,
                type: "training",
                description: null,
                created_by: user?.id,
                ...payload,
              })
              .select("id, title, location, starts_at, ends_at, team_id, teams(name)")
              .single();
            if (!activitiesRes.error) return activitiesRes;
            if (!isMissingRelationError(activitiesRes.error)) return activitiesRes;
            return supabase
              .from("training_sessions")
              .insert({
                club_id: clubId,
                created_by: user?.id,
                ...payload,
              })
              .select("id, title, location, starts_at, ends_at, team_id, teams(name)")
              .single();
          };
          const { data, error } = await createSession();
          if (error || !data) failedCount += 1;
          else {
            nextSessions.push(data as unknown as TrainingSession);
            createdCount += 1;
          }
        } else {
          const updateSession = async () => {
            const activitiesRes = await supabase
              .from("activities")
              .update(payload)
              .eq("club_id", clubId)
              .eq("id", existing.id)
              .eq("type", "training")
              .select("id, title, location, starts_at, ends_at, team_id, teams(name)")
              .single();
            if (!activitiesRes.error) return activitiesRes;
            if (!isMissingRelationError(activitiesRes.error)) return activitiesRes;
            return supabase
              .from("training_sessions")
              .update(payload)
              .eq("club_id", clubId)
              .eq("id", existing.id)
              .select("id, title, location, starts_at, ends_at, team_id, teams(name)")
              .single();
          };
          const { data, error } = await updateSession();
          if (error || !data) failedCount += 1;
          else {
            const updated = data as unknown as TrainingSession;
            const sessionIndex = nextSessions.findIndex((entry) => entry.id === existing.id);
            if (sessionIndex >= 0) nextSessions[sessionIndex] = updated;
            updatedCount += 1;
          }
        }

        const processed = index + 1;
        const percent = Math.round((processed / rows.length) * 100);
        setUploadProgress((prev) => ({ ...prev, processed, percent }));
      }

      setSessions(nextSessions.sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime()));
      await recordChangeHistory({
        scope: "uploads",
        action: "upload",
        entity_type: "sessions_excel",
        entity_id: null,
        details: {
          file_name: file.name,
          total_rows: rows.length,
          created: createdCount,
          updated: updatedCount,
          failed: failedCount,
        },
      });
      setUploadProgress((prev) => ({ ...prev, inProgress: false, done: true, percent: 100 }));
      toast({
        title: t.teamsPage.upload.uploadDone,
        description: `${createdCount} created, ${updatedCount} updated, ${failedCount} failed`,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : t.teamsPage.upload.uploadFailed;
      toast({ title: t.teamsPage.common.error, description: message, variant: "destructive" });
      setUploadProgress((prev) => ({ ...prev, inProgress: false, done: false }));
    }
  };

  const handleAddLayer = async () => {
    if (!clubId || !canManageLayers) return;
    if (!layerName.trim()) return;
    const { data, error } = await supabase
      .from("club_property_layers")
      .insert({
        club_id: clubId,
        name: layerName.trim(),
        purpose: layerPurpose,
        description: layerDescription.trim() || null,
        created_by: user?.id || null,
      })
      .select()
      .single();
    if (error) {
      toast({ title: t.teamsPage.common.error, description: error.message, variant: "destructive" });
      return;
    }
    const created = data as unknown as ClubAssetLayer;
    setLayers((previous) => [...previous, created].sort((a, b) => a.name.localeCompare(b.name)));
    setActiveLayerId(created.id);
    setPitchLayerId(created.id);
    setLayerName("");
    setLayerPurpose("training");
    setLayerDescription("");
    setShowAddLayer(false);
    toast({ title: t.teamsPage.toastLayerCreated });
  };

  const persistTeamAssignments = async (teamId: string) => {
    const existingPlayerIds = teamPlayerIdsByTeamId[teamId] || [];
    const nextPlayerIds = Array.from(new Set(selectedPlayerMembershipIds));
    const playersToAdd = nextPlayerIds.filter((membershipId) => !existingPlayerIds.includes(membershipId));
    const playersToRemove = existingPlayerIds.filter((membershipId) => !nextPlayerIds.includes(membershipId));

    if (playersToRemove.length > 0) {
      const { error } = await supabase
        .from("team_players")
        .delete()
        .eq("team_id", teamId)
        .in("membership_id", playersToRemove);
      if (error) throw error;
    }
    if (playersToAdd.length > 0) {
      const { error } = await supabase
        .from("team_players")
        .insert(playersToAdd.map((membershipId) => ({ team_id: teamId, membership_id: membershipId })));
      if (error) throw error;
    }

    if (supportsTeamCoachesTable) {
      const existingCoachIds = teamCoachIdsByTeamId[teamId] || [];
      const nextCoachIds = Array.from(new Set(selectedCoachMembershipIds));
      const coachesToAdd = nextCoachIds.filter((membershipId) => !existingCoachIds.includes(membershipId));
      const coachesToRemove = existingCoachIds.filter((membershipId) => !nextCoachIds.includes(membershipId));

      if (coachesToRemove.length > 0) {
        const { error } = await supabase
          .from("team_coaches")
          .delete()
          .eq("team_id", teamId)
          .in("membership_id", coachesToRemove);
        if (error) throw error;
      }
      if (coachesToAdd.length > 0) {
        const { error } = await supabase
          .from("team_coaches")
          .insert(coachesToAdd.map((membershipId) => ({ team_id: teamId, membership_id: membershipId })));
        if (error) throw error;
      }
      setTeamCoachIdsByTeamId((previous) => ({ ...previous, [teamId]: nextCoachIds }));
    }

    setTeamPlayerIdsByTeamId((previous) => ({ ...previous, [teamId]: nextPlayerIds }));
  };

  const handleAddTeam = async () => {
    if (!canManage || !clubId) {
      toast({ title: t.teamsPage.toast.notAuthorizedTeamsTitle, description: t.teamsPage.toast.notAuthorizedTeamsDesc, variant: "destructive" });
      return;
    }
    if (!teamName.trim()) return;
    const coachNames = selectedCoachMembershipIds
      .map((membershipId) => membershipNameById.get(membershipId))
      .filter((name): name is string => Boolean(name))
      .join(", ");
    const insertPayload: Record<string, unknown> = {
      club_id: clubId,
      name: teamName.trim(),
      sport: resolveSportId(teamSport),
      age_group: teamAge || null,
      coach_name: coachNames || teamCoach || null,
    };
    if (supportsTeamLeagueField) insertPayload.league = teamLeague.trim() || null;

    const { data, error } = await supabase
      .from("teams")
      .insert(insertPayload)
      .select()
      .single();
    if (error) { toast({ title: t.teamsPage.common.error, description: error.message, variant: "destructive" }); return; }
    const createdTeam = data as Team;
    try {
      await persistTeamAssignments(createdTeam.id);
    } catch (assignmentError: unknown) {
      const message = assignmentError instanceof Error ? assignmentError.message : t.teamsPage.common.error;
      toast({ title: t.teamsPage.common.error, description: message, variant: "destructive" });
    }
    setTeams(prev => [...prev, createdTeam]);
    await recordChangeHistory({
      scope: "teams",
      action: "create",
      entity_type: "team",
      entity_id: createdTeam.id,
      details: {
        name: createdTeam.name,
        sport: createdTeam.sport,
        age_group: createdTeam.age_group,
        coach_name: createdTeam.coach_name,
        league: createdTeam.league,
        players_count: selectedPlayerMembershipIds.length,
        source: "manual",
      },
    });
    setShowAddTeam(false);
    setTeamName(""); setTeamAge(""); setTeamCoach(""); setTeamSport("football");
    toast({ title: t.teamsPage.toast.teamCreated });
  };

  const handleEditTeam = (team: Team) => {
    if (!canManage) return;
    setEditingTeamId(team.id);
    setTeamName(team.name);
    setTeamSport(resolveSportId(team.sport));
    setTeamAge(team.age_group || "");
    setTeamCoach(teamCoachById.get(team.id) || team.coach_name || "");
    setTeamLeague(team.league || "");
    setSelectedCoachMembershipIds(teamCoachIdsByTeamId[team.id] || []);
    setSelectedPlayerMembershipIds(teamPlayerIdsByTeamId[team.id] || []);
    setTeamMemberSearch("");
    setShowAddTeam(true);
  };

  const handleUpsertTeam = async () => {
    if (!canManage || !clubId) {
      toast({ title: t.teamsPage.toast.notAuthorizedTeamsTitle, description: t.teamsPage.toast.notAuthorizedTeamsDesc, variant: "destructive" });
      return;
    }
    if (!teamName.trim()) return;

    if (!editingTeamId) {
      await handleAddTeam();
      return;
    }

    const coachNames = selectedCoachMembershipIds
      .map((membershipId) => membershipNameById.get(membershipId))
      .filter((name): name is string => Boolean(name))
      .join(", ");
    const updatePayload: Record<string, unknown> = {
      name: teamName.trim(),
      sport: resolveSportId(teamSport),
      age_group: teamAge || null,
      coach_name: coachNames || teamCoach || null,
    };
    if (supportsTeamLeagueField) updatePayload.league = teamLeague.trim() || null;

    const { data, error } = await supabase
      .from("teams")
      .update(updatePayload)
      .eq("club_id", clubId)
      .eq("id", editingTeamId)
      .select()
      .single();

    if (error) {
      toast({ title: t.teamsPage.common.error, description: error.message, variant: "destructive" });
      return;
    }

    const updated = data as Team;
    try {
      await persistTeamAssignments(editingTeamId);
    } catch (assignmentError: unknown) {
      const message = assignmentError instanceof Error ? assignmentError.message : t.teamsPage.common.error;
      toast({ title: t.teamsPage.common.error, description: message, variant: "destructive" });
    }
    setTeams((previous) => previous.map((team) => (team.id === editingTeamId ? updated : team)));
    await recordChangeHistory({
      scope: "teams",
      action: "update",
      entity_type: "team",
      entity_id: updated.id,
      details: {
        name: updated.name,
        sport: updated.sport,
        age_group: updated.age_group,
        coach_name: updated.coach_name,
        league: updated.league,
        players_count: selectedPlayerMembershipIds.length,
        source: "manual",
      },
    });
    setShowAddTeam(false);
    resetTeamForm();
    toast({ title: t.teamsPage.toast.teamUpdated });
  };

  const handleAddSession = async () => {
    if (!canManage || !clubId) {
      toast({ title: t.teamsPage.toast.notAuthorizedSessionsTitle, description: t.teamsPage.toast.notAuthorizedSessionsDesc, variant: "destructive" });
      return;
    }
    if (!sessionTitle.trim() || !sessionStart || !sessionEnd) return;
    const payload = {
      club_id: clubId,
      team_id: sessionTeamId || null,
      title: sessionTitle.trim(),
      location: sessionLocation || null,
      starts_at: sessionStart,
      ends_at: sessionEnd,
      created_by: user?.id,
    };

    const createSession = async () => {
      const activitiesRes = await supabase
        .from("activities")
        .insert({
          ...payload,
          type: "training",
          description: null,
        })
        .select("id, title, location, starts_at, ends_at, team_id, teams(name)")
        .single();
      if (!activitiesRes.error) return activitiesRes;
      if (!isMissingRelationError(activitiesRes.error)) return activitiesRes;
      return supabase.from("training_sessions").insert(payload).select("id, title, location, starts_at, ends_at, team_id, teams(name)").single();
    };

    const { data, error } = await createSession();
    if (error) { toast({ title: t.teamsPage.common.error, description: error.message, variant: "destructive" }); return; }
    const createdSession = data as unknown as TrainingSession;
    setSessions(prev => [...prev, createdSession]);
    const createdBookings = await syncSessionBookings({
      title: payload.title,
      teamId: payload.team_id,
      pitchId: sessionPitchId,
      startsAtInput: payload.starts_at,
      endsAtInput: payload.ends_at,
      repeatWeekly: sessionRepeatWeekly,
      repeatUntil: sessionRepeatUntil,
    });
    await recordChangeHistory({
      scope: "sessions",
      action: "create",
      entity_type: "training_session",
      entity_id: createdSession.id,
      details: {
        title: createdSession.title,
        starts_at: createdSession.starts_at,
        ends_at: createdSession.ends_at,
        team_id: createdSession.team_id,
        location: createdSession.location,
        pitch_id: sessionPitchId || null,
        repeat_weekly: sessionRepeatWeekly,
        repeat_until: sessionRepeatUntil || null,
        bookings_created: createdBookings,
        source: "manual",
      },
    });
    setShowAddSession(false);
    resetSessionForm();
    toast({ title: t.teamsPage.toast.sessionScheduled });
  };

  const handleEditSession = (session: TrainingSession) => {
    if (!canManage) return;
    setEditingSessionId(session.id);
    setSessionTitle(session.title);
    setSessionLocation(session.location || "");
    setSessionTeamId(session.team_id || "");
    setSessionStart(session.starts_at.slice(0, 16));
    setSessionEnd((session.ends_at || "").slice(0, 16));
    const linkedBookings = bookings
      .filter((booking) =>
        booking.booking_type === "training"
        && booking.title.trim().toLowerCase() === session.title.trim().toLowerCase()
        && (booking.team_id || "") === (session.team_id || "")
      )
      .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime());
    setSessionPitchId(linkedBookings[0]?.pitch_id || "");
    if (linkedBookings.length > 1) {
      const first = new Date(linkedBookings[0].starts_at).getTime();
      const second = new Date(linkedBookings[1].starts_at).getTime();
      const weeklyGapMs = 1000 * 60 * 60 * 24 * 7;
      if (Math.abs(second - first - weeklyGapMs) <= 1000 * 60 * 60) {
        setSessionRepeatWeekly(true);
        setSessionRepeatUntil(linkedBookings[linkedBookings.length - 1].starts_at.slice(0, 10));
      } else {
        setSessionRepeatWeekly(false);
        setSessionRepeatUntil("");
      }
    } else {
      setSessionRepeatWeekly(false);
      setSessionRepeatUntil("");
    }
    setShowAddSession(true);
  };

  const handleDeleteSession = async (id: string) => {
    if (!canManage || !clubId) {
      toast({ title: t.teamsPage.toast.notAuthorizedSessionsTitle, description: t.teamsPage.toast.notAuthorizedSessionsDesc, variant: "destructive" });
      return;
    }

    const deleteFromActivities = async () => {
      return supabase
        .from("activities")
        .delete()
        .eq("club_id", clubId)
        .eq("id", id)
        .eq("type", "training")
        .select("id");
    };

    const deleteFromTrainingSessions = async () => {
      return supabase
        .from("training_sessions")
        .delete()
        .eq("club_id", clubId)
        .eq("id", id)
        .select("id");
    };

    const activitiesRes = await deleteFromActivities();
    if (activitiesRes.error && !isMissingRelationError(activitiesRes.error)) {
      toast({ title: t.teamsPage.common.error, description: activitiesRes.error.message, variant: "destructive" });
      return;
    }

    let wasDeleted = Boolean(activitiesRes.data && activitiesRes.data.length > 0);

    if (isMissingRelationError(activitiesRes.error) || !wasDeleted) {
      const sessionsRes = await deleteFromTrainingSessions();
      if (sessionsRes.error) {
        toast({ title: t.teamsPage.common.error, description: sessionsRes.error.message, variant: "destructive" });
        return;
      }
      wasDeleted = wasDeleted || Boolean(sessionsRes.data && sessionsRes.data.length > 0);
    }

    const deleted = sessions.find((entry) => entry.id === id);
    setSessions((previous) => previous.filter((entry) => entry.id !== id));
    await recordChangeHistory({
      scope: "sessions",
      action: "delete",
      entity_type: "training_session",
      entity_id: id,
      details: {
        title: deleted?.title || null,
        starts_at: deleted?.starts_at || null,
        source: "manual",
        deleted: wasDeleted,
      },
    });
    toast({ title: t.teamsPage.toast.sessionRemoved });
  };

  const handleUpsertSession = async () => {
    if (!canManage || !clubId) {
      toast({ title: t.teamsPage.toast.notAuthorizedSessionsTitle, description: t.teamsPage.toast.notAuthorizedSessionsDesc, variant: "destructive" });
      return;
    }
    if (!sessionTitle.trim() || !sessionStart || !sessionEnd) return;

    if (!editingSessionId) {
      await handleAddSession();
      return;
    }

    const payload = {
      team_id: sessionTeamId || null,
      title: sessionTitle.trim(),
      location: sessionLocation || null,
      starts_at: sessionStart,
      ends_at: sessionEnd,
    };

    const updateSession = async () => {
      const activitiesRes = await supabase
        .from("activities")
        .update(payload)
        .eq("club_id", clubId)
        .eq("id", editingSessionId)
        .eq("type", "training")
        .select("id, title, location, starts_at, ends_at, team_id, teams(name)")
        .single();
      if (!activitiesRes.error) return activitiesRes;
      if (!isMissingRelationError(activitiesRes.error)) return activitiesRes;
      return supabase
        .from("training_sessions")
        .update(payload)
        .eq("club_id", clubId)
        .eq("id", editingSessionId)
        .select("id, title, location, starts_at, ends_at, team_id, teams(name)")
        .single();
    };

    const { data, error } = await updateSession();
    if (error) {
      toast({ title: t.teamsPage.common.error, description: error.message, variant: "destructive" });
      return;
    }

    const updated = data as unknown as TrainingSession;
    setSessions((previous) => previous.map((session) => (session.id === editingSessionId ? updated : session)));
    const createdBookings = await syncSessionBookings({
      title: payload.title,
      teamId: payload.team_id,
      pitchId: sessionPitchId,
      startsAtInput: payload.starts_at,
      endsAtInput: payload.ends_at,
      repeatWeekly: sessionRepeatWeekly,
      repeatUntil: sessionRepeatUntil,
    });
    await recordChangeHistory({
      scope: "sessions",
      action: "update",
      entity_type: "training_session",
      entity_id: updated.id,
      details: {
        title: updated.title,
        starts_at: updated.starts_at,
        ends_at: updated.ends_at,
        team_id: updated.team_id,
        location: updated.location,
        pitch_id: sessionPitchId || null,
        repeat_weekly: sessionRepeatWeekly,
        repeat_until: sessionRepeatUntil || null,
        bookings_created: createdBookings,
        source: "manual",
      },
    });
    setShowAddSession(false);
    resetSessionForm();
    toast({ title: t.teamsPage.toast.sessionUpdated });
  };

  const handleDeleteTeam = async (id: string) => {
    if (!canManage || !clubId) {
      toast({ title: t.teamsPage.toast.notAuthorizedTeamsTitle, description: t.teamsPage.toast.notAuthorizedTeamsDesc, variant: "destructive" });
      return;
    }
    const { error } = await supabase
      .from("teams")
      .delete()
      .eq("club_id", clubId)
      .eq("id", id);
    if (error) {
      toast({ title: t.teamsPage.common.error, description: error.message, variant: "destructive" });
      return;
    }
    const deleted = teams.find((team) => team.id === id);
    setTeams(prev => prev.filter((team) => team.id !== id));
    setTeamPlayerIdsByTeamId((previous) => {
      const next = { ...previous };
      delete next[id];
      return next;
    });
    setTeamCoachIdsByTeamId((previous) => {
      const next = { ...previous };
      delete next[id];
      return next;
    });
    await recordChangeHistory({
      scope: "teams",
      action: "delete",
      entity_type: "team",
      entity_id: id,
      details: {
        name: deleted?.name || null,
        source: "manual",
      },
    });
  };

  const toggleGridCell = (index: number) => {
    setSelectedPitchCells((previous) => {
      if (previous.includes(index)) return previous.filter((cell) => cell !== index);
      return [...previous, index].sort((a, b) => a - b);
    });
  };

  const handleAddPitch = async () => {
    if (!clubId || !canManage) return;
    if (!pitchName.trim() || selectedPitchCells.length === 0) return;
    if (editingPitchId) return;
    if (pitchParentId && !supportsParentPitchField) {
      toast({
        title: t.teamsPage.toast.splitUnavailableTitle,
        description: t.teamsPage.toast.splitUnavailableDesc,
        variant: "destructive",
      });
      return;
    }
    const parentPitch = pitchParentId ? pitchById.get(pitchParentId) : null;
    if (parentPitch && !isSubset(selectedPitchCells, parentPitch.grid_cells)) {
      toast({
        title: t.teamsPage.toast.invalidSplitTitle,
        description: t.teamsPage.toast.invalidSplitDesc,
        variant: "destructive",
      });
      return;
    }
    const insertPayload: Record<string, unknown> = {
      club_id: clubId,
      name: pitchName.trim(),
      notes: pitchNotes.trim() || null,
      grid_cells: selectedPitchCells,
      created_by: user?.id || null,
    };
    if (pitchParentId) insertPayload.parent_pitch_id = pitchParentId;
    if (supportsLayerFields) {
      insertPayload.layer_id = pitchLayerId || null;
      insertPayload.element_type = pitchElementType;
    }
    if (supportsDisplayColorField) {
      const resolvedColor = normalizeHexColor(pitchDisplayColor) ?? suggestColorByIndex(pitches.length);
      insertPayload.display_color = resolvedColor;
    }

    const { data, error } = await supabase
      .from("club_pitches")
      .insert(insertPayload)
      .select()
      .single();
    if (error) {
      let migrationHint = error.message;
      if (error.message.includes("parent_pitch_id")) migrationHint = t.teamsPage.toast.migrationSplitDb;
      else if (error.message.includes("display_color")) migrationHint = t.teamsPage.elementModal.colorMigrationHint;
      toast({ title: t.teamsPage.common.error, description: migrationHint, variant: "destructive" });
      return;
    }
    const row = data as unknown as Record<string, unknown>;
    const nextPitch: ClubPitch = {
      id: String(row.id),
      club_id: String(row.club_id),
      name: String(row.name),
      grid_cells: Array.isArray(row.grid_cells) ? row.grid_cells.map((cell) => Number(cell)) : [],
      notes: (row.notes as string | null) ?? null,
      parent_pitch_id: (row.parent_pitch_id as string | null) ?? null,
      layer_id: (row.layer_id as string | null) ?? null,
      element_type: ((row.element_type as ClubPitch["element_type"]) || "pitch"),
      display_color: (row.display_color as string | null) ?? null,
      created_at: String(row.created_at),
    };
    setPitches((previous) => [...previous, nextPitch].sort((a, b) => a.name.localeCompare(b.name)));
    setPitchName("");
    setPitchNotes("");
    setPitchParentId("");
    setPitchElementType("pitch");
    setPitchLayerId(derivePitchLayerIdFromFilter(activeLayerId));
    setPitchDisplayColor(suggestColorByIndex(0));
    setElementColorSectionOpen(false);
    setSelectedPitchCells([]);
    setShowAddPitch(false);
    toast({ title: t.teamsPage.toastElementCreated });
  };

  const handleOpenEditPitch = (pitch: ClubPitch) => {
    setEditingPitchId(pitch.id);
    setPitchName(pitch.name);
    setPitchNotes(pitch.notes || "");
    setPitchParentId(pitch.parent_pitch_id || "");
    setPitchElementType(pitch.element_type);
    setPitchLayerId(pitch.layer_id || "");
    const idx = pitches.findIndex((p) => p.id === pitch.id);
    setPitchDisplayColor(
      normalizeHexColor(pitch.display_color ?? "") ?? suggestColorByIndex(idx >= 0 ? idx : 0),
    );
    setSelectedPitchCells([...pitch.grid_cells]);
    setShowAddPitch(true);
  };

  const handleUpdatePitch = async () => {
    if (!clubId || !canManage || !editingPitchId) return;
    if (!pitchName.trim() || selectedPitchCells.length === 0) return;
    if (pitchParentId && !supportsParentPitchField) {
      toast({
        title: t.teamsPage.toast.splitUnavailableTitle,
        description: t.teamsPage.toast.splitUnavailableDesc,
        variant: "destructive",
      });
      return;
    }
    const parentPitch = pitchParentId ? pitchById.get(pitchParentId) : null;
    if (parentPitch && !isSubset(selectedPitchCells, parentPitch.grid_cells)) {
      toast({
        title: t.teamsPage.toast.invalidSplitTitle,
        description: t.teamsPage.toast.invalidSplitDesc,
        variant: "destructive",
      });
      return;
    }

    const updatePayload: Record<string, unknown> = {
      name: pitchName.trim(),
      notes: pitchNotes.trim() || null,
      grid_cells: selectedPitchCells,
    };
    if (pitchParentId) {
      updatePayload.parent_pitch_id = pitchParentId;
    } else if (supportsParentPitchField) {
      // On upgraded schemas, allow clearing the parent relation.
      updatePayload.parent_pitch_id = null;
    }
    if (supportsLayerFields) {
      updatePayload.layer_id = pitchLayerId || null;
      updatePayload.element_type = pitchElementType;
    }
    if (supportsDisplayColorField) {
      const idx = pitches.findIndex((p) => p.id === editingPitchId);
      const resolvedColor = normalizeHexColor(pitchDisplayColor) ?? suggestColorByIndex(idx >= 0 ? idx : 0);
      updatePayload.display_color = resolvedColor;
    }

    const { data, error } = await supabase
      .from("club_pitches")
      .update(updatePayload)
      .eq("club_id", clubId)
      .eq("id", editingPitchId)
      .select()
      .single();

    if (error) {
      let migrationHint = error.message;
      if (error.message.includes("parent_pitch_id")) migrationHint = t.teamsPage.toast.migrationSplitDb;
      else if (error.message.includes("display_color")) migrationHint = t.teamsPage.elementModal.colorMigrationHint;
      toast({ title: t.teamsPage.common.error, description: migrationHint, variant: "destructive" });
      return;
    }

    const row = data as unknown as Record<string, unknown>;
    const updatedPitch: ClubPitch = {
      id: String(row.id),
      club_id: String(row.club_id),
      name: String(row.name),
      grid_cells: Array.isArray(row.grid_cells) ? row.grid_cells.map((cell) => Number(cell)) : [],
      notes: (row.notes as string | null) ?? null,
      parent_pitch_id: (row.parent_pitch_id as string | null) ?? null,
      layer_id: (row.layer_id as string | null) ?? null,
      element_type: ((row.element_type as ClubPitch["element_type"]) || "pitch"),
      display_color: (row.display_color as string | null) ?? null,
      created_at: String(row.created_at),
    };

    setPitches((previous) =>
      previous.map((pitch) => (pitch.id === editingPitchId ? updatedPitch : pitch)).sort((a, b) => a.name.localeCompare(b.name)),
    );
    setEditingPitchId(null);
    setPitchName("");
    setPitchNotes("");
    setPitchParentId("");
    setPitchElementType("pitch");
    setPitchLayerId(derivePitchLayerIdFromFilter(activeLayerId));
    setPitchDisplayColor(suggestColorByIndex(0));
    setElementColorSectionOpen(false);
    setSelectedPitchCells([]);
    setShowAddPitch(false);
    toast({ title: t.teamsPage.toastElementUpdated });
  };

  const handleAddBooking = async () => {
    if (!clubId || !canManage) return;
    if (!bookingPitchId || !bookingTitle.trim() || !bookingStart || !bookingEnd) return;
    if (new Date(bookingEnd) <= new Date(bookingStart)) {
      toast({ title: t.teamsPage.toast.invalidTimeTitle, description: t.teamsPage.toast.invalidTimeDesc, variant: "destructive" });
      return;
    }

    const bookingPitch = pitchById.get(bookingPitchId);
    const overlapping = bookings.filter((entry) => {
      if (entry.status === "cancelled") return false;
      const entryPitch = pitchById.get(entry.pitch_id);
      const sameArea = bookingPitch && entryPitch
        ? bookingPitch.grid_cells.some((cell) => entryPitch.grid_cells.includes(cell))
        : entry.pitch_id === bookingPitchId;
      return sameArea && overlaps(entry.starts_at, entry.ends_at, bookingStart, bookingEnd);
    });

    const { data, error } = await supabase
      .from("pitch_bookings")
      .insert({
        club_id: clubId,
        pitch_id: bookingPitchId,
        team_id: bookingTeamId || null,
        booking_type: bookingType,
        title: bookingTitle.trim(),
        starts_at: bookingStart,
        ends_at: bookingEnd,
        created_by: user?.id || null,
      })
      .select()
      .single();

    if (error) {
      toast({ title: t.teamsPage.common.error, description: error.message, variant: "destructive" });
      return;
    }

    const inserted = data as unknown as PitchBooking;

    // If a larger pitch is booked while smaller sub-pitches overlap, request reconfirmation from affected bookings.
    if (bookingPitch) {
      const impactedSmaller = overlapping.filter((entry) => {
        if (entry.id === inserted.id) return false;
        const entryPitch = pitchById.get(entry.pitch_id);
        if (!entryPitch) return false;
        const isBiggerArea = bookingPitch.grid_cells.length > entryPitch.grid_cells.length;
        return isBiggerArea && isSubset(entryPitch.grid_cells, bookingPitch.grid_cells);
      });

      if (impactedSmaller.length > 0) {
        const impactedIds = impactedSmaller.map((entry) => entry.id);
        const nowIso = new Date().toISOString();

        const { error: updateError } = await supabase
          .from("pitch_bookings")
          .update({
            needs_reconfirmation: true,
            reconfirmation_status: "pending",
            overridden_by_booking_id: inserted.id,
            reconfirmation_requested_at: nowIso,
          })
          .in("id", impactedIds);

        if (!updateError) {
          const notifyTargets = [...new Set(impactedSmaller.map((entry) => entry.created_by).filter(Boolean) as string[])];
          if (notifyTargets.length > 0 && clubId) {
            const notificationRows = notifyTargets
              .filter((targetUserId) => targetUserId !== user?.id)
              .map((targetUserId) => ({
                club_id: clubId,
                user_id: targetUserId,
                title: t.teamsPage.notificationReconfirmTitle,
                body: fillTemplate(t.teamsPage.notificationReconfirmBody, { title: bookingTitle.trim() }),
                notification_type: "pitch_reconfirmation",
                reference_id: inserted.id,
              }));
            if (notificationRows.length > 0) {
              await supabase.from("notifications").insert(notificationRows);
            }
          }
        }
      }
    }

    const refreshRes = await supabase.from("pitch_bookings").select("*").eq("club_id", clubId).order("starts_at", { ascending: true }).limit(400);
    const refreshed = (refreshRes.data as unknown as Array<Record<string, unknown>>) || [];
    setBookings(refreshed.map((booking) => ({
      id: String(booking.id),
      club_id: String(booking.club_id),
      pitch_id: String(booking.pitch_id),
      team_id: (booking.team_id as string | null) ?? null,
      booking_type: ((booking.booking_type as "training" | "match" | "other") || "training"),
      title: String(booking.title),
      starts_at: String(booking.starts_at),
      ends_at: String(booking.ends_at),
      status: ((booking.status as "booked" | "cancelled") || "booked"),
      created_by: (booking.created_by as string | null) ?? null,
      needs_reconfirmation: Boolean(booking.needs_reconfirmation),
      reconfirmation_status: ((booking.reconfirmation_status as "not_required" | "pending" | "confirmed" | "declined") || "not_required"),
      overridden_by_booking_id: (booking.overridden_by_booking_id as string | null) ?? null,
      reconfirmation_requested_at: (booking.reconfirmation_requested_at as string | null) ?? null,
      created_at: String(booking.created_at),
    })));
    setBookingPitchId("");
    setBookingTeamId("");
    setBookingType("training");
    setBookingTitle("");
    setBookingStart("");
    setBookingEnd("");
    setShowAddBooking(false);
    toast({
      title: overlapping.length > 0 ? t.teamsPage.toast.bookingSavedOverlap : t.teamsPage.toast.bookingSaved,
      description: overlapping.length > 0 ? t.teamsPage.toast.bookingOverlapDesc : undefined,
      variant: overlapping.length > 0 ? "destructive" : "default",
    });
  };

  const handleReconfirmation = async (bookingId: string, decision: "confirmed" | "declined") => {
    if (!clubId) return;
    const { error } = await supabase
      .from("pitch_bookings")
      .update({
        reconfirmation_status: decision,
        needs_reconfirmation: false,
      })
      .eq("club_id", clubId)
      .eq("id", bookingId);
    if (error) {
      toast({ title: t.teamsPage.common.error, description: error.message, variant: "destructive" });
      return;
    }
    setBookings((previous) =>
      previous.map((booking) =>
        booking.id === bookingId
          ? { ...booking, reconfirmation_status: decision, needs_reconfirmation: false }
          : booking,
      ),
    );
    toast({ title: decision === "confirmed" ? t.teamsPage.toast.bookingConfirmed : t.teamsPage.toast.bookingDeclined });
  };

  const handleDeleteBooking = async (id: string) => {
    if (!clubId || !canManage) return;
    const { error } = await supabase.from("pitch_bookings").delete().eq("club_id", clubId).eq("id", id);
    if (error) {
      toast({ title: t.teamsPage.common.error, description: error.message, variant: "destructive" });
      return;
    }
    setBookings((previous) => previous.filter((booking) => booking.id !== id));
    toast({ title: t.teamsPage.toast.bookingRemoved });
  };

  const handleDeletePitchRequest = (pitchId: string) => {
    if (!clubId || !canManage) return;
    const pitch = pitchById.get(pitchId);
    if (!pitch) return;

    const hasBookings = bookings.some((booking) => booking.pitch_id === pitchId && booking.status !== "cancelled");
    if (hasBookings) {
      toast({
        title: t.teamsPage.elementModal.deleteBlockedBookingsTitle,
        description: t.teamsPage.elementModal.deleteBlockedBookingsDesc,
        variant: "destructive",
      });
      return;
    }

    const hasChildren = pitches.some((entry) => entry.parent_pitch_id === pitchId);
    if (hasChildren) {
      toast({
        title: t.teamsPage.elementModal.deleteBlockedChildrenTitle,
        description: t.teamsPage.elementModal.deleteBlockedChildrenDesc,
        variant: "destructive",
      });
      return;
    }

    setPendingPitchDeleteId(pitchId);
  };

  const handleDeletePitchConfirm = async () => {
    if (!clubId || !canManage || !pendingPitchDeleteId) return;
    const { error } = await supabase
      .from("club_pitches")
      .delete()
      .eq("club_id", clubId)
      .eq("id", pendingPitchDeleteId);

    if (error) {
      toast({ title: t.teamsPage.common.error, description: error.message, variant: "destructive" });
      return;
    }

    setPitches((previous) => previous.filter((entry) => entry.id !== pendingPitchDeleteId));
    setPendingPitchDeleteId(null);
    toast({ title: t.teamsPage.toastElementDeleted });
  };

  const toggleCoachSelection = (membershipId: string) => {
    setSelectedCoachMembershipIds((previous) => (
      previous.includes(membershipId)
        ? previous.filter((id) => id !== membershipId)
        : [...previous, membershipId]
    ));
  };

  const togglePlayerSelection = (membershipId: string) => {
    setSelectedPlayerMembershipIds((previous) => (
      previous.includes(membershipId)
        ? previous.filter((id) => id !== membershipId)
        : [...previous, membershipId]
    ));
  };

  const teamsToolbarRevision = `${currentTab}-${canManage}-${canManageLayers}-${bookingActionLabel}-${activeLayerId}-${pitches.length}`;

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeaderSlot
        title={isAssetLayersPage ? t.sidebar.assetLayers : t.teamsPage.title}
        subtitle={canManage ? t.teamsPage.subtitleManage : t.teamsPage.subtitleView}
        toolbarRevision={teamsToolbarRevision}
        rightSlot={
          <div className="flex gap-2 flex-wrap">
            {currentTab === "pitches" && (
              <>
                {canManageLayers && (
                  <Button size="sm" variant="outline" onClick={() => setShowAddLayer(true)}>
                    <Layers3 className="w-4 h-4 mr-1" /> {t.teamsPage.headerAddLayer}
                  </Button>
                )}
                <Button size="sm" variant="outline" onClick={() => setShowAddBooking(true)} disabled={!canManage}>
                  <LayoutGrid className="w-4 h-4 mr-1" /> {bookingActionLabel}
                </Button>
                <Button
                  size="sm"
                  className="bg-gradient-gold-static text-primary-foreground hover:brightness-110"
                  onClick={() => {
                    setEditingPitchId(null);
                    setPitchName("");
                    setPitchNotes("");
                    setPitchParentId("");
                    setPitchElementType("pitch");
                    setPitchLayerId(derivePitchLayerIdFromFilter(activeLayerId));
                    setSelectedPitchCells([]);
                    setPitchDisplayColor(suggestColorByIndex(pitches.length));
                    setElementColorSectionOpen(false);
                    setShowAddPitch(true);
                  }}
                  disabled={!canManage}
                >
                  <LayoutGrid className="w-4 h-4 mr-1" /> {t.teamsPage.addPitch}
                </Button>
              </>
            )}
            {currentTab === "teams" && (
              <Button
                size="sm"
                className="bg-gradient-gold-static text-primary-foreground hover:brightness-110"
                onClick={() => {
                  resetTeamForm();
                  setShowAddTeam(true);
                }}
                disabled={!canManage}
              >
                <Plus className="w-4 h-4 mr-1" /> {t.teamsPage.addTeam}
              </Button>
            )}
            {currentTab === "sessions" && (
              <Button
                size="sm"
                className="bg-gradient-gold-static text-primary-foreground hover:brightness-110"
                onClick={() => {
                  resetSessionForm();
                  setShowAddSession(true);
                }}
                disabled={!canManage}
              >
                <Calendar className="w-4 h-4 mr-1" /> {t.teamsPage.addSession}
              </Button>
            )}
          </div>
        }
      />

      <div className="container mx-auto px-4 py-6">
        {!isAssetLayersPage && <div className="mb-4 inline-flex rounded-xl border border-border/60 bg-card/40 p-1">
          {(
            [
              { id: "pitches", label: t.teamsPage.tabs.pitches },
              { id: "teams", label: t.teamsPage.tabs.teams },
              { id: "sessions", label: t.teamsPage.tabs.sessions },
              { id: "history", label: t.teamsPage.tabs.history },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
                currentTab === tab.id ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>}

        {(clubLoading || loading) ? (
          <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : !clubId ? (
          <div className="text-center py-20 text-muted-foreground">{t.teamsPage.noClub}</div>
        ) : currentTab === "teams" ? (
          <div>
            <h2 className="font-display font-semibold text-foreground mb-4 flex items-center gap-2">
              <Trophy className="w-4 h-4 text-primary" /> {t.teamsPage.tabs.teams} ({teams.length})
            </h2>
            {canManage && (
              <div className="mb-4 rounded-xl border border-border/60 bg-card/40 p-3">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="text-xs text-muted-foreground">{t.teamsPage.upload.teamsHint}</div>
                  <div className="flex items-center gap-2">
                    <input
                      ref={teamsUploadInputRef}
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      className="hidden"
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (!file) return;
                        void handleUploadTeamsFile(file);
                        event.currentTarget.value = "";
                      }}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => teamsUploadInputRef.current?.click()}
                      disabled={uploadProgress.inProgress}
                    >
                      <UploadCloud className="w-3.5 h-3.5 mr-1" /> {t.teamsPage.upload.uploadExcel}
                    </Button>
                  </div>
                </div>
                {(uploadProgress.inProgress || (uploadProgress.done && uploadProgress.mode === "teams")) && (
                  <div className="mt-3">
                    <div className="h-2 w-full overflow-hidden rounded-full bg-border/60">
                      <div className="h-full bg-primary transition-all" style={{ width: `${uploadProgress.percent}%` }} />
                    </div>
                    <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground">
                      <span>{uploadProgress.percent}% ({uploadProgress.processed}/{uploadProgress.total})</span>
                      {uploadProgress.done && uploadProgress.mode === "teams" && (
                        <span className="inline-flex items-center gap-1 text-primary"><CheckCircle2 className="w-3.5 h-3.5" /> {t.teamsPage.upload.validated}</span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
            {teams.length === 0 ? (
              <div className="rounded-xl bg-card border border-border p-8 text-center text-muted-foreground text-sm">{t.teamsPage.noTeams}</div>
            ) : (
              <div className="space-y-3">
                {teams.map((team, i) => (
                  <motion.div key={team.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                    onClick={() => handleEditTeam(team)}
                    onKeyDown={(event) => {
                      if (event.key !== "Enter" && event.key !== " ") return;
                      event.preventDefault();
                      handleEditTeam(team);
                    }}
                    role={canManage ? "button" : undefined}
                    tabIndex={canManage ? 0 : -1}
                    className={`p-4 rounded-xl bg-card border border-border flex items-center justify-between ${canManage ? "cursor-pointer hover:border-primary/40 transition-colors" : ""}`}>
                    <div>
                      <div className="text-sm font-medium text-foreground">{team.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {resolveSportLabel(team.sport)}
                        {team.age_group ? ` · ${team.age_group}` : ""}
                        {team.league ? ` · ${t.teamsPage.teamModal.leagueLabel}: ${team.league}` : ""}
                        {teamCoachById.get(team.id) ? ` · ${t.teamsPage.coach}: ${teamCoachById.get(team.id)}` : ""}
                        {(teamPlayerIdsByTeamId[team.id]?.length || 0) > 0 ? ` · ${teamPlayerIdsByTeamId[team.id].length} ${t.teamsPage.teamModal.playersCountSuffix}` : ""}
                      </div>
                    </div>
                    {canManage && (
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(event) => {
                            event.stopPropagation();
                            handleEditTeam(team);
                          }}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(event) => {
                            event.stopPropagation();
                            handleDeleteTeam(team.id);
                          }}
                          className="text-muted-foreground hover:text-accent"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        ) : currentTab === "sessions" ? (
          <div>
            <h2 className="font-display font-semibold text-foreground mb-4 flex items-center gap-2">
              <Dumbbell className="w-4 h-4 text-primary" /> {t.teamsPage.tabs.sessions} ({sessions.length})
            </h2>
            {canManage && (
              <div className="mb-4 rounded-xl border border-border/60 bg-card/40 p-3">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="text-xs text-muted-foreground">{t.teamsPage.upload.sessionsHint}</div>
                  <div className="flex items-center gap-2">
                    <input
                      ref={sessionsUploadInputRef}
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      className="hidden"
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (!file) return;
                        void handleUploadSessionsFile(file);
                        event.currentTarget.value = "";
                      }}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => sessionsUploadInputRef.current?.click()}
                      disabled={uploadProgress.inProgress}
                    >
                      <UploadCloud className="w-3.5 h-3.5 mr-1" /> {t.teamsPage.upload.uploadExcel}
                    </Button>
                  </div>
                </div>
                {(uploadProgress.inProgress || (uploadProgress.done && uploadProgress.mode === "sessions")) && (
                  <div className="mt-3">
                    <div className="h-2 w-full overflow-hidden rounded-full bg-border/60">
                      <div className="h-full bg-primary transition-all" style={{ width: `${uploadProgress.percent}%` }} />
                    </div>
                    <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground">
                      <span>{uploadProgress.percent}% ({uploadProgress.processed}/{uploadProgress.total})</span>
                      {uploadProgress.done && uploadProgress.mode === "sessions" && (
                        <span className="inline-flex items-center gap-1 text-primary"><CheckCircle2 className="w-3.5 h-3.5" /> {t.teamsPage.upload.validated}</span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
            {sessions.length === 0 ? (
              <div className="rounded-xl bg-card border border-border p-8 text-center text-muted-foreground text-sm">{t.teamsPage.noSessions}</div>
            ) : (
              <div className="space-y-3">
                {sessions.map((s, i) => (
                  <motion.div key={s.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                    onClick={() => handleEditSession(s)}
                    onKeyDown={(event) => {
                      if (event.key !== "Enter" && event.key !== " ") return;
                      event.preventDefault();
                      handleEditSession(s);
                    }}
                    role={canManage ? "button" : undefined}
                    tabIndex={canManage ? 0 : -1}
                    className={`p-4 rounded-xl bg-card/40 backdrop-blur-2xl border border-border/60 ${canManage ? "cursor-pointer hover:border-primary/40 transition-colors" : ""}`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-foreground">{s.title}</span>
                      <div className="flex items-center gap-1">
                        {s.teams?.name && <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary">{s.teams.name}</span>}
                        {canManage && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(event) => {
                              event.stopPropagation();
                              handleEditSession(s);
                            }}
                            className="h-7 w-7 text-muted-foreground hover:text-foreground"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                        )}
                        {canManage && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(event) => {
                              event.stopPropagation();
                              void handleDeleteSession(s.id);
                            }}
                            className="h-7 w-7 text-muted-foreground hover:text-accent"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {new Date(s.starts_at).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                      {s.location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {s.location}</span>}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        ) : currentTab === "history" ? (
          <div>
            <h2 className="font-display font-semibold text-foreground mb-4 flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" /> {t.teamsPage.history.title} ({changeHistory.length})
            </h2>
            {!supportsChangeHistory && (
              <div className="mb-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-400">
                {t.teamsPage.history.migrationHint}
              </div>
            )}
            {changeHistory.length === 0 ? (
              <div className="rounded-xl bg-card border border-border p-8 text-center text-muted-foreground text-sm">{t.teamsPage.history.empty}</div>
            ) : (
              <div className="space-y-3">
                {formattedHistoryEntries.map((entry) => (
                  <div key={entry.id} className="rounded-xl border border-border/60 bg-card/40 p-4">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div>
                        <div className="text-sm font-semibold text-foreground">{entry.actionLabel} • {entry.entityLabel}</div>
                        <div className="mt-1 text-[11px] text-muted-foreground">{entry.scopeLabel}</div>
                      </div>
                      <div className="text-right text-[11px] text-muted-foreground">
                        <div>{entry.timestamp}</div>
                        <div>{t.teamsPage.history.byLabel}: {entry.actor}</div>
                      </div>
                    </div>
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      {entry.detailItems.length > 0 ? entry.detailItems.map((item) => (
                        <div key={`${entry.id}-${item.label}`} className="rounded-lg border border-border/50 bg-background/40 px-2.5 py-2">
                          <div className="text-[10px] text-muted-foreground">{item.label}</div>
                          <div className="mt-0.5 text-xs text-foreground break-words">{item.value}</div>
                        </div>
                      )) : (
                        <div className="text-[11px] text-muted-foreground">{t.teamsPage.history.noDetails}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            <div className="rounded-2xl border border-border/60 bg-card/40 backdrop-blur-2xl p-4 flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-primary" />
                <div className="text-sm font-medium text-foreground">
                  {canManage ? t.teamsPage.pitchesCanManage : t.teamsPage.pitchesReadOnly}
                </div>
              </div>
              <div className="text-xs text-muted-foreground">{t.teamsPage.permissionHint}</div>
            </div>

            <div className="rounded-2xl border border-border/60 bg-card/40 backdrop-blur-2xl p-4">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <Layers3 className="w-4 h-4 text-primary" />
                  {t.teamsPage.layersTitle}
                </div>
                <div className="text-xs text-muted-foreground">
                  {activeLayerId === "all"
                    ? t.teamsPage.layersShowingAll
                    : fillTemplate(t.teamsPage.layersShowingNamed, {
                        name: activeLayerPurposeFilter
                          ? t.teamsPage.layerPurposes[activeLayerPurposeFilter]
                          : (layerNameById.get(activeLayerId) || t.teamsPage.layerBadge),
                      })}
                </div>
              </div>
              <div className="mt-3 flex gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => setActiveLayerId("all")}
                  className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${
                    activeLayerId === "all" ? "bg-primary/15 text-primary border-primary/40" : "text-muted-foreground border-border/60 hover:text-foreground"
                  }`}
                >
                  {t.teamsPage.layersAll}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveLayerId(TRAINING_LAYER_FILTER_ID)}
                  className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${
                    activeLayerId === TRAINING_LAYER_FILTER_ID ? "bg-primary/15 text-primary border-primary/40" : "text-muted-foreground border-border/60 hover:text-foreground"
                  }`}
                >
                  {t.teamsPage.layerPurposes.training}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveLayerId(ADMIN_LAYER_FILTER_ID)}
                  className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${
                    activeLayerId === ADMIN_LAYER_FILTER_ID ? "bg-primary/15 text-primary border-primary/40" : "text-muted-foreground border-border/60 hover:text-foreground"
                  }`}
                >
                  {t.teamsPage.layerPurposes.administration}
                </button>
                {layers.map((layer) => (
                  <button
                    key={layer.id}
                    type="button"
                    onClick={() => setActiveLayerId(layer.id)}
                    className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${
                      activeLayerId === layer.id ? "bg-primary/15 text-primary border-primary/40" : "text-muted-foreground border-border/60 hover:text-foreground"
                    }`}
                    title={layer.description || undefined}
                  >
                    {layer.name} ({t.teamsPage.layerPurposes[layer.purpose]})
                  </button>
                ))}
              </div>
            </div>

            <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-3">
              <div className="rounded-2xl border border-border/60 bg-card/40 backdrop-blur-2xl p-4">
                <div className="text-[11px] text-muted-foreground">{t.teamsPage.kpis.totalBookings}</div>
                <div className="mt-1 text-2xl font-display font-bold text-foreground">{usageSummary.totalBookings}</div>
              </div>
              <div className="rounded-2xl border border-border/60 bg-card/40 backdrop-blur-2xl p-4">
                <div className="text-[11px] text-muted-foreground">{t.teamsPage.kpis.doubleBooked}</div>
                <div className="mt-1 text-2xl font-display font-bold text-accent">{usageSummary.conflictCount}</div>
              </div>
              <div className="rounded-2xl border border-border/60 bg-card/40 backdrop-blur-2xl p-4">
                <div className="text-[11px] text-muted-foreground">{t.teamsPage.kpis.freeNow}</div>
                <div className="mt-1 text-2xl font-display font-bold text-primary">{usageSummary.freeNow}</div>
              </div>
              <div className="rounded-2xl border border-border/60 bg-card/40 backdrop-blur-2xl p-4">
                <div className="text-[11px] text-muted-foreground">{t.teamsPage.kpis.mostUsed}</div>
                <div className="mt-1 text-sm font-semibold text-foreground truncate">{usageSummary.topPitchName}</div>
                <div className="text-[11px] text-muted-foreground">{usageSummary.topPitchCount} {t.teamsPage.bookingsShort}</div>
              </div>
            </div>

            <div className="grid xl:grid-cols-3 gap-6">
              <div className="xl:col-span-2">
                <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
                  <h2 className="font-display font-semibold text-foreground flex items-center gap-2">
                    <LayoutGrid className="w-4 h-4 text-primary" /> {t.teamsPage.pitchesPlanner} ({filteredPitches.length})
                  </h2>
                  <div className="inline-flex rounded-xl border border-border/60 bg-card/40 p-1">
                    <button type="button" onClick={() => setPitchViewMode("separate")} className={`px-2.5 py-1 text-[11px] rounded-lg transition-colors ${pitchViewMode === "separate" ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground"}`}>
                      {t.teamsPage.viewSeparate}
                    </button>
                    <button type="button" onClick={() => setPitchViewMode("combined")} className={`px-2.5 py-1 text-[11px] rounded-lg transition-colors ${pitchViewMode === "combined" ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground"}`}>
                      {t.teamsPage.viewCombined}
                    </button>
                  </div>
                </div>
                {filteredPitches.length === 0 ? (
                  <div className="rounded-2xl border border-border/60 bg-card/40 backdrop-blur-2xl p-8 text-center text-muted-foreground text-sm">{t.teamsPage.noPitchesHint} {GRID_LABEL}</div>
                ) : pitchViewMode === "combined" ? (
                  <div className="rounded-2xl border border-border/60 bg-card/40 backdrop-blur-2xl p-4">
                    <div className="grid gap-[4px]" style={{ gridTemplateColumns: `repeat(${GRID_SIZE}, minmax(0, 1fr))` }}>
                      {Array.from({ length: GRID_CELLS }, (_, index) => {
                        const owners = combinedPitchCells.get(index) || [];
                        const ownerColors = owners.map((ownerId) => pitchColorById.get(ownerId) || "#71717a");
                        const background = mixedCellBackground(ownerColors);
                        const isSelectedCell = selectedBookingPitchId ? owners.includes(selectedBookingPitchId) : false;
                        const hasOwners = owners.length > 0;
                        const borderColor = isSelectedCell
                          ? "hsl(var(--primary))"
                          : owners.length > 1
                            ? "rgba(251, 191, 36, 0.8)"
                            : hasOwners
                              ? hexToRgba(ownerColors[0], 0.92)
                              : undefined;
                        const selectedGlow = isSelectedCell
                          ? "inset 0 0 0 2px rgba(255,255,255,0.95), 0 0 0 2px hsl(var(--primary)), 0 0 10px rgba(251,191,36,0.65)"
                          : undefined;
                        return (
                          <div key={`combined-${index}`} className={`aspect-square rounded-[3px] border ${owners.length > 1 ? "ring-1 ring-offset-0 ring-amber-400/80" : ""} ${isSelectedCell ? "ring-2 ring-primary/80" : ""} ${owners.length === 0 ? "bg-background/40 border-border/40" : ""}`}
                            style={hasOwners ? { background, borderColor, boxShadow: selectedGlow } : undefined}
                            title={owners.map((ownerId) => pitchNameById.get(ownerId) || ownerId).join(" + ") || t.teamsPage.unassigned} />
                        );
                      })}
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-2">{t.teamsPage.combinedHint}</p>
                  </div>
                ) : (
                  <div className="grid md:grid-cols-2 gap-4">
                    {filteredPitches.map((pitch) => (
                      <div
                        key={pitch.id}
                        ref={(node) => {
                          pitchCardRefs.current[pitch.id] = node;
                        }}
                        className={`rounded-2xl border bg-card/40 backdrop-blur-2xl p-4 ${selectedBookingPitchId === pitch.id ? "border-primary/60 ring-1 ring-primary/50" : "border-border/60"}`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="text-sm font-semibold text-foreground truncate flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full border" style={{ background: hexToRgba(pitchColorById.get(pitch.id) || "#71717a", 0.7), borderColor: hexToRgba(pitchColorById.get(pitch.id) || "#71717a", 0.96) }} />
                            {pitch.name}
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                              {formatElementTypeLabel(pitch.element_type, t.teamsPage.elementTypes)}
                            </div>
                            {pitch.layer_id && (
                              <div className="text-[10px] px-2 py-0.5 rounded-full bg-background/70 text-muted-foreground border border-border/60">
                                {layerNameById.get(pitch.layer_id) || t.teamsPage.layerBadge}
                              </div>
                            )}
                            <div className="text-[11px] text-muted-foreground">{pitch.grid_cells.length} {t.teamsPage.cells}</div>
                            {canManage && (
                              <div className="flex items-center gap-1">
                                <Button variant="ghost" size="icon" className="w-7 h-7" onClick={() => handleOpenEditPitch(pitch)}><Pencil className="w-3.5 h-3.5" /></Button>
                                <Button variant="ghost" size="icon" className="w-7 h-7 text-muted-foreground hover:text-accent" onClick={() => handleDeletePitchRequest(pitch.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="mt-3 grid gap-[3px]" style={{ gridTemplateColumns: `repeat(${GRID_SIZE}, minmax(0, 1fr))` }}>
                          {Array.from({ length: GRID_CELLS }, (_, index) => {
                            const active = pitch.grid_cells.includes(index);
                            return <div key={`${pitch.id}-${index}`} className={`aspect-square rounded-[2px] border ${active ? "" : "bg-background/40 border-border/40"}`} style={active ? { background: hexToRgba(pitchColorById.get(pitch.id) || "#71717a", 0.7), borderColor: hexToRgba(pitchColorById.get(pitch.id) || "#71717a", 0.92) } : undefined} />;
                          })}
                        </div>
                        {pitch.notes && <p className="mt-3 text-[11px] text-muted-foreground">{pitch.notes}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <h2 className="font-display font-semibold text-foreground mb-4 flex items-center gap-2"><Calendar className="w-4 h-4 text-primary" /> {t.teamsPage.daySchedule}</h2>
                <div className="rounded-2xl border border-border/60 bg-card/40 backdrop-blur-2xl p-4">
                  <label className="text-[11px] text-muted-foreground block mb-1">{t.teamsPage.selectDay}</label>
                  <Input type="date" value={usageDate} onChange={(event) => setUsageDate(event.target.value)} className="bg-background/50" />
                  <div className="mt-3 space-y-2 max-h-[420px] overflow-y-auto">
                    {dayBookings.length === 0 ? <div className="text-xs text-muted-foreground">{t.teamsPage.noBookingsDay}</div> : dayBookings.map((booking) => (
                      <button
                        key={booking.id}
                        type="button"
                        onClick={() => setSelectedBookingId((previous) => (previous === booking.id ? null : booking.id))}
                        className={`w-full text-left rounded-xl border bg-background/50 p-3 transition-colors hover:border-primary/40 ${selectedBookingId === booking.id ? "border-primary/50 ring-1 ring-primary/40" : "border-border/60"}`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex min-w-0 items-center gap-1.5">
                            <ChevronDown className={`h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform ${selectedBookingId === booking.id ? "rotate-180" : ""}`} />
                            <div className="text-xs font-semibold text-foreground truncate">{booking.title}</div>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className={`text-[10px] px-2 py-0.5 rounded-full border ${booking.hasConflict ? "bg-accent/15 text-accent border-accent/30" : "bg-primary/15 text-primary border-primary/30"}`}>{booking.hasConflict ? t.teamsPage.conflict : t.teamsPage.ok}</span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={(event) => {
                                event.stopPropagation();
                                setBookingDetailsId(booking.id);
                              }}
                            >
                              <AlertTriangle className="w-3.5 h-3.5 text-muted-foreground" />
                            </Button>
                          </div>
                        </div>
                        <div className="mt-1 text-[11px] text-muted-foreground">{booking.pitchName} • {booking.teamName || t.teamsPage.clubWide} • {t.teamsPage.bookingTypes[booking.booking_type]}</div>
                        {selectedBookingId === booking.id && (
                          <div className="mt-2 rounded-lg border border-border/60 bg-background/40 p-2.5 space-y-1.5">
                            <div className="grid grid-cols-2 gap-2 text-[11px]">
                              <div>
                                <div className="text-muted-foreground">{t.teamsPage.bookingDetails.start}</div>
                                <div className="text-foreground">{new Date(booking.starts_at).toLocaleString()}</div>
                              </div>
                              <div>
                                <div className="text-muted-foreground">{t.teamsPage.bookingDetails.end}</div>
                                <div className="text-foreground">{new Date(booking.ends_at).toLocaleString()}</div>
                              </div>
                            </div>
                            <div className="text-[11px]">
                              <span className="text-muted-foreground">{t.teamsPage.bookingDetails.contactPerson}: </span>
                              <span className="text-foreground">
                                {booking.team_id
                                  ? (teamCoachById.get(booking.team_id) || t.teamsPage.bookingDetails.noContact)
                                  : (clubCoachContacts.length > 0 ? clubCoachContacts.join(", ") : t.teamsPage.bookingDetails.noContact)}
                              </span>
                            </div>
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Add Team Modal */}
      {showAddTeam && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => {
          setShowAddTeam(false);
          resetTeamForm();
        }}>
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex max-h-[min(92dvh,920px)] w-full max-w-[95vw] flex-col overflow-hidden rounded-2xl border border-border bg-card sm:max-w-3xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-border/50 px-4 py-4 sm:px-6">
              <h3 className="font-display font-bold text-foreground">{editingTeamId ? t.teamsPage.teamModal.editTitle : t.teamsPage.teamModal.title}</h3>
              <Button variant="ghost" size="icon" onClick={() => {
                setShowAddTeam(false);
                resetTeamForm();
              }}><X className="w-4 h-4" /></Button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6">
              <div className="space-y-4">
                <div className="rounded-xl border border-border/60 bg-background/40 p-3">
                  <div className="text-[11px] font-medium text-foreground mb-2">{t.teamsPage.teamModal.basicSectionTitle}</div>
                  <div className="grid md:grid-cols-2 gap-3">
                    <Input placeholder={t.teamsPage.teamModal.namePlaceholder} value={teamName} onChange={e => setTeamName(e.target.value)} className="bg-background" maxLength={100} />
                    <Select value={teamSport} onValueChange={setTeamSport}>
                      <SelectTrigger className="w-full h-10 rounded-xl border-border bg-background px-3 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SPORTS_CATALOG.map((sport) => (
                          <SelectItem key={sport.id} value={sport.id}>{sport.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input placeholder={t.teamsPage.teamModal.agePlaceholder} value={teamAge} onChange={e => setTeamAge(e.target.value)} className="bg-background" />
                    <Input placeholder={t.teamsPage.teamModal.leaguePlaceholder} value={teamLeague} onChange={e => setTeamLeague(e.target.value)} className="bg-background" />
                  </div>
                </div>

                <div className="rounded-xl border border-border/60 bg-background/40 p-3">
                  <div className="text-[11px] font-medium text-foreground mb-2">{t.teamsPage.teamModal.membersSectionTitle}</div>
                  <Input
                    placeholder={t.teamsPage.teamModal.memberSearchPlaceholder}
                    value={teamMemberSearch}
                    onChange={(event) => setTeamMemberSearch(event.target.value)}
                    className="bg-background mb-3"
                  />
                  <div className="grid md:grid-cols-2 gap-3">
                    <div className="rounded-lg border border-border/60 bg-background/50 p-2.5">
                      <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-2">{t.teamsPage.teamModal.coachesTitle}</div>
                      <div className="space-y-1 max-h-44 overflow-y-auto pr-1">
                        {filteredCoachOptions.length === 0 ? (
                          <div className="text-xs text-muted-foreground">{t.teamsPage.teamModal.noCoachMembers}</div>
                        ) : filteredCoachOptions.map((membership) => (
                          <label key={`coach-member-${membership.id}`} className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-background/60">
                            <input
                              type="checkbox"
                              className="h-4 w-4 rounded border-border bg-background"
                              checked={selectedCoachMembershipIds.includes(membership.id)}
                              onChange={() => toggleCoachSelection(membership.id)}
                            />
                            <span className="text-xs text-foreground truncate">{membership.display_name}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                    <div className="rounded-lg border border-border/60 bg-background/50 p-2.5">
                      <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-2">{t.teamsPage.teamModal.playersTitle}</div>
                      <div className="space-y-1 max-h-44 overflow-y-auto pr-1">
                        {filteredPlayerOptions.length === 0 ? (
                          <div className="text-xs text-muted-foreground">{t.teamsPage.teamModal.noPlayerMembers}</div>
                        ) : filteredPlayerOptions.map((membership) => (
                          <label key={`player-member-${membership.id}`} className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-background/60">
                            <input
                              type="checkbox"
                              className="h-4 w-4 rounded border-border bg-background"
                              checked={selectedPlayerMembershipIds.includes(membership.id)}
                              onChange={() => togglePlayerSelection(membership.id)}
                            />
                            <span className="text-xs text-foreground truncate">{membership.display_name}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 text-[11px] text-muted-foreground">
                    {t.teamsPage.teamModal.selectionSummaryPrefix} {selectedCoachMembershipIds.length} {t.teamsPage.teamModal.selectionSummaryCoaches} · {selectedPlayerMembershipIds.length} {t.teamsPage.teamModal.selectionSummaryPlayers}
                  </div>
                </div>
              </div>
            </div>
            <div className="shrink-0 border-t border-border/60 bg-card/95 px-4 py-4 sm:px-6">
              <Button onClick={handleUpsertTeam} disabled={!teamName.trim()} className="w-full bg-gradient-gold-static text-primary-foreground hover:brightness-110">
                {editingTeamId ? t.teamsPage.teamModal.update : t.teamsPage.teamModal.create}
              </Button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Add Session Modal */}
      {showAddSession && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => {
          setShowAddSession(false);
          resetSessionForm();
        }}>
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-[95vw] sm:max-w-md rounded-2xl bg-card border border-border p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-bold text-foreground">{editingSessionId ? t.teamsPage.sessionModal.editTitle : t.teamsPage.sessionModal.title}</h3>
              <Button variant="ghost" size="icon" onClick={() => {
                setShowAddSession(false);
                resetSessionForm();
              }}><X className="w-4 h-4" /></Button>
            </div>
            <div className="space-y-3">
              <Input placeholder={t.teamsPage.sessionModal.sessionTitlePlaceholder} value={sessionTitle} onChange={e => setSessionTitle(e.target.value)} className="bg-background" maxLength={200} />
              <Select value={sessionTeamId || "__none"} onValueChange={(value) => setSessionTeamId(value === "__none" ? "" : value)}>
                <SelectTrigger className="w-full h-10 rounded-xl border-border bg-background px-3 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">{t.teamsPage.sessionModal.noTeamOption}</SelectItem>
                  {teams.map((team) => <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={sessionPitchId || "__none"} onValueChange={(value) => setSessionPitchId(value === "__none" ? "" : value)}>
                <SelectTrigger className="w-full h-10 rounded-xl border-border bg-background px-3 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">{t.teamsPage.sessionModal.noElementOption}</SelectItem>
                  {(activeLayerId === "all" ? pitches : filteredPitches).map((pitch) => (
                    <SelectItem key={`session-pitch-${pitch.id}`} value={pitch.id}>
                      {pitch.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input placeholder={t.teamsPage.sessionModal.locationPlaceholder} value={sessionLocation} onChange={e => setSessionLocation(e.target.value)} className="bg-background" />
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-muted-foreground mb-1 block">{t.teamsPage.sessionModal.startLabel}</label>
                  <Input type="datetime-local" value={sessionStart} onChange={e => setSessionStart(e.target.value)} className="bg-background" />
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground mb-1 block">{t.teamsPage.sessionModal.endLabel}</label>
                  <Input type="datetime-local" value={sessionEnd} onChange={e => setSessionEnd(e.target.value)} className="bg-background" />
                </div>
              </div>
              <label className="flex items-center gap-2 text-xs text-foreground">
                <input
                  type="checkbox"
                  checked={sessionRepeatWeekly}
                  onChange={(event) => setSessionRepeatWeekly(event.target.checked)}
                  className="h-4 w-4 rounded border-border bg-background"
                />
                {t.teamsPage.sessionModal.repeatWeekly}
              </label>
              {sessionRepeatWeekly && (
                <div>
                  <label className="text-[10px] text-muted-foreground mb-1 block">{t.teamsPage.sessionModal.repeatUntilLabel}</label>
                  <Input type="date" value={sessionRepeatUntil} onChange={(event) => setSessionRepeatUntil(event.target.value)} className="bg-background" />
                </div>
              )}
              {sessionRepeatWeekly && <p className="text-[10px] text-muted-foreground">{t.teamsPage.sessionModal.recurrenceHint}</p>}
              <Button onClick={handleUpsertSession} disabled={!sessionTitle.trim() || !sessionStart || !sessionEnd}
                className="w-full bg-gradient-gold-static text-primary-foreground hover:brightness-110">
                {editingSessionId ? t.teamsPage.sessionModal.update : t.teamsPage.sessionModal.submit}
              </Button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Add Pitch Modal */}
      {showAddPitch && (
        <div
          className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => {
            setShowAddPitch(false);
            setEditingPitchId(null);
            setPitchName("");
            setPitchNotes("");
            setPitchParentId("");
            setPitchElementType("pitch");
            setPitchLayerId(derivePitchLayerIdFromFilter(activeLayerId));
            setPitchDisplayColor(suggestColorByIndex(0));
            setElementColorSectionOpen(false);
            setSelectedPitchCells([]);
          }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex max-h-[min(92dvh,920px)] w-full max-w-[95vw] flex-col overflow-hidden rounded-2xl border border-border bg-card sm:max-w-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border/50 px-4 py-4 sm:px-6">
              <h3 className="font-display font-bold text-foreground pr-2">{mapElementModalCopy.title}</h3>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setShowAddPitch(false);
                  setEditingPitchId(null);
                  setPitchName("");
                  setPitchNotes("");
                  setPitchParentId("");
                  setPitchElementType("pitch");
                  setPitchLayerId(derivePitchLayerIdFromFilter(activeLayerId));
                  setPitchDisplayColor(suggestColorByIndex(0));
                  setElementColorSectionOpen(false);
                  setSelectedPitchCells([]);
                }}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6">
            <div className="space-y-4 pb-1">
              <Input placeholder={mapElementModalCopy.namePlaceholder} value={pitchName} onChange={(event) => setPitchName(event.target.value)} className="bg-background" />
              <div className="grid sm:grid-cols-2 gap-3">
                <Select
                  value={pitchElementType}
                  onValueChange={(value) => setPitchElementType(value as ClubPitch["element_type"])}
                >
                  <SelectTrigger className="w-full h-10 rounded-xl border-border bg-background px-3 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PROPERTY_ELEMENT_TYPES.map((elementType) => (
                      <SelectItem key={elementType} value={elementType}>{formatElementTypeLabel(elementType, t.teamsPage.elementTypes)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={pitchLayerId || "__none"} onValueChange={(value) => setPitchLayerId(value === "__none" ? "" : value)}>
                  <SelectTrigger className="w-full h-10 rounded-xl border-border bg-background px-3 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none">{supportsLayerFields ? t.teamsPage.layerNone : t.teamsPage.layerUnavailable}</SelectItem>
                    {layers.map((layer) => (
                      <SelectItem key={`layer-pitch-${layer.id}`} value={layer.id}>{layer.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="overflow-hidden rounded-xl border border-border/60 bg-background/40">
                <button
                  type="button"
                  id="element-color-toggle"
                  onClick={() => setElementColorSectionOpen((open) => !open)}
                  className="flex w-full items-center gap-2 px-3 py-2.5 text-left transition-colors hover:bg-background/30"
                  aria-expanded={elementColorSectionOpen}
                  aria-controls="element-color-panel"
                  aria-label={`${t.teamsPage.elementModal.colorLabel} — ${elementColorSectionOpen ? t.teamsPage.elementModal.colorSectionCollapse : t.teamsPage.elementModal.colorSectionExpand}`}
                >
                  <ChevronDown
                    className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${elementColorSectionOpen ? "rotate-180" : ""}`}
                    aria-hidden
                  />
                  <span className="min-w-0 flex-1 text-sm font-medium text-foreground">{t.teamsPage.elementModal.colorLabel}</span>
                  <span
                    className="h-6 w-6 shrink-0 rounded-md border border-border shadow-sm"
                    style={{ backgroundColor: ensureHexForPicker(pitchDisplayColor) }}
                    title={ensureHexForPicker(pitchDisplayColor)}
                    aria-hidden
                  />
                </button>
                {elementColorSectionOpen && (
                  <div
                    id="element-color-panel"
                    role="region"
                    aria-labelledby="element-color-toggle"
                    className="space-y-2 border-t border-border/50 px-3 pb-3 pt-2"
                  >
                    <div className="flex flex-wrap justify-end">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 text-[11px]"
                        onClick={() => {
                          const idx = editingPitchId ? pitches.findIndex((p) => p.id === editingPitchId) : pitches.length;
                          setPitchDisplayColor(suggestColorByIndex(idx >= 0 ? idx : 0));
                        }}
                      >
                        {t.teamsPage.elementModal.colorAuto}
                      </Button>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <input
                        type="color"
                        className="h-10 w-14 cursor-pointer rounded-md border border-border bg-transparent p-0.5"
                        value={ensureHexForPicker(pitchDisplayColor)}
                        onChange={(event) => setPitchDisplayColor(event.target.value.toLowerCase())}
                        aria-label={t.teamsPage.elementModal.colorLabel}
                      />
                      <Input
                        placeholder={t.teamsPage.elementModal.colorHexPlaceholder}
                        value={pitchDisplayColor}
                        onChange={(event) => setPitchDisplayColor(event.target.value)}
                        className="max-w-[8.5rem] bg-background font-mono text-xs"
                        maxLength={7}
                      />
                    </div>
                    <div className="flex max-h-28 flex-wrap gap-1.5 overflow-y-auto sm:max-h-none">
                      {ELEMENT_COLOR_SWATCHES.map((swatch) => (
                        <button
                          key={swatch}
                          type="button"
                          onClick={() => setPitchDisplayColor(swatch)}
                          className="h-7 w-7 shrink-0 rounded-md border-2 transition-transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-primary/50"
                          style={{
                            backgroundColor: swatch,
                            borderColor: ensureHexForPicker(pitchDisplayColor) === swatch ? "hsl(var(--foreground))" : "rgba(255,255,255,0.25)",
                          }}
                          aria-label={swatch}
                        />
                      ))}
                    </div>
                    {!supportsDisplayColorField && (
                      <p className="text-[10px] text-amber-500/90">{t.teamsPage.elementModal.colorMigrationHint}</p>
                    )}
                    <p className="text-[10px] text-muted-foreground">{t.teamsPage.elementModal.colorHint}</p>
                  </div>
                )}
              </div>
              <Select
                value={pitchParentId || "__none"}
                onValueChange={(value) => {
                  const nextParent = value === "__none" ? "" : value;
                  setPitchParentId(nextParent);
                  if (!nextParent) return;
                  const parentPitch = pitchById.get(nextParent);
                  if (!parentPitch) return;
                  setSelectedPitchCells((previous) => previous.filter((cell) => parentPitch.grid_cells.includes(cell)));
                }}
              >
                <SelectTrigger className="w-full h-10 rounded-xl border-border bg-background px-3 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">{t.teamsPage.elementModal.parentNone}</SelectItem>
                  {pitches
                    .filter((pitch) => pitch.id !== editingPitchId)
                    .map((pitch) => (
                      <SelectItem key={`parent-${pitch.id}`} value={pitch.id}>
                        {fillTemplate(t.teamsPage.elementModal.splitFrom, { name: pitch.name })}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              {!supportsParentPitchField && (
                <div className="text-[10px] text-muted-foreground">
                  {t.teamsPage.elementModal.migrationSplit}
                </div>
              )}
              {!supportsParentPitchField && pitchParentId && (
                <div className="text-[10px] text-accent">
                  {t.teamsPage.elementModal.migrationSplitSelected}
                </div>
              )}
              {!supportsLayerFields && (
                <div className="text-[10px] text-muted-foreground">
                  {t.teamsPage.elementModal.migrationLayer}
                </div>
              )}
              <Input placeholder={t.teamsPage.elementModal.notesOptional} value={pitchNotes} onChange={(event) => setPitchNotes(event.target.value)} className="bg-background" />
              <div className="rounded-xl border border-border/60 bg-background/50 p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-xs text-muted-foreground">{mapElementModalCopy.gridHint}</div>
                  <div className="text-xs text-foreground font-medium">{mapElementModalCopy.selectedCounter}</div>
                </div>
                <div
                  className="grid gap-1"
                  style={{ gridTemplateColumns: `repeat(${GRID_SIZE}, minmax(0, 1fr))` }}
                >
                  {Array.from({ length: GRID_CELLS }, (_, index) => {
                    const parentCells = pitchParentId ? (pitchById.get(pitchParentId)?.grid_cells || []) : null;
                    const isAllowed = !parentCells || parentCells.includes(index);
                    const active = selectedPitchCells.includes(index);
                    return (
                      <button
                        key={`new-grid-${index}`}
                        type="button"
                        onClick={() => {
                          if (!isAllowed) return;
                          toggleGridCell(index);
                        }}
                        className={`aspect-square rounded-[4px] border transition-colors ${
                          !isAllowed
                            ? "bg-background/20 border-border/30 opacity-40 cursor-not-allowed"
                            : active
                            ? ""
                            : "bg-background border-border/60 hover:bg-primary/10"
                        }`}
                        style={
                          active && isAllowed
                            ? {
                                background: hexToRgba(pitchDisplayColor, 0.82),
                                borderColor: hexToRgba(pitchDisplayColor, 0.95),
                              }
                            : undefined
                        }
                      />
                    );
                  })}
                </div>
                <div className="mt-3 flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const parentCells = pitchParentId ? (pitchById.get(pitchParentId)?.grid_cells || []) : null;
                      setSelectedPitchCells(parentCells ? [...parentCells] : Array.from({ length: GRID_CELLS }, (_, i) => i));
                    }}
                  >
                    {t.teamsPage.elementModal.selectAll}
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => setSelectedPitchCells([])}>{t.teamsPage.elementModal.clear}</Button>
                </div>
              </div>
            </div>
            </div>
            <div className="shrink-0 border-t border-border/60 bg-card/95 px-4 py-4 sm:px-6">
              <Button
                onClick={editingPitchId ? handleUpdatePitch : handleAddPitch}
                disabled={!pitchName.trim() || selectedPitchCells.length === 0 || (!!pitchParentId && !supportsParentPitchField)}
                className="w-full bg-gradient-gold-static text-primary-foreground hover:brightness-110"
              >
                {mapElementModalCopy.saveButton}
              </Button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Booking Details Modal */}
      {bookingDetails && (
        <div
          className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setBookingDetailsId(null)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-[95vw] sm:max-w-md rounded-2xl bg-card border border-border p-6"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-bold text-foreground">{t.teamsPage.bookingDetails.title}</h3>
              <Button variant="ghost" size="icon" onClick={() => setBookingDetailsId(null)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="space-y-3">
              <div>
                <div className="text-xs text-muted-foreground">{t.teamsPage.bookingDetails.bookingTitle}</div>
                <div className="text-sm font-semibold text-foreground">{bookingDetails.title}</div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-xs text-muted-foreground">{t.teamsPage.bookingDetails.element}</div>
                  <div className="text-sm text-foreground">{bookingDetails.pitchName}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">{t.teamsPage.bookingDetails.team}</div>
                  <div className="text-sm text-foreground">{bookingDetails.teamName || t.teamsPage.clubWide}</div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-xs text-muted-foreground">{t.teamsPage.bookingDetails.type}</div>
                  <div className="text-sm text-foreground">{t.teamsPage.bookingTypes[bookingDetails.booking_type]}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">{t.teamsPage.bookingDetails.status}</div>
                  <div className="text-sm text-foreground">
                    {bookingDetails.status === "cancelled" ? t.teamsPage.bookingDetails.cancelled : bookingDetails.hasConflict ? t.teamsPage.bookingDetails.conflict : t.teamsPage.bookingDetails.booked}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-xs text-muted-foreground">{t.teamsPage.bookingDetails.start}</div>
                  <div className="text-sm text-foreground">{new Date(bookingDetails.starts_at).toLocaleString()}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">{t.teamsPage.bookingDetails.end}</div>
                  <div className="text-sm text-foreground">{new Date(bookingDetails.ends_at).toLocaleString()}</div>
                </div>
              </div>
              {bookingDetails.needs_reconfirmation && (
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-2 text-xs text-amber-400">
                  {t.teamsPage.bookingDetails.reconfirmationNeeded}
                </div>
              )}
              <Button variant="outline" className="w-full" onClick={() => setBookingDetailsId(null)}>
                {t.teamsPage.bookingDetails.close}
              </Button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Add Pitch Booking Modal */}
      {showAddBooking && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowAddBooking(false)}>
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-[95vw] sm:max-w-md rounded-2xl bg-card border border-border p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-bold text-foreground">{bookingActionLabel}</h3>
              <Button variant="ghost" size="icon" onClick={() => setShowAddBooking(false)}><X className="w-4 h-4" /></Button>
            </div>
            <div className="space-y-3">
              <Select value={bookingPitchId || "__none"} onValueChange={(value) => setBookingPitchId(value === "__none" ? "" : value)}>
                <SelectTrigger className="w-full h-10 rounded-xl border-border bg-background px-3 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">{t.teamsPage.selectBookingElement}</SelectItem>
                  {(activeLayerId === "all" ? pitches : filteredPitches).map((pitch) => <SelectItem key={pitch.id} value={pitch.id}>{pitch.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={bookingTeamId || "__none"} onValueChange={(value) => setBookingTeamId(value === "__none" ? "" : value)}>
                <SelectTrigger className="w-full h-10 rounded-xl border-border bg-background px-3 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">{t.teamsPage.bookingModal.clubWide}</SelectItem>
                  {teams.map((team) => <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={bookingType} onValueChange={(value) => setBookingType(value as "training" | "match" | "other")}>
                <SelectTrigger className="w-full h-10 rounded-xl border-border bg-background px-3 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="training">{t.teamsPage.bookingTypes.training}</SelectItem>
                  <SelectItem value="match">{t.teamsPage.bookingTypes.match}</SelectItem>
                  <SelectItem value="other">{t.teamsPage.bookingTypes.other}</SelectItem>
                </SelectContent>
              </Select>
              <Input placeholder={t.teamsPage.bookingModal.bookingTitlePlaceholder} value={bookingTitle} onChange={(event) => setBookingTitle(event.target.value)} className="bg-background" />
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-muted-foreground mb-1 block">{t.teamsPage.bookingModal.startLabel}</label>
                  <Input type="datetime-local" value={bookingStart} onChange={(event) => setBookingStart(event.target.value)} className="bg-background" />
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground mb-1 block">{t.teamsPage.bookingModal.endLabel}</label>
                  <Input type="datetime-local" value={bookingEnd} onChange={(event) => setBookingEnd(event.target.value)} className="bg-background" />
                </div>
              </div>
              <div className="text-[11px] text-muted-foreground rounded-xl border border-border/60 bg-background/40 p-2 flex items-center gap-2">
                <AlertTriangle className="w-3.5 h-3.5 text-primary" />
                {t.teamsPage.bookingModal.overlapHint}
              </div>
              <Button
                onClick={handleAddBooking}
                disabled={!bookingPitchId || !bookingTitle.trim() || !bookingStart || !bookingEnd}
                className="w-full bg-gradient-gold-static text-primary-foreground hover:brightness-110"
              >
                <CheckCircle2 className="w-4 h-4 mr-1" /> {t.teamsPage.bookingModal.save}
              </Button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Delete Pitch Confirmation Modal */}
      {pendingPitchDeleteId && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setPendingPitchDeleteId(null)}>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-[95vw] sm:max-w-md rounded-2xl bg-card border border-border p-6"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-display font-bold text-foreground">{t.teamsPage.elementModal.deleteTitle}</h3>
              <Button variant="ghost" size="icon" onClick={() => setPendingPitchDeleteId(null)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              {t.teamsPage.elementModal.deleteConfirmPrefix}{" "}
              <span className="text-foreground font-medium">
                {pitchById.get(pendingPitchDeleteId)?.name || "—"}
              </span>
              {t.teamsPage.elementModal.deleteConfirmSuffix}
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setPendingPitchDeleteId(null)}>
                {t.teamsPage.common.cancel}
              </Button>
              <Button
                className="bg-accent text-accent-foreground hover:brightness-110"
                onClick={() => void handleDeletePitchConfirm()}
              >
                {t.teamsPage.common.delete}
              </Button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Add Layer Modal */}
      {showAddLayer && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowAddLayer(false)}>
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-[95vw] sm:max-w-md rounded-2xl bg-card border border-border p-6" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-bold text-foreground flex items-center gap-2">
                <Building2 className="w-4 h-4 text-primary" />
                {t.teamsPage.layerModal.title}
              </h3>
              <Button variant="ghost" size="icon" onClick={() => setShowAddLayer(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="space-y-3">
              <Input placeholder={t.teamsPage.layerModal.namePlaceholder} value={layerName} onChange={(event) => setLayerName(event.target.value)} className="bg-background" />
              <Select value={layerPurpose} onValueChange={(value) => setLayerPurpose(value as ClubAssetLayer["purpose"])}>
                <SelectTrigger className="w-full h-10 rounded-xl border-border bg-background px-3 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="training">{t.teamsPage.layerPurposes.training}</SelectItem>
                  <SelectItem value="administration">{t.teamsPage.layerPurposes.administration}</SelectItem>
                  <SelectItem value="operations">{t.teamsPage.layerPurposes.operations}</SelectItem>
                  <SelectItem value="other">{t.teamsPage.layerPurposes.other}</SelectItem>
                </SelectContent>
              </Select>
              <Input placeholder={t.teamsPage.layerModal.descriptionPlaceholder} value={layerDescription} onChange={(event) => setLayerDescription(event.target.value)} className="bg-background" />
              <Button onClick={handleAddLayer} disabled={!layerName.trim()} className="w-full bg-gradient-gold-static text-primary-foreground hover:brightness-110">
                <Layers3 className="w-4 h-4 mr-1" /> {t.teamsPage.layerModal.save}
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default Teams;
