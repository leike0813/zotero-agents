import { config } from "../../../package.json";
import { getString } from "../../utils/locale";
import { isDebugModeEnabled } from "../debugMode";
import { subscribeManagedLocalRuntimeStateChange } from "../skillRunner/runtime/skillRunnerLocalRuntimeManager";
export function bindSkillRunnerLocalRuntimePreferences(window) {
    const doc = window.document;
    const query = (suffix) => doc.querySelector(`#zotero-prefpane-${config.addonRef}-skillrunner-local-${suffix}`);
    const deployButton = query("deploy");
    const stopButton = query("stop");
    const uninstallButton = query("uninstall");
    const openDebugConsoleButton = query("open-debug-console");
    const openManagementButton = query("open-management");
    const openSkillsFolderButton = query("open-skills-folder");
    const refreshModelCacheButton = query("refresh-model-cache");
    const led = query("runtime-led");
    const autoStartIcon = query("autostart-icon");
    const statusText = query("status-text");
    const uninstallOptionsDialog = query("uninstall-options-dialog");
    const uninstallOptionClearData = query("uninstall-option-clear-data");
    const uninstallOptionClearAgentHome = query("uninstall-option-clear-agent-home");
    const uninstallOptionsConfirmButton = query("uninstall-options-confirm");
    const uninstallOptionsCancelButton = query("uninstall-options-cancel");
    const progressRow = query("progress-row");
    const progressmeter = query("progressmeter");
    const progressText = query("progress-text");
    const actionButtons = [
        deployButton,
        stopButton,
        uninstallButton,
        openManagementButton,
        openSkillsFolderButton,
        refreshModelCacheButton,
    ].filter(Boolean);
    const cleanups = [];
    let disposed = false;
    let dismissUninstallDialog = null;
    const setButtonDisabled = (button, disabled) => {
        if (!button)
            return;
        if (disabled)
            button.setAttribute("disabled", "true");
        else
            button.removeAttribute("disabled");
    };
    const setButtonsDisabled = (disabled) => {
        for (const button of actionButtons)
            setButtonDisabled(button, disabled);
    };
    const setStatus = (text) => {
        if (!disposed && statusText)
            statusText.textContent = text;
    };
    const confirm = (message) => {
        const host = window;
        return typeof host.confirm === "function" ? host.confirm(message) : true;
    };
    const listen = (button, handler) => {
        if (!button)
            return;
        button.addEventListener("command", handler);
        cleanups.push(() => button.removeEventListener("command", handler));
    };
    const setProgressVisible = (visible) => {
        if (!progressRow || disposed)
            return;
        progressRow.classList[visible ? "add" : "remove"]("is-visible");
    };
    const progressStageLabel = (stage, fallback) => {
        const normalized = stage.trim().toLowerCase();
        const keys = {
            "deploy-release-assets-probe": "pref-skillrunner-local-progress-deploy-step-1",
            "deploy-release-download-checksum": "pref-skillrunner-local-progress-deploy-step-2",
            "deploy-release-extract": "pref-skillrunner-local-progress-deploy-step-3",
            "deploy-bootstrap": "pref-skillrunner-local-progress-deploy-step-4",
            "deploy-post-bootstrap": "pref-skillrunner-local-progress-deploy-step-5",
            "uninstall-down": "pref-skillrunner-local-progress-uninstall-step-down",
            "uninstall-profile": "pref-skillrunner-local-progress-uninstall-step-profile",
        };
        if (normalized.startsWith("uninstall-delete-")) {
            return getString("pref-skillrunner-local-progress-uninstall-step-delete");
        }
        return keys[normalized] ? getString(keys[normalized]) : fallback;
    };
    const updateProgress = (details) => {
        if (disposed)
            return;
        const progress = details?.actionProgress;
        if (!progress?.action) {
            setProgressVisible(false);
            if (progressmeter)
                progressmeter.style.width = "0%";
            if (progressText)
                progressText.textContent = "";
            return;
        }
        const rawPercent = Number(progress.percent || 0);
        const percent = Number.isFinite(rawPercent)
            ? Math.max(0, Math.min(100, Math.floor(rawPercent)))
            : 0;
        const actionLabel = String(progress.action).trim().toLowerCase() === "uninstall"
            ? getString("pref-skillrunner-local-progress-uninstall-title")
            : getString("pref-skillrunner-local-progress-deploy-title");
        if (progressmeter)
            progressmeter.style.width = `${percent}%`;
        if (progressText) {
            progressText.textContent =
                `${actionLabel} ${Number(progress.current || 0)}/${Number(progress.total || 0)} · ${progressStageLabel(String(progress.stage || ""), String(progress.label || ""))}`.trim();
        }
        setProgressVisible(true);
    };
    const formatStatus = (result) => {
        const stage = String(result.stage || "")
            .trim()
            .toLowerCase();
        const keys = {
            "oneclick-plan-start": "pref-skillrunner-local-status-stage-oneclick-plan-start",
            "oneclick-plan-deploy": "pref-skillrunner-local-status-stage-oneclick-plan-deploy",
            "oneclick-preflight": "pref-skillrunner-local-status-stage-oneclick-preflight-failed",
            "oneclick-preflight-failed-fallback-deploy": "pref-skillrunner-local-status-stage-oneclick-preflight-failed",
            "oneclick-start-complete": "pref-skillrunner-local-status-stage-oneclick-start-complete",
            "oneclick-start-missing-runtime": "pref-skillrunner-local-status-stage-oneclick-start-missing-runtime",
            "oneclick-status": "pref-skillrunner-local-status-stage-oneclick-status-failed",
            "oneclick-configure-profile": "pref-skillrunner-local-status-stage-oneclick-configure-profile-failed",
            "oneclick-lease": "pref-skillrunner-local-status-stage-oneclick-lease-failed",
            "deploy-complete": "pref-skillrunner-local-status-stage-deploy-complete",
            "local-runtime-deploy-succeeded": "pref-skillrunner-local-status-stage-deploy-complete",
            "deploy-release-assets-probe": "pref-skillrunner-local-status-stage-deploy-release-assets-probe-failed",
            "deploy-release-install": "pref-skillrunner-local-status-stage-deploy-release-install-failed",
            "deploy-bootstrap": "pref-skillrunner-local-status-stage-deploy-bootstrap-failed",
            "deploy-bootstrap-report": "pref-skillrunner-local-status-stage-deploy-bootstrap-report-failed",
            "deploy-post-preflight-failed": "pref-skillrunner-local-status-stage-post-deploy-preflight-failed",
            "post-deploy-preflight": "pref-skillrunner-local-status-stage-post-deploy-preflight-failed",
            "start-complete": "pref-skillrunner-local-status-stage-start-complete",
            "start-backend": "pref-skillrunner-local-status-stage-start-backend-failed",
            "start-ensure": "pref-skillrunner-local-status-stage-start-ensure-failed",
            "stop-complete": "pref-skillrunner-local-status-stage-stop-complete",
            "stop-down": "pref-skillrunner-local-status-stage-stop-down-failed",
            "stop-status-running": "pref-skillrunner-local-status-stage-stop-status-running",
            "stop-status": "pref-skillrunner-local-status-stage-stop-status-failed",
            stop: "pref-skillrunner-local-status-stage-stop-failed",
            "uninstall-preview": "pref-skillrunner-local-status-stage-uninstall-preview",
            "uninstall-complete": "pref-skillrunner-local-status-stage-uninstall-complete",
            "uninstall-local-root": "pref-skillrunner-local-status-stage-uninstall-local-root-failed",
            "uninstall-down": "pref-skillrunner-local-status-stage-uninstall-down-failed",
            "uninstall-delete": "pref-skillrunner-local-status-stage-uninstall-delete-failed",
            "uninstall-configure-profile": "pref-skillrunner-local-status-stage-uninstall-profile-failed",
            "refresh-managed-model-cache": "pref-skillrunner-local-status-stage-refresh-model-cache",
            "open-managed-backend-page": "pref-skillrunner-local-status-stage-open-managed-backend-page",
            "open-managed-skills-folder": "pref-skillrunner-local-status-stage-open-managed-skills-folder",
        };
        const message = stage.startsWith("uninstall-delete-")
            ? getString("pref-skillrunner-local-status-stage-uninstall-delete-failed")
            : keys[stage]
                ? getString(keys[stage])
                : String(result.message || "").trim() ||
                    getString("pref-skillrunner-local-status-result-unknown");
        const prefix = result.conflict
            ? "pref-skillrunner-local-status-conflict-prefix"
            : result.ok === true
                ? "pref-skillrunner-local-status-ok-prefix"
                : "pref-skillrunner-local-status-failed-prefix";
        return `${getString(prefix)} ${message}`;
    };
    const runtimeStateLabel = (value, hasRuntimeInfo) => {
        const state = String(value || "")
            .trim()
            .toLowerCase();
        if (!hasRuntimeInfo)
            return getString("pref-skillrunner-local-runtime-state-no-runtime");
        if (state === "running")
            return getString("pref-skillrunner-local-runtime-state-running");
        if (state === "stopped")
            return getString("pref-skillrunner-local-runtime-state-stopped");
        if (state === "starting" ||
            state === "reconciling_after_heartbeat_fail" ||
            state === "degraded") {
            return getString("pref-skillrunner-local-runtime-state-reconciling");
        }
        return getString("pref-skillrunner-local-runtime-state-unknown");
    };
    const updateIndicators = (result) => {
        if (disposed)
            return null;
        const details = result.details || {};
        const state = String(details.runtimeState || "")
            .trim()
            .toLowerCase();
        const hasRuntimeInfo = details.hasRuntimeInfo === true;
        let runtimeClass = "is-gray";
        if (hasRuntimeInfo) {
            runtimeClass =
                state === "running"
                    ? "is-green"
                    : state === "starting" ||
                        state === "degraded" ||
                        state === "reconciling_after_heartbeat_fail"
                        ? "is-orange"
                        : "is-red";
        }
        if (led) {
            led.className = `zs-runtime-led ${runtimeClass}`;
            led.setAttribute("title", runtimeStateLabel(details.runtimeState, hasRuntimeInfo));
        }
        if (autoStartIcon) {
            const enabled = details.autoStartPaused === false;
            autoStartIcon.className = `zs-autostart-icon ${enabled ? "is-green" : "is-red"}`;
            autoStartIcon.setAttribute("title", getString((enabled
                ? "pref-skillrunner-local-auto-start-on"
                : "pref-skillrunner-local-auto-start-off")));
        }
        updateProgress(details);
        return details;
    };
    const applyButtonGate = (details) => {
        if (disposed)
            return;
        const state = String(details?.runtimeState || "")
            .trim()
            .toLowerCase();
        const busy = String(details?.inFlightAction || "").trim().length > 0 ||
            state === "starting";
        const running = state === "running";
        setButtonDisabled(deployButton, busy || running);
        setButtonDisabled(stopButton, busy || !running);
        setButtonDisabled(uninstallButton, busy || running || details?.hasRuntimeInfo !== true);
        setButtonDisabled(openManagementButton, busy || !running);
        setButtonDisabled(openSkillsFolderButton, busy || !running);
        setButtonDisabled(refreshModelCacheButton, busy || !running);
        setButtonDisabled(openDebugConsoleButton, !isDebugModeEnabled());
    };
    const refresh = async () => {
        if (disposed)
            return null;
        try {
            const state = (await addon.hooks.onPrefsEvent("stateSkillRunnerLocalRuntime", { window }));
            if (disposed)
                return null;
            const details = updateIndicators(state);
            applyButtonGate(details);
            return details;
        }
        catch {
            if (disposed)
                return null;
            updateIndicators({
                details: {
                    runtimeState: "unknown",
                    hasRuntimeInfo: false,
                    autoStartPaused: true,
                },
            });
            applyButtonGate(null);
            updateProgress(null);
            return null;
        }
    };
    const runAction = async (type, payload, workingKey = "pref-skillrunner-local-status-working") => {
        setButtonsDisabled(true);
        setStatus(getString(workingKey));
        try {
            const response = (await addon.hooks.onPrefsEvent(type, {
                window,
                ...payload,
            }));
            if (disposed)
                return;
            setStatus(formatStatus(response));
            await refresh();
        }
        catch (error) {
            if (disposed)
                return;
            setStatus(`${getString("pref-skillrunner-local-status-failed-prefix")} ${String(error)}`);
            await refresh();
        }
    };
    const confirmDeploy = (details) => {
        const paths = details.installLayout?.paths;
        const lines = Array.isArray(paths)
            ? paths
                .map(({ path, purpose }) => {
                const value = String(path || "").trim();
                const why = String(purpose || "").trim();
                return value ? `- ${value}${why ? ` (${why})` : ""}` : "";
            })
                .filter(Boolean)
            : [];
        return confirm([
            getString("pref-skillrunner-local-deploy-confirm-message"),
            "",
            getString("pref-skillrunner-local-deploy-confirm-layout-title"),
            ...lines,
        ]
            .filter(Boolean)
            .join("\n"));
    };
    const showUninstallOptions = () => {
        if (!uninstallOptionsDialog ||
            !uninstallOptionClearData ||
            !uninstallOptionClearAgentHome ||
            !uninstallOptionsConfirmButton ||
            !uninstallOptionsCancelButton) {
            return Promise.resolve({
                clearData: confirm(getString("pref-skillrunner-local-uninstall-option-clear-data")),
                clearAgentHome: confirm(getString("pref-skillrunner-local-uninstall-option-clear-agent-home")),
            });
        }
        uninstallOptionClearData.checked = false;
        uninstallOptionClearAgentHome.checked = false;
        uninstallOptionsDialog.classList.add("is-visible");
        return new Promise((resolve) => {
            const finish = (value) => {
                uninstallOptionsConfirmButton.removeEventListener("command", onConfirm);
                uninstallOptionsCancelButton.removeEventListener("command", onCancel);
                uninstallOptionsDialog.classList.remove("is-visible");
                dismissUninstallDialog = null;
                resolve(value);
            };
            const onConfirm = () => finish({
                clearData: uninstallOptionClearData.checked === true,
                clearAgentHome: uninstallOptionClearAgentHome.checked === true,
            });
            const onCancel = () => finish(null);
            dismissUninstallDialog = onCancel;
            uninstallOptionsConfirmButton.addEventListener("command", onConfirm);
            uninstallOptionsCancelButton.addEventListener("command", onCancel);
        });
    };
    const confirmUninstall = (details) => {
        const lines = (entries) => (entries || [])
            .map(({ path, purpose }) => {
            const value = String(path || "").trim();
            const why = String(purpose || "").trim();
            return value ? `- ${value}${why ? ` (${why})` : ""}` : "";
        })
            .filter(Boolean);
        return confirm([
            getString("pref-skillrunner-local-uninstall-final-confirm-message"),
            "",
            getString("pref-skillrunner-local-uninstall-final-confirm-remove-title"),
            ...lines(details.removableTargets),
            "",
            getString("pref-skillrunner-local-uninstall-final-confirm-preserve-title"),
            ...lines(details.preservedTargets),
        ].join("\n"));
    };
    const runOneclick = async () => {
        setButtonsDisabled(true);
        setStatus(getString("pref-skillrunner-local-status-working"));
        try {
            const plan = (await addon.hooks.onPrefsEvent("planSkillRunnerLocalRuntimeOneclick", { window }));
            if (disposed)
                return;
            if (plan.ok !== true) {
                setStatus(formatStatus(plan));
                await refresh();
                return;
            }
            const action = String(plan.details?.plannedAction || "")
                .trim()
                .toLowerCase();
            if (action === "deploy" && !confirmDeploy(plan.details || {})) {
                setStatus(getString("pref-skillrunner-local-status-cancelled"));
                await refresh();
                return;
            }
            if (disposed)
                return;
            setStatus(getString((action === "deploy"
                ? "pref-skillrunner-local-status-working-deploy"
                : "pref-skillrunner-local-status-working-start")));
            const response = (await addon.hooks.onPrefsEvent("deploySkillRunnerLocalRuntime", { window, forcedBranch: action === "start" ? "start" : "deploy" }));
            if (disposed)
                return;
            setStatus(formatStatus(response));
            await refresh();
        }
        catch (error) {
            if (disposed)
                return;
            setStatus(`${getString("pref-skillrunner-local-status-failed-prefix")} ${String(error)}`);
            await refresh();
        }
    };
    const runUninstall = async () => {
        setButtonsDisabled(true);
        setStatus(getString("pref-skillrunner-local-status-working-uninstall"));
        try {
            const options = await showUninstallOptions();
            if (disposed)
                return;
            if (!options) {
                setStatus(getString("pref-skillrunner-local-status-cancelled"));
                await refresh();
                return;
            }
            const preview = (await addon.hooks.onPrefsEvent("previewSkillRunnerLocalRuntimeUninstall", { window, ...options }));
            if (disposed)
                return;
            if (preview.ok !== true) {
                setStatus(formatStatus(preview));
                await refresh();
                return;
            }
            if (!confirmUninstall(preview.details || {})) {
                setStatus(getString("pref-skillrunner-local-status-cancelled"));
                await refresh();
                return;
            }
            if (disposed)
                return;
            const response = (await addon.hooks.onPrefsEvent("uninstallSkillRunnerLocalRuntime", { window, ...options }));
            if (disposed)
                return;
            setStatus(formatStatus(response));
            await refresh();
        }
        catch (error) {
            if (disposed)
                return;
            setStatus(`${getString("pref-skillrunner-local-status-failed-prefix")} ${String(error)}`);
            await refresh();
        }
    };
    if (openDebugConsoleButton) {
        if (isDebugModeEnabled())
            openDebugConsoleButton.removeAttribute("hidden");
        else
            openDebugConsoleButton.setAttribute("hidden", "true");
    }
    setStatus(getString("pref-skillrunner-local-status-idle"));
    updateIndicators({
        details: {
            runtimeState: "unknown",
            hasRuntimeInfo: false,
            autoStartPaused: true,
        },
    });
    void refresh();
    cleanups.push(subscribeManagedLocalRuntimeStateChange(() => {
        void refresh();
    }));
    listen(deployButton, () => void runOneclick());
    listen(stopButton, () => void runAction("stopSkillRunnerLocalRuntime", undefined, "pref-skillrunner-local-status-working-stop"));
    listen(uninstallButton, () => void runUninstall());
    if (isDebugModeEnabled()) {
        listen(openDebugConsoleButton, () => {
            void (async () => {
                try {
                    await addon.hooks.onPrefsEvent("openSkillRunnerLocalDeployDebugConsole", { window });
                }
                catch {
                    // Debug console failures do not replace runtime action feedback.
                }
                finally {
                    if (!disposed)
                        await refresh();
                }
            })();
        });
    }
    listen(openManagementButton, () => void runAction("openSkillRunnerManagedBackendPage"));
    listen(openSkillsFolderButton, () => void runAction("openSkillRunnerManagedSkillsFolder"));
    listen(refreshModelCacheButton, () => void runAction("refreshSkillRunnerManagedModelCache"));
    return () => {
        if (disposed)
            return;
        disposed = true;
        dismissUninstallDialog?.();
        for (const cleanup of cleanups.splice(0))
            cleanup();
    };
}
