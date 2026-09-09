import {
  SYNTHESIS_CITATION_GRAPH_BUILD_CONTRACT_VERSION,
  type SynthesisCitationGraphBuildRequest,
} from "../../packages/synthesis-engine/src/citationGraphBuild";

export const SYNTHESIS_CITATION_GRAPH_BUILD_BENCHMARK_PROFILES = Object.freeze({
  canary: Object.freeze({
    sourceCount: 2,
    referenceCount: 2,
    externalTargetCount: 1,
  }),
  boundary: Object.freeze({
    sourceCount: 2_000,
    referenceCount: 20_000,
    externalTargetCount: 500,
  }),
  normal: Object.freeze({
    sourceCount: 2_000,
    referenceCount: 100_000,
    externalTargetCount: 60_000,
  }),
  target: Object.freeze({
    sourceCount: 10_000,
    referenceCount: 500_000,
    externalTargetCount: 300_000,
  }),
  stress: Object.freeze({
    sourceCount: 25_000,
    referenceCount: 1_250_000,
    externalTargetCount: 750_000,
  }),
});

export type SynthesisCitationGraphBuildBenchmarkProfile =
  keyof typeof SYNTHESIS_CITATION_GRAPH_BUILD_BENCHMARK_PROFILES;

export function createSynthesisCitationGraphBuildBenchmarkRequest(
  profile: SynthesisCitationGraphBuildBenchmarkProfile,
): SynthesisCitationGraphBuildRequest {
  const definition =
    SYNTHESIS_CITATION_GRAPH_BUILD_BENCHMARK_PROFILES[profile];
  return {
    contractVersion: SYNTHESIS_CITATION_GRAPH_BUILD_CONTRACT_VERSION,
    scope: {
      kind: "full",
      sourceIds: Array.from(
        { length: definition.sourceCount },
        (_, index) => `paper:${index}`,
      ),
    },
    rolePriority: ["background", "method"],
    libraryNodes: Array.from(
      { length: definition.sourceCount },
      (_, index) => ({
        nodeId: `paper:${index}`,
        title: `Paper ${index}`,
        authors: [],
        aliases: [],
      }),
    ),
    references: Array.from(
      { length: definition.referenceCount },
      (_, index) => {
        const targetIndex = index % definition.externalTargetCount;
        return {
          referenceId: `reference:${String(index).padStart(8, "0")}`,
          edgeId: `edge:${String(index).padStart(8, "0")}`,
          sourceId: `paper:${index % definition.sourceCount}`,
          targetId: `external:${targetIndex}`,
          targetKind: "external_reference" as const,
          targetTitle: `External ${targetIndex}`,
          targetAuthors: [],
          targetAliases: [],
          roles: index % 2 ? ["background"] : ["method"],
          weight: 1,
        };
      },
    ),
  };
}
