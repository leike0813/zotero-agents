import { execFile } from "node:child_process";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { promisify } from "node:util";
import {
  SYNTHESIS_SIDECAR_RUNTIME_TARGETS,
  type SynthesisSidecarRuntimeTarget,
} from "../packages/synthesis-contracts/src/sidecarRuntimeBundle";

const execFileAsync = promisify(execFile);

const WORKFLOW_PATH =
  ".github/workflows/prebuild-synthesis-sidecar-runtime.yml";
const ARTIFACT_NAME_PREFIX = "synthesis-sidecar-runtime-";

export type SynthesisSidecarRuntimeCacheArtifact = Readonly<{
  artifactId: number;
  sizeInBytes: number;
  archiveDownloadUrl: string;
  expired: boolean;
}>;

export type SynthesisSidecarRuntimeCacheEntry = Readonly<{
  hit: boolean;
  runId: number | null;
  artifact: SynthesisSidecarRuntimeCacheArtifact | null;
  reason: string;
}>;

export type SynthesisSidecarRuntimeCacheResolution = Readonly<{
  schema: "synthesis-sidecar-runtime-cache-resolution.v2";
  repository: string;
  sourceSha: string;
  buildFingerprint: string;
  sourceFingerprint: string;
  exploredRunIds: number[];
  platforms: Readonly<
    Record<SynthesisSidecarRuntimeTarget, SynthesisSidecarRuntimeCacheEntry>
  >;
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

function requireSha(label: string, value: string): string {
  const trimmed = value.trim();
  if (!/^[a-f0-9]{40}$/i.test(trimmed)) {
    throw new Error(`${label} must be a full 40-character commit SHA`);
  }
  return trimmed.toLowerCase();
}

function requireHex64(label: string, value: string): string {
  const trimmed = value.trim();
  if (!/^[a-f0-9]{64}$/i.test(trimmed)) {
    throw new Error(`${label} must be a 64-character lowercase hex digest`);
  }
  return trimmed.toLowerCase();
}

async function runGh(args: string[]): Promise<string> {
  const result = await execFileAsync("gh", args, { windowsHide: true });
  return result.stdout || "";
}

export async function listRecentWorkflowRuns(args: {
  repo: string;
  workflow: string;
  headSha: string;
  maximum?: number;
}): Promise<Array<{ databaseId: number; conclusion: string | null }>> {
  const output = await runGh([
    "api",
    `repos/${args.repo}/actions/runs`,
    "--method",
    "GET",
    "-f",
    `workflow=${args.workflow}`,
    "-f",
    `head_sha=${args.headSha}`,
    "-F",
    `per_page=${args.maximum ?? 30}`,
  ]);
  const parsed = JSON.parse(output);
  if (!parsed || !Array.isArray(parsed.workflow_runs)) {
    throw new Error(
      "GitHub workflow run list did not return workflow_runs array",
    );
  }
  return parsed.workflow_runs.map(
    (entry: { id: number; conclusion: string | null }) => ({
      databaseId: Number(entry.id),
      conclusion: entry.conclusion === null ? null : String(entry.conclusion),
    }),
  );
}

export async function listRunArtifacts(args: {
  repo: string;
  runId: number;
}): Promise<
  Array<{
    artifactId: number;
    name: string;
    sizeInBytes: number;
    archiveDownloadUrl: string;
    expired: boolean;
  }>
> {
  const output = await runGh([
    "api",
    `repos/${args.repo}/actions/runs/${args.runId}/artifacts`,
    "--method",
    "GET",
    "-F",
    "per_page=100",
  ]);
  const parsed = JSON.parse(output);
  if (!parsed || !Array.isArray(parsed.artifacts)) {
    throw new Error(
      `GitHub run artifacts for ${args.runId} did not return array`,
    );
  }
  return parsed.artifacts.map(
    (entry: {
      id: number;
      name: string;
      size_in_bytes: number;
      archive_download_url: string;
      expired: boolean;
    }) => ({
      artifactId: Number(entry.id),
      name: String(entry.name),
      sizeInBytes: Number(entry.size_in_bytes),
      archiveDownloadUrl: String(entry.archive_download_url),
      expired: Boolean(entry.expired),
    }),
  );
}

export async function resolveSynthesisSidecarRuntimeCache(args: {
  repo: string;
  sourceSha: string;
  buildFingerprint: string;
  sourceFingerprint: string;
  maximumRuns?: number;
}): Promise<SynthesisSidecarRuntimeCacheResolution> {
  const repo = args.repo.trim();
  const sourceSha = requireSha("source-sha", args.sourceSha);
  const buildFingerprint = requireHex64(
    "build-fingerprint",
    args.buildFingerprint,
  );
  const sourceFingerprint = requireHex64(
    "source-fingerprint",
    args.sourceFingerprint,
  );
  const runs = await listRecentWorkflowRuns({
    repo,
    workflow: WORKFLOW_PATH,
    headSha: sourceSha,
    maximum: args.maximumRuns ?? 30,
  });
  const exploredRunIds = runs.map((run) => run.databaseId);

  const platforms = {} as Record<
    SynthesisSidecarRuntimeTarget,
    SynthesisSidecarRuntimeCacheEntry
  >;
  for (const target of SYNTHESIS_SIDECAR_RUNTIME_TARGETS) {
    platforms[target] = {
      hit: false,
      runId: null,
      artifact: null,
      reason: "no_run_with_artifact",
    };
  }

  for (const run of runs) {
    const artifacts = await listRunArtifacts({ repo, runId: run.databaseId });
    for (const target of SYNTHESIS_SIDECAR_RUNTIME_TARGETS) {
      if (platforms[target].hit) continue;
      const artifactName = `${ARTIFACT_NAME_PREFIX}${target}`;
      const artifact = artifacts.find((entry) => entry.name === artifactName);
      if (!artifact) continue;
      if (artifact.expired) {
        platforms[target] = {
          hit: false,
          runId: run.databaseId,
          artifact: {
            artifactId: artifact.artifactId,
            sizeInBytes: artifact.sizeInBytes,
            archiveDownloadUrl: artifact.archiveDownloadUrl,
            expired: true,
          },
          reason: "artifact_expired",
        };
        continue;
      }
      platforms[target] = {
        hit: true,
        runId: run.databaseId,
        artifact: {
          artifactId: artifact.artifactId,
          sizeInBytes: artifact.sizeInBytes,
          archiveDownloadUrl: artifact.archiveDownloadUrl,
          expired: false,
        },
        reason: `artifact_available (${artifact.sizeInBytes} bytes)`,
      };
    }
  }

  return {
    schema: "synthesis-sidecar-runtime-cache-resolution.v2",
    repository: repo,
    sourceSha,
    buildFingerprint,
    sourceFingerprint,
    exploredRunIds,
    platforms,
  };
}

async function main() {
  const args = process.argv.slice(2);
  const repo = requiredFlag("repo", args);
  const sourceSha = requiredFlag("source-sha", args);
  const buildFingerprint = requiredFlag("build-fingerprint", args);
  const sourceFingerprint = requiredFlag("source-fingerprint", args);
  const outputFlag = (() => {
    const inline = args.find((arg) => arg.startsWith("--output="));
    return inline ? inline.slice(9).trim() : "";
  })();
  const resolution = await resolveSynthesisSidecarRuntimeCache({
    repo,
    sourceSha,
    buildFingerprint,
    sourceFingerprint,
  });
  const serialized = JSON.stringify(resolution, null, 2);
  if (outputFlag) {
    await writeFile(path.resolve(outputFlag), `${serialized}\n`, "utf8");
  } else {
    process.stdout.write(`${serialized}\n`);
  }
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
