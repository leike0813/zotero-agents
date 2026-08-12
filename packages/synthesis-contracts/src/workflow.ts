import type { SynthesisDeliveryContext } from "./common";
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
import type {
  LiteratureQualitySnapshot,
  SynthesisPaperArtifactType,
} from "./literatureArtifacts.js";
import type { SynthesisTopicApplicationApplyResult } from "./topicApplication";
import {
  rebuildSynthesisProtocolCapabilityDto,
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

export type SynthesisPaperArtifactRow = {
  paper_ref: string;
  artifact_type: SynthesisPaperArtifactType;
  payload_type: string;
  status: "available" | "missing" | "invalid" | "unavailable";
  payload_hash?: string;
  payload?: import("./common.js").SynthesisOpaqueCanonicalJson;
  markdown?: string;
  decoded_text?: string;
  literature_quality?: LiteratureQualitySnapshot;
  payload_types_seen: string[];
  diagnostics: string[];
};

export type SynthesisPaperArtifactsResult = {
  artifacts: SynthesisPaperArtifactRow[];
  diagnostics: string[];
  total?: number;
};

export type SynthesisArtifactQueryRequest = {
  paper_refs?: string[];
  artifact_types?: SynthesisPaperArtifactType[];
  run_root?: string;
};

export type SynthesisArtifactDeliveryDescriptor = {
  fileId: string;
  sourceKind: "bridge-export";
  displayName: string;
  contentType: "application/zip";
  size: number;
  sha256: string;
  createdAt: string;
  expiresAt: string;
  owner: {
    capability: "topics.get_context" | "paper_artifacts.export_filtered";
  };
};

export type SynthesisArtifactQueryResult = SynthesisPaperArtifactsResult;

export type SynthesisArtifactExportResult = {
  paper_refs: string[];
  paper_ref?: string;
  manifest_file: string;
  artifact_statuses: Array<{
    paper_ref: string;
    artifact_type: string;
    payload_type: string;
    status: string;
    missing_reason: string;
  }>;
  diagnostics: string[];
  delivery?: SynthesisArtifactDeliveryDescriptor;
};

type SynthesisArtifactCapabilityResultMap = {
  "client.getPaperArtifactManifest": SynthesisArtifactQueryResult;
  "client.readPaperArtifacts": SynthesisPaperArtifactsResult;
  "client.exportFilteredPaperArtifacts": SynthesisArtifactExportResult;
};

export function rebuildSynthesisArtifactCapabilityResult<
  Capability extends keyof SynthesisArtifactCapabilityResultMap,
>(
  capability: Capability,
  value: unknown,
): SynthesisArtifactCapabilityResultMap[Capability] {
  return rebuildSynthesisProtocolCapabilityDto({
    capability,
    direction: "result",
    value,
  });
}

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
  ): Promise<SynthesisArtifactExportResult>;
  resolveTopicPaperDigest(
    request: SynthesisWorkbenchPaperDigestReadRequest,
  ): Promise<SynthesisWorkbenchPaperDigestResult>;
}
