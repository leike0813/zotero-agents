import type { SynthesisDeliveryContext, SynthesisJsonObject } from "./common";
import type {
  SynthesisCitationAnalysisArtifact,
  SynthesisDigestArtifact,
  SynthesisLiteratureMatchingMetadata,
  SynthesisLiteratureScore,
  SynthesisMatchedReference,
  SynthesisReferencesArtifact,
  SynthesisTopicMetadata,
  SynthesisTopicResultBundle,
  SynthesisWorkflowSource,
} from "./topicDomain";
import type { SynthesisTopicApplicationApplyResult } from "./topicApplication";
import {
  rebuildSynthesisProtocolDto,
  SYNTHESIS_TOPIC_WORKBENCH_SCHEMA_ID,
} from "./protocolSchema";
import type {
  SynthesisWorkbenchPaperDigestReadRequest,
  SynthesisWorkbenchPaperDigestResult,
} from "./workbench";

export type SynthesisWorkflowItemSnapshot = {
  libraryId: number;
  itemKey: string;
  paperRef: string;
  itemType: string;
  title: string;
  year: string;
  date: string;
  creators: string[];
  tags: string[];
  collections: string[];
  doi: string;
  arxiv: string;
  isbn: string;
  url: string;
  citekey: string;
  dateAdded: string;
};

export type SynthesisLiteratureDigestApplyRequest =
  SynthesisWorkflowItemSnapshot & {
    digest?: SynthesisDigestArtifact;
    references?: SynthesisReferencesArtifact;
    citationAnalysis?: SynthesisCitationAnalysisArtifact;
    literatureScore?: SynthesisLiteratureScore;
    literatureMatchingMetadata?: SynthesisLiteratureMatchingMetadata;
    matchedReferences?: SynthesisMatchedReference[];
    source?: SynthesisWorkflowSource;
  };

export type SynthesisMaterializedAsset = {
  id: string;
  mediaType: "application/json" | "text/markdown" | "text/plain";
  text: string;
};

export type SynthesisTopicApplyRequest = {
  bundle: SynthesisTopicResultBundle;
  assets: SynthesisMaterializedAsset[];
};

export type SynthesisTopicApplyResult = SynthesisTopicApplicationApplyResult;

export type SynthesisLiteratureDigestApplyResult = {
  ok: boolean;
  status: "sidecar_applied";
  sourceRef: string;
  source_ref: string;
  paperRef: string;
  reference_count: number;
  input_reference_count: number;
  rejected_reference_count: number;
  warning_reference_count: number;
  matched_count: number;
  decision_count: number;
  stale_canonical_governance: {
    affected: number;
    autoRedirected: number;
    autoStaled: number;
    proposalsCreated: number;
    blocked: number;
  };
  operationId: string;
  idempotent: boolean;
};

export function rebuildSynthesisLiteratureDigestApplyRequest(
  value: unknown,
): SynthesisLiteratureDigestApplyRequest {
  return rebuildSynthesisProtocolDto({
    schemaId: SYNTHESIS_TOPIC_WORKBENCH_SCHEMA_ID,
    definition: "LiteratureDigestPayload",
    value,
    direction: "request",
  });
}

export function rebuildSynthesisLiteratureDigestApplyResult(
  value: unknown,
): SynthesisLiteratureDigestApplyResult {
  return rebuildSynthesisProtocolDto({
    schemaId: SYNTHESIS_TOPIC_WORKBENCH_SCHEMA_ID,
    definition: "ApplyLiteratureDigestSidecarResult",
    value,
    direction: "result",
  });
}

export function rebuildSynthesisTopicApplyRequest(
  value: unknown,
): SynthesisTopicApplyRequest {
  return rebuildSynthesisProtocolDto({
    schemaId: SYNTHESIS_TOPIC_WORKBENCH_SCHEMA_ID,
    definition: "TopicApplyPayload",
    value,
    direction: "request",
  });
}

export function rebuildSynthesisTopicApplyResult(
  value: unknown,
): SynthesisTopicApplyResult {
  return rebuildSynthesisProtocolDto({
    schemaId: SYNTHESIS_TOPIC_WORKBENCH_SCHEMA_ID,
    definition: "ApplyTopicSynthesisResultResult",
    value,
    direction: "result",
  });
}

export interface SynthesisWorkflowApplyClient {
  applyLiteratureDigestSidecar(
    request: SynthesisLiteratureDigestApplyRequest,
  ): Promise<SynthesisLiteratureDigestApplyResult>;
  applyTopicSynthesisResult(
    request: SynthesisTopicApplyRequest,
  ): Promise<SynthesisTopicApplyResult>;
}

export type SynthesisTopicReportRequest = {
  topicId: string;
};

export type SynthesisTopicReportResult = {
  ok: boolean;
  status: "available" | "not_found";
  topic_id: string;
  title?: string;
  format: "markdown";
  markdown: string;
  source?: SynthesisWorkflowSource;
  metadata?: SynthesisTopicMetadata;
  diagnostics: string[];
};

export function rebuildSynthesisTopicReportResult(
  value: unknown,
): SynthesisTopicReportResult {
  return rebuildSynthesisProtocolDto({
    schemaId: SYNTHESIS_TOPIC_WORKBENCH_SCHEMA_ID,
    definition: "GetTopicReportResult",
    value,
    direction: "result",
  });
}

export type SynthesisPaperArtifactsRequest = {
  paper_refs: string[];
  artifact_types?: string[];
};

export type SynthesisPaperArtifactsResult = SynthesisJsonObject & {
  artifacts: SynthesisJsonObject[];
  diagnostics: string[];
  total: number;
};

export type SynthesisArtifactQueryRequest = SynthesisJsonObject;
export type SynthesisArtifactQueryResult = SynthesisJsonObject;

export interface SynthesisArtifactsClient {
  getManifest(
    request?: SynthesisArtifactQueryRequest,
  ): Promise<SynthesisArtifactQueryResult>;
  readPaperArtifacts(
    request: SynthesisPaperArtifactsRequest,
  ): Promise<SynthesisPaperArtifactsResult>;
  exportFiltered(
    request: SynthesisArtifactQueryRequest,
    delivery?: SynthesisDeliveryContext,
  ): Promise<SynthesisArtifactQueryResult>;
  resolveTopicPaperDigest(
    request: SynthesisWorkbenchPaperDigestReadRequest,
  ): Promise<SynthesisWorkbenchPaperDigestResult>;
}
