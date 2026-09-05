// Backend Manager dialog page entry: bootstrap, host message listener,
// action sender, and the snapshot -> draft -> render controller.
//
// Wire protocol (frozen, mirrored from addon/content/dashboard/backend-manager.js;
// the host side lives in src/modules/backendManager.ts):
//   page -> host: { type: "backend-manager-dialog:action", action, payload }
//     posted to window.parent with targetOrigin "*"; the page announces
//     itself with the "ready" action after load.
//   host -> page: "backend-manager-dialog:init" | ":snapshot" carrying a
//     BackendManagerSnapshot, ":select-provider" { providerType }, and
//     ":action-result" responses for refresh/preset actions.
//
// Draft semantics preserved from the legacy implementation: text input edits
// update the draft and emit "draft-changed" without re-rendering (typing must
// not disturb focus or IME composition); structural edits (add/remove row,
// add/remove arg/env, skillrunner enabled toggle, dialog open/close)
// re-render.

import {
  type BackendManagerAcpPresetDialogState,
  type BackendManagerDraftRow,
  type BackendManagerDraftRowAcp,
  type BackendManagerGenericHttpPresetDialogState,
  type BackendManagerLabels,
  type BackendManagerRegionHandlers,
  type BackendManagerRowPatch,
  type BackendManagerSnapshot,
  type BackendManagerView,
} from "./components/BackendManagerRegion";
import type {
  BackendManagerActionEnvelopeFor,
  BackendManagerActionHandler,
  BackendManagerActionName,
  BackendManagerActionPayload,
} from "../shared/dashboardWireContract";
import {
  createBackendManagerRenderer,
  type BackendManagerRenderOptions,
} from "./backendManagerRenderer";

const PROVIDER_ORDER = ["acp", "skillrunner", "generic-http"];

export type BackendManagerActionSender = BackendManagerActionHandler;

export function sendBackendManagerAction<
  Action extends BackendManagerActionName,
>(action: Action, payload?: BackendManagerActionPayload<Action>): void {
  const message: BackendManagerActionEnvelopeFor<Action> = {
    type: "backend-manager-dialog:action",
    action,
    payload,
  };
  try {
    window.parent.postMessage(message, "*");
  } catch {
    // ignore cross-window messaging failures
  }
}

export type BackendManagerControllerState = {
  snapshot: BackendManagerSnapshot | null;
  rows: BackendManagerDraftRow[];
  activeProviderType: string;
  pendingAcpRows: Set<number>;
  pendingModelCacheRows: Set<number>;
  skillRunnerReachableById: Record<string, boolean>;
  statusMessage: { text: string; tone: string } | null;
  scrollByProvider: Record<string, number>;
  acpPresetDialog: BackendManagerAcpPresetDialogState | null;
  genericHttpPresetDialog: BackendManagerGenericHttpPresetDialogState | null;
};

export type BackendManagerControllerDeps = {
  sendAction: BackendManagerActionSender;
  renderView: (
    view: BackendManagerView | null,
    options?: BackendManagerRenderOptions,
  ) => void;
};

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value ?? null));
}

function cleanRow(row: unknown): BackendManagerDraftRow {
  const source = (row || {}) as Partial<BackendManagerDraftRow>;
  return {
    internalId: String(source.internalId ? source.internalId : ""),
    displayName: String(source.displayName ? source.displayName : ""),
    type: String(source.type ? source.type : ""),
    enabled: source.enabled === false ? false : true,
    baseUrl: String(source.baseUrl ? source.baseUrl : ""),
    authKind:
      String(source.authKind ? source.authKind : "none") === "bearer"
        ? "bearer"
        : "none",
    authToken: String(source.authToken ? source.authToken : ""),
    authTokenPlaceholder: String(
      source.authTokenPlaceholder ? source.authTokenPlaceholder : "",
    ),
    timeoutMs: String(source.timeoutMs ? source.timeoutMs : ""),
    command: String(source.command ? source.command : ""),
    args: Array.isArray(source.args) ? source.args.map(String) : [],
    env: Array.isArray(source.env)
      ? source.env.map((item) => ({
          key: String(item && item.key ? item.key : ""),
          value: String(item && item.value ? item.value : ""),
        }))
      : [],
    acp: source.acp ? clone(source.acp) : undefined,
  };
}

function emptyRow(type: string): BackendManagerDraftRow {
  return cleanRow({
    type,
    authKind: "none",
    args: [],
    env: [],
  });
}

function labelsOf(
  snapshot: BackendManagerSnapshot | null,
): BackendManagerLabels {
  return (snapshot && snapshot.labels) || {};
}

function providerList(snapshot: BackendManagerSnapshot | null) {
  const providers = (snapshot && snapshot.providers) || [];
  return providers.slice().sort((a, b) => {
    const ai = PROVIDER_ORDER.indexOf(a.type);
    const bi = PROVIDER_ORDER.indexOf(b.type);
    return (ai < 0 ? 99 : ai) - (bi < 0 ? 99 : bi);
  });
}

function acpPresetList(snapshot: BackendManagerSnapshot | null) {
  return (snapshot && snapshot.acpPresets) || [];
}

function genericHttpPresetList(snapshot: BackendManagerSnapshot | null) {
  return (snapshot && snapshot.genericHttpPresets) || [];
}

function isNpxUnavailable(snapshot: BackendManagerSnapshot | null): boolean {
  const runtimeCommands = (snapshot && snapshot.runtimeCommands) || undefined;
  const npx = (runtimeCommands && runtimeCommands.npx) || {};
  return npx.available === false;
}

function rowBackendId(row: BackendManagerDraftRow | null | undefined): string {
  return String(row && row.internalId ? row.internalId : "").trim();
}

function defaultAcpPresetDialogState(
  snapshot: BackendManagerSnapshot | null,
  preset: { id: string; defaultUseNpx: boolean; supportsNpx: boolean } | null,
): BackendManagerAcpPresetDialogState {
  return {
    selectedPresetId: preset ? preset.id : "",
    useNpx: !!(
      preset &&
      preset.defaultUseNpx &&
      preset.supportsNpx &&
      !isNpxUnavailable(snapshot)
    ),
    isolated: false,
  };
}

type BackendManagerStatusKind =
  | "modelRefreshed"
  | "modelFailed"
  | "acpRefreshed"
  | "acpFailed";

function statusText(
  labels: BackendManagerLabels,
  kind: BackendManagerStatusKind,
  backendId: string,
  error: unknown,
): string {
  const messages: Record<BackendManagerStatusKind, string> = {
    modelRefreshed: labels.statusModelCacheRefreshed || "",
    modelFailed: labels.statusModelCacheRefreshFailed || "",
    acpRefreshed: labels.statusAcpRuntimeCacheRefreshed || "",
    acpFailed: labels.statusAcpRuntimeCacheRefreshFailed || "",
  };
  const idPart = backendId ? backendId + ": " : "";
  const errorPart = error ? " - " + String(error) : "";
  return idPart + (messages[kind] || "") + errorPart;
}

export function createBackendManagerController(
  deps: BackendManagerControllerDeps,
) {
  const state: BackendManagerControllerState = {
    snapshot: null,
    rows: [],
    activeProviderType: "",
    pendingAcpRows: new Set<number>(),
    pendingModelCacheRows: new Set<number>(),
    skillRunnerReachableById: Object.create(null) as Record<string, boolean>,
    statusMessage: null,
    scrollByProvider: Object.create(null) as Record<string, number>,
    acpPresetDialog: null,
    genericHttpPresetDialog: null,
  };
  let statusTimer: ReturnType<typeof setTimeout> | null = null;
  let disposed = false;

  function isSkillRunnerReachable(row: BackendManagerDraftRow): boolean {
    const backendId = rowBackendId(row);
    return (
      !!row &&
      row.enabled !== false &&
      !!backendId &&
      state.skillRunnerReachableById[backendId] === true
    );
  }

  function setSkillRunnerReachability(
    rowOrId: BackendManagerDraftRow | string,
    reachable: boolean,
  ): void {
    const backendId =
      typeof rowOrId === "string"
        ? String(rowOrId).trim()
        : rowBackendId(rowOrId);
    if (!backendId) return;
    state.skillRunnerReachableById = Object.assign(
      {},
      state.skillRunnerReachableById,
      { [backendId]: reachable === true },
    );
  }

  function syncSkillRunnerReachabilityFromSnapshot(): void {
    const healthById =
      (state.snapshot && state.snapshot.skillRunnerHealth) || {};
    const next: Record<string, boolean> = {};
    state.rows.forEach((row) => {
      const backendId = rowBackendId(row);
      if (row.type !== "skillrunner" || !backendId) return;
      const health = healthById[backendId] || {};
      next[backendId] =
        row.enabled !== false &&
        health.enabled !== false &&
        health.reachable === true;
    });
    state.skillRunnerReachableById = next;
  }

  function setActiveProviderType(providerType: string): boolean {
    const next = String(providerType || "").trim();
    if (
      !next ||
      !providerList(state.snapshot).some((provider) => provider.type === next)
    ) {
      return false;
    }
    state.activeProviderType = next;
    return true;
  }

  function ensureActiveProvider(): void {
    const providers = providerList(state.snapshot);
    if (
      providers.some((provider) => provider.type === state.activeProviderType)
    ) {
      return;
    }
    state.activeProviderType = providers[0] ? providers[0].type : "";
  }

  function emitDraftChanged(): void {
    deps.sendAction("draft-changed", { rows: state.rows });
  }

  function projectView(): BackendManagerView {
    const snapshot = state.snapshot!;
    const labels = labelsOf(snapshot);
    const providers = providerList(snapshot);
    const provider =
      providers.find((entry) => entry.type === state.activeProviderType) ||
      providers[0] ||
      null;
    return {
      header: {
        title: snapshot.title || "Backend Manager",
        help: snapshot.help || "",
        tabs: providers.map((entry) => ({
          type: entry.type,
          label: entry.label || entry.title || entry.type,
          active: !!provider && entry.type === provider.type,
        })),
      },
      body: provider
        ? {
            providerType: provider.type,
            providerLabel: provider.label || provider.type,
            providerTitle: provider.title || provider.label || provider.type,
            hasGenericHttpPresets: genericHttpPresetList(snapshot).length > 0,
            labels,
            rows: state.rows
              .map((row, index) => ({ row, index }))
              .filter((entry) => entry.row.type === provider.type)
              .map((entry) => ({
                index: entry.index,
                row: entry.row,
                acpPending: state.pendingAcpRows.has(entry.index),
                modelCachePending: state.pendingModelCacheRows.has(entry.index),
                skillRunnerReachable: isSkillRunnerReachable(entry.row),
              })),
          }
        : null,
      footer: {
        status: state.statusMessage,
        labels,
      },
      acpDialog: state.acpPresetDialog
        ? {
            labels,
            presets: acpPresetList(snapshot),
            dialog: { ...state.acpPresetDialog },
            npxUnavailable: isNpxUnavailable(snapshot),
            isolationRoot: String(snapshot.acpPresetIsolationRoot || ""),
          }
        : null,
      genericHttpDialog: state.genericHttpPresetDialog
        ? {
            labels,
            presets: genericHttpPresetList(snapshot),
            dialog: { ...state.genericHttpPresetDialog },
          }
        : null,
    };
  }

  function renderCurrent(options?: BackendManagerRenderOptions): void {
    if (disposed) return;
    if (!state.snapshot) {
      deps.renderView(null);
      return;
    }
    ensureActiveProvider();
    deps.renderView(projectView(), options);
  }

  function renderWithProviderScrollRestore(): void {
    renderCurrent({
      restoreBodyScrollTop:
        state.scrollByProvider[state.activeProviderType] || 0,
    });
  }

  function showStatusMessage(text: unknown, tone?: string): void {
    if (disposed) return;
    if (statusTimer) {
      clearTimeout(statusTimer);
    }
    state.statusMessage = {
      text: String(text || ""),
      tone: tone || "info",
    };
    renderCurrent();
    statusTimer = setTimeout(() => {
      if (disposed) return;
      state.statusMessage = null;
      statusTimer = null;
      renderCurrent();
    }, 5000);
  }

  function applyRowPatch(
    index: number,
    patch: BackendManagerRowPatch,
  ): boolean {
    const row = state.rows[index];
    if (!row) return false;
    const resolved = typeof patch === "function" ? patch(row) : patch;
    state.rows[index] = { ...row, ...resolved };
    emitDraftChanged();
    return true;
  }

  function applySnapshot(payload: BackendManagerSnapshot | null): void {
    if (disposed) return;
    state.snapshot = payload || ({} as BackendManagerSnapshot);
    state.rows = Array.isArray(state.snapshot.rows)
      ? state.snapshot.rows.map(cleanRow)
      : [];
    syncSkillRunnerReachabilityFromSnapshot();
    setActiveProviderType(String(state.snapshot.initialProviderType || ""));
    ensureActiveProvider();
    renderCurrent();
    emitDraftChanged();
  }

  function handleActionResult(payload: Record<string, unknown>): void {
    if (disposed) return;
    const action = String(payload.action || "");
    if (action === "add-acp-preset" && payload.row) {
      state.rows.push(cleanRow(payload.row));
      state.acpPresetDialog = null;
      emitDraftChanged();
      renderCurrent();
      return;
    }
    if (action === "add-generic-http-preset" && payload.row) {
      state.rows.push(cleanRow(payload.row));
      state.genericHttpPresetDialog = null;
      emitDraftChanged();
      renderCurrent();
      return;
    }
    if (action === "refresh-acp-runtime-options") {
      const rowIndex = Number(payload.rowIndex);
      state.pendingAcpRows.delete(rowIndex);
      const row = Number.isInteger(rowIndex) ? state.rows[rowIndex] : null;
      const backendId = String(
        payload.backendId || (row && row.internalId) || "",
      );
      if (Number.isInteger(rowIndex) && state.rows[rowIndex]) {
        state.rows[rowIndex] = {
          ...state.rows[rowIndex],
          acp:
            (payload.acp as BackendManagerDraftRowAcp | undefined) ||
            state.rows[rowIndex].acp,
        };
        emitDraftChanged();
      }
      showStatusMessage(
        statusText(
          labelsOf(state.snapshot),
          payload.ok === false ? "acpFailed" : "acpRefreshed",
          backendId,
          payload.ok === false ? payload.error : "",
        ),
        payload.ok === false ? "error" : "success",
      );
      return;
    }
    if (action === "refresh-model-cache") {
      const rowIndex = Number(payload.rowIndex);
      state.pendingModelCacheRows.delete(rowIndex);
      const row = Number.isInteger(rowIndex) ? state.rows[rowIndex] : null;
      const backendId = String(
        payload.backendId || (row && row.internalId) || "",
      );
      if (payload.ok === true) {
        setSkillRunnerReachability(backendId, true);
      } else if (backendId) {
        setSkillRunnerReachability(backendId, false);
      }
      showStatusMessage(
        statusText(
          labelsOf(state.snapshot),
          payload.ok === true ? "modelRefreshed" : "modelFailed",
          backendId,
          payload.ok === true ? "" : payload.error,
        ),
        payload.ok === true ? "success" : "error",
      );
    }
  }

  function handleMessage(data: unknown): void {
    if (disposed) return;
    if (!data || typeof data !== "object") return;
    const message = data as { type?: unknown; payload?: unknown };
    if (
      message.type === "backend-manager-dialog:init" ||
      message.type === "backend-manager-dialog:snapshot"
    ) {
      applySnapshot((message.payload || null) as BackendManagerSnapshot | null);
      return;
    }
    if (message.type === "backend-manager-dialog:select-provider") {
      const payload = (message.payload || {}) as { providerType?: unknown };
      if (setActiveProviderType(String(payload.providerType || ""))) {
        renderWithProviderScrollRestore();
      }
      return;
    }
    if (message.type === "backend-manager-dialog:action-result") {
      handleActionResult((message.payload || {}) as Record<string, unknown>);
    }
  }

  const handlers: BackendManagerRegionHandlers = {
    selectTab(providerType) {
      if (!setActiveProviderType(providerType)) return;
      renderWithProviderScrollRestore();
    },
    patchRow(index, patch) {
      applyRowPatch(index, patch);
    },
    changeRowStructure(index, patch) {
      if (applyRowPatch(index, patch)) {
        renderCurrent();
      }
    },
    removeRow(index) {
      state.rows.splice(index, 1);
      emitDraftChanged();
      renderCurrent();
    },
    addRow() {
      if (!state.activeProviderType) return;
      state.rows.push(emptyRow(state.activeProviderType));
      emitDraftChanged();
      renderCurrent();
    },
    openAcpPresetDialog() {
      const preset = acpPresetList(state.snapshot)[0] || null;
      state.acpPresetDialog = defaultAcpPresetDialogState(
        state.snapshot,
        preset,
      );
      renderCurrent();
    },
    openGenericHttpPresetDialog() {
      const preset = genericHttpPresetList(state.snapshot)[0] || null;
      state.genericHttpPresetDialog = {
        selectedPresetId: preset ? preset.id : "",
      };
      renderCurrent();
    },
    refreshAcp(index) {
      if (!state.rows[index]) return;
      state.pendingAcpRows.add(index);
      renderCurrent();
      deps.sendAction("refresh-acp-runtime-options", {
        row: state.rows[index],
        rowIndex: index,
      });
    },
    refreshModelCache(index) {
      if (!state.rows[index]) return;
      state.pendingModelCacheRows.add(index);
      renderCurrent();
      deps.sendAction("refresh-model-cache", {
        row: state.rows[index],
        rowIndex: index,
      });
    },
    openManagement(index) {
      deps.sendAction("open-management", {
        row: state.rows[index],
        rowIndex: index,
      });
    },
    toggleSkillRunnerEnabled(index, checked) {
      const row = state.rows[index];
      if (!row) return;
      state.rows[index] = { ...row, enabled: checked };
      setSkillRunnerReachability(row, false);
      emitDraftChanged();
      renderCurrent();
    },
    reportBodyScroll(scrollTop) {
      if (state.activeProviderType && Number.isFinite(scrollTop)) {
        state.scrollByProvider[state.activeProviderType] = scrollTop;
      }
    },
    cancel() {
      deps.sendAction("cancel", { rows: state.rows });
    },
    save() {
      deps.sendAction("save", { rows: state.rows });
    },
    selectAcpDialogPreset(presetId) {
      if (!state.acpPresetDialog) return;
      const preset = acpPresetList(state.snapshot).find(
        (entry) => entry.id === presetId,
      );
      if (!preset) return;
      state.acpPresetDialog = defaultAcpPresetDialogState(
        state.snapshot,
        preset,
      );
      renderCurrent();
    },
    setAcpDialogUseNpx(useNpx) {
      if (!state.acpPresetDialog) return;
      state.acpPresetDialog = { ...state.acpPresetDialog, useNpx };
      renderCurrent();
    },
    setAcpDialogIsolated(isolated) {
      if (!state.acpPresetDialog) return;
      state.acpPresetDialog = { ...state.acpPresetDialog, isolated };
      renderCurrent();
    },
    cancelAcpDialog() {
      if (!state.acpPresetDialog) return;
      state.acpPresetDialog = null;
      renderCurrent();
    },
    confirmAcpDialog(confirmation) {
      deps.sendAction("add-acp-preset", {
        presetId: confirmation.presetId,
        useNpx: confirmation.useNpx,
        isolated: confirmation.isolated,
        rows: state.rows,
      });
    },
    openNodejsDownload() {
      deps.sendAction("open-nodejs-download", {});
    },
    selectGenericHttpDialogPreset(presetId) {
      if (!state.genericHttpPresetDialog) return;
      state.genericHttpPresetDialog = { selectedPresetId: presetId };
      renderCurrent();
    },
    cancelGenericHttpDialog() {
      if (!state.genericHttpPresetDialog) return;
      state.genericHttpPresetDialog = null;
      renderCurrent();
    },
    confirmGenericHttpDialog(presetId) {
      deps.sendAction("add-generic-http-preset", {
        presetId,
        rows: state.rows,
      });
    },
    openPresetLink(url) {
      deps.sendAction("open-preset-link", { url });
    },
  };

  return {
    state,
    handlers,
    handleMessage,
    renderCurrent,
    dispose(): void {
      if (disposed) return;
      disposed = true;
      if (statusTimer) {
        clearTimeout(statusTimer);
        statusTimer = null;
      }
      state.statusMessage = null;
      deps.renderView(null);
    },
  };
}

export function bootstrapBackendManagerApp(): () => void {
  const controller = createBackendManagerController({
    sendAction: sendBackendManagerAction,
    renderView: (view, options) => renderer.renderView(view, options),
  });
  const renderer = createBackendManagerRenderer({
    handlers: controller.handlers,
  });

  let disposed = false;
  const onMessage = (event: MessageEvent) => {
    if (disposed) return;
    controller.handleMessage(event.data);
  };
  const onPageHide = () => {
    dispose();
  };
  window.addEventListener("message", onMessage);
  window.addEventListener("pagehide", onPageHide, { once: true });

  function dispose(): void {
    if (disposed) return;
    disposed = true;
    window.removeEventListener("message", onMessage);
    window.removeEventListener("pagehide", onPageHide);
    controller.dispose();
    renderer.dispose();
  }

  controller.renderCurrent();
  sendBackendManagerAction("ready", {});
  return dispose;
}

// Entry semantics: loading this module bootstraps the page when the host
// document carries the backend manager root. Tests import the factories
// directly without a #backend-manager-root element and must not
// auto-bootstrap.
if (
  typeof document !== "undefined" &&
  document.getElementById("backend-manager-root")
) {
  bootstrapBackendManagerApp();
}
