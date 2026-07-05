import { ArrowLeft, Globe, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface AnnouncementDetailData {
  id: string;
  title: string;
  content: string;
  excerpt?: string | null;
  priority?: string | null;
  created_at: string;
  image_url?: string | null;
  publish_to_public_website?: boolean;
}

interface AnnouncementDetailViewProps {
  announcement: AnnouncementDetailData;
  embedded?: boolean;
  onBack: () => void;
  labels: {
    back: string;
    publicSiteBadge: string;
    edit?: string;
    delete?: string;
  };
  priorityClassName?: string;
  canManage?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
}

export function AnnouncementDetailView({
  announcement,
  embedded = false,
  onBack,
  labels,
  priorityClassName,
  canManage = false,
  onEdit,
  onDelete,
}: AnnouncementDetailViewProps) {
  const excerpt = announcement.excerpt?.trim();
  const body = announcement.content.trim();

  const embeddedGhostActionClass =
    "text-neutral-700 hover:bg-red-50 hover:text-[color:var(--club-primary,#e31e24)]";

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div
        className={cn(
          "flex shrink-0 items-center justify-between gap-2 border-b px-4 py-3",
          embedded ? "border-neutral-200/80 bg-white/80" : "border-border/70",
        )}
      >
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={cn("h-8 gap-1.5 px-2", embedded && embeddedGhostActionClass)}
          onClick={onBack}
        >
          <ArrowLeft className="h-4 w-4" />
          {labels.back}
        </Button>
        {canManage ? (
          <div className="flex items-center gap-1">
            {onEdit ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className={cn("h-8 gap-1.5 px-2", embedded && embeddedGhostActionClass)}
                onClick={onEdit}
              >
                <Pencil className="h-4 w-4" />
                {labels.edit}
              </Button>
            ) : null}
            {onDelete ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className={cn(
                  "h-8 gap-1.5 px-2 text-destructive hover:bg-destructive hover:text-destructive-foreground",
                  embedded && "hover:bg-red-50 hover:text-destructive",
                )}
                onClick={onDelete}
              >
                <Trash2 className="h-4 w-4" />
                {labels.delete}
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <h3
            className={cn(
              "min-w-0 flex-1 font-display text-lg font-semibold leading-snug",
              embedded ? "text-neutral-900" : "text-foreground",
            )}
          >
            {announcement.title}
          </h3>
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
            {announcement.publish_to_public_website ? (
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium",
                  embedded
                    ? "bg-[color:var(--club-primary)]/10 text-[color:var(--club-primary)]"
                    : "bg-emerald-500/15 text-emerald-800 dark:text-emerald-200",
                )}
              >
                <Globe className="h-3 w-3" />
                {labels.publicSiteBadge}
              </span>
            ) : null}
            {announcement.priority ? (
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-[10px] font-medium capitalize",
                  priorityClassName,
                )}
              >
                {announcement.priority}
              </span>
            ) : null}
          </div>
        </div>

        <p className={cn("mt-2 text-xs", embedded ? "text-neutral-500" : "text-muted-foreground")}>
          {new Date(announcement.created_at).toLocaleString()}
        </p>

        {excerpt ? (
          <p
            className={cn(
              "mt-4 text-sm font-medium leading-relaxed",
              embedded ? "text-neutral-800" : "text-foreground",
            )}
          >
            {excerpt}
          </p>
        ) : null}

        {body ? (
          <div
            className={cn(
              "mt-4 text-sm leading-relaxed whitespace-pre-wrap",
              embedded ? "text-neutral-700" : "text-muted-foreground",
            )}
          >
            {body}
          </div>
        ) : null}

        {announcement.image_url ? (
          <img
            src={announcement.image_url}
            alt=""
            className="mt-5 max-h-80 w-full rounded-2xl border object-cover object-center"
          />
        ) : null}
      </div>
    </div>
  );
}
