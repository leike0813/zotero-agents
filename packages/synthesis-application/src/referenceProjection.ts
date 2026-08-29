import type { SynthesisHostLibraryItemSummary } from "../../synthesis-contracts/src/hostRead.js";
import {
  hashSynthesisEngineCanonicalJson,
  sha256SynthesisEngineText,
} from "../../synthesis-engine/src/canonicalJson.js";
import { normalizeSynthesisLiteratureTitle } from "../../synthesis-engine/src/referenceMatcher.js";
import type {
  SynthesisCanonicalReferenceRecord,
  SynthesisRawReferenceRecord,
  SynthesisReferenceBindingRecord,
} from "../../synthesis-repository/src/referenceRefresh.js";

const DOI_PATTERN = /^(?:doi:\s*)?10\.\d{4,9}\/\S+$/i;
const DOI_URL_PATTERN =
  /^(?:https?:\/\/)?(?:dx\.)?doi\.org\/10\.\d{4,9}\/\S+$/i;
const URL_PATTERN = /^(?:https?:\/\/|\/\/)\S+$/i;
const ARXIV_PATTERN = /^(?:arxiv:\s*)?\d{4}\.\d{4,5}(?:v\d+)?$/i;
const BIBLIOGRAPHIC_MARKER_PATTERN =
  /\b(?:arxiv preprint|preprint|in proceedings|proceedings of|conference on|journal of|transactions on|vol\.?|volume|no\.?|issue|pp\.?|pages?|publisher|press|springer|ieee|acm|pmlr)\b/i;
const AUTHOR_CONNECTOR_PATTERN = /\b(?:and|et\s+al)\b|,/i;
const AUTHOR_TOKEN_PATTERN =
  /^(?:[A-Z]\.?|[A-Z][a-z]+(?:[-'][A-Z][a-z]+)?|[A-Z][a-z]*\.)$/;
const PLACEHOLDER_TITLE_PATTERN =
  /^(?:n\/?a|none|null|undefined|unknown|untitled|not\s+available)$/i;
const METADATA_ONLY_PATTERN =
  /^(?:[A-Za-z][A-Za-z&.\-/ ]{1,80}\s+)?(?:vol\.?\s*)?\d{1,4}(?:\s*\(\s*\d+\s*\))?(?:\s*,?\s*(?:no\.?|issue|pp\.?|pages?)?\s*\d{1,6}(?:\s*[-–]\s*\d{1,6})?)+\.?$/i;

export type SynthesisReferenceExtractionQuality = {
  disposition: "accept" | "reject";
  rejectReasons: string[];
  warningReasons: string[];
  title: string;
};

const clean = (value: unknown) =>
  String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();
const isObject = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value);
const stringArray = (value: unknown) =>
  (Array.isArray(value) ? value : clean(value) ? [value] : [])
    .map(clean)
    .filter(Boolean);

export function synthesisReferenceTitle(reference: Record<string, unknown>) {
  return clean(
    reference.title ??
      reference.parsed_title ??
      reference.parsedTitle ??
      reference.paper_title,
  );
}

export function synthesisReferenceRaw(reference: Record<string, unknown>) {
  return clean(reference.raw ?? reference.raw_reference ?? reference.reference);
}

export function synthesisReferenceYear(reference: Record<string, unknown>) {
  return (
    clean(reference.year) ||
    synthesisReferenceRaw(reference).match(/\b(?:19|20)\d{2}\b/)?.[0] ||
    ""
  );
}

export function synthesisReferenceAuthors(reference: Record<string, unknown>) {
  return stringArray(reference.authors ?? reference.author);
}

export function synthesisReferenceCitekey(reference: Record<string, unknown>) {
  return clean(
    reference.citekey ?? reference.citeKey ?? reference.citationKey,
  ).toLowerCase();
}

function contentTokens(value: unknown) {
  const stop = new Set([
    "a",
    "an",
    "and",
    "for",
    "in",
    "of",
    "on",
    "the",
    "to",
    "with",
    "vol",
    "volume",
    "no",
    "issue",
    "pp",
    "pages",
    "proceedings",
    "conference",
    "journal",
    "preprint",
    "arxiv",
    "doi",
  ]);
  return normalizeSynthesisLiteratureTitle(value)
    .split(/\s+/)
    .filter(
      (token) => token.length > 1 && !/^\d+$/.test(token) && !stop.has(token),
    );
}

function isMetadataOnlyTitle(title: string) {
  if (/^(?:in\s+)?proceedings\b/i.test(title)) return true;
  if (METADATA_ONLY_PATTERN.test(title)) return true;
  return (
    BIBLIOGRAPHIC_MARKER_PATTERN.test(title) &&
    contentTokens(title).length <= 1 &&
    /\d/.test(title)
  );
}

function isAuthorOnlyTitle(title: string) {
  if (!AUTHOR_CONNECTOR_PATTERN.test(title) || /[:?]/.test(title)) return false;
  const tokens = title
    .replace(/[.,;()]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
  if (tokens.length < 2 || tokens.length > 18) return false;
  return (
    tokens.filter((token) => AUTHOR_TOKEN_PATTERN.test(token)).length /
      tokens.length >=
    0.75
  );
}

function hasPossibleAuthorPrefixNoise(title: string) {
  const firstSentence = title.split(/\.\s+/)[0] ?? "";
  return (
    firstSentence.length > 20 &&
    AUTHOR_CONNECTOR_PATTERN.test(firstSentence) &&
    isAuthorOnlyTitle(firstSentence)
  );
}

export function classifySynthesisReferenceQuality(
  reference: Record<string, unknown>,
  options: { longTitleThreshold?: number } = {},
): SynthesisReferenceExtractionQuality {
  const title = synthesisReferenceTitle(reference);
  const warningReasons: string[] = [];
  const rejectReasons: string[] = [];
  const compactTitle = title.replace(/[.,;]+$/g, "");
  if (!title) rejectReasons.push("empty_title");
  else if (PLACEHOLDER_TITLE_PATTERN.test(title))
    rejectReasons.push("placeholder_title");
  else if (
    DOI_PATTERN.test(compactTitle) ||
    DOI_URL_PATTERN.test(compactTitle) ||
    URL_PATTERN.test(compactTitle) ||
    ARXIV_PATTERN.test(compactTitle)
  )
    rejectReasons.push("bare_identifier_or_url_title");
  else if (isMetadataOnlyTitle(title))
    rejectReasons.push("publication_metadata_only_title");
  else if (isAuthorOnlyTitle(title)) rejectReasons.push("author_only_title");
  else if (!contentTokens(title).length)
    rejectReasons.push("no_usable_title_tokens");
  if (!rejectReasons.length) {
    if (
      BIBLIOGRAPHIC_MARKER_PATTERN.test(title) &&
      contentTokens(title).length >= 2
    ) {
      warningReasons.push("bibliographic_suffix_in_title");
    }
    if (hasPossibleAuthorPrefixNoise(title)) {
      warningReasons.push("possible_author_prefix_noise");
    }
    if (title.length > (options.longTitleThreshold ?? 180))
      warningReasons.push("very_long_title");
    if (contentTokens(title).length < 2)
      warningReasons.push("short_title_requires_context");
    if (!synthesisReferenceYear(reference)) warningReasons.push("missing_year");
    if (!synthesisReferenceAuthors(reference).length)
      warningReasons.push("missing_authors");
  }
  return {
    disposition: rejectReasons.length ? "reject" : "accept",
    rejectReasons,
    warningReasons,
    title,
  };
}

const allowedRoles = new Set([
  "background",
  "baseline",
  "contrast",
  "component",
  "dataset",
  "tooling",
  "historical",
]);

export function normalizeSynthesisReferenceRole(value: unknown) {
  const role = clean(value).toLowerCase().replace(/\s+/g, "_");
  return allowedRoles.has(role) ? role : "unknown";
}

function roleEntries(values: unknown[]) {
  const counts = new Map<string, number>();
  for (const value of values.length ? values : ["unknown"]) {
    const role = normalizeSynthesisReferenceRole(value);
    counts.set(role, (counts.get(role) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([role, count]) => ({ role, count }))
    .sort((left, right) => left.role.localeCompare(right.role));
}

function referenceEntries(payload: unknown) {
  if (Array.isArray(payload)) return payload.filter(isObject);
  if (!isObject(payload)) return [];
  const entries =
    payload.references ?? payload.reference_entries ?? payload.items;
  return Array.isArray(entries) ? entries.filter(isObject) : [];
}

function citationEntries(payload: unknown) {
  if (!isObject(payload)) return [];
  const nested = isObject(payload.citation_analysis)
    ? payload.citation_analysis
    : isObject(payload.citationAnalysis)
      ? payload.citationAnalysis
      : payload;
  const entries = nested.items ?? nested.citations;
  return Array.isArray(entries) ? entries.filter(isObject) : [];
}

function rolesByReference(payload: unknown) {
  const byIndex = new Map<number, unknown[]>();
  for (const entry of citationEntries(payload)) {
    const index = Number(
      entry.ref_index ?? entry.reference_index ?? entry.index,
    );
    if (!Number.isInteger(index) || index < 0) continue;
    const values = [
      entry.function,
      entry.role,
      ...(Array.isArray(entry.roles) ? entry.roles : []),
    ].filter((value) => clean(value));
    byIndex.set(index, [...(byIndex.get(index) ?? []), ...values]);
  }
  return byIndex;
}

function shortHash(value: unknown) {
  return hashSynthesisEngineCanonicalJson(value).slice(7, 31);
}

export function synthesisReferenceIdentity(reference: Record<string, unknown>) {
  const title = synthesisReferenceTitle(reference);
  return {
    citekey: synthesisReferenceCitekey(reference),
    title,
    normalizedTitle: normalizeSynthesisLiteratureTitle(title),
    year: synthesisReferenceYear(reference),
    authors: synthesisReferenceAuthors(reference),
    raw: synthesisReferenceRaw(reference),
  };
}

export function buildSynthesisCanonicalReferenceRecord(
  reference: Record<string, unknown>,
  timestamp: string,
): SynthesisCanonicalReferenceRecord {
  const identity = synthesisReferenceIdentity(reference);
  const metadataHash = hashSynthesisEngineCanonicalJson({
    citekey: identity.citekey,
    normalized_title: identity.normalizedTitle,
    year: identity.year,
    authors: identity.authors,
  });
  return {
    canonicalReferenceId: `cref:${metadataHash.slice(7, 31)}`,
    title: identity.title,
    normalizedTitle: identity.normalizedTitle,
    year: identity.year,
    authorsJson: JSON.stringify(identity.authors),
    identifiersJson: JSON.stringify({
      ...(identity.citekey ? { citekey: identity.citekey } : {}),
    }),
    metadataHash,
    status: "active",
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

function itemIndexes(items: SynthesisHostLibraryItemSummary[]) {
  const byCitekey = new Map<string, SynthesisHostLibraryItemSummary>();
  const byTitleYear = new Map<string, SynthesisHostLibraryItemSummary>();
  for (const item of items) {
    if (item.citekey) byCitekey.set(item.citekey.toLowerCase(), item);
    const title = normalizeSynthesisLiteratureTitle(item.title);
    if (title && item.year) byTitleYear.set(`${title}\n${item.year}`, item);
  }
  return { byCitekey, byTitleYear };
}

export function projectSynthesisReferencePayloads(args: {
  items: SynthesisHostLibraryItemSummary[];
  sources: Array<{
    paperRef: string;
    referencesArtifactHash: string;
    referencesPayload?: unknown;
    citationAnalysisPayload?: unknown;
  }>;
  timestamp: string;
}) {
  const canonicals = new Map<string, SynthesisCanonicalReferenceRecord>();
  const bindings = new Map<string, SynthesisReferenceBindingRecord>();
  const rawReferences: SynthesisRawReferenceRecord[] = [];
  const indexes = itemIndexes(args.items);
  for (const source of args.sources) {
    const roles = rolesByReference(source.citationAnalysisPayload);
    for (const [index, reference] of referenceEntries(
      source.referencesPayload,
    ).entries()) {
      const quality = classifySynthesisReferenceQuality(reference);
      if (quality.disposition === "reject") continue;
      const identity = synthesisReferenceIdentity(reference);
      const { title, normalizedTitle, year, authors, citekey } = identity;
      const rawReference = identity.raw;
      const canonical = buildSynthesisCanonicalReferenceRecord(
        reference,
        args.timestamp,
      );
      const canonicalReferenceId = canonical.canonicalReferenceId;
      canonicals.set(canonicalReferenceId, canonical);
      const rawHash = rawReference
        ? sha256SynthesisEngineText(rawReference)
        : hashSynthesisEngineCanonicalJson({
            title,
            normalizedTitle,
            year,
            authors,
            citekey,
          });
      rawReferences.push({
        rawReferenceId: `rawref:${shortHash({
          source: source.paperRef,
          artifact: source.referencesArtifactHash,
          index,
          rawHash,
        })}`,
        sourceRef: source.paperRef,
        referencesArtifactHash: source.referencesArtifactHash,
        referenceIndex: index,
        rawHash,
        parsedTitle: title,
        normalizedTitle,
        year,
        authorsJson: JSON.stringify(authors),
        rawReference,
        canonicalReferenceId,
        status: "active",
        rolesJson: JSON.stringify(roleEntries(roles.get(index) ?? [])),
        diagnosticsJson: JSON.stringify(
          quality.warningReasons.map((code) => ({
            code,
            source: "reference_quality_gate",
            severity: "warning",
          })),
        ),
        createdAt: args.timestamp,
        updatedAt: args.timestamp,
      });
      const matched =
        (citekey ? indexes.byCitekey.get(citekey) : undefined) ??
        (normalizedTitle && year
          ? indexes.byTitleYear.get(`${normalizedTitle}\n${year}`)
          : undefined);
      if (matched) {
        const basis = citekey
          ? { kind: "citekey", citekey, item: matched.paperRef }
          : { kind: "title_year", title: normalizedTitle, year };
        const bindingId = `binding:${shortHash({
          canonicalReferenceId,
          libraryId: matched.libraryId,
          itemKey: matched.itemKey,
        })}`;
        bindings.set(bindingId, {
          bindingId,
          canonicalReferenceId,
          libraryId: matched.libraryId,
          itemKey: matched.itemKey,
          status: "accepted",
          confidence: "deterministic",
          reviewer: "reference-refresh-application",
          basisHash: hashSynthesisEngineCanonicalJson(basis),
          diagnosticsJson: "[]",
          createdAt: args.timestamp,
          updatedAt: args.timestamp,
        });
      }
    }
  }
  rawReferences.sort(
    (left, right) =>
      left.sourceRef.localeCompare(right.sourceRef) ||
      left.referenceIndex - right.referenceIndex ||
      left.rawReferenceId.localeCompare(right.rawReferenceId),
  );
  return {
    rawReferences,
    canonicals: [...canonicals.values()].sort((left, right) =>
      left.canonicalReferenceId.localeCompare(right.canonicalReferenceId),
    ),
    bindings: [...bindings.values()].sort((left, right) =>
      left.bindingId.localeCompare(right.bindingId),
    ),
  };
}

export function hashSynthesisReferenceProjection(args: {
  sources: Array<{ paperRef: string; metadataHash: string }>;
  artifacts: Array<{
    paperRef: string;
    artifactType: string;
    status: string;
    payloadHash: string;
    locator: string;
  }>;
  rawReferences: SynthesisRawReferenceRecord[];
  bindings: SynthesisReferenceBindingRecord[];
}) {
  return hashSynthesisEngineCanonicalJson({
    sources: [...args.sources]
      .sort((left, right) => left.paperRef.localeCompare(right.paperRef))
      .map((row) => [row.paperRef, row.metadataHash]),
    artifacts: [...args.artifacts]
      .sort(
        (left, right) =>
          left.paperRef.localeCompare(right.paperRef) ||
          left.artifactType.localeCompare(right.artifactType),
      )
      .map((row) => [
        row.paperRef,
        row.artifactType,
        row.status,
        row.payloadHash,
        row.locator,
      ]),
    references: [...args.rawReferences]
      .sort((left, right) =>
        left.rawReferenceId.localeCompare(right.rawReferenceId),
      )
      .map((row) => [
        row.rawReferenceId,
        row.sourceRef,
        row.rawHash,
        row.canonicalReferenceId,
        row.rolesJson,
      ]),
    bindings: [...args.bindings]
      .sort((left, right) => left.bindingId.localeCompare(right.bindingId))
      .map((row) => [
        row.bindingId,
        row.canonicalReferenceId,
        row.libraryId,
        row.itemKey,
        row.status,
      ]),
  });
}

export function synthesisReferenceGraphFacts(
  rows: SynthesisRawReferenceRecord[],
) {
  return rows
    .map((row) => [
      row.sourceRef,
      row.canonicalReferenceId,
      row.status,
      row.rolesJson,
    ])
    .sort((left, right) =>
      JSON.stringify(left).localeCompare(JSON.stringify(right)),
    );
}
