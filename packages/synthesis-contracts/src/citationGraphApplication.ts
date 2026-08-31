import {
  SynthesisClientError,
  toSynthesisJsonObject,
  type SynthesisJsonObject,
} from "./common.js";

export const SYNTHESIS_CITATION_GRAPH_APPLICATION_LIMITS = {
  sliceDepth: 2,
  sliceNodes: 200,
  sliceEdges: 500,
  metricsPage: 100,
  metricsPaperRefs: 250,
  layoutNodes: 5_000,
  layoutEdges: 20_000,
  rebuildRequestBytes: 8 * 1024 * 1024,
  rebuildRequestJsonNodes: 250_000,
  rebuildResultJsonNodes: 50_000,
} as const;

export type SynthesisCitationGraphApplicationDirection =
  | "incoming"
  | "outgoing"
  | "both";
export type SynthesisCitationGraphApplicationPreset =
  | "force"
  | "radial"
  | "components";
export type SynthesisCitationGraphApplicationMetricsSort =
  | "foundation"
  | "frontier"
  | "pagerank"
  | "in_degree";

export type SynthesisCitationGraphApplicationSliceRequest = {
  rootNodeId: string;
  depth: number;
  direction: SynthesisCitationGraphApplicationDirection;
  roleFilter: string[];
  includeLowSignal: boolean;
  maxNodes: number;
  maxEdges: number;
};

export type SynthesisCitationGraphApplicationMetricsRequest = {
  cursor: string;
  limit: number;
  sortBy: SynthesisCitationGraphApplicationMetricsSort;
  paperRefs: string[];
};

export type SynthesisCitationGraphApplicationLayoutScope =
  | { kind: "full" }
  | {
      kind: "slice";
      rootNodeId: string;
      depth: number;
      direction: SynthesisCitationGraphApplicationDirection;
    }
  | { kind: "explicit"; nodeIds: string[] };

export type SynthesisCitationGraphApplicationLayoutRequest = {
  preset: SynthesisCitationGraphApplicationPreset;
  scope: SynthesisCitationGraphApplicationLayoutScope;
  maxNodes: number;
  maxEdges: number;
};

export type SynthesisCitationGraphApplicationRebuildRequest = {
  expectedGraphHash: string | null;
  force: boolean;
  input: SynthesisJsonObject;
};

export type SynthesisCitationGraphApplicationRefreshMetricsRequest = {
  expectedGraphHash: string | null;
};

export type SynthesisCitationGraphApplicationInspectResult = {
  graphHash: string | null;
  inputHash: string | null;
  metricsHash: string | null;
  nodeCount: number;
  edgeCount: number;
  metricsReady: boolean;
  layoutPresets: SynthesisCitationGraphApplicationPreset[];
};

export type SynthesisCitationGraphApplicationMutationStatus =
  | "promoted"
  | "unchanged"
  | "basis_mismatch"
  | "graph_application_busy"
  | "worker_busy"
  | "worker_failed"
  | "invalid_request"
  | "repair_required"
  | "stopping";

export type SynthesisCitationGraphApplicationMutationResult = {
  status: SynthesisCitationGraphApplicationMutationStatus;
  graphHash: string | null;
  inputHash: string | null;
  metricsHash: string | null;
  warnings: string[];
};

const mutationStatuses = [
  "promoted",
  "unchanged",
  "basis_mismatch",
  "graph_application_busy",
  "worker_busy",
  "worker_failed",
  "invalid_request",
  "repair_required",
  "stopping",
] as const satisfies readonly SynthesisCitationGraphApplicationMutationStatus[];

const mutationWarnings = [
  "citation_graph_metrics_refresh_failed",
  "citation_graph_operation_receipt_failed",
] as const;

function invalid(location: string): never {
  throw new SynthesisClientError(
    "invalid_request",
    `Invalid Citation Graph application value at ${location}`,
    { location },
  );
}

function exactFields(
  input: SynthesisJsonObject,
  allowed: readonly string[],
  location: string,
) {
  const expected = new Set(allowed);
  if (Object.keys(input).some((field) => !expected.has(field))) {
    invalid(`${location}.fields`);
  }
}

function requiredId(value: unknown, location: string) {
  if (
    typeof value !== "string" ||
    value !== value.trim() ||
    !value ||
    value.length > 512 ||
    [...value].some((character) => {
      const code = character.charCodeAt(0);
      return code <= 0x1f || code === 0x7f;
    })
  ) {
    invalid(location);
  }
  return value;
}

function hashOrNull(value: unknown, location: string) {
  if (value === null) return null;
  if (typeof value !== "string" || !/^sha256:[a-f0-9]{64}$/.test(value)) {
    invalid(location);
  }
  return value;
}

function integer(
  value: unknown,
  fallback: number,
  min: number,
  max: number,
  location: string,
) {
  const candidate = value === undefined ? fallback : value;
  if (
    typeof candidate !== "number" ||
    !Number.isSafeInteger(candidate) ||
    candidate < min ||
    candidate > max
  ) {
    invalid(location);
  }
  return candidate;
}

function uniqueIds(value: unknown, max: number, location: string) {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > max) invalid(location);
  const ids = value.map((entry, index) =>
    requiredId(entry, `${location}[${index}]`),
  );
  if (new Set(ids).size !== ids.length) invalid(location);
  return ids.sort((left, right) => left.localeCompare(right));
}

function direction(
  value: unknown,
  location: string,
): SynthesisCitationGraphApplicationDirection {
  const normalized = value === undefined ? "both" : value;
  if (
    normalized !== "incoming" &&
    normalized !== "outgoing" &&
    normalized !== "both"
  ) {
    invalid(location);
  }
  return normalized;
}

function preset(
  value: unknown,
  location: string,
): SynthesisCitationGraphApplicationPreset {
  if (value !== "force" && value !== "radial" && value !== "components") {
    invalid(location);
  }
  return value;
}

export function rebuildSynthesisCitationGraphApplicationSliceRequest(
  value: unknown,
): SynthesisCitationGraphApplicationSliceRequest {
  const input = toSynthesisJsonObject(value, "citationGraphSliceRequest");
  exactFields(
    input,
    [
      "rootNodeId",
      "depth",
      "direction",
      "roleFilter",
      "includeLowSignal",
      "maxNodes",
      "maxEdges",
    ],
    "citationGraphSliceRequest",
  );
  if (
    input.includeLowSignal !== undefined &&
    typeof input.includeLowSignal !== "boolean"
  ) {
    invalid("includeLowSignal");
  }
  return {
    rootNodeId: requiredId(input.rootNodeId, "rootNodeId"),
    depth: integer(
      input.depth,
      1,
      0,
      SYNTHESIS_CITATION_GRAPH_APPLICATION_LIMITS.sliceDepth,
      "depth",
    ),
    direction: direction(input.direction, "direction"),
    roleFilter: uniqueIds(input.roleFilter, 256, "roleFilter"),
    includeLowSignal: input.includeLowSignal === true,
    maxNodes: integer(
      input.maxNodes,
      80,
      1,
      SYNTHESIS_CITATION_GRAPH_APPLICATION_LIMITS.sliceNodes,
      "maxNodes",
    ),
    maxEdges: integer(
      input.maxEdges,
      160,
      1,
      SYNTHESIS_CITATION_GRAPH_APPLICATION_LIMITS.sliceEdges,
      "maxEdges",
    ),
  };
}

export function rebuildSynthesisCitationGraphApplicationMetricsRequest(
  value: unknown = {},
): SynthesisCitationGraphApplicationMetricsRequest {
  const input = toSynthesisJsonObject(value, "citationGraphMetricsRequest");
  exactFields(
    input,
    ["cursor", "limit", "sortBy", "paperRefs"],
    "citationGraphMetricsRequest",
  );
  const cursor = input.cursor === undefined ? "" : input.cursor;
  if (
    typeof cursor !== "string" ||
    !/^\d*$/.test(cursor) ||
    (cursor && !Number.isSafeInteger(Number(cursor)))
  ) {
    invalid("cursor");
  }
  const sortBy = input.sortBy === undefined ? "foundation" : input.sortBy;
  if (
    sortBy !== "foundation" &&
    sortBy !== "frontier" &&
    sortBy !== "pagerank" &&
    sortBy !== "in_degree"
  ) {
    invalid("sortBy");
  }
  return {
    cursor,
    limit: integer(
      input.limit,
      25,
      1,
      SYNTHESIS_CITATION_GRAPH_APPLICATION_LIMITS.metricsPage,
      "limit",
    ),
    sortBy,
    paperRefs: uniqueIds(
      input.paperRefs,
      SYNTHESIS_CITATION_GRAPH_APPLICATION_LIMITS.metricsPaperRefs,
      "paperRefs",
    ),
  };
}

function rebuildLayoutScope(
  value: unknown,
): SynthesisCitationGraphApplicationLayoutScope {
  if (value === undefined) return { kind: "full" };
  const input = toSynthesisJsonObject(value, "layoutScope");
  if (input.kind === "full") {
    exactFields(input, ["kind"], "layoutScope");
    return { kind: "full" };
  }
  if (input.kind === "slice") {
    exactFields(
      input,
      ["kind", "rootNodeId", "depth", "direction"],
      "layoutScope",
    );
    return {
      kind: "slice",
      rootNodeId: requiredId(input.rootNodeId, "layoutScope.rootNodeId"),
      depth: integer(
        input.depth,
        1,
        0,
        SYNTHESIS_CITATION_GRAPH_APPLICATION_LIMITS.sliceDepth,
        "layoutScope.depth",
      ),
      direction: direction(input.direction, "layoutScope.direction"),
    };
  }
  if (input.kind === "explicit") {
    exactFields(input, ["kind", "nodeIds"], "layoutScope");
    const nodeIds = uniqueIds(
      input.nodeIds,
      SYNTHESIS_CITATION_GRAPH_APPLICATION_LIMITS.layoutNodes,
      "layoutScope.nodeIds",
    );
    if (!nodeIds.length) invalid("layoutScope.nodeIds");
    return { kind: "explicit", nodeIds };
  }
  return invalid("layoutScope.kind");
}

export function rebuildSynthesisCitationGraphApplicationLayoutRequest(
  value: unknown,
): SynthesisCitationGraphApplicationLayoutRequest {
  const input = toSynthesisJsonObject(value, "citationGraphLayoutRequest");
  exactFields(
    input,
    ["preset", "scope", "maxNodes", "maxEdges"],
    "citationGraphLayoutRequest",
  );
  const selectedPreset = preset(input.preset, "preset");
  return {
    preset: selectedPreset,
    scope: rebuildLayoutScope(input.scope),
    maxNodes: integer(
      input.maxNodes,
      200,
      1,
      SYNTHESIS_CITATION_GRAPH_APPLICATION_LIMITS.layoutNodes,
      "maxNodes",
    ),
    maxEdges: integer(
      input.maxEdges,
      500,
      1,
      SYNTHESIS_CITATION_GRAPH_APPLICATION_LIMITS.layoutEdges,
      "maxEdges",
    ),
  };
}

export function rebuildSynthesisCitationGraphApplicationRebuildRequest(
  value: unknown,
): SynthesisCitationGraphApplicationRebuildRequest {
  const input = toSynthesisJsonObject(value, "citationGraphRebuildRequest");
  exactFields(
    input,
    ["expectedGraphHash", "force", "input"],
    "citationGraphRebuildRequest",
  );
  if (typeof input.force !== "boolean") invalid("force");
  const graphInput = toSynthesisJsonObject(input.input, "input");
  exactFields(
    graphInput,
    ["contractVersion", "scope", "rolePriority", "libraryNodes", "references"],
    "input",
  );
  const scope = toSynthesisJsonObject(graphInput.scope, "input.scope");
  exactFields(scope, ["kind", "sourceIds"], "input.scope");
  if (
    scope.kind !== "full" ||
    !Array.isArray(scope.sourceIds) ||
    !Array.isArray(graphInput.libraryNodes) ||
    scope.sourceIds.length !== graphInput.libraryNodes.length ||
    !Array.isArray(graphInput.rolePriority) ||
    !Array.isArray(graphInput.references)
  ) {
    invalid("input.scope");
  }
  return {
    expectedGraphHash: hashOrNull(input.expectedGraphHash, "expectedGraphHash"),
    force: input.force,
    input: graphInput,
  };
}

export function rebuildSynthesisCitationGraphApplicationRefreshMetricsRequest(
  value: unknown,
): SynthesisCitationGraphApplicationRefreshMetricsRequest {
  const input = toSynthesisJsonObject(value, "citationGraphRefreshMetrics");
  exactFields(input, ["expectedGraphHash"], "citationGraphRefreshMetrics");
  return {
    expectedGraphHash: hashOrNull(input.expectedGraphHash, "expectedGraphHash"),
  };
}

export function rebuildSynthesisCitationGraphApplicationInspectResult(
  value: unknown,
): SynthesisCitationGraphApplicationInspectResult {
  const input = toSynthesisJsonObject(value, "citationGraphInspectResult");
  exactFields(
    input,
    [
      "graphHash",
      "inputHash",
      "metricsHash",
      "nodeCount",
      "edgeCount",
      "metricsReady",
      "layoutPresets",
    ],
    "citationGraphInspectResult",
  );
  if (
    typeof input.metricsReady !== "boolean" ||
    !Array.isArray(input.layoutPresets)
  ) {
    invalid("citationGraphInspectResult.readiness");
  }
  const layoutPresets = input.layoutPresets.map((entry, index) =>
    preset(entry, `citationGraphInspectResult.layoutPresets[${index}]`),
  );
  if (
    new Set(layoutPresets).size !== layoutPresets.length ||
    layoutPresets.some(
      (entry, index) => index > 0 && layoutPresets[index - 1]! >= entry,
    )
  ) {
    invalid("citationGraphInspectResult.layoutPresets");
  }
  return {
    graphHash: hashOrNull(
      input.graphHash,
      "citationGraphInspectResult.graphHash",
    ),
    inputHash: hashOrNull(
      input.inputHash,
      "citationGraphInspectResult.inputHash",
    ),
    metricsHash: hashOrNull(
      input.metricsHash,
      "citationGraphInspectResult.metricsHash",
    ),
    nodeCount: integer(
      input.nodeCount,
      0,
      0,
      Number.MAX_SAFE_INTEGER,
      "citationGraphInspectResult.nodeCount",
    ),
    edgeCount: integer(
      input.edgeCount,
      0,
      0,
      Number.MAX_SAFE_INTEGER,
      "citationGraphInspectResult.edgeCount",
    ),
    metricsReady: input.metricsReady,
    layoutPresets,
  };
}

export function rebuildSynthesisCitationGraphApplicationMutationResult(
  value: unknown,
): SynthesisCitationGraphApplicationMutationResult {
  const input = toSynthesisJsonObject(value, "citationGraphMutationResult");
  exactFields(
    input,
    ["status", "graphHash", "inputHash", "metricsHash", "warnings"],
    "citationGraphMutationResult",
  );
  if (
    typeof input.status !== "string" ||
    !mutationStatuses.includes(
      input.status as SynthesisCitationGraphApplicationMutationStatus,
    ) ||
    !Array.isArray(input.warnings) ||
    input.warnings.length > mutationWarnings.length
  ) {
    invalid("citationGraphMutationResult");
  }
  const warnings = input.warnings.map((entry, index) => {
    if (
      typeof entry !== "string" ||
      !mutationWarnings.includes(entry as (typeof mutationWarnings)[number])
    ) {
      invalid(`citationGraphMutationResult.warnings[${index}]`);
    }
    return entry;
  });
  if (new Set(warnings).size !== warnings.length) {
    invalid("citationGraphMutationResult.warnings");
  }
  return {
    status: input.status as SynthesisCitationGraphApplicationMutationStatus,
    graphHash: hashOrNull(
      input.graphHash,
      "citationGraphMutationResult.graphHash",
    ),
    inputHash: hashOrNull(
      input.inputHash,
      "citationGraphMutationResult.inputHash",
    ),
    metricsHash: hashOrNull(
      input.metricsHash,
      "citationGraphMutationResult.metricsHash",
    ),
    warnings,
  };
}
