import { useEffect, useMemo, useState } from "react";
import { Loader2, UserPlus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { supabaseErrorMessage } from "@/lib/supabase-error-message";
import { useToast } from "@/hooks/use-toast";
import type { SystemChannelKey } from "@/lib/club-message-access";
import {
  clubModalFormInputClass,
  clubReadableModalOverlayClass,
  clubReadableModalPanelClass,
} from "@/lib/public-club-glass-classes";
import { cn } from "@/lib/utils";

export interface ChannelInviteMemberOption {
  id: string;
  user_id: string | null;
  display_name: string;
}

interface ChannelInviteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clubId: string;
  currentUserId: string;
  /** Custom channel UUID, or null when inviting to a system channel. */
  customChannelId?: string | null;
  systemChannelKey?: SystemChannelKey | null;
  channelLabel: string;
  /** Light glass panel for public club / embedded communication. */
  light?: boolean;
  labels: {
    title: string;
    description: string;
    searchPlaceholder: string;
    invite: string;
    inviting: string;
    empty: string;
    noneLeft: string;
    success: string;
    failed: string;
    cancel: string;
  };
  onInvited?: () => void;
}

export function ChannelInviteDialog({
  open,
  onOpenChange,
  clubId,
  currentUserId,
  customChannelId = null,
  systemChannelKey = null,
  channelLabel,
  light = false,
  labels,
  onInvited,
}: ChannelInviteDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [members, setMembers] = useState<ChannelInviteMemberOption[]>([]);
  const [existingMembershipIds, setExistingMembershipIds] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!open || !clubId) return;
    let cancelled = false;
    setLoading(true);
    setSelected(new Set());
    setSearch("");

    void (async () => {
      try {
        const membersRes = await supabase
          .from("club_memberships")
          .select("id, user_id, profiles!club_memberships_profile_fk(display_name)")
          .eq("club_id", clubId)
          .eq("status", "active")
          .order("created_at", { ascending: true });

        if (membersRes.error) throw membersRes.error;

        let existingQuery = supabase
          .from("message_channel_members")
          .select("membership_id")
          .eq("club_id", clubId);

        if (customChannelId) {
          existingQuery = existingQuery.eq("custom_channel_id", customChannelId);
        } else if (systemChannelKey) {
          existingQuery = existingQuery.eq("system_channel_key", systemChannelKey);
        }

        const existingRes = await existingQuery;
        if (existingRes.error) throw existingRes.error;

        if (cancelled) return;

        const mapped: ChannelInviteMemberOption[] = (membersRes.data || []).map((row) => {
          const profile = row.profiles as { display_name?: string | null } | null;
          return {
            id: row.id,
            user_id: row.user_id,
            display_name: profile?.display_name?.trim() || row.user_id || row.id,
          };
        });

        setMembers(mapped);
        setExistingMembershipIds(new Set((existingRes.data || []).map((row) => row.membership_id)));
      } catch (err) {
        if (!cancelled) {
          toast({
            title: labels.failed,
            description: supabaseErrorMessage(err),
            variant: "destructive",
          });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [clubId, customChannelId, labels.failed, open, systemChannelKey, toast]);

  const candidates = useMemo(() => {
    const q = search.trim().toLowerCase();
    return members.filter((member) => {
      if (existingMembershipIds.has(member.id)) return false;
      if (member.user_id === currentUserId) return false;
      if (!q) return true;
      return member.display_name.toLowerCase().includes(q);
    });
  }, [currentUserId, existingMembershipIds, members, search]);

  const toggle = (membershipId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(membershipId)) next.delete(membershipId);
      else next.add(membershipId);
      return next;
    });
  };

  const submit = async () => {
    if (!selected.size || (!customChannelId && !systemChannelKey)) return;
    setSubmitting(true);
    try {
      const rows = Array.from(selected).map((membershipId) => ({
        club_id: clubId,
        membership_id: membershipId,
        custom_channel_id: customChannelId,
        system_channel_key: customChannelId ? null : systemChannelKey,
        role: "member" as const,
        invited_by: currentUserId,
      }));
      const { error } = await supabase.from("message_channel_members").insert(rows);
      if (error) throw error;
      toast({
        title: labels.success,
        description: channelLabel,
      });
      onOpenChange(false);
      onInvited?.();
    } catch (err) {
      toast({
        title: labels.failed,
        description: supabaseErrorMessage(err),
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        overlayClassName={light ? clubReadableModalOverlayClass : undefined}
        className={cn(
          "sm:max-w-md",
          light &&
            cn(
              clubReadableModalPanelClass,
              "gap-0 overflow-hidden p-0 text-neutral-900",
              "[&>button]:rounded-full [&>button]:text-neutral-500 [&>button]:opacity-100 [&>button]:hover:bg-neutral-100 [&>button]:hover:text-neutral-800",
            ),
        )}
      >
        <DialogHeader
          className={cn(light && "space-y-1 border-b border-neutral-200/80 px-5 py-4 text-left sm:text-left")}
        >
          <DialogTitle
            className={cn(
              "flex items-center gap-2",
              light && "font-display text-base font-semibold text-neutral-900",
            )}
          >
            <UserPlus className={cn("h-4 w-4", light && "text-[color:var(--club-primary)]")} />
            {labels.title}
          </DialogTitle>
          <DialogDescription className={cn(light && "text-sm leading-relaxed text-neutral-600")}>
            {labels.description.replace("{channel}", channelLabel)}
          </DialogDescription>
        </DialogHeader>

        <div className={cn(light ? "space-y-2 px-5 py-4" : undefined)}>
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={labels.searchPlaceholder}
            className={cn(
              light ? cn("mb-0 rounded-full", clubModalFormInputClass) : "mb-2",
            )}
          />

          <ScrollArea
            className={cn(
              "h-56 rounded-md border p-2",
              light
                ? "rounded-xl border-neutral-200/90 bg-neutral-50"
                : "border-border/60",
            )}
          >
            {loading ? (
              <div
                className={cn(
                  "flex h-full items-center justify-center",
                  light ? "text-neutral-500" : "text-muted-foreground",
                )}
              >
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            ) : candidates.length === 0 ? (
              <p
                className={cn(
                  "px-2 py-6 text-center text-sm",
                  light ? "text-neutral-500" : "text-muted-foreground",
                )}
              >
                {members.length === 0 ? labels.empty : labels.noneLeft}
              </p>
            ) : (
              <ul className="space-y-1">
                {candidates.map((member) => {
                  const checked = selected.has(member.id);
                  return (
                    <li key={member.id}>
                      <label
                        className={cn(
                          "flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5",
                          light
                            ? "text-neutral-900 hover:bg-white"
                            : "hover:bg-muted/50",
                        )}
                      >
                        <Checkbox
                          checked={checked}
                          onCheckedChange={() => toggle(member.id)}
                          className={
                            light
                              ? "rounded-full border-[color:var(--club-primary)] data-[state=checked]:bg-[color:var(--club-primary)] data-[state=checked]:text-[color:var(--club-primary-foreground)]"
                              : undefined
                          }
                        />
                        <span className="truncate text-sm">{member.display_name}</span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            )}
          </ScrollArea>
        </div>

        <DialogFooter
          className={cn(
            light && "gap-2 border-t border-neutral-200/80 bg-white/70 px-5 py-3 sm:justify-end sm:gap-2",
          )}
        >
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
            className={cn(
              light && "rounded-full text-neutral-700 hover:bg-neutral-100 hover:text-neutral-900",
            )}
          >
            {labels.cancel}
          </Button>
          <Button
            type="button"
            onClick={() => void submit()}
            disabled={submitting || selected.size === 0}
            className={cn(
              light &&
                "rounded-full bg-[color:var(--club-primary)] text-[color:var(--club-primary-foreground)] shadow-sm hover:brightness-110",
            )}
          >
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {labels.inviting}
              </>
            ) : (
              labels.invite
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
