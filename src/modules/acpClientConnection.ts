import {
  ACP_AGENT_METHODS,
  ACP_CLIENT_METHODS,
  type AcpInitializeRequest,
  type AcpInitializeResponse,
  type AcpSessionConfigOption,
  type JsonRpcErrorObject,
  type JsonRpcId,
  type JsonRpcMessage,
  type JsonRpcNotification,
  type JsonRpcRequest,
  type JsonRpcResponse,
  type NewSessionResponse,
  type SessionAttachResponse,
  RequestError,
  type RequestPermissionRequest,
  type RequestPermissionOutcome,
  type SessionNotification,
  isJsonRpcNotification,
  isJsonRpcRequest,
  isJsonRpcResponse,
} from "./acpProtocol";

type AcpMessageReader<T> = {
  read: () => Promise<{ done: boolean; value?: T }>;
  releaseLock: () => void;
};

type AcpMessageWriter<T> = {
  write: (value: T) => Promise<void>;
  close?: () => Promise<void>;
  abort?: (reason?: unknown) => Promise<void>;
  releaseLock: () => void;
};

type AcpMessageStream = {
  readable: {
    getReader: () => AcpMessageReader<unknown>;
  };
  writable: {
    getWriter: () => AcpMessageWriter<unknown>;
  };
};

type PendingResponse = {
  resolve: (value: unknown) => void;
  reject: (error: unknown) => void;
};

export type AcpClientTraceEvent = {
  direction: "in" | "out";
  kind: "request" | "notification" | "response";
  id?: JsonRpcId;
  method?: string;
  errorCode?: number;
  errorMessage?: string;
};

export type AcpClientHandler = {
  requestPermission: (
    params: RequestPermissionRequest,
  ) => Promise<{ outcome: RequestPermissionOutcome }>;
  sessionUpdate: (params: SessionNotification) => Promise<void>;
  providerNotification?: (notification: JsonRpcNotification) => Promise<void>;
};

export class AcpClientConnection {
  private readonly pendingResponses = new Map<JsonRpcId, PendingResponse>();
  private readonly client: AcpClientHandler;
  private nextRequestId = 0;
  private writeQueue = Promise.resolve();
  private closedResolved = false;
  private closedResolver!: () => void;
  readonly closed: Promise<void>;

  constructor(
    toClient: (connection: AcpClientConnection) => AcpClientHandler,
    private readonly stream: AcpMessageStream,
    private readonly options?: {
      onTrace?: (event: AcpClientTraceEvent) => void | Promise<void>;
    },
  ) {
    this.client = toClient(this);
    this.closed = new Promise<void>((resolve) => {
      this.closedResolver = resolve;
    });
    void this.receiveLoop();
  }

  private resolveClosed(reason?: unknown) {
    if (this.closedResolved) {
      return;
    }
    this.closedResolved = true;
    const closeError =
      reason instanceof Error
        ? reason
        : new Error(
            reason
              ? String(reason || "ACP connection closed")
              : "ACP connection closed",
          );
    for (const [, pending] of this.pendingResponses) {
      pending.reject(closeError);
    }
    this.pendingResponses.clear();
    this.closedResolver();
  }

  private async receiveLoop() {
    const reader = this.stream.readable.getReader();
    let failure: unknown = null;
    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) {
          break;
        }
        if (!value) {
          continue;
        }
        await this.processMessage(value as JsonRpcMessage);
      }
    } catch (error) {
      failure = error;
    } finally {
      reader.releaseLock();
      this.resolveClosed(failure || undefined);
    }
  }

  private async processMessage(message: JsonRpcMessage) {
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

  private async tryHandleRequest(request: JsonRpcRequest) {
    try {
      switch (request.method) {
        case ACP_CLIENT_METHODS.session_request_permission:
          return {
            result: await this.client.requestPermission(
              (request.params || {}) as RequestPermissionRequest,
            ),
          };
        default:
          throw RequestError.methodNotFound(request.method);
      }
    } catch (error) {
      return this.normalizeHandlerError(error);
    }
  }

  private async tryHandleNotification(notification: JsonRpcNotification) {
    try {
      switch (notification.method) {
        case ACP_CLIENT_METHODS.session_update:
          await this.client.sessionUpdate(
            (notification.params || {}) as SessionNotification,
          );
          return;
        default:
          await this.client.providerNotification?.(notification);
          return;
      }
    } catch (error) {
      console.error("ACP notification handling failed:", error);
    }
  }

  private normalizeHandlerError(error: unknown): { error: JsonRpcErrorObject } {
    if (error instanceof RequestError) {
      return error.toResult();
    }
    const detail =
      error instanceof Error
        ? error.message
        : String(error || "unknown error").trim();
    return RequestError.internalError(
      detail ? { details: detail } : undefined,
    ).toResult();
  }

  private handleResponse(response: JsonRpcResponse) {
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

  private async sendMessage(message: JsonRpcMessage) {
    this.writeQueue = this.writeQueue.then(async () => {
      const writer = this.stream.writable.getWriter();
      try {
        this.traceMessage("out", message);
        await writer.write(message);
      } finally {
        writer.releaseLock();
      }
    });
    return this.writeQueue;
  }

  private traceMessage(direction: "in" | "out", message: JsonRpcMessage) {
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
    } catch {
      // Diagnostics hooks must never break protocol handling.
    }
  }

  private async sendRequest<TResponse>(
    method: string,
    params?: unknown,
  ): Promise<TResponse> {
    const id = this.nextRequestId++;
    const response = new Promise<TResponse>((resolve, reject) => {
      this.pendingResponses.set(id, {
        resolve: (value) => resolve(value as TResponse),
        reject,
      });
    });
    await this.sendMessage({
      jsonrpc: "2.0",
      id,
      method,
      params,
    });
    return response;
  }

  private async sendNotification(method: string, params?: unknown) {
    await this.sendMessage({
      jsonrpc: "2.0",
      method,
      params,
    });
  }

  async initialize(params: AcpInitializeRequest) {
    return await this.sendRequest<AcpInitializeResponse>(
      ACP_AGENT_METHODS.initialize,
      params,
    );
  }

  async newSession(params: {
    cwd: string;
    mcpServers: unknown[];
    _meta?: unknown;
  }) {
    return await this.sendRequest<NewSessionResponse>(
      ACP_AGENT_METHODS.session_new,
      params,
    );
  }

  async loadSession(params: {
    sessionId: string;
    cwd: string;
    mcpServers: unknown[];
    _meta?: unknown;
  }) {
    return await this.sendRequest<SessionAttachResponse>(
      ACP_AGENT_METHODS.session_load,
      params,
    );
  }

  async resumeSession(params: {
    sessionId: string;
    cwd: string;
    mcpServers: unknown[];
    _meta?: unknown;
  }) {
    return await this.sendRequest<SessionAttachResponse>(
      ACP_AGENT_METHODS.session_resume,
      params,
    );
  }

  async prompt(params: { sessionId: string; prompt: unknown }) {
    return await this.sendRequest<{ stopReason: string }>(
      ACP_AGENT_METHODS.session_prompt,
      params,
    );
  }

  async cancel(params: { sessionId: string }) {
    await this.sendNotification(ACP_AGENT_METHODS.session_cancel, params);
  }

  async setSessionMode(params: { sessionId: string; modeId: string }) {
    return await this.sendRequest<Record<string, never>>(
      ACP_AGENT_METHODS.session_set_mode,
      params,
    );
  }

  async setSessionModel(params: { sessionId: string; modelId: string }) {
    return await this.sendRequest<Record<string, never>>(
      ACP_AGENT_METHODS.session_set_model,
      params,
    );
  }

  async setSessionConfigOption(params: {
    sessionId: string;
    configId: string;
    value: string;
  }) {
    return await this.sendRequest<{
      configOptions?: AcpSessionConfigOption[] | null;
    }>(ACP_AGENT_METHODS.session_set_config_option, params);
  }

  async authenticate(params: { methodId: string }) {
    return await this.sendRequest<Record<string, never>>(
      ACP_AGENT_METHODS.authenticate,
      params,
    );
  }
}
