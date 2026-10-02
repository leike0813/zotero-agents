import { projectAcpDiagnosticEvidence, } from "./acpDiagnostics";
import { isDebugModeEnabled } from "../../debugMode";
import { appendRuntimeLog } from "../../runtimeLogManager";
export function recordAcpRuntimeDiagnostic(args) {
    const evidence = projectAcpDiagnosticEvidence(args.entry);
    try {
        if (evidence.level === "warn" || evidence.level === "error") {
            appendRuntimeLog({
                level: evidence.level,
                scope: "provider",
                providerId: "acp",
                backendId: args.backendId,
                requestId: args.requestId,
                component: args.surface,
                operation: "diagnostic",
                stage: evidence.stage || evidence.kind,
                message: evidence.message,
                details: {
                    ownerKey: args.ownerKey,
                    kind: evidence.kind,
                    detail: evidence.detail,
                    errorName: evidence.errorName,
                    code: evidence.code,
                },
            });
        }
    }
    catch {
        // Diagnostic evidence must never alter ACP execution or presentation state.
    }
    if (isDebugModeEnabled()) {
        try {
            args.debugAuditSink?.(evidence);
        }
        catch {
            // Audit evidence is best-effort and cannot fail the diagnostic producer.
        }
    }
}
