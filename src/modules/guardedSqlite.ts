type MozStorageConnection = {
  createStatement: (sql: string) => unknown;
  executeSimpleSQL: (sql: string) => void;
};

type MozStorageService = {
  openDatabase?: (file: unknown) => unknown;
};

type GuardedConnectionEntry = {
  conn: MozStorageConnection;
  transactionDepth: number;
  busyTimeoutConfigured: boolean;
};

export type GuardedSqliteConnection = {
  createStatement: (sql: string) => unknown;
  execute: <T>(fn: () => T) => T;
  executeSimpleSQL: (sql: string) => void;
  transaction: <T>(fn: () => T) => T;
};

const DEFAULT_BUSY_TIMEOUT_MS = 2500;
const DEFAULT_BUSY_RETRY_ATTEMPTS = 3;

const entriesByPath = new Map<string, GuardedConnectionEntry>();

function normalizeDbPath(dbPath: string) {
  const normalized = String(dbPath || "")
    .trim()
    .replace(/\\/g, "/");
  return /^[A-Za-z]:\//.test(normalized)
    ? normalized.toLowerCase()
    : normalized;
}

export function isSqliteBusyError(error: unknown) {
  const values: string[] = [];
  const collect = (value: unknown) => {
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
      const source = value as Record<string, unknown>;
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
  return (
    text.includes("ns_error_storage_busy") ||
    text.includes("0x80630001") ||
    text.includes("sqlite_busy") ||
    text.includes("database is locked") ||
    text.includes("database is busy") ||
    text.includes("storage_busy")
  );
}

export function isTransientStorageBusyError(error: unknown) {
  return isSqliteBusyError(error);
}

function withBusyRetry<T>(fn: () => T, attempts = DEFAULT_BUSY_RETRY_ATTEMPTS) {
  let lastError: unknown;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      return fn();
    } catch (error) {
      if (!isSqliteBusyError(error)) {
        throw error;
      }
      lastError = error;
    }
  }
  throw lastError;
}

function asConnection(value: unknown): MozStorageConnection | null {
  const candidate = value as Partial<MozStorageConnection> | undefined;
  if (
    candidate &&
    typeof candidate.createStatement === "function" &&
    typeof candidate.executeSimpleSQL === "function"
  ) {
    return candidate as MozStorageConnection;
  }
  return null;
}

function configureBusyTimeout(entry: GuardedConnectionEntry) {
  if (entry.busyTimeoutConfigured) {
    return;
  }
  withBusyRetry(() =>
    entry.conn.executeSimpleSQL(
      `PRAGMA busy_timeout=${DEFAULT_BUSY_TIMEOUT_MS}`,
    ),
  );
  entry.busyTimeoutConfigured = true;
}

export function getGuardedSqliteConnection(args: {
  dbPath: string;
  file: unknown;
  storage?: MozStorageService;
}): GuardedSqliteConnection {
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
    };
    entriesByPath.set(key, entry);
  }
  configureBusyTimeout(entry);

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
        } finally {
          entry.transactionDepth -= 1;
        }
      }
      this.executeSimpleSQL("BEGIN IMMEDIATE");
      entry.transactionDepth = 1;
      try {
        const result = fn();
        this.executeSimpleSQL("COMMIT");
        return result;
      } catch (error) {
        try {
          this.executeSimpleSQL("ROLLBACK");
        } catch {
          // Preserve the original transaction failure.
        }
        throw error;
      } finally {
        entry.transactionDepth = 0;
      }
    },
  };
}

export function resetGuardedSqliteForTests() {
  entriesByPath.clear();
}
