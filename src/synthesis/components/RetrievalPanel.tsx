/** @jsxRuntime automatic */
/** @jsxImportSource preact */

import type { ComponentChildren } from "preact";
import type {
  SynthesisWorkbenchHomeAction,
  SynthesisWorkbenchHomeRetrievalSelection,
  SynthesisWorkbenchHomeText,
} from "./HomeRegion";

function RetrievalActionButton(props: {
  label: string;
  command: string;
  args?: Record<string, unknown>;
  disabled?: boolean;
  primary?: boolean;
  pending: string[];
  onAction: SynthesisWorkbenchHomeAction;
}) {
  const busy = props.pending.includes(props.command);
  return (
    <button
      type="button"
      data-synthesis-command={props.command}
      class={[props.primary ? "primary" : "", busy ? "is-busy" : ""].join(" ")}
      disabled={props.disabled || busy}
      aria-busy={busy ? "true" : undefined}
      onClick={() =>
        props.onAction("hostCommand", {
          command: props.command,
          ...(props.args ? { args: props.args } : {}),
        })
      }
    >
      {busy ? <span class="button-spinner" aria-hidden="true" /> : null}
      {props.label}
    </button>
  );
}

export function RetrievalPanel(props: {
  selection: SynthesisWorkbenchHomeRetrievalSelection;
  pendingOperationKeys: string[];
  t: SynthesisWorkbenchHomeText;
  onAction: SynthesisWorkbenchHomeAction;
  /** A pending target differs from the published index, so an in-place
   * update would encode against the wrong identity or scope. */
  targetChanged?: boolean;
  children?: ComponentChildren;
}) {
  const { selection: retrieval, t, onAction } = props;
  const pending = props.pendingOperationKeys;
  const maintenance = retrieval.maintenance;
  const maintenanceStatus = maintenance?.status;
  const maintenanceRunning =
    maintenanceStatus === "pending" || maintenanceStatus === "running";
  const canRetry =
    maintenanceStatus === "failed" || maintenanceStatus === "canceled";
  const canContinue =
    maintenanceStatus === "pending" &&
    maintenance?.phase === "continuation_required";
  const configured = retrieval.configured;
  const canBuild =
    retrieval.enabled &&
    Boolean(retrieval.pendingIdentity) &&
    !maintenanceRunning;
  const rebuildRequired = Boolean(props.targetChanged);
  const canCleanup =
    !maintenanceRunning && (Boolean(retrieval.publication) || canRetry);
  const statusKey = !configured
    ? "synthesis-sync-not-configured"
    : !retrieval.enabled
      ? "synthesis-retrieval-disabled"
      : retrieval.status === "ready"
        ? "synthesis-retrieval-status-ready"
        : retrieval.status === "paused"
          ? "synthesis-retrieval-status-paused"
          : "synthesis-retrieval-status-missing";
  const tone =
    configured && retrieval.enabled && retrieval.status === "ready"
      ? "success"
      : "warning";
  const progress = retrieval.progress;
  const maintenanceArgs = {
    identity: retrieval.pendingIdentity || null,
    scope: retrieval.pendingScope || retrieval.activeScope || null,
  };
  const taskArgs = maintenance
    ? { operationId: maintenance.operationId }
    : undefined;
  const action = (
    key: Parameters<SynthesisWorkbenchHomeText>[0],
    command: string,
    args?: Record<string, unknown>,
    disabled = false,
    primary = false,
  ) => (
    <RetrievalActionButton
      label={t(key)}
      command={command}
      args={args}
      disabled={disabled}
      primary={primary}
      pending={pending}
      onAction={onAction}
    />
  );

  return (
    <section
      class="home-service-card retrieval-panel"
      aria-labelledby={props.children ? undefined : "home-retrieval-title"}
      aria-label={props.children ? t("synthesis-explorer-details") : undefined}
    >
      {!props.children && (
        <div class="home-service-heading">
          <div class="home-service-title">
            <span class="zs-icon zs-icon-manage-search" aria-hidden="true" />
            <h3 id="home-retrieval-title">{t("synthesis-home-retrieval")}</h3>
          </div>
          <div class="home-service-state" role="status">
            <strong class={`zs-badge zs-badge--${tone}`}>{t(statusKey)}</strong>
          </div>
        </div>
      )}
      {props.children}
      {maintenance ? (
        <div class="home-service-task" role="status">
          <span
            class={`zs-badge zs-badge--${maintenanceStatus === "failed" ? "danger" : maintenanceStatus === "completed" ? "success" : maintenanceRunning ? "accent" : "warning"}`}
          >
            {t(`synthesis-retrieval-maintenance-${maintenance.status}`)}
          </span>
          {maintenanceRunning ? (
            <div class="home-service-progress">
              <progress
                aria-label={t("synthesis-retrieval-progress-label")}
                max={
                  progress.totalGroups > 0 ? progress.totalGroups : undefined
                }
                value={
                  progress.totalGroups > 0
                    ? Math.min(progress.completedGroups, progress.totalGroups)
                    : undefined
                }
              />
              {progress.totalGroups > 0 ? (
                <span class="home-service-progress-label">
                  {t("synthesis-retrieval-progress", {
                    completed: progress.completedGroups,
                    total: progress.totalGroups,
                  })}
                </span>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
      <div class="home-service-footer">
        {progress.missingGroups > 0 ||
        progress.failedGroups > 0 ||
        retrieval.issueCount > 0 ? (
          <div class="home-service-notices" key="notices">
            {progress.missingGroups > 0 ? (
              <span class="zs-badge zs-badge--warning">
                {t("synthesis-retrieval-coverage", {
                  count: progress.missingGroups,
                })}
              </span>
            ) : null}
            {progress.failedGroups > 0 ? (
              <span class="zs-badge zs-badge--danger">
                {t("synthesis-retrieval-failures", {
                  count: progress.failedGroups,
                })}
              </span>
            ) : null}
            {retrieval.issueCount > 0 ? (
              <span class="zs-badge zs-badge--warning">
                {t("synthesis-retrieval-issues-count", {
                  count: retrieval.issueCount,
                })}
              </span>
            ) : null}
          </div>
        ) : null}
        {configured ? (
          <div class="toolbar home-service-actions" key="actions">
            {!maintenanceRunning ? (
              <>
                {action(
                  retrieval.publication
                    ? "synthesis-action-retrieval-update"
                    : "synthesis-action-retrieval-build",
                  retrieval.publication
                    ? "retrievalUpdateIndex"
                    : "retrievalBuildIndex",
                  maintenanceArgs,
                  !canBuild || rebuildRequired,
                  !rebuildRequired,
                )}
                {action(
                  "synthesis-action-retrieval-rebuild",
                  "retrievalRebuildIndex",
                  maintenanceArgs,
                  !canBuild,
                  rebuildRequired,
                )}
              </>
            ) : null}
            {maintenanceRunning
              ? action(
                  "synthesis-action-retrieval-cancel",
                  "retrievalCancelIndex",
                  taskArgs,
                )
              : null}
            {canContinue
              ? action(
                  "synthesis-action-retrieval-continue",
                  "retrievalContinueIndex",
                  taskArgs,
                  false,
                  true,
                )
              : null}
            {canRetry
              ? action(
                  "synthesis-action-retrieval-retry",
                  "retrievalRetryIndex",
                  taskArgs,
                )
              : null}
            {!maintenanceRunning
              ? action(
                  "synthesis-action-retrieval-cleanup",
                  "retrievalCleanupIndex",
                  undefined,
                  !canCleanup,
                )
              : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}
