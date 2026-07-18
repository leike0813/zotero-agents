import {
  SYNTHESIS_TOPIC_GRAPH_INDEX_EDGE_MAX,
  SYNTHESIS_TOPIC_GRAPH_INDEX_NODE_MAX,
  SYNTHESIS_TOPIC_GRAPH_INDEX_STRING_MAX,
  type SynthesisTopicGraphIndexDefinitionStatus,
  type SynthesisTopicGraphIndexEdgeStatus,
  type SynthesisTopicGraphIndexRelation,
  type SynthesisTopicGraphIndexResult,
} from "./topicGraphCore.js";

export const SYNTHESIS_TOPIC_GRAPH_APPLICATION_CONTRACT_VERSION =
  "synthesis-topic-graph-application.v1" as const;
export const SYNTHESIS_TOPIC_GRAPH_APPLICATION_LIMITS = Object.freeze({
  nodes: SYNTHESIS_TOPIC_GRAPH_INDEX_NODE_MAX,
  edges: SYNTHESIS_TOPIC_GRAPH_INDEX_EDGE_MAX,
  reviewItems: SYNTHESIS_TOPIC_GRAPH_INDEX_EDGE_MAX,
  proposals: 1_000,
  topicIds: 1_000,
  aliases: 256,
  jsonItems: 1_024,
  string: SYNTHESIS_TOPIC_GRAPH_INDEX_STRING_MAX,
});

export type SynthesisTopicGraphApplicationNode = {
  topicId: string;
  title: string;
  definition?: string;
  aliases: string[];
  nodeType: "materialized" | "placeholder";
  definitionStatus?: SynthesisTopicGraphIndexDefinitionStatus;
  currentArtifactPath?: string;
  isRoot: boolean;
  level?: "top" | "normal";
  paperCount: number;
  lastSynthesisAt?: string;
  createdAt?: string;
  updatedAt?: string;
};
export type SynthesisTopicGraphApplicationEdge = {
  edgeId: string;
  sourceTopicId: string;
  targetTopicId: string;
  relation: SynthesisTopicGraphIndexRelation;
  status: SynthesisTopicGraphIndexEdgeStatus;
  confidence?: number;
  provenance: unknown[];
  evidenceRefs: unknown[];
  createdAt?: string;
  updatedAt?: string;
};
export type SynthesisTopicGraphApplicationReviewItem = {
  reviewId: string;
  status: "open" | "approved" | "rejected" | "deleted";
  sourceTopicId: string;
  targetTopicId: string;
  targetTitle?: string;
  relation: SynthesisTopicGraphIndexRelation;
  confidence?: number;
  provenance: unknown[];
  evidenceRefs: unknown[];
  createdAt?: string;
  updatedAt?: string;
  resolvedAt?: string;
};
export type SynthesisTopicGraphApplicationSnapshot = {
  nodes: SynthesisTopicGraphApplicationNode[];
  edges: SynthesisTopicGraphApplicationEdge[];
  reviewItems: SynthesisTopicGraphApplicationReviewItem[];
};
export type SynthesisTopicGraphProposalType =
  | "target_is_broader_topic_candidate"
  | "target_is_narrower_topic_candidate"
  | "related_topic_candidate"
  | "overlap_topic_candidate"
  | "contrast_topic_candidate";
export type SynthesisTopicGraphApplicationProposal = {
  type: SynthesisTopicGraphProposalType;
  targetTopicId: string;
  targetTitle?: string;
  confidence?: number;
  provenance: unknown[];
  evidenceRefs: unknown[];
};
export type SynthesisTopicGraphApplicationDiagnostic = {
  code: string;
  severity: "warning" | "error";
};
export type SynthesisTopicGraphApplicationState = {
  manifestHash: string | null;
  revision: number;
  indexHash: string | null;
  indexBasisHash: string | null;
  indexStale: boolean;
  nodeCount: number;
  edgeCount: number;
  reviewItemCount: number;
};
export type SynthesisTopicGraphApplicationLoaded = {
  state: SynthesisTopicGraphApplicationState;
  snapshot: SynthesisTopicGraphApplicationSnapshot;
};
export type SynthesisTopicGraphApplicationMutationResult = {
  status:
    | "committed"
    | "unchanged"
    | "not_found"
    | "basis_mismatch"
    | "topic_graph_busy"
    | "invalid_request"
    | "worker_failed"
    | "stopping";
  manifestHash: string | null;
  revision: number;
  changedNodeIds: string[];
  changedEdgeIds: string[];
  reviewIds: string[];
  diagnostics: SynthesisTopicGraphApplicationDiagnostic[];
};

export class SynthesisTopicGraphApplicationContractError extends Error {
  readonly code = "invalid_request";
  constructor(location: string) {
    super(`Invalid Topic Graph application value at ${location}`);
    this.name = "SynthesisTopicGraphApplicationContractError";
  }
}

const HASH = /^sha256:[a-f0-9]{64}$/;
function invalid(location: string): never {
  throw new SynthesisTopicGraphApplicationContractError(location);
}
function object(value: unknown, location: string) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return invalid(location);
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) invalid(location);
  return value as Record<string, unknown>;
}
function exact(
  value: Record<string, unknown>,
  fields: readonly string[],
  location: string,
) {
  const allowed = new Set(fields);
  for (const key of Object.keys(value))
    if (!allowed.has(key)) invalid(location);
}
function string(value: unknown, location: string, optional = false) {
  if (value === undefined || value === null) {
    if (optional) return undefined;
    return invalid(location);
  }
  if (typeof value !== "string") return invalid(location);
  const result = value.trim();
  if (
    (!optional && !result) ||
    result.length > SYNTHESIS_TOPIC_GRAPH_APPLICATION_LIMITS.string
  ) {
    return invalid(location);
  }
  return result || undefined;
}
function strings(value: unknown, location: string, max: number) {
  if (!Array.isArray(value) || value.length > max) return invalid(location);
  const result = value.map((entry, index) =>
    string(entry, `${location}[${index}]`),
  ) as string[];
  if (new Set(result).size !== result.length) invalid(location);
  return result;
}
function count(value: unknown, location: string) {
  if (!Number.isSafeInteger(value) || Number(value) < 0) invalid(location);
  return Number(value);
}
function boolean(value: unknown, location: string) {
  if (typeof value !== "boolean") return invalid(location);
  return value as boolean;
}
function hashOrNull(value: unknown, location: string): string | null {
  if (value === null) return null;
  const result = string(value, location);
  if (!result || !HASH.test(result)) return invalid(location);
  return result;
}
function enumValue<const T extends readonly string[]>(
  value: unknown,
  values: T,
  location: string,
): T[number] {
  const result = string(value, location);
  if (!values.includes(result as T[number])) invalid(location);
  return result as T[number];
}
function confidence(value: unknown, location: string): number | undefined {
  if (value === undefined || value === null) return undefined;
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value < 0 ||
    value > 1
  ) {
    return invalid(location);
  }
  return Number(value);
}
function jsonSafe(value: unknown, location: string, depth = 0): unknown {
  if (depth > 16) return invalid(location);
  if (value === null || typeof value === "boolean") return value;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return invalid(location);
    return value;
  }
  if (typeof value === "string") {
    if (value.length > SYNTHESIS_TOPIC_GRAPH_APPLICATION_LIMITS.string) {
      return invalid(location);
    }
    return value;
  }
  if (Array.isArray(value)) {
    if (value.length > SYNTHESIS_TOPIC_GRAPH_APPLICATION_LIMITS.jsonItems) {
      return invalid(location);
    }
    return value.map((entry, index) =>
      jsonSafe(entry, `${location}[${index}]`, depth + 1),
    );
  }
  const row = object(value, location);
  if (
    Object.keys(row).length > SYNTHESIS_TOPIC_GRAPH_APPLICATION_LIMITS.jsonItems
  ) {
    return invalid(location);
  }
  return Object.fromEntries(
    Object.entries(row)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => [
        key,
        jsonSafe(entry, `${location}.${key}`, depth + 1),
      ]),
  );
}
function jsonArray(value: unknown, location: string) {
  if (
    !Array.isArray(value) ||
    value.length > SYNTHESIS_TOPIC_GRAPH_APPLICATION_LIMITS.jsonItems
  ) {
    return invalid(location);
  }
  return value.map((entry, index) => jsonSafe(entry, `${location}[${index}]`));
}
function relation(value: unknown, location: string) {
  return enumValue(
    value,
    ["broader_than", "related_to", "overlaps_with", "contrasts_with"] as const,
    location,
  );
}
function optionalString(
  row: Record<string, unknown>,
  key: string,
  location: string,
) {
  return string(row[key], `${location}.${key}`, true);
}

function node(
  value: unknown,
  index: number,
): SynthesisTopicGraphApplicationNode {
  const location = `topicGraphSnapshot.nodes[${index}]`;
  const row = object(value, location);
  exact(
    row,
    [
      "topicId",
      "title",
      "definition",
      "aliases",
      "nodeType",
      "definitionStatus",
      "currentArtifactPath",
      "isRoot",
      "level",
      "paperCount",
      "lastSynthesisAt",
      "createdAt",
      "updatedAt",
    ],
    location,
  );
  const definition = optionalString(row, "definition", location);
  const currentArtifactPath = optionalString(
    row,
    "currentArtifactPath",
    location,
  );
  const lastSynthesisAt = optionalString(row, "lastSynthesisAt", location);
  const createdAt = optionalString(row, "createdAt", location);
  const updatedAt = optionalString(row, "updatedAt", location);
  return {
    topicId: string(row.topicId, `${location}.topicId`)! as string,
    title: string(row.title, `${location}.title`)! as string,
    ...(definition ? { definition } : {}),
    aliases: strings(
      row.aliases,
      `${location}.aliases`,
      SYNTHESIS_TOPIC_GRAPH_APPLICATION_LIMITS.aliases,
    ),
    nodeType: enumValue(
      row.nodeType,
      ["materialized", "placeholder"] as const,
      `${location}.nodeType`,
    ),
    ...(row.definitionStatus === undefined
      ? {}
      : {
          definitionStatus: enumValue(
            row.definitionStatus,
            ["has_synthesis", "placeholder", "deleted", "stale"] as const,
            `${location}.definitionStatus`,
          ),
        }),
    ...(currentArtifactPath ? { currentArtifactPath } : {}),
    isRoot: boolean(row.isRoot, `${location}.isRoot`),
    ...(row.level === undefined
      ? {}
      : {
          level: enumValue(
            row.level,
            ["top", "normal"] as const,
            `${location}.level`,
          ),
        }),
    paperCount: count(row.paperCount, `${location}.paperCount`),
    ...(lastSynthesisAt ? { lastSynthesisAt } : {}),
    ...(createdAt ? { createdAt } : {}),
    ...(updatedAt ? { updatedAt } : {}),
  };
}

function edge(
  value: unknown,
  index: number,
): SynthesisTopicGraphApplicationEdge {
  const location = `topicGraphSnapshot.edges[${index}]`;
  const row = object(value, location);
  exact(
    row,
    [
      "edgeId",
      "sourceTopicId",
      "targetTopicId",
      "relation",
      "status",
      "confidence",
      "provenance",
      "evidenceRefs",
      "createdAt",
      "updatedAt",
    ],
    location,
  );
  const confidenceValue = confidence(row.confidence, `${location}.confidence`);
  const createdAt = optionalString(row, "createdAt", location);
  const updatedAt = optionalString(row, "updatedAt", location);
  return {
    edgeId: string(row.edgeId, `${location}.edgeId`)! as string,
    sourceTopicId: string(
      row.sourceTopicId,
      `${location}.sourceTopicId`,
    )! as string,
    targetTopicId: string(
      row.targetTopicId,
      `${location}.targetTopicId`,
    )! as string,
    relation: relation(row.relation, `${location}.relation`),
    status: enumValue(
      row.status,
      ["suggested", "confirmed", "rejected", "stale", "deleted"] as const,
      `${location}.status`,
    ),
    ...(confidenceValue === undefined ? {} : { confidence: confidenceValue }),
    provenance: jsonArray(row.provenance, `${location}.provenance`),
    evidenceRefs: jsonArray(row.evidenceRefs, `${location}.evidenceRefs`),
    ...(createdAt ? { createdAt } : {}),
    ...(updatedAt ? { updatedAt } : {}),
  };
}

function reviewItem(
  value: unknown,
  index: number,
): SynthesisTopicGraphApplicationReviewItem {
  const location = `topicGraphSnapshot.reviewItems[${index}]`;
  const row = object(value, location);
  exact(
    row,
    [
      "reviewId",
      "status",
      "sourceTopicId",
      "targetTopicId",
      "targetTitle",
      "relation",
      "confidence",
      "provenance",
      "evidenceRefs",
      "createdAt",
      "updatedAt",
      "resolvedAt",
    ],
    location,
  );
  const targetTitle = optionalString(row, "targetTitle", location);
  const confidenceValue = confidence(row.confidence, `${location}.confidence`);
  const createdAt = optionalString(row, "createdAt", location);
  const updatedAt = optionalString(row, "updatedAt", location);
  const resolvedAt = optionalString(row, "resolvedAt", location);
  return {
    reviewId: string(row.reviewId, `${location}.reviewId`)! as string,
    status: enumValue(
      row.status,
      ["open", "approved", "rejected", "deleted"] as const,
      `${location}.status`,
    ),
    sourceTopicId: string(
      row.sourceTopicId,
      `${location}.sourceTopicId`,
    )! as string,
    targetTopicId: string(
      row.targetTopicId,
      `${location}.targetTopicId`,
    )! as string,
    ...(targetTitle ? { targetTitle } : {}),
    relation: relation(row.relation, `${location}.relation`),
    ...(confidenceValue === undefined ? {} : { confidence: confidenceValue }),
    provenance: jsonArray(row.provenance, `${location}.provenance`),
    evidenceRefs: jsonArray(row.evidenceRefs, `${location}.evidenceRefs`),
    ...(createdAt ? { createdAt } : {}),
    ...(updatedAt ? { updatedAt } : {}),
    ...(resolvedAt ? { resolvedAt } : {}),
  };
}

function unique<T>(rows: T[], id: (row: T) => string, location: string) {
  const ids = rows.map(id);
  if (new Set(ids).size !== ids.length) invalid(`${location}.unique`);
}
export function rebuildSynthesisTopicGraphApplicationSnapshot(
  value: unknown,
): SynthesisTopicGraphApplicationSnapshot {
  const row = object(value, "topicGraphSnapshot");
  exact(row, ["nodes", "edges", "reviewItems"], "topicGraphSnapshot");
  const bounded = <T>(
    input: unknown,
    max: number,
    location: string,
    rebuild: (entry: unknown, index: number) => T,
  ) => {
    if (!Array.isArray(input) || input.length > max) return invalid(location);
    return input.map(rebuild);
  };
  const snapshot = {
    nodes: bounded(
      row.nodes,
      SYNTHESIS_TOPIC_GRAPH_APPLICATION_LIMITS.nodes,
      "topicGraphSnapshot.nodes",
      node,
    ),
    edges: bounded(
      row.edges,
      SYNTHESIS_TOPIC_GRAPH_APPLICATION_LIMITS.edges,
      "topicGraphSnapshot.edges",
      edge,
    ),
    reviewItems: bounded(
      row.reviewItems,
      SYNTHESIS_TOPIC_GRAPH_APPLICATION_LIMITS.reviewItems,
      "topicGraphSnapshot.reviewItems",
      reviewItem,
    ),
  };
  unique(snapshot.nodes, (entry) => entry.topicId, "topicGraphSnapshot.nodes");
  unique(snapshot.edges, (entry) => entry.edgeId, "topicGraphSnapshot.edges");
  unique(
    snapshot.reviewItems,
    (entry) => entry.reviewId,
    "topicGraphSnapshot.reviewItems",
  );
  const topics = new Set(snapshot.nodes.map((entry) => entry.topicId));
  for (const entry of snapshot.edges) {
    if (
      !topics.has(entry.sourceTopicId) ||
      !topics.has(entry.targetTopicId) ||
      entry.sourceTopicId === entry.targetTopicId
    ) {
      invalid(`topicGraphSnapshot.edges.${entry.edgeId}.topicId`);
    }
  }
  for (const entry of snapshot.reviewItems) {
    if (
      !topics.has(entry.sourceTopicId) ||
      !topics.has(entry.targetTopicId) ||
      entry.sourceTopicId === entry.targetTopicId
    ) {
      invalid(`topicGraphSnapshot.reviewItems.${entry.reviewId}.topicId`);
    }
  }
  return {
    nodes: snapshot.nodes.sort((a, b) => a.topicId.localeCompare(b.topicId)),
    edges: snapshot.edges.sort((a, b) => a.edgeId.localeCompare(b.edgeId)),
    reviewItems: snapshot.reviewItems.sort((a, b) =>
      a.reviewId.localeCompare(b.reviewId),
    ),
  };
}

function proposal(
  value: unknown,
  index: number,
): SynthesisTopicGraphApplicationProposal {
  const location = `topicGraphIngest.proposals[${index}]`;
  const row = object(value, location);
  exact(
    row,
    [
      "type",
      "targetTopicId",
      "targetTitle",
      "confidence",
      "provenance",
      "evidenceRefs",
    ],
    location,
  );
  const targetTitle = string(row.targetTitle, `${location}.targetTitle`, true);
  const confidenceValue = confidence(row.confidence, `${location}.confidence`);
  return {
    type: enumValue(
      row.type,
      [
        "target_is_broader_topic_candidate",
        "target_is_narrower_topic_candidate",
        "related_topic_candidate",
        "overlap_topic_candidate",
        "contrast_topic_candidate",
      ] as const,
      `${location}.type`,
    ),
    targetTopicId: string(
      row.targetTopicId,
      `${location}.targetTopicId`,
    )! as string,
    ...(targetTitle ? { targetTitle } : {}),
    ...(confidenceValue === undefined ? {} : { confidence: confidenceValue }),
    provenance: jsonArray(row.provenance, `${location}.provenance`),
    evidenceRefs: jsonArray(row.evidenceRefs, `${location}.evidenceRefs`),
  };
}

export function rebuildSynthesisTopicGraphApplicationReplaceRequest(
  value: unknown,
) {
  const row = object(value, "topicGraphReplace");
  exact(row, ["expectedManifestHash", "snapshot"], "topicGraphReplace");
  return {
    expectedManifestHash: hashOrNull(
      row.expectedManifestHash,
      "topicGraphReplace.expectedManifestHash",
    ),
    snapshot: rebuildSynthesisTopicGraphApplicationSnapshot(row.snapshot),
  };
}
export function rebuildSynthesisTopicGraphApplicationUpsertRequest(
  value: unknown,
) {
  const row = object(value, "topicGraphUpsert");
  exact(row, ["expectedManifestHash", "nodes", "edges"], "topicGraphUpsert");
  if (
    !Array.isArray(row.nodes) ||
    row.nodes.length > SYNTHESIS_TOPIC_GRAPH_APPLICATION_LIMITS.nodes
  ) {
    return invalid("topicGraphUpsert.nodes");
  }
  if (
    !Array.isArray(row.edges) ||
    row.edges.length > SYNTHESIS_TOPIC_GRAPH_APPLICATION_LIMITS.edges
  ) {
    return invalid("topicGraphUpsert.edges");
  }
  return {
    expectedManifestHash: hashOrNull(
      row.expectedManifestHash,
      "topicGraphUpsert.expectedManifestHash",
    ),
    nodes: row.nodes.map(node),
    edges: row.edges.map(edge),
  };
}
export function rebuildSynthesisTopicGraphApplicationMaterializedTopicRequest(
  value: unknown,
) {
  const row = object(value, "topicGraphMaterializedTopic");
  exact(
    row,
    [
      "expectedManifestHash",
      "topicId",
      "title",
      "definition",
      "aliases",
      "currentArtifactPath",
      "paperCount",
      "lastSynthesisAt",
      "isRoot",
      "level",
    ],
    "topicGraphMaterializedTopic",
  );
  const definition = string(
    row.definition,
    "topicGraphMaterializedTopic.definition",
    true,
  );
  const currentArtifactPath = string(
    row.currentArtifactPath,
    "topicGraphMaterializedTopic.currentArtifactPath",
    true,
  );
  const lastSynthesisAt = string(
    row.lastSynthesisAt,
    "topicGraphMaterializedTopic.lastSynthesisAt",
    true,
  );
  return {
    expectedManifestHash: hashOrNull(
      row.expectedManifestHash,
      "topicGraphMaterializedTopic.expectedManifestHash",
    ),
    topicId: string(
      row.topicId,
      "topicGraphMaterializedTopic.topicId",
    )! as string,
    title: string(row.title, "topicGraphMaterializedTopic.title")! as string,
    ...(definition ? { definition } : {}),
    aliases: strings(
      row.aliases,
      "topicGraphMaterializedTopic.aliases",
      SYNTHESIS_TOPIC_GRAPH_APPLICATION_LIMITS.aliases,
    ),
    ...(currentArtifactPath ? { currentArtifactPath } : {}),
    paperCount: count(row.paperCount, "topicGraphMaterializedTopic.paperCount"),
    ...(lastSynthesisAt ? { lastSynthesisAt } : {}),
    isRoot: boolean(row.isRoot, "topicGraphMaterializedTopic.isRoot"),
    level: enumValue(
      row.level,
      ["top", "normal"] as const,
      "topicGraphMaterializedTopic.level",
    ),
  };
}
export function rebuildSynthesisTopicGraphApplicationIngestRequest(
  value: unknown,
) {
  const row = object(value, "topicGraphIngest");
  exact(
    row,
    ["expectedManifestHash", "sourceTopicId", "proposals"],
    "topicGraphIngest",
  );
  if (
    !Array.isArray(row.proposals) ||
    row.proposals.length > SYNTHESIS_TOPIC_GRAPH_APPLICATION_LIMITS.proposals
  ) {
    return invalid("topicGraphIngest.proposals");
  }
  return {
    expectedManifestHash: hashOrNull(
      row.expectedManifestHash,
      "topicGraphIngest.expectedManifestHash",
    ),
    sourceTopicId: string(
      row.sourceTopicId,
      "topicGraphIngest.sourceTopicId",
    )! as string,
    proposals: row.proposals.map(proposal),
  };
}
export function rebuildSynthesisTopicGraphApplicationRelationDecisionRequest(
  value: unknown,
) {
  const row = object(value, "topicGraphRelationDecision");
  exact(
    row,
    ["expectedManifestHash", "edgeId", "status"],
    "topicGraphRelationDecision",
  );
  return {
    expectedManifestHash: hashOrNull(
      row.expectedManifestHash,
      "topicGraphRelationDecision.expectedManifestHash",
    ),
    edgeId: string(row.edgeId, "topicGraphRelationDecision.edgeId")! as string,
    status: enumValue(
      row.status,
      ["confirmed", "rejected"] as const,
      "topicGraphRelationDecision.status",
    ),
  };
}
export function rebuildSynthesisTopicGraphApplicationReviewRequest(
  value: unknown,
) {
  const row = object(value, "topicGraphReview");
  exact(
    row,
    ["expectedManifestHash", "reviewId", "action"],
    "topicGraphReview",
  );
  return {
    expectedManifestHash: hashOrNull(
      row.expectedManifestHash,
      "topicGraphReview.expectedManifestHash",
    ),
    reviewId: string(row.reviewId, "topicGraphReview.reviewId")! as string,
    action: enumValue(
      row.action,
      ["approve_suggested", "reject"] as const,
      "topicGraphReview.action",
    ),
  };
}
export function rebuildSynthesisTopicGraphApplicationMarkDeletedRequest(
  value: unknown,
) {
  const row = object(value, "topicGraphMarkDeleted");
  exact(row, ["expectedManifestHash", "topicId"], "topicGraphMarkDeleted");
  return {
    expectedManifestHash: hashOrNull(
      row.expectedManifestHash,
      "topicGraphMarkDeleted.expectedManifestHash",
    ),
    topicId: string(row.topicId, "topicGraphMarkDeleted.topicId")! as string,
  };
}
export function rebuildSynthesisTopicGraphApplicationPurgeRequest(
  value: unknown,
) {
  const row = object(value, "topicGraphPurge");
  exact(row, ["expectedManifestHash", "topicIds"], "topicGraphPurge");
  return {
    expectedManifestHash: hashOrNull(
      row.expectedManifestHash,
      "topicGraphPurge.expectedManifestHash",
    ),
    topicIds: strings(
      row.topicIds,
      "topicGraphPurge.topicIds",
      SYNTHESIS_TOPIC_GRAPH_APPLICATION_LIMITS.topicIds,
    ),
  };
}
export function rebuildSynthesisTopicGraphApplicationRebuildIndexRequest(
  value: unknown,
) {
  const row = object(value, "topicGraphRebuildIndex");
  exact(row, ["expectedManifestHash"], "topicGraphRebuildIndex");
  const expectedManifestHash = hashOrNull(
    row.expectedManifestHash,
    "topicGraphRebuildIndex.expectedManifestHash",
  );
  if (!expectedManifestHash)
    return invalid("topicGraphRebuildIndex.expectedManifestHash");
  return { expectedManifestHash };
}
export function rebuildSynthesisTopicGraphApplicationState(
  value: unknown,
): SynthesisTopicGraphApplicationState {
  const row = object(value, "topicGraphState");
  exact(
    row,
    [
      "manifestHash",
      "revision",
      "indexHash",
      "indexBasisHash",
      "indexStale",
      "nodeCount",
      "edgeCount",
      "reviewItemCount",
    ],
    "topicGraphState",
  );
  return {
    manifestHash: hashOrNull(row.manifestHash, "topicGraphState.manifestHash"),
    revision: count(row.revision, "topicGraphState.revision"),
    indexHash: hashOrNull(row.indexHash, "topicGraphState.indexHash"),
    indexBasisHash: hashOrNull(
      row.indexBasisHash,
      "topicGraphState.indexBasisHash",
    ),
    indexStale: boolean(row.indexStale, "topicGraphState.indexStale"),
    nodeCount: count(row.nodeCount, "topicGraphState.nodeCount"),
    edgeCount: count(row.edgeCount, "topicGraphState.edgeCount"),
    reviewItemCount: count(
      row.reviewItemCount,
      "topicGraphState.reviewItemCount",
    ),
  };
}
export function rebuildSynthesisTopicGraphApplicationMutationResult(
  value: unknown,
): SynthesisTopicGraphApplicationMutationResult {
  const row = object(value, "topicGraphMutationResult");
  exact(
    row,
    [
      "status",
      "manifestHash",
      "revision",
      "changedNodeIds",
      "changedEdgeIds",
      "reviewIds",
      "diagnostics",
    ],
    "topicGraphMutationResult",
  );
  if (!Array.isArray(row.diagnostics)) {
    return invalid("topicGraphMutationResult.diagnostics");
  }
  return {
    status: enumValue(
      row.status,
      [
        "committed",
        "unchanged",
        "not_found",
        "basis_mismatch",
        "topic_graph_busy",
        "invalid_request",
        "worker_failed",
        "stopping",
      ] as const,
      "topicGraphMutationResult.status",
    ),
    manifestHash: hashOrNull(
      row.manifestHash,
      "topicGraphMutationResult.manifestHash",
    ),
    revision: count(row.revision, "topicGraphMutationResult.revision"),
    changedNodeIds: strings(
      row.changedNodeIds,
      "topicGraphMutationResult.changedNodeIds",
      SYNTHESIS_TOPIC_GRAPH_APPLICATION_LIMITS.nodes,
    ),
    changedEdgeIds: strings(
      row.changedEdgeIds,
      "topicGraphMutationResult.changedEdgeIds",
      SYNTHESIS_TOPIC_GRAPH_APPLICATION_LIMITS.edges,
    ),
    reviewIds: strings(
      row.reviewIds,
      "topicGraphMutationResult.reviewIds",
      SYNTHESIS_TOPIC_GRAPH_APPLICATION_LIMITS.reviewItems,
    ),
    diagnostics: row.diagnostics.map((entry, index) => {
      const location = `topicGraphMutationResult.diagnostics[${index}]`;
      const item = object(entry, location);
      exact(item, ["code", "severity"], location);
      return {
        code: string(item.code, `${location}.code`)! as string,
        severity: enumValue(
          item.severity,
          ["warning", "error"] as const,
          `${location}.severity`,
        ),
      };
    }),
  };
}
export type SynthesisTopicGraphApplicationIndex =
  SynthesisTopicGraphIndexResult;
