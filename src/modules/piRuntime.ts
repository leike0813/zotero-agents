import { Agent } from "@earendil-works/pi-agent-core";
import type { StreamFn } from "@earendil-works/pi-agent-core";
import {
  createAssistantMessageEventStream,
  EventStream,
  type AssistantMessage,
  type Context,
  type Model,
} from "@earendil-works/pi-ai";

export type PiRuntimeModelInput = {
  systemPrompt: string;
  messages: readonly { role: "user" | "assistant"; text: string }[];
  signal: AbortSignal;
};

/** Internal model-stream seam; provider selection and credentials arrive in later changes. */
export type PiRuntimeModelSource = (
  input: PiRuntimeModelInput,
) => AsyncIterable<string>;

export type PiTurnResult =
  | { status: "completed"; text: string }
  | {
      status: "failed";
      failure: { code: "model_failed" | "runtime_failed"; message: string };
    }
  | { status: "canceled" };

export type PiRuntimeEvent = {
  sessionId: string;
  turnId: string;
  sequence: number;
} & (
  | { kind: "text_delta"; text: string }
  | { kind: "terminal"; result: PiTurnResult }
);

type PiRuntimeEventPayload =
  | { kind: "text_delta"; text: string }
  | { kind: "terminal"; result: PiTurnResult };

export type PiRuntimeTurn = {
  events: AsyncIterable<PiRuntimeEvent>;
  result: Promise<PiTurnResult>;
  abort(): void;
};

export type PiRuntimeSession = {
  runTurn(input: {
    turnId: string;
    prompt: string;
    systemPrompt?: string;
  }): PiRuntimeTurn;
  dispose(): void;
};

const EMPTY_USAGE: AssistantMessage["usage"] = {
  input: 0,
  output: 0,
  cacheRead: 0,
  cacheWrite: 0,
  totalTokens: 0,
  cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
};

const UNCONFIGURED_MODEL: Model<string> = {
  id: "unconfigured",
  name: "Unconfigured",
  api: "unconfigured",
  provider: "builtin-pi",
  baseUrl: "",
  reasoning: false,
  input: ["text"],
  cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
  contextWindow: 0,
  maxTokens: 0,
};

function projectContext(
  context: Context,
  signal: AbortSignal,
): PiRuntimeModelInput {
  const messages: PiRuntimeModelInput["messages"][number][] = [];
  for (const message of context.messages) {
    if (message.role === "user") {
      messages.push({
        role: "user",
        text:
          typeof message.content === "string"
            ? message.content
            : message.content
                .filter((part) => part.type === "text")
                .map((part) => part.text)
                .join(""),
      });
    } else if (message.role === "assistant") {
      messages.push({
        role: "assistant",
        text: message.content
          .filter((part) => part.type === "text")
          .map((part) => part.text)
          .join(""),
      });
    }
  }
  return {
    systemPrompt: context.systemPrompt ?? "",
    messages,
    signal,
  };
}

function modelMessage(
  model: Model<string>,
  text: string,
  stopReason: AssistantMessage["stopReason"],
  errorMessage?: string,
): AssistantMessage {
  return {
    role: "assistant",
    content: [{ type: "text", text }],
    api: model.api,
    provider: model.provider,
    model: model.id,
    usage: EMPTY_USAGE,
    stopReason,
    ...(errorMessage ? { errorMessage } : {}),
    timestamp: Date.now(),
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
        error: modelMessage(model, "", "error", "runtime_signal_unavailable"),
      });
      return stream;
    }
    void (async () => {
      let text = "";
      stream.push({
        type: "start",
        partial: modelMessage(model, "", "pending"),
      });
      try {
        for await (const delta of modelStream(
          projectContext(context, signal),
        )) {
          if (signal.aborted) break;
          text += delta;
          stream.push({
            type: "text_delta",
            contentIndex: 0,
            delta,
            partial: modelMessage(model, text, "pending"),
          });
        }
        if (signal.aborted) {
          stream.push({
            type: "error",
            reason: "aborted",
            error: modelMessage(model, text, "aborted"),
          });
        } else {
          stream.push({
            type: "done",
            reason: "stop",
            message: modelMessage(model, text, "stop"),
          });
        }
      } catch {
        stream.push({
          type: "error",
          reason: "error",
          error: modelMessage(model, text, "error", "model_failed"),
        });
      }
    })();
    return stream;
  };
}

export class PiRuntime {
  openSession(input: {
    sessionId: string;
    modelStream: PiRuntimeModelSource;
  }): PiRuntimeSession {
    const { sessionId, modelStream } = input;
    if (!sessionId.trim()) throw new Error("session_id_required");
    const agent = new Agent({
      sessionId,
      initialState: { model: UNCONFIGURED_MODEL, tools: [], systemPrompt: "" },
      streamFn: streamFrom(modelStream),
    });
    let disposed = false;
    let active = false;
    let activeAbort: (() => void) | null = null;

    return {
      runTurn({ turnId, prompt, systemPrompt = "" }) {
        if (disposed) throw new Error("session_disposed");
        if (active) throw new Error("owner_busy");
        if (!turnId.trim()) throw new Error("turn_id_required");
        active = true;
        agent.state.systemPrompt = systemPrompt;
        const events = new EventStream<PiRuntimeEvent, PiTurnResult>(
          (event) => event.kind === "terminal",
          (event) =>
            event.kind === "terminal" ? event.result : { status: "canceled" },
        );
        let sequence = 0;
        let terminal = false;
        let text = "";
        let nativeFailure = false;
        const publish = (event: PiRuntimeEventPayload) => {
          events.push({ ...event, sessionId, turnId, sequence: ++sequence });
        };
        const finish = (result: PiTurnResult) => {
          if (terminal) return;
          terminal = true;
          publish({ kind: "terminal", result });
        };
        const unsubscribe = agent.subscribe((event) => {
          if (terminal) return;
          if (
            event.type === "message_update" &&
            event.assistantMessageEvent.type === "text_delta"
          ) {
            const delta = event.assistantMessageEvent.delta;
            text += delta;
            publish({ kind: "text_delta", text: delta });
          } else if (
            event.type === "message_end" &&
            event.message.role === "assistant"
          ) {
            nativeFailure = event.message.stopReason === "error";
          }
        });
        const abort = () => {
          if (terminal) return;
          finish({ status: "canceled" });
          agent.abort();
        };
        activeAbort = abort;
        const settle = (result: PiTurnResult) => {
          unsubscribe();
          active = false;
          activeAbort = null;
          finish(result);
        };
        void agent.prompt(prompt).then(
          () =>
            settle(
              nativeFailure
                ? {
                    status: "failed",
                    failure: {
                      code: "model_failed",
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
        return { events, result: events.result(), abort };
      },
      dispose() {
        if (disposed) return;
        disposed = true;
        activeAbort?.();
      },
    };
  }
}
