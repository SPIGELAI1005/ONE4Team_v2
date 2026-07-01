import type { MarketplaceRequestRow } from "@/lib/marketplace-models";
import type { CreateMarketplaceRequestInput } from "@/lib/marketplace-models";

export interface MarketplaceRequestFormState {
  title: string;
  category: string;
  providerTypeWanted: string;
  description: string;
  quantity: string;
  location: string;
  deadline: string;
  budgetMin: string;
  budgetMax: string;
  visibility: MarketplaceRequestRow["visibility"];
  attachmentUrls: string[];
}

export function emptyRequestFormState(): MarketplaceRequestFormState {
  return {
    title: "",
    category: "",
    providerTypeWanted: "any",
    description: "",
    quantity: "",
    location: "",
    deadline: "",
    budgetMin: "",
    budgetMax: "",
    visibility: "marketplace",
    attachmentUrls: [""],
  };
}

export function requestFormFromRow(row: MarketplaceRequestRow): MarketplaceRequestFormState {
  const attachments = Array.isArray(row.attachments)
    ? row.attachments
        .map((item) => {
          if (!item || typeof item !== "object") return "";
          return String((item as { url?: unknown }).url ?? "").trim();
        })
        .filter(Boolean)
    : [];

  return {
    title: row.title,
    category: row.category,
    providerTypeWanted: row.provider_type_wanted ?? "any",
    description: row.description ?? "",
    quantity: row.quantity ?? "",
    location: row.location ?? "",
    deadline: row.deadline ?? "",
    budgetMin: row.budget_min != null ? String(row.budget_min) : "",
    budgetMax: row.budget_max != null ? String(row.budget_max) : "",
    visibility: row.visibility,
    attachmentUrls: attachments.length ? attachments : [""],
  };
}

export function requestFormToInput(
  form: MarketplaceRequestFormState,
  clubId: string,
  publish: boolean,
): CreateMarketplaceRequestInput {
  return {
    clubId,
    title: form.title,
    category: form.category,
    providerTypeWanted:
      form.providerTypeWanted === "any"
        ? null
        : (form.providerTypeWanted as CreateMarketplaceRequestInput["providerTypeWanted"]),
    description: form.description,
    quantity: form.quantity || null,
    visibility: form.visibility,
    budgetMin: form.budgetMin ? Number(form.budgetMin) : null,
    budgetMax: form.budgetMax ? Number(form.budgetMax) : null,
    deadline: form.deadline || null,
    location: form.location,
    attachmentUrls: form.attachmentUrls.map((u) => u.trim()).filter(Boolean),
    publish,
  };
}
