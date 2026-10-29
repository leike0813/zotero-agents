import { spawn } from "child_process";
import { pathToFileURL } from "node:url";
import { getCiGateStages, type CiGateName } from "./ci-gate-plan";

function spawnNpm(args: string[], env: NodeJS.ProcessEnv) {
  if (process.platform === "win32") {
    return spawn("cmd.exe", ["/d", "/s", "/c", "npm", ...args], {
      stdio: "inherit",
      windowsHide: true,
      env,
    });
  }
  return spawn("npm", args, { stdio: "inherit", env });
}

function normalizeGateName(value: string): CiGateName {
  const gate = value.trim().toLowerCase();
  if (
    gate === "pr" ||
    gate === "release" ||
    gate === "full" ||
    gate === "workflow"
  )
    return gate;
  throw new Error(`Unknown test gate: ${value}`);
}

async function runNpmScript(scriptName: string, env: NodeJS.ProcessEnv) {
  const child = spawnNpm(["run", scriptName], env);
  return await new Promise<number>((resolve) => {
    child.on("error", () => resolve(1));
    child.on("exit", (code) => {
      resolve(typeof code === "number" ? code : 1);
    });
  });
}

export async function runCiGate(
  gate: CiGateName,
  options: {
    env?: NodeJS.ProcessEnv;
    runScript?: typeof runNpmScript;
  } = {},
) {
  const env: NodeJS.ProcessEnv = {
    ...(options.env || process.env),
    ZOTERO_WORKFLOW_E2E_MODE: "offline",
  };
  for (const key of Object.keys(env)) {
    if (
      (key.startsWith("ZOTERO_WORKFLOW_E2E_") &&
        key !== "ZOTERO_WORKFLOW_E2E_MODE") ||
      key.startsWith("ZOTERO_SYSTEM_E2E_RESUME_") ||
      key.startsWith("ZOTERO_E2E_GOLD_") ||
      [
        "ZOTERO_TEST_GREP",
        "ZOTERO_SYSTEM_E2E_FAMILIES",
        "ZOTERO_SYSTEM_E2E_COMPLETED_CASES",
        "ZOTERO_E2E_FIXTURE",
      ].includes(key)
    )
      delete env[key];
  }
  if (gate === "workflow") env.ZOTERO_SYSTEM_E2E_FAMILIES = "WF";
  const runScript = options.runScript || runNpmScript;
  const stages = getCiGateStages(gate);
  console.log(
    `[ci-gate] gate=${gate} stages=${stages.length} blocking=true start=${new Date().toISOString()}`,
  );
  for (const stage of stages) {
    console.log(
      `[ci-gate] gate=${gate} stage=${stage.id} script=${stage.script} start=true`,
    );
    const exitCode = await runScript(stage.script, env);
    if (exitCode !== 0) {
      console.error(
        `[ci-gate] gate=${gate} result=failed stage=${stage.id} exitCode=${exitCode} blocking=true`,
      );
      return exitCode;
    }
  }
  console.log(`[ci-gate] gate=${gate} result=passed blocking=true`);
  return 0;
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  void runCiGate(normalizeGateName(process.argv[2] || "pr")).then(
    (exitCode) => {
      process.exit(exitCode);
    },
  );
}
