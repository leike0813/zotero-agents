import { spawnSync } from "node:child_process";
import { createHostBridgeReleasePlan } from "./host-bridge-release-plan";

function run(command: string, args: string[]) {
  const result = spawnSync(command, args, { stdio: "inherit" });
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(" ")} exited ${result.status}`);
  }
}

const plan = createHostBridgeReleasePlan();
const write = process.argv.includes("--write");
if (!write) {
  process.stdout.write(`${JSON.stringify(plan, null, 2)}\n`);
  process.exit(0);
}

if (plan.versionBumps.cli === "patch") {
  run("node", [
    "scripts/host-bridge-cli-release-governance.mjs",
    "bump-patch",
    "--write",
    "--dispatch-reason=prepare",
  ]);
}
if (plan.versionBumps.cliBundle === "patch") {
  run("npx", ["tsx", "scripts/zotero-bridge-wrapper-version.ts", "--bump"]);
}
if (plan.versionBumps.libraryAgent === "patch") {
  run("npx", [
    "tsx",
    "scripts/zotero-library-agent-bundle-version.ts",
    "--bump",
  ]);
}
if (plan.versionBumps.librarianProfile === "patch") {
  run("npx", ["tsx", "scripts/zotero-librarian-profile-version.ts", "--bump"]);
}
run("npm", ["run", "render:host-bridge-surface"]);
run("npm", ["run", "check:host-bridge-surface"]);
process.stdout.write(
  `${JSON.stringify({ schema: "host-bridge.prepare-result.v1", plan }, null, 2)}\n`,
);
