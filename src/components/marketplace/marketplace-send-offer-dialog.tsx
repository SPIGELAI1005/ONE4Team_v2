import { useEffect, useState } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLanguage } from "@/hooks/use-language";
import { useToast } from "@/hooks/use-toast";
import { createMarketplaceOffer } from "@/hooks/use-marketplace";
import { parseIncludedServices } from "@/lib/marketplace-offer-utils";
import type {
  MarketplaceProviderProfileRow,
  MarketplaceProviderType,
  MarketplaceRequestRow,
} from "@/lib/marketplace-models";

const CURRENCIES = ["EUR", "CHF", "GBP", "USD"] as const;

interface MarketplaceSendOfferDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  request: MarketplaceRequestRow | null;
  profile: MarketplaceProviderProfileRow | null;
  providerType: MarketplaceProviderType;
  onSent: () => void;
}

export function MarketplaceSendOfferDialog({
  open,
  onOpenChange,
  request,
  profile,
  providerType,
  onSent,
}: MarketplaceSendOfferDialogProps) {
  const { t } = useLanguage();
  const m = t.marketplacePage;
  const o = m.provider.offerDialog;
  const { toast } = useToast();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [currency, setCurrency] = useState<string>("EUR");
  const [timeline, setTimeline] = useState("");
  const [includedServices, setIncludedServices] = useState("");
  const [notes, setNotes] = useState("");
  const [attachmentUrls, setAttachmentUrls] = useState<string[]>([""]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !request) return;
    setTitle(`Offer: ${request.title}`);
    setDescription("");
    setPrice("");
    setCurrency("EUR");
    setTimeline("");
    setIncludedServices("");
    setNotes("");
    setAttachmentUrls([""]);
  }, [open, request]);

  const handleSend = async (asDraft: boolean) => {
    if (!request || !profile) return;
    if (!title.trim()) {
      toast({ title: t.common.error, description: o.titleRequired, variant: "destructive" });
      return;
    }
    setSaving(true);
    const { error } = await createMarketplaceOffer({
      requestId: request.id,
      providerProfileId: profile.id,
      providerRole: providerType,
      title,
      description,
      priceIndication: price,
      currency,
      deliveryTimeline: timeline,
      includedServices: parseIncludedServices(includedServices),
      notes,
      attachmentUrls: attachmentUrls.filter((url) => url.trim()),
      asDraft,
    });
    setSaving(false);
    if (error) {
      toast({ title: t.common.error, description: error.message, variant: "destructive" });
      return;
    }
    onOpenChange(false);
    onSent();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{o.title}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 py-2">
          <Field label={o.fields.title}>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </Field>
          <Field label={o.fields.description}>
            <Textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
          </Field>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label={o.fields.price} className="sm:col-span-2">
              <Input
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder={o.placeholders.price}
              />
            </Field>
            <Field label={o.fields.currency}>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((code) => (
                    <SelectItem key={code} value={code}>
                      {code}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>
          <Field label={o.fields.timeline}>
            <Input
              value={timeline}
              onChange={(e) => setTimeline(e.target.value)}
              placeholder={o.placeholders.timeline}
            />
          </Field>
          <Field label={o.fields.includedServices}>
            <Textarea
              rows={2}
              value={includedServices}
              onChange={(e) => setIncludedServices(e.target.value)}
              placeholder={o.placeholders.includedServices}
            />
          </Field>
          <Field label={o.fields.notes}>
            <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </Field>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>{o.fields.attachments}</Label>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setAttachmentUrls((prev) => [...prev, ""])}
              >
                <Plus className="mr-1 h-3.5 w-3.5" />
                {o.addAttachment}
              </Button>
            </div>
            {attachmentUrls.map((url, index) => (
              <div key={index} className="flex gap-2">
                <Input
                  placeholder="https://…"
                  value={url}
                  onChange={(e) => {
                    const next = [...attachmentUrls];
                    next[index] = e.target.value;
                    setAttachmentUrls(next);
                  }}
                />
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  disabled={attachmentUrls.length <= 1}
                  onClick={() => setAttachmentUrls(attachmentUrls.filter((_, i) => i !== index))}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" disabled={saving} onClick={() => onOpenChange(false)}>
            {t.common.cancel}
          </Button>
          <Button variant="secondary" disabled={saving || !profile} onClick={() => void handleSend(true)}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : o.saveDraft}
          </Button>
          <Button disabled={saving || !profile} onClick={() => void handleSend(false)}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : m.provider.sendOffer}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <div className="space-y-2">
        <Label>{label}</Label>
        {children}
      </div>
    </div>
  );
}
