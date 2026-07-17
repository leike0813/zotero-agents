import fs from "node:fs";
import { DatabaseSync, type SQLOutputValue } from "node:sqlite";
import type {
  SqlAdapter,
  SqlParams,
  SqlPrimitive,
  SqlRow,
} from "../../../packages/synthesis-repository/src/index.js";

function normalizeValue(
  value: SqlPrimitive | boolean | undefined,
): SqlPrimitive {
  if (value === undefined || value === null) return null;
  if (typeof value === "boolean") return value ? 1 : 0;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  return value;
}

function normalizeParams(params?: SqlParams) {
  if (!params) return undefined;
  return Object.fromEntries(
    Object.entries(params).map(([key, value]) => [key, normalizeValue(value)]),
  );
}

function rebuildRow(source: Record<string, SQLOutputValue>): SqlRow {
  const row: SqlRow = {};
  for (const [key, value] of Object.entries(source)) {
    if (
      value !== null &&
      typeof value !== "string" &&
      typeof value !== "number" &&
      typeof value !== "bigint"
    ) {
      throw new Error("repository_sqlite_row_invalid");
    }
    if (typeof value === "bigint") {
      const numeric = Number(value);
      if (!Number.isSafeInteger(numeric)) {
        throw new Error("repository_sqlite_integer_unsafe");
      }
      row[key] = numeric;
    } else {
      row[key] = value;
    }
  }
  return row;
}

export function openSynthesisNodeSqliteAdapter(databasePath: string): {
  adapter: SqlAdapter;
  close: () => void;
} {
  const database = new DatabaseSync(databasePath, {
    timeout: 250,
    readBigInts: false,
    returnArrays: false,
    allowBareNamedParameters: true,
    allowUnknownNamedParameters: false,
  });
  database.exec("PRAGMA journal_mode=WAL");
  database.exec("PRAGMA synchronous=NORMAL");
  database.exec("PRAGMA foreign_keys=ON");
  database.exec("PRAGMA busy_timeout=250");
  if (process.platform !== "win32") {
    fs.chmodSync(databasePath, 0o600);
  }

  let transactionDepth = 0;
  let savepointSequence = 0;
  let closed = false;
  const assertOpen = () => {
    if (closed) throw new Error("repository_sqlite_closed");
  };

  const adapter: SqlAdapter = {
    run(sql, params) {
      assertOpen();
      const statement = database.prepare(sql);
      const bindings = normalizeParams(params);
      if (bindings) statement.run(bindings);
      else statement.run();
    },
    all(sql, params) {
      assertOpen();
      const statement = database.prepare(sql);
      const bindings = normalizeParams(params);
      const rows = bindings ? statement.all(bindings) : statement.all();
      return rows.map((row) =>
        rebuildRow(row as Record<string, SQLOutputValue>),
      );
    },
    get(sql, params) {
      return this.all(sql, params)[0] ?? null;
    },
    transaction<T>(fn: () => T): T {
      assertOpen();
      const outermost = transactionDepth === 0;
      const savepoint = `synthesis_repository_${savepointSequence++}`;
      database.exec(outermost ? "BEGIN IMMEDIATE" : `SAVEPOINT ${savepoint}`);
      transactionDepth += 1;
      try {
        const value = fn();
        database.exec(outermost ? "COMMIT" : `RELEASE SAVEPOINT ${savepoint}`);
        return value;
      } catch (error) {
        if (outermost) {
          database.exec("ROLLBACK");
        } else {
          database.exec(`ROLLBACK TO SAVEPOINT ${savepoint}`);
          database.exec(`RELEASE SAVEPOINT ${savepoint}`);
        }
        throw error;
      } finally {
        transactionDepth -= 1;
      }
    },
  };

  return {
    adapter,
    close() {
      if (closed) return;
      if (transactionDepth !== 0) {
        throw new Error("repository_sqlite_transaction_active");
      }
      closed = true;
      database.close();
    },
  };
}
