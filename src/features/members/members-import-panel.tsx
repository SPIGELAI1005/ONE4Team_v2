import { useRef, useState } from "react";
import { FileSpreadsheet, Loader2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  commitGuidedMemberImport,
  GUIDED_IMPORT_MAX,
  previewGuidedMemberImport,
  type GuidedImportPreviewRow,
} from "@/lib/guided-setup-launch";

interface MembersImportPanelProps {
  clubId: string;
  labels: {
    title: string;
    hint: string;
    upload: string;
    save: string;
    preview: string;
    truncated: string;
  };
  onSaved?: (saved: number, skipped: number) => void;
  onError?: (message: string) => void;
}

/** Lightweight spreadsheet import into `club_member_drafts` (shared with GuidedSetup). */
export function MembersImportPanel({ clubId, labels, onSaved, onError }: MembersImportPanelProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);
  const [rows, setRows] = useState<GuidedImportPreviewRow[]>([]);
  const [truncated, setTruncated] = useState(false);

  async function handleFile(file: File) {
    setBusy(true);
    try {
      const preview = await previewGuidedMemberImport(file);
      setRows(preview.rows);
      setTruncated(preview.truncated);
      if (!preview.rows.length) onError?.("empty");
    } catch (err) {
      onError?.(err instanceof Error ? err.message : "import_failed");
    } finally {
      setBusy(false);
    }
  }

  async function handleSave() {
    if (!rows.length) return;
    setBusy(true);
    try {
      const result = await commitGuidedMemberImport({ clubId, rows });
      onSaved?.(result.saved, result.skipped);
      setRows([]);
      setTruncated(false);
    } catch (err) {
      onError?.(err instanceof Error ? err.message : "import_failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl border border-border/60 bg-card/40 p-4 space-y-3">
      <div className="flex items-start gap-2">
        <FileSpreadsheet className="h-4 w-4 text-primary mt-0.5" />
        <div>
          <div className="text-sm font-semibold text-foreground">{labels.title}</div>
          <p className="text-xs text-muted-foreground mt-0.5">{labels.hint}</p>
        </div>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept=".csv,.xlsx,.xls"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) void handleFile(file);
        }}
      />
      <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => inputRef.current?.click()}>
        {busy ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Upload className="h-3.5 w-3.5 mr-1.5" />}
        {labels.upload}
      </Button>
      {rows.length > 0 ? (
        <>
          <p className="text-xs text-muted-foreground">
            {labels.preview.replace("{count}", String(rows.length))}
            {truncated ? ` ${labels.truncated.replace("{max}", String(GUIDED_IMPORT_MAX))}` : ""}
          </p>
          <ul className="max-h-32 overflow-y-auto text-xs space-y-1 rounded-lg border border-border/50 bg-background/40 p-2">
            {rows.map((row) => (
              <li key={row.email} className="flex justify-between gap-2">
                <span className="truncate">{row.name}</span>
                <span className="text-muted-foreground shrink-0">{row.email}</span>
              </li>
            ))}
          </ul>
          <Button type="button" size="sm" disabled={busy} onClick={() => void handleSave()}>
            {labels.save}
          </Button>
        </>
      ) : null}
    </div>
  );
}
