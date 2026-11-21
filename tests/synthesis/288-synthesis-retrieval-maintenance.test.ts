import { assert } from "chai";
import { h, render } from "preact";
import { JSDOM } from "jsdom";

import {
  SYNTHESIS_WORKBENCH_DEFAULT_MESSAGES,
  formatSynthesisWorkbenchMessage,
} from "../../src/shared/synthesisWorkbenchI18nContract";
import type { SynthesisWorkbenchSnapshot } from "../../src/shared/synthesisWorkbenchWireContract";
import { RetrievalMaintenance } from "../../src/synthesis/components/RetrievalMaintenance";
import {
  mountSynthesisWorkbenchRuntime,
  setSynthesisRetrievalPortsForTests,
  setSynthesisWorkbenchSidecarStatusSubscriberForTests,
} from "../../src/modules/synthesis/workbench/synthesisWorkbenchTab";
import {
  createSynthesisClientFromPort,
  type SynthesisClientPort,
} from "../../src/modules/synthesisClient/clientPortAdapter";
import {
  resetDefaultSynthesisClientForTests,
  setDefaultSynthesisClientCompositionFactoryForTests,
} from "../../src/modules/synthesisClient/defaultClient";
import type {
  SynthesisPublicMaintenanceOperation,
  SynthesisPublicMaintenanceOperationControlRequest,
  SynthesisPublicMaintenanceOperationRequest,
  SynthesisRetrievalMaintenanceRequest,
  SynthesisRetrievalState,
} from "../../packages/synthesis-contracts/src/index";
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

  it("shows only Topics as published for a legacy scope with paper kinds but no library", function () {
    const { root } = renderMaintenance(
      makeRetrieval({
        publication: "topic-publication",
        activeScope: {
          libraryIds: [],
          sourceKinds: ["metadata"],
          includeTopics: true,
        },
        pendingScope: {
          libraryIds: [1],
          sourceKinds: ["metadata"],
          includeTopics: true,
        },
      }),
    );
    const published = root.querySelector('[data-retrieval-scope="published"]')!;
    assert.include(published.textContent, "Topics");
    assert.notInclude(published.textContent, "Metadata");
    assert.include(
      root.querySelector(".retrieval-maintenance-changes")!.textContent,
      "Research Library",
    );
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

type WorkbenchChromeMessage = {
  type?: string;
  payload?: {
    retrieval?: { maintenance?: SynthesisPublicMaintenanceOperation | null };
    actions?: {
      lastCompleted?: { command?: string };
      lastFailed?: { command?: string };
    };
  };
};

type WorkbenchBridge = {
  postMessage(action: string, payload: Record<string, unknown>): Promise<void>;
};

const BUILD_ARGS = {
  identity: {
    modelId: "bge-m3",
    dimensions: 1024,
    queryPrefix: "",
    documentPrefix: "",
  },
  scope: {
    libraryIds: [1],
    sourceKinds: ["metadata"],
    includeTopics: false,
  },
};

function makeOperation(
  overrides: Partial<SynthesisPublicMaintenanceOperation> = {},
): SynthesisPublicMaintenanceOperation {
  return {
    schema: "synthesis.maintenance_operation.v1",
    operation_id: "maintenance:retrieval:test",
    status: "pending",
    ...overrides,
  };
}

function makeRetrievalState(
  maintenance?: SynthesisPublicMaintenanceOperation | null,
): SynthesisRetrievalState {
  return {
    enabled: true,
    status: "paused",
    activeIdentity: null,
    pendingIdentity: null,
    activeScope: null,
    pendingScope: null,
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
    ...(maintenance === undefined ? {} : { maintenance }),
  };
}

function makeFakeRetrieval() {
  const calls = {
    builds: 0,
    stateReads: 0,
    operationReads: 0,
    controls: [] as string[],
  };
  const receipt = {
    current: null as SynthesisPublicMaintenanceOperation | null,
  };
  let stateError: Error | null = null;
  const accept = async () => {
    calls.builds += 1;
    receipt.current = makeOperation();
    return receipt.current;
  };
  return {
    calls,
    receipt,
    failStateReads(error: Error | null) {
      stateError = error;
    },
    ports: {
      getState: async (): Promise<SynthesisRetrievalState> => {
        calls.stateReads += 1;
        if (stateError) throw stateError;
        return makeRetrievalState(receipt.current);
      },
      build: accept,
      rebuild: accept,
      update: accept,
      cleanup: async () => makeOperation({ status: "completed" }),
      getOperation: async (
        _request: SynthesisPublicMaintenanceOperationRequest,
      ): Promise<SynthesisPublicMaintenanceOperation> => {
        calls.operationReads += 1;
        return receipt.current ?? makeOperation();
      },
      controlOperation: async (
        request: SynthesisPublicMaintenanceOperationControlRequest,
      ): Promise<SynthesisPublicMaintenanceOperation> => {
        calls.controls.push(request.action);
        receipt.current =
          request.action === "cancel"
            ? makeOperation({ status: "canceled" })
            : request.action === "retry"
              ? makeOperation({
                  operation_id: "maintenance:retry:test",
                  status: "pending",
                })
              : makeOperation({ status: "pending", phase: "queued" });
        return receipt.current;
      },
    },
  };
}

async function waitUntil(predicate: () => boolean, attempts = 400) {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    if (predicate()) {
      return;
    }
    await new Promise<void>((resolve) => setTimeout(resolve, 10));
  }
  throw new Error("condition_not_reached");
}

function latestMaintenance(messages: WorkbenchChromeMessage[]) {
  const chrome = messages.filter(
    (message) => message.type === "synthesis:chrome",
  );
  return chrome.at(-1)?.payload?.retrieval?.maintenance ?? null;
}

async function mountWorkbench(fake: ReturnType<typeof makeFakeRetrieval>) {
  const client = createSynthesisClientFromPort({
    getSynthesisWorkbenchChromeInput: async () => ({ libraryId: 1 }),
    getSynthesisWorkbenchSurfaceInput: async () => ({}),
  } as unknown as SynthesisClientPort);
  setDefaultSynthesisClientCompositionFactoryForTests(() => ({
    client,
    invalidate() {},
    async dispose() {},
  }));
  setSynthesisRetrievalPortsForTests({
    settings: {
      get: () => ({
        enabled: true,
        connections: [],
        primaryConnectionId: null,
        fallbackConnectionIds: [],
        pendingScope: null,
        connectionTests: {},
        presets: [],
      }),
    },
    retrieval: fake.ports,
  });
  setSynthesisWorkbenchSidecarStatusSubscriberForTests(() => () => {});
  const dom = new JSDOM('<div id="root"></div>', {
    url: "https://example.test/",
  });
  const root = dom.window.document.getElementById("root")!;
  const mounted = await mountSynthesisWorkbenchRuntime({
    root,
    hostWindow: dom.window as unknown as Window,
    chromeWindow: dom.window as unknown as _ZoteroTypes.MainWindow,
  });
  const messages: WorkbenchChromeMessage[] = [];
  const frame = root.querySelector("iframe")!;
  const frameWindow = frame.contentWindow!;
  frameWindow.postMessage = ((message: WorkbenchChromeMessage) => {
    messages.push(message);
  }) as typeof frameWindow.postMessage;
  frame.dispatchEvent(new dom.window.Event("load"));
  await waitUntil(() =>
    Boolean(
      (
        frameWindow as unknown as {
          __zoteroSkillsSynthesisWorkbenchBridge?: unknown;
        }
      ).__zoteroSkillsSynthesisWorkbenchBridge,
    ),
  );
  const bridge = (
    frameWindow as unknown as {
      __zoteroSkillsSynthesisWorkbenchBridge: WorkbenchBridge;
    }
  ).__zoteroSkillsSynthesisWorkbenchBridge;
  return {
    bridge,
    messages,
    async cleanup() {
      mounted.cleanup();
      setSynthesisRetrievalPortsForTests(null);
      setSynthesisWorkbenchSidecarStatusSubscriberForTests(undefined);
      setDefaultSynthesisClientCompositionFactoryForTests(null);
      await resetDefaultSynthesisClientForTests();
      dom.window.close();
    },
  };
}

describe("Synthesis retrieval maintenance host seam", function () {
  this.timeout(20000);

  async function submitBuild(bridge: WorkbenchBridge): Promise<void> {
    await bridge.postMessage("hostCommand", {
      command: "retrievalBuildIndex",
      args: BUILD_ARGS,
    });
  }

  it("returns the accepted receipt without observing the operation inline", async function () {
    const fake = makeFakeRetrieval();
    const workbench = await mountWorkbench(fake);
    try {
      await submitBuild(workbench.bridge);
      await waitUntil(() =>
        workbench.messages.some(
          (message) =>
            message.payload?.actions?.lastCompleted?.command ===
            "retrievalBuildIndex",
        ),
      );

      assert.equal(fake.calls.builds, 1);
      assert.equal(
        fake.calls.operationReads,
        0,
        "the accepted receipt is observed through the durable state read",
      );
      const maintenance = latestMaintenance(workbench.messages);
      assert.equal(maintenance?.operation_id, "maintenance:retrieval:test");
      assert.equal(maintenance?.status, "pending");
    } finally {
      await workbench.cleanup();
    }
  });

  it("keeps observing the receipt after navigation and reattaches it on reopen", async function () {
    const fake = makeFakeRetrieval();
    const workbench = await mountWorkbench(fake);
    try {
      await submitBuild(workbench.bridge);
      await waitUntil(() => fake.calls.stateReads >= 2);
      const readsBeforeNavigation = fake.calls.stateReads;

      await workbench.bridge.postMessage("selectTab", { tab: "graph" });
      await waitUntil(() => fake.calls.stateReads > readsBeforeNavigation);
      assert.equal(
        latestMaintenance(workbench.messages)?.status,
        "pending",
        "the durable receipt stays visible on another tab",
      );
    } finally {
      await workbench.cleanup();
    }

    const reopened = await mountWorkbench(fake);
    try {
      await waitUntil(
        () =>
          latestMaintenance(reopened.messages)?.operation_id ===
          "maintenance:retrieval:test",
      );
      assert.equal(latestMaintenance(reopened.messages)?.status, "pending");
      const readsAfterReopen = fake.calls.stateReads;
      await waitUntil(() => fake.calls.stateReads > readsAfterReopen);
    } finally {
      await reopened.cleanup();
    }
  });

  it("keeps the last successful receipt when the state read fails", async function () {
    const fake = makeFakeRetrieval();
    const workbench = await mountWorkbench(fake);
    try {
      await submitBuild(workbench.bridge);
      await waitUntil(
        () => latestMaintenance(workbench.messages)?.status === "pending",
      );
      fake.failStateReads(new Error("service_unavailable"));
      const readsBeforeFailure = fake.calls.stateReads;
      await waitUntil(() => fake.calls.stateReads > readsBeforeFailure + 1);

      assert.equal(
        latestMaintenance(workbench.messages)?.status,
        "pending",
        "a failed state read must not drop the last observed receipt",
      );
    } finally {
      await workbench.cleanup();
    }
  });

  it("applies cancel, retry and continue to the durable receipt", async function () {
    const fake = makeFakeRetrieval();
    const workbench = await mountWorkbench(fake);
    try {
      await submitBuild(workbench.bridge);
      await waitUntil(
        () => latestMaintenance(workbench.messages)?.status === "pending",
      );

      await workbench.bridge.postMessage("hostCommand", {
        command: "retrievalCancelIndex",
        args: { operationId: "maintenance:retrieval:test" },
      });
      await waitUntil(
        () => latestMaintenance(workbench.messages)?.status === "canceled",
      );

      await workbench.bridge.postMessage("hostCommand", {
        command: "retrievalRetryIndex",
        args: { operationId: "maintenance:retrieval:test" },
      });
      await waitUntil(
        () =>
          latestMaintenance(workbench.messages)?.operation_id ===
          "maintenance:retry:test",
      );

      await workbench.bridge.postMessage("hostCommand", {
        command: "retrievalContinueIndex",
        args: { operationId: "maintenance:retry:test" },
      });
      await waitUntil(
        () => latestMaintenance(workbench.messages)?.status === "pending",
      );

      assert.deepEqual(fake.calls.controls, ["cancel", "retry", "continue"]);
    } finally {
      await workbench.cleanup();
    }
  });
});
