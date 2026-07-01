import { useRef, useState } from "react";
import { Loader2, UploadCloud, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/hooks/use-language";
import { useToast } from "@/hooks/use-toast";
import { uploadClubImageAsset } from "@/lib/upload-club-image";

const MAX_LOGO_BYTES = 2 * 1024 * 1024;

interface OpponentLogoFieldProps {
  clubId: string;
  value: string | null;
  onChange: (url: string | null) => void;
  disabled?: boolean;
}

export function OpponentLogoField({ clubId, value, onChange, disabled }: OpponentLogoFieldProps) {
  const { t } = useLanguage();
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFile(file: File | null) {
    if (!file || disabled) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: t.common.error, description: t.matchesPage.opponentLogoInvalidType, variant: "destructive" });
      return;
    }
    if (file.size > MAX_LOGO_BYTES) {
      toast({ title: t.common.error, description: t.matchesPage.opponentLogoTooLarge, variant: "destructive" });
      return;
    }
    setUploading(true);
    try {
      const url = await uploadClubImageAsset(clubId, file, "match-opponents");
      onChange(url);
    } catch (err) {
      toast({
        title: t.common.error,
        description: err instanceof Error ? err.message : t.matchesPage.opponentLogoUploadFailed,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="space-y-2">
      <label className="block text-[10px] text-muted-foreground">{t.matchesPage.opponentLogoLabel}</label>
      <div className="flex items-center gap-3">
        {value ? (
          <img src={value} alt="" className="h-12 w-12 rounded-lg border border-border object-cover" />
        ) : (
          <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-dashed border-border bg-muted/30 text-[10px] font-bold text-muted-foreground">
            ?
          </div>
        )}
        <div className="flex flex-1 flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={disabled || uploading}
            onClick={() => inputRef.current?.click()}
          >
            {uploading ? (
              <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
            ) : (
              <UploadCloud className="mr-1 h-3.5 w-3.5" />
            )}
            {value ? t.matchesPage.opponentLogoReplace : t.matchesPage.opponentLogoUpload}
          </Button>
          {value ? (
            <Button type="button" size="sm" variant="ghost" disabled={disabled || uploading} onClick={() => onChange(null)}>
              <X className="mr-1 h-3.5 w-3.5" />
              {t.matchesPage.opponentLogoRemove}
            </Button>
          ) : null}
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => void handleFile(e.target.files?.[0] ?? null)}
        />
      </div>
    </div>
  );
}
