import productionOperations from "../../../../packages/synthesis-contracts/contract-set/synthesis-production-client-v1/operations.json";
const manifest = productionOperations;
const POLICY_FIELDS = [
    "requestPlane",
    "resultPlane",
    "workModel",
    "receipt",
];
function resolvePolicy(capability) {
    return {
        ...manifest.policyDefaults,
        ...manifest.policyOverrides[capability],
    };
}
function validPolicy(capability) {
    const override = manifest.policyOverrides[capability];
    if (override &&
        Object.keys(override).some((field) => !POLICY_FIELDS.includes(field))) {
        return false;
    }
    const policy = resolvePolicy(capability);
    return (["control", "transfer"].includes(policy.requestPlane) &&
        ["control", "locator", "delivery"].includes(policy.resultPlane) &&
        ["bounded", "receipt"].includes(policy.workModel) &&
        ["inline", "public-maintenance-operation"].includes(policy.receipt) &&
        (policy.workModel === "receipt") ===
            (policy.receipt === "public-maintenance-operation") &&
        (policy.workModel !== "receipt" ||
            manifest.access[capability] === "mutation"));
}
const operationCapabilities = Object.keys(manifest.access);
if (manifest.schema !== "synthesis-production-client-operations.v2" ||
    !Number.isSafeInteger(manifest.controlTargetBytes) ||
    manifest.controlTargetBytes <= 0 ||
    manifest.controlTargetBytes > manifest.requestBytes ||
    manifest.controlTargetBytes > manifest.responseBytes ||
    manifest.receiptQueryCapability !== "client.getPublicMaintenanceOperation" ||
    Object.keys(manifest.policyDefaults).sort().join("\n") !==
        [...POLICY_FIELDS].sort().join("\n") ||
    Object.keys(manifest.policyOverrides).some((capability) => !(capability in manifest.access)) ||
    operationCapabilities.some((capability) => !validPolicy(capability)) ||
    operationCapabilities.some((capability) => (resolvePolicy(capability).receipt === "public-maintenance-operation") !==
        Number.isSafeInteger(manifest.workDeadlineMs[capability])) ||
    Object.entries(manifest.workDeadlineMs).some(([capability, deadline]) => !(capability in manifest.access) ||
        !Number.isSafeInteger(deadline) ||
        Number(deadline) < 100 ||
        Number(deadline) > 30 * 60_000)) {
    throw new Error("invalid_production_operation_manifest");
}
export const SYNTHESIS_PRODUCTION_RPC_TRANSPORT_GRACE_MS = 2_000;
export const SYNTHESIS_PRODUCTION_RPC_TRANSPORT_ERRORS = Object.freeze({
    canceled: "request_canceled",
    timeout: "request_timeout",
    invalidResponse: "response_invalid",
    unavailable: "service_unavailable",
});
export function synthesisProductionOperationDeadlineMs(capability) {
    return manifest.deadlineOverridesMs[capability] ?? manifest.deadlineMs;
}
export function synthesisProductionOperationWorkDeadlineMs(capability) {
    const deadline = manifest.workDeadlineMs[capability];
    if (!Number.isSafeInteger(deadline)) {
        throw new Error("production_operation_has_no_work_deadline");
    }
    return deadline;
}
export function synthesisProductionOperationPolicy(capability) {
    return {
        ...resolvePolicy(capability),
        controlTargetBytes: manifest.controlTargetBytes,
        requestBytes: manifest.requestBytes,
        responseBytes: manifest.responseBytes,
    };
}
export function synthesisProductionTransportDeadlineMs(capability) {
    return (synthesisProductionOperationDeadlineMs(capability) +
        SYNTHESIS_PRODUCTION_RPC_TRANSPORT_GRACE_MS);
}
