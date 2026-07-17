import {
  SYNTHESIS_CITATION_GRAPH_BUILD_CONTRACT_VERSION,
  rebuildSynthesisCitationGraphBuildRequest,
  rebuildSynthesisCitationGraphBuildResult,
  type SynthesisCitationGraphBuildEngine,
  type SynthesisCitationGraphBuildResult,
  type SynthesisCitationGraphBuildTargetKind,
} from "../../../packages/synthesis-engine/src/citationGraphBuild";
import { projectSynthesisCitationGraphBuildRecords } from "../../../packages/synthesis-application/src/citationGraphProjection";
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
  const projected = projectSynthesisCitationGraphBuildRecords({
    request,
    result: args.result,
    timestamp: args.timestamp,
    edgeOrder: args.input.references.map((reference) => reference.edgeId),
    edgeMetadata: new Map(
      args.input.references.map((reference) => [
        reference.edgeId,
        {
          resolutionId: reference.resolutionId,
          rolesJson: reference.rolesJson,
          createdAt: reference.createdAt,
        },
      ]),
    ),
    nodeSummary: (node) =>
      node.kind === "library_paper"
        ? {
            source_ref: node.nodeId,
            cache_owner: "reference_sidecar",
          }
        : {
            canonical_reference_id: node.nodeId,
            cache_owner: "reference_sidecar",
          },
  });
  return {
    nodes: new Map(
      projected.nodes.map((node) => [node.literatureItemId, node]),
    ),
    edges: projected.edges,
    lightweightMetrics: projected.lightweightMetrics,
    sourceOwnership: projected.sourceOwnership,
    incomingGroups: projected.incomingGroups,
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
