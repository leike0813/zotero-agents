import {
  SYNTHESIS_SIDECAR_CALL_PATH,
  SYNTHESIS_SIDECAR_LIMITS,
  SYNTHESIS_SIDECAR_PROTOCOL,
  isSynthesisSidecarErrorCode,
  type SynthesisSidecarCapability,
  type SynthesisSidecarErrorCode,
} from "../../packages/synthesis-contracts/src/sidecarSystem";

export type SynthesisSidecarRpcConnection = {
  baseUrl: string;
  profileId: string;
  clientToken: string;
  serviceInstanceId: string;
};

type FetchLike = typeof fetch;

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();
let requestSequence = 0;

export class SynthesisSidecarRpcError extends Error {
  constructor(readonly code: SynthesisSidecarErrorCode) {
    super(code);
    this.name = "SynthesisSidecarRpcError";
  }
}

function fail(code: SynthesisSidecarErrorCode): never {
  throw new SynthesisSidecarRpcError(code);
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
  const controller = new AbortController();
  let timedOut = false;
  const abort = () => controller.abort(parent?.reason);
  if (parent?.aborted) {
    abort();
  } else {
    parent?.addEventListener("abort", abort, { once: true });
  }
  const timeout = setTimeout(() => {
    timedOut = true;
    controller.abort(new Error("sidecar_rpc_timeout"));
  }, timeoutMs);
  return {
    signal: controller.signal,
    timedOut: () => timedOut,
    dispose() {
      clearTimeout(timeout);
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
}) {
  const fetchImpl = options?.fetch ?? globalThis.fetch;
  const defaultDeadlineMs = options?.deadlineMs ?? 5_000;
  const requestIdPrefix = options?.requestIdPrefix ?? "rpc";
  if (typeof fetchImpl !== "function") {
    throw new Error("sidecar_rpc_fetch_unavailable");
  }
  return {
    async call<Result>(args: {
      connection: SynthesisSidecarRpcConnection;
      capability: SynthesisSidecarCapability;
      payload: unknown;
      rebuildResult(value: unknown): Result;
      signal?: AbortSignal;
      deadlineMs?: number;
    }): Promise<Result> {
      if (args.signal?.aborted) {
        return fail("worker_canceled");
      }
      const requestId = nextRequestId(requestIdPrefix);
      const requestSource = JSON.stringify({
        protocol: SYNTHESIS_SIDECAR_PROTOCOL,
        requestId,
        profileId: args.connection.profileId,
        capability: args.capability,
        payload: args.payload,
      });
      if (
        textEncoder.encode(requestSource).byteLength >
        SYNTHESIS_SIDECAR_LIMITS.computeRequestBodyBytes
      ) {
        return fail("request_body_too_large");
      }
      const deadline = composedSignal(
        args.signal,
        args.deadlineMs ?? defaultDeadlineMs,
      );
      try {
        const response = await fetchImpl(
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
        );
        const responseSource = await readBoundedResponse(
          response,
          SYNTHESIS_SIDECAR_LIMITS.computeResponseBodyBytes,
        );
        let body: {
          ok?: unknown;
          requestId?: unknown;
          serviceInstanceId?: unknown;
          data?: unknown;
          error?: { code?: unknown };
        };
        try {
          body = JSON.parse(responseSource) as typeof body;
        } catch {
          return fail("worker_result_invalid");
        }
        if (
          (typeof body.requestId === "string" &&
            body.requestId.length > 0 &&
            body.requestId !== requestId) ||
          (typeof body.serviceInstanceId === "string" &&
            body.serviceInstanceId.length > 0 &&
            body.serviceInstanceId !== args.connection.serviceInstanceId)
        ) {
          return fail("runtime_mismatch");
        }
        if (!response.ok || body.ok !== true) {
          return fail(
            isSynthesisSidecarErrorCode(body.error?.code)
              ? body.error.code
              : "internal_error",
          );
        }
        if (
          body.requestId !== requestId ||
          body.serviceInstanceId !== args.connection.serviceInstanceId
        ) {
          return fail("runtime_mismatch");
        }
        try {
          return args.rebuildResult(body.data);
        } catch {
          return fail("worker_result_invalid");
        }
      } catch (error) {
        if (error instanceof SynthesisSidecarRpcError) {
          throw error;
        }
        if (args.signal?.aborted) {
          return fail("worker_canceled");
        }
        if (deadline.timedOut()) {
          return fail("worker_timeout");
        }
        return fail("worker_unavailable");
      } finally {
        deadline.dispose();
      }
    },
  };
}
