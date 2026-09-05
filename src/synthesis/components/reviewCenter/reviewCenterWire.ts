// Defensive narrowing for the review center surface: the wire snapshot's
// host-owned slots (registry rows, match proposals, target candidates,
// cleanup proposals, concept/topic-graph rows) are `unknown` page-side, so
// this module declares the fields this surface reads and narrows the raw
// snapshot into typed wire records. The panel model feeds the narrowed view
// into ./reviewCenterProjection.

import type { SynthesisWorkbenchSnapshot } from "../../../shared/synthesisWorkbenchWireContract";

export type ReviewCenterWirePageSnapshot = SynthesisWorkbenchSnapshot;

export type ReviewCenterRegistryReferenceWire = {
  reference_instance_id?: unknown;
  title?: unknown;
  raw_reference?: unknown;
  target_paper_ref?: unknown;
  target_literature_item_id?: unknown;
};

export type ReviewCenterRegistryRowWire = {
  paper_ref?: unknown;
  literature_item_id?: unknown;
  title?: unknown;
  references?: ReviewCenterRegistryReferenceWire[];
};

export type ReviewCenterMatchProposalWire = {
  proposal_id?: unknown;
  kind?: unknown;
  status?: unknown;
  confidence?: unknown;
  reasons?: unknown;
  updated_at?: unknown;
  evidence?: unknown;
  source_raw_reference_ids?: unknown;
  target_item_key?: unknown;
  target_library_id?: unknown;
  target_canonical_reference_id?: unknown;
  target_effective_canonical_reference_id?: unknown;
  source_canonical_reference_id?: unknown;
  source_effective_canonical_reference_id?: unknown;
  target_projected_literature_item_id?: unknown;
  source_projected_literature_item_id?: unknown;
};

export type ReviewCenterCleanupProposalWire = {
  proposal_id?: unknown;
  review_kind?: unknown;
  kind?: unknown;
  status?: unknown;
  updated_at?: unknown;
  reason?: unknown;
  decision_summary?: unknown;
  reference_title?: unknown;
  reference_raw?: unknown;
  source_paper_ref?: unknown;
  source_paper_title?: unknown;
  target_paper_title?: unknown;
  target_work_title?: unknown;
};

export type ReviewCenterTargetCandidateWire = {
  kind?: unknown;
  title?: unknown;
  year?: unknown;
  bindingStatus?: unknown;
  canonicalReferenceId?: unknown;
  canonical_reference_id?: unknown;
  bindingTarget?: unknown;
  binding_target?: unknown;
  paperRef?: unknown;
  paper_ref?: unknown;
  libraryId?: unknown;
  library_id?: unknown;
  itemKey?: unknown;
  item_key?: unknown;
};

export type ReviewCenterConceptRowWire = {
  concept_id?: unknown;
  label?: unknown;
};

export type ReviewCenterConceptReviewItemWire = {
  review_id?: unknown;
  label?: unknown;
  reason?: unknown;
  confidence?: unknown;
  status?: unknown;
  topic_id?: unknown;
  candidate_concept_ids?: unknown;
};

export type ReviewCenterTopicGraphNodeWire = {
  topic_id?: unknown;
  title?: unknown;
};

export type ReviewCenterTopicGraphEdgeWire = {
  edge_id?: unknown;
  source_topic_id?: unknown;
  target_topic_id?: unknown;
  relation?: unknown;
  status?: unknown;
  confidence?: unknown;
  evidence_refs?: unknown;
  provenance?: unknown;
};

export type ReviewCenterTopicGraphReviewItemWire = {
  review_id?: unknown;
  edge_id?: unknown;
  source_topic_id?: unknown;
  target_topic_id?: unknown;
  target_title?: unknown;
  relation?: unknown;
  reason?: unknown;
  status?: unknown;
  confidence?: unknown;
  evidence_refs?: unknown;
  evidence?: unknown;
  provenance?: unknown;
};

export type ReviewCenterArtifactRowWire = {
  topic_id?: unknown;
  id?: unknown;
  title?: unknown;
};

export type ReviewCenterWireView = {
  registryRows: ReviewCenterRegistryRowWire[];
  cleanupProposals: ReviewCenterCleanupProposalWire[];
  matchProposals: ReviewCenterMatchProposalWire[];
  matchTargetCandidates: ReviewCenterTargetCandidateWire[];
  conceptRows: ReviewCenterConceptRowWire[];
  conceptReviewItems: ReviewCenterConceptReviewItemWire[];
  conceptReviewMergeTargets: Record<string, string>;
  topicGraphNodes: ReviewCenterTopicGraphNodeWire[];
  topicGraphEdges: ReviewCenterTopicGraphEdgeWire[];
  topicGraphReviewItems: ReviewCenterTopicGraphReviewItemWire[];
  artifactRows: ReviewCenterArtifactRowWire[];
  // Operation echo used to reconcile the region's local pending/submission
  // state (legacy clearResolvedLocalPending).
  lastCompletedKey: string;
  lastFailedKey: string;
  inFlightOperationKeys: string[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function recordArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value.filter(isRecord) as unknown as T[]) : [];
}

function narrowMergeTargets(value: unknown): Record<string, string> {
  if (!isRecord(value)) return {};
  const result: Record<string, string> = {};
  for (const [key, entry] of Object.entries(value)) {
    const text = String(entry == null ? "" : entry).trim();
    if (key && text) result[key] = text;
  }
  return result;
}

/** Project the wire snapshot fields used by the review center. */
export function narrowReviewCenterSnapshot(
  snapshot: ReviewCenterWirePageSnapshot,
): ReviewCenterWireView {
  return {
    registryRows: recordArray(snapshot.registry?.rows),
    cleanupProposals: recordArray(snapshot.registry?.cleanupProposals),
    matchProposals: recordArray(snapshot.registry?.matchProposals),
    matchTargetCandidates: recordArray(
      snapshot.registry?.matchTargetCandidates,
    ),
    conceptRows: recordArray(snapshot.concepts?.rows),
    conceptReviewItems: recordArray(snapshot.concepts?.reviewItems),
    conceptReviewMergeTargets: narrowMergeTargets(
      snapshot.concepts?.filters?.reviewMergeTargets,
    ),
    topicGraphNodes: recordArray(snapshot.topicGraph?.nodes),
    topicGraphEdges: recordArray(snapshot.topicGraph?.edges),
    topicGraphReviewItems: recordArray(snapshot.topicGraph?.reviewItems),
    artifactRows: recordArray(snapshot.artifacts?.rows),
    lastCompletedKey: String(snapshot.actions?.lastCompleted?.key ?? "").trim(),
    lastFailedKey: String(snapshot.actions?.lastFailed?.key ?? "").trim(),
    inFlightOperationKeys: (snapshot.actions?.inFlight || [])
      .map((entry) => String(entry?.key ?? "").trim())
      .filter(Boolean),
  };
}
