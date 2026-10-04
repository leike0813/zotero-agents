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
import { clampMaxTokensToContext } from "@earendil-works/pi-ai/api/simple-options";
import { streamSimple as streamOpenAICompletions } from "@earendil-works/pi-ai/api/openai-completions";
import { streamSimple as streamAnthropicMessages } from "@earendil-works/pi-ai/api/anthropic-messages";
import { streamSimple as streamGoogle } from "@earendil-works/pi-ai/api/google-generative-ai";
import type {
  PiAuthVariant,
  PiExecutionApi,
  PiModelCompat,
  PiModelCost,
  PiModelMetadata,
  PiModelSelectionSnapshot,
} from "../shared/piProviderContract";
import {
  PI_API_AUTH_VARIANTS,
  PI_PROVIDER_EXECUTION_APIS,
} from "../shared/piProviderContract";
import {
  getPiCredentialIdentityRevision,
  readPiCredential,
} from "./piCredentialStore";
import {
  assertPiChatGPTInferenceAllowed,
  pausePiChatGPTInference,
  resolvePiChatGPTAccess,
} from "./piChatGPTAuth";
import {
  streamPiChatGPTResponses,
  type PiChatGPTCompletedResponse,
} from "./piChatGPTProvider";
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
  chatGPTAuth?: {
    resolvePiChatGPTAccess?: typeof resolvePiChatGPTAccess;
    assertPiChatGPTInferenceAllowed?: typeof assertPiChatGPTInferenceAllowed;
    pausePiChatGPTInference?: typeof pausePiChatGPTInference;
  };
  /** Opaque permit from the auth owner; it is consumed at the dispatch gate. */
  chatGPTResumePermit?: object;
  onChatGPTCompletedResponse?: (response: PiChatGPTCompletedResponse) => void;
  forceChatGPTWebSearch?: boolean;
  onChatGPTProviderStreamEvent?: (event: unknown) => void;
  chatGPTRetryDelay?: (retry: number, signal: AbortSignal) => Promise<void>;
  disableChatGPTRetries?: boolean;
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

export type PiProviderConnectionSupport =
  | {
      supported: true;
      api: PiExecutionApi;
      /** The authentication variants that can run against this API today. */
      authVariants: readonly PiAuthVariant[];
      /** True only for the official OpenAI Responses subscription target. */
      subscription: boolean;
    }
  | { supported: false; reason: string };

const CHATGPT_BASE_URL = "https://api.openai.com/v1";

/**
 * Project whether this project can execute and authenticate a connection target.
 *
 * A lightweight answer for configuration UI and discovery: it reads no
 * directory, no credential and no document, and it decides from the two facts
 * this owner holds — the provider's own execution API and the API's supported
 * authentication. The existence of an SDK stream is never on its own enough: a
 * provider with no entry here is refused, which is what keeps a hosted
 * AWS or Azure endpoint, whose calls need provider specific authentication
 * headers this build cannot add, a reported reason rather than a route to the
 * plain public API.
 *
 * A host projects one row at a time by passing that row's api and baseUrl, so a
 * provider that publishes rows this build cannot execute is visible as a reason
 * on the row instead of a silently absent provider.
 */
export function getPiProviderConnectionSupport(input: {
  provider: string;
  /** Accepted unvalidated: a directory row declares any string here. */
  api?: string;
  baseUrl?: string;
  authVariant?: PiAuthVariant;
}): PiProviderConnectionSupport {
  const provider = input.provider.trim();
  const declared =
    (input.api || "").trim() || PI_PROVIDER_EXECUTION_APIS[provider];
  const api = Object.prototype.hasOwnProperty.call(
    PI_API_AUTH_VARIANTS,
    declared,
  )
    ? (declared as PiExecutionApi)
    : undefined;
  if (!api)
    return {
      supported: false,
      reason: declared
        ? `No execution adapter for API "${declared}"`
        : `No execution adapter for provider "${provider}"`,
    };
  if (!streams[api])
    return {
      supported: false,
      reason: `No execution adapter for API "${api}"`,
    };
  const authVariants = PI_API_AUTH_VARIANTS[api] || [];
  if (!authVariants.length)
    return {
      supported: false,
      reason: `No supported authentication for "${api}"`,
    };
  const baseUrl = (input.baseUrl || "").trim();
  // A subscription target is the official OpenAI Responses endpoint. An
  // api-key connection may legitimately name no baseUrl at all and use the
  // public default, so an absent baseUrl is only a subscription when the
  // authentication says it is.
  const subscription = input.authVariant === "chatgpt";
  if (subscription && provider !== "openai")
    return {
      supported: false,
      reason:
        "Subscription authentication requires the official OpenAI provider",
    };
  if (
    input.authVariant !== undefined &&
    !authVariants.includes(input.authVariant)
  )
    return {
      supported: false,
      reason: `Authentication "${input.authVariant}" cannot run against "${api}"`,
    };
  // A subscription connection is always pinned to the official target; an
  // absent baseUrl is accepted as that default rather than as a custom host.
  if (subscription && baseUrl !== "" && baseUrl !== CHATGPT_BASE_URL)
    return {
      supported: false,
      reason: "Subscription authentication requires the official OpenAI target",
    };
  return { supported: true, api, authVariants, subscription };
}

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
  const keys = COMPAT_KEYS[api];
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
    content: observed?.content ?? [],
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
  usageKnown?: (message: AssistantMessage) => boolean;
  usageCompleteness?: (
    message: AssistantMessage,
  ) => "complete" | "partial" | "unknown";
  usageMeasurement?: (
    message: AssistantMessage,
  ) => import("../shared/piUsageContract").PiUsageMeasurement | undefined;
};

async function subscriptionQuotaFailure(response: Response): Promise<boolean> {
  const declared = Number(response.headers.get("content-length") || 0);
  if (declared > 16_384) return false;
  try {
    const text = await response.clone().text();
    if (new TextEncoder().encode(text).length > 16_384) return false;
    const body = JSON.parse(text) as {
      error?: { code?: unknown };
      code?: unknown;
    };
    return (
      body.error?.code === "subscription_sharing_usage_limit_exceeded" ||
      body.code === "subscription_sharing_usage_limit_exceeded"
    );
  } catch {
    return false;
  }
}

function chatGPTAuthFailureCode(error: unknown): PiModelFailureCode {
  if (typeof error !== "object" || !error || !("code" in error))
    return "provider_chatgpt_auth_failed";
  const code = (error as { code?: unknown }).code;
  if (code === "canceled") return "aborted";
  if (code === "credential_missing") return "credential_missing";
  if (code === "quota_paused" || code === "probe_active")
    return "provider_plan_quota_exceeded";
  if (
    code === "permission_missing" ||
    code === "welcome_required" ||
    code === "reauthorization_required" ||
    code === "identity_mismatch"
  )
    return "provider_auth_failed";
  if (code === "auth_unavailable") return "provider_unavailable";
  return "provider_chatgpt_auth_failed";
}

function restorePiApiKeyResponsesPayload(
  value: unknown,
  selection: PiModelSelectionSnapshot,
  cacheRetention: "short" | "long",
  contextBoundedMaxTokens: number,
): unknown {
  if (!value || typeof value !== "object" || Array.isArray(value)) return value;
  const payload = { ...(value as Record<string, unknown>) };
  const compat = selectMetadata(selection).compat;
  if (
    compat?.supportsMaxOutputTokens !== false &&
    selection.policy.maxTokens > 0 &&
    payload.max_output_tokens === undefined
  )
    payload.max_output_tokens = Math.max(contextBoundedMaxTokens, 16);
  const temperature = selectMetadata(selection).samplingParams?.temperature;
  if (temperature !== undefined && payload.temperature === undefined)
    payload.temperature = temperature;
  if (
    cacheRetention === "long" &&
    compat?.supportsLongCacheRetention !== false &&
    !compat?.supportsExplicitPromptCacheMode &&
    payload.prompt_cache_retention === undefined
  )
    payload.prompt_cache_retention = "24h";
  if (
    compat?.supportsExplicitPromptCacheMode &&
    payload.prompt_cache_options === undefined
  ) {
    if (cacheRetention === "long" && compat.supportsLongCacheRetention)
      payload.prompt_cache_options = { ttl: "30m" };
    else if (cacheRetention === "short")
      payload.prompt_cache_options = { mode: "explicit" };
  }
  return payload;
}

async function openPiProviderStream(
  selection: PiModelSelectionSnapshot,
  admission: Admission,
  context: Context,
  signal: AbortSignal,
  callbacks: {
    onProviderTerminal?: (
      terminal: import("./piRuntime").PiProviderTerminal,
    ) => void;
    onProviderRetry?: (input: {
      terminal: import("./piRuntime").PiProviderTerminal;
      usage: AssistantMessage["usage"];
      usageCompleteness: "complete" | "partial" | "unknown";
      usageMeasurement?: import("../shared/piUsageContract").PiUsageMeasurement;
    }) => Promise<boolean>;
  } = {},
): Promise<ProviderStreamHandle> {
  if (signal.aborted) throw new PiModelStreamFailure("aborted");
  const stream = streams[selection.api];
  if (!stream) throw new PiModelStreamFailure("unsupported_provider");
  if (selection.api === "google-generative-ai" && admission.fetch)
    throw new PiModelStreamFailure("unsupported_provider");
  if (
    !selection.modelId ||
    !selection.baseUrl ||
    selection.policy.contextWindow < 1 ||
    selection.policy.maxTokens < 0 ||
    (selection.policy.maxTokens === 0 && selection.authVariant !== "chatgpt")
  )
    throw new PiModelStreamFailure("unsupported_model");
  if (
    selection.authVariant === "chatgpt" &&
    (selection.provider !== "openai" ||
      selection.api !== "openai-responses" ||
      selection.baseUrl !== "https://api.openai.com/v1" ||
      !selection.credentialRef)
  )
    throw new PiModelStreamFailure("unsupported_provider");
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
  let chatGPTIdentityRevision: string | undefined;
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
  } else if (selection.authVariant === "chatgpt") {
    if (!selection.credentialRef)
      throw new PiModelStreamFailure("credential_missing");
    const credential = await readPiCredential(selection.credentialRef);
    if (!credential.ok || credential.material.kind !== "chatgpt")
      throw new PiModelStreamFailure("credential_missing");
    chatGPTIdentityRevision =
      getPiCredentialIdentityRevision(
        selection.credentialRef,
        "model-provider",
      ) ?? undefined;
    if (!chatGPTIdentityRevision)
      throw new PiModelStreamFailure("credential_missing");
    try {
      apiKey = await (
        admission.chatGPTAuth?.resolvePiChatGPTAccess || resolvePiChatGPTAccess
      )(selection.credentialRef, signal, admission.fetch, {
        identityRevision: chatGPTIdentityRevision,
      });
    } catch (error) {
      throw new PiModelStreamFailure(chatGPTAuthFailureCode(error));
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
      if (selection.authVariant === "chatgpt") {
        try {
          await (
            admission.chatGPTAuth?.assertPiChatGPTInferenceAllowed ||
            assertPiChatGPTInferenceAllowed
          )(
            selection.credentialRef!,
            signal,
            admission.chatGPTResumePermit,
            chatGPTIdentityRevision!,
          );
        } catch (error) {
          failureCode = chatGPTAuthFailureCode(error);
          throw new PiModelStreamFailure(failureCode);
        }
      }
      const response = await (admission.fetch || globalThis.fetch)(clean);
      if (
        selection.authVariant === "chatgpt" &&
        response.status === 429 &&
        (await subscriptionQuotaFailure(response))
      ) {
        failureCode = "provider_plan_quota_exceeded";
        try {
          await (
            admission.chatGPTAuth?.pausePiChatGPTInference ||
            pausePiChatGPTInference
          )(selection.credentialRef!, chatGPTIdentityRevision!);
        } catch {
          // A pause persistence issue cannot expose response data or replace the provider failure.
        }
      }
      if (!response.ok && selection.authVariant !== "chatgpt")
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
  if (selection.authVariant === "chatgpt") {
    const chatGPT = streamPiChatGPTResponses(
      model as Model<"openai-responses">,
      transcript,
      {
        apiKey: apiKey!,
        signal,
        fetch: requestFetch,
        ...(selection.reasoning === "off"
          ? {}
          : { reasoning: selection.reasoning }),
        explicitOptions: Object.keys(
          selectMetadata(selection).samplingParams ?? {},
        ),
        ...(admission.chatGPTResumePermit ||
        admission.disableChatGPTRetries ||
        admission.forceChatGPTWebSearch
          ? {}
          : callbacks.onProviderRetry
            ? { onRetry: callbacks.onProviderRetry }
            : {}),
        onTerminal: callbacks.onProviderTerminal,
        onCompletedResponse: admission.onChatGPTCompletedResponse,
        forceWebSearch: admission.forceChatGPTWebSearch,
        onProviderStreamEvent: admission.onChatGPTProviderStreamEvent,
        retryDelay: admission.chatGPTRetryDelay,
      },
    );
    return {
      events: chatGPT.events,
      failure: () =>
        (failureCode as PiModelFailureCode | undefined) ||
        (chatGPT.failure() as PiModelFailureCode | undefined),
      usageKnown: chatGPT.usageKnown,
      usageCompleteness: chatGPT.usageCompleteness,
      usageMeasurement: chatGPT.usageMeasurement,
    };
  }
  const events = stream(model, transcript, {
    apiKey,
    signal,
    cacheRetention,
    onPayload:
      selection.authVariant === "api-key" &&
      selection.api === "openai-responses"
        ? (payload) =>
            restorePiApiKeyResponsesPayload(
              payload,
              selection,
              cacheRetention,
              clampMaxTokensToContext(
                model,
                transcript,
                selection.policy.maxTokens,
              ),
            )
        : undefined,
    reasoning: selection.reasoning === "off" ? undefined : selection.reasoning,
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
  usageCompleteness: (
    message: AssistantMessage,
  ) => "complete" | "partial" | "unknown";
  usageMeasurement: (
    message: AssistantMessage,
  ) => import("../shared/piUsageContract").PiUsageMeasurement | undefined;
  source: PiRuntimeProviderSource;
} {
  const model = modelOf(selection);
  const usageFacts = new WeakMap<
    object,
    {
      known: boolean;
      completeness: "complete" | "partial" | "unknown";
      measurement?: import("../shared/piUsageContract").PiUsageMeasurement;
    }
  >();
  const source: PiRuntimeProviderSource = async (request) => {
    const { context, signal } = request;
    const handle = await openPiProviderStream(
      selection,
      admission,
      context,
      signal,
      {
        onProviderTerminal: request.onProviderTerminal,
        onProviderRetry: request.onProviderRetry,
      },
    );
    const output = createAssistantMessageEventStream();
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
          if (event.type === "done" || event.type === "error") {
            const message = event.type === "done" ? event.message : event.error;
            usageFacts.set(message.usage, {
              known: handle.usageKnown?.(message) ?? usageKnown(message),
              completeness:
                handle.usageCompleteness?.(message) ??
                (usageKnown(message) ? "complete" : "unknown"),
              measurement: handle.usageMeasurement?.(message),
            });
          }
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
  };
  source.usageKnown = (usage) => usageFacts.get(usage)?.known ?? false;
  source.usageCompleteness = (message) =>
    usageFacts.get(message.usage)?.completeness ?? "unknown";
  source.usageMeasurement = (message) =>
    usageFacts.get(message.usage)?.measurement;
  return {
    model,
    pricing:
      selection.authVariant === "chatgpt"
        ? null
        : (selectMetadata(selection).cost ?? null),
    usageKnown: (message) =>
      usageFacts.get(message.usage)?.known ?? usageKnown(message),
    usageCompleteness: (message) =>
      usageFacts.get(message.usage)?.completeness ?? "unknown",
    usageMeasurement: (message) => usageFacts.get(message.usage)?.measurement,
    source,
  };
}

/**
 * Text-delta seam retained for simple callers and per-model connection tests.
 *
 * A consumer that has to prove a completed inference — a model test, a
 * registration recovery probe — must see the actual provider terminal. A stream
 * that simply ends without one produced no validated completion, so it fails
 * with "provider_terminal_missing" instead of looking successful. There is no
 * automatic retry here: one request is one attempt.
 */
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
    let completed = false;
    try {
      for await (const event of handle.events) {
        if (input.signal.aborted) throw new PiModelStreamFailure("aborted");
        if (event.type === "done") {
          completed = true;
          break;
        }
        if (event.type === "text_delta") yield event.delta;
        else if (event.type === "error")
          throw new PiModelStreamFailure(
            handle.failure() || "provider_stream_error",
          );
      }
      if (!completed)
        throw new PiModelStreamFailure(
          handle.failure() || "provider_terminal_missing",
        );
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
