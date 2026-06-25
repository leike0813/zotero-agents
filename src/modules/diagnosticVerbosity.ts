let diagnosticVerboseOverrideForTests: boolean | undefined;

export function isDiagnosticVerboseEnabled() {
  if (typeof diagnosticVerboseOverrideForTests === "boolean") {
    return diagnosticVerboseOverrideForTests;
  }
  return (
    readVerboseFlag("ZOTERO_TEST_VERBOSE") ||
    readVerboseFlag("ZOTERO_AGENTS_VERBOSE")
  );
}

export function setDiagnosticVerboseOverrideForTests(enabled?: boolean) {
  if (typeof enabled === "boolean") {
    diagnosticVerboseOverrideForTests = enabled;
    return;
  }
  diagnosticVerboseOverrideForTests = undefined;
}

export function emitVerboseConsole(
  level: "debug" | "error" | "info" | "log" | "warn",
  ...args: unknown[]
) {
  if (!isDiagnosticVerboseEnabled()) {
    return;
  }
  const runtimeConsole = globalThis.console as unknown as
    | Record<string, ((...args: unknown[]) => void) | undefined>
    | undefined;
  const method = runtimeConsole?.[level] || runtimeConsole?.log;
  if (typeof method === "function") {
    method(...args);
  }
}

function readVerboseFlag(name: string) {
  const value = readRuntimeEnv(name);
  if (typeof value === "undefined") {
    return false;
  }
  return isTruthyDiagnosticFlag(value);
}

function readRuntimeEnv(name: string) {
  const runtime = globalThis as {
    process?: { env?: Record<string, string | undefined> };
    Services?: { env?: { get?: (name: string) => string | undefined } };
  };
  const fromProcess = runtime.process?.env?.[name];
  if (typeof fromProcess !== "undefined") {
    return fromProcess;
  }
  try {
    return runtime.Services?.env?.get?.(name);
  } catch {
    return undefined;
  }
}

export function isTruthyDiagnosticFlag(value: unknown) {
  const normalized = String(value || "")
    .trim()
    .toLowerCase();
  return (
    normalized === "1" ||
    normalized === "true" ||
    normalized === "yes" ||
    normalized === "on" ||
    normalized === "verbose"
  );
}
