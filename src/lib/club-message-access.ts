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

}



/** Sidebar channels visible to the current user (announcements + club general + trainers + their teams). */

export function filterMessageChannelsForUser<T extends MessageChannelLike>(

  channels: readonly T[],

  options: MessageChannelFilterOptions,

): T[] {

  const { userTeamIds, isAdmin, isTrainer = false, teamFilterId } = options;



  return channels.filter((channel) => {

    if (channel.kind === "announcements") return true;



    if (channel.isTrainersChannel) {

      return isTrainer || isAdmin;

    }



    if (channel.teamId === null) return true;



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

  options: { userTeamIds: readonly string[]; isAdmin: boolean; teamFilterId?: string | null },

): T[] {

  const { userTeamIds, isAdmin, teamFilterId } = options;



  return rows.filter((row) => {

    const teamId = row.team_id ?? null;

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


