let diagnosticVerboseOverrideForTests;
export function isDiagnosticVerboseEnabled() {
    if (typeof diagnosticVerboseOverrideForTests === "boolean") {
        return diagnosticVerboseOverrideForTests;
    }
    return (readVerboseFlag("ZOTERO_TEST_VERBOSE") ||
        readVerboseFlag("ZOTERO_AGENTS_VERBOSE"));
}
export function setDiagnosticVerboseOverrideForTests(enabled) {
    if (typeof enabled === "boolean") {
        diagnosticVerboseOverrideForTests = enabled;
        return;
    }
    diagnosticVerboseOverrideForTests = undefined;
}
export function emitVerboseConsole(level, ...args) {
    if (!isDiagnosticVerboseEnabled()) {
        return;
    }
    const runtimeConsole = globalThis.console;
    const method = runtimeConsole?.[level] || runtimeConsole?.log;
    if (typeof method === "function") {
        method(...args);
    }
}
function readVerboseFlag(name) {
    const value = readRuntimeEnv(name);
    if (typeof value === "undefined") {
        return false;
    }
    return isTruthyDiagnosticFlag(value);
}
function readRuntimeEnv(name) {
    const runtime = globalThis;
    const fromProcess = runtime.process?.env?.[name];
    if (typeof fromProcess !== "undefined") {
        return fromProcess;
    }
    try {
        return runtime.Services?.env?.get?.(name);
    }
    catch {
        return undefined;
    }
}
export function isTruthyDiagnosticFlag(value) {
    const normalized = String(value || "")
        .trim()
        .toLowerCase();
    return (normalized === "1" ||
        normalized === "true" ||
        normalized === "yes" ||
        normalized === "on" ||
        normalized === "verbose");
}
