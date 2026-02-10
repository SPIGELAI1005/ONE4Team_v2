import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft, Plus, CreditCard, Loader2, X,
  CheckCircle2, Clock, AlertTriangle, Ban,
  TrendingUp
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { useClubId } from "@/hooks/use-club-id";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import logo from "@/assets/logo.png";

type FeeType = {
  id: string;
  name: string;
  amount: number;
  currency: string;
  interval: string;
  is_active: boolean;
};

type Payment = {
  id: string;
  amount: number;
  currency: string;
  status: string;
  due_date: string;
  paid_at: string | null;
  payment_method: string | null;
  notes: string | null;
  membership_id: string;
  fee_type_id: string | null;
  fee_types?: { name: string } | null;
  club_memberships?: { profiles?: { display_name: string | null } } | null;
};

const statusConfig: Record<string, { icon: React.ElementType; color: string }> = {
  pending: { icon: Clock, color: "text-primary bg-primary/10" },
  paid: { icon: CheckCircle2, color: "text-emerald-400 bg-emerald-500/10" },
  overdue: { icon: AlertTriangle, color: "text-accent bg-accent/10" },
  cancelled: { icon: Ban, color: "text-muted-foreground bg-muted" },
};

const Payments = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { clubId, loading: clubLoading } = useClubId();
  const { toast } = useToast();

  const [feeTypes, setFeeTypes] = useState<FeeType[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"overview" | "fees">("overview");
  const [showAddFee, setShowAddFee] = useState(false);

  const [feeName, setFeeName] = useState("");
  const [feeAmount, setFeeAmount] = useState("");
  const [feeInterval, setFeeInterval] = useState("monthly");

  useEffect(() => {
    if (!clubId) return;
    const fetchData = async () => {
      setLoading(true);
      const [feesRes, paymentsRes] = await Promise.all([
        supabase.from("membership_fee_types").select("*").eq("club_id", clubId),
        supabase.from("payments").select("*, membership_fee_types(name), club_memberships(profiles(display_name))").eq("club_id", clubId).order("due_date", { ascending: false }).limit(50),
      ]);
      setFeeTypes((feesRes.data as FeeType[]) || []);
      setPayments((paymentsRes.data as unknown as Payment[]) || []);
      setLoading(false);
    };
    fetchData();
  }, [clubId]);

  const handleAddFeeType = async () => {
    if (!feeName.trim() || !feeAmount || !clubId) return;
    const { data, error } = await supabase
      .from("membership_fee_types")
      .insert({ club_id: clubId, name: feeName.trim(), amount: parseFloat(feeAmount), interval: feeInterval })
      .select()
      .single();
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    setFeeTypes(prev => [...prev, data as FeeType]);
    setShowAddFee(false);
    setFeeName(""); setFeeAmount(""); setFeeInterval("monthly");
    toast({ title: "Fee type created" });
  };

  const handleMarkPaid = async (paymentId: string) => {
    const { error } = await supabase.from("payments").update({ status: "paid", paid_at: new Date().toISOString() }).eq("id", paymentId);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    setPayments(prev => prev.map(p => p.id === paymentId ? { ...p, status: "paid", paid_at: new Date().toISOString() } : p));
    toast({ title: "Payment marked as paid" });
  };

  const totalRevenue = payments.filter(p => p.status === "paid").reduce((sum, p) => sum + Number(p.amount), 0);
  const pendingAmount = payments.filter(p => p.status === "pending").reduce((sum, p) => sum + Number(p.amount), 0);
  const overdueCount = payments.filter(p => p.status === "overdue").length;

  if (!user) return <div className="min-h-screen bg-background flex items-center justify-center"><p className="text-muted-foreground">Please sign in.</p></div>;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowLeft className="w-4 h-4" /></Button>
            <img src={logo} alt="" className="w-7 h-7" />
            <h1 className="font-display font-bold text-lg text-foreground">Payments & Fees</h1>
          </div>
          <Button size="sm" className="bg-gradient-gold text-primary-foreground hover:opacity-90" onClick={() => setShowAddFee(true)}>
            <Plus className="w-4 h-4 mr-1" /> Add Fee Type
          </Button>
        </div>
      </header>

      {/* Tabs */}
      <div className="border-b border-border">
        <div className="container mx-auto px-4 flex gap-1">
          {[
            { id: "overview" as const, label: "Payments", icon: CreditCard },
            { id: "fees" as const, label: "Fee Types", icon: TrendingUp },
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                tab === t.id ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
              }`}>
              <t.icon className="w-4 h-4" /> {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        {(clubLoading || loading) ? (
          <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : !clubId ? (
          <div className="text-center py-20 text-muted-foreground">No club found.</div>
        ) : tab === "overview" ? (
          <>
            {/* KPIs */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              {[
                { label: "Total Collected", value: `€${totalRevenue.toFixed(2)}`, color: "text-emerald-400" },
                { label: "Pending", value: `€${pendingAmount.toFixed(2)}`, color: "text-primary" },
                { label: "Overdue", value: overdueCount.toString(), color: "text-accent" },
              ].map((kpi, i) => (
                <div key={i} className="p-4 rounded-xl bg-card border border-border text-center">
                  <div className={`text-2xl font-display font-bold ${kpi.color}`}>{kpi.value}</div>
                  <div className="text-xs text-muted-foreground mt-1">{kpi.label}</div>
                </div>
              ))}
            </div>

            {/* Payments list */}
            <div className="rounded-xl bg-card border border-border overflow-hidden">
              {payments.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground text-sm">No payment records yet.</div>
              ) : payments.map((payment) => {
                const cfg = statusConfig[payment.status] || statusConfig.pending;
                const StatusIcon = cfg.icon;
                return (
                  <div key={payment.id} className="flex items-center justify-between px-4 py-3 border-b border-border last:border-0">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${cfg.color}`}>
                        <StatusIcon className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-foreground">
                          {payment.fee_types?.name || "Payment"} — {payment.club_memberships?.profiles?.display_name || "Member"}
                        </div>
                        <div className="text-xs text-muted-foreground">Due: {payment.due_date}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-display font-bold text-foreground">€{Number(payment.amount).toFixed(2)}</span>
                      {payment.status === "pending" && (
                        <Button size="sm" variant="outline" onClick={() => handleMarkPaid(payment.id)} className="text-xs">
                          Mark Paid
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <div className="max-w-xl mx-auto space-y-3">
            {feeTypes.length === 0 ? (
              <div className="rounded-xl bg-card border border-border p-8 text-center text-muted-foreground text-sm">No fee types configured.</div>
            ) : feeTypes.map((fee, i) => (
              <motion.div key={fee.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                className="p-4 rounded-xl bg-card border border-border flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-foreground">{fee.name}</div>
                  <div className="text-xs text-muted-foreground">{fee.interval} · {fee.is_active ? "Active" : "Inactive"}</div>
                </div>
                <span className="text-lg font-display font-bold text-primary">€{Number(fee.amount).toFixed(2)}</span>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Add Fee Modal */}
      {showAddFee && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowAddFee(false)}>
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-md rounded-2xl bg-card border border-border p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-bold text-foreground">Add Fee Type</h3>
              <Button variant="ghost" size="icon" onClick={() => setShowAddFee(false)}><X className="w-4 h-4" /></Button>
            </div>
            <div className="space-y-3">
              <Input placeholder="Fee name *" value={feeName} onChange={e => setFeeName(e.target.value)} className="bg-background" maxLength={100} />
              <Input type="number" placeholder="Amount (€) *" value={feeAmount} onChange={e => setFeeAmount(e.target.value)} className="bg-background" min="0" step="0.01" />
              <select value={feeInterval} onChange={e => setFeeInterval(e.target.value)}
                className="w-full h-10 rounded-md border border-border bg-background px-3 text-sm text-foreground">
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="yearly">Yearly</option>
                <option value="one_time">One-time</option>
              </select>
              <Button onClick={handleAddFeeType} disabled={!feeName.trim() || !feeAmount}
                className="w-full bg-gradient-gold text-primary-foreground hover:opacity-90">
                Create Fee Type
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default Payments;
