// Narrowed projections of the reader surface's host-owned wire payloads
// (snapshot slot types arrive as `unknown` on the page side). The panel model
// narrows once per payload through the functions below; region components only
// consume the projection types defined here.

import type { TopicTimelineTone } from "../../../shared/topicTimelineRenderer";
import type {
  SynthesisWorkbenchArtifactReaderPayload,
  SynthesisWorkbenchNavTab,
} from "../../../shared/synthesisWorkbenchWireContract";
import {
  evidenceItemKey,
  evidenceRefKeyVariants,
  firstText,
  formatTimeSpan,
  hasStructuredContent,
  isRecord,
  metricNumber,
  nestedMetric,
  normalizeEvidenceRefKey,
  numberValue,
  numericYear,
  recordArray,
  recordValue,
  stringArray,
  textDedupeKey,
  textValue,
} from "./values";

// ---------------------------------------------------------------------------
// Evidence rows (detail.source_papers)
// ---------------------------------------------------------------------------

export type ReaderEvidenceRow = {
  index: number;
  /** Legacy evidenceId: paper_ref / item_key identity used for selection. */
  id: string;
  code: string;
  title: string;
  yearText: string;
  /** Parsed numeric year for the timeline; undefined when unparseable. */
  year?: number;
  refKey: string;
  summary: string;
  status: string;
  /** Every ref-key variant that identifies this row (legacy evidenceRefKeys). */
  refKeys: string[];
  /** Digest-link candidates for report text enhancement, longest first. */
  digestCandidates: string[];
  /** Raw paper_ref passed verbatim to resolveTopicPaperDigest. */
  paperRefArg?: unknown;
  /** Raw digest_ref passed verbatim to resolveTopicPaperDigest. */
  digestRefArg?: Record<string, unknown>;
  /** Standalone export digest lookup keys (legacy standaloneDigestKeysForEvidence). */
  standaloneDigestKeys: string[];
  timelineWeight: number;
  timelineTone: TopicTimelineTone;
  timelineSortKey: string;
};

const EVIDENCE_YEAR_KEYS = [
  "year",
  "publication_year",
  "publicationYear",
  "paper_year",
  "paperYear",
  "published_year",
  "publishedYear",
  "date",
  "published_at",
  "publishedAt",
  "publication_date",
  "publicationDate",
];

function evidenceYearOf(evidence: Record<string, unknown>): number | undefined {
  const direct = numericYear(firstText(evidence, EVIDENCE_YEAR_KEYS));
  if (Number.isFinite(direct)) return direct;
  for (const containerKey of [
    "bibliographic",
    "metadata",
    "paper",
    "source",
    "item",
  ]) {
    const nested = recordValue(evidence[containerKey]);
    const nestedYear = numericYear(firstText(nested, EVIDENCE_YEAR_KEYS));
    if (Number.isFinite(nestedYear)) return nestedYear;
  }
  return undefined;
}

function evidenceTimelineWeight(evidence: Record<string, unknown>): number {
  const explicit = metricNumber(evidence.importance || evidence.weight);
  if (Number.isFinite(explicit)) {
    return Math.max(0.85, Math.min(1.35, 0.95 + explicit * 0.2));
  }
  const foundation = metricNumber(nestedMetric(evidence, "foundation_score"));
  const frontier = metricNumber(nestedMetric(evidence, "frontier_score"));
  const score = Math.max(
    Number.isFinite(foundation) ? foundation : 0,
    Number.isFinite(frontier) ? frontier : 0,
  );
  return Math.max(0.9, Math.min(1.2, 0.92 + score * 0.22));
}

function evidenceTimelineTone(
  evidence: Record<string, unknown>,
): TopicTimelineTone {
  const status = `${textValue(evidence.status)} ${textValue(evidence.freshness)}`;
  if (status.match(/stale|dirty|missing|incomplete/i)) return "warning";
  const roleHints = [
    ...stringArray(evidence.synthesis_role_hints),
    ...stringArray(evidence.role_hints),
    ...stringArray(nestedMetric(evidence, "synthesis_role_hints")),
  ].join(" ");
  if (roleHints.match(/external-heavy|unresolved/i)) return "external";
  if (roleHints.match(/foundation|core/i)) return "foundation";
  if (roleHints.match(/frontier/i)) return "frontier";
  return "paper";
}

function narrowEvidenceRow(
  value: Record<string, unknown>,
  index: number,
  libraryId: number,
): ReaderEvidenceRow {
  const id = firstText(value, ["paper_ref", "paperRef", "item_key", "itemKey"]);
  const refKeys = new Set<string>();
  [
    id,
    value.paper_ref || value.paperRef,
    value.item_key || value.itemKey,
  ].forEach((entry) => {
    evidenceRefKeyVariants(entry).forEach((variant) => refKeys.add(variant));
  });
  const digestCandidates = new Set<string>();
  [
    value.paper_ref,
    value.paperRef,
    value.literature_item_id,
    value.projected_literature_item_id,
    value.item_key,
    value.itemKey,
  ].forEach((entry) => {
    const text = textValue(entry);
    if (text.length >= 3 || text.includes(":")) digestCandidates.add(text);
  });
  const rowLibraryId = textValue(
    value.library_id || value.libraryId || libraryId || "",
  );
  const rowItemKey = textValue(value.item_key || value.itemKey);
  if (rowLibraryId && rowItemKey) {
    digestCandidates.add(`${rowLibraryId}:${rowItemKey}`);
  }
  const digestRef = recordValue(value.digest_ref || value.digestRef);
  const standaloneKeys = [
    id,
    value.paper_ref,
    value.paperRef,
    digestRef.paper_ref,
    digestRef.paperRef,
    digestRef.note_key,
    digestRef.noteKey,
    digestRef.payload_hash,
    digestRef.payloadHash,
  ]
    .map((entry) => textValue(entry))
    .filter(Boolean);
  const ref = firstText(value, ["paper_ref", "id"]);
  const refItemKey = ref.includes(":") ? ref.split(":").pop() || "" : ref;
  const code = firstText(value, ["short_id", "code", "label"], `P${index + 1}`);
  return {
    index,
    id,
    code,
    title: firstText(
      value,
      ["title", "paper_title", "label", "paper_ref", "id"],
      `Paper ${index + 1}`,
    ),
    yearText: firstText(value, ["year", "publication_year"]),
    year: evidenceYearOf(value),
    refKey: firstText(value, ["paper_ref", "paperRef"]),
    summary: firstText(value, [
      "summary",
      "evidence_summary",
      "topic_relevance",
      "rationale",
    ]),
    status: firstText(value, ["synthesis_role", "status", "freshness"]),
    refKeys: Array.from(refKeys),
    digestCandidates: Array.from(digestCandidates).sort(
      (left, right) => right.length - left.length,
    ),
    paperRefArg: value.paper_ref ?? value.paperRef,
    digestRefArg: Object.keys(digestRef).length ? digestRef : undefined,
    standaloneDigestKeys: standaloneKeys,
    timelineWeight: evidenceTimelineWeight(value),
    timelineTone: evidenceTimelineTone(value),
    timelineSortKey: `${(
      refItemKey ||
      `paper:${id || index}` ||
      code
    ).toLowerCase()}:${String(index).padStart(6, "0")}`,
  };
}

/** Legacy evidenceForRef: exact -> normalized -> item-key unique matching. */
export function evidenceForRef(
  rows: ReaderEvidenceRow[],
  ref: unknown,
): ReaderEvidenceRow | undefined {
  const id = textValue(ref);
  if (!id) return undefined;
  const has = (row: ReaderEvidenceRow, key: string) =>
    row.refKeys.includes(key);
  const exact = rows.filter((row) => has(row, id));
  if (exact.length === 1) return exact[0];
  const normalized = normalizeEvidenceRefKey(id);
  const normalizedMatches = rows.filter((row) => has(row, normalized));
  if (normalizedMatches.length === 1) return normalizedMatches[0];
  const itemKey = evidenceItemKey(id);
  if (!itemKey || itemKey === normalized) return undefined;
  const itemKeyMatches = rows.filter((row) => has(row, itemKey));
  return itemKeyMatches.length === 1 ? itemKeyMatches[0] : undefined;
}

// ---------------------------------------------------------------------------
// Topic detail sections
// ---------------------------------------------------------------------------

export type ReaderScopeBoundary = {
  researchArea: string;
  include?: unknown;
  exclude?: unknown;
};

export type ReaderOutlineStrategy = {
  id: string;
  title: string;
  recommended: boolean;
  thesis: string;
  writing: string;
  sectionPlan: string[];
  bestFor: string;
  risks: string;
  sourceRefs: string[];
};

export type ReaderOverviewProjection = {
  summaryBlocks: string[];
  takeaways: string[];
  scopeBoundary?: ReaderScopeBoundary;
  outlineImportance: string;
  outlineStrategies: ReaderOutlineStrategy[];
};

export type ReaderTaxonomyNode = {
  title: string;
  maturity: string;
  description: string;
  problem: string;
  mechanism: string;
  strengths: string[];
  limitations: string[];
  sourceRefs: string[];
};

export type ReaderTaxonomyAxis = {
  axisType: string;
  rationale: string;
  nodes: ReaderTaxonomyNode[];
};

export type ReaderTaxonomyProjection = {
  summaryText: string;
  axes: ReaderTaxonomyAxis[];
  /** Flat fallback list (taxonomy.nodes / categories / taxonomy_nodes). */
  nodes: ReaderTaxonomyNode[];
  fallbackAxis: string;
  fallbackRationale: string;
};

export type ReaderClaim = {
  id: string;
  text: string;
  strength: string;
  rationale: string;
  sourceRefs: string[];
};

export type ReaderMethodRow = {
  method: string;
  ap: string;
  fps: string;
  epochs: string;
  backbone: string;
};

export type ReaderMatrixRow = {
  name: string;
  description: string;
  methods: ReaderMethodRow[];
  comparisons: Array<{ route: string; value: string }>;
};

export type ReaderDebate = {
  title: string;
  type: string;
  text: string;
  sourceRefs: string[];
};

export type ReaderImprovementDimension = {
  title: string;
  analysis: string;
  trajectory: string;
  sourceRefs: string[];
};

export type ReaderCompareProjection = {
  improvementSummary: string;
  improvementDimensions: ReaderImprovementDimension[];
  matrixRows: ReaderMatrixRow[];
  debates: ReaderDebate[];
};

export type ReaderFutureDirection = {
  directionType: string;
  title: string;
  limitation: string;
  future: string;
  rationale: string;
  sourceRefs: string[];
};

export type ReaderCoverageCard = {
  title: string;
  type: string;
  body: string;
  priority: string;
  examples: string[];
};

export type ReaderCoverageProjection = {
  verdict: string;
  reason: string;
  caveats: ReaderCoverageCard[];
  externalContextSummary: string;
  directions: ReaderCoverageCard[];
  statPapers: string;
  statTimeSpan: string;
  statRoutes: string;
  statVerdict: string;
  diagnostics?: Record<string, unknown>;
};

export type ReaderReportProjection = {
  title: string;
  body: string;
};

export type ReaderTimelineEvent = {
  year: number;
  title: string;
  description: string;
  tone: TopicTimelineTone;
  sourceRefs: string[];
};

export type ReaderTimelineProjection = {
  summaryText: string;
  events: ReaderTimelineEvent[];
};

export type TopicDetailProjection = {
  topicId: string;
  title: string;
  language: string;
  paperCount: number;
  coverageVerdict: string;
  evidence: ReaderEvidenceRow[];
  overview: ReaderOverviewProjection;
  taxonomy: ReaderTaxonomyProjection;
  claims: ReaderClaim[];
  compare: ReaderCompareProjection;
  futureDirections: ReaderFutureDirection[];
  coverage: ReaderCoverageProjection;
  report: ReaderReportProjection;
  timeline: ReaderTimelineProjection;
};

// -- narrowing helpers --------------------------------------------------------

function narrowTaxonomyNode(
  value: Record<string, unknown>,
): ReaderTaxonomyNode {
  return {
    title: firstText(value, ["title", "label", "name", "id"]),
    maturity: firstText(value, ["maturity", "status", "development_stage"]),
    description: firstText(value, [
      "description",
      "summary",
      "rationale",
      "definition",
    ]),
    problem: firstText(value, ["core_problem", "problem", "target_problem"]),
    mechanism: firstText(value, [
      "mechanism",
      "technical_mechanism",
      "core_mechanism",
    ]),
    strengths: stringArray(value.strengths || value.advantages),
    limitations: stringArray(value.limitations || value.weaknesses),
    sourceRefs: stringArray(value.source_paper_refs),
  };
}

function narrowOverview(
  detail: Record<string, unknown>,
): ReaderOverviewProjection {
  const outline = recordValue(detail.review_outline);
  const recommendedId = textValue(outline.recommended_strategy_id);
  const topic = recordValue(detail.topic);
  const boundary = recordValue(topic.scope_boundary);
  const scopeBoundary: ReaderScopeBoundary = {
    researchArea: firstText(topic, ["research_area", "researchArea", "notes"]),
    include: hasStructuredContent(boundary.include)
      ? boundary.include
      : undefined,
    exclude: hasStructuredContent(boundary.exclude)
      ? boundary.exclude
      : undefined,
  };
  return {
    summaryBlocks: [
      textValue(topic.definition),
      textValue(recordValue(detail.summary).summary),
    ].filter(Boolean),
    takeaways: stringArray(recordValue(detail.summary).key_takeaways),
    scopeBoundary:
      scopeBoundary.researchArea ||
      scopeBoundary.include !== undefined ||
      scopeBoundary.exclude !== undefined
        ? scopeBoundary
        : undefined,
    outlineImportance: textValue(outline.topic_importance),
    outlineStrategies: recordArray(outline.writing_strategies).map(
      (strategy) => {
        const id = firstText(strategy, ["id"]);
        return {
          id,
          title: firstText(strategy, ["title", "id"]),
          recommended: !!id && id === recommendedId,
          thesis: firstText(strategy, ["review_thesis"]),
          writing: firstText(strategy, ["writing_strategy"]),
          sectionPlan: stringArray(strategy.section_plan),
          bestFor: firstText(strategy, ["best_for"]),
          risks: firstText(strategy, ["risks"]),
          sourceRefs: stringArray(strategy.source_paper_refs),
        };
      },
    ),
  };
}

function narrowTaxonomy(
  detail: Record<string, unknown>,
): ReaderTaxonomyProjection {
  const taxonomy = recordValue(detail.taxonomy);
  const summary = recordValue(taxonomy.summary);
  return {
    summaryText: firstText(summary, ["text", "analysis", "overview"]),
    axes: recordArray(taxonomy.axes)
      .map((axis) => ({
        axisType: firstText(axis, ["axis_type", "type", "axis"]),
        rationale: firstText(axis, ["axis_rationale", "rationale", "reason"]),
        nodes: recordArray(axis.nodes).map(narrowTaxonomyNode),
      }))
      .filter((axis) => axis.axisType || axis.nodes.length),
    nodes: recordArray(
      taxonomy.nodes || taxonomy.categories || taxonomy.taxonomy_nodes,
    ).map(narrowTaxonomyNode),
    fallbackAxis: firstText(taxonomy, [
      "primary_axis",
      "axis",
      "classification_axis",
    ]),
    fallbackRationale: firstText(taxonomy, [
      "axis_rationale",
      "rationale",
      "reason",
    ]),
  };
}

function narrowClaims(detail: Record<string, unknown>): ReaderClaim[] {
  return recordArray(detail.claims).map((claim, index) => ({
    id: firstText(claim, ["id"], `C${index + 1}`),
    text: firstText(claim, ["text", "claim", "title", "id"]),
    strength: firstText(claim, ["strength", "claim_strength", "support_level"]),
    rationale: firstText(claim, [
      "analysis",
      "rationale",
      "support",
      "summary",
      "explanation",
    ]),
    sourceRefs: stringArray(claim.source_paper_refs),
  }));
}

function narrowCompare(
  detail: Record<string, unknown>,
): ReaderCompareProjection {
  const improvement = detail.improvement_dimensions;
  const improvementRows = isRecord(improvement)
    ? recordArray(improvement.dimensions)
    : recordArray(improvement);
  const improvementRecord = recordValue(improvement);
  const improvementSummaryRecord = recordValue(improvementRecord.summary);
  const matrix = recordValue(detail.comparison_matrix);
  const matrixRowsRaw = recordArray(matrix.rows || matrix.items);
  const matrixRows = (
    matrixRowsRaw.length ? matrixRowsRaw : recordArray(matrix.dimensions)
  ).map((row, index) => ({
    name:
      firstText(row, ["name", "title", "dimension", "label", "id"]) ||
      `M${index + 1}`,
    description: firstText(row, ["description", "summary", "rationale"]),
    methods: recordArray(
      row.methods_comparison || row.methods || row.entries,
    ).map((method) => ({
      method: firstText(method, ["method", "name"], "-"),
      ap: firstText(method, ["ap", "mAP"], "-"),
      fps: firstText(method, ["fps", "speed"], "-"),
      epochs: firstText(method, ["epochs", "schedule"], "-"),
      backbone: firstText(method, ["backbone", "model"], "-"),
    })),
    comparisons: recordArray(row.comparisons).map((comparison) => ({
      route: firstText(comparison, ["route", "method", "name"]),
      value: firstText(comparison, ["value", "result"], "-"),
    })),
  }));
  return {
    improvementSummary:
      firstText(improvementSummaryRecord, [
        "text",
        "summary",
        "analysis",
        "overview",
      ]) || firstText(improvementRecord, ["summary", "overview", "text"]),
    improvementDimensions: improvementRows.map((dimension) => ({
      title: firstText(dimension, ["title", "dimension", "name", "id"]),
      analysis: firstText(dimension, [
        "analysis",
        "description",
        "rationale",
        "tradeoff",
      ]),
      trajectory: firstText(dimension, [
        "trajectory",
        "progression",
        "improvement_pattern",
      ]),
      sourceRefs: stringArray(dimension.source_paper_refs),
    })),
    matrixRows,
    debates: recordArray(detail.debates).map((debate) => ({
      title: firstText(debate, [
        "name",
        "title",
        "text",
        "debate",
        "topic",
        "id",
      ]),
      type: firstText(debate, ["evidence_type", "type"]),
      text: firstText(debate, [
        "current_judgment",
        "synthesis_judgment",
        "analysis",
        "summary",
        "description",
        "tension",
        "rationale",
      ]),
      sourceRefs: stringArray(debate.source_paper_refs),
    })),
  };
}

function narrowFutureDirections(
  detail: Record<string, unknown>,
): ReaderFutureDirection[] {
  return recordArray(detail.future_directions).map((direction) => ({
    directionType: firstText(direction, ["direction_type"]),
    title: firstText(direction, ["title", "id"]),
    limitation: firstText(direction, ["current_limitation"]),
    future: firstText(direction, ["future_direction"]),
    rationale: firstText(direction, ["rationale"]),
    sourceRefs: stringArray(direction.source_paper_refs),
  }));
}

function narrowCoverageCards(
  rows: Record<string, unknown>[],
  titleKeys: string[],
  bodyKeys: string[],
): ReaderCoverageCard[] {
  return rows.map((row) => ({
    title: firstText(row, titleKeys),
    type: firstText(row, ["type"]),
    body: firstText(row, bodyKeys),
    priority: firstText(row, ["priority", "urgency", "severity"]),
    examples: stringArray(
      row.example_titles_or_terms || row.examples || row.terms,
    ),
  }));
}

function dedupeCards(cards: ReaderCoverageCard[]): ReaderCoverageCard[] {
  const seen = new Set<string>();
  return cards.filter((card) => {
    const key = textDedupeKey(
      [card.title, card.body].filter(Boolean).join("\n"),
    );
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function routeCoverageCount(value: unknown): string {
  if (isRecord(value)) {
    return firstText(value, ["routes", "route_count", "count"]);
  }
  return textValue(value);
}

function narrowCoverage(
  detail: Record<string, unknown>,
): ReaderCoverageProjection {
  const coverage = recordValue(detail.coverage);
  const stats = recordValue(detail.statistics);
  const diagnostics = detail.diagnostics;
  return {
    verdict: firstText(coverage, ["coverage_verdict", "verdict", "status"]),
    reason: firstText(coverage, ["coverage_reason", "reason"]),
    caveats: narrowCoverageCards(
      recordArray(coverage.coverage_caveats),
      ["type", "title", "label", "id"],
      ["note", "reason", "description", "summary", "caveat"],
    ),
    externalContextSummary: firstText(coverage, ["external_context_summary"]),
    directions: dedupeCards(
      narrowCoverageCards(
        recordArray(coverage.suggested_collection_directions),
        ["direction", "title", "label", "id"],
        ["reason", "rationale", "why", "summary"],
      ),
    ),
    statPapers: textValue(stats.paper_count ?? detail.paper_count),
    statTimeSpan: formatTimeSpan(stats.time_span),
    statRoutes: routeCoverageCount(stats.route_coverage),
    statVerdict:
      firstText(stats, ["coverage_verdict"]) ||
      firstText(coverage, ["coverage_verdict", "verdict", "status"]),
    diagnostics: hasStructuredContent(diagnostics)
      ? isRecord(diagnostics)
        ? diagnostics
        : { value: diagnostics }
      : undefined,
  };
}

function eventYearOf(event: Record<string, unknown>): number {
  return numericYear(
    event.year || event.date || event.publication_year || event.publicationYear,
  );
}

function eventTimelineTone(event: Record<string, unknown>): TopicTimelineTone {
  const status = textValue(event.status);
  if (status.match(/stale|dirty|missing|incomplete/i)) return "warning";
  return "milestone";
}

function narrowTimeline(
  detail: Record<string, unknown>,
): ReaderTimelineProjection {
  const timeline = detail.timeline_events;
  const eventsRaw =
    isRecord(timeline) && timeline.events
      ? recordArray(timeline.events)
      : recordArray(timeline);
  const summary = recordValue(recordValue(timeline).summary);
  return {
    summaryText: firstText(summary, ["text", "analysis", "overview"]),
    events: eventsRaw
      .map((event, index) => ({
        year: eventYearOf(event),
        title:
          firstText(event, ["event", "title", "label", "summary"]) ||
          `Event ${index + 1}`,
        description:
          firstText(event, [
            "description",
            "analysis",
            "why_it_matters",
            "summary",
          ]) ||
          firstText(event, ["event", "title", "label", "summary"]) ||
          `Event ${index + 1}`,
        tone: eventTimelineTone(event),
        sourceRefs: stringArray(event.source_paper_refs),
      }))
      .filter((event) => Number.isFinite(event.year)),
  };
}

/** Defensive narrowing of the host topic-detail slot. */
export function narrowTopicDetail(
  value: unknown,
  libraryId: number,
): TopicDetailProjection | undefined {
  if (!isRecord(value)) return undefined;
  const detail = value;
  const report = recordValue(detail.synthesis_report);
  const coverage = recordValue(detail.coverage);
  return {
    topicId: textValue(detail.topicId),
    title: textValue(detail.title),
    language: textValue(detail.language, "auto") || "auto",
    paperCount: numberValue(detail.paper_count),
    coverageVerdict: firstText(coverage, [
      "coverage_verdict",
      "coverage_judgment",
    ]),
    evidence: recordArray(detail.source_papers).map((row, index) =>
      narrowEvidenceRow(row, index, libraryId),
    ),
    overview: narrowOverview(detail),
    taxonomy: narrowTaxonomy(detail),
    claims: narrowClaims(detail),
    compare: narrowCompare(detail),
    futureDirections: narrowFutureDirections(detail),
    coverage: narrowCoverage(detail),
    report: {
      title: firstText(report, ["title", "heading"]),
      body: firstText(report, ["body"]),
    },
    timeline: narrowTimeline(detail),
  };
}

// ---------------------------------------------------------------------------
// Concept overlay / report concept nav projection
// ---------------------------------------------------------------------------

export type ReaderConceptEntry = {
  conceptId: string;
  senseId: string;
  alias: string;
  label: string;
  shortDefinition: string;
  definition: string;
  confidence: string;
};

export type ReaderConceptsProjection = {
  overlayEnabled: boolean;
  overlayEntries: ReaderConceptEntry[];
  senses: Array<{
    senseId: string;
    conceptId: string;
    label: string;
    aliases: string[];
    shortDefinition: string;
    definition: string;
    confidence: string;
    sourceTopicIds: string[];
  }>;
  concepts: Array<{
    conceptId: string;
    label: string;
    aliases: string[];
    shortDefinition: string;
    definition: string;
  }>;
};

function narrowConceptEntry(value: unknown): ReaderConceptEntry | undefined {
  if (!isRecord(value)) return undefined;
  return {
    conceptId: textValue(value.concept_id),
    senseId: textValue(value.sense_id),
    alias: textValue(value.alias),
    label: textValue(value.label),
    shortDefinition: textValue(value.short_definition),
    definition: textValue(value.definition),
    confidence: textValue(value.confidence),
  };
}

/**
 * Narrows the snapshot concepts section to the fields the reader region
 * renders (overlay + report concept nav). Empty when the overlay is disabled
 * and no senses exist.
 */
export function narrowReaderConcepts(value: unknown): ReaderConceptsProjection {
  const concepts = recordValue(value);
  const filters = recordValue(concepts.filters);
  return {
    overlayEnabled: filters.overlayEnabled === true,
    overlayEntries: recordArray(concepts.overlayEntries)
      .map(narrowConceptEntry)
      .filter((entry): entry is ReaderConceptEntry => !!entry),
    senses: recordArray(concepts.senses).map((sense) => ({
      senseId: textValue(sense.sense_id),
      conceptId: textValue(sense.concept_id),
      label: textValue(sense.label),
      aliases: stringArray(sense.aliases),
      shortDefinition: textValue(sense.short_definition),
      definition: textValue(sense.definition),
      confidence: textValue(sense.confidence),
      sourceTopicIds: stringArray(sense.source_topic_ids),
    })),
    concepts: recordArray(concepts.rows).map((concept) => ({
      conceptId: textValue(concept.concept_id),
      label: textValue(concept.label),
      aliases: stringArray(concept.aliases),
      shortDefinition: textValue(concept.short_definition),
      definition: textValue(concept.definition),
    })),
  };
}

export const EMPTY_READER_CONCEPTS: ReaderConceptsProjection = {
  overlayEnabled: false,
  overlayEntries: [],
  senses: [],
  concepts: [],
};

// ---------------------------------------------------------------------------
// Digest result projection
// ---------------------------------------------------------------------------

export type ReaderDigestImage = {
  dataUrl: string;
  alt: string;
  caption: string;
  width: number;
  height: number;
};

export type ReaderDigestResultView = {
  ok: boolean;
  status: string;
  markdown: string;
  sourceChanged: boolean;
  representativeImage?: ReaderDigestImage;
};

/** Defensive narrowing for synthesis:digest payloads and standalone digests. */
export function narrowDigestResult(
  value: unknown,
): ReaderDigestResultView | undefined {
  if (!isRecord(value)) return undefined;
  if (typeof value.ok !== "boolean") return undefined;
  const image = recordValue(value.representative_image);
  const dataUrl = textValue(image.data_url);
  const representativeImage: ReaderDigestImage | undefined =
    textValue(image.status) === "available" && /^data:image\//i.test(dataUrl)
      ? {
          dataUrl,
          alt: firstText(image, ["alt", "caption"]),
          caption: firstText(image, ["caption", "alt"]),
          width: numberValue(image.width),
          height: numberValue(image.height),
        }
      : undefined;
  return {
    ok: value.ok === true,
    status: textValue(value.status),
    markdown: textValue(value.digest_markdown),
    sourceChanged: value.source_changed === true,
    representativeImage,
  };
}

export function narrowStandaloneDigests(
  value: unknown,
): Record<string, ReaderDigestResultView> | undefined {
  if (!isRecord(value)) return undefined;
  const result: Record<string, ReaderDigestResultView> = {};
  for (const [key, entry] of Object.entries(value)) {
    const digest = narrowDigestResult(entry);
    if (key && digest) result[key] = digest;
  }
  return Object.keys(result).length ? result : undefined;
}

// ---------------------------------------------------------------------------
// Artifact reader payload (wire-typed, re-exported for the panel model)
// ---------------------------------------------------------------------------

export type ArtifactReaderView = SynthesisWorkbenchArtifactReaderPayload;

export function narrowArtifactReader(
  value: unknown,
): ArtifactReaderView | undefined {
  if (!isRecord(value)) return undefined;
  return {
    topicId: textValue(value.topicId),
    title: textValue(value.title),
    markdown: textValue(value.markdown),
    metadata: isRecord(value.metadata) ? value.metadata : undefined,
    hash: textValue(value.hash) || undefined,
    updated_at: textValue(value.updated_at) || undefined,
  };
}

// ---------------------------------------------------------------------------
// Region selection
// ---------------------------------------------------------------------------

export type ReaderRegionKind = "topicDetail" | "artifact" | "empty";

/**
 * The reader region selection: only this region's user-visible content and
 * open/collapsed state. Export-envelope `generatedAt`, unread snapshot
 * sections, surface runtime metadata and background job counters never enter.
 */
export type ReaderRegionSelection = {
  kind: ReaderRegionKind;
  /** Standalone export shape: hides host-bound actions, enables local digest. */
  standalone: boolean;
  locale: string;
  topicId: string;
  previousTab: SynthesisWorkbenchNavTab;
  detail?: TopicDetailProjection;
  artifact?: ArtifactReaderView;
  /** Latest digest result forwarded by the controller (synthesis:digest). */
  digestResult?: ReaderDigestResultView;
  /** Standalone export digest lookup map (envelope digestsByKey). */
  standaloneDigests?: Record<string, ReaderDigestResultView>;
  concepts: ReaderConceptsProjection;
  /** Whether the artifact row exposes an unblocked updateIntent. */
  updateIntentAvailable: boolean;
  /** Command names with a pending/in-flight local operation (busy buttons). */
  pendingCommands: string[];
};
