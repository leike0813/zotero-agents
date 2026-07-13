import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { assert } from "chai";
import { classifyAcpTranscriptSessionUpdate } from "../../src/modules/acpTranscriptBoundary";
import {
  ACP_RUNTIME_SEMANTIC_TRACE_SCHEMA,
  loadAcpRuntimeSemanticTrace,
  parseAcpRuntimeSemanticTraceNdjson,
} from "../../src/modules/acpRuntimeSemanticTrace";
import {
  armAcpRuntimeSemanticTraceRecorder,
  discardAcpRuntimeSemanticTracePartialForTests,
  getAcpRuntimeSemanticTraceRecorderView,
  recordAcpRuntimeSemanticTraceEvent,
  saveFrozenAcpRuntimeSemanticTrace,
  stopAcpRuntimeSemanticTraceRecorder,
} from "../../src/modules/acpRuntimeSemanticTraceRecorder";
import { setDebugModeOverrideForTests } from "../../src/modules/debugMode";
import { resetAcpRuntimeDiagnosticsModeForTests } from "../../src/modules/acpRuntimeDiagnosticsMode";

async function assertRejects(promise: Promise<unknown>, pattern: RegExp) {
  try {
    await promise;
    assert.fail("expected promise to reject");
  } catch (error) {
    assert.match(
      error instanceof Error ? error.message : String(error),
      pattern,
    );
  }
}

describe("ACP runtime semantic trace", function () {
  this.timeout(10_000);

  let tempRoot = "";
  let monotonic = 100;

  beforeEach(async function () {
    tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "zs-acp-trace-"));
    monotonic = 100;
    setDebugModeOverrideForTests(true);
    resetAcpRuntimeDiagnosticsModeForTests();
  });

  afterEach(async function () {
    await discardAcpRuntimeSemanticTracePartialForTests();
    resetAcpRuntimeDiagnosticsModeForTests();
    setDebugModeOverrideForTests();
    await fs.rm(tempRoot, { recursive: true, force: true });
  });

  it("arms and records when the host has no performance global", async function () {
    const descriptor = Object.getOwnPropertyDescriptor(
      globalThis,
      "performance",
    );
    Object.defineProperty(globalThis, "performance", {
      configurable: true,
      value: undefined,
    });
    try {
      await armAcpRuntimeSemanticTraceRecorder({
        sourceKind: "acp-chat-conversation",
        root: tempRoot,
      });
      const owner = {
        rootId: "chat-without-performance",
        conversationId: "conversation-without-performance",
      };
      await recordAcpRuntimeSemanticTraceEvent({
        kind: "root-start",
        sourceKind: "acp-chat-conversation",
        owner,
        payload: {},
      });
      await recordAcpRuntimeSemanticTraceEvent({
        kind: "root-end",
        sourceKind: "acp-chat-conversation",
        owner,
        payload: { outcome: "complete" },
      });
      const frozen = await stopAcpRuntimeSemanticTraceRecorder();
      assert.equal(frozen.completion, "complete");
      const saved = await saveFrozenAcpRuntimeSemanticTrace();
      const trace = await loadAcpRuntimeSemanticTrace(saved.path);
      const offsets = trace.events.map((event) => event.monotonicOffsetMs);
      assert.lengthOf(offsets, 2);
      assert.isTrue(offsets.every(Number.isFinite));
      assert.isAtLeast(offsets[0], 0);
      assert.isAtLeast(offsets[1], offsets[0]);
    } finally {
      if (descriptor) {
        Object.defineProperty(globalThis, "performance", descriptor);
      } else {
        delete (globalThis as { performance?: unknown }).performance;
      }
    }
  });

  it("preserves complete multi-turn Chat payloads and recomputes boundaries", async function () {
    await armAcpRuntimeSemanticTraceRecorder({
      sourceKind: "acp-chat-conversation",
      root: tempRoot,
      nowMs: 1_750_000_000_000,
      monotonicNow: () => monotonic,
    });
    const owner = { rootId: "chat-root", conversationId: "conversation-a" };
    await recordAcpRuntimeSemanticTraceEvent({
      kind: "root-start",
      sourceKind: "acp-chat-conversation",
      owner,
      payload: { backendId: "backend-is-semantic-not-authorization" },
    });
    for (const [turnId, prompt] of [
      ["turn-1", "full prompt with secret alpha"],
      ["turn-2", "full prompt with secret beta"],
    ] as const) {
      monotonic += 5;
      await recordAcpRuntimeSemanticTraceEvent({
        kind: "turn-start",
        sourceKind: "acp-chat-conversation",
        owner: { ...owner, turnId },
        payload: { prompt },
      });
      monotonic += 5;
      await recordAcpRuntimeSemanticTraceEvent({
        kind: "session-notification",
        sourceKind: "acp-chat-conversation",
        owner: { ...owner, turnId, sessionId: "session-a" },
        payload: {
          sessionId: "session-a",
          update: {
            sessionUpdate: "agent_message_chunk",
            content: { type: "text", text: "untruncated assistant output" },
            toolArgs: { nested: { exact: true } },
          },
        },
      });
      await recordAcpRuntimeSemanticTraceEvent({
        kind: "turn-end",
        sourceKind: "acp-chat-conversation",
        owner: { ...owner, turnId },
        payload: { outcome: "complete" },
      });
    }
    await recordAcpRuntimeSemanticTraceEvent({
      kind: "root-end",
      sourceKind: "acp-chat-conversation",
      owner,
      payload: { outcome: "complete" },
    });

    const frozen = await stopAcpRuntimeSemanticTraceRecorder();
    assert.equal(frozen.completion, "complete");
    const saved = await saveFrozenAcpRuntimeSemanticTrace();
    const trace = await loadAcpRuntimeSemanticTrace(saved.path);
    assert.equal(trace.header.schema, ACP_RUNTIME_SEMANTIC_TRACE_SCHEMA);
    assert.equal(trace.header.sourceKind, "acp-chat-conversation");
    assert.deepEqual(
      trace.events.map((event) => event.seq),
      [1, 2, 3, 4, 5, 6, 7, 8],
    );
    assert.equal(
      (trace.events[2].payload as any).update.content.text,
      "untruncated assistant output",
    );
    assert.notProperty(trace.events[2], "transcriptBoundary");
    assert.equal(
      classifyAcpTranscriptSessionUpdate(
        (trace.events[2].payload as any).update.sessionUpdate,
      ),
      "text-continuation",
    );
    assert.equal((await fs.stat(saved.path)).mode & 0o777, 0o600);
  });

  it("retains interleaved Workflow request hierarchy and ignores other roots", async function () {
    await armAcpRuntimeSemanticTraceRecorder({
      sourceKind: "acp-workflow-execution",
      root: tempRoot,
      monotonicNow: () => monotonic,
    });
    const root = {
      rootId: "workflow-root",
      workflowId: "workflow-a",
      workflowRunId: "run-a",
      jobId: "job-a",
    };
    await recordAcpRuntimeSemanticTraceEvent({
      kind: "root-start",
      sourceKind: "acp-workflow-execution",
      owner: root,
      payload: {},
    });
    for (const requestId of ["request-a", "request-b"]) {
      await recordAcpRuntimeSemanticTraceEvent({
        kind: "request-start",
        sourceKind: "acp-workflow-execution",
        owner: { ...root, stageId: `stage-${requestId}`, requestId },
        payload: {},
      });
    }
    for (const requestId of ["request-b", "request-a"]) {
      await recordAcpRuntimeSemanticTraceEvent({
        kind: "request-end",
        sourceKind: "acp-workflow-execution",
        owner: { ...root, stageId: `stage-${requestId}`, requestId },
        payload: { outcome: "complete" },
      });
    }
    assert.isFalse(
      await recordAcpRuntimeSemanticTraceEvent({
        kind: "root-start",
        sourceKind: "acp-chat-conversation",
        owner: { rootId: "other-root" },
        payload: {},
      }),
    );
    await recordAcpRuntimeSemanticTraceEvent({
      kind: "root-end",
      sourceKind: "acp-workflow-execution",
      owner: root,
      payload: {},
    });
    const frozen = await stopAcpRuntimeSemanticTraceRecorder();
    assert.equal(frozen.completion, "complete");
    assert.equal(frozen.eventCount, 6);
  });

  it("freezes incomplete instead of dropping quota failures", async function () {
    await armAcpRuntimeSemanticTraceRecorder({
      sourceKind: "acp-chat-conversation",
      root: tempRoot,
      limits: { maxEvents: 1 },
    });
    await recordAcpRuntimeSemanticTraceEvent({
      kind: "root-start",
      sourceKind: "acp-chat-conversation",
      owner: { rootId: "root-a" },
      payload: {},
    });
    assert.isFalse(
      await recordAcpRuntimeSemanticTraceEvent({
        kind: "root-end",
        sourceKind: "acp-chat-conversation",
        owner: { rootId: "root-a" },
        payload: {},
      }),
    );
    assert.deepInclude(getAcpRuntimeSemanticTraceRecorderView(), {
      state: "frozen",
      completion: "incomplete",
      eventCount: 1,
    });
    assert.equal(
      getAcpRuntimeSemanticTraceRecorderView().warnings[0]?.code,
      "event-limit",
    );
  });

  it("keeps a crash partial and rejects missing, corrupt, and mismatched footers", async function () {
    const armed = await armAcpRuntimeSemanticTraceRecorder({
      sourceKind: "acp-chat-conversation",
      root: tempRoot,
    });
    assert.match(armed.partialPath || "", /\.ndjson\.partial$/);
    assert.isTrue(await fs.stat(armed.partialPath || "").then(() => true));
    await assertRejects(
      loadAcpRuntimeSemanticTrace(armed.partialPath || ""),
      /incomplete|footer/,
    );

    await assertRejects(
      parseAcpRuntimeSemanticTraceNdjson(
        '{"record":"header","schema":"bad"}\nnot-json\n',
      ),
      /invalid NDJSON/,
    );
    const content = await fs.readFile(armed.partialPath || "", "utf8");
    const fakeFooter = {
      record: "footer",
      eventCount: 0,
      contentBytes: Buffer.byteLength(content),
      sha256: "0".repeat(64),
      completion: "complete",
      warnings: [],
    };
    await assertRejects(
      parseAcpRuntimeSemanticTraceNdjson(
        `${content}${JSON.stringify(fakeFooter)}\n`,
      ),
      /integrity/,
    );
  });

  it("marks stop with an active turn incomplete and refuses baseline save", async function () {
    await armAcpRuntimeSemanticTraceRecorder({
      sourceKind: "acp-chat-conversation",
      root: tempRoot,
    });
    await recordAcpRuntimeSemanticTraceEvent({
      kind: "root-start",
      sourceKind: "acp-chat-conversation",
      owner: { rootId: "root-a" },
      payload: {},
    });
    await recordAcpRuntimeSemanticTraceEvent({
      kind: "turn-start",
      sourceKind: "acp-chat-conversation",
      owner: { rootId: "root-a", turnId: "turn-a" },
      payload: {},
    });
    const frozen = await stopAcpRuntimeSemanticTraceRecorder();
    assert.equal(frozen.completion, "incomplete");
    assert.equal(frozen.warnings[0]?.code, "active-owner");
    await assertRejects(
      saveFrozenAcpRuntimeSemanticTrace(),
      /not a complete frozen trace/,
    );
  });
});
