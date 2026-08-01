import type { BackendInstance } from "../backends/types";
import { ACP_SKILL_RUN_REQUEST_KIND } from "../config/defaults";
import type { AcpSkillRunRequestV1 } from "../providers/contracts";
import { appendRuntimeLog } from "./runtimeLogManager";
import { recordAcpRuntimeDiagnostic } from "./acpDiagnosticRouter";
import {
  appendAcpSkillRunAuditDiagnostic,
  writeAcpSkillRunAuditPrompt,
} from "./acpSkillRunAuditTrail";
import type { AcpDiagnosticsEntry } from "./acpTypes";
import {
  listRuntimeChildren,
  readRuntimeTextFile,
  statRuntimePath,
} from "./runtimePersistence";
import { buildAcpSkillRunPrompt } from "./acpSkillRunPromptBuilder";
import {
  buildAcpStartupPromptPreamble,
  prependAcpStartupPromptPreamble,
  resolveAcpStartupInstructionFile,
} from "./acpStartupPromptPreambles";
import {
  applyHostBridgeCliEnvToBackend,
  createDisabledHostBridgeCliRunInjection,
  materializeHostBridgeCliRunInjection,
  summarizeHostBridgeCliRunInjection,
} from "./hostBridgeCliInjection";
import {
  ACP_RUNTIME_PROMPT_TEMPLATES_BY_ID,
  loadAcpRuntimePromptTemplate,
  renderAcpRuntimePromptTemplate,
} from "./acpRuntimePromptTemplates";
import { ensureZoteroMcpServer } from "./zoteroMcpServer";
import { listZoteroMcpTools } from "./zoteroMcpProtocol";
import {
  normalizeAcpSkillRuntimeSelection,
  resolveAcpRuntimeOptionsState,
} from "./acpSessionConfigOptions";
import { applyAcpReasoningEffortWithFallback } from "./acpReasoningEffortFallback";
import { resolveAutoApproveAcpPermissionOptionId } from "./acpPermissionOptions";
import type {
  AcpConnectionAdapter,
  AcpConnectionInitializeResult,
  AcpConnectionNewSessionResult,
} from "./acpConnectionAdapter";
import type { AcpSkillOutputConvergenceResult } from "./acpSkillOutputConvergence";
import {
  autoApproveAcpSkillRunPermissionRequest,
  getAcpSkillRunRecord,
  getAcpSkillRunRuntimeCatalog,
  setAcpSkillRunRuntimeCatalog,
  setAcpSkillRunPermissionRequest,
  updateAcpSkillRunRuntimeSelection,
  upsertAcpSkillRun,
} from "./acpSkillRunStore";
import type { AcpSkillRunnerWorkspace } from "./acpSkillRunnerWorkspace";
import type {
  AcpPromptOutcome,
  AcpSkillRunnerDependencies,
  AcpSkillRunnerRunContext,
} from "./acpSkillRunnerOrchestrator";

const DEFAULT_ACP_SKILL_HARD_TIMEOUT_SECONDS = 1200;
export const DEFAULT_ACP_PROMPT_INTERRUPT_GRACE_MS = 10_000;
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

function normalizeString(value: unknown) {
  return String(value || "").trim();
}

export function recordAcpSkillRunAdapterDiagnostic(args: {
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

export function resolveAcpProfileZoteroMajor(): 7 | 9 | "unknown" {
  const major = Number.parseInt(String(Zotero?.version || ""), 10);
  return major === 7 || major === 9 ? major : "unknown";
}
export function isObservableAcpPromptOutputUpdateKind(value: unknown) {
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

export function errorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : String(error || "unknown error");
}

export const CONFIRMED_ACP_SKILL_PROMPT_INTERRUPTION_STATE = {
  status: "waiting_user",
  statusReason: "interrupt_turn",
  activePrompt: false,
  replyState: "idle",
  conversationState: "active",
  conversationRecoveryState: "connected",
  promptInterruptState: "confirmed",
} as const;

export function markAcpSkillRunContinuationRunning(args: {
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
type InvalidAcpSkillOutputConvergence = Extract<
  AcpSkillOutputConvergenceResult,
  { kind: "invalid" }
>;

export function buildAcpSkillOutputValidationFailureDetails(args: {
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

export function appendAcpSkillOutputValidationFailureRuntimeLog(args: {
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

export function isJsonObject(value: unknown): value is Record<string, unknown> {
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

export function cloneJsonObject(
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

export function resolveWorkflowWorkspaceIntent(request: AcpSkillRunRequestV1) {
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

export async function findWorkspaceActivitySnapshot(rootDir: string) {
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

export function assertAcpSkillRunRequest(value: unknown): AcpSkillRunRequestV1 {
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

export function resolveJobId(request: AcpSkillRunRequestV1) {
  return (
    normalizeString(request.taskName) ||
    normalizeString(request.targetParentID) ||
    normalizeString(request.skill_id) ||
    "job"
  );
}

export async function buildRunPrompt(args: {
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

export function resolveExecutionMode(
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

export async function readRunnerJsonForExecutionMode(path: string) {
  try {
    return JSON.parse(await readRuntimeTextFile(path)) as Record<
      string,
      unknown
    >;
  } catch {
    return {};
  }
}

export function resolveRunnerRequiredMcpTools(
  runnerJson: Record<string, unknown>,
) {
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

export function resolveRequiredMcpTools(args: {
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

export async function prepareAcpSkillRunHostBridgeCli(args: {
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

export function createAcpHardTimeoutMonitor(args: {
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

export async function waitForAcpHardTimeoutTranscriptDrain(
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

export function handleAcpSkillRunPermissionRequest(args: {
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

export function wrapAcpSkillRunPermissionRequestForTimeoutPause(args: {
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

export function rememberAcpSkillRunRuntimeCatalog(args: {
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

export function refreshAcpSkillRunRuntimeCatalogFromSession(args: {
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

export async function applyAcpSkillRunRuntimeSelection(args: {
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
