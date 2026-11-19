import { assert } from "chai";
import { h, render } from "preact";

import {
  SYNTHESIS_WORKBENCH_DEFAULT_MESSAGES,
  formatSynthesisWorkbenchMessage,
} from "../../src/shared/synthesisWorkbenchI18nContract";
import type { SynthesisWorkbenchSnapshot } from "../../src/shared/synthesisWorkbenchWireContract";
import { RetrievalMaintenance } from "../../src/synthesis/components/RetrievalMaintenance";
import {
  createSidebarDomEnvironment,
  installSidebarDomGlobals,
  restoreSidebarDomGlobals,
} from "../helpers/sidebarDomEnv";

type Retrieval = NonNullable<SynthesisWorkbenchSnapshot["retrieval"]>;

const t = (
  key: keyof typeof SYNTHESIS_WORKBENCH_DEFAULT_MESSAGES,
  args?: Record<string, unknown>,
) =>
  formatSynthesisWorkbenchMessage(
    SYNTHESIS_WORKBENCH_DEFAULT_MESSAGES[key],
    args,
  );

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

function makeRetrieval(overrides: Partial<Retrieval> = {}): Retrieval {
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
      libraryIds: [1, 2],
      sourceKinds: ["metadata", "fulltext"],
      includeTopics: true,
    },
    publication: null,
    progress: {
      completedGroups: 0,
      totalGroups: 0,
      completedFragments: 0,
      failedGroups: 0,
      missingGroups: 0,
    },
    updatedAt: null,
    issues: [],
    libraryNames: { "1": "Research Library" },
    connections: [],
    primaryConnectionId: null,
    fallbackConnectionIds: [],
    maintenance: null,
    ...overrides,
  };
}

function buttonByText(root: ParentNode, text: string) {
  return Array.from(root.querySelectorAll<HTMLButtonElement>("button")).find(
    (button) => button.textContent?.trim() === text,
  );
}

describe("Synthesis retrieval maintenance", function () {
  beforeEach(function () {
    installSidebarDomGlobals(createSidebarDomEnvironment());
  });

  afterEach(function () {
    document.body.innerHTML = "";
    restoreSidebarDomGlobals();
  });

  function renderMaintenance(retrieval: Retrieval, pending: string[] = []) {
    const dispatched: Array<{
      action: string;
      payload: Record<string, unknown> | undefined;
    }> = [];
    const root = document.createElement("div");
    document.body.appendChild(root);
    const renderWith = (
      nextRetrieval: Retrieval,
      nextPending: string[] = pending,
    ) =>
      render(
        h(RetrievalMaintenance, {
          retrieval: nextRetrieval,
          pending: nextPending,
          t,
          onAction: (action, payload) => dispatched.push({ action, payload }),
        }),
        root,
      );
    renderWith(retrieval);
    return { root, dispatched, renderWith };
  }

  it("shows the saved scope as planned before the first publication", function () {
    const { root } = renderMaintenance(makeRetrieval());
    const planned = root.querySelector<HTMLElement>(
      '[data-retrieval-scope="planned"]',
    )!;

    assert.ok(planned);
    assert.include(planned.textContent, t("synthesis-explorer-pending"));
    assert.include(planned.textContent, "Research Library");
    assert.include(planned.textContent, "Library 2");
    assert.include(planned.textContent, "Metadata");
    assert.include(planned.textContent, "Full text");
    assert.include(planned.textContent, "Topics");
    assert.isNull(root.querySelector('[data-retrieval-scope="published"]'));
    assert.isNull(root.querySelector(".retrieval-maintenance-changes"));
  });

  it("shows the published scope once when the saved scope is equivalent", function () {
    const { root } = renderMaintenance(
      makeRetrieval({
        enabled: true,
        connections: [{ id: "connection-1" }],
        publication: "publication-1",
        status: "ready",
        updatedAt: "2026-11-18T12:00:00Z",
        activeIdentity: {
          modelId: "bge-m3",
          dimensions: 1024,
          queryPrefix: "q: ",
          documentPrefix: "d: ",
        },
        activeScope: {
          libraryIds: [2, 1],
          sourceKinds: ["fulltext", "metadata"],
          includeTopics: true,
        },
      }),
    );
    const published = root.querySelectorAll<HTMLElement>(
      '[data-retrieval-scope="published"]',
    );

    assert.lengthOf(published, 1);
    assert.include(published[0].textContent, "Indexed scope");
    assert.include(published[0].textContent, "Research Library");
    assert.include(published[0].textContent, "Library 2");
    assert.equal(
      (root.textContent?.match(/Research Library/g) || []).length,
      1,
      "the published scope is not repeated as a pending scope",
    );
    assert.isNull(root.querySelector(".retrieval-maintenance-changes"));
    assert.include(root.textContent, "bge-m3");
    assert.include(root.textContent, "2026-11-18T12:00:00Z");
    assert.notInclude(root.textContent, "Pending index");
  });

  it("shows only changed scope settings as pending after publication", function () {
    const { root } = renderMaintenance(
      makeRetrieval({
        publication: "publication-1",
        status: "ready",
        updatedAt: "2026-11-18T12:00:00Z",
        activeIdentity: {
          modelId: "bge-m3",
          dimensions: 1024,
          queryPrefix: "q: ",
          documentPrefix: "d: ",
        },
        activeScope: {
          libraryIds: [1],
          sourceKinds: ["metadata"],
          includeTopics: false,
        },
      }),
    );

    const changes = root.querySelector<HTMLElement>(
      ".retrieval-maintenance-changes",
    )!;
    assert.ok(changes);
    assert.isNull(root.querySelector(".retrieval-maintenance-encoding-change"));
    assert.ok(root.querySelector(".retrieval-maintenance-scope-change"));
    assert.include(changes.textContent, "Library");
    assert.include(changes.textContent, "Research Library");
    assert.include(changes.textContent, "Library 2");
    assert.include(changes.textContent, "Source kinds");
    assert.include(changes.textContent, "Full text");
    assert.include(changes.textContent, "Include Topic sections");
    assert.include(changes.textContent, "Enabled");
    assert.notInclude(
      changes.textContent,
      "bge-m3",
      "an unchanged encoding identity is not part of the difference",
    );
  });

  it("shows only a changed encoding identity as pending after publication", function () {
    const { root } = renderMaintenance(
      makeRetrieval({
        enabled: true,
        connections: [{ id: "connection-1" }],
        publication: "publication-1",
        status: "ready",
        activeIdentity: {
          modelId: "bge-m3",
          dimensions: 1024,
          queryPrefix: "q: ",
          documentPrefix: "d: ",
          encodingOptionsKey: "truncate:true",
        },
        pendingIdentity: {
          modelId: "embed-v4",
          dimensions: 1536,
          queryPrefix: "query: ",
          documentPrefix: "document: ",
          encodingOptionsKey: "dimensions:1536",
        },
        activeScope: {
          libraryIds: [1, 2],
          sourceKinds: ["metadata", "fulltext"],
          includeTopics: true,
        },
      }),
    );

    const changes = root.querySelector<HTMLElement>(
      ".retrieval-maintenance-changes",
    )!;
    assert.ok(changes);
    assert.isNull(root.querySelector(".retrieval-maintenance-scope-change"));
    const encodingChange = root.querySelector<HTMLElement>(
      ".retrieval-maintenance-encoding-change",
    )!;
    assert.ok(encodingChange);
    assert.include(encodingChange.textContent, "embed-v4");
    assert.include(encodingChange.textContent, "bge-m3");
    assert.include(encodingChange.textContent, "Model");
    assert.include(changes.textContent, "1536");
    assert.include(changes.textContent, "Dimension");
    assert.include(changes.textContent, "Effective after rebuild");
    assert.notInclude(changes.textContent, "truncate:true");
    assert.notInclude(changes.textContent, "dimensions:1536");
    const rebuild = buttonByText(root, "Rebuild index")!;
    assert.isFalse(rebuild.disabled);
    assert.include(rebuild.className, "primary");
    assert.isTrue(buttonByText(root, "Update index")!.disabled);
  });

  it("uses determinate and indeterminate progress from the active operation", function () {
    const running = makeRetrieval({
      maintenance: { operation_id: "op-progress", status: "running" },
      progress: {
        completedGroups: 2,
        totalGroups: 5,
        completedFragments: 20,
        failedGroups: 0,
        missingGroups: 1,
      },
    });
    const { root, renderWith } = renderMaintenance(running);
    const progress = root.querySelector<HTMLProgressElement>("progress")!;

    assert.equal(progress.max, 5);
    assert.equal(progress.value, 2);
    assert.include(
      root.querySelector(".home-service-progress-label")?.textContent,
      "2 / 5 groups",
    );
    assert.notInclude(
      root.querySelector(".home-service-task")?.textContent,
      "Coverage gaps",
    );
    assert.include(
      root.querySelector(".home-service-notices")?.textContent,
      "Coverage gaps 1",
    );

    renderWith({
      ...running,
      progress: { ...running.progress, completedGroups: 0, totalGroups: 0 },
    });
    assert.isFalse(root.querySelector("progress")!.hasAttribute("value"));
  });

  it("keeps the pending gate and dispatches the saved build target", async function () {
    const retrieval = makeRetrieval();
    retrieval.connections = [{ id: "connection-1" }];
    const gated = renderMaintenance(retrieval, ["retrievalRebuildIndex"]);
    const build = buttonByText(gated.root, "Rebuild index")!;

    assert.isTrue(build.disabled);
    assert.equal(build.getAttribute("aria-busy"), "true");
    build.click();
    await flush();
    assert.isEmpty(gated.dispatched);

    const ready = renderMaintenance(retrieval);
    buttonByText(ready.root, "Rebuild index")!.click();
    await flush();
    assert.lengthOf(ready.dispatched, 1);
    assert.equal(ready.dispatched[0].action, "hostCommand");
    assert.equal(ready.dispatched[0].payload!.command, "retrievalRebuildIndex");
    const args = ready.dispatched[0].payload!.args as Record<string, unknown>;
    assert.deepEqual(args.identity, retrieval.pendingIdentity);
    assert.deepEqual(args.scope, retrieval.pendingScope);
  });
});
