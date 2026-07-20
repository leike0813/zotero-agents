/** @jsxRuntime automatic */
/** @jsxImportSource preact */
import { memo } from "preact/compat";
import { useLayoutEffect } from "preact/hooks";

import { equalBySignature, safeText } from "./regionEquality";
import type { PanelActionHandler } from "./ActionControls";
import type { LabelOfFn } from "./HintRegion";
import type { StatusToneFn } from "./BannerRegion";

// Preact port of the imperative workspace task drawer
// (renderAssistantWorkspaceTaskDrawer and helpers in
// src/sidebar/assistantPanelRenderer.js). The hand-rolled three-level keyed
// reconcile (section/group/task) collapses into keyed lists: keys are the
// same identity fields the old reconcile used, so unchanged sections,
// groups, and task rows keep their DOM identity, and the old live-field
// updates (updatedAt, is-active) are ordinary props diffs.

export type ContextDrawerSelection = {
  layout: string;
  contextTitle: string;
  selectedTaskKey: string;
  contextCount: number;
  sections: Array<Record<string, unknown>>;
  notice: string;
  labels: Record<string, unknown>;
};

function statusToneClass(toneValue: unknown, stateValue: unknown): string {
  const tone = safeText(toneValue);
  const state = safeText(stateValue);
  if (tone === "error" || tone === "danger" || state === "failed") {
    return " is-error";
  }
  if (tone === "success" || state === "succeeded" || state === "skipped") {
    return " is-success";
  }
  if (tone === "warning") return " is-warning";
  if (tone === "accent" || state === "pending" || state === "running") {
    return " is-running";
  }
  return " is-muted";
}

function statusLedClass(toneValue: unknown, stateValue: unknown): string {
  const className = statusToneClass(toneValue, stateValue);
  if (className.indexOf("is-error") >= 0) return "is-error";
  if (className.indexOf("is-success") >= 0) return "is-success";
  if (className.indexOf("is-warning") >= 0) return "is-warning";
  if (className.indexOf("is-running") >= 0) return "is-running";
  return "is-muted";
}

function taskKeyOf(task: Record<string, unknown>): string {
  return safeText(task.key || task.taskKey || task.id);
}

function groupKeyOf(group: Record<string, unknown>): string {
  return (
    safeText(group.backendId) ||
    safeText(group.backendDisplayName) ||
    safeText(group.title)
  );
}

function WorkspaceTaskAction(props: {
  action: Record<string, unknown>;
  onAction: PanelActionHandler;
}) {
  const { action, onAction } = props;
  const label = safeText(action.label) || "Archive";
  const icon = safeText(action.icon);
  const disabled = action.enabled === false;
  return (
    <button
      type="button"
      class={
        "assistant-workspace-drawer-task-action" +
        (icon === "archive" ? " is-archive" : "") +
        (safeText(action.tone) ? " is-" + safeText(action.tone) : "")
      }
      disabled={disabled}
      title={label}
      aria-label={label}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        if (disabled) return;
        onAction(action.action, action.payload || {});
      }}
    >
      {icon === "archive" ? (
        <span class="zs-icon zs-icon-sm zs-icon-archive" />
      ) : null}
    </button>
  );
}

function MainStatusBadge(props: {
  item: Record<string, unknown>;
  statusTone: StatusToneFn;
}) {
  const { item, statusTone } = props;
  const status = safeText(item.mainStatus || item.status || item.state);
  const label =
    safeText(
      item.mainStatusLabel || item.stateLabel || item.status || item.state,
    ) || "-";
  const tone = safeText(item.mainStatusTone) || statusTone(status);
  return (
    <span
      class={
        "assistant-workspace-drawer-task-main-status is-" + (tone || "muted")
      }
    >
      {label}
    </span>
  );
}

function StatusAxis(props: { label: string; value: string; tone: string }) {
  return (
    <span class="assistant-workspace-drawer-task-status-axis">
      <span class="assistant-workspace-drawer-task-status-axis-label">
        {props.label}
      </span>
      <span class={"asst-led " + statusLedClass(props.tone, props.value)} />
      <span class="assistant-workspace-drawer-task-status-axis-value">
        {props.value || "-"}
      </span>
    </span>
  );
}

function WorkspaceTask(props: {
  task: Record<string, unknown>;
  selectedTaskKey: string;
  labels: Record<string, unknown>;
  onAction: PanelActionHandler;
  statusTone: StatusToneFn;
}) {
  const { task, selectedTaskKey, labels, onAction, statusTone } = props;
  const taskKey = taskKeyOf(task);
  const selectable = task.selectable === true && !!taskKey;
  const relationState = safeText(task.relationState);
  const attention = safeText(task.attention);
  const updatedAt = safeText(task.updatedAt);
  const axes: Array<{ label: string; value: string; tone: string }> = [];
  if (task.showBackendStatusBadge !== false) {
    axes.push({
      label:
        safeText(
          labels.statusBackend || labels.backendStatus || labels.backend,
        ) || "Backend",
      value:
        safeText(
          task.backendStatusLabel || task.backendStatus || task.backend_status,
        ) || "-",
      tone:
        safeText(task.backendStatusTone) ||
        statusTone(task.backendStatus || task.backend_status),
    });
  }
  if (task.showApplyStatusBadge !== false) {
    axes.push({
      label:
        safeText(labels.statusApply || labels.applyStatus || labels.apply) ||
        "Apply",
      value:
        safeText(
          task.applyStatusLabel ||
            task.applyStateLabel ||
            task.applyStatus ||
            task.applyState,
        ) || "-",
      tone: safeText(task.applyStatusTone || task.applyTone),
    });
  }
  const itemActions = Array.isArray(task.itemActions)
    ? (task.itemActions as Array<Record<string, unknown>>).filter(
        (action) =>
          action && typeof action === "object" && safeText(action.action),
      )
    : [];
  return (
    <div
      class={
        "assistant-workspace-drawer-task skillrunner-workspace-task" +
        (taskKey && taskKey === selectedTaskKey ? " is-active" : "") +
        (relationState === "related" ? " is-related" : "") +
        (selectable ? "" : " is-disabled")
      }
      data-assistant-task-key={taskKey || null}
    >
      <button
        type="button"
        class="assistant-workspace-drawer-task-main"
        disabled={!selectable}
        title={
          selectable
            ? undefined
            : safeText(labels.waitingRequestId) || "Waiting for requestId"
        }
        onClick={(event) => {
          if (!selectable) return;
          event.preventDefault();
          event.stopPropagation();
          onAction(task.action || "select-task", task.payload || { taskKey });
        }}
      >
        <div class="assistant-workspace-drawer-task-content">
          {attention === "warning" ? (
            <span
              class="assistant-workspace-drawer-task-attention asst-led is-warning"
              title={
                safeText(task.attentionLabel) ||
                safeText(labels.needsUserInteraction) ||
                "Needs user interaction"
              }
            />
          ) : null}
          <div class="assistant-workspace-drawer-task-title skillrunner-workspace-task-title">
            {safeText(task.title || task.taskName || task.inputUnitLabel) ||
              safeText(labels.waitingRequestId) ||
              "Waiting for requestId"}
          </div>
          <div class="assistant-workspace-drawer-task-workflow skillrunner-workspace-task-workflow">
            {safeText(task.workflowLabel) || "-"}
          </div>
          <div class="assistant-workspace-drawer-task-meta skillrunner-workspace-task-meta">
            <MainStatusBadge item={task} statusTone={statusTone} />
            {axes.length > 0 ? (
              <span class="assistant-workspace-drawer-task-status-axes">
                {axes.map((axis) => (
                  <StatusAxis
                    key={axis.label}
                    label={axis.label}
                    value={axis.value}
                    tone={axis.tone}
                  />
                ))}
              </span>
            ) : null}
            {updatedAt ? (
              <span class="assistant-workspace-drawer-task-updated-at">
                {updatedAt}
              </span>
            ) : null}
          </div>
        </div>
      </button>
      {itemActions.length > 0 ? (
        <div class="assistant-workspace-drawer-task-actions">
          {itemActions.map((action) => (
            <WorkspaceTaskAction
              action={action}
              onAction={onAction}
              key={safeText(action.action)}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function WorkspaceGroup(props: {
  group: Record<string, unknown>;
  sectionId: string;
  selectedTaskKey: string;
  labels: Record<string, unknown>;
  onAction: PanelActionHandler;
  statusTone: StatusToneFn;
}) {
  const { group, sectionId, selectedTaskKey, labels, onAction, statusTone } =
    props;
  const groupKey = groupKeyOf(group);
  const groupCollapsed = group.collapsed === true;
  const disabled = group.disabled === true;
  const activeTasks = Array.isArray(group.activeTasks)
    ? (group.activeTasks as Array<Record<string, unknown>>)
    : [];
  const finishedTasks = Array.isArray(group.finishedTasks)
    ? (group.finishedTasks as Array<Record<string, unknown>>)
    : [];
  return (
    <section
      class={
        "assistant-workspace-drawer-group skillrunner-workspace-group" +
        (disabled ? " is-disabled" : "") +
        (groupCollapsed ? " is-collapsed" : " is-expanded")
      }
      data-assistant-group-key={groupKey}
    >
      <button
        type="button"
        class="assistant-workspace-drawer-group-header skillrunner-workspace-group-header"
        aria-expanded={groupCollapsed ? "false" : "true"}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          onAction("toggle-drawer-group", {
            sectionId,
            backendId: safeText(group.backendId),
            groupKey,
            collapsed: groupCollapsed,
          });
        }}
      >
        <span class="assistant-workspace-drawer-group-title">
          {safeText(
            group.backendDisplayName || group.backendId || group.title,
          ) || "-"}
        </span>
        {disabled ? (
          <span class="assistant-workspace-drawer-group-disabled-tag skillrunner-workspace-group-disabled-tag">
            {safeText(labels.backendUnavailable) || "Unavailable"}
          </span>
        ) : null}
      </button>
      <div
        class="assistant-workspace-drawer-group-body skillrunner-workspace-group-body"
        data-assistant-group-body="true"
      >
        {disabled ? (
          <div class="assistant-workspace-drawer-group-disabled-hint skillrunner-workspace-group-disabled-hint">
            {safeText(group.disabledReason) ||
              safeText(labels.backendUnavailable) ||
              "Backend unavailable"}
          </div>
        ) : null}
        {groupCollapsed
          ? null
          : [...activeTasks, ...finishedTasks].map((task, index) => (
              <WorkspaceTask
                task={task}
                selectedTaskKey={selectedTaskKey}
                labels={labels}
                onAction={onAction}
                statusTone={statusTone}
                key={taskKeyOf(task) || index}
              />
            ))}
      </div>
    </section>
  );
}

function sectionTasks(section: Record<string, unknown>): number {
  const groups = Array.isArray(section.groups)
    ? (section.groups as Array<Record<string, unknown>>)
    : [];
  return groups.reduce((count, group) => {
    const active = Array.isArray(group && group.activeTasks)
      ? (group.activeTasks as unknown[]).length
      : 0;
    const finished = Array.isArray(group && group.finishedTasks)
      ? (group.finishedTasks as unknown[]).length
      : 0;
    return count + active + finished;
  }, 0);
}

export const ContextDrawerRegion = memo(
  function ContextDrawerRegion(props: {
    container: HTMLElement;
    selection: ContextDrawerSelection;
    onAction: PanelActionHandler;
    labelOf: LabelOfFn;
    statusTone: StatusToneFn;
  }) {
    const { container, selection, onAction, labelOf, statusTone } = props;
    const labels = selection.labels || {};
    useLayoutEffect(() => {
      container.setAttribute(
        "data-assistant-context-count",
        String(selection.contextCount || 0),
      );
      container.onclick = (event) => {
        const panel = container.querySelector(":scope > .asst-drawer-panel");
        const target = event && (event.target as Node | null);
        if (panel && target && panel.contains(target)) {
          if (typeof event.stopPropagation === "function") {
            event.stopPropagation();
          }
          return;
        }
        onAction("close-context-drawer", {});
      };
    }, [container]);
    const sections = (
      Array.isArray(selection.sections) ? selection.sections : []
    ).filter(
      (section) =>
        section && typeof section === "object" && sectionTasks(section) > 0,
    );
    const availableTaskCount = sections.reduce(
      (count, section) => count + sectionTasks(section),
      0,
    );
    const selectedTaskKey = safeText(selection.selectedTaskKey);
    const noticeText = safeText(selection.notice);
    return (
      <>
        <div class="assistant-panel-context-drawer-header assistant-workspace-drawer-header skillrunner-workspace-drawer-header">
          <strong>
            {safeText(
              selection.contextTitle ||
                labels.tasksToggle ||
                labels.sessionsTitle,
            ) || labelOf("actions.runs", "Runs")}
          </strong>
          <button
            type="button"
            class="asst-button-compact"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onAction("close-context-drawer", {});
            }}
          >
            {labelOf("actions.close", "Close")}
          </button>
        </div>
        <div class="assistant-workspace-drawer-sections skillrunner-workspace-sections">
          {sections.map((section) => {
            const sectionId = safeText(section.id);
            const sectionTitle = safeText(
              section.title || sectionId || "Tasks",
            );
            const sectionCollapsed =
              sectionId === "completed" && section.collapsed === true;
            const groups = Array.isArray(section.groups)
              ? (section.groups as Array<Record<string, unknown>>)
              : [];
            return (
              <section
                key={sectionId}
                class={
                  "assistant-workspace-drawer-section skillrunner-workspace-section" +
                  (sectionId === "completed"
                    ? " is-completed"
                    : sectionId === "running"
                      ? " is-running"
                      : " is-neutral") +
                  (sectionCollapsed ? " is-collapsed" : " is-expanded")
                }
                data-assistant-section-id={sectionId}
              >
                {sectionId === "completed" ? (
                  <button
                    type="button"
                    class="assistant-workspace-drawer-section-toggle skillrunner-workspace-section-toggle"
                    aria-expanded={sectionCollapsed ? "false" : "true"}
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      onAction("toggle-drawer-section", {
                        sectionId: "completed",
                      });
                    }}
                  >
                    {sectionTitle || "Completed"}
                  </button>
                ) : section.hideTitle !== true ? (
                  <div class="assistant-workspace-drawer-section-title skillrunner-workspace-section-title">
                    {sectionTitle || "Running"}
                  </div>
                ) : null}
                <div class="assistant-workspace-drawer-section-body skillrunner-workspace-section-body">
                  {sectionCollapsed
                    ? null
                    : groups.map((group, index) => (
                        <WorkspaceGroup
                          group={group}
                          sectionId={sectionId}
                          selectedTaskKey={selectedTaskKey}
                          labels={labels}
                          onAction={onAction}
                          statusTone={statusTone}
                          key={groupKeyOf(group) || index}
                        />
                      ))}
                </div>
              </section>
            );
          })}
          {noticeText ? (
            <div class="assistant-workspace-drawer-history-notice skillrunner-workspace-history-notice">
              {noticeText}
            </div>
          ) : null}
          {availableTaskCount === 0 ? (
            <div class="assistant-workspace-drawer-empty skillrunner-workspace-empty">
              {safeText(labels.emptyTasks) ||
                labelOf("drawer.emptyTasks", "No runs.")}
            </div>
          ) : null}
        </div>
      </>
    );
  },
  (prev, next) =>
    prev.container === next.container &&
    equalBySignature(prev.selection, next.selection),
);
