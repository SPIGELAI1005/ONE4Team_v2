import { normalizeDashboardRole } from "@/lib/rbac-config";

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
  weekAtAGlance: boolean;
  trainerToday: boolean;
  myDues: boolean;
  upcomingAndAi: boolean;
  marketplaceCards: boolean;
  tasksSummary: boolean;
}

const CLUB_ADMIN_SECTIONS: DashboardSectionFlags = {
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
  weekAtAGlance: true,
  trainerToday: false,
  myDues: false,
  upcomingAndAi: true,
  marketplaceCards: true,
  tasksSummary: true,
};

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
  weekAtAGlance: false,
  trainerToday: true,
  myDues: false,
  upcomingAndAi: true,
  marketplaceCards: false,
  tasksSummary: true,
};

const TEAM_STAFF_SECTIONS: DashboardSectionFlags = {
  ...TRAINER_SECTIONS,
  seasonAwards: false,
  naturalLanguageStats: false,
  teamChemistry: false,
};

const ADMIN_SECTIONS: DashboardSectionFlags = {
  ...CLUB_ADMIN_SECTIONS,
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
  weekAtAGlance: false,
  trainerToday: false,
  myDues: true,
  upcomingAndAi: true,
  marketplaceCards: false,
  tasksSummary: true,
};

const PARENT_SECTIONS: DashboardSectionFlags = {
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
  weekAtAGlance: false,
  trainerToday: false,
  myDues: true,
  upcomingAndAi: true,
  marketplaceCards: false,
  tasksSummary: true,
};

const MEMBER_SECTIONS: DashboardSectionFlags = {
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
  weekAtAGlance: false,
  trainerToday: false,
  myDues: true,
  upcomingAndAi: true,
  marketplaceCards: false,
  tasksSummary: true,
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
  weekAtAGlance: false,
  trainerToday: false,
  myDues: false,
  upcomingAndAi: true,
  marketplaceCards: true,
  tasksSummary: true,
};

const PROVIDER_SECTIONS: DashboardSectionFlags = {
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
  weekAtAGlance: false,
  trainerToday: false,
  myDues: false,
  upcomingAndAi: false,
  marketplaceCards: true,
  tasksSummary: false,
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
  weekAtAGlance: false,
  trainerToday: false,
  myDues: false,
  upcomingAndAi: true,
  marketplaceCards: false,
  tasksSummary: true,
};

export function getDashboardSections(role: string | undefined): DashboardSectionFlags {
  const normalized = normalizeDashboardRole(role) ?? role;
  switch (normalized) {
    case "admin":
      return ADMIN_SECTIONS;
    case "club_admin":
      return CLUB_ADMIN_SECTIONS;
    case "trainer":
      return TRAINER_SECTIONS;
    case "team_staff":
      return TEAM_STAFF_SECTIONS;
    case "player":
      return PLAYER_SECTIONS;
    case "parent_supporter":
      return PARENT_SECTIONS;
    case "member":
      return MEMBER_SECTIONS;
    case "sponsor":
      return SPONSOR_SECTIONS;
    case "supplier":
    case "service_provider":
    case "consultant":
      return PROVIDER_SECTIONS;
    default:
      return DEFAULT_SECTIONS;
  }
}
