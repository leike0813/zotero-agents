import { assert } from "chai";
import { promises as fs } from "node:fs";
import {
  rebuildSynthesisSidecarObservationEvent,
  rebuildSynthesisSidecarTraceContext,
} from "../../packages/synthesis-contracts/src/sidecarObservability";
import {
  setDebugModeOverrideForTests,
  setSynthesisSidecarDiagnosticsSourceOverrideForTests,
} from "../../src/modules/debugMode";
import {
  createSynthesisSidecarRpcClient,
  SynthesisSidecarRpcError,
} from "../../src/modules/synthesisSidecarRpcClient";
import { SYNTHESIS_PRODUCTION_RPC_TRANSPORT_ERRORS } from "../../src/modules/synthesisProductionRpcPolicy";
import { parseNativeDiagnosticEvent } from "../../src/modules/synthesisSidecarRuntimeSupervisor";
import {
  createSynthesisSidecarTraceContext,
  flushSynthesisSidecarTracePatchesForTests,
  readSynthesisSidecarTraceSnapshot,
  recordSynthesisSidecarTraceEvent,
  resetSynthesisSidecarTraceForTests,
  subscribeSynthesisSidecarTracePatches,
} from "../../src/modules/synthesisSidecarTrace";

describe("Synthesis sidecar debug observability", function () {
  beforeEach(function () {
    setDebugModeOverrideForTests(true);
    setSynthesisSidecarDiagnosticsSourceOverrideForTests(true);
    resetSynthesisSidecarTraceForTests();
  });

  afterEach(function () {
    setSynthesisSidecarDiagnosticsSourceOverrideForTests(undefined);
    setDebugModeOverrideForTests(undefined);
    resetSynthesisSidecarTraceForTests();
  });

  it("strictly rebuilds v2 context and preserves zero-valued allowlisted facts", function () {
    const context = rebuildSynthesisSidecarTraceContext({
      schema: "synthesis-sidecar-observation.v2",
      traceId: "1".repeat(32),
      spanId: "2".repeat(16),
      attempt: 0,
    });
    const event = rebuildSynthesisSidecarObservationEvent({
      ...context,
      source: "rust-sidecar",
      boundary: "operation",
      phase: "terminal",
      outcome: "succeeded",
      occurredAtMs: 0,
      metrics: { sqlQueryCount: 0, sqlWriteCount: 0 },
      facts: {
        semanticStatus: "promoted",
        matchingHash: `sha256:${"c".repeat(64)}`,
        proposalCount: 0,
        factCount: 2,
        warningCount: 0,
      },
    });
    assert.deepEqual(event.facts, {
      semanticStatus: "promoted",
      matchingHash: `sha256:${"c".repeat(64)}`,
      proposalCount: 0,
      factCount: 2,
      warningCount: 0,
    });
    assert.deepEqual(event.metrics, { sqlQueryCount: 0, sqlWriteCount: 0 });
    for (const invalid of [
      { ...event, payload: { title: "private" } },
      { ...event, code: "private error at /tmp/library" },
      { ...event, facts: { ...event.facts, locator: "zotero://item/1" } },
    ]) {
      assert.throws(() => rebuildSynthesisSidecarObservationEvent(invalid));
    }
  });

  it("rejects unknown native fields instead of projecting them", function () {
    const value = {
      schema: "synthesis-sidecar-observation.v2",
      traceId: "1".repeat(32),
      spanId: "2".repeat(16),
      attempt: 0,
      source: "rust-sidecar",
      boundary: "child-worker",
      phase: "terminal",
      outcome: "failed",
      code: "worker_failed",
      occurredAtMs: 1,
      metrics: { queueWaitMs: 0 },
      facts: { proposalCount: 0, warningCount: 0 },
    };
    assert.deepEqual(parseNativeDiagnosticEvent(JSON.stringify(value)), value);
    assert.isUndefined(
      parseNativeDiagnosticEvent(
        JSON.stringify({ ...value, payload: { title: "private" } }),
      ),
    );
  });

  it("does no trace construction, storage, or patch publication behind the gate", function () {
    const patches: unknown[] = [];
    setDebugModeOverrideForTests(false);
    const unsubscribe = subscribeSynthesisSidecarTracePatches((patch) =>
      patches.push(patch),
    );
    const context = createSynthesisSidecarTraceContext();
    assert.isUndefined(context);
    assert.isUndefined(
      recordSynthesisSidecarTraceEvent({
        context,
        source: "host",
        boundary: "host-rpc",
        phase: "request",
        outcome: "started",
      }),
    );
    flushSynthesisSidecarTracePatchesForTests();
    unsubscribe();
    assert.deepEqual(readSynthesisSidecarTraceSnapshot().traces, []);
    assert.deepEqual(patches, []);
  });

  it("batches patches and preserves root, first failure, terminal, and dropped count", function () {
    const patches: unknown[] = [];
    const unsubscribe = subscribeSynthesisSidecarTracePatches((patch) =>
      patches.push(patch),
    );
    const root = createSynthesisSidecarTraceContext()!;
    recordSynthesisSidecarTraceEvent({
      context: root,
      source: "host",
      boundary: "host-rpc",
      phase: "request",
      outcome: "started",
      occurredAtMs: 1,
    });
    for (let index = 0; index < 140; index += 1) {
      const child = createSynthesisSidecarTraceContext({
        parent: root,
        attempt: index,
      })!;
      recordSynthesisSidecarTraceEvent({
        context: child,
        source: "child-worker",
        boundary: "child-worker",
        phase: "attempt",
        outcome: index === 130 ? "failed" : "succeeded",
        ...(index === 130 ? { code: "worker_failed" } : {}),
        occurredAtMs: index + 2,
      });
    }
    recordSynthesisSidecarTraceEvent({
      context: root,
      source: "host",
      boundary: "host-rpc",
      phase: "terminal",
      outcome: "failed",
      code: "service_unavailable",
      occurredAtMs: 200,
    });
    flushSynthesisSidecarTracePatchesForTests();
    unsubscribe();

    const trace = readSynthesisSidecarTraceSnapshot().traces[0]!;
    assert.lengthOf(trace.events, 128);
    assert.isAbove(trace.droppedCount, 0);
    assert.isFalse(trace.active);
    assert.equal(trace.events[0]?.outcome, "started");
    assert.isTrue(trace.events.some((event) => event.code === "worker_failed"));
    assert.equal(trace.events[127]?.phase, "terminal");
    assert.lengthOf(patches, 1);
  });

  it("propagates trace context over RPC only in debug mode", async function () {
    const bodies: Record<string, unknown>[] = [];
    const events: unknown[] = [];
    const rpc = createSynthesisSidecarRpcClient({
      recordTraceEvent: (event) => events.push(event),
      fetch: (async (_input: unknown, init?: RequestInit) => {
        const request = JSON.parse(String(init?.body || "{}"));
        bodies.push(request);
        return new Response(
          JSON.stringify({
            ok: true,
            requestId: request.requestId,
            serviceInstanceId: "service-1",
            data: { accepted: true },
          }),
          { status: 200 },
        );
      }) as typeof fetch,
    });
    const connection = {
      baseUrl: "http://127.0.0.1:1",
      profileId: "profile-1",
      clientToken: "secret-token",
      serviceInstanceId: "service-1",
    };
    await rpc.call({
      connection,
      capability: "client.listTopics",
      payload: { privateValue: "not-observed" },
      rebuildResult: (value) => value,
    });
    assert.property(bodies[0] || {}, "trace");
    assert.lengthOf(events, 2);
    assert.notInclude(JSON.stringify(events), "not-observed");
    assert.notInclude(JSON.stringify(events), "secret-token");

    setDebugModeOverrideForTests(false);
    await rpc.call({
      connection,
      capability: "client.listTopics",
      payload: {},
      rebuildResult: (value) => value,
    });
    assert.notProperty(bodies[1] || {}, "trace");
    assert.lengthOf(events, 2);
  });

  it("preserves native operation timeout separately from local transport timeout", async function () {
    const connection = {
      baseUrl: "http://127.0.0.1:1",
      profileId: "profile-1",
      clientToken: "secret-token",
      serviceInstanceId: "service-1",
    };
    const rpc = createSynthesisSidecarRpcClient({
      transportErrors: SYNTHESIS_PRODUCTION_RPC_TRANSPORT_ERRORS,
      fetch: (async (_input: unknown, init?: RequestInit) => {
        const request = JSON.parse(String(init?.body || "{}"));
        return new Response(
          JSON.stringify({
            ok: false,
            requestId: request.requestId,
            serviceInstanceId: "service-1",
            error: { code: "operation_timeout", details: {} },
          }),
          { status: 408 },
        );
      }) as typeof fetch,
    });
    let failure: unknown;
    try {
      await rpc.call({
        connection,
        capability: "client.refreshReferenceSidecarNow",
        payload: {},
        rebuildResult: (value) => value,
      });
    } catch (error) {
      failure = error;
    }
    assert.instanceOf(failure, SynthesisSidecarRpcError);
    assert.equal(
      (failure as SynthesisSidecarRpcError).code,
      "operation_timeout",
    );
  });

  it("binds and elides the independent sidecar observation switch", async function () {
    const config = await fs.readFile("zotero-plugin.config.ts", "utf8");
    assert.include(
      config,
      "__synthesis_sidecar_diagnostics_enabled__: String(",
    );
    const manifest = await fs.readFile(
      "scripts/runtime-diagnostics-production-manifest.ts",
      "utf8",
    );
    assert.include(manifest, "src/modules/synthesisSidecarTrace.ts");
    assert.include(manifest, "synthesis-sidecar-observation.v2");
  });
});
