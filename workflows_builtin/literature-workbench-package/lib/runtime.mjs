const MIN_HOST_API_VERSION = 2;
const MAX_HOST_API_VERSION = 5;
const GLOBAL_HOST_API_KEY = "__zsHostApi";
const GLOBAL_HOST_API_VERSION_KEY = "__zsHostApiVersion";
const runtimeScopeStack = [];

function isObjectLike(value) {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function resolveCurrentWorkflowExecutionRuntime(runtime) {
  if (isObjectLike(runtime)) {
    return runtime;
  }
  return runtimeScopeStack.length
    ? runtimeScopeStack[runtimeScopeStack.length - 1]
    : null;
}

function resolveHostApi(runtime) {
  const scopedRuntime = resolveCurrentWorkflowExecutionRuntime(runtime);
  if (scopedRuntime?.hostApi && typeof scopedRuntime.hostApi === "object") {
    return scopedRuntime.hostApi;
  }
  if (
    globalThis?.[GLOBAL_HOST_API_KEY] &&
    typeof globalThis[GLOBAL_HOST_API_KEY] === "object"
  ) {
    return globalThis[GLOBAL_HOST_API_KEY];
  }
  return null;
}

function resolveHostApiVersion(runtime) {
  const scopedRuntime = resolveCurrentWorkflowExecutionRuntime(runtime);
  if (typeof scopedRuntime?.hostApiVersion === "number") {
    return scopedRuntime.hostApiVersion;
  }
  const fromGlobal = Number(globalThis?.[GLOBAL_HOST_API_VERSION_KEY] || 0);
  return Number.isFinite(fromGlobal) && fromGlobal > 0 ? fromGlobal : 0;
}

function resolveDiagnosticContext(runtime) {
  const scopedRuntime = resolveCurrentWorkflowExecutionRuntime(runtime);
  return {
    workflowId: String(scopedRuntime?.workflowId || "").trim() || undefined,
    packageId: String(scopedRuntime?.packageId || "").trim() || undefined,
    workflowSourceKind:
      String(scopedRuntime?.workflowSourceKind || "").trim() || undefined,
    hook: String(scopedRuntime?.hookName || "").trim() || undefined,
    debugMode: scopedRuntime?.debugMode === true,
  };
}

function appendDiagnosticLog(runtime, entry) {
  const hostApi = resolveHostApi(runtime);
  if (hostApi?.logging && typeof hostApi.logging.appendRuntimeLog === "function") {
    hostApi.logging.appendRuntimeLog(entry);
  }
}

function emitAccessorDiagnostic(args) {
  const context = resolveDiagnosticContext(args?.runtime);
  if (!context.debugMode) {
    return;
  }
  appendDiagnosticLog(args.runtime, {
    level: args.level || "debug",
    scope: "hook",
    workflowId: context.workflowId,
    component: "reference-workbench-runtime",
    operation: args.operation || "runtime-accessor",
    stage: String(args.stage || "unknown").trim() || "unknown",
    message:
      String(args.message || "").trim() ||
      "reference workbench runtime diagnostic",
    details: {
      packageId: context.packageId,
      workflowSourceKind: context.workflowSourceKind,
      hook: context.hook,
      ...(args.details || {}),
    },
    error: args.error,
  });
}

function createHostContractError(runtime, message) {
  const error = new Error(
    String(message || "").trim() ||
      "workflow-package host contract v1 removed; use runtime.hostApi",
  );
  try {
    error.hostApiVersion = resolveHostApiVersion(runtime);
  } catch {
    // ignore
  }
  return error;
}

export async function withPackageRuntimeScope(runtime, work) {
  const normalized = isObjectLike(runtime) ? runtime : {};
  runtimeScopeStack.push(normalized);
  try {
    return await work();
  } finally {
    runtimeScopeStack.pop();
  }
}

export { resolveCurrentWorkflowExecutionRuntime };

function resolvePerformanceProbeHooks() {
  const hostApi = resolveHostApi();
  const viaHostApi = hostApi?.logging?.recordPerformanceSpanForTests;
  if (typeof viaHostApi === "function") {
    return {
      recordSpan: viaHostApi,
    };
  }
  const hooks = globalThis?.__zs_test_performance_probe_hooks__;
  if (
    hooks &&
    hooks.enabled === true &&
    typeof hooks.recordSpan === "function"
  ) {
    return hooks;
  }
  return null;
}

export async function measureWorkflowTestSpan(name, labels, work) {
  const hooks = resolvePerformanceProbeHooks();
  if (!hooks) {
    return work();
  }
  const startedAt = Date.now();
  try {
    return await work();
  } finally {
    hooks.recordSpan({
      name: String(name || "").trim() || "workflow-span",
      startedAt,
      durationMs: Date.now() - startedAt,
      labels: isObjectLike(labels) ? labels : {},
    });
  }
}

export function requireHostApi(runtime, message) {
  const hostApi = resolveHostApi(runtime);
  if (!hostApi) {
    throw createHostContractError(
      runtime,
      message || "workflow-package host contract v1 removed; use runtime.hostApi",
    );
  }
  const version = resolveHostApiVersion(runtime);
  if (
    !Number.isFinite(version) ||
    version < MIN_HOST_API_VERSION ||
    version > MAX_HOST_API_VERSION
  ) {
    throw createHostContractError(
      runtime,
      `workflow-package hostApi version mismatch: expected ${MIN_HOST_API_VERSION}-${MAX_HOST_API_VERSION}, received ${String(version || "missing")}`,
    );
  }
  return hostApi;
}

export function requireHostItems(runtime, message) {
  const items = requireHostApi(runtime, message).items;
  if (!items || typeof items.get !== "function") {
    emitAccessorDiagnostic({
      runtime,
      level: "error",
      operation: "host-items",
      stage: "runtime-items-missing",
      message: "items API is unavailable in current runtime",
    });
    throw createHostContractError(
      runtime,
      "host capability missing: items",
    );
  }
  return items;
}

export function requireHostEditor(runtime, message) {
  const editor = requireHostApi(runtime, message).editor;
  if (!editor || typeof editor.openSession !== "function") {
    throw createHostContractError(runtime, "host capability missing: editor");
  }
  return editor;
}

export function resolveAddonConfig(runtime) {
  const hostApi = resolveHostApi(runtime);
  if (!hostApi) {
    return {
      addonName: "Zotero Skills",
      addonRef: "",
      prefsPrefix: "extensions.zotero.zotero-skills",
    };
  }
  return hostApi.addon?.getConfig?.() || {
    addonName: "Zotero Skills",
    addonRef: "",
    prefsPrefix: "extensions.zotero.zotero-skills",
  };
}

export function resolveRuntimeFetch(runtime) {
  const scopedRuntime = resolveCurrentWorkflowExecutionRuntime(runtime);
  if (typeof scopedRuntime?.fetch === "function") {
    return scopedRuntime.fetch;
  }
  if (typeof globalThis?.fetch === "function") {
    return globalThis.fetch.bind(globalThis);
  }
  throw createHostContractError(runtime, "runtime fetch is unavailable");
}

function resolveRuntimeBuffer(runtime) {
  const scopedRuntime = resolveCurrentWorkflowExecutionRuntime(runtime);
  if (scopedRuntime?.Buffer && typeof scopedRuntime.Buffer.from === "function") {
    return scopedRuntime.Buffer;
  }
  if (globalThis?.Buffer && typeof globalThis.Buffer.from === "function") {
    return globalThis.Buffer;
  }
  return null;
}

function resolveRuntimeBtoa(runtime) {
  const scopedRuntime = resolveCurrentWorkflowExecutionRuntime(runtime);
  if (typeof scopedRuntime?.btoa === "function") {
    return scopedRuntime.btoa;
  }
  if (typeof globalThis?.btoa === "function") {
    return globalThis.btoa.bind(globalThis);
  }
  return null;
}

function resolveRuntimeAtob(runtime) {
  const scopedRuntime = resolveCurrentWorkflowExecutionRuntime(runtime);
  if (typeof scopedRuntime?.atob === "function") {
    return scopedRuntime.atob;
  }
  if (typeof globalThis?.atob === "function") {
    return globalThis.atob.bind(globalThis);
  }
  return null;
}

export function encodeRuntimeBase64Utf8(text, runtime) {
  const BufferCtor = resolveRuntimeBuffer(runtime);
  if (BufferCtor) {
    return BufferCtor.from(String(text || ""), "utf8").toString("base64");
  }
  const btoaImpl = resolveRuntimeBtoa(runtime);
  if (!btoaImpl) {
    throw createHostContractError(runtime, "runtime base64 encoder is unavailable");
  }
  return btoaImpl(
    unescape(encodeURIComponent(String(text || ""))),
  );
}

export function decodeRuntimeBase64Utf8(text, runtime) {
  const BufferCtor = resolveRuntimeBuffer(runtime);
  if (BufferCtor) {
    return BufferCtor.from(String(text || ""), "base64").toString("utf8");
  }
  const atobImpl = resolveRuntimeAtob(runtime);
  if (!atobImpl) {
    throw createHostContractError(runtime, "runtime base64 decoder is unavailable");
  }
  return decodeURIComponent(escape(atobImpl(String(text || ""))));
}
