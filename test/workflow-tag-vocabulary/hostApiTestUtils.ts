import {
  clearRuntimeLogs,
  resetRuntimeLogAllowedLevels,
  subscribeRuntimeLogs,
  type RuntimeLogEntry,
} from "../../src/modules/runtimeLogManager";
import {
  createWorkflowHostApi,
  resetWorkflowHostApiForTests,
  WORKFLOW_HOST_API_VERSION,
} from "../../src/workflows/hostApi";
import {
  installRuntimeBridgeOverrideForTests,
  resetRuntimeBridgeOverrideForTests,
} from "../../src/utils/runtimeBridge";

const HOST_API_KEY = "__zsHostApi";
const HOST_API_VERSION_KEY = "__zsHostApiVersion";
const EXTERNAL_RUNTIME_BRIDGE_OVERRIDE_KEY = "__zsRuntimeBridgeOverride";

type ToastCaptureEntry = {
  text?: string;
  type?: string;
};

type MockFetch = (
  input: string,
  init?: Record<string, unknown>,
) => Promise<{
  ok: boolean;
  status: number;
  statusText?: string;
  json: () => Promise<unknown>;
}>;

type FetchTarget = {
  fetch?: typeof globalThis.fetch;
  __zsRuntimeBridgeOverride?: Record<string, unknown>;
};

type FetchTargetSnapshot = {
  target: FetchTarget;
  descriptor?: PropertyDescriptor;
  overrideDescriptor?: PropertyDescriptor;
};

function collectWorkflowFetchTargets() {
  const targets: FetchTarget[] = [];
  const pushTarget = (candidate: unknown) => {
    if (!candidate || typeof candidate !== "object") {
      return;
    }
    const target = candidate as FetchTarget;
    if (!targets.includes(target)) {
      targets.push(target);
    }
  };

  const runtime = globalThis as typeof globalThis & {
    Services?: {
      appShell?: {
        hiddenDOMWindow?: Window;
      };
    };
    addon?: {
      data?: {
        dialog?: { window?: Window };
        prefs?: { window?: Window };
      };
    };
  };

  pushTarget(runtime);
  pushTarget(runtime.Zotero?.getMainWindow?.());
  pushTarget(runtime.Services?.appShell?.hiddenDOMWindow);
  pushTarget(runtime.addon?.data?.dialog?.window);
  pushTarget(runtime.addon?.data?.prefs?.window);
  return targets;
}

export function installTagVocabularyHostApiGlobals(
  args: {
    hostApi?: Record<string, unknown>;
    hostApiVersion?: number;
  } = {},
) {
  const runtime = globalThis as typeof globalThis & Record<string, unknown>;
  const previousHostApi = runtime[HOST_API_KEY];
  const previousHostApiVersion = runtime[HOST_API_VERSION_KEY];
  resetWorkflowHostApiForTests();
  runtime[HOST_API_KEY] = args.hostApi || createWorkflowHostApi();
  runtime[HOST_API_VERSION_KEY] =
    args.hostApiVersion || WORKFLOW_HOST_API_VERSION;
  return () => {
    if (typeof previousHostApi === "undefined") {
      delete runtime[HOST_API_KEY];
    } else {
      runtime[HOST_API_KEY] = previousHostApi;
    }
    if (typeof previousHostApiVersion === "undefined") {
      delete runtime[HOST_API_VERSION_KEY];
    } else {
      runtime[HOST_API_VERSION_KEY] = previousHostApiVersion;
    }
    resetWorkflowHostApiForTests();
  };
}

export function installWorkflowToastCapture(toasts: ToastCaptureEntry[]) {
  const runtime = globalThis as typeof globalThis & {
    ztoolkit?: {
      ProgressWindow?: new (
        title: string,
        options?: Record<string, unknown>,
      ) => {
        createLine: (args: {
          text?: string;
          type?: string;
          progress?: number;
        }) => {
          show: () => { startCloseTimer?: (delayMs: number) => unknown };
        };
      };
    };
  };
  const hadToolkit = Boolean(runtime.ztoolkit);
  const previousProgressWindow = runtime.ztoolkit?.ProgressWindow;
  runtime.ztoolkit = runtime.ztoolkit || {};
  runtime.ztoolkit.ProgressWindow = class MockProgressWindow {
    createLine(args: { text?: string; type?: string }) {
      toasts.push({
        text: String(args?.text || ""),
        type: String(args?.type || "default"),
      });
      return {
        show() {
          return {
            startCloseTimer() {
              return undefined;
            },
          };
        },
      };
    }
  };
  return () => {
    if (hadToolkit) {
      runtime.ztoolkit!.ProgressWindow = previousProgressWindow;
    } else {
      delete runtime.ztoolkit;
    }
  };
}

export function installRuntimeLogCapture(logs: RuntimeLogEntry[]) {
  clearRuntimeLogs();
  resetRuntimeLogAllowedLevels();
  const unsubscribe = subscribeRuntimeLogs((snapshot) => {
    logs.splice(0, logs.length, ...snapshot.entries);
  });
  return () => {
    unsubscribe();
    clearRuntimeLogs();
    resetRuntimeLogAllowedLevels();
  };
}

export function installTagVocabularySyncCapture(args: {
  logs?: RuntimeLogEntry[];
  toasts?: ToastCaptureEntry[];
}) {
  const restoreLogs = args.logs
    ? installRuntimeLogCapture(args.logs)
    : () => undefined;
  const restoreToasts = args.toasts
    ? installWorkflowToastCapture(args.toasts)
    : () => undefined;
  return () => {
    restoreToasts();
    restoreLogs();
  };
}

export function installWorkflowFetchMockAcrossRuntimes(mockFetch: MockFetch) {
  const fetchImpl = mockFetch as typeof globalThis.fetch;
  const targets = collectWorkflowFetchTargets();
  const previous: FetchTargetSnapshot[] = targets.map((target) => ({
    target,
    descriptor: Object.getOwnPropertyDescriptor(target, "fetch"),
    overrideDescriptor: Object.getOwnPropertyDescriptor(
      target,
      EXTERNAL_RUNTIME_BRIDGE_OVERRIDE_KEY,
    ),
  }));
  installRuntimeBridgeOverrideForTests({
    fetch: fetchImpl,
  });
  for (const target of targets) {
    try {
      Object.defineProperty(target, EXTERNAL_RUNTIME_BRIDGE_OVERRIDE_KEY, {
        value: {
          ...(target[EXTERNAL_RUNTIME_BRIDGE_OVERRIDE_KEY] || {}),
          fetch: fetchImpl,
        },
        configurable: true,
        writable: true,
      });
    } catch {
      // ignore protected windows; fallback paths below may still work
    }
    try {
      Object.defineProperty(target, "fetch", {
        value: fetchImpl,
        configurable: true,
        writable: true,
      });
    } catch {
      try {
        target.fetch = fetchImpl;
      } catch {
        // ignore non-writable window fetch in real Zotero runtime
      }
    }
  }
  return () => {
    for (const snapshot of previous) {
      try {
        if (snapshot.overrideDescriptor) {
          Object.defineProperty(
            snapshot.target,
            EXTERNAL_RUNTIME_BRIDGE_OVERRIDE_KEY,
            snapshot.overrideDescriptor,
          );
        } else {
          delete snapshot.target[EXTERNAL_RUNTIME_BRIDGE_OVERRIDE_KEY];
        }
      } catch {
        // ignore restore failures on protected window override slot
      }
      try {
        if (snapshot.descriptor) {
          Object.defineProperty(snapshot.target, "fetch", snapshot.descriptor);
        } else {
          delete snapshot.target.fetch;
        }
      } catch {
        if (snapshot.descriptor && "value" in snapshot.descriptor) {
          try {
            snapshot.target.fetch = snapshot.descriptor.value as
              | typeof globalThis.fetch
              | undefined;
          } catch {
            // ignore restore failures on protected window fetch
          }
        } else {
          try {
            delete snapshot.target.fetch;
          } catch {
            // ignore restore failures on protected window fetch
          }
        }
      }
    }
    resetRuntimeBridgeOverrideForTests();
  };
}
