import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  getRuntimePersistencePaths,
  type RuntimePersistenceCategory,
} from "../src/modules/runtimePersistence";

type CleanupResult = {
  category: RuntimePersistenceCategory;
  details: Record<string, number | string>;
  failedPaths: Array<{ error: string; path: string }>;
  removedPaths: string[];
  root: string;
};

type SqliteDatabaseSync = {
  close: () => void;
  exec: (sql: string) => void;
  prepare: (sql: string) => {
    get: () => Record<string, unknown> | undefined;
  };
};

function readCount(db: SqliteDatabaseSync, sql: string) {
  const row = db.prepare(sql).get();
  return Math.max(0, Math.floor(Number(row?.value) || 0));
}

async function openDatabase(dbPath: string) {
  const sqlite = (await import("node:sqlite")) as unknown as {
    DatabaseSync: new (filename: string) => SqliteDatabaseSync;
  };
  return new sqlite.DatabaseSync(dbPath);
}

function acpConversationWhere(tableAlias = "") {
  const prefix = tableAlias ? `${tableAlias}.` : "";
  return `(
    ${prefix}request_id LIKE 'conversation:%'
    OR ${prefix}request_id LIKE 'conversation-index:%'
    OR ${prefix}payload_json LIKE '%conversationId%'
  )`;
}

async function removeManagedPath(pathRaw: string) {
  try {
    await fs.stat(pathRaw);
  } catch {
    return { removed: false };
  }
  try {
    await fs.rm(pathRaw, { recursive: true, force: true });
    return { removed: true };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : String(error),
      removed: false,
    };
  }
}

export async function cleanupRuntimePersistenceCategoryOnDisk(
  category: RuntimePersistenceCategory,
  args: { root?: string } = {},
): Promise<CleanupResult> {
  if (category !== "acp-conversations") {
    throw new Error(
      `offline cleanup does not support runtime persistence category: ${category}`,
    );
  }
  const paths = getRuntimePersistencePaths(args.root);
  const db = await openDatabase(paths.stateDbPath);
  const requestWhere = acpConversationWhere();
  const rowWhere = acpConversationWhere();
  const contextWhere = acpConversationWhere();
  let requestsDeleted = 0;
  let rowsDeleted = 0;
  let contextsDeleted = 0;
  try {
    db.exec("PRAGMA busy_timeout=5000");
    requestsDeleted = readCount(
      db,
      `SELECT COUNT(*) AS value FROM plugin_task_requests WHERE domain='acp' AND ${requestWhere}`,
    );
    contextsDeleted = readCount(
      db,
      `SELECT COUNT(*) AS value FROM plugin_task_contexts WHERE domain='acp' AND ${contextWhere}`,
    );
    rowsDeleted = readCount(
      db,
      `SELECT COUNT(*) AS value FROM plugin_task_rows WHERE domain='acp' AND scope <> 'skill-runs' AND ${rowWhere}`,
    );
    db.exec(`
      BEGIN IMMEDIATE;
      DELETE FROM plugin_task_contexts
        WHERE domain='acp' AND ${contextWhere};
      DELETE FROM plugin_task_rows
        WHERE domain='acp'
          AND scope <> 'skill-runs'
          AND ${rowWhere};
      DELETE FROM plugin_task_requests
        WHERE domain='acp' AND ${requestWhere};
      COMMIT;
    `);
  } catch (error) {
    try {
      db.exec("ROLLBACK");
    } catch {
      // Ignore rollback errors after failed transaction setup.
    }
    throw error;
  } finally {
    db.close();
  }

  const removedPaths: string[] = [];
  const failedPaths: Array<{ error: string; path: string }> = [];
  const chatRemoval = await removeManagedPath(paths.acpChatRoot);
  if (chatRemoval.removed) {
    removedPaths.push(paths.acpChatRoot);
  } else if (chatRemoval.error) {
    failedPaths.push({ error: chatRemoval.error, path: paths.acpChatRoot });
  }
  return {
    category,
    details: {
      requestsDeleted,
      contextsDeleted,
      rowsDeleted,
      rowsDeletedTotal: requestsDeleted + contextsDeleted + rowsDeleted,
    },
    failedPaths,
    removedPaths,
    root: paths.root,
  };
}

function parseCliArgs(argv: string[]) {
  const args = { category: "", root: "" };
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === "--category") {
      args.category = argv[index + 1] || "";
      index += 1;
      continue;
    }
    if (value === "--root") {
      args.root = argv[index + 1] || "";
      index += 1;
    }
  }
  return args;
}

async function main() {
  const args = parseCliArgs(process.argv.slice(2));
  const category = (args.category || "acp-conversations") as RuntimePersistenceCategory;
  const result = await cleanupRuntimePersistenceCategoryOnDisk(category, {
    root: args.root || process.env.ZOTERO_SKILLS_RUNTIME_ROOT || undefined,
  });
  console.log(JSON.stringify(result, null, 2));
}

const entryPath = process.argv[1] ? path.resolve(process.argv[1]) : "";
if (entryPath && fileURLToPath(import.meta.url) === entryPath) {
  void main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
