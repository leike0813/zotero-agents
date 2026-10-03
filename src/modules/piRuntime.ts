import { Agent } from "@earendil-works/pi-agent-core";
import type {
  AgentMessage,
  AgentTool,
  StreamFn,
} from "@earendil-works/pi-agent-core";
import {
  createAssistantMessageEventStream,
  contentText,
  EventStream,
  getCurrentSystemPrompt,
  normalizeContext,
  type AssistantMessage,
  type AssistantMessageEventStream,
  type TranscriptContext,
  type Message,
  type Model,
  type TextContent,
  type Tool,
  type Usage,
} from "@earendil-works/pi-ai";
import type { JsonValue } from "../workflows/types";
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
import {
  record as recordPiRuntimeAudit,
  type PiRuntimeAuditContext,
  type PiRuntimeAuditFact,
} from "./piRuntimeAudit";
import {
  PI_PROVIDER_HARD_LIMIT_MS,
  PI_PROVIDER_INACTIVITY_MS,
} from "./piRuntimeLifecycle";
import {
  hasPiReportedUsage,
  estimatePiInvocationCost,
  readPiFrozenPricing,
  type PiCostState,
} from "../shared/piUsageContract";
import type { PiModelCost } from "../shared/piProviderContract";

export type PiModelFailureCode =
  | "credential_missing"
  | "provider_auth_failed"
  | "unsupported_provider"
  | "unsupported_model"
  | "provider_unavailable"
  | "provider_rate_limited"
  | "provider_network_error"
  | "provider_http_error"
  | "provider_stream_error"
  | "provider_timeout"
  | "aborted";

const KNOWN_FAILURE_CODES = new Set<string>([
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
  constructor(readonly code: PiModelFailureCode) {
    super(code);
    this.name = "PiModelStreamFailure";
  }
}

/**
 * Legacy text-only model seam. Kept for deterministic callers and tests that
 * need plain text deltas; the Agent path uses {@link PiRuntimeProviderSource}.
 */
export type PiRuntimeModelInput = {
  systemPrompt: string;
  messages: readonly { role: "user" | "assistant"; text: string }[];
  signal: AbortSignal;
};
export type PiRuntimeModelSource = (
  input: PiRuntimeModelInput,
) => AsyncIterable<string>;

export type PiRuntimeUsage = {
  input: number;
  output: number;
  cacheRead: number;
  cacheWrite: number;
  cacheWrite1h?: number;
  totalTokens: number;
  /**
   * Project estimate from the selection's frozen applicable rates. It is
   * separate from the SDK's own cost block, which reports only what the
   * provider priced and therefore reads as zero for every unmapped target.
   */
  costEstimate: number | null;
  costState: PiCostState;
  /** Whether the provider actually reported token facts for this invocation. */
  usageKnown: boolean;
  cost: {
    input: number;
    output: number;
    cacheRead: number;
    cacheWrite: number;
    total: number;
  };
};

export type PiRuntimeStopReason =
  | "stop"
  | "length"
  | "toolUse"
  | "error"
  | "aborted"
  | "deferred"
  | "pending";

export type PiRuntimeToolCall = {
  callId: string;
  name: string;
  arguments: JsonValue;
};

/** Safe, model-visible resource reference already admitted for this owner. */
export type PiRuntimeResource = {
  kind: "snapshot" | "selection";
  ref: string;
  displayName?: string;
};

export type PiRuntimeMessage =
  | { role: "user"; text: string; resources?: readonly PiRuntimeResource[] }
  | {
      role: "assistant";
      text: string;
      thinking?: string;
      toolCalls?: readonly PiRuntimeToolCall[];
    }
  | {
      role: "tool";
      callId: string;
      name: string;
      text: string;
      isError: boolean;
    };

export type PiRuntimeToolOutcome = { text: string; isError?: boolean };
export type PiRuntimeTool = {
  name: string;
  description: string;
  schema: Record<string, unknown>;
  prepareArguments?(args: unknown): unknown;
  execute(input: {
    callId: string;
    name: string;
    arguments: unknown;
    signal: AbortSignal;
  }): Promise<PiRuntimeToolOutcome>;
};

export type PiRuntimeEffectCertainty =
  | "not_applicable"
  | "not_started"
  | "confirmed_none"
  | "confirmed_complete"
  | "confirmed_partial"
  | "unknown";

export type PiRuntimeToolResult = {
  callId: string;
  name: string;
  text: string;
  isError: boolean;
  effectCertainty?: PiRuntimeEffectCertainty;
};

export type PiRuntimeToolBatch = {
  turnId: string;
  assistantText: string;
  calls: readonly PiRuntimeToolCall[];
  signal: AbortSignal;
};

/**
 * Whole-batch tool execution seam owned by the coordinator. Runs once per
 * assistant tool batch. Calls absent from `results` (or listed in `pending`) are
 * suspended: their result is withheld from events and the turn stops with
 * `waiting_permission` before any further model invocation.
 *
 * `waitingUser` stops the turn as `waiting_user` while the owner collects a
 * structured user answer; `suspendedRun` stops the turn as `suspended` when the
 * owner suspended the run for later continuation. Both withhold results and
 * issue no further model invocation.
 */
export type PiRuntimeToolBatchOutcome = {
  results: readonly PiRuntimeToolResult[];
  suspended?: boolean;
  waitingUser?: boolean;
  suspendedRun?: boolean;
  /** Deterministic owner progress digest; a change breaks LoopGuard cycles. */
  progress?: string;
  pending?: readonly string[];
  /** Call ids whose effect could not be verified; the turn halts as state_unknown. */
  unknown?: readonly string[];
};
export type PiRuntimeExecuteTools = (
  batch: PiRuntimeExecuteToolsInput,
) => Promise<PiRuntimeToolBatchOutcome>;

export type PiRuntimeExecuteToolsInput = PiRuntimeToolBatch & {
  /**
   * Reconcile this batch's reserved LoopGuard attempts to the number of calls
   * the owner will actually dispatch. Call it after the owner's whole-batch
   * preflight and before the first effect; it is cumulative, downward-only and
   * bounded by the reserved batch size. Omitting it keeps the conservative
   * whole-batch reservation.
   */
  reserveAttempts?: (attempts: number) => Promise<void>;
};

/**
 * "gateway" hands tool-attempt accounting to the owner. The runtime does not
 * charge the batch up front; the owner charges the count it really dispatches
 * through reserveAttempts after its whole-batch preflight and before its first
 * effect. A charge beyond the run budget throws PiRuntimeToolAttemptLimitError
 * and nothing is dispatched.
 */
export type PiRuntimeToolAttemptAccounting = "gateway";

/** Raised by reserveAttempts when a mediated charge would exceed the budget. */
export class PiRuntimeToolAttemptLimitError extends Error {
  readonly code = "agent_loop_limit_exceeded";

  constructor() {
    super("agent_loop_limit_exceeded");
    this.name = "PiRuntimeToolAttemptLimitError";
  }
}

export type PiRuntimeToolBlockDecision = { block: true; reason?: string };
export type PiRuntimeBeforeToolCall = (input: {
  turnId: string;
  assistantText: string;
  callId: string;
  name: string;
  arguments: unknown;
  signal: AbortSignal;
}) =>
  | Promise<PiRuntimeToolBlockDecision | void>
  | PiRuntimeToolBlockDecision
  | void;

export type PiRuntimeInvocationInput = {
  turnId: string;
  invocationId: string;
  invocationIndex: number;
  messages: readonly PiRuntimeMessage[];
  signal: AbortSignal;
};
export type PiRuntimeInvocationPlan = {
  systemPrompt?: string;
  messages?: readonly PiRuntimeMessage[];
  tools?: readonly PiRuntimeTool[];
};
export type PiRuntimePrepareInvocation = (
  input: PiRuntimeInvocationInput,
) => Promise<PiRuntimeInvocationPlan | void> | PiRuntimeInvocationPlan | void;

export type PiRuntimeProviderRequest = {
  sessionId: string;
  turnId: string;
  invocationId: string;
  model: Model<string>;
  context: TranscriptContext;
  signal: AbortSignal;
};
/**
 * Conservative evidence that a reported usage is a real measurement. The SDK
 * cannot tell a genuinely all-zero invocation from an absent one, so a source
 * that cannot prove otherwise leaves the invocation explicitly unknown.
 */
export type PiRuntimeUsageEvidence = (usage: Usage) => boolean;
export type PiRuntimeProviderSource = {
  (
    request: PiRuntimeProviderRequest,
  ): AssistantMessageEventStream | Promise<AssistantMessageEventStream>;
  /**
   * Optional: a source that can distinguish a measured usage from a missing one
   * supplies it here. Absent means the Runtime cannot tell, and the cost of
   * every invocation stays unknown rather than being presented as free.
   */
  usageKnown?: PiRuntimeUsageEvidence;
};

export type PiTurnFailureCode =
  | "model_failed"
  | "runtime_failed"
  | "preparation_failed"
  | "agent_loop_limit_exceeded"
  | PiModelFailureCode;

export type PiTurnResult =
  | { status: "completed"; text: string }
  | { status: "waiting_permission" }
  | { status: "waiting_user" }
  | { status: "suspended" }
  | { status: "state_unknown" }
  | {
      status: "failed";
      failure: { code: PiTurnFailureCode; message: string; failureId?: string };
    }
  | { status: "canceled" };

export type PiRuntimeEvent = {
  sessionId: string;
  turnId: string;
  sequence: number;
} & (
  | {
      kind: "invocation_started";
      invocationId: string;
      invocationIndex: number;
    }
  | { kind: "text_delta"; invocationId: string; text: string }
  | { kind: "thinking_delta"; invocationId: string; text: string }
  | {
      kind: "assistant_message";
      invocationId: string;
      text: string;
      thinking: string;
      toolCalls: readonly PiRuntimeToolCall[];
      usage: PiRuntimeUsage;
      stopReason: PiRuntimeStopReason;
    }
  | {
      kind: "tool_result";
      callId: string;
      name: string;
      text: string;
      isError: boolean;
    }
  | {
      kind: "invocation_terminal";
      invocationId: string;
      stopReason: PiRuntimeStopReason;
      usage?: PiRuntimeUsage;
    }
  | { kind: "terminal"; result: PiTurnResult }
);

type PiRuntimeEventPayload =
  | {
      kind: "invocation_started";
      invocationId: string;
      invocationIndex: number;
    }
  | { kind: "text_delta"; invocationId: string; text: string }
  | { kind: "thinking_delta"; invocationId: string; text: string }
  | {
      kind: "assistant_message";
      invocationId: string;
      text: string;
      thinking: string;
      toolCalls: readonly PiRuntimeToolCall[];
      usage: PiRuntimeUsage;
      stopReason: PiRuntimeStopReason;
    }
  | {
      kind: "tool_result";
      callId: string;
      name: string;
      text: string;
      isError: boolean;
    }
  | {
      kind: "invocation_terminal";
      invocationId: string;
      stopReason: PiRuntimeStopReason;
      usage?: PiRuntimeUsage;
    }
  | { kind: "terminal"; result: PiTurnResult };

export type PiRuntimeTextTurnInput = {
  turnId: string;
  prompt: string;
  systemPrompt?: string;
};

export type PiRuntimeTurnInput = {
  turnId: string;
  messages: readonly PiRuntimeMessage[];
  systemPrompt?: string;
  tools?: readonly PiRuntimeTool[];
  prepareInvocation?: PiRuntimePrepareInvocation;
  beforeToolCall?: PiRuntimeBeforeToolCall;
  executeTools?: PiRuntimeExecuteTools;
  loopGuard?: PiRuntimeLoopGuardInput;
  /** Defaults to the eager whole-batch charge; "gateway" defers to the owner. */
  toolAttemptAccounting?: PiRuntimeToolAttemptAccounting;
  onEvent?: (event: PiRuntimeEvent) => Promise<void> | void;
  /** Actual provider completion; late evidence is separate from UI events. */
  onInvocationSettled?: (fact: {
    turnId: string;
    invocationId: string;
  }) => Promise<void> | void;
};

export type PiRuntimeTurn = {
  events: AsyncIterable<PiRuntimeEvent>;
  result: Promise<PiTurnResult>;
  /** Physical Agent completion; logical cancellation does not settle this. */
  settled: Promise<void | "unknown">;
  abort(): void;
  /** Owner-directed interrupt: settle as suspended so the same run can continue. */
  suspend(): void;
};

export interface PiRuntimeSession {
  runTurn(input: PiRuntimeTextTurnInput): PiRuntimeTurn;
  runTurn(input: PiRuntimeTurnInput): PiRuntimeTurn;
  dispose(): void;
}

export type PiRuntimeSessionOptions =
  | {
      sessionId: string;
      modelStream: PiRuntimeModelSource;
      audit?: PiRuntimeAuditContext;
    }
  | {
      sessionId: string;
      model: Model<string>;
      source: PiRuntimeProviderSource;
      audit?: PiRuntimeAuditContext;
      /**
       * The declared price frozen for this selection, or `null` when the
       * selection declares no applicable public API price. The SDK model's
       * cost block is a type artifact and is never used here: absent pricing
       * keeps every estimate unknown and is never read as a zero price.
       */
      pricing?: PiModelCost | null;
      usageKnown?: (message: AssistantMessage) => boolean;
      /** Deterministic timeout seam; production uses the fixed lifecycle limits. */
      providerTimeouts?: { inactivityMs: number; hardMs: number };
    };

export type PiRuntimeScriptedTurn = {
  text?: string;
  thinking?: string;
  toolCalls?: readonly PiRuntimeToolCall[];
  /** Token facts the provider really reported for this step. */
  usage?: Usage;
};

const EMPTY_USAGE: Usage = {
  input: 0,
  output: 0,
  cacheRead: 0,
  cacheWrite: 0,
  totalTokens: 0,
  cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
};

const DEFAULT_TEXT_MODEL: Model<string> = {
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

function assistantMessage(
  model: Model<string>,
  content: AssistantMessage["content"],
  stopReason: AssistantMessage["stopReason"],
  errorMessage?: string,
  usage: Usage = EMPTY_USAGE,
): AssistantMessage {
  return {
    role: "assistant",
    content,
    api: model.api,
    provider: model.provider,
    model: model.id,
    usage,
    stopReason,
    ...(errorMessage ? { errorMessage } : {}),
    timestamp: Date.now(),
  };
}

function failureStream(
  model: Model<string>,
  code: string,
  aborted = false,
): AssistantMessageEventStream {
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

/**
 * One place where an invocation's usage becomes a project fact. A turn that
 * ran on the text-delta seam never received token facts, so its usage stays
 * explicitly unknown rather than reading as a free invocation.
 */
function normalizeUsage(
  usage: Usage,
  basis: { pricing?: PiModelCost | null; usageKnown: boolean },
): PiRuntimeUsage {
  const cost = estimatePiInvocationCost({
    tokens: {
      input: usage.input,
      output: usage.output,
      cacheRead: usage.cacheRead,
      cacheWrite: usage.cacheWrite,
      ...(usage.cacheWrite1h !== undefined
        ? { cacheWrite1h: usage.cacheWrite1h }
        : {}),
      totalTokens: usage.totalTokens,
    },
    pricing: readPiFrozenPricing(basis.pricing),
    usageKnown: basis.usageKnown,
  });
  return {
    input: usage.input,
    output: usage.output,
    cacheRead: usage.cacheRead,
    cacheWrite: usage.cacheWrite,
    ...(usage.cacheWrite1h !== undefined
      ? { cacheWrite1h: usage.cacheWrite1h }
      : {}),
    totalTokens: usage.totalTokens,
    costEstimate: cost.estimate,
    costState: cost.state,
    usageKnown: basis.usageKnown,
    cost: {
      input: usage.cost.input,
      output: usage.cost.output,
      cacheRead: usage.cost.cacheRead,
      cacheWrite: usage.cost.cacheWrite,
      total: usage.cost.total,
    },
  };
}

export function unknownPiRuntimeUsage(): PiRuntimeUsage {
  return normalizeUsage(EMPTY_USAGE, { usageKnown: false });
}

function resourceText(resource: PiRuntimeResource): string {
  return resource.displayName
    ? resource.displayName + " (" + resource.ref + ")"
    : resource.ref;
}

function argumentsRecord(value: JsonValue): Record<string, JsonValue> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value
    : {};
}

function toNativeUserContent(
  message: Extract<PiRuntimeMessage, { role: "user" }>,
): TextContent[] | string {
  const parts: TextContent[] = [];
  if (message.text) parts.push({ type: "text", text: message.text });
  for (const resource of message.resources ?? [])
    parts.push({ type: "text", text: resourceText(resource) });
  if (parts.length === 1 && parts[0].text === message.text) return message.text;
  return parts.length ? parts : "";
}

function toNativeMessage(
  message: PiRuntimeMessage,
  model: Model<string>,
): Message {
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
  const content: AssistantMessage["content"] = [];
  if (message.thinking)
    content.push({ type: "thinking", thinking: message.thinking });
  if (message.text) content.push({ type: "text", text: message.text });
  for (const call of message.toolCalls ?? [])
    content.push({
      type: "toolCall",
      id: call.callId,
      name: call.name,
      arguments: argumentsRecord(call.arguments),
    });
  return assistantMessage(
    model,
    content,
    message.toolCalls?.length ? "toolUse" : "stop",
  );
}

function projectNativeMessage(
  message: AgentMessage,
): PiRuntimeMessage | undefined {
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
  if (message.role !== "assistant") return undefined;
  const toolCalls: PiRuntimeToolCall[] = [];
  for (const block of message.content) {
    if (block.type !== "toolCall") continue;
    toolCalls.push({
      callId: block.id,
      name: block.name,
      arguments: (block.arguments ?? {}) as JsonValue,
    });
  }
  return {
    role: "assistant",
    text: contentText(message.content),
    ...(toolCalls.length ? { toolCalls } : {}),
  };
}

function thinkingText(content: AssistantMessage["content"]): string {
  return content
    .filter((block) => block.type === "thinking")
    .map((block) => block.thinking)
    .join("");
}

function toolCallsOf(
  content: AssistantMessage["content"],
): PiRuntimeToolCall[] {
  const calls: PiRuntimeToolCall[] = [];
  for (const block of content) {
    if (block.type !== "toolCall") continue;
    calls.push({
      callId: block.id,
      name: block.name,
      arguments: (block.arguments ?? {}) as JsonValue,
    });
  }
  return calls;
}

function nativeToolDefinition(
  tool: PiRuntimeTool,
  execute: AgentTool["execute"],
): AgentTool {
  return {
    name: tool.name,
    description: tool.description,
    label: tool.name,
    parameters: tool.schema as unknown as Tool["parameters"],
    ...(tool.prepareArguments
      ? {
          prepareArguments:
            tool.prepareArguments as unknown as AgentTool["prepareArguments"],
        }
      : {}),
    execute,
  };
}

function projectContextInput(
  context: TranscriptContext,
  signal: AbortSignal,
): PiRuntimeModelInput {
  const messages: PiRuntimeModelInput["messages"][number][] = [];
  for (const message of context.messages) {
    if (message.role === "user" || message.role === "assistant")
      messages.push({ role: message.role, text: contentText(message.content) });
  }
  return {
    systemPrompt: getCurrentSystemPrompt(context.messages),
    messages,
    signal,
  };
}

function streamFrom(modelStream: PiRuntimeModelSource): StreamFn {
  return (model, context, options) => {
    const stream = createAssistantMessageEventStream();
    const signal = options?.signal;
    if (!signal) {
      stream.push({
        type: "error",
        reason: "error",
        error: assistantMessage(
          model,
          [],
          "error",
          "runtime_signal_unavailable",
        ),
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
        for await (const delta of modelStream(
          projectContextInput(context, signal),
        )) {
          if (signal.aborted) break;
          text += delta;
          stream.push({
            type: "text_delta",
            contentIndex: 0,
            delta,
            partial: assistantMessage(
              model,
              [{ type: "text", text }],
              "pending",
            ),
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
      } catch (error) {
        stream.push({
          type: "error",
          reason: "error",
          error: assistantMessage(
            model,
            [],
            "error",
            error instanceof PiModelStreamFailure ? error.code : "model_failed",
          ),
        });
      }
    })();
    return stream;
  };
}

function invocationIndex(invocationId: string): number {
  const value = Number(invocationId.slice(invocationId.lastIndexOf(":") + 1));
  return Number.isFinite(value) && value >= 0 ? value : 0;
}

/**
 * Deterministic structured source for tests: each invocation consumes one
 * scripted step by index, emitting text/thinking deltas and/or tool calls.
 */
export function createPiTextProviderSource(options: {
  steps: readonly PiRuntimeScriptedTurn[];
  model?: Model<string>;
}): { model: Model<string>; source: PiRuntimeProviderSource } {
  const model = options.model ?? DEFAULT_TEXT_MODEL;
  // A scripted step that declares a usage is the evidence for it. A step that
  // declares none leaves the invocation unknown rather than reporting a free
  // zero it never measured.
  let measured: Usage | undefined;
  const source: PiRuntimeProviderSource = ({ invocationId: id }) => {
    const index = invocationIndex(id);
    const step =
      options.steps[Math.min(index, Math.max(options.steps.length - 1, 0))] ??
      {};
    const content: AssistantMessage["content"] = [];
    if (step.thinking)
      content.push({ type: "thinking", thinking: step.thinking });
    if (step.text) content.push({ type: "text", text: step.text });
    for (const call of step.toolCalls ?? [])
      content.push({
        type: "toolCall",
        id: call.callId,
        name: call.name,
        arguments: argumentsRecord(call.arguments),
      });
    const toolUse = (step.toolCalls?.length ?? 0) > 0;
    const stopReason = toolUse ? ("toolUse" as const) : ("stop" as const);
    const stream = createAssistantMessageEventStream();
    measured = step.usage;
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
      message: assistantMessage(
        model,
        content,
        stopReason,
        undefined,
        measured,
      ),
    });
    return stream;
  };
  source.usageKnown = (usage) => !!measured && usage === measured;
  return { model, source };
}

export type PiRuntimeLoopGuardLimits = {
  invocations: number;
  toolAttempts: number;
};

/** Whole-run bounds used when no trusted owner limits are supplied. */
export const PI_RUNTIME_LOOP_GUARD_LIMITS: PiRuntimeLoopGuardLimits = {
  invocations: 20,
  toolAttempts: 100,
};

/** Cycle detection scans repeated tool cycles of length one through this bound. */
export const PI_RUNTIME_LOOP_GUARD_MAX_CYCLE_LENGTH = 5;
/** A deterministic cycle stops the run once it repeats this many times. */
export const PI_RUNTIME_LOOP_GUARD_CYCLE_REPEATS = 5;

/**
 * Durable whole-run LoopGuard counters. The owner passes the same state object
 * back on continuation so invocation and tool-attempt budgets survive waits,
 * sessions and restarts.
 */
export type PiRuntimeLoopGuardState = {
  invocations: number;
  toolAttempts: number;
  cycles: string[];
};

export type PiRuntimeLoopGuardInput = {
  state: PiRuntimeLoopGuardState;
  /** Trusted owner ceiling; a Workflow request can only lower it. */
  trustedLimits?: Partial<PiRuntimeLoopGuardLimits>;
  /** Workflow-requested limits; values above the trusted ceiling are ignored. */
  requestedLimits?: Partial<PiRuntimeLoopGuardLimits>;
  /** Commits the counters before the next dispatch; durability is the owner's. */
  persist?: (state: PiRuntimeLoopGuardState) => Promise<void> | void;
};

export type PiRuntimeLoopGuard = {
  readonly state: PiRuntimeLoopGuardState;
  readonly limits: PiRuntimeLoopGuardLimits;
  /** The whole-run invocation allowance is already spent. */
  isInvocationBlocked(): boolean;
  /** A deterministic tool cycle has already repeated to the stop bound. */
  isCycleBlocked(): boolean;
  /** The whole next tool batch fits inside the remaining attempt budget. */
  allowsToolBatch(attempts: number): boolean;
  commitInvocation(): Promise<void>;
  /** Commits dispatched tool-attempt counters before the batch runs. */
  commitToolAttempts(attempts: number): Promise<void>;
  /** Records the executed batch fingerprint that feeds cycle detection. */
  recordToolBatch(batch: PiRuntimeLoopGuardBatch): Promise<void>;
};

/**
 * Executed tool batch facts that form one deterministic fingerprint. The
 * fingerprint carries tool names, normalized arguments, per-call result
 * category and the owner's progress digest, so a genuine change of result or
 * progress breaks a cycle instead of being counted as a repeat.
 */
export type PiRuntimeLoopGuardBatch = {
  calls: readonly PiRuntimeToolCall[];
  results: readonly PiRuntimeToolResult[];
  /** Deterministic owner progress/goal digest; a change breaks cycle repeats. */
  progress?: string;
};

function resolveLoopGuardLimit(
  fallback: number,
  trusted: number | undefined,
  requested: number | undefined,
): number {
  const value = Math.min(
    trusted ?? fallback,
    requested ?? Number.POSITIVE_INFINITY,
  );
  return Number.isFinite(value) ? Math.max(0, Math.floor(value)) : fallback;
}

/**
 * Determines whether the recent tool batch signatures already contain a
 * deterministic cycle of length one through five repeated five times. Only the
 * runtime's own recorded batch facts feed the check; streamed text never does.
 */
function repeatedToolCycle(cycles: readonly string[]): boolean {
  const repeats = PI_RUNTIME_LOOP_GUARD_CYCLE_REPEATS;
  for (
    let length = 1;
    length <= PI_RUNTIME_LOOP_GUARD_MAX_CYCLE_LENGTH;
    length++
  ) {
    const span = length * repeats;
    if (cycles.length < span) continue;
    const start = cycles.length - span;
    let repeated = true;
    for (let offset = 0; offset < span; offset++) {
      if (cycles[start + offset] !== cycles[start + (offset % length)]) {
        repeated = false;
        break;
      }
    }
    if (repeated) return true;
  }
  return false;
}

function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== "object")
    return JSON.stringify(value) ?? "null";
  if (Array.isArray(value))
    return "[" + value.map((item) => canonicalJson(item)).join(",") + "]";
  const record = value as Record<string, unknown>;
  return (
    "{" +
    Object.keys(record)
      .sort()
      .map((key) => JSON.stringify(key) + ":" + canonicalJson(record[key]))
      .join(",") +
    "}"
  );
}

/** Deterministic result category of one settled tool call. */
function toolResultCategory(result: PiRuntimeToolResult | undefined): string {
  if (!result) return "withheld";
  const certainty = result.effectCertainty ?? "not_applicable";
  return (result.isError ? "error" : "ok") + ":" + certainty;
}

/** Deterministic identity of one executed tool batch. */
function toolBatchFingerprint(batch: PiRuntimeLoopGuardBatch): string {
  if (!batch.calls.length) return "";
  const byCall = new Map(
    batch.results.map((result) => [result.callId, result]),
  );
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
export function createPiRuntimeLoopGuard(
  input?: PiRuntimeLoopGuardInput,
): PiRuntimeLoopGuard {
  const state: PiRuntimeLoopGuardState = input?.state ?? {
    invocations: 0,
    toolAttempts: 0,
    cycles: [],
  };
  if (!Array.isArray(state.cycles)) state.cycles = [];
  const limits: PiRuntimeLoopGuardLimits = {
    invocations: resolveLoopGuardLimit(
      PI_RUNTIME_LOOP_GUARD_LIMITS.invocations,
      input?.trustedLimits?.invocations,
      input?.requestedLimits?.invocations,
    ),
    toolAttempts: resolveLoopGuardLimit(
      PI_RUNTIME_LOOP_GUARD_LIMITS.toolAttempts,
      input?.trustedLimits?.toolAttempts,
      input?.requestedLimits?.toolAttempts,
    ),
  };
  const commit = async () => {
    if (input?.persist) await input.persist(state);
  };
  return {
    state,
    limits,
    isInvocationBlocked: () => state.invocations >= limits.invocations,
    isCycleBlocked: () => repeatedToolCycle(state.cycles),
    allowsToolBatch: (attempts) =>
      state.toolAttempts + attempts <= limits.toolAttempts,
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
        const ceiling =
          PI_RUNTIME_LOOP_GUARD_MAX_CYCLE_LENGTH *
          PI_RUNTIME_LOOP_GUARD_CYCLE_REPEATS;
        if (state.cycles.length > ceiling)
          state.cycles.splice(0, state.cycles.length - ceiling);
      }
      await commit();
    },
  };
}

export class PiRuntime {
  openSession(options: PiRuntimeSessionOptions): PiRuntimeSession {
    const { sessionId } = options;
    if (!sessionId.trim()) throw new Error("session_id_required");
    const audit = options.audit;
    // The context is only the owner identity this session already holds, so
    // there is no callback to forward and no audit schema here: the audit
    // module owns admission and storage. `record` is synchronous and
    // non-throwing, so recording never adds latency to a turn; where a
    // canonical owner callback is involved, the record happens after that
    // callback is awaited, never instead of it.
    const auditRecord = (
      fact: Omit<PiRuntimeAuditFact, "owner" | "root" | "workspaceDir">,
    ) => {
      if (!audit) return;
      recordPiRuntimeAudit({ ...fact, ...audit });
    };
    const textStream =
      "modelStream" in options ? options.modelStream : undefined;
    const model = "source" in options ? options.model : DEFAULT_TEXT_MODEL;
    const source = "source" in options ? options.source : undefined;
    // Usage is only "known" when the source can prove it measured one. The
    // legacy text-delta seam reports none, and a source without evidence cannot
    // tell an absent usage from an all-zero one, so both stay unknown.
    const usageBasis = {
      pricing: "pricing" in options ? (options.pricing ?? null) : null,
      usageKnown: (message: AssistantMessage) =>
        ("usageKnown" in options && options.usageKnown
          ? options.usageKnown(message)
          : source?.usageKnown
            ? source.usageKnown(message.usage)
            : !!source && hasPiReportedUsage(message.usage)) === true,
    };
    const agentSource: PiRuntimeProviderSource | undefined = source
      ? source
      : textStream
        ? (request) =>
            streamFrom(textStream)(request.model, request.context, {
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
    let activeAbort: (() => void) | null = null;

    const emitInto = async (
      events: EventStream<PiRuntimeEvent, PiTurnResult>,
      turnId: string,
      counter: { sequence: number },
      payload: PiRuntimeEventPayload,
      onEvent?: (event: PiRuntimeEvent) => Promise<void> | void,
    ) => {
      const event = {
        ...payload,
        sessionId,
        turnId,
        sequence: ++counter.sequence,
      } as PiRuntimeEvent;
      if (onEvent) await Promise.resolve(onEvent(event)).catch(() => undefined);
      events.push(event);
      return event;
    };

    const textTurn = (input: PiRuntimeTextTurnInput): PiRuntimeTurn => {
      if (disposed) throw new Error("session_disposed");
      if (active) throw new Error("owner_busy");
      if (!input.turnId.trim()) throw new Error("turn_id_required");
      if (!textStream) throw new Error("session_mode_invalid");
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
      agent.state.messages = normalizeContext({
        systemPrompt: input.systemPrompt ?? "",
        messages: agent.state.messages.filter(
          (message) => message.role !== "system",
        ) as Message[],
      }).messages;
      agent.state.tools = [];
      agent.streamFunction = streamFrom(textStream);
      agent.transformContext = undefined;
      agent.beforeToolCall = undefined;
      agent.prepareRequest = undefined;
      agent.finishTurn = undefined;
      const events = new EventStream<PiRuntimeEvent, PiTurnResult>(
        (event) => event.kind === "terminal",
        (event) =>
          event.kind === "terminal" ? event.result : { status: "canceled" },
      );
      const counter = { sequence: 0 };
      const invocationId = input.turnId + ":invocation:0";
      let terminal = false;
      let text = "";
      let nativeFailure = false;
      let nativeFailureCode: PiTurnFailureCode = "model_failed";
      const emit = (payload: PiRuntimeEventPayload) =>
        emitInto(events, input.turnId, counter, payload);
      const finish = async (result: PiTurnResult) => {
        if (terminal) return;
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
        if (terminal) return;
        if (
          event.type === "message_update" &&
          event.assistantMessageEvent.type === "text_delta"
        ) {
          const delta = event.assistantMessageEvent.delta;
          text += delta;
          await emit({ kind: "text_delta", invocationId, text: delta });
        } else if (
          event.type === "message_end" &&
          event.message.role === "assistant"
        ) {
          nativeFailure = event.message.stopReason === "error";
          if (
            nativeFailure &&
            event.message.errorMessage &&
            KNOWN_FAILURE_CODES.has(event.message.errorMessage)
          )
            nativeFailureCode = event.message.errorMessage as PiTurnFailureCode;
        }
      });
      const abort = () => {
        if (terminal) return;
        finish({ status: "canceled" });
        agent.abort();
      };
      const suspend = () => {
        if (terminal) return;
        finish({ status: "suspended" });
        agent.abort();
      };
      activeAbort = abort;
      const settle = (result: PiTurnResult) => {
        unsubscribe();
        active = false;
        activeAbort = null;
        finish(result);
      };
      const settled = agent.prompt(input.prompt).then(
        () =>
          settle(
            nativeFailure
              ? {
                  status: "failed",
                  failure: {
                    code: nativeFailureCode,
                    message: "Model execution failed",
                  },
                }
              : { status: "completed", text },
          ),
        () =>
          settle({
            status: "failed",
            failure: {
              code: "runtime_failed",
              message: "Runtime execution failed",
            },
          }),
      );
      return { events, result: events.result(), settled, abort, suspend };
    };

    const agentTurn = (input: PiRuntimeTurnInput): PiRuntimeTurn => {
      if (disposed) throw new Error("session_disposed");
      if (active) throw new Error("owner_busy");
      if (!input.turnId.trim()) throw new Error("turn_id_required");
      if (!agentSource) throw new Error("session_mode_invalid");
      active = true;
      auditRecord({
        operation: "turn.started",
        origin: "runtime",
        correlation: { sessionId, turnId: input.turnId },
      });
      const events = new EventStream<PiRuntimeEvent, PiTurnResult>(
        (event) => event.kind === "terminal",
        (event) =>
          event.kind === "terminal" ? event.result : { status: "canceled" },
      );
      const counter = { sequence: 0 };
      let terminal = false;
      let nativeFailure = false;
      let nativeFailureCode: PiTurnFailureCode = "model_failed";
      let prepareFailed = false;
      const loopGuard = createPiRuntimeLoopGuard(input.loopGuard);
      let invocationCount = 0;
      let invocationId = "";
      let finalText = "";
      let batchAssistant: AssistantMessage | undefined;
      let batchCalls: PiRuntimeToolCall[] = [];
      let batchResults = new Map<string, PiRuntimeToolResult>();
      let batchPromise: Promise<void> | undefined;
      let batchSuspended = false;
      let batchWaitingUser = false;
      let batchSuspendedRun = false;
      let batchUnknown = false;
      let batchLimitExceeded = false;
      let batchText = "";
      let suppressed = new Set<string>();
      let invocationStarted = false;
      let invocationSettled = false;
      let invocationSuppressed = false;
      let invocationIndexValue = 0;
      let suppressing = false;
      let suspending = false;
      let guardBlocked = false;
      let failure: PiTurnFailureCode | undefined;
      const physicalProviders: Promise<void | "unknown">[] = [];
      const emit = (payload: PiRuntimeEventPayload) =>
        emitInto(events, input.turnId, counter, payload, input.onEvent);
      const finish = async (result: PiTurnResult) => {
        if (terminal) return;
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
      const beginBatch = (assistant: AssistantMessage) => {
        if (batchAssistant === assistant) return;
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
      const ensureBatch = (signal: AbortSignal) =>
        (batchPromise ??= (async () => {
          const calls = batchCalls.slice();
          const mediated = input.toolAttemptAccounting === "gateway";
          if (!mediated) {
            if (!loopGuard.allowsToolBatch(calls.length)) {
              batchLimitExceeded = true;
              failure = "agent_loop_limit_exceeded";
              for (const call of calls) suppressed.add(call.callId);
              return;
            }
            try {
              await loopGuard.commitToolAttempts(calls.length);
            } catch {
              failure = "runtime_failed";
              for (const call of calls) suppressed.add(call.callId);
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
          const reserveAttempts = async (attempts: number) => {
            reservationReported = true;
            const target = Math.min(
              Math.max(0, Math.floor(Number(attempts) || 0)),
              calls.length,
            );
            const delta = target - reservedAttempts;
            if (!delta) return;
            if (delta > 0 && !loopGuard.allowsToolBatch(delta)) {
              throw new PiRuntimeToolAttemptLimitError();
            }
            await loopGuard.commitToolAttempts(delta);
            reservedAttempts = target;
          };
          let outcome: PiRuntimeToolBatchOutcome;
          try {
            outcome = await input.executeTools!({
              turnId: input.turnId,
              assistantText: batchText,
              calls,
              signal,
              reserveAttempts,
            });
          } catch (error) {
            if (error instanceof PiRuntimeToolAttemptLimitError) {
              batchLimitExceeded = true;
              failure = "agent_loop_limit_exceeded";
              for (const call of calls) suppressed.add(call.callId);
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
            for (const call of calls) suppressed.add(call.callId);
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
          } catch {
            failure = "runtime_failed";
          }
          const outstanding =
            (outcome.pending?.length ?? 0) > 0 ||
            calls.some((call) => !batchResults.has(call.callId));
          batchWaitingUser = outcome.waitingUser === true;
          batchSuspendedRun = outcome.suspendedRun === true;
          batchSuspended =
            (outcome.suspended === true || outstanding) &&
            !batchWaitingUser &&
            !batchSuspendedRun;
          batchUnknown =
            (outcome.unknown?.length ?? 0) > 0 ||
            outcome.results.some(
              (result) => result.effectCertainty === "unknown",
            );
        })());
      const toolExecute =
        (tool: PiRuntimeTool): AgentTool["execute"] =>
        async (callId, params, signal) => {
          const name = tool.name;
          const abortSignal = signal ?? agent.signal!;
          if (!input.executeTools) {
            const outcome = await tool.execute({
              callId,
              name,
              arguments: params,
              signal: abortSignal,
            });
            return {
              content: outcome.text
                ? [{ type: "text" as const, text: outcome.text }]
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
              ? [{ type: "text" as const, text: result.text }]
              : [],
            details: {},
            isError: result.isError,
          };
        };
      agent.state.model = model;
      agent.state.tools = (input.tools ?? []).map((tool) =>
        nativeToolDefinition(tool, toolExecute(tool)),
      );
      agent.state.messages = normalizeContext({
        systemPrompt: input.systemPrompt ?? "",
        messages: input.messages.length
          ? input.messages.map((message) => toNativeMessage(message, model))
          : [{ role: "user", content: "", timestamp: Date.now() }],
        tools: agent.state.tools,
      }).messages;
      agent.prepareRequest = async ({ context }, signal) => {
        const index = invocationCount++;
        invocationId = input.turnId + ":invocation:" + index;
        invocationIndexValue = index;
        invocationStarted = false;
        invocationSettled = false;
        invocationSuppressed = false;
        prepareFailed = false;
        guardBlocked = false;
        if (suppressing || suspending) return;
        if (loopGuard.isInvocationBlocked() || loopGuard.isCycleBlocked()) {
          guardBlocked = true;
          failure = "agent_loop_limit_exceeded";
          invocationSuppressed = true;
          return;
        }
        if (!input.prepareInvocation) return;
        try {
          const plan = await input.prepareInvocation({
            turnId: input.turnId,
            invocationId,
            invocationIndex: index,
            messages: context.messages
              .map(projectNativeMessage)
              .filter((message): message is PiRuntimeMessage => !!message),
            signal: signal ?? agent.signal!,
          });
          if (!plan) return;
          const tools = plan.tools
            ? plan.tools.map((tool) =>
                nativeToolDefinition(tool, toolExecute(tool)),
              )
            : context.tools;
          // SDK system/tool deltas are transient. Each prepared request owns a
          // fresh declaration set while canonical user/assistant/tool history stays intact.
          return {
            context: {
              messages: normalizeContext({
                systemPrompt:
                  plan.systemPrompt ?? getCurrentSystemPrompt(context.messages),
                messages: plan.messages
                  ? plan.messages.map((message) =>
                      toNativeMessage(message, model),
                    )
                  : (context.messages.filter(
                      (message) => message.role !== "system",
                    ) as Message[]),
                tools,
              }).messages,
              tools,
            },
          };
        } catch (error) {
          prepareFailed = true;
          invocationSuppressed = true;
          failure = "preparation_failed";
        }
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
        try {
          await loopGuard.commitInvocation();
        } catch {
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
          const abortStream = () =>
            forwarded.push({
              type: "error",
              reason: "aborted",
              error: assistantMessage(streamModel, [], "aborted"),
            });
          signal.addEventListener("abort", abortStream, { once: true });
          const limits =
            "providerTimeouts" in options
              ? options.providerTimeouts
              : undefined;
          let inactiveTimer: ReturnType<typeof setTimeout> | undefined;
          const expire = () => {
            if (terminal) return;
            failure = "provider_timeout";
            suppressing = true;
            forwarded.push({
              type: "error",
              reason: "error",
              error: assistantMessage(
                streamModel,
                [],
                "error",
                "provider_timeout",
              ),
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
            inactiveTimer = setTimeout(
              expire,
              limits?.inactivityMs ?? PI_PROVIDER_INACTIVITY_MS,
            );
          };
          activity();
          const hardTimer = setTimeout(
            expire,
            limits?.hardMs ?? PI_PROVIDER_HARD_LIMIT_MS,
          );
          const physical = (async () => {
            const physicalInvocationId = invocationId;
            try {
              const provider = await agentSource!({
                sessionId,
                turnId: input.turnId,
                invocationId,
                model: streamModel,
                context,
                signal,
              });
              for await (const event of provider) {
                if (terminal || signal.aborted) continue;
                activity();
                forwarded.push(event);
              }
            } catch (error) {
              if (!terminal)
                forwarded.push({
                  type: "error",
                  reason: "error",
                  error: assistantMessage(
                    streamModel,
                    [],
                    "error",
                    error instanceof PiModelStreamFailure
                      ? error.code
                      : "model_failed",
                  ),
                });
            } finally {
              signal.removeEventListener("abort", abortStream);
              clearTimeout(inactiveTimer);
              clearTimeout(hardTimer);
              // The provider actually finished, which is the physical fact
              // this hook reports. Gating on `terminal` skipped exactly the
              // abort and suspend paths where a caller most needs to know the
              // child is gone, and let a turn invent physical settlement from
              // its own logical result instead.
              if (input.onInvocationSettled)
                await Promise.resolve(
                  input.onInvocationSettled({
                    turnId: input.turnId,
                    invocationId: physicalInvocationId,
                  }),
                );
            }
          })();
          physicalProviders.push(physical.catch(() => "unknown" as const));
          return forwarded;
        } catch (error) {
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
            signal: agent.signal!,
          });
          if (decision?.block) return { block: true, reason: decision.reason };
        }
        batchCalls.push({
          callId: call.id,
          name: call.name,
          arguments: context.args as JsonValue,
        });
        return undefined;
      };
      agent.finishTurn = () =>
        suppressing ||
        suspending ||
        guardBlocked ||
        batchSuspended ||
        batchUnknown ||
        batchWaitingUser ||
        batchSuspendedRun ||
        batchLimitExceeded
          ? { action: "end" }
          : undefined;
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
        } else if (
          event.type === "message_end" &&
          event.message.role === "assistant"
        ) {
          if (invocationSuppressed) return;
          const message = event.message;
          nativeFailure = message.stopReason === "error";
          if (
            nativeFailure &&
            message.errorMessage &&
            KNOWN_FAILURE_CODES.has(message.errorMessage)
          )
            nativeFailureCode = message.errorMessage as PiTurnFailureCode;
          if (nativeFailure) failure = nativeFailureCode;
          const text = contentText(message.content);
          if (text) finalText = text;
          const usage = normalizeUsage(message.usage, {
            pricing: usageBasis.pricing,
            usageKnown: usageBasis.usageKnown(message),
          });
          if (
            message.stopReason !== "error" &&
            message.stopReason !== "aborted"
          )
            await emit({
              kind: "assistant_message",
              invocationId,
              text,
              thinking: thinkingText(message.content),
              toolCalls: toolCallsOf(message.content),
              usage,
              stopReason: message.stopReason as PiRuntimeStopReason,
            });
          if (invocationStarted && !invocationSettled) {
            invocationSettled = true;
            await emit({
              kind: "invocation_terminal",
              invocationId,
              stopReason: message.stopReason as PiRuntimeStopReason,
              ...(message.stopReason === "error" ||
              message.stopReason === "aborted"
                ? { usage }
                : {}),
            });
            auditRecord({
              operation: "model.invocation_terminal",
              origin: "provider",
              correlation: { sessionId, turnId: input.turnId, invocationId },
              attributes: { reason: message.stopReason },
            });
          }
        } else if (event.type === "tool_execution_end") {
          if (suppressed.has(event.toolCallId)) return;
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
        if (terminal || suppressing || suspending) return;
        suppressing = true;
        void finish({ status: "canceled" });
        agent.abort();
      };
      const suspend = () => {
        if (terminal || suppressing || suspending) return;
        suspending = true;
        void finish({ status: "suspended" });
        agent.abort();
      };
      activeAbort = abort;
      const settle = async (result: PiTurnResult) => {
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
            usage: normalizeUsage(EMPTY_USAGE, {
              pricing: usageBasis.pricing,
              usageKnown: false,
            }),
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
      const logicalAgentCompletion = agent.continue().then(
        () =>
          settle(
            suspending
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
                            : { status: "completed", text: finalText },
          ),
        () =>
          settle(
            suspending
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
                    },
          ),
      );
      const settled = logicalAgentCompletion.then(async () => {
        const outcomes = await Promise.all(physicalProviders);
        if (outcomes.includes("unknown")) return "unknown" as const;
        active = false;
        activeAbort = null;
      });
      return { events, result: events.result(), settled, abort, suspend };
    };

    return {
      runTurn(
        input: PiRuntimeTextTurnInput | PiRuntimeTurnInput,
      ): PiRuntimeTurn {
        return "prompt" in input ? textTurn(input) : agentTurn(input);
      },
      dispose() {
        if (disposed) return;
        disposed = true;
        activeAbort?.();
      },
    };
  }
}
