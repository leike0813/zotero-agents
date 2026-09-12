import {
  ensureSourceReferenceId,
  generateSourceReferenceId,
  parseCitationAnalysisArtifact,
  parseSourceReferenceArtifact,
  type CitationAnalysisArtifact,
  type CitationFunction,
  type CitationItem,
  type CitationMention,
  type CitationUnresolvedMention,
  type SourceReference,
  type SourceReferenceArtifact,
} from "../../../packages/synthesis-contracts/src/sourceReferenceArtifact";
import type { JsonValue, PortableItemRef } from "../../workflows/types";

export type LegacyArtifactSetInput = {
  libraryId: number;
  parentRef: PortableItemRef;
  parentTitle?: string;
  references?: unknown;
  citation?: unknown;
  legacyPayload?: unknown;
  noteContent?: string;
  noteContents?: string[];
  filePayload?: unknown;
  filePayloads?: unknown[];
  /** Transient source note refs; never persisted in the conversion basis. */
  legacyNoteRefs?: PortableItemRef[];
  /** Raw note facts retained only in the process-local scan plan. */
  legacyNotes?: Array<{
    ref: PortableItemRef;
    html: string;
    revision: string;
    payloads: Array<{
      payloadType: string;
      value?: unknown;
      error?: string;
      attachmentRef?: PortableItemRef;
      sourceStorage?: string;
      payloadStorageVersion?: number;
      payloadHash?: string;
    }>;
  }>;
  /** Existing canonical pair facts retained so same-kind legacy data blocks. */
  canonicalNotes?: Array<{
    ref: PortableItemRef;
    noteKind: "references" | "citation-analysis";
    revision: string;
    payload: JsonValue;
  }>;
  existingReferences?: SourceReference[];
  readErrors?: string[];
  writable?: boolean;
  readOnly?: boolean;
  artifactKind?: string;
};

export type LiteratureArtifactMigrationConverterOptions = {
  idFactory?: () => string;
  mentionIdFactory?: (index: number) => string;
  /** Offline import may link Citation to an already canonical References set. */
  allowCitationOnlyWithExistingReferences?: boolean;
};

export type LiteratureArtifactMigrationConversion = {
  classification: "ready" | "review_required" | "blocked";
  reasonCodes: Array<
    | "citation_only"
    | "duplicate_reference"
    | "conflicting_evidence"
    | "damaged_input"
    | "data_loss"
    | "read_only_library"
    | "unresolved_linkage"
    | "ambiguous_linkage"
    | "citation_snapshot_recovery"
    | "no_references"
    | "invalid_canonical_artifact"
    | "canonical_conflict"
    | "unsupported_input"
  >;
  diagnostics: string[];
  references: SourceReferenceArtifact;
  citation: CitationAnalysisArtifact | null;
  basisHash: string;
  verifiedCount: number;
  unresolvedCount: number;
  recoveredCount: number;
  droppedCount: number;
  originalReferenceCount: number;
  originalMentionCount: number;
  /** Affected source entries per reason code, recorded during conversion. */
  issueItems: Partial<Record<string, Array<{ label: string; hint?: string }>>>;
};

type LiteratureArtifactMigrationClassification =
  LiteratureArtifactMigrationConversion["classification"];
export type LiteratureArtifactMigrationReasonCode =
  LiteratureArtifactMigrationConversion["reasonCodes"][number];

export type LiteratureArtifactMigrationResolutionKind =
  | "merge_duplicates"
  | "keep_unresolved"
  | "drop_unresolved"
  | "accept_recovery"
  | "replace_canonical"
  | "preserve_source"
  | "accept_data_loss"
  | "skip_candidate";

export const MIGRATABLE_LEGACY_PAYLOAD_TYPES: ReadonlySet<string> = new Set([
  "references-json",
  "citation-analysis-json",
]);

export const KNOWN_LEGACY_PAYLOAD_TYPES: ReadonlySet<string> = new Set([
  ...MIGRATABLE_LEGACY_PAYLOAD_TYPES,
  "digest-markdown",
  "literature-score-json",
  "literature-matching-metadata-json",
  "conversation-note-markdown",
  "custom-markdown",
]);

function classificationForReasons(
  reasons: ReadonlySet<LiteratureArtifactMigrationReasonCode>,
): LiteratureArtifactMigrationClassification {
  return reasons.has("read_only_library") ||
    reasons.has("citation_only") ||
    reasons.has("unsupported_input") ||
    reasons.has("no_references") ||
    reasons.has("duplicate_reference") ||
    reasons.has("conflicting_evidence") ||
    reasons.has("damaged_input") ||
    reasons.has("data_loss") ||
    reasons.has("invalid_canonical_artifact") ||
    reasons.has("canonical_conflict")
    ? "blocked"
    : reasons.has("unresolved_linkage") ||
        reasons.has("ambiguous_linkage") ||
        reasons.has("citation_snapshot_recovery")
      ? "review_required"
      : "ready";
}

function payloadMarkerTypes(html: string): string[] {
  const types = new Set<string>();
  const pattern = /data-zs-payload\s*=\s*(["']?)([^\s"'>]+)\1/giu;
  for (const match of html.matchAll(pattern)) {
    const payloadType = text(match[2]);
    if (payloadType) types.add(payloadType);
  }
  return [...types];
}

function text(value: unknown): string {
  const source = String(value ?? "");
  try {
    return source.normalize("NFKC").replace(/\s+/g, " ").trim();
  } catch {
    return source.replace(/\s+/g, " ").trim();
  }
}

function object(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function list(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function firstText(...values: unknown[]): string {
  for (const value of values) {
    const normalized = text(value);
    if (normalized) return normalized;
  }
  return "";
}

function normalizeAuthors(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((entry) => {
        if (typeof entry === "string") return text(entry);
        const row = object(entry);
        if (!row) return "";
        return firstText(
          row.name,
          [row.given, row.family].filter(Boolean).join(" "),
          row.family,
        );
      })
      .filter(Boolean);
  }
  return typeof value === "string"
    ? value
        .split(/[;\n]/)
        .map((entry) => text(entry))
        .filter(Boolean)
    : [];
}

function strictYear(value: unknown): number | null | undefined {
  if (value === null || typeof value === "undefined" || text(value) === "") {
    return null;
  }
  if (typeof value === "number") {
    return Number.isSafeInteger(value) ? value : undefined;
  }
  const normalized = text(value);
  if (!/^-?\d+$/.test(normalized)) return undefined;
  const parsed = Number(normalized);
  return Number.isSafeInteger(parsed) ? parsed : undefined;
}

function normalizeDoi(value: unknown): string {
  return text(value)
    .replace(/^https?:\/\/doi\.org\//i, "")
    .replace(/^doi:\s*/i, "")
    .toLowerCase();
}

function normalizeMatchingValue(key: string, value: unknown): string {
  const normalized = text(value);
  return key === "DOI" ? normalizeDoi(normalized) : normalized;
}

function normalizeConfidence(value: unknown): number | null {
  if (value === null || typeof value === "undefined" || text(value) === "") {
    return null;
  }
  const parsed = typeof value === "number" ? value : Number(text(value));
  return Number.isFinite(parsed) && parsed >= 0 && parsed <= 1 ? parsed : null;
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableJson(record[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value) ?? "null";
}

function hashText(value: string): string {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function legacySourceFacts(input: LegacyArtifactSetInput) {
  return (input.legacyNotes || []).map((note) => ({
    ref: note.ref,
    revision: note.revision,
    htmlHash: hashText(note.html),
    payloads: note.payloads.map((payload) => ({
      payloadType: payload.payloadType,
      ...(payload.value !== undefined
        ? { valueHash: hashText(stableJson(payload.value)) }
        : {}),
      ...(payload.error ? { error: payload.error } : {}),
      ...(payload.attachmentRef
        ? { attachmentRef: payload.attachmentRef }
        : {}),
      ...(payload.sourceStorage
        ? { sourceStorage: payload.sourceStorage }
        : {}),
      ...(payload.payloadStorageVersion !== undefined
        ? { payloadStorageVersion: payload.payloadStorageVersion }
        : {}),
      ...(payload.payloadHash ? { payloadHash: payload.payloadHash } : {}),
    })),
  }));
}

function canonicalSourceFacts(input: LegacyArtifactSetInput) {
  return (input.canonicalNotes || []).map((note) => ({
    ref: note.ref,
    noteKind: note.noteKind,
    revision: note.revision,
    payloadHash: hashText(stableJson(note.payload)),
  }));
}

function boundedDiagnostics(values: unknown[]): string[] {
  return values.map(text).filter(Boolean).slice(0, 20);
}

type DecodedHtmlPayload = {
  payloadType: string;
  value: unknown;
};

type LegacyPayloadValue = DecodedHtmlPayload & {
  sourceKey: string;
};

function decodePayloadTag(
  tag: string,
  payloadType: string,
): DecodedHtmlPayload | null {
  const valueMatch = tag.match(/data-zs-value\s*=\s*(["'])([\s\S]*?)\1/i);
  if (!valueMatch) return null;
  let encoded = valueMatch[2] || "";
  encoded = encoded
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&");
  const encoding =
    tag.match(/data-zs-encoding\s*=\s*(["'])(.*?)\1/i)?.[2] || "base64";
  try {
    if (encoding.toLowerCase() === "base64") {
      const atobValue = (globalThis as { atob?: (value: string) => string })
        .atob;
      if (typeof atobValue !== "function") return null;
      const binary = atobValue(encoded);
      const bytes = Uint8Array.from(binary, (value) => value.charCodeAt(0));
      encoded = new TextDecoder().decode(bytes);
    }
    return { payloadType, value: JSON.parse(encoded) };
  } catch {
    return null;
  }
}

function decodeHtmlPayloads(noteContent: string): DecodedHtmlPayload[] {
  const payloads: DecodedHtmlPayload[] = [];
  const tagPattern =
    /<span\b[^>]*data-zs-payload\s*=\s*(["']?)([^\s"'>]+)\1[^>]*>/giu;
  for (const match of noteContent.matchAll(tagPattern)) {
    const payloadType = text(match[2]);
    if (!KNOWN_LEGACY_PAYLOAD_TYPES.has(payloadType)) {
      continue;
    }
    const decoded = decodePayloadTag(match[0], payloadType);
    if (decoded) payloads.push(decoded);
  }
  return payloads;
}

function unwrapReferences(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  const row = object(value);
  if (!row) return [];
  if (Array.isArray(row.references)) return row.references;
  if (Array.isArray(row.items)) return row.items;
  if (Array.isArray(row.records)) return row.records;
  if (object(row.payload)) return unwrapReferences(row.payload);
  return [];
}

function unwrapCitation(value: unknown): Record<string, unknown> | null {
  const row = object(value);
  if (!row) return null;
  const wrappedCitation = object(row.citation_analysis);
  if (wrappedCitation) return wrappedCitation;
  const camelCitation = object(row.citationAnalysis);
  if (camelCitation) return camelCitation;
  if (object(row.payload)) return unwrapCitation(row.payload);
  return row;
}

function resolveLegacyValues(input: LegacyArtifactSetInput): {
  references: unknown[];
  citation: Record<string, unknown> | null;
} {
  const sourceKeyForRef = (ref: unknown): string | null => {
    const row = object(ref);
    const libraryId =
      typeof row?.libraryId === "number"
        ? row.libraryId
        : Number(text(row?.libraryId));
    const key = text(row?.key);
    return Number.isSafeInteger(libraryId) && libraryId > 0 && key
      ? `note:${libraryId}:${key}`
      : null;
  };
  const decodedPayloads: LegacyPayloadValue[] = [];
  const payloadValues: LegacyPayloadValue[] = [];
  const appendPayload = (value: unknown, fallbackSourceKey: string): void => {
    const row = object(value);
    const sourceKey = sourceKeyForRef(row?.sourceRef) || fallbackSourceKey;
    if (row && typeof row.payloadType === "string" && "value" in row) {
      payloadValues.push({
        payloadType: text(row.payloadType),
        value: row.value,
        sourceKey,
      });
      return;
    }
    payloadValues.push({ payloadType: "", value, sourceKey });
  };
  for (const [index, value] of (input.filePayloads || []).entries()) {
    appendPayload(value, `file:${index}`);
  }
  if (input.filePayload !== undefined && input.filePayload !== null) {
    appendPayload(input.filePayload, "file:single");
  }
  if (input.legacyPayload !== undefined && input.legacyPayload !== null) {
    appendPayload(input.legacyPayload, "legacy:single");
  }
  const noteContents = [
    ...(input.noteContents || []).map((content, index) => ({
      content,
      sourceKey:
        sourceKeyForRef(input.legacyNoteRefs?.[index]) ||
        sourceKeyForRef(input.legacyNotes?.[index]?.ref) ||
        `note-html:${index}`,
    })),
    ...(typeof input.noteContent === "string"
      ? [{ content: input.noteContent, sourceKey: "note-html:single" }]
      : []),
  ].filter(
    (entry): entry is { content: string; sourceKey: string } =>
      typeof entry.content === "string",
  );
  for (const { content, sourceKey } of noteContents) {
    decodedPayloads.push(
      ...decodeHtmlPayloads(content).map((payload) => ({
        ...payload,
        sourceKey,
      })),
    );
  }
  payloadValues.push(...decodedPayloads);
  const uniquePayloadValues = (payloadType: string) => {
    const seen = new Set<string>();
    return payloadValues
      .filter((entry) => entry.payloadType === payloadType)
      .filter((entry) => {
        const key = `${entry.sourceKey}\u0000${stableJson(entry.value)}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .map((entry) => entry.value);
  };
  const typedReferences = uniquePayloadValues("references-json");
  const typedCitations = uniquePayloadValues("citation-analysis-json");
  const inferredReferences = typedCitations.length
    ? undefined
    : payloadValues
        .map((entry) => entry.value)
        .find((value) => {
          const row = object(value);
          return Boolean(
            Array.isArray(value) ||
            row?.references ||
            row?.reference_entries ||
            (row?.items &&
              !row?.mentions &&
              !row?.unmapped_mentions &&
              !row?.snapshots &&
              !row?.reference_snapshots),
          );
        });
  const inferredCitation = payloadValues
    .map((entry) => entry.value)
    .find((value) => {
      const row = object(value);
      return Boolean(
        row?.citation_analysis ||
        row?.citationAnalysis ||
        row?.mentions ||
        row?.unmapped_mentions,
      );
    });
  const referencePayload = input.references ?? inferredReferences;
  const references = input.references
    ? unwrapReferences(referencePayload)
    : typedReferences.length
      ? typedReferences.flatMap(unwrapReferences)
      : unwrapReferences(referencePayload);
  const citationPayload =
    input.citation ?? typedCitations[0] ?? inferredCitation;
  return {
    references,
    citation: unwrapCitation(citationPayload),
  };
}

function pickCanonicalId(row: Record<string, unknown>): string {
  return firstText(
    row.sourceReferenceId,
    row.canonicalSourceReferenceId,
    row.retainedSourceReferenceId,
  );
}

function normalizeMatching(
  row: Record<string, unknown>,
): Record<string, string> {
  const nested = object(row.matching) || {};
  const aliases: Array<[string, string[]]> = [
    ["DOI", ["DOI", "doi"]],
    ["url", ["url", "URL"]],
    ["ISBN", ["ISBN", "isbn"]],
    ["ISSN", ["ISSN", "issn"]],
    ["citekey", ["citekey", "citeKey"]],
  ];
  const result: Record<string, string> = {};
  for (const [canonical, names] of aliases) {
    const value = firstText(
      ...names.map((name) => nested[name]),
      ...names.map((name) => row[name]),
    );
    if (value) result[canonical] = normalizeMatchingValue(canonical, value);
  }
  return result;
}

function referenceTuple(reference: SourceReference): string {
  return [
    text(reference.bibliography.title).toLowerCase(),
    String(reference.bibliography.year ?? ""),
    reference.bibliography.authors
      .map((author) => text(author).toLowerCase())
      .join(";"),
  ].join("|");
}

function rawReferenceKey(reference: SourceReference): string {
  return text(reference.extraction?.raw || "").toLowerCase();
}

function matchingKeys(reference: SourceReference): string[] {
  return ["DOI"]
    .map((key) => {
      const value = reference.matching[key as keyof typeof reference.matching];
      return value ? `${key}:${normalizeMatchingValue(key, value)}` : "";
    })
    .filter(Boolean);
}

function makeSourceReference(
  value: unknown,
  idFactory: () => string,
  diagnostics: string[],
): SourceReference | null {
  const row = object(value);
  if (!row) {
    diagnostics.push("reference entry is not an object");
    return null;
  }
  const bibliography = object(row.bibliography) || row;
  const title = firstText(bibliography.title, row.title);
  const authors = normalizeAuthors(
    bibliography.authors ?? row.authors ?? row.author,
  );
  const year = strictYear(bibliography.year ?? row.year);
  const extraction = object(row.extraction);
  const raw = firstText(extraction?.raw, row.raw, row.rawText, row.rawCitation);
  const confidence = normalizeConfidence(
    extraction?.confidence ?? row.confidence,
  );
  const explicitId = pickCanonicalId(row);
  if (!title || typeof year === "undefined") {
    diagnostics.push(
      !title
        ? "reference title is missing"
        : "reference year is not a strict integer",
    );
    return null;
  }
  const matching = normalizeMatching(row);
  const optionalFields = [
    "publicationTitle",
    "conferenceName",
    "university",
    "archiveID",
    "volume",
    "issue",
    "pages",
    "place",
    "publisher",
    "itemType",
    "date",
  ] as const;
  const normalizedBibliography: SourceReference["bibliography"] = {
    title,
    authors,
    year,
  };
  for (const field of optionalFields) {
    const fieldValue = firstText(bibliography[field], row[field]);
    if (fieldValue) normalizedBibliography[field] = fieldValue;
  }
  const numPages = strictYear(bibliography.numPages ?? row.numPages);
  if (typeof numPages === "number" && numPages >= 0) {
    normalizedBibliography.numPages = numPages;
  }
  return {
    sourceReferenceId: ensureSourceReferenceId(
      explicitId || undefined,
      idFactory,
    ),
    extraction: raw ? { raw, confidence } : null,
    bibliography: normalizedBibliography,
    matching,
  };
}

function matchReference(
  value: unknown,
  references: SourceReference[],
): {
  reference: SourceReference | null;
  ambiguous: boolean;
  conflicting?: boolean;
} {
  const row = object(value);
  if (!row) return { reference: null, ambiguous: false };
  const explicitId = pickCanonicalId(row);
  if (explicitId) {
    const exact = references.filter(
      (reference) => reference.sourceReferenceId === explicitId,
    );
    if (exact.length === 1) {
      const conflicting = referenceFactsConflict(row, exact[0]!);
      return {
        reference: conflicting ? null : exact[0]!,
        ambiguous: false,
        conflicting,
      };
    }
    if (exact.length > 1) return { reference: null, ambiguous: true };
  }
  const doi = normalizeMatching(row).DOI;
  const raw = firstText(
    object(row.extraction)?.raw,
    row.raw,
    row.rawText,
    row.rawCitation,
  ).toLowerCase();
  let matches = doi
    ? references.filter(
        (reference) =>
          normalizeMatchingValue("DOI", reference.matching.DOI || "") === doi,
      )
    : [];
  if (!matches.length && raw) {
    matches = references.filter(
      (reference) => rawReferenceKey(reference) === raw,
    );
  }
  if (!matches.length) {
    const candidate = makeSourceReference(row, () => "unused", []);
    if (candidate)
      matches = references.filter(
        (reference) => referenceTuple(reference) === referenceTuple(candidate),
      );
  }
  const conflicting =
    matches.length === 1 && referenceFactsConflict(row, matches[0]!);
  return {
    reference: matches.length === 1 && !conflicting ? matches[0] : null,
    ambiguous: matches.length > 1,
    conflicting,
  };
}

function referenceFactsConflict(
  row: Record<string, unknown>,
  reference: SourceReference,
): boolean {
  const bibliography = object(row.bibliography) || row;
  const title = firstText(bibliography.title, row.title);
  const year = strictYear(bibliography.year ?? row.year);
  const authors = normalizeAuthors(
    bibliography.authors ?? row.authors ?? row.author,
  );
  const doi = normalizeMatching(row).DOI;
  return Boolean(
    (title &&
      text(title).toLowerCase() !==
        text(reference.bibliography.title).toLowerCase()) ||
    (year !== undefined &&
      year !== null &&
      reference.bibliography.year !== null &&
      year !== reference.bibliography.year) ||
    (authors.length &&
      reference.bibliography.authors.length &&
      authors.map((author) => text(author).toLowerCase()).join(";") !==
        reference.bibliography.authors
          .map((author) => text(author).toLowerCase())
          .join(";")) ||
    (doi &&
      reference.matching.DOI &&
      doi !== normalizeMatchingValue("DOI", reference.matching.DOI)),
  );
}

const CITATION_FUNCTION_SET = new Set<CitationFunction>([
  "background",
  "baseline",
  "contrast",
  "component",
  "dataset",
  "tooling",
  "historical",
  "uncategorized",
]);

function normalizeMention(
  value: unknown,
  index: number,
  mentionIdFactory: (index: number) => string,
): CitationMention {
  const row = object(value) || {};
  const lineStartValue = strictYear(row.line_start ?? row.lineStart);
  const lineStart =
    typeof lineStartValue === "number" && lineStartValue >= 0
      ? lineStartValue
      : 0;
  const lineEndValue = strictYear(row.line_end ?? row.lineEnd);
  const lineEnd =
    typeof lineEndValue === "number" && lineEndValue >= lineStart
      ? lineEndValue
      : lineStart;
  const yearHint = strictYear(row.year_hint ?? row.yearHint ?? row.year);
  const refNumberHint = strictYear(
    row.ref_number_hint ?? row.refNumberHint ?? row.refNumber,
  );
  return {
    mention_id:
      firstText(row.mention_id, row.mentionId) || mentionIdFactory(index),
    marker: firstText(row.marker, row.rawCitation, row.raw) || "",
    style: firstText(row.style, row.citationStyle) || "",
    line_start: lineStart,
    line_end: lineEnd,
    snippet: firstText(row.snippet, row.context, row.rawCitation) || "",
    ref_number_hint:
      typeof refNumberHint === "number" && refNumberHint >= 0
        ? refNumberHint
        : null,
    year_hint: typeof yearHint === "number" ? yearHint : null,
    surname_hint:
      firstText(row.surname_hint, row.surnameHint, row.author) || null,
    citation_label_hint:
      firstText(row.citation_label_hint, row.citationLabelHint) || null,
    citekey_hint:
      firstText(row.citekey_hint, row.citekeyHint, row.citekey) || null,
  };
}

function normalizeCitation(
  value: Record<string, unknown>,
  references: SourceReference[],
  diagnostics: string[],
  mentionIdFactory: (index: number) => string,
): {
  citation: CitationAnalysisArtifact;
  unresolved: number;
  ambiguous: boolean;
  conflicting: boolean;
} {
  const metaRow = object(value.meta) || {};
  const scopeRow = object(metaRow.scope) || {};
  const scopeDecisionRow = object(metaRow.scope_decision) || {};
  const fallbackScopeRow = object(scopeDecisionRow.fallback_from);
  const rawItems = list(value.items);
  const rawMentions = list(value.mentions);
  const rawUnresolved = list(value.unresolved ?? value.unmapped_mentions);
  const unresolved: CitationUnresolvedMention[] = [];
  const items: CitationItem[] = [];
  let ambiguous = false;
  let conflicting = false;
  let mentionIndex = 0;
  for (const rawItem of rawItems) {
    const item = object(rawItem) || {};
    const matched = matchReference(item, references);
    if (matched.ambiguous) ambiguous = true;
    if (matched.conflicting) conflicting = true;
    const mentions = list(item.mentions).map((mention) =>
      normalizeMention(mention, mentionIndex++, mentionIdFactory),
    );
    if (!matched.reference) {
      diagnostics.push("citation item linkage is unresolved");
      unresolved.push(
        ...mentions.map((mention) => ({
          ...mention,
          reason: matched.ambiguous
            ? "ambiguous_linkage"
            : "unresolved_linkage",
        })),
      );
      continue;
    }
    const rawFunction = text(item.function);
    const citationFunction = CITATION_FUNCTION_SET.has(
      rawFunction as CitationFunction,
    )
      ? (rawFunction as CitationFunction)
      : null;
    if (rawFunction && !citationFunction)
      diagnostics.push("citation function category was not recognized");
    items.push({
      sourceReferenceId: matched.reference.sourceReferenceId,
      function: citationFunction,
      role_in_context:
        firstText(item.role_in_context, item.roleInContext) || null,
      topic: firstText(item.topic) || null,
      usage: firstText(item.usage) || null,
      keywords: list(item.keywords).map(text).filter(Boolean),
      summary: firstText(item.summary) || null,
      key_reference_reason:
        firstText(item.key_reference_reason, item.keyReferenceReason) || null,
      confidence: normalizeConfidence(item.confidence),
      mentions,
    });
  }
  for (const mention of [...rawMentions, ...rawUnresolved]) {
    const normalized = normalizeMention(
      mention,
      mentionIndex++,
      mentionIdFactory,
    );
    unresolved.push({ ...normalized, reason: "unresolved_linkage" });
  }
  const timeline: CitationAnalysisArtifact["timeline"] = {
    early: { summary: "", sourceReferenceIds: [] },
    mid: { summary: "", sourceReferenceIds: [] },
    recent: { summary: "", sourceReferenceIds: [] },
  };
  const timelineRow = object(value.timeline) || {};
  for (const bucket of ["early", "mid", "recent"] as const) {
    const rawBucket = object(timelineRow[bucket]) || {};
    const ids = list(
      rawBucket.sourceReferenceIds ?? rawBucket.source_reference_ids,
    )
      .map((id) => text(id))
      .filter((id) =>
        references.some((reference) => reference.sourceReferenceId === id),
      );
    timeline[bucket] = {
      summary: firstText(rawBucket.summary),
      sourceReferenceIds: [...new Set(ids)],
    };
  }
  const citation: CitationAnalysisArtifact = {
    schema: "citation_analysis_artifact.v1",
    meta: {
      language: firstText(metaRow.language),
      scope: {
        section_title:
          firstText(scopeRow.section_title, scopeRow.sectionTitle) || null,
        line_start:
          typeof strictYear(scopeRow.line_start) === "number"
            ? (strictYear(scopeRow.line_start) as number)
            : null,
        line_end:
          typeof strictYear(scopeRow.line_end) === "number"
            ? (strictYear(scopeRow.line_end) as number)
            : null,
      },
      scope_source:
        firstText(metaRow.scope_source, metaRow.scopeSource) || null,
      scope_decision: {
        selection_reason:
          firstText(
            scopeDecisionRow.selection_reason,
            scopeDecisionRow.selectionReason,
          ) || null,
        covered_sections: list(
          scopeDecisionRow.covered_sections ?? scopeDecisionRow.coveredSections,
        )
          .map(text)
          .filter(Boolean),
        fallback_from: fallbackScopeRow
          ? {
              section_title:
                firstText(
                  fallbackScopeRow.section_title,
                  fallbackScopeRow.sectionTitle,
                ) || null,
              line_start:
                typeof strictYear(fallbackScopeRow.line_start) === "number"
                  ? (strictYear(fallbackScopeRow.line_start) as number)
                  : null,
              line_end:
                typeof strictYear(fallbackScopeRow.line_end) === "number"
                  ? (strictYear(fallbackScopeRow.line_end) as number)
                  : null,
            }
          : null,
        fallback_reason:
          firstText(
            scopeDecisionRow.fallback_reason,
            scopeDecisionRow.fallbackReason,
          ) || null,
      },
      mapping_reliability:
        metaRow.mapping_reliability === "reduced" ? "reduced" : "normal",
      reference_extraction: {
        status:
          metaRow.reference_extraction &&
          object(metaRow.reference_extraction)?.status === "abandoned"
            ? "abandoned"
            : "completed",
        ...(firstText(object(metaRow.reference_extraction)?.reason)
          ? { reason: firstText(object(metaRow.reference_extraction)?.reason) }
          : {}),
      },
    },
    summary: firstText(value.summary, value.report_md),
    timeline,
    items,
    unresolved,
  };
  return { citation, unresolved: unresolved.length, ambiguous, conflicting };
}

function stableCitationBasis(
  citation: CitationAnalysisArtifact | null,
  references: SourceReference[],
) {
  if (!citation) return null;
  const tupleById = new Map(
    references.map((reference) => [
      reference.sourceReferenceId,
      referenceTuple(reference),
    ]),
  );
  return {
    ...citation,
    items: citation.items.map((item) => ({
      ...item,
      sourceReferenceId:
        tupleById.get(item.sourceReferenceId) || item.sourceReferenceId,
    })),
    timeline: Object.fromEntries(
      (["early", "mid", "recent"] as const).map((bucket) => [
        bucket,
        {
          ...citation.timeline[bucket],
          sourceReferenceIds: citation.timeline[bucket].sourceReferenceIds.map(
            (id) => tupleById.get(id) || id,
          ),
        },
      ]),
    ),
  };
}

function classifyConversion(
  input: LegacyArtifactSetInput,
  options: LiteratureArtifactMigrationConverterOptions = {},
): LiteratureArtifactMigrationConversion {
  const idFactory = options.idFactory || generateSourceReferenceId;
  const mentionIdFactory =
    options.mentionIdFactory || ((index) => `mention-${index + 1}`);
  const diagnostics: string[] = [];
  const reasons = new Set<LiteratureArtifactMigrationReasonCode>();
  const values = resolveLegacyValues(input);
  const legacyKinds = new Set(
    (input.legacyNotes || []).flatMap((note) =>
      note.payloads.flatMap((payload) =>
        payload.payloadType === "references-json"
          ? ["references"]
          : payload.payloadType === "citation-analysis-json"
            ? ["citation-analysis"]
            : [],
      ),
    ),
  );
  const canonicalKinds = new Set(
    (input.canonicalNotes || []).map((note) => note.noteKind),
  );
  for (const noteKind of canonicalKinds) {
    if (legacyKinds.has(noteKind)) {
      reasons.add("canonical_conflict");
      diagnostics.push(
        `canonical ${noteKind} note coexists with legacy ${noteKind} evidence`,
      );
    }
  }
  if (input.readErrors?.length) {
    reasons.add("damaged_input");
    diagnostics.push(...input.readErrors);
  }
  const unsupportedPayloadTypes = new Set<string>();
  const recordPayloadType = (value: unknown) => {
    const payloadType = text(value);
    if (
      payloadType &&
      payloadType !== "unknown" &&
      !KNOWN_LEGACY_PAYLOAD_TYPES.has(payloadType)
    ) {
      unsupportedPayloadTypes.add(payloadType);
    }
  };
  for (const note of input.legacyNotes || []) {
    for (const payload of note.payloads) recordPayloadType(payload.payloadType);
    for (const payloadType of payloadMarkerTypes(note.html)) {
      recordPayloadType(payloadType);
    }
  }
  for (const content of [...(input.noteContents || []), input.noteContent]) {
    if (typeof content === "string") {
      for (const payloadType of payloadMarkerTypes(content)) {
        recordPayloadType(payloadType);
      }
    }
  }
  for (const payload of [
    ...(input.filePayloads || []),
    input.filePayload,
    input.legacyPayload,
  ]) {
    recordPayloadType(object(payload)?.payloadType);
  }
  if (unsupportedPayloadTypes.size) {
    reasons.add("unsupported_input");
    diagnostics.push(
      ...[...unsupportedPayloadTypes]
        .sort()
        .map(
          (payloadType) => `unsupported legacy payload type: ${payloadType}`,
        ),
    );
  }
  const originalReferenceCount = values.references.length;
  const citationValue = values.citation;
  const existing = (input.existingReferences || []).filter(
    (reference) => !!reference?.sourceReferenceId,
  );
  const citationHasExistingBasis =
    options.allowCitationOnlyWithExistingReferences === true &&
    existing.length > 0;
  const originalMentionCount = citationValue
    ? list(citationValue.mentions ?? citationValue.unmapped_mentions).length +
      list(citationValue.items).reduce(
        (count: number, item: unknown) =>
          count + list(object(item)?.mentions).length,
        0,
      )
    : 0;
  if (input.readOnly === true || input.writable === false)
    reasons.add("read_only_library");
  if (!originalReferenceCount && citationValue && !citationHasExistingBasis)
    reasons.add("citation_only");
  if (!originalReferenceCount && !citationValue) reasons.add("no_references");
  const references: SourceReference[] = [];
  const duplicateKeys = new Set<string>();
  const issueItems: LiteratureArtifactMigrationConversion["issueItems"] = {};
  const recordIssueItem = (
    reasonCode: string,
    item: { label: string; hint?: string },
  ) => {
    (issueItems[reasonCode] ||= []).push(item);
  };
  let droppedCount = 0;
  for (const [referenceIndex, value] of values.references.entries()) {
    const reference = makeSourceReference(value, idFactory, diagnostics);
    if (!reference) {
      droppedCount += 1;
      const row = object(value);
      const droppedTitle = row
        ? firstText(object(row.bibliography)?.title, row.title)
        : "";
      recordIssueItem("data_loss", {
        label: `#${referenceIndex + 1} ${droppedTitle || "untitled"}`,
      });
      continue;
    }
    const identityKeys = [
      ...matchingKeys(reference),
      `tuple:${referenceTuple(reference)}`,
    ];
    if (identityKeys.some((key) => duplicateKeys.has(key))) {
      reasons.add("duplicate_reference");
      diagnostics.push("duplicate reference evidence");
      recordIssueItem("duplicate_reference", {
        label: reference.bibliography.title,
      });
    }
    identityKeys.forEach((key) => duplicateKeys.add(key));
    references.push(reference);
  }
  if (droppedCount) reasons.add("data_loss");
  const snapshots = citationValue
    ? list(citationValue.snapshots ?? citationValue.reference_snapshots)
    : [];
  let recoveredCount = 0;
  for (const snapshot of snapshots) {
    const matched = matchReference(snapshot, [...references, ...existing]);
    if (matched.conflicting) {
      reasons.add("conflicting_evidence");
      continue;
    }
    if (matched.ambiguous) {
      reasons.add("ambiguous_linkage");
      reasons.add("unresolved_linkage");
      continue;
    }
    if (matched.reference) continue;
    const recovered = makeSourceReference(snapshot, idFactory, diagnostics);
    if (!recovered) {
      reasons.add("unresolved_linkage");
      continue;
    }
    references.push(recovered);
    recoveredCount += 1;
    reasons.add("citation_snapshot_recovery");
    recordIssueItem("citation_snapshot_recovery", {
      label: recovered.bibliography.title,
    });
  }
  const citationResult = citationValue
    ? normalizeCitation(
        citationValue,
        [...references, ...existing],
        diagnostics,
        mentionIdFactory,
      )
    : null;
  if (citationResult?.ambiguous) reasons.add("ambiguous_linkage");
  if (citationResult?.conflicting) reasons.add("conflicting_evidence");
  if ((citationResult?.unresolved || 0) > 0) reasons.add("unresolved_linkage");
  if (citationValue && !references.length && !citationHasExistingBasis)
    reasons.add("citation_only");
  if (
    reasons.has("citation_only") &&
    originalReferenceCount === 0 &&
    !citationHasExistingBasis
  ) {
    // A library Citation-only set is always blocked, even if its snapshot
    // could otherwise be recovered. Offline import passes a canonical parent
    // through a different adapter and may choose review_required explicitly.
    reasons.add("unsupported_input");
  }
  if (droppedCount && !reasons.has("data_loss")) reasons.add("data_loss");
  const basisInput = {
    sourceFacts: legacySourceFacts(input),
    canonicalSourceFacts: canonicalSourceFacts(input),
    references: references.map((reference) => ({
      extraction: reference.extraction,
      bibliography: reference.bibliography,
      matching: reference.matching,
    })),
    citation: stableCitationBasis(citationResult?.citation || null, [
      ...references,
      ...existing,
    ]),
  };
  const basisHash = hashText(stableJson(basisInput));
  let referencesArtifact: SourceReferenceArtifact = {
    schema: "source_reference_artifact.v1",
    references,
  };
  try {
    referencesArtifact = parseSourceReferenceArtifact(referencesArtifact);
  } catch {
    reasons.add("invalid_canonical_artifact");
    diagnostics.push(
      "converted References artifact failed contract validation",
    );
  }
  let citationArtifact = citationResult?.citation || null;
  if (citationArtifact) {
    try {
      citationArtifact = parseCitationAnalysisArtifact(citationArtifact);
    } catch {
      reasons.add("invalid_canonical_artifact");
      diagnostics.push(
        "converted Citation artifact failed contract validation",
      );
    }
  }
  const classification = classificationForReasons(reasons);
  return {
    classification,
    reasonCodes: [...reasons],
    diagnostics: boundedDiagnostics(diagnostics),
    references: referencesArtifact,
    citation: citationArtifact,
    basisHash,
    verifiedCount: references.length,
    unresolvedCount: citationResult?.unresolved || 0,
    recoveredCount,
    droppedCount,
    originalReferenceCount,
    originalMentionCount,
    issueItems,
  };
}

export function convertLegacyArtifactSet(
  input: LegacyArtifactSetInput,
  options: LiteratureArtifactMigrationConverterOptions = {},
): LiteratureArtifactMigrationConversion {
  return classifyConversion(input, options);
}

export function resolveLiteratureArtifactMigrationConversion(
  conversion: LiteratureArtifactMigrationConversion,
  resolutions: ReadonlyArray<{
    reasonCode: LiteratureArtifactMigrationReasonCode;
    kind: LiteratureArtifactMigrationResolutionKind;
  }>,
): LiteratureArtifactMigrationConversion {
  const reasons = new Set(conversion.reasonCodes);
  let references = conversion.references.references;
  let citation = conversion.citation;
  let droppedCount = conversion.droppedCount;

  for (const resolution of resolutions) {
    if (!reasons.has(resolution.reasonCode)) continue;
    if (
      resolution.kind === "merge_duplicates" &&
      resolution.reasonCode === "duplicate_reference"
    ) {
      const retainedByKey = new Map<string, string>();
      const replacementById = new Map<string, string>();
      const unique: SourceReference[] = [];
      for (const reference of references) {
        const keys = [
          ...matchingKeys(reference),
          `tuple:${referenceTuple(reference)}`,
        ];
        const retainedId = keys
          .map((key) => retainedByKey.get(key))
          .find(Boolean);
        if (retainedId) {
          replacementById.set(reference.sourceReferenceId, retainedId);
          for (const key of keys) retainedByKey.set(key, retainedId);
          continue;
        }
        unique.push(reference);
        for (const key of keys)
          retainedByKey.set(key, reference.sourceReferenceId);
      }
      references = unique;
      if (citation && replacementById.size) {
        const replace = (id: string) => replacementById.get(id) || id;
        citation = parseCitationAnalysisArtifact({
          ...citation,
          items: citation.items.map((item) => ({
            ...item,
            sourceReferenceId: replace(item.sourceReferenceId),
          })),
          timeline: {
            early: {
              ...citation.timeline.early,
              sourceReferenceIds: [
                ...new Set(
                  citation.timeline.early.sourceReferenceIds.map(replace),
                ),
              ],
            },
            mid: {
              ...citation.timeline.mid,
              sourceReferenceIds: [
                ...new Set(
                  citation.timeline.mid.sourceReferenceIds.map(replace),
                ),
              ],
            },
            recent: {
              ...citation.timeline.recent,
              sourceReferenceIds: [
                ...new Set(
                  citation.timeline.recent.sourceReferenceIds.map(replace),
                ),
              ],
            },
          },
        });
      }
      reasons.delete("duplicate_reference");
    } else if (
      (resolution.kind === "keep_unresolved" ||
        resolution.kind === "drop_unresolved") &&
      (resolution.reasonCode === "unresolved_linkage" ||
        resolution.reasonCode === "ambiguous_linkage")
    ) {
      if (resolution.kind === "drop_unresolved" && citation) {
        droppedCount += citation.unresolved.length;
        citation = parseCitationAnalysisArtifact({
          ...citation,
          unresolved: [],
        });
      }
      reasons.delete("unresolved_linkage");
      reasons.delete("ambiguous_linkage");
    } else if (
      resolution.kind === "accept_recovery" &&
      resolution.reasonCode === "citation_snapshot_recovery"
    ) {
      reasons.delete("citation_snapshot_recovery");
    } else if (
      resolution.kind === "replace_canonical" &&
      resolution.reasonCode === "canonical_conflict"
    ) {
      reasons.delete("canonical_conflict");
    } else if (
      resolution.kind === "preserve_source" &&
      resolution.reasonCode === "unsupported_input"
    ) {
      reasons.delete(resolution.reasonCode);
    } else if (
      resolution.kind === "accept_data_loss" &&
      resolution.reasonCode === "data_loss"
    ) {
      reasons.delete("data_loss");
    }
  }

  const referencesArtifact = parseSourceReferenceArtifact({
    schema: "source_reference_artifact.v1",
    references,
  });
  return {
    ...conversion,
    classification: classificationForReasons(reasons),
    reasonCodes: [...reasons],
    diagnostics: boundedDiagnostics([
      ...conversion.diagnostics,
      ...resolutions
        .filter((resolution) => resolution.kind !== "skip_candidate")
        .map(
          (resolution) =>
            `resolved:${resolution.reasonCode}:${resolution.kind}`,
        ),
    ]),
    references: referencesArtifact,
    citation,
    verifiedCount: referencesArtifact.references.length,
    unresolvedCount: citation?.unresolved.length || 0,
    droppedCount,
  };
}
