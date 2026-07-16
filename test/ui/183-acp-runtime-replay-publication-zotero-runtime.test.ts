import { assert } from "chai";
import { setDebugModeOverrideForTests } from "../../src/modules/debugMode";
import {
  createAcpRuntimeR2ProductionNoopPort,
  createAcpRuntimeReplayProductionProfilerPort,
  createAcpRuntimeReplayProductionWorkspacePort,
} from "../../src/modules/acpRuntimeReplayProductionPorts";
import { createAcpRuntimeReplayTarget } from "../../src/modules/acpRuntimeReplayTargets";
import { runAcpRuntimeReplayMatrix } from "../../src/modules/acpRuntimeReplayProfiler";
import {
  ACP_RUNTIME_SEMANTIC_TRACE_SCHEMA,
  type AcpRuntimeSemanticTraceDocument,
  type AcpRuntimeTraceSourceKind,
} from "../../src/modules/acpRuntimeSemanticTrace";
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

function targetActiveTrace(
  sourceKind: AcpRuntimeTraceSourceKind,
): AcpRuntimeSemanticTraceDocument {
  const chat = sourceKind === "acp-chat-conversation";
  const rootOwner = chat
    ? {
        rootId: "production-shaped-chat",
        conversationId: "source-conversation",
        sessionId: "source-session",
      }
    : {
        rootId: "production-shaped-skills",
        workflowRunId: "source-workflow-run",
      };
  const activityOwner = chat
    ? { ...rootOwner, turnId: "source-turn" }
    : { ...rootOwner, requestId: "source-request" };
  const digestCharacter = chat ? "c" : "d";
  return {
    header: {
      record: "header",
      schema: ACP_RUNTIME_SEMANTIC_TRACE_SCHEMA,
      sourceKind,
      createdAt: new Date().toISOString(),
    },
    events: [
      {
        record: "event",
        seq: 1,
        monotonicOffsetMs: 0,
        sourceKind,
        kind: "root-start",
        owner: rootOwner,
        payload: {},
      },
      {
        record: "event",
        seq: 2,
        monotonicOffsetMs: 1,
        sourceKind,
        kind: chat ? "turn-start" : "request-start",
        owner: activityOwner,
        payload: chat ? { message: "Replay target activation acceptance" } : {},
      },
      {
        record: "event",
        seq: 3,
        monotonicOffsetMs: 2,
        sourceKind,
        kind: "root-end",
        owner: rootOwner,
        payload: { outcome: "complete" },
      },
    ],
    footer: {
      record: "footer",
      eventCount: 3,
      contentBytes: 1,
      sha256: digestCharacter.repeat(64),
      completion: "complete",
      warnings: [],
    },
    digest: digestCharacter.repeat(64),
  };
}

describe("ACP Replay publication in the Zotero runtime", function () {
  beforeEach(function () {
    setDebugModeOverrideForTests(true);
  });

  afterEach(function () {
    setDebugModeOverrideForTests(undefined);
  });

  it("runs the production Chat and Skills target-active paths", async function () {
    if (!hasRealZoteroRuntime()) {
      this.skip();
    }
    this.timeout(90_000);
    for (const sourceKind of [
      "acp-chat-conversation",
      "acp-workflow-execution",
    ] as const) {
      const matrix = await runAcpRuntimeReplayMatrix({
        trace: targetActiveTrace(sourceKind),
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

      for (const expected of [
        { surface: "open-inactive", r3State: "expected-zero" },
        { surface: "target-active", r3State: "captured" },
      ] as const) {
        const records = matrix.records.filter(
          (record) => record.surface === expected.surface,
        );
        assert.lengthOf(records, 3, `${sourceKind}/${expected.surface}`);
        for (const record of records) {
          const identity = `${sourceKind}/${record.surface}/${record.role}-${record.runIndex + 1}`;
          if (record.executionCompletion !== "complete") {
            throw new Error(
              `${identity}: ${JSON.stringify({
                failure: record.failure,
                drain: record.replay.drain,
                warnings: record.replay.warnings,
              })}`,
            );
          }
          if (record.measurementCompletion !== "complete") {
            throw new Error(
              `${identity}: ${JSON.stringify(record.measurement.families)}`,
            );
          }
          assert.isUndefined(record.failure, identity);
          assert.equal(record.replay.drain.state, "ok", identity);
          assert.equal(
            record.measurement.families.r1.state,
            "captured",
            identity,
          );
          assert.equal(
            record.measurement.families.r2.state,
            "captured",
            identity,
          );
          assert.equal(
            record.measurement.families.r3.state,
            expected.r3State,
            identity,
          );
        }
      }
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
