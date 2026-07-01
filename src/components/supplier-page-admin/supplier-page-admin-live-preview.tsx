import { useMemo, useState, type ReactNode } from "react";
import { Monitor, Smartphone, Tablet } from "lucide-react";
import type { MarketplaceProviderProfileRow } from "@/lib/marketplace-models";
import { SupplierPublicPageBody } from "@/components/supplier-page-admin/supplier-public-page-body";
import { useLanguage } from "@/hooks/use-language";
import { cn } from "@/lib/utils";

type PreviewViewport = "desktop" | "tablet" | "mobile";

export interface SupplierPageAdminLivePreviewProps {
  profile: MarketplaceProviderProfileRow;
  categoryLabel: (key: string) => string;
}

export function SupplierPageAdminLivePreview({ profile, categoryLabel }: SupplierPageAdminLivePreviewProps) {
  const { t } = useLanguage();
  const sp = t.supplierPortal;
  const [viewport, setViewport] = useState<PreviewViewport>("desktop");

  const frameClass = useMemo(() => {
    switch (viewport) {
      case "mobile":
        return "mx-auto w-full max-w-[390px]";
      case "tablet":
        return "mx-auto w-full max-w-[768px]";
      default:
        return "w-full";
    }
  }, [viewport]);

  return (
    <section className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-sm font-semibold text-foreground sm:text-base">{sp.livePreviewTitle}</h2>
          <p className="text-[11px] text-muted-foreground sm:text-xs">{sp.livePreviewDesc}</p>
        </div>
        <div className="flex items-center gap-1 rounded-xl border border-border/60 bg-muted/30 p-1">
          <ViewportButton active={viewport === "desktop"} onClick={() => setViewport("desktop")} label={sp.viewportDesktop}>
            <Monitor className="h-3.5 w-3.5" />
          </ViewportButton>
          <ViewportButton active={viewport === "tablet"} onClick={() => setViewport("tablet")} label={sp.viewportTablet}>
            <Tablet className="h-3.5 w-3.5" />
          </ViewportButton>
          <ViewportButton active={viewport === "mobile"} onClick={() => setViewport("mobile")} label={sp.viewportMobile}>
            <Smartphone className="h-3.5 w-3.5" />
          </ViewportButton>
        </div>
      </div>

      <div className="overflow-hidden rounded-3xl border border-border/60 bg-muted/20 shadow-inner">
        <div className={cn("overflow-hidden rounded-[inherit] bg-background", frameClass)}>
          <SupplierPublicPageBody
            profile={profile}
            categoryLabel={categoryLabel}
            compact={viewport !== "desktop"}
            pageLabel={sp.publicPageBadge}
          />
        </div>
      </div>
    </section>
  );
}

function ViewportButton({
  active,
  onClick,
  label,
  children,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className={cn(
        "flex h-8 w-8 items-center justify-center rounded-lg transition-colors",
        active ? "bg-background text-primary shadow-sm" : "text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}
