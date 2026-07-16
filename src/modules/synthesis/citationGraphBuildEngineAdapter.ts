import {
  SYNTHESIS_CITATION_GRAPH_BUILD_CONTRACT_VERSION,
  rebuildSynthesisCitationGraphBuildRequest,
  rebuildSynthesisCitationGraphBuildResult,
  type SynthesisCitationGraphBuildEngine,
  type SynthesisCitationGraphBuildResult,
  type SynthesisCitationGraphBuildTargetKind,
} from "../../../packages/synthesis-engine/src/citationGraphBuild";
import type {
  SynthesisCitationEdgeRecord,
  SynthesisCitationIncomingGroupRecord,
  SynthesisCitationLightMetricsRecord,
  SynthesisCitationNodeRecord,
  SynthesisCitationSourceOwnershipRecord,
} from "./repository";

export type SynthesisProductionCitationGraphNodeInput = {
  literatureItemId: string;
  title: string;
  year?: string;
  authors: string[];
};

export type SynthesisProductionCitationGraphReferenceInput = {
  edgeId: string;
  referenceInstanceId: string;
  sourceLiteratureItemId: string;
  targetLiteratureItemId: string;
  targetKind: SynthesisCitationGraphBuildTargetKind;
  targetTitle?: string;
  targetYear?: string;
  targetAuthors: string[];
  resolutionId: string;
  roles: string[];
  rolesJson: string;
  weight: number;
  createdAt: string;
};

export type SynthesisProductionCitationGraphBuildInput = {
  scope: "full" | "source_slice";
  sourceLiteratureItemIds: string[];
  libraryNodes: SynthesisProductionCitationGraphNodeInput[];
  references: SynthesisProductionCitationGraphReferenceInput[];
};

export type SynthesisProductionCitationGraphRecords = {
  nodes: Map<string, SynthesisCitationNodeRecord>;
  edges: SynthesisCitationEdgeRecord[];
  lightweightMetrics: SynthesisCitationLightMetricsRecord[];
  sourceOwnership: SynthesisCitationSourceOwnershipRecord[];
  incomingGroups: SynthesisCitationIncomingGroupRecord[];
};

function optionalText(value: string | undefined) {
  const normalized = String(value || "").trim();
  return normalized || undefined;
}

export function buildProductionCitationGraphEngineRequest(
  input: SynthesisProductionCitationGraphBuildInput,
) {
  return rebuildSynthesisCitationGraphBuildRequest({
    contractVersion: SYNTHESIS_CITATION_GRAPH_BUILD_CONTRACT_VERSION,
    scope: {
      kind: input.scope,
      sourceIds: input.sourceLiteratureItemIds,
    },
    rolePriority: [],
    libraryNodes: input.libraryNodes.map((node) => ({
      nodeId: node.literatureItemId,
      ...(optionalText(node.title) ? { title: optionalText(node.title) } : {}),
      ...(optionalText(node.year) ? { year: optionalText(node.year) } : {}),
      authors: node.authors.map((entry) => entry.trim()).filter(Boolean),
      aliases: [],
    })),
    references: input.references.map((reference) => ({
      referenceId: reference.referenceInstanceId,
      edgeId: reference.edgeId,
      sourceId: reference.sourceLiteratureItemId,
      targetId: reference.targetLiteratureItemId,
      targetKind: reference.targetKind,
      ...(optionalText(reference.targetTitle)
        ? { targetTitle: optionalText(reference.targetTitle) }
        : {}),
      ...(optionalText(reference.targetYear)
        ? { targetYear: optionalText(reference.targetYear) }
        : {}),
      targetAuthors: reference.targetAuthors
        .map((entry) => entry.trim())
        .filter(Boolean),
      targetAliases: [],
      roles: reference.roles.map((entry) => entry.trim()).filter(Boolean),
      weight: reference.weight,
    })),
  });
}

export function projectProductionCitationGraphEngineResult(args: {
  input: SynthesisProductionCitationGraphBuildInput;
  result: SynthesisCitationGraphBuildResult;
  timestamp: string;
}): SynthesisProductionCitationGraphRecords {
  const request = buildProductionCitationGraphEngineRequest(args.input);
  const result = rebuildSynthesisCitationGraphBuildResult(args.result, request);
  const inputByEdgeId = new Map(
    args.input.references.map((reference) => [reference.edgeId, reference]),
  );
  const resolvedByEdgeId = new Map(
    result.resolvedEdges.map((edge) => [edge.edgeId, edge]),
  );
  const nodes = new Map<string, SynthesisCitationNodeRecord>();
  for (const node of result.nodes) {
    nodes.set(node.nodeId, {
      literatureItemId: node.nodeId,
      nodeStatus: "active",
      hasZoteroBinding: node.kind === "library_paper",
      title: node.title || node.nodeId,
      year: node.year,
      authorsJson: JSON.stringify(node.authors),
      summaryJson: JSON.stringify(
        node.kind === "library_paper"
          ? {
              source_ref: node.nodeId,
              cache_owner: "reference_sidecar",
            }
          : {
              canonical_reference_id: node.nodeId,
              cache_owner: "reference_sidecar",
            },
      ),
      updatedAt: args.timestamp,
    });
  }
  const edges = args.input.references.map(
    (input): SynthesisCitationEdgeRecord => {
      const edge = resolvedByEdgeId.get(input.edgeId);
      if (!edge || !inputByEdgeId.has(edge.edgeId)) {
        throw new Error("citation_graph_build_result_missing_input_edge");
      }
      return {
        edgeId: edge.edgeId,
        sourceLiteratureItemId: edge.sourceId,
        targetLiteratureItemId: edge.targetId,
        referenceInstanceId: edge.referenceId,
        resolutionId: input.resolutionId,
        edgeStatus: edge.status,
        rolesJson: input.rolesJson || JSON.stringify(edge.roles),
        weight: edge.weight,
        createdAt: input.createdAt || args.timestamp,
        updatedAt: args.timestamp,
      };
    },
  );
  const sourceOwnership = edges.map(
    (edge): SynthesisCitationSourceOwnershipRecord => ({
      sourceLiteratureItemId: edge.sourceLiteratureItemId,
      edgeId: edge.edgeId,
      referenceInstanceId: edge.referenceInstanceId,
      targetLiteratureItemId: edge.targetLiteratureItemId,
      edgeStatus: edge.edgeStatus,
      updatedAt: args.timestamp,
    }),
  );
  const incomingGroups = edges.map(
    (edge): SynthesisCitationIncomingGroupRecord => ({
      targetLiteratureItemId: edge.targetLiteratureItemId || "",
      sourceLiteratureItemId: edge.sourceLiteratureItemId,
      edgeId: edge.edgeId,
      referenceInstanceId: edge.referenceInstanceId,
      edgeStatus: edge.edgeStatus,
      updatedAt: args.timestamp,
    }),
  );
  const lightweightMetrics = result.lightMetrics.map(
    (metric): SynthesisCitationLightMetricsRecord => ({
      literatureItemId: metric.nodeId,
      outgoingCount: metric.outgoingCount,
      incomingCount: metric.incomingCount,
      localDegree: metric.localDegree,
      matchedOutgoingCount: metric.matchedOutgoingCount,
      unresolvedOutgoingCount: metric.unresolvedOutgoingCount,
      ambiguousOutgoingCount: metric.ambiguousOutgoingCount,
      sourceStructureVersion: Date.parse(args.timestamp) || 0,
      updatedAt: args.timestamp,
    }),
  );
  return {
    nodes,
    edges,
    lightweightMetrics,
    sourceOwnership,
    incomingGroups,
  };
}

export async function buildProductionCitationGraphWithEngine(args: {
  input: SynthesisProductionCitationGraphBuildInput;
  timestamp: string;
  engine: SynthesisCitationGraphBuildEngine;
}) {
  const request = buildProductionCitationGraphEngineRequest(args.input);
  const result = rebuildSynthesisCitationGraphBuildResult(
    await args.engine.compute(request),
    request,
  );
  return {
    request,
    result,
    records: projectProductionCitationGraphEngineResult({
      input: args.input,
      result,
      timestamp: args.timestamp,
    }),
  };
}
