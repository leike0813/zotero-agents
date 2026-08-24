import { appendRuntimeLog } from "../runtimeLogManager";
import {
  listActiveWorkflowTaskSummaries,
  type WorkflowTaskRecord,
} from "../taskRuntime";
import { localizeWorkflowText } from "./messageFormatter";
import {
  resolveInputUnitIdentityFromRequest,
  resolveTaskNameFromRequest,
} from "./requestMeta";
import { workflowSubmissionQueue } from "../../jobQueue/workflowSubmissionQueue";
import type { PreparedWorkflowUnit } from "./contracts";

type DuplicateGuardDeps = {
  listActiveWorkflowTasks: () => WorkflowTaskRecord[];
  hasActiveOrQueuedWorkflowInput: (args: {
    workflowId: string;
    inputUnitIdentity: string;
  }) => boolean;
  appendRuntimeLog: typeof appendRuntimeLog;
  confirmDuplicateSubmission: (args: {
    win: _ZoteroTypes.MainWindow;
    title: string;
    message: string;
    yesLabel: string;
    noLabel: string;
  }) => boolean;
};

const defaultDuplicateGuardDeps: DuplicateGuardDeps = {
  listActiveWorkflowTasks: listActiveWorkflowTaskSummaries,
  hasActiveOrQueuedWorkflowInput: (args) =>
    workflowSubmissionQueue.hasActiveOrQueuedWorkflowInput(args),
  appendRuntimeLog,
  confirmDuplicateSubmission: ({ win, title, message, yesLabel, noLabel }) => {
    const runtime = globalThis as {
      Zotero?: {
        Prompt?: {
          confirm?: (args: {
            window?: _ZoteroTypes.MainWindow | null;
            title: string;
            text: string;
            button0: string;
            button1: string;
            defaultButton: number;
          }) => number;
        };
      };
    };
    try {
      const prompt = runtime.Zotero?.Prompt;
      if (prompt && typeof prompt.confirm === "function") {
        const index = prompt.confirm({
          window: win || null,
          title,
          text: message,
          button0: yesLabel,
          button1: noLabel,
          defaultButton: 1,
        });
        return index === 0;
      }
    } catch {
      // ignore and fallback to window.confirm
    }
    if (typeof win.confirm === "function") {
      return Boolean(win.confirm(`${title}\n\n${message}`));
    }
    return false;
  },
};

type DuplicateSkipRecord = {
  index: number;
  taskLabel: string;
  inputUnitIdentity: string;
};

export type DuplicateGuardResult = {
  allowedRequests: unknown[];
  skippedByDuplicate: number;
  skippedRecords: DuplicateSkipRecord[];
};

export type WorkflowUnitDuplicateGuardResult = {
  allowedUnits: PreparedWorkflowUnit[];
  skippedByDuplicate: number;
  skippedRecords: DuplicateSkipRecord[];
};

function findDuplicateState(args: {
  workflowId: string;
  inputUnitIdentities: ReadonlyArray<string>;
  deps: Pick<
    DuplicateGuardDeps,
    "listActiveWorkflowTasks" | "hasActiveOrQueuedWorkflowInput"
  >;
}) {
  const activeTasks = args.deps.listActiveWorkflowTasks();
  const activeDuplicates = activeTasks.filter((entry) => {
    if (entry.workflowId !== args.workflowId) {
      return false;
    }
    const activeIdentities = new Set([
      String(entry.inputUnitIdentity || "").trim(),
      ...(entry.inputMemberIdentities || []),
    ]);
    return args.inputUnitIdentities.some((identity) =>
      activeIdentities.has(identity),
    );
  });
  return {
    activeDuplicates,
    queued: args.inputUnitIdentities.some((inputUnitIdentity) =>
      args.deps.hasActiveOrQueuedWorkflowInput({
        workflowId: args.workflowId,
        inputUnitIdentity,
      }),
    ),
  };
}

export async function runWorkflowUnitDuplicateGuardSeam(
  args: {
    win: _ZoteroTypes.MainWindow;
    workflowId: string;
    workflowLabel: string;
    units: ReadonlyArray<PreparedWorkflowUnit>;
  },
  deps: Partial<DuplicateGuardDeps> = {},
): Promise<WorkflowUnitDuplicateGuardResult> {
  const resolved = {
    ...defaultDuplicateGuardDeps,
    ...deps,
  };
  const allowedUnits: PreparedWorkflowUnit[] = [];
  const skippedRecords: DuplicateSkipRecord[] = [];
  const yesLabel = localizeWorkflowText(
    "workflow-duplicate-confirm-yes",
    "Yes",
  );
  const noLabel = localizeWorkflowText("workflow-duplicate-confirm-no", "No");
  const title = localizeWorkflowText(
    "workflow-duplicate-confirm-title",
    "Duplicate running job detected",
  );

  for (let index = 0; index < args.units.length; index++) {
    const unit = args.units[index];
    const inputUnitIdentity = String(unit.inputUnitIdentity || "").trim();
    const inputUnitIdentities = Array.from(
      new Set(
        [...(unit.memberIdentities || []), inputUnitIdentity].filter(Boolean),
      ),
    );
    if (inputUnitIdentities.length === 0) {
      allowedUnits.push(unit);
      continue;
    }
    const firstRead = findDuplicateState({
      workflowId: args.workflowId,
      inputUnitIdentities,
      deps: resolved,
    });
    if (firstRead.activeDuplicates.length === 0 && firstRead.queued === false) {
      allowedUnits.push(unit);
      continue;
    }
    const duplicateTaskName =
      String(
        firstRead.activeDuplicates[0]?.taskName ||
          firstRead.activeDuplicates[0]?.jobId ||
          "",
      ).trim() || unit.taskName;
    const message = localizeWorkflowText(
      "workflow-duplicate-confirm-message",
      `Input "${unit.taskName}" already has a running job in workflow "${args.workflowLabel}" (running task: "${duplicateTaskName}"). Continue and submit another job?`,
      {
        inputLabel: unit.taskName,
        workflowLabel: args.workflowLabel,
        runningTaskLabel: duplicateTaskName,
      },
    );
    const shouldContinue = resolved.confirmDuplicateSubmission({
      win: args.win,
      title,
      message,
      yesLabel,
      noLabel,
    });
    if (shouldContinue) {
      allowedUnits.push(unit);
      resolved.appendRuntimeLog({
        level: "warn",
        scope: "workflow-trigger",
        workflowId: args.workflowId,
        stage: "duplicate-running-job-allowed",
        message: "user allowed duplicate running job submission",
        details: {
          index,
          taskLabel: unit.taskName,
          inputUnitIdentity,
          duplicateCount:
            firstRead.activeDuplicates.length + (firstRead.queued ? 1 : 0),
        },
      });
      continue;
    }

    const finalRead = findDuplicateState({
      workflowId: args.workflowId,
      inputUnitIdentities,
      deps: resolved,
    });
    if (finalRead.activeDuplicates.length === 0 && finalRead.queued === false) {
      allowedUnits.push(unit);
      continue;
    }
    skippedRecords.push({
      index,
      taskLabel: unit.taskName,
      inputUnitIdentity,
    });
    resolved.appendRuntimeLog({
      level: "warn",
      scope: "workflow-trigger",
      workflowId: args.workflowId,
      stage: "duplicate-running-job-skipped",
      message: "duplicate running job submission skipped",
      details: {
        index,
        taskLabel: unit.taskName,
        inputUnitIdentity,
        duplicateCount:
          finalRead.activeDuplicates.length + (finalRead.queued ? 1 : 0),
      },
    });
  }

  return {
    allowedUnits,
    skippedByDuplicate: skippedRecords.length,
    skippedRecords,
  };
}

function findRunningDuplicates(args: {
  workflowId: string;
  inputUnitIdentity: string;
  activeTasks: WorkflowTaskRecord[];
}) {
  return args.activeTasks.filter(
    (entry) =>
      entry.workflowId === args.workflowId &&
      entry.inputUnitIdentity === args.inputUnitIdentity,
  );
}

export async function runWorkflowDuplicateGuardSeam(
  args: {
    win: _ZoteroTypes.MainWindow;
    workflowId: string;
    workflowLabel: string;
    requests: unknown[];
  },
  deps: Partial<DuplicateGuardDeps> = {},
): Promise<DuplicateGuardResult> {
  const resolved = {
    ...defaultDuplicateGuardDeps,
    ...deps,
  };

  const activeTasks = resolved.listActiveWorkflowTasks();
  const allowedRequests: unknown[] = [];
  const skippedRecords: DuplicateSkipRecord[] = [];

  const yesLabel = localizeWorkflowText(
    "workflow-duplicate-confirm-yes",
    "Yes",
  );
  const noLabel = localizeWorkflowText("workflow-duplicate-confirm-no", "No");
  const title = localizeWorkflowText(
    "workflow-duplicate-confirm-title",
    "Duplicate running job detected",
  );

  for (let index = 0; index < args.requests.length; index++) {
    const request = args.requests[index];
    const inputUnitIdentity = resolveInputUnitIdentityFromRequest(request);
    if (!inputUnitIdentity) {
      allowedRequests.push(request);
      continue;
    }
    const taskLabel = resolveTaskNameFromRequest(request, index);
    const duplicates = findRunningDuplicates({
      workflowId: args.workflowId,
      inputUnitIdentity,
      activeTasks,
    });
    if (duplicates.length === 0) {
      allowedRequests.push(request);
      continue;
    }

    const duplicateTaskName =
      String(duplicates[0].taskName || duplicates[0].jobId || "").trim() ||
      taskLabel;
    const message = localizeWorkflowText(
      "workflow-duplicate-confirm-message",
      `Input "${taskLabel}" already has a running job in workflow "${args.workflowLabel}" (running task: "${duplicateTaskName}"). Continue and submit another job?`,
      {
        inputLabel: taskLabel,
        workflowLabel: args.workflowLabel,
        runningTaskLabel: duplicateTaskName,
      },
    );
    const shouldContinue = resolved.confirmDuplicateSubmission({
      win: args.win,
      title,
      message,
      yesLabel,
      noLabel,
    });

    if (shouldContinue) {
      allowedRequests.push(request);
      resolved.appendRuntimeLog({
        level: "warn",
        scope: "workflow-trigger",
        workflowId: args.workflowId,
        stage: "duplicate-running-job-allowed",
        message: "user allowed duplicate running job submission",
        details: {
          index,
          taskLabel,
          inputUnitIdentity,
          duplicateCount: duplicates.length,
        },
      });
      continue;
    }

    skippedRecords.push({
      index,
      taskLabel,
      inputUnitIdentity,
    });
    resolved.appendRuntimeLog({
      level: "warn",
      scope: "workflow-trigger",
      workflowId: args.workflowId,
      stage: "duplicate-running-job-skipped",
      message: "duplicate running job submission skipped",
      details: {
        index,
        taskLabel,
        inputUnitIdentity,
        duplicateCount: duplicates.length,
      },
    });
  }

  return {
    allowedRequests,
    skippedByDuplicate: skippedRecords.length,
    skippedRecords,
  };
}
