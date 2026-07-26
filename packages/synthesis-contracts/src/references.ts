import type { SynthesisJsonObject } from "./common";

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

export type SynthesisReferenceCommandResult = SynthesisJsonObject;
export type SynthesisReferenceQueryRequest = SynthesisJsonObject;
export type SynthesisReferenceQueryResult = SynthesisJsonObject;

export interface SynthesisReferencesClient {
  startRefresh(
    request?: SynthesisReferenceQueryRequest,
  ): Promise<SynthesisReferenceCommandResult>;
  getSidecarIndex(
    request?: SynthesisReferenceQueryRequest,
  ): Promise<SynthesisReferenceQueryResult>;
  rankExternalReferences(
    request?: SynthesisReferenceQueryRequest,
  ): Promise<SynthesisReferenceQueryResult>;
  getAttentionQueue(
    request?: SynthesisReferenceQueryRequest,
  ): Promise<SynthesisReferenceQueryResult>;
  refreshReferenceSidecarNow(): Promise<SynthesisReferenceCommandResult>;
  retryReferenceSidecarRefresh(): Promise<SynthesisReferenceCommandResult>;
  runAdvancedReferenceMatchingNow(): Promise<SynthesisReferenceCommandResult>;
  retryAdvancedReferenceMatching(): Promise<SynthesisReferenceCommandResult>;
  applyCanonicalRevisionReviewAction(
    request: SynthesisCanonicalRevisionReviewRequest,
  ): Promise<SynthesisReferenceCommandResult>;
  applyReferenceMatchProposalAction(
    request: SynthesisReferenceMatchProposalActionRequest,
  ): Promise<SynthesisReferenceCommandResult>;
  applyReferenceMatchProposalActions(
    request: SynthesisReferenceMatchProposalActionsRequest,
  ): Promise<SynthesisReferenceCommandResult>;
  mergeEffectiveCanonicalReference(
    request: SynthesisEffectiveCanonicalReferenceMergeRequest,
  ): Promise<SynthesisReferenceCommandResult>;
  applyCanonicalRevisionMergeRequests(
    request: SynthesisCanonicalRevisionMergeRequestsRequest,
  ): Promise<SynthesisReferenceCommandResult>;
  updateCanonicalReferenceMetadata(
    request: SynthesisCanonicalReferenceMetadataUpdateRequest,
  ): Promise<SynthesisReferenceCommandResult>;
  archiveCanonicalReference(
    request: SynthesisCanonicalReferenceArchiveRequest,
  ): Promise<SynthesisReferenceCommandResult>;
}
