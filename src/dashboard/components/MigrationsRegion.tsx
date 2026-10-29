/** @jsxRuntime automatic */
/** @jsxImportSource preact */
import { memo } from "preact/compat";
import { useEffect, useRef, useState } from "preact/hooks";

import {
  equalBySignature,
  stableRegionSignature,
} from "../../shared/regionEquality";
import type {
  DashboardActionHandler,
  DashboardHostActionName,
  DashboardLiteratureArtifactMigrationCandidate,
  DashboardLiteratureArtifactMigrationView,
  DashboardLiteratureMigrationIssueItemsQuery,
} from "../../shared/dashboardWireContract";

export type DashboardMigrationsSelection = {
  view: DashboardLiteratureArtifactMigrationView;
  pageTitle: string;
  migrationTitle: string;
  unavailableText: string;
  scanLabel: string;
  applyLabel: string;
  stopLabel: string;
  continueLabel: string;
  copyDiagnosticBundleLabel: string;
  reviewLabel: string;
  readyLabel: string;
  blockedLabel: string;
  historyTitle: string;
  emptyHistoryText: string;
  candidateLabel: string;
  progressLabel: string;
  attentionLabel: string;
  previousLabel: string;
  nextLabel: string;
  firstLabel: string;
  lastLabel: string;
  pageLabel: string;
  selectedLabel: string;
  verifiedLabel: string;
  unresolvedLabel: string;
  recoveredLabel: string;
  droppedLabel: string;
  verifiedHint: string;
  unresolvedHint: string;
  recoveredHint: string;
  droppedHint: string;
  batchLabel: string;
  batchHint: string;
  diagnosticsLabel: string;
  duplicateOfLabel: string;
  searchPlaceholder: string;
  allLabel: string;
  classificationFilterLabel: string;
  reasonFilterLabel: string;
  dispositionFilterLabel: string;
  detailsLabel: string;
  closeLabel: string;
  approveLabel: string;
  skipLabel: string;
  issuesLabel: string;
  filteredLabel: string;
  diagnosticTitle: string;
  diagnosticCauseLabel: string;
  diagnosticOperationLabel: string;
  diagnosticOperationIdLabel: string;
  diagnosticAttemptIdLabel: string;
  diagnosticPhaseLabel: string;
  diagnosticEffectPhaseLabel: string;
  diagnosticRecoveryLabel: string;
  diagnosticAffectedLabel: string;
  diagnosticResidualLabel: string;
  diagnosticUnavailableText: string;
  diagnosticRetryHint: string;
  diagnosticFreshScanHint: string;
  diagnosticManualRepairHint: string;
  dispositionLabels: Record<string, string>;
  outcomeLabels: Record<string, string>;
  runStateLabels: Record<string, string>;
  optionLabels: Record<string, string>;
  reasonLabels: Record<string, string>;
  guidance?: Record<string, string>;
  reasonDescriptions?: Record<string, string>;
  optionDescriptions?: Record<string, string>;
};

export type DashboardMigrationsAction = Extract<
  DashboardHostActionName,
  | "literature-migration-scan"
  | "literature-migration-apply"
  | "literature-migration-stop"
  | "literature-migration-continue"
  | "literature-migration-set-selection"
  | "literature-migration-set-filter-selection"
  | "literature-migration-resolve-issue"
  | "literature-migration-resolve-issues-bulk"
  | "literature-migration-set-candidate-query"
  | "literature-migration-list-receipts"
  | "literature-migration-select-run"
  | "literature-migration-copy-diagnostics"
  | "literature-migration-list-issue-items"
>;

type Props = {
  selection: DashboardMigrationsSelection;
  onAction: DashboardActionHandler<DashboardMigrationsAction>;
};

function stateLabel(selection: DashboardMigrationsSelection, state: string) {
  if (state === "ready") return selection.readyLabel;
  if (state === "review_required") return selection.reviewLabel;
  return selection.blockedLabel;
}

function outcomeBadgeClass(outcome: string) {
  if (outcome === "applied" || outcome === "completed") {
    return "zs-badge--success";
  }
  if (outcome === "failed" || outcome === "blocked") {
    return "zs-badge--danger";
  }
  if (
    outcome === "repair_required" ||
    outcome === "changed_since_scan" ||
    outcome === "skipped" ||
    outcome === "completed_with_attention"
  ) {
    return "zs-badge--warning";
  }
  return "";
}

function diagnosticRecoveryHint(selection: DashboardMigrationsSelection) {
  const diagnostic = selection.view.primaryDiagnostic;
  if (!diagnostic) return "";
  if (diagnostic.residualCount || diagnostic.recovery === "manual_repair") {
    return selection.diagnosticManualRepairHint;
  }
  if (diagnostic.recovery === "refresh_and_retry_new_operation") {
    return selection.diagnosticFreshScanHint;
  }
  return selection.diagnosticRetryHint;
}

function CandidateFacts(props: {
  candidate: DashboardLiteratureArtifactMigrationCandidate;
  selection: DashboardMigrationsSelection;
}) {
  const { candidate, selection } = props;
  const facts = [
    {
      key: "verified",
      value: candidate.verifiedCount,
      label: selection.verifiedLabel,
      hint: selection.verifiedHint,
      always: true,
    },
    {
      key: "unresolved",
      value: candidate.unresolvedCount,
      label: selection.unresolvedLabel,
      hint: selection.unresolvedHint,
      always: false,
    },
    {
      key: "recovered",
      value: candidate.recoveredCount,
      label: selection.recoveredLabel,
      hint: selection.recoveredHint,
      always: false,
    },
    {
      key: "dropped",
      value: candidate.droppedCount,
      label: selection.droppedLabel,
      hint: selection.droppedHint,
      always: false,
    },
  ].filter((fact) => fact.always || fact.value > 0);
  return (
    <div class="dashboard-migration-facts">
      {facts.map((fact) => (
        <span key={fact.key} title={fact.hint || undefined}>
          {fact.value} {fact.label}
        </span>
      ))}
    </div>
  );
}

function issueItemHint(
  selection: DashboardMigrationsSelection,
  reasonCode: string,
  hint: string | undefined,
) {
  if (!hint) return "";
  return reasonCode === "duplicate_reference"
    ? `${selection.duplicateOfLabel}: ${hint}`
    : hint;
}

function decisionKindClass(entry: { kind: string; dataLoss: boolean }) {
  if (entry.kind === "skip_candidate") return "is-danger";
  if (entry.dataLoss) return "is-warning";
  return "is-success";
}

function ExpandableText(props: {
  text: string;
  threshold: number;
  showMore: string;
  showLess: string;
  className?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  if (props.text.length <= props.threshold) {
    return <span class={props.className}>{props.text}</span>;
  }
  return (
    <details
      class={`dashboard-migration-expandable ${props.className || ""}`}
      onToggle={(event) => setExpanded(event.currentTarget.open)}
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => event.stopPropagation()}
    >
      <summary>
        <span class="dashboard-migration-expandable-preview">{props.text}</span>
        <span class="dashboard-migration-expandable-label">
          {expanded ? props.showLess : props.showMore}
        </span>
      </summary>
      <span class="dashboard-migration-expandable-full">{props.text}</span>
    </details>
  );
}

function CandidatePagination(props: {
  page: DashboardLiteratureArtifactMigrationView["candidatePage"];
  runId: string;
  disabled: boolean;
  selection: DashboardMigrationsSelection;
  onAction: DashboardActionHandler<DashboardMigrationsAction>;
}) {
  const { page, runId, disabled, selection, onAction } = props;
  const gotoPage = (target: number) => {
    const next = Math.max(0, Math.min(page.pageCount - 1, Math.floor(target)));
    if (Number.isFinite(next) && next !== page.page) {
      onAction("literature-migration-list-receipts", {
        runId,
        page: next,
      });
    }
  };
  const commitPageInput = (event: Event) => {
    const input = event.currentTarget as HTMLInputElement;
    if (input.dataset.committedValue === input.value) return;
    input.dataset.committedValue = input.value;
    const value = Math.floor(Number(input.value) || 0);
    if (value >= 1) gotoPage(value - 1);
  };
  return (
    <nav
      class="dashboard-migrations-pagination"
      aria-label={selection.pageTitle}
    >
      <button
        type="button"
        class="btn zs-icon-btn"
        data-role="migration-first-page"
        title={selection.firstLabel}
        aria-label={selection.firstLabel}
        disabled={disabled || page.page <= 0}
        onClick={() => gotoPage(0)}
      >
        <span class="zs-icon zs-icon-sm zs-icon-first-page" />
      </button>
      <button
        type="button"
        class="btn zs-icon-btn"
        data-role="migration-prev-page"
        title={selection.previousLabel}
        aria-label={selection.previousLabel}
        disabled={disabled || page.page <= 0}
        onClick={() => gotoPage(page.page - 1)}
      >
        <span class="zs-icon zs-icon-sm zs-icon-chevron-left" />
      </button>
      <span data-role="migration-page-range">
        {page.items.length ? page.page * page.pageSize + 1 : 0}–
        {page.page * page.pageSize + page.items.length} / {page.summary.total} ·{" "}
        {page.page + 1}/{Math.max(1, page.pageCount)}
      </span>
      <input
        type="number"
        class="text-input dashboard-migrations-page-input"
        data-role="migration-page-input"
        key={`${runId}:${page.page}`}
        defaultValue={page.page + 1}
        min={1}
        max={Math.max(1, page.pageCount)}
        aria-label={selection.pageLabel}
        disabled={disabled || page.pageCount <= 1}
        onInput={(event) => {
          delete event.currentTarget.dataset.committedValue;
        }}
        onBlur={commitPageInput}
        onKeyDown={(event) => {
          if (event.key !== "Enter") return;
          event.preventDefault();
          commitPageInput(event);
        }}
      />
      <button
        type="button"
        class="btn zs-icon-btn"
        data-role="migration-next-page"
        title={selection.nextLabel}
        aria-label={selection.nextLabel}
        disabled={disabled || page.page >= page.pageCount - 1}
        onClick={() => gotoPage(page.page + 1)}
      >
        <span class="zs-icon zs-icon-sm zs-icon-chevron-right" />
      </button>
      <button
        type="button"
        class="btn zs-icon-btn"
        data-role="migration-last-page"
        title={selection.lastLabel}
        aria-label={selection.lastLabel}
        disabled={disabled || page.page >= page.pageCount - 1}
        onClick={() => gotoPage(page.pageCount - 1)}
      >
        <span class="zs-icon zs-icon-sm zs-icon-last-page" />
      </button>
    </nav>
  );
}

export const MigrationsRegion = memo(
  function MigrationsRegion({ selection, onAction }: Props) {
    const view = selection.view;
    const active = view.activeRun;
    const primaryDiagnostic = view.primaryDiagnostic;
    const diagnosticFacts = primaryDiagnostic
      ? [
          {
            label: selection.diagnosticOperationLabel,
            value: primaryDiagnostic.operation,
          },
          {
            label: selection.diagnosticOperationIdLabel,
            value: primaryDiagnostic.operationId,
          },
          {
            label: selection.diagnosticAttemptIdLabel,
            value: primaryDiagnostic.attemptId,
          },
          {
            label: selection.diagnosticPhaseLabel,
            value: primaryDiagnostic.phase,
          },
          {
            label: selection.diagnosticEffectPhaseLabel,
            value: primaryDiagnostic.effectPhase,
          },
          {
            label: selection.diagnosticRecoveryLabel,
            value: primaryDiagnostic.recovery,
          },
          {
            label: selection.diagnosticAffectedLabel,
            value:
              primaryDiagnostic.affectedCount === null
                ? ""
                : String(primaryDiagnostic.affectedCount),
          },
          {
            label: selection.diagnosticResidualLabel,
            value:
              primaryDiagnostic.residualCount === null
                ? ""
                : String(primaryDiagnostic.residualCount),
          },
        ].filter((fact) => fact.value)
      : [];
    const { candidatePage } = view;
    const [candidateQueryDraft, setCandidateQueryDraft] = useState(
      candidatePage.query,
    );
    const queryDraftInitialized = useRef(false);
    const runIdRef = useRef(active?.runId);
    const selectAllRef = useRef<HTMLInputElement | null>(null);
    const [selectedCandidateSnapshot, setSelectedCandidateSnapshot] =
      useState<DashboardLiteratureArtifactMigrationCandidate | null>(null);
    const [wizardStep, setWizardStep] = useState<
      "overview" | "problems" | "finalreview" | "results"
    >("overview");
    const [problemGroupIndex, setProblemGroupIndex] = useState(0);
    const [historyOpen, setHistoryOpen] = useState(false);
    const [openIssue, setOpenIssue] =
      useState<DashboardLiteratureMigrationIssueItemsQuery | null>(null);
    const resultsRef = useRef<HTMLDivElement | null>(null);
    const candidatePageKey = `${active?.runId || ""}:${candidatePage.page}:${candidatePage.query.search}:${candidatePage.query.classification}:${candidatePage.query.reasonCode}:${candidatePage.query.disposition}`;
    const previousCandidatePageKey = useRef(candidatePageKey);

    useEffect(() => {
      if (previousCandidatePageKey.current !== candidatePageKey) {
        previousCandidatePageKey.current = candidatePageKey;
        resultsRef.current?.scrollTo({ top: 0 });
      }
    }, [candidatePageKey]);
    // The drawer follows the selected candidate, not the current page: paging
    // or filtering must not close it. Fresh page data wins when present;
    // otherwise the last snapshot keeps the drawer readable.
    const selectedCandidate = selectedCandidateSnapshot
      ? candidatePage.items.find(
          (candidate) =>
            candidate.candidateId === selectedCandidateSnapshot.candidateId,
        ) || selectedCandidateSnapshot
      : null;
    const filteredSelected = candidatePage.summary.filteredSelected;
    const filteredSelectable = candidatePage.summary.filteredSelectable;
    const allFilteredSelected =
      filteredSelectable > 0 && filteredSelected === filteredSelectable;

    useEffect(() => {
      if (runIdRef.current === active?.runId) return;
      runIdRef.current = active?.runId;
      setSelectedCandidateSnapshot(null);
      setOpenIssue(null);
      setWizardStep("overview");
      setProblemGroupIndex(0);
    }, [active?.runId]);

    useEffect(() => {
      const box = selectAllRef.current;
      if (box) box.indeterminate = filteredSelected > 0 && !allFilteredSelected;
    });
    useEffect(() => {
      if (!queryDraftInitialized.current) {
        queryDraftInitialized.current = true;
        return;
      }
      setCandidateQueryDraft(candidatePage.query);
    }, [
      candidatePage.query.search,
      candidatePage.query.classification,
      candidatePage.query.reasonCode,
      candidatePage.query.disposition,
    ]);

    const workerActive = view.availability === "busy";
    const scanning =
      workerActive &&
      (view.progress?.phase === "scanning" ||
        view.progress?.phase === "converting");
    const applying = workerActive && view.progress?.phase === "applying";
    const terminalView =
      active?.state === "completed" ||
      active?.state === "completed_with_attention" ||
      active?.state === "failed";
    const currentStep = terminalView ? "results" : wizardStep;
    const decisionGroups =
      view.decisionGroups ||
      candidatePage.batchActions.map((group) => ({
        reasonCode: group.reasonCode,
        totalCount: group.pendingCount,
        pendingCount: group.pendingCount,
        resolvedCount: 0,
        individualCount: 0,
        selectedKind: "",
        kinds: group.kinds,
      }));
    const activeDecisionGroup = decisionGroups[problemGroupIndex] || null;
    const guidance = selection.guidance || {};
    const issueItemsPage = view.issueItemsPage;
    const matchingIssueItemsPage =
      issueItemsPage &&
      openIssue &&
      issueItemsPage.scanOperationId === active?.operationId &&
      issueItemsPage.scanOperationId === openIssue.scanOperationId &&
      issueItemsPage.candidateId === openIssue.candidateId &&
      issueItemsPage.issueId === openIssue.issueId &&
      issueItemsPage.page === openIssue.page &&
      selectedCandidate?.candidateId === openIssue.candidateId
        ? issueItemsPage
        : null;
    const issueItemsPageCount = matchingIssueItemsPage?.ok
      ? matchingIssueItemsPage.pageCount
      : 0;
    const requestIssueItems = (
      candidateId: string,
      issueId: string,
      page: number,
    ) => {
      if (!active) return;
      const currentPage = view.issueItemsPage;
      const pageCount =
        currentPage?.scanOperationId === active.operationId &&
        currentPage.candidateId === candidateId &&
        currentPage.issueId === issueId &&
        currentPage.ok
          ? currentPage.pageCount
          : 1;
      const request = {
        scanOperationId: active.operationId,
        candidateId,
        issueId,
        page: Math.max(0, Math.min(pageCount - 1, page)),
      };
      setOpenIssue(request);
      onAction("literature-migration-list-issue-items", request);
    };
    const canApply =
      !!active &&
      active.state === "preview" &&
      Boolean(view.activeOperationId) &&
      !candidateQueryDraft.search &&
      !candidateQueryDraft.classification &&
      !candidateQueryDraft.reasonCode &&
      !candidateQueryDraft.disposition &&
      !candidatePage.query.search &&
      !candidatePage.query.classification &&
      !candidatePage.query.reasonCode &&
      !candidatePage.query.disposition &&
      candidatePage.summary.selected > 0;
    const updateQuery = (patch: Partial<typeof candidatePage.query>) => {
      const nextQuery = { ...candidateQueryDraft, ...patch };
      setCandidateQueryDraft(nextQuery);
      onAction("literature-migration-set-candidate-query", {
        ...nextQuery,
      });
    };
    const selectProblemGroup = (index: number) => {
      const nextIndex = Math.max(0, Math.min(decisionGroups.length - 1, index));
      if (!decisionGroups[nextIndex]) return;
      setProblemGroupIndex(nextIndex);
      updateQuery({ reasonCode: decisionGroups[nextIndex]!.reasonCode });
    };
    const enterStep = (step: typeof wizardStep) => {
      if (step === "problems" && decisionGroups.length) {
        selectProblemGroup(currentStep === "overview" ? 0 : problemGroupIndex);
      }
      if (
        step === "finalreview" &&
        (candidateQueryDraft.search ||
          candidateQueryDraft.classification ||
          candidateQueryDraft.reasonCode ||
          candidateQueryDraft.disposition)
      ) {
        updateQuery({
          search: "",
          classification: "",
          reasonCode: "",
          disposition: "",
        });
      }
      setWizardStep(step);
    };
    const moveProblemGroup = (delta: number) => {
      const nextIndex = problemGroupIndex + delta;
      if (nextIndex >= decisionGroups.length) {
        enterStep("finalreview");
      } else if (nextIndex < 0) {
        enterStep("overview");
      } else {
        selectProblemGroup(nextIndex);
      }
    };
    const nextProblem = () => {
      if (!decisionGroups.length) enterStep("finalreview");
      else moveProblemGroup(1);
    };

    return (
      <section
        class="dashboard-migrations"
        data-region-content="dashboard-migrations"
        data-wizard-step={currentStep}
        data-availability={view.availability}
        aria-busy={workerActive}
      >
        <h2 class="page-title">{selection.pageTitle}</h2>
        <div class="dashboard-migrations-toolbar-row">
          <div class="dashboard-migrations-actions">
            <button
              type="button"
              class={`btn${scanning ? " is-busy" : ""}`}
              aria-busy={scanning}
              disabled={view.availability !== "available"}
              onClick={() =>
                onAction("literature-migration-scan", {
                  libraryId: view.libraryId,
                })
              }
            >
              {selection.scanLabel}
            </button>
            {view.activeRunId && workerActive ? (
              <button
                type="button"
                class="btn danger"
                onClick={() =>
                  onAction("literature-migration-stop", {
                    runId: view.activeRunId,
                  })
                }
              >
                {selection.stopLabel}
              </button>
            ) : null}
            {active?.state === "completed_with_attention" ||
            active?.state === "failed" ? (
              <button
                type="button"
                class="btn"
                disabled={workerActive}
                onClick={() =>
                  onAction("literature-migration-continue", {
                    runId: active.runId,
                  })
                }
              >
                {selection.continueLabel}
              </button>
            ) : null}
          </div>
          {active ? (
            <>
              <div class="dashboard-migrations-summary" aria-live="polite">
                <span class="zs-badge">
                  <strong>{candidatePage.summary.total}</strong>{" "}
                  {selection.candidateLabel}
                </span>
                {candidatePage.summary.total !==
                candidatePage.summary.unfilteredTotal ? (
                  <span class="zs-badge">
                    {selection.filteredLabel} {candidatePage.summary.total}/
                    {candidatePage.summary.unfilteredTotal}
                  </span>
                ) : null}
                <span class="zs-badge zs-badge--success">
                  <strong>{candidatePage.summary.ready}</strong>{" "}
                  {selection.readyLabel}
                </span>
                <span class="zs-badge zs-badge--warning">
                  <strong>{candidatePage.summary.reviewRequired}</strong>{" "}
                  {selection.reviewLabel}
                </span>
                <span class="zs-badge zs-badge--danger">
                  <strong>{candidatePage.summary.blocked}</strong>{" "}
                  {selection.blockedLabel}
                </span>
                <span class="zs-badge zs-badge--accent">
                  <strong>{candidatePage.summary.selected}</strong>{" "}
                  {selection.selectedLabel}
                </span>
                {active.reason ? (
                  <span class="attention">{active.reason}</span>
                ) : null}
              </div>
              {currentStep === "problems" || currentStep === "finalreview" ? (
                <div class="dashboard-migrations-filters">
                  <input
                    type="search"
                    class="text-input"
                    data-role="migration-search"
                    value={candidateQueryDraft.search}
                    placeholder={selection.searchPlaceholder}
                    aria-label={selection.searchPlaceholder}
                    disabled={workerActive}
                    onInput={(event) =>
                      updateQuery({ search: event.currentTarget.value })
                    }
                  />
                  <select
                    class="text-input"
                    aria-label={selection.classificationFilterLabel}
                    value={candidateQueryDraft.classification}
                    disabled={workerActive}
                    onChange={(event) =>
                      updateQuery({
                        classification: event.currentTarget.value as
                          | ""
                          | "ready"
                          | "review_required"
                          | "blocked",
                      })
                    }
                  >
                    <option value="">{selection.allLabel}</option>
                    <option value="ready">{selection.readyLabel}</option>
                    <option value="review_required">
                      {selection.reviewLabel}
                    </option>
                    <option value="blocked">{selection.blockedLabel}</option>
                  </select>
                  <select
                    class="text-input"
                    aria-label={selection.reasonFilterLabel}
                    value={candidateQueryDraft.reasonCode}
                    disabled={workerActive}
                    onChange={(event) =>
                      updateQuery({ reasonCode: event.currentTarget.value })
                    }
                  >
                    <option value="">{selection.allLabel}</option>
                    {candidatePage.availableReasons.map((reason) => (
                      <option value={reason} key={reason}>
                        {selection.reasonLabels[reason] || reason}
                      </option>
                    ))}
                  </select>
                  <select
                    class="text-input"
                    aria-label={selection.dispositionFilterLabel}
                    value={candidateQueryDraft.disposition}
                    disabled={workerActive}
                    onChange={(event) =>
                      updateQuery({
                        disposition: event.currentTarget.value as
                          | ""
                          | "pending"
                          | "include"
                          | "skip",
                      })
                    }
                  >
                    <option value="">{selection.allLabel}</option>
                    {Object.entries(selection.dispositionLabels).map(
                      ([value, label]) => (
                        <option value={value} key={value}>
                          {label}
                        </option>
                      ),
                    )}
                  </select>
                </div>
              ) : null}
            </>
          ) : null}
        </div>
        {active ? (
          <nav
            class="dashboard-migration-wizard-steps"
            aria-label={selection.pageTitle}
          >
            {(["overview", "problems", "finalreview", "results"] as const).map(
              (step, index) => (
                <button
                  type="button"
                  key={step}
                  data-role={`migration-step-${step}`}
                  aria-current={currentStep === step ? "step" : undefined}
                  class={currentStep === step ? "is-current" : ""}
                  disabled={
                    workerActive || (step === "results" && !terminalView)
                  }
                  onClick={() => enterStep(step)}
                >
                  <span
                    class="dashboard-migration-step-number"
                    aria-hidden="true"
                  >
                    {index + 1}
                  </span>
                  {guidance[
                    step === "finalreview"
                      ? "stepFinalReview"
                      : `step${step[0]!.toUpperCase()}${step.slice(1)}`
                  ] || step}
                </button>
              ),
            )}
          </nav>
        ) : null}
        {view.availability === "unavailable" ? (
          <p class="empty">
            {view.availabilityReason || selection.unavailableText}
          </p>
        ) : null}

        {view.progress ? (
          <div class="dashboard-migration-progress" aria-live="polite">
            <div class="dashboard-migration-progress-info">
              <strong>{selection.progressLabel}</strong>
              <span>
                {view.progress.completed}/
                {view.progress.total === null ? "…" : view.progress.total}
              </span>
              <span>
                {view.progress.candidateCount} {selection.candidateLabel}
              </span>
            </div>
            <div
              class="dashboard-migration-progress-track"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={view.progress.total ?? undefined}
              aria-valuenow={
                view.progress.total === null
                  ? undefined
                  : view.progress.completed
              }
            >
              <div
                class={`dashboard-migration-progress-fill${
                  view.progress.total === null ? " is-indeterminate" : ""
                }`}
                style={
                  view.progress.total
                    ? {
                        width: `${Math.min(
                          100,
                          Math.round(
                            (view.progress.completed / view.progress.total) *
                              100,
                          ),
                        )}%`,
                      }
                    : undefined
                }
              />
            </div>
          </div>
        ) : null}

        {view.lastDecision ? (
          <p
            class="dashboard-migration-decision-feedback"
            data-role="migration-decision-feedback"
            role="status"
          >
            <strong>
              {view.lastDecision.code
                ? guidance.decisionFailed
                : guidance.decisionApplied}
            </strong>
            {" · "}
            {selection.reasonLabels[view.lastDecision.reasonCode] ||
              view.lastDecision.reasonCode}
            {" · "}
            {view.lastDecision.kind
              ? selection.optionLabels[view.lastDecision.kind] ||
                view.lastDecision.kind
              : guidance.resetPolicy || selection.allLabel}
            {view.lastDecision.code ? (
              <>
                {view.lastDecision.candidateId ? (
                  <>
                    {" "}
                    · <code>{view.lastDecision.candidateId}</code>
                  </>
                ) : null}
                {view.lastDecision.validationCodes?.slice(0, 8).map((code) => (
                  <code
                    class="dashboard-migration-decision-validation"
                    key={code}
                  >
                    {code}
                  </code>
                ))}
              </>
            ) : (
              <>
                {" "}
                · {view.lastDecision.affected} {selection.issuesLabel}
              </>
            )}
          </p>
        ) : null}

        <div
          class="dashboard-migrations-body"
          inert={workerActive ? true : undefined}
        >
          <aside
            class={`dashboard-migrations-history${historyOpen ? " is-open" : ""}`}
            aria-label={selection.historyTitle}
          >
            <button
              type="button"
              class="dashboard-migrations-history-toggle"
              aria-label={guidance.historyToggle || selection.historyTitle}
              aria-expanded={historyOpen}
              onClick={() => setHistoryOpen(!historyOpen)}
            >
              <span>{selection.historyTitle}</span>
              <span>{historyOpen ? "−" : "+"}</span>
            </button>
            <h3>{selection.historyTitle}</h3>
            {view.history.length ? (
              <div
                class="dashboard-migrations-history-list"
                data-role="migration-history-list"
              >
                {view.history.map((run) => (
                  <button
                    type="button"
                    key={run.runId}
                    class={`dashboard-migration-history-entry${
                      run.runId === active?.runId ? " is-selected" : ""
                    }`}
                    aria-pressed={run.runId === active?.runId}
                    disabled={workerActive}
                    onClick={() =>
                      onAction("literature-migration-select-run", {
                        runId: run.runId,
                      })
                    }
                  >
                    <strong>
                      {selection.runStateLabels[run.state] || run.state}
                    </strong>
                    <span>
                      {run.processedCount}/{run.setCount}
                    </span>
                    <small>{run.updatedAt}</small>
                  </button>
                ))}
              </div>
            ) : (
              <p class="empty">{selection.emptyHistoryText}</p>
            )}
          </aside>

          <div
            class={`dashboard-migrations-workspace${selectedCandidate ? " has-drawer" : ""}`}
          >
            <div class="dashboard-migrations-results" ref={resultsRef}>
              {active && terminalView ? (
                <section
                  class="dashboard-migration-run-detail"
                  data-role="migration-run-detail"
                >
                  <header>
                    <h3>
                      {selection.runStateLabels[active.state] || active.state}
                    </h3>
                    <span class={`zs-badge ${outcomeBadgeClass(active.state)}`}>
                      {active.processedCount}/{active.setCount}
                    </span>
                    {active.state === "failed" ||
                    active.state === "completed_with_attention" ? (
                      <button
                        type="button"
                        class="btn"
                        onClick={() =>
                          onAction("literature-migration-copy-diagnostics", {
                            runId: active.runId,
                          })
                        }
                      >
                        {selection.copyDiagnosticBundleLabel}
                      </button>
                    ) : null}
                  </header>
                  <div class="dashboard-migration-run-facts">
                    <span>{active.createdAt}</span>
                    {active.terminalAt ? (
                      <span>{active.terminalAt}</span>
                    ) : null}
                    <span>
                      {active.remainingCount} {selection.unresolvedLabel}
                    </span>
                  </div>
                  {active.reason ? <p>{active.reason}</p> : null}
                  {primaryDiagnostic ? (
                    <section
                      class="dashboard-migration-primary-diagnostic"
                      data-role="migration-primary-diagnostic"
                    >
                      <header>
                        <h4>{selection.diagnosticTitle}</h4>
                        {primaryDiagnostic.code ? (
                          <code>{primaryDiagnostic.code}</code>
                        ) : null}
                      </header>
                      {primaryDiagnostic.message ? (
                        <p>
                          <strong>{selection.diagnosticCauseLabel}:</strong>{" "}
                          {primaryDiagnostic.message}
                        </p>
                      ) : primaryDiagnostic.authorityState === "unavailable" ? (
                        <p>{selection.diagnosticUnavailableText}</p>
                      ) : null}
                      {diagnosticFacts.length ? (
                        <dl>
                          {diagnosticFacts.map((fact) => (
                            <div key={fact.label}>
                              <dt>{fact.label}</dt>
                              <dd>
                                <code>{fact.value}</code>
                              </dd>
                            </div>
                          ))}
                        </dl>
                      ) : null}
                      {primaryDiagnostic.diagnostics.length ? (
                        <div class="dashboard-migration-diagnostics">
                          {primaryDiagnostic.diagnostics.map((diagnostic) => (
                            <code key={diagnostic}>{diagnostic}</code>
                          ))}
                        </div>
                      ) : null}
                      <p class="dashboard-migration-recovery-hint">
                        {diagnosticRecoveryHint(selection)}
                      </p>
                    </section>
                  ) : null}
                  {active.diagnostics.length ? (
                    <ul>
                      {active.diagnostics.map((diagnostic) => (
                        <li key={diagnostic}>{diagnostic}</li>
                      ))}
                    </ul>
                  ) : null}
                </section>
              ) : null}
              {active && currentStep === "overview" ? (
                <section
                  class="dashboard-migration-overview"
                  data-role="migration-overview"
                >
                  <h3>{guidance.overviewTitle || selection.migrationTitle}</h3>
                  <p>{guidance.overview || selection.batchHint}</p>
                  <dl>
                    <div>
                      <dt>{selection.candidateLabel}</dt>
                      <dd>{candidatePage.summary.unfilteredTotal}</dd>
                    </div>
                    <div>
                      <dt>{selection.selectedLabel}</dt>
                      <dd>{candidatePage.summary.selected}</dd>
                    </div>
                    <div>
                      <dt>{selection.issuesLabel}</dt>
                      <dd>
                        {decisionGroups.reduce(
                          (count, group) => count + group.totalCount,
                          0,
                        )}
                      </dd>
                    </div>
                  </dl>
                  <p>{guidance.sourceOverview || selection.verifiedHint}</p>
                </section>
              ) : null}
              {currentStep === "problems" ||
              currentStep === "finalreview" ||
              terminalView ? (
                <>
                  {!candidatePage.items.length ? (
                    <p class="empty">
                      {guidance.emptyResults || "No results."}
                    </p>
                  ) : null}
                  {active && !terminalView && currentStep === "finalreview" ? (
                    <div class="dashboard-migrations-select-all">
                      <input
                        type="checkbox"
                        ref={selectAllRef}
                        data-role="migration-select-all"
                        checked={allFilteredSelected}
                        disabled={active?.state !== "preview" || workerActive}
                        aria-label={selection.selectedLabel}
                        onChange={(event) =>
                          onAction(
                            "literature-migration-set-filter-selection",
                            {
                              scanOperationId: active?.operationId || "",
                              selected: event.currentTarget.checked,
                            },
                          )
                        }
                      />
                      <span>
                        {selection.selectedLabel} {filteredSelected}/
                        {filteredSelectable}
                      </span>
                    </div>
                  ) : null}
                  {active &&
                  !terminalView &&
                  currentStep === "problems" &&
                  decisionGroups.length ? (
                    <section
                      class="dashboard-migrations-batch"
                      aria-label={selection.batchLabel}
                    >
                      {activeDecisionGroup
                        ? (() => {
                            const group = activeDecisionGroup;
                            return (
                              <article
                                class="dashboard-migration-batch-group"
                                key={group.reasonCode}
                                data-reason-code={group.reasonCode}
                              >
                                <header>
                                  <h3 class="dashboard-migration-batch-reason">
                                    {problemGroupIndex + 1}/
                                    {decisionGroups.length} ·{" "}
                                    {selection.reasonLabels[group.reasonCode] ||
                                      group.reasonCode}
                                  </h3>
                                  <span>
                                    {group.totalCount}{" "}
                                    {selection.candidateLabel}
                                  </span>
                                  <span>
                                    {group.pendingCount}{" "}
                                    {guidance.pending || "pending"} ·{" "}
                                    {group.resolvedCount}{" "}
                                    {guidance.resolved || "resolved"}
                                  </span>
                                  {group.individualCount ? (
                                    <span>
                                      {group.individualCount}{" "}
                                      {guidance.individualOverrides ||
                                        "individual overrides"}
                                    </span>
                                  ) : null}
                                </header>
                                <ExpandableText
                                  className="dashboard-migration-issue-description"
                                  text={
                                    selection.reasonDescriptions?.[
                                      group.reasonCode
                                    ] || selection.batchHint
                                  }
                                  threshold={180}
                                  showMore={guidance.showMore || "Show more"}
                                  showLess={guidance.showLess || "Show less"}
                                />
                                <p>
                                  {guidance.groupScope || selection.batchHint}
                                </p>
                                {group.selectedKind ? (
                                  <p class="dashboard-migration-selected-policy">
                                    {guidance.selectedPolicy ||
                                      "Selected policy"}
                                    :{" "}
                                    {selection.optionLabels[
                                      group.selectedKind
                                    ] || group.selectedKind}
                                  </p>
                                ) : null}
                                <div
                                  class="dashboard-migration-group-options"
                                  role="group"
                                  aria-label={
                                    selection.reasonLabels[group.reasonCode] ||
                                    group.reasonCode
                                  }
                                >
                                  {group.kinds.map((entry) => (
                                    <button
                                      type="button"
                                      key={`${group.reasonCode}:${entry.kind}`}
                                      class={`btn dashboard-migration-batch-btn ${decisionKindClass(entry)}${group.selectedKind === entry.kind ? " is-selected" : ""}`}
                                      data-role="migration-batch-resolve"
                                      data-reason-code={group.reasonCode}
                                      data-kind={entry.kind}
                                      aria-pressed={
                                        group.selectedKind === entry.kind
                                      }
                                      title={
                                        selection.optionDescriptions?.[
                                          entry.kind
                                        ] || selection.batchHint
                                      }
                                      disabled={
                                        active?.state !== "preview" ||
                                        workerActive
                                      }
                                      onClick={() =>
                                        onAction(
                                          "literature-migration-resolve-issues-bulk",
                                          {
                                            scanOperationId:
                                              active?.operationId || "",
                                            reasonCode: group.reasonCode,
                                            kind: entry.kind,
                                          },
                                        )
                                      }
                                    >
                                      <strong>
                                        {selection.optionLabels[entry.kind] ||
                                          entry.kind}
                                      </strong>
                                      {entry.dataLoss ? (
                                        <span class="dashboard-migration-data-loss">
                                          {selection.reasonLabels.data_loss ||
                                            "Data loss"}
                                        </span>
                                      ) : null}
                                      <small>
                                        {selection.optionDescriptions?.[
                                          entry.kind
                                        ] ||
                                          (entry.dataLoss
                                            ? selection.reasonLabels
                                                .data_loss ||
                                              "May discard source information."
                                            : selection.batchHint)}
                                      </small>
                                      <span>
                                        ×
                                        {Math.max(
                                          0,
                                          group.totalCount -
                                            group.individualCount,
                                        )}
                                      </span>
                                    </button>
                                  ))}
                                </div>
                              </article>
                            );
                          })()
                        : null}
                      {activeDecisionGroup?.selectedKind ? (
                        <button
                          type="button"
                          class="btn dashboard-migration-reset-policy"
                          data-role="migration-reset-group-policy"
                          disabled={active?.state !== "preview" || workerActive}
                          onClick={() =>
                            onAction(
                              "literature-migration-resolve-issues-bulk",
                              {
                                scanOperationId: active?.operationId || "",
                                reasonCode: activeDecisionGroup.reasonCode,
                                kind: "",
                              },
                            )
                          }
                        >
                          {guidance.clearGroupPolicy || "Clear group policy"}
                        </button>
                      ) : null}
                    </section>
                  ) : null}
                  {currentStep === "problems" || terminalView ? (
                    <div class="dashboard-migrations-candidates">
                      {candidatePage.items.map((candidate) => {
                        const decisionCandidate = candidate;
                        return (
                          <article
                            class={`dashboard-migration-candidate${candidate.candidateId === selectedCandidateSnapshot?.candidateId ? " is-selected" : ""}`}
                            key={candidate.candidateId}
                            data-candidate-id={candidate.candidateId}
                            data-classification={candidate.classification}
                            tabIndex={workerActive ? -1 : 0}
                            onClick={() => {
                              if (!workerActive) {
                                setOpenIssue(null);
                                setSelectedCandidateSnapshot(candidate);
                              }
                            }}
                            onKeyDown={(event) => {
                              if (workerActive) return;
                              if (event.key !== "Enter" && event.key !== " ")
                                return;
                              event.preventDefault();
                              setOpenIssue(null);
                              setSelectedCandidateSnapshot(candidate);
                            }}
                          >
                            <div class="dashboard-migration-candidate-heading">
                              {terminalView ? (
                                <span
                                  class={`zs-badge ${outcomeBadgeClass(candidate.outcome)}`}
                                >
                                  {selection.outcomeLabels[candidate.outcome] ||
                                    candidate.outcome}
                                </span>
                              ) : (
                                <input
                                  type="checkbox"
                                  aria-label={
                                    candidate.title || selection.candidateLabel
                                  }
                                  checked={candidate.disposition === "include"}
                                  disabled={
                                    active?.state !== "preview" ||
                                    candidate.classification !== "ready" ||
                                    candidate.issues.some(
                                      (issue) => issue.status !== "resolved",
                                    ) ||
                                    workerActive
                                  }
                                  onClick={(event) => event.stopPropagation()}
                                  onChange={(event) =>
                                    onAction(
                                      "literature-migration-set-selection",
                                      {
                                        scanOperationId:
                                          active?.operationId || "",
                                        candidateId: candidate.candidateId,
                                        selected: event.currentTarget.checked,
                                      },
                                    )
                                  }
                                />
                              )}
                              <span class="dashboard-migration-candidate-title">
                                <strong class="dashboard-migration-candidate-title-text">
                                  <ExpandableText
                                    text={
                                      candidate.title ||
                                      `${selection.candidateLabel} ${candidate.ordinal}`
                                    }
                                    threshold={90}
                                    showMore={
                                      guidance.showMore || "Show full title"
                                    }
                                    showLess={guidance.showLess || "Show less"}
                                  />
                                </strong>
                                <small>
                                  {selection.candidateLabel} {candidate.ordinal}{" "}
                                  ·{" "}
                                  {terminalView
                                    ? selection.outcomeLabels[
                                        candidate.outcome
                                      ] || candidate.outcome
                                    : selection.dispositionLabels[
                                        candidate.disposition
                                      ] || candidate.disposition}
                                </small>
                              </span>
                              <span
                                class={`zs-badge ${
                                  candidate.classification === "ready"
                                    ? "zs-badge--success"
                                    : candidate.classification ===
                                        "review_required"
                                      ? "zs-badge--warning"
                                      : "zs-badge--danger"
                                }`}
                              >
                                {stateLabel(
                                  selection,
                                  candidate.classification,
                                )}
                              </span>
                            </div>
                            <CandidateFacts
                              candidate={candidate}
                              selection={selection}
                            />
                            {(
                              decisionCandidate.originalReasonCodes ||
                              candidate.reasonCodes
                            ).length ? (
                              <div class="dashboard-migration-reasons">
                                {(
                                  decisionCandidate.originalReasonCodes ||
                                  candidate.reasonCodes
                                ).map((reason) => (
                                  <span key={reason} title={reason}>
                                    {selection.reasonLabels[reason] || reason}
                                  </span>
                                ))}
                              </div>
                            ) : null}
                            {terminalView ? (
                              <div
                                class="dashboard-migration-terminal-decisions"
                                data-role="migration-terminal-decisions"
                              >
                                <span>
                                  {decisionCandidate.selectionSource ===
                                  "individual"
                                    ? guidance.individualSelection ||
                                      selection.selectedLabel
                                    : guidance.automaticSelection ||
                                      selection.selectedLabel}
                                </span>
                                {candidate.issues.map((issue) => {
                                  const chosenKind = issue.options.find(
                                    (option) =>
                                      option.optionId ===
                                      issue.selectedOptionId,
                                  )?.kind;
                                  return (
                                    <span key={issue.issueId}>
                                      {selection.reasonLabels[
                                        issue.reasonCode
                                      ] || issue.reasonCode}
                                      :{" "}
                                      {chosenKind
                                        ? selection.optionLabels[chosenKind] ||
                                          chosenKind
                                        : guidance.pending ||
                                          selection.allLabel}{" "}
                                      ·{" "}
                                      {issue.decisionSource === "individual"
                                        ? guidance.individualDecision
                                        : guidance.batchDecision}
                                    </span>
                                  );
                                })}
                              </div>
                            ) : null}
                          </article>
                        );
                      })}
                    </div>
                  ) : null}
                  {currentStep === "finalreview" ? (
                    <section
                      class="dashboard-migration-final-review"
                      data-role="migration-final-review"
                    >
                      <h3>
                        {guidance.finalReviewTitle || selection.applyLabel}
                      </h3>
                      <p>{guidance.finalReview || selection.droppedHint}</p>
                      <p>{guidance.sourceImpact || selection.verifiedHint}</p>
                      <p>
                        {candidatePage.summary.selected}{" "}
                        {selection.selectedLabel} ·{" "}
                        {candidatePage.summary.unfilteredTotal}{" "}
                        {selection.candidateLabel}
                      </p>
                      <div class="dashboard-migration-review-list">
                        {candidatePage.items.map((candidate) => {
                          const decisionCandidate = candidate;
                          const issueDecisionSummary = candidate.issues.map(
                            (issue) => {
                              const decisionSource = issue.decisionSource;
                              const chosenKind = issue.options.find(
                                (option) =>
                                  option.optionId === issue.selectedOptionId,
                              )?.kind;
                              const choice = chosenKind
                                ? selection.optionLabels[chosenKind] ||
                                  chosenKind
                                : guidance.pending || selection.allLabel;
                              return `${selection.reasonLabels[issue.reasonCode] || issue.reasonCode}: ${choice} · ${decisionSource === "individual" ? guidance.individualDecision || "Individual override" : guidance.batchDecision || "Group policy"}`;
                            },
                          );
                          const affectedItemTotal = candidate.issues.reduce(
                            (total, issue) =>
                              total + (issue.affectedItemTotal || 0),
                            0,
                          );
                          return (
                            <article
                              class="dashboard-migration-review-candidate"
                              key={candidate.candidateId}
                            >
                              <div class="dashboard-migration-review-selection">
                                <input
                                  type="checkbox"
                                  aria-label={
                                    candidate.title ||
                                    `${selection.candidateLabel} ${candidate.ordinal}`
                                  }
                                  checked={candidate.disposition === "include"}
                                  disabled={
                                    active?.state !== "preview" ||
                                    candidate.classification !== "ready" ||
                                    candidate.issues.some(
                                      (issue) => issue.status !== "resolved",
                                    ) ||
                                    workerActive
                                  }
                                  onChange={(event) =>
                                    onAction(
                                      "literature-migration-set-selection",
                                      {
                                        scanOperationId:
                                          active?.operationId || "",
                                        candidateId: candidate.candidateId,
                                        selected: event.currentTarget.checked,
                                      },
                                    )
                                  }
                                />
                                <ExpandableText
                                  text={
                                    candidate.title ||
                                    `${selection.candidateLabel} ${candidate.ordinal}`
                                  }
                                  threshold={90}
                                  showMore={guidance.showMore || "Show more"}
                                  showLess={guidance.showLess || "Show less"}
                                />
                              </div>
                              <span>
                                {(
                                  decisionCandidate.originalReasonCodes ||
                                  candidate.reasonCodes
                                )
                                  .map(
                                    (reason) =>
                                      selection.reasonLabels[reason] || reason,
                                  )
                                  .join(", ") || selection.readyLabel}
                              </span>
                              <span>
                                {decisionCandidate.selectionSource ===
                                "individual"
                                  ? guidance.individualSelection ||
                                    "Individual selection"
                                  : guidance.automaticSelection ||
                                    "Automatic selection"}
                              </span>
                              <span>
                                {candidate.verifiedCount}{" "}
                                {selection.verifiedLabel} ·{" "}
                                {candidate.droppedCount}{" "}
                                {selection.droppedLabel}
                              </span>
                              {issueDecisionSummary.length ? (
                                <span>{issueDecisionSummary.join(" · ")}</span>
                              ) : null}
                              {affectedItemTotal ? (
                                <span>
                                  {affectedItemTotal} {selection.issuesLabel}
                                </span>
                              ) : null}
                            </article>
                          );
                        })}
                      </div>
                    </section>
                  ) : null}
                </>
              ) : null}
            </div>

            {(currentStep === "problems" ||
              currentStep === "finalreview" ||
              terminalView) &&
            active ? (
              <CandidatePagination
                page={candidatePage}
                runId={active.runId}
                disabled={workerActive}
                selection={selection}
                onAction={onAction}
              />
            ) : null}

            {selectedCandidate &&
            (currentStep === "problems" || terminalView) ? (
              <aside
                id="migration-detail-drawer"
                class="dashboard-migration-drawer"
                data-role="migration-detail-drawer"
                aria-label={selection.detailsLabel}
              >
                <header>
                  <div>
                    <small>
                      {selection.candidateLabel} {selectedCandidate.ordinal}
                    </small>
                    <h3>
                      <ExpandableText
                        text={
                          selectedCandidate.title || selection.candidateLabel
                        }
                        threshold={90}
                        showMore={guidance.showMore || "Show full title"}
                        showLess={guidance.showLess || "Show less"}
                      />
                    </h3>
                  </div>
                  <button
                    type="button"
                    class="btn clear"
                    aria-label={selection.closeLabel}
                    onClick={() => setSelectedCandidateSnapshot(null)}
                  >
                    {selection.closeLabel}
                  </button>
                </header>
                <button
                  type="button"
                  class="btn dashboard-migration-drawer-back"
                  onClick={() => setSelectedCandidateSnapshot(null)}
                >
                  {guidance.backProblem || "Back to candidates"}
                </button>
                <CandidateFacts
                  candidate={selectedCandidate}
                  selection={selection}
                />
                {!terminalView ? (
                  <>
                    <section class="dashboard-migration-drawer-issues">
                      <h4>{selection.issuesLabel}</h4>
                      {selectedCandidate.issues.length ? (
                        selectedCandidate.issues.map((issue) => {
                          const decisionSource = issue.decisionSource;
                          return (
                            <article
                              class="dashboard-migration-issue"
                              key={issue.issueId}
                            >
                              <strong>
                                {selection.reasonLabels[issue.reasonCode] ||
                                  issue.reasonCode}
                              </strong>
                              {selection.reasonDescriptions?.[
                                issue.reasonCode
                              ] ? (
                                <ExpandableText
                                  className="dashboard-migration-issue-description"
                                  text={
                                    selection.reasonDescriptions[
                                      issue.reasonCode
                                    ]!
                                  }
                                  threshold={180}
                                  showMore={guidance.showMore || "Show more"}
                                  showLess={guidance.showLess || "Show less"}
                                />
                              ) : null}
                              {decisionSource ? (
                                <small
                                  class={`dashboard-migration-decision-source is-${decisionSource}`}
                                >
                                  {decisionSource === "individual"
                                    ? guidance.individualDecision ||
                                      "Individual override"
                                    : guidance.batchDecision || "Group policy"}
                                </small>
                              ) : null}
                              <button
                                type="button"
                                class="btn dashboard-migration-affected-toggle"
                                data-role="migration-issue-items-toggle"
                                aria-expanded={
                                  openIssue?.candidateId ===
                                    selectedCandidate.candidateId &&
                                  openIssue.issueId === issue.issueId
                                }
                                disabled={
                                  workerActive || active?.state !== "preview"
                                }
                                onClick={() => {
                                  if (
                                    openIssue?.candidateId ===
                                      selectedCandidate.candidateId &&
                                    openIssue.issueId === issue.issueId
                                  ) {
                                    setOpenIssue(null);
                                  } else {
                                    requestIssueItems(
                                      selectedCandidate.candidateId,
                                      issue.issueId,
                                      0,
                                    );
                                  }
                                }}
                              >
                                {guidance.affectedReferences ||
                                  "Affected references"}
                                {issue.affectedItemTotal
                                  ? ` · ${issue.affectedItemTotal}`
                                  : ""}
                              </button>
                              {openIssue?.candidateId ===
                                selectedCandidate.candidateId &&
                              openIssue.issueId === issue.issueId ? (
                                <>
                                  {matchingIssueItemsPage?.ok ? (
                                    matchingIssueItemsPage.items.length ? (
                                      <ul class="dashboard-migration-issue-items">
                                        {matchingIssueItemsPage.items.map(
                                          (item, itemIndex) => {
                                            const hint = item.hint
                                              ? issueItemHint(
                                                  selection,
                                                  issue.reasonCode,
                                                  item.hint,
                                                )
                                              : "";
                                            return (
                                              <li key={itemIndex}>
                                                <details class="dashboard-migration-issue-item">
                                                  <summary>
                                                    <span>{item.label}</span>
                                                    {hint ? (
                                                      <small>{hint}</small>
                                                    ) : null}
                                                  </summary>
                                                  <div>
                                                    <strong>
                                                      {item.label}
                                                    </strong>
                                                    {hint ? (
                                                      <p>{hint}</p>
                                                    ) : null}
                                                    {item.detail ? (
                                                      <p>{item.detail}</p>
                                                    ) : null}
                                                  </div>
                                                </details>
                                              </li>
                                            );
                                          },
                                        )}
                                      </ul>
                                    ) : (
                                      <p>
                                        {guidance.emptyResults ||
                                          "No affected items."}
                                      </p>
                                    )
                                  ) : matchingIssueItemsPage &&
                                    !matchingIssueItemsPage.ok ? (
                                    <p
                                      role="status"
                                      data-error-code={
                                        matchingIssueItemsPage.code
                                      }
                                    >
                                      {guidance.issueItemsUnavailable ||
                                        "Affected items are unavailable."}
                                    </p>
                                  ) : (
                                    <p role="status">
                                      {guidance.loading || "Loading…"}
                                    </p>
                                  )}
                                  {issueItemsPageCount > 1 &&
                                  matchingIssueItemsPage?.ok ? (
                                    <nav
                                      class="dashboard-migration-issue-pagination"
                                      aria-label={
                                        guidance.affectedDocuments ||
                                        "Affected items"
                                      }
                                    >
                                      <button
                                        type="button"
                                        class="btn"
                                        disabled={!matchingIssueItemsPage.page}
                                        onClick={() =>
                                          requestIssueItems(
                                            selectedCandidate.candidateId,
                                            issue.issueId,
                                            matchingIssueItemsPage.page - 1,
                                          )
                                        }
                                      >
                                        {selection.previousLabel}
                                      </button>
                                      <span>
                                        {matchingIssueItemsPage.page + 1}/
                                        {matchingIssueItemsPage.pageCount} ·{" "}
                                        {matchingIssueItemsPage.total}
                                      </span>
                                      <button
                                        type="button"
                                        class="btn"
                                        disabled={
                                          matchingIssueItemsPage.page >=
                                          matchingIssueItemsPage.pageCount - 1
                                        }
                                        onClick={() =>
                                          requestIssueItems(
                                            selectedCandidate.candidateId,
                                            issue.issueId,
                                            matchingIssueItemsPage.page + 1,
                                          )
                                        }
                                      >
                                        {selection.nextLabel}
                                      </button>
                                    </nav>
                                  ) : null}
                                </>
                              ) : null}
                              <div class="dashboard-migration-issue-options">
                                {issue.options.map((option) => (
                                  <button
                                    type="button"
                                    key={option.optionId}
                                    data-option-id={option.optionId}
                                    class={`btn ${decisionKindClass(option)}${
                                      issue.selectedOptionId === option.optionId
                                        ? " is-selected"
                                        : ""
                                    }`}
                                    aria-pressed={
                                      issue.selectedOptionId === option.optionId
                                    }
                                    title={
                                      selection.optionDescriptions?.[
                                        option.kind
                                      ] ||
                                      (option.dataLoss
                                        ? selection.reasonLabels.data_loss ||
                                          "Data loss"
                                        : undefined)
                                    }
                                    disabled={
                                      active?.state !== "preview" ||
                                      workerActive
                                    }
                                    onClick={() =>
                                      onAction(
                                        "literature-migration-resolve-issue",
                                        {
                                          scanOperationId:
                                            active?.operationId || "",
                                          candidateId:
                                            selectedCandidate.candidateId,
                                          issueId: issue.issueId,
                                          optionId: option.optionId,
                                        },
                                      )
                                    }
                                  >
                                    {selection.optionLabels[option.kind] ||
                                      option.kind}
                                    {selection.optionDescriptions?.[
                                      option.kind
                                    ] ? (
                                      <small>
                                        {
                                          selection.optionDescriptions[
                                            option.kind
                                          ]
                                        }
                                      </small>
                                    ) : null}
                                  </button>
                                ))}
                                {decisionSource === "individual" ? (
                                  <button
                                    type="button"
                                    class="btn"
                                    data-role="migration-reset-issue-policy"
                                    disabled={
                                      active?.state !== "preview" ||
                                      workerActive
                                    }
                                    onClick={() =>
                                      onAction(
                                        "literature-migration-resolve-issue",
                                        {
                                          scanOperationId:
                                            active?.operationId || "",
                                          candidateId:
                                            selectedCandidate.candidateId,
                                          issueId: issue.issueId,
                                          optionId: "",
                                        },
                                      )
                                    }
                                  >
                                    {guidance.useGroupPolicy ||
                                      "Use group policy"}
                                  </button>
                                ) : null}
                              </div>
                            </article>
                          );
                        })
                      ) : (
                        <p class="empty">{selection.readyLabel}</p>
                      )}
                    </section>
                    {selectedCandidate.diagnostics.length ? (
                      <details class="dashboard-migration-drawer-diagnostics">
                        <summary>{selection.diagnosticsLabel}</summary>
                        <div class="dashboard-migration-diagnostics">
                          {selectedCandidate.diagnostics.map((diagnostic) => (
                            <code key={diagnostic}>{diagnostic}</code>
                          ))}
                        </div>
                      </details>
                    ) : null}
                    <footer>
                      <button
                        type="button"
                        class="btn primary"
                        disabled={
                          active?.state !== "preview" ||
                          workerActive ||
                          selectedCandidate.classification !== "ready" ||
                          selectedCandidate.issues.some(
                            (issue) => issue.status !== "resolved",
                          )
                        }
                        onClick={() =>
                          onAction("literature-migration-set-selection", {
                            scanOperationId: active?.operationId || "",
                            candidateId: selectedCandidate.candidateId,
                            selected: true,
                          })
                        }
                      >
                        {selection.approveLabel}
                      </button>
                      <button
                        type="button"
                        class="btn"
                        disabled={active?.state !== "preview" || workerActive}
                        onClick={() =>
                          onAction("literature-migration-set-selection", {
                            scanOperationId: active?.operationId || "",
                            candidateId: selectedCandidate.candidateId,
                            selected: false,
                          })
                        }
                      >
                        {selection.skipLabel}
                      </button>
                    </footer>
                  </>
                ) : (
                  <section class="dashboard-migration-drawer-issues">
                    <h4>
                      {selection.outcomeLabels[selectedCandidate.outcome] ||
                        selectedCandidate.outcome}
                    </h4>
                    {selectedCandidate.reasonCodes.length ? (
                      <ul>
                        {selectedCandidate.reasonCodes.map((reason) => (
                          <li key={reason}>
                            {selection.reasonLabels[reason] || reason}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                    {selectedCandidate.diagnostics.length ? (
                      <details class="dashboard-migration-drawer-diagnostics">
                        <summary>{selection.diagnosticsLabel}</summary>
                        <ul>
                          {selectedCandidate.diagnostics.map((diagnostic) => (
                            <li key={diagnostic}>{diagnostic}</li>
                          ))}
                        </ul>
                      </details>
                    ) : null}
                  </section>
                )}
              </aside>
            ) : null}
          </div>
        </div>
        {active && !terminalView ? (
          <nav
            class="dashboard-migration-wizard-actions"
            aria-label={selection.pageTitle}
          >
            {currentStep !== "overview" ? (
              <button
                type="button"
                class="btn"
                data-role="migration-wizard-back"
                disabled={workerActive}
                onClick={() =>
                  currentStep === "finalreview"
                    ? enterStep(decisionGroups.length ? "problems" : "overview")
                    : moveProblemGroup(-1)
                }
              >
                {currentStep === "finalreview"
                  ? decisionGroups.length
                    ? guidance.backProblem || "Back to problems"
                    : guidance.backOverview || "Back to overview"
                  : problemGroupIndex
                    ? guidance.backProblem || "Previous problem"
                    : guidance.backOverview || "Back to overview"}
              </button>
            ) : null}
            {currentStep === "finalreview" ? (
              <button
                type="button"
                data-role="migration-apply"
                disabled={!canApply || workerActive}
                class={`btn primary${applying ? " is-busy" : ""}`}
                aria-busy={applying}
                onClick={() =>
                  onAction("literature-migration-apply", {
                    scanOperationId: active.operationId,
                    migrationId: active.migrationId,
                    definitionVersion: active.definitionVersion,
                  })
                }
              >
                {selection.applyLabel}
              </button>
            ) : (
              <button
                type="button"
                class="btn primary"
                data-role="migration-wizard-next"
                disabled={workerActive}
                onClick={() =>
                  currentStep === "overview"
                    ? decisionGroups.length
                      ? enterStep("problems")
                      : enterStep("finalreview")
                    : nextProblem()
                }
              >
                {currentStep === "overview"
                  ? decisionGroups.length
                    ? `${guidance.startProblems || guidance.nextProblem || "Review next problem"} (1/${decisionGroups.length})`
                    : guidance.reviewChanges || "Review changes"
                  : problemGroupIndex < decisionGroups.length - 1
                    ? `${guidance.nextProblem || "Next problem"} (${problemGroupIndex + 2}/${decisionGroups.length})`
                    : guidance.reviewChanges || "Review changes"}
              </button>
            )}
          </nav>
        ) : null}
      </section>
    );
  },
  (previous, next) =>
    previous.onAction === next.onAction &&
    equalBySignature(
      stableRegionSignature(previous.selection),
      stableRegionSignature(next.selection),
    ),
);
