import { config } from "../../package.json";
import { getPref, setPref } from "../utils/prefs";
import {
  getDefaultWorkflowDir,
  getEffectiveWorkflowDir,
} from "./workflowRuntime";
import { getString } from "../utils/locale";
import { isDebugModeEnabled } from "./debugMode";
import { subscribeManagedLocalRuntimeStateChange } from "./skillRunnerLocalRuntimeManager";
import { runtimeFileExists } from "../utils/runtimeCompatibility";

let unbindManagedLocalRuntimeStateChange: (() => void) | null = null;

export async function registerPrefsScripts(window: Window) {
  if (!addon.data.prefs) {
    addon.data.prefs = { window };
  } else {
    addon.data.prefs.window = window;
  }
  bindPrefEvents();
}

function bindPrefEvents() {
  const doc = addon.data.prefs?.window.document;
  if (!doc) {
    return;
  }
  if (unbindManagedLocalRuntimeStateChange) {
    unbindManagedLocalRuntimeStateChange();
    unbindManagedLocalRuntimeStateChange = null;
  }

  const workflowDirInput = doc.querySelector(
    `#zotero-prefpane-${config.addonRef}-workflow-dir`,
  ) as HTMLInputElement | null;
  const browseWorkflowDirButton = doc.querySelector(
    `#zotero-prefpane-${config.addonRef}-workflow-browse`,
  ) as XUL.Button | null;
  const scanButton = doc.querySelector(
    `#zotero-prefpane-${config.addonRef}-workflow-scan`,
  ) as XUL.Button | null;
  const workflowSettingsButton = doc.querySelector(
    `#zotero-prefpane-${config.addonRef}-workflow-settings`,
  ) as XUL.Button | null;
  const workflowOpenLogsButton = doc.querySelector(
    `#zotero-prefpane-${config.addonRef}-workflow-open-logs`,
  ) as XUL.Button | null;
  const backendManageButton = doc.querySelector(
    `#zotero-prefpane-${config.addonRef}-backend-manage`,
  ) as XUL.Button | null;
  const hostBridgeLanCheckbox = doc.querySelector(
    `#zotero-prefpane-${config.addonRef}-host-bridge-lan-enabled`,
  ) as HTMLInputElement | null;
  const hostBridgePinPortCheckbox = doc.querySelector(
    `#zotero-prefpane-${config.addonRef}-host-bridge-pin-port-enabled`,
  ) as HTMLInputElement | null;
  const hostBridgePinnedPortInput = doc.querySelector(
    `#zotero-prefpane-${config.addonRef}-host-bridge-pinned-port`,
  ) as HTMLInputElement | null;
  const hostBridgeEndpointText = doc.querySelector(
    `#zotero-prefpane-${config.addonRef}-host-bridge-endpoint`,
  ) as HTMLElement | null;
  const hostBridgeStatusText = doc.querySelector(
    `#zotero-prefpane-${config.addonRef}-host-bridge-status`,
  ) as HTMLElement | null;
  const hostBridgeShowEndpointButton = doc.querySelector(
    `#zotero-prefpane-${config.addonRef}-host-bridge-show-endpoint`,
  ) as XUL.Button | null;
  const hostBridgeRotateTokenButton = doc.querySelector(
    `#zotero-prefpane-${config.addonRef}-host-bridge-rotate-token`,
  ) as XUL.Button | null;
  const hostBridgeInstallCliButton = doc.querySelector(
    `#zotero-prefpane-${config.addonRef}-host-bridge-install-cli`,
  ) as XUL.Button | null;
  const runtimeDataRoot = doc.querySelector(
    `#zotero-prefpane-${config.addonRef}-runtime-data-root`,
  ) as HTMLElement | null;
  const runtimeDataSummary = doc.querySelector(
    `#zotero-prefpane-${config.addonRef}-runtime-data-summary`,
  ) as HTMLElement | null;
  const runtimeDataCategories = doc.querySelector(
    `#zotero-prefpane-${config.addonRef}-runtime-data-categories`,
  ) as HTMLElement | null;
  const runtimeDataRescanButton = doc.querySelector(
    `#zotero-prefpane-${config.addonRef}-runtime-data-rescan`,
  ) as XUL.Button | null;
  const runtimeDataCopyRootButton = doc.querySelector(
    `#zotero-prefpane-${config.addonRef}-runtime-data-copy-root`,
  ) as XUL.Button | null;
  const runtimeDataOpenRootButton = doc.querySelector(
    `#zotero-prefpane-${config.addonRef}-runtime-data-open-root`,
  ) as XUL.Button | null;

  const localRuntimeDeployButton = doc.querySelector(
    `#zotero-prefpane-${config.addonRef}-skillrunner-local-deploy`,
  ) as XUL.Button | null;
  const localRuntimeStopButton = doc.querySelector(
    `#zotero-prefpane-${config.addonRef}-skillrunner-local-stop`,
  ) as XUL.Button | null;
  const localRuntimeUninstallButton = doc.querySelector(
    `#zotero-prefpane-${config.addonRef}-skillrunner-local-uninstall`,
  ) as XUL.Button | null;
  const localRuntimeOpenDebugConsoleButton = doc.querySelector(
    `#zotero-prefpane-${config.addonRef}-skillrunner-local-open-debug-console`,
  ) as XUL.Button | null;
  const localRuntimeOpenManagementButton = doc.querySelector(
    `#zotero-prefpane-${config.addonRef}-skillrunner-local-open-management`,
  ) as XUL.Button | null;
  const localRuntimeOpenSkillsFolderButton = doc.querySelector(
    `#zotero-prefpane-${config.addonRef}-skillrunner-local-open-skills-folder`,
  ) as XUL.Button | null;
  const localRuntimeRefreshModelCacheButton = doc.querySelector(
    `#zotero-prefpane-${config.addonRef}-skillrunner-local-refresh-model-cache`,
  ) as XUL.Button | null;
  const localRuntimeLed = doc.querySelector(
    `#zotero-prefpane-${config.addonRef}-skillrunner-local-runtime-led`,
  ) as HTMLElement | null;
  const localRuntimeAutoStartIcon = doc.querySelector(
    `#zotero-prefpane-${config.addonRef}-skillrunner-local-autostart-icon`,
  ) as HTMLElement | null;
  const localRuntimeStatusText = doc.querySelector(
    `#zotero-prefpane-${config.addonRef}-skillrunner-local-status-text`,
  ) as HTMLElement | null;
  const localRuntimeUninstallOptionsDialog = doc.querySelector(
    `#zotero-prefpane-${config.addonRef}-skillrunner-local-uninstall-options-dialog`,
  ) as HTMLElement | null;
  const localRuntimeUninstallOptionClearData = doc.querySelector(
    `#zotero-prefpane-${config.addonRef}-skillrunner-local-uninstall-option-clear-data`,
  ) as HTMLInputElement | null;
  const localRuntimeUninstallOptionClearAgentHome = doc.querySelector(
    `#zotero-prefpane-${config.addonRef}-skillrunner-local-uninstall-option-clear-agent-home`,
  ) as HTMLInputElement | null;
  const localRuntimeUninstallOptionsConfirmButton = doc.querySelector(
    `#zotero-prefpane-${config.addonRef}-skillrunner-local-uninstall-options-confirm`,
  ) as XUL.Button | null;
  const localRuntimeUninstallOptionsCancelButton = doc.querySelector(
    `#zotero-prefpane-${config.addonRef}-skillrunner-local-uninstall-options-cancel`,
  ) as XUL.Button | null;
  const localRuntimeProgressRow = doc.querySelector(
    `#zotero-prefpane-${config.addonRef}-skillrunner-local-progress-row`,
  ) as HTMLElement | null;
  const localRuntimeProgressmeter = doc.querySelector(
    `#zotero-prefpane-${config.addonRef}-skillrunner-local-progressmeter`,
  ) as (HTMLElement & { value?: string | number }) | null;
  const localRuntimeProgressText = doc.querySelector(
    `#zotero-prefpane-${config.addonRef}-skillrunner-local-progress-text`,
  ) as HTMLElement | null;

  const runtimeActionButtons = [
    localRuntimeDeployButton,
    localRuntimeStopButton,
    localRuntimeUninstallButton,
    localRuntimeOpenManagementButton,
    localRuntimeOpenSkillsFolderButton,
    localRuntimeRefreshModelCacheButton,
  ].filter(Boolean) as XUL.Button[];

  const setButtonDisabled = (button: XUL.Button | null, disabled: boolean) => {
    if (!button) {
      return;
    }
    if (disabled) {
      button.setAttribute("disabled", "true");
      return;
    }
    if (
      typeof (button as { removeAttribute?: (name: string) => void })
        .removeAttribute === "function"
    ) {
      (button as { removeAttribute: (name: string) => void }).removeAttribute(
        "disabled",
      );
    } else {
      button.setAttribute("disabled", "false");
    }
  };

  const setButtonHidden = (button: XUL.Button | null, hidden: boolean) => {
    if (!button) {
      return;
    }
    if (hidden) {
      button.setAttribute("hidden", "true");
      return;
    }
    if (
      typeof (button as { removeAttribute?: (name: string) => void })
        .removeAttribute === "function"
    ) {
      (button as { removeAttribute: (name: string) => void }).removeAttribute(
        "hidden",
      );
      return;
    }
    button.setAttribute("hidden", "false");
  };

  const setRuntimeActionButtonsDisabled = (disabled: boolean) => {
    for (const button of runtimeActionButtons) {
      setButtonDisabled(button, disabled);
    }
  };
  const debugModeEnabled = isDebugModeEnabled();
  setButtonHidden(localRuntimeOpenDebugConsoleButton, !debugModeEnabled);

  let lastRuntimeDataRoot = "";

  const formatBytes = (bytesRaw: unknown) => {
    const bytes = Math.max(0, Number(bytesRaw || 0) || 0);
    if (bytes < 1024) {
      return `${bytes} B`;
    }
    const units = ["KB", "MB", "GB", "TB"];
    let value = bytes / 1024;
    let index = 0;
    while (value >= 1024 && index < units.length - 1) {
      value /= 1024;
      index += 1;
    }
    return `${value.toFixed(value >= 10 ? 1 : 2)} ${units[index]}`;
  };

  const renderRuntimeDataUsage = (snapshot: any) => {
    const root = String(snapshot?.root || "").trim();
    lastRuntimeDataRoot = root;
    if (runtimeDataRoot) {
      runtimeDataRoot.textContent = root || "-";
    }
    if (runtimeDataSummary) {
      const total = formatBytes(snapshot?.totalBytes);
      const scannedAt = String(snapshot?.scannedAt || "").trim();
      runtimeDataSummary.textContent = `${getString("pref-runtime-data-summary" as any)} ${total}${scannedAt ? ` · ${scannedAt}` : ""}`;
    }
    if (!runtimeDataCategories) {
      return;
    }
    runtimeDataCategories.textContent = "";
    const categories = Array.isArray(snapshot?.categories)
      ? snapshot.categories
      : [];
    for (const category of categories) {
      const id = String(category?.category || "").trim();
      const label = String(category?.label || id || "-").trim();
      const path = String(category?.path || "").trim();
      const rowLabel = doc.createElement("span");
      rowLabel.className = "zs-runtime-data-category";
      rowLabel.textContent = label;
      if (path) {
        rowLabel.setAttribute("title", path);
      }
      const rowSize = doc.createElement("span");
      rowSize.className = "zs-runtime-data-size";
      rowSize.textContent = formatBytes(category?.bytes);
      const action = doc.createElement("button") as unknown as XUL.Button;
      action.textContent = getString("pref-runtime-data-cleanup" as any);
      if (category?.cleanable !== true || !id) {
        action.setAttribute("disabled", "true");
      } else {
        action.addEventListener("command", () => {
          void cleanupRuntimeDataCategory(id, label, rowSize.textContent || "");
        });
      }
      runtimeDataCategories.appendChild(rowLabel);
      runtimeDataCategories.appendChild(rowSize);
      runtimeDataCategories.appendChild(action);
    }
  };

  const refreshRuntimeDataUsage = async () => {
    try {
      if (runtimeDataSummary) {
        runtimeDataSummary.textContent = getString(
          "pref-runtime-data-scanning" as any,
        );
      }
      const snapshot = await addon.hooks.onPrefsEvent(
        "scanRuntimePersistenceUsage",
        {
          window: addon.data.prefs?.window,
        },
      );
      renderRuntimeDataUsage(snapshot);
    } catch (error) {
      if (runtimeDataSummary) {
        runtimeDataSummary.textContent = `${getString("pref-runtime-data-failed" as any)} ${String(error)}`;
      }
    }
  };

  const cleanupRuntimeDataCategory = async (
    category: string,
    label: string,
    sizeText: string,
  ) => {
    const confirmed = confirmWithWindow(
      `${getString("pref-runtime-data-cleanup-confirm" as any)}\n\n${label}: ${sizeText}`,
    );
    if (!confirmed) {
      return;
    }
    if (runtimeDataSummary) {
      runtimeDataSummary.textContent = getString(
        "pref-runtime-data-cleaning" as any,
      );
    }
    try {
      const result = await addon.hooks.onPrefsEvent(
        "cleanupRuntimePersistenceCategory",
        {
          window: addon.data.prefs?.window,
          category,
        },
      );
      const usage =
        (result as { usage?: unknown } | null | undefined)?.usage || result;
      renderRuntimeDataUsage(usage);
    } catch (error) {
      if (runtimeDataSummary) {
        runtimeDataSummary.textContent = `${getString("pref-runtime-data-failed" as any)} ${String(error)}`;
      }
    }
  };

  const setLocalRuntimeStatusText = (text: string) => {
    if (!localRuntimeStatusText) {
      return;
    }
    localRuntimeStatusText.textContent = text;
  };

  const setProgressVisible = (visible: boolean) => {
    if (!localRuntimeProgressRow) {
      return;
    }
    if (visible) {
      localRuntimeProgressRow.classList.add("is-visible");
      return;
    }
    localRuntimeProgressRow.classList.remove("is-visible");
  };

  const getProgressStageLabel = (stage: string, fallbackLabel: string) => {
    const normalized = String(stage || "")
      .trim()
      .toLowerCase();
    const labelKeyByStage: Record<string, string> = {
      "deploy-release-assets-probe":
        "pref-skillrunner-local-progress-deploy-step-1",
      "deploy-release-download-checksum":
        "pref-skillrunner-local-progress-deploy-step-2",
      "deploy-release-extract": "pref-skillrunner-local-progress-deploy-step-3",
      "deploy-bootstrap": "pref-skillrunner-local-progress-deploy-step-4",
      "deploy-post-bootstrap": "pref-skillrunner-local-progress-deploy-step-5",
      "uninstall-down": "pref-skillrunner-local-progress-uninstall-step-down",
      "uninstall-profile":
        "pref-skillrunner-local-progress-uninstall-step-profile",
    };
    if (normalized.startsWith("uninstall-delete-")) {
      return getString(
        "pref-skillrunner-local-progress-uninstall-step-delete" as any,
      );
    }
    const key = labelKeyByStage[normalized];
    if (key) {
      return getString(key as any);
    }
    return String(fallbackLabel || "").trim();
  };

  const updateLocalRuntimeProgressFromDetails = (
    details: Record<string, unknown> | null,
  ) => {
    const progress = (details?.actionProgress || null) as {
      action?: unknown;
      current?: unknown;
      total?: unknown;
      percent?: unknown;
      stage?: unknown;
      label?: unknown;
    } | null;
    if (!progress || !progress.action) {
      setProgressVisible(false);
      if (localRuntimeProgressmeter) {
        localRuntimeProgressmeter.style.width = "0%";
      }
      if (localRuntimeProgressText) {
        localRuntimeProgressText.textContent = "";
      }
      return;
    }
    const percentRaw = Number(progress.percent || 0);
    const percent = Number.isFinite(percentRaw)
      ? Math.max(0, Math.min(100, Math.floor(percentRaw)))
      : 0;
    const current = Number(progress.current || 0);
    const total = Number(progress.total || 0);
    const stageLabel = getProgressStageLabel(
      String(progress.stage || ""),
      String(progress.label || ""),
    );
    const actionLabel =
      String(progress.action || "")
        .trim()
        .toLowerCase() === "uninstall"
        ? getString("pref-skillrunner-local-progress-uninstall-title" as any)
        : getString("pref-skillrunner-local-progress-deploy-title" as any);
    if (localRuntimeProgressmeter) {
      localRuntimeProgressmeter.style.width = String(percent) + "%";
    }
    if (localRuntimeProgressText) {
      localRuntimeProgressText.textContent =
        `${actionLabel} ${current}/${total} · ${stageLabel}`.trim();
    }
    setProgressVisible(true);
  };

  const formatLocalRuntimeStatusMessage = (result: unknown) => {
    const typed = (result || {}) as {
      ok?: unknown;
      message?: unknown;
      conflict?: unknown;
      stage?: unknown;
    };
    const runtimeStageMessageKeyByStage: Record<string, string> = {
      "oneclick-plan-start":
        "pref-skillrunner-local-status-stage-oneclick-plan-start",
      "oneclick-plan-deploy":
        "pref-skillrunner-local-status-stage-oneclick-plan-deploy",
      "oneclick-preflight":
        "pref-skillrunner-local-status-stage-oneclick-preflight-failed",
      "oneclick-preflight-failed-fallback-deploy":
        "pref-skillrunner-local-status-stage-oneclick-preflight-failed",
      "oneclick-start-complete":
        "pref-skillrunner-local-status-stage-oneclick-start-complete",
      "oneclick-start-missing-runtime":
        "pref-skillrunner-local-status-stage-oneclick-start-missing-runtime",
      "oneclick-status":
        "pref-skillrunner-local-status-stage-oneclick-status-failed",
      "oneclick-configure-profile":
        "pref-skillrunner-local-status-stage-oneclick-configure-profile-failed",
      "oneclick-lease":
        "pref-skillrunner-local-status-stage-oneclick-lease-failed",
      "deploy-complete": "pref-skillrunner-local-status-stage-deploy-complete",
      "local-runtime-deploy-succeeded":
        "pref-skillrunner-local-status-stage-deploy-complete",
      "deploy-release-assets-probe":
        "pref-skillrunner-local-status-stage-deploy-release-assets-probe-failed",
      "deploy-release-install":
        "pref-skillrunner-local-status-stage-deploy-release-install-failed",
      "deploy-bootstrap":
        "pref-skillrunner-local-status-stage-deploy-bootstrap-failed",
      "deploy-bootstrap-report":
        "pref-skillrunner-local-status-stage-deploy-bootstrap-report-failed",
      "deploy-post-preflight-failed":
        "pref-skillrunner-local-status-stage-post-deploy-preflight-failed",
      "post-deploy-preflight":
        "pref-skillrunner-local-status-stage-post-deploy-preflight-failed",
      "start-complete": "pref-skillrunner-local-status-stage-start-complete",
      "start-backend":
        "pref-skillrunner-local-status-stage-start-backend-failed",
      "start-ensure": "pref-skillrunner-local-status-stage-start-ensure-failed",
      "stop-complete": "pref-skillrunner-local-status-stage-stop-complete",
      "stop-down": "pref-skillrunner-local-status-stage-stop-down-failed",
      "stop-status-running":
        "pref-skillrunner-local-status-stage-stop-status-running",
      "stop-status": "pref-skillrunner-local-status-stage-stop-status-failed",
      stop: "pref-skillrunner-local-status-stage-stop-failed",
      "uninstall-preview":
        "pref-skillrunner-local-status-stage-uninstall-preview",
      "uninstall-complete":
        "pref-skillrunner-local-status-stage-uninstall-complete",
      "uninstall-local-root":
        "pref-skillrunner-local-status-stage-uninstall-local-root-failed",
      "uninstall-down":
        "pref-skillrunner-local-status-stage-uninstall-down-failed",
      "uninstall-delete":
        "pref-skillrunner-local-status-stage-uninstall-delete-failed",
      "uninstall-configure-profile":
        "pref-skillrunner-local-status-stage-uninstall-profile-failed",
      "refresh-managed-model-cache":
        "pref-skillrunner-local-status-stage-refresh-model-cache",
      "open-managed-backend-page":
        "pref-skillrunner-local-status-stage-open-managed-backend-page",
      "open-managed-skills-folder":
        "pref-skillrunner-local-status-stage-open-managed-skills-folder",
    };
    const normalizedStage = String(typed.stage || "")
      .trim()
      .toLowerCase();
    let message = "";
    if (normalizedStage.startsWith("uninstall-delete-")) {
      message = getString(
        "pref-skillrunner-local-status-stage-uninstall-delete-failed" as any,
      );
    } else {
      const stageKey = runtimeStageMessageKeyByStage[normalizedStage];
      if (stageKey) {
        message = getString(stageKey as any);
      }
    }
    if (!message) {
      message = String(typed.message || "").trim();
    }
    if (!message) {
      message = getString(
        "pref-skillrunner-local-status-result-unknown" as any,
      );
    }
    if (typed.conflict === true) {
      return `${getString("pref-skillrunner-local-status-conflict-prefix" as any)} ${message}`;
    }
    if (typed.ok === true) {
      return `${getString("pref-skillrunner-local-status-ok-prefix" as any)} ${message}`;
    }
    return `${getString("pref-skillrunner-local-status-failed-prefix" as any)} ${message}`;
  };

  const getRuntimeStateLabel = (value: unknown, hasRuntimeInfo: boolean) => {
    const normalized = String(value || "")
      .trim()
      .toLowerCase();
    if (!hasRuntimeInfo) {
      return getString(
        "pref-skillrunner-local-runtime-state-no-runtime" as any,
      );
    }
    if (normalized === "running") {
      return getString("pref-skillrunner-local-runtime-state-running" as any);
    }
    if (normalized === "starting") {
      return getString(
        "pref-skillrunner-local-runtime-state-reconciling" as any,
      );
    }
    if (normalized === "stopped") {
      return getString("pref-skillrunner-local-runtime-state-stopped" as any);
    }
    if (
      normalized === "reconciling_after_heartbeat_fail" ||
      normalized === "degraded"
    ) {
      return getString(
        "pref-skillrunner-local-runtime-state-reconciling" as any,
      );
    }
    return getString("pref-skillrunner-local-runtime-state-unknown" as any);
  };

  const updateLocalRuntimeIndicatorsFromResult = (result: unknown) => {
    const typed = (result || {}) as {
      details?: Record<string, unknown>;
    };
    const details = typed.details || {};
    const runtimeState = String(details.runtimeState || "")
      .trim()
      .toLowerCase();
    const hasRuntimeInfo = details.hasRuntimeInfo === true;
    const autoStartEnabled = details.autoStartPaused === false;
    let runtimeClass = "is-gray";
    if (hasRuntimeInfo) {
      if (runtimeState === "running") {
        runtimeClass = "is-green";
      } else if (runtimeState === "reconciling_after_heartbeat_fail") {
        runtimeClass = "is-orange";
      } else if (runtimeState === "stopped") {
        runtimeClass = "is-red";
      } else if (runtimeState === "starting" || runtimeState === "degraded") {
        runtimeClass = "is-orange";
      } else {
        runtimeClass = "is-red";
      }
    }
    if (localRuntimeLed) {
      localRuntimeLed.className = `zs-runtime-led ${runtimeClass}`;
      localRuntimeLed.setAttribute(
        "title",
        getRuntimeStateLabel(details.runtimeState, hasRuntimeInfo),
      );
    }
    if (localRuntimeAutoStartIcon) {
      localRuntimeAutoStartIcon.className = `zs-autostart-icon ${autoStartEnabled ? "is-green" : "is-red"}`;
      localRuntimeAutoStartIcon.setAttribute(
        "title",
        autoStartEnabled
          ? getString("pref-skillrunner-local-auto-start-on" as any)
          : getString("pref-skillrunner-local-auto-start-off" as any),
      );
    }
    updateLocalRuntimeProgressFromDetails(details);
    return details;
  };

  const applyRuntimeButtonGate = (details: Record<string, unknown> | null) => {
    const runtimeState = String(details?.runtimeState || "")
      .trim()
      .toLowerCase();
    const hasRuntimeInfo = details?.hasRuntimeInfo === true;
    const inFlightAction = String(details?.inFlightAction || "").trim();
    const actionBusy = inFlightAction.length > 0 || runtimeState === "starting";
    const running = runtimeState === "running";

    setButtonDisabled(localRuntimeDeployButton, actionBusy || running);
    setButtonDisabled(localRuntimeStopButton, actionBusy || !running);
    setButtonDisabled(
      localRuntimeUninstallButton,
      actionBusy || running || !hasRuntimeInfo,
    );
    setButtonDisabled(localRuntimeOpenManagementButton, actionBusy || !running);
    setButtonDisabled(
      localRuntimeOpenSkillsFolderButton,
      actionBusy || !running,
    );
    setButtonDisabled(
      localRuntimeRefreshModelCacheButton,
      actionBusy || !running,
    );
    setButtonDisabled(localRuntimeOpenDebugConsoleButton, !debugModeEnabled);
  };

  const refreshLocalRuntimeStateSummary = async () => {
    try {
      const state = await addon.hooks.onPrefsEvent(
        "stateSkillRunnerLocalRuntime",
        {
          window: addon.data.prefs?.window,
        },
      );
      const details = updateLocalRuntimeIndicatorsFromResult(state);
      applyRuntimeButtonGate(details);
      return details;
    } catch {
      updateLocalRuntimeIndicatorsFromResult({
        details: {
          runtimeState: "unknown",
          hasRuntimeInfo: false,
          autoStartPaused: true,
        },
      });
      applyRuntimeButtonGate(null);
      updateLocalRuntimeProgressFromDetails(null);
      return null;
    }
  };
  unbindManagedLocalRuntimeStateChange =
    subscribeManagedLocalRuntimeStateChange(() => {
      void refreshLocalRuntimeStateSummary();
    });
  const prefsWindow = addon.data.prefs?.window as
    | (Window & {
        addEventListener?: (
          type: string,
          listener: EventListenerOrEventListenerObject,
          options?: AddEventListenerOptions | boolean,
        ) => void;
      })
    | undefined;
  if (typeof prefsWindow?.addEventListener === "function") {
    prefsWindow.addEventListener(
      "unload",
      () => {
        if (unbindManagedLocalRuntimeStateChange) {
          unbindManagedLocalRuntimeStateChange();
          unbindManagedLocalRuntimeStateChange = null;
        }
      },
      { once: true },
    );
  }

  const runLocalRuntimeAction = async (
    type: string,
    payload?: Record<string, unknown>,
    options?: {
      workingKey?: string;
    },
  ) => {
    setRuntimeActionButtonsDisabled(true);
    const workingKey = String(options?.workingKey || "").trim();
    setLocalRuntimeStatusText(
      getString((workingKey || "pref-skillrunner-local-status-working") as any),
    );
    try {
      const response = await addon.hooks.onPrefsEvent(type, {
        window: addon.data.prefs?.window,
        ...(payload || {}),
      });
      setLocalRuntimeStatusText(formatLocalRuntimeStatusMessage(response));
      await refreshLocalRuntimeStateSummary();
    } catch (error) {
      setLocalRuntimeStatusText(
        `${getString("pref-skillrunner-local-status-failed-prefix" as any)} ${String(error)}`,
      );
      await refreshLocalRuntimeStateSummary();
    }
  };

  const openLocalRuntimeDebugConsole = async () => {
    return addon.hooks.onPrefsEvent("openSkillRunnerLocalDeployDebugConsole", {
      window: addon.data.prefs?.window,
    });
  };

  const confirmWithWindow = (message: string) => {
    const hostWindow = addon.data.prefs?.window as
      | (Window & { confirm?: (text: string) => boolean })
      | undefined;
    if (typeof hostWindow?.confirm === "function") {
      return hostWindow.confirm(message);
    }
    return true;
  };

  const confirmDeployForPlan = (planDetails: Record<string, unknown>) => {
    const layout = (planDetails.installLayout || {}) as {
      paths?: Array<{ path?: unknown; purpose?: unknown }>;
    };
    const pathLines = Array.isArray(layout.paths)
      ? layout.paths
          .map((entry) => {
            const path = String(entry.path || "").trim();
            const purpose = String(entry.purpose || "").trim();
            if (!path) {
              return "";
            }
            return `- ${path}${purpose ? ` (${purpose})` : ""}`;
          })
          .filter(Boolean)
      : [];
    const message = [
      getString("pref-skillrunner-local-deploy-confirm-message" as any),
      "",
      getString("pref-skillrunner-local-deploy-confirm-layout-title" as any),
      ...pathLines,
    ]
      .filter(Boolean)
      .join("\n");
    return confirmWithWindow(message);
  };

  const hideUninstallOptionsDialog = () => {
    if (!localRuntimeUninstallOptionsDialog) {
      return;
    }
    localRuntimeUninstallOptionsDialog.classList.remove("is-visible");
  };

  const showUninstallOptionsDialog = () => {
    if (
      !localRuntimeUninstallOptionsDialog ||
      !localRuntimeUninstallOptionClearData ||
      !localRuntimeUninstallOptionClearAgentHome ||
      !localRuntimeUninstallOptionsConfirmButton ||
      !localRuntimeUninstallOptionsCancelButton
    ) {
      const clearData = confirmWithWindow(
        getString("pref-skillrunner-local-uninstall-option-clear-data" as any),
      );
      const clearAgentHome = confirmWithWindow(
        getString(
          "pref-skillrunner-local-uninstall-option-clear-agent-home" as any,
        ),
      );
      return Promise.resolve({
        clearData,
        clearAgentHome,
      });
    }
    localRuntimeUninstallOptionClearData.checked = false;
    localRuntimeUninstallOptionClearAgentHome.checked = false;
    localRuntimeUninstallOptionsDialog.classList.add("is-visible");
    return new Promise<{
      clearData: boolean;
      clearAgentHome: boolean;
    } | null>((resolve) => {
      const removeListener = (
        target: XUL.Button,
        listener: (event?: unknown) => void,
      ) => {
        const typed = target as unknown as {
          removeEventListener?: (
            type: string,
            listener: (event?: unknown) => void,
          ) => void;
        };
        if (typeof typed.removeEventListener === "function") {
          typed.removeEventListener("command", listener);
        }
      };
      const cleanup = () => {
        removeListener(localRuntimeUninstallOptionsConfirmButton, onConfirm);
        removeListener(localRuntimeUninstallOptionsCancelButton, onCancel);
        hideUninstallOptionsDialog();
      };
      const onConfirm = () => {
        const result = {
          clearData: localRuntimeUninstallOptionClearData.checked === true,
          clearAgentHome:
            localRuntimeUninstallOptionClearAgentHome.checked === true,
        };
        cleanup();
        resolve(result);
      };
      const onCancel = () => {
        cleanup();
        resolve(null);
      };
      localRuntimeUninstallOptionsConfirmButton.addEventListener(
        "command",
        onConfirm,
      );
      localRuntimeUninstallOptionsCancelButton.addEventListener(
        "command",
        onCancel,
      );
    });
  };

  const confirmUninstallPreview = (previewDetails: Record<string, unknown>) => {
    const removableTargets = Array.isArray(previewDetails.removableTargets)
      ? (previewDetails.removableTargets as Array<{
          path?: unknown;
          purpose?: unknown;
        }>)
      : [];
    const preservedTargets = Array.isArray(previewDetails.preservedTargets)
      ? (previewDetails.preservedTargets as Array<{
          path?: unknown;
          purpose?: unknown;
        }>)
      : [];
    const removableLines = removableTargets
      .map((entry) => {
        const path = String(entry.path || "").trim();
        const purpose = String(entry.purpose || "").trim();
        if (!path) {
          return "";
        }
        return `- ${path}${purpose ? ` (${purpose})` : ""}`;
      })
      .filter(Boolean);
    const preservedLines = preservedTargets
      .map((entry) => {
        const path = String(entry.path || "").trim();
        const purpose = String(entry.purpose || "").trim();
        if (!path) {
          return "";
        }
        return `- ${path}${purpose ? ` (${purpose})` : ""}`;
      })
      .filter(Boolean);
    const message = [
      getString(
        "pref-skillrunner-local-uninstall-final-confirm-message" as any,
      ),
      "",
      getString(
        "pref-skillrunner-local-uninstall-final-confirm-remove-title" as any,
      ),
      ...removableLines,
      "",
      getString(
        "pref-skillrunner-local-uninstall-final-confirm-preserve-title" as any,
      ),
      ...preservedLines,
    ]
      .filter((line) => typeof line === "string")
      .join("\n");
    return confirmWithWindow(message);
  };

  const runLocalRuntimeOneclick = async () => {
    setRuntimeActionButtonsDisabled(true);
    setLocalRuntimeStatusText(
      getString("pref-skillrunner-local-status-working" as any),
    );
    try {
      const planResponse = (await addon.hooks.onPrefsEvent(
        "planSkillRunnerLocalRuntimeOneclick",
        {
          window: addon.data.prefs?.window,
        },
      )) as {
        ok?: unknown;
        message?: unknown;
        details?: Record<string, unknown>;
      };
      if (planResponse.ok !== true) {
        setLocalRuntimeStatusText(
          formatLocalRuntimeStatusMessage(planResponse),
        );
        await refreshLocalRuntimeStateSummary();
        return;
      }
      const plannedAction = String(planResponse.details?.plannedAction || "")
        .trim()
        .toLowerCase();
      if (plannedAction === "deploy") {
        const confirmed = confirmDeployForPlan(planResponse.details || {});
        if (!confirmed) {
          setLocalRuntimeStatusText(
            getString("pref-skillrunner-local-status-cancelled" as any),
          );
          await refreshLocalRuntimeStateSummary();
          return;
        }
        setLocalRuntimeStatusText(
          getString("pref-skillrunner-local-status-working-deploy" as any),
        );
      } else {
        setLocalRuntimeStatusText(
          getString("pref-skillrunner-local-status-working-start" as any),
        );
      }
      const response = await addon.hooks.onPrefsEvent(
        "deploySkillRunnerLocalRuntime",
        {
          window: addon.data.prefs?.window,
          forcedBranch: plannedAction === "start" ? "start" : "deploy",
        },
      );
      setLocalRuntimeStatusText(formatLocalRuntimeStatusMessage(response));
      await refreshLocalRuntimeStateSummary();
    } catch (error) {
      setLocalRuntimeStatusText(
        `${getString("pref-skillrunner-local-status-failed-prefix" as any)} ${String(error)}`,
      );
      await refreshLocalRuntimeStateSummary();
    }
  };

  const runLocalRuntimeUninstall = async () => {
    setRuntimeActionButtonsDisabled(true);
    setLocalRuntimeStatusText(
      getString("pref-skillrunner-local-status-working-uninstall" as any),
    );
    try {
      const options = await showUninstallOptionsDialog();
      if (!options) {
        setLocalRuntimeStatusText(
          getString("pref-skillrunner-local-status-cancelled" as any),
        );
        await refreshLocalRuntimeStateSummary();
        return;
      }
      const preview = (await addon.hooks.onPrefsEvent(
        "previewSkillRunnerLocalRuntimeUninstall",
        {
          window: addon.data.prefs?.window,
          clearData: options.clearData,
          clearAgentHome: options.clearAgentHome,
        },
      )) as {
        ok?: unknown;
        message?: unknown;
        details?: Record<string, unknown>;
      };
      if (preview.ok !== true) {
        setLocalRuntimeStatusText(formatLocalRuntimeStatusMessage(preview));
        await refreshLocalRuntimeStateSummary();
        return;
      }
      const confirmed = confirmUninstallPreview(preview.details || {});
      if (!confirmed) {
        setLocalRuntimeStatusText(
          getString("pref-skillrunner-local-status-cancelled" as any),
        );
        await refreshLocalRuntimeStateSummary();
        return;
      }
      const response = await addon.hooks.onPrefsEvent(
        "uninstallSkillRunnerLocalRuntime",
        {
          window: addon.data.prefs?.window,
          clearData: options.clearData,
          clearAgentHome: options.clearAgentHome,
        },
      );
      setLocalRuntimeStatusText(formatLocalRuntimeStatusMessage(response));
      await refreshLocalRuntimeStateSummary();
    } catch (error) {
      setLocalRuntimeStatusText(
        `${getString("pref-skillrunner-local-status-failed-prefix" as any)} ${String(error)}`,
      );
      await refreshLocalRuntimeStateSummary();
    }
  };

  const persistWorkflowDir = (rawValue: string) => {
    const nextValue = rawValue.trim() || getEffectiveWorkflowDir();
    setPref("workflowDir", nextValue);
    if (workflowDirInput) {
      workflowDirInput.value = nextValue;
    }
    return nextValue;
  };

  const persistWorkflowDirFromInput = (options?: {
    fallbackWhenEmpty?: boolean;
  }) => {
    const rawValue = String(workflowDirInput?.value || "");
    const normalized = rawValue.trim();
    if (options?.fallbackWhenEmpty === false) {
      setPref("workflowDir", normalized);
      return normalized;
    }
    return persistWorkflowDir(normalized);
  };

  const formatHostBridgeStatus = (response: unknown) => {
    const result = (response || {}) as {
      ok?: unknown;
      message?: unknown;
      details?: Record<string, unknown>;
    };
    const details = (result.details || {}) as Record<string, unknown>;
    const server = (details.server || details || {}) as Record<string, unknown>;
    const status = String(server.status || "idle").trim() || "idle";
    const bindMode = String(server.bindMode || "loopback").trim() || "loopback";
    const portMode = String(server.portMode || "").trim();
    const pinnedPort = Number(server.pinnedPort || getPref("hostBridgePinnedPort"));
    const recoveryReason = String(server.lastRecoveryReason || "").trim();
    const tokenMasked = String(server.tokenMasked || "").trim();
    const message = String(result.message || "").trim();
    const runtimeDetails = (details.runtime || {}) as Record<string, unknown>;
    const runtimeText =
      result.ok === false
        ? [
            String(runtimeDetails.rootURI || "").trim()
              ? `rootURI=${String(runtimeDetails.rootURI).trim()}`
              : "",
            String(runtimeDetails.resourceURI || "").trim()
              ? `resourceURI=${String(runtimeDetails.resourceURI).trim()}`
              : "",
            String(runtimeDetails.rootPath || "").trim()
              ? `rootPath=${String(runtimeDetails.rootPath).trim()}`
              : "",
          ]
            .filter(Boolean)
            .join(" | ")
        : "";
    const detailsText =
      result.ok === false
        ? [
            Array.isArray(details.checkedPaths) &&
            details.checkedPaths.length > 0
              ? `checkedPaths=${details.checkedPaths.join(" | ")}`
              : "",
            Array.isArray(details.checkedUris) && details.checkedUris.length > 0
              ? `checkedUris=${details.checkedUris.join(" | ")}`
              : "",
            runtimeText ? `runtime=${runtimeText}` : "",
          ]
            .filter(Boolean)
            .join(" · ")
        : "";
    const prefix =
      result.ok === false
        ? getString("pref-skillrunner-local-status-failed-prefix" as any)
        : getString("pref-skillrunner-local-status-ok-prefix" as any);
    if (message) {
      return `${prefix} ${message}${detailsText ? ` (${detailsText})` : ""}`;
    }
    return [
      `status=${status}`,
      `bind=${bindMode}`,
      portMode ? `portMode=${portMode}` : "",
      Number.isInteger(pinnedPort) ? `pinnedPort=${pinnedPort}` : "",
      recoveryReason ? `recovery=${recoveryReason}` : "",
      tokenMasked ? `token=${tokenMasked}` : "",
    ]
      .filter(Boolean)
      .join(" · ");
  };

  const renderHostBridgeState = (response: unknown) => {
    const result = (response || {}) as {
      details?: Record<string, unknown>;
    };
    const details = (result.details || {}) as Record<string, unknown>;
    const server = (details.server || details || {}) as Record<string, unknown>;
    const endpoint = String(server.endpoint || "").trim();
    const hasServerSnapshot =
      Boolean(details.server) ||
      Object.prototype.hasOwnProperty.call(server, "status") ||
      Object.prototype.hasOwnProperty.call(server, "endpoint");
    if (hasServerSnapshot && hostBridgeEndpointText) {
      hostBridgeEndpointText.textContent =
        endpoint || getString("pref-host-bridge-endpoint-empty" as any);
    }
    if (hostBridgeStatusText) {
      hostBridgeStatusText.textContent = formatHostBridgeStatus(response);
    }
    if (hasServerSnapshot && hostBridgeLanCheckbox) {
      hostBridgeLanCheckbox.checked =
        server.lanEnabled === true || getPref("hostBridgeLanEnabled") === true;
    }
    if (hasServerSnapshot && hostBridgePinPortCheckbox) {
      hostBridgePinPortCheckbox.checked =
        server.pinPortEnabled === true ||
        getPref("hostBridgePinPortEnabled") === true;
    }
    if (hasServerSnapshot && hostBridgePinnedPortInput) {
      hostBridgePinnedPortInput.value = String(
        Number(server.pinnedPort || getPref("hostBridgePinnedPort") || 26570),
      );
      hostBridgePinnedPortInput.disabled =
        hostBridgePinPortCheckbox?.checked !== true;
    }
    if (hasServerSnapshot && hostBridgeShowEndpointButton) {
      hostBridgeShowEndpointButton.disabled =
        String(server.status || "").trim() === "running" && Boolean(endpoint);
    }
  };

  const refreshHostBridgeState = async () => {
    try {
      const response = await addon.hooks.onPrefsEvent("stateHostBridge", {
        window: addon.data.prefs?.window,
      });
      renderHostBridgeState(response);
      return response;
    } catch (error) {
      const response = {
        ok: false,
        message: String(error),
        details: {},
      };
      renderHostBridgeState(response);
      return response;
    }
  };

  const pathExists = async (path: string) => {
    const candidate = String(path || "").trim();
    if (!candidate) {
      return false;
    }

    const exists = await runtimeFileExists(candidate);
    return exists;
  };

  const getHomeDir = () => {
    const runtime = globalThis as {
      process?: { env?: Record<string, string | undefined> };
      Services?: { env?: { get?: (key: string) => string } };
    };
    const fromProcess =
      runtime.process?.env?.USERPROFILE || runtime.process?.env?.HOME || "";
    if (fromProcess && fromProcess.trim()) {
      return fromProcess.trim();
    }
    const readEnv = runtime.Services?.env?.get;
    if (typeof readEnv === "function") {
      try {
        const fromServices = readEnv("USERPROFILE") || readEnv("HOME") || "";
        if (fromServices && fromServices.trim()) {
          return fromServices.trim();
        }
      } catch {
        return "";
      }
    }
    return "";
  };

  const resolveWorkflowBrowseStartDir = async (
    preferredCurrentDir?: string,
  ) => {
    const currentWorkflowDir =
      String(preferredCurrentDir || "").trim() ||
      String(workflowDirInput?.value || "").trim() ||
      String(getPref("workflowDir") || "").trim();
    const defaultWorkflowDir = String(getDefaultWorkflowDir() || "").trim();
    const homeDir = getHomeDir();
    const candidates = [currentWorkflowDir, defaultWorkflowDir, homeDir].filter(
      (value, index, array) => Boolean(value) && array.indexOf(value) === index,
    );
    for (const candidate of candidates) {
      if (await pathExists(candidate)) {
        return candidate;
      }
    }
    return currentWorkflowDir || defaultWorkflowDir || homeDir || "";
  };

  if (workflowDirInput) {
    const workflowDir = String(getPref("workflowDir") || "").trim();
    persistWorkflowDir(workflowDir);
    workflowDirInput.addEventListener("input", () => {
      persistWorkflowDirFromInput({
        fallbackWhenEmpty: false,
      });
    });
    workflowDirInput.addEventListener("change", () => {
      persistWorkflowDirFromInput({
        fallbackWhenEmpty: true,
      });
    });
  }

  if (browseWorkflowDirButton) {
    browseWorkflowDirButton.addEventListener("command", () => {
      void (async () => {
        const runtimeToolkit = ((typeof ztoolkit !== "undefined"
          ? ztoolkit
          : undefined) ||
          (
            globalThis as {
              ztoolkit?: {
                FilePicker?: new (
                  title: string,
                  mode: string,
                  filters: [string, string][],
                  suggestion: string,
                  window: Window | undefined,
                  filterMask?: string,
                  directory?: string,
                ) => { open: () => Promise<unknown> };
              };
            }
          ).ztoolkit) as {
          FilePicker?: new (
            title: string,
            mode: string,
            filters: [string, string][],
            suggestion: string,
            window: Window | undefined,
            filterMask?: string,
            directory?: string,
          ) => { open: () => Promise<unknown> };
        } | null;
        if (typeof runtimeToolkit?.FilePicker !== "function") {
          return;
        }
        const currentWorkflowDir = persistWorkflowDirFromInput({
          fallbackWhenEmpty: false,
        });
        const initialDirectory =
          await resolveWorkflowBrowseStartDir(currentWorkflowDir);
        const selectedPath = await new runtimeToolkit.FilePicker(
          getString("pref-workflow-dir" as any),
          "folder",
          [],
          "",
          addon.data.prefs?.window,
          undefined,
          initialDirectory,
        ).open();
        if (typeof selectedPath === "string" && selectedPath.trim()) {
          persistWorkflowDir(selectedPath);
        }
      })();
    });
  }

  if (scanButton) {
    scanButton.addEventListener("command", () => {
      const rawWorkflowDir = workflowDirInput?.value || "";
      const normalizedWorkflowDir = rawWorkflowDir.trim();
      if (workflowDirInput) {
        persistWorkflowDir(normalizedWorkflowDir);
      }
      void addon.hooks.onPrefsEvent("scanWorkflows", {
        window: addon.data.prefs?.window,
        workflowsDir: normalizedWorkflowDir || undefined,
      });
    });
  }

  if (workflowSettingsButton) {
    workflowSettingsButton.addEventListener("command", () => {
      void addon.hooks.onPrefsEvent("openWorkflowSettings", {
        window: addon.data.prefs?.window,
        source: "preferences",
      });
    });
  }

  if (workflowOpenLogsButton) {
    workflowOpenLogsButton.addEventListener("command", () => {
      void addon.hooks.onPrefsEvent("openLogViewer", {
        window: addon.data.prefs?.window,
      });
    });
  }

  if (backendManageButton) {
    backendManageButton.addEventListener("command", () => {
      void addon.hooks.onPrefsEvent("openBackendManager", {
        window: addon.data.prefs?.window,
      });
    });
  }

  if (hostBridgeLanCheckbox) {
    hostBridgeLanCheckbox.checked = getPref("hostBridgeLanEnabled") === true;
    hostBridgeLanCheckbox.addEventListener("change", () => {
      void (async () => {
        const response = await addon.hooks.onPrefsEvent(
          "setHostBridgeLanEnabled",
          {
            window: addon.data.prefs?.window,
            enabled: hostBridgeLanCheckbox.checked === true,
          },
        );
        renderHostBridgeState(response);
      })();
    });
  }

  const persistHostBridgePinPort = () => {
    if (!hostBridgePinPortCheckbox || !hostBridgePinnedPortInput) {
      return;
    }
    const port = Number(hostBridgePinnedPortInput.value || 26570);
    void (async () => {
      const response = await addon.hooks.onPrefsEvent("setHostBridgePinPort", {
        window: addon.data.prefs?.window,
        enabled: hostBridgePinPortCheckbox.checked === true,
        port,
      });
      renderHostBridgeState(response);
    })();
  };

  if (hostBridgePinPortCheckbox) {
    hostBridgePinPortCheckbox.checked =
      getPref("hostBridgePinPortEnabled") === true;
    hostBridgePinPortCheckbox.addEventListener("change", () => {
      if (hostBridgePinnedPortInput) {
        hostBridgePinnedPortInput.disabled =
          hostBridgePinPortCheckbox.checked !== true;
      }
      persistHostBridgePinPort();
    });
  }

  if (hostBridgePinnedPortInput) {
    hostBridgePinnedPortInput.value = String(
      Number(getPref("hostBridgePinnedPort") || 26570),
    );
    hostBridgePinnedPortInput.disabled =
      hostBridgePinPortCheckbox?.checked !== true;
    hostBridgePinnedPortInput.addEventListener("change", () => {
      persistHostBridgePinPort();
    });
  }

  if (hostBridgeShowEndpointButton) {
    hostBridgeShowEndpointButton.addEventListener("command", () => {
      void (async () => {
        const response = await addon.hooks.onPrefsEvent(
          "showHostBridgeEndpoint",
          {
            window: addon.data.prefs?.window,
          },
        );
        renderHostBridgeState(response);
      })();
    });
  }

  if (hostBridgeRotateTokenButton) {
    hostBridgeRotateTokenButton.addEventListener("command", () => {
      void (async () => {
        const response = await addon.hooks.onPrefsEvent(
          "rotateHostBridgeToken",
          {
            window: addon.data.prefs?.window,
          },
        );
        renderHostBridgeState(response);
      })();
    });
  }

  if (hostBridgeInstallCliButton) {
    hostBridgeInstallCliButton.addEventListener("command", () => {
      void (async () => {
        const response = await addon.hooks.onPrefsEvent(
          "installHostBridgeCli",
          {
            window: addon.data.prefs?.window,
          },
        );
        renderHostBridgeState(response);
      })();
    });
  }

  if (
    hostBridgeEndpointText ||
    hostBridgeStatusText ||
    hostBridgeLanCheckbox ||
    hostBridgePinPortCheckbox ||
    hostBridgePinnedPortInput
  ) {
    void refreshHostBridgeState();
  }

  if (runtimeDataRescanButton) {
    runtimeDataRescanButton.addEventListener("command", () => {
      void refreshRuntimeDataUsage();
    });
  }

  if (runtimeDataCopyRootButton) {
    runtimeDataCopyRootButton.addEventListener("command", () => {
      const text = lastRuntimeDataRoot;
      const nav = (addon.data.prefs?.window.navigator ||
        globalThis.navigator) as
        | { clipboard?: { writeText?: (text: string) => Promise<void> } }
        | undefined;
      if (text && typeof nav?.clipboard?.writeText === "function") {
        void nav.clipboard.writeText(text);
      }
    });
  }

  if (runtimeDataOpenRootButton) {
    runtimeDataOpenRootButton.addEventListener("command", () => {
      void addon.hooks.onPrefsEvent("openRuntimePersistenceRoot", {
        window: addon.data.prefs?.window,
      });
    });
  }

  if (runtimeDataRoot || runtimeDataSummary || runtimeDataCategories) {
    void refreshRuntimeDataUsage();
  }

  if (localRuntimeStatusText) {
    setLocalRuntimeStatusText(
      getString("pref-skillrunner-local-status-idle" as any),
    );
  }
  updateLocalRuntimeIndicatorsFromResult({
    details: {
      runtimeState: "unknown",
      hasRuntimeInfo: false,
      autoStartPaused: true,
    },
  });
  void refreshLocalRuntimeStateSummary();

  if (localRuntimeDeployButton) {
    localRuntimeDeployButton.addEventListener("command", () => {
      void runLocalRuntimeOneclick();
    });
  }

  if (localRuntimeStopButton) {
    localRuntimeStopButton.addEventListener("command", () => {
      void runLocalRuntimeAction("stopSkillRunnerLocalRuntime", undefined, {
        workingKey: "pref-skillrunner-local-status-working-stop",
      });
    });
  }

  if (localRuntimeUninstallButton) {
    localRuntimeUninstallButton.addEventListener("command", () => {
      void runLocalRuntimeUninstall();
    });
  }

  if (localRuntimeOpenDebugConsoleButton && debugModeEnabled) {
    localRuntimeOpenDebugConsoleButton.addEventListener("command", () => {
      void (async () => {
        try {
          await openLocalRuntimeDebugConsole();
        } catch {
          // keep debug-console action silent in status text to avoid polluting runtime action feedback
        } finally {
          await refreshLocalRuntimeStateSummary();
        }
      })();
    });
  }

  if (localRuntimeOpenManagementButton) {
    localRuntimeOpenManagementButton.addEventListener("command", () => {
      void runLocalRuntimeAction("openSkillRunnerManagedBackendPage");
    });
  }

  if (localRuntimeOpenSkillsFolderButton) {
    localRuntimeOpenSkillsFolderButton.addEventListener("command", () => {
      void runLocalRuntimeAction("openSkillRunnerManagedSkillsFolder");
    });
  }

  if (localRuntimeRefreshModelCacheButton) {
    localRuntimeRefreshModelCacheButton.addEventListener("command", () => {
      void runLocalRuntimeAction("refreshSkillRunnerManagedModelCache");
    });
  }
}
