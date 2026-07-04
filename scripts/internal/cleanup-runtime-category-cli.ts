import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import type { RuntimePersistenceCategory } from "../../src/modules/runtimePersistence";

type ParsedArgs = {
  root?: string;
  help: boolean;
};

function parseArgs(argv: string[]): ParsedArgs {
  const parsed: ParsedArgs = { help: false };
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === "--help" || value === "-h") {
      parsed.help = true;
      continue;
    }
    if (value === "--root") {
      parsed.root = argv[index + 1];
      index += 1;
      continue;
    }
    throw new Error(`Unknown argument: ${value}`);
  }
  return parsed;
}

function usage(scriptName: string) {
  return [
    `Usage: npx tsx scripts/${scriptName} [--root <runtime-root>]`,
    "",
    "If --root is omitted, the script uses ZOTERO_SKILLS_RUNTIME_ROOT, ZOTERO_PLUGIN_DATA_DIR, or the plugin runtime default.",
  ].join("\n");
}

function normalizeRoot(rootRaw?: string) {
  const root = String(rootRaw || "").trim();
  return root ? path.resolve(root) : "";
}

function stripEnvValue(valueRaw: string) {
  const value = valueRaw.trim();
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }
  return value;
}

function loadDotenvFile(envPath: string) {
  if (!fs.existsSync(envPath)) {
    return;
  }
  const text = fs.readFileSync(envPath, "utf8");
  for (const lineRaw of text.split(/\r?\n/)) {
    const line = lineRaw.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }
    const match = /^(?:export\s+)?\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(
      line,
    );
    if (!match) {
      continue;
    }
    const [, key, valueRaw] = match;
    if (typeof process.env[key] !== "undefined") {
      continue;
    }
    process.env[key] = stripEnvValue(valueRaw);
  }
}

function loadProjectDotenv() {
  const cwdDotenv = path.resolve(process.cwd(), ".env");
  loadDotenvFile(cwdDotenv);
  const helperDir = path.dirname(fileURLToPath(import.meta.url));
  const projectDotenv = path.resolve(helperDir, "..", "..", ".env");
  if (projectDotenv !== cwdDotenv) {
    loadDotenvFile(projectDotenv);
  }
}

function applyRuntimeRootFromZoteroDataDir() {
  if (String(process.env.ZOTERO_SKILLS_RUNTIME_ROOT || "").trim()) {
    return;
  }
  const dataDir = String(process.env.ZOTERO_PLUGIN_DATA_DIR || "").trim();
  if (!dataDir) {
    return;
  }
  process.env.ZOTERO_SKILLS_RUNTIME_ROOT = path.resolve(
    stripEnvValue(dataDir),
    "zotero-agents",
  );
}

function collectPlaceholderSequence(sql: string) {
  const regex = /[@:$]([A-Za-z_][A-Za-z0-9_]*)/g;
  const result: string[] = [];
  let match: RegExpExecArray | null = null;
  while ((match = regex.exec(sql)) !== null) {
    result.push(match[1]);
  }
  return result;
}

function nodeFileFromPath(filePath: string): any {
  const normalizedPath = path.resolve(String(filePath || "."));
  const parentPath = path.dirname(normalizedPath);
  return {
    path: normalizedPath,
    parent:
      parentPath && parentPath !== normalizedPath
        ? nodeFileFromPath(parentPath)
        : undefined,
    exists() {
      return fs.existsSync(normalizedPath);
    },
    create() {
      fs.mkdirSync(normalizedPath);
    },
  };
}

async function installStandaloneZoteroRuntimeShim() {
  const runtime = globalThis as any;
  if (runtime.Services?.storage?.openDatabase && runtime.Zotero?.File) {
    return;
  }
  const sqlite = (await import("node:sqlite")) as any;
  runtime.Components = runtime.Components || {
    interfaces: {
      nsIFile: {
        DIRECTORY_TYPE: 1,
      },
    },
  };
  runtime.Zotero = {
    ...(runtime.Zotero || {}),
    File: {
      ...(runtime.Zotero?.File || {}),
      pathToFile(filePath: string) {
        return nodeFileFromPath(filePath);
      },
    },
    Prefs: {
      ...(runtime.Zotero?.Prefs || {}),
      get() {
        return "";
      },
      set() {
        return undefined;
      },
      clear() {
        return undefined;
      },
    },
  };
  runtime.Services = {
    ...(runtime.Services || {}),
    storage: {
      ...(runtime.Services?.storage || {}),
      openDatabase(file: { path?: string } | string) {
        const dbPath = path.resolve(
          typeof file === "string" ? file : String(file?.path || ""),
        );
        fs.mkdirSync(path.dirname(dbPath), { recursive: true });
        const db = new sqlite.DatabaseSync(dbPath);
        return {
          executeSimpleSQL(sql: string) {
            db.exec(sql);
          },
          createStatement(sql: string) {
            const placeholders = collectPlaceholderSequence(sql);
            const positionalSql = sql.replace(
              /[@:$][A-Za-z_][A-Za-z0-9_]*/g,
              "?",
            );
            const statement = db.prepare(positionalSql);
            const params: unknown[] = new Array(placeholders.length).fill("");
            let rows: Array<Record<string, unknown>> | null = null;
            let rowIndex = -1;
            const currentRow = () => rows?.[rowIndex] || {};
            const columnNames = () => Object.keys(currentRow());
            return {
              get columnCount() {
                return columnNames().length;
              },
              bindByIndex(index: number, value: unknown) {
                params[index] = value;
              },
              bindByName(name: string, value: unknown) {
                const normalized = String(name || "").replace(/^[@:$]/, "");
                placeholders.forEach((placeholder, index) => {
                  if (placeholder === normalized) {
                    params[index] = value;
                  }
                });
              },
              execute() {
                statement.run(...params);
              },
              executeStep() {
                if (!rows) {
                  rows = statement.all(...params) as Array<
                    Record<string, unknown>
                  >;
                  rowIndex = -1;
                }
                rowIndex += 1;
                return rowIndex < rows.length;
              },
              getColumnName(index: number) {
                return columnNames()[index] || "";
              },
              getTypeOfIndex(index: number) {
                const value = currentRow()[this.getColumnName(index)];
                if (value === null || typeof value === "undefined") return 0;
                if (typeof value === "number")
                  return Number.isInteger(value) ? 1 : 2;
                return 3;
              },
              getInt64(index: number) {
                return Math.trunc(
                  Number(currentRow()[this.getColumnName(index)]),
                );
              },
              getDouble(index: number) {
                return Number(currentRow()[this.getColumnName(index)]);
              },
              getUTF8String(index: number) {
                const value = currentRow()[this.getColumnName(index)];
                return typeof value === "undefined" || value === null
                  ? ""
                  : String(value);
              },
              finalize() {
                return undefined;
              },
            };
          },
        };
      },
    },
  };
}

export async function runRuntimePersistenceCleanupCli(args: {
  category: RuntimePersistenceCategory;
  scriptUrl: string;
}) {
  const scriptName = path.basename(fileURLToPath(args.scriptUrl));
  try {
    loadProjectDotenv();
    const parsed = parseArgs(process.argv.slice(2));
    if (parsed.help) {
      console.log(usage(scriptName));
      return;
    }
    const root = normalizeRoot(parsed.root);
    if (root) {
      process.env.ZOTERO_SKILLS_RUNTIME_ROOT = root;
    }
    applyRuntimeRootFromZoteroDataDir();

    await installStandaloneZoteroRuntimeShim();
    await import("../../src/modules/pluginStateStore");
    const { cleanupRuntimePersistenceCategory } =
      await import("../../src/modules/runtimePersistence");
    const result = await cleanupRuntimePersistenceCategory(args.category);
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
