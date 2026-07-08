import { supabaseDynamic } from "@/lib/supabase-dynamic";

export interface OperatorMarketplaceCount {
  key: string;
  count: number;
}

export interface OperatorMarketplaceProviders {
  total: number;
  active: number;
  pending_review: number;
  verified: number;
  featured: number;
  by_status: OperatorMarketplaceCount[];
  by_type: OperatorMarketplaceCount[];
}

export interface OperatorMarketplaceRequests {
  total: number;
  open: number;
  budget_min_total: number;
  budget_max_total: number;
  by_status: OperatorMarketplaceCount[];
  by_category: OperatorMarketplaceCount[];
}

export interface OperatorMarketplaceOffers {
  total: number;
  accepted: number;
  by_status: OperatorMarketplaceCount[];
}

export interface OperatorMarketplacePartners {
  total: number;
  marketplace_sourced: number;
  clubs_with_partners: number;
  by_type: OperatorMarketplaceCount[];
}

export interface OperatorMarketplaceContracts {
  total: number;
  active: number;
  total_value_eur: number;
  active_value_eur: number;
  by_status: OperatorMarketplaceCount[];
}

export interface OperatorMarketplaceInvoices {
  total: number;
  paid_value_eur: number;
  outstanding_value_eur: number;
  overdue_count: number;
}

export interface OperatorMarketplaceEngagements {
  total: number;
  open: number;
  by_category: OperatorMarketplaceCount[];
}

export interface OperatorMarketplaceTopProvider {
  id: string;
  name: string;
  provider_type: string;
  listing_status: string;
  verification_status: string;
  saved_count: number;
  accepted_offers: number;
  clubs_reached: number;
}

export interface OperatorMarketplaceRecentRequest {
  id: string;
  title: string;
  category: string | null;
  status: string;
  club_name: string | null;
  budget_min: number | null;
  budget_max: number | null;
  provider_type_wanted: string | null;
  created_at: string;
}

export interface OperatorMarketplaceOverview {
  generated_at: string;
  providers: OperatorMarketplaceProviders;
  requests: OperatorMarketplaceRequests;
  offers: OperatorMarketplaceOffers;
  partners: OperatorMarketplacePartners;
  contracts: OperatorMarketplaceContracts;
  invoices: OperatorMarketplaceInvoices;
  engagements: OperatorMarketplaceEngagements;
  top_providers: OperatorMarketplaceTopProvider[];
  top_categories: OperatorMarketplaceCount[];
  recent_requests: OperatorMarketplaceRecentRequest[];
}

function assertNoRpcError(error: { message?: string } | null, fallbackMessage: string): void {
  if (error) throw new Error(error.message ?? fallbackMessage);
}

export async function getOperatorMarketplaceOverview(): Promise<OperatorMarketplaceOverview> {
  const { data, error } = await supabaseDynamic.rpc("get_operator_marketplace_overview");
  assertNoRpcError(error, "Unable to load marketplace overview.");
  return data as OperatorMarketplaceOverview;
}

const PROVIDER_TYPE_LABELS: Record<string, string> = {
  sponsor: "Sponsor",
  supplier: "Supplier",
  service_provider: "Service provider",
  consultant: "Consultant",
  other: "Other",
};

export function formatProviderType(value: string | null | undefined): string {
  if (!value) return "—";
  return PROVIDER_TYPE_LABELS[value] ?? formatLabel(value);
}

export function formatLabel(value: string | null | undefined): string {
  if (!value) return "—";
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}
