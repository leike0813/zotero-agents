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
      artifacts: { rows: [] },
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

  it("renders tested/untested connections, pending identity and coverage counters", function () {
    const selection = selectionFor(makeRetrieval());
    const { root } = renderHome(selection);
    const connections = root.querySelectorAll(".retrieval-connection");
    assert.equal(connections.length, 2);
    assert.match(connections[0].textContent || "", /1024 dimensions/);
    assert.match(connections[0].textContent || "", /Untested|1024 dimensions/);
    assert.match(
      connections[1].textContent || "",
      /Untested - run a connection test/,
    );
    assert.match(connections[0].textContent || "", /Primary/);
    assert.match(connections[1].textContent || "", /Fallback/);

    const pendingValue = root.querySelectorAll(".retrieval-summary-value")[1]
      .textContent;
    assert.match(pendingValue || "", /bge-m3/);
    assert.match(pendingValue || "", /1024/);

    const counters =
      root.querySelector(".retrieval-counters")!.textContent || "";
    assert.match(counters, /Coverage gaps 2/);
    assert.match(counters, /Failures 1/);
    assert.match(root.textContent || "", /source_unavailable/);
  });

  it("keeps build disabled until a tested pending identity exists", async function () {
    const untested = renderHome(
      selectionFor(makeRetrieval({ pendingIdentity: null })),
    );
    for (const label of ["Build index", "Rebuild index", "Update index"]) {
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

  it("dispatches the connection test and cancels a running run", async function () {
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
    const testButton = buttonByText(
      running.root.querySelector(".retrieval-connection")!,
      "Test",
    )!;
    testButton.click();
    buttonByText(running.root, "Cancel")!.click();
    await flush();
    assert.deepEqual(running.dispatched, [
      {
        action: "hostCommand",
        payload: {
          command: "retrievalTestConnection",
          args: { connectionId: "c1" },
        },
      },
      {
        action: "hostCommand",
        payload: {
          command: "retrievalCancelIndex",
          args: { operationId: "op-1" },
        },
      },
    ]);
    assert.isTrue(
      buttonByText(running.root, "Retry")!.disabled,
      "retry gated while running",
    );
  });
  it("dispatches the connection test and gates cancel, retry and continue separately", async function () {
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
    buttonByText(
      running.root.querySelector(".retrieval-connection")!,
      "Test",
    )!.click();
    buttonByText(running.root, "Cancel")!.click();
    await flush();
    assert.deepEqual(running.dispatched, [
      {
        action: "hostCommand",
        payload: {
          command: "retrievalTestConnection",
          args: { connectionId: "c1" },
        },
      },
      {
        action: "hostCommand",
        payload: {
          command: "retrievalCancelIndex",
          args: { operationId: "op-1" },
        },
      },
    ]);
    // A running run can only be canceled.
    assert.isTrue(buttonByText(running.root, "Retry")!.disabled);
    assert.isTrue(buttonByText(running.root, "Continue")!.disabled);

    const failed = renderHome(
      selectionFor(
        makeRetrieval({
          maintenance: { operation_id: "op-2", status: "failed" },
        }),
      ),
    );
    assert.isTrue(buttonByText(failed.root, "Retry")!.disabled === false);
    assert.isTrue(buttonByText(failed.root, "Continue")!.disabled);
    assert.isTrue(buttonByText(failed.root, "Cancel")!.disabled);
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
    assert.isTrue(buttonByText(canceled.root, "Continue")!.disabled);

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
    assert.isTrue(buttonByText(pending.root, "Retry")!.disabled);
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
    assert.isTrue(buttonByText(queued.root, "Continue")!.disabled);
    assert.isTrue(buttonByText(queued.root, "Retry")!.disabled);
  });
  it("saves nonsecret configuration with a one-shot secret absent from the selection", async function () {
    const selection = selectionFor(makeRetrieval());
    const { root, dispatched } = renderHome(selection);
    const nameInput = root.querySelector<HTMLInputElement>(
      '.retrieval-form input[type="text"]',
    )!;
    nameInput.value = "Studio GPU";
    nameInput.dispatchEvent(new window.Event("input", { bubbles: true }));
    const secretInput = root.querySelector<HTMLInputElement>(
      '.retrieval-form input[type="password"]',
    )!;
    secretInput.value = "sk-super-secret";
    secretInput.dispatchEvent(new window.Event("input", { bubbles: true }));
    // Let Preact commit the local form state before submitting.
    await flush();

    root
      .querySelector<HTMLFormElement>(".retrieval-form")!
      .dispatchEvent(
        new window.Event("submit", { bubbles: true, cancelable: true }),
      );
    await flush();

    assert.equal(dispatched.length, 1);
    const args = dispatched[0].payload!.args as Record<string, unknown>;
    assert.equal(
      (args.connection as Record<string, unknown>).name,
      "Studio GPU",
    );
    assert.equal(args.secret, "sk-super-secret");
    // The secret is a write-only payload field; the region selection never
    // carries it.
    assert.notInclude(JSON.stringify(selection), "sk-super-secret");
  });

  it("preserves unsaved form input across progress-only region updates", function () {
    const first = selectionFor(makeRetrieval());
    const { root, renderHomeRegion } = renderHome(first);
    const nameInput = root.querySelector<HTMLInputElement>(
      '.retrieval-form input[type="text"]',
    )!;
    nameInput.value = "Draft connection";
    nameInput.dispatchEvent(new window.Event("input", { bubbles: true }));
    assert.equal(
      root.querySelector<HTMLInputElement>(
        '.retrieval-form input[type="text"]',
      )!.value,
      "Draft connection",
    );

    renderHomeRegion(
      selectionFor(
        makeRetrieval({
          progress: {
            completedGroups: 3,
            totalGroups: 3,
            completedFragments: 40,
            failedGroups: 0,
            missingGroups: 0,
          },
          status: "ready",
        }),
      ),
    );
    assert.equal(
      root.querySelector<HTMLInputElement>(
        '.retrieval-form input[type="text"]',
      )!.value,
      "Draft connection",
      "progress update must not reseed the draft",
    );
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

  it("keeps the Home subtree identity when only retrieval progress changes", function () {
    const selection = selectionFor(makeRetrieval());
    const { mount, renderHomeRegion } = renderHome(selection);
    const captured = captureRegionSubtrees({ home: mount });
    // Identical visible content: an equal selection must not rebuild the tree.
    renderHomeRegion(selectionFor(makeRetrieval()));
    assertRegionSubtreesPreserved({ home: mount }, captured);

    // Progress is a real content change and updates the Home region.
    renderHomeRegion(
      selectionFor(
        makeRetrieval({
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
    assert.match(
      mount.querySelector(".retrieval-counters")!.textContent || "",
      /Coverage gaps 0/,
    );
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

  it("saves the enabled flag, explicit dimensions and a cleared primary selection", async function () {
    const selection = selectionFor(makeRetrieval());
    const { root, dispatched } = renderHome(selection);
    const enabledInput = root.querySelector<HTMLInputElement>(
      '.retrieval-field-enabled input[type="checkbox"]',
    )!;
    assert.isTrue(enabledInput.checked);
    enabledInput.checked = false;
    enabledInput.dispatchEvent(new window.Event("change", { bubbles: true }));

    const dimensionsInput = root.querySelector<HTMLInputElement>(
      ".retrieval-field-dimensions input",
    )!;
    assert.equal(dimensionsInput.value, "1024");
    dimensionsInput.value = "768";
    dimensionsInput.dispatchEvent(new window.Event("input", { bubbles: true }));

    const primarySelect = root.querySelector<HTMLSelectElement>(
      ".retrieval-primary select",
    )!;
    primarySelect.value = "";
    primarySelect.dispatchEvent(new window.Event("change", { bubbles: true }));
    await flush();

    root
      .querySelector<HTMLFormElement>(".retrieval-form")!
      .dispatchEvent(
        new window.Event("submit", { bubbles: true, cancelable: true }),
      );
    await flush();

    assert.equal(dispatched.length, 1);
    const args = dispatched[0].payload!.args as Record<string, unknown>;
    assert.isFalse(args.enabled as boolean);
    assert.isNull(args.primaryConnectionId);
    assert.equal((args.connection as Record<string, unknown>).dimensions, 768);
  });

  it("edits an existing connection in place and deletes one through the save command", async function () {
    const selection = selectionFor(makeRetrieval());
    const { root, dispatched } = renderHome(selection);
    const rows = root.querySelectorAll(".retrieval-connection");
    buttonByText(rows[1], "Edit")!.click();
    await flush();
    const modelInput = root.querySelector<HTMLInputElement>(
      ".retrieval-field-model input",
    )!;
    assert.equal(modelInput.value, "text-embedding-3-small");

    root
      .querySelector<HTMLFormElement>(".retrieval-form")!
      .dispatchEvent(
        new window.Event("submit", { bubbles: true, cancelable: true }),
      );
    await flush();
    const savedArgs = dispatched.at(-1)!.payload!.args as Record<
      string,
      unknown
    >;
    assert.equal((savedArgs.connection as Record<string, unknown>).id, "c2");

    buttonByText(
      root.querySelectorAll(".retrieval-connection")[0],
      "Delete",
    )!.click();
    await flush();
    const removedArgs = dispatched.at(-1)!.payload!.args as Record<
      string,
      unknown
    >;
    assert.equal(removedArgs.removeConnectionId, "c1");
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
