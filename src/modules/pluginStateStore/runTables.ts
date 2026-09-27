import {
  incrementAcpRuntimeMetric,
  observeAcpRuntimeDuration,
  readAcpRuntimePerformanceClockMs,
} from "../acp/diagnostics/acpRuntimePerformanceProfiler";
import { isDebugModeEnabled } from "../debugMode";
import type {
  PluginRunEventStoreEntry,
  PluginRunStoreEntry,
  PluginRunStoreKind,
  PluginRunStoreListOptions,
  WorkflowSequenceRunStoreEntry,
  WorkflowSequenceRunStoreListOptions,
} from "../pluginStateStore";
import {
  ensureJsonPayload,
  normalizeRowLimit,
  normalizeStates,
  normalizeString,
  nowIso,
  type SqlAdapter,
  type SqlParams,
} from "./core";

export function ensureRunTablesSchema(db: SqlAdapter) {
  db.run(`
    CREATE TABLE IF NOT EXISTS plugin_acp_skill_runs (
      run_key TEXT PRIMARY KEY,
      request_id TEXT NOT NULL DEFAULT '',
      backend_id TEXT NOT NULL DEFAULT '',
      state TEXT NOT NULL DEFAULT '',
      updated_at TEXT NOT NULL DEFAULT '',
      payload_json TEXT NOT NULL
    );
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS plugin_acp_skill_run_events (
      event_id TEXT PRIMARY KEY,
      run_key TEXT NOT NULL DEFAULT '',
      request_id TEXT NOT NULL DEFAULT '',
      backend_id TEXT NOT NULL DEFAULT '',
      type TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT '',
      payload_json TEXT NOT NULL
    );
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS plugin_skillrunner_runs (
      run_key TEXT PRIMARY KEY,
      request_id TEXT NOT NULL DEFAULT '',
      backend_id TEXT NOT NULL DEFAULT '',
      state TEXT NOT NULL DEFAULT '',
      updated_at TEXT NOT NULL DEFAULT '',
      payload_json TEXT NOT NULL
    );
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS plugin_skillrunner_run_events (
      event_id TEXT PRIMARY KEY,
      run_key TEXT NOT NULL DEFAULT '',
      request_id TEXT NOT NULL DEFAULT '',
      backend_id TEXT NOT NULL DEFAULT '',
      type TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT '',
      payload_json TEXT NOT NULL
    );
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS plugin_workflow_sequence_runs (
      sequence_run_id TEXT PRIMARY KEY,
      workflow_run_id TEXT NOT NULL DEFAULT '',
      workflow_id TEXT NOT NULL DEFAULT '',
      backend_id TEXT NOT NULL DEFAULT '',
      backend_type TEXT NOT NULL DEFAULT '',
      state TEXT NOT NULL DEFAULT '',
      updated_at TEXT NOT NULL DEFAULT '',
      payload_json TEXT NOT NULL
    );
  `);
  db.run(`
    CREATE INDEX IF NOT EXISTS idx_plugin_acp_skill_runs_backend_request
      ON plugin_acp_skill_runs(backend_id, request_id);
  `);
  db.run(`
    CREATE INDEX IF NOT EXISTS idx_plugin_acp_skill_runs_state_updated
      ON plugin_acp_skill_runs(state, updated_at DESC);
  `);
  db.run(`
    CREATE INDEX IF NOT EXISTS idx_plugin_acp_skill_run_events_run_created
      ON plugin_acp_skill_run_events(run_key, created_at DESC);
  `);
  db.run(`
    CREATE INDEX IF NOT EXISTS idx_plugin_skillrunner_runs_backend_request
      ON plugin_skillrunner_runs(backend_id, request_id);
  `);
  db.run(`
    CREATE INDEX IF NOT EXISTS idx_plugin_skillrunner_runs_state_updated
      ON plugin_skillrunner_runs(state, updated_at DESC);
  `);
  db.run(`
    CREATE INDEX IF NOT EXISTS idx_plugin_skillrunner_run_events_run_created
      ON plugin_skillrunner_run_events(run_key, created_at DESC);
  `);
  db.run(`
    CREATE INDEX IF NOT EXISTS idx_plugin_workflow_sequence_runs_workflow_run
      ON plugin_workflow_sequence_runs(workflow_run_id);
  `);
  db.run(`
    CREATE INDEX IF NOT EXISTS idx_plugin_workflow_sequence_runs_backend_state
      ON plugin_workflow_sequence_runs(backend_type, backend_id, state, updated_at DESC);
  `);
}

export function createRunTables(getAdapter: () => SqlAdapter) {
  function runStoreTables(kind: PluginRunStoreKind) {
    if (kind === "acp") {
      return {
        runs: "plugin_acp_skill_runs",
        events: "plugin_acp_skill_run_events",
      };
    }
    return {
      runs: "plugin_skillrunner_runs",
      events: "plugin_skillrunner_run_events",
    };
  }

  function normalizeRunStoreEntry(row: Record<string, unknown>) {
    return {
      runKey: normalizeString(row.run_key),
      requestId: normalizeString(row.request_id),
      backendId: normalizeString(row.backend_id),
      state: normalizeString(row.state),
      updatedAt: normalizeString(row.updated_at),
      payload: ensureJsonPayload(normalizeString(row.payload_json)),
    } satisfies PluginRunStoreEntry;
  }

  function normalizeRunEventStoreEntry(row: Record<string, unknown>) {
    return {
      eventId: normalizeString(row.event_id),
      runKey: normalizeString(row.run_key),
      requestId: normalizeString(row.request_id),
      backendId: normalizeString(row.backend_id),
      type: normalizeString(row.type),
      createdAt: normalizeString(row.created_at),
      payload: ensureJsonPayload(normalizeString(row.payload_json)),
    } satisfies PluginRunEventStoreEntry;
  }

  function normalizeWorkflowSequenceRunStoreEntry(
    row: Record<string, unknown>,
  ) {
    return {
      sequenceRunId: normalizeString(row.sequence_run_id),
      workflowRunId: normalizeString(row.workflow_run_id),
      workflowId: normalizeString(row.workflow_id),
      backendId: normalizeString(row.backend_id),
      backendType: normalizeString(row.backend_type),
      state: normalizeString(row.state),
      updatedAt: normalizeString(row.updated_at),
      payload: ensureJsonPayload(normalizeString(row.payload_json)),
    } satisfies WorkflowSequenceRunStoreEntry;
  }

  function listPluginRunStoreEntries(kind: PluginRunStoreKind) {
    return listPluginRunStoreEntriesFiltered(kind);
  }

  function listPluginRunStoreEntriesFiltered(
    kind: PluginRunStoreKind,
    options: PluginRunStoreListOptions = {},
  ) {
    const backendId = normalizeString(options.backendId);
    const requestId = normalizeString(options.requestId);
    const states = normalizeStates(options.states);
    const excludeStates = normalizeStates(options.excludeStates);
    const limit = normalizeRowLimit(options.limit);
    const where: string[] = [];
    const params: SqlParams = {};
    if (backendId) {
      where.push("backend_id=@backend_id");
      params.backend_id = backendId;
    }
    if (requestId) {
      where.push("request_id=@request_id");
      params.request_id = requestId;
    }
    states.forEach((state, index) => {
      const key = `state_${index}`;
      params[key] = state;
    });
    excludeStates.forEach((state, index) => {
      const key = `exclude_state_${index}`;
      params[key] = state;
    });
    if (states.length > 0) {
      where.push(
        `state IN (${states.map((_, index) => `@state_${index}`).join(", ")})`,
      );
    }
    if (excludeStates.length > 0) {
      where.push(
        `state NOT IN (${excludeStates
          .map((_, index) => `@exclude_state_${index}`)
          .join(", ")})`,
      );
    }
    if (limit) {
      params.limit = limit;
    }
    const db = getAdapter();
    const tables = runStoreTables(kind);
    const rows = db.all(
      `
      SELECT run_key, request_id, backend_id, state, updated_at, payload_json
      FROM ${tables.runs}
      ${where.length > 0 ? `WHERE ${where.join(" AND ")}` : ""}
      ORDER BY updated_at DESC
      ${limit ? "LIMIT @limit" : ""}
    `,
      params,
    );
    const entries = rows.map(normalizeRunStoreEntry);
    return limit ? entries.slice(0, limit) : entries;
  }

  function getPluginRunStoreEntry(kind: PluginRunStoreKind, runKeyRaw: string) {
    const runKey = normalizeString(runKeyRaw);
    if (!runKey) {
      return null;
    }
    const db = getAdapter();
    const tables = runStoreTables(kind);
    const row = db.get(
      `
        SELECT run_key, request_id, backend_id, state, updated_at, payload_json
        FROM ${tables.runs}
        WHERE run_key=@run_key
        LIMIT 1
      `,
      { run_key: runKey },
    );
    return row ? normalizeRunStoreEntry(row) : null;
  }

  function getPluginRunStoreEntryByRequest(args: {
    kind: PluginRunStoreKind;
    backendId?: string;
    requestId: string;
  }) {
    const requestId = normalizeString(args.requestId);
    if (!requestId) {
      return null;
    }
    const backendId = normalizeString(args.backendId);
    const db = getAdapter();
    const tables = runStoreTables(args.kind);
    if (backendId) {
      const row = db.get(
        `
          SELECT run_key, request_id, backend_id, state, updated_at, payload_json
          FROM ${tables.runs}
          WHERE request_id=@request_id AND backend_id=@backend_id
          ORDER BY updated_at DESC
          LIMIT 1
        `,
        { request_id: requestId, backend_id: backendId },
      );
      return row ? normalizeRunStoreEntry(row) : null;
    }
    const row = db.get(
      `
        SELECT run_key, request_id, backend_id, state, updated_at, payload_json
        FROM ${tables.runs}
        WHERE request_id=@request_id
        ORDER BY updated_at DESC
        LIMIT 1
      `,
      { request_id: requestId },
    );
    return row ? normalizeRunStoreEntry(row) : null;
  }

  function upsertPluginRunStoreEntry(
    kind: PluginRunStoreKind,
    entry: PluginRunStoreEntry,
  ) {
    const runKey = normalizeString(entry.runKey);
    if (!runKey) {
      return;
    }
    const db = getAdapter();
    const tables = runStoreTables(kind);
    const startedAt =
      kind === "acp" &&
      __acp_runtime_performance_profiler_enabled__ &&
      (typeof __debug_mode__ === "undefined"
        ? isDebugModeEnabled()
        : __debug_mode__)
        ? readAcpRuntimePerformanceClockMs()
        : 0;
    db.run(
      `
        INSERT OR REPLACE INTO ${tables.runs}
        (run_key, request_id, backend_id, state, updated_at, payload_json)
        VALUES (@run_key, @request_id, @backend_id, @state, @updated_at, @payload_json)
      `,
      {
        run_key: runKey,
        request_id: normalizeString(entry.requestId),
        backend_id: normalizeString(entry.backendId),
        state: normalizeString(entry.state),
        updated_at: normalizeString(entry.updatedAt) || nowIso(),
        payload_json: ensureJsonPayload(entry.payload),
      },
    );
    if (
      kind === "acp" &&
      __acp_runtime_performance_profiler_enabled__ &&
      (typeof __debug_mode__ === "undefined"
        ? isDebugModeEnabled()
        : __debug_mode__)
    ) {
      const requestId = normalizeString(entry.requestId);
      incrementAcpRuntimeMetric(requestId, "state_store_write", {
        persistenceChannel: "run",
      });
      observeAcpRuntimeDuration(
        requestId,
        "state_store_write_duration",
        { persistenceChannel: "run" },
        readAcpRuntimePerformanceClockMs() - startedAt,
      );
    }
  }

  function deletePluginRunStoreEntry(
    kind: PluginRunStoreKind,
    runKeyRaw: string,
  ) {
    const runKey = normalizeString(runKeyRaw);
    if (!runKey) {
      return false;
    }
    const db = getAdapter();
    const tables = runStoreTables(kind);
    db.run(`DELETE FROM ${tables.runs} WHERE run_key=@run_key`, {
      run_key: runKey,
    });
    db.run(`DELETE FROM ${tables.events} WHERE run_key=@run_key`, {
      run_key: runKey,
    });
    return true;
  }

  function listWorkflowSequenceRunStoreEntries(
    options: WorkflowSequenceRunStoreListOptions = {},
  ) {
    const sequenceRunId = normalizeString(options.sequenceRunId);
    const workflowRunId = normalizeString(options.workflowRunId);
    const backendId = normalizeString(options.backendId);
    const backendType = normalizeString(options.backendType);
    const states = normalizeStates(options.states);
    const excludeStates = normalizeStates(options.excludeStates);
    const limit = normalizeRowLimit(options.limit);
    const where: string[] = [];
    const params: SqlParams = {};
    if (sequenceRunId) {
      where.push("sequence_run_id=@sequence_run_id");
      params.sequence_run_id = sequenceRunId;
    }
    if (workflowRunId) {
      where.push("workflow_run_id=@workflow_run_id");
      params.workflow_run_id = workflowRunId;
    }
    if (backendId) {
      where.push("backend_id=@backend_id");
      params.backend_id = backendId;
    }
    if (backendType) {
      where.push("backend_type=@backend_type");
      params.backend_type = backendType;
    }
    states.forEach((state, index) => {
      const key = `state_${index}`;
      params[key] = state;
    });
    excludeStates.forEach((state, index) => {
      const key = `exclude_state_${index}`;
      params[key] = state;
    });
    if (states.length > 0) {
      where.push(
        `state IN (${states.map((_, index) => `@state_${index}`).join(", ")})`,
      );
    }
    if (excludeStates.length > 0) {
      where.push(
        `state NOT IN (${excludeStates
          .map((_, index) => `@exclude_state_${index}`)
          .join(", ")})`,
      );
    }
    if (limit) {
      params.limit = limit;
    }
    const db = getAdapter();
    const rows = db.all(
      `
        SELECT sequence_run_id, workflow_run_id, workflow_id, backend_id, backend_type, state, updated_at, payload_json
        FROM plugin_workflow_sequence_runs
        ${where.length > 0 ? `WHERE ${where.join(" AND ")}` : ""}
        ORDER BY updated_at DESC
        ${limit ? "LIMIT @limit" : ""}
      `,
      params,
    );
    const entries = rows.map(normalizeWorkflowSequenceRunStoreEntry);
    return limit ? entries.slice(0, limit) : entries;
  }

  function getWorkflowSequenceRunStoreEntry(sequenceRunIdRaw: string) {
    const sequenceRunId = normalizeString(sequenceRunIdRaw);
    if (!sequenceRunId) {
      return null;
    }
    const db = getAdapter();
    const row = db.get(
      `
        SELECT sequence_run_id, workflow_run_id, workflow_id, backend_id, backend_type, state, updated_at, payload_json
        FROM plugin_workflow_sequence_runs
        WHERE sequence_run_id=@sequence_run_id
        LIMIT 1
      `,
      { sequence_run_id: sequenceRunId },
    );
    return row ? normalizeWorkflowSequenceRunStoreEntry(row) : null;
  }

  function upsertWorkflowSequenceRunStoreEntry(
    entry: WorkflowSequenceRunStoreEntry,
  ) {
    const sequenceRunId = normalizeString(entry.sequenceRunId);
    if (!sequenceRunId) {
      return;
    }
    const db = getAdapter();
    db.run(
      `
        INSERT OR REPLACE INTO plugin_workflow_sequence_runs
        (sequence_run_id, workflow_run_id, workflow_id, backend_id, backend_type, state, updated_at, payload_json)
        VALUES (@sequence_run_id, @workflow_run_id, @workflow_id, @backend_id, @backend_type, @state, @updated_at, @payload_json)
      `,
      {
        sequence_run_id: sequenceRunId,
        workflow_run_id:
          normalizeString(entry.workflowRunId) ||
          normalizeString(entry.sequenceRunId),
        workflow_id: normalizeString(entry.workflowId),
        backend_id: normalizeString(entry.backendId),
        backend_type: normalizeString(entry.backendType),
        state: normalizeString(entry.state),
        updated_at: normalizeString(entry.updatedAt) || nowIso(),
        payload_json: ensureJsonPayload(entry.payload),
      },
    );
  }

  function deleteWorkflowSequenceRunStoreEntry(sequenceRunIdRaw: string) {
    const sequenceRunId = normalizeString(sequenceRunIdRaw);
    if (!sequenceRunId) {
      return false;
    }
    const db = getAdapter();
    db.run(
      "DELETE FROM plugin_workflow_sequence_runs WHERE sequence_run_id=@sequence_run_id",
      { sequence_run_id: sequenceRunId },
    );
    return true;
  }

  function clearPluginRunStore(kind: PluginRunStoreKind) {
    const db = getAdapter();
    const tables = runStoreTables(kind);
    const runCount = Number(
      db.get(`SELECT COUNT(*) AS value FROM ${tables.runs}`)?.value || 0,
    );
    const eventCount = Number(
      db.get(`SELECT COUNT(*) AS value FROM ${tables.events}`)?.value || 0,
    );
    db.transaction(() => {
      db.run(`DELETE FROM ${tables.events}`);
      db.run(`DELETE FROM ${tables.runs}`);
    });
    const total =
      (Number.isFinite(runCount) ? runCount : 0) +
      (Number.isFinite(eventCount) ? eventCount : 0);
    return total;
  }

  function countPluginRunStore(kind: PluginRunStoreKind) {
    const db = getAdapter();
    const tables = runStoreTables(kind);
    const runCount = Number(
      db.get(`SELECT COUNT(*) AS value FROM ${tables.runs}`)?.value || 0,
    );
    const eventCount = Number(
      db.get(`SELECT COUNT(*) AS value FROM ${tables.events}`)?.value || 0,
    );
    return (
      (Number.isFinite(runCount) ? runCount : 0) +
      (Number.isFinite(eventCount) ? eventCount : 0)
    );
  }

  function estimatePluginRunStoreBytes(kind: PluginRunStoreKind) {
    const db = getAdapter();
    const tables = runStoreTables(kind);
    const runBytes = Number(
      db.get(
        `SELECT COALESCE(SUM(LENGTH(payload_json)), 0) AS value FROM ${tables.runs}`,
      )?.value || 0,
    );
    const eventBytes = Number(
      db.get(
        `SELECT COALESCE(SUM(LENGTH(payload_json)), 0) AS value FROM ${tables.events}`,
      )?.value || 0,
    );
    return (
      (Number.isFinite(runBytes) ? runBytes : 0) +
      (Number.isFinite(eventBytes) ? eventBytes : 0)
    );
  }

  function appendPluginRunEventStoreEntry(
    kind: PluginRunStoreKind,
    entry: PluginRunEventStoreEntry,
  ) {
    const eventId = normalizeString(entry.eventId);
    if (!eventId) {
      return;
    }
    const db = getAdapter();
    const tables = runStoreTables(kind);
    const startedAt =
      kind === "acp" &&
      __acp_runtime_performance_profiler_enabled__ &&
      (typeof __debug_mode__ === "undefined"
        ? isDebugModeEnabled()
        : __debug_mode__)
        ? readAcpRuntimePerformanceClockMs()
        : 0;
    db.run(
      `
        INSERT OR REPLACE INTO ${tables.events}
        (event_id, run_key, request_id, backend_id, type, created_at, payload_json)
        VALUES (@event_id, @run_key, @request_id, @backend_id, @type, @created_at, @payload_json)
      `,
      {
        event_id: eventId,
        run_key: normalizeString(entry.runKey),
        request_id: normalizeString(entry.requestId),
        backend_id: normalizeString(entry.backendId),
        type: normalizeString(entry.type),
        created_at: normalizeString(entry.createdAt) || nowIso(),
        payload_json: ensureJsonPayload(entry.payload),
      },
    );
    if (
      kind === "acp" &&
      __acp_runtime_performance_profiler_enabled__ &&
      (typeof __debug_mode__ === "undefined"
        ? isDebugModeEnabled()
        : __debug_mode__)
    ) {
      const requestId = normalizeString(entry.requestId);
      incrementAcpRuntimeMetric(requestId, "state_store_write", {
        persistenceChannel: "event",
      });
      observeAcpRuntimeDuration(
        requestId,
        "state_store_write_duration",
        { persistenceChannel: "event" },
        readAcpRuntimePerformanceClockMs() - startedAt,
      );
    }
  }

  function listPluginRunEventStoreEntries(args: {
    kind: PluginRunStoreKind;
    runKey: string;
  }) {
    const runKey = normalizeString(args.runKey);
    if (!runKey) {
      return [];
    }
    const db = getAdapter();
    const tables = runStoreTables(args.kind);
    const rows = db.all(
      `
        SELECT event_id, run_key, request_id, backend_id, type, created_at, payload_json
        FROM ${tables.events}
        WHERE run_key=@run_key
        ORDER BY created_at DESC
      `,
      { run_key: runKey },
    );
    return rows.map(normalizeRunEventStoreEntry);
  }

  return {
    listPluginRunStoreEntries,
    listPluginRunStoreEntriesFiltered,
    getPluginRunStoreEntry,
    getPluginRunStoreEntryByRequest,
    upsertPluginRunStoreEntry,
    deletePluginRunStoreEntry,
    listWorkflowSequenceRunStoreEntries,
    getWorkflowSequenceRunStoreEntry,
    upsertWorkflowSequenceRunStoreEntry,
    deleteWorkflowSequenceRunStoreEntry,
    clearPluginRunStore,
    countPluginRunStore,
    estimatePluginRunStoreBytes,
    appendPluginRunEventStoreEntry,
    listPluginRunEventStoreEntries,
  };
}
