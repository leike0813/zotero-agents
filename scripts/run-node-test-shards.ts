import {
  readdir,
  appendFile,
  mkdir,
  mkdtemp,
  cp,
  readFile,
  stat,
} from "node:fs/promises";
import { realpathSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { pathToFileURL } from "node:url";
import {
  readMochaReport,
  runLoggedProcess,
  writeTestResult,
  type TestResult,
  TestRunReport,
} from "./test-run-report";
import { runBoundedTests, testWorkerCount } from "./test-scheduler";
import { writeProfileMetadata, writeTestProfile } from "./test-profile";
import {
  isSynthesisNativeStage1File,
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
  mockZotero?: boolean;
};

type ParsedArgs = {
  listShards: boolean;
  shardId: string;
  domainId: string;
  suiteId: string;
  mochaArgs: string[];
  jobs: number;
  profile: boolean;
};

type ShardRunResult = {
  id: string;
  exitCode: number;
  durationMs: number;
  command: string;
  evidenceSizes?: Record<string, number>;
};

const PROJECT_ROOT = process.cwd();
const TEST_SETUP_FILE = "tests/setup/zotero-mock.ts";
const priorDurations = new Map<string, number>();
for (const root of ["npm-test", "node"]) {
  try {
    const directory = path.resolve("artifacts/test-diagnostics", root);
    // The outer gate has already moved latest.json to its still-empty run.
    for (const name of readdirSync(directory, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort()
      .reverse()) {
      let previous;
      try {
        previous = JSON.parse(
          readFileSync(path.join(directory, name, "summary.json"), "utf8"),
        );
      } catch {
        continue;
      }
      if (!previous.finishedAt || !previous.children?.length) continue;
      for (const result of previous.children)
        if (result.status === "passed")
          priorDurations.set(result.label, result.durationMs);
      break;
    }
  } catch {
    /* New workspaces schedule by file count. */
  }
}

function inDirectory(filePath: string, directory: string) {
  return (
    filePath.startsWith(`tests/${directory}/`) && filePath.endsWith(".test.ts")
  );
}

function testNumber(filePath: string) {
  return Number(path.basename(filePath).match(/^\d+/)?.[0] || 0);
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
      /^(?:108-runtime-persistence|164-runtime-platform|184-runtime-file-transfer|186-runtime-file-range|189-runtime-tree|239-runtime-host|45-runtime-log|52-runtime-bridge|97-runtime-diagnostics|windows-graphics-runtime|zip-store)/.test(
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
    mockZotero: false,
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
    mockZotero: false,
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
  let jobs = testWorkerCount(process.env.ZOTERO_TEST_JOBS);
  let profile = false;
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--profile") {
      profile = true;
      continue;
    }
    if (arg === "--jobs") {
      jobs = testWorkerCount(args[++index] || "");
      continue;
    }
    if (arg.startsWith("--jobs=")) {
      jobs = testWorkerCount(arg.slice(7));
      continue;
    }
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
  return { listShards, shardId, domainId, suiteId, mochaArgs, jobs, profile };
}

function hasMochaExitFlag(args: string[]) {
  return args.some((arg) => arg === "--exit" || arg === "--no-exit");
}

function buildMochaArgs(
  files: string[],
  forwardedArgs: string[],
  mockZotero = true,
) {
  const args = [
    "node_modules/mocha/bin/mocha",
    ...files,
    ...(mockZotero ? ["--require", TEST_SETUP_FILE] : []),
    "--timeout",
    "10000",
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
    realpathSync.native(os.tmpdir()),
    `zotero-agents-node-test-shards-${process.pid}`,
  );
}

export async function mergeNativeEvidence(
  sourceRoot: string,
  targetRoot: string,
  inheritedSizes: Record<string, number>,
) {
  const marker = JSON.parse(
    await readFile(path.join(sourceRoot, "verified.json"), "utf8"),
  );
  if (typeof marker.identity !== "string" || !marker.identity)
    throw new Error("native_evidence_verification_missing");
  for (const kind of ["execution", "observations"]) {
    const source = path.join(sourceRoot, kind);
    const target = path.join(targetRoot, kind);
    await mkdir(target, { recursive: true });
    for (const name of await readdir(source).catch(() => [] as string[])) {
      if (name !== `${marker.identity}.jsonl`) continue;
      const bytes = await readFile(path.join(source, name));
      const inherited = inheritedSizes[path.join(kind, name)] || 0;
      if (bytes.length < inherited)
        throw new Error("native_evidence_truncated");
      await appendFile(path.join(target, name), bytes.subarray(inherited));
    }
  }
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
  const tempRoot = realpathSync.native(os.tmpdir());
  return {
    ...env,
    TMPDIR: tempRoot,
    TEMP: tempRoot,
    TMP: tempRoot,
    FORCE_COLOR: env.FORCE_COLOR ?? "1",
    ZOTERO_TEST_DATA_DIR: path.join(shardDataRoot, shardId, "Zotero_data"),
    ZOTERO_TEST_DATA_DIR_MANAGED: "1",
  };
}

async function runShard(args: {
  shard: Pick<ShardDefinition, "label" | "mockZotero"> & {
    id: string;
  };
  files: string[];
  mochaArgs: string[];
  shardDataRoot: string;
  signal?: AbortSignal;
}): Promise<ShardRunResult> {
  const allFiles = uniquePaths(args.files);
  const mochaArgs = buildMochaArgs(
    allFiles,
    args.mochaArgs,
    args.shard.mockZotero,
  );
  const native = args.shard.id.startsWith("synthesis-native-stage1");
  if (native)
    mochaArgs.push(
      "--require",
      path.resolve("scripts/synthesis/native-test-scope.ts"),
    );
  const command = formatCommand(mochaArgs);
  const startedAt = Date.now();
  const shardEnv = buildShardEnv(args.shard.id, args.shardDataRoot);
  const evidenceSizes: Record<string, number> = {};
  // tsx creates a Unix socket beneath TMPDIR; native file labels exceed sun_path.
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), "zs-test-"));
  Object.assign(shardEnv, {
    TMPDIR: tempRoot,
    TEMP: tempRoot,
    TMP: tempRoot,
    ZOTERO_TEST_DATA_DIR: path.join(tempRoot, "Zotero_data"),
  });
  Object.assign(shardEnv, {
    ZOTERO_TEST_SHARED_CACHE_DIR: realpathSync.native(os.tmpdir()),
  });
  if (native && process.env.ZOTERO_SYNTHESIS_PROTOCOL_EVIDENCE_DIR) {
    const evidence = path.join(args.shardDataRoot, args.shard.id, "evidence");
    await cp(process.env.ZOTERO_SYNTHESIS_PROTOCOL_EVIDENCE_DIR, evidence, {
      recursive: true,
    });
    for (const kind of ["execution", "observations"])
      for (const name of await readdir(path.join(evidence, kind)).catch(
        () => [] as string[],
      ))
        evidenceSizes[path.join(kind, name)] = (
          await stat(path.join(evidence, kind, name))
        ).size;
    shardEnv.ZOTERO_SYNTHESIS_PROTOCOL_EVIDENCE_DIR = evidence;
  }
  const reportDirectory = process.env.ZOTERO_TEST_REPORT_DIR;
  if (reportDirectory) {
    // The shard owns reporting; nested runner tests must not join this run.
    const mochaEnv: NodeJS.ProcessEnv = { ...shardEnv };
    delete mochaEnv.ZOTERO_TEST_REPORT_DIR;
    delete mochaEnv.ZOTERO_TEST_REPORT_SCOPE;
    delete mochaEnv.ZOTERO_TEST_REPORT_EVENT_URL;
    const id = `${process.env.ZOTERO_TEST_REPORT_SCOPE || "node"}--${args.shard.id}`;
    mochaEnv.ZOTERO_TEST_PROFILE_SCOPE = id;
    const log = path.join(reportDirectory, "logs", `${id}.log`);
    const evidencePath = path.join(
      reportDirectory,
      "results",
      `${id}.mocha.json`,
    );
    const result: TestResult = {
      id,
      label: args.shard.id,
      status: "failed",
      exitCode: 1,
      durationMs: 0,
      command,
      log,
    };
    try {
      result.exitCode = (
        await runLoggedProcess(
          process.execPath,
          [
            resolveTsxCliEntry(),
            ...mochaArgs,
            "--reporter",
            process.env.ZOTERO_TEST_PROFILE_DIR
              ? path.resolve("scripts/test-profile-reporter.cjs")
              : "json",
            "--reporter-option",
            `output=${evidencePath}`,
          ],
          { log, env: mochaEnv, signal: args.signal },
        )
      ).exitCode;
      const evidence = await readMochaReport(evidencePath);
      Object.assign(result, evidence);
      if (evidence.failures.length) result.exitCode ||= 1;
      if (native && shardEnv.ZOTERO_SYNTHESIS_PROTOCOL_EVIDENCE_DIR) {
        await readFile(
          path.join(
            shardEnv.ZOTERO_SYNTHESIS_PROTOCOL_EVIDENCE_DIR,
            "verified.json",
          ),
        );
      }
      result.status = args.signal?.aborted
        ? "incomplete"
        : result.exitCode
          ? "failed"
          : "passed";
    } catch (error) {
      result.exitCode ||= 1;
      result.status = "incomplete";
      await appendFile(
        log,
        `\n${error instanceof Error ? error.stack : error}\n`,
      ).catch(() => undefined);
    }
    result.durationMs = Date.now() - startedAt;
    try {
      await writeTestResult(reportDirectory, result);
    } catch (error) {
      result.exitCode ||= 1;
      console.error(error);
    }
    return {
      id: args.shard.id,
      exitCode: args.signal?.aborted ? 130 : result.exitCode,
      durationMs: result.durationMs,
      command,
      evidenceSizes,
    };
  }
  throw new Error("test_report_context_missing");
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

async function runSelectedShards(args: {
  runs: Array<{
    definition: Pick<ShardDefinition, "label" | "mockZotero"> & {
      id: string;
    };
    files: string[];
  }>;
  mochaArgs: string[];
  jobs: number;
}) {
  const shardDataRoot = resolveShardDataRoot();
  const controller = new AbortController();
  const interrupt = () => controller.abort();
  process.on("SIGINT", interrupt);
  process.on("SIGTERM", interrupt);
  let results: Array<ShardRunResult | undefined>;
  try {
    const ordered = args.runs.map((run, index) => ({ run, index }));
    if (args.jobs > 1)
      ordered.sort(
        (a, b) =>
          (priorDurations.get(b.run.definition.id) ||
            b.run.files.length * 1000) -
          (priorDurations.get(a.run.definition.id) ||
            a.run.files.length * 1000),
      );
    const scheduled = await runBoundedTests(
      ordered,
      args.jobs,
      async ({ run }) => {
        if (run.files.length === 0) {
          console.log(
            `[node-test-shard:skip] ${run.definition.id} has no files`,
          );
          const empty = {
            id: run.definition.id,
            exitCode: process.env.ZOTERO_TEST_REPORT_DIR ? 1 : 0,
            durationMs: 0,
            command: "",
          };
          if (process.env.ZOTERO_TEST_REPORT_DIR)
            await writeTestResult(process.env.ZOTERO_TEST_REPORT_DIR, {
              id: `${process.env.ZOTERO_TEST_REPORT_SCOPE || "node"}--${run.definition.id}`,
              label: run.definition.id,
              status: "incomplete",
              exitCode: 1,
              durationMs: 0,
              command: "",
            });
          return empty;
        }
        try {
          return await runShard({
            shard: run.definition,
            files: run.files,
            mochaArgs: args.mochaArgs,
            shardDataRoot,
            signal: controller.signal,
          });
        } catch (error) {
          const failed: ShardRunResult = {
            id: run.definition.id,
            exitCode: 1,
            durationMs: 0,
            command: "",
          };
          if (process.env.ZOTERO_TEST_REPORT_DIR)
            await writeTestResult(process.env.ZOTERO_TEST_REPORT_DIR, {
              id: `${process.env.ZOTERO_TEST_REPORT_SCOPE || "node"}--${run.definition.id}`,
              label: run.definition.id,
              status: "incomplete",
              exitCode: 1,
              durationMs: 0,
              command: "",
              failures: [
                { title: "shard preparation", message: String(error) },
              ],
            });
          return failed;
        }
      },
      controller.signal,
    );
    results = Array(args.runs.length).fill(undefined);
    for (const [index, entry] of ordered.entries())
      results[entry.index] = scheduled[index];
    if (controller.signal.aborted) {
      for (const [index, result] of results.entries())
        if (!result && process.env.ZOTERO_TEST_REPORT_DIR)
          await writeTestResult(process.env.ZOTERO_TEST_REPORT_DIR, {
            id: `${process.env.ZOTERO_TEST_REPORT_SCOPE || "node"}--${args.runs[index].definition.id}`,
            label: args.runs[index].definition.id,
            status: "incomplete",
            exitCode: 130,
            durationMs: 0,
            command: "",
          });
      return 130;
    }
    const completed = results.filter((result): result is ShardRunResult =>
      Boolean(result),
    );
    const nativeEvidence = process.env.ZOTERO_SYNTHESIS_PROTOCOL_EVIDENCE_DIR;
    if (nativeEvidence)
      for (const result of completed) {
        if (controller.signal.aborted) return 130;
        if (result.exitCode || !result.id.startsWith("synthesis-native-stage1"))
          continue;
        try {
          await mergeNativeEvidence(
            path.join(shardDataRoot, result.id, "evidence"),
            nativeEvidence,
            result.evidenceSizes || {},
          );
        } catch (error) {
          result.exitCode ||= 1;
          if (process.env.ZOTERO_TEST_REPORT_DIR)
            await writeTestResult(process.env.ZOTERO_TEST_REPORT_DIR, {
              id: `${process.env.ZOTERO_TEST_REPORT_SCOPE || "node"}--${result.id}`,
              label: result.id,
              status: "incomplete",
              exitCode: result.exitCode,
              durationMs: result.durationMs,
              command: result.command,
              failures: [
                { title: "native evidence merge", message: String(error) },
              ],
            });
        }
      }
    return controller.signal.aborted
      ? 130
      : completed.find((result) => result.exitCode !== 0)?.exitCode || 0;
  } finally {
    process.removeListener("SIGINT", interrupt);
    process.removeListener("SIGTERM", interrupt);
  }
}

async function runMain(cliArgs = process.argv.slice(2)) {
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
    process.env.ZOTERO_SYNTHESIS_PROTOCOL_EVIDENCE_DIR ||= await mkdtemp(
      path.join(os.tmpdir(), "zs-native-evidence-"),
    );
    const runs = suite.segments
      .flatMap((segment) => {
        if (segment.id !== "synthesis-native-stage1-production")
          return [segment];
        const count = Math.min(parsed.jobs, segment.files.length);
        return Array.from({ length: count }, (_, index) => ({
          ...segment,
          id: `${segment.id}-${index + 1}`,
          files: segment.files.filter(
            (_, fileIndex) => fileIndex % count === index,
          ),
        }));
      })
      .map((segment) => ({
        definition: {
          id: segment.id,
          label: segment.label,
        },
        files: segment.files,
      }));
    const producerRuns = runs.filter((run) =>
      run.definition.id.endsWith("workflow-producers"),
    );
    const code = await runSelectedShards({
      runs: runs.filter((run) => !producerRuns.includes(run)),
      mochaArgs: parsed.mochaArgs,
      jobs: parsed.jobs,
    });
    if (code === 130) return code;
    const producerCode = await runSelectedShards({
      runs: producerRuns,
      mochaArgs: parsed.mochaArgs,
      jobs: 1,
    });
    return code || producerCode;
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
    jobs: parsed.jobs,
  });
}

async function main(cliArgs = process.argv.slice(2)) {
  const parsed = parseArgs(cliArgs);
  if (parsed.listShards || process.env.ZOTERO_TEST_REPORT_DIR)
    return runMain(cliArgs);
  const report = await TestRunReport.create(
    path.resolve("artifacts/test-diagnostics/node"),
  );
  process.env.ZOTERO_TEST_REPORT_DIR = report.directory;
  process.env.ZOTERO_TEST_REPORT_SCOPE = parsed.suiteId
    ? "native-tests"
    : "test-node";
  if (parsed.profile) {
    process.env.ZOTERO_TEST_PROFILE_DIR = report.directory;
    writeProfileMetadata(report.directory, {
      jobs: parsed.jobs,
      suite: parsed.suiteId,
      domain: parsed.domainId,
      shard: parsed.shardId,
    });
  }
  console.log(`Node tests · ${parsed.jobs} workers · ${report.directory}`);
  const code = await runMain(cliArgs);
  await report.finish(code);
  if (parsed.profile) writeTestProfile(report.directory);
  console.log(report.chart());
  return code;
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  void main().then((exitCode) => {
    process.exit(exitCode);
  });
}
