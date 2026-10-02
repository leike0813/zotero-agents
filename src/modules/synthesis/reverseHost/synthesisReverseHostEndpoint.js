import { SYNTHESIS_REVERSE_HOST_LIMITS, SynthesisClientError, synthesisReverseHostResponseBodyLimit, toSynthesisJsonValue, } from "../../../../packages/synthesis-contracts/src";
import { rebuildSynthesisSidecarTraceContext } from "../../../../packages/synthesis-contracts/src/sidecarObservability";
import { beginHostHttpRequestRead, } from "../../hostBridge/server/hostHttpRequestReader";
import { createSynthesisReverseHostBroker, } from "./synthesisReverseHostBroker";
import { beginRuntimeMemoryResponseTransfer, prepareJsonHttpResponse, } from "../../hostBridge/server/runtimeHttpResponse";
import { createSynthesisSidecarTraceContext, recordSynthesisSidecarTraceEvent, } from "../sidecar/synthesisSidecarTrace";
export const SYNTHESIS_REVERSE_HOST_PATH = "/synthesis/v1/host-call";
function response(status, body) {
    return { status, body };
}
export async function handleSynthesisReverseHostHttpRequest(request, broker) {
    if (request.method !== "POST" ||
        request.path !== SYNTHESIS_REVERSE_HOST_PATH) {
        return response(404, {
            ok: false,
            error: { code: "not_found" },
        });
    }
    const authorization = String(request.headers.authorization || "").trim();
    const prefix = "Bearer ";
    const authorizationToken = authorization.startsWith(prefix)
        ? authorization.slice(prefix.length).trim()
        : "";
    try {
        return response(200, {
            ok: true,
            result: toSynthesisJsonValue(await broker.dispatch({
                authorizationToken,
                call: request.body,
            }), "synthesisReverseHostHttpResult"),
        });
    }
    catch (error) {
        if (error instanceof SynthesisClientError) {
            const status = error.code === "invalid_request"
                ? 400
                : error.code === "timeout"
                    ? 408
                    : error.code === "conflict"
                        ? 409
                        : 503;
            return response(status, {
                ok: false,
                error: {
                    code: error.code,
                    details: error.details || {},
                },
            });
        }
        return response(500, {
            ok: false,
            error: { code: "internal" },
        });
    }
}
function findHeaderEnd(bytes) {
    for (let index = 3; index < bytes.length; index += 1) {
        if (bytes[index - 3] === 13 &&
            bytes[index - 2] === 10 &&
            bytes[index - 1] === 13 &&
            bytes[index] === 10) {
            return index + 1;
        }
    }
    return -1;
}
function decodeLatin1(bytes) {
    let text = "";
    for (const byte of bytes) {
        text += String.fromCharCode(byte);
    }
    return text;
}
function parseHttpRequest(bytes) {
    const headerEnd = findHeaderEnd(bytes);
    if (headerEnd < 0) {
        throw new Error("reverse_host_http_framing_invalid");
    }
    const lines = decodeLatin1(bytes.subarray(0, headerEnd - 4)).split("\r\n");
    const [method, path, version, ...extra] = String(lines.shift() || "").split(" ");
    if (extra.length || !method || !path || version !== "HTTP/1.1") {
        throw new Error("reverse_host_http_request_invalid");
    }
    const headers = {};
    for (const line of lines) {
        const separator = line.indexOf(":");
        if (separator <= 0) {
            throw new Error("reverse_host_http_header_invalid");
        }
        const name = line.slice(0, separator).trim().toLowerCase();
        if (!name || name in headers) {
            throw new Error("reverse_host_http_header_invalid");
        }
        headers[name] = line.slice(separator + 1).trim();
    }
    const bodyText = new TextDecoder("utf-8", {
        fatal: true,
    }).decode(bytes.subarray(headerEnd));
    return {
        method,
        path,
        headers,
        body: bodyText ? JSON.parse(bodyText) : {},
    };
}
function encodeHttpResponse(args) {
    const reason = args.status === 200
        ? "OK"
        : args.status === 400
            ? "Bad Request"
            : args.status === 408
                ? "Request Timeout"
                : args.status === 409
                    ? "Conflict"
                    : args.status === 404
                        ? "Not Found"
                        : args.status === 503
                            ? "Service Unavailable"
                            : "Internal Server Error";
    return prepareJsonHttpResponse({
        status: args.status,
        reason,
        body: args.body,
    });
}
function createLoopbackServerSocket() {
    const runtime = globalThis;
    const classes = runtime.Components?.classes || runtime.Cc;
    const interfaces = runtime.Components?.interfaces || runtime.Ci;
    const factory = classes?.["@mozilla.org/network/server-socket;1"];
    if (!factory?.createInstance || !interfaces?.nsIServerSocket) {
        throw new Error("synthesis_reverse_host_socket_unavailable");
    }
    const socket = factory.createInstance(interfaces.nsIServerSocket);
    socket.init(0, true, -1);
    return socket;
}
export function createSynthesisReverseHostEndpoint(options) {
    let serviceInstanceId = null;
    let server;
    let active = false;
    const reads = new Set();
    const transports = new Set();
    const broker = createSynthesisReverseHostBroker({
        profileId: options.profileId,
        serviceInstanceId: () => serviceInstanceId,
        authorizationToken: options.authorizationToken,
        now: options.now,
        isHostConnected: options.isHostConnected,
        authorizeCapability: options.authorizeCapability,
        allowUnboundServiceInstance: options.allowUnboundServiceInstance === true,
        handlers: options.handlers,
        recordTraceEvent: options.recordTraceEvent,
    });
    async function handleTransport(transport) {
        transports.add(transport);
        const startedAt = options.now();
        const input = transport.openInputStream(0, 0, 0);
        const output = transport.openOutputStream(0, 0, 0);
        let responseStarted = false;
        let responseCompleted = false;
        let capability;
        let trace;
        const record = (event) => {
            const retained = recordSynthesisSidecarTraceEvent(event);
            if (retained)
                options.recordTraceEvent?.(retained);
        };
        const read = beginHostHttpRequestRead(input, {
            limits: {
                maxHeaderBytes: SYNTHESIS_REVERSE_HOST_LIMITS.requestHeaderBytes,
                maxBodyBytes: SYNTHESIS_REVERSE_HOST_LIMITS.requestBodyBytes,
                idleTimeoutMs: SYNTHESIS_REVERSE_HOST_LIMITS.idleTimeoutMs,
                totalTimeoutMs: SYNTHESIS_REVERSE_HOST_LIMITS.deadlineMs,
            },
        });
        reads.add(read);
        try {
            const readResult = await read.completion;
            const request = parseHttpRequest(readResult.bytes);
            if (request.body && typeof request.body === "object") {
                const call = request.body;
                capability =
                    typeof call.capability === "string" ? call.capability : undefined;
                if (call.trace !== undefined) {
                    try {
                        trace = createSynthesisSidecarTraceContext({
                            parent: rebuildSynthesisSidecarTraceContext(call.trace),
                        });
                    }
                    catch {
                        trace = undefined;
                    }
                }
            }
            record({
                context: trace,
                source: "host",
                boundary: "reverse-host",
                phase: "transport",
                outcome: "started",
                ...(capability ? { identities: { capability } } : {}),
                metrics: { requestBytes: readResult.bytes.byteLength },
            });
            const result = await handleSynthesisReverseHostHttpRequest(request, broker);
            let responseStatus = result.status;
            const responseBody = result.body && typeof result.body === "object"
                ? result.body
                : undefined;
            const responseError = responseBody?.error && typeof responseBody.error === "object"
                ? responseBody.error
                : undefined;
            const responseDetails = responseError?.details && typeof responseError.details === "object"
                ? responseError.details
                : undefined;
            let responseCode = typeof responseDetails?.reason === "string"
                ? responseDetails.reason
                : typeof responseError?.code === "string"
                    ? responseError.code
                    : undefined;
            let prepared = encodeHttpResponse({
                status: result.status,
                body: toSynthesisJsonValue(result.body),
            });
            const responseBodyLimit = synthesisReverseHostResponseBodyLimit(capability);
            const attemptedResponseBytes = prepared.bodyByteLength;
            if (attemptedResponseBytes > responseBodyLimit) {
                responseStatus = 503;
                responseCode = "reverse_host_response_too_large";
                prepared = encodeHttpResponse({
                    status: responseStatus,
                    body: {
                        ok: false,
                        error: {
                            code: "unavailable",
                            details: { reason: "reverse_host_response_too_large" },
                        },
                    },
                });
            }
            responseStarted = true;
            await beginRuntimeMemoryResponseTransfer({
                outputStream: output,
                response: prepared,
            }).completion;
            responseCompleted = true;
            record({
                context: trace,
                source: "host",
                boundary: "reverse-host",
                phase: "transport-terminal",
                outcome: responseStatus >= 400 ? "failed" : "succeeded",
                ...(responseCode ? { code: responseCode } : {}),
                ...(capability ? { identities: { capability } } : {}),
                metrics: {
                    responseBytes: prepared.bodyByteLength,
                    ...(responseCode === "reverse_host_response_too_large"
                        ? { budgetBytes: responseBodyLimit }
                        : {}),
                    durationMs: Math.max(0, options.now() - startedAt),
                },
            });
        }
        catch (error) {
            const code = error instanceof Error &&
                /^[a-z][a-z0-9_.:-]{0,127}$/.test(error.message)
                ? error.message
                : responseStarted
                    ? "reverse_host_response_transfer_failed"
                    : "reverse_host_request_invalid";
            record({
                context: trace,
                source: "host",
                boundary: "reverse-host",
                phase: responseStarted ? "response-failed" : "request-failed",
                outcome: "failed",
                ...(capability ? { identities: { capability } } : {}),
                code,
                metrics: { durationMs: Math.max(0, options.now() - startedAt) },
            });
            if (!responseStarted) {
                responseStarted = true;
                try {
                    await beginRuntimeMemoryResponseTransfer({
                        outputStream: output,
                        response: encodeHttpResponse({
                            status: 400,
                            body: {
                                ok: false,
                                error: { code: "invalid_request" },
                            },
                        }),
                    }).completion;
                    responseCompleted = true;
                }
                catch {
                    // The failure path below aborts the underlying transport.
                }
            }
        }
        finally {
            reads.delete(read);
            transports.delete(transport);
            input.close?.();
            output.close?.();
            if (!responseCompleted) {
                transport.close?.(0);
            }
        }
    }
    return {
        start() {
            if (active) {
                return {
                    host: "127.0.0.1",
                    port: Number(server.port),
                    authorizationToken: options.authorizationToken,
                };
            }
            server = (options.serverSocketFactory ?? createLoopbackServerSocket)();
            server.asyncListen({
                onSocketAccepted(_socket, transport) {
                    if (active) {
                        void handleTransport(transport);
                    }
                },
                onStopListening() { },
            });
            active = true;
            return {
                host: "127.0.0.1",
                port: Number(server.port),
                authorizationToken: options.authorizationToken,
            };
        },
        bindServiceInstance(nextServiceInstanceId) {
            if (!active ||
                (nextServiceInstanceId !== null &&
                    (!nextServiceInstanceId || nextServiceInstanceId.length > 128))) {
                throw new Error("synthesis_reverse_host_instance_invalid");
            }
            serviceInstanceId = nextServiceInstanceId;
        },
        stop() {
            active = false;
            serviceInstanceId = null;
            for (const read of reads) {
                read.abort();
            }
            reads.clear();
            for (const transport of transports) {
                transport.close?.(0);
            }
            transports.clear();
            broker.dispose();
            server?.close?.();
            server = undefined;
        },
    };
}
