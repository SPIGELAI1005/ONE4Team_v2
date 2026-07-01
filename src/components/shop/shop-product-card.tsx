import { motion } from "framer-motion";
import { ExternalLink, Leaf, ShoppingBag, Edit2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { parseProductImageUrls } from "@/lib/shop-product-images";
import {
  formatShopPrice,
  parseShopProductMeta,
  shopProductSizeHint,
} from "@/lib/shop-product-display";

export interface ShopProductCardProduct {
  id: string;
  name: string;
  description: string | null;
  price_eur: number;
  price_max_eur?: number | null;
  stock: number;
  image_url: string | null;
  image_urls?: unknown;
  external_url?: string | null;
  product_meta?: unknown;
}

interface ShopProductCardProps {
  product: ShopProductCardProduct;
  categoryName: string;
  index?: number;
  locale: string;
  canManage?: boolean;
  labels: {
    brand: string;
    inStock: string;
    outOfStock: string;
    sustainable: string;
    priceFrom: string;
    orderAtJako: string;
    editProduct: string;
  };
  onEdit?: () => void;
  onDelete?: () => void;
}

const COLOR_DOT: Record<string, string> = {
  Grün: "bg-emerald-600",
  Schwarz: "bg-neutral-900",
  Weiß: "bg-white border border-border/80",
  Grau: "bg-neutral-400",
};

export function ShopProductCard({
  product,
  categoryName,
  index = 0,
  locale,
  canManage,
  labels,
  onEdit,
  onDelete,
}: ShopProductCardProps) {
  const meta = parseShopProductMeta(product.product_meta);
  const thumb = product.image_url || parseProductImageUrls(product)[0];
  const price = formatShopPrice(product.price_eur, product.price_max_eur, meta, locale, labels.priceFrom);
  const sizeHint = shopProductSizeHint(meta);
  const colors = meta?.colors ?? [];

  return (
    <motion.article
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
      className="rounded-3xl border border-border/60 bg-card/40 backdrop-blur-2xl overflow-hidden flex flex-col"
    >
      <div className="relative w-full aspect-[4/3] overflow-hidden bg-gradient-to-br from-primary/5 to-muted/25">
        {thumb ? (
          <img
            src={thumb}
            alt={product.name}
            className="h-full w-full object-cover object-center"
            loading="lazy"
            decoding="async"
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
            <ShoppingBag className="w-10 h-10 text-primary/30" />
            {meta?.brand ? (
              <span className="text-[10px] font-semibold tracking-widest text-muted-foreground/80 uppercase">
                {meta.brand}
              </span>
            ) : null}
          </div>
        )}
        {meta?.sustainable ? (
          <span className="absolute top-3 left-3 inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:text-emerald-300">
            <Leaf className="w-3 h-3" />
            {labels.sustainable}
          </span>
        ) : null}
      </div>

      <div className="p-4 flex flex-col flex-1">
        <div className="flex items-start justify-between gap-2">
          <span className="text-[10px] px-2 py-0.5 rounded-full border border-border/60 bg-background/40 text-muted-foreground shrink-0">
            {categoryName}
          </span>
          {meta?.brand ? (
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">{meta.brand}</span>
          ) : null}
        </div>

        <h3 className="mt-1.5 font-display font-bold text-foreground text-sm leading-snug">{product.name}</h3>

        {colors.length > 0 ? (
          <div className="mt-2 flex items-center gap-1.5" aria-label={colors.join(", ")}>
            {colors.map((color) => (
              <span
                key={color}
                title={color}
                className={`w-3.5 h-3.5 rounded-full shrink-0 ${COLOR_DOT[color] ?? "bg-muted border border-border/60"}`}
              />
            ))}
          </div>
        ) : null}

        {sizeHint ? <p className="text-[11px] text-muted-foreground mt-1.5">{sizeHint}</p> : null}

        <p className="text-xs text-muted-foreground mt-1 line-clamp-2 flex-1">{product.description}</p>

        <div className="flex items-end justify-between mt-3 gap-2">
          <div>
            <div className="font-display font-bold text-foreground text-lg leading-none">{price.primary}</div>
            {price.secondary ? (
              <div className="text-[11px] text-muted-foreground line-through mt-0.5">{price.secondary}</div>
            ) : null}
          </div>
          <span
            className={`text-[10px] px-2 py-0.5 rounded-full border shrink-0 ${
              product.stock > 0
                ? "text-green-600 bg-green-500/10 border-green-500/20"
                : "text-red-500 bg-red-500/10 border-red-500/20"
            }`}
          >
            {product.stock > 0 ? labels.inStock : labels.outOfStock}
          </span>
        </div>

        {product.external_url ? (
          <a
            href={product.external_url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex items-center gap-1.5 text-[11px] font-medium text-primary hover:underline"
          >
            <ExternalLink className="w-3 h-3" />
            {labels.orderAtJako}
          </a>
        ) : null}

        {canManage && (onEdit || onDelete) ? (
          <div className="flex gap-2 mt-3 pt-3 border-t border-border/60">
            {onEdit ? (
              <Button variant="ghost" size="sm" className="min-h-11 flex-1 text-xs touch-manipulation" onClick={onEdit}>
                <Edit2 className="w-3.5 h-3.5 mr-1" /> {labels.editProduct}
              </Button>
            ) : null}
            {onDelete ? (
              <Button
                variant="ghost"
                size="sm"
                className="min-h-11 min-w-11 shrink-0 text-xs text-destructive touch-manipulation"
                onClick={onDelete}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>
    </motion.article>
  );
}
