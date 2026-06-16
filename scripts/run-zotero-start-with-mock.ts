import { spawn } from "child_process";
import { config as loadEnv } from "dotenv";
import { existsSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  buildZoteroLaunchEnv,
  patchRuntimeRootPref,
} from "./run-zotero-direct";

type Child = ReturnType<typeof spawn>;
type SpawnOptions = Parameters<typeof spawn>[2];

const SCRIPT_PATH = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(SCRIPT_PATH), "..");
loadEnv({ path: path.resolve(ROOT, ".env") });

const MOCK_PORT = process.env.ZOTERO_MOCK_SKILLRUNNER_PORT || "8030";
const MOCK_HOST = process.env.ZOTERO_MOCK_SKILLRUNNER_HOST || "127.0.0.1";
const TARGET_START_SCRIPT = process.argv[2] || "start:raw";
const TARGET_START_ARGS = process.argv.slice(3);

export function buildStartWithMockEnv(
  env: NodeJS.ProcessEnv = process.env,
): NodeJS.ProcessEnv {
  return buildZoteroLaunchEnv(env);
}

function cleanEnvPath(value: unknown) {
  return String(value || "")
    .replace(/^["']|["']$/g, "")
    .trim();
}

export function patchStartWithMockRuntimePrefs(
  env: NodeJS.ProcessEnv = process.env,
) {
  const profile = cleanEnvPath(env.ZOTERO_PLUGIN_PROFILE_PATH);
  if (!profile) {
    return false;
  }
  patchRuntimeRootPref(profile, env);
  return true;
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

function resolveLocalTsxCli() {
  const cliPath = path.resolve(
    process.cwd(),
    "node_modules",
    "tsx",
    "dist",
    "cli.mjs",
  );
  if (!existsSync(cliPath)) {
    throw new Error(`local tsx CLI not found: ${cliPath}`);
  }
  return cliPath;
}

function spawnMockSkillRunner(env: NodeJS.ProcessEnv) {
  return spawn(
    process.execPath,
    [
      resolveLocalTsxCli(),
      "scripts/mock-skillrunner-serve.ts",
      "--host",
      MOCK_HOST,
      "--port",
      MOCK_PORT,
    ],
    {
      stdio: ["ignore", "pipe", "pipe"],
      env,
      detached: process.platform !== "win32",
      windowsHide: true,
    },
  );
}

function toExitCode(code: number | null, signal: NodeJS.Signals | null) {
  if (typeof code === "number") {
    return code;
  }
  if (signal === "SIGINT") {
    return 130;
  }
  if (signal === "SIGTERM") {
    return 143;
  }
  return 1;
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
      if (text.includes("mock skillrunner started") || text.includes("baseUrl=")) {
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

function runTargetStart(env: NodeJS.ProcessEnv) {
  return new Promise<{ proc: Child; exit: Promise<number> }>((resolve) => {
    const args = ["run", TARGET_START_SCRIPT];
    if (TARGET_START_ARGS.length > 0) {
      args.push("--", ...TARGET_START_ARGS);
    }
    const proc = spawnNpm(args, {
      stdio: "inherit",
      env,
      detached: process.platform !== "win32",
    });
    const exit = new Promise<number>((done) => {
      proc.on("exit", (code, signal) => {
        done(toExitCode(code, signal));
      });
    });
    resolve({ proc, exit });
  });
}

function terminateChild(child: Child | null, detached = false) {
  return new Promise<void>((resolve) => {
    if (!child || !child.pid || child.exitCode !== null) {
      resolve();
      return;
    }

    if (process.platform === "win32") {
      const killer = spawn("taskkill", ["/PID", String(child.pid), "/T", "/F"], {
        stdio: "ignore",
      });
      let settled = false;
      const done = () => {
        if (settled) {
          return;
        }
        settled = true;
        clearTimeout(timer);
        resolve();
      };
      const timer = setTimeout(done, 3000);
      killer.on("exit", done);
      killer.on("error", done);
      return;
    }

    try {
      if (detached) {
        process.kill(-child.pid, "SIGTERM");
      } else {
        child.kill("SIGTERM");
      }
    } catch {
      // ignore
    }
    resolve();
  });
}

async function main() {
  const env: NodeJS.ProcessEnv = buildStartWithMockEnv(process.env);
  patchStartWithMockRuntimePrefs(env);
  console.log(`[mock-skillrunner] ${MOCK_HOST}:${MOCK_PORT}`);
  if (TARGET_START_ARGS.length > 0) {
    console.log(`[start-args] ${TARGET_START_ARGS.join(" ")}`);
  }

  const mock = spawnMockSkillRunner(env);

  let target: Child | null = null;
  let cleaned = false;

  const cleanup = async () => {
    if (cleaned) {
      return;
    }
    cleaned = true;
    await terminateChild(mock, process.platform !== "win32");
    await terminateChild(target, process.platform !== "win32");
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
    const { proc, exit } = await runTargetStart(env);
    target = proc;
    const code = await exit;
    await cleanup();
    process.exit(code);
  } catch (error) {
    console.error(error);
    await cleanup();
    process.exit(1);
  }
}

const launchedDirectly =
  process.argv[1] &&
  path.resolve(process.argv[1]) === SCRIPT_PATH;

if (launchedDirectly) {
  void main();
}
