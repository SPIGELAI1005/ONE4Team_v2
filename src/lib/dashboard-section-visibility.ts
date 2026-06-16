export interface DashboardSectionFlags {
  clubSetup: boolean;
  liveMatchTicker: boolean;
  financialSummary: boolean;
  analyticsWidgets: boolean;
  seasonProgression: boolean;
  teamChemistry: boolean;
  achievementBadges: boolean;
  naturalLanguageStats: boolean;
  seasonAwards: boolean;
  adminNotificationSender: boolean;
  ai4teamWeeklyDigest: boolean;
  upcomingAndAi: boolean;
}

const TRAINER_SECTIONS: DashboardSectionFlags = {
  clubSetup: false,
  liveMatchTicker: true,
  financialSummary: false,
  analyticsWidgets: true,
  seasonProgression: true,
  teamChemistry: true,
  achievementBadges: true,
  naturalLanguageStats: true,
  seasonAwards: true,
  adminNotificationSender: false,
  ai4teamWeeklyDigest: false,
  upcomingAndAi: true,
};

const ADMIN_SECTIONS: DashboardSectionFlags = {
  clubSetup: true,
  liveMatchTicker: true,
  financialSummary: true,
  analyticsWidgets: false,
  seasonProgression: false,
  teamChemistry: false,
  achievementBadges: false,
  naturalLanguageStats: true,
  seasonAwards: false,
  adminNotificationSender: true,
  ai4teamWeeklyDigest: true,
  upcomingAndAi: true,
};

const PLAYER_SECTIONS: DashboardSectionFlags = {
  clubSetup: false,
  liveMatchTicker: true,
  financialSummary: false,
  analyticsWidgets: true,
  seasonProgression: true,
  teamChemistry: false,
  achievementBadges: true,
  naturalLanguageStats: false,
  seasonAwards: false,
  adminNotificationSender: false,
  ai4teamWeeklyDigest: false,
  upcomingAndAi: true,
};

const SPONSOR_SECTIONS: DashboardSectionFlags = {
  clubSetup: false,
  liveMatchTicker: false,
  financialSummary: false,
  analyticsWidgets: false,
  seasonProgression: false,
  teamChemistry: false,
  achievementBadges: false,
  naturalLanguageStats: false,
  seasonAwards: false,
  adminNotificationSender: false,
  ai4teamWeeklyDigest: false,
  upcomingAndAi: true,
};

const DEFAULT_SECTIONS: DashboardSectionFlags = {
  clubSetup: false,
  liveMatchTicker: true,
  financialSummary: false,
  analyticsWidgets: false,
  seasonProgression: false,
  teamChemistry: false,
  achievementBadges: false,
  naturalLanguageStats: false,
  seasonAwards: false,
  adminNotificationSender: false,
  ai4teamWeeklyDigest: false,
  upcomingAndAi: true,
};

export function getDashboardSections(role: string | undefined): DashboardSectionFlags {
  switch (role) {
    case "admin":
      return ADMIN_SECTIONS;
    case "trainer":
      return TRAINER_SECTIONS;
    case "player":
      return PLAYER_SECTIONS;
    case "sponsor":
      return SPONSOR_SECTIONS;
    default:
      return DEFAULT_SECTIONS;
  }
}
