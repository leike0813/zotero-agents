import fs from "node:fs/promises";
import path from "node:path";
import {
  SYNTHESIS_SIDECAR_RUNTIME_BUNDLE_SCHEMA,
  SYNTHESIS_SIDECAR_RUNTIME_TARGETS,
  rebuildSynthesisSidecarRuntimeBundleManifest,
  type SynthesisSidecarRuntimeBundleFile,
  type SynthesisSidecarRuntimeTarget,
} from "../packages/synthesis-contracts/src/sidecarRuntimeBundle";
import {
  SYNTHESIS_SIDECAR_RUNTIME_BUILD_ROOT,
  SYNTHESIS_SIDECAR_COMPUTE_RUNTIME_PACKAGES,
  SYNTHESIS_SIDECAR_RUNTIME_NODE_VERSION,
  computeSynthesisSidecarRuntimeBuildFingerprint,
  computeSynthesisSidecarRuntimeBundleId,
  runtimeArchiveName,
  sha256File,
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

async function collectFiles(root: string, relativeDir = "") {
  const directory = path.join(root, ...relativeDir.split("/").filter(Boolean));
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries.sort((left, right) =>
    left.name.localeCompare(right.name),
  )) {
    const relativePath = relativeDir
      ? `${relativeDir}/${entry.name}`
      : entry.name;
    if (entry.isSymbolicLink()) {
      throw new Error(
        `Symlink is not allowed in runtime bundle: ${relativePath}`,
      );
    }
    if (entry.isDirectory()) {
      files.push(...(await collectFiles(root, relativePath)));
    } else if (entry.isFile() && relativePath !== "manifest.json") {
      files.push(relativePath);
    }
  }
  return files;
}

async function copyServiceTree(root: string, outputRoot: string) {
  const source = path.join(root, ".scaffold/synthesis-service");
  await fs.access(
    path.join(source, "apps/synthesis-service/src/entrypoint.js"),
  );
  await fs.cp(source, path.join(outputRoot, "service"), {
    recursive: true,
    dereference: false,
  });
}

async function copyComputeRuntimeDependencies(
  root: string,
  outputRoot: string,
) {
  const modulesRoot = path.join(outputRoot, "service", "node_modules");
  for (const packageName of SYNTHESIS_SIDECAR_COMPUTE_RUNTIME_PACKAGES) {
    const sourceRoot = path.join(root, "node_modules", packageName);
    const targetRoot = path.join(modulesRoot, packageName);
    await fs.mkdir(targetRoot, { recursive: true });
    for (const entry of ["package.json", "LICENSE"]) {
      await fs.copyFile(
        path.join(sourceRoot, entry),
        path.join(targetRoot, entry),
      );
    }
    await fs.cp(path.join(sourceRoot, "src"), path.join(targetRoot, "src"), {
      recursive: true,
      dereference: false,
    });
  }
}

async function main() {
  const root = process.cwd();
  const target = targetArgument();
  const nodeRoot = path.resolve(requiredArgument("node-root"));
  const upstreamSha256 = requiredArgument("upstream-sha256").toLowerCase();
  if (!/^[a-f0-9]{64}$/.test(upstreamSha256)) {
    throw new Error("Invalid upstream archive SHA-256");
  }
  if (requiredArgument("upstream-signature") !== "verified") {
    throw new Error("Upstream Node release signature must be verified");
  }
  const expectedPlatformSignature = target.startsWith("linux")
    ? "not-applicable"
    : "verified";
  if (requiredArgument("platform-signature") !== expectedPlatformSignature) {
    throw new Error(
      `Platform signature must be ${expectedPlatformSignature} for ${target}`,
    );
  }
  const outputRoot = path.resolve(
    argument("output") ||
      path.join(SYNTHESIS_SIDECAR_RUNTIME_BUILD_ROOT, target),
  );
  await fs.rm(outputRoot, { recursive: true, force: true });
  await fs.mkdir(outputRoot, { recursive: true });

  const executable = target === "win32-x64" ? "node.exe" : "node";
  const sourceExecutable =
    target === "win32-x64"
      ? path.join(nodeRoot, "node.exe")
      : path.join(nodeRoot, "bin", "node");
  await fs.copyFile(sourceExecutable, path.join(outputRoot, executable));
  if (target !== "win32-x64") {
    await fs.chmod(path.join(outputRoot, executable), 0o755);
  }
  await fs.copyFile(
    path.join(nodeRoot, "LICENSE"),
    path.join(outputRoot, "LICENSE-node.txt"),
  );
  await copyServiceTree(root, outputRoot);
  await copyComputeRuntimeDependencies(root, outputRoot);

  const servicePackage = JSON.parse(
    await fs.readFile(
      path.join(root, "apps/synthesis-service/package.json"),
      "utf8",
    ),
  ) as { version?: string };
  const build = await computeSynthesisSidecarRuntimeBuildFingerprint(root);
  const files: SynthesisSidecarRuntimeBundleFile[] = [];
  for (const relativePath of await collectFiles(outputRoot)) {
    const filePath = path.join(outputRoot, ...relativePath.split("/"));
    const stat = await fs.stat(filePath);
    files.push({
      path: relativePath,
      bytes: stat.size,
      sha256: await sha256File(filePath),
      executable: relativePath === executable,
    });
  }
  files.sort((left, right) => left.path.localeCompare(right.path));
  const baseManifest = {
    schema: SYNTHESIS_SIDECAR_RUNTIME_BUNDLE_SCHEMA,
    nodeVersion: SYNTHESIS_SIDECAR_RUNTIME_NODE_VERSION,
    serviceVersion: String(servicePackage.version || ""),
    protocolVersion: "synthesis-sidecar.v1" as const,
    target,
    buildFingerprint: build.fingerprint,
    upstream: {
      archive: runtimeArchiveName(target),
      sha256: upstreamSha256,
      signature: "verified" as const,
      platformSignature: expectedPlatformSignature,
    },
    executable,
    entrypoint: "service/apps/synthesis-service/src/entrypoint.js",
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
