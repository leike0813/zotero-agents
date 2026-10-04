import { config } from "../../../../package.json";
import { resolveNativeAbortControllerConstructor } from "../../../utils/wait";
import { getStringOrFallback } from "../../../utils/locale";
import { isZoteroAgentSettingsActionName } from "../../../shared/zoteroAgentSettingsWireContract";

type SettingsRequest = {
  action: string;
  requestId: string;
  objectId: string;
  payload: Record<string, unknown>;
};

type SessionDependencies = {
  frame(): unknown;
  post(message: { type: string; payload: Record<string, unknown> }): void;
  snapshot(): Promise<object>;
  dispatch(
    request: SettingsRequest,
    signal: AbortSignal,
  ): Promise<Record<string, unknown>>;
  subscribe?(refresh: () => void): () => void;
  abortController?: new () => AbortController;
};

/** The frame owns requests; domain owners retain all durable configuration. */
export function createZoteroAgentSettingsSession(deps: SessionDependencies) {
  let closed = false;
  let publication = 0;
  const requests = new Map<
    string,
    { requestId: string; controller: { signal: AbortSignal; abort(): void } }
  >();
  const resolvedController =
    deps.abortController || resolveNativeAbortControllerConstructor();
  if (!resolvedController)
    throw new Error("settings_abort_controller_unavailable");
  const Controller = resolvedController;
  async function refresh() {
    const revision = ++publication;
    const snapshot = await deps.snapshot();
    if (!closed && publication === revision)
      deps.post({
        type: "zotero-agent-settings:snapshot",
        payload: snapshot as Record<string, unknown>,
      });
  }
  const unsubscribe = deps.subscribe?.(() => void refresh());
  async function receive(event: { source: unknown; data: unknown }) {
    if (closed || !deps.frame() || event.source !== deps.frame()) return;
    const raw = event.data;
    if (!raw || typeof raw !== "object") return;
    const request = raw as SettingsRequest & { type?: string };
    if (
      request.type !== "zotero-agent-settings:action" ||
      !isZoteroAgentSettingsActionName(request.action) ||
      typeof request.requestId !== "string" ||
      !request.requestId ||
      request.requestId.length > 160 ||
      typeof request.objectId !== "string" ||
      !request.objectId ||
      request.objectId.length > 160 ||
      !request.payload ||
      typeof request.payload !== "object" ||
      Array.isArray(request.payload)
    )
      return;
    const previous = requests.get(request.objectId);
    if (previous?.requestId === request.requestId) return;
    previous?.controller.abort();
    const entry = {
      requestId: request.requestId,
      controller: new Controller(),
    };
    requests.set(request.objectId, entry);
    try {
      const result =
        request.action === "ready"
          ? { ok: true }
          : await deps.dispatch(request, entry.controller.signal);
      if (
        closed ||
        requests.get(request.objectId) !== entry ||
        entry.controller.signal.aborted
      )
        return;
      deps.post({
        type: "zotero-agent-settings:action-result",
        payload: {
          ...result,
          action: request.action,
          requestId: request.requestId,
          objectId: request.objectId,
        },
      });
      await refresh();
    } catch (error) {
      if (
        closed ||
        requests.get(request.objectId) !== entry ||
        entry.controller.signal.aborted
      )
        return;
      const code =
        error && typeof error === "object" && "code" in error
          ? String(error.code)
          : "settings_action_failed";
      deps.post({
        type: "zotero-agent-settings:action-result",
        payload: {
          action: request.action,
          requestId: request.requestId,
          objectId: request.objectId,
          ok: false,
          code: /^[a-z][a-z0-9_]{0,64}$/.test(code)
            ? code
            : "settings_action_failed",
        },
      });
    } finally {
      if (requests.get(request.objectId) === entry)
        requests.delete(request.objectId);
    }
  }
  function dispose() {
    if (closed) return;
    closed = true;
    publication++;
    for (const entry of requests.values()) entry.controller.abort();
    requests.clear();
    unsubscribe?.();
  }
  return { receive, refresh, dispose };
}

let settingsDialog: { window?: Window } | undefined;
let opening: Promise<void> | undefined;
let forceClose: (() => void) | undefined;

export function closeZoteroAgentSettings() {
  forceClose?.();
}

/** A distinct dialog reference keeps Backend Profile drafts independently owned. */
export async function openZoteroAgentSettings(args?: { window?: Window }) {
  // Compile-time Pi entry. The measurement-only control build has no settings
  // owner to open, and this positive guard is what lets the bundler drop the
  // Pi composition edge below instead of keeping it as a reachable import.
  if (typeof __PI_RUNTIME_ENABLED__ === "undefined" || __PI_RUNTIME_ENABLED__) {
    await openOwnedZoteroAgentSettings(args);
  }
}

async function openOwnedZoteroAgentSettings(args?: { window?: Window }) {
  if (settingsDialog?.window && !settingsDialog.window.closed) {
    settingsDialog.window.focus();
    return;
  }
  if (opening) return opening;
  opening = (async () => {
    const access = await import("./zoteroAgentSettingsPiAccess");
    let session:
      | ReturnType<typeof createZoteroAgentSettingsSession>
      | undefined;
    let frame: HTMLIFrameElement | undefined;
    let window: Window | undefined;
    const title = getStringOrFallback(
      "zotero-agent-settings-window-title",
      "Built-in Agent Settings",
    );
    // Calls made from Zotero's module global have no Window source in
    // postMessage. Deliver through the owned frame with its actual parent
    // identity, so the page can keep strict source admission.
    const postToFrame = (message: object) => {
      const target = frame?.contentWindow;
      if (!target || !window || window.closed) return;
      target.dispatchEvent(
        new (
          target as unknown as { MessageEvent: typeof MessageEvent }
        ).MessageEvent("message", {
          source: window,
          data: JSON.parse(JSON.stringify(message)),
        }),
      );
    };
    const state = await access.createZoteroAgentSettingsOwner({
      progress: (payload) =>
        postToFrame({ type: "zotero-agent-settings:progress", payload }),
      authorizeLocalNetwork: async (endpoint) =>
        (window || args?.window)?.confirm(
          getStringOrFallback(
            "zotero-agent-settings-local-network-body",
            `Allow local network access to ${new URL(endpoint).origin}?`,
            { args: { origin: new URL(endpoint).origin } },
          ) + `\n${new URL(endpoint).origin}`,
        ) === true,
    });
    let allowClose = false;
    let closeRequestId = "";
    let nativeClose: (() => void) | undefined;
    const requestClose = () => {
      if (allowClose) {
        nativeClose?.();
        return;
      }
      closeRequestId = `close-${Date.now()}`;
      postToFrame({
        type: "zotero-agent-settings:request-close",
        payload: { requestId: closeRequestId },
      });
    };
    const onNativeClose = (event: Event) => {
      if (allowClose) return;
      event.preventDefault();
      requestClose();
    };
    forceClose = () => {
      allowClose = true;
      settingsDialog?.window?.close();
    };
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (allowClose) return;
      event.preventDefault();
      event.returnValue = "";
      requestClose();
    };
    const onMessage = (event: MessageEvent) => void session?.receive(event);
    const dialogData = {
      loadCallback: () => {
        window = settingsDialog?.window;
        const root = window?.document.getElementById("zs-agent-settings-root");
        if (!window || !root) return;
        nativeClose = window.close.bind(window);
        window.close = requestClose;
        const Controller = resolveNativeAbortControllerConstructor(window);
        if (!Controller) return;
        frame = window.document.createElementNS(
          "http://www.w3.org/1999/xhtml",
          "iframe",
        ) as HTMLIFrameElement;
        frame.setAttribute(
          "style",
          "border:0;width:100%;height:100%;flex:1;min-height:0",
        );
        frame.setAttribute("title", title);
        session = createZoteroAgentSettingsSession({
          frame: () => frame?.contentWindow,
          post: postToFrame,
          snapshot: state.snapshot,
          dispatch: async (request, signal) => {
            if (request.action === "close-window") {
              if (
                request.payload.closeRequestId !== closeRequestId ||
                !["save", "discard"].includes(String(request.payload.decision))
              )
                return { ok: false, code: "invalid_close_request" };
              allowClose = true;
              window?.close();
              return { ok: true };
            }
            return state.dispatch(request, signal);
          },
          subscribe: state.subscribe,
          abortController: Controller,
        });
        window.addEventListener("message", onMessage);
        window.addEventListener("beforeunload", beforeUnload);
        window.addEventListener("close", onNativeClose);
        frame.addEventListener("load", () => void session?.refresh());
        root.appendChild(frame);
        frame.src = `chrome://${config.addonRef}/content/dashboard/zotero-agent-settings.html`;
      },
      unloadCallback: () => {
        window?.removeEventListener("message", onMessage);
        window?.removeEventListener("beforeunload", beforeUnload);
        window?.removeEventListener("close", onNativeClose);
        session?.dispose();
        state.dispose();
        settingsDialog = undefined;
        forceClose = undefined;
      },
    };
    settingsDialog = new ztoolkit.Dialog(1, 1)
      .addCell(0, 0, {
        tag: "div",
        namespace: "html",
        id: "zs-agent-settings-root",
        styles: {
          width: "100%",
          height: "100%",
          minWidth: "640px",
          minHeight: "480px",
          display: "flex",
          overflow: "hidden",
        },
      })
      .setDialogData(dialogData)
      .open(title, {
        centerscreen: true,
        resizable: true,
        fitContent: false,
        width: 1120,
        height: 760,
      });
  })();
  try {
    await opening;
  } finally {
    opening = undefined;
  }
}
