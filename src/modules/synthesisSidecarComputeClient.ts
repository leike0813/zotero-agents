import {
  rebuildSynthesisCitationGraphLayoutRequest,
  rebuildSynthesisCitationGraphLayoutResult,
  type SynthesisCitationGraphLayoutRequest,
} from "../../packages/synthesis-engine/src/index";
import {
  SYNTHESIS_SIDECAR_CALL_PATH,
  SYNTHESIS_SIDECAR_LIMITS,
  SYNTHESIS_SIDECAR_PROTOCOL,
  isSynthesisSidecarErrorCode,
  type SynthesisSidecarErrorCode,
} from "../../packages/synthesis-contracts/src/sidecarSystem";

export type SynthesisSidecarComputeConnection = {
  baseUrl: string;
  profileId: string;
  clientToken: string;
};

type FetchLike = typeof fetch;

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

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
  const abort = () => controller.abort(parent?.reason);
  if (parent?.aborted) {
    abort();
  } else {
    parent?.addEventListener("abort", abort, { once: true });
  }
  const timeout = setTimeout(
    () => controller.abort(new Error("worker_timeout")),
    timeoutMs,
  );
  return {
    signal: controller.signal,
    dispose() {
      clearTimeout(timeout);
      parent?.removeEventListener("abort", abort);
    },
  };
}

export function createSynthesisSidecarComputeClient(options?: {
  fetch?: FetchLike;
  deadlineMs?: number;
}) {
  const fetchImpl = options?.fetch ?? globalThis.fetch;
  const defaultDeadlineMs = options?.deadlineMs ?? 5_000;
  if (typeof fetchImpl !== "function") {
    throw new Error("sidecar_compute_fetch_unavailable");
  }
  return {
    async computeCitationGraphLayout(
      connection: SynthesisSidecarComputeConnection,
      input: SynthesisCitationGraphLayoutRequest,
      callOptions: { signal?: AbortSignal; deadlineMs?: number } = {},
    ) {
      const request = rebuildSynthesisCitationGraphLayoutRequest(input);
      const requestSource = JSON.stringify({
        protocol: SYNTHESIS_SIDECAR_PROTOCOL,
        requestId: `compute:${Date.now()}`,
        profileId: connection.profileId,
        capability: "compute.citation_graph_layout",
        payload: request,
      });
      if (
        textEncoder.encode(requestSource).byteLength >
        SYNTHESIS_SIDECAR_LIMITS.computeRequestBodyBytes
      ) {
        return computeClientError("request_body_too_large");
      }
      const deadline = composedSignal(
        callOptions.signal,
        callOptions.deadlineMs ?? defaultDeadlineMs,
      );
      try {
        const response = await fetchImpl(
          `${connection.baseUrl}${SYNTHESIS_SIDECAR_CALL_PATH}`,
          {
            method: "POST",
            headers: {
              authorization: `Bearer ${connection.clientToken}`,
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
          data?: unknown;
          error?: { code?: unknown };
        };
        try {
          body = JSON.parse(responseSource) as typeof body;
        } catch {
          return computeClientError("internal_error");
        }
        if (!response.ok || body.ok !== true) {
          return computeClientError(
            isSynthesisSidecarErrorCode(body.error?.code)
              ? body.error.code
              : "internal_error",
          );
        }
        return rebuildSynthesisCitationGraphLayoutResult(body.data, request);
      } finally {
        deadline.dispose();
      }
    },
  };
}
