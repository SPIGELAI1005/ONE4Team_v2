import { useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useLanguage } from "@/hooks/use-language";
import { useToast } from "@/hooks/use-toast";
import { inviteProvidersToRequest } from "@/hooks/use-marketplace";
import type {
  MarketplaceProviderProfileRow,
  MarketplaceRequestRow,
  MarketplaceSavedProviderRow,
} from "@/lib/marketplace-models";
import { PARTNER_PANEL_CLASS } from "@/lib/partner-workflow-ui";
import { cn } from "@/lib/utils";

interface MarketplaceInviteProvidersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  request: MarketplaceRequestRow | null;
  providers: MarketplaceProviderProfileRow[];
  saved: MarketplaceSavedProviderRow[];
  onInvited: () => void;
}

export function MarketplaceInviteProvidersDialog({
  open,
  onOpenChange,
  request,
  providers,
  saved,
  onInvited,
}: MarketplaceInviteProvidersDialogProps) {
  const { t } = useLanguage();
  const m = t.marketplacePage;
  const r = m.club.requests;
  const { toast } = useToast();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  const savedProviders = useMemo(() => {
    const ids = new Set(saved.map((s) => s.provider_profile_id));
    return providers.filter((p) => ids.has(p.id));
  }, [providers, saved]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleInvite = async () => {
    if (!request) return;
    setSaving(true);
    const { error } = await inviteProvidersToRequest(request.id, Array.from(selected));
    setSaving(false);
    if (error) {
      toast({ title: t.common.error, description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: r.invitedToast });
    setSelected(new Set());
    onOpenChange(false);
    onInvited();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-md overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{r.inviteTitle}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">{r.inviteDesc}</p>

        {savedProviders.length === 0 ? (
          <p className="text-sm text-muted-foreground">{r.inviteEmpty}</p>
        ) : (
          <div className="space-y-2 py-2">
            {savedProviders.map((provider) => (
              <label
                key={provider.id}
                className={cn(PARTNER_PANEL_CLASS, "flex cursor-pointer items-center gap-3 p-3")}
              >
                <Checkbox
                  checked={selected.has(provider.id)}
                  onCheckedChange={() => toggle(provider.id)}
                />
                <div className="min-w-0">
                  <div className="font-medium text-foreground">{provider.provider_name}</div>
                  <div className="text-xs text-muted-foreground">
                    {m.providerTypes[provider.provider_type]}
                  </div>
                </div>
              </label>
            ))}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t.common.cancel}
          </Button>
          <Button disabled={saving || selected.size === 0} onClick={() => void handleInvite()}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : r.inviteConfirm}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
