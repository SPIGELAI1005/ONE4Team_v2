import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import AppHeader from "@/components/layout/AppHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ShoppingBag, Plus, Search, Package, Tag, Truck,
  Edit2, Trash2, X, Info, Archive,
} from "lucide-react";
import { usePermissions } from "@/hooks/use-permissions";
import { useLanguage } from "@/hooks/use-language";
import { useToast } from "@/hooks/use-toast";

type Product = {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  stock: number;
  imageUrl: string;
  active: boolean;
};

type Order = {
  id: string;
  productName: string;
  memberName: string;
  quantity: number;
  total: number;
  status: "pending" | "confirmed" | "shipped" | "delivered";
  date: string;
};

type Category = { id: string; name: string; productCount: number };

const DEMO_CATEGORIES: Category[] = [
  { id: "cat-1", name: "Jerseys", productCount: 3 },
  { id: "cat-2", name: "Training Gear", productCount: 2 },
  { id: "cat-3", name: "Fan Articles", productCount: 4 },
  { id: "cat-4", name: "Accessories", productCount: 1 },
];

const DEMO_PRODUCTS: Product[] = [
  { id: "p1", name: "Home Jersey 2025/26", description: "Official match jersey with club crest.", price: 59.99, category: "Jerseys", stock: 48, imageUrl: "", active: true },
  { id: "p2", name: "Away Jersey 2025/26", description: "Away match jersey, breathable fabric.", price: 59.99, category: "Jerseys", stock: 32, imageUrl: "", active: true },
  { id: "p3", name: "Training Shirt", description: "Lightweight polyester training top.", price: 29.99, category: "Training Gear", stock: 60, imageUrl: "", active: true },
  { id: "p4", name: "Training Shorts", description: "Comfortable match-day quality shorts.", price: 24.99, category: "Training Gear", stock: 45, imageUrl: "", active: true },
  { id: "p5", name: "Club Scarf", description: "Knitted scarf in club colors.", price: 14.99, category: "Fan Articles", stock: 120, imageUrl: "", active: true },
  { id: "p6", name: "Club Cap", description: "Adjustable cap with embroidered logo.", price: 19.99, category: "Fan Articles", stock: 0, imageUrl: "", active: false },
  { id: "p7", name: "Water Bottle", description: "750ml with club branding.", price: 12.99, category: "Accessories", stock: 80, imageUrl: "", active: true },
  { id: "p8", name: "Goalkeeper Gloves", description: "Pro-level gloves, all sizes.", price: 34.99, category: "Jerseys", stock: 15, imageUrl: "", active: true },
];

const DEMO_ORDERS: Order[] = [
  { id: "o1", productName: "Home Jersey 2025/26", memberName: "Max Weber", quantity: 1, total: 59.99, status: "delivered", date: "2026-02-10" },
  { id: "o2", productName: "Training Shirt", memberName: "Lena Fischer", quantity: 2, total: 59.98, status: "shipped", date: "2026-02-11" },
  { id: "o3", productName: "Club Scarf", memberName: "Tim Braun", quantity: 3, total: 44.97, status: "confirmed", date: "2026-02-12" },
  { id: "o4", productName: "Water Bottle", memberName: "Sophie Koch", quantity: 1, total: 12.99, status: "pending", date: "2026-02-13" },
];

export default function Shop() {
  const perms = usePermissions();
  const { t } = useLanguage();
  const { toast } = useToast();
  const canManage = perms.isAdmin;

  const [tab, setTab] = useState<"products" | "orders" | "categories">("products");
  const [products, setProducts] = useState<Product[]>(DEMO_PRODUCTS);
  const [orders, setOrders] = useState<Order[]>(DEMO_ORDERS);
  const [categories, setCategories] = useState<Category[]>(DEMO_CATEGORIES);

  const [q, setQ] = useState("");
  const [filterCat, setFilterCat] = useState("");

  // Product form
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [fName, setFName] = useState("");
  const [fDesc, setFDesc] = useState("");
  const [fPrice, setFPrice] = useState("");
  const [fCat, setFCat] = useState("");
  const [fStock, setFStock] = useState("");
  const [fImg, setFImg] = useState("");

  // Category form
  const [showCatForm, setShowCatForm] = useState(false);
  const [catName, setCatName] = useState("");

  const filtered = useMemo(() => {
    let list = products;
    const s = q.trim().toLowerCase();
    if (s) list = list.filter((p) => `${p.name} ${p.description} ${p.category}`.toLowerCase().includes(s));
    if (filterCat) list = list.filter((p) => p.category === filterCat);
    return list;
  }, [products, q, filterCat]);

  const openAdd = () => {
    setEditId(null);
    setFName(""); setFDesc(""); setFPrice(""); setFCat(categories[0]?.name || ""); setFStock(""); setFImg("");
    setShowForm(true);
  };

  const openEdit = (p: Product) => {
    setEditId(p.id);
    setFName(p.name); setFDesc(p.description); setFPrice(String(p.price)); setFCat(p.category); setFStock(String(p.stock)); setFImg(p.imageUrl);
    setShowForm(true);
  };

  const saveProduct = () => {
    if (!fName.trim()) return;
    const product: Product = {
      id: editId || `p-${Date.now()}`,
      name: fName.trim(),
      description: fDesc.trim(),
      price: parseFloat(fPrice) || 0,
      category: fCat || categories[0]?.name || "Other",
      stock: parseInt(fStock) || 0,
      imageUrl: fImg.trim(),
      active: true,
    };
    if (editId) {
      setProducts((prev) => prev.map((p) => (p.id === editId ? product : p)));
      toast({ title: t.shopPage.editProduct, description: product.name });
    } else {
      setProducts((prev) => [product, ...prev]);
      toast({ title: t.shopPage.addProduct, description: product.name });
    }
    setShowForm(false);
  };

  const deleteProduct = (id: string) => {
    setProducts((prev) => prev.filter((p) => p.id !== id));
    toast({ title: t.shopPage.delete });
  };

  const addCategory = () => {
    if (!catName.trim()) return;
    setCategories((prev) => [...prev, { id: `cat-${Date.now()}`, name: catName.trim(), productCount: 0 }]);
    setCatName("");
    setShowCatForm(false);
    toast({ title: t.shopPage.addCategory, description: catName.trim() });
  };

  const updateOrderStatus = (id: string) => {
    const next: Record<string, Order["status"]> = { pending: "confirmed", confirmed: "shipped", shipped: "delivered" };
    setOrders((prev) => prev.map((o) => o.id === id ? { ...o, status: next[o.status] || o.status } : o));
  };

  const statusColor: Record<string, string> = {
    pending: "text-amber-500 bg-amber-500/10 border-amber-500/20",
    confirmed: "text-blue-500 bg-blue-500/10 border-blue-500/20",
    shipped: "text-purple-500 bg-purple-500/10 border-purple-500/20",
    delivered: "text-green-500 bg-green-500/10 border-green-500/20",
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
        subtitle={t.shopPage.subtitle}
        rightSlot={
          canManage && tab === "products" ? (
            <Button size="sm" className="bg-gradient-gold-static text-primary-foreground font-semibold hover:brightness-110" onClick={openAdd}>
              <Plus className="w-4 h-4 mr-1" /> {t.shopPage.addProduct}
            </Button>
          ) : canManage && tab === "categories" ? (
            <Button size="sm" className="bg-gradient-gold-static text-primary-foreground font-semibold hover:brightness-110" onClick={() => setShowCatForm(true)}>
              <Plus className="w-4 h-4 mr-1" /> {t.shopPage.addCategory}
            </Button>
          ) : null
        }
      />

      {/* Coming soon banner */}
      <div className="border-b border-border/60">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center gap-3 rounded-2xl bg-primary/5 border border-primary/10 px-4 py-3">
            <Info className="w-4 h-4 text-primary shrink-0" />
            <div>
              <div className="text-xs font-semibold text-foreground">{t.shopPage.comingSoon}</div>
              <div className="text-[11px] text-muted-foreground">{t.shopPage.comingSoonDesc}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
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
        {/* ── Products ── */}
        {tab === "products" && (
          <div className="space-y-4">
            {/* Search + filter */}
            <div className="rounded-3xl border border-border/60 bg-card/40 backdrop-blur-2xl p-3">
              <div className="flex items-center gap-2 flex-wrap">
                <Search className="w-4 h-4 text-muted-foreground shrink-0" />
                <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t.shopPage.search} className="flex-1 min-w-[140px]" />
                <select
                  className="h-10 rounded-2xl border border-border/60 bg-background/50 px-3 text-sm"
                  value={filterCat}
                  onChange={(e) => setFilterCat(e.target.value)}
                >
                  <option value="">{t.shopPage.allCategories}</option>
                  {categories.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
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
                  {filtered.map((p, i) => (
                    <motion.div
                      key={p.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.03 }}
                      className="rounded-3xl border border-border/60 bg-card/40 backdrop-blur-2xl overflow-hidden"
                    >
                      {/* Image placeholder */}
                      <div className="h-36 bg-gradient-to-br from-primary/5 to-primary/10 flex items-center justify-center">
                        <ShoppingBag className="w-10 h-10 text-primary/30" />
                      </div>
                      <div className="p-4">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="text-[10px] px-2 py-0.5 rounded-full border border-border/60 bg-background/40 text-muted-foreground">
                              {p.category}
                            </span>
                            <h3 className="mt-1.5 font-display font-bold text-foreground text-sm">{p.name}</h3>
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{p.description}</p>
                          </div>
                        </div>
                        <div className="flex items-center justify-between mt-3">
                          <span className="font-display font-bold text-foreground text-lg">{p.price.toFixed(2)} &euro;</span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full border ${p.stock > 0 ? "text-green-600 bg-green-500/10 border-green-500/20" : "text-red-500 bg-red-500/10 border-red-500/20"}`}>
                            {p.stock > 0 ? `${t.shopPage.inStock} (${p.stock})` : t.shopPage.outOfStock}
                          </span>
                        </div>
                        {canManage && (
                          <div className="flex gap-2 mt-3 pt-3 border-t border-border/60">
                            <Button variant="ghost" size="sm" className="flex-1 text-xs" onClick={() => openEdit(p)}>
                              <Edit2 className="w-3.5 h-3.5 mr-1" /> {t.shopPage.editProduct}
                            </Button>
                            <Button variant="ghost" size="sm" className="text-xs text-destructive" onClick={() => deleteProduct(p.id)}>
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>
        )}

        {/* ── Orders ── */}
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
                    <div className="min-w-0">
                      <div className="font-display font-bold text-foreground text-sm">{o.productName}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{t.shopPage.member}: {o.memberName} &middot; {t.shopPage.date}: {o.date}</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-display font-bold text-foreground">{o.total.toFixed(2)} &euro;</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${statusColor[o.status]}`}>
                        {t.shopPage.orderStatus[o.status]}
                      </span>
                      {canManage && o.status !== "delivered" && (
                        <Button variant="ghost" size="sm" className="text-xs" onClick={() => updateOrderStatus(o.id)}>
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

        {/* ── Categories ── */}
        {tab === "categories" && (
          categories.length === 0 ? (
            <div className="text-center py-20">
              <Tag className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h2 className="font-display text-xl font-bold text-foreground mb-2">{t.shopPage.tabs.categories}</h2>
              <p className="text-muted-foreground">{t.shopPage.noCategoriesDesc}</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {categories.map((c) => (
                <div key={c.id} className="rounded-3xl border border-border/60 bg-card/40 backdrop-blur-2xl p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-gold-subtle flex items-center justify-center">
                      <Tag className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <div className="font-display font-bold text-foreground text-sm">{c.name}</div>
                      <div className="text-xs text-muted-foreground">{c.productCount} {t.shopPage.productCount}</div>
                    </div>
                  </div>
                  {canManage && (
                    <Button variant="ghost" size="sm" className="text-xs text-destructive" onClick={() => setCategories((prev) => prev.filter((x) => x.id !== c.id))}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )
        )}
      </div>

      {/* ── Product Form Modal ── */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowForm(false)} />
          <div className="relative w-full max-w-lg rounded-3xl border border-border/60 bg-card/60 backdrop-blur-2xl p-5 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <div className="font-display font-bold text-foreground">{editId ? t.shopPage.editProduct : t.shopPage.addProduct}</div>
              <Button variant="ghost" size="icon" onClick={() => setShowForm(false)}><X className="w-4 h-4" /></Button>
            </div>
            <div className="grid gap-3">
              <div>
                <div className="text-xs text-muted-foreground mb-1">{t.shopPage.productName}</div>
                <Input value={fName} onChange={(e) => setFName(e.target.value)} placeholder="e.g. Home Jersey" />
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1">{t.shopPage.description}</div>
                <Input value={fDesc} onChange={(e) => setFDesc(e.target.value)} placeholder="Short description" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <div className="text-xs text-muted-foreground mb-1">{t.shopPage.price}</div>
                  <Input type="number" value={fPrice} onChange={(e) => setFPrice(e.target.value)} placeholder="0.00" min="0" step="0.01" />
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1">{t.shopPage.stock}</div>
                  <Input type="number" value={fStock} onChange={(e) => setFStock(e.target.value)} placeholder="0" min="0" />
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1">{t.shopPage.category}</div>
                <select className="w-full h-10 rounded-2xl border border-border/60 bg-background/50 px-3 text-sm" value={fCat} onChange={(e) => setFCat(e.target.value)}>
                  {categories.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1">{t.shopPage.imageUrl}</div>
                <Input value={fImg} onChange={(e) => setFImg(e.target.value)} placeholder="https://..." />
              </div>
              <Button className="bg-gradient-gold-static text-primary-foreground font-semibold hover:brightness-110" onClick={saveProduct} disabled={!fName.trim()}>
                {t.shopPage.save}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Category Form Modal ── */}
      {showCatForm && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowCatForm(false)} />
          <div className="relative w-full max-w-sm rounded-3xl border border-border/60 bg-card/60 backdrop-blur-2xl p-5 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <div className="font-display font-bold text-foreground">{t.shopPage.addCategory}</div>
              <Button variant="ghost" size="icon" onClick={() => setShowCatForm(false)}><X className="w-4 h-4" /></Button>
            </div>
            <div className="grid gap-3">
              <div>
                <div className="text-xs text-muted-foreground mb-1">{t.shopPage.categoryName}</div>
                <Input value={catName} onChange={(e) => setCatName(e.target.value)} placeholder="e.g. Goalkeeper Gear" />
              </div>
              <Button className="bg-gradient-gold-static text-primary-foreground font-semibold hover:brightness-110" onClick={addCategory} disabled={!catName.trim()}>
                {t.shopPage.save}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
