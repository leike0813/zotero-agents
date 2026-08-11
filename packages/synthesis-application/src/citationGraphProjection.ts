import { hashSynthesisEngineCanonicalJson } from "../../synthesis-engine/src/canonicalJson.js";
import {
  rebuildSynthesisCitationGraphBuildResult,
  type SynthesisCitationGraphBuildRequest,
  type SynthesisCitationGraphBuildResult,
  type SynthesisCitationGraphBuildTargetKind,
} from "../../synthesis-engine/src/citationGraphBuild.js";
import type {
  SynthesisCitationEdgeRecord,
  SynthesisCitationGraphStateReplacement,
  SynthesisCitationIncomingGroupRecord,
  SynthesisCitationLightMetricsRecord,
  SynthesisCitationNodeRecord,
  SynthesisCitationSourceOwnershipRecord,
} from "../../synthesis-repository/src/citationGraph.js";

export function hashSynthesisCitationGraphRows(args: {
  nodes: SynthesisCitationNodeRecord[];
  edges: SynthesisCitationEdgeRecord[];
  metrics?: SynthesisCitationLightMetricsRecord[];
}) {
  return hashSynthesisEngineCanonicalJson({
    storage: "sqlite",
    nodes: args.nodes.map((node) => [
      node.literatureItemId,
      node.nodeStatus,
      node.updatedAt || "",
    ]),
    edges: args.edges.map((edge) => [
      edge.edgeId,
      edge.sourceLiteratureItemId,
      edge.targetLiteratureItemId || "",
      edge.edgeStatus,
      edge.updatedAt || "",
    ]),
    metrics: (args.metrics || []).map((metric) => [
      metric.literatureItemId,
      metric.localDegree,
      metric.sourceStructureVersion,
      metric.updatedAt || "",
    ]),
  });
}

export function hashSynthesisCitationLightMetricsRows(
  metrics: SynthesisCitationLightMetricsRecord[],
) {
  return hashSynthesisEngineCanonicalJson({
    storage: "sqlite",
    metrics: metrics.map((metric) => [
      metric.literatureItemId,
      metric.incomingCount,
      metric.outgoingCount,
      metric.matchedOutgoingCount,
      metric.unresolvedOutgoingCount,
      metric.ambiguousOutgoingCount,
      metric.localDegree,
      metric.sourceStructureVersion,
      metric.updatedAt || "",
    ]),
  });
}

export type SynthesisCitationGraphProjectionEdgeMetadata = {
  resolutionId?: string;
  rolesJson?: string;
  createdAt?: string;
};

export type SynthesisCitationGraphProjectedRecords =
  SynthesisCitationGraphStateReplacement & {
    nodes: SynthesisCitationNodeRecord[];
    edges: SynthesisCitationEdgeRecord[];
    sourceOwnership: SynthesisCitationSourceOwnershipRecord[];
    incomingGroups: SynthesisCitationIncomingGroupRecord[];
    lightweightMetrics: SynthesisCitationLightMetricsRecord[];
  };

export function synthesisCitationGraphRecordKind(
  record: SynthesisCitationNodeRecord,
) {
  try {
    const summary = JSON.parse(record.summaryJson || "{}") as {
      kind?: unknown;
    };
    if (
      summary.kind === "external_reference" ||
      summary.kind === "unresolved_reference"
    ) {
      return summary.kind;
    }
  } catch {
    // Repository validation owns corrupt summaries; binding is the safe fallback.
  }
  return record.hasZoteroBinding ? "library_paper" : "external_reference";
}

export function projectSynthesisCitationGraphDefaultRecords(args: {
  nodes: readonly SynthesisCitationNodeRecord[];
  edges: readonly SynthesisCitationEdgeRecord[];
}) {
  const nodeById = new Map(
    args.nodes.map((node) => [node.literatureItemId, node]),
  );
  const librarySourcesByExternal = new Map<string, Set<string>>();
  for (const edge of args.edges) {
    const targetId = edge.targetLiteratureItemId;
    if (!targetId) continue;
    const source = nodeById.get(edge.sourceLiteratureItemId);
    const target = nodeById.get(targetId);
    if (
      !source ||
      !target ||
      synthesisCitationGraphRecordKind(source) !== "library_paper" ||
      synthesisCitationGraphRecordKind(target) === "library_paper"
    ) {
      continue;
    }
    const sourceIds =
      librarySourcesByExternal.get(targetId) || new Set<string>();
    sourceIds.add(source.literatureItemId);
    librarySourcesByExternal.set(targetId, sourceIds);
  }
  const nodes = args.nodes.filter((node) => {
    if (synthesisCitationGraphRecordKind(node) === "library_paper") {
      return true;
    }
    return (
      (librarySourcesByExternal.get(node.literatureItemId)?.size || 0) >= 2
    );
  });
  const visibleIds = new Set(nodes.map((node) => node.literatureItemId));
  const edges = args.edges.filter(
    (edge) =>
      visibleIds.has(edge.sourceLiteratureItemId) &&
      Boolean(
        edge.targetLiteratureItemId &&
        visibleIds.has(edge.targetLiteratureItemId),
      ),
  );
  return { nodes, edges };
}

export function projectSynthesisCitationGraphBuildRecords(args: {
  request: SynthesisCitationGraphBuildRequest;
  result: SynthesisCitationGraphBuildResult;
  timestamp: string;
  edgeMetadata?: ReadonlyMap<
    string,
    SynthesisCitationGraphProjectionEdgeMetadata
  >;
  edgeOrder?: readonly string[];
  nodeSummary?: (record: {
    nodeId: string;
    kind: SynthesisCitationGraphBuildTargetKind;
    aliases: string[];
  }) => Record<string, unknown>;
}): SynthesisCitationGraphProjectedRecords {
  const result = rebuildSynthesisCitationGraphBuildResult(
    args.result,
    args.request,
  );
  const nodes = result.nodes.map(
    (node): SynthesisCitationNodeRecord => ({
      literatureItemId: node.nodeId,
      nodeStatus: "active",
      hasZoteroBinding: node.kind === "library_paper",
      title: node.title || node.nodeId,
      year: node.year,
      authorsJson: JSON.stringify(node.authors),
      summaryJson: JSON.stringify(
        args.nodeSummary?.({
          nodeId: node.nodeId,
          kind: node.kind,
          aliases: node.aliases,
        }) ?? {
          kind: node.kind,
          aliases: node.aliases,
          cache_owner: "citation_graph_application",
        },
      ),
      updatedAt: args.timestamp,
    }),
  );
  const edgeOrder = new Map(
    (args.edgeOrder ?? []).map((edgeId, index) => [edgeId, index]),
  );
  const resolvedEdges = [...result.resolvedEdges].sort(
    (left, right) =>
      (edgeOrder.get(left.edgeId) ?? Number.MAX_SAFE_INTEGER) -
        (edgeOrder.get(right.edgeId) ?? Number.MAX_SAFE_INTEGER) ||
      left.edgeId.localeCompare(right.edgeId),
  );
  const edges = resolvedEdges.map((edge): SynthesisCitationEdgeRecord => {
    const metadata = args.edgeMetadata?.get(edge.edgeId);
    return {
      edgeId: edge.edgeId,
      sourceLiteratureItemId: edge.sourceId,
      targetLiteratureItemId: edge.targetId,
      referenceInstanceId: edge.referenceId,
      resolutionId: metadata?.resolutionId,
      edgeStatus: edge.status,
      rolesJson: metadata?.rolesJson || JSON.stringify(edge.roles),
      weight: edge.weight,
      createdAt: metadata?.createdAt || args.timestamp,
      updatedAt: args.timestamp,
    };
  });
  const orderedOwnership = [...result.sourceOwnership].sort(
    (left, right) =>
      (edgeOrder.get(left.edgeId) ?? Number.MAX_SAFE_INTEGER) -
        (edgeOrder.get(right.edgeId) ?? Number.MAX_SAFE_INTEGER) ||
      left.edgeId.localeCompare(right.edgeId),
  );
  const sourceOwnership = orderedOwnership.map(
    (row): SynthesisCitationSourceOwnershipRecord => ({
      sourceLiteratureItemId: row.sourceId,
      edgeId: row.edgeId,
      referenceInstanceId: row.referenceId,
      targetLiteratureItemId: row.targetId,
      edgeStatus: row.status,
      updatedAt: args.timestamp,
    }),
  );
  const incomingGroups = [...result.incomingGroups]
    .sort(
      (left, right) =>
        (edgeOrder.get(left.edgeId) ?? Number.MAX_SAFE_INTEGER) -
          (edgeOrder.get(right.edgeId) ?? Number.MAX_SAFE_INTEGER) ||
        left.edgeId.localeCompare(right.edgeId),
    )
    .map(
      (row): SynthesisCitationIncomingGroupRecord => ({
        targetLiteratureItemId: row.targetId,
        sourceLiteratureItemId: row.sourceId,
        edgeId: row.edgeId,
        referenceInstanceId: row.referenceId,
        edgeStatus: row.status,
        updatedAt: args.timestamp,
      }),
    );
  const sourceStructureVersion = Date.parse(args.timestamp) || 0;
  const lightweightMetrics = result.lightMetrics.map(
    (row): SynthesisCitationLightMetricsRecord => ({
      literatureItemId: row.nodeId,
      outgoingCount: row.outgoingCount,
      incomingCount: row.incomingCount,
      matchedOutgoingCount: row.matchedOutgoingCount,
      unresolvedOutgoingCount: row.unresolvedOutgoingCount,
      ambiguousOutgoingCount: row.ambiguousOutgoingCount,
      localDegree: row.localDegree,
      sourceStructureVersion,
      updatedAt: args.timestamp,
    }),
  );
  return {
    nodes,
    edges,
    sourceOwnership,
    incomingGroups,
    lightweightMetrics,
  };
}
