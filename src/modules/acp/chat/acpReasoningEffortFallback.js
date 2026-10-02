import { resolveAcpAgentFamily } from "../skillRun/acpAgentFamilyResolver";
import { RequestError } from "../../acpProtocol";
function normalize(value) {
    return String(value || "")
        .trim()
        .toLowerCase();
}
function isKiloEffortInvalidParametersFallback(args) {
    return (!!args.backend &&
        resolveAcpAgentFamily(args.backend) === "kilo" &&
        normalize(args.category) === "thought_level" &&
        args.error instanceof RequestError &&
        args.error.code === -32602 &&
        /effort/i.test(String(args.error.message || "")));
}
export async function applyAcpReasoningEffortWithFallback(args) {
    try {
        const applied = (await args.adapter.setConfigOption?.({
            sessionId: args.sessionId,
            category: "thought_level",
            value: args.effortId,
        })) === true;
        return applied ? { kind: "applied" } : { kind: "unavailable" };
    }
    catch (error) {
        const fallbackArgs = {
            backend: args.backend,
            category: "thought_level",
            value: args.effortId,
            error,
        };
        if (isKiloEffortInvalidParametersFallback(fallbackArgs)) {
            return { kind: "fallback", error: fallbackArgs.error };
        }
        throw error;
    }
}
