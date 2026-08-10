import { config } from "../../package.json";
import {
  SynthesisClientError,
  type SynthesisClient,
  type SynthesisCitationGraphPageMetadata,
  type SynthesisGraphCommandResult,
  type SynthesisJsonObject,
  type SynthesisPublicMaintenanceOperation,
  type SynthesisReferenceMatchProposalDecision,
  type SynthesisSyncConflictResolutionAction,
} from "../../packages/synthesis-contracts/src/index";
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
import {
  copyRuntimeFile,
  getRuntimePersistencePaths,
  readRuntimeTextFile,
  runtimePathExists,
  writeRuntimeTextFile,
} from "./runtimePersistence";
import { readPackagedBinaryAsset } from "./packagedAssetResolver";
import { isTransientStorageBusyError } from "./guardedSqlite";
import {
  getDefaultSynthesisClient,
  getFreshDefaultSynthesisClient,
} from "./synthesisClient/defaultClient";
import {
  classifySynthesisWorkbenchGraphMutationResult,
  createSynthesisWorkbenchGraphLayoutFailure,
  resolveSynthesisWorkbenchGraphLayoutStatus,
  selectSynthesisWorkbenchGraphLayoutFailure,
  toSynthesisUiSnapshotInput,
  toSynthesisWorkbenchPaperDigestReadRequest,
  toSynthesisWorkbenchReadState,
  type SynthesisWorkbenchGraphLayoutFailure,
} from "./synthesisClient/workbenchUiAdapter";
import {
  buildSynthesisStoragePaths,
  hashCanonicalJson,
  topicPathId,
} from "./synthesis/foundation";
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
  type SynthesisUiGraphEdge,
  type SynthesisUiGraphNode,
  type SynthesisUiSnapshotInput,
  type SynthesisUiState,
  type SynthesisUiTab,
  type SynthesisWorkbenchSurfaceName,
} from "./synthesis/uiModel";
import {
  continueSynthesisCitationGraphWindow,
  createSynthesisCitationGraphWindow,
  failSynthesisCitationGraphWindow,
  mergeSynthesisCitationGraphPage,
  mergeSynthesisCitationGraphSlice,
  retrySynthesisCitationGraphWindow,
  type SynthesisCitationGraphWindow,
} from "../shared/synthesisCitationGraphWindow";
import { registerBackgroundRefreshTimer } from "./backgroundRefreshGovernance";
import { delay, yieldToEventLoop } from "../utils/runtimeCompatibility";
import {
  BUILTIN_STATUS_FACET,
  isBuiltinStatusTag,
} from "./synthesis/builtinTagPolicy";
import { readSynthesisSidecarTraceSnapshot } from "./synthesisSidecarTrace";
import { openTaskManagerDialog } from "./taskManagerDialog";
import { isSynthesisLiteratureScoreInvalidationEvent } from "./synthesis/itemObserver";
import {
  getSynthesisWorkbenchSidecarStatus,
  observeSynthesisWorkbenchSidecarStatus,
  subscribeSynthesisWorkbenchSidecarStatus,
} from "./synthesisSidecarRuntimeSupervisor";

type SynthesisBridgeMessageType =
  | "synthesis:init"
  | "synthesis:snapshot"
  | "synthesis:chrome"
  | "synthesis:surface"
  | "synthesis:surface-error"
  | "synthesis:graph-page"
  | "synthesis:topic-detail"
  | "synthesis:digest";

type SynthesisWorkbenchActionEnvelope = {
  type: "synthesis:action";
  action: string;
  payload?: Record<string, unknown>;
};

type SynthesisTopicDetailDto = Record<string, unknown> & {
  topicId?: string;
  title?: string;
  source_papers?: unknown[];
};

type SynthesisExportGraphSnapshot = ReturnType<
  typeof buildSynthesisUiSnapshot
>["graph"];

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
  inFlightSurfaceRefreshes: Partial<
    Record<SynthesisWorkbenchSurfaceName, Promise<void>>
  >;
  queuedServiceSurfaceRefreshes: Set<SynthesisWorkbenchSurfaceName>;
  libraryReadModelRevision: number;
  libraryReadModelDirtyTimer?: ReturnType<typeof setTimeout>;
  inFlightCommands: Map<string, SynthesisUiActionOperation>;
  lastCompletedCommand?: SynthesisUiActionOperation;
  lastFailedCommand?: SynthesisUiActionOperation;
  actionWarnings: SynthesisUiActionOperation[];
  graphLayoutFailure?: SynthesisWorkbenchGraphLayoutFailure;
  graphGeneration: number;
  graphWindow?: SynthesisCitationGraphWindow<
    SynthesisUiGraphNode,
    SynthesisUiGraphEdge
  >;
  graphPageLoop?: Promise<void>;
  cleanedUp?: boolean;
  sidecarStatusTimer?: ReturnType<typeof setInterval>;
  sidecarStatusObservationRunning?: boolean;
  removeSidecarStatusListener?: () => void;
};

type SurfaceRefreshRequestMeta = {
  requestId: number;
  surface: SynthesisWorkbenchSurfaceName;
  selectedTabAtRequest: SynthesisUiTab;
  refreshFromService: boolean;
  libraryReadModelRevision: number;
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
    libraryReadModelRevision: runtime.libraryReadModelRevision,
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
const SYNTHESIS_WORKBENCH_SIDECAR_STATUS_INTERVAL_MS = 5_000;
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
  return `chrome://${addonRef}/content/synthesis/index.html?ui=20260617-taxonomy-axis-v2`;
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
    reviews: {
      summary: {
        openCount: 0,
        indexCount: 0,
        referenceMatchingCount: 0,
        conceptCount: 0,
        topicGraphCount: 0,
      },
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
  const fallbackMessage =
    error instanceof Error ? error.message : String(error || "unknown error");
  const sidecar = readSynthesisSidecarTraceSnapshot()
    .traces.flatMap((trace) => trace.events)
    .filter(
      (event) => event.boundary === "supervisor" && event.outcome === "failed",
    )
    .sort((left, right) => right.occurredAtMs - left.occurredAtMs)[0];
  const isSidecarFailure = Boolean(sidecar);
  const message = isSidecarFailure
    ? [
        `Synthesis sidecar startup failed during ${sidecar?.phase}.`,
        sidecar?.code ? `Code: ${sidecar.code}.` : "",
      ]
        .filter(Boolean)
        .join(" ")
    : fallbackMessage;
  const diagnosticCode = isSidecarFailure
    ? "synthesis_sidecar_startup_failed"
    : "synthesis_snapshot_failed";
  return {
    ...fallback,
    sync: {
      status: "check_skipped",
      diagnostics: [
        {
          code: diagnosticCode,
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
            code: diagnosticCode,
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
  const input = runtime.snapshotInput || buildDefaultSnapshotInput();
  const graph = input.graph;
  const graphLayoutFailure = selectSynthesisWorkbenchGraphLayoutFailure({
    graphHash: graph?.graph_hash,
    layoutAlgorithm: runtime.state.graph.layoutAlgorithm,
    failure: runtime.graphLayoutFailure,
  });
  const graphDiagnostics = { ...(graph?.diagnostics || {}) };
  delete graphDiagnostics.layout_failure;
  if (graphLayoutFailure) {
    graphDiagnostics.layout_failure = {
      graph_hash: graphLayoutFailure.graphHash,
      layout_algorithm: graphLayoutFailure.layoutAlgorithm,
      code: graphLayoutFailure.code,
      ...(graphLayoutFailure.mutationStatus
        ? { mutation_status: graphLayoutFailure.mutationStatus }
        : {}),
      message: graphLayoutFailure.message,
      occurred_at: graphLayoutFailure.occurredAt,
    };
  }
  return buildSynthesisUiSnapshot(
    {
      ...input,
      sidecarStatus: getSynthesisWorkbenchSidecarStatus(),
      actions: actionStatusInput(runtime),
      ...(graph
        ? {
            graph: {
              ...graph,
              layoutStatus: resolveSynthesisWorkbenchGraphLayoutStatus({
                graphHash: graph.graph_hash,
                layoutAlgorithm: runtime.state.graph.layoutAlgorithm,
                layoutStatus: graph.layoutStatus,
                failure: runtime.graphLayoutFailure,
              }),
              diagnostics: graphDiagnostics,
            },
          }
        : {}),
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
  libraryReadModelRevision = runtime.libraryReadModelRevision,
) {
  runtime.loadedSurfaces.add(surface);
  if (runtime.libraryReadModelRevision === libraryReadModelRevision) {
    runtime.dirtySurfaces.delete(surface);
  } else {
    runtime.dirtySurfaces.add(surface);
  }
}

function markSurfaceDirty(
  runtime: SynthesisWorkbenchRuntime,
  surface: SynthesisWorkbenchSurfaceName,
) {
  runtime.dirtySurfaces.add(surface);
}

function registerSynthesisWorkbenchRuntime(runtime: SynthesisWorkbenchRuntime) {
  synthesisWorkbenchRuntimes.add(runtime);
  runtime.removeSidecarStatusListener =
    subscribeSynthesisWorkbenchSidecarStatus(() => {
      if (!runtime.cleanedUp)
        void sendChrome(runtime, { refreshFromService: false });
    });
  const observe = async () => {
    if (
      runtime.cleanedUp ||
      runtime.sidecarStatusObservationRunning ||
      runtime.frameWindow?.document?.visibilityState === "hidden"
    ) {
      return;
    }
    runtime.sidecarStatusObservationRunning = true;
    try {
      await observeSynthesisWorkbenchSidecarStatus();
    } finally {
      runtime.sidecarStatusObservationRunning = false;
    }
  };
  registerBackgroundRefreshTimer({
    owner: "synthesis-sidecar-workbench-status",
    activationCondition: "Synthesis Workbench is mounted and foreground",
    scopeKey: runtime.tabId,
    allowedDataSources: ["sidecar supervisor snapshot", "sidecar health"],
    maxReadShape: "bounded lifecycle and compute-pool counters",
    requiresForegroundSurface: true,
    minimumIntervalMs: SYNTHESIS_WORKBENCH_SIDECAR_STATUS_INTERVAL_MS,
    intervalMs: SYNTHESIS_WORKBENCH_SIDECAR_STATUS_INTERVAL_MS,
  });
  runtime.sidecarStatusTimer = setInterval(
    () => void observe(),
    SYNTHESIS_WORKBENCH_SIDECAR_STATUS_INTERVAL_MS,
  );
  void observe();
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
  const invalidatedSurfaces: SynthesisWorkbenchSurfaceName[] =
    isSynthesisLiteratureScoreInvalidationEvent(args)
      ? ["index", "topics", "home"]
      : ["index"];
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
  const invalidatedSurfaces = args.invalidatedSurfaces;
  for (const runtime of synthesisWorkbenchRuntimes) {
    if (invalidatedSurfaces.includes("graph")) {
      runtime.graphGeneration += 1;
      runtime.graphWindow = undefined;
    }
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

function findTagBootstrapperWorkflow() {
  return (
    getLoadedWorkflowEntries().find(
      (entry) => entry.manifest.id === "tag-bootstrapper",
    ) || null
  );
}

function findRegistryItemWorkflow(workflowId: string) {
  if (workflowId !== "literature-analysis" && workflowId !== "tag-regulator") {
    throw new Error(`Unsupported registry item workflow: ${workflowId}`);
  }
  const workflow = getLoadedWorkflowEntries().find(
    (entry) => entry.manifest.id === workflowId,
  );
  if (!workflow) {
    throw new Error(
      `Cannot run ${workflowId}: workflow is not loaded. Rescan builtin workflows and try again.`,
    );
  }
  return workflow;
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
  const client = await getDefaultSynthesisClient();
  const topicInput = toSynthesisUiSnapshotInput(
    await client.workbench.readSurface({
      surface: "topics",
      state: toSynthesisWorkbenchReadState(createDefaultSynthesisUiState()),
    }),
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

async function runTagBootstrapperFromWorkbench(args: {
  hostWindow?: _ZoteroTypes.MainWindow;
}) {
  const hostWindow = resolveWorkflowHostWindow(args.hostWindow);
  if (!hostWindow) {
    throw new Error(
      "Cannot bootstrap tags: Zotero main window is unavailable.",
    );
  }
  const workflow = findTagBootstrapperWorkflow();
  if (!workflow) {
    alertWindow(
      hostWindow,
      "Cannot bootstrap tags: tag-bootstrapper workflow is not loaded. Rescan builtin workflows and try again.",
    );
    return;
  }
  await executeWorkflowFromCurrentSelection({
    win: hostWindow,
    workflow,
    requireSettingsGate: true,
  });
}

async function runRegistryItemWorkflowFromWorkbench(
  runtime: SynthesisWorkbenchRuntime,
  args: { libraryId: number; itemKey: string; workflowId: string },
) {
  const hostWindow = await selectZoteroItem(runtime, args);
  await executeWorkflowFromCurrentSelection({
    win: hostWindow,
    workflow: findRegistryItemWorkflow(args.workflowId),
    requireSettingsGate: true,
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
  registerBackgroundRefreshTimer({
    owner: "synthesis-command-progress",
    activationCondition: "synthesis command is in flight",
    scopeKey: "in-flight synthesis commands",
    allowedDataSources: ["synthesis command progress"],
    maxReadShape: "current command progress snapshot only",
    requiresForegroundSurface: true,
    minimumIntervalMs: SYNTHESIS_WORKBENCH_COMMAND_PROGRESS_INTERVAL_MS,
    intervalMs: SYNTHESIS_WORKBENCH_COMMAND_PROGRESS_INTERVAL_MS,
  });
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

function isSyncRuntimeCommand(
  command: SynthesisUiActionOperation["command"] | undefined,
) {
  return (
    command === "syncWebDavNow" ||
    command === "pauseWebDavSync" ||
    command === "resumeWebDavSync" ||
    command === "retryWebDavSync" ||
    command === "resolveWebDavSyncConflict"
  );
}

function hasInFlightSyncCommand(runtime: SynthesisWorkbenchRuntime) {
  return Array.from(runtime.inFlightCommands.values()).some((operation) =>
    isSyncRuntimeCommand(operation.command),
  );
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
    if (hasInFlightSyncCommand(runtime)) {
      await sendChrome(runtime, {
        refreshFromService: true,
      });
      return;
    }
    if (!runtime.snapshotInputLocked) {
      const client = await getDefaultSynthesisClient();
      mergeRuntimeSnapshotInput(
        runtime,
        toSynthesisUiSnapshotInput(await client.workbench.readProgress()),
      );
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
    refreshFromService: isSyncRuntimeCommand(command),
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

async function observePublicMaintenanceOperation(
  client: Pick<SynthesisClient, "maintenance">,
  accepted: SynthesisPublicMaintenanceOperation,
  options: {
    deadlineMs?: number;
    isDisposed?: () => boolean;
  } = {},
): Promise<SynthesisJsonObject> {
  let operation = accepted;
  const deadline = Date.now() + (options.deadlineMs ?? 31 * 60_000);
  while (operation.status === "pending" || operation.status === "running") {
    if (options.isDisposed?.()) {
      throw new Error(
        `Stopped observing Synthesis maintenance operation ${operation.operation_id}.`,
      );
    }
    if (Date.now() >= deadline) {
      throw new Error(
        `Synthesis maintenance operation ${operation.operation_id} is still running after the observer deadline.`,
      );
    }
    await delay(250);
    operation = await client.maintenance.getOperation({
      operation_id: operation.operation_id,
    });
  }
  if (operation.status === "completed") {
    return operation.receipt && typeof operation.receipt === "object"
      ? (operation.receipt as SynthesisJsonObject)
      : {};
  }
  if (operation.receipt && typeof operation.receipt === "object") {
    failOnDiagnostic(operation.receipt, operation.operation_id);
    failOnSyncFailureState(operation.receipt);
  }
  throw new Error(
    `Synthesis maintenance operation ${operation.operation_id} ended with ${operation.status}.`,
  );
}

function failOnDiagnostic<T>(result: T, operationId?: string): T {
  if (!result || typeof result !== "object") {
    return result;
  }
  const row = result as Record<string, unknown>;
  const diagnostic = "diagnostic" in result && row.diagnostic;
  if (diagnostic && typeof diagnostic === "object") {
    const diagnosticRow = diagnostic as Record<string, unknown>;
    throw new Error(
      String(diagnosticRow.message || diagnosticRow.code || "Action failed."),
    );
  }
  const maintenanceFailure =
    row.schema === "synthesis.maintenance_receipt.v1" &&
    row.outcome === "failed";
  if (
    ("ok" in result && row.ok === false) ||
    maintenanceFailure ||
    operationId
  ) {
    const diagnostics = [
      ...("diagnostics" in result && Array.isArray(row.diagnostics)
        ? row.diagnostics
        : []),
      ...("warnings" in result && Array.isArray(row.warnings)
        ? row.warnings
        : []),
    ];
    const firstDiagnostic = diagnostics.find(
      (entry) =>
        typeof entry === "string" ||
        (entry !== null && typeof entry === "object"),
    );
    const message =
      firstDiagnostic && typeof firstDiagnostic === "object"
        ? (firstDiagnostic as Record<string, unknown>).message ||
          (firstDiagnostic as Record<string, unknown>).code
        : firstDiagnostic;
    const code = String(
      message || row.status || row.queue_state || "Action failed.",
    );
    throw new Error(operationId ? `${code} [${operationId}]` : code);
  }
  return result;
}

function syncStateString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function firstSyncDiagnosticMessage(
  diagnostics: unknown[],
  fallback = "Sync failed.",
) {
  const row = diagnostics.find(
    (entry) => entry && typeof entry === "object",
  ) as Record<string, unknown> | undefined;
  if (!row) {
    return fallback;
  }
  const code = syncStateString(row.code);
  const message = syncStateString(row.message);
  if (code && message) {
    return `${code}: ${message}`;
  }
  return message || code || fallback;
}

function failOnSyncFailureState<T>(result: T): T {
  if (!result || typeof result !== "object") {
    return result;
  }
  const row = result as Record<string, unknown>;
  const queueState = syncStateString(row.queue_state);
  const lastRun =
    row.last_run && typeof row.last_run === "object"
      ? (row.last_run as Record<string, unknown>)
      : {};
  const lastRunStatus = syncStateString(lastRun.status);
  const failed =
    queueState === "failed_retryable" ||
    queueState === "failed_permanent" ||
    lastRunStatus === "failed_retryable" ||
    lastRunStatus === "failed_permanent";
  if (!failed) {
    return result;
  }
  const diagnostics = [
    ...(Array.isArray(row.diagnostics) ? row.diagnostics : []),
    ...(Array.isArray(lastRun.diagnostics) ? lastRun.diagnostics : []),
  ];
  throw new Error(firstSyncDiagnosticMessage(diagnostics));
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
  postWorkbenchMessage(runtime, messageType, snapshotForRuntime(runtime));
}

async function sendChrome(
  runtime: SynthesisWorkbenchRuntime,
  options: { refreshFromService?: boolean } = {},
) {
  if (!runtime?.frameWindow) {
    return;
  }
  if (options.refreshFromService !== false && !runtime.snapshotInputLocked) {
    const client = await getDefaultSynthesisClient();
    const input = await client.workbench
      .readChrome({
        state: toSynthesisWorkbenchReadState(runtime.state),
      })
      .then(toSynthesisUiSnapshotInput)
      .catch((error) => buildSnapshotErrorInput(error));
    mergeRuntimeSnapshotInput(runtime, input);
  }
  postWorkbenchMessage(
    runtime,
    "synthesis:chrome",
    snapshotForRuntime(runtime),
  );
}

function graphPageNumber(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.floor(parsed)) : fallback;
}

function mergeGraphPageInput(
  runtime: SynthesisWorkbenchRuntime,
  input: SynthesisUiSnapshotInput,
  generation: number,
  kind: "page" | "slice" = "page",
) {
  const graph = input.graph;
  const page = graph?.page;
  if (!graph || !page || generation !== runtime.graphGeneration) {
    return false;
  }
  const graphHash = String(graph.graph_hash || "").trim();
  const querySignature = String(page.querySignature || "").trim();
  if (!graphHash || !querySignature || !runtime.graphWindow) {
    return false;
  }
  const hoverNodeIds = new Set(
    (graph.hoverOnlyNodes || []).map((node) => node.id),
  );
  const hoverEdgeIds = new Set(
    (graph.hoverOnlyEdges || []).map((edge) => edge.id),
  );
  const patch = {
    generation,
    graphHash,
    querySignature,
    nodes: (graph.nodes || []).filter(
      (node) => node.visibility !== "hover_only" && !hoverNodeIds.has(node.id),
    ),
    edges: (graph.edges || []).filter(
      (edge) => edge.visibility !== "hover_only" && !hoverEdgeIds.has(edge.id),
    ),
    hoverOnlyNodes: graph.hoverOnlyNodes || [],
    hoverOnlyEdges: graph.hoverOnlyEdges || [],
    nextCursor: String(page.nextCursor || "").trim() || undefined,
    hasMore: Boolean(page.hasMore),
    totalNodes: graphPageNumber(page.totalNodes),
    totalEdges: graphPageNumber(page.totalEdges),
    totalHoverNodes: graphPageNumber(page.totalHoverNodes),
    totalHoverEdges: graphPageNumber(page.totalHoverEdges),
  };
  const merged =
    kind === "slice"
      ? mergeSynthesisCitationGraphSlice(runtime.graphWindow, patch)
      : mergeSynthesisCitationGraphPage(runtime.graphWindow, patch);
  if (!merged.accepted) {
    return false;
  }
  runtime.graphWindow = merged.window;
  graph.nodes = [...merged.window.nodes, ...merged.window.hoverOnlyNodes];
  graph.edges = [...merged.window.edges, ...merged.window.hoverOnlyEdges];
  graph.hoverOnlyNodes = [...merged.window.hoverOnlyNodes];
  graph.hoverOnlyEdges = [...merged.window.hoverOnlyEdges];
  graph.page = {
    ...page,
    nextCursor: merged.window.nextCursor || "",
    hasMore: merged.window.hasMore,
    totalNodes: merged.window.totalNodes,
    totalEdges: merged.window.totalEdges,
    totalHoverNodes: merged.window.totalHoverNodes,
    totalHoverEdges: merged.window.totalHoverEdges,
    returnedNodes: merged.addedNodes,
    returnedEdges: merged.addedEdges,
    querySignature: merged.window.querySignature || "",
    windowStatus: merged.window.status,
  };
  return true;
}

function graphWindowError(error: unknown) {
  const details =
    error && typeof error === "object" && "details" in error
      ? (error as { details?: Record<string, unknown> }).details
      : undefined;
  return {
    code: String(details?.sidecarCode || "surface_refresh_failed"),
    reason: String(
      details?.sidecarReason ||
        (error instanceof Error ? error.message : error || ""),
    ).slice(0, 160),
  };
}

function publishGraphPage(
  runtime: SynthesisWorkbenchRuntime,
  request: SurfaceRefreshRequestMeta,
) {
  if (!runtime.frameWindow || !runtime.snapshotInput) return;
  postWorkbenchMessage(runtime, "synthesis:graph-page", {
    surface: "graph",
    request,
    requestId: request.requestId,
    generation: runtime.graphGeneration,
    snapshot: snapshotForRuntime(runtime),
  });
}

async function loadGraphContinuationPages(
  runtime: SynthesisWorkbenchRuntime,
  request: SurfaceRefreshRequestMeta,
  generation: number,
) {
  if (runtime.graphPageLoop) return runtime.graphPageLoop;
  const loop = (async () => {
    while (
      !runtime.cleanedUp &&
      generation === runtime.graphGeneration &&
      isLatestSurfaceRefreshRequest(runtime, request) &&
      isActiveSurface(runtime, "graph") &&
      runtime.graphWindow?.status === "loading" &&
      runtime.graphWindow.hasMore
    ) {
      const cursor = runtime.graphWindow.nextCursor;
      const graphHash = runtime.graphWindow.graphHash;
      if (!cursor || !graphHash) break;
      try {
        const client = await getDefaultSynthesisClient();
        const input = toSynthesisUiSnapshotInput(
          await client.workbench.readSurface({
            surface: "graph",
            state: toSynthesisWorkbenchReadState(runtime.state, {
              graphWindowCursor: cursor,
              expectedGraphHash: graphHash,
            }),
          }),
        );
        if (
          !isLatestSurfaceRefreshRequest(runtime, request) ||
          !isActiveSurface(runtime, "graph") ||
          generation !== runtime.graphGeneration ||
          !mergeGraphPageInput(runtime, input, generation)
        ) {
          break;
        }
        mergeRuntimeSnapshotInput(runtime, input);
        publishGraphPage(runtime, request);
        await yieldToEventLoop();
      } catch (error) {
        if (generation !== runtime.graphGeneration || !runtime.graphWindow) {
          break;
        }
        const failure = graphWindowError(error);
        runtime.graphWindow = failSynthesisCitationGraphWindow(
          runtime.graphWindow,
          failure.code,
          failure.reason,
        );
        if (runtime.snapshotInput?.graph?.page) {
          runtime.snapshotInput.graph.page = {
            ...runtime.snapshotInput.graph.page,
            windowStatus: "failed",
            error: failure,
          };
        }
        publishGraphPage(runtime, request);
        break;
      }
    }
  })();
  runtime.graphPageLoop = loop;
  try {
    await loop;
  } finally {
    if (runtime.graphPageLoop === loop) runtime.graphPageLoop = undefined;
  }
}

function currentGraphSurfaceRequest(
  runtime: SynthesisWorkbenchRuntime,
): SurfaceRefreshRequestMeta | undefined {
  const requestId = runtime.latestSurfaceRequestBySurface.graph;
  if (!requestId) return undefined;
  return {
    requestId,
    surface: "graph",
    selectedTabAtRequest: "graph",
    refreshFromService: true,
    libraryReadModelRevision: runtime.libraryReadModelRevision,
    startedAt: new Date().toISOString(),
  };
}

async function expandGraphNeighborhood(
  runtime: SynthesisWorkbenchRuntime,
  payload: Record<string, unknown>,
) {
  const window = runtime.graphWindow;
  const request = currentGraphSurfaceRequest(runtime);
  const nodeId = String(payload.nodeId || "").trim();
  const direction = String(payload.direction || "both");
  if (
    !window?.graphHash ||
    !window.querySignature ||
    !request ||
    !nodeId ||
    !["incoming", "outgoing", "both"].includes(direction)
  ) {
    return;
  }
  const generation = runtime.graphGeneration;
  const client = await getDefaultSynthesisClient();
  const result = await client.graph.getSlice({
    startNodeId: nodeId,
    depth: 1,
    direction: direction as "incoming" | "outgoing" | "both",
    maxNodes: 100,
    maxEdges: 200,
    expectedGraphHash: window.graphHash,
    querySignature: window.querySignature,
    layoutAlgorithm: runtime.state.graph.layoutAlgorithm,
    filters: {
      topicId:
        runtime.state.graph.topicId === "all"
          ? undefined
          : runtime.state.graph.topicId,
      nodeKinds: runtime.state.graph.nodeKinds,
      roles:
        runtime.state.graph.role === "all" ? [] : [runtime.state.graph.role],
      includeLowSignal: runtime.state.graph.showLowSignalReferences,
      search: runtime.state.graph.search,
    },
  });
  if (
    generation !== runtime.graphGeneration ||
    !isLatestSurfaceRefreshRequest(runtime, request) ||
    !isActiveSurface(runtime, "graph")
  ) {
    return;
  }
  const input: SynthesisUiSnapshotInput = {
    libraryId: runtime.snapshotInput?.libraryId || 0,
    graph: {
      graph_hash: result.graph_hash,
      nodes: result.nodes.map((node) => ({
        id: node.node_id,
        label: node.title || node.node_id,
        kind: node.kind,
        year: node.year,
        authors: node.authors,
        low_signal: node.low_signal,
        external_degree: node.external_degree,
        visibility: node.visibility,
        display_tier: node.display_tier,
      })),
      edges: result.edges.map((edge) => ({
        id: edge.edge_id,
        source: edge.source,
        target: edge.target,
        primary_role: edge.primary_role,
        mention_count: edge.mention_count,
        visibility: edge.visibility,
      })),
      page: {
        querySignature: result.querySignature || window.querySignature,
        nextCursor: window.nextCursor || "",
        hasMore: window.hasMore,
        totalNodes: window.totalNodes,
        totalEdges: window.totalEdges,
        totalHoverNodes: window.totalHoverNodes,
        totalHoverEdges: window.totalHoverEdges,
        windowStatus: window.status,
        roleOptions: runtime.snapshotInput?.graph?.page?.roleOptions || [],
      },
    },
  };
  if (mergeGraphPageInput(runtime, input, generation, "slice")) {
    mergeRuntimeSnapshotInput(runtime, input);
    publishGraphPage(runtime, request);
  }
}

async function performSurfaceSend(
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
  const graphGeneration =
    surface === "graph" && refreshFromService
      ? ++runtime.graphGeneration
      : runtime.graphGeneration;
  if (surface === "graph" && refreshFromService) {
    // Detach the superseded loop immediately. Its generation guard will make
    // any in-flight result inert while the replacement query starts loading.
    runtime.graphPageLoop = undefined;
    runtime.graphWindow = createSynthesisCitationGraphWindow({
      generation: graphGeneration,
    });
  }
  try {
    if (refreshFromService && !runtime.snapshotInputLocked) {
      const client = await getDefaultSynthesisClient();
      const input = toSynthesisUiSnapshotInput(
        await client.workbench.readSurface({
          surface,
          state: toSynthesisWorkbenchReadState(runtime.state),
        }),
      );
      if (!isLatestSurfaceRefreshRequest(runtime, request)) {
        return;
      }
      if (
        surface === "graph" &&
        String(input.graph?.graph_hash || "").trim() &&
        !mergeGraphPageInput(runtime, input, graphGeneration)
      ) {
        return;
      }
      mergeRuntimeSnapshotInput(runtime, input);
      markSurfaceLoaded(runtime, surface, request.libraryReadModelRevision);
      if (
        runtime.libraryReadModelRevision !== request.libraryReadModelRevision &&
        isActiveSurface(runtime, surface)
      ) {
        runtime.queuedServiceSurfaceRefreshes.add(surface);
      }
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
    if (
      surface === "graph" &&
      refreshFromService &&
      runtime.graphWindow?.status === "loading"
    ) {
      void loadGraphContinuationPages(runtime, request, graphGeneration);
    }
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

async function sendSurface(
  runtime: SynthesisWorkbenchRuntime,
  surface: SynthesisWorkbenchSurfaceName,
  options: { refreshFromService?: boolean } = {},
) {
  const refreshFromService = options.refreshFromService !== false;
  const inFlight = runtime.inFlightSurfaceRefreshes[surface];
  if (inFlight) {
    if (refreshFromService) {
      runtime.queuedServiceSurfaceRefreshes.add(surface);
    }
    return inFlight;
  }

  const run = (async () => {
    let nextRefreshFromService = refreshFromService;
    do {
      runtime.queuedServiceSurfaceRefreshes.delete(surface);
      await performSurfaceSend(runtime, surface, {
        refreshFromService: nextRefreshFromService,
      });
      nextRefreshFromService =
        runtime.queuedServiceSurfaceRefreshes.has(surface) &&
        isActiveSurface(runtime, surface);
    } while (nextRefreshFromService);
  })();
  runtime.inFlightSurfaceRefreshes[surface] = run;
  try {
    await run;
  } finally {
    if (runtime.inFlightSurfaceRefreshes[surface] === run) {
      delete runtime.inFlightSurfaceRefreshes[surface];
    }
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
  const client = await getDefaultSynthesisClient();
  const detail = await client.workbench.readTopicDetail({
    topicId,
  });
  if (
    !runtime.snapshotInputLocked &&
    surfaceNeedsServiceRefresh(runtime, "concepts")
  ) {
    const conceptInput = await client.workbench
      .readSurface({
        surface: "concepts",
        state: toSynthesisWorkbenchReadState(runtime.state),
      })
      .then(toSynthesisUiSnapshotInput)
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
  const client = await getDefaultSynthesisClient();
  const digest = await client.workbench.readPaperDigest(
    toSynthesisWorkbenchPaperDigestReadRequest(args),
  );
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

function ensureHtmlExportPath(pathRaw: string) {
  const path = cleanReportExportString(pathRaw);
  if (!path) {
    return "";
  }
  return /\.html?$/i.test(path) ? path : `${path}.html`;
}

function safeTopicDetailHtmlExportFileName(value: unknown) {
  const base = cleanReportExportString(value)
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 120);
  return `${base || "synthesis-topic"}-topic-details.html`;
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

async function pickTopicDetailHtmlExportPath(
  runtime: SynthesisWorkbenchRuntime,
  suggestedFileName: string,
) {
  const FilePicker = resolveWorkbenchFilePicker();
  if (!FilePicker) {
    throw new Error("Zotero file picker is unavailable.");
  }
  const selected = await new FilePicker(
    localize(
      "synthesis-export-topic-html-dialog-title",
      "Export topic details HTML",
    ),
    "save",
    [
      [localize("synthesis-export-topic-html-file-type", "HTML"), "*.html"],
      ["All files", "*.*"],
    ],
    suggestedFileName,
    (runtime.frameWindow || runtime.hostWindow || runtime.window) as
      | Window
      | undefined,
  ).open();
  return typeof selected === "string" && selected.trim()
    ? ensureHtmlExportPath(selected)
    : "";
}

function escapeHtmlText(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function jsonScriptText(value: unknown) {
  return JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

function inlineScriptText(value: string) {
  return value.replace(/<\/script/gi, "<\\/script");
}

function cssDataUrlForSvg(value: string) {
  return `data:image/svg+xml,${encodeURIComponent(value)
    .replace(/'/g, "%27")
    .replace(/\(/g, "%28")
    .replace(/\)/g, "%29")}`;
}

async function readPackagedTextAsset(relativePath: string) {
  const read = await readPackagedBinaryAsset(relativePath);
  if (!read.ok) {
    const checked = [
      ...read.diagnostics.checkedUris,
      ...read.diagnostics.checkedPaths,
    ].join(", ");
    throw new Error(
      `Unable to read packaged asset ${relativePath}. Checked: ${checked}`,
    );
  }
  const Decoder =
    (globalThis as { TextDecoder?: typeof TextDecoder }).TextDecoder ||
    TextDecoder;
  return new Decoder("utf-8").decode(read.bytes);
}

async function inlineMaterialSymbolIconUrls(css: string) {
  const replacements = new Map<string, string>();
  const matches = css.matchAll(
    /url\(["']?(\.\.\/icons\/material-symbols\/[^"')]+\.svg)["']?\)/g,
  );
  for (const match of matches) {
    const rawUrl = match[1] || "";
    if (!rawUrl || replacements.has(rawUrl)) {
      continue;
    }
    const svgPath = rawUrl.replace(/^\.\.\//, "content/");
    const svg = await readPackagedTextAsset(svgPath);
    replacements.set(rawUrl, cssDataUrlForSvg(svg));
  }
  return Array.from(replacements.entries()).reduce(
    (nextCss, [rawUrl, dataUrl]) =>
      nextCss.replaceAll(`url("${rawUrl}")`, `url("${dataUrl}")`),
    css,
  );
}

async function readSynthesisExportAssets() {
  const [
    themeJs,
    themeCss,
    iconsCss,
    topicTimelineCss,
    katexCss,
    synthesisCss,
    markdownItJs,
    katexJs,
    texmathJs,
    markdownRendererJs,
    appJs,
  ] = await Promise.all([
    readPackagedTextAsset("content/shared/theme.js"),
    readPackagedTextAsset("content/shared/theme.css"),
    readPackagedTextAsset("content/shared/icons.css").then(
      inlineMaterialSymbolIconUrls,
    ),
    readPackagedTextAsset("content/shared/topicTimeline.css"),
    readPackagedTextAsset("content/shared/vendor/katex/katex.min.css"),
    readPackagedTextAsset("content/synthesis/styles.css"),
    readPackagedTextAsset(
      "content/shared/vendor/markdown-it/markdown-it.min.js",
    ),
    readPackagedTextAsset("content/shared/vendor/katex/katex.min.js"),
    readPackagedTextAsset(
      "content/shared/vendor/markdown-it-texmath/texmath.min.js",
    ),
    readPackagedTextAsset("content/shared/markdown-renderer.js"),
    readPackagedTextAsset("content/synthesis/app.bundle.js"),
  ]);
  return {
    themeJs,
    themeCss,
    iconsCss,
    topicTimelineCss,
    katexCss,
    synthesisCss,
    markdownItJs,
    katexJs,
    texmathJs,
    markdownRendererJs,
    appJs,
  };
}

function cleanExportRecord(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function exportDigestKeys(
  evidence: Record<string, unknown>,
  digest: Record<string, unknown>,
) {
  const digestRef = cleanExportRecord(
    evidence.digest_ref || evidence.digestRef,
  );
  return Array.from(
    new Set(
      [
        evidence.id,
        evidence.paper_ref,
        evidence.paperRef,
        digestRef.paper_ref,
        digestRef.paperRef,
        digestRef.note_key,
        digestRef.noteKey,
        digestRef.payload_hash,
        digestRef.payloadHash,
        digest.paper_ref,
        digest.paperRef,
        digest.payload_hash,
        digest.payloadHash,
      ]
        .map((value) => cleanReportExportString(value))
        .filter(Boolean),
    ),
  );
}

async function resolveTopicExportDigests(
  detail: SynthesisTopicDetailDto,
  topicId: string,
) {
  const digestsByKey: Record<string, Record<string, unknown>> = {};
  let clientPromise: ReturnType<typeof getDefaultSynthesisClient> | undefined;
  const resolveClient = () => (clientPromise ||= getDefaultSynthesisClient());
  const sourcePapers = Array.isArray(detail.source_papers)
    ? detail.source_papers
    : [];
  await Promise.all(
    sourcePapers.map(async (entry) => {
      const evidence = cleanExportRecord(entry);
      const paperRef = evidence.paper_ref || evidence.paperRef;
      const digestRef = evidence.digest_ref || evidence.digestRef;
      if (!paperRef && !digestRef) {
        return;
      }
      let digest: Record<string, unknown>;
      try {
        const client = await resolveClient();
        digest = cleanExportRecord(
          await client.workbench.readPaperDigest(
            toSynthesisWorkbenchPaperDigestReadRequest({
              topicId,
              paper_ref: paperRef,
              digest_ref: digestRef,
              include_representative_image: true,
            }),
          ),
        );
      } catch (error) {
        digest = {
          ok: false,
          status:
            error instanceof Error ? error.message : String(error || "failed"),
        };
      }
      for (const key of exportDigestKeys(evidence, digest)) {
        digestsByKey[key] = digest;
      }
    }),
  );
  return digestsByKey;
}

function pruneGraphToTopicSubgraph(
  graph: SynthesisExportGraphSnapshot,
  topicId: string,
): SynthesisExportGraphSnapshot {
  const scope = (graph.topicScopes || []).find(
    (entry) => entry.topicId === topicId,
  );
  const sourceNodeIds = new Set(scope?.nodeIds || []);
  if (!sourceNodeIds.size) {
    return {
      ...graph,
      filters: {
        ...graph.filters,
        topicId,
        search: "",
      },
      topicScopes: scope ? [scope] : [],
      selectedTopicScope: scope,
      nodes: graph.visibleNodes,
      edges: graph.visibleEdges,
      hoverOnlyNodes: [],
      hoverOnlyEdges: [],
    };
  }

  const scopedNodeIds = new Set(sourceNodeIds);
  for (const edge of [...graph.edges, ...graph.hoverOnlyEdges]) {
    if (sourceNodeIds.has(edge.source) || sourceNodeIds.has(edge.target)) {
      scopedNodeIds.add(edge.source);
      scopedNodeIds.add(edge.target);
    }
  }
  const isScopedEdge = (edge: { source: string; target: string }) =>
    scopedNodeIds.has(edge.source) &&
    scopedNodeIds.has(edge.target) &&
    (sourceNodeIds.has(edge.source) || sourceNodeIds.has(edge.target));
  const nodes = graph.nodes.filter((node) => scopedNodeIds.has(node.id));
  const nodeIds = new Set(nodes.map((node) => node.id));
  const edges = graph.edges.filter(
    (edge) =>
      nodeIds.has(edge.source) &&
      nodeIds.has(edge.target) &&
      isScopedEdge(edge),
  );
  const hoverOnlyNodes = graph.hoverOnlyNodes.filter((node) =>
    scopedNodeIds.has(node.id),
  );
  const hoverOnlyNodeIds = new Set(hoverOnlyNodes.map((node) => node.id));
  const hoverOnlyEdges = graph.hoverOnlyEdges.filter(
    (edge) =>
      (nodeIds.has(edge.source) || hoverOnlyNodeIds.has(edge.source)) &&
      (nodeIds.has(edge.target) || hoverOnlyNodeIds.has(edge.target)) &&
      isScopedEdge(edge),
  );
  const visibleNodeIds = new Set(
    graph.visibleNodes
      .filter((node) => nodeIds.has(node.id))
      .map((node) => node.id),
  );
  const visibleEdges = graph.visibleEdges.filter(
    (edge) =>
      visibleNodeIds.has(edge.source) &&
      visibleNodeIds.has(edge.target) &&
      isScopedEdge(edge),
  );

  return {
    ...graph,
    filters: {
      ...graph.filters,
      topicId,
      search: "",
    },
    topicScopes: scope ? [scope] : [],
    selectedTopicScope: scope,
    nodes,
    edges,
    hoverOnlyNodes,
    hoverOnlyEdges,
    visibleNodes: graph.visibleNodes.filter((node) =>
      visibleNodeIds.has(node.id),
    ),
    visibleEdges,
  };
}

const SYNTHESIS_GRAPH_EXPORT_NODE_LIMIT = 50_000;
const SYNTHESIS_GRAPH_EXPORT_EDGE_LIMIT = 100_000;

async function readCompleteGraphSurfaceForExport(
  client: Awaited<ReturnType<typeof getDefaultSynthesisClient>>,
  state: SynthesisUiState,
): Promise<SynthesisUiSnapshotInput> {
  const generation = 1;
  let window = createSynthesisCitationGraphWindow<
    SynthesisUiGraphNode,
    SynthesisUiGraphEdge
  >({
    generation,
    nodeSoftLimit: SYNTHESIS_GRAPH_EXPORT_NODE_LIMIT,
    edgeSoftLimit: SYNTHESIS_GRAPH_EXPORT_EDGE_LIMIT,
  });
  let cursor: string | undefined;
  let expectedGraphHash: string | undefined;
  let accumulated: SynthesisUiSnapshotInput | undefined;

  do {
    const pageInput = toSynthesisUiSnapshotInput(
      await client.workbench.readSurface({
        surface: "graph",
        state: toSynthesisWorkbenchReadState(state, {
          graphWindowCursor: cursor,
          expectedGraphHash,
        }),
      }),
    );
    const graph = pageInput.graph;
    const page = graph?.page as
      | (SynthesisCitationGraphPageMetadata & Record<string, unknown>)
      | undefined;
    const graphHash = String(graph?.graph_hash || "").trim();
    const querySignature = String(page?.querySignature || "").trim();
    if (!graph || !page || !graphHash || !querySignature) {
      throw new SynthesisClientError(
        "internal",
        "Citation graph export received an incomplete page",
        { reason: "graph_export_page_invalid" },
      );
    }
    const hoverNodeIds = new Set(
      (graph.hoverOnlyNodes || []).map((node) => node.id),
    );
    const hoverEdgeIds = new Set(
      (graph.hoverOnlyEdges || []).map((edge) => edge.id),
    );
    const merged = mergeSynthesisCitationGraphPage(window, {
      generation,
      graphHash,
      querySignature,
      nodes: (graph.nodes || []).filter(
        (node) =>
          node.visibility !== "hover_only" && !hoverNodeIds.has(node.id),
      ),
      edges: (graph.edges || []).filter(
        (edge) =>
          edge.visibility !== "hover_only" && !hoverEdgeIds.has(edge.id),
      ),
      hoverOnlyNodes: graph.hoverOnlyNodes || [],
      hoverOnlyEdges: graph.hoverOnlyEdges || [],
      nextCursor: String(page.nextCursor || "").trim() || undefined,
      hasMore: page.hasMore,
      totalNodes: graphPageNumber(page.totalNodes),
      totalEdges: graphPageNumber(page.totalEdges),
      totalHoverNodes: graphPageNumber(page.totalHoverNodes),
      totalHoverEdges: graphPageNumber(page.totalHoverEdges),
    });
    if (!merged.accepted) {
      throw new SynthesisClientError(
        "conflict",
        "Citation graph changed while the export was being assembled",
        { reason: merged.reason || "basis_mismatch" },
      );
    }
    window = merged.window;
    if (window.status === "paused") {
      throw new SynthesisClientError(
        "conflict",
        "Citation graph export exceeded its safety limit",
        { reason: "graph_export_limit_exceeded" },
      );
    }
    accumulated = {
      ...pageInput,
      graph: {
        ...graph,
        nodes: [...window.nodes, ...window.hoverOnlyNodes],
        edges: [...window.edges, ...window.hoverOnlyEdges],
        hoverOnlyNodes: [...window.hoverOnlyNodes],
        hoverOnlyEdges: [...window.hoverOnlyEdges],
        page: {
          ...page,
          nextCursor: window.nextCursor || "",
          hasMore: window.hasMore,
          windowStatus: window.status,
        },
      },
    };
    cursor = window.nextCursor;
    expectedGraphHash = window.graphHash;
  } while (window.hasMore && cursor);

  if (!accumulated || window.hasMore) {
    throw new SynthesisClientError(
      "internal",
      "Citation graph export could not reach a complete page window",
      { reason: "graph_export_incomplete" },
    );
  }
  return accumulated;
}

async function buildTopicDetailHtmlExport(
  runtime: SynthesisWorkbenchRuntime,
  topicId: string,
) {
  const client = await getDefaultSynthesisClient();
  const detail = (await client.workbench.readTopicDetail({
    topicId,
  })) as SynthesisTopicDetailDto;
  const readerState = applySynthesisUiAction(runtime.state, {
    action: "showArtifactReader",
    payload: { topicId },
  }).state;
  const graphState = applySynthesisUiAction(readerState, {
    action: "setGraphView",
    payload: { topicId, selectedElement: null },
  }).state;
  const graphLayoutAlgorithms = ["force", "radial", "components"] as const;
  const graphLayoutStates = graphLayoutAlgorithms.map((layoutAlgorithm) => ({
    layoutAlgorithm,
    state: applySynthesisUiAction(readerState, {
      action: "setGraphView",
      payload: { topicId, selectedElement: null, layoutAlgorithm },
    }).state,
  }));
  const [conceptInput, graphInputs, digestsByKey, assets] = await Promise.all([
    client.workbench
      .readSurface({
        surface: "concepts",
        state: toSynthesisWorkbenchReadState(graphState),
      })
      .then(toSynthesisUiSnapshotInput),
    Promise.all(
      graphLayoutStates.map(async (entry) => ({
        ...entry,
        input: await readCompleteGraphSurfaceForExport(client, entry.state),
      })),
    ),
    resolveTopicExportDigests(detail, topicId),
    readSynthesisExportAssets(),
  ]);
  const primaryGraphInput =
    graphInputs.find((entry) => entry.layoutAlgorithm === "force") ||
    graphInputs[0];
  if (!primaryGraphInput) {
    throw new Error("No citation graph layout input was available for export");
  }
  const snapshot = buildSynthesisUiSnapshot(
    {
      ...conceptInput,
      ...primaryGraphInput.input,
      libraryId: primaryGraphInput.input.libraryId || conceptInput.libraryId,
    },
    primaryGraphInput.state,
  );
  const topicScopedGraph = pruneGraphToTopicSubgraph(snapshot.graph, topicId);
  const graphLayouts = Object.fromEntries(
    graphInputs.map((entry) => {
      const layoutSnapshot = buildSynthesisUiSnapshot(
        {
          ...entry.input,
          libraryId: entry.input.libraryId || conceptInput.libraryId,
        },
        entry.state,
      );
      return [
        entry.layoutAlgorithm,
        pruneGraphToTopicSubgraph(layoutSnapshot.graph, topicId),
      ];
    }),
  );
  const i18n = buildSynthesisWorkbenchI18nEnvelope();
  const envelope = {
    version: 1,
    generatedAt: new Date().toISOString(),
    i18n,
    snapshot: {
      ...snapshot,
      graph: topicScopedGraph,
    },
    topicDetail: detail,
    digestsByKey,
    graphLayouts,
  };
  const title =
    cleanReportExportString(detail.title) ||
    cleanReportExportString(detail.topicId) ||
    localize("synthesis-page-title", "Synthesis Workbench");
  return [
    "<!doctype html>",
    `<html lang="${escapeHtmlText(i18n.locale)}">`,
    "<head>",
    '<meta charset="UTF-8" />',
    '<meta name="viewport" content="width=device-width, initial-scale=1.0" />',
    `<title>${escapeHtmlText(title)}</title>`,
    `<script>${inlineScriptText(assets.themeJs)}</script>`,
    `<style>${assets.themeCss}\n${assets.iconsCss}\n${assets.topicTimelineCss}\n${assets.katexCss}\n${assets.synthesisCss}</style>`,
    "</head>",
    '<body class="synthesis-standalone-export">',
    '<div id="app" class="synthesis-root"></div>',
    `<script>window.__zoteroSkillsSynthesisTopicExport=${jsonScriptText(envelope)};</script>`,
    `<script>${inlineScriptText(assets.markdownItJs)}</script>`,
    `<script>${inlineScriptText(assets.katexJs)}</script>`,
    `<script>${inlineScriptText(assets.texmathJs)}</script>`,
    `<script>${inlineScriptText(assets.markdownRendererJs)}</script>`,
    `<script>${inlineScriptText(assets.appJs)}</script>`,
    "</body>",
    "</html>",
    "",
  ].join("\n");
}

const TOPIC_DETAIL_HTML_EXPORT_METADATA_SCHEMA_ID =
  "synthesis.topic_detail_html_export_metadata";
const TOPIC_DETAIL_HTML_EXPORT_RENDERER_VERSION = 7;

type TopicDetailHtmlExportMetadata = {
  schema_id?: string;
  schema_version?: number;
  renderer_version?: number;
  topic_id?: string;
  topic_signature?: string;
  html_hash?: string;
  generated_at?: string;
};

function topicDetailHtmlExportStoragePaths(topicId: string) {
  const root = getRuntimePersistencePaths().root;
  return buildSynthesisStoragePaths(root, topicPathId(topicId));
}

async function topicDetailHtmlExportSignature(
  paths: ReturnType<typeof buildSynthesisStoragePaths>,
) {
  const [manifest, metadata, artifact] = await Promise.all([
    readRuntimeTextFile(paths.currentManifest),
    readRuntimeTextFile(paths.currentMetadata),
    readRuntimeTextFile(paths.currentArtifact),
  ]);
  return hashCanonicalJson({
    current_manifest: manifest,
    current_metadata: metadata,
    current_artifact: artifact,
  });
}

async function readTopicDetailHtmlExportMetadata(path: string) {
  const text = await readRuntimeTextFile(path);
  if (!text.trim()) {
    return null;
  }
  try {
    return JSON.parse(text) as TopicDetailHtmlExportMetadata;
  } catch {
    return null;
  }
}

async function isTopicDetailHtmlExportCurrent(args: {
  paths: ReturnType<typeof buildSynthesisStoragePaths>;
  topicId: string;
  topicSignature: string;
}) {
  if (!(await runtimePathExists(args.paths.currentTopicDetailHtml))) {
    return false;
  }
  const metadata = await readTopicDetailHtmlExportMetadata(
    args.paths.currentTopicDetailHtmlMetadata,
  );
  const html = await readRuntimeTextFile(args.paths.currentTopicDetailHtml);
  return (
    metadata?.schema_id === TOPIC_DETAIL_HTML_EXPORT_METADATA_SCHEMA_ID &&
    metadata.renderer_version === TOPIC_DETAIL_HTML_EXPORT_RENDERER_VERSION &&
    metadata.topic_id === args.topicId &&
    metadata.topic_signature === args.topicSignature &&
    metadata.html_hash === hashCanonicalJson(html)
  );
}

async function ensureCachedTopicDetailHtmlExport(
  runtime: SynthesisWorkbenchRuntime,
  topicId: string,
) {
  const paths = topicDetailHtmlExportStoragePaths(topicId);
  const topicSignature = await topicDetailHtmlExportSignature(paths);
  if (
    await isTopicDetailHtmlExportCurrent({
      paths,
      topicId,
      topicSignature,
    })
  ) {
    return paths.currentTopicDetailHtml;
  }
  const html = await buildTopicDetailHtmlExport(runtime, topicId);
  await writeRuntimeTextFile(paths.currentTopicDetailHtml, html);
  const metadata: TopicDetailHtmlExportMetadata = {
    schema_id: TOPIC_DETAIL_HTML_EXPORT_METADATA_SCHEMA_ID,
    schema_version: 1,
    renderer_version: TOPIC_DETAIL_HTML_EXPORT_RENDERER_VERSION,
    topic_id: topicId,
    topic_signature: topicSignature,
    html_hash: hashCanonicalJson(html),
    generated_at: new Date().toISOString(),
  };
  await writeRuntimeTextFile(
    paths.currentTopicDetailHtmlMetadata,
    `${JSON.stringify(metadata, null, 2)}\n`,
  );
  return paths.currentTopicDetailHtml;
}

async function exportTopicDetailHtml(
  runtime: SynthesisWorkbenchRuntime,
  topicId: string,
  outputPath: string,
) {
  if (!topicId) {
    throw new Error("exportTopicDetailHtml requires topicId");
  }
  if (!outputPath) {
    return;
  }
  const sourcePath = await ensureCachedTopicDetailHtmlExport(runtime, topicId);
  await copyRuntimeFile({ sourcePath, targetPath: outputPath });
}

async function exportTopicSynthesisReport(
  runtime: SynthesisWorkbenchRuntime,
  topicId: string,
) {
  if (!topicId) {
    throw new Error("exportTopicSynthesisReport requires topicId");
  }
  const client = await getDefaultSynthesisClient();
  const report = await client.topics.getTopicReport({
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

function citationGraphItemKeyFromNodeId(nodeId: string) {
  const prefix = "zotero:item:";
  return nodeId.startsWith(prefix) ? nodeId.slice(prefix.length).trim() : "";
}

async function selectZoteroItem(
  runtime: SynthesisWorkbenchRuntime,
  args: { libraryId: number; itemKey: string },
) {
  const itemKey = String(args.itemKey || "").trim();
  const libraryId = Math.max(0, Math.floor(Number(args.libraryId) || 0));
  if (!libraryId || !itemKey) {
    throw new Error("A Zotero library item is required.");
  }
  const zotero = (globalThis as any).Zotero;
  const item = zotero?.Items?.getByLibraryAndKey?.(libraryId, itemKey);
  if (!item) {
    throw new Error(`Zotero item ${libraryId}:${itemKey} was not found.`);
  }
  const itemId = Math.max(0, Math.floor(Number(item.id || item.itemID) || 0));
  if (!itemId) {
    throw new Error(`Zotero item ${libraryId}:${itemKey} has no item id.`);
  }
  const hostWindow = resolveWorkflowHostWindow(runtime.window);
  if (!hostWindow) {
    throw new Error("Zotero main window is unavailable.");
  }
  const pane = (hostWindow as unknown as { ZoteroPane?: unknown } | undefined)
    ?.ZoteroPane as
    | {
        selectItem?: (itemId: number) => Promise<unknown> | unknown;
        selectItems?: (itemIds: number[]) => Promise<unknown> | unknown;
      }
    | undefined;
  if (typeof pane?.selectItem === "function") {
    await pane.selectItem(itemId);
  } else if (typeof pane?.selectItems === "function") {
    await pane.selectItems([itemId]);
  } else {
    throw new Error("Zotero pane cannot select items.");
  }
  (hostWindow as unknown as { focus?: () => void } | undefined)?.focus?.();
  return hostWindow;
}

async function openZoteroItemFromCitationGraphNode(
  runtime: SynthesisWorkbenchRuntime,
  args: Record<string, unknown>,
) {
  const nodeId = String(args.nodeId || "").trim();
  const itemKey =
    citationGraphItemKeyFromNodeId(nodeId) || String(args.itemKey || "").trim();
  const libraryId = Math.max(0, Math.floor(Number(args.libraryId) || 0));
  await selectZoteroItem(runtime, { libraryId, itemKey });
}

function currentGraphLayoutBasis(
  runtime: SynthesisWorkbenchRuntime,
  layoutAlgorithm: SynthesisUiLayoutAlgorithm,
):
  | Pick<SynthesisWorkbenchGraphLayoutFailure, "graphHash" | "layoutAlgorithm">
  | undefined {
  const graphHash = String(
    runtime.snapshotInput?.graph?.graph_hash || "",
  ).trim();
  return graphHash ? { graphHash, layoutAlgorithm } : undefined;
}

async function recomputeWorkbenchCitationGraphLayout(
  runtime: SynthesisWorkbenchRuntime,
  layoutAlgorithm: SynthesisUiLayoutAlgorithm,
  force = false,
) {
  const basis = currentGraphLayoutBasis(runtime, layoutAlgorithm);
  try {
    const client = await getDefaultSynthesisClient();
    const result = classifySynthesisWorkbenchGraphMutationResult(
      (await observePublicMaintenanceOperation(
        client,
        await client.graph.recomputeCitationGraphLayout({
          algorithm: layoutAlgorithm,
          ...(force ? { force: true } : {}),
        }),
        {
          deadlineMs: 130_000,
          isDisposed: () => Boolean(runtime.cleanedUp),
        },
      )) as SynthesisGraphCommandResult,
    );
    runtime.graphLayoutFailure = undefined;
    return result;
  } catch (error) {
    if (basis) {
      runtime.graphLayoutFailure = createSynthesisWorkbenchGraphLayoutFailure({
        ...basis,
        error,
      });
      await sendSurface(runtime, "graph", {
        refreshFromService: false,
      }).catch(() => undefined);
    }
    throw error;
  }
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
  let messageKey: SynthesisWorkbenchMessageKey =
    "synthesis-confirm-rebuild-local-indexes";
  if (command === "refreshReferenceSidecarNow") {
    messageKey = "synthesis-confirm-refresh-reference-sidecar";
  }
  if (command === "runAdvancedReferenceMatchingNow") {
    messageKey = "synthesis-confirm-advanced-reference-matching";
  }
  return confirmWorkbenchAction(
    resolveSynthesisWorkbenchMessage(
      messageKey,
      SYNTHESIS_WORKBENCH_DEFAULT_MESSAGES[messageKey],
    ),
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
  if (
    envelope.action === "continueGraphWindow" ||
    envelope.action === "retryGraphWindow"
  ) {
    const current = runtime.graphWindow;
    const requestId = runtime.latestSurfaceRequestBySurface.graph;
    if (!current || !requestId || !isActiveSurface(runtime, "graph")) return;
    runtime.graphWindow =
      envelope.action === "continueGraphWindow"
        ? continueSynthesisCitationGraphWindow(current)
        : retrySynthesisCitationGraphWindow(current);
    if (runtime.snapshotInput?.graph?.page) {
      runtime.snapshotInput.graph.page = {
        ...runtime.snapshotInput.graph.page,
        windowStatus: runtime.graphWindow.status,
      };
    }
    const request: SurfaceRefreshRequestMeta = {
      requestId,
      surface: "graph",
      selectedTabAtRequest: "graph",
      refreshFromService: true,
      libraryReadModelRevision: runtime.libraryReadModelRevision,
      startedAt: new Date().toISOString(),
    };
    publishGraphPage(runtime, request);
    void loadGraphContinuationPages(runtime, request, runtime.graphGeneration);
    return;
  }
  if (envelope.action === "openSynthesisSidecarDiagnostics") {
    void openTaskManagerDialog({
      initialTabKey: "synthesis-sidecar",
      chromeWindow: runtime.window,
    });
    return;
  }
  if (envelope.action === "expandGraphNeighborhood") {
    void expandGraphNeighborhood(runtime, envelope.payload || {}).catch(
      (error) => reportWorkbenchError(error, runtime.window),
    );
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
  const graphQueryChanged =
    runtime.state.selectedTab === "graph" &&
    ((envelope.action === "setFilters" && Boolean(envelope.payload?.graph)) ||
      (envelope.action === "setGraphView" &&
        ["role", "topicId", "nodeKinds", "showLowSignalReferences"].some(
          (field) => field in (envelope.payload || {}),
        )));
  if (graphQueryChanged) {
    void sendSurface(runtime, "graph", { refreshFromService: true });
    return;
  }
  if (envelope.action === "ready") {
    void sendChrome(runtime, { refreshFromService: true });
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
    void addon.hooks.onPrefsEvent("openPreferencesPane", {
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
  if (result.hostCommand?.command === "runTagBootstrapper") {
    runWorkbenchCommandOnce(runtime, "runTagBootstrapper", {}, () =>
      runTagBootstrapperFromWorkbench({
        hostWindow: runtime.window,
      }),
    );
    return;
  }
  if (result.hostCommand?.command === "runRegistryItemWorkflow") {
    const commandArgs = commandArgsFromPayload(envelope.payload);
    const libraryId = Math.max(
      0,
      Math.floor(Number(commandArgs.libraryId) || 0),
    );
    const itemKey = String(commandArgs.itemKey || "").trim();
    const workflowId = String(commandArgs.workflowId || "").trim();
    runWorkbenchCommandOnce(
      runtime,
      "runRegistryItemWorkflow",
      { libraryId, itemKey, workflowId },
      () =>
        runRegistryItemWorkflowFromWorkbench(runtime, {
          libraryId,
          itemKey,
          workflowId,
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
        recomputeWorkbenchCitationGraphLayout(
          runtime,
          algorithm as SynthesisUiLayoutAlgorithm,
          true,
        ),
    );
    return;
  }
  if (result.hostCommand?.command === "rebuildCitationGraphCacheNow") {
    runWorkbenchCommandOnce(
      runtime,
      "rebuildCitationGraphCacheNow",
      {},
      async () => {
        const client = await getDefaultSynthesisClient();
        return classifySynthesisWorkbenchGraphMutationResult(
          (await observePublicMaintenanceOperation(
            client,
            await client.graph.rebuildCitationGraphCacheNow(),
          )) as SynthesisGraphCommandResult,
        );
      },
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
      async () => {
        const client = await getDefaultSynthesisClient();
        return classifySynthesisWorkbenchGraphMutationResult(
          (await observePublicMaintenanceOperation(
            client,
            await client.graph.refreshCitationGraphCacheIncrementalNow(),
          )) as SynthesisGraphCommandResult,
        );
      },
      { deferStart: true },
    );
    return;
  }
  if (result.hostCommand?.command === "retryCitationGraphCacheRebuild") {
    runWorkbenchCommandOnce(
      runtime,
      "retryCitationGraphCacheRebuild",
      {},
      async () => {
        const client = await getDefaultSynthesisClient();
        return classifySynthesisWorkbenchGraphMutationResult(
          (await observePublicMaintenanceOperation(
            client,
            await client.graph.retryCitationGraphCacheRebuild(),
          )) as SynthesisGraphCommandResult,
        );
      },
      { deferStart: true },
    );
    return;
  }
  if (result.hostCommand?.command === "validateTagVocabulary") {
    runWorkbenchCommandOnce(runtime, "validateTagVocabulary", {}, async () => {
      const client = await getDefaultSynthesisClient();
      return client.tags.validateTagVocabulary();
    });
    return;
  }
  if (result.hostCommand?.command === "rebuildTagVocabularyIndex") {
    runWorkbenchCommandOnce(
      runtime,
      "rebuildTagVocabularyIndex",
      {},
      async () => {
        const client = await getDefaultSynthesisClient();
        return observePublicMaintenanceOperation(
          client,
          await client.tags.rebuildTagVocabularyIndex(),
        );
      },
      { deferStart: true },
    );
    return;
  }
  if (result.hostCommand?.command === "rebuildConceptKbIndex") {
    runWorkbenchCommandOnce(
      runtime,
      "rebuildConceptKbIndex",
      {},
      async () => {
        const client = await getDefaultSynthesisClient();
        return observePublicMaintenanceOperation(
          client,
          await client.concepts.rebuildConceptKbIndex(),
        );
      },
      { deferStart: true },
    );
    return;
  }
  if (result.hostCommand?.command === "rebuildTopicGraphIndex") {
    runWorkbenchCommandOnce(
      runtime,
      "rebuildTopicGraphIndex",
      {},
      async () => {
        const client = await getDefaultSynthesisClient();
        return observePublicMaintenanceOperation(
          client,
          await client.topicGraph.rebuildTopicGraphIndex(),
        );
      },
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
      const command = result.hostCommand.command;
      runWorkbenchCommandOnce(runtime, command, { edgeId }, async () => {
        const client = await getDefaultSynthesisClient();
        return (
          command === "acceptTopicGraphRelation"
            ? client.topicGraph.acceptTopicGraphRelation({ edgeId })
            : client.topicGraph.rejectTopicGraphRelation({ edgeId })
        ).then(failOnDiagnostic);
      });
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
      async () => {
        const client = await getDefaultSynthesisClient();
        return client.topicGraph
          .applyTopicGraphReviewAction({
            reviewId,
            action,
          })
          .then(failOnDiagnostic);
      },
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
      const command = result.hostCommand.command;
      runWorkbenchCommandOnce(runtime, command, { hintId }, async () => {
        const client = await getDefaultSynthesisClient();
        return (
          command === "rejectTopicDiscoveryHint"
            ? client.topics.rejectTopicDiscoveryHint({ hintId })
            : client.topics.restoreTopicDiscoveryHint({ hintId })
        ).then(failOnDiagnostic);
      });
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
        async () => {
          const client = await getDefaultSynthesisClient();
          return client.concepts.updateConceptDisplayText({
            conceptId,
            fields,
          });
        },
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
        async () => {
          const client = await getDefaultSynthesisClient();
          return client.concepts
            .applyConceptReviewAction({
              reviewId,
              action,
              targetConceptId: targetConceptId || undefined,
            })
            .then(failOnDiagnostic);
        },
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
        async () => {
          const client = await getDefaultSynthesisClient();
          return client.concepts.deleteConceptEntries({
            conceptIds,
          });
        },
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
      async () => {
        const client = await getDefaultSynthesisClient();
        return observePublicMaintenanceOperation(
          client,
          await client.references.refreshReferenceSidecarNow(),
        ).then(failOnDiagnostic);
      },
      { deferStart: true },
    );
    return;
  }
  if (result.hostCommand?.command === "retryReferenceSidecarRefresh") {
    runWorkbenchCommandOnce(
      runtime,
      "retryReferenceSidecarRefresh",
      {},
      async () => {
        const client = await getDefaultSynthesisClient();
        return observePublicMaintenanceOperation(
          client,
          await client.references.retryReferenceSidecarRefresh(),
        ).then(failOnDiagnostic);
      },
    );
    return;
  }
  if (result.hostCommand?.command === "runAdvancedReferenceMatchingNow") {
    runWorkbenchCommandOnce(
      runtime,
      "runAdvancedReferenceMatchingNow",
      {},
      async () => {
        const client = await getDefaultSynthesisClient();
        return observePublicMaintenanceOperation(
          client,
          await client.references.runAdvancedReferenceMatchingNow(),
        ).then(failOnDiagnostic);
      },
      { deferStart: true },
    );
    return;
  }
  if (result.hostCommand?.command === "retryAdvancedReferenceMatching") {
    runWorkbenchCommandOnce(
      runtime,
      "retryAdvancedReferenceMatching",
      {},
      async () => {
        const client = await getDefaultSynthesisClient();
        return observePublicMaintenanceOperation(
          client,
          await client.references.retryAdvancedReferenceMatching(),
        ).then(failOnDiagnostic);
      },
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
        async () => {
          const client = await getDefaultSynthesisClient();
          return client.references
            .applyCanonicalRevisionReviewAction({ reviewItemId, action })
            .then(failOnDiagnostic);
        },
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
          .flatMap((entry): SynthesisReferenceMatchProposalDecision[] => {
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
            if (!proposalId) {
              return [];
            }
            if (action === "manual_target") {
              return normalizedTarget
                ? [{ proposalId, action, target: normalizedTarget }]
                : [];
            }
            return [{ proposalId, action }];
          })
      : [];
    if (decisions.length) {
      runWorkbenchCommandOnce(
        runtime,
        "applyReferenceMatchProposalActions",
        {},
        async () => {
          const client = await getDefaultSynthesisClient();
          return client.references
            .applyReferenceMatchProposalActions({ decisions })
            .then(failOnDiagnostic);
        },
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
        async () => {
          const client = await getDefaultSynthesisClient();
          return client.references
            .applyReferenceMatchProposalAction({ proposalId, action })
            .then(failOnDiagnostic);
        },
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
        async () => {
          const client = await getDefaultSynthesisClient();
          return client.references
            .mergeEffectiveCanonicalReference({
              sourceEffectiveCanonicalId,
              targetEffectiveCanonicalId,
              confirmRetargetGroup: Boolean(commandArgs.confirmRetargetGroup),
            })
            .then(failOnDiagnostic);
        },
      );
      return;
    }
    void sendActiveSurface(runtime, { refreshFromService: false });
    return;
  }
  if (result.hostCommand?.command === "applyCanonicalRevisionMergeRequests") {
    const commandArgs = commandArgsFromPayload(envelope.payload);
    const requests = Array.isArray(commandArgs.requests)
      ? commandArgs.requests
          .filter(
            (entry): entry is Record<string, unknown> =>
              Boolean(entry) &&
              typeof entry === "object" &&
              !Array.isArray(entry),
          )
          .map((request) => ({
            sourceEffectiveCanonicalId: String(
              request.sourceEffectiveCanonicalId ||
                request.source_effective_canonical_id ||
                "",
            ).trim(),
            targetEffectiveCanonicalId: String(
              request.targetEffectiveCanonicalId ||
                request.target_effective_canonical_id ||
                "",
            ).trim(),
          }))
      : [];
    if (requests.length) {
      runWorkbenchCommandOnce(
        runtime,
        "applyCanonicalRevisionMergeRequests",
        { count: requests.length },
        async () => {
          const client = await getDefaultSynthesisClient();
          return client.references
            .applyCanonicalRevisionMergeRequests({ requests })
            .then(failOnDiagnostic);
        },
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
        ? { ...(commandArgs.patch as Record<string, unknown>) }
        : {};
    if ("normalizedTitle" in patch || "normalized_title" in patch) {
      patch.normalizedTitle = patch.normalizedTitle || patch.normalized_title;
      delete patch.normalized_title;
    }
    if (canonicalReferenceId) {
      runWorkbenchCommandOnce(
        runtime,
        "updateCanonicalReferenceMetadata",
        { canonicalReferenceId },
        async () => {
          const client = await getDefaultSynthesisClient();
          return client.references
            .updateCanonicalReferenceMetadata({
              canonicalReferenceId,
              patch,
            })
            .then(failOnDiagnostic);
        },
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
        async () => {
          const client = await getDefaultSynthesisClient();
          return client.references
            .archiveCanonicalReference({ canonicalReferenceId })
            .then(failOnDiagnostic);
        },
      );
      return;
    }
    void sendActiveSurface(runtime, { refreshFromService: false });
    return;
  }
  if (result.hostCommand?.command === "syncWebDavNow") {
    runWorkbenchCommandOnce(
      runtime,
      "syncWebDavNow",
      {},
      async () => {
        const client = await getFreshDefaultSynthesisClient();
        return observePublicMaintenanceOperation(
          client,
          await client.sync.webDav.runNow(),
        ).then(failOnSyncFailureState);
      },
      { deferStart: true },
    );
    return;
  }
  if (result.hostCommand?.command === "pauseWebDavSync") {
    runWorkbenchCommandOnce(runtime, "pauseWebDavSync", {}, async () => {
      const client = await getFreshDefaultSynthesisClient();
      return client.sync.webDav.pause();
    });
    return;
  }
  if (result.hostCommand?.command === "resumeWebDavSync") {
    runWorkbenchCommandOnce(runtime, "resumeWebDavSync", {}, async () => {
      const client = await getFreshDefaultSynthesisClient();
      return client.sync.webDav.resume();
    });
    return;
  }
  if (result.hostCommand?.command === "retryWebDavSync") {
    runWorkbenchCommandOnce(runtime, "retryWebDavSync", {}, async () => {
      const client = await getFreshDefaultSynthesisClient();
      return observePublicMaintenanceOperation(
        client,
        await client.sync.webDav.retry(),
      ).then(failOnSyncFailureState);
    });
    return;
  }
  if (result.hostCommand?.command === "resolveWebDavSyncConflict") {
    const commandArgs = commandArgsFromPayload(envelope.payload);
    const action = (String(commandArgs.action || "").trim() ||
      "keep_local") as SynthesisSyncConflictResolutionAction;
    runWorkbenchCommandOnce(
      runtime,
      "resolveWebDavSyncConflict",
      { action },
      async () => {
        const client = await getFreshDefaultSynthesisClient();
        return client.sync.webDav.resolveConflict({ action });
      },
    );
    return;
  }
  if (result.hostCommand?.command === "exportTagVocabulary") {
    runWorkbenchCommandOnce(runtime, "exportTagVocabulary", {}, async () => {
      const client = await getDefaultSynthesisClient();
      return client.tags
        .exportTagVocabularyForRegulator()
        .then((tags) =>
          runtime.hostWindow.navigator?.clipboard?.writeText?.(
            `${tags.join("\n")}\n`,
          ),
        );
    });
    return;
  }
  if (
    result.hostCommand?.command === "importTagVocabulary" ||
    result.hostCommand?.command === "previewTagVocabularyImport"
  ) {
    const commandArgs = commandArgsFromPayload(envelope.payload);
    if (typeof commandArgs.payload === "string" && commandArgs.payload.trim()) {
      runWorkbenchCommandOnce(
        runtime,
        "previewTagVocabularyImport",
        {},
        async () => {
          const client = await getDefaultSynthesisClient();
          return client.tags.previewTagVocabularyImport({
            payload: commandArgs.payload as string,
          });
        },
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
      const facet = String(commandArgs.facet || tag.split(":")[0] || "topic");
      const note = String(commandArgs.note || "");
      const sourceFlow = String(
        commandArgs.source_flow || "tag-regulator-suggest",
      );
      const parentBindings = Array.isArray(commandArgs.parent_bindings)
        ? commandArgs.parent_bindings
        : [];
      runWorkbenchCommandOnce(
        runtime,
        "updateStagedTagSuggestion",
        { tag },
        async () => {
          const client = await getDefaultSynthesisClient();
          return client.tags.updateStagedTagSuggestion({
            originalTag,
            tag,
            facet,
            note,
            sourceFlow,
            parentBindings,
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
      const facet = String(commandArgs.facet || tag.split(":")[0] || "topic");
      const note = String(commandArgs.note || "");
      runWorkbenchCommandOnce(
        runtime,
        "updateTagVocabularyEntry",
        { originalTag },
        async () => {
          const requestedFacet = String(
            commandArgs.facet || tag.split(":")[0] || "topic",
          );
          if (
            (isBuiltinStatusTag(originalTag) &&
              (tag !== originalTag ||
                requestedFacet !== BUILTIN_STATUS_FACET ||
                commandArgs.deprecated === true ||
                String(commandArgs.replacement || "").trim())) ||
            (!isBuiltinStatusTag(originalTag) && isBuiltinStatusTag(tag))
          ) {
            throw new Error("Builtin tag identity is protected");
          }
          const client = await getDefaultSynthesisClient();
          return client.tags
            .updateTagVocabularyEntry({ originalTag, tag, facet, note })
            .then(failOnDiagnostic);
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
          if (isBuiltinStatusTag(originalTag)) {
            throw new Error("Builtin tags cannot be deleted");
          }
          const client = await getDefaultSynthesisClient();
          return client.tags
            .deleteTagVocabularyEntry({ originalTag })
            .then(failOnDiagnostic);
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
        async () => {
          const client = await getDefaultSynthesisClient();
          return client.tags.promoteStagedTagSuggestions({ tags });
        },
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
        async () => {
          const client = await getDefaultSynthesisClient();
          return client.tags.discardStagedTagSuggestions({ tags });
        },
      );
      return;
    }
    void sendActiveSurface(runtime, { refreshFromService: false });
    return;
  }
  if (result.hostCommand?.command === "clearStagedTagSuggestions") {
    runWorkbenchCommandOnce(
      runtime,
      "clearStagedTagSuggestions",
      {},
      async () => {
        const client = await getDefaultSynthesisClient();
        return client.tags.clearStagedTagSuggestions();
      },
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
        async () => {
          const client = await getDefaultSynthesisClient();
          return client.tags.applyTagVocabularyImport({
            payload: commandArgs.payload as string,
            action,
          });
        },
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
  if (result.hostCommand?.command === "exportTopicDetailHtml") {
    const commandArgs = commandArgsFromPayload(envelope.payload);
    const topicId = String(commandArgs.topicId || "").trim();
    const title = String(commandArgs.title || "").trim();
    void (async () => {
      const outputPath = await pickTopicDetailHtmlExportPath(
        runtime,
        safeTopicDetailHtmlExportFileName(title || topicId),
      );
      if (!outputPath) {
        return;
      }
      runWorkbenchCommandOnce(
        runtime,
        "exportTopicDetailHtml",
        { topicId },
        () => exportTopicDetailHtml(runtime, topicId, outputPath),
        { refreshFromService: false },
      );
    })().catch((error) => reportWorkbenchError(error, runtime.window));
    return;
  }
  if (result.hostCommand?.command === "openZoteroItem") {
    const commandArgs = commandArgsFromPayload(envelope.payload);
    const nodeId = String(commandArgs.nodeId || "").trim();
    const libraryId = Math.max(
      0,
      Math.floor(Number(commandArgs.libraryId) || 0),
    );
    runWorkbenchCommandOnce(
      runtime,
      "openZoteroItem",
      { nodeId, libraryId },
      () => openZoteroItemFromCitationGraphNode(runtime, commandArgs),
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
        resolveSynthesisWorkbenchMessage(
          "synthesis-confirm-delete-topic-artifact",
          SYNTHESIS_WORKBENCH_DEFAULT_MESSAGES[
            "synthesis-confirm-delete-topic-artifact"
          ],
        ),
        runtime.window,
      )
    ) {
      void sendActiveSurface(runtime, { refreshFromService: false });
      return;
    }
    runWorkbenchCommandOnce(
      runtime,
      "deleteTopicArtifact",
      { topicId },
      async () => {
        const client = await getDefaultSynthesisClient();
        return client.topics
          .deleteTopicArtifact({ topicId })
          .then((deleteResult) => {
            if (!deleteResult.ok) {
              throw new Error(
                String(deleteResult.reason || "Topic artifact deletion failed"),
              );
            }
          });
      },
    );
    return;
  }
  if (result.hostCommand?.command === "purgeDeletedTopicArtifacts") {
    if (
      !confirmWorkbenchAction(
        resolveSynthesisWorkbenchMessage(
          "synthesis-confirm-purge-deleted-topic-artifacts",
          SYNTHESIS_WORKBENCH_DEFAULT_MESSAGES[
            "synthesis-confirm-purge-deleted-topic-artifacts"
          ],
        ),
        runtime.window,
      )
    ) {
      void sendActiveSurface(runtime, { refreshFromService: false });
      return;
    }
    runWorkbenchCommandOnce(
      runtime,
      "purgeDeletedTopicArtifacts",
      {},
      async () => {
        const client = await getDefaultSynthesisClient();
        return client.topics.purgeDeletedTopicArtifacts();
      },
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
  if (command === "runRegistryItemWorkflow") {
    return ["index"];
  }
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
    command === "runTagBootstrapper" ||
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
    return ["home", "topics", "concepts", "graph", "review"];
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
  await sendSurface(runtime, "graph", { refreshFromService: true });
  const graph = runtime.snapshotInput?.graph;
  const status = resolveSynthesisWorkbenchGraphLayoutStatus({
    graphHash: graph?.graph_hash,
    layoutAlgorithm: runtime.state.graph.layoutAlgorithm,
    layoutStatus: graph?.layoutStatus,
    failure: runtime.graphLayoutFailure,
  });
  if (
    status === "ready" ||
    status === "failed" ||
    !runtime.snapshotInput?.graph?.graph_hash
  ) {
    return;
  }
  try {
    await recomputeWorkbenchCitationGraphLayout(
      runtime,
      runtime.state.graph.layoutAlgorithm,
    );
  } finally {
    await sendSurface(runtime, "graph", {
      refreshFromService: true,
    });
  }
}

function cleanupSynthesisRuntime(runtime: SynthesisWorkbenchRuntime) {
  runtime.cleanedUp = true;
  runtime.graphGeneration += 1;
  runtime.graphWindow = undefined;
  runtime.graphPageLoop = undefined;
  if (runtime.handshakeTimer) {
    clearInterval(runtime.handshakeTimer);
    runtime.handshakeTimer = undefined;
  }
  if (runtime.libraryReadModelDirtyTimer) {
    clearTimeout(runtime.libraryReadModelDirtyTimer);
    runtime.libraryReadModelDirtyTimer = undefined;
  }
  clearCommandProgressPolling(runtime);
  if (runtime.sidecarStatusTimer) {
    clearInterval(runtime.sidecarStatusTimer);
    runtime.sidecarStatusTimer = undefined;
  }
  runtime.removeSidecarStatusListener?.();
  runtime.removeSidecarStatusListener = undefined;
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
  void sendActiveSurface(runtime);
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
  registerBackgroundRefreshTimer({
    owner: "synthesis-workbench-handshake",
    activationCondition: "synthesis workbench frame is mounting",
    scopeKey: "current synthesis workbench frame",
    allowedDataSources: ["synthesis workbench frame handshake"],
    maxReadShape: "frame handshake signal only",
    requiresForegroundSurface: true,
    minimumIntervalMs: SYNTHESIS_WORKBENCH_HANDSHAKE_INTERVAL_MS,
    intervalMs: SYNTHESIS_WORKBENCH_HANDSHAKE_INTERVAL_MS,
  });
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
    inFlightSurfaceRefreshes: {},
    queuedServiceSurfaceRefreshes: new Set(),
    libraryReadModelRevision: synthesisLibraryReadModelRevision,
    inFlightCommands: new Map(),
    actionWarnings: [],
    graphGeneration: 0,
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
    inFlightSurfaceRefreshes: {},
    queuedServiceSurfaceRefreshes: new Set(),
    libraryReadModelRevision: synthesisLibraryReadModelRevision,
    inFlightCommands: new Map(),
    actionWarnings: [],
    graphGeneration: 0,
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

async function publishSynthesisWorkbenchPrewarmPhase(
  surface: "chrome" | SynthesisWorkbenchSurfaceName,
  input: SynthesisUiSnapshotInput,
) {
  prewarmedSynthesisSnapshotInput = mergeSynthesisUiSnapshotInput(
    prewarmedSynthesisSnapshotInput || buildDefaultSnapshotInput(),
    input,
  );
  const runtime = synthesisWorkbenchTab;
  if (!runtime) {
    return;
  }
  mergeRuntimeSnapshotInput(runtime, input);
  if (surface === "chrome") {
    await sendChrome(runtime, { refreshFromService: false });
    return;
  }
  markSurfaceLoaded(runtime, surface);
  if (isActiveSurface(runtime, surface)) {
    await sendSurface(runtime, surface, { refreshFromService: false });
  }
}

export function prewarmSynthesisWorkbenchSurfaces(
  args: {
    surfaces?: SynthesisWorkbenchSurfaceName[];
  } = {},
): Promise<SynthesisUiSnapshotInput | undefined> {
  if (prewarmSynthesisSurfacesPromise) {
    return prewarmSynthesisSurfacesPromise;
  }
  prewarmSynthesisSurfacesPromise = (async () => {
    const readState = toSynthesisWorkbenchReadState(
      synthesisWorkbenchTab?.state || createDefaultSynthesisUiState(),
    );
    const client = await getDefaultSynthesisClient();
    const surfaces =
      args.surfaces !== undefined
        ? args.surfaces
        : ([
            "index",
            "review",
            "graph",
            "tags",
            "concepts",
            "topics",
          ] satisfies SynthesisWorkbenchSurfaceName[]);
    let input = toSynthesisUiSnapshotInput(
      await client.workbench.readChrome({ state: readState }),
    );
    await publishSynthesisWorkbenchPrewarmPhase("chrome", input);
    for (const surface of surfaces) {
      await yieldToEventLoop();
      try {
        const surfaceInput = toSynthesisUiSnapshotInput(
          await client.workbench.readSurface({ surface, state: readState }),
        );
        await publishSynthesisWorkbenchPrewarmPhase(surface, surfaceInput);
        input = mergeSynthesisUiSnapshotInput(input, surfaceInput);
      } catch {
        continue;
      }
    }
    return input;
  })()
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
