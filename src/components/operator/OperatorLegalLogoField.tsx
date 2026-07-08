import { useRef, useState } from "react";
import { Loader2, UploadCloud, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { readFileAsDataUrl } from "@/lib/operator-legal-brand";
import { cn } from "@/lib/utils";

interface OperatorLegalLogoFieldProps {
  id: string;
  label: string;
  hint?: string;
  value: string | null;
  onChange: (dataUrl: string | null) => void;
  uploadLabel: string;
  changeLabel: string;
  removeLabel: string;
  invalidTypeMessage: string;
  tooLargeMessage: string;
  onError?: (message: string) => void;
  className?: string;
}

export function OperatorLegalLogoField({
  id,
  label,
  hint,
  value,
  onChange,
  uploadLabel,
  changeLabel,
  removeLabel,
  invalidTypeMessage,
  tooLargeMessage,
  onError,
  className,
}: OperatorLegalLogoFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFile(file: File | null) {
    if (!file) return;
    setUploading(true);
    try {
      const dataUrl = await readFileAsDataUrl(file);
      onChange(dataUrl);
    } catch (error) {
      const code = error instanceof Error ? error.message : "";
      if (code === "INVALID_IMAGE_TYPE") onError?.(invalidTypeMessage);
      else if (code === "IMAGE_TOO_LARGE") onError?.(tooLargeMessage);
      else onError?.(code || "Upload failed");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className={cn("space-y-2", className)}>
      <Label htmlFor={id}>{label}</Label>
      <div className="flex items-start gap-3">
        {value ? (
          <img src={value} alt="" className="h-14 w-14 shrink-0 rounded-xl border border-border/60 bg-white object-contain p-1" />
        ) : (
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-dashed border-border/70 bg-muted/30 text-xs text-muted-foreground">
            ?
          </div>
        )}
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={uploading}
              onClick={() => inputRef.current?.click()}
            >
              {uploading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <UploadCloud className="mr-2 h-4 w-4" />
              )}
              {value ? changeLabel : uploadLabel}
            </Button>
            {value ? (
              <Button type="button" size="sm" variant="ghost" disabled={uploading} onClick={() => onChange(null)}>
                <X className="mr-2 h-4 w-4" />
                {removeLabel}
              </Button>
            ) : null}
          </div>
          {hint ? <p className="text-xs leading-4 text-muted-foreground">{hint}</p> : null}
        </div>
        <input
          id={id}
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/jpg"
          className="hidden"
          onChange={(event) => void handleFile(event.target.files?.[0] ?? null)}
        />
      </div>
    </div>
  );
}
