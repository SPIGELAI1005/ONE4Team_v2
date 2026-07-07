import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { DashboardHeaderSlot } from "@/components/layout/DashboardHeaderSlot";
import {
  Plus,
  Megaphone,
  Send,
  Loader2,
  X,
  Hash,
  MessageSquare,
  BotMessageSquare,
  Paperclip,
  RotateCcw,
  Search,
  Globe,
  Users,
  Upload,
  Pencil,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/useAuth";
import { useClubId } from "@/hooks/use-club-id";
import { supabase } from "@/integrations/supabase/client";
import {
  messagePaginationRange,
  resolveMessagePaginationCount,
} from "@/lib/communication-pagination";
import { supabaseDynamic } from "@/lib/supabase-dynamic";
import { useToast } from "@/hooks/use-toast";
import { DASHBOARD_PAGE_INNER, DASHBOARD_PAGE_ROOT, DASHBOARD_TYPE_CAPTION, DASHBOARD_TYPE_MICRO } from "@/lib/dashboard-page-shell";
import { DashboardToolbarActions } from "@/components/dashboard/DashboardToolbarActions";
import { usePermissions } from "@/hooks/use-permissions";
import { useLanguage } from "@/hooks/use-language";
import { correlationHeaders } from "@/lib/observability";
import { supabaseErrorMessage } from "@/lib/supabase-error-message";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { PUBLIC_NEWS_CATEGORIES } from "@/lib/public-club-news";
import { filterAnnouncementsForUser, filterMessageChannelsForUser, buildMessageAccessFromGateRole, TRAINERS_CHANNEL_ID } from "@/lib/club-message-access";
import { clubAi4tModalOverlayClass, clubAi4tModalPanelClass, clubEmbeddedLightInputFieldClass, clubEmbeddedLightInputShellClass, clubGlassInputClass } from "@/lib/public-club-glass-classes";
import { cn } from "@/lib/utils";
import { useUserTeamIds } from "@/hooks/use-user-team-ids";
import { useModuleGateRole } from "@/hooks/use-module-gate-role";
import { useClubAdmin } from "@/hooks/use-club-admin";
import { uploadClubImageAsset } from "@/lib/upload-club-image";
import { AnnouncementDetailView } from "@/components/communication/announcement-detail-view";
import { MessageForwardButton } from "@/components/communication/message-forward-button";
import { canDeleteMessage, canEditMessage, canManageAnnouncements } from "@/lib/club-message-moderation";

type Announcement = {
  id: string;
  title: string;
  content: string;
  priority: string;
  created_at: string;
  author_id: string;
  team_id?: string | null;
  publish_to_public_website?: boolean;
  public_news_category?: string | null;
  image_url?: string | null;
  excerpt?: string | null;
};

type Message = {
  id: string;
  content: string;
  sender_id: string;
  team_id: string | null;
  is_trainers_channel?: boolean;
  created_at: string;
  attachments: AttachmentMeta[];
  profiles?: { display_name: string | null };
  send_state?: "sending" | "sent" | "failed";
  local_error?: string | null;
};

type MessageBase = {
  id: string;
  content: string;
  sender_id: string;
  team_id: string | null;
  is_trainers_channel?: boolean;
  created_at: string;
  attachments?: unknown;
};

type AttachmentMeta = {
  path: string;
  file_name: string;
  mime_type: string;
  size: number;
  signed_url?: string | null;
};

type TeamChannel = {
  id: string;
  name: string;
};

type ChannelKind = "announcements" | "chat";

type Channel = {
  id: string;
  label: string;
  kind: ChannelKind;
  teamId: string | null;
  isTrainersChannel?: boolean;
};

type BridgeProvider = "telegram" | "whatsapp";

type BridgeConnector = {
  id: string;
  club_id: string;
  provider: BridgeProvider;
  status: "pending" | "connected" | "error" | "disabled";
  display_name: string | null;
  external_channel_id: string | null;
  webhook_secret: string;
  config: Record<string, unknown>;
  last_error: string | null;
  last_synced_at: string | null;
};

type BridgeEvent = {
  connector_id: string;
  status: "queued" | "processed" | "failed" | "ignored";
  created_at: string;
};

type BridgeForm = {
  provider: BridgeProvider;
  displayName: string;
  externalChannelId: string;
  status: "pending" | "connected" | "error" | "disabled";
  teamId: string;
  telegramBotToken: string;
  whatsappApiBaseUrl: string;
  whatsappAccessToken: string;
  whatsappFromNumber: string;
  webhookSecret: string;
};

const CHAT_ATTACHMENTS_BUCKET = "chat-attachments";
const MESSAGE_PAGE_SIZE = 50;

const priorityColors: Record<string, string> = {
  low: "bg-muted text-muted-foreground",
  normal: "bg-primary/10 text-primary",
  high: "bg-orange-500/10 text-orange-400",
  urgent: "bg-accent/10 text-accent",
};

const embeddedPriorityColors: Record<string, string> = {
  low: "bg-neutral-100 text-neutral-600",
  normal: "bg-[color:var(--club-primary)]/10 text-[color:var(--club-primary)]",
  high: "bg-orange-100 text-orange-800",
  urgent: "bg-red-100 text-red-800",
};

const connectorStatusColor: Record<BridgeConnector["status"], string> = {
  pending: "bg-muted text-muted-foreground",
  connected: "bg-emerald-500/15 text-emerald-400",
  error: "bg-accent/15 text-accent",
  disabled: "bg-muted text-muted-foreground",
};

function toAttachmentList(value: unknown): AttachmentMeta[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const row = item as Record<string, unknown>;
      const path = String(row.path || "");
      if (!path) return null;
      return {
        path,
        file_name: String(row.file_name || "attachment"),
        mime_type: String(row.mime_type || "application/octet-stream"),
        size: Number(row.size || 0),
      } as AttachmentMeta;
    })
    .filter((item): item is AttachmentMeta => Boolean(item));
}

function isSameDay(left: string, right: string) {
  const a = new Date(left);
  const b = new Date(right);
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

/** PostgREST `or` filter: rows strictly before (created_at, id) in desc sort order. */
function messagesKeysetOrFilter(created_at: string, id: string) {
  const q = (v: string) => `"${v.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
  return `created_at.lt.${q(created_at)},and(created_at.eq.${q(created_at)},id.lt.${id})`;
}

function messageMatchesChannel(message: MessageBase, channel: Channel): boolean {
  if (channel.kind !== "chat") return false;
  const isTrainers = Boolean(message.is_trainers_channel);
  if (channel.isTrainersChannel) return isTrainers && message.team_id === null;
  if (isTrainers) return false;
  if (channel.teamId === null) return message.team_id === null;
  return message.team_id === channel.teamId;
}

function applyChannelToMessageQuery<T extends { is: (col: string, val: null | boolean) => T; eq: (col: string, val: string | boolean) => T }>(
  query: T,
  channel: Channel,
  supportsTrainersColumn: boolean,
): T {
  if (channel.isTrainersChannel && supportsTrainersColumn) {
    return query.is("team_id", null).eq("is_trainers_channel", true);
  }
  if (channel.teamId === null) {
    if (supportsTrainersColumn) {
      return query.is("team_id", null).eq("is_trainers_channel", false);
    }
    return query.is("team_id", null);
  }
  if (supportsTrainersColumn) {
    return query.eq("team_id", channel.teamId).eq("is_trainers_channel", false);
  }
  return query.eq("team_id", channel.teamId);
}

export interface CommunicationWorkspaceProps {
  /** Render inside public club modal (no dashboard chrome, no external bridge). */
  embedded?: boolean;
  clubIdOverride?: string;
  initialChannelId?: string;
  initialAnnouncementId?: string;
  editAnnouncementId?: string;
  /** Public club hero `?team=` filter - limits visible team channels. */
  teamFilterId?: string;
  /** Optional club display name for forwarded message attribution. */
  clubNameOverride?: string;
}

export function CommunicationWorkspace({
  embedded = false,
  clubIdOverride,
  initialChannelId,
  initialAnnouncementId,
  editAnnouncementId,
  teamFilterId,
  clubNameOverride,
}: CommunicationWorkspaceProps = {}) {
  const { user } = useAuth();
  const { clubId: hookClubId, loading: clubLoading } = useClubId();
  const clubId = clubIdOverride ?? hookClubId;
  const { toast } = useToast();
  const perms = usePermissions();
  const gateRole = useModuleGateRole();
  const { isClubAdmin } = useClubAdmin(clubId);
  const { t } = useLanguage();
  const [searchParams] = useSearchParams();
  const { teamIds: userTeamIds } = useUserTeamIds(clubId);
  const messageAccess = useMemo(
    () =>
      buildMessageAccessFromGateRole(
        gateRole,
        userTeamIds,
        embedded ? teamFilterId : undefined,
      ),
    [embedded, gateRole, teamFilterId, userTeamIds],
  );
  const attachmentPlaceholder = t.communicationPage.attachmentPlaceholder;

  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [pendingMessages, setPendingMessages] = useState<Message[]>([]);
  const [teams, setTeams] = useState<TeamChannel[]>([]);
  const [clubName, setClubName] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(true);
  const [messagePage, setMessagePage] = useState(1);
  const [messageTotalCount, setMessageTotalCount] = useState(0);
  const [showAddAnnouncement, setShowAddAnnouncement] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [messageSearch, setMessageSearch] = useState("");
  const [selectedChannelId, setSelectedChannelId] = useState("club-general");
  const [bridgeBusy, setBridgeBusy] = useState(false);
  const [missingMessagesTable, setMissingMessagesTable] = useState(false);
  const [missingAnnouncementsTable, setMissingAnnouncementsTable] = useState(false);
  const [baseDataLoadError, setBaseDataLoadError] = useState<string | null>(null);
  const [supportsAttachments, setSupportsAttachments] = useState(true);
  const [supportsTrainersChannel, setSupportsTrainersChannel] = useState(true);
  const [connectors, setConnectors] = useState<BridgeConnector[]>([]);
  const [connectorEvents, setConnectorEvents] = useState<BridgeEvent[]>([]);
  const [showBridgeSettings, setShowBridgeSettings] = useState(false);
  const [bridgeForm, setBridgeForm] = useState<BridgeForm | null>(null);
  const [compactMobileChrome, setCompactMobileChrome] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [annTitle, setAnnTitle] = useState("");
  const [annContent, setAnnContent] = useState("");
  const [annPriority, setAnnPriority] = useState("normal");
  const [annPublishPublic, setAnnPublishPublic] = useState(false);
  const [annPublicCategory, setAnnPublicCategory] = useState("club");
  const [annImageUrl, setAnnImageUrl] = useState("");
  const [annImageUploading, setAnnImageUploading] = useState(false);
  const annImageFileRef = useRef<HTMLInputElement>(null);
  const [annExcerpt, setAnnExcerpt] = useState("");
  const [annTeamId, setAnnTeamId] = useState<string>("all");
  const [viewingAnnouncementId, setViewingAnnouncementId] = useState<string | null>(
    initialAnnouncementId ?? null,
  );
  const [editingAnnouncementId, setEditingAnnouncementId] = useState<string | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingMessageDraft, setEditingMessageDraft] = useState("");

  /** Keeps realtime handler off `messagePage` dependency (avoids channel churn on pagination). */
  const messagePageRef = useRef(messagePage);
  /** Page N+1 loads rows older than the tuple stored for page N (stable under inserts). */
  const messageKeysetRef = useRef<Record<number, { created_at: string; id: string }>>({});
  useEffect(() => {
    messagePageRef.current = messagePage;
  }, [messagePage]);

  useEffect(() => {
    if (embedded) return;
    const mql = window.matchMedia("(max-width: 1023px)");
    const sync = () => setCompactMobileChrome(mql.matches);
    sync();
    mql.addEventListener("change", sync);
    return () => mql.removeEventListener("change", sync);
  }, [embedded]);

  const hydrateMessages = useCallback(async (rows: MessageBase[]) => {
    if (!rows.length) return [] as Message[];
    const senderIds = Array.from(new Set(rows.map((row) => row.sender_id))).filter(Boolean);
    if (!senderIds.length) {
      return rows.map((row) => ({
        ...row,
        attachments: toAttachmentList(row.attachments),
        send_state: "sent",
        local_error: null,
      })) as Message[];
    }

    const { data: profileRows, error: profileError } = await supabase
      .from("profiles")
      .select("user_id, display_name")
      .in("user_id", senderIds);

    if (profileError) {
      return rows as Message[];
    }

    const profileMap = new Map<string, { display_name: string | null }>();
    for (const row of ((profileRows as Array<{ user_id: string; display_name: string | null }>) || [])) {
      profileMap.set(row.user_id, { display_name: row.display_name });
    }

    const hydrated = rows.map((row) => ({
      ...row,
      attachments: toAttachmentList(row.attachments),
      profiles: profileMap.get(row.sender_id),
      send_state: "sent" as const,
      local_error: null,
    }));

    const uniquePaths = Array.from(
      new Set(hydrated.flatMap((message) => message.attachments.map((attachment) => attachment.path)))
    );
    const signedUrlMap = new Map<string, string>();

    await Promise.all(
      uniquePaths.map(async (path) => {
        const { data } = await supabase.storage
          .from(CHAT_ATTACHMENTS_BUCKET)
          .createSignedUrl(path, 60 * 60 * 12);
        if (data?.signedUrl) signedUrlMap.set(path, data.signedUrl);
      })
    );

    return hydrated.map((message) => ({
      ...message,
      attachments: message.attachments.map((attachment) => ({
        ...attachment,
        signed_url: signedUrlMap.get(attachment.path) || null,
      })),
    }));
  }, []);

  const channels = useMemo<Channel[]>(
    () =>
      filterMessageChannelsForUser(
        [
          { id: "announcements", label: t.communicationPage.announcementsChannel, kind: "announcements", teamId: null },
          { id: "club-general", label: t.communicationPage.clubGeneralChannel, kind: "chat", teamId: null },
          ...(supportsTrainersChannel
            ? [
                {
                  id: TRAINERS_CHANNEL_ID,
                  label: t.communicationPage.trainersChannel,
                  kind: "chat" as const,
                  teamId: null,
                  isTrainersChannel: true,
                },
              ]
            : []),
          ...teams.map((team) => ({
            id: `team-${team.id}`,
            label: team.name,
            kind: "chat" as const,
            teamId: team.id,
          })),
        ],
        messageAccess,
      ),
    [
      messageAccess,
      supportsTrainersChannel,
      t.communicationPage.announcementsChannel,
      t.communicationPage.clubGeneralChannel,
      t.communicationPage.trainersChannel,
      teams,
    ],
  );

  const visibleAnnouncements = useMemo(
    () =>
      filterAnnouncementsForUser(announcements, {
        userTeamIds: messageAccess.userTeamIds,
        isAdmin: messageAccess.isAdmin,
        teamFilterId: embedded ? teamFilterId : undefined,
        clubWideOnly: messageAccess.clubWideOnly,
      }),
    [announcements, embedded, messageAccess.clubWideOnly, messageAccess.isAdmin, messageAccess.userTeamIds, teamFilterId],
  );

  const viewingAnnouncement = useMemo(
    () => announcements.find((announcement) => announcement.id === viewingAnnouncementId) ?? null,
    [announcements, viewingAnnouncementId],
  );

  const selectedChannel =
    channels.find((channel) => channel.id === selectedChannelId) ?? channels[0];

  useEffect(() => {
    const fromUrl = searchParams.get("channel");
    if (fromUrl && channels.some((channel) => channel.id === fromUrl)) {
      setSelectedChannelId(fromUrl);
    }
    const announcementFromUrl = searchParams.get("announcement");
    if (
      announcementFromUrl &&
      announcements.some((announcement) => announcement.id === announcementFromUrl)
    ) {
      setSelectedChannelId("announcements");
      setViewingAnnouncementId(announcementFromUrl);
    }
  }, [announcements, channels, searchParams]);

  useEffect(() => {
    if (!initialChannelId) return;
    if (channels.some((channel) => channel.id === initialChannelId)) {
      setSelectedChannelId(initialChannelId);
    }
  }, [channels, initialChannelId]);

  useEffect(() => {
    if (!initialAnnouncementId) return;
    if (!announcements.some((announcement) => announcement.id === initialAnnouncementId)) return;
    setSelectedChannelId("announcements");
    setViewingAnnouncementId(initialAnnouncementId);
  }, [announcements, initialAnnouncementId]);

  useEffect(() => {
    if (!channels.some((channel) => channel.id === selectedChannelId) && channels[0]) {
      setSelectedChannelId(channels[0].id);
    }
  }, [channels, selectedChannelId]);

  const selectedChannelRef = useRef(selectedChannel);
  useEffect(() => {
    selectedChannelRef.current = selectedChannel;
  }, [selectedChannel]);

  const loadBridgeData = useCallback(async () => {
    if (!clubId || !perms.isAdmin) return;

    const { data: connectorPayload, error: connectorError } = await supabase.functions.invoke(
      "chat-bridge",
      { headers: correlationHeaders(), body: { action: "connector.list", clubId } },
    );
    if (!connectorError) {
      const connectorList =
        ((connectorPayload as { connectors?: BridgeConnector[] } | null)?.connectors || []);
      setConnectors(connectorList);
    }

    const { data: eventsData, error: eventsError } = await supabaseDynamic
      .from("chat_bridge_events")
      .select("connector_id, status, created_at")
      .eq("club_id", clubId)
      .order("created_at", { ascending: false })
      .limit(300);
    if (!eventsError) {
      setConnectorEvents((eventsData as unknown as BridgeEvent[]) || []);
    }
  }, [clubId, perms.isAdmin]);

  const mergedMessages = useMemo(() => {
    const merged = [...messages, ...pendingMessages];
    merged.sort((left, right) => new Date(left.created_at).getTime() - new Date(right.created_at).getTime());
    return merged;
  }, [messages, pendingMessages]);

  const filteredMessages = useMemo(() => {
    if (!messageSearch.trim()) return mergedMessages;
    const query = messageSearch.trim().toLowerCase();
    return mergedMessages.filter((message) => {
      const byContent = message.content.toLowerCase().includes(query);
      const bySender = (message.profiles?.display_name || "").toLowerCase().includes(query);
      return byContent || bySender;
    });
  }, [mergedMessages, messageSearch]);
  const messageTotalPages = Math.max(1, Math.ceil(messageTotalCount / MESSAGE_PAGE_SIZE));
  const messagePaginationDisplay = useMemo(
    () => messagePaginationRange(messageTotalCount, messagePage, MESSAGE_PAGE_SIZE, messages.length),
    [messageTotalCount, messagePage, messages.length],
  );
  const messagePaginationLabel = useMemo(() => {
    const { from, to, total } = messagePaginationDisplay;
    if (total === 0) return t.communicationPage.messagesPaginationEmpty;
    return t.communicationPage.messagesPaginationRange
      .replace("{from}", String(from))
      .replace("{to}", String(to))
      .replace("{total}", String(total));
  }, [messagePaginationDisplay, t.communicationPage.messagesPaginationEmpty, t.communicationPage.messagesPaginationRange]);

  const providerHealth = useMemo(
    () =>
      connectors.map((connector) => {
        const events = connectorEvents.filter((event) => event.connector_id === connector.id);
        const processed = events.filter((event) => event.status === "processed").length;
        const failed = events.filter((event) => event.status === "failed").length;
        return { connector, processed, failed };
      }),
    [connectorEvents, connectors]
  );

  const providerLabel = useCallback(
    (provider: BridgeProvider) =>
      provider === "whatsapp" ? t.communicationPage.whatsApp : t.communicationPage.telegram,
    [t.communicationPage.telegram, t.communicationPage.whatsApp]
  );

  const connectorStatusLabel = useCallback(
    (status: BridgeConnector["status"]) => {
      if (status === "pending") return t.communicationPage.pending;
      if (status === "connected") return t.communicationPage.connected;
      if (status === "error") return t.common.error;
      return t.communicationPage.disabled;
    },
    [t.common.error, t.communicationPage.connected, t.communicationPage.disabled, t.communicationPage.pending]
  );

  const loadBaseData = useCallback(async () => {
    if (!clubId) return;
    setLoading(true);
    setBaseDataLoadError(null);
    const [annRes, teamsRes, clubRes] = await Promise.all([
      supabase
        .from("announcements")
        .select("*")
        .eq("club_id", clubId)
        .order("created_at", { ascending: false }),
      supabase.from("teams").select("id, name").eq("club_id", clubId).order("name"),
      supabase.from("clubs").select("name").eq("id", clubId).maybeSingle(),
    ]);

    let combinedErr: string | null = null;

    if (annRes.error) {
      if (annRes.error.message.includes("Could not find the table 'public.announcements'")) {
        setMissingAnnouncementsTable(true);
        toast({
          title: t.communicationPage.announcementsTableMissingTitle,
          description: t.communicationPage.announcementsTableMissingDesc,
          variant: "destructive",
        });
      } else {
        combinedErr = supabaseErrorMessage(annRes.error);
      }
    }
    if (teamsRes.error) {
      combinedErr = combinedErr || supabaseErrorMessage(teamsRes.error);
    }
    if (clubRes.error) {
      combinedErr = combinedErr || supabaseErrorMessage(clubRes.error);
    }

    if (combinedErr) {
      setBaseDataLoadError(combinedErr);
      toast({ title: t.common.error, description: combinedErr, variant: "destructive" });
    }

    setAnnouncements((annRes.data as Announcement[]) || []);
    setTeams((teamsRes.data as TeamChannel[]) || []);
    setClubName(typeof clubRes.data?.name === "string" ? clubRes.data.name : "");
    setLoading(false);
  }, [
    clubId,
    toast,
    t.common.error,
    t.communicationPage.announcementsTableMissingDesc,
    t.communicationPage.announcementsTableMissingTitle,
  ]);

  useEffect(() => {
    messageKeysetRef.current = {};
    setAnnouncements([]);
    setMessages([]);
    setPendingMessages([]);
    setTeams([]);
    setClubName("");
    setLoading(true);
    setLoadingMessages(true);
    setMissingMessagesTable(false);
    setMissingAnnouncementsTable(false);
    setSupportsAttachments(true);
    setSupportsTrainersChannel(true);
    setMessagePage(1);
    setMessageTotalCount(0);
    setBaseDataLoadError(null);
  }, [clubId]);

  useEffect(() => {
    messageKeysetRef.current = {};
    setMessagePage(1);
  }, [selectedChannelId]);

  useEffect(() => {
    if (!clubId) return;
    void loadBaseData();
    void loadBridgeData();
  }, [clubId, loadBaseData, loadBridgeData]);

  useEffect(() => {
    const fetchMessages = async () => {
      if (!clubId || selectedChannel.kind !== "chat") {
        setMessages([]);
        setPendingMessages([]);
        setMessageTotalCount(0);
        setLoadingMessages(false);
        return;
      }
      setLoadingMessages(true);
      if (messagePage === 1) {
        messageKeysetRef.current = {};
      } else {
        const before = messageKeysetRef.current[messagePage - 1];
        if (!before) {
          setMessagePage(1);
          setLoadingMessages(false);
          return;
        }
      }

      const runQuery = async (withAttachments: boolean, withTrainersColumn: boolean) => {
        const trainersSelect = withTrainersColumn ? ", is_trainers_channel" : "";
        let query = supabase
          .from("messages")
          .select(
            withAttachments
              ? `id, content, sender_id, team_id, created_at, attachments${trainersSelect}`
              : `id, content, sender_id, team_id, created_at${trainersSelect}`,
            { count: "exact" },
          )
          .eq("club_id", clubId)
          .order("created_at", { ascending: false })
          .order("id", { ascending: false })
          .limit(MESSAGE_PAGE_SIZE);
        query = applyChannelToMessageQuery(query, selectedChannel, withTrainersColumn);
        if (messagePage > 1) {
          const before = messageKeysetRef.current[messagePage - 1];
          if (before) query = query.or(messagesKeysetOrFilter(before.created_at, before.id));
        }
        return query;
      };

      const runCountQuery = async (withTrainersColumn: boolean) => {
        const query = supabase
          .from("messages")
          .select("id", { count: "exact", head: true })
          .eq("club_id", clubId);
        return applyChannelToMessageQuery(query, selectedChannel, withTrainersColumn);
      };

      let response = await runQuery(true, true);
      if (response.error?.message.includes("column messages.attachments does not exist")) {
        setSupportsAttachments(false);
        response = await runQuery(false, true);
      }
      if (response.error?.message.includes("column messages.is_trainers_channel does not exist")) {
        setSupportsTrainersChannel(false);
        response = await runQuery(supportsAttachments, false);
      }
      const { data, error } = response;
      if (error) {
        if (error.message.includes("Could not find the table 'public.messages'")) {
          setMissingMessagesTable(true);
          toast({
            title: t.communicationPage.messagesTableMissingTitle,
            description: t.communicationPage.messagesTableMissingDesc,
            variant: "destructive",
          });
        } else {
          toast({ title: t.common.error, description: error.message, variant: "destructive" });
        }
      }
      const rawRows = (data as unknown as MessageBase[]) || [];
      if (rawRows.length > 0) {
        const oldest = rawRows[rawRows.length - 1];
        if (oldest?.created_at && oldest?.id) {
          messageKeysetRef.current[messagePage] = { created_at: oldest.created_at, id: oldest.id };
        }
      }
      const hydrated = await hydrateMessages(rawRows);
      const reversed = [...hydrated].reverse();
      setMessages(reversed);

      let totalCount = response.count ?? 0;
      if (totalCount === 0 && rawRows.length > 0) {
        const countResponse = await runCountQuery(supportsTrainersChannel);
        if (!countResponse.error && countResponse.count != null) {
          totalCount = countResponse.count;
        }
      }
      totalCount = resolveMessagePaginationCount({
        supabaseCount: totalCount,
        rowCount: rawRows.length,
        page: messagePage,
        visibleCount: reversed.length,
        pageSize: MESSAGE_PAGE_SIZE,
      });
      setMessageTotalCount(totalCount);
      setPendingMessages([]);
      setLoadingMessages(false);
    };
    void fetchMessages();
  }, [
    clubId,
    hydrateMessages,
    messagePage,
    selectedChannel,
    supportsAttachments,
    supportsTrainersChannel,
    t.common.error,
    t.communicationPage.messagesTableMissingDesc,
    t.communicationPage.messagesTableMissingTitle,
    toast,
  ]);

  useEffect(() => {
    if (!clubId) return;

    /**
     * Realtime policy: one postgres_changes subscription per club (not per UI channel switch).
     * Filter is club-scoped only; team routing happens in the handler to limit channel churn.
     * Channel name is unique per club to avoid cross-tenant collisions in the client multiplex.
     */
    const channelName = `club-messages:${clubId}`;
    let insertBurstTimer: ReturnType<typeof setTimeout> | null = null;
    const pendingInserts: MessageBase[] = [];

    const flushPendingInserts = async () => {
      if (!pendingInserts.length) return;
      const batch = pendingInserts.splice(0, pendingInserts.length);
      const ch = selectedChannelRef.current;
      for (const incoming of batch) {
        if (!messageMatchesChannel(incoming, ch)) continue;

        setPendingMessages((previous) =>
          previous.filter(
            (item) =>
              !(
                item.sender_id === incoming.sender_id &&
                item.content === incoming.content &&
                Math.abs(
                  new Date(item.created_at).getTime() - new Date(incoming.created_at).getTime()
                ) < 20_000
              ),
          ),
        );

        const hydratedList = await hydrateMessages([incoming]);
        const hydrated = hydratedList[0];
        if (!hydrated) continue;

        const page = messagePageRef.current;
        let shouldIncrementCount = false;
        if (page === 1) {
          setMessages((previous) => {
            if (previous.some((message) => message.id === hydrated.id)) return previous;
            shouldIncrementCount = true;
            return [...previous, hydrated].slice(-MESSAGE_PAGE_SIZE);
          });
        } else {
          setMessages((previous) => {
            if (previous.some((message) => message.id === hydrated.id)) return previous;
            shouldIncrementCount = true;
            return previous;
          });
        }
        if (shouldIncrementCount) {
          setMessageTotalCount((previous) => previous + 1);
        }
      }
    };

    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `club_id=eq.${clubId}` },
        (payload) => {
          const incoming = payload.new as MessageBase;
          pendingInserts.push(incoming);
          if (insertBurstTimer) clearTimeout(insertBurstTimer);
          insertBurstTimer = setTimeout(() => {
            insertBurstTimer = null;
            void flushPendingInserts();
          }, 80);
        },
      )
      .subscribe((status) => {
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          console.warn(`[realtime] messages channel ${status} (club ${clubId}) - client will retry on next navigation/remount`);
        }
      });

    return () => {
      if (insertBurstTimer) clearTimeout(insertBurstTimer);
      supabase.removeChannel(channel);
    };
    /** Intentionally omit `selectedChannel`: routing uses `selectedChannelRef` to avoid subscribe churn. */
  }, [clubId, hydrateMessages]);

  useEffect(() => {
    if (messagePage !== 1) return;
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [filteredMessages, messagePage]);

  const uploadComposerFiles = async () => {
    if (!clubId || !selectedFiles.length) return [] as AttachmentMeta[];
    const uploaded: AttachmentMeta[] = [];
    for (const file of selectedFiles) {
      const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, "-");
      const path = `${clubId}/messages/${Date.now()}-${crypto.randomUUID()}-${safeName}`;
      const { error } = await supabase.storage
        .from(CHAT_ATTACHMENTS_BUCKET)
        .upload(path, file, { upsert: false });
      if (error) throw error;
      const { data: signed } = await supabase.storage
        .from(CHAT_ATTACHMENTS_BUCKET)
        .createSignedUrl(path, 60 * 60 * 12);
      uploaded.push({
        path,
        file_name: file.name,
        mime_type: file.type || "application/octet-stream",
        size: file.size,
        signed_url: signed?.signedUrl || null,
      });
    }
    return uploaded;
  };

  const sendMessage = async (input: { content: string; attachments: AttachmentMeta[]; clientId: string }) => {
    if (!clubId || !user || selectedChannel.kind !== "chat") return;
    const { content, attachments, clientId } = input;
    const finalContent = content.trim() || (attachments.length ? attachmentPlaceholder : "");
    setPendingMessages((previous) => [
      ...previous,
      {
        id: `local-${clientId}`,
        content: finalContent,
        sender_id: user.id,
        team_id: selectedChannel.teamId,
        is_trainers_channel: Boolean(selectedChannel.isTrainersChannel),
        created_at: new Date().toISOString(),
        attachments,
        profiles: { display_name: t.communicationPage.you },
        send_state: "sending",
        local_error: null,
      },
    ]);

    const payload = {
      club_id: clubId,
      sender_id: user.id,
      team_id: selectedChannel.teamId,
      content: finalContent,
    } as Record<string, unknown>;
    if (supportsTrainersChannel && selectedChannel.isTrainersChannel) {
      payload.is_trainers_channel = true;
    }
    if (supportsAttachments) {
      payload.attachments = attachments.map((attachment) => ({
        path: attachment.path,
        file_name: attachment.file_name,
        mime_type: attachment.mime_type,
        size: attachment.size,
      }));
    }

    const trainersSelect = supportsTrainersChannel ? ", is_trainers_channel" : "";
    const selectColumns = supportsAttachments
      ? `id, content, sender_id, team_id, created_at, attachments${trainersSelect}`
      : `id, content, sender_id, team_id, created_at${trainersSelect}`;

    const { data, error } = await supabase
      .from("messages")
      .insert(payload as never)
      .select(selectColumns)
      .single();

    if (error) {
    if (error.message.includes("Could not find the table 'public.messages'")) {
        setMissingMessagesTable(true);
      }
      setPendingMessages((previous) =>
        previous.map((item) =>
          item.id === `local-${clientId}`
            ? { ...item, send_state: "failed", local_error: error.message }
            : item
        )
      );
      return;
    }

    const hydrated = await hydrateMessages([data as unknown as MessageBase]);
    const next = hydrated[0];
    if (next) {
      if (messagePage === 1) {
        setMessages((previous) => {
          if (previous.some((item) => item.id === next.id)) return previous;
          return [...previous, next].slice(-MESSAGE_PAGE_SIZE);
        });
      }
    }
    setPendingMessages((previous) => previous.filter((item) => item.id !== `local-${clientId}`));
  };

  const handleSendMessage = async () => {
    if (!clubId || !user || selectedChannel.kind !== "chat") return;
    if (!newMessage.trim() && selectedFiles.length === 0) return;
    if (!supportsAttachments && selectedFiles.length > 0) {
      toast({
        title: t.communicationPage.attachmentsNotEnabledTitle,
        description: t.communicationPage.attachmentsNotEnabledDesc,
        variant: "destructive",
      });
      return;
    }

    try {
      const attachments = await uploadComposerFiles();
      const content = newMessage;
      const clientId = crypto.randomUUID();
      setNewMessage("");
      setSelectedFiles([]);
      await sendMessage({ content, attachments, clientId });
    } catch (error) {
      const message = error instanceof Error ? error.message : t.communicationPage.uploadFailed;
      toast({ title: t.common.error, description: message, variant: "destructive" });
    }
  };

  const retryMessage = async (message: Message) => {
    if (message.send_state !== "failed") return;
    const localId = message.id;
    setPendingMessages((previous) =>
      previous.map((item) =>
        item.id === localId ? { ...item, send_state: "sending", local_error: null } : item
      )
    );
    await sendMessage({
      content: message.content === attachmentPlaceholder ? "" : message.content,
      attachments: message.attachments,
      clientId: localId.replace("local-", ""),
    });
  };

  const handleAnnPosterUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !clubId) return;
    if (!file.type.startsWith("image/")) {
      toast({
        title: t.communicationPage.newsImageUploadFailed,
        description: t.communicationPage.newsImageInvalidType,
        variant: "destructive",
      });
      return;
    }
    setAnnImageUploading(true);
    try {
      const url = await uploadClubImageAsset(clubId, file, "announcements");
      setAnnImageUrl(url);
      toast({
        title: t.communicationPage.newsImageUploadSuccess,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : t.communicationPage.newsImageUploadFailed;
      toast({
        title: t.communicationPage.newsImageUploadFailed,
        description: message.includes("Bucket not found")
          ? t.communicationPage.newsImageUploadBucketHint
          : message,
        variant: "destructive",
      });
    } finally {
      setAnnImageUploading(false);
    }
  };

  const resetAnnouncementForm = () => {
    setEditingAnnouncementId(null);
    setAnnTitle("");
    setAnnContent("");
    setAnnTeamId("all");
    setAnnPriority("normal");
    setAnnPublishPublic(false);
    setAnnPublicCategory("club");
    setAnnImageUrl("");
    setAnnExcerpt("");
  };

  const closeAnnouncementModal = () => {
    setShowAddAnnouncement(false);
    resetAnnouncementForm();
  };

  const openEditAnnouncement = (announcement: Announcement) => {
    setEditingAnnouncementId(announcement.id);
    setAnnTitle(announcement.title);
    setAnnContent(announcement.content);
    setAnnExcerpt(announcement.excerpt ?? "");
    setAnnPriority(announcement.priority || "normal");
    setAnnTeamId(announcement.team_id ?? "all");
    setAnnPublishPublic(Boolean(announcement.publish_to_public_website));
    setAnnPublicCategory(announcement.public_news_category ?? "club");
    setAnnImageUrl(announcement.image_url ?? "");
    setShowAddAnnouncement(true);
  };

  const handleSaveAnnouncement = async () => {
    if (!isClubAdmin) {
      toast({
        title: t.common.notAuthorized,
        description: t.communicationPage.onlyAdminsCanPostAnnouncements,
        variant: "destructive",
      });
      return;
    }
    if (missingAnnouncementsTable) {
      toast({
        title: t.communicationPage.announcementsTableMissingTitle,
        description: t.communicationPage.announcementsTableMissingDesc,
        variant: "destructive",
      });
      return;
    }
    if (!annTitle.trim() || !annContent.trim() || !clubId || !user) return;

    const payload = {
      title: annTitle.trim(),
      content: annContent.trim(),
      priority: annPriority,
      team_id: annTeamId === "all" ? null : annTeamId,
      publish_to_public_website: annPublishPublic,
      public_news_category: annPublishPublic ? annPublicCategory : "club",
      image_url: annImageUrl.trim() || null,
      excerpt: annExcerpt.trim() || null,
    };

    if (editingAnnouncementId) {
      const { data, error } = await supabase
        .from("announcements")
        .update(payload)
        .eq("id", editingAnnouncementId)
        .eq("club_id", clubId)
        .select()
        .single();
      if (error) {
        toast({ title: t.common.error, description: error.message, variant: "destructive" });
        return;
      }
      setAnnouncements((previous) =>
        previous.map((row) => (row.id === editingAnnouncementId ? (data as Announcement) : row)),
      );
      closeAnnouncementModal();
      toast({ title: t.communicationPage.announcementUpdated });
      return;
    }

    const { data, error } = await supabase
      .from("announcements")
      .insert({
        club_id: clubId,
        author_id: user.id,
        ...payload,
      })
      .select()
      .single();
    if (error) {
      toast({ title: t.common.error, description: error.message, variant: "destructive" });
      return;
    }
    setAnnouncements((previous) => [data as Announcement, ...previous]);
    closeAnnouncementModal();
    toast({ title: t.communicationPage.announcementPosted });
  };

  const handleDeleteAnnouncement = async (announcementId: string) => {
    if (!isClubAdmin || !clubId) return;
    if (!window.confirm(t.communicationPage.confirmDeleteAnnouncement)) return;
    const { error } = await supabase
      .from("announcements")
      .delete()
      .eq("id", announcementId)
      .eq("club_id", clubId);
    if (error) {
      toast({ title: t.common.error, description: error.message, variant: "destructive" });
      return;
    }
    setAnnouncements((previous) => previous.filter((row) => row.id !== announcementId));
    if (viewingAnnouncementId === announcementId) setViewingAnnouncementId(null);
    toast({ title: t.communicationPage.announcementDeleted });
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (!clubId || !user) return;
    if (!window.confirm(t.communicationPage.confirmDeleteMessage)) return;
    const { error } = await supabase
      .from("messages")
      .delete()
      .eq("id", messageId)
      .eq("club_id", clubId)
      .eq("sender_id", user.id);
    if (error) {
      toast({ title: t.common.error, description: error.message, variant: "destructive" });
      return;
    }
    setMessages((previous) => previous.filter((row) => row.id !== messageId));
    setPendingMessages((previous) => previous.filter((row) => row.id !== messageId));
    if (editingMessageId === messageId) {
      setEditingMessageId(null);
      setEditingMessageDraft("");
    }
    toast({ title: t.communicationPage.messageDeleted });
  };

  const handleSaveMessageEdit = async (messageId: string) => {
    if (!clubId || !user) return;
    const draft = editingMessageDraft.trim();
    if (!draft) return;
    const { data, error } = await supabase
      .from("messages")
      .update({ content: draft })
      .eq("id", messageId)
      .eq("club_id", clubId)
      .eq("sender_id", user.id)
      .select("id, content, sender_id, team_id, is_trainers_channel, created_at, attachments")
      .single();
    if (error) {
      const description = error.message.includes("15 minutes")
        ? t.communicationPage.messageEditExpired
        : error.message;
      toast({ title: t.common.error, description, variant: "destructive" });
      return;
    }
    const updated = data as MessageBase;
    setMessages((previous) =>
      previous.map((row) =>
        row.id === messageId
          ? {
              ...row,
              content: updated.content,
              attachments: toAttachmentList(updated.attachments),
            }
          : row,
      ),
    );
    setEditingMessageId(null);
    setEditingMessageDraft("");
    toast({ title: t.communicationPage.messageUpdated });
  };

  useEffect(() => {
    if (!editAnnouncementId) return;
    const announcement = announcements.find((row) => row.id === editAnnouncementId);
    if (!announcement) return;
    setSelectedChannelId("announcements");
    setViewingAnnouncementId(null);
    openEditAnnouncement(announcement);
  }, [announcements, editAnnouncementId]);

  const openBridgeSettings = (provider: BridgeProvider) => {
    const existing = connectors.find((connector) => connector.provider === provider);
    const config = (existing?.config || {}) as Record<string, unknown>;
    setBridgeForm({
      provider,
      displayName: existing?.display_name || `${provider} bridge`,
      externalChannelId: existing?.external_channel_id || "",
      status: existing?.status || "pending",
      teamId: typeof config.team_id === "string" ? config.team_id : "",
      telegramBotToken: typeof config.bot_token === "string" ? config.bot_token : "",
      whatsappApiBaseUrl: typeof config.api_base_url === "string" ? config.api_base_url : "",
      whatsappAccessToken: typeof config.access_token === "string" ? config.access_token : "",
      whatsappFromNumber: typeof config.from_number === "string" ? config.from_number : "",
      webhookSecret: existing?.webhook_secret || "",
    });
    setShowBridgeSettings(true);
  };

  const saveBridgeSettings = async () => {
    if (!bridgeForm || !clubId) return;
    const config: Record<string, unknown> = {};
    if (bridgeForm.teamId.trim()) config.team_id = bridgeForm.teamId.trim();
    if (bridgeForm.provider === "telegram") {
      if (bridgeForm.telegramBotToken.trim()) config.bot_token = bridgeForm.telegramBotToken.trim();
    } else {
      if (bridgeForm.whatsappApiBaseUrl.trim()) config.api_base_url = bridgeForm.whatsappApiBaseUrl.trim();
      if (bridgeForm.whatsappAccessToken.trim()) config.access_token = bridgeForm.whatsappAccessToken.trim();
      if (bridgeForm.whatsappFromNumber.trim()) config.from_number = bridgeForm.whatsappFromNumber.trim();
    }

    setBridgeBusy(true);
    const { data, error } = await supabase.functions.invoke("chat-bridge", {
      headers: correlationHeaders(),
      body: {
        action: "connector.upsert",
        clubId,
        provider: bridgeForm.provider,
        externalChannelId: bridgeForm.externalChannelId.trim(),
        displayName: bridgeForm.displayName.trim(),
        status: bridgeForm.status,
        webhookSecret: bridgeForm.webhookSecret || undefined,
        config,
      },
    });
    setBridgeBusy(false);

    if (error) {
      toast({ title: t.communicationPage.bridgeSetupFailed, description: error.message, variant: "destructive" });
      return;
    }

    const webhook = (data as { webhook?: { url?: string; secretValue?: string } } | null)?.webhook;
    if (webhook?.url && webhook?.secretValue) {
      try {
        await navigator.clipboard.writeText(
          `Webhook URL: ${webhook.url}\nHeader: x-bridge-secret\nSecret: ${webhook.secretValue}`
        );
      } catch {
        // ignore clipboard failures
      }
    }

    toast({
      title: t.communicationPage.connectorSaved.replace("{provider}", providerLabel(bridgeForm.provider)),
      description: webhook?.url
        ? t.communicationPage.webhookDetailsCopied
        : t.communicationPage.connectorSavedSuccessfully,
    });
    setShowBridgeSettings(false);
    setBridgeForm(null);
    await loadBridgeData();
  };

  const canPostAnnouncements = canManageAnnouncements(isClubAdmin) && !missingAnnouncementsTable;

  const announceButton =
    !embedded && selectedChannel.kind === "announcements" && canPostAnnouncements ? (
      <DashboardToolbarActions
        maxVisibleMobile={1}
        actions={[
          {
            id: "announce",
            label: t.communicationPage.announce,
            icon: Plus,
            variant: "gold",
            onClick: () => {
              resetAnnouncementForm();
              setShowAddAnnouncement(true);
            },
          },
        ]}
      />
    ) : null;

  const announcementComposeBar = canPostAnnouncements && selectedChannel.kind === "announcements" ? (
    <div
      className={cn(
        "shrink-0 border-t p-3",
        embedded ? "border-neutral-200/80 bg-white" : "border-border/70 bg-background/80 backdrop-blur-xl max-lg:px-3 max-lg:py-3",
      )}
    >
      <button
        type="button"
        onClick={() => {
          resetAnnouncementForm();
          setShowAddAnnouncement(true);
        }}
        className={cn(
          "flex w-full items-center gap-2 rounded-full border px-4 py-2.5 text-left text-sm transition-colors",
          embedded
            ? cn(clubGlassInputClass, "text-neutral-600 hover:border-[color:var(--club-primary)]/40 hover:bg-neutral-50")
            : "border-border bg-card text-muted-foreground hover:bg-muted/40 hover:text-foreground",
        )}
      >
        <span
          className={cn(
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
            embedded ? "bg-[color:var(--club-primary)] text-white" : "bg-gradient-gold-static text-primary-foreground",
          )}
        >
          <Plus className="h-4 w-4" />
        </span>
        <span className="truncate">{t.communicationPage.announcementsComposePlaceholder}</span>
      </button>
    </div>
  ) : null;

  return (
    <div
      className={embedded ? "flex h-full min-h-0 flex-col" : cn(DASHBOARD_PAGE_ROOT, "flex min-h-0 flex-col")}
      data-dashboard-messages-shell={embedded ? undefined : true}
    >
      {!embedded ? (
        <DashboardHeaderSlot
          title={t.communicationPage.title}
          subtitle={compactMobileChrome ? undefined : t.communicationPage.subtitle}
          toolbarRevision={`${selectedChannel.kind}-${perms.isAdmin}-${missingAnnouncementsTable}`}
          rightSlot={announceButton}
        />
      ) : null}

      <div
        className={
          embedded
            ? "flex flex-1 flex-col min-h-0"
            : `${DASHBOARD_PAGE_INNER} flex min-h-0 flex-1 flex-col max-lg:py-3`
        }
      >
        {(clubLoading || loading) ? (
          <div className="flex justify-center py-20">
            <Loader2
              className={cn(
                "w-6 h-6 animate-spin",
                embedded ? "text-[color:var(--club-primary)]" : "text-primary",
              )}
            />
          </div>
        ) : !clubId ? (
          <div
            className={cn(
              "text-center py-20",
              embedded ? "text-neutral-600" : "text-muted-foreground",
            )}
          >
            {t.communicationPage.noClubFound}
          </div>
        ) : (
          <>
            {baseDataLoadError ? (
              <Alert variant="destructive" className="mb-4 max-lg:mb-2">
                <AlertTitle>{t.common.error}</AlertTitle>
                <AlertDescription className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <span className="text-sm">{baseDataLoadError}</span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="shrink-0"
                    onClick={() => void loadBaseData()}
                  >
                    <RotateCcw className="w-4 h-4 mr-1" />
                    {t.common.refresh}
                  </Button>
                </AlertDescription>
              </Alert>
            ) : null}
            <div
              className={
                embedded
                  ? "flex h-full min-h-0 flex-1 flex-col gap-2 sm:grid sm:grid-cols-[minmax(0,200px)_minmax(0,1fr)] sm:gap-3 lg:grid-cols-[220px_minmax(0,1fr)]"
                  : "flex min-h-0 flex-1 flex-col lg:grid lg:h-[calc(100vh-180px)] lg:grid-cols-[280px_minmax(0,1fr)] lg:gap-4"
              }
            >
            <aside
              className={
                embedded
                  ? "hidden min-h-0 overflow-y-auto rounded-2xl border border-neutral-200/80 bg-neutral-50/80 p-2 sm:block sm:p-3"
                  : "hidden min-h-0 overflow-y-auto rounded-2xl border border-border/70 bg-card/50 p-3 backdrop-blur-xl lg:block"
              }
            >
              <div
                className={cn(
                  "text-xs font-semibold px-2 mb-2",
                  embedded ? "text-neutral-500" : "text-muted-foreground",
                )}
              >
                {t.communicationPage.channels}
              </div>
              <div className="space-y-1">
                {channels.map((channel) => (
                  <button
                    key={channel.id}
                    onClick={() => setSelectedChannelId(channel.id)}
                    className={cn(
                      "w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-colors",
                      selectedChannel.id === channel.id
                        ? embedded
                          ? "border border-[color:var(--club-primary)]/30 bg-[color:var(--club-primary)]/10 font-medium text-[color:var(--club-primary)]"
                          : "bg-primary/12 text-primary border border-primary/20"
                        : embedded
                          ? "text-neutral-600 hover:bg-neutral-100/90"
                          : "hover:bg-muted/40 text-muted-foreground",
                    )}
                  >
                    {channel.kind === "announcements" ? (
                      <Megaphone className="w-4 h-4 shrink-0" />
                    ) : channel.isTrainersChannel ? (
                      <Users className="w-4 h-4 shrink-0" />
                    ) : (
                      <Hash className="w-4 h-4 shrink-0" />
                    )}
                    <span className="truncate">{channel.label}</span>
                  </button>
                ))}
              </div>

              {!embedded ? (
                <div className="mt-4 rounded-xl border border-border/70 bg-background/50 p-3">
                  <div className="text-xs font-semibold text-foreground mb-1 flex items-center gap-1.5">
                    <BotMessageSquare className="w-3.5 h-3.5 text-primary" /> {t.communicationPage.externalBridgeBeta}
                  </div>
                  <div className={`${DASHBOARD_TYPE_MICRO} mb-2`}>
                    {t.communicationPage.connectSelectedChannels}
                  </div>
                  <div className="flex gap-2 mb-2">
                    <Button size="sm" variant="outline" className={`h-8 ${DASHBOARD_TYPE_CAPTION}`} onClick={() => openBridgeSettings("whatsapp")}>
                      {t.communicationPage.whatsApp}
                    </Button>
                    <Button size="sm" variant="outline" className={`h-8 ${DASHBOARD_TYPE_CAPTION}`} onClick={() => openBridgeSettings("telegram")}>
                      {t.communicationPage.telegram}
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {providerHealth.length === 0 ? (
                      <div className={DASHBOARD_TYPE_MICRO}>{t.communicationPage.noConnectorsConfigured}</div>
                    ) : (
                      providerHealth.map(({ connector, processed, failed }) => (
                        <div key={connector.id} className="rounded-lg border border-border/60 px-2 py-1.5">
                          <div className="flex items-center justify-between">
                            <div className={`${DASHBOARD_TYPE_CAPTION} font-medium`}>{providerLabel(connector.provider)}</div>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${connectorStatusColor[connector.status]}`}>
                              {connectorStatusLabel(connector.status)}
                            </span>
                          </div>
                          <div className="text-[10px] text-muted-foreground mt-1">
                            {t.communicationPage.processedCount.replace("{count}", String(processed))} · {t.communicationPage.failedCount.replace("{count}", String(failed))}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ) : null}
            </aside>

            <section
              className={
                embedded
                  ? "flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-neutral-200/80 bg-white/95 sm:min-h-0"
                  : "flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-border/70 bg-card/50 backdrop-blur-xl"
              }
            >
              <div
                className={cn(
                  "shrink-0 border-b",
                  embedded
                    ? "flex flex-col gap-2 px-3 py-2 sm:flex-row sm:items-center sm:justify-between sm:px-4 sm:py-3"
                    : "flex flex-col gap-2 px-3 py-2 lg:flex-row lg:items-center lg:justify-between lg:px-4 lg:py-3",
                  embedded ? "border-neutral-200/80" : "border-border/70",
                )}
              >
                <div
                  className={cn(
                    "flex min-w-0 items-center gap-2",
                    embedded ? "hidden sm:flex" : "hidden lg:flex",
                  )}
                >
                  {selectedChannel.kind === "announcements" ? (
                    <Megaphone className={cn("h-4 w-4 shrink-0", embedded ? "text-[color:var(--club-primary)]" : "text-primary")} />
                  ) : selectedChannel.isTrainersChannel ? (
                    <Users className={cn("h-4 w-4 shrink-0", embedded ? "text-[color:var(--club-primary)]" : "text-primary")} />
                  ) : (
                    <MessageSquare className={cn("h-4 w-4 shrink-0", embedded ? "text-[color:var(--club-primary)]" : "text-primary")} />
                  )}
                  <div className={cn("min-w-0 truncate font-medium", embedded ? "text-neutral-900" : "text-foreground")}>
                    {selectedChannel.kind === "announcements"
                      ? t.communicationPage.clubAnnouncements
                      : selectedChannel.isTrainersChannel
                        ? `# ${selectedChannel.label}`
                        : `# ${selectedChannel.label}`}
                  </div>
                </div>
                <Select value={selectedChannelId} onValueChange={setSelectedChannelId}>
                  <SelectTrigger
                    aria-label={t.communicationPage.channels}
                    className={cn(
                      "h-10 w-full text-sm",
                      embedded
                        ? "rounded-xl border-neutral-200/80 bg-neutral-50 text-neutral-900 sm:hidden"
                        : "rounded-xl border-border/70 bg-background/70 lg:hidden",
                    )}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {channels.map((channel) => (
                      <SelectItem key={channel.id} value={channel.id}>
                        {channel.kind === "announcements" ? channel.label : `# ${channel.label}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedChannel.kind === "chat" && !embedded ? (
                  <div className={cn(DASHBOARD_TYPE_MICRO, "hidden lg:block")}>{t.communicationPage.chatManagementPlatform}</div>
                ) : null}
                {selectedChannel.kind === "announcements" && canPostAnnouncements ? (
                  <div className="shrink-0 self-end sm:self-auto">{announceButton}</div>
                ) : null}
              </div>

              {selectedChannel.kind === "announcements" ? (
                <>
                {viewingAnnouncement ? (
                  <AnnouncementDetailView
                    announcement={viewingAnnouncement}
                    embedded={embedded}
                    onBack={() => setViewingAnnouncementId(null)}
                    labels={{
                      back: t.common.back,
                      publicSiteBadge: t.communicationPage.publicSiteBadge,
                      edit: t.communicationPage.editAnnouncement,
                      delete: t.communicationPage.deleteAnnouncement,
                    }}
                    priorityClassName={
                      (embedded ? embeddedPriorityColors : priorityColors)[viewingAnnouncement.priority] ||
                      (embedded ? embeddedPriorityColors.normal : priorityColors.normal)
                    }
                    canManage={canPostAnnouncements}
                    onEdit={
                      canPostAnnouncements
                        ? () => {
                            openEditAnnouncement(viewingAnnouncement);
                            setViewingAnnouncementId(null);
                          }
                        : undefined
                    }
                    onDelete={
                      canPostAnnouncements
                        ? () => void handleDeleteAnnouncement(viewingAnnouncement.id)
                        : undefined
                    }
                  />
                ) : (
                <div
                  className={cn(
                    "min-h-0 flex-1 overflow-y-auto p-4 space-y-3",
                    embedded ? "bg-neutral-50/80" : undefined,
                  )}
                >
                  {missingAnnouncementsTable ? (
                    <div
                      className={cn(
                        "rounded-2xl border p-8 text-center text-sm",
                        embedded
                          ? "border-neutral-200/90 bg-white text-neutral-600"
                          : "rounded-xl bg-background/50 border-border text-muted-foreground",
                      )}
                    >
                      {t.communicationPage.announcementsDatabaseNotReady}
                    </div>
                  ) : visibleAnnouncements.length === 0 ? (
                    <div
                      className={cn(
                        "flex min-h-[220px] flex-col items-center justify-center rounded-2xl border px-6 py-14 text-center",
                        embedded
                          ? "border-dashed border-neutral-200 bg-white shadow-sm"
                          : "border-border/70 bg-card shadow-sm",
                      )}
                    >
                      <span
                        className={cn(
                          "mb-3 flex h-12 w-12 items-center justify-center rounded-2xl",
                          embedded
                            ? "bg-[color:var(--club-primary)]/10 text-[color:var(--club-primary)]"
                            : "bg-primary/10 text-primary",
                        )}
                      >
                        <Megaphone className="h-6 w-6" aria-hidden />
                      </span>
                      <p
                        className={cn(
                          "text-sm font-medium",
                          embedded ? "text-neutral-900" : "text-foreground",
                        )}
                      >
                        {t.communicationPage.noAnnouncementsYet}
                      </p>
                      {canPostAnnouncements ? (
                        <>
                          <p
                            className={cn(
                              "mt-1 max-w-sm text-xs leading-relaxed",
                              embedded ? "text-neutral-500" : "text-muted-foreground",
                            )}
                          >
                            {t.communicationPage.announcementsAdminEmptyHint}
                          </p>
                          <Button
                            type="button"
                            size="sm"
                            className={cn(
                              "mt-4 hover:brightness-110",
                              embedded
                                ? "bg-[color:var(--club-primary)] text-white"
                                : "bg-gradient-gold-static text-primary-foreground",
                            )}
                            onClick={() => {
                              resetAnnouncementForm();
                              setShowAddAnnouncement(true);
                            }}
                          >
                            <Plus className="mr-1 h-4 w-4" />
                            {t.communicationPage.announcementsCreateCta}
                          </Button>
                        </>
                      ) : (
                        <p
                          className={cn(
                            "mt-2 max-w-sm text-xs leading-relaxed",
                            embedded ? "text-neutral-500" : "text-muted-foreground",
                          )}
                        >
                          {t.communicationPage.announcementsMembersHint}
                        </p>
                      )}
                    </div>
                  ) : (
                    visibleAnnouncements.map((announcement, index) => (
                      <motion.button
                        key={announcement.id}
                        type="button"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.04 }}
                        onClick={() => setViewingAnnouncementId(announcement.id)}
                        className={cn(
                          "w-full rounded-2xl border p-5 text-left transition-[border-color,box-shadow] duration-200",
                          embedded
                            ? "border-neutral-200/90 border-l-4 border-l-[color:var(--club-primary)] bg-white shadow-sm hover:border-neutral-300 hover:shadow-md"
                            : "rounded-xl bg-card/80 border-border/70 hover:border-border",
                        )}
                      >
                        <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
                          <h3
                            className={cn(
                              "min-w-0 flex-1 font-display font-semibold",
                              embedded ? "text-neutral-900" : "text-foreground",
                            )}
                          >
                            {announcement.title}
                          </h3>
                          <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
                            {announcement.publish_to_public_website ? (
                              <span
                                className={cn(
                                  "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium",
                                  embedded
                                    ? "bg-[color:var(--club-primary)]/10 text-[color:var(--club-primary)]"
                                    : "bg-emerald-500/15 text-emerald-800 dark:text-emerald-200",
                                )}
                              >
                                <Globe className="h-3 w-3" />
                                {t.communicationPage.publicSiteBadge}
                              </span>
                            ) : null}
                            <span
                              className={cn(
                                "rounded-full px-2 py-0.5 text-[10px] font-medium capitalize",
                                (embedded ? embeddedPriorityColors : priorityColors)[announcement.priority] ||
                                  (embedded ? embeddedPriorityColors.normal : priorityColors.normal),
                              )}
                            >
                              {announcement.priority}
                            </span>
                          </div>
                        </div>
                        <p
                          className={cn(
                            "mb-2 text-sm leading-relaxed whitespace-pre-wrap",
                            embedded ? "text-neutral-700" : "text-muted-foreground",
                            announcement.excerpt?.trim() ? "line-clamp-2" : "line-clamp-4",
                          )}
                        >
                          {announcement.excerpt?.trim() || announcement.content}
                        </p>
                        {announcement.excerpt?.trim() ? (
                          <p
                            className={cn(
                              "mb-2 text-xs font-medium",
                              embedded ? "text-[color:var(--club-primary)]" : "text-primary",
                            )}
                          >
                            {t.communicationPage.announcementTapToRead}
                          </p>
                        ) : null}
                        <p className={cn("text-xs", embedded ? "text-neutral-500" : "text-muted-foreground")}>
                          {new Date(announcement.created_at).toLocaleString()}
                        </p>
                      </motion.button>
                    ))
                  )}
                </div>
                )}
                {announcementComposeBar}
                </>
              ) : (
                <>
                  <div
                    className={cn(
                      "shrink-0 border-b",
                      embedded
                        ? "border-neutral-200/80 px-3 py-2 sm:px-4 sm:pt-3 sm:pb-3"
                        : "border-border/70 px-3 py-2 max-lg:py-2 lg:px-4 lg:pt-3 lg:pb-3",
                    )}
                  >
                    <div
                      className={cn(
                        "flex items-center gap-2 rounded-xl px-3",
                        embedded
                          ? cn(clubEmbeddedLightInputShellClass, "py-1.5 sm:py-2")
                          : "border border-border bg-background/70 py-1.5 max-lg:py-1.5",
                      )}
                    >
                      <Search className={cn("h-4 w-4 shrink-0", embedded ? "text-neutral-500" : "text-muted-foreground")} />
                      <Input
                        value={messageSearch}
                        onChange={(event) => setMessageSearch(event.target.value)}
                        placeholder={t.communicationPage.searchMessagesPlaceholder}
                        className={cn(
                          "h-8 border-0 bg-transparent shadow-none focus-visible:ring-0 sm:h-9",
                          embedded && clubEmbeddedLightInputFieldClass,
                        )}
                      />
                    </div>
                    {messageTotalPages > 1 || !embedded ? (
                      <div
                        className={cn(
                          "mt-2 flex items-center justify-between gap-2 max-lg:mt-1.5",
                          embedded && messageTotalPages <= 1 && "sm:mt-2",
                        )}
                      >
                        <div
                          className={cn(
                            `min-w-0 truncate ${DASHBOARD_TYPE_MICRO}`,
                            embedded ? "text-neutral-500" : "text-muted-foreground",
                            !embedded && "hidden lg:block",
                          )}
                        >
                          {messagePaginationLabel}
                        </div>
                        {messageTotalPages > 1 ? (
                          <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-2">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="h-7 px-2 text-xs"
                              disabled={messagePage <= 1}
                              onClick={() => setMessagePage((current) => Math.max(1, current - 1))}
                            >
                              {t.communicationPage.paginationPrevious}
                            </Button>
                            <span className={DASHBOARD_TYPE_MICRO}>
                              {messagePage}/{messageTotalPages}
                            </span>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="h-7 px-2 text-xs"
                              disabled={messagePage >= messageTotalPages}
                              onClick={() => setMessagePage((current) => Math.min(messageTotalPages, current + 1))}
                            >
                              {t.communicationPage.paginationNext}
                            </Button>
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                  <div
                    className={cn(
                      "min-h-0 flex-1 overflow-y-auto p-3 space-y-2 sm:p-4",
                      embedded
                        ? "bg-neutral-50/80"
                        : "bg-[radial-gradient(circle_at_10%_20%,hsl(var(--primary)/0.08),transparent_35%),radial-gradient(circle_at_90%_80%,hsl(var(--accent)/0.08),transparent_35%)]",
                    )}
                  >
                    {loadingMessages ? (
                      <div className="flex justify-center py-8">
                        <Loader2 className="w-5 h-5 animate-spin text-primary" />
                      </div>
                    ) : missingMessagesTable ? (
                      <div className="text-center py-12 text-muted-foreground text-sm">
                        {t.communicationPage.chatDatabaseNotReady}
                      </div>
                    ) : filteredMessages.length === 0 ? (
                      <div className="text-center py-12 text-muted-foreground text-sm">
                        {messageSearch ? t.communicationPage.noMatchingMessages : t.communicationPage.noMessagesYet}
                      </div>
                    ) : (
                      filteredMessages.map((message, index) => {
                        const previous = filteredMessages[index - 1];
                        const showDateSeparator = !previous || !isSameDay(previous.created_at, message.created_at);
                        const isMe = message.sender_id === user?.id;
                        const isLocalMessage = message.id.startsWith("local-");
                        const canEditOwnMessage =
                          isMe &&
                          !isLocalMessage &&
                          message.send_state !== "sending" &&
                          message.send_state !== "failed" &&
                          canEditMessage(message, user?.id);
                        const canDeleteOwnMessage =
                          isMe &&
                          !isLocalMessage &&
                          message.send_state !== "sending" &&
                          canDeleteMessage(message, user?.id);
                        return (
                          <div key={message.id}>
                            {showDateSeparator ? (
                              <div className="flex justify-center py-2">
                                <span
                                  className={cn(
                                    "text-[10px] px-2 py-1 rounded-full border",
                                    embedded
                                      ? "border-neutral-200 bg-white text-neutral-500"
                                      : "bg-background/80 border-border text-muted-foreground",
                                  )}
                                >
                                  {new Date(message.created_at).toLocaleDateString()}
                                </span>
                              </div>
                            ) : null}
                            <div className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                              <div
                                className={cn(
                                  "max-w-[78%] px-3.5 py-2.5 rounded-2xl text-sm shadow-sm",
                                  isMe
                                    ? embedded
                                      ? "rounded-br-md bg-[color:var(--club-primary)] text-white"
                                      : "bg-emerald-500/85 text-emerald-950 rounded-br-md"
                                    : embedded
                                      ? "rounded-bl-md border border-neutral-200 bg-white text-neutral-900"
                                      : "bg-background/90 border border-border text-foreground rounded-bl-md",
                                )}
                              >
                                {!isMe ? (
                                  <div
                                    className={cn(
                                      "text-[10px] font-medium mb-1",
                                      embedded ? "text-[color:var(--club-primary)]" : "text-primary",
                                    )}
                                  >
                                    {message.profiles?.display_name || t.common.unknown}
                                  </div>
                                ) : null}
                                {editingMessageId === message.id ? (
                                  <div className="space-y-2">
                                    <textarea
                                      value={editingMessageDraft}
                                      onChange={(event) => setEditingMessageDraft(event.target.value)}
                                      className={cn(
                                        "min-h-[72px] w-full resize-none rounded-lg border px-2.5 py-2 text-sm focus-visible:outline-none focus-visible:ring-2",
                                        isMe
                                          ? embedded
                                            ? "border-white/30 bg-white/10 text-white placeholder:text-white/60 focus-visible:ring-white/40"
                                            : "border-emerald-900/20 bg-white/80 text-emerald-950 focus-visible:ring-emerald-700/30"
                                          : embedded
                                            ? cn(clubGlassInputClass, "focus-visible:ring-[color:var(--club-primary)]")
                                            : "border-border bg-background focus-visible:ring-ring",
                                      )}
                                      rows={3}
                                    />
                                    <div className="flex flex-wrap gap-2">
                                      <Button
                                        type="button"
                                        size="sm"
                                        className={cn(
                                          "h-7 px-2 text-xs",
                                          isMe && embedded && "bg-white text-[color:var(--club-primary)] hover:bg-white/90",
                                        )}
                                        onClick={() => void handleSaveMessageEdit(message.id)}
                                      >
                                        {t.communicationPage.saveMessage}
                                      </Button>
                                      <Button
                                        type="button"
                                        size="sm"
                                        variant="ghost"
                                        className={cn(
                                          "h-7 px-2 text-xs",
                                          isMe && embedded && "text-white hover:bg-white/10 hover:text-white",
                                        )}
                                        onClick={() => {
                                          setEditingMessageId(null);
                                          setEditingMessageDraft("");
                                        }}
                                      >
                                        {t.communicationPage.cancelEdit}
                                      </Button>
                                    </div>
                                  </div>
                                ) : (
                                  <p className="leading-relaxed whitespace-pre-wrap">{message.content}</p>
                                )}
                                {message.attachments.length ? (
                                  <div className="mt-2 space-y-1">
                                    {message.attachments.map((attachment) => (
                                      <a
                                        key={`${message.id}-${attachment.path}`}
                                        href={attachment.signed_url || "#"}
                                        target="_blank"
                                        rel="noreferrer"
                                        className={`block ${DASHBOARD_TYPE_MICRO} underline decoration-dotted hover:opacity-80`}
                                      >
                                        {attachment.file_name}
                                      </a>
                                    ))}
                                  </div>
                                ) : null}
                                <div
                                  className={cn(
                                    "text-[10px] mt-1 flex items-center gap-1.5",
                                    isMe
                                      ? embedded
                                        ? "text-white/80"
                                        : "text-emerald-900/70"
                                      : embedded
                                        ? "text-neutral-500"
                                        : "text-muted-foreground",
                                  )}
                                >
                                  <span>
                                    {new Date(message.created_at).toLocaleTimeString([], {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })}
                                  </span>
                                  {message.send_state === "sending" ? <span>{t.communicationPage.sending}</span> : null}
                                  {message.send_state === "failed" ? (
                                    <>
                                      <span>{t.communicationPage.failed}</span>
                                      <button
                                        type="button"
                                        className="inline-flex items-center gap-1 text-accent hover:underline"
                                        onClick={() => void retryMessage(message)}
                                      >
                                        <RotateCcw className="w-3 h-3" /> {t.communicationPage.retry}
                                      </button>
                                    </>
                                  ) : null}
                                  {canEditOwnMessage && editingMessageId !== message.id ? (
                                    <button
                                      type="button"
                                      className={cn(
                                        "inline-flex items-center gap-1 hover:underline",
                                        isMe && embedded ? "text-white/90" : "text-primary",
                                      )}
                                      onClick={() => {
                                        setEditingMessageId(message.id);
                                        setEditingMessageDraft(message.content);
                                      }}
                                    >
                                      <Pencil className="h-3 w-3" />
                                      {t.communicationPage.editMessage}
                                    </button>
                                  ) : null}
                                  {message.send_state !== "sending" && message.content.trim() ? (
                                    <MessageForwardButton
                                      content={message.content}
                                      clubName={clubNameOverride ?? clubName}
                                      senderName={message.profiles?.display_name}
                                      channelLabel={selectedChannel.label}
                                      menuAlign={isMe ? "end" : "start"}
                                      className={cn(
                                        isMe && embedded ? "text-white/90" : "text-primary",
                                      )}
                                    />
                                  ) : null}
                                  {canDeleteOwnMessage ? (
                                    <button
                                      type="button"
                                      className={cn(
                                        "inline-flex items-center gap-1 hover:underline",
                                        isMe && embedded ? "text-white/90" : "text-destructive",
                                      )}
                                      onClick={() => void handleDeleteMessage(message.id)}
                                    >
                                      <Trash2 className="h-3 w-3" />
                                      {t.communicationPage.deleteMessage}
                                    </button>
                                  ) : null}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  <div
                    className={cn(
                      "shrink-0 border-t p-2.5 sm:p-3",
                      embedded
                        ? "border-neutral-200/80 bg-white"
                        : "border-border/70 bg-background/80 backdrop-blur-xl max-lg:px-3 max-lg:py-3",
                    )}
                  >
                    {selectedFiles.length ? (
                      <div className="mb-2 flex flex-wrap gap-1.5">
                        {selectedFiles.map((file, index) => (
                          <div key={`${file.name}-${index}`} className="text-[10px] px-2 py-1 rounded-full border border-border bg-background/70 flex items-center gap-1">
                            <span className="truncate max-w-[140px]">{file.name}</span>
                            <button
                              type="button"
                              className="text-muted-foreground hover:text-foreground"
                              onClick={() =>
                                setSelectedFiles((previous) => previous.filter((_, i) => i !== index))
                              }
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : null}
                    <div
                      className={cn(
                        "flex items-center gap-2 rounded-2xl px-3 py-2 max-lg:min-h-[52px] max-lg:py-2.5",
                        embedded
                          ? clubEmbeddedLightInputShellClass
                          : "border-2 border-primary/45 bg-primary/[0.08] shadow-[0_0_0_1px_hsl(var(--primary)/0.2)] ring-1 ring-primary/10",
                      )}
                    >
                      <label
                        className={cn(
                          "inline-flex min-h-[44px] min-w-[44px] items-center justify-center",
                          embedded ? "cursor-pointer text-neutral-500 hover:text-neutral-800" : "cursor-pointer text-muted-foreground hover:text-foreground",
                        )}
                      >
                        <input
                          type="file"
                          multiple
                          className="hidden"
                          onChange={(event) => {
                            const files = event.target.files ? Array.from(event.target.files) : [];
                            setSelectedFiles((previous) => [...previous, ...files].slice(0, 5));
                            event.currentTarget.value = "";
                          }}
                        />
                        <Paperclip className="w-4 h-4" />
                      </label>
                      <Input
                        placeholder={t.communicationPage.messageInChannel.replace("{channel}", selectedChannel.label)}
                        value={newMessage}
                        onChange={(event) => setNewMessage(event.target.value)}
                        onKeyDown={(event) => event.key === "Enter" && void handleSendMessage()}
                        className={cn(
                          "h-10 border-0 bg-transparent shadow-none focus-visible:ring-0 max-lg:text-[15px]",
                          embedded && clubEmbeddedLightInputFieldClass,
                          !embedded && "text-foreground placeholder:text-muted-foreground",
                        )}
                        maxLength={1000}
                      />
                      <Button
                        size="icon"
                        onClick={() => void handleSendMessage()}
                        disabled={!newMessage.trim() && selectedFiles.length === 0}
                        className={cn(
                          "h-10 w-10 shrink-0 rounded-xl text-primary-foreground hover:brightness-110 max-lg:h-11 max-lg:w-11",
                          embedded ? "bg-[color:var(--club-primary)]" : "bg-gradient-gold-static",
                        )}
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </section>
          </div>
          </>
        )}
      </div>

      {showBridgeSettings && bridgeForm ? (
        <div
          className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setShowBridgeSettings(false)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-lg rounded-2xl bg-card border border-border p-6"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-bold text-foreground capitalize">{t.communicationPage.connectorTitle.replace("{provider}", providerLabel(bridgeForm.provider))}</h3>
              <Button variant="ghost" size="icon" onClick={() => setShowBridgeSettings(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="space-y-3">
              <Input
                placeholder={t.communicationPage.displayName}
                value={bridgeForm.displayName}
                onChange={(event) => setBridgeForm((previous) => (previous ? { ...previous, displayName: event.target.value } : previous))}
              />
              <Input
                placeholder={t.communicationPage.externalChannelId}
                value={bridgeForm.externalChannelId}
                onChange={(event) => setBridgeForm((previous) => (previous ? { ...previous, externalChannelId: event.target.value } : previous))}
              />
              <Input
                placeholder={t.communicationPage.optionalTeamId}
                value={bridgeForm.teamId}
                onChange={(event) => setBridgeForm((previous) => (previous ? { ...previous, teamId: event.target.value } : previous))}
              />
              <Select
                value={bridgeForm.status}
                onValueChange={(value) =>
                  setBridgeForm((previous) =>
                    previous ? { ...previous, status: value as BridgeForm["status"] } : previous
                  )
                }
              >
                <SelectTrigger className="w-full h-10 rounded-xl border-border bg-background px-3 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">{t.communicationPage.pending}</SelectItem>
                  <SelectItem value="connected">{t.communicationPage.connected}</SelectItem>
                  <SelectItem value="error">{t.common.error}</SelectItem>
                  <SelectItem value="disabled">{t.communicationPage.disabled}</SelectItem>
                </SelectContent>
              </Select>

              {bridgeForm.provider === "telegram" ? (
                <Input
                  placeholder={t.communicationPage.telegramBotToken}
                  value={bridgeForm.telegramBotToken}
                  onChange={(event) => setBridgeForm((previous) => (previous ? { ...previous, telegramBotToken: event.target.value } : previous))}
                />
              ) : (
                <>
                  <Input
                    placeholder={t.communicationPage.whatsappApiBaseUrl}
                    value={bridgeForm.whatsappApiBaseUrl}
                    onChange={(event) => setBridgeForm((previous) => (previous ? { ...previous, whatsappApiBaseUrl: event.target.value } : previous))}
                  />
                  <Input
                    placeholder={t.communicationPage.whatsappAccessToken}
                    value={bridgeForm.whatsappAccessToken}
                    onChange={(event) => setBridgeForm((previous) => (previous ? { ...previous, whatsappAccessToken: event.target.value } : previous))}
                  />
                  <Input
                    placeholder={t.communicationPage.whatsappFromNumber}
                    value={bridgeForm.whatsappFromNumber}
                    onChange={(event) => setBridgeForm((previous) => (previous ? { ...previous, whatsappFromNumber: event.target.value } : previous))}
                  />
                </>
              )}
              <Input
                placeholder={t.communicationPage.webhookSecretOptional}
                value={bridgeForm.webhookSecret}
                onChange={(event) => setBridgeForm((previous) => (previous ? { ...previous, webhookSecret: event.target.value } : previous))}
              />
              <Button onClick={() => void saveBridgeSettings()} disabled={bridgeBusy} className="w-full bg-gradient-gold-static text-primary-foreground hover:brightness-110">
                {bridgeBusy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                {t.communicationPage.saveConnector}
              </Button>
            </div>
          </motion.div>
        </div>
      ) : null}

      {showAddAnnouncement && isClubAdmin ? (
        <div
          className={cn(
            "fixed inset-0 flex items-center justify-center p-4",
            embedded ? cn("z-[70]", clubAi4tModalOverlayClass) : "z-50 bg-background/80 backdrop-blur-sm",
          )}
          onClick={closeAnnouncementModal}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className={cn(
              "w-full max-w-lg rounded-2xl p-6",
              embedded
                ? clubAi4tModalPanelClass
                : "bg-card border border-border",
            )}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3
                className={cn(
                  "font-display font-bold",
                  embedded ? "text-neutral-900" : "text-foreground",
                )}
              >
                {editingAnnouncementId
                  ? t.communicationPage.editAnnouncement
                  : t.communicationPage.newAnnouncement}
              </h3>
              <Button
                variant="ghost"
                size="icon"
                className={embedded ? "text-neutral-700 hover:bg-neutral-100" : undefined}
                onClick={closeAnnouncementModal}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="space-y-3">
              <Input
                placeholder={t.communicationPage.announcementTitlePlaceholder}
                value={annTitle}
                onChange={(event) => setAnnTitle(event.target.value)}
                className={embedded ? clubGlassInputClass : "bg-background"}
                maxLength={200}
              />
              <div className="space-y-1">
                <textarea
                  placeholder={t.communicationPage.announcementExcerptPlaceholder}
                  value={annExcerpt}
                  onChange={(event) => setAnnExcerpt(event.target.value)}
                  className={cn(
                    "min-h-[52px] w-full resize-none rounded-xl border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2",
                    embedded
                      ? cn(clubGlassInputClass, "focus-visible:ring-[color:var(--club-primary)]")
                      : "border-border bg-background placeholder:text-muted-foreground focus-visible:ring-ring",
                  )}
                  rows={2}
                  maxLength={400}
                />
                <p className={cn("text-[10px]", embedded ? "text-neutral-500" : "text-muted-foreground")}>
                  {t.communicationPage.announcementExcerptHint}
                </p>
              </div>
              <div className="space-y-1">
                <textarea
                  placeholder={t.communicationPage.announcementContentPlaceholder}
                  value={annContent}
                  onChange={(event) => setAnnContent(event.target.value)}
                  className={cn(
                    "w-full resize-none rounded-xl border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2",
                    embedded
                      ? cn(clubGlassInputClass, "focus-visible:ring-[color:var(--club-primary)]")
                      : "border-border bg-background placeholder:text-muted-foreground focus-visible:ring-ring",
                  )}
                  rows={6}
                  maxLength={8000}
                />
                <p className={cn("text-[10px]", embedded ? "text-neutral-500" : "text-muted-foreground")}>
                  {t.communicationPage.announcementContentHint}
                </p>
              </div>
              <Select value={annPriority} onValueChange={setAnnPriority}>
                <SelectTrigger
                  className={cn(
                    "w-full h-10 rounded-xl px-3 text-sm",
                    embedded ? clubGlassInputClass : "border-border bg-background",
                  )}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">{t.communicationPage.lowPriority}</SelectItem>
                  <SelectItem value="normal">{t.communicationPage.normalPriority}</SelectItem>
                  <SelectItem value="high">{t.communicationPage.highPriority}</SelectItem>
                  <SelectItem value="urgent">{t.communicationPage.urgentPriority}</SelectItem>
                </SelectContent>
              </Select>
              <div className="space-y-1">
                <Label className={cn("text-xs", embedded && "text-neutral-800")}>
                  {t.communicationPage.announcementAudience}
                </Label>
                <Select value={annTeamId} onValueChange={setAnnTeamId}>
                  <SelectTrigger
                    className={cn(
                      "w-full h-10 rounded-xl px-3 text-sm",
                      embedded ? clubGlassInputClass : "border-border bg-background",
                    )}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t.communicationPage.announcementAudienceAll}</SelectItem>
                    {teams.map((team) => (
                      <SelectItem key={team.id} value={team.id}>
                        {team.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className={cn("text-[10px]", embedded ? "text-neutral-500" : "text-muted-foreground")}>
                  {t.communicationPage.announcementAudienceHint}
                </p>
              </div>
              <div
                className={cn(
                  "rounded-xl border px-3 py-2",
                  embedded ? "border-neutral-200 bg-neutral-50/80" : "border-border",
                )}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0 space-y-0.5">
                    <Label
                      htmlFor="ann-publish-public"
                      className={cn("text-xs font-medium", embedded && "text-neutral-900")}
                    >
                      {t.communicationPage.publishOnPublicWebsite}
                    </Label>
                    <p className={cn("text-[10px]", embedded ? "text-neutral-500" : "text-muted-foreground")}>
                      {t.communicationPage.publishOnPublicWebsiteHint}
                    </p>
                  </div>
                  <Switch id="ann-publish-public" checked={annPublishPublic} onCheckedChange={setAnnPublishPublic} />
                </div>
              </div>
              {annPublishPublic ? (
                <div className="space-y-2">
                  <Label className={cn("text-xs", embedded && "text-neutral-800")}>
                    {t.communicationPage.publicNewsCategory}
                  </Label>
                  <Select value={annPublicCategory} onValueChange={setAnnPublicCategory}>
                    <SelectTrigger
                      className={cn(
                        "h-10 w-full rounded-xl px-3 text-sm",
                        embedded ? clubGlassInputClass : "border-border bg-background",
                      )}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PUBLIC_NEWS_CATEGORIES.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c === "club"
                            ? t.clubPage.newsCatClub
                            : c === "teams"
                              ? t.clubPage.newsCatTeams
                              : c === "events"
                                ? t.clubPage.newsCatEvents
                                : c === "youth"
                                  ? t.clubPage.newsCatYouth
                                  : c === "seniors"
                                    ? t.clubPage.newsCatSeniors
                                    : t.clubPage.newsCatSponsors}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="space-y-2">
                    <Label className={cn("text-xs", embedded && "text-neutral-800")}>
                      {t.communicationPage.newsImageUrlOptional}
                    </Label>
                    {annImageUrl ? (
                      <div
                        className={cn(
                          "flex items-start gap-3 rounded-xl border p-2",
                          embedded ? "border-neutral-200 bg-white/80" : "border-border bg-muted/30",
                        )}
                      >
                        <img
                          src={annImageUrl}
                          alt={t.communicationPage.newsImagePreviewAlt}
                          className="h-28 w-20 shrink-0 rounded-lg border object-cover object-center"
                        />
                        <div className="min-w-0 flex-1 space-y-2">
                          <p className={cn("truncate text-[10px]", embedded ? "text-neutral-500" : "text-muted-foreground")}>
                            {annImageUrl}
                          </p>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-8"
                            onClick={() => setAnnImageUrl("")}
                          >
                            {t.communicationPage.newsImageRemove}
                          </Button>
                        </div>
                      </div>
                    ) : null}
                    <div className="flex gap-2">
                      <Input
                        placeholder={t.communicationPage.newsImageUrlPlaceholder}
                        value={annImageUrl}
                        onChange={(event) => setAnnImageUrl(event.target.value)}
                        className={cn("min-w-0 flex-1", embedded ? clubGlassInputClass : "bg-background")}
                      />
                      <input
                        ref={annImageFileRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif"
                        className="hidden"
                        onChange={handleAnnPosterUpload}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        disabled={annImageUploading || !clubId}
                        className={cn(
                          "shrink-0 gap-1.5",
                          embedded && "border-neutral-200 bg-white text-neutral-900 hover:bg-neutral-50",
                        )}
                        onClick={() => annImageFileRef.current?.click()}
                      >
                        {annImageUploading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Upload className="h-4 w-4" />
                        )}
                        {annImageUploading
                          ? t.communicationPage.newsImageUploading
                          : t.communicationPage.newsImageUpload}
                      </Button>
                    </div>
                    <p className={cn("text-[10px]", embedded ? "text-neutral-500" : "text-muted-foreground")}>
                      {t.communicationPage.newsImageUrlHint}
                    </p>
                  </div>
                </div>
              ) : null}
              <Button
                onClick={handleSaveAnnouncement}
                disabled={!annTitle.trim() || !annContent.trim()}
                className={cn(
                  "w-full hover:brightness-110",
                  embedded
                    ? "bg-[color:var(--club-primary)] text-white"
                    : "bg-gradient-gold-static text-primary-foreground",
                )}
              >
                {editingAnnouncementId
                  ? t.communicationPage.saveAnnouncement
                  : t.communicationPage.postAnnouncement}
              </Button>
            </div>
          </motion.div>
        </div>
      ) : null}
    </div>
  );
}

export default function Communication() {
  return <CommunicationWorkspace />;
}
