import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useLanguage } from "@/hooks/use-language";
import { MARKETPLACE_CATEGORIES, type MarketplaceProviderType } from "@/lib/marketplace-models";
import type { MarketplaceListingDraft } from "@/lib/marketplace-listing-draft";
import { providerListingSectionLabels } from "@/lib/marketplace-listing-structure";
import { PARTNER_PANEL_CLASS } from "@/lib/partner-workflow-ui";
import { cn } from "@/lib/utils";

interface ProviderServicesEditorProps {
  providerType: MarketplaceProviderType;
  draft: MarketplaceListingDraft;
  onChange: (patch: Partial<MarketplaceListingDraft>) => void;
  disabled?: boolean;
}

export function ProviderServicesEditor({
  providerType,
  draft,
  onChange,
  disabled,
}: ProviderServicesEditorProps) {
  const { t } = useLanguage();
  const m = t.marketplacePage;
  const sections = providerListingSectionLabels(providerType);

  const categoryLabel = (key: string) =>
    (m.categories as Record<string, string>)[key] ?? key.replace(/_/g, " ");

  const toggleCategory = (cat: string) => {
    onChange({
      categories: draft.categories.includes(cat)
        ? draft.categories.filter((c) => c !== cat)
        : [...draft.categories, cat],
    });
  };

  const addPackage = () => {
    onChange({
      packages: [
        ...draft.packages,
        { id: `pkg-${Date.now()}`, name: "", description: "", priceIndication: "" },
      ],
    });
  };

  const updatePackage = (id: string, patch: { name?: string; description?: string; priceIndication?: string }) => {
    onChange({
      packages: draft.packages.map((pkg) => (pkg.id === id ? { ...pkg, ...patch } : pkg)),
    });
  };

  const removePackage = (id: string) => {
    onChange({ packages: draft.packages.filter((pkg) => pkg.id !== id) });
  };

  const addDocument = () => {
    onChange({ document_urls: [...draft.document_urls, ""] });
  };

  const updateDocument = (index: number, url: string) => {
    const next = [...draft.document_urls];
    next[index] = url;
    onChange({ document_urls: next });
  };

  const removeDocument = (index: number) => {
    onChange({ document_urls: draft.document_urls.filter((_, i) => i !== index) });
  };

  const referencesText = draft.references.join("\n");
  const setReferencesFromText = (text: string) => {
    onChange({
      references: text
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean),
    });
  };

  return (
    <div className="space-y-4">
      <section className={cn(PARTNER_PANEL_CLASS, "space-y-3 p-5")}>
        <h3 className="font-display text-lg font-semibold text-foreground">{m.provider.fields.categories}</h3>
        <div className="flex flex-wrap gap-2">
          {MARKETPLACE_CATEGORIES.map((cat) => (
            <Button
              key={cat}
              type="button"
              size="sm"
              disabled={disabled}
              variant={draft.categories.includes(cat) ? "default" : "outline"}
              onClick={() => toggleCategory(cat)}
            >
              {categoryLabel(cat)}
            </Button>
          ))}
        </div>
      </section>

      <section className={cn(PARTNER_PANEL_CLASS, "space-y-3 p-5")}>
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="font-display text-lg font-semibold text-foreground">{sections.packages}</h3>
            <p className="mt-1 text-xs text-muted-foreground">{sections.packagesHint}</p>
          </div>
          <Button type="button" size="sm" variant="outline" disabled={disabled} onClick={addPackage}>
            <Plus className="mr-1 h-4 w-4" />
            {m.provider.listing.addPackage}
          </Button>
        </div>
        {draft.packages.length === 0 ? (
          <p className="text-sm text-muted-foreground">{m.provider.listing.noPackagesYet}</p>
        ) : (
          <div className="space-y-3">
            {draft.packages.map((pkg) => (
              <div key={pkg.id} className="rounded-xl border border-border/60 bg-background/60 p-3 space-y-2">
                <div className="flex justify-end">
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    disabled={disabled}
                    className="h-8 w-8"
                    onClick={() => removePackage(pkg.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <div className="grid gap-2 md:grid-cols-2">
                  <div className="space-y-1">
                    <Label>{m.provider.listing.packageName}</Label>
                    <Input
                      disabled={disabled}
                      value={pkg.name}
                      onChange={(e) => updatePackage(pkg.id, { name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>{m.provider.listing.packagePrice}</Label>
                    <Input
                      disabled={disabled}
                      value={pkg.priceIndication ?? ""}
                      onChange={(e) => updatePackage(pkg.id, { priceIndication: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1 md:col-span-2">
                    <Label>{m.provider.listing.packageDescription}</Label>
                    <Textarea
                      rows={2}
                      disabled={disabled}
                      value={pkg.description ?? ""}
                      onChange={(e) => updatePackage(pkg.id, { description: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className={cn(PARTNER_PANEL_CLASS, "space-y-3 p-5")}>
        <div>
          <h3 className="font-display text-lg font-semibold text-foreground">{sections.roleNotes}</h3>
          <p className="mt-1 text-xs text-muted-foreground">{sections.roleNotesHint}</p>
        </div>
        <Textarea
          rows={3}
          disabled={disabled}
          value={draft.availability_notes}
          onChange={(e) => onChange({ availability_notes: e.target.value })}
        />
        <div className="space-y-1">
          <Label>{sections.priceIndication}</Label>
          <Input
            disabled={disabled}
            value={draft.price_indication}
            onChange={(e) => onChange({ price_indication: e.target.value })}
          />
        </div>
      </section>

      <section className={cn(PARTNER_PANEL_CLASS, "space-y-3 p-5")}>
        <div>
          <h3 className="font-display text-lg font-semibold text-foreground">{sections.references}</h3>
          <p className="mt-1 text-xs text-muted-foreground">{sections.referencesHint}</p>
        </div>
        <Textarea
          rows={4}
          disabled={disabled}
          value={referencesText}
          onChange={(e) => setReferencesFromText(e.target.value)}
        />
      </section>

      <section className={cn(PARTNER_PANEL_CLASS, "space-y-3 p-5")}>
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="font-display text-lg font-semibold text-foreground">{sections.documents}</h3>
            <p className="mt-1 text-xs text-muted-foreground">{sections.documentsHint}</p>
          </div>
          <Button type="button" size="sm" variant="outline" disabled={disabled} onClick={addDocument}>
            <Plus className="mr-1 h-4 w-4" />
            {m.provider.listing.addDocument}
          </Button>
        </div>
        {draft.document_urls.length === 0 ? (
          <p className="text-sm text-muted-foreground">{m.provider.listing.noDocumentsYet}</p>
        ) : (
          <div className="space-y-2">
            {draft.document_urls.map((url, index) => (
              <div key={index} className="flex gap-2">
                <Input
                  disabled={disabled}
                  placeholder="https://…"
                  value={url}
                  onChange={(e) => updateDocument(index, e.target.value)}
                />
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  disabled={disabled}
                  onClick={() => removeDocument(index)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
