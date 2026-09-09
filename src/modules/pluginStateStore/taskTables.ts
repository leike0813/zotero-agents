import type {
  PluginTaskContextEntry,
  PluginTaskRequestEntry,
  PluginTaskRowEntry,
  PluginTaskRowListOptions,
  PluginTaskRowStateCount,
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

type PluginTaskScope =
  | "active"
  | "history"
  | "skill-runs"
  | "products"
  | "synthesis-update-events"
  | "synthesis-update-state";

type PluginTaskRowEntryWithScope = PluginTaskRowEntry & {
  scope: PluginTaskScope;
};

export function ensureTaskTablesSchema(db: SqlAdapter) {
  db.run(`
    CREATE TABLE IF NOT EXISTS plugin_task_requests (
      domain TEXT NOT NULL,
      request_id TEXT NOT NULL,
      backend_id TEXT NOT NULL DEFAULT '',
      state TEXT NOT NULL DEFAULT '',
      updated_at TEXT NOT NULL DEFAULT '',
      payload_json TEXT NOT NULL,
      PRIMARY KEY (domain, request_id)
    );
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS plugin_task_contexts (
      domain TEXT NOT NULL,
      context_id TEXT NOT NULL,
      request_id TEXT NOT NULL DEFAULT '',
      backend_id TEXT NOT NULL DEFAULT '',
      state TEXT NOT NULL DEFAULT '',
      updated_at TEXT NOT NULL DEFAULT '',
      payload_json TEXT NOT NULL,
      PRIMARY KEY (domain, context_id)
    );
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS plugin_task_rows (
      domain TEXT NOT NULL,
      scope TEXT NOT NULL,
      task_id TEXT NOT NULL,
      request_id TEXT NOT NULL DEFAULT '',
      backend_id TEXT NOT NULL DEFAULT '',
      state TEXT NOT NULL DEFAULT '',
      updated_at TEXT NOT NULL DEFAULT '',
      payload_json TEXT NOT NULL,
      PRIMARY KEY (domain, scope, task_id)
    );
  `);
  db.run(`
    CREATE INDEX IF NOT EXISTS idx_plugin_task_requests_backend_request
      ON plugin_task_requests(domain, backend_id, request_id);
  `);
  db.run(`
    CREATE INDEX IF NOT EXISTS idx_plugin_task_requests_state_updated
      ON plugin_task_requests(domain, state, updated_at DESC);
  `);
  db.run(`
    CREATE INDEX IF NOT EXISTS idx_plugin_task_contexts_backend_request
      ON plugin_task_contexts(domain, backend_id, request_id);
  `);
  db.run(`
    CREATE INDEX IF NOT EXISTS idx_plugin_task_contexts_state_updated
      ON plugin_task_contexts(domain, state, updated_at DESC);
  `);
  db.run(`
    CREATE INDEX IF NOT EXISTS idx_plugin_task_rows_scope_state_updated
      ON plugin_task_rows(domain, scope, state, updated_at DESC);
  `);
  db.run(`
    CREATE INDEX IF NOT EXISTS idx_plugin_task_rows_backend_request
      ON plugin_task_rows(domain, backend_id, request_id);
  `);
}

export function createTaskTables(getAdapter: () => SqlAdapter) {
  function listPluginTaskRequestEntries(domain: string) {
    const db = getAdapter();
    const rows = db.all(
      `
        SELECT request_id, backend_id, state, updated_at, payload_json
        FROM plugin_task_requests
        WHERE domain=@domain
        ORDER BY updated_at DESC
      `,
      { domain: normalizeString(domain) },
    );
    return rows.map((row) => ({
      requestId: normalizeString(row.request_id),
      backendId: normalizeString(row.backend_id),
      state: normalizeString(row.state),
      updatedAt: normalizeString(row.updated_at),
      payload: ensureJsonPayload(normalizeString(row.payload_json)),
    }));
  }

  function getPluginTaskRequestEntry(domain: string, requestIdRaw: string) {
    const requestId = normalizeString(requestIdRaw);
    if (!requestId) {
      return null;
    }
    const db = getAdapter();
    const row = db.get(
      `
        SELECT request_id, backend_id, state, updated_at, payload_json
        FROM plugin_task_requests
        WHERE domain=@domain AND request_id=@request_id
        LIMIT 1
      `,
      {
        domain: normalizeString(domain),
        request_id: requestId,
      },
    );
    if (!row) {
      return null;
    }
    return {
      requestId: normalizeString(row.request_id),
      backendId: normalizeString(row.backend_id),
      state: normalizeString(row.state),
      updatedAt: normalizeString(row.updated_at),
      payload: ensureJsonPayload(normalizeString(row.payload_json)),
    } as PluginTaskRequestEntry;
  }

  function upsertPluginTaskRequestEntry(
    domainRaw: string,
    entry: PluginTaskRequestEntry,
  ) {
    const domain = normalizeString(domainRaw);
    const requestId = normalizeString(entry.requestId);
    if (!domain || !requestId) {
      return;
    }
    const db = getAdapter();
    db.run(
      `
        INSERT OR REPLACE INTO plugin_task_requests
        (domain, request_id, backend_id, state, updated_at, payload_json)
        VALUES (@domain, @request_id, @backend_id, @state, @updated_at, @payload_json)
      `,
      {
        domain,
        request_id: requestId,
        backend_id: normalizeString(entry.backendId),
        state: normalizeString(entry.state),
        updated_at: normalizeString(entry.updatedAt) || nowIso(),
        payload_json: ensureJsonPayload(entry.payload),
      },
    );
  }

  function replacePluginTaskRequestEntries(
    domainRaw: string,
    entries: PluginTaskRequestEntry[],
  ) {
    const domain = normalizeString(domainRaw);
    if (!domain) {
      return;
    }
    const db = getAdapter();
    db.transaction(() => {
      db.run("DELETE FROM plugin_task_requests WHERE domain=@domain", {
        domain,
      });
      for (const entry of entries) {
        upsertPluginTaskRequestEntry(domain, entry);
      }
    });
  }

  function deletePluginTaskRequestEntry(
    domainRaw: string,
    requestIdRaw: string,
  ) {
    const domain = normalizeString(domainRaw);
    const requestId = normalizeString(requestIdRaw);
    if (!domain || !requestId) {
      return false;
    }
    const db = getAdapter();
    db.run(
      "DELETE FROM plugin_task_requests WHERE domain=@domain AND request_id=@request_id",
      {
        domain,
        request_id: requestId,
      },
    );
    return true;
  }

  function deletePluginTaskRequestEntriesByBackend(
    domainRaw: string,
    backendIdRaw: string,
  ) {
    const domain = normalizeString(domainRaw);
    const backendId = normalizeString(backendIdRaw);
    if (!domain || !backendId) {
      return 0;
    }
    const db = getAdapter();
    const before = Number(
      db.get(
        `
          SELECT COUNT(*) AS value
          FROM plugin_task_requests
          WHERE domain=@domain AND backend_id=@backend_id
        `,
        { domain, backend_id: backendId },
      )?.value || 0,
    );
    db.run(
      "DELETE FROM plugin_task_requests WHERE domain=@domain AND backend_id=@backend_id",
      {
        domain,
        backend_id: backendId,
      },
    );
    return Number.isFinite(before) ? before : 0;
  }

  function listPluginTaskContextEntries(domainRaw: string) {
    const domain = normalizeString(domainRaw);
    const db = getAdapter();
    const rows = db.all(
      `
        SELECT context_id, request_id, backend_id, state, updated_at, payload_json
        FROM plugin_task_contexts
        WHERE domain=@domain
        ORDER BY updated_at DESC
      `,
      { domain },
    );
    return rows.map((row) => ({
      contextId: normalizeString(row.context_id),
      requestId: normalizeString(row.request_id),
      backendId: normalizeString(row.backend_id),
      state: normalizeString(row.state),
      updatedAt: normalizeString(row.updated_at),
      payload: ensureJsonPayload(normalizeString(row.payload_json)),
    }));
  }

  function getPluginTaskContextEntry(domainRaw: string, contextIdRaw: string) {
    const domain = normalizeString(domainRaw);
    const contextId = normalizeString(contextIdRaw);
    if (!domain || !contextId) return null;
    const row = getAdapter().get(
      `
        SELECT context_id, request_id, backend_id, state, updated_at, payload_json
        FROM plugin_task_contexts
        WHERE domain=@domain AND context_id=@context_id
      `,
      { domain, context_id: contextId },
    );
    if (!row) return null;
    return {
      contextId: normalizeString(row.context_id),
      requestId: normalizeString(row.request_id),
      backendId: normalizeString(row.backend_id),
      state: normalizeString(row.state),
      updatedAt: normalizeString(row.updated_at),
      payload: ensureJsonPayload(normalizeString(row.payload_json)),
    } satisfies PluginTaskContextEntry;
  }

  function compareAndSetPluginTaskContextEntry(args: {
    domain: string;
    contextId: string;
    expectedStates: Array<string | null>;
    next: PluginTaskContextEntry;
  }) {
    const domain = normalizeString(args.domain);
    const contextId = normalizeString(args.contextId);
    if (
      !domain ||
      !contextId ||
      contextId !== normalizeString(args.next.contextId)
    ) {
      return { updated: false, current: null };
    }
    const db = getAdapter();
    return db.transaction(() => {
      const current = getPluginTaskContextEntry(domain, contextId);
      const currentState = current?.state || null;
      if (!args.expectedStates.includes(currentState)) {
        return { updated: false, current };
      }
      upsertPluginTaskContextEntry(domain, args.next);
      return {
        updated: true,
        current: getPluginTaskContextEntry(domain, contextId),
      };
    });
  }

  function deletePluginTaskContextDomain(domainRaw: string) {
    const domain = normalizeString(domainRaw);
    if (!domain) return 0;
    const db = getAdapter();
    const before = Number(
      db.get(
        "SELECT COUNT(*) AS value FROM plugin_task_contexts WHERE domain=@domain",
        { domain },
      )?.value || 0,
    );
    db.run("DELETE FROM plugin_task_contexts WHERE domain=@domain", { domain });
    return Number.isFinite(before) ? before : 0;
  }

  function upsertPluginTaskContextEntry(
    domainRaw: string,
    entry: PluginTaskContextEntry,
  ) {
    const domain = normalizeString(domainRaw);
    const contextId = normalizeString(entry.contextId);
    if (!domain || !contextId) {
      return;
    }
    const db = getAdapter();
    db.run(
      `
        INSERT OR REPLACE INTO plugin_task_contexts
        (domain, context_id, request_id, backend_id, state, updated_at, payload_json)
        VALUES (@domain, @context_id, @request_id, @backend_id, @state, @updated_at, @payload_json)
      `,
      {
        domain,
        context_id: contextId,
        request_id: normalizeString(entry.requestId),
        backend_id: normalizeString(entry.backendId),
        state: normalizeString(entry.state),
        updated_at: normalizeString(entry.updatedAt) || nowIso(),
        payload_json: ensureJsonPayload(entry.payload),
      },
    );
  }

  function replacePluginTaskContextEntries(
    domainRaw: string,
    entries: PluginTaskContextEntry[],
  ) {
    const domain = normalizeString(domainRaw);
    if (!domain) {
      return;
    }
    const db = getAdapter();
    db.transaction(() => {
      db.run("DELETE FROM plugin_task_contexts WHERE domain=@domain", {
        domain,
      });
      for (const entry of entries) {
        upsertPluginTaskContextEntry(domain, entry);
      }
    });
  }

  function deletePluginTaskContextEntry(
    domainRaw: string,
    contextIdRaw: string,
  ) {
    const domain = normalizeString(domainRaw);
    const contextId = normalizeString(contextIdRaw);
    if (!domain || !contextId) {
      return false;
    }
    const db = getAdapter();
    db.run(
      "DELETE FROM plugin_task_contexts WHERE domain=@domain AND context_id=@context_id",
      {
        domain,
        context_id: contextId,
      },
    );
    return true;
  }

  function deletePluginTaskContextEntriesByBackend(
    domainRaw: string,
    backendIdRaw: string,
  ) {
    const domain = normalizeString(domainRaw);
    const backendId = normalizeString(backendIdRaw);
    if (!domain || !backendId) {
      return 0;
    }
    const db = getAdapter();
    const before = Number(
      db.get(
        `
          SELECT COUNT(*) AS value
          FROM plugin_task_contexts
          WHERE domain=@domain AND backend_id=@backend_id
        `,
        { domain, backend_id: backendId },
      )?.value || 0,
    );
    db.run(
      "DELETE FROM plugin_task_contexts WHERE domain=@domain AND backend_id=@backend_id",
      {
        domain,
        backend_id: backendId,
      },
    );
    return Number.isFinite(before) ? before : 0;
  }

  function listPluginTaskRowEntries(
    domainRaw: string,
    scopeRaw: PluginTaskScope,
  ) {
    return listPluginTaskRowEntriesFiltered(domainRaw, scopeRaw);
  }

  function getPluginTaskRowEntry(
    domainRaw: string,
    scopeRaw: PluginTaskScope,
    taskIdRaw: string,
  ) {
    const domain = normalizeString(domainRaw);
    const scope = normalizeString(scopeRaw);
    const taskId = normalizeString(taskIdRaw);
    if (!domain || !scope || !taskId) {
      return null;
    }
    const db = getAdapter();
    const row = db.get(
      `
        SELECT task_id, request_id, backend_id, state, updated_at, payload_json
        FROM plugin_task_rows
        WHERE domain=@domain AND scope=@scope AND task_id=@task_id
      `,
      {
        domain,
        scope,
        task_id: taskId,
      },
    );
    return row
      ? {
          taskId: normalizeString(row.task_id),
          requestId: normalizeString(row.request_id),
          backendId: normalizeString(row.backend_id),
          state: normalizeString(row.state),
          updatedAt: normalizeString(row.updated_at),
          payload: ensureJsonPayload(normalizeString(row.payload_json)),
        }
      : null;
  }

  function listPluginTaskRowEntriesFiltered(
    domainRaw: string,
    scopeRaw: PluginTaskScope,
    options: PluginTaskRowListOptions = {},
  ) {
    const domain = normalizeString(domainRaw);
    const scope = normalizeString(scopeRaw);
    const backendId = normalizeString(options.backendId);
    const requestId = normalizeString(options.requestId);
    const states = normalizeStates(options.states);
    const excludeStates = normalizeStates(options.excludeStates);
    const limit = normalizeRowLimit(options.limit);
    const where = ["domain=@domain", "scope=@scope"];
    const params: SqlParams = { domain, scope };
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
    const rows = db.all(
      `
        SELECT task_id, request_id, backend_id, state, updated_at, payload_json
        FROM plugin_task_rows
        WHERE ${where.join(" AND ")}
        ORDER BY updated_at DESC
        ${limit ? "LIMIT @limit" : ""}
      `,
      params,
    );
    const entries = rows.map((row) => ({
      taskId: normalizeString(row.task_id),
      requestId: normalizeString(row.request_id),
      backendId: normalizeString(row.backend_id),
      state: normalizeString(row.state),
      updatedAt: normalizeString(row.updated_at),
      payload: ensureJsonPayload(normalizeString(row.payload_json)),
    }));
    return limit ? entries.slice(0, limit) : entries;
  }

  function countPluginTaskRowStates(
    domainRaw: string,
    scopeRaw: PluginTaskScope,
    options: Pick<PluginTaskRowListOptions, "backendId" | "requestId"> = {},
  ): PluginTaskRowStateCount[] {
    const domain = normalizeString(domainRaw);
    const scope = normalizeString(scopeRaw);
    const backendId = normalizeString(options.backendId);
    const requestId = normalizeString(options.requestId);
    if (!domain || !scope) {
      return [];
    }
    const where = ["domain=@domain", "scope=@scope"];
    const params: SqlParams = { domain, scope };
    if (backendId) {
      where.push("backend_id=@backend_id");
      params.backend_id = backendId;
    }
    if (requestId) {
      where.push("request_id=@request_id");
      params.request_id = requestId;
    }
    const db = getAdapter();
    const rows = db.all(
      `
        SELECT state, COUNT(*) AS value
        FROM plugin_task_rows
        WHERE ${where.join(" AND ")}
        GROUP BY state
      `,
      params,
    );
    return rows
      .map((row) => ({
        state: normalizeString(row.state),
        count: Math.max(0, Math.floor(Number(row.value) || 0)),
      }))
      .filter((row) => row.state && row.count > 0)
      .sort((left, right) => left.state.localeCompare(right.state));
  }

  function upsertPluginTaskRowEntry(
    domainRaw: string,
    scopeRaw: PluginTaskScope,
    entry: PluginTaskRowEntry,
  ) {
    const domain = normalizeString(domainRaw);
    const scope = normalizeString(scopeRaw);
    const taskId = normalizeString(entry.taskId);
    if (!domain || !scope || !taskId) {
      return;
    }
    const db = getAdapter();
    db.run(
      `
        INSERT OR REPLACE INTO plugin_task_rows
        (domain, scope, task_id, request_id, backend_id, state, updated_at, payload_json)
        VALUES (@domain, @scope, @task_id, @request_id, @backend_id, @state, @updated_at, @payload_json)
      `,
      {
        domain,
        scope,
        task_id: taskId,
        request_id: normalizeString(entry.requestId),
        backend_id: normalizeString(entry.backendId),
        state: normalizeString(entry.state),
        updated_at: normalizeString(entry.updatedAt) || nowIso(),
        payload_json: ensureJsonPayload(entry.payload),
      },
    );
  }

  function replacePluginTaskRowEntries(
    domainRaw: string,
    scopeRaw: PluginTaskScope,
    entries: PluginTaskRowEntry[],
  ) {
    const domain = normalizeString(domainRaw);
    const scope = normalizeString(scopeRaw);
    if (!domain || !scope) {
      return;
    }
    const db = getAdapter();
    db.transaction(() => {
      db.run(
        "DELETE FROM plugin_task_rows WHERE domain=@domain AND scope=@scope",
        { domain, scope },
      );
      for (const entry of entries) {
        upsertPluginTaskRowEntry(domain, scope as PluginTaskScope, entry);
      }
    });
  }

  function clearPluginTaskRowEntries(
    domainRaw: string,
    scopeRaw: PluginTaskScope,
  ) {
    const domain = normalizeString(domainRaw);
    const scope = normalizeString(scopeRaw);
    if (!domain || !scope) {
      return;
    }
    const db = getAdapter();
    db.run(
      "DELETE FROM plugin_task_rows WHERE domain=@domain AND scope=@scope",
      {
        domain,
        scope,
      },
    );
  }

  function deletePluginTaskRowEntry(
    domainRaw: string,
    taskIdRaw: string,
    scopeRaw: PluginTaskScope = "products",
  ) {
    const domain = normalizeString(domainRaw);
    const scope = normalizeString(scopeRaw);
    const taskId = normalizeString(taskIdRaw);
    if (!domain || !scope || !taskId) {
      return false;
    }
    const db = getAdapter();
    db.run(
      "DELETE FROM plugin_task_rows WHERE domain=@domain AND scope=@scope AND task_id=@task_id",
      {
        domain,
        scope,
        task_id: taskId,
      },
    );
    return true;
  }

  function deletePluginTaskRowEntriesByBackend(
    domainRaw: string,
    backendIdRaw: string,
  ) {
    const domain = normalizeString(domainRaw);
    const backendId = normalizeString(backendIdRaw);
    if (!domain || !backendId) {
      return 0;
    }
    const db = getAdapter();
    const before = Number(
      db.get(
        `
          SELECT COUNT(*) AS value
          FROM plugin_task_rows
          WHERE domain=@domain AND backend_id=@backend_id
        `,
        { domain, backend_id: backendId },
      )?.value || 0,
    );
    db.run(
      "DELETE FROM plugin_task_rows WHERE domain=@domain AND backend_id=@backend_id",
      {
        domain,
        backend_id: backendId,
      },
    );
    return Number.isFinite(before) ? before : 0;
  }

  function clearPluginTaskDomain(domainRaw: string) {
    const domain = normalizeString(domainRaw);
    if (!domain) {
      return 0;
    }
    const db = getAdapter();
    const requestCount = Number(
      db.get(
        `
          SELECT COUNT(*) AS value
          FROM plugin_task_requests
          WHERE domain=@domain
        `,
        { domain },
      )?.value || 0,
    );
    const contextCount = Number(
      db.get(
        `
          SELECT COUNT(*) AS value
          FROM plugin_task_contexts
          WHERE domain=@domain
        `,
        { domain },
      )?.value || 0,
    );
    const rowCount = Number(
      db.get(
        `
          SELECT COUNT(*) AS value
          FROM plugin_task_rows
          WHERE domain=@domain
        `,
        { domain },
      )?.value || 0,
    );
    db.transaction(() => {
      db.run("DELETE FROM plugin_task_requests WHERE domain=@domain", {
        domain,
      });
      db.run("DELETE FROM plugin_task_contexts WHERE domain=@domain", {
        domain,
      });
      db.run("DELETE FROM plugin_task_rows WHERE domain=@domain", { domain });
    });
    return [requestCount, contextCount, rowCount].reduce((sum, value) => {
      return sum + (Number.isFinite(value) ? value : 0);
    }, 0);
  }

  function countPluginTaskDomain(domainRaw: string) {
    const domain = normalizeString(domainRaw);
    if (!domain) {
      return 0;
    }
    const db = getAdapter();
    const requestCount = Number(
      db.get(
        "SELECT COUNT(*) AS value FROM plugin_task_requests WHERE domain=@domain",
        { domain },
      )?.value || 0,
    );
    const contextCount = Number(
      db.get(
        "SELECT COUNT(*) AS value FROM plugin_task_contexts WHERE domain=@domain",
        { domain },
      )?.value || 0,
    );
    const rowCount = Number(
      db.get(
        "SELECT COUNT(*) AS value FROM plugin_task_rows WHERE domain=@domain",
        { domain },
      )?.value || 0,
    );
    return [requestCount, contextCount, rowCount].reduce((sum, value) => {
      return sum + (Number.isFinite(value) ? value : 0);
    }, 0);
  }

  function estimateEntryBytes(entry: Record<string, unknown>) {
    return Object.values(entry).reduce<number>(
      (sum, value) => sum + normalizeString(value).length,
      0,
    );
  }

  function estimateEntriesBytes(entries: Array<Record<string, unknown>>) {
    return entries.reduce<number>(
      (sum, entry) => sum + estimateEntryBytes(entry),
      0,
    );
  }

  function sumPluginTaskRowBytesForScopes(
    domain: string,
    args: { scope?: string; excludedScopes?: Set<string> } = {},
  ) {
    const db = getAdapter();
    const rows = db.all(
      `
        SELECT domain, scope, task_id, request_id, backend_id, state, updated_at, payload_json
        FROM plugin_task_rows
        WHERE domain=@domain
      `,
      { domain },
    );
    return rows.reduce<number>((sum, row) => {
      const scope = normalizeString(row.scope);
      if (args.scope && scope !== args.scope) {
        return sum;
      }
      if (args.excludedScopes?.has(scope)) {
        return sum;
      }
      return (
        sum +
        [
          row.domain,
          row.scope,
          row.task_id,
          row.request_id,
          row.backend_id,
          row.state,
          row.updated_at,
          row.payload_json,
        ].reduce<number>(
          (rowSum, value) => rowSum + normalizeString(value).length,
          0,
        )
      );
    }, 0);
  }

  function estimatePluginTaskDomainBytes(domainRaw: string) {
    const domain = normalizeString(domainRaw);
    if (!domain) {
      return 0;
    }
    return (
      estimateEntriesBytes(listPluginTaskRequestEntries(domain)) +
      estimateEntriesBytes(listPluginTaskContextEntries(domain)) +
      sumPluginTaskRowBytesForScopes(domain)
    );
  }

  function clearPluginTaskDomainExceptRowScopes(
    domainRaw: string,
    preservedRowScopesRaw: string[],
  ) {
    const domain = normalizeString(domainRaw);
    if (!domain) {
      return 0;
    }
    const preserved = new Set(
      (preservedRowScopesRaw || [])
        .map((scope) => normalizeString(scope))
        .filter(Boolean),
    );
    const db = getAdapter();
    const requestCount = Number(
      db.get(
        `
          SELECT COUNT(*) AS value
          FROM plugin_task_requests
          WHERE domain=@domain
        `,
        { domain },
      )?.value || 0,
    );
    const contextCount = Number(
      db.get(
        `
          SELECT COUNT(*) AS value
          FROM plugin_task_contexts
          WHERE domain=@domain
        `,
        { domain },
      )?.value || 0,
    );
    const rows = db.all(
      `
        SELECT scope
        FROM plugin_task_rows
        WHERE domain=@domain
      `,
      { domain },
    );
    const rowCount = rows.filter(
      (row) => !preserved.has(normalizeString(row.scope)),
    ).length;
    db.transaction(() => {
      db.run("DELETE FROM plugin_task_requests WHERE domain=@domain", {
        domain,
      });
      db.run("DELETE FROM plugin_task_contexts WHERE domain=@domain", {
        domain,
      });
      if (preserved.size === 0) {
        db.run("DELETE FROM plugin_task_rows WHERE domain=@domain", { domain });
        return;
      }
      for (const row of rows) {
        const scope = normalizeString(row.scope);
        if (!scope || preserved.has(scope)) {
          continue;
        }
        db.run(
          "DELETE FROM plugin_task_rows WHERE domain=@domain AND scope=@scope",
          { domain, scope },
        );
      }
    });
    return [requestCount, contextCount, rowCount].reduce((sum, value) => {
      return sum + (Number.isFinite(value) ? value : 0);
    }, 0);
  }

  function countPluginTaskDomainExceptRowScopes(
    domainRaw: string,
    preservedRowScopesRaw: string[],
  ) {
    const domain = normalizeString(domainRaw);
    if (!domain) {
      return 0;
    }
    const preserved = new Set(
      (preservedRowScopesRaw || [])
        .map((scope) => normalizeString(scope))
        .filter(Boolean),
    );
    const db = getAdapter();
    const requestCount = Number(
      db.get(
        "SELECT COUNT(*) AS value FROM plugin_task_requests WHERE domain=@domain",
        { domain },
      )?.value || 0,
    );
    const contextCount = Number(
      db.get(
        "SELECT COUNT(*) AS value FROM plugin_task_contexts WHERE domain=@domain",
        { domain },
      )?.value || 0,
    );
    const rows = db.all(
      `
        SELECT scope
        FROM plugin_task_rows
        WHERE domain=@domain
      `,
      { domain },
    );
    const rowCount = rows.filter(
      (row) => !preserved.has(normalizeString(row.scope)),
    ).length;
    return [requestCount, contextCount, rowCount].reduce((sum, value) => {
      return sum + (Number.isFinite(value) ? value : 0);
    }, 0);
  }

  function estimatePluginTaskDomainExceptRowScopesBytes(
    domainRaw: string,
    preservedRowScopesRaw: string[],
  ) {
    const domain = normalizeString(domainRaw);
    if (!domain) {
      return 0;
    }
    const preserved = new Set(
      (preservedRowScopesRaw || [])
        .map((scope) => normalizeString(scope))
        .filter(Boolean),
    );
    return (
      estimateEntriesBytes(listPluginTaskRequestEntries(domain)) +
      estimateEntriesBytes(listPluginTaskContextEntries(domain)) +
      sumPluginTaskRowBytesForScopes(domain, { excludedScopes: preserved })
    );
  }

  function listPluginTaskRowsForDomain(
    domainRaw: string,
  ): PluginTaskRowEntryWithScope[] {
    const domain = normalizeString(domainRaw);
    if (!domain) {
      return [];
    }
    const db = getAdapter();
    const rows = db.all(
      `
        SELECT scope, task_id, request_id, backend_id, state, updated_at, payload_json
        FROM plugin_task_rows
        WHERE domain=@domain
        ORDER BY updated_at DESC
      `,
      { domain },
    );
    return rows.map((row) => ({
      scope: normalizeString(row.scope) as PluginTaskScope,
      taskId: normalizeString(row.task_id),
      requestId: normalizeString(row.request_id),
      backendId: normalizeString(row.backend_id),
      state: normalizeString(row.state),
      updatedAt: normalizeString(row.updated_at),
      payload: ensureJsonPayload(normalizeString(row.payload_json)),
    }));
  }

  function isAcpConversationRecordRef(requestIdRaw: string) {
    const requestId = normalizeString(requestIdRaw);
    return (
      requestId.startsWith("conversation:") ||
      requestId.startsWith("conversation-index:")
    );
  }

  function isAcpConversationTaskRecord(entry: {
    requestId: string;
    payload: string;
  }) {
    const payload = normalizeString(entry.payload).toLowerCase();
    return (
      isAcpConversationRecordRef(entry.requestId) ||
      payload.includes("conversationid")
    );
  }

  function listAcpConversationTaskRecords() {
    const domain = "acp";
    const requests = listPluginTaskRequestEntries(domain).filter(
      isAcpConversationTaskRecord,
    );
    const contexts = listPluginTaskContextEntries(domain).filter(
      isAcpConversationTaskRecord,
    );
    const rows = listPluginTaskRowsForDomain(domain).filter(
      (row) => row.scope !== "skill-runs" && isAcpConversationTaskRecord(row),
    );
    return { contexts, domain, requests, rows };
  }

  function clearAcpConversationTaskRecords() {
    const { contexts, domain, requests, rows } =
      listAcpConversationTaskRecords();
    const db = getAdapter();
    db.transaction(() => {
      for (const request of requests) {
        deletePluginTaskRequestEntry(domain, request.requestId);
      }
      for (const context of contexts) {
        deletePluginTaskContextEntry(domain, context.contextId);
      }
      for (const row of rows) {
        deletePluginTaskRowEntry(domain, row.taskId, row.scope);
      }
    });
    return requests.length + contexts.length + rows.length;
  }

  function countAcpConversationTaskRecords() {
    const { contexts, requests, rows } = listAcpConversationTaskRecords();
    return requests.length + contexts.length + rows.length;
  }

  function estimateAcpConversationTaskRecordsBytes() {
    const { contexts, requests, rows } = listAcpConversationTaskRecords();
    return (
      estimateEntriesBytes(requests) +
      estimateEntriesBytes(contexts) +
      estimateEntriesBytes(rows)
    );
  }

  function clearPluginTaskScope(domainRaw: string, scopeRaw: string) {
    const domain = normalizeString(domainRaw);
    const scope = normalizeString(scopeRaw);
    if (!domain || !scope) {
      return 0;
    }
    const db = getAdapter();
    const rowCount = Number(
      db.get(
        `
          SELECT COUNT(*) AS value
          FROM plugin_task_rows
          WHERE domain=@domain AND scope=@scope
        `,
        { domain, scope },
      )?.value || 0,
    );
    db.run(
      "DELETE FROM plugin_task_rows WHERE domain=@domain AND scope=@scope",
      {
        domain,
        scope,
      },
    );
    return Number.isFinite(rowCount) ? rowCount : 0;
  }

  function countPluginTaskScope(domainRaw: string, scopeRaw: string) {
    const domain = normalizeString(domainRaw);
    const scope = normalizeString(scopeRaw);
    if (!domain || !scope) {
      return 0;
    }
    const db = getAdapter();
    const rowCount = Number(
      db.get(
        `
          SELECT COUNT(*) AS value
          FROM plugin_task_rows
          WHERE domain=@domain AND scope=@scope
        `,
        { domain, scope },
      )?.value || 0,
    );
    return Number.isFinite(rowCount) ? rowCount : 0;
  }

  function estimatePluginTaskScopeBytes(domainRaw: string, scopeRaw: string) {
    const domain = normalizeString(domainRaw);
    const scope = normalizeString(scopeRaw);
    if (!domain || !scope) {
      return 0;
    }
    return sumPluginTaskRowBytesForScopes(domain, { scope });
  }

  return {
    listPluginTaskRequestEntries,
    getPluginTaskRequestEntry,
    upsertPluginTaskRequestEntry,
    replacePluginTaskRequestEntries,
    deletePluginTaskRequestEntry,
    deletePluginTaskRequestEntriesByBackend,
    listPluginTaskContextEntries,
    getPluginTaskContextEntry,
    compareAndSetPluginTaskContextEntry,
    deletePluginTaskContextDomain,
    upsertPluginTaskContextEntry,
    replacePluginTaskContextEntries,
    deletePluginTaskContextEntry,
    deletePluginTaskContextEntriesByBackend,
    listPluginTaskRowEntries,
    getPluginTaskRowEntry,
    listPluginTaskRowEntriesFiltered,
    countPluginTaskRowStates,
    upsertPluginTaskRowEntry,
    replacePluginTaskRowEntries,
    clearPluginTaskRowEntries,
    deletePluginTaskRowEntry,
    deletePluginTaskRowEntriesByBackend,
    clearPluginTaskDomain,
    countPluginTaskDomain,
    estimatePluginTaskDomainBytes,
    clearPluginTaskDomainExceptRowScopes,
    countPluginTaskDomainExceptRowScopes,
    estimatePluginTaskDomainExceptRowScopesBytes,
    clearAcpConversationTaskRecords,
    countAcpConversationTaskRecords,
    estimateAcpConversationTaskRecordsBytes,
    clearPluginTaskScope,
    countPluginTaskScope,
    estimatePluginTaskScopeBytes,
  };
}
