export type SynthesisMcpService = {
  listTopics?: (args: Record<string, unknown>) => unknown | Promise<unknown>;
  getTopicContext?: (args: Record<string, unknown>) => unknown | Promise<unknown>;
  getSchemas?: (args: Record<string, unknown>) => unknown | Promise<unknown>;
  getLibraryIndex?: (args: Record<string, unknown>) => unknown | Promise<unknown>;
  resolveResolver?: (args: Record<string, unknown>) => unknown | Promise<unknown>;
  getReferenceSidecarIndex?: (
    args: Record<string, unknown>,
  ) => unknown | Promise<unknown>;
  queryCitationGraph?: (args: Record<string, unknown>) => unknown | Promise<unknown>;
  getCitationGraphSlice?: (
    args: Record<string, unknown>,
  ) => unknown | Promise<unknown>;
  getCitationGraphMetrics?: (
    args: Record<string, unknown>,
  ) => unknown | Promise<unknown>;
  getPaperArtifactManifest?: (
    args: Record<string, unknown>,
  ) => unknown | Promise<unknown>;
  readPaperArtifacts?: (args: Record<string, unknown>) => unknown | Promise<unknown>;
  exportFilteredPaperArtifacts?: (
    args: Record<string, unknown>,
  ) => unknown | Promise<unknown>;
  resolveTopicPaperDigest?: (
    args: Record<string, unknown>,
  ) => unknown | Promise<unknown>;
  getReviewInput?: (args: Record<string, unknown>) => unknown | Promise<unknown>;
};

export type SynthesisMcpServiceMethod = keyof SynthesisMcpService;
