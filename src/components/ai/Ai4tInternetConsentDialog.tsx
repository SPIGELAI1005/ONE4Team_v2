import { Globe, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useLanguage } from "@/hooks/use-language";

interface Ai4tInternetConsentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  loading?: boolean;
}

export function Ai4tInternetConsentDialog({
  open,
  onOpenChange,
  onConfirm,
  loading,
}: Ai4tInternetConsentDialogProps) {
  const { t } = useLanguage();
  const copy = t.coTrainerPage.internetMode;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md border-border/60 bg-background/95 backdrop-blur-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display">
            <Globe className="h-5 w-5 text-amber-500" />
            {copy.consentTitle}
          </DialogTitle>
          <DialogDescription className="text-left text-sm leading-relaxed text-muted-foreground">
            {copy.consentBody}
          </DialogDescription>
        </DialogHeader>
        <div className="rounded-xl border border-amber-500/25 bg-amber-500/10 p-3 text-xs leading-relaxed text-foreground/90">
          <ShieldAlert className="mb-1.5 inline h-3.5 w-3.5 text-amber-600" /> {copy.consentNotice}
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            {copy.consentCancel}
          </Button>
          <Button type="button" disabled={loading} onClick={onConfirm}>
            {copy.consentConfirm}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
