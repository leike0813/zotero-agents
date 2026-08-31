import { spawn } from "child_process";
import { pathToFileURL } from "node:url";
import { getCiGateStages, type CiGateName } from "./ci-gate-plan";

function spawnNpm(args: string[]) {
  if (process.platform === "win32") {
    return spawn("cmd.exe", ["/d", "/s", "/c", "npm", ...args], {
      stdio: "inherit",
      windowsHide: true,
    });
  }
  return spawn("npm", args, { stdio: "inherit" });
}

function normalizeGateName(value: string): CiGateName {
  return value.trim().toLowerCase() === "release" ? "release" : "pr";
}

async function runNpmScript(scriptName: string) {
  const child = spawnNpm(["run", scriptName]);
  return await new Promise<number>((resolve) => {
    child.on("error", () => resolve(1));
    child.on("exit", (code) => {
      resolve(typeof code === "number" ? code : 1);
    });
  });
}

async function main(gateInput = process.argv[2] || "pr") {
  const gate = normalizeGateName(gateInput);
  const stages = getCiGateStages(gate);
  console.log(
    `[ci-gate] gate=${gate} stages=${stages.length} blocking=true start=${new Date().toISOString()}`,
  );
  for (const stage of stages) {
    console.log(
      `[ci-gate] gate=${gate} stage=${stage.id} script=${stage.script} start=true`,
    );
    const exitCode = await runNpmScript(stage.script);
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
  void main().then((exitCode) => {
    process.exit(exitCode);
  });
}
