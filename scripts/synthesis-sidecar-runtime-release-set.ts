import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { rebuildSynthesisSidecarRuntimePrebuildResult } from "../packages/synthesis-contracts/src/sidecarRuntimeRelease";

export const SYNTHESIS_SIDECAR_RUNTIME_RELEASE_SET_PATH =
  "synthesis-sidecar/release-set.json";
export const SYNTHESIS_SIDECAR_RUNTIME_RELEASE_RECEIPT_PATH =
  "synthesis-sidecar/latest-complete-release-receipt.json";

function sha(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export function createSynthesisSidecarRuntimeReleaseSet(args: {
  sourceCommit: string;
  prebuildResult: unknown;
}) {
  if (!/^[a-f0-9]{40}$/.test(args.sourceCommit)) {
    throw new Error("Sidecar release source commit must be a full SHA");
  }
  const prebuild = rebuildSynthesisSidecarRuntimePrebuildResult(
    args.prebuildResult,
  );
  if (prebuild.sourceSha !== args.sourceCommit) {
    throw new Error("Prebuild result source SHA does not match release source");
  }
  const releaseSetId = `ssrs-${sha(`${args.sourceCommit}\n${prebuild.aggregate}\n${prebuild.prebuildCommit}\n`).slice(0, 20)}`;
  return Object.freeze({
    schema: "synthesis-sidecar-runtime-release-set.v1" as const,
    releaseSetId,
    sourceCommit: args.sourceCommit,
    prebuild: {
      result: prebuild,
      aggregate: prebuild.aggregate,
      buildFingerprint: prebuild.buildFingerprint,
    },
    materialized: {
      addonRoot: "addon/bin",
      targetBundleDirectory: "synthesis-sidecar",
      targets: [
        "win32-x64",
        "darwin-x64",
        "darwin-arm64",
        "linux-x86",
        "linux-x64",
        "linux-arm",
        "linux-arm64",
      ],
    },
  });
}

export async function readSynthesisSidecarRuntimeReleaseSet(
  root = process.cwd(),
) {
  return JSON.parse(
    await fs.readFile(
      path.join(root, SYNTHESIS_SIDECAR_RUNTIME_RELEASE_SET_PATH),
      "utf8",
    ),
  ) as ReturnType<typeof createSynthesisSidecarRuntimeReleaseSet>;
}

function argument(name: string) {
  return process.argv
    .find((entry) => entry.startsWith(`--${name}=`))
    ?.slice(name.length + 3);
}

async function main() {
  const sourceCommit = String(argument("source-commit") || "").trim();
  const resultPath = String(argument("prebuild-result") || "").trim();
  if (!sourceCommit || !resultPath)
    throw new Error("--source-commit and --prebuild-result are required");
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
