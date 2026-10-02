import { SYNTHESIS_SIDECAR_CALL_PATH, SYNTHESIS_SIDECAR_LIMITS, SYNTHESIS_SIDECAR_PROTOCOL, isSynthesisSidecarComputeCapability, isSynthesisSidecarErrorCode, } from "../../../../packages/synthesis-contracts/src/sidecarSystem";
import { safeSynthesisSidecarObservationReason, } from "../../../../packages/synthesis-contracts/src/sidecarObservability";
import { createSynthesisSidecarTraceContext, recordSynthesisSidecarTraceEvent, } from "./synthesisSidecarTrace";
import { resolveNativeAbortControllerConstructor } from "../../../utils/wait";
const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();
let requestSequence = 0;
export class SynthesisSidecarRpcError extends Error {
    code;
    details;
    constructor(code, details = {}) {
        super(code);
        this.code = code;
        this.details = details;
        this.name = "SynthesisSidecarRpcError";
    }
}
function fail(code, details = {}) {
    throw new SynthesisSidecarRpcError(code, details);
}
function protocolResultFailureDetails(error) {
    const details = error && typeof error === "object" && "details" in error
        ? error.details
        : null;
    const record = details && typeof details === "object" && !Array.isArray(details)
        ? details
        : null;
    const bounded = (value, max) => typeof value === "string" && value.length <= max ? value : "";
    const location = bounded(record?.location, 4096);
    const violations = Array.isArray(record?.violations)
        ? record.violations.slice(0, 16).flatMap((violation) => {
            if (!violation || typeof violation !== "object")
                return [];
            const row = violation;
            const keyword = bounded(row.keyword, 64);
            const instancePath = bounded(row.instancePath, 4096);
            return keyword &&
                typeof row.instancePath === "string" &&
                row.instancePath.length <= 4096
                ? [{ keyword, instancePath }]
                : [];
        })
        : [];
    return {
        reason: "protocol_result_invalid",
        ...(location ? { location } : {}),
        ...(violations.length ? { violations } : {}),
    };
}
function contentLength(response) {
    const value = response.headers.get("content-length");
    if (!value || !/^(0|[1-9][0-9]*)$/.test(value)) {
        return undefined;
    }
    const parsed = Number(value);
    return Number.isSafeInteger(parsed) ? parsed : undefined;
}
async function readBoundedResponse(response, maxBytes) {
    const declaredLength = contentLength(response);
    if (declaredLength !== undefined && declaredLength > maxBytes) {
        await response.body?.cancel().catch(() => undefined);
        return fail("response_body_too_large");
    }
    if (!response.body || typeof response.body.getReader !== "function") {
        const source = await response.text();
        if (textEncoder.encode(source).byteLength > maxBytes) {
            return fail("response_body_too_large");
        }
        return source;
    }
    const reader = response.body.getReader();
    const chunks = [];
    let byteLength = 0;
    try {
        for (;;) {
            const { done, value } = await reader.read();
            if (done) {
                break;
            }
            byteLength += value.byteLength;
            if (byteLength > maxBytes) {
                await reader.cancel().catch(() => undefined);
                return fail("response_body_too_large");
            }
            chunks.push(value);
        }
    }
    finally {
        reader.releaseLock();
    }
    const bytes = new Uint8Array(byteLength);
    let offset = 0;
    for (const chunk of chunks) {
        bytes.set(chunk, offset);
        offset += chunk.byteLength;
    }
    return textDecoder.decode(bytes);
}
function composedSignal(parent, timeoutMs) {
    const AbortControllerCtor = resolveNativeAbortControllerConstructor();
    const controller = AbortControllerCtor
        ? new AbortControllerCtor()
        : undefined;
    let timedOut = false;
    let rejectBoundary = () => undefined;
    const boundary = new Promise((_resolve, reject) => {
        rejectBoundary = reject;
    });
    const abort = () => {
        controller?.abort(parent?.reason);
        rejectBoundary(new Error("sidecar_rpc_canceled"));
    };
    if (parent?.aborted) {
        abort();
    }
    else {
        parent?.addEventListener("abort", abort, { once: true });
    }
    const timeout = globalThis.setTimeout(() => {
        timedOut = true;
        controller?.abort(new Error("sidecar_rpc_timeout"));
        rejectBoundary(new Error("sidecar_rpc_timeout"));
    }, timeoutMs);
    return {
        signal: controller?.signal,
        race(task) {
            return Promise.race([task, boundary]);
        },
        timedOut: () => timedOut,
        dispose() {
            globalThis.clearTimeout(timeout);
            parent?.removeEventListener("abort", abort);
        },
    };
}
function nextRequestId(prefix) {
    requestSequence = (requestSequence + 1) % Number.MAX_SAFE_INTEGER;
    return `${prefix}:${Date.now()}:${requestSequence}`;
}
export function createSynthesisSidecarRpcClient(options) {
    const fetchImpl = options?.fetch ?? globalThis.fetch;
    const defaultDeadlineMs = options?.deadlineMs ?? 5_000;
    const requestIdPrefix = options?.requestIdPrefix ?? "rpc";
    const transportErrors = options?.transportErrors ?? {
        canceled: "worker_canceled",
        timeout: "worker_timeout",
        invalidResponse: "worker_result_invalid",
        unavailable: "worker_unavailable",
    };
    const now = options?.now ?? Date.now;
    if (typeof fetchImpl !== "function") {
        throw new Error("sidecar_rpc_fetch_unavailable");
    }
    return {
        async call(args) {
            if (args.signal?.aborted) {
                return fail(transportErrors.canceled);
            }
            const requestId = nextRequestId(requestIdPrefix);
            const startedAt = now();
            const trace = createSynthesisSidecarTraceContext({ parent: args.trace });
            const record = (event) => {
                const retained = recordSynthesisSidecarTraceEvent(event);
                if (retained)
                    options?.recordTraceEvent?.(retained);
            };
            const requestSource = JSON.stringify({
                protocol: SYNTHESIS_SIDECAR_PROTOCOL,
                requestId,
                profileId: args.connection.profileId,
                capability: args.capability,
                payload: args.payload,
                ...(trace ? { trace } : {}),
            });
            const isCompute = isSynthesisSidecarComputeCapability(args.capability);
            if (textEncoder.encode(requestSource).byteLength >
                (isCompute
                    ? SYNTHESIS_SIDECAR_LIMITS.computeRequestBodyBytes
                    : SYNTHESIS_SIDECAR_LIMITS.requestBodyBytes)) {
                record({
                    context: trace,
                    source: "host",
                    boundary: "host-rpc",
                    phase: "request-rejected",
                    outcome: "failed",
                    code: "request_body_too_large",
                    identities: { capability: args.capability },
                    metrics: {
                        requestBytes: textEncoder.encode(requestSource).byteLength,
                    },
                });
                return fail("request_body_too_large");
            }
            record({
                context: trace,
                source: "host",
                boundary: "host-rpc",
                phase: "request",
                outcome: "started",
                identities: { capability: args.capability },
                metrics: { requestBytes: textEncoder.encode(requestSource).byteLength },
            });
            const deadline = composedSignal(args.signal, args.deadlineMs ?? defaultDeadlineMs);
            try {
                const response = await deadline.race(fetchImpl(`${args.connection.baseUrl}${SYNTHESIS_SIDECAR_CALL_PATH}`, {
                    method: "POST",
                    headers: {
                        authorization: `Bearer ${args.connection.clientToken}`,
                        "content-type": "application/json",
                    },
                    body: requestSource,
                    signal: deadline.signal,
                }));
                const responseSource = await deadline.race(readBoundedResponse(response, isCompute
                    ? SYNTHESIS_SIDECAR_LIMITS.computeResponseBodyBytes
                    : SYNTHESIS_SIDECAR_LIMITS.requestBodyBytes));
                let body;
                try {
                    body = JSON.parse(responseSource);
                }
                catch {
                    return fail(transportErrors.invalidResponse);
                }
                if (!response.ok || body.ok !== true) {
                    const code = isSynthesisSidecarErrorCode(body.error?.code)
                        ? body.error.code
                        : "internal_error";
                    const details = body.error?.details &&
                        typeof body.error.details === "object" &&
                        !Array.isArray(body.error.details)
                        ? body.error.details
                        : {};
                    return fail(code, details);
                }
                if (body.requestId !== requestId ||
                    body.serviceInstanceId !== args.connection.serviceInstanceId) {
                    return fail("runtime_mismatch");
                }
                try {
                    const result = args.rebuildResult(body.data);
                    record({
                        context: trace,
                        source: "host",
                        boundary: "host-rpc",
                        phase: "terminal",
                        outcome: "succeeded",
                        identities: { capability: args.capability },
                        metrics: {
                            requestBytes: textEncoder.encode(requestSource).byteLength,
                            responseBytes: textEncoder.encode(responseSource).byteLength,
                            durationMs: Math.max(0, now() - startedAt),
                        },
                    });
                    return result;
                }
                catch (error) {
                    return fail(transportErrors.invalidResponse, protocolResultFailureDetails(error));
                }
            }
            catch (error) {
                if (error instanceof SynthesisSidecarRpcError) {
                    const reason = safeSynthesisSidecarObservationReason(error.details.reason);
                    record({
                        context: trace,
                        source: "host",
                        boundary: "host-rpc",
                        phase: "terminal",
                        outcome: "failed",
                        code: error.code,
                        identities: {
                            capability: args.capability,
                            ...(reason ? { reason } : {}),
                        },
                        metrics: { durationMs: Math.max(0, now() - startedAt) },
                    });
                    throw error;
                }
                if (args.signal?.aborted) {
                    record({
                        context: trace,
                        source: "host",
                        boundary: "host-rpc",
                        phase: "terminal",
                        outcome: "canceled",
                        code: transportErrors.canceled,
                        identities: { capability: args.capability },
                        metrics: { durationMs: Math.max(0, now() - startedAt) },
                    });
                    return fail(transportErrors.canceled);
                }
                if (deadline.timedOut()) {
                    record({
                        context: trace,
                        source: "host",
                        boundary: "host-rpc",
                        phase: "terminal",
                        outcome: "timed-out",
                        code: transportErrors.timeout,
                        identities: { capability: args.capability },
                        metrics: { durationMs: Math.max(0, now() - startedAt) },
                    });
                    return fail(transportErrors.timeout);
                }
                record({
                    context: trace,
                    source: "host",
                    boundary: "host-rpc",
                    phase: "terminal",
                    outcome: "failed",
                    code: transportErrors.unavailable,
                    identities: {
                        capability: args.capability,
                        reason: "transport_unavailable",
                    },
                    metrics: { durationMs: Math.max(0, now() - startedAt) },
                });
                return fail(transportErrors.unavailable);
            }
            finally {
                deadline.dispose();
            }
        },
    };
}
