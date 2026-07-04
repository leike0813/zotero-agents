import { assert } from "chai";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  flushAcpSkillRunRuntimeFileWritesForTests,
  appendAcpSkillRunUserReply,
  buildAcpSkillRunPanelSnapshot,
  getAcpSkillRunSummaryDiagnosticsForTests,
  getAcpSkillRunRecord,
  hasAcpSkillRunController,
  markAcpSkillRunApplyResult,
  prepareAcpSkillRunPanelSnapshot,
  projectAcpSkillRunOutputEnvelopeToTranscript,
  recordAcpSkillRunSessionUpdate,
  registerAcpSkillRunController,
  resetAcpSkillRunSummaryDiagnosticsForTests,
  resetAcpSkillRunsForTests,
  shutdownAcpSkillRunConversations,
  subscribeAcpSkillRunSnapshots,
  upsertAcpSkillRun,
} from "../../src/modules/acpSkillRunStore";
import {
  PLUGIN_TASK_DOMAIN_ACP,
  getPluginTaskRequestEntry,
  listPluginTaskRowEntries,
  listPluginRunStoreEntries,
  resetPluginStateStoreForTests,
} from "../../src/modules/pluginStateStore";
import {
  loadAcpConversationState,
  saveAcpConversationState,
} from "../../src/modules/acpConversationStore";
import {
  appendAcpChatTranscriptEvent,
  readAcpChatTranscriptPage,
  resolveAcpChatTranscriptPaths,
} from "../../src/modules/acpConversationTranscriptStore";
import { createEmptyAcpConversationSnapshot } from "../../src/modules/acpTypes";
import {
  appendAcpSkillRunTranscriptEvent,
  readAcpSkillRunTranscriptPage as readTranscriptRuntimePage,
  rebuildAcpSkillRunTranscriptIndex,
} from "../../src/modules/acpSkillRunTranscriptStore";

async function mkTempRoot() {
  return fs.mkdtemp(path.join(os.tmpdir(), "zs-acp-runtime-memory-"));
}

async function waitForTextFile(filePath: string, pattern?: RegExp) {
  let latest = "";
  for (let index = 0; index < 50; index += 1) {
    try {
      latest = await fs.readFile(filePath, "utf8");
      if (!pattern || pattern.test(latest)) {
        return latest;
      }
    } catch {
      latest = "";
    }
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  return latest;
}

describe("ACP runtime memory governance", function () {
  beforeEach(function () {
    resetPluginStateStoreForTests();
    resetAcpSkillRunsForTests();
  });

  afterEach(async function () {
    await flushAcpSkillRunRuntimeFileWritesForTests();
    resetAcpSkillRunsForTests();
    resetPluginStateStoreForTests();
  });

  it("persists ACP chat conversations as metadata-only while storing transcript text in JSONL", async function () {
    const root = await mkTempRoot();
    const conversationStorageDir = path.join(root, "conversation");
    const transcriptPaths = resolveAcpChatTranscriptPaths(
      conversationStorageDir,
    );
    const hugeText = "chat-body-".repeat(2048);
    try {
      await appendAcpChatTranscriptEvent({
        conversationStorageDir,
        op: "upsert_item",
        itemId: "chat-user-1",
        item: {
          id: "chat-user-1",
          kind: "message",
          role: "user",
          text: hugeText,
          state: "complete",
          createdAt: "2026-07-02T00:00:00.000Z",
        },
        createdAt: "2026-07-02T00:00:00.000Z",
      });
      const snapshot = createEmptyAcpConversationSnapshot();
      snapshot.backendId = "acp-opencode";
      snapshot.conversationId = "conversation-memory";
      snapshot.conversationTitle = "Memory governance";
      snapshot.conversationStorageDir = conversationStorageDir;
      snapshot.transcriptPath = transcriptPaths.transcriptPath;
      snapshot.transcriptIndexPath = transcriptPaths.transcriptIndexPath;
      snapshot.transcriptRevision = 1;
      snapshot.transcriptEventSeq = 1;
      snapshot.transcriptItemCount = 1;
      snapshot.transcriptPreview = "chat preview";
      snapshot.items = [
        {
          id: "should-not-persist",
          kind: "message",
          role: "assistant",
          text: hugeText,
          state: "complete",
          createdAt: "2026-07-02T00:00:01.000Z",
        },
      ];

      saveAcpConversationState(snapshot);

      const request = getPluginTaskRequestEntry(
        PLUGIN_TASK_DOMAIN_ACP,
        "conversation:acp-opencode:conversation-memory",
      );
      assert.isOk(request);
      const payload = JSON.parse(String(request?.payload || "{}"));
      assert.notProperty(payload, "items");
      assert.notInclude(String(request?.payload || ""), hugeText);
      assert.lengthOf(
        listPluginTaskRowEntries(PLUGIN_TASK_DOMAIN_ACP, "active").filter(
          (entry) => entry.requestId === request?.requestId,
        ),
        0,
      );

      const restored = loadAcpConversationState(
        "acp-opencode",
        "conversation-memory",
      );
      assert.lengthOf(restored.items, 0);
      assert.equal(restored.snapshot.transcriptItemCount, 1);
      assert.equal(
        restored.snapshot.transcriptPath,
        transcriptPaths.transcriptPath,
      );

      const page = await readAcpChatTranscriptPage({
        conversationStorageDir,
      });
      assert.equal(page.items[0]?.kind, "message");
      assert.equal(
        page.items.find((entry) => entry.kind === "message")?.text,
        hugeText,
      );
    } finally {
      await fs.rm(root, { recursive: true, force: true });
    }
  });

  it("indexes ACP chat plan transcript previews through the shared JSONL store", async function () {
    const root = await mkTempRoot();
    const conversationStorageDir = path.join(root, "conversation-plan");
    try {
      await appendAcpChatTranscriptEvent({
        conversationStorageDir,
        op: "upsert_item",
        itemId: "plan-1",
        item: {
          id: "plan-1",
          kind: "plan",
          entries: [
            { content: "Read source files", priority: "high", status: "done" },
            { content: "Write patch", priority: "high", status: "pending" },
          ],
          createdAt: "2026-07-03T00:00:00.000Z",
        },
        createdAt: "2026-07-03T00:00:00.000Z",
      });

      const paths = resolveAcpChatTranscriptPaths(conversationStorageDir);
      const indexBeforeRebuild = JSON.parse(
        await fs.readFile(paths.transcriptIndexPath || "", "utf8"),
      );
      assert.equal(
        indexBeforeRebuild.items.find((item: any) => item.itemId === "plan-1")
          ?.preview,
        "Read source files Write patch",
      );

      await fs.rm(paths.transcriptIndexPath || "", { force: true });
      const rebuilt = await rebuildAcpSkillRunTranscriptIndex({
        runtimeDir: conversationStorageDir,
      });
      assert.equal(rebuilt?.preview, "Read source files Write patch");
    } finally {
      await fs.rm(root, { recursive: true, force: true });
    }
  });

  it("persists ACP skill run history as metadata-only while writing large payloads to runtime files", async function () {
    const root = await mkTempRoot();
    const runtimeDir = path.join(root, ".acp");
    const hugeText = "x".repeat(12 * 1024);
    try {
      upsertAcpSkillRun({
        requestId: "req-runtime-memory",
        status: "running",
        statusReason: "start",
        backendId: "backend-acp",
        backendType: "acp",
        workspaceDir: root,
        runtimeDir,
        inputManifestPath: path.join(root, "input.json"),
        resultJsonPath: path.join(root, "result.json"),
        requestPayload: {
          kind: "acp-skill-run",
          prompt: hugeText,
        },
        runnerJson: {
          output_contract: hugeText,
        },
        resultJson: {
          output: hugeText,
        },
        lastTurnOutput: hugeText,
      });
      recordAcpSkillRunSessionUpdate("req-runtime-memory", {
        sessionId: "session-1",
        update: {
          sessionUpdate: "agent_message_chunk",
          content: {
            type: "text",
            text: hugeText,
          },
        },
      } as never);
      projectAcpSkillRunOutputEnvelopeToTranscript({
        requestId: "req-runtime-memory",
        kind: "pending",
        message: "Need input",
        candidateText: hugeText,
      });

      const transcript = await waitForTextFile(
        path.join(runtimeDir, "transcript.jsonl"),
        /agent_message_chunk|Need input|xxxxxxxx/,
      );
      const context = await waitForTextFile(
        path.join(runtimeDir, "run-context.json"),
        /output_contract/,
      );
      const revisions = await waitForTextFile(
        path.join(runtimeDir, "output-revisions.jsonl"),
        /candidateText/,
      );
      const resultJson = await waitForTextFile(
        path.join(root, "result.json"),
        /output/,
      );
      assert.include(transcript, "Need input");
      assert.include(context, hugeText);
      assert.include(revisions, hugeText);
      assert.include(resultJson, hugeText);

      const row = listPluginRunStoreEntries("acp").find(
        (entry) => entry.requestId === "req-runtime-memory",
      );
      assert.isOk(row);
      const payload = JSON.parse(row?.payload || "{}");
      assert.notProperty(payload, "transcriptItems");
      assert.notProperty(payload, "outputRevisions");
      assert.notProperty(payload, "requestPayload");
      assert.notProperty(payload, "runnerJson");
      assert.notProperty(payload, "resultJson");
      assert.notProperty(payload, "lastTurnOutput");
      assert.notProperty(payload.pendingInteraction || {}, "candidateText");
      assert.isAtMost(
        String(payload.pendingInteraction?.candidatePreview || "").length,
        8220,
      );
      assert.isAtMost(String(payload.lastTurnOutputPreview || "").length, 8220);
      assert.equal(
        payload.transcriptPath,
        path.join(runtimeDir, "transcript.jsonl"),
      );
      assert.equal(
        payload.outputRevisionsPath,
        path.join(runtimeDir, "output-revisions.jsonl"),
      );
      assert.equal(
        payload.runContextPath,
        path.join(runtimeDir, "run-context.json"),
      );
      const record = getAcpSkillRunRecord("req-runtime-memory") as any;
      assert.notProperty(record, "transcriptItems");
      assert.notProperty(record, "outputRevisions");
      assert.notProperty(record, "requestPayload");
      assert.notProperty(record, "runnerJson");
      assert.notProperty(record, "resultJson");
      assert.notProperty(record, "lastTurnOutput");
      assert.notProperty(record.pendingInteraction || {}, "candidateText");
      const snapshot = buildAcpSkillRunPanelSnapshot({
        selectedRequestId: "req-runtime-memory",
      }) as any;
      assert.notProperty(snapshot.selectedRun || {}, "transcriptItems");
      assert.isArray(snapshot.selectedTranscriptPage?.items);
      assert.notProperty(snapshot.selectedRun || {}, "outputRevisions");
      assert.notProperty(snapshot.selectedRun || {}, "requestPayload");
      assert.notProperty(snapshot.selectedRun || {}, "runnerJson");
      assert.notProperty(snapshot.selectedRun || {}, "resultJson");
      assert.notProperty(snapshot.selectedRun || {}, "lastTurnOutput");
      assert.notProperty(
        snapshot.selectedRun?.pendingInteraction || {},
        "candidateText",
      );
      const prepared = await prepareAcpSkillRunPanelSnapshot({
        selectedRequestId: "req-runtime-memory",
      });
      const items = prepared.selectedTranscriptPage?.items || [];
      assert.isAtLeast(items.length, 1);
      assert.isTrue(
        items.some(
          (item) =>
            item.kind === "message" &&
            String(item.text || "").includes("Need input"),
        ),
      );
    } finally {
      await flushAcpSkillRunRuntimeFileWritesForTests();
      resetAcpSkillRunsForTests();
      await fs.rm(root, { recursive: true, force: true });
    }
  });

  it("keeps small ACP skill payloads out of the plugin run store when runtime files are available", async function () {
    const root = await mkTempRoot();
    const runtimeDir = path.join(root, ".acp");
    try {
      upsertAcpSkillRun({
        requestId: "req-runtime-memory-small",
        status: "running",
        statusReason: "start",
        backendId: "backend-acp",
        backendType: "acp",
        workspaceDir: root,
        runtimeDir,
        resultJsonPath: path.join(root, "result.json"),
        requestPayload: { prompt: "small prompt" },
        runnerJson: { output_contract: "small contract" },
        resultJson: { ok: true },
        lastTurnOutput: "short assistant text",
      });
      recordAcpSkillRunSessionUpdate("req-runtime-memory-small", {
        sessionId: "session-small",
        update: {
          sessionUpdate: "agent_message_chunk",
          content: {
            type: "text",
            text: "small transcript",
          },
        },
      } as never);
      projectAcpSkillRunOutputEnvelopeToTranscript({
        requestId: "req-runtime-memory-small",
        kind: "pending",
        message: "Small pending",
        candidateText: "small candidate",
      });
      upsertAcpSkillRun({
        requestId: "req-runtime-memory-small",
        status: "waiting_user",
        statusReason: "waiting_user",
        pendingInteraction: {
          message: "Small pending",
          uiHints: {},
          candidateText: "small candidate",
        },
      });

      await flushAcpSkillRunRuntimeFileWritesForTests();
      const row = listPluginRunStoreEntries("acp").find(
        (entry) => entry.requestId === "req-runtime-memory-small",
      );
      assert.isOk(row);
      const payload = JSON.parse(row?.payload || "{}");
      assert.notProperty(payload, "transcriptItems");
      assert.notProperty(payload, "outputRevisions");
      assert.notProperty(payload, "requestPayload");
      assert.notProperty(payload, "runnerJson");
      assert.notProperty(payload, "resultJson");
      assert.notProperty(payload, "lastTurnOutput");
      assert.notProperty(payload.pendingInteraction || {}, "candidateText");
      assert.equal(
        payload.pendingInteraction?.candidatePreview,
        "small candidate",
      );
      assert.equal(payload.lastTurnOutputPreview, "short assistant text");
      assert.include(
        await fs.readFile(path.join(runtimeDir, "transcript.jsonl"), "utf8"),
        "Small pending",
      );
      assert.include(
        await fs.readFile(path.join(runtimeDir, "run-context.json"), "utf8"),
        "small contract",
      );
      assert.include(
        await fs.readFile(
          path.join(runtimeDir, "output-revisions.jsonl"),
          "utf8",
        ),
        "small candidate",
      );
      const snapshot = await prepareAcpSkillRunPanelSnapshot({
        selectedRequestId: "req-runtime-memory-small",
      });
      assert.notProperty(snapshot.selectedRun || {}, "transcriptItems");
      assert.isTrue(
        (snapshot.selectedTranscriptPage?.items || []).some(
          (item) =>
            item.kind === "message" &&
            String(item.text || "").includes("Small pending"),
        ),
      );
    } finally {
      await flushAcpSkillRunRuntimeFileWritesForTests();
      resetAcpSkillRunsForTests();
      await fs.rm(root, { recursive: true, force: true });
    }
  });

  it("pages selected ACP skill transcript snapshots without embedding the full transcript", async function () {
    const root = await mkTempRoot();
    const runtimeDir = path.join(root, ".acp");
    try {
      upsertAcpSkillRun({
        requestId: "req-runtime-long-transcript",
        status: "running",
        statusReason: "start",
        backendId: "backend-acp",
        backendType: "acp",
        workspaceDir: root,
        runtimeDir,
        resultJsonPath: path.join(root, "result.json"),
      });
      for (let index = 0; index < 210; index += 1) {
        appendAcpSkillRunUserReply({
          requestId: "req-runtime-long-transcript",
          message: `message-${String(index).padStart(3, "0")}`,
        });
      }
      await flushAcpSkillRunRuntimeFileWritesForTests();

      const tail = await prepareAcpSkillRunPanelSnapshot({
        selectedRequestId: "req-runtime-long-transcript",
      });
      assert.notProperty(tail.selectedRun || {}, "transcriptItems");
      assert.isAtMost(tail.selectedTranscriptPage?.items.length || 0, 80);
      assert.equal(tail.selectedTranscriptPage?.total, 210);
      assert.equal(tail.selectedTranscriptPage?.cursor, 130);
      assert.isTrue(
        (tail.selectedTranscriptPage?.items || []).some((item) =>
          String(item.text || "").includes("message-209"),
        ),
      );

      const firstPage = await prepareAcpSkillRunPanelSnapshot({
        selectedRequestId: "req-runtime-long-transcript",
        transcriptPage: {
          requestId: "req-runtime-long-transcript",
          cursor: 0,
          limit: 80,
        },
      });
      assert.equal(firstPage.selectedTranscriptPage?.cursor, 0);
      assert.equal(firstPage.selectedTranscriptPage?.nextCursor, 80);
      assert.isUndefined(firstPage.selectedTranscriptPage?.prevCursor);
      assert.isTrue(
        (firstPage.selectedTranscriptPage?.items || []).some((item) =>
          String(item.text || "").includes("message-000"),
        ),
      );
    } finally {
      await flushAcpSkillRunRuntimeFileWritesForTests();
      resetAcpSkillRunsForTests();
      await fs.rm(root, { recursive: true, force: true });
    }
  });

  it("emits request-scoped ACP skill transcript snapshot changes", async function () {
    const root = await mkTempRoot();
    const runtimeDir = path.join(root, ".acp");
    const changes: any[] = [];
    const unsubscribe = subscribeAcpSkillRunSnapshots((change) => {
      changes.push(change);
    });
    try {
      upsertAcpSkillRun({
        requestId: "req-runtime-change-descriptor",
        status: "running",
        statusReason: "start",
        backendId: "backend-acp",
        backendType: "acp",
        workspaceDir: root,
        runtimeDir,
        resultJsonPath: path.join(root, "result.json"),
      });
      changes.length = 0;
      appendAcpSkillRunUserReply({
        requestId: "req-runtime-change-descriptor",
        message: "descriptor text",
      });
      await new Promise((resolve) => setTimeout(resolve, 240));
      assert.isAtLeast(changes.length, 1);
      const latest = changes[changes.length - 1] || {};
      assert.deepEqual(latest.requestIds, ["req-runtime-change-descriptor"]);
      assert.include(latest.kinds || [], "transcript");
      assert.notEqual(latest.global, true);
    } finally {
      unsubscribe();
      await flushAcpSkillRunRuntimeFileWritesForTests();
      resetAcpSkillRunsForTests();
      await fs.rm(root, { recursive: true, force: true });
    }
  });

  it("does not rewrite run context for streaming transcript-only updates", async function () {
    const root = await mkTempRoot();
    const runtimeDir = path.join(root, ".acp");
    try {
      upsertAcpSkillRun({
        requestId: "req-runtime-context-dirty",
        status: "running",
        statusReason: "start",
        backendId: "backend-acp",
        backendType: "acp",
        workspaceDir: root,
        runtimeDir,
        resultJsonPath: path.join(root, "result.json"),
        providerOptions: { mode: "dirty-context-test" },
        requestPayload: { prompt: "initial" },
      });
      await flushAcpSkillRunRuntimeFileWritesForTests();
      const contextPath = path.join(runtimeDir, "run-context.json");
      const before = await fs.stat(contextPath);
      await new Promise((resolve) => setTimeout(resolve, 30));

      recordAcpSkillRunSessionUpdate("req-runtime-context-dirty", {
        sessionId: "session-dirty",
        update: {
          sessionUpdate: "agent_message_chunk",
          content: {
            type: "text",
            text: "streamed text",
          },
        },
      } as never);
      await flushAcpSkillRunRuntimeFileWritesForTests();
      const after = await fs.stat(contextPath);

      assert.equal(after.mtimeMs, before.mtimeMs);
      assert.include(
        await fs.readFile(path.join(runtimeDir, "transcript.jsonl"), "utf8"),
        "streamed text",
      );
    } finally {
      await flushAcpSkillRunRuntimeFileWritesForTests();
      resetAcpSkillRunsForTests();
      await fs.rm(root, { recursive: true, force: true });
    }
  });

  it("drains pending ACP skill transcript writes during shutdown without clearing run memory", async function () {
    const root = await mkTempRoot();
    const runtimeDir = path.join(root, ".acp");
    const requestId = "req-shutdown-drain-transcript";
    const replyText = "shutdown should persist this pending reply";
    try {
      upsertAcpSkillRun({
        requestId,
        status: "running",
        statusReason: "start",
        backendId: "backend-acp",
        backendType: "acp",
        workspaceDir: root,
        runtimeDir,
      });
      appendAcpSkillRunUserReply({
        requestId,
        message: replyText,
      });

      await shutdownAcpSkillRunConversations();

      const transcript = await fs.readFile(
        path.join(runtimeDir, "transcript.jsonl"),
        "utf8",
      );
      assert.include(transcript, replyText);
      assert.equal(getAcpSkillRunRecord(requestId)?.requestId, requestId);
    } finally {
      await flushAcpSkillRunRuntimeFileWritesForTests();
      resetAcpSkillRunsForTests();
      await fs.rm(root, { recursive: true, force: true });
    }
  });

  it("reads ACP skill transcripts through JSONL-backed tail and previous pages", async function () {
    const root = await mkTempRoot();
    const runtimeDir = path.join(root, ".acp");
    const transcriptPath = path.join(runtimeDir, "transcript.jsonl");
    const indexPath = path.join(runtimeDir, "transcript.index.json");
    try {
      for (let index = 0; index < 205; index += 1) {
        await appendAcpSkillRunTranscriptEvent({
          runtimeDir,
          op: "upsert_item",
          itemId: `item-${index}`,
          item: {
            id: `item-${index}`,
            kind: "message",
            role: "assistant",
            text: `message ${index}`,
            state: "streaming",
            createdAt: new Date(index).toISOString(),
          },
          createdAt: new Date(index).toISOString(),
        });
      }
      await appendAcpSkillRunTranscriptEvent({
        runtimeDir,
        op: "append_text",
        itemId: "item-204",
        text: " tail",
      });
      await appendAcpSkillRunTranscriptEvent({
        runtimeDir,
        op: "patch_item",
        itemId: "item-204",
        patch: { state: "complete" },
      });
      await appendAcpSkillRunTranscriptEvent({
        runtimeDir,
        op: "delete_item",
        itemId: "item-10",
      });

      const tail = await readTranscriptRuntimePage({ runtimeDir, limit: 5 });
      assert.deepEqual(
        tail.items.map((item) => item.id),
        ["item-200", "item-201", "item-202", "item-203", "item-204"],
      );
      assert.equal(tail.total, 204);
      assert.equal((tail.items[4] as any).text, "message 204 tail");
      assert.equal((tail.items[4] as any).state, "complete");
      assert.isNumber(tail.prevCursor);

      const previous = await readTranscriptRuntimePage({
        runtimeDir,
        cursor: tail.prevCursor,
        limit: 5,
      });
      assert.deepEqual(
        previous.items.map((item) => item.id),
        ["item-195", "item-196", "item-197", "item-198", "item-199"],
      );

      const first = await readTranscriptRuntimePage({
        runtimeDir,
        cursor: 0,
        limit: 20,
      });
      assert.notInclude(
        first.items.map((item) => item.id),
        "item-10",
      );
      const capped = await readTranscriptRuntimePage({
        runtimeDir,
        cursor: 0,
        limit: 500,
      });
      assert.lengthOf(capped.items, 200);

      const indexBeforeRebuild = JSON.parse(
        await fs.readFile(indexPath, "utf8"),
      );
      const latestIndexItem = indexBeforeRebuild.items.find(
        (item: any) => item.itemId === "item-204",
      );
      assert.lengthOf(latestIndexItem.eventOffsets, 3);
      assert.equal(latestIndexItem.preview, "message 204 tail");
      assert.equal(indexBeforeRebuild.preview, "message 204 tail");
      assert.deepEqual(
        latestIndexItem.eventOffsets.length,
        latestIndexItem.eventLengths.length,
      );

      await fs.appendFile(transcriptPath, "{bad json}\n", "utf8");
      await fs.rm(indexPath, { force: true });
      const rebuilt = await rebuildAcpSkillRunTranscriptIndex({ runtimeDir });
      assert.equal(rebuilt?.itemCount, 204);
      assert.equal(rebuilt?.preview, "message 204 tail");
      const rebuiltTail = await readTranscriptRuntimePage({
        runtimeDir,
        limit: 5,
      });
      assert.deepEqual(
        rebuiltTail.items.map((item) => item.id),
        ["item-200", "item-201", "item-202", "item-203", "item-204"],
      );
    } finally {
      await fs.rm(root, { recursive: true, force: true });
    }
  });

  it("detaches a live ACP skill controller after workflow apply succeeds", async function () {
    upsertAcpSkillRun({
      requestId: "req-apply-detach",
      status: "running",
      statusReason: "start",
      backendId: "backend-acp",
      backendType: "acp",
      conversationState: "active",
      conversationRecoveryState: "connected",
    });
    let disconnectCalls = 0;
    registerAcpSkillRunController("req-apply-detach", {
      cancel: async () => undefined,
      disconnect: async () => {
        disconnectCalls += 1;
      },
    });

    markAcpSkillRunApplyResult({
      requestId: "req-apply-detach",
      state: "succeeded",
    });
    await new Promise((resolve) => setTimeout(resolve, 0));

    const record = getAcpSkillRunRecord("req-apply-detach");
    assert.equal(record?.status, "succeeded");
    assert.equal(record?.applyResultState, "succeeded");
    assert.equal(record?.conversationState, "closed");
    assert.equal(record?.conversationRecoveryState, "available");
    assert.equal(record?.connectionActionState, "idle");
    assert.equal(disconnectCalls, 1);
    assert.isFalse(hasAcpSkillRunController("req-apply-detach"));
  });

  it("detaches a live ACP skill controller after workflow apply fails", async function () {
    upsertAcpSkillRun({
      requestId: "req-apply-failed-detach",
      status: "running",
      statusReason: "start",
      backendId: "backend-acp",
      backendType: "acp",
      conversationState: "active",
      conversationRecoveryState: "connected",
      connectionActionState: "idle",
      activePrompt: true,
    });
    let disconnectCalls = 0;
    registerAcpSkillRunController("req-apply-failed-detach", {
      cancel: async () => undefined,
      disconnect: async () => {
        disconnectCalls += 1;
      },
    });

    markAcpSkillRunApplyResult({
      requestId: "req-apply-failed-detach",
      state: "failed",
      error: "apply output failed",
    });
    await new Promise((resolve) => setTimeout(resolve, 0));

    const record = getAcpSkillRunRecord("req-apply-failed-detach");
    assert.isFalse(hasAcpSkillRunController("req-apply-failed-detach"));
    assert.equal(record?.status, "failed");
    assert.equal(record?.backendStatus, "succeeded");
    assert.equal(record?.applyResultState, "failed");
    assert.equal(record?.conversationState, "closed");
    assert.equal(record?.conversationRecoveryState, "unavailable");
    assert.equal(record?.connectionActionState, "idle");
    assert.equal(record?.activePrompt, false);
    assert.equal(disconnectCalls, 1);
  });

  it("keeps apply-failed ACP skill controllers detached when disconnect fails", async function () {
    upsertAcpSkillRun({
      requestId: "req-apply-failed-detach-error",
      status: "running",
      statusReason: "start",
      backendId: "backend-acp",
      backendType: "acp",
      conversationState: "active",
      conversationRecoveryState: "connected",
      connectionActionState: "idle",
      activePrompt: true,
    });
    registerAcpSkillRunController("req-apply-failed-detach-error", {
      cancel: async () => undefined,
      disconnect: async () => {
        throw new Error("adapter close failed");
      },
    });

    markAcpSkillRunApplyResult({
      requestId: "req-apply-failed-detach-error",
      state: "failed",
      error: "apply output failed",
    });
    await new Promise((resolve) => setTimeout(resolve, 0));

    const record = getAcpSkillRunRecord("req-apply-failed-detach-error");
    const stages = (record?.events || []).map((event) => event.stage);
    assert.isFalse(hasAcpSkillRunController("req-apply-failed-detach-error"));
    assert.equal(record?.status, "failed");
    assert.equal(record?.applyResultState, "failed");
    assert.equal(record?.conversationState, "closed");
    assert.equal(record?.conversationRecoveryState, "unavailable");
    assert.equal(record?.connectionActionState, "idle");
    assert.include(stages, "apply-result-detach-error");
  });

  it("builds ACP Skills panel recent runs from a bounded index", async function () {
    for (let index = 1; index <= 125; index += 1) {
      const padded = String(index).padStart(3, "0");
      upsertAcpSkillRun({
        requestId: `req-panel-${padded}`,
        status: "succeeded",
        backendId: "backend-acp",
        backendType: "acp",
        taskName: `Panel Run ${padded}`,
        createdAt: new Date(
          Date.UTC(2026, 6, 3, 0, 0, index),
        ).toISOString(),
      });
    }
    upsertAcpSkillRun({
      requestId: "req-panel-archived-new",
      status: "succeeded",
      backendId: "backend-acp",
      backendType: "acp",
      createdAt: "2026-07-03T02:10:00.000Z",
      archivedAt: "2026-07-03T02:11:00.000Z",
    });
    upsertAcpSkillRun({
      requestId: "req-panel-removed-new",
      status: "succeeded",
      backendId: "backend-acp",
      backendType: "acp",
      createdAt: "2026-07-03T02:20:00.000Z",
      removedAt: "2026-07-03T02:21:00.000Z",
    });

    resetAcpSkillRunSummaryDiagnosticsForTests();
    const snapshot = await prepareAcpSkillRunPanelSnapshot({
      selectedRequestId: "req-panel-125",
    });
    const diagnostics = getAcpSkillRunSummaryDiagnosticsForTests();

    assert.equal(diagnostics.fullRunRecordScanCount, 0);
    assert.equal(diagnostics.recentIndexScanCount, 1);
    assert.isAtMost(diagnostics.runCandidateReadCount, 101);
    assert.lengthOf(snapshot.runs, 100);
    assert.equal(snapshot.runs[0].requestId, "req-panel-125");
    assert.equal(snapshot.runs[99].requestId, "req-panel-026");
    assert.isTrue(snapshot.drawer.truncated);
    assert.isString(snapshot.drawer.notice);
    assert.notInclude(
      snapshot.runs.map((run) => run.requestId),
      "req-panel-archived-new",
    );
    assert.notInclude(
      snapshot.runs.map((run) => run.requestId),
      "req-panel-removed-new",
    );

    resetAcpSkillRunSummaryDiagnosticsForTests();
    const selectedOld = await prepareAcpSkillRunPanelSnapshot({
      selectedRequestId: "req-panel-001",
    });
    const selectedDiagnostics = getAcpSkillRunSummaryDiagnosticsForTests();

    assert.equal(selectedDiagnostics.fullRunRecordScanCount, 0);
    assert.equal(selectedDiagnostics.recentIndexScanCount, 1);
    assert.isAtMost(selectedDiagnostics.runCandidateReadCount, 101);
    assert.equal(selectedOld.selectedRun?.requestId, "req-panel-001");
    assert.equal(selectedOld.runs[0].requestId, "req-panel-001");
    assert.lengthOf(selectedOld.runs, 100);
  });
});
