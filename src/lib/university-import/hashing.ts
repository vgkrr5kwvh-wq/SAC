import { createHash } from "node:crypto";

const volatileKeys = new Set([
  "extractedAt",
  "extractionTimestamp",
  "requestId",
  "browserMetadata",
  "renderDuration",
  "cookies",
  "headers",
  "storageState",
]);

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .filter(([key]) => !volatileKeys.has(key))
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, nested]) => [key, canonicalize(nested)]),
  );
}

export function deterministicDataHash(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(canonicalize(value))).digest("hex");
}

