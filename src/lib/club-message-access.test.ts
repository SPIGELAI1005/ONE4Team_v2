import { describe, expect, it } from "vitest";

import {

  canAccessTeamChannel,

  channelIdForMessage,

  filterAnnouncementsForUser,

  filterMessageChannelsForUser,

  TRAINERS_CHANNEL_ID,

} from "@/lib/club-message-access";



describe("club-message-access", () => {

  const channels = [

    { id: "announcements", kind: "announcements" as const, teamId: null },

    { id: "club-general", kind: "chat" as const, teamId: null },

    { id: TRAINERS_CHANNEL_ID, kind: "chat" as const, teamId: null, isTrainersChannel: true },

    { id: "team-a", kind: "chat" as const, teamId: "team-a" },

    { id: "team-b", kind: "chat" as const, teamId: "team-b" },

  ];



  it("shows club-wide channels to every member but not trainers", () => {

    const visible = filterMessageChannelsForUser(channels, {

      userTeamIds: ["team-a"],

      isAdmin: false,

      isTrainer: false,

    });

    expect(visible.map((c) => c.id)).toEqual(["announcements", "club-general", "team-a"]);

  });



  it("shows trainers channel to coaching staff", () => {

    const visible = filterMessageChannelsForUser(channels, {

      userTeamIds: ["team-a"],

      isAdmin: false,

      isTrainer: true,

    });

    expect(visible.map((c) => c.id)).toEqual([

      "announcements",

      "club-general",

      TRAINERS_CHANNEL_ID,

      "team-a",

    ]);

  });



  it("shows all team channels to admins without hero filter", () => {

    const visible = filterMessageChannelsForUser(channels, {

      userTeamIds: [],

      isAdmin: true,

      isTrainer: true,

    });

    expect(visible).toHaveLength(5);

  });



  it("limits team channels to hero filter on clubs page", () => {

    const visible = filterMessageChannelsForUser(channels, {

      userTeamIds: ["team-a", "team-b"],

      isAdmin: true,

      isTrainer: true,

      teamFilterId: "team-a",

    });

    expect(visible.map((c) => c.id)).toEqual([

      "announcements",

      "club-general",

      TRAINERS_CHANNEL_ID,

      "team-a",

    ]);

  });



  it("filters announcements by team scope and hero filter", () => {

    const rows = [

      { id: "1", team_id: null },

      { id: "2", team_id: "team-a" },

      { id: "3", team_id: "team-b" },

    ];

    const visible = filterAnnouncementsForUser(rows, {

      userTeamIds: ["team-a"],

      isAdmin: false,

      teamFilterId: "team-a",

    });

    expect(visible.map((r) => r.id)).toEqual(["1", "2"]);

  });



  it("allows club-general for all members", () => {

    expect(canAccessTeamChannel(null, [], false)).toBe(true);

  });



  it("maps trainers messages to trainers channel id", () => {

    expect(channelIdForMessage(null, true)).toBe(TRAINERS_CHANNEL_ID);

    expect(channelIdForMessage("team-a")).toBe("team-team-a");

  });

});

