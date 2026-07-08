import { Badge } from "@/components/ui/badge";
import { LEGAL_PDF_BRAND, splitLegalColumns } from "@/lib/operator-legal-pdf";

interface OperatorLegalDocumentPreviewProps {
  title: string;
  categoryLabel: string;
  body: string;
  providerName: string;
  counterpartyName: string;
  providerLogoDataUrl: string | null;
  counterpartyLogoDataUrl: string | null;
  draftLabel: string;
}

function rgbCss([r, g, b]: readonly [number, number, number]) {
  return `rgb(${r}, ${g}, ${b})`;
}

export function OperatorLegalDocumentPreview({
  title,
  categoryLabel,
  body,
  providerName,
  counterpartyName,
  providerLogoDataUrl,
  counterpartyLogoDataUrl,
  draftLabel,
}: OperatorLegalDocumentPreviewProps) {
  const counterparty = counterpartyName.trim() || "—";

  return (
    <div className="overflow-hidden rounded-xl border border-border/60 bg-[rgb(252,250,245)] shadow-sm">
      <div className="h-1.5" style={{ backgroundColor: rgbCss(LEGAL_PDF_BRAND.primary) }} />
      <div className="border-b border-[rgb(229,224,216)] bg-[rgb(252,250,245)] px-6 py-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-xl border border-border/50 bg-white p-1">
            {providerLogoDataUrl ? (
              <img src={providerLogoDataUrl} alt="" className="h-full w-full object-contain" />
            ) : (
              <span className="text-[10px] font-semibold text-[rgb(100,104,115)]">ONE4</span>
            )}
          </div>
          <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-xl border border-border/50 bg-white p-1">
            {counterpartyLogoDataUrl ? (
              <img src={counterpartyLogoDataUrl} alt="" className="h-full w-full object-contain" />
            ) : (
              <span className="text-[10px] font-semibold text-[rgb(100,104,115)]">?</span>
            )}
          </div>
        </div>
        <div className="mt-4 space-y-2 text-center">
          <div className="flex items-center justify-center gap-2">
            <h3 className="font-display text-lg font-semibold text-[rgb(26,28,34)]">{title}</h3>
            <Badge variant="outline" className="border-[rgb(229,224,216)] text-[rgb(100,104,115)]">
              {categoryLabel}
            </Badge>
          </div>
          <p className="text-sm text-[rgb(100,104,115)]">
            {providerName} · {counterparty}
          </p>
        </div>
      </div>
      <div className="max-h-[70vh] overflow-auto bg-white px-6 py-5 font-sans text-[13px] leading-6 text-[rgb(26,28,34)]">
        {body.split("\n").map((line, index) => {
          if (line.trim() === "") return <div key={index} className="h-3" />;

          const columns = splitLegalColumns(line);
          if (columns) {
            return (
              <div key={index} className="grid grid-cols-2 gap-10">
                <span className="whitespace-pre-wrap break-words">{columns[0]}</span>
                <span className="whitespace-pre-wrap break-words">{columns[1]}</span>
              </div>
            );
          }

          return (
            <span key={index} className="block whitespace-pre-wrap break-words">
              {line}
            </span>
          );
        })}
      </div>
      <div className="border-t border-[rgb(229,224,216)] bg-[rgb(252,250,245)] px-6 py-2.5 text-center text-[11px] text-[rgb(100,104,115)]">
        {draftLabel}
      </div>
      <div className="h-1" style={{ backgroundColor: rgbCss(LEGAL_PDF_BRAND.primary) }} />
    </div>
  );
}
