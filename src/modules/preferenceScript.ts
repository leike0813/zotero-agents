import { config } from "../../package.json";
import { getPref, setPref } from "../utils/prefs";
import {
  getDefaultSkillDirForWorkflowDir,
  getDefaultWorkflowDir,
  getEffectiveWorkflowDir,
} from "./workflowRuntime";
import { getString } from "../utils/locale";
import { isDebugModeEnabled } from "./debugMode";
import { subscribeManagedLocalRuntimeStateChange } from "./skillRunnerLocalRuntimeManager";
import { runtimeFileExists } from "../utils/runtimeCompatibility";

let unbindManagedLocalRuntimeStateChange: (() => void) | null = null;
const SYNTHESIS_DB_RESET_CONFIRMATION_TEXT = "RESET SYNTHESIS DATABASE";

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
  const skillDirInput = doc.querySelector(
    `#zotero-prefpane-${config.addonRef}-skill-dir`,
  ) as HTMLInputElement | null;
  const browseWorkflowDirButton = doc.querySelector(
    `#zotero-prefpane-${config.addonRef}-workflow-browse`,
  ) as XUL.Button | null;
  const browseSkillDirButton = doc.querySelector(
    `#zotero-prefpane-${config.addonRef}-skill-browse`,
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
  const collectSkillRunFeedbackCheckbox = doc.querySelector(
    `#zotero-prefpane-${config.addonRef}-collect-skill-run-feedback`,
  ) as HTMLInputElement | null;
  const backendManageButton = doc.querySelector(
    `#zotero-prefpane-${config.addonRef}-backend-manage`,
  ) as XUL.Button | null;
  const webDavSyncEnabledCheckbox = doc.querySelector(
    `#zotero-prefpane-${config.addonRef}-webdav-sync-enabled`,
  ) as HTMLInputElement | null;
  const webDavSyncBaseUrlInput = doc.querySelector(
    `#zotero-prefpane-${config.addonRef}-webdav-sync-base-url`,
  ) as HTMLInputElement | null;
  const webDavSyncRemotePathInput = doc.querySelector(
    `#zotero-prefpane-${config.addonRef}-webdav-sync-remote-path`,
  ) as HTMLInputElement | null;
  const webDavSyncUsernameInput = doc.querySelector(
    `#zotero-prefpane-${config.addonRef}-webdav-sync-username`,
  ) as HTMLInputElement | null;
  const webDavSyncAutoSyncCheckbox = doc.querySelector(
    `#zotero-prefpane-${config.addonRef}-webdav-sync-auto-sync`,
  ) as HTMLInputElement | null;
  const webDavSyncAutoRetryCheckbox = doc.querySelector(
    `#zotero-prefpane-${config.addonRef}-webdav-sync-auto-retry`,
  ) as HTMLInputElement | null;
  const webDavSyncCredentialInput = doc.querySelector(
    `#zotero-prefpane-${config.addonRef}-webdav-sync-credential`,
  ) as HTMLInputElement | null;
  const webDavSyncSaveCredentialButton = doc.querySelector(
    `#zotero-prefpane-${config.addonRef}-webdav-sync-save-credential`,
  ) as XUL.Button | null;
  const webDavSyncClearCredentialButton = doc.querySelector(
    `#zotero-prefpane-${config.addonRef}-webdav-sync-clear-credential`,
  ) as XUL.Button | null;
  const webDavSyncSaveButton = doc.querySelector(
    `#zotero-prefpane-${config.addonRef}-webdav-sync-save`,
  ) as XUL.Button | null;
  const webDavSyncTestButton = doc.querySelector(
    `#zotero-prefpane-${config.addonRef}-webdav-sync-test`,
  ) as XUL.Button | null;
  const webDavSyncStatusText = doc.querySelector(
    `#zotero-prefpane-${config.addonRef}-webdav-sync-status`,
  ) as HTMLElement | null;
  const hostBridgeLanCheckbox = doc.querySelector(
    `#zotero-prefpane-${config.addonRef}-host-bridge-lan-enabled`,
  ) as HTMLInputElement | null;
  const mcpServerEnabledCheckbox = doc.querySelector(
    `#zotero-prefpane-${config.addonRef}-mcp-server-enabled`,
  ) as HTMLInputElement | null;
  const hostBridgeDisableWriteApprovalCheckbox = doc.querySelector(
    `#zotero-prefpane-${config.addonRef}-host-bridge-disable-write-approval`,
  ) as HTMLInputElement | null;
  const mcpServerStatusText = doc.querySelector(
    `#zotero-prefpane-${config.addonRef}-mcp-server-status`,
  ) as HTMLElement | null;
  const hostBridgePinPortCheckbox = doc.querySelector(
    `#zotero-prefpane-${config.addonRef}-host-bridge-pin-port-enabled`,
  ) as HTMLInputElement | null;
  const hostBridgePinnedPortInput = doc.querySelector(
    `#zotero-prefpane-${config.addonRef}-host-bridge-pinned-port`,
  ) as HTMLInputElement | null;
  const hostBridgeAdvertisedHostInput = doc.querySelector(
    `#zotero-prefpane-${config.addonRef}-host-bridge-advertised-host`,
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
  const hostBridgeRotateMasterTokenButton = doc.querySelector(
    `#zotero-prefpane-${config.addonRef}-host-bridge-rotate-master-token`,
  ) as XUL.Button | null;
  const hostBridgeCopyMasterTokenButton = doc.querySelector(
    `#zotero-prefpane-${config.addonRef}-host-bridge-copy-master-token`,
  ) as XUL.Button | null;
  const hostBridgeCopyRemoteProfileButton = doc.querySelector(
    `#zotero-prefpane-${config.addonRef}-host-bridge-copy-remote-profile`,
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
  const runtimeDataIssuesToggleButton = doc.querySelector(
    `#zotero-prefpane-${config.addonRef}-runtime-data-toggle-issues`,
  ) as XUL.Button | null;
  const runtimeDataIssuesPanel = doc.querySelector(
    `#zotero-prefpane-${config.addonRef}-runtime-data-issues-panel`,
  ) as HTMLElement | null;
  const runtimeDataStateDbInfo = doc.querySelector(
    `#zotero-prefpane-${config.addonRef}-runtime-data-state-db-info`,
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
  const synthesisDbResetButton = doc.querySelector(
    `#zotero-prefpane-${config.addonRef}-synthesis-db-reset`,
  ) as XUL.Button | null;
  const synthesisDbResetStatus = doc.querySelector(
    `#zotero-prefpane-${config.addonRef}-synthesis-db-reset-status`,
  ) as HTMLElement | null;

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
  let runtimeDataIssuesExpanded = false;
  let lastRuntimeDataSnapshot: any = null;

  const clearChildren = (
    element: {
      firstChild?: Node | null;
      removeChild?: (child: Node) => unknown;
    } | null,
  ) => {
    if (!element?.removeChild) {
      return;
    }
    while (element.firstChild) {
      element.removeChild(element.firstChild);
    }
  };

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

  const setRuntimeDataIssuesExpanded = (expanded: boolean) => {
    runtimeDataIssuesExpanded = expanded;
    if (lastRuntimeDataSnapshot) {
      renderRuntimeDataUsage(lastRuntimeDataSnapshot);
    } else {
      renderRuntimeDataUsage(null);
    }
  };

  const bindDynamicButtonAction = (
    button: XUL.Button,
    onCommand: () => void,
  ) => {
    let handling = false;
    const handler = (event?: Event) => {
      event?.preventDefault?.();
      event?.stopPropagation?.();
      if (handling) {
        return;
      }
      handling = true;
      try {
        onCommand();
      } finally {
        setTimeout(() => {
          handling = false;
        }, 0);
      }
    };
    button.addEventListener("click", handler as EventListener);
    button.addEventListener("command", handler as EventListener);
  };

  const runtimeDataCategoryOrder = [
    "logs",
    "skillrunner-ledger",
    "acp-conversations",
    "acp-skill-runs",
    "workflow-products",
    "cache",
    "tmp",
  ];

  const runtimeDataCategoryLabels: Record<string, string> = {
    logs: "Runtime logs",
    "skillrunner-ledger": "SkillRunner local ledger",
    "acp-conversations": "ACP conversations",
    "acp-skill-runs": "ACP skill runs",
    "workflow-products": "Workflow products",
    cache: "Cache",
    tmp: "Temporary files",
  };

  let runtimeDataScanState: "idle" | "scanning" | "ready" | "failed" = "idle";
  let runtimeDataRefreshPromise: Promise<void> | null = null;

  const formatRuntimeDataDetail = (category: any, scanned: boolean) => {
    if (!scanned) {
      return getString("pref-runtime-data-not-scanned" as any);
    }
    const bytesText = formatBytes(category?.bytes);
    const recordCount = Number(category?.recordCount || 0);
    if (recordCount > 0) {
      return `${bytesText} · ${recordCount} ${getString(
        (recordCount === 1
          ? "pref-runtime-data-record"
          : "pref-runtime-data-records") as any,
      )}`;
    }
    return bytesText;
  };

  const isRuntimeCategoryCleanable = (category: any, scanned: boolean) => {
    if (!scanned || runtimeDataScanState === "scanning") {
      return false;
    }
    if (category?.cleanable !== true) {
      return false;
    }
    const bytes = Number(category?.bytes || 0);
    const itemCount = Number(category?.itemCount || 0);
    const recordCount = Number(category?.recordCount || 0);
    return (
      category?.exists === true || bytes > 0 || itemCount > 0 || recordCount > 0
    );
  };

  const renderRuntimeDataIssues = (integrity: any) => {
    const issues = Array.isArray(integrity?.issues) ? integrity.issues : [];
    const issueCount = Number(integrity?.issueCount ?? issues.length ?? 0) || 0;
    if (issueCount <= 0) {
      runtimeDataIssuesExpanded = false;
    }
    if (runtimeDataIssuesToggleButton) {
      runtimeDataIssuesToggleButton.textContent = getString(
        (runtimeDataIssuesExpanded
          ? "pref-runtime-data-hide-issues"
          : "pref-runtime-data-show-issues") as any,
      );
      runtimeDataIssuesToggleButton.setAttribute(
        "aria-expanded",
        runtimeDataIssuesExpanded ? "true" : "false",
      );
      if (issueCount <= 0) {
        runtimeDataIssuesToggleButton.setAttribute("disabled", "true");
      } else {
        runtimeDataIssuesToggleButton.removeAttribute("disabled");
      }
    }
    if (!runtimeDataIssuesPanel) {
      return;
    }
    clearChildren(runtimeDataIssuesPanel);
    runtimeDataIssuesPanel.textContent = "";
    if (!runtimeDataIssuesExpanded) {
      runtimeDataIssuesPanel.classList.remove("is-visible");
      return;
    }
    runtimeDataIssuesPanel.classList.add("is-visible");
    if (issues.length === 0) {
      const empty = doc.createElement("div");
      empty.className = "zs-runtime-issue-empty";
      empty.textContent = getString("pref-runtime-data-no-issues" as any);
      runtimeDataIssuesPanel.appendChild(empty);
      return;
    }
    const issueGrid = doc.createElement("div");
    issueGrid.className = "zs-runtime-issues-grid";
    runtimeDataIssuesPanel.appendChild(issueGrid);
    const appendIssueRow = (
      label: string,
      detail: string,
      actionLabel: string,
      enabled: boolean,
      onCommand?: () => void,
      title?: string,
    ) => {
      const rowLabel = doc.createElement("span");
      rowLabel.className = "zs-runtime-data-category";
      rowLabel.textContent = label;
      if (title) {
        rowLabel.setAttribute("title", title);
      }
      const rowDetail = doc.createElement("span");
      rowDetail.className = "zs-runtime-data-path";
      rowDetail.textContent = detail;
      if (title) {
        rowDetail.setAttribute("title", title);
      }
      const action = doc.createElement("button") as unknown as XUL.Button;
      action.textContent = actionLabel;
      if (!enabled || !onCommand) {
        action.setAttribute("disabled", "true");
      } else {
        bindDynamicButtonAction(action, onCommand);
      }
      issueGrid.appendChild(rowLabel);
      issueGrid.appendChild(rowDetail);
      issueGrid.appendChild(action);
    };
    for (const issue of issues) {
      const issueId = String(issue?.id || "").trim();
      const type = String(issue?.type || "issue").trim();
      const severity = String(issue?.severity || "info").trim();
      const relativePath = String(
        issue?.relativePath || issue?.owner || issue?.path || "",
      ).trim();
      const reason = String(issue?.reason || "").trim();
      const label = `${severity}: ${type}`;
      appendIssueRow(
        label,
        relativePath || "-",
        getString("pref-runtime-data-cleanup" as any),
        issue?.eligibleForCleanup === true && Boolean(issueId),
        () => {
          void cleanupPersistenceGovernanceIssue(
            issueId,
            label,
            relativePath || reason || issueId,
          );
        },
        reason,
      );
    }
  };

  const renderRuntimeDataUsage = (snapshot: any) => {
    lastRuntimeDataSnapshot = snapshot;
    const usage = snapshot?.usage?.categories ? snapshot.usage : snapshot;
    const integrity = snapshot?.integrity || snapshot?.cleanup?.report || {};
    const root = String(usage?.root || integrity?.root || "").trim();
    lastRuntimeDataRoot = root;
    if (runtimeDataRoot) {
      runtimeDataRoot.textContent = root || "-";
    }
    if (runtimeDataSummary) {
      const total = formatBytes(usage?.totalBytes);
      const scannedAt = String(usage?.scannedAt || "").trim();
      const issues = Array.isArray(integrity?.issues) ? integrity.issues : [];
      const issueCount = Number(integrity?.issueCount ?? issues.length ?? 0);
      const issueText = `${getString("pref-runtime-data-issue-count" as any)} ${issueCount}`;
      if (runtimeDataScanState === "scanning") {
        runtimeDataSummary.textContent = getString(
          "pref-runtime-data-scanning" as any,
        );
      } else if (usage?.categories) {
        runtimeDataSummary.textContent = `${getString("pref-runtime-data-summary" as any)} ${total} · ${issueText}${scannedAt ? ` · ${scannedAt}` : ""}`;
      } else {
        runtimeDataSummary.textContent = getString(
          "pref-runtime-data-summary-idle" as any,
        );
      }
    }
    if (runtimeDataStateDbInfo) {
      const stateDb = usage?.stateDatabase;
      const statePath = String(stateDb?.path || "").trim();
      const stateDetail = stateDb
        ? `${getString("pref-runtime-data-state-db" as any)}: ${formatBytes(
            stateDb.bytes,
          )}${statePath ? ` · ${statePath}` : ""}`
        : getString("pref-runtime-data-state-db-idle" as any);
      runtimeDataStateDbInfo.textContent = stateDetail;
      if (statePath) {
        runtimeDataStateDbInfo.setAttribute("title", statePath);
      }
    }
    if (!runtimeDataCategories) {
      renderRuntimeDataIssues(integrity);
      return;
    }
    clearChildren(runtimeDataCategories);
    runtimeDataCategories.textContent = "";
    if (runtimeDataScanState === "scanning") {
      const status = doc.createElement("div");
      status.className = "zs-runtime-data-scan-status";
      status.textContent = getString("pref-runtime-data-scanning" as any);
      runtimeDataCategories.appendChild(status);
    }
    const appendRow = (
      label: string,
      detail: string,
      actionLabel: string,
      enabled: boolean,
      onCommand?: () => void,
      title?: string,
    ) => {
      const rowLabel = doc.createElement("span");
      rowLabel.className = "zs-runtime-data-category";
      rowLabel.textContent = label;
      if (title) {
        rowLabel.setAttribute("title", title);
      }
      const rowSize = doc.createElement("span");
      rowSize.className = "zs-runtime-data-size";
      rowSize.textContent = detail;
      const action = doc.createElement("button") as unknown as XUL.Button;
      action.textContent = actionLabel;
      if (!enabled || !onCommand) {
        action.setAttribute("disabled", "true");
      } else {
        bindDynamicButtonAction(action, onCommand);
      }
      runtimeDataCategories.appendChild(rowLabel);
      runtimeDataCategories.appendChild(rowSize);
      runtimeDataCategories.appendChild(action);
    };
    const categories = new Map(
      (Array.isArray(usage?.categories) ? usage.categories : []).map(
        (category: any) => [String(category?.category || "").trim(), category],
      ),
    );
    const scanned = Array.isArray(usage?.categories);
    for (const id of runtimeDataCategoryOrder) {
      const category = (categories.get(id) || {
        category: id,
        label: runtimeDataCategoryLabels[id] || id,
        cleanable: false,
      }) as any;
      const label = String(
        (category as any)?.label || runtimeDataCategoryLabels[id] || id || "-",
      ).trim();
      const path = String(category?.path || "").trim();
      appendRow(
        label,
        formatRuntimeDataDetail(category, scanned),
        getString("pref-runtime-data-cleanup" as any),
        isRuntimeCategoryCleanable(category, scanned),
        () => {
          void cleanupRuntimeDataCategory(id, label);
        },
        path,
      );
    }
    renderRuntimeDataIssues(integrity);
  };

  const refreshRuntimeDataUsage = async () => {
    if (runtimeDataRefreshPromise) {
      return runtimeDataRefreshPromise;
    }
    runtimeDataRefreshPromise = (async () => {
      runtimeDataScanState = "scanning";
      renderRuntimeDataUsage(lastRuntimeDataSnapshot);
      try {
        const snapshot = await addon.hooks.onPrefsEvent(
          "scanPersistenceGovernance",
          {
            window: addon.data.prefs?.window,
          },
        );
        runtimeDataScanState = "ready";
        renderRuntimeDataUsage(snapshot);
      } catch (error) {
        runtimeDataScanState = "failed";
        if (runtimeDataSummary) {
          runtimeDataSummary.textContent = `${getString("pref-runtime-data-failed" as any)} ${String(error)}`;
        }
      } finally {
        runtimeDataRefreshPromise = null;
      }
    })();
    return runtimeDataRefreshPromise;
  };

  const cleanupRuntimeDataCategory = async (
    category: string,
    label: string,
  ) => {
    const confirmed = confirmWithWindow(
      `${getString("pref-runtime-data-category-cleanup-confirm" as any)}\n\n${label}`,
    );
    if (!confirmed) {
      return;
    }
    try {
      runtimeDataScanState = "scanning";
      if (runtimeDataSummary) {
        runtimeDataSummary.textContent = getString(
          "pref-runtime-data-cleaning" as any,
        );
      }
      const result = await addon.hooks.onPrefsEvent(
        "cleanupRuntimePersistenceCategory",
        {
          window: addon.data.prefs?.window,
          category,
        },
      );
      const cleanupResult = result as any;
      runtimeDataScanState = "ready";
      renderRuntimeDataUsage(cleanupResult?.usage || cleanupResult);
      await refreshRuntimeDataUsage();
    } catch (error) {
      runtimeDataScanState = "failed";
      if (runtimeDataSummary) {
        runtimeDataSummary.textContent = `${getString("pref-runtime-data-failed" as any)} ${String(error)}`;
      }
    }
  };

  const cleanupPersistenceGovernanceIssue = async (
    issueId: string,
    label: string,
    detailText: string,
  ) => {
    if (runtimeDataSummary) {
      runtimeDataSummary.textContent = getString(
        "pref-runtime-data-cleaning" as any,
      );
    }
    try {
      const preview = await addon.hooks.onPrefsEvent(
        "cleanupPersistenceGovernanceIssues",
        {
          window: addon.data.prefs?.window,
          issueIds: [issueId],
          dryRun: true,
        },
      );
      const confirmed = confirmWithWindow(
        `${getString("pref-runtime-data-cleanup-confirm" as any)}\n\n${label}: ${detailText}`,
      );
      if (!confirmed) {
        renderRuntimeDataUsage(preview);
        return;
      }
      const result = await addon.hooks.onPrefsEvent(
        "cleanupPersistenceGovernanceIssues",
        {
          window: addon.data.prefs?.window,
          issueIds: [issueId],
          dryRun: false,
        },
      );
      renderRuntimeDataUsage(result);
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

  const promptWithWindow = (message: string, defaultValue = "") => {
    const hostWindow = addon.data.prefs?.window as
      | (Window & {
          prompt?: (text: string, defaultValue?: string) => string | null;
        })
      | undefined;
    if (typeof hostWindow?.prompt === "function") {
      return hostWindow.prompt(message, defaultValue);
    }
    return "";
  };

  const setSynthesisDbResetStatus = (text: string) => {
    if (!synthesisDbResetStatus) {
      return;
    }
    synthesisDbResetStatus.textContent = text;
  };

  const sumDeletedRows = (deletedRowsByTable: unknown) => {
    if (!deletedRowsByTable || typeof deletedRowsByTable !== "object") {
      return 0;
    }
    return Object.values(deletedRowsByTable as Record<string, unknown>).reduce(
      (sum: number, value) => sum + Math.max(0, Math.floor(Number(value) || 0)),
      0,
    );
  };

  const runSynthesisDatabaseReset = async () => {
    const confirmed = confirmWithWindow(
      getString("pref-synthesis-db-reset-confirm-message" as any),
    );
    if (!confirmed) {
      setSynthesisDbResetStatus(
        getString("pref-synthesis-db-reset-status-cancelled" as any),
      );
      return;
    }
    const typed = promptWithWindow(
      getString("pref-synthesis-db-reset-prompt-message" as any),
      "",
    );
    if (typed !== SYNTHESIS_DB_RESET_CONFIRMATION_TEXT) {
      setSynthesisDbResetStatus(
        getString(
          "pref-synthesis-db-reset-status-confirmation-mismatch" as any,
        ),
      );
      return;
    }
    setButtonDisabled(synthesisDbResetButton, true);
    setSynthesisDbResetStatus(
      getString("pref-synthesis-db-reset-status-working" as any),
    );
    try {
      const response = (await addon.hooks.onPrefsEvent(
        "resetSynthesisDatabase",
        {
          window: addon.data.prefs?.window,
          confirmationText: typed,
        },
      )) as Record<string, unknown>;
      if (response?.ok !== true) {
        setSynthesisDbResetStatus(
          getString(
            "pref-synthesis-db-reset-status-confirmation-mismatch" as any,
          ),
        );
        return;
      }
      const deletedRows = sumDeletedRows(response.deletedRowsByTable);
      setSynthesisDbResetStatus(
        `${getString("pref-synthesis-db-reset-status-success" as any)} ${deletedRows}`,
      );
      await refreshRuntimeDataUsage();
    } catch (error) {
      setSynthesisDbResetStatus(
        `${getString("pref-synthesis-db-reset-status-failed" as any)} ${String(error)}`,
      );
    } finally {
      setButtonDisabled(synthesisDbResetButton, false);
    }
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

  const getWorkflowDirValueForDefault = () =>
    String(workflowDirInput?.value || "").trim() || getEffectiveWorkflowDir();

  const refreshDirectoryPlaceholders = () => {
    const workflowDefault = getEffectiveWorkflowDir();
    if (workflowDirInput) {
      workflowDirInput.placeholder = workflowDefault;
      workflowDirInput.setAttribute("placeholder", workflowDefault);
    }
    if (skillDirInput) {
      const skillDefault = getDefaultSkillDirForWorkflowDir(
        getWorkflowDirValueForDefault(),
      );
      skillDirInput.placeholder = skillDefault;
      skillDirInput.setAttribute("placeholder", skillDefault);
    }
  };

  const persistWorkflowDir = (rawValue: string) => {
    const nextValue = rawValue.trim();
    setPref("workflowDir", nextValue);
    if (workflowDirInput) {
      workflowDirInput.value = nextValue;
    }
    refreshDirectoryPlaceholders();
    return nextValue || getEffectiveWorkflowDir();
  };

  const persistWorkflowDirFromInput = () => {
    const rawValue = String(workflowDirInput?.value || "");
    const normalized = rawValue.trim();
    setPref("workflowDir", normalized);
    refreshDirectoryPlaceholders();
    return normalized || getEffectiveWorkflowDir();
  };

  const persistSkillDir = (rawValue: string) => {
    const nextValue = rawValue.trim();
    setPref("skillDir", nextValue);
    if (skillDirInput) {
      skillDirInput.value = nextValue;
    }
    refreshDirectoryPlaceholders();
    return (
      nextValue ||
      getDefaultSkillDirForWorkflowDir(getWorkflowDirValueForDefault())
    );
  };

  const persistSkillDirFromInput = () => {
    const rawValue = String(skillDirInput?.value || "");
    const normalized = rawValue.trim();
    setPref("skillDir", normalized);
    refreshDirectoryPlaceholders();
    return (
      normalized ||
      getDefaultSkillDirForWorkflowDir(getWorkflowDirValueForDefault())
    );
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
    const pinnedPort = Number(
      server.pinnedPort || getPref("hostBridgePinnedPort"),
    );
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
    const remoteEndpoint = String(server.remoteEndpoint || "").trim();
    const hasServerSnapshot =
      Boolean(details.server) ||
      Object.prototype.hasOwnProperty.call(server, "status") ||
      Object.prototype.hasOwnProperty.call(server, "endpoint");
    if (hasServerSnapshot && hostBridgeEndpointText) {
      hostBridgeEndpointText.textContent = [
        endpoint || getString("pref-host-bridge-endpoint-empty" as any),
        remoteEndpoint ? `remote=${remoteEndpoint}` : "",
      ]
        .filter(Boolean)
        .join(" · ");
    }
    if (hostBridgeStatusText) {
      hostBridgeStatusText.textContent = formatHostBridgeStatus(response);
    }
    if (hasServerSnapshot && hostBridgeLanCheckbox) {
      hostBridgeLanCheckbox.checked =
        server.lanEnabled === true || getPref("hostBridgeLanEnabled") === true;
    }
    if (hasServerSnapshot && hostBridgePinPortCheckbox) {
      const lanEnabled =
        server.lanEnabled === true || getPref("hostBridgeLanEnabled") === true;
      hostBridgePinPortCheckbox.checked =
        lanEnabled ||
        server.pinPortEnabled === true ||
        getPref("hostBridgePinPortEnabled") === true;
      hostBridgePinPortCheckbox.disabled = lanEnabled;
    }
    if (hasServerSnapshot && hostBridgePinnedPortInput) {
      hostBridgePinnedPortInput.value = String(
        Number(server.pinnedPort || getPref("hostBridgePinnedPort") || 26570),
      );
      hostBridgePinnedPortInput.disabled =
        hostBridgePinPortCheckbox?.checked !== true;
    }
    if (hasServerSnapshot && hostBridgeAdvertisedHostInput) {
      hostBridgeAdvertisedHostInput.value = String(
        server.advertisedHost || getPref("hostBridgeAdvertisedHost") || "",
      ).replace(/^<zotero-host-ip>$/, "");
    }
    if (hasServerSnapshot && hostBridgeShowEndpointButton) {
      hostBridgeShowEndpointButton.disabled =
        String(server.status || "").trim() === "running" && Boolean(endpoint);
    }
  };

  const renderMcpServerState = (response: unknown) => {
    const result = (response || {}) as {
      details?: Record<string, unknown>;
    };
    const details = (result.details || {}) as Record<string, unknown>;
    const server = (details.server || {}) as Record<string, unknown>;
    const enabled =
      details.enabled === true || getPref("mcpServer.enabled") !== false;
    if (mcpServerEnabledCheckbox) {
      mcpServerEnabledCheckbox.checked = enabled;
    }
    if (mcpServerStatusText) {
      const endpoint = String(server.endpoint || "").trim();
      const status = String(server.status || "unknown").trim();
      const tokenMasked = String(server.tokenMasked || "").trim();
      const error = String(server.lastError || "").trim();
      mcpServerStatusText.textContent = [
        enabled ? "enabled" : "disabled",
        `status=${status}`,
        endpoint ? `endpoint=${endpoint}` : "",
        tokenMasked ? `token=${tokenMasked}` : "",
        error ? `error=${error}` : "",
      ]
        .filter(Boolean)
        .join(" · ");
    }
  };

  const copyTextToClipboard = (text: string) => {
    const nav = (addon.data.prefs?.window.navigator || globalThis.navigator) as
      | { clipboard?: { writeText?: (text: string) => Promise<void> } }
      | undefined;
    if (text && typeof nav?.clipboard?.writeText === "function") {
      void nav.clipboard.writeText(text);
      return true;
    }
    return false;
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

  const refreshMcpServerState = async () => {
    try {
      const response = await addon.hooks.onPrefsEvent("stateMcpServer", {
        window: addon.data.prefs?.window,
      });
      renderMcpServerState(response);
      return response;
    } catch (error) {
      const response = {
        ok: false,
        message: String(error),
        details: {
          enabled: getPref("mcpServer.enabled") !== false,
        },
      };
      renderMcpServerState(response);
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

  const resolveSkillBrowseStartDir = async (preferredCurrentDir?: string) => {
    const defaultSkillDir = getDefaultSkillDirForWorkflowDir(
      getWorkflowDirValueForDefault(),
    );
    const currentSkillDir =
      String(preferredCurrentDir || "").trim() ||
      String(skillDirInput?.value || "").trim() ||
      String(getPref("skillDir") || "").trim();
    const homeDir = getHomeDir();
    const candidates = [currentSkillDir, defaultSkillDir, homeDir].filter(
      (value, index, array) => Boolean(value) && array.indexOf(value) === index,
    );
    for (const candidate of candidates) {
      if (await pathExists(candidate)) {
        return candidate;
      }
    }
    return currentSkillDir || defaultSkillDir || homeDir || "";
  };

  const getDirectoryFilePicker = () =>
    ((typeof ztoolkit !== "undefined" ? ztoolkit : undefined) ||
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

  if (workflowDirInput) {
    const workflowDir = String(getPref("workflowDir") || "").trim();
    persistWorkflowDir(workflowDir);
    workflowDirInput.addEventListener("input", () => {
      persistWorkflowDirFromInput();
    });
    workflowDirInput.addEventListener("change", () => {
      persistWorkflowDirFromInput();
    });
  }

  if (skillDirInput) {
    const skillDir = String(getPref("skillDir") || "").trim();
    persistSkillDir(skillDir);
    skillDirInput.addEventListener("input", () => {
      persistSkillDirFromInput();
    });
    skillDirInput.addEventListener("change", () => {
      persistSkillDirFromInput();
    });
  } else {
    refreshDirectoryPlaceholders();
  }

  if (collectSkillRunFeedbackCheckbox) {
    collectSkillRunFeedbackCheckbox.checked =
      getPref("collectSkillRunFeedbackEnabled") === true;
    collectSkillRunFeedbackCheckbox.addEventListener("change", () => {
      setPref(
        "collectSkillRunFeedbackEnabled",
        collectSkillRunFeedbackCheckbox.checked === true,
      );
    });
  }

  if (browseWorkflowDirButton) {
    browseWorkflowDirButton.addEventListener("command", () => {
      void (async () => {
        const runtimeToolkit = getDirectoryFilePicker();
        if (typeof runtimeToolkit?.FilePicker !== "function") {
          return;
        }
        const currentWorkflowDir = persistWorkflowDirFromInput();
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

  if (browseSkillDirButton) {
    browseSkillDirButton.addEventListener("command", () => {
      void (async () => {
        const runtimeToolkit = getDirectoryFilePicker();
        if (typeof runtimeToolkit?.FilePicker !== "function") {
          return;
        }
        const currentSkillDir = persistSkillDirFromInput();
        const initialDirectory =
          await resolveSkillBrowseStartDir(currentSkillDir);
        const selectedPath = await new runtimeToolkit.FilePicker(
          getString("pref-skill-dir" as any),
          "folder",
          [],
          "",
          addon.data.prefs?.window,
          undefined,
          initialDirectory,
        ).open();
        if (typeof selectedPath === "string" && selectedPath.trim()) {
          persistSkillDir(selectedPath);
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

  const renderWebDavSyncPrefsStatus = (status: any, fallbackMessage = "") => {
    if (!status || typeof status !== "object") {
      if (webDavSyncStatusText && fallbackMessage) {
        webDavSyncStatusText.textContent = fallbackMessage;
      }
      return;
    }
    if (webDavSyncEnabledCheckbox) {
      webDavSyncEnabledCheckbox.checked = status.enabled === true;
    }
    if (webDavSyncBaseUrlInput) {
      webDavSyncBaseUrlInput.value = String(status.base_url || "");
    }
    if (webDavSyncRemotePathInput) {
      webDavSyncRemotePathInput.value = String(
        status.remote_path || "zotero-agents",
      );
    }
    if (webDavSyncUsernameInput) {
      webDavSyncUsernameInput.value = String(status.username || "");
    }
    if (webDavSyncAutoSyncCheckbox) {
      webDavSyncAutoSyncCheckbox.checked = status.auto_sync_enabled === true;
    }
    if (webDavSyncAutoRetryCheckbox) {
      webDavSyncAutoRetryCheckbox.checked = status.auto_retry_enabled === true;
    }
    if (webDavSyncCredentialInput) {
      const updatedAt = String(status.credential_updated_at || "").trim();
      webDavSyncCredentialInput.setAttribute(
        "placeholder",
        status.credential_configured
          ? `${getString("pref-webdav-sync-credential-placeholder-saved" as any)}${
              updatedAt ? ` (${updatedAt})` : ""
            }`
          : getString("pref-webdav-sync-credential-placeholder-empty" as any),
      );
    }
    if (webDavSyncStatusText) {
      const diagnostics = Array.isArray(status.diagnostics)
        ? status.diagnostics
        : [];
      const connection = status.connection_test;
      const diagnosticText = diagnostics
        .map((entry: any) =>
          entry && typeof entry === "object"
            ? `${String(entry.code || "")}: ${String(entry.message || "")}`.trim()
            : "",
        )
        .filter(Boolean)
        .slice(0, 3)
        .join(" | ");
      webDavSyncStatusText.textContent = [
        fallbackMessage,
        `Config: ${String(status.config_status || "unknown")}`,
        connection && typeof connection === "object"
          ? `${connection.ok ? "Connection ready" : "Connection failed"} ${String(
              connection.tested_at || "",
            )}`.trim()
          : "",
        diagnosticText,
      ]
        .filter(Boolean)
        .join(" | ");
    }
  };

  const refreshWebDavSyncPrefsStatus = () => {
    void (async () => {
      const status = await addon.hooks.onPrefsEvent(
        "getWebDavSyncPrefsStatus",
        {
          window: addon.data.prefs?.window,
        },
      );
      renderWebDavSyncPrefsStatus(status);
    })();
  };

  const webDavSyncPrefsPayload = () => ({
    window: addon.data.prefs?.window,
    enabled: webDavSyncEnabledCheckbox?.checked === true,
    baseUrl: webDavSyncBaseUrlInput?.value || "",
    remotePath: webDavSyncRemotePathInput?.value || "zotero-agents",
    username: webDavSyncUsernameInput?.value || "",
    autoSyncEnabled: webDavSyncAutoSyncCheckbox?.checked === true,
    autoRetryEnabled: webDavSyncAutoRetryCheckbox?.checked === true,
  });

  if (
    webDavSyncEnabledCheckbox ||
    webDavSyncBaseUrlInput ||
    webDavSyncRemotePathInput ||
    webDavSyncUsernameInput ||
    webDavSyncAutoSyncCheckbox ||
    webDavSyncAutoRetryCheckbox
  ) {
    refreshWebDavSyncPrefsStatus();
  }

  if (webDavSyncSaveButton) {
    webDavSyncSaveButton.addEventListener("command", () => {
      void (async () => {
        const response: any = await addon.hooks.onPrefsEvent(
          "saveWebDavSyncPrefs",
          webDavSyncPrefsPayload(),
        );
        renderWebDavSyncPrefsStatus(
          response?.status || response,
          response?.ok === false
            ? getString("pref-webdav-sync-save-failed" as any)
            : getString("pref-webdav-sync-save-success" as any),
        );
      })();
    });
  }

  if (webDavSyncSaveCredentialButton) {
    webDavSyncSaveCredentialButton.addEventListener("command", () => {
      void (async () => {
        const response: any = await addon.hooks.onPrefsEvent(
          "saveWebDavSyncCredential",
          {
            window: addon.data.prefs?.window,
            credential: webDavSyncCredentialInput?.value || "",
          },
        );
        if (webDavSyncCredentialInput) {
          webDavSyncCredentialInput.value = "";
        }
        renderWebDavSyncPrefsStatus(
          response?.status || response,
          getString("pref-webdav-sync-credential-saved" as any),
        );
      })();
    });
  }

  if (webDavSyncClearCredentialButton) {
    webDavSyncClearCredentialButton.addEventListener("command", () => {
      void (async () => {
        const response: any = await addon.hooks.onPrefsEvent(
          "clearWebDavSyncCredential",
          { window: addon.data.prefs?.window },
        );
        if (webDavSyncCredentialInput) {
          webDavSyncCredentialInput.value = "";
        }
        renderWebDavSyncPrefsStatus(
          response?.status || response,
          getString("pref-webdav-sync-credential-cleared" as any),
        );
      })();
    });
  }

  if (webDavSyncTestButton) {
    webDavSyncTestButton.addEventListener("command", () => {
      void (async () => {
        if (webDavSyncStatusText) {
          webDavSyncStatusText.textContent = getString(
            "pref-webdav-sync-test-running" as any,
          );
        }
        const save: any = await addon.hooks.onPrefsEvent(
          "saveWebDavSyncPrefs",
          webDavSyncPrefsPayload(),
        );
        if (save?.ok === false) {
          renderWebDavSyncPrefsStatus(
            save.status,
            getString("pref-webdav-sync-save-failed" as any),
          );
          return;
        }
        const test: any = await addon.hooks.onPrefsEvent(
          "testWebDavSyncConfiguration",
          { window: addon.data.prefs?.window },
        );
        renderWebDavSyncPrefsStatus(
          {
            ...(save?.status || {}),
            connection_test: test,
            diagnostics: test?.diagnostics || save?.status?.diagnostics || [],
          },
          test?.ok
            ? getString("pref-webdav-sync-test-success" as any)
            : getString("pref-webdav-sync-test-failed" as any),
        );
      })();
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
        if (hostBridgePinPortCheckbox && hostBridgeLanCheckbox.checked) {
          hostBridgePinPortCheckbox.checked = true;
          hostBridgePinPortCheckbox.disabled = true;
        }
        renderHostBridgeState(response);
      })();
    });
  }

  if (mcpServerEnabledCheckbox) {
    mcpServerEnabledCheckbox.checked = getPref("mcpServer.enabled") !== false;
    mcpServerEnabledCheckbox.addEventListener("change", () => {
      void (async () => {
        const response = await addon.hooks.onPrefsEvent("setMcpServerEnabled", {
          window: addon.data.prefs?.window,
          enabled: mcpServerEnabledCheckbox.checked === true,
        });
        renderMcpServerState(response);
      })();
    });
  }

  if (hostBridgeDisableWriteApprovalCheckbox) {
    hostBridgeDisableWriteApprovalCheckbox.checked =
      getPref("hostBridgeDisableWriteApproval") === true;
    hostBridgeDisableWriteApprovalCheckbox.addEventListener("change", () => {
      const enabled = hostBridgeDisableWriteApprovalCheckbox.checked === true;
      if (enabled) {
        const confirmed = confirmWithWindow(
          getString("pref-host-bridge-disable-write-approval-confirm" as any),
        );
        if (!confirmed) {
          hostBridgeDisableWriteApprovalCheckbox.checked = false;
          setPref("hostBridgeDisableWriteApproval", false);
          return;
        }
      }
      setPref("hostBridgeDisableWriteApproval", enabled);
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
      if (hostBridgeLanCheckbox?.checked === true) {
        hostBridgePinPortCheckbox.checked = true;
        hostBridgePinPortCheckbox.disabled = true;
      }
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

  if (hostBridgeAdvertisedHostInput) {
    hostBridgeAdvertisedHostInput.value = String(
      getPref("hostBridgeAdvertisedHost") || "",
    ).trim();
    hostBridgeAdvertisedHostInput.addEventListener("change", () => {
      void (async () => {
        const response = await addon.hooks.onPrefsEvent(
          "setHostBridgeAdvertisedHost",
          {
            window: addon.data.prefs?.window,
            host: hostBridgeAdvertisedHostInput.value,
          },
        );
        renderHostBridgeState(response);
      })();
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

  if (hostBridgeRotateMasterTokenButton) {
    hostBridgeRotateMasterTokenButton.addEventListener("command", () => {
      void (async () => {
        const response = await addon.hooks.onPrefsEvent(
          "rotateHostBridgeMasterToken",
          {
            window: addon.data.prefs?.window,
          },
        );
        renderHostBridgeState(response);
      })();
    });
  }

  const handleHostBridgeCopyResponse = (response: unknown) => {
    const result = (response || {}) as {
      details?: Record<string, unknown>;
    };
    const details = (result.details || {}) as Record<string, unknown>;
    const clipboardText = String(details.clipboardText || "");
    if (clipboardText) {
      copyTextToClipboard(clipboardText);
    }
    renderHostBridgeState(response);
  };

  if (hostBridgeCopyMasterTokenButton) {
    hostBridgeCopyMasterTokenButton.addEventListener("command", () => {
      void (async () => {
        const response = await addon.hooks.onPrefsEvent(
          "copyHostBridgeMasterToken",
          {
            window: addon.data.prefs?.window,
          },
        );
        handleHostBridgeCopyResponse(response);
      })();
    });
  }

  if (hostBridgeCopyRemoteProfileButton) {
    hostBridgeCopyRemoteProfileButton.addEventListener("command", () => {
      void (async () => {
        const response = await addon.hooks.onPrefsEvent(
          "copyHostBridgeRemoteProfile",
          {
            window: addon.data.prefs?.window,
          },
        );
        handleHostBridgeCopyResponse(response);
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
    hostBridgePinnedPortInput ||
    hostBridgeAdvertisedHostInput
  ) {
    void refreshHostBridgeState();
  }

  if (mcpServerEnabledCheckbox || mcpServerStatusText) {
    void refreshMcpServerState();
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

  if (runtimeDataIssuesToggleButton) {
    runtimeDataIssuesToggleButton.addEventListener("command", () => {
      setRuntimeDataIssuesExpanded(!runtimeDataIssuesExpanded);
    });
  }

  if (synthesisDbResetButton) {
    synthesisDbResetButton.addEventListener("command", () => {
      void runSynthesisDatabaseReset();
    });
  }

  if (runtimeDataRoot || runtimeDataSummary || runtimeDataCategories) {
    renderRuntimeDataUsage(null);
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
