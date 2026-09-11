/** @jsxRuntime automatic */
/** @jsxImportSource preact */
import { memo } from "preact/compat";
import { useEffect, useRef } from "preact/hooks";

import {
  equalBySignature,
  stableRegionSignature,
} from "../../shared/regionEquality";
import type {
  DashboardActionHandler,
  DashboardHostActionName,
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
  reasonLabels: Record<string, string>;
};

export type DashboardMigrationsAction = Extract<
  DashboardHostActionName,
  | "literature-migration-scan"
  | "literature-migration-apply"
  | "literature-migration-stop"
  | "literature-migration-continue"
  | "literature-migration-set-selection"
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

export const MigrationsRegion = memo(
  function MigrationsRegion({ selection, onAction }: Props) {
    const { view } = selection;
    const active = view.activeRun;
    const { candidatePage } = view;
    const cursorHistory = useRef<string[]>([]);
    useEffect(() => {
      cursorHistory.current = [];
    }, [active?.runId]);
    const workerActive = view.availability === "busy";
    const canScan = view.availability === "available" && !workerActive;
    const canApply =
      !!active &&
      active.state === "preview" &&
      Boolean(view.activeOperationId) &&
      candidatePage.summary.selected > 0;
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
        <header class="dashboard-migrations-header">
          <h2>{selection.pageTitle}</h2>
          {view.definitionVersion > 0 && view.availability !== "unavailable" ? (
            <span class="dashboard-migrations-version">
              {view.migrationId} · {view.definitionVersion}
            </span>
          ) : null}
        </header>
        {view.availability !== "available" ? (
          <p class="empty">
            {view.availabilityReason || selection.unavailableText}
          </p>
        ) : null}
        <div class="dashboard-migrations-toolbar">
          <button
            type="button"
            disabled={!canScan}
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
          {active && workerActive ? (
            <button
              type="button"
              onClick={() =>
                onAction("literature-migration-stop", { runId: active.runId })
              }
            >
              {selection.stopLabel}
            </button>
          ) : null}
          {active && active.state === "completed_with_attention" ? (
            <button
              type="button"
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
          <div class="dashboard-migrations-summary" aria-live="polite">
            <span>
              <strong>{candidatePage.summary.total}</strong>{" "}
              {selection.candidateLabel}
            </span>
            <span class="is-ready">
              <strong>{candidatePage.summary.ready}</strong>{" "}
              {selection.readyLabel}
            </span>
            <span class="is-review">
              <strong>{candidatePage.summary.reviewRequired}</strong>{" "}
              {selection.reviewLabel}
            </span>
            <span class="is-blocked">
              <strong>{candidatePage.summary.blocked}</strong>{" "}
              {selection.blockedLabel}
            </span>
            <span class="is-selected">
              <strong>{candidatePage.summary.selected}</strong>{" "}
              {selection.selectedLabel}
            </span>
            {active.state !== "preview" ? (
              <span>
                {selection.progressLabel} {active.processedCount}/
                {active.setCount}
              </span>
            ) : null}
            {active.reason ? (
              <span class="attention">{active.reason}</span>
            ) : null}
          </div>
        ) : null}
        {candidatePage.items.length ? (
          <>
            <div class="dashboard-migrations-candidates">
              {candidatePage.items.map((candidate) => (
                <article
                  class="dashboard-migration-candidate"
                  key={candidate.candidateId}
                  data-classification={candidate.classification}
                >
                  <label class="dashboard-migration-candidate-heading">
                    <input
                      type="checkbox"
                      checked={candidate.selected}
                      disabled={
                        active?.state !== "preview" ||
                        candidate.classification === "blocked" ||
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
                    <span>
                      <strong>
                        {candidate.title ||
                          `${selection.candidateLabel} ${candidate.ordinal}`}
                      </strong>
                      {candidate.title ? (
                        <small>
                          {selection.candidateLabel} {candidate.ordinal}
                        </small>
                      ) : null}
                    </span>
                    <span class="status">
                      {stateLabel(selection, candidate.classification)}
                    </span>
                  </label>
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
              class="dashboard-migrations-pagination"
              aria-label={selection.pageTitle}
            >
              <button
                type="button"
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
        <details class="dashboard-migrations-history">
          <summary>{selection.historyTitle}</summary>
          {view.history.length ? (
            <ul>
              {view.history.map((run) => (
                <li key={run.runId}>
                  <button
                    type="button"
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
