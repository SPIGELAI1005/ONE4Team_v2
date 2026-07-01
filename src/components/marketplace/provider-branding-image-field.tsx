import { useRef, useState } from "react";
import { Loader2, UploadCloud } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLanguage } from "@/hooks/use-language";
import { useToast } from "@/hooks/use-toast";
import {
  uploadProviderImageAsset,
  type ProviderImageFolder,
} from "@/lib/upload-provider-image";
import { isRlsOrPermissionError } from "@/lib/supabase-error";
import { cn } from "@/lib/utils";

interface ProviderBrandingImageFieldProps {
  kind: ProviderImageFolder;
  label: string;
  value: string;
  onChange: (url: string) => void;
  disabled?: boolean;
  className?: string;
}

export function ProviderBrandingImageField({
  kind,
  label,
  value,
  onChange,
  disabled,
  className,
}: ProviderBrandingImageFieldProps) {
  const { t } = useLanguage();
  const l = t.marketplacePage.provider.listing;
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const uploadLabel = kind === "logo" ? l.uploadLogo : l.uploadCover;
  const previewClass =
    kind === "logo" ? "h-14 w-14 rounded-2xl object-cover" : "h-14 w-28 rounded-xl object-cover";

  async function handleFile(file: File | null) {
    if (!file || disabled) return;

    setUploading(true);
    try {
      const url = await uploadProviderImageAsset(file, kind);
      onChange(url);
      toast({ title: l.uploadSuccess });
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      let description = l.uploadFailed;
      if (message === "INVALID_IMAGE_TYPE") {
        description = l.uploadInvalidType;
      } else if (message === "IMAGE_TOO_LARGE") {
        description = kind === "logo" ? l.uploadLogoTooLarge : l.uploadCoverTooLarge;
      } else if (message === "NOT_AUTHENTICATED") {
        description = l.uploadNotSignedIn;
      } else if (message.includes("Bucket not found")) {
        description = l.uploadBucketHint;
      } else if (isRlsOrPermissionError(err)) {
        description = l.uploadPermissionDenied;
      } else if (message) {
        description = message;
      }
      toast({ title: t.common.error, description, variant: "destructive" });
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className={cn("space-y-2", className)}>
      <Label>{label}</Label>
      <Input
        value={value}
        disabled={disabled || uploading}
        placeholder="https://…"
        onChange={(e) => onChange(e.target.value)}
      />
      <div className="flex flex-wrap items-center gap-3">
        {value ? (
          <img src={value} alt="" className={cn("border border-border/60", previewClass)} />
        ) : null}
        <label className={cn("inline-flex", disabled || uploading ? "pointer-events-none opacity-50" : "")}>
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            disabled={disabled || uploading}
            onChange={(e) => void handleFile(e.target.files?.[0] ?? null)}
          />
          <span className="inline-flex cursor-pointer items-center rounded-md border border-input bg-background px-3 py-2 text-xs font-medium hover:bg-accent hover:text-accent-foreground">
            {uploading ? (
              <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
            ) : (
              <UploadCloud className="mr-1 h-3.5 w-3.5" />
            )}
            {uploadLabel}
          </span>
        </label>
      </div>
    </div>
  );
}
