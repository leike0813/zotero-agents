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
    const environment = createSidebarDomEnvironment();
    const prototype = environment.window.HTMLDialogElement.prototype;
    prototype.showModal = function () {
      this.open = true;
    };
    prototype.close = function () {
      this.open = false;
      this.dispatchEvent(new environment.window.Event("close"));
    };
    installSidebarDomGlobals(environment);
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
    assert.equal(buttons.length, 2, "sync now + pause/resume");
    assert.equal(buttons[1].textContent, "Pause WebDAV");
    (buttons[0] as HTMLButtonElement).click();
    (buttons[1] as HTMLButtonElement).click();

    await flush();
    assert.deepEqual(allowed.dispatched, [
      { action: "hostCommand", payload: { command: "syncWebDavNow" } },
      { action: "hostCommand", payload: { command: "pauseWebDavSync" } },
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
    const pausedButtons = paused.root.querySelectorAll(
      ".sync-panel .toolbar button",
    );
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
    const gatedButtons = gated.root.querySelectorAll<HTMLButtonElement>(
      ".sync-panel .toolbar button",
    );
    gatedButtons.forEach((button) => assert.isTrue(button.disabled));
    (gatedButtons[0] as HTMLButtonElement).click();
    await flush();
    assert.deepEqual(gated.dispatched, [], "disabled buttons do not dispatch");
  });

  it("offers one shared preferences action when both services are unconfigured", async function () {
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
    const buttons = root.querySelectorAll(
      ".home-services > .section-heading button",
    );
    assert.equal(buttons.length, 1);
    assert.equal(
      root.querySelectorAll(".sync-panel button, .retrieval-panel button")
        .length,
      0,
    );
    (buttons[0] as HTMLButtonElement).click();
    await flush();
    assert.deepEqual(dispatched, [
      { action: "hostCommand", payload: { command: "openPreferences" } },
    ]);
  });

  it("marks pending operations busy and shows the current sync status", function () {
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
    assert.include(
      root.querySelector(".sync-panel [role=status]")?.textContent,
      "Syncing",
    );
    assert.isNull(root.querySelector(".sync-feedback-terminal"));
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
    assert.isNull(
      root.querySelector(".sync-review-panel"),
      "details remain absent before opening",
    );
    const trigger = Array.from(
      root.querySelectorAll<HTMLButtonElement>(".sync-panel button"),
    ).find((button) => button.textContent === "Resolve conflicts")!;
    trigger.focus();
    trigger.click();
    await flush();
    const dialog = root.querySelector<HTMLDialogElement>("dialog")!;
    assert.isTrue(dialog.open);
    const panel = dialog.querySelector(".sync-review-panel");
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

  it("restores focus on Escape and closes conflict review when conflicts clear", async function () {
    const selection = projectSynthesisWorkbenchHomeSelection(
      makeInput({
        snapshot: {
          ...makeInput().snapshot,
          sync: {
            webdav: makeWebdav({
              queue_state: "blocked_conflict",
              conflict_assets: [
                { asset_path: "bundle", reason: "both_changed" },
              ],
            }),
          },
        },
      }),
    );
    const { root, renderHomeRegion } = renderHome(selection);
    const trigger = Array.from(
      root.querySelectorAll<HTMLButtonElement>(".sync-panel button"),
    ).find((button) => button.textContent === "Resolve conflicts")!;
    trigger.focus();
    trigger.click();
    await flush();
    const dialog = root.querySelector<HTMLDialogElement>("dialog")!;
    dialog.dispatchEvent(new window.Event("cancel", { cancelable: true }));
    await flush();
    assert.isFalse(dialog.open);
    assert.strictEqual(document.activeElement, trigger);
    trigger.click();
    await flush();
    root
      .querySelector<HTMLButtonElement>(".home-conflict-header button")!
      .click();
    await flush();
    assert.isFalse(dialog.open);
    assert.strictEqual(document.activeElement, trigger);
    trigger.click();
    await flush();
    renderHomeRegion(projectSynthesisWorkbenchHomeSelection(makeInput()));
    await flush();
    assert.isFalse(dialog.open);
    assert.isNull(root.querySelector(".sync-review-panel"));
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

  for (const [queueState, paused, expected] of [
    ["idle", false, "Ready"],
    ["queued", false, "Queued"],
    ["syncing", false, "Syncing"],
    ["idle", true, "Paused"],
    ["failed_retryable", false, "Failed"],
    ["failed_permanent", false, "Failed"],
    ["disabled", false, "Disabled"],
    ["blocked_conflict", false, "Conflicts need attention"],
  ] as const) {
    it(`shows the localized ${queueState} sync state without technical details`, function () {
      const { root } = renderHome(
        projectSynthesisWorkbenchHomeSelection(
          makeInput({
            snapshot: {
              ...makeInput().snapshot,
              sync: {
                webdav: makeWebdav({
                  queue_state: queueState,
                  paused,
                  diagnostics: [
                    {
                      code: "raw_error",
                      message: "raw diagnostic",
                      severity: "error",
                    },
                  ],
                  last_run_at: "2026-09-05",
                }),
              },
            },
          }),
        ),
      );
      assert.include(
        root.querySelector(".sync-panel [role=status]")?.textContent,
        expected,
      );
      for (const hidden of [
        "https://dav.example.test",
        "/bundles/main",
        "raw_error",
        "raw diagnostic",
        "2026-09-05",
      ]) {
        assert.notInclude(
          root.querySelector(".sync-panel")?.textContent,
          hidden,
        );
      }
    });
  }

  it("dispatches retry only from a failed sync state", async function () {
    const { root, dispatched } = renderHome(
      projectSynthesisWorkbenchHomeSelection(
        makeInput({
          snapshot: {
            ...makeInput().snapshot,
            sync: { webdav: makeWebdav({ queue_state: "failed_retryable" }) },
          },
        }),
      ),
    );
    const retry = Array.from(
      root.querySelectorAll<HTMLButtonElement>(".sync-panel button"),
    ).find((button) => button.textContent === "Retry WebDAV")!;
    retry.click();
    await flush();
    assert.deepEqual(dispatched, [
      { action: "hostCommand", payload: { command: "retryWebDavSync" } },
    ]);
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

    const hidden = makeInput({
      snapshot: {
        ...input.snapshot,
        sync: {
          webdav: makeWebdav({
            last_run_at: "later",
            diagnostics: [
              { code: "detail", severity: "info", message: "hidden" },
            ],
          }),
        },
      },
    });
    renderHomeRegion(projectSynthesisWorkbenchHomeSelection(hidden));
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
        artifacts: {
          rows: [null, 42, { id: "t-1", summary: "legacy summary" }],
        },
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
      "No topic definition is available yet.",
    );
    assert.include(
      root.querySelector(".sync-panel [role=status]")?.textContent,
      "Not configured",
    );
  });
});
