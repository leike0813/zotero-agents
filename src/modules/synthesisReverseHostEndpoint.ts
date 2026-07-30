import {
  SynthesisClientError,
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
};

export function createSynthesisReverseHostEndpoint(options: EndpointOptions) {
  let serviceInstanceId: string | null = null;
  let server: any;
  let active = false;
  const reads = new Set<HostHttpRequestReadOperation>();
  const broker = createSynthesisReverseHostBroker({
    profileId: options.profileId,
    serviceInstanceId: () => serviceInstanceId,
    authorizationToken: options.authorizationToken,
    now: options.now,
    isHostConnected: options.isHostConnected,
    authorizeCapability: options.authorizeCapability,
    allowUnboundServiceInstance: options.allowUnboundServiceInstance === true,
    handlers: options.handlers,
  });

  async function handleTransport(transport: any) {
    const input = transport.openInputStream(0, 0, 0);
    const output = transport.openOutputStream(0, 0, 0);
    const read = beginHostHttpRequestRead(input, {
      limits: {
        maxHeaderBytes: 16 * 1024,
        maxBodyBytes: 1024 * 1024,
        idleTimeoutMs: 1_000,
        totalTimeoutMs: 60_000,
      },
    });
    reads.add(read);
    try {
      const request = parseHttpRequest((await read.completion).bytes);
      const result = await handleSynthesisReverseHostHttpRequest(
        request,
        broker,
      );
      await beginRuntimeMemoryResponseTransfer({
        outputStream: output,
        response: encodeHttpResponse({
          status: result.status,
          body: toSynthesisJsonValue(result.body),
        }),
      }).completion;
    } catch {
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
