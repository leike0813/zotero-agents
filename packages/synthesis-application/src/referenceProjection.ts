import type { SynthesisHostLibraryItemSummary } from "../../synthesis-contracts/src/hostRead.js";
import {
  parseCitationAnalysisArtifact,
  parseSourceReferenceArtifact,
  validateCitationAgainstReferences,
} from "../../synthesis-contracts/src/sourceReferenceArtifact.js";
import type {
  CitationAnalysisArtifact,
  CitationFunction,
  CitationItem,
  CitationMention,
  SourceReference,
  SourceReferenceArtifact,
} from "../../synthesis-contracts/src/sourceReferenceArtifact.js";
import {
  hashSynthesisEngineCanonicalJson,
  sha256SynthesisEngineText,
} from "../../synthesis-engine/src/canonicalJson.js";
import { hashSynthesisContractCanonicalJson } from "../../synthesis-contracts/src/canonicalJson.js";
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
export function synthesisReferenceTitle(reference: SourceReference) {
  return clean(reference.bibliography.title);
}

export function synthesisReferenceRaw(reference: SourceReference) {
  return clean(reference.extraction?.raw);
}

export function synthesisReferenceYear(reference: SourceReference) {
  const year = reference.bibliography.year;
  return typeof year === "number" && Number.isInteger(year) ? String(year) : "";
}

export function synthesisReferenceAuthors(reference: SourceReference) {
  return reference.bibliography.authors.map(clean).filter(Boolean);
}

export function synthesisReferenceCitekey(reference: SourceReference) {
  return clean(reference.matching.citekey).toLowerCase();
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
  reference: SourceReference,
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
  "uncategorized",
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

function citationEntries(payload: unknown) {
  return payload == null ? [] : parseCitationAnalysisArtifact(payload).items;
}

function rolesByReference(payload: unknown) {
  const bySourceReferenceId = new Map<string, unknown[]>();
  for (const entry of citationEntries(payload)) {
    const values = [entry.function].filter((value) => clean(value));
    if (!values.length) continue;
    bySourceReferenceId.set(entry.sourceReferenceId, [
      ...(bySourceReferenceId.get(entry.sourceReferenceId) ?? []),
      ...values,
    ]);
  }
  return bySourceReferenceId;
}

const citationFunctionLabels: Record<CitationFunction, string> = {
  background: "Background",
  baseline: "Baseline",
  contrast: "Contrast",
  component: "Component",
  dataset: "Dataset",
  tooling: "Tooling",
  historical: "Historical",
  uncategorized: "Uncategorized",
};

type CitationReportItem = {
  sourceReferenceId: string;
  citationLabel: string;
  authorYearLabel: string;
  title: string;
  keywords: string[];
  summary: string;
  function: CitationFunction;
  functionLabel: string;
};

type CitationReportLocale = {
  title: string;
  summary: string;
  keyReferences: string;
  scope: string;
  section: string;
  lines: string;
  byFunction: string;
  itemTitle: string;
  keywords: string;
  itemSummary: string;
  timeline: string;
  noMappedCitations: string;
  noRepresentativeReferences: string;
  unmappedMentions: string;
  early: string;
  mid: string;
  recent: string;
};

const englishCitationReportLocale: CitationReportLocale = {
  title: "## Citation Signals In Review Scope",
  summary: "### Summary",
  keyReferences: "### Key References",
  scope: "### Scope",
  section: "Section",
  lines: "Lines",
  byFunction: "### By Function",
  itemTitle: "Title",
  keywords: "Keywords",
  itemSummary: "Summary",
  timeline: "### Timeline Analysis",
  noMappedCitations: "- No stable mapped citations in this scope.",
  noRepresentativeReferences: "- No representative references in this bucket.",
  unmappedMentions: "### Unmapped Mentions",
  early: "Early",
  mid: "Mid",
  recent: "Recent",
};

const chineseCitationReportLocale: CitationReportLocale = {
  title: "## 文献综述章节引文线索",
  summary: "### 总体总结",
  keyReferences: "### 关键文献",
  scope: "### 范围",
  section: "章节",
  lines: "行号",
  byFunction: "### 按功能归类",
  itemTitle: "标题",
  keywords: "关键词",
  itemSummary: "总结",
  timeline: "### 时间线分析",
  noMappedCitations: "- 本范围内未检测到稳定映射的引用。",
  noRepresentativeReferences: "- 该时段没有可列举的代表文献。",
  unmappedMentions: "### 未映射引用",
  early: "早期",
  mid: "中期",
  recent: "近期",
};

function reportText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function reportCitationLabel(value: unknown) {
  const label = reportText(value);
  if (
    !label ||
    label.toLowerCase() === "none" ||
    label.toLowerCase() === "null"
  ) {
    return "";
  }
  return label.startsWith("[") ? label : `[${label}]`;
}

function firstMentionWithNumber(item: CitationItem) {
  return item.mentions.find(
    (mention) =>
      Number.isInteger(mention.ref_number_hint) &&
      mention.ref_number_hint != null,
  );
}

function citationItemLabel(item: CitationItem, authorYearOrdinal: number) {
  const explicit = item.mentions
    .map((mention) => reportCitationLabel(mention.citation_label_hint))
    .find(Boolean);
  if (explicit) return explicit;
  const numbered = firstMentionWithNumber(item)?.ref_number_hint;
  if (numbered != null) return `[${numbered}]`;
  return `[AY-${authorYearOrdinal}]`;
}

function sourceAuthorYearLabel(reference: SourceReference) {
  const author = reportText(reference.bibliography.authors[0]);
  const year = reference.bibliography.year;
  if (author && year != null) return `${author}, ${year}`;
  return reportText(reference.bibliography.title) || "[unlabeled]";
}

function reportItemFromCitation(
  item: CitationItem,
  reference: SourceReference,
  citationLabel: string,
): CitationReportItem {
  const functionValue = item.function ?? "uncategorized";
  return {
    sourceReferenceId: item.sourceReferenceId,
    citationLabel,
    authorYearLabel: sourceAuthorYearLabel(reference),
    title: reportText(reference.bibliography.title),
    keywords: item.keywords.map(reportText).filter(Boolean),
    summary: reportText(item.summary),
    function: functionValue,
    functionLabel: citationFunctionLabels[functionValue],
  };
}

function reportItemLine(item: CitationReportItem, includeFunction = false) {
  const title = item.title ? `: ${item.title}` : "";
  const functionLabel = includeFunction ? ` (${item.functionLabel})` : "";
  return `- ${item.citationLabel} ${item.authorYearLabel}${title}${functionLabel}`;
}

function reportMentionLine(
  mention: CitationMention & { reason?: string | null },
) {
  const marker = reportText(mention.marker) || "[unmapped]";
  const reason = reportText(mention.reason);
  const snippet = reportText(mention.snippet);
  return `- ${marker}${reason ? ` (${reason})` : ""}${snippet ? `: ${snippet}` : ""}`;
}

/**
 * Render the derived Citation Markdown projection from the same canonical
 * Source Reference/Citation artifacts used by Synthesis and bundle export.
 * `report_md` is intentionally not accepted or read here.
 */
export function renderCitationAnalysisMarkdown(args: {
  citation: CitationAnalysisArtifact | unknown;
  references: SourceReferenceArtifact | unknown;
}): string {
  const references = parseSourceReferenceArtifact(args.references);
  const citation = parseCitationAnalysisArtifact(args.citation);
  const linkage = validateCitationAgainstReferences(citation, references);
  if (!linkage.ok) throw new Error("citation_source_reference_linkage_invalid");

  const referenceById = new Map(
    references.references.map((reference) => [
      reference.sourceReferenceId,
      reference,
    ]),
  );
  let authorYearOrdinal = 0;
  const reportItems = citation.items.map((item) => {
    const reference = referenceById.get(item.sourceReferenceId);
    if (!reference)
      throw new Error("citation_source_reference_linkage_invalid");
    const explicit = item.mentions.some(
      (mention) =>
        Boolean(reportCitationLabel(mention.citation_label_hint)) ||
        mention.ref_number_hint != null,
    );
    if (!explicit) authorYearOrdinal += 1;
    return reportItemFromCitation(
      item,
      reference,
      citationItemLabel(item, explicit ? 0 : authorYearOrdinal),
    );
  });
  const reportById = new Map(
    reportItems.map((item) => [item.sourceReferenceId, item]),
  );
  const locale = citation.meta.language.toLowerCase().startsWith("zh")
    ? chineseCitationReportLocale
    : englishCitationReportLocale;
  const lines: string[] = [
    locale.title,
    "",
    locale.summary,
    reportText(citation.summary),
    "",
  ];
  const keyReferences = citation.items
    .map((item) => reportById.get(item.sourceReferenceId))
    .filter((item): item is CitationReportItem => Boolean(item))
    .filter((item, index) =>
      Boolean(reportText(citation.items[index]?.key_reference_reason)),
    );
  if (keyReferences.length) {
    lines.push(locale.keyReferences);
    for (const item of keyReferences) lines.push(reportItemLine(item, true));
    lines.push("");
  }

  const scope = citation.meta.scope;
  lines.push(
    locale.scope,
    `- ${locale.section}: ${reportText(scope.section_title)}`,
    `- ${locale.lines}: ${scope.line_start ?? ""}-${scope.line_end ?? ""}`,
    "",
    locale.byFunction,
  );
  const groups = new Map<CitationFunction, CitationReportItem[]>();
  for (const item of reportItems) {
    const group = groups.get(item.function) ?? [];
    group.push(item);
    groups.set(item.function, group);
  }
  if (!reportItems.length) {
    lines.push(locale.noMappedCitations);
  } else {
    for (const [functionValue, items] of groups) {
      lines.push(`#### ${citationFunctionLabels[functionValue]}`);
      for (const item of items) {
        lines.push(
          reportItemLine(item),
          `  - ${locale.itemTitle}: ${item.title || "[missing]"}`,
          `  - ${locale.keywords}: ${item.keywords.length ? item.keywords.join(", ") : "[none]"}`,
          `  - ${locale.itemSummary}: ${item.summary}`,
        );
      }
      lines.push("");
    }
  }

  lines.push(locale.timeline);
  const timelineLabels = {
    early: locale.early,
    mid: locale.mid,
    recent: locale.recent,
  } as const;
  for (const bucketName of ["early", "mid", "recent"] as const) {
    const bucket = citation.timeline[bucketName];
    lines.push(
      `#### ${timelineLabels[bucketName]}`,
      reportText(bucket.summary),
    );
    const timelineItems = bucket.sourceReferenceIds.map((id) => {
      const existing = reportById.get(id);
      if (existing) return existing;
      const reference = referenceById.get(id);
      if (!reference) return null;
      return reportItemFromCitation(
        {
          sourceReferenceId: id,
          function: null,
          role_in_context: null,
          topic: null,
          usage: null,
          keywords: [],
          summary: null,
          key_reference_reason: null,
          confidence: null,
          mentions: [],
        },
        reference,
        `[${references.references.findIndex((entry) => entry.sourceReferenceId === id) + 1}]`,
      );
    });
    if (timelineItems.filter(Boolean).length) {
      for (const item of timelineItems)
        if (item) lines.push(reportItemLine(item));
    } else {
      lines.push(locale.noRepresentativeReferences);
    }
    lines.push("");
  }

  if (citation.unresolved.length) {
    lines.push(locale.unmappedMentions);
    for (const mention of citation.unresolved)
      lines.push(reportMentionLine(mention));
    lines.push("");
  }
  return `${lines.join("\n").trim()}\n`;
}

function shortHash(value: unknown) {
  return hashSynthesisEngineCanonicalJson(value).slice(7, 31);
}

export function synthesisReferenceIdentity(reference: SourceReference) {
  const title = synthesisReferenceTitle(reference);
  return {
    citekey: synthesisReferenceCitekey(reference),
    doi: clean(reference.matching.DOI),
    url: clean(reference.matching.url),
    isbn: clean(reference.matching.ISBN),
    issn: clean(reference.matching.ISSN),
    title,
    normalizedTitle: normalizeSynthesisLiteratureTitle(title),
    year: synthesisReferenceYear(reference),
    authors: synthesisReferenceAuthors(reference),
    raw: synthesisReferenceRaw(reference),
  };
}

export function buildSynthesisCanonicalReferenceRecord(
  reference: SourceReference,
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
      ...(identity.doi ? { DOI: identity.doi } : {}),
      ...(identity.url ? { url: identity.url } : {}),
      ...(identity.isbn ? { ISBN: identity.isbn } : {}),
      ...(identity.issn ? { ISSN: identity.issn } : {}),
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
    /** Runtime-only basis carried beside the public Citation payload. */
    citationReferencesBasis?: string;
  }>;
  timestamp: string;
}) {
  const canonicals = new Map<string, SynthesisCanonicalReferenceRecord>();
  const bindings = new Map<string, SynthesisReferenceBindingRecord>();
  const rawReferences: SynthesisRawReferenceRecord[] = [];
  const indexes = itemIndexes(args.items);
  for (const source of args.sources) {
    const referencesArtifact = parseSourceReferenceArtifact(
      source.referencesPayload,
    );
    if (source.citationAnalysisPayload != null) {
      const citationArtifact = parseCitationAnalysisArtifact(
        source.citationAnalysisPayload,
      );
      if (
        source.citationReferencesBasis !== undefined &&
        source.citationReferencesBasis !==
          hashSynthesisContractCanonicalJson(referencesArtifact)
      ) {
        throw new Error("citation_references_basis_mismatch");
      }
      const linkage = validateCitationAgainstReferences(
        citationArtifact,
        referencesArtifact,
      );
      if (!linkage.ok) {
        throw new Error("citation_source_reference_linkage_invalid");
      }
    }
    const roles = rolesByReference(source.citationAnalysisPayload);
    for (const [index, reference] of referencesArtifact.references.entries()) {
      const quality = classifySynthesisReferenceQuality(reference);
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
        sourceReferenceId: reference.sourceReferenceId,
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
        rolesJson: JSON.stringify(
          roleEntries(roles.get(reference.sourceReferenceId) ?? []),
        ),
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
