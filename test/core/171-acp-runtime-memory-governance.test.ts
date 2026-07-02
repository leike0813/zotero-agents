import { assert } from "chai";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  flushAcpSkillRunRuntimeFileWritesForTests,
  buildAcpSkillRunPanelSnapshot,
  getAcpSkillRunRecord,
  hasAcpSkillRunController,
  markAcpSkillRunApplyResult,
  projectAcpSkillRunOutputEnvelopeToTranscript,
  recordAcpSkillRunSessionUpdate,
  readAcpSkillRunTranscriptPage,
  registerAcpSkillRunController,
  resetAcpSkillRunsForTests,
  upsertAcpSkillRun,
} from "../../src/modules/acpSkillRunStore";
import {
  listPluginRunStoreEntries,
  resetPluginStateStoreForTests,
} from "../../src/modules/pluginStateStore";
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
      assert.notProperty(snapshot.selectedRun || {}, "outputRevisions");
      assert.notProperty(snapshot.selectedRun || {}, "requestPayload");
      assert.notProperty(snapshot.selectedRun || {}, "runnerJson");
      assert.notProperty(snapshot.selectedRun || {}, "resultJson");
      assert.notProperty(snapshot.selectedRun || {}, "lastTurnOutput");
      assert.notProperty(
        snapshot.selectedRun?.pendingInteraction || {},
        "candidateText",
      );
      const page = await readAcpSkillRunTranscriptPage({
        requestId: "req-runtime-memory",
        limit: 20,
      });
      assert.isAtLeast(page.items.length, 1);
      assert.isTrue(
        page.items.some(
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
      const page = await readAcpSkillRunTranscriptPage({
        requestId: "req-runtime-memory-small",
      });
      assert.isTrue(
        page.items.some(
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
    });
    let disconnectCalls = 0;
    registerAcpSkillRunController("req-apply-detach", {
      cancel: async () => undefined,
      disconnect: async () => {
        disconnectCalls += 1;
        registerAcpSkillRunController("req-apply-detach", null);
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
    assert.equal(disconnectCalls, 1);
    assert.isFalse(hasAcpSkillRunController("req-apply-detach"));
  });
});
