import productionOperations from "../../packages/synthesis-contracts/contract-set/synthesis-production-client-v1/operations.json";
import type { SynthesisSidecarProductionClientCapability } from "../../packages/synthesis-contracts/src/sidecarSystem";
import type { SynthesisSidecarRpcTransportErrors } from "./synthesisSidecarRpcClient";

export type SynthesisProductionDataPlane =
  | "control"
  | "transfer"
  | "locator"
  | "delivery";
export type SynthesisProductionWorkModel = "bounded" | "receipt";
export type SynthesisProductionReceipt =
  | "inline"
  | "public-maintenance-operation";

type OperationPolicy = {
  requestPlane: SynthesisProductionDataPlane;
  resultPlane: SynthesisProductionDataPlane;
  workModel: SynthesisProductionWorkModel;
  receipt: SynthesisProductionReceipt;
};

type OperationPolicyOverride = Partial<OperationPolicy>;

const manifest = productionOperations as {
  schema: string;
  requestBytes: number;
  responseBytes: number;
  controlTargetBytes: number;
  deadlineMs: number;
  deadlineOverridesMs: Partial<
    Record<SynthesisSidecarProductionClientCapability, number>
  >;
  receiptQueryCapability: SynthesisSidecarProductionClientCapability;
  access: Record<
    SynthesisSidecarProductionClientCapability,
    "read" | "mutation"
  >;
  policyDefaults: OperationPolicy;
  policyOverrides: Partial<
    Record<SynthesisSidecarProductionClientCapability, OperationPolicyOverride>
  >;
};

const POLICY_FIELDS = [
  "requestPlane",
  "resultPlane",
  "workModel",
  "receipt",
] as const;

function resolvePolicy(
  capability: SynthesisSidecarProductionClientCapability,
): OperationPolicy {
  return {
    ...manifest.policyDefaults,
    ...manifest.policyOverrides[capability],
  };
}

function validPolicy(capability: SynthesisSidecarProductionClientCapability) {
  const override = manifest.policyOverrides[capability];
  if (
    override &&
    Object.keys(override).some(
      (field) => !POLICY_FIELDS.includes(field as (typeof POLICY_FIELDS)[number]),
    )
  ) {
    return false;
  }
  const policy = resolvePolicy(capability);
  return (
    ["control", "transfer"].includes(policy.requestPlane) &&
    ["control", "locator", "delivery"].includes(policy.resultPlane) &&
    ["bounded", "receipt"].includes(policy.workModel) &&
    ["inline", "public-maintenance-operation"].includes(policy.receipt) &&
    (policy.workModel === "receipt") ===
      (policy.receipt === "public-maintenance-operation") &&
    (policy.workModel !== "receipt" ||
      manifest.access[capability] === "mutation")
  );
}

const operationCapabilities = Object.keys(manifest.access) as Array<
  SynthesisSidecarProductionClientCapability
>;
if (
  manifest.schema !== "synthesis-production-client-operations.v2" ||
  !Number.isSafeInteger(manifest.controlTargetBytes) ||
  manifest.controlTargetBytes <= 0 ||
  manifest.controlTargetBytes > manifest.requestBytes ||
  manifest.controlTargetBytes > manifest.responseBytes ||
  manifest.receiptQueryCapability !==
    "client.getPublicMaintenanceOperation" ||
  Object.keys(manifest.policyDefaults).sort().join("\n") !==
    [...POLICY_FIELDS].sort().join("\n") ||
  Object.keys(manifest.policyOverrides).some(
    (capability) => !(capability in manifest.access),
  ) ||
  operationCapabilities.some((capability) => !validPolicy(capability))
) {
  throw new Error("invalid_production_operation_manifest");
}

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

export function synthesisProductionOperationPolicy(
  capability: SynthesisSidecarProductionClientCapability,
) {
  return {
    ...resolvePolicy(capability),
    controlTargetBytes: manifest.controlTargetBytes,
    requestBytes: manifest.requestBytes,
    responseBytes: manifest.responseBytes,
  };
}

export function synthesisProductionTransportDeadlineMs(
  capability: SynthesisSidecarProductionClientCapability,
) {
  return (
    synthesisProductionOperationDeadlineMs(capability) +
    SYNTHESIS_PRODUCTION_RPC_TRANSPORT_GRACE_MS
  );
}
