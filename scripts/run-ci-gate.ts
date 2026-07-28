import { spawn } from "child_process";

type GateName = "pr" | "release";

const BLOCKING_GOVERNANCE_SCRIPTS = [
  "check:localization-governance",
  "check:ssot-invariants",
  "check:host-bridge-content",
] as const;

function spawnNpm(args: string[]) {
  if (process.platform === "win32") {
    return spawn("cmd.exe", ["/d", "/s", "/c", "npm", ...args], {
      stdio: "inherit",
      windowsHide: true,
    });
  }
  return spawn("npm", args, { stdio: "inherit" });
}

function normalizeGateName(value: string): GateName {
  return value.trim().toLowerCase() === "release" ? "release" : "pr";
}

function getSuiteCommand(gate: GateName) {
  if (gate === "release") {
    return "test:full";
  }
  return "test:lite";
}

async function runNpmScript(scriptName: string) {
  const child = spawnNpm(["run", scriptName]);
  return await new Promise<number>((resolve) => {
    child.on("exit", (code) => {
      resolve(typeof code === "number" ? code : 1);
    });
  });
}

async function main() {
  const gate = normalizeGateName(process.argv[2] || "pr");
  const suiteCommand = getSuiteCommand(gate);
  console.log(
    `[ci-gate] gate=${gate} suite=${suiteCommand} blocking=true start=${new Date().toISOString()}`,
  );
  for (const scriptName of BLOCKING_GOVERNANCE_SCRIPTS) {
    const governanceCode = await runNpmScript(scriptName);
    if (governanceCode !== 0) {
      console.error(
        `[ci-gate] gate=${gate} result=failed stage=${scriptName} exitCode=${governanceCode} blocking=true`,
      );
      process.exit(governanceCode);
      return;
    }
  }
  const exitCode = await runNpmScript(suiteCommand);
  if (exitCode !== 0) {
    console.error(
      `[ci-gate] gate=${gate} result=failed exitCode=${exitCode} blocking=true`,
    );
    process.exit(exitCode);
    return;
  }
  console.log(`[ci-gate] gate=${gate} result=passed blocking=true`);
}

void main();
