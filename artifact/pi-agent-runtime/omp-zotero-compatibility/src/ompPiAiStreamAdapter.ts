import { createAssistantMessageEventStream } from "@earendil-works/pi-ai";
import type {
  AssistantMessage as NativeAssistantMessage,
  AssistantMessageEvent as NativeAssistantMessageEvent,
  Context as NativeContext,
  Message as NativeMessage,
  Model as NativeModel,
  SimpleStreamOptions as NativeOptions,
  ToolCall as NativeToolCall,
  Usage as NativeUsage,
} from "@earendil-works/pi-ai";
import type { StreamFn } from "@earendil-works/pi-agent-core";
import type {
  AssistantMessage as OmpAssistantMessage,
  AssistantMessageEvent as OmpAssistantMessageEvent,
  AssistantMessageEventStream as OmpAssistantMessageEventStream,
  Context as OmpContext,
  Message as OmpMessage,
  Model as OmpModel,
  SimpleStreamOptions as OmpOptions,
  Usage as OmpUsage,
} from "@oh-my-pi/pi-ai";

export type OmpStreamFn = (
  model: OmpModel,
  context: OmpContext,
  options?: OmpOptions,
) => OmpAssistantMessageEventStream;

function toOmpUsage(usage: NativeUsage): OmpUsage {
  return {
    input: usage.input,
    output: usage.output,
    cacheRead: usage.cacheRead,
    cacheWrite: usage.cacheWrite,
    totalTokens: usage.totalTokens,
    reasoningTokens: usage.reasoning,
    cost: { ...usage.cost },
  };
}

function toNativeUsage(usage: OmpUsage): NativeUsage {
  return {
    input: usage.input,
    output: usage.output,
    cacheRead: usage.cacheRead,
    cacheWrite: usage.cacheWrite,
    totalTokens: usage.totalTokens,
    reasoning: usage.reasoningTokens,
    cost: { ...usage.cost },
  };
}

function normalizeArguments(argumentsValue: unknown): Record<string, unknown> {
  const parsed =
    typeof argumentsValue === "string"
      ? JSON.parse(argumentsValue)
      : argumentsValue;
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("OMP tool-call arguments must resolve to an object");
  }
  return parsed as Record<string, unknown>;
}

function toOmpMessage(message: NativeMessage): OmpMessage {
  if (message.role === "user") {
    return {
      role: "user",
      content: message.content,
      timestamp: message.timestamp,
    };
  }
  if (message.role === "toolResult") {
    return {
      role: "toolResult",
      toolCallId: message.toolCallId,
      toolName: message.toolName,
      content: message.content,
      details: message.details,
      isError: message.isError,
      timestamp: message.timestamp,
    };
  }
  return {
    role: "assistant",
    content: message.content,
    api: message.api,
    provider: message.provider,
    model: message.model,
    responseId: message.responseId,
    usage: toOmpUsage(message.usage),
    stopReason:
      message.stopReason === "pending" || message.stopReason === "deferred"
        ? "stop"
        : message.stopReason,
    errorMessage: message.errorMessage,
    timestamp: message.timestamp,
  } as OmpAssistantMessage;
}

function toOmpContext(context: NativeContext): OmpContext {
  return {
    systemPrompt: context.systemPrompt ? [context.systemPrompt] : undefined,
    messages: context.messages.map(toOmpMessage),
    tools: context.tools as OmpContext["tools"],
  };
}

function toNativeContent(message: OmpAssistantMessage) {
  return message.content.map((block) => {
    if (block.type === "text") {
      return { type: "text" as const, text: block.text };
    }
    if (block.type === "thinking") {
      return {
        type: "thinking" as const,
        thinking: block.thinking,
        thinkingSignature: block.thinkingSignature,
      };
    }
    if (block.type === "toolCall") {
      return {
        type: "toolCall" as const,
        id: block.id,
        name: block.name,
        arguments: normalizeArguments(block.arguments),
      } satisfies NativeToolCall;
    }
    throw new Error(`OMP content block ${block.type} has no native Pi ABI form`);
  });
}

function toNativeMessage(message: OmpAssistantMessage): NativeAssistantMessage {
  return {
    role: "assistant",
    content: toNativeContent(message),
    api: message.api,
    provider: message.provider,
    model: message.model,
    responseId: message.responseId,
    usage: toNativeUsage(message.usage),
    stopReason: message.stopReason,
    errorMessage: message.errorMessage,
    timestamp: message.timestamp,
  };
}

function toNativeEvent(
  event: OmpAssistantMessageEvent,
): NativeAssistantMessageEvent {
  if (event.type === "done") {
    return {
      type: "done",
      reason: event.reason,
      message: toNativeMessage(event.message),
    };
  }
  if (event.type === "error") {
    return {
      type: "error",
      reason: event.reason,
      error: toNativeMessage(event.error),
    };
  }
  if (event.type === "image_end") {
    throw new Error("OMP image output has no native Pi assistant-event form");
  }
  const partial = toNativeMessage(event.partial);
  if (event.type === "start") return { type: "start", partial };
  if (event.type === "text_delta" || event.type === "thinking_delta") {
    return { ...event, partial };
  }
  if (event.type === "text_end" || event.type === "thinking_end") {
    return { ...event, partial };
  }
  if (event.type === "toolcall_end") {
    return {
      ...event,
      toolCall: {
        type: "toolCall",
        id: event.toolCall.id,
        name: event.toolCall.name,
        arguments: normalizeArguments(event.toolCall.arguments),
      },
      partial,
    };
  }
  return { ...event, partial };
}

function errorMessage(model: NativeModel<string>, error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return {
    role: "assistant" as const,
    content: [],
    api: model.api,
    provider: model.provider,
    model: model.id,
    usage: {
      input: 0,
      output: 0,
      cacheRead: 0,
      cacheWrite: 0,
      totalTokens: 0,
      cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
    },
    stopReason: "error" as const,
    errorMessage: message,
    timestamp: Date.now(),
  } satisfies NativeAssistantMessage;
}

export function createOmpPiAiStreamFn(
  ompModel: OmpModel,
  ompStream: OmpStreamFn,
): StreamFn {
  return (nativeModel, context, options) => {
    const output = createAssistantMessageEventStream();
    void (async () => {
      try {
        const stream = ompStream(
          ompModel,
          toOmpContext(context),
          toOmpOptions(options, nativeModel),
        );
        for await (const event of stream) output.push(toNativeEvent(event));
      } catch (error) {
        const failure = errorMessage(nativeModel, error);
        output.push({ type: "error", reason: "error", error: failure });
      }
    })();
    return output;
  };
}

function toOmpOptions(
  options: NativeOptions | undefined,
  nativeModel: NativeModel<string>,
): OmpOptions | undefined {
  if (!options) return undefined;
  return {
    apiKey: options.apiKey,
    signal: options.signal,
    temperature: options.temperature,
    maxTokens: options.maxTokens,
    cacheRetention: options.cacheRetention,
    maxRetryDelayMs: options.maxRetryDelayMs,
    metadata: options.metadata,
    sessionId: options.sessionId,
    fetch: options.fetch,
    onPayload: options.onPayload
      ? (payload) => options.onPayload?.(payload, nativeModel)
      : undefined,
    onResponse: options.onResponse
      ? (response) => options.onResponse?.(response, nativeModel)
      : undefined,
  } as OmpOptions;
}
