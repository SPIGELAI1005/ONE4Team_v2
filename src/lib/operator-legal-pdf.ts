import { jsPDF } from "jspdf";
import type { Language } from "@/i18n";
import { imageDataUrlFormat } from "@/lib/operator-legal-brand";

/** ONE4Team brand palette (aligned with app primary gold). */
export const LEGAL_PDF_BRAND = {
  primary: [184, 135, 12] as const,
  primaryLight: [252, 250, 245] as const,
  text: [26, 28, 34] as const,
  muted: [100, 104, 115] as const,
  border: [229, 224, 216] as const,
  white: [255, 255, 255] as const,
};

/**
 * Detects a two-column signature/layout line where the left and right parts are
 * separated by a run of spaces (as authored in the templates). Returns the
 * trimmed left/right halves, or null for normal single-column lines.
 */
export function splitLegalColumns(line: string): [string, string] | null {
  const match = line.match(/^(.*?\S)\s{4,}(\S.*)$/);
  if (!match) return null;
  return [match[1].trimEnd(), match[2].trimStart()];
}

export interface LegalPdfInput {
  title: string;
  body: string;
  providerName: string;
  counterpartyName: string;
  providerLogoDataUrl: string | null;
  counterpartyLogoDataUrl: string | null;
  language: Language;
  fileName: string;
}

const FOOTER_COPY: Record<Language, { draft: string; page: string }> = {
  en: { draft: "Draft — for internal use only · Not legal advice", page: "Page" },
  de: { draft: "Entwurf — nur für interne Nutzung · Keine Rechtsberatung", page: "Seite" },
};

const MARGIN_X = 18;
const MARGIN_TOP = 20;
const MARGIN_BOTTOM = 16;
const LINE_HEIGHT = 5.2;
const LOGO_BOX = 18;

function setRgb(doc: jsPDF, color: readonly [number, number, number]) {
  doc.setTextColor(color[0], color[1], color[2]);
}

function setFillRgb(doc: jsPDF, color: readonly [number, number, number]) {
  doc.setFillColor(color[0], color[1], color[2]);
}

function setDrawRgb(doc: jsPDF, color: readonly [number, number, number]) {
  doc.setDrawColor(color[0], color[1], color[2]);
}

function tryAddLogo(doc: jsPDF, dataUrl: string | null, x: number, y: number, size: number) {
  if (!dataUrl) return;
  try {
    doc.addImage(dataUrl, imageDataUrlFormat(dataUrl), x, y, size, size, undefined, "FAST");
  } catch {
    // Skip unreadable images so text export still works.
  }
}

function drawPageHeader(doc: jsPDF, input: LegalPdfInput, yStart: number): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = yStart;

  setFillRgb(doc, LEGAL_PDF_BRAND.primary);
  doc.rect(0, 0, pageWidth, 6, "F");

  setFillRgb(doc, LEGAL_PDF_BRAND.primaryLight);
  doc.rect(0, 6, pageWidth, 28, "F");

  const logoY = 10;
  tryAddLogo(doc, input.providerLogoDataUrl, MARGIN_X, logoY, LOGO_BOX);
  tryAddLogo(doc, input.counterpartyLogoDataUrl, pageWidth - MARGIN_X - LOGO_BOX, logoY, LOGO_BOX);

  y = logoY + LOGO_BOX + 6;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  setRgb(doc, LEGAL_PDF_BRAND.text);
  doc.text(input.title, pageWidth / 2, y, { align: "center", maxWidth: pageWidth - MARGIN_X * 2 });

  y += 7;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  setRgb(doc, LEGAL_PDF_BRAND.muted);
  const counterparty = input.counterpartyName.trim() || "—";
  doc.text(`${input.providerName}  ·  ${counterparty}`, pageWidth / 2, y, {
    align: "center",
    maxWidth: pageWidth - MARGIN_X * 2,
  });

  y += 5;
  setDrawRgb(doc, LEGAL_PDF_BRAND.border);
  doc.setLineWidth(0.3);
  doc.line(MARGIN_X, y, pageWidth - MARGIN_X, y);

  return y + 8;
}

function drawPageFooter(doc: jsPDF, input: LegalPdfInput, pageNumber: number, totalPages: number) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const copy = FOOTER_COPY[input.language];

  setDrawRgb(doc, LEGAL_PDF_BRAND.border);
  doc.setLineWidth(0.2);
  doc.line(MARGIN_X, pageHeight - MARGIN_BOTTOM, pageWidth - MARGIN_X, pageHeight - MARGIN_BOTTOM);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  setRgb(doc, LEGAL_PDF_BRAND.muted);
  doc.text(copy.draft, MARGIN_X, pageHeight - MARGIN_BOTTOM + 5);
  doc.text(`${copy.page} ${pageNumber} / ${totalPages}`, pageWidth - MARGIN_X, pageHeight - MARGIN_BOTTOM + 5, {
    align: "right",
  });

  setFillRgb(doc, LEGAL_PDF_BRAND.primary);
  doc.rect(0, pageHeight - 3, pageWidth, 3, "F");
}

export function buildLegalPdfDocument(input: LegalPdfInput): jsPDF {
  const doc = new jsPDF({ unit: "mm", format: "a4", compress: true });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const contentWidth = pageWidth - MARGIN_X * 2;

  let y = drawPageHeader(doc, input, MARGIN_TOP + 18);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  setRgb(doc, LEGAL_PDF_BRAND.text);

  const paragraphs = input.body.split("\n");
  const columnGap = 8;
  const columnWidth = (contentWidth - columnGap) / 2;
  const rightColumnX = MARGIN_X + columnWidth + columnGap;

  const ensureSpace = () => {
    if (y > pageHeight - MARGIN_BOTTOM - 6) {
      doc.addPage();
      y = MARGIN_TOP;
    }
  };

  for (const paragraph of paragraphs) {
    if (paragraph.trim() === "") {
      y += 3;
      continue;
    }

    const columns = splitLegalColumns(paragraph);
    if (columns) {
      const leftLines = doc.splitTextToSize(columns[0], columnWidth) as string[];
      const rightLines = doc.splitTextToSize(columns[1], columnWidth) as string[];
      const rowCount = Math.max(leftLines.length, rightLines.length);
      for (let index = 0; index < rowCount; index += 1) {
        ensureSpace();
        if (leftLines[index]) doc.text(leftLines[index], MARGIN_X, y);
        if (rightLines[index]) doc.text(rightLines[index], rightColumnX, y);
        y += LINE_HEIGHT;
      }
      continue;
    }

    const wrapped = doc.splitTextToSize(paragraph, contentWidth) as string[];
    for (const line of wrapped) {
      ensureSpace();
      doc.text(line, MARGIN_X, y);
      y += LINE_HEIGHT;
    }
  }

  const totalPages = doc.getNumberOfPages();
  for (let page = 1; page <= totalPages; page += 1) {
    doc.setPage(page);
    if (page > 1) {
      setFillRgb(doc, LEGAL_PDF_BRAND.primary);
      doc.rect(0, 0, pageWidth, 4, "F");
    }
    drawPageFooter(doc, input, page, totalPages);
  }

  return doc;
}

export function downloadLegalDocumentPdf(input: LegalPdfInput): void {
  buildLegalPdfDocument(input).save(input.fileName);
}
