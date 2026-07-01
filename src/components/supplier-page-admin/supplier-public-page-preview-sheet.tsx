import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { MarketplaceProviderProfileRow } from "@/lib/marketplace-models";
import { SupplierPublicPageBody } from "@/components/supplier-page-admin/supplier-public-page-body";
import { useLanguage } from "@/hooks/use-language";

interface SupplierPublicPagePreviewSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile: MarketplaceProviderProfileRow;
  categoryLabel: (key: string) => string;
}

export function SupplierPublicPagePreviewSheet({
  open,
  onOpenChange,
  profile,
  categoryLabel,
}: SupplierPublicPagePreviewSheetProps) {
  const { t } = useLanguage();
  const sp = t.supplierPortal;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto p-0 sm:max-w-xl">
        <SheetHeader className="border-b border-border/60 px-4 py-3 text-left">
          <SheetTitle>{sp.previewSheetTitle}</SheetTitle>
          <SheetDescription>{sp.previewSheetDesc}</SheetDescription>
        </SheetHeader>
        <SupplierPublicPageBody profile={profile} categoryLabel={categoryLabel} pageLabel={sp.publicPageBadge} />
      </SheetContent>
    </Sheet>
  );
}
