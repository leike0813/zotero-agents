export const SYNTHESIS_CITATION_GRAPH_BUILD_CONTRACT_VERSION =
  "synthesis-citation-graph-build.v1" as const;
export const SYNTHESIS_CITATION_GRAPH_BUILD_SOURCE_MAX = 25_000 as const;
export const SYNTHESIS_CITATION_GRAPH_BUILD_REFERENCE_MAX = 1_250_000 as const;
export const SYNTHESIS_CITATION_GRAPH_BUILD_TARGET_MAX = 750_000 as const;

const IDENTIFIER_MAX = 512;
const TEXT_MAX = 4096;
const ROLE_MAX = 256;
const LIST_MAX = 256;

export type SynthesisCitationGraphBuildScope = {
  kind: "full" | "source_slice";
  sourceIds: string[];
};

export type SynthesisCitationGraphBuildLibraryNode = {
  nodeId: string;
  title?: string;
  year?: string;
  authors: string[];
  aliases: string[];
};

export type SynthesisCitationGraphBuildTargetKind =
  | "library_paper"
  | "external_reference"
  | "unresolved_reference";

export type SynthesisCitationGraphBuildReference = {
  referenceId: string;
  edgeId: string;
  sourceId: string;
  sourceRef?: string;
  targetId: string;
  targetKind: SynthesisCitationGraphBuildTargetKind;
  targetTitle?: string;
  targetYear?: string;
  targetAuthors: string[];
  targetAliases: string[];
  roles: string[];
  weight: number;
};

export type SynthesisCitationGraphBuildRequest = {
  contractVersion: typeof SYNTHESIS_CITATION_GRAPH_BUILD_CONTRACT_VERSION;
  scope: SynthesisCitationGraphBuildScope;
  rolePriority: string[];
  libraryNodes: SynthesisCitationGraphBuildLibraryNode[];
  references: SynthesisCitationGraphBuildReference[];
};

export type SynthesisCitationGraphBuildNode = {
  nodeId: string;
  kind: SynthesisCitationGraphBuildTargetKind;
  title?: string;
  year?: string;
  authors: string[];
  aliases: string[];
};

export type SynthesisCitationGraphBuildResolvedEdge = {
  edgeId: string;
  referenceId: string;
  sourceId: string;
  targetId: string;
  status: "accepted" | "unbound";
  roles: string[];
  weight: number;
};

export type SynthesisCitationGraphBuildRoleEvidence = {
  role: string;
  count: number;
};

export type SynthesisCitationGraphBuildAggregateEdge = {
  sourceId: string;
  targetId: string;
  mentionCount: number;
  primaryRole: string;
  auxRoles: SynthesisCitationGraphBuildRoleEvidence[];
  roleEvidence: SynthesisCitationGraphBuildRoleEvidence[];
  sourceRefs: string[];
};

export type SynthesisCitationGraphBuildOwnership = {
  sourceId: string;
  edgeId: string;
  referenceId: string;
  targetId: string;
  status: "accepted" | "unbound";
};

export type SynthesisCitationGraphBuildLightMetric = {
  nodeId: string;
  outgoingCount: number;
  incomingCount: number;
  localDegree: number;
  matchedOutgoingCount: number;
  unresolvedOutgoingCount: number;
  ambiguousOutgoingCount: 0;
};

export type SynthesisCitationGraphBuildResult = {
  contractVersion: typeof SYNTHESIS_CITATION_GRAPH_BUILD_CONTRACT_VERSION;
  scope: SynthesisCitationGraphBuildScope;
  nodes: SynthesisCitationGraphBuildNode[];
  resolvedEdges: SynthesisCitationGraphBuildResolvedEdge[];
  aggregateEdges: SynthesisCitationGraphBuildAggregateEdge[];
  sourceOwnership: SynthesisCitationGraphBuildOwnership[];
  incomingGroups: SynthesisCitationGraphBuildOwnership[];
  lightMetrics: SynthesisCitationGraphBuildLightMetric[];
  diagnostics: {
    nodeCounts: Record<SynthesisCitationGraphBuildTargetKind, number>;
    referenceCount: number;
    aggregateEdgeCount: number;
  };
};

export type SynthesisCitationGraphBuildBounds = {
  sourceMax?: number;
  referenceMax?: number;
  targetMax?: number;
};

export type SynthesisCitationGraphBuildCheckpoint = (checkpoint: {
  phase: "start" | "references" | "aggregate" | "complete";
  processed?: number;
  total?: number;
}) => void;

export interface SynthesisCitationGraphBuildEngine {
  compute(
    request: SynthesisCitationGraphBuildRequest,
  ): Promise<SynthesisCitationGraphBuildResult>;
}

export class SynthesisCitationGraphBuildContractError extends Error {
  readonly code = "invalid_request";

  constructor(message: string) {
    super(message);
    this.name = "SynthesisCitationGraphBuildContractError";
  }
}

function invalid(message: string): never {
  throw new SynthesisCitationGraphBuildContractError(message);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function assertJsonSafe(
  value: unknown,
  location: string,
  seen = new Set<object>(),
): void {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "boolean"
  ) {
    return;
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      invalid(`${location} must contain finite numbers`);
    }
    return;
  }
  if (typeof value !== "object" || value === undefined) {
    invalid(`${location} must be JSON-safe`);
  }
  const object = value as object;
  if (seen.has(object)) {
    invalid(`${location} must not contain cycles`);
  }
  seen.add(object);
  if (Array.isArray(value)) {
    value.forEach((entry, index) =>
      assertJsonSafe(entry, `${location}[${index}]`, seen),
    );
  } else if (isPlainObject(value)) {
    for (const [key, entry] of Object.entries(value)) {
      assertJsonSafe(entry, `${location}.${key}`, seen);
    }
  } else {
    invalid(`${location} must contain plain objects`);
  }
  seen.delete(object);
}

function jsonObject(value: unknown, location: string) {
  assertJsonSafe(value, location);
  if (!isPlainObject(value)) {
    return invalid(`${location} must be an object`);
  }
  return value;
}

function jsonArray(value: unknown, location: string) {
  if (!Array.isArray(value)) {
    return invalid(`${location} must be an array`);
  }
  return value;
}

function hasControlCharacter(value: string) {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code <= 0x1f || code === 0x7f) {
      return true;
    }
  }
  return false;
}

function requiredString(value: unknown, location: string, max = TEXT_MAX) {
  if (typeof value !== "string") {
    return invalid(`${location} must be a string`);
  }
  const normalized = value.trim();
  if (
    !normalized ||
    normalized !== value ||
    normalized.length > max ||
    hasControlCharacter(normalized)
  ) {
    return invalid(`${location} is invalid`);
  }
  return normalized;
}

function optionalString(value: unknown, location: string) {
  if (value === undefined) {
    return undefined;
  }
  return requiredString(value, location);
}

function positiveInteger(value: unknown, location: string) {
  if (!Number.isInteger(value) || Number(value) <= 0) {
    return invalid(`${location} must be a positive integer`);
  }
  return Number(value);
}

function finitePositive(value: unknown, location: string) {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return invalid(`${location} must be finite and positive`);
  }
  return value;
}

function stringList(
  value: unknown,
  location: string,
  options: { max?: number; unique?: boolean; sort?: boolean } = {},
) {
  const rows = jsonArray(value, location);
  if (rows.length > (options.max ?? LIST_MAX)) {
    return invalid(`${location} exceeds its limit`);
  }
  const rebuilt = rows.map((entry, index) =>
    requiredString(entry, `${location}[${index}]`, ROLE_MAX),
  );
  if (options.unique && new Set(rebuilt).size !== rebuilt.length) {
    return invalid(`${location} must contain unique values`);
  }
  return options.sort ? [...rebuilt].sort() : rebuilt;
}

function targetKind(
  value: unknown,
  location: string,
): SynthesisCitationGraphBuildTargetKind {
  if (
    value === "library_paper" ||
    value === "external_reference" ||
    value === "unresolved_reference"
  ) {
    return value;
  }
  return invalid(`${location} is invalid`);
}

function boundsWithDefaults(input: SynthesisCitationGraphBuildBounds = {}) {
  const sourceMax =
    input.sourceMax === undefined
      ? SYNTHESIS_CITATION_GRAPH_BUILD_SOURCE_MAX
      : positiveInteger(input.sourceMax, "bounds.sourceMax");
  const referenceMax =
    input.referenceMax === undefined
      ? SYNTHESIS_CITATION_GRAPH_BUILD_REFERENCE_MAX
      : positiveInteger(input.referenceMax, "bounds.referenceMax");
  const targetMax =
    input.targetMax === undefined
      ? SYNTHESIS_CITATION_GRAPH_BUILD_TARGET_MAX
      : Math.max(0, Number(input.targetMax));
  if (!Number.isInteger(targetMax) || targetMax < 0) {
    return invalid("bounds.targetMax must be a non-negative integer");
  }
  return { sourceMax, referenceMax, targetMax };
}

function rebuildScope(value: unknown): SynthesisCitationGraphBuildScope {
  const object = jsonObject(value, "scope");
  const kind = object.kind;
  if (kind !== "full" && kind !== "source_slice") {
    return invalid("scope.kind is invalid");
  }
  const sourceIds = stringList(object.sourceIds, "scope.sourceIds", {
    max: SYNTHESIS_CITATION_GRAPH_BUILD_SOURCE_MAX,
    unique: true,
    sort: true,
  });
  return { kind, sourceIds };
}

function rebuildLibraryNode(
  value: unknown,
  location: string,
): SynthesisCitationGraphBuildLibraryNode {
  const object = jsonObject(value, location);
  const node: SynthesisCitationGraphBuildLibraryNode = {
    nodeId: requiredString(object.nodeId, `${location}.nodeId`, IDENTIFIER_MAX),
    authors: stringList(object.authors ?? [], `${location}.authors`),
    aliases: stringList(object.aliases ?? [], `${location}.aliases`, {
      unique: true,
      sort: true,
    }),
  };
  const title = optionalString(object.title, `${location}.title`);
  const year = optionalString(object.year, `${location}.year`);
  if (title !== undefined) {
    node.title = title;
  }
  if (year !== undefined) {
    node.year = year;
  }
  return node;
}

function rebuildReference(
  value: unknown,
  location: string,
): SynthesisCitationGraphBuildReference {
  const object = jsonObject(value, location);
  const reference: SynthesisCitationGraphBuildReference = {
    referenceId: requiredString(
      object.referenceId,
      `${location}.referenceId`,
      IDENTIFIER_MAX,
    ),
    edgeId: requiredString(object.edgeId, `${location}.edgeId`, IDENTIFIER_MAX),
    sourceId: requiredString(
      object.sourceId,
      `${location}.sourceId`,
      IDENTIFIER_MAX,
    ),
    targetId: requiredString(
      object.targetId,
      `${location}.targetId`,
      IDENTIFIER_MAX,
    ),
    targetKind: targetKind(object.targetKind, `${location}.targetKind`),
    targetAuthors: stringList(
      object.targetAuthors ?? [],
      `${location}.targetAuthors`,
    ),
    targetAliases: stringList(
      object.targetAliases ?? [],
      `${location}.targetAliases`,
      { unique: true, sort: true },
    ),
    roles: stringList(object.roles ?? [], `${location}.roles`),
    weight: finitePositive(object.weight, `${location}.weight`),
  };
  const sourceRef = optionalString(object.sourceRef, `${location}.sourceRef`);
  const targetTitle = optionalString(
    object.targetTitle,
    `${location}.targetTitle`,
  );
  const targetYear = optionalString(
    object.targetYear,
    `${location}.targetYear`,
  );
  if (sourceRef !== undefined) {
    reference.sourceRef = sourceRef;
  }
  if (targetTitle !== undefined) {
    reference.targetTitle = targetTitle;
  }
  if (targetYear !== undefined) {
    reference.targetYear = targetYear;
  }
  return reference;
}

export function rebuildSynthesisCitationGraphBuildRequest(
  value: unknown,
  boundsInput: SynthesisCitationGraphBuildBounds = {},
): SynthesisCitationGraphBuildRequest {
  const bounds = boundsWithDefaults(boundsInput);
  const object = jsonObject(value, "request");
  if (
    object.contractVersion !== SYNTHESIS_CITATION_GRAPH_BUILD_CONTRACT_VERSION
  ) {
    return invalid("contractVersion is invalid");
  }
  const scope = rebuildScope(object.scope);
  const rolePriority = stringList(object.rolePriority ?? [], "rolePriority", {
    unique: true,
  });
  const libraryNodes = jsonArray(object.libraryNodes, "libraryNodes").map(
    (entry, index) => rebuildLibraryNode(entry, `libraryNodes[${index}]`),
  );
  if (libraryNodes.length > bounds.sourceMax) {
    return invalid("libraryNodes exceeds its limit");
  }
  libraryNodes.sort((left, right) => left.nodeId.localeCompare(right.nodeId));
  const libraryIds = new Set<string>();
  for (const node of libraryNodes) {
    if (libraryIds.has(node.nodeId)) {
      return invalid("libraryNodes contains duplicate nodeId");
    }
    libraryIds.add(node.nodeId);
  }
  for (const sourceId of scope.sourceIds) {
    if (!libraryIds.has(sourceId)) {
      return invalid("scope references a missing source node");
    }
  }

  const references = jsonArray(object.references, "references").map(
    (entry, index) => rebuildReference(entry, `references[${index}]`),
  );
  if (references.length > bounds.referenceMax) {
    return invalid("references exceeds its limit");
  }
  references.sort((left, right) =>
    left.referenceId.localeCompare(right.referenceId),
  );
  const referenceIds = new Set<string>();
  const edgeIds = new Set<string>();
  const targetIds = new Set<string>();
  for (const reference of references) {
    if (referenceIds.has(reference.referenceId)) {
      return invalid("references contains duplicate referenceId");
    }
    if (edgeIds.has(reference.edgeId)) {
      return invalid("references contains duplicate edgeId");
    }
    if (!libraryIds.has(reference.sourceId)) {
      return invalid("reference source is missing");
    }
    if (
      reference.targetKind === "library_paper" &&
      !libraryIds.has(reference.targetId)
    ) {
      return invalid("library reference target is missing");
    }
    referenceIds.add(reference.referenceId);
    edgeIds.add(reference.edgeId);
    if (reference.targetKind !== "library_paper") {
      targetIds.add(reference.targetId);
    }
  }
  if (targetIds.size > bounds.targetMax) {
    return invalid("external targets exceed their limit");
  }
  return {
    contractVersion: SYNTHESIS_CITATION_GRAPH_BUILD_CONTRACT_VERSION,
    scope,
    rolePriority,
    libraryNodes,
    references,
  };
}

function mergeNodeMetadata(
  current: SynthesisCitationGraphBuildNode,
  incoming: {
    title?: string;
    year?: string;
    authors: string[];
    aliases: string[];
  },
) {
  if (!current.title && incoming.title) {
    current.title = incoming.title;
  }
  if (!current.year && incoming.year) {
    current.year = incoming.year;
  }
  if (!current.authors.length && incoming.authors.length) {
    current.authors = [...incoming.authors];
  }
  current.aliases = Array.from(
    new Set([...current.aliases, ...incoming.aliases]),
  ).sort();
}

function buildNode(input: {
  nodeId: string;
  kind: SynthesisCitationGraphBuildTargetKind;
  title?: string;
  year?: string;
  authors: string[];
  aliases: string[];
}): SynthesisCitationGraphBuildNode {
  const node: SynthesisCitationGraphBuildNode = {
    nodeId: input.nodeId,
    kind: input.kind,
    authors: [...input.authors],
    aliases: [...input.aliases],
  };
  if (input.title) {
    node.title = input.title;
  }
  if (input.year) {
    node.year = input.year;
  }
  return node;
}

function selectPrimaryRole(
  counts: Map<string, number>,
  rolePriority: string[],
) {
  if (!counts.size) {
    return "unspecified";
  }
  const priority = new Map(rolePriority.map((role, index) => [role, index]));
  return [...counts.entries()].sort((left, right) => {
    const countOrder = right[1] - left[1];
    if (countOrder) {
      return countOrder;
    }
    const leftPriority = priority.get(left[0]) ?? Number.MAX_SAFE_INTEGER;
    const rightPriority = priority.get(right[0]) ?? Number.MAX_SAFE_INTEGER;
    return leftPriority - rightPriority || left[0].localeCompare(right[0]);
  })[0][0];
}

export function computeSynthesisCitationGraphBuild(
  requestInput: SynthesisCitationGraphBuildRequest,
  options: {
    bounds?: SynthesisCitationGraphBuildBounds;
    checkpoint?: SynthesisCitationGraphBuildCheckpoint;
    checkpointInterval?: number;
  } = {},
): SynthesisCitationGraphBuildResult {
  const request = rebuildSynthesisCitationGraphBuildRequest(
    requestInput,
    options.bounds,
  );
  const checkpointInterval = positiveInteger(
    options.checkpointInterval ?? 1024,
    "checkpointInterval",
  );
  options.checkpoint?.({
    phase: "start",
    processed: 0,
    total: request.references.length,
  });
  const nodes = new Map<string, SynthesisCitationGraphBuildNode>();
  for (const node of request.libraryNodes) {
    nodes.set(
      node.nodeId,
      buildNode({
        ...node,
        kind: "library_paper",
      }),
    );
  }
  const resolvedEdges: SynthesisCitationGraphBuildResolvedEdge[] = [];
  const aggregate = new Map<
    string,
    {
      sourceId: string;
      targetId: string;
      mentionCount: number;
      roleCounts: Map<string, number>;
      sourceRefs: string[];
    }
  >();
  for (const [index, reference] of request.references.entries()) {
    if (index % checkpointInterval === 0) {
      options.checkpoint?.({
        phase: "references",
        processed: index,
        total: request.references.length,
      });
    }
    const existingTarget = nodes.get(reference.targetId);
    if (existingTarget) {
      mergeNodeMetadata(existingTarget, {
        title: reference.targetTitle,
        year: reference.targetYear,
        authors: reference.targetAuthors,
        aliases: reference.targetAliases,
      });
    } else {
      nodes.set(
        reference.targetId,
        buildNode({
          nodeId: reference.targetId,
          kind: reference.targetKind,
          title: reference.targetTitle,
          year: reference.targetYear,
          authors: reference.targetAuthors,
          aliases: reference.targetAliases,
        }),
      );
    }
    const status =
      reference.targetKind === "library_paper" ? "accepted" : "unbound";
    resolvedEdges.push({
      edgeId: reference.edgeId,
      referenceId: reference.referenceId,
      sourceId: reference.sourceId,
      targetId: reference.targetId,
      status,
      roles: [...reference.roles],
      weight: reference.weight,
    });
    const aggregateKey = `${reference.sourceId}\0${reference.targetId}`;
    const entry = aggregate.get(aggregateKey) || {
      sourceId: reference.sourceId,
      targetId: reference.targetId,
      mentionCount: 0,
      roleCounts: new Map<string, number>(),
      sourceRefs: [],
    };
    entry.mentionCount += reference.weight;
    entry.sourceRefs.push(reference.sourceRef || reference.referenceId);
    for (const role of reference.roles) {
      entry.roleCounts.set(role, (entry.roleCounts.get(role) || 0) + 1);
    }
    aggregate.set(aggregateKey, entry);
  }
  options.checkpoint?.({
    phase: "aggregate",
    processed: request.references.length,
    total: request.references.length,
  });
  const aggregateEdges = [...aggregate.values()]
    .map((entry): SynthesisCitationGraphBuildAggregateEdge => {
      const primaryRole = selectPrimaryRole(
        entry.roleCounts,
        request.rolePriority,
      );
      const roleEvidence = [...entry.roleCounts.entries()]
        .map(([role, count]) => ({ role, count }))
        .sort(
          (left, right) =>
            right.count - left.count || left.role.localeCompare(right.role),
        );
      return {
        sourceId: entry.sourceId,
        targetId: entry.targetId,
        mentionCount: entry.mentionCount,
        primaryRole,
        auxRoles: roleEvidence
          .filter((entry) => entry.role !== primaryRole)
          .map((entry) => ({ ...entry })),
        roleEvidence,
        sourceRefs: entry.sourceRefs,
      };
    })
    .sort(
      (left, right) =>
        left.sourceId.localeCompare(right.sourceId) ||
        left.targetId.localeCompare(right.targetId),
    );
  resolvedEdges.sort((left, right) =>
    left.referenceId.localeCompare(right.referenceId),
  );
  const sourceOwnership = resolvedEdges.map((edge) => ({
    sourceId: edge.sourceId,
    edgeId: edge.edgeId,
    referenceId: edge.referenceId,
    targetId: edge.targetId,
    status: edge.status,
  }));
  const incomingGroups = sourceOwnership
    .map((entry) => ({ ...entry }))
    .sort(
      (left, right) =>
        left.targetId.localeCompare(right.targetId) ||
        left.sourceId.localeCompare(right.sourceId) ||
        left.edgeId.localeCompare(right.edgeId),
    );
  const outgoingCounts = new Map<string, number>();
  const incomingCounts = new Map<string, number>();
  const matchedCounts = new Map<string, number>();
  const unresolvedCounts = new Map<string, number>();
  for (const edge of resolvedEdges) {
    outgoingCounts.set(
      edge.sourceId,
      (outgoingCounts.get(edge.sourceId) || 0) + 1,
    );
    incomingCounts.set(
      edge.targetId,
      (incomingCounts.get(edge.targetId) || 0) + 1,
    );
    const counts =
      edge.status === "accepted" ? matchedCounts : unresolvedCounts;
    counts.set(edge.sourceId, (counts.get(edge.sourceId) || 0) + 1);
  }
  const nodeList = [...nodes.values()].sort((left, right) =>
    left.nodeId.localeCompare(right.nodeId),
  );
  const lightMetrics = nodeList.map(
    (node): SynthesisCitationGraphBuildLightMetric => {
      const outgoingCount = outgoingCounts.get(node.nodeId) || 0;
      const incomingCount = incomingCounts.get(node.nodeId) || 0;
      return {
        nodeId: node.nodeId,
        outgoingCount,
        incomingCount,
        localDegree: outgoingCount + incomingCount,
        matchedOutgoingCount: matchedCounts.get(node.nodeId) || 0,
        unresolvedOutgoingCount: unresolvedCounts.get(node.nodeId) || 0,
        ambiguousOutgoingCount: 0,
      };
    },
  );
  const result: SynthesisCitationGraphBuildResult = {
    contractVersion: request.contractVersion,
    scope: request.scope,
    nodes: nodeList,
    resolvedEdges,
    aggregateEdges,
    sourceOwnership,
    incomingGroups,
    lightMetrics,
    diagnostics: {
      nodeCounts: {
        library_paper: nodeList.filter((node) => node.kind === "library_paper")
          .length,
        external_reference: nodeList.filter(
          (node) => node.kind === "external_reference",
        ).length,
        unresolved_reference: nodeList.filter(
          (node) => node.kind === "unresolved_reference",
        ).length,
      },
      referenceCount: resolvedEdges.length,
      aggregateEdgeCount: aggregateEdges.length,
    },
  };
  options.checkpoint?.({
    phase: "complete",
    processed: request.references.length,
    total: request.references.length,
  });
  return result;
}

function sameScope(
  left: SynthesisCitationGraphBuildScope,
  right: SynthesisCitationGraphBuildScope,
) {
  return (
    left.kind === right.kind &&
    left.sourceIds.length === right.sourceIds.length &&
    left.sourceIds.every((entry, index) => entry === right.sourceIds[index])
  );
}

function resultArrayKey(value: unknown) {
  if (!isPlainObject(value)) {
    return "";
  }
  if (typeof value.nodeId === "string") {
    return `node:${value.nodeId}`;
  }
  if (typeof value.edgeId === "string") {
    return `edge:${value.edgeId}`;
  }
  if (
    typeof value.sourceId === "string" &&
    typeof value.targetId === "string"
  ) {
    return `aggregate:${value.sourceId}\0${value.targetId}`;
  }
  if (typeof value.role === "string") {
    return `role:${value.role}`;
  }
  return "";
}

function canonicalizeResultValue(
  value: unknown,
  expected: unknown,
  location: string,
): unknown {
  if (Array.isArray(expected)) {
    const input = jsonArray(value, location);
    if (input.length !== expected.length) {
      return invalid(`${location} has an invalid length`);
    }
    if (
      expected.length > 0 &&
      expected.every(
        (entry) => isPlainObject(entry) && Boolean(resultArrayKey(entry)),
      )
    ) {
      const inputByKey = new Map(
        input.map((entry) => [resultArrayKey(entry), entry] as const),
      );
      if (inputByKey.size !== input.length) {
        return invalid(`${location} contains duplicate rows`);
      }
      return expected.map((entry, index) => {
        const key = resultArrayKey(entry);
        if (!inputByKey.has(key)) {
          return invalid(`${location} is missing ${key}`);
        }
        return canonicalizeResultValue(
          inputByKey.get(key),
          entry,
          `${location}[${index}]`,
        );
      });
    }
    return expected.map((entry, index) =>
      canonicalizeResultValue(input[index], entry, `${location}[${index}]`),
    );
  }
  if (isPlainObject(expected)) {
    const input = jsonObject(value, location);
    return Object.fromEntries(
      Object.entries(expected).map(([key, entry]) => {
        if (!(key in input)) {
          return invalid(`${location}.${key} is missing`);
        }
        return [
          key,
          canonicalizeResultValue(input[key], entry, `${location}.${key}`),
        ];
      }),
    );
  }
  if (value !== expected) {
    return invalid(`${location} is invalid`);
  }
  return expected;
}

export function rebuildSynthesisCitationGraphBuildResult(
  value: unknown,
  requestInput: SynthesisCitationGraphBuildRequest,
): SynthesisCitationGraphBuildResult {
  const request = rebuildSynthesisCitationGraphBuildRequest(requestInput);
  const object = jsonObject(value, "result");
  if (
    object.contractVersion !== SYNTHESIS_CITATION_GRAPH_BUILD_CONTRACT_VERSION
  ) {
    return invalid("result.contractVersion is invalid");
  }
  const scope = rebuildScope(object.scope);
  if (!sameScope(scope, request.scope)) {
    return invalid("result.scope does not match request");
  }
  const result = computeSynthesisCitationGraphBuild(request);
  const canonicalCandidate = canonicalizeResultValue(value, result, "result");
  if (JSON.stringify(canonicalCandidate) !== JSON.stringify(result)) {
    return invalid("result does not match the canonical graph build");
  }
  return result;
}

export function createInProcessSynthesisCitationGraphBuildEngine(
  options: {
    bounds?: SynthesisCitationGraphBuildBounds;
    checkpoint?: SynthesisCitationGraphBuildCheckpoint;
    checkpointInterval?: number;
  } = {},
): SynthesisCitationGraphBuildEngine {
  return {
    async compute(request) {
      return computeSynthesisCitationGraphBuild(request, options);
    },
  };
}
