import {
  SYNTHESIS_SIDECAR_CALL_PATH,
  SYNTHESIS_SIDECAR_LIMITS,
  SYNTHESIS_SIDECAR_PROTOCOL,
  isSynthesisSidecarComputeCapability,
  isSynthesisSidecarErrorCode,
  type SynthesisSidecarCapability,
  type SynthesisSidecarErrorCode,
  type SynthesisSidecarProductionClientCapability,
} from "../../packages/synthesis-contracts/src/sidecarSystem";
import {
  createSynthesisSidecarDiagnosticRecorders,
  type SynthesisSidecarDiagnosticEventInput,
} from "./synthesisSidecarDiagnosticEvents";

export type SynthesisSidecarRpcConnection = {
  baseUrl: string;
  profileId: string;
  clientToken: string;
  serviceInstanceId: string;
};

type FetchLike = typeof fetch;

export type SynthesisSidecarRpcTransportErrors = {
  canceled: SynthesisSidecarErrorCode;
  timeout: SynthesisSidecarErrorCode;
  invalidResponse: SynthesisSidecarErrorCode;
  unavailable: SynthesisSidecarErrorCode;
};

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();
let requestSequence = 0;

export class SynthesisSidecarRpcError extends Error {
  constructor(
    readonly code: SynthesisSidecarErrorCode,
    readonly details: Readonly<Record<string, unknown>> = {},
  ) {
    super(code);
    this.name = "SynthesisSidecarRpcError";
  }
}

function fail(
  code: SynthesisSidecarErrorCode,
  details: Readonly<Record<string, unknown>> = {},
): never {
  throw new SynthesisSidecarRpcError(code, details);
}

function contentLength(response: Response) {
  const value = response.headers.get("content-length");
  if (!value || !/^(0|[1-9][0-9]*)$/.test(value)) {
    return undefined;
  }
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : undefined;
}

async function readBoundedResponse(response: Response, maxBytes: number) {
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
  const reader =
    response.body.getReader() as ReadableStreamDefaultReader<Uint8Array>;
  const chunks: Uint8Array[] = [];
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
  } finally {
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

function composedSignal(parent: AbortSignal | undefined, timeoutMs: number) {
  const AbortControllerCtor = (
    globalThis as {
      AbortController?: typeof AbortController;
    }
  ).AbortController;
  const controller =
    typeof AbortControllerCtor === "function"
      ? new AbortControllerCtor()
      : undefined;
  let timedOut = false;
  let rejectBoundary: (reason: Error) => void = () => undefined;
  const boundary = new Promise<never>((_resolve, reject) => {
    rejectBoundary = reject;
  });
  const abort = () => {
    controller?.abort(parent?.reason);
    rejectBoundary(new Error("sidecar_rpc_canceled"));
  };
  if (parent?.aborted) {
    abort();
  } else {
    parent?.addEventListener("abort", abort, { once: true });
  }
  const timeout = globalThis.setTimeout(() => {
    timedOut = true;
    controller?.abort(new Error("sidecar_rpc_timeout"));
    rejectBoundary(new Error("sidecar_rpc_timeout"));
  }, timeoutMs);
  return {
    signal: controller?.signal,
    race<T>(task: Promise<T>) {
      return Promise.race([task, boundary]);
    },
    timedOut: () => timedOut,
    dispose() {
      globalThis.clearTimeout(timeout);
      parent?.removeEventListener("abort", abort);
    },
  };
}

function nextRequestId(prefix: string) {
  requestSequence = (requestSequence + 1) % Number.MAX_SAFE_INTEGER;
  return `${prefix}:${Date.now()}:${requestSequence}`;
}

export function createSynthesisSidecarRpcClient(options?: {
  fetch?: FetchLike;
  deadlineMs?: number;
  requestIdPrefix?: string;
  transportErrors?: SynthesisSidecarRpcTransportErrors;
  now?: () => number;
  recordDiagnosticEvent?: (event: SynthesisSidecarDiagnosticEventInput) => void;
}) {
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
  const diagnosticRecorders = createSynthesisSidecarDiagnosticRecorders(
    options?.recordDiagnosticEvent,
  );
  if (typeof fetchImpl !== "function") {
    throw new Error("sidecar_rpc_fetch_unavailable");
  }
  return {
    async call<Result>(args: {
      connection: SynthesisSidecarRpcConnection;
      capability:
        | SynthesisSidecarCapability
        | SynthesisSidecarProductionClientCapability;
      payload: unknown;
      rebuildResult(value: unknown): Result;
      signal?: AbortSignal;
      deadlineMs?: number;
    }): Promise<Result> {
      if (args.signal?.aborted) {
        return fail(transportErrors.canceled);
      }
      const requestId = nextRequestId(requestIdPrefix);
      const startedAt = now();
      const correlation = diagnosticRecorders.debug
        ? { correlationId: requestId }
        : {};
      const requestSource = JSON.stringify({
        protocol: SYNTHESIS_SIDECAR_PROTOCOL,
        requestId,
        profileId: args.connection.profileId,
        capability: args.capability,
        payload: args.payload,
      });
      const isCompute = isSynthesisSidecarComputeCapability(args.capability);
      if (
        textEncoder.encode(requestSource).byteLength >
        (isCompute
          ? SYNTHESIS_SIDECAR_LIMITS.computeRequestBodyBytes
          : SYNTHESIS_SIDECAR_LIMITS.requestBodyBytes)
      ) {
        diagnosticRecorders.failure({
          component: "rpc",
          stage: "request-rejected",
          status: "failed",
          capability: args.capability,
          requestId,
          ...correlation,
          code: "request_body_too_large",
          requestBytes: textEncoder.encode(requestSource).byteLength,
        });
        return fail("request_body_too_large");
      }
      diagnosticRecorders.debug?.({
        component: "rpc",
        stage: "request-started",
        status: "started",
        capability: args.capability,
        requestId,
        ...correlation,
        serviceInstanceId: args.connection.serviceInstanceId,
        requestBytes: textEncoder.encode(requestSource).byteLength,
      });
      const deadline = composedSignal(
        args.signal,
        args.deadlineMs ?? defaultDeadlineMs,
      );
      try {
        const response = await deadline.race(
          fetchImpl(
            `${args.connection.baseUrl}${SYNTHESIS_SIDECAR_CALL_PATH}`,
            {
              method: "POST",
              headers: {
                authorization: `Bearer ${args.connection.clientToken}`,
                "content-type": "application/json",
              },
              body: requestSource,
              signal: deadline.signal,
            },
          ),
        );
        const responseSource = await deadline.race(
          readBoundedResponse(
            response,
            isCompute
              ? SYNTHESIS_SIDECAR_LIMITS.computeResponseBodyBytes
              : SYNTHESIS_SIDECAR_LIMITS.requestBodyBytes,
          ),
        );
        let body: {
          ok?: unknown;
          requestId?: unknown;
          serviceInstanceId?: unknown;
          data?: unknown;
          error?: { code?: unknown; details?: unknown };
        };
        try {
          body = JSON.parse(responseSource) as typeof body;
        } catch {
          return fail(transportErrors.invalidResponse);
        }
        if (!response.ok || body.ok !== true) {
          const code = isSynthesisSidecarErrorCode(body.error?.code)
            ? body.error.code
            : "internal_error";
          const details =
            body.error?.details &&
            typeof body.error.details === "object" &&
            !Array.isArray(body.error.details)
              ? (body.error.details as Record<string, unknown>)
              : {};
          return fail(code, details);
        }
        if (
          body.requestId !== requestId ||
          body.serviceInstanceId !== args.connection.serviceInstanceId
        ) {
          return fail("runtime_mismatch");
        }
        try {
          const result = args.rebuildResult(body.data);
          diagnosticRecorders.debug?.({
            component: "rpc",
            stage: "request-completed",
            status: "succeeded",
            capability: args.capability,
            requestId,
            ...correlation,
            serviceInstanceId: args.connection.serviceInstanceId,
            httpStatus: response.status,
            requestBytes: textEncoder.encode(requestSource).byteLength,
            responseBytes: textEncoder.encode(responseSource).byteLength,
            durationMs: Math.max(0, now() - startedAt),
          });
          return result;
        } catch {
          return fail(transportErrors.invalidResponse);
        }
      } catch (error) {
        if (error instanceof SynthesisSidecarRpcError) {
          diagnosticRecorders.failure({
            component: "rpc",
            stage: "request-failed",
            status: "failed",
            capability: args.capability,
            requestId,
            ...correlation,
            serviceInstanceId: args.connection.serviceInstanceId,
            code:
              typeof error.details.reason === "string"
                ? error.details.reason
                : error.code,
            durationMs: Math.max(0, now() - startedAt),
          });
          throw error;
        }
        if (args.signal?.aborted) {
          diagnosticRecorders.failure({
            component: "rpc",
            stage: "request-failed",
            status: "failed",
            capability: args.capability,
            requestId,
            ...correlation,
            code: transportErrors.canceled,
            durationMs: Math.max(0, now() - startedAt),
          });
          return fail(transportErrors.canceled);
        }
        if (deadline.timedOut()) {
          diagnosticRecorders.failure({
            component: "rpc",
            stage: "request-failed",
            status: "failed",
            capability: args.capability,
            requestId,
            ...correlation,
            code: transportErrors.timeout,
            durationMs: Math.max(0, now() - startedAt),
          });
          return fail(transportErrors.timeout);
        }
        diagnosticRecorders.failure({
          component: "rpc",
          stage: "request-failed",
          status: "failed",
          capability: args.capability,
          requestId,
          ...correlation,
          code: transportErrors.unavailable,
          durationMs: Math.max(0, now() - startedAt),
        });
        return fail(transportErrors.unavailable);
      } finally {
        deadline.dispose();
      }
    },
  };
}
