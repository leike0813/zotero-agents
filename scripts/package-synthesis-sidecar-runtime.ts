import fs from "node:fs/promises";
import path from "node:path";
import {
  SYNTHESIS_SIDECAR_RUNTIME_BUNDLE_SCHEMA,
  SYNTHESIS_SIDECAR_RUNTIME_TARGETS,
  SYNTHESIS_SIDECAR_RUNTIME_TARGET_TRIPLES,
  rebuildSynthesisSidecarRuntimeBundleManifest,
  type SynthesisSidecarRuntimeBundleFile,
  type SynthesisSidecarRuntimeTarget,
} from "../packages/synthesis-contracts/src/sidecarRuntimeBundle";
import { SYNTHESIS_SIDECAR_CAPABILITIES } from "../packages/synthesis-contracts/src/sidecarSystem";
import {
  SYNTHESIS_SIDECAR_RUNTIME_BUILD_ROOT,
  computeSynthesisSidecarRuntimeBuildFingerprint,
  computeSynthesisRustSidecarSourceFingerprint,
  computeSynthesisSidecarRuntimeBundleId,
  sha256File,
  verifySynthesisSidecarRuntimeBundleDirectory,
} from "./synthesis-sidecar-runtime-release-governance";

function argument(name: string) {
  const prefix = `--${name}=`;
  return process.argv
    .find((value) => value.startsWith(prefix))
    ?.slice(prefix.length);
}

function requiredArgument(name: string) {
  const value = String(argument(name) || "").trim();
  if (!value) {
    throw new Error(`Missing required --${name}=...`);
  }
  return value;
}

function targetArgument(): SynthesisSidecarRuntimeTarget {
  const target = requiredArgument("target");
  if (
    !SYNTHESIS_SIDECAR_RUNTIME_TARGETS.includes(
      target as SynthesisSidecarRuntimeTarget,
    )
  ) {
    throw new Error(`Unsupported Synthesis runtime target: ${target}`);
  }
  return target as SynthesisSidecarRuntimeTarget;
}

async function collectFiles(root: string) {
  const entries = await fs.readdir(root, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries.sort((left, right) =>
    left.name.localeCompare(right.name),
  )) {
    if (entry.isSymbolicLink() || !entry.isFile()) {
      throw new Error(`Invalid native runtime entry: ${entry.name}`);
    }
    if (entry.name !== "manifest.json") {
      files.push(entry.name);
    }
  }
  return files;
}

async function main() {
  const root = process.cwd();
  const target = targetArgument();
  const source = path.resolve(requiredArgument("rust-sidecar"));
  if (!(await fs.stat(source)).isFile()) {
    throw new Error("Rust sidecar must be a regular file");
  }
  const outputRoot = path.resolve(
    argument("output") ||
      path.join(SYNTHESIS_SIDECAR_RUNTIME_BUILD_ROOT, target),
  );
  await fs.rm(outputRoot, { recursive: true, force: true });
  await fs.mkdir(outputRoot, { recursive: true });

  const executable =
    target === "win32-x64" ? "synthesis-sidecar.exe" : "synthesis-sidecar";
  await fs.copyFile(source, path.join(outputRoot, executable));
  if (target !== "win32-x64") {
    await fs.chmod(path.join(outputRoot, executable), 0o755);
  }
  await fs.copyFile(
    path.join(root, "LICENSE"),
    path.join(outputRoot, "LICENSE-AGPL-3.0.txt"),
  );
  await fs.copyFile(
    path.join(root, "native/synthesis-sidecar/licenses.json"),
    path.join(outputRoot, "licenses.json"),
  );

  const native = await computeSynthesisRustSidecarSourceFingerprint(root);
  const cargoLockSha256 = await sha256File(
    path.join(root, "native/synthesis-sidecar/Cargo.lock"),
  );
  const toolchain = (
    await fs.readFile(
      path.join(root, "native/synthesis-sidecar/rust-toolchain.toml"),
      "utf8",
    )
  ).match(/channel\s*=\s*"([^"]+)"/)?.[1];
  if (!toolchain) {
    throw new Error("Rust toolchain is missing");
  }
  await fs.writeFile(
    path.join(outputRoot, "provenance.json"),
    `${JSON.stringify(
      {
        schema: "synthesis-rust-sidecar-provenance.v2",
        target,
        targetTriple: SYNTHESIS_SIDECAR_RUNTIME_TARGET_TRIPLES[target],
        sourceFingerprint: native.fingerprint,
        toolchain,
        cargoLockSha256,
        licenseInventory: "licenses.json",
      },
      null,
      2,
    )}\n`,
    "utf8",
  );

  const files: SynthesisSidecarRuntimeBundleFile[] = [];
  for (const relativePath of await collectFiles(outputRoot)) {
    const filePath = path.join(outputRoot, relativePath);
    const stat = await fs.stat(filePath);
    files.push({
      path: relativePath,
      bytes: stat.size,
      sha256: await sha256File(filePath),
      executable: relativePath === executable,
    });
  }
  files.sort((left, right) => left.path.localeCompare(right.path));

  const build = await computeSynthesisSidecarRuntimeBuildFingerprint(root);
  const workspace = await fs.readFile(
    path.join(root, "native/synthesis-sidecar/Cargo.toml"),
    "utf8",
  );
  const serviceVersion =
    workspace.match(
      /\[workspace\.package\][\s\S]*?version\s*=\s*"([^"]+)"/,
    )?.[1] || "";
  const createdAt = requiredArgument("created-at");
  const expiresAtArgument = argument("expires-at");
  const baseManifest = {
    schema: SYNTHESIS_SIDECAR_RUNTIME_BUNDLE_SCHEMA,
    implementation: "rust-native" as const,
    serviceVersion,
    protocolVersion: "synthesis-sidecar.v1" as const,
    target,
    targetTriple: SYNTHESIS_SIDECAR_RUNTIME_TARGET_TRIPLES[target],
    executable,
    buildFingerprint: build.fingerprint,
    capabilities: [...SYNTHESIS_SIDECAR_CAPABILITIES],
    createdAt,
    expiresAt: expiresAtArgument?.trim() || null,
    provenance: {
      sourceFingerprint: native.fingerprint,
      toolchain,
      cargoLockSha256,
      licenseInventory: "licenses.json",
    },
    files,
  };
  const manifest = rebuildSynthesisSidecarRuntimeBundleManifest({
    ...baseManifest,
    bundleId: computeSynthesisSidecarRuntimeBundleId(baseManifest),
  });
  await fs.writeFile(
    path.join(outputRoot, "manifest.json"),
    `${JSON.stringify(manifest, null, 2)}\n`,
    "utf8",
  );
  const verification = await verifySynthesisSidecarRuntimeBundleDirectory({
    root: outputRoot,
    target,
    expectedBuildFingerprint: build.fingerprint,
    expectedSourceFingerprint: native.fingerprint,
    policy: "candidate",
  });
  if (!verification.ok) {
    throw new Error(
      `Invalid packaged Synthesis sidecar runtime: ${JSON.stringify(verification.diagnostics)}`,
    );
  }
  process.stdout.write(
    `${JSON.stringify({
      ok: true,
      target,
      outputRoot,
      bundleId: manifest.bundleId,
      buildFingerprint: manifest.buildFingerprint,
      files: manifest.files.length,
    })}\n`,
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
