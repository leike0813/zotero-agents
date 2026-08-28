import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  createSynthesisSidecarRuntimeReleaseSet,
  rebuildSynthesisSidecarRuntimeReleaseSet,
  type SynthesisSidecarRuntimeReleaseIdentities,
} from "../packages/synthesis-contracts/src/sidecarRuntimeRelease";
import { computeSynthesisSidecarRuntimeIdentities } from "./synthesis-sidecar-runtime-release-governance";

export {
  createSynthesisSidecarRuntimeReleaseSet,
  rebuildSynthesisSidecarRuntimeReleaseSet,
  type SynthesisSidecarRuntimeReleaseIdentities,
};

export const SYNTHESIS_SIDECAR_RUNTIME_RELEASE_SET_PATH =
  "synthesis-sidecar/release-set.json";
export const SYNTHESIS_SIDECAR_RUNTIME_RELEASE_RECEIPT_PATH =
  "synthesis-sidecar/latest-complete-release-receipt.json";

export async function readSynthesisSidecarRuntimeReleaseSet(
  root = process.cwd(),
) {
  return rebuildSynthesisSidecarRuntimeReleaseSet(
    JSON.parse(
      await fs.readFile(
        path.join(root, SYNTHESIS_SIDECAR_RUNTIME_RELEASE_SET_PATH),
        "utf8",
      ),
    ),
  );
}

function argument(name: string) {
  return process.argv
    .find((entry) => entry.startsWith(`--${name}=`))
    ?.slice(name.length + 3);
}

function help() {
  process.stdout.write(
    "Usage: tsx scripts/synthesis-sidecar-runtime-release-set.ts --source-commit=<sha> --prebuild-result=<path> --verification-result=<path> [--output=<path>]\n",
  );
}

async function main() {
  if (process.argv.includes("--help")) return help();
  const sourceCommit = String(argument("source-commit") || "").trim();
  const prebuildPath = String(argument("prebuild-result") || "").trim();
  const verificationPath = String(argument("verification-result") || "").trim();
  if (!sourceCommit || !prebuildPath || !verificationPath) {
    throw new Error(
      "--source-commit, --prebuild-result, and --verification-result are required",
    );
  }
  const identities = await computeSynthesisSidecarRuntimeIdentities();
  const releaseSet = createSynthesisSidecarRuntimeReleaseSet({
    sourceCommit,
    prebuildResult: JSON.parse(
      await fs.readFile(path.resolve(prebuildPath), "utf8"),
    ),
    verificationResult: JSON.parse(
      await fs.readFile(path.resolve(verificationPath), "utf8"),
    ),
    identities,
  });
  const output = path.resolve(
    argument("output") || SYNTHESIS_SIDECAR_RUNTIME_RELEASE_SET_PATH,
  );
  await fs.mkdir(path.dirname(output), { recursive: true });
  await fs.writeFile(output, `${JSON.stringify(releaseSet, null, 2)}\n`);
  process.stdout.write(`${JSON.stringify(releaseSet)}\n`);
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
