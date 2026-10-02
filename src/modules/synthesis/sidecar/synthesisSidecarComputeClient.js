import { rebuildSynthesisCitationGraphLayoutRequest, rebuildSynthesisCitationGraphLayoutResult, rebuildSynthesisCitationGraphMetricsRequest, rebuildSynthesisCitationGraphMetricsResult, } from "../../../../packages/synthesis-engine/src/index";
import { rebuildSynthesisCitationGraphBuildRequest, rebuildSynthesisCitationGraphBuildResult, } from "../../../../packages/synthesis-engine/src/citationGraphBuild";
import { createSynthesisSidecarRpcClient, SynthesisSidecarRpcError, } from "./synthesisSidecarRpcClient";
export const SYNTHESIS_SIDECAR_COMPUTE_DEADLINE_MS = 5_000;
export const SYNTHESIS_SIDECAR_LAYOUT_DEADLINE_MS = 10_000;
export const SYNTHESIS_SIDECAR_METRICS_DEADLINE_MS = 5_000;
export class SynthesisSidecarComputeClientError extends Error {
    code;
    constructor(code) {
        super(code);
        this.name = "SynthesisSidecarComputeClientError";
        this.code = code;
    }
}
export function createSynthesisSidecarComputeClient(options) {
    const rpc = createSynthesisSidecarRpcClient({
        fetch: options?.fetch,
        deadlineMs: options?.deadlineMs ?? SYNTHESIS_SIDECAR_COMPUTE_DEADLINE_MS,
        requestIdPrefix: "compute",
        transportErrors: {
            canceled: "worker_canceled",
            timeout: "worker_timeout",
            invalidResponse: "worker_result_invalid",
            unavailable: "worker_unavailable",
        },
    });
    const compute = async (args) => {
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
        }
        catch (error) {
            if (error instanceof SynthesisSidecarRpcError) {
                throw new SynthesisSidecarComputeClientError(error.code);
            }
            throw error;
        }
    };
    return {
        computeCitationGraphLayout(connection, input, callOptions = {}) {
            return compute({
                connection,
                capability: "compute.citation_graph_layout",
                input,
                rebuildRequest: rebuildSynthesisCitationGraphLayoutRequest,
                rebuildResult: rebuildSynthesisCitationGraphLayoutResult,
                callOptions,
            });
        },
        computeCitationGraphMetrics(connection, input, callOptions = {}) {
            return compute({
                connection,
                capability: "compute.citation_graph_metrics",
                input,
                rebuildRequest: rebuildSynthesisCitationGraphMetricsRequest,
                rebuildResult: rebuildSynthesisCitationGraphMetricsResult,
                callOptions,
            });
        },
        computeCitationGraphBuild(connection, input, callOptions = {}) {
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
