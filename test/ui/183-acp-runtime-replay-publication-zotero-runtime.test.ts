import { assert } from "chai";
import {
  createAcpRuntimeR2ProductionNoopPort,
  createAcpRuntimeReplayProductionProfilerPort,
  createAcpRuntimeReplayProductionWorkspacePort,
} from "../../src/modules/acpRuntimeReplayProductionPorts";
import { createAcpRuntimeReplayTarget } from "../../src/modules/acpRuntimeReplayTargets";
import { runAcpRuntimeReplayMatrix } from "../../src/modules/acpRuntimeReplayProfiler";
import { ACP_RUNTIME_SEMANTIC_TRACE_SCHEMA } from "../../src/modules/acpRuntimeSemanticTrace";
import { drainAcpRuntimeReplayPublication } from "../../src/modules/acpRuntimeReplayPublicationSidecar";
import {
  closeAssistantWorkspaceSidebar,
  forceAssistantWorkspaceDiagnosticsPublication,
  getAssistantWorkspaceReplayState,
  inspectAssistantWorkspaceDiagnosticsPublication,
  openAssistantWorkspaceSidebar,
} from "../../src/modules/assistantWorkspaceSidebar";

function hasRealZoteroRuntime() {
  const runtime = globalThis as {
    Zotero?: { __parity?: { runtime?: string } };
  };
  return Boolean(
    runtime.Zotero && runtime.Zotero.__parity?.runtime !== "node-mock",
  );
}

describe("ACP Replay publication in the Zotero runtime", function () {
  it("runs the production Chat target-active path without a synthetic backend registry entry", async function () {
    if (!hasRealZoteroRuntime()) {
      this.skip();
    }
    this.timeout(60_000);
    const owner = {
      rootId: "production-shaped-chat",
      conversationId: "source-conversation",
      sessionId: "source-session",
    };
    const matrix = await runAcpRuntimeReplayMatrix({
      trace: {
        header: {
          record: "header",
          schema: ACP_RUNTIME_SEMANTIC_TRACE_SCHEMA,
          sourceKind: "acp-chat-conversation",
          createdAt: new Date().toISOString(),
        },
        events: [
          {
            record: "event",
            seq: 1,
            monotonicOffsetMs: 0,
            sourceKind: "acp-chat-conversation",
            kind: "root-start",
            owner,
            payload: {},
          },
          {
            record: "event",
            seq: 2,
            monotonicOffsetMs: 1,
            sourceKind: "acp-chat-conversation",
            kind: "turn-start",
            owner: { ...owner, turnId: "source-turn" },
            payload: { message: "Replay target activation acceptance" },
          },
          {
            record: "event",
            seq: 3,
            monotonicOffsetMs: 2,
            sourceKind: "acp-chat-conversation",
            kind: "root-end",
            owner,
            payload: { outcome: "complete" },
          },
        ],
        footer: {
          record: "footer",
          eventCount: 3,
          contentBytes: 1,
          sha256: "c".repeat(64),
          completion: "complete",
          warnings: [],
        },
        digest: "c".repeat(64),
      },
      cadence: "burst",
      replayConfig: { phase: "synthetic-selection-acceptance" },
      environment: {
        pluginVersion: "runtime-test",
        zoteroVersion: String(Zotero.version || "unknown"),
        platform: "zotero",
      },
      createTarget: createAcpRuntimeReplayTarget,
      workspace: createAcpRuntimeReplayProductionWorkspacePort(),
      profiler: createAcpRuntimeReplayProductionProfilerPort(),
      r2Port: createAcpRuntimeR2ProductionNoopPort(),
      sleep: async () => undefined,
    });

    const openInactive = matrix.records.filter(
      (record) => record.surface === "open-inactive",
    );
    assert.lengthOf(openInactive, 3);
    for (const record of openInactive) {
      assert.equal(record.executionCompletion, "complete");
      assert.equal(record.measurementCompletion, "complete");
      assert.isUndefined(record.failure);
      assert.equal(record.replay.drain.state, "ok");
      assert.equal(record.measurement.families.r1.state, "captured");
      assert.equal(record.measurement.families.r2.state, "captured");
      assert.equal(record.measurement.families.r3.state, "expected-zero");
    }

    const targetActive = matrix.records.filter(
      (record) => record.surface === "target-active",
    );
    assert.lengthOf(targetActive, 3);
    for (const record of targetActive) {
      assert.equal(record.executionCompletion, "complete");
      assert.equal(record.measurementCompletion, "complete");
      assert.isUndefined(record.failure);
      assert.equal(record.replay.drain.state, "ok");
      assert.equal(record.measurement.families.r1.state, "captured");
      assert.equal(record.measurement.families.r2.state, "captured");
      assert.equal(record.measurement.families.r3.state, "captured");
    }
  });

  it("confirms ACP Chat and ACP Skills snapshots through the real nested Workspace frames", async function () {
    if (!hasRealZoteroRuntime()) {
      this.skip();
    }
    this.timeout(30_000);
    const previous = getAssistantWorkspaceReplayState();
    try {
      for (const tab of ["acp-chat", "acp-skills"] as const) {
        const opened = await openAssistantWorkspaceSidebar({
          tab,
          target: previous.target,
        });
        assert.isTrue(opened, `${tab} Workspace did not open`);
        const options = { tab };
        const result = await drainAcpRuntimeReplayPublication({
          tab,
          timeoutMs: 10_000,
          inspect: () =>
            inspectAssistantWorkspaceDiagnosticsPublication(options),
          forcePublish: () =>
            forceAssistantWorkspaceDiagnosticsPublication(options),
        });
        assert.deepEqual(result, { ok: true }, tab);
      }
    } finally {
      if (!previous.open) {
        closeAssistantWorkspaceSidebar();
      } else {
        const restored = await openAssistantWorkspaceSidebar({
          tab: previous.tab,
          target: previous.target,
        });
        assert.isTrue(restored, "previous Workspace state was not restored");
      }
    }
  });
});
