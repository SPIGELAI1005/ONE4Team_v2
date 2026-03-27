import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import AppHeader from "@/components/layout/AppHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Building2, Users, CreditCard, Shield, Search, Loader2,
  TrendingUp, BarChart3, Globe, AlertTriangle
} from "lucide-react";
import { useAuth } from "@/contexts/useAuth";
import { supabaseDynamic } from "@/lib/supabase-dynamic";
import { useToast } from "@/hooks/use-toast";
import { getPlanDisplayName } from "@/lib/plan-limits";
import { useLanguage } from "@/hooks/use-language";

interface ClubOverview {
  id: string;
  name: string;
  slug: string;
  is_public: boolean;
  created_at: string;
  member_count: number;
  plan_id: string | null;
  subscription_status: string | null;
}

interface PlatformStats {
  totalClubs: number;
  totalMembers: number;
  activeSubscriptions: number;
  trialingSubscriptions: number;
}

const PLATFORM_ADMIN_EMAILS = (import.meta.env.VITE_PLATFORM_ADMIN_EMAILS ?? "").split(",").map((e: string) => e.trim().toLowerCase()).filter(Boolean);

function subscriptionStatusLabel(
  status: string | null | undefined,
  labels: Record<string, string>,
  fallbackNone: string,
): string {
  if (!status) return fallbackNone;
  return labels[status] ?? status;
}

export default function PlatformAdmin() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useLanguage();

  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [clubs, setClubs] = useState<ClubOverview[]>([]);
  const [stats, setStats] = useState<PlatformStats>({ totalClubs: 0, totalMembers: 0, activeSubscriptions: 0, trialingSubscriptions: 0 });
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"overview" | "clubs" | "subscriptions">("overview");

  useEffect(() => {
    if (!user?.email) {
      setAuthorized(false);
      setLoading(false);
      return;
    }
    const isAdmin = PLATFORM_ADMIN_EMAILS.length === 0 || PLATFORM_ADMIN_EMAILS.includes(user.email.toLowerCase());
    setAuthorized(isAdmin);
    setLoading(false);
  }, [user?.email]);

  const loadData = useCallback(async () => {
    if (!authorized) return;
    setLoading(true);
    try {
      const [clubsRes, subsRes] = await Promise.all([
        supabaseDynamic
          .from("clubs")
          .select("id, name, slug, is_public, created_at")
          .order("created_at", { ascending: false }),
        supabaseDynamic
          .from("billing_subscriptions")
          .select("club_id, plan_id, status")
          .order("updated_at", { ascending: false }),
      ]);

      const clubRows = (clubsRes.data || []) as unknown as Array<{
        id: string; name: string; slug: string; is_public: boolean; created_at: string;
      }>;
      const subRows = (subsRes.data || []) as unknown as Array<{
        club_id: string; plan_id: string; status: string;
      }>;

      const subMap = new Map<string, { plan_id: string; status: string }>();
      for (const s of subRows) subMap.set(s.club_id, s);

      const overviews: ClubOverview[] = clubRows.map((c) => {
        const sub = subMap.get(c.id);
        return {
          ...c,
          member_count: 0,
          plan_id: sub?.plan_id ?? null,
          subscription_status: sub?.status ?? null,
        };
      });

      setClubs(overviews);

      const activeCount = subRows.filter((s) => s.status === "active").length;
      const trialingCount = subRows.filter((s) => s.status === "trialing").length;

      setStats({
        totalClubs: clubRows.length,
        totalMembers: 0,
        activeSubscriptions: activeCount,
        trialingSubscriptions: trialingCount,
      });
    } catch (err) {
      toast({ title: t.common.error, description: err instanceof Error ? err.message : t.platformAdminPage.loadFailed, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [authorized, toast, t.common.error, t.platformAdminPage.loadFailed]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const filtered = clubs.filter((c) => {
    const s = search.trim().toLowerCase();
    if (!s) return true;
    return c.name.toLowerCase().includes(s) || c.slug.toLowerCase().includes(s);
  });

  const statusColor: Record<string, string> = {
    active: "text-green-600 bg-green-500/10 border-green-500/20",
    trialing: "text-blue-600 bg-blue-500/10 border-blue-500/20",
    past_due: "text-amber-600 bg-amber-500/10 border-amber-500/20",
    canceled: "text-red-600 bg-red-500/10 border-red-500/20",
    incomplete: "text-gray-600 bg-gray-500/10 border-gray-500/20",
  };

  const subLabels = t.platformAdminPage.subscriptionStatus as Record<string, string>;

  if (!authorized && !loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center max-w-md px-4">
          <Shield className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h1 className="font-display text-2xl font-bold text-foreground mb-2">{t.platformAdminPage.accessDeniedTitle}</h1>
          <p className="text-sm text-muted-foreground mb-6">
            {t.platformAdminPage.accessDeniedBody}
          </p>
          <Button variant="outline" onClick={() => navigate("/")}>{t.platformAdminPage.goHome}</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader
        title={t.platformAdminPage.title}
        subtitle={t.platformAdminPage.subtitle}
        back
      />

      <div className="border-b border-border/60">
        <div className="container mx-auto px-4 flex gap-1">
          {([
            { id: "overview" as const, label: t.platformAdminPage.tabOverview, icon: BarChart3 },
            { id: "clubs" as const, label: t.platformAdminPage.tabClubs, icon: Building2 },
            { id: "subscriptions" as const, label: t.platformAdminPage.tabSubscriptions, icon: CreditCard },
          ]).map((tabItem) => (
            <button
              key={tabItem.id}
              onClick={() => setTab(tabItem.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                tab === tabItem.id ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <tabItem.icon className="w-4 h-4" /> {tabItem.label}
            </button>
          ))}
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {tab === "overview" && (
              <div className="space-y-6">
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    { icon: Building2, label: t.platformAdminPage.statTotalClubs, value: stats.totalClubs, color: "text-blue-500" },
                    { icon: Users, label: t.platformAdminPage.statTotalMembers, value: stats.totalMembers || "—", color: "text-green-500" },
                    { icon: TrendingUp, label: t.platformAdminPage.statActiveSubscriptions, value: stats.activeSubscriptions, color: "text-emerald-500" },
                    { icon: Globe, label: t.platformAdminPage.statTrialingClubs, value: stats.trialingSubscriptions, color: "text-amber-500" },
                  ].map((stat) => (
                    <motion.div
                      key={stat.label}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="rounded-2xl border border-border/60 bg-card/40 backdrop-blur-2xl p-5"
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <div className={`w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center ${stat.color}`}>
                          <stat.icon className="w-5 h-5" />
                        </div>
                        <div className="text-xs text-muted-foreground">{stat.label}</div>
                      </div>
                      <div className="font-display text-3xl font-bold text-foreground">{stat.value}</div>
                    </motion.div>
                  ))}
                </div>

                {stats.totalClubs === 0 && (
                  <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-6 text-center">
                    <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto mb-3" />
                    <h3 className="font-display font-bold text-foreground mb-1">{t.platformAdminPage.noClubsYet}</h3>
                    <p className="text-sm text-muted-foreground">{t.platformAdminPage.noClubsYetDesc}</p>
                  </div>
                )}
              </div>
            )}

            {tab === "clubs" && (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Search className="w-4 h-4 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder={t.platformAdminPage.searchPlaceholder}
                    className="flex-1"
                  />
                </div>

                {filtered.length === 0 ? (
                  <div className="text-center py-16 text-muted-foreground">
                    <Building2 className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
                    <p className="text-sm">{t.platformAdminPage.noClubsFound}</p>
                  </div>
                ) : (
                  <div className="grid gap-3">
                    {filtered.map((club) => (
                      <div key={club.id} className="rounded-2xl border border-border/60 bg-card/40 backdrop-blur-2xl p-4">
                        <div className="flex items-center justify-between gap-3 flex-wrap">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-gold-subtle flex items-center justify-center">
                              <Building2 className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                              <div className="font-display font-bold text-foreground text-sm">{club.name}</div>
                              <div className="text-xs text-muted-foreground">
                                /{club.slug} · {club.is_public ? t.platformAdminPage.public : t.platformAdminPage.private} · {t.platformAdminPage.createdOn.replace("{date}", new Date(club.created_at).toLocaleDateString())}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {club.plan_id && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full border border-primary/20 text-primary bg-primary/5 font-medium">
                                {getPlanDisplayName(club.plan_id)}
                              </span>
                            )}
                            {club.subscription_status && (
                              <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${statusColor[club.subscription_status] || statusColor.incomplete}`}>
                                {subscriptionStatusLabel(club.subscription_status, subLabels, t.platformAdminPage.statusNone)}
                              </span>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-xs"
                              onClick={() => navigate(`/club/${club.slug}`)}
                            >
                              {t.platformAdminPage.view}
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {tab === "subscriptions" && (
              <div className="space-y-4">
                {clubs.filter((c) => c.plan_id).length === 0 ? (
                  <div className="text-center py-16 text-muted-foreground">
                    <CreditCard className="w-10 h-10 mx-auto mb-3" />
                    <p className="text-sm">{t.platformAdminPage.noSubscriptionsYet}</p>
                  </div>
                ) : (
                  <div className="grid gap-3">
                    {clubs.filter((c) => c.plan_id).map((club) => (
                      <div key={club.id} className="rounded-2xl border border-border/60 bg-card/40 backdrop-blur-2xl p-4">
                        <div className="flex items-center justify-between gap-3 flex-wrap">
                          <div>
                            <div className="font-display font-bold text-foreground text-sm">{club.name}</div>
                            <div className="text-xs text-muted-foreground mt-0.5">
                              {t.platformAdminPage.planPrefix} {getPlanDisplayName(club.plan_id)} · {t.platformAdminPage.statusPrefix}{" "}
                              {subscriptionStatusLabel(club.subscription_status, subLabels, t.platformAdminPage.statusNone)}
                            </div>
                          </div>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${statusColor[club.subscription_status || ""] || statusColor.incomplete}`}>
                            {subscriptionStatusLabel(club.subscription_status, subLabels, t.platformAdminPage.statusNone)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
