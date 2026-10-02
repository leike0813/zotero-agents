import { config } from "../../package.json";
import { getPref, setPref } from "../utils/prefs";
import { getAssistantExecutionDisplayMode, isAssistantExecutionDisplayMode, setAssistantExecutionDisplayMode, subscribeAssistantExecutionDisplayMode, } from "./assistant/publication/assistantExecutionDisplayPolicy";
import { isAssistantTranscriptPaginationVirtualizationEnabled, setAssistantTranscriptPaginationVirtualizationEnabled, } from "./assistant/publication/assistantTranscriptRenderingPreference";
import { getDefaultSkillDirForWorkflowDir, getDefaultWorkflowDir, getEffectiveWorkflowDir, } from "./workflow/catalog/workflowRuntime";
import { getString, getStringOrFallback } from "../utils/locale";
import { isDebugModeEnabled } from "./debugMode";
import { subscribeContentPackageInstallProgress, } from "./workflow/catalog/contentPackageSubscription";
import { runtimePathExists } from "./runtimePersistence";
import { bindSkillRunnerLocalRuntimePreferences } from "./preferences/skillRunnerLocalRuntimePreferences";
let unbindSkillRunnerLocalRuntimePreferences = null;
let unbindContentPackageInstallProgress = null;
const SYNTHESIS_DB_RESET_CONFIRMATION_TEXT = "RESET SYNTHESIS DATABASE";
export async function registerPrefsScripts(window) {
    unbindSkillRunnerLocalRuntimePreferences?.();
    if (!addon.data.prefs) {
        addon.data.prefs = { window };
    }
    else {
        addon.data.prefs.window = window;
    }
    const unbind = bindSkillRunnerLocalRuntimePreferences(window);
    const onUnload = () => {
        if (unbindSkillRunnerLocalRuntimePreferences !== cleanup)
            return;
        cleanup();
        unbindSkillRunnerLocalRuntimePreferences = null;
    };
    const cleanup = () => {
        window.removeEventListener("unload", onUnload);
        unbind();
    };
    unbindSkillRunnerLocalRuntimePreferences = cleanup;
    window.addEventListener("unload", onUnload, { once: true });
    bindPrefEvents();
}
function bindXulButtonActivation(button, handler) {
    if (!button) {
        return;
    }
    let lastActivation = 0;
    const onActivate = () => {
        const now = Date.now();
        if (now - lastActivation < 100) {
            return;
        }
        lastActivation = now;
        handler();
    };
    button.addEventListener("command", onActivate);
    button.addEventListener("click", onActivate);
}
function bindPrefEvents() {
    const prefPaneWindow = addon.data.prefs?.window;
    const doc = prefPaneWindow?.document;
    if (!doc) {
        return;
    }
    if (unbindContentPackageInstallProgress) {
        unbindContentPackageInstallProgress();
        unbindContentPackageInstallProgress = null;
    }
    const workflowDirInput = doc.querySelector(`#zotero-prefpane-${config.addonRef}-workflow-dir`);
    const skillDirInput = doc.querySelector(`#zotero-prefpane-${config.addonRef}-skill-dir`);
    const browseWorkflowDirButton = doc.querySelector(`#zotero-prefpane-${config.addonRef}-workflow-browse`);
    const browseSkillDirButton = doc.querySelector(`#zotero-prefpane-${config.addonRef}-skill-browse`);
    const scanButton = doc.querySelector(`#zotero-prefpane-${config.addonRef}-workflow-scan`);
    const workflowSettingsButton = doc.querySelector(`#zotero-prefpane-${config.addonRef}-workflow-settings`);
    const workflowOpenLogsButton = doc.querySelector(`#zotero-prefpane-${config.addonRef}-workflow-open-logs`);
    const contentPackageStatusText = doc.querySelector(`#zotero-prefpane-${config.addonRef}-content-package-status`);
    const contentPackageChannelSelect = doc.querySelector(`#zotero-prefpane-${config.addonRef}-content-package-channel`);
    const contentPackageChannelPopup = doc.querySelector(`#zotero-prefpane-${config.addonRef}-content-package-channel-popup`);
    const contentPackageCheckButton = doc.querySelector(`#zotero-prefpane-${config.addonRef}-content-package-check`);
    const contentPackageInstallButton = doc.querySelector(`#zotero-prefpane-${config.addonRef}-content-package-install`);
    const contentPackageProgressRow = doc.querySelector(`#zotero-prefpane-${config.addonRef}-content-package-progress-row`);
    const contentPackageProgressmeter = doc.querySelector(`#zotero-prefpane-${config.addonRef}-content-package-progressmeter`);
    const contentPackageProgressText = doc.querySelector(`#zotero-prefpane-${config.addonRef}-content-package-progress-text`);
    const collectSkillRunFeedbackCheckbox = doc.querySelector(`#zotero-prefpane-${config.addonRef}-collect-skill-run-feedback`);
    const markdownReaderEnabledCheckbox = doc.querySelector(`#zotero-prefpane-${config.addonRef}-markdown-reader-enabled`);
    const assistantExecutionDisplayModeControl = doc.querySelector(`#zotero-prefpane-${config.addonRef}-assistant-execution-display-mode`);
    const assistantTranscriptPaginationVirtualizationEnabledCheckbox = doc.querySelector(`#zotero-prefpane-${config.addonRef}-assistant-transcript-pagination-virtualization-enabled`);
    const backendManageButton = doc.querySelector(`#zotero-prefpane-${config.addonRef}-backend-manage`);
    const webDavSyncEnabledCheckbox = doc.querySelector(`#zotero-prefpane-${config.addonRef}-webdav-sync-enabled`);
    const webDavSyncBaseUrlInput = doc.querySelector(`#zotero-prefpane-${config.addonRef}-webdav-sync-base-url`);
    const webDavSyncRemotePathInput = doc.querySelector(`#zotero-prefpane-${config.addonRef}-webdav-sync-remote-path`);
    const webDavSyncUsernameInput = doc.querySelector(`#zotero-prefpane-${config.addonRef}-webdav-sync-username`);
    const webDavSyncAutoSyncCheckbox = doc.querySelector(`#zotero-prefpane-${config.addonRef}-webdav-sync-auto-sync`);
    const webDavSyncAutoRetryCheckbox = doc.querySelector(`#zotero-prefpane-${config.addonRef}-webdav-sync-auto-retry`);
    const webDavSyncCredentialInput = doc.querySelector(`#zotero-prefpane-${config.addonRef}-webdav-sync-credential`);
    const webDavSyncSaveCredentialButton = doc.querySelector(`#zotero-prefpane-${config.addonRef}-webdav-sync-save-credential`);
    const webDavSyncClearCredentialButton = doc.querySelector(`#zotero-prefpane-${config.addonRef}-webdav-sync-clear-credential`);
    const webDavSyncSaveButton = doc.querySelector(`#zotero-prefpane-${config.addonRef}-webdav-sync-save`);
    const webDavSyncTestButton = doc.querySelector(`#zotero-prefpane-${config.addonRef}-webdav-sync-test`);
    const webDavSyncStatusText = doc.querySelector(`#zotero-prefpane-${config.addonRef}-webdav-sync-status`);
    const hostBridgeLanCheckbox = doc.querySelector(`#zotero-prefpane-${config.addonRef}-host-bridge-lan-enabled`);
    const mcpServerEnabledCheckbox = doc.querySelector(`#zotero-prefpane-${config.addonRef}-mcp-server-enabled`);
    const hostBridgeDisableWriteApprovalCheckbox = doc.querySelector(`#zotero-prefpane-${config.addonRef}-host-bridge-disable-write-approval`);
    const mcpServerStatusText = doc.querySelector(`#zotero-prefpane-${config.addonRef}-mcp-server-status`);
    const hostBridgeLed = doc.querySelector(`#zotero-prefpane-${config.addonRef}-host-bridge-led`);
    const mcpServerLed = doc.querySelector(`#zotero-prefpane-${config.addonRef}-mcp-server-led`);
    const hostBridgePinPortCheckbox = doc.querySelector(`#zotero-prefpane-${config.addonRef}-host-bridge-pin-port-enabled`);
    const hostBridgePinnedPortInput = doc.querySelector(`#zotero-prefpane-${config.addonRef}-host-bridge-pinned-port`);
    const hostBridgeAdvertisedHostInput = doc.querySelector(`#zotero-prefpane-${config.addonRef}-host-bridge-advertised-host`);
    const hostBridgeEndpointText = doc.querySelector(`#zotero-prefpane-${config.addonRef}-host-bridge-endpoint`);
    const hostBridgeStatusText = doc.querySelector(`#zotero-prefpane-${config.addonRef}-host-bridge-status`);
    const hostBridgeShowEndpointButton = doc.querySelector(`#zotero-prefpane-${config.addonRef}-host-bridge-show-endpoint`);
    const hostBridgeRotateTokenButton = doc.querySelector(`#zotero-prefpane-${config.addonRef}-host-bridge-rotate-token`);
    const hostBridgeRotateMasterTokenButton = doc.querySelector(`#zotero-prefpane-${config.addonRef}-host-bridge-rotate-master-token`);
    const hostBridgeCopyMasterTokenButton = doc.querySelector(`#zotero-prefpane-${config.addonRef}-host-bridge-copy-master-token`);
    const hostBridgeCopyRemoteProfileButton = doc.querySelector(`#zotero-prefpane-${config.addonRef}-host-bridge-copy-remote-profile`);
    const hostBridgeInstallCliButton = doc.querySelector(`#zotero-prefpane-${config.addonRef}-host-bridge-install-cli`);
    const hostBridgeOperationNotice = doc.querySelector(`#zotero-prefpane-${config.addonRef}-host-bridge-operation-notice`);
    const hostBridgeOperationNoticeText = doc.querySelector(`#zotero-prefpane-${config.addonRef}-host-bridge-operation-notice-text`);
    const hostBridgeSecurityToggle = doc.querySelector(`#zotero-prefpane-${config.addonRef}-host-bridge-security-toggle`);
    const hostBridgeSecurityPanel = doc.querySelector(`#zotero-prefpane-${config.addonRef}-host-bridge-security-panel`);
    const runtimeDataRoot = doc.querySelector(`#zotero-prefpane-${config.addonRef}-runtime-data-root`);
    const runtimeDataSummary = doc.querySelector(`#zotero-prefpane-${config.addonRef}-runtime-data-summary`);
    const runtimeDataCategories = doc.querySelector(`#zotero-prefpane-${config.addonRef}-runtime-data-categories`);
    const runtimeDataIssuesToggleButton = doc.querySelector(`#zotero-prefpane-${config.addonRef}-runtime-data-toggle-issues`);
    const runtimeDataIssuesPanel = doc.querySelector(`#zotero-prefpane-${config.addonRef}-runtime-data-issues-panel`);
    const runtimeDataStateDbInfo = doc.querySelector(`#zotero-prefpane-${config.addonRef}-runtime-data-state-db-info`);
    const runtimeDataProgressRow = doc.querySelector(`#zotero-prefpane-${config.addonRef}-runtime-data-progress-row`);
    const runtimeDataProgressmeter = doc.querySelector(`#zotero-prefpane-${config.addonRef}-runtime-data-progressmeter`);
    const runtimeDataProgressText = doc.querySelector(`#zotero-prefpane-${config.addonRef}-runtime-data-progress-text`);
    const runtimeDataRescanButton = doc.querySelector(`#zotero-prefpane-${config.addonRef}-runtime-data-rescan`);
    const runtimeDataCopyRootButton = doc.querySelector(`#zotero-prefpane-${config.addonRef}-runtime-data-copy-root`);
    const runtimeDataOpenRootButton = doc.querySelector(`#zotero-prefpane-${config.addonRef}-runtime-data-open-root`);
    const synthesisDbResetButton = doc.querySelector(`#zotero-prefpane-${config.addonRef}-synthesis-db-reset`);
    const synthesisDbResetStatus = doc.querySelector(`#zotero-prefpane-${config.addonRef}-synthesis-db-reset-status`);
    const openHelpButton = doc.querySelector(`#zotero-prefpane-${config.addonRef}-open-help`);
    const openOnlineDocsButton = doc.querySelector(`#zotero-prefpane-${config.addonRef}-open-online-docs`);
    const setButtonDisabled = (button, disabled) => {
        if (!button) {
            return;
        }
        if (disabled) {
            button.setAttribute("disabled", "true");
            return;
        }
        if (typeof button
            .removeAttribute === "function") {
            button.removeAttribute("disabled");
        }
        else {
            button.setAttribute("disabled", "false");
        }
    };
    let lastRuntimeDataRoot = "";
    let runtimeDataIssuesExpanded = false;
    let lastRuntimeDataSnapshot = null;
    let hostBridgeSecurityExpanded = false;
    const debugModeEnabled = isDebugModeEnabled();
    const clearChildren = (element) => {
        if (!element?.removeChild) {
            return;
        }
        while (element.firstChild) {
            element.removeChild(element.firstChild);
        }
    };
    const formatBytes = (bytesRaw) => {
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
    const setRuntimeDataIssuesExpanded = (expanded) => {
        runtimeDataIssuesExpanded = expanded;
        if (lastRuntimeDataSnapshot) {
            renderRuntimeDataUsage(lastRuntimeDataSnapshot);
        }
        else {
            renderRuntimeDataUsage(null);
        }
    };
    const bindDynamicButtonAction = (button, onCommand) => {
        let handling = false;
        const handler = (event) => {
            event?.preventDefault?.();
            event?.stopPropagation?.();
            if (handling) {
                return;
            }
            handling = true;
            try {
                onCommand();
            }
            finally {
                setTimeout(() => {
                    handling = false;
                }, 0);
            }
        };
        button.addEventListener("click", handler);
        button.addEventListener("command", handler);
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
    const runtimeDataCategoryLabelKeys = {
        logs: "pref-runtime-data-category-logs",
        "skillrunner-ledger": "pref-runtime-data-category-skillrunner-ledger",
        "acp-conversations": "pref-runtime-data-category-acp-conversations",
        "acp-skill-runs": "pref-runtime-data-category-acp-skill-runs",
        "workflow-products": "pref-runtime-data-category-workflow-products",
        cache: "pref-runtime-data-category-cache",
        tmp: "pref-runtime-data-category-tmp",
    };
    const runtimeDataCategoryFallbackLabels = {
        logs: "Runtime logs",
        "skillrunner-ledger": "SkillRunner local ledger",
        "acp-conversations": "ACP conversations",
        "acp-skill-runs": "ACP skill runs",
        "workflow-products": "Workflow products",
        cache: "Cache",
        tmp: "Temporary files",
    };
    let runtimeDataScanState = "idle";
    let runtimeDataRefreshPromise = null;
    const runtimeDataCategoryLabel = (category, fallback = "") => {
        const id = String(category || "").trim();
        const key = runtimeDataCategoryLabelKeys[id];
        const fallbackLabel = fallback || runtimeDataCategoryFallbackLabels[id] || id;
        return key ? getStringOrFallback(key, fallbackLabel) : fallbackLabel;
    };
    const runtimeDataCleaningText = (target) => getStringOrFallback("pref-runtime-data-cleaning-target", `Cleaning ${target || ""}...`, { args: { target: target || "" } });
    const runtimeDataScanningText = (progress) => {
        const base = getString("pref-runtime-data-scanning");
        const current = Number(progress?.current || 0);
        const total = Number(progress?.total || 0);
        return total > 0 && current > 0 ? `${base} ${current}/${total}` : base;
    };
    const setRuntimeDataProgress = (visible, percent = 0, text = "") => {
        if (runtimeDataProgressRow) {
            if (visible) {
                runtimeDataProgressRow.classList.add("is-visible");
            }
            else {
                runtimeDataProgressRow.classList.remove("is-visible");
            }
        }
        const normalizedPercent = Math.max(0, Math.min(100, Math.floor(Number(percent) || 0)));
        if (runtimeDataProgressmeter) {
            runtimeDataProgressmeter.style.width = `${normalizedPercent}%`;
        }
        if (runtimeDataProgressText) {
            runtimeDataProgressText.textContent = visible ? text : "";
        }
    };
    const formatRuntimeDataDetail = (category, scanned) => {
        if (!scanned) {
            return getString("pref-runtime-data-not-scanned");
        }
        const bytesText = formatBytes(category?.bytes);
        const recordCount = Number(category?.recordCount || 0);
        if (recordCount > 0) {
            return `${bytesText} · ${recordCount} ${getString((recordCount === 1
                ? "pref-runtime-data-record"
                : "pref-runtime-data-records"))}`;
        }
        return bytesText;
    };
    const isRuntimeCategoryCleanable = (category, scanned) => {
        if (!scanned || runtimeDataScanState === "scanning") {
            return false;
        }
        if (category?.cleanable !== true) {
            return false;
        }
        const bytes = Number(category?.bytes || 0);
        const itemCount = Number(category?.itemCount || 0);
        const recordCount = Number(category?.recordCount || 0);
        return (category?.exists === true || bytes > 0 || itemCount > 0 || recordCount > 0);
    };
    const renderRuntimeDataIssues = (integrity) => {
        const issues = Array.isArray(integrity?.issues) ? integrity.issues : [];
        const issueCount = Number(integrity?.issueCount ?? issues.length ?? 0) || 0;
        if (issueCount <= 0) {
            runtimeDataIssuesExpanded = false;
        }
        if (runtimeDataIssuesToggleButton) {
            runtimeDataIssuesToggleButton.textContent = getString((runtimeDataIssuesExpanded
                ? "pref-runtime-data-hide-issues"
                : "pref-runtime-data-show-issues"));
            runtimeDataIssuesToggleButton.setAttribute("aria-expanded", runtimeDataIssuesExpanded ? "true" : "false");
            if (issueCount <= 0) {
                runtimeDataIssuesToggleButton.setAttribute("disabled", "true");
            }
            else {
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
            empty.textContent = getString("pref-runtime-data-no-issues");
            runtimeDataIssuesPanel.appendChild(empty);
            return;
        }
        const issueGrid = doc.createElement("div");
        issueGrid.className = "zs-runtime-issues-grid";
        runtimeDataIssuesPanel.appendChild(issueGrid);
        const appendIssueRow = (label, detail, actionLabel, enabled, onCommand, title) => {
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
            const action = doc.createElement("button");
            action.textContent = actionLabel;
            if (!enabled || !onCommand) {
                action.setAttribute("disabled", "true");
            }
            else {
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
            const relativePath = String(issue?.relativePath || issue?.owner || issue?.path || "").trim();
            const reason = String(issue?.reason || "").trim();
            const label = `${severity}: ${type}`;
            appendIssueRow(label, relativePath || "-", getString("pref-runtime-data-cleanup"), runtimeDataScanState !== "scanning" &&
                issue?.eligibleForCleanup === true &&
                Boolean(issueId), () => {
                void cleanupPersistenceGovernanceIssue(issueId, label, relativePath || reason || issueId);
            }, reason);
        }
    };
    const renderRuntimeDataUsage = (snapshot) => {
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
            const issueText = `${getString("pref-runtime-data-issue-count")} ${issueCount}`;
            if (usage?.categories) {
                runtimeDataSummary.textContent = `${getString("pref-runtime-data-summary")} ${total} · ${issueText}${scannedAt ? ` · ${scannedAt}` : ""}`;
            }
            else {
                runtimeDataSummary.textContent = getString("pref-runtime-data-summary-idle");
            }
        }
        if (runtimeDataStateDbInfo) {
            const stateDbs = Array.isArray(usage?.stateDatabases)
                ? usage.stateDatabases
                : usage?.stateDatabase
                    ? [usage.stateDatabase]
                    : [];
            const statePaths = stateDbs
                .map((entry) => String(entry?.path || "").trim())
                .filter(Boolean);
            const stateBytes = stateDbs.reduce((sum, entry) => sum + Math.max(0, Number(entry?.bytes) || 0), 0);
            const stateDetail = stateDbs.length
                ? `${getString("pref-runtime-data-state-db")}: ${formatBytes(stateBytes)}${statePaths.length ? ` · ${statePaths.join(" · ")}` : ""}`
                : getString("pref-runtime-data-state-db-idle");
            runtimeDataStateDbInfo.textContent = stateDetail;
            if (statePaths.length) {
                runtimeDataStateDbInfo.setAttribute("title", statePaths.join("\n"));
            }
            else {
                runtimeDataStateDbInfo.removeAttribute("title");
            }
        }
        if (!runtimeDataCategories) {
            renderRuntimeDataIssues(integrity);
            return;
        }
        clearChildren(runtimeDataCategories);
        runtimeDataCategories.textContent = "";
        const appendRow = (label, detail, actionLabel, enabled, onCommand, title) => {
            const rowLabel = doc.createElement("span");
            rowLabel.className = "zs-runtime-data-category";
            rowLabel.textContent = label;
            if (title) {
                rowLabel.setAttribute("title", title);
            }
            const rowSize = doc.createElement("span");
            rowSize.className = "zs-runtime-data-size";
            rowSize.textContent = detail;
            const action = doc.createElement("button");
            action.textContent = actionLabel;
            if (!enabled || !onCommand) {
                action.setAttribute("disabled", "true");
            }
            else {
                bindDynamicButtonAction(action, onCommand);
            }
            runtimeDataCategories.appendChild(rowLabel);
            runtimeDataCategories.appendChild(rowSize);
            runtimeDataCategories.appendChild(action);
        };
        const categories = new Map((Array.isArray(usage?.categories) ? usage.categories : []).map((category) => [String(category?.category || "").trim(), category]));
        const scanned = Array.isArray(usage?.categories);
        for (const id of runtimeDataCategoryOrder) {
            const category = (categories.get(id) || {
                category: id,
                label: runtimeDataCategoryLabel(id),
                cleanable: false,
            });
            const label = runtimeDataCategoryLabel(id, String(category?.label || id || "-").trim());
            const path = String(category?.path || "").trim();
            appendRow(label, formatRuntimeDataDetail(category, scanned), getString("pref-runtime-data-cleanup"), isRuntimeCategoryCleanable(category, scanned), () => {
                void cleanupRuntimeDataCategory(id, label);
            }, path);
        }
        renderRuntimeDataIssues(integrity);
    };
    const refreshRuntimeDataUsage = async () => {
        if (runtimeDataRefreshPromise) {
            return runtimeDataRefreshPromise;
        }
        runtimeDataRefreshPromise = (async () => {
            runtimeDataScanState = "scanning";
            setRuntimeDataProgress(true, 0, runtimeDataScanningText());
            renderRuntimeDataUsage(lastRuntimeDataSnapshot);
            try {
                const snapshot = await addon.hooks.onPrefsEvent("scanPersistenceGovernance", {
                    window: addon.data.prefs?.window,
                    onProgress: (progress) => {
                        setRuntimeDataProgress(true, Number(progress?.percent || 0), runtimeDataScanningText(progress));
                    },
                });
                runtimeDataScanState = "ready";
                setRuntimeDataProgress(true, 100, runtimeDataScanningText());
                renderRuntimeDataUsage(snapshot);
            }
            catch (error) {
                runtimeDataScanState = "failed";
                if (runtimeDataSummary) {
                    runtimeDataSummary.textContent = `${getString("pref-runtime-data-failed")} ${String(error)}`;
                }
            }
            finally {
                setRuntimeDataProgress(false);
                runtimeDataRefreshPromise = null;
            }
        })();
        return runtimeDataRefreshPromise;
    };
    const cleanupRuntimeDataCategory = async (category, label) => {
        const confirmed = confirmWithWindow(`${getString("pref-runtime-data-category-cleanup-confirm")}\n\n${label}`);
        if (!confirmed) {
            return;
        }
        try {
            runtimeDataScanState = "scanning";
            const cleaningText = runtimeDataCleaningText(label);
            setRuntimeDataProgress(true, 50, cleaningText);
            renderRuntimeDataUsage(lastRuntimeDataSnapshot);
            const result = await addon.hooks.onPrefsEvent("cleanupRuntimePersistenceCategory", {
                window: addon.data.prefs?.window,
                category,
            });
            const cleanupResult = result;
            runtimeDataScanState = "ready";
            renderRuntimeDataUsage(cleanupResult?.usage || cleanupResult);
            await refreshRuntimeDataUsage();
        }
        catch (error) {
            runtimeDataScanState = "failed";
            if (runtimeDataSummary) {
                runtimeDataSummary.textContent = `${getString("pref-runtime-data-failed")} ${String(error)}`;
            }
        }
        finally {
            if (!runtimeDataRefreshPromise) {
                setRuntimeDataProgress(false);
            }
        }
    };
    const cleanupPersistenceGovernanceIssue = async (issueId, label, detailText) => {
        try {
            const preview = await addon.hooks.onPrefsEvent("cleanupPersistenceGovernanceIssues", {
                window: addon.data.prefs?.window,
                issueIds: [issueId],
                dryRun: true,
            });
            const confirmed = confirmWithWindow(`${getString("pref-runtime-data-cleanup-confirm")}\n\n${label}: ${detailText}`);
            if (!confirmed) {
                renderRuntimeDataUsage(preview);
                setRuntimeDataProgress(false);
                return;
            }
            runtimeDataScanState = "scanning";
            const cleaningText = runtimeDataCleaningText(label);
            setRuntimeDataProgress(true, 50, cleaningText);
            renderRuntimeDataUsage(lastRuntimeDataSnapshot);
            const result = await addon.hooks.onPrefsEvent("cleanupPersistenceGovernanceIssues", {
                window: addon.data.prefs?.window,
                issueIds: [issueId],
                dryRun: false,
            });
            runtimeDataScanState = "ready";
            renderRuntimeDataUsage(result);
        }
        catch (error) {
            runtimeDataScanState = "failed";
            if (runtimeDataSummary) {
                runtimeDataSummary.textContent = `${getString("pref-runtime-data-failed")} ${String(error)}`;
            }
        }
        finally {
            setRuntimeDataProgress(false);
        }
    };
    const setDynamicStatusText = (element, text) => {
        if (!element) {
            return;
        }
        element.removeAttribute("data-l10n-id");
        element.removeAttribute("data-l10n-args");
        element.textContent = text;
    };
    const getPrefText = (key, fallback) => getStringOrFallback(key, fallback);
    const setLocalizedElementText = (element, key, fallback) => {
        setDynamicStatusText(element, getPrefText(key, fallback));
    };
    const statusTextKey = (status) => {
        const normalized = String(status || "")
            .trim()
            .toLowerCase();
        if (normalized === "running") {
            return "pref-host-access-status-running";
        }
        if (normalized === "loading" ||
            normalized === "starting" ||
            normalized === "reconciling" ||
            normalized === "reconciling_after_heartbeat_fail") {
            return "pref-host-access-status-loading";
        }
        if (normalized === "error" || normalized === "failed") {
            return "pref-host-access-status-error";
        }
        if (normalized === "disabled") {
            return "pref-host-access-status-disabled";
        }
        if (normalized === "stopped") {
            return "pref-host-access-status-stopped";
        }
        return "pref-host-access-status-idle";
    };
    const statusTextFallback = (status) => {
        const normalized = String(status || "")
            .trim()
            .toLowerCase();
        if (normalized === "running") {
            return "Running";
        }
        if (normalized === "loading" ||
            normalized === "starting" ||
            normalized === "reconciling" ||
            normalized === "reconciling_after_heartbeat_fail") {
            return "Loading";
        }
        if (normalized === "error" || normalized === "failed") {
            return "Error";
        }
        if (normalized === "disabled") {
            return "Disabled";
        }
        if (normalized === "stopped") {
            return "Stopped";
        }
        return "Idle";
    };
    const localizedStatusText = (status) => getPrefText(statusTextKey(status), statusTextFallback(status));
    const ledClassForStatus = (status) => {
        const normalized = String(status || "")
            .trim()
            .toLowerCase();
        if (normalized === "running") {
            return "is-green";
        }
        if (normalized === "loading" ||
            normalized === "starting" ||
            normalized === "reconciling" ||
            normalized === "reconciling_after_heartbeat_fail") {
            return "is-orange";
        }
        if (normalized === "error" || normalized === "failed") {
            return "is-red";
        }
        return "is-gray";
    };
    const setServiceLed = (element, status) => {
        if (!element) {
            return;
        }
        element.className = `zs-runtime-led ${ledClassForStatus(status)}`;
        element.setAttribute("title", localizedStatusText(status));
    };
    const statusPair = (labelKey, labelFallback, value) => (value ? `${getPrefText(labelKey, labelFallback)}=${value}` : "");
    const sanitizeHostAccessNoticeText = (text) => String(text || "")
        .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, "Bearer <redacted>")
        .replace(/\b(token|masterToken|authorization)\s*[:=]\s*\S+/gi, "$1=<redacted>")
        .replace(/[A-Za-z]:\\[^\s)]+/g, "<path>")
        .replace(/(?:^|\s)\/(?:Users|home|var|tmp|private|mnt)\/[^\s)]+/g, " <path>")
        .trim();
    const renderHostBridgeOperationNotice = (response) => {
        if (!hostBridgeOperationNotice || !hostBridgeOperationNoticeText) {
            return;
        }
        const result = (response || {});
        const manualPathSetup = result.manualPathSetupRequired === true;
        const message = sanitizeHostAccessNoticeText([
            String(result.message || ""),
            ...(manualPathSetup
                ? [
                    getPrefText("pref-host-bridge-cli-path-setup", "The CLI was installed to a user directory that is not in PATH. Add the commands below to your shell profile, then restart your terminal."),
                    'sh/bash/zsh: export PATH="$HOME/.local/bin:$PATH"',
                    "fish: fish_add_path $HOME/.local/bin",
                ]
                : []),
        ]
            .filter(Boolean)
            .join("\n"));
        if (!message) {
            hostBridgeOperationNotice.classList.remove("is-visible", "is-error");
            hostBridgeOperationNoticeText.textContent = "";
            return;
        }
        hostBridgeOperationNotice.classList.add("is-visible");
        if (result.ok === false) {
            hostBridgeOperationNotice.classList.add("is-error");
        }
        else {
            hostBridgeOperationNotice.classList.remove("is-error");
        }
        hostBridgeOperationNoticeText.textContent = message;
    };
    const updateHostBridgeSecurityPanel = () => {
        if (hostBridgeSecurityPanel) {
            if (hostBridgeSecurityExpanded) {
                hostBridgeSecurityPanel.classList.add("is-visible");
            }
            else {
                hostBridgeSecurityPanel.classList.remove("is-visible");
            }
        }
        if (hostBridgeSecurityToggle) {
            hostBridgeSecurityToggle.setAttribute("aria-expanded", hostBridgeSecurityExpanded ? "true" : "false");
            setLocalizedElementText(hostBridgeSecurityToggle, hostBridgeSecurityExpanded
                ? "pref-host-bridge-security-hide"
                : "pref-host-bridge-security-show", hostBridgeSecurityExpanded
                ? "Hide security actions"
                : "Show security actions");
        }
    };
    const confirmWithWindow = (message) => {
        const hostWindow = addon.data.prefs?.window;
        if (typeof hostWindow?.confirm === "function") {
            return hostWindow.confirm(message);
        }
        return true;
    };
    const promptWithWindow = (message, defaultValue = "") => {
        const hostWindow = addon.data.prefs?.window;
        if (typeof hostWindow?.prompt === "function") {
            return hostWindow.prompt(message, defaultValue);
        }
        return "";
    };
    const setSynthesisDbResetStatus = (text) => {
        if (!synthesisDbResetStatus) {
            return;
        }
        synthesisDbResetStatus.textContent = text;
    };
    const sumDeletedRows = (deletedRowsByTable) => {
        if (!deletedRowsByTable || typeof deletedRowsByTable !== "object") {
            return 0;
        }
        return Object.values(deletedRowsByTable).reduce((sum, value) => sum + Math.max(0, Math.floor(Number(value) || 0)), 0);
    };
    const runSynthesisDatabaseReset = async () => {
        const confirmed = confirmWithWindow(getString("pref-synthesis-db-reset-confirm-message"));
        if (!confirmed) {
            setSynthesisDbResetStatus(getString("pref-synthesis-db-reset-status-cancelled"));
            return;
        }
        const typed = promptWithWindow(getString("pref-synthesis-db-reset-prompt-message"), "");
        if (typed !== SYNTHESIS_DB_RESET_CONFIRMATION_TEXT) {
            setSynthesisDbResetStatus(getString("pref-synthesis-db-reset-status-confirmation-mismatch"));
            return;
        }
        setButtonDisabled(synthesisDbResetButton, true);
        setSynthesisDbResetStatus(getString("pref-synthesis-db-reset-status-working"));
        try {
            const response = (await addon.hooks.onPrefsEvent("resetSynthesisDatabase", {
                window: addon.data.prefs?.window,
                confirmationText: typed,
            }));
            if (response?.ok !== true) {
                setSynthesisDbResetStatus(getString("pref-synthesis-db-reset-status-confirmation-mismatch"));
                return;
            }
            const deletedRows = sumDeletedRows(response.deletedRowsByTable);
            setSynthesisDbResetStatus(`${getString("pref-synthesis-db-reset-status-success")} ${deletedRows}`);
            await refreshRuntimeDataUsage();
        }
        catch (error) {
            setSynthesisDbResetStatus(`${getString("pref-synthesis-db-reset-status-failed")} ${String(error)}`);
        }
        finally {
            setButtonDisabled(synthesisDbResetButton, false);
        }
    };
    const getWorkflowDirValueForDefault = () => String(workflowDirInput?.value || "").trim() || getEffectiveWorkflowDir();
    const pathPlaceholderPrefix = () => addon.data.locale?.current
        ? getStringOrFallback("pref-path-placeholder-zotero-data-dir", "<Zotero Data Directory>")
        : "<Zotero Data Directory>";
    const formatDefaultPathPlaceholder = (path) => {
        const normalizedPath = String(path || "").replace(/\\/g, "/");
        const defaultWorkflowDir = getDefaultWorkflowDir().replace(/\\/g, "/");
        const defaultSkillDir = getDefaultSkillDirForWorkflowDir(getDefaultWorkflowDir()).replace(/\\/g, "/");
        if (normalizedPath === defaultWorkflowDir) {
            return `${pathPlaceholderPrefix()}/content/user/workflows`;
        }
        if (normalizedPath === defaultSkillDir) {
            return `${pathPlaceholderPrefix()}/content/user/skills`;
        }
        return path;
    };
    const refreshDirectoryPlaceholders = () => {
        const workflowDefault = getEffectiveWorkflowDir();
        if (workflowDirInput) {
            const placeholder = formatDefaultPathPlaceholder(workflowDefault);
            workflowDirInput.placeholder = placeholder;
            workflowDirInput.setAttribute("placeholder", placeholder);
        }
        if (skillDirInput) {
            const skillDefault = getDefaultSkillDirForWorkflowDir(getWorkflowDirValueForDefault());
            const placeholder = formatDefaultPathPlaceholder(skillDefault);
            skillDirInput.placeholder = placeholder;
            skillDirInput.setAttribute("placeholder", placeholder);
        }
    };
    const persistWorkflowDir = (rawValue) => {
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
    const persistSkillDir = (rawValue) => {
        const nextValue = rawValue.trim();
        setPref("skillDir", nextValue);
        if (skillDirInput) {
            skillDirInput.value = nextValue;
        }
        refreshDirectoryPlaceholders();
        return (nextValue ||
            getDefaultSkillDirForWorkflowDir(getWorkflowDirValueForDefault()));
    };
    const persistSkillDirFromInput = () => {
        const rawValue = String(skillDirInput?.value || "");
        const normalized = rawValue.trim();
        setPref("skillDir", normalized);
        refreshDirectoryPlaceholders();
        return (normalized ||
            getDefaultSkillDirForWorkflowDir(getWorkflowDirValueForDefault()));
    };
    const formatHostBridgeStatus = (response) => {
        const result = (response || {});
        const details = (result.details || {});
        const server = (details.server || details || {});
        const status = String(server.status || "idle").trim() || "idle";
        const bindMode = String(server.bindMode || "loopback").trim() || "loopback";
        const portMode = String(server.portMode || "").trim();
        const port = Number(server.port || server.pinnedPort);
        const pinnedPort = Number(server.pinnedPort || getPref("hostBridgePinnedPort"));
        const endpoint = String(server.endpoint || "").trim();
        const error = String(server.lastError || server.lastRecoveryReason || "").trim();
        return [
            statusPair("pref-host-access-status-label", "Status", localizedStatusText(status)),
            statusPair("pref-host-access-bind-label", "Bind", bindMode),
            statusPair("pref-host-access-port-label", "Port", [
                portMode,
                Number.isInteger(port)
                    ? String(port)
                    : Number.isInteger(pinnedPort)
                        ? String(pinnedPort)
                        : "",
            ]
                .filter(Boolean)
                .join(" ")),
            statusPair("pref-host-access-endpoint-label", "Endpoint", endpoint),
            statusPair("pref-host-access-error-label", "Error", error),
        ]
            .filter(Boolean)
            .join(" · ");
    };
    const hostBridgePrefSnapshot = (status) => ({
        status,
        bindMode: getPref("hostBridgeLanEnabled") === true ? "lan" : "loopback",
        lanEnabled: getPref("hostBridgeLanEnabled") === true,
        pinPortEnabled: getPref("hostBridgeLanEnabled") === true ||
            getPref("hostBridgePinPortEnabled") === true,
        pinnedPort: Number(getPref("hostBridgePinnedPort") || 26570),
    });
    const renderHostBridgeState = (response) => {
        const result = (response || {});
        const details = (result.details || {});
        const server = (details.server || details || {});
        const endpoint = String(server.endpoint || "").trim();
        const remoteEndpoint = String(server.remoteEndpoint || "").trim();
        const status = String(server.status || "idle").trim() || "idle";
        setServiceLed(hostBridgeLed, status);
        const hasServerSnapshot = Boolean(details.server) ||
            Object.prototype.hasOwnProperty.call(server, "status") ||
            Object.prototype.hasOwnProperty.call(server, "endpoint");
        if (hasServerSnapshot && hostBridgeEndpointText) {
            hostBridgeEndpointText.textContent = [
                endpoint || getString("pref-host-bridge-endpoint-empty"),
                remoteEndpoint ? `remote=${remoteEndpoint}` : "",
            ]
                .filter(Boolean)
                .join(" · ");
        }
        if (hostBridgeStatusText) {
            setDynamicStatusText(hostBridgeStatusText, formatHostBridgeStatus(response));
        }
        if (hasServerSnapshot && hostBridgeLanCheckbox) {
            hostBridgeLanCheckbox.checked =
                server.lanEnabled === true || getPref("hostBridgeLanEnabled") === true;
        }
        if (hasServerSnapshot && hostBridgePinPortCheckbox) {
            const lanEnabled = server.lanEnabled === true || getPref("hostBridgeLanEnabled") === true;
            hostBridgePinPortCheckbox.checked =
                lanEnabled ||
                    server.pinPortEnabled === true ||
                    getPref("hostBridgePinPortEnabled") === true;
            hostBridgePinPortCheckbox.disabled = lanEnabled;
        }
        if (hasServerSnapshot && hostBridgePinnedPortInput) {
            hostBridgePinnedPortInput.value = String(Number(server.pinnedPort || getPref("hostBridgePinnedPort") || 26570));
            hostBridgePinnedPortInput.disabled =
                hostBridgePinPortCheckbox?.checked !== true;
        }
        if (hasServerSnapshot && hostBridgeAdvertisedHostInput) {
            hostBridgeAdvertisedHostInput.value = String(server.advertisedHost || getPref("hostBridgeAdvertisedHost") || "").replace(/^<zotero-host-ip>$/, "");
        }
        if (hasServerSnapshot && hostBridgeShowEndpointButton) {
            hostBridgeShowEndpointButton.disabled =
                String(server.status || "").trim() === "running" && Boolean(endpoint);
        }
    };
    const renderHostBridgeOperationResult = (response) => {
        renderHostBridgeState(response);
        renderHostBridgeOperationNotice(response);
    };
    const renderMcpServerState = (response) => {
        const result = (response || {});
        const details = (result.details || {});
        const server = (details.server || {});
        const enabled = Object.prototype.hasOwnProperty.call(details, "enabled")
            ? details.enabled === true
            : getPref("mcpServer.enabled") !== false;
        if (mcpServerEnabledCheckbox) {
            mcpServerEnabledCheckbox.checked = enabled;
        }
        if (mcpServerStatusText) {
            const endpoint = String(server.endpoint || "").trim();
            const status = enabled === true
                ? String(server.status || "idle").trim() || "idle"
                : "disabled";
            const error = String(server.lastError || "").trim();
            setServiceLed(mcpServerLed, status);
            setDynamicStatusText(mcpServerStatusText, [
                statusPair("pref-host-access-enabled-label", "Enabled", enabled
                    ? getPrefText("pref-host-access-enabled-yes", "Enabled")
                    : getPrefText("pref-host-access-enabled-no", "Disabled")),
                statusPair("pref-host-access-status-label", "Status", localizedStatusText(status)),
                statusPair("pref-host-access-endpoint-label", "Endpoint", endpoint),
                statusPair("pref-host-access-error-label", "Error", error),
            ]
                .filter(Boolean)
                .join(" · "));
            return;
        }
        setServiceLed(mcpServerLed, enabled ? server.status : "disabled");
    };
    const copyTextToClipboard = (text) => {
        const nav = (addon.data.prefs?.window.navigator || globalThis.navigator);
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
        }
        catch (error) {
            const response = {
                ok: false,
                message: String(error),
                details: {
                    ...hostBridgePrefSnapshot("error"),
                    lastError: String(error),
                },
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
        }
        catch (error) {
            const response = {
                ok: false,
                message: String(error),
                details: {
                    enabled: getPref("mcpServer.enabled") !== false,
                    server: {
                        status: "error",
                        lastError: String(error),
                    },
                },
            };
            renderMcpServerState(response);
            return response;
        }
    };
    const pathExists = async (path) => {
        const candidate = String(path || "").trim();
        if (!candidate) {
            return false;
        }
        const exists = await runtimePathExists(candidate);
        return exists;
    };
    const getHomeDir = () => {
        const runtime = globalThis;
        const fromProcess = runtime.process?.env?.USERPROFILE || runtime.process?.env?.HOME || "";
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
            }
            catch {
                return "";
            }
        }
        return "";
    };
    const resolveWorkflowBrowseStartDir = async (preferredCurrentDir) => {
        const currentWorkflowDir = String(preferredCurrentDir || "").trim() ||
            String(workflowDirInput?.value || "").trim() ||
            String(getPref("workflowDir") || "").trim();
        const defaultWorkflowDir = String(getDefaultWorkflowDir() || "").trim();
        const homeDir = getHomeDir();
        const candidates = [currentWorkflowDir, defaultWorkflowDir, homeDir].filter((value, index, array) => Boolean(value) && array.indexOf(value) === index);
        for (const candidate of candidates) {
            if (await pathExists(candidate)) {
                return candidate;
            }
        }
        return currentWorkflowDir || defaultWorkflowDir || homeDir || "";
    };
    const resolveSkillBrowseStartDir = async (preferredCurrentDir) => {
        const defaultSkillDir = getDefaultSkillDirForWorkflowDir(getWorkflowDirValueForDefault());
        const currentSkillDir = String(preferredCurrentDir || "").trim() ||
            String(skillDirInput?.value || "").trim() ||
            String(getPref("skillDir") || "").trim();
        const homeDir = getHomeDir();
        const candidates = [currentSkillDir, defaultSkillDir, homeDir].filter((value, index, array) => Boolean(value) && array.indexOf(value) === index);
        for (const candidate of candidates) {
            if (await pathExists(candidate)) {
                return candidate;
            }
        }
        return currentSkillDir || defaultSkillDir || homeDir || "";
    };
    const getDirectoryFilePicker = () => ((typeof ztoolkit !== "undefined" ? ztoolkit : undefined) ||
        globalThis.ztoolkit);
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
    }
    else {
        refreshDirectoryPlaceholders();
    }
    if (collectSkillRunFeedbackCheckbox) {
        collectSkillRunFeedbackCheckbox.checked =
            getPref("collectSkillRunFeedbackEnabled") === true;
        collectSkillRunFeedbackCheckbox.addEventListener("change", () => {
            setPref("collectSkillRunFeedbackEnabled", collectSkillRunFeedbackCheckbox.checked === true);
        });
    }
    if (markdownReaderEnabledCheckbox) {
        markdownReaderEnabledCheckbox.checked =
            getPref("markdownReaderEnabled") !== false;
        markdownReaderEnabledCheckbox.addEventListener("change", () => {
            setPref("markdownReaderEnabled", markdownReaderEnabledCheckbox.checked === true);
        });
    }
    if (assistantExecutionDisplayModeControl) {
        const modeButtons = Array.from(assistantExecutionDisplayModeControl.querySelectorAll('[role="radio"][data-mode]'));
        let submittedMode = getAssistantExecutionDisplayMode();
        const syncModeControl = (mode) => {
            submittedMode = mode;
            for (const button of modeButtons) {
                const selected = button.getAttribute("data-mode") === mode;
                button.setAttribute("aria-checked", selected ? "true" : "false");
                button.tabIndex = selected ? 0 : -1;
            }
        };
        syncModeControl(submittedMode);
        const unsubscribe = subscribeAssistantExecutionDisplayMode(syncModeControl);
        prefPaneWindow.addEventListener("unload", unsubscribe, { once: true });
        const persistMode = (event) => {
            const mode = event.currentTarget?.getAttribute("data-mode");
            if (!isAssistantExecutionDisplayMode(mode) || mode === submittedMode) {
                return;
            }
            const next = setAssistantExecutionDisplayMode(mode);
            syncModeControl(next);
            void addon.hooks
                .onPrefsEvent("setAssistantExecutionDisplayMode", {
                mode: next,
                window: prefPaneWindow,
            })
                .then((response) => {
                const responseMode = response &&
                    typeof response === "object" &&
                    isAssistantExecutionDisplayMode(response.mode)
                    ? response.mode
                    : next;
                syncModeControl(responseMode);
            })
                .catch(() => undefined);
        };
        for (const button of modeButtons) {
            for (const eventType of ["input", "change", "click", "command"]) {
                button.addEventListener(eventType, persistMode);
            }
        }
    }
    if (assistantTranscriptPaginationVirtualizationEnabledCheckbox) {
        assistantTranscriptPaginationVirtualizationEnabledCheckbox.checked =
            isAssistantTranscriptPaginationVirtualizationEnabled();
        assistantTranscriptPaginationVirtualizationEnabledCheckbox.addEventListener("change", () => {
            const next = setAssistantTranscriptPaginationVirtualizationEnabled(assistantTranscriptPaginationVirtualizationEnabledCheckbox.checked ===
                true);
            assistantTranscriptPaginationVirtualizationEnabledCheckbox.checked =
                next;
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
                const initialDirectory = await resolveWorkflowBrowseStartDir(currentWorkflowDir);
                const selectedPath = await new runtimeToolkit.FilePicker(getString("pref-workflow-dir"), "folder", [], "", addon.data.prefs?.window, undefined, initialDirectory).open();
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
                const initialDirectory = await resolveSkillBrowseStartDir(currentSkillDir);
                const selectedPath = await new runtimeToolkit.FilePicker(getString("pref-skill-dir"), "folder", [], "", addon.data.prefs?.window, undefined, initialDirectory).open();
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
    const setContentPackageStatus = (text) => {
        if (contentPackageStatusText) {
            contentPackageStatusText.textContent = text;
        }
    };
    const contentPackageString = (id, fallback, args) => getStringOrFallback(id, fallback, { args });
    const setContentPackageInstallEnabled = (enabled) => {
        setButtonDisabled(contentPackageInstallButton, !enabled);
    };
    const setContentPackageInstallLabel = (action) => {
        if (!contentPackageInstallButton) {
            return;
        }
        const labelByAction = {
            install: contentPackageString("pref-content-package-install-action-install", "Install"),
            update: contentPackageString("pref-content-package-install-action-update", "Update"),
            rollback: contentPackageString("pref-content-package-install-action-rollback", "Rollback"),
            replace: contentPackageString("pref-content-package-install-action-replace", "Replace"),
        };
        const label = labelByAction[String(action || "")] ||
            contentPackageString("pref-content-package-install", "Install / Update");
        contentPackageInstallButton.setAttribute("label", label);
        contentPackageInstallButton.textContent = label;
    };
    const effectiveContentAction = (result) => String(result?.action || (result?.updateAvailable ? "update" : "none"));
    const isInstallAction = (action) => action === "install" ||
        action === "update" ||
        action === "rollback" ||
        action === "replace";
    const canInstallFromStatus = (status) => !status?.installed;
    const canInstallFromCheckResult = (result) => result?.compatible === true &&
        isInstallAction(effectiveContentAction(result));
    const setContentPackageProgress = (progress) => {
        const visible = progress?.active === true;
        if (contentPackageProgressRow) {
            if (visible) {
                contentPackageProgressRow.classList.add("is-visible");
            }
            else {
                contentPackageProgressRow.classList.remove("is-visible");
            }
        }
        const percent = visible
            ? Math.max(0, Math.min(100, Math.floor(Number(progress?.percent || 0))))
            : 0;
        if (contentPackageProgressmeter) {
            contentPackageProgressmeter.style.width = `${percent}%`;
        }
        if (!contentPackageProgressText) {
            return;
        }
        if (!visible || !progress) {
            contentPackageProgressText.textContent = "";
            return;
        }
        const stageKeyByStage = {
            "check-feed": "pref-content-package-progress-check-feed",
            "download-package": "pref-content-package-progress-download-package",
            "verify-package": "pref-content-package-progress-verify-package",
            "extract-package": "pref-content-package-progress-extract-package",
            "stage-content": "pref-content-package-progress-stage-content",
            "promote-content": "pref-content-package-progress-promote-content",
            "write-state": "pref-content-package-progress-write-state",
            "refresh-registry": "pref-content-package-progress-refresh-registry",
            complete: "pref-content-package-progress-complete",
        };
        const stageLabel = getStringOrFallback(stageKeyByStage[String(progress.stage || "")] ||
            "pref-content-package-progress-installing", String(progress.label || ""));
        const title = getStringOrFallback("pref-content-package-progress-title", "Install progress");
        contentPackageProgressText.textContent =
            `${title} ${progress.current}/${progress.total} · ${stageLabel}`.trim();
    };
    const formatContentPackageStatus = (status) => {
        const installed = status?.installed;
        const channel = String(status?.channel || "stable");
        if (status?.staleState) {
            return contentPackageString("pref-content-package-status-stale", "Official Workflow package files are missing. Install the package again.");
        }
        if (!installed) {
            return contentPackageString("pref-content-package-status-not-installed", "Official Workflow package is not installed. Channel: { $channel }.", { channel });
        }
        const packageInfo = installed.package || {};
        return contentPackageString("pref-content-package-status-installed", "Installed: { $id } · version { $version } · revision { $revision } · channel { $channel }", {
            id: String(packageInfo.id || "official-content"),
            version: String(packageInfo.version || "unknown"),
            revision: String(installed.feed_revision || "unknown"),
            channel,
        });
    };
    const syncContentPackageChannelSelect = (status) => {
        if (!contentPackageChannelSelect) {
            return;
        }
        const currentChannel = String(status?.channel || getPref("contentFeedChannel") || "stable");
        const channels = [
            { value: "stable", label: "Stable" },
            { value: "beta", label: "Beta" },
            ...(debugModeEnabled ? [{ value: "dev", label: "Dev" }] : []),
        ];
        const popup = contentPackageChannelPopup || contentPackageChannelSelect;
        clearChildren(popup);
        for (const channel of channels) {
            const option = typeof doc.createXULElement === "function"
                ? doc.createXULElement("menuitem")
                : doc.createElement("menuitem");
            option.setAttribute("value", channel.value);
            option.setAttribute("label", channel.label);
            option.value = channel.value;
            option.textContent = channel.label;
            if (channel.value === currentChannel) {
                option.setAttribute("selected", "selected");
            }
            popup?.appendChild(option);
        }
        contentPackageChannelSelect.value = channels.some((channel) => channel.value === currentChannel)
            ? currentChannel
            : "stable";
    };
    const refreshContentPackageStatus = () => {
        void (async () => {
            const status = await addon.hooks.onPrefsEvent("stateContentPackage", {
                window: addon.data.prefs?.window,
            });
            syncContentPackageChannelSelect(status);
            setContentPackageProgress(status?.actionProgress || null);
            setContentPackageStatus(formatContentPackageStatus(status));
            const installing = status?.actionProgress?.active === true;
            setButtonDisabled(contentPackageCheckButton, installing);
            setContentPackageInstallEnabled(!installing && canInstallFromStatus(status));
            setContentPackageInstallLabel(canInstallFromStatus(status) ? "install" : undefined);
        })();
    };
    if (contentPackageChannelSelect) {
        syncContentPackageChannelSelect();
        const handleContentPackageChannelChange = () => {
            const channel = String(contentPackageChannelSelect.value || "stable");
            setPref("contentFeedChannel", channel === "beta" || (channel === "dev" && debugModeEnabled)
                ? channel
                : "stable");
            setContentPackageInstallLabel();
            refreshContentPackageStatus();
        };
        contentPackageChannelSelect.addEventListener("command", handleContentPackageChannelChange);
        contentPackageChannelSelect.addEventListener("change", handleContentPackageChannelChange);
    }
    if (contentPackageCheckButton) {
        contentPackageCheckButton.addEventListener("command", () => {
            void (async () => {
                setButtonDisabled(contentPackageCheckButton, true);
                setButtonDisabled(contentPackageInstallButton, true);
                setContentPackageStatus(contentPackageString("pref-content-package-status-checking", "Checking official Workflow package feed..."));
                try {
                    const result = await addon.hooks.onPrefsEvent("checkContentPackageUpdate", { window: addon.data.prefs?.window });
                    if (result?.ok) {
                        const action = effectiveContentAction(result);
                        setContentPackageStatus(!result.compatible
                            ? contentPackageString("pref-content-package-status-incompatible", "Official Workflow package update is not compatible: { $reason }", {
                                reason: String(result.incompatibility?.message ||
                                    "unknown requirement"),
                            })
                            : action === "update"
                                ? contentPackageString("pref-content-package-status-update-available", "Update available: { $version } ({ $revision })", {
                                    version: String(result.package?.version || "unknown"),
                                    revision: String(result.feed?.revision || "unknown"),
                                })
                                : action === "rollback"
                                    ? contentPackageString("pref-content-package-status-rollback-available", "Rollback available: { $version } ({ $revision })", {
                                        version: String(result.package?.version || "unknown"),
                                        revision: String(result.feed?.revision || "unknown"),
                                    })
                                    : action === "install"
                                        ? contentPackageString("pref-content-package-status-install-available", "Package available: { $version } ({ $revision })", {
                                            version: String(result.package?.version || "unknown"),
                                            revision: String(result.feed?.revision || "unknown"),
                                        })
                                        : action === "replace"
                                            ? contentPackageString("pref-content-package-status-replace-available", "Package replacement available: { $version } ({ $revision })", {
                                                version: String(result.package?.version || "unknown"),
                                                revision: String(result.feed?.revision || "unknown"),
                                            })
                                            : contentPackageString("pref-content-package-status-current", "Official Workflow package is up to date."));
                        setContentPackageInstallEnabled(canInstallFromCheckResult(result));
                        setContentPackageInstallLabel(action);
                    }
                    else {
                        setContentPackageStatus(contentPackageString("pref-content-package-status-check-failed", "Official Workflow package feed check failed: { $reason }", { reason: String(result?.message || "unknown error") }));
                        setContentPackageInstallEnabled(canInstallFromStatus(result?.status));
                        setContentPackageInstallLabel(canInstallFromStatus(result?.status) ? "install" : undefined);
                    }
                }
                finally {
                    setButtonDisabled(contentPackageCheckButton, false);
                }
            })();
        });
    }
    if (contentPackageInstallButton) {
        contentPackageInstallButton.addEventListener("command", () => {
            void (async () => {
                setButtonDisabled(contentPackageInstallButton, true);
                setButtonDisabled(contentPackageCheckButton, true);
                setContentPackageStatus(contentPackageString("pref-content-package-status-installing", "Installing official Workflow package..."));
                try {
                    const result = await addon.hooks.onPrefsEvent("installContentPackage", { window: addon.data.prefs?.window, source: "preferences" });
                    setContentPackageStatus(result?.ok
                        ? formatContentPackageStatus(result.status)
                        : contentPackageString("pref-content-package-status-install-failed", "Official Workflow package install failed: { $reason }", { reason: String(result?.message || "unknown error") }));
                    setContentPackageInstallEnabled(canInstallFromStatus(result?.status));
                }
                finally {
                    setButtonDisabled(contentPackageCheckButton, false);
                }
            })();
        });
    }
    if (contentPackageChannelSelect ||
        contentPackageStatusText ||
        contentPackageCheckButton ||
        contentPackageInstallButton ||
        contentPackageProgressRow) {
        let contentPackageInstallWasActive = false;
        unbindContentPackageInstallProgress =
            subscribeContentPackageInstallProgress((progress) => {
                const active = progress?.active === true;
                if (active) {
                    contentPackageInstallWasActive = true;
                    setButtonDisabled(contentPackageCheckButton, true);
                    setButtonDisabled(contentPackageInstallButton, true);
                }
                setContentPackageProgress(progress);
                if (!active && contentPackageInstallWasActive) {
                    contentPackageInstallWasActive = false;
                    refreshContentPackageStatus();
                }
            });
        refreshContentPackageStatus();
    }
    if (backendManageButton) {
        backendManageButton.addEventListener("command", () => {
            void addon.hooks.onPrefsEvent("openBackendManager", {
                window: addon.data.prefs?.window,
            });
        });
    }
    bindXulButtonActivation(openHelpButton, () => {
        void addon.hooks.onPrefsEvent("openHelpCenter", {
            window: addon.data.prefs?.window,
        });
    });
    bindXulButtonActivation(openOnlineDocsButton, () => {
        void addon.hooks.onPrefsEvent("openOnlineDocs", {
            window: addon.data.prefs?.window,
        });
    });
    if (hostBridgeSecurityToggle) {
        hostBridgeSecurityToggle.addEventListener("command", () => {
            hostBridgeSecurityExpanded = !hostBridgeSecurityExpanded;
            updateHostBridgeSecurityPanel();
        });
    }
    updateHostBridgeSecurityPanel();
    const renderWebDavSyncPrefsStatus = (status, fallbackMessage = "") => {
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
            webDavSyncRemotePathInput.value = String(status.remote_path || "zotero-agents");
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
            webDavSyncCredentialInput.setAttribute("placeholder", status.credential_configured
                ? `${getString("pref-webdav-sync-credential-placeholder-saved")}${updatedAt ? ` (${updatedAt})` : ""}`
                : getString("pref-webdav-sync-credential-placeholder-empty"));
        }
        if (webDavSyncStatusText) {
            const diagnostics = Array.isArray(status.diagnostics)
                ? status.diagnostics
                : [];
            const connection = status.connection_test;
            const diagnosticText = diagnostics
                .map((entry) => entry && typeof entry === "object"
                ? `${String(entry.code || "")}: ${String(entry.message || "")}`.trim()
                : "")
                .filter(Boolean)
                .slice(0, 3)
                .join(" | ");
            webDavSyncStatusText.textContent = [
                fallbackMessage,
                `Config: ${String(status.config_status || "unknown")}`,
                connection && typeof connection === "object"
                    ? `${connection.ok ? "Connection ready" : "Connection failed"} ${String(connection.tested_at || "")}`.trim()
                    : "",
                diagnosticText,
            ]
                .filter(Boolean)
                .join(" | ");
        }
    };
    const refreshWebDavSyncPrefsStatus = () => {
        void (async () => {
            const status = await addon.hooks.onPrefsEvent("getWebDavSyncPrefsStatus", {
                window: addon.data.prefs?.window,
            });
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
    if (webDavSyncEnabledCheckbox ||
        webDavSyncBaseUrlInput ||
        webDavSyncRemotePathInput ||
        webDavSyncUsernameInput ||
        webDavSyncAutoSyncCheckbox ||
        webDavSyncAutoRetryCheckbox) {
        refreshWebDavSyncPrefsStatus();
    }
    if (webDavSyncSaveButton) {
        webDavSyncSaveButton.addEventListener("command", () => {
            void (async () => {
                const response = await addon.hooks.onPrefsEvent("saveWebDavSyncPrefs", webDavSyncPrefsPayload());
                renderWebDavSyncPrefsStatus(response?.status || response, response?.ok === false
                    ? getString("pref-webdav-sync-save-failed")
                    : getString("pref-webdav-sync-save-success"));
            })();
        });
    }
    if (webDavSyncSaveCredentialButton) {
        webDavSyncSaveCredentialButton.addEventListener("command", () => {
            void (async () => {
                const response = await addon.hooks.onPrefsEvent("saveWebDavSyncCredential", {
                    window: addon.data.prefs?.window,
                    credential: webDavSyncCredentialInput?.value || "",
                });
                if (webDavSyncCredentialInput) {
                    webDavSyncCredentialInput.value = "";
                }
                renderWebDavSyncPrefsStatus(response?.status || response, getString("pref-webdav-sync-credential-saved"));
            })();
        });
    }
    if (webDavSyncClearCredentialButton) {
        webDavSyncClearCredentialButton.addEventListener("command", () => {
            void (async () => {
                const response = await addon.hooks.onPrefsEvent("clearWebDavSyncCredential", { window: addon.data.prefs?.window });
                if (webDavSyncCredentialInput) {
                    webDavSyncCredentialInput.value = "";
                }
                renderWebDavSyncPrefsStatus(response?.status || response, getString("pref-webdav-sync-credential-cleared"));
            })();
        });
    }
    if (webDavSyncTestButton) {
        webDavSyncTestButton.addEventListener("command", () => {
            void (async () => {
                if (webDavSyncStatusText) {
                    webDavSyncStatusText.textContent = getString("pref-webdav-sync-test-running");
                }
                const save = await addon.hooks.onPrefsEvent("saveWebDavSyncPrefs", webDavSyncPrefsPayload());
                if (save?.ok === false) {
                    renderWebDavSyncPrefsStatus(save.status, getString("pref-webdav-sync-save-failed"));
                    return;
                }
                const test = await addon.hooks.onPrefsEvent("testWebDavSyncConfiguration", { window: addon.data.prefs?.window });
                renderWebDavSyncPrefsStatus({
                    ...(save?.status || {}),
                    connection_test: test,
                    diagnostics: test?.diagnostics || save?.status?.diagnostics || [],
                }, test?.ok
                    ? getString("pref-webdav-sync-test-success")
                    : getString("pref-webdav-sync-test-failed"));
            })();
        });
    }
    if (hostBridgeLanCheckbox) {
        hostBridgeLanCheckbox.checked = getPref("hostBridgeLanEnabled") === true;
        hostBridgeLanCheckbox.addEventListener("change", () => {
            void (async () => {
                const response = await addon.hooks.onPrefsEvent("setHostBridgeLanEnabled", {
                    window: addon.data.prefs?.window,
                    enabled: hostBridgeLanCheckbox.checked === true,
                });
                if (hostBridgePinPortCheckbox && hostBridgeLanCheckbox.checked) {
                    hostBridgePinPortCheckbox.checked = true;
                    hostBridgePinPortCheckbox.disabled = true;
                }
                renderHostBridgeOperationResult(response);
                void refreshMcpServerState();
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
                renderHostBridgeOperationNotice(response);
            })();
        });
    }
    if (hostBridgeDisableWriteApprovalCheckbox) {
        hostBridgeDisableWriteApprovalCheckbox.checked =
            getPref("hostBridgeDisableWriteApproval") === true;
        hostBridgeDisableWriteApprovalCheckbox.addEventListener("change", () => {
            const enabled = hostBridgeDisableWriteApprovalCheckbox.checked === true;
            if (enabled) {
                const confirmed = confirmWithWindow(getString("pref-host-bridge-disable-write-approval-confirm"));
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
            renderHostBridgeOperationResult(response);
            void refreshMcpServerState();
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
        hostBridgePinnedPortInput.value = String(Number(getPref("hostBridgePinnedPort") || 26570));
        hostBridgePinnedPortInput.disabled =
            hostBridgePinPortCheckbox?.checked !== true;
        hostBridgePinnedPortInput.addEventListener("change", () => {
            persistHostBridgePinPort();
        });
    }
    if (hostBridgeAdvertisedHostInput) {
        hostBridgeAdvertisedHostInput.value = String(getPref("hostBridgeAdvertisedHost") || "").trim();
        hostBridgeAdvertisedHostInput.addEventListener("change", () => {
            void (async () => {
                const response = await addon.hooks.onPrefsEvent("setHostBridgeAdvertisedHost", {
                    window: addon.data.prefs?.window,
                    host: hostBridgeAdvertisedHostInput.value,
                });
                renderHostBridgeOperationResult(response);
                void refreshMcpServerState();
            })();
        });
    }
    if (hostBridgeShowEndpointButton) {
        hostBridgeShowEndpointButton.addEventListener("command", () => {
            void (async () => {
                const response = await addon.hooks.onPrefsEvent("showHostBridgeEndpoint", {
                    window: addon.data.prefs?.window,
                });
                renderHostBridgeOperationResult(response);
            })();
        });
    }
    if (hostBridgeRotateTokenButton) {
        hostBridgeRotateTokenButton.addEventListener("command", () => {
            void (async () => {
                const response = await addon.hooks.onPrefsEvent("rotateHostBridgeToken", {
                    window: addon.data.prefs?.window,
                });
                renderHostBridgeOperationResult(response);
            })();
        });
    }
    if (hostBridgeRotateMasterTokenButton) {
        hostBridgeRotateMasterTokenButton.addEventListener("command", () => {
            void (async () => {
                const response = await addon.hooks.onPrefsEvent("rotateHostBridgeMasterToken", {
                    window: addon.data.prefs?.window,
                });
                renderHostBridgeOperationResult(response);
            })();
        });
    }
    const handleHostBridgeCopyResponse = (response) => {
        const result = (response || {});
        const details = (result.details || {});
        const clipboardText = String(details.clipboardText || "");
        if (clipboardText) {
            copyTextToClipboard(clipboardText);
        }
        renderHostBridgeOperationResult(response);
    };
    if (hostBridgeCopyMasterTokenButton) {
        hostBridgeCopyMasterTokenButton.addEventListener("command", () => {
            void (async () => {
                const response = await addon.hooks.onPrefsEvent("copyHostBridgeMasterToken", {
                    window: addon.data.prefs?.window,
                });
                handleHostBridgeCopyResponse(response);
            })();
        });
    }
    if (hostBridgeCopyRemoteProfileButton) {
        hostBridgeCopyRemoteProfileButton.addEventListener("command", () => {
            void (async () => {
                const response = await addon.hooks.onPrefsEvent("copyHostBridgeRemoteProfile", {
                    window: addon.data.prefs?.window,
                });
                handleHostBridgeCopyResponse(response);
            })();
        });
    }
    if (hostBridgeInstallCliButton) {
        hostBridgeInstallCliButton.addEventListener("command", () => {
            void (async () => {
                const response = await addon.hooks.onPrefsEvent("installHostBridgeCli", {
                    window: addon.data.prefs?.window,
                });
                renderHostBridgeOperationNotice(response);
                void refreshHostBridgeState();
            })();
        });
    }
    if (hostBridgeEndpointText ||
        hostBridgeStatusText ||
        hostBridgeLanCheckbox ||
        hostBridgePinPortCheckbox ||
        hostBridgePinnedPortInput ||
        hostBridgeAdvertisedHostInput) {
        renderHostBridgeState({
            ok: true,
            details: hostBridgePrefSnapshot("loading"),
        });
        void refreshHostBridgeState();
    }
    if (mcpServerEnabledCheckbox || mcpServerStatusText) {
        renderMcpServerState({
            ok: true,
            details: {
                enabled: getPref("mcpServer.enabled") !== false,
                server: {
                    status: "loading",
                },
            },
        });
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
                globalThis.navigator);
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
}
