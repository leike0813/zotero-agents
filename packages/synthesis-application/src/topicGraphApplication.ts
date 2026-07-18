import {
  rebuildSynthesisTopicGraphApplicationIngestRequest,
  rebuildSynthesisTopicGraphApplicationMarkDeletedRequest,
  rebuildSynthesisTopicGraphApplicationMaterializedTopicRequest,
  rebuildSynthesisTopicGraphApplicationMutationResult,
  rebuildSynthesisTopicGraphApplicationPurgeRequest,
  rebuildSynthesisTopicGraphApplicationRebuildIndexRequest,
  rebuildSynthesisTopicGraphApplicationRelationDecisionRequest,
  rebuildSynthesisTopicGraphApplicationReplaceRequest,
  rebuildSynthesisTopicGraphApplicationReviewRequest,
  rebuildSynthesisTopicGraphApplicationSnapshot,
  rebuildSynthesisTopicGraphApplicationState,
  rebuildSynthesisTopicGraphApplicationUpsertRequest,
  SynthesisTopicGraphApplicationContractError,
  type SynthesisTopicGraphApplicationDiagnostic,
  type SynthesisTopicGraphApplicationEdge,
  type SynthesisTopicGraphApplicationLoaded,
  type SynthesisTopicGraphApplicationMutationResult,
  type SynthesisTopicGraphApplicationNode,
  type SynthesisTopicGraphApplicationProposal,
  type SynthesisTopicGraphApplicationReviewItem,
  type SynthesisTopicGraphApplicationSnapshot,
} from "../../synthesis-contracts/src/topicGraphApplication.js";
import {
  SYNTHESIS_TOPIC_GRAPH_INDEX_ALGORITHM_VERSION,
  SYNTHESIS_TOPIC_GRAPH_INDEX_CONTRACT_VERSION,
  rebuildSynthesisTopicGraphIndexResult,
  type SynthesisTopicGraphIndexRelation,
  type SynthesisTopicGraphIndexRequest,
  type SynthesisTopicGraphIndexResult,
} from "../../synthesis-engine/src/topicGraphIndex.js";
import {
  canonicalizeSynthesisEngineJson,
  hashSynthesisEngineCanonicalJson,
} from "../../synthesis-engine/src/canonicalJson.js";
import type {
  SynthesisTopicGraphApplicationStateRecord,
  SynthesisTopicGraphStateRecords,
} from "../../synthesis-repository/src/topicGraph.js";

export type SynthesisTopicGraphApplicationRepository = {
  initializeTopicGraphApplication(): void;
  getTopicGraphApplicationState(): SynthesisTopicGraphApplicationStateRecord | null;
  listTopicGraphNodes(): SynthesisTopicGraphStateRecords["nodes"];
  listTopicGraphEdges(): SynthesisTopicGraphStateRecords["edges"];
  listTopicGraphReviewItems(): SynthesisTopicGraphStateRecords["reviewItems"];
  replaceTopicGraphApplicationState(args: {
    expectedManifestHash: string | null;
    manifestHash: string;
    state: SynthesisTopicGraphStateRecords;
    now: string;
  }): number | null;
  promoteTopicGraphIndex(args: {
    expectedManifestHash: string;
    indexHash: string;
    indexJson: string;
    now: string;
  }): boolean;
};
export type SynthesisTopicGraphApplicationCompute = {
  buildIndex(
    request: SynthesisTopicGraphIndexRequest,
    options?: { signal?: AbortSignal },
  ): Promise<SynthesisTopicGraphIndexResult>;
};
type Options = {
  repository: SynthesisTopicGraphApplicationRepository;
  compute: SynthesisTopicGraphApplicationCompute;
  now?: () => string;
};

const emptySnapshot = (): SynthesisTopicGraphApplicationSnapshot => ({
  nodes: [],
  edges: [],
  reviewItems: [],
});
const clean = (value: unknown) => String(value ?? "").trim();
export const safeSynthesisTopicGraphId = (value: unknown) =>
  clean(value)
    .replace(/\\/g, "/")
    .replace(/[^A-Za-z0-9_.-]+/g, "_")
    .replace(/^_+|_+$/g, "") || "topic";
const DIRECTIONAL = new Set<SynthesisTopicGraphIndexRelation>(["broader_than"]);

export function canonicalizeSynthesisTopicGraphEdgeTuple(args: {
  sourceTopicId: string;
  targetTopicId: string;
  relation: SynthesisTopicGraphIndexRelation;
}) {
  let sourceTopicId = clean(args.sourceTopicId);
  let targetTopicId = clean(args.targetTopicId);
  if (
    !DIRECTIONAL.has(args.relation) &&
    targetTopicId.localeCompare(sourceTopicId) < 0
  ) {
    [sourceTopicId, targetTopicId] = [targetTopicId, sourceTopicId];
  }
  return { sourceTopicId, targetTopicId, relation: args.relation };
}
export function synthesisTopicGraphEdgeId(args: {
  sourceTopicId: string;
  targetTopicId: string;
  relation: SynthesisTopicGraphIndexRelation;
}) {
  const tuple = canonicalizeSynthesisTopicGraphEdgeTuple(args);
  return `edge:${tuple.relation}:${safeSynthesisTopicGraphId(tuple.sourceTopicId)}:${safeSynthesisTopicGraphId(tuple.targetTopicId)}`;
}
export function synthesisTopicGraphReviewId(args: {
  sourceTopicId: string;
  targetTopicId: string;
  relation: SynthesisTopicGraphIndexRelation;
}) {
  return `review:${safeSynthesisTopicGraphId(args.relation)}:${safeSynthesisTopicGraphId(args.sourceTopicId)}:${safeSynthesisTopicGraphId(args.targetTopicId)}`;
}
export function hashSynthesisTopicGraphSnapshot(
  snapshot: SynthesisTopicGraphApplicationSnapshot,
) {
  return hashSynthesisEngineCanonicalJson(
    rebuildSynthesisTopicGraphApplicationSnapshot(snapshot),
  );
}

function fromRecords(
  repository: SynthesisTopicGraphApplicationRepository,
): SynthesisTopicGraphApplicationSnapshot {
  return rebuildSynthesisTopicGraphApplicationSnapshot({
    nodes: repository.listTopicGraphNodes().map((row) => ({
      topicId: row.topicId,
      title: row.title,
      ...(row.definition ? { definition: row.definition } : {}),
      aliases: JSON.parse(row.aliasesJson || "[]"),
      nodeType: row.nodeType,
      ...(row.definitionStatus
        ? { definitionStatus: row.definitionStatus }
        : {}),
      ...(row.currentArtifactPath
        ? { currentArtifactPath: row.currentArtifactPath }
        : {}),
      isRoot: Boolean(row.isRoot),
      ...(row.level ? { level: row.level } : {}),
      paperCount: row.paperCount ?? 0,
      ...(row.lastSynthesisAt ? { lastSynthesisAt: row.lastSynthesisAt } : {}),
      ...(row.createdAt ? { createdAt: row.createdAt } : {}),
      ...(row.updatedAt ? { updatedAt: row.updatedAt } : {}),
    })),
    edges: repository.listTopicGraphEdges().map((row) => ({
      edgeId: row.edgeId,
      sourceTopicId: row.sourceTopicId,
      targetTopicId: row.targetTopicId,
      relation: row.relation,
      status: row.status,
      ...(row.confidence === undefined ? {} : { confidence: row.confidence }),
      provenance: JSON.parse(row.provenanceJson || "[]"),
      evidenceRefs: JSON.parse(row.evidenceRefsJson || "[]"),
      ...(row.createdAt ? { createdAt: row.createdAt } : {}),
      ...(row.updatedAt ? { updatedAt: row.updatedAt } : {}),
    })),
    reviewItems: repository.listTopicGraphReviewItems().map((row) => ({
      reviewId: row.reviewId,
      status: row.status,
      sourceTopicId: row.sourceTopicId,
      targetTopicId: row.targetTopicId,
      ...(row.targetTitle ? { targetTitle: row.targetTitle } : {}),
      relation: row.relation,
      ...(row.confidence === undefined ? {} : { confidence: row.confidence }),
      provenance: JSON.parse(row.provenanceJson || "[]"),
      evidenceRefs: JSON.parse(row.evidenceRefsJson || "[]"),
      ...(row.createdAt ? { createdAt: row.createdAt } : {}),
      ...(row.updatedAt ? { updatedAt: row.updatedAt } : {}),
      ...(row.resolvedAt ? { resolvedAt: row.resolvedAt } : {}),
    })),
  });
}
function toRecords(
  snapshot: SynthesisTopicGraphApplicationSnapshot,
): SynthesisTopicGraphStateRecords {
  return {
    nodes: snapshot.nodes.map((row) => ({
      ...row,
      aliasesJson: JSON.stringify(row.aliases),
    })),
    edges: snapshot.edges.map((row) => ({
      ...row,
      provenanceJson: JSON.stringify(row.provenance),
      evidenceRefsJson: JSON.stringify(row.evidenceRefs),
    })),
    reviewItems: snapshot.reviewItems.map((row) => ({
      ...row,
      provenanceJson: JSON.stringify(row.provenance),
      evidenceRefsJson: JSON.stringify(row.evidenceRefs),
    })),
  };
}
function engineSource(snapshot: SynthesisTopicGraphApplicationSnapshot) {
  return {
    nodes: snapshot.nodes.map((row) => ({
      topicId: row.topicId,
      isRoot: row.isRoot,
      ...(row.level ? { level: row.level } : {}),
      ...(row.definitionStatus
        ? { definitionStatus: row.definitionStatus }
        : {}),
    })),
    edges: snapshot.edges.map((row) => ({
      edgeId: row.edgeId,
      sourceTopicId: row.sourceTopicId,
      targetTopicId: row.targetTopicId,
      relation: row.relation,
      status: row.status,
    })),
  };
}

function emptyResult(
  status: SynthesisTopicGraphApplicationMutationResult["status"],
  state: SynthesisTopicGraphApplicationStateRecord | null,
  diagnostics: SynthesisTopicGraphApplicationDiagnostic[] = [],
) {
  return rebuildSynthesisTopicGraphApplicationMutationResult({
    status,
    manifestHash: state?.manifestHash ?? null,
    revision: state?.revision ?? 0,
    changedNodeIds: [],
    changedEdgeIds: [],
    reviewIds: [],
    diagnostics,
  });
}
export function synthesisTopicGraphRelationForProposal(
  type: SynthesisTopicGraphApplicationProposal["type"],
): SynthesisTopicGraphIndexRelation {
  if (
    type === "target_is_broader_topic_candidate" ||
    type === "target_is_narrower_topic_candidate"
  ) {
    return "broader_than";
  }
  if (type === "overlap_topic_candidate") return "overlaps_with";
  if (type === "contrast_topic_candidate") return "contrasts_with";
  return "related_to";
}
export function synthesisTopicGraphTupleForProposal(args: {
  sourceTopicId: string;
  proposal: SynthesisTopicGraphApplicationProposal;
}) {
  const relation = synthesisTopicGraphRelationForProposal(args.proposal.type);
  if (relation === "broader_than") {
    return canonicalizeSynthesisTopicGraphEdgeTuple(
      args.proposal.type === "target_is_narrower_topic_candidate"
        ? {
            sourceTopicId: args.sourceTopicId,
            targetTopicId: args.proposal.targetTopicId,
            relation,
          }
        : {
            sourceTopicId: args.proposal.targetTopicId,
            targetTopicId: args.sourceTopicId,
            relation,
          },
    );
  }
  return canonicalizeSynthesisTopicGraphEdgeTuple({
    sourceTopicId: args.sourceTopicId,
    targetTopicId: args.proposal.targetTopicId,
    relation,
  });
}
export function hasSynthesisTopicGraphBroaderPath(
  edges: SynthesisTopicGraphApplicationEdge[],
  start: string,
  target: string,
) {
  const adjacency = new Map<string, string[]>();
  for (const edge of edges) {
    if (
      edge.relation !== "broader_than" ||
      edge.status === "rejected" ||
      edge.status === "deleted" ||
      edge.status === "stale"
    ) {
      continue;
    }
    adjacency.set(edge.sourceTopicId, [
      ...(adjacency.get(edge.sourceTopicId) || []),
      edge.targetTopicId,
    ]);
  }
  const queue = [start];
  const visited = new Set<string>();
  while (queue.length) {
    const current = queue.shift() || "";
    if (current === target) return true;
    if (visited.has(current)) continue;
    visited.add(current);
    queue.push(...(adjacency.get(current) || []));
  }
  return false;
}
export function validateSynthesisTopicGraphCandidate(
  snapshot: SynthesisTopicGraphApplicationSnapshot,
) {
  for (const edge of snapshot.edges) {
    const tuple = canonicalizeSynthesisTopicGraphEdgeTuple(edge);
    if (
      edge.sourceTopicId !== tuple.sourceTopicId ||
      edge.targetTopicId !== tuple.targetTopicId ||
      edge.edgeId !== synthesisTopicGraphEdgeId(tuple)
    ) {
      throw new SynthesisTopicGraphApplicationContractError(
        "topicGraphSnapshot.edgeIdentity",
      );
    }
    if (
      edge.relation === "broader_than" &&
      edge.status !== "rejected" &&
      edge.status !== "deleted" &&
      edge.status !== "stale" &&
      hasSynthesisTopicGraphBroaderPath(
        snapshot.edges.filter((candidate) => candidate.edgeId !== edge.edgeId),
        edge.targetTopicId,
        edge.sourceTopicId,
      )
    ) {
      throw new SynthesisTopicGraphApplicationContractError(
        "topicGraphSnapshot.broaderCycle",
      );
    }
  }
  for (const review of snapshot.reviewItems) {
    const tuple = canonicalizeSynthesisTopicGraphEdgeTuple(review);
    if (
      review.sourceTopicId !== tuple.sourceTopicId ||
      review.targetTopicId !== tuple.targetTopicId ||
      review.reviewId !== synthesisTopicGraphReviewId(tuple)
    ) {
      throw new SynthesisTopicGraphApplicationContractError(
        "topicGraphSnapshot.reviewIdentity",
      );
    }
  }
  return snapshot;
}
function mergeJson(left: unknown[], right: unknown[]) {
  const values = new Map<string, unknown>();
  for (const value of [...left, ...right]) {
    values.set(hashSynthesisEngineCanonicalJson(value), value);
  }
  return [...values.values()];
}

export type SynthesisTopicGraphApplication = ReturnType<
  typeof createSynthesisTopicGraphApplication
>;

export function createSynthesisTopicGraphApplication(options: Options) {
  const { repository, compute } = options;
  const now = options.now ?? (() => new Date().toISOString());
  let stopping = false;
  let active: {
    controller: AbortController;
    promise: Promise<unknown>;
  } | null = null;
  repository.initializeTopicGraphApplication();

  const state = () => repository.getTopicGraphApplicationState();
  const inspect = () => {
    const current = state();
    return rebuildSynthesisTopicGraphApplicationState({
      manifestHash: current?.manifestHash ?? null,
      revision: current?.revision ?? 0,
      indexHash: current?.indexHash || null,
      indexBasisHash: current?.indexBasisHash || null,
      indexStale: current?.indexStale ?? true,
      nodeCount: repository.listTopicGraphNodes().length,
      edgeCount: repository.listTopicGraphEdges().length,
      reviewItemCount: repository.listTopicGraphReviewItems().length,
    });
  };
  const load = (): SynthesisTopicGraphApplicationLoaded => ({
    state: inspect(),
    snapshot: state() ? fromRecords(repository) : emptySnapshot(),
  });
  const readIndex = () => {
    const current = state();
    if (!current?.indexJson || current.indexJson === "{}") return null;
    return JSON.parse(current.indexJson) as SynthesisTopicGraphIndexResult;
  };
  const runMutation = async <T>(
    run: (signal: AbortSignal) => Promise<T>,
    busy: T,
    stopped: T,
  ) => {
    if (stopping) return stopped;
    if (active) return busy;
    const controller = new AbortController();
    const promise = run(controller.signal);
    active = { controller, promise };
    try {
      return await promise;
    } finally {
      if (active?.promise === promise) active = null;
    }
  };
  const commit = (
    expectedManifestHash: string | null,
    candidate: SynthesisTopicGraphApplicationSnapshot,
    changedNodeIds: string[] = [],
    changedEdgeIds: string[] = [],
    reviewIds: string[] = [],
    diagnostics: SynthesisTopicGraphApplicationDiagnostic[] = [],
  ) => {
    const snapshot = validateSynthesisTopicGraphCandidate(
      rebuildSynthesisTopicGraphApplicationSnapshot(candidate),
    );
    const manifestHash = hashSynthesisTopicGraphSnapshot(snapshot);
    const current = state();
    if ((current?.manifestHash ?? null) !== expectedManifestHash) {
      return emptyResult("basis_mismatch", current);
    }
    if (current?.manifestHash === manifestHash) {
      return emptyResult("unchanged", current, diagnostics);
    }
    const revision = repository.replaceTopicGraphApplicationState({
      expectedManifestHash,
      manifestHash,
      state: toRecords(snapshot),
      now: now(),
    });
    if (revision === null) return emptyResult("basis_mismatch", state());
    return rebuildSynthesisTopicGraphApplicationMutationResult({
      status: "committed",
      manifestHash,
      revision,
      changedNodeIds: [...new Set(changedNodeIds)].sort(),
      changedEdgeIds: [...new Set(changedEdgeIds)].sort(),
      reviewIds: [...new Set(reviewIds)].sort(),
      diagnostics,
    });
  };

  const replaceSnapshot = async (input: unknown) => {
    const request = rebuildSynthesisTopicGraphApplicationReplaceRequest(input);
    return runMutation(
      async () =>
        commit(
          request.expectedManifestHash,
          request.snapshot,
          request.snapshot.nodes.map((row) => row.topicId),
          request.snapshot.edges.map((row) => row.edgeId),
          request.snapshot.reviewItems.map((row) => row.reviewId),
        ),
      emptyResult("topic_graph_busy", state()),
      emptyResult("stopping", state()),
    );
  };
  const upsert = async (input: unknown) => {
    const request = rebuildSynthesisTopicGraphApplicationUpsertRequest(input);
    return runMutation(
      async () => {
        const current = state();
        if ((current?.manifestHash ?? null) !== request.expectedManifestHash) {
          return emptyResult("basis_mismatch", current);
        }
        const snapshot = current ? fromRecords(repository) : emptySnapshot();
        const nodes = new Map(snapshot.nodes.map((row) => [row.topicId, row]));
        const edges = new Map(snapshot.edges.map((row) => [row.edgeId, row]));
        for (const row of request.nodes) nodes.set(row.topicId, row);
        for (const row of request.edges) {
          const tuple = canonicalizeSynthesisTopicGraphEdgeTuple(row);
          const normalized = {
            ...row,
            ...tuple,
            edgeId: synthesisTopicGraphEdgeId(tuple),
          };
          edges.set(normalized.edgeId, normalized);
        }
        snapshot.nodes = [...nodes.values()];
        snapshot.edges = [...edges.values()];
        return commit(
          request.expectedManifestHash,
          snapshot,
          request.nodes.map((row) => row.topicId),
          request.edges.map((row) => synthesisTopicGraphEdgeId(row)),
        );
      },
      emptyResult("topic_graph_busy", state()),
      emptyResult("stopping", state()),
    );
  };
  const upsertMaterializedTopic = async (input: unknown) => {
    const request =
      rebuildSynthesisTopicGraphApplicationMaterializedTopicRequest(input);
    return runMutation(
      async () => {
        const current = state();
        if ((current?.manifestHash ?? null) !== request.expectedManifestHash) {
          return emptyResult("basis_mismatch", current);
        }
        const snapshot = current ? fromRecords(repository) : emptySnapshot();
        const previous = snapshot.nodes.find(
          (row) => row.topicId === request.topicId,
        );
        const timestamp = now();
        const topicNode: SynthesisTopicGraphApplicationNode = {
          topicId: request.topicId,
          title: request.title,
          ...(request.definition ? { definition: request.definition } : {}),
          aliases: request.aliases,
          nodeType: "materialized",
          definitionStatus: "has_synthesis",
          ...(request.currentArtifactPath
            ? { currentArtifactPath: request.currentArtifactPath }
            : {}),
          isRoot: request.isRoot,
          level: request.level,
          paperCount: request.paperCount,
          lastSynthesisAt: request.lastSynthesisAt || timestamp,
          createdAt: previous?.createdAt || timestamp,
          updatedAt: timestamp,
        };
        snapshot.nodes = [
          ...snapshot.nodes.filter((row) => row.topicId !== topicNode.topicId),
          topicNode,
        ];
        return commit(request.expectedManifestHash, snapshot, [
          topicNode.topicId,
        ]);
      },
      emptyResult("topic_graph_busy", state()),
      emptyResult("stopping", state()),
    );
  };
  const ingestProposals = async (input: unknown) => {
    const request = rebuildSynthesisTopicGraphApplicationIngestRequest(input);
    return runMutation(
      async () => {
        const current = state();
        if ((current?.manifestHash ?? null) !== request.expectedManifestHash) {
          return emptyResult("basis_mismatch", current);
        }
        const snapshot = current ? fromRecords(repository) : emptySnapshot();
        const nodes = new Map(snapshot.nodes.map((row) => [row.topicId, row]));
        const edges = new Map(snapshot.edges.map((row) => [row.edgeId, row]));
        const reviews = new Map(
          snapshot.reviewItems.map((row) => [row.reviewId, row]),
        );
        const diagnostics: SynthesisTopicGraphApplicationDiagnostic[] = [];
        const changedNodeIds: string[] = [];
        const changedEdgeIds: string[] = [];
        const reviewIds: string[] = [];
        const timestamp = now();
        for (const proposal of request.proposals) {
          const relation = synthesisTopicGraphRelationForProposal(
            proposal.type,
          );
          if (!nodes.has(proposal.targetTopicId)) {
            diagnostics.push({
              code: "unknown_target_topic",
              severity: "warning",
            });
            continue;
          }
          if (proposal.targetTopicId === request.sourceTopicId) {
            diagnostics.push({
              code: "self_edge_rejected",
              severity: "warning",
            });
            continue;
          }
          if (!nodes.has(request.sourceTopicId)) {
            nodes.set(request.sourceTopicId, {
              topicId: request.sourceTopicId,
              title: request.sourceTopicId,
              aliases: [],
              nodeType: "placeholder",
              definitionStatus: "placeholder",
              isRoot: false,
              level: "normal",
              paperCount: 0,
              createdAt: timestamp,
              updatedAt: timestamp,
            });
            changedNodeIds.push(request.sourceTopicId);
          }
          const tuple = synthesisTopicGraphTupleForProposal({
            sourceTopicId: request.sourceTopicId,
            proposal,
          });
          if (
            relation === "broader_than" &&
            hasSynthesisTopicGraphBroaderPath(
              [...edges.values()],
              tuple.targetTopicId,
              tuple.sourceTopicId,
            )
          ) {
            diagnostics.push({
              code: "broader_cycle_rejected",
              severity: "warning",
            });
            continue;
          }
          const edgeId = synthesisTopicGraphEdgeId(tuple);
          const previous = edges.get(edgeId);
          if (
            previous?.status === "confirmed" ||
            previous?.status === "rejected"
          ) {
            diagnostics.push({
              code: "user_decision_preserved",
              severity: "warning",
            });
            continue;
          }
          if (proposal.confidence !== undefined && proposal.confidence < 0.5) {
            const reviewId = synthesisTopicGraphReviewId(tuple);
            const previousReview = reviews.get(reviewId);
            const review: SynthesisTopicGraphApplicationReviewItem = {
              reviewId,
              status: previousReview?.status || "open",
              sourceTopicId: tuple.sourceTopicId,
              targetTopicId: tuple.targetTopicId,
              ...(proposal.targetTitle
                ? { targetTitle: proposal.targetTitle }
                : {}),
              relation,
              confidence: proposal.confidence,
              provenance: mergeJson(
                previousReview?.provenance || [],
                proposal.provenance,
              ),
              evidenceRefs: mergeJson(
                previousReview?.evidenceRefs || [],
                proposal.evidenceRefs,
              ),
              createdAt: previousReview?.createdAt || timestamp,
              updatedAt: timestamp,
              ...(previousReview?.resolvedAt
                ? { resolvedAt: previousReview.resolvedAt }
                : {}),
            };
            reviews.set(reviewId, review);
            if (review.status === "open") reviewIds.push(reviewId);
            diagnostics.push({
              code: "low_confidence_relation_review",
              severity: "warning",
            });
            continue;
          }
          const edge: SynthesisTopicGraphApplicationEdge = {
            edgeId,
            ...tuple,
            status: "suggested",
            ...(proposal.confidence === undefined
              ? previous?.confidence === undefined
                ? {}
                : { confidence: previous.confidence }
              : { confidence: proposal.confidence }),
            provenance: mergeJson(
              previous?.provenance || [],
              proposal.provenance,
            ),
            evidenceRefs: mergeJson(
              previous?.evidenceRefs || [],
              proposal.evidenceRefs,
            ),
            createdAt: previous?.createdAt || timestamp,
            updatedAt: timestamp,
          };
          edges.set(edgeId, edge);
          changedEdgeIds.push(edgeId);
        }
        snapshot.nodes = [...nodes.values()];
        snapshot.edges = [...edges.values()];
        snapshot.reviewItems = [...reviews.values()];
        if (
          !changedNodeIds.length &&
          !changedEdgeIds.length &&
          !reviewIds.length
        ) {
          return emptyResult("unchanged", current, diagnostics);
        }
        return commit(
          request.expectedManifestHash,
          snapshot,
          changedNodeIds,
          changedEdgeIds,
          reviewIds,
          diagnostics,
        );
      },
      emptyResult("topic_graph_busy", state()),
      emptyResult("stopping", state()),
    );
  };
  const decideRelation = async (input: unknown) => {
    const request =
      rebuildSynthesisTopicGraphApplicationRelationDecisionRequest(input);
    return runMutation(
      async () => {
        const current = state();
        if ((current?.manifestHash ?? null) !== request.expectedManifestHash) {
          return emptyResult("basis_mismatch", current);
        }
        if (!current) return emptyResult("not_found", current);
        const snapshot = fromRecords(repository);
        const edge = snapshot.edges.find(
          (row) => row.edgeId === request.edgeId,
        );
        if (!edge || edge.status !== "suggested") {
          return emptyResult("not_found", current);
        }
        edge.status = request.status;
        edge.updatedAt = now();
        return commit(
          request.expectedManifestHash,
          snapshot,
          [],
          [edge.edgeId],
        );
      },
      emptyResult("topic_graph_busy", state()),
      emptyResult("stopping", state()),
    );
  };
  const review = async (input: unknown) => {
    const request = rebuildSynthesisTopicGraphApplicationReviewRequest(input);
    return runMutation(
      async () => {
        const current = state();
        if ((current?.manifestHash ?? null) !== request.expectedManifestHash) {
          return emptyResult("basis_mismatch", current);
        }
        if (!current) return emptyResult("not_found", current);
        const snapshot = fromRecords(repository);
        const review = snapshot.reviewItems.find(
          (row) => row.reviewId === request.reviewId && row.status === "open",
        );
        if (!review) return emptyResult("not_found", current);
        const timestamp = now();
        const changedEdges: string[] = [];
        if (request.action === "approve_suggested") {
          const tuple = canonicalizeSynthesisTopicGraphEdgeTuple(review);
          const edgeId = synthesisTopicGraphEdgeId(tuple);
          const previous = snapshot.edges.find((row) => row.edgeId === edgeId);
          if (
            previous?.status === "confirmed" ||
            previous?.status === "rejected"
          ) {
            return emptyResult("unchanged", current, [
              { code: "user_decision_preserved", severity: "warning" },
            ]);
          }
          const edge: SynthesisTopicGraphApplicationEdge = {
            edgeId,
            ...tuple,
            status: "suggested",
            ...(review.confidence === undefined
              ? {}
              : { confidence: review.confidence }),
            provenance: mergeJson(
              previous?.provenance || [],
              review.provenance,
            ),
            evidenceRefs: mergeJson(
              previous?.evidenceRefs || [],
              review.evidenceRefs,
            ),
            createdAt: previous?.createdAt || timestamp,
            updatedAt: timestamp,
          };
          snapshot.edges = [
            ...snapshot.edges.filter((row) => row.edgeId !== edgeId),
            edge,
          ];
          changedEdges.push(edgeId);
          review.status = "approved";
        } else {
          review.status = "rejected";
        }
        review.updatedAt = timestamp;
        review.resolvedAt = timestamp;
        return commit(
          request.expectedManifestHash,
          snapshot,
          [],
          changedEdges,
          [review.reviewId],
        );
      },
      emptyResult("topic_graph_busy", state()),
      emptyResult("stopping", state()),
    );
  };
  const markTopicRelationsDeleted = async (input: unknown) => {
    const request =
      rebuildSynthesisTopicGraphApplicationMarkDeletedRequest(input);
    return runMutation(
      async () => {
        const current = state();
        if ((current?.manifestHash ?? null) !== request.expectedManifestHash) {
          return emptyResult("basis_mismatch", current);
        }
        if (!current) return emptyResult("not_found", current);
        const snapshot = fromRecords(repository);
        const timestamp = now();
        const changedEdges: string[] = [];
        const reviews: string[] = [];
        for (const edge of snapshot.edges) {
          if (
            edge.sourceTopicId === request.topicId ||
            edge.targetTopicId === request.topicId
          ) {
            if (edge.status !== "deleted") changedEdges.push(edge.edgeId);
            edge.status = "deleted";
            edge.updatedAt = timestamp;
          }
        }
        for (const item of snapshot.reviewItems) {
          if (
            item.sourceTopicId === request.topicId ||
            item.targetTopicId === request.topicId
          ) {
            if (item.status !== "deleted") reviews.push(item.reviewId);
            item.status = "deleted";
            item.updatedAt = timestamp;
            item.resolvedAt ||= timestamp;
          }
        }
        if (!changedEdges.length && !reviews.length) {
          return emptyResult("unchanged", current);
        }
        return commit(
          request.expectedManifestHash,
          snapshot,
          [],
          changedEdges,
          reviews,
        );
      },
      emptyResult("topic_graph_busy", state()),
      emptyResult("stopping", state()),
    );
  };
  const purgeDeletedTopicRelations = async (input: unknown) => {
    const request = rebuildSynthesisTopicGraphApplicationPurgeRequest(input);
    return runMutation(
      async () => {
        const current = state();
        if ((current?.manifestHash ?? null) !== request.expectedManifestHash) {
          return emptyResult("basis_mismatch", current);
        }
        if (!current) return emptyResult("not_found", current);
        const snapshot = fromRecords(repository);
        const ids = new Set(request.topicIds);
        const changedNodes = snapshot.nodes
          .filter(
            (row) => ids.has(row.topicId) && row.definitionStatus === "deleted",
          )
          .map((row) => row.topicId);
        const changedEdges = snapshot.edges
          .filter(
            (row) => ids.has(row.sourceTopicId) || ids.has(row.targetTopicId),
          )
          .map((row) => row.edgeId);
        const reviews = snapshot.reviewItems
          .filter(
            (row) => ids.has(row.sourceTopicId) || ids.has(row.targetTopicId),
          )
          .map((row) => row.reviewId);
        snapshot.nodes = snapshot.nodes.filter(
          (row) => !ids.has(row.topicId) || row.definitionStatus !== "deleted",
        );
        snapshot.edges = snapshot.edges.filter(
          (row) => !ids.has(row.sourceTopicId) && !ids.has(row.targetTopicId),
        );
        snapshot.reviewItems = snapshot.reviewItems.filter(
          (row) => !ids.has(row.sourceTopicId) && !ids.has(row.targetTopicId),
        );
        if (!changedNodes.length && !changedEdges.length && !reviews.length) {
          return emptyResult("unchanged", current);
        }
        return commit(
          request.expectedManifestHash,
          snapshot,
          changedNodes,
          changedEdges,
          reviews,
        );
      },
      emptyResult("topic_graph_busy", state()),
      emptyResult("stopping", state()),
    );
  };
  const rebuildIndex = async (input: unknown) => {
    const request =
      rebuildSynthesisTopicGraphApplicationRebuildIndexRequest(input);
    return runMutation(
      async (signal) => {
        const current = state();
        if (!current || current.manifestHash !== request.expectedManifestHash) {
          return emptyResult("basis_mismatch", current);
        }
        const indexRequest: SynthesisTopicGraphIndexRequest = {
          contractVersion: SYNTHESIS_TOPIC_GRAPH_INDEX_CONTRACT_VERSION,
          algorithmVersion: SYNTHESIS_TOPIC_GRAPH_INDEX_ALGORITHM_VERSION,
          sourceManifestHash: current.manifestHash,
          rebuiltAt: now(),
          ...engineSource(fromRecords(repository)),
        };
        try {
          const result = rebuildSynthesisTopicGraphIndexResult(
            await compute.buildIndex(indexRequest, { signal }),
            indexRequest,
          );
          const promoted = repository.promoteTopicGraphIndex({
            expectedManifestHash: current.manifestHash,
            indexHash: hashSynthesisEngineCanonicalJson(result),
            indexJson: canonicalizeSynthesisEngineJson(result),
            now: now(),
          });
          return promoted
            ? rebuildSynthesisTopicGraphApplicationMutationResult({
                status: "committed",
                manifestHash: current.manifestHash,
                revision: current.revision,
                changedNodeIds: [],
                changedEdgeIds: [],
                reviewIds: [],
                diagnostics: [],
              })
            : emptyResult("basis_mismatch", state());
        } catch (error) {
          const code =
            error && typeof error === "object" && "code" in error
              ? String((error as { code: unknown }).code)
              : "";
          return emptyResult(
            code === "worker_canceled" ? "stopping" : "worker_failed",
            state(),
          );
        }
      },
      emptyResult("topic_graph_busy", state()),
      emptyResult("stopping", state()),
    );
  };
  const stopAdmission = () => {
    stopping = true;
    active?.controller.abort();
  };
  const shutdown = async () => {
    stopAdmission();
    if (active) await Promise.allSettled([active.promise]);
  };

  return {
    inspect,
    load,
    replaceSnapshot,
    upsert,
    upsertMaterializedTopic,
    ingestProposals,
    decideRelation,
    review,
    markTopicRelationsDeleted,
    purgeDeletedTopicRelations,
    rebuildIndex,
    readIndex,
    stopAdmission,
    shutdown,
  };
}
