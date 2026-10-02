import { isDebugModeEnabled } from "../../debugMode";
import { isDiagnosticVerboseEnabled } from "../../diagnosticVerbosity";
import { appendRuntimeLog, setRuntimeLogAllowedLevels, setRuntimeLogDiagnosticMode, } from "../../runtimeLogManager";
export function summarizeWorkflowRuntimeCapabilities(runtime) {
    return {
        zotero: !!runtime?.zotero,
        addon: !!runtime?.addon,
        fetch: typeof runtime?.fetch === "function",
        Buffer: !!runtime?.Buffer,
        btoa: typeof runtime?.btoa === "function",
        atob: typeof runtime?.atob === "function",
        TextEncoder: !!runtime?.TextEncoder,
        TextDecoder: !!runtime?.TextDecoder,
        FileReader: !!runtime?.FileReader,
        navigator: !!runtime?.navigator,
    };
}
function normalizeErrorDetails(error) {
    if (!error) {
        return undefined;
    }
    if (error instanceof Error) {
        return {
            name: error.name,
            message: error.message,
            stack: error.stack,
        };
    }
    return {
        message: String(error),
    };
}
function resolveConsoleMethod(level) {
    const runtimeConsole = globalThis.console;
    if (!runtimeConsole) {
        return null;
    }
    if (level === "error" && typeof runtimeConsole.error === "function") {
        return runtimeConsole.error.bind(runtimeConsole);
    }
    if (level === "warn" && typeof runtimeConsole.warn === "function") {
        return runtimeConsole.warn.bind(runtimeConsole);
    }
    if (level === "info" && typeof runtimeConsole.info === "function") {
        return runtimeConsole.info.bind(runtimeConsole);
    }
    if (typeof runtimeConsole.debug === "function") {
        return runtimeConsole.debug.bind(runtimeConsole);
    }
    if (typeof runtimeConsole.log === "function") {
        return runtimeConsole.log.bind(runtimeConsole);
    }
    return null;
}
function emitToConsole(args) {
    if (!isDiagnosticVerboseEnabled()) {
        return;
    }
    const label = `[workflow-package-debug] ${args.message}`;
    const method = resolveConsoleMethod(args.level);
    if (method) {
        method(label, args.payload);
    }
    const zoteroDebug = args.runtime?.zotero?.debug ||
        globalThis.Zotero?.debug;
    if (typeof zoteroDebug === "function") {
        try {
            zoteroDebug(`${label} ${JSON.stringify(args.payload)}`);
        }
        catch {
            zoteroDebug(label);
        }
    }
}
export function isWorkflowPackageDiagnosticsEnabled() {
    return isDebugModeEnabled();
}
export function enableWorkflowPackageDiagnosticsForDebugMode() {
    if (!isWorkflowPackageDiagnosticsEnabled()) {
        return false;
    }
    setRuntimeLogAllowedLevels(["debug", "info", "warn", "error"]);
    setRuntimeLogDiagnosticMode(true);
    emitWorkflowPackageDiagnostic({
        level: "info",
        scope: "system",
        component: "workflow-package-debug",
        stage: "workflow-package-debug-enabled",
        message: "workflow-package runtime diagnostics enabled by debug mode",
    });
    return true;
}
export function emitWorkflowPackageDiagnostic(args) {
    if (!isWorkflowPackageDiagnosticsEnabled()) {
        return null;
    }
    const level = args.level || "debug";
    const payload = {
        level,
        scope: args.scope || "system",
        workflowId: String(args.workflowId || args.runtime?.workflowId || "").trim() ||
            undefined,
        component: String(args.component || "workflow-package-runtime").trim(),
        operation: String(args.operation || "").trim() || undefined,
        stage: String(args.stage || "unknown").trim() || "unknown",
        message: String(args.message || "").trim() || "workflow-package diagnostic",
        details: {
            packageId: String(args.packageId || args.runtime?.packageId || "").trim() ||
                undefined,
            workflowSourceKind: String(args.workflowSourceKind || args.runtime?.workflowSourceKind || "").trim() || undefined,
            hook: String(args.hook || args.runtime?.hookName || "").trim() || undefined,
            filePath: String(args.filePath || "").trim() || undefined,
            moduleSpecifier: String(args.moduleSpecifier || "").trim() || undefined,
            runtimeCapabilitySummary: args.runtimeCapabilitySummary,
            ...(args.details || {}),
        },
        error: args.error,
    };
    const entry = appendRuntimeLog(payload);
    emitToConsole({
        level,
        message: payload.message,
        runtime: args.runtime || null,
        payload: {
            stage: payload.stage,
            workflowId: payload.workflowId,
            component: payload.component,
            operation: payload.operation,
            details: payload.details,
            error: normalizeErrorDetails(args.error),
        },
    });
    return entry;
}
