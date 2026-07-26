import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { createHostBridgeReleasePlan } from "./host-bridge-release-plan";
import { resolveExactCliReleaseIntent } from "./host-bridge-version-intent";

function run(command: string, args: string[]) {
  const result = spawnSync(command, args, { stdio: "inherit" });
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(" ")} exited ${result.status}`);
  }
}

function option(name: string) {
  const inline = process.argv.find((entry) => entry.startsWith(`${name}=`));
  const index = process.argv.indexOf(name);
  return (
    inline?.slice(name.length + 1) ||
    (index >= 0 ? process.argv[index + 1] : "")
  ).trim();
}

const intentArg = process.argv.find((entry) => entry.startsWith("--intent="));
const intentIndex = process.argv.indexOf("--intent");
let intent = (intentArg?.slice("--intent=".length) ||
  (intentIndex >= 0 ? process.argv[intentIndex + 1] : "") ||
  "auto") as "auto" | "patch" | "minor";
if (!(["auto", "patch", "minor"] as const).includes(intent)) {
  throw new Error(`Unsupported Host Bridge release intent: ${intent}`);
}
const exactCliVersion = option("--cli-version");
const currentCliVersion = String(
  JSON.parse(readFileSync("cli/zotero-bridge/release.json", "utf8")).version,
);
if (exactCliVersion) {
  const exactIntent = resolveExactCliReleaseIntent(
    currentCliVersion,
    exactCliVersion,
  );
  if (intent !== "auto" && intent !== exactIntent) {
    throw new Error(
      `--intent ${intent} conflicts with exact CLI target ${exactCliVersion}`,
    );
  }
  intent = exactIntent;
}
const plan = createHostBridgeReleasePlan(process.cwd(), intent);
if (exactCliVersion === currentCliVersion && plan.versionBumps.cli !== "none") {
  throw new Error(
    `CLI inputs require a version bump; exact target ${exactCliVersion} is already current`,
  );
}
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
  const preparedCliVersion = String(
    JSON.parse(readFileSync("cli/zotero-bridge/release.json", "utf8")).version,
  );
  if (exactCliVersion && preparedCliVersion !== exactCliVersion) {
    throw new Error(
      `Prepared CLI version ${preparedCliVersion} does not match exact target ${exactCliVersion}`,
    );
  }
} else if (exactCliVersion && currentCliVersion !== exactCliVersion) {
  throw new Error(
    `Release plan did not bump CLI ${currentCliVersion} to ${exactCliVersion}`,
  );
}
if (
  plan.versionBumps.cliBundle === "patch" ||
  plan.versionBumps.cliBundle === "minor"
) {
  run("npx", [
    "tsx",
    "scripts/host-bridge-surface-version.ts",
    "--surface=zotero-bridge-cli",
    plan.versionBumps.cliBundle === "minor" ? "--align-cli" : "--bump",
  ]);
}
if (plan.versionBumps.libraryAgent === "minor") {
  run("npx", [
    "tsx",
    "scripts/host-bridge-surface-version.ts",
    "--surface=zotero-library-agent",
    "--align-cli",
  ]);
} else if (plan.versionBumps.libraryAgent === "patch") {
  run("npx", [
    "tsx",
    "scripts/host-bridge-surface-version.ts",
    "--surface=zotero-library-agent",
    "--bump",
  ]);
}
if (plan.versionBumps.librarianProfile === "minor") {
  run("npx", [
    "tsx",
    "scripts/host-bridge-surface-version.ts",
    "--surface=zotero-librarian",
    "--align-cli",
  ]);
} else if (plan.versionBumps.librarianProfile === "patch") {
  run("npx", [
    "tsx",
    "scripts/host-bridge-surface-version.ts",
    "--surface=zotero-librarian",
    "--bump",
  ]);
}
run("npm", ["run", "render:host-bridge-surface"]);
run("npm", ["run", "check:host-bridge-surface"]);
process.stdout.write(
  `${JSON.stringify({ schema: "host-bridge.prepare-result.v1", plan }, null, 2)}\n`,
);
