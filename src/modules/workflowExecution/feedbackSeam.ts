import {
  buildWorkflowFinishMessage,
  buildWorkflowJobToastMessage,
  buildWorkflowStartToastMessage,
  buildWorkflowWaitingToastMessage,
  type WorkflowMessageFormatter,
} from "../workflowExecuteMessage";
import {
  resolveAddonName,
  resolveToolkitMember,
} from "../../utils/runtimeBridge";
import type { WorkflowJobOutcome, WorkflowToastPayload } from "./contracts";

type ProgressWindowInstance = {
  createLine: (args: {
    text: string;
    type?: string;
    progress?: number;
  }) => ProgressWindowInstance;
  show: (closeTime?: number) => ProgressWindowInstance;
  startCloseTimer?: (delayMs: number) => unknown;
  close?: () => unknown;
};

type ProgressWindowCtor = new (
  title: string,
  options?: Record<string, unknown>,
) => ProgressWindowInstance;

const WORKFLOW_TOAST_CLOSE_DELAY_MS = 2000;
const MAX_VISIBLE_WORKFLOW_TOASTS = 3;

type WorkflowToastOptions = {
  sticky?: boolean;
  bounded?: boolean;
  maxVisible?: number;
};

const visibleWorkflowToasts: ProgressWindowInstance[] = [];

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

export function resetWorkflowToastStateForTests() {
  visibleWorkflowToasts.splice(0, visibleWorkflowToasts.length);
}

export function showWorkflowToast(
  payload: WorkflowToastPayload,
  options: WorkflowToastOptions = {},
) {
  const ProgressWindow = resolveProgressWindowCtor();
  if (!ProgressWindow) {
    return undefined;
  }
  const addonName = resolveAddonName("Zotero Skills");
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
    const win = new ProgressWindow(addonName, {
      closeOnClick: true,
      closeTime,
    });
    const shown = win
      .createLine({
        text: payload.text,
        type: payload.type,
        progress: 100,
      })
      .show(closeTime);
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
    },
    STICKY_BOUNDED_TOAST_OPTIONS,
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
      },
      STICKY_BOUNDED_TOAST_OPTIONS,
    );
  }
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
    },
    STICKY_BOUNDED_TOAST_OPTIONS,
  );
}
