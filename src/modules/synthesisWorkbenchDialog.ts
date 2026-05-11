import type { DialogHelper } from "zotero-plugin-toolkit";
import { config } from "../../package.json";
import { getString } from "../utils/locale";
import { resolveAddonRef } from "../utils/runtimeBridge";
import { isWindowAlive } from "../utils/window";
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

type SynthesisBridgeMessageType = "synthesis:init" | "synthesis:snapshot";

type SynthesisWorkbenchActionEnvelope = {
  type: "synthesis:action";
  action: string;
  payload?: Record<string, unknown>;
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

function createSynthesisFrame(doc: Document, pageUrl: string) {
  const frame = doc.createElement("iframe");
  frame.setAttribute("data-zs-role", "synthesis-workbench-frame");
  frame.src = pageUrl;
  frame.style.width = "100%";
  frame.style.height = "100%";
  frame.style.minHeight = "0";
  frame.style.flex = "1";
  frame.style.border = "none";
  return frame;
}

function resolveFrameWindow(frame: Element | null) {
  if (!frame) {
    return null;
  }
  return (frame as Element & { contentWindow?: Window | null }).contentWindow || null;
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
  if (typeof file.launch === "function") {
    file.launch();
    return;
  }
  if (typeof file.reveal === "function") {
    file.reveal();
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

let synthesisWorkbenchDialog: DialogHelper | undefined;

function resolveWorkflowHostWindow(argsWindow?: _ZoteroTypes.MainWindow) {
  return (
    argsWindow ||
    ((globalThis as any).Zotero?.getMainWindow?.() as
      | _ZoteroTypes.MainWindow
      | undefined)
  );
}

function findSynthesizeTopicWorkflow() {
  return (
    getLoadedWorkflowEntries().find(
      (entry) => entry.manifest.id === "synthesize-topic",
    ) || null
  );
}

function promptTopicSeed(args: {
  promptWindow?: Window | null;
  suggestedTopic?: unknown;
}) {
  const promptWindow = args.promptWindow || (globalThis as any).window;
  const suggested = String(args.suggestedTopic || "").trim();
  if (typeof promptWindow?.prompt !== "function") {
    return suggested;
  }
  const topicSeed = promptWindow.prompt(
    "Topic seed or existing topic id for synthesis",
    suggested,
  );
  return topicSeed === null ? "" : String(topicSeed || "").trim();
}

function promptSynthesisMode(args: { promptWindow?: Window | null; mode?: unknown }) {
  const promptWindow = args.promptWindow || (globalThis as any).window;
  const current = String(args.mode || "create").trim().toLowerCase();
  const fallback = current === "update" ? "update" : "create";
  if (typeof promptWindow?.prompt !== "function") {
    return fallback;
  }
  const mode = promptWindow.prompt(
    "Synthesis mode: create or update",
    fallback,
  );
  const normalized = String(mode || "").trim().toLowerCase();
  if (normalized === "create" || normalized === "update") {
    return normalized;
  }
  return "";
}

async function runSynthesizeTopicFromWorkbench(args: {
  hostWindow?: _ZoteroTypes.MainWindow;
  promptWindow?: Window | null;
  payload?: Record<string, unknown>;
}) {
  const hostWindow = resolveWorkflowHostWindow(args.hostWindow);
  if (!hostWindow) {
    throw new Error("Cannot run synthesis: Zotero main window is unavailable.");
  }
  const workflow = findSynthesizeTopicWorkflow();
  if (!workflow) {
    alertWindow(
      hostWindow,
      "Cannot run synthesis: synthesize-topic workflow is not loaded. Rescan builtin workflows and try again.",
    );
    return;
  }
  const commandArgs =
    args.payload?.args && typeof args.payload.args === "object"
      ? (args.payload.args as Record<string, unknown>)
      : {};
  const topicSeed = promptTopicSeed({
    promptWindow: args.promptWindow,
    suggestedTopic: commandArgs.topicSeed || commandArgs.topicId,
  });
  if (!topicSeed) {
    return;
  }
  const mode = promptSynthesisMode({
    promptWindow: args.promptWindow,
    mode: commandArgs.mode,
  });
  if (!mode) {
    alertWindow(hostWindow, "Synthesis mode must be create or update.");
    return;
  }
  await executeWorkflowFromCurrentSelection({
    win: hostWindow,
    workflow,
    requireSettingsGate: true,
    executionOptionsOverride: {
      workflowParams: {
        topicSeed,
        mode,
      },
    },
  });
}

async function openCanonicalMarkdownFromWorkbench(args: {
  hostWindow?: _ZoteroTypes.MainWindow;
  payload?: Record<string, unknown>;
}) {
  const commandArgs =
    args.payload?.args && typeof args.payload.args === "object"
      ? (args.payload.args as Record<string, unknown>)
      : {};
  const topicId = String(commandArgs.topicId || "").trim();
  if (!topicId) {
    throw new Error("Cannot open synthesis artifact: topicId is missing.");
  }
  const artifact = await getDefaultSynthesisService().readTopicArtifact({ topicId });
  openPathInSystem(artifact.paths.currentMarkdown, "synthesis artifact");
}

async function openSynthesisFolderFromWorkbench(args: {
  payload?: Record<string, unknown>;
}) {
  const commandArgs =
    args.payload?.args && typeof args.payload.args === "object"
      ? (args.payload.args as Record<string, unknown>)
      : {};
  const topicId = String(commandArgs.topicId || "").trim();
  if (topicId) {
    const artifact = await getDefaultSynthesisService().readTopicArtifact({ topicId });
    openPathInSystem(artifact.paths.topicRoot, "synthesis topic folder");
    return;
  }
  const snapshot = await getDefaultSynthesisService().getSynthesisSnapshot();
  openPathInSystem(snapshot.storage.rootPath || "", "synthesis folder");
}

export async function openSynthesisWorkbenchDialog(args: {
  window?: _ZoteroTypes.MainWindow;
  snapshotInput?: SynthesisUiSnapshotInput;
} = {}) {
  if (isWindowAlive(synthesisWorkbenchDialog?.window)) {
    synthesisWorkbenchDialog?.window?.focus?.();
    return;
  }

  let frameWindow: Window | null = null;
  let removeMessageListener: (() => void) | undefined;
  let state: SynthesisUiState = createDefaultSynthesisUiState();
  let snapshotInput = args.snapshotInput || buildDefaultSnapshotInput();

  const sendSnapshot = async (messageType: SynthesisBridgeMessageType) => {
    if (!frameWindow) {
      return;
    }
    const snapshot = args.snapshotInput
      ? buildSynthesisUiSnapshot(snapshotInput, state)
      : await getDefaultSynthesisService()
          .getSynthesisSnapshot(state)
          .catch(() => buildSynthesisUiSnapshot(snapshotInput, state));
    frameWindow.postMessage(
      {
        type: messageType,
        payload: snapshot,
      },
      "*",
    );
  };

  const handleAction = (envelope: SynthesisWorkbenchActionEnvelope) => {
    const result = applySynthesisUiAction(state, {
      action: envelope.action,
      payload: envelope.payload,
    } satisfies SynthesisUiAction);
    if (!result.handled) {
      void sendSnapshot("synthesis:snapshot");
      return;
    }
    state = result.state;
    if (result.hostCommand?.command === "openPreferences") {
      void addon.hooks.onPrefsEvent("openWorkflowSettings", {
        window: args.window,
      });
    }
    if (result.hostCommand?.command === "runSynthesizeTopic") {
      void runSynthesizeTopicFromWorkbench({
        hostWindow: args.window,
        promptWindow: synthesisWorkbenchDialog?.window || args.window || null,
        payload: envelope.payload,
      }).finally(() => {
        void sendSnapshot("synthesis:snapshot");
      });
      return;
    }
    if (result.hostCommand?.command === "manualRecomputeLayout") {
      void getDefaultSynthesisService()
        .queryCitationGraph()
        .finally(() => {
          void sendSnapshot("synthesis:snapshot");
        });
      return;
    }
    if (result.hostCommand?.command === "openCanonicalMarkdown") {
      void openCanonicalMarkdownFromWorkbench({
        hostWindow: args.window,
        payload: envelope.payload,
      }).catch((error) => {
        const hostWindow = resolveWorkflowHostWindow(args.window);
        if (hostWindow) {
          alertWindow(
            hostWindow,
            error instanceof Error ? error.message : String(error || "unknown error"),
          );
        }
      });
      return;
    }
    if (result.hostCommand?.command === "openSynthesisFolder") {
      void openSynthesisFolderFromWorkbench({
        payload: envelope.payload,
      }).catch((error) => {
        const hostWindow = resolveWorkflowHostWindow(args.window);
        if (hostWindow) {
          alertWindow(
            hostWindow,
            error instanceof Error ? error.message : String(error || "unknown error"),
          );
        }
      });
      return;
    }
    void sendSnapshot("synthesis:snapshot");
  };

  const dialogData: Record<string, unknown> = {
    loadCallback: () => {
      const dialogWindow = synthesisWorkbenchDialog?.window;
      const doc = dialogWindow?.document;
      if (!dialogWindow || !doc) {
        return;
      }
      try {
        dialogWindow.resizeTo(1480, 920);
      } catch {
        // ignore host window resize failures
      }
      const root = doc.getElementById("zs-synthesis-workbench-root") as
        | HTMLElement
        | null;
      if (!root) {
        return;
      }
      root.innerHTML = "";
      const frame = createSynthesisFrame(doc, resolveSynthesisPageUrl());
      root.appendChild(frame);
      frameWindow = resolveFrameWindow(frame);
      frame.addEventListener("load", () => {
        frameWindow = resolveFrameWindow(frame);
        void sendSnapshot("synthesis:init");
      });
      const onMessage = (event: MessageEvent) => {
        const data = event.data as { type?: unknown };
        if (!data || data.type !== "synthesis:action") {
          return;
        }
        handleAction(data as SynthesisWorkbenchActionEnvelope);
      };
      dialogWindow.addEventListener("message", onMessage);
      removeMessageListener = () => {
        dialogWindow.removeEventListener("message", onMessage);
      };
    },
    unloadCallback: () => {
      if (removeMessageListener) {
        removeMessageListener();
        removeMessageListener = undefined;
      }
      frameWindow = null;
    },
  };

  synthesisWorkbenchDialog = new ztoolkit.Dialog(1, 1)
    .addCell(0, 0, {
      tag: "div",
      namespace: "html",
      id: "zs-synthesis-workbench-root",
      styles: {
        width: "100%",
        height: "100%",
        minWidth: "1100px",
        minHeight: "700px",
        padding: "0",
        margin: "0",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      },
    })
    .addButton(localize("task-manager-close", "Close"), "close")
    .setDialogData(dialogData)
    .open(localize("synthesis-workbench-title", "Synthesis Workbench"));
}

export async function resetSynthesisWorkbenchDialogRuntimeForTests() {
  if (isWindowAlive(synthesisWorkbenchDialog?.window)) {
    synthesisWorkbenchDialog?.window?.close();
    await Promise.resolve();
  }
  synthesisWorkbenchDialog = undefined;
}
