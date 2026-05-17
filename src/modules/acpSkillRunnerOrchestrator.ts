import type { BackendInstance } from "../backends/types";
import { listBackendInstances } from "../backends/registry";
import { ACP_SKILL_RUN_REQUEST_KIND } from "../config/defaults";
import type {
  AcpSkillRunRequestV1,
  ProviderExecutionResult,
} from "../providers/contracts";
import { executeApplyResult } from "../workflows/runtime";
import { getLoadedWorkflowEntries, rescanWorkflowRegistry } from "./workflowRuntime";
import { createUnavailableBundleReader } from "./workflowExecution/bundleIO";
import { createWorkflowResultContext } from "./workflowExecution/resultContext";
import { resolveTargetParentIDFromRequest } from "./workflowExecution/requestMeta";
import type { ProviderProgressEvent } from "../providers/types";
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
  buildAcpSkillOutputRepairPrompt,
} from "./acpSkillOutputValidator";
import {
  convergeAcpSkillTurnOutput,
  writeAcpSkillRunnerResultEnvelope,
  type AcpSkillOutputConvergenceResult,
} from "./acpSkillOutputConvergence";
import {
  createAcpConnectionAdapter,
  type AcpConnectionAdapter,
  type AcpConnectionInitializeResult,
} from "./acpConnectionAdapter";
import type { AcpDiagnosticsEntry } from "./acpTypes";
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
  setAcpSkillRunPermissionRequest,
  setAcpSkillRunRecoveryHandler,
  upsertAcpSkillRun,
} from "./acpSkillRunStore";
import { resolveAcpRawModelIdForSelection } from "./acpModelOptionFolding";
import { updateWorkflowTaskStateByRequest } from "./taskRuntime";
import {
  listRuntimeChildren,
  readRuntimeTextFile,
  statRuntimePath,
} from "./runtimePersistence";

export type AcpSkillRunnerExecutionSnapshot = {
  requestId: string;
  status: "queued" | "running" | "waiting_user" | "repairing" | "succeeded" | "failed" | "canceled";
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
};

export type AcpSkillRunnerDependencies = {
  scanRegistry?: () => Promise<PluginSkillRegistrySnapshot>;
  createWorkspace?: typeof createAcpSkillRunnerWorkspace;
  createAdapter?: typeof createAcpConnectionAdapter;
  dependencyProbe?: AcpRuntimeDependencyProbe;
  mcpPreflight?: AcpRequiredMcpPreflightProbe;
  mcpCallableSmoke?: AcpCallableMcpSmokeProbe;
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

export type AcpCallableMcpSmokeProbe = (args: {
  requiredTools: string[];
  requestId: string;
  backend: BackendInstance;
  workspace: AcpSkillRunnerWorkspace;
  adapter: AcpConnectionAdapter;
  sessionId: string;
}) => Promise<{
  ok: boolean;
  reachedTools?: string[];
  missingTools?: string[];
  message?: string;
}>;

function normalizeString(value: unknown) {
  return String(value || "").trim();
}

function normalizeStringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [] as string[];
  }
  return Array.from(
    new Set(value.map((entry) => normalizeString(entry)).filter(Boolean)),
  );
}

function basename(path: string) {
  return normalizeString(path).split(/[\\/]+/).filter(Boolean).pop() || "";
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
    const mtime = Number((stat as { lastModified?: unknown; mtimeMs?: unknown }).lastModified || (stat as { mtimeMs?: unknown }).mtimeMs || 0) || 0;
    if (!stat.isDir) {
      const candidate = { path: current.path, size: stat.size, mtime };
      if (
        !best ||
        candidate.mtime > best.mtime ||
        (candidate.mtime === best.mtime && candidate.path.localeCompare(best.path) > 0)
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
  return buildAcpSkillRunPrompt({
    context: {
      skillId: context.request.skill_id,
      workspace: context.workspace,
      backend: context.backend,
      agentFamily: context.injectionPlan.family,
      proxySkillRoots: context.materialization.proxySkillRoots,
      requestedSkillProxyPath: context.materialization.requestedSkillProxyPath,
      sharedSkillCatalogPath: context.materialization.sharedSkillCatalogPath,
    },
    request: context.request,
  });
}

function resolveExecutionMode(
  request: AcpSkillRunRequestV1,
  runnerJson: Record<string, unknown>,
) {
  const explicit = normalizeString(request.runtime_options?.execution_mode).toLowerCase();
  if (explicit === "interactive" || explicit === "auto") {
    return explicit;
  }
  const modes = Array.isArray(runnerJson.execution_modes)
    ? runnerJson.execution_modes.map((entry) => normalizeString(entry).toLowerCase())
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
    return JSON.parse(await readRuntimeTextFile(path)) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function resolveRunnerRequiredMcpTools(runnerJson: Record<string, unknown>) {
  const mcp = runnerJson.mcp;
  if (!mcp || typeof mcp !== "object" || Array.isArray(mcp)) {
    return [] as string[];
  }
  const tools = (mcp as { required_tools?: unknown; requiredTools?: unknown });
  return normalizeStringArray(tools.required_tools || tools.requiredTools);
}

function resolveWorkflowRequiredMcpTools(request: AcpSkillRunRequestV1) {
  const workflowMcp = request.runtime_options?.workflow_mcp;
  if (!workflowMcp || typeof workflowMcp !== "object" || Array.isArray(workflowMcp)) {
    return [] as string[];
  }
  const tools = workflowMcp as { required_tools?: unknown; requiredTools?: unknown };
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
  const missingTools = args.requiredTools.filter((tool) => !available.has(tool));
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
    return;
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
}

function extractMcpToolNameFromDiagnostic(entry: AcpDiagnosticsEntry) {
  if (entry.kind === "zotero_mcp_response") {
    const raw = entry.raw as { jsonrpcToolName?: unknown } | null | undefined;
    const fromRaw = normalizeString(raw?.jsonrpcToolName);
    if (fromRaw) {
      return fromRaw;
    }
    try {
      const parsed = JSON.parse(normalizeString(entry.detail));
      return normalizeString(parsed?.jsonrpcToolName);
    } catch {
      return "";
    }
  }
  if (entry.kind !== "zotero_mcp_tool_call") {
    return "";
  }
  const message = normalizeString(entry.message);
  const match = message.match(/Zotero MCP tool call(?: failed)?\s+(.+)$/i);
  return normalizeString(match?.[1]);
}

function buildMcpCallableSmokePrompt(requiredTools: string[]) {
  const toolList = requiredTools.map((tool) => `- ${tool}`).join("\n");
  return [
    "这是一次由 host 发起的 MCP callable smoke，不是用户任务。",
    "请对下列 Zotero MCP tools 各发起一次最小调用，用于证明这些 tool 已经暴露给当前 ACP session：",
    toolList,
    "",
    "你可以根据 tool schema 自行选择最小参数；对于参数复杂或有副作用风险的 tool，允许使用明显非法的 probe 参数触发 validation error。",
    "判定目标只是让请求到达 Zotero MCP。业务成功不是必需条件。",
    "不要读取项目文件，不要初始化 runtime DB，不要执行 skill 正式步骤。完成后用一句话报告 smoke done。",
  ].join("\n");
}

function buildRequiredMcpGuardPrompt(requiredTools: string[]) {
  if (!requiredTools.length) {
    return "";
  }
  return [
    "Host 已完成 MCP availability check 和 callable smoke。",
    "不要自行搜索 MCP 配置或测试工具注入状态。",
    "如果正式执行中某个必需 MCP tool call 返回 unavailable/no such tool，立即输出合法 canceled，不要自行排查环境。",
    `必需 MCP tools: ${requiredTools.join(", ")}`,
  ].join("\n");
}

function withRequiredMcpGuard(message: string, requiredTools: string[]) {
  const guard = buildRequiredMcpGuardPrompt(requiredTools);
  if (!guard) {
    return message;
  }
  return `${guard}\n\n${message}`;
}

async function defaultCallableMcpSmoke(args: {
  requiredTools: string[];
  requestId: string;
  backend: BackendInstance;
  workspace: AcpSkillRunnerWorkspace;
  adapter: AcpConnectionAdapter;
  sessionId: string;
}) {
  const required = new Set(args.requiredTools);
  const reached = new Set<string>();
  const unsubscribe = args.adapter.onDiagnostics((entry) => {
    const toolName = extractMcpToolNameFromDiagnostic(entry);
    if (required.has(toolName)) {
      reached.add(toolName);
    }
  });
  try {
    await args.adapter.prompt({
      sessionId: args.sessionId,
      message: buildMcpCallableSmokePrompt(args.requiredTools),
    });
  } finally {
    unsubscribe();
  }
  const reachedTools = args.requiredTools.filter((tool) => reached.has(tool));
  const missingTools = args.requiredTools.filter((tool) => !reached.has(tool));
  return {
    ok: missingTools.length === 0,
    reachedTools,
    missingTools,
    message: missingTools.length
      ? `ACP callable smoke did not observe required Zotero MCP tools: ${missingTools.join(", ")}`
      : "ACP callable smoke observed all required Zotero MCP tools.",
  };
}

async function runCallableMcpSmoke(args: {
  requestId: string;
  backend: BackendInstance;
  workspace: AcpSkillRunnerWorkspace;
  adapter: AcpConnectionAdapter;
  sessionId: string;
  requiredTools: string[];
  probe?: AcpCallableMcpSmokeProbe;
}) {
  if (!args.requiredTools.length) {
    return;
  }
  upsertAcpSkillRun({
    requestId: args.requestId,
    activePrompt: true,
    event: {
      stage: "mcp-smoke-started",
      message: "ACP callable MCP smoke started.",
      level: "info",
      details: {
        requiredTools: args.requiredTools,
      },
    },
  });
  appendRuntimeLog({
    level: "info",
    scope: "provider",
    backendId: args.backend.id,
    backendType: args.backend.type,
    providerId: "acp",
    requestId: args.requestId,
    component: "acp-skillrunner",
    operation: "mcp-callable-smoke",
    phase: "start",
    stage: "mcp-smoke-started",
    message: "ACP callable MCP smoke started.",
    details: {
      requiredTools: args.requiredTools,
    },
  });
  const result = await (args.probe || defaultCallableMcpSmoke)({
    requiredTools: args.requiredTools,
    requestId: args.requestId,
    backend: args.backend,
    workspace: args.workspace,
    adapter: args.adapter,
    sessionId: args.sessionId,
  });
  upsertAcpSkillRun({
    requestId: args.requestId,
    activePrompt: false,
    event: {
      stage: result.ok ? "mcp-smoke-ok" : "mcp-smoke-failed",
      message:
        result.message ||
        (result.ok
          ? "ACP callable MCP smoke succeeded."
          : "ACP callable MCP smoke failed."),
      level: result.ok ? "info" : "error",
      details: {
        requiredTools: args.requiredTools,
        reachedTools: result.reachedTools || [],
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
    operation: "mcp-callable-smoke",
    phase: result.ok ? "complete" : "terminal",
    stage: result.ok ? "mcp-smoke-ok" : "mcp-smoke-failed",
    message:
      result.message ||
      (result.ok
        ? "ACP callable MCP smoke succeeded."
        : "ACP callable MCP smoke failed."),
    details: {
      requiredTools: args.requiredTools,
      reachedTools: result.reachedTools || [],
      missingTools: result.missingTools || [],
    },
  });
  if (!result.ok) {
    const missing = result.missingTools?.length
      ? ` Missing callable tools: ${result.missingTools.join(", ")}.`
      : "";
    throw new Error(
      `${result.message || "ACP callable MCP smoke failed."}${missing}`,
    );
  }
}

type FrozenAcpRuntimeOptions = {
  modeId?: string;
  modelId?: string;
  reasoningEffort?: string;
  rawModelId?: string;
};

function resolveFrozenAcpRuntimeOptions(args: {
  backend: BackendInstance;
  providerOptions?: Record<string, unknown>;
}): FrozenAcpRuntimeOptions {
  const cache = args.backend.acp?.runtimeOptionsCache;
  const options = args.providerOptions || {};
  const modeId = normalizeString(options.acpModeId) || cache?.currentModeId || "";
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
  };
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
      await args.adapter.setModel({
        sessionId,
        modelId: args.runtimeOptions.rawModelId,
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
  const request = record.requestPayload as {
    skill_id?: unknown;
    parameter?: { workflowId?: unknown } | null;
  } | null | undefined;
  return (
    normalizeString(record.workflowId) ||
    normalizeString(request?.parameter?.workflowId) ||
    normalizeString(record.skillId) ||
    normalizeString(request?.skill_id)
  );
}

async function applyRecoveredAcpSkillResult(args: {
  record: NonNullable<ReturnType<typeof getAcpSkillRunRecord>>;
  resultJson: Record<string, unknown>;
}) {
  if (args.record.applyResultState === "succeeded") {
    return;
  }
  const workflowId = resolveRecoveredWorkflowId(args.record);
  const workflow = await resolveWorkflowById(workflowId);
  if (!workflow) {
    throw new Error(`workflow not found for ACP skill recovery apply: ${workflowId}`);
  }
  const request = args.record.requestPayload;
  const targetParentID = resolveTargetParentIDFromRequest(request);
  if (!targetParentID) {
    throw new Error("cannot resolve target parent for recovered ACP skill apply");
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
    await executeApplyResult({
      workflow,
      parent: targetParentID,
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
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error || "unknown error");
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

async function resolveBackendForRecoveredRun(backendId: string) {
  const normalized = normalizeString(backendId);
  const backend = (await listBackendInstances()).find(
    (entry) => normalizeString(entry.id) === normalized,
  );
  if (!backend) {
    throw new Error(`ACP backend not found for recovered skill run: ${normalized}`);
  }
  if (normalizeString(backend.type) !== "acp") {
    throw new Error(`Recovered ACP skill run requires ACP backend: ${normalized}`);
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
          message: error instanceof Error ? error.message : String(error || "unknown error"),
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
    ...(normalizeString(record.acpModeId) ? { modeId: normalizeString(record.acpModeId) } : {}),
    ...(normalizeString(record.acpModelId) ? { modelId: normalizeString(record.acpModelId) } : {}),
    ...(normalizeString(record.acpReasoningEffort)
      ? { reasoningEffort: normalizeString(record.acpReasoningEffort) }
      : {}),
    ...(normalizeString(record.acpRawModelId)
      ? { rawModelId: normalizeString(record.acpRawModelId) }
      : {}),
  };
}

function buildRecoveredContinuationPrompt(args: {
  userMessage: string;
  record: NonNullable<ReturnType<typeof getAcpSkillRunRecord>>;
}) {
  const executionMode = normalizeString(args.record.executionMode) || "interactive";
  const workspaceDir = normalizeString(args.record.workspaceDir) || "(unknown workspace)";
  const resultJsonPath = normalizeString(args.record.resultJsonPath) || "(unknown result path)";
  const inputManifestPath = normalizeString(args.record.inputManifestPath) || "(unknown input manifest)";
  const requestedSkillId = normalizeString(args.record.requestedSkillId) || normalizeString(args.record.skillId);
  return [
    "ACP Skills continuation guard:",
    "- This is a resumed continuation of the same ACP Skills run and the same remote ACP session.",
    "- Do not restart the task, do not discard prior work, and do not switch skills.",
    `- Continue using the existing run workspace: ${workspaceDir}`,
    `- Continue using the existing input manifest: ${inputManifestPath}`,
    `- Requested skill: ${requestedSkillId || "(unknown)"}`,
    `- Execution mode: ${executionMode}`,
    "- Continue following the already injected SKILL.md runtime contract and output schema.",
    "- At the end of this assistant turn, return exactly one JSON object for the Skill Runner output contract.",
    executionMode === "interactive"
      ? "- If you still need user input, return the pending branch: `__SKILL_DONE__: false` with a non-empty `message` and an object `ui_hints`. If the task is complete, return the final branch: `__SKILL_DONE__: true` plus the final output fields."
      : "- Return `__SKILL_DONE__: true` plus the final output fields.",
    "- For quick reply controls, use `ui_hints.options` with `{ \"label\": string, \"value\": string }` entries.",
    "- Do not output explanations.",
    "- Do not output Markdown fences.",
    `- Do not hand-write ${resultJsonPath}. If the active SKILL.md explicitly requires a package-local runtime render action to create result/result.json, that runtime-generated file is allowed; otherwise the runner writes result/result.json after final validation succeeds.`,
    "",
    "User reply to continue with:",
    args.userMessage,
  ].join("\n");
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
  if (args.runtimeOptions.modeId || args.runtimeOptions.rawModelId) {
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
  dependencies?: Pick<
    AcpSkillRunnerDependencies,
    "createAdapter" | "dependencyProbe" | "mcpPreflight" | "mcpCallableSmoke"
  >;
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
    (record.requestPayload as { kind?: unknown }).kind === ACP_SKILL_RUN_REQUEST_KIND
      ? (record.requestPayload as AcpSkillRunRequestV1)
      : null;
  const requiredMcpTools = recoveredRequest
    ? resolveRequiredMcpTools({
        request: recoveredRequest,
        runnerJson: (record.runnerJson || {}) as Record<string, unknown>,
      })
    : resolveRunnerRequiredMcpTools((record.runnerJson || {}) as Record<string, unknown>);
  let mcpSmokeCompleted = requiredMcpTools.length === 0;
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
      },
    },
  });
  const backend = await resolveBackendForRecoveredRun(record.backendId);
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
  const createAdapter = args.dependencies?.createAdapter || createAcpConnectionAdapter;
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
  let promptChain = Promise.resolve();
  let liveSessionId = sessionId;
  let unsubscribePermission: () => void = () => undefined;
  let unsubscribeUpdate: () => void = () => undefined;
  let unsubscribeDiagnostics: () => void = () => undefined;
  let unsubscribeClose: () => void = () => undefined;
  const detach = async (state: "closed" | "ended" | "error" = "closed", error?: string) => {
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
      conversationRecoveryState: state === "ended" ? "unavailable" : "available",
      conversationError: error,
      connectionActionState: "idle",
    });
    await adapter.close();
  };
  const promptRecoveredSession = async (message: string) => {
    currentTurnAssistantText = "";
    captureAssistantText = true;
    try {
      const result = await runPrompt({
        adapter,
        requestId,
        message: mcpSmokeCompleted
          ? message
          : withRequiredMcpGuard(message, requiredMcpTools),
        sessionId: liveSessionId,
        prepareSession: async (sessionId) => {
          if (mcpSmokeCompleted) {
            return;
          }
          await preflightRequiredMcpTools({
            requestId,
            backend: dependencyPlan.wrappedBackend,
            workspace: {
              requestId,
              workspaceDir,
              runtimeDir,
              resultDir: "",
              auditDir: "",
              inputManifestPath: normalizeString(record.inputManifestPath),
              resultJsonPath: normalizeString(record.resultJsonPath),
            },
            adapter,
            requiredTools: requiredMcpTools,
            probe: args.dependencies?.mcpPreflight,
          });
          await runCallableMcpSmoke({
            requestId,
            backend: dependencyPlan.wrappedBackend,
            workspace: {
              requestId,
              workspaceDir,
              runtimeDir,
              resultDir: "",
              auditDir: "",
              inputManifestPath: normalizeString(record.inputManifestPath),
              resultJsonPath: normalizeString(record.resultJsonPath),
            },
            adapter,
            sessionId,
            requiredTools: requiredMcpTools,
            probe: args.dependencies?.mcpCallableSmoke,
          });
          mcpSmokeCompleted = true;
        },
      });
      liveSessionId = result.sessionId;
      return currentTurnAssistantText;
    } finally {
      captureAssistantText = false;
    }
  };
  const convergeRecoveredReply = async (message: string) => {
    const latest = getAcpSkillRunRecord(requestId);
    if (!latest) {
      throw new Error(`ACP skill run not found: ${requestId}`);
    }
    const shouldContinueWorkflow = canContinueRecoveredWorkflowTask(latest);
    appendAcpSkillRunUserReply({ requestId, message });
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
          stage: "recovered-reply-continuing",
          message: "Recovered reply accepted; continuing ACP skill output convergence.",
          level: "info",
          details: {
            previousStatus: latest.status,
          },
        },
      });
    }
    let assistantText = "";
    try {
      assistantText = await promptRecoveredSession(
        shouldContinueWorkflow
          ? buildRecoveredContinuationPrompt({
              userMessage: message,
              record: latest,
            })
          : message,
      );
    } catch (error) {
      if (shouldContinueWorkflow) {
        upsertAcpSkillRun({
          requestId,
          status: latest.status,
          activePrompt: false,
          conversationState: "closed",
          conversationRecoveryState: "available",
          event: {
            stage: "recovered-reply-prompt-failed",
            message: error instanceof Error ? error.message : String(error || "unknown error"),
            level: "error",
          },
        });
      }
      throw error;
    }
    if (!shouldContinueWorkflow) {
      return;
    }
    const runnerJsonForConvergence = latest.runnerJson;
    const primarySkillDir = normalizeString(latest.primarySkillDir);
    if (!runnerJsonForConvergence || !primarySkillDir) {
      throw new Error("Recovered waiting run is missing output convergence context.");
    }
    const executionMode = latest.executionMode || "interactive";
    const convergence = await convergeAcpSkillTurnOutput({
      assistantText,
      executionMode,
      runnerJson: runnerJsonForConvergence,
      primarySkillDir,
    });
    if (convergence.kind === "pending") {
      projectAcpSkillRunOutputEnvelopeToTranscript({
        requestId,
        kind: "pending",
        message: convergence.message,
        candidateText: convergence.candidateText,
        repairRound: latest.repairRounds || 0,
      });
      upsertAcpSkillRun({
        requestId,
        status: "waiting_user",
        activePrompt: false,
        conversationState: "active",
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
      return;
    }
    if (convergence.kind !== "final") {
      recordAcpSkillRunOutputRevision({
        requestId,
        status: "invalid",
        candidateText: convergence.candidateText,
        repairRound: latest.repairRounds || 0,
        errors: convergence.errors,
      });
      upsertAcpSkillRun({
        requestId,
        status: "failed",
        activePrompt: false,
        outputConvergenceState: "invalid",
        validationStatus: "invalid",
        validationErrors: convergence.errors,
        error: `Recovered ACP skill output validation failed: ${convergence.errors.join("; ")}`,
        event: {
          stage: "recovered-output-validation-failed",
          message: "Recovered ACP skill output validation failed.",
          level: "error",
          details: {
            errors: convergence.errors,
          },
        },
      });
      throw new Error(`Recovered ACP skill output validation failed: ${convergence.errors.join("; ")}`);
    }
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
      repairRound: latest.repairRounds || 0,
    });
    upsertAcpSkillRun({
      requestId,
      status: "succeeded",
      activePrompt: false,
      conversationState: "active",
      validationStatus: "valid",
      validationErrors: [],
      outputConvergenceState: "final",
      pendingInteraction: null,
      lastTurnOutput: convergence.candidateText,
      resultJson: convergence.resultJson,
      applyResultState: latest.applyResultState === "succeeded" ? "succeeded" : "pending",
      event: {
        stage: "recovered-output-validation-succeeded",
        message: "Recovered ACP skill output validation succeeded.",
        level: "info",
        details: {
          resultJsonPath: latest.resultJsonPath,
        },
      },
    });
    if (latest.applyResultState !== "succeeded") {
      await applyRecoveredAcpSkillResult({
        record: {
          ...latest,
          status: "succeeded",
          resultJson: convergence.resultJson,
        },
        resultJson: convergence.resultJson,
      });
    }
  };
  unsubscribePermission = adapter.onPermissionRequest((request) => {
    setAcpSkillRunPermissionRequest(requestId, request);
  });
  unsubscribeUpdate = adapter.onUpdate((event) => {
    const update = event.update || { sessionUpdate: "" };
    if (
      captureAssistantText &&
      normalizeString(update.sessionUpdate) === "agent_message_chunk"
    ) {
      const content = (update as { content?: { type?: string | null; text?: string | null } }).content;
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
        level: entry.level === "error" ? "error" : entry.level === "warn" ? "warn" : "info",
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
      reply: async (message) => {
        promptChain = promptChain.then(() => convergeRecoveredReply(message));
        await promptChain;
      },
      disconnect: async () => {
        await detach("closed");
      },
      endSession: async () => {
        await detach("ended");
      },
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
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error || "unknown error");
    await detach("error", message).catch(() => undefined);
    upsertAcpSkillRun({
      requestId,
      conversationRecoveryState: /does not support session resume\/load/i.test(message)
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
  dependencies?: AcpSkillRunnerDependencies;
}): Promise<ProviderExecutionResult> {
  const request = assertAcpSkillRunRequest(args.request);
  const workspaceFactory =
    args.dependencies?.createWorkspace || createAcpSkillRunnerWorkspace;
  const workspace = await workspaceFactory({
    backendId: args.backend.id,
    workflowId: normalizeString(request.parameter?.workflowId) || request.skill_id,
    jobId: resolveJobId(request),
  });
  const workflowId = normalizeString(request.parameter?.workflowId) || request.skill_id;
  const workflowLabel = normalizeString(request.parameter?.workflowLabel);
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

  const registry =
    args.dependencies?.scanRegistry
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
  const executionMode = resolveExecutionMode(request, runnerJsonForExecutionMode);
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
  const dependencyPlan = await buildAcpRuntimeDependencyPlan({
    backend: args.backend,
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

  const createAdapter = args.dependencies?.createAdapter || createAcpConnectionAdapter;
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
    const message = error instanceof Error ? error.message : String(error || "unknown error");
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
  let liveSessionId = "";
  let mcpSmokeCompleted = requiredMcpTools.length === 0;
  let keepConversationAlive = false;
  let cleanupDone = false;
  let cancellationRequested = false;
  let promptChain = Promise.resolve();
  let captureAssistantText = false;
  let currentTurnAssistantText = "";
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
      const snapshot = await findWorkspaceActivitySnapshot(workspace.workspaceDir);
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
  const promptExistingSession = async (message: string) => {
    currentTurnAssistantText = "";
    captureAssistantText = true;
    startWorkspaceActivityHeartbeat();
    try {
      const result = await runPrompt({
        adapter,
        requestId: workspace.requestId,
        message: mcpSmokeCompleted
          ? message
          : withRequiredMcpGuard(message, requiredMcpTools),
        runtimeOptions: frozenRuntimeOptions,
        sessionId: liveSessionId,
        prepareSession: async (sessionId) => {
          if (mcpSmokeCompleted) {
            return;
          }
          await runCallableMcpSmoke({
            requestId: workspace.requestId,
            backend: dependencyPlan.wrappedBackend,
            workspace,
            adapter,
            sessionId,
            requiredTools: requiredMcpTools,
            probe: args.dependencies?.mcpCallableSmoke,
          });
          mcpSmokeCompleted = true;
        },
      });
      liveSessionId = result.sessionId;
      return {
        ...result,
        assistantText: currentTurnAssistantText,
      };
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
  registerAcpSkillRunController(workspace.requestId, {
    cancel: async () => {
      cancellationRequested = true;
      if (pendingReplyRejecter) {
        pendingReplyRejecter(new Error("ACP skill run canceled while waiting for user reply."));
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
      promptChain = promptChain.then(async () => {
        appendAcpSkillRunUserReply({
          requestId: workspace.requestId,
          message: text,
        });
        try {
          await promptExistingSession(text);
        } catch (error) {
          const message =
            error instanceof Error ? error.message : String(error || "unknown error");
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
      await promptChain;
    },
    disconnect: async () => {
      await cleanupLiveSession({
        conversationState: "closed",
        closeAdapter: true,
      });
    },
    endSession: async () => {
      if (pendingReplyRejecter) {
        pendingReplyRejecter(new Error("ACP skill run session ended while waiting for user reply."));
        pendingReplyResolver = null;
        pendingReplyRejecter = null;
      }
      await cleanupLiveSession({
        conversationState: "ended",
        closeAdapter: true,
      });
    },
  });
  unsubscribePermission = adapter.onPermissionRequest((request) => {
    setAcpSkillRunPermissionRequest(workspace.requestId, request);
  });
  unsubscribeUpdate = adapter.onUpdate((event) => {
    const update = event.update || { sessionUpdate: "" };
    if (
      captureAssistantText &&
      normalizeString(update.sessionUpdate) === "agent_message_chunk"
    ) {
      const content = (update as { content?: { type?: string | null; text?: string | null } }).content;
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
        level: entry.level === "error" ? "error" : entry.level === "warn" ? "warn" : "info",
        details: {
          detail: normalizeString(entry.detail),
          stage: entry.stage,
          errorName: entry.errorName,
          code: entry.code,
          commandLine:
            entry.kind === "spawned" ? normalizeString(entry.detail) : undefined,
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
    };
    await preflightRequiredMcpTools({
      requestId: workspace.requestId,
      backend: dependencyPlan.wrappedBackend,
      workspace,
      adapter,
      requiredTools: requiredMcpTools,
      probe: args.dependencies?.mcpPreflight,
    });
    const runExecutionInstructionsPath = await materializeAcpRunExecutionInstructions({
      context: {
        skillId: request.skill_id,
        workspace,
        backend: dependencyPlan.wrappedBackend,
        agentFamily: injectionPlan.family,
        proxySkillRoots: materialization.proxySkillRoots,
        requestedSkillProxyPath: materialization.requestedSkillProxyPath,
        sharedSkillCatalogPath: materialization.sharedSkillCatalogPath,
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
    let nextPrompt = await buildRunPrompt({ context });
    const maxRepairRounds = Math.max(0, args.dependencies?.maxRepairRounds ?? 3);
    let repairRound = 0;
    let convergence: AcpSkillOutputConvergenceResult | null = null;
    while (true) {
      const promptResult = await promptExistingSession(nextPrompt);
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
            stage: repairRound > 0 ? "repair-validation-succeeded" : "output-validation-succeeded",
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
    const finalResultJson = convergence?.kind === "final" ? convergence.resultJson : {};
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
    const message = error instanceof Error ? error.message : String(error || "unknown error");
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

setAcpSkillRunRecoveryHandler(({ requestId, reason }) =>
  recoverAcpSkillRunConversation({ requestId, reason }),
);
