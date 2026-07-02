import { assert } from "chai";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  flushAcpSkillRunRuntimeFileWritesForTests,
  getAcpSkillRunRecord,
  hasAcpSkillRunController,
  markAcpSkillRunApplyResult,
  projectAcpSkillRunOutputEnvelopeToTranscript,
  recordAcpSkillRunSessionUpdate,
  registerAcpSkillRunController,
  resetAcpSkillRunsForTests,
  upsertAcpSkillRun,
} from "../../src/modules/acpSkillRunStore";
import {
  listPluginRunStoreEntries,
  resetPluginStateStoreForTests,
} from "../../src/modules/pluginStateStore";

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
    } finally {
      await flushAcpSkillRunRuntimeFileWritesForTests();
      resetAcpSkillRunsForTests();
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
