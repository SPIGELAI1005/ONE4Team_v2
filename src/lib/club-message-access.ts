import {
  getDataScopeForModule,
  getModuleAccess,
  normalizeDashboardRole,
  type DashboardRole,
  type ModuleAccessLevel,
} from "@/lib/rbac-config";

/** Whether the user may read/write a chat channel (null team id = club-wide). */
export function canAccessTeamChannel(
  teamId: string | null,
  userTeamIds: readonly string[],
  isAdmin: boolean,
): boolean {
  if (teamId === null) return true;
  if (isAdmin) return true;
  return userTeamIds.includes(teamId);
}

export const TRAINERS_CHANNEL_ID = "trainers";

export type SystemChannelKey =
  | "announcements"
  | "club-general"
  | "trainers"
  | `team:${string}`;

export interface MessageChannelLike {
  id: string;
  kind: "announcements" | "chat";
  teamId: string | null;
  isTrainersChannel?: boolean;
  customChannelId?: string | null;
}

export interface MessageChannelFilterOptions {
  userTeamIds: readonly string[];
  isAdmin: boolean;
  /** Training / coaching staff (trainers, team admins, club admins). */
  isTrainer?: boolean;
  /** Public club hero filter - limits team channels to one team (clubs page). */
  teamFilterId?: string | null;
  /**
   * Team-scoped roles (player, parent, trainer team view): hide club-wide chat
   * (Club General) so only assigned team channels remain.
   */
  teamScopedOnly?: boolean;
  /**
   * Generic club member (no team link): club-wide channels only - announcements,
   * Club General, no team channels or trainers channel.
   */
  clubWideOnly?: boolean;
  /** System channel keys the user was explicitly invited to. */
  invitedSystemKeys?: ReadonlySet<string> | readonly string[];
}

function hasInvitedSystemKey(
  key: string,
  invited: MessageChannelFilterOptions["invitedSystemKeys"],
): boolean {
  if (!invited) return false;
  if (invited instanceof Set) return invited.has(key);
  return invited.includes(key);
}

/** Stable system-channel key used for invites (DB + UI). */
export function systemChannelKeyForChannel(channel: MessageChannelLike): SystemChannelKey | null {
  if (channel.customChannelId) return null;
  if (channel.kind === "announcements") return "announcements";
  if (channel.isTrainersChannel) return "trainers";
  if (channel.teamId === null) return "club-general";
  return `team:${channel.teamId}`;
}

export function customChannelUiId(customChannelId: string): string {
  return `custom-${customChannelId}`;
}

export function parseCustomChannelId(channelId: string): string | null {
  if (!channelId.startsWith("custom-")) return null;
  return channelId.slice("custom-".length) || null;
}

/**
 * Derive message channel filter flags from the active dashboard persona (gate role),
 * not legacy membership admin elevation - dual-role users viewing as player stay team-scoped.
 */
export function buildMessageAccessFromGateRole(
  gateRole: DashboardRole | string | null | undefined,
  userTeamIds: readonly string[],
  teamFilterId?: string | null,
): MessageChannelFilterOptions {
  const role = normalizeDashboardRole(gateRole ?? undefined);
  const scope = getDataScopeForModule(role, "messages");
  const isAdmin = role === "admin" || role === "club_admin";
  const isTrainer = isAdmin || role === "trainer" || role === "team_staff";

  return {
    userTeamIds,
    isAdmin,
    isTrainer,
    teamFilterId,
    // Member persona uses clubWideOnly instead of team scoping.
    teamScopedOnly: scope === "team" && !isAdmin && role !== "member",
    clubWideOnly: role === "member",
  };
}

/** Club members with messages access other than partner-only (`own`) may create/invite. */
export function canManageChannelInvites(
  gateRole: DashboardRole | string | null | undefined,
): boolean {
  const role = normalizeDashboardRole(gateRole ?? undefined);
  if (!role) return false;
  const level: ModuleAccessLevel = getModuleAccess(role, "messages");
  return level !== "none" && level !== "own";
}

/** Sidebar channels visible to the current user (announcements + club general + trainers + their teams). */
export function filterMessageChannelsForUser<T extends MessageChannelLike>(
  channels: readonly T[],
  options: MessageChannelFilterOptions,
): T[] {
  const {
    userTeamIds,
    isAdmin,
    isTrainer = false,
    teamFilterId,
    teamScopedOnly = false,
    clubWideOnly = false,
    invitedSystemKeys,
  } = options;

  return channels.filter((channel) => {
    if (channel.customChannelId) return true;

    const inviteKey = systemChannelKeyForChannel(channel);
    const invited = inviteKey ? hasInvitedSystemKey(inviteKey, invitedSystemKeys) : false;

    if (channel.kind === "announcements") return true;

    if (channel.isTrainersChannel) {
      if (invited) return true;
      return !clubWideOnly && (isTrainer || isAdmin);
    }

    if (channel.teamId === null) {
      if (invited) return true;
      if (teamScopedOnly) return false;
      return true;
    }

    if (invited) {
      if (teamFilterId) return channel.teamId === teamFilterId;
      return true;
    }

    if (clubWideOnly) return false;
    if (!canAccessTeamChannel(channel.teamId, userTeamIds, isAdmin)) return false;

    if (teamFilterId) return channel.teamId === teamFilterId;

    return true;
  });
}

export interface AnnouncementLike {
  team_id?: string | null;
}

export function filterAnnouncementsForUser<T extends AnnouncementLike>(
  rows: readonly T[],
  options: {
    userTeamIds: readonly string[];
    isAdmin: boolean;
    teamFilterId?: string | null;
    clubWideOnly?: boolean;
    invitedToAnnouncements?: boolean;
  },
): T[] {
  const {
    userTeamIds,
    isAdmin,
    teamFilterId,
    clubWideOnly = false,
    invitedToAnnouncements = false,
  } = options;

  return rows.filter((row) => {
    const teamId = row.team_id ?? null;
    if (teamId === null && invitedToAnnouncements) return true;
    if (clubWideOnly && teamId !== null) return false;
    if (!canAccessTeamChannel(teamId, userTeamIds, isAdmin)) return false;
    if (teamFilterId && teamId !== null && teamId !== teamFilterId) return false;
    return true;
  });
}

export function channelIdForMessage(
  teamId: string | null,
  isTrainersChannel = false,
  customChannelId?: string | null,
): string {
  if (customChannelId) return customChannelUiId(customChannelId);
  if (isTrainersChannel) return TRAINERS_CHANNEL_ID;
  return teamId ? `team-${teamId}` : "club-general";
}

/** Deep-link query for Communication page channel selection. */
export function communicationChannelQuery(channelId: string): string {
  return `channel=${encodeURIComponent(channelId)}`;
}

/** Whether a chat message row is visible under the same rules as dashboard channels. */
export function canViewChatMessageRow(
  row: {
    team_id: string | null;
    is_trainers_channel?: boolean;
    custom_channel_id?: string | null;
  },
  options: MessageChannelFilterOptions,
  memberCustomChannelIds?: ReadonlySet<string> | readonly string[],
): boolean {
  if (row.custom_channel_id) {
    if (!memberCustomChannelIds) return false;
    if (memberCustomChannelIds instanceof Set) {
      return memberCustomChannelIds.has(row.custom_channel_id);
    }
    return memberCustomChannelIds.includes(row.custom_channel_id);
  }

  if (row.is_trainers_channel) {
    if (hasInvitedSystemKey("trainers", options.invitedSystemKeys)) return true;
    return !options.clubWideOnly && Boolean(options.isTrainer || options.isAdmin);
  }
  if (row.team_id === null) {
    if (hasInvitedSystemKey("club-general", options.invitedSystemKeys)) return true;
    return !options.teamScopedOnly;
  }
  if (hasInvitedSystemKey(`team:${row.team_id}`, options.invitedSystemKeys)) {
    if (options.teamFilterId) return row.team_id === options.teamFilterId;
    return true;
  }
  if (options.clubWideOnly) return false;
  if (!canAccessTeamChannel(row.team_id, options.userTeamIds, options.isAdmin)) {
    return false;
  }
  if (options.teamFilterId) return row.team_id === options.teamFilterId;
  return true;
}
