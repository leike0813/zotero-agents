import type {
  AssistantMessage,
  AssistantMessageEventStream,
  Context,
  Model,
  ProviderStreams,
} from "@earendil-works/pi-ai";
import { createAssistantMessageEventStream } from "@earendil-works/pi-ai";
import { streamSimple as streamOpenAIResponses } from "@earendil-works/pi-ai/api/openai-responses";
import { streamSimple as streamOpenAICompletions } from "@earendil-works/pi-ai/api/openai-completions";
import { streamSimple as streamAnthropicMessages } from "@earendil-works/pi-ai/api/anthropic-messages";
import { streamSimple as streamGoogle } from "@earendil-works/pi-ai/api/google-generative-ai";
import { stream as streamCodex } from "@earendil-works/pi-ai/api/openai-codex-responses";
import type { PiModelSelectionSnapshot } from "../shared/piProviderContract";
import { readPiCredential } from "./piCredentialStore";
import { resolvePiOpenAICodexAccess } from "./piOpenAICodexAuth";
import {
  PiModelStreamFailure,
  type PiModelFailureCode,
  type PiRuntimeModelInput,
  type PiRuntimeModelSource,
  type PiRuntimeProviderSource,
} from "./piRuntime";

type Admission = {
  fetch?: typeof fetch;
  authorizeLocalNetwork?: (endpoint: string) => Promise<boolean>;
};

const streams: Record<string, ProviderStreams["streamSimple"]> = {
  "openai-responses": streamOpenAIResponses,
  "openai-completions": streamOpenAICompletions,
  "anthropic-messages": streamAnthropicMessages,
  "google-generative-ai": streamGoogle,
};

function modelOf(selection: PiModelSelectionSnapshot): Model<string> {
  return {
    id: selection.modelId,
    name: selection.modelId,
    provider: selection.provider,
    api: selection.api,
    baseUrl: selection.baseUrl,
    reasoning: selection.reasoning !== "off",
    input: selection.policy.input.filter(
      (item): item is "text" | "image" => item === "text" || item === "image",
    ),
    contextWindow: selection.policy.contextWindow,
    maxTokens: selection.policy.maxTokens,
    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
  };
}

function emptyUsage(): AssistantMessage["usage"] {
  return {
    input: 0,
    output: 0,
    cacheRead: 0,
    cacheWrite: 0,
    totalTokens: 0,
    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
  };
}

function contextOf(input: PiRuntimeModelInput, model: Model<string>): Context {
  return {
    systemPrompt: input.systemPrompt,
    messages: input.messages.map((message) =>
      message.role === "user"
        ? { role: "user" as const, content: message.text, timestamp: 0 }
        : {
            role: "assistant" as const,
            content: [{ type: "text" as const, text: message.text }],
            api: model.api,
            provider: model.provider,
            model: model.id,
            usage: emptyUsage(),
            stopReason: "stop" as const,
            timestamp: 0,
          },
    ),
  };
}

function failureMessage(
  model: Model<string>,
  stopReason: "error" | "aborted",
): AssistantMessage {
  return {
    role: "assistant",
    content: [],
    api: model.api,
    provider: model.provider,
    model: model.id,
    usage: emptyUsage(),
    stopReason,
    timestamp: Date.now(),
  };
}

type ProviderStreamHandle = {
  events: AssistantMessageEventStream;
  failure: () => PiModelFailureCode | undefined;
};

async function openPiProviderStream(
  selection: PiModelSelectionSnapshot,
  admission: Admission,
  context: Context,
  signal: AbortSignal,
): Promise<ProviderStreamHandle> {
  if (signal.aborted) throw new PiModelStreamFailure("aborted");
  const stream = streams[selection.api];
  if (!stream && selection.api !== "openai-codex-responses")
    throw new PiModelStreamFailure("unsupported_provider");
  if (selection.api === "google-generative-ai" && admission.fetch)
    throw new PiModelStreamFailure("unsupported_provider");
  if (
    !selection.modelId ||
    !selection.baseUrl ||
    selection.policy.contextWindow < 1 ||
    selection.policy.maxTokens < 0 ||
    (selection.policy.maxTokens === 0 &&
      selection.api !== "openai-codex-responses")
  )
    throw new PiModelStreamFailure("unsupported_model");
  if (
    selection.requiresLocalNetwork &&
    !(await admission.authorizeLocalNetwork?.(selection.baseUrl))
  )
    throw new PiModelStreamFailure("provider_unavailable");
  let apiKey: string | undefined;
  if (selection.authVariant === "api-key") {
    if (!selection.credentialRef)
      throw new PiModelStreamFailure("credential_missing");
    const resolved = await readPiCredential(selection.credentialRef);
    if (!resolved.ok || resolved.material.kind !== "api-key")
      throw new PiModelStreamFailure("credential_missing");
    apiKey = resolved.material.secret;
  } else if (selection.authVariant === "none") {
    if (!["openai-responses", "openai-completions"].includes(selection.api))
      throw new PiModelStreamFailure("unsupported_provider");
    apiKey = "unused";
  } else if (selection.authVariant === "openai-codex") {
    if (
      selection.provider !== "openai-codex" ||
      selection.api !== "openai-codex-responses" ||
      !selection.credentialRef
    )
      throw new PiModelStreamFailure("unsupported_provider");
    try {
      apiKey = await resolvePiOpenAICodexAccess(
        selection.credentialRef,
        signal,
        admission.fetch,
      );
    } catch (error) {
      const code = error instanceof Error ? error.message : "";
      throw new PiModelStreamFailure(
        code === "canceled"
          ? "aborted"
          : code === "credential_missing"
            ? "credential_missing"
            : code === "auth_unavailable"
              ? "provider_unavailable"
              : "provider_auth_failed",
      );
    }
  } else {
    throw new PiModelStreamFailure("unsupported_provider");
  }
  const model = modelOf(selection);
  let failureCode: PiModelFailureCode | undefined;
  const requestFetch: typeof fetch = async (request, init) => {
    try {
      const clean = new Request(request, init);
      if (selection.authVariant === "none") {
        clean.headers.delete("authorization");
        clean.headers.delete("proxy-authorization");
      }
      const response = await (admission.fetch || globalThis.fetch)(clean);
      if (!response.ok)
        failureCode =
          response.status === 401 || response.status === 403
            ? "provider_auth_failed"
            : response.status === 429
              ? "provider_rate_limited"
              : response.status >= 500
                ? "provider_unavailable"
                : "provider_http_error";
      return response;
    } catch {
      failureCode = signal.aborted ? "aborted" : "provider_network_error";
      throw new PiModelStreamFailure(failureCode);
    }
  };
  const events =
    selection.api === "openai-codex-responses"
      ? streamCodex(model as Model<"openai-codex-responses">, context, {
          apiKey,
          signal,
          cacheRetention: "short",
          transport: "sse",
          reasoningEffort:
            selection.reasoning === "off" ? "none" : selection.reasoning,
          fetch: requestFetch,
        })
      : stream(model, context, {
          apiKey,
          signal,
          cacheRetention: "short",
          ...(selection.api === "google-generative-ai"
            ? {}
            : { fetch: requestFetch }),
        });
  return { events, failure: () => failureCode };
}

/**
 * Structured provider source for the Agent turn path. Failures are normalized so
 * no raw provider detail reaches the runtime or its events.
 */
export function createPiProviderSource(
  selection: PiModelSelectionSnapshot,
  admission: Admission = {},
): { model: Model<string>; source: PiRuntimeProviderSource } {
  const model = modelOf(selection);
  return {
    model,
    source: async ({ context, signal }) => {
      const handle = await openPiProviderStream(
        selection,
        admission,
        context,
        signal,
      );
      const output = createAssistantMessageEventStream();
      const fail = (reason: "error" | "aborted") => ({
        ...failureMessage(model, reason),
        errorMessage:
          reason === "aborted"
            ? "aborted"
            : handle.failure() || "provider_stream_error",
      });
      void (async () => {
        let settled = false;
        try {
          for await (const event of handle.events) {
            if (signal.aborted) {
              output.push({
                type: "error",
                reason: "aborted",
                error: fail("aborted"),
              });
              settled = true;
              break;
            }
            if (event.type === "done") {
              output.push(event);
              settled = true;
              break;
            }
            if (event.type === "error") {
              output.push({
                type: "error",
                reason: event.reason,
                error: fail(event.reason),
              });
              settled = true;
              break;
            }
            output.push(event);
          }
        } catch {
          output.push({
            type: "error",
            reason: signal.aborted ? "aborted" : "error",
            error: fail(signal.aborted ? "aborted" : "error"),
          });
          return;
        }
        if (!settled)
          output.push({ type: "error", reason: "error", error: fail("error") });
      })();
      return output;
    },
  };
}

/** Legacy text-delta seam retained for simple callers and connection tests. */
export function createPiProviderModelSource(
  selection: PiModelSelectionSnapshot,
  admission: Admission = {},
): PiRuntimeModelSource {
  return async function* (input) {
    const model = modelOf(selection);
    const handle = await openPiProviderStream(
      selection,
      admission,
      contextOf(input, model),
      input.signal,
    );
    try {
      for await (const event of handle.events) {
        if (input.signal.aborted) throw new PiModelStreamFailure("aborted");
        if (event.type === "text_delta") yield event.delta;
        else if (event.type === "error")
          throw new PiModelStreamFailure(
            handle.failure() || "provider_stream_error",
          );
      }
    } catch (error) {
      if (error instanceof PiModelStreamFailure) throw error;
      throw new PiModelStreamFailure(
        input.signal.aborted
          ? "aborted"
          : handle.failure() || "provider_stream_error",
      );
    }
  };
}
