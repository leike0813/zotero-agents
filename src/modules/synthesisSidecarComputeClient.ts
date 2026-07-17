import {
  rebuildSynthesisCitationGraphLayoutRequest,
  rebuildSynthesisCitationGraphLayoutResult,
  rebuildSynthesisCitationGraphMetricsRequest,
  rebuildSynthesisCitationGraphMetricsResult,
  type SynthesisCitationGraphLayoutRequest,
  type SynthesisCitationGraphLayoutResult,
  type SynthesisCitationGraphMetricsRequest,
  type SynthesisCitationGraphMetricsResult,
} from "../../packages/synthesis-engine/src/index";
import {
  rebuildSynthesisCitationGraphBuildRequest,
  rebuildSynthesisCitationGraphBuildResult,
  type SynthesisCitationGraphBuildRequest,
  type SynthesisCitationGraphBuildResult,
} from "../../packages/synthesis-engine/src/citationGraphBuild";
import {
  SYNTHESIS_SIDECAR_CALL_PATH,
  SYNTHESIS_SIDECAR_LIMITS,
  SYNTHESIS_SIDECAR_PROTOCOL,
  isSynthesisSidecarErrorCode,
  type SynthesisSidecarComputeCapability,
  type SynthesisSidecarErrorCode,
} from "../../packages/synthesis-contracts/src/sidecarSystem";

export type SynthesisSidecarComputeConnection = {
  baseUrl: string;
  profileId: string;
  clientToken: string;
  serviceInstanceId: string;
};

type FetchLike = typeof fetch;

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();
let computeRequestSequence = 0;

export const SYNTHESIS_SIDECAR_COMPUTE_DEADLINE_MS = 5_000;

export class SynthesisSidecarComputeClientError extends Error {
  readonly code: SynthesisSidecarErrorCode;

  constructor(code: SynthesisSidecarErrorCode) {
    super(code);
    this.name = "SynthesisSidecarComputeClientError";
    this.code = code;
  }
}

function computeClientError(code: SynthesisSidecarErrorCode): never {
  throw new SynthesisSidecarComputeClientError(code);
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
    return computeClientError("response_body_too_large");
  }
  if (!response.body || typeof response.body.getReader !== "function") {
    const source = await response.text();
    if (textEncoder.encode(source).byteLength > maxBytes) {
      return computeClientError("response_body_too_large");
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
        return computeClientError("response_body_too_large");
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
    controller.abort(new Error("worker_timeout"));
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

function nextComputeRequestId() {
  computeRequestSequence =
    (computeRequestSequence + 1) % Number.MAX_SAFE_INTEGER;
  return `compute:${Date.now()}:${computeRequestSequence}`;
}

export function createSynthesisSidecarComputeClient(options?: {
  fetch?: FetchLike;
  deadlineMs?: number;
}) {
  const fetchImpl = options?.fetch ?? globalThis.fetch;
  const defaultDeadlineMs =
    options?.deadlineMs ?? SYNTHESIS_SIDECAR_COMPUTE_DEADLINE_MS;
  if (typeof fetchImpl !== "function") {
    throw new Error("sidecar_compute_fetch_unavailable");
  }
  const compute = async <Request, Result>(options: {
    connection: SynthesisSidecarComputeConnection;
    capability: SynthesisSidecarComputeCapability;
    input: Request;
    rebuildRequest(value: unknown): Request;
    rebuildResult(value: unknown, request: Request): Result;
    callOptions: { signal?: AbortSignal; deadlineMs?: number };
  }): Promise<Result> => {
    if (options.callOptions.signal?.aborted) {
      return computeClientError("worker_canceled");
    }
    const request = options.rebuildRequest(options.input);
    const requestId = nextComputeRequestId();
    const requestSource = JSON.stringify({
      protocol: SYNTHESIS_SIDECAR_PROTOCOL,
      requestId,
      profileId: options.connection.profileId,
      capability: options.capability,
      payload: request,
    });
    if (
      textEncoder.encode(requestSource).byteLength >
      SYNTHESIS_SIDECAR_LIMITS.computeRequestBodyBytes
    ) {
      return computeClientError("request_body_too_large");
    }
    const deadline = composedSignal(
      options.callOptions.signal,
      options.callOptions.deadlineMs ?? defaultDeadlineMs,
    );
    try {
      const response = await fetchImpl(
        `${options.connection.baseUrl}${SYNTHESIS_SIDECAR_CALL_PATH}`,
        {
          method: "POST",
          headers: {
            authorization: `Bearer ${options.connection.clientToken}`,
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
        return computeClientError("worker_result_invalid");
      }
      const requestIdentityMismatch =
        typeof body.requestId === "string" &&
        body.requestId.length > 0 &&
        body.requestId !== requestId;
      const runtimeIdentityMismatch =
        typeof body.serviceInstanceId === "string" &&
        body.serviceInstanceId.length > 0 &&
        body.serviceInstanceId !== options.connection.serviceInstanceId;
      if (requestIdentityMismatch || runtimeIdentityMismatch) {
        return computeClientError("runtime_mismatch");
      }
      if (!response.ok || body.ok !== true) {
        return computeClientError(
          isSynthesisSidecarErrorCode(body.error?.code)
            ? body.error.code
            : "internal_error",
        );
      }
      if (
        body.requestId !== requestId ||
        body.serviceInstanceId !== options.connection.serviceInstanceId
      ) {
        return computeClientError("runtime_mismatch");
      }
      try {
        return options.rebuildResult(body.data, request);
      } catch {
        return computeClientError("worker_result_invalid");
      }
    } catch (error) {
      if (error instanceof SynthesisSidecarComputeClientError) {
        throw error;
      }
      if (options.callOptions.signal?.aborted) {
        return computeClientError("worker_canceled");
      }
      if (deadline.timedOut()) {
        return computeClientError("worker_timeout");
      }
      return computeClientError("worker_unavailable");
    } finally {
      deadline.dispose();
    }
  };

  return {
    computeCitationGraphLayout(
      connection: SynthesisSidecarComputeConnection,
      input: SynthesisCitationGraphLayoutRequest,
      callOptions: { signal?: AbortSignal; deadlineMs?: number } = {},
    ): Promise<SynthesisCitationGraphLayoutResult> {
      return compute({
        connection,
        capability: "compute.citation_graph_layout",
        input,
        rebuildRequest: rebuildSynthesisCitationGraphLayoutRequest,
        rebuildResult: rebuildSynthesisCitationGraphLayoutResult,
        callOptions,
      });
    },
    computeCitationGraphMetrics(
      connection: SynthesisSidecarComputeConnection,
      input: SynthesisCitationGraphMetricsRequest,
      callOptions: { signal?: AbortSignal; deadlineMs?: number } = {},
    ): Promise<SynthesisCitationGraphMetricsResult> {
      return compute({
        connection,
        capability: "compute.citation_graph_metrics",
        input,
        rebuildRequest: rebuildSynthesisCitationGraphMetricsRequest,
        rebuildResult: rebuildSynthesisCitationGraphMetricsResult,
        callOptions,
      });
    },
    computeCitationGraphBuild(
      connection: SynthesisSidecarComputeConnection,
      input: SynthesisCitationGraphBuildRequest,
      callOptions: { signal?: AbortSignal; deadlineMs?: number } = {},
    ): Promise<SynthesisCitationGraphBuildResult> {
      return compute({
        connection,
        capability: "compute.citation_graph_build",
        input,
        rebuildRequest: rebuildSynthesisCitationGraphBuildRequest,
        rebuildResult: rebuildSynthesisCitationGraphBuildResult,
        callOptions,
      });
    },
  };
}
