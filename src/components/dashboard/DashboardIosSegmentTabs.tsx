import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DASHBOARD_IOS_SEGMENT,
  DASHBOARD_IOS_SEGMENT_BUTTON,
} from "@/lib/dashboard-page-shell";

export interface DashboardIosSegmentTab<T extends string> {
  id: T;
  label: string;
  icon?: LucideIcon;
}

interface DashboardIosSegmentTabsProps<T extends string> {
  tabs: DashboardIosSegmentTab<T>[];
  value: T;
  onChange: (id: T) => void;
  className?: string;
}

export function DashboardIosSegmentTabs<T extends string>({
  tabs,
  value,
  onChange,
  className,
}: DashboardIosSegmentTabsProps<T>) {
  if (tabs.length === 0) return null;

  return (
    <div className={cn(DASHBOARD_IOS_SEGMENT, className)}>
      {tabs.map((tab) => {
        const Icon = tab.icon;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={cn(
              DASHBOARD_IOS_SEGMENT_BUTTON,
              value === tab.id ? "ios-segment-active text-foreground" : "text-muted-foreground",
            )}
          >
            {Icon ? <Icon className="h-3.5 w-3.5 shrink-0" strokeWidth={1.5} /> : null}
            <span className="truncate">{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}
