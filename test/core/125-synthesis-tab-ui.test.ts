import { assert } from "chai";
import fs from "fs/promises";
import { JSDOM } from "jsdom";
import { SynthesisClientError } from "../../packages/synthesis-contracts/src/index";
import {
  createSynthesisClientFromPort,
  type SynthesisClientPort,
} from "../../src/modules/synthesisClient/clientPortAdapter";
import {
  resetDefaultSynthesisClientForTests,
  setDefaultSynthesisClientCompositionFactoryForTests,
} from "../../src/modules/synthesisClient/defaultClient";
import { mountSynthesisWorkbenchRuntime } from "../../src/modules/synthesisWorkbenchTab";
import {
  applySynthesisUiAction,
  buildSynthesisUiSnapshot,
  createDefaultSynthesisUiState,
  getSynthesisUiOperationKey,
  normalizeSynthesisUiSnapshot,
} from "../../src/modules/synthesis/uiModel";
import { projectSynthesisSidecarFailureCard } from "../../src/synthesisWorkbenchI18n";
import {
  isSynthesisLibraryReadModelInvalidationEvent,
  isSynthesisLiteratureScoreInvalidationEvent,
} from "../../src/modules/synthesis/itemObserver";
import { isTransientStorageBusyError } from "../../src/modules/guardedSqlite";
import {
  notifySynthesisWorkbenchSidecarChanged,
  registerSynthesisWorkbenchSidecarChangeListener,
} from "../../src/modules/synthesisWorkbenchInvalidation";
import {
  classifySynthesisWorkbenchGraphMutationResult,
  createSynthesisWorkbenchGraphLayoutFailure,
  isSynthesisWorkbenchGraphApplicationBusyError,
  resolveSynthesisWorkbenchGraphLayoutStatus,
  selectSynthesisWorkbenchGraphLayoutFailure,
  toSynthesisWorkbenchReadState,
} from "../../src/modules/synthesisClient/workbenchUiAdapter";
import {
  continueSynthesisCitationGraphWindow,
  createSynthesisCitationGraphWindow,
  failSynthesisCitationGraphWindow,
  mergeSynthesisCitationGraphPage,
  mergeSynthesisCitationGraphSlice,
  retrySynthesisCitationGraphWindow,
} from "../../src/shared/synthesisCitationGraphWindow";

async function waitUntil(predicate: () => boolean) {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (predicate()) {
      return;
    }
    await new Promise<void>((resolve) => setTimeout(resolve, 10));
  }
  throw new Error("condition_not_reached");
}

function deferred<Value>() {
  let resolve!: (value: Value) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<Value>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

type WorkbenchChromeMessage = {
  type?: string;
  payload?: {
    actions?: {
      inFlight?: Array<{ command?: string }>;
      lastCompleted?: { command?: string };
      lastFailed?: { command?: string };
    };
    maintenance?: {
      backgroundJobs?: { rows?: Array<{ status?: string }> };
    };
  };
};

type WorkbenchBridge = {
  postMessage(action: string, payload: Record<string, unknown>): Promise<void>;
};

async function mountTestWorkbench(
  port: Partial<SynthesisClientPort>,
  snapshotInput?: { libraryId: number },
) {
  const client = createSynthesisClientFromPort(port as SynthesisClientPort);
  setDefaultSynthesisClientCompositionFactoryForTests(() => ({
    client,
    invalidate() {},
    async dispose() {},
  }));
  const dom = new JSDOM('<div id="root"></div>', {
    url: "https://example.test/",
  });
  const root = dom.window.document.getElementById("root")!;
  dom.window.confirm = () => true;
  const mounted = await mountSynthesisWorkbenchRuntime({
    root,
    hostWindow: dom.window as unknown as Window,
    chromeWindow: dom.window as unknown as _ZoteroTypes.MainWindow,
    ...(snapshotInput ? { snapshotInput } : {}),
  });
  const messages: WorkbenchChromeMessage[] = [];
  const frame = root.querySelector("iframe")!;
  const frameWindow = frame.contentWindow!;
  frameWindow.postMessage = ((message: WorkbenchChromeMessage) => {
    messages.push(message);
  }) as typeof frameWindow.postMessage;
  frame.dispatchEvent(new dom.window.Event("load"));
  await waitUntil(
    () =>
      typeof (
        frameWindow as unknown as {
          __zoteroSkillsSynthesisWorkbenchBridge?: unknown;
        }
      ).__zoteroSkillsSynthesisWorkbenchBridge === "object",
  );
  const bridge = (
    frameWindow as unknown as {
      __zoteroSkillsSynthesisWorkbenchBridge: WorkbenchBridge;
    }
  ).__zoteroSkillsSynthesisWorkbenchBridge;

  return {
    bridge,
    messages,
    refresh: mounted.refresh,
    unmount: mounted.cleanup,
    async cleanup() {
      mounted.cleanup();
      setDefaultSynthesisClientCompositionFactoryForTests(null);
      await resetDefaultSynthesisClientForTests();
      dom.window.close();
    },
  };
}

describe("Synthesis tab UI model", function () {
  it("coalesces overlapping chrome refreshes into one latest follow-up", async function () {
    const reads: Array<ReturnType<typeof deferred<Record<string, unknown>>>> =
      [];
    let activeReads = 0;
    let maxActiveReads = 0;
    const workbench = await mountTestWorkbench({
      getSynthesisWorkbenchChromeInput: async () => {
        activeReads += 1;
        maxActiveReads = Math.max(maxActiveReads, activeReads);
        const read = deferred<Record<string, unknown>>();
        reads.push(read);
        try {
          return await read.promise;
        } finally {
          activeReads -= 1;
        }
      },
      getSynthesisWorkbenchSurfaceInput: async () => ({}),
    });

    try {
      const refreshes = [
        workbench.refresh(),
        workbench.refresh(),
        workbench.refresh(),
      ];
      await waitUntil(() => reads.length >= 1);
      await new Promise<void>((resolve) => setTimeout(resolve, 20));
      assert.equal(maxActiveReads, 1);
      assert.equal(reads.length, 1);

      reads[0].resolve({ libraryId: 1 });
      await waitUntil(() => reads.length === 2);
      reads[1].resolve({ libraryId: 1 });
      await Promise.all(refreshes);
      assert.equal(reads.length, 2);
      assert.equal(maxActiveReads, 1);
    } finally {
      reads.forEach((read) => read.resolve({ libraryId: 1 }));
      await workbench.cleanup();
    }
  });

  it("drops a queued chrome refresh when the Workbench is cleaned up", async function () {
    const reads: Array<ReturnType<typeof deferred<Record<string, unknown>>>> =
      [];
    const workbench = await mountTestWorkbench({
      getSynthesisWorkbenchChromeInput: async () => {
        const read = deferred<Record<string, unknown>>();
        reads.push(read);
        return read.promise;
      },
      getSynthesisWorkbenchSurfaceInput: async () => ({}),
    });

    const first = workbench.refresh();
    const queued = workbench.refresh();
    await waitUntil(() => reads.length >= 1);
    workbench.unmount();
    reads[0].resolve({ libraryId: 1 });
    await Promise.all([first, queued]);
    assert.equal(reads.length, 1);
    await workbench.cleanup();
  });

  it("keeps observing accepted maintenance through transient unavailability", async function () {
    const operationId = "maintenance:advanced-matching:test";
    let operationReads = 0;
    const workbench = await mountTestWorkbench(
      {
        runAdvancedReferenceMatchingNow: async () => ({
          schema: "synthesis.maintenance_operation.v1",
          operation_id: operationId,
          status: "pending",
        }),
        getPublicMaintenanceOperation: async () => {
          operationReads += 1;
          if (operationReads === 1) {
            throw new SynthesisClientError(
              "unavailable",
              "The native Synthesis request failed",
              { sidecarCode: "service_unavailable" },
            );
          }
          if (operationReads === 3) {
            throw new SynthesisClientError(
              "unavailable",
              "The native Synthesis owner is not ready",
              { sidecarCode: "service_not_ready" },
            );
          }
          return {
            schema: "synthesis.maintenance_operation.v1",
            operation_id: operationId,
            status: "completed",
            receipt: {},
          };
        },
      },
      { libraryId: 1 },
    );

    try {
      await workbench.bridge.postMessage("hostCommand", {
        command: "runAdvancedReferenceMatchingNow",
        args: {},
      });
      await waitUntil(() =>
        workbench.messages.some(
          (message) =>
            message.type === "synthesis:chrome" &&
            message.payload?.actions?.lastCompleted?.command ===
              "runAdvancedReferenceMatchingNow",
        ),
      );

      const chromeMessages = workbench.messages.filter(
        (message) => message.type === "synthesis:chrome",
      );
      assert.isTrue(
        chromeMessages.some((message) =>
          message.payload?.actions?.inFlight?.some(
            (operation) =>
              operation.command === "runAdvancedReferenceMatchingNow",
          ),
        ),
      );
      const completed = chromeMessages.at(-1)!;
      assert.deepEqual(completed.payload?.actions?.inFlight, []);
      assert.equal(
        completed.payload?.actions?.lastCompleted?.command,
        "runAdvancedReferenceMatchingNow",
      );
      assert.equal(operationReads, 2);

      await workbench.bridge.postMessage("hostCommand", {
        command: "runAdvancedReferenceMatchingNow",
        args: {},
      });
      await waitUntil(() =>
        workbench.messages.some(
          (message) =>
            message.type === "synthesis:chrome" &&
            message.payload?.actions?.lastFailed?.command ===
              "runAdvancedReferenceMatchingNow",
        ),
      );
      await new Promise<void>((resolve) => setTimeout(resolve, 300));
      assert.equal(operationReads, 3);
    } finally {
      await workbench.cleanup();
    }
  });

  it("does not let a stale progress failure replace terminal maintenance state", async function () {
    const operationId = "maintenance:advanced-matching:race";
    const staleProgress = deferred<never>();
    const terminalChrome = deferred<Record<string, unknown>>();
    let operationCanComplete = false;
    let backgroundReads = 0;
    let chromeReads = 0;
    const runningJob = {
      job_id: operationId,
      source: "operation" as const,
      status: "running" as const,
      label: "Advanced Matching",
      progress: { mode: "indeterminate" as const },
    };
    const workbench = await mountTestWorkbench({
      runAdvancedReferenceMatchingNow: async () => ({
        schema: "synthesis.maintenance_operation.v1",
        operation_id: operationId,
        status: "pending",
      }),
      getPublicMaintenanceOperation: async () =>
        operationCanComplete
          ? {
              schema: "synthesis.maintenance_operation.v1",
              operation_id: operationId,
              status: "completed",
              receipt: {},
            }
          : {
              schema: "synthesis.maintenance_operation.v1",
              operation_id: operationId,
              status: "running",
            },
      getSynthesisBackgroundJobRows: async () => {
        backgroundReads += 1;
        return backgroundReads === 1 ? [runningJob] : staleProgress.promise;
      },
      getSynthesisWorkbenchChromeInput: async () => {
        chromeReads += 1;
        return terminalChrome.promise;
      },
      getSynthesisWorkbenchSurfaceInput: async () => ({}),
    });

    try {
      await workbench.bridge.postMessage("hostCommand", {
        command: "runAdvancedReferenceMatchingNow",
        args: {},
      });

      await waitUntil(() =>
        workbench.messages.some((message) =>
          Array.isArray(message.payload?.maintenance?.backgroundJobs?.rows)
            ? message.payload.maintenance.backgroundJobs.rows.some(
                (job) => job.status === "running",
              )
            : false,
        ),
      );
      await waitUntil(() => backgroundReads >= 2);
      operationCanComplete = true;
      await waitUntil(() => chromeReads >= 1);
      staleProgress.reject(new Error("service_unavailable"));
      terminalChrome.resolve({
        libraryId: 1,
        maintenance: { backgroundJobs: [] },
      });
      await new Promise<void>((resolve) => setTimeout(resolve, 20));

      const lastChrome = workbench.messages
        .filter((message) => message.type === "synthesis:chrome")
        .at(-1)!;
      assert.deepEqual(
        lastChrome.payload?.maintenance?.backgroundJobs?.rows,
        [],
      );
    } finally {
      staleProgress.promise.catch(() => undefined);
      await workbench.cleanup();
    }
  });
  it("presents manual sidecar recovery with preserved data guidance and actions", function () {
    assert.deepEqual(
      projectSynthesisSidecarFailureCard({
        lifecycle: "unavailable",
        recoveryState: "manual-recovery-required",
        reasonCode: "repository_legacy_topic_graph_state_invalid",
      }),
      {
        messageKey: "synthesis-sidecar-manual-recovery",
        reasonCode: "repository_legacy_topic_graph_state_invalid",
        actions: ["retrySynthesisSidecar", "openSynthesisSidecarDiagnostics"],
      },
    );
  });

  async function readPngSize(filePath: string) {
    const bytes = await fs.readFile(filePath);
    return {
      width: bytes.readUInt32BE(16),
      height: bytes.readUInt32BE(20),
    };
  }

  function extractFunctionBlock(source: string, functionName: string) {
    const start = source.indexOf(`function ${functionName}`);
    assert.isAtLeast(start, 0, `${functionName} should exist`);
    const paramsStart = source.indexOf("(", start);
    assert.isAtLeast(paramsStart, start, `${functionName} should have params`);
    let paramDepth = 0;
    let paramsEnd = -1;
    for (let index = paramsStart; index < source.length; index += 1) {
      const char = source[index];
      if (char === "(") {
        paramDepth += 1;
      } else if (char === ")") {
        paramDepth -= 1;
        if (paramDepth === 0) {
          paramsEnd = index;
          break;
        }
      }
    }
    assert.isAtLeast(
      paramsEnd,
      paramsStart,
      `${functionName} params should end`,
    );
    const bodyStart = source.indexOf("{", paramsEnd);
    assert.isAtLeast(
      bodyStart,
      paramsEnd,
      `${functionName} should have a body`,
    );
    let depth = 0;
    for (let index = bodyStart; index < source.length; index += 1) {
      const char = source[index];
      if (char === "{") {
        depth += 1;
      } else if (char === "}") {
        depth -= 1;
        if (depth === 0) {
          return source.slice(start, index + 1);
        }
      }
    }
    assert.fail(`Could not extract ${functionName}`);
  }

  function extractIfBlock(source: string, condition: string) {
    const start = source.indexOf(`if (${condition})`);
    assert.isAtLeast(start, 0, `${condition} block should exist`);
    const bodyStart = source.indexOf("{", start);
    assert.isAtLeast(bodyStart, start, `${condition} should have a body`);
    let depth = 0;
    for (let index = bodyStart; index < source.length; index += 1) {
      const char = source[index];
      if (char === "{") {
        depth += 1;
      } else if (char === "}") {
        depth -= 1;
        if (depth === 0) {
          return source.slice(start, index + 1);
        }
      }
    }
    assert.fail(`Could not extract if (${condition})`);
  }

  it("classifies Workbench Citation Graph mutation terminal results", function () {
    const captureError = (run: () => unknown) => {
      try {
        run();
      } catch (error) {
        return error as Error & {
          code?: string;
          details?: Record<string, unknown>;
        };
      }
      assert.fail("Expected Citation Graph mutation classification to fail");
    };
    for (const status of ["promoted", "unchanged"] as const) {
      const result = { status, graphHash: "sha256:graph" };
      assert.strictEqual(
        classifySynthesisWorkbenchGraphMutationResult(result),
        result,
      );
    }

    for (const [status, code] of [
      ["graph_application_busy", "storage_busy"],
      ["worker_busy", "storage_busy"],
      ["worker_failed", "internal"],
      ["basis_mismatch", "conflict"],
      ["invalid_request", "invalid_request"],
      ["repair_required", "unavailable"],
      ["stopping", "unavailable"],
    ] as const) {
      const error = captureError(() =>
        classifySynthesisWorkbenchGraphMutationResult({ status }),
      );
      assert.equal(error.code, code, status);
      assert.equal(error.details?.status, status);
    }

    for (const statuslessResult of [
      { processed: 1, completed: 1, failed: 0 },
    ]) {
      assert.equal(
        captureError(() =>
          classifySynthesisWorkbenchGraphMutationResult(statuslessResult),
        ).code,
        "internal",
      );
    }
    for (const unsupportedStatus of [
      "completed",
      "bootstrapped",
      "skipped",
      "superseded",
    ]) {
      const error = captureError(() =>
        classifySynthesisWorkbenchGraphMutationResult({
          ok: true,
          status: unsupportedStatus,
        }),
      );
      assert.equal(error.code, "internal");
      assert.equal(error.details?.status, unsupportedStatus);
    }
    assert.equal(
      captureError(() =>
        classifySynthesisWorkbenchGraphMutationResult({
          processed: 1,
          completed: 0,
          failed: 1,
        }),
      ).code,
      "internal",
    );
    assert.equal(
      captureError(() =>
        classifySynthesisWorkbenchGraphMutationResult({
          ok: false,
          status: "failed",
        }),
      ).code,
      "internal",
    );
  });

  it("scopes Workbench Citation Graph layout failures to their basis", function () {
    const failure = {
      graphHash: "sha256:graph-a",
      layoutAlgorithm: "force",
      code: "invalid_request",
      mutationStatus: "invalid_request",
      message: "Layout failed.",
      occurredAt: "2026-08-01T00:00:00.000Z",
    };
    for (const [layoutStatus, graphHash, layoutAlgorithm, expected] of [
      ["missing", "sha256:graph-a", "force", "failed"],
      ["stale", "sha256:graph-a", "force", "failed"],
      ["ready", "sha256:graph-a", "force", "ready"],
      ["missing", "sha256:graph-b", "force", "missing"],
      ["stale", "sha256:graph-a", "radial", "stale"],
    ] as const) {
      assert.equal(
        resolveSynthesisWorkbenchGraphLayoutStatus({
          graphHash,
          layoutAlgorithm,
          layoutStatus,
          failure,
        }),
        expected,
      );
    }
    assert.strictEqual(
      selectSynthesisWorkbenchGraphLayoutFailure({
        graphHash: "sha256:graph-a",
        layoutAlgorithm: "force",
        failure,
      }),
      failure,
    );
    assert.isUndefined(
      selectSynthesisWorkbenchGraphLayoutFailure({
        graphHash: "sha256:graph-b",
        layoutAlgorithm: "force",
        failure,
      }),
    );
  });

  it("records bounded structured Workbench layout failure details", function () {
    const failure = createSynthesisWorkbenchGraphLayoutFailure({
      graphHash: " sha256:graph-a ",
      layoutAlgorithm: " force ",
      error: new SynthesisClientError(
        "invalid_request",
        "  Empty\nyear\u0000was rejected.  ",
        { status: "invalid_request" },
      ),
      occurredAt: "2026-08-01T00:00:00.000Z",
    });
    assert.deepInclude(failure, {
      graphHash: "sha256:graph-a",
      layoutAlgorithm: "force",
      code: "invalid_request",
      mutationStatus: "invalid_request",
      occurredAt: "2026-08-01T00:00:00.000Z",
    });
    assert.include(failure.message, "Empty year");
    assert.notInclude(failure.message, "\u0000");
  });

  it("recognizes graph application contention without converting it to a layout failure", function () {
    assert.isTrue(
      isSynthesisWorkbenchGraphApplicationBusyError(
        new SynthesisClientError("storage_busy", "Citation Graph is busy", {
          status: "graph_application_busy",
        }),
      ),
    );
    assert.isFalse(
      isSynthesisWorkbenchGraphApplicationBusyError(
        new SynthesisClientError("invalid_request", "Bad layout request", {
          status: "invalid_request",
        }),
      ),
    );
  });

  it("merges Citation Graph pages by id and rejects stale generations", function () {
    const initial = createSynthesisCitationGraphWindow({ generation: 3 });
    const first = mergeSynthesisCitationGraphPage(initial, {
      generation: 3,
      graphHash: "graph-a",
      querySignature: "query-a",
      nodes: [{ id: "a", x: 12, y: 24 }, { id: "b" }],
      edges: [{ id: "a-b", source: "a", target: "b" }],
      nextCursor: "cursor-1",
      hasMore: true,
      totalNodes: 3,
      totalEdges: 2,
    });
    assert.isTrue(first.accepted);
    const second = mergeSynthesisCitationGraphPage(first.window, {
      generation: 3,
      graphHash: "graph-a",
      querySignature: "query-a",
      nodes: [
        { id: "a", x: undefined, y: undefined },
        { id: "b" },
        { id: "c" },
      ],
      edges: [
        { id: "a-b", source: "a", target: "b" },
        { id: "b-c", source: "b", target: "c" },
      ],
      nextCursor: undefined,
      hasMore: false,
      totalNodes: 3,
      totalEdges: 2,
    });
    assert.deepEqual(
      second.window.nodes.map((node) => node.id),
      ["a", "b", "c"],
    );
    assert.deepEqual(
      second.window.edges.map((edge) => edge.id),
      ["a-b", "b-c"],
    );
    assert.equal(second.window.status, "complete");

    const stale = mergeSynthesisCitationGraphPage(second.window, {
      generation: 2,
      graphHash: "graph-a",
      querySignature: "query-a",
      nodes: [{ id: "stale" }],
      edges: [],
      hasMore: false,
      totalNodes: 1,
      totalEdges: 0,
    });
    assert.isFalse(stale.accepted);
    assert.equal(stale.reason, "stale_generation");
    assert.deepEqual(stale.window, second.window);
  });

  it("pauses, resumes, retries, and merges slices without advancing the page cursor", function () {
    const initial = createSynthesisCitationGraphWindow({
      generation: 1,
      nodeSoftLimit: 2,
      edgeSoftLimit: 2,
    });
    const page = mergeSynthesisCitationGraphPage(initial, {
      generation: 1,
      graphHash: "graph-a",
      querySignature: "query-a",
      nodes: [{ id: "a", x: 12, y: 24 }, { id: "b" }],
      edges: [{ id: "a-b", source: "a", target: "b" }],
      nextCursor: "cursor-1",
      hasMore: true,
      totalNodes: 3,
      totalEdges: 2,
    });
    assert.equal(page.window.status, "paused");
    const resumed = continueSynthesisCitationGraphWindow(page.window);
    assert.equal(resumed.status, "loading");
    assert.equal(resumed.nodeSoftLimit, 10_002);
    assert.equal(resumed.edgeSoftLimit, 20_002);

    const sliced = mergeSynthesisCitationGraphSlice(resumed, {
      generation: 1,
      graphHash: "graph-a",
      querySignature: "query-a",
      nodes: [{ id: "b" }, { id: "c" }],
      edges: [{ id: "b-c", source: "b", target: "c" }],
    });
    assert.isTrue(sliced.accepted);
    assert.equal(sliced.window.nextCursor, "cursor-1");
    assert.deepInclude(sliced.window.nodes[0], { id: "a", x: 12, y: 24 });
    const repeated = mergeSynthesisCitationGraphSlice(sliced.window, {
      generation: 1,
      graphHash: "graph-a",
      querySignature: "query-a",
      nodes: [{ id: "c" }],
      edges: [{ id: "b-c", source: "b", target: "c" }],
    });
    assert.lengthOf(repeated.window.nodes, 3);
    assert.lengthOf(repeated.window.edges, 2);

    const failed = failSynthesisCitationGraphWindow(
      repeated.window,
      "response_body_too_large",
      "page budget exhausted",
    );
    assert.equal(failed.status, "failed");
    assert.equal(failed.nextCursor, "cursor-1");
    const retried = retrySynthesisCitationGraphWindow(failed);
    assert.equal(retried.status, "loading");
    assert.equal(retried.nextCursor, "cursor-1");
  });

  it("loads the current 7,432-node graph completely within the default soft window", function () {
    const totalNodes = 7_432;
    const totalEdges = 11_377;
    let window = createSynthesisCitationGraphWindow({ generation: 9 });
    let nodeOffset = 0;
    let edgeOffset = 0;
    while (nodeOffset < totalNodes || edgeOffset < totalEdges) {
      const nextNodeOffset = Math.min(totalNodes, nodeOffset + 200);
      const nextEdgeOffset = Math.min(totalEdges, edgeOffset + 400);
      const hasMore =
        nextNodeOffset < totalNodes || nextEdgeOffset < totalEdges;
      const merged = mergeSynthesisCitationGraphPage(window, {
        generation: 9,
        graphHash: "graph-current-size",
        querySignature: "query-all",
        nodes: Array.from(
          { length: nextNodeOffset - nodeOffset },
          (_, index) => ({ id: `node-${nodeOffset + index}` }),
        ),
        edges: Array.from(
          { length: nextEdgeOffset - edgeOffset },
          (_, index) => ({
            id: `edge-${edgeOffset + index}`,
            source: "node-0",
            target: "node-1",
          }),
        ),
        nextCursor: hasMore
          ? `cursor-${nextNodeOffset}-${nextEdgeOffset}`
          : undefined,
        hasMore,
        totalNodes,
        totalEdges,
      });
      assert.isTrue(merged.accepted);
      assert.notEqual(merged.window.status, "paused");
      window = merged.window;
      nodeOffset = nextNodeOffset;
      edgeOffset = nextEdgeOffset;
    }
    assert.equal(window.status, "complete");
    assert.lengthOf(window.nodes, totalNodes);
    assert.lengthOf(window.edges, totalEdges);
  });

  it("normalizes a DTO-only snapshot with stable defaults", function () {
    const snapshot = normalizeSynthesisUiSnapshot({
      libraryId: 1,
      actions: {
        inFlight: [
          {
            key: "applyConceptReviewAction:review:1",
            command: "applyConceptReviewAction",
            status: "running",
            label: "Apply concept review",
          },
        ],
        lastFailed: {
          key: "manualRecomputeLayout:force",
          command: "manualRecomputeLayout",
          status: "failed",
          label: "Rebuild graph layout",
          message: "temporary failure",
        },
      },
      sync: {
        status: "ready",
        diagnostics: [
          {
            code: "persistence_check",
            severity: "info",
            message: "Persistence check",
          },
        ],
        allowedActions: [],
        requiresConfirmation: false,
        webdav: {
          queue_state: "blocked_conflict",
          paused: false,
          adapter_configured: true,
          config_status: "configured",
          base_url: "https://dav.example.invalid/root",
          remote_path: "zotero-agents",
          connection_test: {
            ok: true,
            tested_at: "2026-06-14T00:01:00.000Z",
            diagnostics: [
              {
                code: "webdav_sync_connection_ready",
                severity: "info",
                message: "WebDAV connection is ready",
              },
            ],
          },
          conflict_report: {
            conflicts: [
              {
                asset_path: "tags/vocabulary.json",
                reason: "both_changed",
                base_hash: "sha256:base",
                local_hash: "sha256:local",
                remote_hash: "sha256:remote",
              },
            ],
          },
          conflict_actions: [
            "keep_local",
            "save_remote_copy",
            "clear_after_manual_edit",
          ],
          allowed_actions: ["retryWebDavSync", "resolveWebDavSyncConflict"],
          diagnostics: [
            {
              code: "webdav_sync_conflict",
              severity: "warning",
              message: "Review required",
            },
          ],
        },
      },
      maintenance: {
        summary: {
          status: "queued",
          pendingDirtyCount: 2,
          activeWorkerCount: 1,
          activeWorkerKind: "reference-sidecar-operation",
          canonicalSyncPending: true,
          canonicalEpoch: 3,
          stale: ["citation-graph:library"],
          missing: [],
          partial: [],
          recommendedCommands: ["rebuildCitationGraphCacheNow"],
          diagnostics: [
            {
              code: "canonical_maintenance_active",
              severity: "info",
              message: "worker active",
            },
          ],
          latestUsable: {
            citationGraph: {
              updated_at: "2026-05-10T00:00:00.000Z",
              age_ms: 1000,
              graph_hash: "sha256:abc",
            },
          },
        },
      },
      conflicts: [
        {
          id: "conflict-a",
          topic_id: "topic-a",
          created_at: "2026-05-10T00:00:00.000Z",
          bundle_hash:
            "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
          reason: "base_hash_mismatch",
          status: "open",
        },
      ],
      artifacts: [
        {
          id: "topic-b",
          title: "Beta Topic",
          kind: "topic_synthesis",
          source_materials_status: "partial",
          source_materials_percent: 62,
          freshness: "dirty",
          updated_at: "2026-05-10T12:00:00.000Z",
          paper_count: 7,
          summary: "Beta summary",
          discovery_status: "candidates",
          candidate_count: 2,
        },
        {
          id: "topic-a",
          title: "Alpha Topic",
          kind: "topic_synthesis",
          source_materials_status: "complete",
          source_materials_percent: 100,
          freshness: "fresh",
          paper_count: 3,
          summary: "Alpha summary",
        },
      ],
      registry: {
        rows: [],
      },
      graph: {
        graph_hash: "sha256:abc",
        nodes: [],
        edges: [],
      },
    });

    assert.equal(snapshot.selectedTab, "overview");
    assert.deepEqual(
      snapshot.artifacts.rows.map((row) => row.id),
      ["topic-a", "topic-b"],
    );
    assert.equal(snapshot.artifacts.rows[1]?.freshness, "dirty");
    assert.equal(snapshot.artifacts.rows[1]?.paper_count, 7);
    assert.equal(snapshot.artifacts.rows[1]?.summary, "Beta summary");
    assert.equal(
      snapshot.artifacts.rows[1]?.source_materials_status,
      "partial",
    );
    assert.equal(snapshot.artifacts.rows[1]?.source_materials_percent, 62);
    assert.notProperty(snapshot.artifacts.rows[1] as any, "coverage");
    assert.notProperty(snapshot.artifacts.rows[1] as any, "completion");
    assert.equal(snapshot.artifacts.rows[1]?.discovery_status, "candidates");
    assert.equal(snapshot.artifacts.rows[1]?.candidate_count, 2);
    assert.equal(snapshot.preferences.graphRebuildMode, "off");
    assert.notProperty(snapshot.storage, "anchorState");
    assert.notProperty(snapshot.storage, "mirrorState");
    assert.equal(snapshot.graph.layoutAlgorithm, "force");
    assert.equal(
      snapshot.actions.inFlight[0]?.command,
      "applyConceptReviewAction",
    );
    assert.equal(snapshot.actions.lastFailed?.status, "failed");
    assert.equal(snapshot.sync.status, "ready");
    assert.lengthOf(snapshot.sync.diagnostics, 1);
    assert.notProperty(snapshot.sync, "git");
    assert.equal(snapshot.sync.webdav?.queue_state, "blocked_conflict");
    assert.equal(snapshot.sync.webdav?.config_status, "configured");
    assert.equal(snapshot.sync.webdav?.connection_test?.ok, true);
    assert.equal(snapshot.sync.webdav?.conflict_count, 1);
    assert.deepEqual(snapshot.sync.webdav?.conflict_assets, [
      {
        asset_path: "tags/vocabulary.json",
        reason: "both_changed",
        base_hash: "sha256:base",
        local_hash: "sha256:local",
        remote_hash: "sha256:remote",
      },
    ]);
    assert.sameMembers(snapshot.sync.webdav?.conflictActions || [], [
      "keep_local",
      "save_remote_copy",
      "clear_after_manual_edit",
    ]);
    assert.include(
      snapshot.sync.webdav?.allowedActions || [],
      "retryWebDavSync",
    );
    assert.equal(snapshot.maintenance.summary.status, "queued");
    assert.deepEqual(snapshot.maintenance.backgroundJobs.rows, []);
    assert.equal(
      snapshot.maintenance.summary.activeWorkerKind,
      "reference-sidecar-operation",
    );
    assert.include(
      snapshot.maintenance.summary.recommendedCommands,
      "rebuildCitationGraphCacheNow",
    );
    assert.equal(snapshot.deletedArtifacts.count, 0);
    assert.deepEqual(
      snapshot.conflicts.candidates.map((entry) => entry.id),
      ["conflict-a"],
    );
    assert.isArray(snapshot.hostCommands);
    assert.include(snapshot.hostCommands, "syncWebDavNow");
    assert.include(snapshot.hostCommands, "resolveWebDavSyncConflict");
    assert.notInclude(snapshot.hostCommands, "syncNow");
    assert.notInclude(snapshot.hostCommands, "resolveGitSyncConflict");
    assert.include(snapshot.hostCommands, "runAdvancedReferenceMatchingNow");
    assert.include(snapshot.hostCommands, "applyReferenceMatchProposalAction");
    assert.include(snapshot.hostCommands, "applyReferenceMatchProposalActions");
  });

  it("classifies wrapped SQLite busy errors as transient storage refresh failures", function () {
    assert.isTrue(
      isTransientStorageBusyError({
        message: "storage execution failed",
        cause: {
          message:
            "Component returned failure code: 0x80630001 (NS_ERROR_STORAGE_BUSY)",
        },
      }),
    );
    assert.isTrue(
      isTransientStorageBusyError({
        message: "repository read failed",
        cause: new Error("SQLITE_BUSY: database is locked"),
      }),
    );
    assert.isFalse(isTransientStorageBusyError(new Error("schema mismatch")));
  });

  it("keeps stale graph refresh routed through the host and UI model", async function () {
    const host = await fs.readFile(
      "src/modules/synthesisWorkbenchTab.ts",
      "utf8",
    );
    const uiModel = await fs.readFile(
      "src/modules/synthesis/uiModel.ts",
      "utf8",
    );
    assert.include(host, "refreshCitationGraphCacheIncrementalNow");
    assert.include(uiModel, "refreshCitationGraphCacheIncrementalNow");
    const filterGraphBlock = extractFunctionBlock(uiModel, "filterGraph");
    assert.include(filterGraphBlock, "topicScopes");
    assert.include(filterGraphBlock, "projectCitationGraphVisibility");
    assert.notInclude(
      filterGraphBlock,
      "includesText(searchable(node), filters.search)",
    );
  });

  it("refreshes the first graph rebuild through the host layout operation", async function () {
    const tabSource = await fs.readFile(
      "src/modules/synthesisWorkbenchTab.ts",
      "utf8",
    );
    const commandBlock = extractFunctionBlock(
      tabSource,
      "runWorkbenchCommandOnce",
    );
    const observeBlock = extractFunctionBlock(
      tabSource,
      "observeCurrentCitationGraphLayout",
    );

    assert.include(commandBlock, "isCitationGraphCacheCommand(command)");
    assert.include(commandBlock, "refreshGraphLayoutIfNeeded(runtime)");
    assert.include(observeBlock, "maxAttempts");
  });

  it("normalizes Synthesis background jobs without inventing progress", function () {
    const snapshot = buildSynthesisUiSnapshot({
      libraryId: 1,
      actions: {
        inFlight: [
          {
            key: "refreshReferenceSidecarNow",
            command: "refreshReferenceSidecarNow",
            status: "running",
            label: "Refresh reference sidecar",
          },
        ],
      },
      maintenance: {
        backgroundJobs: [
          {
            job_id: "synthesis:reference-sidecar:queued",
            source: "operation",
            status: "queued",
            label: "Reference sidecar refresh",
            detail: "2 pending - 0 running - 0 failed",
            updated_at: "2026-05-25T00:00:00.000Z",
            progress: { mode: "indeterminate" },
          },
          {
            job_id: "synthesis:reference-sidecar",
            source: "operation",
            status: "running",
            label: "Reference sidecar refresh",
            updated_at: "2026-05-25T00:01:00.000Z",
            progress: {
              mode: "determinate",
              percent: 30,
              current: 3,
              total: 10,
            },
          },
          {
            job_id: "",
            source: "workbench",
            status: "running",
            label: "Ignored",
          },
        ],
      },
    });

    assert.lengthOf(snapshot.maintenance.backgroundJobs.rows, 2);
    assert.equal(snapshot.maintenance.backgroundJobs.runningCount, 1);
    assert.equal(snapshot.maintenance.backgroundJobs.queuedCount, 1);
    assert.equal(
      snapshot.maintenance.backgroundJobs.primaryJob?.job_id,
      "synthesis:reference-sidecar",
    );
    assert.deepEqual(snapshot.maintenance.backgroundJobs.rows[1]?.progress, {
      mode: "indeterminate",
    });
    assert.deepEqual(snapshot.maintenance.backgroundJobs.rows[0]?.progress, {
      mode: "determinate",
      percent: 30,
      current: 3,
      total: 10,
      label: undefined,
    });
  });

  it("derives stable operation keys for scoped asynchronous actions", function () {
    assert.equal(
      getSynthesisUiOperationKey("applyConceptReviewAction", {
        reviewId: "review:weak",
        action: "merge_into_existing",
        targetConceptId: "concept:detr",
      }),
      "applyConceptReviewAction:review:weak",
    );
    assert.equal(
      getSynthesisUiOperationKey("manualRecomputeLayout", {
        algorithm: "radial",
      }),
      "manualRecomputeLayout:radial",
    );
    assert.equal(
      getSynthesisUiOperationKey("manualRecomputeLayout", {
        preset: "expanded",
      }),
      "manualRecomputeLayout:force",
    );
    assert.equal(
      getSynthesisUiOperationKey("acceptTopicGraphRelation", {
        edgeId: "edge:related_to:a:b",
      }),
      "decideTopicGraphRelation:edge:related_to:a:b",
    );
  });

  it("sorts topic rows by paper count and update time for card views", function () {
    const byPaperCount = applySynthesisUiAction(
      createDefaultSynthesisUiState(),
      {
        action: "setFilters",
        payload: {
          artifacts: {
            sort: "paper_count",
            viewMode: "grid",
          },
        },
      },
    ).state;
    const byUpdatedAt = applySynthesisUiAction(byPaperCount, {
      action: "setFilters",
      payload: {
        artifacts: {
          sort: "updated_at",
        },
      },
    }).state;

    const input = {
      libraryId: 1,
      artifacts: [
        {
          id: "topic-small-new",
          title: "Small New",
          kind: "topic_synthesis" as const,
          source_materials_status: "complete" as const,
          source_materials_percent: 100,
          freshness: "fresh" as const,
          updated_at: "2026-05-12T00:00:00.000Z",
          paper_count: 1,
        },
        {
          id: "topic-large-old",
          title: "Large Old",
          kind: "topic_synthesis" as const,
          source_materials_status: "partial" as const,
          source_materials_percent: 50,
          freshness: "dirty" as const,
          updated_at: "2026-05-10T00:00:00.000Z",
          paper_count: 12,
        },
      ],
    };

    const paperSnapshot = buildSynthesisUiSnapshot(input, byPaperCount);
    const updatedSnapshot = buildSynthesisUiSnapshot(input, byUpdatedAt);

    assert.equal(paperSnapshot.artifacts.filters.viewMode, "grid");
    assert.deepEqual(
      paperSnapshot.artifacts.visibleRows.map((row) => row.id),
      ["topic-large-old", "topic-small-new"],
    );
    assert.deepEqual(
      updatedSnapshot.artifacts.visibleRows.map((row) => row.id),
      ["topic-small-new", "topic-large-old"],
    );
  });

  it("filters artifacts and registry rows through host-owned state", function () {
    const state = createDefaultSynthesisUiState();
    const filteredState = applySynthesisUiAction(state, {
      action: "setFilters",
      payload: {
        artifacts: {
          search: "graph",
          sourceMaterials: "partial",
          freshness: "dirty",
        },
        registry: {
          artifactCoverage: "partial",
        },
      },
    }).state;

    const snapshot = buildSynthesisUiSnapshot(
      {
        libraryId: 1,
        artifacts: [
          {
            id: "topic-graph",
            title: "Graph Synthesis",
            kind: "topic_synthesis",
            source_materials_status: "partial",
            source_materials_percent: 50,
            freshness: "dirty",
          },
          {
            id: "topic-tags",
            title: "Tag Synthesis",
            kind: "topic_synthesis",
            source_materials_status: "complete",
            source_materials_percent: 100,
            freshness: "fresh",
          },
        ],
        registry: {
          rows: [
            {
              paper_ref: "1:A",
              title: "Ready Paper",
              year: "2024",
              artifactCoverage: "complete",
              missing_artifacts: [],
            },
            {
              paper_ref: "1:B",
              title: "Partial Paper",
              year: "2025",
              artifactCoverage: "partial",
              missing_artifacts: ["citation_analysis"],
            },
          ],
        },
        graph: {
          graph_hash: "sha256:abc",
          nodes: [],
          edges: [],
        },
      },
      filteredState,
    );

    assert.deepEqual(
      snapshot.artifacts.visibleRows.map((row) => row.id),
      ["topic-graph"],
    );
    assert.equal(snapshot.artifacts.visibleRows[0]?.freshness, "dirty");
    assert.deepEqual(
      snapshot.registry.visibleRows.map((row) => row.paper_ref),
      ["1:B"],
    );
  });

  it("filters Index rows by scope, artifact coverage, and binding status", function () {
    const input = {
      libraryId: 1,
      registry: {
        rows: [
          {
            paper_ref: "1:BOUND",
            title: "Bound Source",
            artifactCoverage: "complete" as const,
            missing_artifacts: [],
            index_scope: "library" as const,
            references: [
              {
                reference_instance_id: "raw:1",
                reference_index: 0,
                title: "Candidate Reference",
                target_binding: "library" as const,
                binding_status: "candidate" as const,
              },
            ],
          },
          {
            paper_ref: "1:UNBOUND",
            title: "Unbound Source",
            artifactCoverage: "complete" as const,
            missing_artifacts: [],
            index_scope: "library" as const,
            references: [
              {
                reference_instance_id: "raw:2",
                reference_index: 0,
                title: "Unbound Reference",
                target_binding: "none" as const,
              },
            ],
          },
          {
            paper_ref: "ref:external",
            title: "Referenced Only",
            artifactCoverage: "missing" as const,
            missing_artifacts: [],
            index_scope: "referenced" as const,
          },
        ],
      },
    };

    const libraryState = applySynthesisUiAction(
      createDefaultSynthesisUiState(),
      {
        action: "setFilters",
        payload: {
          registry: {
            scope: "library",
            artifactCoverage: "complete",
            bindingStatus: "candidate",
          },
        },
      },
    ).state;
    const referencedCandidateState = applySynthesisUiAction(
      createDefaultSynthesisUiState(),
      {
        action: "setFilters",
        payload: {
          registry: { scope: "referenced", bindingStatus: "candidate" },
        },
      },
    ).state;

    assert.deepEqual(
      buildSynthesisUiSnapshot(input, libraryState).registry.visibleRows.map(
        (row) => row.paper_ref,
      ),
      ["1:BOUND", "1:UNBOUND"],
    );
    assert.deepEqual(
      buildSynthesisUiSnapshot(
        input,
        referencedCandidateState,
      ).registry.visibleRows.map((row) => row.paper_ref),
      ["1:BOUND"],
    );
  });

  it("preserves bounded literature ratings while analysis routing follows four-artifact coverage", function () {
    const snapshot = buildSynthesisUiSnapshot({
      libraryId: 1,
      registry: {
        rows: [
          {
            paper_ref: "1:RATED",
            title: "Rated Paper",
            artifactCoverage: "complete",
            missing_artifacts: [],
            ratingScore: 65,
          },
          {
            paper_ref: "1:REPAIR",
            title: "Repair Score",
            artifactCoverage: "partial",
            missing_artifacts: ["literature_score"],
            ratingScore: 101,
          },
        ],
      },
    });

    const rated = snapshot.registry.rows.find(
      (row) => row.paper_ref === "1:RATED",
    );
    const repair = snapshot.registry.rows.find(
      (row) => row.paper_ref === "1:REPAIR",
    );
    assert.equal(rated?.ratingScore, 65);
    assert.notProperty(rated || {}, "literatureAnalysisMode");
    assert.deepEqual(repair?.missing_artifacts, ["literature_score"]);
    assert.isUndefined(repair?.ratingScore);
  });

  it("tracks Review center filters and Index review drawer state", function () {
    const selected = applySynthesisUiAction(createDefaultSynthesisUiState(), {
      action: "selectTab",
      payload: { tab: "reviews" },
    }).state;
    const filtered = applySynthesisUiAction(selected, {
      action: "setFilters",
      payload: {
        reviews: {
          activeTab: "reference_matching",
          search: "method",
          status: "rejected",
          kind: "zotero_binding",
          confidence: "review",
        },
        registry: {
          reviewDrawerOpen: false,
          reviewDrawerIndex: 2,
        },
      },
    }).state;
    const snapshot = buildSynthesisUiSnapshot({ libraryId: 1 }, filtered);

    assert.equal(snapshot.selectedTab, "reviews");
    assert.deepEqual(snapshot.reviews.filters, {
      activeTab: "reference_matching",
      search: "method",
      status: "rejected",
      kind: "zotero_binding",
      confidence: "review",
    });
    assert.equal(snapshot.registry.filters.reviewDrawerOpen, false);
    assert.equal(snapshot.registry.filters.reviewDrawerIndex, 2);

    const legacyIndexCleanup = applySynthesisUiAction(selected, {
      action: "setFilters",
      payload: { reviews: { activeTab: "index_cleanup" } },
    }).state;
    assert.equal(legacyIndexCleanup.reviews.activeTab, "reference_matching");

    const retargeted = applySynthesisUiAction(selected, {
      action: "setFilters",
      payload: { reviews: { status: "retargeted" } },
    }).state;
    const targetSnapshot = buildSynthesisUiSnapshot(
      {
        libraryId: 1,
        registry: {
          matchTargetCandidates: [
            {
              kind: "zotero_item",
              libraryId: 1,
              itemKey: "A",
              title: "Alpha Target",
              year: "2020",
              paperRef: "1:A",
            },
            {
              kind: "canonical_reference",
              canonicalReferenceId: "cref:中文",
              title: "中文标题",
              bindingStatus: "accepted",
              bindingTarget: {
                libraryId: 1,
                itemKey: "BOUND",
                paperRef: "1:BOUND",
              },
            },
          ],
          matchProposals: [
            {
              proposal_id: "proposal:retargeted",
              kind: "zotero_binding",
              status: "retargeted",
              source_canonical_reference_id: "cref:source",
              source_effective_canonical_reference_id: "cref:effective-source",
              source_raw_reference_ids: [],
              target_canonical_reference_id: "cref:target",
              target_effective_canonical_reference_id: "cref:effective-target",
            },
          ],
        },
      },
      retargeted,
    );
    assert.equal(targetSnapshot.reviews.filters.status, "retargeted");
    assert.equal(
      targetSnapshot.registry.matchProposals[0]?.status,
      "retargeted",
    );
    assert.equal(
      targetSnapshot.registry.matchProposals[0]
        ?.source_effective_canonical_reference_id,
      "cref:effective-source",
    );
    assert.equal(
      targetSnapshot.registry.matchProposals[0]
        ?.target_effective_canonical_reference_id,
      "cref:effective-target",
    );
    assert.deepInclude(targetSnapshot.registry.matchTargetCandidates, {
      kind: "zotero_item",
      libraryId: 1,
      itemKey: "A",
      title: "Alpha Target",
      year: "2020",
      paperRef: "1:A",
    });
    const canonicalTarget = targetSnapshot.registry.matchTargetCandidates.find(
      (candidate) =>
        candidate.kind === "canonical_reference" &&
        candidate.canonicalReferenceId === "cref:中文",
    );
    assert.equal(canonicalTarget?.title, "中文标题");
    assert.equal(canonicalTarget?.bindingStatus, "accepted");
    assert.deepEqual(canonicalTarget?.bindingTarget, {
      libraryId: 1,
      itemKey: "BOUND",
      paperRef: "1:BOUND",
    });
  });

  it("summarizes Home review items independently from the Review tab", function () {
    const snapshot = buildSynthesisUiSnapshot({
      libraryId: 1,
      reviews: {
        summary: {
          openCount: 2,
          indexCount: 2,
          referenceMatchingCount: 1,
          conceptCount: 0,
          topicGraphCount: 0,
        },
      },
      concepts: {
        reviewItems: [
          {
            review_id: "concept-review:1",
            status: "open",
            reason: "low_confidence_concept",
            label: "DETR",
          },
        ],
      },
      topicGraph: {
        reviewItems: [
          {
            review_id: "topic-review:1",
            status: "open",
            relation: "related_to",
            source_topic_id: "topic:a",
            target_topic_id: "topic:b",
          },
        ],
      },
    });

    assert.deepEqual(snapshot.reviews.summary, {
      openCount: 4,
      indexCount: 2,
      referenceMatchingCount: 1,
      conceptCount: 1,
      topicGraphCount: 1,
    });
  });

  it("renders Tags tab state with table workbench filters, selection, actions, and import preview", function () {
    const state = applySynthesisUiAction(createDefaultSynthesisUiState(), {
      action: "setFilters",
      payload: {
        tags: {
          search: "detr",
          facet: "model",
          status: "warning",
          view: "staged",
          stagedSearch: "candidate",
          stagedFacet: "topic",
          selectedStagedTags: ["topic:candidate", "topic:missing"],
          selectedVocabularyTags: ["model:detr"],
          density: "comfortable",
          editingStagedTag: {
            originalTag: "topic:candidate",
            draftTag: "candidate edited",
            draftNote: "draft note",
            status: "failed",
            error: "save failed",
          },
          expandedRows: {
            "vocabulary:model:detr": true,
            "staged:topic:candidate": true,
          },
          importDraft: '{"entries":[]}',
        },
      },
    }).state;
    const selectedState = applySynthesisUiAction(state, {
      action: "selectTag",
      payload: { tag: "model:detr" },
    }).state;

    const snapshot = buildSynthesisUiSnapshot(
      {
        libraryId: 1,
        tags: {
          entries: [
            {
              tag: "model:detr",
              facet: "model",
              note: "Detection Transformer",
              aliases: ["DETR"],
              abbrev: ["DETR"],
              usage_count: 2,
            },
            {
              tag: "data:coco",
              facet: "data",
            },
          ],
          protocol: { facets: ["model", "data"] },
          validationWarnings: [
            {
              code: "missing_replacement",
              severity: "warning",
              tag: "model:detr",
              message: "replacement missing",
            },
          ],
          projection: {
            target: "tag-index",
            stale: true,
            diagnostics: [],
          },
          staged: [
            {
              tag: "topic:candidate",
              facet: "topic",
              note: "candidate note",
              source_flow: "tag-regulator-suggest",
              parent_bindings: [
                { libraryId: 1, itemKey: "ITEM0022" },
                { libraryId: 1, itemKey: "ITEM0011" },
                { libraryId: 1, itemKey: "ITEM0022" },
              ],
              updated_at: "2026-06-05T00:00:00.000Z",
            },
            {
              tag: "field:hidden",
              facet: "field",
              note: "hidden",
            },
          ],
          importPreview: {
            additions: [],
            unchanged: [],
            conflicts: [
              {
                tag: "model:detr",
                local: { tag: "model:detr", facet: "model" },
                imported: {
                  tag: "model:detr",
                  facet: "model",
                  note: "imported",
                },
              },
            ],
            warnings: [],
          },
        },
      },
      selectedState,
    );

    assert.equal(snapshot.selectedTab, "tags");
    assert.deepEqual(snapshot.tags.facets, ["data", "model"]);
    assert.deepEqual(
      snapshot.tags.visibleRows.map((row) => row.tag),
      ["model:detr"],
    );
    assert.equal(snapshot.tags.selected?.tag, "model:detr");
    assert.equal(snapshot.tags.filters.view, "staged");
    assert.equal(snapshot.tags.filters.density, "comfortable");
    assert.deepEqual(snapshot.tags.filters.selectedStagedTags, [
      "topic:candidate",
      "topic:missing",
    ]);
    assert.deepEqual(snapshot.tags.filters.selectedVocabularyTags, [
      "model:detr",
    ]);
    assert.deepEqual(snapshot.tags.filters.editingStagedTag, {
      originalTag: "topic:candidate",
      draftTag: "candidate edited",
      draftNote: "draft note",
      status: "failed",
      error: "save failed",
    });
    assert.deepEqual(snapshot.tags.filters.expandedRows, {
      "staged:topic:candidate": true,
      "vocabulary:model:detr": true,
    });
    assert.deepEqual(snapshot.tags.stagedFacets, ["field", "topic"]);
    assert.equal(snapshot.tags.stagedCount, 2);
    assert.deepEqual(
      snapshot.tags.visibleStagedRows.map((row) => row.tag),
      ["topic:candidate"],
    );
    assert.deepEqual(snapshot.tags.visibleStagedRows[0]?.parent_bindings, [
      { libraryId: 1, itemKey: "ITEM0011" },
      { libraryId: 1, itemKey: "ITEM0022" },
    ]);
    assert.equal(snapshot.tags.visibleStagedRows[0]?.parent_count, 2);
    assert.isTrue(snapshot.tags.projection.stale);
    assert.equal(snapshot.tags.importDraft, '{"entries":[]}');
    assert.lengthOf(snapshot.tags.importPreview?.conflicts || [], 1);
    assert.include(snapshot.hostCommands, "previewTagVocabularyImport");
    assert.include(snapshot.hostCommands, "runTagBootstrapper");
    assert.include(snapshot.hostCommands, "applyTagVocabularyImport");
    assert.include(snapshot.hostCommands, "updateStagedTagSuggestion");
    assert.include(snapshot.hostCommands, "updateTagVocabularyEntry");
    assert.include(snapshot.hostCommands, "deleteTagVocabularyEntry");
    assert.include(snapshot.hostCommands, "promoteStagedTagSuggestions");
    assert.include(snapshot.hostCommands, "discardStagedTagSuggestions");
    assert.include(snapshot.hostCommands, "clearStagedTagSuggestions");

    const command = applySynthesisUiAction(selectedState, {
      action: "hostCommand",
      payload: { command: "validateTagVocabulary" },
    });
    assert.equal(command.hostCommand?.command, "validateTagVocabulary");
    const bootstrapCommand = applySynthesisUiAction(selectedState, {
      action: "hostCommand",
      payload: { command: "runTagBootstrapper" },
    });
    assert.equal(bootstrapCommand.hostCommand?.command, "runTagBootstrapper");
    assert.equal(
      getSynthesisUiOperationKey("promoteStagedTagSuggestions", {
        tags: ["topic:candidate"],
      }),
      "promoteStagedTagSuggestions:topic:candidate",
    );
    assert.equal(
      getSynthesisUiOperationKey("updateStagedTagSuggestion", {
        originalTag: "topic:candidate",
        tag: "topic:candidate-edited",
      }),
      "updateStagedTagSuggestion:topic:candidate",
    );
    assert.equal(
      getSynthesisUiOperationKey("updateTagVocabularyEntry", {
        originalTag: "model:detr",
        tag: "model:detr-v2",
      }),
      "updateTagVocabularyEntry:model:detr",
    );
  });

  it("marks builtin status rows and guards identity and deletion controls", async function () {
    const snapshot = buildSynthesisUiSnapshot(
      {
        libraryId: 1,
        tags: {
          entries: [
            {
              tag: "status:need-analysis",
              facet: "status",
              note: "Editable note",
              source: "builtin",
            },
            {
              tag: "status:custom-review",
              facet: "status",
              note: "Custom status",
              source: "manual",
            },
          ],
          protocol: { facets: ["status"] },
        },
      },
      createDefaultSynthesisUiState(),
    );

    assert.isTrue(
      snapshot.tags.rows.find((row) => row.tag === "status:need-analysis")
        ?.builtin,
    );
    assert.isFalse(
      snapshot.tags.rows.find((row) => row.tag === "status:custom-review")
        ?.builtin,
    );
    const tab = await fs.readFile(
      "src/modules/synthesisWorkbenchTab.ts",
      "utf8",
    );
    assert.include(tab, "Builtin tag identity is protected");
    assert.include(tab, "Builtin tags cannot be deleted");
  });

  it("refreshes the Tags surface after tag import preview and apply commands", async function () {
    const host = await fs.readFile(
      "src/modules/synthesisWorkbenchTab.ts",
      "utf8",
    );
    const invalidationBlock = extractFunctionBlock(
      host,
      "surfacesInvalidatedByCommand",
    );
    const previewImportBranch = invalidationBlock.slice(
      invalidationBlock.indexOf('command === "rebuildTagVocabularyIndex"'),
      invalidationBlock.indexOf('command === "rebuildConceptKbIndex"'),
    );

    assert.include(previewImportBranch, 'command === "runTagBootstrapper"');
    assert.include(
      previewImportBranch,
      'command === "previewTagVocabularyImport"',
    );
    assert.include(
      previewImportBranch,
      'command === "applyTagVocabularyImport"',
    );
    assert.include(
      previewImportBranch,
      'command === "promoteStagedTagSuggestions"',
    );
    assert.include(
      previewImportBranch,
      'command === "clearStagedTagSuggestions"',
    );
    assert.include(
      previewImportBranch,
      'command === "updateTagVocabularyEntry"',
    );
    assert.include(
      previewImportBranch,
      'command === "deleteTagVocabularyEntry"',
    );
    assert.include(previewImportBranch, 'return ["tags"]');
  });

  it("refreshes the Graph surface after reference refresh and advanced matching commands", async function () {
    const host = await fs.readFile(
      "src/modules/synthesisWorkbenchTab.ts",
      "utf8",
    );
    const invalidationBlock = extractFunctionBlock(
      host,
      "surfacesInvalidatedByCommand",
    );
    const referenceBranch = invalidationBlock.slice(
      invalidationBlock.indexOf('command === "refreshReferenceSidecarNow"'),
      invalidationBlock.indexOf(
        'command === "applyReferenceMatchProposalAction"',
      ),
    );

    assert.include(referenceBranch, 'command === "refreshReferenceSidecarNow"');
    assert.include(
      referenceBranch,
      'command === "retryReferenceSidecarRefresh"',
    );
    assert.include(
      referenceBranch,
      'command === "runAdvancedReferenceMatchingNow"',
    );
    assert.include(
      referenceBranch,
      'command === "retryAdvancedReferenceMatching"',
    );
    assert.include(referenceBranch, 'return ["index", "review", "graph"]');
  });

  it("refreshes topic synthesis and topic graph review surfaces after related commands", async function () {
    const host = await fs.readFile(
      "src/modules/synthesisWorkbenchTab.ts",
      "utf8",
    );
    const invalidationBlock = extractFunctionBlock(
      host,
      "surfacesInvalidatedByCommand",
    );
    const topicSynthesisBranch = invalidationBlock.slice(
      invalidationBlock.indexOf('command === "runSynthesizeTopic"'),
      invalidationBlock.indexOf('command === "acceptTopicGraphRelation"'),
    );
    const topicGraphReviewBranch = invalidationBlock.slice(
      invalidationBlock.indexOf('command === "acceptTopicGraphRelation"'),
      invalidationBlock.indexOf('command === "deleteTopicArtifact"'),
    );

    assert.include(topicSynthesisBranch, 'command === "runSynthesizeTopic"');
    assert.include(
      topicSynthesisBranch,
      'command === "submitTopicSynthesisUpdate"',
    );
    assert.include(
      topicSynthesisBranch,
      'return ["home", "topics", "concepts", "graph", "review"]',
    );
    assert.include(
      topicGraphReviewBranch,
      'command === "acceptTopicGraphRelation"',
    );
    assert.include(
      topicGraphReviewBranch,
      'command === "rejectTopicGraphRelation"',
    );
    assert.include(
      topicGraphReviewBranch,
      'command === "applyTopicGraphReviewAction"',
    );
    assert.include(
      topicGraphReviewBranch,
      'return ["home", "topics", "graph", "review"]',
    );
  });

  it("updates graph layout algorithm and selected element without recomputing layout", function () {
    const state = createDefaultSynthesisUiState();
    const next = applySynthesisUiAction(state, {
      action: "setGraphView",
      payload: {
        layoutAlgorithm: "radial",
        nodeKinds: ["library_paper", "external_reference"],
        showLowSignalReferences: true,
        role: "method",
        selectedElement: { kind: "node", id: "n1" },
        neighborhoodDepth: 2,
      },
    });

    assert.isTrue(next.handled);
    assert.equal(next.state.graph.layoutAlgorithm, "radial");
    assert.deepEqual(next.state.graph.selectedElement, {
      kind: "node",
      id: "n1",
    });
    assert.equal(next.state.graph.neighborhoodDepth, 2);
    assert.deepEqual(next.state.graph.nodeKinds, [
      "external_reference",
      "library_paper",
    ]);
    assert.equal(next.state.graph.showLowSignalReferences, true);
    assert.equal(next.state.graph.role, "method");
    assert.isUndefined(next.hostCommand);

    const legacyPreset = applySynthesisUiAction(state, {
      action: "setGraphView",
      payload: { layoutPreset: "expanded" },
    });

    assert.equal(legacyPreset.state.graph.layoutAlgorithm, "force");

    const cleared = applySynthesisUiAction(next.state, {
      action: "setGraphView",
      payload: { selectedElement: null },
    });
    assert.isUndefined(cleared.state.graph.selectedElement);
    assert.isFalse(Object.hasOwn(cleared.state.graph, "selectedElement"));
    assert.notProperty(
      toSynthesisWorkbenchReadState(cleared.state).graph,
      "selectedElement",
    );
  });

  it("tracks the internal artifact reader view and selected topic", function () {
    const state = applySynthesisUiAction(createDefaultSynthesisUiState(), {
      action: "selectTab",
      payload: { tab: "artifacts" },
    }).state;
    const opened = applySynthesisUiAction(state, {
      action: "showArtifactReader",
      payload: { topicId: "topic-a" },
    });
    const closed = applySynthesisUiAction(opened.state, {
      action: "closeArtifactReader",
    });

    assert.isTrue(opened.handled);
    assert.equal(opened.state.selectedTab, "reader");
    assert.equal(opened.state.reader.topicId, "topic-a");
    assert.equal(opened.state.reader.previousTab, "artifacts");
    assert.equal(closed.state.selectedTab, "artifacts");
    assert.equal(closed.state.reader.topicId, "");
  });

  it("filters graph nodes by kind, low-signal external visibility, and role while search stays visual", function () {
    const state = applySynthesisUiAction(createDefaultSynthesisUiState(), {
      action: "setGraphView",
      payload: {
        nodeKinds: ["library_paper", "external_reference"],
        showLowSignalReferences: false,
      },
    }).state;
    const filteredState = applySynthesisUiAction(state, {
      action: "setFilters",
      payload: {
        graph: {
          role: "method",
          search: "X",
        },
      },
    }).state;
    const snapshot = buildSynthesisUiSnapshot(
      {
        libraryId: 1,
        graph: {
          graph_hash: "sha256:graph",
          diagnostics: {
            node_counts: {
              library_paper: 1,
              external_reference: 2,
            },
            reference_stats: {
              dropped_empty: 0,
            },
          },
          nodes: [
            {
              id: "paper:a",
              label: "A",
              kind: "library_paper",
              metrics: { internal_in_degree: 3, internal_out_degree: 2 },
            },
            {
              id: "ref:external:x",
              label: "X",
              kind: "external_reference",
              metrics: { internal_in_degree: 1, internal_out_degree: 0 },
            },
            {
              id: "ref:raw:y",
              label: "Y",
              kind: "external_reference",
              low_signal: true,
            },
          ],
          edges: [
            {
              id: "e1",
              source: "paper:a",
              target: "ref:external:x",
              primary_role: "method",
            },
            {
              id: "e2",
              source: "paper:a",
              target: "ref:raw:y",
              primary_role: "background",
            },
          ],
        },
      },
      filteredState,
    );

    assert.deepEqual(
      snapshot.graph.visibleNodes.map((node) => node.id),
      ["paper:a"],
    );
    assert.deepEqual(snapshot.graph.visibleEdges, []);
    assert.deepEqual(
      snapshot.graph.hoverOnlyNodes.map((node) => node.id),
      ["ref:external:x"],
    );
    assert.deepEqual(
      snapshot.graph.hoverOnlyEdges.map((edge) => edge.id),
      ["e1"],
    );
    assert.deepEqual(
      snapshot.graph.visibleNodes.find((node) => node.id === "paper:a")
        ?.metrics,
      { internal_in_degree: 3, internal_out_degree: 2 },
    );
    assert.equal(snapshot.graph.diagnostics.reference_stats.dropped_empty, 0);
  });

  it("filters citation graph to a selected topic's fixed one-hop subgraph", function () {
    const state = applySynthesisUiAction(createDefaultSynthesisUiState(), {
      action: "setGraphView",
      payload: {
        topicId: "topic-a",
        nodeKinds: ["library_paper", "external_reference"],
        showLowSignalReferences: true,
      },
    }).state;

    assert.equal(state.graph.topicId, "topic-a");

    const snapshot = buildSynthesisUiSnapshot(
      {
        libraryId: 1,
        graph: {
          graph_hash: "sha256:graph",
          topicScopes: [
            {
              topicId: "topic-a",
              title: "Topic A",
              paperRefs: ["1:A"],
              nodeIds: ["zotero:item:A"],
            },
          ],
          nodes: [
            { id: "zotero:item:A", label: "A", kind: "library_paper" },
            { id: "zotero:item:B", label: "B", kind: "library_paper" },
            { id: "ref:X", label: "X", kind: "external_reference" },
            { id: "ref:Y", label: "Y", kind: "external_reference" },
          ],
          edges: [
            { id: "e1", source: "zotero:item:A", target: "ref:X" },
            { id: "e2", source: "ref:Y", target: "zotero:item:A" },
            { id: "e3", source: "zotero:item:B", target: "ref:X" },
          ],
        },
      },
      state,
    );

    assert.deepEqual(
      snapshot.graph.visibleNodes.map((node) => node.id),
      ["zotero:item:A"],
    );
    assert.deepEqual(snapshot.graph.visibleEdges, []);
    assert.deepEqual(
      snapshot.graph.hoverOnlyNodes.map((node) => node.id),
      ["ref:X"],
    );
    assert.deepEqual(
      snapshot.graph.hoverOnlyEdges.map((edge) => edge.id),
      ["e1"],
    );
    assert.equal(snapshot.graph.selectedTopicScope?.title, "Topic A");

    const allState = applySynthesisUiAction(state, {
      action: "setGraphView",
      payload: { topicId: "all" },
    }).state;
    assert.equal(allState.graph.topicId, "all");
  });

  it("derives filtered external visibility from distinct library sources while preserving drawer data", function () {
    const input = {
      libraryId: 1,
      graph: {
        graph_hash: "sha256:graph",
        nodes: [
          { id: "paper:a", label: "A", kind: "library_paper" as const },
          { id: "paper:b", label: "B", kind: "library_paper" as const },
          {
            id: "lit:shared",
            label: "Shared External",
            kind: "external_reference" as const,
          },
          {
            id: "lit:single",
            label: "Single External",
            kind: "external_reference" as const,
          },
          {
            id: "lit:zero",
            label: "Disconnected External",
            kind: "unresolved_reference" as const,
          },
        ],
        edges: [
          {
            id: "e-a-shared",
            source: "paper:a",
            target: "lit:shared",
            primary_role: "background",
          },
          {
            id: "e-b-shared",
            source: "paper:b",
            target: "lit:shared",
            primary_role: "method",
          },
          {
            id: "e-a-single",
            source: "paper:a",
            target: "lit:single",
            primary_role: "background",
          },
        ],
      },
    };

    const defaultSnapshot = buildSynthesisUiSnapshot(
      input,
      createDefaultSynthesisUiState(),
    );
    const roleState = applySynthesisUiAction(createDefaultSynthesisUiState(), {
      action: "setGraphView",
      payload: { role: "background" },
    }).state;
    const roleSnapshot = buildSynthesisUiSnapshot(input, roleState);

    assert.deepEqual(
      defaultSnapshot.graph.visibleNodes.map((node) => node.id),
      ["paper:a", "paper:b", "lit:shared"],
    );
    assert.deepEqual(
      defaultSnapshot.graph.visibleEdges.map((edge) => edge.id),
      ["e-a-shared", "e-b-shared"],
    );
    assert.deepEqual(
      defaultSnapshot.graph.hoverOnlyNodes.map((node) => node.id),
      ["lit:single"],
    );
    assert.deepEqual(
      defaultSnapshot.graph.hoverOnlyEdges.map((edge) => edge.id),
      ["e-a-single"],
    );
    assert.deepEqual(
      roleSnapshot.graph.visibleNodes.map((node) => node.id),
      ["paper:a", "paper:b"],
    );
    assert.deepEqual(roleSnapshot.graph.visibleEdges, []);
    assert.deepEqual(
      roleSnapshot.graph.hoverOnlyNodes.map((node) => node.id),
      ["lit:shared", "lit:single"],
    );
    assert.sameMembers(
      roleSnapshot.graph.hoverOnlyEdges.map((edge) => edge.id),
      ["e-a-shared", "e-a-single"],
    );
    assert.sameMembers(
      defaultSnapshot.graph.nodes.map((node) => node.id),
      ["paper:a", "paper:b", "lit:shared", "lit:single", "lit:zero"],
    );
  });

  it("routes known host commands and rejects unknown actions", function () {
    const state = createDefaultSynthesisUiState();
    const known = applySynthesisUiAction(state, {
      action: "hostCommand",
      payload: {
        command: "openTopicArtifact",
        args: { topicId: "topic-a" },
      },
    });
    const oldFolderCommand = applySynthesisUiAction(state, {
      action: "hostCommand",
      payload: {
        command: "openSynthesisFolder",
        args: { topicId: "topic-a" },
      },
    });
    const unknown = applySynthesisUiAction(state, {
      action: "deleteEverything",
      payload: {},
    });

    assert.isTrue(known.handled);
    assert.deepEqual(known.hostCommand, {
      command: "openTopicArtifact",
      args: { topicId: "topic-a" },
    });
    assert.isFalse(oldFolderCommand.handled);
    assert.equal(oldFolderCommand.reason, "unknown_host_command");
    assert.isFalse(unknown.handled);
    assert.equal(unknown.reason, "unknown_action");
  });

  it("routes the Workbench rebuild graph host command", function () {
    const layoutResult = applySynthesisUiAction(
      createDefaultSynthesisUiState(),
      {
        action: "hostCommand",
        payload: {
          command: "manualRecomputeLayout",
          args: { reason: "user" },
        },
      },
    );
    const cacheResult = applySynthesisUiAction(
      createDefaultSynthesisUiState(),
      {
        action: "hostCommand",
        payload: {
          command: "rebuildCitationGraphCacheNow",
          args: { reason: "user" },
        },
      },
    );
    const incrementalResult = applySynthesisUiAction(
      createDefaultSynthesisUiState(),
      {
        action: "hostCommand",
        payload: {
          command: "refreshCitationGraphCacheIncrementalNow",
          args: { reason: "user" },
        },
      },
    );

    assert.isTrue(layoutResult.handled);
    assert.deepEqual(layoutResult.hostCommand, {
      command: "manualRecomputeLayout",
      args: { reason: "user" },
    });
    assert.isTrue(cacheResult.handled);
    assert.deepEqual(cacheResult.hostCommand, {
      command: "rebuildCitationGraphCacheNow",
      args: { reason: "user" },
    });
    assert.isTrue(incrementalResult.handled);
    assert.deepEqual(incrementalResult.hostCommand, {
      command: "refreshCitationGraphCacheIncrementalNow",
      args: { reason: "user" },
    });
  });

  it("wires graph layout recompute to the explicit layout operation", async function () {
    const tabSource = await fs.readFile(
      "src/modules/synthesisWorkbenchTab.ts",
      "utf8",
    );
    assert.include(tabSource, "recomputeCitationGraphLayout");
    assert.notInclude(tabSource, "runCitationGraphLayoutWorker");
    assert.include(tabSource, "refreshGraphLayoutIfNeeded");
    assert.include(tabSource, "return;\n  }\n  void sendActiveSurface");
    assert.notInclude(
      tabSource,
      ".rebuildCitationGraphProjection()\n      .finally",
    );
    assert.include(tabSource, "graphLayoutRefreshes");
    assert.include(tabSource, "event.source !== runtime.frameWindow");
  });

  it("omits absent graph slice filters and keeps local publications on the current graph owner", async function () {
    const host = await fs.readFile(
      "src/modules/synthesisWorkbenchTab.ts",
      "utf8",
    );
    const expandBlock = extractFunctionBlock(host, "expandGraphNeighborhood");
    const sendBlock = extractFunctionBlock(host, "performSurfaceSend");

    assert.include(expandBlock, '...(runtime.state.graph.topicId === "all"');
    assert.notInclude(
      expandBlock,
      "topicId:\n        runtime.state.graph.topicId",
    );
    assert.include(sendBlock, "currentSurfaceRequest");
    assert.include(sendBlock, "presentationOnly");
  });

  it("coordinates graph layout once and rejects stale or cross-frame state", async function () {
    const host = await fs.readFile(
      "src/modules/synthesisWorkbenchTab.ts",
      "utf8",
    );
    const refreshBlock = extractFunctionBlock(
      host,
      "refreshGraphLayoutIfNeeded",
    );
    const recomputeBlock = extractFunctionBlock(
      host,
      "recomputeWorkbenchCitationGraphLayout",
    );
    const observeBlock = extractFunctionBlock(
      host,
      "observeCurrentCitationGraphLayout",
    );
    const bridgeBlock = extractFunctionBlock(host, "attachWorkbenchBridge");
    const chromeBlock = extractFunctionBlock(host, "sendChrome");
    const progressBlock = extractFunctionBlock(
      host,
      "refreshWorkbenchCommandProgress",
    );

    assert.include(refreshBlock, 'status === "refreshing"');
    assert.include(refreshBlock, "observeCurrentCitationGraphLayout");
    assert.include(recomputeBlock, "graphLayoutRefreshes.get(key)");
    assert.include(
      recomputeBlock,
      "isSynthesisWorkbenchGraphApplicationBusyError",
    );
    assert.include(bridgeBlock, "event.source !== runtime.frameWindow");
    assert.include(chromeBlock, "readRevision !== runtime.chromeReadRevision");
    assert.include(
      progressBlock,
      "readRevision !== runtime.chromeReadRevision",
    );
    assert.include(observeBlock, "client.graph.getPersistedLayout");
    assert.notInclude(observeBlock, "sendSurface");
  });

  it("routes Citation Graph commands through the callback-free Graph client", async function () {
    const tabSource = await fs.readFile(
      "src/modules/synthesisWorkbenchTab.ts",
      "utf8",
    );
    const handleActionBlock = extractFunctionBlock(tabSource, "handleAction");
    const automaticLayoutBlock = extractFunctionBlock(
      tabSource,
      "refreshGraphLayoutIfNeeded",
    );
    const layoutMutationBlock = extractFunctionBlock(
      tabSource,
      "recomputeWorkbenchCitationGraphLayout",
    );
    const cacheCommandRegion = handleActionBlock.slice(
      handleActionBlock.indexOf(
        'result.hostCommand?.command === "rebuildCitationGraphCacheNow"',
      ),
      handleActionBlock.indexOf(
        'result.hostCommand?.command === "validateTagVocabulary"',
      ),
    );

    assert.match(
      handleActionBlock,
      /manualRecomputeLayout[\s\S]{0,500}recomputeWorkbenchCitationGraphLayout\([\s\S]{0,160}true/,
    );
    assert.include(
      layoutMutationBlock,
      "classifySynthesisWorkbenchGraphMutationResult",
    );
    assert.include(
      layoutMutationBlock,
      "createSynthesisWorkbenchGraphLayoutFailure",
    );
    assert.include(layoutMutationBlock, "refreshFromService: false");
    assert.match(
      layoutMutationBlock,
      /client\.graph\.recomputeCitationGraphLayout\(\{[\s\S]{0,160}force: true/,
    );
    for (const [command, method] of [
      ["rebuildCitationGraphCacheNow", "rebuildCitationGraphCacheNow"],
      [
        "refreshCitationGraphCacheIncrementalNow",
        "refreshCitationGraphCacheIncrementalNow",
      ],
      ["retryCitationGraphCacheRebuild", "retryCitationGraphCacheRebuild"],
    ]) {
      assert.match(
        handleActionBlock,
        new RegExp(
          `${command}[\\s\\S]{0,500}classifySynthesisWorkbenchGraphMutationResult\\([\\s\\S]{0,160}client\\.graph\\s*\\.${method}\\(\\)[\\s\\S]{0,180}deferStart: true`,
        ),
      );
    }
    assert.notInclude(cacheCommandRegion, "onProgress");
    assert.notInclude(cacheCommandRegion, "notifyWorkbenchCommandProgress");
    assert.include(
      automaticLayoutBlock,
      'sendSurface(runtime, "graph", { refreshFromService: true })',
    );
    assert.match(
      automaticLayoutBlock,
      /recomputeWorkbenchCitationGraphLayout\(/,
    );
    assert.include(automaticLayoutBlock, 'status === "ready"');
    assert.include(automaticLayoutBlock, 'status === "failed"');
    assert.include(automaticLayoutBlock, "!graph?.graph_hash");
    assert.include(automaticLayoutBlock, 'status === "refreshing"');
    assert.notInclude(automaticLayoutBlock, "force: true");
    assert.notInclude(automaticLayoutBlock, "getDefaultSynthesisService");
    assert.notMatch(
      tabSource,
      /getDefaultSynthesisService\(\)\.(?:recomputeCitationGraphLayout|rebuildCitationGraphCacheNow|refreshCitationGraphCacheIncrementalNow|retryCitationGraphCacheRebuild)/,
    );
  });

  it("routes Reference maintenance through the callback-free References client", async function () {
    const tabSource = await fs.readFile(
      "src/modules/synthesisWorkbenchTab.ts",
      "utf8",
    );
    const handleActionBlock = extractFunctionBlock(tabSource, "handleAction");
    const protectedBlock = extractFunctionBlock(
      tabSource,
      "isProtectedRebuildCommand",
    );
    const referenceRegion = handleActionBlock.slice(
      handleActionBlock.indexOf(
        'result.hostCommand?.command === "refreshReferenceSidecarNow"',
      ),
      handleActionBlock.indexOf(
        'result.hostCommand?.command === "applyCanonicalRevisionReviewAction"',
      ),
    );
    const retryRefreshRegion = referenceRegion.slice(
      referenceRegion.indexOf(
        'result.hostCommand?.command === "retryReferenceSidecarRefresh"',
      ),
      referenceRegion.indexOf(
        'result.hostCommand?.command === "runAdvancedReferenceMatchingNow"',
      ),
    );

    for (const [command, method] of [
      ["refreshReferenceSidecarNow", "refreshReferenceSidecarNow"],
      ["retryReferenceSidecarRefresh", "retryReferenceSidecarRefresh"],
      ["runAdvancedReferenceMatchingNow", "runAdvancedReferenceMatchingNow"],
      ["retryAdvancedReferenceMatching", "retryAdvancedReferenceMatching"],
    ]) {
      assert.match(
        referenceRegion,
        new RegExp(
          `${command}[\\s\\S]{0,420}client\\.references\\s*\\.${method}\\(\\)`,
        ),
      );
    }
    assert.include(referenceRegion, "observePublicMaintenanceOperation");
    assert.include(referenceRegion, ").then(failOnDiagnostic)");
    for (const command of [
      "refreshReferenceSidecarNow",
      "runAdvancedReferenceMatchingNow",
      "retryAdvancedReferenceMatching",
    ]) {
      assert.match(
        referenceRegion,
        new RegExp(`${command}[\\s\\S]{0,500}deferStart: true`),
      );
    }
    assert.notInclude(retryRefreshRegion, "deferStart");
    assert.notInclude(referenceRegion, "onProgress");
    assert.notInclude(referenceRegion, "notifyWorkbenchCommandProgress");
    assert.include(protectedBlock, 'command === "refreshReferenceSidecarNow"');
    assert.include(
      protectedBlock,
      'command === "runAdvancedReferenceMatchingNow"',
    );
    assert.notInclude(protectedBlock, "retryReferenceSidecarRefresh");
    assert.notInclude(protectedBlock, "retryAdvancedReferenceMatching");
    assert.notMatch(
      tabSource,
      /getDefaultSynthesisService\(\)\.(?:refreshReferenceSidecarNow|retryReferenceSidecarRefresh|runAdvancedReferenceMatchingNow|retryAdvancedReferenceMatching)/,
    );
  });

  it("routes Reference review actions through the strict References client", async function () {
    const tabSource = await fs.readFile(
      "src/modules/synthesisWorkbenchTab.ts",
      "utf8",
    );
    const handleActionBlock = extractFunctionBlock(tabSource, "handleAction");
    const reviewRegion = handleActionBlock.slice(
      handleActionBlock.indexOf(
        'result.hostCommand?.command === "applyCanonicalRevisionReviewAction"',
      ),
      handleActionBlock.indexOf(
        'result.hostCommand?.command === "mergeEffectiveCanonicalReference"',
      ),
    );
    const canonicalRegion = reviewRegion.slice(
      0,
      reviewRegion.indexOf(
        'result.hostCommand?.command === "applyReferenceMatchProposalActions"',
      ),
    );
    const batchRegion = reviewRegion.slice(
      reviewRegion.indexOf(
        'result.hostCommand?.command === "applyReferenceMatchProposalActions"',
      ),
      reviewRegion.indexOf(
        'result.hostCommand?.command === "applyReferenceMatchProposalAction"',
      ),
    );
    const singleRegion = reviewRegion.slice(
      reviewRegion.indexOf(
        'result.hostCommand?.command === "applyReferenceMatchProposalAction"',
      ),
    );

    for (const [command, method] of [
      [
        "applyCanonicalRevisionReviewAction",
        "applyCanonicalRevisionReviewAction",
      ],
      [
        "applyReferenceMatchProposalActions",
        "applyReferenceMatchProposalActions",
      ],
      [
        "applyReferenceMatchProposalAction",
        "applyReferenceMatchProposalAction",
      ],
    ]) {
      assert.match(
        reviewRegion,
        new RegExp(
          `${command}[\\s\\S]{0,1800}client\\.references\\s*\\.${method}\\(`,
        ),
      );
    }
    assert.include(canonicalRegion, "review_item_id");
    assert.include(batchRegion, "proposal_id");
    assert.include(batchRegion, "canonical_reference_id");
    assert.include(batchRegion, "library_id");
    assert.include(batchRegion, "item_key");
    assert.include(batchRegion, 'requestedAction === "manual_target"');
    assert.include(batchRegion, "if (!proposalId)");
    assert.include(batchRegion, "return normalizedTarget");
    assert.notInclude(singleRegion, "proposal_id");
    assert.match(canonicalRegion, /\.then\(failOnDiagnostic\)/);
    assert.match(batchRegion, /\.then\(failOnDiagnostic\)/);
    assert.match(singleRegion, /\.then\(failOnDiagnostic\)/);
    assert.match(
      batchRegion,
      /runWorkbenchCommandOnce\([\s\S]*?"applyReferenceMatchProposalActions",\s*\{\}/,
    );
    assert.notInclude(reviewRegion, "getDefaultSynthesisService");
    assert.notInclude(reviewRegion, "confirmWorkbenchAction");
    assert.notInclude(reviewRegion, "deferStart");
    assert.notInclude(reviewRegion, "onProgress");
    assert.notInclude(reviewRegion, "notifyWorkbenchCommandProgress");

    const diagnosticBlock = extractFunctionBlock(tabSource, "failOnDiagnostic");
    assert.include(diagnosticBlock, '"diagnostic" in result');
    assert.include(diagnosticBlock, ".diagnostic");
    assert.include(diagnosticBlock, '"ok" in result');
    assert.include(diagnosticBlock, "row.ok === false");
    assert.include(diagnosticBlock, '"diagnostics"');
    assert.include(diagnosticBlock, ".diagnostics");
    assert.include(diagnosticBlock, ".warnings");
    assert.include(diagnosticBlock, '"synthesis.maintenance_receipt.v1"');
    const maintenanceObserver = extractFunctionBlock(
      tabSource,
      "observePublicMaintenanceOperation",
    );
    assert.include(maintenanceObserver, "operation.operation_id");
    assert.include(maintenanceObserver, "failOnDiagnostic");

    const invalidationBlock = extractFunctionBlock(
      tabSource,
      "surfacesInvalidatedByCommand",
    );
    const reviewInvalidation = invalidationBlock.slice(
      invalidationBlock.indexOf(
        'command === "applyReferenceMatchProposalAction"',
      ),
      invalidationBlock.indexOf(
        'command === "updateCanonicalReferenceMetadata"',
      ),
    );
    assert.include(
      reviewInvalidation,
      'command === "applyReferenceMatchProposalActions"',
    );
    assert.include(
      reviewInvalidation,
      'command === "applyCanonicalRevisionReviewAction"',
    );
    assert.include(reviewInvalidation, 'return ["index", "review", "graph"]');
  });

  it("routes canonical Reference mutations through the strict References client", async function () {
    const tabSource = await fs.readFile(
      "src/modules/synthesisWorkbenchTab.ts",
      "utf8",
    );
    const handleActionBlock = extractFunctionBlock(tabSource, "handleAction");
    const mutationRegion = handleActionBlock.slice(
      handleActionBlock.indexOf(
        'result.hostCommand?.command === "mergeEffectiveCanonicalReference"',
      ),
      handleActionBlock.indexOf(
        'result.hostCommand?.command === "syncWebDavNow"',
      ),
    );
    const singleMergeRegion = mutationRegion.slice(
      0,
      mutationRegion.indexOf(
        'result.hostCommand?.command === "applyCanonicalRevisionMergeRequests"',
      ),
    );
    const batchMergeRegion = mutationRegion.slice(
      mutationRegion.indexOf(
        'result.hostCommand?.command === "applyCanonicalRevisionMergeRequests"',
      ),
      mutationRegion.indexOf(
        'result.hostCommand?.command === "updateCanonicalReferenceMetadata"',
      ),
    );
    const metadataRegion = mutationRegion.slice(
      mutationRegion.indexOf(
        'result.hostCommand?.command === "updateCanonicalReferenceMetadata"',
      ),
      mutationRegion.indexOf(
        'result.hostCommand?.command === "archiveCanonicalReference"',
      ),
    );
    const archiveRegion = mutationRegion.slice(
      mutationRegion.indexOf(
        'result.hostCommand?.command === "archiveCanonicalReference"',
      ),
    );

    for (const [command, method] of [
      ["mergeEffectiveCanonicalReference", "mergeEffectiveCanonicalReference"],
      [
        "applyCanonicalRevisionMergeRequests",
        "applyCanonicalRevisionMergeRequests",
      ],
      ["updateCanonicalReferenceMetadata", "updateCanonicalReferenceMetadata"],
      ["archiveCanonicalReference", "archiveCanonicalReference"],
    ]) {
      assert.match(
        mutationRegion,
        new RegExp(
          `${command}[\\s\\S]{0,2200}client\\.references\\s*\\.${method}\\(`,
        ),
      );
    }
    assert.include(singleMergeRegion, "source_effective_canonical_id");
    assert.include(singleMergeRegion, "target_effective_canonical_id");
    assert.include(
      singleMergeRegion,
      "Boolean(commandArgs.confirmRetargetGroup)",
    );
    assert.match(
      singleMergeRegion,
      /"mergeEffectiveCanonicalReference",\s*\{ sourceEffectiveCanonicalId, targetEffectiveCanonicalId \}/,
    );
    assert.include(batchMergeRegion, ".filter(");
    assert.include(batchMergeRegion, ".map(");
    assert.include(batchMergeRegion, "source_effective_canonical_id");
    assert.include(batchMergeRegion, "target_effective_canonical_id");
    assert.match(
      batchMergeRegion,
      /"applyCanonicalRevisionMergeRequests",\s*\{ count: requests\.length \}/,
    );
    assert.include(metadataRegion, "canonical_reference_id");
    assert.include(metadataRegion, "normalized_title");
    assert.include(metadataRegion, "normalizedTitle");
    assert.match(
      metadataRegion,
      /"updateCanonicalReferenceMetadata",\s*\{ canonicalReferenceId \}/,
    );
    assert.include(archiveRegion, "canonical_reference_id");
    assert.match(
      archiveRegion,
      /"archiveCanonicalReference",\s*\{ canonicalReferenceId \}/,
    );
    for (const region of [
      singleMergeRegion,
      batchMergeRegion,
      metadataRegion,
      archiveRegion,
    ]) {
      assert.match(region, /\.then\(failOnDiagnostic\)/);
      assert.include(region, "await getDefaultSynthesisClient()");
      assert.notInclude(region, "getDefaultSynthesisService");
      assert.notInclude(region, "confirmWorkbenchAction");
      assert.notInclude(region, "onProgress");
      assert.notInclude(region, "notifyWorkbenchCommandProgress");
    }
    assert.notInclude(singleMergeRegion, "deferStart");
    assert.include(batchMergeRegion, "deferStart: true");
    assert.notInclude(metadataRegion, "deferStart");
    assert.notInclude(archiveRegion, "deferStart");

    const diagnosticBlock = extractFunctionBlock(tabSource, "failOnDiagnostic");
    assert.include(diagnosticBlock, '"diagnostic" in result');
    assert.include(diagnosticBlock, '"diagnostics"');

    const invalidationBlock = extractFunctionBlock(
      tabSource,
      "surfacesInvalidatedByCommand",
    );
    const mergeInvalidation = invalidationBlock.slice(
      invalidationBlock.indexOf(
        'command === "mergeEffectiveCanonicalReference"',
      ) - 220,
      invalidationBlock.indexOf(
        'command === "updateCanonicalReferenceMetadata"',
      ),
    );
    assert.include(
      mergeInvalidation,
      'command === "applyCanonicalRevisionMergeRequests"',
    );
    assert.include(mergeInvalidation, 'return ["index", "review", "graph"]');
    const metadataInvalidation = invalidationBlock.slice(
      invalidationBlock.indexOf(
        'command === "updateCanonicalReferenceMetadata"',
      ),
      invalidationBlock.indexOf(
        'command === "refreshCitationGraphCacheIncrementalNow"',
      ),
    );
    assert.include(
      metadataInvalidation,
      'command === "archiveCanonicalReference"',
    );
    assert.include(metadataInvalidation, 'return ["index", "review"]');
  });

  it("routes all Workbench Sync commands through fresh bounded clients", async function () {
    const host = await fs.readFile(
      "src/modules/synthesisWorkbenchTab.ts",
      "utf8",
    );
    const handleAction = extractFunctionBlock(host, "handleAction");
    const syncRegion = handleAction.slice(
      handleAction.indexOf('result.hostCommand?.command === "syncWebDavNow"'),
      handleAction.indexOf(
        'result.hostCommand?.command === "exportTagVocabulary"',
      ),
    );
    const routes = [
      ["syncWebDavNow", "webDav", "runNow"],
      ["pauseWebDavSync", "webDav", "pause"],
      ["resumeWebDavSync", "webDav", "resume"],
      ["retryWebDavSync", "webDav", "retry"],
      ["resolveWebDavSyncConflict", "webDav", "resolveConflict"],
    ] as const;

    assert.notMatch(host, /synthesis\/service["']/);
    assert.notInclude(host, "getFreshSynthesisServiceForGitSyncCommand");
    for (const [command, transport, method] of routes) {
      const start = syncRegion.indexOf(
        `result.hostCommand?.command === "${command}"`,
      );
      assert.isAtLeast(start, 0, `${command} route should exist`);
      const laterStarts = routes
        .map(([next]) =>
          syncRegion.indexOf(
            `result.hostCommand?.command === "${next}"`,
            start + 1,
          ),
        )
        .filter((index) => index > start);
      const end = laterStarts.length
        ? Math.min(...laterStarts)
        : syncRegion.length;
      const commandRegion = syncRegion.slice(start, end);
      assert.include(commandRegion, "await getFreshDefaultSynthesisClient()");
      assert.match(
        commandRegion,
        new RegExp(`client\\.sync\\s*\\.${transport}\\s*\\.${method}`),
      );
      if (command !== "syncWebDavNow") {
        assert.notInclude(commandRegion, "deferStart");
      }
    }

    const webDavRunStart = syncRegion.indexOf(
      'result.hostCommand?.command === "syncWebDavNow"',
    );
    const webDavRunEnd = syncRegion.indexOf(
      'result.hostCommand?.command === "pauseWebDavSync"',
      webDavRunStart,
    );
    assert.include(
      syncRegion.slice(webDavRunStart, webDavRunEnd),
      "deferStart: true",
    );
    for (const command of ["syncWebDavNow", "retryWebDavSync"]) {
      const start = syncRegion.indexOf(`command === "${command}"`);
      assert.isAtLeast(start, 0);
      assert.include(
        syncRegion.slice(start, start + 700),
        "failOnSyncFailureState",
      );
    }
    assert.match(
      syncRegion,
      /String\(commandArgs\.action \|\| ""\)\.trim\(\) \|\|\s*"keep_local"/,
    );

    const syncCommandClassifier = extractFunctionBlock(
      host,
      "isSyncRuntimeCommand",
    );
    for (const [command] of routes) {
      assert.include(syncCommandClassifier, `command === "${command}"`);
    }
    const progressBlock = extractFunctionBlock(
      host,
      "refreshWorkbenchCommandProgress",
    );
    assert.include(progressBlock, "hasInFlightSyncCommand(runtime)");
    assert.include(progressBlock, "refreshFromService: true");
  });

  it("routes Concept commands through the strict Concepts client", async function () {
    const tabSource = await fs.readFile(
      "src/modules/synthesisWorkbenchTab.ts",
      "utf8",
    );
    const handleActionBlock = extractFunctionBlock(tabSource, "handleAction");
    const rebuildRegion = handleActionBlock.slice(
      handleActionBlock.indexOf(
        'result.hostCommand?.command === "rebuildConceptKbIndex"',
      ),
      handleActionBlock.indexOf(
        'result.hostCommand?.command === "rebuildTopicGraphIndex"',
      ),
    );
    const conceptRegion = handleActionBlock.slice(
      handleActionBlock.indexOf(
        'result.hostCommand?.command === "updateConceptDisplayText"',
      ),
      handleActionBlock.indexOf(
        'result.hostCommand?.command === "refreshReferenceSidecarNow"',
      ),
    );
    const displayRegion = conceptRegion.slice(
      0,
      conceptRegion.indexOf(
        'result.hostCommand?.command === "applyConceptReviewAction"',
      ),
    );
    const reviewRegion = conceptRegion.slice(
      conceptRegion.indexOf(
        'result.hostCommand?.command === "applyConceptReviewAction"',
      ),
      conceptRegion.indexOf(
        'result.hostCommand?.command === "deleteConceptEntry"',
      ),
    );
    const deleteRegion = conceptRegion.slice(
      conceptRegion.indexOf(
        'result.hostCommand?.command === "deleteConceptEntry"',
      ),
    );

    assert.match(
      rebuildRegion,
      /client\.concepts\s*\.rebuildConceptKbIndex\(\)/,
    );
    assert.include(rebuildRegion, "await getDefaultSynthesisClient()");
    assert.include(rebuildRegion, "deferStart: true");
    assert.notInclude(rebuildRegion, "onProgress");
    assert.notInclude(rebuildRegion, "notifyWorkbenchCommandProgress");
    assert.notInclude(rebuildRegion, "getDefaultSynthesisService");

    assert.match(
      displayRegion,
      /client\.concepts\s*\.updateConceptDisplayText\(/,
    );
    assert.include(displayRegion, 'String(commandArgs.conceptId || "").trim()');
    assert.include(displayRegion, "Object.keys(fields).length");
    assert.match(
      displayRegion,
      /"updateConceptDisplayText",\s*\{ conceptId \}/,
    );
    assert.notInclude(displayRegion, "failOnDiagnostic");

    assert.match(
      reviewRegion,
      /client\.concepts\s*\.applyConceptReviewAction\(/,
    );
    for (const action of ["approve_create", "merge_into_existing", "reject"]) {
      assert.include(reviewRegion, `action === "${action}"`);
    }
    assert.include(reviewRegion, "targetConceptId || undefined");
    assert.match(
      reviewRegion,
      /"applyConceptReviewAction",\s*\{ reviewId, action, targetConceptId \}/,
    );
    assert.match(reviewRegion, /\.then\(failOnDiagnostic\)/);

    assert.match(deleteRegion, /client\.concepts\s*\.deleteConceptEntries\(/);
    assert.include(deleteRegion, "commandArgs.conceptIds");
    assert.include(deleteRegion, "commandArgs.conceptId");
    assert.include(deleteRegion, ".filter(Boolean)");
    assert.match(
      deleteRegion,
      /"deleteConceptEntry",\s*\{ conceptId: conceptIds\[0\], conceptIds \}/,
    );
    assert.notInclude(deleteRegion, "failOnDiagnostic");

    for (const region of [displayRegion, reviewRegion, deleteRegion]) {
      assert.include(region, "await getDefaultSynthesisClient()");
      assert.notInclude(region, "getDefaultSynthesisService");
      assert.notInclude(region, "deferStart");
      assert.notInclude(region, "onProgress");
      assert.notInclude(region, "notifyWorkbenchCommandProgress");
    }

    const diagnosticBlock = extractFunctionBlock(tabSource, "failOnDiagnostic");
    assert.include(diagnosticBlock, '"diagnostic" in result');
    assert.include(diagnosticBlock, '"diagnostics"');

    const invalidationBlock = extractFunctionBlock(
      tabSource,
      "surfacesInvalidatedByCommand",
    );
    const conceptInvalidation = invalidationBlock.slice(
      invalidationBlock.indexOf('command === "rebuildConceptKbIndex"'),
      invalidationBlock.indexOf('command === "runSynthesizeTopic"'),
    );
    assert.include(conceptInvalidation, 'command === "deleteConceptEntry"');
    assert.include(
      conceptInvalidation,
      'command === "updateConceptDisplayText"',
    );
    assert.include(
      conceptInvalidation,
      'command === "applyConceptReviewAction"',
    );
    assert.include(conceptInvalidation, 'return ["concepts", "review"]');

    const protectedBlock = extractFunctionBlock(
      tabSource,
      "isProtectedRebuildCommand",
    );
    assert.include(protectedBlock, 'command === "rebuildConceptKbIndex"');
    const progressBlock = extractFunctionBlock(
      tabSource,
      "refreshWorkbenchCommandProgress",
    );
    assert.match(progressBlock, /client\.workbench\s*\.readProgress/);
  });

  it("routes Workbench artifact delete and purge host commands", function () {
    const deleteResult = applySynthesisUiAction(
      createDefaultSynthesisUiState(),
      {
        action: "hostCommand",
        payload: {
          command: "deleteTopicArtifact",
          args: { topicId: "topic-alpha" },
        },
      },
    );
    const purgeResult = applySynthesisUiAction(
      createDefaultSynthesisUiState(),
      {
        action: "hostCommand",
        payload: {
          command: "purgeDeletedTopicArtifacts",
          args: {},
        },
      },
    );

    assert.isTrue(deleteResult.handled);
    assert.deepEqual(deleteResult.hostCommand, {
      command: "deleteTopicArtifact",
      args: { topicId: "topic-alpha" },
    });
    assert.isTrue(purgeResult.handled);
    assert.deepEqual(purgeResult.hostCommand, {
      command: "purgeDeletedTopicArtifacts",
      args: {},
    });
  });

  it("routes Topic commands through the strict Topics client", async function () {
    const tabSource = await fs.readFile(
      "src/modules/synthesisWorkbenchTab.ts",
      "utf8",
    );
    const handleActionBlock = extractFunctionBlock(tabSource, "handleAction");
    const hintRegion = handleActionBlock.slice(
      handleActionBlock.indexOf(
        'result.hostCommand?.command === "rejectTopicDiscoveryHint"',
      ),
      handleActionBlock.indexOf(
        'result.hostCommand?.command === "updateConceptDisplayText"',
      ),
    );
    const deleteRegion = handleActionBlock.slice(
      handleActionBlock.indexOf(
        'result.hostCommand?.command === "deleteTopicArtifact"',
      ),
      handleActionBlock.indexOf(
        'result.hostCommand?.command === "purgeDeletedTopicArtifacts"',
      ),
    );
    const purgeRegion = handleActionBlock.slice(
      handleActionBlock.indexOf(
        'result.hostCommand?.command === "purgeDeletedTopicArtifacts"',
      ),
      handleActionBlock.indexOf("shouldRefreshGraphLayoutForAction"),
    );

    assert.include(hintRegion, 'String(commandArgs.hintId || "").trim()');
    assert.match(hintRegion, /client\.topics\s*\.rejectTopicDiscoveryHint\(/);
    assert.match(hintRegion, /client\.topics\s*\.restoreTopicDiscoveryHint\(/);
    assert.match(
      hintRegion,
      /runWorkbenchCommandOnce\(runtime, command, \{ hintId \}/,
    );
    assert.match(hintRegion, /\.then\(failOnDiagnostic\)/);
    assert.include(hintRegion, "refreshFromService: false");

    assert.include(deleteRegion, 'String(commandArgs.topicId || "").trim()');
    assert.include(deleteRegion, "synthesis-confirm-delete-topic-artifact");
    assert.match(deleteRegion, /client\.topics\s*\.deleteTopicArtifact\(/);
    assert.match(deleteRegion, /"deleteTopicArtifact",\s*\{ topicId \}/);
    assert.include(deleteRegion, "if (!deleteResult.ok)");
    assert.include(deleteRegion, "deleteResult.reason");

    assert.include(
      purgeRegion,
      "synthesis-confirm-purge-deleted-topic-artifacts",
    );
    assert.match(
      purgeRegion,
      /client\.topics\s*\.purgeDeletedTopicArtifacts\(\)/,
    );
    assert.match(purgeRegion, /"purgeDeletedTopicArtifacts",\s*\{\},/);

    for (const region of [hintRegion, deleteRegion, purgeRegion]) {
      assert.include(region, "await getDefaultSynthesisClient()");
      assert.notInclude(region, "getDefaultSynthesisService");
      assert.notInclude(region, "deferStart");
      assert.notInclude(region, "onProgress");
      assert.notInclude(region, "notifyWorkbenchCommandProgress");
    }

    const diagnosticBlock = extractFunctionBlock(tabSource, "failOnDiagnostic");
    assert.include(diagnosticBlock, '"diagnostic" in result');
    assert.include(diagnosticBlock, '"diagnostics"');
    const invalidationBlock = extractFunctionBlock(
      tabSource,
      "surfacesInvalidatedByCommand",
    );
    const artifactInvalidation = invalidationBlock.slice(
      invalidationBlock.indexOf('command === "deleteTopicArtifact"'),
    );
    assert.include(
      artifactInvalidation,
      'command === "purgeDeletedTopicArtifacts"',
    );
    assert.include(artifactInvalidation, 'return ["home", "topics"]');
    assert.notInclude(
      invalidationBlock,
      'command === "rejectTopicDiscoveryHint"',
    );
    assert.notInclude(
      invalidationBlock,
      'command === "restoreTopicDiscoveryHint"',
    );
  });

  it("routes Topic Graph commands through a distinct strict client", async function () {
    const tabSource = await fs.readFile(
      "src/modules/synthesisWorkbenchTab.ts",
      "utf8",
    );
    const uiModelSource = await fs.readFile(
      "src/modules/synthesis/uiModel.ts",
      "utf8",
    );
    const handleActionBlock = extractFunctionBlock(tabSource, "handleAction");
    const rebuildRegion = handleActionBlock.slice(
      handleActionBlock.indexOf(
        'result.hostCommand?.command === "rebuildTopicGraphIndex"',
      ),
      handleActionBlock.indexOf(
        'result.hostCommand?.command === "acceptTopicGraphRelation"',
      ),
    );
    const edgeRegion = handleActionBlock.slice(
      handleActionBlock.indexOf(
        'result.hostCommand?.command === "acceptTopicGraphRelation"',
      ),
      handleActionBlock.indexOf(
        'result.hostCommand?.command === "applyTopicGraphReviewAction"',
      ),
    );
    const reviewRegion = handleActionBlock.slice(
      handleActionBlock.indexOf(
        'result.hostCommand?.command === "applyTopicGraphReviewAction"',
      ),
      handleActionBlock.indexOf(
        'result.hostCommand?.command === "rejectTopicDiscoveryHint"',
      ),
    );

    assert.match(
      rebuildRegion,
      /client\.topicGraph\s*\.rebuildTopicGraphIndex\(\)/,
    );
    assert.include(rebuildRegion, "await getDefaultSynthesisClient()");
    assert.include(rebuildRegion, "deferStart: true");
    assert.notInclude(rebuildRegion, "onProgress");
    assert.notInclude(rebuildRegion, "notifyWorkbenchCommandProgress");
    assert.notInclude(rebuildRegion, "getDefaultSynthesisService");

    assert.include(edgeRegion, 'String(commandArgs.edgeId || "").trim()');
    assert.match(
      edgeRegion,
      /client\.topicGraph\s*\.acceptTopicGraphRelation\(/,
    );
    assert.match(
      edgeRegion,
      /client\.topicGraph\s*\.rejectTopicGraphRelation\(/,
    );
    assert.match(
      edgeRegion,
      /runWorkbenchCommandOnce\(runtime, command, \{ edgeId \}/,
    );
    assert.match(edgeRegion, /\.then\(failOnDiagnostic\)/);
    assert.include(edgeRegion, "refreshFromService: false");

    assert.include(reviewRegion, 'String(commandArgs.reviewId || "").trim()');
    assert.include(reviewRegion, '=== "approve_suggested"');
    assert.include(reviewRegion, '? "approve_suggested"');
    assert.include(reviewRegion, ': "reject"');
    assert.match(
      reviewRegion,
      /client\.topicGraph\s*\.applyTopicGraphReviewAction\(/,
    );
    assert.match(
      reviewRegion,
      /"applyTopicGraphReviewAction",\s*\{ reviewId, action \}/,
    );
    assert.match(reviewRegion, /\.then\(failOnDiagnostic\)/);
    assert.notInclude(reviewRegion, "if (reviewId)");

    for (const region of [edgeRegion, reviewRegion]) {
      assert.include(region, "await getDefaultSynthesisClient()");
      assert.notInclude(region, "getDefaultSynthesisService");
      assert.notInclude(region, "deferStart");
      assert.notInclude(region, "onProgress");
    }

    assert.include(uiModelSource, 'case "acceptTopicGraphRelation":');
    assert.include(uiModelSource, 'case "rejectTopicGraphRelation":');
    assert.include(
      uiModelSource,
      "`decideTopicGraphRelation:${keyPart(args.edgeId)}`",
    );
    const diagnosticBlock = extractFunctionBlock(tabSource, "failOnDiagnostic");
    assert.include(diagnosticBlock, '"diagnostic" in result');
    assert.include(diagnosticBlock, '"diagnostics"');
    const protectedBlock = extractFunctionBlock(
      tabSource,
      "isProtectedRebuildCommand",
    );
    assert.include(protectedBlock, 'command === "rebuildTopicGraphIndex"');
    const progressBlock = extractFunctionBlock(
      tabSource,
      "refreshWorkbenchCommandProgress",
    );
    assert.match(progressBlock, /client\.workbench\s*\.readProgress/);

    const invalidationBlock = extractFunctionBlock(
      tabSource,
      "surfacesInvalidatedByCommand",
    );
    const mutationInvalidation = invalidationBlock.slice(
      invalidationBlock.indexOf('command === "acceptTopicGraphRelation"'),
      invalidationBlock.indexOf('command === "deleteTopicArtifact"'),
    );
    assert.include(
      mutationInvalidation,
      'command === "rejectTopicGraphRelation"',
    );
    assert.include(
      mutationInvalidation,
      'command === "applyTopicGraphReviewAction"',
    );
    assert.include(
      mutationInvalidation,
      'return ["home", "topics", "graph", "review"]',
    );
    assert.notInclude(
      invalidationBlock,
      'command === "rebuildTopicGraphIndex"',
    );
  });

  it("routes Tag vocabulary maintenance and export through the Tag client", async function () {
    const tabSource = await fs.readFile(
      "src/modules/synthesisWorkbenchTab.ts",
      "utf8",
    );
    const handleActionBlock = extractFunctionBlock(tabSource, "handleAction");
    const validateRegion = handleActionBlock.slice(
      handleActionBlock.indexOf(
        'result.hostCommand?.command === "validateTagVocabulary"',
      ),
      handleActionBlock.indexOf(
        'result.hostCommand?.command === "rebuildTagVocabularyIndex"',
      ),
    );
    const rebuildRegion = handleActionBlock.slice(
      handleActionBlock.indexOf(
        'result.hostCommand?.command === "rebuildTagVocabularyIndex"',
      ),
      handleActionBlock.indexOf(
        'result.hostCommand?.command === "rebuildConceptKbIndex"',
      ),
    );
    const exportRegion = handleActionBlock.slice(
      handleActionBlock.indexOf(
        'result.hostCommand?.command === "exportTagVocabulary"',
      ),
      handleActionBlock.indexOf(
        'result.hostCommand?.command === "importTagVocabulary"',
      ),
    );

    assert.match(validateRegion, /client\.tags\s*\.validateTagVocabulary\(\)/);
    assert.match(
      validateRegion,
      /runWorkbenchCommandOnce\(\s*runtime,\s*"validateTagVocabulary",\s*\{\}/,
    );
    assert.notInclude(validateRegion, "deferStart");
    assert.notInclude(validateRegion, "failOnDiagnostic");

    assert.match(
      rebuildRegion,
      /client\.tags\s*\.rebuildTagVocabularyIndex\(\)/,
    );
    assert.match(rebuildRegion, /"rebuildTagVocabularyIndex",\s*\{\}/);
    assert.include(rebuildRegion, "deferStart: true");
    assert.notInclude(rebuildRegion, "onProgress");
    assert.notInclude(rebuildRegion, "notifyWorkbenchCommandProgress");

    assert.match(
      exportRegion,
      /client\.tags\s*\.exportTagVocabularyForRegulator\(\)/,
    );
    assert.match(
      exportRegion,
      /runWorkbenchCommandOnce\(runtime, "exportTagVocabulary", \{\}/,
    );
    assert.include(exportRegion, "runtime.hostWindow.navigator?.clipboard");
    assert.include(exportRegion, '`${allowedTags.join("\\n")}\\n`');
    assert.notInclude(exportRegion, "deferStart");
    assert.notInclude(exportRegion, "failOnDiagnostic");

    for (const region of [validateRegion, rebuildRegion, exportRegion]) {
      assert.include(region, "await getDefaultSynthesisClient()");
      assert.notInclude(region, "getDefaultSynthesisService");
    }

    const protectedBlock = extractFunctionBlock(
      tabSource,
      "isProtectedRebuildCommand",
    );
    assert.include(protectedBlock, 'command === "rebuildTagVocabularyIndex"');
    const invalidationBlock = extractFunctionBlock(
      tabSource,
      "surfacesInvalidatedByCommand",
    );
    const tagInvalidation = invalidationBlock.slice(
      invalidationBlock.indexOf('command === "rebuildTagVocabularyIndex"'),
      invalidationBlock.indexOf('command === "rebuildConceptKbIndex"'),
    );
    assert.include(tagInvalidation, 'return ["tags"]');
    assert.notInclude(invalidationBlock, 'command === "validateTagVocabulary"');
    assert.notInclude(invalidationBlock, 'command === "exportTagVocabulary"');
  });

  it("routes Tag import preview and apply through the strict Tag client", async function () {
    const tabSource = await fs.readFile(
      "src/modules/synthesisWorkbenchTab.ts",
      "utf8",
    );
    const handleActionBlock = extractFunctionBlock(tabSource, "handleAction");
    const previewRegion = handleActionBlock.slice(
      handleActionBlock.indexOf(
        'result.hostCommand?.command === "importTagVocabulary"',
      ),
      handleActionBlock.indexOf(
        'result.hostCommand?.command === "updateStagedTagSuggestion"',
      ),
    );
    const applyRegion = handleActionBlock.slice(
      handleActionBlock.indexOf(
        'result.hostCommand?.command === "applyTagVocabularyImport"',
      ),
      handleActionBlock.indexOf(
        'result.hostCommand?.command === "openTopicArtifact"',
      ),
    );

    assert.include(
      previewRegion,
      'result.hostCommand?.command === "previewTagVocabularyImport"',
    );
    assert.include(
      previewRegion,
      'typeof commandArgs.payload === "string" && commandArgs.payload.trim()',
    );
    assert.match(
      previewRegion,
      /"previewTagVocabularyImport",\s*\{\},\s*async \(\) =>/,
    );
    assert.match(
      previewRegion,
      /client\.tags\s*\.previewTagVocabularyImport\(\{\s*payload: commandArgs\.payload(?: as string)?,?\s*\}\)/,
    );

    assert.include(
      applyRegion,
      'const action = String(commandArgs.action || "").trim()',
    );
    assert.include(applyRegion, 'action === "use-imported"');
    assert.include(applyRegion, 'action === "merge-non-conflicting"');
    assert.match(applyRegion, /"applyTagVocabularyImport",\s*\{ action \}/);
    assert.match(
      applyRegion,
      /client\.tags\s*\.applyTagVocabularyImport\(\{\s*payload: commandArgs\.payload(?: as string)?,\s*action,?\s*\}\)/,
    );

    for (const region of [previewRegion, applyRegion]) {
      assert.include(region, "await getDefaultSynthesisClient()");
      assert.notInclude(region, "getDefaultSynthesisService");
      assert.include(
        region,
        "sendActiveSurface(runtime, { refreshFromService: false })",
      );
      assert.notInclude(region, "deferStart");
      assert.notInclude(region, "onProgress");
      assert.notInclude(region, "failOnDiagnostic");
    }

    const invalidationBlock = extractFunctionBlock(
      tabSource,
      "surfacesInvalidatedByCommand",
    );
    const tagInvalidation = invalidationBlock.slice(
      invalidationBlock.indexOf('command === "rebuildTagVocabularyIndex"'),
      invalidationBlock.indexOf('command === "rebuildConceptKbIndex"'),
    );
    assert.include(tagInvalidation, 'command === "previewTagVocabularyImport"');
    assert.include(tagInvalidation, 'command === "applyTagVocabularyImport"');
    assert.include(tagInvalidation, 'return ["tags"]');
  });

  it("routes staged Tag bulk commands through the strict Tag client", async function () {
    const tabSource = await fs.readFile(
      "src/modules/synthesisWorkbenchTab.ts",
      "utf8",
    );
    const handleActionBlock = extractFunctionBlock(tabSource, "handleAction");
    const promoteRegion = handleActionBlock.slice(
      handleActionBlock.indexOf(
        'result.hostCommand?.command === "promoteStagedTagSuggestions"',
      ),
      handleActionBlock.indexOf(
        'result.hostCommand?.command === "discardStagedTagSuggestions"',
      ),
    );
    const discardRegion = handleActionBlock.slice(
      handleActionBlock.indexOf(
        'result.hostCommand?.command === "discardStagedTagSuggestions"',
      ),
      handleActionBlock.indexOf(
        'result.hostCommand?.command === "clearStagedTagSuggestions"',
      ),
    );
    const clearRegion = handleActionBlock.slice(
      handleActionBlock.indexOf(
        'result.hostCommand?.command === "clearStagedTagSuggestions"',
      ),
      handleActionBlock.indexOf(
        'result.hostCommand?.command === "applyTagVocabularyImport"',
      ),
    );

    for (const [region, method] of [
      [promoteRegion, "promoteStagedTagSuggestions"],
      [discardRegion, "discardStagedTagSuggestions"],
    ]) {
      assert.include(region, "Array.isArray(commandArgs.tags)");
      assert.include(
        region,
        'commandArgs.tags.map((tag) => String(tag || "").trim()).filter(Boolean)',
      );
      assert.include(
        region,
        '[String(commandArgs.tag || "").trim()].filter(Boolean)',
      );
      assert.include(region, "if (tags.length)");
      assert.include(region, "{ tag: tags[0], tags }");
      assert.match(
        region,
        new RegExp(`client\\.tags\\s*\\.${method}\\(\\{ tags \\}\\)`),
      );
      assert.include(region, "await getDefaultSynthesisClient()");
      assert.include(
        region,
        "sendActiveSurface(runtime, { refreshFromService: false })",
      );
    }

    assert.match(clearRegion, /client\.tags\s*\.clearStagedTagSuggestions\(\)/);
    assert.match(
      clearRegion,
      /runWorkbenchCommandOnce\(\s*runtime,\s*"clearStagedTagSuggestions",\s*\{\}/,
    );
    assert.include(clearRegion, "await getDefaultSynthesisClient()");

    for (const region of [promoteRegion, discardRegion, clearRegion]) {
      assert.notInclude(region, "getDefaultSynthesisService");
      assert.notInclude(region, "deferStart");
      assert.notInclude(region, "onProgress");
      assert.notInclude(region, "failOnDiagnostic");
    }

    const invalidationBlock = extractFunctionBlock(
      tabSource,
      "surfacesInvalidatedByCommand",
    );
    const tagInvalidation = invalidationBlock.slice(
      invalidationBlock.indexOf('command === "rebuildTagVocabularyIndex"'),
      invalidationBlock.indexOf('command === "rebuildConceptKbIndex"'),
    );
    for (const command of [
      "promoteStagedTagSuggestions",
      "discardStagedTagSuggestions",
      "clearStagedTagSuggestions",
    ]) {
      assert.include(tagInvalidation, `command === "${command}"`);
    }
    assert.include(tagInvalidation, 'return ["tags"]');
  });

  it("routes staged Tag updates through the strict atomic Tag client command", async function () {
    const tabSource = await fs.readFile(
      "src/modules/synthesisWorkbenchTab.ts",
      "utf8",
    );
    const handleActionBlock = extractFunctionBlock(tabSource, "handleAction");
    const updateRegion = handleActionBlock.slice(
      handleActionBlock.indexOf(
        'result.hostCommand?.command === "updateStagedTagSuggestion"',
      ),
      handleActionBlock.indexOf(
        'result.hostCommand?.command === "updateTagVocabularyEntry"',
      ),
    );

    assert.include(
      updateRegion,
      'commandArgs.originalTag || commandArgs.tag || ""',
    );
    assert.include(updateRegion, 'String(commandArgs.tag || "").trim()');
    assert.include(
      updateRegion,
      'commandArgs.facet || tag.split(":")[0] || "topic"',
    );
    assert.include(updateRegion, 'const note = String(commandArgs.note || "")');
    assert.include(
      updateRegion,
      'commandArgs.source_flow || "tag-regulator-suggest"',
    );
    assert.include(updateRegion, "Array.isArray(commandArgs.parent_bindings)");
    assert.match(
      updateRegion,
      /runWorkbenchCommandOnce\(\s*runtime,\s*"updateStagedTagSuggestion",\s*\{ tag \}/,
    );
    assert.match(
      updateRegion,
      /client\.tags\s*\.updateStagedTagSuggestion\(\{[\s\S]*originalTag,[\s\S]*tag,[\s\S]*facet,[\s\S]*note,[\s\S]*sourceFlow,[\s\S]*parentBindings/,
    );
    assert.include(updateRegion, "await getDefaultSynthesisClient()");
    assert.include(
      updateRegion,
      "sendActiveSurface(runtime, { refreshFromService: false })",
    );
    assert.notInclude(updateRegion, "getDefaultSynthesisService");
    assert.notInclude(updateRegion, "stageTagSuggestions");
    assert.notInclude(updateRegion, "discardStagedTagSuggestions");
    assert.notInclude(updateRegion, "deferStart");
    assert.notInclude(updateRegion, "onProgress");
    assert.notInclude(updateRegion, "failOnDiagnostic");
    assert.notInclude(updateRegion, "confirm");

    const invalidationBlock = extractFunctionBlock(
      tabSource,
      "surfacesInvalidatedByCommand",
    );
    const tagInvalidation = invalidationBlock.slice(
      invalidationBlock.indexOf('command === "rebuildTagVocabularyIndex"'),
      invalidationBlock.indexOf('command === "rebuildConceptKbIndex"'),
    );
    assert.include(tagInvalidation, 'command === "updateStagedTagSuggestion"');
    assert.include(tagInvalidation, 'return ["tags"]');
  });

  it("routes Tag Vocabulary entry mutations through strict atomic Tag client commands", async function () {
    const tabSource = await fs.readFile(
      "src/modules/synthesisWorkbenchTab.ts",
      "utf8",
    );
    const handleActionBlock = extractFunctionBlock(tabSource, "handleAction");
    const updateRegion = handleActionBlock.slice(
      handleActionBlock.indexOf(
        'result.hostCommand?.command === "updateTagVocabularyEntry"',
      ),
      handleActionBlock.indexOf(
        'result.hostCommand?.command === "deleteTagVocabularyEntry"',
      ),
    );
    const deleteRegion = handleActionBlock.slice(
      handleActionBlock.indexOf(
        'result.hostCommand?.command === "deleteTagVocabularyEntry"',
      ),
      handleActionBlock.indexOf(
        'result.hostCommand?.command === "promoteStagedTagSuggestions"',
      ),
    );

    assert.include(
      updateRegion,
      'commandArgs.originalTag || commandArgs.tag || ""',
    );
    assert.include(updateRegion, 'String(commandArgs.tag || "").trim()');
    assert.include(
      updateRegion,
      'commandArgs.facet || tag.split(":")[0] || "topic"',
    );
    assert.include(updateRegion, 'const note = String(commandArgs.note || "")');
    assert.match(
      updateRegion,
      /runWorkbenchCommandOnce\(\s*runtime,\s*"updateTagVocabularyEntry",\s*\{ originalTag \}/,
    );
    assert.match(
      updateRegion,
      /client\.tags\s*\.updateTagVocabularyEntry\(\{[\s\S]*originalTag,[\s\S]*tag,[\s\S]*facet,[\s\S]*note/,
    );
    assert.include(updateRegion, ".then(failOnDiagnostic)");

    assert.include(
      deleteRegion,
      'commandArgs.originalTag || commandArgs.tag || ""',
    );
    assert.match(
      deleteRegion,
      /runWorkbenchCommandOnce\(\s*runtime,\s*"deleteTagVocabularyEntry",\s*\{ originalTag \}/,
    );
    assert.match(
      deleteRegion,
      /client\.tags\s*\.deleteTagVocabularyEntry\(\{ originalTag \}\)/,
    );
    assert.include(deleteRegion, ".then(failOnDiagnostic)");

    for (const region of [updateRegion, deleteRegion]) {
      assert.include(region, "await getDefaultSynthesisClient()");
      assert.include(
        region,
        "sendActiveSurface(runtime, { refreshFromService: false })",
      );
      assert.notInclude(region, "getDefaultSynthesisService");
      assert.notInclude(region, "loadTagVocabulary");
      assert.notInclude(region, "saveTagVocabulary");
      assert.notInclude(region, "deferStart");
      assert.notInclude(region, "onProgress");
      assert.notInclude(region, "confirm");
    }

    const invalidationBlock = extractFunctionBlock(
      tabSource,
      "surfacesInvalidatedByCommand",
    );
    const tagInvalidation = invalidationBlock.slice(
      invalidationBlock.indexOf('command === "rebuildTagVocabularyIndex"'),
      invalidationBlock.indexOf('command === "rebuildConceptKbIndex"'),
    );
    assert.include(tagInvalidation, 'command === "updateTagVocabularyEntry"');
    assert.include(tagInvalidation, 'command === "deleteTagVocabularyEntry"');
    assert.include(tagInvalidation, 'return ["tags"]');
  });

  it("wires the Workbench run synthesis host command to workflow execution", async function () {
    const source = await fs.readFile(
      "src/modules/synthesisWorkbenchTab.ts",
      "utf8",
    );

    assert.include(source, "runCreateTopicSynthesisFromWorkbench");
    assert.include(source, "executeWorkflowFromCurrentSelection");
    assert.include(source, 'entry.manifest.id === "create-topic-synthesis"');
    assert.include(source, "requireSettingsGate: true");
    assert.notInclude(source, "promptTopicSeed");
    assert.notInclude(source, "promptSynthesisMode");
  });

  it("hosts the Workbench in a singleton Zotero tab instead of a dialog", async function () {
    const source = await fs.readFile(
      "src/modules/synthesisWorkbenchTab.ts",
      "utf8",
    );
    const dialogCompat = await fs.readFile(
      "src/modules/synthesisWorkbenchDialog.ts",
      "utf8",
    );
    const hooks = await fs.readFile("src/hooks.ts", "utf8");
    const sidebar = await fs.readFile(
      "src/modules/assistantWorkspaceSidebar.ts",
      "utf8",
    );

    assert.include(source, "Zotero_Tabs.add");
    assert.include(source, 'type: "synthesis-workbench"');
    assert.include(source, "SYNTHESIS_WORKBENCH_TAB_ICON");
    assert.include(source, "icon: SYNTHESIS_WORKBENCH_TAB_ICON");
    assert.include(source, "createXULElement");
    assert.include(source, "__zoteroSkillsSynthesisWorkbenchBridge");
    assert.include(source, "scheduleWorkbenchHandshake");
    assert.include(
      source,
      "SYNTHESIS_WORKBENCH_HANDSHAKE_REQUIRED_SUCCESSES = 5",
    );
    assert.include(source, "finalizeWorkbenchHandshake");
    assert.include(
      source,
      'sendSnapshot(runtime, "synthesis:init", { refreshFromService: false })',
    );
    assert.include(source, "contentDocument");
    assert.include(source, "Zotero_Tabs.select");
    assert.include(source, "cleanupSynthesisWorkbenchTab");
    assert.notInclude(source, "new ztoolkit.Dialog");
    assert.notInclude(dialogCompat, "new ztoolkit.Dialog");
    assert.include(hooks, 'initialView: "synthesis"');
    assert.notInclude(hooks, "openSynthesisWorkbenchTab");
    assert.notInclude(sidebar, "openSynthesisWorkbenchTab");
  });

  it("opens structured Topic Detail inside the Workbench and exports report body from the Report tab", async function () {
    const source = await fs.readFile(
      "src/modules/synthesisWorkbenchTab.ts",
      "utf8",
    );

    assert.include(source, 'command === "openTopicArtifact"');
    assert.include(source, 'command === "exportTopicSynthesisReport"');
    assert.include(source, 'command === "exportTopicDetailHtml"');
    assert.include(source, 'command === "openZoteroItem"');
    assert.notInclude(source, 'command === "openCanonicalMarkdown"');
    assert.notInclude(source, 'command === "copyTopicMarkdownExport"');
    assert.include(source, 'command === "resolveTopicPaperDigest"');
    assert.notInclude(source, 'command === "openSynthesisFolder"');
    assert.include(source, 'command === "deleteTopicArtifact"');
    assert.include(source, 'command === "purgeDeletedTopicArtifacts"');
    assert.include(source, "confirmWorkbenchAction");
    assert.include(source, "client.workbench.readTopicDetail");

    const reportExportBlock = extractFunctionBlock(
      source,
      "exportTopicSynthesisReport",
    );
    assert.include(reportExportBlock, "getDefaultSynthesisClient");
    assert.include(reportExportBlock, "client.topics.getTopicReport");
    assert.notInclude(reportExportBlock, "getDefaultSynthesisService");
    const topicGuardIndex = reportExportBlock.indexOf("if (!topicId)");
    const clientIndex = reportExportBlock.indexOf("getDefaultSynthesisClient");
    const markdownIndex = reportExportBlock.indexOf("cleanReportExportString");
    const pickerIndex = reportExportBlock.indexOf("pickTopicReportExportPath");
    const writeIndex = reportExportBlock.indexOf("writeRuntimeTextFile");
    assert.isAtLeast(topicGuardIndex, 0);
    assert.isAbove(clientIndex, topicGuardIndex);
    assert.isAbove(markdownIndex, clientIndex);
    assert.isAbove(pickerIndex, markdownIndex);
    assert.isAbove(writeIndex, pickerIndex);
    assert.include(reportExportBlock, "Synthesis report body is unavailable.");
    assert.include(reportExportBlock, 'markdown.endsWith("\\n")');

    assert.include(source, "buildTopicDetailHtmlExport");
    assert.include(source, "resolveTopicExportDigests");
    assert.include(source, "readSynthesisExportAssets");
    assert.include(source, "pruneGraphToTopicSubgraph");
    assert.include(source, "graphLayoutAlgorithms");
    assert.include(source, "graphLayouts");
    assert.include(source, "content/shared/icons.css");
    assert.include(source, "content/shared/topicTimeline.css");
    assert.notInclude(source, "content/shared/markdown-renderer.css");
    assert.include(source, "inlineMaterialSymbolIconUrls");
    assert.include(source, "data:image/svg+xml");
    assert.include(source, "content/synthesis/topic-export.bundle.js");
    assert.include(source, "content/synthesis/styles.css");
    assert.include(source, "resolveRuntimeToolkit");
    assert.include(source, "FilePicker");
    assert.include(source, "writeRuntimeTextFile");
    assert.include(source, "sendTopicDetail");
    assert.include(source, '"synthesis:topic-detail"');
    assert.include(source, "citationGraphItemKeyFromNodeId");
    assert.include(source, "openZoteroItemFromCitationGraphNode");
    assert.include(source, "getByLibraryAndKey");
    assert.include(source, "selectItem(itemId)");
    assert.notInclude(source, '"synthesis:artifact"');
    assert.notInclude(
      source,
      "openPathInSystem(artifact.paths.currentMarkdown",
    );

    const exportTopicHtmlBlock = extractFunctionBlock(
      source,
      "exportTopicDetailHtml",
    );
    assert.include(exportTopicHtmlBlock, "writeRuntimeTextFile");
    assert.include(exportTopicHtmlBlock, "buildTopicDetailHtmlExport");
    assert.notInclude(exportTopicHtmlBlock, "copyRuntimeFile");

    const exportPickerIndex = source.indexOf(
      "const outputPath = await pickTopicDetailHtmlExportPath",
    );
    const exportRunIndex = source.indexOf(
      'runWorkbenchCommandOnce(\n        runtime,\n        "exportTopicDetailHtml"',
    );
    assert.isAtLeast(exportPickerIndex, 0);
    assert.isAtLeast(exportRunIndex, 0);
    assert.isBelow(
      exportPickerIndex,
      exportRunIndex,
      "standalone HTML export should ask for the save path before entering the pending operation",
    );
    assert.include(
      source,
      "() => exportTopicDetailHtml(runtime, topicId, outputPath)",
    );
    assert.notInclude(source, "{ topicId, outputPath }");
  });
  it("hides Git Sync from Preferences while keeping WebDAV preferences visible", async function () {
    const preferences = await fs.readFile(
      "addon/content/preferences.xhtml",
      "utf8",
    );
    const script = await fs.readFile("src/modules/preferenceScript.ts", "utf8");

    assert.notInclude(preferences, "git-sync-enabled");
    assert.notInclude(preferences, "git-sync-token");
    assert.notInclude(preferences, "pref-section-git-sync");
    assert.notInclude(script, "git-sync-enabled");
    assert.notInclude(script, "saveGitSyncPrefs");
    assert.notInclude(script, "testGitSyncConfiguration");
    assert.include(preferences, "webdav-sync-enabled");
    assert.include(script, "saveWebDavSyncPrefs");
    assert.include(script, "testWebDavSyncConfiguration");
  });

  it("wires structured Topic Detail update through the update-topic-synthesis workflow", async function () {
    const source = await fs.readFile(
      "src/modules/synthesisWorkbenchTab.ts",
      "utf8",
    );
    const uiModel = await fs.readFile(
      "src/modules/synthesis/uiModel.ts",
      "utf8",
    );

    assert.include(uiModel, '"submitTopicSynthesisUpdate"');
    assert.include(source, "findUpdateTopicSynthesisWorkflow");
    assert.include(source, 'entry.manifest.id === "update-topic-synthesis"');
    assert.include(source, 'command === "submitTopicSynthesisUpdate"');
    assert.include(source, "runUpdateTopicSynthesisFromWorkbench");
    assert.include(source, "settingsGateInitialOptions");
    assert.include(source, "Topic does not need update");
    assert.notInclude(source, 'updateMode: "update_full"');
    assert.notInclude(source, 'updateScope: "refresh"');
    assert.include(
      source,
      "Cannot update synthesis: update-topic-synthesis workflow is not loaded",
    );
  });
  it("adds a unified Zotero tab workspace entry for Dashboard and Synthesis", async function () {
    const host = await fs.readFile("src/modules/workspaceTab.ts", "utf8");
    const hooks = await fs.readFile("src/hooks.ts", "utf8");
    const app = await fs.readFile("src/workspaceApp.ts", "utf8");
    const index = await fs.readFile(
      "addon/content/workspace/index.html",
      "utf8",
    );
    const css = await fs.readFile("addon/content/workspace/styles.css", "utf8");
    const zoteroPaneCss = await fs.readFile(
      "addon/content/zoteroPane.css",
      "utf8",
    );
    const dashboardHomeRegion = await fs.readFile(
      "src/dashboard/components/HomeRegion.tsx",
      "utf8",
    );
    const dashboardCss = await fs.readFile(
      "addon/content/dashboard/styles.css",
      "utf8",
    );
    const config = await fs.readFile("zotero-plugin.config.ts", "utf8");

    assert.include(host, "Zotero_Tabs.add");
    assert.include(host, 'type: "zotero-skills-workspace"');
    assert.include(host, "WORKSPACE_TAB_ICON");
    assert.include(host, "icon: WORKSPACE_TAB_ICON");
    assert.include(host, "WORKSPACE_TAB_ICON_URI");
    assert.include(host, "icon_workbench_32.png");
    assert.include(hooks, "registerZoteroPaneStylesheet");
    assert.include(hooks, "content/zoteroPane.css");
    assert.include(hooks, "loadAndRegisterSheet");
    assert.include(hooks, "unregisterZoteroPaneStylesheet");
    assert.include(host, "mountTaskDashboardRuntime");
    assert.include(host, "mountSynthesisWorkbenchRuntime");
    assert.include(host, "openAssistantWorkspaceSidebar");
    assert.include(host, "closeAssistantWorkspaceSidebar");
    assert.include(host, "toggleAssistantWorkspaceSidebar");
    assert.include(host, 'action === "toggle-sidebar"');
    assert.include(host, "syncWorkspaceTabSelectionState");
    assert.include(host, "scheduleWorkspaceTabSelectionStateSync");
    assert.include(host, "WORKSPACE_TAB_SELECTION_RESTORE_DELAY_MS");
    assert.include(host, "shouldRestoreSidebar");
    assert.include(host, 'target: "reader"');
    assert.include(host, "onSelect");
    assert.include(host, "isAssistantWorkspaceSidebarOpen");
    assert.include(host, "sidebarOpen");
    assert.notInclude(host, "openTaskManagerDialog");
    assert.notInclude(host, "import { openSynthesisWorkbenchTab");
    assert.include(host, "dashboard-mount-ready");
    assert.include(host, "synthesis-mount-ready");
    assert.include(host, "scheduleWorkspaceHandshake");
    assert.include(host, "await mountDashboardRuntimeIfReady(runtime)");
    assert.include(host, "await mountSynthesisRuntimeIfReady(runtime)");
    assert.include(app, "Dashboard");
    assert.include(app, "Synthesis");
    assert.include(app, "ZoteroSkillsTheme");
    assert.include(app, "theme-switch");
    assert.include(app, "function updateThemeSwitchState()");
    assert.include(app, "node.dataset.theme = theme");
    assert.include(app, "updateThemeSwitchState();");
    assert.notInclude(
      app,
      "function setThemeChoice(theme: WorkspaceTheme) {\n  state.theme = window.ZoteroSkillsTheme?.setTheme?.(theme) || theme;\n  render();\n}",
    );
    assert.include(app, "System");
    assert.include(app, "Light");
    assert.include(app, "Dark");
    assert.include(app, "segmented");
    assert.include(app, "workspace-view-switch");
    assert.include(app, "segmented-thumb");
    assert.include(app, "toggle-sidebar");
    assert.include(app, "iconButton");
    assert.include(app, "refresh-toggle");
    assert.include(app, "refresh-icon");
    assert.include(app, "zs-icon-refresh");
    assert.include(app, "sidebar-toggle");
    assert.include(app, "zs-icon-right-panel-open");
    assert.include(app, "zs-icon-right-panel-close");
    assert.include(app, "workspace:attention");
    assert.include(app, "updateWorkspaceSidebarAttention");
    assert.include(app, "data-attention-count");
    const workspaceHeaderBlock = extractFunctionBlock(app, "renderHeader");
    assert.isBelow(
      workspaceHeaderBlock.indexOf("refresh-toggle"),
      workspaceHeaderBlock.indexOf("sidebar-toggle"),
    );
    assert.notInclude(app, 'button("Preferences", "open-preferences")');
    assert.notInclude(app, '"open-preferences"');
    assert.include(app, "sidebarOpen?: boolean");
    assert.include(app, "payload.sidebarOpen === true");
    assert.include(app, "openSidebar");
    assert.include(app, "closeSidebar");
    assert.notInclude(app, "Show Sidebar");
    assert.notInclude(app, "Hide Sidebar");
    assert.include(app, "dashboard-mount");
    assert.include(app, "synthesis-mount");
    assert.include(app, "workspace-view-mount");
    assert.include(app, "updateWorkspaceVisibility");
    assert.include(app, "is-dashboard");
    assert.include(app, "is-synthesis");
    assert.notInclude(app, "Open Dashboard");
    assert.notInclude(app, "Open Synthesis");
    assert.notInclude(app, "open-synthesis");
    assert.notInclude(app, "assistant-frame");
    assert.include(css, ".dashboard-mount");
    assert.include(css, ".synthesis-mount");
    assert.include(css, ".theme-switch");
    assert.include(css, ".workspace-view-switch");
    assert.include(css, ".workspace-view-switch .segmented-thumb");
    assert.include(css, ".workspace-view-switch.is-synthesis .segmented-thumb");
    assert.include(zoteroPaneCss, ".icon-css.icon-zotero-skills-workspace");
    assert.include(
      zoteroPaneCss,
      '.icon-css.icon-item-type[data-item-type="zotero-skills-workspace"]',
    );
    assert.include(
      zoteroPaneCss,
      '.tab-icon.icon-item-type[data-item-type="zotero-skills-workspace"]',
    );
    assert.include(zoteroPaneCss, "icons/icon_workbench_32.png");
    assert.include(zoteroPaneCss, "display: inline-block");
    assert.include(zoteroPaneCss, "min-width: 16px");
    assert.include(zoteroPaneCss, "-moz-context-properties: unset");
    assert.include(zoteroPaneCss, "mask-image: none");
    assert.include(css, "transform: translateX(100%)");
    assert.include(css, "transition:");
    assert.include(index, "../shared/theme.js");
    assert.include(index, "../shared/theme.css?ui=20260520-controls-v7");
    assert.include(index, "../shared/icons.css?ui=20260614-icons-v1");
    assert.include(index, "./styles.css?ui=20260520-controls-v7");
    assert.include(css, ".toolbar .icon-button");
    assert.include(css, "appearance: none");
    assert.include(css, "-moz-appearance: none");
    assert.include(css, "--workspace-control-bg");
    assert.include(css, "--workspace-control-bg: #dbeafe");
    assert.include(dashboardHomeRegion, '<td class="center-cell">');
    assert.include(
      dashboardHomeRegion,
      "<span class={row.statusClass}>{row.statusText}</span>",
    );
    assert.include(
      dashboardHomeRegion,
      '<td class="center-cell">{row.updatedAtText}</td>',
    );
    assert.include(dashboardCss, "td.center-cell");
    assert.include(css, "background: var(--workspace-control-bg)");
    assert.include(css, "box-shadow: var(--workspace-control-shadow)");
    assert.include(css, ".toolbar-icon");
    assert.notInclude(css, ".refresh-icon::before");
    assert.notInclude(css, ".sidebar-icon::before");
    assert.include(css, ".workspace-panel.is-dashboard");
    assert.include(css, ".workspace-panel.is-synthesis");
    assert.include(css, ".workspace-view-mount.is-active");
    assert.include(css, "visibility: hidden");
    assert.include(css, "grid-template-rows: minmax(0, 1fr)");
    assert.include(index, "workspace-root");
    assert.include(config, "src/workspaceApp.ts");
    assert.include(config, "addon/content/workspace/app.bundle.js");
  });

  it("keeps Workbench UI-only actions on cached snapshot input", async function () {
    const host = await fs.readFile(
      "src/modules/synthesisWorkbenchTab.ts",
      "utf8",
    );
    const hooks = await fs.readFile("src/hooks.ts", "utf8");

    assert.include(host, "snapshotInputLocked");
    assert.include(host, "getDefaultSynthesisClient");
    assert.include(host, "toSynthesisWorkbenchReadState");
    assert.include(host, "toSynthesisUiSnapshotInput");
    assert.include(host, "toSynthesisWorkbenchPaperDigestReadRequest");
    assert.match(host, /client\.workbench\s*\.readChrome/);
    assert.match(host, /client\.workbench\s*\.readSurface/);
    assert.match(host, /client\.workbench\s*\.readTopicDetail/);
    assert.match(host, /client\.workbench\s*\.readPaperDigest/);
    assert.notInclude(host, ".getSynthesisWorkbenchChromeInput");
    assert.notInclude(host, ".getSynthesisWorkbenchSurfaceInput");
    assert.notInclude(host, ".resolveTopicPaperDigest");
    assert.notInclude(host, ".warmSynthesisWorkbenchSurfaces");
    const chromeBlock = extractFunctionBlock(host, "sendChrome");
    assert.match(chromeBlock, /client\.workbench\s*\.readChrome/);
    assert.include(chromeBlock, "toSynthesisWorkbenchReadState");
    assert.include(host, '"synthesis:chrome"');
    assert.include(host, '"synthesis:surface"');
    assert.notInclude(host, ".getSynthesisSnapshotInput(runtime.state)");
    assert.include(host, "prewarmedSynthesisSnapshotInput");
    assert.include(host, "loadedSurfaces");
    assert.include(host, "dirtySurfaces");
    assert.include(host, "surfaceNeedsServiceRefresh");
    assert.include(host, "refreshFromService: false");
    assert.include(host, "surfaceRequestSeq");
    assert.include(host, "latestSurfaceRequestBySurface");
    assert.include(host, "beginSurfaceRefreshRequest");
    assert.include(host, "isLatestSurfaceRefreshRequest");
    assert.include(host, "isTransientStorageBusyError");
    assert.notInclude(host, "SYNTHESIS_WORKBENCH_INITIAL_REFRESH_DELAY_MS");
    assert.include(host, 'envelope.action === "ready"');
    assert.include(host, 'envelope.action === "refresh"');
    assert.notInclude(host, 'messageType === "synthesis:init"');
    assert.include(hooks, "prewarmSynthesisWorkbenchAfterStartup();");
    assert.include(hooks, "prewarmSynthesisWorkbenchSurfaces");
    const actionBlock = extractFunctionBlock(host, "handleAction");
    [
      'envelope.action === "ready"',
      'envelope.action === "selectTab"',
      'envelope.action === "setFilters"',
    ].forEach((needle) => assert.include(actionBlock, needle));
    assert.notInclude(actionBlock, "getDebugSynthesisSnapshotInput");
    assert.notInclude(actionBlock, ".getSynthesisSnapshotInput");
    assert.include(actionBlock, "scheduleActiveSurfaceRefresh");
    const readyBlock = extractIfBlock(
      actionBlock,
      'envelope.action === "ready"',
    );
    assert.notInclude(
      readyBlock,
      "scheduleActiveSurfaceRefresh",
      "the handshake owns the initial surface read",
    );
    const sendSurfaceBlock = extractFunctionBlock(host, "sendSurface");
    assert.include(sendSurfaceBlock, "inFlightSurfaceRefreshes");
    assert.include(sendSurfaceBlock, "queuedServiceSurfaceRefreshes");
    const performSurfaceBlock = extractFunctionBlock(
      host,
      "performSurfaceSend",
    );
    assert.include(performSurfaceBlock, "requestId: request.requestId");
    assert.include(performSurfaceBlock, "client.workbench.readSurface");
    assert.include(performSurfaceBlock, "isLatestSurfaceRefreshRequest");
    assert.include(performSurfaceBlock, "!isActiveSurface(runtime, surface)");
    assert.include(performSurfaceBlock, '"synthesis:surface-error"');
    assert.include(performSurfaceBlock, 'code: transient ? "storage_busy"');
    const scheduleSurfaceBlock = extractFunctionBlock(
      host,
      "scheduleActiveSurfaceRefresh",
    );
    assert.include(scheduleSurfaceBlock, "const scheduledSurface");
    assert.include(
      scheduleSurfaceBlock,
      "isActiveSurface(runtime, scheduledSurface)",
    );
    assert.notInclude(
      scheduleSurfaceBlock,
      "const surface = surfaceForTab(runtime.state.selectedTab)",
    );
    assert.include(actionBlock, "registryScopeChanged");
    assert.include(actionBlock, "registryExpandedChanged");
    assert.include(actionBlock, "expandedSourceRefs");
    const selectTabStart = actionBlock.indexOf(
      'if (envelope.action === "selectTab")',
    );
    const selectTabEnd = actionBlock.indexOf(
      'if (envelope.action === "setFilters")',
      selectTabStart,
    );
    assert.isAtLeast(selectTabStart, 0, "selectTab branch should exist");
    assert.isAbove(selectTabEnd, selectTabStart, "selectTab branch should end");
    const selectTabBlock = actionBlock.slice(selectTabStart, selectTabEnd);
    assert.notInclude(
      selectTabBlock,
      "refreshFromService: true",
      "selectTab must not force surface reload",
    );
    assert.include(actionBlock, "reviewsFilterChanged");
    const handshakeBlock = extractFunctionBlock(
      host,
      "finalizeWorkbenchHandshake",
    );
    assert.notInclude(
      handshakeBlock,
      'void sendSnapshot(runtime, "synthesis:snapshot");',
    );
    assert.include(handshakeBlock, "sendActiveSurface(runtime);");
    assert.notInclude(
      handshakeBlock,
      "sendActiveSurface(runtime, { refreshFromService: false })",
    );
    assert.notInclude(handshakeBlock, "refreshFromService: true");
    assert.include(
      hooks,
      "prewarmSynthesisWorkbenchSurfaces({ surfaces: [] })",
    );
  });

  it("localizes the Synthesis Workbench through a Host-injected message envelope", async function () {
    const host = await fs.readFile(
      "src/modules/synthesisWorkbenchTab.ts",
      "utf8",
    );
    const i18n = await fs.readFile("src/synthesisWorkbenchI18n.ts", "utf8");
    const governance = await fs.readFile(
      "scripts/check-localization-governance.ts",
      "utf8",
    );
    const html = await fs.readFile(
      "addon/content/synthesis/index.html",
      "utf8",
    );

    assert.include(i18n, "SYNTHESIS_WORKBENCH_DEFAULT_MESSAGES");
    assert.include(i18n, "SynthesisWorkbenchMessageKey");
    assert.include(i18n, "formatSynthesisWorkbenchMessage");
    assert.include(host, "buildSynthesisWorkbenchI18nEnvelope");
    assert.include(host, "withSynthesisWorkbenchI18n(payload)");
    assert.include(host, "getStringOrFallback");
    assert.include(host, "SYNTHESIS_WORKBENCH_MESSAGE_KEYS");
    assert.include(governance, "parseSynthesisWorkbenchMessageKeys");
    assert.include(governance, "reportSynthesisWorkbenchUiHardcodes");
    assert.include(governance, "[synthesis-i18n-key]");
    assert.include(i18n, "synthesis-enum-kind-canonical-merge");
    assert.include(i18n, "synthesis-enum-review-tab-reference-matching");
    assert.include(i18n, "synthesis-canonical-not-in-graph");
    assert.include(i18n, "synthesis-enum-graph-node-kind-library-paper");
    assert.include(i18n, "synthesis-enum-graph-node-kind-external-reference");
    assert.include(i18n, "synthesis-enum-graph-node-kind-low-signal-external");
    assert.include(i18n, "synthesis-enum-graph-edge-role-citation");
    assert.include(i18n, "synthesis-enum-graph-edge-role-unknown");
    assert.include(i18n, "synthesis-enum-graph-edge-role-historical");
    assert.include(
      i18n,
      "synthesis-enum-coverage-caveat-workset-subdomain-bias",
    );
    assert.include(
      i18n,
      "synthesis-enum-coverage-caveat-artifact-evidence-insufficient",
    );
    assert.include(
      i18n,
      "synthesis-enum-coverage-caveat-evaluation-scope-limitation",
    );
    assert.include(i18n, "synthesis-enum-priority-unknown");
    assert.include(i18n, "synthesis-enum-binding-status-stale-target");
    assert.include(i18n, "synthesis-enum-action-manual-target");
    assert.include(html, '<html lang="">');
  });

  it("invalidates Index surface cache on Zotero library item changes without sidecar refresh", async function () {
    const hooks = await fs.readFile("src/hooks.ts", "utf8");
    const host = await fs.readFile(
      "src/modules/synthesisWorkbenchTab.ts",
      "utf8",
    );
    const observer = await fs.readFile(
      "src/modules/synthesis/itemObserver.ts",
      "utf8",
    );

    const notifyBlock = extractFunctionBlock(hooks, "onNotify");
    assert.include(notifyBlock, "isSynthesisLibraryReadModelInvalidationEvent");
    assert.include(notifyBlock, "notifySynthesisWorkbenchLibraryItemsChanged");
    assert.include(notifyBlock, "recordSynthesisZoteroItemNotifications");
    assert.notInclude(notifyBlock, "refreshReferenceSidecarNow");
    assert.notInclude(notifyBlock, "getSynthesisWorkbenchSurfaceInput");

    const invalidationBlock = extractFunctionBlock(
      host,
      "notifySynthesisWorkbenchLibraryItemsChanged",
    );
    assert.include(
      invalidationBlock,
      "isSynthesisLiteratureScoreInvalidationEvent",
    );
    assert.include(invalidationBlock, '["index", "topics", "home"]');
    assert.include(invalidationBlock, ': ["index"]');
    assert.include(invalidationBlock, "markSurfaceDirty(runtime, surface)");
    assert.include(invalidationBlock, "scheduleLibraryReadModelSurfaceRefresh");
    assert.notInclude(invalidationBlock, "refreshReferenceSidecarNow");
    assert.notInclude(invalidationBlock, "synt_cache_basis");

    const scheduleBlock = extractFunctionBlock(
      host,
      "scheduleLibraryReadModelSurfaceRefresh",
    );
    assert.include(scheduleBlock, "globalThis.setTimeout");
    assert.include(scheduleBlock, "surfaceNeedsServiceRefresh");
    assert.include(scheduleBlock, "sendSurface(runtime, activeSurface");
    assert.include(
      host,
      "SYNTHESIS_WORKBENCH_LIBRARY_INVALIDATION_DEBOUNCE_MS",
    );
    assert.include(host, "synthesisWorkbenchRuntimes");
    assert.include(host, "synthesisWorkbenchRuntimes.delete(runtime)");

    const filterBlock = extractFunctionBlock(
      observer,
      "isSynthesisLibraryReadModelInvalidationEvent",
    );
    assert.include(filterBlock, 'cleanString(args.type) !== "item"');
    assert.include(filterBlock, "shouldInvalidateLibraryReadModel");
    assert.include(filterBlock, "isChildItemType");
    assert.notInclude(filterBlock, "getDefaultSynthesisService");
  });

  it("routes explicit workflow invalidation to the affected Workbench surfaces", async function () {
    const host = await fs.readFile(
      "src/modules/synthesisWorkbenchTab.ts",
      "utf8",
    );
    const workflowHostApi = await fs.readFile(
      "src/workflows/hostApi.ts",
      "utf8",
    );
    const invalidationBlock = extractFunctionBlock(
      host,
      "handleSynthesisWorkbenchSidecarChanged",
    );
    assert.include(invalidationBlock, "args.invalidatedSurfaces");
    assert.include(invalidationBlock, "markSurfaceDirty(runtime, surface)");
    assert.include(invalidationBlock, "scheduleLibraryReadModelSurfaceRefresh");
    assert.include(
      invalidationBlock,
      "sendChrome(runtime, { refreshFromService: true })",
    );
    assert.include(host, "registerSynthesisWorkbenchSidecarChangeListener");
    assert.include(workflowHostApi, "createWorkflowSynthesisHostApi()");

    const observed: string[][] = [];
    const unregister = registerSynthesisWorkbenchSidecarChangeListener(
      (event) => observed.push(event.invalidatedSurfaces),
    );
    try {
      const result = notifySynthesisWorkbenchSidecarChanged({
        invalidatedSurfaces: ["tags", "tags"],
        reason: "tag_suggestions_stage",
      });
      assert.deepEqual(result.invalidatedSurfaces, ["tags"]);
      assert.deepEqual(observed, [["tags"]]);
    } finally {
      unregister();
    }
  });

  it("classifies Zotero item notifications for library read-model invalidation", function () {
    assert.isTrue(
      isSynthesisLibraryReadModelInvalidationEvent({
        event: "modify",
        type: "item",
        ids: [1],
        extraData: { "1": { itemType: "journalArticle" } },
      }),
    );
    assert.isTrue(
      isSynthesisLibraryReadModelInvalidationEvent({
        event: "delete",
        type: "item",
        ids: [2],
      }),
    );
    assert.isFalse(
      isSynthesisLibraryReadModelInvalidationEvent({
        event: "modify",
        type: "collection",
        ids: [1],
      }),
    );
    assert.isFalse(
      isSynthesisLibraryReadModelInvalidationEvent({
        event: "select",
        type: "item",
        ids: [1],
      }),
    );
    assert.isFalse(
      isSynthesisLibraryReadModelInvalidationEvent({
        event: "modify",
        type: "item",
        ids: [3, 4],
        extraData: {
          "3": { itemType: "note" },
          "4": { itemType: "attachment" },
        },
      }),
    );
  });

  it("invalidates Index, Topics, and Home when a literature score note changes", async function () {
    const parent = new Zotero.Item("journalArticle");
    parent.setField("title", "Score invalidation parent");
    await parent.saveTx();
    const note = new Zotero.Item("note");
    note.parentID = parent.id;
    note.setNote(
      '<div data-zs-note-kind="literature-score"><h1>Literature Score</h1></div>',
    );
    await note.saveTx();

    assert.isTrue(
      isSynthesisLibraryReadModelInvalidationEvent({
        event: "modify",
        type: "item",
        ids: [note.id],
        extraData: { [note.id]: { itemType: "note" } },
      }),
    );
    assert.isTrue(
      isSynthesisLiteratureScoreInvalidationEvent({
        type: "item",
        ids: [note.id],
        extraData: { [note.id]: { itemType: "note" } },
      }),
    );
  });

  it("uses 32px runtime icons for chrome UI surfaces", async function () {
    const toolbar = await fs.readFile(
      "src/modules/dashboardToolbarButton.ts",
      "utf8",
    );
    const menu = await fs.readFile("src/modules/workflowMenu.ts", "utf8");
    const ztoolkit = await fs.readFile("src/utils/ztoolkit.ts", "utf8");
    const smallIconSizes = await Promise.all([
      readPngSize("addon/content/icons/icon_play_32.png"),
      readPngSize("addon/content/icons/icon_workbench_32.png"),
      readPngSize("addon/content/icons/icon_sidebar_32.png"),
    ]);
    const iconFiles = await Promise.all([
      fs.stat("addon/content/icons/icon_play_32.png"),
      fs.stat("addon/content/icons/icon_workbench_32.png"),
      fs.stat("addon/content/icons/icon_sidebar_32.png"),
      fs.stat("addon/content/icons/icon_play.png"),
      fs.stat("addon/content/icons/icon_workbench.png"),
      fs.stat("addon/content/icons/icon_sidebar.png"),
    ]);

    assert.include(toolbar, "icon_workbench_32.png");
    assert.include(toolbar, "icon_play_32.png");
    assert.include(toolbar, "icon_sidebar_32.png");
    assert.include(menu, "icon_play_32.png");
    assert.include(ztoolkit, "icon_sidebar_32.png");
    assert.notInclude(toolbar, "icon_workbench.png`");
    assert.notInclude(toolbar, "icon_play.png`");
    assert.notInclude(toolbar, "icon_sidebar.png`");
    assert.notInclude(menu, "icon_play.png`");
    assert.notInclude(ztoolkit, "icon_sidebar.png`");
    assert.deepEqual(smallIconSizes, [
      { width: 32, height: 32 },
      { width: 32, height: 32 },
      { width: 32, height: 32 },
    ]);
    assert.isAbove(iconFiles[3].size, iconFiles[0].size);
    assert.isAbove(iconFiles[4].size, iconFiles[1].size);
    assert.isAbove(iconFiles[5].size, iconFiles[2].size);
  });

  it("loads shared theme tokens for Synthesis Workbench and structured Topic Detail", async function () {
    const index = await fs.readFile(
      "addon/content/synthesis/index.html",
      "utf8",
    );
    const css = await fs.readFile("addon/content/synthesis/styles.css", "utf8");
    const themeCss = await fs.readFile(
      "addon/content/shared/theme.css",
      "utf8",
    );
    const themeJs = await fs.readFile("addon/content/shared/theme.js", "utf8");

    assert.include(index, "../shared/theme.js");
    assert.include(index, "../shared/theme.css?ui=20260520-controls-v8");
    assert.include(index, "./styles.css?ui=20260617-taxonomy-axis-v2");
    assert.include(css, "--topic-bg: var(--zs-bg)");
    assert.include(css, "--topic-panel: var(--zs-panel)");
    assert.include(css, "--topic-text: var(--zs-text)");
    assert.include(css, ':root[data-zs-theme="dark"]');
    assert.include(themeCss, "--zs-bg-gradient");
    assert.include(themeCss, ':root[data-zs-theme="dark"]');
    assert.include(themeCss, "@media (prefers-color-scheme: dark)");
    assert.include(themeJs, "zotero-skills.theme");
    assert.include(themeJs, "ZoteroSkillsTheme");
  });

  it("derives TopicUpdateIntent for stale, incomplete, and dirty topic rows", function () {
    const snapshot = normalizeSynthesisUiSnapshot({
      libraryId: 1,
      artifacts: [
        {
          id: "topic-stale",
          title: "Stale Topic",
          kind: "topic_synthesis",
          source_materials_status: "complete",
          source_materials_percent: 100,
          freshness: "stale",
          language: "zh-CN",
          stale_reasons: ["artifact_changed:digest-markdown"],
        },
        {
          id: "topic-incomplete",
          title: "Incomplete Topic",
          kind: "topic_synthesis",
          source_materials_status: "partial",
          source_materials_percent: 50,
          freshness: "fresh",
          language: "en-US",
          missing_sections: ["coverage"],
        },
        {
          id: "topic-dirty",
          title: "Dirty Topic",
          kind: "topic_synthesis",
          source_materials_status: "missing",
          source_materials_percent: 0,
          freshness: "dirty",
          language: "zh-CN",
          dirty_reasons: ["legacy_invalid"],
        },
        {
          id: "topic-queued",
          title: "Queued Topic",
          kind: "topic_synthesis",
          source_materials_status: "complete",
          source_materials_percent: 100,
          freshness: "queued",
          language: "zh-CN",
        },
        {
          id: "topic-failed",
          title: "Failed Topic",
          kind: "topic_synthesis",
          source_materials_status: "complete",
          source_materials_percent: 100,
          freshness: "failed",
          language: "zh-CN",
        },
        {
          id: "topic-discovery",
          title: "Discovery Topic",
          kind: "topic_synthesis",
          source_materials_status: "complete",
          source_materials_percent: 100,
          freshness: "fresh",
          language: "zh-CN",
          discovery_status: "candidates",
          candidate_count: 2,
        },
      ] as any,
    });

    const intents = Object.fromEntries(
      snapshot.artifacts.rows.map((row: any) => [row.id, row.updateIntent]),
    );

    assert.deepInclude(intents["topic-stale"], {
      topicId: "topic-stale",
      language: "zh-CN",
      updateScope: "auto",
      updateMode: "auto",
      actionLabel: "Update",
    });
    assert.deepInclude(intents["topic-incomplete"], {
      topicId: "topic-incomplete",
      language: "en-US",
      updateScope: "source_materials",
      actionLabel: "Update",
    });
    assert.deepInclude(intents["topic-dirty"], {
      topicId: "topic-dirty",
      updateMode: "update_full",
      actionLabel: "Update",
    });
    assert.deepInclude(intents["topic-queued"], {
      topicId: "topic-queued",
      updateScope: "maintenance",
      blocked: true,
    });
    assert.deepInclude(intents["topic-failed"], {
      topicId: "topic-failed",
      updateMode: "update_full",
      actionLabel: "Update",
    });
    assert.deepInclude(intents["topic-discovery"], {
      topicId: "topic-discovery",
      updateScope: "discovery",
      updateMode: "update_full",
      updateReason: "discovery_candidates",
      actionLabel: "Update",
    });
    assert.notEqual(intents["topic-discovery"]?.blocked, true);

    const freshComplete = normalizeSynthesisUiSnapshot({
      libraryId: 1,
      artifacts: [
        {
          id: "topic-fresh",
          title: "Fresh Topic",
          kind: "topic_synthesis",
          source_materials_status: "complete",
          source_materials_percent: 100,
          freshness: "fresh",
        },
      ] as any,
    });
    assert.isUndefined((freshComplete.artifacts.rows[0] as any)?.updateIntent);
  });

  it("does not expose note mirror recovery commands as normal host commands", function () {
    const missing = normalizeSynthesisUiSnapshot({
      libraryId: 1,
      sync: {
        status: "missing_root",
        allowedActions: [],
        diagnostics: [],
        requiresConfirmation: false,
      },
    });
    const rebuild = applySynthesisUiAction(createDefaultSynthesisUiState(), {
      action: "hostCommand",
      payload: {
        command: "rebuildSynthesisMirror",
        args: {},
      },
    });
    const recover = applySynthesisUiAction(createDefaultSynthesisUiState(), {
      action: "hostCommand",
      payload: {
        command: "recoverSynthesisFromMirror",
        args: { confirm: true },
      },
    });

    assert.notInclude(missing.hostCommands, "rebuildSynthesisMirror");
    assert.notInclude(missing.hostCommands, "recoverSynthesisFromMirror");
    assert.isFalse(rebuild.handled);
    assert.isFalse(recover.handled);
  });

  it("defaults Topics to graph view and preserves List/Grid switching", function () {
    const initial = createDefaultSynthesisUiState();
    assert.equal(initial.artifacts.viewMode, "graph");

    const listState = applySynthesisUiAction(initial, {
      action: "setFilters",
      payload: { artifacts: { viewMode: "list" } },
    }).state;
    const gridState = applySynthesisUiAction(listState, {
      action: "setFilters",
      payload: { artifacts: { viewMode: "grid" } },
    }).state;

    assert.equal(listState.artifacts.viewMode, "list");
    assert.equal(gridState.artifacts.viewMode, "grid");
  });

  it("builds topic graph modes, excludes roots from Unplaced, and fills inspector context", function () {
    const state = applySynthesisUiAction(createDefaultSynthesisUiState(), {
      action: "setTopicGraphView",
      payload: { mode: "unplaced", selectedTopicId: "topic-child" },
    }).state;
    const snapshot = buildSynthesisUiSnapshot(
      {
        libraryId: 1,
        topicGraph: {
          nodes: [
            {
              topic_id: "topic-root",
              title: "Root",
              node_type: "materialized",
              is_root: true,
              level: "top",
            },
            {
              topic_id: "topic-child",
              title: "Child",
              definition: "Child topic definition from topic.json",
              node_type: "materialized",
              paper_count: 3,
              last_synthesis_at: "2026-05-24T00:00:00.000Z",
            },
            {
              topic_id: "topic-peer",
              title: "Peer",
              node_type: "placeholder",
            },
          ],
          edges: [
            {
              edge_id: "edge:broader_than:topic-root:topic-child",
              source_topic_id: "topic-root",
              target_topic_id: "topic-child",
              relation: "broader_than",
              status: "confirmed",
            },
            {
              edge_id: "edge:related_to:topic-child:topic-peer",
              source_topic_id: "topic-child",
              target_topic_id: "topic-peer",
              relation: "related_to",
              status: "suggested",
            },
          ],
          reviewItems: [
            {
              review_id: "review:related_to:topic-child:topic-review",
              status: "open",
              source_topic_id: "topic-child",
              target_topic_id: "topic-review",
              target_title: "Review",
              relation: "related_to",
              confidence: 0.2,
            },
          ],
        },
      },
      state,
    );

    assert.deepEqual(
      snapshot.topicGraph.visibleNodes.map((node) => node.topic_id),
      ["topic-peer"],
    );
    assert.equal(snapshot.topicGraph.inspector.topic?.topic_id, "topic-child");
    assert.equal(
      snapshot.topicGraph.inspector.topic?.definition,
      "Child topic definition from topic.json",
    );
    assert.deepEqual(
      snapshot.topicGraph.inspector.parents.map((node) => node.topic_id),
      ["topic-root"],
    );
    assert.deepEqual(
      snapshot.topicGraph.inspector.related.map((entry) => entry.node.topic_id),
      ["topic-peer"],
    );
    assert.equal(snapshot.topicGraph.inspector.suggestedCount, 2);
    assert.deepEqual(
      snapshot.topicGraph.inspector.relationReviewItems.map(
        (entry) => entry.review_id,
      ),
      ["review:related_to:topic-child:topic-review"],
    );
    assert.deepEqual(snapshot.topicGraph.inspector.suggestedRelations, [
      {
        edge_id: "edge:related_to:topic-child:topic-peer",
        relation: "related_to",
        status: "suggested",
        node: snapshot.topicGraph.inspector.related[0]!.node,
        source_topic_id: "topic-child",
        target_topic_id: "topic-peer",
        provenance: [],
        evidence_refs: [],
      },
    ]);
    assert.include(snapshot.hostCommands, "rebuildTopicGraphIndex");
    assert.include(snapshot.hostCommands, "applyTopicGraphReviewAction");
  });

  it("renders Concepts tab state with filters, selection state, display-text command, and overlay entries [inv.concepts.overlay_optional]", function () {
    const state = applySynthesisUiAction(createDefaultSynthesisUiState(), {
      action: "setFilters",
      payload: {
        concepts: {
          search: "detr",
          conceptType: "model",
          status: "active",
          selectedConceptId: "concept:cv:detr",
          reviewMergeTargets: { "review:weak": "concept:cv:detr" },
        },
      },
    }).state;
    const snapshot = buildSynthesisUiSnapshot(
      {
        libraryId: 1,
        concepts: {
          concepts: [
            {
              concept_id: "concept:cv:detr",
              label: "DETR",
              aliases: ["DETR", "DEtection TRansformer"],
              concept_type: "model",
              domain: "computer vision",
              status: "active",
              short_definition: "End-to-end object detector.",
              sense_ids: ["sense:cv:detr"],
            },
          ],
          senses: [
            {
              sense_id: "sense:cv:detr",
              concept_id: "concept:cv:detr",
              label: "DETR",
              aliases: ["DETR"],
              domain: "computer vision",
              short_definition: "End-to-end object detector.",
              definition: "Set prediction detector.",
              confidence: "high",
              source_topic_ids: ["object-detection"],
            },
          ],
          aliases: [
            {
              alias_id: "alias:detr",
              alias: "DETR",
              normalized: "detr",
              concept_id: "concept:cv:detr",
              sense_id: "sense:cv:detr",
              status: "active",
              confidence: "high",
            },
            {
              alias_id: "alias:weak",
              alias: "weak",
              normalized: "weak",
              concept_id: "concept:cv:detr",
              status: "active",
              confidence: "low",
            },
          ],
          overlayEntries: [
            {
              concept_id: "concept:cv:detr",
              sense_id: "sense:cv:detr",
              alias: "DETR",
              label: "DETR",
              short_definition: "End-to-end object detector.",
              confidence: "high",
            },
            {
              concept_id: "concept:cv:detr",
              alias: "weak",
              label: "Weak",
              confidence: "low",
            },
          ],
          reviewItems: [
            {
              review_id: "review:weak",
              status: "open",
              reason: "low_confidence_concept",
              topic_id: "object-detection",
              label: "Weak Concept",
              confidence: "low",
              candidate_concept_ids: ["concept:cv:detr"],
            },
          ],
        },
      },
      state,
    );
    const command = applySynthesisUiAction(state, {
      action: "hostCommand",
      payload: {
        command: "updateConceptDisplayText",
        args: {
          conceptId: "concept:cv:detr",
          fields: { short_definition: "Updated" },
        },
      },
    });

    assert.equal(snapshot.concepts.selected?.concept_id, "concept:cv:detr");
    assert.deepEqual(
      snapshot.concepts.visibleRows.map((row) => row.concept_id),
      ["concept:cv:detr"],
    );
    assert.deepEqual(
      snapshot.concepts.overlayEntries.map((entry) => entry.alias),
      ["DETR"],
    );
    assert.deepEqual(
      snapshot.concepts.reviewItems.map((entry) => entry.review_id),
      ["review:weak"],
    );
    assert.equal(
      snapshot.concepts.filters.reviewMergeTargets["review:weak"],
      "concept:cv:detr",
    );
    assert.include(snapshot.hostCommands, "rebuildConceptKbIndex");
    assert.include(snapshot.hostCommands, "applyConceptReviewAction");
    assert.include(snapshot.hostCommands, "deleteConceptEntry");
    assert.deepEqual(command.hostCommand, {
      command: "updateConceptDisplayText",
      args: {
        conceptId: "concept:cv:detr",
        fields: { short_definition: "Updated" },
      },
    });
  });

  it("wires Concepts host projection and review actions", async function () {
    const host = await fs.readFile(
      "src/modules/synthesisWorkbenchTab.ts",
      "utf8",
    );

    assert.include(host, "deleteConceptEntries");
    assert.include(host, 'action === "keep_alias"');
    assert.include(host, 'action === "remove_alias"');
    assert.include(host, "client.workbench.readSurface");
    assert.include(host, 'surface: "concepts"');
  });
  it("normalizes alias audit reviews and routes explicit keep/remove actions", function () {
    const snapshot = normalizeSynthesisUiSnapshot({
      libraryId: 1,
      concepts: {
        reviewItems: [
          {
            review_id: "review:alias",
            status: "open",
            reason: "alias_conflict",
            topic_id: "concept:cv:field",
            label: "Object Detection",
            confidence: "high",
            candidate_concept_ids: ["concept:cv:detection"],
            proposal: {
              audit_alias: {
                alias_id: "alias:object-detection",
                alias: "Object Detection",
                normalized: "object detection",
                concept_id: "concept:cv:field",
                sense_id: "sense:cv:field",
              },
            },
          } as any,
        ],
      },
    });
    const review = snapshot.concepts.reviewItems[0]!;

    assert.equal(review.reason, "alias_conflict");
    assert.deepEqual(review.audit_alias, {
      alias_id: "alias:object-detection",
      alias: "Object Detection",
      normalized: "object detection",
      concept_id: "concept:cv:field",
      sense_id: "sense:cv:field",
    });
    const keep = applySynthesisUiAction(createDefaultSynthesisUiState(), {
      action: "hostCommand",
      payload: {
        command: "applyConceptReviewAction",
        args: { reviewId: "review:alias", action: "keep_alias" },
      },
    });
    assert.deepEqual(keep.hostCommand, {
      command: "applyConceptReviewAction",
      args: { reviewId: "review:alias", action: "keep_alias" },
    });
  });

  it("shows reference sidecar cache status without exposing legacy cleanup host actions", async function () {
    const state = applySynthesisUiAction(createDefaultSynthesisUiState(), {
      action: "setFilters",
      payload: { registry: { artifactCoverage: "partial" } },
    }).state;
    const snapshot = buildSynthesisUiSnapshot(
      {
        libraryId: 1,
        registry: {
          rows: [
            {
              paper_ref: "1:AAA",
              title: "Needs Review",
              artifactCoverage: "partial",
              missing_artifacts: ["references"],
            },
            {
              paper_ref: "1:BBB",
              title: "Ready",
              artifactCoverage: "complete",
              missing_artifacts: [],
            },
          ],
          cleanupProposals: [
            {
              proposal_id: "cleanup:1",
              status: "open",
              source_paper_ref: "1:AAA",
              source_paper_title: "Needs Review",
              reference_title: "Unresolved Method Paper",
              target_work_title: "Candidate Work",
              reason: "reference target requires review",
              decision_summary:
                "Review how to handle this unresolved reference.",
            },
          ],
          cacheStatus: {
            cache_key: "reference-sidecar:library",
            status: "failed",
            diagnostics: [
              {
                code: "reference_sidecar_refresh_failed",
                severity: "error",
                message: "temporary failure",
              },
            ],
            allowed_actions: [
              "retryReferenceSidecarRefresh",
              "refreshReferenceSidecarNow",
            ],
          },
        },
      },
      state,
    );

    assert.deepEqual(
      snapshot.registry.visibleRows.map((row) => row.paper_ref),
      ["1:AAA"],
    );
    assert.equal(
      snapshot.registry.cleanupProposals[0]?.proposal_id,
      "cleanup:1",
    );
    assert.equal(snapshot.registry.cacheStatus.status, "failed");
    assert.notInclude(snapshot.hostCommands, "applyLiteratureCleanupAction");
    assert.include(snapshot.hostCommands, "refreshReferenceSidecarNow");
    assert.include(snapshot.hostCommands, "retryReferenceSidecarRefresh");
    assert.include(
      snapshot.hostCommands,
      "refreshCitationGraphCacheIncrementalNow",
    );
    assert.include(snapshot.hostCommands, "rebuildCitationGraphCacheNow");
    assert.include(snapshot.hostCommands, "retryCitationGraphCacheRebuild");
    assert.isFalse(
      applySynthesisUiAction(state, {
        action: "hostCommand",
        payload: {
          command: "applyLiteratureCleanupAction",
          args: {
            proposalId: "cleanup:1",
            action: "ignore_reference_instance",
          },
        },
      }).handled,
    );
  });

  it("keeps the Index tag-regulation marker and generic row workflow command", function () {
    const snapshot = buildSynthesisUiSnapshot({
      libraryId: 1,
      registry: {
        rows: [
          {
            libraryId: 1,
            itemKey: "TAGGED",
            paper_ref: "1:TAGGED",
            title: "Needs tag regulation",
            artifactCoverage: "partial" as const,
            missing_artifacts: ["citation_analysis"],
            needsTagRegulation: true,
          },
        ],
      },
    });

    assert.deepInclude(snapshot.registry.visibleRows[0], {
      libraryId: 1,
      itemKey: "TAGGED",
      needsTagRegulation: true,
    });
    assert.isTrue(
      applySynthesisUiAction(createDefaultSynthesisUiState(), {
        action: "hostCommand",
        payload: {
          command: "runRegistryItemWorkflow",
          args: {
            libraryId: 1,
            itemKey: "TAGGED",
            workflowId: "tag-regulator",
          },
        },
      }).handled,
    );
  });

  it("keeps Index default rows Zotero-bound and exposes referenced scope", function () {
    const input = {
      libraryId: 1,
      registry: {
        rows: [
          {
            paper_ref: "1:AAA",
            title: "Library Paper",
            artifactCoverage: "complete" as const,
            missing_artifacts: [],
            index_scope: "library" as const,
            reference_count: 1,
            references: [
              {
                reference_instance_id: "ref:1",
                reference_index: 0,
                title: "External Method",
                target_title: "External Method",
                target_binding: "external" as const,
                binding_status: "accepted" as const,
              },
            ],
          },
          {
            paper_ref: "lit:external",
            title: "External Method",
            artifactCoverage: "missing" as const,
            missing_artifacts: [],
            index_scope: "referenced" as const,
            referenced_by_count: 1,
          },
        ],
      },
    };

    const defaultSnapshot = buildSynthesisUiSnapshot(input);
    const referencedState = applySynthesisUiAction(
      createDefaultSynthesisUiState(),
      {
        action: "setFilters",
        payload: { registry: { scope: "referenced" } },
      },
    ).state;
    const expandedState = applySynthesisUiAction(
      createDefaultSynthesisUiState(),
      {
        action: "setFilters",
        payload: {
          registry: {
            expandedSourceRefs: ["1:AAA", "1:AAA", "", "1:BBB"],
          },
        },
      },
    ).state;
    const referencedSnapshot = buildSynthesisUiSnapshot(input, referencedState);

    assert.deepEqual(
      defaultSnapshot.registry.visibleRows.map((row) => row.paper_ref),
      ["1:AAA"],
    );
    assert.equal(defaultSnapshot.registry.visibleRows[0]?.reference_count, 1);
    assert.equal(
      defaultSnapshot.registry.visibleRows[0]?.references?.[0]?.target_binding,
      "external",
    );
    assert.deepEqual(
      referencedSnapshot.registry.visibleRows.map((row) => row.paper_ref),
      ["1:AAA"],
    );
    assert.deepEqual(expandedState.registry.expandedSourceRefs, [
      "1:AAA",
      "1:BBB",
    ]);
  });

  it("keeps Index filter DTOs and cleanup review host routing", async function () {
    const model = await fs.readFile("src/modules/synthesis/uiModel.ts", "utf8");
    const host = await fs.readFile(
      "src/modules/synthesisWorkbenchTab.ts",
      "utf8",
    );

    assert.notInclude(model, "needs-cleanup");
    assert.notInclude(model, "referenceStatus");
    assert.include(model, "bindingStatus");
    assert.notInclude(model, "canonicalActionable");
    assert.include(host, "{ deferStart: true }");
    assert.include(host, 'command === "applyCanonicalRevisionMergeRequests"');
  });
  it("guards Workbench client and Host hot paths against heavy reads", async function () {
    const host = await fs.readFile(
      "src/modules/synthesisWorkbenchTab.ts",
      "utf8",
    );
    const prewarmBlock = extractFunctionBlock(
      host,
      "prewarmSynthesisWorkbenchSurfaces",
    );
    const publishPrewarmPhaseBlock = extractFunctionBlock(
      host,
      "publishSynthesisWorkbenchPrewarmPhase",
    );
    assert.notInclude(prewarmBlock, "getDefaultSynthesisService");
    assert.notInclude(prewarmBlock, ".warmSynthesisWorkbenchSurfaces");
    assert.include(prewarmBlock, "getDefaultSynthesisClient");
    assert.include(prewarmBlock, "client.workbench.readChrome");
    assert.include(prewarmBlock, "client.workbench.readSurface");
    assert.include(prewarmBlock, "args.surfaces !== undefined");
    assert.lengthOf(
      prewarmBlock.match(/toSynthesisWorkbenchReadState/g) || [],
      1,
      "prewarm state should cross the client boundary once per run",
    );
    const defaultSurfaceOrder = [
      '"index"',
      '"review"',
      '"graph"',
      '"tags"',
      '"concepts"',
      '"topics"',
    ];
    let priorSurfaceIndex = -1;
    for (const surface of defaultSurfaceOrder) {
      const surfaceIndex = prewarmBlock.indexOf(surface, priorSurfaceIndex + 1);
      assert.isAbove(
        surfaceIndex,
        priorSurfaceIndex,
        `default prewarm surface ${surface} should retain its order`,
      );
      priorSurfaceIndex = surfaceIndex;
    }
    const surfaceLoopIndex = prewarmBlock.indexOf("for (const surface");
    const yieldIndex = prewarmBlock.indexOf(
      "await yieldToEventLoop()",
      surfaceLoopIndex,
    );
    const surfaceReadIndex = prewarmBlock.indexOf(
      "client.workbench.readSurface",
      surfaceLoopIndex,
    );
    assert.isAtLeast(surfaceLoopIndex, 0);
    assert.isAbove(yieldIndex, surfaceLoopIndex);
    assert.isAbove(surfaceReadIndex, yieldIndex);
    assert.include(prewarmBlock, "continue");
    assert.include(prewarmBlock, ".catch(() => undefined)");
    assert.include(prewarmBlock, "prewarmSynthesisSurfacesPromise = undefined");
    assert.include(
      publishPrewarmPhaseBlock,
      "prewarmedSynthesisSnapshotInput = mergeSynthesisUiSnapshotInput",
    );
    const cacheMergeIndex = publishPrewarmPhaseBlock.indexOf(
      "prewarmedSynthesisSnapshotInput = mergeSynthesisUiSnapshotInput",
    );
    const currentRuntimeIndex = publishPrewarmPhaseBlock.indexOf(
      "const runtime = synthesisWorkbenchTab",
    );
    const runtimeMergeIndex = publishPrewarmPhaseBlock.indexOf(
      "mergeRuntimeSnapshotInput",
    );
    assert.isAbove(currentRuntimeIndex, cacheMergeIndex);
    assert.isAbove(runtimeMergeIndex, currentRuntimeIndex);
    assert.include(publishPrewarmPhaseBlock, "sendChrome");
    assert.include(publishPrewarmPhaseBlock, "markSurfaceLoaded");
    assert.include(publishPrewarmPhaseBlock, "isActiveSurface");
    assert.include(publishPrewarmPhaseBlock, "sendSurface");
    assert.include(publishPrewarmPhaseBlock, "refreshFromService: false");
    const libraryAdapter = await fs.readFile(
      "src/modules/synthesis/libraryAdapter.ts",
      "utf8",
    );
    const pageStart = libraryAdapter.indexOf("async function listItemsPage");
    const pageEnd = libraryAdapter.indexOf("async function getItemsByRef");
    assert.isAtLeast(pageStart, 0, "Host listItemsPage should exist");
    assert.isAbove(pageEnd, pageStart, "Host listItemsPage should be bounded");
    const pageBlock = libraryAdapter.slice(pageStart, pageEnd);
    assert.include(pageBlock, "queryZoteroLibraryPage");
    assert.include(pageBlock, "SYNTHESIS_HOST_READ_PAGE_LIMIT_MAX");
    assert.notInclude(pageBlock, "getAllRegularZoteroItems");
    assert.include(libraryAdapter, "getItemsByRef");
    const nativeComposition = await fs.readFile(
      "src/modules/synthesisClient/nativeComposition.ts",
      "utf8",
    );
    assert.include(nativeComposition, "createSynthesisSidecarRpcClient");
    assert.include(nativeComposition, "createSynthesisClientFromPort");
    assert.notInclude(nativeComposition, "synthesis/service");
    assert.notInclude(nativeComposition, "synthesis/repository");
  });

  it("wires asynchronous Workbench action feedback and host single-flight", async function () {
    const host = await fs.readFile(
      "src/modules/synthesisWorkbenchTab.ts",
      "utf8",
    );

    assert.include(host, "inFlightCommands");
    assert.include(host, "runWorkbenchCommandOnce");
    assert.include(host, "commandProgressTimer");
    assert.include(host, "ensureCommandProgressPolling");
    assert.notInclude(host, "notifyWorkbenchCommandProgress");
    assert.include(host, "refreshWorkbenchCommandProgress");
    const progressBlock = extractFunctionBlock(
      host,
      "refreshWorkbenchCommandProgress",
    );
    assert.match(progressBlock, /client\.workbench\s*\.readProgress/);
    assert.include(progressBlock, "toSynthesisUiSnapshotInput");
    assert.include(progressBlock, "mergeRuntimeSnapshotInput");
    assert.notInclude(progressBlock, "getDefaultSynthesisService");
    assert.notInclude(progressBlock, "getSynthesisBackgroundJobRows");
    assert.include(host, "refreshFromService: false");
    assert.notMatch(
      host,
      /notifyWorkbenchCommandProgress[\s\S]{0,240}refreshFromService: true/,
    );
    assert.notMatch(
      host,
      /ensureCommandProgressPolling[\s\S]{0,360}refreshFromService: true/,
    );
    assert.include(host, "This action is already running.");
  });
  it("guards Workbench index rebuild commands and defers heavy rebuild start", async function () {
    const host = await fs.readFile(
      "src/modules/synthesisWorkbenchTab.ts",
      "utf8",
    );
    const runtime = await fs.readFile(
      "src/utils/runtimeCompatibility.ts",
      "utf8",
    );
    const i18n = await fs.readFile("src/synthesisWorkbenchI18n.ts", "utf8");
    const protectedCommands = [
      "refreshReferenceSidecarNow",
      "rebuildCitationGraphCacheNow",
      "rebuildTagVocabularyIndex",
      "rebuildConceptKbIndex",
      "rebuildTopicGraphIndex",
    ];

    assert.include(host, "isProtectedRebuildCommand");
    assert.include(host, "confirmProtectedRebuildCommand");
    assert.include(host, "confirmWorkbenchAction");
    assert.include(host, "resolveSynthesisWorkbenchMessage(");
    assert.include(host, "synthesis-confirm-refresh-reference-sidecar");
    assert.include(host, "synthesis-confirm-advanced-reference-matching");
    assert.include(host, "synthesis-confirm-rebuild-local-indexes");
    assert.include(host, "synthesis-confirm-delete-topic-artifact");
    assert.include(host, "synthesis-confirm-purge-deleted-topic-artifacts");
    assert.include(i18n, "synthesis-confirm-refresh-reference-sidecar");
    assert.include(i18n, "synthesis-confirm-advanced-reference-matching");
    assert.include(i18n, "synthesis-confirm-rebuild-local-indexes");
    assert.include(i18n, "synthesis-confirm-delete-topic-artifact");
    assert.include(i18n, "synthesis-confirm-purge-deleted-topic-artifacts");
    assert.notInclude(
      host,
      "will run a heavier reference matching pass over unbound references",
    );
    assert.notInclude(host, "will rebuild local Synthesis indexes");
    assert.notInclude(host, "Delete this synthesis artifact?");
    assert.notInclude(host, "Permanently purge deleted synthesis artifacts?");
    assert.include(host, "deferStart?: boolean");
    assert.include(host, "globalThis.setTimeout(() => void start(), 0)");
    assert.include(host, "SYNTHESIS_WORKBENCH_COMMAND_PROGRESS_INTERVAL_MS");
    assert.match(host, /client\.topicGraph\s*\.rebuildTopicGraphIndex\(\)/);
    assert.match(host, /client\.tags\s*\.rebuildTagVocabularyIndex\(\)/);
    assert.notInclude(host, "notifyWorkbenchCommandProgress");
    assert.notInclude(
      host,
      'retryReferenceSidecarRefresh" &&\n    !confirmProtectedRebuildCommand',
    );
    for (const command of protectedCommands) {
      assert.include(host, `command === "${command}"`);
      assert.match(
        host,
        new RegExp(`${command}[\\s\\S]{0,260}deferStart: true`),
      );
    }
    assert.include(runtime, "export async function yieldToEventLoop");
    assert.include(runtime, "globalThis.setTimeout");
  });
});
