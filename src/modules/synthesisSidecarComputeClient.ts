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
import type {
  SynthesisSidecarErrorCode,
  SynthesisSidecarWorkerCapability,
} from "../../packages/synthesis-contracts/src/sidecarSystem";
import {
  createSynthesisSidecarRpcClient,
  SynthesisSidecarRpcError,
  type SynthesisSidecarRpcConnection,
} from "./synthesisSidecarRpcClient";

export type SynthesisSidecarComputeConnection = SynthesisSidecarRpcConnection;

type FetchLike = typeof fetch;

export const SYNTHESIS_SIDECAR_COMPUTE_DEADLINE_MS = 5_000;

export class SynthesisSidecarComputeClientError extends Error {
  readonly code: SynthesisSidecarErrorCode;

  constructor(code: SynthesisSidecarErrorCode) {
    super(code);
    this.name = "SynthesisSidecarComputeClientError";
    this.code = code;
  }
}

export function createSynthesisSidecarComputeClient(options?: {
  fetch?: FetchLike;
  deadlineMs?: number;
}) {
  const rpc = createSynthesisSidecarRpcClient({
    fetch: options?.fetch,
    deadlineMs: options?.deadlineMs ?? SYNTHESIS_SIDECAR_COMPUTE_DEADLINE_MS,
    requestIdPrefix: "compute",
  });

  const compute = async <Request, Result>(args: {
    connection: SynthesisSidecarComputeConnection;
    capability: SynthesisSidecarWorkerCapability;
    input: Request;
    rebuildRequest(value: unknown): Request;
    rebuildResult(value: unknown, request: Request): Result;
    callOptions: { signal?: AbortSignal; deadlineMs?: number };
  }) => {
    try {
      const request = args.rebuildRequest(args.input);
      return await rpc.call({
        connection: args.connection,
        capability: args.capability,
        payload: request,
        rebuildResult: (value) => args.rebuildResult(value, request),
        signal: args.callOptions.signal,
        deadlineMs: args.callOptions.deadlineMs,
      });
    } catch (error) {
      if (error instanceof SynthesisSidecarRpcError) {
        throw new SynthesisSidecarComputeClientError(error.code);
      }
      throw error;
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
