import { useMemo, useState } from "react";

import { ClipboardCopy, ClipboardList, Download, Eye } from "lucide-react";

import { Badge } from "@/components/ui/badge";

import { Button } from "@/components/ui/button";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { Input } from "@/components/ui/input";

import { Label } from "@/components/ui/label";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import {

  Sheet,

  SheetContent,

  SheetDescription,

  SheetHeader,

  SheetTitle,

} from "@/components/ui/sheet";

import { Skeleton } from "@/components/ui/skeleton";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import { OperatorSectionEmptyState } from "@/components/operator/OperatorSectionEmptyState";

import { OperatorAuditDiff } from "@/components/operator/OperatorAuditDiff";

import {

  OperatorPageError,

  OperatorPageHeader,

  OperatorPageShell,

  OPERATOR_CARD_CLASS,

} from "@/components/operator/OperatorPageShell";

import { useLanguage } from "@/hooks/use-language";

import { useOperatorAccess } from "@/hooks/use-operator-access";

import { useOperatorAuditTrail } from "@/hooks/use-operator-audit-trail";

import { useOperatorClubs } from "@/hooks/use-operator-clubs";

import { downloadCsv } from "@/lib/csv-export";

import {

  formatAuditAction,

  formatAuditEntityType,

  formatAuditJson,

  formatAuditTimestamp,

  type OperatorAuditTrailEntry,

} from "@/lib/platform-audit";

import { useToast } from "@/hooks/use-toast";



const ALL_FILTER = "__all__";



function toStartOfDayIso(date: string): string {

  return new Date(`${date}T00:00:00`).toISOString();

}



function toEndOfDayIso(date: string): string {

  return new Date(`${date}T23:59:59.999`).toISOString();

}



export default function OperatorAudit() {

  const { t } = useLanguage();

  const a = t.operator.audit;

  const { toast } = useToast();

  const { role } = useOperatorAccess();

  const isOwner = role === "OWNER";



  const [dateFrom, setDateFrom] = useState("");

  const [dateTo, setDateTo] = useState("");

  const [actorEmail, setActorEmail] = useState(ALL_FILTER);

  const [action, setAction] = useState(ALL_FILTER);

  const [clubId, setClubId] = useState(ALL_FILTER);

  const [entityType, setEntityType] = useState(ALL_FILTER);

  const [selectedEntry, setSelectedEntry] = useState<OperatorAuditTrailEntry | null>(null);



  const filters = useMemo(

    () => ({

      limit: 200,

      dateFrom: dateFrom ? toStartOfDayIso(dateFrom) : null,

      dateTo: dateTo ? toEndOfDayIso(dateTo) : null,

      actorEmail: actorEmail === ALL_FILTER ? null : actorEmail,

      action: action === ALL_FILTER ? null : action,

      clubId: clubId === ALL_FILTER ? null : clubId,

      entityType: entityType === ALL_FILTER ? null : entityType,

    }),

    [action, actorEmail, clubId, dateFrom, dateTo, entityType],

  );



  const { data, isLoading, isError, error } = useOperatorAuditTrail(filters);

  const { data: clubs = [] } = useOperatorClubs();



  const entries = data?.entries ?? [];

  const facets = data?.facets;



  async function copyAuditId(id: string) {

    await navigator.clipboard.writeText(id);

    toast({ title: a.toast.copiedId });

  }



  function exportCsv() {

    downloadCsv(

      `operator_audit_${new Date().toISOString().slice(0, 10)}.csv`,

      entries.map((entry) => ({

        id: entry.id,

        created_at: entry.created_at,

        actor_email: entry.actor_email ?? "",

        actor_role: entry.actor_role ?? "",

        action: entry.action,

        entity_type: entry.entity_type ?? "",

        entity_name: entry.entity_name ?? entry.entity_id ?? "",

        club_name: entry.club_name ?? "",

        reason: entry.reason ?? "",

      })),

    );

  }



  if (isError) {

    return (

      <OperatorPageError

        title={a.loadErrorTitle}

        message={error instanceof Error ? error.message : a.loadErrorMessage}

      />

    );

  }



  return (

    <OperatorPageShell>

      <OperatorPageHeader

        icon={ClipboardList}

        title={a.title}

        description={a.description}

        actions={

          <Button variant="outline" size="sm" disabled={!entries.length} onClick={exportCsv}>

            <Download className="mr-2 h-4 w-4" />

            {a.exportCsv}

          </Button>

        }

      />



      <Card className={OPERATOR_CARD_CLASS}>

        <CardHeader>

          <CardTitle className="font-display text-lg">{a.filters.title}</CardTitle>

        </CardHeader>

        <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">

          <div className="space-y-2">

            <Label htmlFor="audit-date-from">{a.filters.dateFrom}</Label>

            <Input id="audit-date-from" type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} />

          </div>

          <div className="space-y-2">

            <Label htmlFor="audit-date-to">{a.filters.dateTo}</Label>

            <Input id="audit-date-to" type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} />

          </div>

          <div className="space-y-2">

            <Label>{a.filters.actor}</Label>

            <Select value={actorEmail} onValueChange={setActorEmail}>

              <SelectTrigger>

                <SelectValue placeholder={a.filters.allActors} />

              </SelectTrigger>

              <SelectContent>

                <SelectItem value={ALL_FILTER}>{a.filters.allActors}</SelectItem>

                {(facets?.actors ?? []).map((actor) => (

                  <SelectItem key={actor} value={actor}>

                    {actor}

                  </SelectItem>

                ))}

              </SelectContent>

            </Select>

          </div>

          <div className="space-y-2">

            <Label>{a.filters.action}</Label>

            <Select value={action} onValueChange={setAction}>

              <SelectTrigger>

                <SelectValue placeholder={a.filters.allActions} />

              </SelectTrigger>

              <SelectContent>

                <SelectItem value={ALL_FILTER}>{a.filters.allActions}</SelectItem>

                {(facets?.actions ?? []).map((item) => (

                  <SelectItem key={item} value={item}>

                    {formatAuditAction(item, t)}

                  </SelectItem>

                ))}

              </SelectContent>

            </Select>

          </div>

          <div className="space-y-2">

            <Label>{a.filters.club}</Label>

            <Select value={clubId} onValueChange={setClubId}>

              <SelectTrigger>

                <SelectValue placeholder={a.filters.allClubs} />

              </SelectTrigger>

              <SelectContent>

                <SelectItem value={ALL_FILTER}>{a.filters.allClubs}</SelectItem>

                {clubs.map((club) => (

                  <SelectItem key={club.id} value={club.id}>

                    {club.name}

                  </SelectItem>

                ))}

              </SelectContent>

            </Select>

          </div>

          <div className="space-y-2">

            <Label>{a.filters.entityType}</Label>

            <Select value={entityType} onValueChange={setEntityType}>

              <SelectTrigger>

                <SelectValue placeholder={a.filters.allEntityTypes} />

              </SelectTrigger>

              <SelectContent>

                <SelectItem value={ALL_FILTER}>{a.filters.allEntityTypes}</SelectItem>

                {(facets?.entity_types ?? []).map((item) => (

                  <SelectItem key={item} value={item}>

                    {formatAuditEntityType(item, t)}

                  </SelectItem>

                ))}

              </SelectContent>

            </Select>

          </div>

        </CardContent>

      </Card>



      <Card className={OPERATOR_CARD_CLASS}>

        <CardHeader className="flex flex-row items-center justify-between gap-3">

          <CardTitle className="font-display text-lg">{a.entries.title}</CardTitle>

          <Badge variant="outline">{a.entries.total.replace("{count}", String(data?.total ?? 0))}</Badge>

        </CardHeader>

        <CardContent>

          {isLoading ? (

            <Skeleton className="h-56 w-full rounded-2xl" />

          ) : entries.length ? (

            <Table>

              <TableHeader>

                <TableRow>

                  <TableHead>{a.entries.dateTime}</TableHead>

                  <TableHead>{a.entries.actor}</TableHead>

                  <TableHead>{a.entries.action}</TableHead>

                  <TableHead>{a.entries.entity}</TableHead>

                  <TableHead>{a.entries.club}</TableHead>

                  <TableHead>{a.entries.reason}</TableHead>

                  <TableHead className="text-right">{a.entries.actions}</TableHead>

                </TableRow>

              </TableHeader>

              <TableBody>

                {entries.map((entry) => (

                  <TableRow key={entry.id}>

                    <TableCell className="text-sm text-muted-foreground">

                      {formatAuditTimestamp(entry.created_at)}

                    </TableCell>

                    <TableCell>

                      <div className="font-medium text-foreground">{entry.actor_email ?? a.system}</div>

                      <div className="text-xs text-muted-foreground">{entry.actor_role ?? "—"}</div>

                    </TableCell>

                    <TableCell>

                      <Badge variant="outline">{formatAuditAction(entry.action, t)}</Badge>

                    </TableCell>

                    <TableCell>

                      <div className="font-medium text-foreground">{entry.entity_name ?? entry.entity_id ?? "—"}</div>

                      <div className="text-xs text-muted-foreground">

                        {entry.entity_type ? formatAuditEntityType(entry.entity_type, t) : "—"}

                      </div>

                    </TableCell>

                    <TableCell className="text-sm text-muted-foreground">{entry.club_name ?? "—"}</TableCell>

                    <TableCell className="max-w-xs truncate text-sm text-muted-foreground">

                      {entry.reason ?? "—"}

                    </TableCell>

                    <TableCell className="text-right">

                      <div className="flex justify-end gap-1">

                        <Button

                          variant="ghost"

                          size="icon"

                          aria-label={a.entries.viewDetails}

                          onClick={() => setSelectedEntry(entry)}

                        >

                          <Eye className="h-4 w-4" />

                        </Button>

                        <Button

                          variant="ghost"

                          size="icon"

                          aria-label={a.entries.copyId}

                          onClick={() => void copyAuditId(entry.id)}

                        >

                          <ClipboardCopy className="h-4 w-4" />

                        </Button>

                      </div>

                    </TableCell>

                  </TableRow>

                ))}

              </TableBody>

            </Table>

          ) : (

            <OperatorSectionEmptyState

              icon={ClipboardList}

              title={a.entries.emptyTitle}

              description={a.entries.emptyDesc}

            />

          )}

        </CardContent>

      </Card>



      <Sheet open={selectedEntry !== null} onOpenChange={(open) => !open && setSelectedEntry(null)}>

        <SheetContent className="w-full overflow-y-auto sm:max-w-xl">

          <SheetHeader>

            <SheetTitle>{a.detail.title}</SheetTitle>

            <SheetDescription>{a.detail.description}</SheetDescription>

          </SheetHeader>



          {selectedEntry ? (

            <div className="mt-6 space-y-5">

              <DetailField label={a.detail.action} value={formatAuditAction(selectedEntry.action, t)} />

              <DetailField label={a.detail.actor} value={selectedEntry.actor_email ?? a.system} />

              <DetailField label={a.detail.actorRole} value={selectedEntry.actor_role ?? "—"} />

              <DetailField label={a.detail.timestamp} value={formatAuditTimestamp(selectedEntry.created_at)} />

              <DetailField label={a.detail.club} value={selectedEntry.club_name ?? "—"} />

              <DetailField

                label={a.detail.entityType}

                value={selectedEntry.entity_type ? formatAuditEntityType(selectedEntry.entity_type, t) : "—"}

              />

              <DetailField label={a.detail.entityId} value={selectedEntry.entity_id ?? "—"} />

              <DetailField label={a.detail.entityName} value={selectedEntry.entity_name ?? "—"} />

              <DetailField label={a.detail.reason} value={selectedEntry.reason ?? "—"} />



              <OperatorAuditDiff before={selectedEntry.before_json} after={selectedEntry.after_json} />



              <details className="rounded-xl border border-border/70 bg-muted/20 p-3">

                <summary className="cursor-pointer text-xs font-medium uppercase tracking-wide text-muted-foreground">

                  {a.detail.rawJson}

                </summary>

                <div className="mt-3 space-y-3">

                  <div className="space-y-2">

                    <Label>{a.detail.beforeJson}</Label>

                    <pre className="max-h-48 overflow-auto rounded-xl border border-border/70 bg-background/60 p-3 text-xs">

                      {formatAuditJson(selectedEntry.before_json)}

                    </pre>

                  </div>

                  <div className="space-y-2">

                    <Label>{a.detail.afterJson}</Label>

                    <pre className="max-h-48 overflow-auto rounded-xl border border-border/70 bg-background/60 p-3 text-xs">

                      {formatAuditJson(selectedEntry.after_json)}

                    </pre>

                  </div>

                </div>

              </details>



              {isOwner || selectedEntry.can_view_technical_metadata ? (

                <>

                  <DetailField label={a.detail.ipAddress} value={selectedEntry.ip_address ?? "—"} />

                  <DetailField label={a.detail.userAgent} value={selectedEntry.user_agent ?? "—"} />

                </>

              ) : (

                <p className="text-sm text-muted-foreground">{a.detail.ownerOnlyMetadata}</p>

              )}



              <Button variant="outline" size="sm" onClick={() => void copyAuditId(selectedEntry.id)}>

                <ClipboardCopy className="mr-2 h-4 w-4" />

                {a.detail.copyId}

              </Button>

            </div>

          ) : null}

        </SheetContent>

      </Sheet>

    </OperatorPageShell>

  );

}



function DetailField({ label, value }: { label: string; value: string }) {

  return (

    <div className="rounded-xl border border-border/70 bg-background/60 p-3">

      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</div>

      <div className="mt-1 break-all text-sm text-foreground">{value}</div>

    </div>

  );

}

