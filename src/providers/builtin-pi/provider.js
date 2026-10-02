import { BUILTIN_PI_BACKEND_TYPE, BUILTIN_PI_REQUEST_KIND, } from "../../config/defaults";
const projections = new Map();
/** Publishes one owner state change; `null` removes the projection. */
export function updatePiSkillRunProviderProjection(requestId, projection) {
    const normalized = String(requestId || "").trim();
    if (!normalized) {
        return;
    }
    if (projection) {
        projections.set(normalized, projection);
        return;
    }
    projections.delete(normalized);
}
export function readPiSkillRunProviderProjection(requestId) {
    const normalized = String(requestId || "").trim();
    return normalized ? projections.get(normalized) : undefined;
}
export function resetPiSkillRunProviderProjectionsForTests() {
    projections.clear();
}
const COORDINATOR_UNAVAILABLE_CODE = "pi_skill_run_coordinator_unavailable";
async function resolvePiSkillRunCoordinator() {
    if (typeof __PI_RUNTIME_ENABLED__ === "undefined" || __PI_RUNTIME_ENABLED__) {
        const loaded = (await import("../../modules/piSkillRun").catch(() => undefined));
        return loaded?.getPiSkillRunCoordinator?.() ?? null;
    }
    return null;
}
export class BuiltinPiProvider {
    id = BUILTIN_PI_BACKEND_TYPE;
    supports(args) {
        return (String(args.backend.type || "").trim() === BUILTIN_PI_BACKEND_TYPE &&
            String(args.requestKind || "").trim() === BUILTIN_PI_REQUEST_KIND);
    }
    async execute(args) {
        if (!this.supports(args)) {
            throw new Error("Unsupported request kind/backend for BuiltinPiProvider: requestKind=" +
                args.requestKind +
                ", backendType=" +
                args.backend.type);
        }
        const coordinator = await resolvePiSkillRunCoordinator();
        if (!coordinator) {
            const error = new Error(COORDINATOR_UNAVAILABLE_CODE);
            error.code = COORDINATOR_UNAVAILABLE_CODE;
            throw error;
        }
        return coordinator.execute(args);
    }
}
