import type {
  AssistantMessage,
  AssistantMessageEventStream,
  JsonObject,
  Model,
  ThinkingLevel,
  TranscriptContext,
  Tool,
  Usage,
} from "@earendil-works/pi-ai";
import {
  createAssistantMessageEventStream,
  getCurrentTools,
  validateToolCall,
} from "@earendil-works/pi-ai";
import { streamSimple as streamOpenAIResponses } from "@earendil-works/pi-ai/api/openai-responses";
import type { ResponseFunctionWebSearch } from "openai/resources/responses/responses";
import type { PiProviderTerminal } from "./piRuntime";
import type { PiUsageMeasurement } from "../shared/piUsageContract";
import { PiModelStreamFailure } from "./piRuntime";

export const PI_CHATGPT_TOOL_NAMESPACE = "zotero_agents" as const;
const PI_CHATGPT_TOOL_NAMESPACE_DESCRIPTION =
  "Local Zotero Agents functions available for this request.";
const UNSUPPORTED_SIWC_FIELDS = new Set([
  "background",
  "conversation",
  "max_output_tokens",
  "max_tool_calls",
  "metadata",
  "moderation",
  "multi_agent",
  "prompt",
  "prompt_cache_retention",
  "safety_identifier",
  "temperature",
  "top_logprobs",
  "top_p",
  "truncation",
  "user",
]);

type PiChatGPTFunctionTool = Record<string, unknown> & {
  type: "function";
  name: string;
};

type PiChatGPTNamespaceTool = {
  type: "namespace";
  name: typeof PI_CHATGPT_TOOL_NAMESPACE;
  description: string;
  tools: PiChatGPTFunctionTool[];
};

export type PiChatGPTToolWireProjection = Readonly<{
  tools: readonly (PiChatGPTNamespaceTool | Readonly<{ type: "web_search" }>)[];
  gatewayNameByWireName: ReadonlyMap<string, string>;
  wireNameByGatewayName: ReadonlyMap<string, string>;
}>;

type PiChatGPTToolSet = {
  functions: PiChatGPTFunctionTool[];
  gatewayNameByWireName: Map<string, string>;
};

function projectChatGPTToolSet<T extends { name: string }>(
  tools: readonly T[],
): PiChatGPTToolSet {
  const gatewayNameByWireName = new Map<string, string>();
  const gatewayNames = new Set<string>();
  const functions = tools.map((tool, index) => {
    const gatewayName = tool.name;
    if (!gatewayName || gatewayNames.has(gatewayName))
      throw new PiModelStreamFailure("unsupported_model", "tools");
    gatewayNames.add(gatewayName);
    const available =
      /^[A-Za-z0-9_-]{1,64}$/.test(gatewayName) &&
      ![...gatewayNameByWireName.values()].includes(gatewayName);
    let wireName = available ? gatewayName : `zotero_tool_${index + 1}`;
    let suffix = 1;
    while (gatewayNameByWireName.has(wireName))
      wireName = `zotero_tool_${index + 1}_${suffix++}`;
    gatewayNameByWireName.set(wireName, gatewayName);
    return { ...tool, type: "function" as const, name: wireName };
  }) as unknown as PiChatGPTFunctionTool[];
  return { functions, gatewayNameByWireName };
}

/** Exact final-wire tool projection shared by request construction and C06 budgeting. */
export function projectPiChatGPTToolWire(
  tools: readonly { name: string }[],
  forceWebSearch = false,
  historicalFunctionNames: readonly string[] = [],
): PiChatGPTToolWireProjection {
  const activeNames = new Set(tools.map((tool) => tool.name));
  const historyOnlyNames = [...new Set(historicalFunctionNames)].filter(
    (name) => !activeNames.has(name),
  );
  const projected = projectChatGPTToolSet([
    ...tools,
    ...historyOnlyNames.map((name) => ({ name })),
  ]);
  const activeFunctions = projected.functions.slice(0, tools.length);
  const gatewayNameByWireName = new Map(
    [...projected.gatewayNameByWireName].filter(([, name]) =>
      activeNames.has(name),
    ),
  );
  const wireNameByGatewayName = new Map(
    [...projected.gatewayNameByWireName].map(([wireName, gatewayName]) => [
      gatewayName,
      wireName,
    ]),
  );
  return {
    tools: [
      ...(activeFunctions.length
        ? [
            {
              type: "namespace" as const,
              name: PI_CHATGPT_TOOL_NAMESPACE,
              description: PI_CHATGPT_TOOL_NAMESPACE_DESCRIPTION,
              tools: activeFunctions,
            },
          ]
        : []),
      ...(forceWebSearch ? [{ type: "web_search" as const }] : []),
    ],
    gatewayNameByWireName,
    wireNameByGatewayName,
  };
}

export type PiChatGPTCompletedResponse = {
  id?: string;
  output: readonly Record<string, unknown>[];
  usage?: PiUsageMeasurement;
};

export type PiChatGPTAttemptFailure = {
  terminal: PiProviderTerminal;
  usage: Usage;
  usageCompleteness: "complete" | "partial" | "unknown";
  usageMeasurement: PiUsageMeasurement;
};

export type PiChatGPTResponsesOptions = {
  apiKey: string;
  signal: AbortSignal;
  fetch: typeof fetch;
  reasoning?: ThinkingLevel;
  explicitOptions?: readonly string[];
  forceWebSearch?: boolean;
  onProviderStreamEvent?: (event: unknown) => void;
  onRetry?: (failure: PiChatGPTAttemptFailure) => Promise<boolean>;
  onTerminal?: (terminal: PiProviderTerminal) => void;
  onCompletedResponse?: (response: PiChatGPTCompletedResponse) => void;
  retryDelay?: (retry: number, signal: AbortSignal) => Promise<void>;
};

type ProviderResponseStream = {
  events: AssistantMessageEventStream;
  failure: () => string | undefined;
  usageKnown: (message: AssistantMessage) => boolean;
  usageCompleteness: (
    message: AssistantMessage,
  ) => "complete" | "partial" | "unknown";
  usageMeasurement: (
    message: AssistantMessage,
  ) => PiUsageMeasurement | undefined;
};

const unknownUsage: Usage = {
  input: 0,
  output: 0,
  cacheRead: 0,
  cacheWrite: 0,
  totalTokens: 0,
  cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
};

function responseId(value: unknown): string | undefined {
  return typeof value === "string" && /^[A-Za-z0-9_-]{1,128}$/.test(value)
    ? value
    : undefined;
}

function requestId(response: Response): string | undefined {
  const value = response.headers.get("x-request-id");
  return value && /^[A-Za-z0-9._:-]{1,128}$/.test(value) ? value : undefined;
}

function responseUsage(value: unknown): {
  usage: Usage;
  completeness: "complete" | "partial" | "unknown";
  measurement: PiUsageMeasurement;
} {
  if (!value || typeof value !== "object" || Array.isArray(value))
    return { usage: unknownUsage, completeness: "unknown", measurement: {} };
  const raw = value as Record<string, unknown>;
  const token = (item: unknown): number | undefined =>
    typeof item === "number" && Number.isFinite(item) && item >= 0
      ? item
      : undefined;
  const inputTokens = token(raw.input_tokens);
  const outputTokens = token(raw.output_tokens);
  const totalTokens = token(raw.total_tokens);
  const cached =
    raw.input_tokens_details &&
    typeof raw.input_tokens_details === "object" &&
    !Array.isArray(raw.input_tokens_details)
      ? (raw.input_tokens_details as Record<string, unknown>).cached_tokens
      : undefined;
  const cacheWrite =
    raw.input_tokens_details &&
    typeof raw.input_tokens_details === "object" &&
    !Array.isArray(raw.input_tokens_details)
      ? (raw.input_tokens_details as Record<string, unknown>).cache_write_tokens
      : undefined;
  const cacheRead = token(cached);
  const cacheWriteTokens = token(cacheWrite);
  const input = inputTokens ?? 0;
  const output = outputTokens ?? 0;
  const usage: Usage = {
    ...unknownUsage,
    input: Math.max(0, input - (cacheRead ?? 0) - (cacheWriteTokens ?? 0)),
    output,
    cacheRead: cacheRead ?? 0,
    cacheWrite: cacheWriteTokens ?? 0,
    totalTokens: totalTokens ?? 0,
  };
  const measurement: PiUsageMeasurement = {
    ...(inputTokens !== undefined ? { inputTokens } : {}),
    ...(outputTokens !== undefined ? { outputTokens } : {}),
    ...(totalTokens !== undefined ? { totalTokens } : {}),
    ...(cacheRead !== undefined ? { cachedTokens: cacheRead } : {}),
    ...(cacheWriteTokens !== undefined ? { cacheWriteTokens } : {}),
  };
  const requiredMeasured = [inputTokens, outputTokens, totalTokens].filter(
    (item) => item !== undefined,
  ).length;
  return {
    usage,
    completeness:
      requiredMeasured === 3
        ? "complete"
        : Object.keys(measurement).length > 0
          ? "partial"
          : "unknown",
    measurement,
  };
}

function defaultRetryDelay(retry: number, signal: AbortSignal): Promise<void> {
  const delay = retry === 1 ? 150 : 350;
  if (signal.aborted)
    return Promise.reject(new PiModelStreamFailure("aborted"));
  return new Promise((resolve, reject) => {
    const timer = setTimeout(done, delay);
    const abort = () => {
      clearTimeout(timer);
      signal.removeEventListener("abort", abort);
      reject(new PiModelStreamFailure("aborted"));
    };
    function done() {
      signal.removeEventListener("abort", abort);
      resolve();
    }
    signal.addEventListener("abort", abort, { once: true });
  });
}

function completionOf(value: unknown): PiChatGPTCompletedResponse | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return;
  const response = value as Record<string, unknown>;
  if (!Array.isArray(response.output)) return;
  const output: Record<string, unknown>[] = [];
  for (const item of response.output) {
    if (!item || typeof item !== "object" || Array.isArray(item)) return;
    output.push(item as Record<string, unknown>);
  }
  const rawUsage = response.usage;
  const usage =
    rawUsage && typeof rawUsage === "object" && !Array.isArray(rawUsage)
      ? responseUsage(rawUsage).measurement
      : undefined;
  return {
    ...(responseId(response.id) ? { id: responseId(response.id) } : {}),
    output,
    ...(usage ? { usage } : {}),
  };
}

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value as Record<string, unknown>)
      .sort()
      .map(
        (key) =>
          `${JSON.stringify(key)}:${canonicalJson((value as Record<string, unknown>)[key])}`,
      )
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function object(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function validUsage(value: unknown): boolean {
  if (value === undefined) return true;
  if (!object(value)) return false;
  for (const key of [
    "input_tokens",
    "output_tokens",
    "total_tokens",
  ] as const) {
    const count = value[key];
    if (
      count !== undefined &&
      (typeof count !== "number" || !Number.isFinite(count) || count < 0)
    )
      return false;
  }
  const details = value.input_tokens_details;
  if (details !== undefined && !object(details)) return false;
  if (object(details)) {
    for (const key of ["cached_tokens", "cache_write_tokens"] as const) {
      const count = details[key];
      if (
        count !== undefined &&
        (typeof count !== "number" || !Number.isFinite(count) || count < 0)
      )
        return false;
    }
  }
  return true;
}

function validWebSearchAction(
  value: unknown,
): value is ResponseFunctionWebSearch["action"] {
  if (!object(value) || typeof value.type !== "string") return false;
  if (value.type === "search") {
    const queries = value.queries;
    const query = value.query;
    const sources = value.sources;
    return (
      (queries === undefined ||
        (Array.isArray(queries) &&
          queries.every((item) => typeof item === "string"))) &&
      (query === undefined || typeof query === "string") &&
      (sources === undefined ||
        (Array.isArray(sources) &&
          sources.every(
            (source) =>
              object(source) &&
              source.type === "url" &&
              typeof source.url === "string",
          )))
    );
  }
  if (value.type === "open_page")
    return (
      value.url === undefined ||
      value.url === null ||
      typeof value.url === "string"
    );
  if (value.type === "find_in_page")
    return typeof value.url === "string" && typeof value.pattern === "string";
  return false;
}

function validCompletedResponse(
  value: unknown,
  message: AssistantMessage,
  tools: Tool[],
  forceWebSearch: boolean,
  gatewayNameByWireName: ReadonlyMap<string, string>,
): value is Record<string, unknown> & { output: Record<string, unknown>[] } {
  if (
    !object(value) ||
    !responseId(value.id) ||
    value.status !== "completed" ||
    !Array.isArray(value.output) ||
    !validUsage(value.usage)
  )
    return false;
  const responseText: string[] = [];
  const responseCalls: Array<{
    id: string;
    callId: string;
    name: string;
    arguments: JsonObject;
  }> = [];
  for (const item of value.output) {
    if (!object(item) || typeof item.type !== "string") return false;
    if (item.type === "message") {
      if (
        typeof item.id !== "string" ||
        !item.id ||
        item.status !== "completed" ||
        item.role !== "assistant" ||
        !Array.isArray(item.content)
      )
        return false;
      for (const part of item.content) {
        if (!object(part)) return false;
        if (part.type === "output_text" && typeof part.text === "string")
          responseText.push(part.text);
        else if (part.type === "refusal" && typeof part.refusal === "string")
          responseText.push(part.refusal);
        else return false;
      }
    } else if (item.type === "function_call") {
      if (
        typeof item.id !== "string" ||
        !item.id ||
        item.status !== "completed" ||
        typeof item.call_id !== "string" ||
        !item.call_id ||
        item.namespace !== PI_CHATGPT_TOOL_NAMESPACE ||
        typeof item.name !== "string" ||
        typeof item.arguments !== "string"
      )
        return false;
      let args: unknown;
      try {
        args = JSON.parse(item.arguments);
      } catch {
        return false;
      }
      if (!object(args)) return false;
      const gatewayName = gatewayNameByWireName.get(item.name);
      if (!gatewayName) return false;
      responseCalls.push({
        id: item.id,
        callId: item.call_id,
        name: gatewayName,
        arguments: args as JsonObject,
      });
    } else if (item.type === "reasoning") {
      if (item.summary !== undefined && !Array.isArray(item.summary))
        return false;
      if (item.content !== undefined && !Array.isArray(item.content))
        return false;
      if (
        Array.isArray(item.summary) &&
        !item.summary.every(
          (part) =>
            object(part) &&
            part.type === "summary_text" &&
            typeof part.text === "string",
        )
      )
        return false;
      if (
        Array.isArray(item.content) &&
        !item.content.every(
          (part) =>
            object(part) &&
            (part.type === "reasoning_text" || part.type === "code") &&
            typeof part.text === "string",
        )
      )
        return false;
    } else if (item.type === "web_search_call") {
      if (
        !forceWebSearch ||
        typeof item.id !== "string" ||
        !item.id ||
        item.status !== "completed" ||
        !validWebSearchAction(item.action)
      )
        return false;
    } else {
      return false;
    }
  }
  const sdkText = message.content
    .filter((part) => part.type === "text")
    .map((part) => (part.type === "text" ? part.text : ""))
    .join("");
  if (responseText.join("") !== sdkText) return false;
  const sdkCalls = message.content.filter((part) => part.type === "toolCall");
  if (sdkCalls.length !== responseCalls.length) return false;
  for (let index = 0; index < sdkCalls.length; index++) {
    const sdkCall = sdkCalls[index];
    const responseCall = responseCalls[index];
    if (
      sdkCall.type !== "toolCall" ||
      sdkCall.id !== `${responseCall.callId}|${responseCall.id}` ||
      sdkCall.name !== responseCall.name ||
      canonicalJson(sdkCall.arguments) !== canonicalJson(responseCall.arguments)
    )
      return false;
    try {
      validateToolCall(tools, {
        type: "toolCall",
        id: sdkCall.id,
        name: responseCall.name,
        arguments: responseCall.arguments,
      });
    } catch {
      return false;
    }
  }
  return value.output.length > 0;
}

/** Use the admitted Pi 1.0.0 Responses adapter and its decoded-event hook. */
export function streamPiChatGPTResponses(
  model: Model<"openai-responses">,
  context: TranscriptContext,
  options: PiChatGPTResponsesOptions,
): ProviderResponseStream {
  const output = createAssistantMessageEventStream();
  const usageFacts = new WeakMap<
    object,
    {
      known: boolean;
      completeness: "complete" | "partial" | "unknown";
      measurement: PiUsageMeasurement;
    }
  >();
  let failureCode: string | undefined;
  let lastUsage = unknownUsage;
  let lastCompleteness: "complete" | "partial" | "unknown" = "unknown";
  let lastMeasurement: PiUsageMeasurement = {};
  let attemptStatus: number | undefined;
  let attemptRequestId: string | undefined;
  const payloadFailures = new Map<number, PiModelStreamFailure>();
  let completedResponse: PiChatGPTCompletedResponse | undefined;
  let gatewayNameByWireName = new Map<string, string>();
  let invalidToolNamespace = false;
  let started = false;
  let finished = false;
  let latestPartial: AssistantMessage | undefined;

  const fail = (message: AssistantMessage, code: string) => {
    failureCode = code;
    finished = true;
    const safe = {
      ...message,
      stopReason: "error" as const,
      errorMessage: code,
    };
    usageFacts.set(safe.usage, {
      known: lastCompleteness !== "unknown",
      completeness: lastCompleteness,
      measurement: lastMeasurement,
    });
    output.push({ type: "error", reason: "error", error: safe });
    output.end();
  };
  const emitStart = (message: AssistantMessage) => {
    if (started) return;
    started = true;
    output.push({ type: "start", partial: message });
  };

  void (async () => {
    for (let retry = 0; retry <= 2 && !finished; retry++) {
      attemptStatus = undefined;
      attemptRequestId = undefined;
      lastUsage = unknownUsage;
      lastCompleteness = "unknown";
      lastMeasurement = {};
      payloadFailures.clear();
      completedResponse = undefined;
      gatewayNameByWireName = new Map();
      invalidToolNamespace = false;
      if (options.signal.aborted) {
        options.onTerminal?.({ status: "aborted", code: "aborted" });
        fail(
          {
            role: "assistant",
            content: [],
            api: model.api,
            provider: model.provider,
            model: model.id,
            usage: lastUsage,
            stopReason: "aborted",
            timestamp: Date.now(),
          },
          "aborted",
        );
        return;
      }
      let terminal: PiProviderTerminal | undefined;
      let responseFailed = false;
      let emittedOutput = false;
      let retryAgain = false;
      const streamedOutput = new Map<
        number,
        Record<string, unknown> | undefined
      >();
      let validStreamedOutput = true;
      let responseStream;
      try {
        responseStream = streamOpenAIResponses(model, context, {
          apiKey: options.apiKey,
          signal: options.signal,
          ...(options.reasoning ? { reasoning: options.reasoning } : {}),
          fetch: async (request, init) => {
            const response = await options.fetch(request, init);
            attemptStatus = response.status;
            attemptRequestId = requestId(response);
            return response;
          },
          maxRetries: 0,
          onPayload: (payload) => {
            try {
              const prepared = preparePiChatGPTPayload(
                payload,
                options.explicitOptions,
                options.forceWebSearch,
              );
              gatewayNameByWireName = prepared.gatewayNameByWireName;
              return prepared.payload;
            } catch (error) {
              if (error instanceof PiModelStreamFailure)
                payloadFailures.set(0, error);
              throw error;
            }
          },
          onProviderStreamEvent: (event) => {
            try {
              options.onProviderStreamEvent?.(event);
            } catch {
              // Native search observers cannot alter provider execution.
            }
            if (!event || typeof event !== "object") return;
            const raw = event as Record<string, unknown>;
            const type = raw.type;
            const item = raw.item;
            if (
              type === "response.output_item.added" ||
              type === "response.output_item.done"
            ) {
              const index = raw.output_index;
              if (
                typeof index !== "number" ||
                !Number.isSafeInteger(index) ||
                index < 0
              )
                validStreamedOutput = false;
              else if (type === "response.output_item.added") {
                if (streamedOutput.has(index)) validStreamedOutput = false;
                streamedOutput.set(index, undefined);
              } else if (!object(item) || streamedOutput.get(index)) {
                validStreamedOutput = false;
              } else {
                // Preserve the wire namespace before adapting the event for Pi.
                streamedOutput.set(index, structuredClone(item));
              }
            }
            if (
              (type === "response.output_item.added" ||
                type === "response.output_item.done") &&
              item &&
              typeof item === "object" &&
              !Array.isArray(item) &&
              (item as Record<string, unknown>).type === "function_call"
            ) {
              const call = item as Record<string, unknown>;
              const gatewayName =
                call.namespace === PI_CHATGPT_TOOL_NAMESPACE &&
                typeof call.name === "string"
                  ? gatewayNameByWireName.get(call.name)
                  : undefined;
              if (!gatewayName) invalidToolNamespace = true;
              else {
                call.name = gatewayName;
                delete call.namespace;
              }
            }
            const response =
              raw.response && typeof raw.response === "object"
                ? (raw.response as Record<string, unknown>)
                : undefined;
            if (type === "response.completed" && response) {
              terminal = {
                status: "completed",
                ...(responseId(response.id)
                  ? { responseId: responseId(response.id) }
                  : {}),
              };
              const measured = responseUsage(response.usage);
              lastUsage = measured.usage;
              lastCompleteness = measured.completeness;
              lastMeasurement = measured.measurement;
              let completed = response;
              if (
                Array.isArray(response.output) &&
                response.output.length === 0 &&
                validStreamedOutput
              ) {
                const items = Array.from(
                  { length: streamedOutput.size },
                  (_, index) => streamedOutput.get(index),
                );
                if (items.length && items.every(object))
                  completed = { ...response, output: items };
              }
              completedResponse =
                completed as unknown as PiChatGPTCompletedResponse;
            } else if (type === "response.incomplete") {
              const measured = responseUsage(response?.usage);
              lastUsage = measured.usage;
              lastCompleteness = measured.completeness;
              lastMeasurement = measured.measurement;
              const reason =
                response?.incomplete_details &&
                typeof response.incomplete_details === "object"
                  ? (response.incomplete_details as Record<string, unknown>)
                      .reason
                  : undefined;
              terminal = {
                status: "incomplete",
                ...(responseId(response?.id)
                  ? { responseId: responseId(response?.id) }
                  : {}),
                ...(reason === "max_output_tokens" ||
                reason === "content_filter"
                  ? { reason }
                  : reason
                    ? { reason: "other" as const }
                    : {}),
              };
            } else if (type === "response.failed") {
              responseFailed = true;
              const measured = responseUsage(response?.usage);
              lastUsage = measured.usage;
              lastCompleteness = measured.completeness;
              lastMeasurement = measured.measurement;
              terminal = {
                status: "failed",
                code: "provider_response_failed",
                ...(attemptRequestId ? { requestId: attemptRequestId } : {}),
                ...(responseId(response?.id)
                  ? { responseId: responseId(response?.id) }
                  : {}),
              };
            }
          },
        });
        for await (const event of responseStream) {
          if (options.signal.aborted) break;
          if ("partial" in event) latestPartial = event.partial;
          if (event.type === "start") {
            emitStart(event.partial);
            continue;
          }
          if (
            event.type === "text_delta" ||
            event.type === "thinking_delta" ||
            event.type === "toolcall_start" ||
            event.type === "toolcall_delta" ||
            event.type === "toolcall_end"
          ) {
            emittedOutput = true;
            const partial = event.partial;
            usageFacts.set(partial.usage, {
              known: lastCompleteness !== "unknown",
              completeness: lastCompleteness,
              measurement: lastMeasurement,
            });
            output.push(event);
            continue;
          }
          if (event.type === "done") {
            if (invalidToolNamespace) {
              options.onTerminal?.({
                status: "failed",
                code: "unsupported_model",
                ...(attemptRequestId ? { requestId: attemptRequestId } : {}),
              });
              fail(event.message, "unsupported_model");
              return;
            }
            if (lastCompleteness === "unknown") {
              lastUsage = event.message.usage;
            }
            if (terminal?.status === "incomplete") {
              options.onTerminal?.(terminal);
              fail(event.message, "provider_response_incomplete");
              return;
            }
            if (terminal?.status === "failed") {
              options.onTerminal?.(terminal);
              fail(event.message, terminal.code);
              return;
            }
            if (terminal?.status !== "completed") {
              const missing: PiProviderTerminal = {
                status: "missing",
                code: "provider_terminal_missing",
              };
              options.onTerminal?.(missing);
              fail(event.message, missing.code);
              return;
            }
            if (
              !completedResponse ||
              !validCompletedResponse(
                completedResponse,
                event.message,
                getCurrentTools(context.messages),
                options.forceWebSearch === true,
                gatewayNameByWireName,
              )
            ) {
              const malformed: PiProviderTerminal = {
                status: "failed",
                code: "provider_response_failed",
                ...(attemptRequestId ? { requestId: attemptRequestId } : {}),
              };
              options.onTerminal?.(malformed);
              fail(event.message, malformed.code);
              return;
            }
            const safeCompletedResponse = completionOf(completedResponse);
            if (!safeCompletedResponse) {
              const malformed: PiProviderTerminal = {
                status: "failed",
                code: "provider_response_failed",
                ...(attemptRequestId ? { requestId: attemptRequestId } : {}),
              };
              options.onTerminal?.(malformed);
              fail(event.message, malformed.code);
              return;
            }
            if (safeCompletedResponse) {
              try {
                options.onCompletedResponse?.(safeCompletedResponse);
              } catch {
                // Grounding observers do not change model completion.
              }
            }
            usageFacts.set(event.message.usage, {
              known: lastCompleteness !== "unknown",
              completeness: lastCompleteness,
              measurement: lastMeasurement,
            });
            options.onTerminal?.(terminal);
            finished = true;
            output.push(event);
            output.end();
            return;
          }
          if (event.type === "error") {
            const errorMessage = event.error;
            const payloadFailure = payloadFailures.get(0);
            if (payloadFailure) {
              options.onTerminal?.({
                status: "failed",
                code: payloadFailure.code,
                ...(payloadFailure.unsupportedParameter
                  ? {
                      unsupportedParameter: payloadFailure.unsupportedParameter,
                    }
                  : {}),
              });
              fail(errorMessage, payloadFailure.code);
              return;
            }
            const measuredUsage = errorMessage.usage || lastUsage;
            if (measuredUsage !== unknownUsage) {
              lastUsage = measuredUsage;
              if (
                lastCompleteness === "unknown" &&
                (measuredUsage.input > 0 ||
                  measuredUsage.output > 0 ||
                  measuredUsage.totalTokens > 0)
              )
                lastCompleteness = "partial";
            }
            const canRetry =
              attemptStatus === 503 &&
              !responseFailed &&
              options.forceWebSearch !== true &&
              !emittedOutput &&
              retry < 2 &&
              !!options.onRetry &&
              !options.signal.aborted;
            if (canRetry) {
              const failedTerminal: PiProviderTerminal = {
                status: "failed",
                code: "provider_response_failed",
                httpStatus: 503,
                ...(attemptRequestId ? { requestId: attemptRequestId } : {}),
              };
              const retryAllowed = await options.onRetry!({
                terminal: failedTerminal,
                usage: lastUsage,
                usageCompleteness: lastCompleteness,
                usageMeasurement: lastMeasurement,
              });
              if (retryAllowed) {
                await (options.retryDelay || defaultRetryDelay)(
                  retry + 1,
                  options.signal,
                );
                retryAgain = true;
                break;
              }
            }
            const safeTerminal =
              terminal ||
              (options.signal.aborted
                ? ({ status: "aborted", code: "aborted" } as const)
                : attemptStatus !== undefined &&
                    attemptStatus >= 200 &&
                    attemptStatus < 300
                  ? ({
                      status: "missing",
                      code: "provider_terminal_missing",
                    } as const)
                  : attemptStatus !== undefined
                    ? {
                        status: "failed" as const,
                        code: "provider_response_failed" as const,
                        httpStatus: attemptStatus,
                        ...(attemptRequestId
                          ? { requestId: attemptRequestId }
                          : {}),
                      }
                    : ({
                        status: "missing",
                        code: "provider_terminal_missing",
                      } as const));
            options.onTerminal?.(safeTerminal);
            fail(
              {
                ...errorMessage,
                content:
                  errorMessage.content.length > 0
                    ? errorMessage.content
                    : (latestPartial?.content ?? []),
                usage: measuredUsage,
              },
              safeTerminal.status === "incomplete"
                ? "provider_response_incomplete"
                : safeTerminal.status === "missing"
                  ? "provider_terminal_missing"
                  : safeTerminal.status === "aborted"
                    ? "aborted"
                    : safeTerminal.status === "failed"
                      ? safeTerminal.code
                      : "provider_stream_error",
            );
            return;
          }
        }
      } catch (error) {
        const code =
          completedResponse !== undefined
            ? "provider_response_failed"
            : error instanceof PiModelStreamFailure
              ? error.code
              : options.signal.aborted
                ? "aborted"
                : "provider_stream_error";
        failureCode = code;
        const terminal: PiProviderTerminal = options.signal.aborted
          ? { status: "aborted", code: "aborted" }
          : !(error instanceof PiModelStreamFailure) &&
              attemptStatus !== undefined &&
              attemptStatus >= 200 &&
              attemptStatus < 300
            ? { status: "missing", code: "provider_terminal_missing" }
            : {
                status: "failed",
                code:
                  code === "provider_response_failed"
                    ? "provider_response_failed"
                    : "provider_stream_error",
                ...(attemptStatus !== undefined
                  ? { httpStatus: attemptStatus }
                  : {}),
                ...(attemptRequestId ? { requestId: attemptRequestId } : {}),
              };
        options.onTerminal?.(terminal);
        fail(
          {
            role: "assistant",
            content: latestPartial?.content ?? [],
            api: model.api,
            provider: model.provider,
            model: model.id,
            usage: lastUsage,
            stopReason: options.signal.aborted ? "aborted" : "error",
            timestamp: Date.now(),
          },
          !options.signal.aborted &&
            terminal.status === "missing" &&
            code === "provider_stream_error"
            ? "provider_terminal_missing"
            : code,
        );
        return;
      }
      if (retryAgain && retry < 2 && !finished) continue;
      if (!finished) {
        const missing: PiProviderTerminal = {
          status: "missing",
          code: "provider_terminal_missing",
        };
        options.onTerminal?.(missing);
        fail(
          {
            role: "assistant",
            content: [],
            api: model.api,
            provider: model.provider,
            model: model.id,
            usage: lastUsage,
            stopReason: "error",
            timestamp: Date.now(),
          },
          missing.code,
        );
      }
    }
  })();

  return {
    events: output,
    failure: () => failureCode,
    usageKnown: (message) => usageFacts.get(message.usage)?.known ?? false,
    usageCompleteness: (message) =>
      usageFacts.get(message.usage)?.completeness ?? "unknown",
    usageMeasurement: (message) => usageFacts.get(message.usage)?.measurement,
  };
}

/**
 * Enforce SIWC constraints after the SDK has assembled its request. Explicit
 * unsupported sampling options fail closed; generated fields are stripped.
 */
export function preparePiChatGPTPayload(
  value: unknown,
  explicitOptions: readonly string[] = [],
  forceWebSearch = false,
): {
  payload: Record<string, unknown>;
  gatewayNameByWireName: Map<string, string>;
} {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new PiModelStreamFailure("unsupported_model");
  const payload = { ...(value as Record<string, unknown>) };
  const unsupported = explicitOptions.find((key) =>
    UNSUPPORTED_SIWC_FIELDS.has(key),
  );
  if (unsupported)
    throw new PiModelStreamFailure("unsupported_model", unsupported);

  const instructions: string[] = [];
  const input = Array.isArray(payload.input) ? payload.input : [];
  payload.input = input.filter((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return true;
    const message = item as { role?: unknown; content?: unknown };
    if (message.role !== "system" && message.role !== "developer") return true;
    if (typeof message.content === "string") instructions.push(message.content);
    else if (Array.isArray(message.content))
      for (const part of message.content)
        if (
          part &&
          typeof part === "object" &&
          "text" in part &&
          typeof part.text === "string"
        )
          instructions.push(part.text);
    return false;
  });
  if (instructions.length) payload.instructions = instructions.join("\n\n");
  for (const key of UNSUPPORTED_SIWC_FIELDS) delete payload[key];
  delete payload.previous_response_id;
  payload.stream = true;
  payload.store = false;
  const historicalFunctionNames = (payload.input as unknown[]).flatMap(
    (item): string[] => {
      if (!object(item) || item.type !== "function_call") return [];
      if (typeof item.name !== "string" || !item.name)
        throw new PiModelStreamFailure(
          "unsupported_model",
          "function_call.name",
        );
      return [item.name];
    },
  );
  const projected = projectPiChatGPTToolWire(
    Array.isArray(payload.tools)
      ? payload.tools.filter(
          (tool): tool is Record<string, unknown> & { name: string } =>
            !!tool &&
            typeof tool === "object" &&
            !Array.isArray(tool) &&
            (tool as Record<string, unknown>).type === "function" &&
            typeof (tool as Record<string, unknown>).name === "string",
        )
      : [],
    forceWebSearch,
    historicalFunctionNames,
  );
  payload.input = (payload.input as unknown[]).map((item) => {
    if (!object(item) || item.type !== "function_call") return item;
    const wireName = projected.wireNameByGatewayName.get(item.name as string);
    if (!wireName)
      throw new PiModelStreamFailure("unsupported_model", "function_call.name");
    return {
      ...item,
      name: wireName,
      namespace: PI_CHATGPT_TOOL_NAMESPACE,
    };
  });
  payload.tools = projected.tools;
  if (forceWebSearch) payload.tool_choice = { type: "web_search" };
  return {
    payload,
    gatewayNameByWireName: new Map(projected.gatewayNameByWireName),
  };
}
