import { getBaseName, joinPath } from "../../utils/path";
import {
  ensureRuntimeDirectory,
  listRuntimeChildren,
  readRuntimeTextFile,
  runtimePathExists,
  writeRuntimeTextFile,
} from "../runtimePersistence";
import {
  buildSynthesisKnowledgeGraphPaths,
  canonicalAssetFileName,
  hashCanonicalJson,
  initializeSynthesisKnowledgeGraphStore,
  readCanonicalJsonAsset,
  readProjectionRegistryState,
  recordProjectionRebuild,
  SynthesisSchemaRegistry,
  writeCanonicalDiagnostic,
  writeCanonicalTransaction,
  type CanonicalTransactionReceipt,
  type ProjectionState,
} from "./foundation";

export const SYNTHESIS_TOPIC_GRAPH_INDEX_TARGET = "topic-graph-index";
export const SYNTHESIS_TOPIC_GRAPH_NODE_SCHEMA_ID =
  "synthesis.topic_graph_node";
export const SYNTHESIS_TOPIC_GRAPH_EDGE_SCHEMA_ID =
  "synthesis.topic_graph_edge";
export const SYNTHESIS_TOPIC_GRAPH_REVIEW_ITEM_SCHEMA_ID =
  "synthesis.topic_graph_review_item";
export const SYNTHESIS_TOPIC_GRAPH_MANIFEST_SCHEMA_ID =
  "synthesis.topic_graph_manifest";
export const SYNTHESIS_TOPIC_GRAPH_INDEX_SCHEMA_VERSION = "1.0.0";

export type SynthesisTopicGraphRelation =
  | "broader_than"
  | "related_to"
  | "overlaps_with"
  | "contrasts_with";

export type SynthesisTopicGraphEdgeStatus =
  | "suggested"
  | "confirmed"
  | "rejected"
  | "stale";

export type SynthesisTopicGraphNode = {
  topic_id: string;
  title: string;
  aliases: string[];
  node_type: "materialized" | "placeholder";
  definition_status?: "has_synthesis" | "placeholder" | "deleted" | "stale";
  current_artifact_path?: string;
  is_root?: boolean;
  level?: "top" | "normal";
  paper_count?: number;
  last_synthesis_at?: string;
  created_at: string;
  updated_at: string;
};

export type SynthesisTopicGraphEdge = {
  edge_id: string;
  source_topic_id: string;
  target_topic_id: string;
  relation: SynthesisTopicGraphRelation;
  status: SynthesisTopicGraphEdgeStatus;
  confidence?: number;
  provenance: unknown[];
  evidence_refs: unknown[];
  created_at: string;
  updated_at: string;
};

export type SynthesisTopicGraphReviewItem = {
  review_id: string;
  status: "open" | "approved" | "rejected";
  source_topic_id: string;
  target_topic_id: string;
  target_title?: string;
  relation: SynthesisTopicGraphRelation;
  confidence?: number;
  provenance: unknown[];
  evidence_refs: unknown[];
  created_at: string;
  updated_at: string;
  resolved_at?: string;
};

export type SynthesisTopicGraphManifest = {
  manifest_hash: string;
  node_count: number;
  edge_count: number;
  review_count?: number;
  updated_at: string;
  projection_target: typeof SYNTHESIS_TOPIC_GRAPH_INDEX_TARGET;
};

export type SynthesisTopicGraphDiagnostic = {
  code: string;
  message: string;
  edge_id?: string;
  source_topic_id?: string;
  target_topic_id?: string;
  relation?: SynthesisTopicGraphRelation;
};

export type SynthesisTopicGraphSnapshot = {
  nodes: SynthesisTopicGraphNode[];
  edges: SynthesisTopicGraphEdge[];
  review_items: SynthesisTopicGraphReviewItem[];
  manifest: SynthesisTopicGraphManifest;
  projection?: ProjectionState;
  diagnostics: SynthesisTopicGraphDiagnostic[];
};

export type SynthesisTopicGraphIndexProjection = {
  schema_id: "synthesis.topic_graph_index_projection";
  schema_version: string;
  source_manifest_hash: string;
  rebuilt_at: string;
  nodes: SynthesisTopicGraphNode[];
  edges: SynthesisTopicGraphEdge[];
  review_items: SynthesisTopicGraphReviewItem[];
  roots: string[];
  unplaced: string[];
  diagnostics: SynthesisTopicGraphDiagnostic[];
};

export type SynthesisTopicRelationProposalType =
  | "broader_topic_candidate"
  | "related_topic_candidate"
  | "overlap_topic_candidate"
  | "contrast_topic_candidate";

export type SynthesisTopicRelationProposal = {
  type: SynthesisTopicRelationProposalType;
  target_topic_id?: string;
  target_title?: string;
  confidence?: number;
  evidence_refs?: unknown[];
  provenance?: unknown[];
};

export type SynthesisTopicRelationProposalPayload = {
  schema_id?: "synthesis.topic_graph_relation_proposals";
  source_topic_id?: string;
  proposals?: unknown[];
};

export type SynthesisTopicRelationProposalIngestResult = {
  accepted_edges: SynthesisTopicGraphEdge[];
  placeholder_nodes: SynthesisTopicGraphNode[];
  review_items: SynthesisTopicGraphReviewItem[];
  diagnostics: SynthesisTopicGraphDiagnostic[];
  receipt?: CanonicalTransactionReceipt;
};

export type SynthesisTopicGraphRelationDecisionResult = {
  edge?: SynthesisTopicGraphEdge;
  diagnostic?: SynthesisTopicGraphDiagnostic;
  receipt?: CanonicalTransactionReceipt;
};

export type SynthesisTopicGraphReviewDecisionResult = {
  review_item?: SynthesisTopicGraphReviewItem;
  edge?: SynthesisTopicGraphEdge;
  diagnostic?: SynthesisTopicGraphDiagnostic;
  receipt?: CanonicalTransactionReceipt;
};

type ServiceOptions = {
  root: string;
  now?: () => string;
};

const DIRECTIONAL_RELATIONS = new Set<SynthesisTopicGraphRelation>([
  "broader_than",
]);

function cleanString(value: unknown) {
  return String(value || "").trim();
}

function nowIso() {
  return new Date().toISOString();
}

function normalizeStringList(values: unknown) {
  return Array.from(
    new Set(
      Array.isArray(values)
        ? values.map((entry) => cleanString(entry)).filter(Boolean)
        : [],
    ),
  ).sort((left, right) =>
    left.localeCompare(right, "en", { sensitivity: "base" }),
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

export function safeTopicGraphId(value: unknown) {
  return (
    cleanString(value)
      .replace(/\\/g, "/")
      .replace(/[^A-Za-z0-9_.-]+/g, "_")
      .replace(/^_+|_+$/g, "") || "topic"
  );
}

function topicFileName(topicId: string) {
  return canonicalAssetFileName("topic", topicId);
}

function edgeFileName(edgeId: string) {
  return canonicalAssetFileName("edge", edgeId);
}

function reviewFileName(reviewId: string) {
  return canonicalAssetFileName("review", reviewId);
}

function relativeTopicPath(topicId: string) {
  return `topic-graph/topics/${topicFileName(topicId)}`;
}

function relativeEdgePath(edgeId: string) {
  return `topic-graph/edges/${edgeFileName(edgeId)}`;
}

function relativeReviewPath(reviewId: string) {
  return `topic-graph/review/${reviewFileName(reviewId)}`;
}

function clampConfidence(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.min(1, number)) : undefined;
}

export function canonicalizeTopicGraphEdgeTuple(args: {
  sourceTopicId: string;
  targetTopicId: string;
  relation: SynthesisTopicGraphRelation;
}) {
  let source = cleanString(args.sourceTopicId);
  let target = cleanString(args.targetTopicId);
  if (
    !DIRECTIONAL_RELATIONS.has(args.relation) &&
    target.localeCompare(source) < 0
  ) {
    [source, target] = [target, source];
  }
  return {
    sourceTopicId: source,
    targetTopicId: target,
    relation: args.relation,
  };
}

export function deterministicTopicGraphEdgeId(args: {
  sourceTopicId: string;
  targetTopicId: string;
  relation: SynthesisTopicGraphRelation;
}) {
  const tuple = canonicalizeTopicGraphEdgeTuple(args);
  return `edge:${tuple.relation}:${safeTopicGraphId(tuple.sourceTopicId)}:${safeTopicGraphId(tuple.targetTopicId)}`;
}

function normalizeTopicNode(
  input: Partial<SynthesisTopicGraphNode> & { topic_id?: string },
  timestamp: string,
  previous?: SynthesisTopicGraphNode,
): SynthesisTopicGraphNode | null {
  const topicId = cleanString(input.topic_id);
  if (!topicId) {
    return null;
  }
  const nodeType =
    input.node_type === "materialized" || input.node_type === "placeholder"
      ? input.node_type
      : previous?.node_type || "placeholder";
  const status =
    input.definition_status ||
    previous?.definition_status ||
    (nodeType === "materialized" ? "has_synthesis" : "placeholder");
  const paperCount = Number(input.paper_count ?? previous?.paper_count ?? 0);
  return {
    topic_id: topicId,
    title: cleanString(input.title || previous?.title) || topicId,
    aliases: normalizeStringList(input.aliases || previous?.aliases),
    node_type: nodeType,
    definition_status:
      status === "deleted" || status === "stale" || status === "has_synthesis"
        ? status
        : "placeholder",
    current_artifact_path:
      cleanString(
        input.current_artifact_path || previous?.current_artifact_path,
      ) || undefined,
    is_root: Boolean(input.is_root ?? previous?.is_root),
    level:
      input.level === "top" || previous?.level === "top" ? "top" : "normal",
    paper_count: Number.isFinite(paperCount)
      ? Math.max(0, Math.floor(paperCount))
      : 0,
    last_synthesis_at:
      cleanString(input.last_synthesis_at || previous?.last_synthesis_at) ||
      undefined,
    created_at:
      previous?.created_at || cleanString(input.created_at) || timestamp,
    updated_at: timestamp,
  };
}

function normalizeRelation(value: unknown): SynthesisTopicGraphRelation | null {
  const relation = cleanString(value);
  if (
    relation === "broader_than" ||
    relation === "related_to" ||
    relation === "overlaps_with" ||
    relation === "contrasts_with"
  ) {
    return relation;
  }
  return null;
}

function normalizeEdgeStatus(value: unknown): SynthesisTopicGraphEdgeStatus {
  const status = cleanString(value);
  if (status === "confirmed" || status === "rejected" || status === "stale") {
    return status;
  }
  return "suggested";
}

function normalizeTopicEdge(
  input: Partial<SynthesisTopicGraphEdge>,
  timestamp: string,
  previous?: SynthesisTopicGraphEdge,
): SynthesisTopicGraphEdge | null {
  const relation = normalizeRelation(input.relation || previous?.relation);
  if (!relation) {
    return null;
  }
  const tuple = canonicalizeTopicGraphEdgeTuple({
    sourceTopicId: cleanString(
      input.source_topic_id || previous?.source_topic_id,
    ),
    targetTopicId: cleanString(
      input.target_topic_id || previous?.target_topic_id,
    ),
    relation,
  });
  if (!tuple.sourceTopicId || !tuple.targetTopicId) {
    return null;
  }
  const confidence = clampConfidence(input.confidence ?? previous?.confidence);
  return {
    edge_id: deterministicTopicGraphEdgeId({
      sourceTopicId: tuple.sourceTopicId,
      targetTopicId: tuple.targetTopicId,
      relation,
    }),
    source_topic_id: tuple.sourceTopicId,
    target_topic_id: tuple.targetTopicId,
    relation,
    status: normalizeEdgeStatus(input.status || previous?.status),
    ...(confidence === undefined ? {} : { confidence }),
    provenance: Array.isArray(input.provenance)
      ? input.provenance
      : previous?.provenance || [],
    evidence_refs: Array.isArray(input.evidence_refs)
      ? input.evidence_refs
      : previous?.evidence_refs || [],
    created_at:
      previous?.created_at || cleanString(input.created_at) || timestamp,
    updated_at: timestamp,
  };
}

function sortNodes(nodes: SynthesisTopicGraphNode[]) {
  return [...nodes].sort(
    (left, right) =>
      left.title.localeCompare(right.title) ||
      left.topic_id.localeCompare(right.topic_id),
  );
}

function sortEdges(edges: SynthesisTopicGraphEdge[]) {
  return [...edges].sort((left, right) =>
    left.edge_id.localeCompare(right.edge_id),
  );
}

function sortReviewItems(items: SynthesisTopicGraphReviewItem[]) {
  return [...items].sort(
    (left, right) =>
      left.status.localeCompare(right.status) ||
      left.review_id.localeCompare(right.review_id),
  );
}

function buildManifest(args: {
  nodes: SynthesisTopicGraphNode[];
  edges: SynthesisTopicGraphEdge[];
  reviewItems?: SynthesisTopicGraphReviewItem[];
  updatedAt: string;
}): SynthesisTopicGraphManifest {
  const reviewItems = sortReviewItems(args.reviewItems || []);
  return {
    manifest_hash: hashCanonicalJson({
      nodes: sortNodes(args.nodes),
      edges: sortEdges(args.edges),
      review_items: reviewItems,
    }),
    node_count: args.nodes.length,
    edge_count: args.edges.length,
    review_count: reviewItems.length,
    updated_at: args.updatedAt,
    projection_target: SYNTHESIS_TOPIC_GRAPH_INDEX_TARGET,
  };
}

function createRegistry() {
  const registry = new SynthesisSchemaRegistry();
  registry.registerDataSchema(SYNTHESIS_TOPIC_GRAPH_NODE_SCHEMA_ID, {
    type: "object",
    required: [
      "topic_id",
      "title",
      "aliases",
      "node_type",
      "created_at",
      "updated_at",
    ],
    additionalProperties: true,
    properties: {
      topic_id: { type: "string", minLength: 1 },
      title: { type: "string", minLength: 1 },
      aliases: { type: "array", items: { type: "string" } },
      node_type: { enum: ["materialized", "placeholder"] },
      definition_status: {
        enum: ["has_synthesis", "placeholder", "deleted", "stale"],
      },
      current_artifact_path: { type: "string" },
      is_root: { type: "boolean" },
      level: { enum: ["top", "normal"] },
      paper_count: { type: "number" },
      last_synthesis_at: { type: "string" },
      created_at: { type: "string" },
      updated_at: { type: "string" },
    },
  });
  registry.registerDataSchema(SYNTHESIS_TOPIC_GRAPH_EDGE_SCHEMA_ID, {
    type: "object",
    required: [
      "edge_id",
      "source_topic_id",
      "target_topic_id",
      "relation",
      "status",
      "provenance",
      "evidence_refs",
      "created_at",
      "updated_at",
    ],
    additionalProperties: true,
    properties: {
      edge_id: { type: "string", minLength: 1 },
      source_topic_id: { type: "string", minLength: 1 },
      target_topic_id: { type: "string", minLength: 1 },
      relation: {
        enum: ["broader_than", "related_to", "overlaps_with", "contrasts_with"],
      },
      status: { enum: ["suggested", "confirmed", "rejected", "stale"] },
      confidence: { type: "number" },
      provenance: { type: "array" },
      evidence_refs: { type: "array" },
      created_at: { type: "string" },
      updated_at: { type: "string" },
    },
  });
  registry.registerDataSchema(SYNTHESIS_TOPIC_GRAPH_REVIEW_ITEM_SCHEMA_ID, {
    type: "object",
    required: [
      "review_id",
      "status",
      "source_topic_id",
      "target_topic_id",
      "relation",
      "provenance",
      "evidence_refs",
      "created_at",
      "updated_at",
    ],
    additionalProperties: true,
    properties: {
      review_id: { type: "string", minLength: 1 },
      status: { enum: ["open", "approved", "rejected"] },
      source_topic_id: { type: "string", minLength: 1 },
      target_topic_id: { type: "string", minLength: 1 },
      target_title: { type: "string" },
      relation: {
        enum: ["broader_than", "related_to", "overlaps_with", "contrasts_with"],
      },
      confidence: { type: "number" },
      provenance: { type: "array" },
      evidence_refs: { type: "array" },
      created_at: { type: "string" },
      updated_at: { type: "string" },
      resolved_at: { type: "string" },
    },
  });
  registry.registerDataSchema(SYNTHESIS_TOPIC_GRAPH_MANIFEST_SCHEMA_ID, {
    type: "object",
    required: [
      "manifest_hash",
      "node_count",
      "edge_count",
      "updated_at",
      "projection_target",
    ],
    additionalProperties: true,
    properties: {
      manifest_hash: { type: "string" },
      node_count: { type: "number" },
      edge_count: { type: "number" },
      review_count: { type: "number" },
      updated_at: { type: "string" },
      projection_target: { type: "string" },
    },
  });
  return registry;
}

function proposalRelation(
  type: SynthesisTopicRelationProposalType,
): SynthesisTopicGraphRelation {
  if (type === "broader_topic_candidate") {
    return "broader_than";
  }
  if (type === "overlap_topic_candidate") {
    return "overlaps_with";
  }
  if (type === "contrast_topic_candidate") {
    return "contrasts_with";
  }
  return "related_to";
}

function normalizeProposalType(
  value: unknown,
): SynthesisTopicRelationProposalType | null {
  const type = cleanString(value);
  if (
    type === "broader_topic_candidate" ||
    type === "related_topic_candidate" ||
    type === "overlap_topic_candidate" ||
    type === "contrast_topic_candidate"
  ) {
    return type;
  }
  return null;
}

function normalizeProposal(
  input: unknown,
): SynthesisTopicRelationProposal | null {
  if (!isRecord(input)) {
    return null;
  }
  const type = normalizeProposalType(input.type || input.proposal_type);
  if (!type) {
    return null;
  }
  const target = isRecord(input.target) ? input.target : {};
  return {
    type,
    target_topic_id:
      cleanString(input.target_topic_id || target.topic_id || target.id) ||
      undefined,
    target_title: cleanString(input.target_title || target.title) || undefined,
    confidence: clampConfidence(input.confidence),
    evidence_refs: Array.isArray(input.evidence_refs)
      ? input.evidence_refs
      : [],
    provenance: Array.isArray(input.provenance) ? input.provenance : [],
  };
}

function placeholderTopicId(title: string) {
  return `placeholder:${safeTopicGraphId(title).toLowerCase()}`;
}

function reviewIdFor(args: {
  sourceTopicId: string;
  targetTopicId: string;
  relation: SynthesisTopicGraphRelation;
}) {
  return `review:${safeTopicGraphId(args.relation)}:${safeTopicGraphId(args.sourceTopicId)}:${safeTopicGraphId(args.targetTopicId)}`;
}

function mergeUnknownLists(left: unknown[], right: unknown[]) {
  const byHash = new Map<string, unknown>();
  for (const value of [...left, ...right]) {
    byHash.set(hashCanonicalJson(value), value);
  }
  return [...byHash.values()];
}

function hasBroaderPath(
  edges: SynthesisTopicGraphEdge[],
  start: string,
  target: string,
) {
  const adjacency = new Map<string, string[]>();
  for (const edge of edges) {
    if (edge.relation !== "broader_than" || edge.status === "rejected") {
      continue;
    }
    adjacency.set(edge.source_topic_id, [
      ...(adjacency.get(edge.source_topic_id) || []),
      edge.target_topic_id,
    ]);
  }
  const queue = [start];
  const visited = new Set<string>();
  while (queue.length) {
    const current = queue.shift() || "";
    if (current === target) {
      return true;
    }
    if (visited.has(current)) {
      continue;
    }
    visited.add(current);
    queue.push(...(adjacency.get(current) || []));
  }
  return false;
}

export function createSynthesisTopicGraphService(options: ServiceOptions) {
  const root = cleanString(options.root);
  if (!root) {
    throw new Error("Synthesis topic graph service requires a storage root");
  }
  const now = options.now || nowIso;
  const registry = createRegistry();

  async function ensureTopicGraphStore() {
    const paths = await initializeSynthesisKnowledgeGraphStore(root);
    await ensureRuntimeDirectory(joinPath(paths.topicGraphRoot, "topics"));
    await ensureRuntimeDirectory(joinPath(paths.topicGraphRoot, "edges"));
    await ensureRuntimeDirectory(joinPath(paths.topicGraphRoot, "review"));
    if (
      !(await runtimePathExists(
        joinPath(paths.topicGraphRoot, "manifest.json"),
      ))
    ) {
      await commitGraph({
        nodes: [],
        edges: [],
        transactionId: "topic-graph-init",
      });
    }
    return paths;
  }

  async function readAsset<T>(relativePath: string, schemaId: string) {
    return readCanonicalJsonAsset<T>({
      root,
      registry,
      relativePath,
      schemaId,
    });
  }

  async function readNodeAssets() {
    const paths = await initializeSynthesisKnowledgeGraphStore(root);
    await ensureRuntimeDirectory(joinPath(paths.topicGraphRoot, "topics"));
    const nodes: SynthesisTopicGraphNode[] = [];
    for (const child of await listRuntimeChildren(
      joinPath(paths.topicGraphRoot, "topics"),
    )) {
      if (!getBaseName(child).endsWith(".json")) {
        continue;
      }
      const relative = `topic-graph/topics/${getBaseName(child)}`;
      const parsed = await readAsset<SynthesisTopicGraphNode>(
        relative,
        SYNTHESIS_TOPIC_GRAPH_NODE_SCHEMA_ID,
      ).catch(() => null);
      if (parsed?.data) {
        nodes.push(parsed.data);
      }
    }
    return sortNodes(nodes);
  }

  async function readEdgeAssets() {
    const paths = await initializeSynthesisKnowledgeGraphStore(root);
    await ensureRuntimeDirectory(joinPath(paths.topicGraphRoot, "edges"));
    const edges: SynthesisTopicGraphEdge[] = [];
    for (const child of await listRuntimeChildren(
      joinPath(paths.topicGraphRoot, "edges"),
    )) {
      if (!getBaseName(child).endsWith(".json")) {
        continue;
      }
      const relative = `topic-graph/edges/${getBaseName(child)}`;
      const parsed = await readAsset<SynthesisTopicGraphEdge>(
        relative,
        SYNTHESIS_TOPIC_GRAPH_EDGE_SCHEMA_ID,
      ).catch(() => null);
      if (parsed?.data) {
        edges.push(parsed.data);
      }
    }
    return sortEdges(edges);
  }

  async function readReviewAssets() {
    const paths = await initializeSynthesisKnowledgeGraphStore(root);
    await ensureRuntimeDirectory(joinPath(paths.topicGraphRoot, "review"));
    const reviewItems: SynthesisTopicGraphReviewItem[] = [];
    for (const child of await listRuntimeChildren(
      joinPath(paths.topicGraphRoot, "review"),
    )) {
      if (!getBaseName(child).endsWith(".json")) {
        continue;
      }
      const relative = `topic-graph/review/${getBaseName(child)}`;
      const parsed = await readAsset<SynthesisTopicGraphReviewItem>(
        relative,
        SYNTHESIS_TOPIC_GRAPH_REVIEW_ITEM_SCHEMA_ID,
      ).catch(() => null);
      if (parsed?.data) {
        reviewItems.push(parsed.data);
      }
    }
    return sortReviewItems(reviewItems);
  }

  async function readManifest(
    nodes: SynthesisTopicGraphNode[],
    edges: SynthesisTopicGraphEdge[],
    reviewItems: SynthesisTopicGraphReviewItem[],
  ) {
    return (
      (
        await readAsset<SynthesisTopicGraphManifest>(
          "topic-graph/manifest.json",
          SYNTHESIS_TOPIC_GRAPH_MANIFEST_SCHEMA_ID,
        )
      )?.data || buildManifest({ nodes, edges, reviewItems, updatedAt: now() })
    );
  }

  async function commitGraph(args: {
    nodes: SynthesisTopicGraphNode[];
    edges: SynthesisTopicGraphEdge[];
    reviewItems?: SynthesisTopicGraphReviewItem[];
    transactionId?: string;
  }) {
    const timestamp = now();
    const nodes = sortNodes(args.nodes);
    const edges = sortEdges(args.edges);
    const reviewItems = sortReviewItems(args.reviewItems || []);
    const manifest = buildManifest({
      nodes,
      edges,
      reviewItems,
      updatedAt: timestamp,
    });
    return writeCanonicalTransaction({
      root,
      registry,
      scope: "topic-graph",
      transactionId: args.transactionId,
      projectionTargets: [SYNTHESIS_TOPIC_GRAPH_INDEX_TARGET],
      sourceManifestHash: manifest.manifest_hash,
      assets: [
        ...nodes.map((node) => ({
          relativePath: relativeTopicPath(node.topic_id),
          schemaId: SYNTHESIS_TOPIC_GRAPH_NODE_SCHEMA_ID,
          data: node,
        })),
        ...edges.map((edge) => ({
          relativePath: relativeEdgePath(edge.edge_id),
          schemaId: SYNTHESIS_TOPIC_GRAPH_EDGE_SCHEMA_ID,
          data: edge,
        })),
        ...reviewItems.map((reviewItem) => ({
          relativePath: relativeReviewPath(reviewItem.review_id),
          schemaId: SYNTHESIS_TOPIC_GRAPH_REVIEW_ITEM_SCHEMA_ID,
          data: reviewItem,
        })),
        {
          relativePath: "topic-graph/manifest.json",
          schemaId: SYNTHESIS_TOPIC_GRAPH_MANIFEST_SCHEMA_ID,
          data: manifest,
        },
      ],
    });
  }

  async function loadTopicGraph(): Promise<SynthesisTopicGraphSnapshot> {
    await ensureTopicGraphStore();
    const nodes = await readNodeAssets();
    const edges = await readEdgeAssets();
    const reviewItems = await readReviewAssets();
    const manifest = await readManifest(nodes, edges, reviewItems);
    const registryState = await readProjectionRegistryState(root);
    return {
      nodes,
      edges,
      review_items: reviewItems,
      manifest,
      projection: registryState.projections[SYNTHESIS_TOPIC_GRAPH_INDEX_TARGET],
      diagnostics: [],
    };
  }

  async function saveTopicGraph(args: {
    nodes?: Array<Partial<SynthesisTopicGraphNode> & { topic_id?: string }>;
    edges?: Array<Partial<SynthesisTopicGraphEdge>>;
    transactionId?: string;
  }) {
    const current = await loadTopicGraph();
    const timestamp = now();
    const nodesById = new Map(
      current.nodes.map((node) => [node.topic_id, node]),
    );
    for (const input of args.nodes || []) {
      const node = normalizeTopicNode(
        input,
        timestamp,
        nodesById.get(cleanString(input.topic_id)),
      );
      if (node) {
        nodesById.set(node.topic_id, node);
      }
    }
    const edgesById = new Map(
      current.edges.map((edge) => [edge.edge_id, edge]),
    );
    for (const input of args.edges || []) {
      const edge = normalizeTopicEdge(
        input,
        timestamp,
        input.edge_id ? edgesById.get(cleanString(input.edge_id)) : undefined,
      );
      if (edge) {
        edgesById.set(edge.edge_id, edge);
      }
    }
    const result = await commitGraph({
      nodes: [...nodesById.values()],
      edges: [...edgesById.values()],
      reviewItems: current.review_items,
      transactionId: args.transactionId,
    });
    return { transactionId: result.transactionId, receipt: result.receipt };
  }

  async function upsertTopicNode(
    node: Partial<SynthesisTopicGraphNode> & { topic_id?: string },
    options?: { transactionId?: string },
  ) {
    return saveTopicGraph({
      nodes: [node],
      transactionId: options?.transactionId,
    });
  }

  async function upsertTopicEdge(
    edge: Partial<SynthesisTopicGraphEdge>,
    options?: { transactionId?: string },
  ) {
    return saveTopicGraph({
      edges: [edge],
      transactionId: options?.transactionId,
    });
  }

  async function upsertMaterializedTopic(args: {
    topicId: string;
    title: string;
    aliases?: string[];
    currentArtifactPath?: string;
    paperCount?: number;
    lastSynthesisAt?: string;
    isRoot?: boolean;
    level?: "top" | "normal";
    transactionId?: string;
  }) {
    return upsertTopicNode(
      {
        topic_id: args.topicId,
        title: args.title,
        aliases: args.aliases || [],
        node_type: "materialized",
        definition_status: "has_synthesis",
        current_artifact_path: args.currentArtifactPath,
        paper_count: args.paperCount,
        last_synthesis_at: args.lastSynthesisAt || now(),
        is_root: args.isRoot,
        level: args.level,
      },
      { transactionId: args.transactionId },
    );
  }

  async function decideTopicGraphRelation(args: {
    edgeId: string;
    status: Extract<SynthesisTopicGraphEdgeStatus, "confirmed" | "rejected">;
    transactionId?: string;
  }): Promise<SynthesisTopicGraphRelationDecisionResult> {
    const edgeId = cleanString(args.edgeId);
    const current = await loadTopicGraph();
    const edge = current.edges.find((entry) => entry.edge_id === edgeId);
    if (!edge) {
      return {
        diagnostic: {
          code: "topic_graph_edge_missing",
          message: "Topic graph edge does not exist.",
          edge_id: edgeId,
        },
      };
    }
    if (edge.status !== "suggested") {
      return {
        edge,
        diagnostic: {
          code: "topic_graph_edge_not_suggested",
          message: "Only suggested topic graph edges can be reviewed.",
          edge_id: edge.edge_id,
          source_topic_id: edge.source_topic_id,
          target_topic_id: edge.target_topic_id,
          relation: edge.relation,
        },
      };
    }
    const timestamp = now();
    const decided: SynthesisTopicGraphEdge = {
      ...edge,
      status: args.status,
      updated_at: timestamp,
    };
    const result = await commitGraph({
      nodes: current.nodes,
      edges: current.edges.map((entry) =>
        entry.edge_id === edge.edge_id ? decided : entry,
      ),
      reviewItems: current.review_items,
      transactionId: args.transactionId,
    });
    return {
      edge: decided,
      receipt: result.receipt,
    };
  }

  async function applyTopicGraphReviewAction(args: {
    reviewId: string;
    action: "approve_suggested" | "reject";
    transactionId?: string;
  }): Promise<SynthesisTopicGraphReviewDecisionResult> {
    const reviewId = cleanString(args.reviewId);
    const current = await loadTopicGraph();
    const review = current.review_items.find(
      (entry) => entry.review_id === reviewId,
    );
    if (!review) {
      return {
        diagnostic: {
          code: "topic_graph_review_missing",
          message: "Topic graph review item does not exist.",
        },
      };
    }
    if (review.status !== "open") {
      return {
        review_item: review,
        diagnostic: {
          code: "topic_graph_review_closed",
          message: "Topic graph review item is already resolved.",
          source_topic_id: review.source_topic_id,
          target_topic_id: review.target_topic_id,
          relation: review.relation,
        },
      };
    }
    const timestamp = now();
    const nodesById = new Map(
      current.nodes.map((node) => [node.topic_id, node]),
    );
    for (const node of [
      {
        topic_id: review.source_topic_id,
        title: review.source_topic_id,
        node_type: "placeholder" as const,
        definition_status: "placeholder" as const,
      },
      {
        topic_id: review.target_topic_id,
        title: review.target_title || review.target_topic_id,
        node_type: "placeholder" as const,
        definition_status: "placeholder" as const,
      },
    ]) {
      if (!nodesById.has(node.topic_id)) {
        const normalized = normalizeTopicNode(node, timestamp);
        if (normalized) {
          nodesById.set(normalized.topic_id, normalized);
        }
      }
    }
    const edgesById = new Map(
      current.edges.map((edge) => [edge.edge_id, edge]),
    );
    let edge: SynthesisTopicGraphEdge | undefined;
    if (args.action === "approve_suggested") {
      const tuple = canonicalizeTopicGraphEdgeTuple({
        sourceTopicId: review.source_topic_id,
        targetTopicId: review.target_topic_id,
        relation: review.relation,
      });
      const edgeId = deterministicTopicGraphEdgeId(tuple);
      const previous = edgesById.get(edgeId);
      if (previous?.status === "confirmed" || previous?.status === "rejected") {
        return {
          review_item: review,
          diagnostic: {
            code: "topic_graph_user_decision_preserved",
            message: "Existing confirmed or rejected edge was not overwritten.",
            edge_id: previous.edge_id,
            source_topic_id: previous.source_topic_id,
            target_topic_id: previous.target_topic_id,
            relation: previous.relation,
          },
        };
      }
      const normalizedEdge = normalizeTopicEdge(
        {
          source_topic_id: tuple.sourceTopicId,
          target_topic_id: tuple.targetTopicId,
          relation: review.relation,
          status: "suggested",
          confidence: review.confidence,
          provenance: review.provenance,
          evidence_refs: review.evidence_refs,
        },
        timestamp,
        previous,
      );
      if (normalizedEdge) {
        edge = normalizedEdge;
        edgesById.set(normalizedEdge.edge_id, normalizedEdge);
      }
    }
    const resolvedReview: SynthesisTopicGraphReviewItem = {
      ...review,
      status: args.action === "reject" ? "rejected" : "approved",
      updated_at: timestamp,
      resolved_at: timestamp,
    };
    const result = await commitGraph({
      nodes: [...nodesById.values()],
      edges: [...edgesById.values()],
      reviewItems: current.review_items.map((entry) =>
        entry.review_id === review.review_id ? resolvedReview : entry,
      ),
      transactionId: args.transactionId,
    });
    return {
      review_item: resolvedReview,
      edge,
      receipt: result.receipt,
    };
  }

  async function writeIngestionDiagnostic(
    diagnostic: SynthesisTopicGraphDiagnostic,
    transactionId?: string,
  ) {
    await writeCanonicalDiagnostic({
      root,
      diagnostic: {
        scope: "topic-graph",
        transaction_id: transactionId,
        code: diagnostic.code,
        message: diagnostic.message,
        asset_path: "topic-graph/manifest.json",
        details: diagnostic,
        created_at: now(),
      },
    });
  }

  async function ingestRelationProposals(args: {
    sourceTopicId: string;
    payload: unknown;
    transactionId?: string;
  }): Promise<SynthesisTopicRelationProposalIngestResult> {
    const sourceTopicId = cleanString(args.sourceTopicId);
    const row = isRecord(args.payload) ? args.payload : {};
    const sourceFromPayload = cleanString(row.source_topic_id);
    const effectiveSource = sourceTopicId || sourceFromPayload;
    const proposals = Array.isArray(row.proposals) ? row.proposals : [];
    const normalized = proposals
      .map((entry) => normalizeProposal(entry))
      .filter((entry): entry is SynthesisTopicRelationProposal =>
        Boolean(entry),
      );
    const current = await loadTopicGraph();
    const timestamp = now();
    const nodesById = new Map(
      current.nodes.map((node) => [node.topic_id, node]),
    );
    const edgesById = new Map(
      current.edges.map((edge) => [edge.edge_id, edge]),
    );
    const reviewItemsById = new Map(
      current.review_items.map((item) => [item.review_id, item]),
    );
    const diagnostics: SynthesisTopicGraphDiagnostic[] = [];
    const accepted: SynthesisTopicGraphEdge[] = [];
    const placeholders: SynthesisTopicGraphNode[] = [];
    const queuedReviewItems: SynthesisTopicGraphReviewItem[] = [];

    if (!effectiveSource) {
      diagnostics.push({
        code: "missing_source_topic",
        message: "Relation proposal payload does not name a source topic.",
      });
    }
    if (!Array.isArray(row.proposals)) {
      diagnostics.push({
        code: "invalid_proposals_payload",
        message: "Relation proposal sidecar must include a proposals array.",
        source_topic_id: effectiveSource,
      });
    }

    for (const proposal of normalized) {
      const relation = proposalRelation(proposal.type);
      let targetTopicId = cleanString(proposal.target_topic_id);
      if (!targetTopicId && proposal.target_title) {
        targetTopicId = placeholderTopicId(proposal.target_title);
      }
      if (!targetTopicId) {
        diagnostics.push({
          code: "missing_target_topic",
          message: "Relation proposal target topic is missing.",
          source_topic_id: effectiveSource,
          relation,
        });
        continue;
      }
      if (targetTopicId === effectiveSource) {
        diagnostics.push({
          code: "self_edge_rejected",
          message: "Relation proposal resolved to a self edge.",
          source_topic_id: effectiveSource,
          target_topic_id: targetTopicId,
          relation,
        });
        continue;
      }
      if (!nodesById.has(targetTopicId)) {
        const placeholder = normalizeTopicNode(
          {
            topic_id: targetTopicId,
            title: proposal.target_title || targetTopicId,
            aliases: [],
            node_type: "placeholder",
            definition_status: "placeholder",
          },
          timestamp,
        );
        if (placeholder) {
          nodesById.set(placeholder.topic_id, placeholder);
          placeholders.push(placeholder);
        }
      }
      if (!nodesById.has(effectiveSource)) {
        const sourceNode = normalizeTopicNode(
          {
            topic_id: effectiveSource,
            title: effectiveSource,
            aliases: [],
            node_type: "placeholder",
            definition_status: "placeholder",
          },
          timestamp,
        );
        if (sourceNode) {
          nodesById.set(sourceNode.topic_id, sourceNode);
        }
      }
      const tuple =
        relation === "broader_than"
          ? {
              sourceTopicId: targetTopicId,
              targetTopicId: effectiveSource,
              relation,
            }
          : { sourceTopicId: effectiveSource, targetTopicId, relation };
      const canonical = canonicalizeTopicGraphEdgeTuple(tuple);
      if (proposal.confidence !== undefined && proposal.confidence < 0.5) {
        const reviewId = reviewIdFor({
          sourceTopicId: canonical.sourceTopicId,
          targetTopicId: canonical.targetTopicId,
          relation,
        });
        const previous = reviewItemsById.get(reviewId);
        const reviewItem: SynthesisTopicGraphReviewItem = {
          review_id: reviewId,
          status: previous?.status || "open",
          source_topic_id: canonical.sourceTopicId,
          target_topic_id: canonical.targetTopicId,
          target_title: proposal.target_title,
          relation,
          confidence: proposal.confidence,
          provenance: mergeUnknownLists(
            previous?.provenance || [],
            proposal.provenance || [],
          ),
          evidence_refs: mergeUnknownLists(
            previous?.evidence_refs || [],
            proposal.evidence_refs || [],
          ),
          created_at: previous?.created_at || timestamp,
          updated_at: timestamp,
          resolved_at: previous?.resolved_at,
        };
        reviewItemsById.set(reviewId, reviewItem);
        if (reviewItem.status === "open") {
          queuedReviewItems.push(reviewItem);
        }
        diagnostics.push({
          code: "low_confidence_relation_review",
          message: "Low-confidence relation proposal requires review.",
          source_topic_id: canonical.sourceTopicId,
          target_topic_id: canonical.targetTopicId,
          relation,
        });
        continue;
      }
      if (
        relation === "broader_than" &&
        hasBroaderPath(
          [...edgesById.values()],
          canonical.targetTopicId,
          canonical.sourceTopicId,
        )
      ) {
        diagnostics.push({
          code: "broader_cycle_rejected",
          message: "Proposed broader_than edge would create a cycle.",
          source_topic_id: canonical.sourceTopicId,
          target_topic_id: canonical.targetTopicId,
          relation,
        });
        continue;
      }
      const edgeId = deterministicTopicGraphEdgeId(canonical);
      const previous = edgesById.get(edgeId);
      if (previous?.status === "confirmed" || previous?.status === "rejected") {
        diagnostics.push({
          code: "user_decision_preserved",
          message: "Existing confirmed or rejected edge was not overwritten.",
          source_topic_id: canonical.sourceTopicId,
          target_topic_id: canonical.targetTopicId,
          relation,
        });
        continue;
      }
      const edge = normalizeTopicEdge(
        {
          source_topic_id: canonical.sourceTopicId,
          target_topic_id: canonical.targetTopicId,
          relation,
          status: "suggested",
          confidence: proposal.confidence ?? previous?.confidence,
          provenance: mergeUnknownLists(
            previous?.provenance || [],
            proposal.provenance || [],
          ),
          evidence_refs: mergeUnknownLists(
            previous?.evidence_refs || [],
            proposal.evidence_refs || [],
          ),
        },
        timestamp,
        previous,
      );
      if (edge) {
        edgesById.set(edge.edge_id, edge);
        accepted.push(edge);
      }
    }

    for (const diagnostic of diagnostics) {
      await writeIngestionDiagnostic(diagnostic, args.transactionId);
    }
    if (!accepted.length && !placeholders.length && !queuedReviewItems.length) {
      return {
        accepted_edges: [],
        placeholder_nodes: [],
        review_items: queuedReviewItems,
        diagnostics,
      };
    }
    const result = await commitGraph({
      nodes: [...nodesById.values()],
      edges: [...edgesById.values()],
      reviewItems: [...reviewItemsById.values()],
      transactionId: args.transactionId,
    });
    return {
      accepted_edges: accepted,
      placeholder_nodes: placeholders,
      review_items: queuedReviewItems,
      diagnostics,
      receipt: result.receipt,
    };
  }

  async function rebuildTopicGraphIndexProjection() {
    const snapshot = await loadTopicGraph();
    const rebuiltAt = now();
    const parented = new Set(
      snapshot.edges
        .filter(
          (edge) =>
            edge.relation === "broader_than" && edge.status !== "rejected",
        )
        .map((edge) => edge.target_topic_id),
    );
    const projection: SynthesisTopicGraphIndexProjection = {
      schema_id: "synthesis.topic_graph_index_projection",
      schema_version: SYNTHESIS_TOPIC_GRAPH_INDEX_SCHEMA_VERSION,
      source_manifest_hash: snapshot.manifest.manifest_hash,
      rebuilt_at: rebuiltAt,
      nodes: snapshot.nodes,
      edges: snapshot.edges,
      review_items: snapshot.review_items,
      roots: snapshot.nodes
        .filter((node) => node.is_root || node.level === "top")
        .map((node) => node.topic_id)
        .sort((left, right) => left.localeCompare(right)),
      unplaced: snapshot.nodes
        .filter(
          (node) =>
            !node.is_root &&
            node.level !== "top" &&
            node.definition_status !== "deleted" &&
            !parented.has(node.topic_id),
        )
        .map((node) => node.topic_id)
        .sort((left, right) => left.localeCompare(right)),
      diagnostics: snapshot.diagnostics,
    };
    const paths = await initializeSynthesisKnowledgeGraphStore(root);
    await writeRuntimeTextFile(
      joinPath(paths.stateRoot, "topic-graph-index.json"),
      `${JSON.stringify(projection, null, 2)}\n`,
    );
    return recordProjectionRebuild({
      root,
      target: SYNTHESIS_TOPIC_GRAPH_INDEX_TARGET,
      schemaVersion: SYNTHESIS_TOPIC_GRAPH_INDEX_SCHEMA_VERSION,
      sourceManifestHash: snapshot.manifest.manifest_hash,
      diagnostics: projection.diagnostics,
      now: rebuiltAt,
    });
  }

  async function readTopicGraphIndexProjection() {
    const paths = await initializeSynthesisKnowledgeGraphStore(root);
    const projectionPath = joinPath(paths.stateRoot, "topic-graph-index.json");
    try {
      const raw = await readRuntimeTextFile(projectionPath);
      return JSON.parse(raw) as SynthesisTopicGraphIndexProjection;
    } catch {
      await rebuildTopicGraphIndexProjection();
      const raw = await readRuntimeTextFile(projectionPath);
      return JSON.parse(raw) as SynthesisTopicGraphIndexProjection;
    }
  }

  return {
    loadTopicGraph,
    saveTopicGraph,
    upsertTopicNode,
    upsertTopicEdge,
    upsertMaterializedTopic,
    decideTopicGraphRelation,
    applyTopicGraphReviewAction,
    ingestRelationProposals,
    rebuildTopicGraphIndexProjection,
    readTopicGraphIndexProjection,
  };
}

export type SynthesisTopicGraphService = ReturnType<
  typeof createSynthesisTopicGraphService
>;
