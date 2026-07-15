import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { assert } from "chai";
import { classifyAcpTranscriptSessionUpdate } from "../../src/modules/acpTranscriptBoundary";
import {
  ACP_RUNTIME_SEMANTIC_TRACE_SCHEMA,
  acpRuntimeSemanticTraceByteLength,
  encodeAcpRuntimeSemanticTraceLine,
  encodeAcpRuntimeSemanticTraceText,
  loadAcpRuntimeSemanticTrace,
  parseAcpRuntimeSemanticTraceNdjson,
} from "../../src/modules/acpRuntimeSemanticTrace";
import { sha256Hex } from "../../src/utils/sha256";
import {
  armAcpRuntimeSemanticTraceRecorder,
  beginAcpRuntimeSemanticTraceClaimAttempt,
  cancelAcpRuntimeSemanticTraceRecorder,
  claimAcpRuntimeSemanticTraceRoot,
  discardAcpRuntimeSemanticTracePartialForTests,
  finishAcpRuntimeSemanticTraceRoot,
  getAcpRuntimeSemanticTraceRecorderView,
  recordAcpRuntimeSemanticTraceEvent,
  resetAcpRuntimeSemanticTraceRecorder,
  saveFrozenAcpRuntimeSemanticTrace,
} from "../../src/modules/acpRuntimeSemanticTraceRecorder";
import { setDebugModeOverrideForTests } from "../../src/modules/debugMode";
import {
  getAcpRuntimeDiagnosticsMode,
  resetAcpRuntimeDiagnosticsModeForTests,
} from "../../src/modules/acpRuntimeDiagnosticsMode";

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

  async function claimChatRoot(owner: {
    rootId: string;
    conversationId: string;
    sessionId: string;
  }) {
    const attempt = beginAcpRuntimeSemanticTraceClaimAttempt(
      "acp-chat-conversation",
    );
    assert.exists(attempt);
    const context = await claimAcpRuntimeSemanticTraceRoot({
      attempt: attempt!,
      binding: {
        sourceKind: "acp-chat-conversation",
        backendId: owner.rootId.split("\n", 1)[0] || "backend-a",
        conversationId: owner.conversationId,
        sessionId: owner.sessionId,
        attachKind: "new",
      },
      owner,
      payload: { attachKind: "new" },
    });
    assert.exists(context);
    return context!;
  }

  async function claimWorkflowRoot(owner: {
    rootId: string;
    workflowId: string;
    workflowRunId: string;
    jobId?: string;
  }) {
    const attempt = beginAcpRuntimeSemanticTraceClaimAttempt(
      "acp-workflow-execution",
    );
    assert.exists(attempt);
    const context = await claimAcpRuntimeSemanticTraceRoot({
      attempt: attempt!,
      binding: {
        sourceKind: "acp-workflow-execution",
        workflowId: owner.workflowId,
        workflowRunId: owner.workflowRunId,
      },
      owner,
      payload: {},
    });
    assert.exists(context);
    return context!;
  }

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

  it("claims explicitly, ignores stale or mismatched authority, and defers finish", async function () {
    await armAcpRuntimeSemanticTraceRecorder({
      sourceKind: "acp-chat-conversation",
      root: tempRoot,
    });
    const owner = {
      rootId: "backend-a\nconversation-a",
      conversationId: "conversation-a",
      sessionId: "session-a",
    };
    assert.isFalse(
      await recordAcpRuntimeSemanticTraceEvent(undefined, {
        kind: "session-notification",
        sourceKind: "acp-chat-conversation",
        owner,
        payload: {},
      }),
    );
    assert.deepInclude(getAcpRuntimeSemanticTraceRecorderView(), {
      state: "armed",
      eventCount: 0,
    });

    const staleAttempt = beginAcpRuntimeSemanticTraceClaimAttempt(
      "acp-chat-conversation",
    );
    const winningAttempt = beginAcpRuntimeSemanticTraceClaimAttempt(
      "acp-chat-conversation",
    );
    assert.exists(staleAttempt);
    assert.exists(winningAttempt);
    const context = await claimAcpRuntimeSemanticTraceRoot({
      attempt: winningAttempt!,
      binding: {
        sourceKind: "acp-chat-conversation",
        backendId: "backend-a",
        conversationId: "conversation-a",
        sessionId: "session-a",
        attachKind: "new",
      },
      owner,
      payload: { attachKind: "new" },
    });
    assert.exists(context);
    assert.isUndefined(
      await claimAcpRuntimeSemanticTraceRoot({
        attempt: staleAttempt!,
        binding: {
          sourceKind: "acp-chat-conversation",
          backendId: "backend-b",
          conversationId: "conversation-b",
          sessionId: "session-b",
          attachKind: "resume",
        },
        owner: {
          rootId: "backend-b\nconversation-b",
          conversationId: "conversation-b",
          sessionId: "session-b",
        },
        payload: {},
      }),
    );
    assert.deepInclude(getAcpRuntimeSemanticTraceRecorderView().binding, {
      sessionId: "session-a",
    });

    assert.isFalse(
      await recordAcpRuntimeSemanticTraceEvent(context, {
        kind: "session-notification",
        sourceKind: "acp-chat-conversation",
        owner: { ...owner, sessionId: "session-b" },
        payload: {},
      }),
    );
    assert.isTrue(
      await recordAcpRuntimeSemanticTraceEvent(context, {
        kind: "turn-start",
        sourceKind: "acp-chat-conversation",
        owner: { ...owner, turnId: "turn-a" },
        payload: {},
      }),
    );
    await recordAcpRuntimeSemanticTraceEvent(context, {
      kind: "turn-end",
      sourceKind: "acp-chat-conversation",
      owner: { ...owner, turnId: "turn-a" },
      payload: { outcome: "complete" },
    });
    await recordAcpRuntimeSemanticTraceEvent(context, {
      kind: "turn-start",
      sourceKind: "acp-chat-conversation",
      owner: { ...owner, turnId: "turn-b" },
      payload: {},
    });
    const stopping = await finishAcpRuntimeSemanticTraceRoot({
      context,
      payload: { outcome: "complete" },
    });
    assert.deepInclude(stopping, {
      state: "stopping",
      activeTurnCount: 1,
      canFinish: true,
    });
    assert.isFalse(
      await recordAcpRuntimeSemanticTraceEvent(context, {
        kind: "turn-start",
        sourceKind: "acp-chat-conversation",
        owner: { ...owner, turnId: "turn-c" },
        payload: {},
      }),
    );
    await recordAcpRuntimeSemanticTraceEvent(context, {
      kind: "turn-end",
      sourceKind: "acp-chat-conversation",
      owner: { ...owner, turnId: "turn-b" },
      payload: { outcome: "complete" },
    });
    assert.deepInclude(getAcpRuntimeSemanticTraceRecorderView(), {
      state: "frozen",
      completion: "complete",
      activeTurnCount: 0,
    });
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
        sessionId: "session-without-performance",
      };
      const context = await claimChatRoot(owner);
      await recordAcpRuntimeSemanticTraceEvent(context, {
        kind: "turn-start",
        sourceKind: "acp-chat-conversation",
        owner: { ...owner, turnId: "turn-without-performance" },
        payload: {},
      });
      await recordAcpRuntimeSemanticTraceEvent(context, {
        kind: "turn-end",
        sourceKind: "acp-chat-conversation",
        owner: { ...owner, turnId: "turn-without-performance" },
        payload: { outcome: "complete" },
      });
      const frozen = await finishAcpRuntimeSemanticTraceRoot({ context });
      assert.equal(frozen.completion, "complete");
      const saved = await saveFrozenAcpRuntimeSemanticTrace();
      const trace = await loadAcpRuntimeSemanticTrace(saved.path);
      const offsets = trace.events.map((event) => event.monotonicOffsetMs);
      assert.lengthOf(offsets, 4);
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
    const owner = {
      rootId: "backend-is-semantic-not-authorization\nconversation-a",
      conversationId: "conversation-a",
      sessionId: "session-a",
    };
    const context = await claimChatRoot(owner);
    for (const [turnId, prompt] of [
      ["turn-1", "full prompt with secret alpha"],
      ["turn-2", "full prompt with secret beta"],
    ] as const) {
      monotonic += 5;
      await recordAcpRuntimeSemanticTraceEvent(context, {
        kind: "turn-start",
        sourceKind: "acp-chat-conversation",
        owner: { ...owner, turnId },
        payload: { prompt },
      });
      monotonic += 5;
      await recordAcpRuntimeSemanticTraceEvent(context, {
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
      await recordAcpRuntimeSemanticTraceEvent(context, {
        kind: "turn-end",
        sourceKind: "acp-chat-conversation",
        owner: { ...owner, turnId },
        payload: { outcome: "complete" },
      });
    }
    const frozen = await finishAcpRuntimeSemanticTraceRoot({ context });
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
    const context = await claimWorkflowRoot(root);
    for (const requestId of ["request-a", "request-b"]) {
      await recordAcpRuntimeSemanticTraceEvent(context, {
        kind: "request-start",
        sourceKind: "acp-workflow-execution",
        owner: { ...root, stageId: `stage-${requestId}`, requestId },
        payload: {},
      });
    }
    for (const requestId of ["request-b", "request-a"]) {
      await recordAcpRuntimeSemanticTraceEvent(context, {
        kind: "request-end",
        sourceKind: "acp-workflow-execution",
        owner: { ...root, stageId: `stage-${requestId}`, requestId },
        payload: { outcome: "complete" },
      });
    }
    assert.isFalse(
      await recordAcpRuntimeSemanticTraceEvent(context, {
        kind: "root-start",
        sourceKind: "acp-chat-conversation",
        owner: { rootId: "other-root" },
        payload: {},
      }),
    );
    const frozen = await finishAcpRuntimeSemanticTraceRoot({ context });
    assert.equal(frozen.completion, "complete");
    assert.equal(frozen.eventCount, 6);
  });

  it("freezes incomplete instead of dropping quota failures", async function () {
    await armAcpRuntimeSemanticTraceRecorder({
      sourceKind: "acp-chat-conversation",
      root: tempRoot,
      limits: { maxEvents: 2 },
    });
    const owner = {
      rootId: "backend-a\nconversation-a",
      conversationId: "conversation-a",
      sessionId: "session-a",
    };
    const context = await claimChatRoot(owner);
    await recordAcpRuntimeSemanticTraceEvent(context, {
      kind: "turn-start",
      sourceKind: "acp-chat-conversation",
      owner: { ...owner, turnId: "turn-a" },
      payload: {},
    });
    assert.isFalse(
      await recordAcpRuntimeSemanticTraceEvent(context, {
        kind: "turn-end",
        sourceKind: "acp-chat-conversation",
        owner: { ...owner, turnId: "turn-a" },
        payload: {},
      }),
    );
    assert.deepInclude(getAcpRuntimeSemanticTraceRecorderView(), {
      state: "frozen",
      completion: "incomplete",
      eventCount: 2,
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

  it("rejects complete traces without one root pair and a complete activity", async function () {
    const header = {
      record: "header",
      schema: ACP_RUNTIME_SEMANTIC_TRACE_SCHEMA,
      sourceKind: "acp-chat-conversation",
      createdAt: "2026-07-15T00:00:00.000Z",
    } as const;
    const owner = {
      rootId: "backend-a\nconversation-a",
      conversationId: "conversation-a",
      sessionId: "session-a",
    };
    async function encodeComplete(events: unknown[]) {
      const content = [header, ...events]
        .map(encodeAcpRuntimeSemanticTraceLine)
        .join("");
      const digest = await sha256Hex(
        encodeAcpRuntimeSemanticTraceText(content),
      );
      return `${content}${encodeAcpRuntimeSemanticTraceLine({
        record: "footer",
        eventCount: events.length,
        contentBytes: acpRuntimeSemanticTraceByteLength(content),
        sha256: digest,
        completion: "complete",
        warnings: [],
      })}`;
    }
    const rootStart = {
      record: "event",
      seq: 1,
      monotonicOffsetMs: 0,
      kind: "root-start",
      sourceKind: "acp-chat-conversation",
      owner,
      payload: {},
    };
    await assertRejects(
      parseAcpRuntimeSemanticTraceNdjson(
        await encodeComplete([
          rootStart,
          {
            ...rootStart,
            seq: 2,
            kind: "root-end",
            monotonicOffsetMs: 1,
          },
        ]),
      ),
      /activity boundary/,
    );
    await assertRejects(
      parseAcpRuntimeSemanticTraceNdjson(
        await encodeComplete([
          rootStart,
          {
            ...rootStart,
            seq: 2,
            kind: "turn-start",
            monotonicOffsetMs: 1,
            owner: { ...owner, turnId: "turn-a" },
          },
          {
            ...rootStart,
            seq: 3,
            kind: "turn-end",
            monotonicOffsetMs: 2,
            owner: { ...owner, turnId: "turn-a" },
          },
        ]),
      ),
      /root boundary/,
    );
  });

  it("does not finish an empty session or its first active turn", async function () {
    await armAcpRuntimeSemanticTraceRecorder({
      sourceKind: "acp-chat-conversation",
      root: tempRoot,
    });
    const owner = {
      rootId: "backend-a\nconversation-a",
      conversationId: "conversation-a",
      sessionId: "session-a",
    };
    const context = await claimChatRoot(owner);
    assert.deepInclude(await finishAcpRuntimeSemanticTraceRoot(), {
      state: "recording",
      canFinish: false,
    });
    await recordAcpRuntimeSemanticTraceEvent(context, {
      kind: "turn-start",
      sourceKind: "acp-chat-conversation",
      owner: { ...owner, turnId: "turn-a" },
      payload: {},
    });
    const unchanged = await finishAcpRuntimeSemanticTraceRoot();
    assert.deepInclude(unchanged, {
      state: "recording",
      canFinish: false,
      activeTurnCount: 1,
    });
    await assertRejects(
      saveFrozenAcpRuntimeSemanticTrace(),
      /not a complete frozen trace/,
    );
    const canceled = await cancelAcpRuntimeSemanticTraceRecorder();
    assert.equal(canceled.completion, "incomplete");
  });

  it("cancels to a preserved incomplete partial and starts another round", async function () {
    const first = await armAcpRuntimeSemanticTraceRecorder({
      sourceKind: "acp-chat-conversation",
      root: tempRoot,
    });
    const staleAttempt = beginAcpRuntimeSemanticTraceClaimAttempt(
      "acp-chat-conversation",
    );
    const canceled = await cancelAcpRuntimeSemanticTraceRecorder();
    assert.equal(canceled.state, "frozen");
    assert.equal(canceled.completion, "incomplete");
    assert.equal(canceled.warnings[0]?.code, "user-canceled");
    assert.equal(getAcpRuntimeDiagnosticsMode(), "idle");
    assert.isTrue(await fs.stat(first.partialPath || "").then(() => true));
    const canceledTrace = await loadAcpRuntimeSemanticTrace(
      first.partialPath || "",
    );
    assert.equal(canceledTrace.footer.completion, "incomplete");
    assert.equal(canceledTrace.footer.warnings[0]?.code, "user-canceled");

    await resetAcpRuntimeSemanticTraceRecorder();
    assert.equal(getAcpRuntimeSemanticTraceRecorderView().state, "idle");
    const second = await armAcpRuntimeSemanticTraceRecorder({
      sourceKind: "acp-chat-conversation",
      root: tempRoot,
    });
    assert.notEqual(second.partialPath, first.partialPath);
    assert.isUndefined(
      await claimAcpRuntimeSemanticTraceRoot({
        attempt: staleAttempt!,
        binding: {
          sourceKind: "acp-chat-conversation",
          backendId: "stale-backend",
          conversationId: "stale-conversation",
          sessionId: "stale-session",
          attachKind: "new",
        },
        owner: {
          rootId: "stale-backend\nstale-conversation",
          conversationId: "stale-conversation",
          sessionId: "stale-session",
        },
        payload: {},
      }),
    );
  });

  it("resets a saved round without deleting its trace", async function () {
    await armAcpRuntimeSemanticTraceRecorder({
      sourceKind: "acp-chat-conversation",
      root: tempRoot,
    });
    const owner = {
      rootId: "backend-a\nconversation-a",
      conversationId: "conversation-a",
      sessionId: "session-a",
    };
    const context = await claimChatRoot(owner);
    await recordAcpRuntimeSemanticTraceEvent(context, {
      kind: "turn-start",
      sourceKind: "acp-chat-conversation",
      owner: { ...owner, turnId: "turn-a" },
      payload: {},
    });
    await recordAcpRuntimeSemanticTraceEvent(context, {
      kind: "turn-end",
      sourceKind: "acp-chat-conversation",
      owner: { ...owner, turnId: "turn-a" },
      payload: {},
    });
    await finishAcpRuntimeSemanticTraceRoot({ context });
    const saved = await saveFrozenAcpRuntimeSemanticTrace();
    await resetAcpRuntimeSemanticTraceRecorder();
    assert.equal(getAcpRuntimeSemanticTraceRecorderView().state, "idle");
    assert.isTrue(await fs.stat(saved.path).then(() => true));
    const next = await armAcpRuntimeSemanticTraceRecorder({
      sourceKind: "acp-chat-conversation",
      root: tempRoot,
    });
    assert.match(next.partialPath || "", /\.ndjson\.partial$/);
  });

  it("releases diagnostic ownership when recorder setup fails", async function () {
    const blockedRoot = path.join(tempRoot, "not-a-directory");
    await fs.writeFile(blockedRoot, "blocked", "utf8");
    await assertRejects(
      armAcpRuntimeSemanticTraceRecorder({
        sourceKind: "acp-chat-conversation",
        root: blockedRoot,
      }),
      /ENOTDIR|not a directory/i,
    );
    assert.equal(getAcpRuntimeDiagnosticsMode(), "idle");
    assert.deepInclude(getAcpRuntimeSemanticTraceRecorderView(), {
      state: "frozen",
      completion: "incomplete",
    });
    await resetAcpRuntimeSemanticTraceRecorder();
    await armAcpRuntimeSemanticTraceRecorder({
      sourceKind: "acp-chat-conversation",
      root: tempRoot,
    });
    assert.equal(getAcpRuntimeSemanticTraceRecorderView().state, "armed");
  });
});
