import type { HostBridgeConnectionMode } from "../hostBridgeProtocol";

export type SynthesisMcpServiceContext = {
  hostBridge?: {
    connectionMode?: HostBridgeConnectionMode;
  };
};

type SynthesisMcpServiceMethodHandler = (
  args: Record<string, unknown>,
  context?: SynthesisMcpServiceContext,
) => unknown | Promise<unknown>;

export type SynthesisMcpService = {
  listTopics?: (args: Record<string, unknown>) => unknown | Promise<unknown>;
  findTopicsByPaperRef?: (
    args: Record<string, unknown>,
  ) => unknown | Promise<unknown>;
  getTopicContext?: SynthesisMcpServiceMethodHandler;
  getTopicReport?: (
    args: Record<string, unknown>,
  ) => unknown | Promise<unknown>;
  getSchemas?: (args: Record<string, unknown>) => unknown | Promise<unknown>;
  queryConceptKb?: (
    args: Record<string, unknown>,
  ) => unknown | Promise<unknown>;
  queryCitationGraphCluster?: (
    args: Record<string, unknown>,
  ) => unknown | Promise<unknown>;
  getLibraryIndex?: (
    args: Record<string, unknown>,
  ) => unknown | Promise<unknown>;
  resolveResolver?: (
    args: Record<string, unknown>,
  ) => unknown | Promise<unknown>;
  getReferenceSidecarIndex?: (
    args: Record<string, unknown>,
  ) => unknown | Promise<unknown>;
  queryCitationGraph?: (
    args: Record<string, unknown>,
  ) => unknown | Promise<unknown>;
  getCitationGraphSlice?: (
    args: Record<string, unknown>,
  ) => unknown | Promise<unknown>;
  getCitationGraphLayout?: (
    args: Record<string, unknown>,
  ) => unknown | Promise<unknown>;
  getCitationGraphMetrics?: (
    args: Record<string, unknown>,
  ) => unknown | Promise<unknown>;
  rankExternalReferences?: (
    args: Record<string, unknown>,
  ) => unknown | Promise<unknown>;
  rankLibraryPapers?: (
    args: Record<string, unknown>,
  ) => unknown | Promise<unknown>;
  getAttentionQueue?: (
    args: Record<string, unknown>,
  ) => unknown | Promise<unknown>;
  refreshCitationGraphMetricsNow?: (
    args: Record<string, unknown>,
  ) => unknown | Promise<unknown>;
  getPaperArtifactManifest?: (
    args: Record<string, unknown>,
  ) => unknown | Promise<unknown>;
  readPaperArtifacts?: (
    args: Record<string, unknown>,
  ) => unknown | Promise<unknown>;
  exportFilteredPaperArtifacts?: SynthesisMcpServiceMethodHandler;
  resolveTopicPaperDigest?: (
    args: Record<string, unknown>,
  ) => unknown | Promise<unknown>;
  getReviewInput?: (
    args: Record<string, unknown>,
  ) => unknown | Promise<unknown>;
};

export type SynthesisMcpServiceMethod = keyof SynthesisMcpService;
