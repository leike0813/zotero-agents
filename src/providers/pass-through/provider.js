import { PASS_THROUGH_BACKEND_TYPE, PASS_THROUGH_REQUEST_KIND, } from "../../config/defaults";
import { appendRuntimeLog } from "../../modules/runtimeLogManager";
function generateRequestId() {
    return `pass-through-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
export class PassThroughProvider {
    id = PASS_THROUGH_BACKEND_TYPE;
    requiresBackendProfile = false;
    getRuntimeOptionSchema() {
        return {};
    }
    normalizeRuntimeOptions() {
        return {};
    }
    supports(args) {
        return (args.backend.type === PASS_THROUGH_BACKEND_TYPE &&
            args.requestKind === PASS_THROUGH_REQUEST_KIND);
    }
    async execute(args) {
        if (!this.supports(args)) {
            throw new Error(`Unsupported request kind/backend for PassThroughProvider: requestKind=${args.requestKind}, backendType=${args.backend.type}`);
        }
        const request = args.request;
        if (request.kind !== PASS_THROUGH_REQUEST_KIND) {
            throw new Error(`Unsupported pass-through request payload kind: ${String(request.kind || "")}`);
        }
        appendRuntimeLog({
            level: "info",
            scope: "provider",
            backendId: args.backend.id,
            backendType: args.backend.type,
            providerId: this.id,
            component: "pass-through-provider",
            operation: "execute",
            phase: "start",
            stage: "provider-execute-start",
            message: "pass-through provider execute started",
            details: {
                requestKind: args.requestKind,
            },
        });
        const resultJson = {
            kind: PASS_THROUGH_REQUEST_KIND,
            selectionContext: request.selectionContext,
            parameter: request.parameter || {},
            requestMeta: {
                targetParentRef: request.targetParentRef,
                taskName: request.taskName,
                sourceAttachmentRefs: request.sourceAttachmentRefs || [],
            },
        };
        const requestId = generateRequestId();
        appendRuntimeLog({
            level: "info",
            scope: "provider",
            backendId: args.backend.id,
            backendType: args.backend.type,
            providerId: this.id,
            requestId,
            component: "pass-through-provider",
            operation: "execute",
            phase: "terminal",
            stage: "provider-execute-succeeded",
            message: "pass-through provider execute succeeded",
        });
        return {
            status: "succeeded",
            requestId,
            fetchType: "result",
            resultJson,
            responseJson: resultJson,
        };
    }
}
