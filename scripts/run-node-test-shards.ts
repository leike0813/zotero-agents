import { readdir } from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import os from "node:os";

type ShardId =
  | "core-acp-session-manager"
  | "core-acp-skillrunner"
  | "core-acp-other"
  | "core-synthesis"
  | "core-rest"
  | "node-core"
  | "ui"
  | "workflow";

type ShardDefinition = {
  id: ShardId;
  label: string;
  select: (filePath: string) => boolean;
  setupFiles?: string[];
};

type ParsedArgs = {
  listShards: boolean;
  shardId: string;
  mochaArgs: string[];
};

type ShardRunResult = {
  id: ShardId;
  fileCount: number;
  exitCode: number;
  durationMs: number;
  command: string;
};

const PROJECT_ROOT = process.cwd();
const TEST_SETUP_FILE = "test/setup/zotero-mock.ts";
const COMMON_SETUP_FILES = ["test/00-domain-filter.test.ts"];
const CORE_SETUP_FILES = [
  ...COMMON_SETUP_FILES,
  "test/core/00-mocha-grep-setup.test.ts",
  "test/core/00-zotero-diagnostic-setup.test.ts",
];
const UI_SETUP_FILES = [
  ...COMMON_SETUP_FILES,
  "test/ui/00-mocha-grep-setup.test.ts",
  "test/ui/00-zotero-diagnostic-setup.test.ts",
];
const WORKFLOW_SETUP_FILES = [
  ...COMMON_SETUP_FILES,
  "test/workflow-setup/00-mocha-grep-setup.test.ts",
  "test/workflow-setup/00-zotero-diagnostic-setup.test.ts",
];
const ALL_SHARED_SETUP_FILES = new Set([
  ...COMMON_SETUP_FILES,
  ...CORE_SETUP_FILES,
  ...UI_SETUP_FILES,
  ...WORKFLOW_SETUP_FILES,
]);

const SHARDS: ShardDefinition[] = [
  {
    id: "core-acp-session-manager",
    label: "ACP Session Manager",
    setupFiles: CORE_SETUP_FILES,
    select: (filePath) =>
      filePath === "test/core/96-acp-conversation-store.test.ts" ||
      /^test\/core\/96-acp-session-manager-[^/]+\.test\.ts$/.test(filePath),
  },
  {
    id: "core-acp-skillrunner",
    label: "ACP SkillRunner-compatible runner",
    setupFiles: CORE_SETUP_FILES,
    select: (filePath) =>
      filePath === "test/core/107-acp-skillrunner-compatible-runner.test.ts",
  },
  {
    id: "core-acp-other",
    label: "Other ACP core tests",
    setupFiles: CORE_SETUP_FILES,
    select: (filePath) =>
      filePath.startsWith("test/core/") &&
      filePath.endsWith(".test.ts") &&
      !isCoreAcpSessionManagerFile(filePath) &&
      filePath !== "test/core/107-acp-skillrunner-compatible-runner.test.ts" &&
      path.basename(filePath).toLowerCase().includes("acp"),
  },
  {
    id: "core-synthesis",
    label: "Synthesis core tests",
    setupFiles: CORE_SETUP_FILES,
    select: (filePath) =>
      filePath.startsWith("test/core/") &&
      filePath.endsWith(".test.ts") &&
      /(?:^|[-_])(synthesis|topic-synthesis)(?:[-_]|\.|$)/i.test(
        path.basename(filePath),
      ),
  },
  {
    id: "core-rest",
    label: "Remaining core tests",
    setupFiles: CORE_SETUP_FILES,
    select: (filePath) =>
      filePath.startsWith("test/core/") && filePath.endsWith(".test.ts"),
  },
  {
    id: "node-core",
    label: "Node core tests",
    setupFiles: COMMON_SETUP_FILES,
    select: (filePath) =>
      filePath.startsWith("test/node/core/") && filePath.endsWith(".test.ts"),
  },
  {
    id: "ui",
    label: "UI tests",
    setupFiles: UI_SETUP_FILES,
    select: (filePath) =>
      filePath.startsWith("test/ui/") && filePath.endsWith(".test.ts"),
  },
  {
    id: "workflow",
    label: "Workflow tests",
    setupFiles: WORKFLOW_SETUP_FILES,
    select: (filePath) =>
      /^test\/workflow-[^/]+\//.test(filePath) && filePath.endsWith(".test.ts"),
  },
];

function normalizeTestPath(filePath: string) {
  return filePath.replace(/\\/g, "/");
}

function isCoreAcpSessionManagerFile(filePath: string) {
  return (
    filePath === "test/core/96-acp-conversation-store.test.ts" ||
    /^test\/core\/96-acp-session-manager-[^/]+\.test\.ts$/.test(filePath)
  );
}

async function collectTestFiles(dir = "test"): Promise<string[]> {
  const absoluteDir = path.join(PROJECT_ROOT, dir);
  const entries = await readdir(absoluteDir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const relativePath = normalizeTestPath(path.join(dir, entry.name));
    if (
      relativePath === "test/zotero" ||
      relativePath.startsWith("test/zotero/")
    ) {
      continue;
    }
    if (entry.isDirectory()) {
      files.push(...(await collectTestFiles(relativePath)));
      continue;
    }
    if (entry.isFile() && relativePath.endsWith(".test.ts")) {
      files.push(relativePath);
    }
  }
  return files.sort((left, right) => left.localeCompare(right));
}

function parseArgs(args: string[]): ParsedArgs {
  const mochaArgs: string[] = [];
  let listShards = false;
  let shardId = "";
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--list-shards") {
      listShards = true;
      continue;
    }
    if (arg === "--shard") {
      shardId = args[index + 1] || "";
      index += 1;
      continue;
    }
    if (arg.startsWith("--shard=")) {
      shardId = arg.slice("--shard=".length);
      continue;
    }
    mochaArgs.push(arg);
  }
  return { listShards, shardId, mochaArgs };
}

function hasMochaExitFlag(args: string[]) {
  return args.some((arg) => arg === "--exit" || arg === "--no-exit");
}

function buildMochaArgs(files: string[], forwardedArgs: string[]) {
  const args = [
    "node_modules/mocha/bin/mocha",
    ...files,
    "--require",
    TEST_SETUP_FILE,
    ...forwardedArgs,
  ];
  if (!hasMochaExitFlag(forwardedArgs)) {
    args.push("--exit");
  }
  return args;
}

function resolveTsxCliEntry() {
  return path.join(PROJECT_ROOT, "node_modules", "tsx", "dist", "cli.mjs");
}

function quoteArg(arg: string) {
  if (/^[A-Za-z0-9_./:=@+-]+$/.test(arg)) {
    return arg;
  }
  return JSON.stringify(arg);
}

function formatCommand(args: string[]) {
  return ["npx", "tsx", ...args].map(quoteArg).join(" ");
}

function resolveShardDataRoot() {
  const currentDataDir = String(process.env.ZOTERO_TEST_DATA_DIR || "").trim();
  if (currentDataDir) {
    return path.join(path.dirname(path.resolve(currentDataDir)), "shards");
  }
  return path.join(
    os.tmpdir(),
    `zotero-agents-node-test-shards-${process.pid}`,
  );
}

function buildShardEnv(shardId: ShardId, shardDataRoot: string) {
  return {
    ...process.env,
    ZOTERO_TEST_DATA_DIR: path.join(shardDataRoot, shardId, "Zotero_data"),
    ZOTERO_TEST_DATA_DIR_MANAGED: "1",
  };
}

function runShard(args: {
  shard: ShardDefinition;
  files: string[];
  mochaArgs: string[];
  shardDataRoot: string;
}): Promise<ShardRunResult> {
  const allFiles = uniquePaths([
    ...(args.shard.setupFiles || []),
    ...args.files,
  ]);
  const mochaArgs = buildMochaArgs(allFiles, args.mochaArgs);
  const command = formatCommand(mochaArgs);
  const startedAt = Date.now();
  const shardEnv = buildShardEnv(args.shard.id, args.shardDataRoot);
  console.log("");
  console.log(`[node-test-shard:start] ${args.shard.id} (${args.shard.label})`);
  console.log(`[node-test-shard:files] ${args.files.length}`);
  console.log(`[node-test-shard:data-dir] ${shardEnv.ZOTERO_TEST_DATA_DIR}`);
  console.log(`[node-test-shard:command] ${command}`);
  return new Promise((resolve) => {
    let settled = false;
    const finish = (exitCode: number) => {
      if (settled) {
        return;
      }
      settled = true;
      const durationMs = Date.now() - startedAt;
      console.log(
        `[node-test-shard:end] ${args.shard.id} exit=${exitCode} durationMs=${durationMs}`,
      );
      resolve({
        id: args.shard.id,
        fileCount: args.files.length,
        exitCode,
        durationMs,
        command,
      });
    };
    const child = spawn(
      process.execPath,
      [resolveTsxCliEntry(), ...mochaArgs],
      {
        cwd: PROJECT_ROOT,
        env: shardEnv,
        stdio: "inherit",
        windowsHide: true,
      },
    );
    child.on("error", (error) => {
      console.error(`[node-test-shard:error] ${args.shard.id}: ${error}`);
      finish(1);
    });
    child.on("exit", (code, signal) => {
      const exitCode =
        typeof code === "number"
          ? code
          : signal === "SIGINT"
            ? 130
            : signal === "SIGTERM"
              ? 143
              : 1;
      finish(exitCode);
    });
  });
}

function uniquePaths(files: string[]) {
  return Array.from(new Set(files)).sort((left, right) =>
    left.localeCompare(right),
  );
}

function buildShardFileMap(allTestFiles: string[]) {
  const remaining = new Set(
    allTestFiles.filter((filePath) => !ALL_SHARED_SETUP_FILES.has(filePath)),
  );
  const byShard = new Map<ShardId, string[]>();
  for (const shard of SHARDS) {
    const selected = Array.from(remaining)
      .filter(shard.select)
      .sort((left, right) => left.localeCompare(right));
    byShard.set(shard.id, selected);
    for (const filePath of selected) {
      remaining.delete(filePath);
    }
  }
  return { byShard, unassigned: Array.from(remaining).sort() };
}

function printShardList(args: {
  byShard: Map<ShardId, string[]>;
  unassigned: string[];
}) {
  console.log("[node-test-shards]");
  for (const shard of SHARDS) {
    const files = args.byShard.get(shard.id) || [];
    console.log(`- ${shard.id}: ${files.length} files (${shard.label})`);
  }
  if (args.unassigned.length > 0) {
    console.log(`- unassigned: ${args.unassigned.length} files`);
    for (const filePath of args.unassigned) {
      console.log(`  ${filePath}`);
    }
  }
}

function printSummary(results: ShardRunResult[]) {
  console.log("");
  console.log("[node-test-shards:summary]");
  for (const result of results) {
    console.log(
      `- ${result.id}: exit=${result.exitCode} files=${result.fileCount} durationMs=${result.durationMs}`,
    );
  }
  const failed = results.filter((result) => result.exitCode !== 0);
  if (failed.length === 0) {
    console.log("[node-test-shards:summary] all shards passed");
    return;
  }
  console.log("[node-test-shards:failed]");
  for (const result of failed) {
    console.log(
      `- ${result.id}: npm run test:node:raw:sharded -- --shard ${result.id}`,
    );
  }
}

async function main() {
  const parsed = parseArgs(process.argv.slice(2));
  const allTestFiles = await collectTestFiles();
  const { byShard, unassigned } = buildShardFileMap(allTestFiles);
  if (parsed.listShards) {
    printShardList({ byShard, unassigned });
    process.exit(unassigned.length > 0 ? 1 : 0);
  }
  if (unassigned.length > 0) {
    printShardList({ byShard, unassigned });
    console.error("[node-test-shards:error] some test files are not assigned");
    process.exit(1);
  }
  const selectedShards = parsed.shardId
    ? SHARDS.filter((shard) => shard.id === parsed.shardId)
    : SHARDS;
  if (parsed.shardId && selectedShards.length === 0) {
    printShardList({ byShard, unassigned });
    console.error(`[node-test-shards:error] unknown shard: ${parsed.shardId}`);
    process.exit(1);
  }
  const shardDataRoot = resolveShardDataRoot();
  const results: ShardRunResult[] = [];
  for (const shard of selectedShards) {
    const files = byShard.get(shard.id) || [];
    if (files.length === 0) {
      console.log(`[node-test-shard:skip] ${shard.id} has no files`);
      results.push({
        id: shard.id,
        fileCount: 0,
        exitCode: 0,
        durationMs: 0,
        command: "",
      });
      continue;
    }
    results.push(
      await runShard({
        shard,
        files,
        mochaArgs: parsed.mochaArgs,
        shardDataRoot,
      }),
    );
  }
  printSummary(results);
  process.exit(results.some((result) => result.exitCode !== 0) ? 1 : 0);
}

void main();
