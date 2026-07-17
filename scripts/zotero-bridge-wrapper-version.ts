import { readFileSync, writeFileSync } from "node:fs";

const PATH = "skills_src/zotero-bridge-cli/runner.json";

function bumpPatch(version: string) {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(version);
  if (!match) throw new Error(`Invalid wrapper version: ${version}`);
  return `${match[1]}.${match[2]}.${Number(match[3]) + 1}`;
}

const runner = JSON.parse(readFileSync(PATH, "utf8"));
if (process.argv.includes("--bump")) {
  runner.version = bumpPatch(String(runner.version || ""));
  writeFileSync(PATH, `${JSON.stringify(runner, null, 2)}\n`, "utf8");
}
process.stdout.write(
  `${JSON.stringify({ schema: "zotero-bridge.wrapper-version.v1", version: runner.version }, null, 2)}\n`,
);
