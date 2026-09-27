// Pure value/field readers shared by the reader region: defensive extraction
// from the loosely-typed topic detail wire payload, enum localization through
// the injected text resolver, and evidence reference-key matching. No DOM, no
// Preact — every function here is safe to call during narrowing.

import { SYNTHESIS_WORKBENCH_DEFAULT_MESSAGES } from "../../../shared/synthesisWorkbenchI18nContract";
import type { SynthesisWorkbenchMessageKey } from "../../../shared/synthesisWorkbenchWireContract";

export type ReaderText = (
  key: SynthesisWorkbenchMessageKey,
  args?: Record<string, unknown>,
) => string;

export function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

export function textValue(value: unknown, fallback = ""): string {
  return String(value ?? fallback).trim();
}

export function numberValue(value: unknown, fallback = 0): number {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

export function recordArray(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value) ? value.filter(isRecord) : [];
}

export function recordValue(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {};
}

export function stringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.map((entry) => textValue(entry)).filter(Boolean)
    : [];
}

export function objectEntries(value: unknown): Array<[string, unknown]> {
  return isRecord(value)
    ? Object.entries(value).filter(([, entry]) => {
        if (Array.isArray(entry)) return entry.length > 0;
        if (isRecord(entry)) return Object.keys(entry).length > 0;
        return !!textValue(entry);
      })
    : [];
}

export function hasStructuredContent(value: unknown): boolean {
  if (Array.isArray(value)) return value.length > 0;
  if (isRecord(value)) return objectEntries(value).length > 0;
  return !!textValue(value);
}

export function firstText(
  row: Record<string, unknown>,
  keys: string[],
  fallback = "",
): string {
  for (const key of keys) {
    const value = textValue(row[key]);
    if (value) return value;
  }
  return fallback;
}

// ---------------------------------------------------------------------------
// Enum localization (legacy enumLabel / maybeLocalizedValue)
// ---------------------------------------------------------------------------

const CONTROLLED_ENUM_DOMAINS = [
  "status",
  "kind",
  "reason",
  "relation",
  "action",
  "confidence",
  "coverage",
  "coverage-caveat",
  "freshness",
  "binding-status",
  "priority",
  "graph-node-kind",
  "graph-edge-role",
  "graph-layout",
  "tag-status",
  "tag-density",
  "concept-type",
  "review-tab",
  "sync-status",
  "scope",
] as const;

export type ReaderEnumDomain = (typeof CONTROLLED_ENUM_DOMAINS)[number];

export function enumKeyPart(value: unknown): string {
  return textValue(value)
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/[_\s/]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
}

export function humanizeEnumValue(value: unknown): string {
  const text = textValue(value);
  if (!text) return "";
  return text
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function enumMessageKey(
  domain: ReaderEnumDomain,
  value: unknown,
): SynthesisWorkbenchMessageKey | undefined {
  const keyPart = enumKeyPart(value);
  if (!keyPart) return undefined;
  const key =
    `synthesis-enum-${domain}-${keyPart}` as SynthesisWorkbenchMessageKey;
  return key in SYNTHESIS_WORKBENCH_DEFAULT_MESSAGES ? key : undefined;
}

export function enumLabel(
  t: ReaderText,
  domain: ReaderEnumDomain,
  value: unknown,
  fallback?: string,
): string {
  const key = enumMessageKey(domain, value);
  if (key) return t(key);
  const fallbackText = textValue(fallback);
  if (fallbackText) return fallbackText;
  return humanizeEnumValue(value);
}

export function maybeLocalizedValue(t: ReaderText, value: unknown): string {
  const text = textValue(value);
  if (!text) return "";
  const normalized = text.replace(/_/g, "-").toLowerCase();
  const statusKey =
    `synthesis-status-${normalized}` as SynthesisWorkbenchMessageKey;
  if (statusKey in SYNTHESIS_WORKBENCH_DEFAULT_MESSAGES) {
    return t(statusKey);
  }
  const relationKey =
    `synthesis-relation-${normalized}` as SynthesisWorkbenchMessageKey;
  if (relationKey in SYNTHESIS_WORKBENCH_DEFAULT_MESSAGES) {
    return t(relationKey);
  }
  for (const domain of CONTROLLED_ENUM_DOMAINS) {
    const enumKey = enumMessageKey(domain, text);
    if (enumKey) return t(enumKey);
  }
  return text;
}

export function toneFor(value: unknown): string {
  if (value === "ready" || value === "fresh" || value === "complete") {
    return "ok";
  }
  if (value === "missing" || value === "failed") {
    return "danger";
  }
  return "warn";
}

/** Legacy operationLabel: synthesis-operation-<command> when defined. */
export function operationLabel(t: ReaderText, command: string): string {
  const key = `synthesis-operation-${command}` as SynthesisWorkbenchMessageKey;
  return key in SYNTHESIS_WORKBENCH_DEFAULT_MESSAGES ? t(key) : command;
}

// ---------------------------------------------------------------------------
// Time / metric readers
// ---------------------------------------------------------------------------

export function formatTimeSpan(value: unknown): string {
  if (Array.isArray(value)) {
    const years = value.map((entry) => textValue(entry)).filter(Boolean);
    return years.length >= 2
      ? `${years[0]} - ${years[years.length - 1]}`
      : years[0] || "";
  }
  if (isRecord(value)) {
    const start = firstText(value, [
      "earliest",
      "start_year",
      "min_year",
      "from",
      "start",
    ]);
    const end = firstText(value, [
      "latest",
      "end_year",
      "max_year",
      "to",
      "end",
    ]);
    if (start || end) return `${start || "?"} - ${end || "?"}`;
  }
  return textValue(value);
}

export function numericYear(value: unknown): number {
  const number = Number(value);
  if (
    Number.isFinite(number) &&
    number >= 1500 &&
    number <= 2199 &&
    Number.isInteger(number)
  ) {
    return number;
  }
  const text = textValue(value).trim();
  if (!text) return NaN;
  const match4 = text.match(/\b(?:1[5-9]\d{2}|20\d{2}|21\d{2})\b/);
  if (match4) return Number(match4[0]);
  const matchCh = text.match(/(\d{2})年/);
  if (matchCh) {
    const year = Number(matchCh[1]);
    return year >= 50 ? 1900 + year : 2000 + year;
  }
  const matchPrefix = text.match(/^(\d{2})[-/]\d{1,2}\b/);
  if (matchPrefix) {
    const year = Number(matchPrefix[1]);
    if (year >= 20 && year <= 35) return 2000 + year;
  }
  const matchQuote = text.match(/['’](\d{2})\b/);
  if (matchQuote) {
    const year = Number(matchQuote[1]);
    return year >= 50 ? 1900 + year : 2000 + year;
  }
  return NaN;
}

export function metricNumber(value: unknown): number {
  const number = Number(value);
  return Number.isFinite(number) ? number : NaN;
}

export function nestedMetric(
  evidence: Record<string, unknown>,
  key: string,
): unknown {
  if (key in evidence) return evidence[key];
  for (const containerKey of [
    "graph_metrics",
    "metrics",
    "citation_graph_metrics",
  ]) {
    const container = recordValue(evidence[containerKey]);
    if (key in container) return container[key];
  }
  return undefined;
}

export function textDedupeKey(value: unknown): string {
  return textValue(value).replace(/\s+/g, " ").trim().toLowerCase();
}

// ---------------------------------------------------------------------------
// Evidence reference keys (legacy evidenceRefKeys machinery)
// ---------------------------------------------------------------------------

export function normalizeEvidenceRefKey(value: unknown): string {
  let key = textValue(value);
  if (!key) return "";
  key = key.replace(/^#/, "");
  let previous = "";
  while (key !== previous) {
    previous = key;
    key = key.replace(/^(source[_-]?paper|paper|item)[:/]/i, "");
  }
  return key;
}

export function evidenceItemKey(value: unknown): string {
  const key = normalizeEvidenceRefKey(value);
  if (!key.includes(":")) return key;
  return key.split(":").filter(Boolean).pop() || "";
}

export function evidenceRefKeyVariants(value: unknown): Set<string> {
  const raw = textValue(value);
  const normalized = normalizeEvidenceRefKey(raw);
  const itemKey = evidenceItemKey(raw);
  return new Set([raw, normalized, itemKey].filter(Boolean));
}
