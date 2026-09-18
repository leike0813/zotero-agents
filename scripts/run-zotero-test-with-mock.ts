import { spawn } from "child_process";
import { randomUUID } from "crypto";
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
  startSystemE2EEventSink,
} from "./system-e2e/manifest";
import { resolveCurrentHostBridgeCli } from "../tests/helpers/hostBridgeCliHarness";

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
const SYSTEM_E2E_RESTART_KIND = "system-e2e-owner-restart-request";
const SYSTEM_E2E_SCAFFOLD_ROOT = path.resolve(".scaffold/test");

type SystemE2ERestartRequest = {
  caseId: "HB-03";
  operationId: string;
  processId: number;
};

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
    data.caseId !== "HB-03" ||
    operationId !== "system-e2e:hb:03" ||
    !Number.isInteger(processId) ||
    processId <= 1
  ) {
    return null;
  }
  return { caseId: "HB-03", operationId, processId };
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

export function buildTestEnvironment(
  invocation: WrappedTestInvocation,
  env: NodeJS.ProcessEnv = process.env,
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

function terminateMock(mock: Child) {
  return new Promise<void>((resolve) => {
    if (!mock.pid) {
      resolve();
      return;
    }
    if (process.platform === "win32") {
      const killer = spawn("taskkill", ["/PID", String(mock.pid), "/T", "/F"], {
        stdio: "ignore",
      });
      killer.on("exit", () => resolve());
      return;
    }
    try {
      process.kill(-mock.pid, "SIGTERM");
      resolve();
    } catch {
      try {
        mock.kill("SIGTERM");
      } catch {
        // ignore
      }
      resolve();
    }
  });
}

function terminateExactProcess(processId: number) {
  if (processId === process.pid) {
    throw new Error("system_e2e_restart_refused_runner_pid");
  }
  if (process.platform !== "win32") {
    process.kill(processId, "SIGKILL");
    return waitForExactProcessExit(processId);
  }
  return new Promise<void>((resolve, reject) => {
    const killer = spawn("taskkill", ["/PID", String(processId), "/T", "/F"], {
      stdio: "ignore",
      windowsHide: true,
    });
    killer.on("error", reject);
    killer.on("exit", (code) =>
      code === 0
        ? resolve()
        : reject(new Error(`system_e2e_restart_taskkill_failed:${code}`)),
    );
  });
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

async function snapshotSystemE2EScaffold() {
  const resumeRoot = await mkdtemp(
    path.join(os.tmpdir(), "zotero-agents-system-e2e-resume-"),
  );
  await Promise.all(
    ["data", "profile"].map((name) =>
      cp(
        path.join(SYSTEM_E2E_SCAFFOLD_ROOT, name),
        path.join(resumeRoot, name),
        { recursive: true, force: true },
      ),
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
        close: () => Promise<void>;
      }
    | undefined;
  let restartRequest: SystemE2ERestartRequest | undefined;
  let restartBoundary: Promise<SystemE2ERestartRequest> | undefined;
  let resumeRoot = "";
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
    const sink = await startSystemE2EEventSink(async (event) => {
      const requestedRestart = parseSystemE2ERestartRequest(event);
      if (requestedRestart) {
        if (restartRequest) {
          throw new Error("system_e2e_restart_already_requested");
        }
        restartRequest = requestedRestart;
        restartBoundary = waitForSystemE2EAdmissionCheckpoint({
          checkpointPath: path.join(
            SYSTEM_E2E_SCAFFOLD_ROOT,
            "data",
            "system-e2e",
            "canonical-mutation-admission.held",
          ),
          operationId: requestedRestart.operationId,
        }).then(async () => {
          await terminateExactProcess(requestedRestart.processId);
          return requestedRestart;
        });
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
              ZOTERO_SYNTHESIS_CLOSE_ARTIFACT_REFERENCE: path
                .relative(process.cwd(), closeLifecyclePath)
                .replace(/\\/g, "/"),
            }
          : {}),
      },
      finish: async (exitCode) => {
        await persistence;
        await persistRunManifest(manifestPath, collector.finalize(exitCode));
        console.log(`[system-e2e-manifest] ${manifestPath}`);
      },
      close: sink.close,
    };
  }

  const effectiveTestEnv = systemE2ERun?.env || testEnv;
  const mock = spawnNpm(
    ["run", "mock:skillrunner", "--", "--host", mockHost, "--port", mockPort],
    {
      stdio: ["ignore", "pipe", "pipe"],
      env: effectiveTestEnv,
      detached: process.platform !== "win32",
    },
  );

  let cleaned = false;
  const cleanup = async () => {
    if (cleaned) {
      return;
    }
    cleaned = true;
    await terminateMock(mock);
    await systemE2ERun?.close();
    if (resumeRoot) {
      await rm(resumeRoot, { recursive: true, force: true });
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

  try {
    const mockBaseUrl = await waitForMockReady(mock);
    const targetEnv = buildMockSkillRunnerEndpointEnvironment(
      effectiveTestEnv,
      mockBaseUrl,
    );
    console.log(`[test-skillrunner-endpoint] ${mockBaseUrl}`);
    let code = await runTargetTests(invocation, targetEnv);
    if (restartRequest) {
      const completedRestart = await restartBoundary;
      resumeRoot = await snapshotSystemE2EScaffold();
      console.log(`[system-e2e-resume] ${completedRestart.caseId}`);
      code = await runTargetTests(invocation, {
        ...targetEnv,
        ZOTERO_SYSTEM_E2E_RESUME_CASE: completedRestart.caseId,
        ZOTERO_SYSTEM_E2E_RESUME_ROOT: resumeRoot,
      });
    }
    await systemE2ERun?.finish(code);
    await cleanup();
    process.exit(code);
  } catch (error) {
    console.error(error);
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
