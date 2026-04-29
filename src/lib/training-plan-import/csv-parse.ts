export function parseCsvRows(text: string): Array<Record<string, string>> {
  const lines = text.replace(/\r\n/gu, "\n").split("\n").filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];

  function splitCsvLine(line: string): string[] {
    const out: string[] = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i += 1) {
      const ch = line[i];
      if (ch === "\"") {
        if (inQuotes && line[i + 1] === "\"") {
          current += "\"";
          i += 1;
        } else {
          inQuotes = !inQuotes;
        }
        continue;
      }
      if (ch === "," && !inQuotes) {
        out.push(current);
        current = "";
        continue;
      }
      current += ch;
    }
    out.push(current);
    return out.map((cell) => cell.trim());
  }

  const headerCells = splitCsvLine(lines[0] ?? "");
  const header = headerCells.map((h) => h.trim());

  const rows: Array<Record<string, string>> = [];
  for (const line of lines.slice(1)) {
    const cells = splitCsvLine(line);
    if (cells.length < header.length) continue;
    const row: Record<string, string> = {};
    for (let i = 0; i < header.length; i += 1) {
      row[header[i]] = cells[i] ?? "";
    }
    rows.push(row);
  }
  return rows;
}
