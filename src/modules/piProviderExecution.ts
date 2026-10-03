import type {
  AssistantMessage,
  AssistantMessageEventStream,
  Context,
  Model,
  ProviderStreams,
} from "@earendil-works/pi-ai";
import {
  createAssistantMessageEventStream,
  normalizeContext,
} from "@earendil-works/pi-ai";
import { streamSimple as streamOpenAIResponses } from "@earendil-works/pi-ai/api/openai-responses";
import { streamSimple as streamOpenAICompletions } from "@earendil-works/pi-ai/api/openai-completions";
import { streamSimple as streamAnthropicMessages } from "@earendil-works/pi-ai/api/anthropic-messages";
import { streamSimple as streamGoogle } from "@earendil-works/pi-ai/api/google-generative-ai";
import { stream as streamCodex } from "@earendil-works/pi-ai/api/openai-codex-responses";
import type {
  PiModelCompat,
  PiModelCost,
  PiModelMetadata,
  PiModelSelectionSnapshot,
} from "../shared/piProviderContract";
import { readPiCredential } from "./piCredentialStore";
import { resolvePiOpenAICodexAccess } from "./piOpenAICodexAuth";
import {
  PiModelStreamFailure,
  type PiModelFailureCode,
  type PiRuntimeModelInput,
  type PiRuntimeModelSource,
  type PiRuntimeProviderSource,
} from "./piRuntime";
// Direct import on purpose: `record` is synchronous and non-throwing, and
// piRuntimeAudit does not import this module, so there is no cycle.
import {
  record as recordPiRuntimeAudit,
  type PiRuntimeAuditContext,
} from "./piRuntimeAudit";

type Admission = {
  fetch?: typeof fetch;
  authorizeLocalNetwork?: (endpoint: string) => Promise<boolean>;
  /**
   * C18 structural audit. The provider is the fact owner for transport
   * boundaries only; turn and model invocation boundaries belong to
   * {@link PiRuntime} and are never re-reported here. The context is the owner
   * identity this admission already belongs to — no callback is forwarded.
   * A fact carries the HTTP status and a duration, never a request or response
   * body, header, credential, URL or exception. The normalized failure code is
   * deliberately absent: it belongs to the canonical failure record and is not
   * repeated here.
   */
  audit?: PiRuntimeAuditContext;
};

// Audit is evidence, never an owner outcome: a missing or failing audit module
// can not fail a provider call.
function auditRecord(
  context: PiRuntimeAuditContext | undefined,
  fact: {
    operation: "provider.transport";
    attributes: Record<string, number | string>;
  },
) {
  if (!context) return;
  try {
    recordPiRuntimeAudit({ ...fact, origin: "provider", ...context });
  } catch {
    // Deliberately ignored; diagnostics never change provider behavior.
  }
}

const streams: Record<string, ProviderStreams["streamSimple"]> = {
  "openai-responses": streamOpenAIResponses,
  "openai-completions": streamOpenAICompletions,
  "anthropic-messages": streamAnthropicMessages,
  "google-generative-ai": streamGoogle,
};

/**
 * The compat fields this project understands for each executed API. Remote
 * declarations are copied key by key: an unknown key never reaches the SDK, and
 * compat only reshapes the request construction it already describes — it never
 * adds an executor, an authentication, a header or a routing privilege.
 */
const COMPAT_KEYS: Record<string, readonly string[]> = {
  "openai-completions": [
    "supportsStore",
    "supportsDeveloperRole",
    "supportsReasoningEffort",
    "supportsUsageInStreaming",
    "supportsFinishReason",
    "maxTokensField",
    "requiresToolResultName",
    "requiresAssistantAfterToolResult",
    "requiresThinkingAsText",
    "requiresReasoningContentOnAssistantMessages",
    "thinkingFormat",
    "openRouterRouting",
    "vercelGatewayRouting",
    "chatTemplateKwargs",
    "chatTemplateArgs",
    "zaiToolStream",
    "supportsThinkingTokenBudget",
    "thinkingTokenBudgetField",
    "supportsStrictMode",
    "supportsOpenAIGrammarTools",
    "supportsMidConvoSystemMessages",
    "supportsMidConvoToolAdditions",
    "cacheControlFormat",
    "sendSessionAffinityHeaders",
    "sessionAffinityFormat",
    "supportsLongCacheRetention",
    "vllmPriority",
  ],
  "openai-responses": [
    "supportsDeveloperRole",
    "supportsMidConvoSystemMessages",
    "sessionAffinityFormat",
    "supportsLongCacheRetention",
    "supportsStrictMode",
    "supportsOpenAIGrammarTools",
    "supportsAdditionalTools",
    "supportsToolSearch",
    "supportsExplicitPromptCacheMode",
    "supportsMaxOutputTokens",
  ],
  "anthropic-messages": [
    "supportsEagerToolInputStreaming",
    "supportsLongCacheRetention",
    "sendSessionAffinityHeaders",
    "sessionAffinityFormat",
    "supportsCacheControlOnTools",
    "supportsTemperature",
    "forceAdaptiveThinking",
    "allowEmptySignature",
    "supportsStrictTools",
    "supportsMidConvoEffort",
    "supportsMidConvoSystemMessages",
    "supportsMidConvoToolChanges",
    "supportsStrictMode",
  ],
  "bedrock-converse-stream": ["supportsStrictMode"],
  "mistral-conversations": ["supportsMidConvoSystemMessages"],
};

function understoodCompat(
  api: string,
  compat: PiModelCompat | undefined,
): Record<string, unknown> | undefined {
  const keys =
    COMPAT_KEYS[api === "openai-codex-responses" ? "openai-responses" : api];
  if (!keys || !compat) return undefined;
  const result: Record<string, unknown> = {};
  for (const key of keys)
    if (Object.prototype.hasOwnProperty.call(compat, key))
      result[key] = compat[key];
  return Object.keys(result).length ? result : undefined;
}

/**
 * The frozen metadata a snapshot carries. A snapshot frozen before the metadata
 * field kept the same facts on `policy`, so one helper reads both shapes and
 * every consumer in this module agrees on which snapshot it is looking at.
 */
function selectMetadata(selection: PiModelSelectionSnapshot): PiModelMetadata {
  return selection.metadata ?? selection.policy;
}

function modelOf(selection: PiModelSelectionSnapshot): Model<string> {
  const metadata = selectMetadata(selection);
  const cost = metadata?.cost;
  const compat = understoodCompat(selection.api, metadata?.compat);
  // The SDK requires numeric rates. A selection without a declared price gets
  // the typed zeros here, which say nothing about the price: the canonical
  // layer reads the same frozen metadata and records the estimate as unknown
  // rather than free.
  const model = {
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
    cost: {
      input: cost?.input ?? 0,
      output: cost?.output ?? 0,
      cacheRead: cost?.cacheRead ?? 0,
      cacheWrite: cost?.cacheWrite ?? 0,
      ...(cost?.tiers
        ? { tiers: cost.tiers.map((tier) => ({ ...tier })) }
        : {}),
    },
    ...(metadata?.thinkingLevelMap
      ? { thinkingLevelMap: { ...metadata.thinkingLevelMap } }
      : {}),
    ...(metadata?.promptCache
      ? { promptCache: { ...metadata.promptCache } }
      : {}),
    ...(metadata?.inputLimits ? { inputLimits: metadata.inputLimits } : {}),
    ...(metadata?.samplingParams
      ? { samplingParams: { ...metadata.samplingParams } }
      : {}),
    ...(compat ? { compat } : {}),
  };
  // The SDK types `compat` as a conditional that `Model<string>` resolves to
  // `never`; the runtime dispatches on the actual api string above.
  return model as unknown as Model<string>;
}

/** Images actually carried by the prepared request, per message and in total. */
function requestImages(context: Context): {
  perMessage: number;
  total: number;
} {
  let perMessage = 0;
  let total = 0;
  for (const message of context.messages) {
    if (!Array.isArray(message.content)) continue;
    const count = message.content.filter(
      (part) => part.type === "image",
    ).length;
    if (count > perMessage) perMessage = count;
    total += count;
  }
  return { perMessage, total };
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

/**
 * Whether a provider message carries real token evidence. The SDK reports a
 * zero-filled usage when a response carries no usage at all, so an all-zero
 * message cannot be told apart from a genuinely empty one and stays unknown
 * rather than becoming a recorded zero. Any non-zero token category is a
 * number the provider reported. The stream is never re-parsed for this; the
 * observed message is the only evidence read.
 */
function usageKnown(message: AssistantMessage): boolean {
  const usage = message?.usage;
  if (!usage) return false;
  return [
    usage.input,
    usage.output,
    usage.cacheRead,
    usage.cacheWrite,
    usage.totalTokens,
  ].some((value) => Number.isFinite(value) && value > 0);
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
  observed?: AssistantMessage,
): AssistantMessage {
  return {
    role: "assistant",
    content: [],
    api: model.api,
    provider: model.provider,
    model: model.id,
    usage: observed?.usage || emptyUsage(),
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
  // A level the frozen thinking map marks unsupported is refused here instead of
  // being clamped silently by the SDK.
  if (
    selectMetadata(selection).thinkingLevelMap?.[selection.reasoning] === null
  )
    throw new PiModelStreamFailure("unsupported_model");
  const images = selectMetadata(selection).inputLimits?.images;
  if (images) {
    const carried = requestImages(context);
    if (
      (images.maxPerRequest !== undefined &&
        carried.total > images.maxPerRequest) ||
      (images.maxPerMessage !== undefined &&
        carried.perMessage > images.maxPerMessage)
    )
      throw new PiModelStreamFailure("unsupported_model");
  }
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
    const startedAt = Date.now();
    // Only status, duration and the normalized code ever leave this boundary.
    const finish = (status?: number) =>
      auditRecord(admission.audit, {
        operation: "provider.transport",
        attributes: {
          ...(status !== undefined ? { status } : {}),
          duration: Date.now() - startedAt,
        },
      });
    try {
      const clean = new Request(request, init);
      // The serialized bound belongs to the request that would actually leave
      // the plugin, so it is checked here rather than trusted from the catalog.
      // A body this seam cannot measure is a bound it cannot honour, and is
      // refused rather than let past the declared limit.
      const maxRequestBytes =
        selectMetadata(selection).inputLimits?.maxRequestBytes;
      if (
        maxRequestBytes !== undefined &&
        (typeof init?.body !== "string" ||
          new TextEncoder().encode(init.body).length > maxRequestBytes)
      ) {
        // No transport happened, so there is no transport fact to record.
        failureCode = "unsupported_model";
        throw new PiModelStreamFailure("unsupported_model");
      }
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
      finish(response.status);
      return response;
    } catch (error) {
      if (error instanceof PiModelStreamFailure) throw error;
      failureCode = signal.aborted ? "aborted" : "provider_network_error";
      finish(undefined);
      throw new PiModelStreamFailure(failureCode);
    }
  };
  const transcript = normalizeContext(context);
  // Long prompt cache retention is a declared fact of the frozen selection;
  // an unknown cache lifetime keeps the default retention.
  const cacheRetention = selectMetadata(selection).promptCache?.long
    ? "long"
    : "short";
  const events =
    selection.api === "openai-codex-responses"
      ? streamCodex(model as Model<"openai-codex-responses">, transcript, {
          apiKey,
          signal,
          cacheRetention,
          transport: "sse",
          reasoningEffort:
            selection.reasoning === "off" ? "none" : selection.reasoning,
          fetch: requestFetch,
        })
      : stream(model, transcript, {
          apiKey,
          signal,
          cacheRetention,
          reasoning:
            selection.reasoning === "off" ? undefined : selection.reasoning,
          ...(selection.api === "google-generative-ai"
            ? {}
            : { fetch: requestFetch }),
        });
  return { events, failure: () => failureCode };
}

/**
 * Structured provider source for the Agent turn path. Failures are normalized so
 * no raw provider detail reaches the runtime or its events. `pricing` is the
 * applicable frozen price the selection carries: `null` when the selection has
 * none, so a consumer records an unknown estimate instead of the typed zero
 * rates the SDK model needs.
 */
export function createPiProviderSource(
  selection: PiModelSelectionSnapshot,
  admission: Admission = {},
): {
  model: Model<string>;
  pricing: PiModelCost | null;
  usageKnown: (message: AssistantMessage) => boolean;
  source: PiRuntimeProviderSource;
} {
  const model = modelOf(selection);
  return {
    model,
    pricing: selectMetadata(selection).cost ?? null,
    usageKnown,
    source: async ({ context, signal }) => {
      const handle = await openPiProviderStream(
        selection,
        admission,
        context,
        signal,
      );
      const output = createAssistantMessageEventStream();
      // A failure still reports whatever the provider had already reported:
      // a synthetic zero usage would be an invented token fact.
      let observed: AssistantMessage | undefined;
      const fail = (reason: "error" | "aborted") => ({
        ...failureMessage(model, reason, observed),
        errorMessage:
          reason === "aborted"
            ? "aborted"
            : handle.failure() || "provider_stream_error",
      });
      void (async () => {
        let settled = false;
        try {
          for await (const event of handle.events) {
            observed =
              event.type === "done"
                ? event.message
                : event.type === "error"
                  ? event.error
                  : event.partial;
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
