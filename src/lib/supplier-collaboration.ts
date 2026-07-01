import { supabase } from "@/integrations/supabase/client";
import { supabaseDynamic } from "@/lib/supabase-dynamic";

export interface SupplierCollaboration {
  partnerId: string;
  clubId: string;
  clubName: string;
  clubSlug: string | null;
  partnerName: string;
  partnerType: string;
  relationshipSource: "profile" | "offer" | "both";
}

export interface PartnerMessageRow {
  id: string;
  club_id: string;
  partner_id: string;
  sender_user_id: string;
  content: string;
  created_at: string;
}

export interface SupplierPartnerTaskRow {
  id: string;
  club_id: string;
  partner_id: string;
  title: string;
  description: string | null;
  priority: string;
  task_status: string;
  due_date: string | null;
  assigned_to_user_id: string | null;
  engagement_category: string | null;
  created_at: string;
  clubs?: { name: string } | null;
  partners?: { name: string } | null;
}

export interface SupplierInvoiceRow {
  id: string;
  club_id: string;
  partner_id: string;
  invoice_no: string;
  amount_eur: number;
  due_date: string | null;
  paid_at: string | null;
  invoice_status: string;
  created_at: string;
  clubs?: { name: string } | null;
}

function isMissingRelation(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const message = String((error as { message?: unknown }).message ?? "").toLowerCase();
  return message.includes("does not exist") || message.includes("could not find");
}

/** Clubs/partners where this user has an active marketplace collaboration. */
export async function fetchSupplierCollaborations(userId: string): Promise<SupplierCollaboration[]> {
  const { data: profiles, error: profileError } = await supabase
    .from("marketplace_provider_profiles")
    .select("id, partner_id, provider_name")
    .eq("owner_user_id", userId);

  if (profileError) {
    if (!isMissingRelation(profileError)) console.warn("[supplier-collaboration] profiles:", profileError.message);
    return [];
  }

  const profileRows = profiles ?? [];
  const profileIds = profileRows.map((row) => String(row.id));
  if (profileIds.length === 0) return [];

  const { data: offers } = await supabase
    .from("marketplace_offers")
    .select("id, provider_profile_id, status, marketplace_requests(club_id)")
    .in("provider_profile_id", profileIds)
    .eq("status", "accepted");

  const partnerIdsFromProfile = new Set(
    profileRows.map((row) => row.partner_id).filter(Boolean).map(String),
  );

  const offerIds = (offers ?? []).map((row) => String(row.id));
  let partnersFromOffers: Array<Record<string, unknown>> = [];
  if (offerIds.length > 0) {
    const { data } = await supabase
      .from("partners")
      .select("id, club_id, name, partner_type, marketplace_offer_id, clubs(name, slug)")
      .in("marketplace_offer_id", offerIds);
    partnersFromOffers = (data as Array<Record<string, unknown>> | null) ?? [];
  }

  const directPartnerIds = [...partnerIdsFromProfile];
  let partnersFromProfile: Array<Record<string, unknown>> = [];
  if (directPartnerIds.length > 0) {
    const { data } = await supabase
      .from("partners")
      .select("id, club_id, name, partner_type, marketplace_offer_id, clubs(name, slug)")
      .in("id", directPartnerIds);
    partnersFromProfile = (data as Array<Record<string, unknown>> | null) ?? [];
  }

  const byPartnerId = new Map<string, SupplierCollaboration>();

  const ingest = (row: Record<string, unknown>, source: "profile" | "offer") => {
    const partnerId = String(row.id);
    const club = row.clubs as { name?: string; slug?: string } | null;
    const existing = byPartnerId.get(partnerId);
    const next: SupplierCollaboration = {
      partnerId,
      clubId: String(row.club_id),
      clubName: club?.name ?? "Club",
      clubSlug: club?.slug ?? null,
      partnerName: String(row.name ?? ""),
      partnerType: String(row.partner_type ?? "supplier"),
      relationshipSource: existing
        ? existing.relationshipSource === source
          ? source
          : "both"
        : source,
    };
    byPartnerId.set(partnerId, next);
  };

  for (const row of partnersFromProfile) ingest(row, "profile");
  for (const row of partnersFromOffers) ingest(row, "offer");

  return Array.from(byPartnerId.values()).sort((a, b) => a.clubName.localeCompare(b.clubName));
}

export async function fetchPartnerMessages(
  clubId: string,
  partnerId: string,
): Promise<PartnerMessageRow[]> {
  const { data, error } = await supabaseDynamic
    .from("partner_messages")
    .select("id, club_id, partner_id, sender_user_id, content, created_at")
    .eq("club_id", clubId)
    .eq("partner_id", partnerId)
    .order("created_at", { ascending: true });

  if (error) {
    if (!isMissingRelation(error)) console.warn("[supplier-collaboration] messages:", error.message);
    return [];
  }
  return (data as PartnerMessageRow[]) ?? [];
}

export async function sendPartnerMessage(
  clubId: string,
  partnerId: string,
  content: string,
  senderUserId: string,
): Promise<{ error: Error | null }> {
  const { error } = await supabaseDynamic.from("partner_messages").insert({
    club_id: clubId,
    partner_id: partnerId,
    sender_user_id: senderUserId,
    content: content.trim(),
  });
  return { error: error ? new Error(error.message) : null };
}

export async function fetchSupplierPartnerTasks(
  partnerIds: string[],
): Promise<SupplierPartnerTaskRow[]> {
  if (partnerIds.length === 0) return [];

  const { data, error } = await supabaseDynamic
    .from("partner_tasks")
    .select(
      "id, club_id, partner_id, title, description, priority, task_status, due_date, assigned_to_user_id, engagement_category, created_at, clubs(name), partners(name)",
    )
    .in("partner_id", partnerIds)
    .order("due_date", { ascending: true, nullsFirst: false });

  if (error) {
    if (!isMissingRelation(error)) console.warn("[supplier-collaboration] tasks:", error.message);
    return [];
  }

  return (data as SupplierPartnerTaskRow[]) ?? [];
}

export async function updateSupplierPartnerTaskStatus(
  taskId: string,
  status: string,
): Promise<{ error: Error | null }> {
  const { error } = await supabaseDynamic
    .from("partner_tasks")
    .update({ task_status: status, completed_at: status === "done" ? new Date().toISOString() : null })
    .eq("id", taskId);
  return { error: error ? new Error(error.message) : null };
}

export async function fetchSupplierInvoices(partnerIds: string[]): Promise<SupplierInvoiceRow[]> {
  if (partnerIds.length === 0) return [];

  const { data, error } = await supabaseDynamic
    .from("partner_invoices")
    .select("id, club_id, partner_id, invoice_no, amount_eur, due_date, paid_at, invoice_status, created_at, clubs(name)")
    .in("partner_id", partnerIds)
    .order("created_at", { ascending: false });

  if (error) {
    if (!isMissingRelation(error)) console.warn("[supplier-collaboration] invoices:", error.message);
    return [];
  }
  return (data as SupplierInvoiceRow[]) ?? [];
}

export interface SupplierMonthlyRevenue {
  month: string;
  label: string;
  totalEur: number;
  paidEur: number;
  invoiceCount: number;
}

export function aggregateSupplierRevenueByMonth(invoices: SupplierInvoiceRow[]): SupplierMonthlyRevenue[] {
  const buckets = new Map<string, SupplierMonthlyRevenue>();

  for (const invoice of invoices) {
    const date = invoice.paid_at ?? invoice.created_at;
    const month = date.slice(0, 7);
    const label = new Date(`${month}-01T00:00:00`).toLocaleDateString(undefined, {
      month: "short",
      year: "numeric",
    });
    const existing = buckets.get(month) ?? {
      month,
      label,
      totalEur: 0,
      paidEur: 0,
      invoiceCount: 0,
    };
    existing.invoiceCount += 1;
    existing.totalEur += Number(invoice.amount_eur) || 0;
    if (invoice.invoice_status === "paid") {
      existing.paidEur += Number(invoice.amount_eur) || 0;
    }
    buckets.set(month, existing);
  }

  return Array.from(buckets.values()).sort((a, b) => b.month.localeCompare(a.month));
}
