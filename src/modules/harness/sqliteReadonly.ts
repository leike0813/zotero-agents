import type { SqlAdapter, SqlParams, SqlRow } from "../synthesis/repository";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

type DatabaseSync = {
  prepare: (sql: string) => {
    all: (params?: Record<string, unknown>) => SqlRow[];
    get: (params?: Record<string, unknown>) => SqlRow | undefined;
    run: (params?: Record<string, unknown>) => unknown;
  };
  exec?: (sql: string) => unknown;
  close: () => void;
};

type SqliteModule = {
  DatabaseSync: new (
    dbPath: string,
    options?: { readOnly?: boolean; timeout?: number },
  ) => DatabaseSync;
  backup?: (sourceDb: DatabaseSync, path: string) => Promise<number>;
};

type OpenReadonlyDatabaseResult = {
  db: DatabaseSync;
  close: () => void;
};

export type ReadonlySqliteDatabase = {
  all: (sql: string, params?: SqlParams) => SqlRow[];
  get: (sql: string, params?: SqlParams) => SqlRow | null;
  close: () => void;
};

export type ReadonlySqliteAdapter = SqlAdapter & {
  close: () => void;
};

const dynamicImport = new Function("specifier", "return import(specifier)") as (
  specifier: string,
) => Promise<any>;

const READONLY_SQLITE_BUSY_TIMEOUT_MS = 5000;

function isMemoryDatabasePath(dbPath: string) {
  return dbPath === ":memory:" || dbPath.startsWith("file:");
}

function normalizeSql(sql: string) {
  return String(sql || "")
    .replace(/--.*$/gm, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function isReadonlySql(sql: string) {
  return /^(select|with|pragma)\b/i.test(normalizeSql(sql));
}

function isSchemaInitNoop(sql: string) {
  const normalized = normalizeSql(sql).toLowerCase();
  return (
    normalized.startsWith("create table if not exists ") ||
    normalized.startsWith("create index if not exists ") ||
    normalized.startsWith("create unique index if not exists ") ||
    normalized.startsWith("drop table if exists synt_") ||
    normalized.startsWith("insert or replace into synt_schema_meta")
  );
}

function readonlyError(sql: string) {
  const normalized = normalizeSql(sql);
  const token = normalized.split(/\s+/)[0] || "statement";
  return new Error(
    `Readonly SQLite adapter refused ${token.toUpperCase()}: ${normalized.slice(0, 160)}`,
  );
}

function normalizeParams(params?: SqlParams): Record<string, unknown> {
  const normalized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(params || {})) {
    normalized[key] = typeof value === "boolean" ? (value ? 1 : 0) : value;
  }
  return normalized;
}

async function openReadonlyDatabase(
  dbPath: string,
): Promise<OpenReadonlyDatabaseResult> {
  const sqlite = (await dynamicImport("node:sqlite")) as SqliteModule;
  const DatabaseCtor = sqlite.DatabaseSync;
  if (typeof DatabaseCtor !== "function") {
    throw new Error(
      "node:sqlite DatabaseSync is unavailable; Node 24+ is required.",
    );
  }
  const source = new DatabaseCtor(dbPath, {
    readOnly: true,
    timeout: READONLY_SQLITE_BUSY_TIMEOUT_MS,
  }) as DatabaseSync;
  source.exec?.(`PRAGMA busy_timeout=${READONLY_SQLITE_BUSY_TIMEOUT_MS}`);
  if (isMemoryDatabasePath(dbPath) || typeof sqlite.backup !== "function") {
    return {
      db: source,
      close() {
        source.close();
      },
    };
  }

  const snapshotDir = mkdtempSync(
    path.join(tmpdir(), "zs-harness-sqlite-snapshot-"),
  );
  const snapshotPath = path.join(snapshotDir, path.basename(dbPath));
  try {
    await sqlite.backup(source, snapshotPath);
  } catch (error) {
    source.close();
    rmSync(snapshotDir, { recursive: true, force: true });
    throw error;
  }
  source.close();
  const db = new DatabaseCtor(snapshotPath, {
    readOnly: true,
    timeout: READONLY_SQLITE_BUSY_TIMEOUT_MS,
  }) as DatabaseSync;
  db.exec?.(`PRAGMA busy_timeout=${READONLY_SQLITE_BUSY_TIMEOUT_MS}`);
  return {
    db,
    close() {
      db.close();
      rmSync(snapshotDir, { recursive: true, force: true });
    },
  };
}

export async function createReadonlySqliteDatabase(
  dbPath: string,
): Promise<ReadonlySqliteDatabase> {
  const opened = await openReadonlyDatabase(dbPath);
  const db = opened.db;
  return {
    all(sql, params) {
      if (!isReadonlySql(sql)) {
        throw readonlyError(sql);
      }
      return db.prepare(sql).all(normalizeParams(params));
    },
    get(sql, params) {
      if (!isReadonlySql(sql)) {
        throw readonlyError(sql);
      }
      return db.prepare(sql).get(normalizeParams(params)) || null;
    },
    close() {
      opened.close();
    },
  };
}

export async function createReadonlySqliteAdapter(
  dbPath: string,
): Promise<ReadonlySqliteAdapter> {
  const opened = await openReadonlyDatabase(dbPath);
  const db = opened.db;
  return {
    run(sql, params) {
      if (isSchemaInitNoop(sql)) {
        return;
      }
      if (!isReadonlySql(sql)) {
        throw readonlyError(sql);
      }
      db.prepare(sql).run(normalizeParams(params));
    },
    all(sql, params) {
      if (!isReadonlySql(sql)) {
        throw readonlyError(sql);
      }
      return db.prepare(sql).all(normalizeParams(params));
    },
    get(sql, params) {
      if (!isReadonlySql(sql)) {
        throw readonlyError(sql);
      }
      return db.prepare(sql).get(normalizeParams(params)) || null;
    },
    transaction() {
      throw new Error("Readonly SQLite adapter refused TRANSACTION");
    },
    close() {
      opened.close();
    },
  };
}
