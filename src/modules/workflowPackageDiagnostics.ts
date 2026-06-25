import { isDebugModeEnabled } from "./debugMode";
import { isDiagnosticVerboseEnabled } from "./diagnosticVerbosity";
import {
  appendRuntimeLog,
  setRuntimeLogAllowedLevels,
  setRuntimeLogDiagnosticMode,
  type RuntimeLogInput,
  type RuntimeLogLevel,
  type RuntimeLogScope,
} from "./runtimeLogManager";

type DiagnosticRuntimeLike = {
  zotero?: {
    debug?: (message: string) => void;
  } | null;
  workflowId?: string;
  packageId?: string;
  workflowSourceKind?: string;
  hookName?: string;
};

export function summarizeWorkflowRuntimeCapabilities(
  runtime?: {
    zotero?: unknown;
    addon?: unknown;
    fetch?: unknown;
    Buffer?: unknown;
    btoa?: unknown;
    atob?: unknown;
    TextEncoder?: unknown;
    TextDecoder?: unknown;
    FileReader?: unknown;
    navigator?: unknown;
  } | null,
) {
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

function normalizeErrorDetails(error: unknown) {
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

function resolveConsoleMethod(level: RuntimeLogLevel) {
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

function emitToConsole(args: {
  level: RuntimeLogLevel;
  message: string;
  payload: Record<string, unknown>;
  runtime?: DiagnosticRuntimeLike | null;
}) {
  if (!isDiagnosticVerboseEnabled()) {
    return;
  }
  const label = `[workflow-package-debug] ${args.message}`;
  const method = resolveConsoleMethod(args.level);
  if (method) {
    method(label, args.payload);
  }
  const zoteroDebug =
    args.runtime?.zotero?.debug ||
    (
      globalThis as typeof globalThis & {
        Zotero?: { debug?: (message: string) => void };
      }
    ).Zotero?.debug;
  if (typeof zoteroDebug === "function") {
    try {
      zoteroDebug(`${label} ${JSON.stringify(args.payload)}`);
    } catch {
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

export function emitWorkflowPackageDiagnostic(args: {
  level?: RuntimeLogLevel;
  scope?: RuntimeLogScope;
  workflowId?: string;
  packageId?: string;
  workflowSourceKind?: string;
  hook?: string;
  component?: string;
  operation?: string;
  stage: string;
  message: string;
  filePath?: string;
  moduleSpecifier?: string;
  runtimeCapabilitySummary?: Record<string, unknown>;
  details?: Record<string, unknown> | undefined;
  error?: unknown;
  runtime?: DiagnosticRuntimeLike | null;
}) {
  if (!isWorkflowPackageDiagnosticsEnabled()) {
    return null;
  }
  const level = args.level || "debug";
  const payload: RuntimeLogInput = {
    level,
    scope: args.scope || "system",
    workflowId:
      String(args.workflowId || args.runtime?.workflowId || "").trim() ||
      undefined,
    component: String(args.component || "workflow-package-runtime").trim(),
    operation: String(args.operation || "").trim() || undefined,
    stage: String(args.stage || "unknown").trim() || "unknown",
    message: String(args.message || "").trim() || "workflow-package diagnostic",
    details: {
      packageId:
        String(args.packageId || args.runtime?.packageId || "").trim() ||
        undefined,
      workflowSourceKind:
        String(
          args.workflowSourceKind || args.runtime?.workflowSourceKind || "",
        ).trim() || undefined,
      hook:
        String(args.hook || args.runtime?.hookName || "").trim() || undefined,
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
