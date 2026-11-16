import { assert } from "chai";
import { h, render } from "preact";

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
import { synthesisWorkbenchChromeSignatureInput } from "../../src/synthesis/synthesisWorkbenchPanelModel";
import { projectRetrievalSnapshot } from "../../src/modules/synthesis/workbench/synthesisWorkbenchTab";

const t: SynthesisWorkbenchHomeText = (key, args = {}) =>
  formatSynthesisWorkbenchMessage(
    SYNTHESIS_WORKBENCH_DEFAULT_MESSAGES[key],
    args,
  );

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

function makeRetrieval(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    enabled: true,
    status: "paused",
    activeIdentity: null,
    pendingIdentity: {
      modelId: "bge-m3",
      dimensions: 1024,
      queryPrefix: "q: ",
      documentPrefix: "d: ",
    },
    activeScope: null,
    pendingScope: {
      libraryIds: [1],
      sourceKinds: ["metadata"],
      includeTopics: false,
    },
    publication: null,
    progress: {
      completedGroups: 1,
      totalGroups: 3,
      completedFragments: 12,
      failedGroups: 1,
      missingGroups: 2,
    },
    updatedAt: "2026-10-07T00:00:00.000Z",
    issues: [
      { code: "source_unavailable", sourceKind: "metadata", affectedCount: 2 },
    ],
    connections: [
      {
        id: "c1",
        name: "Local Ollama",
        protocol: "ollama",
        baseUrl: "http://127.0.0.1:11434",
        modelId: "bge-m3",
        queryPrefix: "q: ",
        documentPrefix: "d: ",
        dimensions: 1024,
        tested: true,
      },
      {
        id: "c2",
        name: "Remote",
        protocol: "openai",
        baseUrl: "https://api.example.test",
        modelId: "text-embedding-3-small",
        queryPrefix: "",
        documentPrefix: "",
      },
    ],
    primaryConnectionId: "c1",
    fallbackConnectionIds: ["c2"],
    maintenance: null,
    ...overrides,
  };
}

function makeInput(
  retrieval: Record<string, unknown> = makeRetrieval(),
): SynthesisWorkbenchHomeProjectionInput {
  return {
    snapshot: {
      actions: { inFlight: [] },
      artifacts: {
        rows: [{ id: "stable-topic", title: "Stable topic", paper_count: 1 }],
      },
      registry: { rows: [], cleanupProposals: [], matchProposals: [] },
      reviews: { summary: {} },
      concepts: { reviewItems: [] },
      topicGraph: { reviewItems: [] },
      graph: { visibleNodes: [], visibleEdges: [] },
      sync: null,
      retrieval,
    },
  } as unknown as SynthesisWorkbenchHomeProjectionInput;
}

function buttonByText(root: ParentNode, text: string) {
  return Array.from(root.querySelectorAll<HTMLButtonElement>("button")).find(
    (button) => button.textContent?.trim() === text,
  );
}

describe("synthesis workbench Home retrieval panel", function () {
  beforeEach(function () {
    installSidebarDomGlobals(createSidebarDomEnvironment());
  });

  afterEach(function () {
    document.body.innerHTML = "";
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

  function selectionFor(retrieval: Record<string, unknown>) {
    return projectSynthesisWorkbenchHomeSelection(makeInput(retrieval));
  }

  it("shows availability and coverage without configuration or diagnostic details", function () {
    const selection = selectionFor(makeRetrieval());
    const { root } = renderHome(selection);

    // Connection configuration form is no longer in the panel.
    assert.isNull(root.querySelector(".retrieval-form"));
    assert.isNull(root.querySelector(".retrieval-connections"));

    assert.include(
      root.querySelector(".retrieval-panel [role=status]")!.textContent,
      "Paused",
    );
    assert.notInclude(root.textContent, "bge-m3");
    assert.notInclude(root.textContent, "source_unavailable");
    assert.notInclude(root.textContent, "2026-10-07");

    const counters =
      root.querySelector(".home-service-notices")!.textContent || "";
    assert.match(counters, /Coverage gaps 2/);
    assert.match(counters, /Failures 1/);
  });

  it("shows open-preferences button when no connection is configured", async function () {
    const noConn = renderHome(selectionFor(makeRetrieval({ connections: [] })));
    const panel = noConn.root.querySelector(".retrieval-panel")!;
    assert.equal(panel.querySelectorAll("button").length, 0);
    const btn = noConn.root.querySelector<HTMLButtonElement>(
      ".home-services > .section-heading button",
    )!;
    assert.ok(btn, "one shared preferences button present when unconfigured");
    btn.click();
    await flush();
    assert.deepEqual(noConn.dispatched, [
      {
        action: "hostCommand",
        payload: { command: "openPreferences" },
      },
    ]);

    // Configured: open-preferences button must be absent from retrieval panel
    const withConn = renderHome(selectionFor(makeRetrieval()));
    const withPanel = withConn.root.querySelector(".retrieval-panel")!;
    assert.isUndefined(
      buttonByText(withPanel, "Open preferences"),
      "open preferences button absent from retrieval panel when configured",
    );
  });

  it("keeps build disabled until a tested pending identity exists", async function () {
    const untested = renderHome(
      selectionFor(makeRetrieval({ pendingIdentity: null })),
    );
    for (const label of ["Build index", "Rebuild index"]) {
      const button = buttonByText(untested.root, label)!;
      assert.isTrue(button.disabled, label + " disabled without identity");
      button.click();
    }
    await flush();
    assert.deepEqual(untested.dispatched, []);

    const ready = renderHome(selectionFor(makeRetrieval()));
    buttonByText(ready.root, "Build index")!.click();
    await flush();
    assert.equal(ready.dispatched.length, 1);
    const dispatch = ready.dispatched[0];
    assert.equal(dispatch.action, "hostCommand");
    assert.equal(dispatch.payload!.command, "retrievalBuildIndex");
    const args = dispatch.payload!.args as Record<string, unknown>;
    assert.deepEqual(args.identity, {
      modelId: "bge-m3",
      dimensions: 1024,
      queryPrefix: "q: ",
      documentPrefix: "d: ",
    });
    assert.deepEqual(args.scope, {
      libraryIds: [1],
      sourceKinds: ["metadata"],
      includeTopics: false,
    });
  });

  it("dispatches cancel/retry/continue with correct gate logic; connection test moved to prefs", async function () {
    const running = renderHome(
      selectionFor(
        makeRetrieval({
          maintenance: {
            operation_id: "op-1",
            status: "running",
            message: "Encoding",
          },
        }),
      ),
    );
    buttonByText(running.root, "Cancel")!.click();
    await flush();
    assert.deepEqual(running.dispatched, [
      {
        action: "hostCommand",
        payload: {
          command: "retrievalCancelIndex",
          args: { operationId: "op-1" },
        },
      },
    ]);
    // A running run can only be canceled.
    assert.isUndefined(buttonByText(running.root, "Retry"));
    assert.isUndefined(buttonByText(running.root, "Continue"));

    const failed = renderHome(
      selectionFor(
        makeRetrieval({
          maintenance: { operation_id: "op-2", status: "failed" },
        }),
      ),
    );
    assert.isTrue(buttonByText(failed.root, "Retry")!.disabled === false);
    assert.isUndefined(buttonByText(failed.root, "Continue"));
    assert.isUndefined(buttonByText(failed.root, "Cancel"));
    buttonByText(failed.root, "Retry")!.click();
    await flush();
    assert.deepEqual(failed.dispatched, [
      {
        action: "hostCommand",
        payload: {
          command: "retrievalRetryIndex",
          args: { operationId: "op-2" },
        },
      },
    ]);

    const canceled = renderHome(
      selectionFor(
        makeRetrieval({
          maintenance: { operation_id: "op-5", status: "canceled" },
        }),
      ),
    );
    assert.isTrue(buttonByText(canceled.root, "Retry")!.disabled === false);
    assert.isUndefined(buttonByText(canceled.root, "Continue"));

    const pending = renderHome(
      selectionFor(
        makeRetrieval({
          maintenance: {
            operation_id: "op-4",
            status: "pending",
            phase: "continuation_required",
          },
        }),
      ),
    );
    // Continue requires an explicit continuation-required phase.
    assert.isUndefined(buttonByText(pending.root, "Retry"));
    assert.isTrue(buttonByText(pending.root, "Continue")!.disabled === false);
    buttonByText(pending.root, "Continue")!.click();
    await flush();
    assert.deepEqual(pending.dispatched, [
      {
        action: "hostCommand",
        payload: {
          command: "retrievalContinueIndex",
          args: { operationId: "op-4" },
        },
      },
    ]);
  });

  it("disables continue for a queued pending run", async function () {
    const queued = renderHome(
      selectionFor(
        makeRetrieval({
          maintenance: {
            operation_id: "op-6",
            status: "pending",
            phase: "queued",
          },
        }),
      ),
    );
    assert.isUndefined(buttonByText(queued.root, "Continue"));
    assert.isUndefined(buttonByText(queued.root, "Retry"));
  });
  it("configuration form is now in prefs; region has no form or connection list", function () {
    // Form, connection list, and dimension/primary inputs have all moved to
    // the preferences panel. Verify they are absent from the Home panel.
    const { root } = renderHome(selectionFor(makeRetrieval()));
    assert.isNull(root.querySelector(".retrieval-form"));
    assert.isNull(root.querySelector(".retrieval-connections"));
    assert.isNull(root.querySelector(".retrieval-field-dimensions"));
    assert.isNull(root.querySelector(".retrieval-primary"));
  });

  it("keeps unrelated chrome regions out of the retrieval signature", function () {
    const build = (retrieval: Record<string, unknown>) => ({
      actions: {
        inFlight: [],
        lastCompleted: undefined,
        lastFailed: undefined,
        warnings: [],
      },
      maintenance: { backgroundJobs: { rows: [] } },
      sidecarStatus: undefined,
      sync: { status: "ready" },
      retrieval,
    });
    const before = synthesisWorkbenchChromeSignatureInput({
      snapshot: build(makeRetrieval()) as never,
      localPendingActions: new Map(),
      jobPopoverOpen: false,
    });
    const after = synthesisWorkbenchChromeSignatureInput({
      snapshot: build(
        makeRetrieval({
          progress: {
            completedGroups: 2,
            totalGroups: 3,
            completedFragments: 33,
            failedGroups: 0,
            missingGroups: 0,
          },
        }),
      ) as never,
      localPendingActions: new Map(),
      jobPopoverOpen: false,
    });
    assert.deepEqual(before, after);
  });

  it("updates task progress without replacing focused controls or unrelated cards", function () {
    const running = makeRetrieval({
      maintenance: { operation_id: "op-progress", status: "running" },
    });
    const selection = selectionFor(running);
    const { mount, renderHomeRegion } = renderHome(selection);
    const captured = captureRegionSubtrees({ home: mount });
    // Identical visible content: an equal selection must not rebuild the tree.
    renderHomeRegion(selectionFor(running));
    assertRegionSubtreesPreserved({ home: mount }, captured);
    const cancel = buttonByText(mount, "Cancel")!;
    cancel.focus();
    const insights = mount.querySelector(".insight-grid");
    const sync = mount.querySelector(".sync-panel");
    const topics = mount.querySelector(".topic-grid");
    const topicCard = mount.querySelector(".topic-card");
    const scroll = mount.querySelector<HTMLElement>(".home-scroll")!;
    scroll.scrollTop = 37;
    assert.equal(
      mount.querySelector<HTMLProgressElement>("progress")!.value,
      1,
    );

    // Progress is a real content change and updates the Home region.
    renderHomeRegion(
      selectionFor(
        makeRetrieval({
          maintenance: { operation_id: "op-progress", status: "running" },
          issues: [],
          progress: {
            completedGroups: 3,
            totalGroups: 3,
            completedFragments: 50,
            failedGroups: 0,
            missingGroups: 0,
          },
        }),
      ),
    );
    assert.equal(
      mount.querySelector<HTMLProgressElement>("progress")!.value,
      3,
    );
    assert.strictEqual(document.activeElement, cancel);
    assert.strictEqual(mount.querySelector(".insight-grid"), insights);
    assert.strictEqual(mount.querySelector(".sync-panel"), sync);
    assert.strictEqual(mount.querySelector(".topic-grid"), topics);
    assert.strictEqual(mount.querySelector(".topic-card"), topicCard);
    assert.equal(scroll.scrollTop, 37);
  });

  it("keeps a published index available after an update fails and handles unknown task totals", function () {
    const { root, renderHomeRegion } = renderHome(
      selectionFor(
        makeRetrieval({
          status: "ready",
          publication: "pub-existing",
          maintenance: {
            operation_id: "failed-update",
            status: "failed",
            message: "raw diagnostic",
          },
        }),
      ),
    );
    assert.include(
      root.querySelector(".retrieval-panel .home-service-state")?.textContent,
      "Ready",
    );
    assert.include(
      root.querySelector(".home-service-task")?.textContent,
      "Failed",
    );
    assert.notInclude(root.textContent, "raw diagnostic");
    assert.isFalse(buttonByText(root, "Update index")!.disabled);
    renderHomeRegion(
      selectionFor(
        makeRetrieval({
          maintenance: { operation_id: "unknown-total", status: "running" },
          progress: { completedGroups: 0, totalGroups: 0 },
        }),
      ),
    );
    assert.isFalse(root.querySelector("progress")!.hasAttribute("value"));
  });

  it("dispatches cleanup and candidate recovery only after publication or recovery", async function () {
    const gated = renderHome(selectionFor(makeRetrieval()));
    assert.isTrue(
      buttonByText(gated.root, "Clean up / retry candidates")!.disabled,
      "cleanup gated without a publication or a recoverable run",
    );

    const published = renderHome(
      selectionFor(makeRetrieval({ publication: "pub-1" })),
    );
    buttonByText(published.root, "Clean up / retry candidates")!.click();
    await flush();
    assert.deepEqual(published.dispatched, [
      { action: "hostCommand", payload: { command: "retrievalCleanupIndex" } },
    ]);
  });
});

describe("synthesis workbench retrieval snapshot fallback", function () {
  const pendingIdentity = {
    modelId: "bge-m3",
    dimensions: 1024,
    queryPrefix: "q: ",
    documentPrefix: "",
  };

  function prefsStatus() {
    return {
      enabled: true,
      connections: [
        {
          id: "c1",
          name: "Local Ollama",
          protocol: "ollama" as const,
          baseUrl: "http://127.0.0.1:11434",
          modelId: "bge-m3",
          queryPrefix: "q: ",
          documentPrefix: "",
          credentialConfigured: true,
        },
      ],
      primaryConnectionId: "c1",
      fallbackConnectionIds: [],
      pendingScope: {
        libraryIds: [1],
        sourceKinds: ["metadata" as const],
        includeTopics: false,
      },
      connectionTests: {
        c1: {
          ok: true,
          tested_at: "2026-10-07T00:00:00.000Z",
          connection_id: "c1",
          model_id: "bge-m3",
          dimensions: 1024,
          diagnostics: [],
        },
      },
      presets: [],
    };
  }

  it("still publishes the Host settings when the native state read fails", function () {
    const snapshot = projectRetrievalSnapshot({
      prefs: prefsStatus() as never,
      native: null,
      previous: null,
      pendingIdentity,
      maintenance: null,
    });
    assert.isTrue(snapshot.enabled);
    assert.lengthOf(snapshot.connections, 1);
    assert.equal(snapshot.connections[0].dimensions, 1024);
    assert.equal(snapshot.primaryConnectionId, "c1");
    assert.equal(snapshot.status, "missing");
    assert.deepEqual(snapshot.pendingIdentity, pendingIdentity);
    assert.deepEqual(snapshot.issues, [
      { code: "vector_unavailable", sourceKind: null, affectedCount: 0 },
    ]);
  });

  it("keeps the previously loaded native facts on a later read failure", function () {
    const first = projectRetrievalSnapshot({
      prefs: prefsStatus() as never,
      native: {
        enabled: true,
        status: "ready",
        activeIdentity: pendingIdentity,
        pendingIdentity,
        activeScope: null,
        pendingScope: null,
        publication: "pub-1",
        progress: {
          completedGroups: 3,
          totalGroups: 3,
          completedFragments: 30,
          failedGroups: 0,
          missingGroups: 0,
        },
        updatedAt: "2026-10-07T00:00:00.000Z",
        issues: [],
      },
      previous: null,
      pendingIdentity,
      maintenance: null,
    });
    const second = projectRetrievalSnapshot({
      prefs: prefsStatus() as never,
      native: null,
      previous: first,
      pendingIdentity,
      maintenance: null,
    });
    assert.equal(second.status, "ready");
    assert.equal(second.publication, "pub-1");
    assert.deepEqual(second.progress, first.progress);
    assert.deepEqual(second.issues, []);
    assert.lengthOf(second.connections, 1);
  });
});
