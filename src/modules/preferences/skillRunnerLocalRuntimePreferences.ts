import { config } from "../../../package.json";
import { getString } from "../../utils/locale";
import { isDebugModeEnabled } from "../debugMode";
import { subscribeManagedLocalRuntimeStateChange } from "../skillRunner/runtime/skillRunnerLocalRuntimeManager";

type RuntimeResult = {
  ok?: unknown;
  message?: unknown;
  conflict?: unknown;
  stage?: unknown;
  details?: Record<string, unknown>;
};

export function bindSkillRunnerLocalRuntimePreferences(window: Window) {
  const doc = window.document;
  const query = <T>(suffix: string) =>
    doc.querySelector(
      `#zotero-prefpane-${config.addonRef}-skillrunner-local-${suffix}`,
    ) as T | null;
  const deployButton = query<XUL.Button>("deploy");
  const stopButton = query<XUL.Button>("stop");
  const uninstallButton = query<XUL.Button>("uninstall");
  const openDebugConsoleButton = query<XUL.Button>("open-debug-console");
  const openManagementButton = query<XUL.Button>("open-management");
  const openSkillsFolderButton = query<XUL.Button>("open-skills-folder");
  const refreshModelCacheButton = query<XUL.Button>("refresh-model-cache");
  const led = query<HTMLElement>("runtime-led");
  const autoStartIcon = query<HTMLElement>("autostart-icon");
  const statusText = query<HTMLElement>("status-text");
  const uninstallOptionsDialog = query<HTMLElement>("uninstall-options-dialog");
  const uninstallOptionClearData = query<HTMLInputElement>(
    "uninstall-option-clear-data",
  );
  const uninstallOptionClearAgentHome = query<HTMLInputElement>(
    "uninstall-option-clear-agent-home",
  );
  const uninstallOptionsConfirmButton = query<XUL.Button>(
    "uninstall-options-confirm",
  );
  const uninstallOptionsCancelButton = query<XUL.Button>(
    "uninstall-options-cancel",
  );
  const progressRow = query<HTMLElement>("progress-row");
  const progressmeter = query<HTMLElement>("progressmeter");
  const progressText = query<HTMLElement>("progress-text");
  const actionButtons = [
    deployButton,
    stopButton,
    uninstallButton,
    openManagementButton,
    openSkillsFolderButton,
    refreshModelCacheButton,
  ].filter(Boolean) as XUL.Button[];
  const cleanups: Array<() => void> = [];
  let disposed = false;
  let dismissUninstallDialog: (() => void) | null = null;

  const setButtonDisabled = (button: XUL.Button | null, disabled: boolean) => {
    if (!button) return;
    if (disabled) button.setAttribute("disabled", "true");
    else button.removeAttribute("disabled");
  };
  const setButtonsDisabled = (disabled: boolean) => {
    for (const button of actionButtons) setButtonDisabled(button, disabled);
  };
  const setStatus = (text: string) => {
    if (!disposed && statusText) statusText.textContent = text;
  };
  const confirm = (message: string) => {
    const host = window as Window & { confirm?: (text: string) => boolean };
    return typeof host.confirm === "function" ? host.confirm(message) : true;
  };
  const listen = (button: XUL.Button | null, handler: () => void) => {
    if (!button) return;
    button.addEventListener("command", handler);
    cleanups.push(() => button.removeEventListener("command", handler));
  };

  const setProgressVisible = (visible: boolean) => {
    if (!progressRow || disposed) return;
    progressRow.classList[visible ? "add" : "remove"]("is-visible");
  };
  const progressStageLabel = (stage: string, fallback: string) => {
    const normalized = stage.trim().toLowerCase();
    const keys: Record<string, string> = {
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
    return keys[normalized] ? getString(keys[normalized] as any) : fallback;
  };
  const updateProgress = (details: Record<string, unknown> | null) => {
    if (disposed) return;
    const progress = details?.actionProgress as
      | {
          action?: unknown;
          current?: unknown;
          total?: unknown;
          percent?: unknown;
          stage?: unknown;
          label?: unknown;
        }
      | undefined;
    if (!progress?.action) {
      setProgressVisible(false);
      if (progressmeter) progressmeter.style.width = "0%";
      if (progressText) progressText.textContent = "";
      return;
    }
    const rawPercent = Number(progress.percent || 0);
    const percent = Number.isFinite(rawPercent)
      ? Math.max(0, Math.min(100, Math.floor(rawPercent)))
      : 0;
    const actionLabel =
      String(progress.action).trim().toLowerCase() === "uninstall"
        ? getString("pref-skillrunner-local-progress-uninstall-title" as any)
        : getString("pref-skillrunner-local-progress-deploy-title" as any);
    if (progressmeter) progressmeter.style.width = `${percent}%`;
    if (progressText) {
      progressText.textContent =
        `${actionLabel} ${Number(progress.current || 0)}/${Number(progress.total || 0)} · ${progressStageLabel(String(progress.stage || ""), String(progress.label || ""))}`.trim();
    }
    setProgressVisible(true);
  };
  const formatStatus = (result: RuntimeResult) => {
    const stage = String(result.stage || "")
      .trim()
      .toLowerCase();
    const keys: Record<string, string> = {
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
    const message = stage.startsWith("uninstall-delete-")
      ? getString(
          "pref-skillrunner-local-status-stage-uninstall-delete-failed" as any,
        )
      : keys[stage]
        ? getString(keys[stage] as any)
        : String(result.message || "").trim() ||
          getString("pref-skillrunner-local-status-result-unknown" as any);
    const prefix = result.conflict
      ? "pref-skillrunner-local-status-conflict-prefix"
      : result.ok === true
        ? "pref-skillrunner-local-status-ok-prefix"
        : "pref-skillrunner-local-status-failed-prefix";
    return `${getString(prefix as any)} ${message}`;
  };
  const runtimeStateLabel = (value: unknown, hasRuntimeInfo: boolean) => {
    const state = String(value || "")
      .trim()
      .toLowerCase();
    if (!hasRuntimeInfo)
      return getString(
        "pref-skillrunner-local-runtime-state-no-runtime" as any,
      );
    if (state === "running")
      return getString("pref-skillrunner-local-runtime-state-running" as any);
    if (state === "stopped")
      return getString("pref-skillrunner-local-runtime-state-stopped" as any);
    if (
      state === "starting" ||
      state === "reconciling_after_heartbeat_fail" ||
      state === "degraded"
    ) {
      return getString(
        "pref-skillrunner-local-runtime-state-reconciling" as any,
      );
    }
    return getString("pref-skillrunner-local-runtime-state-unknown" as any);
  };
  const updateIndicators = (result: RuntimeResult) => {
    if (disposed) return null;
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
      led.setAttribute(
        "title",
        runtimeStateLabel(details.runtimeState, hasRuntimeInfo),
      );
    }
    if (autoStartIcon) {
      const enabled = details.autoStartPaused === false;
      autoStartIcon.className = `zs-autostart-icon ${enabled ? "is-green" : "is-red"}`;
      autoStartIcon.setAttribute(
        "title",
        getString(
          (enabled
            ? "pref-skillrunner-local-auto-start-on"
            : "pref-skillrunner-local-auto-start-off") as any,
        ),
      );
    }
    updateProgress(details);
    return details;
  };
  const applyButtonGate = (details: Record<string, unknown> | null) => {
    if (disposed) return;
    const state = String(details?.runtimeState || "")
      .trim()
      .toLowerCase();
    const busy =
      String(details?.inFlightAction || "").trim().length > 0 ||
      state === "starting";
    const running = state === "running";
    setButtonDisabled(deployButton, busy || running);
    setButtonDisabled(stopButton, busy || !running);
    setButtonDisabled(
      uninstallButton,
      busy || running || details?.hasRuntimeInfo !== true,
    );
    setButtonDisabled(openManagementButton, busy || !running);
    setButtonDisabled(openSkillsFolderButton, busy || !running);
    setButtonDisabled(refreshModelCacheButton, busy || !running);
    setButtonDisabled(openDebugConsoleButton, !isDebugModeEnabled());
  };
  const refresh = async () => {
    if (disposed) return null;
    try {
      const state = (await addon.hooks.onPrefsEvent(
        "stateSkillRunnerLocalRuntime",
        { window },
      )) as RuntimeResult;
      if (disposed) return null;
      const details = updateIndicators(state);
      applyButtonGate(details);
      return details;
    } catch {
      if (disposed) return null;
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
  const runAction = async (
    type: string,
    payload?: Record<string, unknown>,
    workingKey = "pref-skillrunner-local-status-working",
  ) => {
    setButtonsDisabled(true);
    setStatus(getString(workingKey as any));
    try {
      const response = (await addon.hooks.onPrefsEvent(type, {
        window,
        ...payload,
      })) as RuntimeResult;
      if (disposed) return;
      setStatus(formatStatus(response));
      await refresh();
    } catch (error) {
      if (disposed) return;
      setStatus(
        `${getString("pref-skillrunner-local-status-failed-prefix" as any)} ${String(error)}`,
      );
      await refresh();
    }
  };
  const confirmDeploy = (details: Record<string, unknown>) => {
    const paths = (
      details.installLayout as {
        paths?: Array<{ path?: unknown; purpose?: unknown }>;
      }
    )?.paths;
    const lines = Array.isArray(paths)
      ? paths
          .map(({ path, purpose }) => {
            const value = String(path || "").trim();
            const why = String(purpose || "").trim();
            return value ? `- ${value}${why ? ` (${why})` : ""}` : "";
          })
          .filter(Boolean)
      : [];
    return confirm(
      [
        getString("pref-skillrunner-local-deploy-confirm-message" as any),
        "",
        getString("pref-skillrunner-local-deploy-confirm-layout-title" as any),
        ...lines,
      ]
        .filter(Boolean)
        .join("\n"),
    );
  };
  const showUninstallOptions = () => {
    if (
      !uninstallOptionsDialog ||
      !uninstallOptionClearData ||
      !uninstallOptionClearAgentHome ||
      !uninstallOptionsConfirmButton ||
      !uninstallOptionsCancelButton
    ) {
      return Promise.resolve({
        clearData: confirm(
          getString(
            "pref-skillrunner-local-uninstall-option-clear-data" as any,
          ),
        ),
        clearAgentHome: confirm(
          getString(
            "pref-skillrunner-local-uninstall-option-clear-agent-home" as any,
          ),
        ),
      });
    }
    uninstallOptionClearData.checked = false;
    uninstallOptionClearAgentHome.checked = false;
    uninstallOptionsDialog.classList.add("is-visible");
    return new Promise<{ clearData: boolean; clearAgentHome: boolean } | null>(
      (resolve) => {
        const finish = (
          value: { clearData: boolean; clearAgentHome: boolean } | null,
        ) => {
          uninstallOptionsConfirmButton.removeEventListener(
            "command",
            onConfirm,
          );
          uninstallOptionsCancelButton.removeEventListener("command", onCancel);
          uninstallOptionsDialog.classList.remove("is-visible");
          dismissUninstallDialog = null;
          resolve(value);
        };
        const onConfirm = () =>
          finish({
            clearData: uninstallOptionClearData.checked === true,
            clearAgentHome: uninstallOptionClearAgentHome.checked === true,
          });
        const onCancel = () => finish(null);
        dismissUninstallDialog = onCancel;
        uninstallOptionsConfirmButton.addEventListener("command", onConfirm);
        uninstallOptionsCancelButton.addEventListener("command", onCancel);
      },
    );
  };
  const confirmUninstall = (details: Record<string, unknown>) => {
    const lines = (
      entries: Array<{ path?: unknown; purpose?: unknown }> | undefined,
    ) =>
      (entries || [])
        .map(({ path, purpose }) => {
          const value = String(path || "").trim();
          const why = String(purpose || "").trim();
          return value ? `- ${value}${why ? ` (${why})` : ""}` : "";
        })
        .filter(Boolean);
    return confirm(
      [
        getString(
          "pref-skillrunner-local-uninstall-final-confirm-message" as any,
        ),
        "",
        getString(
          "pref-skillrunner-local-uninstall-final-confirm-remove-title" as any,
        ),
        ...lines(
          details.removableTargets as
            | Array<{ path?: unknown; purpose?: unknown }>
            | undefined,
        ),
        "",
        getString(
          "pref-skillrunner-local-uninstall-final-confirm-preserve-title" as any,
        ),
        ...lines(
          details.preservedTargets as
            | Array<{ path?: unknown; purpose?: unknown }>
            | undefined,
        ),
      ].join("\n"),
    );
  };
  const runOneclick = async () => {
    setButtonsDisabled(true);
    setStatus(getString("pref-skillrunner-local-status-working" as any));
    try {
      const plan = (await addon.hooks.onPrefsEvent(
        "planSkillRunnerLocalRuntimeOneclick",
        { window },
      )) as RuntimeResult;
      if (disposed) return;
      if (plan.ok !== true) {
        setStatus(formatStatus(plan));
        await refresh();
        return;
      }
      const action = String(plan.details?.plannedAction || "")
        .trim()
        .toLowerCase();
      if (action === "deploy" && !confirmDeploy(plan.details || {})) {
        setStatus(getString("pref-skillrunner-local-status-cancelled" as any));
        await refresh();
        return;
      }
      if (disposed) return;
      setStatus(
        getString(
          (action === "deploy"
            ? "pref-skillrunner-local-status-working-deploy"
            : "pref-skillrunner-local-status-working-start") as any,
        ),
      );
      const response = (await addon.hooks.onPrefsEvent(
        "deploySkillRunnerLocalRuntime",
        { window, forcedBranch: action === "start" ? "start" : "deploy" },
      )) as RuntimeResult;
      if (disposed) return;
      setStatus(formatStatus(response));
      await refresh();
    } catch (error) {
      if (disposed) return;
      setStatus(
        `${getString("pref-skillrunner-local-status-failed-prefix" as any)} ${String(error)}`,
      );
      await refresh();
    }
  };
  const runUninstall = async () => {
    setButtonsDisabled(true);
    setStatus(
      getString("pref-skillrunner-local-status-working-uninstall" as any),
    );
    try {
      const options = await showUninstallOptions();
      if (disposed) return;
      if (!options) {
        setStatus(getString("pref-skillrunner-local-status-cancelled" as any));
        await refresh();
        return;
      }
      const preview = (await addon.hooks.onPrefsEvent(
        "previewSkillRunnerLocalRuntimeUninstall",
        { window, ...options },
      )) as RuntimeResult;
      if (disposed) return;
      if (preview.ok !== true) {
        setStatus(formatStatus(preview));
        await refresh();
        return;
      }
      if (!confirmUninstall(preview.details || {})) {
        setStatus(getString("pref-skillrunner-local-status-cancelled" as any));
        await refresh();
        return;
      }
      if (disposed) return;
      const response = (await addon.hooks.onPrefsEvent(
        "uninstallSkillRunnerLocalRuntime",
        { window, ...options },
      )) as RuntimeResult;
      if (disposed) return;
      setStatus(formatStatus(response));
      await refresh();
    } catch (error) {
      if (disposed) return;
      setStatus(
        `${getString("pref-skillrunner-local-status-failed-prefix" as any)} ${String(error)}`,
      );
      await refresh();
    }
  };

  if (openDebugConsoleButton) {
    if (isDebugModeEnabled()) openDebugConsoleButton.removeAttribute("hidden");
    else openDebugConsoleButton.setAttribute("hidden", "true");
  }
  setStatus(getString("pref-skillrunner-local-status-idle" as any));
  updateIndicators({
    details: {
      runtimeState: "unknown",
      hasRuntimeInfo: false,
      autoStartPaused: true,
    },
  });
  void refresh();
  cleanups.push(
    subscribeManagedLocalRuntimeStateChange(() => {
      void refresh();
    }),
  );
  listen(deployButton, () => void runOneclick());
  listen(
    stopButton,
    () =>
      void runAction(
        "stopSkillRunnerLocalRuntime",
        undefined,
        "pref-skillrunner-local-status-working-stop",
      ),
  );
  listen(uninstallButton, () => void runUninstall());
  if (isDebugModeEnabled()) {
    listen(openDebugConsoleButton, () => {
      void (async () => {
        try {
          await addon.hooks.onPrefsEvent(
            "openSkillRunnerLocalDeployDebugConsole",
            { window },
          );
        } catch {
          // Debug console failures do not replace runtime action feedback.
        } finally {
          if (!disposed) await refresh();
        }
      })();
    });
  }
  listen(
    openManagementButton,
    () => void runAction("openSkillRunnerManagedBackendPage"),
  );
  listen(
    openSkillsFolderButton,
    () => void runAction("openSkillRunnerManagedSkillsFolder"),
  );
  listen(
    refreshModelCacheButton,
    () => void runAction("refreshSkillRunnerManagedModelCache"),
  );

  return () => {
    if (disposed) return;
    disposed = true;
    dismissUninstallDialog?.();
    for (const cleanup of cleanups.splice(0)) cleanup();
  };
}
