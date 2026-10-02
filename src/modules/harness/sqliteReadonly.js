import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
const dynamicImport = new Function("specifier", "return import(specifier)");
const READONLY_SQLITE_BUSY_TIMEOUT_MS = 5000;
function isMemoryDatabasePath(dbPath) {
    return dbPath === ":memory:" || dbPath.startsWith("file:");
}
function normalizeSql(sql) {
    return String(sql || "")
        .replace(/--.*$/gm, "")
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .replace(/\s+/g, " ")
        .trim();
}
function isReadonlySql(sql) {
    return /^(select|with|pragma)\b/i.test(normalizeSql(sql));
}
function isSchemaInitNoop(sql) {
    const normalized = normalizeSql(sql).toLowerCase();
    return (normalized.startsWith("create table if not exists ") ||
        normalized.startsWith("create index if not exists ") ||
        normalized.startsWith("create unique index if not exists ") ||
        normalized.startsWith("drop table if exists synt_") ||
        normalized.startsWith("insert or replace into synt_schema_meta"));
}
function readonlyError(sql) {
    const normalized = normalizeSql(sql);
    const token = normalized.split(/\s+/)[0] || "statement";
    return new Error(`Readonly SQLite adapter refused ${token.toUpperCase()}: ${normalized.slice(0, 160)}`);
}
function normalizeParams(params) {
    const normalized = {};
    for (const [key, value] of Object.entries(params || {})) {
        normalized[key] = typeof value === "boolean" ? (value ? 1 : 0) : value;
    }
    return normalized;
}
async function openReadonlyDatabase(dbPath) {
    const sqlite = (await dynamicImport("node:sqlite"));
    const DatabaseCtor = sqlite.DatabaseSync;
    if (typeof DatabaseCtor !== "function") {
        throw new Error("node:sqlite DatabaseSync is unavailable; Node 24+ is required.");
    }
    const source = new DatabaseCtor(dbPath, {
        readOnly: true,
        timeout: READONLY_SQLITE_BUSY_TIMEOUT_MS,
    });
    source.exec?.(`PRAGMA busy_timeout=${READONLY_SQLITE_BUSY_TIMEOUT_MS}`);
    if (isMemoryDatabasePath(dbPath) || typeof sqlite.backup !== "function") {
        return {
            db: source,
            close() {
                source.close();
            },
        };
    }
    const snapshotDir = mkdtempSync(path.join(tmpdir(), "zs-harness-sqlite-snapshot-"));
    const snapshotPath = path.join(snapshotDir, path.basename(dbPath));
    try {
        await sqlite.backup(source, snapshotPath);
    }
    catch (error) {
        source.close();
        rmSync(snapshotDir, { recursive: true, force: true });
        throw error;
    }
    source.close();
    const db = new DatabaseCtor(snapshotPath, {
        readOnly: true,
        timeout: READONLY_SQLITE_BUSY_TIMEOUT_MS,
    });
    db.exec?.(`PRAGMA busy_timeout=${READONLY_SQLITE_BUSY_TIMEOUT_MS}`);
    return {
        db,
        close() {
            db.close();
            rmSync(snapshotDir, { recursive: true, force: true });
        },
    };
}
export async function createReadonlySqliteDatabase(dbPath) {
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
export async function createReadonlySqliteAdapter(dbPath) {
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
