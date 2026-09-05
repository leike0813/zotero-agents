// Dashboard page entry: bootstrap, host message listener, action sender, and
// the snapshot -> projection -> render controller.
//
// Wire protocol (frozen, mirrored from addon/content/dashboard/app.js):
//   page -> host: { type: "dashboard:action", action, payload } posted to
//     window.parent / window.top / window.opener with targetOrigin "*";
//     the page announces itself with the "ready" action after load.
//   host -> page: { type: "dashboard:init" | "dashboard:snapshot", payload }
//     carrying a DashboardSnapshot.
//
// Local UI state (selected tab override and sidecar filter/selection) lives in
// the controller's plain state object, not in a Preact store.

import type {
  DashboardActionEnvelopeFor,
  DashboardActionName,
  DashboardActionPayload,
  DashboardHostActionName,
  DashboardHostActionPayload,
  DashboardHostMessage,
} from "../shared/dashboardWireContract";
import { createDashboardChromeRenderer } from "./dashboardChromeRenderer";
import { projectDashboardPanel } from "./dashboardPanelModel";
import type {
  DashboardActionSender,
  DashboardControllerState,
  DashboardPageSnapshot,
  DashboardUiPatch,
  DashboardUiState,
} from "./dashboardTypes";

export function sendDashboardAction<Action extends DashboardHostActionName>(
  action: Action,
  payload?: DashboardHostActionPayload<Action>,
): void {
  const message: DashboardActionEnvelopeFor<Action> = {
    type: "dashboard:action",
    action,
    payload,
  };
  const rawTargets = [window.parent, window.top, window.opener];
  const dedup = new Set<unknown>();
  for (const target of rawTargets) {
    if (!target || dedup.has(target)) continue;
    dedup.add(target);
    try {
      (target as Window).postMessage(message, "*");
    } catch {
      // ignore cross-window messaging failures
    }
  }
}

export type DashboardControllerDeps = {
  sendAction: DashboardActionSender;
  renderPanel: (panel: ReturnType<typeof projectDashboardPanel> | null) => void;
};

function createInitialUiState(): DashboardUiState {
  return {
    selectedTabKey: "",
    synthesisSidecar: { traceFilter: "", selectedTraceId: "" },
    backendTaskScrollTopByTabKey: Object.create(null) as Record<string, number>,
  };
}

export function createDashboardController(deps: DashboardControllerDeps) {
  const state: DashboardControllerState = {
    snapshot: null,
    ui: createInitialUiState(),
  };

  function renderCurrentPanel(): void {
    if (!state.snapshot) {
      deps.renderPanel(null);
      return;
    }
    const panel = projectDashboardPanel(state.snapshot, state.ui);
    // Effective-selection writeback (legacy state.synthesisTraceId =
    // selected.traceId): when the projection resolves a different selected
    // trace than the UI state pinned (filter changes, trace expiry), sync
    // the state without re-rendering — the panel already used it.
    const sidecar = panel.views.synthesisSidecar;
    if (sidecar && sidecar.kind === "traces") {
      const effective = sidecar.detail ? sidecar.detail.traceId : "";
      if (effective !== state.ui.synthesisSidecar.selectedTraceId) {
        state.ui.synthesisSidecar.selectedTraceId = effective;
      }
    }
    deps.renderPanel(panel);
  }

  return {
    state,
    applySnapshot(snapshot: DashboardPageSnapshot | null): void {
      state.snapshot = snapshot;
      // The host is authoritative for the selected tab; drop the optimistic
      // override once a snapshot lands.
      state.ui.selectedTabKey = "";
      renderCurrentPanel();
    },
    applyUiPatch(patch: DashboardUiPatch): void {
      if (typeof patch.selectedTabKey === "string") {
        state.ui.selectedTabKey = patch.selectedTabKey;
      }
      if (patch.synthesisSidecar) {
        Object.assign(state.ui.synthesisSidecar, patch.synthesisSidecar);
      }
      renderCurrentPanel();
    },
    // Action fan-out: page-local UI intents are written back to controller
    // state and re-projected synchronously; everything else goes to the
    // host verbatim.
    dispatch<Action extends DashboardActionName>(
      action: Action,
      payload?: DashboardActionPayload<Action>,
    ): void {
      if (action === "synthesis-sidecar-select-trace") {
        state.ui.synthesisSidecar.selectedTraceId = String(
          payload?.traceId || "",
        );
        renderCurrentPanel();
        return;
      }
      if (action === "synthesis-sidecar-set-trace-filter") {
        state.ui.synthesisSidecar.traceFilter = String(payload?.filter || "");
        renderCurrentPanel();
        return;
      }
      deps.sendAction(
        action as DashboardHostActionName,
        payload as DashboardHostActionPayload<DashboardHostActionName>,
      );
    },
    recordBackendTaskScroll(scrollKey: string, scrollTop: number): void {
      const key = String(scrollKey || "").trim();
      if (key && Number.isFinite(scrollTop)) {
        state.ui.backendTaskScrollTopByTabKey[key] = scrollTop;
      }
    },
    backendTaskScrollTop(scrollKey: string): number {
      return (
        state.ui.backendTaskScrollTopByTabKey[String(scrollKey || "")] || 0
      );
    },
  };
}

export function bootstrapDashboardApp(): () => void {
  let disposed = false;
  const controller = createDashboardController({
    sendAction: sendDashboardAction,
    renderPanel: (panel) => chromeRenderer.renderPanel(panel),
  });
  const chromeRenderer = createDashboardChromeRenderer({
    sendAction: sendDashboardAction,
    dispatchAction: (action, payload) => controller.dispatch(action, payload),
    onUiChange(patch) {
      controller.applyUiPatch(patch);
    },
    onTaskTableScroll: (scrollKey, scrollTop) =>
      controller.recordBackendTaskScroll(scrollKey, scrollTop),
    taskTableScrollTop: (scrollKey) =>
      controller.backendTaskScrollTop(scrollKey),
  });

  function onMessage(event: MessageEvent): void {
    if (disposed) return;
    const data = event.data as Partial<DashboardHostMessage> | null;
    if (!data || typeof data !== "object") {
      return;
    }
    if (data.type === "dashboard:init" || data.type === "dashboard:snapshot") {
      controller.applySnapshot(
        (data.payload ?? null) as DashboardPageSnapshot | null,
      );
    }
  }

  function onPageHide(): void {
    dispose();
  }

  window.addEventListener("message", onMessage);
  window.addEventListener("pagehide", onPageHide, { once: true });

  sendDashboardAction("ready", {});

  function dispose(): void {
    if (disposed) return;
    disposed = true;
    window.removeEventListener("message", onMessage);
    window.removeEventListener("pagehide", onPageHide);
    // Clear the roots before disposing their region-owned listeners and
    // timers. This also makes a late host snapshot a no-op after disposal.
    chromeRenderer.renderPanel(null);
    chromeRenderer.dispose();
  }

  return dispose;
}

// Entry semantics: loading this module bootstraps the page when the host
// document carries the dashboard root. Tests import the factories directly
// without an #app element and must not auto-bootstrap.
if (typeof document !== "undefined" && document.getElementById("app")) {
  bootstrapDashboardApp();
}
