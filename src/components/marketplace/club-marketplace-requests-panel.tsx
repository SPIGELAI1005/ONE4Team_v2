import { useMemo, useState } from "react";
import { Eye, Loader2, Pencil, Plus, Send, UserPlus, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLanguage } from "@/hooks/use-language";
import { useToast } from "@/hooks/use-toast";
import { setMarketplaceRequestStatus } from "@/hooks/use-marketplace";
import type { MarketplaceOfferRow, MarketplaceProviderProfileRow, MarketplaceRequestRow, MarketplaceSavedProviderRow } from "@/lib/marketplace-models";
import { offerCountForRequest } from "@/lib/marketplace-request-filters";
import { PARTNER_PANEL_CLASS } from "@/lib/partner-workflow-ui";
import { MarketplaceEmptyState } from "@/components/marketplace/marketplace-empty-state";
import { MarketplaceRequestDialog } from "@/components/marketplace/marketplace-request-dialog";
import { MarketplaceRequestViewSheet } from "@/components/marketplace/marketplace-request-view-sheet";
import { MarketplaceInviteProvidersDialog } from "@/components/marketplace/marketplace-invite-providers-dialog";
import { cn } from "@/lib/utils";

interface ClubMarketplaceRequestsPanelProps {
  clubId: string;
  requests: MarketplaceRequestRow[];
  offers: MarketplaceOfferRow[];
  providers: MarketplaceProviderProfileRow[];
  saved: MarketplaceSavedProviderRow[];
  schemaReady: boolean;
  canCreateRequest: boolean;
  onRefresh: () => void;
  createOpen?: boolean;
  onCreateOpenChange?: (open: boolean) => void;
}

export function ClubMarketplaceRequestsPanel({
  clubId,
  requests,
  offers,
  providers,
  saved,
  schemaReady,
  canCreateRequest,
  onRefresh,
  createOpen,
  onCreateOpenChange,
}: ClubMarketplaceRequestsPanelProps) {
  const { t } = useLanguage();
  const m = t.marketplacePage;
  const r = m.club.requests;
  const { toast } = useToast();

  const [statusFilter, setStatusFilter] = useState("all");
  const [internalDialogOpen, setInternalDialogOpen] = useState(false);
  const dialogOpen = createOpen ?? internalDialogOpen;
  const setDialogOpen = onCreateOpenChange ?? setInternalDialogOpen;
  const [editRequest, setEditRequest] = useState<MarketplaceRequestRow | null>(null);
  const [viewRequest, setViewRequest] = useState<MarketplaceRequestRow | null>(null);
  const [inviteRequest, setInviteRequest] = useState<MarketplaceRequestRow | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const categoryLabel = (key: string) =>
    (m.categories as Record<string, string>)[key] ?? key.replace(/_/g, " ");

  const filtered = useMemo(() => {
    const sorted = [...requests].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
    if (statusFilter === "all") return sorted;
    return sorted.filter((req) => req.status === statusFilter);
  }, [requests, statusFilter]);

  const openCreate = () => {
    setEditRequest(null);
    setDialogOpen(true);
  };

  const openEdit = (req: MarketplaceRequestRow) => {
    setEditRequest(req);
    setDialogOpen(true);
  };

  const runStatus = async (requestId: string, status: MarketplaceRequestRow["status"], toastMsg: string) => {
    setBusyId(requestId);
    const { error } = await setMarketplaceRequestStatus(requestId, status);
    setBusyId(null);
    if (error) {
      toast({ title: t.common.error, description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: toastMsg });
    onRefresh();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder={r.filterStatus} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{r.filterAll}</SelectItem>
            {(["draft", "open", "offers_received", "accepted", "closed", "cancelled"] as const).map((s) => (
              <SelectItem key={s} value={s}>
                {m.club.requestStatus[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {canCreateRequest ? (
          <Button size="sm" onClick={openCreate}>
            <Plus className="mr-1 h-4 w-4" />
            {m.club.createRequest}
          </Button>
        ) : null}
      </div>

      {filtered.length === 0 ? (
        <MarketplaceEmptyState
          title={m.club.empty.noRequestsTitle}
          description={m.club.empty.noRequestsDesc}
          actionLabel={canCreateRequest ? m.club.empty.createRequestAction : undefined}
          onAction={canCreateRequest ? openCreate : undefined}
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((req) => {
            const offerCount = offerCountForRequest(req.id, offers);
            const isBusy = busyId === req.id;
            return (
              <article key={req.id} className={cn(PARTNER_PANEL_CLASS, "p-4")}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-display font-semibold text-foreground">{req.title}</h3>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {categoryLabel(req.category)}
                      {req.provider_type_wanted
                        ? ` · ${m.providerTypes[req.provider_type_wanted]}`
                        : ""}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                    {m.club.requestStatus[req.status] ?? req.status}
                  </span>
                </div>

                <div className="mt-3 grid gap-2 text-xs text-muted-foreground sm:grid-cols-2 lg:grid-cols-4">
                  <span>{r.offers}: {offerCount}</span>
                  <span>{r.deadline}: {req.deadline ?? "—"}</span>
                  <span>{r.visibility}: {r.visibilityLabels[req.visibility]}</span>
                  <span>{r.created}: {new Date(req.created_at).toLocaleDateString()}</span>
                </div>

                {req.description ? (
                  <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{req.description}</p>
                ) : null}

                <div className="mt-4 flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => setViewRequest(req)}>
                    <Eye className="mr-1 h-3.5 w-3.5" />
                    {r.view}
                  </Button>
                  {canCreateRequest && req.status === "draft" ? (
                    <Button size="sm" variant="outline" onClick={() => openEdit(req)}>
                      <Pencil className="mr-1 h-3.5 w-3.5" />
                      {r.edit}
                    </Button>
                  ) : null}
                  {canCreateRequest && req.status === "draft" ? (
                    <Button
                      size="sm"
                      disabled={isBusy}
                      onClick={() => void runStatus(req.id, "open", r.publishedToast)}
                    >
                      {isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="mr-1 h-3.5 w-3.5" />}
                      {r.publish}
                    </Button>
                  ) : null}
                  {canCreateRequest ? (
                    <Button size="sm" variant="outline" onClick={() => setInviteRequest(req)}>
                      <UserPlus className="mr-1 h-3.5 w-3.5" />
                      {r.invite}
                    </Button>
                  ) : null}
                  {canCreateRequest && (req.status === "open" || req.status === "offers_received") ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={isBusy}
                      onClick={() => void runStatus(req.id, "closed", r.closedToast)}
                    >
                      <XCircle className="mr-1 h-3.5 w-3.5" />
                      {r.close}
                    </Button>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      )}

      <MarketplaceRequestDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        clubId={clubId}
        schemaReady={schemaReady}
        request={editRequest}
        onSaved={onRefresh}
      />

      <MarketplaceRequestViewSheet
        request={viewRequest}
        open={viewRequest != null}
        onOpenChange={(open) => !open && setViewRequest(null)}
        offerCount={viewRequest ? offerCountForRequest(viewRequest.id, offers) : 0}
        mode="club"
      />

      <MarketplaceInviteProvidersDialog
        open={inviteRequest != null}
        onOpenChange={(open) => !open && setInviteRequest(null)}
        request={inviteRequest}
        providers={providers}
        saved={saved}
        onInvited={onRefresh}
      />
    </div>
  );
}
