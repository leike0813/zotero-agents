import {
  buildWorkflowFinishMessage,
  buildWorkflowJobToastMessage,
  buildWorkflowStartToastMessage,
  buildWorkflowWaitingToastMessage,
  type WorkflowMessageFormatter,
} from "../workflowExecuteMessage";
import { config } from "../../../package.json";
import {
  resolveAddonName,
  resolveAddonRef,
  resolveToolkitMember,
} from "../../utils/runtimeBridge";
import type { WorkflowJobOutcome, WorkflowToastPayload } from "./contracts";

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
};

type ProgressWindowCtor = (new (
  title: string,
  options?: Record<string, unknown>,
) => ProgressWindowInstance) & {
  setIconURI?: (key: string, uri: string) => unknown;
};

const WORKFLOW_TOAST_CLOSE_DELAY_MS = 2000;
const MAX_VISIBLE_WORKFLOW_TOASTS = 3;
const DEFAULT_WORKFLOW_TOAST_DEDUP_WINDOW_MS = 5000;

type WorkflowToastOptions = {
  sticky?: boolean;
  bounded?: boolean;
  maxVisible?: number;
};

export type WorkflowProgressToastController = {
  update: (args: { text?: string; progress?: number }) => void;
  close: () => void;
};

const visibleWorkflowToasts: ProgressWindowInstance[] = [];
const recentWorkflowToastDedup = new Map<string, number>();

function resolveProgressWindowCtor() {
  return resolveToolkitMember<ProgressWindowCtor>("ProgressWindow");
}

function closeProgressWindow(win: ProgressWindowInstance) {
  try {
    if (typeof win.close === "function") {
      win.close();
    }
  } catch {
    // ignore close failures
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
  visibleWorkflowToasts.splice(0, visibleWorkflowToasts.length);
  recentWorkflowToastDedup.clear();
}

export function closeVisibleWorkflowToasts() {
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
    return;
  }
  const refresh = () => {
    try {
      win.updateIcons?.();
    } catch {
      // ignore toast icon refresh failures
    }
  };
  refresh();
  setTimeout(refresh, 100);
  setTimeout(refresh, 500);
}

export function showWorkflowToast(
  payload: WorkflowToastPayload,
  options: WorkflowToastOptions = {},
) {
  if (shouldSuppressDuplicateWorkflowToast(payload)) {
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
}): WorkflowProgressToastController | undefined {
  const ProgressWindow = resolveProgressWindowCtor();
  if (!ProgressWindow) {
    return undefined;
  }
  const addonName = resolveAddonName("Zotero Agents");
  const iconURI = resolveWorkflowToastIconURI();
  try {
    enforceVisibleWorkflowToastLimit(MAX_VISIBLE_WORKFLOW_TOASTS);
    configureWorkflowToastIcon(ProgressWindow, iconURI);
    const shown = new ProgressWindow(addonName, {
      closeOnClick: true,
      closeTime: -1,
    })
      .createLine({
        text: args.text,
        type: args.type || "default",
        icon: iconURI,
        progress: Math.max(0, Math.min(100, Number(args.progress || 0))),
      })
      .show(0);
    refreshWorkflowToastIcons(shown);
    visibleWorkflowToasts.push(shown);
    return {
      update: (update) => {
        shown.changeLine?.({
          ...(typeof update.text === "string" ? { text: update.text } : {}),
          ...(typeof update.progress === "number"
            ? {
                progress: Math.max(
                  0,
                  Math.min(100, Math.floor(update.progress)),
                ),
              }
            : {}),
        });
      },
      close: () => {
        const index = visibleWorkflowToasts.indexOf(shown);
        if (index >= 0) {
          visibleWorkflowToasts.splice(index, 1);
        }
        closeProgressWindow(shown);
      },
    };
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
    },
    STICKY_BOUNDED_TOAST_OPTIONS,
  );
}
