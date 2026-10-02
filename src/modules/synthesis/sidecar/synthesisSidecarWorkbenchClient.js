import { rebuildSynthesisWorkbenchOperationalChromeResult, } from "../../../../packages/synthesis-contracts/src/workbench";
import { createSynthesisSidecarRpcClient, SynthesisSidecarRpcError, } from "./synthesisSidecarRpcClient";
export const SYNTHESIS_SIDECAR_WORKBENCH_DEADLINE_MS = 1_000;
export class SynthesisSidecarWorkbenchClientError extends Error {
    code;
    constructor(code) {
        super(code);
        this.code = code;
        this.name = "SynthesisSidecarWorkbenchClientError";
    }
}
export function createSynthesisSidecarWorkbenchClient(options) {
    const rpc = createSynthesisSidecarRpcClient({
        fetch: options?.fetch,
        deadlineMs: options?.deadlineMs ?? SYNTHESIS_SIDECAR_WORKBENCH_DEADLINE_MS,
        requestIdPrefix: "workbench-chrome",
        transportErrors: {
            canceled: "request_canceled",
            timeout: "request_timeout",
            invalidResponse: "response_invalid",
            unavailable: "service_unavailable",
        },
    });
    return {
        async readOperationalChrome(connection, callOptions = {}) {
            try {
                return await rpc.call({
                    connection,
                    capability: "workbench.chrome.read",
                    payload: {},
                    rebuildResult: rebuildSynthesisWorkbenchOperationalChromeResult,
                    signal: callOptions.signal,
                    deadlineMs: callOptions.deadlineMs,
                });
            }
            catch (error) {
                if (error instanceof SynthesisSidecarRpcError) {
                    throw new SynthesisSidecarWorkbenchClientError(error.code);
                }
                throw error;
            }
        },
    };
}
