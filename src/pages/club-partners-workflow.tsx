import { useCallback, useEffect, useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { Link, useSearchParams } from "react-router-dom";
import {
  Building2,
  CalendarClock,
  Globe,
  Link2,
  Loader2,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Plus,
  Search,
} from "lucide-react";
import { DashboardHeaderSlot } from "@/components/layout/DashboardHeaderSlot";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { supabaseDynamic } from "@/lib/supabase-dynamic";
import { useAuth } from "@/contexts/useAuth";
import { useClubId } from "@/hooks/use-club-id";
import { usePermissions } from "@/hooks/use-permissions";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/hooks/use-language";
import { usePartnerWorkflows } from "@/hooks/use-partner-workflows";
import { DASHBOARD_PAGE_INNER, DASHBOARD_PAGE_ROOT } from "@/lib/dashboard-page-shell";
import {
  CONTRACT_STATUSES,
  ENGAGEMENT_CATEGORIES,
  INVOICE_STATUSES,
  PARTNER_TYPES,
  TASK_PRIORITIES,
  TASK_STATUSES,
  type ContractStatus,
  type EngagementCategory,
  type InvoiceStatus,
  type PartnerContractRow,
  type PartnerInvoiceRow,
  type PartnerRow,
  type PartnerTaskPriority,
  type PartnerTaskRow,
  type PartnerTaskStatus,
  type PartnersTab,
  isContractExpiringSoon,
  isPartnerTaskOpen,
  isPartnerTaskOverdue,
} from "@/lib/partner-workflow-models";
import {
  PARTNER_PANEL_CLASS,
  contractStatusBadgeClass,
  engagementCategoryIcon,
  partnerTypeBadgeClass,
  partnersTabIcon,
  taskStatusBadgeClass,
} from "@/lib/partner-workflow-ui";
import {
  marketplaceOfferPath,
  marketplaceRequestPath,
} from "@/lib/marketplace-club-relationship";
import { cn } from "@/lib/utils";

const NONE = "__none__";
const TABS: PartnersTab[] = ["overview", "directory", "engagements", "contracts", "invoices"];

interface ClubPartnersWorkflowProps {
  /** Render inside Marketplace hub — keeps parent tab bar, shows partner sub-tabs only. */
  embedded?: boolean;
}

function formatDate(value: string | null): string {
  if (!value) return "—";
  try {
    return format(parseISO(value.length > 10 ? value : `${value}T12:00:00`), "dd MMM yyyy");
  } catch {
    return value;
  }
}

export default function ClubPartnersWorkflow({ embedded = false }: ClubPartnersWorkflowProps) {
  const { user } = useAuth();
  const { clubId, loading: clubLoading } = useClubId();
  const perms = usePermissions();
  const { toast } = useToast();
  const { t } = useLanguage();
  const p = t.partnersPage;
  const [searchParams, setSearchParams] = useSearchParams();

  const tabParam = searchParams.get("tab") as PartnersTab | null;
  const tab: PartnersTab = TABS.includes(tabParam as PartnersTab) ? (tabParam as PartnersTab) : "overview";
  const partnerParam = searchParams.get("partner");

  const canManagePartners = perms.isAdmin || perms.has("partners:write");
  const canManageWorkflows = perms.isAdmin || perms.has("partners:write");

  const { partners, contracts, invoices, tasks, events, schemaReady, loading, reload } =
    usePartnerWorkflows(clubId);

  const [q, setQ] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState<EngagementCategory | "all">("all");
  const [partnerFilter, setPartnerFilter] = useState(partnerParam ?? "all");
  const [marketplaceOnly, setMarketplaceOnly] = useState(false);

  useEffect(() => {
    if (partnerParam) setPartnerFilter(partnerParam);
  }, [partnerParam]);

  const [partnerDialogOpen, setPartnerDialogOpen] = useState(false);
  const [engagementDialogOpen, setEngagementDialogOpen] = useState(false);
  const [contractDialogOpen, setContractDialogOpen] = useState(false);
  const [invoiceDialogOpen, setInvoiceDialogOpen] = useState(false);

  const [editingEngagement, setEditingEngagement] = useState<PartnerTaskRow | null>(null);
  const [editingContract, setEditingContract] = useState<PartnerContractRow | null>(null);
  const [editingInvoice, setEditingInvoice] = useState<PartnerInvoiceRow | null>(null);

  const [name, setName] = useState("");
  const [partnerType, setPartnerType] = useState("sponsor");
  const [website, setWebsite] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [partnerId, setPartnerId] = useState("");
  const [contractId, setContractId] = useState(NONE);
  const [eventId, setEventId] = useState(NONE);
  const [engagementCategory, setEngagementCategory] = useState<EngagementCategory>("club_event");
  const [location, setLocation] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState<PartnerTaskPriority>("normal");
  const [taskStatus, setTaskStatus] = useState<PartnerTaskStatus>("open");
  const [contractStatus, setContractStatus] = useState<ContractStatus>("draft");
  const [invoiceStatus, setInvoiceStatus] = useState<InvoiceStatus>("pending");
  const [valueEur, setValueEur] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [renewalDate, setRenewalDate] = useState("");
  const [invoiceNo, setInvoiceNo] = useState("");
  const [amountEur, setAmountEur] = useState("");
  const [saving, setSaving] = useState(false);

  const setTab = (next: PartnersTab) => {
    const params = new URLSearchParams(searchParams);
    params.set("tab", next);
    setSearchParams(params, { replace: true });
  };

  const partnerLabel = useCallback(
    (id: string) => partners.find((row) => row.id === id)?.name ?? p.unknownPartner,
    [partners, p.unknownPartner],
  );

  const partnerTypeLabel = (type: string) =>
    (p.partnerTypes as Record<string, string>)[type] ?? type;

  const filteredPartners = useMemo(() => {
    const s = q.trim().toLowerCase();
    return partners.filter((row) => {
      if (marketplaceOnly && !row.marketplace_source) return false;
      if (typeFilter !== "all" && row.partner_type !== typeFilter) return false;
      if (!s) return true;
      return [row.name, row.partner_type, row.website ?? "", row.email ?? "", row.phone ?? "", row.notes ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(s);
    });
  }, [partners, q, typeFilter, marketplaceOnly]);

  const scopedTasks = useMemo(() => {
    return tasks.filter((row) => {
      if (partnerFilter !== "all" && row.partner_id !== partnerFilter) return false;
      if (categoryFilter !== "all" && row.engagement_category !== categoryFilter) return false;
      return true;
    });
  }, [tasks, partnerFilter, categoryFilter]);

  const scopedContracts = useMemo(
    () => contracts.filter((row) => partnerFilter === "all" || row.partner_id === partnerFilter),
    [contracts, partnerFilter],
  );

  const scopedInvoices = useMemo(
    () => invoices.filter((row) => partnerFilter === "all" || row.partner_id === partnerFilter),
    [invoices, partnerFilter],
  );

  const kpis = useMemo(() => {
    const activeContracts = contracts.filter((c) => c.contract_status === "active").length;
    const openEngagements = tasks.filter((task) => isPartnerTaskOpen(task.task_status)).length;
    const pendingInvoices = invoices.filter((inv) => inv.invoice_status === "pending" || inv.invoice_status === "overdue").length;
    return { partners: partners.length, activeContracts, openEngagements, pendingInvoices };
  }, [partners.length, contracts, tasks, invoices]);

  const upcomingEngagements = useMemo(
    () => scopedTasks.filter((task) => isPartnerTaskOpen(task.task_status)).slice(0, 6),
    [scopedTasks],
  );

  const expiringContracts = useMemo(
    () =>
      contracts
        .filter((c) => c.contract_status === "active" && isContractExpiringSoon(c.end_date, c.renewal_date))
        .slice(0, 5),
    [contracts],
  );

  const overdueEngagements = useMemo(
    () => scopedTasks.filter((task) => isPartnerTaskOverdue(task.due_date, task.task_status)).slice(0, 5),
    [scopedTasks],
  );

  const pendingInvoiceRows = useMemo(
    () => invoices.filter((inv) => inv.invoice_status === "pending" || inv.invoice_status === "overdue").slice(0, 5),
    [invoices],
  );

  const resetPartnerForm = () => {
    setName("");
    setPartnerType("sponsor");
    setWebsite("");
    setEmail("");
    setPhone("");
    setNotes("");
  };

  const openNewEngagement = () => {
    setEditingEngagement(null);
    setName("");
    setNotes("");
    setPartnerId(partners[0]?.id ?? "");
    setContractId(NONE);
    setEventId(NONE);
    setEngagementCategory("club_event");
    setLocation("");
    setDueDate("");
    setPriority("normal");
    setTaskStatus("open");
    setEngagementDialogOpen(true);
  };

  const openEditEngagement = (row: PartnerTaskRow) => {
    setEditingEngagement(row);
    setName(row.title);
    setNotes(row.description ?? "");
    setPartnerId(row.partner_id);
    setContractId(row.contract_id ?? NONE);
    setEventId(row.related_event_id ?? NONE);
    setEngagementCategory(row.engagement_category ?? "other");
    setLocation(row.location ?? "");
    setDueDate(row.due_date ?? "");
    setPriority(row.priority);
    setTaskStatus(row.task_status);
    setEngagementDialogOpen(true);
  };

  const openNewContract = () => {
    setEditingContract(null);
    setName("");
    setNotes("");
    setPartnerId(partners[0]?.id ?? "");
    setContractStatus("draft");
    setValueEur("");
    setStartDate("");
    setEndDate("");
    setRenewalDate("");
    setContractDialogOpen(true);
  };

  const openEditContract = (row: PartnerContractRow) => {
    setEditingContract(row);
    setName(row.title);
    setNotes(row.notes ?? "");
    setPartnerId(row.partner_id);
    setContractStatus(row.contract_status);
    setValueEur(row.value_eur != null ? String(row.value_eur) : "");
    setStartDate(row.start_date ?? "");
    setEndDate(row.end_date ?? "");
    setRenewalDate(row.renewal_date ?? "");
    setContractDialogOpen(true);
  };

  const openNewInvoice = () => {
    setEditingInvoice(null);
    setInvoiceNo(`INV-${Date.now()}`);
    setAmountEur("");
    setDueDate("");
    setPartnerId(partners[0]?.id ?? "");
    setContractId(NONE);
    setInvoiceStatus("pending");
    setInvoiceDialogOpen(true);
  };

  const openEditInvoice = (row: PartnerInvoiceRow) => {
    setEditingInvoice(row);
    setInvoiceNo(row.invoice_no);
    setAmountEur(String(row.amount_eur));
    setDueDate(row.due_date ?? "");
    setPartnerId(row.partner_id);
    setContractId(row.contract_id ?? NONE);
    setInvoiceStatus(row.invoice_status);
    setInvoiceDialogOpen(true);
  };

  const createPartner = async () => {
    if (!clubId || !user || !canManagePartners || !name.trim()) return;
    setSaving(true);
    const { error } = await supabase.from("partners").insert({
      club_id: clubId,
      name: name.trim(),
      partner_type: partnerType,
      website: website.trim() || null,
      email: email.trim() || null,
      phone: phone.trim() || null,
      notes: notes.trim() || null,
      created_by: user.id,
    });
    setSaving(false);
    if (error) {
      toast({ title: t.common.error, description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: p.toastPartnerCreated });
    setPartnerDialogOpen(false);
    resetPartnerForm();
    await reload();
  };

  const saveEngagement = async () => {
    if (!clubId || !canManageWorkflows || !partnerId || !name.trim()) return;
    setSaving(true);
    const payload = {
      club_id: clubId,
      partner_id: partnerId,
      contract_id: contractId === NONE ? null : contractId,
      title: name.trim(),
      description: notes.trim() || null,
      priority,
      task_status: taskStatus,
      due_date: dueDate || null,
      engagement_category: engagementCategory,
      related_event_id: eventId === NONE ? null : eventId,
      location: location.trim() || null,
    };
    const { error } = editingEngagement
      ? await supabaseDynamic.from("partner_tasks").update(payload).eq("id", editingEngagement.id)
      : await supabaseDynamic.from("partner_tasks").insert(payload);
    setSaving(false);
    if (error) {
      toast({ title: t.common.error, description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: p.saved });
    setEngagementDialogOpen(false);
    await reload();
  };

  const saveContract = async () => {
    if (!clubId || !canManageWorkflows || !partnerId || !name.trim()) return;
    setSaving(true);
    const payload = {
      club_id: clubId,
      partner_id: partnerId,
      title: name.trim(),
      contract_status: contractStatus,
      value_eur: valueEur ? Number(valueEur) : null,
      start_date: startDate || null,
      end_date: endDate || null,
      renewal_date: renewalDate || null,
      notes: notes.trim() || null,
    };
    const { error } = editingContract
      ? await supabaseDynamic.from("partner_contracts").update(payload).eq("id", editingContract.id)
      : await supabaseDynamic.from("partner_contracts").insert(payload);
    setSaving(false);
    if (error) {
      toast({ title: t.common.error, description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: p.saved });
    setContractDialogOpen(false);
    await reload();
  };

  const saveInvoice = async () => {
    if (!clubId || !canManageWorkflows || !partnerId || !invoiceNo.trim()) return;
    setSaving(true);
    const payload = {
      club_id: clubId,
      partner_id: partnerId,
      contract_id: contractId === NONE ? null : contractId,
      invoice_no: invoiceNo.trim(),
      amount_eur: Number(amountEur || 0),
      due_date: dueDate || null,
      invoice_status: invoiceStatus,
    };
    const { error } = editingInvoice
      ? await supabaseDynamic.from("partner_invoices").update(payload).eq("id", editingInvoice.id)
      : await supabaseDynamic.from("partner_invoices").insert(payload);
    setSaving(false);
    if (error) {
      toast({ title: t.common.error, description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: p.saved });
    setInvoiceDialogOpen(false);
    await reload();
  };

  const updateTaskStatus = async (row: PartnerTaskRow, status: PartnerTaskStatus) => {
    if (!canManageWorkflows) return;
    const { error } = await supabaseDynamic.from("partner_tasks").update({ task_status: status }).eq("id", row.id);
    if (error) {
      toast({ title: t.common.error, description: error.message, variant: "destructive" });
      return;
    }
    await reload();
  };

  const markInvoicePaid = async (row: PartnerInvoiceRow) => {
    if (!canManageWorkflows) return;
    const { error } = await supabaseDynamic
      .from("partner_invoices")
      .update({ invoice_status: "paid", paid_at: new Date().toISOString() })
      .eq("id", row.id);
    if (error) {
      toast({ title: t.common.error, description: error.message, variant: "destructive" });
      return;
    }
    await reload();
  };

  const setPartnerPublicVisibility = async (id: string, value: boolean) => {
    if (!canManagePartners) return;
    const { error } = await supabase.from("partners").update({ show_on_public_club_page: value }).eq("id", id);
    if (error) {
      toast({ title: t.common.error, description: error.message, variant: "destructive" });
      return;
    }
    await reload();
  };

  const headerAction = () => {
    if (!canManagePartners && !canManageWorkflows) return null;
    if (tab === "directory" && canManagePartners) {
      return (
        <Button
          size="sm"
          className="bg-gradient-gold-static text-primary-foreground font-semibold hover:brightness-110 shrink-0"
          onClick={() => {
            resetPartnerForm();
            setPartnerDialogOpen(true);
          }}
        >
          <Plus className="w-4 h-4 mr-1" /> {p.dialogs.newPartner}
        </Button>
      );
    }
    if (!canManageWorkflows || !schemaReady) return null;
    if (tab === "engagements") {
      return (
        <Button size="sm" className="bg-gradient-gold-static text-primary-foreground font-semibold hover:brightness-110 shrink-0" onClick={openNewEngagement}>
          <Plus className="w-4 h-4 mr-1" /> {p.engagements.new}
        </Button>
      );
    }
    if (tab === "contracts") {
      return (
        <Button size="sm" className="bg-gradient-gold-static text-primary-foreground font-semibold hover:brightness-110 shrink-0" onClick={openNewContract}>
          <Plus className="w-4 h-4 mr-1" /> {p.contracts.new}
        </Button>
      );
    }
    if (tab === "invoices") {
      return (
        <Button size="sm" className="bg-gradient-gold-static text-primary-foreground font-semibold hover:brightness-110 shrink-0" onClick={openNewInvoice}>
          <Plus className="w-4 h-4 mr-1" /> {p.invoices.new}
        </Button>
      );
    }
    return null;
  };

  const renderEngagementCard = (task: PartnerTaskRow, compact = false) => {
    const CategoryIcon = engagementCategoryIcon(task.engagement_category);
    const linkedEvent = events.find((e) => e.id === task.related_event_id);
    return (
      <div key={task.id} className={cn(PARTNER_PANEL_CLASS, "p-4")}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium bg-primary/10 text-primary">
                <CategoryIcon className="h-3 w-3" />
                {p.engagementCategories[task.engagement_category]}
              </span>
              <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-medium", taskStatusBadgeClass(task.task_status))}>
                {p.taskStatuses[task.task_status]}
              </span>
            </div>
            <div className="mt-2 font-display font-bold text-foreground">{task.title}</div>
            <div className="mt-1 text-xs text-muted-foreground">{partnerLabel(task.partner_id)}</div>
            {!compact && task.description ? (
              <p className="mt-2 text-sm text-muted-foreground">{task.description}</p>
            ) : null}
            <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
              {task.due_date ? (
                <span className="inline-flex items-center gap-1">
                  <CalendarClock className="h-3.5 w-3.5" />
                  {formatDate(task.due_date)}
                </span>
              ) : null}
              {task.location ? (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" />
                  {task.location}
                </span>
              ) : null}
              {linkedEvent ? <span>{linkedEvent.title}</span> : null}
            </div>
            {task.marketplace_offer_id || task.marketplace_request_id ? (
              <div className="mt-2 flex flex-wrap gap-2 text-xs">
                <span className="rounded-full bg-primary/10 px-2 py-0.5 font-medium text-primary">
                  {p.marketplace.fromMarketplace}
                </span>
                {task.marketplace_request_id ? (
                  <Link
                    to={marketplaceRequestPath(task.marketplace_request_id)}
                    className="text-primary hover:underline"
                  >
                    {p.marketplace.viewRequest}
                  </Link>
                ) : null}
                {task.marketplace_offer_id ? (
                  <Link
                    to={marketplaceOfferPath(task.marketplace_offer_id)}
                    className="text-primary hover:underline"
                  >
                    {p.marketplace.viewOffer}
                  </Link>
                ) : null}
              </div>
            ) : null}
          </div>
          {canManageWorkflows ? (
            <div className="flex shrink-0 flex-col gap-1">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditEngagement(task)}>
                <Pencil className="h-4 w-4" />
              </Button>
              {task.task_status === "open" ? (
                <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => void updateTaskStatus(task, "in_progress")}>
                  {p.engagements.markInProgress}
                </Button>
              ) : null}
              {task.task_status !== "done" ? (
                <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => void updateTaskStatus(task, "done")}>
                  {p.engagements.markDone}
                </Button>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    );
  };

  const partnerTabBar = (
    <div
      className={cn(
        "flex min-w-0 flex-wrap items-center gap-2",
        embedded
          ? "rounded-xl border border-border/50 bg-muted/15 p-2"
          : "overflow-x-auto pb-1",
      )}
    >
      {embedded ? (
        <span className="shrink-0 px-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {p.embeddedSectionLabel}
        </span>
      ) : null}
      <div className="flex min-w-0 flex-1 flex-wrap gap-2">
        {TABS.map((item) => {
          const Icon = partnersTabIcon(item);
          return (
            <Button
              key={item}
              variant={tab === item ? "default" : "outline"}
              size="sm"
              className={embedded && tab !== item ? "bg-background/60" : undefined}
              onClick={() => setTab(item)}
            >
              <Icon className="mr-1 h-4 w-4" />
              {p.tabs[item]}
            </Button>
          );
        })}
      </div>
      {embedded ? <div className="shrink-0">{headerAction()}</div> : null}
    </div>
  );

  const partnerBody = (
    <>
      {!embedded && !schemaReady ? (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">
          {p.schemaHint}
        </div>
      ) : null}

      {embedded && !schemaReady ? (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-800 dark:text-amber-200">
          {p.schemaHint}
        </div>
      ) : null}

      {!embedded ? (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            { label: p.kpi.partners, value: kpis.partners },
            { label: p.kpi.activeContracts, value: kpis.activeContracts },
            { label: p.kpi.openEngagements, value: kpis.openEngagements },
            { label: p.kpi.pendingInvoices, value: kpis.pendingInvoices },
          ].map((item) => (
            <div key={item.label} className={cn(PARTNER_PANEL_CLASS, "p-4")}>
              <div className="text-xs text-muted-foreground">{item.label}</div>
              <div className="mt-1 font-display text-2xl font-bold text-foreground">{item.value}</div>
            </div>
          ))}
        </div>
      ) : null}

      {!embedded ? (
        <div className="flex min-w-0 flex-wrap gap-2 overflow-x-auto pb-1">
          {TABS.map((item) => {
            const Icon = partnersTabIcon(item);
            return (
              <Button key={item} variant={tab === item ? "default" : "outline"} size="sm" onClick={() => setTab(item)}>
                <Icon className="mr-1 h-4 w-4" />
                {p.tabs[item]}
              </Button>
            );
          })}
        </div>
      ) : (
        partnerTabBar
      )}

      {(clubLoading || loading) ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : !clubId ? (
          <div className="py-20 text-center text-muted-foreground">{t.common.pleaseSignIn}</div>
        ) : (
          <>
            {tab === "overview" && (
              <div className="grid gap-4 lg:grid-cols-2">
                <section className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-display font-semibold text-foreground">{p.overview.upcomingEngagements}</h3>
                    <Button variant="ghost" size="sm" onClick={() => setTab("engagements")}>{p.overview.viewAll}</Button>
                  </div>
                  {upcomingEngagements.length === 0 ? (
                    <div className={cn(PARTNER_PANEL_CLASS, "p-4 text-sm text-muted-foreground")}>{p.overview.empty}</div>
                  ) : (
                    upcomingEngagements.map((task) => renderEngagementCard(task, true))
                  )}
                </section>

                <section className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-display font-semibold text-foreground">{p.overview.expiringContracts}</h3>
                    <Button variant="ghost" size="sm" onClick={() => setTab("contracts")}>{p.overview.viewAll}</Button>
                  </div>
                  {expiringContracts.length === 0 ? (
                    <div className={cn(PARTNER_PANEL_CLASS, "p-4 text-sm text-muted-foreground")}>{p.overview.empty}</div>
                  ) : (
                    expiringContracts.map((c) => (
                      <div key={c.id} className={cn(PARTNER_PANEL_CLASS, "p-4")}>
                        <div className="font-display font-bold text-foreground">{c.title}</div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          {partnerLabel(c.partner_id)} · {formatDate(c.renewal_date ?? c.end_date)}
                        </div>
                      </div>
                    ))
                  )}

                  <h3 className="pt-2 font-display font-semibold text-foreground">{p.overview.pendingInvoices}</h3>
                  {pendingInvoiceRows.length === 0 ? (
                    <div className={cn(PARTNER_PANEL_CLASS, "p-4 text-sm text-muted-foreground")}>{p.overview.empty}</div>
                  ) : (
                    pendingInvoiceRows.map((inv) => (
                      <div key={inv.id} className={cn(PARTNER_PANEL_CLASS, "p-4")}>
                        <div className="font-display font-bold text-foreground">{inv.invoice_no}</div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          {partnerLabel(inv.partner_id)} · EUR {Number(inv.amount_eur).toFixed(2)} · {p.invoiceStatuses[inv.invoice_status]}
                        </div>
                      </div>
                    ))
                  )}
                </section>
              </div>
            )}

            {tab === "directory" && (
              <div className="space-y-4">
                <div className={cn(PARTNER_PANEL_CLASS, "grid gap-3 p-3 sm:grid-cols-[1fr_180px]")}>
                  <div className="flex items-center gap-2">
                    <Search className="h-4 w-4 text-muted-foreground" />
                    <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={p.searchPlaceholder} />
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Select value={typeFilter} onValueChange={setTypeFilter}>
                      <SelectTrigger className="h-10 rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{p.directory.filterAllTypes}</SelectItem>
                        {PARTNER_TYPES.map((type) => (
                          <SelectItem key={type} value={type}>{partnerTypeLabel(type)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      type="button"
                      size="sm"
                      variant={marketplaceOnly ? "default" : "outline"}
                      onClick={() => setMarketplaceOnly((v) => !v)}
                    >
                      {p.marketplace.filterMarketplace}
                    </Button>
                  </div>
                </div>

                {filteredPartners.length === 0 ? (
                  <div className="py-16 text-center">
                    <Building2 className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                    <h2 className="font-display text-xl font-bold text-foreground">{p.directory.emptyTitle}</h2>
                    <p className="mt-2 text-muted-foreground">{p.directory.emptyDesc}</p>
                  </div>
                ) : (
                  <div className="grid gap-3 md:grid-cols-2">
                    {filteredPartners.map((row) => (
                      <PartnerCard
                        key={row.id}
                        row={row}
                        canManage={canManagePartners}
                        typeLabel={partnerTypeLabel(row.partner_type)}
                        publicLabel={p.directory.publicVisibility}
                        marketplaceLabel={p.marketplace.fromMarketplace}
                        viewOfferLabel={p.marketplace.viewOffer}
                        viewRequestLabel={p.marketplace.viewRequest}
                        onTogglePublic={(value) => void setPartnerPublicVisibility(row.id, value)}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {tab === "engagements" && (
              <WorkflowTab
                partnerFilter={partnerFilter}
                setPartnerFilter={setPartnerFilter}
                partners={partners}
                selectPartnerLabel={p.selectPartner}
                filterAllLabel={p.directory.filterAllTypes}
                extraFilter={
                  <Select value={categoryFilter} onValueChange={(v) => setCategoryFilter(v as EngagementCategory | "all")}>
                    <SelectTrigger className="h-10 rounded-xl sm:w-[220px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{p.engagements.filterAll}</SelectItem>
                      {ENGAGEMENT_CATEGORIES.map((cat) => (
                        <SelectItem key={cat} value={cat}>{p.engagementCategories[cat]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                }
                empty={p.engagements.empty}
              >
                {scopedTasks.map((task) => renderEngagementCard(task))}
              </WorkflowTab>
            )}

            {tab === "contracts" && (
              <WorkflowTab
                partnerFilter={partnerFilter}
                setPartnerFilter={setPartnerFilter}
                partners={partners}
                selectPartnerLabel={p.selectPartner}
                filterAllLabel={p.directory.filterAllTypes}
                empty={p.contracts.empty}
              >
                {scopedContracts.map((c) => (
                  <div key={c.id} className={cn(PARTNER_PANEL_CLASS, "p-4")}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap gap-2">
                          <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-medium", contractStatusBadgeClass(c.contract_status))}>
                            {p.contractStatuses[c.contract_status]}
                          </span>
                        </div>
                        <div className="mt-2 font-display font-bold text-foreground">{c.title}</div>
                        <div className="mt-1 text-xs text-muted-foreground">{partnerLabel(c.partner_id)}</div>
                        <div className="mt-2 text-xs text-muted-foreground">
                          {c.value_eur != null ? `EUR ${Number(c.value_eur).toFixed(2)}` : null}
                          {c.start_date ? ` · ${formatDate(c.start_date)}` : null}
                          {c.end_date ? ` – ${formatDate(c.end_date)}` : null}
                        </div>
                      </div>
                      {canManageWorkflows ? (
                        <Button variant="ghost" size="icon" onClick={() => openEditContract(c)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                      ) : null}
                    </div>
                  </div>
                ))}
              </WorkflowTab>
            )}

            {tab === "invoices" && (
              <WorkflowTab
                partnerFilter={partnerFilter}
                setPartnerFilter={setPartnerFilter}
                partners={partners}
                selectPartnerLabel={p.selectPartner}
                filterAllLabel={p.directory.filterAllTypes}
                empty={p.invoices.empty}
              >
                {scopedInvoices.map((inv) => (
                  <div key={inv.id} className={cn(PARTNER_PANEL_CLASS, "p-4")}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-display font-bold text-foreground">{inv.invoice_no}</div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          {partnerLabel(inv.partner_id)} · EUR {Number(inv.amount_eur).toFixed(2)} · {p.invoiceStatuses[inv.invoice_status]}
                        </div>
                        {inv.due_date ? <div className="mt-1 text-xs text-muted-foreground">{formatDate(inv.due_date)}</div> : null}
                      </div>
                      {canManageWorkflows ? (
                        <div className="flex flex-col gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openEditInvoice(inv)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          {inv.invoice_status !== "paid" ? (
                            <Button variant="outline" size="sm" className="text-xs" onClick={() => void markInvoicePaid(inv)}>
                              {p.invoices.markPaid}
                            </Button>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  </div>
                ))}
              </WorkflowTab>
            )}
          </>
        )}
    </>
  );

  const partnerDialogs = (
    <>
      <Dialog open={partnerDialogOpen} onOpenChange={setPartnerDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{p.dialogs.newPartner}</DialogTitle>
          </DialogHeader>
          <PartnerFormFields
            p={p}
            name={name}
            setName={setName}
            partnerType={partnerType}
            setPartnerType={setPartnerType}
            website={website}
            setWebsite={setWebsite}
            email={email}
            setEmail={setEmail}
            phone={phone}
            setPhone={setPhone}
            notes={notes}
            setNotes={setNotes}
          />
          <DialogFooter>
            <Button className="bg-gradient-gold-static text-primary-foreground" disabled={saving} onClick={() => void createPartner()}>
              {p.create}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={engagementDialogOpen} onOpenChange={setEngagementDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingEngagement ? p.engagements.edit : p.engagements.new}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <Field label={p.engagements.partner}>
              <Select value={partnerId || NONE} onValueChange={(v) => setPartnerId(v === NONE ? "" : v)}>
                <SelectTrigger><SelectValue placeholder={p.selectPartner} /></SelectTrigger>
                <SelectContent>
                  {partners.map((row) => <SelectItem key={row.id} value={row.id}>{row.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label={p.engagements.title}><Input value={name} onChange={(e) => setName(e.target.value)} /></Field>
            <Field label={p.engagements.category}>
              <Select value={engagementCategory} onValueChange={(v) => setEngagementCategory(v as EngagementCategory)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ENGAGEMENT_CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>{p.engagementCategories[cat]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label={p.engagements.description}>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label={p.engagements.dueDate}><Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} /></Field>
              <Field label={p.engagements.location}><Input value={location} onChange={(e) => setLocation(e.target.value)} /></Field>
            </div>
            <Field label={p.engagements.event}>
              <Select value={eventId} onValueChange={setEventId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>{p.none}</SelectItem>
                  {events.map((ev) => <SelectItem key={ev.id} value={ev.id}>{ev.title}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label={p.engagements.contract}>
              <Select value={contractId} onValueChange={setContractId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>{p.none}</SelectItem>
                  {contracts.filter((c) => c.partner_id === partnerId).map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label={p.engagements.priority}>
                <Select value={priority} onValueChange={(v) => setPriority(v as PartnerTaskPriority)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TASK_PRIORITIES.map((item) => <SelectItem key={item} value={item}>{p.priorities[item]}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
              <Field label={p.engagements.status}>
                <Select value={taskStatus} onValueChange={(v) => setTaskStatus(v as PartnerTaskStatus)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TASK_STATUSES.map((item) => <SelectItem key={item} value={item}>{p.taskStatuses[item]}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
            </div>
          </div>
          <DialogFooter>
            <Button className="bg-gradient-gold-static text-primary-foreground" disabled={saving} onClick={() => void saveEngagement()}>
              {p.dialogs.save}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={contractDialogOpen} onOpenChange={setContractDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingContract ? p.contracts.edit : p.contracts.new}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <Field label={p.engagements.partner}>
              <Select value={partnerId || NONE} onValueChange={(v) => setPartnerId(v === NONE ? "" : v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {partners.map((row) => <SelectItem key={row.id} value={row.id}>{row.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label={p.contracts.title}><Input value={name} onChange={(e) => setName(e.target.value)} /></Field>
            <Field label={p.contracts.status}>
              <Select value={contractStatus} onValueChange={(v) => setContractStatus(v as ContractStatus)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CONTRACT_STATUSES.map((item) => <SelectItem key={item} value={item}>{p.contractStatuses[item]}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label={p.contracts.value}><Input type="number" min="0" step="0.01" value={valueEur} onChange={(e) => setValueEur(e.target.value)} /></Field>
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label={p.contracts.startDate}><Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} /></Field>
              <Field label={p.contracts.endDate}><Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} /></Field>
              <Field label={p.contracts.renewalDate}><Input type="date" value={renewalDate} onChange={(e) => setRenewalDate(e.target.value)} /></Field>
            </div>
            <Field label={p.contracts.notes}><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} /></Field>
          </div>
          <DialogFooter>
            <Button className="bg-gradient-gold-static text-primary-foreground" disabled={saving} onClick={() => void saveContract()}>
              {p.dialogs.save}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={invoiceDialogOpen} onOpenChange={setInvoiceDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingInvoice ? p.invoices.edit : p.invoices.new}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <Field label={p.engagements.partner}>
              <Select value={partnerId || NONE} onValueChange={(v) => setPartnerId(v === NONE ? "" : v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {partners.map((row) => <SelectItem key={row.id} value={row.id}>{row.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label={p.invoices.number}><Input value={invoiceNo} onChange={(e) => setInvoiceNo(e.target.value)} /></Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label={p.invoices.amount}><Input type="number" min="0" step="0.01" value={amountEur} onChange={(e) => setAmountEur(e.target.value)} /></Field>
              <Field label={p.invoices.dueDate}><Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} /></Field>
            </div>
            <Field label={p.invoices.status}>
              <Select value={invoiceStatus} onValueChange={(v) => setInvoiceStatus(v as InvoiceStatus)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {INVOICE_STATUSES.map((item) => <SelectItem key={item} value={item}>{p.invoiceStatuses[item]}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label={p.invoices.contract}>
              <Select value={contractId} onValueChange={setContractId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>{p.none}</SelectItem>
                  {contracts.filter((c) => c.partner_id === partnerId).map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>
          <DialogFooter>
            <Button className="bg-gradient-gold-static text-primary-foreground" disabled={saving} onClick={() => void saveInvoice()}>
              {p.dialogs.save}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );

  if (embedded) {
    return (
      <div className="space-y-4">
        {partnerBody}
        {partnerDialogs}
      </div>
    );
  }

  return (
    <div className={DASHBOARD_PAGE_ROOT}>
      <DashboardHeaderSlot
        title={p.title}
        subtitle={schemaReady ? p.subtitleOperational : p.subtitleFallback}
        toolbarRevision={`${tab}-${canManagePartners}-${schemaReady}`}
        rightSlot={headerAction()}
      />

      <div className={`${DASHBOARD_PAGE_INNER} min-w-0 space-y-4`}>
        {partnerBody}
      </div>

      {partnerDialogs}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function WorkflowTab({
  partnerFilter,
  setPartnerFilter,
  partners,
  selectPartnerLabel,
  filterAllLabel,
  extraFilter,
  empty,
  children,
}: {
  partnerFilter: string;
  setPartnerFilter: (v: string) => void;
  partners: PartnerRow[];
  selectPartnerLabel: string;
  filterAllLabel: string;
  extraFilter?: React.ReactNode;
  empty: string;
  children: React.ReactNode;
}) {
  const childArray = Array.isArray(children) ? children : [children];
  const hasItems = childArray.some((child) => child != null);

  return (
    <div className="space-y-3">
      <div className={cn(PARTNER_PANEL_CLASS, "flex flex-wrap gap-2 p-3")}>
        <Select value={partnerFilter} onValueChange={setPartnerFilter}>
          <SelectTrigger className="h-10 w-full rounded-xl sm:w-[220px]">
            <SelectValue placeholder={selectPartnerLabel} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{filterAllLabel}</SelectItem>
            {partners.map((row) => <SelectItem key={row.id} value={row.id}>{row.name}</SelectItem>)}
          </SelectContent>
        </Select>
        {extraFilter}
      </div>
      {!hasItems ? <div className={cn(PARTNER_PANEL_CLASS, "p-6 text-sm text-muted-foreground")}>{empty}</div> : children}
    </div>
  );
}

function PartnerCard({
  row,
  canManage,
  typeLabel,
  publicLabel,
  marketplaceLabel,
  viewOfferLabel,
  viewRequestLabel,
  onTogglePublic,
}: {
  row: PartnerRow;
  canManage: boolean;
  typeLabel: string;
  publicLabel: string;
  marketplaceLabel: string;
  viewOfferLabel: string;
  viewRequestLabel: string;
  onTogglePublic: (value: boolean) => void;
}) {
  return (
    <div className={cn(PARTNER_PANEL_CLASS, "p-4")}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className={cn("inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium", partnerTypeBadgeClass(row.partner_type))}>
              {typeLabel}
            </span>
            {row.marketplace_source ? (
              <span className="inline-flex rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                {marketplaceLabel}
              </span>
            ) : null}
          </div>
          <div className="mt-2 truncate font-display font-bold text-foreground">{row.name}</div>
          <div className="mt-2 grid gap-1 text-xs text-muted-foreground">
            {row.website ? (
              <a className="inline-flex items-center gap-1 hover:text-foreground" href={row.website} target="_blank" rel="noreferrer">
                <Link2 className="h-3.5 w-3.5" /> {row.website}
              </a>
            ) : null}
            {row.email ? (
              <a className="inline-flex items-center gap-1 hover:text-foreground" href={`mailto:${row.email}`}>
                <Mail className="h-3.5 w-3.5" /> {row.email}
              </a>
            ) : null}
            {row.phone ? (
              <a className="inline-flex items-center gap-1 hover:text-foreground" href={`tel:${row.phone}`}>
                <Phone className="h-3.5 w-3.5" /> {row.phone}
              </a>
            ) : null}
          </div>
          {row.notes ? <p className="mt-2 text-xs text-muted-foreground">{row.notes}</p> : null}
          {row.marketplace_source ? (
            <div className="mt-2 flex flex-wrap gap-2 text-xs">
              {row.marketplace_request_id ? (
                <Link to={marketplaceRequestPath(row.marketplace_request_id)} className="text-primary hover:underline">
                  {viewRequestLabel}
                </Link>
              ) : null}
              {row.marketplace_offer_id ? (
                <Link to={marketplaceOfferPath(row.marketplace_offer_id)} className="text-primary hover:underline">
                  {viewOfferLabel}
                </Link>
              ) : null}
            </div>
          ) : null}
        </div>
        {canManage ? (
          <div className="flex shrink-0 flex-col items-end gap-1 text-right">
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
              <Globe className="h-3.5 w-3.5" />
              <span>{publicLabel}</span>
            </div>
            <Switch checked={Boolean(row.show_on_public_club_page)} onCheckedChange={onTogglePublic} />
          </div>
        ) : null}
      </div>
    </div>
  );
}

function PartnerFormFields({
  p,
  name,
  setName,
  partnerType,
  setPartnerType,
  website,
  setWebsite,
  email,
  setEmail,
  phone,
  setPhone,
  notes,
  setNotes,
}: {
  p: typeof import("@/i18n/en").en.partnersPage;
  name: string;
  setName: (v: string) => void;
  partnerType: string;
  setPartnerType: (v: string) => void;
  website: string;
  setWebsite: (v: string) => void;
  email: string;
  setEmail: (v: string) => void;
  phone: string;
  setPhone: (v: string) => void;
  notes: string;
  setNotes: (v: string) => void;
}) {
  return (
    <div className="grid gap-3">
      <Field label={p.dialogs.name}><Input value={name} onChange={(e) => setName(e.target.value)} placeholder={p.phName} /></Field>
      <Field label={p.dialogs.type}>
        <Select value={partnerType} onValueChange={setPartnerType}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {PARTNER_TYPES.map((type) => (
              <SelectItem key={type} value={type}>{p.partnerTypes[type]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={p.dialogs.website}><Input value={website} onChange={(e) => setWebsite(e.target.value)} placeholder={p.phWebsite} /></Field>
        <Field label={p.dialogs.email}><Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder={p.phEmail} /></Field>
        <Field label={p.dialogs.phone}><Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder={p.phPhone} /></Field>
        <Field label={p.phNotes}><Input value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
      </div>
    </div>
  );
}
