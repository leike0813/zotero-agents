import { spawn } from "child_process";
import path from "path";
import { pathToFileURL } from "url";

type Child = ReturnType<typeof spawn>;
type SpawnOptions = Parameters<typeof spawn>[2];

type WrappedTestInvocation = {
  targetScript: string;
  requestedMode: string;
  requestedDomain: string;
  targetTestArgs: string[];
};

const MOCK_PORT = "8030";
const MOCK_HOST = "127.0.0.1";
const DEFAULT_ZOTERO_TARGET_SCRIPT = "test:zotero:cli";
const DEFAULT_NODE_TARGET_SCRIPT = "test:node:raw";
const DEFAULT_TEST_WORKFLOW_DIR = path.join(process.cwd(), "workflows_builtin");

export function normalizeTestMode(value: string) {
  return value.trim().toLowerCase() === "full" ? "full" : "lite";
}

export function normalizeTestDomain(value: string) {
  const normalized = value.trim().toLowerCase();
  if (
    normalized === "core" ||
    normalized === "ui" ||
    normalized === "workflow"
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
    cliArgs[0] ||
    env.ZOTERO_TEST_TARGET_SCRIPT ||
    DEFAULT_ZOTERO_TARGET_SCRIPT;
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
    targetTestArgs,
  };
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
      arg === "--watch" ||
      arg === "--no-watch" ||
      arg === "--exit-on-finish",
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
  const nextEnv: NodeJS.ProcessEnv = {
    ...env,
    ZOTERO_TEST_MODE: testMode,
    ZOTERO_TEST_DOMAIN: testDomain,
  };
  if (workflowDir) {
    nextEnv.ZOTERO_TEST_WORKFLOW_DIR = workflowDir;
  } else {
    delete nextEnv.ZOTERO_TEST_WORKFLOW_DIR;
  }
  return nextEnv;
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
  return new Promise<void>((resolve, reject) => {
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
      if (
        text.includes("mock skillrunner started") ||
        text.includes("baseUrl=")
      ) {
        if (settled) {
          return;
        }
        settled = true;
        clearTimeout(timer);
        resolve();
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

function runTargetTests(invocation: WrappedTestInvocation, env: NodeJS.ProcessEnv) {
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

async function main() {
  const invocation = parseWrappedTestInvocation(process.argv.slice(2));
  const testEnv = buildTestEnvironment(invocation);
  const workflowDir = String(testEnv.ZOTERO_TEST_WORKFLOW_DIR || "").trim();
  console.log(`[test-target] ${invocation.targetScript}`);
  console.log(`[test-mode] ${testEnv.ZOTERO_TEST_MODE}`);
  console.log(`[test-domain] ${testEnv.ZOTERO_TEST_DOMAIN}`);
  console.log(
    `[test-workflow-dir] ${
      workflowDir || "(default from project/workflows_builtin)"
    }`,
  );

  const mock = spawnNpm(
    [
      "run",
      "mock:skillrunner",
      "--",
      "--host",
      MOCK_HOST,
      "--port",
      MOCK_PORT,
    ],
    {
      stdio: ["ignore", "pipe", "pipe"],
      env: testEnv,
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
    await waitForMockReady(mock);
    const code = await runTargetTests(invocation, testEnv);
    await cleanup();
    process.exit(code);
  } catch (error) {
    console.error(error);
    await cleanup();
    process.exit(1);
  }
}

const shouldRunAsScript =
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (shouldRunAsScript) {
  void main();
}

export const DEFAULT_TARGET_SCRIPTS = {
  zotero: DEFAULT_ZOTERO_TARGET_SCRIPT,
  node: DEFAULT_NODE_TARGET_SCRIPT,
};
