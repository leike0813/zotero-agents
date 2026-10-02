import { createAssistantMessageEventStream } from "@earendil-works/pi-ai";
import { streamSimple as streamOpenAIResponses } from "@earendil-works/pi-ai/api/openai-responses";
import { streamSimple as streamOpenAICompletions } from "@earendil-works/pi-ai/api/openai-completions";
import { streamSimple as streamAnthropicMessages } from "@earendil-works/pi-ai/api/anthropic-messages";
import { streamSimple as streamGoogle } from "@earendil-works/pi-ai/api/google-generative-ai";
import { stream as streamCodex } from "@earendil-works/pi-ai/api/openai-codex-responses";
import { readPiCredential } from "./piCredentialStore";
import { resolvePiOpenAICodexAccess } from "./piOpenAICodexAuth";
import { PiModelStreamFailure, } from "./piRuntime";
// Direct import on purpose: `record` is synchronous and non-throwing, and
// piRuntimeAudit does not import this module, so there is no cycle.
import { record as recordPiRuntimeAudit, } from "./piRuntimeAudit";
// Audit is evidence, never an owner outcome: a missing or failing audit module
// can not fail a provider call.
function auditRecord(context, fact) {
    if (!context)
        return;
    try {
        recordPiRuntimeAudit({ ...fact, origin: "provider", ...context });
    }
    catch {
        // Deliberately ignored; diagnostics never change provider behavior.
    }
}
/** TRANSIENT DIAGNOSTIC (remove after the installed-XPI root cause is fixed).
 * Classifies a provider failure into a fixed whitelist enum. It never reads a
 * message back out: only the enum leaves this boundary, so no provider body,
 * error name or stack can reach a log or a fact.
 */
const PI_PROVIDER_FAILURE_CLASSES = [
    "console",
    "textdecoder",
    "request",
    "structuredclone",
    "abortcontroller",
    "url",
    "btoa",
    "atob",
    "crypto",
    "streamendednofinish",
];
function classifyPiProviderFailure(error) {
    const message = String(error?.message ?? error ?? "").toLowerCase();
    const patterns = [
        ["console", /console is not defined/],
        ["textdecoder", /textdecoder is not defined/],
        ["request", /request is not defined/],
        ["structuredclone", /structuredclone is not defined/],
        ["abortcontroller", /abortcontroller is not defined/],
        ["url", /url is not defined/],
        ["btoa", /btoa is not defined/],
        ["atob", /atob is not defined/],
        ["crypto", /crypto is not defined/],
        ["streamendednofinish", /stream ended without finish_reason/],
    ];
    for (const [name, pattern] of patterns) {
        if (pattern.test(message))
            return name;
    }
    return "other";
}
function reportPiProviderFailure(classification) {
    try {
        const win = Zotero.getMainWindow();
        const Constructor = win?.CustomEvent;
        if (!win || !Constructor || !win.document?.dispatchEvent)
            return;
        win.document.dispatchEvent(new Constructor("zotero-agents:pi-provider-error-classification", {
            detail: { classification },
        }));
    }
    catch {
        // Diagnostics never change provider behavior.
    }
}
const streams = {
    "openai-responses": streamOpenAIResponses,
    "openai-completions": streamOpenAICompletions,
    "anthropic-messages": streamAnthropicMessages,
    "google-generative-ai": streamGoogle,
};
function modelOf(selection) {
    return {
        id: selection.modelId,
        name: selection.modelId,
        provider: selection.provider,
        api: selection.api,
        baseUrl: selection.baseUrl,
        reasoning: selection.reasoning !== "off",
        input: selection.policy.input.filter((item) => item === "text" || item === "image"),
        contextWindow: selection.policy.contextWindow,
        maxTokens: selection.policy.maxTokens,
        cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
    };
}
function emptyUsage() {
    return {
        input: 0,
        output: 0,
        cacheRead: 0,
        cacheWrite: 0,
        totalTokens: 0,
        cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
    };
}
function contextOf(input, model) {
    return {
        systemPrompt: input.systemPrompt,
        messages: input.messages.map((message) => message.role === "user"
            ? { role: "user", content: message.text, timestamp: 0 }
            : {
                role: "assistant",
                content: [{ type: "text", text: message.text }],
                api: model.api,
                provider: model.provider,
                model: model.id,
                usage: emptyUsage(),
                stopReason: "stop",
                timestamp: 0,
            }),
    };
}
function failureMessage(model, stopReason) {
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
async function openPiProviderStream(selection, admission, context, signal) {
    if (signal.aborted)
        throw new PiModelStreamFailure("aborted");
    const stream = streams[selection.api];
    if (!stream && selection.api !== "openai-codex-responses")
        throw new PiModelStreamFailure("unsupported_provider");
    if (selection.api === "google-generative-ai" && admission.fetch)
        throw new PiModelStreamFailure("unsupported_provider");
    if (!selection.modelId ||
        !selection.baseUrl ||
        selection.policy.contextWindow < 1 ||
        selection.policy.maxTokens < 0 ||
        (selection.policy.maxTokens === 0 &&
            selection.api !== "openai-codex-responses"))
        throw new PiModelStreamFailure("unsupported_model");
    if (selection.requiresLocalNetwork &&
        !(await admission.authorizeLocalNetwork?.(selection.baseUrl)))
        throw new PiModelStreamFailure("provider_unavailable");
    let apiKey;
    if (selection.authVariant === "api-key") {
        if (!selection.credentialRef)
            throw new PiModelStreamFailure("credential_missing");
        const resolved = await readPiCredential(selection.credentialRef);
        if (!resolved.ok || resolved.material.kind !== "api-key")
            throw new PiModelStreamFailure("credential_missing");
        apiKey = resolved.material.secret;
    }
    else if (selection.authVariant === "none") {
        if (!["openai-responses", "openai-completions"].includes(selection.api))
            throw new PiModelStreamFailure("unsupported_provider");
        apiKey = "unused";
    }
    else if (selection.authVariant === "openai-codex") {
        if (selection.provider !== "openai-codex" ||
            selection.api !== "openai-codex-responses" ||
            !selection.credentialRef)
            throw new PiModelStreamFailure("unsupported_provider");
        try {
            apiKey = await resolvePiOpenAICodexAccess(selection.credentialRef, signal, admission.fetch);
        }
        catch (error) {
            const code = error instanceof Error ? error.message : "";
            throw new PiModelStreamFailure(code === "canceled"
                ? "aborted"
                : code === "credential_missing"
                    ? "credential_missing"
                    : code === "auth_unavailable"
                        ? "provider_unavailable"
                        : "provider_auth_failed");
        }
    }
    else {
        throw new PiModelStreamFailure("unsupported_provider");
    }
    const model = modelOf(selection);
    let failureCode;
    const requestFetch = async (request, init) => {
        const startedAt = Date.now();
        // Only status, duration and the normalized code ever leave this boundary.
        const finish = (status) => auditRecord(admission.audit, {
            operation: "provider.transport",
            attributes: {
                ...(status !== undefined ? { status } : {}),
                duration: Date.now() - startedAt,
            },
        });
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
            finish(response.status);
            return response;
        }
        catch {
            failureCode = signal.aborted ? "aborted" : "provider_network_error";
            finish(undefined);
            throw new PiModelStreamFailure(failureCode);
        }
    };
    const events = selection.api === "openai-codex-responses"
        ? streamCodex(model, context, {
            apiKey,
            signal,
            cacheRetention: "short",
            transport: "sse",
            reasoningEffort: selection.reasoning === "off" ? "none" : selection.reasoning,
            fetch: requestFetch,
        })
        : stream(model, context, {
            apiKey,
            signal,
            cacheRetention: "short",
            reasoning: selection.reasoning === "off" ? undefined : selection.reasoning,
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
export function createPiProviderSource(selection, admission = {}) {
    const model = modelOf(selection);
    return {
        model,
        source: async ({ context, signal }) => {
            const handle = await openPiProviderStream(selection, admission, context, signal);
            const output = createAssistantMessageEventStream();
            const fail = (reason) => ({
                ...failureMessage(model, reason),
                errorMessage: reason === "aborted"
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
                            reportPiProviderFailure(classifyPiProviderFailure(event.error));
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
                }
                catch (error) {
                    reportPiProviderFailure(classifyPiProviderFailure(error));
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
export function createPiProviderModelSource(selection, admission = {}) {
    return async function* (input) {
        const model = modelOf(selection);
        const handle = await openPiProviderStream(selection, admission, contextOf(input, model), input.signal);
        try {
            for await (const event of handle.events) {
                if (input.signal.aborted)
                    throw new PiModelStreamFailure("aborted");
                if (event.type === "text_delta")
                    yield event.delta;
                else if (event.type === "error")
                    throw new PiModelStreamFailure(handle.failure() || "provider_stream_error");
            }
        }
        catch (error) {
            if (error instanceof PiModelStreamFailure)
                throw error;
            throw new PiModelStreamFailure(input.signal.aborted
                ? "aborted"
                : handle.failure() || "provider_stream_error");
        }
    };
}
