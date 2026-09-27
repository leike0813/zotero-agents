import { spawn } from "child_process";
import { randomUUID } from "crypto";
import { chmodSync, mkdirSync, writeFileSync } from "fs";
import { cp, mkdir, mkdtemp, readFile, rm } from "fs/promises";
import os from "os";
import path from "path";
import { pathToFileURL } from "url";
import { isTruthyDiagnosticFlag } from "../src/modules/diagnosticVerbosity";
import pkg from "../package.json";
import { applyZoteroTestHeadlessEnvironment } from "../zotero-plugin.config";
import {
  readFixtureRegistry,
  validateCommittedSeed,
} from "./system-e2e/fixture";
import {
  createRunManifestEventCollector,
  persistRunManifest,
  publishRunManifestReference,
  startSystemE2EEventSink,
} from "./system-e2e/manifest";
import { resolveCurrentHostBridgeCli } from "../tests/helpers/hostBridgeCliHarness";
import { persistCompatibilityHostFactsEvent } from "./zotero-compatibility-fixture";
import {
  startZoteroNativeCrashCapture,
  type ZoteroNativeCrashCapture,
} from "./zotero-native-crash-capture";

type Child = ReturnType<typeof spawn>;
type SpawnOptions = Parameters<typeof spawn>[2];

type WrappedTestInvocation = {
  targetScript: string;
  requestedMode: string;
  requestedDomain: string;
  targetTestArgs: string[];
  verbose: boolean;
};

const DEFAULT_MOCK_PORT = "0";
const DEFAULT_MOCK_HOST = "127.0.0.1";
const DEFAULT_ZOTERO_TARGET_SCRIPT = "test:zotero:cli";
const DEFAULT_NODE_TARGET_SCRIPT = "test:node:raw";
const DEFAULT_TEST_WORKFLOW_DIR = path.join(process.cwd(), "workflows_builtin");
const TEST_DATA_DIR_ENV = "ZOTERO_TEST_DATA_DIR";
const TEST_DATA_DIR_MANAGED_ENV = "ZOTERO_TEST_DATA_DIR_MANAGED";
const ZOTERO_STDERR_DRAIN_LAUNCHER = path.join(
  ".scaffold",
  "zotero-stderr-drain.sh",
);
const ZOTERO_STDERR_LOG = path.join(".scaffold", "zotero-stderr.log");
const SYSTEM_E2E_RESTART_KIND = "system-e2e-owner-restart-request";
const SYSTEM_E2E_SCAFFOLD_ROOT = path.resolve(".scaffold/test");

/**
 * The compatibility worker chdirs the scaffold into a run root and publishes
 * that run's data dir through `ZOTERO_TEST_DATA_DIR`; this wrapper keeps running
 * in the project root. Deriving the scaffold tree from the caller-provided data
 * dir is therefore the only way to watch the same admission checkpoint the
 * plugin writes and to snapshot the same scaffold the restart resumes from.
 * A wrapper-managed temp data dir has no scaffold tree of its own.
 */
export function resolveSystemE2EScaffoldRoot(
  env: NodeJS.ProcessEnv = process.env,
): string {
  if (env[TEST_DATA_DIR_MANAGED_ENV] !== "1") {
    const providedDataDir = String(env[TEST_DATA_DIR_ENV] || "").trim();
    if (providedDataDir) {
      return path.dirname(path.resolve(providedDataDir));
    }
  }
  return SYSTEM_E2E_SCAFFOLD_ROOT;
}

type SystemE2ERestartRequest = {
  caseId: "HB-03" | "AC-05" | "SR-02";
  operationId: string;
  processId: number;
};

const RESTART_OPERATION_IDS = {
  "HB-03": "system-e2e:hb:03",
  "AC-05": "system-e2e:ac:05",
  "SR-02": "system-e2e:sr:02",
} as const;

export function parseSystemE2ERestartRequest(
  event: unknown,
): SystemE2ERestartRequest | null {
  if (!event || typeof event !== "object") return null;
  const envelope = event as { type?: unknown; data?: unknown };
  if (
    envelope.type !== "debug" ||
    !envelope.data ||
    typeof envelope.data !== "object"
  ) {
    return null;
  }
  const data = envelope.data as Record<string, unknown>;
  const processId = Number(data.processId);
  const operationId = String(data.operationId || "").trim();
  if (
    data.kind !== SYSTEM_E2E_RESTART_KIND ||
    typeof data.caseId !== "string" ||
    !(data.caseId in RESTART_OPERATION_IDS) ||
    operationId !==
      RESTART_OPERATION_IDS[
        data.caseId as keyof typeof RESTART_OPERATION_IDS
      ] ||
    !Number.isInteger(processId) ||
    processId <= 1
  ) {
    return null;
  }
  return {
    caseId: data.caseId as SystemE2ERestartRequest["caseId"],
    operationId,
    processId,
  };
}

export function parseSystemE2EPeerRestartRequest(event: unknown) {
  if (!event || typeof event !== "object") return null;
  const envelope = event as { type?: unknown; data?: unknown };
  if (
    envelope.type !== "debug" ||
    !envelope.data ||
    typeof envelope.data !== "object"
  ) {
    return null;
  }
  const data = envelope.data as Record<string, unknown>;
  return data.kind === "system-e2e-peer-restart-request" &&
    data.caseId === "SR-03"
    ? { caseId: "SR-03" as const }
    : null;
}

export function buildSystemE2EResumeEnvironment(
  env: NodeJS.ProcessEnv,
  caseId: SystemE2ERestartRequest["caseId"],
  resumeRoot: string,
): NodeJS.ProcessEnv {
  return {
    ...env,
    ZOTERO_SYSTEM_E2E_RESUME_CASE: caseId,
    ZOTERO_SYSTEM_E2E_RESUME_ROOT: resumeRoot,
  };
}

export async function waitForSystemE2EAdmissionCheckpoint(args: {
  checkpointPath: string;
  operationId: string;
  timeoutMs?: number;
  pollIntervalMs?: number;
}) {
  const deadline = Date.now() + (args.timeoutMs || 120_000);
  while (Date.now() < deadline) {
    try {
      if (
        (await readFile(args.checkpointPath, "utf8")).trim() ===
        args.operationId
      ) {
        return "held" as const;
      }
    } catch {
      // The checkpoint appears only after durable admission.
    }
    await new Promise((resolve) =>
      setTimeout(resolve, args.pollIntervalMs || 2),
    );
  }
  throw new Error("system_e2e_restart_admission_timeout");
}

export function normalizeTestMode(value: string) {
  return value.trim().toLowerCase() === "full" ? "full" : "lite";
}

export function normalizeTestDomain(value: string) {
  const normalized = value.trim().toLowerCase();
  if (
    normalized === "core" ||
    normalized === "ui" ||
    normalized === "workflow" ||
    normalized === "e2e"
  ) {
    return normalized;
  }
  return "all";
}

export function parseWrappedTestInvocation(
  cliArgs: string[],
  env: NodeJS.ProcessEnv = process.env,
): WrappedTestInvocation {
  const targetScript =
    cliArgs[0] || env.ZOTERO_TEST_TARGET_SCRIPT || DEFAULT_ZOTERO_TARGET_SCRIPT;
  let modeArg = cliArgs[1];
  let domainArg = cliArgs[2];
  let targetTestArgs = cliArgs.slice(3);
  if (modeArg?.startsWith("-")) {
    modeArg = undefined;
    domainArg = undefined;
    targetTestArgs = cliArgs.slice(1);
  } else if (domainArg?.startsWith("-")) {
    domainArg = undefined;
    targetTestArgs = cliArgs.slice(2);
  }
  const verboseArgs = consumeWrapperVerboseArgs(targetTestArgs);
  const defaultMode = targetScript.startsWith("test:zotero")
    ? "lite"
    : normalizeTestMode(env.ZOTERO_TEST_MODE || "lite");
  const defaultDomain = targetScript.startsWith("test:zotero")
    ? "all"
    : normalizeTestDomain(env.ZOTERO_TEST_DOMAIN || "all");
  return {
    targetScript,
    requestedMode: modeArg || env.ZOTERO_TEST_MODE || defaultMode,
    requestedDomain: domainArg || env.ZOTERO_TEST_DOMAIN || defaultDomain,
    targetTestArgs: verboseArgs.args,
    verbose:
      verboseArgs.verbose || isTruthyDiagnosticFlag(env.ZOTERO_TEST_VERBOSE),
  };
}

function consumeWrapperVerboseArgs(args: string[]) {
  let verbose = false;
  const forwarded: string[] = [];
  for (const arg of args) {
    if (arg === "--verbose" || arg === "-v") {
      verbose = true;
      continue;
    }
    forwarded.push(arg);
  }
  return { args: forwarded, verbose };
}

export function isZoteroTargetScript(targetScript: string) {
  return /^test:zotero(?::|$)/.test(String(targetScript || "").trim());
}

export function isNodeMochaTargetScript(targetScript: string) {
  return /^test:node:raw(?::|$)/.test(String(targetScript || "").trim());
}

export function hasExplicitWatchFlag(args: string[]) {
  return args.some(
    (arg) =>
      arg === "--watch" || arg === "--no-watch" || arg === "--exit-on-finish",
  );
}

export function hasExplicitMochaExitFlag(args: string[]) {
  return args.some((arg) => arg === "--exit" || arg === "--no-exit");
}

export function buildForwardedTestArgs(
  targetScript: string,
  args: string[],
): string[] {
  if (isZoteroTargetScript(targetScript) && !hasExplicitWatchFlag(args)) {
    return [...args, "--no-watch"];
  }
  if (
    isNodeMochaTargetScript(targetScript) &&
    !hasExplicitMochaExitFlag(args)
  ) {
    return [...args, "--exit"];
  }
  return [...args];
}

function quoteForPosixShell(value: string) {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

function writeZoteroStderrDrainLauncher(
  launcherPath: string,
  content: string,
  logPath: string,
) {
  mkdirSync(path.dirname(launcherPath), { recursive: true });
  writeFileSync(logPath, "");
  writeFileSync(launcherPath, content, { mode: 0o755 });
  chmodSync(launcherPath, 0o755);
}

/**
 * The scaffold spawns Zotero with a piped stderr but only attaches a reader to
 * stdout (`spawn(path, args, { env })` followed by a stdout-only `data`
 * listener). Any stderr burst larger than the socket buffer therefore blocks the
 * Zotero main thread inside `write(2)` until the run is killed; Zotero 9/10
 * Linux froze that way during `SL-02` (`wchan = sock_alloc_send_pskb`, no CPU,
 * JS timers stopped). Launch Zotero through a shim that sends fd 2 to a file so
 * the pipe can never fill, and keep the log for post-run diagnosis.
 */
export function resolveZoteroStderrDrainLauncher(args: {
  binPath: string;
  root: string;
  platform: NodeJS.Platform;
  writeLauncher?: (
    launcherPath: string,
    content: string,
    logPath: string,
  ) => void;
}): string | undefined {
  // Windows cannot spawn a shell shim through `spawn(binaryPath, args)`.
  if (args.platform === "win32") {
    return undefined;
  }
  const launcherPath = path.resolve(args.root, ZOTERO_STDERR_DRAIN_LAUNCHER);
  if (path.resolve(args.binPath) === launcherPath) {
    return undefined;
  }
  const logPath = path.resolve(args.root, ZOTERO_STDERR_LOG);
  const content = [
    "#!/bin/sh",
    "# Generated by scripts/run-zotero-test-with-mock.ts.",
    "# The test scaffold never reads Zotero's piped stderr; redirecting it to a",
    "# file keeps a full pipe from blocking the Zotero main thread.",
    `exec ${quoteForPosixShell(args.binPath)} "$@" 2>>${quoteForPosixShell(logPath)}`,
    "",
  ].join("\n");
  (args.writeLauncher || writeZoteroStderrDrainLauncher)(
    launcherPath,
    content,
    logPath,
  );
  return launcherPath;
}

export function buildTestEnvironment(
  invocation: WrappedTestInvocation,
  env: NodeJS.ProcessEnv = process.env,
  deps: {
    platform?: NodeJS.Platform;
    root?: string;
    writeLauncher?: (
      launcherPath: string,
      content: string,
      logPath: string,
    ) => void;
  } = {},
): NodeJS.ProcessEnv {
  const testMode = normalizeTestMode(invocation.requestedMode);
  const testDomain = normalizeTestDomain(invocation.requestedDomain);
  const workflowDir = String(
    env.ZOTERO_TEST_WORKFLOW_DIR || DEFAULT_TEST_WORKFLOW_DIR,
  ).trim();
  const providedTestDataDir = String(env[TEST_DATA_DIR_ENV] || "").trim();
  const testDataDir =
    providedTestDataDir ||
    path.join(
      os.tmpdir(),
      `zotero-agents-test-data-${process.pid}`,
      "Zotero_data",
    );
  const nextEnv: NodeJS.ProcessEnv = {
    ...env,
    ZOTERO_TEST_MODE: testMode,
    ZOTERO_TEST_DOMAIN: testDomain,
    [TEST_DATA_DIR_ENV]: testDataDir,
    ...(testDomain === "e2e"
      ? { ZOTERO_SYSTEM_E2E_NODE_PATH: process.execPath }
      : {}),
  };
  if (
    testDomain === "e2e" &&
    String(env.ZOTERO_E2E_GOLD_DATA_DIR || "").trim()
  ) {
    nextEnv.ZOTERO_E2E_GOLD_ID =
      String(env.ZOTERO_E2E_GOLD_ID || "").trim() || "lisongtao-v1";
  }
  if (!providedTestDataDir) {
    nextEnv[TEST_DATA_DIR_MANAGED_ENV] = "1";
  }
  if (invocation.verbose) {
    nextEnv.ZOTERO_TEST_VERBOSE = "1";
  } else {
    delete nextEnv.ZOTERO_TEST_VERBOSE;
  }
  if (workflowDir) {
    nextEnv.ZOTERO_TEST_WORKFLOW_DIR = workflowDir;
  } else {
    delete nextEnv.ZOTERO_TEST_WORKFLOW_DIR;
  }
  const zoteroBinPath = String(
    nextEnv.ZOTERO_PLUGIN_ZOTERO_BIN_PATH || "",
  ).trim();
  if (zoteroBinPath) {
    const drainedBinPath = resolveZoteroStderrDrainLauncher({
      binPath: zoteroBinPath,
      root: deps.root || process.cwd(),
      platform: deps.platform || process.platform,
      ...(deps.writeLauncher ? { writeLauncher: deps.writeLauncher } : {}),
    });
    if (drainedBinPath) {
      nextEnv.ZOTERO_PLUGIN_ZOTERO_BIN_PATH = drainedBinPath;
    }
  }
  return applyZoteroTestHeadlessEnvironment(nextEnv);
}

export function resolveMockSkillRunnerHost(
  env: NodeJS.ProcessEnv = process.env,
) {
  return String(env.ZOTERO_MOCK_SKILLRUNNER_HOST || DEFAULT_MOCK_HOST).trim();
}

export function resolveMockSkillRunnerPort(
  env: NodeJS.ProcessEnv = process.env,
) {
  const raw = String(
    env.ZOTERO_MOCK_SKILLRUNNER_PORT || DEFAULT_MOCK_PORT,
  ).trim();
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 65535) {
    return DEFAULT_MOCK_PORT;
  }
  return String(parsed);
}

export function buildMockSkillRunnerEndpointEnvironment(
  env: NodeJS.ProcessEnv,
  baseUrl: string,
) {
  const normalizedBaseUrl = String(baseUrl || "").trim();
  return {
    ...env,
    ...(normalizedBaseUrl
      ? { ZOTERO_TEST_SKILLRUNNER_ENDPOINT: normalizedBaseUrl }
      : {}),
  };
}

function isUnderDirectory(child: string, parent: string) {
  const relative = path.relative(path.resolve(parent), path.resolve(child));
  return (
    Boolean(relative) &&
    !relative.startsWith("..") &&
    !path.isAbsolute(relative)
  );
}

async function cleanupTestDataDir(env: NodeJS.ProcessEnv) {
  const testDataDir = String(env[TEST_DATA_DIR_ENV] || "").trim();
  if (env[TEST_DATA_DIR_MANAGED_ENV] !== "1" || !testDataDir) {
    return;
  }
  const testDataParent = path.dirname(path.resolve(testDataDir));
  if (!isUnderDirectory(testDataParent, os.tmpdir())) {
    return;
  }
  await rm(testDataParent, { recursive: true, force: true });
}

function spawnNpm(args: string[], options?: SpawnOptions) {
  if (process.platform === "win32") {
    return spawn("cmd.exe", ["/d", "/s", "/c", "npm", ...args], {
      ...options,
      windowsHide: true,
    });
  }
  return spawn("npm", args, options);
}

function spawnMockSkillRunner(args: {
  host: string;
  port: string;
  env: NodeJS.ProcessEnv;
}) {
  return spawn(
    process.execPath,
    [
      "--import",
      "tsx",
      path.resolve("scripts/mock-skillrunner-serve.ts"),
      "--host",
      args.host,
      "--port",
      args.port,
    ],
    {
      stdio: ["ignore", "pipe", "pipe"],
      env: args.env,
      detached: process.platform !== "win32",
    },
  );
}

function waitForMockReady(mock: Child, timeoutMs = 8000) {
  return new Promise<string>((resolve, reject) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) {
        return;
      }
      settled = true;
      reject(
        new Error(
          `mock skillrunner did not become ready within ${timeoutMs}ms`,
        ),
      );
    }, timeoutMs);

    const onData = (chunk: Buffer) => {
      const text = chunk.toString("utf8");
      process.stdout.write(text);
      const baseUrlMatch = text.match(/baseUrl=(\S+)/);
      if (baseUrlMatch?.[1]) {
        if (settled) {
          return;
        }
        settled = true;
        clearTimeout(timer);
        resolve(baseUrlMatch[1]);
      }
    };

    mock.stdout?.on("data", onData);
    mock.stderr?.on("data", (chunk: Buffer) => {
      process.stderr.write(chunk.toString("utf8"));
    });
    mock.on("exit", (code, signal) => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timer);
      reject(
        new Error(
          `mock skillrunner exited before ready (code=${String(code)} signal=${String(signal)})`,
        ),
      );
    });
  });
}

function runTargetTests(
  invocation: WrappedTestInvocation,
  env: NodeJS.ProcessEnv,
) {
  return new Promise<number>((resolve) => {
    const args = ["run", invocation.targetScript];
    const forwardedArgs = buildForwardedTestArgs(
      invocation.targetScript,
      invocation.targetTestArgs,
    );
    if (forwardedArgs.length > 0) {
      args.push("--", ...forwardedArgs);
    }
    const proc = spawnNpm(args, {
      stdio: "inherit",
      env,
    });
    proc.on("exit", (code, signal) => {
      if (typeof code === "number") {
        resolve(code);
        return;
      }
      if (signal === "SIGINT") {
        resolve(130);
        return;
      }
      if (signal === "SIGTERM") {
        resolve(143);
        return;
      }
      resolve(1);
    });
  });
}

async function terminateMock(mock: Child) {
  if (!mock.pid || mock.exitCode !== null || mock.signalCode !== null) return;
  const exited = new Promise<void>((resolve) =>
    mock.once("exit", () => resolve()),
  );
  const killed = new Promise<void>((resolve, reject) => {
    if (process.platform === "win32") {
      const killer = spawn("taskkill", ["/PID", String(mock.pid), "/T", "/F"], {
        stdio: "ignore",
      });
      killer.on("error", reject);
      killer.on("exit", (code) =>
        code === 0
          ? resolve()
          : reject(new Error(`mock_skillrunner_taskkill_failed:${code}`)),
      );
      return;
    }
    try {
      process.kill(-mock.pid!, "SIGKILL");
    } catch {
      mock.kill("SIGKILL");
    }
    resolve();
  });
  await killed;
  await Promise.race([
    exited,
    new Promise<never>((_, reject) =>
      setTimeout(
        () => reject(new Error("mock_skillrunner_termination_timeout")),
        5_000,
      ),
    ),
  ]);
}

export function terminateExactProcess(processId: number) {
  if (processId === process.pid) {
    throw new Error("system_e2e_restart_refused_runner_pid");
  }
  if (process.platform !== "win32") {
    process.kill(processId, "SIGKILL");
    return waitForExactProcessExit(processId);
  }
  return new Promise<void>((resolve, reject) => {
    // The controlled fault is the death of the owning Zotero process alone. A
    // tree kill would also hard-kill the sidecar child, which on POSIX observes
    // parent-pipe EOF and exits through its own cleanup path instead, so the
    // Windows fault has to stay the same shape.
    const killer = spawn("taskkill", ["/PID", String(processId), "/F"], {
      stdio: "ignore",
      windowsHide: true,
    });
    killer.on("error", reject);
    killer.on("exit", (code) =>
      code === 0
        ? resolve()
        : reject(new Error(`system_e2e_restart_taskkill_failed:${code}`)),
    );
  }).then(() => waitForExactProcessExit(processId));
}

async function waitForExactProcessExit(processId: number) {
  const deadline = Date.now() + 5_000;
  while (Date.now() < deadline) {
    try {
      process.kill(processId, 0);
    } catch {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  throw new Error("system_e2e_restart_process_still_alive");
}

async function snapshotSystemE2EScaffold(scaffoldRoot: string) {
  const resumeRoot = await mkdtemp(
    path.join(os.tmpdir(), "zotero-agents-system-e2e-resume-"),
  );
  await Promise.all(
    ["data", "profile"].map((name) =>
      cp(path.join(scaffoldRoot, name), path.join(resumeRoot, name), {
        recursive: true,
        force: true,
      }),
    ),
  );
  return resumeRoot;
}

async function main() {
  const invocation = parseWrappedTestInvocation(process.argv.slice(2));
  const testEnv = buildTestEnvironment(invocation);
  const mockHost = resolveMockSkillRunnerHost(testEnv);
  const mockPort = resolveMockSkillRunnerPort(testEnv);
  const workflowDir = String(testEnv.ZOTERO_TEST_WORKFLOW_DIR || "").trim();
  const testDataDir = String(testEnv[TEST_DATA_DIR_ENV] || "").trim();
  console.log(`[test-target] ${invocation.targetScript}`);
  console.log(`[test-mode] ${testEnv.ZOTERO_TEST_MODE}`);
  console.log(`[test-domain] ${testEnv.ZOTERO_TEST_DOMAIN}`);
  console.log(
    `[test-workflow-dir] ${
      workflowDir || "(default from project/workflows_builtin)"
    }`,
  );
  console.log(`[test-data-dir] ${testDataDir || "(mock default)"}`);
  console.log(
    `[mock-skillrunner] ${mockHost}:${mockPort === "0" ? "(random)" : mockPort}`,
  );

  let systemE2ERun:
    | {
        env: NodeJS.ProcessEnv;
        finish: (exitCode: number) => Promise<void>;
        recordNativeCrashArtifact: () => Promise<void>;
        close: () => Promise<void>;
      }
    | undefined;
  let restartRequest: SystemE2ERestartRequest | undefined;
  let restartBoundary: Promise<SystemE2ERestartRequest> | undefined;
  let resumeRoot = "";
  const resumeRoots: string[] = [];
  let mock: Child | undefined;
  let mockBaseUrl = "";
  let peerRestarted = false;
  let nativeCrashSummaryPath = "";
  if (testEnv.ZOTERO_TEST_DOMAIN === "e2e") {
    const hostBridgeCli = await resolveCurrentHostBridgeCli();
    testEnv.ZOTERO_BRIDGE_CLI = hostBridgeCli.cliPath;
    console.log(`[host-bridge-cli] ${hostBridgeCli.buildFingerprint}`);
    const fixtureRoot = path.resolve("tests/fixtures/zotero-e2e");
    const registry = await readFixtureRegistry(
      path.join(fixtureRoot, "registry.json"),
    );
    const seed = JSON.parse(
      await readFile(
        path.join(fixtureRoot, "committed-seed-v1", "seed.json"),
        "utf8",
      ),
    );
    const fixture = validateCommittedSeed(seed, registry).identity;
    const runId = randomUUID();
    const manifestPath = path.resolve(
      "artifacts/test-diagnostics/system-e2e",
      runId,
      "run-manifest.json",
    );
    const closeLifecyclePath = path.join(
      path.dirname(manifestPath),
      "synthesis-close-lifecycle.json",
    );
    const crashJournalPath = path.join(
      path.dirname(manifestPath),
      "citation-graph-crash-journal.json",
    );
    nativeCrashSummaryPath = path.join(
      path.dirname(manifestPath),
      "zotero-native-crash-summary.json",
    );
    await mkdir(path.dirname(manifestPath), { recursive: true });
    const sourceCommit =
      String(testEnv.GITHUB_SHA || testEnv.CI_COMMIT_SHA || "").trim() ||
      "working-tree";
    const collector = createRunManifestEventCollector({
      runId,
      triggerLane: String(testEnv.ZOTERO_E2E_TRIGGER_LANE || "local"),
      sourceCommit,
      pluginVersion: pkg.version,
      zoteroVersion: "pending-runtime",
      platform: process.platform,
      architecture: process.arch,
      sidecarBuildIdentity: String(
        testEnv.ZOTERO_SYNTHESIS_SIDECAR_BUILD_IDENTITY ||
          `current-source:${sourceCommit}`,
      ),
      fixture,
      startedAt: new Date().toISOString(),
      ...(testEnv.ZOTERO_E2E_PREDECESSOR_RUN_ID
        ? { predecessorRunId: testEnv.ZOTERO_E2E_PREDECESSOR_RUN_ID }
        : {}),
    });
    let persistence = persistRunManifest(manifestPath, collector.snapshot());
    let nativeCrashArtifactRecorded = false;
    publishRunManifestReference(manifestPath);
    const sink = await startSystemE2EEventSink(async (event) => {
      const compatibilityRunRoot = String(
        testEnv.ZOTERO_COMPAT_RUN_ROOT || "",
      ).trim();
      if (compatibilityRunRoot) {
        await persistCompatibilityHostFactsEvent(compatibilityRunRoot, event);
      }
      const requestedRestart = parseSystemE2ERestartRequest(event);
      if (requestedRestart) {
        if (restartRequest) {
          throw new Error("system_e2e_restart_already_requested");
        }
        restartRequest = requestedRestart;
        restartBoundary = (
          requestedRestart.caseId === "HB-03"
            ? waitForSystemE2EAdmissionCheckpoint({
                checkpointPath: path.join(
                  resolveSystemE2EScaffoldRoot(testEnv),
                  "data",
                  "system-e2e",
                  "canonical-mutation-admission.held",
                ),
                operationId: requestedRestart.operationId,
              })
            : Promise.resolve("held" as const)
        ).then(async () => {
          await terminateExactProcess(requestedRestart.processId);
          return requestedRestart;
        });
      }
      if (parseSystemE2EPeerRestartRequest(event)) {
        if (peerRestarted || !mock || !mockBaseUrl) {
          throw new Error("system_e2e_peer_restart_unavailable");
        }
        peerRestarted = true;
        await terminateMock(mock);
        const fixedPort = new URL(mockBaseUrl).port;
        mock = spawnMockSkillRunner({
          host: mockHost,
          port: fixedPort,
          env: testEnv,
        });
        const restartedUrl = await waitForMockReady(mock);
        if (restartedUrl !== mockBaseUrl) {
          throw new Error("system_e2e_peer_restart_endpoint_changed");
        }
      }
      collector.accept(event);
      persistence = persistence.then(() =>
        persistRunManifest(manifestPath, collector.snapshot()),
      );
      await persistence;
    });
    systemE2ERun = {
      env: {
        ...testEnv,
        ZOTERO_SYSTEM_E2E_EVENT_URL: sink.url,
        ZOTERO_SYSTEM_E2E_MANIFEST_PATH: manifestPath,
        ...(testEnv.ZOTERO_SYSTEM_E2E_CASE === "CG-02"
          ? {
              ZOTERO_SYNTHESIS_CLOSE_DIAGNOSTICS_PATH: closeLifecyclePath,
              ZOTERO_SYNTHESIS_CLOSE_CRASH_JOURNAL_PATH: crashJournalPath,
              ZOTERO_SYNTHESIS_CLOSE_ARTIFACT_REFERENCE: path
                .relative(process.cwd(), closeLifecyclePath)
                .replace(/\\/g, "/"),
            }
          : {}),
      },
      finish: async (exitCode) => {
        await persistence;
        await persistRunManifest(manifestPath, collector.finalize(exitCode));
      },
      recordNativeCrashArtifact: async () => {
        if (nativeCrashArtifactRecorded) return;
        try {
          await readFile(nativeCrashSummaryPath, "utf8");
        } catch {
          return;
        }
        nativeCrashArtifactRecorded = true;
        collector.recordArtifact("CG", "CG-02", {
          status: "referenced",
          kind: "native-crash-summary",
          producer: "CG-02",
          mediaType: "application/json",
          relativePath: path
            .relative(process.cwd(), nativeCrashSummaryPath)
            .replace(/\\/g, "/"),
        });
        persistence = persistence.then(() =>
          persistRunManifest(manifestPath, collector.snapshot()),
        );
        await persistence;
      },
      close: sink.close,
    };
  }

  const effectiveTestEnv = systemE2ERun?.env || testEnv;
  mock = spawnMockSkillRunner({
    host: mockHost,
    port: mockPort,
    env: effectiveTestEnv,
  });

  let cleaned = false;
  const cleanup = async () => {
    if (cleaned) {
      return;
    }
    cleaned = true;
    if (mock) await terminateMock(mock);
    await systemE2ERun?.close();
    for (const root of resumeRoots) {
      await rm(root, { recursive: true, force: true });
    }
    await cleanupTestDataDir(testEnv);
  };

  const trap = async (exitCode: number) => {
    await cleanup();
    process.exit(exitCode);
  };

  process.on("SIGINT", () => {
    void trap(130);
  });
  process.on("SIGTERM", () => {
    void trap(143);
  });
  process.on("uncaughtException", (error) => {
    console.error(error);
    void trap(1);
  });
  process.on("unhandledRejection", (reason) => {
    console.error(reason);
    void trap(1);
  });

  let nativeCrashCapture: ZoteroNativeCrashCapture | undefined;
  try {
    mockBaseUrl = await waitForMockReady(mock);
    if (
      process.platform === "win32" &&
      effectiveTestEnv.ZOTERO_SYSTEM_E2E_CASE === "CG-02"
    ) {
      nativeCrashCapture = await startZoteroNativeCrashCapture({
        profileDir: path.join(resolveSystemE2EScaffoldRoot(testEnv), "profile"),
        publicSummaryPath: nativeCrashSummaryPath,
        zoteroBinaryPath: String(
          effectiveTestEnv.ZOTERO_PLUGIN_ZOTERO_BIN_PATH || "",
        ),
        workspaceRoot: process.cwd(),
        env: effectiveTestEnv,
      });
    }
    const targetEnv = buildMockSkillRunnerEndpointEnvironment(
      nativeCrashCapture?.env || effectiveTestEnv,
      mockBaseUrl,
    );
    console.log(`[test-skillrunner-endpoint] ${mockBaseUrl}`);
    let code = await runTargetTests(invocation, targetEnv);
    while (restartRequest) {
      const completedRestart = await restartBoundary!;
      resumeRoot = await snapshotSystemE2EScaffold(
        resolveSystemE2EScaffoldRoot(testEnv),
      );
      resumeRoots.push(resumeRoot);
      console.log(`[system-e2e-resume] ${completedRestart.caseId}`);
      restartRequest = undefined;
      restartBoundary = undefined;
      code = await runTargetTests(
        invocation,
        buildSystemE2EResumeEnvironment(
          targetEnv,
          completedRestart.caseId,
          resumeRoot,
        ),
      );
    }
    if (nativeCrashCapture) {
      const crashSummary = await nativeCrashCapture.finish();
      await systemE2ERun?.recordNativeCrashArtifact();
      console.log(`[native-crash-capture] ${crashSummary.status}`);
      if (crashSummary.status !== "no_crash_observed") code = 1;
    }
    await systemE2ERun?.finish(code);
    await cleanup();
    process.exit(code);
  } catch (error) {
    console.error(error);
    if (nativeCrashCapture) {
      try {
        const crashSummary = await nativeCrashCapture.finish();
        console.log(`[native-crash-capture] ${crashSummary.status}`);
      } catch (captureError) {
        console.error(captureError);
      }
    }
    await systemE2ERun?.recordNativeCrashArtifact();
    try {
      await systemE2ERun?.finish(1);
    } catch (manifestError) {
      console.error(manifestError);
    }
    await cleanup();
    process.exit(1);
  }
}

const shouldRunAsScript =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (shouldRunAsScript) {
  void main();
}

export const DEFAULT_TARGET_SCRIPTS = {
  zotero: DEFAULT_ZOTERO_TARGET_SCRIPT,
  node: DEFAULT_NODE_TARGET_SCRIPT,
};
