import { createReadonlySqliteDatabase, } from "./sqliteReadonly";
export function cleanHarnessString(value) {
    return String(value || "").trim();
}
export function parseHarnessJsonObject(value) {
    try {
        const parsed = JSON.parse(String(value || "{}"));
        return parsed && typeof parsed === "object" && !Array.isArray(parsed)
            ? parsed
            : {};
    }
    catch {
        return {};
    }
}
function safeRows(db, sql, params = {}) {
    try {
        return db.all(sql, params);
    }
    catch {
        return [];
    }
}
function rowPayload(row) {
    return parseHarnessJsonObject(row.payload_json);
}
function normalizeRunStoreRow(row) {
    const payload = rowPayload(row);
    return {
        ...payload,
        ...row,
        runKey: cleanHarnessString(row.run_key) || cleanHarnessString(payload.runKey),
        requestId: cleanHarnessString(row.request_id) ||
            cleanHarnessString(payload.requestId),
        backendId: cleanHarnessString(row.backend_id) ||
            cleanHarnessString(payload.backendId),
        state: cleanHarnessString(row.state) ||
            cleanHarnessString(payload.state) ||
            cleanHarnessString(payload.status),
        updatedAt: cleanHarnessString(row.updated_at) ||
            cleanHarnessString(payload.updatedAt) ||
            cleanHarnessString(payload.updated_at),
        payload,
    };
}
function normalizeWorkflowSequenceRunRow(row) {
    const payload = rowPayload(row);
    const sequenceRunId = cleanHarnessString(row.sequence_run_id) ||
        cleanHarnessString(payload.sequenceRunId);
    return {
        ...payload,
        ...row,
        runKey: sequenceRunId ? `sequence:${sequenceRunId}` : "",
        requestId: "",
        backendId: cleanHarnessString(row.backend_id) ||
            cleanHarnessString(payload.backendId),
        state: cleanHarnessString(row.state) ||
            cleanHarnessString(payload.state) ||
            cleanHarnessString(payload.status),
        updatedAt: cleanHarnessString(row.updated_at) ||
            cleanHarnessString(payload.updatedAt) ||
            cleanHarnessString(payload.updated_at),
        payload,
    };
}
function normalizeTaskRow(row) {
    const payload = rowPayload(row);
    const domain = cleanHarnessString(row.domain);
    const taskId = cleanHarnessString(row.task_id) ||
        cleanHarnessString(payload.taskId) ||
        cleanHarnessString(payload.id) ||
        cleanHarnessString(row.request_id) ||
        cleanHarnessString(payload.requestId);
    const runKey = cleanHarnessString(row.runKey) ||
        cleanHarnessString(payload.runKey) ||
        cleanHarnessString(payload.run_key) ||
        (domain === "skillrunner" ? taskId : "");
    const requestId = cleanHarnessString(row.request_id) || cleanHarnessString(payload.requestId);
    const backendId = cleanHarnessString(row.backend_id) || cleanHarnessString(payload.backendId);
    const state = cleanHarnessString(row.state) ||
        cleanHarnessString(payload.state) ||
        cleanHarnessString(payload.status);
    const updatedAt = cleanHarnessString(row.updated_at) ||
        cleanHarnessString(payload.updatedAt) ||
        cleanHarnessString(payload.updated_at);
    return {
        ...payload,
        ...row,
        domain,
        scope: cleanHarnessString(row.scope),
        taskId,
        runKey: runKey || undefined,
        requestId,
        backendId,
        state,
        status: state,
        updatedAt,
        payload,
    };
}
function normalizeRequestRow(row) {
    const payload = rowPayload(row);
    const requestId = cleanHarnessString(row.request_id) || cleanHarnessString(payload.requestId);
    const backendId = cleanHarnessString(row.backend_id) || cleanHarnessString(payload.backendId);
    const state = cleanHarnessString(row.state) ||
        cleanHarnessString(payload.state) ||
        cleanHarnessString(payload.status);
    const updatedAt = cleanHarnessString(row.updated_at) ||
        cleanHarnessString(payload.updatedAt) ||
        cleanHarnessString(payload.updated_at);
    return {
        ...payload,
        ...row,
        domain: cleanHarnessString(row.domain),
        scope: cleanHarnessString(row.scope),
        taskId: cleanHarnessString(payload.taskId || requestId),
        requestId,
        backendId,
        state,
        status: state,
        updatedAt,
        payload,
    };
}
function normalizeContextRow(row) {
    const payload = rowPayload(row);
    const contextId = cleanHarnessString(row.context_id);
    const requestId = cleanHarnessString(row.request_id) || cleanHarnessString(payload.requestId);
    const backendId = cleanHarnessString(row.backend_id) || cleanHarnessString(payload.backendId);
    const state = cleanHarnessString(row.state) ||
        cleanHarnessString(payload.state) ||
        cleanHarnessString(payload.status);
    const updatedAt = cleanHarnessString(row.updated_at) ||
        cleanHarnessString(payload.updatedAt) ||
        cleanHarnessString(payload.updated_at);
    return {
        ...payload,
        ...row,
        domain: cleanHarnessString(row.domain),
        scope: cleanHarnessString(row.scope),
        taskId: cleanHarnessString(payload.taskId || contextId || requestId),
        contextId,
        requestId,
        backendId,
        state,
        status: state,
        updatedAt,
        payload,
    };
}
function tableExists(db, table) {
    return Boolean(db.get("SELECT name FROM sqlite_master WHERE type='table' AND name=@table", { table }));
}
function whereClauses(args) {
    const clauses = [];
    const params = {};
    const domain = cleanHarnessString(args.domain);
    const scope = cleanHarnessString(args.scope);
    if (domain) {
        clauses.push("domain = @domain");
        params.domain = domain;
    }
    if (scope) {
        clauses.push("scope = @scope");
        params.scope = scope;
    }
    return {
        where: clauses.length ? `WHERE ${clauses.join(" AND ")}` : "",
        params,
    };
}
function runStoreWhereClauses(args) {
    const clauses = [];
    const params = {};
    const backendId = cleanHarnessString(args.backendId);
    const requestId = cleanHarnessString(args.requestId);
    if (backendId) {
        clauses.push("backend_id = @backend_id");
        params.backend_id = backendId;
    }
    if (requestId) {
        clauses.push("request_id = @request_id");
        params.request_id = requestId;
    }
    return {
        where: clauses.length ? `WHERE ${clauses.join(" AND ")}` : "",
        params,
    };
}
function tableRowCount(db, table) {
    if (!tableExists(db, table)) {
        return 0;
    }
    return Number(safeRows(db, `SELECT COUNT(*) AS count FROM ${table}`)[0]?.count || 0);
}
function limitValue(value, fallback) {
    const limit = Math.floor(Number(value));
    return Number.isFinite(limit) && limit > 0 ? Math.min(limit, 500) : fallback;
}
export async function createPluginStateReadonlyStore(dbPath) {
    const db = await createReadonlySqliteDatabase(dbPath);
    return {
        db,
        tableExists(table) {
            return tableExists(db, table);
        },
        listTaskRows(args = {}) {
            if (!tableExists(db, "plugin_task_rows"))
                return [];
            const { where, params } = whereClauses(args);
            return safeRows(db, `
          SELECT *
          FROM plugin_task_rows
          ${where}
          ORDER BY COALESCE(updated_at, '') DESC
          LIMIT @limit
        `, { ...params, limit: limitValue(args.limit, 300) }).map(normalizeTaskRow);
        },
        listRequestRows(args = {}) {
            if (!tableExists(db, "plugin_task_requests"))
                return [];
            const { where, params } = whereClauses(args);
            return safeRows(db, `
          SELECT *
          FROM plugin_task_requests
          ${where}
          ORDER BY COALESCE(updated_at, '') DESC
          LIMIT @limit
        `, { ...params, limit: limitValue(args.limit, 300) }).map(normalizeRequestRow);
        },
        listContextRows(args = {}) {
            if (!tableExists(db, "plugin_task_contexts"))
                return [];
            const { where, params } = whereClauses(args);
            return safeRows(db, `
          SELECT *
          FROM plugin_task_contexts
          ${where}
          ORDER BY COALESCE(updated_at, '') DESC
          LIMIT @limit
        `, { ...params, limit: limitValue(args.limit, 300) }).map(normalizeContextRow);
        },
        listSkillRunnerRunRows(args = {}) {
            if (!tableExists(db, "plugin_skillrunner_runs"))
                return [];
            const { where, params } = runStoreWhereClauses(args);
            return safeRows(db, `
          SELECT run_key, request_id, backend_id, state, updated_at, payload_json
          FROM plugin_skillrunner_runs
          ${where}
          ORDER BY COALESCE(updated_at, '') DESC
          LIMIT @limit
        `, { ...params, limit: limitValue(args.limit, 300) })
                .map(normalizeRunStoreRow)
                .filter((row) => cleanHarnessString(row.payload.schemaVersion) === "3.0.0");
        },
        listSkillRunnerSequenceStateRows(args = {}) {
            if (!tableExists(db, "plugin_workflow_sequence_runs"))
                return [];
            const clauses = [];
            const params = {};
            const backendId = cleanHarnessString(args.backendId);
            if (backendId) {
                clauses.push("backend_id=@backend_id");
                params.backend_id = backendId;
            }
            const where = clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : "";
            return safeRows(db, `
          SELECT sequence_run_id, workflow_run_id, workflow_id, backend_id, backend_type, state, updated_at, payload_json
          FROM plugin_workflow_sequence_runs
          ${where}
          ORDER BY COALESCE(updated_at, '') DESC
          LIMIT @limit
        `, { ...params, limit: limitValue(args.limit, 300) }).map(normalizeWorkflowSequenceRunRow);
        },
        diagnostics() {
            const tables = [
                "plugin_meta",
                "plugin_task_requests",
                "plugin_task_contexts",
                "plugin_task_rows",
                "plugin_workflow_sequence_runs",
                "plugin_skillrunner_runs",
                "plugin_skillrunner_run_events",
            ];
            const domains = tableExists(db, "plugin_task_rows")
                ? safeRows(db, `
              SELECT domain, scope, COUNT(*) AS count
              FROM plugin_task_rows
              GROUP BY domain, scope
              ORDER BY domain, scope
            `)
                : [];
            return {
                journalMode: db.get("PRAGMA journal_mode"),
                lockingMode: db.get("PRAGMA locking_mode"),
                tables: Object.fromEntries(tables.map((table) => [table, tableExists(db, table)])),
                rowCounts: Object.fromEntries(tables.map((table) => [table, tableRowCount(db, table)])),
                rowScopes: domains,
            };
        },
        close() {
            db.close();
        },
    };
}
