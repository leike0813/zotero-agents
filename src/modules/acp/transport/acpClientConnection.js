import { ACP_AGENT_METHODS, ACP_CLIENT_METHODS, RequestError, isJsonRpcNotification, isJsonRpcRequest, isJsonRpcResponse, } from "../../acpProtocol";
import { isDebugModeEnabled } from "../../debugMode";
import { incrementAcpRuntimeMetric } from "../diagnostics/acpRuntimePerformanceProfiler";
export class AcpClientConnection {
    stream;
    options;
    pendingResponses = new Map();
    client;
    nextRequestId = 0;
    writeQueue = Promise.resolve();
    acceptingWrites = true;
    closePromise = null;
    closedResolved = false;
    closedResolver;
    closed;
    constructor(toClient, stream, options) {
        this.stream = stream;
        this.options = options;
        this.client = toClient(this);
        this.closed = new Promise((resolve) => {
            this.closedResolver = resolve;
        });
        void this.receiveLoop();
    }
    resolveClosed(result) {
        if (this.closedResolved) {
            return;
        }
        this.closedResolved = true;
        const reason = result.reason;
        const closeError = reason instanceof Error
            ? reason
            : new Error(reason
                ? String(reason || "ACP connection closed")
                : "ACP connection closed");
        for (const [, pending] of this.pendingResponses) {
            pending.reject(closeError);
        }
        this.pendingResponses.clear();
        this.closedResolver(result);
    }
    async receiveLoop() {
        const reader = this.stream.readable.getReader();
        let failure = null;
        try {
            while (true) {
                const { value, done } = await reader.read();
                if (done) {
                    break;
                }
                if (!value) {
                    continue;
                }
                await this.processMessage(value);
            }
        }
        catch (error) {
            failure = error;
        }
        finally {
            reader.releaseLock();
            this.resolveClosed(failure
                ? { origin: "receive-error", reason: failure }
                : { origin: "remote-eof" });
        }
    }
    async processMessage(message) {
        this.traceMessage("in", message);
        if (isJsonRpcRequest(message)) {
            const response = await this.tryHandleRequest(message);
            await this.sendMessage({
                jsonrpc: "2.0",
                id: message.id,
                ...response,
            });
            return;
        }
        if (isJsonRpcNotification(message)) {
            await this.tryHandleNotification(message);
            return;
        }
        if (isJsonRpcResponse(message)) {
            this.handleResponse(message);
        }
    }
    async tryHandleRequest(request) {
        try {
            switch (request.method) {
                case ACP_CLIENT_METHODS.session_request_permission:
                    return {
                        result: await this.client.requestPermission((request.params || {})),
                    };
                default:
                    throw RequestError.methodNotFound(request.method);
            }
        }
        catch (error) {
            return this.normalizeHandlerError(error);
        }
    }
    async tryHandleNotification(notification) {
        try {
            switch (notification.method) {
                case ACP_CLIENT_METHODS.session_update:
                    await this.client.sessionUpdate((notification.params || {}));
                    return;
                default:
                    await this.client.providerNotification?.(notification);
                    return;
            }
        }
        catch (error) {
            console.error("ACP notification handling failed:", error);
        }
    }
    normalizeHandlerError(error) {
        if (error instanceof RequestError) {
            return error.toResult();
        }
        const detail = error instanceof Error
            ? error.message
            : String(error || "unknown error").trim();
        return RequestError.internalError(detail ? { details: detail } : undefined).toResult();
    }
    handleResponse(response) {
        const pending = this.pendingResponses.get(response.id);
        if (!pending) {
            return;
        }
        this.pendingResponses.delete(response.id);
        if ("error" in response) {
            pending.reject(RequestError.fromJsonRpc(response.error));
            return;
        }
        pending.resolve(response.result);
    }
    async sendMessage(message) {
        if (!this.acceptingWrites) {
            throw new Error("ACP connection is closing");
        }
        this.writeQueue = this.writeQueue.then(async () => {
            const writer = this.stream.writable.getWriter();
            try {
                this.traceMessage("out", message);
                await writer.write(message);
            }
            finally {
                writer.releaseLock();
            }
        });
        return this.writeQueue;
    }
    close() {
        if (this.closePromise) {
            return this.closePromise;
        }
        this.acceptingWrites = false;
        this.resolveClosed({
            origin: "local",
            reason: "ACP connection closed by client",
        });
        this.closePromise = (async () => {
            await Promise.race([
                this.writeQueue.catch(() => undefined),
                new Promise((resolve) => setTimeout(resolve, 2_000)),
            ]);
            const writer = this.stream.writable.getWriter();
            try {
                if (typeof writer.close === "function") {
                    await Promise.race([
                        writer.close().catch(() => undefined),
                        new Promise((resolve) => setTimeout(resolve, 2_000)),
                    ]);
                }
            }
            finally {
                writer.releaseLock();
            }
        })();
        return this.closePromise;
    }
    traceMessage(direction, message) {
        if (__acp_runtime_performance_profiler_enabled__ &&
            (typeof __debug_mode__ === "undefined"
                ? isDebugModeEnabled()
                : __debug_mode__)) {
            incrementAcpRuntimeMetric(this.options?.performanceProfileRequestId, "jsonrpc_message", {
                updateClass: isJsonRpcRequest(message)
                    ? "request"
                    : isJsonRpcNotification(message)
                        ? "notification"
                        : isJsonRpcResponse(message)
                            ? "response"
                            : "other",
            });
        }
        const onTrace = this.options?.onTrace;
        if (!onTrace) {
            return;
        }
        try {
            if (isJsonRpcRequest(message)) {
                void onTrace({
                    direction,
                    kind: "request",
                    id: message.id,
                    method: message.method,
                });
                return;
            }
            if (isJsonRpcNotification(message)) {
                void onTrace({
                    direction,
                    kind: "notification",
                    method: message.method,
                });
                return;
            }
            if (isJsonRpcResponse(message)) {
                const error = "error" in message ? message.error : undefined;
                void onTrace({
                    direction,
                    kind: "response",
                    id: message.id,
                    errorCode: error?.code,
                    errorMessage: error?.message,
                });
            }
        }
        catch {
            // Diagnostics hooks must never break protocol handling.
        }
    }
    async sendRequest(method, params) {
        if (!this.acceptingWrites) {
            throw new Error("ACP connection is closing");
        }
        const id = this.nextRequestId++;
        const response = new Promise((resolve, reject) => {
            this.pendingResponses.set(id, {
                resolve: (value) => resolve(value),
                reject,
            });
        });
        try {
            await this.sendMessage({
                jsonrpc: "2.0",
                id,
                method,
                params,
            });
        }
        catch (error) {
            this.pendingResponses.delete(id);
            throw error;
        }
        return response;
    }
    async sendNotification(method, params) {
        await this.sendMessage({
            jsonrpc: "2.0",
            method,
            params,
        });
    }
    async initialize(params) {
        return await this.sendRequest(ACP_AGENT_METHODS.initialize, params);
    }
    async newSession(params) {
        return await this.sendRequest(ACP_AGENT_METHODS.session_new, params);
    }
    async loadSession(params) {
        return await this.sendRequest(ACP_AGENT_METHODS.session_load, params);
    }
    async resumeSession(params) {
        return await this.sendRequest(ACP_AGENT_METHODS.session_resume, params);
    }
    async prompt(params) {
        return await this.sendRequest(ACP_AGENT_METHODS.session_prompt, params);
    }
    async notifySessionCancel(params) {
        await this.sendNotification(ACP_AGENT_METHODS.session_cancel, params);
    }
    async setSessionMode(params) {
        return await this.sendRequest(ACP_AGENT_METHODS.session_set_mode, params);
    }
    async setSessionModel(params) {
        return await this.sendRequest(ACP_AGENT_METHODS.session_set_model, params);
    }
    async setSessionConfigOption(params) {
        return await this.sendRequest(ACP_AGENT_METHODS.session_set_config_option, params);
    }
    async authenticate(params) {
        return await this.sendRequest(ACP_AGENT_METHODS.authenticate, params);
    }
}
