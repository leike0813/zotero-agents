import { assert } from "chai";
import {
  createAcpRuntimeReplayLogicalTime,
  type AcpRuntimeReplayLogicalTimerDescriptor,
} from "../../src/modules/acpRuntimeReplayLogicalTime";
import {
  cleanupSyntheticAcpChatReplay,
  inspectSyntheticAcpChatReplayTimers,
} from "../../src/modules/acpSessionManager";
import {
  appendAcpSkillRunUserReply,
  cleanupSyntheticAcpSkillRunReplay,
  getSelectedAcpSkillRunRequestId,
  inspectSyntheticAcpSkillRunReplayTimers,
  selectAcpSkillRun,
} from "../../src/modules/acpSkillRunStore";
import {
  createAcpChatRuntimeReplayTarget,
  createAcpWorkflowRuntimeReplayTarget,
} from "../../src/modules/acpRuntimeReplayTargets";
import {
  ACP_RUNTIME_SEMANTIC_TRACE_SCHEMA,
  type AcpRuntimeSemanticTraceEvent,
} from "../../src/modules/acpRuntimeSemanticTrace";
import { createAcpRuntimeReplayProductionLogicalTimePort } from "../../src/modules/acpRuntimeReplayProductionPorts";
import { replayAcpRuntimeSemanticTrace } from "../../src/modules/acpRuntimeReplayProfiler";
import { setDebugModeOverrideForTests } from "../../src/modules/debugMode";
import { inspectAssistantWorkspaceReplayPostSnapshotTimer } from "../../src/modules/assistantWorkspaceSidebar";

type FakeTimer = {
  token: object;
  current: boolean;
  delayMs: number;
  domain: AcpRuntimeReplayLogicalTimerDescriptor["domain"];
  ownerKey: string;
  fire: () => void | Promise<void>;
};

function descriptor(timer: FakeTimer): AcpRuntimeReplayLogicalTimerDescriptor {
  const capturedToken = timer.token;
  return {
    domain: timer.domain,
    ownerKey: timer.ownerKey,
    delayMs: timer.delayMs,
    nativeToken: capturedToken,
    detachNative: () => timer.current && timer.token === capturedToken,
    fireIfCurrent: async () => {
      if (!timer.current || timer.token !== capturedToken) return false;
      timer.current = false;
      await timer.fire();
      return true;
    },
    resumeNative: (remainingMs) => {
      if (!timer.current || timer.token !== capturedToken) return false;
      timer.delayMs = remainingMs;
      timer.token = {};
      return true;
    },
  };
}

describe("ACP runtime replay logical time", function () {
  beforeEach(function () {
    setDebugModeOverrideForTests(true);
  });

  afterEach(async function () {
    await cleanupSyntheticAcpChatReplay({
      backendId: "acp-replay",
      conversationId: "logical-chat-conversation",
    });
    await cleanupSyntheticAcpSkillRunReplay(["logical-skill-request"]);
    setDebugModeOverrideForTests();
  });

  it("fires deadlines before the event offset and preserves registration order", async function () {
    const order: string[] = [];
    const timers: FakeTimer[] = [
      {
        token: {},
        current: true,
        delayMs: 160,
        domain: "acp-chat-ui-emit",
        ownerKey: "chat",
        fire: () => void order.push("first"),
      },
      {
        token: {},
        current: true,
        delayMs: 160,
        domain: "acp-skill-run-change",
        ownerKey: "run",
        fire: () => void order.push("second"),
      },
    ];
    const logical = createAcpRuntimeReplayLogicalTime({
      inspect: () => ({ timers: timers.map(descriptor), warnings: [] }),
      yieldToMacrotask: async () => void order.push("yield"),
    });

    await logical.captureAt(0);
    await logical.advanceTo(159);
    assert.deepEqual(order, []);
    await logical.advanceTo(160);
    order.push("event");

    assert.deepEqual(order, ["first", "second", "yield", "event"]);
  });

  it("captures callback-created due timers into a later batch", async function () {
    const order: string[] = [];
    const timers: FakeTimer[] = [];
    timers.push({
      token: {},
      current: true,
      delayMs: 10,
      domain: "acp-chat-ui-emit",
      ownerKey: "chat",
      fire: () => {
        order.push("first");
        timers.push({
          token: {},
          current: true,
          delayMs: 0,
          domain: "assistant-workspace-post-snapshot",
          ownerKey: "workspace",
          fire: () => void order.push("second"),
        });
      },
    });
    const logical = createAcpRuntimeReplayLogicalTime({
      inspect: () => ({
        timers: timers.filter((timer) => timer.current).map(descriptor),
        warnings: [],
      }),
      yieldToMacrotask: async () => void order.push("yield"),
    });

    await logical.captureAt(0);
    await logical.advanceTo(10);

    assert.deepEqual(order, ["first", "yield", "second", "yield"]);
  });

  it("resumes future tail timers without firing or canceling them", async function () {
    let fired = 0;
    const timer: FakeTimer = {
      token: {},
      current: true,
      delayMs: 2000,
      domain: "acp-chat-persist",
      ownerKey: "chat",
      fire: () => void (fired += 1),
    };
    const logical = createAcpRuntimeReplayLogicalTime({
      inspect: () => ({ timers: [descriptor(timer)], warnings: [] }),
    });

    await logical.captureAt(100);
    const released = await logical.releaseToNative(600);
    logical.dispose();

    assert.equal(fired, 0);
    assert.equal(timer.delayMs, 1500);
    assert.deepEqual(released.warnings, []);
    assert.equal(logical.pendingCount(), 0);
  });

  it("stops before new callbacks when canceled and retains warnings", async function () {
    const signal = { aborted: false };
    let fired = 0;
    const timers: FakeTimer[] = [10, 20].map((delayMs) => ({
      token: {},
      current: true,
      delayMs,
      domain: "acp-chat-ui-emit" as const,
      ownerKey: `chat-${delayMs}`,
      fire: () => {
        fired += 1;
        signal.aborted = true;
      },
    }));
    const logical = createAcpRuntimeReplayLogicalTime({
      inspect: () => ({
        timers: timers.filter((timer) => timer.current).map(descriptor),
        warnings: ["logical-timer-contamination:test"],
      }),
      signal,
    });

    await logical.captureAt(0);
    await logical.advanceTo(30);

    assert.equal(fired, 1);
    assert.include(logical.warnings(), "logical-timer-contamination:test");
  });

  it("ignores replaced tokens and flushes resumed write-bearing timers on demand", async function () {
    let fired = 0;
    const replacedTimer: FakeTimer = {
      token: {},
      current: true,
      delayMs: 10,
      domain: "acp-chat-ui-emit",
      ownerKey: "replaced-chat",
      fire: () => void (fired += 1),
    };
    const replaced = createAcpRuntimeReplayLogicalTime({
      inspect: () => ({ timers: [descriptor(replacedTimer)], warnings: [] }),
    });
    await replaced.captureAt(0);
    replacedTimer.token = {};
    await replaced.advanceTo(10);
    assert.equal(fired, 0);

    const token = {} as ReturnType<typeof setTimeout>;
    let currentToken = token;
    let fallbackFlushes = 0;
    const logical = createAcpRuntimeReplayLogicalTime({
      inspect: () => ({
        warnings: [],
        timers: [
          {
            domain: "acp-chat-persist",
            ownerKey: "chat",
            delayMs: 2000,
            nativeToken: token,
            detachNative: () => currentToken === token,
            fireIfCurrent: () => {
              if (currentToken !== token) return false;
              fired += 1;
              return true;
            },
            resumeNative: () => {
              if (currentToken !== token) return false;
              currentToken = {} as ReturnType<typeof setTimeout>;
              return true;
            },
            fallbackFlush: () => {
              fallbackFlushes += 1;
              return true;
            },
          },
        ],
      }),
    });
    await logical.captureAt(0);
    await logical.releaseToNative(100);
    const fallback = await logical.flushWriteBearing();

    assert.equal(fired, 0);
    assert.equal(fallbackFlushes, 1);
    assert.isTrue(fallback.ok);
  });

  it("exposes synthetic Chat and Skills timers without changing native scheduling", async function () {
    const chat = await createAcpChatRuntimeReplayTarget({
      syntheticRootId: "logical-chat",
    });
    const chatEvent: AcpRuntimeSemanticTraceEvent = {
      record: "event",
      seq: 1,
      monotonicOffsetMs: 0,
      sourceKind: "acp-chat-conversation",
      kind: "session-notification",
      owner: {
        rootId: "logical-chat",
        conversationId: "logical-chat-conversation",
        sessionId: "logical-chat-session",
      },
      payload: {
        sessionId: "logical-chat-session",
        update: {
          sessionUpdate: "tool_call_update",
          toolCallId: "tool-1",
          status: "in_progress",
        },
      },
    };
    await chat.apply({
      event: chatEvent,
      owner: chatEvent.owner,
      transcriptBoundary: "soft-side-channel",
    });
    const chatInspection = inspectSyntheticAcpChatReplayTimers({
      backendId: "acp-replay",
      conversationId: "logical-chat-conversation",
    });
    assert.includeMembers(
      chatInspection.timers.map((entry) => entry.domain),
      ["acp-chat-ui-emit", "acp-chat-persist"],
    );

    const skill = await createAcpWorkflowRuntimeReplayTarget({
      syntheticRootId: "logical-skill",
    });
    const skillEvent: AcpRuntimeSemanticTraceEvent = {
      record: "event",
      seq: 1,
      monotonicOffsetMs: 0,
      sourceKind: "acp-workflow-execution",
      kind: "request-start",
      owner: {
        rootId: "logical-skill",
        requestId: "logical-skill-request",
      },
      payload: {},
    };
    await skill.apply({ event: skillEvent, owner: skillEvent.owner });
    appendAcpSkillRunUserReply({
      requestId: "logical-skill-request",
      message: "reply",
    });
    await skill.apply({
      event: {
        ...skillEvent,
        seq: 2,
        kind: "session-notification",
        payload: {
          sessionId: "logical-skill-session",
          update: {
            sessionUpdate: "agent_message_chunk",
            content: { type: "text", text: "chunk" },
          },
        },
      },
      owner: skillEvent.owner,
      transcriptBoundary: "soft-side-channel",
    });
    const skillInspection = inspectSyntheticAcpSkillRunReplayTimers({
      requestIds: ["logical-skill-request"],
    });
    assert.includeMembers(
      skillInspection.timers.map((entry) => entry.domain),
      ["acp-skill-run-soft-persist"],
    );
    assert.include(
      inspectSyntheticAcpSkillRunReplayTimers({ requestIds: ["foreign"] })
        .warnings[0],
      "logical-timer-contamination",
    );

    for (const timer of [...chatInspection.timers, ...skillInspection.timers]) {
      assert.isTrue(timer.detachNative());
      assert.isTrue(timer.resumeNative(0));
    }
    await chat.drain();
    await chat.cleanup();
    await skill.drain();
    await skill.cleanup();
  });

  it("activates and restores the Workflow synthetic request idempotently", async function () {
    await selectAcpSkillRun("real-request");
    const target = await createAcpWorkflowRuntimeReplayTarget({
      syntheticRootId: "workflow-selection",
    });

    await target.activate();
    await target.activate();
    assert.equal(
      getSelectedAcpSkillRunRequestId(),
      "workflow-selection-request",
    );
    await target.cleanup();
    await target.cleanup();
    assert.equal(getSelectedAcpSkillRunRequestId(), "real-request");
    await selectAcpSkillRun("");
  });

  it("runs the production Chat logical port without recorded gap sleeps", async function () {
    const target = await createAcpChatRuntimeReplayTarget({
      syntheticRootId: "logical-chat",
    });
    const logical = createAcpRuntimeReplayProductionLogicalTimePort({
      surface: "closed",
      sourceKind: "acp-chat-conversation",
      syntheticRootId: "logical-chat",
    });
    const owner = {
      rootId: "source",
      conversationId: "source-conversation",
      sessionId: "source-session",
    };
    const trace = {
      header: {
        record: "header" as const,
        schema: ACP_RUNTIME_SEMANTIC_TRACE_SCHEMA,
        sourceKind: "acp-chat-conversation" as const,
        createdAt: "2026-07-15T00:00:00.000Z",
      },
      events: [
        {
          record: "event" as const,
          seq: 1,
          monotonicOffsetMs: 0,
          sourceKind: "acp-chat-conversation" as const,
          kind: "root-start" as const,
          owner,
          payload: {},
        },
        {
          record: "event" as const,
          seq: 2,
          monotonicOffsetMs: 1,
          sourceKind: "acp-chat-conversation" as const,
          kind: "turn-start" as const,
          owner: { ...owner, turnId: "source-turn" },
          payload: {},
        },
        {
          record: "event" as const,
          seq: 3,
          monotonicOffsetMs: 10,
          sourceKind: "acp-chat-conversation" as const,
          kind: "session-notification" as const,
          owner: { ...owner, turnId: "source-turn" },
          payload: {
            sessionId: "source-session",
            update: {
              sessionUpdate: "tool_call_update",
              toolCallId: "tool-1",
              status: "in_progress",
            },
          },
        },
        {
          record: "event" as const,
          seq: 4,
          monotonicOffsetMs: 200,
          sourceKind: "acp-chat-conversation" as const,
          kind: "diagnostic" as const,
          owner: { ...owner, turnId: "source-turn" },
          payload: {},
        },
        {
          record: "event" as const,
          seq: 5,
          monotonicOffsetMs: 201,
          sourceKind: "acp-chat-conversation" as const,
          kind: "turn-end" as const,
          owner: { ...owner, turnId: "source-turn" },
          payload: { outcome: "complete" },
        },
        {
          record: "event" as const,
          seq: 6,
          monotonicOffsetMs: 202,
          sourceKind: "acp-chat-conversation" as const,
          kind: "root-end" as const,
          owner,
          payload: { outcome: "complete" },
        },
      ],
      footer: {
        record: "footer" as const,
        eventCount: 6,
        contentBytes: 3,
        sha256: "b".repeat(64),
        completion: "complete" as const,
        warnings: [],
      },
      digest: "b".repeat(64),
    };
    const waits: number[] = [];

    const replay = await replayAcpRuntimeSemanticTrace({
      trace,
      target,
      cadence: "logical",
      logicalTime: logical,
      sleep: async (delayMs) => void waits.push(delayMs),
    });
    await target.cleanup();
    logical.dispose();

    assert.equal(replay.completion, "complete");
    assert.deepEqual(replay.warnings, []);
    assert.deepEqual(waits, []);
    assert.equal(replay.projectedEvents, 2);
    assert.equal(replay.consumedNoopEvents, 4);
  });

  it("fails closed when a target-active Workspace timer has no owned host", function () {
    const inspection = inspectAssistantWorkspaceReplayPostSnapshotTimer({
      expectedTab: "acp-chat",
      expectedChatOwner: {
        backendId: "acp-replay",
        conversationId: "missing-conversation",
      },
    });
    assert.deepEqual(inspection.timers, []);
    assert.include(
      inspection.warnings,
      "logical-timer-contamination:workspace-host-missing",
    );
  });
});
