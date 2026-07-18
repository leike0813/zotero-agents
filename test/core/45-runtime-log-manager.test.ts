import { assert } from "chai";
import fs from "node:fs";
import path from "node:path";
import { config } from "../../package.json";
import {
  appendRuntimeLog,
  buildRuntimeDiagnosticBundle,
  buildRuntimeIssueDiagnosticBundle,
  buildRuntimeIssueSummary,
  clearRuntimeLogs,
  flushRuntimeLogsPersistence,
  getRuntimeLogDiagnosticMode,
  getRuntimeLogPersistenceStateForTests,
  getRuntimeLogRetentionConfig,
  getRuntimeLogSummary,
  initializeRuntimeLogsPersistence,
  listRuntimeLogs,
  resetRuntimeLogHydrationForTests,
  resetRuntimeLogAllowedLevels,
  setRuntimeLogPersistenceWriterForTests,
  setRuntimeLogDiagnosticMode,
  setRuntimeLogAllowedLevels,
  snapshotRuntimeLogs,
  subscribeRuntimeLogs,
} from "../../src/modules/runtimeLogManager";
import { setDebugModeOverrideForTests } from "../../src/modules/debugMode";
import {
  enableAcpRuntimePerformanceProfiler,
  incrementAcpRuntimeMetric,
  resetAcpRuntimePerformanceProfilerForTests,
  startAcpRuntimeProfile,
} from "../../src/modules/acpRuntimePerformanceProfiler";

describe("runtime log manager", function () {
  function readPersistedRuntimeLogDocument() {
    const state = getRuntimeLogPersistenceStateForTests();
    const raw = fs.existsSync(state.path)
      ? fs.readFileSync(state.path, "utf8")
      : "{}";
    return JSON.parse(raw || "{}") as { entries?: Array<{ stage?: string }> };
  }

  beforeEach(async function () {
    resetRuntimeLogHydrationForTests();
    await initializeRuntimeLogsPersistence();
    await clearRuntimeLogs();
    resetRuntimeLogAllowedLevels();
    setRuntimeLogDiagnosticMode(false);
  });

  afterEach(async function () {
    setRuntimeLogPersistenceWriterForTests(null);
    resetAcpRuntimePerformanceProfilerForTests();
    setDebugModeOverrideForTests();
    await clearRuntimeLogs();
    resetRuntimeLogAllowedLevels();
    setRuntimeLogDiagnosticMode(false);
    await flushRuntimeLogsPersistence();
  });

  it("includes active profiler aggregates only when the debug profiler is enabled", function () {
    assert.notProperty(buildRuntimeDiagnosticBundle(), "performanceProfiles");
    assert.notProperty(
      buildRuntimeIssueDiagnosticBundle(),
      "performanceProfiles",
    );

    setDebugModeOverrideForTests(true);
    enableAcpRuntimePerformanceProfiler();
    startAcpRuntimeProfile({
      requestId: "diagnostic-profile",
      displayMode: "silent",
      transport: "stdio",
      zoteroMajor: 9,
    });
    incrementAcpRuntimeMetric("diagnostic-profile", "session_update", {
      updateClass: "assistant-message",
    });

    const rawBundle = buildRuntimeDiagnosticBundle();
    const issueBundle = buildRuntimeIssueDiagnosticBundle();
    assert.equal(
      rawBundle.performanceProfiles?.active[0].requestId,
      "diagnostic-profile",
    );
    assert.equal(
      issueBundle.performanceProfiles?.active[0].requestId,
      "diagnostic-profile",
    );
    assert.equal(
      rawBundle.performanceProfiles?.active[0].metrics[0].counter?.total,
      1,
    );
  });

  it("normalizes schema and redacts sensitive fields", function () {
    const entry = appendRuntimeLog({
      level: "error",
      scope: "provider",
      workflowId: "mineru",
      requestId: "req-1",
      jobId: "job-1",
      stage: "upload",
      message: "provider failed",
      details: {
        authorization: "Bearer secret-token",
        token: "abc",
        nested: {
          access_token: "xyz",
          visible: "ok",
        },
      },
      error: new Error("boom"),
    });
    assert.isOk(entry);
    assert.match(entry!.id, /^log-\d+$/);
    assert.equal(entry!.level, "error");
    assert.equal(entry!.scope, "provider");
    assert.equal(
      entry!.details && (entry!.details as any).authorization,
      "<redacted>",
    );
    assert.equal(entry!.details && (entry!.details as any).token, "<redacted>");
    assert.equal(
      entry!.details && (entry!.details as any).nested?.access_token,
      "<redacted>",
    );
    assert.equal(
      entry!.details && (entry!.details as any).nested?.visible,
      "ok",
    );
    assert.equal(entry!.error?.message, "boom");
  });

  it("skips debug logs by default and keeps error logs", function () {
    const skipped = appendRuntimeLog({
      level: "debug",
      scope: "system",
      stage: "debug-stage",
      message: "debug message",
    });
    assert.isNull(skipped);
    assert.lengthOf(listRuntimeLogs(), 0);

    appendRuntimeLog({
      level: "error",
      scope: "system",
      stage: "error-stage",
      message: "error message",
    });
    assert.lengthOf(listRuntimeLogs(), 1);
  });

  it("enforces fixed retention with oldest-first eviction", function () {
    this.timeout(10000);
    setRuntimeLogDiagnosticMode(true);
    for (let i = 0; i < 2005; i++) {
      appendRuntimeLog({
        level: "debug",
        scope: "system",
        stage: `s-${i}`,
        message: `m-${i}`,
      });
    }
    const snapshot = snapshotRuntimeLogs();
    assert.equal(snapshot.entries.length, 2005);
    assert.equal(snapshot.maxEntries, 3000);
  });

  it("enforces diagnostic mode dual budget with byte-limit eviction", function () {
    this.timeout(15000);
    setRuntimeLogDiagnosticMode(true);
    const oversizedDetails = Array.from(
      { length: 90 },
      (_, index) => `detail-${index}-${"x".repeat(4000)}`,
    );
    for (let i = 0; i < 80; i++) {
      appendRuntimeLog({
        level: "debug",
        scope: "system",
        stage: `s-${i}`,
        message: `m-${i}`,
        details: {
          oversizedDetails,
        },
      });
    }
    const snapshot = snapshotRuntimeLogs();
    assert.isBelow(snapshot.entries.length, 2200);
    assert.isAtLeast(snapshot.droppedEntries, 1);
    assert.isAtLeast(snapshot.droppedByReason.byte_budget, 1);
  });

  it("keeps normal mode entry budget and drops oldest entries", function () {
    this.timeout(10000);
    for (let i = 0; i < 2005; i++) {
      appendRuntimeLog({
        level: "info",
        scope: "system",
        stage: `s-${i}`,
        message: `m-${i}`,
      });
    }
    const snapshot = snapshotRuntimeLogs();
    assert.equal(snapshot.entries.length, 2000);
    assert.equal(snapshot.droppedEntries, 5);
    assert.equal(snapshot.entries[0].stage, "s-5");
    assert.equal(snapshot.entries[snapshot.entries.length - 1].stage, "s-2004");
    assert.equal(snapshot.maxEntries, 2000);
  });

  it("supports filtering and ordering", function () {
    appendRuntimeLog({
      level: "info",
      scope: "workflow-trigger",
      workflowId: "a",
      stage: "start",
      message: "start",
    });
    appendRuntimeLog({
      level: "warn",
      scope: "job",
      workflowId: "a",
      jobId: "job-1",
      stage: "warn-stage",
      message: "warn",
    });
    appendRuntimeLog({
      level: "error",
      scope: "job",
      workflowId: "b",
      jobId: "job-2",
      stage: "error-stage",
      message: "error",
    });

    const filtered = listRuntimeLogs({
      levels: ["warn", "error"],
      scopes: ["job"],
      workflowId: "a",
      order: "desc",
    });
    assert.lengthOf(filtered, 1);
    assert.equal(filtered[0].stage, "warn-stage");
  });

  it("persists logs into runtime log storage and clears legacy prefs payload", async function () {
    appendRuntimeLog({
      level: "info",
      scope: "system",
      stage: "persist-stage",
      message: "persist message",
    });
    await flushRuntimeLogsPersistence();
    const prefKey = `${config.prefsPrefix}.runtimeLogsJson`;
    const rawPersisted = String(
      (globalThis as any).Zotero.Prefs.get(prefKey, true) || "",
    );
    assert.equal(rawPersisted, "");
    const parsedPersisted = readPersistedRuntimeLogDocument();
    assert.equal(parsedPersisted.entries?.length || 0, 1);

    await clearRuntimeLogs();
    const rawCleared = String(
      (globalThis as any).Zotero.Prefs.get(prefKey, true) || "",
    );
    assert.equal(rawCleared, "");
    const parsedCleared = readPersistedRuntimeLogDocument();
    assert.equal(parsedCleared.entries?.length || 0, 0);
  });

  it("hydrates legacy prefs payload into runtime log storage", async function () {
    resetRuntimeLogHydrationForTests();
    const state = getRuntimeLogPersistenceStateForTests();
    const prefKey = `${config.prefsPrefix}.runtimeLogsJson`;
    Zotero.Prefs.set(
      prefKey,
      JSON.stringify({
        entries: [
          {
            id: "log-legacy-1",
            ts: new Date().toISOString(),
            level: "info",
            scope: "system",
            schemaVersion: 1,
            diagnosticMode: false,
            stage: "legacy-pref-stage",
            message: "legacy pref message",
          },
        ],
      }),
      true,
    );
    if (fs.existsSync(state.path)) {
      fs.unlinkSync(state.path);
    }
    assert.isFalse(fs.existsSync(state.path));
    assert.include(
      String(Zotero.Prefs.get(prefKey, true) || ""),
      "legacy-pref-stage",
    );

    await initializeRuntimeLogsPersistence();
    const entries = listRuntimeLogs();
    assert.lengthOf(entries, 1);
    assert.equal(entries[0].stage, "legacy-pref-stage");
    await flushRuntimeLogsPersistence();

    assert.equal(String(Zotero.Prefs.get(prefKey, true) || ""), "");
    const persisted = readPersistedRuntimeLogDocument();
    assert.equal(persisted.entries?.[0]?.stage, "legacy-pref-stage");
  });

  it("coalesces append persistence until an explicit durability boundary flushes", async function () {
    const baseline = getRuntimeLogPersistenceStateForTests().flushCount;

    appendRuntimeLog({
      level: "info",
      scope: "system",
      stage: "batched-1",
      message: "batched-1",
    });
    appendRuntimeLog({
      level: "info",
      scope: "system",
      stage: "batched-2",
      message: "batched-2",
    });
    appendRuntimeLog({
      level: "warn",
      scope: "system",
      stage: "batched-3",
      message: "batched-3",
    });

    assert.deepInclude(getRuntimeLogPersistenceStateForTests(), {
      dirty: true,
      hasPendingTimer: true,
      hasIdleTimer: true,
      hasMaxDelayTimer: true,
      flushCount: baseline,
    });

    await flushRuntimeLogsPersistence();

    assert.deepInclude(getRuntimeLogPersistenceStateForTests(), {
      dirty: false,
      hasPendingTimer: false,
      hasIdleTimer: false,
      hasMaxDelayTimer: false,
      flushCount: baseline + 1,
    });
  });

  it("keeps snapshot and bundle reads pure while persistence remains scheduled", function () {
    appendRuntimeLog({
      level: "info",
      scope: "system",
      stage: "snapshot-stage",
      message: "snapshot-message",
    });

    assert.deepInclude(getRuntimeLogPersistenceStateForTests(), {
      dirty: true,
      hasPendingTimer: true,
    });

    const snapshot = snapshotRuntimeLogs();
    assert.lengthOf(snapshot.entries, 1);
    assert.deepInclude(getRuntimeLogPersistenceStateForTests(), {
      dirty: true,
      hasPendingTimer: true,
    });

    appendRuntimeLog({
      level: "error",
      scope: "system",
      requestId: "bundle-req",
      stage: "bundle-stage",
      message: "bundle-message",
    });
    assert.deepInclude(getRuntimeLogPersistenceStateForTests(), {
      dirty: true,
      hasPendingTimer: true,
    });

    const bundle = buildRuntimeDiagnosticBundle({
      filters: {
        requestId: "bundle-req",
      },
    });
    assert.equal(bundle.entries.length, 1);
    assert.deepInclude(getRuntimeLogPersistenceStateForTests(), {
      dirty: true,
      hasPendingTimer: true,
    });
  });

  it("hydrates an existing runtime log file only during explicit async initialization", async function () {
    resetRuntimeLogHydrationForTests();
    const state = getRuntimeLogPersistenceStateForTests();
    fs.mkdirSync(path.dirname(state.path), { recursive: true });
    fs.writeFileSync(
      state.path,
      JSON.stringify({
        entries: [
          {
            id: "log-async-hydration",
            ts: new Date().toISOString(),
            level: "info",
            scope: "system",
            schemaVersion: 1,
            diagnosticMode: false,
            stage: "async-hydration-stage",
            message: "hydrated asynchronously",
          },
        ],
      }),
      "utf8",
    );

    assert.lengthOf(listRuntimeLogs(), 0);
    await initializeRuntimeLogsPersistence();

    assert.equal(listRuntimeLogs()[0]?.stage, "async-hydration-stage");
  });

  it("leaves a malformed runtime log file untouched and records hydration failure", async function () {
    resetRuntimeLogHydrationForTests();
    const state = getRuntimeLogPersistenceStateForTests();
    fs.mkdirSync(path.dirname(state.path), { recursive: true });
    fs.writeFileSync(state.path, '{"entries":[bad json', "utf8");
    const failuresBefore = state.fileFailureCount;

    await initializeRuntimeLogsPersistence();

    assert.lengthOf(listRuntimeLogs(), 0);
    assert.equal(fs.readFileSync(state.path, "utf8"), '{"entries":[bad json');
    assert.equal(
      getRuntimeLogPersistenceStateForTests().fileFailureCount,
      failuresBefore + 1,
    );
  });

  it("serializes each accepted entry once and reuses it for reads and persistence", async function () {
    const baseline =
      getRuntimeLogPersistenceStateForTests().entrySerializationCount;
    appendRuntimeLog({
      level: "info",
      scope: "provider",
      backendId: "backend-a",
      workflowId: "workflow-a",
      stage: "serialized-once",
      message: "serialized-once",
      details: { nested: { value: 1 } },
    });

    listRuntimeLogs();
    snapshotRuntimeLogs();
    getRuntimeLogSummary();
    await flushRuntimeLogsPersistence();

    assert.equal(
      getRuntimeLogPersistenceStateForTests().entrySerializationCount,
      baseline + 1,
    );
  });

  it("publishes lightweight changes and aggregate summary facets", function () {
    const changes: Array<Record<string, unknown>> = [];
    const unsubscribe = subscribeRuntimeLogs((change) => {
      changes.push(change as unknown as Record<string, unknown>);
    });
    try {
      appendRuntimeLog({
        level: "info",
        scope: "provider",
        backendId: "backend-a",
        workflowId: "workflow-a",
        stage: "summary-a",
        message: "summary-a",
      });
      appendRuntimeLog({
        level: "warn",
        scope: "provider",
        backendId: "backend-b",
        workflowId: "workflow-a",
        stage: "summary-b",
        message: "summary-b",
      });
    } finally {
      unsubscribe();
    }

    assert.equal(changes.length, 2);
    assert.equal(changes[0].kind, "append");
    assert.property(changes[0], "revision");
    assert.property(changes[0], "entry");
    assert.notProperty(changes[0], "entries");
    assert.notProperty(changes[0], "snapshot");
    const summary = getRuntimeLogSummary();
    assert.equal(summary.entryCount, 2);
    assert.deepEqual(summary.facets.backendIds, ["backend-a", "backend-b"]);
    assert.deepEqual(summary.facets.workflowIds, ["workflow-a"]);
  });

  it("keeps one save in flight and drains revisions appended during the write", async function () {
    const documents: string[] = [];
    let activeSaves = 0;
    let maxActiveSaves = 0;
    let releaseFirst!: () => void;
    let markFirstStarted!: () => void;
    const firstStarted = new Promise<void>((resolve) => {
      markFirstStarted = resolve;
    });
    const firstRelease = new Promise<void>((resolve) => {
      releaseFirst = resolve;
    });
    setRuntimeLogPersistenceWriterForTests(async ({ fragments }) => {
      activeSaves += 1;
      maxActiveSaves = Math.max(maxActiveSaves, activeSaves);
      if (documents.length === 0) {
        markFirstStarted();
        await firstRelease;
      }
      documents.push(Array.from(fragments).join(""));
      activeSaves -= 1;
    });

    appendRuntimeLog({
      level: "info",
      scope: "system",
      stage: "first-revision",
      message: "first-revision",
    });
    const firstFlush = flushRuntimeLogsPersistence();
    await firstStarted;
    appendRuntimeLog({
      level: "info",
      scope: "system",
      stage: "second-revision",
      message: "second-revision",
    });
    const secondFlush = flushRuntimeLogsPersistence();
    releaseFirst();
    await Promise.all([firstFlush, secondFlush]);

    assert.equal(maxActiveSaves, 1);
    assert.equal(documents.length, 2);
    assert.deepEqual(
      (
        JSON.parse(documents[1]) as { entries: Array<{ stage: string }> }
      ).entries.map((entry) => entry.stage),
      ["first-revision", "second-revision"],
    );
    assert.isFalse(getRuntimeLogPersistenceStateForTests().dirty);
  });

  it("does not resolve flush before the controlled write completes", async function () {
    let release!: () => void;
    let markStarted!: () => void;
    const started = new Promise<void>((resolve) => {
      markStarted = resolve;
    });
    const blocked = new Promise<void>((resolve) => {
      release = resolve;
    });
    setRuntimeLogPersistenceWriterForTests(async () => {
      markStarted();
      await blocked;
    });
    appendRuntimeLog({
      level: "info",
      scope: "system",
      stage: "true-flush",
      message: "true-flush",
    });

    let resolved = false;
    const flush = flushRuntimeLogsPersistence().then(() => {
      resolved = true;
    });
    await started;
    await Promise.resolve();
    assert.isFalse(resolved);
    release();
    await flush;
    assert.isTrue(resolved);
  });

  it("keeps failed revisions dirty and retries them on a later flush", async function () {
    let attempts = 0;
    setRuntimeLogPersistenceWriterForTests(async () => {
      attempts += 1;
      if (attempts === 1) {
        throw new Error("controlled persistence failure");
      }
    });
    appendRuntimeLog({
      level: "error",
      scope: "system",
      stage: "retry-dirty",
      message: "retry-dirty",
    });

    await flushRuntimeLogsPersistence();
    assert.isTrue(getRuntimeLogPersistenceStateForTests().dirty);
    assert.equal(attempts, 1);

    await flushRuntimeLogsPersistence();
    assert.isFalse(getRuntimeLogPersistenceStateForTests().dirty);
    assert.equal(attempts, 2);
  });

  it("supports diagnostic mode toggle", function () {
    assert.isFalse(getRuntimeLogDiagnosticMode());
    setRuntimeLogDiagnosticMode(true);
    assert.isTrue(getRuntimeLogDiagnosticMode());
    const debug = appendRuntimeLog({
      level: "debug",
      scope: "system",
      stage: "diag-stage",
      message: "diag message",
    });
    assert.isOk(debug);
    setRuntimeLogDiagnosticMode(false);
    const skipped = appendRuntimeLog({
      level: "debug",
      scope: "system",
      stage: "normal-stage",
      message: "normal message",
    });
    assert.isNull(skipped);
  });

  it("builds RuntimeDiagnosticBundleV1 and issue summary", function () {
    setRuntimeLogDiagnosticMode(true);
    appendRuntimeLog({
      level: "error",
      scope: "provider",
      backendId: "b1",
      backendType: "skillrunner",
      providerId: "skillrunner",
      workflowId: "wf-1",
      runId: "run-1",
      requestId: "req-1",
      jobId: "job-1",
      component: "provider",
      operation: "dispatch",
      stage: "dispatch-failed",
      message: "request failed due to timeout",
      details: {
        authorization: "Bearer secret-value",
      },
      error: new Error("ETIMEDOUT"),
    });
    const bundle = buildRuntimeDiagnosticBundle({
      filters: {
        requestId: "req-1",
      },
    });
    assert.equal(bundle.schemaVersion, "runtime-diagnostic-bundle/v1");
    assert.equal(bundle.meta.diagnosticMode, true);
    assert.equal(bundle.entries.length, 1);
    assert.equal(
      (bundle.entries[0].details as any).authorization,
      "<redacted>",
    );
    assert.isTrue(Array.isArray(bundle.timeline));
    assert.isAtLeast(bundle.incidents.length, 1);
    const issue = buildRuntimeIssueSummary({
      filters: {
        requestId: "req-1",
      },
    });
    assert.include(issue, "Runtime Diagnostic Summary");
    assert.include(issue, "req-1");
  });

  it("builds high-signal issue diagnostic bundle without raw entries by default", function () {
    appendRuntimeLog({
      level: "info",
      scope: "provider",
      backendId: "acp-1",
      backendType: "acp",
      providerId: "acp",
      component: "acp-backend-probe",
      operation: "probe-acp-runtime-options",
      stage: "acp-runtime-options-probe-ok",
      message: "ACP backend runtime options cache refreshed",
      details: {
        authorization: "Bearer secret-value",
        cache: { displayModels: 2 },
      },
    });
    appendRuntimeLog({
      level: "info",
      scope: "provider",
      backendId: "acp-1",
      backendType: "acp",
      stage: "low-value-info",
      message: "ordinary info",
    });

    const bundle = buildRuntimeIssueDiagnosticBundle({
      filters: {
        backendId: "acp-1",
        backendType: "acp",
      },
    });

    assert.equal(bundle.schemaVersion, "runtime-issue-diagnostic-bundle/v1");
    assert.notProperty(bundle, "entries");
    assert.notProperty(bundle, "developerRawEntries");
    assert.equal(bundle.timeline.length, 1);
    assert.equal(bundle.timeline[0].stage, "acp-runtime-options-probe-ok");
    assert.equal(bundle.backendHealth.acpRuntimeOptions[0].status, "ok");
    assert.deepEqual(bundle.evidenceGaps, []);
    assert.equal(bundle.redaction.includesDebug, false);
    assert.equal(bundle.redaction.includesRawEntries, false);
  });

  it("resolves platform from Zotero flags or process fallback", function () {
    const runtime = globalThis as typeof globalThis & {
      Zotero?: { isWin?: boolean; isMac?: boolean; isLinux?: boolean };
    };
    const previousIsWin = runtime.Zotero?.isWin;
    const previousIsMac = runtime.Zotero?.isMac;
    const previousIsLinux = runtime.Zotero?.isLinux;
    try {
      runtime.Zotero = runtime.Zotero || {};
      runtime.Zotero.isWin = false;
      runtime.Zotero.isMac = true;
      runtime.Zotero.isLinux = false;
      assert.equal(
        buildRuntimeIssueDiagnosticBundle().environment.platform,
        "darwin",
      );

      runtime.Zotero.isMac = false;
      const platform = buildRuntimeDiagnosticBundle().meta.platform;
      assert.notEqual(platform, "unknown-platform");
      assert.include(platform, process.platform);
    } finally {
      if (runtime.Zotero) {
        runtime.Zotero.isWin = previousIsWin;
        runtime.Zotero.isMac = previousIsMac;
        runtime.Zotero.isLinux = previousIsLinux;
      }
    }
  });

  it("reports evidence gaps in issue diagnostic bundles", function () {
    appendRuntimeLog({
      level: "info",
      scope: "provider",
      backendId: "acp-missing",
      backendType: "acp",
      stage: "provider-started",
      message: "started",
    });

    const bundle = buildRuntimeIssueDiagnosticBundle({
      filters: {
        backendId: "acp-missing",
        backendType: "acp",
        requestId: "missing-request",
      },
    });

    assert.includeMembers(
      bundle.evidenceGaps.map((gap) => gap.code),
      ["no_retained_runtime_logs", "missing_request_context"],
    );
  });

  it("drops expired logs older than retention window", function () {
    const retentionMs = getRuntimeLogRetentionConfig().retentionMs;
    const expiredTs = new Date(
      Date.now() - retentionMs - 24 * 60 * 60 * 1000,
    ).toISOString();
    appendRuntimeLog({
      ts: expiredTs,
      level: "info",
      scope: "system",
      stage: "expired-stage",
      message: "expired-message",
    });
    const entries = listRuntimeLogs();
    assert.lengthOf(entries, 0);
    assert.isAtLeast(snapshotRuntimeLogs().droppedEntries, 1);
  });
});
