import { spawnSync } from "node:child_process";
import { createHostBridgeReleasePlan } from "./host-bridge-release-plan";

function run(command: string, args: string[]) {
  const result = spawnSync(command, args, { stdio: "inherit" });
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(" ")} exited ${result.status}`);
  }
}

const intentArg = process.argv.find((entry) => entry.startsWith("--intent="));
const intentIndex = process.argv.indexOf("--intent");
const intent = (intentArg?.slice("--intent=".length) ||
  (intentIndex >= 0 ? process.argv[intentIndex + 1] : "") ||
  "auto") as "auto" | "patch" | "minor";
if (!(["auto", "patch", "minor"] as const).includes(intent)) {
  throw new Error(`Unsupported Host Bridge release intent: ${intent}`);
}
const plan = createHostBridgeReleasePlan(process.cwd(), intent);
const write = process.argv.includes("--write");
if (!write) {
  process.stdout.write(`${JSON.stringify(plan, null, 2)}\n`);
  process.exit(0);
}

if (plan.versionBumps.cli === "patch" || plan.versionBumps.cli === "minor") {
  run("node", [
    "scripts/host-bridge-cli-release-governance.mjs",
    plan.versionBumps.cli === "minor" ? "bump-minor" : "bump-patch",
    "--write",
    "--dispatch-reason=prepare",
  ]);
}
if (
  plan.versionBumps.cliBundle === "patch" ||
  plan.versionBumps.cliBundle === "minor"
) {
  run("npx", [
    "tsx",
    "scripts/zotero-bridge-wrapper-version.ts",
    plan.versionBumps.cliBundle === "minor" ? "--bump-minor" : "--bump",
  ]);
}
if (plan.versionBumps.libraryAgent === "minor") {
  run("npx", [
    "tsx",
    "scripts/zotero-library-agent-bundle-version.ts",
    "--align-cli",
  ]);
} else if (plan.versionBumps.libraryAgent === "patch") {
  run("npx", [
    "tsx",
    "scripts/zotero-library-agent-bundle-version.ts",
    "--bump",
  ]);
}
if (plan.versionBumps.librarianProfile === "minor") {
  run("npx", [
    "tsx",
    "scripts/zotero-librarian-profile-version.ts",
    "--align-cli",
  ]);
} else if (plan.versionBumps.librarianProfile === "patch") {
  run("npx", ["tsx", "scripts/zotero-librarian-profile-version.ts", "--bump"]);
}
run("npm", ["run", "render:host-bridge-surface"]);
run("npm", ["run", "check:host-bridge-surface"]);
process.stdout.write(
  `${JSON.stringify({ schema: "host-bridge.prepare-result.v1", plan }, null, 2)}\n`,
);
