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
import {
  SKILLRUNNER_SUPPORTS_ZOTERO_HOST_ACCESS_RUNTIME_OPTIONS,
  SKILLRUNNER_ZOTERO_HOST_ACCESS_STRIPPED_WARNING_CODE,
  stripZoteroHostAccessRuntimeOptionFromRequest,
  workflowDeclaresRequiredZoteroHostAccess,
} from "../../workflows/zoteroHostAccessOptions";
import { localizeWorkflowLabel } from "../../workflows/localization";

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
  workflow: LoadedWorkflow;
  executionContext: WorkflowExecutionContext;
}) {
  if (args.executionContext.requestKind === ACP_SKILL_RUN_REQUEST_KIND) {
    return args.requests.map((request) =>
      adaptSkillRunnerJobToAcpSkillRun(request as SkillRunnerJobRequestV1, {
        manifest: args.workflow.manifest,
        runOptions: args.executionContext.runOptions,
      }),
    );
  }
  if (
    args.executionContext.requestKind === "skillrunner.job.v1" &&
    !SKILLRUNNER_SUPPORTS_ZOTERO_HOST_ACCESS_RUNTIME_OPTIONS
  ) {
    return args.requests.map((request) =>
      stripZoteroHostAccessRuntimeOptionFromRequest(request),
    );
  }
  return args.requests;
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

export async function runWorkflowPreparationSeam(
  args: {
    win: _ZoteroTypes.MainWindow;
    workflow: LoadedWorkflow;
    messageFormatter: WorkflowMessageFormatter;
    executionOptionsOverride?: WorkflowExecutionOptions;
    selectedItemsOverride?: Zotero.Item[];
    suppressUiFeedback?: boolean;
  },
  deps: Partial<PreparationDeps> = {},
): Promise<PreparationSeamResult> {
  const resolved = {
    ...defaultPreparationDeps,
    ...deps,
  };
  const selectedItems = Array.isArray(args.selectedItemsOverride)
    ? args.selectedItemsOverride
    : args.win.ZoteroPane?.getSelectedItems?.() || [];
  const workflowLabel = localizeWorkflowLabel(args.workflow);
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
    if (
      !args.suppressUiFeedback &&
      shouldShowWorkflowNotifications(args.workflow.manifest)
    ) {
      resolved.alertWindow(
        args.win,
        localizeWorkflowText(
          "workflow-execute-no-selection",
          "No items selected.",
        ),
      );
    }
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
      workflowLabel,
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
      details: {
        allowWriteApprovalBypass:
          args.workflow.manifest.execution?.zoteroHostAccess
            ?.allowWriteApprovalBypass === true,
        autoApproveWritesRequested:
          args.executionOptionsOverride?.runOptions?.zoteroHostAccess
            ?.autoApproveWrites === true,
      },
    });
    let preview: {
      providerId?: string;
      workflowParams?: Record<string, unknown>;
      providerOptions?: Record<string, unknown>;
      runOptions?: WorkflowExecutionOptions["runOptions"];
    } = {
      providerId: "",
      workflowParams: {},
      providerOptions: {},
      runOptions: {},
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
        message:
          "workflow execution options preview unavailable; using empty preview",
        error: previewError,
      });
    }
    const selectionContext =
      await resolved.buildSelectionContext(selectedItems);
    const builtRequests = await resolved.executeBuildRequests({
      workflow: args.workflow,
      selectionContext,
      executionOptions: {
        workflowParams: preview.workflowParams,
        providerOptions: preview.providerOptions,
        runOptions: preview.runOptions,
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
        allowWriteApprovalBypass:
          args.workflow.manifest.execution?.zoteroHostAccess
            ?.allowWriteApprovalBypass === true,
        autoApproveWritesRequested:
          preview.runOptions?.zoteroHostAccess?.autoApproveWrites === true,
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
      if (
        !args.suppressUiFeedback &&
        shouldShowWorkflowNotifications(args.workflow.manifest)
      ) {
        resolved.alertWindow(
          args.win,
          buildWorkflowFinishMessage(
            {
              workflowLabel,
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
    if (
      !args.suppressUiFeedback &&
      shouldShowWorkflowNotifications(args.workflow.manifest)
    ) {
      resolved.alertWindow(
        args.win,
        localizeWorkflowText(
          "workflow-execute-cannot-run",
          `Workflow ${workflowLabel} cannot run: ${reason}`,
          {
            workflowLabel,
            reason,
          },
        ),
      );
    }
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
    if (
      !args.suppressUiFeedback &&
      shouldShowWorkflowNotifications(args.workflow.manifest)
    ) {
      resolved.alertWindow(
        args.win,
        buildWorkflowFinishMessage(
          {
            workflowLabel,
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
    if (
      !args.suppressUiFeedback &&
      shouldShowWorkflowNotifications(args.workflow.manifest)
    ) {
      resolved.alertWindow(
        args.win,
        localizeWorkflowText(
          "workflow-execute-cannot-run",
          `Workflow ${workflowLabel} cannot run: ${reason}`,
          {
            workflowLabel,
            reason,
          },
        ),
      );
    }
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
    if (
      !args.suppressUiFeedback &&
      shouldShowWorkflowNotifications(args.workflow.manifest)
    ) {
      resolved.alertWindow(
        args.win,
        localizeWorkflowText(
          "workflow-execute-cannot-run-context-unavailable",
          `Workflow ${workflowLabel} cannot run: execution context is unavailable`,
          { workflowLabel },
        ),
      );
    }
    return {
      status: "halted",
    };
  }

  if (
    executionContext.requestKind === "skillrunner.job.v1" &&
    String(executionContext.backend?.type || "").trim() === "skillrunner" &&
    workflowDeclaresRequiredZoteroHostAccess(args.workflow.manifest) &&
    !SKILLRUNNER_SUPPORTS_ZOTERO_HOST_ACCESS_RUNTIME_OPTIONS
  ) {
    resolved.appendRuntimeLog({
      level: "warn",
      scope: "workflow-trigger",
      workflowId: args.workflow.manifest.id,
      backendId: executionContext.backend.id,
      backendType: executionContext.backend.type,
      providerId: executionContext.providerId,
      stage: SKILLRUNNER_ZOTERO_HOST_ACCESS_STRIPPED_WARNING_CODE,
      message:
        "SkillRunner backend does not support ZoteroHostAccess runtime options; the workflow will submit without Host Bridge runtime access.",
      details: {
        code: SKILLRUNNER_ZOTERO_HOST_ACCESS_STRIPPED_WARNING_CODE,
        temporaryCompatibilitySwitch:
          "SKILLRUNNER_SUPPORTS_ZOTERO_HOST_ACCESS_RUNTIME_OPTIONS",
        supportsZoteroHostAccessRuntimeOptions:
          SKILLRUNNER_SUPPORTS_ZOTERO_HOST_ACCESS_RUNTIME_OPTIONS,
        zoteroHostAccessRequired: true,
      },
    });
  }

  return {
    status: "ready",
    prepared: {
      workflow: args.workflow,
      requests: adaptRequestsForExecutionContext({
        requests,
        workflow: args.workflow,
        executionContext,
      }),
      skippedByFilter,
      executionContext,
    },
  };
}
