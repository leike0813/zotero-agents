import {
  rebuildSynthesisWorkbenchOperationalChromeResult,
  type SynthesisWorkbenchOperationalChromeResult,
} from "../../packages/synthesis-contracts/src/workbench";
import type { SynthesisSidecarErrorCode } from "../../packages/synthesis-contracts/src/sidecarSystem";
import {
  createSynthesisSidecarRpcClient,
  SynthesisSidecarRpcError,
  type SynthesisSidecarRpcConnection,
} from "./synthesisSidecarRpcClient";

export type SynthesisSidecarWorkbenchConnection = SynthesisSidecarRpcConnection;
export const SYNTHESIS_SIDECAR_WORKBENCH_DEADLINE_MS = 1_000;

export class SynthesisSidecarWorkbenchClientError extends Error {
  constructor(readonly code: SynthesisSidecarErrorCode) {
    super(code);
    this.name = "SynthesisSidecarWorkbenchClientError";
  }
}

export function createSynthesisSidecarWorkbenchClient(options?: {
  fetch?: typeof fetch;
  deadlineMs?: number;
}) {
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
    async readOperationalChrome(
      connection: SynthesisSidecarWorkbenchConnection,
      callOptions: { signal?: AbortSignal; deadlineMs?: number } = {},
    ): Promise<SynthesisWorkbenchOperationalChromeResult> {
      try {
        return await rpc.call({
          connection,
          capability: "workbench.chrome.read",
          payload: {},
          rebuildResult: rebuildSynthesisWorkbenchOperationalChromeResult,
          signal: callOptions.signal,
          deadlineMs: callOptions.deadlineMs,
        });
      } catch (error) {
        if (error instanceof SynthesisSidecarRpcError) {
          throw new SynthesisSidecarWorkbenchClientError(error.code);
        }
        throw error;
      }
    },
  };
}
