// Pure projection for the review center surface: narrowed wire view + the
// injected `t` resolver -> render-ready region selection. Ports the legacy
// page's review-center derivation (src/synthesisWorkbenchApp.ts
// :7261-7372 lookup/context, :7933-7983 entry filtering, :10355-10384 status/
// search matching, :10562-10700 target-candidate helpers,
// :11356-11379 cleanup rows, :11458-11574 topic titles/graph rows) so the
// region component stays presentational. The panel model calls
// projectSynthesisReviewCenterSelection per projection pass.

import type { SynthesisWorkbenchSnapshot } from "../../../shared/synthesisWorkbenchWireContract";
import type {
  SynthesisReviewCenterActiveTab,
  SynthesisReviewCenterCleanupRowView,
  SynthesisReviewCenterConceptRowView,
  SynthesisReviewCenterPickerProposalView,
  SynthesisReviewCenterProposalRowView,
  SynthesisReviewCenterTargetCandidateView,
  SynthesisReviewCenterTopicGraphRowView,
  SynthesisWorkbenchReviewCenterSelection,
} from "./ReviewCenterRegion";
import {
  reviewCenterCellText,
  reviewCenterEnumLabel,
  reviewCenterHumanizeLabel,
  reviewCenterMaybeLocalized,
  reviewCenterStatusTone,
  reviewCenterTextValue,
  type SynthesisReviewCenterText,
} from "./reviewCenterText";
import {
  narrowReviewCenterSnapshot,
  type ReviewCenterConceptReviewItemWire,
  type ReviewCenterMatchProposalWire,
  type ReviewCenterRegistryReferenceWire,
  type ReviewCenterRegistryRowWire,
  type ReviewCenterTargetCandidateWire,
  type ReviewCenterTopicGraphEdgeWire,
  type ReviewCenterTopicGraphReviewItemWire,
  type ReviewCenterWireView,
} from "./reviewCenterWire";

// ---------------------------------------------------------------------------
// Shared record helpers (legacy isRecord/textValue/firstText)
// ---------------------------------------------------------------------------

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function recordValue(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {};
}

function firstText(
  row: Record<string, unknown>,
  keys: string[],
  fallback = "",
): string {
  for (const key of keys) {
    const value = reviewCenterTextValue(row[key]);
    if (value) return value;
  }
  return fallback;
}

// ---------------------------------------------------------------------------
// Review filter matching (legacy reviewStatusMatches / reviewSearchMatches)
// ---------------------------------------------------------------------------

function reviewStatusMatches(status: unknown, filter: unknown): boolean {
  const normalizedFilter = reviewCenterTextValue(filter, "open");
  if (normalizedFilter === "all") return true;
  const normalizedStatus = reviewCenterTextValue(status, "open");
  if (normalizedFilter === "accepted") {
    return (
      normalizedStatus === "accepted" ||
      normalizedStatus === "approved" ||
      normalizedStatus === "confirmed" ||
      normalizedStatus === "merged"
    );
  }
  if (normalizedFilter === "superseded") {
    return normalizedStatus === "superseded" || normalizedStatus === "stale";
  }
  return normalizedStatus === normalizedFilter;
}

function reviewSearchMatches(values: unknown[], query: unknown): boolean {
  const normalized = reviewCenterTextValue(query).toLowerCase();
  if (!normalized) return true;
  return values
    .map((value) => reviewCenterTextValue(value).toLowerCase())
    .join(" ")
    .includes(normalized);
}

// ---------------------------------------------------------------------------
// Registry review lookup + match proposal context (legacy :7190-7372)
// ---------------------------------------------------------------------------

function registryReferences(
  row: ReviewCenterRegistryRowWire,
): ReviewCenterRegistryReferenceWire[] {
  return Array.isArray(row.references) ? row.references : [];
}

function registryRowDisplayId(row: ReviewCenterRegistryRowWire): string {
  return (
    reviewCenterTextValue(row.paper_ref) ||
    reviewCenterTextValue(row.literature_item_id) ||
    "-"
  );
}

function registryReferenceReadableTitle(
  reference: ReviewCenterRegistryReferenceWire,
): string {
  return (
    reviewCenterTextValue(reference.title) ||
    reviewCenterTextValue(reference.raw_reference) ||
    reviewCenterTextValue(reference.reference_instance_id) ||
    "Untitled reference"
  );
}

function targetPaperRefForProposal(
  proposal: ReviewCenterMatchProposalWire,
): string {
  const itemKey = reviewCenterTextValue(proposal.target_item_key);
  if (!itemKey) return "";
  const libraryId = Number(proposal.target_library_id || 0);
  return `${Number.isFinite(libraryId) && libraryId > 0 ? Math.floor(libraryId) : ""}:${itemKey}`.replace(
    /^:/,
    "",
  );
}

type RegistryReviewLookup = {
  sourceByRawReferenceId: Map<
    string,
    {
      source: ReviewCenterRegistryRowWire;
      reference: ReviewCenterRegistryReferenceWire;
    }
  >;
  rowByPaperRef: Map<string, ReviewCenterRegistryRowWire>;
  rowByItemKey: Map<string, ReviewCenterRegistryRowWire>;
};

function buildRegistryReviewLookup(
  view: ReviewCenterWireView,
): RegistryReviewLookup {
  const sourceByRawReferenceId = new Map<
    string,
    {
      source: ReviewCenterRegistryRowWire;
      reference: ReviewCenterRegistryReferenceWire;
    }
  >();
  const rowByPaperRef = new Map<string, ReviewCenterRegistryRowWire>();
  const rowByItemKey = new Map<string, ReviewCenterRegistryRowWire>();
  for (const row of view.registryRows) {
    const paperRef = reviewCenterTextValue(row.paper_ref);
    if (paperRef) {
      rowByPaperRef.set(paperRef, row);
      const itemKey = paperRef.split(":").pop() || "";
      if (itemKey) {
        rowByItemKey.set(itemKey, row);
      }
    }
    for (const reference of registryReferences(row)) {
      const referenceId = reviewCenterTextValue(
        reference.reference_instance_id,
      );
      if (referenceId) {
        sourceByRawReferenceId.set(referenceId, { source: row, reference });
      }
    }
  }
  return { sourceByRawReferenceId, rowByPaperRef, rowByItemKey };
}

type MatchProposalContext = {
  sourceReferenceTitle: string;
  parentItemTitle: string;
  targetPaperTitle: string;
  targetPaperRef: string;
};

function referenceMatchProposalContext(
  proposal: ReviewCenterMatchProposalWire,
  lookup: RegistryReviewLookup,
): MatchProposalContext {
  const evidence = recordValue(proposal.evidence);
  const sourceEvidence = recordValue(evidence.source);
  const targetEvidence = recordValue(evidence.target);
  const rawIds = Array.isArray(proposal.source_raw_reference_ids)
    ? proposal.source_raw_reference_ids
        .map((value) => reviewCenterTextValue(value))
        .filter(Boolean)
    : [];
  const sourceMatch = rawIds
    .map((id) => lookup.sourceByRawReferenceId.get(id))
    .find(Boolean);
  const targetRef = targetPaperRefForProposal(proposal);
  const targetRow =
    (targetRef ? lookup.rowByPaperRef.get(targetRef) : undefined) ||
    lookup.rowByItemKey.get(reviewCenterTextValue(proposal.target_item_key));
  const targetFallback =
    targetRef ||
    reviewCenterTextValue(proposal.target_item_key) ||
    reviewCenterTextValue(targetEvidence.title) ||
    reviewCenterTextValue(targetEvidence.normalized_title) ||
    reviewCenterTextValue(proposal.target_canonical_reference_id) ||
    "Unknown target";
  const targetEvidenceTitle =
    reviewCenterTextValue(targetEvidence.title) ||
    reviewCenterTextValue(targetEvidence.normalized_title);
  const sourceBinding = recordValue(sourceEvidence.binding);
  const sourceEvidenceTitle =
    reviewCenterTextValue(sourceEvidence.title) ||
    reviewCenterTextValue(sourceEvidence.normalized_title);
  const sourceBindingTitle =
    reviewCenterTextValue(sourceBinding.title) ||
    reviewCenterTextValue(sourceBinding.paper_ref) ||
    reviewCenterTextValue(sourceEvidence.projected_literature_item_id);
  const sourceRowTitle = sourceMatch?.source
    ? reviewCenterTextValue(sourceMatch.source.title)
    : "";
  const sourceRowRef = sourceMatch?.source
    ? reviewCenterTextValue(sourceMatch.source.paper_ref)
    : "";
  const sourceRowTitleIsFallback =
    !sourceRowTitle ||
    sourceRowTitle === sourceRowRef ||
    sourceRowTitle ===
      reviewCenterTextValue(proposal.source_canonical_reference_id) ||
    sourceRowTitle.endsWith("(fallback id)");
  const parentItemTitle = sourceRowTitleIsFallback
    ? sourceBindingTitle ||
      sourceEvidenceTitle ||
      sourceRowTitle ||
      "Unknown parent item"
    : sourceRowTitle;
  return {
    sourceReferenceTitle: sourceMatch?.reference
      ? registryReferenceReadableTitle(sourceMatch.reference)
      : sourceEvidenceTitle ||
        reviewCenterTextValue(
          proposal.source_canonical_reference_id,
          "Unknown reference",
        ),
    parentItemTitle,
    targetPaperTitle: targetRow
      ? reviewCenterTextValue(targetRow.title, targetFallback)
      : targetEvidenceTitle || `${targetFallback} (fallback id)`,
    targetPaperRef: targetRow
      ? registryRowDisplayId(targetRow)
      : targetFallback,
  };
}

// ---------------------------------------------------------------------------
// Reference matching rows (legacy referenceMatchProposalEntriesForReviewCenter
// + cleanupProposalRowsForIndexReview)
// ---------------------------------------------------------------------------

function referenceProposalId(proposal: ReviewCenterMatchProposalWire): string {
  return reviewCenterTextValue(proposal.proposal_id);
}

function projectPickerProposalMeta(
  proposal: ReviewCenterMatchProposalWire,
): SynthesisReviewCenterPickerProposalView {
  return {
    kind: reviewCenterTextValue(proposal.kind),
    targetItemKey: reviewCenterTextValue(proposal.target_item_key),
    targetCanonicalId:
      reviewCenterTextValue(proposal.target_effective_canonical_reference_id) ||
      reviewCenterTextValue(proposal.target_canonical_reference_id),
    sourceCanonicalId:
      reviewCenterTextValue(proposal.source_effective_canonical_reference_id) ||
      reviewCenterTextValue(proposal.source_canonical_reference_id),
    targetProjectedId: reviewCenterTextValue(
      proposal.target_projected_literature_item_id,
    ),
    sourceProjectedId: reviewCenterTextValue(
      proposal.source_projected_literature_item_id,
    ),
  };
}

function projectReferenceMatchingRows(
  view: ReviewCenterWireView,
  filters: { status: string; kind: string; confidence: string; search: string },
  lookup: RegistryReviewLookup,
  t: SynthesisReviewCenterText,
): SynthesisReviewCenterProposalRowView[] {
  const query = filters.search.toLowerCase();
  const rows: SynthesisReviewCenterProposalRowView[] = [];
  for (const proposal of view.matchProposals) {
    const context = referenceMatchProposalContext(proposal, lookup);
    if (
      filters.kind !== "all" &&
      reviewCenterTextValue(proposal.kind) !== filters.kind
    ) {
      continue;
    }
    if (
      filters.status !== "all" &&
      reviewCenterTextValue(proposal.status) !== filters.status
    ) {
      continue;
    }
    if (
      filters.confidence !== "all" &&
      reviewCenterTextValue(proposal.confidence) !== filters.confidence
    ) {
      continue;
    }
    if (query) {
      const haystack = [
        context.sourceReferenceTitle,
        context.parentItemTitle,
        context.targetPaperTitle,
        context.targetPaperRef,
        proposal.kind,
        proposal.confidence,
        proposal.reasons,
      ]
        .map((value) => reviewCenterTextValue(value).toLowerCase())
        .join(" ");
      if (!haystack.includes(query)) continue;
    }
    rows.push({
      proposalId: referenceProposalId(proposal),
      kind: reviewCenterTextValue(proposal.kind),
      kindText: reviewCenterCellText(t, proposal.kind),
      status: reviewCenterTextValue(proposal.status),
      statusText: reviewCenterMaybeLocalized(t, proposal.status) || "-",
      statusTone: reviewCenterStatusTone(proposal.status),
      reasonsText: reviewCenterCellText(t, proposal.reasons),
      updatedAtText: reviewCenterCellText(t, proposal.updated_at),
      sourceText: reviewCenterCellText(t, context.sourceReferenceTitle),
      targetText: reviewCenterCellText(t, context.targetPaperTitle),
      parentText: reviewCenterCellText(t, context.parentItemTitle),
    });
  }
  return rows;
}

function projectCleanupRows(
  view: ReviewCenterWireView,
  filters: { status: string; kind: string; search: string },
  t: SynthesisReviewCenterText,
): SynthesisReviewCenterCleanupRowView[] {
  const rows: SynthesisReviewCenterCleanupRowView[] = [];
  view.cleanupProposals.forEach((proposal, index) => {
    const reviewKind = reviewCenterTextValue(
      proposal.review_kind || proposal.kind,
    );
    if (filters.kind !== "all" && reviewKind !== filters.kind) return;
    if (!reviewStatusMatches(proposal.status, filters.status)) return;
    if (
      !reviewSearchMatches(
        [
          proposal.source_paper_title,
          proposal.source_paper_ref,
          proposal.reference_title,
          proposal.reference_raw,
          proposal.target_paper_title,
          proposal.reason,
          proposal.kind,
          proposal.review_kind,
        ],
        filters.search,
      )
    ) {
      return;
    }
    const proposalId = reviewCenterTextValue(proposal.proposal_id);
    rows.push({
      rowKey: proposalId || `cleanup-${index}`,
      proposalId,
      kindText: reviewCenterCellText(
        t,
        proposal.review_kind || proposal.kind || "cleanup",
      ),
      status: reviewCenterTextValue(proposal.status, "open"),
      statusText: reviewCenterMaybeLocalized(t, proposal.status) || "-",
      statusTone: reviewCenterStatusTone(proposal.status),
      updatedAtText: reviewCenterCellText(t, proposal.updated_at),
      sourceText: reviewCenterCellText(
        t,
        proposal.reference_title ||
          proposal.reference_raw ||
          proposal.source_paper_ref,
      ),
      targetText: reviewCenterCellText(
        t,
        proposal.target_paper_title || proposal.target_work_title || "-",
      ),
      parentText: reviewCenterCellText(
        t,
        proposal.source_paper_title || proposal.source_paper_ref,
      ),
      reasonText: reviewCenterCellText(
        t,
        proposal.reason || proposal.decision_summary,
      ),
      canonicalRevision: reviewKind === "canonical_revision",
    });
  });
  return rows;
}

// ---------------------------------------------------------------------------
// Manual target candidates (legacy :10562-10700)
// ---------------------------------------------------------------------------

function candidateKey(candidate: ReviewCenterTargetCandidateWire): string {
  return reviewCenterTextValue(candidate.kind) === "canonical_reference"
    ? `canonical:${reviewCenterTextValue(candidate.canonicalReferenceId || candidate.canonical_reference_id)}`
    : `zotero:${Math.max(0, Math.floor(Number(candidate.libraryId || candidate.library_id) || 0))}:${reviewCenterTextValue(candidate.itemKey || candidate.item_key)}`;
}

function candidateProjectedId(
  candidate: ReviewCenterTargetCandidateWire,
): string {
  if (reviewCenterTextValue(candidate.kind) === "canonical_reference") {
    const bindingTarget = candidate.bindingTarget || candidate.binding_target;
    if (bindingTarget && typeof bindingTarget === "object") {
      const paperRef = reviewCenterTextValue(
        (bindingTarget as Record<string, unknown>).paperRef ||
          (bindingTarget as Record<string, unknown>).paper_ref,
      );
      if (paperRef) return paperRef;
    }
    return reviewCenterTextValue(
      candidate.canonicalReferenceId || candidate.canonical_reference_id,
    );
  }
  return (
    reviewCenterTextValue(candidate.paperRef || candidate.paper_ref) ||
    `${Math.max(0, Math.floor(Number(candidate.libraryId || candidate.library_id) || 0))}:${reviewCenterTextValue(candidate.itemKey || candidate.item_key)}`
  );
}

function candidateLabel(candidate: ReviewCenterTargetCandidateWire): string {
  const title = reviewCenterTextValue(candidate.title, "Untitled target");
  const year = reviewCenterTextValue(candidate.year);
  return year ? `${title} (${year})` : title;
}

function candidateBindingLabel(
  t: SynthesisReviewCenterText,
  status: unknown,
): string {
  const normalized = reviewCenterTextValue(status);
  if (normalized === "accepted") {
    return reviewCenterEnumLabel(t, "binding-status", "accepted");
  }
  if (normalized === "candidate") {
    return reviewCenterEnumLabel(t, "binding-status", "candidate");
  }
  if (normalized === "stale_target") {
    return reviewCenterEnumLabel(t, "binding-status", "stale_target");
  }
  if (normalized === "rejected") {
    return reviewCenterEnumLabel(t, "binding-status", "rejected");
  }
  return "";
}

/** Legacy referenceTargetCandidateGroup. */
export function reviewCenterTargetGroup(title: string): string {
  const first = reviewCenterTextValue(title).trim().charAt(0).toUpperCase();
  return /^[A-Z]$/.test(first) ? first : "#";
}

function projectTargetCandidates(
  view: ReviewCenterWireView,
  t: SynthesisReviewCenterText,
): SynthesisReviewCenterTargetCandidateView[] {
  return view.matchTargetCandidates
    .map((candidate) => {
      const kind = reviewCenterTextValue(candidate.kind);
      const label = candidateLabel(candidate);
      const bindingStatus = reviewCenterTextValue(candidate.bindingStatus);
      return {
        key: candidateKey(candidate),
        kind,
        label,
        meta:
          kind === "canonical_reference"
            ? reviewCenterTextValue(candidate.canonicalReferenceId)
            : reviewCenterTextValue(candidate.paperRef) ||
              `${reviewCenterTextValue(candidate.libraryId)}:${reviewCenterTextValue(candidate.itemKey)}`,
        bindingStatus,
        bindingLabel: candidateBindingLabel(t, bindingStatus),
        group: reviewCenterTargetGroup(label),
        projectedId: candidateProjectedId(candidate),
        canonicalReferenceId: reviewCenterTextValue(
          candidate.canonicalReferenceId || candidate.canonical_reference_id,
        ),
        libraryId: Math.max(
          0,
          Math.floor(Number(candidate.libraryId || candidate.library_id) || 0),
        ),
        itemKey: reviewCenterTextValue(candidate.itemKey || candidate.item_key),
      };
    })
    .sort((left, right) =>
      left.label.localeCompare(right.label, undefined, { sensitivity: "base" }),
    );
}

/**
 * Legacy referenceManualTargetCandidates: per-proposal exclusion filter over
 * the (pre-sorted) candidate list, applied when the picker opens.
 */
export function filterReviewCenterTargetCandidates(
  candidates: SynthesisReviewCenterTargetCandidateView[],
  proposal: SynthesisReviewCenterPickerProposalView,
): SynthesisReviewCenterTargetCandidateView[] {
  return candidates.filter((candidate) => {
    if (proposal.kind === "canonical_merge") {
      if (candidate.kind !== "canonical_reference") return false;
      return Boolean(
        candidate.canonicalReferenceId &&
        candidate.canonicalReferenceId !== proposal.sourceCanonicalId &&
        candidate.canonicalReferenceId !== proposal.targetCanonicalId &&
        (!candidate.projectedId ||
          (candidate.projectedId !== proposal.sourceProjectedId &&
            candidate.projectedId !== proposal.targetProjectedId)),
      );
    }
    if (candidate.kind !== "zotero_item") return false;
    return Boolean(
      candidate.itemKey &&
      candidate.itemKey !== proposal.targetItemKey &&
      (!candidate.projectedId ||
        (candidate.projectedId !== proposal.sourceProjectedId &&
          candidate.projectedId !== proposal.targetProjectedId)),
    );
  });
}

// ---------------------------------------------------------------------------
// Concept review rows (legacy renderReviewCenter concepts branch)
// ---------------------------------------------------------------------------

function conceptCandidateIds(row: ReviewCenterConceptReviewItemWire): string[] {
  return Array.isArray(row.candidate_concept_ids)
    ? row.candidate_concept_ids
        .map((entry) => reviewCenterTextValue(entry))
        .filter(Boolean)
    : [];
}

function projectConceptRows(
  view: ReviewCenterWireView,
  filters: { status: string; search: string },
  topicTitles: Map<string, string>,
  t: SynthesisReviewCenterText,
): SynthesisReviewCenterConceptRowView[] {
  const labelByConceptId = new Map<string, string>();
  for (const row of view.conceptRows) {
    const id = reviewCenterTextValue(row.concept_id);
    if (id) labelByConceptId.set(id, reviewCenterTextValue(row.label) || id);
  }
  const rows: SynthesisReviewCenterConceptRowView[] = [];
  for (const row of view.conceptReviewItems) {
    if (!reviewStatusMatches(row.status, filters.status)) continue;
    const topicId = reviewCenterTextValue(row.topic_id);
    if (
      !reviewSearchMatches(
        [
          row.label,
          row.reason,
          topicTitles.get(topicId),
          row.topic_id,
          row.review_id,
        ],
        filters.search,
      )
    ) {
      continue;
    }
    rows.push({
      reviewId: reviewCenterTextValue(row.review_id),
      labelText: reviewCenterCellText(t, row.label),
      candidates: conceptCandidateIds(row).map((id) => ({
        id,
        name: labelByConceptId.get(id) || id,
      })),
      reason: reviewCenterTextValue(row.reason),
      reasonText: reviewCenterCellText(t, row.reason),
      confidenceText: reviewCenterCellText(t, row.confidence),
      status: reviewCenterTextValue(row.status, "open"),
      statusText: reviewCenterMaybeLocalized(t, row.status) || "-",
      statusTone: reviewCenterStatusTone(row.status),
      topicText: reviewCenterCellText(
        t,
        topicTitles.get(topicId) || row.topic_id,
      ),
    });
  }
  return rows;
}

// ---------------------------------------------------------------------------
// Topic graph review rows (legacy :11458-11574)
// ---------------------------------------------------------------------------

function topicGraphNodeTitleById(
  view: ReviewCenterWireView,
): Map<string, string> {
  return new Map(
    view.topicGraphNodes.map((node) => [
      reviewCenterTextValue(node.topic_id),
      reviewCenterTextValue(node.title) || reviewCenterTextValue(node.topic_id),
    ]),
  );
}

function topicTitleById(view: ReviewCenterWireView): Map<string, string> {
  const titles = topicGraphNodeTitleById(view);
  for (const row of view.artifactRows) {
    const topicId = reviewCenterTextValue(row.topic_id || row.id);
    const title = reviewCenterTextValue(row.title);
    if (topicId && title && !titles.has(topicId)) {
      titles.set(topicId, title);
    }
  }
  return titles;
}

function topicGraphReviewStatusForEdge(status: unknown): string {
  const value = reviewCenterTextValue(status, "suggested");
  if (value === "confirmed") return "accepted";
  if (value === "rejected") return "rejected";
  if (value === "stale") return "superseded";
  return "open";
}

function topicGraphReviewStatusForItem(status: unknown): string {
  const value = reviewCenterTextValue(status, "open");
  if (value === "approved") return "accepted";
  if (value === "rejected") return "rejected";
  return "open";
}

type TopicGraphReviewIntermediate = {
  row_kind: string;
  review_id: string;
  edge_id: string;
  source_topic_id: string;
  target_topic_id: string;
  source_title: string;
  target_title: string;
  relation: string;
  status: string;
  reason: string;
  confidence: unknown;
  evidence_refs: unknown;
  evidence: unknown;
  provenance: unknown;
};

function topicGraphReviewRows(
  view: ReviewCenterWireView,
): TopicGraphReviewIntermediate[] {
  const titles = topicGraphNodeTitleById(view);
  const edgeRows = view.topicGraphEdges
    .filter(
      (edge: ReviewCenterTopicGraphEdgeWire) =>
        reviewCenterTextValue(edge.status) !== "deleted",
    )
    .map((edge) => {
      const sourceId = reviewCenterTextValue(edge.source_topic_id);
      const targetId = reviewCenterTextValue(edge.target_topic_id);
      const edgeId = reviewCenterTextValue(edge.edge_id);
      const status = topicGraphReviewStatusForEdge(edge.status);
      return {
        row_kind: "edge",
        review_id: edgeId,
        edge_id: edgeId,
        source_topic_id: sourceId,
        target_topic_id: targetId,
        source_title: titles.get(sourceId) || sourceId,
        target_title: titles.get(targetId) || targetId,
        relation: reviewCenterTextValue(edge.relation),
        status,
        reason:
          status === "open"
            ? "Suggested topic graph relation"
            : "Topic graph relation decision",
        confidence: edge.confidence,
        evidence_refs: edge.evidence_refs,
        evidence: undefined,
        provenance: edge.provenance,
      };
    });
  const reviewRows = view.topicGraphReviewItems
    .filter(
      (item: ReviewCenterTopicGraphReviewItemWire) =>
        reviewCenterTextValue(item.status) !== "deleted",
    )
    .map((item) => {
      const sourceId = reviewCenterTextValue(item.source_topic_id);
      const targetId = reviewCenterTextValue(item.target_topic_id);
      return {
        row_kind: "review_item",
        review_id: reviewCenterTextValue(item.review_id),
        edge_id: reviewCenterTextValue(item.edge_id),
        source_topic_id: sourceId,
        target_topic_id: targetId,
        source_title: titles.get(sourceId) || sourceId,
        target_title:
          reviewCenterTextValue(item.target_title) ||
          titles.get(targetId) ||
          targetId,
        relation: reviewCenterTextValue(item.relation),
        status: topicGraphReviewStatusForItem(item.status),
        reason:
          reviewCenterTextValue(item.reason) ||
          "Topic graph relation review item",
        confidence: item.confidence,
        evidence_refs: item.evidence_refs,
        evidence: item.evidence,
        provenance: item.provenance,
      };
    });
  return [...edgeRows, ...reviewRows];
}

/** Legacy renderPillList item resolution. */
function pillItems(values: unknown): string[] {
  if (Array.isArray(values)) {
    return values
      .map((entry) =>
        isRecord(entry)
          ? firstText(entry, [
              "label",
              "title",
              "text",
              "ref",
              "paper_ref",
              "evidence_ref",
              "id",
            ])
          : reviewCenterTextValue(entry),
      )
      .filter(Boolean);
  }
  return reviewCenterTextValue(values) ? [reviewCenterTextValue(values)] : [];
}

function projectTopicGraphRows(
  view: ReviewCenterWireView,
  filters: { status: string; search: string },
  t: SynthesisReviewCenterText,
): SynthesisReviewCenterTopicGraphRowView[] {
  const rows: SynthesisReviewCenterTopicGraphRowView[] = [];
  for (const row of topicGraphReviewRows(view)) {
    if (!reviewStatusMatches(row.status, filters.status)) continue;
    if (
      !reviewSearchMatches(
        [
          row.source_title,
          row.target_title,
          row.relation,
          row.reason,
          row.confidence,
          row.evidence_refs,
          row.evidence,
          row.provenance,
          row.edge_id,
          row.review_id,
        ],
        filters.search,
      )
    ) {
      continue;
    }
    rows.push({
      rowKind: row.row_kind === "edge" ? "edge" : "review_item",
      reviewId: row.review_id,
      edgeId: row.edge_id,
      sourceText: reviewCenterCellText(
        t,
        row.source_title || row.source_topic_id,
      ),
      relationText: reviewCenterHumanizeLabel(t, row.relation),
      targetText: reviewCenterCellText(
        t,
        row.target_title || row.target_topic_id,
      ),
      reasonText: reviewCenterCellText(t, row.reason),
      confidenceText: reviewCenterCellText(t, row.confidence || "-"),
      evidencePills: pillItems(
        row.evidence_refs || row.evidence || row.provenance,
      ).map((item) => ({
        text: reviewCenterMaybeLocalized(t, item) || item,
        title: item,
      })),
      status: row.status,
      statusText: reviewCenterMaybeLocalized(t, row.status) || "-",
      statusTone: reviewCenterStatusTone(row.status),
    });
  }
  return rows;
}

// ---------------------------------------------------------------------------
// Selection assembly
// ---------------------------------------------------------------------------

function normalizeActiveTab(value: unknown): SynthesisReviewCenterActiveTab {
  const activeTab = reviewCenterTextValue(value, "reference_matching");
  return activeTab === "concepts" || activeTab === "topic_graph"
    ? activeTab
    : "reference_matching";
}

/**
 * Project the review surface selection. `localPendingKeys` are the
 * controller-tracked local pending operation keys (legacy
 * state.localPendingActions), merged with the snapshot's in-flight keys to
 * reproduce the legacy isOperationPending busy state.
 */
export function projectSynthesisReviewCenterSelection(
  snapshot: SynthesisWorkbenchSnapshot,
  t: SynthesisReviewCenterText,
  localPendingKeys?: Iterable<string>,
): SynthesisWorkbenchReviewCenterSelection {
  const view = narrowReviewCenterSnapshot(snapshot);
  const rawFilters = snapshot.reviews?.filters;
  const filters = {
    activeTab: normalizeActiveTab(rawFilters?.activeTab),
    search: reviewCenterTextValue(rawFilters?.search),
    status: reviewCenterTextValue(rawFilters?.status, "open"),
    kind: reviewCenterTextValue(rawFilters?.kind, "all"),
    confidence: reviewCenterTextValue(rawFilters?.confidence, "all"),
  };
  const lookup = buildRegistryReviewLookup(view);
  const topicTitles = topicTitleById(view);
  const pendingOperationKeys = new Set(view.inFlightOperationKeys);
  for (const key of localPendingKeys || []) {
    const text = reviewCenterTextValue(key);
    if (text) pendingOperationKeys.add(text);
  }
  const proposalPickerMeta: Record<
    string,
    SynthesisReviewCenterPickerProposalView
  > = {};
  const knownProposalIds: string[] = [];
  for (const proposal of view.matchProposals) {
    const proposalId = referenceProposalId(proposal);
    if (!proposalId) continue;
    knownProposalIds.push(proposalId);
    proposalPickerMeta[proposalId] = projectPickerProposalMeta(proposal);
  }
  return {
    filters,
    knownProposalIds,
    proposalPickerMeta,
    referenceMatching: {
      rows: projectReferenceMatchingRows(view, filters, lookup, t),
      cleanupRows: projectCleanupRows(view, filters, t),
    },
    targetCandidates: projectTargetCandidates(view, t),
    concepts: {
      rows: projectConceptRows(view, filters, topicTitles, t),
      reviewMergeTargets: view.conceptReviewMergeTargets,
    },
    topicGraph: {
      rows: projectTopicGraphRows(view, filters, t),
    },
    actionEcho: {
      completedKey: view.lastCompletedKey,
      failedKey: view.lastFailedKey,
    },
    pendingOperationKeys: Array.from(pendingOperationKeys),
  };
}
