# Residual client fan-out (ST-006 follow-up)

Analytics-heavy pages were moved to RPCs. Remaining `.in("match_id", matchIds)` patterns are acceptable when `matchIds` is a small bounded set (one player or widget), not unbounded club history.

| Location | Notes |
|----------|--------|
| `src/components/dashboard/AchievementBadges.tsx` | Per-membership `matchIds` slice |
| `src/components/dashboard/AnalyticsWidgets.tsx` | Widget-scoped `matchIds` |
| `src/components/ai/NaturalLanguageStats.tsx` | NL query context |
| `src/pages/PlayerProfile.tsx` | Single-player stats |

Rule: if `matchIds.length` can grow with full club history, add an RPC or cap IDs with a product limit.
