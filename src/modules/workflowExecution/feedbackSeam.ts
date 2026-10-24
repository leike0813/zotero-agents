import {
  buildWorkflowFinishMessage,
  buildWorkflowJobToastMessage,
  buildWorkflowStartToastMessage,
  buildWorkflowWaitingToastMessage,
  type WorkflowMessageFormatter,
} from "./workflowExecuteMessage";
import { config } from "../../../package.json";
import {
  resolveAddonName,
  resolveAddonRef,
  resolveToolkitMember,
} from "../../utils/runtimeBridge";
import {
  appendNotificationHubEvent,
  resetNotificationHubForTests,
  type NotificationHubSeverity,
} from "../notificationHub";
import type { WorkflowJobOutcome, WorkflowToastPayload } from "./contracts";
import { appendRuntimeLog } from "../runtimeLogManager";
import { createWorkflowHostError } from "../../workflows/workflowHostErrorContract";
import type {
  WorkflowNotificationOwner,
  WorkflowProgressToastController as WorkflowProgressToastControllerDto,
  WorkflowProgressToastRequestDto,
  WorkflowProgressToastUpdateDto,
  WorkflowToastRequestDto,
} from "../../workflows/types";

export type { WorkflowProgressToastController } from "../../workflows/types";

type ProgressWindowInstance = {
  createLine: (args: {
    text: string;
    type?: string;
    icon?: string;
    progress?: number;
  }) => ProgressWindowInstance;
  show: (closeTime?: number) => ProgressWindowInstance;
  changeLine?: (args: { progress?: number; text?: string }) => void;
  startCloseTimer?: (delayMs: number) => unknown;
  updateIcons?: () => unknown;
  close?: () => unknown;
  win?: { close?: () => unknown };
};

type ProgressWindowCtor = (new (
  title: string,
  options?: Record<string, unknown>,
) => ProgressWindowInstance) & {
  setIconURI?: (key: string, uri: string) => unknown;
};

const WORKFLOW_TOAST_CLOSE_DELAY_MS = 2000;
const MAX_VISIBLE_WORKFLOW_TOASTS = 3;
const PROGRESS_UPDATE_INTERVAL_MS = 100;
const DEFAULT_WORKFLOW_TOAST_DEDUP_WINDOW_MS = 5000;

type WorkflowToastOptions = {
  sticky?: boolean;
  bounded?: boolean;
  maxVisible?: number;
  display?: boolean;
};

type WorkflowCallerToastState = {
  visible: number;
  timers: Set<ReturnType<typeof setTimeout>>;
};

const visibleWorkflowToasts: ProgressWindowInstance[] = [];
const visibleWorkflowProgressWindows: Array<{
  close: () => void;
  evictable: boolean;
}> = [];
const recentWorkflowToastDedup = new Map<string, number>();
const workflowCallerToastStates = new Map<object, WorkflowCallerToastState>();

function getWorkflowCallerToastState(callerScope: object) {
  let state = workflowCallerToastStates.get(callerScope);
  if (!state) {
    state = { visible: 0, timers: new Set() };
    workflowCallerToastStates.set(callerScope, state);
  }
  return state;
}

function resolveProgressWindowCtor() {
  return resolveToolkitMember<ProgressWindowCtor>("ProgressWindow");
}

function closeProgressWindow(win: ProgressWindowInstance) {
  try {
    if (typeof win.win?.close === "function") {
      win.win.close();
    } else if (typeof win.close === "function") {
      win.close();
    }
  } catch {
    // ignore close failures
  }
}

function bindProgressWindowClose(
  win: ProgressWindowInstance,
  onClose: () => void,
) {
  const nativeWindow = win.win;
  if (!nativeWindow || typeof nativeWindow.close !== "function") {
    return;
  }
  const closeNative = nativeWindow.close.bind(nativeWindow);
  let closing = false;
  try {
    nativeWindow.close = () => {
      if (closing) return;
      closing = true;
      try {
        onClose();
      } finally {
        closeNative();
      }
    };
  } catch {
    // ignore lifecycle binding failures; explicit close still works
  }
}

function enforceVisibleWorkflowToastLimit(maxVisible: number) {
  while (visibleWorkflowToasts.length >= maxVisible) {
    const oldest = visibleWorkflowToasts.shift();
    if (oldest) {
      closeProgressWindow(oldest);
    }
  }
}

const STICKY_BOUNDED_TOAST_OPTIONS: WorkflowToastOptions = {
  sticky: true,
  bounded: true,
};

const BOUNDED_TOAST_OPTIONS: WorkflowToastOptions = {
  bounded: true,
};

const WORKFLOW_TOAST_EMOJI_PREFIXES = ["🚀", "⏳", "✅", "❌", "⏹️", "🔌"];

export function resetWorkflowToastStateForTests() {
  closeVisibleWorkflowProgressWindows();
  visibleWorkflowToasts.splice(0, visibleWorkflowToasts.length);
  recentWorkflowToastDedup.clear();
  for (const state of workflowCallerToastStates.values()) {
    for (const timer of state.timers) clearTimeout(timer);
  }
  workflowCallerToastStates.clear();
  resetNotificationHubForTests();
}

function closeVisibleWorkflowProgressWindows() {
  for (const progress of [...visibleWorkflowProgressWindows]) {
    progress.close();
  }
}

export function createWorkflowNotificationOwner(args: {
  interactionMode: "interactive" | "non_interactive";
  callerScope?: object;
}): WorkflowNotificationOwner & { dispose(): void } {
  const callerScope = args.callerScope || {};
  const progressControllers = new Set<WorkflowProgressToastControllerDto>();
  const ownerToastTimers = new Set<ReturnType<typeof setTimeout>>();
  let disposed = false;
  const inertProgressController = (): WorkflowProgressToastControllerDto => ({
    update: () => undefined,
    close: () => undefined,
  });
  const owner: WorkflowNotificationOwner & { dispose(): void } = {
    toast(input: WorkflowToastRequestDto) {
      if (args.interactionMode !== "interactive") {
        appendRuntimeLog({
          level: "warn",
          scope: "hook",
          stage: "workflow-host.notifications",
          message: "Denied non-interactive workflow toast request",
        });
        throw createWorkflowHostError(
          "interaction_required",
          "notifications.toast requires an interactive Workflow Host",
          { member: "notifications.toast" },
        );
      }
      const text = typeof input?.text === "string" ? input.text.trim() : "";
      const type = input?.type ?? "default";
      if (!text || !["default", "success", "error"].includes(type)) {
        throw createWorkflowHostError(
          "invalid_request",
          "Workflow toast request is invalid",
          { reason: "invalid_value", field: !text ? "text" : "type" },
        );
      }
      if (input.text.length > 4096) {
        throw createWorkflowHostError(
          "resource_limited",
          "Workflow toast text exceeds the character limit",
          { resource: "characters", limit: 4096, observed: input.text.length },
        );
      }
      const state = getWorkflowCallerToastState(callerScope);
      if (state.visible >= 5) {
        throw createWorkflowHostError(
          "resource_limited",
          "Workflow caller already has five visible toasts",
          { resource: "entries", limit: 5, observed: state.visible },
        );
      }
      const shown = showWorkflowToast({
        text,
        type,
        source: "workflow-host",
        owner: "workflow",
        scope: "workflow-host-api",
      });
      if (shown) {
        state.visible += 1;
        const timer = setTimeout(() => {
          ownerToastTimers.delete(timer);
          state.timers.delete(timer);
          state.visible = Math.max(0, state.visible - 1);
        }, WORKFLOW_TOAST_CLOSE_DELAY_MS);
        ownerToastTimers.add(timer);
        state.timers.add(timer);
      }
    },
    createProgress(
      input: WorkflowProgressToastRequestDto,
    ): WorkflowProgressToastControllerDto {
      if (args.interactionMode !== "interactive") {
        appendRuntimeLog({
          level: "warn",
          scope: "hook",
          stage: "workflow-host.notifications",
          message: "Denied non-interactive workflow progress request",
        });
        throw createWorkflowHostError(
          "interaction_required",
          "notifications.createProgress requires an interactive Workflow Host",
          { member: "notifications.createProgress" },
        );
      }
      if (disposed) return inertProgressController();
      if (!input || typeof input !== "object" || Array.isArray(input)) {
        throw createWorkflowHostError(
          "invalid_request",
          "Workflow progress request is invalid",
          { reason: "invalid_value", field: "request" },
        );
      }
      const rawText = typeof input?.text === "string" ? input.text : "";
      const text = rawText.trim();
      if (!text) {
        throw createWorkflowHostError(
          "invalid_request",
          "Workflow progress request is invalid",
          { reason: "invalid_value", field: "text" },
        );
      }
      if (rawText.length > 4096) {
        throw createWorkflowHostError(
          "resource_limited",
          "Workflow progress text exceeds the character limit",
          { resource: "characters", limit: 4096, observed: rawText.length },
        );
      }
      if (
        input.progress !== undefined &&
        (!Number.isFinite(input.progress) ||
          input.progress < 0 ||
          input.progress > 100)
      ) {
        throw createWorkflowHostError(
          "invalid_request",
          "Workflow progress value is invalid",
          { reason: "invalid_value", field: "progress" },
        );
      }
      const state = getWorkflowCallerToastState(callerScope);
      if (state.visible >= 5) {
        throw createWorkflowHostError(
          "resource_limited",
          "Workflow caller already has five visible notifications",
          { resource: "entries", limit: 5, observed: state.visible },
        );
      }
      appendNotificationHubEvent({
        type: "toast.progress",
        severity: "info",
        summary: text,
        text,
        source: "workflow-host",
        owner: "workflow",
        scope: "workflow-host-api",
        semantic: "progress",
      });
      let terminate: () => void = () => undefined;
      const shown = showWorkflowProgressToastInternal(
        {
          text,
          progress: input.progress,
        },
        {
          defaultProgress: 100,
          onTerminal: () => terminate(),
        },
      );
      if (!shown) {
        return inertProgressController();
      }
      state.visible += 1;

      let closed = false;
      let updateTimer: ReturnType<typeof setTimeout> | undefined;
      let pendingUpdate: WorkflowProgressToastUpdateDto | undefined;
      const terminal = () => {
        if (closed) return;
        closed = true;
        if (updateTimer) clearTimeout(updateTimer);
        updateTimer = undefined;
        pendingUpdate = undefined;
        state.visible = Math.max(0, state.visible - 1);
        progressControllers.delete(controller);
      };
      const flushUpdate = () => {
        updateTimer = undefined;
        if (closed || !pendingUpdate) return;
        const update = pendingUpdate;
        pendingUpdate = undefined;
        shown.update(update);
      };
      const controller: WorkflowProgressToastControllerDto = {
        update(update) {
          if (closed) return;
          if (!update || typeof update !== "object" || Array.isArray(update)) {
            throw createWorkflowHostError(
              "invalid_request",
              "Workflow progress update is invalid",
              { reason: "invalid_value", field: "update" },
            );
          }
          if (update.text !== undefined) {
            if (typeof update.text !== "string") {
              throw createWorkflowHostError(
                "invalid_request",
                "Workflow progress text is invalid",
                { reason: "invalid_value", field: "text" },
              );
            }
            const updateText = update.text.trim();
            if (!updateText) {
              throw createWorkflowHostError(
                "invalid_request",
                "Workflow progress text is invalid",
                { reason: "invalid_value", field: "text" },
              );
            }
            if (update.text.length > 4096) {
              throw createWorkflowHostError(
                "resource_limited",
                "Workflow progress text exceeds the character limit",
                {
                  resource: "characters",
                  limit: 4096,
                  observed: update.text.length,
                },
              );
            }
          }
          if (
            update.progress !== undefined &&
            (!Number.isFinite(update.progress) ||
              update.progress < 0 ||
              update.progress > 100)
          ) {
            throw createWorkflowHostError(
              "invalid_request",
              "Workflow progress value is invalid",
              { reason: "invalid_value", field: "progress" },
            );
          }
          pendingUpdate = {
            text: update.text?.trim() ?? pendingUpdate?.text,
            progress: update.progress,
          };
          if (!updateTimer) {
            updateTimer = setTimeout(flushUpdate, PROGRESS_UPDATE_INTERVAL_MS);
          }
        },
        close() {
          if (closed) return;
          terminal();
          shown.close();
        },
      };
      terminate = terminal;
      progressControllers.add(controller);
      return controller;
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      for (const controller of [...progressControllers]) controller.close();
      const state = workflowCallerToastStates.get(callerScope);
      for (const timer of ownerToastTimers) {
        clearTimeout(timer);
        if (!state) continue;
        state.timers.delete(timer);
        state.visible = Math.max(0, state.visible - 1);
      }
      ownerToastTimers.clear();
      if (state?.visible === 0 && state.timers.size === 0) {
        workflowCallerToastStates.delete(callerScope);
      }
    },
  };
  return owner;
}

export function closeVisibleWorkflowToasts() {
  closeVisibleWorkflowProgressWindows();
  const toasts = visibleWorkflowToasts.splice(0, visibleWorkflowToasts.length);
  recentWorkflowToastDedup.clear();
  for (const toast of toasts) {
    closeProgressWindow(toast);
  }
}

function shouldSuppressDuplicateWorkflowToast(payload: WorkflowToastPayload) {
  const key = String(payload.dedupKey || "").trim();
  if (!key) {
    return false;
  }
  const now = Date.now();
  const windowMs = Math.max(
    0,
    Number(payload.dedupWindowMs || DEFAULT_WORKFLOW_TOAST_DEDUP_WINDOW_MS),
  );
  const lastShownAt = recentWorkflowToastDedup.get(key) || 0;
  if (windowMs > 0 && now - lastShownAt < windowMs) {
    return true;
  }
  recentWorkflowToastDedup.set(key, now);
  return false;
}

function workflowToastSeverity(
  payload: WorkflowToastPayload,
): NotificationHubSeverity {
  if (payload.semantic === "error" || payload.type === "error") {
    return "error";
  }
  if (payload.semantic === "success" || payload.type === "success") {
    return "success";
  }
  if (payload.semantic === "waiting") {
    return "warning";
  }
  return "info";
}

function workflowToastEventType(payload: WorkflowToastPayload) {
  const semantic = String(payload.semantic || payload.type || "default")
    .trim()
    .replace(/[^a-z0-9_.-]+/gi, "-")
    .toLowerCase();
  return `toast.${semantic || "default"}`;
}

function resolveWorkflowToastEmoji(payload: WorkflowToastPayload) {
  if (payload.semantic === "start") {
    return "🚀";
  }
  if (payload.semantic === "waiting") {
    return "⏳";
  }
  if (payload.semantic === "canceled") {
    return "⏹️";
  }
  if (
    payload.semantic === "runtime" ||
    String(payload.type) === "skillrunner-backend"
  ) {
    return "🔌";
  }
  if (payload.semantic === "success" || payload.type === "success") {
    return "✅";
  }
  if (payload.semantic === "error" || payload.type === "error") {
    return "❌";
  }
  return "";
}

function formatWorkflowToastText(payload: WorkflowToastPayload) {
  const text = String(payload.text || "").trim();
  if (
    !text ||
    WORKFLOW_TOAST_EMOJI_PREFIXES.some((prefix) => text.startsWith(prefix))
  ) {
    return text;
  }
  const emoji = resolveWorkflowToastEmoji(payload);
  return emoji ? `${emoji} ${text}` : text;
}

function resolveWorkflowToastIconURI() {
  const addonRef = resolveAddonRef(config.addonRef);
  return addonRef
    ? `chrome://${addonRef}/content/icons/favicon.png`
    : undefined;
}

function configureWorkflowToastIcon(
  ProgressWindow: ProgressWindowCtor,
  iconURI?: string,
) {
  if (!iconURI || typeof ProgressWindow.setIconURI !== "function") {
    return;
  }
  try {
    for (const type of ["default", "success", "error"]) {
      ProgressWindow.setIconURI(type, iconURI);
    }
  } catch {
    // ignore icon registration failures
  }
}

function refreshWorkflowToastIcons(win: ProgressWindowInstance) {
  if (typeof win.updateIcons !== "function") {
    return () => undefined;
  }
  const refresh = () => {
    try {
      win.updateIcons?.();
    } catch {
      // ignore toast icon refresh failures
    }
  };
  refresh();
  const timers = [setTimeout(refresh, 100), setTimeout(refresh, 500)];
  return () => {
    for (const timer of timers) clearTimeout(timer);
  };
}

export function showWorkflowToast(
  payload: WorkflowToastPayload,
  options: WorkflowToastOptions = {},
) {
  const duplicateByDedupKey = shouldSuppressDuplicateWorkflowToast(payload);
  const hubResult = appendNotificationHubEvent({
    type: workflowToastEventType(payload),
    severity: workflowToastSeverity(payload),
    summary: payload.text,
    text: payload.text,
    source: payload.source || "zotero-toast",
    owner: payload.owner || "workflow",
    scope: payload.scope || "workflow-feedback",
    semantic: payload.semantic || payload.type,
    displayGroupKey: payload.displayGroupKey,
    dedupKey: payload.dedupKey,
    relatedHandles: payload.relatedHandles,
    metadata: payload.metadata,
    displayRequested: options.display !== false,
    suppressDisplay: duplicateByDedupKey,
    suppressionWindowMs: payload.dedupWindowMs,
  });
  if (!hubResult.shouldDisplay) {
    return undefined;
  }
  const ProgressWindow = resolveProgressWindowCtor();
  if (!ProgressWindow) {
    return undefined;
  }
  const addonName = resolveAddonName("Zotero Agents");
  const iconURI = resolveWorkflowToastIconURI();
  const sticky = options.sticky === true;
  const closeTime = sticky ? 0 : WORKFLOW_TOAST_CLOSE_DELAY_MS;
  const maxVisible = Math.max(
    1,
    Math.floor(Number(options.maxVisible || MAX_VISIBLE_WORKFLOW_TOASTS)),
  );
  try {
    if (options.bounded) {
      enforceVisibleWorkflowToastLimit(maxVisible);
    }
    configureWorkflowToastIcon(ProgressWindow, iconURI);
    const win = new ProgressWindow(addonName, {
      closeOnClick: true,
      closeTime,
    });
    const text = formatWorkflowToastText(payload);
    const shown = win
      .createLine({
        text,
        type: payload.type || "default",
        icon: iconURI,
        progress: 100,
      })
      .show(closeTime);
    refreshWorkflowToastIcons(shown);
    if (!sticky && typeof shown.startCloseTimer === "function") {
      shown.startCloseTimer(WORKFLOW_TOAST_CLOSE_DELAY_MS);
    }
    if (options.bounded) {
      visibleWorkflowToasts.push(shown);
    }
    return shown;
  } catch {
    // ignore toast failures
    return undefined;
  }
}

export function showWorkflowProgressToast(args: {
  text: string;
  type?: string;
  progress?: number;
}): WorkflowProgressToastControllerDto | undefined {
  return showWorkflowProgressToastInternal(args, { evictable: true });
}

function showWorkflowProgressToastInternal(
  args: {
    text: string;
    type?: string;
    progress?: number;
  },
  options: {
    defaultProgress?: number;
    evictable?: boolean;
    onTerminal?: () => void;
  } = {},
): WorkflowProgressToastControllerDto | undefined {
  const ProgressWindow = resolveProgressWindowCtor();
  if (!ProgressWindow) {
    return undefined;
  }
  const addonName = resolveAddonName("Zotero Agents");
  const iconURI = resolveWorkflowToastIconURI();
  try {
    if (options.evictable) {
      while (
        visibleWorkflowProgressWindows.filter((entry) => entry.evictable)
          .length >= MAX_VISIBLE_WORKFLOW_TOASTS
      ) {
        visibleWorkflowProgressWindows
          .find((entry) => entry.evictable)
          ?.close();
      }
    }
    configureWorkflowToastIcon(ProgressWindow, iconURI);
    const shown = new ProgressWindow(addonName, {
      closeOnClick: true,
      closeTime: -1,
    })
      .createLine({
        text: args.text,
        type: args.type || "default",
        icon: iconURI,
        progress:
          typeof args.progress === "number"
            ? Math.max(0, Math.min(100, args.progress))
            : (options.defaultProgress ?? 0),
      })
      .show(0);
    const clearIconRefresh = refreshWorkflowToastIcons(shown);
    let closed = false;
    const entry = {
      evictable: options.evictable === true,
      close: () => controller.close(),
    };
    const terminal = () => {
      if (closed) return;
      closed = true;
      const index = visibleWorkflowProgressWindows.indexOf(entry);
      if (index >= 0) visibleWorkflowProgressWindows.splice(index, 1);
      clearIconRefresh();
      options.onTerminal?.();
    };
    const controller: WorkflowProgressToastControllerDto = {
      update: (update) => {
        if (closed) return;
        try {
          shown.changeLine?.({
            ...(typeof update.text === "string"
              ? { text: update.text.trim() }
              : {}),
            ...(typeof update.progress === "number"
              ? {
                  progress: Math.max(
                    0,
                    Math.min(100, Math.floor(update.progress)),
                  ),
                }
              : { progress: 100 }),
          });
        } catch {
          // ignore toast UI update failures
        }
      },
      close: () => {
        if (closed) return;
        terminal();
        closeProgressWindow(shown);
      },
    };
    visibleWorkflowProgressWindows.push(entry);
    bindProgressWindowClose(shown, terminal);
    return controller;
  } catch {
    return undefined;
  }
}

export function alertWindow(win: _ZoteroTypes.MainWindow, message: string) {
  void win;
  showWorkflowToast(
    {
      text: message,
      type: "default",
      source: "zotero-alert-window",
      owner: "workflow",
      scope: "workflow-feedback",
    },
    STICKY_BOUNDED_TOAST_OPTIONS,
  );
}

type FeedbackDeps = {
  showToast: (
    payload: WorkflowToastPayload,
    options?: WorkflowToastOptions,
  ) => void;
  alertWindow: (win: _ZoteroTypes.MainWindow, message: string) => void;
};

const defaultFeedbackDeps: FeedbackDeps = {
  showToast: showWorkflowToast,
  alertWindow,
};

export function emitWorkflowStartToast(
  args: {
    workflowLabel: string;
    totalJobs: number;
    messageFormatter: WorkflowMessageFormatter;
  },
  deps: Partial<FeedbackDeps> = {},
) {
  const resolved = {
    ...defaultFeedbackDeps,
    ...deps,
  };
  resolved.showToast(
    {
      text: buildWorkflowStartToastMessage(
        {
          workflowLabel: args.workflowLabel,
          totalJobs: args.totalJobs,
        },
        args.messageFormatter,
      ),
      type: "default",
      semantic: "start",
      owner: "workflow",
      scope: "workflow-run",
      displayGroupKey: `workflow:${args.workflowLabel}:start`,
    },
    BOUNDED_TOAST_OPTIONS,
  );
}

export function emitWorkflowWaitingToast(
  args: {
    workflowLabel: string;
    pendingJobs: number;
    messageFormatter: WorkflowMessageFormatter;
  },
  deps: Partial<FeedbackDeps> = {},
) {
  const resolved = {
    ...defaultFeedbackDeps,
    ...deps,
  };
  resolved.showToast(
    {
      text: buildWorkflowWaitingToastMessage(
        {
          workflowLabel: args.workflowLabel,
          pendingJobs: args.pendingJobs,
        },
        args.messageFormatter,
      ),
      type: "default",
      semantic: "waiting",
      owner: "workflow",
      scope: "workflow-run",
      displayGroupKey: `workflow:${args.workflowLabel}:waiting`,
    },
    STICKY_BOUNDED_TOAST_OPTIONS,
  );
}

export function emitWorkflowJobToasts(
  args: {
    workflowLabel: string;
    totalJobs: number;
    outcomes: WorkflowJobOutcome[];
    messageFormatter: WorkflowMessageFormatter;
  },
  deps: Partial<FeedbackDeps> = {},
) {
  const resolved = {
    ...defaultFeedbackDeps,
    ...deps,
  };
  for (const outcome of args.outcomes) {
    resolved.showToast(
      {
        text: buildWorkflowJobToastMessage(
          {
            workflowLabel: args.workflowLabel,
            taskLabel: outcome.taskLabel,
            index: outcome.index + 1,
            total: args.totalJobs,
            succeeded: outcome.succeeded,
            reason: outcome.reason,
          },
          args.messageFormatter,
        ),
        type: outcome.succeeded ? "success" : "error",
        semantic:
          outcome.terminalState === "canceled"
            ? "canceled"
            : outcome.succeeded
              ? "success"
              : "error",
        owner: "workflow",
        scope: "workflow-job",
        displayGroupKey: `workflow-job:${outcome.jobId}:${outcome.terminalState || (outcome.succeeded ? "succeeded" : "failed")}`,
        relatedHandles: {
          workflowJobId: outcome.jobId,
          requestId: outcome.requestId,
          sequenceRunId: outcome.sequenceRunId,
        },
      },
      STICKY_BOUNDED_TOAST_OPTIONS,
    );
  }
}

export function selectWorkflowJobOutcomesForToasts(args: {
  outcomes: WorkflowJobOutcome[];
  totalJobs: number;
  skipped: number;
}) {
  return args.outcomes.filter((outcome) => !outcome.succeeded);
}

export function shouldEmitWorkflowFinishSummaryToast(args: {
  outcomes: WorkflowJobOutcome[];
  totalJobs: number;
  skipped: number;
}) {
  void args;
  return true;
}

export function emitWorkflowFinishSummary(
  args: {
    win: _ZoteroTypes.MainWindow;
    workflowLabel: string;
    succeeded: number;
    failed: number;
    skipped: number;
    failureReasons: string[];
    messageFormatter: WorkflowMessageFormatter;
  },
  deps: Partial<FeedbackDeps> = {},
) {
  const resolved = {
    ...defaultFeedbackDeps,
    ...deps,
  };
  void args.win;
  resolved.showToast(
    {
      text: buildWorkflowFinishMessage(
        {
          workflowLabel: args.workflowLabel,
          succeeded: args.succeeded,
          failed: args.failed,
          skipped: args.skipped,
          failureReasons: args.failureReasons,
        },
        args.messageFormatter,
      ),
      type: args.failed > 0 ? "error" : "success",
      semantic: args.failed > 0 ? "error" : "success",
      owner: "workflow",
      scope: "workflow-run",
      displayGroupKey: `workflow:${args.workflowLabel}:finish`,
    },
    STICKY_BOUNDED_TOAST_OPTIONS,
  );
}
