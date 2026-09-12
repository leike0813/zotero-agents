import { readdir } from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import os from "node:os";
import { pathToFileURL } from "node:url";
import {
  resolveSynthesisNativeStage1Suite,
  SYNTHESIS_NATIVE_STAGE1_SUITE_ID,
} from "./synthesis/synthesis-native-stage1-suite";

type ShardId =
  | "acp-session"
  | "acp-skill-run"
  | "acp-runtime"
  | "assistant"
  | "dashboard"
  | "host-bridge-runtime"
  | "host-bridge-surface-release"
  | "runtime-platform-persistence"
  | "runtime-provider-registry"
  | "runtime-provider-execution"
  | "runtime-provider-products"
  | "runtime-task-queue"
  | "shared"
  | "skillrunner-runtime"
  | "skillrunner-surface-release"
  | "synthesis-engine"
  | "synthesis-application"
  | "synthesis-workbench"
  | "tooling-runtime"
  | "tooling-content-release"
  | "tooling-deep-reading"
  | "ui"
  | "workflow-engine"
  | "workflow-host"
  | "workflow-packages-literature"
  | "workflow-packages-workbench"
  | "workflow-packages-tags"
  | "zotero-host";

type DomainId =
  | "acp"
  | "assistant"
  | "dashboard"
  | "host-bridge"
  | "runtime"
  | "skillrunner"
  | "synthesis"
  | "tooling"
  | "ui"
  | "workflow"
  | "zotero-host";

type ShardDefinition = {
  id: ShardId;
  domain: DomainId;
  label: string;
  select: (filePath: string) => boolean;
  setupFiles?: string[];
};

type ParsedArgs = {
  listShards: boolean;
  shardId: string;
  domainId: string;
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
const TEST_SETUP_FILE = "tests/setup/zotero-mock.ts";
const COMMON_SETUP_FILES: string[] = [];
const SYNTHESIS_NATIVE_FILE_NUMBERS = new Set([
  ...Array.from({ length: 17 }, (_, index) => 175 + index),
  193,
  218,
  220,
  222,
  225,
  226,
  ...Array.from({ length: 12 }, (_, index) => 228 + index),
]);

function inDirectory(filePath: string, directory: string) {
  return (
    filePath.startsWith(`tests/${directory}/`) && filePath.endsWith(".test.ts")
  );
}

function testNumber(filePath: string) {
  return Number(path.basename(filePath).match(/^\d+/)?.[0] || 0);
}

function isSynthesisNativeStage1File(filePath: string) {
  return (
    inDirectory(filePath, "synthesis") &&
    path.basename(filePath).includes("-synthesis-") &&
    SYNTHESIS_NATIVE_FILE_NUMBERS.has(testNumber(filePath))
  );
}

const SHARDS: ShardDefinition[] = [
  {
    id: "acp-session",
    domain: "acp",
    label: "ACP session",
    select: (filePath) =>
      inDirectory(filePath, "acp") && /^96-acp-/.test(path.basename(filePath)),
  },
  {
    id: "acp-skill-run",
    domain: "acp",
    label: "ACP skill run",
    select: (filePath) =>
      inDirectory(filePath, "acp") &&
      /(?:skill-run|skillrunner|concurrent-submission)/.test(
        path.basename(filePath),
      ),
  },
  {
    id: "acp-runtime",
    domain: "acp",
    label: "ACP runtime and transport",
    select: (filePath) =>
      inDirectory(filePath, "acp") &&
      !/^96-acp-/.test(path.basename(filePath)) &&
      !/(?:skill-run|skillrunner|concurrent-submission)/.test(
        path.basename(filePath),
      ),
  },
  {
    id: "assistant",
    domain: "assistant",
    label: "Assistant Workspace",
    select: (filePath) => inDirectory(filePath, "assistant"),
  },
  {
    id: "dashboard",
    domain: "dashboard",
    label: "Dashboard",
    select: (filePath) => inDirectory(filePath, "dashboard"),
  },
  {
    id: "host-bridge-runtime",
    domain: "host-bridge",
    label: "Host Bridge runtime",
    select: (filePath) =>
      inDirectory(filePath, "host-bridge") && testNumber(filePath) < 139,
  },
  {
    id: "host-bridge-surface-release",
    domain: "host-bridge",
    label: "Host Bridge surfaces and release",
    select: (filePath) =>
      inDirectory(filePath, "host-bridge") && testNumber(filePath) >= 139,
  },
  {
    id: "runtime-platform-persistence",
    domain: "runtime",
    label: "Runtime platform and persistence",
    select: (filePath) =>
      inDirectory(filePath, "runtime") &&
      /^(?:108-runtime-persistence|164-runtime-platform|184-runtime-file-transfer|186-runtime-file-range|189-runtime-tree|239-runtime-host|45-runtime-log|52-runtime-bridge|97-runtime-diagnostics)/.test(
        path.basename(filePath),
      ),
  },
  {
    id: "runtime-provider-registry",
    domain: "runtime",
    label: "Runtime provider registry",
    select: (filePath) =>
      inDirectory(filePath, "runtime") &&
      /^(?:33-provider|57-backend-manager|181-provider-profile)/.test(
        path.basename(filePath),
      ),
  },
  {
    id: "runtime-provider-execution",
    domain: "runtime",
    label: "Runtime provider execution",
    select: (filePath) =>
      inDirectory(filePath, "runtime") &&
      /^(?:34-generic-http|37-pass-through|38-generic-http)/.test(
        path.basename(filePath),
      ),
  },
  {
    id: "runtime-provider-products",
    domain: "runtime",
    label: "Runtime provider products",
    select: (filePath) =>
      inDirectory(filePath, "runtime") &&
      /^(?:172-export-research|173-collection-collector|192-literature-search)/.test(
        path.basename(filePath),
      ),
  },
  {
    id: "runtime-task-queue",
    domain: "runtime",
    label: "Runtime task and queue",
    select: (filePath) =>
      inDirectory(filePath, "runtime") &&
      /(?:task|queue|job-queue)/.test(path.basename(filePath)),
  },
  {
    id: "skillrunner-runtime",
    domain: "skillrunner",
    label: "SkillRunner runtime",
    select: (filePath) =>
      inDirectory(filePath, "skillrunner") && testNumber(filePath) < 165,
  },
  {
    id: "skillrunner-surface-release",
    domain: "skillrunner",
    label: "SkillRunner surfaces and release",
    select: (filePath) =>
      inDirectory(filePath, "skillrunner") && testNumber(filePath) >= 165,
  },
  {
    id: "synthesis-engine",
    domain: "synthesis",
    label: "Synthesis engine",
    select: (filePath) =>
      inDirectory(filePath, "synthesis") &&
      !isSynthesisNativeStage1File(filePath) &&
      /(?:engine|matcher|graph|artifact|benchmark)/.test(
        path.basename(filePath),
      ),
  },
  {
    id: "synthesis-application",
    domain: "synthesis",
    label: "Synthesis application",
    select: (filePath) =>
      inDirectory(filePath, "synthesis") &&
      !isSynthesisNativeStage1File(filePath) &&
      !/(?:engine|matcher|graph|artifact|benchmark)/.test(
        path.basename(filePath),
      ) &&
      testNumber(filePath) < 246,
  },
  {
    id: "synthesis-workbench",
    domain: "synthesis",
    label: "Synthesis workbench",
    select: (filePath) =>
      inDirectory(filePath, "synthesis") &&
      !isSynthesisNativeStage1File(filePath) &&
      !/(?:engine|matcher|graph|artifact|benchmark)/.test(
        path.basename(filePath),
      ) &&
      testNumber(filePath) >= 246,
  },
  {
    id: "tooling-deep-reading",
    domain: "tooling",
    label: "Deep-reading tooling",
    select: (filePath) =>
      filePath ===
      "tests/tooling/157-literature-deep-reading-bootstrap.test.ts",
  },
  {
    id: "tooling-content-release",
    domain: "tooling",
    label: "Content and release contracts",
    select: (filePath) =>
      inDirectory(filePath, "tooling") &&
      /(?:content-package|bundled-help|bundle-artifact|docs-url|release-coordinator|skill-contract|artifact-contract|literature-score|citation-report)/.test(
        path.basename(filePath),
      ),
  },
  {
    id: "tooling-runtime",
    domain: "tooling",
    label: "Tooling runtime",
    select: (filePath) =>
      inDirectory(filePath, "tooling") &&
      filePath !==
        "tests/tooling/157-literature-deep-reading-bootstrap.test.ts" &&
      !/(?:content-package|bundled-help|bundle-artifact|docs-url|release-coordinator|skill-contract|artifact-contract|literature-score|citation-report)/.test(
        path.basename(filePath),
      ),
  },
  {
    id: "ui",
    domain: "ui",
    label: "UI tests",
    select: (filePath) =>
      filePath.startsWith("tests/ui/") && filePath.endsWith(".test.ts"),
  },
  {
    id: "shared",
    domain: "ui",
    label: "Shared page primitives",
    select: (filePath) => inDirectory(filePath, "shared"),
  },
  {
    id: "workflow-engine",
    domain: "workflow",
    label: "Workflow engine",
    select: (filePath) =>
      inDirectory(filePath, "workflows") &&
      !/(?:host|input-materialization|note-image|stored-attachment|archive|input-planning)/.test(
        path.basename(filePath),
      ),
  },
  {
    id: "workflow-host",
    domain: "workflow",
    label: "Workflow Host adapters",
    select: (filePath) =>
      inDirectory(filePath, "workflows") &&
      /(?:host|input-materialization|note-image|stored-attachment|archive|input-planning)/.test(
        path.basename(filePath),
      ),
  },
  {
    id: "workflow-packages-literature",
    domain: "workflow",
    label: "Literature workflow packages",
    select: (filePath) =>
      /^tests\/workflow-(?:literature-(?!workbench)|mineru\/)/.test(filePath) &&
      filePath.endsWith(".test.ts"),
  },
  {
    id: "workflow-packages-workbench",
    domain: "workflow",
    label: "Literature workbench package",
    select: (filePath) =>
      filePath.startsWith("tests/workflow-literature-workbench-package/") &&
      filePath.endsWith(".test.ts"),
  },
  {
    id: "workflow-packages-tags",
    domain: "workflow",
    label: "Tag workflow packages",
    select: (filePath) =>
      filePath.startsWith("tests/workflow-tag-") &&
      filePath.endsWith(".test.ts"),
  },
  {
    id: "zotero-host",
    domain: "zotero-host",
    label: "Zotero host contracts",
    select: (filePath) => inDirectory(filePath, "zotero-host"),
  },
];

function normalizeTestPath(filePath: string) {
  return filePath.replace(/\\/g, "/");
}

async function collectTestFiles(dir = "tests"): Promise<string[]> {
  const absoluteDir = path.join(PROJECT_ROOT, dir);
  const entries = await readdir(absoluteDir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const relativePath = normalizeTestPath(path.join(dir, entry.name));
    if (
      relativePath === "tests/zotero" ||
      relativePath.startsWith("tests/zotero/")
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
  let domainId = "";
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
    if (arg === "--domain") {
      domainId = args[index + 1] || "";
      index += 1;
      continue;
    }
    if (arg.startsWith("--domain=")) {
      domainId = arg.slice("--domain=".length);
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
  return { listShards, shardId, domainId, suiteId, mochaArgs };
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

const ANSI_ESCAPE = String.fromCharCode(27);
const ANSI_ESCAPE_RE = new RegExp(`${ANSI_ESCAPE}\\[[0-?]*[ -/]*[@-~]`, "g");
const MOCHA_FAILURE_SUMMARY_RE = /^\d+\s+failing$/;

export function extractMochaFailureOutput(output: string) {
  const lines = output.split(/\r?\n/);
  const failureStart = lines.findIndex((line) =>
    MOCHA_FAILURE_SUMMARY_RE.test(line.replace(ANSI_ESCAPE_RE, "").trim()),
  );
  if (failureStart < 0) {
    return output.trimEnd();
  }
  return lines.slice(failureStart).join("\n").trimEnd();
}

export function buildShardEnv(
  shardId: string,
  shardDataRoot: string,
  env: NodeJS.ProcessEnv = process.env,
) {
  return {
    ...env,
    FORCE_COLOR: env.FORCE_COLOR ?? "1",
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
  const regularTestFiles = allTestFiles.filter(
    (filePath) => !isSynthesisNativeStage1File(filePath),
  );
  const byShard = new Map<ShardId, string[]>();
  const assignments = new Map<string, ShardId[]>();
  for (const shard of SHARDS) {
    const selected = regularTestFiles
      .filter((filePath) => shard.select(filePath))
      .sort((left, right) => left.localeCompare(right));
    byShard.set(shard.id, selected);
    for (const filePath of selected) {
      assignments.set(filePath, [
        ...(assignments.get(filePath) || []),
        shard.id,
      ]);
    }
  }
  const unassigned = regularTestFiles
    .filter((filePath) => !assignments.has(filePath))
    .sort();
  const duplicates = Array.from(assignments)
    .filter(([, shardIds]) => shardIds.length > 1)
    .sort(([left], [right]) => left.localeCompare(right));
  return { byShard, unassigned, duplicates };
}

function printShardList(args: {
  byShard: Map<ShardId, string[]>;
  unassigned: string[];
  duplicates: Array<[string, ShardId[]]>;
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
  if (args.duplicates.length > 0) {
    console.log(`- duplicate assignments: ${args.duplicates.length} files`);
    for (const [filePath, shardIds] of args.duplicates) {
      console.log(`  ${filePath}: ${shardIds.join(", ")}`);
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
    const output = extractMochaFailureOutput(result.output);
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
    if (parsed.domainId || parsed.shardId || parsed.listShards) {
      console.error(
        "[node-test-shards:error] --suite cannot be combined with --domain, --shard or --list-shards",
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
          setupFiles: COMMON_SETUP_FILES,
        },
        files: segment.files,
      })),
      mochaArgs: parsed.mochaArgs,
      rerunCommand: () => `npm run test:synthesis-native:stage1`,
    });
  }
  const { byShard, unassigned, duplicates } = buildShardFileMap(allTestFiles);
  if (parsed.listShards) {
    printShardList({ byShard, unassigned, duplicates });
    return unassigned.length > 0 || duplicates.length > 0 ? 1 : 0;
  }
  if (unassigned.length > 0 || duplicates.length > 0) {
    printShardList({ byShard, unassigned, duplicates });
    console.error("[node-test-shards:error] test ownership is invalid");
    return 1;
  }
  if (parsed.shardId && parsed.domainId) {
    console.error(
      "[node-test-shards:error] --domain and --shard are mutually exclusive",
    );
    return 1;
  }
  const selectedShards = parsed.shardId
    ? SHARDS.filter((shard) => shard.id === parsed.shardId)
    : parsed.domainId
      ? SHARDS.filter((shard) => shard.domain === parsed.domainId)
      : SHARDS;
  if (parsed.shardId && selectedShards.length === 0) {
    printShardList({ byShard, unassigned, duplicates });
    console.error(`[node-test-shards:error] unknown shard: ${parsed.shardId}`);
    return 1;
  }
  if (parsed.domainId && selectedShards.length === 0) {
    printShardList({ byShard, unassigned, duplicates });
    console.error(
      `[node-test-shards:error] unknown domain: ${parsed.domainId}`,
    );
    return 1;
  }
  return runSelectedShards({
    runs: selectedShards.map((shard) => ({
      definition: shard,
      files: byShard.get(shard.id) || [],
    })),
    mochaArgs: parsed.mochaArgs,
    rerunCommand: (result) => `npm run test:node -- --shard ${result.id}`,
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
