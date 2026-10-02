import { Agent } from "@earendil-works/pi-agent-core";
import { createAssistantMessageEventStream, contentText, EventStream, } from "@earendil-works/pi-ai";
// C18: the Runtime is a fact owner for turn and model invocation boundaries.
// It calls the audit module's own `record` directly with the owner identity its
// session already holds; it defines no audit schema and forwards no callback.
// The provider module owns transport only and never re-reports invocation
// boundaries. An observed failure is committed once to the canonical
// transcript and is not re-factored here — a failure is referenced by
// `failureId`, never re-described.
//
// This is a direct import on purpose: `record` is synchronous and
// non-throwing, so a turn seam needs no await, and piRuntimeAudit does not
// import this module, so there is no cycle.
import { record as recordPiRuntimeAudit, } from "./piRuntimeAudit";
import { PI_PROVIDER_HARD_LIMIT_MS, PI_PROVIDER_INACTIVITY_MS, } from "./piRuntimeLifecycle";
const KNOWN_FAILURE_CODES = new Set([
    "credential_missing",
    "provider_auth_failed",
    "unsupported_provider",
    "unsupported_model",
    "provider_unavailable",
    "provider_rate_limited",
    "provider_network_error",
    "provider_http_error",
    "provider_stream_error",
    "provider_timeout",
    "preparation_failed",
    "agent_loop_limit_exceeded",
    "aborted",
]);
export class PiModelStreamFailure extends Error {
    code;
    constructor(code) {
        super(code);
        this.code = code;
        this.name = "PiModelStreamFailure";
    }
}
/** Raised by reserveAttempts when a mediated charge would exceed the budget. */
export class PiRuntimeToolAttemptLimitError extends Error {
    code = "agent_loop_limit_exceeded";
    constructor() {
        super("agent_loop_limit_exceeded");
        this.name = "PiRuntimeToolAttemptLimitError";
    }
}
const EMPTY_USAGE = {
    input: 0,
    output: 0,
    cacheRead: 0,
    cacheWrite: 0,
    totalTokens: 0,
    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
};
const DEFAULT_TEXT_MODEL = {
    id: "runtime-text",
    name: "Runtime Text",
    api: "runtime-text",
    provider: "builtin-pi",
    baseUrl: "",
    reasoning: false,
    input: ["text"],
    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
    contextWindow: 0,
    maxTokens: 0,
};
function assistantMessage(model, content, stopReason, errorMessage) {
    return {
        role: "assistant",
        content,
        api: model.api,
        provider: model.provider,
        model: model.id,
        usage: EMPTY_USAGE,
        stopReason,
        ...(errorMessage ? { errorMessage } : {}),
        timestamp: Date.now(),
    };
}
function failureStream(model, code, aborted = false) {
    const stream = createAssistantMessageEventStream();
    stream.push({
        type: "start",
        partial: assistantMessage(model, [], "pending"),
    });
    stream.push({
        type: "error",
        reason: aborted ? "aborted" : "error",
        error: assistantMessage(model, [], aborted ? "aborted" : "error", code),
    });
    return stream;
}
function normalizeUsage(usage) {
    return {
        input: usage.input,
        output: usage.output,
        cacheRead: usage.cacheRead,
        cacheWrite: usage.cacheWrite,
        totalTokens: usage.totalTokens,
        cost: {
            input: usage.cost.input,
            output: usage.cost.output,
            cacheRead: usage.cost.cacheRead,
            cacheWrite: usage.cost.cacheWrite,
            total: usage.cost.total,
        },
    };
}
function resourceText(resource) {
    return resource.displayName
        ? resource.displayName + " (" + resource.ref + ")"
        : resource.ref;
}
function argumentsRecord(value) {
    return value && typeof value === "object" && !Array.isArray(value)
        ? value
        : {};
}
function toNativeUserContent(message) {
    const parts = [];
    if (message.text)
        parts.push({ type: "text", text: message.text });
    for (const resource of message.resources ?? [])
        parts.push({ type: "text", text: resourceText(resource) });
    if (parts.length === 1 && parts[0].text === message.text)
        return message.text;
    return parts.length ? parts : "";
}
function toNativeMessage(message, model) {
    if (message.role === "user")
        return {
            role: "user",
            content: toNativeUserContent(message),
            timestamp: Date.now(),
        };
    if (message.role === "tool")
        return {
            role: "toolResult",
            toolCallId: message.callId,
            toolName: message.name,
            content: message.text ? [{ type: "text", text: message.text }] : [],
            isError: message.isError,
            timestamp: Date.now(),
        };
    const content = [];
    if (message.thinking)
        content.push({ type: "thinking", thinking: message.thinking });
    if (message.text)
        content.push({ type: "text", text: message.text });
    for (const call of message.toolCalls ?? [])
        content.push({
            type: "toolCall",
            id: call.callId,
            name: call.name,
            arguments: argumentsRecord(call.arguments),
        });
    return assistantMessage(model, content, message.toolCalls?.length ? "toolUse" : "stop");
}
function projectNativeMessage(message) {
    if (message.role === "user")
        return { role: "user", text: contentText(message.content) };
    if (message.role === "toolResult")
        return {
            role: "tool",
            callId: message.toolCallId,
            name: message.toolName,
            text: contentText(message.content),
            isError: message.isError,
        };
    if (message.role !== "assistant")
        return undefined;
    const toolCalls = [];
    for (const block of message.content) {
        if (block.type !== "toolCall")
            continue;
        toolCalls.push({
            callId: block.id,
            name: block.name,
            arguments: (block.arguments ?? {}),
        });
    }
    return {
        role: "assistant",
        text: contentText(message.content),
        ...(toolCalls.length ? { toolCalls } : {}),
    };
}
function thinkingText(content) {
    return content
        .filter((block) => block.type === "thinking")
        .map((block) => block.thinking)
        .join("");
}
function toolCallsOf(content) {
    const calls = [];
    for (const block of content) {
        if (block.type !== "toolCall")
            continue;
        calls.push({
            callId: block.id,
            name: block.name,
            arguments: (block.arguments ?? {}),
        });
    }
    return calls;
}
function nativeTool(tool) {
    return {
        name: tool.name,
        description: tool.description,
        parameters: tool.schema,
    };
}
function nativeToolDefinition(tool, execute) {
    return {
        name: tool.name,
        description: tool.description,
        label: tool.name,
        parameters: tool.schema,
        ...(tool.prepareArguments
            ? {
                prepareArguments: tool.prepareArguments,
            }
            : {}),
        execute,
    };
}
function buildContext(plan, base, model) {
    return {
        systemPrompt: plan.systemPrompt ?? base.systemPrompt,
        messages: plan.messages
            ? plan.messages.map((message) => toNativeMessage(message, model))
            : base.messages,
        tools: plan.tools ? plan.tools.map(nativeTool) : base.tools,
    };
}
function projectContextInput(context, signal) {
    const messages = [];
    for (const message of context.messages) {
        if (message.role === "user" || message.role === "assistant")
            messages.push({ role: message.role, text: contentText(message.content) });
    }
    return { systemPrompt: context.systemPrompt ?? "", messages, signal };
}
function streamFrom(modelStream) {
    return (model, context, options) => {
        const stream = createAssistantMessageEventStream();
        const signal = options?.signal;
        if (!signal) {
            stream.push({
                type: "error",
                reason: "error",
                error: assistantMessage(model, [], "error", "runtime_signal_unavailable"),
            });
            return stream;
        }
        void (async () => {
            let text = "";
            stream.push({
                type: "start",
                partial: assistantMessage(model, [], "pending"),
            });
            try {
                for await (const delta of modelStream(projectContextInput(context, signal))) {
                    if (signal.aborted)
                        break;
                    text += delta;
                    stream.push({
                        type: "text_delta",
                        contentIndex: 0,
                        delta,
                        partial: assistantMessage(model, [{ type: "text", text }], "pending"),
                    });
                }
                if (signal.aborted)
                    stream.push({
                        type: "error",
                        reason: "aborted",
                        error: assistantMessage(model, [{ type: "text", text }], "aborted"),
                    });
                else
                    stream.push({
                        type: "done",
                        reason: "stop",
                        message: assistantMessage(model, [{ type: "text", text }], "stop"),
                    });
            }
            catch (error) {
                stream.push({
                    type: "error",
                    reason: "error",
                    error: assistantMessage(model, [], "error", error instanceof PiModelStreamFailure ? error.code : "model_failed"),
                });
            }
        })();
        return stream;
    };
}
function invocationIndex(invocationId) {
    const value = Number(invocationId.slice(invocationId.lastIndexOf(":") + 1));
    return Number.isFinite(value) && value >= 0 ? value : 0;
}
/**
 * Deterministic structured source for tests: each invocation consumes one
 * scripted step by index, emitting text/thinking deltas and/or tool calls.
 */
export function createPiTextProviderSource(options) {
    const model = options.model ?? DEFAULT_TEXT_MODEL;
    const source = ({ invocationId: id }) => {
        const index = invocationIndex(id);
        const step = options.steps[Math.min(index, Math.max(options.steps.length - 1, 0))] ??
            {};
        const content = [];
        if (step.thinking)
            content.push({ type: "thinking", thinking: step.thinking });
        if (step.text)
            content.push({ type: "text", text: step.text });
        for (const call of step.toolCalls ?? [])
            content.push({
                type: "toolCall",
                id: call.callId,
                name: call.name,
                arguments: argumentsRecord(call.arguments),
            });
        const toolUse = (step.toolCalls?.length ?? 0) > 0;
        const stopReason = toolUse ? "toolUse" : "stop";
        const stream = createAssistantMessageEventStream();
        stream.push({
            type: "start",
            partial: assistantMessage(model, [], "pending"),
        });
        if (step.text)
            stream.push({
                type: "text_delta",
                contentIndex: 0,
                delta: step.text,
                partial: assistantMessage(model, content, "pending"),
            });
        stream.push({
            type: "done",
            reason: stopReason,
            message: assistantMessage(model, content, stopReason),
        });
        return stream;
    };
    return { model, source };
}
/** Whole-run bounds used when no trusted owner limits are supplied. */
export const PI_RUNTIME_LOOP_GUARD_LIMITS = {
    invocations: 20,
    toolAttempts: 100,
};
/** Cycle detection scans repeated tool cycles of length one through this bound. */
export const PI_RUNTIME_LOOP_GUARD_MAX_CYCLE_LENGTH = 5;
/** A deterministic cycle stops the run once it repeats this many times. */
export const PI_RUNTIME_LOOP_GUARD_CYCLE_REPEATS = 5;
function resolveLoopGuardLimit(fallback, trusted, requested) {
    const value = Math.min(trusted ?? fallback, requested ?? Number.POSITIVE_INFINITY);
    return Number.isFinite(value) ? Math.max(0, Math.floor(value)) : fallback;
}
/**
 * Determines whether the recent tool batch signatures already contain a
 * deterministic cycle of length one through five repeated five times. Only the
 * runtime's own recorded batch facts feed the check; streamed text never does.
 */
function repeatedToolCycle(cycles) {
    const repeats = PI_RUNTIME_LOOP_GUARD_CYCLE_REPEATS;
    for (let length = 1; length <= PI_RUNTIME_LOOP_GUARD_MAX_CYCLE_LENGTH; length++) {
        const span = length * repeats;
        if (cycles.length < span)
            continue;
        const start = cycles.length - span;
        let repeated = true;
        for (let offset = 0; offset < span; offset++) {
            if (cycles[start + offset] !== cycles[start + (offset % length)]) {
                repeated = false;
                break;
            }
        }
        if (repeated)
            return true;
    }
    return false;
}
function canonicalJson(value) {
    if (value === null || typeof value !== "object")
        return JSON.stringify(value) ?? "null";
    if (Array.isArray(value))
        return "[" + value.map((item) => canonicalJson(item)).join(",") + "]";
    const record = value;
    return ("{" +
        Object.keys(record)
            .sort()
            .map((key) => JSON.stringify(key) + ":" + canonicalJson(record[key]))
            .join(",") +
        "}");
}
/** Deterministic result category of one settled tool call. */
function toolResultCategory(result) {
    if (!result)
        return "withheld";
    const certainty = result.effectCertainty ?? "not_applicable";
    return (result.isError ? "error" : "ok") + ":" + certainty;
}
/** Deterministic identity of one executed tool batch. */
function toolBatchFingerprint(batch) {
    if (!batch.calls.length)
        return "";
    const byCall = new Map(batch.results.map((result) => [result.callId, result]));
    const entries = batch.calls.map((call) => [
        call.name,
        canonicalJson(call.arguments),
        toolResultCategory(byCall.get(call.callId)),
    ]);
    return JSON.stringify([entries, batch.progress ?? ""]);
}
/**
 * Builds the reusable whole-run LoopGuard. It mutates the caller-owned state in
 * place and commits counters through the injected persist hook before each
 * dispatch, so an owner can restore a run without replaying model or tool work.
 */
export function createPiRuntimeLoopGuard(input) {
    const state = input?.state ?? {
        invocations: 0,
        toolAttempts: 0,
        cycles: [],
    };
    if (!Array.isArray(state.cycles))
        state.cycles = [];
    const limits = {
        invocations: resolveLoopGuardLimit(PI_RUNTIME_LOOP_GUARD_LIMITS.invocations, input?.trustedLimits?.invocations, input?.requestedLimits?.invocations),
        toolAttempts: resolveLoopGuardLimit(PI_RUNTIME_LOOP_GUARD_LIMITS.toolAttempts, input?.trustedLimits?.toolAttempts, input?.requestedLimits?.toolAttempts),
    };
    const commit = async () => {
        if (input?.persist)
            await input.persist(state);
    };
    return {
        state,
        limits,
        isInvocationBlocked: () => state.invocations >= limits.invocations,
        isCycleBlocked: () => repeatedToolCycle(state.cycles),
        allowsToolBatch: (attempts) => state.toolAttempts + attempts <= limits.toolAttempts,
        commitInvocation: async () => {
            state.invocations += 1;
            await commit();
        },
        commitToolAttempts: async (attempts) => {
            state.toolAttempts += attempts;
            await commit();
        },
        recordToolBatch: async (batch) => {
            const signature = toolBatchFingerprint(batch);
            if (signature) {
                state.cycles.push(signature);
                const ceiling = PI_RUNTIME_LOOP_GUARD_MAX_CYCLE_LENGTH *
                    PI_RUNTIME_LOOP_GUARD_CYCLE_REPEATS;
                if (state.cycles.length > ceiling)
                    state.cycles.splice(0, state.cycles.length - ceiling);
            }
            await commit();
        },
    };
}
export class PiRuntime {
    openSession(options) {
        const { sessionId } = options;
        if (!sessionId.trim())
            throw new Error("session_id_required");
        const audit = options.audit;
        // The context is only the owner identity this session already holds, so
        // there is no callback to forward and no audit schema here: the audit
        // module owns admission and storage. `record` is synchronous and
        // non-throwing, so recording never adds latency to a turn; where a
        // canonical owner callback is involved, the record happens after that
        // callback is awaited, never instead of it.
        const auditRecord = (fact) => {
            if (!audit)
                return;
            recordPiRuntimeAudit({ ...fact, ...audit });
        };
        const textStream = "modelStream" in options ? options.modelStream : undefined;
        const model = "source" in options ? options.model : DEFAULT_TEXT_MODEL;
        const source = "source" in options ? options.source : undefined;
        const agentSource = source
            ? source
            : textStream
                ? (request) => streamFrom(textStream)(request.model, request.context, {
                    signal: request.signal,
                })
                : undefined;
        const agent = new Agent({
            sessionId,
            initialState: { model, tools: [], systemPrompt: "" },
            streamFn: () => failureStream(model, "runtime_failed"),
        });
        agent.toolExecution = "parallel";
        let disposed = false;
        let active = false;
        let activeAbort = null;
        const emitInto = async (events, turnId, counter, payload, onEvent) => {
            const event = {
                ...payload,
                sessionId,
                turnId,
                sequence: ++counter.sequence,
            };
            if (onEvent)
                await Promise.resolve(onEvent(event)).catch(() => undefined);
            events.push(event);
            return event;
        };
        const textTurn = (input) => {
            if (disposed)
                throw new Error("session_disposed");
            if (active)
                throw new Error("owner_busy");
            if (!input.turnId.trim())
                throw new Error("turn_id_required");
            if (!textStream)
                throw new Error("session_mode_invalid");
            active = true;
            auditRecord({
                operation: "turn.started",
                origin: "runtime",
                correlation: {
                    sessionId,
                    turnId: input.turnId,
                    invocationId: input.turnId + ":invocation:0",
                },
            });
            agent.state.model = DEFAULT_TEXT_MODEL;
            agent.state.systemPrompt = input.systemPrompt ?? "";
            agent.state.tools = [];
            agent.streamFunction = streamFrom(textStream);
            agent.transformContext = undefined;
            agent.beforeToolCall = undefined;
            agent.shouldStopAfterTurn = undefined;
            const events = new EventStream((event) => event.kind === "terminal", (event) => event.kind === "terminal" ? event.result : { status: "canceled" });
            const counter = { sequence: 0 };
            const invocationId = input.turnId + ":invocation:0";
            let terminal = false;
            let text = "";
            let nativeFailure = false;
            let nativeFailureCode = "model_failed";
            const emit = (payload) => emitInto(events, input.turnId, counter, payload);
            const finish = async (result) => {
                if (terminal)
                    return;
                terminal = true;
                auditRecord({
                    operation: "turn.terminal",
                    origin: "runtime",
                    correlation: {
                        sessionId,
                        turnId: input.turnId,
                        invocationId: input.turnId + ":invocation:0",
                    },
                    attributes: { status: result.status },
                });
                await emit({ kind: "terminal", result });
            };
            const unsubscribe = agent.subscribe(async (event) => {
                if (terminal)
                    return;
                if (event.type === "message_update" &&
                    event.assistantMessageEvent.type === "text_delta") {
                    const delta = event.assistantMessageEvent.delta;
                    text += delta;
                    await emit({ kind: "text_delta", invocationId, text: delta });
                }
                else if (event.type === "message_end" &&
                    event.message.role === "assistant") {
                    nativeFailure = event.message.stopReason === "error";
                    if (nativeFailure &&
                        event.message.errorMessage &&
                        KNOWN_FAILURE_CODES.has(event.message.errorMessage))
                        nativeFailureCode = event.message.errorMessage;
                }
            });
            const abort = () => {
                if (terminal)
                    return;
                finish({ status: "canceled" });
                agent.abort();
            };
            const suspend = () => {
                if (terminal)
                    return;
                finish({ status: "suspended" });
                agent.abort();
            };
            activeAbort = abort;
            const settle = (result) => {
                unsubscribe();
                active = false;
                activeAbort = null;
                finish(result);
            };
            const settled = agent.prompt(input.prompt).then(() => settle(nativeFailure
                ? {
                    status: "failed",
                    failure: {
                        code: nativeFailureCode,
                        message: "Model execution failed",
                    },
                }
                : { status: "completed", text }), () => settle({
                status: "failed",
                failure: {
                    code: "runtime_failed",
                    message: "Runtime execution failed",
                },
            }));
            return { events, result: events.result(), settled, abort, suspend };
        };
        const agentTurn = (input) => {
            if (disposed)
                throw new Error("session_disposed");
            if (active)
                throw new Error("owner_busy");
            if (!input.turnId.trim())
                throw new Error("turn_id_required");
            if (!agentSource)
                throw new Error("session_mode_invalid");
            active = true;
            auditRecord({
                operation: "turn.started",
                origin: "runtime",
                correlation: { sessionId, turnId: input.turnId },
            });
            const events = new EventStream((event) => event.kind === "terminal", (event) => event.kind === "terminal" ? event.result : { status: "canceled" });
            const counter = { sequence: 0 };
            let terminal = false;
            let nativeFailure = false;
            let nativeFailureCode = "model_failed";
            let prepareFailed = false;
            const loopGuard = createPiRuntimeLoopGuard(input.loopGuard);
            let invocationCount = 0;
            let invocationId = "";
            let pendingPlan;
            let finalText = "";
            let batchAssistant;
            let batchCalls = [];
            let batchResults = new Map();
            let batchPromise;
            let batchSuspended = false;
            let batchWaitingUser = false;
            let batchSuspendedRun = false;
            let batchUnknown = false;
            let batchLimitExceeded = false;
            let batchText = "";
            let suppressed = new Set();
            let invocationStarted = false;
            let invocationSettled = false;
            let invocationSuppressed = false;
            let invocationIndexValue = 0;
            let suppressing = false;
            let suspending = false;
            let guardBlocked = false;
            let failure;
            const physicalProviders = [];
            const emit = (payload) => emitInto(events, input.turnId, counter, payload, input.onEvent);
            const finish = async (result) => {
                if (terminal)
                    return;
                terminal = true;
                auditRecord({
                    operation: "turn.terminal",
                    origin: "runtime",
                    correlation: {
                        sessionId,
                        turnId: input.turnId,
                        ...(invocationId ? { invocationId } : {}),
                    },
                    attributes: { status: result.status },
                });
                await emit({ kind: "terminal", result });
            };
            const beginBatch = (assistant) => {
                if (batchAssistant === assistant)
                    return;
                batchAssistant = assistant;
                batchCalls = [];
                batchResults = new Map();
                batchPromise = undefined;
                batchSuspended = false;
                batchWaitingUser = false;
                batchSuspendedRun = false;
                batchUnknown = false;
                batchLimitExceeded = false;
                suppressed = new Set();
                batchText = contentText(assistant.content);
            };
            const ensureBatch = (signal) => (batchPromise ??= (async () => {
                const calls = batchCalls.slice();
                const mediated = input.toolAttemptAccounting === "gateway";
                if (!mediated) {
                    if (!loopGuard.allowsToolBatch(calls.length)) {
                        batchLimitExceeded = true;
                        failure = "agent_loop_limit_exceeded";
                        for (const call of calls)
                            suppressed.add(call.callId);
                        return;
                    }
                    try {
                        await loopGuard.commitToolAttempts(calls.length);
                    }
                    catch {
                        failure = "runtime_failed";
                        for (const call of calls)
                            suppressed.add(call.callId);
                        return;
                    }
                }
                // Default accounting reserves the whole batch before dispatch, so a
                // crash over-counts rather than losing attempts. A mediated owner
                // charges only what it really dispatches, through reserveAttempts,
                // after its preflight and before its first effect; a charge beyond the
                // remaining budget refuses the batch without dispatching anything.
                let reservedAttempts = mediated ? 0 : calls.length;
                let reservationReported = !mediated;
                const reserveAttempts = async (attempts) => {
                    reservationReported = true;
                    const target = Math.min(Math.max(0, Math.floor(Number(attempts) || 0)), calls.length);
                    const delta = target - reservedAttempts;
                    if (!delta)
                        return;
                    if (delta > 0 && !loopGuard.allowsToolBatch(delta)) {
                        throw new PiRuntimeToolAttemptLimitError();
                    }
                    await loopGuard.commitToolAttempts(delta);
                    reservedAttempts = target;
                };
                let outcome;
                try {
                    outcome = await input.executeTools({
                        turnId: input.turnId,
                        assistantText: batchText,
                        calls,
                        signal,
                        reserveAttempts,
                    });
                }
                catch (error) {
                    if (error instanceof PiRuntimeToolAttemptLimitError) {
                        batchLimitExceeded = true;
                        failure = "agent_loop_limit_exceeded";
                        for (const call of calls)
                            suppressed.add(call.callId);
                        return;
                    }
                    throw error;
                }
                if (mediated && !reservationReported) {
                    // A mediated owner that never reported leaves the run's accounting
                    // unknowable; charging the whole batch after the effects ran could
                    // exceed the budget, so the turn fails closed instead.
                    batchLimitExceeded = true;
                    failure = "runtime_failed";
                    for (const call of calls)
                        suppressed.add(call.callId);
                    return;
                }
                for (const result of outcome.results)
                    batchResults.set(result.callId, result);
                try {
                    await loopGuard.recordToolBatch({
                        calls,
                        results: outcome.results,
                        progress: outcome.progress,
                    });
                }
                catch {
                    failure = "runtime_failed";
                }
                const outstanding = (outcome.pending?.length ?? 0) > 0 ||
                    calls.some((call) => !batchResults.has(call.callId));
                batchWaitingUser = outcome.waitingUser === true;
                batchSuspendedRun = outcome.suspendedRun === true;
                batchSuspended =
                    (outcome.suspended === true || outstanding) &&
                        !batchWaitingUser &&
                        !batchSuspendedRun;
                batchUnknown =
                    (outcome.unknown?.length ?? 0) > 0 ||
                        outcome.results.some((result) => result.effectCertainty === "unknown");
            })());
            const toolExecute = (name) => async (callId, params, signal) => {
                const abortSignal = signal ?? agent.signal;
                if (!input.executeTools) {
                    const tool = (input.tools ?? []).find((item) => item.name === name);
                    if (!tool)
                        return { content: [], details: {}, isError: true };
                    const outcome = await tool.execute({
                        callId,
                        name,
                        arguments: params,
                        signal: abortSignal,
                    });
                    return {
                        content: outcome.text
                            ? [{ type: "text", text: outcome.text }]
                            : [],
                        details: {},
                        isError: outcome.isError === true,
                    };
                }
                await ensureBatch(abortSignal);
                const result = batchResults.get(callId);
                if (!result) {
                    suppressed.add(callId);
                    return { content: [], details: {}, isError: false };
                }
                return {
                    content: result.text
                        ? [{ type: "text", text: result.text }]
                        : [],
                    details: {},
                    isError: result.isError,
                };
            };
            agent.state.model = model;
            agent.state.systemPrompt = input.systemPrompt ?? "";
            agent.state.messages = input.messages.length
                ? input.messages.map((message) => toNativeMessage(message, model))
                : [{ role: "user", content: "", timestamp: Date.now() }];
            agent.state.tools = (input.tools ?? []).map((tool) => nativeToolDefinition(tool, toolExecute(tool.name)));
            agent.transformContext = async (messages, signal) => {
                const index = invocationCount++;
                invocationId = input.turnId + ":invocation:" + index;
                invocationIndexValue = index;
                invocationStarted = false;
                invocationSettled = false;
                invocationSuppressed = false;
                prepareFailed = false;
                pendingPlan = undefined;
                guardBlocked = false;
                if (suppressing || suspending)
                    return messages;
                if (loopGuard.isInvocationBlocked() || loopGuard.isCycleBlocked()) {
                    guardBlocked = true;
                    failure = "agent_loop_limit_exceeded";
                    invocationSuppressed = true;
                    return messages;
                }
                if (!input.prepareInvocation)
                    return messages;
                try {
                    const plan = await input.prepareInvocation({
                        turnId: input.turnId,
                        invocationId,
                        invocationIndex: index,
                        messages: messages
                            .map(projectNativeMessage)
                            .filter((message) => !!message),
                        signal: signal ?? agent.signal,
                    });
                    pendingPlan = plan ?? undefined;
                }
                catch (error) {
                    prepareFailed = true;
                    invocationSuppressed = true;
                    failure = "preparation_failed";
                }
                return messages;
            };
            agent.streamFunction = async (streamModel, context, streamOptions) => {
                const signal = streamOptions?.signal ?? agent.signal;
                if (suppressing || suspending || signal?.aborted)
                    return failureStream(streamModel, "aborted", true);
                if (prepareFailed)
                    return failureStream(streamModel, "preparation_failed");
                if (guardBlocked)
                    return failureStream(streamModel, "agent_loop_limit_exceeded");
                if (!signal) {
                    invocationSuppressed = true;
                    failure = "provider_stream_error";
                    return failureStream(streamModel, "provider_stream_error");
                }
                const outbound = pendingPlan
                    ? buildContext(pendingPlan, context, streamModel)
                    : context;
                if (pendingPlan?.tools)
                    agent.state.tools = pendingPlan.tools.map((tool) => nativeToolDefinition(tool, toolExecute(tool.name)));
                try {
                    await loopGuard.commitInvocation();
                }
                catch {
                    invocationSuppressed = true;
                    failure = "runtime_failed";
                    return failureStream(streamModel, "runtime_failed");
                }
                invocationStarted = true;
                invocationSettled = false;
                await emit({
                    kind: "invocation_started",
                    invocationId,
                    invocationIndex: invocationIndexValue,
                });
                // The owner has observed invocation_started through its canonical
                // event callback; only now does the structural fact exist.
                auditRecord({
                    operation: "model.invocation_started",
                    origin: "provider",
                    correlation: { sessionId, turnId: input.turnId, invocationId },
                    attributes: { count: invocationIndexValue + 1 },
                });
                try {
                    const forwarded = createAssistantMessageEventStream();
                    const abortStream = () => forwarded.push({
                        type: "error",
                        reason: "aborted",
                        error: assistantMessage(streamModel, [], "aborted"),
                    });
                    signal.addEventListener("abort", abortStream, { once: true });
                    const limits = "providerTimeouts" in options
                        ? options.providerTimeouts
                        : undefined;
                    let inactiveTimer;
                    const expire = () => {
                        if (terminal)
                            return;
                        failure = "provider_timeout";
                        suppressing = true;
                        forwarded.push({
                            type: "error",
                            reason: "error",
                            error: assistantMessage(streamModel, [], "error", "provider_timeout"),
                        });
                        void finish({
                            status: "failed",
                            failure: {
                                code: "provider_timeout",
                                message: "Provider execution timed out",
                            },
                        });
                        agent.abort();
                    };
                    const activity = () => {
                        clearTimeout(inactiveTimer);
                        inactiveTimer = setTimeout(expire, limits?.inactivityMs ?? PI_PROVIDER_INACTIVITY_MS);
                    };
                    activity();
                    const hardTimer = setTimeout(expire, limits?.hardMs ?? PI_PROVIDER_HARD_LIMIT_MS);
                    const physical = (async () => {
                        const physicalInvocationId = invocationId;
                        try {
                            const provider = await agentSource({
                                sessionId,
                                turnId: input.turnId,
                                invocationId,
                                model: streamModel,
                                context: outbound,
                                signal,
                            });
                            for await (const event of provider) {
                                if (terminal || signal.aborted)
                                    continue;
                                activity();
                                forwarded.push(event);
                            }
                        }
                        catch (error) {
                            if (!terminal)
                                forwarded.push({
                                    type: "error",
                                    reason: "error",
                                    error: assistantMessage(streamModel, [], "error", error instanceof PiModelStreamFailure
                                        ? error.code
                                        : "model_failed"),
                                });
                        }
                        finally {
                            signal.removeEventListener("abort", abortStream);
                            clearTimeout(inactiveTimer);
                            clearTimeout(hardTimer);
                            // The provider actually finished, which is the physical fact
                            // this hook reports. Gating on `terminal` skipped exactly the
                            // abort and suspend paths where a caller most needs to know the
                            // child is gone, and let a turn invent physical settlement from
                            // its own logical result instead.
                            if (input.onInvocationSettled)
                                await Promise.resolve(input.onInvocationSettled({
                                    turnId: input.turnId,
                                    invocationId: physicalInvocationId,
                                }));
                        }
                    })();
                    physicalProviders.push(physical.catch(() => "unknown"));
                    return forwarded;
                }
                catch (error) {
                    if (error instanceof PiModelStreamFailure)
                        return failureStream(streamModel, error.code, signal.aborted);
                    return failureStream(streamModel, "model_failed", signal.aborted);
                }
            };
            agent.beforeToolCall = async (context) => {
                beginBatch(context.assistantMessage);
                const call = context.toolCall;
                if (input.beforeToolCall) {
                    const decision = await input.beforeToolCall({
                        turnId: input.turnId,
                        assistantText: batchText,
                        callId: call.id,
                        name: call.name,
                        arguments: context.args,
                        signal: agent.signal,
                    });
                    if (decision?.block)
                        return { block: true, reason: decision.reason };
                }
                batchCalls.push({
                    callId: call.id,
                    name: call.name,
                    arguments: context.args,
                });
                return undefined;
            };
            agent.shouldStopAfterTurn = () => suppressing ||
                suspending ||
                guardBlocked ||
                batchSuspended ||
                batchUnknown ||
                batchWaitingUser ||
                batchSuspendedRun ||
                batchLimitExceeded;
            const unsubscribe = agent.subscribe(async (event) => {
                if (terminal || (suppressing && event.type !== "tool_execution_end"))
                    return;
                if (event.type === "message_update") {
                    const update = event.assistantMessageEvent;
                    if (update.type === "text_delta")
                        await emit({
                            kind: "text_delta",
                            invocationId,
                            text: update.delta,
                        });
                    else if (update.type === "thinking_delta")
                        await emit({
                            kind: "thinking_delta",
                            invocationId,
                            text: update.delta,
                        });
                }
                else if (event.type === "message_end" &&
                    event.message.role === "assistant") {
                    if (invocationSuppressed)
                        return;
                    const message = event.message;
                    nativeFailure = message.stopReason === "error";
                    if (nativeFailure &&
                        message.errorMessage &&
                        KNOWN_FAILURE_CODES.has(message.errorMessage))
                        nativeFailureCode = message.errorMessage;
                    if (nativeFailure)
                        failure = nativeFailureCode;
                    const text = contentText(message.content);
                    if (text)
                        finalText = text;
                    if (message.stopReason !== "error" &&
                        message.stopReason !== "aborted")
                        await emit({
                            kind: "assistant_message",
                            invocationId,
                            text,
                            thinking: thinkingText(message.content),
                            toolCalls: toolCallsOf(message.content),
                            usage: normalizeUsage(message.usage),
                            stopReason: message.stopReason,
                        });
                    if (invocationStarted && !invocationSettled) {
                        invocationSettled = true;
                        await emit({
                            kind: "invocation_terminal",
                            invocationId,
                            stopReason: message.stopReason,
                        });
                        auditRecord({
                            operation: "model.invocation_terminal",
                            origin: "provider",
                            correlation: { sessionId, turnId: input.turnId, invocationId },
                            attributes: { reason: message.stopReason },
                        });
                    }
                }
                else if (event.type === "tool_execution_end") {
                    if (suppressed.has(event.toolCallId))
                        return;
                    await emit({
                        kind: "tool_result",
                        callId: event.toolCallId,
                        name: event.toolName,
                        text: contentText(event.result?.content ?? []),
                        isError: event.isError,
                    });
                }
            });
            const abort = () => {
                if (terminal || suppressing || suspending)
                    return;
                suppressing = true;
                void finish({ status: "canceled" });
                agent.abort();
            };
            const suspend = () => {
                if (terminal || suppressing || suspending)
                    return;
                suspending = true;
                void finish({ status: "suspended" });
                agent.abort();
            };
            activeAbort = abort;
            const settle = async (result) => {
                unsubscribe();
                if (!suppressing && !suspending) {
                    active = false;
                    activeAbort = null;
                }
                if (!terminal && invocationStarted && !invocationSettled) {
                    invocationSettled = true;
                    await emit({
                        kind: "invocation_terminal",
                        invocationId,
                        stopReason: "aborted",
                    });
                    auditRecord({
                        operation: "model.invocation_terminal",
                        origin: "provider",
                        correlation: { sessionId, turnId: input.turnId, invocationId },
                        attributes: { reason: "aborted" },
                    });
                }
                await finish(result);
            };
            const logicalAgentCompletion = agent.continue().then(() => settle(suspending
                ? { status: "suspended" }
                : suppressing
                    ? { status: "canceled" }
                    : failure
                        ? {
                            status: "failed",
                            failure: {
                                code: failure,
                                message: "Turn execution failed",
                            },
                        }
                        : nativeFailure
                            ? {
                                status: "failed",
                                failure: {
                                    code: nativeFailureCode,
                                    message: "Model execution failed",
                                },
                            }
                            : batchUnknown
                                ? { status: "state_unknown" }
                                : batchSuspended
                                    ? { status: "waiting_permission" }
                                    : batchWaitingUser
                                        ? { status: "waiting_user" }
                                        : batchSuspendedRun
                                            ? { status: "suspended" }
                                            : { status: "completed", text: finalText }), () => settle(suspending
                ? { status: "suspended" }
                : suppressing
                    ? { status: "canceled" }
                    : failure
                        ? {
                            status: "failed",
                            failure: {
                                code: failure,
                                message: "Turn execution failed",
                            },
                        }
                        : {
                            status: "failed",
                            failure: {
                                code: "runtime_failed",
                                message: "Runtime execution failed",
                            },
                        }));
            const settled = logicalAgentCompletion.then(async () => {
                const outcomes = await Promise.all(physicalProviders);
                if (outcomes.includes("unknown"))
                    return "unknown";
                active = false;
                activeAbort = null;
            });
            return { events, result: events.result(), settled, abort, suspend };
        };
        return {
            runTurn(input) {
                return "prompt" in input ? textTurn(input) : agentTurn(input);
            },
            dispose() {
                if (disposed)
                    return;
                disposed = true;
                activeAbort?.();
            },
        };
    }
}
