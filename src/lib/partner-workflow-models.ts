export const PARTNER_TYPES = [
  "sponsor",
  "supplier",
  "service_provider",
  "consultant",
  "other",
] as const;

export type PartnerType = (typeof PARTNER_TYPES)[number];

export const CONTRACT_STATUSES = ["draft", "active", "paused", "expired", "terminated"] as const;
export type ContractStatus = (typeof CONTRACT_STATUSES)[number];

export const INVOICE_STATUSES = ["pending", "paid", "overdue", "cancelled"] as const;
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];

export const TASK_STATUSES = ["open", "in_progress", "done", "cancelled"] as const;
export type PartnerTaskStatus = (typeof TASK_STATUSES)[number];

export const TASK_PRIORITIES = ["low", "normal", "high", "urgent"] as const;
export type PartnerTaskPriority = (typeof TASK_PRIORITIES)[number];

export const ENGAGEMENT_CATEGORIES = [
  "sporting_event",
  "club_event",
  "maintenance",
  "facility",
  "supply_delivery",
  "sponsorship",
  "service",
  "other",
] as const;

export type EngagementCategory = (typeof ENGAGEMENT_CATEGORIES)[number];

export interface PartnerRow {
  id: string;
  club_id: string;
  name: string;
  partner_type: string;
  notes: string | null;
  website: string | null;
  email: string | null;
  phone: string | null;
  created_at: string;
  show_on_public_club_page?: boolean;
  marketplace_source?: boolean;
  marketplace_offer_id?: string | null;
  marketplace_request_id?: string | null;
}

export interface PartnerContractRow {
  id: string;
  club_id: string;
  partner_id: string;
  title: string;
  contract_status: ContractStatus;
  start_date: string | null;
  end_date: string | null;
  renewal_date: string | null;
  value_eur: number | null;
  notes: string | null;
  created_at?: string;
}

export interface PartnerInvoiceRow {
  id: string;
  club_id: string;
  partner_id: string;
  contract_id: string | null;
  invoice_no: string;
  amount_eur: number;
  due_date: string | null;
  invoice_status: InvoiceStatus;
  created_at?: string;
}

export interface PartnerTaskRow {
  id: string;
  club_id: string;
  partner_id: string;
  contract_id: string | null;
  title: string;
  description: string | null;
  priority: PartnerTaskPriority;
  task_status: PartnerTaskStatus;
  due_date: string | null;
  engagement_category: EngagementCategory;
  related_event_id: string | null;
  location: string | null;
  marketplace_offer_id?: string | null;
  marketplace_request_id?: string | null;
  created_at?: string;
}

export interface ClubEventOption {
  id: string;
  title: string;
  starts_at: string;
  event_type: string;
}

export type PartnersTab = "overview" | "directory" | "engagements" | "contracts" | "invoices";

export function isPartnerTaskOpen(status: PartnerTaskStatus): boolean {
  return status === "open" || status === "in_progress";
}

export function isPartnerTaskOverdue(dueDate: string | null, status: PartnerTaskStatus): boolean {
  if (!dueDate || !isPartnerTaskOpen(status)) return false;
  const due = new Date(`${dueDate}T23:59:59`);
  return !Number.isNaN(due.getTime()) && due < new Date();
}

export function isContractExpiringSoon(endDate: string | null, renewalDate: string | null): boolean {
  const target = endDate ?? renewalDate;
  if (!target) return false;
  const date = new Date(`${target}T12:00:00`);
  if (Number.isNaN(date.getTime())) return false;
  const days = (date.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
  return days >= 0 && days <= 45;
}
