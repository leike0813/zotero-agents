import type {
  SynthesisCitationGraphEdge,
  SynthesisCitationGraphNode,
} from "./graph.js";
import {
  rebuildSynthesisProtocolCapabilityDto,
  rebuildSynthesisProtocolDto,
} from "./protocolSchema.js";
import type {
  SynthesisClaim,
  SynthesisCoverage,
  SynthesisDebate,
  SynthesisFutureDirection,
  SynthesisImprovementDimensions,
  SynthesisResolvedPaper,
  SynthesisReviewOutline,
  SynthesisTaxonomy,
  SynthesisTimeline,
  SynthesisTopicArtifact,
  SynthesisTopicArtifactMetadata,
  SynthesisTopicDefinition,
  SynthesisTopicManifest,
  SynthesisTopicRelationProposal,
  SynthesisTopicResolver,
} from "./topicDomain.js";

export type SynthesisWorkflowReviewRequest = {
  topicId: string;
  maxGraphNodes?: number;
  maxGraphEdges?: number;
  maxChars?: number;
  includePaperArtifacts?: boolean;
};

const SYNTHESIS_WORKFLOW_REVIEW_SCHEMA_ID =
  "https://zotero-agents.local/synthesis/sidecar-protocol/v1/client-workflow-review.schema.json";

export type SynthesisReviewArtifactMetadata = SynthesisTopicArtifactMetadata;

export type SynthesisReviewCanonicalTopicMetadata = {
  schema_id?: string;
  schema_version?: string;
  topic_id: string;
  title: string;
  definition?: string;
  mode: "create" | "update_full" | "update_patch";
  bundle_hash: string;
  timeline: string | SynthesisTimeline;
  artifact_metadata: SynthesisReviewArtifactMetadata;
  updated_at: string;
  operation?: string;
  language?: string;
  manifest_hash?: string;
  structured_hash?: string;
  artifact_hash?: string;
  metadata_hash?: string;
  section_hashes?: Record<string, string>;
  paper_count?: number;
  external_literature_count?: number;
  coverage_summary?: SynthesisCoverage;
  prospective_topic_relation_proposals?: SynthesisTopicRelationProposal[];
};

export type SynthesisReviewResolvedPaper = {
  paper_ref: string;
  match_reasons: string[];
};

export type SynthesisReviewRegistryArtifactCoverageRow = {
  paper_ref: string;
  title: string;
  artifactCoverage: "complete" | "partial" | "missing";
  missing_artifacts: string[];
};

export type SynthesisReviewMissingArtifactDiagnostic = {
  paper_ref: string;
  artifact_type: string;
  severity: "warning";
  message: string;
};

export type SynthesisReviewStructuredTopic = {
  artifact: SynthesisTopicArtifact;
  manifest?: SynthesisTopicManifest;
  metadata?: SynthesisReviewCanonicalTopicMetadata;
  claims: SynthesisClaim[];
  timeline_events: SynthesisTimeline;
  source_papers: SynthesisResolvedPaper[];
  taxonomy: SynthesisTaxonomy;
  improvement_dimensions: SynthesisImprovementDimensions;
  debates: SynthesisDebate[];
  coverage: SynthesisCoverage;
  future_directions: SynthesisFutureDirection[];
  review_outline: SynthesisReviewOutline;
  incomplete_sections: string[];
};

export type SynthesisWorkflowReviewResult = {
  kind: "synthesis.review_workflow_input";
  schema_version: "1.0.0";
  input_hash: string;
  topic: {
    topic_id: string;
    title: string;
    markdown: string;
    metadata: SynthesisReviewArtifactMetadata;
    topic_definition: SynthesisTopicDefinition;
    resolver: SynthesisTopicResolver;
  };
  topic_timeline: {
    content: string | SynthesisTimeline;
  };
  structured_topic?: SynthesisReviewStructuredTopic;
  resolved_paper_set: {
    papers: SynthesisReviewResolvedPaper[];
    snapshot: {
      papers: SynthesisReviewResolvedPaper[];
    };
  };
  registry_artifact_coverage: {
    rows: SynthesisReviewRegistryArtifactCoverageRow[];
  };
  citation_graph_slice: {
    graph_hash: string;
    nodes: SynthesisCitationGraphNode[];
    edges: SynthesisCitationGraphEdge[];
  };
  missing_artifact_diagnostics: SynthesisReviewMissingArtifactDiagnostic[];
  diagnostics: {
    blocking: string[];
    warnings: string[];
  };
};

export function rebuildSynthesisWorkflowReviewResult(
  value: unknown,
): SynthesisWorkflowReviewResult {
  return rebuildSynthesisProtocolCapabilityDto({
    capability: "client.getReviewInput",
    direction: "result",
    value,
  });
}

export function rebuildSynthesisWorkflowReviewRequest(
  value: unknown,
): SynthesisWorkflowReviewRequest {
  return rebuildSynthesisProtocolDto({
    schemaId: SYNTHESIS_WORKFLOW_REVIEW_SCHEMA_ID,
    definition: "ReviewRequest",
    direction: "request",
    value,
  });
}

export interface SynthesisWorkflowReviewClient {
  getInput(
    request: SynthesisWorkflowReviewRequest,
  ): Promise<SynthesisWorkflowReviewResult>;
}
