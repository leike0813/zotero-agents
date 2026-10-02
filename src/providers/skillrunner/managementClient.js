import { encodeBasicAuthHeader } from "../../backends/managementAuth";
import { runSkillRunnerConnection, } from "../../modules/skillRunner/connection/skillRunnerConnectionGovernor";
import { markSkillRunnerBackendHealthSuccess } from "../../modules/skillRunner/connection/skillRunnerBackendHealthRegistry";
import { SkillRunnerHttpError, formatSkillRunnerHttpErrorMessage, } from "./errors";
import { buildSkillRunnerHandshakeRequest, normalizeSkillRunnerHandshakeResponse, } from "../../modules/skillRunner/connection/skillRunnerHandshakeProtocol";
import { ASSISTANT_INTERACTION_FILE_MAX_BYTES, ASSISTANT_INTERACTION_TOTAL_MAX_BYTES, ASSISTANT_PENDING_INTERACTION_FILE_LIMIT, } from "../../shared/assistantInteractionContract";
import { resolveRuntimeHostCapabilities } from "../../utils/runtimeBridge";
const dynamicImport = new Function("specifier", "return import(specifier)");
const DEFAULT_MANAGEMENT_REQUEST_TIMEOUT_MS = 30000;
const DEFAULT_MANAGEMENT_PROBE_TIMEOUT_MS = 5000;
function ensureLeadingSlash(path) {
    return path.startsWith("/") ? path : `/${path}`;
}
function normalizeString(value) {
    return String(value || "").trim();
}
function normalizeTimeoutMs(value, fallback) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) {
        return fallback;
    }
    return Math.floor(parsed);
}
function isObject(value) {
    return !!value && typeof value === "object" && !Array.isArray(value);
}
async function readJsonBody(response) {
    const text = await response.text();
    if (!text.trim()) {
        return {};
    }
    try {
        return JSON.parse(text);
    }
    catch {
        return {
            raw: text,
        };
    }
}
async function releaseResponseBody(response) {
    try {
        if (response.body && typeof response.body.cancel === "function") {
            await response.body.cancel();
            return;
        }
        await response.arrayBuffer();
    }
    catch {
        // Best-effort release; callers should not fail after a successful response.
    }
}
function isUnauthorized(response) {
    return response.status === 401;
}
function formatHttpError(args) {
    return new SkillRunnerHttpError({
        message: formatSkillRunnerHttpErrorMessage({
            prefix: "SkillRunner management request failed",
            path: args.path,
            status: args.response.status,
            body: args.body,
        }),
        status: args.response.status,
        statusText: args.response.statusText,
        path: args.path,
        body: args.body,
    });
}
function parseBasicCredentials(auth) {
    if (!auth || auth.kind !== "basic") {
        return null;
    }
    const username = String(auth.username || "").trim();
    const password = String(auth.password || "").trim();
    if (!username || !password) {
        return null;
    }
    return { username, password };
}
function normalizeUrl(baseUrl, path, query) {
    const normalizedBase = String(baseUrl || "")
        .trim()
        .replace(/\/+$/, "");
    const url = `${normalizedBase}${ensureLeadingSlash(path)}`;
    if (!query || Array.from(query.keys()).length === 0) {
        return url;
    }
    return `${url}?${query.toString()}`;
}
function createAbortError() {
    const runtime = globalThis;
    if (typeof runtime.DOMException === "function") {
        return new runtime.DOMException("The operation was aborted.", "AbortError");
    }
    const error = new Error("The operation was aborted.");
    error.name = "AbortError";
    return error;
}
export function isAbortErrorLike(error) {
    return (!!error &&
        typeof error === "object" &&
        String(error.name || "").trim() === "AbortError");
}
function throwIfAborted(signal) {
    if (signal?.aborted) {
        throw createAbortError();
    }
}
function decodeBase64ToBytes(input) {
    const normalized = String(input || "").trim();
    if (!normalized) {
        return new Uint8Array();
    }
    const runtime = globalThis;
    if (typeof runtime.atob === "function") {
        const binary = runtime.atob(normalized);
        const out = new Uint8Array(binary.length);
        for (let index = 0; index < binary.length; index += 1) {
            out[index] = binary.charCodeAt(index) & 0xff;
        }
        return out;
    }
    if (runtime.Buffer && typeof runtime.Buffer.from === "function") {
        return new Uint8Array(runtime.Buffer.from(normalized, "base64"));
    }
    throw new Error("base64 decoder is unavailable in current runtime");
}
function findSseFrameBoundary(buffer) {
    const match = /\r?\n\r?\n/.exec(buffer);
    if (!match || typeof match.index !== "number") {
        return null;
    }
    return {
        index: match.index,
        length: match[0].length,
    };
}
async function streamSseResponse(args) {
    throwIfAborted(args.signal);
    const body = args.response.body;
    if (!body || typeof body.getReader !== "function") {
        throw new Error("SSE stream is unavailable in current runtime");
    }
    const runtime = globalThis;
    let textDecoderCtor = runtime.TextDecoder;
    if (typeof textDecoderCtor !== "function") {
        const util = await dynamicImport("util");
        textDecoderCtor = util.TextDecoder;
        runtime.TextDecoder = util.TextDecoder;
    }
    if (typeof textDecoderCtor !== "function") {
        throw new Error("TextDecoder is unavailable in current runtime");
    }
    const decoder = new textDecoderCtor("utf-8");
    const reader = body.getReader();
    let buffer = "";
    let aborted = false;
    let completed = false;
    const emitFrame = (rawFrame) => {
        const lines = rawFrame.split(/\r?\n/);
        let event = "message";
        const dataLines = [];
        for (const line of lines) {
            if (!line || line.startsWith(":")) {
                continue;
            }
            if (line.startsWith("event:")) {
                event = line.slice("event:".length).trim() || "message";
                continue;
            }
            if (line.startsWith("data:")) {
                dataLines.push(line.slice("data:".length).trim());
            }
        }
        if (dataLines.length === 0) {
            return;
        }
        const joined = dataLines.join("\n");
        let data = joined;
        try {
            data = JSON.parse(joined);
        }
        catch {
            data = joined;
        }
        args.onFrame({
            event,
            data,
        });
    };
    const abortListener = () => {
        aborted = true;
        if (typeof reader.cancel === "function") {
            void reader.cancel(createAbortError()).catch(() => { });
        }
    };
    args.signal?.addEventListener("abort", abortListener, { once: true });
    try {
        throwIfAborted(args.signal);
        while (true) {
            throwIfAborted(args.signal);
            let next;
            try {
                next = await reader.read();
            }
            catch (error) {
                if (aborted || isAbortErrorLike(error)) {
                    throw createAbortError();
                }
                throw error;
            }
            if (aborted) {
                throw createAbortError();
            }
            if (next.done) {
                buffer += decoder.decode(new Uint8Array());
                completed = true;
                break;
            }
            buffer += decoder.decode(next.value || new Uint8Array(), {
                stream: true,
            });
            let boundary = findSseFrameBoundary(buffer);
            while (boundary) {
                const frame = buffer.slice(0, boundary.index).trim();
                buffer = buffer.slice(boundary.index + boundary.length);
                if (frame) {
                    emitFrame(frame);
                }
                boundary = findSseFrameBoundary(buffer);
            }
        }
        throwIfAborted(args.signal);
        const tail = buffer.trim();
        if (tail) {
            emitFrame(tail);
        }
    }
    finally {
        args.signal?.removeEventListener("abort", abortListener);
        if (!completed && typeof reader.cancel === "function") {
            await reader.cancel(createAbortError()).catch(() => { });
        }
        if (typeof reader.releaseLock === "function") {
            try {
                reader.releaseLock();
            }
            catch {
                // Some runtimes throw if the stream is already released.
            }
        }
    }
}
export class SkillRunnerManagementClient {
    baseUrl;
    backendId;
    fetchImpl;
    requestTimeoutMs;
    getManagementAuth;
    saveManagementAuth;
    promptBasicAuth;
    constructor(args) {
        this.baseUrl = String(args.baseUrl || "")
            .trim()
            .replace(/\/+$/, "");
        if (!this.baseUrl) {
            throw new Error("baseUrl is required");
        }
        this.backendId = normalizeString(args.backendId) || this.baseUrl;
        this.requestTimeoutMs = normalizeTimeoutMs(args.requestTimeoutMs, DEFAULT_MANAGEMENT_REQUEST_TIMEOUT_MS);
        const runtimeFetch = resolveRuntimeHostCapabilities().fetch;
        this.fetchImpl = args.fetchImpl || runtimeFetch;
        if (typeof this.fetchImpl !== "function") {
            throw new Error("fetch() is unavailable in current runtime");
        }
        this.getManagementAuth = args.getManagementAuth;
        this.saveManagementAuth = args.saveManagementAuth;
        this.promptBasicAuth = args.promptBasicAuth;
    }
    buildHeaders(args) {
        const headers = {
            ...(args?.extra || {}),
        };
        const auth = args?.auth;
        if (auth) {
            headers.authorization = encodeBasicAuthHeader({
                username: auth.username,
                password: auth.password,
            });
        }
        return headers;
    }
    resolveStoredCredentials() {
        const auth = this.getManagementAuth?.();
        return parseBasicCredentials(auth);
    }
    async requestWithAuthRetry(args) {
        const url = normalizeUrl(this.baseUrl, args.path, args.query);
        const lane = args.lane || "maintenance";
        const timeoutMs = args.stream === true
            ? 0
            : normalizeTimeoutMs(args.timeoutMs, this.requestTimeoutMs);
        return runSkillRunnerConnection({
            backendId: this.backendId,
            lane,
            requestId: normalizeString(args.requestId) || undefined,
            operation: normalizeString(args.operation) ||
                `${normalizeString(args.method) || "GET"} ${args.path}`,
            lastFocusedAt: args.lastFocusedAt,
            timeoutMs,
            stream: args.stream === true,
            signal: args.signal,
            task: async (signal) => {
                let credentials = this.resolveStoredCredentials();
                throwIfAborted(signal);
                let response = await this.fetchImpl(url, {
                    method: args.method,
                    headers: this.buildHeaders({
                        extra: args.headers,
                        auth: credentials,
                    }),
                    body: args.body,
                    signal,
                });
                if (args.allowUnauthorizedRetry !== false &&
                    isUnauthorized(response) &&
                    typeof this.promptBasicAuth === "function") {
                    const prompted = await this.promptBasicAuth({
                        reason: credentials ? "unauthorized" : "missing",
                    });
                    if (prompted && prompted.username && prompted.password) {
                        credentials = prompted;
                        this.saveManagementAuth?.({
                            kind: "basic",
                            username: prompted.username,
                            password: prompted.password,
                        });
                        throwIfAborted(signal);
                        response = await this.fetchImpl(url, {
                            method: args.method,
                            headers: this.buildHeaders({
                                extra: args.headers,
                                auth: credentials,
                            }),
                            body: args.body,
                            signal,
                        });
                    }
                }
                if (!response.ok) {
                    const body = await readJsonBody(response);
                    throw formatHttpError({
                        response,
                        body,
                        path: args.path,
                    });
                }
                markSkillRunnerBackendHealthSuccess(this.backendId);
                if (args.consumeResponse) {
                    return args.consumeResponse(response, signal);
                }
                if (args.expectJson === false) {
                    await releaseResponseBody(response);
                    return response;
                }
                return readJsonBody(response);
            },
        });
    }
    async listRuns(args) {
        const query = new URLSearchParams();
        const limit = Math.max(1, Math.min(1000, Number(args?.limit || 200)));
        query.set("limit", String(limit));
        const body = await this.requestWithAuthRetry({
            method: "GET",
            path: "/v1/management/runs",
            query,
            lane: args?.lane || "maintenance",
            timeoutMs: args?.timeoutMs,
            signal: args?.signal,
        });
        const runs = Array.isArray(body.runs)
            ? body.runs.filter(isObject)
            : [];
        return {
            runs,
        };
    }
    async probeReachability(args) {
        let lastError;
        const methods = args?.allowGetFallback === true ? ["HEAD", "GET"] : ["HEAD"];
        for (const method of methods) {
            try {
                await this.requestWithAuthRetry({
                    method,
                    path: "/v1/system/ping",
                    expectJson: false,
                    lane: args?.lane || "health",
                    timeoutMs: args?.timeoutMs || DEFAULT_MANAGEMENT_PROBE_TIMEOUT_MS,
                    signal: args?.signal,
                });
                return;
            }
            catch (error) {
                lastError = error;
            }
        }
        throw lastError || new Error("skillrunner reachability probe failed");
    }
    async handshake(args) {
        const body = await this.requestWithAuthRetry({
            method: "POST",
            path: "/v1/system/handshake",
            headers: {
                "content-type": "application/json",
            },
            body: JSON.stringify(buildSkillRunnerHandshakeRequest({
                requestedProtocols: args?.requestedProtocols,
            })),
            lane: args?.lane || "health",
            timeoutMs: args?.timeoutMs || DEFAULT_MANAGEMENT_PROBE_TIMEOUT_MS,
            signal: args?.signal,
        });
        return normalizeSkillRunnerHandshakeResponse(body);
    }
    async getRun(args) {
        const requestId = String(args.requestId || "").trim();
        if (!requestId) {
            throw new Error("requestId is required");
        }
        const body = await this.requestWithAuthRetry({
            method: "GET",
            path: `/v1/jobs/${encodeURIComponent(requestId)}`,
            lane: args.lane || "background",
            timeoutMs: args.timeoutMs,
            signal: args.signal,
            requestId,
        });
        if (!isObject(body)) {
            throw new Error("management run detail response must be object");
        }
        return body;
    }
    async listRunChatHistory(args) {
        const requestId = String(args.requestId || "").trim();
        if (!requestId) {
            throw new Error("requestId is required");
        }
        const query = new URLSearchParams();
        if (typeof args.fromSeq === "number" && Number.isFinite(args.fromSeq)) {
            query.set("from_seq", String(Math.max(0, Math.floor(args.fromSeq))));
        }
        if (typeof args.toSeq === "number" && Number.isFinite(args.toSeq)) {
            query.set("to_seq", String(Math.max(0, Math.floor(args.toSeq))));
        }
        const body = await this.requestWithAuthRetry({
            method: "GET",
            path: `/v1/jobs/${encodeURIComponent(requestId)}/chat/history`,
            query,
            lane: args.lane || "foreground-query",
            timeoutMs: args.timeoutMs,
            signal: args.signal,
            requestId,
        });
        if (!isObject(body)) {
            throw new Error("management chat history response must be object");
        }
        const events = Array.isArray(body.events)
            ? body.events.filter(isObject)
            : [];
        return {
            request_id: String(body.request_id || requestId),
            count: events.length,
            events,
            cursor_floor: Number(body.cursor_floor || 0),
            cursor_ceiling: Number(body.cursor_ceiling || 0),
            source: String(body.source || "unknown"),
        };
    }
    async listRunEventHistory(args) {
        const requestId = String(args.requestId || "").trim();
        if (!requestId) {
            throw new Error("requestId is required");
        }
        const query = new URLSearchParams();
        if (typeof args.fromSeq === "number" && Number.isFinite(args.fromSeq)) {
            query.set("from_seq", String(Math.max(0, Math.floor(args.fromSeq))));
        }
        if (typeof args.toSeq === "number" && Number.isFinite(args.toSeq)) {
            query.set("to_seq", String(Math.max(0, Math.floor(args.toSeq))));
        }
        const fromTs = String(args.fromTs || "").trim();
        if (fromTs) {
            query.set("from_ts", fromTs);
        }
        const toTs = String(args.toTs || "").trim();
        if (toTs) {
            query.set("to_ts", toTs);
        }
        const body = await this.requestWithAuthRetry({
            method: "GET",
            path: `/v1/jobs/${encodeURIComponent(requestId)}/events/history`,
            query,
            lane: args.lane || "background",
            timeoutMs: args.timeoutMs,
            signal: args.signal,
            requestId,
        });
        if (!isObject(body)) {
            throw new Error("management events history response must be object");
        }
        const events = Array.isArray(body.events)
            ? body.events.filter(isObject)
            : [];
        return {
            request_id: String(body.request_id || requestId),
            count: events.length,
            events,
            cursor_floor: Number(body.cursor_floor || 0),
            cursor_ceiling: Number(body.cursor_ceiling || 0),
            source: String(body.source || "unknown"),
        };
    }
    async getPending(args) {
        const requestId = String(args.requestId || "").trim();
        if (!requestId) {
            throw new Error("requestId is required");
        }
        const body = await this.requestWithAuthRetry({
            method: "GET",
            path: `/v1/jobs/${encodeURIComponent(requestId)}/interaction/pending`,
            lane: args.lane || "foreground-query",
            timeoutMs: args.timeoutMs,
            signal: args.signal,
            requestId,
        });
        if (!isObject(body)) {
            throw new Error("management pending response must be object");
        }
        return body;
    }
    async getAuthSession(args) {
        const requestId = String(args.requestId || "").trim();
        if (!requestId) {
            throw new Error("requestId is required");
        }
        const body = await this.requestWithAuthRetry({
            method: "GET",
            path: `/v1/jobs/${encodeURIComponent(requestId)}/auth/session`,
            lane: args.lane || "foreground-query",
            timeoutMs: args.timeoutMs,
            signal: args.signal,
            requestId,
        });
        if (!isObject(body)) {
            throw new Error("management auth session response must be object");
        }
        return body;
    }
    async submitReply(args) {
        const requestId = String(args.requestId || "").trim();
        if (!requestId) {
            throw new Error("requestId is required");
        }
        const body = await this.requestWithAuthRetry({
            method: "POST",
            path: `/v1/jobs/${encodeURIComponent(requestId)}/interaction/reply`,
            headers: {
                "content-type": "application/json",
            },
            body: JSON.stringify(args.payload || {}),
            lane: args.lane || "foreground-query",
            timeoutMs: args.timeoutMs,
            signal: args.signal,
            requestId,
        });
        if (!isObject(body)) {
            throw new Error("management reply response must be object");
        }
        return body;
    }
    async submitInteractionFiles(args) {
        const requestId = normalizeString(args.requestId);
        const interactionId = Math.floor(Number(args.interactionId || 0));
        const idempotencyKey = normalizeString(args.idempotencyKey);
        const files = Array.isArray(args.files) ? args.files : [];
        if (!requestId || interactionId <= 0 || !idempotencyKey) {
            throw new Error("requestId, interactionId, and idempotencyKey are required");
        }
        if (files.length === 0 ||
            files.length > ASSISTANT_PENDING_INTERACTION_FILE_LIMIT) {
            throw new Error("interaction file count exceeds the client limit");
        }
        let totalBytes = 0;
        for (const file of files) {
            const size = file?.bytes?.byteLength || 0;
            if (!normalizeString(file?.name) ||
                size <= 0 ||
                size > ASSISTANT_INTERACTION_FILE_MAX_BYTES) {
                throw new Error("interaction file exceeds the client per-file limit");
            }
            totalBytes += size;
        }
        if (totalBytes > ASSISTANT_INTERACTION_TOTAL_MAX_BYTES) {
            throw new Error("interaction files exceed the client total limit");
        }
        const bindings = (Array.isArray(args.metadata?.bindings) ? args.metadata.bindings : []).map((binding) => ({
            slot: normalizeString(binding.slot),
            file_index: Math.max(0, Math.floor(Number(binding.fileIndex) || 0)),
        }));
        const metadata = {
            interaction_id: interactionId,
            idempotency_key: idempotencyKey,
            ...(normalizeString(args.metadata?.message)
                ? { message: normalizeString(args.metadata.message) }
                : {}),
            bindings,
        };
        const form = new FormData();
        form.append("metadata", JSON.stringify(metadata));
        for (const file of files) {
            const bytes = file.bytes.slice();
            const blob = new Blob([bytes], {
                type: normalizeString(file.type) || "application/octet-stream",
            });
            form.append("files", blob, normalizeString(file.name));
        }
        const body = await this.requestWithAuthRetry({
            method: "POST",
            path: `/v1/jobs/${encodeURIComponent(requestId)}/interaction/reply/files`,
            body: form,
            lane: args.lane || "foreground-query",
            timeoutMs: args.timeoutMs,
            signal: args.signal,
            requestId,
        });
        if (!isObject(body)) {
            throw new Error("management interaction file reply response must be object");
        }
        return body;
    }
    async cancelRun(args) {
        const requestId = String(args.requestId || "").trim();
        if (!requestId) {
            throw new Error("requestId is required");
        }
        const body = await this.requestWithAuthRetry({
            method: "POST",
            path: `/v1/jobs/${encodeURIComponent(requestId)}/cancel`,
            headers: {
                "content-type": "application/json",
            },
            body: "{}",
            lane: args.lane || "foreground-query",
            timeoutMs: args.timeoutMs,
            signal: args.signal,
            requestId,
        });
        if (!isObject(body)) {
            throw new Error("management cancel response must be object");
        }
        return body;
    }
    async submitAuthImport(args) {
        const requestId = String(args.requestId || "").trim();
        if (!requestId) {
            throw new Error("requestId is required");
        }
        const files = Array.isArray(args.files) ? args.files : [];
        if (files.length === 0) {
            throw new Error("files are required");
        }
        const form = new FormData();
        const providerId = String(args.providerId || "")
            .trim()
            .toLowerCase();
        if (providerId) {
            form.append("provider_id", providerId);
        }
        for (const file of files) {
            const name = String(file?.name || "").trim();
            const contentBase64 = String(file?.content_base64 || "").trim();
            if (!name || !contentBase64) {
                continue;
            }
            const bytes = decodeBase64ToBytes(contentBase64);
            const blob = new Blob([bytes], {
                type: "application/octet-stream",
            });
            form.append("files", blob, name);
        }
        const body = await this.requestWithAuthRetry({
            method: "POST",
            path: `/v1/jobs/${encodeURIComponent(requestId)}/interaction/auth/import`,
            body: form,
            lane: args.lane || "foreground-query",
            timeoutMs: args.timeoutMs,
            signal: args.signal,
            requestId,
        });
        if (!isObject(body)) {
            throw new Error("auth import response must be object");
        }
        return body;
    }
    async streamRunChat(args) {
        const requestId = String(args.requestId || "").trim();
        if (!requestId) {
            throw new Error("requestId is required");
        }
        const query = new URLSearchParams();
        const cursor = Math.max(0, Math.floor(Number(args.cursor || 0)));
        query.set("cursor", String(cursor));
        await this.requestWithAuthRetry({
            method: "GET",
            path: `/v1/jobs/${encodeURIComponent(requestId)}/chat`,
            query,
            headers: {
                accept: "text/event-stream",
            },
            expectJson: false,
            signal: args.signal,
            lane: "foreground-stream",
            stream: true,
            lastFocusedAt: args.lastFocusedAt,
            requestId,
            consumeResponse: (response, signal) => streamSseResponse({
                response,
                onFrame: args.onFrame,
                signal,
            }),
        });
    }
    async streamRunEvents(args) {
        const requestId = String(args.requestId || "").trim();
        if (!requestId) {
            throw new Error("requestId is required");
        }
        const query = new URLSearchParams();
        const cursor = Math.max(0, Math.floor(Number(args.cursor || 0)));
        query.set("cursor", String(cursor));
        await this.requestWithAuthRetry({
            method: "GET",
            path: `/v1/jobs/${encodeURIComponent(requestId)}/events`,
            query,
            headers: {
                accept: "text/event-stream",
            },
            expectJson: false,
            signal: args.signal,
            lane: "background",
            stream: true,
            requestId,
            consumeResponse: (response, signal) => streamSseResponse({
                response,
                onFrame: args.onFrame,
                signal,
            }),
        });
    }
}
