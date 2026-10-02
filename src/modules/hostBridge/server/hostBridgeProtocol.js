import { HOST_BRIDGE_CLI_SCHEMA, HOST_BRIDGE_PROTOCOL, } from "../../../shared/hostBridgeAgentContract";
export const HOST_BRIDGE_PROTOCOL_VERSION = HOST_BRIDGE_PROTOCOL;
export { HOST_BRIDGE_CLI_SCHEMA };
export function hostBridgeOk(result) {
    return {
        status: "ok",
        result,
    };
}
export function hostBridgeError(code, message, category, details, control) {
    const handleConsumption = control?.handleConsumption ??
        (code === "agent_run_already_consumed" ? "consumed" : "unconsumed");
    const retryable = control?.retryable ??
        ["bridge_unavailable", "download_failed", "upload_failed"].includes(code);
    const safeNextActions = control?.safeNextActions ||
        (code.startsWith("agent_run_") || code === "invalid_bundle"
            ? ["workflow agent-apply-status", "surface describe workflow agent-apply"]
            : retryable
                ? ["bridge status", "retry command"]
                : ["surface describe"]);
    return {
        status: "error",
        error: {
            code,
            message,
            category,
            retryable,
            stateChange: control?.stateChange ??
                (handleConsumption === "consumed" ? "changed" : "unchanged"),
            handleConsumption,
            safeNextActions,
            ...(control?.nextCommand ? { nextCommand: control.nextCommand } : {}),
            ...(details ? { details } : {}),
        },
    };
}
