import {
  canonicalizeJson,
  hashCanonicalJson,
  hashMarkdown,
} from "./foundation";

const COMPLETE_SECTIONS = [
  "topic",
  "summary",
  "positioning",
  "taxonomy",
  "comparison_matrix",
  "claims",
  "timeline_events",
  "paper_evidence",
  "external_literature_analysis",
  "debates",
  "coverage",
  "gaps",
  "review_outline",
  "statistics",
  "synthesis_report",
  "evidence_map",
  "source_artifacts",
  "diagnostics",
] as const;

const PATCHABLE_SECTIONS: Set<string> = new Set(
  COMPLETE_SECTIONS.filter((section) => section !== "topic"),
);

type SectionName = (typeof COMPLETE_SECTIONS)[number];

type ValidationResult<T> =
  | { ok: true; errors: []; manifest?: T; artifact?: T }
  | { ok: false; errors: string[]; manifest?: T; artifact?: T };

function isObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function cleanString(value: unknown) {
  return String(value || "").trim();
}

function firstText(value: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const text = cleanString(value[key]);
    if (text) {
      return text;
    }
  }
  return "";
}

function hasAnyKey(value: Record<string, unknown>, keys: string[]) {
  return keys.some((key) => key in value && cleanString(value[key]));
}

function sectionEntryErrors(section: string, value: unknown) {
  const errors: string[] = [];
  if (!isObject(value)) {
    return [`${section} section entry must be an object`];
  }
  if (!cleanString(value.path)) {
    errors.push(`${section}.path is required`);
  }
  if (!cleanString(value.hash)) {
    errors.push(`${section}.hash is required`);
  }
  if (cleanString(value.content_type) !== "json") {
    errors.push(`${section}.content_type must be json`);
  }
  return errors;
}

function sidecarEntryErrors(sidecar: string, value: unknown) {
  const errors: string[] = [];
  if (!isObject(value)) {
    return [`sidecars.${sidecar} entry must be an object`];
  }
  if (!cleanString(value.path)) {
    errors.push(`sidecars.${sidecar}.path is required`);
  }
  if (!cleanString(value.hash)) {
    errors.push(`sidecars.${sidecar}.hash is required`);
  }
  if (cleanString(value.content_type) !== "json") {
    errors.push(`sidecars.${sidecar}.content_type must be json`);
  }
  if (!cleanString(value.schema_id)) {
    errors.push(`sidecars.${sidecar}.schema_id is required`);
  }
  return errors;
}

function validateSidecars(input: Record<string, unknown>) {
  const errors: string[] = [];
  const sidecars = isObject(input.sidecars) ? input.sidecars : {};
  for (const sidecar of [
    "topic_interest_metadata",
    "concept_cards_proposal",
    "topic_graph_relation_proposals",
  ]) {
    if (!(sidecar in sidecars)) {
      errors.push(`sidecars.${sidecar} is required`);
      continue;
    }
    errors.push(...sidecarEntryErrors(sidecar, sidecars[sidecar]));
  }
  return errors;
}

export function validateTopicAnalysisManifest(
  input: unknown,
): ValidationResult<Record<string, unknown>> {
  const errors: string[] = [];
  if (!isObject(input)) {
    return { ok: false, errors: ["topic analysis manifest must be an object"] };
  }
  if ("markdown" in input) {
    errors.push("manifest must not embed markdown");
  }
  if ("markdown_path" in input) {
    errors.push("manifest must not depend on markdown_path");
  }
  const schemaId = cleanString(input.schema_id);
  const operation = cleanString(input.operation);
  if (
    schemaId === "synthesis.topic_section_patch_manifest" ||
    operation === "update_patch"
  ) {
    if (schemaId !== "synthesis.topic_section_patch_manifest") {
      errors.push(
        "update_patch manifest schema_id must be synthesis.topic_section_patch_manifest",
      );
    }
    if ("markdown_path" in input) {
      errors.push("update_patch manifest must not depend on markdown_path");
    }
    const base = isObject(input.base) ? input.base : {};
    const read = isObject(base.read_section_hashes)
      ? base.read_section_hashes
      : {};
    const replace = isObject(base.replace_section_hashes)
      ? base.replace_section_hashes
      : {};
    const patch = isObject(input.patch) ? input.patch : {};
    if (cleanString(patch.mode) !== "section_replace") {
      errors.push("section_patch patch.mode must be section_replace");
    }
    if (cleanString(patch.unchanged_section_policy) !== "inherit_current") {
      errors.push(
        "section_patch unchanged_section_policy must be inherit_current",
      );
    }
    const changedSections = Array.isArray(patch.changed_sections)
      ? patch.changed_sections.map(cleanString).filter(Boolean)
      : [];
    const sections = isObject(patch.sections) ? patch.sections : {};
    for (const section of changedSections) {
      if (!PATCHABLE_SECTIONS.has(section as SectionName)) {
        errors.push(`${section} is not patchable; use update_full`);
      }
      if (!(section in read)) {
        errors.push(`${section} must be present in read_section_hashes`);
      }
      if (!(section in replace)) {
        errors.push(`${section} must be present in replace_section_hashes`);
      }
      if (!(section in sections)) {
        errors.push(`${section} must be present in patch.sections`);
      }
    }
    for (const section of Object.keys(replace)) {
      if (!(section in read)) {
        errors.push(
          `${section} replace_section_hashes must be a subset of read_section_hashes`,
        );
      }
    }
    for (const [section, value] of Object.entries(sections)) {
      errors.push(...sectionEntryErrors(section, value));
    }
    errors.push(...validateSidecars(input));
    return errors.length
      ? { ok: false, errors, manifest: input }
      : { ok: true, errors: [], manifest: input };
  }
  if (schemaId !== "synthesis.topic_analysis_manifest") {
    errors.push("manifest schema_id must be synthesis.topic_analysis_manifest");
  }
  if (operation !== "create" && operation !== "update_full") {
    errors.push("complete manifest operation must be create or update_full");
  }
  if (!cleanString(input.language)) {
    errors.push("manifest language is required");
  }
  const sections = isObject(input.sections) ? input.sections : {};
  for (const section of COMPLETE_SECTIONS) {
    if (!(section in sections)) {
      errors.push(`sections.${section} is required`);
      continue;
    }
    errors.push(...sectionEntryErrors(section, sections[section]));
  }
  errors.push(...validateSidecars(input));
  return errors.length
    ? { ok: false, errors, manifest: input }
    : { ok: true, errors: [], manifest: input };
}

function evidenceIds(artifact: Record<string, unknown>) {
  const rows = Array.isArray(artifact.paper_evidence)
    ? artifact.paper_evidence
    : [];
  return new Set(
    rows
      .filter(isObject)
      .map((entry) => cleanString(entry.id))
      .filter(Boolean),
  );
}

function timelineEventRows(value: unknown) {
  if (isObject(value)) {
    return Array.isArray(value.events) ? value.events : [];
  }
  if (Array.isArray(value)) {
    return value;
  }
  return [];
}

function validateEvidenceRefs(args: {
  label: string;
  rows: unknown;
  knownEvidence: Set<string>;
}) {
  const errors: string[] = [];
  for (const row of Array.isArray(args.rows) ? args.rows : []) {
    if (!isObject(row)) {
      continue;
    }
    const refs = Array.isArray(row.evidence_refs)
      ? row.evidence_refs.map(cleanString)
      : [];
    if (!refs.length) {
      errors.push(
        `${args.label} ${cleanString(row.id)} requires evidence_refs`,
      );
    }
    for (const ref of refs) {
      if (ref.startsWith("external:")) {
        errors.push(
          `${args.label} ${cleanString(row.id)} must not use external references as library paper evidence`,
        );
      } else if (!args.knownEvidence.has(ref)) {
        errors.push(
          `${args.label} ${cleanString(row.id)} references missing paper_evidence ${ref}`,
        );
      }
    }
  }
  return errors;
}

export function validateTopicSynthesisArtifact(
  input: unknown,
  options: { expectedLanguage?: string } = {},
): ValidationResult<Record<string, unknown>> {
  const errors: string[] = [];
  if (!isObject(input)) {
    return {
      ok: false,
      errors: ["topic synthesis artifact must be an object"],
    };
  }
  if (cleanString(input.schema_id) !== "synthesis.topic_synthesis_artifact") {
    errors.push(
      "artifact schema_id must be synthesis.topic_synthesis_artifact",
    );
  }
  if (
    options.expectedLanguage &&
    cleanString(input.language) !== options.expectedLanguage
  ) {
    errors.push(`artifact language must be ${options.expectedLanguage}`);
  }
  for (const section of COMPLETE_SECTIONS) {
    if (!(section in input)) {
      errors.push(`artifact.${section} is required`);
    }
  }
  const knownEvidence = evidenceIds(input);
  const knownEvidenceMap = evidenceMapIds(input);
  errors.push(
    ...validateEvidenceRefs({
      label: "claim",
      rows: input.claims,
      knownEvidence,
    }),
    ...validateEvidenceRefs({
      label: "timeline",
      rows: timelineEventRows(input.timeline_events),
      knownEvidence,
    }),
    ...validateEvidenceMapRefs({
      label: "claim",
      rows: input.claims,
      knownEvidenceMap,
    }),
    ...validateEvidenceMapRefs({
      label: "timeline",
      rows: timelineEventRows(input.timeline_events),
      knownEvidenceMap,
    }),
    ...validateEvidenceMapRefs({
      label: "debate",
      rows: input.debates,
      knownEvidenceMap,
    }),
    ...validateEvidenceMapRefs({
      label: "gap",
      rows: input.gaps,
      knownEvidenceMap,
    }),
  );
  const paperEvidence = Array.isArray(input.paper_evidence)
    ? input.paper_evidence
    : [];
  for (const entry of paperEvidence) {
    if (!isObject(entry)) {
      errors.push("paper_evidence entries must be objects");
      continue;
    }
    if ("digest_markdown" in entry || "digest" in entry) {
      errors.push("paper_evidence must not embed digest_markdown bodies");
    }
    const digestRef = isObject(entry.digest_ref) ? entry.digest_ref : {};
    if (cleanString(digestRef.payload_type) !== "digest-markdown") {
      errors.push(
        "paper_evidence.digest_ref.payload_type must be digest-markdown",
      );
    }
    if (!cleanString(digestRef.payload_hash)) {
      errors.push("paper_evidence.digest_ref.payload_hash is required");
    }
  }
  const external = isObject(input.external_literature_analysis)
    ? input.external_literature_analysis
    : {};
  if (!("summary" in external)) {
    errors.push("external_literature_analysis summary is required");
  }
  const diagnostics = isObject(input.diagnostics) ? input.diagnostics : {};
  const legacyFallback = Boolean(diagnostics.legacy_fallback);
  if (!legacyFallback) {
    errors.push(...validateContentDepth(input));
  }
  errors.push(
    ...validateNestedEvidenceMapRefs(
      "taxonomy",
      input.taxonomy,
      knownEvidenceMap,
    ),
    ...validateNestedEvidenceMapRefs(
      "comparison_matrix",
      input.comparison_matrix,
      knownEvidenceMap,
    ),
    ...validateNestedEvidenceMapRefs(
      "review_outline",
      input.review_outline,
      knownEvidenceMap,
    ),
  );
  return errors.length
    ? { ok: false, errors, artifact: input }
    : { ok: true, errors: [], artifact: input };
}

function numericPaperCount(artifact: Record<string, unknown>) {
  const statistics = isObject(artifact.statistics) ? artifact.statistics : {};
  const raw = Number(statistics.paper_count || 0);
  return Number.isFinite(raw) ? raw : 0;
}

function paragraphCount(text: string) {
  return text.split(/\n\s*\n+/).filter((entry) => entry.trim()).length;
}

function reportDimensionErrors(artifact: Record<string, unknown>) {
  const errors: string[] = [];
  const topic = isObject(artifact.topic) ? artifact.topic : {};
  if (
    !cleanString(topic.definition) ||
    !hasAnyKey(topic, [
      "discipline",
      "field",
      "research_field",
      "research_area",
    ]) ||
    (!isObject(topic.scope_boundary) && !cleanString(topic.scope))
  ) {
    errors.push("topic definition/scope");
  }

  const taxonomy = isObject(artifact.taxonomy) ? artifact.taxonomy : {};
  const taxonomySummary = isObject(taxonomy.summary) ? taxonomy.summary : {};
  const taxonomyNodes = Array.isArray(taxonomy.nodes) ? taxonomy.nodes : [];
  if (
    !hasAnyKey(taxonomySummary, ["text", "analysis", "overview"]) ||
    !taxonomyNodes.length
  ) {
    errors.push("research routes");
  }

  const timeline = isObject(artifact.timeline_events)
    ? artifact.timeline_events
    : {};
  const timelineSummary = isObject(timeline.summary) ? timeline.summary : {};
  const timelineRows = timelineEventRows(timeline);
  if (
    !hasAnyKey(timelineSummary, ["text", "analysis", "overview"]) ||
    !timelineRows.length
  ) {
    errors.push("historical progression");
  }

  if (!Array.isArray(artifact.claims) || !artifact.claims.length) {
    errors.push("core findings");
  }

  const comparison = isObject(artifact.comparison_matrix)
    ? artifact.comparison_matrix
    : {};
  const comparisonRows = Array.isArray(comparison.rows) ? comparison.rows : [];
  const debates = Array.isArray(artifact.debates) ? artifact.debates : [];
  if (!comparisonRows.length && !debates.length) {
    errors.push("comparison/debates");
  }

  const coverage = isObject(artifact.coverage) ? artifact.coverage : {};
  if (
    !cleanString(coverage.coverage_verdict) ||
    !hasAnyKey(coverage, [
      "route_coverage_summary",
      "claim_coverage_summary",
      "timeline_coverage_summary",
    ])
  ) {
    errors.push("gaps/coverage");
  }

  const external = isObject(artifact.external_literature_analysis)
    ? artifact.external_literature_analysis
    : {};
  if (
    !cleanString(external.summary) ||
    !Array.isArray(external.themes) ||
    !external.themes.length ||
    !Array.isArray(external.suggested_additions)
  ) {
    errors.push("external literature/collection suggestion");
  }
  return errors;
}

function validateSynthesisReportDepth(artifact: Record<string, unknown>) {
  const errors: string[] = [];
  const report = isObject(artifact.synthesis_report)
    ? artifact.synthesis_report
    : {};
  if (!cleanString(report.title)) {
    errors.push("synthesis_report.title is required");
  }
  const reportBody = firstText(report, ["body", "markdown", "text", "report"]);
  const paperCount = numericPaperCount(artifact);
  const minLength = paperCount > 0 && paperCount < 5 ? 400 : 800;
  if (!reportBody || reportBody.length < minLength) {
    errors.push(
      `synthesis_report body must contain at least ${minLength} characters of substantive continuous prose`,
    );
  }
  if (paperCount >= 5 && paragraphCount(reportBody) < 3) {
    errors.push(
      "synthesis_report body must contain multiple paragraphs for medium/large topics",
    );
  }
  const missingDimensions = reportDimensionErrors(artifact);
  if (missingDimensions.length) {
    errors.push(
      `synthesis_report source dimensions incomplete: ${missingDimensions.join(", ")}`,
    );
  }
  return errors;
}

function validateContentDepth(artifact: Record<string, unknown>) {
  const errors: string[] = [];
  const topic = isObject(artifact.topic) ? artifact.topic : {};
  if (
    !hasAnyKey(topic, [
      "discipline",
      "field",
      "research_field",
      "research_area",
    ])
  ) {
    errors.push("topic requires discipline/research field metadata");
  }
  if (!isObject(topic.scope_boundary) && !cleanString(topic.scope)) {
    errors.push("topic requires scope_boundary or scope");
  }

  const taxonomy = isObject(artifact.taxonomy) ? artifact.taxonomy : {};
  const taxonomyNodes = Array.isArray(taxonomy.nodes) ? taxonomy.nodes : [];
  if (!cleanString(taxonomy.primary_axis || taxonomy.axis)) {
    errors.push("taxonomy requires primary_axis");
  }
  const taxonomySummary = isObject(taxonomy.summary) ? taxonomy.summary : {};
  if (!isObject(taxonomy.summary)) {
    errors.push("taxonomy.summary is required");
  } else if (!hasAnyKey(taxonomySummary, ["text", "analysis", "overview"])) {
    errors.push("taxonomy.summary requires text/analysis");
  }
  if (!taxonomyNodes.length) {
    errors.push("taxonomy.nodes requires at least one research route");
  }
  for (const node of taxonomyNodes) {
    if (!isObject(node)) {
      continue;
    }
    const id = firstText(node, ["id", "title", "label", "name"]);
    for (const [field, aliases] of Object.entries({
      definition: ["definition", "route_definition", "description"],
      core_problem: ["core_problem", "problem", "target_problem"],
      mechanism: ["mechanism", "technical_mechanism", "core_mechanism"],
      representative_papers: [
        "representative_papers",
        "paper_refs",
        "evidence_refs",
      ],
      strengths: ["strengths", "advantages"],
      limitations: ["limitations", "weaknesses"],
      maturity: ["maturity", "status", "development_stage"],
    })) {
      if (
        !aliases.some(
          (key) =>
            key in node &&
            (Array.isArray(node[key])
              ? node[key].length
              : cleanString(node[key])),
        )
      ) {
        errors.push(`taxonomy route ${id || "(unknown)"} requires ${field}`);
      }
    }
  }

  const claims = Array.isArray(artifact.claims) ? artifact.claims : [];
  for (const claim of claims) {
    if (!isObject(claim)) {
      continue;
    }
    const id = firstText(claim, ["id", "text", "claim"]);
    if (
      !hasAnyKey(claim, ["analysis", "rationale", "argument", "explanation"])
    ) {
      errors.push(`claim ${id} requires analysis/rationale`);
    }
    if (
      !("limitations" in claim) &&
      !("scope" in claim) &&
      !("applicability" in claim)
    ) {
      errors.push(`claim ${id} requires limitations or scope`);
    }
  }

  const timelineSection = artifact.timeline_events;
  if (!isObject(timelineSection)) {
    errors.push("timeline_events must be an object with summary and events");
  }
  const timelineSummary =
    isObject(timelineSection) && isObject(timelineSection.summary)
      ? timelineSection.summary
      : {};
  if (!isObject(timelineSection) || !isObject(timelineSection.summary)) {
    errors.push("timeline_events.summary is required");
  } else if (!hasAnyKey(timelineSummary, ["text", "analysis", "overview"])) {
    errors.push("timeline_events.summary requires text/analysis");
  }
  const timeline = timelineEventRows(timelineSection);
  if (!timeline.length) {
    errors.push("timeline_events.events requires at least one event");
  }
  for (const event of timeline) {
    if (!isObject(event)) {
      continue;
    }
    const id = firstText(event, ["id", "label", "title"]);
    if (!hasAnyKey(event, ["description", "analysis", "why_it_matters"])) {
      errors.push(`timeline ${id} requires description/analysis`);
    }
    if (
      !hasAnyKey(event, [
        "phase",
        "stage",
        "progression_logic",
        "follow_on_effect",
      ])
    ) {
      errors.push(`timeline ${id} requires phase or progression logic`);
    }
  }

  const external = isObject(artifact.external_literature_analysis)
    ? artifact.external_literature_analysis
    : {};
  if (!Array.isArray(external.themes) || !external.themes.length) {
    errors.push("external_literature_analysis themes are required");
  }
  if (!Array.isArray(external.representative_references)) {
    errors.push(
      "external_literature_analysis representative_references are required",
    );
  }
  if (!hasAnyKey(external, ["coverage_verdict", "coverage_judgment"])) {
    errors.push("external_literature_analysis coverage_verdict is required");
  }
  if (!Array.isArray(external.suggested_additions)) {
    errors.push(
      "external_literature_analysis suggested_additions are required",
    );
  }

  const statistics = isObject(artifact.statistics) ? artifact.statistics : {};
  for (const key of [
    "paper_count",
    "time_span",
    "route_coverage",
    "coverage_verdict",
  ]) {
    if (!(key in statistics)) {
      errors.push(`statistics.${key} is required`);
    }
  }

  const report = isObject(artifact.synthesis_report)
    ? artifact.synthesis_report
    : {};
  errors.push(...validateSynthesisReportDepth(artifact));
  const sourceChapters = isObject(report.source_section_chapters)
    ? report.source_section_chapters
    : {};
  if (!isObject(report.source_section_chapters)) {
    errors.push("synthesis_report.source_section_chapters is required");
  } else {
    if (cleanString(sourceChapters.research_routes) !== "taxonomy.summary") {
      errors.push(
        "synthesis_report.source_section_chapters.research_routes must be taxonomy.summary",
      );
    }
    if (
      cleanString(sourceChapters.historical_progression) !==
      "timeline_events.summary"
    ) {
      errors.push(
        "synthesis_report.source_section_chapters.historical_progression must be timeline_events.summary",
      );
    }
  }
  return errors;
}

function evidenceMapIds(artifact: Record<string, unknown>) {
  const evidenceMap = isObject(artifact.evidence_map)
    ? artifact.evidence_map
    : {};
  const direct = Array.isArray(evidenceMap.candidate_ids)
    ? evidenceMap.candidate_ids.map(cleanString)
    : [];
  const candidates = isObject(evidenceMap.candidates)
    ? Object.keys(evidenceMap.candidates)
    : [];
  return new Set([...direct, ...candidates].filter(Boolean));
}

function validateEvidenceMapRefs(args: {
  label: string;
  rows: unknown;
  knownEvidenceMap: Set<string>;
}) {
  const errors: string[] = [];
  for (const row of Array.isArray(args.rows) ? args.rows : []) {
    if (!isObject(row)) {
      continue;
    }
    const refs = Array.isArray(row.evidence_map_refs)
      ? row.evidence_map_refs.map(cleanString).filter(Boolean)
      : [];
    if (!refs.length) {
      errors.push(
        `${args.label} ${cleanString(row.id)} requires evidence_map_refs`,
      );
    }
    for (const ref of refs) {
      if (!args.knownEvidenceMap.has(ref)) {
        errors.push(
          `${args.label} ${cleanString(row.id)} references missing evidence_map ${ref}`,
        );
      }
    }
  }
  return errors;
}

function validateNestedEvidenceMapRefs(
  label: string,
  value: unknown,
  knownEvidenceMap: Set<string>,
) {
  const errors: string[] = [];
  const walk = (entry: unknown) => {
    if (Array.isArray(entry)) {
      for (const item of entry) {
        walk(item);
      }
      return;
    }
    if (!isObject(entry)) {
      return;
    }
    if ("evidence_map_refs" in entry) {
      const refs = Array.isArray(entry.evidence_map_refs)
        ? entry.evidence_map_refs.map(cleanString).filter(Boolean)
        : [];
      if (!refs.length) {
        errors.push(
          `${label} ${cleanString(entry.id || entry.title)} requires evidence_map_refs`,
        );
      }
      for (const ref of refs) {
        if (!knownEvidenceMap.has(ref)) {
          errors.push(
            `${label} ${cleanString(entry.id || entry.title)} references missing evidence_map ${ref}`,
          );
        }
      }
    }
    for (const item of Object.values(entry)) {
      walk(item);
    }
  };
  walk(value);
  return errors;
}

export function assembleTopicArtifact(args: {
  manifest: Record<string, unknown>;
  sections: Record<string, unknown>;
}) {
  const artifact = {
    schema_id: "synthesis.topic_synthesis_artifact",
    schema_version: "2.0.0",
    language: cleanString(args.manifest.language) || "auto",
    ...args.sections,
  };
  return artifact;
}

export function renderTopicMarkdownExport(artifact: Record<string, unknown>) {
  const hasRenderableObjectContent = (value: Record<string, unknown>) => {
    for (const [key, entry] of Object.entries(value)) {
      if (key === "schema_id" || key === "schema_version") {
        continue;
      }
      if (Array.isArray(entry) && entry.length) {
        return true;
      }
      if (isObject(entry) && Object.keys(entry).length) {
        return true;
      }
      if (cleanString(entry)) {
        return true;
      }
    }
    return false;
  };
  const topic = isObject(artifact.topic) ? artifact.topic : {};
  const summary = isObject(artifact.summary) ? artifact.summary : {};
  const diagnostics = isObject(artifact.diagnostics)
    ? artifact.diagnostics
    : {};
  const legacyFallback = Boolean(diagnostics.legacy_fallback);
  const title =
    cleanString(topic.title) || cleanString(topic.id) || "Topic Synthesis";
  const lines = [`# ${title}`, ""];
  const brief = cleanString(summary.brief || summary.summary);
  if (brief) {
    lines.push(brief, "");
  }
  const claims = Array.isArray(artifact.claims) ? artifact.claims : [];
  if (claims.length) {
    lines.push("## Claims", "");
    for (const claim of claims) {
      if (isObject(claim)) {
        lines.push(`- ${cleanString(claim.text) || cleanString(claim.id)}`);
      }
    }
    lines.push("");
  }
  const taxonomy = isObject(artifact.taxonomy) ? artifact.taxonomy : {};
  if (!legacyFallback && hasRenderableObjectContent(taxonomy)) {
    lines.push(
      "## Taxonomy",
      "",
      "```json",
      canonicalizeJson(taxonomy),
      "```",
      "",
    );
  }
  const comparison = isObject(artifact.comparison_matrix)
    ? artifact.comparison_matrix
    : {};
  if (hasRenderableObjectContent(comparison)) {
    lines.push(
      "## Comparison Matrix",
      "",
      "```json",
      canonicalizeJson(comparison),
      "```",
      "",
    );
  }
  const events = timelineEventRows(artifact.timeline_events);
  if (events.length) {
    lines.push("## Timeline", "");
    for (const event of events) {
      if (isObject(event)) {
        const year = cleanString(event.year);
        const label = cleanString(event.label || event.title);
        lines.push(`- ${year ? `${year}: ` : ""}${label}`);
      }
    }
    lines.push("");
  }
  const external = isObject(artifact.external_literature_analysis)
    ? artifact.external_literature_analysis
    : {};
  const externalSummary = cleanString(external.summary);
  if (externalSummary) {
    lines.push("## External Literature Analysis", "", externalSummary, "");
  }
  const debates = Array.isArray(artifact.debates) ? artifact.debates : [];
  if (debates.length) {
    lines.push("## Debates", "");
    for (const debate of debates) {
      if (isObject(debate)) {
        lines.push(
          `- ${cleanString(debate.title || debate.text || debate.id)}`,
        );
      }
    }
    lines.push("");
  }
  const gaps = Array.isArray(artifact.gaps) ? artifact.gaps : [];
  if (gaps.length) {
    lines.push("## Gaps", "");
    for (const gap of gaps) {
      if (isObject(gap)) {
        lines.push(`- ${cleanString(gap.title || gap.text || gap.id)}`);
      }
    }
    lines.push("");
  }
  const report = isObject(artifact.synthesis_report)
    ? artifact.synthesis_report
    : {};
  const reportBody = cleanString(
    report.body || report.markdown || report.text || report.report,
  );
  if (!legacyFallback && reportBody) {
    lines.push("## Synthesis Report", "", reportBody, "");
  }
  return `${lines.join("\n").replace(/\n+$/g, "")}\n`;
}

export function computeTopicCurrentHashes(args: {
  manifest: unknown;
  artifact: unknown;
  metadata: unknown;
  exportMarkdown: string;
  sections: Record<string, unknown>;
}) {
  const section_hashes = Object.fromEntries(
    Object.entries(args.sections || {}).map(([name, value]) => [
      name,
      hashCanonicalJson(value),
    ]),
  );
  const structuredHash = hashCanonicalJson(args.artifact);
  const markdownHash = hashMarkdown(args.exportMarkdown);
  return {
    manifest_hash: hashCanonicalJson(args.manifest),
    structured_hash: structuredHash,
    artifact_hash: structuredHash,
    markdown_hash: markdownHash,
    export_hash: markdownHash,
    metadata_hash: hashCanonicalJson(args.metadata),
    section_hashes,
  };
}

export function applyTopicSectionPatch(args: {
  currentManifest: Record<string, any>;
  currentSections?: Record<string, unknown>;
  patchManifest: Record<string, any>;
  changedSections: Record<string, unknown>;
}) {
  const read = args.patchManifest.base?.read_section_hashes || {};
  const replace = args.patchManifest.base?.replace_section_hashes || {};
  const current = args.currentManifest.section_hashes || {};
  for (const [section, hash] of Object.entries(read)) {
    if (current[section] !== hash) {
      return {
        status: "conflict",
        mismatches: [
          {
            name: `section:${section}`,
            base: hash,
            current: current[section] || "",
          },
        ],
      };
    }
  }
  for (const section of Object.keys(replace)) {
    if (!(section in read)) {
      return {
        status: "invalid",
        errors: [
          `${section} replace_section_hashes must be a subset of read_section_hashes`,
        ],
      };
    }
  }
  const nextSections = {
    ...(args.currentSections || {}),
    ...(args.changedSections || {}),
  };
  const nextSectionHashes = { ...current };
  for (const [section, entry] of Object.entries(
    args.patchManifest.patch?.sections || {},
  )) {
    if (isObject(entry)) {
      nextSectionHashes[section] = cleanString(entry.hash);
    }
  }
  return {
    status: "applied",
    sections: nextSections,
    nextManifest: {
      ...args.currentManifest,
      section_hashes: nextSectionHashes,
    },
  };
}

export function canonicalSectionFileName(section: string) {
  return `${section.replace(/_/g, "-")}.json`;
}

export function canonicalJsonText(value: unknown) {
  return `${canonicalizeJson(value)}\n`;
}
