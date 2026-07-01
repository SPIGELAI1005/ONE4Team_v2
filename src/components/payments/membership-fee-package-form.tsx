import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/hooks/use-language";
import {
  formatPackageMoney,
  getPackageTotal,
  parsePriceComponents,
  sumPriceComponents,
  type FeeInterval,
  type FeeKind,
  type MemberCategory,
  type MembershipFeePackage,
  type PriceComponent,
} from "@/lib/membership-fee-packages";

const CURRENCIES = ["EUR", "CHF", "USD", "GBP"] as const;

interface ComponentRow {
  key: string;
  label: string;
  amount: string;
}

function emptyComponentRow(): ComponentRow {
  return { key: crypto.randomUUID(), label: "", amount: "" };
}

function packageToForm(pkg: MembershipFeePackage) {
  const components = parsePriceComponents(pkg.price_components);
  const useComponents = components.length > 0;
  return {
    name: pkg.name,
    currency: (pkg.currency || "EUR").toUpperCase(),
    interval: (pkg.interval || "yearly") as FeeInterval,
    feeKind: (pkg.fee_kind || "membership") as FeeKind,
    memberCategory: (pkg.member_category || "none") as MemberCategory,
    notes: pkg.description || "",
    useComponents,
    simpleAmount: useComponents ? "" : String(pkg.amount ?? ""),
    components: useComponents
      ? components.map((c) => ({ key: crypto.randomUUID(), label: c.label, amount: String(c.amount) }))
      : [emptyComponentRow()],
  };
}

const defaultForm = () => ({
  name: "",
  currency: "EUR",
  interval: "yearly" as FeeInterval,
  feeKind: "membership" as FeeKind,
  memberCategory: "youth" as MemberCategory,
  notes: "",
  useComponents: false,
  simpleAmount: "",
  components: [emptyComponentRow()],
});

interface MembershipFeePackageFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clubId: string;
  editingPackage: MembershipFeePackage | null;
  onSaved: (pkg: MembershipFeePackage) => void;
}

export function MembershipFeePackageFormDialog({
  open,
  onOpenChange,
  clubId,
  editingPackage,
  onSaved,
}: MembershipFeePackageFormDialogProps) {
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const [form, setForm] = useState(defaultForm);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm(editingPackage ? packageToForm(editingPackage) : defaultForm());
  }, [open, editingPackage]);

  const parsedComponents = useMemo((): PriceComponent[] => {
    if (!form.useComponents) return [];
    return form.components
      .map((row) => {
        const label = row.label.trim();
        const amount = Number(row.amount.replace(",", "."));
        if (!label || !Number.isFinite(amount) || amount < 0) return null;
        return { label, amount };
      })
      .filter((row): row is PriceComponent => row !== null);
  }, [form.components, form.useComponents]);

  const totalAmount = form.useComponents ? sumPriceComponents(parsedComponents) : Number(form.simpleAmount.replace(",", "."));

  const isValid =
    form.name.trim().length > 0 &&
    Number.isFinite(totalAmount) &&
    totalAmount > 0 &&
    (!form.useComponents || parsedComponents.length > 0);

  const handleSubmit = async () => {
    if (!isValid) return;
    setSubmitting(true);

    const payload = {
      name: form.name.trim(),
      amount: totalAmount,
      currency: form.currency,
      interval: form.interval,
      description: form.notes.trim() || null,
      fee_kind: form.feeKind,
      member_category: form.memberCategory === "none" ? null : form.memberCategory,
      price_components: form.useComponents ? parsedComponents : [],
      is_active: true,
    };

    if (editingPackage) {
      const { data, error } = await supabase
        .from("membership_fee_types")
        .update(payload)
        .eq("club_id", clubId)
        .eq("id", editingPackage.id)
        .select()
        .single();
      setSubmitting(false);
      if (error) {
        toast({ title: t.common.error, description: error.message, variant: "destructive" });
        return;
      }
      onSaved(data as MembershipFeePackage);
      onOpenChange(false);
      toast({ title: t.payments.feeTypeUpdated });
      return;
    }

    const { data, error } = await supabase
      .from("membership_fee_types")
      .insert({ club_id: clubId, ...payload })
      .select()
      .single();
    setSubmitting(false);
    if (error) {
      toast({ title: t.common.error, description: error.message, variant: "destructive" });
      return;
    }
    onSaved(data as MembershipFeePackage);
    onOpenChange(false);
    toast({ title: t.payments.feeTypeCreated });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="font-display">
            {editingPackage ? t.payments.editFeeType : t.payments.addFeeType}
          </DialogTitle>
          <DialogDescription>{t.payments.packageFormDesc}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="pkg-name">{t.payments.packageNameRequired}</Label>
            <Input
              id="pkg-name"
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              placeholder={t.payments.packageNamePlaceholder}
              maxLength={120}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>{t.payments.currency}</Label>
              <Select value={form.currency} onValueChange={(v) => setForm((prev) => ({ ...prev, currency: v }))}>
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
            </div>
            <div className="space-y-1.5">
              <Label>{t.payments.billingType}</Label>
              <Select
                value={form.interval}
                onValueChange={(v) => setForm((prev) => ({ ...prev, interval: v as FeeInterval }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">{t.payments.intervalPerMonth}</SelectItem>
                  <SelectItem value="quarterly">{t.payments.intervalPerQuarter}</SelectItem>
                  <SelectItem value="yearly">{t.payments.intervalPerYear}</SelectItem>
                  <SelectItem value="one_time">{t.payments.intervalOneTime}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>{t.payments.feeCategory}</Label>
              <Select value={form.feeKind} onValueChange={(v) => setForm((prev) => ({ ...prev, feeKind: v as FeeKind }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="membership">{t.payments.feeCategoryMembership}</SelectItem>
                  <SelectItem value="levy">{t.payments.feeCategoryLevy}</SelectItem>
                  <SelectItem value="joining">{t.payments.feeCategoryJoining}</SelectItem>
                  <SelectItem value="other">{t.payments.feeCategoryOther}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{t.payments.memberCategory}</Label>
              <Select
                value={form.memberCategory}
                onValueChange={(v) => setForm((prev) => ({ ...prev, memberCategory: v as MemberCategory }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="youth">{t.payments.memberCategoryYouth}</SelectItem>
                  <SelectItem value="adult">{t.payments.memberCategoryAdult}</SelectItem>
                  <SelectItem value="senior">{t.payments.memberCategorySenior}</SelectItem>
                  <SelectItem value="shared">{t.payments.memberCategoryShared}</SelectItem>
                  <SelectItem value="none">{t.payments.memberCategoryNone}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="pkg-notes">{t.payments.notesRemarks}</Label>
            <Textarea
              id="pkg-notes"
              value={form.notes}
              onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
              placeholder={t.payments.notesRemarksPlaceholder}
              rows={3}
              maxLength={500}
            />
          </div>

          <div className="rounded-xl border border-border p-4 space-y-3 bg-muted/20">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-medium">{t.payments.priceComponents}</div>
                <div className="text-xs text-muted-foreground">{t.payments.priceComponentsHint}</div>
              </div>
              <Switch
                checked={form.useComponents}
                onCheckedChange={(checked) =>
                  setForm((prev) => ({
                    ...prev,
                    useComponents: checked,
                    components: checked && prev.components.length === 0 ? [emptyComponentRow()] : prev.components,
                  }))
                }
              />
            </div>

            {form.useComponents ? (
              <div className="space-y-2">
                {form.components.map((row, index) => (
                  <div key={row.key} className="flex gap-2 items-start">
                    <Input
                      className="flex-1"
                      placeholder={t.payments.componentLabel}
                      value={row.label}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          components: prev.components.map((c, i) =>
                            i === index ? { ...c, label: e.target.value } : c,
                          ),
                        }))
                      }
                    />
                    <Input
                      className="w-28"
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder={t.payments.componentAmount}
                      value={row.amount}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          components: prev.components.map((c, i) =>
                            i === index ? { ...c, amount: e.target.value } : c,
                          ),
                        }))
                      }
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="shrink-0"
                      disabled={form.components.length <= 1}
                      onClick={() =>
                        setForm((prev) => ({
                          ...prev,
                          components: prev.components.filter((_, i) => i !== index),
                        }))
                      }
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setForm((prev) => ({
                      ...prev,
                      components: [...prev.components, emptyComponentRow()],
                    }))
                  }
                >
                  <Plus className="w-4 h-4 mr-1" /> {t.payments.addPriceComponent}
                </Button>
              </div>
            ) : (
              <div className="space-y-1.5">
                <Label htmlFor="pkg-amount">{t.payments.simpleAmount}</Label>
                <Input
                  id="pkg-amount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.simpleAmount}
                  onChange={(e) => setForm((prev) => ({ ...prev, simpleAmount: e.target.value }))}
                  placeholder="0.00"
                />
              </div>
            )}

            <div className="flex items-center justify-between pt-2 border-t border-border">
              <span className="text-sm text-muted-foreground">{t.payments.totalPrice}</span>
              <span className="text-lg font-display font-bold text-primary">
                {Number.isFinite(totalAmount) && totalAmount > 0
                  ? formatPackageMoney(totalAmount, form.currency, language)
                  : "-"}
              </span>
            </div>
            {form.useComponents && parsedComponents.length > 0 && (
              <ul className="text-xs text-muted-foreground space-y-0.5">
                {parsedComponents.map((row) => (
                  <li key={row.label}>
                    {row.label}: {formatPackageMoney(row.amount, form.currency, language)}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <Button
            className="w-full bg-gradient-gold-static text-primary-foreground hover:brightness-110"
            disabled={!isValid || submitting}
            onClick={() => void handleSubmit()}
          >
            {editingPackage ? t.payments.saveFeeType : t.payments.createFeeType}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
