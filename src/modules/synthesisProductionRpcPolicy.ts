import productionOperations from "../../packages/synthesis-contracts/contract-set/synthesis-production-client-v1/operations.json";
import type { SynthesisSidecarProductionClientCapability } from "../../packages/synthesis-contracts/src/sidecarSystem";
import type { SynthesisSidecarRpcTransportErrors } from "./synthesisSidecarRpcClient";

const manifest = productionOperations as {
  deadlineMs: number;
  deadlineOverridesMs: Partial<
    Record<SynthesisSidecarProductionClientCapability, number>
  >;
};

export const SYNTHESIS_PRODUCTION_RPC_TRANSPORT_GRACE_MS = 2_000;

export const SYNTHESIS_PRODUCTION_RPC_TRANSPORT_ERRORS = Object.freeze({
  canceled: "request_canceled",
  timeout: "request_timeout",
  invalidResponse: "response_invalid",
  unavailable: "service_unavailable",
} satisfies SynthesisSidecarRpcTransportErrors);

export function synthesisProductionOperationDeadlineMs(
  capability: SynthesisSidecarProductionClientCapability,
) {
  return manifest.deadlineOverridesMs[capability] ?? manifest.deadlineMs;
}

export function synthesisProductionTransportDeadlineMs(
  capability: SynthesisSidecarProductionClientCapability,
) {
  return (
    synthesisProductionOperationDeadlineMs(capability) +
    SYNTHESIS_PRODUCTION_RPC_TRANSPORT_GRACE_MS
  );
}
