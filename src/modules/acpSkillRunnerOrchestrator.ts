import type { BackendInstance } from "../backends/types";
import { ACP_SKILL_RUN_REQUEST_KIND } from "../config/defaults";
import type {
  AcpSkillRunRequestV1,
  ProviderExecutionResult,
} from "../providers/contracts";
import type {
  ProviderOrchestrationContext,
  ProviderProgressEvent,
} from "../providers/types";
import { appendRuntimeLog } from "./runtimeLogManager";
import {
  type PluginSkillRegistrySnapshot,
  scanPluginSkillRegistry,
} from "./pluginSkillRegistry";
import {
  buildAcpSkillInjectionPlan,
  type AcpSkillInjectionPlan,
} from "./acpAgentFamilyResolver";
import {
  buildAcpRuntimeDependencyPlan,
  type AcpRuntimeDependencyProbe,
} from "./acpRuntimeDependencyWrapper";
import { type HostBridgeCliRunInjection } from "./hostBridgeCliInjection";
import {
  createAcpSkillRunnerWorkspace,
  writeAcpSkillRunnerInputManifest,
  type AcpSkillRunnerWorkspace,
} from "./acpSkillRunnerWorkspace";
import {
  materializeAcpSkill,
  type AcpSkillMaterializationResult,
} from "./acpSkillMaterializer";
import { registerBackgroundRefreshTimer } from "./backgroundRefreshGovernance";
import {
  getAssistantExecutionDisplayMode,
  isAssistantSilentExecutionMode,
  subscribeAssistantExecutionDisplayMode,
} from "./assistantExecutionDisplayPolicy";
import { isDebugModeEnabled } from "./debugMode";
import {
  observeAcpRuntimeGauge,
  startAcpRuntimeProfile,
} from "./acpRuntimePerformanceProfiler";
import { recordAcpRuntimeSemanticTraceEvent } from "./acpRuntimeSemanticTraceRecorder";
import { normalizeAcpSkillRuntimeSelection } from "./acpSessionConfigOptions";
import { materializeAcpRunExecutionInstructions } from "./acpSkillRunPromptBuilder";
import {
  buildAcpSkillOutputRepairPrompt,
  validateAcpSkillFinalPayload,
} from "./acpSkillOutputValidator";
import {
  convergeAcpSkillTurnOutput,
  writeAcpSkillRunnerResultEnvelope,
  type AcpSkillOutputConvergenceResult,
} from "./acpSkillOutputConvergence";
import { validateAcpSkillRunRequestAgainstSchemas } from "./acpSkillSchemaAssets";
import { resolveAcpSkillResultFileFallback } from "./acpSkillResultFileFallback";
import {
  createAcpConnectionAdapter,
  type AcpConnectionAdapter,
  type AcpPromptBackendError,
} from "./acpConnectionAdapter";
import {
  appendAcpSkillRunUserReply,
  appendAcpSkillRunHardTimeoutTranscriptNotice,
  completeAcpSkillRunTranscriptTurnBoundary,
  getAcpSkillRunRecord,
  projectAcpSkillRunOutputEnvelopeToTranscript,
  recordAcpSkillRunOutputRevision,
  recordAcpSkillRunSessionUpdate,
  setAcpSkillRunRecoveryHandler,
  type AcpSkillRunSetupController,
  type AcpSkillRunStatus,
  upsertAcpSkillRun,
} from "./acpSkillRunStore";
import { type AcpSkillRunForegroundDeps } from "./acpSkillRunForeground";
import {
  appendAcpSkillRunAuditEvent,
  appendAcpSkillRunTransportAuditEvent,
  appendAcpSkillRunAuditUpdate,
  initializeAcpSkillRunAuditTrail,
  shouldWriteDetailedAcpAuditArtifacts,
  writeAcpSkillRunAuditFinalState,
  writeAcpSkillRunAuditRuntimeLogs,
  writeAcpSkillRunAuditStderrTail,
} from "./acpSkillRunAuditTrail";
import {
  BoundedWaitError,
  createCancellationController,
  waitForBoundedPromise,
  watchPromiseSettlement,
  type BoundedWaitStartupOptions,
  type PromiseSettlementWatchdog,
} from "../utils/wait";

const ACP_SKILL_STARTUP_PHASE_TIMEOUT_MS = 60_000;
import {
  CONFIRMED_ACP_SKILL_PROMPT_INTERRUPTION_STATE,
  DEFAULT_ACP_PROMPT_INTERRUPT_GRACE_MS,
  applyAcpSkillRunRuntimeSelection,
  appendAcpSkillOutputValidationFailureRuntimeLog,
  assertAcpSkillRunRequest,
  buildAcpSkillOutputValidationFailureDetails,
  buildRunPrompt,
  createAcpHardTimeoutMonitor,
  errorMessage,
  findWorkspaceActivitySnapshot,
  handleAcpSkillRunPermissionRequest,
  isObservableAcpPromptOutputUpdateKind,
  markAcpSkillRunContinuationRunning,
  prepareAcpSkillRunHostBridgeCli,
  readRunnerJsonForExecutionMode,
  recordAcpSkillRunAdapterDiagnostic,
  refreshAcpSkillRunRuntimeCatalogFromSession,
  rememberAcpSkillRunRuntimeCatalog,
  resolveAcpProfileZoteroMajor,
  resolveAcpSkillRunEffectiveRuntimeOptions,
  resolveExecutionMode,
  resolveJobId,
  resolveRequiredMcpTools,
  resolveWorkflowWorkspaceIntent,
  waitForAcpHardTimeoutTranscriptDrain,
  wrapAcpSkillRunPermissionRequestForTimeoutPause,
  type AcpRequiredMcpPreflightProbe,
} from "./acpSkillRunExecutionSupport";
import {
  configureAcpSkillRunRecoveryHost,
  continueRecoveredSequenceStep,
  recoverAcpSkillRunConversation,
  resolveRecoveredWorkflowIdFromTask,
  resolveWorkflowSkillName,
} from "./acpSkillRunRecovery";
import { isRecoverablePromptFailure } from "./acpSkillRunStatus";
import {
  registerAcpSkillRunController,
  registerAcpSkillRunSetupController,
  unregisterAcpSkillRunController,
  unregisterAcpSkillRunSetupController,
} from "./acpSkillRunControllerRegistry";
import { resolveAcpSkillRunPermissionRequest } from "./acpSkillRunPermissionQueue";

export {
  reapplyAcpSkillRunResult,
  recoverAcpSkillRunConversation,
} from "./acpSkillRunRecovery";
export {
  resolveAcpSkillRunEffectiveRuntimeOptions,
  type AcpRequiredMcpPreflightProbe,
  type AcpSkillRunEffectiveRuntimeOptions,
} from "./acpSkillRunExecutionSupport";

export type AcpSkillRunnerExecutionSnapshot = {
  requestId: string;
  status:
    | "queued"
    | "running"
    | "waiting_user"
    | "repairing"
    | "succeeded"
    | "failed"
    | "canceled";
  workspaceDir: string;
  skillId: string;
  repairRounds: number;
  injectionPlan: AcpSkillInjectionPlan;
};

export type AcpSkillRunnerRunContext = {
  request: AcpSkillRunRequestV1;
  backend: BackendInstance;
  workspace: AcpSkillRunnerWorkspace;
  materialization: AcpSkillMaterializationResult;
  injectionPlan: AcpSkillInjectionPlan;
  inputContext: Record<string, unknown>;
  parameterContext: Record<string, unknown>;
};

export type AcpSkillRunnerDependencies = {
  scanRegistry?: () => Promise<PluginSkillRegistrySnapshot>;
  createWorkspace?: typeof createAcpSkillRunnerWorkspace;
  createAdapter?: typeof createAcpConnectionAdapter;
  dependencyProbe?: AcpRuntimeDependencyProbe;
  mcpPreflight?: AcpRequiredMcpPreflightProbe;
  hostBridgeCliInjection?: (args: {
    workspaceDir: string;
    requestId: string;
    autoApproveWrites?: boolean;
  }) => Promise<HostBridgeCliRunInjection>;
  acpSkillRunForeground?: Partial<AcpSkillRunForegroundDeps>;
  maxRepairRounds?: number;
  sharedSkillCatalogRootDir?: string;
  promptInterruptGraceMs?: number;
};

export type AcpPromptOutcome = {
  sessionId: string;
  stopReason: string;
  assistantText: string;
  observedAcpActivity: boolean;
  standardAssistantTextSeen?: boolean;
  backendError?: AcpPromptBackendError;
};

export type AcpPromptFailureDiagnostic = {
  stage: "acp-prompt-no-output" | "acp-prompt-stopped" | "acp-prompt-failed";
  message: string;
  error: string;
  details: Record<string, unknown>;
};

export class AcpPromptFailureError extends Error {
  readonly diagnostic: AcpPromptFailureDiagnostic;

  constructor(diagnostic: AcpPromptFailureDiagnostic) {
    super(diagnostic.error);
    this.name = "AcpPromptFailureError";
    this.diagnostic = diagnostic;
  }
}

function normalizeString(value: unknown) {
  return String(value || "").trim();
}

export function createAssistantTurnAccumulator(requestId?: string) {
  let chunks: string[] = [];
  let bytes = 0;
  return {
    async reset() {
      chunks = [];
      bytes = 0;
      if (
        __acp_runtime_performance_profiler_enabled__ &&
        (typeof __debug_mode__ === "undefined"
          ? isDebugModeEnabled()
          : __debug_mode__)
      ) {
        observeAcpRuntimeGauge(
          requestId,
          "assistant_accumulator_chunks",
          {},
          0,
        );
        observeAcpRuntimeGauge(requestId, "assistant_accumulator_bytes", {}, 0);
      }
    },
    append(text: unknown) {
      const chunk = String(text || "");
      if (!chunk) {
        return;
      }
      chunks.push(chunk);
      if (
        __acp_runtime_performance_profiler_enabled__ &&
        (typeof __debug_mode__ === "undefined"
          ? isDebugModeEnabled()
          : __debug_mode__)
      ) {
        bytes += new TextEncoder().encode(chunk).byteLength;
        observeAcpRuntimeGauge(
          requestId,
          "assistant_accumulator_chunks",
          {},
          chunks.length,
        );
        observeAcpRuntimeGauge(
          requestId,
          "assistant_accumulator_bytes",
          {},
          bytes,
        );
      }
    },
    async read() {
      return chunks.join("");
    },
  };
}

function isProtocolPromptStop(stopReasonRaw: string) {
  const stopReason = normalizeString(stopReasonRaw);
  return (
    stopReason === "refusal" ||
    stopReason === "max_tokens" ||
    stopReason === "max_turn_requests" ||
    stopReason === "cancelled"
  );
}

export function classifyAcpPromptFailure(
  outcome: AcpPromptOutcome,
): AcpPromptFailureDiagnostic | null {
  if (outcome.backendError?.message) {
    const hasAssistantCandidate =
      !!normalizeString(outcome.assistantText) ||
      outcome.standardAssistantTextSeen === true;
    if (
      outcome.backendError.source === "session_update" &&
      hasAssistantCandidate
    ) {
      return null;
    }
    return {
      stage: "acp-prompt-failed",
      message:
        "ACP backend returned a prompt error before workflow output validation.",
      error: outcome.backendError.message,
      details: {
        errorName: outcome.backendError.name,
        code: outcome.backendError.code,
        data: outcome.backendError.data,
        source: outcome.backendError.source,
      },
    };
  }
  const stopReason = normalizeString(outcome.stopReason);
  if (isProtocolPromptStop(stopReason)) {
    return {
      stage: "acp-prompt-stopped",
      message:
        "ACP backend stopped the prompt before producing a valid workflow output.",
      error: `ACP prompt stopped with ${stopReason}. Check backend authentication, model availability, quota, or retry the run.`,
      details: {
        stopReason,
      },
    };
  }
  if (
    stopReason === "end_turn" &&
    !normalizeString(outcome.assistantText) &&
    !outcome.observedAcpActivity
  ) {
    return {
      stage: "acp-prompt-no-output",
      message:
        "ACP backend ended the prompt without returning observable ACP output for validation.",
      error:
        "ACP prompt ended without observable output. Check backend authentication, model availability, quota, or retry the run.",
      details: {
        stopReason,
      },
    };
  }
  return null;
}

export function classifyAcpPromptError(
  error: unknown,
): AcpPromptFailureDiagnostic {
  const message = errorMessage(error);
  const maybeRequestError = error as {
    code?: unknown;
    data?: unknown;
    name?: unknown;
  };
  return {
    stage: "acp-prompt-failed",
    message:
      "ACP backend returned a prompt error before workflow output validation.",
    error: message,
    details: {
      errorName: normalizeString(maybeRequestError.name),
      code:
        typeof maybeRequestError.code === "number"
          ? maybeRequestError.code
          : undefined,
      data: maybeRequestError.data,
    },
  };
}

export async function runPrompt(args: {
  adapter: AcpConnectionAdapter;
  backend?: BackendInstance;
  requestId: string;
  message: string;
  sessionId?: string;
  prepareSession?: (sessionId: string) => Promise<void>;
  onPromptReady?: (sessionId: string) => void | Promise<void>;
  startup?: BoundedWaitStartupOptions;
}): Promise<{
  sessionId: string;
  stopReason: string;
  assistantText?: string;
  observedAcpActivity?: boolean;
  standardAssistantTextSeen?: boolean;
  backendError?: AcpPromptBackendError;
}> {
  let sessionId = String(args.sessionId || "").trim();
  if (!sessionId) {
    const startup = {
      timeoutMs: args.startup?.timeoutMs ?? ACP_SKILL_STARTUP_PHASE_TIMEOUT_MS,
      signal: args.startup?.signal,
    };
    await waitForBoundedPromise(args.adapter.initialize(), {
      phase: "acp-initialize",
      ...startup,
    });
    const transportLifecycle =
      args.adapter.getTransportSnapshot?.()?.transportLifecycle;
    await recordAcpSkillRunnerSetupStage({
      requestId: args.requestId,
      runtimeDir: getAcpSkillRunRecord(args.requestId)?.runtimeDir,
      stage: "transport-spawned",
      message: "ACP transport ownership is available for this run.",
      details: transportLifecycle
        ? {
            transportKind: transportLifecycle.transportKind,
            spawnId: transportLifecycle.spawnId,
            bridgePid: transportLifecycle.bridgePid,
            childPid: transportLifecycle.childPid,
          }
        : undefined,
    });
    const session = await waitForBoundedPromise(args.adapter.newSession(), {
      phase: "acp-session-new",
      ...startup,
    });
    sessionId = session.sessionId;
    refreshAcpSkillRunRuntimeCatalogFromSession({
      requestId: args.requestId,
      backend: args.backend,
      session,
    });
    upsertAcpSkillRun({
      requestId: args.requestId,
      sessionId,
      conversationState: "active",
      activePrompt: true,
      promptInterruptState: "idle",
      event: {
        stage: "acp-session-created",
        message: "ACP task session created.",
        level: "info",
        details: {
          sessionId,
          submissionId: getAcpSkillRunRecord(args.requestId)?.submissionId,
          submissionUnitId: getAcpSkillRunRecord(args.requestId)
            ?.submissionUnitId,
        },
      },
    });
    await recordAcpSkillRunnerSetupStage({
      requestId: args.requestId,
      runtimeDir: getAcpSkillRunRecord(args.requestId)?.runtimeDir,
      stage: "acp-initialized",
      message: "ACP protocol initialization completed.",
    });
    await recordAcpSkillRunnerSetupStage({
      requestId: args.requestId,
      runtimeDir: getAcpSkillRunRecord(args.requestId)?.runtimeDir,
      stage: "acp-session-created",
      message: "ACP task session created.",
      details: { sessionId },
      projectRunEvent: false,
    });
    await waitForBoundedPromise(
      applyAcpSkillRunRuntimeSelection({
        adapter: args.adapter,
        backend: args.backend,
        requestId: args.requestId,
        sessionId,
        sessionCurrentModelId: session.models?.currentModelId || "",
      }),
      {
        phase: "acp-runtime-configuration",
        ...startup,
      },
    );
  } else {
    upsertAcpSkillRun({
      requestId: args.requestId,
      sessionId,
      conversationState: "active",
      activePrompt: true,
      promptInterruptState: "idle",
    });
  }
  if (args.prepareSession) {
    await args.prepareSession(sessionId);
    upsertAcpSkillRun({
      requestId: args.requestId,
      sessionId,
      conversationState: "active",
      activePrompt: true,
      promptInterruptState: "idle",
    });
  }
  await args.onPromptReady?.(sessionId);
  if (args.startup?.signal?.aborted) {
    throw new BoundedWaitError({
      kind: "canceled",
      phase: "acp-prompt-ready",
    });
  }
  await recordAcpSkillRunnerSetupStage({
    requestId: args.requestId,
    runtimeDir: getAcpSkillRunRecord(args.requestId)?.runtimeDir,
    stage: "prompt-started",
    message: "ACP prompt is ready to start.",
    details: { sessionId },
  });
  const response = await args.adapter.prompt({
    sessionId,
    message: args.message,
  });
  const stopReason = String(response.stopReason || "").trim();
  upsertAcpSkillRun({
    requestId: args.requestId,
    sessionId,
    conversationState: "active",
    activePrompt: false,
    lastPromptStopReason: stopReason,
    event: {
      stage: "acp-prompt-finished",
      message: "ACP prompt finished.",
      level: "info",
      details: {
        stopReason,
      },
    },
  });
  return {
    sessionId,
    stopReason,
    observedAcpActivity: response.observedAcpActivity,
    standardAssistantTextSeen: response.standardAssistantTextSeen,
    backendError: response.backendError,
  };
}

configureAcpSkillRunRecoveryHost({
  runPrompt,
  classifyAcpPromptFailure,
  classifyAcpPromptError,
  AcpPromptFailureError,
  createAssistantTurnAccumulator,
  executeAcpSkillRunnerJob,
});

type AcpSkillRunnerSetupStage =
  | "workspace-created"
  | "registry-ready"
  | "skill-materialized"
  | "host-bridge-cli-ready"
  | "runtime-dependencies-resolved"
  | "adapter-created"
  | "transport-spawned"
  | "acp-initialized"
  | "acp-session-created"
  | "prompt-started";

async function recordAcpSkillRunnerSetupStage(args: {
  requestId: string;
  runtimeDir?: string;
  stage: AcpSkillRunnerSetupStage;
  message: string;
  details?: Record<string, unknown>;
  projectRunEvent?: boolean;
}) {
  const record = getAcpSkillRunRecord(args.requestId);
  const details = {
    submissionId: record?.submissionId,
    submissionUnitId: record?.submissionUnitId,
    ...args.details,
  };
  if (args.projectRunEvent !== false) {
    upsertAcpSkillRun({
      requestId: args.requestId,
      event: {
        stage: args.stage,
        message: args.message,
        level: "info",
        details,
      },
    });
  }
  await appendAcpSkillRunAuditEvent({
    requestId: args.requestId,
    runtimeDir: args.runtimeDir,
    event: {
      ts: new Date().toISOString(),
      stage: args.stage,
      message: args.message,
      level: "info",
      details,
    },
  });
}

export async function executeAcpSkillRunnerJob(args: {
  requestKind: string;
  request: unknown;
  backend: BackendInstance;
  providerOptions?: Record<string, unknown>;
  onProgress?: (event: ProviderProgressEvent) => void;
  orchestrationContext?: ProviderOrchestrationContext;
  dependencies?: AcpSkillRunnerDependencies;
}): Promise<ProviderExecutionResult> {
  const request = assertAcpSkillRunRequest(args.request);
  let cancellationRequested = false;
  const setupAbortController = createCancellationController();
  let setupAdapter: AcpConnectionAdapter | undefined;
  const workspaceFactory =
    args.dependencies?.createWorkspace || createAcpSkillRunnerWorkspace;
  const workflowId =
    normalizeString(args.orchestrationContext?.workflowId) ||
    normalizeString(request.parameter?.workflowId) ||
    request.skill_id;
  const workflowLabel =
    normalizeString(args.orchestrationContext?.workflowLabel) ||
    normalizeString(request.parameter?.workflowLabel);
  const jobId =
    normalizeString(args.orchestrationContext?.jobId) || resolveJobId(request);
  const runId = normalizeString(args.orchestrationContext?.workflowRunId);
  const workspace = await workspaceFactory({
    backendId: args.backend.id,
    skillId: request.skill_id,
    workflowId,
    jobId,
    workflowWorkspace: resolveWorkflowWorkspaceIntent(request),
  });
  const taskName = normalizeString(request.taskName) || resolveJobId(request);
  const submittedRuntimeSelection = normalizeAcpSkillRuntimeSelection({
    options: args.providerOptions,
    cache: args.backend.acp?.runtimeOptionsCache,
  });
  const auditTrail = await initializeAcpSkillRunAuditTrail({
    workspace,
    backend: args.backend,
    request,
    providerOptions: args.providerOptions,
  });
  upsertAcpSkillRun({
    requestId: workspace.requestId,
    status: "queued",
    statusReason: "create",
    backendId: args.backend.id,
    backendType: args.backend.type,
    backendLabel: normalizeString(args.backend.displayName) || args.backend.id,
    workflowId,
    workflowLabel,
    runId,
    jobId,
    submissionId: args.orchestrationContext?.submissionId,
    submissionUnitId: args.orchestrationContext?.submissionUnitId,
    sequenceStepId: args.orchestrationContext?.sequenceStepId,
    sequenceFinalStepId: args.orchestrationContext?.finalStepId,
    taskName,
    skillId: request.skill_id,
    requestPayload: request,
    providerOptions: args.providerOptions || {},
    workspaceDir: workspace.workspaceDir,
    runtimeDir: workspace.runtimeDir,
    inputManifestPath: workspace.inputManifestPath,
    resultJsonPath: workspace.resultJsonPath,
    auditTrail,
    acpModeId: submittedRuntimeSelection.modeId,
    acpModelId: submittedRuntimeSelection.modelId,
    acpModelProvider: normalizeString(args.providerOptions?.acpModelProvider),
    acpReasoningEffort: submittedRuntimeSelection.reasoningEffort,
    acpRawModelId: submittedRuntimeSelection.rawModelId,
    event: {
      stage: "workspace-created",
      message: "ACP skill run workspace created.",
      level: "info",
      details: {
        workspaceDir: workspace.workspaceDir,
        submissionId: args.orchestrationContext?.submissionId,
        submissionUnitId: args.orchestrationContext?.submissionUnitId,
      },
    },
  });
  const setupController: AcpSkillRunSetupController = {
    cancel: async () => {
      cancellationRequested = true;
      setupAbortController.abort();
      void setupAdapter?.close().catch(() => undefined);
      upsertAcpSkillRun({
        requestId: workspace.requestId,
        event: {
          stage: "cancel-requested",
          message: "ACP skill run setup cancellation requested.",
          level: "warn",
        },
      });
    },
  };
  registerAcpSkillRunSetupController(workspace.requestId, setupController);
  args.onProgress?.({
    type: "request-created",
    requestId: workspace.requestId,
  });
  const settleSetupCancellation = async (
    adapter?: AcpConnectionAdapter,
  ): Promise<ProviderExecutionResult> => {
    if (adapter) {
      void adapter.close().catch(() => undefined);
    }
    unregisterAcpSkillRunSetupController(workspace.requestId, setupController);
    upsertAcpSkillRun({
      requestId: workspace.requestId,
      status: "canceled",
      statusReason: "cancel_task",
      activePrompt: false,
      conversationState: "ended",
      conversationRecoveryState: "unavailable",
      connectionActionState: "idle",
      event: {
        stage: "setup-canceled",
        message: "ACP skill run canceled during setup.",
        level: "warn",
      },
    });
    await writeAcpSkillRunAuditFinalState({
      requestId: workspace.requestId,
      runtimeDir: workspace.runtimeDir,
      record: getAcpSkillRunRecord(workspace.requestId),
      status: "canceled",
    }).catch(() => undefined);
    return {
      status: "canceled",
      requestId: workspace.requestId,
      fetchType: "result",
      responseJson: {
        provider: "acp",
        requestId: workspace.requestId,
        status: "canceled",
      },
    };
  };
  const settleIfSetupCanceled = async (adapter?: AcpConnectionAdapter) =>
    cancellationRequested ? settleSetupCancellation(adapter) : null;
  if (
    __acp_runtime_performance_profiler_enabled__ &&
    (typeof __debug_mode__ === "undefined"
      ? isDebugModeEnabled()
      : __debug_mode__)
  ) {
    startAcpRuntimeProfile({
      requestId: workspace.requestId,
      displayMode: getAssistantExecutionDisplayMode(),
      transport: "unknown",
      zoteroMajor: resolveAcpProfileZoteroMajor(),
    });
  }
  await appendAcpSkillRunAuditEvent({
    requestId: workspace.requestId,
    runtimeDir: workspace.runtimeDir,
    event: {
      ts: new Date().toISOString(),
      stage: "workspace-created",
      message: "ACP skill run workspace created.",
      level: "info",
      details: {
        workspaceDir: workspace.workspaceDir,
        submissionId: args.orchestrationContext?.submissionId,
        submissionUnitId: args.orchestrationContext?.submissionUnitId,
      },
    },
  });
  const canceledAfterWorkspace = await settleIfSetupCanceled();
  if (canceledAfterWorkspace) {
    return canceledAfterWorkspace;
  }
  rememberAcpSkillRunRuntimeCatalog({
    requestId: workspace.requestId,
    backend: args.backend,
  });
  args.onProgress?.({
    type: "acp-skillrunner-stage",
    requestId: workspace.requestId,
    stage: "workspace-created",
    status: "queued",
  });
  appendRuntimeLog({
    level: "info",
    scope: "provider",
    backendId: args.backend.id,
    backendType: args.backend.type,
    providerId: "acp",
    requestId: workspace.requestId,
    component: "acp-skillrunner",
    operation: "execute",
    phase: "start",
    stage: "acp-skillrunner-start",
    message: "ACP SkillRunner-compatible run started",
    details: {
      skillId: request.skill_id,
      workspaceDir: workspace.workspaceDir,
    },
  });
  const workflowTraceContext =
    __acp_runtime_semantic_trace_recorder_enabled__ &&
    (typeof __debug_mode__ === "undefined"
      ? isDebugModeEnabled()
      : __debug_mode__)
      ? args.orchestrationContext?.semanticTraceContext
      : undefined;
  const workflowTraceOwner = workflowTraceContext
    ? {
        rootId: workflowTraceContext.rootId,
        workflowId: workflowId || undefined,
        workflowRunId:
          args.orchestrationContext?.parentWorkflowRunId ||
          workflowTraceContext.rootId,
        jobId: jobId || undefined,
        stageId: args.orchestrationContext?.sequenceStepId || undefined,
        requestId: workspace.requestId,
      }
    : undefined;
  if (
    (typeof __debug_mode__ === "undefined"
      ? isDebugModeEnabled()
      : __debug_mode__) &&
    __acp_runtime_semantic_trace_recorder_enabled__ &&
    workflowTraceContext &&
    workflowTraceOwner
  ) {
    await recordAcpRuntimeSemanticTraceEvent(workflowTraceContext, {
      kind: "request-start",
      sourceKind: "acp-workflow-execution",
      owner: workflowTraceOwner,
      payload: { skillId: request.skill_id },
    });
  }

  await writeAcpSkillRunnerInputManifest({
    workspace,
    request,
  });
  const canceledAfterManifest = await settleIfSetupCanceled();
  if (canceledAfterManifest) {
    return canceledAfterManifest;
  }
  upsertAcpSkillRun({
    requestId: workspace.requestId,
    status: "running",
    statusReason: "start",
    event: {
      stage: "input-manifest-written",
      message: "Input manifest written.",
      level: "info",
    },
  });

  const registry = args.dependencies?.scanRegistry
    ? await args.dependencies.scanRegistry()
    : await scanPluginSkillRegistry();
  const canceledAfterRegistry = await settleIfSetupCanceled();
  if (canceledAfterRegistry) {
    return canceledAfterRegistry;
  }
  await recordAcpSkillRunnerSetupStage({
    requestId: workspace.requestId,
    runtimeDir: workspace.runtimeDir,
    stage: "registry-ready",
    message: "ACP skill registry is ready.",
  });
  const skill = registry.entriesById[request.skill_id];
  if (!skill) {
    upsertAcpSkillRun({
      requestId: workspace.requestId,
      status: "failed",
      statusReason: "prompt_failed_terminal",
      error: `Plugin-side skill not found: ${request.skill_id}`,
      event: {
        stage: "skill-not-found",
        message: `Plugin-side skill not found: ${request.skill_id}`,
        level: "error",
        details: {
          submissionId: args.orchestrationContext?.submissionId,
          submissionUnitId: args.orchestrationContext?.submissionUnitId,
        },
      },
    });
    throw new Error(`Plugin-side skill not found: ${request.skill_id}`);
  }

  const injectionPlan = buildAcpSkillInjectionPlan({
    backend: args.backend,
    workspaceDir: workspace.workspaceDir,
  });
  upsertAcpSkillRun({
    requestId: workspace.requestId,
    skillName: resolveWorkflowSkillName({
      workflowId,
      skillId: skill.skillId,
      rawFallback: skill.skillName,
    }),
    agentFamily: injectionPlan.family,
    skillRoots: injectionPlan.skillRoots,
    event: {
      stage: "skill-injection-planned",
      message: "ACP agent skill injection roots resolved.",
      level: "info",
      details: {
        family: injectionPlan.family,
        skillRoots: injectionPlan.skillRoots,
      },
    },
  });
  const runnerJsonForExecutionMode = await readRunnerJsonForExecutionMode(
    skill.runnerJsonPath,
  );
  const canceledAfterRunnerJson = await settleIfSetupCanceled();
  if (canceledAfterRunnerJson) {
    return canceledAfterRunnerJson;
  }
  const executionMode = resolveExecutionMode(
    request,
    runnerJsonForExecutionMode,
  );
  const materialization = await materializeAcpSkill({
    registry,
    requestedSkillId: skill.skillId,
    injectionPlan,
    workspaceDir: workspace.workspaceDir,
    resultJsonPath: workspace.resultJsonPath,
    inputManifestPath: workspace.inputManifestPath,
    catalogRootDir: args.dependencies?.sharedSkillCatalogRootDir,
    executionMode,
    collectSkillRunFeedback:
      request.runtime_options?.collect_skill_run_feedback === true,
  });
  const canceledAfterMaterialization = await settleIfSetupCanceled();
  if (canceledAfterMaterialization) {
    return canceledAfterMaterialization;
  }
  upsertAcpSkillRun({
    requestId: workspace.requestId,
    sharedSkillCatalogPath: materialization.sharedSkillCatalogPath,
    proxySkillCount: materialization.proxySkillCount,
    proxySkillRoots: materialization.proxySkillRoots,
    requestedSkillId: materialization.skillId,
    requestedSkillProxyPath: materialization.requestedSkillProxyPath,
    resourceRewriteWarnings: materialization.resourceRewriteWarnings,
    event: {
      stage: "skill-materialized",
      message: "Shared skill catalog and thin proxy skills materialized.",
      level: "info",
      details: {
        materializedDirs: materialization.materializedDirs,
        sharedSkillCatalogPath: materialization.sharedSkillCatalogPath,
        proxySkillCount: materialization.proxySkillCount,
        requestedSkillProxyPath: materialization.requestedSkillProxyPath,
        resourceRewriteWarnings: materialization.resourceRewriteWarnings,
        submissionId: args.orchestrationContext?.submissionId,
        submissionUnitId: args.orchestrationContext?.submissionUnitId,
      },
    },
  });
  upsertAcpSkillRun({
    requestId: workspace.requestId,
    executionMode,
    primarySkillDir: materialization.primarySkillDir,
    runnerJson: materialization.runnerJson,
  });
  await recordAcpSkillRunnerSetupStage({
    requestId: workspace.requestId,
    runtimeDir: workspace.runtimeDir,
    stage: "skill-materialized",
    message: "ACP skill materialization is ready.",
    details: {
      proxySkillCount: materialization.proxySkillCount,
    },
    projectRunEvent: false,
  });
  const effectiveRuntimeOptions = resolveAcpSkillRunEffectiveRuntimeOptions({
    request,
    runnerJson: materialization.runnerJson,
    providerOptions: args.providerOptions,
  });
  const requestValidation = await validateAcpSkillRunRequestAgainstSchemas({
    request,
    runnerJson: materialization.runnerJson,
    skillDir: materialization.primarySkillDir,
    workspaceDir: workspace.workspaceDir,
  });
  const canceledAfterValidation = await settleIfSetupCanceled();
  if (canceledAfterValidation) {
    return canceledAfterValidation;
  }
  upsertAcpSkillRun({
    requestId: workspace.requestId,
    event: {
      stage: requestValidation.ok
        ? "request-schema-validation-succeeded"
        : "request-schema-validation-failed",
      message: requestValidation.ok
        ? "ACP skill request schema validation succeeded."
        : "ACP skill request schema validation failed.",
      level: requestValidation.ok ? "info" : "error",
      details: {
        errors: requestValidation.errors,
        inputSchemaPath: requestValidation.inputSchemaPath,
        parameterSchemaPath: requestValidation.parameterSchemaPath,
      },
    },
  });
  if (!requestValidation.ok) {
    upsertAcpSkillRun({
      requestId: workspace.requestId,
      status: "failed",
      statusReason: "prompt_failed_terminal",
      activePrompt: false,
      error: `ACP skill request validation failed: ${requestValidation.errors.join("; ")}`,
    });
    throw new Error(
      `ACP skill request validation failed: ${requestValidation.errors.join("; ")}`,
    );
  }
  const hostBridgePreparation = await prepareAcpSkillRunHostBridgeCli({
    requestId: workspace.requestId,
    workspaceDir: workspace.workspaceDir,
    request,
    runnerJson: materialization.runnerJson,
    backend: args.backend,
    dependencies: args.dependencies,
  });
  const canceledAfterHostBridge = await settleIfSetupCanceled();
  if (canceledAfterHostBridge) {
    return canceledAfterHostBridge;
  }
  const { hostBridgeCliInjection, hostBridgeCliState, zoteroHostAccess } =
    hostBridgePreparation;
  upsertAcpSkillRun({
    requestId: workspace.requestId,
    hostBridgeCli: hostBridgeCliState,
    event: hostBridgePreparation.event,
  });
  await recordAcpSkillRunnerSetupStage({
    requestId: workspace.requestId,
    runtimeDir: workspace.runtimeDir,
    stage: "host-bridge-cli-ready",
    message: "ACP skill Host Bridge CLI preparation settled.",
    details: {
      available: hostBridgeCliState.available,
      required: zoteroHostAccess.required,
    },
  });
  const canceledAfterHostBridgeAudit = await settleIfSetupCanceled();
  if (canceledAfterHostBridgeAudit) {
    return canceledAfterHostBridgeAudit;
  }
  const dependencyPlan = await buildAcpRuntimeDependencyPlan({
    backend: hostBridgePreparation.backend,
    runnerJson: materialization.runnerJson,
    cwd: workspace.workspaceDir,
    mode: "probe-and-wrap",
    probe: args.dependencies?.dependencyProbe,
  });
  const canceledAfterDependencies = await settleIfSetupCanceled();
  if (canceledAfterDependencies) {
    return canceledAfterDependencies;
  }
  upsertAcpSkillRun({
    requestId: workspace.requestId,
    runtimeDependencies: dependencyPlan.dependencies,
    runtimeDependencyStatus:
      dependencyPlan.diagnostic?.level === "error"
        ? "failed"
        : dependencyPlan.wrapperMode === "disabled" &&
            dependencyPlan.dependencies.length > 0
          ? "disabled"
          : dependencyPlan.dependencies.length > 0
            ? "ready"
            : "not-required",
    runtimeDependencyError:
      dependencyPlan.diagnostic?.level === "error"
        ? dependencyPlan.diagnostic.message
        : undefined,
    event: {
      stage: "runtime-dependencies-resolved",
      message:
        dependencyPlan.diagnostic?.message ||
        (dependencyPlan.dependencies.length > 0
          ? "Runtime dependencies detected."
          : "No runtime dependency wrapper required."),
      level:
        dependencyPlan.diagnostic?.level === "error"
          ? "error"
          : dependencyPlan.diagnostic?.level === "warning"
            ? "warn"
            : "info",
      details: {
        dependencies: dependencyPlan.dependencies,
        diagnostic: dependencyPlan.diagnostic,
        wrapperMode: dependencyPlan.wrapperMode,
        submissionId: args.orchestrationContext?.submissionId,
        submissionUnitId: args.orchestrationContext?.submissionUnitId,
      },
    },
  });
  await recordAcpSkillRunnerSetupStage({
    requestId: workspace.requestId,
    runtimeDir: workspace.runtimeDir,
    stage: "runtime-dependencies-resolved",
    message: "ACP skill runtime dependencies are resolved.",
    details: {
      dependencyCount: dependencyPlan.dependencies.length,
      wrapperMode: dependencyPlan.wrapperMode,
    },
    projectRunEvent: false,
  });
  const canceledAfterDependencyAudit = await settleIfSetupCanceled();
  if (canceledAfterDependencyAudit) {
    return canceledAfterDependencyAudit;
  }
  if (dependencyPlan.diagnostic?.level === "error") {
    upsertAcpSkillRun({
      requestId: workspace.requestId,
      status: "failed",
      statusReason: "prompt_failed_terminal",
      activePrompt: false,
      error: `${dependencyPlan.diagnostic.code}: ${dependencyPlan.diagnostic.message}`,
    });
    throw new Error(
      `${dependencyPlan.diagnostic.code}: ${dependencyPlan.diagnostic.message}`,
    );
  }

  const createAdapter =
    args.dependencies?.createAdapter || createAcpConnectionAdapter;
  const canceledBeforeAdapter = await settleIfSetupCanceled();
  if (canceledBeforeAdapter) {
    return canceledBeforeAdapter;
  }
  let adapter: AcpConnectionAdapter;
  try {
    const bridgeAuditFile = normalizeString(auditTrail.files.bridge);
    const detailedAuditEnabled = shouldWriteDetailedAcpAuditArtifacts();
    adapter = await createAdapter({
      backend: dependencyPlan.wrappedBackend,
      agentWorkspaceDir: workspace.workspaceDir,
      sessionCwd: workspace.workspaceDir,
      workspaceDir: workspace.workspaceDir,
      runtimeDir: workspace.runtimeDir,
      performanceProfileRequestId: workspace.requestId,
      startup: {
        signal: setupAbortController.signal,
        timeoutMs: ACP_SKILL_STARTUP_PHASE_TIMEOUT_MS,
      },
      ...(__acp_runtime_semantic_trace_recorder_enabled__ &&
      (typeof __debug_mode__ === "undefined"
        ? isDebugModeEnabled()
        : __debug_mode__) &&
      workflowTraceContext &&
      workflowTraceOwner
        ? {
            semanticTraceContext: {
              current: {
                context: workflowTraceContext,
                sourceKind: "acp-workflow-execution" as const,
                owner: workflowTraceOwner,
              },
            },
          }
        : {}),
      diagnosticCapture: detailedAuditEnabled
        ? {
            bridgeAuditFile,
            onAuditEvent: (event) =>
              appendAcpSkillRunTransportAuditEvent({
                requestId: workspace.requestId,
                runtimeDir: workspace.runtimeDir,
                event,
              }),
          }
        : undefined,
    });
    setupAdapter = adapter;
  } catch (error) {
    if (cancellationRequested) {
      return settleSetupCancellation();
    }
    const message =
      error instanceof Error ? error.message : String(error || "unknown error");
    upsertAcpSkillRun({
      requestId: workspace.requestId,
      status: "failed",
      statusReason: "prompt_failed_terminal",
      activePrompt: false,
      error: message,
      event: {
        stage: "acp-adapter-create-failed",
        message,
        level: "error",
      },
    });
    throw error;
  }
  const canceledAfterAdapter = await settleIfSetupCanceled(adapter);
  if (canceledAfterAdapter) {
    return canceledAfterAdapter;
  }
  await recordAcpSkillRunnerSetupStage({
    requestId: workspace.requestId,
    runtimeDir: workspace.runtimeDir,
    stage: "adapter-created",
    message: "ACP connection adapter is ready.",
  });
  const canceledAfterAdapterAudit = await settleIfSetupCanceled(adapter);
  if (canceledAfterAdapterAudit) {
    return canceledAfterAdapterAudit;
  }
  const requiredMcpTools = resolveRequiredMcpTools({
    request,
    runnerJson: materialization.runnerJson,
  });
  upsertAcpSkillRun({
    requestId: workspace.requestId,
    event: {
      stage: "host-access-mode",
      message: zoteroHostAccess.required
        ? hostBridgeCliInjection.available
          ? "Host access uses Host Bridge CLI guidance; MCP compatibility is disabled by default."
          : "Host Bridge CLI is unavailable for this run; MCP fallback is disabled by default."
        : "Zotero host access is disabled for this run.",
      level: zoteroHostAccess.required
        ? hostBridgeCliInjection.available
          ? "info"
          : "warn"
        : "info",
      details: {
        primary: zoteroHostAccess.required ? "host_bridge_cli" : "none",
        status: zoteroHostAccess.required
          ? hostBridgeCliInjection.available
            ? "ready"
            : "unavailable"
          : "disabled",
        zoteroHostAccess,
        mcpCompatibility: "disabled_by_default",
        requiredMcpTools,
      },
    },
  });
  let liveSessionId = "";
  let keepConversationAlive = false;
  let cleanupDone = false;
  let interruptionRequested = false;
  let interruptionForced = false;
  let disconnectRequested = false;
  let promptChain = Promise.resolve();
  let captureAssistantText = false;
  let currentTurnObservedAcpActivity = false;
  let workspaceActivityTimer: ReturnType<typeof setInterval> | null = null;
  let workspaceActivitySignature = "";
  let workspaceActivityScanRunning = false;
  let workspaceActivityPromptActive = false;
  let unsubscribeExecutionDisplayMode: () => void = () => undefined;
  let pendingReplyResolver: ((message: string) => void) | null = null;
  let pendingReplyRejecter: ((error: Error) => void) | null = null;
  let unsubscribePermission: () => void = () => undefined;
  let unsubscribeUpdate: () => void = () => undefined;
  let unsubscribeDiagnostics: () => void = () => undefined;
  let unsubscribeClose: () => void = () => undefined;
  let hardTimeoutMonitor: ReturnType<
    typeof createAcpHardTimeoutMonitor
  > | null = null;
  const pendingPermissionPauseIds = new Set<string>();
  let promoteLiveController: ((sessionId: string) => Promise<void>) | null =
    null;
  let liveControllerPromoted = false;
  let autoHardTimeoutStarted = false;
  let activePromptTimeoutDrain: Promise<unknown> | null = null;
  let interruptWatchdog: PromiseSettlementWatchdog | null = null;
  const clearInterruptWatchdog = () => {
    interruptWatchdog?.clear();
    interruptWatchdog = null;
  };
  const assistantTurnAccumulator = createAssistantTurnAccumulator(
    workspace.requestId,
  );
  const cleanupLiveSession = async (options?: {
    closeAdapter?: boolean;
    conversationState?: "ended" | "closed" | "error";
    conversationError?: string;
  }) => {
    if (cleanupDone) {
      return;
    }
    cleanupDone = true;
    unsubscribePermission();
    unsubscribeUpdate();
    unsubscribeDiagnostics();
    unsubscribeClose();
    unsubscribeExecutionDisplayMode();
    hardTimeoutMonitor?.clear();
    clearInterruptWatchdog();
    if (workspaceActivityTimer) {
      clearInterval(workspaceActivityTimer);
      workspaceActivityTimer = null;
    }
    unregisterAcpSkillRunController(workspace.requestId, liveController);
    const latest = getAcpSkillRunRecord(workspace.requestId);
    const recoverableTerminalSession =
      !!normalizeString(latest?.sessionId) &&
      options?.conversationState !== "ended";
    upsertAcpSkillRun({
      requestId: workspace.requestId,
      activePrompt: false,
      conversationState: options?.conversationState,
      conversationRecoveryState:
        options?.conversationState === "ended" || !recoverableTerminalSession
          ? "unavailable"
          : "available",
      conversationError: options?.conversationError,
      connectionActionState: "idle",
    });
    if (options?.closeAdapter !== false) {
      await adapter.close();
    }
  };
  hardTimeoutMonitor = createAcpHardTimeoutMonitor({
    requestId: workspace.requestId,
    seconds: effectiveRuntimeOptions.hardTimeoutSeconds,
    source: effectiveRuntimeOptions.hardTimeoutSource,
    onTimeout: async () => {
      if (cleanupDone) {
        return;
      }
      disconnectRequested = true;
      if (pendingReplyRejecter) {
        pendingReplyRejecter(
          new Error("ACP skill run hard timeout disconnected the session."),
        );
        pendingReplyResolver = null;
        pendingReplyRejecter = null;
      }
      const current = upsertAcpSkillRun({
        requestId: workspace.requestId,
        event: {
          stage: "hard-timeout-disconnect-requested",
          message:
            "ACP skill run hard timeout reached; disconnecting local session.",
          level: "warn",
          details: {
            hardTimeoutSeconds: effectiveRuntimeOptions.hardTimeoutSeconds,
            hardTimeoutSource: effectiveRuntimeOptions.hardTimeoutSource,
          },
        },
      });
      appendRuntimeLog({
        level: "warn",
        scope: "provider",
        backendId: args.backend.id,
        backendType: args.backend.type,
        providerId: "acp",
        requestId: workspace.requestId,
        component: "acp-skillrunner",
        operation: "hard-timeout-disconnect",
        phase: "terminal",
        stage: "hard-timeout-disconnect-requested",
        message:
          "ACP skill run hard timeout reached; disconnecting local session.",
        details: {
          hardTimeoutSeconds: effectiveRuntimeOptions.hardTimeoutSeconds,
          hardTimeoutSource: effectiveRuntimeOptions.hardTimeoutSource,
        },
      });
      const sessionId = normalizeString(current.sessionId) || liveSessionId;
      if (sessionId) {
        await adapter.cancel({ sessionId }).catch((error) => {
          appendRuntimeLog({
            level: "warn",
            scope: "provider",
            backendId: args.backend.id,
            backendType: args.backend.type,
            providerId: "acp",
            requestId: workspace.requestId,
            component: "acp-skillrunner",
            operation: "hard-timeout-cancel",
            phase: "terminal",
            stage: "hard-timeout-cancel-failed",
            message: errorMessage(error),
          });
        });
      }
      await waitForAcpHardTimeoutTranscriptDrain(activePromptTimeoutDrain);
      completeAcpSkillRunTranscriptTurnBoundary(workspace.requestId);
      appendAcpSkillRunHardTimeoutTranscriptNotice({
        requestId: workspace.requestId,
        hardTimeoutSeconds: effectiveRuntimeOptions.hardTimeoutSeconds,
        hardTimeoutSource: effectiveRuntimeOptions.hardTimeoutSource,
      });
      await cleanupLiveSession({
        conversationState: "closed",
        closeAdapter: true,
      });
    },
  });
  const scanWorkspaceActivity = async () => {
    if (workspaceActivityScanRunning) {
      return;
    }
    workspaceActivityScanRunning = true;
    try {
      const snapshot = await findWorkspaceActivitySnapshot(
        workspace.workspaceDir,
      );
      if (!workspaceActivityPromptActive || isAssistantSilentExecutionMode()) {
        return;
      }
      if (!snapshot) {
        return;
      }
      if (!workspaceActivitySignature) {
        workspaceActivitySignature = snapshot.signature;
        return;
      }
      if (snapshot.signature === workspaceActivitySignature) {
        return;
      }
      workspaceActivitySignature = snapshot.signature;
      upsertAcpSkillRun({
        requestId: workspace.requestId,
        persistMode: "trailing",
        event: {
          stage: "workspace-activity",
          message: snapshot.relativePath,
          level: "info",
          details: {
            path: snapshot.path,
            relativePath: snapshot.relativePath,
          },
        },
      });
    } catch {
      // Activity hints are best-effort and must never affect prompt execution.
    } finally {
      workspaceActivityScanRunning = false;
    }
  };
  const startWorkspaceActivityHeartbeat = () => {
    if (
      workspaceActivityTimer ||
      !workspaceActivityPromptActive ||
      isAssistantSilentExecutionMode()
    ) {
      return;
    }
    void scanWorkspaceActivity();
    registerBackgroundRefreshTimer({
      owner: "acp-workspace-activity",
      activationCondition: "ACP skill run workspace is active",
      scopeKey: "current ACP workspace request",
      allowedDataSources: ["current ACP workspace activity"],
      maxReadShape: "current workspace activity hint only",
      requiresForegroundSurface: false,
      minimumIntervalMs: 15000,
      intervalMs: 15000,
    });
    workspaceActivityTimer = setInterval(() => {
      void scanWorkspaceActivity();
    }, 15000);
  };
  const stopWorkspaceActivityHeartbeat = () => {
    if (!workspaceActivityTimer) {
      return;
    }
    clearInterval(workspaceActivityTimer);
    workspaceActivityTimer = null;
  };
  unsubscribeExecutionDisplayMode = subscribeAssistantExecutionDisplayMode(
    (mode) => {
      if (mode === "silent") {
        stopWorkspaceActivityHeartbeat();
      } else if (workspaceActivityPromptActive) {
        startWorkspaceActivityHeartbeat();
      }
    },
  );
  const failCurrentAcpPrompt = async (
    diagnostic: AcpPromptFailureDiagnostic,
  ): Promise<never> => {
    const current = getAcpSkillRunRecord(workspace.requestId);
    const hasRecoverableSession =
      !!normalizeString(current?.sessionId) || !!normalizeString(liveSessionId);
    const failedStatus =
      hasRecoverableSession &&
      isRecoverablePromptFailure({
        ...(current || {
          removedAt: undefined,
          archivedAt: undefined,
          conversationRecoveryState: "available" as const,
        }),
        sessionId:
          normalizeString(current?.sessionId) || normalizeString(liveSessionId),
        conversationRecoveryState: "available",
      })
        ? "failed_retriable"
        : "failed";
    upsertAcpSkillRun({
      requestId: workspace.requestId,
      status: failedStatus,
      statusReason:
        failedStatus === "failed_retriable"
          ? "prompt_failed_retriable"
          : "prompt_failed_terminal",
      activePrompt: false,
      replyState: "idle",
      error: diagnostic.error,
      pendingInteraction: null,
      conversationState: hasRecoverableSession ? "closed" : "error",
      conversationRecoveryState: hasRecoverableSession
        ? "available"
        : "unavailable",
      conversationError: hasRecoverableSession ? "" : diagnostic.error,
      event: {
        stage: diagnostic.stage,
        message: diagnostic.message,
        level: "error",
        details: diagnostic.details,
      },
    });
    await appendAcpSkillRunAuditEvent({
      requestId: workspace.requestId,
      runtimeDir: workspace.runtimeDir,
      event: {
        ts: new Date().toISOString(),
        stage: diagnostic.stage,
        message: diagnostic.message,
        level: "error",
        details: diagnostic.details,
      },
    });
    await writeAcpSkillRunAuditRuntimeLogs({
      requestId: workspace.requestId,
      runtimeDir: workspace.runtimeDir,
    });
    await writeAcpSkillRunAuditFinalState({
      requestId: workspace.requestId,
      runtimeDir: workspace.runtimeDir,
      record: getAcpSkillRunRecord(workspace.requestId),
      status: failedStatus,
      error: diagnostic.error,
    });
    await cleanupLiveSession({
      conversationState: hasRecoverableSession ? "closed" : "error",
      conversationError: hasRecoverableSession ? undefined : diagnostic.error,
      closeAdapter: true,
    }).catch(() => undefined);
    throw new AcpPromptFailureError(diagnostic);
  };
  const promptExistingSession = async (
    message: string,
  ): Promise<AcpPromptOutcome> => {
    await assistantTurnAccumulator.reset();
    currentTurnObservedAcpActivity = false;
    captureAssistantText = true;
    workspaceActivityPromptActive = true;
    startWorkspaceActivityHeartbeat();
    try {
      const timerAlreadyActive =
        executionMode !== "interactive" && autoHardTimeoutStarted;
      let resolvePromptReady: (() => void) | null = null;
      const promptReady = new Promise<void>((resolve) => {
        resolvePromptReady = resolve;
      });
      const promptPromise = runPrompt({
        adapter,
        backend: args.backend,
        requestId: workspace.requestId,
        message,
        sessionId: liveSessionId,
        startup: {
          signal: setupAbortController.signal,
          timeoutMs: ACP_SKILL_STARTUP_PHASE_TIMEOUT_MS,
        },
        onPromptReady: async (sessionId) => {
          if (!liveControllerPromoted) {
            await promoteLiveController?.(sessionId);
          }
          if (executionMode === "interactive") {
            hardTimeoutMonitor?.start();
          } else if (!autoHardTimeoutStarted) {
            hardTimeoutMonitor?.start();
            autoHardTimeoutStarted = true;
          }
          resolvePromptReady?.();
        },
      });
      const promptDrain = promptPromise.catch(() => undefined);
      activePromptTimeoutDrain = promptDrain;
      let guarded:
        | { timedOut: false; value: Awaited<typeof promptPromise> }
        | { timedOut: true };
      if (hardTimeoutMonitor) {
        if (!timerAlreadyActive) {
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
            guarded = await hardTimeoutMonitor.race(promptPromise);
          }
        } else {
          guarded = await hardTimeoutMonitor.race(promptPromise);
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
    } catch (error) {
      if (
        cancellationRequested ||
        interruptionRequested ||
        disconnectRequested
      ) {
        throw error;
      }
      if (error instanceof BoundedWaitError) {
        upsertAcpSkillRun({
          requestId: workspace.requestId,
          status: "failed",
          statusReason: "prompt_failed_terminal",
          activePrompt: false,
          conversationState: "error",
          conversationRecoveryState: "unavailable",
          error: error.message,
          event: {
            stage: "startup-failed",
            message: error.message,
            level: "error",
            details: {
              phase: error.phase,
              timeoutMs: error.timeoutMs,
              reason: error.kind,
            },
          },
        });
        void cleanupLiveSession({
          conversationState: "error",
          conversationError: error.message,
          closeAdapter: true,
        }).catch(() => undefined);
        throw error;
      }
      await failCurrentAcpPrompt(classifyAcpPromptError(error));
      throw error;
    } finally {
      captureAssistantText = false;
      workspaceActivityPromptActive = false;
      activePromptTimeoutDrain = null;
      if (
        executionMode === "interactive" &&
        !hardTimeoutMonitor?.isTriggered()
      ) {
        hardTimeoutMonitor?.clear();
      }
      stopWorkspaceActivityHeartbeat();
    }
  };
  const waitForInteractiveReply = () =>
    new Promise<string>((resolve, reject) => {
      pendingReplyResolver = resolve;
      pendingReplyRejecter = reject;
    });
  const resolvePendingReply = (message: string) => {
    const resolver = pendingReplyResolver;
    pendingReplyResolver = null;
    pendingReplyRejecter = null;
    resolver?.(message);
  };
  const resolveDisconnectedRunStatus = (): Extract<
    AcpSkillRunStatus,
    "running" | "waiting_user" | "repairing" | "failed_retriable"
  > => {
    const current = getAcpSkillRunRecord(workspace.requestId);
    if (
      current?.status === "waiting_user" ||
      current?.outputConvergenceState === "pending" ||
      !!current?.pendingInteraction
    ) {
      return "waiting_user";
    }
    if (
      current?.status === "repairing" ||
      current?.status === "failed_retriable"
    ) {
      return current.status;
    }
    return "running";
  };
  const resolveDisconnectedBackendStatus = (
    status: ReturnType<typeof resolveDisconnectedRunStatus>,
  ): "running" | "waiting_user" =>
    status === "waiting_user" ? "waiting_user" : "running";
  let continueDetachedInteractiveReply:
    | ((promptOutcome: AcpPromptOutcome) => Promise<void>)
    | null = null;
  const liveController = {
    cancel: async () => {
      cancellationRequested = true;
      if (pendingReplyRejecter) {
        pendingReplyRejecter(
          new Error("ACP skill run canceled while waiting for user reply."),
        );
        pendingReplyResolver = null;
        pendingReplyRejecter = null;
      }
      const current = upsertAcpSkillRun({
        requestId: workspace.requestId,
        event: {
          stage: "cancel-requested",
          message: "Cancel requested by ACP skill run panel.",
          level: "warn",
        },
      });
      if (current.sessionId) {
        await adapter.cancel({
          sessionId: current.sessionId,
        });
      }
      await cleanupLiveSession({
        conversationState: "ended",
        closeAdapter: true,
      });
    },
    interruptTurn: async () => {
      interruptionRequested = true;
      if (pendingReplyRejecter) {
        pendingReplyRejecter(
          new Error("ACP skill run interrupted while waiting for user reply."),
        );
        pendingReplyResolver = null;
        pendingReplyRejecter = null;
      }
      const current = upsertAcpSkillRun({
        requestId: workspace.requestId,
        activePrompt: true,
        promptInterruptState: "requested",
        event: {
          stage: "interrupt-requested",
          message: "ACP skill run current turn interruption requested.",
          level: "warn",
        },
      });
      if (current.pendingPermission) {
        resolveAcpSkillRunPermissionRequest({
          runRequestId: workspace.requestId,
          outcome: "cancelled",
        });
      }
      if (current.sessionId) {
        try {
          await adapter.cancel({ sessionId: current.sessionId });
        } catch {
          interruptionForced = true;
        }
      }
      if (activePromptTimeoutDrain) {
        clearInterruptWatchdog();
        interruptWatchdog = watchPromiseSettlement(
          activePromptTimeoutDrain,
          interruptionForced
            ? 0
            : (args.dependencies?.promptInterruptGraceMs ??
                DEFAULT_ACP_PROMPT_INTERRUPT_GRACE_MS),
          async () => {
            if (cleanupDone || !interruptionRequested) {
              return;
            }
            interruptionForced = true;
            const recovery = adapter.getSessionRecoveryCapabilities?.() || null;
            const recoverable =
              recovery?.canResumeSession === true ||
              recovery?.canLoadSession === true;
            try {
              await cleanupLiveSession({
                conversationState: "closed",
                closeAdapter: true,
              });
            } catch (error) {
              interruptionForced = false;
              interruptionRequested = false;
              upsertAcpSkillRun({
                requestId: workspace.requestId,
                status: "failed_retriable",
                statusReason: "prompt_failed_retriable",
                activePrompt: false,
                promptInterruptState: "unconfirmed",
                conversationState: "error",
                conversationRecoveryState: "available",
                conversationError: errorMessage(error),
                event: {
                  stage: "interrupt-force-close-failed",
                  message: errorMessage(error),
                  level: "error",
                },
              });
              return;
            }
            upsertAcpSkillRun({
              requestId: workspace.requestId,
              status: recoverable ? "waiting_user" : "canceled",
              statusReason: recoverable ? "interrupt_turn" : "cancel_task",
              activePrompt: false,
              replyState: "idle",
              promptInterruptState: "forced",
              conversationState: "closed",
              conversationRecoveryState: recoverable
                ? "available"
                : "unsupported",
              event: {
                stage: "interrupt-forced",
                message:
                  "ACP skill run prompt did not confirm cancellation and was force-stopped.",
                level: "warn",
                details: { recoverable },
              },
            });
          },
        );
      }
    },
    replyRequest: async (reply) => {
      const displayMessage = String(reply.displayMessage || "").trim();
      const promptMessage = String(reply.promptMessage || "").trim();
      if (!displayMessage || !promptMessage) {
        throw new Error("reply message is required");
      }
      if (!liveSessionId) {
        throw new Error("ACP skill run session is not available for replies.");
      }
      if (pendingReplyResolver) {
        appendAcpSkillRunUserReply({
          requestId: workspace.requestId,
          message: displayMessage,
        });
        resolvePendingReply(promptMessage);
        return;
      }
      const nextPrompt = promptChain
        .catch(() => undefined)
        .then(async () => {
          appendAcpSkillRunUserReply({
            requestId: workspace.requestId,
            message: displayMessage,
          });
          markAcpSkillRunContinuationRunning({
            requestId: workspace.requestId,
            event: {
              stage: "reply-received",
              message: "User reply received; continuing ACP skill run.",
              level: "info",
              details: { detachedReply: true },
            },
          });
          try {
            interruptionRequested = false;
            const promptOutcome = await promptExistingSession(promptMessage);
            if (!continueDetachedInteractiveReply) {
              throw new Error(
                "ACP skill run output convergence is not available for replies.",
              );
            }
            await continueDetachedInteractiveReply(promptOutcome);
          } catch (error) {
            if (error instanceof AcpPromptFailureError) {
              throw error;
            }
            if (disconnectRequested) {
              const disconnectedStatus = resolveDisconnectedRunStatus();
              upsertAcpSkillRun({
                requestId: workspace.requestId,
                status: disconnectedStatus,
                statusReason: "disconnect",
                activePrompt: false,
                replyState: "idle",
                error: "",
                conversationState: "closed",
                conversationRecoveryState: "available",
                event: {
                  stage: "disconnect-completed",
                  message: "ACP skill run local connection detached.",
                  level: "info",
                  details: {
                    reason: errorMessage(error),
                    detachedReply: true,
                  },
                },
              });
              return;
            }
            if (cancellationRequested) {
              upsertAcpSkillRun({
                requestId: workspace.requestId,
                status: "canceled",
                statusReason: "cancel_task",
                activePrompt: false,
                replyState: "idle",
                error: "",
                conversationState: "ended",
                conversationRecoveryState: "unavailable",
                event: {
                  stage: "canceled",
                  message: "ACP skill run canceled.",
                  level: "warn",
                  details: { detachedReply: true },
                },
              });
              return;
            }
            if (interruptionRequested) {
              clearInterruptWatchdog();
              upsertAcpSkillRun({
                requestId: workspace.requestId,
                ...CONFIRMED_ACP_SKILL_PROMPT_INTERRUPTION_STATE,
                error: "",
                event: {
                  stage: "interrupt-confirmed",
                  message: "ACP skill run current turn interrupted.",
                  level: "warn",
                  details: {
                    detachedReply: true,
                    reason: errorMessage(error),
                  },
                },
              });
              return;
            }
            await failCurrentAcpPrompt(classifyAcpPromptError(error));
          }
        });
      promptChain = nextPrompt;
      try {
        await nextPrompt;
      } catch (error) {
        promptChain = Promise.resolve();
        throw error;
      }
    },
    disconnect: async () => {
      disconnectRequested = true;
      if (pendingReplyRejecter) {
        pendingReplyRejecter(
          new Error("ACP skill run disconnected while waiting for user reply."),
        );
        pendingReplyResolver = null;
        pendingReplyRejecter = null;
      }
      const current = upsertAcpSkillRun({
        requestId: workspace.requestId,
        event: {
          stage: "disconnect-turn-requested",
          message:
            "ACP skill run local connection detach requested; active turn will stop first.",
          level: "info",
        },
      });
      if (captureAssistantText && current.sessionId) {
        await adapter
          .cancel({ sessionId: current.sessionId })
          .catch((error) => {
            upsertAcpSkillRun({
              requestId: workspace.requestId,
              event: {
                stage: "disconnect-cancel-failed",
                message: errorMessage(error),
                level: "warn",
              },
            });
            appendRuntimeLog({
              level: "warn",
              scope: "provider",
              backendId: args.backend.id,
              backendType: args.backend.type,
              providerId: "acp",
              requestId: workspace.requestId,
              component: "acp-skillrunner",
              operation: "disconnect-cancel",
              phase: "terminal",
              stage: "disconnect-cancel-failed",
              message: errorMessage(error),
            });
          });
      }
      await cleanupLiveSession({
        conversationState: "closed",
        closeAdapter: true,
      });
    },
    endSession: async () => {
      if (pendingReplyRejecter) {
        pendingReplyRejecter(
          new Error(
            "ACP skill run session ended while waiting for user reply.",
          ),
        );
        pendingReplyResolver = null;
        pendingReplyRejecter = null;
      }
      await cleanupLiveSession({
        conversationState: "ended",
        closeAdapter: true,
      });
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
  } satisfies NonNullable<Parameters<typeof registerAcpSkillRunController>[1]>;
  promoteLiveController = async (sessionId) => {
    liveSessionId = sessionId;
    if (cancellationRequested || setupAbortController.signal.aborted) {
      throw new BoundedWaitError({
        kind: "canceled",
        phase: "acp-live-controller-promotion",
      });
    }
    const registered = registerAcpSkillRunController(
      workspace.requestId,
      liveController,
      setupController,
    );
    if (!registered) {
      throw new BoundedWaitError({
        kind: "canceled",
        phase: "acp-live-controller-promotion",
      });
    }
    liveControllerPromoted = true;
  };
  unsubscribePermission = adapter.onPermissionRequest((request) => {
    const wrappedRequest = wrapAcpSkillRunPermissionRequestForTimeoutPause({
      request,
      pause: (permissionRequestId) => {
        pendingPermissionPauseIds.add(permissionRequestId);
        hardTimeoutMonitor?.pause();
      },
      resume: (permissionRequestId) => {
        pendingPermissionPauseIds.delete(permissionRequestId);
        if (pendingPermissionPauseIds.size === 0) {
          hardTimeoutMonitor?.resume();
        }
      },
    });
    handleAcpSkillRunPermissionRequest({
      requestId: workspace.requestId,
      request: wrappedRequest,
    });
  });
  unsubscribeUpdate = adapter.onUpdate(async (event) => {
    const update = event.update || { sessionUpdate: "" };
    await appendAcpSkillRunAuditUpdate({
      requestId: workspace.requestId,
      runtimeDir: workspace.runtimeDir,
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
    recordAcpSkillRunSessionUpdate(workspace.requestId, event);
  });
  unsubscribeDiagnostics = adapter.onDiagnostics((entry) => {
    recordAcpSkillRunAdapterDiagnostic({
      requestId: workspace.requestId,
      runtimeDir: workspace.runtimeDir,
      backendId: args.backend.id,
      entry,
    });
  });
  unsubscribeClose = adapter.onClose(async (event) => {
    const stderrText = normalizeString(event?.stderrText);
    await writeAcpSkillRunAuditStderrTail({
      requestId: workspace.requestId,
      runtimeDir: workspace.runtimeDir,
      stderrText,
    });
    upsertAcpSkillRun({
      requestId: workspace.requestId,
      activePrompt: false,
      conversationState: keepConversationAlive ? "closed" : undefined,
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
      requestId: workspace.requestId,
      runtimeDir: workspace.runtimeDir,
    });
    await writeAcpSkillRunAuditFinalState({
      requestId: workspace.requestId,
      runtimeDir: workspace.runtimeDir,
      record: getAcpSkillRunRecord(workspace.requestId),
      stderrText,
      transportLifecycle: event?.transportLifecycle,
    });
    if (keepConversationAlive) {
      void cleanupLiveSession({
        closeAdapter: false,
        conversationState: "closed",
        conversationError: stderrText || undefined,
      });
    }
  });
  try {
    const context: AcpSkillRunnerRunContext = {
      request,
      backend: dependencyPlan.wrappedBackend,
      workspace,
      materialization,
      injectionPlan,
      inputContext: requestValidation.inputContext,
      parameterContext: requestValidation.parameterContext,
    };
    const runExecutionInstructionsPath =
      await materializeAcpRunExecutionInstructions({
        context: {
          skillId: request.skill_id,
          workspace,
          backend: dependencyPlan.wrappedBackend,
          agentFamily: injectionPlan.family,
          proxySkillRoots: materialization.proxySkillRoots,
          requestedSkillProxyPath: materialization.requestedSkillProxyPath,
          sharedSkillCatalogPath: materialization.sharedSkillCatalogPath,
          sharedSkillCatalog: materialization.sharedSkillCatalog,
        },
      });
    upsertAcpSkillRun({
      requestId: workspace.requestId,
      event: {
        stage: "run-instructions-materialized",
        message: "ACP run execution instructions materialized.",
        level: "info",
        details: {
          path: runExecutionInstructionsPath,
        },
      },
    });
    let nextPrompt = await buildRunPrompt({
      context,
    });
    const maxRepairRounds = Math.max(
      0,
      args.dependencies?.maxRepairRounds ?? 3,
    );
    let repairRound = 0;
    let convergence: AcpSkillOutputConvergenceResult | null = null;
    const resolveResultFileFallbackForCurrentTurn = async (
      currentRepairRound: number,
    ) => {
      const fallback = await resolveAcpSkillResultFileFallback({
        skillId: request.skill_id,
        runnerJson: materialization.runnerJson,
        workspaceDir: workspace.workspaceDir,
        validator: (payload) =>
          validateAcpSkillFinalPayload({
            payload,
            runnerJson: materialization.runnerJson,
            primarySkillDir: materialization.primarySkillDir,
            workspaceDir: workspace.workspaceDir,
          }),
      });
      if (fallback.warnings.length > 0) {
        upsertAcpSkillRun({
          requestId: workspace.requestId,
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
            },
          },
        });
      }
      if (!fallback.payload) {
        return null;
      }
      const candidateText = JSON.stringify(fallback.payload);
      await writeAcpSkillRunnerResultEnvelope({
        resultJsonPath: workspace.resultJsonPath,
        resultJson: fallback.payload,
      });
      projectAcpSkillRunOutputEnvelopeToTranscript({
        requestId: workspace.requestId,
        kind: "final",
        resultJson: fallback.payload,
        candidateText,
        repairRound: currentRepairRound,
      });
      const fallbackConvergence: AcpSkillOutputConvergenceResult = {
        kind: "final",
        resultJson: fallback.payload,
        candidateText,
        warnings: fallback.warnings.map((entry) =>
          [entry.code, entry.detail].filter(Boolean).join(": "),
        ),
      };
      upsertAcpSkillRun({
        requestId: workspace.requestId,
        status: "running",
        statusReason: "validation_succeeded",
        repairRounds: currentRepairRound,
        validationStatus: "valid",
        validationErrors: [],
        outputConvergenceState: "final",
        pendingInteraction: null,
        lastTurnOutput: candidateText,
        resultJson: fallback.payload,
        event: {
          stage: "output-validation-succeeded",
          message: "Output validation succeeded through result-file fallback.",
          level: "warn",
          details: {
            resultJsonPath: workspace.resultJsonPath,
            selectedPath: fallback.selectedPath,
            warnings: fallback.warnings,
          },
        },
      });
      return fallbackConvergence;
    };
    const shouldContinueDetachedApply = (
      record: NonNullable<ReturnType<typeof getAcpSkillRunRecord>>,
    ) =>
      !!normalizeString(record.sequenceStepId) ||
      !!resolveRecoveredWorkflowIdFromTask(record);
    continueDetachedInteractiveReply = async (
      initialPromptOutcome: AcpPromptOutcome,
    ) => {
      if (interruptionForced) {
        return;
      }
      let promptOutcome = initialPromptOutcome;
      let detachedRepairRound = Math.max(
        0,
        getAcpSkillRunRecord(workspace.requestId)?.repairRounds ||
          repairRound ||
          0,
      );
      const startingRepairRound = detachedRepairRound;
      while (true) {
        if (disconnectRequested) {
          const disconnectedStatus = resolveDisconnectedRunStatus();
          upsertAcpSkillRun({
            requestId: workspace.requestId,
            status: disconnectedStatus,
            statusReason: "disconnect",
            activePrompt: false,
            replyState: "idle",
            error: "",
            conversationState: "closed",
            conversationRecoveryState: "available",
            event: {
              stage: "disconnect-completed",
              message: "ACP skill run local connection detached.",
              level: "info",
            },
          });
          return;
        }
        if (cancellationRequested) {
          upsertAcpSkillRun({
            requestId: workspace.requestId,
            status: "canceled",
            statusReason: "cancel_task",
            activePrompt: false,
            replyState: "idle",
            error: "",
            conversationState: "ended",
            conversationRecoveryState: "unavailable",
            event: {
              stage: "canceled",
              message: "ACP skill run canceled.",
              level: "warn",
              details: {
                detachedReply: true,
              },
            },
          });
          return;
        }
        if (interruptionRequested) {
          clearInterruptWatchdog();
          upsertAcpSkillRun({
            requestId: workspace.requestId,
            ...CONFIRMED_ACP_SKILL_PROMPT_INTERRUPTION_STATE,
            error: "",
            event: {
              stage: "interrupt-confirmed",
              message: "ACP skill run current turn interrupted.",
              level: "warn",
              details: {
                detachedReply: true,
                stopReason: promptOutcome.stopReason,
              },
            },
          });
          return;
        }
        const promptFailure = classifyAcpPromptFailure(promptOutcome);
        let detachedConvergence: AcpSkillOutputConvergenceResult;
        let promptOutcomeForDiagnostics = promptOutcome;
        if (promptFailure?.stage === "acp-prompt-no-output") {
          const fallbackConvergence =
            await resolveResultFileFallbackForCurrentTurn(detachedRepairRound);
          if (!fallbackConvergence) {
            await failCurrentAcpPrompt(promptFailure);
            throw new AcpPromptFailureError(promptFailure);
          }
          detachedConvergence = fallbackConvergence;
        } else if (promptFailure) {
          await failCurrentAcpPrompt(promptFailure);
          throw new AcpPromptFailureError(promptFailure);
        } else {
          detachedConvergence = await convergeAcpSkillTurnOutput({
            assistantText: promptOutcome.assistantText,
            executionMode,
            runnerJson: materialization.runnerJson,
            primarySkillDir: materialization.primarySkillDir,
            workspaceDir: workspace.workspaceDir,
          });
          promptOutcomeForDiagnostics = { ...promptOutcome };
          promptOutcome.assistantText = "";
        }
        if (detachedConvergence.kind === "pending") {
          const replyPromise = waitForInteractiveReply();
          projectAcpSkillRunOutputEnvelopeToTranscript({
            requestId: workspace.requestId,
            kind: "pending",
            message: detachedConvergence.message,
            candidateText: detachedConvergence.candidateText,
            repairRound: detachedRepairRound,
          });
          upsertAcpSkillRun({
            requestId: workspace.requestId,
            status: "waiting_user",
            statusReason: "waiting_user",
            activePrompt: false,
            conversationState: "active",
            validationStatus: "pending",
            validationErrors: [],
            outputConvergenceState: "pending",
            repairRounds: detachedRepairRound,
            lastTurnOutput: detachedConvergence.candidateText,
            pendingInteraction: {
              message: detachedConvergence.message,
              uiHints: detachedConvergence.uiHints,
              candidateText: detachedConvergence.candidateText,
            },
            event: {
              stage: "waiting-user",
              message: detachedConvergence.message,
              level: "info",
              details: {
                detachedReply: true,
                uiHints: detachedConvergence.uiHints,
              },
            },
          });
          const reply = await replyPromise;
          markAcpSkillRunContinuationRunning({
            requestId: workspace.requestId,
            event: {
              stage: "reply-received",
              message: "User reply received; continuing ACP skill run.",
              level: "info",
              details: {
                detachedReply: true,
              },
            },
          });
          interruptionRequested = false;
          promptOutcome = await promptExistingSession(reply);
          continue;
        }
        if (detachedConvergence.kind === "final") {
          await writeAcpSkillRunnerResultEnvelope({
            resultJsonPath: workspace.resultJsonPath,
            resultJson: detachedConvergence.resultJson,
          });
          projectAcpSkillRunOutputEnvelopeToTranscript({
            requestId: workspace.requestId,
            kind: "final",
            resultJson: detachedConvergence.resultJson,
            candidateText: detachedConvergence.candidateText,
            repairRound: detachedRepairRound,
          });
          const latest = getAcpSkillRunRecord(workspace.requestId);
          upsertAcpSkillRun({
            requestId: workspace.requestId,
            status:
              latest?.applyResultState === "succeeded"
                ? "succeeded"
                : "running",
            statusReason:
              latest?.applyResultState === "succeeded"
                ? "apply_succeeded"
                : "validation_succeeded",
            activePrompt: false,
            conversationState: "active",
            validationStatus: "valid",
            validationErrors: [],
            outputConvergenceState: "final",
            repairRounds: detachedRepairRound,
            pendingInteraction: null,
            lastTurnOutput: detachedConvergence.candidateText,
            resultJson: detachedConvergence.resultJson,
            applyResultState:
              latest?.applyResultState === "succeeded"
                ? "succeeded"
                : "pending",
            event: {
              stage: "detached-reply-output-validation-succeeded",
              message:
                detachedRepairRound > startingRepairRound
                  ? `Detached reply output repair round ${detachedRepairRound} succeeded.`
                  : "Detached reply output validation succeeded.",
              level: "info",
              details: {
                resultJsonPath: workspace.resultJsonPath,
                repairRounds: detachedRepairRound,
              },
            },
          });
          const afterFinal = getAcpSkillRunRecord(workspace.requestId);
          if (
            afterFinal &&
            afterFinal.applyResultState !== "succeeded" &&
            shouldContinueDetachedApply(afterFinal)
          ) {
            await continueRecoveredSequenceStep({
              record: {
                ...afterFinal,
                status: "succeeded",
                resultJson: detachedConvergence.resultJson,
              },
              resultJson: detachedConvergence.resultJson,
              dependencies: args.dependencies,
            });
          }
          return;
        }
        recordAcpSkillRunOutputRevision({
          requestId: workspace.requestId,
          status: "invalid",
          candidateText: detachedConvergence.candidateText,
          repairRound: detachedRepairRound,
          errors: detachedConvergence.errors,
        });
        const outputValidationFailureDetails =
          buildAcpSkillOutputValidationFailureDetails({
            convergence: detachedConvergence,
            promptOutcome: promptOutcomeForDiagnostics,
            repairRound: detachedRepairRound,
            maxRepairRounds,
            detachedReply: true,
          });
        upsertAcpSkillRun({
          requestId: workspace.requestId,
          status:
            detachedRepairRound < maxRepairRounds ? "repairing" : "failed",
          statusReason: "validation_failed",
          activePrompt: false,
          repairRounds: detachedRepairRound,
          validationStatus: "invalid",
          validationErrors: detachedConvergence.errors,
          outputConvergenceState: "invalid",
          lastTurnOutput: detachedConvergence.candidateText,
          error:
            detachedRepairRound >= maxRepairRounds
              ? `ACP SkillRunner-compatible output validation failed: ${detachedConvergence.errors.join("; ")}`
              : "",
          event: {
            stage: "detached-reply-output-validation-failed",
            message: "Detached reply output validation failed.",
            level: detachedRepairRound < maxRepairRounds ? "warn" : "error",
            details: outputValidationFailureDetails,
          },
        });
        appendAcpSkillOutputValidationFailureRuntimeLog({
          backend: args.backend,
          requestId: workspace.requestId,
          workflowId,
          runId,
          jobId,
          stage: "detached-reply-output-validation-failed",
          message: "Detached reply output validation failed.",
          phase: detachedRepairRound < maxRepairRounds ? "running" : "terminal",
          level: detachedRepairRound < maxRepairRounds ? "warn" : "error",
          details: outputValidationFailureDetails,
        });
        if (detachedRepairRound >= maxRepairRounds) {
          throw new Error(
            `ACP SkillRunner-compatible output validation failed: ${detachedConvergence.errors.join("; ")}`,
          );
        }
        detachedRepairRound += 1;
        upsertAcpSkillRun({
          requestId: workspace.requestId,
          status: "repairing",
          statusReason: "repair_start",
          activePrompt: true,
          repairRounds: detachedRepairRound,
          pendingInteraction: null,
          event: {
            stage: "repair-started",
            message: `Output repair round ${detachedRepairRound} started.`,
            level: "warn",
            details: {
              detachedReply: true,
              errors: detachedConvergence.errors,
            },
          },
        });
        const repairPrompt = await buildRunPrompt({
          context,
          repairPrompt: buildAcpSkillOutputRepairPrompt({
            executionMode,
            errors: detachedConvergence.errors,
            repairRound: detachedRepairRound,
            maxRepairRounds,
            outputContractDetails:
              materialization.outputContractDetailsMarkdown,
          }),
        });
        interruptionRequested = false;
        promptOutcome = await promptExistingSession(repairPrompt);
      }
    };
    while (true) {
      const promptResult = await promptExistingSession(nextPrompt);
      if (disconnectRequested) {
        keepConversationAlive = true;
        hardTimeoutMonitor?.clear();
        const disconnectedStatus = resolveDisconnectedRunStatus();
        upsertAcpSkillRun({
          requestId: workspace.requestId,
          status: disconnectedStatus,
          statusReason: "disconnect",
          activePrompt: false,
          replyState: "idle",
          error: "",
          conversationState: "closed",
          conversationRecoveryState: "available",
          event: {
            stage: "disconnect-completed",
            message: "ACP skill run local connection detached.",
            level: "info",
          },
        });
        await appendAcpSkillRunAuditEvent({
          requestId: workspace.requestId,
          runtimeDir: workspace.runtimeDir,
          event: {
            ts: new Date().toISOString(),
            stage: "disconnect-completed",
            message: "ACP skill run local connection detached.",
            level: "info",
          },
        });
        await writeAcpSkillRunAuditRuntimeLogs({
          requestId: workspace.requestId,
          runtimeDir: workspace.runtimeDir,
        });
        await writeAcpSkillRunAuditFinalState({
          requestId: workspace.requestId,
          runtimeDir: workspace.runtimeDir,
          record: getAcpSkillRunRecord(workspace.requestId),
          status: disconnectedStatus,
        });
        return {
          status: "deferred",
          requestId: workspace.requestId,
          fetchType: "result",
          backendStatus: resolveDisconnectedBackendStatus(disconnectedStatus),
          responseJson: {
            provider: "acp",
            requestId: workspace.requestId,
            status: "disconnected",
          },
        };
      }
      if (interruptionForced) {
        keepConversationAlive = true;
        hardTimeoutMonitor?.clear();
        const forcedRecord = getAcpSkillRunRecord(workspace.requestId);
        if (forcedRecord?.status === "canceled") {
          return {
            status: "canceled",
            requestId: workspace.requestId,
            fetchType: "result",
            responseJson: {
              provider: "acp",
              requestId: workspace.requestId,
              status: "interrupt_forced",
            },
          };
        }
        return {
          status: "deferred",
          requestId: workspace.requestId,
          fetchType: "result",
          backendStatus: "waiting_user",
          responseJson: {
            provider: "acp",
            requestId: workspace.requestId,
            status: "interrupt_forced",
          },
        };
      }
      if (cancellationRequested) {
        keepConversationAlive = true;
        hardTimeoutMonitor?.clear();
        upsertAcpSkillRun({
          requestId: workspace.requestId,
          status: "canceled",
          statusReason: "cancel_task",
          activePrompt: false,
          replyState: "idle",
          error: "",
          conversationState: "ended",
          conversationRecoveryState: "unavailable",
          event: {
            stage: "canceled",
            message: "ACP skill run canceled.",
            level: "warn",
            details: {
              reason: "task canceled after prompt returned",
            },
          },
        });
        await appendAcpSkillRunAuditEvent({
          requestId: workspace.requestId,
          runtimeDir: workspace.runtimeDir,
          event: {
            ts: new Date().toISOString(),
            stage: "canceled",
            message: "ACP skill run canceled.",
            level: "warn",
            details: {
              reason: "task canceled after prompt returned",
            },
          },
        });
        await writeAcpSkillRunAuditRuntimeLogs({
          requestId: workspace.requestId,
          runtimeDir: workspace.runtimeDir,
        });
        await writeAcpSkillRunAuditFinalState({
          requestId: workspace.requestId,
          runtimeDir: workspace.runtimeDir,
          record: getAcpSkillRunRecord(workspace.requestId),
          status: "canceled",
        });
        return {
          status: "canceled",
          requestId: workspace.requestId,
          fetchType: "result",
          responseJson: {
            provider: "acp",
            requestId: workspace.requestId,
            status: "canceled",
          },
        };
      }
      if (interruptionRequested) {
        clearInterruptWatchdog();
        keepConversationAlive = true;
        hardTimeoutMonitor?.clear();
        upsertAcpSkillRun({
          requestId: workspace.requestId,
          ...CONFIRMED_ACP_SKILL_PROMPT_INTERRUPTION_STATE,
          error: "",
          event: {
            stage: "interrupt-confirmed",
            message: "ACP skill run current turn interrupted.",
            level: "warn",
            details: {
              reason: "current turn interrupted after prompt settled",
              stopReason: promptResult.stopReason,
            },
          },
        });
        await appendAcpSkillRunAuditEvent({
          requestId: workspace.requestId,
          runtimeDir: workspace.runtimeDir,
          event: {
            ts: new Date().toISOString(),
            stage: "interrupt-confirmed",
            message: "ACP skill run current turn interrupted.",
            level: "warn",
            details: {
              reason: "current turn interrupted after prompt settled",
              stopReason: promptResult.stopReason,
            },
          },
        });
        await writeAcpSkillRunAuditRuntimeLogs({
          requestId: workspace.requestId,
          runtimeDir: workspace.runtimeDir,
        });
        await writeAcpSkillRunAuditFinalState({
          requestId: workspace.requestId,
          runtimeDir: workspace.runtimeDir,
          record: getAcpSkillRunRecord(workspace.requestId),
          status: "waiting_user",
        });
        return {
          status: "deferred",
          requestId: workspace.requestId,
          fetchType: "result",
          backendStatus: "waiting_user",
          responseJson: {
            provider: "acp",
            requestId: workspace.requestId,
            status: "interrupted",
          },
        };
      }
      const promptFailure = classifyAcpPromptFailure(promptResult);
      if (promptFailure?.stage === "acp-prompt-no-output") {
        const fallbackConvergence =
          await resolveResultFileFallbackForCurrentTurn(repairRound);
        if (fallbackConvergence) {
          convergence = fallbackConvergence;
          break;
        }
        await failCurrentAcpPrompt(promptFailure);
      }
      if (promptFailure) {
        await failCurrentAcpPrompt(promptFailure);
      }
      let promptOutcomeForDiagnostics = promptResult;
      convergence = await convergeAcpSkillTurnOutput({
        assistantText: promptResult.assistantText,
        executionMode,
        runnerJson: materialization.runnerJson,
        primarySkillDir: materialization.primarySkillDir,
        workspaceDir: workspace.workspaceDir,
      });
      promptOutcomeForDiagnostics = { ...promptResult };
      promptResult.assistantText = "";
      if (convergence.kind === "final") {
        await writeAcpSkillRunnerResultEnvelope({
          resultJsonPath: workspace.resultJsonPath,
          resultJson: convergence.resultJson,
        });
        projectAcpSkillRunOutputEnvelopeToTranscript({
          requestId: workspace.requestId,
          kind: "final",
          resultJson: convergence.resultJson,
          candidateText: convergence.candidateText,
          repairRound,
        });
        upsertAcpSkillRun({
          requestId: workspace.requestId,
          status: "running",
          statusReason: "validation_succeeded",
          repairRounds: repairRound,
          validationStatus: "valid",
          validationErrors: [],
          outputConvergenceState: "final",
          pendingInteraction: null,
          lastTurnOutput: convergence.candidateText,
          resultJson: convergence.resultJson,
          event: {
            stage:
              repairRound > 0
                ? "repair-validation-succeeded"
                : "output-validation-succeeded",
            message:
              repairRound > 0
                ? `Output repair round ${repairRound} succeeded.`
                : "Output validation succeeded.",
            level: "info",
            details: {
              resultJsonPath: workspace.resultJsonPath,
            },
          },
        });
        break;
      }
      if (convergence.kind === "pending") {
        const replyPromise = waitForInteractiveReply();
        projectAcpSkillRunOutputEnvelopeToTranscript({
          requestId: workspace.requestId,
          kind: "pending",
          message: convergence.message,
          candidateText: convergence.candidateText,
          repairRound,
        });
        upsertAcpSkillRun({
          requestId: workspace.requestId,
          status: "waiting_user",
          statusReason: "waiting_user",
          activePrompt: false,
          conversationState: "active",
          validationStatus: "pending",
          validationErrors: [],
          outputConvergenceState: "pending",
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
        const reply = await replyPromise;
        markAcpSkillRunContinuationRunning({
          requestId: workspace.requestId,
          event: {
            stage: "reply-received",
            message: "User reply received; continuing ACP skill run.",
            level: "info",
          },
        });
        nextPrompt = reply;
        continue;
      }
      const fallbackConvergence =
        await resolveResultFileFallbackForCurrentTurn(repairRound);
      if (fallbackConvergence) {
        convergence = fallbackConvergence;
        break;
      }
      upsertAcpSkillRun({
        requestId: workspace.requestId,
        status: repairRound < maxRepairRounds ? "repairing" : "failed",
        statusReason: "validation_failed",
        repairRounds: repairRound,
        validationStatus: "invalid",
        validationErrors: convergence.errors,
        outputConvergenceState: "invalid",
        lastTurnOutput: convergence.candidateText,
        event: {
          stage: "output-validation-failed",
          message: "Output validation failed.",
          level: "warn",
          details: {
            errors: convergence.errors,
          },
        },
      });
      recordAcpSkillRunOutputRevision({
        requestId: workspace.requestId,
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
        });
      if (repairRound >= maxRepairRounds) {
        upsertAcpSkillRun({
          requestId: workspace.requestId,
          status: "failed",
          statusReason: "validation_failed",
          activePrompt: false,
          error: `ACP SkillRunner-compatible output validation failed: ${convergence.errors.join("; ")}`,
          event: {
            stage: "failed",
            message: "ACP skill run failed output validation.",
            level: "error",
            details: outputValidationFailureDetails,
          },
        });
        appendAcpSkillOutputValidationFailureRuntimeLog({
          backend: args.backend,
          requestId: workspace.requestId,
          workflowId,
          runId,
          jobId,
          stage: "output-validation-failed",
          message: "ACP SkillRunner-compatible output validation failed.",
          phase: "terminal",
          level: "error",
          details: outputValidationFailureDetails,
        });
        throw new Error(
          `ACP SkillRunner-compatible output validation failed: ${convergence.errors.join("; ")}`,
        );
      }
      repairRound += 1;
      upsertAcpSkillRun({
        requestId: workspace.requestId,
        status: "repairing",
        statusReason: "repair_start",
        repairRounds: repairRound,
        event: {
          stage: "repair-started",
          message: `Output repair round ${repairRound} started.`,
          level: "warn",
          details: {
            errors: convergence.errors,
          },
        },
      });
      nextPrompt = await buildRunPrompt({
        context,
        repairPrompt: buildAcpSkillOutputRepairPrompt({
          executionMode,
          errors: convergence.errors,
          repairRound,
          maxRepairRounds,
          outputContractDetails: materialization.outputContractDetailsMarkdown,
        }),
      });
    }
    const finalResultJson =
      convergence?.kind === "final" ? convergence.resultJson : {};
    appendRuntimeLog({
      level: "info",
      scope: "provider",
      backendId: args.backend.id,
      backendType: args.backend.type,
      providerId: "acp",
      requestId: workspace.requestId,
      component: "acp-skillrunner",
      operation: "execute",
      phase: "terminal",
      stage: "acp-skillrunner-succeeded",
      message: "ACP SkillRunner-compatible run succeeded",
      details: {
        repairRounds: repairRound,
        family: injectionPlan.family,
        skillRoots: injectionPlan.skillRoots,
      },
    });
    upsertAcpSkillRun({
      requestId: workspace.requestId,
      status: "running",
      statusReason: "validation_succeeded",
      activePrompt: false,
      conversationState: "active",
      applyResultState: "pending",
      repairRounds: repairRound,
      validationStatus: "valid",
      resultJson: finalResultJson,
      event: {
        stage: "output-validation-succeeded",
        message:
          "ACP skill run output validated; waiting for apply/sequence settlement.",
        level: "info",
        details: {
          resultJsonPath: workspace.resultJsonPath,
          workspaceDir: workspace.workspaceDir,
        },
      },
    });
    await appendAcpSkillRunAuditEvent({
      requestId: workspace.requestId,
      runtimeDir: workspace.runtimeDir,
      event: {
        ts: new Date().toISOString(),
        stage: "output-validation-succeeded",
        message:
          "ACP skill run output validated; waiting for apply/sequence settlement.",
        level: "info",
        details: {
          resultJsonPath: workspace.resultJsonPath,
          workspaceDir: workspace.workspaceDir,
        },
      },
    });
    await writeAcpSkillRunAuditRuntimeLogs({
      requestId: workspace.requestId,
      runtimeDir: workspace.runtimeDir,
    });
    await writeAcpSkillRunAuditFinalState({
      requestId: workspace.requestId,
      runtimeDir: workspace.runtimeDir,
      record: getAcpSkillRunRecord(workspace.requestId),
      status: "running",
    });
    hardTimeoutMonitor?.clear();
    keepConversationAlive = true;
    return {
      status: "succeeded",
      requestId: workspace.requestId,
      fetchType: "result",
      resultJson: finalResultJson,
      responseJson: {
        kind: ACP_SKILL_RUN_REQUEST_KIND,
        provider: "acp",
        workspaceDir: workspace.workspaceDir,
        resultJsonPath: workspace.resultJsonPath,
        resultResolution: "workflow-result-context",
        repairRounds: repairRound,
        agentFamily: injectionPlan.family,
        skillRoots: injectionPlan.skillRoots,
        runtimeDependencies: dependencyPlan.dependencies,
        effectiveRuntimeOptions: effectiveRuntimeOptions.runtimeOptions,
        sharedSkillCatalogPath: materialization.sharedSkillCatalogPath,
        runExecutionInstructionsPath,
        proxySkillCount: materialization.proxySkillCount,
        proxySkillRoots: materialization.proxySkillRoots,
        requestedSkillProxyPath: materialization.requestedSkillProxyPath,
        resourceRewriteWarnings: materialization.resourceRewriteWarnings,
      },
    };
  } catch (error) {
    if (error instanceof AcpPromptFailureError) {
      throw error;
    }
    const message = errorMessage(error);
    if (disconnectRequested) {
      keepConversationAlive = true;
      hardTimeoutMonitor?.clear();
      const disconnectedStatus = resolveDisconnectedRunStatus();
      upsertAcpSkillRun({
        requestId: workspace.requestId,
        status: disconnectedStatus,
        statusReason: "disconnect",
        activePrompt: false,
        replyState: "idle",
        error: "",
        conversationState: "closed",
        conversationRecoveryState: "available",
        event: {
          stage: "disconnect-completed",
          message: "ACP skill run local connection detached.",
          level: "info",
          details: {
            reason: message,
          },
        },
      });
      await appendAcpSkillRunAuditEvent({
        requestId: workspace.requestId,
        runtimeDir: workspace.runtimeDir,
        event: {
          ts: new Date().toISOString(),
          stage: "disconnect-completed",
          message: "ACP skill run local connection detached.",
          level: "info",
          details: {
            reason: message,
          },
        },
      });
      await writeAcpSkillRunAuditRuntimeLogs({
        requestId: workspace.requestId,
        runtimeDir: workspace.runtimeDir,
      });
      await writeAcpSkillRunAuditFinalState({
        requestId: workspace.requestId,
        runtimeDir: workspace.runtimeDir,
        record: getAcpSkillRunRecord(workspace.requestId),
        status: disconnectedStatus,
      });
      return {
        status: "deferred",
        requestId: workspace.requestId,
        fetchType: "result",
        backendStatus: resolveDisconnectedBackendStatus(disconnectedStatus),
        responseJson: {
          provider: "acp",
          requestId: workspace.requestId,
          status: "disconnected",
        },
      };
    }
    if (interruptionForced) {
      keepConversationAlive = true;
      hardTimeoutMonitor?.clear();
      const forcedRecord = getAcpSkillRunRecord(workspace.requestId);
      const terminal = forcedRecord?.status === "canceled";
      if (terminal) {
        return {
          status: "canceled",
          requestId: workspace.requestId,
          fetchType: "result",
          responseJson: {
            provider: "acp",
            requestId: workspace.requestId,
            status: "interrupt_forced",
          },
        };
      }
      return {
        status: "deferred",
        requestId: workspace.requestId,
        fetchType: "result",
        backendStatus: "waiting_user",
        responseJson: {
          provider: "acp",
          requestId: workspace.requestId,
          status: "interrupt_forced",
        },
      };
    }
    if (interruptionRequested) {
      clearInterruptWatchdog();
      interruptionRequested = false;
      upsertAcpSkillRun({
        requestId: workspace.requestId,
        promptInterruptState: "unconfirmed",
        event: {
          stage: "interrupt-unconfirmed",
          message:
            "ACP skill run interruption ended with an unconfirmed prompt error.",
          level: "warn",
          details: { reason: message },
        },
      });
    }
    upsertAcpSkillRun({
      requestId: workspace.requestId,
      status: cancellationRequested ? "canceled" : "failed",
      statusReason: cancellationRequested
        ? "cancel_task"
        : "prompt_failed_terminal",
      activePrompt: false,
      error: message,
      event: {
        stage: cancellationRequested ? "canceled" : "failed",
        message: cancellationRequested ? "ACP skill run canceled." : message,
        level: cancellationRequested ? "warn" : "error",
      },
    });
    await appendAcpSkillRunAuditEvent({
      requestId: workspace.requestId,
      runtimeDir: workspace.runtimeDir,
      event: {
        ts: new Date().toISOString(),
        stage: cancellationRequested ? "canceled" : "failed",
        message: cancellationRequested ? "ACP skill run canceled." : message,
        level: cancellationRequested ? "warn" : "error",
      },
    });
    await writeAcpSkillRunAuditRuntimeLogs({
      requestId: workspace.requestId,
      runtimeDir: workspace.runtimeDir,
    });
    await writeAcpSkillRunAuditFinalState({
      requestId: workspace.requestId,
      runtimeDir: workspace.runtimeDir,
      record: getAcpSkillRunRecord(workspace.requestId),
      status: cancellationRequested ? "canceled" : "failed",
      error: message,
    });
    throw error;
  } finally {
    if (!keepConversationAlive) {
      await cleanupLiveSession({
        conversationState: "error",
        closeAdapter: true,
      });
    }
  }
}

void Promise.resolve().then(() => {
  setAcpSkillRunRecoveryHandler(({ requestId, reason }) =>
    recoverAcpSkillRunConversation({ requestId, reason }),
  );
});
