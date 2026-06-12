import { config } from "../../package.json";
import { getString, getStringOrFallback } from "../utils/locale";
import {
  SYNTHESIS_WORKBENCH_DEFAULT_MESSAGES,
  SYNTHESIS_WORKBENCH_MESSAGE_KEYS,
  type SynthesisWorkbenchI18nEnvelope,
  type SynthesisWorkbenchMessageKey,
} from "../synthesisWorkbenchI18n";
import { resolveAddonRef, resolveRuntimeToolkit } from "../utils/runtimeBridge";
import { executeWorkflowFromCurrentSelection } from "./workflowExecute";
import { getLoadedWorkflowEntries } from "./workflowRuntime";
import { alertWindow } from "./workflowExecution/feedbackSeam";
import { getDefaultSynthesisService } from "./synthesis/service";
import { writeRuntimeTextFile } from "./runtimePersistence";
import { isTransientStorageBusyError } from "./guardedSqlite";
import {
  registerSynthesisWorkbenchSidecarChangeListener,
  type SynthesisWorkbenchSidecarChangeEvent,
} from "./synthesisWorkbenchInvalidation";
import {
  applySynthesisUiAction,
  buildSynthesisUiSnapshot,
  createDefaultSynthesisUiState,
  getSynthesisUiOperationKey,
  getSynthesisUiOperationLabel,
  mergeSynthesisUiSnapshotInput,
  type SynthesisUiAction,
  type SynthesisUiActionOperation,
  type SynthesisUiLayoutAlgorithm,
  type SynthesisUiSnapshotInput,
  type SynthesisUiState,
  type SynthesisUiTab,
  type SynthesisWorkbenchSurfaceName,
} from "./synthesis/uiModel";

type SynthesisBridgeMessageType =
  | "synthesis:init"
  | "synthesis:snapshot"
  | "synthesis:chrome"
  | "synthesis:surface"
  | "synthesis:surface-error"
  | "synthesis:topic-detail"
  | "synthesis:digest";

type SynthesisWorkbenchActionEnvelope = {
  type: "synthesis:action";
  action: string;
  payload?: Record<string, unknown>;
};

type SynthesisTopicDetailDto = Record<string, unknown>;

type SynthesisWorkbenchBridge = {
  postMessage: (
    action: string,
    payload?: Record<string, unknown>,
  ) => Promise<void>;
};

type ZoteroTabs = {
  add?: (options: Record<string, unknown>) => {
    id?: string;
    container?: Element;
  };
  select?: (id: string) => unknown;
  close?: (id: string) => unknown;
};

type ToolkitFilePickerCtor = new (
  title: string,
  mode: string,
  filters: [string, string][],
  suggestion: string,
  window: Window | undefined,
  filterMask?: string,
  directory?: string,
) => {
  open: () => Promise<unknown> | unknown;
};

const SYNTHESIS_WORKBENCH_BRIDGE_KEY = "__zoteroSkillsSynthesisWorkbenchBridge";

type SynthesisWorkbenchRuntime = {
  tabId: string;
  window: _ZoteroTypes.MainWindow;
  hostWindow: Window;
  frame: Element;
  frameWindow: Window | null;
  removeMessageListener?: () => void;
  handshakeTimer?: ReturnType<typeof setInterval>;
  commandProgressTimer?: ReturnType<typeof setInterval>;
  commandProgressSnapshotRunning?: boolean;
  handshakeAttemptCount: number;
  handshakeSuccessCount: number;
  handshakeComplete: boolean;
  state: SynthesisUiState;
  snapshotInput?: SynthesisUiSnapshotInput;
  snapshotInputLocked?: boolean;
  loadedSurfaces: Set<SynthesisWorkbenchSurfaceName>;
  dirtySurfaces: Set<SynthesisWorkbenchSurfaceName>;
  surfaceRequestSeq: number;
  latestSurfaceRequestBySurface: Partial<
    Record<SynthesisWorkbenchSurfaceName, number>
  >;
  libraryReadModelRevision: number;
  libraryReadModelDirtyTimer?: ReturnType<typeof setTimeout>;
  inFlightCommands: Map<string, SynthesisUiActionOperation>;
  lastCompletedCommand?: SynthesisUiActionOperation;
  lastFailedCommand?: SynthesisUiActionOperation;
  actionWarnings: SynthesisUiActionOperation[];
};

type SurfaceRefreshRequestMeta = {
  requestId: number;
  surface: SynthesisWorkbenchSurfaceName;
  selectedTabAtRequest: SynthesisUiTab;
  refreshFromService: boolean;
  startedAt: string;
};

function beginSurfaceRefreshRequest(
  runtime: SynthesisWorkbenchRuntime,
  surface: SynthesisWorkbenchSurfaceName,
  refreshFromService: boolean,
): SurfaceRefreshRequestMeta {
  runtime.surfaceRequestSeq += 1;
  const requestId = runtime.surfaceRequestSeq;
  runtime.latestSurfaceRequestBySurface[surface] = requestId;
  return {
    requestId,
    surface,
    selectedTabAtRequest: runtime.state.selectedTab,
    refreshFromService,
    startedAt: new Date().toISOString(),
  };
}

function isLatestSurfaceRefreshRequest(
  runtime: SynthesisWorkbenchRuntime,
  request: SurfaceRefreshRequestMeta,
) {
  return (
    runtime.latestSurfaceRequestBySurface[request.surface] === request.requestId
  );
}

function isActiveSurface(
  runtime: SynthesisWorkbenchRuntime,
  surface: SynthesisWorkbenchSurfaceName,
) {
  return surfaceForTab(runtime.state.selectedTab) === surface;
}

const SYNTHESIS_WORKBENCH_TAB_ID = "zotero-skills-synthesis-workbench";
const SYNTHESIS_WORKBENCH_TAB_ICON = "zotero-skills-workspace";
const SYNTHESIS_WORKBENCH_TAB_ICON_URI = `chrome://${config.addonRef}/content/icons/icon_workbench_32.png`;
const SYNTHESIS_WORKBENCH_EMBEDDED_ID =
  "zotero-skills-synthesis-workbench-embedded";
const SYNTHESIS_WORKBENCH_HANDSHAKE_INTERVAL_MS = 100;
const SYNTHESIS_WORKBENCH_HANDSHAKE_REQUIRED_SUCCESSES = 5;
const SYNTHESIS_WORKBENCH_HANDSHAKE_MAX_ATTEMPTS = 80;
const SYNTHESIS_WORKBENCH_COMMAND_PROGRESS_INTERVAL_MS = 500;
const SYNTHESIS_WORKBENCH_LIBRARY_INVALIDATION_DEBOUNCE_MS = 250;

let synthesisWorkbenchTab: SynthesisWorkbenchRuntime | undefined;
let synthesisLibraryReadModelRevision = 0;
let prewarmedSynthesisSnapshotInput: SynthesisUiSnapshotInput | undefined;
let prewarmSynthesisSurfacesPromise:
  | Promise<SynthesisUiSnapshotInput | undefined>
  | undefined;
const synthesisWorkbenchRuntimes = new Set<SynthesisWorkbenchRuntime>();

export type MountedSynthesisWorkbenchRuntime = {
  refresh: () => Promise<void>;
  cleanup: () => void;
};

function localize(key: string, fallback: string) {
  try {
    const resolved = String(getString(key as any)).trim();
    const fallbackKey = `${config.addonRef}-${key}`;
    return resolved && resolved !== fallbackKey ? resolved : fallback;
  } catch {
    return fallback;
  }
}

function resolveSynthesisWorkbenchLocale() {
  const zoteroLocale = String(
    ((globalThis as any).Zotero?.locale as string) || "",
  );
  const navigatorLocale = String((globalThis as any).navigator?.language || "");
  return zoteroLocale || navigatorLocale || "en-US";
}

function buildSynthesisWorkbenchI18nEnvelope(): SynthesisWorkbenchI18nEnvelope {
  const messages = {} as Record<SynthesisWorkbenchMessageKey, string>;
  for (const key of SYNTHESIS_WORKBENCH_MESSAGE_KEYS) {
    messages[key] = resolveSynthesisWorkbenchMessage(
      key,
      SYNTHESIS_WORKBENCH_DEFAULT_MESSAGES[key],
    );
  }
  return {
    locale: resolveSynthesisWorkbenchLocale(),
    messages,
  };
}

function resolveSynthesisWorkbenchMessage(
  key: SynthesisWorkbenchMessageKey,
  fallback: string,
) {
  const prefixed = getStringOrFallback(key, fallback);
  if (prefixed && prefixed !== fallback) {
    return prefixed;
  }
  try {
    const pattern = (addon.data.locale?.current as any)?.formatMessagesSync?.([
      { id: key },
    ])?.[0];
    const value = String(pattern?.value || "").trim();
    return value && value !== key ? value : fallback;
  } catch {
    return fallback;
  }
}

function withSynthesisWorkbenchI18n(payload: unknown) {
  const i18n = buildSynthesisWorkbenchI18nEnvelope();
  if (payload && typeof payload === "object" && !Array.isArray(payload)) {
    return {
      ...(payload as Record<string, unknown>),
      i18n,
    };
  }
  return { value: payload, i18n };
}

function resolveSynthesisPageUrl() {
  const addonRef = String(config.addonRef || "").trim() || resolveAddonRef("");
  if (!addonRef) {
    return "about:blank";
  }
  return `chrome://${addonRef}/content/synthesis/index.html?ui=20260520-controls-v5`;
}

function resolveWorkflowHostWindow(argsWindow?: _ZoteroTypes.MainWindow) {
  return (
    argsWindow ||
    synthesisWorkbenchTab?.window ||
    ((globalThis as any).Zotero?.getMainWindow?.() as
      | _ZoteroTypes.MainWindow
      | undefined)
  );
}

function resolveZoteroTabs(win: _ZoteroTypes.MainWindow | undefined) {
  return (
    (win as unknown as { Zotero_Tabs?: ZoteroTabs } | undefined)?.Zotero_Tabs ||
    ((globalThis as any).Zotero_Tabs as ZoteroTabs | undefined)
  );
}

function createSynthesisBrowser(doc: Document) {
  const xulDocument = doc as Document & {
    createXULElement?: (tag: string) => Element;
  };
  const frame =
    typeof xulDocument.createXULElement === "function"
      ? xulDocument.createXULElement("browser")
      : doc.createElement("iframe");
  frame.setAttribute("data-zs-role", "synthesis-workbench-frame");
  frame.setAttribute("disableglobalhistory", "true");
  frame.setAttribute("maychangeremoteness", "true");
  frame.setAttribute("flex", "1");
  frame.setAttribute("type", "content");
  frame.setAttribute("transparent", "true");
  (frame as HTMLElement).style.width = "100%";
  (frame as HTMLElement).style.height = "100%";
  (frame as HTMLElement).style.minHeight = "0";
  (frame as HTMLElement).style.border = "none";
  return frame;
}

function setSynthesisBrowserSource(frame: Element, pageUrl: string) {
  if (
    typeof HTMLIFrameElement !== "undefined" &&
    frame instanceof HTMLIFrameElement
  ) {
    frame.src = pageUrl;
    return;
  }
  frame.setAttribute("src", pageUrl);
}

function resolveFrameWindow(frame: Element | null) {
  if (!frame) {
    return null;
  }
  return (
    (frame as Element & { contentWindow?: Window | null }).contentWindow ||
    (frame as Element & { contentDocument?: Document | null }).contentDocument
      ?.defaultView ||
    null
  );
}

function writeSynthesisWorkbenchBridgeTarget(
  target: Record<string, unknown> | null | undefined,
  bridge?: SynthesisWorkbenchBridge,
) {
  if (!target) {
    return;
  }
  if (bridge) {
    target[SYNTHESIS_WORKBENCH_BRIDGE_KEY] = bridge;
    return;
  }
  delete target[SYNTHESIS_WORKBENCH_BRIDGE_KEY];
}

function installSynthesisWorkbenchBridge(runtime: SynthesisWorkbenchRuntime) {
  const frameWindow = runtime.frameWindow || resolveFrameWindow(runtime.frame);
  if (!frameWindow) {
    return false;
  }
  runtime.frameWindow = frameWindow;
  const bridge: SynthesisWorkbenchBridge = {
    postMessage: async (action, payload) => {
      handleAction(runtime, {
        type: "synthesis:action",
        action,
        payload:
          payload && typeof payload === "object" && !Array.isArray(payload)
            ? payload
            : {},
      });
    },
  };
  const directTarget = frameWindow as Window & Record<string, unknown>;
  const wrappedTarget =
    typeof (directTarget as { wrappedJSObject?: unknown }).wrappedJSObject ===
    "object"
      ? ((directTarget as { wrappedJSObject?: Record<string, unknown> })
          .wrappedJSObject as Record<string, unknown>)
      : null;
  writeSynthesisWorkbenchBridgeTarget(directTarget, bridge);
  writeSynthesisWorkbenchBridgeTarget(wrappedTarget, bridge);
  return true;
}

function clearSynthesisWorkbenchBridge(runtime: SynthesisWorkbenchRuntime) {
  const frameWindow = runtime.frameWindow || resolveFrameWindow(runtime.frame);
  if (!frameWindow) {
    return;
  }
  const directTarget = frameWindow as Window & Record<string, unknown>;
  const wrappedTarget =
    typeof (directTarget as { wrappedJSObject?: unknown }).wrappedJSObject ===
    "object"
      ? ((directTarget as { wrappedJSObject?: Record<string, unknown> })
          .wrappedJSObject as Record<string, unknown>)
      : null;
  writeSynthesisWorkbenchBridgeTarget(directTarget, undefined);
  writeSynthesisWorkbenchBridgeTarget(wrappedTarget, undefined);
}

function buildDefaultSnapshotInput(): SynthesisUiSnapshotInput {
  const libraryId = Number(
    (globalThis as any).Zotero?.Libraries?.userLibraryID || 1,
  );
  return {
    libraryId: Number.isFinite(libraryId) && libraryId > 0 ? libraryId : 1,
    storage: {
      rootState: "unbound",
      anchorState: "missing",
      mirrorState: "missing",
    },
    preferences: {
      sourceWatchEnabled: false,
      registryAutoRebuild: false,
      graphRebuildMode: "off",
      stalenessScanEnabled: false,
      debounceMs: 0,
      startupHashCheck: false,
    },
    artifacts: [],
    deletedArtifacts: {
      rows: [],
    },
    registry: {
      rows: [],
    },
    graph: {
      graph_hash: "",
      nodes: [],
      edges: [],
    },
  };
}

function buildSnapshotErrorInput(error: unknown): SynthesisUiSnapshotInput {
  const fallback = buildDefaultSnapshotInput();
  const message =
    error instanceof Error ? error.message : String(error || "unknown error");
  return {
    ...fallback,
    sync: {
      status: "check_skipped",
      diagnostics: [
        {
          code: "synthesis_snapshot_failed",
          severity: "error",
          message,
        },
      ],
      allowedActions: [],
      requiresConfirmation: false,
    },
    maintenance: {
      summary: {
        status: "failed",
        pendingDirtyCount: 0,
        activeWorkerCount: 0,
        canonicalSyncPending: false,
        canonicalEpoch: 0,
        stale: [],
        missing: ["reference-sidecar:library", "citation-graph:library"],
        partial: [],
        recommendedCommands: [],
        diagnostics: [
          {
            code: "synthesis_snapshot_failed",
            severity: "error",
            message,
          },
        ],
      },
      backgroundJobs: [],
    },
  };
}

function surfaceForTab(tab: SynthesisUiTab): SynthesisWorkbenchSurfaceName {
  if (tab === "overview") return "home";
  if (tab === "artifacts") return "topics";
  if (tab === "registry") return "index";
  if (tab === "reviews") return "review";
  return tab;
}

function snapshotForRuntime(runtime: SynthesisWorkbenchRuntime) {
  return buildSynthesisUiSnapshot(
    {
      ...(runtime.snapshotInput || buildDefaultSnapshotInput()),
      actions: actionStatusInput(runtime),
    },
    runtime.state,
  );
}

function mergeRuntimeSnapshotInput(
  runtime: SynthesisWorkbenchRuntime,
  patch: SynthesisUiSnapshotInput | undefined,
) {
  runtime.snapshotInput = mergeSynthesisUiSnapshotInput(
    runtime.snapshotInput || buildDefaultSnapshotInput(),
    patch,
  );
  prewarmedSynthesisSnapshotInput = runtime.snapshotInput;
}

function markSurfaceLoaded(
  runtime: SynthesisWorkbenchRuntime,
  surface: SynthesisWorkbenchSurfaceName,
) {
  runtime.loadedSurfaces.add(surface);
  runtime.dirtySurfaces.delete(surface);
}

function markSurfaceDirty(
  runtime: SynthesisWorkbenchRuntime,
  surface: SynthesisWorkbenchSurfaceName,
) {
  runtime.dirtySurfaces.add(surface);
}

function registerSynthesisWorkbenchRuntime(runtime: SynthesisWorkbenchRuntime) {
  synthesisWorkbenchRuntimes.add(runtime);
}

function scheduleLibraryReadModelSurfaceRefresh(
  runtime: SynthesisWorkbenchRuntime,
  surfaces: SynthesisWorkbenchSurfaceName[],
) {
  if (runtime.libraryReadModelDirtyTimer) {
    clearTimeout(runtime.libraryReadModelDirtyTimer);
  }
  runtime.libraryReadModelDirtyTimer = globalThis.setTimeout(() => {
    runtime.libraryReadModelDirtyTimer = undefined;
    const activeSurface = surfaceForTab(runtime.state.selectedTab);
    if (!surfaces.includes(activeSurface)) {
      return;
    }
    if (!surfaceNeedsServiceRefresh(runtime, activeSurface)) {
      return;
    }
    void sendSurface(runtime, activeSurface, {
      refreshFromService: true,
    });
  }, SYNTHESIS_WORKBENCH_LIBRARY_INVALIDATION_DEBOUNCE_MS);
}

export function notifySynthesisWorkbenchLibraryItemsChanged(args: {
  event: string;
  type: string;
  ids?: Array<string | number>;
  extraData?: Record<string, unknown>;
}) {
  synthesisLibraryReadModelRevision += 1;
  const invalidatedSurfaces: SynthesisWorkbenchSurfaceName[] = ["index"];
  for (const runtime of synthesisWorkbenchRuntimes) {
    runtime.libraryReadModelRevision = synthesisLibraryReadModelRevision;
    invalidatedSurfaces.forEach((surface) =>
      markSurfaceDirty(runtime, surface),
    );
    scheduleLibraryReadModelSurfaceRefresh(runtime, invalidatedSurfaces);
  }
  return {
    revision: synthesisLibraryReadModelRevision,
    invalidatedRuntimes: synthesisWorkbenchRuntimes.size,
    invalidatedSurfaces,
    event: args.event,
    type: args.type,
    itemCount: args.ids?.length || 0,
  };
}

function handleSynthesisWorkbenchSidecarChanged(
  args: SynthesisWorkbenchSidecarChangeEvent,
) {
  const invalidatedSurfaces: SynthesisWorkbenchSurfaceName[] =
    args.graphMayHaveChanged === false ? ["index"] : ["index", "graph"];
  for (const runtime of synthesisWorkbenchRuntimes) {
    invalidatedSurfaces.forEach((surface) =>
      markSurfaceDirty(runtime, surface),
    );
    scheduleLibraryReadModelSurfaceRefresh(runtime, invalidatedSurfaces);
    void sendChrome(runtime, { refreshFromService: true }).catch((error) =>
      reportWorkbenchError(error, runtime.window),
    );
  }
  return {
    invalidatedRuntimes: synthesisWorkbenchRuntimes.size,
    invalidatedSurfaces,
    reason: args.reason,
    sourceRefs: (args.sourceRefs || []).filter(Boolean),
  };
}

registerSynthesisWorkbenchSidecarChangeListener(
  handleSynthesisWorkbenchSidecarChanged,
);

function surfaceNeedsServiceRefresh(
  runtime: SynthesisWorkbenchRuntime,
  surface: SynthesisWorkbenchSurfaceName,
) {
  return (
    !runtime.loadedSurfaces.has(surface) || runtime.dirtySurfaces.has(surface)
  );
}

function findCreateTopicSynthesisWorkflow() {
  return (
    getLoadedWorkflowEntries().find(
      (entry) => entry.manifest.id === "create-topic-synthesis",
    ) || null
  );
}

function findUpdateTopicSynthesisWorkflow() {
  return (
    getLoadedWorkflowEntries().find(
      (entry) => entry.manifest.id === "update-topic-synthesis",
    ) || null
  );
}

async function runCreateTopicSynthesisFromWorkbench(args: {
  hostWindow?: _ZoteroTypes.MainWindow;
}) {
  const hostWindow = resolveWorkflowHostWindow(args.hostWindow);
  if (!hostWindow) {
    throw new Error("Cannot run synthesis: Zotero main window is unavailable.");
  }
  const workflow = findCreateTopicSynthesisWorkflow();
  if (!workflow) {
    alertWindow(
      hostWindow,
      "Cannot run synthesis: create-topic-synthesis workflow is not loaded. Rescan builtin workflows and try again.",
    );
    return;
  }
  await executeWorkflowFromCurrentSelection({
    win: hostWindow,
    workflow,
    requireSettingsGate: true,
  });
}

async function runUpdateTopicSynthesisFromWorkbench(args: {
  hostWindow?: _ZoteroTypes.MainWindow;
  topicId: string;
  language?: string;
}) {
  const hostWindow = resolveWorkflowHostWindow(args.hostWindow);
  if (!hostWindow) {
    throw new Error(
      "Cannot update synthesis: Zotero main window is unavailable.",
    );
  }
  const workflow = findUpdateTopicSynthesisWorkflow();
  if (!workflow) {
    alertWindow(
      hostWindow,
      "Cannot update synthesis: update-topic-synthesis workflow is not loaded. Rescan builtin workflows and try again.",
    );
    return;
  }
  const topicInput =
    await getDefaultSynthesisService().getSynthesisWorkbenchSurfaceInput(
      "topics",
      createDefaultSynthesisUiState(),
    );
  const snapshot = buildSynthesisUiSnapshot(
    mergeSynthesisUiSnapshotInput(buildDefaultSnapshotInput(), topicInput),
    createDefaultSynthesisUiState(),
  );
  const row = snapshot.artifacts.rows.find(
    (entry) => String(entry.id || "").trim() === args.topicId,
  );
  if (!row?.updateIntent || row.updateIntent.blocked === true) {
    alertWindow(hostWindow, `Topic does not need update: ${args.topicId}`);
    return;
  }
  await executeWorkflowFromCurrentSelection({
    win: hostWindow,
    workflow,
    requireSettingsGate: true,
    settingsGateInitialOptions: {
      workflowParams: {
        topicId: args.topicId,
      },
    },
  });
}

function postWorkbenchMessage(
  runtime: SynthesisWorkbenchRuntime,
  type: SynthesisBridgeMessageType,
  payload: unknown,
) {
  if (!runtime?.frameWindow) {
    return;
  }
  runtime.frameWindow.postMessage(
    {
      type,
      payload: withSynthesisWorkbenchI18n(payload),
    },
    "*",
  );
}

function commandArgsFromPayload(payload?: Record<string, unknown>) {
  return payload?.args && typeof payload.args === "object"
    ? (payload.args as Record<string, unknown>)
    : {};
}

function actionStatusInput(runtime: SynthesisWorkbenchRuntime) {
  return {
    inFlight: Array.from(runtime.inFlightCommands.values()),
    lastCompleted: runtime.lastCompletedCommand,
    lastFailed: runtime.lastFailedCommand,
    warnings: runtime.actionWarnings.slice(-4),
  };
}

function operationForHostCommand(
  command: SynthesisUiActionOperation["command"],
  args: Record<string, unknown>,
  status: SynthesisUiActionOperation["status"],
  message?: string,
): SynthesisUiActionOperation {
  const timestamp = new Date().toISOString();
  return {
    key: getSynthesisUiOperationKey(command, args),
    command,
    status,
    label: getSynthesisUiOperationLabel(command),
    started_at:
      status === "running" || status === "pending" ? timestamp : undefined,
    completed_at:
      status === "completed" || status === "failed" ? timestamp : undefined,
    message,
  };
}

function recordDuplicateActionWarning(
  runtime: SynthesisWorkbenchRuntime,
  operation: SynthesisUiActionOperation,
) {
  runtime.actionWarnings.push({
    ...operation,
    status: "queued",
    message: "This action is already running.",
  });
  runtime.actionWarnings = runtime.actionWarnings.slice(-6);
}

function ensureCommandProgressPolling(runtime: SynthesisWorkbenchRuntime) {
  if (runtime.commandProgressTimer) {
    return;
  }
  runtime.commandProgressTimer = globalThis.setInterval(() => {
    if (!runtime.inFlightCommands.size) {
      clearCommandProgressPolling(runtime);
      return;
    }
    void refreshWorkbenchCommandProgress(runtime);
  }, SYNTHESIS_WORKBENCH_COMMAND_PROGRESS_INTERVAL_MS);
}

function clearCommandProgressPolling(runtime: SynthesisWorkbenchRuntime) {
  if (!runtime.commandProgressTimer) {
    return;
  }
  globalThis.clearInterval(runtime.commandProgressTimer);
  runtime.commandProgressTimer = undefined;
}

async function notifyWorkbenchCommandProgress(
  runtime: SynthesisWorkbenchRuntime,
) {
  await refreshWorkbenchCommandProgress(runtime);
}

async function refreshWorkbenchCommandProgress(
  runtime: SynthesisWorkbenchRuntime,
) {
  if (!runtime?.frameWindow) {
    return;
  }
  if (runtime.commandProgressSnapshotRunning) {
    return;
  }
  runtime.commandProgressSnapshotRunning = true;
  try {
    if (!runtime.snapshotInputLocked) {
      const base = runtime.snapshotInput || buildDefaultSnapshotInput();
      runtime.snapshotInput = {
        ...base,
        maintenance: {
          ...(base.maintenance || {}),
          backgroundJobs:
            getDefaultSynthesisService().getSynthesisBackgroundJobRows(),
        },
      };
      prewarmedSynthesisSnapshotInput = runtime.snapshotInput;
    }
    await sendChrome(runtime, {
      refreshFromService: false,
    });
  } catch {
    await sendChrome(runtime, {
      refreshFromService: false,
    });
  } finally {
    runtime.commandProgressSnapshotRunning = false;
  }
}

function runWorkbenchCommandOnce(
  runtime: SynthesisWorkbenchRuntime,
  command: SynthesisUiActionOperation["command"],
  args: Record<string, unknown>,
  run: () => Promise<unknown>,
  options: { refreshFromService?: boolean; deferStart?: boolean } = {},
) {
  const operation = operationForHostCommand(command, args, "running");
  if (runtime.inFlightCommands.has(operation.key)) {
    recordDuplicateActionWarning(runtime, operation);
    void sendChrome(runtime, {
      refreshFromService: false,
    });
    return;
  }
  runtime.inFlightCommands.set(operation.key, operation);
  void sendChrome(runtime, {
    refreshFromService: false,
  });
  ensureCommandProgressPolling(runtime);
  const start = () =>
    run()
      .then(() => {
        runtime.lastCompletedCommand = {
          ...operation,
          status: "completed",
          completed_at: new Date().toISOString(),
        };
        runtime.lastFailedCommand = undefined;
      })
      .catch((error) => {
        const message =
          error instanceof Error
            ? error.message
            : String(error || "unknown error");
        runtime.lastFailedCommand = {
          ...operation,
          status: "failed",
          completed_at: new Date().toISOString(),
          message,
        };
        reportWorkbenchError(error, runtime.window);
      })
      .finally(() => {
        runtime.inFlightCommands.delete(operation.key);
        if (!runtime.inFlightCommands.size) {
          clearCommandProgressPolling(runtime);
        }
        void sendChrome(runtime, {
          refreshFromService: options.refreshFromService !== false,
        });
        const invalidatedSurfaces = surfacesInvalidatedByCommand(command);
        invalidatedSurfaces.forEach((surface) =>
          markSurfaceDirty(runtime, surface),
        );
        const activeSurface = surfaceForTab(runtime.state.selectedTab);
        if (invalidatedSurfaces.includes(activeSurface)) {
          void sendSurface(runtime, activeSurface, {
            refreshFromService: options.refreshFromService !== false,
          });
        }
      });
  if (options.deferStart) {
    globalThis.setTimeout(() => void start(), 0);
    return;
  }
  void start();
}

function failOnDiagnostic<T>(result: T): T {
  const diagnostic =
    result &&
    typeof result === "object" &&
    "diagnostic" in result &&
    (result as { diagnostic?: unknown }).diagnostic;
  if (diagnostic && typeof diagnostic === "object") {
    const row = diagnostic as Record<string, unknown>;
    throw new Error(String(row.message || row.code || "Action failed."));
  }
  return result;
}

async function sendSnapshot(
  runtime: SynthesisWorkbenchRuntime,
  messageType: Extract<
    SynthesisBridgeMessageType,
    "synthesis:init" | "synthesis:snapshot"
  >,
  _options: { refreshFromService?: boolean } = {},
) {
  if (!runtime?.frameWindow) {
    return;
  }
  if (!runtime.snapshotInput) {
    runtime.snapshotInput = buildDefaultSnapshotInput();
  }
  const snapshot = buildSynthesisUiSnapshot(
    {
      ...(runtime.snapshotInput || buildDefaultSnapshotInput()),
      actions: actionStatusInput(runtime),
    },
    runtime.state,
  );
  postWorkbenchMessage(runtime, messageType, snapshot);
}

async function sendChrome(
  runtime: SynthesisWorkbenchRuntime,
  options: { refreshFromService?: boolean } = {},
) {
  if (!runtime?.frameWindow) {
    return;
  }
  if (options.refreshFromService !== false && !runtime.snapshotInputLocked) {
    const input = await getDefaultSynthesisService()
      .getSynthesisWorkbenchChromeInput(runtime.state)
      .catch((error) => buildSnapshotErrorInput(error));
    mergeRuntimeSnapshotInput(runtime, input);
  }
  postWorkbenchMessage(
    runtime,
    "synthesis:chrome",
    snapshotForRuntime(runtime),
  );
}

async function sendSurface(
  runtime: SynthesisWorkbenchRuntime,
  surface: SynthesisWorkbenchSurfaceName,
  options: { refreshFromService?: boolean } = {},
) {
  if (!runtime?.frameWindow) {
    return;
  }
  const refreshFromService = options.refreshFromService !== false;
  const request = beginSurfaceRefreshRequest(
    runtime,
    surface,
    refreshFromService,
  );
  try {
    if (refreshFromService && !runtime.snapshotInputLocked) {
      const input =
        await getDefaultSynthesisService().getSynthesisWorkbenchSurfaceInput(
          surface,
          runtime.state,
        );
      if (!isLatestSurfaceRefreshRequest(runtime, request)) {
        return;
      }
      mergeRuntimeSnapshotInput(runtime, input);
      markSurfaceLoaded(runtime, surface);
    }
    if (
      !isLatestSurfaceRefreshRequest(runtime, request) ||
      !isActiveSurface(runtime, surface)
    ) {
      return;
    }
    postWorkbenchMessage(runtime, "synthesis:surface", {
      surface,
      request,
      requestId: request.requestId,
      snapshot: snapshotForRuntime(runtime),
    });
  } catch (error) {
    if (
      !isLatestSurfaceRefreshRequest(runtime, request) ||
      !isActiveSurface(runtime, surface)
    ) {
      return;
    }
    const transient = isTransientStorageBusyError(error);
    postWorkbenchMessage(runtime, "synthesis:surface-error", {
      surface,
      request,
      requestId: request.requestId,
      transient,
      code: transient ? "storage_busy" : "surface_refresh_failed",
      message: error instanceof Error ? error.message : String(error || ""),
    });
  }
}

async function sendActiveSurface(
  runtime: SynthesisWorkbenchRuntime,
  options: { refreshFromService?: boolean } = {},
) {
  await sendSurface(runtime, surfaceForTab(runtime.state.selectedTab), options);
}

function scheduleActiveSurfaceRefresh(
  runtime: SynthesisWorkbenchRuntime,
  options: { refreshFromService?: boolean } = {},
) {
  const scheduledSurface = surfaceForTab(runtime.state.selectedTab);
  globalThis.setTimeout(() => {
    if (!isActiveSurface(runtime, scheduledSurface)) {
      return;
    }
    const refreshFromService =
      options.refreshFromService !== undefined
        ? options.refreshFromService
        : surfaceNeedsServiceRefresh(runtime, scheduledSurface);
    void sendSurface(runtime, scheduledSurface, { refreshFromService });
  }, 0);
}

async function sendTopicDetail(
  runtime: SynthesisWorkbenchRuntime,
  topicId: string,
) {
  if (!runtime?.frameWindow) {
    return;
  }
  const service = getDefaultSynthesisService();
  const detail = await service.readTopicDetail({
    topicId,
  });
  if (
    !runtime.snapshotInputLocked &&
    surfaceNeedsServiceRefresh(runtime, "concepts")
  ) {
    const conceptInput = await service
      .getSynthesisWorkbenchSurfaceInput("concepts", runtime.state)
      .catch(() => undefined);
    if (conceptInput) {
      mergeRuntimeSnapshotInput(runtime, conceptInput);
      markSurfaceLoaded(runtime, "concepts");
    }
  }
  const result = applySynthesisUiAction(runtime.state, {
    action: "showArtifactReader",
    payload: { topicId },
  });
  runtime.state = result.state;
  await sendSurface(runtime, "reader", {
    refreshFromService: false,
  });
  postWorkbenchMessage(
    runtime,
    "synthesis:topic-detail",
    detail as SynthesisTopicDetailDto,
  );
}

async function sendTopicDigest(
  runtime: SynthesisWorkbenchRuntime,
  args: Record<string, unknown>,
) {
  if (!runtime?.frameWindow) {
    return;
  }
  const digest =
    await getDefaultSynthesisService().resolveTopicPaperDigest(args);
  postWorkbenchMessage(runtime, "synthesis:digest", digest);
}

function cleanReportExportString(value: unknown) {
  return String(value || "").trim();
}

function safeTopicReportExportFileName(value: unknown) {
  const base = cleanReportExportString(value)
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 120);
  return `${base || "synthesis-report"}-synthesis-report.md`;
}

function ensureMarkdownExportPath(pathRaw: string) {
  const path = cleanReportExportString(pathRaw);
  if (!path) {
    return "";
  }
  return /\.md$/i.test(path) ? path : `${path}.md`;
}

function resolveWorkbenchFilePicker() {
  const toolkit = resolveRuntimeToolkit() as
    | {
        FilePicker?: ToolkitFilePickerCtor;
      }
    | undefined;
  return typeof toolkit?.FilePicker === "function" ? toolkit.FilePicker : null;
}

async function pickTopicReportExportPath(
  runtime: SynthesisWorkbenchRuntime,
  suggestedFileName: string,
) {
  const FilePicker = resolveWorkbenchFilePicker();
  if (!FilePicker) {
    throw new Error("Zotero file picker is unavailable.");
  }
  const selected = await new FilePicker(
    "Export synthesis report",
    "save",
    [
      ["Markdown", "*.md"],
      ["All files", "*.*"],
    ],
    suggestedFileName,
    (runtime.frameWindow || runtime.hostWindow || runtime.window) as
      | Window
      | undefined,
  ).open();
  return typeof selected === "string" && selected.trim()
    ? ensureMarkdownExportPath(selected)
    : "";
}

async function exportTopicSynthesisReport(
  runtime: SynthesisWorkbenchRuntime,
  topicId: string,
) {
  if (!topicId) {
    throw new Error("exportTopicSynthesisReport requires topicId");
  }
  const report = await getDefaultSynthesisService().getTopicReport({
    topicId,
  });
  const markdown = cleanReportExportString(
    (report as Record<string, unknown>).markdown,
  );
  if (!markdown) {
    throw new Error("Synthesis report body is unavailable.");
  }
  const title =
    cleanReportExportString((report as Record<string, unknown>).title) ||
    topicId;
  const outputPath = await pickTopicReportExportPath(
    runtime,
    safeTopicReportExportFileName(title),
  );
  if (!outputPath) {
    return;
  }
  await writeRuntimeTextFile(
    outputPath,
    markdown.endsWith("\n") ? markdown : `${markdown}\n`,
  );
}

function reportWorkbenchError(error: unknown, win?: _ZoteroTypes.MainWindow) {
  const hostWindow = resolveWorkflowHostWindow(win);
  if (!hostWindow) {
    return;
  }
  alertWindow(
    hostWindow,
    error instanceof Error ? error.message : String(error || "unknown error"),
  );
}

function confirmWorkbenchAction(
  message: string,
  win?: _ZoteroTypes.MainWindow,
) {
  const hostWindow = resolveWorkflowHostWindow(win);
  const confirmFn = (
    hostWindow as unknown as { confirm?: (message: string) => boolean }
  )?.confirm;
  if (typeof confirmFn === "function") {
    return confirmFn.call(hostWindow, message);
  }
  const globalConfirm = (
    globalThis as { confirm?: (message: string) => boolean }
  ).confirm;
  return typeof globalConfirm === "function" ? globalConfirm(message) : true;
}

function isProtectedRebuildCommand(
  command: SynthesisUiActionOperation["command"] | undefined,
) {
  return (
    command === "refreshReferenceSidecarNow" ||
    command === "runAdvancedReferenceMatchingNow" ||
    command === "rebuildCitationGraphCacheNow" ||
    command === "rebuildTagVocabularyIndex" ||
    command === "rebuildConceptKbIndex" ||
    command === "rebuildTopicGraphIndex"
  );
}

function confirmProtectedRebuildCommand(
  command: SynthesisUiActionOperation["command"],
  win?: _ZoteroTypes.MainWindow,
) {
  const label = getSynthesisUiOperationLabel(command);
  if (command === "runAdvancedReferenceMatchingNow") {
    return confirmWorkbenchAction(
      `${label} will run a heavier reference matching pass over unbound references. Zotero may respond more slowly while this runs. Existing accepted facts will not be deleted. Continue?`,
      win,
    );
  }
  return confirmWorkbenchAction(
    `${label} will rebuild local Synthesis indexes. Zotero may respond more slowly while this runs. Canonical Synthesis data will not be deleted. Continue?`,
    win,
  );
}

function handleAction(
  runtime: SynthesisWorkbenchRuntime,
  envelope: SynthesisWorkbenchActionEnvelope,
) {
  if (!runtime) {
    return;
  }
  const previousState = runtime.state;
  const result = applySynthesisUiAction(runtime.state, {
    action: envelope.action,
    payload: envelope.payload,
  } satisfies SynthesisUiAction);
  if (!result.handled) {
    void sendActiveSurface(runtime, {
      refreshFromService: false,
    });
    return;
  }
  runtime.state = result.state;
  if (envelope.action === "ready") {
    void sendChrome(runtime, { refreshFromService: true });
    scheduleActiveSurfaceRefresh(runtime);
    return;
  }
  if (envelope.action === "refresh") {
    void sendChrome(runtime, { refreshFromService: true });
    scheduleActiveSurfaceRefresh(runtime, { refreshFromService: true });
    return;
  }
  if (envelope.action === "selectTab") {
    void sendChrome(runtime, { refreshFromService: false });
    scheduleActiveSurfaceRefresh(runtime);
    return;
  }
  if (envelope.action === "setFilters") {
    const registryFilters =
      envelope.payload &&
      typeof envelope.payload === "object" &&
      "registry" in envelope.payload &&
      envelope.payload.registry &&
      typeof envelope.payload.registry === "object"
        ? (envelope.payload.registry as Record<string, unknown>)
        : undefined;
    const registryScopeChanged =
      runtime.state.selectedTab === "registry" &&
      previousState.registry.scope !== runtime.state.registry.scope;
    const registryExpandedChanged =
      runtime.state.selectedTab === "registry" &&
      Boolean(registryFilters && "expandedSourceRefs" in registryFilters) &&
      previousState.registry.expandedSourceRefs.join("\n") !==
        runtime.state.registry.expandedSourceRefs.join("\n");
    const reviewsFilterChanged =
      runtime.state.selectedTab === "reviews" &&
      envelope.payload &&
      typeof envelope.payload === "object" &&
      "reviews" in envelope.payload;
    void sendActiveSurface(runtime, {
      refreshFromService:
        reviewsFilterChanged || registryScopeChanged || registryExpandedChanged,
    });
    return;
  }
  if (
    result.hostCommand &&
    isProtectedRebuildCommand(result.hostCommand.command) &&
    !confirmProtectedRebuildCommand(result.hostCommand.command, runtime.window)
  ) {
    void sendActiveSurface(runtime, {
      refreshFromService: false,
    });
    return;
  }
  if (result.hostCommand?.command === "openPreferences") {
    void addon.hooks.onPrefsEvent("openWorkflowSettings", {
      window: runtime.window,
    });
  }
  if (result.hostCommand?.command === "runSynthesizeTopic") {
    runWorkbenchCommandOnce(runtime, "runSynthesizeTopic", {}, () =>
      runCreateTopicSynthesisFromWorkbench({
        hostWindow: runtime.window,
      }),
    );
    return;
  }
  if (result.hostCommand?.command === "submitTopicSynthesisUpdate") {
    const commandArgs = commandArgsFromPayload(envelope.payload);
    const topicId = String(commandArgs.topicId || "").trim();
    const language = String(commandArgs.language || "auto").trim();
    runWorkbenchCommandOnce(
      runtime,
      "submitTopicSynthesisUpdate",
      { topicId, language },
      () =>
        runUpdateTopicSynthesisFromWorkbench({
          hostWindow: runtime.window,
          topicId,
          language,
        }),
    );
    return;
  }
  if (result.hostCommand?.command === "manualRecomputeLayout") {
    const commandArgs = commandArgsFromPayload(envelope.payload);
    const algorithm =
      String(
        commandArgs.algorithm ||
          commandArgs.preset ||
          runtime.state.graph.layoutAlgorithm,
      ).trim() || runtime.state.graph.layoutAlgorithm;
    runWorkbenchCommandOnce(
      runtime,
      "manualRecomputeLayout",
      { algorithm },
      () =>
        getDefaultSynthesisService().recomputeCitationGraphLayout({
          algorithm: algorithm as SynthesisUiLayoutAlgorithm,
          force: true,
        }),
    );
    return;
  }
  if (result.hostCommand?.command === "rebuildCitationGraphCacheNow") {
    runWorkbenchCommandOnce(
      runtime,
      "rebuildCitationGraphCacheNow",
      {},
      () =>
        getDefaultSynthesisService().rebuildCitationGraphCacheNow({
          onProgress: () => notifyWorkbenchCommandProgress(runtime),
        }),
      { deferStart: true },
    );
    return;
  }
  if (
    result.hostCommand?.command === "refreshCitationGraphCacheIncrementalNow"
  ) {
    runWorkbenchCommandOnce(
      runtime,
      "refreshCitationGraphCacheIncrementalNow",
      {},
      () =>
        getDefaultSynthesisService().refreshCitationGraphCacheIncrementalNow({
          onProgress: () => notifyWorkbenchCommandProgress(runtime),
        }),
      { deferStart: true },
    );
    return;
  }
  if (result.hostCommand?.command === "retryCitationGraphCacheRebuild") {
    runWorkbenchCommandOnce(
      runtime,
      "retryCitationGraphCacheRebuild",
      {},
      () =>
        getDefaultSynthesisService().retryCitationGraphCacheRebuild({
          onProgress: () => notifyWorkbenchCommandProgress(runtime),
        }),
      { deferStart: true },
    );
    return;
  }
  if (result.hostCommand?.command === "validateTagVocabulary") {
    runWorkbenchCommandOnce(runtime, "validateTagVocabulary", {}, () =>
      getDefaultSynthesisService().validateTagVocabulary(),
    );
    return;
  }
  if (result.hostCommand?.command === "rebuildTagVocabularyIndex") {
    runWorkbenchCommandOnce(
      runtime,
      "rebuildTagVocabularyIndex",
      {},
      () =>
        getDefaultSynthesisService().rebuildTagVocabularyIndex({
          onProgress: () => notifyWorkbenchCommandProgress(runtime),
        }),
      { deferStart: true },
    );
    return;
  }
  if (result.hostCommand?.command === "rebuildConceptKbIndex") {
    runWorkbenchCommandOnce(
      runtime,
      "rebuildConceptKbIndex",
      {},
      () =>
        getDefaultSynthesisService().rebuildConceptKbIndex({
          onProgress: () => notifyWorkbenchCommandProgress(runtime),
        }),
      { deferStart: true },
    );
    return;
  }
  if (result.hostCommand?.command === "rebuildTopicGraphIndex") {
    runWorkbenchCommandOnce(
      runtime,
      "rebuildTopicGraphIndex",
      {},
      () =>
        getDefaultSynthesisService().rebuildTopicGraphIndex({
          onProgress: () => notifyWorkbenchCommandProgress(runtime),
        }),
      { deferStart: true },
    );
    return;
  }
  if (
    result.hostCommand?.command === "acceptTopicGraphRelation" ||
    result.hostCommand?.command === "rejectTopicGraphRelation"
  ) {
    const commandArgs = commandArgsFromPayload(envelope.payload);
    const edgeId = String(commandArgs.edgeId || "").trim();
    if (edgeId) {
      const service = getDefaultSynthesisService();
      const command = result.hostCommand.command;
      runWorkbenchCommandOnce(runtime, command, { edgeId }, () =>
        (command === "acceptTopicGraphRelation"
          ? service.acceptTopicGraphRelation({ edgeId })
          : service.rejectTopicGraphRelation({ edgeId })
        ).then(failOnDiagnostic),
      );
      return;
    }
    void sendActiveSurface(runtime, { refreshFromService: false });
    return;
  }
  if (result.hostCommand?.command === "applyTopicGraphReviewAction") {
    const commandArgs = commandArgsFromPayload(envelope.payload);
    const reviewId = String(commandArgs.reviewId || "").trim();
    const action =
      String(commandArgs.action || "").trim() === "approve_suggested"
        ? "approve_suggested"
        : "reject";
    runWorkbenchCommandOnce(
      runtime,
      "applyTopicGraphReviewAction",
      { reviewId, action },
      () =>
        getDefaultSynthesisService()
          .applyTopicGraphReviewAction({
            reviewId,
            action,
          })
          .then(failOnDiagnostic),
    );
    return;
  }
  if (
    result.hostCommand?.command === "rejectTopicDiscoveryHint" ||
    result.hostCommand?.command === "restoreTopicDiscoveryHint"
  ) {
    const commandArgs = commandArgsFromPayload(envelope.payload);
    const hintId = String(commandArgs.hintId || "").trim();
    if (hintId) {
      const service = getDefaultSynthesisService();
      const command = result.hostCommand.command;
      runWorkbenchCommandOnce(runtime, command, { hintId }, () =>
        (command === "rejectTopicDiscoveryHint"
          ? service.rejectTopicDiscoveryHint({ hintId })
          : service.restoreTopicDiscoveryHint({ hintId })
        ).then(failOnDiagnostic),
      );
      return;
    }
    void sendActiveSurface(runtime, { refreshFromService: false });
    return;
  }
  if (result.hostCommand?.command === "updateConceptDisplayText") {
    const commandArgs = commandArgsFromPayload(envelope.payload);
    const conceptId = String(commandArgs.conceptId || "").trim();
    const fields =
      commandArgs.fields && typeof commandArgs.fields === "object"
        ? (commandArgs.fields as Record<string, string>)
        : {};
    if (conceptId && Object.keys(fields).length) {
      runWorkbenchCommandOnce(
        runtime,
        "updateConceptDisplayText",
        { conceptId },
        () =>
          getDefaultSynthesisService().updateConceptDisplayText({
            conceptId,
            fields,
          }),
      );
      return;
    }
    void sendActiveSurface(runtime, { refreshFromService: false });
    return;
  }
  if (result.hostCommand?.command === "applyConceptReviewAction") {
    const commandArgs = commandArgsFromPayload(envelope.payload);
    const reviewId = String(commandArgs.reviewId || "").trim();
    const action = String(commandArgs.action || "").trim();
    const targetConceptId = String(commandArgs.targetConceptId || "").trim();
    if (
      reviewId &&
      (action === "approve_create" ||
        action === "merge_into_existing" ||
        action === "reject")
    ) {
      runWorkbenchCommandOnce(
        runtime,
        "applyConceptReviewAction",
        { reviewId, action, targetConceptId },
        () =>
          getDefaultSynthesisService()
            .applyConceptReviewAction({
              reviewId,
              action,
              targetConceptId: targetConceptId || undefined,
            })
            .then(failOnDiagnostic),
      );
      return;
    }
    void sendActiveSurface(runtime, { refreshFromService: false });
    return;
  }
  if (result.hostCommand?.command === "deleteConceptEntry") {
    const commandArgs = commandArgsFromPayload(envelope.payload);
    const conceptIds = Array.isArray(commandArgs.conceptIds)
      ? commandArgs.conceptIds
          .map((conceptId) => String(conceptId || "").trim())
          .filter(Boolean)
      : [String(commandArgs.conceptId || "").trim()].filter(Boolean);
    if (conceptIds.length) {
      runWorkbenchCommandOnce(
        runtime,
        "deleteConceptEntry",
        { conceptId: conceptIds[0], conceptIds },
        () =>
          getDefaultSynthesisService().deleteConceptEntries({
            conceptIds,
          }),
      );
      return;
    }
    void sendActiveSurface(runtime, { refreshFromService: false });
    return;
  }
  if (result.hostCommand?.command === "refreshReferenceSidecarNow") {
    runWorkbenchCommandOnce(
      runtime,
      "refreshReferenceSidecarNow",
      {},
      () =>
        getDefaultSynthesisService().refreshReferenceSidecarNow({
          onProgress: () => notifyWorkbenchCommandProgress(runtime),
        }),
      { deferStart: true },
    );
    return;
  }
  if (result.hostCommand?.command === "retryReferenceSidecarRefresh") {
    runWorkbenchCommandOnce(runtime, "retryReferenceSidecarRefresh", {}, () =>
      getDefaultSynthesisService().retryReferenceSidecarRefresh(),
    );
    return;
  }
  if (result.hostCommand?.command === "runAdvancedReferenceMatchingNow") {
    runWorkbenchCommandOnce(
      runtime,
      "runAdvancedReferenceMatchingNow",
      {},
      () =>
        getDefaultSynthesisService().runAdvancedReferenceMatchingNow({
          onProgress: () => notifyWorkbenchCommandProgress(runtime),
        }),
      { deferStart: true },
    );
    return;
  }
  if (result.hostCommand?.command === "retryAdvancedReferenceMatching") {
    runWorkbenchCommandOnce(
      runtime,
      "retryAdvancedReferenceMatching",
      {},
      () =>
        getDefaultSynthesisService().retryAdvancedReferenceMatching({
          onProgress: () => notifyWorkbenchCommandProgress(runtime),
        }),
      { deferStart: true },
    );
    return;
  }
  if (result.hostCommand?.command === "applyCanonicalRevisionReviewAction") {
    const commandArgs = commandArgsFromPayload(envelope.payload);
    const reviewItemId = String(
      commandArgs.reviewItemId || commandArgs.review_item_id || "",
    ).trim();
    const action =
      String(commandArgs.action || "").trim() === "reject"
        ? "reject"
        : "accept";
    if (reviewItemId) {
      runWorkbenchCommandOnce(
        runtime,
        "applyCanonicalRevisionReviewAction",
        { reviewItemId, action },
        () =>
          getDefaultSynthesisService()
            .applyCanonicalRevisionReviewAction({ reviewItemId, action })
            .then(failOnDiagnostic),
      );
      return;
    }
    void sendActiveSurface(runtime, { refreshFromService: false });
    return;
  }
  if (result.hostCommand?.command === "applyReferenceMatchProposalActions") {
    const commandArgs = commandArgsFromPayload(envelope.payload);
    const decisions = Array.isArray(commandArgs.decisions)
      ? commandArgs.decisions
          .filter(
            (entry): entry is Record<string, unknown> =>
              !!entry && typeof entry === "object" && !Array.isArray(entry),
          )
          .map((entry) => {
            const proposalId = String(
              entry.proposalId || entry.proposal_id || "",
            ).trim();
            const requestedAction = String(entry.action || "").trim();
            const action:
              | "accept"
              | "reverse_accept"
              | "reject"
              | "reopen"
              | "delete"
              | "manual_target" =
              requestedAction === "reject" ||
              requestedAction === "reverse_accept" ||
              requestedAction === "reopen" ||
              requestedAction === "delete" ||
              requestedAction === "manual_target"
                ? requestedAction
                : "accept";
            const target =
              entry.target &&
              typeof entry.target === "object" &&
              !Array.isArray(entry.target)
                ? (entry.target as Record<string, unknown>)
                : {};
            const normalizedTarget =
              String(target.kind || "") === "canonical_reference"
                ? {
                    kind: "canonical_reference" as const,
                    canonicalReferenceId: String(
                      target.canonicalReferenceId ||
                        target.canonical_reference_id ||
                        "",
                    ).trim(),
                  }
                : String(target.kind || "") === "zotero_item"
                  ? {
                      kind: "zotero_item" as const,
                      libraryId: Number(target.libraryId || target.library_id),
                      itemKey: String(
                        target.itemKey || target.item_key || "",
                      ).trim(),
                    }
                  : undefined;
            return action === "manual_target"
              ? { proposalId, action, target: normalizedTarget }
              : { proposalId, action };
          })
          .filter(
            (entry) =>
              entry.proposalId &&
              (entry.action !== "manual_target" || Boolean(entry.target)),
          )
      : [];
    if (decisions.length) {
      runWorkbenchCommandOnce(
        runtime,
        "applyReferenceMatchProposalActions",
        {},
        () =>
          getDefaultSynthesisService()
            .applyReferenceMatchProposalActions({ decisions })
            .then(failOnDiagnostic),
      );
      return;
    }
    void sendActiveSurface(runtime, { refreshFromService: false });
    return;
  }
  if (result.hostCommand?.command === "applyReferenceMatchProposalAction") {
    const commandArgs = commandArgsFromPayload(envelope.payload);
    const proposalId = String(commandArgs.proposalId || "").trim();
    const requestedAction = String(commandArgs.action || "").trim();
    const action =
      requestedAction === "reject" ||
      requestedAction === "reverse_accept" ||
      requestedAction === "reopen" ||
      requestedAction === "delete"
        ? requestedAction
        : "accept";
    if (proposalId) {
      runWorkbenchCommandOnce(
        runtime,
        "applyReferenceMatchProposalAction",
        { proposalId, action },
        () =>
          getDefaultSynthesisService()
            .applyReferenceMatchProposalAction({ proposalId, action })
            .then(failOnDiagnostic),
      );
      return;
    }
    void sendActiveSurface(runtime, { refreshFromService: false });
    return;
  }
  if (result.hostCommand?.command === "mergeEffectiveCanonicalReference") {
    const commandArgs = commandArgsFromPayload(envelope.payload);
    const sourceEffectiveCanonicalId = String(
      commandArgs.sourceEffectiveCanonicalId ||
        commandArgs.source_effective_canonical_id ||
        "",
    ).trim();
    const targetEffectiveCanonicalId = String(
      commandArgs.targetEffectiveCanonicalId ||
        commandArgs.target_effective_canonical_id ||
        "",
    ).trim();
    if (sourceEffectiveCanonicalId && targetEffectiveCanonicalId) {
      runWorkbenchCommandOnce(
        runtime,
        "mergeEffectiveCanonicalReference",
        { sourceEffectiveCanonicalId, targetEffectiveCanonicalId },
        () =>
          getDefaultSynthesisService()
            .mergeEffectiveCanonicalReference({
              sourceEffectiveCanonicalId,
              targetEffectiveCanonicalId,
              confirmRetargetGroup: Boolean(commandArgs.confirmRetargetGroup),
            })
            .then(failOnDiagnostic),
      );
      return;
    }
    void sendActiveSurface(runtime, { refreshFromService: false });
    return;
  }
  if (result.hostCommand?.command === "applyCanonicalRevisionMergeRequests") {
    const commandArgs = commandArgsFromPayload(envelope.payload);
    const requests = Array.isArray(commandArgs.requests)
      ? commandArgs.requests.filter(
          (entry): entry is Record<string, unknown> =>
            Boolean(entry) && typeof entry === "object",
        )
      : [];
    if (requests.length) {
      runWorkbenchCommandOnce(
        runtime,
        "applyCanonicalRevisionMergeRequests",
        { count: requests.length },
        () =>
          getDefaultSynthesisService()
            .applyCanonicalRevisionMergeRequests({ requests })
            .then(failOnDiagnostic),
        { deferStart: true },
      );
      return;
    }
    void sendActiveSurface(runtime, { refreshFromService: false });
    return;
  }
  if (result.hostCommand?.command === "updateCanonicalReferenceMetadata") {
    const commandArgs = commandArgsFromPayload(envelope.payload);
    const canonicalReferenceId = String(
      commandArgs.canonicalReferenceId ||
        commandArgs.canonical_reference_id ||
        "",
    ).trim();
    const patch =
      commandArgs.patch &&
      typeof commandArgs.patch === "object" &&
      !Array.isArray(commandArgs.patch)
        ? (commandArgs.patch as Record<string, unknown>)
        : {};
    if (canonicalReferenceId) {
      runWorkbenchCommandOnce(
        runtime,
        "updateCanonicalReferenceMetadata",
        { canonicalReferenceId },
        () =>
          getDefaultSynthesisService()
            .updateCanonicalReferenceMetadata({
              canonicalReferenceId,
              patch,
            })
            .then(failOnDiagnostic),
      );
      return;
    }
    void sendActiveSurface(runtime, { refreshFromService: false });
    return;
  }
  if (result.hostCommand?.command === "archiveCanonicalReference") {
    const commandArgs = commandArgsFromPayload(envelope.payload);
    const canonicalReferenceId = String(
      commandArgs.canonicalReferenceId ||
        commandArgs.canonical_reference_id ||
        "",
    ).trim();
    if (canonicalReferenceId) {
      runWorkbenchCommandOnce(
        runtime,
        "archiveCanonicalReference",
        { canonicalReferenceId },
        () =>
          getDefaultSynthesisService()
            .archiveCanonicalReference({ canonicalReferenceId })
            .then(failOnDiagnostic),
      );
      return;
    }
    void sendActiveSurface(runtime, { refreshFromService: false });
    return;
  }
  if (result.hostCommand?.command === "syncNow") {
    runWorkbenchCommandOnce(runtime, "syncNow", {}, () =>
      getDefaultSynthesisService().syncNow(),
    );
    return;
  }
  if (result.hostCommand?.command === "pauseGitSync") {
    runWorkbenchCommandOnce(runtime, "pauseGitSync", {}, () =>
      getDefaultSynthesisService().pauseGitSync(),
    );
    return;
  }
  if (result.hostCommand?.command === "resumeGitSync") {
    runWorkbenchCommandOnce(runtime, "resumeGitSync", {}, () =>
      getDefaultSynthesisService().resumeGitSync(),
    );
    return;
  }
  if (result.hostCommand?.command === "retryGitSync") {
    runWorkbenchCommandOnce(runtime, "retryGitSync", {}, () =>
      getDefaultSynthesisService().retryGitSync(),
    );
    return;
  }
  if (result.hostCommand?.command === "resolveGitSyncConflict") {
    const commandArgs = commandArgsFromPayload(envelope.payload);
    const action = String(commandArgs.action || "resolved").trim();
    runWorkbenchCommandOnce(runtime, "resolveGitSyncConflict", { action }, () =>
      getDefaultSynthesisService().resolveGitSyncConflict({
        action: action === "skip" ? "skip" : "resolved",
      }),
    );
    return;
  }
  if (result.hostCommand?.command === "exportTagVocabulary") {
    runWorkbenchCommandOnce(runtime, "exportTagVocabulary", {}, () =>
      getDefaultSynthesisService()
        .exportTagVocabularyForRegulator()
        .then((tags) =>
          runtime.hostWindow.navigator?.clipboard?.writeText?.(
            `${tags.join("\n")}\n`,
          ),
        ),
    );
    return;
  }
  if (
    result.hostCommand?.command === "importTagVocabulary" ||
    result.hostCommand?.command === "previewTagVocabularyImport"
  ) {
    const commandArgs = commandArgsFromPayload(envelope.payload);
    if (typeof commandArgs.payload === "string" && commandArgs.payload.trim()) {
      runWorkbenchCommandOnce(runtime, "previewTagVocabularyImport", {}, () =>
        getDefaultSynthesisService().previewTagVocabularyImport(
          commandArgs.payload as string,
        ),
      );
      return;
    }
    void sendActiveSurface(runtime, { refreshFromService: false });
    return;
  }
  if (result.hostCommand?.command === "updateStagedTagSuggestion") {
    const commandArgs = commandArgsFromPayload(envelope.payload);
    const originalTag = String(
      commandArgs.originalTag || commandArgs.tag || "",
    ).trim();
    const tag = String(commandArgs.tag || "").trim();
    if (tag) {
      runWorkbenchCommandOnce(
        runtime,
        "updateStagedTagSuggestion",
        { tag },
        async () => {
          if (originalTag && originalTag !== tag) {
            await getDefaultSynthesisService().discardStagedTagSuggestions({
              tags: [originalTag],
            });
          }
          return getDefaultSynthesisService().stageTagSuggestions({
            entries: [
              {
                tag,
                facet: String(
                  commandArgs.facet || tag.split(":")[0] || "topic",
                ),
                note: String(commandArgs.note || ""),
                source_flow: String(
                  commandArgs.source_flow || "tag-regulator-suggest",
                ),
                parent_bindings: Array.isArray(commandArgs.parent_bindings)
                  ? commandArgs.parent_bindings
                  : [],
              },
            ],
          });
        },
      );
      return;
    }
    void sendActiveSurface(runtime, { refreshFromService: false });
    return;
  }
  if (result.hostCommand?.command === "updateTagVocabularyEntry") {
    const commandArgs = commandArgsFromPayload(envelope.payload);
    const originalTag = String(
      commandArgs.originalTag || commandArgs.tag || "",
    ).trim();
    const tag = String(commandArgs.tag || "").trim();
    if (originalTag && tag) {
      runWorkbenchCommandOnce(
        runtime,
        "updateTagVocabularyEntry",
        { originalTag },
        async () => {
          const service = getDefaultSynthesisService();
          const snapshot = await service.loadTagVocabulary();
          const nextEntries = snapshot.entries.map((entry) =>
            entry.tag === originalTag
              ? {
                  ...entry,
                  tag,
                  facet: String(
                    commandArgs.facet || tag.split(":")[0] || entry.facet,
                  ),
                  note: String(commandArgs.note || ""),
                }
              : entry,
          );
          if (!nextEntries.some((entry) => entry.tag === tag)) {
            nextEntries.push({
              tag,
              facet: String(commandArgs.facet || tag.split(":")[0] || "topic"),
              note: String(commandArgs.note || ""),
            });
          }
          return service.saveTagVocabulary({
            entries: nextEntries,
            aliases: snapshot.aliases,
            abbrev: snapshot.abbrev,
            protocol: snapshot.protocol,
            transactionId: `tag-vocabulary-update-${Date.now()}`,
          });
        },
      );
      return;
    }
    void sendActiveSurface(runtime, { refreshFromService: false });
    return;
  }
  if (result.hostCommand?.command === "deleteTagVocabularyEntry") {
    const commandArgs = commandArgsFromPayload(envelope.payload);
    const originalTag = String(
      commandArgs.originalTag || commandArgs.tag || "",
    ).trim();
    if (originalTag) {
      runWorkbenchCommandOnce(
        runtime,
        "deleteTagVocabularyEntry",
        { originalTag },
        async () => {
          const service = getDefaultSynthesisService();
          const snapshot = await service.loadTagVocabulary();
          return service.saveTagVocabulary({
            entries: snapshot.entries.filter(
              (entry) => entry.tag !== originalTag,
            ),
            aliases: snapshot.aliases,
            abbrev: snapshot.abbrev,
            protocol: snapshot.protocol,
            transactionId: `tag-vocabulary-delete-${Date.now()}`,
          });
        },
      );
      return;
    }
    void sendActiveSurface(runtime, { refreshFromService: false });
    return;
  }
  if (result.hostCommand?.command === "promoteStagedTagSuggestions") {
    const commandArgs = commandArgsFromPayload(envelope.payload);
    const tags = Array.isArray(commandArgs.tags)
      ? commandArgs.tags.map((tag) => String(tag || "").trim()).filter(Boolean)
      : [String(commandArgs.tag || "").trim()].filter(Boolean);
    if (tags.length) {
      runWorkbenchCommandOnce(
        runtime,
        "promoteStagedTagSuggestions",
        { tag: tags[0], tags },
        () =>
          getDefaultSynthesisService().promoteStagedTagSuggestions({ tags }),
      );
      return;
    }
    void sendActiveSurface(runtime, { refreshFromService: false });
    return;
  }
  if (result.hostCommand?.command === "discardStagedTagSuggestions") {
    const commandArgs = commandArgsFromPayload(envelope.payload);
    const tags = Array.isArray(commandArgs.tags)
      ? commandArgs.tags.map((tag) => String(tag || "").trim()).filter(Boolean)
      : [String(commandArgs.tag || "").trim()].filter(Boolean);
    if (tags.length) {
      runWorkbenchCommandOnce(
        runtime,
        "discardStagedTagSuggestions",
        { tag: tags[0], tags },
        () =>
          getDefaultSynthesisService().discardStagedTagSuggestions({ tags }),
      );
      return;
    }
    void sendActiveSurface(runtime, { refreshFromService: false });
    return;
  }
  if (result.hostCommand?.command === "clearStagedTagSuggestions") {
    runWorkbenchCommandOnce(runtime, "clearStagedTagSuggestions", {}, () =>
      getDefaultSynthesisService().clearStagedTagSuggestions(),
    );
    return;
  }
  if (result.hostCommand?.command === "applyTagVocabularyImport") {
    const commandArgs = commandArgsFromPayload(envelope.payload);
    const action = String(commandArgs.action || "").trim();
    if (
      typeof commandArgs.payload === "string" &&
      commandArgs.payload.trim() &&
      (action === "use-imported" || action === "merge-non-conflicting")
    ) {
      runWorkbenchCommandOnce(
        runtime,
        "applyTagVocabularyImport",
        { action },
        () =>
          getDefaultSynthesisService().applyTagVocabularyImport({
            payload: commandArgs.payload,
            action,
          }),
      );
      return;
    }
    void sendActiveSurface(runtime, { refreshFromService: false });
    return;
  }
  if (result.hostCommand?.command === "openTopicArtifact") {
    const commandArgs = commandArgsFromPayload(envelope.payload);
    const topicId = String(commandArgs.topicId || "").trim();
    void sendTopicDetail(runtime, topicId).catch((error) =>
      reportWorkbenchError(error, runtime.window),
    );
    return;
  }
  if (result.hostCommand?.command === "exportTopicSynthesisReport") {
    const commandArgs = commandArgsFromPayload(envelope.payload);
    const topicId = String(commandArgs.topicId || "").trim();
    runWorkbenchCommandOnce(
      runtime,
      "exportTopicSynthesisReport",
      { topicId },
      () => exportTopicSynthesisReport(runtime, topicId),
      { refreshFromService: false },
    );
    return;
  }
  if (result.hostCommand?.command === "resolveTopicPaperDigest") {
    const commandArgs = commandArgsFromPayload(envelope.payload);
    void sendTopicDigest(runtime, commandArgs).catch((error) =>
      reportWorkbenchError(error, runtime.window),
    );
    return;
  }
  if (result.hostCommand?.command === "deleteTopicArtifact") {
    const commandArgs = commandArgsFromPayload(envelope.payload);
    const topicId = String(commandArgs.topicId || "").trim();
    if (
      !confirmWorkbenchAction(
        "Delete this synthesis artifact? It will be hidden and kept for later purge.",
        runtime.window,
      )
    ) {
      void sendActiveSurface(runtime, { refreshFromService: false });
      return;
    }
    runWorkbenchCommandOnce(runtime, "deleteTopicArtifact", { topicId }, () =>
      getDefaultSynthesisService()
        .deleteTopicArtifact({ topicId })
        .then((deleteResult) => {
          if (!deleteResult.ok) {
            throw new Error(deleteResult.reason);
          }
        }),
    );
    return;
  }
  if (result.hostCommand?.command === "purgeDeletedTopicArtifacts") {
    if (
      !confirmWorkbenchAction(
        "Permanently purge deleted synthesis artifacts? This cannot be undone.",
        runtime.window,
      )
    ) {
      void sendActiveSurface(runtime, { refreshFromService: false });
      return;
    }
    runWorkbenchCommandOnce(runtime, "purgeDeletedTopicArtifacts", {}, () =>
      getDefaultSynthesisService().purgeDeletedTopicArtifacts(),
    );
    return;
  }
  if (shouldRefreshGraphLayoutForAction(envelope)) {
    void refreshGraphLayoutIfNeeded(runtime).catch((error) =>
      reportWorkbenchError(error, runtime.window),
    );
    return;
  }
  void sendActiveSurface(runtime, {
    refreshFromService: false,
  });
}

function surfacesInvalidatedByCommand(
  command: SynthesisUiActionOperation["command"],
): SynthesisWorkbenchSurfaceName[] {
  if (
    command === "refreshReferenceSidecarNow" ||
    command === "retryReferenceSidecarRefresh" ||
    command === "runAdvancedReferenceMatchingNow" ||
    command === "retryAdvancedReferenceMatching"
  ) {
    return ["index", "review", "graph"];
  }
  if (
    command === "applyReferenceMatchProposalAction" ||
    command === "applyReferenceMatchProposalActions" ||
    command === "applyCanonicalRevisionReviewAction" ||
    command === "mergeEffectiveCanonicalReference" ||
    command === "applyCanonicalRevisionMergeRequests"
  ) {
    return ["index", "review", "graph"];
  }
  if (
    command === "updateCanonicalReferenceMetadata" ||
    command === "archiveCanonicalReference"
  ) {
    return ["index", "review"];
  }
  if (
    command === "refreshCitationGraphCacheIncrementalNow" ||
    command === "rebuildCitationGraphCacheNow" ||
    command === "retryCitationGraphCacheRebuild" ||
    command === "manualRecomputeLayout"
  ) {
    return ["graph"];
  }
  if (
    command === "rebuildTagVocabularyIndex" ||
    command === "previewTagVocabularyImport" ||
    command === "applyTagVocabularyImport" ||
    command === "updateStagedTagSuggestion" ||
    command === "updateTagVocabularyEntry" ||
    command === "deleteTagVocabularyEntry" ||
    command === "promoteStagedTagSuggestions" ||
    command === "discardStagedTagSuggestions" ||
    command === "clearStagedTagSuggestions"
  ) {
    return ["tags"];
  }
  if (
    command === "rebuildConceptKbIndex" ||
    command === "deleteConceptEntry" ||
    command === "updateConceptDisplayText" ||
    command === "applyConceptReviewAction"
  ) {
    return ["concepts", "review"];
  }
  if (
    command === "runSynthesizeTopic" ||
    command === "submitTopicSynthesisUpdate"
  ) {
    return ["home", "topics", "graph", "review"];
  }
  if (
    command === "acceptTopicGraphRelation" ||
    command === "rejectTopicGraphRelation" ||
    command === "applyTopicGraphReviewAction"
  ) {
    return ["home", "topics", "graph", "review"];
  }
  if (
    command === "deleteTopicArtifact" ||
    command === "purgeDeletedTopicArtifacts"
  ) {
    return ["home", "topics"];
  }
  return [surfaceForTab(createDefaultSynthesisUiState().selectedTab)];
}

function shouldRefreshGraphLayoutForAction(
  envelope: SynthesisWorkbenchActionEnvelope,
) {
  if (envelope.action === "selectTab") {
    return String(envelope.payload?.tab || "").trim() === "graph";
  }
  return (
    envelope.action === "setGraphView" &&
    ("layoutAlgorithm" in (envelope.payload || {}) ||
      "layoutPreset" in (envelope.payload || {}))
  );
}

async function refreshGraphLayoutIfNeeded(runtime: SynthesisWorkbenchRuntime) {
  if (runtime.state.selectedTab !== "graph") {
    return;
  }
  const service = getDefaultSynthesisService();
  const input = await service.getSynthesisWorkbenchSurfaceInput(
    "graph",
    runtime.state,
  );
  mergeRuntimeSnapshotInput(runtime, input);
  const status = input.graph?.layoutStatus || "missing";
  if (status === "ready" || !input.graph?.graph_hash) {
    await sendSurface(runtime, "graph", {
      refreshFromService: false,
    });
    return;
  }
  await service.recomputeCitationGraphLayout({
    algorithm: runtime.state.graph.layoutAlgorithm,
  });
  await sendSurface(runtime, "graph", {
    refreshFromService: true,
  });
}

function cleanupSynthesisRuntime(runtime: SynthesisWorkbenchRuntime) {
  if (runtime.handshakeTimer) {
    clearInterval(runtime.handshakeTimer);
    runtime.handshakeTimer = undefined;
  }
  if (runtime.libraryReadModelDirtyTimer) {
    clearTimeout(runtime.libraryReadModelDirtyTimer);
    runtime.libraryReadModelDirtyTimer = undefined;
  }
  clearCommandProgressPolling(runtime);
  clearSynthesisWorkbenchBridge(runtime);
  runtime.removeMessageListener?.();
  synthesisWorkbenchRuntimes.delete(runtime);
}

function cleanupSynthesisWorkbenchTab() {
  if (synthesisWorkbenchTab) {
    cleanupSynthesisRuntime(synthesisWorkbenchTab);
  }
  synthesisWorkbenchTab = undefined;
}

function attachWorkbenchBridge(runtime: SynthesisWorkbenchRuntime) {
  const frame = runtime.frame;
  frame.addEventListener("load", () => {
    void ensureWorkbenchHandshake(runtime);
  });
  const onMessage = (event: MessageEvent) => {
    const data = event.data as { type?: unknown };
    if (!data || data.type !== "synthesis:action") {
      return;
    }
    handleAction(runtime, data as SynthesisWorkbenchActionEnvelope);
  };
  runtime.hostWindow.addEventListener("message", onMessage);
  runtime.removeMessageListener = () => {
    runtime.hostWindow.removeEventListener("message", onMessage);
  };
}

async function ensureWorkbenchHandshake(runtime: SynthesisWorkbenchRuntime) {
  runtime.frameWindow = resolveFrameWindow(runtime.frame);
  if (!runtime.frameWindow || !installSynthesisWorkbenchBridge(runtime)) {
    return false;
  }
  return true;
}

function stopWorkbenchHandshake(runtime: SynthesisWorkbenchRuntime) {
  if (!runtime.handshakeTimer) {
    return;
  }
  clearInterval(runtime.handshakeTimer);
  runtime.handshakeTimer = undefined;
}

function finalizeWorkbenchHandshake(runtime: SynthesisWorkbenchRuntime) {
  if (runtime.handshakeComplete) {
    return;
  }
  runtime.handshakeComplete = true;
  stopWorkbenchHandshake(runtime);
  if (!runtime.snapshotInput) {
    runtime.snapshotInput = buildDefaultSnapshotInput();
  }
  void sendSnapshot(runtime, "synthesis:init", { refreshFromService: false });
  void sendChrome(runtime, { refreshFromService: false });
  void sendActiveSurface(runtime, { refreshFromService: false });
}

function scheduleWorkbenchHandshake(runtime: SynthesisWorkbenchRuntime) {
  if (runtime.handshakeComplete || runtime.handshakeTimer) {
    return;
  }
  const run = () => {
    runtime.handshakeAttemptCount += 1;
    void ensureWorkbenchHandshake(runtime).then((ok) => {
      if (ok) {
        runtime.handshakeSuccessCount += 1;
      }
      if (
        runtime.handshakeSuccessCount >=
        SYNTHESIS_WORKBENCH_HANDSHAKE_REQUIRED_SUCCESSES
      ) {
        finalizeWorkbenchHandshake(runtime);
        return;
      }
      if (
        runtime.handshakeAttemptCount >=
        SYNTHESIS_WORKBENCH_HANDSHAKE_MAX_ATTEMPTS
      ) {
        stopWorkbenchHandshake(runtime);
        if (runtime.handshakeSuccessCount > 0) {
          finalizeWorkbenchHandshake(runtime);
        }
      }
    });
  };
  run();
  runtime.handshakeTimer = setInterval(
    run,
    SYNTHESIS_WORKBENCH_HANDSHAKE_INTERVAL_MS,
  );
}

export async function mountSynthesisWorkbenchRuntime(args: {
  root: HTMLElement;
  hostWindow: Window;
  chromeWindow: _ZoteroTypes.MainWindow;
  snapshotInput?: SynthesisUiSnapshotInput;
}): Promise<MountedSynthesisWorkbenchRuntime> {
  while (args.root.firstChild) {
    args.root.removeChild(args.root.firstChild);
  }
  const doc = args.root.ownerDocument || args.hostWindow.document;
  const frame = createSynthesisBrowser(doc);
  args.root.appendChild(frame);
  const initialSnapshotInput =
    args.snapshotInput || prewarmedSynthesisSnapshotInput;
  const runtime: SynthesisWorkbenchRuntime = {
    tabId: SYNTHESIS_WORKBENCH_EMBEDDED_ID,
    window: args.chromeWindow,
    hostWindow: args.hostWindow,
    frame,
    frameWindow: resolveFrameWindow(frame),
    handshakeAttemptCount: 0,
    handshakeSuccessCount: 0,
    handshakeComplete: false,
    state: createDefaultSynthesisUiState(),
    snapshotInput: initialSnapshotInput,
    snapshotInputLocked: Boolean(args.snapshotInput),
    loadedSurfaces: new Set(),
    dirtySurfaces: new Set(),
    surfaceRequestSeq: 0,
    latestSurfaceRequestBySurface: {},
    libraryReadModelRevision: synthesisLibraryReadModelRevision,
    inFlightCommands: new Map(),
    actionWarnings: [],
  };
  registerSynthesisWorkbenchRuntime(runtime);
  attachWorkbenchBridge(runtime);
  setSynthesisBrowserSource(frame, resolveSynthesisPageUrl());
  scheduleWorkbenchHandshake(runtime);
  return {
    refresh: async () => {
      await sendChrome(runtime, { refreshFromService: true });
      await sendActiveSurface(runtime, { refreshFromService: true });
    },
    cleanup: () => cleanupSynthesisRuntime(runtime),
  };
}

export async function openSynthesisWorkbenchTab(
  args: {
    window?: _ZoteroTypes.MainWindow;
    snapshotInput?: SynthesisUiSnapshotInput;
  } = {},
) {
  const hostWindow = resolveWorkflowHostWindow(args.window);
  const tabs = resolveZoteroTabs(hostWindow);
  if (!hostWindow || !tabs?.add || !tabs.select) {
    throw new Error(
      "Cannot open Synthesis Workbench: Zotero_Tabs is unavailable.",
    );
  }
  const Zotero_Tabs = tabs as ZoteroTabs & {
    add: NonNullable<ZoteroTabs["add"]>;
    select: NonNullable<ZoteroTabs["select"]>;
  };
  if (synthesisWorkbenchTab) {
    Zotero_Tabs.select(SYNTHESIS_WORKBENCH_TAB_ID);
    return;
  }
  const result = Zotero_Tabs.add({
    id: SYNTHESIS_WORKBENCH_TAB_ID,
    type: "synthesis-workbench",
    title: localize("synthesis-workbench-title", "Synthesis"),
    data: {
      kind: "synthesis-workbench",
      icon: SYNTHESIS_WORKBENCH_TAB_ICON,
      iconURI: SYNTHESIS_WORKBENCH_TAB_ICON_URI,
    },
    select: true,
    onClose: cleanupSynthesisWorkbenchTab,
  });
  const container = result?.container;
  if (!container) {
    throw new Error(
      "Cannot open Synthesis Workbench: tab container is missing.",
    );
  }
  const frame = createSynthesisBrowser(hostWindow.document);
  container.appendChild(frame);
  const initialSnapshotInput =
    args.snapshotInput || prewarmedSynthesisSnapshotInput;
  const runtime: SynthesisWorkbenchRuntime = {
    tabId: SYNTHESIS_WORKBENCH_TAB_ID,
    window: hostWindow,
    hostWindow,
    frame,
    frameWindow: resolveFrameWindow(frame),
    handshakeAttemptCount: 0,
    handshakeSuccessCount: 0,
    handshakeComplete: false,
    state: createDefaultSynthesisUiState(),
    snapshotInput: initialSnapshotInput,
    snapshotInputLocked: Boolean(args.snapshotInput),
    loadedSurfaces: new Set(),
    dirtySurfaces: new Set(),
    surfaceRequestSeq: 0,
    latestSurfaceRequestBySurface: {},
    libraryReadModelRevision: synthesisLibraryReadModelRevision,
    inFlightCommands: new Map(),
    actionWarnings: [],
  };
  synthesisWorkbenchTab = runtime;
  registerSynthesisWorkbenchRuntime(runtime);
  attachWorkbenchBridge(runtime);
  setSynthesisBrowserSource(frame, resolveSynthesisPageUrl());
  scheduleWorkbenchHandshake(runtime);
  Zotero_Tabs.select(SYNTHESIS_WORKBENCH_TAB_ID);
}

export async function resetSynthesisWorkbenchTabRuntimeForTests() {
  cleanupSynthesisWorkbenchTab();
}

export function prewarmSynthesisWorkbenchSurfaces(
  args: {
    surfaces?: SynthesisWorkbenchSurfaceName[];
  } = {},
): Promise<SynthesisUiSnapshotInput | undefined> {
  if (prewarmSynthesisSurfacesPromise) {
    return prewarmSynthesisSurfacesPromise;
  }
  prewarmSynthesisSurfacesPromise = getDefaultSynthesisService()
    .warmSynthesisWorkbenchSurfaces({
      state: synthesisWorkbenchTab?.state || createDefaultSynthesisUiState(),
      surfaces: args.surfaces,
      onPhase: async (phase) => {
        if (phase.input) {
          prewarmedSynthesisSnapshotInput = mergeSynthesisUiSnapshotInput(
            prewarmedSynthesisSnapshotInput || buildDefaultSnapshotInput(),
            phase.input,
          );
        }
        const runtime = synthesisWorkbenchTab;
        if (!runtime || !phase.input) {
          return;
        }
        mergeRuntimeSnapshotInput(runtime, phase.input);
        if (phase.surface === "chrome") {
          await sendChrome(runtime, { refreshFromService: false });
          return;
        }
        markSurfaceLoaded(runtime, phase.surface);
        if (surfaceForTab(runtime.state.selectedTab) === phase.surface) {
          await sendSurface(runtime, phase.surface, {
            refreshFromService: false,
          });
        }
      },
    })
    .then((input) => {
      prewarmedSynthesisSnapshotInput = mergeSynthesisUiSnapshotInput(
        prewarmedSynthesisSnapshotInput || buildDefaultSnapshotInput(),
        input,
      );
      return prewarmedSynthesisSnapshotInput;
    })
    .catch(() => undefined)
    .finally(() => {
      prewarmSynthesisSurfacesPromise = undefined;
    });
  return prewarmSynthesisSurfacesPromise;
}

export async function closeSynthesisWorkbenchTab() {
  const tabs = resolveZoteroTabs(synthesisWorkbenchTab?.window);
  if (tabs?.close) {
    tabs.close(SYNTHESIS_WORKBENCH_TAB_ID);
  }
  cleanupSynthesisWorkbenchTab();
}
