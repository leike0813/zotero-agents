const DEFAULT_BUSY_TIMEOUT_MS = 2500;
const DEFAULT_BUSY_RETRY_ATTEMPTS = 3;
const entriesByPath = new Map();
function normalizeDbPath(dbPath) {
    const normalized = String(dbPath || "")
        .trim()
        .replace(/\\/g, "/");
    return /^[A-Za-z]:\//.test(normalized)
        ? normalized.toLowerCase()
        : normalized;
}
export function isSqliteBusyError(error) {
    const values = [];
    const collect = (value) => {
        if (!value) {
            return;
        }
        if (typeof value === "string") {
            values.push(value);
            return;
        }
        if (typeof value === "number") {
            values.push(String(value));
            return;
        }
        if (typeof value === "object") {
            const source = value;
            for (const key of [
                "name",
                "message",
                "result",
                "nsresult",
                "code",
                "errno",
            ]) {
                collect(source[key]);
            }
            collect(source.cause);
        }
    };
    collect(error);
    const text = values.join(" ").toLowerCase();
    return (text.includes("ns_error_storage_busy") ||
        text.includes("0x80630001") ||
        text.includes("sqlite_busy") ||
        text.includes("database is locked") ||
        text.includes("database is busy") ||
        text.includes("storage_busy"));
}
export function isTransientStorageBusyError(error) {
    return isSqliteBusyError(error);
}
function withBusyRetry(fn, attempts = DEFAULT_BUSY_RETRY_ATTEMPTS) {
    let lastError;
    for (let attempt = 0; attempt < attempts; attempt += 1) {
        try {
            return fn();
        }
        catch (error) {
            if (!isSqliteBusyError(error)) {
                throw error;
            }
            lastError = error;
        }
    }
    throw lastError;
}
function asConnection(value) {
    const candidate = value;
    if (candidate &&
        typeof candidate.createStatement === "function" &&
        typeof candidate.executeSimpleSQL === "function") {
        return candidate;
    }
    return null;
}
function configureBusyTimeout(entry) {
    if (entry.busyTimeoutConfigured) {
        return;
    }
    withBusyRetry(() => entry.conn.executeSimpleSQL(`PRAGMA busy_timeout=${DEFAULT_BUSY_TIMEOUT_MS}`));
    entry.busyTimeoutConfigured = true;
}
export function getGuardedSqliteConnection(args) {
    const key = normalizeDbPath(args.dbPath);
    let entry = entriesByPath.get(key);
    if (!entry) {
        const conn = asConnection(args.storage?.openDatabase?.(args.file));
        if (!conn) {
            throw new Error("Services.storage.openDatabase is unavailable");
        }
        entry = {
            conn,
            transactionDepth: 0,
            busyTimeoutConfigured: false,
            ownerCount: 0,
        };
        entriesByPath.set(key, entry);
    }
    entry.ownerCount += 1;
    configureBusyTimeout(entry);
    let released = false;
    return {
        createStatement(sql) {
            return withBusyRetry(() => entry.conn.createStatement(sql));
        },
        execute(fn) {
            return withBusyRetry(fn);
        },
        executeSimpleSQL(sql) {
            withBusyRetry(() => entry.conn.executeSimpleSQL(sql));
        },
        transaction(fn) {
            if (entry.transactionDepth > 0) {
                entry.transactionDepth += 1;
                try {
                    return fn();
                }
                finally {
                    entry.transactionDepth -= 1;
                }
            }
            this.executeSimpleSQL("BEGIN IMMEDIATE");
            entry.transactionDepth = 1;
            try {
                const result = fn();
                this.executeSimpleSQL("COMMIT");
                return result;
            }
            catch (error) {
                try {
                    this.executeSimpleSQL("ROLLBACK");
                }
                catch {
                    // Preserve the original transaction failure.
                }
                throw error;
            }
            finally {
                entry.transactionDepth = 0;
            }
        },
        async release() {
            if (released) {
                return;
            }
            released = true;
            if (entry.transactionDepth > 0) {
                released = false;
                throw new Error("guarded_sqlite_transaction_active");
            }
            entry.ownerCount -= 1;
            if (entry.ownerCount > 0) {
                return;
            }
            withBusyRetry(() => entry.conn.executeSimpleSQL("PRAGMA wal_checkpoint(TRUNCATE)"));
            if (entriesByPath.get(key) === entry) {
                entriesByPath.delete(key);
            }
            if (typeof entry.conn.asyncClose === "function") {
                await new Promise((resolve, reject) => {
                    let settled = false;
                    const complete = () => {
                        if (!settled) {
                            settled = true;
                            resolve();
                        }
                    };
                    try {
                        const result = entry.conn.asyncClose?.({ complete });
                        if (result &&
                            typeof result.then === "function") {
                            Promise.resolve(result).then(complete, reject);
                        }
                    }
                    catch (error) {
                        reject(error);
                    }
                });
                return;
            }
            entry.conn.close?.();
        },
    };
}
export function resetGuardedSqliteForTests() {
    entriesByPath.clear();
}
