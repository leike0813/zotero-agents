import type { BackendInstance } from "../backends/types";
import { listBackendInstances } from "../backends/registry";
import { ACP_SKILL_RUN_REQUEST_KIND } from "../config/defaults";
import type {
  AcpSkillRunRequestV1,
  ProviderExecutionResult,
} from "../providers/contracts";
import { executeApplyResult } from "../workflows/runtime";
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
import type {
  ProviderOrchestrationContext,
  ProviderProgressEvent,
} from "../providers/types";
import { appendRuntimeLog } from "./runtimeLogManager";
import { collectSkillRunFeedbackSidecar } from "./skillRunFeedback";
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
import {
  applyHostBridgeCliEnvToBackend,
  createDisabledHostBridgeCliRunInjection,
  materializeHostBridgeCliRunInjection,
  summarizeHostBridgeCliRunInjection,
  type HostBridgeCliRunInjection,
} from "./hostBridgeCliInjection";
import {
  createAcpSkillRunnerWorkspace,
  registerAcpWorkflowWorkspaceForReuse,
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
  incrementAcpRuntimeMetric,
  observeAcpRuntimeGauge,
  startAcpRuntimeProfile,
} from "./acpRuntimePerformanceProfiler";
import { recordAcpRuntimeSemanticTraceEvent } from "./acpRuntimeSemanticTraceRecorder";
import { recordAcpRuntimeDiagnostic } from "./acpDiagnosticRouter";
import { buildAcpRuntimeOptionsCache } from "./acpBackendProbe";
import {
  normalizeAcpSkillRuntimeSelection,
  resolveAcpRuntimeOptionsState,
} from "./acpSessionConfigOptions";
import type { AcpDiagnosticsEntry } from "./acpTypes";
import {
  buildAcpSkillRunPrompt,
  materializeAcpRunExecutionInstructions,
} from "./acpSkillRunPromptBuilder";
import {
  ACP_RUNTIME_PROMPT_TEMPLATES_BY_ID,
  loadAcpRuntimePromptTemplate,
  renderAcpRuntimePromptTemplate,
} from "./acpRuntimePromptTemplates";
import {
  buildAcpStartupPromptPreamble,
  prependAcpStartupPromptPreamble,
  resolveAcpStartupInstructionFile,
} from "./acpStartupPromptPreambles";
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
import { validateAcpSkillRunRequestAgainstSchemas } from "./acpSkillSchemaAssets";
import { resolveAcpSkillResultFileFallback } from "./acpSkillResultFileFallback";
import {
  createAcpConnectionAdapter,
  type AcpConnectionAdapter,
  type AcpConnectionInitializeResult,
  type AcpConnectionNewSessionResult,
  type AcpPromptBackendError,
} from "./acpConnectionAdapter";
import { ensureZoteroMcpServer } from "./zoteroMcpServer";
import { listZoteroMcpTools } from "./zoteroMcpProtocol";
import {
  autoApproveAcpSkillRunPermissionRequest,
  appendAcpSkillRunUserReply,
  appendAcpSkillRunHardTimeoutTranscriptNotice,
  completeAcpSkillRunTranscriptTurnBoundary,
  detachAcpSkillRunControllerAfterApplyResult,
  flushAcpSkillRunRuntimeFileWrites,
  getAcpSkillRunRecord,
  getAcpSkillRunRuntimeCatalog,
  hydrateAcpSkillRunTranscriptMirror,
  isRecoverablePromptFailure,
  markAcpSkillRunApplyResult,
  projectAcpSkillRunOutputEnvelopeToTranscript,
  registerAcpSkillRunController,
  recordAcpSkillRunOutputRevision,
  recordAcpSkillRunSessionUpdate,
  resolveAcpSkillRunPermissionRequest,
  setAcpSkillRunPermissionRequest,
  setAcpSkillRunRecoveryHandler,
  setAcpSkillRunRuntimeCatalog,
  type AcpSkillRunStatus,
  type AcpSkillRunReplyRequest,
  updateAcpSkillRunRuntimeSelection,
  upsertAcpSkillRun,
} from "./acpSkillRunStore";
import { finishAcpSequenceStep } from "./workflowExecution/acpSequenceStepLifecycle";
import { resolveAutoApproveAcpPermissionOptionId } from "./acpPermissionOptions";
import {
  requestAcpSkillRunForeground,
  type AcpSkillRunForegroundDeps,
} from "./acpSkillRunForeground";
import { resolveAcpRawModelIdForSelection } from "./acpModelOptionFolding";
import { applyAcpReasoningEffortWithFallback } from "./acpReasoningEffortFallback";
import {
  listWorkflowTasks,
  updateWorkflowTaskStateByRequest,
} from "./taskRuntime";
import {
  listRuntimeChildren,
  readRuntimeTextFile,
  statRuntimePath,
} from "./runtimePersistence";
import {
  appendAcpSkillRunAuditDiagnostic,
  appendAcpSkillRunAuditEvent,
  appendAcpSkillRunTransportAuditEvent,
  appendAcpSkillRunAuditUpdate,
  initializeAcpSkillRunAuditTrail,
  resolveAcpSkillRunAuditTrailFiles,
  shouldWriteDetailedAcpAuditArtifacts,
  writeAcpSkillRunAuditFinalState,
  writeAcpSkillRunAuditPrompt,
  writeAcpSkillRunAuditRuntimeLogs,
  writeAcpSkillRunAuditStderrTail,
} from "./acpSkillRunAuditTrail";
import { continueSkillRunnerSequence } from "./workflowExecution/sequenceRuntime";
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

export type AcpRequiredMcpPreflightProbe = (args: {
  requiredTools: string[];
  initialized: AcpConnectionInitializeResult;
  requestId: string;
  backend: BackendInstance;
  workspace: AcpSkillRunnerWorkspace;
}) => Promise<{
  ok: boolean;
  availableTools?: string[];
  missingTools?: string[];
  message?: string;
}>;

type AcpPromptOutcome = {
  sessionId: string;
  stopReason: string;
  assistantText: string;
  observedAcpActivity: boolean;
  standardAssistantTextSeen?: boolean;
  backendError?: AcpPromptBackendError;
};

const DEFAULT_ACP_SKILL_HARD_TIMEOUT_SECONDS = 1200;
const DEFAULT_ACP_PROMPT_INTERRUPT_GRACE_MS = 10_000;
const ACP_HARD_TIMEOUT_TRANSCRIPT_DRAIN_MS = 250;
const ACP_SKILL_OUTPUT_DIAGNOSTIC_TEXT_TAIL_CHARS = 2000;

const ACP_SKILL_RUNTIME_DEFAULT_OPTION_KEYS = new Set([
  "no_cache",
  "execution_mode",
  "interactive_auto_reply",
  "interactive_reply_timeout_sec",
  "hard_timeout_seconds",
  "workspace",
  "env",
  "collect_skill_run_feedback",
]);

const ACP_OBSERVABLE_PROMPT_OUTPUT_UPDATE_KINDS = new Set([
  "agent_message_chunk",
  "agent_thought_chunk",
  "tool_call",
  "tool_call_update",
  "plan",
]);

type AcpHardTimeoutSource = "request" | "runner" | "default";

export type AcpSkillRunEffectiveRuntimeOptions = {
  runtimeOptions: Record<string, unknown>;
  hardTimeoutSeconds: number;
  hardTimeoutSource: AcpHardTimeoutSource;
};

type AcpPromptFailureDiagnostic = {
  stage: "acp-prompt-no-output" | "acp-prompt-stopped" | "acp-prompt-failed";
  message: string;
  error: string;
  details: Record<string, unknown>;
};

class AcpPromptFailureError extends Error {
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

function recordAcpSkillRunAdapterDiagnostic(args: {
  requestId: string;
  runtimeDir?: string;
  backendId?: string;
  entry: AcpDiagnosticsEntry;
}) {
  recordAcpRuntimeDiagnostic({
    surface: "acp-skills",
    ownerKey: args.requestId,
    requestId: args.requestId,
    backendId: args.backendId,
    entry: args.entry,
    debugAuditSink: (entry) => {
      void appendAcpSkillRunAuditDiagnostic({
        requestId: args.requestId,
        runtimeDir: args.runtimeDir,
        entry,
      });
    },
  });
}

function resolveAcpProfileZoteroMajor(): 7 | 9 | "unknown" {
  const major = Number.parseInt(String(Zotero?.version || ""), 10);
  return major === 7 || major === 9 ? major : "unknown";
}

function createAssistantTurnAccumulator(requestId?: string) {
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

function isObservableAcpPromptOutputUpdateKind(value: unknown) {
  return ACP_OBSERVABLE_PROMPT_OUTPUT_UPDATE_KINDS.has(normalizeString(value));
}

function tailDiagnosticText(value: unknown) {
  const text = String(value || "");
  if (text.length <= ACP_SKILL_OUTPUT_DIAGNOSTIC_TEXT_TAIL_CHARS) {
    return text;
  }
  return text.slice(-ACP_SKILL_OUTPUT_DIAGNOSTIC_TEXT_TAIL_CHARS);
}

function toPositiveInteger(value: unknown) {
  const numberValue =
    typeof value === "number"
      ? value
      : typeof value === "string" && normalizeString(value)
        ? Number(value)
        : NaN;
  if (!Number.isInteger(numberValue) || numberValue < 1) {
    return undefined;
  }
  return numberValue;
}

function errorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : String(error || "unknown error");
}

const CONFIRMED_ACP_SKILL_PROMPT_INTERRUPTION_STATE = {
  status: "waiting_user",
  statusReason: "interrupt_turn",
  activePrompt: false,
  replyState: "idle",
  conversationState: "active",
  conversationRecoveryState: "connected",
  promptInterruptState: "confirmed",
} as const;

function markAcpSkillRunContinuationRunning(args: {
  requestId: string;
  event: NonNullable<Parameters<typeof upsertAcpSkillRun>[0]["event"]>;
}) {
  return upsertAcpSkillRun({
    requestId: args.requestId,
    status: "running",
    statusReason: "recovery_continue",
    activePrompt: true,
    promptInterruptState: "idle",
    pendingInteraction: null,
    conversationState: "active",
    conversationRecoveryState: "connected",
    conversationError: "",
    lastRecoveryError: "",
    error: "",
    event: args.event,
  });
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

function classifyAcpPromptFailure(
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

function classifyAcpPromptError(error: unknown): AcpPromptFailureDiagnostic {
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

type InvalidAcpSkillOutputConvergence = Extract<
  AcpSkillOutputConvergenceResult,
  { kind: "invalid" }
>;

function buildAcpSkillOutputValidationFailureDetails(args: {
  convergence: InvalidAcpSkillOutputConvergence;
  promptOutcome?: AcpPromptOutcome;
  repairRound: number;
  maxRepairRounds: number;
  detachedReply?: boolean;
  recovered?: boolean;
}) {
  const candidateText = String(args.convergence.candidateText || "");
  const assistantText =
    String(args.promptOutcome?.assistantText || "") || candidateText;
  const details: Record<string, unknown> = {
    errors: args.convergence.errors,
    repairRound: args.repairRound,
    maxRepairRounds: args.maxRepairRounds,
    stopReason: normalizeString(args.promptOutcome?.stopReason),
    sessionId: normalizeString(args.promptOutcome?.sessionId),
    observedAcpActivity: args.promptOutcome?.observedAcpActivity === true,
    standardAssistantTextSeen:
      args.promptOutcome?.standardAssistantTextSeen === true,
    assistantTextChars: assistantText.length,
    assistantTextTail: tailDiagnosticText(assistantText),
    candidateTextChars: candidateText.length,
  };
  const candidateTail = tailDiagnosticText(candidateText);
  if (candidateTail && candidateTail !== details.assistantTextTail) {
    details.candidateTextTail = candidateTail;
  }
  if (args.detachedReply === true) {
    details.detachedReply = true;
  }
  if (args.recovered === true) {
    details.recovered = true;
  }
  return details;
}

function appendAcpSkillOutputValidationFailureRuntimeLog(args: {
  backend: BackendInstance;
  requestId: string;
  workflowId?: string;
  runId?: string;
  jobId?: string;
  stage: string;
  message: string;
  phase: "running" | "terminal";
  level: "warn" | "error";
  details: Record<string, unknown>;
}) {
  appendRuntimeLog({
    level: args.level,
    scope: "provider",
    workflowId: normalizeString(args.workflowId),
    runId: normalizeString(args.runId),
    jobId: normalizeString(args.jobId),
    backendId: args.backend.id,
    backendType: args.backend.type,
    providerId: "acp",
    requestId: args.requestId,
    component: "acp-skillrunner",
    operation: "execute",
    phase: args.phase,
    stage: args.stage,
    message: args.message,
    details: args.details,
  });
}

function isJsonObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function cloneJsonRecord(value: unknown) {
  return isJsonObject(value) ? { ...value } : {};
}

function resolveRunnerRuntimeDefaultOptions(
  runnerJson: Record<string, unknown>,
) {
  const runtime = runnerJson.runtime;
  if (!isJsonObject(runtime)) {
    return {};
  }
  const defaults = cloneJsonRecord(runtime.default_options);
  return Object.fromEntries(
    Object.entries(defaults).filter(([key]) =>
      ACP_SKILL_RUNTIME_DEFAULT_OPTION_KEYS.has(key.trim()),
    ),
  );
}

export function resolveAcpSkillRunEffectiveRuntimeOptions(args: {
  request: AcpSkillRunRequestV1;
  runnerJson: Record<string, unknown>;
  providerOptions?: Record<string, unknown>;
}): AcpSkillRunEffectiveRuntimeOptions {
  const runnerDefaults = resolveRunnerRuntimeDefaultOptions(args.runnerJson);
  const requestRuntimeOptions = cloneJsonRecord(args.request.runtime_options);
  const providerTimeout = toPositiveInteger(
    args.providerOptions?.hard_timeout_seconds,
  );
  const providerRuntimeOptions =
    typeof providerTimeout === "number"
      ? { hard_timeout_seconds: providerTimeout }
      : {};
  const runtimeOptions: Record<string, unknown> = {
    ...runnerDefaults,
    ...requestRuntimeOptions,
    ...providerRuntimeOptions,
  };
  const requestTimeout = toPositiveInteger(
    providerRuntimeOptions.hard_timeout_seconds ??
      requestRuntimeOptions.hard_timeout_seconds,
  );
  const runnerTimeout = toPositiveInteger(runnerDefaults.hard_timeout_seconds);
  const hardTimeoutSeconds =
    requestTimeout ?? runnerTimeout ?? DEFAULT_ACP_SKILL_HARD_TIMEOUT_SECONDS;
  const hardTimeoutSource: AcpHardTimeoutSource =
    typeof requestTimeout === "number"
      ? "request"
      : typeof runnerTimeout === "number"
        ? "runner"
        : "default";
  runtimeOptions.hard_timeout_seconds = hardTimeoutSeconds;
  return {
    runtimeOptions,
    hardTimeoutSeconds,
    hardTimeoutSource,
  };
}

function cloneJsonObject(
  value: unknown,
  label: string,
): Record<string, unknown> {
  if (!isJsonObject(value)) {
    throw new Error(`${label} must be a JSON object`);
  }
  return JSON.parse(JSON.stringify(value)) as Record<string, unknown>;
}

function normalizeStringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [] as string[];
  }
  return Array.from(
    new Set(value.map((entry) => normalizeString(entry)).filter(Boolean)),
  );
}

function resolveWorkflowWorkspaceIntent(request: AcpSkillRunRequestV1) {
  const raw =
    request.runtime_options?.workspace ||
    request.runtime_options?.workflow_workspace;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return undefined;
  }
  const mode = normalizeString((raw as { mode?: unknown }).mode);
  const workflowRunId = normalizeString(
    (raw as { workflow_run_id?: unknown }).workflow_run_id,
  );
  if ((mode !== "new" && mode !== "reuse") || !workflowRunId) {
    return undefined;
  }
  return {
    mode,
    workflowRunId,
  } as const;
}

function basename(path: string) {
  return (
    normalizeString(path)
      .split(/[\\/]+/)
      .filter(Boolean)
      .pop() || ""
  );
}

function pathParts(value: string) {
  return normalizeString(value).replace(/\\/g, "/").split("/").filter(Boolean);
}

function workspaceRelativePath(rootDir: string, childPath: string) {
  const rootParts = pathParts(rootDir);
  const childParts = pathParts(childPath);
  let offset = 0;
  while (
    offset < rootParts.length &&
    offset < childParts.length &&
    rootParts[offset].toLowerCase() === childParts[offset].toLowerCase()
  ) {
    offset += 1;
  }
  const relative = childParts.slice(offset).join("/");
  return relative || basename(childPath);
}

async function findWorkspaceActivitySnapshot(rootDir: string) {
  const root = normalizeString(rootDir);
  if (!root) {
    return null;
  }
  const queue = [{ path: root, depth: 0 }];
  let visited = 0;
  let best: { path: string; size: number; mtime: number } | null = null;
  while (queue.length > 0 && visited < 120) {
    const current = queue.shift();
    if (!current) break;
    visited += 1;
    const stat = await statRuntimePath(current.path);
    if (!stat.exists) continue;
    const mtime =
      Number(
        (stat as { lastModified?: unknown; mtimeMs?: unknown }).lastModified ||
          (stat as { mtimeMs?: unknown }).mtimeMs ||
          0,
      ) || 0;
    if (!stat.isDir) {
      const candidate = { path: current.path, size: stat.size, mtime };
      if (
        !best ||
        candidate.mtime > best.mtime ||
        (candidate.mtime === best.mtime &&
          candidate.path.localeCompare(best.path) > 0)
      ) {
        best = candidate;
      }
      continue;
    }
    if (current.depth >= 3) continue;
    const children = await listRuntimeChildren(current.path);
    for (const child of children) {
      const name = basename(child);
      if (name === ".claude" || name === ".acp") {
        continue;
      }
      queue.push({ path: child, depth: current.depth + 1 });
    }
  }
  if (!best) {
    return null;
  }
  return {
    fileName: basename(best.path),
    path: best.path,
    relativePath: workspaceRelativePath(root, best.path),
    signature: `${best.path}:${best.size}:${best.mtime}`,
  };
}

function assertAcpSkillRunRequest(value: unknown): AcpSkillRunRequestV1 {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("ACP skill runner requires object request");
  }
  const request = value as AcpSkillRunRequestV1;
  if (request.kind !== ACP_SKILL_RUN_REQUEST_KIND) {
    throw new Error(`ACP skill runner requires ${ACP_SKILL_RUN_REQUEST_KIND}`);
  }
  if (!normalizeString(request.skill_id)) {
    throw new Error("ACP skill runner requires skill_id");
  }
  return request;
}

function resolveJobId(request: AcpSkillRunRequestV1) {
  return (
    normalizeString(request.taskName) ||
    normalizeString(request.targetParentID) ||
    normalizeString(request.skill_id) ||
    "job"
  );
}

async function buildRunPrompt(args: {
  context: AcpSkillRunnerRunContext;
  repairPrompt?: string;
}) {
  if (args.repairPrompt) {
    await writeAcpSkillRunAuditPrompt({
      requestId: args.context.workspace.requestId,
      runtimeDir: args.context.workspace.runtimeDir,
      prompt: args.repairPrompt,
    });
    return args.repairPrompt;
  }
  const { context } = args;
  const basePrompt = await buildAcpSkillRunPrompt({
    context: {
      skillId: context.request.skill_id,
      workspace: context.workspace,
      backend: context.backend,
      agentFamily: context.injectionPlan.family,
      proxySkillRoots: context.materialization.proxySkillRoots,
      requestedSkillProxyPath: context.materialization.requestedSkillProxyPath,
      sharedSkillCatalogPath: context.materialization.sharedSkillCatalogPath,
      sharedSkillCatalog: context.materialization.sharedSkillCatalog,
    },
    request: context.request,
    runnerJson: context.materialization.runnerJson,
    inputContext: context.inputContext,
    parameterContext: context.parameterContext,
  });
  const startupPreamble = await buildAcpStartupPromptPreamble({
    surface: "acp-skills",
    workspaceDir: context.workspace.workspaceDir,
    instructionFile: resolveAcpStartupInstructionFile(
      context.injectionPlan.family,
    ),
  });
  const prompt = prependAcpStartupPromptPreamble({
    message: basePrompt,
    preamble: startupPreamble,
  });
  await writeAcpSkillRunAuditPrompt({
    requestId: context.workspace.requestId,
    runtimeDir: context.workspace.runtimeDir,
    prompt,
  });
  return prompt;
}

function resolveExecutionMode(
  request: AcpSkillRunRequestV1,
  runnerJson: Record<string, unknown>,
) {
  const explicit = normalizeString(
    request.runtime_options?.execution_mode,
  ).toLowerCase();
  if (explicit === "interactive" || explicit === "auto") {
    return explicit;
  }
  const modes = Array.isArray(runnerJson.execution_modes)
    ? runnerJson.execution_modes.map((entry) =>
        normalizeString(entry).toLowerCase(),
      )
    : [];
  if (modes.includes("auto")) {
    return "auto";
  }
  if (modes.includes("interactive")) {
    return "interactive";
  }
  return "auto";
}

async function readRunnerJsonForExecutionMode(path: string) {
  try {
    return JSON.parse(await readRuntimeTextFile(path)) as Record<
      string,
      unknown
    >;
  } catch {
    return {};
  }
}

function resolveRunnerRequiredMcpTools(runnerJson: Record<string, unknown>) {
  const mcp = runnerJson.mcp;
  if (!mcp || typeof mcp !== "object" || Array.isArray(mcp)) {
    return [] as string[];
  }
  const tools = mcp as { required_tools?: unknown; requiredTools?: unknown };
  return normalizeStringArray(tools.required_tools || tools.requiredTools);
}

function resolveWorkflowRequiredMcpTools(request: AcpSkillRunRequestV1) {
  const workflowMcp = request.runtime_options?.workflow_mcp;
  if (
    !workflowMcp ||
    typeof workflowMcp !== "object" ||
    Array.isArray(workflowMcp)
  ) {
    return [] as string[];
  }
  const tools = workflowMcp as {
    required_tools?: unknown;
    requiredTools?: unknown;
  };
  return normalizeStringArray(tools.required_tools || tools.requiredTools);
}

function resolveRequiredMcpTools(args: {
  request: AcpSkillRunRequestV1;
  runnerJson: Record<string, unknown>;
}) {
  const workflowTools = resolveWorkflowRequiredMcpTools(args.request);
  if (workflowTools.length > 0) {
    return workflowTools;
  }
  return resolveRunnerRequiredMcpTools(args.runnerJson);
}

function resolveZoteroHostAccessRequirement(args: {
  request: AcpSkillRunRequestV1;
  runnerJson: Record<string, unknown>;
}) {
  void args.runnerJson;
  const declaration = args.request.runtime_options?.zotero_host_access;
  if (
    declaration &&
    typeof declaration === "object" &&
    !Array.isArray(declaration)
  ) {
    return {
      required:
        typeof declaration.required === "boolean" ? declaration.required : true,
      autoApproveWrites: declaration.auto_approve_writes === true,
      source: "request" as const,
    };
  }
  return {
    required: true,
    autoApproveWrites: false,
    source: "default" as const,
  };
}

async function prepareAcpSkillRunHostBridgeCli(args: {
  requestId: string;
  workspaceDir: string;
  request: AcpSkillRunRequestV1;
  runnerJson: Record<string, unknown>;
  backend: BackendInstance;
  dependencies?: AcpSkillRunnerDependencies;
}) {
  const zoteroHostAccess = resolveZoteroHostAccessRequirement({
    request: args.request,
    runnerJson: args.runnerJson,
  });
  const hostBridgeCliInjectionFactory =
    args.dependencies?.hostBridgeCliInjection ||
    ((input: {
      workspaceDir: string;
      requestId: string;
      autoApproveWrites?: boolean;
    }) => materializeHostBridgeCliRunInjection(input));
  const hostBridgeCliInjection = zoteroHostAccess.required
    ? await hostBridgeCliInjectionFactory({
        workspaceDir: args.workspaceDir,
        requestId: args.requestId,
        autoApproveWrites: zoteroHostAccess.autoApproveWrites,
      })
    : createDisabledHostBridgeCliRunInjection();
  const hostBridgeCliState = summarizeHostBridgeCliRunInjection(
    hostBridgeCliInjection,
  );
  const backend = zoteroHostAccess.required
    ? applyHostBridgeCliEnvToBackend({
        backend: args.backend,
        injection: hostBridgeCliInjection,
      })
    : args.backend;

  return {
    backend,
    hostBridgeCliInjection,
    hostBridgeCliState,
    zoteroHostAccess,
    event: {
      stage: zoteroHostAccess.required
        ? hostBridgeCliInjection.available
          ? "host-bridge-cli-ready"
          : "host-bridge-cli-unavailable"
        : "zotero-host-access-disabled",
      message: zoteroHostAccess.required
        ? hostBridgeCliInjection.available
          ? "Host Bridge CLI injection prepared."
          : "Host Bridge CLI is unavailable for this run; MCP fallback is disabled by default."
        : "Zotero host access is disabled for this run.",
      level: zoteroHostAccess.required
        ? hostBridgeCliInjection.available
          ? ("info" as const)
          : ("warn" as const)
        : ("info" as const),
      details: {
        ...hostBridgeCliState,
        zoteroHostAccess,
      },
    },
  };
}

function createAcpHardTimeoutMonitor(args: {
  requestId: string;
  seconds: number;
  source: AcpHardTimeoutSource;
  onTimeout: () => Promise<void>;
}) {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let timeoutPromise: Promise<"timeout"> | null = null;
  let resolveTimeout: (() => void) | null = null;
  let triggered = false;
  let paused = false;

  const armTimer = () => {
    if (timer || paused || triggered || !timeoutPromise) {
      return;
    }
    timer = setTimeout(() => {
      timer = null;
      if (triggered) {
        return;
      }
      triggered = true;
      const resolve = resolveTimeout;
      void args
        .onTimeout()
        .catch((error) => {
          appendRuntimeLog({
            level: "warn",
            scope: "provider",
            providerId: "acp",
            requestId: args.requestId,
            component: "acp-skillrunner",
            operation: "hard-timeout-disconnect",
            phase: "terminal",
            stage: "hard-timeout-disconnect-failed",
            message: errorMessage(error),
            details: {
              hardTimeoutSeconds: args.seconds,
              hardTimeoutSource: args.source,
            },
          });
        })
        .finally(() => {
          resolve?.();
        });
    }, args.seconds * 1000);
  };

  const clear = () => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    timeoutPromise = null;
    resolveTimeout = null;
    triggered = false;
    paused = false;
  };

  const start = () => {
    clear();
    timeoutPromise = new Promise<"timeout">((resolve) => {
      resolveTimeout = () => resolve("timeout");
    });
    armTimer();
  };

  const pause = () => {
    if (!timeoutPromise || triggered) {
      return;
    }
    paused = true;
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
  };

  const resume = () => {
    if (!timeoutPromise || triggered) {
      return;
    }
    paused = false;
    armTimer();
  };

  const race = async <T>(
    promise: Promise<T>,
  ): Promise<{ timedOut: false; value: T } | { timedOut: true }> => {
    if (!timeoutPromise) {
      return { timedOut: false, value: await promise };
    }
    const guarded = promise
      .then((value) => ({ kind: "value" as const, value }))
      .catch((error) => ({ kind: "error" as const, error }));
    const result = await Promise.race([
      guarded,
      timeoutPromise.then(() => ({ kind: "timeout" as const })),
    ]);
    if (result.kind === "timeout") {
      promise.catch(() => undefined);
      return { timedOut: true };
    }
    if (result.kind === "error") {
      throw result.error;
    }
    if (triggered) {
      return { timedOut: true };
    }
    return { timedOut: false, value: result.value };
  };

  return {
    start,
    clear,
    pause,
    resume,
    race,
    isTriggered: () => triggered,
  };
}

async function waitForAcpHardTimeoutTranscriptDrain(
  promptSettled: Promise<unknown> | null,
) {
  if (!promptSettled) {
    return;
  }
  let timer: ReturnType<typeof setTimeout> | null = null;
  try {
    await Promise.race([
      promptSettled.catch(() => undefined),
      new Promise<void>((resolve) => {
        timer = setTimeout(resolve, ACP_HARD_TIMEOUT_TRANSCRIPT_DRAIN_MS);
      }),
    ]);
  } finally {
    if (timer) {
      clearTimeout(timer);
    }
  }
}

async function defaultRequiredMcpPreflight(args: {
  requiredTools: string[];
  initialized: AcpConnectionInitializeResult;
}) {
  if (!args.requiredTools.length) {
    return {
      ok: true,
      availableTools: [] as string[],
      missingTools: [] as string[],
    };
  }
  if (!args.initialized.canUseHttpMcp) {
    return {
      ok: false,
      availableTools: [] as string[],
      missingTools: args.requiredTools,
      message: "ACP backend did not advertise HTTP MCP support.",
    };
  }
  try {
    await ensureZoteroMcpServer();
  } catch (error) {
    return {
      ok: false,
      availableTools: [] as string[],
      missingTools: args.requiredTools,
      message:
        error instanceof Error
          ? `Embedded Zotero MCP server is unavailable: ${error.message}`
          : `Embedded Zotero MCP server is unavailable: ${String(error || "unknown error")}`,
    };
  }
  const availableTools = listZoteroMcpTools()
    .map((tool) => normalizeString(tool.name))
    .filter(Boolean);
  const available = new Set(availableTools);
  const missingTools = args.requiredTools.filter(
    (tool) => !available.has(tool),
  );
  return {
    ok: missingTools.length === 0,
    availableTools,
    missingTools,
    message: missingTools.length
      ? `Required Zotero MCP tools are missing: ${missingTools.join(", ")}`
      : "Required Zotero MCP tools are available.",
  };
}

async function preflightRequiredMcpTools(args: {
  requestId: string;
  backend: BackendInstance;
  workspace: AcpSkillRunnerWorkspace;
  adapter: AcpConnectionAdapter;
  requiredTools: string[];
  probe?: AcpRequiredMcpPreflightProbe;
}) {
  const requiredTools = args.requiredTools;
  if (!requiredTools.length) {
    return {
      ok: true,
      availableTools: [] as string[],
      missingTools: [] as string[],
    };
  }
  const initialized = await args.adapter.initialize();
  const result = await (args.probe || defaultRequiredMcpPreflight)({
    requiredTools,
    initialized,
    requestId: args.requestId,
    backend: args.backend,
    workspace: args.workspace,
  });
  upsertAcpSkillRun({
    requestId: args.requestId,
    event: {
      stage: result.ok ? "mcp-preflight-ok" : "mcp-preflight-failed",
      message:
        result.message ||
        (result.ok
          ? "Required Zotero MCP tools are available."
          : "Required Zotero MCP tools are unavailable."),
      level: result.ok ? "info" : "error",
      details: {
        requiredTools,
        availableTools: result.availableTools || [],
        missingTools: result.missingTools || [],
      },
    },
  });
  appendRuntimeLog({
    level: result.ok ? "info" : "error",
    scope: "provider",
    backendId: args.backend.id,
    backendType: args.backend.type,
    providerId: "acp",
    requestId: args.requestId,
    component: "acp-skillrunner",
    operation: "mcp-preflight",
    phase: result.ok ? "complete" : "terminal",
    stage: result.ok ? "mcp-preflight-ok" : "mcp-preflight-failed",
    message:
      result.message ||
      (result.ok
        ? "Required Zotero MCP tools are available."
        : "Required Zotero MCP tools are unavailable."),
    details: {
      requiredTools,
      availableTools: result.availableTools || [],
      missingTools: result.missingTools || [],
    },
  });
  if (!result.ok) {
    const missing = result.missingTools?.length
      ? ` Missing tools: ${result.missingTools.join(", ")}.`
      : "";
    throw new Error(
      `${result.message || "Required Zotero MCP preflight failed."}${missing}`,
    );
  }
  return result;
}

async function renderRequiredMcpGuardPrompt(requiredTools: string[]) {
  if (!requiredTools.length) {
    return "";
  }
  const template = await loadAcpRuntimePromptTemplate(
    ACP_RUNTIME_PROMPT_TEMPLATES_BY_ID.mcp_required_guard,
  );
  return renderAcpRuntimePromptTemplate({
    template,
    replacements: {
      REQUIRED_TOOLS_INLINE: requiredTools.join(", "),
    },
    requiredPlaceholders: ["REQUIRED_TOOLS_INLINE"],
  });
}

async function withRequiredMcpGuard(message: string, requiredTools: string[]) {
  const guard = await renderRequiredMcpGuardPrompt(requiredTools);
  if (!guard) {
    return message;
  }
  return `${guard}\n\n${message}`;
}

type PermissionRequestWithResolver = Parameters<
  typeof setAcpSkillRunPermissionRequest
>[1];

function resolveAutoApproveAcpPermissionOption(
  request: PermissionRequestWithResolver,
) {
  return resolveAutoApproveAcpPermissionOptionId(
    request.source,
    request.options,
  );
}

function handleAcpSkillRunPermissionRequest(args: {
  requestId: string;
  request: PermissionRequestWithResolver;
}) {
  if (
    getAcpSkillRunRecord(args.requestId)?.providerOptions
      ?.autoApproveAcpPermissions === true
  ) {
    const optionId = resolveAutoApproveAcpPermissionOption(args.request);
    if (
      optionId &&
      autoApproveAcpSkillRunPermissionRequest({
        runRequestId: args.requestId,
        request: args.request,
        optionId,
      })
    ) {
      return;
    }
  }
  setAcpSkillRunPermissionRequest(args.requestId, args.request);
}

function wrapAcpSkillRunPermissionRequestForTimeoutPause(args: {
  request: PermissionRequestWithResolver;
  pause: (requestId: string) => void;
  resume: (requestId: string) => void;
}) {
  const permissionRequestId = normalizeString(args.request.requestId);
  if (!permissionRequestId) {
    return args.request;
  }
  args.pause(permissionRequestId);
  let resolved = false;
  return {
    ...args.request,
    resolve: (
      outcome: Parameters<PermissionRequestWithResolver["resolve"]>[0],
    ) => {
      try {
        args.request.resolve(outcome);
      } finally {
        if (!resolved) {
          resolved = true;
          args.resume(permissionRequestId);
        }
      }
    },
  };
}

function rememberAcpSkillRunRuntimeCatalog(args: {
  requestId: string;
  backend: BackendInstance;
}) {
  const cache = args.backend.acp?.runtimeOptionsCache;
  const state = resolveAcpRuntimeOptionsState({ cache });
  setAcpSkillRunRuntimeCatalog(args.requestId, {
    modeOptions: state.modes,
    modelOptions: state.rawModels,
    displayModelOptions: state.displayModels,
    reasoningEffortOptions: state.reasoningEfforts,
    reasoningSource: state.reasoningSource,
  });
}

function refreshAcpSkillRunRuntimeCatalogFromSession(args: {
  requestId: string;
  backend?: BackendInstance;
  session: Pick<
    AcpConnectionNewSessionResult,
    "configOptions" | "modes" | "models"
  >;
}) {
  const run = getAcpSkillRunRecord(args.requestId);
  if (!run) {
    return;
  }
  const observed = resolveAcpRuntimeOptionsState({
    configOptions: args.session.configOptions,
    modes: args.session.modes,
    models: args.session.models,
    fallbackToFirst: false,
  });
  const sessionState = resolveAcpRuntimeOptionsState({
    configOptions: args.session.configOptions,
    modes: args.session.modes,
    models: args.session.models,
    cache: args.backend?.acp?.runtimeOptionsCache,
    overrides: {
      modeId: run.acpModeId,
      rawModelId: run.acpRawModelId,
      displayModelId: run.acpModelId,
      reasoningEffortId: run.acpReasoningEffort,
    },
    fallbackToFirst: false,
  });
  setAcpSkillRunRuntimeCatalog(args.requestId, {
    modeOptions: sessionState.modes,
    modelOptions: sessionState.rawModels,
    displayModelOptions: sessionState.displayModels,
    reasoningEffortOptions: sessionState.reasoningEfforts,
    reasoningSource: sessionState.reasoningSource,
  });
  const selection = normalizeAcpSkillRuntimeSelection({
    options: {
      acpModeId: run.acpModeId,
      acpModelId: run.acpModelId,
      acpReasoningEffort: run.acpReasoningEffort,
    },
    cache: {
      ...sessionState,
      currentModeId: observed.currentModeId || sessionState.currentModeId,
      currentRawModelId:
        observed.currentRawModelId || sessionState.currentRawModelId,
      currentDisplayModelId:
        observed.currentDisplayModelId || sessionState.currentDisplayModelId,
      currentReasoningEffortId:
        observed.currentReasoningEffortId ||
        sessionState.currentReasoningEffortId,
    },
  });
  updateAcpSkillRunRuntimeSelection({
    requestId: args.requestId,
    selection: {
      modeId: selection.modeId || "",
      modelId: selection.modelId || "",
      rawModelId: selection.rawModelId || "",
      reasoningEffort: selection.reasoningEffort || null,
    },
  });
}

function shouldSkipInitialAcpModelSet(args: {
  targetRawModelId?: unknown;
  sessionCurrentModelId?: unknown;
}) {
  const targetRawModelId = normalizeString(args.targetRawModelId);
  const sessionCurrentModelId = normalizeString(args.sessionCurrentModelId);
  return !!targetRawModelId && targetRawModelId === sessionCurrentModelId;
}

async function applyAcpSkillRunRuntimeSelection(args: {
  adapter: AcpConnectionAdapter;
  backend?: BackendInstance;
  requestId: string;
  sessionId: string;
  sessionCurrentModelId?: string;
}) {
  const run = getAcpSkillRunRecord(args.requestId);
  if (!run) {
    return;
  }
  const modeId = normalizeString(run.acpModeId);
  const rawModelId = normalizeString(run.acpRawModelId);
  const reasoningEffort = normalizeString(run.acpReasoningEffort);
  const catalog = getAcpSkillRunRuntimeCatalog(args.requestId);
  const modeAllowed =
    !!modeId && !!catalog?.modeOptions.some((entry) => entry.id === modeId);
  const rawModelAllowed =
    !!rawModelId &&
    !!catalog?.modelOptions.some((entry) => entry.id === rawModelId);
  const reasoningAllowed =
    !!reasoningEffort &&
    !!catalog?.reasoningEffortOptions.some(
      (entry) => entry.id === reasoningEffort,
    );
  const rejectUnavailable = (optionKey: string) => {
    upsertAcpSkillRun({
      requestId: args.requestId,
      event: {
        stage: "provider-profile-option-rejected",
        message: "A requested provider profile option is unavailable.",
        level: "error",
        details: {
          optionKey,
          reasonCode: "provider_profile_option_unavailable",
        },
      },
    });
    const error = new Error(
      `Provider profile option is unavailable: ${optionKey}`,
    );
    (error as { code?: string }).code = "provider_profile_option_unavailable";
    throw error;
  };
  if (modeId && !modeAllowed) rejectUnavailable("acpModeId");
  if (rawModelId && !rawModelAllowed) rejectUnavailable("acpModelId");
  if (reasoningEffort && !reasoningAllowed) {
    rejectUnavailable("acpReasoningEffort");
  }
  const recordApplied = (optionKey: string) => {
    upsertAcpSkillRun({
      requestId: args.requestId,
      event: {
        stage: "provider-profile-option-applied",
        message: "A provider profile option was applied before prompting.",
        level: "info",
        details: { optionKey },
      },
    });
  };
  const recordApplyFailure = (optionKey: string, reasonCode: string) => {
    upsertAcpSkillRun({
      requestId: args.requestId,
      event: {
        stage: "provider-profile-option-rejected",
        message: "A provider profile option could not be applied.",
        level: "error",
        details: { optionKey, reasonCode },
      },
    });
  };
  const applyOption = async (
    optionKey: string,
    apply: () => Promise<unknown>,
  ) => {
    try {
      await apply();
      recordApplied(optionKey);
    } catch (error) {
      recordApplyFailure(optionKey, "provider_profile_option_apply_failed");
      throw error;
    }
  };
  if (modeAllowed) {
    await applyOption("acpModeId", () =>
      args.adapter.setMode({ sessionId: args.sessionId, modeId }),
    );
  }
  const skipInitialModelSet = shouldSkipInitialAcpModelSet({
    targetRawModelId: rawModelId,
    sessionCurrentModelId: args.sessionCurrentModelId,
  });
  if (rawModelAllowed && !skipInitialModelSet) {
    await applyOption("acpModelId", () =>
      args.adapter.setModel({
        sessionId: args.sessionId,
        modelId: rawModelId,
      }),
    );
  } else if (rawModelAllowed) {
    recordApplied("acpModelId");
  }
  const reasoningSource = catalog?.reasoningSource || "none";
  if (
    reasoningAllowed &&
    (reasoningSource === "explicit" ||
      (reasoningSource === "none" && !rawModelId))
  ) {
    const reasoningResult = await applyAcpReasoningEffortWithFallback({
      adapter: args.adapter,
      backend: args.backend,
      sessionId: args.sessionId,
      effortId: reasoningEffort,
    });
    if (reasoningResult.kind === "fallback") {
      upsertAcpSkillRun({
        requestId: args.requestId,
        event: {
          stage: "provider-profile-option-fallback",
          message:
            "Reasoning effort setting was rejected by the backend; continuing without it.",
          level: "warn",
          details: {
            optionKey: "acpReasoningEffort",
            reasonCode: "provider_profile_reasoning_effort_fallback",
            error: reasoningResult.error.message,
          },
        },
      });
    } else {
      recordApplied("acpReasoningEffort");
    }
  } else if (reasoningAllowed && reasoningSource === "model-derived") {
    recordApplied("acpReasoningEffort");
  }
}

async function runPrompt(args: {
  adapter: AcpConnectionAdapter;
  backend?: BackendInstance;
  requestId: string;
  message: string;
  sessionId?: string;
  prepareSession?: (sessionId: string) => Promise<void>;
  onPromptReady?: (sessionId: string) => void | Promise<void>;
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
    const session = await args.adapter.newSession();
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
        },
      },
    });
    await applyAcpSkillRunRuntimeSelection({
      adapter: args.adapter,
      backend: args.backend,
      requestId: args.requestId,
      sessionId,
      sessionCurrentModelId: session.models?.currentModelId || "",
    });
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

function resolveWorkflowSkillName(args: {
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

function resolveRecoveredWorkflowIdFromTask(
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

async function continueRecoveredSequenceStep(args: {
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
    !!record.pendingInteraction &&
    (record.status === "waiting_user" ||
      record.outputConvergenceState === "pending" ||
      record.status === "running" ||
      record.status === "failed_retriable")
  ) {
    return true;
  }
  if (
    record.status === "succeeded" ||
    record.status === "canceled" ||
    record.applyResultState === "succeeded" ||
    !normalizeString(record.sessionId)
  ) {
    return false;
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
        error: "",
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
    throw new AcpPromptFailureError(diagnostic);
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
      upsertAcpSkillRun({
        requestId,
        ...CONFIRMED_ACP_SKILL_PROMPT_INTERRUPTION_STATE,
        event: {
          stage: "interrupt-confirmed",
          message: "ACP skill run current turn interrupted.",
          level: "warn",
          details: { recovered: true, stopReason: promptOutcome.stopReason },
        },
      });
      return;
    }
    if (!shouldContinueWorkflow) {
      upsertAcpSkillRun({
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
      });
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
    registerAcpSkillRunController(requestId, {
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
                    details: { recovered: true },
                  },
                });
                return;
              }
              upsertAcpSkillRun({
                requestId,
                status: "waiting_user",
                statusReason: "interrupt_turn",
                activePrompt: false,
                promptInterruptState: "forced",
                conversationState: "closed",
                conversationRecoveryState: "available",
                event: {
                  stage: "interrupt-forced",
                  message:
                    "ACP skill run prompt did not confirm cancellation and was force-stopped.",
                  level: "warn",
                  details: { recovered: true },
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
    });
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
    acpReasoningEffort: submittedRuntimeSelection.reasoningEffort,
    acpRawModelId: submittedRuntimeSelection.rawModelId,
    event: {
      stage: "workspace-created",
      message: "ACP skill run workspace created.",
      level: "info",
      details: {
        workspaceDir: workspace.workspaceDir,
      },
    },
  });
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
      },
    },
  });
  rememberAcpSkillRunRuntimeCatalog({
    requestId: workspace.requestId,
    backend: args.backend,
  });
  args.onProgress?.({
    type: "request-created",
    requestId: workspace.requestId,
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
      },
    },
  });
  upsertAcpSkillRun({
    requestId: workspace.requestId,
    executionMode,
    primarySkillDir: materialization.primarySkillDir,
    runnerJson: materialization.runnerJson,
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
  const { hostBridgeCliInjection, hostBridgeCliState, zoteroHostAccess } =
    hostBridgePreparation;
  upsertAcpSkillRun({
    requestId: workspace.requestId,
    hostBridgeCli: hostBridgeCliState,
    event: hostBridgePreparation.event,
  });
  const dependencyPlan = await buildAcpRuntimeDependencyPlan({
    backend: hostBridgePreparation.backend,
    runnerJson: materialization.runnerJson,
    cwd: workspace.workspaceDir,
    mode: "probe-and-wrap",
    probe: args.dependencies?.dependencyProbe,
  });
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
      },
    },
  });
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
  } catch (error) {
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
  let cancellationRequested = false;
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
    registerAcpSkillRunController(workspace.requestId, null);
    const latest = getAcpSkillRunRecord(workspace.requestId);
    const applyFailedTerminal =
      latest?.status === "failed" && latest.applyResultState === "failed";
    upsertAcpSkillRun({
      requestId: workspace.requestId,
      activePrompt: false,
      conversationState: options?.conversationState,
      conversationRecoveryState:
        options?.conversationState === "ended" || applyFailedTerminal
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
        onPromptReady: () => {
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
  registerAcpSkillRunController(workspace.requestId, {
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
  });
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
