import {
  rebuildSynthesisConceptKbIndexResultPayload,
  rebuildSynthesisConceptKbQueryResultPayload,
  type SynthesisConceptKbIndexRequest,
  type SynthesisConceptKbIndexResult,
  type SynthesisConceptKbQueryRequest,
  type SynthesisConceptKbQueryResult,
} from "../../../packages/synthesis-engine/src/conceptKbIndex.js";
import { createHash } from "node:crypto";
import {
  rebuildSynthesisCitationGraphLayoutRequest,
  rebuildSynthesisCitationGraphLayoutResult,
  rebuildSynthesisCitationGraphMetricsRequest,
  rebuildSynthesisCitationGraphMetricsResult,
  type SynthesisCitationGraphLayoutRequest,
  type SynthesisCitationGraphLayoutResult,
  type SynthesisCitationGraphMetricsRequest,
  type SynthesisCitationGraphMetricsResult,
} from "../../../packages/synthesis-engine/src/index.js";
import {
  rebuildSynthesisCitationGraphBuildRequest,
  rebuildSynthesisCitationGraphBuildResult,
  type SynthesisCitationGraphBuildRequest,
  type SynthesisCitationGraphBuildResult,
} from "../../../packages/synthesis-engine/src/citationGraphBuild.js";
import type { SynthesisCitationGraphBuildTransferPageKind } from "../../../packages/synthesis-engine/src/citationGraphBuildTransfer.js";
import {
  rebuildSynthesisReferenceBindingRequest,
  rebuildSynthesisReferenceBindingResult,
  rebuildSynthesisReferenceDedupeRequest,
  rebuildSynthesisReferenceDedupeResult,
  type SynthesisReferenceBindingRequest,
  type SynthesisReferenceBindingResult,
  type SynthesisReferenceDedupeRequest,
  type SynthesisReferenceDedupeResult,
} from "../../../packages/synthesis-engine/src/referenceMatcher.js";
import {
  rebuildSynthesisTopicArtifactAssemblyRequest,
  rebuildSynthesisTopicArtifactAssemblyResult,
  rebuildSynthesisTopicArtifactValidationRequest,
  rebuildSynthesisTopicArtifactValidationResult,
  rebuildSynthesisTopicManifestValidationRequest,
  rebuildSynthesisTopicManifestValidationResult,
  rebuildSynthesisTopicSectionPatchRequest,
  rebuildSynthesisTopicSectionPatchResult,
  type SynthesisTopicArtifactAssemblyRequest,
  type SynthesisTopicArtifactAssemblyResult,
  type SynthesisTopicArtifactValidationRequest,
  type SynthesisTopicManifestValidationRequest,
  type SynthesisTopicSectionPatchRequest,
  type SynthesisTopicSectionPatchResult,
  type SynthesisTopicValidationResult,
} from "../../../packages/synthesis-engine/src/topicStructuredArtifact.js";
import type {
  SynthesisSidecarComputePoolSnapshot,
  SynthesisSidecarErrorCode,
} from "../../../packages/synthesis-contracts/src/sidecarSystem.js";
import { SYNTHESIS_SIDECAR_TRANSFER_LIMITS } from "../../../packages/synthesis-contracts/src/sidecarTransfer.js";
import {
  canonicalizeSynthesisEngineJson,
  compareSynthesisEngineStrings,
  countSynthesisEngineJsonNodes,
} from "../../../packages/synthesis-engine/src/canonicalJson.js";
import {
  SYNTHESIS_SIDECAR_COMPUTE_OPERATION,
  SYNTHESIS_SIDECAR_CONCEPT_KB_INDEX_OPERATION,
  SYNTHESIS_SIDECAR_CONCEPT_KB_QUERY_OPERATION,
  SYNTHESIS_SIDECAR_GRAPH_BUILD_COMPUTE_OPERATION,
  SYNTHESIS_SIDECAR_GRAPH_BUILD_TRANSFER_OPERATION,
  SYNTHESIS_SIDECAR_REFERENCE_BINDING_OPERATION,
  SYNTHESIS_SIDECAR_REFERENCE_CANONICAL_DEDUPE_OPERATION,
  SYNTHESIS_SIDECAR_TAG_VOCABULARY_INDEX_OPERATION,
  SYNTHESIS_SIDECAR_TAG_VOCABULARY_VALIDATE_OPERATION,
  SYNTHESIS_SIDECAR_TOPIC_GRAPH_INDEX_OPERATION,
  SYNTHESIS_SIDECAR_TOPIC_ARTIFACT_ASSEMBLE_OPERATION,
  SYNTHESIS_SIDECAR_TOPIC_ARTIFACT_VALIDATE_OPERATION,
  SYNTHESIS_SIDECAR_TOPIC_MANIFEST_VALIDATE_OPERATION,
  SYNTHESIS_SIDECAR_TOPIC_SECTION_PATCH_OPERATION,
  type SynthesisSidecarGraphBuildTransferPageFrame,
} from "./computeProtocol.js";
import {
  rebuildSynthesisTagVocabularyIndexResultPayload,
  rebuildSynthesisTagVocabularyValidationResultPayload,
  type SynthesisTagVocabularyIndexRequest,
  type SynthesisTagVocabularyIndexResult,
  type SynthesisTagVocabularyValidationRequest,
  type SynthesisTagVocabularyValidationResult,
} from "../../../packages/synthesis-engine/src/tagVocabulary.js";
import {
  rebuildSynthesisTopicGraphIndexResultPayload,
  type SynthesisTopicGraphIndexRequest,
  type SynthesisTopicGraphIndexResult,
} from "../../../packages/synthesis-engine/src/topicGraphIndex.js";
import {
  defaultRustComputeWorkerPath,
  RUST_COMPUTE_CANONICAL_ROWS,
  RUST_COMPUTE_RAW_ROWS_ARTIFACT,
  RustComputeWorkerTransport,
  type RustComputeWorkerTransportOptions,
} from "./rustComputeWorkerTransport.js";

const RUST_METRICS_OPERATION = "citation_graph_metrics.v1" as const;

export type RustPagedDescriptor = {
  section: string;
  pageIndex: number;
  rowCount: number;
  byteLength: number;
  sha256: string;
};

type RustPagedFrame = {
  descriptor: RustPagedDescriptor;
  rows: unknown[];
  canonicalRows?: Buffer;
};

const GRAPH_TRANSFER_SECTION_BY_KIND = {
  library_nodes: "libraryNodes",
  references: "references",
  nodes: "nodes",
  resolved_edges: "resolvedEdges",
  aggregate_edges: "aggregateEdges",
  source_ownership: "sourceOwnership",
  incoming_groups: "incomingGroups",
  light_metrics: "lightMetrics",
} as const;

const GRAPH_TRANSFER_KIND_BY_SECTION = Object.fromEntries(
  Object.entries(GRAPH_TRANSFER_SECTION_BY_KIND).map(([kind, section]) => [
    section,
    kind,
  ]),
) as Record<string, SynthesisCitationGraphBuildTransferPageKind>;

type RustDeterministicOperation =
  | typeof SYNTHESIS_SIDECAR_TAG_VOCABULARY_VALIDATE_OPERATION
  | typeof SYNTHESIS_SIDECAR_TAG_VOCABULARY_INDEX_OPERATION
  | typeof SYNTHESIS_SIDECAR_CONCEPT_KB_INDEX_OPERATION
  | typeof SYNTHESIS_SIDECAR_CONCEPT_KB_QUERY_OPERATION
  | typeof SYNTHESIS_SIDECAR_TOPIC_GRAPH_INDEX_OPERATION
  | typeof SYNTHESIS_SIDECAR_REFERENCE_BINDING_OPERATION
  | typeof SYNTHESIS_SIDECAR_REFERENCE_CANONICAL_DEDUPE_OPERATION
  | typeof SYNTHESIS_SIDECAR_TOPIC_MANIFEST_VALIDATE_OPERATION
  | typeof SYNTHESIS_SIDECAR_TOPIC_ARTIFACT_ASSEMBLE_OPERATION
  | typeof SYNTHESIS_SIDECAR_TOPIC_ARTIFACT_VALIDATE_OPERATION
  | typeof SYNTHESIS_SIDECAR_TOPIC_SECTION_PATCH_OPERATION
  | typeof SYNTHESIS_SIDECAR_GRAPH_BUILD_COMPUTE_OPERATION;

type RustPagedSectionSpec = {
  name: string;
  shape: "array" | "record" | "chunks";
};

const RUST_PAGED_RESULT_SECTIONS: Record<
  RustDeterministicOperation,
  readonly RustPagedSectionSpec[]
> = {
  [SYNTHESIS_SIDECAR_TAG_VOCABULARY_VALIDATE_OPERATION]: [
    { name: "warnings", shape: "array" },
  ],
  [SYNTHESIS_SIDECAR_TAG_VOCABULARY_INDEX_OPERATION]: [
    { name: "tags", shape: "array" },
    { name: "aliases", shape: "record" },
    { name: "abbrev", shape: "record" },
    { name: "search", shape: "array" },
    { name: "validationWarnings", shape: "array" },
  ],
  [SYNTHESIS_SIDECAR_CONCEPT_KB_INDEX_OPERATION]: [
    { name: "search", shape: "array" },
    { name: "overlayEntries", shape: "array" },
  ],
  [SYNTHESIS_SIDECAR_CONCEPT_KB_QUERY_OPERATION]: [
    { name: "matches", shape: "array" },
  ],
  [SYNTHESIS_SIDECAR_TOPIC_GRAPH_INDEX_OPERATION]: [
    { name: "roots", shape: "array" },
    { name: "unplaced", shape: "array" },
  ],
  [SYNTHESIS_SIDECAR_REFERENCE_BINDING_OPERATION]: [
    { name: "matches", shape: "array" },
  ],
  [SYNTHESIS_SIDECAR_REFERENCE_CANONICAL_DEDUPE_OPERATION]: [
    { name: "clusters", shape: "array" },
    { name: "edges", shape: "array" },
    { name: "actions", shape: "array" },
    { name: "diagnostics", shape: "array" },
  ],
  [SYNTHESIS_SIDECAR_TOPIC_MANIFEST_VALIDATE_OPERATION]: [
    { name: "errors", shape: "array" },
  ],
  [SYNTHESIS_SIDECAR_TOPIC_ARTIFACT_ASSEMBLE_OPERATION]: [
    { name: "artifact", shape: "chunks" },
  ],
  [SYNTHESIS_SIDECAR_TOPIC_ARTIFACT_VALIDATE_OPERATION]: [
    { name: "errors", shape: "array" },
  ],
  [SYNTHESIS_SIDECAR_TOPIC_SECTION_PATCH_OPERATION]: [
    { name: "sections", shape: "chunks" },
    { name: "nextSectionHashes", shape: "chunks" },
    { name: "mismatches", shape: "array" },
    { name: "errors", shape: "array" },
  ],
  [SYNTHESIS_SIDECAR_GRAPH_BUILD_COMPUTE_OPERATION]: [
    { name: "nodes", shape: "array" },
    { name: "resolvedEdges", shape: "array" },
    { name: "aggregateEdges", shape: "array" },
    { name: "sourceOwnership", shape: "array" },
    { name: "incomingGroups", shape: "array" },
    { name: "lightMetrics", shape: "array" },
  ],
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function hasExactKeys(value: Record<string, unknown>, keys: string[]) {
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  return (
    actual.length === expected.length &&
    actual.every((key, index) => key === expected[index])
  );
}

function isRustPagedDescriptor(value: unknown): value is RustPagedDescriptor {
  return (
    isPlainObject(value) &&
    hasExactKeys(value, [
      "section",
      "pageIndex",
      "rowCount",
      "byteLength",
      "sha256",
    ]) &&
    typeof value.section === "string" &&
    value.section.length > 0 &&
    Number.isSafeInteger(value.pageIndex) &&
    (value.pageIndex as number) >= 0 &&
    Number.isSafeInteger(value.rowCount) &&
    (value.rowCount as number) >= 0 &&
    Number.isSafeInteger(value.byteLength) &&
    (value.byteLength as number) >= 0 &&
    typeof value.sha256 === "string" &&
    /^sha256:[0-9a-f]{64}$/.test(value.sha256)
  );
}

export function synthesisRustPagedRequestHash(
  operation: string,
  header: Record<string, unknown>,
  pages: readonly RustPagedDescriptor[],
) {
  return `sha256:${createHash("sha256")
    .update(canonicalizeSynthesisEngineJson({ operation, header, pages }))
    .digest("hex")}`;
}

function deterministicResultSections(operation: Task["operation"]) {
  if (
    operation === RUST_METRICS_OPERATION ||
    operation === SYNTHESIS_SIDECAR_COMPUTE_OPERATION
  ) {
    return undefined;
  }
  if (operation === SYNTHESIS_SIDECAR_GRAPH_BUILD_TRANSFER_OPERATION) {
    return RUST_PAGED_RESULT_SECTIONS[
      SYNTHESIS_SIDECAR_GRAPH_BUILD_COMPUTE_OPERATION
    ];
  }
  return RUST_PAGED_RESULT_SECTIONS[operation as RustDeterministicOperation];
}

function rustPageArtifact(
  section: string,
  pageIndex: number,
  rows: unknown[],
  knownNodeCount?: number,
  knownCanonical?: Buffer,
): RustPagedFrame {
  const canonical =
    knownCanonical ?? Buffer.from(canonicalizeSynthesisEngineJson(rows));
  const byteLength = canonical.length;
  const nodeCount = knownNodeCount ?? countSynthesisEngineJsonNodes(rows);
  if (
    byteLength > SYNTHESIS_SIDECAR_TRANSFER_LIMITS.pageBytes ||
    nodeCount > SYNTHESIS_SIDECAR_TRANSFER_LIMITS.pageJsonNodes
  ) {
    throw poolError("worker_result_invalid");
  }
  return {
    descriptor: {
      section,
      pageIndex,
      rowCount: rows.length,
      byteLength,
      sha256: `sha256:${createHash("sha256").update(canonical).digest("hex")}`,
    },
    rows,
    ...(knownCanonical ? { canonicalRows: knownCanonical } : {}),
  };
}

function rustPageRowShape(row: unknown) {
  if (!isPlainObject(row)) {
    const flatArray =
      Array.isArray(row) &&
      row.every((entry) => !entry || typeof entry !== "object");
    return {
      directlyCanonical: !Array.isArray(row) || flatArray,
      nodeCount: flatArray
        ? 1 + row.length
        : countSynthesisEngineJsonNodes(row),
    };
  }
  const keys = Object.keys(row);
  let nodeCount = 1;
  let directlyCanonical = true;
  let previousKey: string | undefined;
  for (const key of keys) {
    const value = row[key];
    if (value === undefined) continue;
    const flatArray =
      Array.isArray(value) &&
      value.every((entry) => !entry || typeof entry !== "object");
    if (value && typeof value === "object" && !flatArray) {
      return {
        directlyCanonical: false,
        nodeCount: countSynthesisEngineJsonNodes(row),
      };
    }
    nodeCount += 1 + (Array.isArray(value) ? 1 + value.length : 1);
    if (
      previousKey !== undefined &&
      compareSynthesisEngineStrings(previousKey, key) > 0
    ) {
      directlyCanonical = false;
    }
    previousKey = key;
  }
  return { directlyCanonical, nodeCount };
}

function canonicalizeRustPageRows(rows: unknown[]) {
  return Buffer.from(
    rows.every((row) => rustPageRowShape(row).directlyCanonical)
      ? JSON.stringify(rows)
      : canonicalizeSynthesisEngineJson(rows),
  );
}

function rustPageArtifactFromRows(
  section: string,
  pageIndex: number,
  rows: unknown[],
) {
  const nodeCount =
    1 +
    rows.reduce<number>(
      (total, row) => total + rustPageRowShape(row).nodeCount,
      0,
    );
  return rustPageArtifact(
    section,
    pageIndex,
    rows,
    nodeCount,
    canonicalizeRustPageRows(rows),
  );
}

function splitRustPageRows(
  section: string,
  pageIndex: number,
  rows: unknown[],
  nodeCounts: number[],
  directlyCanonical: boolean,
): RustPagedFrame[] {
  const canonical = Buffer.from(
    directlyCanonical
      ? JSON.stringify(rows)
      : canonicalizeSynthesisEngineJson(rows),
  );
  if (canonical.length <= SYNTHESIS_SIDECAR_TRANSFER_LIMITS.pageBytes) {
    return [
      rustPageArtifact(
        section,
        pageIndex,
        rows,
        1 + nodeCounts.reduce((total, nodes) => total + nodes, 0),
        canonical,
      ),
    ];
  }
  if (rows.length <= 1) throw poolError("worker_result_invalid");
  const middle = Math.floor(rows.length / 2);
  const left = splitRustPageRows(
    section,
    pageIndex,
    rows.slice(0, middle),
    nodeCounts.slice(0, middle),
    directlyCanonical,
  );
  return [
    ...left,
    ...splitRustPageRows(
      section,
      pageIndex + left.length,
      rows.slice(middle),
      nodeCounts.slice(middle),
      directlyCanonical,
    ),
  ];
}

function* paginateRustRows(section: string, rows: unknown[]) {
  let pageIndex = 0;
  let pageRows: unknown[] = [];
  let pageNodeCounts: number[] = [];
  let pageNodes = 1;
  let pageDirectlyCanonical = true;
  const takePages = () => {
    const pages = splitRustPageRows(
      section,
      pageIndex,
      pageRows,
      pageNodeCounts,
      pageDirectlyCanonical,
    );
    pageIndex += pages.length;
    pageRows = [];
    pageNodeCounts = [];
    pageNodes = 1;
    pageDirectlyCanonical = true;
    return pages;
  };
  for (const row of rows) {
    const shape = rustPageRowShape(row);
    const nodes = shape.nodeCount;
    if (
      pageRows.length &&
      pageNodes + nodes > SYNTHESIS_SIDECAR_TRANSFER_LIMITS.pageJsonNodes
    ) {
      yield* takePages();
    }
    if (nodes + 1 > SYNTHESIS_SIDECAR_TRANSFER_LIMITS.pageJsonNodes) {
      throw poolError("worker_result_invalid");
    }
    pageRows.push(row);
    pageNodeCounts.push(nodes);
    pageNodes += nodes;
    pageDirectlyCanonical &&= shape.directlyCanonical;
  }
  yield* takePages();
}

function extractRustPagedRequest(
  operation: Task["operation"],
  request: Exclude<Task["request"], SynthesisSidecarGraphBuildTransferRun>,
) {
  const source = request as unknown as Record<string, unknown>;
  const header = { ...source };
  const sections: Array<[string, unknown[]]> = [];
  const takeArray = (name: string) => {
    const rows = source[name];
    if (!Array.isArray(rows)) throw poolError("worker_result_invalid");
    delete header[name];
    sections.push([name, rows]);
  };
  const takeRecord = (name: string) => {
    const value = source[name];
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      throw poolError("worker_result_invalid");
    }
    delete header[name];
    sections.push([
      name,
      Object.entries(value as Record<string, unknown>).sort(([left], [right]) =>
        compareSynthesisEngineStrings(left, right),
      ),
    ]);
  };
  const takeChunks = (name: string) => {
    if (!(name in source)) throw poolError("worker_result_invalid");
    const canonical = canonicalizeSynthesisEngineJson(source[name]);
    delete header[name];
    const chunks: string[] = [];
    for (let offset = 0; offset < canonical.length; ) {
      let end = Math.min(offset + 1024 * 1024, canonical.length);
      if (
        end < canonical.length &&
        end > offset &&
        canonical.charCodeAt(end - 1) >= 0xd800 &&
        canonical.charCodeAt(end - 1) <= 0xdbff
      ) {
        end -= 1;
      }
      chunks.push(canonical.slice(offset, end));
      offset = end;
    }
    sections.push([name, chunks.length ? chunks : [canonical]]);
  };
  if (
    operation === SYNTHESIS_SIDECAR_TAG_VOCABULARY_VALIDATE_OPERATION ||
    operation === SYNTHESIS_SIDECAR_TAG_VOCABULARY_INDEX_OPERATION
  ) {
    takeArray("entries");
    takeRecord("aliases");
    takeRecord("abbrev");
  } else if (
    operation === SYNTHESIS_SIDECAR_CONCEPT_KB_INDEX_OPERATION ||
    operation === SYNTHESIS_SIDECAR_CONCEPT_KB_QUERY_OPERATION
  ) {
    takeArray("concepts");
    takeArray("senses");
    takeArray("aliases");
    if (operation === SYNTHESIS_SIDECAR_CONCEPT_KB_QUERY_OPERATION) {
      takeArray("labels");
    }
  } else if (operation === SYNTHESIS_SIDECAR_TOPIC_GRAPH_INDEX_OPERATION) {
    takeArray("nodes");
    takeArray("edges");
  } else if (operation === SYNTHESIS_SIDECAR_REFERENCE_BINDING_OPERATION) {
    takeArray("papers");
    takeArray("references");
  } else if (
    operation === SYNTHESIS_SIDECAR_REFERENCE_CANONICAL_DEDUPE_OPERATION
  ) {
    takeArray("canonicals");
  } else if (
    operation === SYNTHESIS_SIDECAR_TOPIC_MANIFEST_VALIDATE_OPERATION
  ) {
    takeChunks("manifest");
  } else if (
    operation === SYNTHESIS_SIDECAR_TOPIC_ARTIFACT_ASSEMBLE_OPERATION
  ) {
    takeChunks("manifest");
    takeChunks("sections");
  } else if (
    operation === SYNTHESIS_SIDECAR_TOPIC_ARTIFACT_VALIDATE_OPERATION
  ) {
    takeChunks("artifact");
    header.expectedLanguage ??= "";
  } else if (operation === SYNTHESIS_SIDECAR_TOPIC_SECTION_PATCH_OPERATION) {
    takeChunks("currentManifest");
    takeChunks("currentSections");
    takeChunks("patchManifest");
    takeChunks("changedSections");
  } else if (operation === SYNTHESIS_SIDECAR_GRAPH_BUILD_COMPUTE_OPERATION) {
    takeArray("libraryNodes");
    takeArray("references");
  } else {
    throw poolError("worker_result_invalid");
  }
  return {
    header,
    pages: (function* () {
      for (const [section, rows] of sections) {
        yield* paginateRustRows(section, rows);
      }
    })(),
  };
}

function assembleRustPagedResult(
  header: Record<string, unknown>,
  sections: Map<string, unknown[]>,
  specs: readonly RustPagedSectionSpec[],
) {
  const result = { ...header };
  for (const [section, rows] of sections) {
    const shape = specs.find((entry) => entry.name === section)?.shape;
    result[section] =
      shape === "record"
        ? Object.fromEntries(rows as [string, unknown][])
        : shape === "chunks"
          ? JSON.parse(rows.join(""))
          : rows;
  }
  if (result.status === "conflict") {
    delete result.sections;
    delete result.nextSectionHashes;
    delete result.errors;
  } else if (result.status === "invalid") {
    delete result.sections;
    delete result.nextSectionHashes;
    delete result.mismatches;
  } else if (result.status === "applied") {
    delete result.mismatches;
    delete result.errors;
  }
  return result;
}

function isRustComputeOperation(operation: Task["operation"]) {
  return (
    operation === SYNTHESIS_SIDECAR_COMPUTE_OPERATION ||
    operation === RUST_METRICS_OPERATION ||
    operation === SYNTHESIS_SIDECAR_TAG_VOCABULARY_VALIDATE_OPERATION ||
    operation === SYNTHESIS_SIDECAR_TAG_VOCABULARY_INDEX_OPERATION ||
    operation === SYNTHESIS_SIDECAR_CONCEPT_KB_INDEX_OPERATION ||
    operation === SYNTHESIS_SIDECAR_CONCEPT_KB_QUERY_OPERATION ||
    operation === SYNTHESIS_SIDECAR_TOPIC_GRAPH_INDEX_OPERATION ||
    operation === SYNTHESIS_SIDECAR_REFERENCE_BINDING_OPERATION ||
    operation === SYNTHESIS_SIDECAR_REFERENCE_CANONICAL_DEDUPE_OPERATION ||
    operation === SYNTHESIS_SIDECAR_TOPIC_MANIFEST_VALIDATE_OPERATION ||
    operation === SYNTHESIS_SIDECAR_TOPIC_ARTIFACT_ASSEMBLE_OPERATION ||
    operation === SYNTHESIS_SIDECAR_TOPIC_ARTIFACT_VALIDATE_OPERATION ||
    operation === SYNTHESIS_SIDECAR_TOPIC_SECTION_PATCH_OPERATION ||
    operation === SYNTHESIS_SIDECAR_GRAPH_BUILD_COMPUTE_OPERATION ||
    operation === SYNTHESIS_SIDECAR_GRAPH_BUILD_TRANSFER_OPERATION
  );
}

export const SYNTHESIS_SIDECAR_COMPUTE_LIMITS = Object.freeze({
  concurrency: 1,
  maxQueued: 2,
  executionTimeoutMs: 5_000,
  layoutExecutionTimeoutMs: 10_000,
  cancellationGraceMs: 100,
  shutdownTimeoutMs: 500,
});
export const SYNTHESIS_SIDECAR_TRANSFER_EXECUTION_TIMEOUT_MS = 30_000;

export type SynthesisSidecarGraphBuildTransferRun = {
  header: Record<string, unknown>;
  requestHash: string;
  inputPages(): AsyncIterable<SynthesisSidecarGraphBuildTransferPageFrame>;
  outputStarted(): void | Promise<void>;
  outputPage(
    frame: SynthesisSidecarGraphBuildTransferPageFrame,
  ): void | Promise<void>;
  outputComplete(header: Record<string, unknown>): void | Promise<void>;
};

type WorkerErrorCode = Extract<
  SynthesisSidecarErrorCode,
  | "worker_busy"
  | "worker_timeout"
  | "worker_canceled"
  | "worker_crashed"
  | "worker_result_invalid"
  | "worker_unavailable"
>;

export class ComputeWorkerPoolError extends Error {
  readonly code: WorkerErrorCode;
  readonly retryable: boolean;

  constructor(code: WorkerErrorCode) {
    super(code);
    this.name = "ComputeWorkerPoolError";
    this.code = code;
    this.retryable = code !== "worker_canceled";
  }
}

type Task = {
  id: string;
  operation:
    | typeof SYNTHESIS_SIDECAR_COMPUTE_OPERATION
    | typeof RUST_METRICS_OPERATION
    | typeof SYNTHESIS_SIDECAR_GRAPH_BUILD_COMPUTE_OPERATION
    | typeof SYNTHESIS_SIDECAR_TAG_VOCABULARY_VALIDATE_OPERATION
    | typeof SYNTHESIS_SIDECAR_TAG_VOCABULARY_INDEX_OPERATION
    | typeof SYNTHESIS_SIDECAR_CONCEPT_KB_INDEX_OPERATION
    | typeof SYNTHESIS_SIDECAR_CONCEPT_KB_QUERY_OPERATION
    | typeof SYNTHESIS_SIDECAR_TOPIC_GRAPH_INDEX_OPERATION
    | typeof SYNTHESIS_SIDECAR_REFERENCE_BINDING_OPERATION
    | typeof SYNTHESIS_SIDECAR_REFERENCE_CANONICAL_DEDUPE_OPERATION
    | typeof SYNTHESIS_SIDECAR_TOPIC_MANIFEST_VALIDATE_OPERATION
    | typeof SYNTHESIS_SIDECAR_TOPIC_ARTIFACT_ASSEMBLE_OPERATION
    | typeof SYNTHESIS_SIDECAR_TOPIC_ARTIFACT_VALIDATE_OPERATION
    | typeof SYNTHESIS_SIDECAR_TOPIC_SECTION_PATCH_OPERATION
    | typeof SYNTHESIS_SIDECAR_GRAPH_BUILD_TRANSFER_OPERATION;
  request:
    | SynthesisCitationGraphLayoutRequest
    | SynthesisCitationGraphMetricsRequest
    | SynthesisCitationGraphBuildRequest
    | SynthesisTagVocabularyValidationRequest
    | SynthesisTagVocabularyIndexRequest
    | SynthesisConceptKbIndexRequest
    | SynthesisConceptKbQueryRequest
    | SynthesisTopicGraphIndexRequest
    | SynthesisReferenceBindingRequest
    | SynthesisReferenceDedupeRequest
    | SynthesisTopicManifestValidationRequest
    | SynthesisTopicArtifactAssemblyRequest
    | SynthesisTopicArtifactValidationRequest
    | SynthesisTopicSectionPatchRequest
    | SynthesisSidecarGraphBuildTransferRun;
  cancellation: Int32Array;
  resolve(
    result:
      | SynthesisCitationGraphLayoutResult
      | SynthesisCitationGraphMetricsResult
      | SynthesisCitationGraphBuildResult
      | SynthesisTagVocabularyValidationResult
      | SynthesisTagVocabularyIndexResult
      | SynthesisConceptKbIndexResult
      | SynthesisConceptKbQueryResult
      | SynthesisTopicGraphIndexResult
      | SynthesisReferenceBindingResult
      | SynthesisReferenceDedupeResult
      | SynthesisTopicValidationResult
      | SynthesisTopicArtifactAssemblyResult
      | SynthesisTopicSectionPatchResult
      | void,
  ): void;
  reject(error: unknown): void;
  signal?: AbortSignal;
  abortListener?: () => void;
  deadline?: NodeJS.Timeout;
  settled: boolean;
  terminating: boolean;
  acknowledgeCancellation?: () => void;
  timeoutMs: number;
  rustInputPages?: RustPagedFrame[];
  rustInputPageIterator?: Iterator<RustPagedFrame>;
  rustOutputHeader?: Record<string, unknown>;
  rustOutputSections?: Map<string, unknown[]>;
  rustOutputPageCounts?: Map<string, number>;
  rustProtocolPhase?: "input" | "awaiting_result" | "result";
  rustOutputSectionIndex?: number;
  rustTransferInputIterator?: AsyncIterator<SynthesisSidecarGraphBuildTransferPageFrame>;
  rustTransferInputPending?: boolean;
  rustTransferInputDescriptor?: RustPagedDescriptor;
  rustTransferOutputReady?: Promise<void>;
  rustExpectedRequestHash?: string;
};

export type SynthesisSidecarComputeWorkerPool = {
  runCitationGraphLayout(
    request: SynthesisCitationGraphLayoutRequest,
    options?: { signal?: AbortSignal },
  ): Promise<SynthesisCitationGraphLayoutResult>;
  runCitationGraphMetrics(
    request: SynthesisCitationGraphMetricsRequest,
    options?: { signal?: AbortSignal },
  ): Promise<SynthesisCitationGraphMetricsResult>;
  runCitationGraphBuild(
    request: SynthesisCitationGraphBuildRequest,
    options?: { signal?: AbortSignal },
  ): Promise<SynthesisCitationGraphBuildResult>;
  runTagVocabularyValidation(
    request: SynthesisTagVocabularyValidationRequest,
    options?: { signal?: AbortSignal },
  ): Promise<SynthesisTagVocabularyValidationResult>;
  runTagVocabularyIndex(
    request: SynthesisTagVocabularyIndexRequest,
    options?: { signal?: AbortSignal },
  ): Promise<SynthesisTagVocabularyIndexResult>;
  runConceptKbIndex(
    request: SynthesisConceptKbIndexRequest,
    options?: { signal?: AbortSignal },
  ): Promise<SynthesisConceptKbIndexResult>;
  runConceptKbQuery(
    request: SynthesisConceptKbQueryRequest,
    options?: { signal?: AbortSignal },
  ): Promise<SynthesisConceptKbQueryResult>;
  runTopicGraphIndex(
    request: SynthesisTopicGraphIndexRequest,
    options?: { signal?: AbortSignal },
  ): Promise<SynthesisTopicGraphIndexResult>;
  runReferenceBinding(
    request: SynthesisReferenceBindingRequest,
    options?: { signal?: AbortSignal },
  ): Promise<SynthesisReferenceBindingResult>;
  runReferenceCanonicalDedupe(
    request: SynthesisReferenceDedupeRequest,
    options?: { signal?: AbortSignal },
  ): Promise<SynthesisReferenceDedupeResult>;
  runTopicManifestValidation(
    request: SynthesisTopicManifestValidationRequest,
    options?: { signal?: AbortSignal },
  ): Promise<SynthesisTopicValidationResult>;
  runTopicArtifactAssembly(
    request: SynthesisTopicArtifactAssemblyRequest,
    options?: { signal?: AbortSignal },
  ): Promise<SynthesisTopicArtifactAssemblyResult>;
  runTopicArtifactValidation(
    request: SynthesisTopicArtifactValidationRequest,
    options?: { signal?: AbortSignal },
  ): Promise<SynthesisTopicValidationResult>;
  runTopicSectionPatch(
    request: SynthesisTopicSectionPatchRequest,
    options?: { signal?: AbortSignal },
  ): Promise<SynthesisTopicSectionPatchResult>;
  runCitationGraphBuildTransfer(
    run: SynthesisSidecarGraphBuildTransferRun,
    options?: { signal?: AbortSignal },
  ): Promise<void>;
  snapshot(): SynthesisSidecarComputePoolSnapshot;
  shutdown(): Promise<void>;
};

type PoolOptions = {
  executionTimeoutMs?: number;
  layoutExecutionTimeoutMs?: number;
  cancellationGraceMs?: number;
  shutdownTimeoutMs?: number;
  transferExecutionTimeoutMs?: number;
  rustWorkerPath?: string;
  rustWorkerArguments?: string[];
  rustWorkerFactory?: (
    options: RustComputeWorkerTransportOptions,
  ) => RustComputeWorkerTarget;
};

type RustComputeWorkerTarget = Pick<
  RustComputeWorkerTransport,
  "on" | "once" | "postMessage" | "terminate"
>;

type ComputeWorkerTarget = RustComputeWorkerTarget;

function delay(milliseconds: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, milliseconds));
}

function poolError(code: WorkerErrorCode) {
  return new ComputeWorkerPoolError(code);
}

function prefetchRustInputPage(task: Task) {
  if (!task.rustInputPageIterator || (task.rustInputPages?.length ?? 0) >= 2) {
    return;
  }
  const next = task.rustInputPageIterator.next();
  if (next.done) {
    task.rustInputPageIterator = undefined;
  } else {
    task.rustInputPages?.push(next.value);
  }
}

export function createSynthesisSidecarComputeWorkerPool(
  options: PoolOptions = {},
): SynthesisSidecarComputeWorkerPool {
  const rustWorkerPath =
    options.rustWorkerPath ?? defaultRustComputeWorkerPath();
  const executionTimeoutMs =
    options.executionTimeoutMs ??
    SYNTHESIS_SIDECAR_COMPUTE_LIMITS.executionTimeoutMs;
  const layoutExecutionTimeoutMs =
    options.layoutExecutionTimeoutMs ??
    options.executionTimeoutMs ??
    SYNTHESIS_SIDECAR_COMPUTE_LIMITS.layoutExecutionTimeoutMs;
  const cancellationGraceMs =
    options.cancellationGraceMs ??
    SYNTHESIS_SIDECAR_COMPUTE_LIMITS.cancellationGraceMs;
  const shutdownTimeoutMs =
    options.shutdownTimeoutMs ??
    SYNTHESIS_SIDECAR_COMPUTE_LIMITS.shutdownTimeoutMs;
  const transferExecutionTimeoutMs =
    options.transferExecutionTimeoutMs ??
    SYNTHESIS_SIDECAR_TRANSFER_EXECUTION_TIMEOUT_MS;
  const queue: Task[] = [];
  const expectedExits = new WeakSet<object>();
  let rustWorker: RustComputeWorkerTarget | null = null;
  let active: Task | null = null;
  let stopping = false;
  let degraded = false;
  let taskSequence = 0;
  let restartCount = 0;
  let failureCount = 0;
  let consecutiveFailures = 0;
  let termination: Promise<void> | null = null;
  let shutdownPromise: Promise<void> | null = null;

  const trackTermination = (pending: Promise<void>) => {
    termination = pending;
    void pending.finally(() => {
      if (termination === pending) {
        termination = null;
      }
      pump();
    });
  };

  const snapshot = (): SynthesisSidecarComputePoolSnapshot => ({
    state: stopping
      ? "stopping"
      : degraded
        ? "degraded"
        : active
          ? "busy"
          : "idle",
    active: active ? 1 : 0,
    queued: queue.length,
    restartCount,
    failureCount,
  });

  const clearTaskHooks = (task: Task) => {
    if (task.deadline) {
      clearTimeout(task.deadline);
      task.deadline = undefined;
    }
    if (task.signal && task.abortListener) {
      task.signal.removeEventListener("abort", task.abortListener);
      task.abortListener = undefined;
    }
  };

  const rejectTask = (task: Task, code: WorkerErrorCode) => {
    if (task.settled) {
      return;
    }
    task.settled = true;
    clearTaskHooks(task);
    task.reject(poolError(code));
  };

  const rejectTaskWithError = (task: Task, error: unknown) => {
    if (task.settled) {
      return;
    }
    task.settled = true;
    clearTaskHooks(task);
    task.reject(error);
  };

  const rejectQueue = (code: WorkerErrorCode) => {
    for (const task of queue.splice(0)) {
      rejectTask(task, code);
    }
  };

  const recordRuntimeFailure = () => {
    restartCount += 1;
    failureCount += 1;
    consecutiveFailures += 1;
    if (consecutiveFailures >= 3) {
      degraded = true;
      rejectQueue("worker_unavailable");
    }
  };

  const terminateWorker = async (
    target: ComputeWorkerTarget,
    graceMs: number,
  ) => {
    expectedExits.add(target);
    if (rustWorker === target) {
      rustWorker = null;
    }
    const terminate = target.terminate().then(
      () => undefined,
      () => undefined,
    );
    await Promise.race([terminate, delay(graceMs)]);
  };

  let pump = () => undefined;

  const finishRuntimeFailure = (
    task: Task,
    code: "worker_crashed" | "worker_result_invalid",
    target: ComputeWorkerTarget | null,
  ) => {
    if (task !== active || task.terminating) {
      return;
    }
    task.terminating = true;
    recordRuntimeFailure();
    const pending = (async () => {
      if (target) {
        await terminateWorker(target, cancellationGraceMs);
      }
      if (active === task) {
        active = null;
      }
      rejectTask(task, code);
    })();
    trackTermination(pending);
  };

  const requestCooperativeCancellation = (
    task: Task,
    target: ComputeWorkerTarget | null,
  ) => {
    let acknowledged = false;
    const acknowledgment = new Promise<void>((resolve) => {
      task.acknowledgeCancellation = () => {
        acknowledged = true;
        resolve();
      };
    });
    Atomics.store(task.cancellation, 0, 1);
    target?.postMessage({ type: "cancel", taskId: task.id });
    return {
      wait: Promise.race([acknowledgment, delay(cancellationGraceMs)]).then(
        () => acknowledged,
      ),
      dispose() {
        task.acknowledgeCancellation = undefined;
      },
    };
  };

  const timeoutActive = (task: Task, target: ComputeWorkerTarget | null) => {
    if (task !== active || task.terminating) {
      return;
    }
    task.terminating = true;
    recordRuntimeFailure();
    const cooperative = requestCooperativeCancellation(task, target);
    const pending = (async () => {
      await cooperative.wait;
      cooperative.dispose();
      if (target) {
        await terminateWorker(target, cancellationGraceMs);
      }
      if (active === task) {
        active = null;
      }
      rejectTask(task, "worker_timeout");
    })();
    trackTermination(pending);
  };

  const cancelActive = (task: Task, code: "worker_canceled") => {
    if (task !== active || task.terminating) {
      return;
    }
    task.terminating = true;
    const target = rustWorker;
    const cooperative = requestCooperativeCancellation(task, target);
    const pending = (async () => {
      const acknowledged = await cooperative.wait;
      cooperative.dispose();
      if (target && !acknowledged) {
        await terminateWorker(target, cancellationGraceMs);
      }
      if (active === task) {
        active = null;
      }
      rejectTask(task, code);
    })();
    trackTermination(pending);
  };

  const onUnexpectedWorkerFailure = (target: ComputeWorkerTarget) => {
    if (rustWorker !== target || expectedExits.has(target)) {
      return;
    }
    if (rustWorker === target) rustWorker = null;
    const task = active;
    if (task) {
      finishRuntimeFailure(task, "worker_crashed", null);
    } else {
      recordRuntimeFailure();
      pump();
    }
  };

  class TransferProtocolError extends Error {}

  const finishTransferSuccess = (task: Task) => {
    if (task !== active || task.terminating || task.settled) {
      return;
    }
    active = null;
    task.settled = true;
    clearTaskHooks(task);
    consecutiveFailures = 0;
    task.resolve(undefined);
    pump();
  };

  const finishTransferControlFailure = (
    task: Task,
    error: unknown,
    target: ComputeWorkerTarget,
  ) => {
    if (task !== active || task.terminating) {
      return;
    }
    task.terminating = true;
    const pending = (async () => {
      await terminateWorker(target, cancellationGraceMs);
      if (active === task) {
        active = null;
      }
      rejectTaskWithError(task, error);
    })();
    trackTermination(pending);
  };

  const sendNextRustTransferInput = async (
    task: Task,
    target: RustComputeWorkerTarget,
  ) => {
    if (
      task !== active ||
      task.terminating ||
      task.rustTransferInputPending ||
      !task.rustTransferInputIterator
    ) {
      return;
    }
    task.rustTransferInputPending = true;
    try {
      const next = await task.rustTransferInputIterator.next();
      if (task !== active || task.terminating) return;
      if (next.done) {
        task.rustTransferInputIterator = undefined;
        task.rustProtocolPhase = "awaiting_result";
        target.postMessage({ type: "input_complete", taskId: task.id });
        return;
      }
      const frame = next.value;
      const section = GRAPH_TRANSFER_SECTION_BY_KIND[frame.descriptor.kind];
      if (section !== "libraryNodes" && section !== "references") {
        throw new TransferProtocolError();
      }
      const canonicalRows = Buffer.from(frame.bytes);
      task.rustTransferInputDescriptor = {
        section,
        pageIndex: frame.descriptor.pageIndex,
        rowCount: frame.descriptor.rowCount,
        byteLength: frame.descriptor.byteLength,
        sha256: frame.descriptor.sha256,
      };
      target.postMessage({
        type: "input_page",
        taskId: task.id,
        descriptor: task.rustTransferInputDescriptor,
        rows: [],
        [RUST_COMPUTE_CANONICAL_ROWS]: canonicalRows,
      });
    } catch (error) {
      if (task !== active || task.terminating) return;
      finishTransferControlFailure(task, error, target);
    } finally {
      task.rustTransferInputPending = false;
    }
  };

  const ensureRustWorker = () => {
    if (rustWorker) {
      return rustWorker;
    }
    const created = (
      options.rustWorkerFactory ??
      ((transportOptions) => new RustComputeWorkerTransport(transportOptions))
    )({
      executablePath: rustWorkerPath,
      arguments: options.rustWorkerArguments,
    });
    rustWorker = created;
    created.on("message", (message: unknown) => {
      const task = active;
      if (!task || !isRustComputeOperation(task.operation)) {
        return;
      }
      if (
        !message ||
        typeof message !== "object" ||
        (message as { taskId?: unknown }).taskId !== task.id
      ) {
        finishRuntimeFailure(task, "worker_result_invalid", created);
        return;
      }
      let response = message as Record<string, unknown> & {
        type?: unknown;
        result?: unknown;
        header?: unknown;
        descriptor?: unknown;
        rows?: unknown;
        section?: unknown;
        pageIndex?: unknown;
      };
      let assembledPagedResult = false;
      if (response.type === "canceled" && task.terminating) {
        task.acknowledgeCancellation?.();
        return;
      }
      if (task.terminating) {
        return;
      }
      if (response.type === "input_ack") {
        if (
          task.rustProtocolPhase !== "input" ||
          !hasExactKeys(response, [
            "protocol",
            "type",
            "taskId",
            "section",
            "pageIndex",
          ])
        ) {
          finishRuntimeFailure(task, "worker_result_invalid", created);
          return;
        }
        if (
          task.operation === SYNTHESIS_SIDECAR_GRAPH_BUILD_TRANSFER_OPERATION
        ) {
          const descriptor = task.rustTransferInputDescriptor;
          if (
            !descriptor ||
            response.section !== descriptor.section ||
            response.pageIndex !== descriptor.pageIndex
          ) {
            finishRuntimeFailure(task, "worker_result_invalid", created);
            return;
          }
          task.rustTransferInputDescriptor = undefined;
          void sendNextRustTransferInput(task, created);
          return;
        }
        const page = task.rustInputPages?.[0];
        if (
          !page ||
          response.section !== page.descriptor.section ||
          response.pageIndex !== page.descriptor.pageIndex
        ) {
          finishRuntimeFailure(task, "worker_result_invalid", created);
          return;
        }
        task.rustInputPages?.shift();
        const next = task.rustInputPages?.[0];
        if (!next) {
          task.rustProtocolPhase = "awaiting_result";
        }
        created.postMessage(
          next
            ? {
                type: "input_page",
                taskId: task.id,
                descriptor: next.descriptor,
                rows: next.rows,
                [RUST_COMPUTE_CANONICAL_ROWS]: next.canonicalRows,
              }
            : { type: "input_complete", taskId: task.id },
        );
        if (next) prefetchRustInputPage(task);
        return;
      }
      if (response.type === "result_begin") {
        const sectionSpecs = deterministicResultSections(task.operation);
        if (
          !sectionSpecs ||
          task.rustProtocolPhase !== "awaiting_result" ||
          task.rustOutputHeader ||
          !hasExactKeys(response, [
            "protocol",
            "type",
            "taskId",
            "operation",
            "requestHash",
            "header",
          ]) ||
          response.operation !== task.operation ||
          response.requestHash !== task.rustExpectedRequestHash ||
          !isPlainObject(response.header) ||
          sectionSpecs.some(
            (section) =>
              section.name in (response.header as Record<string, unknown>),
          )
        ) {
          finishRuntimeFailure(task, "worker_result_invalid", created);
          return;
        }
        task.rustOutputHeader = response.header;
        task.rustOutputSections = new Map();
        task.rustOutputPageCounts = new Map();
        task.rustOutputSectionIndex = 0;
        task.rustProtocolPhase = "result";
        if (
          task.operation === SYNTHESIS_SIDECAR_GRAPH_BUILD_TRANSFER_OPERATION
        ) {
          const run = task.request as SynthesisSidecarGraphBuildTransferRun;
          task.rustTransferOutputReady = Promise.resolve(run.outputStarted());
        }
        return;
      }
      if (response.type === "result_page") {
        const sectionSpecs = deterministicResultSections(task.operation);
        if (
          task.operation === SYNTHESIS_SIDECAR_GRAPH_BUILD_TRANSFER_OPERATION
        ) {
          const rawArtifact = (response as Record<PropertyKey, unknown>)[
            RUST_COMPUTE_RAW_ROWS_ARTIFACT
          ] as
            | {
                bytes?: unknown;
                byteLength?: unknown;
                nodeCount?: unknown;
                sha256?: unknown;
              }
            | undefined;
          if (
            !sectionSpecs ||
            task.rustProtocolPhase !== "result" ||
            !task.rustOutputHeader ||
            !hasExactKeys(response, [
              "protocol",
              "type",
              "taskId",
              "descriptor",
              "rows",
            ]) ||
            !isRustPagedDescriptor(response.descriptor) ||
            !Array.isArray(response.rows) ||
            !rawArtifact ||
            !Buffer.isBuffer(rawArtifact.bytes) ||
            rawArtifact.byteLength !== response.descriptor.byteLength ||
            rawArtifact.sha256 !== response.descriptor.sha256 ||
            !Number.isSafeInteger(rawArtifact.nodeCount) ||
            (rawArtifact.nodeCount as number) >
              SYNTHESIS_SIDECAR_TRANSFER_LIMITS.pageJsonNodes ||
            response.rows.length !== response.descriptor.rowCount
          ) {
            finishRuntimeFailure(task, "worker_result_invalid", created);
            return;
          }
          const descriptor = response.descriptor;
          let sectionIndex = task.rustOutputSectionIndex ?? 0;
          let sectionSpec = sectionSpecs[sectionIndex];
          if (
            descriptor.section !== sectionSpec?.name &&
            sectionIndex + 1 < sectionSpecs.length &&
            descriptor.section === sectionSpecs[sectionIndex + 1]?.name &&
            descriptor.pageIndex === 0 &&
            (task.rustOutputPageCounts?.get(sectionSpec?.name || "") ?? 0) > 0
          ) {
            sectionIndex += 1;
            sectionSpec = sectionSpecs[sectionIndex];
            task.rustOutputSectionIndex = sectionIndex;
          }
          const expectedIndex =
            task.rustOutputPageCounts?.get(descriptor.section) ?? 0;
          const kind = GRAPH_TRANSFER_KIND_BY_SECTION[descriptor.section];
          if (
            !sectionSpec ||
            descriptor.section !== sectionSpec.name ||
            descriptor.pageIndex !== expectedIndex ||
            !kind
          ) {
            finishRuntimeFailure(task, "worker_result_invalid", created);
            return;
          }
          task.rustOutputSections?.set(descriptor.section, []);
          task.rustOutputPageCounts?.set(descriptor.section, expectedIndex + 1);
          const bytes = rawArtifact.bytes;
          const run = task.request as SynthesisSidecarGraphBuildTransferRun;
          void (async () => {
            try {
              await task.rustTransferOutputReady;
              await run.outputPage({
                descriptor: {
                  kind,
                  pageIndex: descriptor.pageIndex,
                  rowCount: descriptor.rowCount,
                  byteLength: descriptor.byteLength,
                  sha256: descriptor.sha256,
                },
                bytes: bytes.buffer.slice(
                  bytes.byteOffset,
                  bytes.byteOffset + bytes.byteLength,
                ) as ArrayBuffer,
              });
              if (task !== active || task.terminating) return;
              created.postMessage({
                type: "result_ack",
                taskId: task.id,
                section: descriptor.section,
                pageIndex: descriptor.pageIndex,
              });
            } catch (error) {
              if (task === active && !task.terminating) {
                finishTransferControlFailure(task, error, created);
              }
            }
          })();
          return;
        }
        if (
          !sectionSpecs ||
          task.rustProtocolPhase !== "result" ||
          !task.rustOutputHeader ||
          !hasExactKeys(response, [
            "protocol",
            "type",
            "taskId",
            "descriptor",
            "rows",
          ]) ||
          !isRustPagedDescriptor(response.descriptor) ||
          !Array.isArray(response.rows)
        ) {
          finishRuntimeFailure(task, "worker_result_invalid", created);
          return;
        }
        const descriptor = response.descriptor;
        let sectionIndex = task.rustOutputSectionIndex ?? 0;
        let sectionSpec = sectionSpecs[sectionIndex];
        if (
          descriptor.section !== sectionSpec?.name &&
          sectionIndex + 1 < sectionSpecs.length &&
          descriptor.section === sectionSpecs[sectionIndex + 1]?.name &&
          descriptor.pageIndex === 0 &&
          (task.rustOutputPageCounts?.get(sectionSpec?.name || "") ?? 0) > 0
        ) {
          sectionIndex += 1;
          sectionSpec = sectionSpecs[sectionIndex];
          task.rustOutputSectionIndex = sectionIndex;
        }
        if (!sectionSpec || descriptor.section !== sectionSpec.name) {
          finishRuntimeFailure(task, "worker_result_invalid", created);
          return;
        }
        const expectedIndex =
          task.rustOutputPageCounts?.get(descriptor.section) ?? 0;
        let verified: RustPagedFrame;
        try {
          const rawArtifact = (response as Record<PropertyKey, unknown>)[
            RUST_COMPUTE_RAW_ROWS_ARTIFACT
          ] as
            | {
                byteLength?: unknown;
                nodeCount?: unknown;
                sha256?: unknown;
              }
            | undefined;
          if (
            rawArtifact &&
            Number.isSafeInteger(rawArtifact.byteLength) &&
            (rawArtifact.byteLength as number) <=
              SYNTHESIS_SIDECAR_TRANSFER_LIMITS.pageBytes &&
            Number.isSafeInteger(rawArtifact.nodeCount) &&
            (rawArtifact.nodeCount as number) <=
              SYNTHESIS_SIDECAR_TRANSFER_LIMITS.pageJsonNodes &&
            typeof rawArtifact.sha256 === "string" &&
            response.rows.length <=
              SYNTHESIS_SIDECAR_TRANSFER_LIMITS.pageJsonNodes
          ) {
            verified = {
              descriptor: {
                section: descriptor.section,
                pageIndex: expectedIndex,
                rowCount: response.rows.length,
                byteLength: rawArtifact.byteLength as number,
                sha256: rawArtifact.sha256,
              },
              rows: response.rows,
            };
          } else {
            verified = rustPageArtifactFromRows(
              descriptor.section,
              expectedIndex,
              response.rows,
            );
          }
        } catch {
          finishRuntimeFailure(task, "worker_result_invalid", created);
          return;
        }
        if (
          verified.descriptor.section !== descriptor.section ||
          verified.descriptor.pageIndex !== descriptor.pageIndex ||
          verified.descriptor.rowCount !== descriptor.rowCount ||
          verified.descriptor.byteLength !== descriptor.byteLength ||
          verified.descriptor.sha256 !== descriptor.sha256
        ) {
          finishRuntimeFailure(task, "worker_result_invalid", created);
          return;
        }
        const existingRows =
          task.rustOutputSections?.get(descriptor.section) ?? [];
        if (sectionSpec.shape === "record") {
          const keys = new Set(
            existingRows.map((row) => (row as [string, unknown])[0]),
          );
          for (const row of response.rows) {
            if (
              !Array.isArray(row) ||
              row.length !== 2 ||
              typeof row[0] !== "string" ||
              keys.has(row[0])
            ) {
              finishRuntimeFailure(task, "worker_result_invalid", created);
              return;
            }
            keys.add(row[0]);
          }
        }
        existingRows.push(...response.rows);
        task.rustOutputSections?.set(descriptor.section, existingRows);
        task.rustOutputPageCounts?.set(descriptor.section, expectedIndex + 1);
        created.postMessage({
          type: "result_ack",
          taskId: task.id,
          section: descriptor.section,
          pageIndex: descriptor.pageIndex,
        });
        return;
      }
      if (response.type === "result_complete") {
        const sectionSpecs = deterministicResultSections(task.operation);
        if (
          !sectionSpecs ||
          task.rustProtocolPhase !== "result" ||
          !hasExactKeys(response, [
            "protocol",
            "type",
            "taskId",
            "operation",
            "requestHash",
          ]) ||
          response.operation !== task.operation ||
          response.requestHash !== task.rustExpectedRequestHash ||
          !task.rustOutputHeader ||
          !task.rustOutputSections ||
          task.rustOutputSectionIndex !== sectionSpecs.length - 1 ||
          sectionSpecs.some(
            (section) =>
              !task.rustOutputSections?.has(section.name) ||
              (task.rustOutputPageCounts?.get(section.name) ?? 0) < 1,
          )
        ) {
          finishRuntimeFailure(task, "worker_result_invalid", created);
          return;
        }
        if (
          task.operation === SYNTHESIS_SIDECAR_GRAPH_BUILD_TRANSFER_OPERATION
        ) {
          const run = task.request as SynthesisSidecarGraphBuildTransferRun;
          void (async () => {
            try {
              await task.rustTransferOutputReady;
              await run.outputComplete(task.rustOutputHeader!);
              finishTransferSuccess(task);
            } catch (error) {
              if (task === active && !task.terminating) {
                finishTransferControlFailure(task, error, created);
              }
            }
          })();
          return;
        }
        response = {
          type: "result",
          result: assembleRustPagedResult(
            task.rustOutputHeader,
            task.rustOutputSections,
            sectionSpecs,
          ),
        };
        assembledPagedResult = true;
      }
      if (
        response.type === "result" &&
        task.operation !== RUST_METRICS_OPERATION &&
        task.operation !== SYNTHESIS_SIDECAR_COMPUTE_OPERATION &&
        !assembledPagedResult
      ) {
        finishRuntimeFailure(task, "worker_result_invalid", created);
        return;
      }
      if (response.type !== "result") {
        finishRuntimeFailure(task, "worker_result_invalid", created);
        return;
      }
      let result:
        | SynthesisCitationGraphLayoutResult
        | SynthesisCitationGraphMetricsResult
        | SynthesisTagVocabularyValidationResult
        | SynthesisTagVocabularyIndexResult
        | SynthesisConceptKbIndexResult
        | SynthesisConceptKbQueryResult
        | SynthesisTopicGraphIndexResult
        | SynthesisCitationGraphBuildResult
        | SynthesisReferenceBindingResult
        | SynthesisReferenceDedupeResult
        | SynthesisTopicValidationResult
        | SynthesisTopicArtifactAssemblyResult
        | SynthesisTopicSectionPatchResult
        | undefined;
      try {
        switch (task.operation) {
          case SYNTHESIS_SIDECAR_COMPUTE_OPERATION:
            result = rebuildSynthesisCitationGraphLayoutResult(
              response.result,
              task.request as SynthesisCitationGraphLayoutRequest,
            );
            break;
          case RUST_METRICS_OPERATION:
            result = rebuildSynthesisCitationGraphMetricsResult(
              response.result,
              task.request as SynthesisCitationGraphMetricsRequest,
            );
            break;
          case SYNTHESIS_SIDECAR_TAG_VOCABULARY_VALIDATE_OPERATION:
            result = rebuildSynthesisTagVocabularyValidationResultPayload(
              response.result,
            );
            break;
          case SYNTHESIS_SIDECAR_TAG_VOCABULARY_INDEX_OPERATION:
            result = rebuildSynthesisTagVocabularyIndexResultPayload(
              response.result,
            );
            break;
          case SYNTHESIS_SIDECAR_CONCEPT_KB_INDEX_OPERATION:
            result = rebuildSynthesisConceptKbIndexResultPayload(
              response.result,
            );
            break;
          case SYNTHESIS_SIDECAR_CONCEPT_KB_QUERY_OPERATION:
            result = rebuildSynthesisConceptKbQueryResultPayload(
              response.result,
            );
            break;
          case SYNTHESIS_SIDECAR_TOPIC_GRAPH_INDEX_OPERATION:
            result = rebuildSynthesisTopicGraphIndexResultPayload(
              response.result,
            );
            break;
          case SYNTHESIS_SIDECAR_REFERENCE_BINDING_OPERATION:
            result = rebuildSynthesisReferenceBindingResult(
              response.result,
              task.request as SynthesisReferenceBindingRequest,
            );
            break;
          case SYNTHESIS_SIDECAR_REFERENCE_CANONICAL_DEDUPE_OPERATION:
            result = rebuildSynthesisReferenceDedupeResult(
              response.result,
              task.request as SynthesisReferenceDedupeRequest,
            );
            break;
          case SYNTHESIS_SIDECAR_TOPIC_MANIFEST_VALIDATE_OPERATION:
            result = rebuildSynthesisTopicManifestValidationResult(
              response.result,
              task.request as SynthesisTopicManifestValidationRequest,
            );
            break;
          case SYNTHESIS_SIDECAR_TOPIC_ARTIFACT_ASSEMBLE_OPERATION:
            result = rebuildSynthesisTopicArtifactAssemblyResult(
              response.result,
              task.request as SynthesisTopicArtifactAssemblyRequest,
            );
            break;
          case SYNTHESIS_SIDECAR_TOPIC_ARTIFACT_VALIDATE_OPERATION:
            result = rebuildSynthesisTopicArtifactValidationResult(
              response.result,
              task.request as SynthesisTopicArtifactValidationRequest,
            );
            break;
          case SYNTHESIS_SIDECAR_TOPIC_SECTION_PATCH_OPERATION:
            result = rebuildSynthesisTopicSectionPatchResult(
              response.result,
              task.request as SynthesisTopicSectionPatchRequest,
            );
            break;
          case SYNTHESIS_SIDECAR_GRAPH_BUILD_COMPUTE_OPERATION:
            result = rebuildSynthesisCitationGraphBuildResult(
              response.result,
              task.request as SynthesisCitationGraphBuildRequest,
            );
            break;
        }
      } catch {
        finishRuntimeFailure(task, "worker_result_invalid", created);
        return;
      }
      if (!result) {
        finishRuntimeFailure(task, "worker_result_invalid", created);
        return;
      }
      active = null;
      task.settled = true;
      clearTaskHooks(task);
      consecutiveFailures = 0;
      task.resolve(result);
      pump();
    });
    created.once("error", () => onUnexpectedWorkerFailure(created));
    created.once("exit", () => onUnexpectedWorkerFailure(created));
    return created;
  };

  pump = () => {
    if (active || termination || stopping || degraded) {
      return;
    }
    const task = queue.shift();
    if (!task) {
      return;
    }
    if (task.signal?.aborted) {
      rejectTask(task, "worker_canceled");
      queueMicrotask(pump);
      return;
    }
    active = task;
    const target = ensureRustWorker();
    task.deadline = setTimeout(() => {
      timeoutActive(task, target);
    }, task.timeoutMs);
    task.deadline.unref();
    if (task.operation === SYNTHESIS_SIDECAR_GRAPH_BUILD_TRANSFER_OPERATION) {
      const run = task.request as SynthesisSidecarGraphBuildTransferRun;
      task.rustTransferInputIterator = run.inputPages()[Symbol.asyncIterator]();
      task.rustProtocolPhase = "input";
      task.rustExpectedRequestHash = run.requestHash;
      target.postMessage({
        type: "run_begin",
        taskId: task.id,
        operation: SYNTHESIS_SIDECAR_GRAPH_BUILD_TRANSFER_OPERATION,
        requestHash: run.requestHash,
        header: run.header,
      });
      void sendNextRustTransferInput(task, target as RustComputeWorkerTarget);
      return;
    }
    switch (task.operation) {
      case SYNTHESIS_SIDECAR_COMPUTE_OPERATION:
        target.postMessage({
          type: "run",
          taskId: task.id,
          operation: SYNTHESIS_SIDECAR_COMPUTE_OPERATION,
          payload: task.request as SynthesisCitationGraphLayoutRequest,
        });
        return;
      case RUST_METRICS_OPERATION:
        target.postMessage({
          type: "run",
          taskId: task.id,
          operation: task.operation,
          payload: task.request,
        });
        return;
      case SYNTHESIS_SIDECAR_TAG_VOCABULARY_VALIDATE_OPERATION:
      case SYNTHESIS_SIDECAR_TAG_VOCABULARY_INDEX_OPERATION:
      case SYNTHESIS_SIDECAR_CONCEPT_KB_INDEX_OPERATION:
      case SYNTHESIS_SIDECAR_CONCEPT_KB_QUERY_OPERATION:
      case SYNTHESIS_SIDECAR_TOPIC_GRAPH_INDEX_OPERATION:
      case SYNTHESIS_SIDECAR_REFERENCE_BINDING_OPERATION:
      case SYNTHESIS_SIDECAR_REFERENCE_CANONICAL_DEDUPE_OPERATION:
      case SYNTHESIS_SIDECAR_TOPIC_MANIFEST_VALIDATE_OPERATION:
      case SYNTHESIS_SIDECAR_TOPIC_ARTIFACT_ASSEMBLE_OPERATION:
      case SYNTHESIS_SIDECAR_TOPIC_ARTIFACT_VALIDATE_OPERATION:
      case SYNTHESIS_SIDECAR_TOPIC_SECTION_PATCH_OPERATION:
      case SYNTHESIS_SIDECAR_GRAPH_BUILD_COMPUTE_OPERATION: {
        const paged = extractRustPagedRequest(
          task.operation,
          task.request as Exclude<
            Task["request"],
            SynthesisSidecarGraphBuildTransferRun
          >,
        );
        const pages = [...paged.pages];
        task.rustExpectedRequestHash = synthesisRustPagedRequestHash(
          task.operation,
          paged.header,
          pages.map((page) => page.descriptor),
        );
        task.rustInputPages = [];
        task.rustInputPageIterator = pages.values();
        prefetchRustInputPage(task);
        task.rustProtocolPhase = "input";
        target.postMessage({
          type: "run_begin",
          taskId: task.id,
          operation: task.operation,
          requestHash: task.rustExpectedRequestHash,
          header: paged.header,
        });
        const first = task.rustInputPages[0];
        target.postMessage({
          type: "input_page",
          taskId: task.id,
          descriptor: first.descriptor,
          rows: first.rows,
          [RUST_COMPUTE_CANONICAL_ROWS]: first.canonicalRows,
        });
        prefetchRustInputPage(task);
        return;
      }
    }
  };

  const enqueue = <
    Request extends
      | SynthesisCitationGraphLayoutRequest
      | SynthesisCitationGraphMetricsRequest
      | SynthesisCitationGraphBuildRequest
      | SynthesisTagVocabularyValidationRequest
      | SynthesisTagVocabularyIndexRequest
      | SynthesisConceptKbIndexRequest
      | SynthesisConceptKbQueryRequest
      | SynthesisTopicGraphIndexRequest
      | SynthesisReferenceBindingRequest
      | SynthesisReferenceDedupeRequest
      | SynthesisTopicManifestValidationRequest
      | SynthesisTopicArtifactAssemblyRequest
      | SynthesisTopicArtifactValidationRequest
      | SynthesisTopicSectionPatchRequest,
    Result extends
      | SynthesisCitationGraphLayoutResult
      | SynthesisCitationGraphMetricsResult
      | SynthesisCitationGraphBuildResult
      | SynthesisTagVocabularyValidationResult
      | SynthesisTagVocabularyIndexResult
      | SynthesisConceptKbIndexResult
      | SynthesisConceptKbQueryResult
      | SynthesisTopicGraphIndexResult
      | SynthesisReferenceBindingResult
      | SynthesisReferenceDedupeResult
      | SynthesisTopicValidationResult
      | SynthesisTopicArtifactAssemblyResult
      | SynthesisTopicSectionPatchResult,
  >(
    operation: Task["operation"],
    request: Request,
    runOptions: { signal?: AbortSignal },
  ): Promise<Result> => {
    if (stopping || degraded) {
      return Promise.reject(poolError("worker_unavailable"));
    }
    if (active && queue.length >= SYNTHESIS_SIDECAR_COMPUTE_LIMITS.maxQueued) {
      return Promise.reject(poolError("worker_busy"));
    }
    if (runOptions.signal?.aborted) {
      return Promise.reject(poolError("worker_canceled"));
    }
    return new Promise((resolve, reject) => {
      const task: Task = {
        id: `compute:${++taskSequence}`,
        operation,
        request,
        cancellation: new Int32Array(new SharedArrayBuffer(4)),
        resolve: (result) => resolve(result as Result),
        reject,
        signal: runOptions.signal,
        timeoutMs:
          operation === SYNTHESIS_SIDECAR_COMPUTE_OPERATION
            ? layoutExecutionTimeoutMs
            : executionTimeoutMs,
        settled: false,
        terminating: false,
      };
      if (task.signal) {
        task.abortListener = () => {
          if (task === active) {
            cancelActive(task, "worker_canceled");
            return;
          }
          const index = queue.indexOf(task);
          if (index >= 0) {
            queue.splice(index, 1);
            rejectTask(task, "worker_canceled");
          }
        };
        task.signal.addEventListener("abort", task.abortListener, {
          once: true,
        });
      }
      queue.push(task);
      pump();
    });
  };

  const runCitationGraphLayout: SynthesisSidecarComputeWorkerPool["runCitationGraphLayout"] =
    (requestInput, runOptions = {}) =>
      enqueue<
        SynthesisCitationGraphLayoutRequest,
        SynthesisCitationGraphLayoutResult
      >(
        SYNTHESIS_SIDECAR_COMPUTE_OPERATION,
        rebuildSynthesisCitationGraphLayoutRequest(requestInput),
        runOptions,
      );

  const runCitationGraphMetrics: SynthesisSidecarComputeWorkerPool["runCitationGraphMetrics"] =
    (requestInput, runOptions = {}) =>
      enqueue<
        SynthesisCitationGraphMetricsRequest,
        SynthesisCitationGraphMetricsResult
      >(
        RUST_METRICS_OPERATION,
        rebuildSynthesisCitationGraphMetricsRequest(requestInput),
        runOptions,
      );

  const runCitationGraphBuild: SynthesisSidecarComputeWorkerPool["runCitationGraphBuild"] =
    (requestInput, runOptions = {}) =>
      enqueue<
        SynthesisCitationGraphBuildRequest,
        SynthesisCitationGraphBuildResult
      >(
        SYNTHESIS_SIDECAR_GRAPH_BUILD_COMPUTE_OPERATION,
        rebuildSynthesisCitationGraphBuildRequest(requestInput),
        runOptions,
      );

  const runTagVocabularyValidation: SynthesisSidecarComputeWorkerPool["runTagVocabularyValidation"] =
    (requestInput, runOptions = {}) =>
      enqueue<
        SynthesisTagVocabularyValidationRequest,
        SynthesisTagVocabularyValidationResult
      >(
        SYNTHESIS_SIDECAR_TAG_VOCABULARY_VALIDATE_OPERATION,
        requestInput,
        runOptions,
      );

  const runTagVocabularyIndex: SynthesisSidecarComputeWorkerPool["runTagVocabularyIndex"] =
    (requestInput, runOptions = {}) =>
      enqueue<
        SynthesisTagVocabularyIndexRequest,
        SynthesisTagVocabularyIndexResult
      >(
        SYNTHESIS_SIDECAR_TAG_VOCABULARY_INDEX_OPERATION,
        requestInput,
        runOptions,
      );

  const runConceptKbIndex: SynthesisSidecarComputeWorkerPool["runConceptKbIndex"] =
    (requestInput, runOptions = {}) =>
      enqueue<SynthesisConceptKbIndexRequest, SynthesisConceptKbIndexResult>(
        SYNTHESIS_SIDECAR_CONCEPT_KB_INDEX_OPERATION,
        requestInput,
        runOptions,
      );

  const runConceptKbQuery: SynthesisSidecarComputeWorkerPool["runConceptKbQuery"] =
    (requestInput, runOptions = {}) =>
      enqueue<SynthesisConceptKbQueryRequest, SynthesisConceptKbQueryResult>(
        SYNTHESIS_SIDECAR_CONCEPT_KB_QUERY_OPERATION,
        requestInput,
        runOptions,
      );

  const runTopicGraphIndex: SynthesisSidecarComputeWorkerPool["runTopicGraphIndex"] =
    (requestInput, runOptions = {}) =>
      enqueue<SynthesisTopicGraphIndexRequest, SynthesisTopicGraphIndexResult>(
        SYNTHESIS_SIDECAR_TOPIC_GRAPH_INDEX_OPERATION,
        requestInput,
        runOptions,
      );

  const runReferenceBinding: SynthesisSidecarComputeWorkerPool["runReferenceBinding"] =
    (requestInput, runOptions = {}) =>
      enqueue<
        SynthesisReferenceBindingRequest,
        SynthesisReferenceBindingResult
      >(
        SYNTHESIS_SIDECAR_REFERENCE_BINDING_OPERATION,
        rebuildSynthesisReferenceBindingRequest(requestInput),
        runOptions,
      );

  const runReferenceCanonicalDedupe: SynthesisSidecarComputeWorkerPool["runReferenceCanonicalDedupe"] =
    (requestInput, runOptions = {}) =>
      enqueue<SynthesisReferenceDedupeRequest, SynthesisReferenceDedupeResult>(
        SYNTHESIS_SIDECAR_REFERENCE_CANONICAL_DEDUPE_OPERATION,
        rebuildSynthesisReferenceDedupeRequest(requestInput),
        runOptions,
      );

  const runTopicManifestValidation: SynthesisSidecarComputeWorkerPool["runTopicManifestValidation"] =
    (requestInput, runOptions = {}) =>
      enqueue<
        SynthesisTopicManifestValidationRequest,
        SynthesisTopicValidationResult
      >(
        SYNTHESIS_SIDECAR_TOPIC_MANIFEST_VALIDATE_OPERATION,
        rebuildSynthesisTopicManifestValidationRequest(requestInput),
        runOptions,
      );

  const runTopicArtifactAssembly: SynthesisSidecarComputeWorkerPool["runTopicArtifactAssembly"] =
    (requestInput, runOptions = {}) =>
      enqueue<
        SynthesisTopicArtifactAssemblyRequest,
        SynthesisTopicArtifactAssemblyResult
      >(
        SYNTHESIS_SIDECAR_TOPIC_ARTIFACT_ASSEMBLE_OPERATION,
        rebuildSynthesisTopicArtifactAssemblyRequest(requestInput),
        runOptions,
      );

  const runTopicArtifactValidation: SynthesisSidecarComputeWorkerPool["runTopicArtifactValidation"] =
    (requestInput, runOptions = {}) =>
      enqueue<
        SynthesisTopicArtifactValidationRequest,
        SynthesisTopicValidationResult
      >(
        SYNTHESIS_SIDECAR_TOPIC_ARTIFACT_VALIDATE_OPERATION,
        rebuildSynthesisTopicArtifactValidationRequest(requestInput),
        runOptions,
      );

  const runTopicSectionPatch: SynthesisSidecarComputeWorkerPool["runTopicSectionPatch"] =
    (requestInput, runOptions = {}) =>
      enqueue<
        SynthesisTopicSectionPatchRequest,
        SynthesisTopicSectionPatchResult
      >(
        SYNTHESIS_SIDECAR_TOPIC_SECTION_PATCH_OPERATION,
        rebuildSynthesisTopicSectionPatchRequest(requestInput),
        runOptions,
      );

  const runCitationGraphBuildTransfer: SynthesisSidecarComputeWorkerPool["runCitationGraphBuildTransfer"] =
    (run, runOptions = {}) => {
      if (stopping || degraded) {
        throw poolError("worker_unavailable");
      }
      if (
        active &&
        queue.length >= SYNTHESIS_SIDECAR_COMPUTE_LIMITS.maxQueued
      ) {
        throw poolError("worker_busy");
      }
      if (runOptions.signal?.aborted) {
        throw poolError("worker_canceled");
      }
      return new Promise<void>((resolve, reject) => {
        const task: Task = {
          id: `compute:${++taskSequence}`,
          operation: SYNTHESIS_SIDECAR_GRAPH_BUILD_TRANSFER_OPERATION,
          request: run,
          cancellation: new Int32Array(new SharedArrayBuffer(4)),
          resolve: () => resolve(),
          reject,
          signal: runOptions.signal,
          timeoutMs: transferExecutionTimeoutMs,
          settled: false,
          terminating: false,
        };
        if (task.signal) {
          task.abortListener = () => {
            if (task === active) {
              cancelActive(task, "worker_canceled");
              return;
            }
            const index = queue.indexOf(task);
            if (index >= 0) {
              queue.splice(index, 1);
              rejectTask(task, "worker_canceled");
            }
          };
          task.signal.addEventListener("abort", task.abortListener, {
            once: true,
          });
        }
        queue.push(task);
        pump();
      });
    };

  const shutdown = () => {
    if (shutdownPromise) {
      return shutdownPromise;
    }
    stopping = true;
    rejectQueue("worker_canceled");
    shutdownPromise = (async () => {
      const stop = (async () => {
        if (active) {
          cancelActive(active, "worker_canceled");
        } else if (rustWorker) {
          termination = terminateWorker(
            rustWorker,
            cancellationGraceMs,
          ).finally(() => {
            termination = null;
          });
        }
        await termination;
      })();
      await Promise.race([stop, delay(shutdownTimeoutMs)]);
      if (rustWorker) {
        await terminateWorker(rustWorker, 0);
      }
      if (active) {
        const task = active;
        active = null;
        rejectTask(task, "worker_canceled");
      }
    })();
    return shutdownPromise;
  };

  return {
    runCitationGraphLayout,
    runCitationGraphMetrics,
    runCitationGraphBuild,
    runTagVocabularyValidation,
    runTagVocabularyIndex,
    runConceptKbIndex,
    runConceptKbQuery,
    runTopicGraphIndex,
    runReferenceBinding,
    runReferenceCanonicalDedupe,
    runTopicManifestValidation,
    runTopicArtifactAssembly,
    runTopicArtifactValidation,
    runTopicSectionPatch,
    runCitationGraphBuildTransfer,
    snapshot,
    shutdown,
  };
}
