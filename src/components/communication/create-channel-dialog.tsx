import { useEffect, useMemo, useState } from "react";
import { Hash, Loader2, Plus } from "lucide-react";
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
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { supabaseErrorMessage } from "@/lib/supabase-error-message";
import { useToast } from "@/hooks/use-toast";
import type { ChannelInviteMemberOption } from "@/components/communication/channel-invite-dialog";

interface CreateChannelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clubId: string;
  currentUserId: string;
  labels: {
    title: string;
    description: string;
    nameLabel: string;
    namePlaceholder: string;
    membersLabel: string;
    searchPlaceholder: string;
    create: string;
    creating: string;
    empty: string;
    success: string;
    failed: string;
    nameRequired: string;
    cancel: string;
  };
  onCreated?: (channel: { id: string; name: string }) => void;
}

export function CreateChannelDialog({
  open,
  onOpenChange,
  clubId,
  currentUserId,
  labels,
  onCreated,
}: CreateChannelDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [name, setName] = useState("");
  const [members, setMembers] = useState<ChannelInviteMemberOption[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [ownMembershipId, setOwnMembershipId] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !clubId) return;
    let cancelled = false;
    setLoading(true);
    setName("");
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
        if (cancelled) return;

        const mapped: ChannelInviteMemberOption[] = (membersRes.data || []).map((row) => {
          const profile = row.profiles as { display_name?: string | null } | null;
          return {
            id: row.id,
            user_id: row.user_id,
            display_name: profile?.display_name?.trim() || row.user_id || row.id,
          };
        });

        const own = mapped.find((member) => member.user_id === currentUserId) ?? null;
        setOwnMembershipId(own?.id ?? null);
        setMembers(mapped.filter((member) => member.user_id !== currentUserId));
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
  }, [clubId, currentUserId, labels.failed, open, toast]);

  const candidates = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return members;
    return members.filter((member) => member.display_name.toLowerCase().includes(q));
  }, [members, search]);

  const toggle = (membershipId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(membershipId)) next.delete(membershipId);
      else next.add(membershipId);
      return next;
    });
  };

  const submit = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      toast({ title: labels.nameRequired, variant: "destructive" });
      return;
    }
    if (!ownMembershipId) {
      toast({
        title: labels.failed,
        description: "Missing club membership for current user.",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      const { data: channel, error: channelError } = await supabase
        .from("message_channels")
        .insert({
          club_id: clubId,
          name: trimmed,
          created_by: currentUserId,
        })
        .select("id, name")
        .single();

      if (channelError) throw channelError;

      const memberRows = [
        {
          club_id: clubId,
          membership_id: ownMembershipId,
          custom_channel_id: channel.id,
          system_channel_key: null,
          role: "owner" as const,
          invited_by: currentUserId,
        },
        ...Array.from(selected).map((membershipId) => ({
          club_id: clubId,
          membership_id: membershipId,
          custom_channel_id: channel.id,
          system_channel_key: null,
          role: "member" as const,
          invited_by: currentUserId,
        })),
      ];

      const { error: membersError } = await supabase.from("message_channel_members").insert(memberRows);
      if (membersError) {
        await supabase.from("message_channels").delete().eq("id", channel.id);
        throw membersError;
      }

      toast({ title: labels.success, description: channel.name });
      onOpenChange(false);
      onCreated?.(channel);
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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            {labels.title}
          </DialogTitle>
          <DialogDescription>{labels.description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="new-channel-name">{labels.nameLabel}</Label>
            <div className="relative">
              <Hash className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="new-channel-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder={labels.namePlaceholder}
                className="pl-8"
                maxLength={80}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>{labels.membersLabel}</Label>
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={labels.searchPlaceholder}
            />
            <ScrollArea className="h-48 rounded-md border border-border/60 p-2">
              {loading ? (
                <div className="flex h-full items-center justify-center text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              ) : candidates.length === 0 ? (
                <p className="px-2 py-6 text-center text-sm text-muted-foreground">{labels.empty}</p>
              ) : (
                <ul className="space-y-1">
                  {candidates.map((member) => {
                    const checked = selected.has(member.id);
                    return (
                      <li key={member.id}>
                        <label className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-muted/50">
                          <Checkbox checked={checked} onCheckedChange={() => toggle(member.id)} />
                          <span className="truncate text-sm">{member.display_name}</span>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              )}
            </ScrollArea>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={submitting}>
            {labels.cancel}
          </Button>
          <Button type="button" onClick={() => void submit()} disabled={submitting || !name.trim()}>
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {labels.creating}
              </>
            ) : (
              labels.create
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
