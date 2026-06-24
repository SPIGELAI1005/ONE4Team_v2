import { useState } from "react";
import { Check, Loader2, MessageSquareText, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import type { TrainingAttendanceRow, TrainingAttendanceStatus } from "@/lib/training-attendance";
import { cn } from "@/lib/utils";

interface TrainingAttendanceRsvpProps {
  activityTitle: string;
  myAttendance: TrainingAttendanceRow | null;
  busy?: boolean;
  variant?: "dashboard" | "club";
  onRespond: (status: "confirmed" | "declined", notes?: string | null) => Promise<void>;
  labels: {
    coming: string;
    notComing: string;
    changeResponse: string;
    statusComing: string;
    statusNotComing: string;
    statusPending: string;
    declineTitle: string;
    declineDescription: string;
    declineReasonLabel: string;
    declineReasonPlaceholder: string;
    declineConfirm: string;
    declineCancel: string;
    reasonRequired: string;
    presets: { id: string; label: string }[];
  };
}

export function TrainingAttendanceRsvp({
  activityTitle,
  myAttendance,
  busy = false,
  variant = "dashboard",
  onRespond,
  labels,
}: TrainingAttendanceRsvpProps) {
  const [declineOpen, setDeclineOpen] = useState(false);
  const [declineReason, setDeclineReason] = useState("");
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);

  const status: TrainingAttendanceStatus | "none" = myAttendance?.status ?? "none";
  const isComing = status === "confirmed" || status === "attended";
  const isDeclined = status === "declined";
  const hasResponse = isComing || isDeclined;

  function resetDeclineForm() {
    setDeclineReason("");
    setSelectedPreset(null);
  }

  function openDecline() {
    resetDeclineForm();
    if (isDeclined && myAttendance?.notes) {
      setDeclineReason(myAttendance.notes);
    }
    setDeclineOpen(true);
  }

  async function submitDecline() {
    const reason = (selectedPreset
      ? labels.presets.find((p) => p.id === selectedPreset)?.label ?? ""
      : declineReason
    ).trim();
    if (!reason) return;
    await onRespond("declined", reason);
    setDeclineOpen(false);
    resetDeclineForm();
  }

  return (
    <div
      className={cn(
        "rounded-2xl border p-3",
        variant === "club"
          ? "border-[color:var(--club-border)] bg-white/5"
          : "border-border/60 bg-background/35",
      )}
    >
        <div className="mb-2 flex items-center justify-between gap-2">
        <div
          className={cn(
            "text-[11px] font-semibold uppercase tracking-wide",
            variant === "club" ? "text-[color:var(--club-muted)]" : "text-muted-foreground",
          )}
        >
          {labels.changeResponse}
        </div>
        {hasResponse ? (
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-[10px] font-semibold",
              isComing && "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
              isDeclined && "bg-rose-500/15 text-rose-700 dark:text-rose-300",
            )}
          >
            {isComing ? labels.statusComing : labels.statusNotComing}
          </span>
        ) : (
          <span className="rounded-full bg-muted/60 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
            {labels.statusPending}
          </span>
        )}
      </div>

      {isDeclined && myAttendance?.notes?.trim() ? (
        <div className="mb-3 flex gap-2 rounded-xl border border-rose-500/20 bg-rose-500/5 px-3 py-2 text-xs text-muted-foreground">
          <MessageSquareText className="mt-0.5 h-3.5 w-3.5 shrink-0 text-rose-500" />
          <span>{myAttendance.notes.trim()}</span>
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-2">
        <Button
          type="button"
          size="sm"
          disabled={busy}
          variant={isComing ? "default" : "outline"}
          className={cn(
            "h-10 rounded-xl font-semibold",
            isComing && "bg-emerald-600 text-white hover:bg-emerald-600/90",
          )}
          onClick={() => void onRespond("confirmed", null)}
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="mr-1.5 h-4 w-4" />}
          {labels.coming}
        </Button>
        <Button
          type="button"
          size="sm"
          disabled={busy}
          variant={isDeclined ? "default" : "outline"}
          className={cn(
            "h-10 rounded-xl font-semibold",
            isDeclined && "bg-rose-600 text-white hover:bg-rose-600/90",
          )}
          onClick={openDecline}
        >
          <X className="mr-1.5 h-4 w-4" />
          {labels.notComing}
        </Button>
      </div>

      <Dialog open={declineOpen} onOpenChange={setDeclineOpen}>
        <DialogContent className="max-w-md rounded-3xl border-border/60 bg-card/95 backdrop-blur-xl">
          <DialogHeader>
            <DialogTitle className="font-display">{labels.declineTitle}</DialogTitle>
            <DialogDescription>
              {labels.declineDescription.replace("{title}", activityTitle)}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {labels.presets.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => {
                    setSelectedPreset(preset.id);
                    setDeclineReason("");
                  }}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                    selectedPreset === preset.id
                      ? "border-primary/40 bg-primary/10 text-primary"
                      : "border-border/60 bg-background/50 text-foreground hover:bg-muted/40",
                  )}
                >
                  {preset.label}
                </button>
              ))}
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                {labels.declineReasonLabel}
              </label>
              <Textarea
                value={declineReason}
                onChange={(e) => {
                  setDeclineReason(e.target.value);
                  setSelectedPreset(null);
                }}
                placeholder={labels.declineReasonPlaceholder}
                rows={3}
                className="resize-none rounded-xl border-border/60 bg-background/50"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="ghost" onClick={() => setDeclineOpen(false)}>
              {labels.declineCancel}
            </Button>
            <Button
              type="button"
              className="bg-rose-600 text-white hover:bg-rose-600/90"
              disabled={busy || !(selectedPreset || declineReason.trim())}
              onClick={() => void submitDecline()}
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : labels.declineConfirm}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
