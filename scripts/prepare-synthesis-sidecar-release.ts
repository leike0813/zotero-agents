import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  SYNTHESIS_SIDECAR_RUNTIME_RELEASE_SET_PATH,
  createSynthesisSidecarRuntimeReleaseSet,
} from "./synthesis-sidecar-runtime-release-set";

function argument(name: string) {
  return process.argv
    .find((entry) => entry.startsWith(`--${name}=`))
    ?.slice(name.length + 3);
}

function git(...args: string[]) {
  return execFileSync("git", args, { encoding: "utf8" }).trim();
}

async function main() {
  const resultPath = String(argument("prebuild-result") || "").trim();
  if (!resultPath) throw new Error("--prebuild-result is required");
  if (git("branch", "--show-current") !== "main")
    throw new Error("Sidecar release preparation must run on main");
  if (git("status", "--porcelain"))
    throw new Error(
      "Commit or stash changes before sidecar release preparation",
    );
  const sourceCommit = git("rev-parse", "HEAD");
  const releaseSet = createSynthesisSidecarRuntimeReleaseSet({
    sourceCommit,
    prebuildResult: JSON.parse(
      await fs.readFile(path.resolve(resultPath), "utf8"),
    ),
  });
  const output = path.resolve(
    argument("output") || SYNTHESIS_SIDECAR_RUNTIME_RELEASE_SET_PATH,
  );
  await fs.mkdir(path.dirname(output), { recursive: true });
  await fs.writeFile(output, `${JSON.stringify(releaseSet, null, 2)}\n`);
  process.stdout.write(`${JSON.stringify(releaseSet, null, 2)}\n`);
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
