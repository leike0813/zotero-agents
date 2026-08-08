import type { BackendInstance } from "../backends/types";
import { listBackendInstances } from "../backends/registry";
import { ACP_SKILL_RUN_REQUEST_KIND } from "../config/defaults";
import type {
  AcpSkillRunRequestV1,
  ProviderExecutionResult,
} from "../providers/contracts";
import type { ProviderProgressEvent } from "../providers/types";
import { executeApplyResult } from "../workflows/runtime";
import { workflowSubmissionQueue } from "../jobQueue/workflowSubmissionQueue";
import { localizeWorkflowSkillName } from "../workflows/localization";
import { canWorkflowRunWithoutSelection } from "../workflows/triggerPolicy";
import {
  getLoadedWorkflowEntries,
  rescanWorkflowRegistry,
} from "./workflowRuntime";
import { createUnavailableBundleReader } from "./workflowExecution/bundleIO";
import { createWorkflowResultContext } from "./workflowExecution/resultContext";
import { resolveTargetParentIDFromRequest } from "./workflowExecution/requestMeta";
import { executeSequenceStepApply } from "./workflowExecution/sequenceStepApply";
import { appendRuntimeLog } from "./runtimeLogManager";
import { collectSkillRunFeedbackSidecar } from "./skillRunFeedback";
import { buildAcpRuntimeDependencyPlan } from "./acpRuntimeDependencyWrapper";
import { registerAcpWorkflowWorkspaceForReuse } from "./acpSkillRunnerWorkspace";
import { getAssistantExecutionDisplayMode } from "./assistantExecutionDisplayPolicy";
import { isDebugModeEnabled } from "./debugMode";
import { startAcpRuntimeProfile } from "./acpRuntimePerformanceProfiler";
import {
  buildAcpSkillOutputRepairPrompt,
  validateAcpSkillFinalPayload,
} from "./acpSkillOutputValidator";
import {
  convergeAcpSkillTurnOutput,
  writeAcpSkillRunnerResultEnvelope,
  type AcpSkillOutputConvergenceResult,
} from "./acpSkillOutputConvergence";
import { readAcpSkillRunContextPayload } from "./acpSkillRunPayloadStore";
import { resolveAcpSkillResultFileFallback } from "./acpSkillResultFileFallback";
import {
  createAcpConnectionAdapter,
  type AcpConnectionAdapter,
} from "./acpConnectionAdapter";
import {
  ACP_RUNTIME_PROMPT_TEMPLATES_BY_ID,
  loadAcpRuntimePromptTemplate,
  renderAcpRuntimePromptTemplate,
} from "./acpRuntimePromptTemplates";
import {
  appendAcpSkillRunUserReply,
  appendAcpSkillRunHardTimeoutTranscriptNotice,
  completeAcpSkillRunTranscriptTurnBoundary,
  detachAcpSkillRunControllerAfterApplyResult,
  flushAcpSkillRunRuntimeFileWrites,
  getAcpSkillRunRecord,
  hydrateAcpSkillRunTranscriptMirror,
  isEligibleForPostTerminalAcpSkillRunConversation,
  isRecoverablePromptFailure,
  markAcpSkillRunApplyResult,
  projectAcpSkillRunOutputEnvelopeToTranscript,
  registerAcpSkillRunController,
  recordAcpSkillRunOutputRevision,
  recordAcpSkillRunSessionUpdate,
  resolveAcpSkillRunPermissionRequest,
  upsertAcpSkillRun,
  type AcpSkillRunReplyRequest,
} from "./acpSkillRunStore";
import { finishAcpSequenceStep } from "./workflowExecution/acpSequenceStepLifecycle";
import {
  requestAcpSkillRunForeground,
  type AcpSkillRunForegroundDeps,
} from "./acpSkillRunForeground";
import {
  listWorkflowTasks,
  updateWorkflowTaskStateByRequest,
} from "./taskRuntime";
import { readRuntimeTextFile } from "./runtimePersistence";
import {
  appendAcpSkillRunAuditUpdate,
  appendAcpSkillRunTransportAuditEvent,
  resolveAcpSkillRunAuditTrailFiles,
  shouldWriteDetailedAcpAuditArtifacts,
  writeAcpSkillRunAuditFinalState,
  writeAcpSkillRunAuditRuntimeLogs,
  writeAcpSkillRunAuditStderrTail,
} from "./acpSkillRunAuditTrail";
import { continueSkillRunnerSequence } from "./workflowExecution/sequenceRuntime";
import {
  assertHostBridgePluginSkillBundleIdentityCurrent,
  HostBridgePluginSkillBundleIdentityChangedError,
} from "../shared/hostBridgePluginSkillBundleContract";
import { getCurrentHostBridgePluginSkillBundleIdentity } from "./hostBridgePluginSkillBundle";
import {
  watchPromiseSettlement,
  type PromiseSettlementWatchdog,
} from "../utils/wait";
import {
  getSequenceRunStateByStepRequest,
  getSequenceStepIndexByRequestId,
  markSequenceRunTerminal,
  recordSequenceStepSucceeded,
} from "./workflowExecution/sequenceStateStore";
import {
  CONFIRMED_ACP_SKILL_PROMPT_INTERRUPTION_STATE,
  DEFAULT_ACP_PROMPT_INTERRUPT_GRACE_MS,
  applyAcpSkillRunRuntimeSelection,
  appendAcpSkillOutputValidationFailureRuntimeLog,
  buildAcpSkillOutputValidationFailureDetails,
  cloneJsonObject,
  createAcpHardTimeoutMonitor,
  errorMessage,
  isObservableAcpPromptOutputUpdateKind,
  markAcpSkillRunContinuationRunning,
  prepareAcpSkillRunHostBridgeCli,
  recordAcpSkillRunAdapterDiagnostic,
  refreshAcpSkillRunRuntimeCatalogFromSession,
  rememberAcpSkillRunRuntimeCatalog,
  resolveAcpProfileZoteroMajor,
  resolveAcpSkillRunEffectiveRuntimeOptions,
  resolveRequiredMcpTools,
  waitForAcpHardTimeoutTranscriptDrain,
  handleAcpSkillRunPermissionRequest,
  isJsonObject,
  resolveRunnerRequiredMcpTools,
  wrapAcpSkillRunPermissionRequestForTimeoutPause,
} from "./acpSkillRunExecutionSupport";
import type {
  AcpPromptFailureDiagnostic,
  AcpPromptOutcome,
  AcpSkillRunnerDependencies,
  createAssistantTurnAccumulator as orchestratorCreateAssistantTurnAccumulator,
  classifyAcpPromptError as orchestratorClassifyAcpPromptError,
  classifyAcpPromptFailure as orchestratorClassifyAcpPromptFailure,
  executeAcpSkillRunnerJob as orchestratorExecuteAcpSkillRunnerJob,
  runPrompt as orchestratorRunPrompt,
  AcpPromptFailureError as OrchestratorPromptFailureError,
} from "./acpSkillRunnerOrchestrator";

function normalizeString(value: unknown) {
  return String(value || "").trim();
}

// Prompt-execution helpers owned by the orchestrator (turn accumulator,
// prompt failure classification, AcpPromptFailureError, runPrompt).
// Injected once at module load so the recovery subdomain stays below the
// main execution path in the import graph.
export type AcpSkillRunRecoveryHost = {
  runPrompt: typeof orchestratorRunPrompt;
  classifyAcpPromptFailure: typeof orchestratorClassifyAcpPromptFailure;
  classifyAcpPromptError: typeof orchestratorClassifyAcpPromptError;
  AcpPromptFailureError: typeof OrchestratorPromptFailureError;
  createAssistantTurnAccumulator: typeof orchestratorCreateAssistantTurnAccumulator;
  executeAcpSkillRunnerJob: typeof orchestratorExecuteAcpSkillRunnerJob;
};

let host: AcpSkillRunRecoveryHost;

export function configureAcpSkillRunRecoveryHost(
  nextHost: AcpSkillRunRecoveryHost,
) {
  host = nextHost;
}

const runPrompt: typeof orchestratorRunPrompt = (args) => host.runPrompt(args);
const classifyAcpPromptFailure: typeof orchestratorClassifyAcpPromptFailure = (
  outcome,
) => host.classifyAcpPromptFailure(outcome);
const classifyAcpPromptError: typeof orchestratorClassifyAcpPromptError = (
  error,
) => host.classifyAcpPromptError(error);
const createAssistantTurnAccumulator: typeof orchestratorCreateAssistantTurnAccumulator =
  (requestId) => host.createAssistantTurnAccumulator(requestId);
const executeAcpSkillRunnerJob: typeof orchestratorExecuteAcpSkillRunnerJob = (
  args,
) => host.executeAcpSkillRunnerJob(args);

function newAcpPromptFailureError(diagnostic: AcpPromptFailureDiagnostic) {
  return new host.AcpPromptFailureError(diagnostic);
}

async function resolveWorkflowById(workflowId: string) {
  const normalized = normalizeString(workflowId);
  if (!normalized) {
    return null;
  }
  let workflow = getLoadedWorkflowEntries().find(
    (entry) => entry.manifest.id === normalized,
  );
  if (workflow) {
    return workflow;
  }
  await rescanWorkflowRegistry();
  workflow = getLoadedWorkflowEntries().find(
    (entry) => entry.manifest.id === normalized,
  );
  return workflow || null;
}

export function resolveWorkflowSkillName(args: {
  workflowId?: string;
  skillId: string;
  rawFallback?: string;
}) {
  const workflowId = normalizeString(args.workflowId);
  const workflow = workflowId
    ? getLoadedWorkflowEntries().find(
        (entry) => entry.manifest.id === workflowId,
      )
    : undefined;
  if (!workflow) {
    return normalizeString(args.rawFallback) || undefined;
  }
  return (
    localizeWorkflowSkillName({
      workflow,
      skillId: args.skillId,
      rawFallback: args.rawFallback,
    }) || undefined
  );
}

function resolveRecoveredWorkflowId(
  record: NonNullable<ReturnType<typeof getAcpSkillRunRecord>>,
) {
  return normalizeString(record.workflowId);
}

export function resolveRecoveredWorkflowIdFromTask(
  record: NonNullable<ReturnType<typeof getAcpSkillRunRecord>>,
) {
  const requestId = normalizeString(record.requestId);
  if (!requestId) {
    return "";
  }
  const task = listWorkflowTasks().find(
    (entry) => normalizeString(entry.requestId) === requestId,
  );
  return normalizeString(task?.workflowId);
}

async function resolveRecoveredWorkflow(
  record: NonNullable<ReturnType<typeof getAcpSkillRunRecord>>,
) {
  const candidates = [
    resolveRecoveredWorkflowId(record),
    resolveRecoveredWorkflowIdFromTask(record),
  ].filter(Boolean);
  const attempted: string[] = [];
  for (const candidate of candidates) {
    if (attempted.includes(candidate)) {
      continue;
    }
    attempted.push(candidate);
    const workflow = await resolveWorkflowById(candidate);
    if (workflow) {
      return { workflow, workflowId: candidate, attempted };
    }
  }
  return { workflow: null, workflowId: "", attempted };
}

async function applyRecoveredAcpSkillResult(args: {
  record: NonNullable<ReturnType<typeof getAcpSkillRunRecord>>;
  resultJson: Record<string, unknown>;
  force?: boolean;
  reason?: string;
}) {
  if (args.record.applyResultState === "succeeded" && !args.force) {
    return {
      ok: true,
      status: "skipped",
      reason: "already_succeeded",
      requestId: args.record.requestId,
    };
  }
  const resolvedWorkflow = await resolveRecoveredWorkflow(args.record);
  const workflowId = resolvedWorkflow.workflowId;
  const workflow = resolvedWorkflow.workflow;
  if (!workflow) {
    const attempted = resolvedWorkflow.attempted.length
      ? resolvedWorkflow.attempted.join(", ")
      : "(none)";
    throw new Error(
      `workflow not found for ACP skill recovery apply: requestId=${args.record.requestId}; storedWorkflowId=${normalizeString(args.record.workflowId) || "(empty)"}; skillId=${normalizeString(args.record.skillId) || "(empty)"}; attempted=${attempted}`,
    );
  }
  await flushAcpSkillRunRuntimeFileWrites();
  const recoveredContext = await readAcpSkillRunContextPayload(
    args.record.runtimeDir,
  );
  const request =
    args.record.requestPayload || recoveredContext?.requestPayload;
  const targetParentID = request
    ? resolveTargetParentIDFromRequest(request)
    : "";
  const applyParent = targetParentID || null;
  if (!applyParent && !canWorkflowRunWithoutSelection(workflow.manifest)) {
    throw new Error(
      "cannot resolve target parent for recovered ACP skill apply",
    );
  }
  const runResult = {
    status: "succeeded",
    requestId: args.record.requestId,
    fetchType: "result",
    backendId: args.record.backendId,
    backendType: args.record.backendType,
    runId: args.record.runId,
    resultJson: args.resultJson,
    resultJsonPath: args.record.resultJsonPath,
    workspaceDir: args.record.workspaceDir,
    responseJson: {
      provider: "acp",
      backendId: args.record.backendId,
      backendType: args.record.backendType,
      resultResolution: "workflow-result-context",
      workspaceDir: args.record.workspaceDir,
      resultJsonPath: args.record.resultJsonPath,
    },
  };
  const bundleReader = createUnavailableBundleReader(args.record.requestId);
  const resultContext = await createWorkflowResultContext({
    runResult,
    bundleReader,
    manifest: workflow.manifest,
  });
  markAcpSkillRunApplyResult({
    requestId: args.record.requestId,
    state: "pending",
  });
  try {
    const slot = args.record.submissionUnitId
      ? workflowSubmissionQueue.getSlotCoordinator(args.record.submissionUnitId)
      : null;
    slot?.cancelPendingResumption();
    if (slot && !(await slot.ensureSlot("host-apply"))) {
      throw new Error("ACP recovered apply admission was canceled.");
    }
    const applyResult = await executeApplyResult({
      workflow,
      parent: applyParent,
      bundleReader,
      resultContext,
      request,
      runResult,
    });
    const sequenceStepId = normalizeString(args.record.sequenceStepId);
    const sequenceState = sequenceStepId
      ? getSequenceRunStateByStepRequest(args.record.requestId)
      : null;
    const sequenceStepIndex = sequenceState
      ? getSequenceStepIndexByRequestId(sequenceState, args.record.requestId)
      : -1;
    await collectSkillRunFeedbackSidecar({
      workflow,
      request,
      runResult,
      resultContext,
      bundleReader,
      jobId: normalizeString(args.record.jobId) || undefined,
      sequenceStep: sequenceStepId
        ? {
            id: sequenceStepId,
            index: sequenceStepIndex >= 0 ? sequenceStepIndex : undefined,
            skillId:
              normalizeString(args.record.skillId) ||
              normalizeString(args.record.requestedSkillId),
          }
        : undefined,
      appendRuntimeLog,
    });
    markAcpSkillRunApplyResult({
      requestId: args.record.requestId,
      state: "succeeded",
    });
    await detachAcpSkillRunControllerAfterApplyResult({
      requestId: args.record.requestId,
      state: "succeeded",
    });
    updateWorkflowTaskStateByRequest({
      backendId: args.record.backendId,
      backendType: args.record.backendType,
      requestId: args.record.requestId,
      state: "succeeded",
    });
    return {
      ok: true,
      status: "succeeded",
      requestId: args.record.requestId,
      workflowId,
      topicId:
        normalizeString((applyResult as { topicId?: unknown })?.topicId) ||
        normalizeString(args.resultJson.topic_id) ||
        normalizeString(
          isJsonObject(args.resultJson.topic_definition)
            ? args.resultJson.topic_definition.id
            : "",
        ),
      reason: normalizeString(args.reason) || undefined,
      applyResult,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : String(error || "unknown error");
    markAcpSkillRunApplyResult({
      requestId: args.record.requestId,
      state: "failed",
      error: message,
    });
    await detachAcpSkillRunControllerAfterApplyResult({
      requestId: args.record.requestId,
      state: "failed",
    });
    updateWorkflowTaskStateByRequest({
      backendId: args.record.backendId,
      backendType: args.record.backendType,
      requestId: args.record.requestId,
      state: "failed",
      error: message,
    });
    throw error;
  }
}

function requestRecoveredSequenceStepForeground(args: {
  event: ProviderProgressEvent;
  record: NonNullable<ReturnType<typeof getAcpSkillRunRecord>>;
  sequenceState: NonNullable<
    ReturnType<typeof getSequenceRunStateByStepRequest>
  >;
  backend: BackendInstance;
  dependencies?: AcpSkillRunnerDependencies;
}) {
  if (args.event.type !== "request-created") {
    return;
  }
  const requestId = normalizeString(args.event.requestId);
  if (!requestId) {
    return;
  }
  const event = args.event as Record<string, unknown>;
  const request = isJsonObject(event.sequenceStepRequest)
    ? event.sequenceStepRequest
    : undefined;
  requestAcpSkillRunForeground({
    requestId,
    backend: args.backend,
    request,
    workflowId: args.sequenceState.workflowId,
    workflowLabel: args.sequenceState.workflowLabel,
    jobId: args.sequenceState.jobId,
    runId: args.sequenceState.workflowRunId || args.record.runId,
    sequenceStepId: normalizeString(event.sequenceStepId) || undefined,
    sequenceStepIndex: event.sequenceStepIndex,
    taskName: normalizeString(event.sequenceStepTaskName) || undefined,
    skillId:
      normalizeString(event.sequenceStepSkillId) ||
      (request ? normalizeString(request.skill_id) : "") ||
      undefined,
    deps: args.dependencies?.acpSkillRunForeground,
  });
}

export async function continueRecoveredSequenceStep(args: {
  record: NonNullable<ReturnType<typeof getAcpSkillRunRecord>>;
  resultJson: Record<string, unknown>;
  dependencies?: AcpSkillRunnerDependencies;
}) {
  const sequenceStepId = normalizeString(args.record.sequenceStepId);
  const sequenceFinalStepId = normalizeString(args.record.sequenceFinalStepId);
  if (!sequenceStepId || !sequenceFinalStepId) {
    return applyRecoveredAcpSkillResult({
      record: args.record,
      resultJson: args.resultJson,
    });
  }
  if (sequenceStepId === sequenceFinalStepId) {
    const apply = await applyRecoveredAcpSkillResult({
      record: args.record,
      resultJson: args.resultJson,
    });
    const sequenceState = getSequenceRunStateByStepRequest(
      args.record.requestId,
    );
    if (apply.ok && sequenceState?.rootRequestId) {
      const stepIndex = getSequenceStepIndexByRequestId(
        sequenceState,
        args.record.requestId,
      );
      if (stepIndex >= 0) {
        recordSequenceStepSucceeded({
          sequenceRunId: sequenceState.sequenceRunId,
          stepIndex,
          requestId: args.record.requestId,
          output: args.resultJson,
          result: {
            status: "succeeded",
            requestId: args.record.requestId,
            fetchType: "result",
            resultJson: args.resultJson,
            responseJson: {
              provider: "acp",
              recovered: true,
            },
          },
        });
      }
      updateWorkflowTaskStateByRequest({
        backendId: args.record.backendId,
        backendType: args.record.backendType,
        requestId: sequenceState.rootRequestId,
        state: "succeeded",
      });
      markSequenceRunTerminal({
        sequenceRunId: sequenceState.sequenceRunId,
        status: "completed",
      });
    }
    return apply;
  }

  const sequenceState = getSequenceRunStateByStepRequest(args.record.requestId);
  if (!sequenceState) {
    throw new Error(
      `sequence state not found for recovered ACP step: requestId=${args.record.requestId}; workflowId=${normalizeString(args.record.workflowId) || "(empty)"}; skillId=${normalizeString(args.record.skillId) || "(empty)"}; sequenceStepId=${sequenceStepId}`,
    );
  }
  const stepIndex = getSequenceStepIndexByRequestId(
    sequenceState,
    args.record.requestId,
  );
  if (stepIndex < 0) {
    throw new Error(
      `sequence step not found for recovered ACP step: requestId=${args.record.requestId}; workflowId=${normalizeString(args.record.workflowId) || "(empty)"}; skillId=${normalizeString(args.record.skillId) || "(empty)"}; sequenceStepId=${sequenceStepId}`,
    );
  }
  const recoveredResult: ProviderExecutionResult = {
    status: "succeeded",
    requestId: args.record.requestId,
    fetchType: "result",
    resultJson: args.resultJson,
    responseJson: {
      provider: "acp",
      recovered: true,
      workspaceDir: args.record.workspaceDir,
      resultJsonPath: args.record.resultJsonPath,
    },
  };
  const recoveredWorkspaceDir = normalizeString(args.record.workspaceDir);
  recordSequenceStepSucceeded({
    sequenceRunId: sequenceState.sequenceRunId,
    stepIndex,
    requestId: args.record.requestId,
    output: args.resultJson,
    result: recoveredResult,
  });
  try {
    await registerAcpWorkflowWorkspaceForReuse({
      workflowRunId: sequenceState.workflowRunId,
      workspaceDir: recoveredWorkspaceDir,
    });
  } catch (error) {
    const message = errorMessage(error);
    throw new Error(
      `ACP recovered workflow workspace is unavailable for sequence continuation: workflow_run_id=${sequenceState.workflowRunId}; requestId=${args.record.requestId}; reason=${message}`,
    );
  }
  const backend = await resolveBackendForRecoveredRun(args.record.backendId);
  try {
    const continuationResult = await continueSkillRunnerSequence({
      sequenceRunId: sequenceState.sequenceRunId,
      startIndex: stepIndex + 1,
      backend,
      providerOptions:
        sequenceState.providerOptions || args.record.providerOptions,
      submissionId: args.record.submissionId,
      submissionUnitId: args.record.submissionUnitId,
      appendRuntimeLog,
      executeWithProvider: (input) =>
        executeAcpSkillRunnerJob({
          ...input,
          dependencies: args.dependencies,
        }),
      onProgress: (event) => {
        requestRecoveredSequenceStepForeground({
          event,
          record: args.record,
          sequenceState:
            getSequenceRunStateByStepRequest(args.record.requestId) ||
            sequenceState,
          backend,
          dependencies: args.dependencies,
        });
      },
      onSequenceStepFinished: async (event) => {
        await finishAcpSequenceStep({
          requestId: event.requestId,
          finalStep: event.step.id === event.state.request.final_step_id,
          applyResultStatus:
            event.state.steps[event.stepIndex]?.applyResult?.status,
        });
      },
      applySequenceStepResult: async (stepApply) => {
        const applyWorkflow = await resolveWorkflowById(
          stepApply.applyWorkflowId,
        );
        if (!applyWorkflow) {
          throw new Error(
            `sequence step apply workflow not found: ${stepApply.applyWorkflowId}`,
          );
        }
        return executeSequenceStepApply({
          workflow: applyWorkflow,
          parent:
            resolveTargetParentIDFromRequest(stepApply.sequenceRequest) || null,
          request: stepApply.stepRequest,
          runResult: {
            ...stepApply.stepResult,
            resultJson: stepApply.output,
            backendId: normalizeString(backend.id) || undefined,
            backendType: normalizeString(backend.type) || undefined,
            runId: stepApply.workflowRunId,
            sequence: {
              workflow_run_id: stepApply.workflowRunId,
              final_step_id: stepApply.sequenceRequest.final_step_id,
              steps: stepApply.sequenceSteps,
            },
          },
          sequenceStep: {
            id: stepApply.step.id,
            index: stepApply.stepIndex,
            workflowId: stepApply.applyWorkflowId,
            skillId: stepApply.step.skill_id,
            finalStep: stepApply.finalStep,
            phase: "sequence-step",
          },
        });
      },
    });
    if (continuationResult.status !== "succeeded") {
      return {
        ok: true,
        status: "deferred",
        requestId: continuationResult.requestId,
        workflowId: sequenceState.workflowId,
      };
    }
    const finalRecord =
      getAcpSkillRunRecord(continuationResult.requestId) || args.record;
    const finalResultJson = isJsonObject(continuationResult.resultJson)
      ? continuationResult.resultJson
      : args.resultJson;
    const apply = await applyRecoveredAcpSkillResult({
      record: {
        ...finalRecord,
        status: "succeeded",
        resultJson: finalResultJson,
      },
      resultJson: finalResultJson,
    });
    if (apply.ok && sequenceState.rootRequestId) {
      updateWorkflowTaskStateByRequest({
        backendId: args.record.backendId,
        backendType: args.record.backendType,
        requestId: sequenceState.rootRequestId,
        state: "succeeded",
      });
    }
    return apply;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : String(error || "unknown error");
    markSequenceRunTerminal({
      sequenceRunId: sequenceState.sequenceRunId,
      status: "failed",
      error: message,
    });
    if (sequenceState.rootRequestId) {
      updateWorkflowTaskStateByRequest({
        backendId: args.record.backendId,
        backendType: args.record.backendType,
        requestId: sequenceState.rootRequestId,
        state: "failed",
        error: message,
      });
    }
    throw error;
  }
}

async function readAcpSkillRunResultJson(
  record: NonNullable<ReturnType<typeof getAcpSkillRunRecord>>,
) {
  if (typeof record.resultJson !== "undefined") {
    return cloneJsonObject(record.resultJson, "ACP skill run resultJson");
  }
  const resultJsonPath = normalizeString(record.resultJsonPath);
  if (!resultJsonPath) {
    throw new Error("ACP skill run is missing resultJsonPath");
  }
  const text = await readRuntimeTextFile(resultJsonPath);
  if (!normalizeString(text)) {
    throw new Error(
      `ACP skill run result JSON is unavailable: ${resultJsonPath}`,
    );
  }
  return cloneJsonObject(
    JSON.parse(text) as unknown,
    `ACP skill run result JSON at ${resultJsonPath}`,
  );
}

function applyResultJsonOverride(args: {
  resultJson: Record<string, unknown>;
  override?: Record<string, unknown>;
  mode?: unknown;
}) {
  if (!args.override) {
    return {
      resultJson: args.resultJson,
      overridden: false,
      overrideMode: "none",
    };
  }
  const overrideMode =
    normalizeString(args.mode) === "replace" ? "replace" : "merge";
  return {
    resultJson:
      overrideMode === "replace"
        ? cloneJsonObject(args.override, "resultJsonOverride")
        : {
            ...args.resultJson,
            ...cloneJsonObject(args.override, "resultJsonOverride"),
          },
    overridden: true,
    overrideMode,
  };
}

export async function reapplyAcpSkillRunResult(args: {
  requestId?: string;
  runId?: string;
  force?: boolean;
  persistResult?: boolean;
  resultJsonOverride?: Record<string, unknown>;
  overrideMode?: "merge" | "replace";
  resultJson?: Record<string, unknown>;
}) {
  const requestId =
    normalizeString(args.requestId) || normalizeString(args.runId);
  if (!requestId) {
    throw new Error("requestId is required");
  }
  const record = getAcpSkillRunRecord(requestId);
  if (!record) {
    throw new Error(`ACP skill run not found: ${requestId}`);
  }
  let resultJson = args.resultJson
    ? cloneJsonObject(args.resultJson, "resultJson")
    : await readAcpSkillRunResultJson(record);
  const override = applyResultJsonOverride({
    resultJson,
    override: args.resultJsonOverride,
    mode: args.overrideMode,
  });
  resultJson = override.resultJson;
  if (override.overridden && args.persistResult !== false) {
    const resultJsonPath = normalizeString(record.resultJsonPath);
    if (!resultJsonPath) {
      throw new Error(
        "cannot persist overridden result: resultJsonPath is missing",
      );
    }
    await writeAcpSkillRunnerResultEnvelope({
      resultJsonPath,
      resultJson,
    });
    upsertAcpSkillRun({
      requestId,
      resultJson,
      event: {
        stage: "debug-reapply-result-overridden",
        message: "Debug reapply overrode ACP skill result JSON.",
        level: "info",
        details: {
          overrideMode: override.overrideMode,
          resultJsonPath,
        },
      },
    });
  }
  const apply = await applyRecoveredAcpSkillResult({
    record: {
      ...record,
      resultJson,
    },
    resultJson,
    force: args.force === true,
    reason: override.overridden ? "debug_reapply_overridden" : "debug_reapply",
  });
  return {
    ...apply,
    schema: "host_bridge.debug.acp_skill_run.reapply_result.v1",
    overridden: override.overridden,
    overrideMode: override.overrideMode,
    persistedResult: override.overridden && args.persistResult !== false,
  };
}

async function resolveBackendForRecoveredRun(backendId: string) {
  const normalized = normalizeString(backendId);
  const backend = (await listBackendInstances()).find(
    (entry) => normalizeString(entry.id) === normalized,
  );
  if (!backend) {
    throw new Error(
      `ACP backend not found for recovered skill run: ${normalized}`,
    );
  }
  if (normalizeString(backend.type) !== "acp") {
    throw new Error(
      `Recovered ACP skill run requires ACP backend: ${normalized}`,
    );
  }
  return backend;
}

async function attachRecoveredSession(args: {
  adapter: AcpConnectionAdapter;
  requestId: string;
  sessionId: string;
  backend: BackendInstance;
}) {
  const initialized = await args.adapter.initialize();
  if (initialized.canResumeSession) {
    try {
      const session = await args.adapter.resumeSession({
        sessionId: args.sessionId,
      });
      refreshAcpSkillRunRuntimeCatalogFromSession({
        requestId: args.requestId,
        backend: args.backend,
        session,
      });
      return "resumed";
    } catch (error) {
      upsertAcpSkillRun({
        requestId: args.requestId,
        event: {
          stage: "session-resume-failed",
          message:
            error instanceof Error
              ? error.message
              : String(error || "unknown error"),
          level: "warn",
        },
      });
    }
  }
  if (initialized.canLoadSession) {
    const session = await args.adapter.loadSession({
      sessionId: args.sessionId,
    });
    refreshAcpSkillRunRuntimeCatalogFromSession({
      requestId: args.requestId,
      backend: args.backend,
      session,
    });
    return "loaded";
  }
  upsertAcpSkillRun({
    requestId: args.requestId,
    conversationRecoveryState: "unsupported",
    lastRecoveryError: "ACP backend does not support session resume/load.",
    event: {
      stage: "session-recovery-unsupported",
      message: "ACP backend does not support session resume/load.",
      level: "error",
    },
  });
  throw new Error("ACP backend does not support session resume/load.");
}

function canContinueRecoveredWorkflowTask(
  record: NonNullable<ReturnType<typeof getAcpSkillRunRecord>>,
) {
  if (
    record.status === "succeeded" ||
    record.status === "failed" ||
    record.status === "canceled" ||
    record.applyResultState === "succeeded" ||
    record.applyResultState === "failed" ||
    !normalizeString(record.sessionId)
  ) {
    return false;
  }
  if (
    !!record.pendingInteraction &&
    (record.status === "waiting_user" ||
      record.outputConvergenceState === "pending" ||
      record.status === "running" ||
      record.status === "failed_retriable")
  ) {
    return true;
  }
  if (record.status === "waiting_user") {
    return true;
  }
  if (record.status === "failed_retriable" && !!record.pendingInteraction) {
    return true;
  }
  return (
    (record.status === "running" ||
      record.status === "repairing" ||
      record.status === "failed_retriable") &&
    (!!record.runnerJson || !!normalizeString(record.runContextPath)) &&
    !!normalizeString(record.primarySkillDir)
  );
}

async function buildRecoveredContinuationPrompt(args: {
  userMessage: string;
  record: NonNullable<ReturnType<typeof getAcpSkillRunRecord>>;
}) {
  const executionMode =
    normalizeString(args.record.executionMode) || "interactive";
  const workspaceDir =
    normalizeString(args.record.workspaceDir) || "(unknown workspace)";
  const resultJsonPath =
    normalizeString(args.record.resultJsonPath) || "(unknown result path)";
  const inputManifestPath =
    normalizeString(args.record.inputManifestPath) ||
    "(unknown input manifest)";
  const requestedSkillId =
    normalizeString(args.record.requestedSkillId) ||
    normalizeString(args.record.skillId);
  const outputBranchInstruction =
    executionMode === "interactive"
      ? "- If you still need user input, return the pending branch: `__SKILL_DONE__: false` with a non-empty `message` and an object `ui_hints`. If the task is complete, return the final branch: `__SKILL_DONE__: true` plus the final output fields."
      : "- Return `__SKILL_DONE__: true` plus the final output fields.";
  const template = await loadAcpRuntimePromptTemplate(
    ACP_RUNTIME_PROMPT_TEMPLATES_BY_ID.recovered_continuation_guard,
  );
  return renderAcpRuntimePromptTemplate({
    template,
    replacements: {
      EXECUTION_MODE: executionMode,
      INPUT_MANIFEST_PATH: inputManifestPath,
      OUTPUT_BRANCH_INSTRUCTION: outputBranchInstruction,
      REQUESTED_SKILL_ID: requestedSkillId || "(unknown)",
      RESULT_JSON_PATH: resultJsonPath,
      USER_MESSAGE: args.userMessage,
      WORKSPACE_DIR: workspaceDir,
    },
    requiredPlaceholders: [
      "EXECUTION_MODE",
      "INPUT_MANIFEST_PATH",
      "OUTPUT_BRANCH_INSTRUCTION",
      "REQUESTED_SKILL_ID",
      "RESULT_JSON_PATH",
      "USER_MESSAGE",
      "WORKSPACE_DIR",
    ],
  });
}

export async function recoverAcpSkillRunConversation(args: {
  requestId: string;
  reason?: "connect" | "reply";
  dependencies?: AcpSkillRunnerDependencies;
}) {
  const requestId = normalizeString(args.requestId);
  if (!requestId) {
    throw new Error("requestId is required");
  }
  const record = getAcpSkillRunRecord(requestId);
  if (!record) {
    throw new Error(`ACP skill run not found: ${requestId}`);
  }
  const postTerminalConversation =
    isEligibleForPostTerminalAcpSkillRunConversation(record);
  if (
    (record.status === "succeeded" ||
      record.status === "failed" ||
      record.status === "canceled") &&
    (!postTerminalConversation || args.reason !== "connect")
  ) {
    throw new Error(
      "Eligible terminal ACP skill conversations must be explicitly connected before reply.",
    );
  }
  try {
    assertHostBridgePluginSkillBundleIdentityCurrent(
      record.hostBridgePluginSkillBundleIdentity,
      getCurrentHostBridgePluginSkillBundleIdentity(),
    );
  } catch (error) {
    if (error instanceof HostBridgePluginSkillBundleIdentityChangedError) {
      upsertAcpSkillRun({
        requestId,
        conversationRecoveryState: "unavailable",
        lastRecoveryError: error.code,
      });
    }
    throw error;
  }
  if (
    __acp_runtime_performance_profiler_enabled__ &&
    (typeof __debug_mode__ === "undefined"
      ? isDebugModeEnabled()
      : __debug_mode__)
  ) {
    startAcpRuntimeProfile({
      requestId,
      displayMode: getAssistantExecutionDisplayMode(),
      transport: "unknown",
      zoteroMajor: resolveAcpProfileZoteroMajor(),
    });
  }
  await hydrateAcpSkillRunTranscriptMirror(requestId);
  const recoveredContext = await readAcpSkillRunContextPayload(
    record.runtimeDir,
  );
  const contextRequest =
    recoveredContext?.requestPayload &&
    isJsonObject(recoveredContext.requestPayload)
      ? recoveredContext.requestPayload
      : undefined;
  const contextRunnerJson = isJsonObject(recoveredContext?.runnerJson)
    ? recoveredContext?.runnerJson
    : undefined;
  const recoveredRequest =
    record.requestPayload &&
    typeof record.requestPayload === "object" &&
    !Array.isArray(record.requestPayload) &&
    (record.requestPayload as { kind?: unknown }).kind ===
      ACP_SKILL_RUN_REQUEST_KIND
      ? (record.requestPayload as AcpSkillRunRequestV1)
      : contextRequest &&
          (contextRequest as { kind?: unknown }).kind ===
            ACP_SKILL_RUN_REQUEST_KIND
        ? (contextRequest as AcpSkillRunRequestV1)
        : null;
  const recoveredRequiredMcpTools = recoveredRequest
    ? resolveRequiredMcpTools({
        request: recoveredRequest,
        runnerJson: (record.runnerJson || contextRunnerJson || {}) as Record<
          string,
          unknown
        >,
      })
    : resolveRunnerRequiredMcpTools(
        (record.runnerJson || contextRunnerJson || {}) as Record<
          string,
          unknown
        >,
      );
  const sessionId = normalizeString(record.sessionId);
  if (!sessionId) {
    upsertAcpSkillRun({
      requestId,
      conversationRecoveryState: "unavailable",
      lastRecoveryError: "ACP skill run has no remote session id.",
    });
    throw new Error("ACP skill run has no remote session id.");
  }
  const workspaceDir = normalizeString(record.workspaceDir);
  const runtimeDir = normalizeString(record.runtimeDir);
  if (!workspaceDir || !runtimeDir) {
    throw new Error("ACP skill run is missing workspace/runtime paths.");
  }
  upsertAcpSkillRun({
    requestId,
    conversationRecoveryState: "connecting",
    connectionActionState: args.reason === "connect" ? "connecting" : "idle",
    event: {
      stage: "session-recovery-started",
      message: "Recovering ACP skill run session.",
      level: "info",
      details: {
        reason: args.reason || "reply",
        sessionId,
        hostAccess: {
          primary: "host_bridge_cli",
          mcpCompatibility: "disabled_by_default",
          requiredMcpTools: recoveredRequiredMcpTools,
        },
      },
    },
  });
  const backend = await resolveBackendForRecoveredRun(record.backendId);
  rememberAcpSkillRunRuntimeCatalog({ requestId, backend });
  const runnerJson = record.runnerJson || contextRunnerJson || {};
  const effectiveRecoveredRequest =
    recoveredRequest ||
    ({
      kind: ACP_SKILL_RUN_REQUEST_KIND,
      skill_id:
        normalizeString(record.skillId) ||
        normalizeString(record.requestedSkillId) ||
        "recovered-acp-skill",
    } as AcpSkillRunRequestV1);
  const recoveredEffectiveRuntimeOptions =
    resolveAcpSkillRunEffectiveRuntimeOptions({
      request: effectiveRecoveredRequest,
      runnerJson,
      providerOptions: record.providerOptions,
    });
  let hostBridgePreparation: Awaited<
    ReturnType<typeof prepareAcpSkillRunHostBridgeCli>
  >;
  try {
    hostBridgePreparation = await prepareAcpSkillRunHostBridgeCli({
      requestId,
      workspaceDir,
      request: effectiveRecoveredRequest,
      runnerJson,
      backend,
      dependencies: args.dependencies,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : String(error || "Host Bridge CLI recovery injection failed.");
    upsertAcpSkillRun({
      requestId,
      conversationRecoveryState: "failed",
      connectionActionState: "idle",
      lastRecoveryError: message,
      event: {
        stage: "session-recovery-failed",
        message,
        level: "error",
      },
    });
    throw error;
  }
  upsertAcpSkillRun({
    requestId,
    hostBridgeCli: hostBridgePreparation.hostBridgeCliState,
    event: hostBridgePreparation.event,
  });
  const dependencyPlan = await buildAcpRuntimeDependencyPlan({
    backend: hostBridgePreparation.backend,
    runnerJson,
    cwd: workspaceDir,
    mode: "probe-and-wrap",
    probe: args.dependencies?.dependencyProbe,
  });
  if (dependencyPlan.diagnostic?.level === "error") {
    const message = `${dependencyPlan.diagnostic.code}: ${dependencyPlan.diagnostic.message}`;
    upsertAcpSkillRun({
      requestId,
      conversationRecoveryState: "failed",
      connectionActionState: "idle",
      lastRecoveryError: message,
      event: {
        stage: "session-recovery-failed",
        message,
        level: "error",
      },
    });
    throw new Error(message);
  }
  const createAdapter =
    args.dependencies?.createAdapter || createAcpConnectionAdapter;
  const auditFiles = resolveAcpSkillRunAuditTrailFiles(runtimeDir);
  const detailedAuditEnabled = shouldWriteDetailedAcpAuditArtifacts();
  const adapter = await createAdapter({
    backend: dependencyPlan.wrappedBackend,
    agentWorkspaceDir: workspaceDir,
    sessionCwd: workspaceDir,
    workspaceDir,
    runtimeDir,
    performanceProfileRequestId: requestId,
    diagnosticCapture: detailedAuditEnabled
      ? {
          bridgeAuditFile: normalizeString(auditFiles.bridge),
          onAuditEvent: (event) =>
            appendAcpSkillRunTransportAuditEvent({
              requestId,
              runtimeDir,
              event,
            }),
        }
      : undefined,
  });
  let cleanupDone = false;
  let captureAssistantText = false;
  let currentTurnObservedAcpActivity = false;
  let promptChain = Promise.resolve();
  let liveSessionId = sessionId;
  let recoveredPromptActive = false;
  let recoveredCancellationRequested = false;
  let recoveredInterruptionRequested = false;
  let recoveredInterruptionForced = false;
  let recoveredDisconnectRequested = false;
  let recoveredPromptTimeoutDrain: Promise<unknown> | null = null;
  let recoveredInterruptWatchdog: PromiseSettlementWatchdog | null = null;
  let unsubscribePermission: () => void = () => undefined;
  let unsubscribeUpdate: () => void = () => undefined;
  let unsubscribeDiagnostics: () => void = () => undefined;
  let unsubscribeClose: () => void = () => undefined;
  let recoveredHardTimeoutMonitor: ReturnType<
    typeof createAcpHardTimeoutMonitor
  > | null = null;
  const assistantTurnAccumulator = createAssistantTurnAccumulator(requestId);
  const pendingPermissionPauseIds = new Set<string>();
  const detach = async (
    state: "closed" | "ended" | "error" = "closed",
    error?: string,
  ) => {
    if (cleanupDone) {
      return;
    }
    cleanupDone = true;
    unsubscribePermission();
    unsubscribeUpdate();
    unsubscribeDiagnostics();
    unsubscribeClose();
    recoveredHardTimeoutMonitor?.clear();
    recoveredInterruptWatchdog?.clear();
    recoveredInterruptWatchdog = null;
    registerAcpSkillRunController(requestId, null);
    upsertAcpSkillRun({
      requestId,
      activePrompt: false,
      conversationState: state,
      conversationRecoveryState:
        state === "ended" ? "unavailable" : "available",
      conversationError: error,
      connectionActionState: "idle",
    });
    await adapter.close();
  };
  recoveredHardTimeoutMonitor = createAcpHardTimeoutMonitor({
    requestId,
    seconds: recoveredEffectiveRuntimeOptions.hardTimeoutSeconds,
    source: recoveredEffectiveRuntimeOptions.hardTimeoutSource,
    onTimeout: async () => {
      if (cleanupDone) {
        return;
      }
      recoveredDisconnectRequested = true;
      upsertAcpSkillRun({
        requestId,
        event: {
          stage: "hard-timeout-disconnect-requested",
          message:
            "ACP skill run hard timeout reached; disconnecting local session.",
          level: "warn",
          details: {
            hardTimeoutSeconds:
              recoveredEffectiveRuntimeOptions.hardTimeoutSeconds,
            hardTimeoutSource:
              recoveredEffectiveRuntimeOptions.hardTimeoutSource,
            recovered: true,
          },
        },
      });
      appendRuntimeLog({
        level: "warn",
        scope: "provider",
        backendId: backend.id,
        backendType: backend.type,
        providerId: "acp",
        requestId,
        component: "acp-skillrunner",
        operation: "hard-timeout-disconnect",
        phase: "terminal",
        stage: "hard-timeout-disconnect-requested",
        message:
          "ACP skill run hard timeout reached; disconnecting local session.",
        details: {
          hardTimeoutSeconds:
            recoveredEffectiveRuntimeOptions.hardTimeoutSeconds,
          hardTimeoutSource: recoveredEffectiveRuntimeOptions.hardTimeoutSource,
          recovered: true,
        },
      });
      if (liveSessionId) {
        await adapter.cancel({ sessionId: liveSessionId }).catch((error) => {
          appendRuntimeLog({
            level: "warn",
            scope: "provider",
            backendId: backend.id,
            backendType: backend.type,
            providerId: "acp",
            requestId,
            component: "acp-skillrunner",
            operation: "hard-timeout-cancel",
            phase: "terminal",
            stage: "hard-timeout-cancel-failed",
            message: errorMessage(error),
            details: {
              recovered: true,
            },
          });
        });
      }
      await waitForAcpHardTimeoutTranscriptDrain(recoveredPromptTimeoutDrain);
      completeAcpSkillRunTranscriptTurnBoundary(requestId);
      appendAcpSkillRunHardTimeoutTranscriptNotice({
        requestId,
        hardTimeoutSeconds: recoveredEffectiveRuntimeOptions.hardTimeoutSeconds,
        hardTimeoutSource: recoveredEffectiveRuntimeOptions.hardTimeoutSource,
        recovered: true,
      });
      await detach("closed");
      upsertAcpSkillRun({
        requestId,
        activePrompt: false,
        replyState: "idle",
        error: postTerminalConversation ? record.error : "",
        conversationState: "closed",
        conversationRecoveryState: "available",
        connectionActionState: "idle",
        event: {
          stage: "disconnect-completed",
          message: "ACP skill run local connection detached.",
          level: "info",
          details: {
            recovered: true,
            hardTimeoutSeconds:
              recoveredEffectiveRuntimeOptions.hardTimeoutSeconds,
            hardTimeoutSource:
              recoveredEffectiveRuntimeOptions.hardTimeoutSource,
          },
        },
      });
    },
  });
  const failRecoveredAcpPrompt = async (
    diagnostic: AcpPromptFailureDiagnostic,
  ): Promise<never> => {
    const current = getAcpSkillRunRecord(requestId) || record;
    const failedStatus = isRecoverablePromptFailure({
      ...current,
      sessionId: liveSessionId || current.sessionId,
      conversationRecoveryState: "available",
    })
      ? "failed_retriable"
      : "failed";
    upsertAcpSkillRun({
      requestId,
      status: failedStatus,
      statusReason:
        failedStatus === "failed_retriable"
          ? "prompt_failed_retriable"
          : "prompt_failed_terminal",
      activePrompt: false,
      conversationState: "closed",
      conversationRecoveryState: "available",
      error: diagnostic.error,
      pendingInteraction: null,
      event: {
        stage: diagnostic.stage,
        message: diagnostic.message,
        level: "error",
        details: diagnostic.details,
      },
    });
    await detach("closed").catch(() => undefined);
    throw newAcpPromptFailureError(diagnostic);
  };
  const promptRecoveredSession = async (
    message: string,
  ): Promise<AcpPromptOutcome> => {
    await assistantTurnAccumulator.reset();
    currentTurnObservedAcpActivity = false;
    captureAssistantText = true;
    recoveredPromptActive = true;
    recoveredInterruptionRequested = false;
    recoveredDisconnectRequested = false;
    try {
      let resolvePromptReady: (() => void) | null = null;
      const promptReady = new Promise<void>((resolve) => {
        resolvePromptReady = resolve;
      });
      const promptPromise = runPrompt({
        adapter,
        requestId,
        message,
        sessionId: liveSessionId,
        onPromptReady: () => {
          recoveredHardTimeoutMonitor?.start();
          resolvePromptReady?.();
        },
      });
      const promptDrain = promptPromise.catch(() => undefined);
      recoveredPromptTimeoutDrain = promptDrain;
      let guarded:
        | { timedOut: false; value: Awaited<typeof promptPromise> }
        | { timedOut: true };
      if (recoveredHardTimeoutMonitor) {
        const ready = await Promise.race([
          promptReady.then(() => ({ kind: "ready" as const })),
          promptPromise
            .then((value) => ({ kind: "value" as const, value }))
            .catch((error) => ({ kind: "error" as const, error })),
        ]);
        if (ready.kind === "error") {
          throw ready.error;
        }
        if (ready.kind === "value") {
          guarded = { timedOut: false, value: ready.value };
        } else {
          guarded = await recoveredHardTimeoutMonitor.race(promptPromise);
        }
      } else {
        guarded = { timedOut: false, value: await promptPromise };
      }
      if (guarded.timedOut) {
        return {
          sessionId: liveSessionId,
          stopReason: "cancelled",
          assistantText: await assistantTurnAccumulator.read(),
          observedAcpActivity: currentTurnObservedAcpActivity,
        };
      }
      const result = guarded.value;
      liveSessionId = result.sessionId;
      const assistantText = await assistantTurnAccumulator.read();
      return {
        ...result,
        assistantText: assistantText || result.assistantText || "",
        observedAcpActivity:
          currentTurnObservedAcpActivity || result.observedAcpActivity === true,
      };
    } finally {
      captureAssistantText = false;
      recoveredPromptActive = false;
      recoveredPromptTimeoutDrain = null;
      if (!recoveredHardTimeoutMonitor?.isTriggered()) {
        recoveredHardTimeoutMonitor?.clear();
      }
    }
  };
  const convergeRecoveredReply = async (
    reply: string | AcpSkillRunReplyRequest,
    options?: {
      appendUserReply?: boolean;
      startedStage?: string;
      startedMessage?: string;
    },
  ) => {
    const displayMessage =
      typeof reply === "string" ? reply : reply.displayMessage;
    const promptMessage =
      typeof reply === "string" ? reply : reply.promptMessage;
    const latest = getAcpSkillRunRecord(requestId);
    if (!latest) {
      throw new Error(`ACP skill run not found: ${requestId}`);
    }
    const shouldContinueWorkflow = canContinueRecoveredWorkflowTask(latest);
    if (options?.appendUserReply !== false) {
      appendAcpSkillRunUserReply({ requestId, message: displayMessage });
    }
    if (postTerminalConversation) {
      upsertAcpSkillRun({
        requestId,
        activePrompt: true,
        conversationState: "active",
        conversationRecoveryState: "connected",
        conversationError: "",
        event: {
          stage: "post-terminal-reply-started",
          message: "Post-terminal ACP conversation turn started.",
          level: "info",
          details: { previousStatus: latest.status },
        },
      });
    } else {
      markAcpSkillRunContinuationRunning({
        requestId,
        event: {
          stage: options?.startedStage || "recovered-reply-continuing",
          message:
            options?.startedMessage ||
            (shouldContinueWorkflow
              ? "Recovered reply accepted; continuing ACP skill output convergence."
              : "Recovered reply accepted; starting the next ACP turn."),
          level: "info",
          details: {
            previousStatus: latest.status,
            workflowContinuation: shouldContinueWorkflow,
          },
        },
      });
    }
    const promptRecoveredReply = async (
      userMessage: string,
    ): Promise<AcpPromptOutcome> => {
      const promptRecord = getAcpSkillRunRecord(requestId) || latest;
      try {
        const promptMessage = shouldContinueWorkflow
          ? await buildRecoveredContinuationPrompt({
              userMessage,
              record: promptRecord,
            })
          : userMessage;
        return await promptRecoveredSession(promptMessage);
      } catch (error) {
        if (recoveredCancellationRequested || recoveredDisconnectRequested) {
          return {
            sessionId: liveSessionId,
            stopReason: "cancelled",
            assistantText: "",
            observedAcpActivity: currentTurnObservedAcpActivity,
          };
        }
        if (recoveredInterruptionRequested) {
          recoveredInterruptWatchdog?.clear();
          recoveredInterruptWatchdog = null;
          recoveredInterruptionRequested = false;
          upsertAcpSkillRun({
            requestId,
            promptInterruptState: "unconfirmed",
            event: {
              stage: "interrupt-unconfirmed",
              message:
                "ACP skill run interruption ended with an unconfirmed prompt error.",
              level: "warn",
              details: { recovered: true, reason: errorMessage(error) },
            },
          });
        }
        if (shouldContinueWorkflow) {
          await failRecoveredAcpPrompt(classifyAcpPromptError(error));
        } else if (postTerminalConversation) {
          const message = errorMessage(error);
          upsertAcpSkillRun({
            requestId,
            activePrompt: false,
            conversationState: "active",
            conversationRecoveryState: "connected",
            conversationError: message,
            replyError: message,
            event: {
              stage: "post-terminal-reply-failed",
              message,
              level: "error",
            },
          });
        } else {
          const message = errorMessage(error);
          upsertAcpSkillRun({
            requestId,
            status: "failed_retriable",
            statusReason: "prompt_failed_retriable",
            activePrompt: false,
            pendingInteraction: null,
            conversationState: "active",
            conversationRecoveryState: "connected",
            error: message,
            event: {
              stage: "recovered-reply-failed",
              message,
              level: "error",
            },
          });
        }
        throw error;
      }
    };
    let promptOutcome = await promptRecoveredReply(promptMessage);
    if (recoveredInterruptionForced) {
      return;
    }
    if (recoveredDisconnectRequested) {
      return;
    }
    if (recoveredCancellationRequested) {
      if (postTerminalConversation) {
        upsertAcpSkillRun({
          requestId,
          activePrompt: false,
          replyState: "idle",
          event: {
            stage: "post-terminal-turn-canceled",
            message: "Post-terminal ACP conversation turn canceled.",
            level: "warn",
          },
        });
        return;
      }
      upsertAcpSkillRun({
        requestId,
        status: "canceled",
        statusReason: "cancel_task",
        activePrompt: false,
        replyState: "idle",
        conversationState: "ended",
        conversationRecoveryState: "unavailable",
        event: {
          stage: "canceled",
          message: "ACP skill run canceled.",
          level: "warn",
          details: {
            recovered: true,
          },
        },
      });
      return;
    }
    if (recoveredInterruptionRequested) {
      recoveredInterruptWatchdog?.clear();
      recoveredInterruptWatchdog = null;
      upsertAcpSkillRun(
        postTerminalConversation
          ? {
              requestId,
              activePrompt: false,
              replyState: "idle",
              promptInterruptState: "confirmed",
              event: {
                stage: "interrupt-confirmed",
                message: "ACP conversation turn interrupted.",
                level: "warn",
                details: {
                  recovered: true,
                  postTerminalConversation: true,
                  stopReason: promptOutcome.stopReason,
                },
              },
            }
          : {
              requestId,
              ...CONFIRMED_ACP_SKILL_PROMPT_INTERRUPTION_STATE,
              event: {
                stage: "interrupt-confirmed",
                message: "ACP skill run current turn interrupted.",
                level: "warn",
                details: {
                  recovered: true,
                  stopReason: promptOutcome.stopReason,
                },
              },
            },
      );
      return;
    }
    if (!shouldContinueWorkflow) {
      upsertAcpSkillRun(
        postTerminalConversation
          ? {
              requestId,
              activePrompt: false,
              replyState: "idle",
              conversationState: "active",
              conversationRecoveryState: "connected",
              conversationError: "",
              replyError: "",
              event: {
                stage: "post-terminal-reply-settled",
                message: "Post-terminal ACP conversation turn settled.",
                level: "info",
                details: { stopReason: promptOutcome.stopReason },
              },
            }
          : {
              requestId,
              status: "waiting_user",
              statusReason: "waiting_user",
              activePrompt: false,
              pendingInteraction: null,
              conversationState: "active",
              conversationRecoveryState: "connected",
              error: "",
              event: {
                stage: "recovered-reply-settled",
                message: "Recovered ACP reply settled; waiting for user input.",
                level: "info",
                details: { stopReason: promptOutcome.stopReason },
              },
            },
      );
      return;
    }
    const runnerJsonForConvergence = latest.runnerJson || contextRunnerJson;
    const primarySkillDir =
      normalizeString(latest.primarySkillDir) ||
      normalizeString(recoveredContext?.primarySkillDir);
    if (!runnerJsonForConvergence || !primarySkillDir) {
      throw new Error(
        "Recovered waiting run is missing output convergence context.",
      );
    }
    const executionMode = latest.executionMode || "interactive";
    const maxRepairRounds = Math.max(
      0,
      args.dependencies?.maxRepairRounds ?? 3,
    );
    let repairRound = Math.max(0, latest.repairRounds || 0);
    while (true) {
      const promptFailure = classifyAcpPromptFailure(promptOutcome);
      let convergence: AcpSkillOutputConvergenceResult;
      let promptOutcomeForDiagnostics = promptOutcome;
      if (promptFailure?.stage === "acp-prompt-no-output") {
        const fallback = await resolveAcpSkillResultFileFallback({
          skillId:
            normalizeString(latest.requestedSkillId) ||
            normalizeString(latest.skillId),
          runnerJson: runnerJsonForConvergence as Record<string, unknown>,
          workspaceDir: normalizeString(latest.workspaceDir),
          validator: (payload) =>
            validateAcpSkillFinalPayload({
              payload,
              runnerJson: runnerJsonForConvergence as Record<string, unknown>,
              primarySkillDir,
              workspaceDir: normalizeString(latest.workspaceDir),
            }),
        });
        if (fallback.warnings.length > 0) {
          upsertAcpSkillRun({
            requestId,
            event: {
              stage: fallback.payload
                ? "result-file-fallback-succeeded"
                : "result-file-fallback-skipped",
              message: fallback.payload
                ? "Recovered final output from package result file."
                : "Package result file fallback did not produce valid output.",
              level: fallback.payload ? "warn" : "info",
              details: {
                selectedPath: fallback.selectedPath,
                warnings: fallback.warnings,
                recovered: true,
              },
            },
          });
        }
        if (!fallback.payload) {
          await failRecoveredAcpPrompt(promptFailure);
          throw new Error(promptFailure.error);
        }
        const fallbackPayload = fallback.payload;
        convergence = {
          kind: "final",
          resultJson: fallbackPayload,
          candidateText: JSON.stringify(fallbackPayload),
          warnings: fallback.warnings.map((entry) =>
            [entry.code, entry.detail].filter(Boolean).join(": "),
          ),
        };
      } else if (promptFailure) {
        await failRecoveredAcpPrompt(promptFailure);
        throw new Error(promptFailure.error);
      } else {
        convergence = await convergeAcpSkillTurnOutput({
          assistantText: promptOutcome.assistantText,
          executionMode,
          runnerJson: runnerJsonForConvergence,
          primarySkillDir,
          workspaceDir: normalizeString(latest.workspaceDir),
        });
        promptOutcomeForDiagnostics = { ...promptOutcome };
        promptOutcome.assistantText = "";
      }
      if (convergence.kind === "pending") {
        projectAcpSkillRunOutputEnvelopeToTranscript({
          requestId,
          kind: "pending",
          message: convergence.message,
          candidateText: convergence.candidateText,
          repairRound,
        });
        upsertAcpSkillRun({
          requestId,
          status: "waiting_user",
          statusReason: "waiting_user",
          activePrompt: false,
          conversationState: "active",
          outputConvergenceState: "pending",
          validationStatus: "pending",
          validationErrors: [],
          repairRounds: repairRound,
          lastTurnOutput: convergence.candidateText,
          pendingInteraction: {
            message: convergence.message,
            uiHints: convergence.uiHints,
            candidateText: convergence.candidateText,
          },
          event: {
            stage: "waiting-user",
            message: convergence.message,
            level: "info",
            details: {
              uiHints: convergence.uiHints,
            },
          },
        });
        return;
      }
      if (convergence.kind === "final") {
        if (!latest.resultJsonPath) {
          throw new Error("Recovered ACP skill run is missing resultJsonPath.");
        }
        await writeAcpSkillRunnerResultEnvelope({
          resultJsonPath: latest.resultJsonPath,
          resultJson: convergence.resultJson,
        });
        projectAcpSkillRunOutputEnvelopeToTranscript({
          requestId,
          kind: "final",
          resultJson: convergence.resultJson,
          candidateText: convergence.candidateText,
          repairRound,
        });
        upsertAcpSkillRun({
          requestId,
          status:
            latest.applyResultState === "succeeded" ? "succeeded" : "running",
          statusReason:
            latest.applyResultState === "succeeded"
              ? "apply_succeeded"
              : "validation_succeeded",
          activePrompt: false,
          conversationState: "active",
          validationStatus: "valid",
          validationErrors: [],
          outputConvergenceState: "final",
          repairRounds: repairRound,
          pendingInteraction: null,
          lastTurnOutput: convergence.candidateText,
          resultJson: convergence.resultJson,
          applyResultState:
            latest.applyResultState === "succeeded" ? "succeeded" : "pending",
          event: {
            stage: "recovered-output-validation-succeeded",
            message:
              repairRound > (latest.repairRounds || 0)
                ? `Recovered output repair round ${repairRound} succeeded.`
                : "Recovered ACP skill output validation succeeded.",
            level: "info",
            details: {
              resultJsonPath: latest.resultJsonPath,
              repairRounds: repairRound,
            },
          },
        });
        const afterFinal = getAcpSkillRunRecord(requestId) || latest;
        if (afterFinal.applyResultState !== "succeeded") {
          await continueRecoveredSequenceStep({
            record: {
              ...afterFinal,
              status: "succeeded",
              resultJson: convergence.resultJson,
            },
            resultJson: convergence.resultJson,
            dependencies: args.dependencies,
          });
        }
        return;
      }
      recordAcpSkillRunOutputRevision({
        requestId,
        status: "invalid",
        candidateText: convergence.candidateText,
        repairRound,
        errors: convergence.errors,
      });
      const outputValidationFailureDetails =
        buildAcpSkillOutputValidationFailureDetails({
          convergence,
          promptOutcome: promptOutcomeForDiagnostics,
          repairRound,
          maxRepairRounds,
          recovered: true,
        });
      upsertAcpSkillRun({
        requestId,
        status: repairRound < maxRepairRounds ? "repairing" : "failed",
        statusReason: "validation_failed",
        activePrompt: false,
        outputConvergenceState: "invalid",
        repairRounds: repairRound,
        validationStatus: "invalid",
        validationErrors: convergence.errors,
        error:
          repairRound >= maxRepairRounds
            ? `Recovered ACP skill output validation failed: ${convergence.errors.join("; ")}`
            : "",
        event: {
          stage: "recovered-output-validation-failed",
          message: "Recovered ACP skill output validation failed.",
          level: repairRound < maxRepairRounds ? "warn" : "error",
          details: outputValidationFailureDetails,
        },
      });
      appendAcpSkillOutputValidationFailureRuntimeLog({
        backend,
        requestId,
        workflowId: latest.workflowId,
        runId: latest.runId,
        jobId: latest.jobId,
        stage: "recovered-output-validation-failed",
        message: "Recovered ACP skill output validation failed.",
        phase: repairRound < maxRepairRounds ? "running" : "terminal",
        level: repairRound < maxRepairRounds ? "warn" : "error",
        details: outputValidationFailureDetails,
      });
      if (repairRound >= maxRepairRounds) {
        throw new Error(
          `Recovered ACP skill output validation failed: ${convergence.errors.join("; ")}`,
        );
      }
      repairRound += 1;
      upsertAcpSkillRun({
        requestId,
        status: "repairing",
        statusReason: "repair_start",
        activePrompt: true,
        repairRounds: repairRound,
        pendingInteraction: null,
        event: {
          stage: "repair-started",
          message: `Output repair round ${repairRound} started.`,
          level: "warn",
          details: {
            errors: convergence.errors,
            recovered: true,
          },
        },
      });
      promptOutcome = await promptRecoveredReply(
        buildAcpSkillOutputRepairPrompt({
          executionMode,
          errors: convergence.errors,
          repairRound,
          maxRepairRounds,
        }),
      );
    }
  };
  unsubscribePermission = adapter.onPermissionRequest((request) => {
    const wrappedRequest = wrapAcpSkillRunPermissionRequestForTimeoutPause({
      request,
      pause: (permissionRequestId) => {
        pendingPermissionPauseIds.add(permissionRequestId);
        recoveredHardTimeoutMonitor?.pause();
      },
      resume: (permissionRequestId) => {
        pendingPermissionPauseIds.delete(permissionRequestId);
        if (pendingPermissionPauseIds.size === 0) {
          recoveredHardTimeoutMonitor?.resume();
        }
      },
    });
    handleAcpSkillRunPermissionRequest({
      requestId,
      request: wrappedRequest,
    });
  });
  unsubscribeUpdate = adapter.onUpdate(async (event) => {
    const update = event.update || { sessionUpdate: "" };
    await appendAcpSkillRunAuditUpdate({
      requestId,
      runtimeDir: record.runtimeDir,
      event,
    });
    if (
      captureAssistantText &&
      isObservableAcpPromptOutputUpdateKind(update.sessionUpdate)
    ) {
      currentTurnObservedAcpActivity = true;
    }
    if (
      captureAssistantText &&
      normalizeString(update.sessionUpdate) === "agent_message_chunk"
    ) {
      const content = (
        update as { content?: { type?: string | null; text?: string | null } }
      ).content;
      if (normalizeString(content?.type) === "text") {
        assistantTurnAccumulator.append(content?.text || "");
      }
    }
    recordAcpSkillRunSessionUpdate(requestId, event);
  });
  unsubscribeDiagnostics = adapter.onDiagnostics((entry) => {
    recordAcpSkillRunAdapterDiagnostic({
      requestId,
      runtimeDir: record.runtimeDir,
      backendId: backend.id,
      entry,
    });
  });
  unsubscribeClose = adapter.onClose(async (event) => {
    const stderrText = normalizeString(event?.stderrText);
    await writeAcpSkillRunAuditStderrTail({
      requestId,
      runtimeDir: record.runtimeDir,
      stderrText,
    });
    upsertAcpSkillRun({
      requestId,
      activePrompt: false,
      conversationState: "closed",
      conversationRecoveryState: "available",
      conversationError: stderrText || undefined,
      event: {
        stage: "acp-connection-closed",
        message: normalizeString(event?.message) || "ACP connection closed",
        level: stderrText ? "error" : "warn",
        details: {
          stderrText,
        },
      },
    });
    await writeAcpSkillRunAuditRuntimeLogs({
      requestId,
      runtimeDir: record.runtimeDir,
    });
    await writeAcpSkillRunAuditFinalState({
      requestId,
      runtimeDir: record.runtimeDir,
      record: getAcpSkillRunRecord(requestId),
      stderrText,
      transportLifecycle: event?.transportLifecycle,
    });
    registerAcpSkillRunController(requestId, null);
  });
  try {
    const attachKind = await attachRecoveredSession({
      adapter,
      requestId,
      sessionId,
      backend,
    });
    const recoveredController = {
      cancel: async () => {
        recoveredCancellationRequested = true;
        await adapter.cancel({ sessionId: liveSessionId });
        await detach("ended");
      },
      interruptTurn: async () => {
        if (!recoveredPromptActive) {
          upsertAcpSkillRun({
            requestId,
            activePrompt: false,
            replyState: "idle",
            event: {
              stage: "interrupt-ignored",
              message:
                "ACP skill run current turn interruption ignored because no recovered prompt turn is active.",
              level: "info",
            },
          });
          return;
        }
        recoveredInterruptionRequested = true;
        const current = getAcpSkillRunRecord(requestId);
        if (current?.pendingPermission) {
          resolveAcpSkillRunPermissionRequest({
            runRequestId: requestId,
            outcome: "cancelled",
          });
        }
        await adapter.cancel({ sessionId: liveSessionId });
        upsertAcpSkillRun({
          requestId,
          activePrompt: true,
          replyState: "idle",
          conversationState: "active",
          conversationRecoveryState: "connected",
          promptInterruptState: "requested",
          event: {
            stage: "interrupt-requested",
            message: "ACP skill run current turn interruption requested.",
            level: "warn",
            details: {
              recovered: true,
            },
          },
        });
        if (recoveredPromptTimeoutDrain) {
          recoveredInterruptWatchdog?.clear();
          recoveredInterruptWatchdog = watchPromiseSettlement(
            recoveredPromptTimeoutDrain,
            args.dependencies?.promptInterruptGraceMs ??
              DEFAULT_ACP_PROMPT_INTERRUPT_GRACE_MS,
            async () => {
              if (cleanupDone || !recoveredInterruptionRequested) {
                return;
              }
              recoveredInterruptionForced = true;
              try {
                await detach("closed");
              } catch (error) {
                recoveredInterruptionForced = false;
                recoveredInterruptionRequested = false;
                upsertAcpSkillRun({
                  requestId,
                  ...(postTerminalConversation
                    ? {}
                    : {
                        status: "failed_retriable" as const,
                        statusReason: "prompt_failed_retriable" as const,
                      }),
                  activePrompt: false,
                  promptInterruptState: "unconfirmed",
                  conversationState: "error",
                  conversationRecoveryState: "available",
                  conversationError: errorMessage(error),
                  event: {
                    stage: "interrupt-force-close-failed",
                    message: errorMessage(error),
                    level: "error",
                    details: { recovered: true },
                  },
                });
                return;
              }
              upsertAcpSkillRun({
                requestId,
                ...(postTerminalConversation
                  ? {}
                  : {
                      status: "waiting_user" as const,
                      statusReason: "interrupt_turn" as const,
                    }),
                activePrompt: false,
                promptInterruptState: "forced",
                conversationState: "closed",
                conversationRecoveryState: "available",
                event: {
                  stage: "interrupt-forced",
                  message:
                    "ACP skill run prompt did not confirm cancellation and was force-stopped.",
                  level: "warn",
                  details: {
                    recovered: true,
                    postTerminalConversation,
                  },
                },
              });
            },
          );
        }
      },
      replyRequest: async (reply) => {
        const nextPrompt = promptChain
          .catch(() => undefined)
          .then(() => convergeRecoveredReply(reply));
        promptChain = nextPrompt;
        try {
          await nextPrompt;
        } catch (error) {
          promptChain = Promise.resolve();
          throw error;
        }
      },
      disconnect: async () => {
        recoveredDisconnectRequested = true;
        if (recoveredPromptActive) {
          await adapter.cancel({ sessionId: liveSessionId }).catch((error) => {
            upsertAcpSkillRun({
              requestId,
              event: {
                stage: "disconnect-cancel-failed",
                message: errorMessage(error),
                level: "warn",
                details: {
                  recovered: true,
                },
              },
            });
            appendRuntimeLog({
              level: "warn",
              scope: "provider",
              backendId: backend.id,
              backendType: backend.type,
              providerId: "acp",
              requestId,
              component: "acp-skillrunner",
              operation: "disconnect-cancel",
              phase: "terminal",
              stage: "disconnect-cancel-failed",
              message: errorMessage(error),
              details: {
                recovered: true,
              },
            });
          });
        }
        await detach("closed");
      },
      endSession: async () => {
        await detach("ended");
      },
      setMode: async ({ sessionId, modeId }) => {
        await adapter.setMode({ sessionId, modeId });
      },
      setModel: async ({ sessionId, modelId }) => {
        await adapter.setModel({ sessionId, modelId });
      },
      setConfigOption: async ({ sessionId, category, value }) =>
        (await adapter.setConfigOption?.({ sessionId, category, value })) ===
        true,
    } satisfies NonNullable<
      Parameters<typeof registerAcpSkillRunController>[1]
    >;
    registerAcpSkillRunController(
      requestId,
      recoveredController,
      undefined,
      postTerminalConversation ? "post-terminal-conversation" : "workflow",
    );
    upsertAcpSkillRun({
      requestId,
      sessionId,
      conversationState: "active",
      conversationRecoveryState: "connected",
      connectionActionState: "idle",
      lastRecoveryError: "",
      conversationError: "",
      event: {
        stage: `session-${attachKind}`,
        message: `ACP skill run session ${attachKind}.`,
        level: "info",
        details: {
          sessionId,
        },
      },
    });
    await applyAcpSkillRunRuntimeSelection({
      adapter,
      backend,
      requestId,
      sessionId: liveSessionId,
    });
    upsertAcpSkillRun({
      requestId,
      event: {
        stage: "session-runtime-options-restored",
        message: "Recovered ACP session runtime options restored.",
        level: "info",
      },
    });
    upsertAcpSkillRun({
      requestId,
      event: {
        stage: "session-reconnected",
        message: "ACP connection re-established.",
        level: "info",
      },
    });
    const latest = getAcpSkillRunRecord(requestId) || record;
    const shouldAutoContinue =
      args.reason === "connect" &&
      !latest.pendingInteraction &&
      !latest.pendingPermission &&
      (latest.status === "running" ||
        latest.status === "repairing" ||
        latest.status === "failed_retriable") &&
      canContinueRecoveredWorkflowTask(latest);
    if (shouldAutoContinue) {
      const autoPrompt = promptChain
        .catch(() => undefined)
        .then(() =>
          convergeRecoveredReply(
            "Continue the interrupted ACP Skills workflow from the last recoverable state.",
            {
              appendUserReply: false,
              startedStage: "recovered-auto-continuation-started",
              startedMessage:
                "Recovered session connected; starting automatic ACP skill continuation.",
            },
          ),
        );
      promptChain = autoPrompt;
      void autoPrompt.catch((error) => {
        promptChain = Promise.resolve();
        const current = getAcpSkillRunRecord(requestId) || latest;
        const recoverableAfterFailure = isRecoverablePromptFailure({
          ...current,
          conversationRecoveryState: "available",
        });
        upsertAcpSkillRun({
          requestId,
          status: recoverableAfterFailure ? "failed_retriable" : "failed",
          statusReason: recoverableAfterFailure
            ? "recovery_failed"
            : "prompt_failed_terminal",
          activePrompt: false,
          conversationState: "closed",
          conversationRecoveryState: "available",
          error:
            error instanceof Error
              ? error.message
              : String(error || "unknown error"),
          event: {
            stage: "recovered-auto-continuation-failed",
            message:
              error instanceof Error
                ? error.message
                : String(error || "unknown error"),
            level: "error",
          },
        });
      });
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : String(error || "unknown error");
    await detach("error", message).catch(() => undefined);
    upsertAcpSkillRun({
      requestId,
      conversationRecoveryState: /does not support session resume\/load/i.test(
        message,
      )
        ? "unsupported"
        : "failed",
      connectionActionState: "idle",
      lastRecoveryError: message,
      event: {
        stage: "session-recovery-failed",
        message,
        level: "error",
      },
    });
    throw error;
  }
}
