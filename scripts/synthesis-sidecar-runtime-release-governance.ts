import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import {
  SYNTHESIS_SIDECAR_NODE_VERSION,
  SYNTHESIS_SIDECAR_RUNTIME_TARGETS,
  rebuildSynthesisSidecarRuntimeBundleManifest,
  type SynthesisSidecarRuntimeBundleManifest,
  type SynthesisSidecarRuntimeTarget,
} from "../packages/synthesis-contracts/src/sidecarRuntimeBundle";

export const SYNTHESIS_SIDECAR_RUNTIME_PREBUILD_TAG =
  "synthesis-sidecar-runtime-prebuilds";
export const SYNTHESIS_SIDECAR_RUNTIME_ADDON_ROOT =
  "addon/bin/synthesis-sidecar";
export const SYNTHESIS_SIDECAR_RUNTIME_BUILD_ROOT =
  ".scaffold/synthesis-sidecar-runtime";
export const SYNTHESIS_SIDECAR_RUNTIME_NODE_VERSION =
  SYNTHESIS_SIDECAR_NODE_VERSION;
export const SYNTHESIS_SIDECAR_RUNTIME_TARGET_MATRIX =
  SYNTHESIS_SIDECAR_RUNTIME_TARGETS;
export const SYNTHESIS_SIDECAR_COMPUTE_RUNTIME_PACKAGES = [
  "d3-dispatch",
  "d3-force",
  "d3-quadtree",
  "d3-timer",
] as const;

const FINGERPRINT_STATIC_INPUTS = [
  ".github/workflows/build-synthesis-sidecar-runtime.yml",
  "apps/synthesis-service/package.json",
  "apps/synthesis-service/tsconfig.json",
  "apps/synthesis-service/tsconfig.build.json",
  "package.json",
  "package-lock.json",
  "packages/synthesis-engine/package.json",
  "packages/synthesis-engine/tsconfig.json",
  "packages/synthesis-repository/package.json",
  "packages/synthesis-repository/tsconfig.json",
  "packages/synthesis-application/package.json",
  "packages/synthesis-application/tsconfig.json",
  "packages/synthesis-contracts/src/sidecarRuntimeBundle.ts",
  "packages/synthesis-contracts/src/sidecarLifecycle.ts",
  "packages/synthesis-contracts/src/sidecarSystem.ts",
  "scripts/check-synthesis-sidecar-runtime-freshness.ts",
  "scripts/package-synthesis-sidecar-runtime.ts",
  "scripts/synthesis-sidecar-runtime-release-governance.ts",
] as const;

async function collectFiles(root: string, relativeDir: string) {
  const absoluteDir = path.join(root, relativeDir);
  const entries = await fs.readdir(absoluteDir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries.sort((left, right) =>
    left.name.localeCompare(right.name),
  )) {
    const relativePath = path.posix.join(relativeDir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectFiles(root, relativePath)));
    } else if (entry.isFile()) {
      files.push(relativePath);
    }
  }
  return files;
}

export async function synthesisSidecarRuntimeFingerprintInputs(
  root = process.cwd(),
) {
  const computeRuntimeInputs = (
    await Promise.all(
      SYNTHESIS_SIDECAR_COMPUTE_RUNTIME_PACKAGES.map(async (packageName) => [
        `node_modules/${packageName}/package.json`,
        `node_modules/${packageName}/LICENSE`,
        ...(await collectFiles(root, `node_modules/${packageName}/src`)),
      ]),
    )
  ).flat();
  const dynamicInputs = [
    ...(await collectFiles(root, "apps/synthesis-service/src")),
    ...(await collectFiles(root, "packages/synthesis-engine/src")),
    ...(await collectFiles(root, "packages/synthesis-repository/src")),
    ...(await collectFiles(root, "packages/synthesis-application/src")),
    ...(await collectFiles(root, "packages/synthesis-contracts/src")).filter(
      (file) =>
        file.endsWith("/sidecarLifecycle.ts") ||
        file.endsWith("/sidecarSystem.ts") ||
        file.endsWith("/sidecarCanonicalStore.ts") ||
        file.endsWith("/citationGraphApplication.ts") ||
        file.endsWith("/referenceRefreshApplication.ts") ||
        file.endsWith("/referenceMatchingReviewApplication.ts") ||
        file.endsWith("/tagVocabularyApplication.ts") ||
        file.endsWith("/conceptKbApplication.ts") ||
        file.endsWith("/conceptKbCore.ts") ||
        file.endsWith("/topicGraphApplication.ts") ||
        file.endsWith("/topicGraphCore.ts") ||
        file.endsWith("/tagVocabularyCore.ts") ||
        file.endsWith("/hostRead.ts") ||
        file.endsWith("/topicApplication.ts") ||
        file.endsWith("/workbench.ts") ||
        file.endsWith("/sidecarTransfer.ts") ||
        file.endsWith("/sidecarRuntimeBundle.ts"),
    ),
    ...computeRuntimeInputs,
  ];
  return Array.from(
    new Set([...FINGERPRINT_STATIC_INPUTS, ...dynamicInputs]),
  ).sort();
}

export function sha256Bytes(bytes: Uint8Array | string) {
  return createHash("sha256").update(bytes).digest("hex");
}

export async function sha256File(filePath: string) {
  return sha256Bytes(await fs.readFile(filePath));
}

export async function computeSynthesisSidecarRuntimeBuildFingerprint(
  root = process.cwd(),
) {
  const inputs = await synthesisSidecarRuntimeFingerprintInputs(root);
  const hash = createHash("sha256");
  hash.update(
    `synthesis-sidecar-runtime\nnode=${SYNTHESIS_SIDECAR_RUNTIME_NODE_VERSION}\n`,
  );
  for (const relativePath of inputs) {
    hash.update(`${relativePath}\0`);
    hash.update(await fs.readFile(path.join(root, relativePath)));
    hash.update("\0");
  }
  return {
    fingerprint: hash.digest("hex"),
    inputs,
  };
}

export function computeSynthesisSidecarRuntimeBundleId(
  manifest: Omit<SynthesisSidecarRuntimeBundleManifest, "bundleId">,
) {
  return sha256Bytes(`${JSON.stringify(manifest)}\n`);
}

export async function readSynthesisSidecarRuntimeManifest(
  manifestPath: string,
) {
  return rebuildSynthesisSidecarRuntimeBundleManifest(
    JSON.parse(await fs.readFile(manifestPath, "utf8")),
  );
}

export async function verifySynthesisSidecarRuntimeBundleDirectory(args: {
  root: string;
  target: SynthesisSidecarRuntimeTarget;
  expectedBuildFingerprint?: string;
}) {
  const manifestPath = path.join(args.root, "manifest.json");
  const manifest = await readSynthesisSidecarRuntimeManifest(manifestPath);
  const diagnostics: Array<Record<string, unknown>> = [];
  if (manifest.target !== args.target) {
    diagnostics.push({
      code: "target_mismatch",
      expected: args.target,
      actual: manifest.target,
    });
  }
  if (
    args.expectedBuildFingerprint &&
    manifest.buildFingerprint !== args.expectedBuildFingerprint
  ) {
    diagnostics.push({
      code: "build_fingerprint_mismatch",
      expected: args.expectedBuildFingerprint,
      actual: manifest.buildFingerprint,
    });
  }
  for (const entry of manifest.files) {
    const filePath = path.join(args.root, ...entry.path.split("/"));
    try {
      const stat = await fs.stat(filePath);
      const actualSha256 = await sha256File(filePath);
      if (
        !stat.isFile() ||
        stat.size !== entry.bytes ||
        actualSha256 !== entry.sha256
      ) {
        diagnostics.push({
          code: "file_mismatch",
          path: entry.path,
          expectedBytes: entry.bytes,
          actualBytes: stat.size,
          expectedSha256: entry.sha256,
          actualSha256,
        });
      }
    } catch {
      diagnostics.push({ code: "file_missing", path: entry.path });
    }
  }
  return {
    ok: diagnostics.length === 0,
    manifest,
    diagnostics,
  };
}

export function runtimeArchiveName(target: SynthesisSidecarRuntimeTarget) {
  if (target === "win32-x64") {
    return `node-v${SYNTHESIS_SIDECAR_RUNTIME_NODE_VERSION}-win-x64.zip`;
  }
  return `node-v${SYNTHESIS_SIDECAR_RUNTIME_NODE_VERSION}-${target}.tar.${
    target.startsWith("linux") ? "xz" : "gz"
  }`;
}

export function runtimeArchiveDirectory(target: SynthesisSidecarRuntimeTarget) {
  return runtimeArchiveName(target).replace(/\.(?:zip|tar\.(?:xz|gz))$/, "");
}
