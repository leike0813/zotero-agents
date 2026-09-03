import { execFile } from "node:child_process";
import { copyFile, mkdir, rm, stat } from "node:fs/promises";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { promisify } from "node:util";
import {
  SYNTHESIS_SIDECAR_RUNTIME_TARGETS,
  type SynthesisSidecarRuntimeTarget,
} from "../packages/synthesis-contracts/src/sidecarRuntimeBundle";
import {
  assertSynthesisSidecarRuntimeArchiveLayout,
  tarArgsForWindows,
  verifySynthesisSidecarRuntimeBundleDirectory,
} from "./synthesis-sidecar-runtime-release-governance";

const execFileAsync = promisify(execFile);

export type DownloadedSynthesisSidecarRuntimeCacheEntry = Readonly<{
  target: SynthesisSidecarRuntimeTarget;
  runId: number;
  artifactId: number;
  archiveSize: number;
  archiveSha256: string;
  archivePath: string;
  bundleRoot: string;
}>;

function requiredFlag(name: string, args: string[]): string {
  const inline = args.find((arg) => arg.startsWith(`--${name}=`));
  if (inline) return inline.slice(name.length + 3).trim();
  const index = args.indexOf(`--${name}`);
  if (index < 0) throw new Error(`Missing required --${name}=...`);
  const value = args[index + 1];
  if (!value || value.startsWith("--")) {
    throw new Error(`--${name} requires a value`);
  }
  return value.trim();
}

function isTarget(value: string): value is SynthesisSidecarRuntimeTarget {
  return (SYNTHESIS_SIDECAR_RUNTIME_TARGETS as readonly string[]).includes(
    value,
  );
}

async function readGhAuthToken(): Promise<string> {
  const environmentToken = String(
    process.env.GH_TOKEN || process.env.GITHUB_TOKEN || "",
  ).trim();
  if (environmentToken) return environmentToken;
  const result = await execFileAsync("gh", ["auth", "token"], {
    windowsHide: true,
  });
  return (result.stdout || "").trim();
}

async function downloadArtifactZip(args: {
  archiveUrl: string;
  destination: string;
  expectedSize: number;
}): Promise<number> {
  const token = await readGhAuthToken();
  await mkdir(path.dirname(args.destination), { recursive: true });
  await execFileAsync(
    "curl",
    [
      "-fsSL",
      "--retry",
      "5",
      "--retry-delay",
      "2",
      "--retry-all-errors",
      "-H",
      `Authorization: Bearer ${token}`,
      "-H",
      "Accept: application/vnd.github+json",
      "-H",
      "X-GitHub-Api-Version: 2022-11-28",
      args.archiveUrl,
      "-o",
      args.destination,
    ],
    { windowsHide: true, maxBuffer: 64 * 1024 * 1024 },
  );
  const statResult = await stat(args.destination);
  if (!statResult.isFile() || statResult.size === 0) {
    throw new Error(
      `Downloaded artifact is missing or empty: ${args.destination}`,
    );
  }
  if (args.expectedSize > 0 && statResult.size !== args.expectedSize) {
    throw new Error(
      `Downloaded artifact size mismatch: expected ${args.expectedSize}, got ${statResult.size}`,
    );
  }
  return statResult.size;
}

async function extractZipToTarGz(args: {
  zipPath: string;
  tarGzPath: string;
  target: SynthesisSidecarRuntimeTarget;
}): Promise<number> {
  const stagingDir = path.join(path.dirname(args.tarGzPath), ".cache-extract");
  await mkdir(stagingDir, { recursive: true });
  // Extract the zip wrapper, then the tar.gz inside it, then re-tar as a
  // tar.gz with the same fixed layout the staging script expects.
  await execFileAsync("unzip", ["-o", "-q", args.zipPath, "-d", stagingDir], {
    windowsHide: true,
    maxBuffer: 64 * 1024 * 1024,
  });
  // The zip contains exactly one tar.gz named after the artifact.
  const tarGzInZip = path.join(
    stagingDir,
    `synthesis-sidecar-runtime-${args.target}.tar.gz`,
  );
  const tarGzStat = await stat(tarGzInZip).catch(() => null);
  if (!tarGzStat || !tarGzStat.isFile()) {
    throw new Error(`Expected tar.gz missing from zip: ${tarGzInZip}`);
  }
  // Copy the inner tar.gz to the destination path.
  await copyFile(tarGzInZip, args.tarGzPath);
  await rm(stagingDir, { recursive: true, force: true });
  return tarGzStat.size;
}

async function sha256File(filePath: string): Promise<string> {
  const bytes = await readFile(filePath);
  return createHash("sha256").update(bytes).digest("hex");
}

export async function downloadSynthesisSidecarRuntimeCache(args: {
  artifactId: number;
  archiveUrl: string;
  artifactSize: number;
  runId: number;
  target: SynthesisSidecarRuntimeTarget;
  outputRoot: string;
  expectedBuildFingerprint: string;
  expectedSourceFingerprint: string;
}): Promise<DownloadedSynthesisSidecarRuntimeCacheEntry> {
  if (!Number.isSafeInteger(args.runId) || args.runId <= 0) {
    throw new Error(`Invalid runId: ${args.runId}`);
  }
  if (!Number.isSafeInteger(args.artifactId) || args.artifactId <= 0) {
    throw new Error(`Invalid artifactId: ${args.artifactId}`);
  }
  if (!isTarget(args.target)) {
    throw new Error(`Invalid target: ${args.target}`);
  }

  await mkdir(args.outputRoot, { recursive: true });
  const zipPath = path.join(
    args.outputRoot,
    `synthesis-sidecar-runtime-${args.target}.zip`,
  );
  const tarGzPath = path.join(
    args.outputRoot,
    `synthesis-sidecar-runtime-${args.target}.tar.gz`,
  );
  await downloadArtifactZip({
    archiveUrl: args.archiveUrl,
    destination: zipPath,
    expectedSize: args.artifactSize,
  });
  await extractZipToTarGz({
    zipPath,
    tarGzPath,
    target: args.target,
  });
  const archiveSha256 = await sha256File(tarGzPath);
  const finalStat = await stat(tarGzPath);
  assertSynthesisSidecarRuntimeArchiveLayout({
    archivePath: tarGzPath,
    target: args.target,
  });
  const bundleRoot = path.join(args.outputRoot, "bundles");
  await rm(path.join(bundleRoot, args.target), {
    recursive: true,
    force: true,
  });
  await mkdir(bundleRoot, { recursive: true });
  await execFileAsync("tar", [...tarArgsForWindows(), "-xzf", tarGzPath, "-C", bundleRoot], {
    windowsHide: true,
  });
  const verification = await verifySynthesisSidecarRuntimeBundleDirectory({
    root: path.join(bundleRoot, args.target),
    target: args.target,
    expectedBuildFingerprint: args.expectedBuildFingerprint,
    expectedSourceFingerprint: args.expectedSourceFingerprint,
    policy: "candidate",
  });
  if (!verification.ok) {
    throw new Error(
      `Cached artifact identity mismatch: ${JSON.stringify(verification.diagnostics)}`,
    );
  }

  return {
    target: args.target,
    runId: args.runId,
    artifactId: args.artifactId,
    archiveSize: finalStat.size,
    archiveSha256,
    archivePath: tarGzPath,
    bundleRoot: path.join(bundleRoot, args.target),
  };
}

async function main() {
  const args = process.argv.slice(2);
  const runId = Number(requiredFlag("run-id", args));
  const artifactId = Number(requiredFlag("artifact-id", args));
  const archiveUrl = requiredFlag("archive-url", args);
  const artifactSize = Number(requiredFlag("artifact-size", args));
  const target = requiredFlag("target", args);
  const outputRoot = requiredFlag("output-root", args);
  const expectedBuildFingerprint = requiredFlag(
    "expected-build-fingerprint",
    args,
  );
  const expectedSourceFingerprint = requiredFlag(
    "expected-source-fingerprint",
    args,
  );
  const result = await downloadSynthesisSidecarRuntimeCache({
    artifactId,
    archiveUrl,
    artifactSize,
    runId,
    target: target as SynthesisSidecarRuntimeTarget,
    outputRoot,
    expectedBuildFingerprint,
    expectedSourceFingerprint,
  });
  process.stdout.write(`${JSON.stringify({ ok: true, ...result }, null, 2)}\n`);
}

const invokedModule = process.argv[1]
  ? pathToFileURL(path.resolve(process.argv[1])).href
  : "";
if (import.meta.url === invokedModule) {
  main().catch((error) => {
    process.stderr.write(
      `${error instanceof Error ? error.message : String(error)}\n`,
    );
    process.exitCode = 1;
  });
}
