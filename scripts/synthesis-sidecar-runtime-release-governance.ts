import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import {
  SYNTHESIS_SIDECAR_RUNTIME_TARGETS,
  SYNTHESIS_SIDECAR_RUNTIME_TARGET_TRIPLES,
  isExpiredSynthesisSidecarRuntimeManifest,
  rebuildSynthesisSidecarRuntimeBundleManifest,
  synthesisSidecarRuntimeTargetBundlePath,
  type SynthesisSidecarRuntimeBundleManifest,
  type SynthesisSidecarRuntimeTarget,
} from "../packages/synthesis-contracts/src/sidecarRuntimeBundle";

export const SYNTHESIS_SIDECAR_RUNTIME_PREBUILD_TAG =
  "synthesis-sidecar-runtime-prebuilds";
export const SYNTHESIS_SIDECAR_RUNTIME_ADDON_ROOT = "addon/bin";
export const SYNTHESIS_SIDECAR_RUNTIME_BUILD_ROOT =
  ".scaffold/synthesis-sidecar-runtime";

export function synthesisSidecarRuntimeAddonBundleRoot(
  addonRoot: string,
  target: SynthesisSidecarRuntimeTarget,
) {
  return path.join(addonRoot, synthesisSidecarRuntimeTargetBundlePath(target));
}
export const SYNTHESIS_SIDECAR_RUNTIME_TARGET_MATRIX =
  SYNTHESIS_SIDECAR_RUNTIME_TARGETS;
export const SYNTHESIS_SIDECAR_RUNTIME_BUILD_RECIPE_PATH =
  "native/synthesis-sidecar/build-recipe.json";

export type SynthesisSidecarRuntimeBuildRecipe = Readonly<{
  schema: "synthesis-sidecar.build-recipe.v1";
  toolchain: Readonly<{
    node: string;
    rust: string;
    zig: string;
    cargoZigbuild: string;
  }>;
  targets: readonly Readonly<{
    runner: string;
    platform: SynthesisSidecarRuntimeTarget;
    target: string;
    binary: string;
    useZig: boolean;
    nativeSmoke: boolean;
  }>[];
}>;

export function readSynthesisSidecarRuntimeBuildRecipe(
  options: {
    root?: string;
  } = {},
): SynthesisSidecarRuntimeBuildRecipe {
  const root = path.resolve(options.root || process.cwd());
  const recipe = JSON.parse(
    readFileSync(
      path.join(root, SYNTHESIS_SIDECAR_RUNTIME_BUILD_RECIPE_PATH),
      "utf8",
    ),
  ) as SynthesisSidecarRuntimeBuildRecipe;
  if (
    recipe.schema !== "synthesis-sidecar.build-recipe.v1" ||
    !recipe.toolchain ||
    !Array.isArray(recipe.targets) ||
    recipe.targets.length !== SYNTHESIS_SIDECAR_RUNTIME_TARGETS.length
  ) {
    throw new Error("Synthesis sidecar build recipe is invalid");
  }
  for (const field of ["node", "rust", "zig", "cargoZigbuild"] as const) {
    if (!recipe.toolchain[field]?.trim()) {
      throw new Error(
        `Synthesis sidecar build recipe is missing toolchain.${field}`,
      );
    }
  }
  const platforms = new Set<SynthesisSidecarRuntimeTarget>();
  for (const target of recipe.targets) {
    if (
      !SYNTHESIS_SIDECAR_RUNTIME_TARGETS.includes(target.platform) ||
      platforms.has(target.platform) ||
      target.target !==
        SYNTHESIS_SIDECAR_RUNTIME_TARGET_TRIPLES[target.platform] ||
      !target.runner.trim() ||
      !target.binary.trim() ||
      typeof target.useZig !== "boolean" ||
      typeof target.nativeSmoke !== "boolean" ||
      target.useZig !==
        (target.platform.startsWith("linux-") &&
          target.platform !== "linux-arm64")
    ) {
      throw new Error(
        "Synthesis sidecar build recipe contains an invalid target",
      );
    }
    platforms.add(target.platform);
  }
  for (const target of SYNTHESIS_SIDECAR_RUNTIME_TARGETS) {
    if (!platforms.has(target)) {
      throw new Error(`Synthesis sidecar build recipe is missing ${target}`);
    }
  }
  return recipe;
}

const SYNTHESIS_RUST_SIDECAR_ROOT = "native/synthesis-sidecar";
const SOURCE_STATIC_INPUTS = [
  "native/synthesis-sidecar/Cargo.toml",
  "native/synthesis-sidecar/Cargo.lock",
  "native/synthesis-sidecar/rust-toolchain.toml",
  "packages/synthesis-contracts/contract-set/synthesis-native-runtime-v2/corpus.json",
  "packages/synthesis-contracts/contract-set/synthesis-native-worker-transfer-v1/corpus.json",
  "packages/synthesis-contracts/contract-set/synthesis-durable-foundation-v1/corpus.json",
] as const;
const BUILD_STATIC_INPUTS = [
  SYNTHESIS_SIDECAR_RUNTIME_BUILD_RECIPE_PATH,
  "native/synthesis-sidecar/licenses.json",
  "package.json",
  "package-lock.json",
  "packages/synthesis-contracts/src/sidecarRuntimeBundle.ts",
  "scripts/package-synthesis-sidecar-runtime.ts",
] as const;
const VERIFICATION_STATIC_INPUTS = [
] as const;
const PREBUILD_PIPELINE_STATIC_INPUTS = [
  ".github/workflows/prebuild-synthesis-sidecar-runtime.yml",
  "packages/synthesis-contracts/src/sidecarRuntimeRelease.ts",
  "scripts/download-synthesis-sidecar-runtime-cache.ts",
  "scripts/publish-synthesis-sidecar-runtime-prebuild.ts",
  "scripts/resolve-synthesis-sidecar-runtime-cache.ts",
  "scripts/stage-synthesis-sidecar-runtime-prebuilds.ts",
  "scripts/synthesis-sidecar-runtime-release-governance.ts",
] as const;
const VERIFICATION_PIPELINE_STATIC_INPUTS = [
  ".github/workflows/verify-synthesis-sidecar.yml",
  "packages/synthesis-contracts/src/sidecarRuntimeRelease.ts",
  "scripts/synthesis-sidecar-runtime-release-governance.ts",
] as const;
const RELEASE_PIPELINE_STATIC_INPUTS = [
  ".github/workflows/release-synthesis-sidecar.yml",
  "packages/synthesis-contracts/src/sidecarRuntimeRelease.ts",
  "scripts/prepare-synthesis-sidecar-release.ts",
  "scripts/resolve-synthesis-sidecar-verification.ts",
  "scripts/sync-synthesis-sidecar-runtime-prebuilds.ts",
  "scripts/synthesis-sidecar-runtime-release-governance.ts",
  "scripts/synthesis-sidecar-runtime-release-plan.ts",
  "scripts/synthesis-sidecar-runtime-release-set.ts",
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

function uniqueInputs(inputs: readonly string[]) {
  return Array.from(new Set(inputs)).sort();
}

async function hashInputs(
  root: string,
  domain: string,
  inputs: readonly string[],
) {
  const hash = createHash("sha256");
  hash.update(`${domain}\n`);
  for (const relativePath of inputs) {
    hash.update(`${relativePath}\0`);
    hash.update(await fs.readFile(path.join(root, relativePath)));
    hash.update("\0");
  }
  return { fingerprint: hash.digest("hex"), inputs };
}

export async function synthesisSidecarRuntimeIdentityInputs(
  root = process.cwd(),
) {
  const rustFiles = (
    await collectFiles(root, SYNTHESIS_RUST_SIDECAR_ROOT)
  ).filter((file) => !file.includes("/target/"));
  const runtimeRustFiles = rustFiles.filter(
    (file) =>
      !file.includes("/crates/synthesis-test-support/") &&
      !file.includes("/tests/") &&
      (file.endsWith(".rs") ||
        file.endsWith("/Cargo.toml") ||
        file.includes("/.cargo/")),
  );
  const contractFiles = (
    await collectFiles(root, "packages/synthesis-contracts/src")
  ).filter((file) =>
    /(?:sidecar|citationGraph|reference|tagVocabulary|conceptKb|knowledgeCheckpoint|durableBundle|webDav|topic|workbench|hostRead)/.test(
      file,
    ),
  );
  const verificationScripts = (await collectFiles(root, "scripts")).filter(
    (file) =>
      /\/check-synthesis-/.test(file) || /\/smoke-synthesis-rust-/.test(file),
  );
  const verificationOracleFiles = (
    await Promise.all(
      [
        "packages/synthesis-application/src",
        "packages/synthesis-contracts/contract-set",
        "packages/synthesis-engine/src",
        "packages/synthesis-repository/src",
      ].map((directory) => collectFiles(root, directory)),
    )
  ).flat();
  const source = uniqueInputs([
    ...SOURCE_STATIC_INPUTS,
    ...runtimeRustFiles,
    ...contractFiles,
  ]);
  const build = uniqueInputs([...source, ...BUILD_STATIC_INPUTS]);
  const verification = uniqueInputs([
    ...build,
    ...rustFiles,
    ...verificationOracleFiles,
    ...verificationScripts,
    ...VERIFICATION_STATIC_INPUTS,
  ]);
  const prebuildPipeline = uniqueInputs([...PREBUILD_PIPELINE_STATIC_INPUTS]);
  const verificationPipeline = uniqueInputs([
    ...VERIFICATION_PIPELINE_STATIC_INPUTS,
  ]);
  const releasePipeline = uniqueInputs([...RELEASE_PIPELINE_STATIC_INPUTS]);
  return Object.freeze({
    source,
    build,
    verification,
    prebuildPipeline,
    verificationPipeline,
    releasePipeline,
  });
}

export async function computeSynthesisSidecarRuntimeIdentities(
  root = process.cwd(),
) {
  const inputs = await synthesisSidecarRuntimeIdentityInputs(root);
  const [
    source,
    build,
    verification,
    prebuildPipeline,
    verificationPipeline,
    releasePipeline,
  ] = await Promise.all([
    hashInputs(root, "synthesis-sidecar-source.v1", inputs.source),
    hashInputs(root, "synthesis-sidecar-build.v1", inputs.build),
    hashInputs(root, "synthesis-sidecar-verification.v1", inputs.verification),
    hashInputs(
      root,
      "synthesis-sidecar-prebuild-pipeline.v1",
      inputs.prebuildPipeline,
    ),
    hashInputs(
      root,
      "synthesis-sidecar-verification-pipeline.v1",
      inputs.verificationPipeline,
    ),
    hashInputs(
      root,
      "synthesis-sidecar-release-pipeline.v1",
      inputs.releasePipeline,
    ),
  ]);
  return Object.freeze({
    sourceFingerprint: source.fingerprint,
    buildFingerprint: build.fingerprint,
    verificationFingerprint: verification.fingerprint,
    prebuildPipelineRevision: prebuildPipeline.fingerprint,
    verificationPipelineRevision: verificationPipeline.fingerprint,
    releasePipelineRevision: releasePipeline.fingerprint,
    inputs,
  });
}

export async function synthesisSidecarRuntimeFingerprintInputs(
  root = process.cwd(),
) {
  return (await synthesisSidecarRuntimeIdentityInputs(root)).build;
}

export async function computeSynthesisRustSidecarSourceFingerprint(
  root = process.cwd(),
) {
  const identities = await computeSynthesisSidecarRuntimeIdentities(root);
  return {
    fingerprint: identities.sourceFingerprint,
    inputs: identities.inputs.source,
  };
}

export function sha256Bytes(bytes: Uint8Array | string) {
  return createHash("sha256").update(bytes).digest("hex");
}

export async function sha256File(filePath: string) {
  return sha256Bytes(await fs.readFile(filePath));
}

export function assertSynthesisSidecarRuntimeArchiveLayout(args: {
  archivePath: string;
  target: SynthesisSidecarRuntimeTarget;
}) {
  const result = spawnSync("tar", ["-tzf", args.archivePath], {
    encoding: "utf8",
  });
  if (result.error || result.status !== 0) {
    throw (
      result.error || new Error(`Unable to inspect archive ${args.archivePath}`)
    );
  }
  const entries = result.stdout.split(/\r?\n/).filter(Boolean);
  if (
    entries.length === 0 ||
    entries.some(
      (entry) =>
        (entry !== args.target && !entry.startsWith(`${args.target}/`)) ||
        entry.includes("..") ||
        entry.startsWith("/"),
    )
  ) {
    throw new Error(
      `Archive has unsafe or unexpected paths: ${path.basename(args.archivePath)}`,
    );
  }
}

export async function computeSynthesisSidecarRuntimeBuildFingerprint(
  root = process.cwd(),
) {
  const identities = await computeSynthesisSidecarRuntimeIdentities(root);
  return {
    fingerprint: identities.buildFingerprint,
    inputs: identities.inputs.build,
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
  expectedSourceFingerprint?: string;
  policy?: "candidate" | "production";
  nowMs?: number;
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
  if (
    args.expectedSourceFingerprint &&
    manifest.provenance.sourceFingerprint !== args.expectedSourceFingerprint
  ) {
    diagnostics.push({
      code: "source_fingerprint_mismatch",
      expected: args.expectedSourceFingerprint,
      actual: manifest.provenance.sourceFingerprint,
    });
  }
  if (isExpiredSynthesisSidecarRuntimeManifest(manifest, args.nowMs)) {
    diagnostics.push({
      code: "bundle_expired",
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
  return `synthesis-sidecar-runtime-${target}.tar.gz`;
}

export function runtimeArchiveDirectory(target: SynthesisSidecarRuntimeTarget) {
  return target;
}
