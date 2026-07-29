import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  SYNTHESIS_SIDECAR_RUNTIME_TARGETS,
  type SynthesisSidecarRuntimeTarget,
} from "../packages/synthesis-contracts/src/sidecarRuntimeBundle";
import {
  SYNTHESIS_SIDECAR_RUNTIME_PREBUILD_SET_SCHEMA,
  computeSynthesisSidecarRuntimePrebuildAggregate,
  synthesisSidecarRuntimeArchiveName,
} from "../packages/synthesis-contracts/src/sidecarRuntimeRelease";
import {
  computeSynthesisRustSidecarSourceFingerprint,
  assertSynthesisSidecarRuntimeArchiveLayout,
  readSynthesisSidecarRuntimeManifest,
  sha256File,
  verifySynthesisSidecarRuntimeBundleDirectory,
} from "./synthesis-sidecar-runtime-release-governance";

function argument(name: string) {
  const prefix = `--${name}=`;
  return process.argv
    .find((value) => value.startsWith(prefix))
    ?.slice(prefix.length);
}

function required(name: string) {
  const value = String(argument(name) || "").trim();
  if (!value) throw new Error(`Missing required --${name}=...`);
  return value;
}

function run(command: string, args: string[]) {
  const result = spawnSync(command, args, { stdio: "inherit" });
  if (result.error || result.status !== 0) {
    throw result.error || new Error(`${command} exited ${result.status}`);
  }
}

async function assertExactTargetDirectories(root: string) {
  const entries = await fs.readdir(root, { withFileTypes: true });
  const names = entries.map((entry) => entry.name).sort();
  const expected = [...SYNTHESIS_SIDECAR_RUNTIME_TARGETS].sort();
  if (
    names.length !== expected.length ||
    names.some((name, index) => name !== expected[index]) ||
    entries.some((entry) => !entry.isDirectory() || entry.isSymbolicLink())
  ) {
    throw new Error(
      "Prebuild input has missing or unexpected target directories",
    );
  }
}

export async function stageSynthesisSidecarRuntimePrebuildSet(args: {
  inputRoot: string;
  outputRoot: string;
  buildFingerprint: string;
  sourceFingerprint: string;
}) {
  await assertExactTargetDirectories(args.inputRoot);
  const staging = path.join(args.outputRoot, `.staging-${process.pid}`);
  await fs.rm(staging, { recursive: true, force: true });
  await fs.mkdir(staging, { recursive: true });
  const archives = [] as Array<{
    target: SynthesisSidecarRuntimeTarget;
    file: string;
    sha256: string;
    bytes: number;
  }>;
  for (const target of SYNTHESIS_SIDECAR_RUNTIME_TARGETS) {
    const bundleRoot = path.join(args.inputRoot, target);
    const bundle = await verifySynthesisSidecarRuntimeBundleDirectory({
      root: bundleRoot,
      target,
      expectedBuildFingerprint: args.buildFingerprint,
      expectedSourceFingerprint: args.sourceFingerprint,
      policy: "candidate",
    });
    if (!bundle.ok) {
      throw new Error(
        `Invalid ${target} prebuild: ${JSON.stringify(bundle.diagnostics)}`,
      );
    }
    const file = synthesisSidecarRuntimeArchiveName(target);
    const archive = path.join(staging, file);
    run("tar", [
      "--sort=name",
      "--mtime=@0",
      "--owner=0",
      "--group=0",
      "--numeric-owner",
      "-czf",
      archive,
      "-C",
      args.inputRoot,
      target,
    ]);
    const bytes = (await fs.stat(archive)).size;
    if (bytes > 15 * 1024 * 1024)
      throw new Error(`${target} archive exceeds 15 MiB`);
    archives.push({ target, file, sha256: await sha256File(archive), bytes });
  }
  const total = archives.reduce((sum, archive) => sum + archive.bytes, 0);
  if (total > 75 * 1024 * 1024)
    throw new Error("Sidecar prebuild aggregate exceeds 75 MiB");
  const aggregate = computeSynthesisSidecarRuntimePrebuildAggregate(archives);
  const setDirectory = path.join(args.outputRoot, "sets", aggregate);
  const existingManifestPath = path.join(setDirectory, "manifest.json");
  if (existsSync(existingManifestPath)) {
    const existing =
      await readSynthesisSidecarRuntimeManifest(existingManifestPath);
    if (
      existing.aggregate === aggregate &&
      existing.buildFingerprint === args.buildFingerprint &&
      existing.sourceFingerprint === args.sourceFingerprint
    ) {
      await fs.rm(staging, { recursive: true, force: true });
      return {
        aggregate,
        setDirectory,
        archives: manifest.archives,
        reused: true,
      };
    }
  }
  const manifest = {
    schema: SYNTHESIS_SIDECAR_RUNTIME_PREBUILD_SET_SCHEMA,
    aggregate,
    buildFingerprint: args.buildFingerprint,
    sourceFingerprint: args.sourceFingerprint,
    archives: [...archives].sort((a, b) => a.target.localeCompare(b.target)),
  };
  await fs.writeFile(
    path.join(staging, "manifest.json"),
    `${JSON.stringify(manifest, null, 2)}\n`,
  );
  await fs.mkdir(path.dirname(setDirectory), { recursive: true });
  try {
    await fs.rename(staging, setDirectory);
  } catch (error) {
    await fs.rm(staging, { recursive: true, force: true });
    if (!(await fs.stat(setDirectory).catch(() => null))) throw error;
  }
  return {
    aggregate,
    setDirectory,
    archives: manifest.archives,
    reused: false,
  };
}

export async function stageSynthesisSidecarRuntimePrebuildArchives(args: {
  archiveRoot: string;
  outputRoot: string;
  buildFingerprint: string;
  sourceFingerprint: string;
}) {
  const extractedRoot = path.join(args.outputRoot, `.extracted-${process.pid}`);
  await fs.rm(extractedRoot, { recursive: true, force: true });
  await fs.mkdir(extractedRoot, { recursive: true });
  try {
    const actual = await fs.readdir(args.archiveRoot, { withFileTypes: true });
    const actualNames = actual.map((entry) => entry.name).sort();
    const expectedNames = SYNTHESIS_SIDECAR_RUNTIME_TARGETS.map(
      synthesisSidecarRuntimeArchiveName,
    ).sort();
    if (
      actualNames.length !== expectedNames.length ||
      actualNames.some((name, index) => name !== expectedNames[index]) ||
      actual.some((entry) => !entry.isFile() || entry.isSymbolicLink())
    ) {
      throw new Error(
        "Prebuild archive input has missing or unexpected archives",
      );
    }
    for (const target of SYNTHESIS_SIDECAR_RUNTIME_TARGETS) {
      const archivePath = path.join(
        args.archiveRoot,
        synthesisSidecarRuntimeArchiveName(target),
      );
      assertSynthesisSidecarRuntimeArchiveLayout({ archivePath, target });
      run("tar", ["-xzf", archivePath, "-C", extractedRoot]);
    }
    return await stageSynthesisSidecarRuntimePrebuildSet({
      inputRoot: extractedRoot,
      outputRoot: args.outputRoot,
      buildFingerprint: args.buildFingerprint,
      sourceFingerprint: args.sourceFingerprint,
    });
  } finally {
    await fs.rm(extractedRoot, { recursive: true, force: true });
  }
}

async function main() {
  const root = process.cwd();
  const source = await computeSynthesisRustSidecarSourceFingerprint(root);
  const inputRoot = argument("input-root");
  const archiveRoot = argument("archive-root");
  if (!!inputRoot === !!archiveRoot) {
    throw new Error(
      "Provide exactly one of --input-root=... or --archive-root=...",
    );
  }
  const args = {
    outputRoot: path.resolve(required("output-root")),
    buildFingerprint: required("build-fingerprint"),
    sourceFingerprint: argument("source-fingerprint") || source.fingerprint,
  };
  const result = archiveRoot
    ? await stageSynthesisSidecarRuntimePrebuildArchives({
        ...args,
        archiveRoot: path.resolve(archiveRoot),
      })
    : await stageSynthesisSidecarRuntimePrebuildSet({
        ...args,
        inputRoot: path.resolve(inputRoot!),
      });
  process.stdout.write(`${JSON.stringify({ ok: true, ...result })}\n`);
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
