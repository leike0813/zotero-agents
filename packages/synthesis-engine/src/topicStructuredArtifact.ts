import { canonicalizeSynthesisEngineJson } from "./canonicalJson.ts";

export const SYNTHESIS_TOPIC_STRUCTURED_ARTIFACT_CONTRACT_VERSION =
  "synthesis-topic-structured-artifact.v1" as const;
export const SYNTHESIS_TOPIC_MANIFEST_VALIDATION_VERSION =
  "topic-analysis-manifest-validation.v1" as const;
export const SYNTHESIS_TOPIC_ARTIFACT_ASSEMBLY_VERSION =
  "topic-structured-artifact-assembly.v1" as const;
export const SYNTHESIS_TOPIC_ARTIFACT_VALIDATION_VERSION =
  "topic-structured-artifact-validation.v1" as const;
export const SYNTHESIS_TOPIC_SECTION_PATCH_VERSION =
  "topic-section-patch.v1" as const;

export const SYNTHESIS_TOPIC_STRUCTURED_ARTIFACT_JSON_DEPTH_MAX = 32;
export const SYNTHESIS_TOPIC_STRUCTURED_ARTIFACT_ARRAY_MAX = 25_000;
export const SYNTHESIS_TOPIC_STRUCTURED_ARTIFACT_OBJECT_PROPERTY_MAX = 1_024;
export const SYNTHESIS_TOPIC_STRUCTURED_ARTIFACT_JSON_NODE_MAX = 1_000_000;
export const SYNTHESIS_TOPIC_STRUCTURED_ARTIFACT_STRING_MAX = 1024 * 1024;
export const SYNTHESIS_TOPIC_STRUCTURED_ARTIFACT_TOTAL_STRING_MAX =
  32 * 1024 * 1024;
export const SYNTHESIS_TOPIC_STRUCTURED_ARTIFACT_CHECKPOINT_INTERVAL = 256;

export type SynthesisTopicJsonValue =
  | null
  | boolean
  | number
  | string
  | SynthesisTopicJsonValue[]
  | { [key: string]: SynthesisTopicJsonValue };

export type SynthesisTopicJsonObject = {
  [key: string]: SynthesisTopicJsonValue;
};

export type SynthesisTopicStructuredArtifactCheckpoint = {
  phase:
    | "start"
    | "manifest"
    | "sections"
    | "artifact"
    | "source_refs"
    | "content_depth"
    | "patch"
    | "complete";
  processedCount: number;
};

export type SynthesisTopicStructuredArtifactEngineOptions = {
  checkpoint?: (checkpoint: SynthesisTopicStructuredArtifactCheckpoint) => void;
  checkpointInterval?: number;
};

export type SynthesisTopicStructuredArtifactContractBounds = {
  depthMax?: number;
  arrayMax?: number;
  objectPropertyMax?: number;
  nodeMax?: number;
  stringMax?: number;
  totalStringMax?: number;
};

type ResolvedContractBounds = {
  depthMax: number;
  arrayMax: number;
  objectPropertyMax: number;
  nodeMax: number;
  stringMax: number;
  totalStringMax: number;
};

type TraversalState = {
  nodes: number;
  strings: number;
  seen: Set<object>;
  phase: SynthesisTopicStructuredArtifactCheckpoint["phase"];
  options: SynthesisTopicStructuredArtifactEngineOptions;
  bounds: ResolvedContractBounds;
};

export type SynthesisTopicManifestValidationRequest = {
  contractVersion: typeof SYNTHESIS_TOPIC_STRUCTURED_ARTIFACT_CONTRACT_VERSION;
  algorithmVersion: typeof SYNTHESIS_TOPIC_MANIFEST_VALIDATION_VERSION;
  manifest: SynthesisTopicJsonValue;
};

export type SynthesisTopicArtifactAssemblyRequest = {
  contractVersion: typeof SYNTHESIS_TOPIC_STRUCTURED_ARTIFACT_CONTRACT_VERSION;
  algorithmVersion: typeof SYNTHESIS_TOPIC_ARTIFACT_ASSEMBLY_VERSION;
  manifest: SynthesisTopicJsonObject;
  sections: Record<string, SynthesisTopicJsonValue>;
};

export type SynthesisTopicArtifactValidationRequest = {
  contractVersion: typeof SYNTHESIS_TOPIC_STRUCTURED_ARTIFACT_CONTRACT_VERSION;
  algorithmVersion: typeof SYNTHESIS_TOPIC_ARTIFACT_VALIDATION_VERSION;
  artifact: SynthesisTopicJsonValue;
  expectedLanguage?: string;
};

export type SynthesisTopicSectionPatchRequest = {
  contractVersion: typeof SYNTHESIS_TOPIC_STRUCTURED_ARTIFACT_CONTRACT_VERSION;
  algorithmVersion: typeof SYNTHESIS_TOPIC_SECTION_PATCH_VERSION;
  currentManifest: SynthesisTopicJsonObject;
  currentSections: Record<string, SynthesisTopicJsonValue>;
  patchManifest: SynthesisTopicJsonObject;
  changedSections: Record<string, SynthesisTopicJsonValue>;
};

export type SynthesisTopicValidationResult = {
  contractVersion: typeof SYNTHESIS_TOPIC_STRUCTURED_ARTIFACT_CONTRACT_VERSION;
  algorithmVersion:
    | typeof SYNTHESIS_TOPIC_MANIFEST_VALIDATION_VERSION
    | typeof SYNTHESIS_TOPIC_ARTIFACT_VALIDATION_VERSION;
  ok: boolean;
  errors: string[];
};

export type SynthesisTopicArtifactAssemblyResult = {
  contractVersion: typeof SYNTHESIS_TOPIC_STRUCTURED_ARTIFACT_CONTRACT_VERSION;
  algorithmVersion: typeof SYNTHESIS_TOPIC_ARTIFACT_ASSEMBLY_VERSION;
  artifact: SynthesisTopicJsonObject;
};

export type SynthesisTopicSectionPatchResult =
  | {
      contractVersion: typeof SYNTHESIS_TOPIC_STRUCTURED_ARTIFACT_CONTRACT_VERSION;
      algorithmVersion: typeof SYNTHESIS_TOPIC_SECTION_PATCH_VERSION;
      status: "conflict";
      mismatches: Array<{ name: string; base: string; current: string }>;
    }
  | {
      contractVersion: typeof SYNTHESIS_TOPIC_STRUCTURED_ARTIFACT_CONTRACT_VERSION;
      algorithmVersion: typeof SYNTHESIS_TOPIC_SECTION_PATCH_VERSION;
      status: "invalid";
      errors: string[];
    }
  | {
      contractVersion: typeof SYNTHESIS_TOPIC_STRUCTURED_ARTIFACT_CONTRACT_VERSION;
      algorithmVersion: typeof SYNTHESIS_TOPIC_SECTION_PATCH_VERSION;
      status: "applied";
      sections: Record<string, SynthesisTopicJsonValue>;
      nextSectionHashes: Record<string, string>;
    };

export interface SynthesisTopicStructuredArtifactEngine {
  validateManifest(
    request: SynthesisTopicManifestValidationRequest,
  ): Promise<SynthesisTopicValidationResult>;
  assembleArtifact(
    request: SynthesisTopicArtifactAssemblyRequest,
  ): Promise<SynthesisTopicArtifactAssemblyResult>;
  validateArtifact(
    request: SynthesisTopicArtifactValidationRequest,
  ): Promise<SynthesisTopicValidationResult>;
  applySectionPatch(
    request: SynthesisTopicSectionPatchRequest,
  ): Promise<SynthesisTopicSectionPatchResult>;
}

export class SynthesisTopicStructuredArtifactContractError extends Error {
  readonly code = "invalid_request";

  constructor(message: string) {
    super(message);
    this.name = "SynthesisTopicStructuredArtifactContractError";
  }
}

function contractInvalid(message: string): never {
  throw new SynthesisTopicStructuredArtifactContractError(message);
}

function resolveContractBounds(
  bounds: SynthesisTopicStructuredArtifactContractBounds = {},
): ResolvedContractBounds {
  return {
    depthMax:
      bounds.depthMax ?? SYNTHESIS_TOPIC_STRUCTURED_ARTIFACT_JSON_DEPTH_MAX,
    arrayMax: bounds.arrayMax ?? SYNTHESIS_TOPIC_STRUCTURED_ARTIFACT_ARRAY_MAX,
    objectPropertyMax:
      bounds.objectPropertyMax ??
      SYNTHESIS_TOPIC_STRUCTURED_ARTIFACT_OBJECT_PROPERTY_MAX,
    nodeMax:
      bounds.nodeMax ?? SYNTHESIS_TOPIC_STRUCTURED_ARTIFACT_JSON_NODE_MAX,
    stringMax:
      bounds.stringMax ?? SYNTHESIS_TOPIC_STRUCTURED_ARTIFACT_STRING_MAX,
    totalStringMax:
      bounds.totalStringMax ??
      SYNTHESIS_TOPIC_STRUCTURED_ARTIFACT_TOTAL_STRING_MAX,
  };
}

function contractCheckpoint(state: TraversalState, force = false): void {
  const interval = Math.max(
    1,
    Math.floor(
      state.options.checkpointInterval ??
        SYNTHESIS_TOPIC_STRUCTURED_ARTIFACT_CHECKPOINT_INTERVAL,
    ),
  );
  if (force || state.nodes % interval === 0) {
    state.options.checkpoint?.({
      phase: state.phase,
      processedCount: state.nodes,
    });
  }
}

function isPlainJsonObject(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function rebuildJsonValue(
  value: unknown,
  location: string,
  state: TraversalState,
  depth = 0,
): SynthesisTopicJsonValue {
  if (depth > state.bounds.depthMax) {
    contractInvalid(`${location} exceeds the JSON depth bound`);
  }
  state.nodes += 1;
  if (state.nodes > state.bounds.nodeMax) {
    contractInvalid(`${location} exceeds the JSON node bound`);
  }
  contractCheckpoint(state);
  if (value === null || typeof value === "boolean") {
    return value;
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      contractInvalid(`${location} must contain finite numbers`);
    }
    return value;
  }
  if (typeof value === "string") {
    if (value.length > state.bounds.stringMax) {
      contractInvalid(`${location} exceeds the string bound`);
    }
    state.strings += value.length;
    if (state.strings > state.bounds.totalStringMax) {
      contractInvalid(`${location} exceeds the total string bound`);
    }
    return value;
  }
  if (!value || typeof value !== "object") {
    contractInvalid(`${location} must be JSON-safe`);
  }
  const object = value as object;
  if (state.seen.has(object)) {
    contractInvalid(`${location} must not contain cycles`);
  }
  state.seen.add(object);
  try {
    if (Array.isArray(value)) {
      if (value.length > state.bounds.arrayMax) {
        contractInvalid(`${location} exceeds the array bound`);
      }
      return value.map((entry, index) =>
        rebuildJsonValue(entry, `${location}[${index}]`, state, depth + 1),
      );
    }
    if (!isPlainJsonObject(value)) {
      contractInvalid(`${location} must contain plain objects`);
    }
    const entries = Object.entries(value);
    if (entries.length > state.bounds.objectPropertyMax) {
      contractInvalid(`${location} exceeds the object property bound`);
    }
    return Object.fromEntries(
      entries.map(([key, entry]) => [
        key,
        rebuildJsonValue(entry, `${location}.${key}`, state, depth + 1),
      ]),
    );
  } finally {
    state.seen.delete(object);
  }
}

function createTraversalState(
  phase: SynthesisTopicStructuredArtifactCheckpoint["phase"],
  bounds: SynthesisTopicStructuredArtifactContractBounds = {},
  options: SynthesisTopicStructuredArtifactEngineOptions = {},
): TraversalState {
  const state: TraversalState = {
    nodes: 0,
    strings: 0,
    seen: new Set(),
    phase,
    options,
    bounds: resolveContractBounds(bounds),
  };
  contractCheckpoint(state, true);
  return state;
}

function requestObject(value: unknown, location: string) {
  if (!isPlainJsonObject(value)) {
    contractInvalid(`${location} must be an object`);
  }
  return value;
}

function requestVersion(
  row: Record<string, unknown>,
  algorithmVersion: string,
): void {
  if (
    row.contractVersion !==
      SYNTHESIS_TOPIC_STRUCTURED_ARTIFACT_CONTRACT_VERSION ||
    row.algorithmVersion !== algorithmVersion
  ) {
    contractInvalid("structured artifact request version is invalid");
  }
}

function requiredJsonObject(
  value: unknown,
  location: string,
  phase: SynthesisTopicStructuredArtifactCheckpoint["phase"],
  bounds: SynthesisTopicStructuredArtifactContractBounds,
  options: SynthesisTopicStructuredArtifactEngineOptions,
  sharedState?: TraversalState,
): SynthesisTopicJsonObject {
  const state = sharedState || createTraversalState(phase, bounds, options);
  state.phase = phase;
  const rebuilt = rebuildJsonValue(value, location, state);
  if (!isPlainJsonObject(rebuilt)) {
    contractInvalid(`${location} must be an object`);
  }
  return rebuilt as SynthesisTopicJsonObject;
}

function requiredJsonValue(
  value: unknown,
  location: string,
  phase: SynthesisTopicStructuredArtifactCheckpoint["phase"],
  bounds: SynthesisTopicStructuredArtifactContractBounds,
  options: SynthesisTopicStructuredArtifactEngineOptions,
  sharedState?: TraversalState,
): SynthesisTopicJsonValue {
  const state = sharedState || createTraversalState(phase, bounds, options);
  state.phase = phase;
  return rebuildJsonValue(value, location, state);
}

function optionalExpectedLanguage(value: unknown) {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }
  if (typeof value !== "string") {
    contractInvalid("expectedLanguage must be a string");
  }
  if (value.length > SYNTHESIS_TOPIC_STRUCTURED_ARTIFACT_STRING_MAX) {
    contractInvalid("expectedLanguage exceeds the string bound");
  }
  return value;
}

function sameCanonicalJson(left: unknown, right: unknown) {
  return (
    canonicalizeSynthesisEngineJson(left) ===
    canonicalizeSynthesisEngineJson(right)
  );
}

const COMPLETE_SECTIONS = [
  "topic",
  "summary",
  "taxonomy",
  "improvement_dimensions",
  "claims",
  "timeline_events",
  "source_papers",
  "debates",
  "coverage",
  "future_directions",
  "review_outline",
  "statistics",
  "synthesis_report",
  "source_artifacts",
  "diagnostics",
] as const;

const LEGACY_EVIDENCE_FIELDS = new Set([
  "paper_evidence",
  "evidence_map",
  "evidence_refs",
  "paper_evidence_refs",
  "evidence_map_refs",
]);

const PATCHABLE_SECTIONS: Set<string> = new Set(
  COMPLETE_SECTIONS.filter((section) => section !== "topic"),
);

type SectionName = (typeof COMPLETE_SECTIONS)[number];

const REMOVED_COMPLETE_SECTIONS = new Set([
  "improvement_dimension_summary",
  "external_literature_analysis",
  "gaps",
  "positioning",
]);

const TAXONOMY_AXIS_TYPES = new Set([
  "problem_formulation",
  "technical_mechanism",
  "evidence_scope",
  "research_route",
  "application_context",
]);

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

function taxonomyRouteRows(taxonomy: Record<string, unknown>) {
  const axes = Array.isArray(taxonomy.axes) ? taxonomy.axes : [];
  const axisRows = axes.flatMap((axis) => {
    if (!isObject(axis) || !Array.isArray(axis.nodes)) {
      return [];
    }
    return axis.nodes;
  });
  if (axisRows.length) {
    return axisRows;
  }
  return Array.isArray(taxonomy.nodes) ? taxonomy.nodes : [];
}

function sectionEntryErrors(section: string, value: unknown) {
  const errors: string[] = [];
  if (!isObject(value)) {
    return [`${section} section entry must be an object`];
  }
  if (!cleanString(value.path)) {
    errors.push(`${section}.path is required`);
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
    "prospective_topic_relation_proposals",
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
  for (const section of REMOVED_COMPLETE_SECTIONS) {
    if (section in sections) {
      errors.push(`sections.${section} is not part of the current contract`);
    }
  }
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

function legacyEvidenceFieldErrors(value: unknown, path = "artifact") {
  const errors: string[] = [];
  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      errors.push(...legacyEvidenceFieldErrors(item, `${path}[${index}]`));
    });
    return errors;
  }
  if (!isObject(value)) {
    return errors;
  }
  for (const [key, child] of Object.entries(value)) {
    if (LEGACY_EVIDENCE_FIELDS.has(key)) {
      errors.push(`${path}.${key} is not part of source_paper_refs contract`);
    }
    errors.push(...legacyEvidenceFieldErrors(child, `${path}.${key}`));
  }
  return errors;
}

function sourcePaperIds(artifact: Record<string, unknown>) {
  const rows = Array.isArray(artifact.source_papers)
    ? artifact.source_papers
    : [];
  return new Set(
    rows
      .filter(isObject)
      .map((entry) => cleanString(entry.paper_ref))
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

function improvementDimensionRows(value: unknown) {
  if (isObject(value)) {
    return Array.isArray(value.dimensions) ? value.dimensions : [];
  }
  return Array.isArray(value) ? value : [];
}

function validateSourcePaperRefs(args: {
  label: string;
  rows: unknown;
  knownSourcePapers: Set<string>;
  requireProperty?: boolean;
}) {
  const errors: string[] = [];
  for (const row of Array.isArray(args.rows) ? args.rows : []) {
    if (!isObject(row)) {
      continue;
    }
    const hasRefs = "source_paper_refs" in row;
    const refs = Array.isArray(row.source_paper_refs)
      ? row.source_paper_refs.map(cleanString).filter(Boolean)
      : [];
    if (args.requireProperty && !hasRefs) {
      errors.push(
        `${args.label} ${cleanString(row.id)} requires source_paper_refs`,
      );
    }
    for (const ref of refs) {
      if (!args.knownSourcePapers.has(ref)) {
        errors.push(
          `${args.label} ${cleanString(row.id)} references missing source_papers ${ref}`,
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
  errors.push(...legacyEvidenceFieldErrors(input));
  for (const section of REMOVED_COMPLETE_SECTIONS) {
    if (section in input) {
      errors.push(`artifact.${section} is not part of the current contract`);
    }
  }
  for (const section of COMPLETE_SECTIONS) {
    if (!(section in input)) {
      errors.push(`artifact.${section} is required`);
    }
  }
  const knownSourcePapers = sourcePaperIds(input);
  errors.push(
    ...validateSourcePaperRefs({
      label: "claim",
      rows: input.claims,
      knownSourcePapers,
      requireProperty: true,
    }),
    ...validateSourcePaperRefs({
      label: "timeline",
      rows: timelineEventRows(input.timeline_events),
      knownSourcePapers,
      requireProperty: true,
    }),
    ...validateSourcePaperRefs({
      label: "debate",
      rows: input.debates,
      knownSourcePapers,
      requireProperty: true,
    }),
    ...validateSourcePaperRefs({
      label: "future_directions",
      rows: input.future_directions,
      knownSourcePapers,
      requireProperty: true,
    }),
  );
  const sourcePapers = Array.isArray(input.source_papers)
    ? input.source_papers
    : [];
  for (const entry of sourcePapers) {
    if (!isObject(entry)) {
      errors.push("source_papers entries must be objects");
      continue;
    }
    if (!cleanString(entry.paper_ref)) {
      errors.push("source_papers.paper_ref is required");
    }
    const digestRef = isObject(entry.digest_ref) ? entry.digest_ref : {};
    if (cleanString(digestRef.payload_type) !== "digest-markdown") {
      errors.push(
        "source_papers.digest_ref.payload_type must be digest-markdown",
      );
    }
  }
  errors.push(...validateContentDepth(input));
  errors.push(...reviewOutlineErrors(input));
  errors.push(
    ...validateNestedSourcePaperRefs(
      "taxonomy",
      input.taxonomy,
      knownSourcePapers,
    ),
    ...validateSourcePaperRefs({
      label: "improvement_dimensions",
      rows: improvementDimensionRows(input.improvement_dimensions),
      knownSourcePapers,
      requireProperty: true,
    }),
    ...validateNestedSourcePaperRefs(
      "review_outline",
      input.review_outline,
      knownSourcePapers,
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
  const taxonomyNodes = taxonomyRouteRows(taxonomy);
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

  const improvementDimensions = improvementDimensionRows(
    artifact.improvement_dimensions,
  );
  const debates = Array.isArray(artifact.debates) ? artifact.debates : [];
  if (!improvementDimensions.length && !debates.length) {
    errors.push("improvement dimensions/debates");
  }

  const coverage = isObject(artifact.coverage) ? artifact.coverage : {};
  if (
    !cleanString(coverage.coverage_verdict) ||
    !cleanString(coverage.coverage_reason) ||
    !Array.isArray(coverage.coverage_caveats) ||
    !cleanString(coverage.external_context_summary) ||
    !Array.isArray(coverage.suggested_collection_directions)
  ) {
    errors.push("coverage");
  }
  return errors;
}

function reviewOutlineErrors(artifact: Record<string, unknown>) {
  const errors: string[] = [];
  const outline = isObject(artifact.review_outline)
    ? artifact.review_outline
    : {};
  if (!cleanString(outline.topic_importance)) {
    errors.push("review_outline.topic_importance is required");
  }
  const strategies = Array.isArray(outline.writing_strategies)
    ? outline.writing_strategies
    : [];
  if (!strategies.length) {
    errors.push("review_outline.writing_strategies is required");
  }
  const ids = new Set<string>();
  strategies.forEach((strategy, index) => {
    if (!isObject(strategy)) {
      errors.push(
        `review_outline.writing_strategies[${index}] must be an object`,
      );
      return;
    }
    const id = cleanString(strategy.id);
    if (id) {
      ids.add(id);
    } else {
      errors.push(`review_outline.writing_strategies[${index}].id is required`);
    }
    for (const key of [
      "title",
      "review_thesis",
      "writing_strategy",
      "best_for",
      "risks",
    ]) {
      if (!cleanString(strategy[key])) {
        errors.push(
          `review_outline.writing_strategies[${index}].${key} is required`,
        );
      }
    }
    if (
      !Array.isArray(strategy.section_plan) ||
      !strategy.section_plan.some((entry) => cleanString(entry))
    ) {
      errors.push(
        `review_outline.writing_strategies[${index}].section_plan is required`,
      );
    }
  });
  const recommended = cleanString(outline.recommended_strategy_id);
  if (!recommended || !ids.has(recommended)) {
    errors.push(
      "review_outline.recommended_strategy_id must match a strategy id",
    );
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
  const taxonomyNodes = taxonomyRouteRows(taxonomy);
  const taxonomyAxes = Array.isArray(taxonomy.axes) ? taxonomy.axes : [];
  const legacyTaxonomyNodes = Array.isArray(taxonomy.nodes)
    ? taxonomy.nodes
    : [];
  if (taxonomyAxes.length) {
    if (
      (taxonomyAxes.length < 2 && !legacyTaxonomyNodes.length) ||
      taxonomyAxes.length > 5
    ) {
      errors.push("taxonomy.axes requires 2-5 classification axes");
    }
    taxonomyAxes.forEach((axis, index) => {
      if (!isObject(axis)) {
        errors.push(`taxonomy axis ${index + 1} must be an object`);
        return;
      }
      const axisType = cleanString(axis.axis_type);
      if (!TAXONOMY_AXIS_TYPES.has(axisType)) {
        errors.push(`taxonomy axis ${index + 1} has invalid axis_type`);
      }
      if (!Array.isArray(axis.nodes) || !axis.nodes.length) {
        errors.push(`taxonomy axis ${axisType || index + 1} requires nodes`);
      }
    });
  }
  const taxonomySummary = isObject(taxonomy.summary) ? taxonomy.summary : {};
  if (!isObject(taxonomy.summary)) {
    errors.push("taxonomy.summary is required");
  } else if (!hasAnyKey(taxonomySummary, ["text", "analysis", "overview"])) {
    errors.push("taxonomy.summary requires text/analysis");
  }
  if (!taxonomyNodes.length) {
    errors.push("taxonomy.axes requires at least one research route");
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
      source_paper_refs: ["source_paper_refs"],
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

function validateNestedSourcePaperRefs(
  label: string,
  value: unknown,
  knownSourcePapers: Set<string>,
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
    if ("source_paper_refs" in entry) {
      const refs = Array.isArray(entry.source_paper_refs)
        ? entry.source_paper_refs.map(cleanString).filter(Boolean)
        : [];
      for (const ref of refs) {
        if (!knownSourcePapers.has(ref)) {
          errors.push(
            `${label} ${cleanString(entry.id || entry.title)} references missing source_papers ${ref}`,
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
    schema_version: "3.0.0",
    language: cleanString(args.manifest.language) || "auto",
    ...args.sections,
  };
  return artifact;
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

function engineCheckpoint(
  options: SynthesisTopicStructuredArtifactEngineOptions,
  phase: SynthesisTopicStructuredArtifactCheckpoint["phase"],
  processedCount = 0,
) {
  options.checkpoint?.({ phase, processedCount });
}

export function rebuildSynthesisTopicManifestValidationRequest(
  input: unknown,
  bounds: SynthesisTopicStructuredArtifactContractBounds = {},
  options: SynthesisTopicStructuredArtifactEngineOptions = {},
): SynthesisTopicManifestValidationRequest {
  const row = requestObject(input, "request");
  requestVersion(row, SYNTHESIS_TOPIC_MANIFEST_VALIDATION_VERSION);
  return {
    contractVersion: SYNTHESIS_TOPIC_STRUCTURED_ARTIFACT_CONTRACT_VERSION,
    algorithmVersion: SYNTHESIS_TOPIC_MANIFEST_VALIDATION_VERSION,
    manifest: requiredJsonValue(
      row.manifest,
      "request.manifest",
      "manifest",
      bounds,
      options,
    ),
  };
}

export function rebuildSynthesisTopicArtifactAssemblyRequest(
  input: unknown,
  bounds: SynthesisTopicStructuredArtifactContractBounds = {},
  options: SynthesisTopicStructuredArtifactEngineOptions = {},
): SynthesisTopicArtifactAssemblyRequest {
  const row = requestObject(input, "request");
  requestVersion(row, SYNTHESIS_TOPIC_ARTIFACT_ASSEMBLY_VERSION);
  const state = createTraversalState("manifest", bounds, options);
  return {
    contractVersion: SYNTHESIS_TOPIC_STRUCTURED_ARTIFACT_CONTRACT_VERSION,
    algorithmVersion: SYNTHESIS_TOPIC_ARTIFACT_ASSEMBLY_VERSION,
    manifest: requiredJsonObject(
      row.manifest,
      "request.manifest",
      "manifest",
      bounds,
      options,
      state,
    ),
    sections: requiredJsonObject(
      row.sections,
      "request.sections",
      "sections",
      bounds,
      options,
      state,
    ),
  };
}

export function rebuildSynthesisTopicArtifactValidationRequest(
  input: unknown,
  bounds: SynthesisTopicStructuredArtifactContractBounds = {},
  options: SynthesisTopicStructuredArtifactEngineOptions = {},
): SynthesisTopicArtifactValidationRequest {
  const row = requestObject(input, "request");
  requestVersion(row, SYNTHESIS_TOPIC_ARTIFACT_VALIDATION_VERSION);
  const expectedLanguage = optionalExpectedLanguage(row.expectedLanguage);
  return {
    contractVersion: SYNTHESIS_TOPIC_STRUCTURED_ARTIFACT_CONTRACT_VERSION,
    algorithmVersion: SYNTHESIS_TOPIC_ARTIFACT_VALIDATION_VERSION,
    artifact: requiredJsonValue(
      row.artifact,
      "request.artifact",
      "artifact",
      bounds,
      options,
    ),
    ...(expectedLanguage ? { expectedLanguage } : {}),
  };
}

export function rebuildSynthesisTopicSectionPatchRequest(
  input: unknown,
  bounds: SynthesisTopicStructuredArtifactContractBounds = {},
  options: SynthesisTopicStructuredArtifactEngineOptions = {},
): SynthesisTopicSectionPatchRequest {
  const row = requestObject(input, "request");
  requestVersion(row, SYNTHESIS_TOPIC_SECTION_PATCH_VERSION);
  const state = createTraversalState("manifest", bounds, options);
  return {
    contractVersion: SYNTHESIS_TOPIC_STRUCTURED_ARTIFACT_CONTRACT_VERSION,
    algorithmVersion: SYNTHESIS_TOPIC_SECTION_PATCH_VERSION,
    currentManifest: requiredJsonObject(
      row.currentManifest,
      "request.currentManifest",
      "manifest",
      bounds,
      options,
      state,
    ),
    currentSections: requiredJsonObject(
      row.currentSections,
      "request.currentSections",
      "sections",
      bounds,
      options,
      state,
    ),
    patchManifest: requiredJsonObject(
      row.patchManifest,
      "request.patchManifest",
      "patch",
      bounds,
      options,
      state,
    ),
    changedSections: requiredJsonObject(
      row.changedSections,
      "request.changedSections",
      "sections",
      bounds,
      options,
      state,
    ),
  };
}

function computeManifestValidationResult(
  request: SynthesisTopicManifestValidationRequest,
): SynthesisTopicValidationResult {
  const result = validateTopicAnalysisManifest(request.manifest);
  return {
    contractVersion: SYNTHESIS_TOPIC_STRUCTURED_ARTIFACT_CONTRACT_VERSION,
    algorithmVersion: SYNTHESIS_TOPIC_MANIFEST_VALIDATION_VERSION,
    ok: result.ok,
    errors: result.errors,
  };
}

function computeArtifactAssemblyResult(
  request: SynthesisTopicArtifactAssemblyRequest,
): SynthesisTopicArtifactAssemblyResult {
  return {
    contractVersion: SYNTHESIS_TOPIC_STRUCTURED_ARTIFACT_CONTRACT_VERSION,
    algorithmVersion: SYNTHESIS_TOPIC_ARTIFACT_ASSEMBLY_VERSION,
    artifact: assembleTopicArtifact({
      manifest: request.manifest,
      sections: request.sections,
    }) as SynthesisTopicJsonObject,
  };
}

function computeArtifactValidationResult(
  request: SynthesisTopicArtifactValidationRequest,
): SynthesisTopicValidationResult {
  const result = validateTopicSynthesisArtifact(request.artifact, {
    expectedLanguage: request.expectedLanguage,
  });
  return {
    contractVersion: SYNTHESIS_TOPIC_STRUCTURED_ARTIFACT_CONTRACT_VERSION,
    algorithmVersion: SYNTHESIS_TOPIC_ARTIFACT_VALIDATION_VERSION,
    ok: result.ok,
    errors: result.errors,
  };
}

function stringMap(value: unknown) {
  if (!isObject(value)) {
    return {};
  }
  return Object.fromEntries(
    Object.entries(value).map(([key, entry]) => [key, cleanString(entry)]),
  );
}

function computeSectionPatchResult(
  request: SynthesisTopicSectionPatchRequest,
): SynthesisTopicSectionPatchResult {
  const result = applyTopicSectionPatch({
    currentManifest: request.currentManifest,
    currentSections: request.currentSections,
    patchManifest: request.patchManifest,
    changedSections: request.changedSections,
  });
  if (result.status === "conflict") {
    return {
      contractVersion: SYNTHESIS_TOPIC_STRUCTURED_ARTIFACT_CONTRACT_VERSION,
      algorithmVersion: SYNTHESIS_TOPIC_SECTION_PATCH_VERSION,
      status: "conflict",
      mismatches: (result.mismatches || []).map((mismatch) => ({
        name: cleanString(mismatch.name),
        base: cleanString(mismatch.base),
        current: cleanString(mismatch.current),
      })),
    };
  }
  if (result.status === "invalid") {
    return {
      contractVersion: SYNTHESIS_TOPIC_STRUCTURED_ARTIFACT_CONTRACT_VERSION,
      algorithmVersion: SYNTHESIS_TOPIC_SECTION_PATCH_VERSION,
      status: "invalid",
      errors: result.errors || [],
    };
  }
  return {
    contractVersion: SYNTHESIS_TOPIC_STRUCTURED_ARTIFACT_CONTRACT_VERSION,
    algorithmVersion: SYNTHESIS_TOPIC_SECTION_PATCH_VERSION,
    status: "applied",
    sections: result.sections as Record<string, SynthesisTopicJsonValue>,
    nextSectionHashes: stringMap(result.nextManifest?.section_hashes),
  };
}

function rebuiltErrors(value: unknown, location: string) {
  if (
    !Array.isArray(value) ||
    value.some((entry) => typeof entry !== "string")
  ) {
    contractInvalid(`${location} must be a string array`);
  }
  return [...value] as string[];
}

function rebuiltValidationResult(
  input: unknown,
  expected: SynthesisTopicValidationResult,
): SynthesisTopicValidationResult {
  const row = requestObject(input, "result");
  const rebuilt: SynthesisTopicValidationResult = {
    contractVersion: SYNTHESIS_TOPIC_STRUCTURED_ARTIFACT_CONTRACT_VERSION,
    algorithmVersion: expected.algorithmVersion,
    ok:
      typeof row.ok === "boolean"
        ? row.ok
        : contractInvalid("result.ok must be a boolean"),
    errors: rebuiltErrors(row.errors, "result.errors"),
  };
  if (
    row.contractVersion !== rebuilt.contractVersion ||
    row.algorithmVersion !== rebuilt.algorithmVersion ||
    !sameCanonicalJson(rebuilt, expected)
  ) {
    contractInvalid("validation result does not match the request");
  }
  return rebuilt;
}

export function rebuildSynthesisTopicManifestValidationResult(
  input: unknown,
  requestInput: unknown,
  bounds: SynthesisTopicStructuredArtifactContractBounds = {},
): SynthesisTopicValidationResult {
  const request = rebuildSynthesisTopicManifestValidationRequest(
    requestInput,
    bounds,
  );
  return rebuiltValidationResult(
    input,
    computeManifestValidationResult(request),
  );
}

export function rebuildSynthesisTopicArtifactValidationResult(
  input: unknown,
  requestInput: unknown,
  bounds: SynthesisTopicStructuredArtifactContractBounds = {},
): SynthesisTopicValidationResult {
  const request = rebuildSynthesisTopicArtifactValidationRequest(
    requestInput,
    bounds,
  );
  return rebuiltValidationResult(
    input,
    computeArtifactValidationResult(request),
  );
}

export function rebuildSynthesisTopicArtifactAssemblyResult(
  input: unknown,
  requestInput: unknown,
  bounds: SynthesisTopicStructuredArtifactContractBounds = {},
): SynthesisTopicArtifactAssemblyResult {
  const request = rebuildSynthesisTopicArtifactAssemblyRequest(
    requestInput,
    bounds,
  );
  const row = requestObject(input, "result");
  const rebuilt: SynthesisTopicArtifactAssemblyResult = {
    contractVersion: SYNTHESIS_TOPIC_STRUCTURED_ARTIFACT_CONTRACT_VERSION,
    algorithmVersion: SYNTHESIS_TOPIC_ARTIFACT_ASSEMBLY_VERSION,
    artifact: requiredJsonObject(
      row.artifact,
      "result.artifact",
      "artifact",
      bounds,
      {},
    ),
  };
  if (
    row.contractVersion !== rebuilt.contractVersion ||
    row.algorithmVersion !== rebuilt.algorithmVersion ||
    !sameCanonicalJson(rebuilt, computeArtifactAssemblyResult(request))
  ) {
    contractInvalid("assembly result does not match the request");
  }
  return rebuilt;
}

function rebuiltMismatches(value: unknown) {
  if (!Array.isArray(value)) {
    contractInvalid("result.mismatches must be an array");
  }
  return value.map((entry, index) => {
    const row = requestObject(entry, `result.mismatches[${index}]`);
    for (const field of ["name", "base", "current"] as const) {
      if (typeof row[field] !== "string") {
        contractInvalid(
          `result.mismatches[${index}].${field} must be a string`,
        );
      }
    }
    return {
      name: row.name as string,
      base: row.base as string,
      current: row.current as string,
    };
  });
}

export function rebuildSynthesisTopicSectionPatchResult(
  input: unknown,
  requestInput: unknown,
  bounds: SynthesisTopicStructuredArtifactContractBounds = {},
): SynthesisTopicSectionPatchResult {
  const request = rebuildSynthesisTopicSectionPatchRequest(
    requestInput,
    bounds,
  );
  const row = requestObject(input, "result");
  let rebuilt: SynthesisTopicSectionPatchResult;
  if (row.status === "conflict") {
    rebuilt = {
      contractVersion: SYNTHESIS_TOPIC_STRUCTURED_ARTIFACT_CONTRACT_VERSION,
      algorithmVersion: SYNTHESIS_TOPIC_SECTION_PATCH_VERSION,
      status: "conflict",
      mismatches: rebuiltMismatches(row.mismatches),
    };
  } else if (row.status === "invalid") {
    rebuilt = {
      contractVersion: SYNTHESIS_TOPIC_STRUCTURED_ARTIFACT_CONTRACT_VERSION,
      algorithmVersion: SYNTHESIS_TOPIC_SECTION_PATCH_VERSION,
      status: "invalid",
      errors: rebuiltErrors(row.errors, "result.errors"),
    };
  } else if (row.status === "applied") {
    rebuilt = {
      contractVersion: SYNTHESIS_TOPIC_STRUCTURED_ARTIFACT_CONTRACT_VERSION,
      algorithmVersion: SYNTHESIS_TOPIC_SECTION_PATCH_VERSION,
      status: "applied",
      sections: requiredJsonObject(
        row.sections,
        "result.sections",
        "sections",
        bounds,
        {},
      ),
      nextSectionHashes: Object.fromEntries(
        Object.entries(
          requiredJsonObject(
            row.nextSectionHashes,
            "result.nextSectionHashes",
            "patch",
            bounds,
            {},
          ),
        ).map(([key, value]) => [
          key,
          typeof value === "string"
            ? value
            : contractInvalid(
                `result.nextSectionHashes.${key} must be a string`,
              ),
        ]),
      ),
    };
  } else {
    contractInvalid("result.status is invalid");
  }
  if (
    row.contractVersion !== rebuilt.contractVersion ||
    row.algorithmVersion !== rebuilt.algorithmVersion ||
    !sameCanonicalJson(rebuilt, computeSectionPatchResult(request))
  ) {
    contractInvalid("section patch result does not match the request");
  }
  return rebuilt;
}

export function createInProcessSynthesisTopicStructuredArtifactEngine(
  options: SynthesisTopicStructuredArtifactEngineOptions = {},
): SynthesisTopicStructuredArtifactEngine {
  return {
    async validateManifest(request) {
      engineCheckpoint(options, "start");
      const canonical = rebuildSynthesisTopicManifestValidationRequest(
        request,
        {},
        options,
      );
      engineCheckpoint(options, "complete");
      return computeManifestValidationResult(canonical);
    },
    async assembleArtifact(request) {
      engineCheckpoint(options, "start");
      const canonical = rebuildSynthesisTopicArtifactAssemblyRequest(
        request,
        {},
        options,
      );
      const result = computeArtifactAssemblyResult(canonical);
      engineCheckpoint(options, "complete");
      return result;
    },
    async validateArtifact(request) {
      engineCheckpoint(options, "start");
      const canonical = rebuildSynthesisTopicArtifactValidationRequest(
        request,
        {},
        options,
      );
      engineCheckpoint(options, "source_refs");
      const result = computeArtifactValidationResult(canonical);
      engineCheckpoint(options, "content_depth");
      engineCheckpoint(options, "complete");
      return result;
    },
    async applySectionPatch(request) {
      engineCheckpoint(options, "start");
      const canonical = rebuildSynthesisTopicSectionPatchRequest(
        request,
        {},
        options,
      );
      const result = computeSectionPatchResult(canonical);
      engineCheckpoint(options, "complete");
      return result;
    },
  };
}
