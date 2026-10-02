import { ACP_SKILL_RUN_REQUEST_KIND } from "../../../config/defaults";
import { appendRuntimeLog } from "../../runtimeLogManager";
import { recordAcpRuntimeDiagnostic } from "../diagnostics/acpDiagnosticRouter";
import { appendAcpSkillRunAuditDiagnostic, writeAcpSkillRunAuditPrompt, } from "./acpSkillRunAuditTrail";
import { listRuntimeChildren, statRuntimePath } from "../../runtimePersistence";
import { buildAcpSkillRunPrompt } from "./acpSkillRunPromptBuilder";
import { buildAcpStartupPromptPreamble, prependAcpStartupPromptPreamble, resolveAcpStartupInstructionFile, } from "./acpStartupPromptPreambles";
import { applyHostBridgeCliEnvToBackend, createDisabledHostBridgeCliRunInjection, materializeHostBridgeCliRunInjection, summarizeHostBridgeCliRunInjection, } from "../../hostBridge/cli/hostBridgeCliInjection";
import { ACP_RUNTIME_PROMPT_TEMPLATES_BY_ID, loadAcpRuntimePromptTemplate, renderAcpRuntimePromptTemplate, } from "./acpRuntimePromptTemplates";
import { ensureZoteroMcpServer } from "../../hostBridge/mcp/zoteroMcpServer";
import { ensureHostBridgeServer } from "../../hostBridge/server/hostBridgeServer";
import { listZoteroMcpTools } from "../../hostBridge/mcp/zoteroMcpProtocol";
import { normalizeAcpSkillRuntimeSelection, resolveAcpRuntimeOptionsState, } from "../chat/acpSessionConfigOptions";
import { applyAcpReasoningEffortWithFallback } from "../chat/acpReasoningEffortFallback";
import { resolveAutoApproveAcpPermissionOptionId } from "../transport/acpPermissionOptions";
import { getAcpSkillRunRecord, upsertAcpSkillRun } from "./acpSkillRunStore";
import { parseSupportedZoteroMajor, } from "../../../shared/zoteroRuntimeVersion";
import { autoApproveAcpSkillRunPermissionRequest, setAcpSkillRunPermissionRequest, } from "./acpSkillRunPermissionQueue";
import { getAcpSkillRunRuntimeCatalog, setAcpSkillRunRuntimeCatalog, updateAcpSkillRunRuntimeSelection, } from "./acpSkillRunRuntimeCatalog";
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
function normalizeString(value) {
    return String(value || "").trim();
}
export function isConfirmedAcpPromptInterruption(stopReason) {
    return normalizeString(stopReason) === "cancelled";
}
export function recordAcpSkillRunAdapterDiagnostic(args) {
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
export function resolveAcpProfileZoteroMajor() {
    return parseSupportedZoteroMajor(Zotero?.version);
}
export function isObservableAcpPromptOutputUpdateKind(value) {
    return ACP_OBSERVABLE_PROMPT_OUTPUT_UPDATE_KINDS.has(normalizeString(value));
}
function tailDiagnosticText(value) {
    const text = String(value || "");
    if (text.length <= ACP_SKILL_OUTPUT_DIAGNOSTIC_TEXT_TAIL_CHARS) {
        return text;
    }
    return text.slice(-ACP_SKILL_OUTPUT_DIAGNOSTIC_TEXT_TAIL_CHARS);
}
function toPositiveInteger(value) {
    const numberValue = typeof value === "number"
        ? value
        : typeof value === "string" && normalizeString(value)
            ? Number(value)
            : NaN;
    if (!Number.isInteger(numberValue) || numberValue < 1) {
        return undefined;
    }
    return numberValue;
}
export function errorMessage(error) {
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
};
export function markAcpSkillRunContinuationRunning(args) {
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
export function buildAcpSkillOutputValidationFailureDetails(args) {
    const candidateText = String(args.convergence.candidateText || "");
    const assistantText = String(args.promptOutcome?.assistantText || "") || candidateText;
    const details = {
        errors: args.convergence.errors,
        repairRound: args.repairRound,
        maxRepairRounds: args.maxRepairRounds,
        stopReason: normalizeString(args.promptOutcome?.stopReason),
        sessionId: normalizeString(args.promptOutcome?.sessionId),
        observedAcpActivity: args.promptOutcome?.observedAcpActivity === true,
        standardAssistantTextSeen: args.promptOutcome?.standardAssistantTextSeen === true,
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
export function appendAcpSkillOutputValidationFailureRuntimeLog(args) {
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
export function isJsonObject(value) {
    return !!value && typeof value === "object" && !Array.isArray(value);
}
function cloneJsonRecord(value) {
    return isJsonObject(value) ? { ...value } : {};
}
function resolveRunnerRuntimeDefaultOptions(runnerJson) {
    const runtime = runnerJson.runtime;
    if (!isJsonObject(runtime)) {
        return {};
    }
    const defaults = cloneJsonRecord(runtime.default_options);
    return Object.fromEntries(Object.entries(defaults).filter(([key]) => ACP_SKILL_RUNTIME_DEFAULT_OPTION_KEYS.has(key.trim())));
}
export function resolveAcpSkillRunEffectiveRuntimeOptions(args) {
    const runnerDefaults = resolveRunnerRuntimeDefaultOptions(args.runnerJson);
    const requestRuntimeOptions = cloneJsonRecord(args.request.runtime_options);
    const providerTimeout = toPositiveInteger(args.providerOptions?.hard_timeout_seconds);
    const providerRuntimeOptions = typeof providerTimeout === "number"
        ? { hard_timeout_seconds: providerTimeout }
        : {};
    const runtimeOptions = {
        ...runnerDefaults,
        ...requestRuntimeOptions,
        ...providerRuntimeOptions,
    };
    const requestTimeout = toPositiveInteger(providerRuntimeOptions.hard_timeout_seconds ??
        requestRuntimeOptions.hard_timeout_seconds);
    const runnerTimeout = toPositiveInteger(runnerDefaults.hard_timeout_seconds);
    const hardTimeoutSeconds = requestTimeout ?? runnerTimeout ?? DEFAULT_ACP_SKILL_HARD_TIMEOUT_SECONDS;
    const hardTimeoutSource = typeof requestTimeout === "number"
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
export function cloneJsonObject(value, label) {
    if (!isJsonObject(value)) {
        throw new Error(`${label} must be a JSON object`);
    }
    return JSON.parse(JSON.stringify(value));
}
function normalizeStringArray(value) {
    if (!Array.isArray(value)) {
        return [];
    }
    return Array.from(new Set(value.map((entry) => normalizeString(entry)).filter(Boolean)));
}
export function resolveWorkflowWorkspaceIntent(request) {
    const raw = request.runtime_options?.workspace ||
        request.runtime_options?.workflow_workspace;
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
        return undefined;
    }
    const mode = normalizeString(raw.mode);
    const workflowRunId = normalizeString(raw.workflow_run_id);
    if ((mode !== "new" && mode !== "reuse") || !workflowRunId) {
        return undefined;
    }
    return {
        mode,
        workflowRunId,
    };
}
function basename(path) {
    return (normalizeString(path)
        .split(/[\\/]+/)
        .filter(Boolean)
        .pop() || "");
}
function pathParts(value) {
    return normalizeString(value).replace(/\\/g, "/").split("/").filter(Boolean);
}
function workspaceRelativePath(rootDir, childPath) {
    const rootParts = pathParts(rootDir);
    const childParts = pathParts(childPath);
    let offset = 0;
    while (offset < rootParts.length &&
        offset < childParts.length &&
        rootParts[offset].toLowerCase() === childParts[offset].toLowerCase()) {
        offset += 1;
    }
    const relative = childParts.slice(offset).join("/");
    return relative || basename(childPath);
}
export async function findWorkspaceActivitySnapshot(rootDir) {
    const root = normalizeString(rootDir);
    if (!root) {
        return null;
    }
    const queue = [{ path: root, depth: 0 }];
    let visited = 0;
    let best = null;
    while (queue.length > 0 && visited < 120) {
        const current = queue.shift();
        if (!current)
            break;
        visited += 1;
        const stat = await statRuntimePath(current.path);
        if (!stat.exists)
            continue;
        const mtime = Number(stat.lastModified ||
            stat.mtimeMs ||
            0) || 0;
        if (!stat.isDir) {
            const candidate = { path: current.path, size: stat.size, mtime };
            if (!best ||
                candidate.mtime > best.mtime ||
                (candidate.mtime === best.mtime &&
                    candidate.path.localeCompare(best.path) > 0)) {
                best = candidate;
            }
            continue;
        }
        if (current.depth >= 3)
            continue;
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
export function assertAcpSkillRunRequest(value) {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
        throw new Error("ACP skill runner requires object request");
    }
    const request = value;
    if (request.kind !== ACP_SKILL_RUN_REQUEST_KIND) {
        throw new Error(`ACP skill runner requires ${ACP_SKILL_RUN_REQUEST_KIND}`);
    }
    if (!normalizeString(request.skill_id)) {
        throw new Error("ACP skill runner requires skill_id");
    }
    return request;
}
export function resolveJobId(request) {
    return (normalizeString(request.taskName) ||
        normalizeString(request.targetParentRef?.key) ||
        normalizeString(request.skill_id) ||
        "job");
}
export async function buildRunPrompt(args) {
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
        instructionFile: resolveAcpStartupInstructionFile(context.injectionPlan.family),
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
// The backend-neutral Skill Run preparation module owns execution-mode
// resolution; ACP keeps these names for its existing call sites.
export { readSkillRunRunnerJson as readRunnerJsonForExecutionMode, resolveSkillRunExecutionMode as resolveExecutionMode, } from "../../skillRunPreparation";
export function resolveRunnerRequiredMcpTools(runnerJson) {
    const mcp = runnerJson.mcp;
    if (!mcp || typeof mcp !== "object" || Array.isArray(mcp)) {
        return [];
    }
    const tools = mcp;
    return normalizeStringArray(tools.required_tools || tools.requiredTools);
}
function resolveWorkflowRequiredMcpTools(request) {
    const workflowMcp = request.runtime_options?.workflow_mcp;
    if (!workflowMcp ||
        typeof workflowMcp !== "object" ||
        Array.isArray(workflowMcp)) {
        return [];
    }
    const tools = workflowMcp;
    return normalizeStringArray(tools.required_tools || tools.requiredTools);
}
export function resolveRequiredMcpTools(args) {
    const workflowTools = resolveWorkflowRequiredMcpTools(args.request);
    if (workflowTools.length > 0) {
        return workflowTools;
    }
    return resolveRunnerRequiredMcpTools(args.runnerJson);
}
function resolveZoteroHostAccessRequirement(args) {
    void args.runnerJson;
    const declaration = args.request.runtime_options?.zotero_host_access;
    if (declaration &&
        typeof declaration === "object" &&
        !Array.isArray(declaration)) {
        return {
            required: typeof declaration.required === "boolean" ? declaration.required : true,
            autoApproveWrites: declaration.auto_approve_writes === true,
            source: "request",
        };
    }
    return {
        required: true,
        autoApproveWrites: false,
        source: "default",
    };
}
export async function prepareAcpSkillRunHostBridgeCli(args) {
    const zoteroHostAccess = resolveZoteroHostAccessRequirement({
        request: args.request,
        runnerJson: args.runnerJson,
    });
    const hostBridgeCliInjectionFactory = args.dependencies?.hostBridgeCliInjection ||
        ((input) => materializeHostBridgeCliRunInjection(input));
    const hostBridgeCliInjection = zoteroHostAccess.required
        ? await hostBridgeCliInjectionFactory({
            workspaceDir: args.workspaceDir,
            requestId: args.requestId,
            autoApproveWrites: zoteroHostAccess.autoApproveWrites,
        })
        : createDisabledHostBridgeCliRunInjection();
    const hostBridgeCliState = summarizeHostBridgeCliRunInjection(hostBridgeCliInjection);
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
                    ? "info"
                    : "warn"
                : "info",
            details: {
                ...hostBridgeCliState,
                zoteroHostAccess,
            },
        },
    };
}
export function createAcpHardTimeoutMonitor(args) {
    let timer = null;
    let timeoutPromise = null;
    let resolveTimeout = null;
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
        timeoutPromise = new Promise((resolve) => {
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
    const race = async (promise) => {
        if (!timeoutPromise) {
            return { timedOut: false, value: await promise };
        }
        const guarded = promise
            .then((value) => ({ kind: "value", value }))
            .catch((error) => ({ kind: "error", error }));
        const result = await Promise.race([
            guarded,
            timeoutPromise.then(() => ({ kind: "timeout" })),
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
export async function waitForAcpHardTimeoutTranscriptDrain(promptSettled) {
    if (!promptSettled) {
        return;
    }
    let timer = null;
    try {
        await Promise.race([
            promptSettled.catch(() => undefined),
            new Promise((resolve) => {
                timer = setTimeout(resolve, ACP_HARD_TIMEOUT_TRANSCRIPT_DRAIN_MS);
            }),
        ]);
    }
    finally {
        if (timer) {
            clearTimeout(timer);
        }
    }
}
async function defaultRequiredMcpPreflight(args) {
    if (!args.requiredTools.length) {
        return {
            ok: true,
            availableTools: [],
            missingTools: [],
        };
    }
    if (!args.initialized.canUseHttpMcp) {
        return {
            ok: false,
            availableTools: [],
            missingTools: args.requiredTools,
            message: "ACP backend did not advertise HTTP MCP support.",
        };
    }
    try {
        await ensureZoteroMcpServer({
            hostBridgeStatus: await ensureHostBridgeServer(),
        });
    }
    catch (error) {
        return {
            ok: false,
            availableTools: [],
            missingTools: args.requiredTools,
            message: error instanceof Error
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
async function preflightRequiredMcpTools(args) {
    const requiredTools = args.requiredTools;
    if (!requiredTools.length) {
        return {
            ok: true,
            availableTools: [],
            missingTools: [],
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
            message: result.message ||
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
        message: result.message ||
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
        throw new Error(`${result.message || "Required Zotero MCP preflight failed."}${missing}`);
    }
    return result;
}
async function renderRequiredMcpGuardPrompt(requiredTools) {
    if (!requiredTools.length) {
        return "";
    }
    const template = await loadAcpRuntimePromptTemplate(ACP_RUNTIME_PROMPT_TEMPLATES_BY_ID.mcp_required_guard);
    return renderAcpRuntimePromptTemplate({
        template,
        replacements: {
            REQUIRED_TOOLS_INLINE: requiredTools.join(", "),
        },
        requiredPlaceholders: ["REQUIRED_TOOLS_INLINE"],
    });
}
async function withRequiredMcpGuard(message, requiredTools) {
    const guard = await renderRequiredMcpGuardPrompt(requiredTools);
    if (!guard) {
        return message;
    }
    return `${guard}\n\n${message}`;
}
function resolveAutoApproveAcpPermissionOption(request) {
    return resolveAutoApproveAcpPermissionOptionId(request.source, request.options);
}
export function handleAcpSkillRunPermissionRequest(args) {
    if (getAcpSkillRunRecord(args.requestId)?.providerOptions
        ?.autoApproveAcpPermissions === true) {
        const optionId = resolveAutoApproveAcpPermissionOption(args.request);
        if (optionId &&
            autoApproveAcpSkillRunPermissionRequest({
                runRequestId: args.requestId,
                request: args.request,
                optionId,
            })) {
            return;
        }
    }
    setAcpSkillRunPermissionRequest(args.requestId, args.request);
}
export function wrapAcpSkillRunPermissionRequestForTimeoutPause(args) {
    const permissionRequestId = normalizeString(args.request.requestId);
    if (!permissionRequestId) {
        return args.request;
    }
    args.pause(permissionRequestId);
    let resolved = false;
    return {
        ...args.request,
        resolve: (outcome) => {
            try {
                args.request.resolve(outcome);
            }
            finally {
                if (!resolved) {
                    resolved = true;
                    args.resume(permissionRequestId);
                }
            }
        },
    };
}
export function rememberAcpSkillRunRuntimeCatalog(args) {
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
export function refreshAcpSkillRunRuntimeCatalogFromSession(args) {
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
            currentRawModelId: observed.currentRawModelId || sessionState.currentRawModelId,
            currentDisplayModelId: observed.currentDisplayModelId || sessionState.currentDisplayModelId,
            currentReasoningEffortId: observed.currentReasoningEffortId ||
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
function shouldSkipInitialAcpModelSet(args) {
    const targetRawModelId = normalizeString(args.targetRawModelId);
    const sessionCurrentModelId = normalizeString(args.sessionCurrentModelId);
    return !!targetRawModelId && targetRawModelId === sessionCurrentModelId;
}
export async function applyAcpSkillRunRuntimeSelection(args) {
    const run = getAcpSkillRunRecord(args.requestId);
    if (!run) {
        return;
    }
    const modeId = normalizeString(run.acpModeId);
    const rawModelId = normalizeString(run.acpRawModelId);
    const reasoningEffort = normalizeString(run.acpReasoningEffort);
    const catalog = getAcpSkillRunRuntimeCatalog(args.requestId);
    const modeAllowed = !!modeId && !!catalog?.modeOptions.some((entry) => entry.id === modeId);
    const rawModelAllowed = !!rawModelId &&
        !!catalog?.modelOptions.some((entry) => entry.id === rawModelId);
    const reasoningAllowed = !!reasoningEffort &&
        !!catalog?.reasoningEffortOptions.some((entry) => entry.id === reasoningEffort);
    const rejectUnavailable = (optionKey) => {
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
        const error = new Error(`Provider profile option is unavailable: ${optionKey}`);
        error.code = "provider_profile_option_unavailable";
        throw error;
    };
    if (modeId && !modeAllowed)
        rejectUnavailable("acpModeId");
    if (rawModelId && !rawModelAllowed)
        rejectUnavailable("acpModelId");
    if (reasoningEffort && !reasoningAllowed) {
        rejectUnavailable("acpReasoningEffort");
    }
    const recordApplied = (optionKey) => {
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
    const recordApplyFailure = (optionKey, reasonCode) => {
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
    const applyOption = async (optionKey, apply) => {
        try {
            await apply();
            recordApplied(optionKey);
        }
        catch (error) {
            recordApplyFailure(optionKey, "provider_profile_option_apply_failed");
            throw error;
        }
    };
    if (modeAllowed) {
        await applyOption("acpModeId", () => args.adapter.setMode({ sessionId: args.sessionId, modeId }));
    }
    const skipInitialModelSet = shouldSkipInitialAcpModelSet({
        targetRawModelId: rawModelId,
        sessionCurrentModelId: args.sessionCurrentModelId,
    });
    if (rawModelAllowed && !skipInitialModelSet) {
        await applyOption("acpModelId", () => args.adapter.setModel({
            sessionId: args.sessionId,
            modelId: rawModelId,
        }));
    }
    else if (rawModelAllowed) {
        recordApplied("acpModelId");
    }
    const reasoningSource = catalog?.reasoningSource || "none";
    if (reasoningAllowed &&
        (reasoningSource === "explicit" ||
            (reasoningSource === "none" && !rawModelId))) {
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
                    message: "Reasoning effort setting was rejected by the backend; continuing without it.",
                    level: "warn",
                    details: {
                        optionKey: "acpReasoningEffort",
                        reasonCode: "provider_profile_reasoning_effort_fallback",
                        error: reasoningResult.error.message,
                    },
                },
            });
        }
        else {
            recordApplied("acpReasoningEffort");
        }
    }
    else if (reasoningAllowed && reasoningSource === "model-derived") {
        recordApplied("acpReasoningEffort");
    }
}
