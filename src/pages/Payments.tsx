import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useLanguage } from "@/hooks/use-language";
import { DashboardHeaderSlot } from "@/components/layout/DashboardHeaderSlot";
import {
  Plus,
  CreditCard,
  Loader2,
  X,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Ban,
  TrendingUp,
  Users,
  Filter,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useClubId } from "@/hooks/use-club-id";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { usePermissions } from "@/hooks/use-permissions";
import {
  DASHBOARD_PAGE_INNER,
  DASHBOARD_PAGE_ROOT,
  DASHBOARD_TABS_INNER_SCROLL,
  DASHBOARD_TABS_ROW,
} from "@/lib/dashboard-page-shell";
import {
  buildPaymentInsertRows,
  effectivePaymentStatus,
  paymentRowKey,
  todayIsoDate,
  type MembershipFeeTypeRow,
  type PaymentRecordStatus,
} from "@/lib/member-payments";
import type { MembershipFeePackage } from "@/lib/membership-fee-packages";
import { MembershipFeePackageFormDialog } from "@/components/payments/membership-fee-package-form";
import { MembershipFeePackagesOverview } from "@/components/payments/membership-fee-packages-overview";

type FeeType = MembershipFeeTypeRow & MembershipFeePackage;

type PaymentRow = {
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
  membership_fee_types?: { name: string } | null;
};

type MembershipRow = {
  id: string;
  role: string;
  status: string;
  user_id: string;
  profiles?: { display_name: string | null } | null;
};

async function loadClubMembershipsWithProfiles(clubId: string): Promise<{
  data: MembershipRow[];
  error: { message: string } | null;
}> {
  const membershipsRes = await supabase
    .from("club_memberships")
    .select("id, role, status, user_id")
    .eq("club_id", clubId)
    .eq("status", "active")
    .order("created_at", { ascending: true })
    .limit(500);

  if (membershipsRes.error) {
    return { data: [], error: membershipsRes.error };
  }

  const rows = (membershipsRes.data ?? []) as Array<{
    id: string;
    role: string;
    status: string;
    user_id: string;
  }>;

  const userIds = [...new Set(rows.map((row) => row.user_id).filter(Boolean))];
  if (!userIds.length) {
    return { data: rows.map((row) => ({ ...row, profiles: null })), error: null };
  }

  const profilesRes = await supabase.from("profiles").select("user_id, display_name").in("user_id", userIds);
  if (profilesRes.error) {
    return { data: rows.map((row) => ({ ...row, profiles: null })), error: profilesRes.error };
  }

  const profileByUserId = new Map(
    (profilesRes.data ?? []).map((profile) => [
      String((profile as { user_id: string }).user_id),
      { display_name: (profile as { display_name: string | null }).display_name },
    ]),
  );

  return {
    data: rows.map((row) => ({
      ...row,
      profiles: profileByUserId.get(row.user_id) ?? null,
    })),
    error: null,
  };
}

const statusConfig: Record<PaymentRecordStatus, { icon: React.ElementType; color: string }> = {
  pending: { icon: Clock, color: "text-primary bg-primary/10" },
  paid: { icon: CheckCircle2, color: "text-emerald-400 bg-emerald-500/10" },
  overdue: { icon: AlertTriangle, color: "text-accent bg-accent/10" },
  cancelled: { icon: Ban, color: "text-muted-foreground bg-muted" },
};

const Payments = () => {
  const { t } = useLanguage();
  const { clubId, loading: clubLoading } = useClubId();
  const { toast } = useToast();
  const perms = usePermissions();

  const [feeTypes, setFeeTypes] = useState<FeeType[]>([]);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [memberships, setMemberships] = useState<MembershipRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"overview" | "fees">("overview");
  const [feePackageDialogOpen, setFeePackageDialogOpen] = useState(false);
  const [editingFeePackage, setEditingFeePackage] = useState<MembershipFeePackage | null>(null);
  const [showRecordPayment, setShowRecordPayment] = useState(false);
  const [showBulkAssign, setShowBulkAssign] = useState(false);

  const [recordMembershipId, setRecordMembershipId] = useState("");
  const [recordDueDate, setRecordDueDate] = useState("");
  const [recordFeeTypeIds, setRecordFeeTypeIds] = useState<Set<string>>(new Set());
  const [recordPaymentMethod, setRecordPaymentMethod] = useState("bank_transfer");
  const [recordNotes, setRecordNotes] = useState("");
  const [recordSubmitting, setRecordSubmitting] = useState(false);

  const [bulkFeeTypeId, setBulkFeeTypeId] = useState("");
  const [bulkDueDate, setBulkDueDate] = useState("");
  const [bulkRole, setBulkRole] = useState("all");
  const [bulkSubmitting, setBulkSubmitting] = useState(false);

  const [filterMemberId, setFilterMemberId] = useState("all");
  const [filterFeeTypeIds, setFilterFeeTypeIds] = useState<Set<string>>(new Set());
  const [filterStatus, setFilterStatus] = useState<"all" | PaymentRecordStatus>("all");

  const today = todayIsoDate();

  useEffect(() => {
    setFeeTypes([]);
    setPayments([]);
    setMemberships([]);
    setLoading(true);
  }, [clubId]);

  const fetchData = useCallback(async () => {
    if (!clubId) return;
    setLoading(true);
    const [feesRes, paymentsRes, membershipsResult] = await Promise.all([
      supabase
        .from("membership_fee_types")
        .select("*")
        .eq("club_id", clubId)
        .order("sort_order", { ascending: true })
        .order("name"),
      supabase
        .from("payments")
        .select("*, membership_fee_types(name)")
        .eq("club_id", clubId)
        .neq("status", "cancelled")
        .order("due_date", { ascending: false })
        .limit(500),
      loadClubMembershipsWithProfiles(clubId),
    ]);

    if (feesRes.error) {
      toast({ title: t.common.error, description: feesRes.error.message, variant: "destructive" });
    }
    if (paymentsRes.error) {
      toast({ title: t.common.error, description: paymentsRes.error.message, variant: "destructive" });
    }
    if (membershipsResult.error) {
      toast({ title: t.common.error, description: membershipsResult.error.message, variant: "destructive" });
    }

    setFeeTypes((feesRes.data as FeeType[]) || []);
    setPayments((paymentsRes.data as unknown as PaymentRow[]) || []);
    setMemberships(membershipsResult.data);
    setLoading(false);
  }, [clubId, t.common.error, toast]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const feeTypesById = useMemo(() => new Map(feeTypes.map((f) => [f.id, f])), [feeTypes]);

  const memberNameById = useMemo(() => {
    const map: Record<string, string> = {};
    for (const m of memberships) {
      map[m.id] = m.profiles?.display_name?.trim() || m.id.slice(0, 8);
    }
    return map;
  }, [memberships]);

  const paymentsWithEffectiveStatus = useMemo(
    () =>
      payments.map((p) => ({
        ...p,
        effectiveStatus: effectivePaymentStatus(p.status, p.due_date, today),
      })),
    [payments, today],
  );

  const filteredPayments = useMemo(() => {
    return paymentsWithEffectiveStatus.filter((p) => {
      if (filterMemberId !== "all" && p.membership_id !== filterMemberId) return false;
      if (filterFeeTypeIds.size > 0 && (!p.fee_type_id || !filterFeeTypeIds.has(p.fee_type_id))) return false;
      if (filterStatus !== "all" && p.effectiveStatus !== filterStatus) return false;
      return true;
    });
  }, [paymentsWithEffectiveStatus, filterMemberId, filterFeeTypeIds, filterStatus]);

  const filterPackageLabel = useMemo(() => {
    if (filterFeeTypeIds.size === 0) return t.payments.filterAllPackages;
    if (filterFeeTypeIds.size === 1) {
      const id = [...filterFeeTypeIds][0];
      return feeTypesById.get(id)?.name ?? t.payments.filterPackagesCount.replace("{count}", "1");
    }
    return t.payments.filterPackagesCount.replace("{count}", String(filterFeeTypeIds.size));
  }, [filterFeeTypeIds, feeTypesById, t.payments.filterAllPackages, t.payments.filterPackagesCount]);

  const totalRevenue = useMemo(
    () => paymentsWithEffectiveStatus.filter((p) => p.effectiveStatus === "paid").reduce((sum, p) => sum + Number(p.amount), 0),
    [paymentsWithEffectiveStatus],
  );
  const pendingAmount = useMemo(
    () =>
      paymentsWithEffectiveStatus
        .filter((p) => p.effectiveStatus === "pending")
        .reduce((sum, p) => sum + Number(p.amount), 0),
    [paymentsWithEffectiveStatus],
  );
  const overdueCount = useMemo(
    () => paymentsWithEffectiveStatus.filter((p) => p.effectiveStatus === "overdue").length,
    [paymentsWithEffectiveStatus],
  );

  const existingPaymentKeys = useMemo(
    () =>
      new Set(
        payments.map((p) => paymentRowKey(p.membership_id, p.fee_type_id, p.due_date)),
      ),
    [payments],
  );

  const openFeePackageDialog = (pkg: MembershipFeePackage | null = null) => {
    if (!perms.isAdmin) {
      toast({ title: t.common.notAuthorized, description: t.payments.onlyAdminsFees, variant: "destructive" });
      return;
    }
    setEditingFeePackage(pkg);
    setFeePackageDialogOpen(true);
  };

  const handleFeePackageSaved = (pkg: MembershipFeePackage) => {
    setFeeTypes((prev) => {
      const exists = prev.some((row) => row.id === pkg.id);
      if (exists) return prev.map((row) => (row.id === pkg.id ? { ...row, ...pkg } : row));
      return [...prev, pkg as FeeType];
    });
  };

  const handleMarkPaid = async (paymentId: string) => {
    if (!perms.isAdmin || !clubId) {
      toast({ title: t.common.notAuthorized, description: t.payments.onlyAdminsPayments, variant: "destructive" });
      return;
    }
    const paidAt = new Date().toISOString();
    const { error } = await supabase
      .from("payments")
      .update({ status: "paid", paid_at: paidAt })
      .eq("club_id", clubId)
      .eq("id", paymentId);
    if (error) {
      toast({ title: t.common.error, description: error.message, variant: "destructive" });
      return;
    }
    setPayments((prev) =>
      prev.map((p) => (p.id === paymentId ? { ...p, status: "paid", paid_at: paidAt } : p)),
    );
    toast({ title: t.payments.paymentMarkedPaid });
  };

  const toggleRecordFeeType = (feeTypeId: string, checked: boolean) => {
    setRecordFeeTypeIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(feeTypeId);
      else next.delete(feeTypeId);
      return next;
    });
  };

  const toggleFilterFeeType = (feeTypeId: string, checked: boolean) => {
    setFilterFeeTypeIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(feeTypeId);
      else next.delete(feeTypeId);
      return next;
    });
  };

  const openRecordPaymentDialog = (options?: { membershipId?: string; feeTypeIds?: Iterable<string> }) => {
    setRecordMembershipId(options?.membershipId ?? "");
    setRecordDueDate(today);
    setRecordFeeTypeIds(new Set(options?.feeTypeIds ?? []));
    setRecordPaymentMethod("bank_transfer");
    setRecordNotes("");
    setShowRecordPayment(true);
  };

  const handleRecordPayment = async () => {
    if (!perms.isAdmin || !clubId) return;
    if (!recordMembershipId || !recordDueDate || recordFeeTypeIds.size === 0) {
      toast({
        title: t.common.error,
        description: t.payments.recordPaymentValidation,
        variant: "destructive",
      });
      return;
    }

    const feeTypeIds = [...recordFeeTypeIds];
    const duplicateCount = feeTypeIds.filter((id) =>
      existingPaymentKeys.has(paymentRowKey(recordMembershipId, id, recordDueDate)),
    ).length;
    if (duplicateCount === feeTypeIds.length) {
      toast({
        title: t.common.error,
        description: t.payments.recordPaymentDuplicate,
        variant: "destructive",
      });
      return;
    }

    const rows = buildPaymentInsertRows({
      clubId,
      membershipId: recordMembershipId,
      feeTypeIds: feeTypeIds.filter(
        (id) => !existingPaymentKeys.has(paymentRowKey(recordMembershipId, id, recordDueDate)),
      ),
      feeTypesById: feeTypesById,
      dueDate: recordDueDate,
      paymentMethod: recordPaymentMethod,
      notes: recordNotes,
    });

    if (!rows.length) return;

    setRecordSubmitting(true);
    const { data, error } = await supabase.from("payments").insert(rows).select("id");
    setRecordSubmitting(false);

    if (error) {
      toast({ title: t.common.error, description: error.message, variant: "destructive" });
      return;
    }

    toast({
      title: t.payments.paymentsRecorded,
      description: t.payments.paymentsRecordedDesc.replace("{count}", String(data?.length ?? rows.length)),
    });
    setShowRecordPayment(false);
    setRecordMembershipId("");
    setRecordDueDate("");
    setRecordFeeTypeIds(new Set());
    setRecordNotes("");
    await fetchData();
  };

  const handleBulkAssign = async () => {
    if (!perms.isAdmin || !clubId) return;
    if (!bulkFeeTypeId || !bulkDueDate) {
      toast({
        title: t.common.error,
        description: t.payments.bulkAssignValidation,
        variant: "destructive",
      });
      return;
    }

    const fee = feeTypesById.get(bulkFeeTypeId);
    if (!fee) return;

    const targets = memberships.filter((m) => (bulkRole === "all" ? true : m.role === bulkRole));
    if (!targets.length) {
      toast({ title: t.common.error, description: t.payments.bulkAssignNoMembers, variant: "destructive" });
      return;
    }

    const rows = targets
      .filter((m) => !existingPaymentKeys.has(paymentRowKey(m.id, bulkFeeTypeId, bulkDueDate)))
      .map((m) => ({
        club_id: clubId,
        membership_id: m.id,
        fee_type_id: bulkFeeTypeId,
        amount: Number(fee.amount),
        currency: fee.currency || "EUR",
        status: "pending",
        due_date: bulkDueDate,
      }));

    if (!rows.length) {
      toast({ title: t.common.error, description: t.payments.bulkAssignAllDuplicate, variant: "destructive" });
      return;
    }

    setBulkSubmitting(true);
    const { error } = await supabase.from("payments").insert(rows);
    setBulkSubmitting(false);

    if (error) {
      toast({ title: t.common.error, description: error.message, variant: "destructive" });
      return;
    }

    toast({
      title: t.payments.bulkAssignSuccess,
      description: t.payments.bulkAssignSuccessDesc.replace("{count}", String(rows.length)).replace("{package}", fee.name),
    });
    setShowBulkAssign(false);
    setBulkFeeTypeId("");
    setBulkDueDate("");
    await fetchData();
  };

  const activeFeeTypes = feeTypes.filter((f) => f.is_active !== false);

  return (
    <div className={DASHBOARD_PAGE_ROOT}>
      <DashboardHeaderSlot
        title={t.payments.title}
        subtitle={t.payments.adminOnly}
        toolbarRevision={String(perms.isAdmin)}
        rightSlot={
          perms.isAdmin ? (
            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm" variant="outline" onClick={() => openRecordPaymentDialog()}>
                <Plus className="w-4 h-4 mr-1" /> {t.payments.recordPayment}
              </Button>
              <Button size="sm" variant="outline" onClick={() => setShowBulkAssign(true)}>
                <Users className="w-4 h-4 mr-1" /> {t.payments.bulkAssignPackage}
              </Button>
              <Button
                size="sm"
                className="bg-gradient-gold-static text-primary-foreground hover:brightness-110"
                onClick={() => openFeePackageDialog(null)}
              >
                <Plus className="w-4 h-4 mr-1" /> {t.payments.addFeeType}
              </Button>
            </div>
          ) : null
        }
      />

      <div className={DASHBOARD_TABS_ROW}>
        <div className={DASHBOARD_TABS_INNER_SCROLL}>
          {[
            { id: "overview" as const, label: t.payments.paymentsTab, icon: CreditCard },
            { id: "fees" as const, label: t.payments.feeTypes, icon: TrendingUp },
          ].map((tabItem) => (
            <button
              key={tabItem.id}
              onClick={() => setTab(tabItem.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                tab === tabItem.id
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <tabItem.icon className="w-4 h-4" /> {tabItem.label}
            </button>
          ))}
        </div>
      </div>

      <div className={DASHBOARD_PAGE_INNER}>
        {clubLoading || loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : !clubId ? (
          <div className="text-center py-20 text-muted-foreground">{t.payments.noClubFound}</div>
        ) : !perms.isAdmin ? (
          <div className="text-center py-20 text-muted-foreground">{t.payments.onlyAdminsPayments}</div>
        ) : tab === "overview" ? (
          <>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 max-w-5xl">
              <p className="text-sm text-muted-foreground">{t.payments.multiPackageHint}</p>
              {perms.isAdmin && (
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <Button size="sm" variant="outline" onClick={() => setShowBulkAssign(true)}>
                    <Users className="w-4 h-4 mr-1" /> {t.payments.bulkAssignPackage}
                  </Button>
                  <Button
                    size="sm"
                    className="bg-gradient-gold-static text-primary-foreground hover:brightness-110"
                    onClick={() => openRecordPaymentDialog()}
                  >
                    <Plus className="w-4 h-4 mr-1" /> {t.payments.recordPayment}
                  </Button>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              {[
                { label: t.payments.totalCollected, value: `€${totalRevenue.toFixed(2)}`, color: "text-emerald-400" },
                { label: t.common.pending, value: `€${pendingAmount.toFixed(2)}`, color: "text-primary" },
                { label: t.payments.overdue, value: overdueCount.toString(), color: "text-accent" },
              ].map((kpi, i) => (
                <div key={i} className="p-4 rounded-xl bg-card border border-border text-center">
                  <div className={`text-2xl font-display font-bold ${kpi.color}`}>{kpi.value}</div>
                  <div className="text-xs text-muted-foreground mt-1">{kpi.label}</div>
                </div>
              ))}
            </div>

            <div className="mb-4 space-y-3">
              <div className="flex flex-wrap items-end gap-3 p-3 rounded-xl border border-border bg-card/40">
                <Filter className="w-4 h-4 text-muted-foreground shrink-0 mb-2" />
                <div className="min-w-[160px] flex-1">
                  <div className="text-[10px] text-muted-foreground mb-1">{t.payments.filterMember}</div>
                  <Select value={filterMemberId} onValueChange={setFilterMemberId}>
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t.payments.filterAllMembers}</SelectItem>
                      {memberships.map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          {memberNameById[m.id]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="min-w-[160px] flex-1">
                  <div className="text-[10px] text-muted-foreground mb-1">{t.payments.filterPackageView}</div>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="h-9 w-full justify-between font-normal px-3">
                        <span className="truncate">{filterPackageLabel}</span>
                        <ChevronDown className="w-4 h-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-72 p-3" align="start">
                      <div className="text-xs text-muted-foreground mb-2">{t.payments.filterPackageViewHint}</div>
                      <div className="space-y-2 max-h-56 overflow-y-auto">
                        {feeTypes.length === 0 ? (
                          <p className="text-xs text-muted-foreground">{t.payments.noFeeTypesConfigured}</p>
                        ) : (
                          feeTypes.map((fee) => (
                            <label key={fee.id} className="flex items-center gap-2 text-sm cursor-pointer">
                              <Checkbox
                                checked={filterFeeTypeIds.has(fee.id)}
                                onCheckedChange={(c) => toggleFilterFeeType(fee.id, c === true)}
                              />
                              <span className="flex-1 truncate">{fee.name}</span>
                            </label>
                          ))
                        )}
                      </div>
                      {filterFeeTypeIds.size > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full mt-2 text-xs"
                          onClick={() => setFilterFeeTypeIds(new Set())}
                        >
                          {t.payments.filterClearPackages}
                        </Button>
                      )}
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="min-w-[140px] flex-1">
                  <div className="text-[10px] text-muted-foreground mb-1">{t.payments.filterStatus}</div>
                  <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as typeof filterStatus)}>
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t.common.all}</SelectItem>
                      <SelectItem value="pending">{t.common.pending}</SelectItem>
                      <SelectItem value="overdue">{t.payments.overdue}</SelectItem>
                      <SelectItem value="paid">{t.payments.paidStatus}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {filterMemberId !== "all" && perms.isAdmin && (
                <div className="flex flex-wrap items-center justify-between gap-3 px-3 py-2 rounded-xl border border-primary/20 bg-primary/5">
                  <p className="text-xs text-muted-foreground">{t.payments.assignPackagesHint}</p>
                  <Button
                    size="sm"
                    className="bg-gradient-gold-static text-primary-foreground hover:brightness-110 shrink-0"
                    onClick={() =>
                      openRecordPaymentDialog({
                        membershipId: filterMemberId,
                        feeTypeIds: filterFeeTypeIds.size > 0 ? filterFeeTypeIds : undefined,
                      })
                    }
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    {t.payments.assignPackagesToMember.replace("{name}", memberNameById[filterMemberId] || "")}
                  </Button>
                </div>
              )}
            </div>

            <div className="rounded-xl bg-card border border-border overflow-hidden">
              {filteredPayments.length === 0 ? (
                <div className="text-center py-12 px-4 text-muted-foreground text-sm space-y-4">
                  <p>
                    {payments.length === 0 ? t.payments.noPaymentRecords : t.payments.noPaymentsMatchFilters}
                  </p>
                  <p className="text-xs">{t.payments.noPaymentRecordsHint}</p>
                  {perms.isAdmin && (
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-2 pt-1">
                      <Button
                        className="bg-gradient-gold-static text-primary-foreground hover:brightness-110"
                        onClick={() =>
                          openRecordPaymentDialog({
                            membershipId: filterMemberId !== "all" ? filterMemberId : undefined,
                            feeTypeIds: filterFeeTypeIds.size > 0 ? filterFeeTypeIds : undefined,
                          })
                        }
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        {payments.length === 0 ? t.payments.recordFirstPayment : t.payments.recordPayment}
                      </Button>
                      {payments.length === 0 && feeTypes.length === 0 && (
                        <Button size="sm" variant="outline" onClick={() => setTab("fees")}>
                          {t.payments.addFirstPackage}
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                filteredPayments.map((payment) => {
                  const cfg = statusConfig[payment.effectiveStatus];
                  const StatusIcon = cfg.icon;
                  const packageName = payment.membership_fee_types?.name || t.payments.payment;
                  const memberName = memberNameById[payment.membership_id] || t.payments.unknownMember;
                  return (
                    <div
                      key={payment.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 border-b border-border last:border-0"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${cfg.color}`}>
                          <StatusIcon className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-foreground truncate">
                            {packageName} · {memberName}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {t.payments.due}: {payment.due_date}
                            {payment.payment_method ? ` · ${payment.payment_method}` : ""}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0 pl-11 sm:pl-0">
                        <span className="text-sm font-display font-bold text-foreground">
                          €{Number(payment.amount).toFixed(2)}
                        </span>
                        {(payment.effectiveStatus === "pending" || payment.effectiveStatus === "overdue") && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => void handleMarkPaid(payment.id)}
                            className="text-xs"
                          >
                            {t.payments.markPaid}
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </>
        ) : (
          <MembershipFeePackagesOverview
            packages={feeTypes}
            canEdit={perms.isAdmin}
            onAdd={() => openFeePackageDialog(null)}
            onEdit={(pkg) => openFeePackageDialog(pkg)}
          />
        )}
      </div>

      {clubId && (
        <MembershipFeePackageFormDialog
          open={feePackageDialogOpen}
          onOpenChange={setFeePackageDialogOpen}
          clubId={clubId}
          editingPackage={editingFeePackage}
          onSaved={handleFeePackageSaved}
        />
      )}

      {showRecordPayment && (
        <div
          className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setShowRecordPayment(false)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-lg rounded-2xl bg-card border border-border p-6 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-display font-bold text-foreground">{t.payments.recordPayment}</h3>
              <Button variant="ghost" size="icon" onClick={() => setShowRecordPayment(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mb-4">{t.payments.recordPaymentDesc}</p>
            <div className="space-y-3">
              <Select value={recordMembershipId} onValueChange={setRecordMembershipId}>
                <SelectTrigger className="w-full h-10 bg-background">
                  <SelectValue placeholder={t.payments.selectMember} />
                </SelectTrigger>
                <SelectContent>
                  {memberships.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {memberNameById[m.id]} ({m.role})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                type="date"
                value={recordDueDate}
                onChange={(e) => setRecordDueDate(e.target.value)}
                className="bg-background"
              />
              <div className="rounded-xl border border-border p-3 space-y-2">
                <div className="text-xs font-medium text-foreground">{t.payments.selectPackages}</div>
                {activeFeeTypes.length === 0 ? (
                  <p className="text-xs text-muted-foreground">{t.payments.noFeeTypesConfigured}</p>
                ) : (
                  activeFeeTypes.map((fee) => (
                    <label key={fee.id} className="flex items-center gap-2 text-sm cursor-pointer">
                      <Checkbox
                        checked={recordFeeTypeIds.has(fee.id)}
                        onCheckedChange={(c) => toggleRecordFeeType(fee.id, c === true)}
                      />
                      <span className="flex-1">{fee.name}</span>
                      <span className="text-muted-foreground text-xs">€{Number(fee.amount).toFixed(2)}</span>
                    </label>
                  ))
                )}
              </div>
              <Select value={recordPaymentMethod} onValueChange={setRecordPaymentMethod}>
                <SelectTrigger className="w-full h-10 bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bank_transfer">{t.payments.methodBankTransfer}</SelectItem>
                  <SelectItem value="cash">{t.payments.methodCash}</SelectItem>
                  <SelectItem value="online">{t.payments.methodOnline}</SelectItem>
                </SelectContent>
              </Select>
              <Input
                placeholder={t.payments.notesOptional}
                value={recordNotes}
                onChange={(e) => setRecordNotes(e.target.value)}
                className="bg-background"
              />
              <Button
                onClick={() => void handleRecordPayment()}
                disabled={recordSubmitting || !recordMembershipId || !recordDueDate || recordFeeTypeIds.size === 0}
                className="w-full bg-gradient-gold-static text-primary-foreground hover:brightness-110"
              >
                {recordSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : t.payments.recordPaymentSubmit}
              </Button>
            </div>
          </motion.div>
        </div>
      )}

      {showBulkAssign && (
        <div
          className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setShowBulkAssign(false)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md rounded-2xl bg-card border border-border p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-display font-bold text-foreground">{t.payments.bulkAssignPackage}</h3>
              <Button variant="ghost" size="icon" onClick={() => setShowBulkAssign(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mb-4">{t.payments.bulkAssignDesc}</p>
            <div className="space-y-3">
              <Select value={bulkFeeTypeId} onValueChange={setBulkFeeTypeId}>
                <SelectTrigger className="w-full h-10 bg-background">
                  <SelectValue placeholder={t.payments.selectPackage} />
                </SelectTrigger>
                <SelectContent>
                  {activeFeeTypes.map((f) => (
                    <SelectItem key={f.id} value={f.id}>
                      {f.name} (€{Number(f.amount).toFixed(2)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input type="date" value={bulkDueDate} onChange={(e) => setBulkDueDate(e.target.value)} className="bg-background" />
              <Select value={bulkRole} onValueChange={setBulkRole}>
                <SelectTrigger className="w-full h-10 bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t.payments.bulkAllMembers}</SelectItem>
                  <SelectItem value="player">{t.payments.bulkPlayers}</SelectItem>
                  <SelectItem value="trainer">{t.payments.bulkTrainers}</SelectItem>
                  <SelectItem value="member">{t.payments.bulkMembersRole}</SelectItem>
                  <SelectItem value="parent">{t.payments.bulkParents}</SelectItem>
                </SelectContent>
              </Select>
              <Button
                onClick={() => void handleBulkAssign()}
                disabled={bulkSubmitting || !bulkFeeTypeId || !bulkDueDate}
                className="w-full bg-gradient-gold-static text-primary-foreground hover:brightness-110"
              >
                {bulkSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : t.payments.bulkAssignSubmit}
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default Payments;
