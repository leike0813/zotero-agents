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
  selectedLabel: string;
  verifiedLabel: string;
  unresolvedLabel: string;
  recoveredLabel: string;
  droppedLabel: string;
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
  dispositionLabels: Record<string, string>;
  optionLabels: Record<string, string>;
  reasonLabels: Record<string, string>;
};

export type DashboardMigrationsAction = Extract<
  DashboardHostActionName,
  | "literature-migration-scan"
  | "literature-migration-apply"
  | "literature-migration-stop"
  | "literature-migration-continue"
  | "literature-migration-set-selection"
  | "literature-migration-resolve-issue"
  | "literature-migration-set-candidate-query"
  | "literature-migration-list-receipts"
  | "literature-migration-select-run"
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

function CandidateFacts(props: {
  candidate: DashboardLiteratureArtifactMigrationCandidate;
  selection: DashboardMigrationsSelection;
}) {
  const { candidate, selection } = props;
  return (
    <div class="dashboard-migration-facts">
      <span>
        {candidate.verifiedCount} {selection.verifiedLabel}
      </span>
      <span>
        {candidate.unresolvedCount} {selection.unresolvedLabel}
      </span>
      <span>
        {candidate.recoveredCount} {selection.recoveredLabel}
      </span>
      <span>
        {candidate.droppedCount} {selection.droppedLabel}
      </span>
    </div>
  );
}

export const MigrationsRegion = memo(
  function MigrationsRegion({ selection, onAction }: Props) {
    const { view } = selection;
    const active = view.activeRun;
    const { candidatePage } = view;
    const cursorHistory = useRef<string[]>([]);
    const runIdRef = useRef(active?.runId);
    const [selectedCandidateId, setSelectedCandidateId] = useState("");
    const selectedCandidate = candidatePage.items.find(
      (candidate) => candidate.candidateId === selectedCandidateId,
    );

    useEffect(() => {
      if (runIdRef.current === active?.runId) return;
      runIdRef.current = active?.runId;
      cursorHistory.current = [];
      setSelectedCandidateId("");
    }, [active?.runId]);

    const workerActive = view.availability === "busy";
    const canApply =
      !!active &&
      active.state === "preview" &&
      Boolean(view.activeOperationId) &&
      candidatePage.summary.selected > 0;
    const updateQuery = (patch: Partial<typeof candidatePage.query>) => {
      cursorHistory.current = [];
      setSelectedCandidateId("");
      onAction("literature-migration-set-candidate-query", {
        ...candidatePage.query,
        ...patch,
      });
    };
    const previousPage = () => {
      const cursor = cursorHistory.current.pop();
      if (cursor === undefined || !active) return;
      onAction("literature-migration-list-receipts", {
        runId: active.runId,
        cursor,
      });
    };
    const nextPage = () => {
      if (!candidatePage.nextCursor || !active) return;
      cursorHistory.current.push(candidatePage.cursor);
      setSelectedCandidateId("");
      onAction("literature-migration-list-receipts", {
        runId: active.runId,
        cursor: candidatePage.nextCursor,
      });
    };

    return (
      <section
        class="dashboard-migrations"
        data-region-content="dashboard-migrations"
        data-availability={view.availability}
      >
        <header class="dashboard-migrations-header zs-panel-header">
          <div class="zs-panel-header-main">
            <h2 class="zs-panel-header-title">{selection.pageTitle}</h2>
            {view.definitionVersion > 0 &&
            view.availability !== "unavailable" ? (
              <span class="dashboard-migrations-version zs-panel-header-subtitle">
                {view.migrationId} · {view.definitionVersion}
              </span>
            ) : null}
          </div>
          <div class="dashboard-migrations-toolbar zs-panel-header-actions">
            <button
              type="button"
              class="btn"
              disabled={view.availability !== "available"}
              onClick={() =>
                onAction("literature-migration-scan", {
                  libraryId: view.libraryId,
                })
              }
            >
              {selection.scanLabel}
            </button>
            {active ? (
              <button
                type="button"
                disabled={!canApply}
                class={`btn primary${workerActive ? " is-busy" : ""}`}
                aria-busy={workerActive}
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
            ) : null}
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
            {active?.state === "completed_with_attention" ? (
              <button
                type="button"
                class="btn"
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
        </header>
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
            <div class="dashboard-migrations-filters" role="search">
              <input
                type="search"
                class="text-input"
                data-role="migration-search"
                value={candidatePage.query.search}
                placeholder={selection.searchPlaceholder}
                aria-label={selection.searchPlaceholder}
                onInput={(event) =>
                  updateQuery({ search: event.currentTarget.value })
                }
              />
              <select
                class="text-input"
                aria-label={selection.classificationFilterLabel}
                value={candidatePage.query.classification}
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
                <option value="review_required">{selection.reviewLabel}</option>
                <option value="blocked">{selection.blockedLabel}</option>
              </select>
              <select
                class="text-input"
                aria-label={selection.reasonFilterLabel}
                value={candidatePage.query.reasonCode}
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
                value={candidatePage.query.disposition}
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
          </>
        ) : null}

        <div
          class={`dashboard-migrations-workspace${selectedCandidate ? " has-drawer" : ""}`}
        >
          <div class="dashboard-migrations-results">
            {candidatePage.items.length ? (
              <>
                <div class="dashboard-migrations-candidates zs-scroll-region">
                  {candidatePage.items.map((candidate) => (
                    <article
                      class={`dashboard-migration-candidate${candidate.candidateId === selectedCandidateId ? " is-selected" : ""}`}
                      key={candidate.candidateId}
                      data-classification={candidate.classification}
                    >
                      <div class="dashboard-migration-candidate-heading">
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
                          onChange={(event) =>
                            onAction("literature-migration-set-selection", {
                              scanOperationId: active?.operationId || "",
                              candidateId: candidate.candidateId,
                              selected: event.currentTarget.checked,
                            })
                          }
                        />
                        <span class="dashboard-migration-candidate-title">
                          <strong>
                            {candidate.title ||
                              `${selection.candidateLabel} ${candidate.ordinal}`}
                          </strong>
                          <small>
                            {selection.candidateLabel} {candidate.ordinal} ·{" "}
                            {selection.dispositionLabels[
                              candidate.disposition
                            ] || candidate.disposition}
                          </small>
                        </span>
                        <span
                          class={`zs-badge ${
                            candidate.classification === "ready"
                              ? "zs-badge--success"
                              : candidate.classification === "review_required"
                                ? "zs-badge--warning"
                                : "zs-badge--danger"
                          }`}
                        >
                          {stateLabel(selection, candidate.classification)}
                        </span>
                        <button
                          type="button"
                          class="btn"
                          data-action="migration-open-detail"
                          aria-controls="migration-detail-drawer"
                          aria-expanded={
                            candidate.candidateId === selectedCandidateId
                          }
                          onClick={() =>
                            setSelectedCandidateId(candidate.candidateId)
                          }
                        >
                          {selection.detailsLabel}
                        </button>
                      </div>
                      <CandidateFacts
                        candidate={candidate}
                        selection={selection}
                      />
                      {candidate.reasonCodes.length ? (
                        <div class="dashboard-migration-reasons">
                          {candidate.reasonCodes.map((reason) => (
                            <span key={reason} title={reason}>
                              {selection.reasonLabels[reason] || reason}
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </article>
                  ))}
                </div>
                <nav
                  class="dashboard-migrations-pagination zs-panel-fixed"
                  aria-label={selection.pageTitle}
                >
                  <button
                    type="button"
                    class="btn"
                    disabled={!cursorHistory.current.length}
                    onClick={previousPage}
                  >
                    {selection.previousLabel}
                  </button>
                  <span>
                    {candidatePage.items[0]?.ordinal || 0}–
                    {candidatePage.items.at(-1)?.ordinal || 0} /{" "}
                    {candidatePage.summary.total}
                  </span>
                  <button
                    type="button"
                    class="btn"
                    disabled={!candidatePage.nextCursor}
                    onClick={nextPage}
                  >
                    {selection.nextLabel}
                  </button>
                </nav>
              </>
            ) : (
              <p class="empty">{selection.migrationTitle}</p>
            )}
          </div>

          {selectedCandidate ? (
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
                  <h3>{selectedCandidate.title || selection.candidateLabel}</h3>
                </div>
                <button
                  type="button"
                  class="btn clear"
                  aria-label={selection.closeLabel}
                  onClick={() => setSelectedCandidateId("")}
                >
                  {selection.closeLabel}
                </button>
              </header>
              <CandidateFacts
                candidate={selectedCandidate}
                selection={selection}
              />
              <section class="dashboard-migration-drawer-issues">
                <h4>{selection.issuesLabel}</h4>
                {selectedCandidate.issues.length ? (
                  selectedCandidate.issues.map((issue) => (
                    <article
                      class="dashboard-migration-issue"
                      key={issue.issueId}
                    >
                      <strong>
                        {selection.reasonLabels[issue.reasonCode] ||
                          issue.reasonCode}
                      </strong>
                      <div class="dashboard-migration-issue-options">
                        {issue.options.map((option) => (
                          <button
                            type="button"
                            key={option.optionId}
                            data-option-id={option.optionId}
                            class={`btn${
                              issue.selectedOptionId === option.optionId
                                ? " is-selected"
                                : ""
                            }`}
                            aria-pressed={
                              issue.selectedOptionId === option.optionId
                            }
                            disabled={
                              active?.state !== "preview" || workerActive
                            }
                            onClick={() =>
                              onAction("literature-migration-resolve-issue", {
                                scanOperationId: active?.operationId || "",
                                candidateId: selectedCandidate.candidateId,
                                issueId: issue.issueId,
                                optionId: option.optionId,
                              })
                            }
                          >
                            {selection.optionLabels[option.kind] || option.kind}
                            {option.dataLoss
                              ? ` · ${selection.reasonLabels.data_loss || "Data loss"}`
                              : ""}
                          </button>
                        ))}
                      </div>
                    </article>
                  ))
                ) : (
                  <p class="empty">{selection.readyLabel}</p>
                )}
              </section>
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
            </aside>
          ) : null}
        </div>

        <details class="dashboard-migrations-history">
          <summary>{selection.historyTitle}</summary>
          {view.history.length ? (
            <ul>
              {view.history.map((run) => (
                <li key={run.runId}>
                  <button
                    type="button"
                    class="btn"
                    onClick={() =>
                      onAction("literature-migration-select-run", {
                        runId: run.runId,
                      })
                    }
                  >
                    {run.runId} · {run.state} · {run.processedCount}/
                    {run.setCount}
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p class="empty">{selection.emptyHistoryText}</p>
          )}
        </details>
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
