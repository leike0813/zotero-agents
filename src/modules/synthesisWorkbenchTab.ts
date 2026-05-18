import { config } from "../../package.json";
import { getString } from "../utils/locale";
import { resolveAddonRef } from "../utils/runtimeBridge";
import { executeWorkflowFromCurrentSelection } from "./workflowExecute";
import { getLoadedWorkflowEntries } from "./workflowRuntime";
import { alertWindow } from "./workflowExecution/feedbackSeam";
import { getDefaultSynthesisService } from "./synthesis/service";
import {
  applySynthesisUiAction,
  buildSynthesisUiSnapshot,
  createDefaultSynthesisUiState,
  type SynthesisUiAction,
  type SynthesisUiSnapshotInput,
  type SynthesisUiState,
} from "./synthesis/uiModel";

type SynthesisBridgeMessageType =
  | "synthesis:init"
  | "synthesis:snapshot"
  | "synthesis:artifact"
  | "synthesis:topic-detail"
  | "synthesis:digest";

type SynthesisWorkbenchActionEnvelope = {
  type: "synthesis:action";
  action: string;
  payload?: Record<string, unknown>;
};

type SynthesisArtifactReaderDto = {
  topicId: string;
  title: string;
  markdown: string;
  metadata: Record<string, unknown>;
  hash?: string;
  updated_at?: string;
};

type SynthesisTopicDetailDto = Record<string, unknown>;

type SynthesisWorkbenchBridge = {
  postMessage: (
    action: string,
    payload?: Record<string, unknown>,
  ) => Promise<void>;
};

type ZoteroTabs = {
  add?: (options: Record<string, unknown>) => { id?: string; container?: Element };
  select?: (id: string) => unknown;
  close?: (id: string) => unknown;
};

const SYNTHESIS_WORKBENCH_BRIDGE_KEY =
  "__zoteroSkillsSynthesisWorkbenchBridge";

type SynthesisWorkbenchRuntime = {
  tabId: string;
  window: _ZoteroTypes.MainWindow;
  hostWindow: Window;
  frame: Element;
  frameWindow: Window | null;
  removeMessageListener?: () => void;
  handshakeTimer?: ReturnType<typeof setInterval>;
  handshakeAttemptCount: number;
  handshakeSuccessCount: number;
  handshakeComplete: boolean;
  state: SynthesisUiState;
  snapshotInput?: SynthesisUiSnapshotInput;
};

const SYNTHESIS_WORKBENCH_TAB_ID = "zotero-skills-synthesis-workbench";
const SYNTHESIS_WORKBENCH_EMBEDDED_ID = "zotero-skills-synthesis-workbench-embedded";
const SYNTHESIS_WORKBENCH_HANDSHAKE_INTERVAL_MS = 100;
const SYNTHESIS_WORKBENCH_HANDSHAKE_REQUIRED_SUCCESSES = 5;
const SYNTHESIS_WORKBENCH_HANDSHAKE_MAX_ATTEMPTS = 80;

let synthesisWorkbenchTab: SynthesisWorkbenchRuntime | undefined;

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

function resolveSynthesisPageUrl() {
  const addonRef = String(config.addonRef || "").trim() || resolveAddonRef("");
  if (!addonRef) {
    return "about:blank";
  }
  return `chrome://${addonRef}/content/synthesis/index.html`;
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
    (win as unknown as { Zotero_Tabs?: ZoteroTabs } | undefined)
      ?.Zotero_Tabs ||
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

function openPathInSystem(pathValue: string, label: string) {
  const normalizedPath = String(pathValue || "").trim();
  if (!normalizedPath) {
    throw new Error(`${label} path is empty`);
  }
  const pathToFile = (globalThis as any).Zotero?.File?.pathToFile;
  if (typeof pathToFile !== "function") {
    throw new Error("Zotero.File.pathToFile is unavailable");
  }
  const file = pathToFile(normalizedPath) as
    | {
        exists?: () => boolean;
        launch?: () => unknown;
        reveal?: () => unknown;
      }
    | undefined;
  if (!file) {
    throw new Error(`failed to resolve ${label} path: ${normalizedPath}`);
  }
  if (typeof file.exists === "function" && !file.exists()) {
    throw new Error(`${label} path does not exist: ${normalizedPath}`);
  }
  if (typeof file.reveal === "function") {
    file.reveal();
    return;
  }
  if (typeof file.launch === "function") {
    file.launch();
    return;
  }
  throw new Error("nsIFile launch/reveal is unavailable");
}

function buildDefaultSnapshotInput(): SynthesisUiSnapshotInput {
  const libraryId = Number((globalThis as any).Zotero?.Libraries?.userLibraryID || 1);
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
    throw new Error("Cannot update synthesis: Zotero main window is unavailable.");
  }
  const workflow = findUpdateTopicSynthesisWorkflow();
  if (!workflow) {
    alertWindow(
      hostWindow,
      "Cannot update synthesis: update-topic-synthesis workflow is not loaded. Rescan builtin workflows and try again.",
    );
    return;
  }
  await executeWorkflowFromCurrentSelection({
    win: hostWindow,
    workflow,
    requireSettingsGate: true,
    executionOptionsOverride: {
      workflowParams: {
        topicId: args.topicId,
        language: args.language || "auto",
        updateMode: "update_full",
        updateScope: "refresh",
        updateReason: "Workbench Topic Detail update action",
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
      payload,
    },
    "*",
  );
}

function commandArgsFromPayload(payload?: Record<string, unknown>) {
  return payload?.args && typeof payload.args === "object"
    ? (payload.args as Record<string, unknown>)
    : {};
}

async function sendSnapshot(
  runtime: SynthesisWorkbenchRuntime,
  messageType: Extract<SynthesisBridgeMessageType, "synthesis:init" | "synthesis:snapshot">,
) {
  if (!runtime?.frameWindow) {
    return;
  }
  if (messageType === "synthesis:init") {
    postWorkbenchMessage(
      runtime,
      messageType,
      buildSynthesisUiSnapshot(
        runtime.snapshotInput || buildDefaultSnapshotInput(),
        runtime.state,
      ),
    );
  }
  const snapshot = runtime.snapshotInput
    ? buildSynthesisUiSnapshot(runtime.snapshotInput, runtime.state)
    : await getDefaultSynthesisService()
        .getSynthesisSnapshot(runtime.state)
        .catch(() => buildSynthesisUiSnapshot(buildDefaultSnapshotInput(), runtime.state));
  postWorkbenchMessage(runtime, messageType, snapshot);
}

async function sendArtifactReader(
  runtime: SynthesisWorkbenchRuntime,
  topicId: string,
) {
  if (!runtime?.frameWindow) {
    return;
  }
  const artifact = await getDefaultSynthesisService().readTopicArtifact({ topicId });
  const metadata = {
    ...((artifact.metadata || {}) as Record<string, unknown>),
  };
  const dto: SynthesisArtifactReaderDto = {
    topicId,
    title:
      String(metadata.title || metadata.topic_title || "").trim() ||
      topicId,
    markdown: String(artifact.markdown || ""),
    metadata,
    hash: String(metadata.hash || metadata.markdown_hash || "").trim() || undefined,
    updated_at: String(metadata.updated_at || "").trim() || undefined,
  };
  const result = applySynthesisUiAction(runtime.state, {
    action: "showArtifactReader",
    payload: { topicId },
  });
  runtime.state = result.state;
  await sendSnapshot(runtime, "synthesis:snapshot");
  postWorkbenchMessage(runtime, "synthesis:artifact", dto);
}

async function sendTopicDetail(
  runtime: SynthesisWorkbenchRuntime,
  topicId: string,
) {
  if (!runtime?.frameWindow) {
    return;
  }
  const detail = await getDefaultSynthesisService().readTopicDetail({ topicId });
  const result = applySynthesisUiAction(runtime.state, {
    action: "showArtifactReader",
    payload: { topicId },
  });
  runtime.state = result.state;
  await sendSnapshot(runtime, "synthesis:snapshot");
  postWorkbenchMessage(runtime, "synthesis:topic-detail", detail as SynthesisTopicDetailDto);
}

async function sendTopicDigest(
  runtime: SynthesisWorkbenchRuntime,
  args: Record<string, unknown>,
) {
  if (!runtime?.frameWindow) {
    return;
  }
  const digest = await getDefaultSynthesisService().resolveTopicPaperDigest(args);
  postWorkbenchMessage(runtime, "synthesis:digest", digest);
}

async function openSynthesisFolderFromWorkbench(args: {
  payload?: Record<string, unknown>;
}) {
  const commandArgs = commandArgsFromPayload(args.payload);
  const topicId = String(commandArgs.topicId || "").trim();
  if (topicId) {
    const artifact = await getDefaultSynthesisService().readTopicArtifact({ topicId });
    openPathInSystem(artifact.paths.topicRoot, "synthesis topic folder");
    return;
  }
  const snapshot = await getDefaultSynthesisService().getSynthesisSnapshot();
  openPathInSystem(snapshot.storage.rootPath || "", "synthesis folder");
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

function confirmWorkbenchAction(message: string, win?: _ZoteroTypes.MainWindow) {
  const hostWindow = resolveWorkflowHostWindow(win);
  const confirmFn = (hostWindow as unknown as { confirm?: (message: string) => boolean })
    ?.confirm;
  if (typeof confirmFn === "function") {
    return confirmFn.call(hostWindow, message);
  }
  const globalConfirm = (globalThis as { confirm?: (message: string) => boolean })
    .confirm;
  return typeof globalConfirm === "function" ? globalConfirm(message) : true;
}

function handleAction(
  runtime: SynthesisWorkbenchRuntime,
  envelope: SynthesisWorkbenchActionEnvelope,
) {
  if (!runtime) {
    return;
  }
  const result = applySynthesisUiAction(runtime.state, {
    action: envelope.action,
    payload: envelope.payload,
  } satisfies SynthesisUiAction);
  if (!result.handled) {
    void sendSnapshot(runtime, "synthesis:snapshot");
    return;
  }
  runtime.state = result.state;
  if (result.hostCommand?.command === "openPreferences") {
    void addon.hooks.onPrefsEvent("openWorkflowSettings", {
      window: runtime.window,
    });
  }
  if (result.hostCommand?.command === "runSynthesizeTopic") {
    void runCreateTopicSynthesisFromWorkbench({
      hostWindow: runtime.window,
    })
      .catch((error) => reportWorkbenchError(error, runtime.window))
      .finally(() => {
        void sendSnapshot(runtime, "synthesis:snapshot");
      });
    return;
  }
  if (result.hostCommand?.command === "submitTopicSynthesisUpdate") {
    const commandArgs = commandArgsFromPayload(envelope.payload);
    const topicId = String(commandArgs.topicId || "").trim();
    const language = String(commandArgs.language || "auto").trim();
    void runUpdateTopicSynthesisFromWorkbench({
      hostWindow: runtime.window,
      topicId,
      language,
    })
      .catch((error) => reportWorkbenchError(error, runtime.window))
      .finally(() => {
        void sendSnapshot(runtime, "synthesis:snapshot");
      });
    return;
  }
  if (result.hostCommand?.command === "manualRecomputeLayout") {
    void getDefaultSynthesisService()
      .queryCitationGraph()
      .finally(() => {
        void sendSnapshot(runtime, "synthesis:snapshot");
      });
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
  if (result.hostCommand?.command === "openCanonicalMarkdown") {
    const commandArgs = commandArgsFromPayload(envelope.payload);
    const topicId = String(commandArgs.topicId || "").trim();
    void sendArtifactReader(runtime, topicId).catch((error) =>
      reportWorkbenchError(error, runtime.window),
    );
    return;
  }
  if (result.hostCommand?.command === "copyTopicMarkdownExport") {
    const commandArgs = commandArgsFromPayload(envelope.payload);
    const topicId = String(commandArgs.topicId || "").trim();
    void getDefaultSynthesisService()
      .readTopicArtifact({ topicId })
      .then((artifact) =>
        runtime.hostWindow.navigator?.clipboard?.writeText?.(artifact.markdown),
      )
      .catch((error) => reportWorkbenchError(error, runtime.window));
    return;
  }
  if (result.hostCommand?.command === "resolveTopicPaperDigest") {
    const commandArgs = commandArgsFromPayload(envelope.payload);
    void sendTopicDigest(runtime, commandArgs).catch((error) =>
      reportWorkbenchError(error, runtime.window),
    );
    return;
  }
  if (result.hostCommand?.command === "openSynthesisFolder") {
    void openSynthesisFolderFromWorkbench({
      payload: envelope.payload,
    }).catch((error) => reportWorkbenchError(error, runtime.window));
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
      void sendSnapshot(runtime, "synthesis:snapshot");
      return;
    }
    void getDefaultSynthesisService()
      .deleteTopicArtifact({ topicId })
      .then((deleteResult) => {
        if (!deleteResult.ok) {
          throw new Error(deleteResult.reason);
        }
      })
      .catch((error) => reportWorkbenchError(error, runtime.window))
      .finally(() => {
        void sendSnapshot(runtime, "synthesis:snapshot");
      });
    return;
  }
  if (result.hostCommand?.command === "purgeDeletedTopicArtifacts") {
    if (
      !confirmWorkbenchAction(
        "Permanently purge deleted synthesis artifacts? This cannot be undone.",
        runtime.window,
      )
    ) {
      void sendSnapshot(runtime, "synthesis:snapshot");
      return;
    }
    void getDefaultSynthesisService()
      .purgeDeletedTopicArtifacts()
      .catch((error) => reportWorkbenchError(error, runtime.window))
      .finally(() => {
        void sendSnapshot(runtime, "synthesis:snapshot");
      });
    return;
  }
  void sendSnapshot(runtime, "synthesis:snapshot");
}

function cleanupSynthesisRuntime(runtime: SynthesisWorkbenchRuntime) {
  if (runtime.handshakeTimer) {
    clearInterval(runtime.handshakeTimer);
    runtime.handshakeTimer = undefined;
  }
  clearSynthesisWorkbenchBridge(runtime);
  runtime.removeMessageListener?.();
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
  void sendSnapshot(runtime, "synthesis:init");
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
      if (runtime.handshakeAttemptCount >= SYNTHESIS_WORKBENCH_HANDSHAKE_MAX_ATTEMPTS) {
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
    snapshotInput: args.snapshotInput,
  };
  attachWorkbenchBridge(runtime);
  setSynthesisBrowserSource(frame, resolveSynthesisPageUrl());
  scheduleWorkbenchHandshake(runtime);
  return {
    refresh: async () => {
      await sendSnapshot(runtime, "synthesis:snapshot");
    },
    cleanup: () => cleanupSynthesisRuntime(runtime),
  };
}

export async function openSynthesisWorkbenchTab(args: {
  window?: _ZoteroTypes.MainWindow;
  snapshotInput?: SynthesisUiSnapshotInput;
} = {}) {
  const hostWindow = resolveWorkflowHostWindow(args.window);
  const tabs = resolveZoteroTabs(hostWindow);
  if (!hostWindow || !tabs?.add || !tabs.select) {
    throw new Error("Cannot open Synthesis Workbench: Zotero_Tabs is unavailable.");
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
    data: { kind: "synthesis-workbench" },
    select: true,
    onClose: cleanupSynthesisWorkbenchTab,
  });
  const container = result?.container;
  if (!container) {
    throw new Error("Cannot open Synthesis Workbench: tab container is missing.");
  }
  const frame = createSynthesisBrowser(hostWindow.document);
  container.appendChild(frame);
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
    snapshotInput: args.snapshotInput,
  };
  synthesisWorkbenchTab = runtime;
  attachWorkbenchBridge(runtime);
  setSynthesisBrowserSource(frame, resolveSynthesisPageUrl());
  scheduleWorkbenchHandshake(runtime);
  Zotero_Tabs.select(SYNTHESIS_WORKBENCH_TAB_ID);
}

export async function resetSynthesisWorkbenchTabRuntimeForTests() {
  cleanupSynthesisWorkbenchTab();
}

export async function closeSynthesisWorkbenchTab() {
  const tabs = resolveZoteroTabs(synthesisWorkbenchTab?.window);
  if (tabs?.close) {
    tabs.close(SYNTHESIS_WORKBENCH_TAB_ID);
  }
  cleanupSynthesisWorkbenchTab();
}
