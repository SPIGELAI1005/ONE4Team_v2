import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { OperatorLegalDocumentPreview } from "@/components/operator/OperatorLegalDocumentPreview";
import { OPERATOR_CARD_CLASS } from "@/components/operator/OperatorPageShell";

interface OperatorLegalDocumentPanelProps {
  editTabLabel: string;
  previewTabLabel: string;
  editTitle: string;
  editDescription: string;
  customizedHint: string;
  resetLabel: string;
  body: string;
  onBodyChange: (value: string) => void;
  isCustomized: boolean;
  onReset: () => void;
  title: string;
  categoryLabel: string;
  providerName: string;
  counterpartyName: string;
  providerLogoDataUrl: string | null;
  counterpartyLogoDataUrl: string | null;
  draftLabel: string;
}

export function OperatorLegalDocumentPanel({
  editTabLabel,
  previewTabLabel,
  editTitle,
  editDescription,
  customizedHint,
  resetLabel,
  body,
  onBodyChange,
  isCustomized,
  onReset,
  title,
  categoryLabel,
  providerName,
  counterpartyName,
  providerLogoDataUrl,
  counterpartyLogoDataUrl,
  draftLabel,
}: OperatorLegalDocumentPanelProps) {
  return (
    <Tabs defaultValue="preview" className="space-y-3">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="edit">{editTabLabel}</TabsTrigger>
        <TabsTrigger value="preview">{previewTabLabel}</TabsTrigger>
      </TabsList>

      <TabsContent value="edit" className="mt-0">
        <Card className={OPERATOR_CARD_CLASS}>
          <CardHeader className="flex flex-row items-start justify-between gap-3 pb-3">
            <div>
              <CardTitle className="font-display text-base">{editTitle}</CardTitle>
              <CardDescription className="mt-1">{editDescription}</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={onReset} disabled={!isCustomized}>
              <RotateCcw className="mr-2 h-4 w-4" />
              {resetLabel}
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {isCustomized ? (
              <p className="rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-xs text-muted-foreground">
                {customizedHint}
              </p>
            ) : null}
            <Textarea
              value={body}
              onChange={(event) => onBodyChange(event.target.value)}
              className="min-h-[70vh] resize-y font-mono text-[13px] leading-6"
              spellCheck={false}
            />
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="preview" className="mt-0">
        <OperatorLegalDocumentPreview
          title={title}
          categoryLabel={categoryLabel}
          body={body}
          providerName={providerName}
          counterpartyName={counterpartyName}
          providerLogoDataUrl={providerLogoDataUrl}
          counterpartyLogoDataUrl={counterpartyLogoDataUrl}
          draftLabel={draftLabel}
        />
      </TabsContent>
    </Tabs>
  );
}
