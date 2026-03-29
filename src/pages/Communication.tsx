import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { DashboardHeaderSlot } from "@/components/layout/DashboardHeaderSlot";
import { Plus, Megaphone, Send, Loader2, X, Hash, MessageSquare, BotMessageSquare, Paperclip, RotateCcw, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/useAuth";
import { useClubId } from "@/hooks/use-club-id";
import { supabase } from "@/integrations/supabase/client";
import { supabaseDynamic } from "@/lib/supabase-dynamic";
import { useToast } from "@/hooks/use-toast";
import { usePermissions } from "@/hooks/use-permissions";
import { useLanguage } from "@/hooks/use-language";
import { correlationHeaders } from "@/lib/observability";

type Announcement = {
  id: string;
  title: string;
  content: string;
  priority: string;
  created_at: string;
  author_id: string;
};

type Message = {
  id: string;
  content: string;
  sender_id: string;
  team_id: string | null;
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

const Communication = () => {
  const { user } = useAuth();
  const { clubId, loading: clubLoading } = useClubId();
  const { toast } = useToast();
  const perms = usePermissions();
  const { t } = useLanguage();
  const attachmentPlaceholder = t.communicationPage.attachmentPlaceholder;

  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [pendingMessages, setPendingMessages] = useState<Message[]>([]);
  const [teams, setTeams] = useState<TeamChannel[]>([]);
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
  const [supportsAttachments, setSupportsAttachments] = useState(true);
  const [connectors, setConnectors] = useState<BridgeConnector[]>([]);
  const [connectorEvents, setConnectorEvents] = useState<BridgeEvent[]>([]);
  const [showBridgeSettings, setShowBridgeSettings] = useState(false);
  const [bridgeForm, setBridgeForm] = useState<BridgeForm | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [annTitle, setAnnTitle] = useState("");
  const [annContent, setAnnContent] = useState("");
  const [annPriority, setAnnPriority] = useState("normal");

  /** Keeps realtime handler off `messagePage` dependency (avoids channel churn on pagination). */
  const messagePageRef = useRef(messagePage);
  /** Page N+1 loads rows older than the tuple stored for page N (stable under inserts). */
  const messageKeysetRef = useRef<Record<number, { created_at: string; id: string }>>({});
  useEffect(() => {
    messagePageRef.current = messagePage;
  }, [messagePage]);

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
    () => [
      { id: "announcements", label: t.communicationPage.announcementsChannel, kind: "announcements", teamId: null },
      { id: "club-general", label: t.communicationPage.clubGeneralChannel, kind: "chat", teamId: null },
      ...teams.map((team) => ({
        id: `team-${team.id}`,
        label: team.name,
        kind: "chat" as const,
        teamId: team.id,
      })),
    ],
    [t.communicationPage.announcementsChannel, t.communicationPage.clubGeneralChannel, teams]
  );

  const selectedChannel =
    channels.find((channel) => channel.id === selectedChannelId) ?? channels[0];

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

  useEffect(() => {
    messageKeysetRef.current = {};
    setAnnouncements([]);
    setMessages([]);
    setPendingMessages([]);
    setTeams([]);
    setLoading(true);
    setLoadingMessages(true);
    setMissingMessagesTable(false);
    setMissingAnnouncementsTable(false);
    setSupportsAttachments(true);
    setMessagePage(1);
    setMessageTotalCount(0);
  }, [clubId]);

  useEffect(() => {
    messageKeysetRef.current = {};
    setMessagePage(1);
  }, [selectedChannelId]);

  useEffect(() => {
    if (!clubId) return;
    const fetchBaseData = async () => {
      setLoading(true);
      const [annRes, teamsRes] = await Promise.all([
        supabase
          .from("announcements")
          .select("*")
          .eq("club_id", clubId)
          .order("created_at", { ascending: false }),
        supabase.from("teams").select("id, name").eq("club_id", clubId).order("name"),
      ]);

      if (annRes.error) {
        if (annRes.error.message.includes("Could not find the table 'public.announcements'")) {
          setMissingAnnouncementsTable(true);
          toast({
            title: t.communicationPage.announcementsTableMissingTitle,
            description: t.communicationPage.announcementsTableMissingDesc,
            variant: "destructive",
          });
        } else {
          toast({ title: t.common.error, description: annRes.error.message, variant: "destructive" });
        }
      }
      if (teamsRes.error) {
        toast({ title: t.common.error, description: teamsRes.error.message, variant: "destructive" });
      }

      setAnnouncements((annRes.data as Announcement[]) || []);
      setTeams((teamsRes.data as TeamChannel[]) || []);
      setLoading(false);
    };
    void fetchBaseData();
    void loadBridgeData();
  }, [
    clubId,
    loadBridgeData,
    t.common.error,
    t.communicationPage.announcementsTableMissingDesc,
    t.communicationPage.announcementsTableMissingTitle,
    toast,
  ]);

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

      const runQuery = async (withAttachments: boolean) => {
        let query = supabase
          .from("messages")
          .select(
            withAttachments ? "id, content, sender_id, team_id, created_at, attachments" : "id, content, sender_id, team_id, created_at",
            { count: "exact" },
          )
          .eq("club_id", clubId)
          .order("created_at", { ascending: false })
          .order("id", { ascending: false })
          .limit(MESSAGE_PAGE_SIZE);
        query =
          selectedChannel.teamId === null ? query.is("team_id", null) : query.eq("team_id", selectedChannel.teamId);
        if (messagePage > 1) {
          const before = messageKeysetRef.current[messagePage - 1];
          if (before) query = query.or(messagesKeysetOrFilter(before.created_at, before.id));
        }
        return query;
      };

      let response = await runQuery(true);
      if (response.error?.message.includes("column messages.attachments does not exist")) {
        setSupportsAttachments(false);
        response = await runQuery(false);
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
      setMessages([...hydrated].reverse());
      setMessageTotalCount(response.count ?? 0);
      setPendingMessages([]);
      setLoadingMessages(false);
    };
    void fetchMessages();
  }, [
    clubId,
    hydrateMessages,
    messagePage,
    selectedChannel,
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
        if (ch.kind !== "chat") continue;
        if (ch.teamId === null && incoming.team_id !== null) continue;
        if (ch.teamId !== null && incoming.team_id !== ch.teamId) continue;

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
          console.warn(`[realtime] messages channel ${status} (club ${clubId}) — client will retry on next navigation/remount`);
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
    if (supportsAttachments) {
      payload.attachments = attachments.map((attachment) => ({
        path: attachment.path,
        file_name: attachment.file_name,
        mime_type: attachment.mime_type,
        size: attachment.size,
      }));
    }

    const selectColumns = supportsAttachments
      ? "id, content, sender_id, team_id, created_at, attachments"
      : "id, content, sender_id, team_id, created_at";

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

  const handleAddAnnouncement = async () => {
    if (!perms.isAdmin) {
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
    const { data, error } = await supabase
      .from("announcements")
      .insert({
        club_id: clubId,
        title: annTitle.trim(),
        content: annContent.trim(),
        priority: annPriority,
        author_id: user.id,
      })
      .select()
      .single();
    if (error) {
      toast({ title: t.common.error, description: error.message, variant: "destructive" });
      return;
    }
    setAnnouncements((previous) => [data as Announcement, ...previous]);
    setShowAddAnnouncement(false);
    setAnnTitle("");
    setAnnContent("");
    setAnnPriority("normal");
    toast({ title: t.communicationPage.announcementPosted });
  };

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

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <DashboardHeaderSlot
        title={t.communicationPage.title}
        subtitle={t.communicationPage.subtitle}
        toolbarRevision={`${selectedChannel.kind}-${perms.isAdmin}-${missingAnnouncementsTable}`}
        rightSlot={
          selectedChannel.kind === "announcements" ? (
            <Button
              size="sm"
              className="bg-gradient-gold-static text-primary-foreground hover:brightness-110"
              onClick={() => setShowAddAnnouncement(true)}
              disabled={!perms.isAdmin || missingAnnouncementsTable}
            >
              <Plus className="w-4 h-4 mr-1" /> {t.communicationPage.announce}
            </Button>
          ) : null
        }
      />

      <div className="flex-1 container mx-auto px-4 py-6">
        {(clubLoading || loading) ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : !clubId ? (
          <div className="text-center py-20 text-muted-foreground">{t.communicationPage.noClubFound}</div>
        ) : (
          <div className="grid lg:grid-cols-[280px_minmax(0,1fr)] gap-4 h-[calc(100vh-180px)]">
            <aside className="rounded-2xl border border-border/70 bg-card/50 backdrop-blur-xl p-3 overflow-y-auto">
              <div className="text-xs font-semibold text-muted-foreground px-2 mb-2">{t.communicationPage.channels}</div>
              <div className="space-y-1">
                {channels.map((channel) => (
                  <button
                    key={channel.id}
                    onClick={() => setSelectedChannelId(channel.id)}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-colors ${
                      selectedChannel.id === channel.id
                        ? "bg-primary/12 text-primary border border-primary/20"
                        : "hover:bg-muted/40 text-muted-foreground"
                    }`}
                  >
                    {channel.kind === "announcements" ? (
                      <Megaphone className="w-4 h-4" />
                    ) : (
                      <Hash className="w-4 h-4" />
                    )}
                    <span className="truncate">{channel.label}</span>
                  </button>
                ))}
              </div>

              <div className="mt-4 rounded-xl border border-border/70 bg-background/50 p-3">
                <div className="text-xs font-semibold text-foreground mb-1 flex items-center gap-1.5">
                  <BotMessageSquare className="w-3.5 h-3.5 text-primary" /> {t.communicationPage.externalBridgeBeta}
                </div>
                <div className="text-[11px] text-muted-foreground mb-2">
                  {t.communicationPage.connectSelectedChannels}
                </div>
                <div className="flex gap-2 mb-2">
                  <Button size="sm" variant="outline" className="h-8 text-[11px]" onClick={() => openBridgeSettings("whatsapp")}>
                    {t.communicationPage.whatsApp}
                  </Button>
                  <Button size="sm" variant="outline" className="h-8 text-[11px]" onClick={() => openBridgeSettings("telegram")}>
                    {t.communicationPage.telegram}
                  </Button>
                </div>
                <div className="space-y-2">
                  {providerHealth.length === 0 ? (
                    <div className="text-[11px] text-muted-foreground">{t.communicationPage.noConnectorsConfigured}</div>
                  ) : (
                    providerHealth.map(({ connector, processed, failed }) => (
                      <div key={connector.id} className="rounded-lg border border-border/60 px-2 py-1.5">
                        <div className="flex items-center justify-between">
                          <div className="text-[11px] font-medium">{providerLabel(connector.provider)}</div>
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
            </aside>

            <section className="rounded-2xl border border-border/70 bg-card/50 backdrop-blur-xl overflow-hidden flex flex-col min-h-0">
              <div className="px-4 py-3 border-b border-border/70 flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  {selectedChannel.kind === "announcements" ? (
                    <Megaphone className="w-4 h-4 text-primary" />
                  ) : (
                    <MessageSquare className="w-4 h-4 text-primary" />
                  )}
                  <div className="font-medium text-foreground truncate">
                    {selectedChannel.kind === "announcements"
                      ? t.communicationPage.clubAnnouncements
                      : `# ${selectedChannel.label}`}
                  </div>
                </div>
                {selectedChannel.kind === "chat" ? (
                  <div className="text-[11px] text-muted-foreground">{t.communicationPage.chatManagementPlatform}</div>
                ) : null}
              </div>

              {selectedChannel.kind === "announcements" ? (
                <div className="p-4 overflow-y-auto space-y-4">
                  {missingAnnouncementsTable ? (
                    <div className="rounded-xl bg-background/50 border border-border p-8 text-center text-muted-foreground text-sm">
                      {t.communicationPage.announcementsDatabaseNotReady}
                    </div>
                  ) : announcements.length === 0 ? (
                    <div className="rounded-xl bg-background/50 border border-border p-8 text-center text-muted-foreground text-sm">
                      {t.communicationPage.noAnnouncementsYet}
                    </div>
                  ) : (
                    announcements.map((announcement, index) => (
                      <motion.div
                        key={announcement.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.04 }}
                        className="rounded-xl bg-background/50 border border-border p-5"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-display font-semibold text-foreground">
                            {announcement.title}
                          </h3>
                          <span
                            className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                              priorityColors[announcement.priority] || priorityColors.normal
                            }`}
                          >
                            {announcement.priority}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">{announcement.content}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(announcement.created_at).toLocaleString()}
                        </p>
                      </motion.div>
                    ))
                  )}
                </div>
              ) : (
                <>
                  <div className="px-4 pt-3 border-b border-border/70 pb-3">
                    <div className="flex items-center gap-2 rounded-xl border border-border bg-background/70 px-3">
                      <Search className="w-4 h-4 text-muted-foreground" />
                      <Input
                        value={messageSearch}
                        onChange={(event) => setMessageSearch(event.target.value)}
                        placeholder={t.communicationPage.searchMessagesPlaceholder}
                        className="border-0 bg-transparent focus-visible:ring-0"
                      />
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <div className="text-[11px] text-muted-foreground">
                        {messageTotalCount === 0
                          ? "Showing 0 messages"
                          : `Showing ${(messagePage - 1) * MESSAGE_PAGE_SIZE + 1}-${Math.min(messagePage * MESSAGE_PAGE_SIZE, messageTotalCount)} of ${messageTotalCount}`}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-7 px-2 text-xs"
                          disabled={messagePage <= 1}
                          onClick={() => setMessagePage((current) => Math.max(1, current - 1))}
                        >
                          Previous
                        </Button>
                        <span className="text-[11px] text-muted-foreground">
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
                          Next
                        </Button>
                      </div>
                    </div>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-[radial-gradient(circle_at_10%_20%,hsl(var(--primary)/0.08),transparent_35%),radial-gradient(circle_at_90%_80%,hsl(var(--accent)/0.08),transparent_35%)]">
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
                        return (
                          <div key={message.id}>
                            {showDateSeparator ? (
                              <div className="flex justify-center py-2">
                                <span className="text-[10px] px-2 py-1 rounded-full bg-background/80 border border-border text-muted-foreground">
                                  {new Date(message.created_at).toLocaleDateString()}
                                </span>
                              </div>
                            ) : null}
                            <div className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                              <div
                                className={`max-w-[78%] px-3.5 py-2.5 rounded-2xl text-sm shadow-sm ${
                                  isMe
                                    ? "bg-emerald-500/85 text-emerald-950 rounded-br-md"
                                    : "bg-background/90 border border-border text-foreground rounded-bl-md"
                                }`}
                              >
                                {!isMe ? (
                                  <div className="text-[10px] font-medium text-primary mb-1">
                                    {message.profiles?.display_name || t.common.unknown}
                                  </div>
                                ) : null}
                                <p className="leading-relaxed whitespace-pre-wrap">{message.content}</p>
                                {message.attachments.length ? (
                                  <div className="mt-2 space-y-1">
                                    {message.attachments.map((attachment) => (
                                      <a
                                        key={`${message.id}-${attachment.path}`}
                                        href={attachment.signed_url || "#"}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="block text-[11px] underline decoration-dotted hover:opacity-80"
                                      >
                                        {attachment.file_name}
                                      </a>
                                    ))}
                                  </div>
                                ) : null}
                                <div
                                  className={`text-[10px] mt-1 flex items-center gap-1.5 ${
                                    isMe ? "text-emerald-900/70" : "text-muted-foreground"
                                  }`}
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
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  <div className="border-t border-border/70 p-3 bg-background/70 space-y-2">
                    {selectedFiles.length ? (
                      <div className="flex flex-wrap gap-1.5">
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
                    <div className="flex items-center gap-2 rounded-full border border-border bg-card px-3 py-2">
                      <label className="inline-flex items-center cursor-pointer text-muted-foreground hover:text-foreground">
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
                        className="border-0 bg-transparent shadow-none focus-visible:ring-0"
                        maxLength={1000}
                      />
                      <Button
                        size="icon"
                        onClick={() => void handleSendMessage()}
                        disabled={!newMessage.trim() && selectedFiles.length === 0}
                        className="w-8 h-8 rounded-full bg-gradient-gold-static text-primary-foreground hover:brightness-110"
                      >
                        <Send className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </section>
          </div>
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

      {showAddAnnouncement && perms.isAdmin ? (
        <div
          className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setShowAddAnnouncement(false)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md rounded-2xl bg-card border border-border p-6"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-bold text-foreground">{t.communicationPage.newAnnouncement}</h3>
              <Button variant="ghost" size="icon" onClick={() => setShowAddAnnouncement(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="space-y-3">
              <Input
                placeholder={t.communicationPage.announcementTitlePlaceholder}
                value={annTitle}
                onChange={(event) => setAnnTitle(event.target.value)}
                className="bg-background"
                maxLength={200}
              />
              <textarea
                placeholder={t.communicationPage.announcementContentPlaceholder}
                value={annContent}
                onChange={(event) => setAnnContent(event.target.value)}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                rows={4}
                maxLength={2000}
              />
              <Select value={annPriority} onValueChange={setAnnPriority}>
                <SelectTrigger className="w-full h-10 rounded-xl border-border bg-background px-3 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">{t.communicationPage.lowPriority}</SelectItem>
                  <SelectItem value="normal">{t.communicationPage.normalPriority}</SelectItem>
                  <SelectItem value="high">{t.communicationPage.highPriority}</SelectItem>
                  <SelectItem value="urgent">{t.communicationPage.urgentPriority}</SelectItem>
                </SelectContent>
              </Select>
              <Button
                onClick={handleAddAnnouncement}
                disabled={!annTitle.trim() || !annContent.trim()}
                className="w-full bg-gradient-gold-static text-primary-foreground hover:brightness-110"
              >
                {t.communicationPage.postAnnouncement}
              </Button>
            </div>
          </motion.div>
        </div>
      ) : null}
    </div>
  );
};

export default Communication;
