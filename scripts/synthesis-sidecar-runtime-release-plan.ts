import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  SYNTHESIS_SIDECAR_RUNTIME_RELEASE_RECEIPT_PATH,
  SYNTHESIS_SIDECAR_RUNTIME_RELEASE_SET_PATH,
  readSynthesisSidecarRuntimeReleaseSet,
} from "./synthesis-sidecar-runtime-release-set";

export async function createSynthesisSidecarRuntimeReleasePlan(
  root = process.cwd(),
) {
  const releaseSet = await readSynthesisSidecarRuntimeReleaseSet(root);
  const receiptPath = path.join(
    root,
    SYNTHESIS_SIDECAR_RUNTIME_RELEASE_RECEIPT_PATH,
  );
  const receipt = await fs
    .readFile(receiptPath, "utf8")
    .then(JSON.parse)
    .catch(() => null);
  return {
    schema: "synthesis-sidecar-runtime-release-plan.v1",
    releaseSetId: releaseSet.releaseSetId,
    sourceCommit: releaseSet.sourceCommit,
    aggregate: releaseSet.prebuild.aggregate,
    buildFingerprint: releaseSet.prebuild.buildFingerprint,
    completeReceipt: Boolean(
      receipt?.schema === "synthesis-sidecar-runtime-release-receipt.v1" &&
      receipt?.status === "complete" &&
      receipt?.releaseSetId === releaseSet.releaseSetId &&
      receipt?.aggregate === releaseSet.prebuild.aggregate,
    ),
  };
}

async function main() {
  const plan = await createSynthesisSidecarRuntimeReleasePlan();
  const output = process.argv
    .find((entry) => entry.startsWith("--output="))
    ?.slice(9);
  if (output)
    await fs.writeFile(
      path.resolve(output),
      `${JSON.stringify(plan, null, 2)}\n`,
    );
  else process.stdout.write(`${JSON.stringify(plan, null, 2)}\n`);
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
