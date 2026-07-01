import {
  Building2,
  CalendarDays,
  ClipboardList,
  FileSpreadsheet,
  FileText,
  Hammer,
  LayoutGrid,
  Package,
  Sparkles,
  Trophy,
  Wrench,
} from "lucide-react";
import type { EngagementCategory, PartnersTab } from "@/lib/partner-workflow-models";

export function partnersTabIcon(tab: PartnersTab) {
  switch (tab) {
    case "overview":
      return LayoutGrid;
    case "directory":
      return Building2;
    case "engagements":
      return ClipboardList;
    case "contracts":
      return FileText;
    case "invoices":
      return FileSpreadsheet;
  }
}

export function engagementCategoryIcon(category: EngagementCategory) {
  switch (category) {
    case "sporting_event":
      return Trophy;
    case "club_event":
      return CalendarDays;
    case "maintenance":
      return Wrench;
    case "facility":
      return Hammer;
    case "supply_delivery":
      return Package;
    case "sponsorship":
      return Sparkles;
    case "service":
      return Building2;
    default:
      return ClipboardList;
  }
}

export function partnerTypeBadgeClass(type: string): string {
  switch (type) {
    case "sponsor":
      return "bg-amber-500/15 text-amber-600 dark:text-amber-400 ring-1 ring-amber-500/20";
    case "supplier":
      return "bg-sky-500/15 text-sky-600 dark:text-sky-400 ring-1 ring-sky-500/20";
    case "service_provider":
      return "bg-violet-500/15 text-violet-600 dark:text-violet-400 ring-1 ring-violet-500/20";
    default:
      return "bg-muted/80 text-muted-foreground";
  }
}

export function taskStatusBadgeClass(status: string): string {
  switch (status) {
    case "done":
      return "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400";
    case "in_progress":
      return "bg-sky-500/15 text-sky-600 dark:text-sky-400";
    case "cancelled":
      return "bg-muted/80 text-muted-foreground";
    default:
      return "bg-orange-500/15 text-orange-600 dark:text-orange-400";
  }
}

export function contractStatusBadgeClass(status: string): string {
  switch (status) {
    case "active":
      return "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400";
    case "paused":
      return "bg-amber-500/15 text-amber-600 dark:text-amber-400";
    case "expired":
    case "terminated":
      return "bg-muted/80 text-muted-foreground";
    default:
      return "bg-sky-500/15 text-sky-600 dark:text-sky-400";
  }
}

export const PARTNER_PANEL_CLASS =
  "rounded-3xl border border-border/60 bg-card/40 shadow-sm backdrop-blur-2xl";
