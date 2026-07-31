import {
  SYNTHESIS_REVERSE_HOST_LIMITS,
  SynthesisClientError,
  synthesisReverseHostResponseBodyLimit,
  toSynthesisJsonValue,
  type SynthesisJsonValue,
} from "../../packages/synthesis-contracts/src";
import {
  beginHostHttpRequestRead,
  type HostHttpRequestReadOperation,
} from "./hostHttpRequestReader";
import {
  createSynthesisReverseHostBroker,
  type SynthesisReverseHostHandlers,
} from "./synthesisReverseHostBroker";
import {
  beginRuntimeMemoryResponseTransfer,
  prepareJsonHttpResponse,
} from "./runtimeHttpResponse";
import {
  createSynthesisSidecarDiagnosticRecorders,
  type SynthesisSidecarDiagnosticEventInput,
} from "./synthesisSidecarDiagnosticEvents";

export const SYNTHESIS_REVERSE_HOST_PATH = "/synthesis/v1/host-call" as const;

type HttpRequest = {
  method: string;
  path: string;
  headers: Record<string, string>;
  body: unknown;
};

type BrokerDispatch = {
  dispatch(input: {
    authorizationToken: string;
    call: unknown;
  }): Promise<SynthesisJsonValue>;
};

function response(status: number, body: SynthesisJsonValue) {
  return { status, body };
}

export async function handleSynthesisReverseHostHttpRequest(
  request: HttpRequest,
  broker: BrokerDispatch,
) {
  if (
    request.method !== "POST" ||
    request.path !== SYNTHESIS_REVERSE_HOST_PATH
  ) {
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
      result: await broker.dispatch({
        authorizationToken,
        call: request.body,
      }),
    });
  } catch (error) {
    if (error instanceof SynthesisClientError) {
      const status =
        error.code === "invalid_request"
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

function findHeaderEnd(bytes: Uint8Array) {
  for (let index = 3; index < bytes.length; index += 1) {
    if (
      bytes[index - 3] === 13 &&
      bytes[index - 2] === 10 &&
      bytes[index - 1] === 13 &&
      bytes[index] === 10
    ) {
      return index + 1;
    }
  }
  return -1;
}

function decodeLatin1(bytes: Uint8Array) {
  let text = "";
  for (const byte of bytes) {
    text += String.fromCharCode(byte);
  }
  return text;
}

function parseHttpRequest(bytes: Uint8Array): HttpRequest {
  const headerEnd = findHeaderEnd(bytes);
  if (headerEnd < 0) {
    throw new Error("reverse_host_http_framing_invalid");
  }
  const lines = decodeLatin1(bytes.subarray(0, headerEnd - 4)).split("\r\n");
  const [method, path, version, ...extra] = String(lines.shift() || "").split(
    " ",
  );
  if (extra.length || !method || !path || version !== "HTTP/1.1") {
    throw new Error("reverse_host_http_request_invalid");
  }
  const headers: Record<string, string> = {};
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

function encodeHttpResponse(args: {
  status: number;
  body: SynthesisJsonValue;
}) {
  const reason =
    args.status === 200
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
  const runtime = globalThis as {
    Components?: any;
    Cc?: any;
    Ci?: any;
  };
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

type EndpointOptions = {
  profileId: string;
  authorizationToken: string;
  now: () => number;
  isHostConnected: () => boolean;
  authorizeCapability: Parameters<
    typeof createSynthesisReverseHostBroker
  >[0]["authorizeCapability"];
  allowUnboundServiceInstance?: boolean;
  handlers: SynthesisReverseHostHandlers;
  serverSocketFactory?: () => any;
  recordDiagnosticEvent?: (event: SynthesisSidecarDiagnosticEventInput) => void;
};

export function createSynthesisReverseHostEndpoint(options: EndpointOptions) {
  let serviceInstanceId: string | null = null;
  let server: any;
  let active = false;
  const reads = new Set<HostHttpRequestReadOperation>();
  const diagnosticRecorders = createSynthesisSidecarDiagnosticRecorders(
    options.recordDiagnosticEvent,
  );
  const broker = createSynthesisReverseHostBroker({
    profileId: options.profileId,
    serviceInstanceId: () => serviceInstanceId,
    authorizationToken: options.authorizationToken,
    now: options.now,
    isHostConnected: options.isHostConnected,
    authorizeCapability: options.authorizeCapability,
    allowUnboundServiceInstance: options.allowUnboundServiceInstance === true,
    handlers: options.handlers,
    recordDiagnosticEvent: options.recordDiagnosticEvent,
  });

  async function handleTransport(transport: any) {
    const startedAt = options.now();
    const input = transport.openInputStream(0, 0, 0);
    const output = transport.openOutputStream(0, 0, 0);
    let responseStarted = false;
    let context: Pick<
      SynthesisSidecarDiagnosticEventInput,
      "capability" | "requestId" | "operationId" | "correlationId"
    > = {};
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
        const call = request.body as Record<string, unknown>;
        context = {
          capability:
            typeof call.capability === "string" ? call.capability : undefined,
          requestId:
            typeof call.requestId === "string" ? call.requestId : undefined,
          operationId:
            typeof call.operationId === "string" ? call.operationId : undefined,
          correlationId:
            typeof call.correlationId === "string"
              ? call.correlationId
              : undefined,
        };
      }
      diagnosticRecorders.debug?.({
        component: "reverse-host",
        stage: "request-received",
        status: "started",
        ...context,
        requestBytes: readResult.bytes.byteLength,
      });
      const result = await handleSynthesisReverseHostHttpRequest(
        request,
        broker,
      );
      let responseStatus = result.status;
      const responseBody =
        result.body && typeof result.body === "object"
          ? (result.body as Record<string, unknown>)
          : undefined;
      const responseError =
        responseBody?.error && typeof responseBody.error === "object"
          ? (responseBody.error as Record<string, unknown>)
          : undefined;
      const responseDetails =
        responseError?.details && typeof responseError.details === "object"
          ? (responseError.details as Record<string, unknown>)
          : undefined;
      let responseCode =
        typeof responseDetails?.reason === "string"
          ? responseDetails.reason
          : typeof responseError?.code === "string"
            ? responseError.code
            : undefined;
      let prepared = encodeHttpResponse({
        status: result.status,
        body: toSynthesisJsonValue(result.body),
      });
      const responseBodyLimit = synthesisReverseHostResponseBodyLimit(
        context.capability,
      );
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
      (responseStatus >= 400
        ? diagnosticRecorders.failure
        : diagnosticRecorders.debug)?.({
        component: "reverse-host",
        stage:
          responseStatus >= 400 ? "response-rejected" : "response-completed",
        status: responseStatus >= 400 ? "failed" : "succeeded",
        ...context,
        code: responseCode,
        httpStatus: responseStatus,
        responseBytes: prepared.bodyByteLength,
        ...(responseCode === "reverse_host_response_too_large"
          ? {
              attemptedResponseBytes,
              limitBytes: responseBodyLimit,
            }
          : {}),
        durationMs: Math.max(0, options.now() - startedAt),
      });
    } catch (error) {
      const code =
        error instanceof Error &&
        /^[a-z][a-z0-9_.:-]{0,127}$/.test(error.message)
          ? error.message
          : responseStarted
            ? "reverse_host_response_transfer_failed"
            : "reverse_host_request_invalid";
      diagnosticRecorders.failure({
        component: "reverse-host",
        stage: responseStarted ? "response-failed" : "request-failed",
        status: "failed",
        ...context,
        code,
        durationMs: Math.max(0, options.now() - startedAt),
      });
      if (!responseStarted) {
        responseStarted = true;
        await beginRuntimeMemoryResponseTransfer({
          outputStream: output,
          response: encodeHttpResponse({
            status: 400,
            body: {
              ok: false,
              error: { code: "invalid_request" },
            },
          }),
        }).completion.catch(() => undefined);
      }
    } finally {
      reads.delete(read);
      input.close?.();
      output.close?.();
      transport.close?.(0);
    }
  }

  return {
    start() {
      if (active) {
        return {
          host: "127.0.0.1" as const,
          port: Number(server.port),
          authorizationToken: options.authorizationToken,
        };
      }
      server = (options.serverSocketFactory ?? createLoopbackServerSocket)();
      server.asyncListen({
        onSocketAccepted(_socket: unknown, transport: unknown) {
          if (active) {
            void handleTransport(transport);
          }
        },
        onStopListening() {},
      });
      active = true;
      return {
        host: "127.0.0.1" as const,
        port: Number(server.port),
        authorizationToken: options.authorizationToken,
      };
    },
    bindServiceInstance(nextServiceInstanceId: string) {
      if (
        !active ||
        !nextServiceInstanceId ||
        nextServiceInstanceId.length > 128
      ) {
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
      broker.dispose();
      server?.close?.();
      server = undefined;
    },
  };
}
