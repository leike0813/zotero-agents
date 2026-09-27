import { spawn } from "child_process";

type Step = {
  name: string;
  script: string;
};

const steps: Step[] = [
  { name: "core-full", script: "test:zotero:core:full" },
  { name: "ui-full", script: "test:zotero:ui:full" },
  { name: "workflow-full", script: "test:zotero:workflow:full" },
  { name: "e2e-full", script: "test:zotero:e2e" },
];

function spawnNpm(args: string[]) {
  if (process.platform === "win32") {
    return spawn("cmd.exe", ["/d", "/s", "/c", "npm", ...args], {
      stdio: "inherit",
      windowsHide: true,
      env: process.env,
    });
  }
  return spawn("npm", args, {
    stdio: "inherit",
    env: process.env,
  });
}

async function runStep(step: Step) {
  console.log(
    `[zotero-full-wrapper] stage=${step.name} script=${step.script} start=${new Date().toISOString()}`,
  );
  const child = spawnNpm(["run", step.script]);
  const exitCode = await new Promise<number>((resolve) => {
    child.on("exit", (code) => {
      resolve(typeof code === "number" ? code : 1);
    });
  });
  if (exitCode !== 0) {
    console.error(
      `[zotero-full-wrapper] stage=${step.name} result=failed exitCode=${exitCode}`,
    );
    process.exit(exitCode);
    return;
  }
  console.log(
    `[zotero-full-wrapper] stage=${step.name} result=passed finish=${new Date().toISOString()}`,
  );
}

async function main() {
  console.log(
    `[zotero-full-wrapper] stages=${steps.length} start=${new Date().toISOString()}`,
  );
  for (const step of steps) {
    await runStep(step);
  }
  console.log(
    `[zotero-full-wrapper] result=passed finish=${new Date().toISOString()}`,
  );
}

void main();
