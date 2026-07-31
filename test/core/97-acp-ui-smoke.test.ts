import { assert } from "chai";
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { h, render } from "preact";
import { ASSISTANT_WORKSPACE_ACTION_REGISTRY } from "../../src/modules/assistantWorkspacePublication";
import * as AssistantPanelModel from "../../src/sidebar/assistantPanelModel.js";
import * as AssistantPanelRenderer from "../../src/sidebar/assistantPanelRenderer.js";
import * as AssistantTranscriptRenderer from "../../src/sidebar/assistantTranscriptRenderer.js";
import * as AssistantWorkspaceAcpChild from "../../src/sidebar/assistantWorkspaceAcpChild.js";
import { TranscriptRegion } from "../../src/sidebar/components/TranscriptRegion";
import { dispatchSkillRunnerWorkspaceAction } from "../../src/modules/skillRunnerRunDialog";
import { workflowSubmissionQueue } from "../../src/jobQueue/workflowSubmissionQueue";
import {
  assertRegionSubtreesPreserved,
  captureRegionSubtrees,
  createSidebarDomEnvironment,
  installSidebarDomGlobals,
  restoreSidebarDomGlobals,
  subtreeNodes,
  type SidebarDomEnvironment,
} from "../helpers/sidebarDomEnv";
import { startSkillRunnerWorkspaceSnapshotHarness } from "../helpers/skillRunnerWorkspaceSnapshotHarness";
import { createChromePanelRenderer } from "../../src/sidebar/components/chromeRenderer";
import { updateSkillRunnerRunApplyState } from "../../src/modules/skillRunnerRunStore";
import { clearPref, setPref } from "../../src/utils/prefs";

// Mirrors the ACP child's chrome wiring: region marking via the shared
// adoptPanelRegions, every managed chrome region through the Preact seam.
function chromePanelRenderer(renderer: {
  adoptPanelRegions: (panel: unknown, options: Record<string, unknown>) => void;
  managedMount: (container: HTMLElement, name: string) => HTMLElement | null;
}) {
  return createChromePanelRenderer({
    adoptPanelRegions: renderer.adoptPanelRegions,
    managedMount: renderer.managedMount,
    statusTone: AssistantPanelModel.statusTone,
  });
}

const root = path.resolve(import.meta.dirname, "../..");

async function readProjectFile(relativePath: string) {
  return readFile(path.join(root, relativePath), "utf8");
}

async function loadPanelModel() {
  return AssistantPanelModel;
}

async function loadWorkspaceChild() {
  return AssistantWorkspaceAcpChild;
}

async function loadPanelRenderer(domEnv: SidebarDomEnvironment) {
  const context = await loadAssistantRendererContext(domEnv);
  return (context.window as any).AssistantPanelRenderer;
}

async function loadTranscriptRenderer(
  domEnv: SidebarDomEnvironment,
  requestAnimationFrame?: (callback: () => void) => number,
) {
  const context = await loadAssistantRendererContext(
    domEnv,
    requestAnimationFrame,
  );
  return (context.window as any).AssistantTranscriptRenderer;
}

function createPanelManagedRegions(document: Document) {
  const root = document.createElement("div");
  const regions = {
    toolbar: document.createElement("div"),
    banner: document.createElement("div"),
    messageCounter: document.createElement("div"),
    plan: document.createElement("div"),
    hint: document.createElement("div"),
    reply: document.createElement("div"),
    drawer: document.createElement("div"),
    details: document.createElement("div"),
  };
  Object.values(regions).forEach((region) => root.appendChild(region));
  return { root, regions };
}

async function loadAssistantRendererContext(
  domEnv: SidebarDomEnvironment,
  requestAnimationFrame?: (callback: () => void) => number,
) {
  installSidebarDomGlobals(domEnv, requestAnimationFrame);
  return {
    window: {
      AssistantPanelRenderer,
      AssistantTranscriptRenderer,
    },
  };
}

function createAnimationFrameHarness() {
  let nextId = 1;
  const callbacks = new Map<number, () => void>();
  return {
    requestAnimationFrame(callback: () => void) {
      const id = nextId;
      nextId += 1;
      callbacks.set(id, callback);
      return id;
    },
    get pendingCount() {
      return callbacks.size;
    },
    flushNext() {
      const next = callbacks.entries().next().value as
        | [number, () => void]
        | undefined;
      if (!next) return false;
      callbacks.delete(next[0]);
      next[1]();
      return true;
    },
    flushAll(limit = 20) {
      let count = 0;
      while (callbacks.size > 0 && count < limit) {
        this.flushNext();
        count += 1;
      }
      assert.isBelow(count, limit, "animation frame callbacks did not settle");
    },
  };
}

function owner(source: "acp-chat" | "acp-skills", key: string) {
  return source === "acp-chat"
    ? {
        source,
        ownerKey: key,
        backendId: key.split("\n")[0],
        conversationId: key.split("\n")[1],
      }
    : { source, ownerKey: key, requestId: key };
}

function canonicalState(source: "acp-chat" | "acp-skills") {
  const selected =
    source === "acp-chat"
      ? owner(source, "backend-a\nconversation-a")
      : owner(source, "request-a");
  return {
    source,
    navigation: {
      selectedOwner: selected,
      selectedGroupId: "backend-a",
      groups: [
        { groupId: "backend-a", label: "Backend A", status: "connected" },
        { groupId: "backend-b", label: "Backend B", status: "idle" },
      ],
      entries: [
        {
          owner: selected,
          groupId: "backend-a",
          label: source === "acp-chat" ? "Research session" : "Task Alpha",
          subtitle: source === "acp-chat" ? "Backend A" : "Skill Alpha",
          description: null,
          groupLabel: "Backend A",
          status: "running",
          backendStatus: "connected",
          applyState: source === "acp-skills" ? "pending" : null,
          attention: null,
          updatedAt: "2026-07-16T00:00:00.000Z",
          messageCount: 3,
        },
      ],
      queuedEntries: [],
      canCreateOwner: source === "acp-chat",
      notice: null,
    },
    services: {
      items: [
        {
          serviceId: "host-bridge",
          label: "Host Bridge",
          status: "running",
          available: true,
          message: null,
        },
      ],
    },
    selection: {
      owner: selected,
      phase: "ready",
      control: {
        status: "running",
        busy: true,
        hint: { kind: "running", message: null },
        connection: {
          status: "connected",
          sessionAvailable: true,
          connected: true,
          canConnect: false,
          canDisconnect: true,
        },
        execution: { canCancel: true, canInterrupt: true },
        authentication: {
          required: false,
          canAuthenticate: false,
          methodId: null,
        },
        permissionPolicy: {
          autoApprove: false,
          canSetAutoApprove: source === "acp-chat",
        },
      },
      messageCounts: null,
      transcript: {
        owner: selected,
        status: "loading",
        error: null,
        page: null,
        transcriptRevision: 0,
      },
      plan: { items: [] },
      permission: { request: null },
      composer: {
        reply: { status: "enabled" },
        runtimeOptions: {
          mode: { selectedOptionId: null, options: [], enabled: false },
          model: { selectedOptionId: null, options: [], enabled: false },
          reasoningEffort: {
            selectedOptionId: null,
            options: [],
            enabled: false,
          },
        },
      },
      presentation: {
        title: source === "acp-chat" ? "Research session" : "Task Alpha",
        subtitle: source === "acp-chat" ? "Agent A" : "Skill Alpha",
        description: null,
        notice: null,
        metadata: [{ fieldId: "workflow", value: "Literature" }],
        usage: { used: 4, limit: 10, costText: null },
      },
      details: {
        status: "ready",
        title: source === "acp-chat" ? "Research session" : "Task Alpha",
        subtitle: selected.ownerKey,
        sections: [
          {
            sectionId: source === "acp-chat" ? "paths" : "run-paths",
            collapsed: false,
            items: [
              { fieldId: "workspace", value: "/tmp/run", format: "path" },
            ],
          },
        ],
        actions: ["copy-diagnostics", "open-workspace"],
        error: null,
      },
    },
  };
}

function emptyWorkspaceState(source: "acp-chat" | "acp-skills") {
  const state = canonicalState(source) as any;
  state.navigation.selectedOwner = null;
  state.selection = {
    owner: null,
    phase: "empty",
    control: null,
    presentation: null,
    composer: null,
    permission: { request: null },
    transcript: {
      owner: null,
      status: "idle",
      error: null,
      page: null,
      transcriptRevision: 0,
    },
  };
  return state;
}

function emptyPanelLabels(source: "acp-chat" | "acp-skills") {
  return {
    title: source === "acp-chat" ? "ACP Chat" : "ACP Skill Run",
    assistantPanel: {
      emptyState: {
        noConversation: "No conversation",
        noTask: "No task",
      },
    },
  };
}

describe("Assistant Workspace ACP UI v1", function () {
  after(function () {
    restoreSidebarDomGlobals();
  });

  it("loads both ACP documents through one shared child and identical roles", async function () {
    const [chat, skills] = await Promise.all([
      readProjectFile("addon/content/sidebar/acp-chat.html"),
      readProjectFile("addon/content/sidebar/acp-skill-run.html"),
    ]);
    for (const html of [chat, skills]) {
      for (const role of [
        "root",
        "toolbar",
        "banner",
        "message-counts",
        "context-drawer",
        "main",
        "transcript",
        "plan",
        "interaction",
        "composer",
        "details-drawer",
      ]) {
        assert.include(html, `data-role="${role}"`);
      }
      assert.include(html, 'src="./acp-child.bundle.js"');
      assert.include(
        html,
        "../shared/assistant/assistant-workspace-acp-child.css",
      );
      assert.notMatch(html, /data-role="main"[^>]*class="[^"]*\bhidden\b/);
      assert.match(
        html,
        /data-role="conversation"[\s\S]*data-role="empty"[\s\S]*data-role="transcript"/,
      );
      assert.notMatch(html, /aria-label="[^"]*[A-Za-z][^"]*"/);
    }
    await Promise.all(
      [
        "addon/content/sidebar/acp-chat.js",
        "addon/content/sidebar/acp-skill-run.js",
        "addon/content/sidebar/acp-chat.css",
        "addon/content/sidebar/acp-skill-run.css",
        "addon/content/shared/assistant/assistant-conversation-view.js",
      ].map(async (relativePath) => {
        let exists = true;
        try {
          await access(path.join(root, relativePath));
        } catch {
          exists = false;
        }
        assert.isFalse(exists, relativePath);
      }),
    );
  });

  it("keeps one strict bridge path without ACP postMessage fallback", async function () {
    const [child, shell, contract] = await Promise.all([
      readProjectFile("src/sidebar/assistantWorkspaceAcpChild.js"),
      readProjectFile("src/sidebar/assistantWorkspaceShell.js"),
      readProjectFile("src/shared/assistantWireContract.ts"),
    ]);
    assert.include(
      child,
      "const BRIDGE_KEY = ASSISTANT_WORKSPACE_ACP_CHILD_BRIDGE_KEY",
    );
    assert.include(contract, '"__zsAssistantWorkspaceAcpBridge"');
    assert.include(child, "bridge.sendAction(envelope)");
    assert.notInclude(child, 'type: "acp:action"');
    assert.notInclude(child, 'type: "acp-skill-run:action"');
    assert.notInclude(shell, "post-to-host-fallback");
    assert.include(shell, "post-to-host-bridge-missing");
  });

  it("projects Chat catalog, session semantics, and shared services exactly", async function () {
    const model = await loadPanelModel();
    const panel = model.projectAssistantWorkspacePanel(
      canonicalState("acp-chat"),
      { executionDisplayMode: "live" },
      {
        title: "ACP Chat",
        subtitle: "Chat with your Zotero library.",
      },
    );
    assert.isTrue(panel.exact);
    assert.equal(panel.context.title, "ACP Chat");
    assert.equal(panel.context.subtitle, "Chat with your Zotero library.");
    assert.deepEqual(
      panel.context.selectors.map((selector: any) => selector.id),
      ["backend", "owner"],
    );
    assert.deepEqual(
      panel.context.indicators.map((indicator: any) => indicator.label),
      ["Connection", "Host Bridge"],
    );
    assert.deepEqual(panel.usage, {
      used: 4,
      limit: 10,
      costText: null,
    });
    assert.isTrue(panel.reply.showUsageGauge);
    assert.equal(
      panel.context.selectors[1].options[0].label,
      "Research session",
    );
    const withoutUsage = canonicalState("acp-chat");
    withoutUsage.selection.presentation.usage = null;
    const noUsagePanel = model.projectAssistantWorkspacePanel(
      withoutUsage,
      { executionDisplayMode: "live" },
      {},
    );
    assert.isTrue(noUsagePanel.reply.showUsageGauge);
    assert.isNull(noUsagePanel.usage);
    const domEnv = createSidebarDomEnvironment();
    const { document } = domEnv;
    const renderer = await loadPanelRenderer(domEnv);
    const reply = document.createElement("div");
    renderer.renderAssistantReply(reply, noUsagePanel);
    assert.equal(
      reply.querySelector(".assistant-panel-usage-label")?.textContent,
      "N/A",
    );
  });

  for (const source of ["acp-chat", "acp-skills"] as const) {
    it(`keeps ${source} empty chrome resident and unavailable`, async function () {
      const model = await loadPanelModel();
      const panel = model.projectAssistantWorkspacePanel(
        emptyWorkspaceState(source),
        { executionDisplayMode: "live" },
        emptyPanelLabels(source),
      );

      assert.equal(
        panel.context.subtitle,
        source === "acp-chat" ? "No conversation" : "No task",
      );
      assert.deepInclude(panel.context, {
        status: "unavailable",
        statusLabel: "Unavailable",
        statusTone: "muted",
      });
      assert.deepEqual(
        panel.context.metadata.map((entry: any) => [entry.itemId, entry.value]),
        source === "acp-chat"
          ? [
              ["backend", ""],
              ["conversation", ""],
              ["workspace", ""],
            ]
          : [
              ["backend", ""],
              ["workspace", ""],
            ],
      );
      assert.deepEqual(
        panel.context.indicators.map((entry: any) => [entry.id, entry.tone]),
        [
          ["acp-connection", "muted"],
          ["host-bridge", "success"],
        ],
      );
      assert.deepEqual(
        panel.context.actions.map((entry: any) => [
          entry.action,
          entry.enabled,
        ]),
        source === "acp-chat"
          ? [
              ["new-conversation", false],
              ["connect", false],
              ["disconnect", false],
              ["authenticate", false],
              ["set-auto-approve-permissions", false],
            ]
          : [
              ["connect-run", false],
              ["disconnect-run", false],
              ["cancel-run", false],
            ],
      );
      assert.deepEqual(
        panel.actions.toolbar.map((entry: any) => entry.enabled),
        [true, false, true, true],
      );
      assert.isFalse(panel.reply.enabled);
      assert.isFalse(panel.reply.inputEnabled);
      assert.deepEqual(
        panel.reply.controls.map((entry: any) => [
          entry.id,
          entry.value,
          entry.disabled,
        ]),
        [
          ["mode", "", true],
          ["model", "", true],
          ["reasoning", "", true],
        ],
      );
      assert.isTrue(panel.reply.showUsageGauge);

      if (source === "acp-chat") {
        assert.deepEqual(
          panel.context.selectors.map((entry: any) => [
            entry.id,
            entry.value,
            entry.disabled,
          ]),
          [
            ["backend", "", true],
            ["owner", "", true],
          ],
        );
      }

      const domEnv = createSidebarDomEnvironment();
      const { document } = domEnv;
      const renderer = await loadPanelRenderer(domEnv);
      const banner = document.createElement("div");
      renderer.renderAssistantBanner(banner, panel, { onAction() {} });
      assert.deepEqual(
        Array.from(banner.querySelectorAll(".assistant-panel-meta-pill")).map(
          (entry) => entry.children[1].textContent,
        ),
        panel.context.metadata.map(() => "-"),
      );
    });
  }
  // ---------------------------------------------------------------------
  // SkillRunner tab (phase 3 Stage 3): driven through the v1 publication
  // plane exactly like production. Real run stores + mock management server
  // → runtime.schedule(SKILLRUNNER_WORKSPACE_ADAPTER) → coordinator →
  // captured publications → the shared child's createClient with
  // source "skillrunner" → the same chrome seam and transcript renderer the
  // data-source="skillrunner" child page uses.
  // ---------------------------------------------------------------------

  async function createSkillRunnerChildWindow(domEnv: SidebarDomEnvironment) {
    const { document } = domEnv;
    const panelRenderer = await loadPanelRenderer(domEnv);
    const transcriptRenderer = await loadTranscriptRenderer(domEnv);
    const { root, regions } = createPanelManagedRegions(document);
    const transcript = document.createElement("section");
    root.appendChild(transcript);
    const actions: Array<{ action: string; payload: unknown }> = [];
    const ui: Record<string, unknown> = {};
    let snapshot: any = null;
    const renderChrome = () => {
      chromePanelRenderer(panelRenderer)(
        AssistantPanelModel.projectAssistantWorkspacePanel(snapshot, ui, {}),
        {
          managed: true,
          root,
          regions,
          onAction(action: string, payload: unknown) {
            actions.push({ action, payload });
            // Panel-local drawer transitions mirror the child page.
            const sectionId = String(
              (payload as Record<string, unknown> | null)?.sectionId || "",
            );
            if (action === "toggle-drawer-section" && sectionId) {
              const key = `${sectionId}Collapsed`;
              if (sectionId === "queued" || sectionId === "completed") {
                ui[key] = ui[key] === false;
              } else {
                ui[key] = ui[key] !== true;
              }
              renderChrome();
            }
          },
        },
      );
    };
    const renderTranscript = () => {
      const region = snapshot?.selection?.transcript;
      const ownerKey = snapshot?.selection?.owner?.ownerKey || "";
      const page =
        region?.status === "ready" && region.page ? region.page : null;
      render(
        h(TranscriptRegion, {
          container: transcript,
          state: page ? "ready" : region?.status || "loading",
          message: "",
          mode: "plain",
          ownerKey,
          onResetVirtualState: (container: Element) => {
            transcriptRenderer.resetAssistantTranscriptVirtualState(
              container,
              ownerKey,
            );
            container.removeAttribute("data-assistant-transcript-order-key");
            container.removeAttribute("data-assistant-transcript-mode-key");
          },
        } as never),
        transcript as never,
      );
      if (!page) {
        return;
      }
      transcriptRenderer.renderAssistantTranscript({
        container: transcript,
        items: page.items,
        virtualized: false,
        ownerKey,
        page: {
          ...page,
          ownerKey,
          transcriptRevision: region.transcriptRevision,
        },
        transcriptRevision: region.transcriptRevision,
        mode: "plain",
        variant: "skillrunner",
        renderMarkdown: (value: string) => value,
      });
    };
    const client = AssistantWorkspaceAcpChild.createClient({
      source: "skillrunner",
      getSnapshot: () => snapshot,
      setSnapshot: (next: any) => {
        snapshot = next;
      },
      getOwnerKey: (state: any) => state?.selection?.owner?.ownerKey || "",
      render: (result: any) => {
        // Mirror the child page: render against result.snapshot; the client
        // commits it to getSnapshot only after a successful render.
        const previous = snapshot;
        snapshot = result.snapshot;
        try {
          if (result.publicationKind === "transcript") {
            renderTranscript();
          } else {
            renderChrome();
          }
        } finally {
          snapshot = previous;
        }
        return { ok: true, renderPath: "incremental", failure: null };
      },
      ack: () => {},
    });
    let applied = 0;
    return {
      root,
      regions,
      transcript,
      actions,
      getSnapshot: () => snapshot,
      async pump(
        capture: {
          flush: () => Promise<void>;
          publications: unknown[];
        },
        onApplied?: (publication: unknown) => void,
      ) {
        await capture.flush();
        const fresh: unknown[] = [];
        while (applied < capture.publications.length) {
          const publication = capture.publications[applied];
          applied += 1;
          client.apply(publication);
          onApplied?.(publication);
          fresh.push(publication);
        }
        return fresh;
      },
    };
  }

  it("renders fixed unavailable chrome for an empty SkillRunner workspace", async function () {
    const harness = await startSkillRunnerWorkspaceSnapshotHarness();
    try {
      const domEnv = createSidebarDomEnvironment();
      const childWindow = await createSkillRunnerChildWindow(domEnv);
      const capture = await harness.attachPublications();
      await childWindow.pump(capture);

      assert.isNull(
        childWindow.getSnapshot()?.selection?.owner,
        "empty workspace publishes no selected owner",
      );
      assert.equal(
        childWindow.regions.banner.querySelector(
          ".assistant-panel-banner-title",
        )?.textContent,
        "SkillRunner",
      );
      assert.equal(
        childWindow.regions.banner.querySelector(
          ".assistant-panel-banner-subtitle",
        )?.textContent,
        "No task",
      );
      const emptyIndicator = childWindow.regions.banner.querySelector(
        '[data-assistant-indicator-id="skillrunner-control"]',
      );
      assert.isOk(emptyIndicator, "empty chrome shows the control badge");
      assert.equal(emptyIndicator?.getAttribute("title"), "Unavailable");
      assert.isNull(
        childWindow.regions.banner.querySelector(
          '[data-assistant-indicator-id="acp-connection"]',
        ),
        "SkillRunner banner has no Connection LED",
      );
      const replySubmit = childWindow.regions.reply.querySelector(
        ".assistant-panel-reply-submit",
      ) as HTMLButtonElement | null;
      assert.isOk(replySubmit);
      assert.isTrue(replySubmit!.disabled);
      assert.isNull(
        childWindow.regions.reply.querySelector(".assistant-panel-usage-gauge"),
        "SkillRunner composer has no usage gauge",
      );
      assert.isNull(
        childWindow.regions.reply.querySelector(
          ".assistant-panel-reply-controls",
        ),
        "SkillRunner composer has no runtime option dropdowns",
      );
    } finally {
      await harness.reset();
    }
  });

  it("keeps a local pre-request run in preparing chrome", async function () {
    const harness = await startSkillRunnerWorkspaceSnapshotHarness();
    try {
      const seeded = harness.seedTask({ taskName: "Task Alpha" });
      const domEnv = createSidebarDomEnvironment();
      const childWindow = await createSkillRunnerChildWindow(domEnv);
      const capture = await harness.attachPublications({
        selectRunKey: seeded.runKey,
      });
      await childWindow.pump(capture);

      assert.equal(
        childWindow.getSnapshot()?.selection?.owner?.ownerKey,
        seeded.runKey,
        "unassigned local runs keep the run key as owner key",
      );
      assert.equal(
        childWindow.regions.banner.querySelector(
          ".assistant-panel-banner-title",
        )?.textContent,
        "Task Alpha",
      );
      assert.equal(
        childWindow.regions.banner
          .querySelector("[data-assistant-banner-status]")
          ?.getAttribute("data-assistant-banner-status"),
        "queued",
      );
      const preparingIndicator = childWindow.regions.banner.querySelector(
        '[data-assistant-indicator-id="skillrunner-control"]',
      );
      assert.isOk(
        preparingIndicator,
        "local pre-request run shows the control badge",
      );
      assert.equal(preparingIndicator?.getAttribute("title"), "Preparing");
      assert.isNull(
        childWindow.regions.banner.querySelector(
          '[data-assistant-indicator-id="acp-connection"]',
        ),
        "SkillRunner banner has no Connection LED",
      );
      assert.isNull(
        childWindow.regions.reply.querySelector(".assistant-panel-usage-gauge"),
        "SkillRunner composer has no usage gauge",
      );
    } finally {
      await harness.reset();
    }
  });

  it("applies SkillRunner message-count and transcript updates without rebuilding managed chrome", async function () {
    const harness = await startSkillRunnerWorkspaceSnapshotHarness();
    try {
      const toolProcess = (seq: number, toolCallId: string, text: string) => ({
        seq,
        ts: `2026-07-18T00:00:${String(seq).padStart(2, "0")}.000Z`,
        role: "assistant",
        kind: "assistant_process",
        text,
        correlation: { process_type: "tool_call", tool_call_id: toolCallId },
      });
      const seeded = harness.seedTask({
        taskName: "Task Alpha",
        requestId: "req-counts",
        status: "running",
        chatEvents: [
          {
            seq: 1,
            ts: "2026-07-18T00:00:01.000Z",
            role: "assistant",
            kind: "assistant_process",
            text: "reasoning step one",
            correlation: { process_type: "reasoning" },
          },
          toolProcess(2, "tool-1", "read a.md"),
          toolProcess(3, "tool-2", "read b.md"),
          toolProcess(4, "tool-3", "read c.md"),
          {
            seq: 5,
            ts: "2026-07-18T00:00:05.000Z",
            role: "user",
            kind: "user_message",
            text: "go on",
          },
          {
            seq: 6,
            ts: "2026-07-18T00:00:06.000Z",
            role: "assistant",
            kind: "assistant_process",
            text: "reasoning step two",
            correlation: { process_type: "reasoning" },
          },
          {
            seq: 7,
            ts: "2026-07-18T00:00:07.000Z",
            role: "assistant",
            kind: "assistant_final",
            text: "final answer",
            display_text: "final answer",
          },
        ],
      });
      const domEnv = createSidebarDomEnvironment();
      const childWindow = await createSkillRunnerChildWindow(domEnv);
      const capture = await harness.attachPublications({
        selectRunKey: seeded.runKey,
      });
      await capture.waitFor(
        (publication) =>
          publication.publicationKind === "transcript" &&
          publication.publicationForm === "snapshot" &&
          publication.payload.status === "ready" &&
          (publication.payload.page?.items || []).some(
            (item) =>
              item.itemKind === "message" && item.text === "final answer",
          ),
        "initial transcript snapshot",
      );
      await capture.waitFor(
        (publication) =>
          publication.publicationKind === "message-counts" &&
          publication.payload.counts?.cumulative.tool === 3,
        "initial message counts publication",
      );
      await childWindow.pump(capture);

      const counterValues = () =>
        Array.from(
          childWindow.regions.messageCounter.querySelectorAll(
            ".assistant-message-counter-value",
          ),
        ).map((entry) => entry.textContent);
      assert.isFalse(
        childWindow.regions.messageCounter.classList.contains("hidden"),
      );
      assert.isOk(
        childWindow.regions.messageCounter.getAttribute(
          "data-message-counter-owner",
        ),
      );
      assert.deepEqual(
        Array.from(
          childWindow.regions.messageCounter.querySelectorAll(
            ".assistant-message-counter-label",
          ),
        ).map((entry) => entry.textContent),
        ["Assistant", "Thought", "Tool"],
      );
      assert.deepEqual(counterValues(), ["1/1", "1/2", "0/3"]);
      const counterItems = Array.from(
        childWindow.regions.messageCounter.querySelectorAll(
          ".assistant-message-counter-item",
        ),
      );
      const stableRegions = [
        "toolbar",
        "banner",
        "plan",
        "hint",
        "reply",
        "drawer",
      ] as const;
      const stableSubtrees = Object.fromEntries(
        stableRegions.map((key) => [
          key,
          subtreeNodes(childWindow.regions[key].firstChild),
        ]),
      );

      harness.appendChatEvents(seeded.requestId, [
        {
          seq: 8,
          ts: "2026-07-18T00:00:08.000Z",
          role: "assistant",
          kind: "assistant_process",
          text: "reasoning step three",
          correlation: { process_type: "reasoning" },
        },
        toolProcess(9, "tool-4", "read d.md"),
      ]);
      await capture.waitFor(
        (publication) =>
          publication.publicationKind === "message-counts" &&
          publication.payload.counts?.current.thought === 2,
        "updated message counts publication",
      );
      await childWindow.pump(capture);

      assert.deepEqual(counterValues(), ["1/1", "2/3", "1/4"]);
      Array.from(
        childWindow.regions.messageCounter.querySelectorAll(
          ".assistant-message-counter-item",
        ),
      ).forEach((entry, index) => {
        assert.strictEqual(entry, counterItems[index]);
      });
      assertRegionSubtreesPreserved(
        Object.fromEntries(
          stableRegions.map((key) => [key, childWindow.regions[key]]),
        ),
        stableSubtrees,
      );
      assert.isOk(
        childWindow.transcript.querySelector("[data-assistant-item-id]"),
        "transcript rows render from the same publication stream",
      );
    } finally {
      await harness.reset();
    }
  });

  it("preserves SkillRunner managed chrome when backend history replaces the local-only transcript", async function () {
    this.timeout(10_000);
    setPref("assistantExecutionDisplayMode", "live");
    const harness = await startSkillRunnerWorkspaceSnapshotHarness();
    try {
      const seeded = harness.seedTask({
        taskName: "Managed Transcript Catch-up",
        requestId: "req-managed-transcript-catch-up",
        status: "running",
      });
      const domEnv = createSidebarDomEnvironment();
      const childWindow = await createSkillRunnerChildWindow(domEnv);
      const capture = await harness.attachPublications({
        selectRunKey: seeded.runKey,
      });
      await childWindow.pump(capture);

      const stableRegions = [
        "toolbar",
        "banner",
        "plan",
        "hint",
        "reply",
        "drawer",
      ] as const;
      const stableSubtrees = Object.fromEntries(
        stableRegions.map((key) => [
          key,
          subtreeNodes(childWindow.regions[key].firstChild),
        ]),
      );

      harness.setBackendStatus(seeded.requestId, "running");
      harness.appendChatEvents(seeded.requestId, [
        {
          seq: 1,
          ts: "2026-07-18T00:03:00.000Z",
          role: "assistant",
          kind: "assistant_process",
          text: "read backend artifact",
          correlation: {
            process_type: "tool_call",
            tool_call_id: "tool-managed-history",
          },
        },
      ]);
      await capture.waitFor(
        (publication) =>
          publication.publicationKind === "transcript" &&
          publication.publicationForm === "snapshot" &&
          (publication.payload.page?.items || []).some(
            (item) => item.itemKind === "tool-call",
          ),
        "graduated transcript snapshot",
      );
      const revisionBefore = childWindow.getSnapshot()?.selection?.transcript
        ?.transcriptRevision as number;
      await childWindow.pump(capture);

      assert.isAbove(
        childWindow.getSnapshot()?.selection?.transcript
          ?.transcriptRevision as number,
        revisionBefore,
        "the backend transcript advances the publication clock",
      );
      assert.include(
        childWindow.transcript.textContent || "",
        "read backend artifact",
      );
      assertRegionSubtreesPreserved(
        Object.fromEntries(
          stableRegions.map((key) => [key, childWindow.regions[key]]),
        ),
        stableSubtrees,
      );
    } finally {
      await harness.reset();
      clearPref("assistantExecutionDisplayMode");
    }
  });

  it("preserves SkillRunner managed mounts across selected and empty workspaces", async function () {
    const harness = await startSkillRunnerWorkspaceSnapshotHarness();
    try {
      const first = harness.seedTask({
        taskName: "Task Alpha",
        requestId: "req-a",
        status: "succeeded",
      });
      const domEnv = createSidebarDomEnvironment();
      const childWindow = await createSkillRunnerChildWindow(domEnv);
      const capture = await harness.attachPublications({
        selectRunKey: first.runKey,
      });
      await childWindow.pump(capture);
      assert.equal(
        childWindow.getSnapshot()?.selection?.owner?.ownerKey,
        first.requestId,
      );
      const identities = Object.fromEntries(
        Object.entries(childWindow.regions).map(([key, region]) => [
          key,
          region.firstChild,
        ]),
      );
      const assertMountsPreserved = () => {
        for (const [key, region] of Object.entries(childWindow.regions)) {
          // Boolean identity check: strictEqual on DOM nodes sends chai's
          // inspector into the jsdom window (localStorage throws).
          assert.isTrue(region.firstChild === identities[key], key);
        }
      };

      // Selected -> empty (archiving the only run clears the selection).
      await dispatchSkillRunnerWorkspaceAction({
        action: "archive-run",
        payload: { runKey: first.runKey },
      });
      await capture.waitFor(
        (publication) =>
          publication.publicationKind === "owner-navigation" &&
          publication.payload.selectedOwner === null,
        "owner-navigation publication with no selection",
      );
      await childWindow.pump(capture);
      assert.isNull(childWindow.getSnapshot()?.selection?.owner);
      assertMountsPreserved();

      // Empty -> selected again.
      const second = harness.seedTask({
        taskName: "Task Beta",
        requestId: "req-b",
        status: "running",
      });
      await capture.reattachHost({ selectRunKey: second.runKey });
      await childWindow.pump(capture);
      assert.equal(
        childWindow.getSnapshot()?.selection?.owner?.ownerKey,
        second.requestId,
      );
      assertMountsPreserved();
    } finally {
      await harness.reset();
    }
  });

  it("renders persisted SkillRunner Apply states and replaces only the changed task card", async function () {
    this.timeout(10_000);
    const harness = await startSkillRunnerWorkspaceSnapshotHarness();
    try {
      const applied = harness.seedTask({
        taskName: "Applied Task",
        requestId: "req-smoke-applied",
        status: "succeeded",
      });
      const applyTarget = harness.seedTask({
        taskName: "Apply Target Task",
        requestId: "req-smoke-apply-target",
        status: "succeeded",
      });
      const applyFailed = harness.seedTask({
        taskName: "Apply Failed Task",
        requestId: "req-smoke-apply-failed",
        status: "succeeded",
      });
      updateSkillRunnerRunApplyState({
        backendId: harness.backendId,
        requestId: applied.requestId,
        state: "succeeded",
        attempt: 1,
        updatedAt: "2026-07-18T00:02:01.000Z",
      });
      updateSkillRunnerRunApplyState({
        backendId: harness.backendId,
        requestId: applyFailed.requestId,
        state: "failed",
        attempt: 1,
        error: "apply write failed",
        updatedAt: "2026-07-18T00:02:02.000Z",
      });

      const domEnv = createSidebarDomEnvironment();
      const childWindow = await createSkillRunnerChildWindow(domEnv);
      const capture = await harness.attachPublications({
        selectRunKey: applied.runKey,
      });
      await capture.waitFor(
        (publication) =>
          publication.publicationKind === "owner-navigation" &&
          publication.payload.entries.length === 3,
        "owner-navigation publication with all task cards",
      );
      await childWindow.pump(capture);

      const drawer = childWindow.regions.drawer;
      // Terminal runs land in the Completed section, which starts collapsed;
      // expand it like the child page does before reading the task rows.
      const completedSection = drawer.querySelector(
        '[data-assistant-section-id="completed"]',
      );
      assert.isOk(completedSection);
      (
        completedSection!.querySelector(
          ".assistant-workspace-drawer-section-toggle",
        ) as HTMLButtonElement
      ).click();
      const rowByKey = (ownerKey: string) =>
        Array.from(drawer.querySelectorAll("[data-assistant-task-key]")).find(
          (row) => row.getAttribute("data-assistant-task-key") === ownerKey,
        );
      const axisValues = () =>
        Array.from(
          drawer.querySelectorAll(
            ".assistant-workspace-drawer-task-status-axis-value",
          ),
        ).map((entry) => entry.textContent ?? "");
      assert.includeMembers(axisValues(), [
        "Applied",
        "Not required",
        "Apply failed",
      ]);
      assert.isOk(rowByKey(applied.requestId));
      assert.isOk(rowByKey(applyTarget.requestId));
      assert.isOk(rowByKey(applyFailed.requestId));

      const drawerMount = drawer.firstChild;
      const drawerSection = drawer.querySelector(
        ".assistant-workspace-drawer-section",
      );
      const drawerGroup = drawer.querySelector(
        ".assistant-workspace-drawer-group",
      );
      const initialRows = new Map(
        [applied.requestId, applyTarget.requestId, applyFailed.requestId].map(
          (ownerKey) => [ownerKey, rowByKey(ownerKey)],
        ),
      );
      const stableRegions = Object.fromEntries(
        Object.entries(childWindow.regions).filter(([key]) => key !== "drawer"),
      );
      const stableSubtrees = captureRegionSubtrees(stableRegions);
      const transcriptSentinel = childWindow.transcript.firstChild;

      updateSkillRunnerRunApplyState({
        backendId: harness.backendId,
        requestId: applyTarget.requestId,
        state: "skipped",
        attempt: 1,
        updatedAt: "2026-07-18T00:02:03.000Z",
      });
      await capture.waitFor(
        (publication) =>
          publication.publicationKind === "owner-navigation" &&
          publication.payload.entries.some(
            (entry) =>
              entry.owner.ownerKey === applyTarget.requestId &&
              entry.applyState === "skipped",
          ),
        "owner-navigation publication with the updated apply state",
      );
      await childWindow.pump(capture);

      assert.includeMembers(axisValues(), ["Skipped"]);
      // Boolean identity checks: strictEqual on DOM nodes sends chai's
      // inspector into the jsdom window (localStorage throws).
      assert.isTrue(drawer.firstChild === drawerMount);
      assert.isTrue(
        drawer.querySelector(".assistant-workspace-drawer-section") ===
          drawerSection,
      );
      assert.isTrue(
        drawer.querySelector(".assistant-workspace-drawer-group") ===
          drawerGroup,
      );
      assert.isTrue(
        rowByKey(applied.requestId) === initialRows.get(applied.requestId),
      );
      // The canonical drawer patches rows in place: the changed card keeps
      // its node and shows the new apply state, every other card is untouched.
      assert.isTrue(
        rowByKey(applyTarget.requestId) ===
          initialRows.get(applyTarget.requestId),
      );
      assert.include(
        rowByKey(applyTarget.requestId)?.textContent || "",
        "Skipped",
      );
      assert.isTrue(
        rowByKey(applyFailed.requestId) ===
          initialRows.get(applyFailed.requestId),
      );
      assertRegionSubtreesPreserved(stableRegions, stableSubtrees);
      assert.isTrue(childWindow.transcript.firstChild === transcriptSentinel);
    } finally {
      await harness.reset();
    }
  });

  it("renders the SkillRunner queued section collapsed with a cancel action", async function () {
    this.timeout(10_000);
    workflowSubmissionQueue.resetForTests();
    const harness = await startSkillRunnerWorkspaceSnapshotHarness();
    let releaseFirst!: () => void;
    const firstGate = new Promise<void>((resolve) => {
      releaseFirst = resolve;
    });
    try {
      const running = harness.seedTask({
        taskName: "Running Task",
        requestId: "req-queued-running",
        status: "waiting_user",
      });
      workflowSubmissionQueue.enqueueSubmission({
        backend: {
          backendType: "skillrunner",
          backendId: harness.backendId,
        },
        workflow: {
          workflowId: "literature-digest",
          workflowLabel: "Literature Digest",
        },
        units: ["u1", "u2"].map((unitId, order) => ({
          unit: unitId,
          display: {
            unitId,
            order,
            taskName: `Queued Task ${unitId}`,
            inputUnitIdentity: `test:${unitId}`,
          },
        })),
        maxConcurrency: 1,
        executeUnit: async (unitId) => {
          if (unitId === "u1") await firstGate;
          return { status: "succeeded" };
        },
      });
      const domEnv = createSidebarDomEnvironment();
      const childWindow = await createSkillRunnerChildWindow(domEnv);
      const capture = await harness.attachPublications({
        selectRunKey: running.runKey,
      });
      await capture.waitFor(
        (publication) =>
          publication.publicationKind === "owner-navigation" &&
          publication.payload.queuedEntries.length === 1,
        "owner-navigation publication with the queued entry",
      );
      await childWindow.pump(capture);

      const drawer = childWindow.regions.drawer;
      const queued = drawer.querySelector(
        '[data-assistant-section-id="queued"]',
      );
      assert.isOk(queued, "the queued section renders from publications");
      assert.include(queued!.className, "is-collapsed");
      assert.isNull(
        queued!.querySelector("[data-assistant-task-key]"),
        "the collapsed queued section hides its task rows",
      );

      (
        queued!.querySelector(
          ".assistant-workspace-drawer-section-toggle",
        ) as HTMLButtonElement
      ).click();
      const expanded = drawer.querySelector(
        '[data-assistant-section-id="queued"]',
      );
      const row = expanded?.querySelector("[data-assistant-task-key]");
      assert.isOk(row, "expanding the queued section renders the queued task");
      assert.include(row!.textContent || "", "Queued Task u2");
      const cancel = row!.querySelector<HTMLButtonElement>(
        ".assistant-workspace-drawer-task-action",
      );
      assert.isOk(cancel);
      cancel!.click();
      const emitted = childWindow.actions.find(
        (entry) => entry.action === "cancel-queued-workflow-unit",
      );
      assert.isOk(emitted, "the queued task emits its cancel action");
      assert.isOk(
        String((emitted?.payload as Record<string, unknown>)?.queueId || ""),
      );
    } finally {
      releaseFirst();
      workflowSubmissionQueue.resetForTests();
      await harness.reset();
    }
  });

  it("switches SkillRunner owners loading-first through the child transcript region", async function () {
    this.timeout(10_000);
    const harness = await startSkillRunnerWorkspaceSnapshotHarness();
    try {
      const first = harness.seedTask({
        taskName: "Switch A",
        requestId: "req-switch-a",
        status: "waiting_user",
        chatEvents: [
          { seq: 1, role: "assistant", kind: "assistant_final", text: "alpha" },
        ],
      });
      const second = harness.seedTask({
        taskName: "Switch B",
        requestId: "req-switch-b",
        status: "waiting_user",
        chatEvents: [
          { seq: 1, role: "assistant", kind: "assistant_final", text: "beta" },
        ],
      });
      const domEnv = createSidebarDomEnvironment();
      const childWindow = await createSkillRunnerChildWindow(domEnv);
      const capture = await harness.attachPublications({
        selectRunKey: first.runKey,
      });
      await capture.waitFor(
        (publication) =>
          publication.publicationKind === "transcript" &&
          publication.publicationForm === "snapshot" &&
          publication.payload.status === "ready" &&
          publication.owner.ownerKey === first.requestId &&
          (publication.payload.page?.items || []).some(
            (item) => item.itemKind === "message" && item.text === "alpha",
          ),
        "initial transcript snapshot for A",
      );
      await childWindow.pump(capture);
      assert.include(childWindow.transcript.textContent || "", "alpha");

      await dispatchSkillRunnerWorkspaceAction({
        action: "select-task",
        payload: { taskKey: second.runKey },
      });
      await capture.waitFor(
        (publication) =>
          publication.publicationKind === "transcript" &&
          publication.publicationForm === "snapshot" &&
          publication.payload.status === "ready" &&
          publication.owner.ownerKey === second.requestId &&
          (publication.payload.page?.items || []).some(
            (item) => item.itemKind === "message" && item.text === "beta",
          ),
        "ready transcript snapshot for B",
      );
      const states: string[] = [];
      await childWindow.pump(capture, () => {
        const loading = childWindow.transcript.querySelector(
          '[data-assistant-transcript-state="loading"]',
        );
        const rows = childWindow.transcript.querySelectorAll(
          "[data-assistant-item-id]",
        );
        states.push(loading ? "loading" : rows.length > 0 ? "ready" : "other");
      });

      assert.include(states, "loading", "owner switch shows loading first");
      assert.isBelow(
        states.indexOf("loading"),
        states.lastIndexOf("ready"),
        "the loading state precedes the ready transcript",
      );
      assert.include(childWindow.transcript.textContent || "", "beta");
      assert.equal(
        childWindow.regions.banner.querySelector(
          ".assistant-panel-banner-title",
        )?.textContent,
        "Switch B",
      );
    } finally {
      await harness.reset();
    }
  });

  it("routes a typed SkillRunner option through the canonical select-interaction-option action", async function () {
    const harness = await startSkillRunnerWorkspaceSnapshotHarness();
    try {
      const seeded = harness.seedTask({
        taskName: "Typed Option Task",
        requestId: "req-typed-option",
        status: "waiting_user",
        pending: {
          interaction_id: 7,
          kind: "choose_one",
          prompt: "Choose",
          options: [
            {
              label: "Continue deeply",
              value: { depth: 2, continue: true },
            },
          ],
        },
      });
      const domEnv = createSidebarDomEnvironment();
      const childWindow = await createSkillRunnerChildWindow(domEnv);
      const capture = await harness.attachPublications({
        selectRunKey: seeded.runKey,
      });
      await capture.waitFor(
        (publication) =>
          publication.publicationKind === "owner-control" &&
          publication.payload.interaction?.inputKind === "choose_one",
        "waiting_user owner-control publication",
      );
      await childWindow.pump(capture);

      const button = childWindow.regions.hint.querySelector<HTMLElement>(
        ".assistant-panel-hint-option",
      );
      assert.isOk(button);
      button!.click();
      assert.deepEqual(childWindow.actions, [
        {
          action: "select-interaction-option",
          payload: {
            responseValue: { depth: 2, continue: true },
            responseLabel: "Continue deeply",
          },
        },
      ]);
    } finally {
      await harness.reset();
    }
  });

  for (const source of ["acp-chat", "acp-skills"] as const) {
    it(`keeps current ${source} runtime option values visible while prompt controls are disabled`, async function () {
      const state = canonicalState(source);
      state.selection.composer = {
        reply: { status: "busy" },
        runtimeOptions: {
          mode: {
            selectedOptionId: "code",
            options: [{ optionId: "code", label: "Code", description: null }],
            enabled: true,
          },
          model: {
            selectedOptionId: "model-a",
            options: [
              { optionId: "model-a", label: "Model A", description: null },
            ],
            enabled: false,
          },
          reasoningEffort: {
            selectedOptionId: "high",
            options: [{ optionId: "high", label: "High", description: null }],
            enabled: false,
          },
        },
      };
      const panel = AssistantPanelModel.projectAssistantWorkspacePanel(
        state,
        { executionDisplayMode: "live" },
        {},
      );
      assert.deepEqual(
        panel.reply.controls.map((entry: any) => [
          entry.id,
          entry.value,
          entry.disabled,
        ]),
        [
          ["mode", "code", false],
          ["model", "model-a", true],
          ["reasoning", "high", true],
        ],
      );

      const domEnv = createSidebarDomEnvironment();
      const { document } = domEnv;
      const renderer = await loadPanelRenderer(domEnv);
      const reply = document.createElement("div");
      renderer.renderAssistantReply(reply, panel);
      const selects = Array.from(
        reply.querySelectorAll<HTMLSelectElement>(".assistant-panel-select"),
      );
      assert.deepEqual(
        selects.map((entry) => entry.disabled),
        [false, true, true],
      );
      assert.deepEqual(
        selects.map(
          (select) =>
            Array.from(select.children).find(
              (option) => (option as HTMLOptionElement).selected,
            )?.textContent,
        ),
        ["Code", "Model A", "High"],
      );
    });
  }

  it("refreshes only the Chat banner when auto-approval changes", async function () {
    const domEnv = createSidebarDomEnvironment();
    const { document } = domEnv;
    const renderer = await loadPanelRenderer(domEnv);
    const { root, regions } = createPanelManagedRegions(document);
    const state = canonicalState("acp-chat");
    const render = () =>
      chromePanelRenderer(renderer)(
        AssistantPanelModel.projectAssistantWorkspacePanel(state, {}, {}),
        { managed: true, root, regions, onAction() {} },
      );

    render();
    const regionSubtrees = captureRegionSubtrees(regions);
    assert.equal(
      regions.banner
        .querySelector(".assistant-panel-switch-action")
        ?.getAttribute("data-assistant-switch-state"),
      "off",
    );

    state.selection.control.permissionPolicy.autoApprove = true;
    render();

    assert.equal(
      regions.banner
        .querySelector(".assistant-panel-switch-action")
        ?.getAttribute("data-assistant-switch-state"),
      "on",
    );
    const nonBannerRegions = Object.fromEntries(
      Object.entries(regions).filter(([key]) => key !== "banner"),
    );
    assertRegionSubtreesPreserved(nonBannerRegions, regionSubtrees);
  });

  it("projects Skills title, subtitle, banner metadata, and task status axes", async function () {
    const model = await loadPanelModel();
    const panel = model.projectAssistantWorkspacePanel(
      canonicalState("acp-skills"),
      { executionDisplayMode: "boundary", completedCollapsed: false },
      {},
    );
    assert.equal(panel.context.title, "Task Alpha");
    assert.equal(panel.context.subtitle, "Skill Alpha");
    assert.deepInclude(panel.context.metadata, {
      itemId: "workflow",
      label: "Workflow",
      value: "Literature",
    });
    const task = panel.drawers.sections[0].groups[0].activeTasks[0];
    assert.equal(task.workflowLabel, "Skill Alpha");
    assert.equal(task.backendStatus, "connected");
    assert.equal(task.applyStatus, "pending");
    assert.equal(panel.actions.toolbar[3].value, "boundary");
    assert.equal(panel.actions.toolbar[3].align, "end");
  });

  it("projects source-aware ACP drawers without empty backend groups", async function () {
    const model = await loadPanelModel();
    const chatState = canonicalState("acp-chat") as any;
    const chatPanel = model.projectAssistantWorkspacePanel(
      chatState,
      { completedCollapsed: false },
      {},
    );
    assert.deepEqual(
      chatPanel.drawers.sections.map((section: any) => [
        section.id,
        section.hideTitle,
        section.groups.map((group: any) => group.backendId),
      ]),
      [["sessions", true, ["backend-a"]]],
    );

    const skillsState = canonicalState("acp-skills") as any;
    skillsState.navigation.groups.push({
      groupId: "backend-c",
      label: "Backend C",
      status: "idle",
    });
    skillsState.navigation.entries.push({
      owner: owner("acp-skills", "request-c"),
      groupId: "backend-c",
      label: "Task Complete",
      subtitle: "Skill Complete",
      groupLabel: "Backend C",
      status: "succeeded",
      backendStatus: "idle",
      applyState: "succeeded",
      updatedAt: "2026-07-17T00:00:00.000Z",
      messageCount: 1,
    });
    skillsState.navigation.queuedEntries.push({
      queueId: "queue-b",
      groupId: "backend-b",
      label: "Queued Paper",
      subtitle: "Queued Workflow",
      groupLabel: "Backend B",
      updatedAt: "2026-07-17T01:00:00.000Z",
      canCancel: true,
    });
    const skillsPanel = model.projectAssistantWorkspacePanel(
      skillsState,
      {
        runningCollapsed: false,
        queuedCollapsed: true,
        completedCollapsed: true,
      },
      {
        assistantPanel: {
          drawer: {
            running: "运行中",
            queued: "排队中",
            completed: "已完成",
          },
          actions: {
            cancelQueuedWorkflowUnit: "取消排队任务",
          },
        },
      },
    );
    assert.deepEqual(
      skillsPanel.drawers.sections.map((section: any) => [
        section.id,
        section.title,
        section.collapsible,
        section.collapsed,
        section.groups.map((group: any) => group.backendId),
      ]),
      [
        ["running", "运行中", true, false, ["backend-a"]],
        ["queued", "排队中", true, true, ["backend-b"]],
        ["completed", "已完成", true, true, ["backend-c"]],
      ],
    );
    const queuedTask = skillsPanel.drawers.sections[1].groups[0].activeTasks[0];
    assert.isFalse(queuedTask.selectable);
    assert.equal(queuedTask.stateLabel, "排队中");
    assert.equal(queuedTask.itemActions[0].label, "取消排队任务");
    assert.deepEqual(queuedTask.itemActions[0].payload, {
      queueId: "queue-b",
    });
  });

  it("renders semantic task-drawer section classes and routes every collapse toggle", async function () {
    const domEnv = createSidebarDomEnvironment();
    const { document } = domEnv;
    const model = await loadPanelModel();
    const renderer = await loadPanelRenderer(domEnv);
    const { root, regions } = createPanelManagedRegions(document);
    const state = canonicalState("acp-skills") as any;
    state.navigation.entries.push({
      owner: owner("acp-skills", "request-c"),
      groupId: "backend-a",
      label: "Task Complete",
      subtitle: "Skill Complete",
      groupLabel: "Backend A",
      status: "succeeded",
      backendStatus: "idle",
      applyState: "succeeded",
      updatedAt: "2026-07-17T00:00:00.000Z",
      messageCount: 1,
    });
    state.navigation.queuedEntries.push({
      queueId: "queue-a",
      groupId: "backend-a",
      label: "Queued Paper",
      subtitle: "Queued Workflow",
      groupLabel: "Backend A",
      updatedAt: "2026-07-17T01:00:00.000Z",
      canCancel: true,
    });
    const actions: Array<{ action: string; payload: unknown }> = [];
    chromePanelRenderer(renderer)(
      model.projectAssistantWorkspacePanel(
        state,
        {
          runningCollapsed: false,
          queuedCollapsed: false,
          completedCollapsed: false,
        },
        {},
      ),
      {
        managed: true,
        root,
        regions,
        onAction(action: string, payload: unknown) {
          actions.push({ action, payload });
        },
      },
    );

    const sections = Array.from(
      regions.drawer.querySelectorAll(".assistant-workspace-drawer-section"),
    );
    assert.deepEqual(
      sections.map((section) =>
        ["running", "queued", "completed"].find((id) =>
          section.classList.contains(`is-${id}`),
        ),
      ),
      ["running", "queued", "completed"],
    );
    Array.from(
      regions.drawer.querySelectorAll<HTMLElement>(
        ".assistant-workspace-drawer-section-toggle",
      ),
    ).forEach((toggle) => {
      toggle.click();
    });
    assert.deepEqual(actions, [
      {
        action: "toggle-drawer-section",
        payload: { sectionId: "running" },
      },
      {
        action: "toggle-drawer-section",
        payload: { sectionId: "queued" },
      },
      {
        action: "toggle-drawer-section",
        payload: { sectionId: "completed" },
      },
    ]);
  });

  it("preserves non-drawer managed regions across queue-only updates", async function () {
    const domEnv = createSidebarDomEnvironment();
    const { document } = domEnv;
    const model = await loadPanelModel();
    const renderer = await loadPanelRenderer(domEnv);
    const { root, regions } = createPanelManagedRegions(document);
    const state = canonicalState("acp-skills") as any;
    const render = () =>
      chromePanelRenderer(renderer)(
        model.projectAssistantWorkspacePanel(
          state,
          { queuedCollapsed: false, completedCollapsed: true },
          {},
        ),
        { managed: true, root, regions, onAction() {} },
      );

    render();
    const stableRegions = Object.fromEntries(
      Object.entries(regions).filter(([key]) => key !== "drawer"),
    );
    const stableSubtrees = captureRegionSubtrees(stableRegions);
    state.navigation.queuedEntries.push({
      queueId: "queue-a",
      groupId: "backend-a",
      label: "Queued Paper",
      subtitle: "Queued Workflow",
      groupLabel: "Backend A",
      updatedAt: "2026-07-17T01:00:00.000Z",
      canCancel: true,
    });
    render();
    assertRegionSubtreesPreserved(stableRegions, stableSubtrees);
  });

  it("preserves managed drawer identity when only an empty navigation backend is added", async function () {
    const domEnv = createSidebarDomEnvironment();
    const { document } = domEnv;
    const model = await loadPanelModel();
    const renderer = await loadPanelRenderer(domEnv);
    const { root, regions } = createPanelManagedRegions(document);
    const state = canonicalState("acp-chat") as any;
    const render = () =>
      chromePanelRenderer(renderer)(
        model.projectAssistantWorkspacePanel(state, {}, {}),
        { managed: true, root, regions, onAction() {} },
      );

    render();
    const drawerIdentity = regions.drawer.firstChild;
    state.navigation.groups.push({
      groupId: "backend-empty",
      label: "Backend Empty",
      status: "idle",
    });
    render();

    assert.strictEqual(regions.drawer.firstChild, drawerIdentity);
  });

  it("restores the disconnected Chat banner without treating remote identity as live", async function () {
    const model = await loadPanelModel();
    const state = canonicalState("acp-chat");
    state.selection.control = {
      ...state.selection.control,
      status: "idle",
      busy: false,
      hint: { kind: "notice", message: "end_turn" },
      connection: {
        status: "idle",
        sessionAvailable: true,
        connected: false,
        canConnect: true,
        canDisconnect: false,
      },
      authentication: {
        required: false,
        canAuthenticate: false,
        methodId: null,
      },
      permissionPolicy: {
        autoApprove: true,
        canSetAutoApprove: true,
      },
    };
    state.selection.presentation.metadata = [
      { fieldId: "backend", value: "OpenCode ACP" },
      { fieldId: "workspace", value: "/tmp/chat-workspace" },
    ];
    state.selection.composer = {
      reply: { status: "enabled" },
      runtimeOptions: {
        mode: {
          selectedOptionId: "build",
          options: [{ optionId: "build", label: "build", description: null }],
          enabled: false,
        },
        model: {
          selectedOptionId: "model-a",
          options: [
            { optionId: "model-a", label: "Model A", description: null },
          ],
          enabled: false,
        },
        reasoningEffort: {
          selectedOptionId: "default",
          options: [{ optionId: "default", label: "默认", description: null }],
          enabled: false,
        },
      },
    };
    const panel = model.projectAssistantWorkspacePanel(
      state,
      { executionDisplayMode: "live" },
      {
        assistantPanel: {
          actions: {
            autoApproveAcpPermissions: "自动批准",
            autoApproveAcpPermissionsOn: "自动批准已开启",
            autoApproveAcpPermissionsOff: "自动批准已关闭",
          },
        },
      },
    );
    assert.deepEqual(
      panel.context.metadata.map((entry: any) => entry.itemId),
      ["backend", "workspace"],
    );
    assert.deepEqual(
      panel.context.indicators.map((entry: any) => entry.valueVisible),
      [false, false],
    );
    assert.deepEqual(
      panel.context.actions.map((entry: any) => [entry.action, entry.enabled]),
      [
        ["new-conversation", true],
        ["connect", true],
        ["disconnect", false],
        ["authenticate", false],
        ["set-auto-approve-permissions", true],
      ],
    );
    assert.equal(panel.context.actions.at(-1).stateLabel, "自动批准已开启");
    assert.deepEqual(
      panel.reply.controls.map((entry: any) => [
        entry.id,
        entry.value,
        entry.disabled,
      ]),
      [
        ["mode", "build", true],
        ["model", "model-a", true],
        ["reasoning", "default", true],
      ],
    );
    assert.deepInclude(panel.interaction, {
      kind: "notice",
      message: "end_turn",
    });
    assert.equal(panel.reply.hint, "");
  });

  it("restores the waiting Skills banner and semantic hint without raw status metadata", async function () {
    const model = await loadPanelModel();
    const state = canonicalState("acp-skills");
    state.selection.control = {
      ...state.selection.control,
      status: "waiting_user",
      busy: false,
      hint: { kind: "waiting_user", message: null },
      connection: {
        status: "idle",
        sessionAvailable: true,
        connected: false,
        canConnect: true,
        canDisconnect: false,
      },
      execution: { canCancel: true, canInterrupt: false },
    };
    state.selection.presentation.metadata = [
      { fieldId: "backend", value: "Kilo ACP (npm)" },
      { fieldId: "workspace", value: "/tmp/skills-workspace" },
    ];
    const labels = {
      assistantPanel: {
        interaction: { waitingReply: "Agent 正在等待你的回复。" },
      },
    };
    const panel = model.projectAssistantWorkspacePanel(
      state,
      { executionDisplayMode: "live" },
      labels,
    );
    assert.deepEqual(
      panel.context.metadata.map((entry: any) => entry.itemId),
      ["backend", "workspace"],
    );
    assert.deepEqual(
      panel.context.actions.map((entry: any) => [entry.action, entry.enabled]),
      [
        ["connect-run", true],
        ["disconnect-run", false],
        ["cancel-run", true],
      ],
    );
    assert.deepInclude(panel.interaction, {
      kind: "waiting_user",
      message: "Agent 正在等待你的回复。",
    });
    assert.equal(panel.reply.hint, "");
  });

  it("dispatches sequential managed text replies without rebuilding panel regions or emitting tokens", async function () {
    const domEnv = createSidebarDomEnvironment();
    const { document } = domEnv;
    const renderer = await loadPanelRenderer(domEnv);
    const acpState = canonicalState("acp-skills") as any;
    const setAcpPrompt = (prompt: string) => {
      acpState.selection.control = {
        ...acpState.selection.control,
        status: "waiting_user",
        busy: false,
        hint: { kind: "waiting_user", message: null },
        interaction: {
          inputKind: "open_text",
          prompt,
          hint: null,
          options: [],
          files: [],
          fileReply: {
            supported: false,
            maxFiles: 8,
            maxFileBytes: 32 * 1024 * 1024,
            maxTotalBytes: 64 * 1024 * 1024,
          },
        },
      };
    };
    setAcpPrompt("First reply");

    const skillRunnerOwner = {
      source: "skillrunner",
      ownerKey: "sr-request-sequential-reply",
      requestId: "sr-request-sequential-reply",
      runKey: "sr-run-sequential-reply",
    };
    const skillRunnerState = canonicalState("acp-skills") as any;
    skillRunnerState.source = "skillrunner";
    skillRunnerState.navigation.selectedOwner = skillRunnerOwner;
    skillRunnerState.navigation.entries =
      skillRunnerState.navigation.entries.map((entry: any) => ({
        ...entry,
        owner: skillRunnerOwner,
      }));
    skillRunnerState.selection.owner = skillRunnerOwner;
    skillRunnerState.selection.transcript.owner = skillRunnerOwner;
    const setSkillRunnerPrompt = (prompt: string) => {
      skillRunnerState.selection.control = {
        ...skillRunnerState.selection.control,
        status: "waiting_user",
        busy: false,
        hint: { kind: "waiting_user", message: null },
        interaction: {
          inputKind: "open_text",
          prompt,
          hint: null,
          options: [],
          files: [],
          fileReply: {
            supported: false,
            maxFiles: 8,
            maxFileBytes: 32 * 1024 * 1024,
            maxTotalBytes: 64 * 1024 * 1024,
          },
        },
      };
    };
    setSkillRunnerPrompt("First reply");

    const cases = [
      {
        name: "ACP Skills",
        updateInteraction() {
          setAcpPrompt("Second reply");
        },
        project: () =>
          AssistantPanelModel.projectAssistantWorkspacePanel(acpState, {}, {}),
        render: (panel: unknown, options: Record<string, unknown>) =>
          chromePanelRenderer(renderer)(panel, options),
      },
      {
        name: "SkillRunner",
        updateInteraction() {
          setSkillRunnerPrompt("Second reply");
        },
        project: () =>
          AssistantPanelModel.projectAssistantWorkspacePanel(
            skillRunnerState,
            {},
            {},
          ),
        render: (panel: unknown, options: Record<string, unknown>) =>
          chromePanelRenderer(renderer)(panel, options),
      },
    ];

    for (const testCase of cases) {
      const { root, regions } = createPanelManagedRegions(document);
      const actions: Array<{ action: string; payload: any }> = [];
      const onAction = (action: string, payload: unknown) => {
        actions.push({ action, payload });
      };
      testCase.render(testCase.project(), {
        managed: true,
        root,
        regions,
        onAction,
      });
      const input = regions.reply.querySelector(".assistant-panel-reply-input");
      const button = regions.reply.querySelector(
        ".assistant-panel-reply-submit",
      );
      assert.ok(input, `${testCase.name} reply input must exist`);
      assert.ok(button, `${testCase.name} reply button must exist`);
      const stableRegions = Object.fromEntries(
        Object.entries(regions).filter(([key]) => key !== "hint"),
      );
      const regionSubtrees = captureRegionSubtrees(stableRegions);

      testCase.updateInteraction();
      testCase.render(testCase.project(), {
        managed: true,
        root,
        regions,
        onAction,
      });

      assertRegionSubtreesPreserved(stableRegions, regionSubtrees);
      assert.strictEqual(
        regions.reply.querySelector(".assistant-panel-reply-input"),
        input,
      );
      assert.strictEqual(
        regions.reply.querySelector(".assistant-panel-reply-submit"),
        button,
      );
      (input as any).value = `Continue ${testCase.name}`;
      (button as HTMLElement | null)?.click();

      assert.lengthOf(actions, 1);
      assert.equal(actions[0].action, "reply-run");
      assert.deepInclude(actions[0].payload, {
        message: `Continue ${testCase.name}`,
      });
      assert.notProperty(actions[0].payload, "interactionToken");
    }
  });

  it("bounds the Chat selector to eight recent sessions, retains active, and appends Show more", async function () {
    const model = await loadPanelModel();
    const state = canonicalState("acp-chat");
    const selected = owner("acp-chat", "backend-a\nconversation-10");
    state.selection.owner = selected;
    state.navigation.selectedOwner = selected;
    state.navigation.entries = Array.from({ length: 11 }, (_, index) => ({
      ...state.navigation.entries[0],
      owner: owner("acp-chat", `backend-a\nconversation-${index}`),
      label: `Session ${index}`,
    }));
    const panel = model.projectAssistantWorkspacePanel(
      state,
      { executionDisplayMode: "live" },
      {},
    );
    const options = panel.context.selectors[1].options;
    assert.lengthOf(options, 10);
    assert.isTrue(
      options.some((entry: any) => entry.value === selected.ownerKey),
    );
    assert.deepInclude(options.at(-1), {
      value: "__show-more__",
      sentinel: "show-more",
    });
  });

  it("projects structured permission options plus canonical Cancel", async function () {
    const model = await loadPanelModel();
    const state = canonicalState("acp-skills");
    state.selection.permission = {
      request: {
        requestId: "permission-1",
        approvalKind: "zotero-write",
        title: "Update item",
        summary: "Change title",
        tool: { title: "Update item", callId: "call-1" },
        review: {
          requestedAt: "2026-07-17T00:00:00.000Z",
          command: null,
          preview: "title: Revised",
        },
        options: [{ optionId: "allow", label: "Allow", description: null }],
      },
    };
    const panel = model.projectAssistantWorkspacePanel(
      state,
      { executionDisplayMode: "live", permissionRequestOpen: true },
      {},
    );
    assert.equal(panel.interaction.kind, "permission");
    assert.equal(panel.interaction.permission.approvalKind, "zotero-write");
    assert.equal(panel.interaction.permission.review.preview, "title: Revised");
    assert.deepEqual(
      panel.interaction.actions.map((entry: any) => entry.payload.outcome),
      ["selected", "cancelled"],
    );
    assert.equal(panel.drawers.permissionRequest.approvalKind, "zotero-write");
    assert.equal(
      panel.drawers.permissionRequest.review.preview,
      "title: Revised",
    );
  });

  it("projects Skills plan independently and details from owner-details", async function () {
    const model = await loadPanelModel();
    const state = canonicalState("acp-skills");
    state.selection.plan = {
      items: [
        {
          itemId: "plan:0",
          content: "Read sources",
          priority: null,
          status: "running",
        },
      ],
    };
    const panel = model.projectAssistantWorkspacePanel(
      state,
      { executionDisplayMode: "live" },
      {},
    );
    assert.isTrue(panel.plan.active);
    assert.equal(panel.plan.activeEntries[0].title, "Read sources");
    assert.equal(panel.drawers.details[0].entries[0].kind, "path");
    assert.deepEqual(
      panel.actions.details.map((entry: any) => entry.action),
      ["copy-diagnostics", "open-workspace"],
    );
  });

  it("projects ACP Skills status axes through the shared task status model", async function () {
    const model = await loadPanelModel();
    const cases = [
      {
        label: "running fallback",
        status: "running",
        backendStatus: null,
        applyState: null,
        expected: {
          mainStatus: "running",
          mainStatusTone: "accent",
          backendStatus: "running",
          applyStatus: "idle",
          applyStatusTone: "muted",
          terminal: false,
        },
        archiveActions: [],
      },
      {
        label: "successful run without apply",
        status: "succeeded",
        backendStatus: null,
        applyState: null,
        expected: {
          mainStatus: "succeeded",
          mainStatusTone: "success",
          backendStatus: "succeeded",
          applyStatus: "not-required",
          applyStatusTone: "success",
          terminal: true,
        },
        archiveActions: ["archive-run"],
      },
      {
        label: "explicit failed apply",
        status: "running",
        backendStatus: "connected",
        applyState: "failed",
        expected: {
          mainStatus: "failed",
          mainStatusTone: "error",
          backendStatus: "connected",
          applyStatus: "failed",
          applyStatusTone: "error",
          terminal: true,
        },
        archiveActions: ["archive-run"],
      },
    ];
    for (const fixture of cases) {
      const state = canonicalState("acp-skills") as any;
      Object.assign(state.navigation.entries[0], {
        status: fixture.status,
        backendStatus: fixture.backendStatus,
        applyState: fixture.applyState,
      });
      const panel = model.projectAssistantWorkspacePanel(
        state,
        { executionDisplayMode: "live", completedCollapsed: false },
        {},
      );
      const tasks = panel.drawers.sections.flatMap((section: any) =>
        section.groups.flatMap((group: any) => [
          ...group.activeTasks,
          ...group.finishedTasks,
        ]),
      );
      assert.lengthOf(tasks, 1, fixture.label);
      assert.deepInclude(tasks[0], {
        ...fixture.expected,
        showBackendStatusBadge: true,
        showApplyStatusBadge: true,
      });
      assert.deepEqual(
        tasks[0].itemActions.map((action: any) => action.action),
        fixture.archiveActions,
        fixture.label,
      );
    }
  });

  it("localizes the ACP Chat backend axis and always hides Apply", async function () {
    const domEnv = createSidebarDomEnvironment();
    const { document } = domEnv;
    const model = await loadPanelModel();
    const renderer = await loadPanelRenderer(domEnv);
    const state = canonicalState("acp-chat") as any;
    state.navigation.entries[0].backendStatus = null;
    state.navigation.entries[0].applyState = null;
    const panel = model.projectAssistantWorkspacePanel(
      state,
      { executionDisplayMode: "live" },
      {
        assistantPanel: {
          status: {
            backend: "后端状态",
            apply: "应用状态",
            running: "运行中",
            idle: "空闲",
          },
        },
      },
    );
    const task = panel.drawers.sections[0].groups[0].activeTasks[0];
    assert.deepInclude(task, {
      backendStatus: "running",
      backendStatusLabel: "运行中",
      showBackendStatusBadge: true,
      applyStatus: "idle",
      showApplyStatusBadge: false,
    });
    assert.equal(panel.drawers.labels.statusBackend, "后端状态");
    assert.equal(panel.drawers.labels.statusApply, "应用状态");

    const drawer = document.createElement("div");
    renderer.renderAssistantContextDrawer(drawer, panel, { onAction() {} });
    const axisLabels = Array.from(
      drawer.querySelectorAll(
        ".assistant-workspace-drawer-task-status-axis-label",
      ),
    ).map((entry) => entry.textContent);
    assert.deepEqual(axisLabels, ["后端状态"]);
    assert.notInclude(axisLabels, "Backend");
  });

  it("uses injected labels for shared ACP chrome and semantic fields", async function () {
    const model = await loadPanelModel();
    const panel = model.projectAssistantWorkspacePanel(
      canonicalState("acp-skills"),
      { executionDisplayMode: "boundary", completedCollapsed: false },
      {
        assistantPanel: {
          actions: {
            runs: "任务列表",
            details: "详情",
            manageBackends: "管理后端",
            executionDisplayMode: "更新显示",
            executionDisplayLive: "实时",
            executionDisplayBoundary: "按消息",
            executionDisplaySilent: "静默",
            archive: "归档",
            copyDiagnostics: "复制诊断",
            send: "发送",
            cancel: "取消",
          },
          fields: {
            workflow: "工作流",
            backend: "后端",
            session: "会话",
            model: "模型",
            reasoning: "推理",
          },
          drawer: { running: "运行中", completed: "已完成" },
          details: { title: "详情" },
          status: {
            overall: "总体",
            running: "运行中",
            waiting: "等待用户",
            backend: "后端",
            apply: "应用",
            pending: "待处理",
            connected: "已连接",
          },
          reply: { placeholderAcpSkill: "回复所选任务……" },
        },
      },
    );
    assert.equal(panel.context.metadata[0].label, "工作流");
    assert.equal(panel.actions.toolbar[0].label, "任务列表");
    assert.equal(panel.actions.toolbar[3].options[1].label, "按消息");
    assert.equal(panel.reply.placeholder, "回复所选任务……");
    assert.equal(panel.drawers.labels.statusOverall, "总体");
    assert.equal(panel.drawers.labels.statusBackend, "后端");
    assert.equal(panel.drawers.labels.statusApply, "应用");
  });

  it("keeps the shared main grid mounted when selection is empty", async function () {
    const [child, chat, skills] = await Promise.all([
      readProjectFile("src/sidebar/assistantWorkspaceAcpChild.js"),
      readProjectFile("addon/content/sidebar/acp-chat.html"),
      readProjectFile("addon/content/sidebar/acp-skill-run.html"),
    ]);
    assert.include(child, 'elements.main.classList.remove("hidden")');
    assert.notInclude(
      child,
      'elements.main.classList.toggle("hidden", !owner)',
    );
    for (const html of [chat, skills]) {
      const conversation = html.indexOf('data-role="conversation"');
      const empty = html.indexOf('data-role="empty"');
      const transcript = html.indexOf('data-role="transcript"');
      assert.isAtLeast(conversation, 0);
      assert.isAbove(empty, conversation);
      assert.isAbove(transcript, empty);
    }
  });

  it("routes clicked owners instead of replacing them with the selected owner", async function () {
    const child = await loadWorkspaceChild();
    const chatSelected = owner("acp-chat", "backend-a\nconversation-a");
    const chatTarget = owner("acp-chat", "backend-b\nconversation-b");
    const skillSelected = owner("acp-skills", "run-selected");
    const skillTarget = owner("acp-skills", "run-target");
    const cases = [
      {
        action: "set-active-conversation",
        data: { option: { owner: chatTarget } },
        selected: chatSelected,
        expected: { owner: chatTarget, payload: {} },
      },
      {
        action: "archive-conversation",
        data: { owner: chatTarget },
        selected: chatSelected,
        expected: { owner: chatTarget, payload: {} },
      },
      {
        action: "select-run",
        data: { owner: skillTarget },
        selected: skillSelected,
        expected: { owner: skillTarget, payload: {} },
      },
      {
        action: "archive-run",
        data: { owner: skillTarget },
        selected: skillSelected,
        expected: { owner: skillTarget, payload: {} },
      },
      {
        action: "set-active-backend",
        data: { option: { value: "backend-b" }, value: "backend-b" },
        selected: chatSelected,
        expected: { owner: null, payload: { groupId: "backend-b" } },
      },
      {
        action: "new-conversation",
        data: { groupId: "backend-a" },
        selected: chatSelected,
        expected: { owner: null, payload: { groupId: "backend-a" } },
      },
      {
        action: "reply-run",
        data: {
          message: "continue",
          requestId: "wrong-owner",
        },
        selected: skillSelected,
        expected: {
          owner: skillSelected,
          payload: {
            message: "continue",
          },
        },
      },
    ];
    for (const entry of cases) {
      assert.deepEqual(
        child.resolvePanelActionEnvelope(
          entry.action,
          entry.data,
          entry.selected,
          ASSISTANT_WORKSPACE_ACTION_REGISTRY,
        ),
        entry.expected,
        entry.action,
      );
    }
    assert.isNull(
      child.resolvePanelActionEnvelope(
        "new-conversation",
        {},
        chatSelected,
        ASSISTANT_WORKSPACE_ACTION_REGISTRY,
      ),
    );
  });

  it("keeps unchanged task cards identical when only selection moves", async function () {
    const domEnv = createSidebarDomEnvironment();
    const { document } = domEnv;
    const renderer = await loadPanelRenderer(domEnv);
    const drawer = document.createElement("div");
    const sections = [
      {
        id: "active",
        title: "Active",
        groups: [
          {
            backendId: "backend-a",
            backendDisplayName: "Backend A",
            activeTasks: [
              {
                key: "task-a",
                title: "Task A",
                workflowLabel: "Skill A",
                status: "running",
                selectable: true,
              },
              {
                key: "task-b",
                title: "Task B",
                workflowLabel: "Skill B",
                status: "running",
                selectable: true,
              },
            ],
            finishedTasks: [],
          },
        ],
      },
    ];
    const render = (selectedTaskKey: string) => {
      renderer.renderAssistantContextDrawer(drawer, {
        exact: true,
        drawers: {
          layout: "workspace-task-drawer",
          contextTitle: "Runs",
          selectedTaskKey,
          sections,
        },
      });
      return drawer.querySelectorAll("[data-assistant-task-key]");
    };
    const first = render("task-a");
    const second = render("task-b");
    assert.strictEqual(second[0], first[0]);
    assert.strictEqual(second[1], first[1]);
    assert.notInclude(second[0].className, "is-active");
    assert.include(second[1].className, "is-active");
  });

  it("refreshes drawer structure when title visibility or backend label changes", async function () {
    const domEnv = createSidebarDomEnvironment();
    const { document } = domEnv;
    const renderer = await loadPanelRenderer(domEnv);
    const drawer = document.createElement("div");
    const section: any = {
      id: "sessions",
      title: "Sessions",
      hideTitle: false,
      groups: [
        {
          backendId: "backend-a",
          backendDisplayName: "Backend A",
          activeTasks: [
            {
              key: "conversation-a",
              title: "Conversation A",
              status: "idle",
              selectable: true,
            },
          ],
          finishedTasks: [],
        },
      ],
    };
    const render = () =>
      renderer.renderAssistantContextDrawer(drawer, {
        exact: true,
        drawers: {
          layout: "workspace-task-drawer",
          contextTitle: "Sessions",
          selectedTaskKey: "conversation-a",
          sections: [section],
        },
      });

    render();
    assert.lengthOf(
      drawer.querySelectorAll(".assistant-workspace-drawer-section-title"),
      1,
    );
    section.hideTitle = true;
    render();
    assert.lengthOf(
      drawer.querySelectorAll(".assistant-workspace-drawer-section-title"),
      0,
    );

    section.groups[0].backendDisplayName = "Backend A Renamed";
    render();
    assert.equal(
      drawer.querySelector(".assistant-workspace-drawer-group-title")
        ?.textContent,
      "Backend A Renamed",
    );
  });

  it("preserves every non-transcript managed region across transcript-only state", async function () {
    const domEnv = createSidebarDomEnvironment();
    const { document } = domEnv;
    const model = await loadPanelModel();
    const renderer = await loadPanelRenderer(domEnv);
    const { root, regions } = createPanelManagedRegions(document);
    const state = canonicalState("acp-skills");
    const ui = {
      contextDrawerOpen: false,
      detailsDrawerOpen: false,
      permissionRequestOpen: false,
      replyDraft: "draft",
    };
    state.selection.control = {
      ...state.selection.control,
      status: "waiting_user",
      busy: false,
      hint: { kind: "waiting_user", message: null },
      interaction: {
        inputKind: "choose_one",
        prompt: "Choose the next step",
        hint: "Select one option",
        options: [
          { label: "Continue", value: { mode: "deep" }, description: null },
        ],
        files: [],
        fileReply: {
          supported: true,
          maxFiles: 8,
          maxFileBytes: 32 * 1024 * 1024,
          maxTotalBytes: 64 * 1024 * 1024,
        },
      },
    };
    const render = () => {
      const panel = model.projectAssistantWorkspacePanel(state, ui, {});
      chromePanelRenderer(renderer)(panel, {
        managed: true,
        root,
        regions,
        onAction() {},
      });
    };
    render();
    assert.equal(
      regions.hint.querySelector(".assistant-panel-interaction-hint")
        ?.textContent,
      "Select one option",
    );
    const regionSubtrees = captureRegionSubtrees(regions);
    state.selection.transcript = {
      ...state.selection.transcript,
      status: "ready",
      transcriptRevision: 1,
      page: {
        pageKey: "request-a\ntail:80",
        startCursor: 0,
        limit: 80,
        totalVisibleItemCount: 1,
        previousCursor: null,
        nextCursor: null,
        sourceEventSeq: 1,
        items: [],
      },
    };
    render();
    assertRegionSubtreesPreserved(regions, regionSubtrees);

    const afterTranscript = captureRegionSubtrees(regions);
    state.selection.control.interaction.hint = "Updated guidance";
    render();
    assert.equal(
      regions.hint.querySelector(".assistant-panel-interaction-hint")
        ?.textContent,
      "Updated guidance",
    );
    const nonHintRegions = Object.fromEntries(
      Object.entries(regions).filter(([key]) => key !== "hint"),
    );
    assertRegionSubtreesPreserved(nonHintRegions, afterTranscript);
  });

  it("updates only the task drawer region when an ACP task status axis changes", async function () {
    const domEnv = createSidebarDomEnvironment();
    const { document } = domEnv;
    const model = await loadPanelModel();
    const renderer = await loadPanelRenderer(domEnv);
    const { root, regions } = createPanelManagedRegions(document);
    const state = canonicalState("acp-skills") as any;
    const render = () =>
      chromePanelRenderer(renderer)(
        model.projectAssistantWorkspacePanel(state, {}, {}),
        { managed: true, root, regions, onAction() {} },
      );

    render();
    const drawerMount = regions.drawer.firstChild;
    const section = regions.drawer.querySelector(
      ".assistant-workspace-drawer-section",
    );
    const group = regions.drawer.querySelector(
      ".assistant-workspace-drawer-group",
    );
    const taskRow = regions.drawer.querySelector("[data-assistant-task-key]");
    const stableRegions = Object.fromEntries(
      Object.entries(regions).filter(([key]) => key !== "drawer"),
    );
    const stableSubtrees = captureRegionSubtrees(stableRegions);

    state.navigation.entries[0].backendStatus = "running";
    render();

    assert.strictEqual(regions.drawer.firstChild, drawerMount);
    assert.strictEqual(
      regions.drawer.querySelector(".assistant-workspace-drawer-section"),
      section,
    );
    assert.strictEqual(
      regions.drawer.querySelector(".assistant-workspace-drawer-group"),
      group,
    );
    // The Preact context drawer reconciles rows by task key, so the changed
    // row keeps its DOM identity and the new axis value is a props diff
    // (the imperative renderer this test was written against rebuilt the
    // row element instead).
    const updatedRow = regions.drawer.querySelector(
      "[data-assistant-task-key]",
    );
    assert.strictEqual(updatedRow, taskRow);
    const axisValues = Array.from(
      updatedRow!.querySelectorAll(
        ".assistant-workspace-drawer-task-status-axis-value",
      ),
    ).map((entry) => entry.textContent);
    assert.include(axisValues, "Running");
    assertRegionSubtreesPreserved(stableRegions, stableSubtrees);
  });

  it("preserves the selected ACP Skills DOM when background owner publications arrive", async function () {
    const domEnv = createSidebarDomEnvironment();
    const { document } = domEnv;
    const model = await loadPanelModel();
    const renderer = await loadPanelRenderer(domEnv);
    const child = await loadWorkspaceChild();
    const { root, regions } = createPanelManagedRegions(document);
    let snapshot = canonicalState("acp-skills");
    chromePanelRenderer(renderer)(
      model.projectAssistantWorkspacePanel(snapshot, {}, {}),
      {
        managed: true,
        root,
        regions,
        onAction() {},
      },
    );
    const regionSubtrees = captureRegionSubtrees(regions);
    const acknowledgements: Array<{ reason: string | null }> = [];
    let renderCalls = 0;
    const client = child.createClient({
      source: "acp-skills",
      getSnapshot: () => snapshot,
      setSnapshot: (next: typeof snapshot) => {
        snapshot = next;
      },
      getOwnerKey: (state: typeof snapshot) => state.selection.owner.ownerKey,
      render: () => {
        renderCalls += 1;
        return { ok: true, renderPath: "incremental", failure: null };
      },
      ack: (
        _publication: unknown,
        _stage: string,
        _outcome: string,
        reason: string | null,
      ) => {
        acknowledgements.push({ reason });
      },
    });
    const backgroundOwner = owner("acp-skills", "request-b");

    client.apply({
      schema: "zotero-agents.assistant-workspace-publication.v1",
      publicationId: "background-permission",
      owner: backgroundOwner,
      publicationKind: "permission",
      publicationForm: "region",
      publicationCause: "steady-state",
      regionRevision: 1,
      deliverySequence: 1,
      payload: { request: null },
    });
    client.apply({
      schema: "zotero-agents.assistant-workspace-publication.v1",
      publicationId: "background-workspace-activity",
      owner: backgroundOwner,
      publicationKind: "transcript",
      publicationForm: "delta",
      publicationCause: "steady-state",
      regionRevision: 1,
      deliverySequence: 2,
      payload: {
        page: {
          pageKey: "request-b\ntail:80",
          startCursor: 0,
          limit: 80,
          totalVisibleItemCount: 1,
          previousCursor: null,
          nextCursor: null,
          sourceEventSeq: 1,
        },
        baseTranscriptRevision: 0,
        transcriptRevision: 1,
        mutations: [],
      },
    });

    assert.equal(renderCalls, 0);
    assert.deepEqual(
      acknowledgements.map((entry) => entry.reason),
      ["old-owner", "old-owner"],
    );
    assertRegionSubtreesPreserved(regions, regionSubtrees);
  });

  it("retries a v1 transcript mutation after a transactional DOM failure", async function () {
    const fixture = JSON.parse(
      await readProjectFile(
        "test/fixtures/assistant-workspace/v1-skills-transcript-mutation.json",
      ),
    );
    const domEnv = createSidebarDomEnvironment();
    const { document } = domEnv;
    const renderer = await loadTranscriptRenderer(domEnv);
    const transcript = document.createElement("div");
    // Mirror the old fake's failNextInsertBefore hook: the first insertBefore
    // on the container throws, so the commit hits the transactional DOM
    // failure path and the retry must recover.
    const originalInsertBefore = transcript.insertBefore.bind(transcript);
    let failNextInsert = true;
    Object.defineProperty(transcript, "insertBefore", {
      configurable: true,
      value: (child: Node, before: Node | null) => {
        if (failNextInsert) {
          failNextInsert = false;
          throw new Error("synthetic-dom-failure");
        }
        return originalInsertBefore(child, before);
      },
    });

    const render = () =>
      renderer.applyAssistantTranscriptEffectsExact({
        container: transcript,
        effect: fixture.effect,
        affectedItems: fixture.effect.affectedItems,
        virtualized: false,
        ownerKey: fixture.ownerKey,
        page: fixture.page,
        mode: "plain",
        variant: "skillrunner",
        renderMarkdown: (value: string) => value,
      });

    assert.deepEqual(render(), {
      ok: false,
      renderPath: "incremental",
      failure: { stage: "transcript", code: "dom-commit-failed" },
    });
    assert.deepEqual(render(), {
      ok: true,
      renderPath: "incremental",
      failure: null,
    });
    assert.lengthOf(transcript.children, 1);
    assert.equal(
      transcript.children[0].getAttribute("data-assistant-item-id"),
      "assistant-segment-1",
    );
  });

  for (const source of ["acp-chat", "acp-skills"] as const) {
    it(`preserves ${source} historical pages and keyed gaps across terminal tail patches`, async function () {
      const domEnv = createSidebarDomEnvironment();
      const { document } = domEnv;
      const renderer = await loadTranscriptRenderer(domEnv);
      const transcript = document.createElement("div");
      // jsdom has no layout: row measurement falls back to the configured
      // estimatedRowHeight (40), matching the old fake's transcriptRowHeight.
      Object.defineProperty(transcript, "clientHeight", {
        configurable: true,
        value: 10_000,
      });
      const ownerKey =
        source === "acp-chat" ? "backend-a\nconversation-a" : "request-a";
      const message = (index: number, status = "complete") => ({
        itemId: `message-${index}`,
        itemKind: "message",
        role: "assistant",
        status,
        text: `message ${index}`,
        createdAt: "2026-07-16T00:00:00.000Z",
      });
      const page = (
        pageKey: string,
        startCursor: number,
        items: ReturnType<typeof message>[],
        previousCursor: number | null,
        nextCursor: number | null,
        revision: number,
        totalVisibleItemCount = 6,
      ) => ({
        ownerKey,
        pageKey: `${ownerKey}\n${pageKey}`,
        startCursor,
        limit: 2,
        totalVisibleItemCount,
        previousCursor,
        nextCursor,
        sourceEventSeq: revision,
        transcriptRevision: revision,
        items,
      });
      const renderOptions = {
        container: transcript,
        virtualized: true,
        ownerKey,
        pageSize: 2,
        pageCacheLimit: 8,
        renderWindowLimit: 20,
        renderBuffer: 0,
        estimatedRowHeight: 40,
        mode: "plain",
        variant: source === "acp-chat" ? "acp-chat" : "skillrunner",
        renderMarkdown: (value: string) => value,
      };
      const tail = page(
        "tail:2",
        4,
        [message(4), message(5, "streaming")],
        2,
        null,
        1,
      );
      const oldest = page("page:0:2", 0, [message(0), message(1)], null, 2, 2);

      renderer.renderAssistantTranscript({ ...renderOptions, page: tail });
      const loadingBeforeHistory = Array.from(transcript.children).find(
        (node) =>
          node.classList.contains("assistant-transcript-virtual-loading"),
      );
      assert.isOk(loadingBeforeHistory);
      renderer.renderAssistantTranscript({ ...renderOptions, page: tail });
      assert.strictEqual(
        Array.from(transcript.children).find((node) =>
          node.classList.contains("assistant-transcript-virtual-loading"),
        ),
        loadingBeforeHistory,
      );
      renderer.renderAssistantTranscript({ ...renderOptions, page: oldest });

      const gapBeforePatch = Array.from(transcript.children).find(
        (node) =>
          node.getAttribute("data-assistant-virtual-spacer-kind") ===
          "inter-page",
      );
      assert.isOk(gapBeforePatch);
      assert.equal((gapBeforePatch as HTMLElement)?.style.height, "80px");
      const gapIndex = Array.from(transcript.children).indexOf(gapBeforePatch!);
      assert.equal(
        transcript.children[gapIndex - 1]?.getAttribute(
          "data-assistant-item-id",
        ),
        "message-1",
      );
      assert.equal(
        transcript.children[gapIndex + 1]?.getAttribute(
          "data-assistant-item-id",
        ),
        "message-4",
      );

      const firstTerminalItem = message(5, "complete");
      firstTerminalItem.text = "terminal one";
      const firstTerminalTail = page(
        "tail:2",
        4,
        [message(4), firstTerminalItem],
        2,
        null,
        3,
      );
      assert.isTrue(
        renderer.applyAssistantTranscriptEffectsExact({
          ...renderOptions,
          page: firstTerminalTail,
          effect: {
            kind: "mutations",
            onSelectedPage: true,
            mutations: [{ op: "patch_item", itemId: "message-5" }],
            affectedItems: [firstTerminalItem],
            pageItems: firstTerminalTail.items,
            evictedItemIds: [],
          },
          affectedItems: [firstTerminalItem],
        }).ok,
      );
      assert.strictEqual(
        Array.from(transcript.children).find(
          (node) =>
            node.getAttribute("data-assistant-virtual-spacer-kind") ===
            "inter-page",
        ),
        gapBeforePatch,
      );

      const middle = page("page:2:2", 2, [message(2), message(3)], 0, 4, 4);
      renderer.renderAssistantTranscript({ ...renderOptions, page: middle });
      const finalTerminalItem = { ...firstTerminalItem, text: "terminal two" };
      const finalTail = page(
        "tail:2",
        4,
        [message(4), finalTerminalItem],
        2,
        null,
        5,
      );
      assert.isTrue(
        renderer.applyAssistantTranscriptEffectsExact({
          ...renderOptions,
          page: finalTail,
          effect: {
            kind: "mutations",
            onSelectedPage: true,
            mutations: [{ op: "patch_item", itemId: "message-5" }],
            affectedItems: [finalTerminalItem],
            pageItems: finalTail.items,
            evictedItemIds: [],
          },
          affectedItems: [finalTerminalItem],
        }).ok,
      );

      const itemIds = Array.from(
        transcript.querySelectorAll(":scope > .assistant-transcript-row"),
      ).map((row) => row.getAttribute("data-assistant-item-id"));
      assert.deepEqual(itemIds, [
        "message-0",
        "message-1",
        "message-2",
        "message-3",
        "message-4",
        "message-5",
      ]);
      assert.equal(new Set(itemIds).size, itemIds.length);
      assert.equal(
        Array.from(
          transcript.querySelectorAll(":scope > .assistant-transcript-row"),
        )
          .at(-1)
          ?.querySelector("[data-assistant-transcript-body]")?.innerHTML,
        "terminal two",
      );

      const overlap = page(
        "page:1:2",
        1,
        [
          { ...message(1), text: "replacement one" },
          { ...message(2), text: "replacement two" },
        ],
        0,
        3,
        6,
      );
      renderer.renderAssistantTranscript({ ...renderOptions, page: overlap });
      const overlapIds = Array.from(
        transcript.querySelectorAll(":scope > .assistant-transcript-row"),
      ).map((row) => row.getAttribute("data-assistant-item-id"));
      assert.deepEqual(overlapIds, itemIds);
      assert.equal(new Set(overlapIds).size, overlapIds.length);
      assert.equal(
        transcript
          .querySelectorAll(":scope > .assistant-transcript-row")[1]
          ?.querySelector("[data-assistant-transcript-body]")?.innerHTML,
        "replacement one",
      );
      assert.equal(
        transcript
          .querySelectorAll(":scope > .assistant-transcript-row")[2]
          ?.querySelector("[data-assistant-transcript-body]")?.innerHTML,
        "replacement two",
      );

      const contractedTail = page(
        "tail:2",
        3,
        [message(3), message(4)],
        1,
        null,
        7,
        5,
      );
      renderer.renderAssistantTranscript({
        ...renderOptions,
        page: contractedTail,
      });
      assert.deepEqual(
        Array.from(
          transcript.querySelectorAll(":scope > .assistant-transcript-row"),
        ).map((row) => row.getAttribute("data-assistant-item-id")),
        ["message-0", "message-1", "message-2", "message-3", "message-4"],
      );
      assert.equal(
        (
          Array.from(transcript.children).find(
            (node) =>
              node.getAttribute("data-assistant-virtual-key") ===
              "spacer:edge:bottom",
          ) as HTMLElement | undefined
        )?.style.height,
        "0px",
      );
    });
  }

  it("commits terminal Markdown and measured virtual geometry on the live state", async function () {
    const animationFrames = createAnimationFrameHarness();
    const domEnv = createSidebarDomEnvironment();
    const { document } = domEnv;
    const renderer = await loadTranscriptRenderer(
      domEnv,
      animationFrames.requestAnimationFrame,
    );
    const transcript = document.createElement("div");
    // jsdom has no layout engine: the geometry inputs the fake exposed as
    // mutable fields are stubbed per element instance with the same values.
    Object.defineProperty(transcript, "clientHeight", {
      configurable: true,
      value: 400,
    });
    Object.defineProperty(transcript, "scrollHeight", {
      configurable: true,
      value: 10_000,
    });
    transcript.scrollTop = 9_600;
    const streamingItem = {
      itemId: "assistant-segment-1",
      itemKind: "message",
      role: "assistant",
      status: "streaming",
      text: "long response",
      createdAt: "2026-07-16T00:00:00.000Z",
    };
    const page = {
      ownerKey: "request-a",
      pageKey: "request-a\ntail:80",
      startCursor: 0,
      limit: 80,
      totalVisibleItemCount: 1,
      previousCursor: null,
      nextCursor: null,
      sourceEventSeq: 1,
      transcriptRevision: 1,
      items: [streamingItem],
    };
    const virtualLayouts: Array<{ totalHeight: number }> = [];
    const renderOptions = {
      container: transcript,
      virtualized: true,
      ownerKey: "request-a",
      page,
      mode: "plain",
      variant: "acp-chat",
      renderMarkdown: (value: string) => `<strong>${value}</strong>`,
      onRendered: ({ virtual }: any) => {
        virtualLayouts.push(virtual);
      },
    };
    renderer.renderAssistantTranscript(renderOptions);
    const row = transcript.querySelector(".assistant-transcript-row");
    assert.isOk(row);
    // The fake fed row measurement from a document-level height field through
    // getBoundingClientRect at measure time; jsdom reports zero layout, so
    // feed the same mutable height through a per-row rect stub.
    let transcriptRowHeight = 88;
    Object.defineProperty(row, "getBoundingClientRect", {
      configurable: true,
      value: () => ({ height: transcriptRowHeight }),
    });
    animationFrames.flushAll();

    transcript.setAttribute("data-assistant-transcript-stick", "false");
    transcript.setAttribute("data-assistant-transcript-last-scroll-top", "200");
    transcript.scrollTop = 200;
    transcriptRowHeight = 6_000;
    const completeItem = {
      ...streamingItem,
      status: "complete",
      text: "**finished**",
    };
    const completePage = {
      ...page,
      sourceEventSeq: 2,
      transcriptRevision: 2,
      items: [completeItem],
    };
    const result = renderer.applyAssistantTranscriptEffectsExact({
      ...renderOptions,
      page: completePage,
      effect: {
        kind: "mutations",
        onSelectedPage: true,
        mutations: [{ op: "patch_item", itemId: completeItem.itemId }],
        affectedItems: [completeItem],
        pageItems: [completeItem],
        evictedItemIds: [],
      },
      affectedItems: [completeItem],
    });

    assert.isTrue(result.ok);
    assert.strictEqual(
      transcript.querySelector(".assistant-transcript-row"),
      row,
    );
    const body = row?.querySelector("[data-assistant-transcript-body]");
    assert.equal(body?.innerHTML, "<strong>**finished**</strong>");
    assert.equal(animationFrames.pendingCount, 1);

    animationFrames.flushAll();
    assert.equal(animationFrames.pendingCount, 0);
    assert.equal(virtualLayouts.at(-1)?.totalHeight, 6_000);
    assert.equal(transcript.scrollTop, 200);
    assert.strictEqual(
      transcript.querySelector(".assistant-transcript-row"),
      row,
    );

    transcriptRowHeight = 7_000;
    const extendedItem = {
      ...completeItem,
      text: "**finished with more output**",
    };
    const extendedPage = {
      ...completePage,
      sourceEventSeq: 3,
      transcriptRevision: 3,
      items: [extendedItem],
    };
    const extendedResult = renderer.applyAssistantTranscriptEffectsExact({
      ...renderOptions,
      page: extendedPage,
      effect: {
        kind: "mutations",
        onSelectedPage: true,
        mutations: [{ op: "patch_item", itemId: extendedItem.itemId }],
        affectedItems: [extendedItem],
        pageItems: [extendedItem],
        evictedItemIds: [],
      },
      affectedItems: [extendedItem],
    });

    assert.isTrue(extendedResult.ok);
    assert.equal(animationFrames.pendingCount, 1);
    animationFrames.flushAll();
    assert.equal(virtualLayouts.at(-1)?.totalHeight, 7_000);
    assert.equal(transcript.scrollTop, 200);
    assert.strictEqual(
      transcript.querySelector(".assistant-transcript-row"),
      row,
    );
  });

  it("renders the tail window without requesting history on a stick-to-bottom first render", async function () {
    const domEnv = createSidebarDomEnvironment();
    const { document } = domEnv;
    const renderer = await loadTranscriptRenderer(domEnv);
    const transcript = document.createElement("div");
    // jsdom has no layout: clientHeight/scrollHeight are stubbed per element,
    // and row measurement falls back to estimatedRowHeight (40).
    Object.defineProperty(transcript, "clientHeight", {
      configurable: true,
      value: 100,
    });
    Object.defineProperty(transcript, "scrollHeight", {
      configurable: true,
      value: 800,
    });
    transcript.setAttribute(
      "data-assistant-transcript-stick-installed",
      "true",
    );
    transcript.setAttribute("data-assistant-transcript-stick", "true");
    const message = (index: number) => ({
      itemId: `message-${index}`,
      itemKind: "message",
      role: "assistant",
      status: "complete",
      text: `message ${index}`,
      createdAt: "2026-07-16T00:00:00.000Z",
    });
    const requestedCursors: number[] = [];
    renderer.renderAssistantTranscript({
      container: transcript,
      virtualized: true,
      ownerKey: "request-a",
      pageSize: 10,
      pageCacheLimit: 4,
      renderWindowLimit: 20,
      renderBuffer: 0,
      estimatedRowHeight: 40,
      mode: "plain",
      variant: "skillrunner",
      renderMarkdown: (value: string) => value,
      onRequestPage: (request: { cursor?: number }) => {
        requestedCursors.push(Number(request && request.cursor));
      },
      page: {
        ownerKey: "request-a",
        pageKey: "request-a\ntail:10",
        startCursor: 10,
        limit: 10,
        totalVisibleItemCount: 20,
        previousCursor: 0,
        nextCursor: null,
        sourceEventSeq: 1,
        transcriptRevision: 1,
        items: Array.from({ length: 10 }, (_unused, index) =>
          message(index + 10),
        ),
      },
    });

    assert.deepEqual(requestedCursors, []);
    assert.isNull(
      transcript.querySelector(".assistant-transcript-virtual-loading"),
    );
    assert.deepEqual(
      Array.from(
        transcript.querySelectorAll(":scope > .assistant-transcript-row"),
      ).map((row) => row.getAttribute("data-assistant-item-id")),
      ["message-16", "message-17", "message-18", "message-19"],
    );
  });

  it("syncs the last scroll top after an incremental anchor restore", async function () {
    const animationFrames = createAnimationFrameHarness();
    const domEnv = createSidebarDomEnvironment();
    const { document } = domEnv;
    const renderer = await loadTranscriptRenderer(
      domEnv,
      animationFrames.requestAnimationFrame,
    );
    const transcript = document.createElement("div");
    // jsdom has no layout: geometry is stubbed per element; row measurement
    // falls back to the default estimated row height (88).
    Object.defineProperty(transcript, "clientHeight", {
      configurable: true,
      value: 400,
    });
    Object.defineProperty(transcript, "scrollHeight", {
      configurable: true,
      value: 10_000,
    });
    transcript.scrollTop = 9_600;
    const streamingItem = {
      itemId: "assistant-segment-1",
      itemKind: "message",
      role: "assistant",
      status: "streaming",
      text: "long response",
      createdAt: "2026-07-16T00:00:00.000Z",
    };
    const page = {
      ownerKey: "request-a",
      pageKey: "request-a\ntail:80",
      startCursor: 0,
      limit: 80,
      totalVisibleItemCount: 1,
      previousCursor: null,
      nextCursor: null,
      sourceEventSeq: 1,
      transcriptRevision: 1,
      items: [streamingItem],
    };
    const renderOptions = {
      container: transcript,
      virtualized: true,
      ownerKey: "request-a",
      page,
      mode: "plain",
      variant: "acp-chat",
      renderMarkdown: (value: string) => value,
    };
    renderer.renderAssistantTranscript(renderOptions);
    animationFrames.flushAll();

    transcript.setAttribute("data-assistant-transcript-stick", "false");
    transcript.setAttribute("data-assistant-transcript-last-scroll-top", "150");
    transcript.scrollTop = 200;
    const completeItem = {
      ...streamingItem,
      status: "complete",
      text: "finished",
    };
    const result = renderer.applyAssistantTranscriptEffectsExact({
      ...renderOptions,
      page: {
        ...page,
        sourceEventSeq: 2,
        transcriptRevision: 2,
        items: [completeItem],
      },
      effect: {
        kind: "mutations",
        onSelectedPage: true,
        mutations: [{ op: "patch_item", itemId: completeItem.itemId }],
        affectedItems: [completeItem],
        pageItems: [completeItem],
        evictedItemIds: [],
      },
      affectedItems: [completeItem],
    });

    assert.isTrue(result.ok);
    assert.equal(
      transcript.getAttribute("data-assistant-transcript-last-scroll-top"),
      String(transcript.scrollTop),
    );
    animationFrames.flushAll();
    assert.equal(
      transcript.getAttribute("data-assistant-transcript-last-scroll-top"),
      String(transcript.scrollTop),
    );
  });

  it("coalesces repeated transcript bottom-stick animation frames", async function () {
    const animationFrames = createAnimationFrameHarness();
    const domEnv = createSidebarDomEnvironment();
    const { document } = domEnv;
    const renderer = await loadTranscriptRenderer(
      domEnv,
      animationFrames.requestAnimationFrame,
    );
    const transcript = document.createElement("div");
    Object.defineProperty(transcript, "scrollHeight", {
      configurable: true,
      value: 20_000,
    });

    renderer.stickAssistantTranscriptToBottom(transcript);
    renderer.stickAssistantTranscriptToBottom(transcript);
    renderer.stickAssistantTranscriptToBottom(transcript);

    assert.equal(animationFrames.pendingCount, 1);
    animationFrames.flushAll();
    assert.equal(animationFrames.pendingCount, 0);
    assert.equal(transcript.scrollTop, 20_000);
    assert.isNull(
      transcript.getAttribute("data-assistant-transcript-programmatic-scroll"),
    );
  });

  it("honors user scroll-away while transcript bottom-stick work is pending", async function () {
    const animationFrames = createAnimationFrameHarness();
    const domEnv = createSidebarDomEnvironment();
    const { document } = domEnv;
    const renderer = await loadTranscriptRenderer(
      domEnv,
      animationFrames.requestAnimationFrame,
    );
    const transcript = document.createElement("div");
    Object.defineProperty(transcript, "clientHeight", {
      configurable: true,
      value: 400,
    });
    Object.defineProperty(transcript, "scrollHeight", {
      configurable: true,
      value: 20_000,
    });
    transcript.scrollTop = 19_600;
    renderer.installAssistantTranscriptStickiness(transcript, 80);
    renderer.stickAssistantTranscriptToBottom(transcript);

    transcript.scrollTop = 18_000;
    transcript.dispatchEvent(new domEnv.window.Event("scroll"));

    assert.equal(
      transcript.getAttribute("data-assistant-transcript-stick"),
      "false",
    );
    assert.isNull(
      transcript.getAttribute("data-assistant-transcript-programmatic-scroll"),
    );
    animationFrames.flushAll();
    assert.equal(transcript.scrollTop, 18_000);

    transcript.scrollTop = 19_600;
    transcript.dispatchEvent(new domEnv.window.Event("scroll"));
    assert.equal(
      transcript.getAttribute("data-assistant-transcript-stick"),
      "true",
    );
  });

  it("drops pending bottom-stick work after owner or follow intent changes", async function () {
    const animationFrames = createAnimationFrameHarness();
    const domEnv = createSidebarDomEnvironment();
    const { document } = domEnv;
    const renderer = await loadTranscriptRenderer(
      domEnv,
      animationFrames.requestAnimationFrame,
    );
    const transcript = document.createElement("div");
    Object.defineProperty(transcript, "scrollHeight", {
      configurable: true,
      value: 20_000,
    });
    transcript.setAttribute("data-assistant-transcript-owner-key", "owner-a");
    transcript.setAttribute("data-assistant-transcript-stick", "true");
    renderer.stickAssistantTranscriptToBottom(transcript);

    transcript.setAttribute("data-assistant-transcript-owner-key", "owner-b");
    transcript.setAttribute("data-assistant-transcript-stick", "false");
    transcript.scrollTop = 1_234;
    animationFrames.flushAll();

    assert.equal(transcript.scrollTop, 1_234);
    assert.isNull(
      transcript.getAttribute("data-assistant-transcript-programmatic-scroll"),
    );
  });

  it("includes owner identity in transcript loading and empty signatures", async function () {
    const child = await loadWorkspaceChild();
    assert.equal(
      child.transcriptStateSignature("owner-a", "loading", ""),
      child.transcriptStateSignature("owner-a", "loading", ""),
    );
    assert.notEqual(
      child.transcriptStateSignature("owner-a", "loading", ""),
      child.transcriptStateSignature("owner-b", "loading", ""),
    );
    assert.notEqual(
      child.transcriptStateSignature("owner-a", "empty", ""),
      child.transcriptStateSignature("owner-b", "empty", ""),
    );
  });

  it("preserves local drawers for same-owner navigation and closes them only when the owner changes", async function () {
    const child = await loadWorkspaceChild();
    const ui = {
      contextDrawerOpen: true,
      detailsDrawerOpen: true,
      permissionRequestOpen: true,
      replyDraft: "draft-a",
      replyDraftByOwner: new Map([
        ["request-a", "draft-a"],
        ["request-b", "draft-b"],
      ]),
    };
    assert.isFalse(
      child.applyOwnerNavigationUiTransition(
        ui,
        false,
        owner("acp-skills", "request-a"),
      ),
    );
    assert.deepInclude(ui, {
      contextDrawerOpen: true,
      detailsDrawerOpen: true,
      permissionRequestOpen: true,
      replyDraft: "draft-a",
    });

    assert.isTrue(
      child.applyOwnerNavigationUiTransition(
        ui,
        true,
        owner("acp-skills", "request-b"),
      ),
    );
    assert.deepInclude(ui, {
      contextDrawerOpen: false,
      detailsDrawerOpen: false,
      permissionRequestOpen: false,
      replyDraft: "draft-b",
    });

    ui.contextDrawerOpen = true;
    ui.detailsDrawerOpen = true;
    ui.permissionRequestOpen = true;
    assert.isTrue(child.applyOwnerNavigationUiTransition(ui, true, null));
    assert.deepInclude(ui, {
      contextDrawerOpen: false,
      detailsDrawerOpen: false,
      permissionRequestOpen: false,
      replyDraft: "",
    });
  });

  it("commits canonical state only after render success and preserves bounded failure details", async function () {
    const child = await loadWorkspaceChild();
    const selectedOwner = owner("acp-skills", "request-a");
    const initial = canonicalState("acp-skills");
    const nextPresentation = {
      ...initial.selection.presentation,
      title: "Updated Task",
    };
    const acknowledgements: any[] = [];
    let snapshot = initial;
    let renderAttempts = 0;
    let recoveries = 0;
    const client = child.createClient({
      source: "acp-skills",
      getSnapshot: () => snapshot,
      setSnapshot: (next: any) => {
        snapshot = next;
      },
      getOwnerKey: (state: any) => state.selection.owner.ownerKey,
      render: () => {
        renderAttempts += 1;
        return renderAttempts === 1
          ? {
              ok: false,
              renderPath: "incremental",
              failure: { stage: "transcript", code: "dom-commit-failed" },
            }
          : { ok: true, renderPath: "incremental", failure: null };
      },
      recoverRenderFailure: () => {
        recoveries += 1;
        return true;
      },
      ack: (
        publication: any,
        stage: string,
        outcome: string,
        reason: string | null,
        failure: unknown,
      ) => {
        acknowledgements.push({
          publicationId: publication.publicationId,
          stage,
          outcome,
          reason,
          failure,
        });
      },
    });
    const publication = (publicationId: string, deliverySequence: number) => ({
      schema: "zotero-agents.assistant-workspace-publication.v1",
      publicationId,
      owner: selectedOwner,
      publicationKind: "owner-presentation",
      publicationForm: "region",
      publicationCause: "steady-state",
      regionRevision: 1,
      deliverySequence,
      payload: nextPresentation,
    });

    client.apply(publication("publication-render-fails", 1));
    assert.equal(snapshot.selection.presentation.title, "Task Alpha");
    assert.equal(recoveries, 1);
    assert.deepInclude(acknowledgements[1], {
      publicationId: "publication-render-fails",
      stage: "render-complete",
      outcome: "rejected",
      reason: "render-failed",
      failure: { stage: "transcript", code: "dom-commit-failed" },
    });

    client.apply(publication("publication-render-retry", 2));
    assert.equal(snapshot.selection.presentation.title, "Updated Task");
    assert.deepInclude(acknowledgements[3], {
      publicationId: "publication-render-retry",
      stage: "render-complete",
      outcome: "accepted",
      reason: null,
      failure: null,
    });
  });
});
