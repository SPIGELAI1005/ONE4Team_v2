export interface FeedDateLabels {
  today: string;
  tomorrow: string;
  yesterday: string;
  validUntil: string;
}

function startOfLocalDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function parseIsoDate(iso: string): Date {
  return startOfLocalDay(new Date(`${iso}T12:00:00`));
}

function dayDiff(from: Date, to: Date): number {
  return Math.round((startOfLocalDay(to).getTime() - startOfLocalDay(from).getTime()) / 86_400_000);
}

export function formatFeedRelativeDay(
  isoDate: string,
  locale: string,
  labels: FeedDateLabels,
  now = new Date(),
): string | null {
  const diff = dayDiff(parseIsoDate(isoDate), now);
  if (diff === 0) return labels.today;
  if (diff === 1) return labels.tomorrow;
  if (diff === -1) return labels.yesterday;
  return null;
}

export function formatFeedCalendarDate(isoDate: string, locale: string): string {
  return parseIsoDate(isoDate).toLocaleDateString(locale, {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatFeedDayHeading(
  isoDate: string,
  locale: string,
  labels: FeedDateLabels,
  now = new Date(),
): string {
  const relative = formatFeedRelativeDay(isoDate, locale, labels, now);
  const calendar = formatFeedCalendarDate(isoDate, locale);
  return relative ? `${relative} · ${calendar}` : calendar;
}

export function formatFeedTimeRange(time: string, endTime?: string): string {
  return endTime ? `${time} – ${endTime}` : time;
}

export interface FeedScheduleLineInput {
  date: string;
  time: string;
  endTime?: string;
  effectiveUntil?: string;
}

export function formatFeedSchedulePrimary(
  item: FeedScheduleLineInput,
  locale: string,
  labels: FeedDateLabels,
  now = new Date(),
): string {
  const relative = formatFeedRelativeDay(item.date, locale, labels, now);
  const calendar = formatFeedCalendarDate(item.date, locale);
  const dayPart = relative ? `${relative} (${calendar})` : calendar;
  return `${dayPart} · ${formatFeedTimeRange(item.time, item.endTime)}`;
}

export function formatFeedValidUntilLine(
  effectiveUntil: string,
  locale: string,
  validUntilLabel: string,
): string {
  const calendar = formatFeedCalendarDate(effectiveUntil, locale);
  return `${validUntilLabel} ${calendar}`;
}

export function groupItemsByIsoDate<T extends { date: string }>(items: T[]): Array<{ date: string; items: T[] }> {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const bucket = map.get(item.date);
    if (bucket) bucket.push(item);
    else map.set(item.date, [item]);
  }
  return [...map.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([date, groupedItems]) => ({ date, items: groupedItems }));
}
