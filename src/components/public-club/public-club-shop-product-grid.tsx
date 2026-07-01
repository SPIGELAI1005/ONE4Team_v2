import { ShoppingBag } from "lucide-react";
import { PublicClubCard } from "@/components/public-club/public-club-card";
import { parseProductImageUrls } from "@/lib/shop-product-images";
import { formatShopPrice, parseShopProductMeta } from "@/lib/shop-product-display";
import type { ShopProductLite } from "@/lib/public-club-models";

interface PublicClubShopProductGridProps {
  products: ShopProductLite[];
  priceLocale: string;
  priceFromLabel: string;
  externalOrderLabel: string;
}

export function PublicClubShopProductGrid({
  products,
  priceLocale,
  priceFromLabel,
  externalOrderLabel,
}: PublicClubShopProductGridProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {products.map((product) => {
        const thumb = product.image_url || parseProductImageUrls(product)[0];
        const meta = parseShopProductMeta(product.product_meta);
        const price = formatShopPrice(product.price_eur, product.price_max_eur, meta, priceLocale, priceFromLabel);

        return (
          <PublicClubCard key={product.id} padding="sm" className="flex h-full flex-col">
            <div className="relative mb-3 aspect-[4/3] overflow-hidden rounded-xl bg-[color:var(--club-muted)]/10">
              {thumb ? (
                <img src={thumb} alt="" className="h-full w-full object-cover" loading="lazy" />
              ) : (
                <div className="flex h-full items-center justify-center">
                  <ShoppingBag className="h-8 w-8 text-[color:var(--club-primary)]/40" />
                </div>
              )}
              {meta?.brand ? (
                <span className="absolute top-2 left-2 rounded-full bg-black/50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                  {meta.brand}
                </span>
              ) : null}
            </div>
            <h3 className="font-display text-sm font-bold text-[color:var(--club-foreground)] leading-snug">{product.name}</h3>
            {product.description ? (
              <p className="mt-1 line-clamp-2 text-xs text-[color:var(--club-muted)]">{product.description}</p>
            ) : null}
            <div className="mt-auto flex items-end justify-between gap-2 pt-3">
              <div>
                <div className="font-display text-lg font-bold text-[color:var(--club-foreground)]">{price.primary}</div>
                {price.secondary ? (
                  <div className="text-[11px] text-[color:var(--club-muted)] line-through">{price.secondary}</div>
                ) : null}
              </div>
              {product.external_url ? (
                <a
                  href={product.external_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 text-[10px] font-medium text-[color:var(--club-primary)] hover:underline"
                >
                  {externalOrderLabel}
                </a>
              ) : null}
            </div>
          </PublicClubCard>
        );
      })}
    </div>
  );
}
