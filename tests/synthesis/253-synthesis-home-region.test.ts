import { h, render } from "preact";
import { assert } from "chai";

import {
  captureRegionSubtrees,
  assertRegionSubtreesPreserved,
  createSidebarDomEnvironment,
  installSidebarDomGlobals,
  restoreSidebarDomGlobals,
} from "../helpers/sidebarDomEnv";
import {
  SYNTHESIS_WORKBENCH_DEFAULT_MESSAGES,
  formatSynthesisWorkbenchMessage,
} from "../../src/shared/synthesisWorkbenchI18nContract";
import {
  HomeRegion,
  projectSynthesisWorkbenchHomeSelection,
  type SynthesisWorkbenchHomeProjectionInput,
  type SynthesisWorkbenchHomeSelection,
  type SynthesisWorkbenchHomeText,
} from "../../src/synthesis/components/HomeRegion";

const t: SynthesisWorkbenchHomeText = (key, args = {}) =>
  formatSynthesisWorkbenchMessage(
    SYNTHESIS_WORKBENCH_DEFAULT_MESSAGES[key],
    args,
  );

function flush() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

function makeTopicRow(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    id: "topic-1",
    title: "Topic One",
    definition: "A topic about things",
    paper_count: 3,
    source_materials_percent: 80,
    source_materials_status: "partial",
    freshness: "fresh",
    candidate_count: 0,
    updated_at: "2026-09-01T00:00:00.000Z",
    ...overrides,
  };
}

function makeWebdav(overrides: Record<string, unknown> = {}) {
  return {
    queue_state: "idle",
    paused: false,
    adapter_configured: true,
    base_url: "https://dav.example.test",
    remote_path: "/bundles/main",
    conflict_count: 0,
    conflict_assets: [],
    conflictActions: [],
    diagnostics: [],
    allowedActions: [
      "syncWebDavNow",
      "pauseWebDavSync",
      "resumeWebDavSync",
      "retryWebDavSync",
      "resolveWebDavSyncConflict",
    ],
    ...overrides,
  };
}

function makeInput(
  overrides: Record<string, unknown> = {},
): SynthesisWorkbenchHomeProjectionInput {
  const snapshot: Record<string, unknown> = {
    actions: { inFlight: [] },
    artifacts: { rows: [] },
    registry: { rows: [], cleanupProposals: [], matchProposals: [] },
    reviews: {
      summary: {
        openCount: 0,
        indexCount: 0,
        conceptCount: 0,
        topicGraphCount: 0,
      },
    },
    concepts: { reviewItems: [] },
    topicGraph: { reviewItems: [] },
    graph: { visibleNodes: [], visibleEdges: [] },
    sync: { webdav: makeWebdav() },
    ...(overrides.snapshot as Record<string, unknown> | undefined),
  };
  return {
    snapshot: snapshot as SynthesisWorkbenchHomeProjectionInput["snapshot"],
    localPendingOperationKeys: overrides.localPendingOperationKeys as
      | string[]
      | undefined,
  };
}

describe("synthesis workbench HomeRegion (src/synthesis/components)", function () {
  beforeEach(function () {
    installSidebarDomGlobals(createSidebarDomEnvironment());
  });

  afterEach(function () {
    restoreSidebarDomGlobals();
  });

  function renderHome(selection: SynthesisWorkbenchHomeSelection) {
    const dispatched: Array<{
      action: string;
      payload: Record<string, unknown> | undefined;
    }> = [];
    const root = document.createElement("div");
    document.body.appendChild(root);
    const mount = document.createElement("div");
    root.appendChild(mount);
    const renderHomeRegion = (next: SynthesisWorkbenchHomeSelection) =>
      render(
        h(HomeRegion, {
          selection: next,
          t,
          onAction: (action, payload) => dispatched.push({ action, payload }),
        }),
        mount,
      );
    renderHomeRegion(selection);
    return { root, mount, dispatched, renderHomeRegion };
  }

  it("renders insight cards with projected counts and review fallback", function () {
    const selection = projectSynthesisWorkbenchHomeSelection(
      makeInput({
        snapshot: {
          actions: { inFlight: [] },
          artifacts: { rows: [makeTopicRow()] },
          registry: {
            rows: [{ id: "p1" }, { id: "p2" }],
            cleanupProposals: [{ status: "open" }, { status: "accepted" }],
            matchProposals: [{ status: "open" }],
          },
          reviews: { summary: {} },
          concepts: { reviewItems: [{ status: "open" }] },
          topicGraph: { reviewItems: [] },
          graph: {
            visibleNodes: [{}, {}, {}, {}, {}],
            visibleEdges: [{}, {}, {}],
          },
          sync: { webdav: makeWebdav() },
        },
      }),
    );
    const { root } = renderHome(selection);
    const cards = root.querySelectorAll(".insight-card");
    assert.equal(cards.length, 4);
    assert.equal(
      cards[0].querySelector(".insight-value")?.textContent,
      "2",
      "registered papers count",
    );
    assert.ok(cards[0].classList.contains("teal"));
    assert.equal(
      cards[1].querySelector(".insight-value")?.textContent,
      "1",
      "topics count",
    );
    assert.equal(
      cards[2].querySelector(".insight-value")?.textContent,
      "5",
      "graph node count",
    );
    // index 2 (open cleanup+match proposals) + 1 concept = 3 open review items.
    assert.equal(
      cards[3].querySelector(".insight-value")?.textContent,
      "3",
      "review open count uses the fallback rows",
    );
    assert.ok(cards[3].classList.contains("orange"));
    assert.ok(root.querySelector(".sync-panel"), "sync panel rendered");
  });

  it("renders the empty state when there are no topics", function () {
    const { root } = renderHome(
      projectSynthesisWorkbenchHomeSelection(makeInput()),
    );
    const empty = root.querySelector(".empty-state");
    assert.ok(empty, "empty state rendered");
    assert.ok(empty!.classList.contains("empty-state-info"));
    assert.equal(
      empty!.querySelector(".empty-state-title")?.textContent,
      "No synthesis topics yet",
    );
    assert.equal(root.querySelectorAll(".topic-card").length, 0);
  });

  it("sorts top topics by paper count and caps at eight cards", function () {
    const rows = [
      makeTopicRow({ id: "t-low", title: "Low", paper_count: 1 }),
      makeTopicRow({ id: "t-high", title: "High", paper_count: 9 }),
      makeTopicRow({ id: "t-mid", title: "Mid", paper_count: 5 }),
    ];
    for (let index = 0; index < 8; index += 1) {
      rows.push(
        makeTopicRow({
          id: `t-fill-${index}`,
          title: `Fill ${index}`,
          paper_count: 0,
        }),
      );
    }
    const { root } = renderHome(
      projectSynthesisWorkbenchHomeSelection(
        makeInput({
          snapshot: {
            ...makeInput().snapshot,
            artifacts: { rows },
          },
        }),
      ),
    );
    const cards = root.querySelectorAll(".topic-card");
    assert.equal(cards.length, 8, "grid capped at eight");
    const titles = Array.from(cards).map(
      (card) => card.querySelector(".topic-card-head strong")?.textContent,
    );
    assert.deepEqual(titles.slice(0, 3), ["High", "Mid", "Low"]);
    const firstMeta = cards[0].querySelectorAll(".topic-card-meta span");
    assert.equal(firstMeta[0].textContent, "9 papers");
    // Legacy formatting eats the placeholder percent sign: "%percent% ready"
    // renders as "80 ready"; the port keeps that behavior.
    assert.equal(firstMeta[1].textContent, "80 ready");
    const freshnessBadge = cards[0].querySelector(".topic-card-head .badge");
    assert.ok(freshnessBadge!.classList.contains("ok"));
    assert.equal(freshnessBadge!.textContent, "fresh");
    const meterFill = cards[0].querySelector<HTMLElement>(".topic-meter span");
    assert.equal(meterFill!.style.width, "80%");
  });

  it("dispatches selectTab artifacts from the View All button", async function () {
    const { root, dispatched } = renderHome(
      projectSynthesisWorkbenchHomeSelection(makeInput()),
    );
    const heading = Array.from(root.querySelectorAll(".section-heading")).find(
      (node) => node.textContent?.includes("Top Topics"),
    );
    const button = heading!.querySelector("button")!;
    button.click();
    await flush();
    assert.deepEqual(dispatched, [
      { action: "selectTab", payload: { tab: "artifacts" } },
    ]);
  });

  it("dispatches openTopicArtifact when a topic card is clicked", async function () {
    const { root, dispatched } = renderHome(
      projectSynthesisWorkbenchHomeSelection(
        makeInput({
          snapshot: {
            ...makeInput().snapshot,
            artifacts: { rows: [makeTopicRow({ id: "topic-42" })] },
          },
        }),
      ),
    );
    root.querySelector<HTMLButtonElement>(".topic-card")!.click();
    await flush();
    assert.deepEqual(dispatched, [
      {
        action: "hostCommand",
        payload: {
          command: "openTopicArtifact",
          args: { topicId: "topic-42" },
        },
      },
    ]);
  });

  it("renders sync toolbar actions with allowed-action gating", async function () {
    const allowed = renderHome(
      projectSynthesisWorkbenchHomeSelection(makeInput()),
    );
    const toolbar = allowed.root.querySelector(".toolbar")!;
    const buttons = toolbar.querySelectorAll("button");
    assert.equal(buttons.length, 3, "sync now + pause/resume + retry");
    assert.equal(buttons[1].textContent, "Pause WebDAV");
    (buttons[0] as HTMLButtonElement).click();
    (buttons[1] as HTMLButtonElement).click();
    (buttons[2] as HTMLButtonElement).click();
    await flush();
    assert.deepEqual(allowed.dispatched, [
      { action: "hostCommand", payload: { command: "syncWebDavNow" } },
      { action: "hostCommand", payload: { command: "pauseWebDavSync" } },
      { action: "hostCommand", payload: { command: "retryWebDavSync" } },
    ]);

    const paused = renderHome(
      projectSynthesisWorkbenchHomeSelection(
        makeInput({
          snapshot: {
            ...makeInput().snapshot,
            sync: { webdav: makeWebdav({ paused: true }) },
          },
        }),
      ),
    );
    const pausedButtons = paused.root.querySelectorAll(".toolbar button");
    assert.equal(pausedButtons[1].textContent, "Resume WebDAV");
    (pausedButtons[1] as HTMLButtonElement).click();
    await flush();
    assert.deepEqual(paused.dispatched, [
      { action: "hostCommand", payload: { command: "resumeWebDavSync" } },
    ]);

    const gated = renderHome(
      projectSynthesisWorkbenchHomeSelection(
        makeInput({
          snapshot: {
            ...makeInput().snapshot,
            sync: { webdav: makeWebdav({ allowedActions: [] }) },
          },
        }),
      ),
    );
    const gatedButtons =
      gated.root.querySelectorAll<HTMLButtonElement>(".toolbar button");
    gatedButtons.forEach((button) => assert.isTrue(button.disabled));
    (gatedButtons[0] as HTMLButtonElement).click();
    await flush();
    assert.deepEqual(gated.dispatched, [], "disabled buttons do not dispatch");
  });

  it("offers only the preferences action when the adapter is unconfigured", async function () {
    const { root, dispatched } = renderHome(
      projectSynthesisWorkbenchHomeSelection(
        makeInput({
          snapshot: {
            ...makeInput().snapshot,
            sync: { webdav: makeWebdav({ adapter_configured: false }) },
          },
        }),
      ),
    );
    const buttons = root.querySelectorAll(".sync-panel .toolbar button");
    assert.equal(buttons.length, 1);
    (buttons[0] as HTMLButtonElement).click();
    await flush();
    assert.deepEqual(dispatched, [
      { action: "hostCommand", payload: { command: "openPreferences" } },
    ]);
  });

  it("marks pending operations busy and logs the local pending line", function () {
    const { root } = renderHome(
      projectSynthesisWorkbenchHomeSelection(
        makeInput({ localPendingOperationKeys: ["syncWebDavNow"] }),
      ),
    );
    const syncNow = root.querySelector<HTMLButtonElement>(
      ".sync-panel .toolbar button",
    )!;
    assert.isTrue(syncNow.disabled);
    assert.ok(syncNow.classList.contains("is-busy"));
    assert.equal(syncNow.getAttribute("aria-busy"), "true");
    assert.ok(syncNow.querySelector(".button-spinner"), "spinner rendered");
    const lines = root.querySelectorAll(".sync-log-line");
    assert.equal(lines.length, 1);
    assert.ok(lines[0].classList.contains("sync-log-level-info"));
    assert.equal(
      lines[0].querySelector(".sync-log-message")?.textContent,
      "WebDAV Sync is running.",
    );
  });

  it("renders the conflict review panel and dispatches resolve actions", async function () {
    const conflictWebdav = makeWebdav({
      queue_state: "blocked_conflict",
      conflict_count: 2,
      conflict_assets: [
        {
          asset_path: "bundles/main.tar",
          reason: "both_changed",
          base_hash: "base-1",
          local_hash: "local-1",
          remote_hash: "remote-1",
        },
        { asset_path: "bundles/other.tar", reason: "both_changed" },
      ],
      conflictActions: ["keep_local", "use_remote"],
    });
    const { root, dispatched } = renderHome(
      projectSynthesisWorkbenchHomeSelection(
        makeInput({
          snapshot: {
            ...makeInput().snapshot,
            sync: { webdav: conflictWebdav },
          },
        }),
      ),
    );
    const panel = root.querySelector(".sync-review-panel");
    assert.ok(panel, "conflict panel rendered");
    assert.equal(
      panel!.querySelector(".review-card-title strong")?.textContent,
      "bundles/main.tar",
    );
    assert.equal(
      panel!.querySelector(".review-card-header .muted")?.textContent,
      "1 more asset(s) waiting",
    );
    const detailText = Array.from(panel!.querySelectorAll(".detail-row")).map(
      (row) => row.textContent,
    );
    assert.ok(
      detailText.some((text) => text?.includes("base-1")),
      "hash rows rendered",
    );
    const buttons = panel!.querySelectorAll<HTMLButtonElement>(
      ".action-group button",
    );
    assert.equal(buttons.length, 5);
    assert.isFalse(buttons[0].disabled, "keep_local allowed");
    assert.isTrue(
      buttons[1].disabled,
      "save_remote_copy not in conflictActions",
    );
    buttons[0].click();
    await flush();
    assert.deepEqual(dispatched, [
      {
        action: "hostCommand",
        payload: {
          command: "resolveWebDavSyncConflict",
          args: { action: "keep_local" },
        },
      },
    ]);
  });

  it("hides the conflict panel unless the queue is blocked by conflicts", function () {
    const idle = renderHome(
      projectSynthesisWorkbenchHomeSelection(makeInput()),
    );
    assert.isNull(idle.root.querySelector(".sync-review-panel"));

    const blockedWithoutAssets = renderHome(
      projectSynthesisWorkbenchHomeSelection(
        makeInput({
          snapshot: {
            ...makeInput().snapshot,
            sync: { webdav: makeWebdav({ queue_state: "blocked_conflict" }) },
          },
        }),
      ),
    );
    assert.isNull(
      blockedWithoutAssets.root.querySelector(".sync-review-panel"),
      "no conflict assets, no panel",
    );
  });

  it("renders feedback log lines for host operations, diagnostics, connection and last run", function () {
    const { root } = renderHome(
      projectSynthesisWorkbenchHomeSelection(
        makeInput({
          snapshot: {
            ...makeInput().snapshot,
            actions: {
              inFlight: [
                {
                  key: "syncWebDavNow",
                  command: "syncWebDavNow",
                  status: "running",
                  label: "WebDAV Sync",
                },
                {
                  key: "runSynthesizeTopic",
                  command: "runSynthesizeTopic",
                  status: "running",
                  label: "Create Topic",
                },
              ],
              lastFailed: {
                key: "retryWebDavSync",
                command: "retryWebDavSync",
                status: "failed",
                label: "Retry WebDAV",
                message: "boom",
              },
              lastCompleted: {
                key: "pauseWebDavSync",
                command: "pauseWebDavSync",
                status: "completed",
                label: "Pause WebDAV",
              },
            },
            sync: {
              diagnostics: [
                { code: "root_diag", severity: "warning", message: "root" },
              ],
              webdav: makeWebdav({
                diagnostics: [
                  { code: "io_error", severity: "error", message: "disk" },
                ],
                connection_test: {
                  ok: false,
                  tested_at: "2026-09-05T01:00:00.000Z",
                  diagnostics: [
                    { code: "http_401", severity: "error", message: "denied" },
                  ],
                },
                last_run_status: "failed_retryable",
                last_run_at: "2026-09-05T00:00:00.000Z",
              }),
            },
          },
        }),
      ),
    );
    const lines = Array.from(root.querySelectorAll(".sync-log-line")).map(
      (line) => ({
        cls: line.className,
        source: line.querySelector(".sync-log-source")?.textContent,
        message: line.querySelector(".sync-log-message")?.textContent,
      }),
    );
    // Non-sync in-flight operations must not appear in the log.
    assert.isFalse(
      lines.some((line) => line.message?.includes("Create Topic")),
    );
    assert.ok(
      lines.some(
        (line) =>
          line.cls.includes("sync-log-level-info") &&
          line.message === "WebDAV Sync running",
      ),
      "in-flight sync line",
    );
    assert.ok(
      lines.some(
        (line) =>
          line.cls.includes("sync-log-level-error") &&
          line.message === "Retry WebDAV: boom",
      ),
      "failed line",
    );
    assert.ok(
      lines.some(
        (line) =>
          line.cls.includes("sync-log-level-ok") &&
          line.message === "Pause WebDAV completed",
      ),
      "completed line",
    );
    assert.ok(
      lines.some(
        (line) =>
          line.cls.includes("sync-log-level-warn") &&
          line.message === "root_diag: root",
      ),
      "root diagnostic line",
    );
    assert.ok(
      lines.some(
        (line) =>
          line.cls.includes("sync-log-level-error") &&
          line.message === "io_error: disk",
      ),
      "webdav diagnostic line",
    );
    assert.ok(
      lines.some(
        (line) =>
          line.cls.includes("sync-log-level-warn") &&
          line.message === "not ready 2026-09-05T01:00:00.000Z",
      ),
      "connection test line",
    );
    assert.ok(
      lines.some(
        (line) =>
          line.cls.includes("sync-log-level-error") &&
          line.message === "http_401: denied",
      ),
      "connection diagnostic line",
    );
    assert.ok(
      lines.some(
        (line) =>
          line.cls.includes("sync-log-level-error") &&
          line.message === "failed_retryable 2026-09-05T00:00:00.000Z",
      ),
      "last run line",
    );
  });

  it("falls back to the no-activity line when nothing happened", function () {
    const { root } = renderHome(
      projectSynthesisWorkbenchHomeSelection(makeInput()),
    );
    const lines = root.querySelectorAll(".sync-log-line");
    assert.equal(lines.length, 1);
    assert.equal(
      lines[0].querySelector(".sync-log-message")?.textContent,
      "No WebDAV Sync activity recorded.",
    );
  });

  it("keeps the subtree identity when an equal selection re-renders", function () {
    const input = makeInput({
      snapshot: {
        ...makeInput().snapshot,
        artifacts: { rows: [makeTopicRow()] },
      },
    });
    const first = projectSynthesisWorkbenchHomeSelection(input);
    const { mount, renderHomeRegion } = renderHome(first);
    const captured = captureRegionSubtrees({ home: mount });

    // Same visible content, freshly projected object graph.
    renderHomeRegion(projectSynthesisWorkbenchHomeSelection(input));
    assertRegionSubtreesPreserved({ home: mount }, captured);

    // A real change updates the grid instead of reusing stale nodes.
    const changed = projectSynthesisWorkbenchHomeSelection(
      makeInput({
        snapshot: {
          ...makeInput().snapshot,
          artifacts: {
            rows: [
              makeTopicRow(),
              makeTopicRow({ id: "topic-2", title: "Second", paper_count: 1 }),
            ],
          },
        },
      }),
    );
    renderHomeRegion(changed);
    assert.equal(
      mount.querySelectorAll(".topic-card").length,
      2,
      "changed selection re-renders the topic grid",
    );
  });

  it("tolerates malformed rows and missing sections", function () {
    const selection = projectSynthesisWorkbenchHomeSelection({
      snapshot: {
        actions: { inFlight: [null, "junk", { command: "syncWebDavNow" }] },
        artifacts: { rows: [null, 42, { id: "t-1" }] },
        registry: { rows: null, cleanupProposals: "nope", matchProposals: [] },
        reviews: { summary: null },
        concepts: { reviewItems: [{ status: "open" }, null] },
        topicGraph: {},
        graph: { visibleNodes: "nope", visibleEdges: [] },
        sync: null,
      },
      localPendingOperationKeys: ["", "unrelatedCommand"],
    });
    const { root } = renderHome(selection);
    const cards = root.querySelectorAll(".insight-card");
    assert.equal(cards[0].querySelector(".insight-value")?.textContent, "0");
    assert.equal(cards[1].querySelector(".insight-value")?.textContent, "1");
    // One open concept review item feeds the review fallback.
    assert.equal(cards[3].querySelector(".insight-value")?.textContent, "1");
    const topicCard = root.querySelector(".topic-card");
    assert.ok(topicCard, "narrowed topic row rendered");
    assert.equal(
      topicCard!.querySelector(".topic-card-head strong")?.textContent,
      "t-1",
      "missing title falls back to the topic id",
    );
    assert.equal(
      topicCard!.querySelector(".topic-card-summary")?.textContent,
      "No topic summary is available yet.",
    );
    // Sync section narrows to defaults: unconfigured adapter path.
    assert.equal(
      root.querySelector(".sync-summary-value")?.textContent,
      "disabled",
    );
    const lines = root.querySelectorAll(".sync-log-line");
    assert.equal(lines.length, 1, "in-flight entry without key still logs");
  });
});
