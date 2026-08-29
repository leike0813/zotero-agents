import { readdir } from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import os from "node:os";
import { pathToFileURL } from "node:url";
import {
  resolveSynthesisNativeStage1Suite,
  SYNTHESIS_NATIVE_STAGE1_SUITE_ID,
} from "./synthesis-native-stage1-suite";

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
  suiteId: string;
  mochaArgs: string[];
};

type ShardRunResult = {
  id: string;
  fileCount: number;
  exitCode: number;
  durationMs: number;
  command: string;
  output: string;
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
  let suiteId = "";
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
    if (arg === "--suite") {
      suiteId = args[index + 1] || "";
      index += 1;
      continue;
    }
    if (arg.startsWith("--suite=")) {
      suiteId = arg.slice("--suite=".length);
      continue;
    }
    mochaArgs.push(arg);
  }
  return { listShards, shardId, suiteId, mochaArgs };
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

function buildShardEnv(shardId: string, shardDataRoot: string) {
  return {
    ...process.env,
    ZOTERO_TEST_DATA_DIR: path.join(shardDataRoot, shardId, "Zotero_data"),
    ZOTERO_TEST_DATA_DIR_MANAGED: "1",
  };
}

function runShard(args: {
  shard: Pick<ShardDefinition, "label" | "setupFiles"> & { id: string };
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
    const outputChunks: string[] = [];
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
        output: outputChunks.join(""),
      });
    };
    const child = spawn(
      process.execPath,
      [resolveTsxCliEntry(), ...mochaArgs],
      {
        cwd: PROJECT_ROOT,
        env: shardEnv,
        stdio: ["ignore", "pipe", "pipe"],
        windowsHide: true,
      },
    );
    child.stdout?.on("data", (chunk: Buffer) => {
      outputChunks.push(chunk.toString("utf8"));
    });
    child.stderr?.on("data", (chunk: Buffer) => {
      outputChunks.push(chunk.toString("utf8"));
    });
    child.on("error", (error) => {
      outputChunks.push(`[node-test-shard:error] ${args.shard.id}: ${error}\n`);
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

function printSummary(
  results: ShardRunResult[],
  rerunCommand?: (result: ShardRunResult) => string,
) {
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
    console.log(`- ${result.id}: ${rerunCommand?.(result) || ""}`);
  }
  console.log("");
  console.log("[node-test-shards:failed-output]");
  for (const result of failed) {
    console.log("");
    console.log(`[node-test-shard-output:start] ${result.id}`);
    console.log(`[node-test-shard-output:command] ${result.command}`);
    const output = result.output.trimEnd();
    if (output) {
      console.log(output);
    } else {
      console.log("(no output captured)");
    }
    console.log(`[node-test-shard-output:end] ${result.id}`);
  }
}

async function runSelectedShards(args: {
  runs: Array<{
    definition: Pick<ShardDefinition, "label" | "setupFiles"> & {
      id: string;
    };
    files: string[];
  }>;
  mochaArgs: string[];
  rerunCommand: (result: ShardRunResult) => string;
}) {
  const shardDataRoot = resolveShardDataRoot();
  const results: ShardRunResult[] = [];
  for (const run of args.runs) {
    if (run.files.length === 0) {
      console.log(`[node-test-shard:skip] ${run.definition.id} has no files`);
      results.push({
        id: run.definition.id,
        fileCount: 0,
        exitCode: 0,
        durationMs: 0,
        command: "",
        output: "",
      });
      continue;
    }
    results.push(
      await runShard({
        shard: run.definition,
        files: run.files,
        mochaArgs: args.mochaArgs,
        shardDataRoot,
      }),
    );
  }
  printSummary(results, args.rerunCommand);
  return results.some((result) => result.exitCode !== 0) ? 1 : 0;
}

async function main(cliArgs = process.argv.slice(2)) {
  const parsed = parseArgs(cliArgs);
  const allTestFiles = await collectTestFiles();
  if (parsed.suiteId) {
    if (parsed.shardId || parsed.listShards) {
      console.error(
        "[node-test-shards:error] --suite cannot be combined with --shard or --list-shards",
      );
      return 1;
    }
    if (parsed.suiteId !== SYNTHESIS_NATIVE_STAGE1_SUITE_ID) {
      console.error(
        `[node-test-shards:error] unknown suite: ${parsed.suiteId}`,
      );
      return 1;
    }
    let suite;
    try {
      suite = resolveSynthesisNativeStage1Suite(allTestFiles);
    } catch (error) {
      console.error(
        `[node-test-shards:error] ${error instanceof Error ? error.message : "suite_inventory_invalid"}`,
      );
      return 1;
    }
    console.log(`[node-test-suite] ${suite.id}: ${suite.files.length} files`);
    return runSelectedShards({
      runs: suite.segments.map((segment) => ({
        definition: {
          id: segment.id,
          label: segment.label,
          setupFiles: CORE_SETUP_FILES,
        },
        files: segment.files,
      })),
      mochaArgs: parsed.mochaArgs,
      rerunCommand: () => `npm run test:synthesis-native:stage1`,
    });
  }
  const { byShard, unassigned } = buildShardFileMap(allTestFiles);
  if (parsed.listShards) {
    printShardList({ byShard, unassigned });
    return unassigned.length > 0 ? 1 : 0;
  }
  if (unassigned.length > 0) {
    printShardList({ byShard, unassigned });
    console.error("[node-test-shards:error] some test files are not assigned");
    return 1;
  }
  const selectedShards = parsed.shardId
    ? SHARDS.filter((shard) => shard.id === parsed.shardId)
    : SHARDS;
  if (parsed.shardId && selectedShards.length === 0) {
    printShardList({ byShard, unassigned });
    console.error(`[node-test-shards:error] unknown shard: ${parsed.shardId}`);
    return 1;
  }
  return runSelectedShards({
    runs: selectedShards.map((shard) => ({
      definition: shard,
      files: byShard.get(shard.id) || [],
    })),
    mochaArgs: parsed.mochaArgs,
    rerunCommand: (result) =>
      `npm run test:node:raw:sharded -- --shard ${result.id}`,
  });
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  void main().then((exitCode) => {
    process.exit(exitCode);
  });
}
