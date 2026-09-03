import { execFile } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { promisify } from "node:util";
import {
  SYNTHESIS_SIDECAR_RUNTIME_TARGETS,
  type SynthesisSidecarRuntimeTarget,
} from "../packages/synthesis-contracts/src/sidecarRuntimeBundle";

const execFileAsync = promisify(execFile);

const WORKFLOW = "prebuild-synthesis-sidecar-runtime.yml";
const ARTIFACT_NAME_PREFIX = "synthesis-sidecar-runtime-";

export type SynthesisSidecarRuntimeCacheArtifact = Readonly<{
  artifactId: number;
  sizeInBytes: number;
  archiveDownloadUrl: string;
  expired: boolean;
}>;

export type SynthesisSidecarRuntimeCacheEntry = Readonly<{
  candidate: boolean;
  runId: number | null;
  sourceSha: string | null;
  artifact: SynthesisSidecarRuntimeCacheArtifact | null;
  symbolsArtifact: SynthesisSidecarRuntimeCacheArtifact | null;
  reason: string;
}>;

export type SynthesisSidecarRuntimeCacheResolution = Readonly<{
  schema: "synthesis-sidecar-runtime-cache-resolution.v4";
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
  maximum?: number;
}): Promise<
  Array<{ databaseId: number; conclusion: string | null; sourceSha: string }>
> {
  const output = await runGh([
    "api",
    `repos/${args.repo}/actions/workflows/${args.workflow}/runs`,
    "--method",
    "GET",
    "-F",
    `per_page=${args.maximum ?? 100}`,
  ]);
  const parsed = JSON.parse(output);
  if (!parsed || !Array.isArray(parsed.workflow_runs)) {
    throw new Error(
      "GitHub workflow run list did not return workflow_runs array",
    );
  }
  return parsed.workflow_runs.map(
    (entry: { id: number; conclusion: string | null; head_sha: string }) => ({
      databaseId: Number(entry.id),
      conclusion: entry.conclusion === null ? null : String(entry.conclusion),
      sourceSha: requireSha("workflow run head_sha", entry.head_sha),
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
  excludeRunId?: number;
  listRuns?: typeof listRecentWorkflowRuns;
  listArtifacts?: typeof listRunArtifacts;
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
  const runs = await (args.listRuns || listRecentWorkflowRuns)({
    repo,
    workflow: WORKFLOW,
    maximum: args.maximumRuns ?? 100,
  });
  const filteredRuns = args.excludeRunId
    ? runs.filter((run) => run.databaseId !== args.excludeRunId)
    : runs;
  const exploredRunIds = filteredRuns.map((run) => run.databaseId);

  const platforms = {} as Record<
    SynthesisSidecarRuntimeTarget,
    SynthesisSidecarRuntimeCacheEntry
  >;
  for (const target of SYNTHESIS_SIDECAR_RUNTIME_TARGETS) {
    platforms[target] = {
      candidate: false,
      runId: null,
      sourceSha: null,
      artifact: null,
      symbolsArtifact: null,
      reason: "no_run_with_artifact",
    };
  }

  for (const run of filteredRuns) {
    const artifacts = await (args.listArtifacts || listRunArtifacts)({
      repo,
      runId: run.databaseId,
    });
    for (const target of SYNTHESIS_SIDECAR_RUNTIME_TARGETS) {
      if (platforms[target].candidate) continue;
      const artifactName = `${ARTIFACT_NAME_PREFIX}${target}`;
      const artifact = artifacts.find((entry) => entry.name === artifactName);
      if (!artifact) continue;
      const symbolsArtifact =
        target === "win32-x64"
          ? artifacts.find(
              (entry) =>
                entry.name === "synthesis-sidecar-runtime-symbols-win32-x64",
            )
          : undefined;
      if (target === "win32-x64" && !symbolsArtifact) {
        platforms[target] = {
          candidate: false,
          runId: run.databaseId,
          sourceSha: run.sourceSha,
          artifact: null,
          symbolsArtifact: null,
          reason: "matching_symbol_artifact_missing",
        };
        continue;
      }
      if (symbolsArtifact?.expired) {
        platforms[target] = {
          candidate: false,
          runId: run.databaseId,
          sourceSha: run.sourceSha,
          artifact: null,
          symbolsArtifact: {
            artifactId: symbolsArtifact.artifactId,
            sizeInBytes: symbolsArtifact.sizeInBytes,
            archiveDownloadUrl: symbolsArtifact.archiveDownloadUrl,
            expired: true,
          },
          reason: "matching_symbol_artifact_expired",
        };
        continue;
      }
      if (artifact.expired) {
        platforms[target] = {
          candidate: false,
          runId: run.databaseId,
          sourceSha: run.sourceSha,
          artifact: {
            artifactId: artifact.artifactId,
            sizeInBytes: artifact.sizeInBytes,
            archiveDownloadUrl: artifact.archiveDownloadUrl,
            expired: true,
          },
          symbolsArtifact: null,
          reason: "artifact_expired",
        };
        continue;
      }
      platforms[target] = {
        candidate: true,
        runId: run.databaseId,
        sourceSha: run.sourceSha,
        artifact: {
          artifactId: artifact.artifactId,
          sizeInBytes: artifact.sizeInBytes,
          archiveDownloadUrl: artifact.archiveDownloadUrl,
          expired: false,
        },
        symbolsArtifact: symbolsArtifact
          ? {
              artifactId: symbolsArtifact.artifactId,
              sizeInBytes: symbolsArtifact.sizeInBytes,
              archiveDownloadUrl: symbolsArtifact.archiveDownloadUrl,
              expired: false,
            }
          : null,
        reason: `artifact_candidate_pending_fingerprint_validation (${artifact.sizeInBytes} bytes)`,
      };
    }
  }

  return {
    schema: "synthesis-sidecar-runtime-cache-resolution.v4",
    repository: repo,
    sourceSha,
    buildFingerprint,
    sourceFingerprint,
    exploredRunIds,
    platforms,
  };
}

export async function runSynthesisSidecarRuntimeCacheCommand(
  args: string[],
  dependencies: {
    listRuns?: typeof listRecentWorkflowRuns;
    listArtifacts?: typeof listRunArtifacts;
    writeStdout?: (value: string) => void;
  } = {},
) {
  const repo = requiredFlag("repo", args);
  const sourceSha = requiredFlag("source-sha", args);
  const buildFingerprint = requiredFlag("build-fingerprint", args);
  const sourceFingerprint = requiredFlag("source-fingerprint", args);
  const excludeRunId = (() => {
    const inline = args.find((arg) => arg.startsWith("--exclude-run-id="));
    if (inline) return Number(inline.slice(17).trim());
    const index = args.indexOf("--exclude-run-id");
    if (index < 0) return undefined;
    const value = Number(args[index + 1]);
    return Number.isSafeInteger(value) ? value : undefined;
  })();
  const outputFlag = (() => {
    const inline = args.find((arg) => arg.startsWith("--output="));
    return inline ? inline.slice(9).trim() : "";
  })();
  const resolution = await resolveSynthesisSidecarRuntimeCache({
    repo,
    sourceSha,
    buildFingerprint,
    sourceFingerprint,
    excludeRunId,
    listRuns: dependencies.listRuns,
    listArtifacts: dependencies.listArtifacts,
  });
  const serialized = JSON.stringify(resolution, null, 2);
  if (outputFlag) {
    const output = path.resolve(outputFlag);
    await mkdir(path.dirname(output), { recursive: true });
    await writeFile(output, `${serialized}\n`, "utf8");
  } else {
    (dependencies.writeStdout || ((value) => process.stdout.write(value)))(
      `${serialized}\n`,
    );
  }
}

const invokedModule = process.argv[1]
  ? pathToFileURL(path.resolve(process.argv[1])).href
  : "";
if (import.meta.url === invokedModule) {
  runSynthesisSidecarRuntimeCacheCommand(process.argv.slice(2)).catch(
    (error) => {
      process.stderr.write(
        `${error instanceof Error ? error.message : String(error)}\n`,
      );
      process.exitCode = 1;
    },
  );
}
