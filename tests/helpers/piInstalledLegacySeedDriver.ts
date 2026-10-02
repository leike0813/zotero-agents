/**
 * C20 XPI-upgrade legacy seed/verify driver. While the baseline XPI is active
 * it creates real legacy ACP Chat + SkillRunner configuration and history
 * through the installed plugin's own UI; later it asserts the candidate
 * preserved them. Only installed-plugin surfaces are driven and every wait is
 * bounded. Modal open/save promises are fire-and-poll, never awaited.
 */
import { assert } from "chai";
import { listStoredVisibleAcpChatSessions } from "../../src/modules/acp/chat/acpConversationStore";
import { readAcpConversationTranscriptPage } from "../../src/modules/acp/chat/acpChatWorkspaceDataPlane";
import { getRuntimePersistencePaths } from "../../src/modules/runtimePersistence";
import {
  listSkillRunnerRunEvents,
  listSkillRunnerRunRecords,
} from "../../src/modules/skillRunner/run/skillRunnerRunStore";
import { getParentPath, joinNativePath } from "../../src/platform/path";
import {
  ASSISTANT_WORKSPACE_MESSAGE_TYPES,
  ASSISTANT_WORKSPACE_SHELL_BRIDGE_KEY,
} from "../../src/shared/assistantWireContract";
import { getPref, setPref } from "../../src/utils/prefs";
import { sha256Hex } from "../../src/utils/sha256";
import {
  installedBackendManager,
  confirmInstalledWorkflowSettings,
} from "./piInstalledPluginDriver";
import {
  createPiCapacityFixture,
  PI_CAPACITY_AUTO_WORKFLOW_ID,
} from "./piCapacityWorkflowDriver";
import { readDiagnosticsEnv } from "../zotero/testDiagnosticsOutput";

const ACP_BACKEND_ID = "pi-legacy-seed-acp";
const SKILLRUNNER_BACKEND_ID = "pi-legacy-seed-sr";
/** Deterministic mock-agent trigger; the ACP fixture answers this with text. */
const SEED_PROMPT = "pi-legacy-seed: system-e2e:transcript-interleave";

type AcpHistoryIdentity = {
  backendId: string;
  conversationId: string;
  itemCount: number;
  firstItemId: string;
  lastItemId: string;
  structureDigest: string;
};

type SkillRunnerHistoryIdentity = {
  backendId: string;
  runKey: string;
  requestId: string;
  workflowId: string;
  status: string;
  eventCount: number;
  structureDigest: string;
};

/** Sanitized seed identity; only ids, counts and structural digests. */
type LegacySeed = {
  acp: AcpHistoryIdentity;
  skillrunner: SkillRunnerHistoryIdentity;
};

const BRIDGE_KEY = ASSISTANT_WORKSPACE_SHELL_BRIDGE_KEY;
/** Realized Assistant Workspace shell document. The bridge is already present
 * in about:blank before the page loads, so the document URI and completion
 * state are part of the gate. */
const SHELL_PAGE_SUFFIX = "/sidebar/assistant-workspace.html";
const delay = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

class LegacySeedAbort extends Error {}

async function until<T>(
  read: () => T | undefined | Promise<T | undefined>,
  code: string,
  timeoutMs = 120_000,
): Promise<T> {
  const deadline = Date.now() + timeoutMs;
  let lastError: unknown;
  while (Date.now() < deadline) {
    try {
      const value = await read();
      if (value !== undefined) return value;
    } catch (error) {
      if (error instanceof LegacySeedAbort) throw error;
      lastError = error;
    }
    await delay(100);
  }
  if (lastError) throw lastError;
  throw new Error(code);
}

function installedPlugin(): any {
  const plugin = (Zotero as any).ZoteroSkills;
  assert.isTrue(
    plugin?.data?.initialized === true,
    "pi_legacy_seed_installed_plugin_missing",
  );
  return plugin;
}

function frameWindow(frame: Element): Window | undefined {
  return (
    (frame as any).contentWindow || (frame as any).contentDocument?.defaultView
  );
}

function shellWindow(win: Window): Window | undefined {
  const frames = Array.from<Element>(
    (win.document as any).querySelectorAll("browser,iframe"),
  );
  for (const frame of frames) {
    const child = frameWindow(frame);
    if (!child) continue;
    const bridge =
      (child as any)[BRIDGE_KEY] ||
      (child as any).wrappedJSObject?.[BRIDGE_KEY];
    if (!bridge) continue;
    const childDocument = (child as any).document;
    const uri = String(
      childDocument?.documentURI || (child as any).location?.href || "",
    );
    if (!uri.includes(SHELL_PAGE_SUFFIX)) continue;
    if (childDocument?.readyState !== "complete") continue;
    return child;
  }
  return undefined;
}

function resolveAcpFixturePath(): string {
  const workflowDir = readDiagnosticsEnv("ZOTERO_TEST_WORKFLOW_DIR");
  const projectRoot =
    readDiagnosticsEnv("ZOTERO_COMPAT_PROJECT_ROOT") ||
    (workflowDir ? getParentPath(workflowDir) : "");
  assert.isNotEmpty(projectRoot, "pi_legacy_seed_project_root_missing");
  return joinNativePath(
    projectRoot,
    "tests",
    "fixtures",
    "acp",
    "acp-composer-reply-agent.mjs",
  );
}

async function digest(parts: readonly string[]): Promise<string> {
  const hex = await sha256Hex(new TextEncoder().encode(parts.join("\n")));
  if (!hex) throw new Error("pi_legacy_seed_hash_unavailable");
  return hex;
}

function acpStructureParts(items: readonly any[]): string[] {
  return items.map((item) => {
    const kind = String(item?.kind || "");
    if (kind === "message")
      return `message:${String(item?.role || "")}:${String(item?.state || "")}`;
    if (kind === "tool_call") return `tool_call:${String(item?.state || "")}`;
    return kind;
  });
}

// ---------------------------------------------------------------------------
// Legacy backend rows through the installed Backend Manager dialog
// ---------------------------------------------------------------------------

type BackendManager = Awaited<ReturnType<typeof installedBackendManager>>;
type BackendDraftRow = Record<string, unknown>;

/** Dismisses the modal "Backend settings saved" prompt while the dialog closes. */
function startBackendSaveAlertDismissal(
  isDialogAlive: () => boolean,
): () => void {
  const timer = setInterval(() => {
    if (!isDialogAlive()) return;
    const windows = Services.wm.getEnumerator("");
    while (windows.hasMoreElements()) {
      const win = windows.getNext() as Window;
      const dialog = win.document?.querySelector("dialog") as any;
      const accept =
        dialog?.getButton?.("accept") ||
        win.document?.querySelector('[dlgtype="accept"],#button0');
      if (accept) (accept as any).click?.();
    }
  }, 100);
  return () => clearInterval(timer);
}

async function saveBackendRows(
  manager: BackendManager,
  rows: BackendDraftRow[],
) {
  const plugin = installedPlugin();
  const isDialogAlive = () => {
    const dialogWindow = plugin.data?.dialog?.window as Window | undefined;
    return !!dialogWindow && (dialogWindow as any).closed !== true;
  };
  const stop = startBackendSaveAlertDismissal(isDialogAlive);
  try {
    // `save` persists asynchronously, raises a native alert, then closes the
    // dialog; it never posts an action-result, so completion is dialog-close.
    manager.send("save", { rows });
    await until(
      () => (isDialogAlive() ? undefined : true),
      "pi_legacy_seed_backend_save_timeout",
      60_000,
    );
  } finally {
    stop();
  }
}

async function configureLegacyBackends(args: {
  nodePath: string;
  acpFixturePath: string;
  runnerEndpoint: string;
}) {
  const manager = await installedBackendManager();
  const snapshot = manager.snapshot();
  const existing = Array.isArray(snapshot?.rows)
    ? (snapshot.rows as BackendDraftRow[])
    : [];
  const acpRow: BackendDraftRow = {
    internalId: ACP_BACKEND_ID,
    displayName: "Pi Legacy Seed ACP",
    type: "acp",
    enabled: true,
    baseUrl: "",
    authKind: "none",
    authToken: "",
    timeoutMs: "",
    command: args.nodePath,
    args: [args.acpFixturePath],
    env: [{ key: "ZOTERO_ACP_COMPOSER_E2E_MODE", value: "normal" }],
  };
  const skillRunnerRow: BackendDraftRow = {
    internalId: SKILLRUNNER_BACKEND_ID,
    displayName: "Pi Legacy Seed SkillRunner",
    type: "skillrunner",
    enabled: true,
    baseUrl: args.runnerEndpoint,
    authKind: "none",
    authToken: "",
    timeoutMs: "",
    command: "",
    args: [],
    env: [],
  };
  const seededIds = new Set([ACP_BACKEND_ID, SKILLRUNNER_BACKEND_ID]);
  const rows = [
    ...existing.filter((row) => !seededIds.has(String(row.internalId || ""))),
    acpRow,
    skillRunnerRow,
  ];
  await saveBackendRows(manager, rows);
}

// ---------------------------------------------------------------------------
// Assistant Workspace bridge seeding
// ---------------------------------------------------------------------------

async function openAssistantShell(win: Window) {
  // Fire-and-poll: openAcpSidebar may stay pending while the sidebar is open.
  void installedPlugin()
    .hooks.onPrefsEvent("openAcpSidebar", { window: win })
    .catch(() => undefined);
  const shell = await until(
    () => shellWindow(win),
    "pi_legacy_seed_shell_missing",
  );
  const bridge =
    (shell as any)[BRIDGE_KEY] || (shell as any).wrappedJSObject?.[BRIDGE_KEY];
  assert.isOk(bridge, "pi_legacy_seed_bridge_missing");
  return { shell, bridge };
}

type BridgeObserver = (publication: any) => void;

function observeChildPublications(shell: Window, observe: BridgeObserver) {
  const handler = (event: MessageEvent) => {
    if (
      event.data?.type !== ASSISTANT_WORKSPACE_MESSAGE_TYPES.CHILD_PUBLICATION
    )
      return;
    const publication = event.data?.payload?.publication;
    if (publication) observe(publication);
  };
  shell.addEventListener("message", handler);
  return () => shell.removeEventListener("message", handler);
}

async function seedAcpChatHistory(win: Window): Promise<AcpHistoryIdentity> {
  const { shell, bridge } = await openAssistantShell(win);
  const postShell = (action: string, payload: Record<string, unknown> = {}) =>
    bridge.postMessage(ASSISTANT_WORKSPACE_MESSAGE_TYPES.ACTION, {
      action,
      ...payload,
    });
  const postChild = (
    action: string,
    payload: Record<string, unknown>,
    owner: unknown = null,
  ) =>
    bridge.postMessage(ASSISTANT_WORKSPACE_MESSAGE_TYPES.CHILD_ACTION, {
      source: "acp-chat",
      actionId: `pi-legacy-seed-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      owner,
      action,
      payload,
    });

  const backendId = ACP_BACKEND_ID;
  let owner: any = null;
  let status = "";
  let groupsReady = false;
  const unsubscribe = observeChildPublications(shell, (publication) => {
    const publicationOwner = publication?.owner;
    if (publication?.publicationKind === "owner-navigation") {
      const selectedOwner = publication.payload?.selectedOwner;
      if (
        selectedOwner?.source === "acp-chat" &&
        selectedOwner.backendId === backendId
      )
        owner = selectedOwner;
      const groups = Array.isArray(publication.payload?.groups)
        ? publication.payload.groups
        : [];
      if (groups.some((group: any) => group?.groupId === backendId))
        groupsReady = true;
    }
    if (
      publication?.publicationKind === "owner-control" &&
      publicationOwner?.source === "acp-chat" &&
      publicationOwner.backendId === backendId
    ) {
      owner = owner || publicationOwner;
      status = String(publication.payload?.status || "");
    }
  });

  try {
    postShell("set-tab", { tab: "acp-chat" });
    await until(
      () => (groupsReady ? true : undefined),
      "pi_legacy_seed_acp_group_missing",
      60_000,
    );
    postChild("new-conversation", { groupId: backendId }, null);
    const acpOwner = await until(
      () => owner || undefined,
      "pi_legacy_seed_acp_owner_missing",
      60_000,
    );
    const conversationId = String(acpOwner.conversationId || "");
    assert.isNotEmpty(
      conversationId,
      "pi_legacy_seed_acp_conversation_missing",
    );

    postChild("send-prompt", { message: SEED_PROMPT }, acpOwner);
    await until(
      async () => {
        if (status === "failed")
          throw new LegacySeedAbort("pi_legacy_seed_acp_turn_failed");
        const page = await readAcpConversationTranscriptPage({
          backendId,
          conversationId,
        });
        const hasAssistant = page.items.some(
          (item) =>
            item?.kind === "message" &&
            (item as any).role === "assistant" &&
            (item as any).state === "complete",
        );
        return hasAssistant ? true : undefined;
      },
      "pi_legacy_seed_acp_turn_timeout",
      180_000,
    );

    postChild("disconnect", {}, acpOwner);
    const page = await readAcpConversationTranscriptPage({
      backendId,
      conversationId,
    });
    assert.isAtLeast(
      page.items.length,
      2,
      "pi_legacy_seed_acp_transcript_too_short",
    );
    return {
      backendId,
      conversationId,
      itemCount: page.total,
      firstItemId: String(page.items[0]?.id || ""),
      lastItemId: String(page.items[page.items.length - 1]?.id || ""),
      structureDigest: await digest(acpStructureParts(page.items)),
    };
  } finally {
    unsubscribe();
    try {
      postShell("close-sidebar");
    } catch {
      // Sidebar close is best-effort cleanup; the identity is already read.
    }
  }
}

// ---------------------------------------------------------------------------
// SkillRunner history through the real workflow menu
// ---------------------------------------------------------------------------

async function seedSkillRunnerHistory(
  win: Window,
): Promise<SkillRunnerHistoryIdentity> {
  const fixtureRoot = joinNativePath(
    getRuntimePersistencePaths().tmpDir,
    `pi-legacy-seed-${Date.now()}`,
  );
  const fixture = await createPiCapacityFixture({ root: fixtureRoot });
  const previousSkillDir = getPref("skillDir");
  const previousSettings = getPref("workflowSettingsJson");
  try {
    setPref("skillDir", fixture.skillsRoot);
    setPref(
      "workflowSettingsJson",
      JSON.stringify({
        schemaVersion: 2,
        workflows: {
          [PI_CAPACITY_AUTO_WORKFLOW_ID]: { backendId: SKILLRUNNER_BACKEND_ID },
        },
      }),
    );
    await installedPlugin().hooks.onPrefsEvent("scanWorkflows", {
      workflowsDir: fixture.workflowDir,
    });

    const before = new Set(
      listSkillRunnerRunRecords().map((run) => run.runKey),
    );
    const popup = win.document.getElementById("zotero-skills-workflows-popup");
    assert.exists(popup, "pi_legacy_seed_workflow_menu_missing");
    (popup as Element).dispatchEvent(
      new (win as any).Event("popupshowing", { bubbles: true }),
    );
    const menuItem = await until(
      () =>
        Array.from<Element>((popup as any).querySelectorAll("menuitem")).find(
          (entry) => entry.getAttribute("label") === "Pi Capacity Auto",
        ),
      "pi_legacy_seed_workflow_menu_item_missing",
      60_000,
    );
    assert.isTrue(menuItem.isConnected, "pi_legacy_seed_workflow_menu_stale");
    assert.isFalse(
      (menuItem as any).disabled === true,
      "pi_legacy_seed_workflow_menu_disabled",
    );
    const doCommand = (menuItem as any).doCommand;
    assert.isFunction(
      doCommand,
      "pi_legacy_seed_workflow_menu_command_missing",
    );
    doCommand.call(menuItem);

    const winType = win as any;
    await until(
      async () => {
        if (confirmInstalledWorkflowSettings()) return true;
        const admitted = listSkillRunnerRunRecords().some(
          (run) =>
            !before.has(run.runKey) &&
            run.workflowId === PI_CAPACITY_AUTO_WORKFLOW_ID,
        );
        if (admitted) return true;
        const alert = winType.document.querySelector(
          "dialog [dlgtype='accept'], dialog #button0",
        ) as HTMLElement | null;
        if (alert) {
          const message = String(
            winType.document.querySelector("dialog description")?.textContent ||
              "",
          );
          throw new LegacySeedAbort(
            `pi_legacy_seed_menu_command_rejected:${message || "native alert"}`,
          );
        }
        return undefined;
      },
      "pi_legacy_seed_menu_admission_missing",
      60_000,
    );

    const runKey = await until(
      () => {
        const runs = listSkillRunnerRunRecords().filter(
          (run) => !before.has(run.runKey),
        );
        const rejected = runs.find(
          (run) =>
            run.workflowId === PI_CAPACITY_AUTO_WORKFLOW_ID &&
            ["failed", "canceled"].includes(run.status),
        );
        if (rejected)
          throw new LegacySeedAbort(
            `pi_legacy_seed_sr_admission_rejected:${rejected.status}:${rejected.error || ""}`,
          );
        return runs.find(
          (run) => run.workflowId === PI_CAPACITY_AUTO_WORKFLOW_ID,
        )?.runKey;
      },
      "pi_legacy_seed_sr_admission_missing",
      180_000,
    );
    const terminal = await until(
      () => {
        const run = listSkillRunnerRunRecords().find(
          (entry) => entry.runKey === runKey,
        );
        return run && ["succeeded", "failed", "canceled"].includes(run.status)
          ? run
          : undefined;
      },
      "pi_legacy_seed_sr_terminal_timeout",
      180_000,
    );
    assert.equal(
      terminal.status,
      "succeeded",
      `pi_legacy_seed_sr_not_succeeded:${terminal.status}:${terminal.error || ""}`,
    );
    const events = listSkillRunnerRunEvents(runKey);
    return {
      backendId: String(terminal.backendId || SKILLRUNNER_BACKEND_ID),
      runKey,
      requestId: String(terminal.requestId || ""),
      workflowId: String(terminal.workflowId || ""),
      status: String(terminal.status || ""),
      eventCount: events.length,
      structureDigest: await digest(
        events.map((event) => String(event.type || "")),
      ),
    };
  } finally {
    setPref("skillDir", previousSkillDir);
    setPref("workflowSettingsJson", previousSettings);
  }
}

// ---------------------------------------------------------------------------
// Public seed / verification surface
// ---------------------------------------------------------------------------

/**
 * Creates legacy ACP Chat + SkillRunner configuration and history through the
 * installed (baseline) plugin, and returns the sanitized identity to compare
 * after the candidate is installed. Fails rather than passing on a partial
 * seed: both a completed ACP turn and a succeeded SkillRunner run are required.
 */
export async function seedInstalledLegacyHistory(): Promise<LegacySeed> {
  const win = Zotero.getMainWindow() as unknown as Window;
  const nodePath = readDiagnosticsEnv("ZOTERO_SYSTEM_E2E_NODE_PATH");
  assert.isNotEmpty(nodePath, "pi_legacy_seed_node_path_missing");
  const runnerEndpoint = readDiagnosticsEnv("ZOTERO_TEST_SKILLRUNNER_ENDPOINT");
  assert.isNotEmpty(
    runnerEndpoint,
    "pi_legacy_seed_skillrunner_endpoint_missing",
  );
  const acpFixturePath = resolveAcpFixturePath();
  assert.isTrue(
    await IOUtils.exists(acpFixturePath),
    "pi_legacy_seed_acp_fixture_missing",
  );

  await configureLegacyBackends({ nodePath, acpFixturePath, runnerEndpoint });
  const acp = await seedAcpChatHistory(win);
  const skillrunner = await seedSkillRunnerHistory(win);
  return { acp, skillrunner };
}

/**
 * Reads the persisted ACP transcript, the ACP session registry used by owner
 * navigation, and the SkillRunner run/event store, then asserts the candidate
 * preserved ids, counts and structural digests. No user content is read.
 */
export async function verifyInstalledLegacyHistory(
  seed: LegacySeed,
): Promise<LegacySeed & { preserved: boolean }> {
  const page = await readAcpConversationTranscriptPage({
    backendId: seed.acp.backendId,
    conversationId: seed.acp.conversationId,
  });
  const acp: AcpHistoryIdentity = {
    backendId: seed.acp.backendId,
    conversationId: seed.acp.conversationId,
    itemCount: page.total,
    firstItemId: String(page.items[0]?.id || ""),
    lastItemId: String(page.items[page.items.length - 1]?.id || ""),
    structureDigest: await digest(acpStructureParts(page.items)),
  };
  const listed = listStoredVisibleAcpChatSessions(seed.acp.backendId).some(
    (session) => session.conversationId === seed.acp.conversationId,
  );
  assert.isTrue(listed, "pi_legacy_seed_acp_registry_missing");
  assert.equal(
    acp.itemCount,
    seed.acp.itemCount,
    "pi_legacy_seed_acp_count_changed",
  );
  assert.equal(
    acp.firstItemId,
    seed.acp.firstItemId,
    "pi_legacy_seed_acp_first_item_changed",
  );
  assert.equal(
    acp.lastItemId,
    seed.acp.lastItemId,
    "pi_legacy_seed_acp_last_item_changed",
  );
  assert.equal(
    acp.structureDigest,
    seed.acp.structureDigest,
    "pi_legacy_seed_acp_structure_changed",
  );

  const run = listSkillRunnerRunRecords().find(
    (entry) => entry.runKey === seed.skillrunner.runKey,
  );
  if (!run) throw new Error("pi_legacy_seed_skillrunner_run_missing");
  const events = listSkillRunnerRunEvents(run.runKey);
  const skillrunner: SkillRunnerHistoryIdentity = {
    backendId: String(run.backendId || ""),
    runKey: run.runKey,
    requestId: String(run.requestId || ""),
    workflowId: String(run.workflowId || ""),
    status: String(run.status || ""),
    eventCount: events.length,
    structureDigest: await digest(
      events.map((event) => String(event.type || "")),
    ),
  };
  assert.equal(
    skillrunner.workflowId,
    seed.skillrunner.workflowId,
    "pi_legacy_seed_skillrunner_workflow_changed",
  );
  assert.equal(
    skillrunner.status,
    seed.skillrunner.status,
    "pi_legacy_seed_skillrunner_status_changed",
  );
  assert.equal(
    skillrunner.eventCount,
    seed.skillrunner.eventCount,
    "pi_legacy_seed_skillrunner_event_count_changed",
  );
  assert.equal(
    skillrunner.structureDigest,
    seed.skillrunner.structureDigest,
    "pi_legacy_seed_skillrunner_structure_changed",
  );
  return { acp, skillrunner, preserved: true };
}
