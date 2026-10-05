import { assert } from "chai";
import {
  getRuntimePersistencePaths,
  ensureRuntimeDirectoryStrict,
  writeRuntimeTextFile,
} from "../../src/modules/runtimePersistence";
import { inspectPiOwner } from "../../src/modules/piOwnerPersistence";
import { loadPiProviderConfigurationState } from "../../src/modules/piProviderConfiguration";
import { listPiSkillRunRegistry } from "../../src/modules/pluginStateStore";
import { getPref, setPref } from "../../src/utils/prefs";
import { getParentPath, joinNativePath } from "../../src/platform/path";
import { createPiCapacityFixture } from "./piCapacityWorkflowDriver";
import { readDiagnosticsEnv } from "../zotero/testDiagnosticsOutput";
import { PI_RUNTIME_VERSION } from "../../src/config/piRuntimeBuild";
import {
  ZOTERO_AGENT_SETTINGS_ACTION,
  ZOTERO_AGENT_SETTINGS_ACTION_RESULT,
  ZOTERO_AGENT_SETTINGS_SNAPSHOT,
  ZOTERO_AGENT_SETTINGS_REQUEST_CLOSE,
  type ZoteroAgentSettingsActionName,
  type ZoteroAgentSettingsActionPayload,
  type ZoteroAgentSettingsSnapshot,
  type ZoteroAgentSettingsActionResultMessage,
} from "../../src/shared/zoteroAgentSettingsWireContract";

export type InstalledPiUiOwnerObservation = {
  owner: unknown;
  status: string;
  streamed: boolean;
  transcriptForms: Record<string, number>;
};

/** Reusable driver over the installed Assistant Workspace public bridge. */
export type InstalledPiUiDriver = {
  /** Sends one real public child action; no module import executes a Pi owner. */
  action(
    action: string,
    payload: Record<string, unknown>,
    ownerRef?: unknown,
  ): Promise<void>;
  /** Publication state for one owner, never another owner's latest status. */
  observation(ownerId: string): InstalledPiUiOwnerObservation | undefined;
  selectedOwner(): unknown;
  /** The installed shell window, for tab selection and DOM-level checks. */
  shellWindow(): Window;
  close(): void;
};

/**
 * Opens the installed Assistant Workspace shell and returns a driver over its
 * public bridge. Publications are folded per owner so a concurrent foreground
 * load never reads another conversation's latest status.
 */
export async function openInstalledPiUi(): Promise<InstalledPiUiDriver> {
  const win = Zotero.getMainWindow();
  if (
    !win.document.querySelector(
      '[data-zs-assistant-shell="true"][data-zs-assistant-active-target]',
    )
  )
    await plugin().hooks.onPrefsEvent("toggleAssistantSidebar", {
      window: win,
    });
  const shell = await until(() => shellWindow(win), "pi_xpi_shell_missing");
  const bridge =
    (shell as any)[BRIDGE] || (shell as any).wrappedJSObject?.[BRIDGE];
  const owners = new Map<string, InstalledPiUiOwnerObservation>();
  let selected: unknown;
  const observe = (event: MessageEvent) => {
    const data = (event as any).data;
    const publication = data?.payload?.publication;
    if (
      data?.type !== "assistant-workspace:child-publication" ||
      publication?.owner?.source !== "pi-conversations"
    )
      return;
    if (publication.publicationKind === "owner-navigation")
      selected = publication.payload?.selectedOwner ?? null;
    // `ownerKey` is the single publication owner identity.
    const ownerKey = String(publication.owner?.ownerKey ?? "");
    if (!ownerKey) return;
    const entry: InstalledPiUiOwnerObservation = owners.get(ownerKey) ?? {
      owner: publication.owner,
      status: "",
      streamed: false,
      transcriptForms: {},
    };
    if (publication.publicationKind === "owner-control")
      entry.status = String(publication.payload.status ?? "");
    if (publication.publicationKind === "transcript") {
      const form = String(publication.publicationForm ?? "");
      entry.transcriptForms[form] = (entry.transcriptForms[form] || 0) + 1;
      if (form === "delta") entry.streamed = true;
    }
    owners.set(ownerKey, entry);
  };
  shell.addEventListener("message", observe);
  await bridge.postMessage("assistant-workspace:action", { action: "ready" });
  return {
    async action(action, payload, ownerRef) {
      const result = await bridge.postMessage(
        "assistant-workspace:child-action",
        {
          source: "pi-conversations",
          actionId: `ui-${Date.now()}-${Math.random()}`,
          action,
          owner: ownerRef === undefined ? (selected ?? null) : ownerRef,
          payload,
        },
      );
      assert.isTrue(result?.ok === true, `pi_ui_action_${action}_failed`);
    },
    observation(ownerId) {
      return owners.get(ownerId);
    },
    selectedOwner() {
      return selected;
    },
    shellWindow() {
      return shell;
    },
    close() {
      shell.removeEventListener("message", observe);
    },
  };
}

// Executes only UI actions on the installed plugin. Imports above prepare
// controlled files or read durable observations; they do not execute Pi owners.
const BRIDGE = "__zsAssistantWorkspaceBridge";
const delay = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

async function until<T>(
  read: () => T | undefined | Promise<T | undefined>,
  code: string,
) {
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    const value = await read();
    if (value !== undefined) return value;
    await delay(100);
  }
  throw new Error(code);
}

function plugin() {
  const installed = (Zotero as any).ZoteroSkills;
  assert.isTrue(installed?.data?.initialized === true);
  return installed;
}

function frameWindow(frame: Element): Window | undefined {
  return (
    (frame as any).contentWindow || (frame as any).contentDocument?.defaultView
  );
}

function shellWindow(win: Window): Window | undefined {
  for (const frame of Array.from(
    win.document.querySelectorAll("browser,iframe"),
  ) as Element[]) {
    const child = frameWindow(frame);
    if (
      child &&
      child.document.readyState === "complete" &&
      child.document.documentURI.includes(
        "/sidebar/assistant-workspace.html",
      ) &&
      ((child as any)[BRIDGE] || (child as any).wrappedJSObject?.[BRIDGE])
    )
      return child;
  }
  return undefined;
}

/** Controls the real Backend Manager message surface, without importing it. */
export async function installedBackendManager() {
  const win = Zotero.getMainWindow();
  // The dialog action resolves when it closes; observe it while it is open.
  let openFailure: unknown;
  void plugin()
    .hooks.onPrefsEvent("openBackendManager", { window: win })
    .catch((error: unknown) => {
      openFailure = error;
    });
  const dialog = (await until(() => {
    if (openFailure) throw openFailure;
    return plugin().data.dialog?.window;
  }, "pi_xpi_backend_dialog_missing")) as Window;
  const frame = await until(() => {
    const element = dialog.document.querySelector("browser,iframe");
    return element ? frameWindow(element) : undefined;
  }, "pi_xpi_backend_frame_missing");
  const results = new Map<string, any>();
  let snapshot: any;
  const observe = (event: MessageEvent) => {
    const envelope = event.data;
    if (envelope?.type === "backend-manager-dialog:action-result")
      results.set(envelope.payload.action, envelope.payload);
    if (
      [
        "backend-manager-dialog:init",
        "backend-manager-dialog:snapshot",
      ].includes(envelope?.type)
    )
      snapshot = envelope.payload;
  };
  frame.addEventListener("message", observe);
  const send = (action: string, payload: Record<string, unknown> = {}) => {
    dialog.dispatchEvent(
      new (dialog as any).MessageEvent("message", {
        source: frame,
        data: { type: "backend-manager-dialog:action", action, payload },
      }),
    );
  };
  send("ready");
  await until(
    () => (snapshot?.rows ? snapshot : undefined),
    "pi_xpi_backend_snapshot_missing",
  );
  return {
    snapshot: () => snapshot,
    async action(action: string, payload: Record<string, unknown> = {}) {
      results.delete(action);
      send(action, payload);
      const result = await until(
        () => results.get(action),
        "pi_xpi_backend_action_timeout",
      );
      assert.isTrue(result.ok, `installed action ${action} must succeed`);
      return result;
    },
    send,
    close() {
      frame.removeEventListener("message", observe);
      send("cancel");
    },
  };
}

/** Observes capacity facts from the installed Dashboard's existing log surface. */
export async function observeInstalledPiAdmissions(
  observe: (fact: {
    lane: "foreground" | "background";
    activeCount: number;
    capacity: number;
    waitMs: number;
    reservedAvailable: boolean;
  }) => void,
) {
  const win = Zotero.getMainWindow();
  await plugin().hooks.onPrefsEvent("openDashboard", { window: win });
  const workspace = await until(() => {
    for (const frame of Array.from<Element>(
      win.document.querySelectorAll("browser,iframe"),
    )) {
      const child = frameWindow(frame);
      if (child?.document.getElementById("dashboard-mount")) return child;
    }
    return undefined;
  }, "pi_xpi_dashboard_missing");
  const page = await until(() => {
    const frame = workspace.document.querySelector(
      '[data-zs-role="task-dashboard-frame"]',
    );
    const child = frame && frameWindow(frame);
    return child?.document.readyState === "complete" ? child : undefined;
  }, "pi_xpi_dashboard_page_missing");
  const seen = new Set<string>();
  let diagnosticMode = false;
  const listener = (event: MessageEvent) => {
    if (!["dashboard:init", "dashboard:snapshot"].includes(event.data?.type))
      return;
    const view = event.data?.payload?.runtimeLogsView;
    if (!view) return;
    diagnosticMode = view.diagnosticMode === true;
    for (const row of view.logs || []) {
      const entry = row.detailPayload;
      if (entry?.operation !== "queue.capacity" || seen.has(entry.id)) continue;
      const fact = entry.details;
      if (
        !["foreground", "background"].includes(fact?.lane) ||
        ![fact.activeCount, fact.capacity, fact.waitMs].every(
          Number.isFinite,
        ) ||
        typeof fact.reservedAvailable !== "boolean"
      )
        continue;
      seen.add(entry.id);
      observe(fact);
    }
  };
  page.addEventListener("message", listener);
  const send = (action: string, payload: Record<string, unknown>) =>
    workspace.dispatchEvent(
      new (workspace as any).MessageEvent("message", {
        source: page,
        data: { type: "dashboard:action", action, payload },
      }),
    );
  send("select-tab", { tabKey: "runtime-logs" });
  send("runtime-logs-toggle-diagnostic", { enabled: true });
  try {
    await until(
      () => (diagnosticMode ? true : undefined),
      "pi_xpi_diagnostics_missing",
    );
  } catch (error) {
    page.removeEventListener("message", listener);
    throw error;
  }
  return () => {
    send("runtime-logs-toggle-diagnostic", { enabled: false });
    page.removeEventListener("message", listener);
  };
}

/** Drive the installed settings owner through its request-correlated public wire. */
export async function installedPiSettings() {
  await plugin().hooks.onPrefsEvent("openZoteroAgentSettings", {
    window: Zotero.getMainWindow(),
  });
  const dialog = await until(() => {
    const windows = Services.wm.getEnumerator("");
    while (windows.hasMoreElements()) {
      const win = windows.getNext() as Window;
      if (!win.closed && win.document.getElementById("zs-agent-settings-root"))
        return win;
    }
    return undefined;
  }, "pi_xpi_settings_dialog_missing");
  const frame = await until(() => {
    const element = dialog.document.querySelector("iframe");
    const window = element ? frameWindow(element) : undefined;
    return window?.document.readyState === "complete" &&
      window.document.documentURI.includes(
        "/dashboard/zotero-agent-settings.html",
      )
      ? window
      : undefined;
  }, "pi_xpi_settings_frame_missing");
  let snapshot: ZoteroAgentSettingsSnapshot | undefined;
  let snapshotRevision = 0;
  const results = new Map<
    string,
    {
      result: ZoteroAgentSettingsActionResultMessage["payload"];
      snapshotRevision: number;
    }
  >();
  const send = (
    action: ZoteroAgentSettingsActionName,
    objectId: string,
    payload: Record<string, unknown>,
  ) => {
    const requestId = `xpi-${Date.now()}-${Math.random()}`;
    dialog.dispatchEvent(
      new (dialog as any).MessageEvent("message", {
        source: frame,
        data: {
          type: ZOTERO_AGENT_SETTINGS_ACTION,
          action,
          objectId,
          requestId,
          payload,
        },
      }),
    );
    return requestId;
  };
  const observe = (event: MessageEvent) => {
    if (event.source !== dialog) return;
    const envelope = event.data;
    if (envelope?.type === ZOTERO_AGENT_SETTINGS_SNAPSHOT) {
      snapshot = envelope.payload;
      snapshotRevision++;
    }
    if (envelope?.type === ZOTERO_AGENT_SETTINGS_ACTION_RESULT)
      results.set(envelope.payload.requestId, {
        result: envelope.payload,
        snapshotRevision,
      });
    if (envelope?.type === ZOTERO_AGENT_SETTINGS_REQUEST_CLOSE)
      send("close-window", "window", {
        closeRequestId: envelope.payload.requestId,
        decision: "discard",
      });
  };
  frame.addEventListener("message", observe);
  send("ready", "window", {});
  try {
    await until(() => snapshot, "pi_xpi_settings_snapshot_missing");
  } catch (error) {
    dialog.close();
    frame.removeEventListener("message", observe);
    throw error;
  }
  return {
    snapshot: () => snapshot!,
    async action<Action extends ZoteroAgentSettingsActionName>(
      action: Action,
      objectId: string,
      payload: ZoteroAgentSettingsActionPayload<Action>,
    ) {
      const requestId = send(action, objectId, payload);
      const { result } = await until(
        () => results.get(requestId),
        "pi_xpi_settings_action_timeout",
      );
      results.delete(requestId);
      assert.isTrue(result.ok, `pi_xpi_settings_${action}_failed`);
      // The session publishes the saved view after the result. A ready round
      // trip waits for that publication before the next card/default action.
      const readyId = send("ready", "window", {});
      const ready = await until(
        () => results.get(readyId),
        "pi_xpi_settings_refresh_timeout",
      );
      results.delete(readyId);
      const revision = ready.snapshotRevision;
      await until(
        () => (snapshotRevision > revision ? true : undefined),
        "pi_xpi_settings_refresh_timeout",
      );
      return result;
    },
    async close() {
      dialog.close();
      try {
        await until(
          () => (dialog.closed ? true : undefined),
          "pi_xpi_settings_close_timeout",
        );
      } finally {
        frame.removeEventListener("message", observe);
      }
    },
  };
}

/** Configure the deterministic endpoint through the installed Agent Settings. */
export async function configureInstalledPiBackend(
  endpoint: string,
  root: string,
) {
  const overlayPath = joinNativePath(root, "models.yml");
  await writeRuntimeTextFile(
    overlayPath,
    `providers:\n  xpi-fixture:\n    api: openai-completions\n    baseUrl: ${endpoint}\n    models:\n      - id: xpi-fixture\n        contextWindow: 32000\n        maxTokens: 2048\n        input: [text]\n        supportsTools: true\n`,
  );
  // Prepare only the test-owned file reference; the installed catalog owner
  // reads and adopts it through the ordinary refresh action.
  const state = loadPiProviderConfigurationState();
  setPref(
    "piProviderConfigurationJson",
    JSON.stringify({ ...state, overlayPath }),
  );
  const manager = await installedPiSettings();
  try {
    await manager.action("pi-put-credential", "xpi-fixture-key", {
      label: "XPI fixture",
      secret: "local-fixture-only",
    });
    await manager.action("pi-refresh-overlay", "catalog", {});
    await manager.action("pi-upsert-configuration", "xpi-fixture", {
      credentialRef: "xpi-fixture-key",
      connection: {
        id: "xpi-fixture",
        kind: "custom",
        label: "XPI fixture",
        provider: "xpi-fixture",
        authVariant: "api-key",
        enabled: true,
        api: "openai-completions",
        baseUrl: endpoint,
        requiresLocalNetwork: true,
        acceptLocalNetwork: true,
      },
    });
    const existing = manager
      .snapshot()
      .state.configurations.find(
        (card) =>
          card.connectionId === "xpi-fixture" && card.modelId === "xpi-fixture",
      );
    if (!existing)
      await manager.action("pi-upsert-model", "xpi-fixture", {
        connectionId: "xpi-fixture",
        provider: "xpi-fixture",
        modelId: "xpi-fixture",
        reasoning: "off",
        enabled: true,
      });
    const card = await until(
      () =>
        manager
          .snapshot()
          .state.configurations.find(
            (entry) =>
              entry.connectionId === "xpi-fixture" &&
              entry.modelId === "xpi-fixture" &&
              entry.availability.usable,
          ),
      "pi_xpi_configuration_unavailable",
    );
    for (const purpose of ["conversation", "skillRun", "global"] as const)
      await manager.action("pi-set-defaults", card.id, {
        purpose,
        configurationId: card.id,
      });
  } finally {
    await manager.close();
  }
}

/** Confirm the run-owned settings gate in the installed plugin's native window. */
export function confirmInstalledWorkflowSettings() {
  const windows = Services.wm.getEnumerator("");
  while (windows.hasMoreElements()) {
    const win = windows.getNext() as Window;
    const frame = win.document.querySelector(
      'iframe[data-zs-role="workflow-settings-dialog-frame"]',
    ) as HTMLIFrameElement | null;
    const button = frame?.contentDocument?.querySelector(
      "button.settings-btn.primary",
    ) as HTMLButtonElement | null;
    if (button && !button.disabled) {
      button.click();
      return true;
    }
  }
  return false;
}

/** Execute the fixture by the installed Zotero Workflow menu Auto route. */
let autoAdmissionTail: Promise<void> = Promise.resolve();

export async function runInstalledPiWorkflowAuto(
  fixture: Awaited<ReturnType<typeof createPiCapacityFixture>>,
  options?: { settingsOwnedByCaller?: boolean },
) {
  const previousAdmission = autoAdmissionTail;
  let releaseAdmission!: () => void;
  autoAdmissionTail = new Promise<void>((resolve) => {
    releaseAdmission = resolve;
  });
  await previousAdmission;
  const win = Zotero.getMainWindow();
  const previousSkillDir = getPref("skillDir");
  const previousSettings = getPref("workflowSettingsJson");
  if (!options?.settingsOwnedByCaller) {
    setPref("skillDir", fixture.skillsRoot);
    setPref(
      "workflowSettingsJson",
      JSON.stringify({
        schemaVersion: 2,
        workflows: { [fixture.workflowId]: { backendId: "builtin-pi" } },
      }),
    );
  }
  try {
    await plugin().hooks.onPrefsEvent("scanWorkflows", {
      workflowsDir: fixture.workflowDir,
    });
    const before = new Set(
      listPiSkillRunRegistry().map((entry) => entry.requestId),
    );
    const popup = win.document.getElementById(
      "zotero-skills-workflows-popup",
    ) as Element | null;
    assert.exists(popup);
    popup!.dispatchEvent(
      new (win as any).Event("popupshowing", { bubbles: true }),
    );
    const menu = await until(
      () =>
        (Array.from(popup!.querySelectorAll("menuitem")) as Element[]).find(
          (entry) => entry.getAttribute("label") === "Pi Capacity Auto",
        ),
      "pi_xpi_workflow_menu_missing",
    );
    // Duplicate confirmation is synchronous; install input before doCommand.
    // Only this run-owned fixture may receive repeated input submissions.
    const confirmation = setInterval(() => {
      confirmInstalledWorkflowSettings();
      const windows = Services.wm.getEnumerator("");
      while (windows.hasMoreElements()) {
        const dialogWindow = windows.getNext() as Window;
        if (
          dialogWindow.document.documentURI !==
            "chrome://global/content/commonDialog.xhtml" ||
          !dialogWindow.document.documentElement?.textContent?.includes(
            "Pi Capacity Auto",
          )
        )
          continue;
        const dialog = dialogWindow.document.querySelector("dialog") as any;
        dialog?.getButton?.("accept")?.click();
      }
    }, 100);
    let requestId: string;
    try {
      (menu as any).doCommand();
      requestId = await until(
        () =>
          listPiSkillRunRegistry().find((entry) => !before.has(entry.requestId))
            ?.requestId,
        "pi_xpi_auto_admission_missing",
      );
    } finally {
      clearInterval(confirmation);
    }
    releaseAdmission();
    const observed = await until(async () => {
      const owner = await inspectPiOwner({
        kind: "skill_run",
        ownerId: requestId,
      });
      return owner.entries.some(
        (entry) => entry.kind === "skill_run_terminal_ack",
      )
        ? owner
        : undefined;
    }, "pi_xpi_auto_ack_missing");
    assert.isTrue(
      observed.entries.some(
        (entry) => entry.kind === "skill_run_result_sealed",
      ),
    );
    assert.isTrue(
      observed.entries.some(
        (entry) =>
          entry.kind === "skill_run_apply_receipt" &&
          (entry.payload as any).status === "succeeded",
      ),
    );
    return requestId;
  } finally {
    releaseAdmission();
    if (!options?.settingsOwnedByCaller) {
      setPref("skillDir", previousSkillDir);
      setPref("workflowSettingsJson", previousSettings);
    }
  }
}

/** Real modal confirmation input, restricted to this fixture's loopback URL. */
export function approvePiFixtureEndpoint(endpoint: string) {
  assert.isNotEmpty(endpoint, "fixture endpoint required for approval");
  const observer = {
    observe(subject: nsISupports, topic: string) {
      if (topic !== "domwindowopened") return;
      const win = subject as unknown as Window;
      win.addEventListener(
        "load",
        () => {
          if (
            win.document.documentURI !==
              "chrome://global/content/commonDialog.xhtml" ||
            !win.document.documentElement?.textContent?.includes(endpoint)
          )
            return;
          const dialog = win.document.querySelector("dialog") as any;
          dialog?.getButton?.("accept")?.click();
        },
        { once: true },
      );
    },
  };
  Services.ww.registerNotification(observer);
  return () => Services.ww.unregisterNotification(observer);
}

export async function runInstalledPiChains() {
  const endpoint = readDiagnosticsEnv("ZOTERO_TEST_PI_ENDPOINT");
  assert.isNotEmpty(
    endpoint,
    "installed chains require the deterministic external provider",
  );
  const root = joinNativePath(
    getRuntimePersistencePaths().tmpDir,
    `pi-xpi-${Date.now()}`,
  );
  const fixture = await createPiCapacityFixture({ root });
  await configureInstalledPiBackend(endpoint, root);

  if (readDiagnosticsEnv("ZOTERO_PI_CATALOG_HTTP") === "1") {
    const settings = await installedPiSettings();
    try {
      await settings.action("pi-catalog-refresh-public", "catalog", {});
      const state = settings.snapshot().catalog.state;
      assert.equal(
        state?.source,
        "current",
        "pi_xpi_official_catalog_not_adopted",
      );
      assert.equal(state?.status, "idle", "pi_xpi_official_catalog_failed");
      assert.equal(state?.runtimeVersion, PI_RUNTIME_VERSION);
      assert.isNotEmpty(state?.revision);
      const output =
        readDiagnosticsEnv("ZOTERO_PI_CATALOG_OBSERVATION_PATH") ||
        joinNativePath(root, "installed-catalog-http.json");
      await ensureRuntimeDirectoryStrict(getParentPath(output));
      await IOUtils.writeUTF8(
        output,
        JSON.stringify({
          schema: "zotero-agents.pi-installed-catalog-http.v1",
          hostVersion: String(Zotero.version),
          runtimeVersion: state!.runtimeVersion,
          revision: state!.revision,
          source: state!.source,
          observed: ["official-http"],
        }),
      );
    } finally {
      await settings.close();
    }
  }

  const firstUi = await openInstalledPiUi();
  firstUi.close();
  const ui = await openInstalledPiUi();
  const shell = ui.shellWindow();
  const approval = approvePiFixtureEndpoint(endpoint);
  try {
    const tab = await until(
      () =>
        shell.document.querySelector('[data-tab="pi-conversations"]') ||
        undefined,
      "pi_xpi_tab_missing",
    );
    (tab as HTMLElement).click();
    await ui.action("new-conversation", { groupId: "pi-conversations" }, null);
    const owner = (await until(
      () =>
        (ui.selectedOwner() ?? undefined) as
          | { ownerKey?: string; conversationId?: string }
          | undefined,
      "pi_xpi_conversation_missing",
    )) as { ownerKey: string; conversationId: string };
    const observationKey = owner.ownerKey || owner.conversationId;
    let completedTurns = 0;
    for (const prompt of [
      "[system-e2e:slow] [system-e2e:tool:zotero_context_get_current_view] read the current view",
      "[system-e2e:slow] Second turn: acknowledge the previous answer.",
    ]) {
      await ui.action("send-prompt", { message: prompt });
      completedTurns += 1;
      await until(async () => {
        const observed = await inspectPiOwner({
          kind: "conversation",
          ownerId: owner.conversationId,
        });
        const entry = ui.observation(observationKey);
        if (
          ["failed", "waiting_permission", "recovery_required"].includes(
            entry?.status || "",
          )
        )
          throw new Error("pi_xpi_turn_failed");
        return observed.entries.filter(
          (entry) => entry.kind === "turn_terminal",
        ).length >= completedTurns && entry?.status === "idle"
          ? true
          : undefined;
      }, "pi_xpi_turn_timeout");
      assert.equal(ui.observation(observationKey)?.status, "idle");
    }
    const conversation = await inspectPiOwner({
      kind: "conversation",
      ownerId: owner.conversationId,
    });
    const observedOwner = ui.observation(observationKey);
    if (!observedOwner?.streamed)
      (globalThis as any).window?.debug?.({
        kind: "pi-xpi-transcript-observation",
        transcriptForms: observedOwner?.transcriptForms || {},
      });
    assert.isTrue(
      ui.observation(observationKey)?.streamed,
      "installed streaming publication required",
    );
    assert.equal(
      conversation.entries.filter((entry) => entry.kind === "turn_terminal")
        .length,
      2,
    );
    assert.isTrue(
      conversation.entries.some((entry) => entry.kind === "tool_result"),
    );
    assert.isTrue(
      conversation.entries.some(
        (entry) =>
          entry.kind === "tool_result" &&
          (entry.payload as any).name === "zotero_context_get_current_view" &&
          (entry.payload as any).status === "completed" &&
          (entry.payload as any).effectCertainty === "not_applicable",
      ),
    );

    await ui.action("archive-conversation", {}, owner);
    await ui.action("delete-conversation", {}, owner);
    ui.close();
    const requestId = await runInstalledPiWorkflowAuto(fixture);
    const auto = await inspectPiOwner({
      kind: "skill_run",
      ownerId: requestId,
    });
    assert.isTrue(
      auto.entries.some((entry) => entry.kind === "skill_run_result_sealed"),
    );
    assert.equal(
      (
        auto.entries.find((entry) => entry.kind === "skill_run_outcome")
          ?.payload as any
      )?.result?.status,
      "succeeded",
    );
    assert.equal(
      (
        auto.entries.find(
          (entry) =>
            entry.kind === "skill_run_apply_receipt" &&
            (entry.payload as any).status === "succeeded",
        )?.payload as any
      )?.status,
      "succeeded",
    );
    return {
      conversationTurns: 2,
      autoSealed: true,
      autoApplied: true,
      autoAcknowledged: true,
    };
  } finally {
    approval();
    ui.close();
  }
}
