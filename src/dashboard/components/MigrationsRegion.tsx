/** @jsxRuntime automatic */
/** @jsxImportSource preact */
import { memo } from "preact/compat";

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
};

export type DashboardMigrationsAction = Extract<
  DashboardHostActionName,
  | "literature-migration-scan"
  | "literature-migration-apply"
  | "literature-migration-stop"
  | "literature-migration-continue"
  | "literature-migration-preview"
  | "literature-migration-list-receipts"
  | "literature-migration-list-history"
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
    const displayedCandidates = view.candidates.length
      ? view.candidates
      : view.receipts;
    const workerActive = view.availability === "busy";
    const canScan = view.availability === "available" && !workerActive;
    const canApply =
      !!active &&
      active.state === "preview" &&
      Boolean(view.activeOperationId) &&
      view.candidates.some(
        (candidate) =>
          candidate.classification === "ready" ||
          candidate.classification === "review_required",
      );
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
                  candidateIds: view.candidates
                    .filter(
                      (candidate) => candidate.classification !== "blocked",
                    )
                    .map((candidate) => candidate.candidateId),
                  reviewAcceptedCandidateIds: view.candidates
                    .filter(
                      (candidate) =>
                        candidate.classification === "review_required",
                    )
                    .map((candidate) => candidate.candidateId),
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
          <div class="dashboard-migrations-progress">
            <strong>{selection.progressLabel}</strong>
            <span>
              {active.processedCount}/{active.setCount} · {active.state}
            </span>
            {active.reason ? (
              <span class="attention">{active.reason}</span>
            ) : null}
          </div>
        ) : null}
        {displayedCandidates.length ? (
          <div class="dashboard-migrations-candidates">
            {displayedCandidates.map((candidate) => (
              <article
                class="dashboard-migration-candidate"
                key={candidate.candidateId}
              >
                <div>
                  <strong>
                    {selection.candidateLabel} {candidate.ordinal}
                  </strong>
                  <span class="status">
                    {stateLabel(selection, candidate.classification)}
                  </span>
                </div>
                <div class="dashboard-migration-facts">
                  <span>{candidate.verifiedCount} verified</span>
                  <span>{candidate.unresolvedCount} unresolved</span>
                  <span>{candidate.recoveredCount} recovered</span>
                  <span>{candidate.droppedCount} dropped</span>
                </div>
                {candidate.reasonCodes.length ? (
                  <div class="dashboard-migration-reasons">
                    {candidate.reasonCodes.join(", ")}
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        ) : (
          <p class="empty">{selection.migrationTitle}</p>
        )}
        <section class="dashboard-migrations-history">
          <h3>{selection.historyTitle}</h3>
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
        </section>
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
