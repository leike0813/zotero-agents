import type { SynthesisPublicMaintenanceOperation } from "./lifecycle";
import { rebuildSynthesisProtocolCapabilityDto } from "./protocolSchema.js";

export const SYNTHESIS_CANONICAL_REVISION_REVIEW_ACTIONS = [
  "accept",
  "reject",
] as const;

export type SynthesisCanonicalRevisionReviewAction =
  (typeof SYNTHESIS_CANONICAL_REVISION_REVIEW_ACTIONS)[number];

export type SynthesisCanonicalRevisionReviewRequest = {
  reviewItemId: string;
  action: SynthesisCanonicalRevisionReviewAction;
};

export const SYNTHESIS_REFERENCE_MATCH_PROPOSAL_ACTIONS = [
  "accept",
  "reverse_accept",
  "reject",
  "reopen",
  "delete",
] as const;

export type SynthesisReferenceMatchProposalAction =
  (typeof SYNTHESIS_REFERENCE_MATCH_PROPOSAL_ACTIONS)[number];

export const SYNTHESIS_REFERENCE_MATCH_PROPOSAL_DECISION_ACTIONS = [
  ...SYNTHESIS_REFERENCE_MATCH_PROPOSAL_ACTIONS,
  "manual_target",
] as const;

export type SynthesisReferenceMatchProposalDecisionAction =
  (typeof SYNTHESIS_REFERENCE_MATCH_PROPOSAL_DECISION_ACTIONS)[number];

export type SynthesisReferenceMatchProposalManualTarget =
  | {
      kind: "zotero_item";
      libraryId: number;
      itemKey: string;
    }
  | {
      kind: "canonical_reference";
      canonicalReferenceId: string;
    };

export type SynthesisReferenceMatchProposalActionRequest = {
  proposalId: string;
  action: SynthesisReferenceMatchProposalAction;
};

export type SynthesisReferenceMatchProposalDecision =
  | SynthesisReferenceMatchProposalActionRequest
  | {
      proposalId: string;
      action: "manual_target";
      target: SynthesisReferenceMatchProposalManualTarget;
    };

export type SynthesisReferenceMatchProposalActionsRequest = {
  decisions: SynthesisReferenceMatchProposalDecision[];
};

export type SynthesisCanonicalReferenceMergePair = {
  sourceEffectiveCanonicalId: string;
  targetEffectiveCanonicalId: string;
};

export type SynthesisEffectiveCanonicalReferenceMergeRequest =
  SynthesisCanonicalReferenceMergePair & {
    confirmRetargetGroup?: boolean;
  };

export type SynthesisCanonicalRevisionMergeRequestsRequest = {
  requests: SynthesisCanonicalReferenceMergePair[];
};

export type SynthesisCanonicalReferenceMetadataPatch = {
  title?: string;
  normalizedTitle?: string;
  year?: string;
  authors?: string[];
  identifiers?: Record<string, string>;
};

export type SynthesisCanonicalReferenceMetadataUpdateRequest = {
  canonicalReferenceId: string;
  patch: SynthesisCanonicalReferenceMetadataPatch;
};

export type SynthesisCanonicalReferenceArchiveRequest = {
  canonicalReferenceId: string;
};

export type SynthesisReferenceIndexRequest = {
  cursor?: string;
  limit?: number;
  includeReferences?: boolean;
  sourceRefs?: string[];
};

export type SynthesisReferenceIndexRow = {
  paper_ref: string;
  library_id: number;
  item_key: string;
  title: string;
  year: string;
  metadata_hash: string;
  updated_at: string;
  artifactCoverage: string;
  missing_artifacts: string[];
  reference_count: number;
  unbound_reference_count: number;
  references?: SynthesisReferenceInstanceRow[];
};

export type SynthesisReferenceInstanceRow = {
  reference_instance_id: string;
  reference_index: number;
  title: string;
  year?: string;
  raw_reference?: string;
  confidence?: string;
  target_literature_item_id?: string;
  target_title?: string;
  target_paper_ref?: string;
  target_binding: "library" | "external" | "none";
  binding_status?:
    | "candidate"
    | "accepted"
    | "rejected"
    | "stale_target"
    | "unbound";
};

export type SynthesisReferenceIndexResult = {
  rows: SynthesisReferenceIndexRow[];
  cursor: string;
  next_cursor: string;
  has_more: boolean;
  returned: number;
  total: number;
  limit: number;
  diagnostics: {
    cache_found: boolean;
    storage: "sqlite";
    stale: boolean;
    warnings: string[];
    recommended_commands: string[];
    repository_basis_hash: string;
    canonical_basis_hash: string;
  };
};

export type SynthesisExternalReferenceRankRequest = {
  cursor?: string;
  limit?: number;
  sortBy?: "external_degree" | "shared_source_count" | "year";
};

export type SynthesisExternalReferenceRankResult = {
  ok: true;
  graph_hash: string;
  items: Array<{
    node_id: string;
    title: string;
    year: string;
    authors: string[];
    external_degree: number;
    shared_source_count: number;
    source_paper_refs: string[];
    reason: string;
  }>;
  cursor: string;
  nextCursor: string;
  hasMore: boolean;
  returned: number;
  total: number;
  limit: number;
  diagnostics: {
    snapshot_found: boolean;
    returned_count: number;
    total_external_nodes: number;
    limits: { limit: number; maxLimit: 100 };
    warnings: string[];
    repository_basis_hash: string;
    canonical_basis_hash: string;
  };
};

export type SynthesisReferenceAttentionRequest = { limit?: number };

export type SynthesisReferenceAttentionResult = {
  ok: true;
  truncated: boolean;
  items: Array<{
    severity: "warning" | "error";
    target: string;
    reason: string;
    source_capability: string;
    suggested_commands: string[];
    details?: {
      kind: string;
      source_canonical_reference_id: string;
      target_canonical_reference_id: string;
    };
  }>;
  diagnostics: {
    canonical_basis_hash: string;
    limits: { limit: number; maxLimit: 100 };
    repository_basis_hash: string;
    returned_count: number;
    warnings: string[];
  };
};

export type SynthesisReferenceCommandDiagnostic = {
  code: string;
  severity: "error";
  message?: string;
  details?: {
    proposalId?: string;
    reviewItemId?: string;
    canonicalReferenceId?: string;
    source?: string;
    target?: string;
    failed_count?: number;
    blockers?: string[];
  };
};

export type SynthesisReferenceCommandResult = {
  ok: boolean;
  status: string;
  idempotent?: boolean;
  proposal_id?: string;
  review_item_id?: string;
  action?: string;
  canonical_reference_id?: string;
  source_effective_canonical_id?: string;
  target_effective_canonical_id?: string;
  diagnostic?: SynthesisReferenceCommandDiagnostic;
  diagnostics?: SynthesisReferenceCommandDiagnostic[];
};

export type SynthesisReferenceBatchCommandResult = {
  ok: boolean;
  applied_count: number;
  skipped_count?: number;
  failed_count: number;
  results: SynthesisReferenceCommandResult[];
  diagnostic?: SynthesisReferenceCommandDiagnostic;
  diagnostics?: SynthesisReferenceCommandDiagnostic[];
};

export type SynthesisReferenceCapabilityResultMap = {
  "client.getReferenceSidecarIndex": SynthesisReferenceIndexResult;
  "client.rankExternalReferences": SynthesisExternalReferenceRankResult;
  "client.getAttentionQueue": SynthesisReferenceAttentionResult;
  "client.startReferenceSidecarRefresh": SynthesisPublicMaintenanceOperation;
  "client.refreshReferenceSidecarNow": SynthesisPublicMaintenanceOperation;
  "client.retryReferenceSidecarRefresh": SynthesisPublicMaintenanceOperation;
  "client.runAdvancedReferenceMatchingNow": SynthesisPublicMaintenanceOperation;
  "client.retryAdvancedReferenceMatching": SynthesisPublicMaintenanceOperation;
  "client.applyCanonicalRevisionReviewAction": SynthesisReferenceCommandResult;
  "client.applyReferenceMatchProposalAction": SynthesisReferenceCommandResult;
  "client.applyReferenceMatchProposalActions": SynthesisReferenceBatchCommandResult;
  "client.mergeEffectiveCanonicalReference": SynthesisReferenceCommandResult;
  "client.applyCanonicalRevisionMergeRequests": SynthesisReferenceBatchCommandResult;
  "client.updateCanonicalReferenceMetadata": SynthesisReferenceCommandResult;
  "client.archiveCanonicalReference": SynthesisReferenceCommandResult;
};

export function rebuildSynthesisReferenceCapabilityResult<
  Capability extends keyof SynthesisReferenceCapabilityResultMap,
>(
  capability: Capability,
  value: unknown,
): SynthesisReferenceCapabilityResultMap[Capability] {
  return rebuildSynthesisProtocolCapabilityDto({
    capability,
    direction: "result",
    value,
  });
}

export interface SynthesisReferencesClient {
  startRefresh(
    request?: SynthesisReferenceIndexRequest,
  ): Promise<SynthesisPublicMaintenanceOperation>;
  getSidecarIndex(
    request?: SynthesisReferenceIndexRequest,
  ): Promise<SynthesisReferenceIndexResult>;
  rankExternalReferences(
    request?: SynthesisExternalReferenceRankRequest,
  ): Promise<SynthesisExternalReferenceRankResult>;
  getAttentionQueue(
    request?: SynthesisReferenceAttentionRequest,
  ): Promise<SynthesisReferenceAttentionResult>;
  refreshReferenceSidecarNow(): Promise<SynthesisPublicMaintenanceOperation>;
  retryReferenceSidecarRefresh(): Promise<SynthesisPublicMaintenanceOperation>;
  runAdvancedReferenceMatchingNow(): Promise<SynthesisPublicMaintenanceOperation>;
  retryAdvancedReferenceMatching(): Promise<SynthesisPublicMaintenanceOperation>;
  applyCanonicalRevisionReviewAction(
    request: SynthesisCanonicalRevisionReviewRequest,
  ): Promise<SynthesisReferenceCommandResult>;
  applyReferenceMatchProposalAction(
    request: SynthesisReferenceMatchProposalActionRequest,
  ): Promise<SynthesisReferenceCommandResult>;
  applyReferenceMatchProposalActions(
    request: SynthesisReferenceMatchProposalActionsRequest,
  ): Promise<SynthesisReferenceBatchCommandResult>;
  mergeEffectiveCanonicalReference(
    request: SynthesisEffectiveCanonicalReferenceMergeRequest,
  ): Promise<SynthesisReferenceCommandResult>;
  applyCanonicalRevisionMergeRequests(
    request: SynthesisCanonicalRevisionMergeRequestsRequest,
  ): Promise<SynthesisReferenceBatchCommandResult>;
  updateCanonicalReferenceMetadata(
    request: SynthesisCanonicalReferenceMetadataUpdateRequest,
  ): Promise<SynthesisReferenceCommandResult>;
  archiveCanonicalReference(
    request: SynthesisCanonicalReferenceArchiveRequest,
  ): Promise<SynthesisReferenceCommandResult>;
}
