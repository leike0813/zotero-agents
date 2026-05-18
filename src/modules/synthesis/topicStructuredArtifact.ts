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
  "evidence_map",
  "source_artifacts",
  "diagnostics",
] as const;

const PATCHABLE_SECTIONS: Set<string> = new Set(
  COMPLETE_SECTIONS.filter(
    (section) => section !== "topic",
  ),
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

export function validateTopicAnalysisManifest(input: unknown): ValidationResult<Record<string, unknown>> {
  const errors: string[] = [];
  if (!isObject(input)) {
    return { ok: false, errors: ["topic analysis manifest must be an object"] };
  }
  if ("markdown" in input) {
    errors.push("manifest must not embed markdown");
  }
  const schemaId = cleanString(input.schema_id);
  const operation = cleanString(input.operation);
  if (schemaId === "synthesis.topic_section_patch_manifest" || operation === "update_patch") {
    if (schemaId !== "synthesis.topic_section_patch_manifest") {
      errors.push("update_patch manifest schema_id must be synthesis.topic_section_patch_manifest");
    }
    if ("markdown_path" in input) {
      errors.push("update_patch manifest must not depend on markdown_path");
    }
    const base = isObject(input.base) ? input.base : {};
    const read = isObject(base.read_section_hashes) ? base.read_section_hashes : {};
    const replace = isObject(base.replace_section_hashes)
      ? base.replace_section_hashes
      : {};
    const patch = isObject(input.patch) ? input.patch : {};
    if (cleanString(patch.mode) !== "section_replace") {
      errors.push("section_patch patch.mode must be section_replace");
    }
    if (cleanString(patch.unchanged_section_policy) !== "inherit_current") {
      errors.push("section_patch unchanged_section_policy must be inherit_current");
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
        errors.push(`${section} replace_section_hashes must be a subset of read_section_hashes`);
      }
    }
    for (const [section, value] of Object.entries(sections)) {
      errors.push(...sectionEntryErrors(section, value));
    }
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
  return errors.length
    ? { ok: false, errors, manifest: input }
    : { ok: true, errors: [], manifest: input };
}

function evidenceIds(artifact: Record<string, unknown>) {
  const rows = Array.isArray(artifact.paper_evidence) ? artifact.paper_evidence : [];
  return new Set(
    rows
      .filter(isObject)
      .map((entry) => cleanString(entry.id))
      .filter(Boolean),
  );
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
    const refs = Array.isArray(row.evidence_refs) ? row.evidence_refs.map(cleanString) : [];
    if (!refs.length) {
      errors.push(`${args.label} ${cleanString(row.id)} requires evidence_refs`);
    }
    for (const ref of refs) {
      if (ref.startsWith("external:")) {
        errors.push(`${args.label} ${cleanString(row.id)} must not use external references as library paper evidence`);
      } else if (!args.knownEvidence.has(ref)) {
        errors.push(`${args.label} ${cleanString(row.id)} references missing paper_evidence ${ref}`);
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
    return { ok: false, errors: ["topic synthesis artifact must be an object"] };
  }
  if (cleanString(input.schema_id) !== "synthesis.topic_synthesis_artifact") {
    errors.push("artifact schema_id must be synthesis.topic_synthesis_artifact");
  }
  if (options.expectedLanguage && cleanString(input.language) !== options.expectedLanguage) {
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
      rows: input.timeline_events,
      knownEvidence,
    }),
    ...validateEvidenceMapRefs({
      label: "claim",
      rows: input.claims,
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
  const paperEvidence = Array.isArray(input.paper_evidence) ? input.paper_evidence : [];
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
      errors.push("paper_evidence.digest_ref.payload_type must be digest-markdown");
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
  errors.push(
    ...validateNestedEvidenceMapRefs("taxonomy", input.taxonomy, knownEvidenceMap),
    ...validateNestedEvidenceMapRefs("comparison_matrix", input.comparison_matrix, knownEvidenceMap),
    ...validateNestedEvidenceMapRefs("review_outline", input.review_outline, knownEvidenceMap),
  );
  return errors.length
    ? { ok: false, errors, artifact: input }
    : { ok: true, errors: [], artifact: input };
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
      errors.push(`${args.label} ${cleanString(row.id)} requires evidence_map_refs`);
    }
    for (const ref of refs) {
      if (!args.knownEvidenceMap.has(ref)) {
        errors.push(`${args.label} ${cleanString(row.id)} references missing evidence_map ${ref}`);
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
        errors.push(`${label} ${cleanString(entry.id || entry.title)} requires evidence_map_refs`);
      }
      for (const ref of refs) {
        if (!knownEvidenceMap.has(ref)) {
          errors.push(`${label} ${cleanString(entry.id || entry.title)} references missing evidence_map ${ref}`);
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
  const title = cleanString(topic.title) || cleanString(topic.id) || "Topic Synthesis";
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
  if (hasRenderableObjectContent(taxonomy)) {
    lines.push("## Taxonomy", "", "```json", canonicalizeJson(taxonomy), "```", "");
  }
  const comparison = isObject(artifact.comparison_matrix)
    ? artifact.comparison_matrix
    : {};
  if (hasRenderableObjectContent(comparison)) {
    lines.push("## Comparison Matrix", "", "```json", canonicalizeJson(comparison), "```", "");
  }
  const events = Array.isArray(artifact.timeline_events) ? artifact.timeline_events : [];
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
        lines.push(`- ${cleanString(debate.title || debate.text || debate.id)}`);
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
        mismatches: [{ name: `section:${section}`, base: hash, current: current[section] || "" }],
      };
    }
  }
  for (const section of Object.keys(replace)) {
    if (!(section in read)) {
      return {
        status: "invalid",
        errors: [`${section} replace_section_hashes must be a subset of read_section_hashes`],
      };
    }
  }
  const nextSections = {
    ...(args.currentSections || {}),
    ...(args.changedSections || {}),
  };
  const nextSectionHashes = { ...current };
  for (const [section, entry] of Object.entries(args.patchManifest.patch?.sections || {})) {
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
