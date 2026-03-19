import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import AppHeader from "@/components/layout/AppHeader";
import {
  Plus, Trophy, Dumbbell, Loader2,
  Calendar, MapPin, Clock, Trash2, X, LayoutGrid, AlertTriangle, CheckCircle2, ShieldCheck, Pencil, Layers3, Building2, ChevronDown
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/useAuth";
import { useClubId } from "@/hooks/use-club-id";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { usePermissions } from "@/hooks/use-permissions";
import { useLanguage } from "@/hooks/use-language";
import { resolveSportId, resolveSportLabel, SPORTS_CATALOG } from "@/lib/sports";
// logo is rendered by AppHeader

type Team = {
  id: string;
  name: string;
  sport: string;
  age_group: string | null;
  coach_name: string | null;
  created_at: string;
};

type TrainingSession = {
  id: string;
  title: string;
  location: string | null;
  starts_at: string;
  ends_at: string;
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

type ClubPropertyLayer = {
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

const GRID_SIZE = 13;
const GRID_CELLS = GRID_SIZE * GRID_SIZE;
const GRID_LABEL = `${GRID_SIZE}x${GRID_SIZE}`;
const PITCH_COLORS = ["#22c55e", "#0ea5e9", "#8b5cf6", "#f59e0b", "#f43f5e", "#06b6d4"];
const EXTRA_ELEMENT_SWATCHES = ["#ec4899", "#14b8a6", "#eab308", "#78716c", "#a855f7", "#64748b"];
const ELEMENT_COLOR_SWATCHES = [...PITCH_COLORS, ...EXTRA_ELEMENT_SWATCHES];
const PROPERTY_ELEMENT_TYPES: Array<ClubPitch["element_type"]> = ["pitch", "clubhouse", "street", "garage", "stadium", "parking", "storage", "other"];

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

const Teams = () => {
  // navigation is handled by AppHeader
  const { user } = useAuth();
  const { clubId, loading: clubLoading } = useClubId();
  const { toast } = useToast();
  const perms = usePermissions();
  const { t } = useLanguage();
  const canManage = perms.isTrainer || perms.isAdmin;
  const canManageLayers = perms.isAdmin;
  const [activeTab, setActiveTab] = useState<"pitches" | "teams" | "sessions">("pitches");

  const [teams, setTeams] = useState<Team[]>([]);
  const [sessions, setSessions] = useState<TrainingSession[]>([]);
  const [layers, setLayers] = useState<ClubPropertyLayer[]>([]);
  const [pitches, setPitches] = useState<ClubPitch[]>([]);
  const [bookings, setBookings] = useState<PitchBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddTeam, setShowAddTeam] = useState(false);
  const [showAddSession, setShowAddSession] = useState(false);
  const [showAddPitch, setShowAddPitch] = useState(false);
  const [showAddLayer, setShowAddLayer] = useState(false);
  const [showAddBooking, setShowAddBooking] = useState(false);
  const [editingPitchId, setEditingPitchId] = useState<string | null>(null);
  const [supportsParentPitchField, setSupportsParentPitchField] = useState(false);
  const [pendingPitchDeleteId, setPendingPitchDeleteId] = useState<string | null>(null);
  const [supportsLayerFields, setSupportsLayerFields] = useState(false);
  const [supportsDisplayColorField, setSupportsDisplayColorField] = useState(false);

  // Form state
  const [teamName, setTeamName] = useState("");
  const [teamSport, setTeamSport] = useState("football");
  const [teamAge, setTeamAge] = useState("");
  const [teamCoach, setTeamCoach] = useState("");

  const [sessionTitle, setSessionTitle] = useState("");
  const [sessionLocation, setSessionLocation] = useState("");
  const [sessionTeamId, setSessionTeamId] = useState("");
  const [sessionStart, setSessionStart] = useState("");
  const [sessionEnd, setSessionEnd] = useState("");

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
  const [layerPurpose, setLayerPurpose] = useState<ClubPropertyLayer["purpose"]>("training");
  const [layerDescription, setLayerDescription] = useState("");

  const [bookingPitchId, setBookingPitchId] = useState("");
  const [bookingTeamId, setBookingTeamId] = useState("");
  const [bookingType, setBookingType] = useState<"training" | "match" | "other">("training");
  const [bookingTitle, setBookingTitle] = useState("");
  const [bookingStart, setBookingStart] = useState("");
  const [bookingEnd, setBookingEnd] = useState("");

  const [usageDate, setUsageDate] = useState(new Date().toISOString().slice(0, 10));

  // Reset page state on club switch to prevent cross-club flashes
  useEffect(() => {
    setTeams([]);
    setSessions([]);
    setLayers([]);
    setPitches([]);
    setBookings([]);
    setLoading(true);
  }, [clubId]);

  useEffect(() => {
    if (!clubId) return;
    const fetchData = async () => {
      setLoading(true);
      const [teamsRes, sessionsRes, pitchesRes, bookingsRes, pitchSchemaProbeRes, layerSchemaProbeRes, colorSchemaProbeRes, layersRes] = await Promise.all([
        supabase.from("teams").select("*").eq("club_id", clubId).order("name"),
        supabase.from("training_sessions").select("*, teams(name)").eq("club_id", clubId).order("starts_at", { ascending: true }).limit(20),
        supabase.from("club_pitches").select("*").eq("club_id", clubId).order("name"),
        supabase.from("pitch_bookings").select("*").eq("club_id", clubId).order("starts_at", { ascending: true }).limit(400),
        supabase.from("club_pitches").select("id, parent_pitch_id").eq("club_id", clubId).limit(1),
        supabase.from("club_pitches").select("id, layer_id, element_type").eq("club_id", clubId).limit(1),
        supabase.from("club_pitches").select("id, display_color").eq("club_id", clubId).limit(1),
        supabase.from("club_property_layers").select("*").eq("club_id", clubId).order("name"),
      ]);
      setTeams((teamsRes.data as Team[]) || []);
      setSessions((sessionsRes.data as unknown as TrainingSession[]) || []);
      const rawPitches = (pitchesRes.data as unknown as Array<Record<string, unknown>>) || [];
      setSupportsParentPitchField(!pitchSchemaProbeRes.error);
      setSupportsLayerFields(!layerSchemaProbeRes.error);
      const rawLayers = (layersRes.data as unknown as Array<Record<string, unknown>>) || [];
      setLayers(rawLayers.map((layer) => ({
        id: String(layer.id),
        club_id: String(layer.club_id),
        name: String(layer.name),
        purpose: ((layer.purpose as ClubPropertyLayer["purpose"]) || "training"),
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
      setLoading(false);
    };
    fetchData();
  }, [clubId]);

  const teamNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const team of teams) map.set(team.id, team.name);
    return map;
  }, [teams]);

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

  const filteredPitches = useMemo(() => {
    if (activeLayerId === "all") return pitches;
    return pitches.filter((pitch) => pitch.layer_id === activeLayerId);
  }, [activeLayerId, pitches]);

  const activeLayer = useMemo(() => {
    if (activeLayerId === "all") return null;
    return layers.find((layer) => layer.id === activeLayerId) || null;
  }, [activeLayerId, layers]);

  const bookingActionLabel = useMemo(() => {
    if (!activeLayer) return t.teamsPage.bookByLayer.all;
    if (activeLayer.purpose === "training") return t.teamsPage.bookByLayer.training;
    if (activeLayer.purpose === "administration") return t.teamsPage.bookByLayer.administration;
    if (activeLayer.purpose === "operations") return t.teamsPage.bookByLayer.operations;
    return t.teamsPage.bookByLayer.other;
  }, [activeLayer, t.teamsPage.bookByLayer]);

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
      if (activeLayerId === "all") return true;
      const pitch = pitchById.get(booking.pitch_id);
      return Boolean(pitch && pitch.layer_id === activeLayerId);
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
  }, [activeLayerId, enrichedBookings, filteredPitches.length, pitchById, pitchNameById, t.teamsPage.unknownElement]);

  const dayBookings = useMemo(() => {
    const from = new Date(`${usageDate}T00:00:00`);
    const to = new Date(`${usageDate}T23:59:59`);
    return enrichedBookings.filter((booking) => {
      const start = new Date(booking.starts_at);
      if (activeLayerId !== "all") {
        const pitch = pitchById.get(booking.pitch_id);
        if (!pitch || pitch.layer_id !== activeLayerId) return false;
      }
      return start >= from && start <= to;
    });
  }, [activeLayerId, enrichedBookings, pitchById, usageDate]);

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
    const created = data as unknown as ClubPropertyLayer;
    setLayers((previous) => [...previous, created].sort((a, b) => a.name.localeCompare(b.name)));
    setActiveLayerId(created.id);
    setPitchLayerId(created.id);
    setLayerName("");
    setLayerPurpose("training");
    setLayerDescription("");
    setShowAddLayer(false);
    toast({ title: t.teamsPage.toastLayerCreated });
  };

  const handleAddTeam = async () => {
    if (!canManage || !clubId) {
      toast({ title: t.teamsPage.toast.notAuthorizedTeamsTitle, description: t.teamsPage.toast.notAuthorizedTeamsDesc, variant: "destructive" });
      return;
    }
    if (!teamName.trim()) return;
    const { data, error } = await supabase
      .from("teams")
      .insert({ club_id: clubId, name: teamName.trim(), sport: resolveSportId(teamSport), age_group: teamAge || null, coach_name: teamCoach || null })
      .select()
      .single();
    if (error) { toast({ title: t.teamsPage.common.error, description: error.message, variant: "destructive" }); return; }
    setTeams(prev => [...prev, data as Team]);
    setShowAddTeam(false);
    setTeamName(""); setTeamAge(""); setTeamCoach(""); setTeamSport("football");
    toast({ title: t.teamsPage.toast.teamCreated });
  };

  const handleAddSession = async () => {
    if (!canManage || !clubId) {
      toast({ title: t.teamsPage.toast.notAuthorizedSessionsTitle, description: t.teamsPage.toast.notAuthorizedSessionsDesc, variant: "destructive" });
      return;
    }
    if (!sessionTitle.trim() || !sessionStart || !sessionEnd) return;
    const { data, error } = await supabase
      .from("training_sessions")
      .insert({
        club_id: clubId,
        team_id: sessionTeamId || null,
        title: sessionTitle.trim(),
        location: sessionLocation || null,
        starts_at: sessionStart,
        ends_at: sessionEnd,
        created_by: user?.id,
      })
      .select("*, teams(name)")
      .single();
    if (error) { toast({ title: t.teamsPage.common.error, description: error.message, variant: "destructive" }); return; }
    setSessions(prev => [...prev, data as unknown as TrainingSession]);
    setShowAddSession(false);
    setSessionTitle(""); setSessionLocation(""); setSessionTeamId(""); setSessionStart(""); setSessionEnd("");
    toast({ title: t.teamsPage.toast.sessionScheduled });
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
    setTeams(prev => prev.filter((team) => team.id !== id));
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
    setPitchLayerId(activeLayerId === "all" ? "" : activeLayerId);
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
    setPitchLayerId(activeLayerId === "all" ? "" : activeLayerId);
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

  return (
    <div className="min-h-screen bg-background">
      <AppHeader
        title={t.teamsPage.title}
        subtitle={canManage ? t.teamsPage.subtitleManage : t.teamsPage.subtitleView}
        rightSlot={
          <div className="flex gap-2">
            {activeTab === "pitches" && (
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
                    setPitchLayerId(activeLayerId === "all" ? "" : activeLayerId);
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
            {activeTab === "teams" && (
              <Button size="sm" className="bg-gradient-gold-static text-primary-foreground hover:brightness-110" onClick={() => setShowAddTeam(true)} disabled={!canManage}>
                <Plus className="w-4 h-4 mr-1" /> {t.teamsPage.addTeam}
              </Button>
            )}
            {activeTab === "sessions" && (
              <Button size="sm" className="bg-gradient-gold-static text-primary-foreground hover:brightness-110" onClick={() => setShowAddSession(true)} disabled={!canManage}>
                <Calendar className="w-4 h-4 mr-1" /> {t.teamsPage.addSession}
              </Button>
            )}
          </div>
        }
      />

      <div className="container mx-auto px-4 py-6">
        <div className="mb-4 inline-flex rounded-xl border border-border/60 bg-card/40 p-1">
          {(
            [
              { id: "pitches", label: t.teamsPage.tabs.pitches },
              { id: "teams", label: t.teamsPage.tabs.teams },
              { id: "sessions", label: t.teamsPage.tabs.sessions },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
                activeTab === tab.id ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {(clubLoading || loading) ? (
          <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : !clubId ? (
          <div className="text-center py-20 text-muted-foreground">{t.teamsPage.noClub}</div>
        ) : activeTab === "teams" ? (
          <div>
            <h2 className="font-display font-semibold text-foreground mb-4 flex items-center gap-2">
              <Trophy className="w-4 h-4 text-primary" /> {t.teamsPage.tabs.teams} ({teams.length})
            </h2>
            {teams.length === 0 ? (
              <div className="rounded-xl bg-card border border-border p-8 text-center text-muted-foreground text-sm">{t.teamsPage.noTeams}</div>
            ) : (
              <div className="space-y-3">
                {teams.map((team, i) => (
                  <motion.div key={team.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                    className="p-4 rounded-xl bg-card border border-border flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-foreground">{team.name}</div>
                      <div className="text-xs text-muted-foreground">{resolveSportLabel(team.sport)} {team.age_group ? `· ${team.age_group}` : ""} {team.coach_name ? `· ${t.teamsPage.coach}: ${team.coach_name}` : ""}</div>
                    </div>
                    {canManage && (
                      <Button variant="ghost" size="icon" onClick={() => handleDeleteTeam(team.id)} className="text-muted-foreground hover:text-accent">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        ) : activeTab === "sessions" ? (
          <div>
            <h2 className="font-display font-semibold text-foreground mb-4 flex items-center gap-2">
              <Dumbbell className="w-4 h-4 text-primary" /> {t.teamsPage.tabs.sessions} ({sessions.length})
            </h2>
            {sessions.length === 0 ? (
              <div className="rounded-xl bg-card border border-border p-8 text-center text-muted-foreground text-sm">{t.teamsPage.noSessions}</div>
            ) : (
              <div className="space-y-3">
                {sessions.map((s, i) => (
                  <motion.div key={s.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                    className="p-4 rounded-xl bg-card/40 backdrop-blur-2xl border border-border/60">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-foreground">{s.title}</span>
                      {s.teams?.name && <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary">{s.teams.name}</span>}
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
                        name: layerNameById.get(activeLayerId) || t.teamsPage.layerBadge,
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
                        return (
                          <div key={`combined-${index}`} className={`aspect-square rounded-[3px] border ${owners.length > 1 ? "ring-1 ring-offset-0 ring-amber-400/80" : ""} ${owners.length === 0 ? "bg-background/40 border-border/40" : ""}`}
                            style={owners.length > 0 ? { background, borderColor: owners.length > 1 ? "rgba(251, 191, 36, 0.8)" : hexToRgba(ownerColors[0], 0.92) } : undefined}
                            title={owners.map((ownerId) => pitchNameById.get(ownerId) || ownerId).join(" + ") || t.teamsPage.unassigned} />
                        );
                      })}
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-2">{t.teamsPage.combinedHint}</p>
                  </div>
                ) : (
                  <div className="grid md:grid-cols-2 gap-4">
                    {filteredPitches.map((pitch) => (
                      <div key={pitch.id} className="rounded-2xl border border-border/60 bg-card/40 backdrop-blur-2xl p-4">
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
                      <div key={booking.id} className="rounded-xl border border-border/60 bg-background/50 p-3">
                        <div className="flex items-center justify-between gap-2">
                          <div className="text-xs font-semibold text-foreground truncate">{booking.title}</div>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full border ${booking.hasConflict ? "bg-accent/15 text-accent border-accent/30" : "bg-primary/15 text-primary border-primary/30"}`}>{booking.hasConflict ? t.teamsPage.conflict : t.teamsPage.ok}</span>
                        </div>
                        <div className="mt-1 text-[11px] text-muted-foreground">{booking.pitchName} • {booking.teamName || t.teamsPage.clubWide} • {t.teamsPage.bookingTypes[booking.booking_type]}</div>
                      </div>
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
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowAddTeam(false)}>
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-[95vw] sm:max-w-md rounded-2xl bg-card border border-border p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-bold text-foreground">{t.teamsPage.teamModal.title}</h3>
              <Button variant="ghost" size="icon" onClick={() => setShowAddTeam(false)}><X className="w-4 h-4" /></Button>
            </div>
            <div className="space-y-3">
              <Input placeholder={t.teamsPage.teamModal.namePlaceholder} value={teamName} onChange={e => setTeamName(e.target.value)} className="bg-background" maxLength={100} />
              <select
                value={teamSport}
                onChange={e => setTeamSport(e.target.value)}
                className="w-full h-10 rounded-md border border-border bg-background px-3 text-sm text-foreground"
              >
                {SPORTS_CATALOG.map((sport) => (
                  <option key={sport.id} value={sport.id}>{sport.label}</option>
                ))}
              </select>
              <Input placeholder={t.teamsPage.teamModal.agePlaceholder} value={teamAge} onChange={e => setTeamAge(e.target.value)} className="bg-background" />
              <Input placeholder={t.teamsPage.teamModal.coachPlaceholder} value={teamCoach} onChange={e => setTeamCoach(e.target.value)} className="bg-background" />
              <Button onClick={handleAddTeam} disabled={!teamName.trim()} className="w-full bg-gradient-gold-static text-primary-foreground hover:brightness-110">
                {t.teamsPage.teamModal.create}
              </Button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Add Session Modal */}
      {showAddSession && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowAddSession(false)}>
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-[95vw] sm:max-w-md rounded-2xl bg-card border border-border p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-bold text-foreground">{t.teamsPage.sessionModal.title}</h3>
              <Button variant="ghost" size="icon" onClick={() => setShowAddSession(false)}><X className="w-4 h-4" /></Button>
            </div>
            <div className="space-y-3">
              <Input placeholder={t.teamsPage.sessionModal.sessionTitlePlaceholder} value={sessionTitle} onChange={e => setSessionTitle(e.target.value)} className="bg-background" maxLength={200} />
              <select value={sessionTeamId} onChange={e => setSessionTeamId(e.target.value)}
                className="w-full h-10 rounded-md border border-border bg-background px-3 text-sm text-foreground">
                <option value="">{t.teamsPage.sessionModal.noTeamOption}</option>
                {teams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}
              </select>
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
              <Button onClick={handleAddSession} disabled={!sessionTitle.trim() || !sessionStart || !sessionEnd}
                className="w-full bg-gradient-gold-static text-primary-foreground hover:brightness-110">
                {t.teamsPage.sessionModal.submit}
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
            setPitchLayerId(activeLayerId === "all" ? "" : activeLayerId);
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
                  setPitchLayerId(activeLayerId === "all" ? "" : activeLayerId);
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
                <select
                  value={pitchElementType}
                  onChange={(event) => setPitchElementType(event.target.value as ClubPitch["element_type"])}
                  className="w-full h-10 rounded-md border border-border bg-background px-3 text-sm text-foreground"
                >
                  {PROPERTY_ELEMENT_TYPES.map((elementType) => (
                    <option key={elementType} value={elementType}>{formatElementTypeLabel(elementType, t.teamsPage.elementTypes)}</option>
                  ))}
                </select>
                <select
                  value={pitchLayerId}
                  onChange={(event) => setPitchLayerId(event.target.value)}
                  className="w-full h-10 rounded-md border border-border bg-background px-3 text-sm text-foreground"
                >
                  <option value="">{supportsLayerFields ? t.teamsPage.layerNone : t.teamsPage.layerUnavailable}</option>
                  {layers.map((layer) => (
                    <option key={`layer-pitch-${layer.id}`} value={layer.id}>{layer.name}</option>
                  ))}
                </select>
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
              <select
                value={pitchParentId}
                onChange={(event) => {
                  const nextParent = event.target.value;
                  setPitchParentId(nextParent);
                  if (!nextParent) return;
                  const parentPitch = pitchById.get(nextParent);
                  if (!parentPitch) return;
                  setSelectedPitchCells((previous) => previous.filter((cell) => parentPitch.grid_cells.includes(cell)));
                }}
                className="w-full h-10 rounded-md border border-border bg-background px-3 text-sm text-foreground"
              >
                <option value="">{t.teamsPage.elementModal.parentNone}</option>
                {pitches
                  .filter((pitch) => pitch.id !== editingPitchId)
                  .map((pitch) => (
                    <option key={`parent-${pitch.id}`} value={pitch.id}>
                      {fillTemplate(t.teamsPage.elementModal.splitFrom, { name: pitch.name })}
                    </option>
                  ))}
              </select>
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

      {/* Add Pitch Booking Modal */}
      {showAddBooking && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowAddBooking(false)}>
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-[95vw] sm:max-w-md rounded-2xl bg-card border border-border p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-bold text-foreground">{bookingActionLabel}</h3>
              <Button variant="ghost" size="icon" onClick={() => setShowAddBooking(false)}><X className="w-4 h-4" /></Button>
            </div>
            <div className="space-y-3">
              <select
                value={bookingPitchId}
                onChange={(event) => setBookingPitchId(event.target.value)}
                className="w-full h-10 rounded-md border border-border bg-background px-3 text-sm text-foreground"
              >
                <option value="">{t.teamsPage.selectBookingElement}</option>
                {(activeLayerId === "all" ? pitches : filteredPitches).map((pitch) => <option key={pitch.id} value={pitch.id}>{pitch.name}</option>)}
              </select>
              <select
                value={bookingTeamId}
                onChange={(event) => setBookingTeamId(event.target.value)}
                className="w-full h-10 rounded-md border border-border bg-background px-3 text-sm text-foreground"
              >
                <option value="">{t.teamsPage.bookingModal.clubWide}</option>
                {teams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}
              </select>
              <select
                value={bookingType}
                onChange={(event) => setBookingType(event.target.value as "training" | "match" | "other")}
                className="w-full h-10 rounded-md border border-border bg-background px-3 text-sm text-foreground"
              >
                <option value="training">{t.teamsPage.bookingTypes.training}</option>
                <option value="match">{t.teamsPage.bookingTypes.match}</option>
                <option value="other">{t.teamsPage.bookingTypes.other}</option>
              </select>
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
              <select
                value={layerPurpose}
                onChange={(event) => setLayerPurpose(event.target.value as ClubPropertyLayer["purpose"])}
                className="w-full h-10 rounded-md border border-border bg-background px-3 text-sm text-foreground"
              >
                <option value="training">{t.teamsPage.layerPurposes.training}</option>
                <option value="administration">{t.teamsPage.layerPurposes.administration}</option>
                <option value="operations">{t.teamsPage.layerPurposes.operations}</option>
                <option value="other">{t.teamsPage.layerPurposes.other}</option>
              </select>
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
