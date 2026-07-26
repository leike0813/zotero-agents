import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  SYNTHESIS_SIDECAR_RUNTIME_ADDON_ROOT,
  SYNTHESIS_SIDECAR_RUNTIME_TARGET_MATRIX,
  computeSynthesisSidecarRuntimeBuildFingerprint,
  verifySynthesisSidecarRuntimeBundleDirectory,
} from "./synthesis-sidecar-runtime-release-governance";

export async function checkSynthesisSidecarRuntimeFreshness(
  root = process.cwd(),
  assetRoot = path.join(root, SYNTHESIS_SIDECAR_RUNTIME_ADDON_ROOT),
) {
  const build = await computeSynthesisSidecarRuntimeBuildFingerprint(root);
  const diagnostics: Array<Record<string, unknown>> = [];
  for (const target of SYNTHESIS_SIDECAR_RUNTIME_TARGET_MATRIX) {
    const result = await verifySynthesisSidecarRuntimeBundleDirectory({
      root: path.join(assetRoot, target),
      target,
      expectedBuildFingerprint: build.fingerprint,
    }).catch((error) => ({
      ok: false,
      diagnostics: [
        {
          code: "bundle_unreadable",
          target,
          message: error instanceof Error ? error.message : String(error),
        },
      ],
    }));
    if (!result.ok) {
      diagnostics.push(...result.diagnostics);
    }
  }
  return {
    ok: diagnostics.length === 0,
    implementation: "rust-native",
    buildFingerprint: build.fingerprint,
    targets: [...SYNTHESIS_SIDECAR_RUNTIME_TARGET_MATRIX],
    diagnostics,
  };
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const assetRoot = process.argv
    .find((value) => value.startsWith("--asset-root="))
    ?.slice("--asset-root=".length);
  checkSynthesisSidecarRuntimeFreshness(
    process.cwd(),
    assetRoot ? path.resolve(assetRoot) : undefined,
  )
    .then((result) => {
      process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
      if (!result.ok) {
        process.exitCode = 1;
      }
    })
    .catch((error) => {
      console.error(error instanceof Error ? error.message : String(error));
      process.exitCode = 1;
    });
}
