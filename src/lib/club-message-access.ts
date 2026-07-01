import {
  getDataScopeForModule,
  normalizeDashboardRole,
  type DashboardRole,
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

export interface MessageChannelLike {
  id: string;
  kind: "announcements" | "chat";
  teamId: string | null;
  isTrainersChannel?: boolean;
}

export interface MessageChannelFilterOptions {
  userTeamIds: readonly string[];
  isAdmin: boolean;
  /** Training / coaching staff (trainers, team admins, club admins). */
  isTrainer?: boolean;
  /** Public club hero filter — limits team channels to one team (clubs page). */
  teamFilterId?: string | null;
  /**
   * Team-scoped roles (player, parent, trainer team view): hide club-wide chat
   * (Club General) so only assigned team channels remain.
   */
  teamScopedOnly?: boolean;
  /**
   * Generic club member (no team link): club-wide channels only — announcements,
   * Club General, no team channels or trainers channel.
   */
  clubWideOnly?: boolean;
}

/**
 * Derive message channel filter flags from the active dashboard persona (gate role),
 * not legacy membership admin elevation — dual-role users viewing as player stay team-scoped.
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
    teamScopedOnly: scope === "team" && !isAdmin,
    clubWideOnly: role === "member",
  };
}

/** Sidebar channels visible to the current user (announcements + club general + trainers + their teams). */
export function filterMessageChannelsForUser<T extends MessageChannelLike>(
  channels: readonly T[],
  options: MessageChannelFilterOptions,
): T[] {
  const { userTeamIds, isAdmin, isTrainer = false, teamFilterId, teamScopedOnly = false, clubWideOnly = false } = options;

  return channels.filter((channel) => {
    if (channel.kind === "announcements") return true;

    if (channel.isTrainersChannel) {
      return !clubWideOnly && (isTrainer || isAdmin);
    }

    if (channel.teamId === null) {
      if (teamScopedOnly) return false;
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
  },
): T[] {
  const { userTeamIds, isAdmin, teamFilterId, clubWideOnly = false } = options;

  return rows.filter((row) => {
    const teamId = row.team_id ?? null;
    if (clubWideOnly && teamId !== null) return false;
    if (!canAccessTeamChannel(teamId, userTeamIds, isAdmin)) return false;
    if (teamFilterId && teamId !== null && teamId !== teamFilterId) return false;
    return true;
  });
}

export function channelIdForMessage(teamId: string | null, isTrainersChannel = false): string {
  if (isTrainersChannel) return TRAINERS_CHANNEL_ID;
  return teamId ? `team-${teamId}` : "club-general";
}

/** Deep-link query for Communication page channel selection. */
export function communicationChannelQuery(channelId: string): string {
  return `channel=${encodeURIComponent(channelId)}`;
}

/** Whether a chat message row is visible under the same rules as dashboard channels. */
export function canViewChatMessageRow(
  row: { team_id: string | null; is_trainers_channel?: boolean },
  options: MessageChannelFilterOptions,
): boolean {
  if (row.is_trainers_channel) {
    return !options.clubWideOnly && Boolean(options.isTrainer || options.isAdmin);
  }
  if (row.team_id === null) {
    return !options.teamScopedOnly;
  }
  if (options.clubWideOnly) return false;
  if (!canAccessTeamChannel(row.team_id, options.userTeamIds, options.isAdmin)) {
    return false;
  }
  if (options.teamFilterId) return row.team_id === options.teamFilterId;
  return true;
}
