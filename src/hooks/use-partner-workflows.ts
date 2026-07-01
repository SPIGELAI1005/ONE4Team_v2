import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { supabaseDynamic } from "@/lib/supabase-dynamic";
import type {
  ClubEventOption,
  PartnerContractRow,
  PartnerInvoiceRow,
  PartnerRow,
  PartnerTaskRow,
} from "@/lib/partner-workflow-models";

interface PartnerWorkflowState {
  partners: PartnerRow[];
  contracts: PartnerContractRow[];
  invoices: PartnerInvoiceRow[];
  tasks: PartnerTaskRow[];
  events: ClubEventOption[];
  schemaReady: boolean;
  loading: boolean;
}

export function usePartnerWorkflows(clubId: string | null) {
  const [state, setState] = useState<PartnerWorkflowState>({
    partners: [],
    contracts: [],
    invoices: [],
    tasks: [],
    events: [],
    schemaReady: true,
    loading: true,
  });

  const reload = useCallback(async () => {
    if (!clubId) {
      setState((prev) => ({ ...prev, loading: false, partners: [], contracts: [], invoices: [], tasks: [], events: [] }));
      return;
    }

    setState((prev) => ({ ...prev, loading: true }));

    try {
      const partnerRes = await supabase
        .from("partners")
        .select(
          "id, club_id, name, partner_type, notes, website, email, phone, created_at, show_on_public_club_page, marketplace_source, marketplace_offer_id, marketplace_request_id",
        )
        .eq("club_id", clubId)
        .order("name", { ascending: true })
        .limit(300);

      if (partnerRes.error) throw partnerRes.error;

      const [contractRes, invoiceRes, taskRes, eventRes] = await Promise.all([
        supabaseDynamic
          .from("partner_contracts")
          .select("id, club_id, partner_id, title, contract_status, start_date, end_date, renewal_date, value_eur, notes, created_at")
          .eq("club_id", clubId)
          .order("created_at", { ascending: false }),
        supabaseDynamic
          .from("partner_invoices")
          .select("id, club_id, partner_id, contract_id, invoice_no, amount_eur, due_date, invoice_status, created_at")
          .eq("club_id", clubId)
          .order("created_at", { ascending: false }),
        supabaseDynamic
          .from("partner_tasks")
          .select(
            "id, club_id, partner_id, contract_id, title, description, priority, task_status, due_date, engagement_category, related_event_id, location, marketplace_offer_id, marketplace_request_id, created_at",
          )
          .eq("club_id", clubId)
          .order("due_date", { ascending: true, nullsFirst: false }),
        supabase
          .from("events")
          .select("id, title, starts_at, event_type")
          .eq("club_id", clubId)
          .gte("starts_at", new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString())
          .order("starts_at", { ascending: true })
          .limit(80),
      ]);

      let tasks: PartnerTaskRow[] = [];
      let schemaReady = true;

      if (taskRes.error) {
        const legacyTaskRes = await supabaseDynamic
          .from("partner_tasks")
          .select("id, club_id, partner_id, contract_id, title, description, priority, task_status, due_date, created_at")
          .eq("club_id", clubId)
          .order("created_at", { ascending: false });
        if (legacyTaskRes.error || contractRes.error || invoiceRes.error) {
          throw new Error(
            contractRes.error?.message || invoiceRes.error?.message || legacyTaskRes.error?.message || "Partner workflows unavailable",
          );
        }
        tasks = ((legacyTaskRes.data as Omit<PartnerTaskRow, "engagement_category" | "related_event_id" | "location" | "marketplace_offer_id" | "marketplace_request_id">[]) ?? []).map(
          (row) => ({
            ...row,
            engagement_category: "other" as const,
            related_event_id: null,
            location: null,
            marketplace_offer_id: null,
            marketplace_request_id: null,
          }),
        );
        schemaReady = false;
      } else {
        if (contractRes.error || invoiceRes.error) {
          throw new Error(contractRes.error?.message || invoiceRes.error?.message || "Partner workflows unavailable");
        }
        tasks = (taskRes.data as PartnerTaskRow[]) ?? [];
      }

      setState({
        partners: (partnerRes.data as PartnerRow[]) ?? [],
        contracts: (contractRes.data as PartnerContractRow[]) ?? [],
        invoices: (invoiceRes.data as PartnerInvoiceRow[]) ?? [],
        tasks,
        events: (eventRes.data as ClubEventOption[]) ?? [],
        schemaReady,
        loading: false,
      });
    } catch {
      setState((prev) => ({
        ...prev,
        contracts: [],
        invoices: [],
        tasks: [],
        events: [],
        schemaReady: false,
        loading: false,
      }));
    }
  }, [clubId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { ...state, reload };
}
