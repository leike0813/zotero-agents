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
import {
  ACP_SKILL_RUN_REQUEST_KIND,
  SKILLRUNNER_SEQUENCE_REQUEST_KIND,
} from "../../config/defaults";
import type { SkillRunnerJobRequestV1 } from "../../providers/contracts";
import { adaptSkillRunnerJobToAcpSkillRun } from "../acpSkillRunRequestAdapter";
import {
  SKILLRUNNER_ZOTERO_HOST_ACCESS_ENV_INJECTION_CODE,
  SKILLRUNNER_SUPPORTS_ZOTERO_HOST_ACCESS_RUNTIME_OPTIONS,
  SKILLRUNNER_ZOTERO_HOST_ACCESS_STRIPPED_WARNING_CODE,
  stripZoteroHostAccessRuntimeOptionFromRequest,
  workflowDeclaresRequiredZoteroHostAccess,
} from "../../workflows/zoteroHostAccessOptions";
import { localizeWorkflowLabel } from "../../workflows/localization";
import {
  buildSkillRunnerHostBridgeRuntimeEnv,
  buildSkillRunnerHostBridgeScopeEnv,
  type SkillRunnerHostBridgeEnvResult,
} from "../hostBridgeSkillRunnerEnv";
import {
  scanPluginSkillRegistry,
  type PluginSkillRegistrySnapshot,
} from "../pluginSkillRegistry";

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

function generateSkillRunnerHostBridgeFrontendScopeId() {
  return `skillrunner-scope-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

async function adaptRequestsForExecutionContext(args: {
  requests: unknown[];
  workflow: LoadedWorkflow;
  executionContext: WorkflowExecutionContext;
  buildSkillRunnerHostBridgeEnv?: typeof buildSkillRunnerHostBridgeRuntimeEnv;
}) {
  if (args.executionContext.requestKind === ACP_SKILL_RUN_REQUEST_KIND) {
    return args.requests.map((request) =>
      adaptSkillRunnerJobToAcpSkillRun(request as SkillRunnerJobRequestV1, {
        manifest: args.workflow.manifest,
        runOptions: args.executionContext.runOptions,
        providerOptions: args.executionContext.providerOptions,
      }),
    );
  }
  if (
    isSkillRunnerBackend(args.executionContext.backend?.type) &&
    isSkillRunnerRuntimeEnvRequestKind(args.executionContext.requestKind) &&
    !SKILLRUNNER_SUPPORTS_ZOTERO_HOST_ACCESS_RUNTIME_OPTIONS
  ) {
    const requiresHostAccess = workflowDeclaresRequiredZoteroHostAccess(
      args.workflow.manifest,
    );
    if (!requiresHostAccess) {
      return args.requests.map((request) =>
        stripZoteroHostAccessRuntimeOptionFromRequest(request),
      );
    }
    const envResult = await (
      args.buildSkillRunnerHostBridgeEnv || buildSkillRunnerHostBridgeRuntimeEnv
    )({
      backendUrl: String(args.executionContext.backend?.baseUrl || ""),
    });
    if (!envResult.ok) {
      throw createSkillRunnerHostBridgeEnvError(envResult);
    }
    return args.requests.map((request) =>
      injectSkillRunnerHostBridgeRuntimeEnv({
        request: stripZoteroHostAccessRuntimeOptionFromRequest(request),
        env: envResult.env,
        frontendScopeId: generateSkillRunnerHostBridgeFrontendScopeId(),
      }),
    );
  }
  return args.requests;
}

function createSkillRunnerHostBridgeEnvError(
  envResult: Extract<SkillRunnerHostBridgeEnvResult, { ok: false }>,
) {
  const error = new Error(
    `${envResult.code}: ${envResult.message}`,
  ) as Error & {
    code?: string;
    details?: Record<string, unknown>;
  };
  error.code = envResult.code;
  error.details = envResult.details;
  return error;
}

function getSkillRunnerHostBridgeEnvFailureDetails(error: unknown) {
  if (!error || typeof error !== "object") {
    return {};
  }
  const typed = error as { code?: unknown; details?: unknown };
  return {
    code: typeof typed.code === "string" ? typed.code : undefined,
    details:
      typed.details && typeof typed.details === "object"
        ? sanitizeDiagnosticDetails(typed.details as Record<string, unknown>)
        : undefined,
  };
}

function sanitizeDiagnosticDetails(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((entry) => sanitizeDiagnosticDetails(entry));
  }
  if (!value || typeof value !== "object") {
    return value;
  }
  const output: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
    if (/token|authorization|auth/i.test(key)) {
      output[key] = "[redacted]";
      continue;
    }
    output[key] = sanitizeDiagnosticDetails(entry);
  }
  return output;
}

function injectSkillRunnerHostBridgeRuntimeEnv(args: {
  request: unknown;
  env: Record<string, string>;
  frontendScopeId: string;
}) {
  if (
    !args.request ||
    typeof args.request !== "object" ||
    Array.isArray(args.request)
  ) {
    return args.request;
  }
  const request = { ...(args.request as Record<string, unknown>) };
  const runtimeOptions =
    request.runtime_options &&
    typeof request.runtime_options === "object" &&
    !Array.isArray(request.runtime_options)
      ? { ...(request.runtime_options as Record<string, unknown>) }
      : {};
  const existingEnv =
    runtimeOptions.env &&
    typeof runtimeOptions.env === "object" &&
    !Array.isArray(runtimeOptions.env)
      ? (runtimeOptions.env as Record<string, unknown>)
      : {};
  runtimeOptions.env = {
    ...existingEnv,
    ...args.env,
    ZOTERO_BRIDGE_SCOPE: buildSkillRunnerHostBridgeScopeEnv(
      args.frontendScopeId,
    ),
  };
  runtimeOptions.no_cache = true;
  request.runtime_options = runtimeOptions;
  return request;
}

function isSkillRunnerRuntimeEnvRequestKind(requestKind: unknown) {
  const normalized = String(requestKind || "").trim();
  return (
    normalized === "skillrunner.job.v1" ||
    normalized === SKILLRUNNER_SEQUENCE_REQUEST_KIND
  );
}

function isSkillRunnerBackend(backendType: unknown) {
  return String(backendType || "").trim() === "skillrunner";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function collectSkillRunnerSkillIdsFromRequests(requests: unknown[]) {
  const skillIds = new Set<string>();
  for (const request of requests) {
    if (!isRecord(request)) {
      continue;
    }
    const skillId = String(request.skill_id || "").trim();
    if (skillId) {
      skillIds.add(skillId);
    }
    const steps = Array.isArray(request.steps) ? request.steps : [];
    for (const step of steps) {
      if (!isRecord(step)) {
        continue;
      }
      const stepSkillId = String(step.skill_id || "").trim();
      if (stepSkillId) {
        skillIds.add(stepSkillId);
      }
    }
  }
  return Array.from(skillIds);
}

function buildSkillDisplayMap(args: {
  skillIds: string[];
  registry: PluginSkillRegistrySnapshot;
}) {
  const result: Record<string, { skillId: string; skillName?: string }> = {};
  for (const skillId of args.skillIds) {
    const skill = args.registry.entriesById[skillId];
    result[skillId] = {
      skillId,
      skillName: skill?.skillName || undefined,
    };
  }
  return result;
}

async function resolveSkillRunnerSkillDisplayById(args: {
  workflow: LoadedWorkflow;
  requests: unknown[];
  executionContext: WorkflowExecutionContext;
  scanPluginSkillRegistry: typeof scanPluginSkillRegistry;
  appendRuntimeLog: typeof appendRuntimeLog;
}) {
  if (
    !isSkillRunnerBackend(args.executionContext.backend?.type) ||
    !isSkillRunnerRuntimeEnvRequestKind(args.executionContext.requestKind)
  ) {
    return undefined;
  }
  const skillIds = collectSkillRunnerSkillIdsFromRequests(args.requests);
  if (skillIds.length === 0) {
    return undefined;
  }
  try {
    const registry = await args.scanPluginSkillRegistry();
    return buildSkillDisplayMap({ skillIds, registry });
  } catch (error) {
    args.appendRuntimeLog({
      level: "warn",
      scope: "workflow-trigger",
      workflowId: args.workflow.manifest.id,
      stage: "skillrunner-skill-display-scan-failed",
      message: "failed to resolve SkillRunner skill display metadata",
      error,
    });
    return Object.fromEntries(
      skillIds.map((skillId) => [skillId, { skillId }]),
    );
  }
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
  buildSkillRunnerHostBridgeEnv: typeof buildSkillRunnerHostBridgeRuntimeEnv;
  scanPluginSkillRegistry: typeof scanPluginSkillRegistry;
  alertWindow: typeof alertWindow;
};

const defaultPreparationDeps: PreparationDeps = {
  appendRuntimeLog,
  resolveWorkflowExecutionContext,
  resolveWorkflowExecutionOptionsPreview,
  buildSelectionContext,
  executeBuildRequests,
  buildSkillRunnerHostBridgeEnv: buildSkillRunnerHostBridgeRuntimeEnv,
  scanPluginSkillRegistry,
  alertWindow,
};

export async function runWorkflowPreparationSeam(
  args: {
    win: _ZoteroTypes.MainWindow;
    workflow: LoadedWorkflow;
    messageFormatter: WorkflowMessageFormatter;
    executionOptionsOverride?: WorkflowExecutionOptions;
    ignoreSavedWorkflowSettings?: boolean;
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
        ignoreSavedSettings: args.ignoreSavedWorkflowSettings,
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
      ignoreSavedSettings: args.ignoreSavedWorkflowSettings,
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

  const willInjectSkillRunnerHostBridgeEnv =
    isSkillRunnerRuntimeEnvRequestKind(executionContext.requestKind) &&
    String(executionContext.backend?.type || "").trim() === "skillrunner" &&
    workflowDeclaresRequiredZoteroHostAccess(args.workflow.manifest) &&
    !SKILLRUNNER_SUPPORTS_ZOTERO_HOST_ACCESS_RUNTIME_OPTIONS;

  if (willInjectSkillRunnerHostBridgeEnv) {
    resolved.appendRuntimeLog({
      level: "info",
      scope: "workflow-trigger",
      workflowId: args.workflow.manifest.id,
      backendId: executionContext.backend.id,
      backendType: executionContext.backend.type,
      providerId: executionContext.providerId,
      stage: SKILLRUNNER_ZOTERO_HOST_ACCESS_ENV_INJECTION_CODE,
      message:
        "SkillRunner ZoteroHostAccess will be provided through runtime_options.env.",
      details: {
        code: SKILLRUNNER_ZOTERO_HOST_ACCESS_ENV_INJECTION_CODE,
        strippedRuntimeOptionCode:
          SKILLRUNNER_ZOTERO_HOST_ACCESS_STRIPPED_WARNING_CODE,
        temporaryCompatibilitySwitch:
          "SKILLRUNNER_SUPPORTS_ZOTERO_HOST_ACCESS_RUNTIME_OPTIONS",
        supportsZoteroHostAccessRuntimeOptions:
          SKILLRUNNER_SUPPORTS_ZOTERO_HOST_ACCESS_RUNTIME_OPTIONS,
        zoteroHostAccessRequired: true,
      },
    });
  }

  let adaptedRequests: unknown[] = [];
  try {
    adaptedRequests = await adaptRequestsForExecutionContext({
      requests,
      workflow: args.workflow,
      executionContext,
      buildSkillRunnerHostBridgeEnv: resolved.buildSkillRunnerHostBridgeEnv,
    });
  } catch (error) {
    const reason = normalizeErrorMessage(error, args.messageFormatter);
    const envFailure = getSkillRunnerHostBridgeEnvFailureDetails(error);
    resolved.appendRuntimeLog({
      level: "error",
      scope: "workflow-trigger",
      workflowId: args.workflow.manifest.id,
      backendId: executionContext.backend.id,
      backendType: executionContext.backend.type,
      providerId: executionContext.providerId,
      stage: "skillrunner-host-bridge-env-unavailable",
      message: "SkillRunner Host Bridge env injection failed",
      details: {
        reason,
        code: envFailure.code,
        diagnostics: envFailure.details,
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

  const skillDisplayById = await resolveSkillRunnerSkillDisplayById({
    workflow: args.workflow,
    requests: adaptedRequests,
    executionContext,
    scanPluginSkillRegistry: resolved.scanPluginSkillRegistry,
    appendRuntimeLog: resolved.appendRuntimeLog,
  });

  return {
    status: "ready",
    prepared: {
      workflow: args.workflow,
      requests: adaptedRequests,
      skillDisplayById,
      skippedByFilter,
      executionContext,
    },
  };
}
