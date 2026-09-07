/** @jsxRuntime automatic */
/** @jsxImportSource preact */
import { useMemo } from "preact/hooks";

import {
  buildRegistryReviewLookup,
  compactRegistryReviewValue,
  fillRegistryTemplate,
  indexReviewItems,
  isCanonicalRevisionProposal,
  isReferenceDecisionSubmitting,
  isRegistryOperationPending,
  isRegistryReviewResolved,
  registryEnumLabel,
  registryMatchProposalContext,
  visibleReviewDetails,
  type SynthesisRegistryActionSender,
  type SynthesisRegistryAnchorRect,
  type SynthesisRegistryPendingDecision,
  type SynthesisRegistryProposalView,
  type SynthesisRegistryReferenceDecisionAction,
  type SynthesisRegistryReviewItem,
  type SynthesisRegistrySelection,
  type SynthesisRegistryText,
} from "./registryTypes";
import {
  RegistryActionButton,
  RegistryBadge,
  RegistryEmptyState,
} from "./controls";

// Index review drawer of the registry surface (legacy
// renderIndexReviewDrawer, src/synthesisWorkbenchApp.ts :8479-8568, plus the
// review cards :7502-7503/:8261-8477). Pending reference decisions are
// controller-owned and shared with the review center; this region reports
// intents through the on*Reference* callbacks. The manual-target picker
// overlay is owned by the review surface; onOpenManualTargetPicker carries
// the intent plus the anchor rect.

export type SynthesisRegistryReviewHandlers = {
  onQueueReferenceDecision: (
    proposalId: string,
    action: SynthesisRegistryReferenceDecisionAction,
  ) => void;
  onCancelReferenceDecision: (proposalId: string) => void;
  onApplyPendingReferenceDecisions: () => void;
  onClearPendingReferenceDecisions: () => void;
  onOpenManualTargetPicker: (
    proposalId: string,
    sourceTitle: string,
    anchorRect?: SynthesisRegistryAnchorRect,
  ) => void;
};

function anchorRectFromEvent(
  event: MouseEvent,
): SynthesisRegistryAnchorRect | undefined {
  const anchor = event.currentTarget;
  if (!(anchor instanceof HTMLElement)) return undefined;
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

const REFERENCE_DECISION_LABEL_KEYS: Record<
  SynthesisRegistryReferenceDecisionAction,
  Parameters<SynthesisRegistryText>[0]
> = {
  accept: "synthesis-action-accept",
  reverse_accept: "synthesis-action-reverse-accept",
  reject: "synthesis-action-reject",
  reopen: "synthesis-action-reopen",
  delete: "synthesis-action-delete",
  manual_target: "synthesis-action-manual-target",
};

function pendingDecisionLabel(
  t: SynthesisRegistryText,
  pending: SynthesisRegistryPendingDecision,
): string {
  const label = t(REFERENCE_DECISION_LABEL_KEYS[pending.action]);
  return pending.action === "manual_target" && pending.targetLabel
    ? `${label}: ${pending.targetLabel}`
    : label;
}

/** Legacy renderReferenceProposalPendingControls. */
function ReferenceProposalPendingControls(props: {
  selection: SynthesisRegistrySelection;
  t: SynthesisRegistryText;
  handlers: SynthesisRegistryReviewHandlers;
}) {
  const { selection, t, handlers } = props;
  const pendingCount = selection.review.pendingDecisions.length;
  const submitting = isReferenceDecisionSubmitting(selection.review);
  return (
    <div class="reference-review-pending-controls">
      <RegistryActionButton
        t={t}
        label={
          submitting
            ? t("synthesis-action-applying-pending")
            : t("synthesis-action-apply-pending")
        }
        disabled={pendingCount === 0 || submitting}
        pending={submitting}
        title={
          submitting
            ? t("synthesis-reference-review-applying-pending")
            : undefined
        }
        onClick={() => handlers.onApplyPendingReferenceDecisions()}
      >
        <RegistryBadge
          t={t}
          text={pendingCount}
          tone={pendingCount ? "warn" : ""}
          className="reference-review-pending-badge"
        />
      </RegistryActionButton>
      {pendingCount ? (
        <RegistryActionButton
          t={t}
          label={t("synthesis-action-clear-pending")}
          onClick={() => handlers.onClearPendingReferenceDecisions()}
        />
      ) : null}
    </div>
  );
}

type ReviewCardDetail = [string, unknown];

/** Legacy renderReviewCard shell. */
function ReviewCard(props: {
  t: SynthesisRegistryText;
  kind?: string;
  tone?: string;
  title: string;
  showKindBadge?: boolean;
  meta?: string;
  body?: string;
  badges?: Array<[string, string?]>;
  details?: ReviewCardDetail[];
  summary?: { source: string; target: string };
  actions?: preact.ComponentChildren;
}) {
  const { t } = props;
  const badges = (props.badges || []).filter(([value]) =>
    registryTextSafe(value),
  );
  const details = visibleReviewDetails(props.details || []);
  return (
    <article class="review-card">
      <div class="review-card-header">
        <div class="review-card-title">
          {props.showKindBadge !== false && props.kind ? (
            <RegistryBadge
              t={t}
              text={props.kind}
              tone={props.tone || "warn"}
            />
          ) : null}
          <strong>{props.title}</strong>
        </div>
        {props.meta ? <span class="muted">{props.meta}</span> : null}
      </div>
      {badges.length ? (
        <div class="review-card-badges">
          {badges.map(([value, tone], index) => (
            <RegistryBadge key={index} t={t} text={value} tone={tone || ""} />
          ))}
        </div>
      ) : null}
      {props.body ? <p class="review-card-body">{props.body}</p> : null}
      {props.summary ? (
        <div class="reference-review-summary">
          <div class="reference-review-summary-row">
            <span class="reference-review-summary-label">
              {t("synthesis-review-source-label")}
            </span>
            <strong>{props.summary.source}</strong>
          </div>
          <div class="reference-review-summary-row">
            <span class="reference-review-summary-label">
              {t("synthesis-review-target-label")}
            </span>
            <strong>{props.summary.target}</strong>
          </div>
        </div>
      ) : null}
      {details.length ? (
        <div class="review-card-details review-card-metadata">
          {details.map(([label, value], index) => (
            <div key={index} class="detail-row">
              <span class="muted">{label}</span>
              <strong>{compactRegistryReviewValue(t, value)}</strong>
            </div>
          ))}
        </div>
      ) : null}
      {props.actions ? <div class="action-group">{props.actions}</div> : null}
    </article>
  );
}

function registryTextSafe(value: unknown): string {
  return String(value == null ? "" : value).trim();
}

function pendingFor(
  selection: SynthesisRegistrySelection,
  proposalId: string,
): SynthesisRegistryPendingDecision | undefined {
  return selection.review.pendingDecisions.find(
    (decision) => decision.proposalId === proposalId,
  );
}

/** Legacy renderReferenceMatchReviewCard. */
function ReferenceMatchReviewCard(props: {
  selection: SynthesisRegistrySelection;
  t: SynthesisRegistryText;
  proposal: SynthesisRegistryProposalView;
  handlers: SynthesisRegistryReviewHandlers;
}) {
  const { selection, t, proposal, handlers } = props;
  const lookup = useMemo(
    () => buildRegistryReviewLookup(selection.rows),
    [selection.rows],
  );
  const context = registryMatchProposalContext(
    proposal,
    lookup,
    selection.strings,
    t("synthesis-reference-untitled"),
  );
  const pending = pendingFor(selection, proposal.proposalId);
  const submitting = isReferenceDecisionSubmitting(
    selection.review,
    proposal.proposalId,
  );
  const isCanonicalMerge = proposal.kind === "canonical_merge";
  const actions: preact.ComponentChildren[] = [
    <RegistryActionButton
      key="accept"
      t={t}
      label={t("synthesis-action-accept")}
      disabled={submitting}
      active={pending?.action === "accept"}
      onClick={() =>
        handlers.onQueueReferenceDecision(proposal.proposalId, "accept")
      }
    />,
  ];
  if (isCanonicalMerge) {
    actions.push(
      <RegistryActionButton
        key="reverse_accept"
        t={t}
        label={t("synthesis-action-reverse-accept")}
        disabled={submitting}
        active={pending?.action === "reverse_accept"}
        onClick={() =>
          handlers.onQueueReferenceDecision(
            proposal.proposalId,
            "reverse_accept",
          )
        }
      />,
    );
  }
  actions.push(
    <RegistryActionButton
      key="reject"
      t={t}
      label={t("synthesis-action-reject")}
      disabled={submitting}
      active={pending?.action === "reject"}
      onClick={() =>
        handlers.onQueueReferenceDecision(proposal.proposalId, "reject")
      }
    />,
  );
  if (!pending) {
    actions.push(
      <RegistryActionButton
        key="manual_target"
        t={t}
        label={t("synthesis-action-manual-target")}
        disabled={submitting}
        active={
          selection.review.manualTargetPickerProposalId === proposal.proposalId
        }
        onClick={(event) =>
          handlers.onOpenManualTargetPicker(
            proposal.proposalId,
            context.sourceReferenceTitle,
            anchorRectFromEvent(event),
          )
        }
      />,
    );
  }
  if (pending) {
    actions.push(
      <RegistryActionButton
        key="cancel"
        t={t}
        label={t("synthesis-action-cancel-pending")}
        disabled={submitting}
        onClick={() => handlers.onCancelReferenceDecision(proposal.proposalId)}
      />,
    );
  }
  return (
    <ReviewCard
      t={t}
      title={t("synthesis-review-proposal-title")}
      showKindBadge={false}
      body={
        pending
          ? t("synthesis-review-pending-body", {
              action: pendingDecisionLabel(t, pending),
            })
          : undefined
      }
      badges={
        pending
          ? [
              [
                t("synthesis-review-pending-action", {
                  action: pendingDecisionLabel(t, pending),
                }),
                "warn",
              ],
            ]
          : undefined
      }
      summary={{
        source: context.sourceReferenceTitle,
        target: context.targetPaperTitle,
      }}
      details={[
        [t("synthesis-column-parent-item"), context.parentItemTitle],
        [t("synthesis-column-kind"), proposal.kind],
        [t("synthesis-column-reasons"), proposal.reasons],
        [t("synthesis-diagnostics"), proposal.diagnostics],
      ]}
      actions={actions}
    />
  );
}

/** Legacy canonicalRevisionReviewContext. */
function canonicalRevisionContext(
  t: SynthesisRegistryText,
  proposal: SynthesisRegistryProposalView,
) {
  return {
    sourceTitle:
      proposal.referenceTitle ||
      proposal.sourcePaperTitle ||
      proposal.sourcePaperRef ||
      t("synthesis-enum-kind-canonical-reference"),
    targetTitle:
      proposal.targetPaperTitle ||
      proposal.targetWorkTitle ||
      proposal.targetPaperRef ||
      t("synthesis-review-canonical-no-successor"),
    reason:
      proposal.reason ||
      proposal.decisionSummary ||
      t("synthesis-review-canonical-revision-body"),
  };
}

/** Legacy renderCanonicalRevisionReviewCard (drawer variant). */
function CanonicalRevisionReviewCard(props: {
  selection: SynthesisRegistrySelection;
  t: SynthesisRegistryText;
  proposal: SynthesisRegistryProposalView;
  onAction: SynthesisRegistryActionSender;
}) {
  const { selection, t, proposal, onAction } = props;
  const context = canonicalRevisionContext(t, proposal);
  const reviewItemId = proposal.proposalId;
  const eligible =
    !!reviewItemId &&
    (proposal.status || "open") === "open" &&
    !isRegistryReviewResolved(
      selection.review,
      "canonical-revision",
      reviewItemId,
    );
  const actions: preact.ComponentChildren[] = [];
  if (eligible) {
    for (const action of ["accept", "reject"] as const) {
      const args = { reviewItemId, action };
      actions.push(
        <RegistryActionButton
          key={action}
          t={t}
          label={t(
            action === "accept"
              ? "synthesis-action-accept"
              : "synthesis-action-reject",
          )}
          pending={isRegistryOperationPending(
            selection,
            "applyCanonicalRevisionReviewAction",
            args,
          )}
          pendingCommand="applyCanonicalRevisionReviewAction"
          onClick={() =>
            onAction("hostCommand", {
              command: "applyCanonicalRevisionReviewAction",
              args,
            })
          }
        />,
      );
    }
  }
  return (
    <ReviewCard
      t={t}
      kind={registryEnumLabel(t, "kind", "canonical_revision")}
      title={t("synthesis-review-canonical-revision-title")}
      showKindBadge={false}
      body={context.reason}
      summary={{ source: context.sourceTitle, target: context.targetTitle }}
      details={[
        [t("synthesis-column-kind"), proposal.reviewKind],
        [t("synthesis-column-status"), proposal.status],
        [selection.strings.blockedByLabel, proposal.blockedByReviewItemId],
        [t("synthesis-diagnostics"), proposal.diagnostics],
        [selection.strings.proposalIdLabel, proposal.proposalId],
      ]}
      actions={actions.length ? actions : undefined}
    />
  );
}

/** Legacy renderCleanupReviewCard. */
function CleanupReviewCard(props: {
  selection: SynthesisRegistrySelection;
  t: SynthesisRegistryText;
  proposal: SynthesisRegistryProposalView;
}) {
  const { selection, t, proposal } = props;
  const isDeleteReview = proposal.reviewKind === "zotero_item_delete";
  const isDedupeReview = proposal.reviewKind === "zotero_dedupe_candidate";
  const sourceTitle =
    proposal.sourcePaperTitle ||
    proposal.sourcePaperRef ||
    selection.strings.parentItemFallback;
  const referenceTitle =
    proposal.referenceTitle ||
    proposal.referenceRaw ||
    proposal.provisionalKey ||
    selection.strings.unresolvedReferenceFallback;
  const targetTitle = proposal.targetPaperTitle || proposal.targetWorkTitle;
  return (
    <ReviewCard
      t={t}
      kind={
        isDeleteReview || isDedupeReview
          ? selection.strings.indexReviewKindLabel
          : selection.strings.cleanupKindLabel
      }
      title={
        isDeleteReview || isDedupeReview
          ? sourceTitle
          : `${sourceTitle} -> ${referenceTitle}`
      }
      meta={
        isDeleteReview
          ? selection.strings.zoteroDeletionReviewMeta
          : isDedupeReview
            ? selection.strings.zoteroDedupeReviewMeta
            : selection.strings.openCleanupMeta
      }
      body={proposal.decisionSummary || selection.strings.cleanupBodyFallback}
      details={[
        [t("synthesis-column-parent-item"), sourceTitle],
        [t("synthesis-column-reference"), referenceTitle],
        [t("synthesis-column-target"), targetTitle],
        [t("synthesis-column-kind"), proposal.kind],
        [t("synthesis-field-reason"), proposal.reason],
        [selection.strings.blockedByLabel, proposal.blockedByReviewItemId],
        [t("synthesis-diagnostics"), proposal.diagnostics],
        [selection.strings.proposalIdLabel, proposal.proposalId],
      ]}
    />
  );
}

function ReviewDrawerItem(props: {
  selection: SynthesisRegistrySelection;
  t: SynthesisRegistryText;
  item: SynthesisRegistryReviewItem;
  onAction: SynthesisRegistryActionSender;
  handlers: SynthesisRegistryReviewHandlers;
}) {
  const { item } = props;
  if (item.type === "reference_match") {
    return (
      <ReferenceMatchReviewCard
        selection={props.selection}
        t={props.t}
        proposal={item.proposal}
        handlers={props.handlers}
      />
    );
  }
  if (isCanonicalRevisionProposal(item.proposal)) {
    return (
      <CanonicalRevisionReviewCard
        selection={props.selection}
        t={props.t}
        proposal={item.proposal}
        onAction={props.onAction}
      />
    );
  }
  return (
    <CleanupReviewCard
      selection={props.selection}
      t={props.t}
      proposal={item.proposal}
    />
  );
}

/** Legacy renderIndexReviewDrawer. */
export function IndexReviewDrawer(props: {
  selection: SynthesisRegistrySelection;
  t: SynthesisRegistryText;
  onAction: SynthesisRegistryActionSender;
  handlers: SynthesisRegistryReviewHandlers;
}) {
  const { selection, t, onAction, handlers } = props;
  const items = indexReviewItems(selection);
  const pendingCount = selection.review.pendingDecisions.length;
  if (!items.length && !pendingCount) {
    return null;
  }
  const safeIndex = Math.min(
    Math.max(0, items.length - 1),
    Math.max(0, Math.floor(Number(selection.filters.reviewDrawerIndex) || 0)),
  );
  const isOpen = selection.filters.reviewDrawerOpen !== false;
  const item = items[safeIndex] || items[0];
  return (
    <section
      class={`review-panel index-review-drawer ${
        isOpen ? "is-open" : "is-collapsed"
      }`}
      data-synthesis-surface="index-review-drawer"
    >
      <div class="review-drawer-header">
        <strong>{selection.strings.reviewDrawerTitle}</strong>
        <span class="muted">
          {items.length
            ? `${safeIndex + 1} / ${items.length}`
            : selection.strings.reviewDrawerZeroOpen}
        </span>
        <div class="review-drawer-controls">
          <RegistryActionButton
            t={t}
            label="↑"
            disabled={items.length <= 1}
            onClick={() =>
              onAction("setFilters", {
                registry: {
                  reviewDrawerIndex:
                    safeIndex <= 0 ? items.length - 1 : safeIndex - 1,
                },
              })
            }
          />
          <RegistryActionButton
            t={t}
            label="↓"
            disabled={items.length <= 1}
            onClick={() =>
              onAction("setFilters", {
                registry: {
                  reviewDrawerIndex:
                    safeIndex >= items.length - 1 ? 0 : safeIndex + 1,
                },
              })
            }
          />
          <ReferenceProposalPendingControls
            selection={selection}
            t={t}
            handlers={handlers}
          />
          <RegistryActionButton
            t={t}
            label={
              isOpen
                ? t("synthesis-action-collapse")
                : t("synthesis-action-expand")
            }
            onClick={() =>
              onAction("setFilters", {
                registry: { reviewDrawerOpen: !isOpen },
              })
            }
          />
        </div>
      </div>
      {isOpen ? (
        items.length ? (
          <ReviewDrawerItem
            selection={selection}
            t={t}
            item={item}
            onAction={onAction}
            handlers={handlers}
          />
        ) : (
          <RegistryEmptyState
            title={selection.strings.reviewDrawerEmptyTitle}
            message={fillRegistryTemplate(
              selection.strings.reviewDrawerEmptyMessageTemplate,
              { count: pendingCount },
            )}
            tone="info"
          />
        )
      ) : null}
    </section>
  );
}
