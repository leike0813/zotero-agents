import type { BackendInstance } from "../backends/types";
import { listBackendInstances } from "../backends/registry";
import { ACP_SKILL_RUN_REQUEST_KIND } from "../config/defaults";
import type {
  AcpSkillRunRequestV1,
  ProviderExecutionResult,
} from "../providers/contracts";
import { executeApplyResult } from "../workflows/runtime";
import { canWorkflowRunWithoutSelection } from "../workflows/triggerPolicy";
import {
  getLoadedWorkflowEntries,
  rescanWorkflowRegistry,
} from "./workflowRuntime";
import { createUnavailableBundleReader } from "./workflowExecution/bundleIO";
import { createWorkflowResultContext } from "./workflowExecution/resultContext";
import { resolveTargetParentIDFromRequest } from "./workflowExecution/requestMeta";
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
import {
  applyHostBridgeCliEnvToBackend,
  createDisabledHostBridgeCliRunInjection,
  materializeHostBridgeCliRunInjection,
  summarizeHostBridgeCliRunInjection,
  type HostBridgeCliRunInjection,
} from "./hostBridgeCliInjection";
import {
  createAcpSkillRunnerWorkspace,
  writeAcpSkillRunnerInputManifest,
  type AcpSkillRunnerWorkspace,
} from "./acpSkillRunnerWorkspace";
import {
  materializeAcpSkill,
  type AcpSkillMaterializationResult,
} from "./acpSkillMaterializer";
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
  type AcpConnectionInitializeResult,
} from "./acpConnectionAdapter";
import { ensureZoteroMcpServer } from "./zoteroMcpServer";
import { listZoteroMcpTools } from "./zoteroMcpProtocol";
import {
  appendAcpSkillRunUserReply,
  getAcpSkillRunRecord,
  markAcpSkillRunApplyResult,
  projectAcpSkillRunOutputEnvelopeToTranscript,
  registerAcpSkillRunController,
  recordAcpSkillRunOutputRevision,
  recordAcpSkillRunSessionUpdate,
  resolveAcpSkillRunPermissionRequest,
  setAcpSkillRunPermissionRequest,
  setAcpSkillRunRecoveryHandler,
  setAcpSkillRunRuntimeOptions,
  upsertAcpSkillRun,
} from "./acpSkillRunStore";
import { resolveAcpRawModelIdForSelection } from "./acpModelOptionFolding";
import {
  listWorkflowTasks,
  updateWorkflowTaskStateByRequest,
} from "./taskRuntime";
import {
  listRuntimeChildren,
  readRuntimeTextFile,
  statRuntimePath,
} from "./runtimePersistence";
import { continueSkillRunnerSequence } from "./workflowExecution/sequenceRuntime";
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
  maxRepairRounds?: number;
  sharedSkillCatalogRootDir?: string;
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

function errorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : String(error || "unknown error");
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

function isJsonObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
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
  const raw = request.runtime_options?.workflow_workspace;
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
  return basePrompt;
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

type FrozenAcpRuntimeOptions = {
  modeId?: string;
  modelId?: string;
  reasoningEffort?: string;
  rawModelId?: string;
  autoApproveAcpPermissions?: boolean;
};

type PermissionRequestWithResolver = Parameters<
  typeof setAcpSkillRunPermissionRequest
>[1];

function resolveAutoApproveAcpPermissionOption(
  request: PermissionRequestWithResolver,
) {
  if (normalizeString(request.source) !== "acp-tool-call") {
    return "";
  }
  const options = Array.isArray(request.options) ? request.options : [];
  const approve = options.find(
    (option) => normalizeString(option.optionId) === "approve",
  );
  if (approve) {
    return normalizeString(approve.optionId);
  }
  const allowByKind = options.find((option) => {
    const kind = normalizeString(option.kind);
    return kind === "allow" || kind === "allow_once" || kind === "allow_always";
  });
  if (allowByKind) {
    return normalizeString(allowByKind.optionId);
  }
  const allowById = options.find((option) =>
    normalizeString(option.optionId).startsWith("allow"),
  );
  return allowById ? normalizeString(allowById.optionId) : "";
}

function handleAcpSkillRunPermissionRequest(args: {
  requestId: string;
  request: PermissionRequestWithResolver;
  runtimeOptions?: FrozenAcpRuntimeOptions;
}) {
  setAcpSkillRunPermissionRequest(args.requestId, args.request);
  if (args.runtimeOptions?.autoApproveAcpPermissions !== true) {
    return;
  }
  const optionId = resolveAutoApproveAcpPermissionOption(args.request);
  if (!optionId) {
    return;
  }
  resolveAcpSkillRunPermissionRequest({
    runRequestId: args.requestId,
    permissionRequestId: args.request.requestId,
    outcome: "selected",
    optionId,
  });
}

function rememberAcpSkillRunRuntimeOptions(args: {
  requestId: string;
  backend: BackendInstance;
}) {
  const cache = args.backend.acp?.runtimeOptionsCache;
  setAcpSkillRunRuntimeOptions(args.requestId, {
    modeOptions: cache?.modes || [],
    currentMode: cache?.currentModeId
      ? (cache?.modes || []).find(
          (entry) => entry.id === cache.currentModeId,
        ) || { id: cache.currentModeId, label: cache.currentModeId }
      : undefined,
    modelOptions: cache?.rawModels || [],
    currentModel: cache?.currentRawModelId
      ? (cache?.rawModels || []).find(
          (entry) => entry.id === cache.currentRawModelId,
        ) || { id: cache.currentRawModelId, label: cache.currentRawModelId }
      : undefined,
    displayModelOptions: cache?.displayModels || [],
    currentDisplayModel: cache?.currentDisplayModelId
      ? (cache?.displayModels || []).find(
          (entry) => entry.id === cache.currentDisplayModelId,
        ) || {
          id: cache.currentDisplayModelId,
          label: cache.currentDisplayModelId,
        }
      : undefined,
    reasoningEffortOptions: cache?.reasoningEfforts || [],
    currentReasoningEffort: cache?.currentReasoningEffortId
      ? (cache?.reasoningEfforts || []).find(
          (entry) => entry.id === cache.currentReasoningEffortId,
        ) || {
          id: cache.currentReasoningEffortId,
          label: cache.currentReasoningEffortId,
        }
      : undefined,
  });
}

function resolveFrozenAcpRuntimeOptions(args: {
  backend: BackendInstance;
  providerOptions?: Record<string, unknown>;
}): FrozenAcpRuntimeOptions {
  const cache = args.backend.acp?.runtimeOptionsCache;
  const options = args.providerOptions || {};
  const modeId =
    normalizeString(options.acpModeId) || cache?.currentModeId || "";
  const modelId =
    normalizeString(options.acpModelId) || cache?.currentDisplayModelId || "";
  const reasoningEffort =
    normalizeString(options.acpReasoningEffort) ||
    cache?.currentReasoningEffortId ||
    "";
  const rawModelId = resolveAcpRawModelIdForSelection({
    modelOptions: cache?.rawModels || [],
    displayModelId: modelId,
    effortId: reasoningEffort,
    currentRawModelId: cache?.currentRawModelId,
  });
  return {
    ...(modeId ? { modeId } : {}),
    ...(modelId ? { modelId } : {}),
    ...(reasoningEffort ? { reasoningEffort } : {}),
    ...(rawModelId ? { rawModelId } : {}),
    ...(options.autoApproveAcpPermissions === true
      ? { autoApproveAcpPermissions: true }
      : {}),
  };
}

function shouldSkipInitialAcpModelSet(args: {
  targetRawModelId?: unknown;
  sessionCurrentModelId?: unknown;
}) {
  const targetRawModelId = normalizeString(args.targetRawModelId);
  const sessionCurrentModelId = normalizeString(args.sessionCurrentModelId);
  return !!targetRawModelId && targetRawModelId === sessionCurrentModelId;
}

async function runPrompt(args: {
  adapter: AcpConnectionAdapter;
  requestId: string;
  message: string;
  runtimeOptions?: FrozenAcpRuntimeOptions;
  sessionId?: string;
  prepareSession?: (sessionId: string) => Promise<void>;
}): Promise<{ sessionId: string; stopReason: string }> {
  let sessionId = String(args.sessionId || "").trim();
  if (!sessionId) {
    const session = await args.adapter.newSession();
    sessionId = session.sessionId;
    upsertAcpSkillRun({
      requestId: args.requestId,
      sessionId,
      conversationState: "active",
      activePrompt: true,
      event: {
        stage: "acp-session-created",
        message: "ACP task session created.",
        level: "info",
        details: {
          sessionId,
        },
      },
    });
    if (args.runtimeOptions?.modeId) {
      await args.adapter.setMode({
        sessionId,
        modeId: args.runtimeOptions.modeId,
      });
    }
    if (args.runtimeOptions?.rawModelId) {
      const currentModelId = normalizeString(session.models?.currentModelId);
      if (
        !shouldSkipInitialAcpModelSet({
          targetRawModelId: args.runtimeOptions.rawModelId,
          sessionCurrentModelId: currentModelId,
        })
      ) {
        await args.adapter.setModel({
          sessionId,
          modelId: args.runtimeOptions.rawModelId,
        });
      }
    }
    if (args.runtimeOptions?.reasoningEffort) {
      await args.adapter.setConfigOption?.({
        sessionId,
        category: "thought_level",
        value: args.runtimeOptions.reasoningEffort,
      });
    }
  } else {
    upsertAcpSkillRun({
      requestId: args.requestId,
      sessionId,
      conversationState: "active",
      activePrompt: true,
    });
  }
  if (args.prepareSession) {
    await args.prepareSession(sessionId);
    upsertAcpSkillRun({
      requestId: args.requestId,
      sessionId,
      conversationState: "active",
      activePrompt: true,
    });
  }
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
  return { sessionId, stopReason };
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
  const request = args.record.requestPayload;
  const targetParentID = resolveTargetParentIDFromRequest(request);
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
    markAcpSkillRunApplyResult({
      requestId: args.record.requestId,
      state: "succeeded",
    });
    updateWorkflowTaskStateByRequest({
      backendId: args.record.backendId,
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
    updateWorkflowTaskStateByRequest({
      backendId: args.record.backendId,
      requestId: args.record.requestId,
      state: "failed",
      error: message,
    });
    throw error;
  }
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
  recordSequenceStepSucceeded({
    sequenceRunId: sequenceState.sequenceRunId,
    stepIndex,
    requestId: args.record.requestId,
    output: args.resultJson,
    result: recoveredResult,
  });
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
}) {
  const initialized = await args.adapter.initialize();
  if (initialized.canResumeSession) {
    try {
      await args.adapter.resumeSession({ sessionId: args.sessionId });
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
    await args.adapter.loadSession({ sessionId: args.sessionId });
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
      record.status === "failed")
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
  if (record.status === "failed" && !!record.pendingInteraction) {
    return true;
  }
  return (
    (record.status === "running" ||
      record.status === "repairing" ||
      record.status === "failed") &&
    !!record.runnerJson &&
    !!normalizeString(record.primarySkillDir)
  );
}

function resolveRecoveredRuntimeOptions(
  record: NonNullable<ReturnType<typeof getAcpSkillRunRecord>>,
): FrozenAcpRuntimeOptions {
  return {
    ...(normalizeString(record.acpModeId)
      ? { modeId: normalizeString(record.acpModeId) }
      : {}),
    ...(normalizeString(record.acpModelId)
      ? { modelId: normalizeString(record.acpModelId) }
      : {}),
    ...(normalizeString(record.acpReasoningEffort)
      ? { reasoningEffort: normalizeString(record.acpReasoningEffort) }
      : {}),
    ...(normalizeString(record.acpRawModelId)
      ? { rawModelId: normalizeString(record.acpRawModelId) }
      : {}),
    ...(record.providerOptions?.autoApproveAcpPermissions === true
      ? { autoApproveAcpPermissions: true }
      : {}),
  };
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

async function applyRecoveredRuntimeOptions(args: {
  adapter: AcpConnectionAdapter;
  requestId: string;
  sessionId: string;
  runtimeOptions: FrozenAcpRuntimeOptions;
}) {
  if (args.runtimeOptions.modeId) {
    await args.adapter.setMode({
      sessionId: args.sessionId,
      modeId: args.runtimeOptions.modeId,
    });
  }
  if (args.runtimeOptions.rawModelId) {
    await args.adapter.setModel({
      sessionId: args.sessionId,
      modelId: args.runtimeOptions.rawModelId,
    });
  }
  if (args.runtimeOptions.reasoningEffort) {
    await args.adapter.setConfigOption?.({
      sessionId: args.sessionId,
      category: "thought_level",
      value: args.runtimeOptions.reasoningEffort,
    });
  }
  if (
    args.runtimeOptions.modeId ||
    args.runtimeOptions.rawModelId ||
    args.runtimeOptions.reasoningEffort
  ) {
    upsertAcpSkillRun({
      requestId: args.requestId,
      event: {
        stage: "session-runtime-options-restored",
        message: "Recovered ACP session runtime options restored.",
        level: "info",
        details: {
          modeId: args.runtimeOptions.modeId,
          modelId: args.runtimeOptions.modelId,
          rawModelId: args.runtimeOptions.rawModelId,
          reasoningEffort: args.runtimeOptions.reasoningEffort,
        },
      },
    });
  }
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
  const recoveredRuntimeOptions = resolveRecoveredRuntimeOptions(record);
  const recoveredRequest =
    record.requestPayload &&
    typeof record.requestPayload === "object" &&
    !Array.isArray(record.requestPayload) &&
    (record.requestPayload as { kind?: unknown }).kind ===
      ACP_SKILL_RUN_REQUEST_KIND
      ? (record.requestPayload as AcpSkillRunRequestV1)
      : null;
  const recoveredRequiredMcpTools = recoveredRequest
    ? resolveRequiredMcpTools({
        request: recoveredRequest,
        runnerJson: (record.runnerJson || {}) as Record<string, unknown>,
      })
    : resolveRunnerRequiredMcpTools(
        (record.runnerJson || {}) as Record<string, unknown>,
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
  rememberAcpSkillRunRuntimeOptions({ requestId, backend });
  const runnerJson = record.runnerJson || {};
  const dependencyPlan = await buildAcpRuntimeDependencyPlan({
    backend,
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
  const adapter = await createAdapter({
    backend: dependencyPlan.wrappedBackend,
    agentWorkspaceDir: workspaceDir,
    sessionCwd: workspaceDir,
    workspaceDir,
    runtimeDir,
  });
  let cleanupDone = false;
  let captureAssistantText = false;
  let currentTurnAssistantText = "";
  let currentTurnObservedAcpActivity = false;
  let promptChain = Promise.resolve();
  let liveSessionId = sessionId;
  let recoveredPromptActive = false;
  let recoveredInterruptionRequested = false;
  let recoveredDisconnectRequested = false;
  let unsubscribePermission: () => void = () => undefined;
  let unsubscribeUpdate: () => void = () => undefined;
  let unsubscribeDiagnostics: () => void = () => undefined;
  let unsubscribeClose: () => void = () => undefined;
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
  const failRecoveredAcpPrompt = async (
    diagnostic: AcpPromptFailureDiagnostic,
  ): Promise<never> => {
    upsertAcpSkillRun({
      requestId,
      status: "failed",
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
    currentTurnAssistantText = "";
    currentTurnObservedAcpActivity = false;
    captureAssistantText = true;
    recoveredPromptActive = true;
    recoveredInterruptionRequested = false;
    recoveredDisconnectRequested = false;
    try {
      const result = await runPrompt({
        adapter,
        requestId,
        message,
        sessionId: liveSessionId,
      });
      liveSessionId = result.sessionId;
      return {
        ...result,
        assistantText: currentTurnAssistantText,
        observedAcpActivity: currentTurnObservedAcpActivity,
      };
    } finally {
      captureAssistantText = false;
      recoveredPromptActive = false;
    }
  };
  const convergeRecoveredReply = async (
    message: string,
    options?: {
      appendUserReply?: boolean;
      startedStage?: string;
      startedMessage?: string;
    },
  ) => {
    const latest = getAcpSkillRunRecord(requestId);
    if (!latest) {
      throw new Error(`ACP skill run not found: ${requestId}`);
    }
    const shouldContinueWorkflow = canContinueRecoveredWorkflowTask(latest);
    if (options?.appendUserReply !== false) {
      appendAcpSkillRunUserReply({ requestId, message });
    }
    if (shouldContinueWorkflow) {
      upsertAcpSkillRun({
        requestId,
        status: "running",
        activePrompt: true,
        conversationState: "active",
        conversationRecoveryState: "connected",
        conversationError: "",
        lastRecoveryError: "",
        error: "",
        pendingInteraction: null,
        event: {
          stage: options?.startedStage || "recovered-reply-continuing",
          message:
            options?.startedMessage ||
            "Recovered reply accepted; continuing ACP skill output convergence.",
          level: "info",
          details: {
            previousStatus: latest.status,
          },
        },
      });
    }
    const promptRecoveredWorkflowContinuation = async (
      userMessage: string,
    ): Promise<AcpPromptOutcome> => {
      const promptRecord = getAcpSkillRunRecord(requestId) || latest;
      try {
        return await promptRecoveredSession(
          await buildRecoveredContinuationPrompt({
            userMessage,
            record: promptRecord,
          }),
        );
      } catch (error) {
        if (recoveredInterruptionRequested || recoveredDisconnectRequested) {
          return {
            sessionId: liveSessionId,
            stopReason: "cancelled",
            assistantText: "",
            observedAcpActivity: currentTurnObservedAcpActivity,
          };
        }
        await failRecoveredAcpPrompt(classifyAcpPromptError(error));
        throw error;
      }
    };
    let promptOutcome: AcpPromptOutcome;
    promptOutcome = shouldContinueWorkflow
      ? await promptRecoveredWorkflowContinuation(message)
      : await promptRecoveredSession(message);
    if (recoveredDisconnectRequested) {
      return;
    }
    if (recoveredInterruptionRequested) {
      upsertAcpSkillRun({
        requestId,
        activePrompt: false,
        replyState: "idle",
        conversationState: "active",
        conversationRecoveryState: "connected",
        event: {
          stage: "interrupt-completed",
          message: "ACP skill run current turn interrupted.",
          level: "warn",
          details: {
            recovered: true,
          },
        },
      });
      return;
    }
    if (!shouldContinueWorkflow) {
      return;
    }
    const runnerJsonForConvergence = latest.runnerJson;
    const primarySkillDir = normalizeString(latest.primarySkillDir);
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
        });
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
          status: "succeeded",
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
      upsertAcpSkillRun({
        requestId,
        status: repairRound < maxRepairRounds ? "repairing" : "failed",
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
          details: {
            errors: convergence.errors,
            repairRound,
            maxRepairRounds,
          },
        },
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
      promptOutcome = await promptRecoveredWorkflowContinuation(
        buildAcpSkillOutputRepairPrompt({
          executionMode,
          previousCandidate: convergence.candidateText,
          errors: convergence.errors,
          repairRound,
          maxRepairRounds,
        }),
      );
    }
  };
  unsubscribePermission = adapter.onPermissionRequest((request) => {
    handleAcpSkillRunPermissionRequest({
      requestId,
      request,
      runtimeOptions: recoveredRuntimeOptions,
    });
  });
  unsubscribeUpdate = adapter.onUpdate((event) => {
    const update = event.update || { sessionUpdate: "" };
    if (captureAssistantText && normalizeString(update.sessionUpdate)) {
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
        currentTurnAssistantText += String(content?.text || "");
      }
    }
    recordAcpSkillRunSessionUpdate(requestId, event);
  });
  unsubscribeDiagnostics = adapter.onDiagnostics((entry) => {
    upsertAcpSkillRun({
      requestId,
      event: {
        stage: `acp-${normalizeString(entry.kind) || "diagnostic"}`,
        message: normalizeString(entry.message) || "ACP diagnostic",
        level:
          entry.level === "error"
            ? "error"
            : entry.level === "warn"
              ? "warn"
              : "info",
        details: {
          detail: normalizeString(entry.detail),
          stage: entry.stage,
          errorName: entry.errorName,
          code: entry.code,
        },
      },
    });
  });
  unsubscribeClose = adapter.onClose((event) => {
    const stderrText = normalizeString(event?.stderrText);
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
    registerAcpSkillRunController(requestId, null);
  });
  try {
    const attachKind = await attachRecoveredSession({
      adapter,
      requestId,
      sessionId,
    });
    registerAcpSkillRunController(requestId, {
      cancel: async () => {
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
        await adapter.cancel({ sessionId: liveSessionId });
        upsertAcpSkillRun({
          requestId,
          activePrompt: false,
          replyState: "idle",
          conversationState: "active",
          conversationRecoveryState: "connected",
          event: {
            stage: "interrupt-turn-requested",
            message: "ACP skill run current turn interruption requested.",
            level: "warn",
            details: {
              recovered: true,
            },
          },
        });
      },
      reply: async (message) => {
        const nextPrompt = promptChain
          .catch(() => undefined)
          .then(() => convergeRecoveredReply(message));
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
          await adapter.cancel({ sessionId: liveSessionId });
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
    await applyRecoveredRuntimeOptions({
      adapter,
      requestId,
      sessionId: liveSessionId,
      runtimeOptions: recoveredRuntimeOptions,
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
        latest.status === "failed") &&
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
        upsertAcpSkillRun({
          requestId,
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
  const frozenRuntimeOptions = resolveFrozenAcpRuntimeOptions({
    backend: args.backend,
    providerOptions: args.providerOptions,
  });
  upsertAcpSkillRun({
    requestId: workspace.requestId,
    status: "queued",
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
    acpModeId: frozenRuntimeOptions.modeId,
    acpModelId: frozenRuntimeOptions.modelId,
    acpReasoningEffort: frozenRuntimeOptions.reasoningEffort,
    acpRawModelId: frozenRuntimeOptions.rawModelId,
    event: {
      stage: "workspace-created",
      message: "ACP skill run workspace created.",
      level: "info",
      details: {
        workspaceDir: workspace.workspaceDir,
      },
    },
  });
  rememberAcpSkillRunRuntimeOptions({
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

  await writeAcpSkillRunnerInputManifest({
    workspace,
    request,
  });
  upsertAcpSkillRun({
    requestId: workspace.requestId,
    status: "running",
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
      activePrompt: false,
      error: `ACP skill request validation failed: ${requestValidation.errors.join("; ")}`,
    });
    throw new Error(
      `ACP skill request validation failed: ${requestValidation.errors.join("; ")}`,
    );
  }
  const zoteroHostAccess = resolveZoteroHostAccessRequirement({
    request,
    runnerJson: materialization.runnerJson,
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
        workspaceDir: workspace.workspaceDir,
        requestId: workspace.requestId,
        autoApproveWrites: zoteroHostAccess.autoApproveWrites,
      })
    : createDisabledHostBridgeCliRunInjection();
  const hostBridgeCliState = summarizeHostBridgeCliRunInjection(
    hostBridgeCliInjection,
  );
  upsertAcpSkillRun({
    requestId: workspace.requestId,
    hostBridgeCli: hostBridgeCliState,
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
          ? "info"
          : "warn"
        : "info",
      details: {
        ...hostBridgeCliState,
        zoteroHostAccess,
      },
    },
  });
  const backendWithHostBridgeCli = zoteroHostAccess.required
    ? applyHostBridgeCliEnvToBackend({
        backend: args.backend,
        injection: hostBridgeCliInjection,
      })
    : args.backend;
  const dependencyPlan = await buildAcpRuntimeDependencyPlan({
    backend: backendWithHostBridgeCli,
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
    adapter = await createAdapter({
      backend: dependencyPlan.wrappedBackend,
      agentWorkspaceDir: workspace.workspaceDir,
      sessionCwd: workspace.workspaceDir,
      workspaceDir: workspace.workspaceDir,
      runtimeDir: workspace.runtimeDir,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : String(error || "unknown error");
    upsertAcpSkillRun({
      requestId: workspace.requestId,
      status: "failed",
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
  let disconnectRequested = false;
  let promptChain = Promise.resolve();
  let captureAssistantText = false;
  let currentTurnAssistantText = "";
  let currentTurnObservedAcpActivity = false;
  let workspaceActivityTimer: ReturnType<typeof setInterval> | null = null;
  let workspaceActivitySignature = "";
  let workspaceActivityScanRunning = false;
  let pendingReplyResolver: ((message: string) => void) | null = null;
  let pendingReplyRejecter: ((error: Error) => void) | null = null;
  let unsubscribePermission: () => void = () => undefined;
  let unsubscribeUpdate: () => void = () => undefined;
  let unsubscribeDiagnostics: () => void = () => undefined;
  let unsubscribeClose: () => void = () => undefined;
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
    if (workspaceActivityTimer) {
      clearInterval(workspaceActivityTimer);
      workspaceActivityTimer = null;
    }
    registerAcpSkillRunController(workspace.requestId, null);
    upsertAcpSkillRun({
      requestId: workspace.requestId,
      activePrompt: false,
      conversationState: options?.conversationState,
      conversationRecoveryState:
        options?.conversationState === "ended" ? "unavailable" : "available",
      conversationError: options?.conversationError,
    });
    if (options?.closeAdapter !== false) {
      await adapter.close();
    }
  };
  const scanWorkspaceActivity = async () => {
    if (workspaceActivityScanRunning) {
      return;
    }
    workspaceActivityScanRunning = true;
    try {
      const snapshot = await findWorkspaceActivitySnapshot(
        workspace.workspaceDir,
      );
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
    if (workspaceActivityTimer) {
      return;
    }
    void scanWorkspaceActivity();
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
  const failCurrentAcpPrompt = async (
    diagnostic: AcpPromptFailureDiagnostic,
  ): Promise<never> => {
    const current = getAcpSkillRunRecord(workspace.requestId);
    const hasRecoverableSession =
      !!normalizeString(current?.sessionId) || !!normalizeString(liveSessionId);
    upsertAcpSkillRun({
      requestId: workspace.requestId,
      status: "failed",
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
    currentTurnAssistantText = "";
    currentTurnObservedAcpActivity = false;
    captureAssistantText = true;
    startWorkspaceActivityHeartbeat();
    try {
      const result = await runPrompt({
        adapter,
        requestId: workspace.requestId,
        message,
        runtimeOptions: frozenRuntimeOptions,
        sessionId: liveSessionId,
      });
      liveSessionId = result.sessionId;
      return {
        ...result,
        assistantText: currentTurnAssistantText,
        observedAcpActivity: currentTurnObservedAcpActivity,
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
  const resolveDisconnectedRunStatus = () => {
    const current = getAcpSkillRunRecord(workspace.requestId);
    return current?.status === "waiting_user" ||
      current?.outputConvergenceState === "pending" ||
      !!current?.pendingInteraction
      ? "waiting_user"
      : "running";
  };
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
        await adapter.cancel({ sessionId: current.sessionId });
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
        event: {
          stage: "interrupt-turn-requested",
          message: "ACP skill run current turn interruption requested.",
          level: "warn",
        },
      });
      if (current.sessionId) {
        await adapter.cancel({ sessionId: current.sessionId });
      }
      upsertAcpSkillRun({
        requestId: workspace.requestId,
        activePrompt: false,
        replyState: "idle",
        conversationState: "active",
        conversationRecoveryState: "connected",
      });
    },
    reply: async (message) => {
      const text = String(message || "").trim();
      if (!text) {
        throw new Error("reply message is required");
      }
      if (!liveSessionId) {
        throw new Error("ACP skill run session is not available for replies.");
      }
      if (pendingReplyResolver) {
        appendAcpSkillRunUserReply({
          requestId: workspace.requestId,
          message: text,
        });
        resolvePendingReply(text);
        return;
      }
      const nextPrompt = promptChain
        .catch(() => undefined)
        .then(async () => {
          appendAcpSkillRunUserReply({
            requestId: workspace.requestId,
            message: text,
          });
          try {
            await promptExistingSession(text);
          } catch (error) {
            if (error instanceof AcpPromptFailureError) {
              throw error;
            }
            const message =
              error instanceof Error
                ? error.message
                : String(error || "unknown error");
            upsertAcpSkillRun({
              requestId: workspace.requestId,
              activePrompt: false,
              conversationState: "error",
              conversationError: message,
              event: {
                stage: "conversation-error",
                message,
                level: "error",
              },
            });
            await cleanupLiveSession({
              conversationState: "error",
              conversationError: message,
              closeAdapter: true,
            });
            throw error;
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
        await adapter.cancel({ sessionId: current.sessionId });
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
    handleAcpSkillRunPermissionRequest({
      requestId: workspace.requestId,
      request,
      runtimeOptions: frozenRuntimeOptions,
    });
  });
  unsubscribeUpdate = adapter.onUpdate((event) => {
    const update = event.update || { sessionUpdate: "" };
    if (captureAssistantText && normalizeString(update.sessionUpdate)) {
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
        currentTurnAssistantText += String(content?.text || "");
      }
    }
    recordAcpSkillRunSessionUpdate(workspace.requestId, event);
  });
  unsubscribeDiagnostics = adapter.onDiagnostics((entry) => {
    upsertAcpSkillRun({
      requestId: workspace.requestId,
      event: {
        stage: `acp-${normalizeString(entry.kind) || "diagnostic"}`,
        message: normalizeString(entry.message) || "ACP diagnostic",
        level:
          entry.level === "error"
            ? "error"
            : entry.level === "warn"
              ? "warn"
              : "info",
        details: {
          detail: normalizeString(entry.detail),
          stage: entry.stage,
          errorName: entry.errorName,
          code: entry.code,
          commandLine:
            entry.kind === "spawned"
              ? normalizeString(entry.detail)
              : undefined,
        },
      },
    });
  });
  unsubscribeClose = adapter.onClose((event) => {
    const stderrText = normalizeString(event?.stderrText);
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
        return false;
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
      convergence = {
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
      return true;
    };
    while (true) {
      const promptResult = await promptExistingSession(nextPrompt);
      if (disconnectRequested) {
        keepConversationAlive = true;
        const disconnectedStatus = resolveDisconnectedRunStatus();
        upsertAcpSkillRun({
          requestId: workspace.requestId,
          status: disconnectedStatus,
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
        return {
          status: "deferred",
          requestId: workspace.requestId,
          fetchType: "result",
          backendStatus: disconnectedStatus,
          responseJson: {
            provider: "acp",
            requestId: workspace.requestId,
            status: "disconnected",
          },
        };
      }
      if (interruptionRequested) {
        keepConversationAlive = true;
        upsertAcpSkillRun({
          requestId: workspace.requestId,
          status: "running",
          activePrompt: false,
          replyState: "idle",
          error: "",
          conversationState: "active",
          conversationRecoveryState: "connected",
          event: {
            stage: "interrupt-completed",
            message: "ACP skill run current turn interrupted.",
            level: "warn",
            details: {
              reason: "current turn canceled after prompt returned",
            },
          },
        });
        return {
          status: "succeeded",
          requestId: workspace.requestId,
          fetchType: "result",
          responseJson: {
            provider: "acp",
            requestId: workspace.requestId,
            status: "interrupted",
          },
        };
      }
      const promptFailure = classifyAcpPromptFailure(promptResult);
      if (promptFailure?.stage === "acp-prompt-no-output") {
        if (await resolveResultFileFallbackForCurrentTurn(repairRound)) {
          break;
        }
        await failCurrentAcpPrompt(promptFailure);
      }
      if (promptFailure) {
        await failCurrentAcpPrompt(promptFailure);
      }
      convergence = await convergeAcpSkillTurnOutput({
        assistantText: promptResult.assistantText,
        executionMode,
        runnerJson: materialization.runnerJson,
        primarySkillDir: materialization.primarySkillDir,
      });
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
        upsertAcpSkillRun({
          requestId: workspace.requestId,
          status: "running",
          activePrompt: true,
          pendingInteraction: null,
          event: {
            stage: "reply-received",
            message: "User reply received; continuing ACP skill run.",
            level: "info",
          },
        });
        nextPrompt = reply;
        continue;
      }
      if (await resolveResultFileFallbackForCurrentTurn(repairRound)) {
        break;
      }
      upsertAcpSkillRun({
        requestId: workspace.requestId,
        status: repairRound < maxRepairRounds ? "repairing" : "failed",
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
      if (repairRound >= maxRepairRounds) {
        upsertAcpSkillRun({
          requestId: workspace.requestId,
          status: "failed",
          activePrompt: false,
          error: `ACP SkillRunner-compatible output validation failed: ${convergence.errors.join("; ")}`,
          event: {
            stage: "failed",
            message: "ACP skill run failed output validation.",
            level: "error",
            details: {
              errors: convergence.errors,
            },
          },
        });
        throw new Error(
          `ACP SkillRunner-compatible output validation failed: ${convergence.errors.join("; ")}`,
        );
      }
      repairRound += 1;
      upsertAcpSkillRun({
        requestId: workspace.requestId,
        status: "repairing",
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
          previousCandidate: convergence.candidateText,
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
      status: "succeeded",
      activePrompt: false,
      conversationState: "active",
      applyResultState: "pending",
      repairRounds: repairRound,
      validationStatus: "valid",
      resultJson: finalResultJson,
      event: {
        stage: "succeeded",
        message: "ACP skill run succeeded.",
        level: "info",
        details: {
          resultJsonPath: workspace.resultJsonPath,
          workspaceDir: workspace.workspaceDir,
        },
      },
    });
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
        acpRuntimeOptions: frozenRuntimeOptions,
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
      const disconnectedStatus = resolveDisconnectedRunStatus();
      upsertAcpSkillRun({
        requestId: workspace.requestId,
        status: disconnectedStatus,
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
      return {
        status: "deferred",
        requestId: workspace.requestId,
        fetchType: "result",
        backendStatus: disconnectedStatus,
        responseJson: {
          provider: "acp",
          requestId: workspace.requestId,
          status: "disconnected",
        },
      };
    }
    if (interruptionRequested) {
      keepConversationAlive = true;
      upsertAcpSkillRun({
        requestId: workspace.requestId,
        status: "running",
        activePrompt: false,
        replyState: "idle",
        error: "",
        conversationState: "active",
        conversationRecoveryState: "connected",
        event: {
          stage: "interrupt-completed",
          message: "ACP skill run current turn interrupted.",
          level: "warn",
          details: {
            reason: message,
          },
        },
      });
      return {
        status: "succeeded",
        requestId: workspace.requestId,
        fetchType: "result",
        responseJson: {
          provider: "acp",
          requestId: workspace.requestId,
          status: "interrupted",
        },
      };
    }
    upsertAcpSkillRun({
      requestId: workspace.requestId,
      status: cancellationRequested ? "canceled" : "failed",
      activePrompt: false,
      error: message,
      event: {
        stage: cancellationRequested ? "canceled" : "failed",
        message: cancellationRequested ? "ACP skill run canceled." : message,
        level: cancellationRequested ? "warn" : "error",
      },
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
