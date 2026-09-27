/** @jsxRuntime automatic */
/** @jsxImportSource preact */
import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "preact/hooks";
import { memo } from "preact/compat";

import { equalBySignature } from "../../../shared/regionEquality";
import type {
  SynthesisWorkbenchActionName,
  SynthesisWorkbenchHostCommandName,
} from "../../../shared/synthesisWorkbenchWireContract";
import { filterReviewCenterTargetCandidates } from "./reviewCenterProjection";
import {
  reviewCenterKeyPart,
  reviewCenterOperationLabel,
  reviewCenterProposalActionLabel,
  reviewCenterUiText,
  reviewCenterEnumLabel,
  reviewCenterFilterOptionLabel,
  reviewCenterTextValue,
  type SynthesisReviewCenterProposalAction,
  type SynthesisReviewCenterText,
} from "./reviewCenterText";
import {
  ReviewTargetPickerOverlay,
  type ReviewCenterManualTargetAnchorRect,
} from "./ReviewTargetPicker";

// Review center surface of the synthesis workbench (legacy
// renderReviewCenter + renderReviewCenterToolbar +
// renderReferenceMatchingReviewTable + the manual-target picker,
// src/synthesisWorkbenchApp.ts :10386-11844). The panel model projects the
// wire view into the selection below via ./reviewCenterProjection; this
// component renders the selection, owns the page-local UI state the legacy
// page kept in `state` (proposal selection, queued decisions, batch
// submission tracking, canonical-revision optimistic decisions, concept merge
// row expansion, picker open state) and reports intents through onAction.
//
// Action surface (names + payloads frozen from the legacy page):
//   setFilters  { reviews: { activeTab | search | status | kind | confidence } }
//   setFilters  { concepts: { reviewMergeTargets: { ...current, [reviewId] } } }
//   hostCommand { command: "applyReferenceMatchProposalActions",
//                 args: { decisions: [{ proposalId, action, target?, targetLabel? }] } }
//   hostCommand { command: "applyConceptReviewAction",
//                 args: { reviewId, action, targetConceptId? } }
//   hostCommand { command: "acceptTopicGraphRelation", args: { edgeId } }
//   hostCommand { command: "rejectTopicGraphRelation", args: { edgeId } }
//   hostCommand { command: "applyTopicGraphReviewAction",
//                 args: { reviewId, action } }
//   hostCommand { command: "applyCanonicalRevisionReviewAction",
//                 args: { reviewItemId, action } }

// ---------------------------------------------------------------------------
// Selection (region equality input; render-ready, resolved by the projection)
// ---------------------------------------------------------------------------

export type SynthesisReviewCenterActiveTab =
  | "reference_matching"
  | "concepts"
  | "topic_graph";

export type SynthesisReviewCenterFiltersView = {
  activeTab: SynthesisReviewCenterActiveTab;
  search: string;
  status: string;
  kind: string;
  confidence: string;
};

export type SynthesisReviewCenterProposalRowView = {
  proposalId: string;
  kind: string;
  kindText: string;
  status: string;
  statusText: string;
  statusTone: string;
  reasonsText: string;
  updatedAtText: string;
  sourceText: string;
  targetText: string;
  parentText: string;
};

export type SynthesisReviewCenterCleanupRowView = {
  rowKey: string;
  proposalId: string;
  kindText: string;
  status: string;
  statusText: string;
  statusTone: string;
  updatedAtText: string;
  sourceText: string;
  targetText: string;
  parentText: string;
  reasonText: string;
  canonicalRevision: boolean;
};

export type SynthesisReviewCenterTargetCandidateView = {
  key: string;
  kind: string;
  label: string;
  meta: string;
  bindingStatus: string;
  bindingLabel: string;
  group: string;
  projectedId: string;
  canonicalReferenceId: string;
  libraryId: number;
  itemKey: string;
};

/** Per-proposal manual-target picker exclusion fields (unfiltered). */
export type SynthesisReviewCenterPickerProposalView = {
  kind: string;
  targetItemKey: string;
  targetCanonicalId: string;
  sourceCanonicalId: string;
  targetProjectedId: string;
  sourceProjectedId: string;
};

export type SynthesisReviewCenterConceptCandidateView = {
  id: string;
  name: string;
};

export type SynthesisReviewCenterConceptRowView = {
  reviewId: string;
  labelText: string;
  candidates: SynthesisReviewCenterConceptCandidateView[];
  reason: string;
  reasonText: string;
  confidenceText: string;
  status: string;
  statusText: string;
  statusTone: string;
  topicText: string;
};

export type SynthesisReviewCenterTopicGraphRowView = {
  rowKind: "edge" | "review_item";
  reviewId: string;
  edgeId: string;
  sourceText: string;
  relationText: string;
  targetText: string;
  reasonText: string;
  confidenceText: string;
  evidencePills: Array<{ text: string; title: string }>;
  status: string;
  statusText: string;
  statusTone: string;
};

export type SynthesisWorkbenchReviewCenterSelection = {
  filters: SynthesisReviewCenterFiltersView;
  // All match proposal ids (unfiltered): reconciles the local pending /
  // selection / picker state against the latest snapshot (legacy
  // pruneReferenceProposalUiState + the picker's proposal-exists check).
  knownProposalIds: string[];
  proposalPickerMeta: Record<string, SynthesisReviewCenterPickerProposalView>;
  referenceMatching: {
    rows: SynthesisReviewCenterProposalRowView[];
    cleanupRows: SynthesisReviewCenterCleanupRowView[];
  };
  targetCandidates: SynthesisReviewCenterTargetCandidateView[];
  concepts: {
    rows: SynthesisReviewCenterConceptRowView[];
    reviewMergeTargets: Record<string, string>;
  };
  topicGraph: {
    rows: SynthesisReviewCenterTopicGraphRowView[];
  };
  // snapshot.actions echo keys: drive this region's visible pending-badge /
  // applying-spinner clearing (legacy clearResolvedLocalPending).
  actionEcho: { completedKey: string; failedKey: string };
  // Operation keys currently pending (snapshot in-flight + controller-local),
  // reproducing the legacy isOperationPending busy state on command buttons.
  pendingOperationKeys: string[];
};

export type SynthesisReviewCenterManualTarget =
  | { kind: "zotero_item"; libraryId: number; itemKey: string }
  | { kind: "canonical_reference"; canonicalReferenceId: string };

export type { SynthesisReviewCenterProposalAction };

export type SynthesisReviewCenterActionSender = (
  action: SynthesisWorkbenchActionName,
  payload?: Record<string, unknown>,
) => void;

export type SynthesisReviewCenterPendingReferenceDecision = {
  proposalId: string;
  action: SynthesisReviewCenterProposalAction;
  target?: SynthesisReviewCenterManualTarget;
  targetLabel?: string;
};

export type SynthesisReviewCenterManualTargetPickerState = {
  proposalId: string;
  sourceTitle: string;
  anchorRect?: ReviewCenterManualTargetAnchorRect;
};

export type SynthesisReviewCenterReferenceReviewState = {
  /** Full decisions, including manual target data needed at apply time. */
  pendingDecisions: readonly SynthesisReviewCenterPendingReferenceDecision[];
  applying: boolean;
  applyingProposalIds: readonly string[];
  /** Registry-compatible resolved keys, e.g. `cleanup:<reviewItemId>`. */
  resolvedKeys: readonly string[];
  manualTargetPicker?: SynthesisReviewCenterManualTargetPickerState | null;
};

export type SynthesisReviewCenterReferenceReviewHandlers = {
  onQueueDecision: (
    proposalId: string,
    action: SynthesisReviewCenterProposalAction,
    options?: {
      target?: SynthesisReviewCenterManualTarget;
      targetLabel?: string;
    },
  ) => void;
  onQueueDecisions?: (
    decisions: readonly SynthesisReviewCenterPendingReferenceDecision[],
  ) => void;
  onCancelDecision: (proposalId: string) => void;
  onApplyPending: (
    decisions: readonly SynthesisReviewCenterPendingReferenceDecision[],
  ) => void;
  onClearPending: () => void;
  onOpenManualTargetPicker: (
    proposalId: string,
    sourceTitle: string,
    anchorRect?: ReviewCenterManualTargetAnchorRect,
  ) => void;
  onCloseManualTargetPicker: () => void;
  onMarkCanonicalResolved?: (reviewItemId: string) => void;
};

/**
 * Optional controller-owned reference-review state. When supplied, this is
 * the single queue/submission/picker owner shared with Registry; the region
 * only projects it and emits semantic intents through the handlers.
 */
export type SynthesisReviewCenterReferenceReviewControl = {
  state: SynthesisReviewCenterReferenceReviewState;
  handlers: SynthesisReviewCenterReferenceReviewHandlers;
};

export type ReviewCenterRegionProps = {
  selection: SynthesisWorkbenchReviewCenterSelection;
  t: SynthesisReviewCenterText;
  onAction: SynthesisReviewCenterActionSender;
  referenceReview?: SynthesisReviewCenterReferenceReviewControl;
};

type PendingReferenceDecision = SynthesisReviewCenterPendingReferenceDecision;
type ManualTargetPickerState = SynthesisReviewCenterManualTargetPickerState;

function equalReferenceReviewControl(
  previous: SynthesisReviewCenterReferenceReviewControl | undefined,
  next: SynthesisReviewCenterReferenceReviewControl | undefined,
): boolean {
  if (previous === next) return true;
  if (!previous || !next) return false;
  return (
    previous.handlers.onQueueDecision === next.handlers.onQueueDecision &&
    previous.handlers.onQueueDecisions === next.handlers.onQueueDecisions &&
    previous.handlers.onCancelDecision === next.handlers.onCancelDecision &&
    previous.handlers.onApplyPending === next.handlers.onApplyPending &&
    previous.handlers.onClearPending === next.handlers.onClearPending &&
    previous.handlers.onOpenManualTargetPicker ===
      next.handlers.onOpenManualTargetPicker &&
    previous.handlers.onCloseManualTargetPicker ===
      next.handlers.onCloseManualTargetPicker &&
    previous.handlers.onMarkCanonicalResolved ===
      next.handlers.onMarkCanonicalResolved &&
    equalBySignature(previous.state, next.state)
  );
}

// ---------------------------------------------------------------------------
// Local helpers
// ---------------------------------------------------------------------------

/** Legacy operationKey, restricted to the commands this surface dispatches. */
function reviewCenterOperationKey(
  command: string,
  args: Record<string, unknown> = {},
): string {
  if (!command) return "";
  switch (command) {
    case "applyConceptReviewAction":
      return `${command}:${reviewCenterKeyPart(args.reviewId)}`;
    case "applyTopicGraphReviewAction":
      return `${command}:${reviewCenterKeyPart(args.reviewId)}`;
    case "applyReferenceMatchProposalActions":
      return command;
    case "applyCanonicalRevisionReviewAction":
      return `${command}:${reviewCenterKeyPart(args.reviewItemId || args.proposalId)}`;
    case "acceptTopicGraphRelation":
    case "rejectTopicGraphRelation":
      return `decideTopicGraphRelation:${reviewCenterKeyPart(args.edgeId)}`;
    default:
      return command;
  }
}

const REFERENCE_BATCH_OPERATION_KEY = "applyReferenceMatchProposalActions";
const CANONICAL_REVISION_OPERATION_PREFIX =
  "applyCanonicalRevisionReviewAction";

const REFERENCE_TABLE_HEADERS: Array<[string, string]> = [
  ["Source", ""],
  ["Target", ""],
  ["Parent item", ""],
  ["Kind", "review-cell-center review-kind-cell"],
  ["Reasons", "review-cell-center review-reason-cell"],
  ["Status", "review-cell-center review-status-cell"],
  ["Updated", "review-cell-center review-updated-cell"],
  ["Actions", "review-action-cell"],
];

const CONCEPT_TABLE_HEADERS: Array<[string, string]> = [
  ["Label", ""],
  ["Target Candidates", ""],
  ["Reason", "review-cell-center review-reason-cell"],
  ["Confidence", "review-cell-center review-confidence-cell"],
  ["Status", "review-cell-center review-status-cell"],
  ["Topic", ""],
  ["Actions", "review-action-cell"],
];

const TOPIC_GRAPH_TABLE_HEADERS: Array<[string, string]> = [
  ["Source", ""],
  ["Relation", ""],
  ["Target", ""],
  ["Reason", ""],
  ["Confidence", "review-cell-center review-confidence-cell"],
  ["Evidence", ""],
  ["Status", "review-cell-center review-status-cell"],
  ["Action", "review-action-cell"],
];

function anchorRectOf(anchor: HTMLElement): ReviewCenterManualTargetAnchorRect {
  const rect = anchor.getBoundingClientRect();
  return {
    left: rect.left,
    top: rect.top,
    right: rect.right,
    bottom: rect.bottom,
    width: rect.width,
    height: rect.height,
  };
}

function eventCurrentTargetElement(event: MouseEvent): HTMLElement | undefined {
  const target = event.currentTarget as HTMLElement | null;
  return target && typeof target.getBoundingClientRect === "function"
    ? target
    : undefined;
}

// ---------------------------------------------------------------------------
// Shared presentational pieces
// ---------------------------------------------------------------------------

function ReviewBadge(props: {
  text: string;
  tone?: string;
  extraClass?: string;
}) {
  const className = `badge${props.tone ? ` ${props.tone}` : ""}${
    props.extraClass ? ` ${props.extraClass}` : ""
  }`;
  return <span class={className}>{props.text}</span>;
}

function ReviewEmptyState(props: {
  title: string;
  message?: string;
  surface?: string;
}) {
  return (
    <div
      class="empty-state empty-state-info"
      {...(props.surface ? { "data-synthesis-surface": props.surface } : {})}
    >
      <strong class="empty-state-title">{props.title}</strong>
      {props.message ? (
        <p class="empty-state-message">{props.message}</p>
      ) : null}
    </div>
  );
}

function ReviewSelect(props: {
  options: Array<[string, string]>;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <select
      value={props.value}
      onChange={(event) =>
        props.onChange((event.target as HTMLSelectElement).value)
      }
    >
      {props.options.map(([optionValue, label]) => (
        <option key={optionValue} value={optionValue}>
          {label}
        </option>
      ))}
    </select>
  );
}

// Legacy search input: per-keystroke "input" dispatch, with the host-echoed
// filter value written back on snapshot renders (legacy assigns
// search.value = filters.search on every full render).
function ReviewSearchInput(props: {
  value: string;
  placeholder: string;
  onSearch: (value: string) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  useLayoutEffect(() => {
    const input = ref.current;
    if (input && input.value !== props.value) {
      input.value = props.value;
    }
  }, [props.value]);
  return (
    <input
      ref={ref}
      defaultValue={props.value}
      placeholder={props.placeholder}
      onInput={(event) =>
        props.onSearch((event.target as HTMLInputElement).value)
      }
    />
  );
}

// Legacy makeButton: hostCommand button with operation-pending busy state.
function ReviewCommandButton(props: {
  label: string;
  command: SynthesisWorkbenchHostCommandName;
  args?: Record<string, unknown>;
  disabled?: boolean;
  pendingOperationKeys: string[];
  t: SynthesisReviewCenterText;
  onAction: SynthesisReviewCenterActionSender;
  onDispatch?: () => void;
}) {
  const args = props.args || {};
  const key = reviewCenterOperationKey(props.command, args);
  const pending = Boolean(key && props.pendingOperationKeys.includes(key));
  return (
    <button
      type="button"
      class={pending ? "is-busy" : ""}
      disabled={props.disabled === true || pending}
      {...(pending
        ? {
            "aria-busy": "true",
            title: props.t("synthesis-operation-in-progress", {
              operation: reviewCenterOperationLabel(props.t, props.command),
            }),
          }
        : {})}
      onClick={() => {
        props.onDispatch?.();
        props.onAction("hostCommand", { command: props.command, args });
      }}
    >
      {pending ? <span class="button-spinner" aria-hidden="true" /> : null}
      {props.label}
    </button>
  );
}

// Legacy makeLocalButton.
function ReviewLocalButton(props: {
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick: (event: MouseEvent) => void;
}) {
  return (
    <button
      type="button"
      class={props.active ? "active" : ""}
      disabled={props.disabled === true}
      onClick={(event) => {
        event.preventDefault();
        props.onClick(event as unknown as MouseEvent);
      }}
    >
      {props.label}
    </button>
  );
}

function ReviewTableHeaders(props: {
  headers: Array<[string, string]>;
  t: SynthesisReviewCenterText;
}) {
  return (
    <>
      {props.headers.map(([label, className]) => (
        <th key={label} {...(className ? { class: className } : {})}>
          <span class="registry-column-header-label">
            {reviewCenterUiText(props.t, label)}
          </span>
        </th>
      ))}
    </>
  );
}

// ---------------------------------------------------------------------------
// Toolbar (legacy renderReviewCenterToolbar)
// ---------------------------------------------------------------------------

const REVIEW_TABS: SynthesisReviewCenterActiveTab[] = [
  "reference_matching",
  "concepts",
  "topic_graph",
];

function ReviewCenterToolbar(props: {
  filters: SynthesisReviewCenterFiltersView;
  t: SynthesisReviewCenterText;
  onAction: SynthesisReviewCenterActionSender;
}) {
  const { filters, t, onAction } = props;
  const setReviewFilters = (patch: Record<string, unknown>) =>
    onAction("setFilters", { reviews: patch });
  return (
    <div class="filters review-center-toolbar">
      <div class="segmented">
        {REVIEW_TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            class={filters.activeTab === tab ? "active" : ""}
            onClick={() => setReviewFilters({ activeTab: tab })}
          >
            {reviewCenterEnumLabel(t, "review-tab", tab)}
          </button>
        ))}
      </div>
      <ReviewSearchInput
        value={filters.search}
        placeholder={t("synthesis-search-reviews")}
        onSearch={(search) => setReviewFilters({ search })}
      />
      <ReviewSelect
        options={[
          "open",
          "all",
          "accepted",
          "rejected",
          "superseded",
          "retargeted",
        ].map((status): [string, string] => [
          status,
          reviewCenterFilterOptionLabel(
            t,
            "synthesis-filter-status",
            "status",
            status,
          ),
        ])}
        value={filters.status}
        onChange={(status) => setReviewFilters({ status })}
      />
      {filters.activeTab === "reference_matching" ? (
        <>
          <ReviewSelect
            options={[
              // Legacy quirk kept verbatim: the "all" option of the kind and
              // confidence filters resolves its label via the "status" enum
              // domain (src/synthesisWorkbenchApp.ts :10446, :10481).
              [
                "all",
                reviewCenterFilterOptionLabel(
                  t,
                  "synthesis-filter-kind",
                  "status",
                  "all",
                ),
              ],
              [
                "zotero_binding",
                reviewCenterFilterOptionLabel(
                  t,
                  "synthesis-filter-kind",
                  "kind",
                  "zotero_binding",
                ),
              ],
              [
                "canonical_merge",
                reviewCenterFilterOptionLabel(
                  t,
                  "synthesis-filter-kind",
                  "kind",
                  "canonical_merge",
                ),
              ],
              [
                "canonical_revision",
                reviewCenterFilterOptionLabel(
                  t,
                  "synthesis-filter-kind",
                  "kind",
                  "canonical_revision",
                ),
              ],
            ]}
            value={filters.kind}
            onChange={(kind) => setReviewFilters({ kind })}
          />
          <ReviewSelect
            options={[
              [
                "all",
                reviewCenterFilterOptionLabel(
                  t,
                  "synthesis-filter-confidence",
                  "status",
                  "all",
                ),
              ],
              [
                "deterministic",
                reviewCenterFilterOptionLabel(
                  t,
                  "synthesis-filter-confidence",
                  "confidence",
                  "deterministic",
                ),
              ],
              [
                "high",
                reviewCenterFilterOptionLabel(
                  t,
                  "synthesis-filter-confidence",
                  "confidence",
                  "high",
                ),
              ],
              [
                "medium",
                reviewCenterFilterOptionLabel(
                  t,
                  "synthesis-filter-confidence",
                  "confidence",
                  "medium",
                ),
              ],
              [
                "low",
                reviewCenterFilterOptionLabel(
                  t,
                  "synthesis-filter-confidence",
                  "confidence",
                  "low",
                ),
              ],
              [
                "review",
                reviewCenterFilterOptionLabel(
                  t,
                  "synthesis-filter-confidence",
                  "confidence",
                  "review",
                ),
              ],
            ]}
            value={filters.confidence}
            onChange={(confidence) => setReviewFilters({ confidence })}
          />
        </>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Reference matching table (legacy renderReferenceMatchingReviewTable +
// renderReferenceProposalBulkActions + renderReferenceProposalPendingControls)
// ---------------------------------------------------------------------------

function ReferencePendingControls(props: {
  pendingCount: number;
  submitting: boolean;
  t: SynthesisReviewCenterText;
  onApply: () => void;
  onClear: () => void;
}) {
  const { t } = props;
  return (
    <div class="reference-review-pending-controls">
      <button
        type="button"
        class={props.submitting ? "is-busy" : ""}
        disabled={props.pendingCount === 0 || props.submitting}
        {...(props.submitting
          ? {
              "aria-busy": "true",
              title: t("synthesis-reference-review-applying-pending"),
            }
          : {})}
        onClick={(event) => {
          event.preventDefault();
          props.onApply();
        }}
      >
        {props.submitting ? (
          <span class="button-spinner" aria-hidden="true" />
        ) : null}
        {props.submitting
          ? t("synthesis-action-applying-pending")
          : t("synthesis-action-apply-pending")}
        <ReviewBadge
          text={String(props.pendingCount)}
          tone={props.pendingCount ? "warn" : ""}
          extraClass="reference-review-pending-badge"
        />
      </button>
      {props.pendingCount ? (
        <ReviewLocalButton
          label={t("synthesis-action-clear-pending")}
          onClick={props.onClear}
        />
      ) : null}
    </div>
  );
}

function ReferenceBulkActions(props: {
  statusFilter: string;
  actionableCount: number;
  selectedCount: number;
  pendingCount: number;
  submitting: boolean;
  t: SynthesisReviewCenterText;
  onAcceptAll: () => void;
  onRejectAll: () => void;
  onAcceptSelected: () => void;
  onRejectSelected: () => void;
  onClearSelection: () => void;
  onApplyPending: () => void;
  onClearPending: () => void;
}) {
  const { statusFilter: status, t } = props;
  return (
    <div class="reference-review-bulk-actions">
      <ReferencePendingControls
        pendingCount={props.pendingCount}
        submitting={props.submitting}
        t={t}
        onApply={props.onApplyPending}
        onClear={props.onClearPending}
      />
      {status !== "all" &&
      status !== "superseded" &&
      status !== "retargeted" ? (
        <>
          {status !== "accepted" ? (
            <ReviewLocalButton
              label={t("synthesis-action-accept-all")}
              disabled={!props.actionableCount || props.submitting}
              onClick={props.onAcceptAll}
            />
          ) : null}
          {status !== "rejected" ? (
            <ReviewLocalButton
              label={t("synthesis-action-reject-all")}
              disabled={!props.actionableCount || props.submitting}
              onClick={props.onRejectAll}
            />
          ) : null}
          {status !== "accepted" ? (
            <ReviewLocalButton
              label={t("synthesis-action-accept-selected")}
              disabled={!props.selectedCount || props.submitting}
              onClick={props.onAcceptSelected}
            />
          ) : null}
          {status !== "rejected" ? (
            <ReviewLocalButton
              label={t("synthesis-action-reject-selected")}
              disabled={!props.selectedCount || props.submitting}
              onClick={props.onRejectSelected}
            />
          ) : null}
        </>
      ) : null}
      {props.selectedCount ? (
        <ReviewLocalButton
          label={t("synthesis-action-clear-selection")}
          onClick={props.onClearSelection}
        />
      ) : null}
      <span class="muted">
        {t("synthesis-review-selection-pending", {
          selected: props.selectedCount,
          pending: props.pendingCount,
        })}
      </span>
    </div>
  );
}

function ReferenceProposalRowActions(props: {
  row: SynthesisReviewCenterProposalRowView;
  pending?: PendingReferenceDecision;
  pickerOpen: boolean;
  submitting: boolean;
  t: SynthesisReviewCenterText;
  onQueueDecision: (
    proposalId: string,
    action: SynthesisReviewCenterProposalAction,
  ) => void;
  onCancelPending: (proposalId: string) => void;
  onOpenPicker: (
    proposalId: string,
    sourceTitle: string,
    anchor?: HTMLElement,
  ) => void;
}) {
  const { row, pending, t } = props;
  const decisionButton = (
    label: string,
    action: SynthesisReviewCenterProposalAction,
  ) => (
    <ReviewLocalButton
      label={label}
      active={pending?.action === action}
      disabled={props.submitting}
      onClick={() => props.onQueueDecision(row.proposalId, action)}
    />
  );
  let buttons: preact.ComponentChildren;
  if (row.status === "open") {
    buttons = (
      <>
        {decisionButton(t("synthesis-action-accept"), "accept")}
        {row.kind === "canonical_merge"
          ? decisionButton(
              t("synthesis-enum-action-reverse-accept"),
              "reverse_accept",
            )
          : null}
        {decisionButton(t("synthesis-action-reject"), "reject")}
        <ReviewLocalButton
          label={t("synthesis-enum-action-manual-target")}
          active={pending?.action === "manual_target" || props.pickerOpen}
          disabled={props.submitting}
          onClick={(event) =>
            props.onOpenPicker(
              row.proposalId,
              row.sourceText,
              eventCurrentTargetElement(event),
            )
          }
        />
      </>
    );
  } else if (row.status === "accepted") {
    buttons = (
      <>
        {decisionButton(t("synthesis-action-reopen"), "reopen")}
        {row.kind === "canonical_merge"
          ? decisionButton(
              t("synthesis-enum-action-reverse-accept"),
              "reverse_accept",
            )
          : null}
        {decisionButton(t("synthesis-action-reject"), "reject")}
        {decisionButton(t("synthesis-action-delete"), "delete")}
      </>
    );
  } else if (row.status === "rejected") {
    buttons = (
      <>
        {decisionButton(t("synthesis-action-reopen"), "reopen")}
        {decisionButton(t("synthesis-action-accept"), "accept")}
        {row.kind === "canonical_merge"
          ? decisionButton(
              t("synthesis-enum-action-reverse-accept"),
              "reverse_accept",
            )
          : null}
        {decisionButton(t("synthesis-action-delete"), "delete")}
      </>
    );
  } else {
    buttons = <span class="muted">-</span>;
  }
  return (
    <div class="review-table-actions">
      {buttons}
      {pending ? (
        <ReviewLocalButton
          label={t("synthesis-action-cancel-pending")}
          onClick={() => props.onCancelPending(row.proposalId)}
        />
      ) : null}
    </div>
  );
}

function ReferenceStatusStack(props: {
  statusText: string;
  statusTone: string;
  pending?: PendingReferenceDecision;
  t: SynthesisReviewCenterText;
}) {
  const { pending, t } = props;
  let pendingLabel = "";
  if (pending) {
    const label = reviewCenterProposalActionLabel(t, pending.action);
    pendingLabel =
      pending.action === "manual_target" && pending.targetLabel
        ? `${label}: ${pending.targetLabel}`
        : label;
  }
  return (
    <div class="review-status-stack">
      <ReviewBadge text={props.statusText} tone={props.statusTone} />
      {pending ? (
        <ReviewBadge
          text={t("synthesis-review-pending-action", { action: pendingLabel })}
          tone="warn"
          extraClass="review-pending-badge"
        />
      ) : null}
    </div>
  );
}

function CanonicalRevisionActions(props: {
  row: SynthesisReviewCenterCleanupRowView;
  optimisticallyResolved: boolean;
  pendingOperationKeys: string[];
  t: SynthesisReviewCenterText;
  onAction: SynthesisReviewCenterActionSender;
  onDispatch: (reviewItemId: string) => void;
}) {
  const { row, t } = props;
  const showButtons =
    row.proposalId && row.status === "open" && !props.optimisticallyResolved;
  if (!showButtons) {
    return (
      <div class="review-table-actions">
        <span class="muted">{t("synthesis-review-managed-by-canonical")}</span>
      </div>
    );
  }
  return (
    <div class="review-table-actions">
      {(["accept", "reject"] as const).map((action) => (
        <ReviewCommandButton
          key={action}
          label={t(
            action === "accept"
              ? "synthesis-action-accept"
              : "synthesis-action-reject",
          )}
          command="applyCanonicalRevisionReviewAction"
          args={{ reviewItemId: row.proposalId, action }}
          pendingOperationKeys={props.pendingOperationKeys}
          t={t}
          onAction={props.onAction}
          onDispatch={() => props.onDispatch(row.proposalId)}
        />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Concepts / topic graph tables (legacy renderGenericReviewTable branches)
// ---------------------------------------------------------------------------

function ConceptCandidatePills(props: {
  candidates: SynthesisReviewCenterConceptCandidateView[];
}) {
  return (
    <div class="concept-candidate-pills">
      {props.candidates.length === 0 ? (
        <span class="muted">-</span>
      ) : (
        props.candidates.map((candidate) => (
          <span
            key={candidate.id}
            class="concept-candidate-pill"
            title={candidate.id}
          >
            {candidate.name}
          </span>
        ))
      )}
    </div>
  );
}

function ConceptActionCell(props: {
  row: SynthesisReviewCenterConceptRowView;
  mergeTarget: string;
  mergeExpanded: boolean;
  pendingOperationKeys: string[];
  t: SynthesisReviewCenterText;
  onAction: SynthesisReviewCenterActionSender;
  onToggleMerge: (reviewId: string) => void;
  onMergeTargetChange: (reviewId: string, targetConceptId: string) => void;
}) {
  const { row, t } = props;
  if (row.status !== "open") {
    return <>-</>;
  }
  const commandArgs = (action: string, extra?: Record<string, unknown>) => ({
    reviewId: row.reviewId,
    action,
    ...extra,
  });
  if (
    row.reason === "alias_conflict" ||
    row.reason === "alias_equivalence_audit"
  ) {
    return (
      <div class="action-group">
        <ReviewCommandButton
          label={t("synthesis-action-keep-alias")}
          command="applyConceptReviewAction"
          args={commandArgs("keep_alias")}
          pendingOperationKeys={props.pendingOperationKeys}
          t={t}
          onAction={props.onAction}
        />
        <ReviewCommandButton
          label={t("synthesis-action-remove-alias")}
          command="applyConceptReviewAction"
          args={commandArgs("remove_alias")}
          pendingOperationKeys={props.pendingOperationKeys}
          t={t}
          onAction={props.onAction}
        />
      </div>
    );
  }
  return (
    <div class="review-table-actions concept-review-actions">
      <ReviewCommandButton
        label={t("synthesis-action-approve")}
        command="applyConceptReviewAction"
        args={commandArgs("approve_create")}
        pendingOperationKeys={props.pendingOperationKeys}
        t={t}
        onAction={props.onAction}
      />
      <ReviewLocalButton
        label={t("synthesis-action-merge")}
        disabled={row.candidates.length === 0}
        onClick={() => props.onToggleMerge(row.reviewId)}
      />
      <ReviewCommandButton
        label={t("synthesis-action-reject")}
        command="applyConceptReviewAction"
        args={commandArgs("reject")}
        pendingOperationKeys={props.pendingOperationKeys}
        t={t}
        onAction={props.onAction}
      />
      {props.mergeExpanded ? (
        <div class="review-card-field review-card-field-inline">
          <span class="muted">{reviewCenterUiText(t, "merge target")}</span>
          <ReviewSelect
            options={row.candidates.map((candidate) => [
              candidate.id,
              candidate.name,
            ])}
            value={props.mergeTarget}
            onChange={(value) => props.onMergeTargetChange(row.reviewId, value)}
          />
          <ReviewCommandButton
            label={t("synthesis-action-apply-merge")}
            command="applyConceptReviewAction"
            args={commandArgs("merge_into_existing", {
              targetConceptId: props.mergeTarget,
            })}
            disabled={!props.mergeTarget}
            pendingOperationKeys={props.pendingOperationKeys}
            t={t}
            onAction={props.onAction}
          />
        </div>
      ) : null}
    </div>
  );
}

function ReviewPillList(props: {
  pills: Array<{ text: string; title: string }>;
}) {
  return (
    <div class="review-pill-list">
      {props.pills.length === 0 ? (
        <span class="muted">-</span>
      ) : (
        props.pills.map((pill, index) => (
          <span key={index} class="review-pill" title={pill.title}>
            {pill.text}
          </span>
        ))
      )}
    </div>
  );
}

function TopicGraphActionCell(props: {
  row: SynthesisReviewCenterTopicGraphRowView;
  pendingOperationKeys: string[];
  t: SynthesisReviewCenterText;
  onAction: SynthesisReviewCenterActionSender;
}) {
  const { row, t } = props;
  if (row.status !== "open") {
    return <>-</>;
  }
  if (row.rowKind === "edge") {
    return (
      <div class="action-group">
        <ReviewCommandButton
          label={t("synthesis-action-accept")}
          command="acceptTopicGraphRelation"
          args={{ edgeId: row.edgeId }}
          pendingOperationKeys={props.pendingOperationKeys}
          t={t}
          onAction={props.onAction}
        />
        <ReviewCommandButton
          label={t("synthesis-action-reject")}
          command="rejectTopicGraphRelation"
          args={{ edgeId: row.edgeId }}
          pendingOperationKeys={props.pendingOperationKeys}
          t={t}
          onAction={props.onAction}
        />
      </div>
    );
  }
  return (
    <div class="action-group">
      <ReviewCommandButton
        label={t("synthesis-action-approve")}
        command="applyTopicGraphReviewAction"
        args={{ reviewId: row.reviewId, action: "approve_suggested" }}
        pendingOperationKeys={props.pendingOperationKeys}
        t={t}
        onAction={props.onAction}
      />
      <ReviewCommandButton
        label={t("synthesis-action-reject")}
        command="applyTopicGraphReviewAction"
        args={{ reviewId: row.reviewId, action: "reject" }}
        pendingOperationKeys={props.pendingOperationKeys}
        t={t}
        onAction={props.onAction}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Region
// ---------------------------------------------------------------------------

export const ReviewCenterRegion = memo(
  function ReviewCenterRegion(props: ReviewCenterRegionProps) {
    const { selection, t, onAction } = props;

    // Page-local UI state (legacy state.* slots owned by this surface).
    const [selectedIds, setSelectedIds] = useState<ReadonlySet<string>>(
      () => new Set<string>(),
    );
    const [localPending, setLocalPending] = useState<
      ReadonlyMap<string, PendingReferenceDecision>
    >(() => new Map<string, PendingReferenceDecision>());
    const [localSubmission, setLocalSubmission] = useState<{
      proposalIds: string[];
    } | null>(null);
    const [localOptimisticCanonical, setLocalOptimisticCanonical] = useState<
      ReadonlySet<string>
    >(() => new Set<string>());
    const [expandedMergeRows, setExpandedMergeRows] = useState<
      ReadonlySet<string>
    >(() => new Set<string>());
    const [localPicker, setLocalPicker] =
      useState<ManualTargetPickerState | null>(null);
    // State updates from a button event may be batched with the next host
    // snapshot. Keep the submitted ids synchronously so an immediate
    // completion echo can still reconcile the visible pending badges.
    const submittedReferenceIdsRef = useRef<ReadonlySet<string>>(new Set());

    const referenceReview = props.referenceReview;
    const completedReferenceBatch =
      selection.actionEcho.completedKey === REFERENCE_BATCH_OPERATION_KEY;
    const submittedReferenceIds = submittedReferenceIdsRef.current;
    const pending = referenceReview
      ? new Map(
          referenceReview.state.pendingDecisions.map((decision) => [
            decision.proposalId,
            decision,
          ]),
        )
      : completedReferenceBatch && submittedReferenceIds.size
        ? new Map(
            Array.from(localPending).filter(
              ([proposalId]) => !submittedReferenceIds.has(proposalId),
            ),
          )
        : localPending;
    const submission = referenceReview
      ? referenceReview.state.applying
        ? { proposalIds: [...referenceReview.state.applyingProposalIds] }
        : null
      : completedReferenceBatch && submittedReferenceIds.size
        ? null
        : localSubmission;
    const picker = referenceReview
      ? referenceReview.state.manualTargetPicker || null
      : localPicker;
    const optimisticCanonical = referenceReview
      ? new Set(
          referenceReview.state.resolvedKeys.flatMap((key) => {
            const values = [key];
            const separator = key.indexOf(":");
            if (separator >= 0) values.push(key.slice(separator + 1));
            return values;
          }),
        )
      : new Set(
          Array.from(localOptimisticCanonical).filter(
            (id) =>
              `${CANONICAL_REVISION_OPERATION_PREFIX}:${reviewCenterKeyPart(id)}` !==
              selection.actionEcho.failedKey,
          ),
        );
    const setPending = (
      next: ReadonlyMap<string, PendingReferenceDecision>,
    ) => {
      if (!referenceReview) setLocalPending(next);
    };
    const setSubmission = (next: { proposalIds: string[] } | null) => {
      if (!referenceReview) setLocalSubmission(next);
    };
    const setPicker = (next: ManualTargetPickerState | null) => {
      if (!referenceReview) {
        setLocalPicker(next);
      } else if (!next) {
        referenceReview.handlers.onCloseManualTargetPicker();
      } else {
        referenceReview.handlers.onOpenManualTargetPicker(
          next.proposalId,
          next.sourceTitle,
          next.anchorRect,
        );
      }
    };

    const isSubmitting = (proposalId?: string): boolean => {
      if (!submission) return false;
      if (!proposalId) return true;
      return submission.proposalIds.includes(proposalId);
    };

    // Reconcile local state against the latest snapshot (legacy
    // clearResolvedLocalPending + pruneReferenceProposalUiState + the
    // picker's proposal-exists sync). Every setter fires only when the
    // closure-visible state actually needs to change, so the effect cannot
    // loop.
    useEffect(() => {
      if (referenceReview) return;
      const { completedKey, failedKey } = selection.actionEcho;
      const known = new Set(selection.knownProposalIds);
      if (submission) {
        if (completedKey === REFERENCE_BATCH_OPERATION_KEY) {
          const submitted = new Set(submission.proposalIds);
          setSubmission(null);
          if (Array.from(pending.keys()).some((id) => submitted.has(id))) {
            const next = new Map(pending);
            for (const id of submitted) next.delete(id);
            setPending(next);
          }
          if (Array.from(selectedIds).some((id) => submitted.has(id))) {
            const next = new Set(selectedIds);
            for (const id of submitted) next.delete(id);
            setSelectedIds(next);
          }
        } else if (failedKey === REFERENCE_BATCH_OPERATION_KEY) {
          setSubmission(null);
        }
      }
      if (failedKey && localOptimisticCanonical.size) {
        const stale = Array.from(localOptimisticCanonical).filter(
          (id) =>
            `${CANONICAL_REVISION_OPERATION_PREFIX}:${reviewCenterKeyPart(id)}` ===
            failedKey,
        );
        if (stale.length) {
          const next = new Set(localOptimisticCanonical);
          for (const id of stale) next.delete(id);
          setLocalOptimisticCanonical(next);
        }
      }
      const orphanedPending = Array.from(pending.keys()).filter(
        (id) => !known.has(id),
      );
      if (orphanedPending.length) {
        const next = new Map(pending);
        for (const id of orphanedPending) next.delete(id);
        setPending(next);
      }
      const orphanedSelection = Array.from(selectedIds).filter(
        (id) => !known.has(id),
      );
      if (orphanedSelection.length) {
        const next = new Set(selectedIds);
        for (const id of orphanedSelection) next.delete(id);
        setSelectedIds(next);
      }
      if (picker && !known.has(picker.proposalId)) {
        setPicker(null);
      }
    }, [
      referenceReview,
      selection.actionEcho.completedKey,
      selection.actionEcho.failedKey,
      selection.knownProposalIds,
      localSubmission,
      localPending,
      selectedIds,
      localOptimisticCanonical,
      localPicker,
    ]);

    // ---------------------------- intents ---------------------------------

    const queueDecision = (
      proposalId: string,
      action: SynthesisReviewCenterProposalAction,
      options: {
        target?: SynthesisReviewCenterManualTarget;
        targetLabel?: string;
      } = {},
    ) => {
      if (
        !proposalId ||
        isSubmitting(proposalId) ||
        (action === "manual_target" && !options.target)
      ) {
        return;
      }
      const next = new Map(pending);
      const decision: PendingReferenceDecision = {
        proposalId,
        action,
        target: options.target,
        targetLabel: reviewCenterTextValue(options.targetLabel) || undefined,
      };
      if (referenceReview) {
        referenceReview.handlers.onQueueDecision(proposalId, action, {
          ...(options.target ? { target: options.target } : {}),
          ...(options.targetLabel
            ? { targetLabel: reviewCenterTextValue(options.targetLabel) }
            : {}),
        });
        setPicker(null);
        return;
      }
      next.set(proposalId, decision);
      setPending(next);
      setPicker(null);
    };

    const queueDecisions = (
      rows: SynthesisReviewCenterProposalRowView[],
      action: SynthesisReviewCenterProposalAction,
    ) => {
      if (isSubmitting()) return;
      if (referenceReview) {
        const decisions = rows
          .filter((row) => row.proposalId)
          .map((row) => ({
            proposalId: row.proposalId,
            action,
          }));
        if (referenceReview.handlers.onQueueDecisions) {
          referenceReview.handlers.onQueueDecisions(decisions);
        } else {
          decisions.forEach((decision) =>
            referenceReview.handlers.onQueueDecision(
              decision.proposalId,
              decision.action,
            ),
          );
        }
        return;
      }
      const next = new Map(pending);
      rows.forEach((row) => {
        if (row.proposalId) {
          next.set(row.proposalId, { proposalId: row.proposalId, action });
        }
      });
      setPending(next);
    };

    const applyPending = () => {
      if (isSubmitting() || !pending.size) return;
      const decisions = Array.from(pending.values()).map((decision) => ({
        proposalId: decision.proposalId,
        action: decision.action,
        ...(decision.target ? { target: decision.target } : {}),
        ...(decision.targetLabel ? { targetLabel: decision.targetLabel } : {}),
      }));
      if (referenceReview) {
        referenceReview.handlers.onApplyPending(decisions);
        return;
      }
      submittedReferenceIdsRef.current = new Set(
        decisions.map((decision) => decision.proposalId),
      );
      onAction("hostCommand", {
        command: "applyReferenceMatchProposalActions",
        args: { decisions },
      });
      setSubmission({
        proposalIds: decisions.map((entry) => entry.proposalId),
      });
    };

    const toggleSelection = (proposalId: string, selected: boolean) => {
      if (!proposalId) return;
      const next = new Set(selectedIds);
      if (selected) {
        next.add(proposalId);
      } else {
        next.delete(proposalId);
      }
      setSelectedIds(next);
    };

    const toggleRowsSelection = (
      rows: SynthesisReviewCenterProposalRowView[],
      selected: boolean,
    ) => {
      const next = new Set(selectedIds);
      rows.forEach((row) => {
        if (!row.proposalId) return;
        if (selected) {
          next.add(row.proposalId);
        } else {
          next.delete(row.proposalId);
        }
      });
      setSelectedIds(next);
    };

    const openPicker = (
      proposalId: string,
      sourceTitle: string,
      anchor?: HTMLElement,
    ) => {
      if (picker?.proposalId === proposalId) {
        setPicker(null);
        return;
      }
      setPicker({
        proposalId,
        sourceTitle,
        anchorRect: anchor ? anchorRectOf(anchor) : undefined,
      });
    };

    const markCanonicalResolved = (reviewItemId: string) => {
      if (!reviewItemId || optimisticCanonical.has(reviewItemId)) return;
      if (referenceReview) {
        referenceReview.handlers.onMarkCanonicalResolved?.(reviewItemId);
        return;
      }
      const next = new Set(optimisticCanonical);
      next.add(reviewItemId);
      setLocalOptimisticCanonical(next);
    };

    const setMergeTarget = (reviewId: string, targetConceptId: string) => {
      onAction("setFilters", {
        concepts: {
          reviewMergeTargets: {
            ...selection.concepts.reviewMergeTargets,
            [reviewId]: targetConceptId,
          },
        },
      });
    };

    // ---------------------------- render -----------------------------------

    const { rows, cleanupRows } = selection.referenceMatching;
    const actionableRows = rows.filter(
      (row) => row.status !== "superseded" && row.status !== "retargeted",
    );
    const selectedRows = rows.filter((row) => selectedIds.has(row.proposalId));
    const allRowsSelected =
      rows.length > 0 && rows.every((row) => selectedIds.has(row.proposalId));

    const pickerProposal = picker
      ? selection.proposalPickerMeta[picker.proposalId]
      : undefined;
    const pickerCandidates = useMemo(
      () =>
        picker && pickerProposal
          ? filterReviewCenterTargetCandidates(
              selection.targetCandidates,
              pickerProposal,
            )
          : [],
      [selection, picker, pickerProposal],
    );

    return (
      <div
        class="panel review-center"
        data-region-content="synthesis-review-center"
      >
        <ReviewCenterToolbar
          filters={selection.filters}
          t={t}
          onAction={onAction}
        />
        {selection.filters.activeTab === "reference_matching" ? (
          !rows.length && !cleanupRows.length ? (
            <ReviewEmptyState
              title={t("synthesis-review-empty-index")}
              message={t("synthesis-review-no-index-message")}
              surface="reference-review-table"
            />
          ) : (
            <div
              class="table-wrap review-center-table-wrap"
              data-synthesis-surface="reference-review-table"
            >
              {rows.length ? (
                <ReferenceBulkActions
                  statusFilter={selection.filters.status}
                  actionableCount={actionableRows.length}
                  selectedCount={selectedRows.length}
                  pendingCount={pending.size}
                  submitting={isSubmitting()}
                  t={t}
                  onAcceptAll={() => queueDecisions(actionableRows, "accept")}
                  onRejectAll={() => queueDecisions(actionableRows, "reject")}
                  onAcceptSelected={() =>
                    queueDecisions(selectedRows, "accept")
                  }
                  onRejectSelected={() =>
                    queueDecisions(selectedRows, "reject")
                  }
                  onClearSelection={() => setSelectedIds(new Set<string>())}
                  onApplyPending={applyPending}
                  onClearPending={() => {
                    if (referenceReview) {
                      referenceReview.handlers.onClearPending();
                    } else {
                      setPending(new Map<string, PendingReferenceDecision>());
                    }
                  }}
                />
              ) : null}
              <table class="registry-table review-center-table review-index-table">
                <thead>
                  <tr>
                    <th class="review-selection-cell">
                      <input
                        type="checkbox"
                        checked={allRowsSelected}
                        onChange={(event) =>
                          toggleRowsSelection(
                            rows,
                            (event.target as HTMLInputElement).checked,
                          )
                        }
                      />
                    </th>
                    <ReviewTableHeaders
                      headers={REFERENCE_TABLE_HEADERS}
                      t={t}
                    />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.proposalId}>
                      <td class="review-selection-cell">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(row.proposalId)}
                          onChange={(event) =>
                            toggleSelection(
                              row.proposalId,
                              (event.target as HTMLInputElement).checked,
                            )
                          }
                        />
                      </td>
                      <td>{row.sourceText}</td>
                      <td>{row.targetText}</td>
                      <td>{row.parentText}</td>
                      <td class="review-cell-center review-kind-cell">
                        {row.kindText}
                      </td>
                      <td class="review-cell-center review-reason-cell">
                        {row.reasonsText}
                      </td>
                      <td class="review-cell-center review-status-cell">
                        <ReferenceStatusStack
                          statusText={row.statusText}
                          statusTone={row.statusTone}
                          pending={pending.get(row.proposalId)}
                          t={t}
                        />
                      </td>
                      <td class="review-cell-center review-updated-cell">
                        {row.updatedAtText}
                      </td>
                      <td class="review-action-cell">
                        <ReferenceProposalRowActions
                          row={row}
                          pending={pending.get(row.proposalId)}
                          pickerOpen={picker?.proposalId === row.proposalId}
                          submitting={isSubmitting(row.proposalId)}
                          t={t}
                          onQueueDecision={queueDecision}
                          onCancelPending={(proposalId) => {
                            if (!pending.has(proposalId)) return;
                            if (referenceReview) {
                              referenceReview.handlers.onCancelDecision(
                                proposalId,
                              );
                              return;
                            }
                            const next = new Map(pending);
                            next.delete(proposalId);
                            setPending(next);
                          }}
                          onOpenPicker={openPicker}
                        />
                      </td>
                    </tr>
                  ))}
                  {cleanupRows.map((row) => (
                    <tr key={row.rowKey}>
                      <td>{""}</td>
                      <td>{row.sourceText}</td>
                      <td>{row.targetText}</td>
                      <td>{row.parentText}</td>
                      <td class="review-cell-center review-kind-cell">
                        {row.kindText}
                      </td>
                      <td class="review-cell-center review-reason-cell">
                        {row.reasonText}
                      </td>
                      <td class="review-cell-center review-status-cell">
                        <div class="review-status-stack">
                          <ReviewBadge
                            text={row.statusText}
                            tone={row.statusTone}
                          />
                        </div>
                      </td>
                      <td class="review-cell-center review-updated-cell">
                        {row.updatedAtText}
                      </td>
                      <td class="review-action-cell">
                        {row.canonicalRevision ? (
                          <CanonicalRevisionActions
                            row={row}
                            optimisticallyResolved={optimisticCanonical.has(
                              row.proposalId,
                            )}
                            pendingOperationKeys={
                              selection.pendingOperationKeys
                            }
                            t={t}
                            onAction={onAction}
                            onDispatch={markCanonicalResolved}
                          />
                        ) : (
                          <span class="muted">
                            {t("synthesis-review-managed-in-index")}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : selection.filters.activeTab === "concepts" ? (
          selection.concepts.rows.length === 0 ? (
            <ReviewEmptyState
              title={t("synthesis-review-empty-concepts")}
              message={t("synthesis-review-empty-message")}
            />
          ) : (
            <div class="table-wrap review-center-table-wrap">
              <table class="registry-table review-center-table review-concepts-table">
                <thead>
                  <tr>
                    <ReviewTableHeaders headers={CONCEPT_TABLE_HEADERS} t={t} />
                  </tr>
                </thead>
                <tbody>
                  {selection.concepts.rows.map((row) => (
                    <tr key={row.reviewId}>
                      <td>{row.labelText}</td>
                      <td>
                        <ConceptCandidatePills candidates={row.candidates} />
                      </td>
                      <td class="review-cell-center review-reason-cell">
                        {row.reasonText}
                      </td>
                      <td class="review-cell-center review-confidence-cell">
                        {row.confidenceText}
                      </td>
                      <td class="review-cell-center review-status-cell">
                        <ReviewBadge
                          text={row.statusText}
                          tone={row.statusTone}
                        />
                      </td>
                      <td>{row.topicText}</td>
                      <td class="review-action-cell">
                        <ConceptActionCell
                          row={row}
                          mergeTarget={
                            selection.concepts.reviewMergeTargets[
                              row.reviewId
                            ] ||
                            row.candidates[0]?.id ||
                            ""
                          }
                          mergeExpanded={expandedMergeRows.has(row.reviewId)}
                          pendingOperationKeys={selection.pendingOperationKeys}
                          t={t}
                          onAction={onAction}
                          onToggleMerge={(reviewId) => {
                            const next = new Set(expandedMergeRows);
                            if (next.has(reviewId)) {
                              next.delete(reviewId);
                            } else {
                              next.add(reviewId);
                            }
                            setExpandedMergeRows(next);
                          }}
                          onMergeTargetChange={setMergeTarget}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : selection.topicGraph.rows.length === 0 ? (
          <ReviewEmptyState
            title={t("synthesis-review-empty-topic-graph")}
            message={t("synthesis-review-empty-message")}
          />
        ) : (
          <div class="table-wrap review-center-table-wrap">
            <table class="registry-table review-center-table review-topic-graph-table">
              <thead>
                <tr>
                  <ReviewTableHeaders
                    headers={TOPIC_GRAPH_TABLE_HEADERS}
                    t={t}
                  />
                </tr>
              </thead>
              <tbody>
                {selection.topicGraph.rows.map((row) => (
                  <tr key={`${row.rowKind}:${row.reviewId}`}>
                    <td>{row.sourceText}</td>
                    <td>{row.relationText}</td>
                    <td>{row.targetText}</td>
                    <td>{row.reasonText}</td>
                    <td class="review-cell-center review-confidence-cell">
                      {row.confidenceText}
                    </td>
                    <td>
                      <ReviewPillList pills={row.evidencePills} />
                    </td>
                    <td class="review-cell-center review-status-cell">
                      <ReviewBadge
                        text={row.statusText}
                        tone={row.statusTone}
                      />
                    </td>
                    <td class="review-action-cell">
                      <TopicGraphActionCell
                        row={row}
                        pendingOperationKeys={selection.pendingOperationKeys}
                        t={t}
                        onAction={onAction}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {picker && pickerProposal ? (
          <ReviewTargetPickerOverlay
            proposalId={picker.proposalId}
            sourceTitle={picker.sourceTitle}
            anchorRect={picker.anchorRect}
            candidates={pickerCandidates}
            t={t}
            onClose={() => setPicker(null)}
            onSelect={(candidate) => {
              const target: SynthesisReviewCenterManualTarget | undefined =
                candidate.kind === "canonical_reference"
                  ? candidate.canonicalReferenceId
                    ? {
                        kind: "canonical_reference",
                        canonicalReferenceId: candidate.canonicalReferenceId,
                      }
                    : undefined
                  : candidate.itemKey
                    ? {
                        kind: "zotero_item",
                        libraryId: candidate.libraryId,
                        itemKey: candidate.itemKey,
                      }
                    : undefined;
              if (!target) return;
              queueDecision(picker.proposalId, "manual_target", {
                target,
                targetLabel: candidate.label,
              });
            }}
          />
        ) : null}
      </div>
    );
  },
  (prev, next) =>
    prev.t === next.t &&
    prev.onAction === next.onAction &&
    equalReferenceReviewControl(prev.referenceReview, next.referenceReview) &&
    equalBySignature(prev.selection, next.selection),
);
