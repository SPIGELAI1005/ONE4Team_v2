import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useLanguage } from "@/hooks/use-language";
import {
  buildAuditDiffRows,
  formatAuditDiffValue,
  hasAuditDiffChanges,
  type AuditDiffRow,
} from "@/lib/audit-diff";

interface OperatorAuditDiffProps {
  before: Record<string, unknown> | null | undefined;
  after: Record<string, unknown> | null | undefined;
}

export function OperatorAuditDiff({ before, after }: OperatorAuditDiffProps) {
  const { t } = useLanguage();
  const d = t.operator.audit.diff;
  const rows = buildAuditDiffRows(before, after);

  if (!rows.length) {
    return <p className="text-sm text-muted-foreground">{d.empty}</p>;
  }

  const changedOnly = rows.filter((row) => row.changed);
  const displayRows = changedOnly.length ? changedOnly : rows;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{d.title}</p>
        <Badge variant={hasAuditDiffChanges(rows) ? "secondary" : "outline"}>
          {d.changed.replace("{count}", String(changedOnly.length))}
        </Badge>
      </div>
      <div className="overflow-hidden rounded-xl border border-border/70">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{d.field}</TableHead>
              <TableHead>{d.before}</TableHead>
              <TableHead>{d.after}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayRows.map((row) => (
              <AuditDiffRowView key={row.key} row={row} />
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function AuditDiffRowView({ row }: { row: AuditDiffRow }) {
  return (
    <TableRow className={row.changed ? "bg-amber-500/5" : undefined}>
      <TableCell className="align-top font-mono text-xs text-foreground">{row.key}</TableCell>
      <TableCell className="max-w-[10rem] align-top">
        <pre className="whitespace-pre-wrap break-all text-xs text-muted-foreground">
          {formatAuditDiffValue(row.before)}
        </pre>
      </TableCell>
      <TableCell className="max-w-[10rem] align-top">
        <pre className="whitespace-pre-wrap break-all text-xs text-foreground">
          {formatAuditDiffValue(row.after)}
        </pre>
      </TableCell>
    </TableRow>
  );
}
