import {
  rebuildSynthesisCitationGraphLayoutRequest,
  rebuildSynthesisCitationGraphLayoutResult,
  type SynthesisCitationGraphLayoutRequest,
} from "../../packages/synthesis-engine/src/index";
import {
  SYNTHESIS_SIDECAR_CALL_PATH,
  SYNTHESIS_SIDECAR_PROTOCOL,
} from "../../packages/synthesis-contracts/src/sidecarSystem";

export type SynthesisSidecarComputeConnection = {
  baseUrl: string;
  profileId: string;
  clientToken: string;
};

type FetchLike = typeof fetch;

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
            body: JSON.stringify({
              protocol: SYNTHESIS_SIDECAR_PROTOCOL,
              requestId: `compute:${Date.now()}`,
              profileId: connection.profileId,
              capability: "compute.citation_graph_layout",
              payload: request,
            }),
            signal: deadline.signal,
          },
        );
        const body = (await response.json()) as {
          ok?: unknown;
          data?: unknown;
          error?: { code?: unknown };
        };
        if (!response.ok || body.ok !== true) {
          throw new Error(String(body.error?.code || "sidecar_compute_failed"));
        }
        return rebuildSynthesisCitationGraphLayoutResult(body.data, request);
      } finally {
        deadline.dispose();
      }
    },
  };
}
