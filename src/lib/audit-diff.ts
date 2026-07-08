export interface AuditDiffRow {
  key: string;
  before: unknown;
  after: unknown;
  changed: boolean;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function flattenObject(
  value: Record<string, unknown> | null | undefined,
  prefix = "",
): Record<string, unknown> {
  if (!value) return {};

  const result: Record<string, unknown> = {};
  for (const [key, nested] of Object.entries(value)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (isPlainObject(nested)) {
      Object.assign(result, flattenObject(nested, path));
    } else {
      result[path] = nested;
    }
  }
  return result;
}

function stableStringify(value: unknown): string {
  if (value === undefined) return "—";
  if (value === null) return "null";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

export function buildAuditDiffRows(
  before: Record<string, unknown> | null | undefined,
  after: Record<string, unknown> | null | undefined,
): AuditDiffRow[] {
  const beforeFlat = flattenObject(before ?? null);
  const afterFlat = flattenObject(after ?? null);
  const keys = [...new Set([...Object.keys(beforeFlat), ...Object.keys(afterFlat)])].sort();

  if (keys.length === 0) {
    return [];
  }

  return keys.map((key) => {
    const beforeValue = beforeFlat[key];
    const afterValue = afterFlat[key];
    return {
      key,
      before: beforeValue,
      after: afterValue,
      changed: stableStringify(beforeValue) !== stableStringify(afterValue),
    };
  });
}

export function formatAuditDiffValue(value: unknown): string {
  if (value === undefined) return "—";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

export function hasAuditDiffChanges(rows: AuditDiffRow[]): boolean {
  return rows.some((row) => row.changed);
}
