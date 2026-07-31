import { assert } from "chai";
import { promises as fs } from "node:fs";
import {
  beginSynthesisSidecarStartupAttempt,
  getSynthesisSidecarDiagnosticSnapshot,
  listSynthesisSidecarDiagnosticEvents,
  recordSynthesisSidecarStartupPhase,
  resetSynthesisSidecarDiagnosticsForTests,
} from "../../src/modules/synthesisSidecarDiagnostics";
import {
  recordSynthesisSidecarDiagnosticEvent,
  synthesisSidecarDiagnosticCode,
} from "../../src/modules/synthesisSidecarDiagnosticEvents";
import {
  buildRuntimeIssueDiagnosticBundle,
  clearRuntimeLogs,
  listRuntimeLogs,
} from "../../src/modules/runtimeLogManager";
import {
  setDebugModeOverrideForTests,
  setSynthesisSidecarDiagnosticsSourceOverrideForTests,
} from "../../src/modules/debugMode";
import {
  createSynthesisSidecarRpcClient,
  SynthesisSidecarRpcError,
} from "../../src/modules/synthesisSidecarRpcClient";
import { SYNTHESIS_PRODUCTION_RPC_TRANSPORT_ERRORS } from "../../src/modules/synthesisProductionRpcPolicy";

describe("Synthesis sidecar debug observability", function () {
  beforeEach(function () {
    setDebugModeOverrideForTests(true);
    setSynthesisSidecarDiagnosticsSourceOverrideForTests(true);
    resetSynthesisSidecarDiagnosticsForTests();
    void clearRuntimeLogs();
  });

  afterEach(function () {
    setSynthesisSidecarDiagnosticsSourceOverrideForTests(undefined);
    setDebugModeOverrideForTests(undefined);
    resetSynthesisSidecarDiagnosticsForTests();
  });

  it("projects one correlated startup attempt while logging only its failure", function () {
    const attemptId = beginSynthesisSidecarStartupAttempt();
    recordSynthesisSidecarStartupPhase({
      attemptId,
      phase: "runtime-install",
      status: "running",
      evidence: {
        bundleId: "bundle-1",
        runtimeRoot: "/profile/zotero-agents",
      },
    });
    recordSynthesisSidecarStartupPhase({
      attemptId,
      phase: "runtime-install",
      status: "failed",
      code: "sidecar_runtime_missing",
      error: new Error("sidecar_runtime_missing"),
    });

    const snapshot = getSynthesisSidecarDiagnosticSnapshot();
    assert.equal(snapshot?.attemptId, attemptId);
    assert.equal(snapshot?.phase, "runtime-install");
    assert.equal(snapshot?.status, "failed");
    assert.equal(snapshot?.code, "sidecar_runtime_missing");
    assert.deepEqual(snapshot?.evidence, {
      bundleId: "bundle-1",
      runtimeRoot: "/profile/zotero-agents",
    });

    const logs = listRuntimeLogs({
      component: "synthesis-sidecar-lifecycle",
      operation: "production-startup",
      order: "asc",
    });
    assert.deepEqual(
      logs.map((entry) => [entry.phase, entry.stage]),
      [["runtime-install", "failed"]],
    );
    assert.isTrue(logs.every((entry) => entry.requestId === attemptId));
    assert.deepEqual(
      buildRuntimeIssueDiagnosticBundle({
        includeDebug: true,
      }).debugContext?.synthesisSidecar,
      snapshot,
    );
  });

  it("prefers structured runtime-admission reasons over prose", function () {
    const error = {
      code: "conflict",
      message: "The admitted native owner does not match this runtime",
      details: { reason: "runtime_mismatch" },
    };
    assert.equal(synthesisSidecarDiagnosticCode(error), "runtime_mismatch");
    assert.equal(
      synthesisSidecarDiagnosticCode(
        new Error("The admitted native owner does not match this runtime"),
      ),
      "synthesis_sidecar_startup_failed",
    );

    const attemptId = beginSynthesisSidecarStartupAttempt();
    recordSynthesisSidecarStartupPhase({
      attemptId,
      phase: "runtime-admission",
      status: "running",
      evidence: {
        currentBuildFingerprint: "a".repeat(64),
        targetBuildFingerprint: "b".repeat(64),
      },
    });
    recordSynthesisSidecarStartupPhase({
      attemptId,
      phase: "runtime-admission",
      status: "failed",
      code: synthesisSidecarDiagnosticCode(error),
      error,
    });
    const snapshot = getSynthesisSidecarDiagnosticSnapshot();
    assert.equal(snapshot?.phase, "runtime-admission");
    assert.equal(snapshot?.code, "runtime_mismatch");
    assert.equal(snapshot?.evidence.currentBuildFingerprint, "a".repeat(64));
    assert.equal(snapshot?.evidence.targetBuildFingerprint, "b".repeat(64));
  });

  it("does not retain diagnostic state outside debug mode", function () {
    setDebugModeOverrideForTests(false);
    const attemptId = beginSynthesisSidecarStartupAttempt();
    recordSynthesisSidecarStartupPhase({
      attemptId,
      phase: "runtime-install",
      status: "failed",
      code: "sidecar_runtime_missing",
    });

    assert.isUndefined(getSynthesisSidecarDiagnosticSnapshot());
    const logs = listRuntimeLogs({
      component: "synthesis-sidecar-lifecycle",
    });
    assert.lengthOf(logs, 1);
    assert.equal(logs[0]?.level, "error");
    assert.equal(logs[0]?.stage, "failed");
  });

  it("does not retain diagnostic state when the independent source is disabled", function () {
    setSynthesisSidecarDiagnosticsSourceOverrideForTests(false);
    const attemptId = beginSynthesisSidecarStartupAttempt();
    recordSynthesisSidecarStartupPhase({
      attemptId,
      phase: "runtime-install",
      status: "running",
    });

    assert.isUndefined(getSynthesisSidecarDiagnosticSnapshot());
    assert.deepEqual(listSynthesisSidecarDiagnosticEvents(), []);
  });

  it("keeps only failure summaries in normal mode and full correlated events in debug mode", function () {
    recordSynthesisSidecarDiagnosticEvent({
      component: "reverse-host",
      stage: "request-started",
      status: "started",
      capability: "library.artifacts.read",
      requestId: "request-debug",
      operationId: "operation-debug",
      requestBytes: 128,
    });
    recordSynthesisSidecarDiagnosticEvent({
      component: "reverse-host",
      stage: "response-completed",
      status: "succeeded",
      capability: "library.artifacts.read",
      requestId: "request-debug",
      operationId: "operation-debug",
      responseBytes: 512,
      durationMs: 4,
    });
    assert.deepEqual(
      listSynthesisSidecarDiagnosticEvents().map((event) => event.status),
      ["started", "succeeded"],
    );
    assert.lengthOf(
      listRuntimeLogs({
        component: "synthesis-sidecar",
        requestId: "request-debug",
      }),
      0,
    );

    setDebugModeOverrideForTests(false);
    recordSynthesisSidecarDiagnosticEvent({
      component: "rpc",
      stage: "request-started",
      status: "started",
      capability: "client.refreshReferenceSidecarNow",
      requestId: "request-normal",
    });
    recordSynthesisSidecarDiagnosticEvent({
      component: "rpc",
      stage: "request-failed",
      status: "failed",
      capability: "client.refreshReferenceSidecarNow",
      requestId: "request-normal",
      code: "reverse_host_response_body_truncated",
      durationMs: 8,
    });

    const normalLogs = listRuntimeLogs({
      component: "synthesis-sidecar",
      requestId: "request-normal",
      order: "asc",
    });
    assert.deepEqual(
      normalLogs.map((entry) => [entry.stage, entry.level]),
      [["request-failed", "error"]],
    );
  });

  it("bounds the debug timeline and retains exact capacity evidence", function () {
    const previousDebug = console.debug;
    const previousError = console.error;
    const runtime = globalThis as typeof globalThis & {
      Zotero?: { debug?: (message: string) => void };
    };
    const previousZoteroDebug = runtime.Zotero?.debug;
    console.debug = () => undefined;
    console.error = () => undefined;
    if (runtime.Zotero) runtime.Zotero.debug = () => undefined;
    try {
      for (let index = 0; index < 505; index += 1) {
        recordSynthesisSidecarDiagnosticEvent({
          component: "reverse-host",
          stage: "response-rejected",
          status: "failed",
          requestId: `request-${index}`,
          attemptedResponseBytes: 1_048_576 + index,
          limitBytes: 8 * 1_024 * 1_024,
          code: "reverse_host_response_too_large",
        });
      }
    } finally {
      console.debug = previousDebug;
      console.error = previousError;
      if (runtime.Zotero) runtime.Zotero.debug = previousZoteroDebug;
    }

    const events = listSynthesisSidecarDiagnosticEvents();
    assert.lengthOf(events, 500);
    assert.equal(events[0]?.requestId, "request-5");
    assert.equal(events[499]?.attemptedResponseBytes, 1_049_080);
    assert.equal(events[499]?.limitBytes, 8 * 1_024 * 1_024);
  });

  it("emits payload-free debug events to both console sinks", function () {
    const consoleCalls: unknown[][] = [];
    const zoteroCalls: string[] = [];
    const previousDebug = console.debug;
    const runtime = globalThis as typeof globalThis & {
      Zotero?: { debug?: (message: string) => void };
    };
    const previousZotero = runtime.Zotero;
    const previousZoteroDebug = previousZotero?.debug;
    console.debug = (...args: unknown[]) => consoleCalls.push(args);
    if (runtime.Zotero) {
      runtime.Zotero.debug = (message: string) => zoteroCalls.push(message);
    } else {
      runtime.Zotero = {
        debug: (message: string) => zoteroCalls.push(message),
      };
    }
    try {
      recordSynthesisSidecarDiagnosticEvent({
        component: "reverse-host",
        stage: "handler-completed",
        status: "succeeded",
        capability: "library.artifacts.read",
        requestId: "request-console",
        operationId: "operation-console",
        responseBytes: 256,
      });
    } finally {
      console.debug = previousDebug;
      if (previousZotero) {
        previousZotero.debug = previousZoteroDebug;
        runtime.Zotero = previousZotero;
      } else {
        delete runtime.Zotero;
      }
    }

    assert.lengthOf(consoleCalls, 1);
    assert.lengthOf(zoteroCalls, 1);
    const serialized = JSON.stringify([consoleCalls, zoteroCalls]);
    assert.include(serialized, "[synthesis-sidecar]");
    assert.notInclude(serialized, "authorization");
    assert.notInclude(serialized, "payload");
  });

  it("correlates RPC request and response metadata without retaining payloads", async function () {
    const events: Record<string, unknown>[] = [];
    let clock = 10;
    const rpc = createSynthesisSidecarRpcClient({
      now: () => clock++,
      recordDiagnosticEvent: (event) => events.push(event),
      fetch: (async (_input: unknown, init?: RequestInit) => {
        const request = JSON.parse(String(init?.body || "{}"));
        const source = JSON.stringify({
          ok: true,
          requestId: request.requestId,
          serviceInstanceId: "service-1",
          data: { accepted: true },
        });
        return new Response(source, {
          status: 200,
          headers: { "content-length": String(Buffer.byteLength(source)) },
        });
      }) as typeof fetch,
    });

    assert.deepEqual(
      await rpc.call({
        connection: {
          baseUrl: "http://127.0.0.1:1",
          profileId: "profile-1",
          clientToken: "secret-token",
          serviceInstanceId: "service-1",
        },
        capability: "client.refreshReferenceSidecarNow",
        payload: { privateValue: "must-not-be-logged" },
        rebuildResult: (value) => value,
      }),
      { accepted: true },
    );

    assert.deepEqual(
      events.map((event) => [event.stage, event.status]),
      [
        ["request-started", "started"],
        ["request-completed", "succeeded"],
      ],
    );
    assert.equal(events[0]?.requestId, events[1]?.requestId);
    assert.equal(events[0]?.correlationId, events[0]?.requestId);
    assert.equal(events[1]?.correlationId, events[0]?.requestId);
    assert.isAbove(Number(events[0]?.requestBytes), 0);
    assert.isAbove(Number(events[1]?.responseBytes), 0);
    const serialized = JSON.stringify(events);
    assert.notInclude(serialized, "secret-token");
    assert.notInclude(serialized, "must-not-be-logged");
  });

  it("preserves native operation timeout and keeps local production timeout distinct", async function () {
    const connection = {
      baseUrl: "http://127.0.0.1:1",
      profileId: "profile-1",
      clientToken: "secret-token",
      serviceInstanceId: "service-1",
    };
    const nativeTimeout = createSynthesisSidecarRpcClient({
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
    let nativeFailure: unknown;
    try {
      await nativeTimeout.call({
        connection,
        capability: "client.refreshReferenceSidecarNow",
        payload: {},
        rebuildResult: (value) => value,
      });
    } catch (error) {
      nativeFailure = error;
    }
    assert.instanceOf(nativeFailure, SynthesisSidecarRpcError);
    assert.equal(
      (nativeFailure as SynthesisSidecarRpcError).code,
      "operation_timeout",
    );

    const localTimeout = createSynthesisSidecarRpcClient({
      deadlineMs: 1,
      transportErrors: SYNTHESIS_PRODUCTION_RPC_TRANSPORT_ERRORS,
      fetch: (() => new Promise<Response>(() => undefined)) as typeof fetch,
    });
    let localFailure: unknown;
    try {
      await localTimeout.call({
        connection,
        capability: "client.refreshReferenceSidecarNow",
        payload: {},
        rebuildResult: (value) => value,
      });
    } catch (error) {
      localFailure = error;
    }
    assert.instanceOf(localFailure, SynthesisSidecarRpcError);
    assert.equal(
      (localFailure as SynthesisSidecarRpcError).code,
      "request_timeout",
    );
  });

  it("preserves a bounded nested failure reason across the RPC boundary", async function () {
    const events: Record<string, unknown>[] = [];
    const rpc = createSynthesisSidecarRpcClient({
      recordDiagnosticEvent: (event) => events.push(event),
      fetch: (async (_input: unknown, init?: RequestInit) => {
        const request = JSON.parse(String(init?.body || "{}"));
        return new Response(
          JSON.stringify({
            ok: false,
            requestId: request.requestId,
            serviceInstanceId: "service-1",
            error: {
              code: "internal_error",
              details: {
                reason: "reverse_host_response_too_large",
              },
            },
          }),
          { status: 503 },
        );
      }) as typeof fetch,
    });

    let caught: unknown;
    try {
      await rpc.call({
        connection: {
          baseUrl: "http://127.0.0.1:1",
          profileId: "profile-1",
          clientToken: "secret-token",
          serviceInstanceId: "service-1",
        },
        capability: "client.refreshReferenceSidecarNow",
        payload: {},
        rebuildResult: (value) => value,
      });
    } catch (error) {
      caught = error;
    }

    assert.instanceOf(caught, SynthesisSidecarRpcError);
    assert.equal((caught as SynthesisSidecarRpcError).code, "internal_error");
    assert.deepEqual((caught as SynthesisSidecarRpcError).details, {
      reason: "reverse_host_response_too_large",
    });
    assert.deepInclude(events[events.length - 1], {
      stage: "request-failed",
      status: "failed",
      code: "reverse_host_response_too_large",
    });
  });

  it("ignores stale events from an earlier attempt", function () {
    const staleAttempt = beginSynthesisSidecarStartupAttempt();
    const currentAttempt = beginSynthesisSidecarStartupAttempt();
    recordSynthesisSidecarStartupPhase({
      attemptId: staleAttempt,
      phase: "backup",
      status: "failed",
      code: "stale_failure",
    });

    assert.equal(
      getSynthesisSidecarDiagnosticSnapshot()?.attemptId,
      currentAttempt,
    );
    assert.equal(getSynthesisSidecarDiagnosticSnapshot()?.phase, "startup");
  });

  it("bounds process tails and redacts credential-shaped values", function () {
    const attemptId = beginSynthesisSidecarStartupAttempt();
    recordSynthesisSidecarStartupPhase({
      attemptId,
      phase: "supervisor-launch",
      status: "failed",
      evidence: {
        stderrTail: `${"x".repeat(20_000)} clientToken=private-value`,
      },
    });

    const tail =
      getSynthesisSidecarDiagnosticSnapshot()?.evidence.stderrTail || "";
    assert.isAtMost(tail.length, 8_192);
    assert.notInclude(tail, "private-value");
    assert.include(tail, "<redacted>");
  });

  it("binds the debug-mode constant in the independent Workbench bundle", async function () {
    const config = await fs.readFile("zotero-plugin.config.ts", "utf8");
    const workbenchEntry = config.indexOf(
      'entryPoints: ["src/synthesisWorkbenchApp.ts"]',
    );
    const nextEntry = config.indexOf(
      'entryPoints: ["src/workspaceApp.ts"]',
      workbenchEntry,
    );
    assert.isAtLeast(workbenchEntry, 0);
    assert.isAbove(nextEntry, workbenchEntry);
    const workbenchBuild = config.slice(workbenchEntry, nextEntry);

    assert.include(workbenchBuild, "__debug_mode__: String(DEBUG_MODE)");
    assert.include(workbenchBuild, "minifySyntax: true");
  });

  it("binds the independent Synthesis source switch in plugin and Dashboard builds", async function () {
    const config = await fs.readFile("zotero-plugin.config.ts", "utf8");
    assert.include(
      config,
      "__synthesis_sidecar_diagnostics_enabled__: String(",
    );
    assert.include(config, 'entryPoints: ["addon/content/dashboard/app.js"]');
  });
});
