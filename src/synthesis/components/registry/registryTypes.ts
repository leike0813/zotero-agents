// Registry (index) surface shared types, narrowing, and pure helpers.
//
// The wire contract keeps the registry host slots (registryRow,
// canonicalReferenceRow, referenceMatchProposalRow, cleanupProposalRow) as
// unknown on the page side; the narrow* functions here are the defensive
// projection the panel model uses to turn the wire registry view into the
// typed selection consumed by RegistryRegion. Display-string resolution
// (enum labels, localized status values, operation pending state) is ported
// from the legacy page (src/synthesisWorkbenchApp.ts :761-860, :1196-1275,
// :7190-7500, :7502-10385) and stays value-faithful to it.

import {
  SYNTHESIS_WORKBENCH_DEFAULT_MESSAGES,
  type SynthesisWorkbenchMessageKey,
} from "../../../shared/synthesisWorkbenchI18nContract";
import type {
  SynthesisWorkbenchHostCommandPayload,
  SynthesisWorkbenchRegistryFilters,
  SynthesisWorkbenchSetFiltersPayload,
} from "../../../shared/synthesisWorkbenchWireContract";

// The region receives the panel model's i18n resolver; re-declared here
// because region components may not import the panel model (import boundary).
export type SynthesisRegistryText = (
  key: SynthesisWorkbenchMessageKey,
  args?: Record<string, unknown>,
) => string;

export type SynthesisRegistryActionSender = (
  action: "setFilters" | "hostCommand",
  payload:
    | SynthesisWorkbenchSetFiltersPayload
    | SynthesisWorkbenchHostCommandPayload,
) => void;

// ---------------------------------------------------------------------------
// Narrow wire views
// ---------------------------------------------------------------------------

export type SynthesisRegistryReferenceView = {
  referenceInstanceId: string;
  title: string;
  rawReference: string;
  year: string;
  referenceIndex?: number;
  bindingStatus: string;
  targetTitle: string;
  targetPaperRef: string;
  targetLiteratureItemId: string;
};

export type SynthesisRegistryRowView = {
  key: string;
  displayId: string;
  title: string;
  year: string;
  indexScope: string;
  artifactCoverage: string;
  missingArtifacts: string[];
  ratingScore?: number;
  needsTagRegulation: boolean;
  libraryId: number;
  itemKey: string;
  referenceCount: number;
  unboundReferenceCount: number;
  references: SynthesisRegistryReferenceView[];
};

export type SynthesisRegistryIdentifierView = {
  kind: string;
  value: string;
};

export type SynthesisCanonicalBindingView = {
  itemKey: string;
  libraryId: string;
  paperRef: string;
  title: string;
  status: string;
};

export type SynthesisCanonicalRedirectEndpoint = {
  canonicalReferenceId: string;
  title: string;
  year: string;
  authors: string[];
  identifiers: SynthesisRegistryIdentifierView[];
};

export type SynthesisCanonicalRedirectView = {
  from: SynthesisCanonicalRedirectEndpoint;
  reason: string;
};

export type SynthesisCanonicalProposalRefView = {
  kind: string;
  status: string;
  sourceTitle: string;
  targetTitle: string;
};

export type SynthesisCanonicalDuplicatePeerView = {
  title: string;
  year: string;
  bindingText: string;
};

export type SynthesisCanonicalRawReferenceView = {
  rawReference: string;
  title: string;
  year: string;
  sourceRef: string;
  referenceIndex: string;
};

export type SynthesisCanonicalActionAvailability = {
  allowed: boolean;
  blockers: string[];
  reason: string;
};

export type SynthesisCanonicalRowView = {
  rowId: string;
  effectiveCanonicalId: string;
  projectedLiteratureItemId: string;
  title: string;
  year: string;
  authors: string[];
  identifiers: SynthesisRegistryIdentifierView[];
  binding: SynthesisCanonicalBindingView;
  graphNodeId: string;
  rawReferenceCount?: number;
  incomingRedirectCount?: number;
  proposalCount?: number;
  openProposalCount?: number;
  possibleDuplicateGroup: string;
  actionAvailability: {
    merge: SynthesisCanonicalActionAvailability;
    edit: SynthesisCanonicalActionAvailability;
    archive: SynthesisCanonicalActionAvailability;
  };
  incomingRedirects: SynthesisCanonicalRedirectView[];
  relatedProposals: SynthesisCanonicalProposalRefView[];
  duplicatePeers: SynthesisCanonicalDuplicatePeerView[];
  rawReferenceSamples: SynthesisCanonicalRawReferenceView[];
};

/**
 * Superset view of referenceMatchProposalRow and cleanupProposalRow: the
 * index review drawer renders both, plus canonical-revision review items
 * carried inside cleanupProposals. Context inputs for the reference-match
 * card (evidence titles, raw reference ids, target ids) are flattened here
 * so the component never touches raw evidence records.
 */
export type SynthesisRegistryProposalView = {
  proposalId: string;
  kind: string;
  reviewKind: string;
  status: string;
  reasons: unknown;
  diagnostics: unknown;
  reason: string;
  decisionSummary: string;
  blockedByReviewItemId: string;
  sourcePaperTitle: string;
  sourcePaperRef: string;
  referenceTitle: string;
  referenceRaw: string;
  provisionalKey: string;
  targetPaperTitle: string;
  targetWorkTitle: string;
  targetPaperRef: string;
  sourceRawReferenceIds: string[];
  targetLibraryId: number;
  targetItemKey: string;
  targetCanonicalReferenceId: string;
  sourceCanonicalReferenceId: string;
  evidenceSourceTitle: string;
  evidenceSourceBindingTitle: string;
  evidenceSourceBindingPaperRef: string;
  evidenceSourceProjectedId: string;
  evidenceTargetTitle: string;
};

// ---------------------------------------------------------------------------
// Reference review state shared with the review center (controller-owned)
// ---------------------------------------------------------------------------

export type SynthesisRegistryReferenceDecisionAction =
  | "accept"
  | "reverse_accept"
  | "reject"
  | "reopen"
  | "delete"
  | "manual_target";

export type SynthesisRegistryPendingDecision = {
  proposalId: string;
  action: SynthesisRegistryReferenceDecisionAction;
  targetLabel?: string;
};

/**
 * Legacy state.pendingReferenceProposalDecisions /
 * state.referenceProposalSubmission / state.optimisticReviewDecisions /
 * state.manualTargetPicker. Owned by the controller because the review
 * center surface shares it; projected into this region read-only.
 */
export type SynthesisRegistryReviewState = {
  pendingDecisions: SynthesisRegistryPendingDecision[];
  applying: boolean;
  applyingProposalIds: string[];
  resolvedKeys: string[];
  manualTargetPickerProposalId?: string;
};

export type SynthesisRegistryAnchorRect = {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
};

// ---------------------------------------------------------------------------
// Selection
// ---------------------------------------------------------------------------

/**
 * Legacy strings without a SynthesisWorkbenchMessageKey. The integration
 * layer resolves them (today: English parity with the legacy page); the
 * component never hardcodes UI copy.
 */
export type SynthesisRegistryStrings = {
  referencesSubtitle: string;
  idColumnLabel: string;
  expandReferencesLabel: string;
  collapseReferencesLabel: string;
  referenceCountTemplate: string;
  loadingReferencesLabel: string;
  artifactDigestTitle: string;
  artifactReferencesTitle: string;
  artifactCitationAnalysisTitle: string;
  artifactLiteratureScoreTitle: string;
  availableLabel: string;
  indexEmptyFilteredTitle: string;
  indexEmptyTitle: string;
  indexEmptyFilteredMessage: string;
  indexEmptyMessage: string;
  referencedEmptyFilteredTitle: string;
  referencedEmptyTitle: string;
  referencedEmptyFilteredMessage: string;
  referencedEmptyMessage: string;
  reviewDrawerTitle: string;
  reviewDrawerZeroOpen: string;
  reviewDrawerEmptyTitle: string;
  reviewDrawerEmptyMessageTemplate: string;
  blockedByLabel: string;
  proposalIdLabel: string;
  indexReviewKindLabel: string;
  cleanupKindLabel: string;
  zoteroDeletionReviewMeta: string;
  zoteroDedupeReviewMeta: string;
  openCleanupMeta: string;
  cleanupBodyFallback: string;
  parentItemFallback: string;
  unresolvedReferenceFallback: string;
  unknownTargetLabel: string;
  unknownParentItemLabel: string;
  unknownReferenceLabel: string;
  fallbackIdSuffix: string;
  proposalKindFallback: string;
  mergeSourcesTemplate: string;
  pendingMergesTemplate: string;
  applyingPendingMergesTemplate: string;
  unavailableLabel: string;
};

/**
 * Region equality input. Contains only this surface's user-visible content:
 * narrowed rows/proposals/canonicals, the rendered filter subset, the cache
 * readiness badge value, the operation keys that toggle this region's busy
 * buttons, the shared reference-review state, and resolved legacy strings.
 * Excluded on purpose: canonicalDiagnostics (never rendered by the legacy
 * index surface), cacheStatus.source_hash/basis_hash/refreshed_at (not
 * rendered), filters.expandedSourceRefs (host echo of this region's own
 * expansion intent), filters.canonicalRedirects/canonicalProposals (declared
 * on the wire but never read by the legacy index surface), and every other
 * snapshot section.
 */
export type SynthesisRegistrySelection = {
  activeIndexTool: string;
  filters: {
    search: string;
    scope: SynthesisWorkbenchRegistryFilters["scope"];
    artifactCoverage: SynthesisWorkbenchRegistryFilters["artifactCoverage"];
    bindingStatus: SynthesisWorkbenchRegistryFilters["bindingStatus"];
    canonicalSearch: string;
    canonicalBinding: SynthesisWorkbenchRegistryFilters["canonicalBinding"];
    canonicalGraph: SynthesisWorkbenchRegistryFilters["canonicalGraph"];
    canonicalDuplicates: SynthesisWorkbenchRegistryFilters["canonicalDuplicates"];
    selectedCanonicalRowId: string;
    reviewDrawerOpen: boolean;
    reviewDrawerIndex: number;
  };
  rows: SynthesisRegistryRowView[];
  visibleRows: SynthesisRegistryRowView[];
  matchProposals: SynthesisRegistryProposalView[];
  cleanupProposals: SynthesisRegistryProposalView[];
  canonicalRows: SynthesisCanonicalRowView[];
  visibleCanonicalRows: SynthesisCanonicalRowView[];
  cacheStatus: string;
  pendingOperationKeys: string[];
  lastCompletedOperationKey: string;
  lastFailedOperationKey: string;
  review: SynthesisRegistryReviewState;
  strings: SynthesisRegistryStrings;
};

// ---------------------------------------------------------------------------
// Primitive helpers (legacy textValue/recordValue/...)
// ---------------------------------------------------------------------------

export function registryText(value: unknown, fallback = ""): string {
  const text = String(value == null ? fallback : value).trim();
  return text || (value == null ? fallback : "");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function recordOf(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {};
}

function stringList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((entry) => registryText(entry)).filter(Boolean);
  }
  const text = registryText(value);
  return text ? [text] : [];
}

function finiteNumber(value: unknown): number | undefined {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function keyPart(value: unknown, fallback = "all"): string {
  return registryText(value, fallback).replace(/\s+/g, "_") || fallback;
}

// ---------------------------------------------------------------------------
// Localization helpers (legacy enumLabel/maybeLocalizedValue/filterOptionLabel)
// ---------------------------------------------------------------------------

const CONTROLLED_ENUM_DOMAINS = [
  "status",
  "kind",
  "reason",
  "relation",
  "action",
  "confidence",
  "coverage",
  "coverage-caveat",
  "freshness",
  "binding-status",
  "priority",
  "graph-node-kind",
  "graph-edge-role",
  "graph-layout",
  "tag-status",
  "tag-density",
  "concept-type",
  "review-tab",
  "sync-status",
  "scope",
] as const;

function enumKeyPart(value: unknown): string {
  return registryText(value)
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/[_\s/]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
}

function humanizeEnumValue(value: unknown): string {
  const text = registryText(value);
  if (!text) return "";
  return text
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function enumMessageKey(domain: string, value: unknown) {
  const keyPartText = enumKeyPart(value);
  if (!keyPartText) return undefined;
  const key =
    `synthesis-enum-${domain}-${keyPartText}` as SynthesisWorkbenchMessageKey;
  return key in SYNTHESIS_WORKBENCH_DEFAULT_MESSAGES ? key : undefined;
}

export function registryEnumLabel(
  t: SynthesisRegistryText,
  domain: (typeof CONTROLLED_ENUM_DOMAINS)[number],
  value: unknown,
  fallback?: string,
): string {
  const key = enumMessageKey(domain, value);
  if (key) return t(key);
  const fallbackText = registryText(fallback);
  if (fallbackText) return fallbackText;
  return humanizeEnumValue(value);
}

export function registryFilterOptionLabel(
  t: SynthesisRegistryText,
  filterKey: SynthesisWorkbenchMessageKey,
  domain: (typeof CONTROLLED_ENUM_DOMAINS)[number],
  value: unknown,
): string {
  return `${t(filterKey)}: ${registryEnumLabel(t, domain, value)}`;
}

export function registryLocalizedValue(
  t: SynthesisRegistryText,
  value: unknown,
): string {
  const text = registryText(value);
  if (!text) return "";
  const normalized = text.replace(/_/g, "-").toLowerCase();
  const statusKey =
    `synthesis-status-${normalized}` as SynthesisWorkbenchMessageKey;
  if (statusKey in SYNTHESIS_WORKBENCH_DEFAULT_MESSAGES) {
    return t(statusKey);
  }
  const relationKey =
    `synthesis-relation-${normalized}` as SynthesisWorkbenchMessageKey;
  if (relationKey in SYNTHESIS_WORKBENCH_DEFAULT_MESSAGES) {
    return t(relationKey);
  }
  for (const domain of CONTROLLED_ENUM_DOMAINS) {
    const key = enumMessageKey(domain, text);
    if (key) return t(key);
  }
  return text;
}

/** Legacy "%name%" template fill for keyless legacy strings. */
export function fillRegistryTemplate(
  template: string,
  vars: Record<string, unknown>,
): string {
  return template.replace(/%([a-zA-Z0-9_]+)%/g, (match, key) => {
    const value = vars[key];
    return value === undefined || value === null ? match : String(value);
  });
}

// ---------------------------------------------------------------------------
// Badge tones (legacy toneFor / registryStatusTone)
// ---------------------------------------------------------------------------

export function registryToneFor(value: unknown): string {
  if (value === "ready" || value === "fresh" || value === "complete") {
    return "ok";
  }
  if (value === "missing" || value === "failed") {
    return "danger";
  }
  return "warn";
}

export function registryStatusTone(value: unknown): string {
  const status = registryText(value);
  if (
    status === "accepted" ||
    status === "approved" ||
    status === "confirmed"
  ) {
    return "blue";
  }
  if (status === "candidate" || status === "stale_target") {
    return "warn";
  }
  if (status === "unbound" || status === "rejected") {
    return "danger";
  }
  return registryToneFor(status);
}

// ---------------------------------------------------------------------------
// Operation pending state (legacy operationKey / operationLabel /
// isOperationPending over the projected pendingOperationKeys)
// ---------------------------------------------------------------------------

function normalizeGraphLayoutAlgorithm(value: unknown): string {
  const algorithm = registryText(value).trim();
  return algorithm === "radial" || algorithm === "components"
    ? algorithm
    : "force";
}

export function registryOperationKey(
  command: string,
  args: Record<string, unknown> = {},
): string {
  if (!command) return "";
  switch (command) {
    case "manualRecomputeLayout":
      return `${command}:${normalizeGraphLayoutAlgorithm(args.algorithm || args.preset)}`;
    case "applyConceptReviewAction":
      return `${command}:${keyPart(args.reviewId)}`;
    case "deleteConceptEntry":
      return `${command}:${keyPart(Array.isArray(args.conceptIds) ? args.conceptIds.join("_") : args.conceptId)}`;
    case "applyTopicGraphReviewAction":
      return `${command}:${keyPart(args.reviewId)}`;
    case "applyReferenceMatchProposalActions":
      return command;
    case "applyCanonicalRevisionReviewAction":
      return `${command}:${keyPart(args.reviewItemId || args.proposalId)}`;
    case "mergeEffectiveCanonicalReference":
      return `${command}:${keyPart(args.sourceEffectiveCanonicalId)}:${keyPart(args.targetEffectiveCanonicalId)}`;
    case "applyCanonicalRevisionMergeRequests":
      return command;
    case "updateCanonicalReferenceMetadata":
    case "archiveCanonicalReference":
      return `${command}:${keyPart(args.canonicalReferenceId)}`;
    case "acceptTopicGraphRelation":
    case "rejectTopicGraphRelation":
      return `decideTopicGraphRelation:${keyPart(args.edgeId)}`;
    case "applyTagVocabularyImport":
      return `${command}:${keyPart(args.action)}`;
    case "updateStagedTagSuggestion":
    case "updateTagVocabularyEntry":
    case "deleteTagVocabularyEntry":
      return `${command}:${keyPart(args.originalTag || args.tag)}`;
    case "promoteStagedTagSuggestions":
    case "discardStagedTagSuggestions":
      return `${command}:${keyPart(args.tag || (Array.isArray(args.tags) ? args.tags.join("_") : ""))}`;
    case "submitTopicSynthesisUpdate":
      return `${command}:${keyPart(args.topicId)}:${keyPart(args.language, "auto")}`;
    case "openTopicArtifact":
    case "exportTopicSynthesisReport":
    case "exportTopicDetailHtml":
    case "deleteTopicArtifact":
    case "resolveTopicPaperDigest":
      return `${command}:${keyPart(args.topicId)}`;
    default:
      return command;
  }
}

export function registryOperationLabel(
  t: SynthesisRegistryText,
  command: string,
): string {
  const key = `synthesis-operation-${command}` as SynthesisWorkbenchMessageKey;
  return key in SYNTHESIS_WORKBENCH_DEFAULT_MESSAGES ? t(key) : command;
}

export function isRegistryOperationPending(
  selection: Pick<SynthesisRegistrySelection, "pendingOperationKeys">,
  command: string,
  args: Record<string, unknown> = {},
): boolean {
  const key = registryOperationKey(command, args);
  return Boolean(key && selection.pendingOperationKeys.indexOf(key) !== -1);
}

// ---------------------------------------------------------------------------
// Narrowing (panel model projection entry points)
// ---------------------------------------------------------------------------

function narrowReference(value: unknown): SynthesisRegistryReferenceView {
  const record = recordOf(value);
  return {
    referenceInstanceId: registryText(record.reference_instance_id),
    title: registryText(record.title),
    rawReference: registryText(record.raw_reference),
    year: registryText(record.year),
    referenceIndex: finiteNumber(record.reference_index),
    bindingStatus: registryText(record.binding_status),
    targetTitle: registryText(record.target_title),
    targetPaperRef: registryText(record.target_paper_ref),
    targetLiteratureItemId: registryText(record.target_literature_item_id),
  };
}

export function narrowRegistryRow(value: unknown): SynthesisRegistryRowView {
  const record = recordOf(value);
  const paperRef = registryText(record.paper_ref);
  const literatureItemId = registryText(record.literature_item_id);
  const ratingScore = finiteNumber(record.ratingScore);
  return {
    key: paperRef || literatureItemId || registryText(record.title),
    displayId: paperRef || literatureItemId || "-",
    title: registryText(record.title),
    year: registryText(record.year),
    indexScope: registryText(record.index_scope),
    artifactCoverage: registryText(record.artifactCoverage),
    missingArtifacts: stringList(record.missing_artifacts),
    ratingScore,
    needsTagRegulation: record.needsTagRegulation === true,
    libraryId: Math.max(0, Math.floor(Number(record.libraryId) || 0)),
    itemKey: registryText(record.itemKey),
    referenceCount: finiteNumber(record.reference_count) ?? 0,
    unboundReferenceCount: finiteNumber(record.unbound_reference_count) ?? 0,
    references: Array.isArray(record.references)
      ? record.references.map(narrowReference)
      : [],
  };
}

export function narrowRegistryRows(value: unknown): SynthesisRegistryRowView[] {
  return Array.isArray(value) ? value.map(narrowRegistryRow) : [];
}

function narrowIdentifiers(
  record: Record<string, unknown>,
): SynthesisRegistryIdentifierView[] {
  const fromList = (
    Array.isArray(record.identifiers_list) ? record.identifiers_list : []
  )
    .filter(isRecord)
    .map((entry) => ({
      kind: registryText(entry.kind),
      value: registryText(entry.value),
    }))
    .filter((entry) => entry.kind || entry.value);
  if (fromList.length) {
    return fromList;
  }
  return Object.entries(recordOf(record.identifiers))
    .map(([kind, value]) => ({ kind, value: registryText(value) }))
    .filter((entry) => entry.kind || entry.value);
}

function narrowActionAvailability(
  value: unknown,
): SynthesisCanonicalActionAvailability {
  const record = recordOf(value);
  return {
    allowed: Boolean(record.allowed),
    blockers: stringList(record.blockers),
    reason: registryText(record.reason),
  };
}

function narrowRedirectEndpoint(
  value: unknown,
): SynthesisCanonicalRedirectEndpoint {
  const record = recordOf(value);
  return {
    canonicalReferenceId: registryText(record.canonical_reference_id),
    title: registryText(record.title),
    year: registryText(record.year),
    authors: stringList(record.authors),
    identifiers: narrowIdentifiers(record),
  };
}

export function narrowCanonicalRow(value: unknown): SynthesisCanonicalRowView {
  const record = recordOf(value);
  const binding = recordOf(record.binding);
  const availability = recordOf(record.action_availability);
  return {
    rowId:
      registryText(record.row_id) ||
      registryText(record.projected_literature_item_id) ||
      registryText(record.effective_canonical_id),
    effectiveCanonicalId: registryText(record.effective_canonical_id),
    projectedLiteratureItemId: registryText(
      record.projected_literature_item_id,
    ),
    title: registryText(record.title),
    year: registryText(record.year),
    authors: stringList(record.authors),
    identifiers: narrowIdentifiers(record),
    binding: {
      itemKey: registryText(binding.itemKey),
      libraryId: registryText(binding.libraryId),
      paperRef: registryText(binding.paperRef),
      title: registryText(binding.title),
      status: registryText(binding.status),
    },
    graphNodeId: registryText(record.graph_node_id),
    rawReferenceCount: finiteNumber(record.raw_reference_count),
    incomingRedirectCount: finiteNumber(record.incoming_redirect_count),
    proposalCount: finiteNumber(record.proposal_count),
    openProposalCount: finiteNumber(record.open_proposal_count),
    possibleDuplicateGroup: registryText(record.possible_duplicate_group),
    actionAvailability: {
      merge: narrowActionAvailability(availability.merge),
      edit: narrowActionAvailability(availability.edit),
      archive: narrowActionAvailability(availability.archive),
    },
    incomingRedirects: (Array.isArray(record.incoming_redirects)
      ? record.incoming_redirects
      : []
    )
      .filter(isRecord)
      .map((redirect) => ({
        from: narrowRedirectEndpoint(redirect.from),
        reason: registryText(redirect.reason),
      }))
      .filter((redirect) => redirect.from.canonicalReferenceId),
    relatedProposals: (Array.isArray(record.related_proposals)
      ? record.related_proposals
      : []
    )
      .filter(isRecord)
      .map((proposal) => ({
        kind: registryText(proposal.kind),
        status: registryText(proposal.status),
        sourceTitle: registryText(recordOf(proposal.source).title),
        targetTitle: registryText(recordOf(proposal.target).title),
      })),
    duplicatePeers: (Array.isArray(record.duplicate_peers)
      ? record.duplicate_peers
      : []
    )
      .filter(isRecord)
      .map((peer) => ({
        title: registryText(peer.title),
        year: registryText(peer.year),
        bindingText: registryText(peer.binding),
      })),
    rawReferenceSamples: (Array.isArray(record.raw_reference_samples)
      ? record.raw_reference_samples
      : []
    )
      .filter(isRecord)
      .map((ref) => ({
        rawReference: registryText(ref.raw_reference),
        title: registryText(ref.title),
        year: registryText(ref.year),
        sourceRef: registryText(ref.source_ref),
        referenceIndex: registryText(ref.reference_index),
      })),
  };
}

export function narrowCanonicalRows(
  value: unknown,
): SynthesisCanonicalRowView[] {
  return Array.isArray(value) ? value.map(narrowCanonicalRow) : [];
}

export function narrowRegistryProposal(
  value: unknown,
): SynthesisRegistryProposalView {
  const record = recordOf(value);
  const evidence = recordOf(record.evidence);
  const sourceEvidence = recordOf(evidence.source);
  const targetEvidence = recordOf(evidence.target);
  const sourceBinding = recordOf(sourceEvidence.binding);
  return {
    proposalId: registryText(record.proposal_id),
    kind: registryText(record.kind),
    reviewKind: registryText(record.review_kind || record.kind),
    status: registryText(record.status),
    reasons: record.reasons,
    diagnostics: record.diagnostics,
    reason: registryText(record.reason),
    decisionSummary: registryText(record.decision_summary),
    blockedByReviewItemId: registryText(record.blocked_by_review_item_id),
    sourcePaperTitle: registryText(record.source_paper_title),
    sourcePaperRef: registryText(record.source_paper_ref),
    referenceTitle: registryText(record.reference_title),
    referenceRaw: registryText(record.reference_raw),
    provisionalKey: registryText(record.provisional_key),
    targetPaperTitle: registryText(record.target_paper_title),
    targetWorkTitle: registryText(record.target_work_title),
    targetPaperRef: registryText(record.target_paper_ref),
    sourceRawReferenceIds: Array.isArray(record.source_raw_reference_ids)
      ? record.source_raw_reference_ids
          .map((entry) => registryText(entry))
          .filter(Boolean)
      : [],
    targetLibraryId: Math.max(
      0,
      Math.floor(Number(record.target_library_id || 0)),
    ),
    targetItemKey: registryText(record.target_item_key),
    targetCanonicalReferenceId: registryText(
      record.target_canonical_reference_id,
    ),
    sourceCanonicalReferenceId: registryText(
      record.source_canonical_reference_id,
    ),
    evidenceSourceTitle:
      registryText(sourceEvidence.title) ||
      registryText(sourceEvidence.normalized_title),
    evidenceSourceBindingTitle: registryText(sourceBinding.title),
    evidenceSourceBindingPaperRef: registryText(sourceBinding.paper_ref),
    evidenceSourceProjectedId: registryText(
      sourceEvidence.projected_literature_item_id,
    ),
    evidenceTargetTitle:
      registryText(targetEvidence.title) ||
      registryText(targetEvidence.normalized_title),
  };
}

export function narrowRegistryProposals(
  value: unknown,
): SynthesisRegistryProposalView[] {
  return Array.isArray(value) ? value.map(narrowRegistryProposal) : [];
}

// ---------------------------------------------------------------------------
// Derived view helpers (component-side, value-faithful to the legacy page)
// ---------------------------------------------------------------------------

export function registryReferencePrimaryTitle(
  reference: SynthesisRegistryReferenceView,
  untitledLabel: string,
): string {
  return (
    reference.targetTitle ||
    reference.title ||
    reference.rawReference ||
    reference.referenceInstanceId ||
    reference.targetPaperRef ||
    reference.targetLiteratureItemId ||
    untitledLabel
  );
}

export function registryReferenceDisplayIndex(
  reference: SynthesisRegistryReferenceView,
): string {
  const index = reference.referenceIndex;
  return typeof index === "number"
    ? `#${Math.max(0, Math.floor(index)) + 1}`
    : "";
}

export function registryReferenceDisplayId(
  reference: SynthesisRegistryReferenceView,
): string {
  return (
    reference.targetPaperRef ||
    reference.targetLiteratureItemId ||
    reference.referenceInstanceId ||
    "-"
  );
}

export function registryReferenceReadableTitle(
  reference: SynthesisRegistryReferenceView,
  untitledLabel: string,
): string {
  return (
    reference.title ||
    reference.rawReference ||
    reference.referenceInstanceId ||
    untitledLabel
  );
}

/** Legacy hasRegistryArtifact: coverage shortcuts, else missing_artifacts. */
export function registryHasArtifact(
  row: SynthesisRegistryRowView,
  artifact: string,
): boolean {
  if (row.artifactCoverage === "complete") return true;
  if (row.artifactCoverage === "missing") return false;
  return row.missingArtifacts.indexOf(artifact) === -1;
}

/** Legacy registryReferencedEntries over the narrowed visible rows. */
export function registryReferencedEntries(selection: {
  filters: { search: string; bindingStatus: string };
  visibleRows: SynthesisRegistryRowView[];
}): Array<{
  source: SynthesisRegistryRowView;
  reference: SynthesisRegistryReferenceView;
}> {
  const query = selection.filters.search.toLowerCase();
  const bindingFilter = selection.filters.bindingStatus || "all";
  return selection.visibleRows
    .flatMap((source) =>
      source.references.map((reference) => ({ source, reference })),
    )
    .filter(({ source, reference }) => {
      const bindingStatus = reference.bindingStatus || "unbound";
      if (bindingFilter !== "all" && bindingStatus !== bindingFilter) {
        return false;
      }
      if (!query) return true;
      const haystack = [
        source.title,
        source.key,
        reference.title,
        reference.rawReference,
        reference.targetTitle,
        reference.targetPaperRef,
        reference.referenceInstanceId,
      ]
        .map((value) => value.toLowerCase())
        .join(" ");
      return haystack.indexOf(query) !== -1;
    })
    .sort(
      (left, right) =>
        registryReferencePrimaryTitle(left.reference, "").localeCompare(
          registryReferencePrimaryTitle(right.reference, ""),
        ) || left.source.title.localeCompare(right.source.title),
    );
}

// ---------------------------------------------------------------------------
// Review lookup + reference match context (legacy buildRegistryReviewLookup /
// referenceMatchProposalContext)
// ---------------------------------------------------------------------------

export type SynthesisRegistryReviewLookup = {
  sourceByRawReferenceId: Map<
    string,
    {
      source: SynthesisRegistryRowView;
      reference: SynthesisRegistryReferenceView;
    }
  >;
  rowByPaperRef: Map<string, SynthesisRegistryRowView>;
  rowByItemKey: Map<string, SynthesisRegistryRowView>;
};

export function buildRegistryReviewLookup(
  rows: SynthesisRegistryRowView[],
): SynthesisRegistryReviewLookup {
  const sourceByRawReferenceId = new Map<
    string,
    {
      source: SynthesisRegistryRowView;
      reference: SynthesisRegistryReferenceView;
    }
  >();
  const rowByPaperRef = new Map<string, SynthesisRegistryRowView>();
  const rowByItemKey = new Map<string, SynthesisRegistryRowView>();
  for (const row of rows) {
    if (row.key && row.key === row.displayId) {
      rowByPaperRef.set(row.key, row);
      const itemKey = row.key.split(":").pop() || "";
      if (itemKey) {
        rowByItemKey.set(itemKey, row);
      }
    }
    for (const reference of row.references) {
      if (reference.referenceInstanceId) {
        sourceByRawReferenceId.set(reference.referenceInstanceId, {
          source: row,
          reference,
        });
      }
    }
  }
  return { sourceByRawReferenceId, rowByPaperRef, rowByItemKey };
}

export type SynthesisRegistryProposalContext = {
  sourceReferenceTitle: string;
  parentItemTitle: string;
  targetPaperTitle: string;
  targetPaperRef: string;
};

export function registryMatchProposalContext(
  proposal: SynthesisRegistryProposalView,
  lookup: SynthesisRegistryReviewLookup,
  strings: Pick<
    SynthesisRegistryStrings,
    | "unknownTargetLabel"
    | "unknownParentItemLabel"
    | "unknownReferenceLabel"
    | "fallbackIdSuffix"
  >,
  untitledReferenceLabel: string,
): SynthesisRegistryProposalContext {
  const sourceMatch = proposal.sourceRawReferenceIds
    .map((id) => lookup.sourceByRawReferenceId.get(id))
    .find(Boolean);
  const targetRef = proposal.targetItemKey
    ? `${
        proposal.targetLibraryId > 0 ? Math.floor(proposal.targetLibraryId) : ""
      }:${proposal.targetItemKey}`.replace(/^:/, "")
    : "";
  const targetRow =
    (targetRef ? lookup.rowByPaperRef.get(targetRef) : undefined) ||
    lookup.rowByItemKey.get(proposal.targetItemKey);
  const targetFallback =
    targetRef ||
    proposal.targetItemKey ||
    proposal.evidenceTargetTitle ||
    proposal.targetCanonicalReferenceId ||
    strings.unknownTargetLabel;
  const sourceBindingTitle =
    proposal.evidenceSourceBindingTitle ||
    proposal.evidenceSourceBindingPaperRef ||
    proposal.evidenceSourceProjectedId;
  const sourceRowTitle = sourceMatch ? sourceMatch.source.title : "";
  const sourceRowRef = sourceMatch ? sourceMatch.source.key : "";
  const sourceRowTitleIsFallback =
    !sourceRowTitle ||
    sourceRowTitle === sourceRowRef ||
    sourceRowTitle === proposal.sourceCanonicalReferenceId ||
    sourceRowTitle.endsWith(strings.fallbackIdSuffix);
  const parentItemTitle = sourceRowTitleIsFallback
    ? sourceBindingTitle ||
      proposal.evidenceSourceTitle ||
      sourceRowTitle ||
      strings.unknownParentItemLabel
    : sourceRowTitle;
  return {
    sourceReferenceTitle: sourceMatch
      ? registryReferenceReadableTitle(
          sourceMatch.reference,
          untitledReferenceLabel,
        )
      : proposal.evidenceSourceTitle ||
        proposal.sourceCanonicalReferenceId ||
        strings.unknownReferenceLabel,
    parentItemTitle,
    targetPaperTitle: targetRow
      ? targetRow.title || targetFallback
      : proposal.evidenceTargetTitle ||
        `${targetFallback} ${strings.fallbackIdSuffix}`,
    targetPaperRef: targetRow ? targetRow.displayId : targetFallback,
  };
}

// ---------------------------------------------------------------------------
// Review item filtering (legacy openReferenceMatchProposals /
// openIndexCleanupProposals / indexReviewItems / isReviewOptimisticallyResolved)
// ---------------------------------------------------------------------------

export function isRegistryReviewResolved(
  review: Pick<SynthesisRegistryReviewState, "resolvedKeys">,
  kind: string,
  id: unknown,
): boolean {
  return review.resolvedKeys.indexOf(`${kind}:${keyPart(id)}`) !== -1;
}

export type SynthesisRegistryReviewItem =
  | {
      type: "reference_match";
      id: string;
      proposal: SynthesisRegistryProposalView;
    }
  | { type: "cleanup"; id: string; proposal: SynthesisRegistryProposalView };

export function indexReviewItems(selection: {
  matchProposals: SynthesisRegistryProposalView[];
  cleanupProposals: SynthesisRegistryProposalView[];
  review: SynthesisRegistryReviewState;
}): SynthesisRegistryReviewItem[] {
  const pendingIds = new Set(
    selection.review.pendingDecisions.map((decision) => decision.proposalId),
  );
  const openMatches = selection.matchProposals.filter(
    (proposal) =>
      proposal.status === "open" &&
      !pendingIds.has(proposal.proposalId) &&
      !isRegistryReviewResolved(
        selection.review,
        "reference-match",
        proposal.proposalId,
      ),
  );
  const openCleanups = selection.cleanupProposals.filter(
    (proposal) =>
      proposal.status === "open" &&
      !isRegistryReviewResolved(
        selection.review,
        "cleanup",
        proposal.proposalId,
      ),
  );
  return [
    ...openMatches.map(
      (proposal): SynthesisRegistryReviewItem => ({
        type: "reference_match",
        id: proposal.proposalId,
        proposal,
      }),
    ),
    ...openCleanups.map(
      (proposal): SynthesisRegistryReviewItem => ({
        type: "cleanup",
        id: proposal.proposalId,
        proposal,
      }),
    ),
  ].filter((item) => item.id);
}

export function isCanonicalRevisionProposal(
  proposal: SynthesisRegistryProposalView,
): boolean {
  return proposal.reviewKind === "canonical_revision";
}

export function isReferenceDecisionSubmitting(
  review: Pick<
    SynthesisRegistryReviewState,
    "applying" | "applyingProposalIds"
  >,
  proposalId?: string,
): boolean {
  if (!review.applying) return false;
  if (!proposalId) return true;
  return review.applyingProposalIds.indexOf(proposalId) !== -1;
}

// ---------------------------------------------------------------------------
// Review metadata values (legacy hasStructuredContent / compactReviewValue)
// ---------------------------------------------------------------------------

function hasStructuredContent(value: unknown): boolean {
  if (Array.isArray(value)) return value.length > 0;
  if (isRecord(value)) {
    return (
      Object.entries(value).filter(([, entry]) => {
        if (Array.isArray(entry)) return entry.length > 0;
        if (isRecord(entry)) return Object.keys(entry).length > 0;
        return !!registryText(entry);
      }).length > 0
    );
  }
  return !!registryText(value);
}

function firstText(
  row: Record<string, unknown>,
  keys: string[],
  fallback = "",
): string {
  for (const key of keys) {
    const value = registryText(row[key]);
    if (value) return value;
  }
  return fallback;
}

export function compactRegistryReviewValue(
  t: SynthesisRegistryText,
  value: unknown,
): string {
  if (Array.isArray(value)) {
    return value
      .map((entry) => {
        if (isRecord(entry)) {
          return (
            firstText(entry, ["label", "title", "tag", "id", "code"]) ||
            JSON.stringify(entry)
          );
        }
        return registryLocalizedValue(t, entry) || registryText(entry);
      })
      .filter(Boolean)
      .slice(0, 4)
      .join(", ");
  }
  if (isRecord(value)) {
    return (
      firstText(value, ["message", "summary", "label", "title", "code"]) ||
      JSON.stringify(value)
    );
  }
  return registryText(value, "-");
}

export function visibleReviewDetails(
  fields: Array<[string, unknown]>,
): Array<[string, unknown]> {
  return fields.filter(([, value]) => hasStructuredContent(value));
}

// ---------------------------------------------------------------------------
// Canonical workbench helpers
// ---------------------------------------------------------------------------

export function canonicalRowBindingLabel(
  row: SynthesisCanonicalRowView,
  externalLabel: string,
): string {
  return row.binding.itemKey
    ? row.binding.paperRef || `${row.binding.libraryId}:${row.binding.itemKey}`
    : externalLabel;
}

export function canonicalActionBlockersText(
  availability: SynthesisCanonicalActionAvailability,
  unavailableLabel: string,
): string {
  return (
    availability.blockers.join(", ") || availability.reason || unavailableLabel
  );
}

export function referenceTargetCandidateGroup(title: string): string {
  const first = registryText(title).trim().charAt(0).toUpperCase();
  return /^[A-Z]$/.test(first) ? first : "#";
}

/** Legacy scrollReferenceTargetListToGroup over a rendered table wrap. */
export function scrollRegistryListToGroup(
  list: HTMLElement,
  group: string,
): void {
  const target =
    list.querySelector<HTMLElement>(
      `[data-reference-target-group-start="${group}"]`,
    ) ||
    list.querySelector<HTMLElement>(`[data-reference-target-group="${group}"]`);
  if (!target) return;
  const heading = list.querySelector<HTMLElement>(
    `[data-reference-target-group="${group}"]`,
  );
  const top = Math.max(0, target.offsetTop - (heading?.offsetHeight || 0) - 4);
  if (typeof list.scrollTo === "function") {
    list.scrollTo({ top, behavior: "auto" });
    return;
  }
  list.scrollTop = top;
}

// ---------------------------------------------------------------------------
// Canonical metadata edit drafts (legacy CanonicalEditDraft helpers)
// ---------------------------------------------------------------------------

export type SynthesisCanonicalEditDraft = {
  title: string;
  year: string;
  authorsText: string;
  identifiers: SynthesisRegistryIdentifierView[];
};

export type SynthesisCanonicalDraftSource = {
  title: string;
  year: string;
  authors: string[];
  identifiers: SynthesisRegistryIdentifierView[];
};

export function canonicalEditDraftFromRecord(
  record: SynthesisCanonicalDraftSource,
): SynthesisCanonicalEditDraft {
  return {
    title: record.title,
    year: record.year,
    authorsText: record.authors.join("\n"),
    identifiers: record.identifiers.map((entry) => ({ ...entry })),
  };
}

function canonicalEditComparableDraft(draft: SynthesisCanonicalEditDraft) {
  return {
    title: draft.title.trim(),
    year: draft.year.trim(),
    authors: draft.authorsText
      .split(/\r?\n/)
      .map((entry) => entry.trim())
      .filter(Boolean),
    identifiers: draft.identifiers
      .map((entry) => ({ kind: entry.kind.trim(), value: entry.value.trim() }))
      .filter((entry) => entry.kind || entry.value),
  };
}

export function canonicalEditDraftIsDirty(
  record: SynthesisCanonicalDraftSource,
  draft: SynthesisCanonicalEditDraft | undefined,
): boolean {
  if (!draft) return false;
  return (
    JSON.stringify(canonicalEditComparableDraft(draft)) !==
    JSON.stringify(
      canonicalEditComparableDraft(canonicalEditDraftFromRecord(record)),
    )
  );
}

export function canonicalEditPatch(draft: SynthesisCanonicalEditDraft) {
  const comparable = canonicalEditComparableDraft(draft);
  const identifiers: Record<string, string> = {};
  comparable.identifiers.forEach((entry) => {
    if (entry.kind && entry.value) {
      identifiers[entry.kind] = entry.value;
    }
  });
  return {
    title: comparable.title,
    year: comparable.year,
    authors: comparable.authors,
    identifiers,
  };
}
