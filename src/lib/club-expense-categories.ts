export const CLUB_EXPENSE_CATEGORIES = [
  "facility",
  "equipment",
  "staff",
  "travel",
  "referees",
  "other",
] as const;

export type ClubExpenseCategory = (typeof CLUB_EXPENSE_CATEGORIES)[number];
