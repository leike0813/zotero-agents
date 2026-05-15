import { appendRuntimeLog } from "../runtimeLogManager";
import { buildSelectionContext } from "../selectionContext";
import {
  buildWorkflowFinishMessage,
  normalizeErrorMessage,
  type WorkflowMessageFormatter,
} from "../workflowExecuteMessage";
import {
  resolveWorkflowExecutionContext,
  resolveWorkflowExecutionOptionsPreview,
} from "../workflowSettings";
import { executeBuildRequests } from "../../workflows/runtime";
import { summarizeWorkflowExecutionError } from "../../workflows/errorMeta";
import type { LoadedWorkflow } from "../../workflows/types";
import type { WorkflowExecutionOptions } from "../workflowSettingsDomain";
import type {
  PreparationSeamResult,
  WorkflowExecutionContext,
} from "./contracts";
import { alertWindow } from "./feedbackSeam";
import { localizeWorkflowText } from "./messageFormatter";
import { shouldShowWorkflowNotifications } from "./feedbackPolicy";
import { canWorkflowRunWithoutSelection } from "../workflowSelectionPolicy";
import { ACP_SKILL_RUN_REQUEST_KIND } from "../../config/defaults";
import type { SkillRunnerJobRequestV1 } from "../../providers/contracts";
import { adaptSkillRunnerJobToAcpSkillRun } from "../acpSkillRunRequestAdapter";

function isNoValidInputUnitsError(error: unknown) {
  if (
    error &&
    typeof error === "object" &&
    (error as { code?: unknown }).code === "NO_VALID_INPUT_UNITS"
  ) {
    return true;
  }
  return /has no valid input units after filtering/i.test(
    normalizeErrorMessage(error),
  );
}

function adaptRequestsForExecutionContext(args: {
  requests: unknown[];
  executionContext: WorkflowExecutionContext;
}) {
  if (args.executionContext.requestKind !== ACP_SKILL_RUN_REQUEST_KIND) {
    return args.requests;
  }
  return args.requests.map((request) =>
    adaptSkillRunnerJobToAcpSkillRun(request as SkillRunnerJobRequestV1),
  );
}

function resolveSkippedUnitsFromNoValidInputError(error: unknown) {
  if (!error || typeof error !== "object") {
    return isNoValidInputUnitsError(error) ? 1 : 0;
  }
  const typed = error as {
    code?: unknown;
    skippedUnits?: unknown;
    totalUnits?: unknown;
  };
  if (typed.code === "NO_VALID_INPUT_UNITS") {
    const raw = Number(typed.skippedUnits ?? typed.totalUnits ?? 0);
    if (Number.isFinite(raw) && raw > 0) {
      return Math.floor(raw);
    }
    return 0;
  }
  return isNoValidInputUnitsError(error) ? 1 : 0;
}

type PreparationDeps = {
  appendRuntimeLog: typeof appendRuntimeLog;
  resolveWorkflowExecutionContext: typeof resolveWorkflowExecutionContext;
  resolveWorkflowExecutionOptionsPreview: typeof resolveWorkflowExecutionOptionsPreview;
  buildSelectionContext: typeof buildSelectionContext;
  executeBuildRequests: typeof executeBuildRequests;
  alertWindow: typeof alertWindow;
};

const defaultPreparationDeps: PreparationDeps = {
  appendRuntimeLog,
  resolveWorkflowExecutionContext,
  resolveWorkflowExecutionOptionsPreview,
  buildSelectionContext,
  executeBuildRequests,
  alertWindow,
};

export async function runWorkflowPreparationSeam(args: {
  win: _ZoteroTypes.MainWindow;
  workflow: LoadedWorkflow;
  messageFormatter: WorkflowMessageFormatter;
  executionOptionsOverride?: WorkflowExecutionOptions;
}, deps: Partial<PreparationDeps> = {}): Promise<PreparationSeamResult> {
  const resolved = {
    ...defaultPreparationDeps,
    ...deps,
  };
  const selectedItems = args.win.ZoteroPane?.getSelectedItems?.() || [];
  if (
    selectedItems.length === 0 &&
    !canWorkflowRunWithoutSelection(args.workflow.manifest)
  ) {
    resolved.appendRuntimeLog({
      level: "warn",
      scope: "workflow-trigger",
      workflowId: args.workflow.manifest.id,
      stage: "trigger-rejected-no-selection",
      message: "workflow trigger rejected: no selected items",
    });
    resolved.alertWindow(
      args.win,
      localizeWorkflowText("workflow-execute-no-selection", "No items selected."),
    );
    return {
      status: "halted",
    };
  }
  resolved.appendRuntimeLog({
    level: "info",
    scope: "workflow-trigger",
    workflowId: args.workflow.manifest.id,
    stage: "trigger-start",
    message: "workflow trigger started",
    details: {
      workflowLabel: args.workflow.manifest.label,
      selectedItems: selectedItems.length,
    },
  });

  let requests: unknown[] = [];
  let skippedByFilter = 0;
  try {
    resolved.appendRuntimeLog({
      level: "info",
      scope: "workflow-trigger",
      workflowId: args.workflow.manifest.id,
      stage: "build-requests-start",
      message: "build requests started",
    });
    let preview: {
      providerId?: string;
      workflowParams?: Record<string, unknown>;
      providerOptions?: Record<string, unknown>;
    } = {
      providerId: "",
      workflowParams: {},
      providerOptions: {},
    };
    try {
      preview = resolved.resolveWorkflowExecutionOptionsPreview({
        workflow: args.workflow,
        executionOptionsOverride: args.executionOptionsOverride,
      });
    } catch (previewError) {
      resolved.appendRuntimeLog({
        level: "warn",
        scope: "workflow-trigger",
        workflowId: args.workflow.manifest.id,
        stage: "build-requests-preview-fallback",
        message: "workflow execution options preview unavailable; using empty preview",
        error: previewError,
      });
    }
    const selectionContext = await resolved.buildSelectionContext(selectedItems);
    const builtRequests = await resolved.executeBuildRequests({
      workflow: args.workflow,
      selectionContext,
      executionOptions: {
        workflowParams: preview.workflowParams,
        providerOptions: preview.providerOptions,
      },
    });
    requests = builtRequests;
    skippedByFilter = Math.max(
      0,
      Number(
        (
          builtRequests as unknown as {
            __stats?: { skippedUnits?: number };
          }
        ).__stats?.skippedUnits || 0,
      ),
    );
    resolved.appendRuntimeLog({
      level: "info",
      scope: "workflow-trigger",
      workflowId: args.workflow.manifest.id,
      stage: "build-requests-finished",
      message: "build requests finished",
      details: {
        requestCount: requests.length,
        skippedUnits: skippedByFilter,
      },
    });
  } catch (error) {
    if (isNoValidInputUnitsError(error)) {
      const skippedUnits = resolveSkippedUnitsFromNoValidInputError(error);
      resolved.appendRuntimeLog({
        level: "warn",
        scope: "workflow-trigger",
        workflowId: args.workflow.manifest.id,
        stage: "trigger-no-valid-input",
        message: "workflow has no valid input units",
        details: { skippedUnits },
        error,
      });
      if (typeof console !== "undefined") {
        console.info(
          `[workflow-execute] skipped workflow=${args.workflow.manifest.id} reason=no-valid-input-units`,
        );
      }
      if (shouldShowWorkflowNotifications(args.workflow.manifest)) {
        const upToDateReferenceMatching =
          args.workflow.manifest.id === "reference-matching" && skippedUnits > 0;
        resolved.alertWindow(
          args.win,
          upToDateReferenceMatching
            ? localizeWorkflowText(
                "workflow-reference-matching-up-to-date",
                "Reference matching results are already up to date for the selected references note(s).",
              )
            : buildWorkflowFinishMessage(
                {
                  workflowLabel: args.workflow.manifest.label,
                  succeeded: 0,
                  failed: 0,
                  skipped: skippedUnits,
                  failureReasons: [],
                },
                args.messageFormatter,
              ),
        );
      }
      return {
        status: "halted",
      };
    }
    const reason = normalizeErrorMessage(error, args.messageFormatter);
    const errorSummary = summarizeWorkflowExecutionError(error);
    resolved.appendRuntimeLog({
      level: "error",
      scope: "workflow-trigger",
      workflowId: args.workflow.manifest.id,
      stage: "build-requests-failed",
      message: "build requests failed",
      details: {
        reason,
        errorMessage: errorSummary.message,
        errorStack: errorSummary.stack,
        hookName: errorSummary.hookName,
        packageId: errorSummary.packageId,
        errorWorkflowId: errorSummary.workflowId,
      },
      error,
    });
    resolved.alertWindow(
      args.win,
      localizeWorkflowText(
        "workflow-execute-cannot-run",
        `Workflow ${args.workflow.manifest.label} cannot run: ${reason}`,
        {
          workflowLabel: args.workflow.manifest.label,
          reason,
        },
      ),
    );
    return {
      status: "halted",
    };
  }

  if (requests.length === 0) {
    resolved.appendRuntimeLog({
      level: "warn",
      scope: "workflow-trigger",
      workflowId: args.workflow.manifest.id,
      stage: "trigger-no-requests",
      message: "workflow trigger produced zero requests",
      details: {
        skippedUnits: Math.max(1, skippedByFilter),
      },
    });
    if (shouldShowWorkflowNotifications(args.workflow.manifest)) {
      resolved.alertWindow(
        args.win,
        buildWorkflowFinishMessage(
          {
            workflowLabel: args.workflow.manifest.label,
            succeeded: 0,
            failed: 0,
            skipped: Math.max(1, skippedByFilter),
            failureReasons: [],
          },
          args.messageFormatter,
        ),
      );
    }
    return {
      status: "halted",
    };
  }

  let executionContext: WorkflowExecutionContext | null = null;
  try {
    executionContext = await resolved.resolveWorkflowExecutionContext({
      workflow: args.workflow,
      executionOptionsOverride: args.executionOptionsOverride,
    });
  } catch (error) {
    const reason = normalizeErrorMessage(error, args.messageFormatter);
    const errorSummary = summarizeWorkflowExecutionError(error);
    resolved.appendRuntimeLog({
      level: "error",
      scope: "workflow-trigger",
      workflowId: args.workflow.manifest.id,
      stage: "execution-context-failed",
      message: "workflow execution context resolution failed",
      details: {
        reason,
        errorMessage: errorSummary.message,
        errorStack: errorSummary.stack,
        hookName: errorSummary.hookName,
        packageId: errorSummary.packageId,
        errorWorkflowId: errorSummary.workflowId,
      },
      error,
    });
    resolved.alertWindow(
      args.win,
      localizeWorkflowText(
        "workflow-execute-cannot-run",
        `Workflow ${args.workflow.manifest.label} cannot run: ${reason}`,
        {
          workflowLabel: args.workflow.manifest.label,
          reason,
        },
      ),
    );
    return {
      status: "halted",
    };
  }

  if (!executionContext) {
    resolved.appendRuntimeLog({
      level: "error",
      scope: "workflow-trigger",
      workflowId: args.workflow.manifest.id,
      stage: "execution-context-missing",
      message: "workflow execution context missing",
    });
    resolved.alertWindow(
      args.win,
      localizeWorkflowText(
        "workflow-execute-cannot-run-context-unavailable",
        `Workflow ${args.workflow.manifest.label} cannot run: execution context is unavailable`,
        { workflowLabel: args.workflow.manifest.label },
      ),
    );
    return {
      status: "halted",
    };
  }

  return {
    status: "ready",
    prepared: {
      workflow: args.workflow,
      requests: adaptRequestsForExecutionContext({
        requests,
        executionContext,
      }),
      skippedByFilter,
      executionContext,
    },
  };
}
