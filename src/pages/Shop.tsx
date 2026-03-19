import { useCallback, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import AppHeader from "@/components/layout/AppHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ShoppingBag, Plus, Search, Package, Tag, Truck, Edit2, Trash2, X, Info, Loader2 } from "lucide-react";
import { usePermissions } from "@/hooks/use-permissions";
import { useLanguage } from "@/hooks/use-language";
import { useToast } from "@/hooks/use-toast";
import { useClubId } from "@/hooks/use-club-id";
import { supabaseDynamic } from "@/lib/supabase-dynamic";

interface Product {
  id: string;
  club_id: string;
  category_id: string | null;
  name: string;
  description: string;
  price_eur: number;
  stock: number;
  image_url: string | null;
  is_active: boolean;
}

interface Order {
  id: string;
  club_id: string;
  product_id: string;
  quantity: number;
  total_eur: number;
  status: "pending" | "confirmed" | "shipped" | "delivered" | "cancelled";
  ordered_at: string;
}

interface Category {
  id: string;
  club_id: string;
  name: string;
  is_active: boolean;
}

const FALLBACK_CATEGORIES = ["Jerseys", "Training Gear", "Fan Articles", "Accessories"];

export default function Shop() {
  const perms = usePermissions();
  const { t } = useLanguage();
  const { toast } = useToast();
  const { clubId, loading: clubLoading } = useClubId();
  const canManage = perms.isAdmin;

  const [tab, setTab] = useState<"products" | "orders" | "categories">("products");
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [schemaReady, setSchemaReady] = useState(true);

  const [q, setQ] = useState("");
  const [filterCat, setFilterCat] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [showCatForm, setShowCatForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [fName, setFName] = useState("");
  const [fDesc, setFDesc] = useState("");
  const [fPrice, setFPrice] = useState("");
  const [fCat, setFCat] = useState("");
  const [fStock, setFStock] = useState("");
  const [fImg, setFImg] = useState("");
  const [catName, setCatName] = useState("");

  const loadData = useCallback(async () => {
    if (!clubId) {
      setProducts([]);
      setOrders([]);
      setCategories([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [catRes, prodRes, ordRes] = await Promise.all([
        supabaseDynamic.from("shop_categories").select("id, club_id, name, is_active").eq("club_id", clubId).eq("is_active", true).order("name"),
        supabaseDynamic.from("shop_products").select("id, club_id, category_id, name, description, price_eur, stock, image_url, is_active").eq("club_id", clubId).order("created_at", { ascending: false }),
        supabaseDynamic.from("shop_orders").select("id, club_id, product_id, quantity, total_eur, status, ordered_at").eq("club_id", clubId).order("ordered_at", { ascending: false }),
      ]);
      if (catRes.error || prodRes.error || ordRes.error) throw new Error(catRes.error?.message || prodRes.error?.message || ordRes.error?.message);
      setCategories((catRes.data || []) as Category[]);
      setProducts((prodRes.data || []) as Product[]);
      setOrders((ordRes.data || []) as Order[]);
      setSchemaReady(true);
    } catch {
      setSchemaReady(false);
      setCategories([]);
      setProducts([]);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [clubId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const categoryNames = useMemo(() => {
    const fromDb = categories.map((c) => c.name);
    if (fromDb.length) return fromDb;
    return FALLBACK_CATEGORIES;
  }, [categories]);

  const categoryMap = useMemo(() => {
    const map = new Map<string, string>();
    categories.forEach((c) => map.set(c.id, c.name));
    return map;
  }, [categories]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return products.filter((p) => {
      const categoryName = p.category_id ? (categoryMap.get(p.category_id) || t.common.unknown) : t.common.unknown;
      const hitSearch = !s || `${p.name} ${p.description || ""} ${categoryName}`.toLowerCase().includes(s);
      const hitCategory = !filterCat || categoryName === filterCat;
      return hitSearch && hitCategory;
    });
  }, [products, q, filterCat, categoryMap, t.common.unknown]);

  const openAdd = () => {
    setEditId(null);
    setFName("");
    setFDesc("");
    setFPrice("");
    setFCat(categoryNames[0] || "");
    setFStock("");
    setFImg("");
    setShowForm(true);
  };

  const openEdit = (product: Product) => {
    setEditId(product.id);
    setFName(product.name);
    setFDesc(product.description || "");
    setFPrice(String(product.price_eur));
    setFCat(product.category_id ? (categoryMap.get(product.category_id) || "") : "");
    setFStock(String(product.stock));
    setFImg(product.image_url || "");
    setShowForm(true);
  };

  const saveProduct = async () => {
    if (!clubId || !fName.trim()) return;
    if (!schemaReady) {
      toast({ title: t.common.error, description: "Shop DB schema not available yet.", variant: "destructive" });
      return;
    }
    const category = categories.find((c) => c.name === fCat);
    const payload = {
      club_id: clubId,
      category_id: category?.id || null,
      name: fName.trim(),
      description: fDesc.trim() || null,
      price_eur: Number(fPrice || 0),
      stock: Number(fStock || 0),
      image_url: fImg.trim() || null,
      is_active: true,
      updated_at: new Date().toISOString(),
    };

    const req = editId
      ? supabaseDynamic.from("shop_products").update(payload).eq("id", editId).eq("club_id", clubId)
      : supabaseDynamic.from("shop_products").insert(payload);

    const { error } = await req;
    if (error) {
      toast({ title: t.common.error, description: error.message, variant: "destructive" });
      return;
    }
    setShowForm(false);
    await loadData();
  };

  const deleteProduct = async (id: string) => {
    if (!clubId || !schemaReady) return;
    const { error } = await supabaseDynamic.from("shop_products").delete().eq("id", id).eq("club_id", clubId);
    if (error) {
      toast({ title: t.common.error, description: error.message, variant: "destructive" });
      return;
    }
    await loadData();
  };

  const addCategory = async () => {
    if (!clubId || !catName.trim() || !schemaReady) return;
    const { error } = await supabaseDynamic.from("shop_categories").insert({ club_id: clubId, name: catName.trim(), is_active: true });
    if (error) {
      toast({ title: t.common.error, description: error.message, variant: "destructive" });
      return;
    }
    setCatName("");
    setShowCatForm(false);
    await loadData();
  };

  const updateOrderStatus = async (id: string) => {
    if (!clubId || !schemaReady) return;
    const current = orders.find((o) => o.id === id);
    if (!current) return;
    const next: Record<string, Order["status"]> = { pending: "confirmed", confirmed: "shipped", shipped: "delivered" };
    const nextStatus = next[current.status] || current.status;
    const { error } = await supabaseDynamic.from("shop_orders").update({ status: nextStatus, updated_at: new Date().toISOString() }).eq("id", id).eq("club_id", clubId);
    if (error) {
      toast({ title: t.common.error, description: error.message, variant: "destructive" });
      return;
    }
    await loadData();
  };

  const statusColor: Record<string, string> = {
    pending: "text-amber-500 bg-amber-500/10 border-amber-500/20",
    confirmed: "text-blue-500 bg-blue-500/10 border-blue-500/20",
    shipped: "text-purple-500 bg-purple-500/10 border-purple-500/20",
    delivered: "text-green-500 bg-green-500/10 border-green-500/20",
    cancelled: "text-red-500 bg-red-500/10 border-red-500/20",
  };

  const tabs = [
    { id: "products" as const, label: t.shopPage.tabs.products, icon: Package },
    { id: "orders" as const, label: t.shopPage.tabs.orders, icon: Truck },
    { id: "categories" as const, label: t.shopPage.tabs.categories, icon: Tag },
  ];

  return (
    <div className="min-h-screen bg-background">
      <AppHeader
        title={t.shopPage.title}
        subtitle={schemaReady ? t.shopPage.subtitle : `${t.shopPage.subtitle} (demo fallback)`}
        rightSlot={
          canManage && tab === "products" ? (
            <Button size="sm" className="bg-gradient-gold-static text-primary-foreground font-semibold hover:brightness-110" onClick={openAdd} disabled={!clubId}>
              <Plus className="w-4 h-4 mr-1" /> {t.shopPage.addProduct}
            </Button>
          ) : canManage && tab === "categories" ? (
            <Button size="sm" className="bg-gradient-gold-static text-primary-foreground font-semibold hover:brightness-110" onClick={() => setShowCatForm(true)} disabled={!clubId}>
              <Plus className="w-4 h-4 mr-1" /> {t.shopPage.addCategory}
            </Button>
          ) : null
        }
      />

      <div className="border-b border-border/60">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center gap-3 rounded-2xl bg-primary/5 border border-primary/10 px-4 py-3">
            <Info className="w-4 h-4 text-primary shrink-0" />
            <div>
              <div className="text-xs font-semibold text-foreground">{schemaReady ? "Live shop backend connected" : t.shopPage.comingSoon}</div>
              <div className="text-[11px] text-muted-foreground">{schemaReady ? "Products, categories, and orders are now loaded from Supabase tables." : t.shopPage.comingSoonDesc}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="border-b border-border/60">
        <div className="container mx-auto px-4 flex gap-1">
          {tabs.map((tb) => (
            <button
              key={tb.id}
              onClick={() => setTab(tb.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                tab === tb.id ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <tb.icon className="w-4 h-4" /> {tb.label}
            </button>
          ))}
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        {(clubLoading || loading) ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : !clubId ? (
          <div className="text-center py-20 text-muted-foreground">Select a club to access shop data.</div>
        ) : (
          <>
            {tab === "products" && (
              <div className="space-y-4">
                <div className="rounded-3xl border border-border/60 bg-card/40 backdrop-blur-2xl p-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Search className="w-4 h-4 text-muted-foreground shrink-0" />
                    <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t.shopPage.search} className="flex-1 min-w-[140px]" />
                    <select className="h-10 rounded-2xl border border-border/60 bg-background/50 px-3 text-sm" value={filterCat} onChange={(e) => setFilterCat(e.target.value)}>
                      <option value="">{t.shopPage.allCategories}</option>
                      {categoryNames.map((name) => <option key={name} value={name}>{name}</option>)}
                    </select>
                  </div>
                </div>

                {filtered.length === 0 ? (
                  <div className="text-center py-20">
                    <ShoppingBag className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h2 className="font-display text-xl font-bold text-foreground mb-2">{t.shopPage.noProducts}</h2>
                    <p className="text-muted-foreground">{t.shopPage.noProductsDesc}</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <AnimatePresence>
                      {filtered.map((p, i) => {
                        const categoryName = p.category_id ? (categoryMap.get(p.category_id) || t.common.unknown) : t.common.unknown;
                        return (
                          <motion.div key={p.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }} className="rounded-3xl border border-border/60 bg-card/40 backdrop-blur-2xl overflow-hidden">
                            <div className="h-36 bg-gradient-to-br from-primary/5 to-primary/10 flex items-center justify-center">
                              <ShoppingBag className="w-10 h-10 text-primary/30" />
                            </div>
                            <div className="p-4">
                              <span className="text-[10px] px-2 py-0.5 rounded-full border border-border/60 bg-background/40 text-muted-foreground">{categoryName}</span>
                              <h3 className="mt-1.5 font-display font-bold text-foreground text-sm">{p.name}</h3>
                              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{p.description}</p>
                              <div className="flex items-center justify-between mt-3">
                                <span className="font-display font-bold text-foreground text-lg">{Number(p.price_eur).toFixed(2)} &euro;</span>
                                <span className={`text-[10px] px-2 py-0.5 rounded-full border ${p.stock > 0 ? "text-green-600 bg-green-500/10 border-green-500/20" : "text-red-500 bg-red-500/10 border-red-500/20"}`}>
                                  {p.stock > 0 ? `${t.shopPage.inStock} (${p.stock})` : t.shopPage.outOfStock}
                                </span>
                              </div>
                              {canManage && (
                                <div className="flex gap-2 mt-3 pt-3 border-t border-border/60">
                                  <Button variant="ghost" size="sm" className="flex-1 text-xs" onClick={() => openEdit(p)}>
                                    <Edit2 className="w-3.5 h-3.5 mr-1" /> {t.shopPage.editProduct}
                                  </Button>
                                  <Button variant="ghost" size="sm" className="text-xs text-destructive" onClick={() => void deleteProduct(p.id)}>
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </Button>
                                </div>
                              )}
                            </div>
                          </motion.div>
                        );
                      })}
                    </AnimatePresence>
                  </div>
                )}
              </div>
            )}

            {tab === "orders" && (
              orders.length === 0 ? (
                <div className="text-center py-20">
                  <Truck className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h2 className="font-display text-xl font-bold text-foreground mb-2">{t.shopPage.noOrders}</h2>
                  <p className="text-muted-foreground">{t.shopPage.noOrdersDesc}</p>
                </div>
              ) : (
                <div className="grid gap-3">
                  {orders.map((o) => (
                    <div key={o.id} className="rounded-3xl border border-border/60 bg-card/40 backdrop-blur-2xl p-4">
                      <div className="flex items-center justify-between gap-3 flex-wrap">
                        <div className="font-display font-bold text-foreground text-sm">{products.find((p) => p.id === o.product_id)?.name || t.common.unknown}</div>
                        <div className="flex items-center gap-3">
                          <span className="font-display font-bold text-foreground">{Number(o.total_eur).toFixed(2)} &euro;</span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${statusColor[o.status] || statusColor.pending}`}>{t.shopPage.orderStatus[o.status] || o.status}</span>
                          {canManage && o.status !== "delivered" && (
                            <Button variant="ghost" size="sm" className="text-xs" onClick={() => void updateOrderStatus(o.id)}>
                              {t.shopPage.updateStatus}
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}

            {tab === "categories" && (
              categories.length === 0 ? (
                <div className="text-center py-20">
                  <Tag className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h2 className="font-display text-xl font-bold text-foreground mb-2">{t.shopPage.tabs.categories}</h2>
                  <p className="text-muted-foreground">{t.shopPage.noCategoriesDesc}</p>
                </div>
              ) : (
                <div className="grid gap-3">
                  {categories.map((c) => {
                    const count = products.filter((p) => p.category_id === c.id).length;
                    return (
                      <div key={c.id} className="rounded-3xl border border-border/60 bg-card/40 backdrop-blur-2xl p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-gradient-gold-subtle flex items-center justify-center">
                            <Tag className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <div className="font-display font-bold text-foreground text-sm">{c.name}</div>
                            <div className="text-xs text-muted-foreground">{count} {t.shopPage.productCount}</div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )
            )}
          </>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowForm(false)} />
          <div className="relative w-full max-w-lg rounded-3xl border border-border/60 bg-card/60 backdrop-blur-2xl p-5 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <div className="font-display font-bold text-foreground">{editId ? t.shopPage.editProduct : t.shopPage.addProduct}</div>
              <Button variant="ghost" size="icon" onClick={() => setShowForm(false)}><X className="w-4 h-4" /></Button>
            </div>
            <div className="grid gap-3">
              <div><div className="text-xs text-muted-foreground mb-1">{t.shopPage.productName}</div><Input value={fName} onChange={(e) => setFName(e.target.value)} /></div>
              <div><div className="text-xs text-muted-foreground mb-1">{t.shopPage.description}</div><Input value={fDesc} onChange={(e) => setFDesc(e.target.value)} /></div>
              <div className="grid grid-cols-2 gap-2">
                <div><div className="text-xs text-muted-foreground mb-1">{t.shopPage.price}</div><Input type="number" value={fPrice} onChange={(e) => setFPrice(e.target.value)} min="0" step="0.01" /></div>
                <div><div className="text-xs text-muted-foreground mb-1">{t.shopPage.stock}</div><Input type="number" value={fStock} onChange={(e) => setFStock(e.target.value)} min="0" /></div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1">{t.shopPage.category}</div>
                <select className="w-full h-10 rounded-2xl border border-border/60 bg-background/50 px-3 text-sm" value={fCat} onChange={(e) => setFCat(e.target.value)}>
                  {categoryNames.map((name) => <option key={name} value={name}>{name}</option>)}
                </select>
              </div>
              <div><div className="text-xs text-muted-foreground mb-1">{t.shopPage.imageUrl}</div><Input value={fImg} onChange={(e) => setFImg(e.target.value)} placeholder="https://..." /></div>
              <Button className="bg-gradient-gold-static text-primary-foreground font-semibold hover:brightness-110" onClick={() => void saveProduct()} disabled={!fName.trim()}>{t.shopPage.save}</Button>
            </div>
          </div>
        </div>
      )}

      {showCatForm && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowCatForm(false)} />
          <div className="relative w-full max-w-sm rounded-3xl border border-border/60 bg-card/60 backdrop-blur-2xl p-5 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <div className="font-display font-bold text-foreground">{t.shopPage.addCategory}</div>
              <Button variant="ghost" size="icon" onClick={() => setShowCatForm(false)}><X className="w-4 h-4" /></Button>
            </div>
            <div className="grid gap-3">
              <div><div className="text-xs text-muted-foreground mb-1">{t.shopPage.categoryName}</div><Input value={catName} onChange={(e) => setCatName(e.target.value)} /></div>
              <Button className="bg-gradient-gold-static text-primary-foreground font-semibold hover:brightness-110" onClick={() => void addCategory()} disabled={!catName.trim()}>{t.shopPage.save}</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
